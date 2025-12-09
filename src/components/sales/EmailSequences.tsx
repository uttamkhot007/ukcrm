import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Mail, Plus, Play, Pause, Trash2, Edit, Clock, 
  Users, ArrowRight, MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EmailSequenceStep {
  id?: string;
  step_order: number;
  subject: string;
  body: string;
  delay_days: number;
  delay_hours: number;
}

interface EmailSequence {
  id: string;
  name: string;
  description: string;
  status: string;
  trigger_type: string;
  created_at: string;
  steps?: EmailSequenceStep[];
  enrollments_count?: number;
}

export function EmailSequences() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState<EmailSequence | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'manual',
    steps: [{ step_order: 1, subject: '', body: '', delay_days: 0, delay_hours: 0 }] as EmailSequenceStep[]
  });

  const { data: sequences, isLoading } = useQuery({
    queryKey: ['email-sequences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_sequences')
        .select(`
          *,
          email_sequence_steps (*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Get enrollment counts
      const sequenceIds = data.map(s => s.id);
      const { data: enrollments } = await supabase
        .from('email_sequence_enrollments')
        .select('sequence_id')
        .in('sequence_id', sequenceIds)
        .eq('status', 'active');

      return data.map(seq => ({
        ...seq,
        steps: seq.email_sequence_steps,
        enrollments_count: enrollments?.filter(e => e.sequence_id === seq.id).length || 0
      })) as EmailSequence[];
    }
  });

  const createSequence = useMutation({
    mutationFn: async () => {
      // Create the sequence
      const { data: sequence, error: seqError } = await supabase
        .from('email_sequences')
        .insert({
          name: formData.name,
          description: formData.description,
          trigger_type: formData.trigger_type,
          created_by: user?.id,
          tenant_id: currentTenant?.id,
          status: 'draft'
        })
        .select()
        .single();

      if (seqError) throw seqError;

      // Create the steps
      const stepsToInsert = formData.steps.map((step, index) => ({
        sequence_id: sequence.id,
        step_order: index + 1,
        subject: step.subject,
        body: step.body,
        delay_days: step.delay_days,
        delay_hours: step.delay_hours
      }));

      const { error: stepsError } = await supabase
        .from('email_sequence_steps')
        .insert(stepsToInsert);

      if (stepsError) throw stepsError;

      return sequence;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-sequences'] });
      toast.success("Email sequence created");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create sequence: " + error.message);
    }
  });

  const updateSequenceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('email_sequences')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-sequences'] });
      toast.success("Sequence status updated");
    }
  });

  const deleteSequence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_sequences')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-sequences'] });
      toast.success("Sequence deleted");
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      trigger_type: 'manual',
      steps: [{ step_order: 1, subject: '', body: '', delay_days: 0, delay_hours: 0 }]
    });
    setEditingSequence(null);
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, { 
        step_order: prev.steps.length + 1, 
        subject: '', 
        body: '', 
        delay_days: 1, 
        delay_hours: 0 
      }]
    }));
  };

  const removeStep = (index: number) => {
    if (formData.steps.length > 1) {
      setFormData(prev => ({
        ...prev,
        steps: prev.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i + 1 }))
      }));
    }
  };

  const updateStep = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => i === index ? { ...step, [field]: value } : step)
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500">Active</Badge>;
      case 'paused': return <Badge variant="secondary">Paused</Badge>;
      default: return <Badge variant="outline">Draft</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Sequences
          </h2>
          <p className="text-muted-foreground">Automated email campaigns for lead nurturing</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Sequence
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSequence ? 'Edit Sequence' : 'Create Email Sequence'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sequence Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., New Lead Nurture"
                  />
                </div>
                <div>
                  <Label>Trigger Type</Label>
                  <Select 
                    value={formData.trigger_type} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, trigger_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Enrollment</SelectItem>
                      <SelectItem value="lead_created">New Lead Created</SelectItem>
                      <SelectItem value="deal_stage_change">Deal Stage Change</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the purpose of this sequence..."
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg">Email Steps</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addStep}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Step
                  </Button>
                </div>

                {formData.steps.map((step, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline">Step {index + 1}</Badge>
                        {formData.steps.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStep(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      {index > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Wait</span>
                          <Input
                            type="number"
                            min="0"
                            className="w-20"
                            value={step.delay_days}
                            onChange={(e) => updateStep(index, 'delay_days', parseInt(e.target.value) || 0)}
                          />
                          <span className="text-sm text-muted-foreground">days</span>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            className="w-20"
                            value={step.delay_hours}
                            onChange={(e) => updateStep(index, 'delay_hours', parseInt(e.target.value) || 0)}
                          />
                          <span className="text-sm text-muted-foreground">hours</span>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div>
                          <Label>Subject</Label>
                          <Input
                            value={step.subject}
                            onChange={(e) => updateStep(index, 'subject', e.target.value)}
                            placeholder="Email subject line..."
                          />
                        </div>
                        <div>
                          <Label>Body</Label>
                          <Textarea
                            value={step.body}
                            onChange={(e) => updateStep(index, 'body', e.target.value)}
                            placeholder="Email content... Use {{name}}, {{company}} for personalization"
                            rows={4}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => createSequence.mutate()} disabled={createSequence.isPending}>
                  {createSequence.isPending ? 'Creating...' : 'Create Sequence'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sequences List */}
      <div className="space-y-4">
        {sequences?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No email sequences yet. Create your first one!</p>
            </CardContent>
          </Card>
        )}

        {sequences?.map((sequence) => (
          <Card key={sequence.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{sequence.name}</h3>
                    {getStatusBadge(sequence.status)}
                  </div>
                  <p className="text-muted-foreground mb-3">{sequence.description}</p>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {sequence.steps?.length || 0} emails
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {sequence.enrollments_count || 0} enrolled
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {sequence.trigger_type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Steps Preview */}
                  {sequence.steps && sequence.steps.length > 0 && (
                    <div className="flex items-center gap-2 mt-4">
                      {sequence.steps.slice(0, 5).map((step, i) => (
                        <div key={i} className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {i + 1}
                          </div>
                          {i < sequence.steps!.length - 1 && i < 4 && (
                            <ArrowRight className="h-4 w-4 text-muted-foreground mx-1" />
                          )}
                        </div>
                      ))}
                      {sequence.steps.length > 5 && (
                        <span className="text-sm text-muted-foreground">+{sequence.steps.length - 5} more</span>
                      )}
                    </div>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {sequence.status === 'active' ? (
                      <DropdownMenuItem onClick={() => updateSequenceStatus.mutate({ id: sequence.id, status: 'paused' })}>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => updateSequenceStatus.mutate({ id: sequence.id, status: 'active' })}>
                        <Play className="h-4 w-4 mr-2" />
                        Activate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => deleteSequence.mutate(sequence.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
