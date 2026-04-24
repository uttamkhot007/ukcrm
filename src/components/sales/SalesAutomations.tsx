import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Zap, Plus, Play, Pause, Trash2, Settings, 
  ArrowRight, Bell, Mail, UserPlus, Target
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AutomationAction {
  type: 'send_notification' | 'send_email' | 'assign_to' | 'update_field' | 'create_task';
  config: Record<string, any>;
}

interface SalesAutomation {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  trigger_conditions: Record<string, any>;
  actions: AutomationAction[];
  is_active: boolean;
  created_at: string;
}

const TRIGGER_TYPES = [
  { value: 'lead_created', label: 'New Lead Created', icon: UserPlus },
  { value: 'deal_stage_change', label: 'Deal Stage Changed', icon: Target },
  { value: 'activity_logged', label: 'Activity Logged', icon: Bell },
  { value: 'score_threshold', label: 'Lead Score Threshold', icon: Zap },
];

const ACTION_TYPES = [
  { value: 'send_notification', label: 'Send Notification', icon: Bell },
  { value: 'send_email', label: 'Send Email', icon: Mail },
  { value: 'assign_to', label: 'Assign To User', icon: UserPlus },
  { value: 'create_task', label: 'Create Task', icon: Target },
];

export function SalesAutomations() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'lead_created',
    trigger_conditions: {} as Record<string, any>,
    actions: [{ type: 'send_notification', config: { message: '' } }] as AutomationAction[]
  });

  const { data: automations, isLoading } = useQuery({
    queryKey: ['sales-automations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_automations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        trigger_conditions: d.trigger_conditions as Record<string, any>,
        actions: d.actions as unknown as AutomationAction[]
      })) as SalesAutomation[];
    }
  });

  const createAutomation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sales_automations')
        .insert({
          name: formData.name,
          description: formData.description,
          trigger_type: formData.trigger_type,
          trigger_conditions: formData.trigger_conditions as any,
          actions: formData.actions as any,
          created_by: user?.id!,
          tenant_id: currentTenant?.id,
          is_active: false
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-automations'] });
      toast.success("Automation created");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create automation: " + error.message);
    }
  });

  const toggleAutomation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('sales_automations')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-automations'] });
      toast.success("Automation updated");
    }
  });

  const deleteAutomation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales_automations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-automations'] });
      toast.success("Automation deleted");
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      trigger_type: 'lead_created',
      trigger_conditions: {},
      actions: [{ type: 'send_notification', config: { message: '' } }]
    });
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, { type: 'send_notification', config: { message: '' } }]
    }));
  };

  const removeAction = (index: number) => {
    if (formData.actions.length > 1) {
      setFormData(prev => ({
        ...prev,
        actions: prev.actions.filter((_, i) => i !== index)
      }));
    }
  };

  const updateAction = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => {
        if (i !== index) return action;
        if (field === 'type') {
          return { type: value, config: {} };
        }
        return { ...action, config: { ...action.config, [field]: value } };
      })
    }));
  };

  const getTriggerIcon = (type: string) => {
    const trigger = TRIGGER_TYPES.find(t => t.value === type);
    return trigger?.icon || Zap;
  };

  const getActionIcon = (type: string) => {
    const action = ACTION_TYPES.find(a => a.value === type);
    return action?.icon || Zap;
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
            <Zap className="h-6 w-6 text-primary" />
            Sales Automations
          </h2>
          <p className="text-muted-foreground">Automate repetitive tasks and workflows</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Automation</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label>Automation Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Notify on Hot Lead"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What does this automation do?"
                />
              </div>

              {/* Trigger */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">When this happens...</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select 
                    value={formData.trigger_type} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, trigger_type: v, trigger_conditions: {} }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map((trigger) => (
                        <SelectItem key={trigger.value} value={trigger.value}>
                          <div className="flex items-center gap-2">
                            <trigger.icon className="h-4 w-4" />
                            {trigger.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Trigger Conditions */}
                  {formData.trigger_type === 'deal_stage_change' && (
                    <div className="mt-4">
                      <Label>When stage changes to</Label>
                      <Select 
                        value={formData.trigger_conditions.to_stage || ''} 
                        onValueChange={(v) => setFormData(prev => ({ 
                          ...prev, 
                          trigger_conditions: { ...prev.trigger_conditions, to_stage: v } 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="qualification">Qualification</SelectItem>
                          <SelectItem value="discovery">Discovery</SelectItem>
                          <SelectItem value="proposal">Proposal</SelectItem>
                          <SelectItem value="negotiation">Negotiation</SelectItem>
                          <SelectItem value="closed_won">Closed Won</SelectItem>
                          <SelectItem value="closed_lost">Closed Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.trigger_type === 'score_threshold' && (
                    <div className="mt-4">
                      <Label>When lead score reaches</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.trigger_conditions.threshold || 80}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          trigger_conditions: { ...prev.trigger_conditions, threshold: parseInt(e.target.value) } 
                        }))}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Do this...</CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={addAction}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Action
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.actions.map((action, index) => {
                    const ActionIcon = getActionIcon(action.type);
                    return (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <ActionIcon className="h-5 w-5 text-muted-foreground mt-2" />
                        <div className="flex-1 space-y-3">
                          <Select 
                            value={action.type} 
                            onValueChange={(v) => updateAction(index, 'type', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ACTION_TYPES.map((at) => (
                                <SelectItem key={at.value} value={at.value}>
                                  {at.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {action.type === 'send_notification' && (
                            <div>
                              <Label>Notification Message</Label>
                              <Textarea
                                value={action.config.message || ''}
                                onChange={(e) => updateAction(index, 'message', e.target.value)}
                                placeholder="Use {{deal_title}}, {{lead_name}}, {{score}} for dynamic content"
                              />
                            </div>
                          )}

                          {action.type === 'send_email' && (
                            <>
                              <div>
                                <Label>Email Subject</Label>
                                <Input
                                  value={action.config.subject || ''}
                                  onChange={(e) => updateAction(index, 'subject', e.target.value)}
                                  placeholder="Email subject"
                                />
                              </div>
                              <div>
                                <Label>Email Body</Label>
                                <Textarea
                                  value={action.config.body || ''}
                                  onChange={(e) => updateAction(index, 'body', e.target.value)}
                                  placeholder="Email content..."
                                />
                              </div>
                            </>
                          )}

                          {action.type === 'create_task' && (
                            <>
                              <div>
                                <Label>Task Title</Label>
                                <Input
                                  value={action.config.title || ''}
                                  onChange={(e) => updateAction(index, 'title', e.target.value)}
                                  placeholder="Task title"
                                />
                              </div>
                              <div>
                                <Label>Due in (days)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={action.config.due_days || 1}
                                  onChange={(e) => updateAction(index, 'due_days', parseInt(e.target.value))}
                                />
                              </div>
                            </>
                          )}
                        </div>
                        {formData.actions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAction(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => createAutomation.mutate()} disabled={createAutomation.isPending}>
                  {createAutomation.isPending ? 'Creating...' : 'Create Automation'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Automations List */}
      <div className="space-y-4">
        {automations?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Zap className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No automations yet. Create your first one!</p>
            </CardContent>
          </Card>
        )}

        {automations?.map((automation) => {
          const TriggerIcon = getTriggerIcon(automation.trigger_type);
          const actions = automation.actions as AutomationAction[];

          return (
            <Card key={automation.id} className={`hover:shadow-md transition-shadow ${!automation.is_active && 'opacity-60'}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{automation.name}</h3>
                      <Badge variant={automation.is_active ? "default" : "secondary"}>
                        {automation.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-4">{automation.description}</p>
                    
                    {/* Visual Flow */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                        <TriggerIcon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                          {TRIGGER_TYPES.find(t => t.value === automation.trigger_type)?.label}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      {actions.map((action, i) => {
                        const ActionIcon = getActionIcon(action.type);
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                              <ActionIcon className="h-4 w-4" />
                              <span className="text-sm">
                                {ACTION_TYPES.find(a => a.value === action.type)?.label}
                              </span>
                            </div>
                            {i < actions.length - 1 && (
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={automation.is_active}
                      onCheckedChange={(checked) => toggleAutomation.mutate({ id: automation.id, is_active: checked })}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => deleteAutomation.mutate(automation.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
