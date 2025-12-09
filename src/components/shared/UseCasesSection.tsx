import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2, Edit, Sparkles, Loader2, ListChecks, CheckCircle2, XCircle } from 'lucide-react';

interface UseCase {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  success_criteria: string[];
  test_steps: string[];
  status?: 'pending' | 'passed' | 'failed';
}

interface UseCasesSectionProps {
  useCases: UseCase[];
  onChange: (useCases: UseCase[]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  docType: 'poc' | 'implementation';
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-500/20 text-red-700',
  medium: 'bg-yellow-500/20 text-yellow-700',
  low: 'bg-green-500/20 text-green-700',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: null,
  passed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
};

export const UseCasesSection: React.FC<UseCasesSectionProps> = ({
  useCases,
  onChange,
  onGenerate,
  isGenerating,
  docType
}) => {
  const [editingCase, setEditingCase] = useState<UseCase | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCriterion, setNewCriterion] = useState('');
  const [newStep, setNewStep] = useState('');

  const handleAdd = () => {
    setEditingCase({
      id: `UC-${String(useCases.length + 1).padStart(3, '0')}`,
      title: '',
      description: '',
      priority: 'medium',
      success_criteria: [],
      test_steps: [],
      status: 'pending',
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (useCase: UseCase, index: number) => {
    setEditingCase({ ...useCase });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingCase || !editingCase.title) return;

    if (editingIndex !== null) {
      onChange(useCases.map((uc, i) => i === editingIndex ? editingCase : uc));
    } else {
      onChange([...useCases, editingCase]);
    }
    setIsDialogOpen(false);
    setEditingCase(null);
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    onChange(useCases.filter((_, i) => i !== index));
  };

  const handleStatusChange = (index: number, status: string) => {
    onChange(useCases.map((uc, i) => 
      i === index ? { ...uc, status: status as UseCase['status'] } : uc
    ));
  };

  const addCriterion = () => {
    if (!newCriterion.trim() || !editingCase) return;
    setEditingCase({
      ...editingCase,
      success_criteria: [...editingCase.success_criteria, newCriterion.trim()],
    });
    setNewCriterion('');
  };

  const removeCriterion = (idx: number) => {
    if (!editingCase) return;
    setEditingCase({
      ...editingCase,
      success_criteria: editingCase.success_criteria.filter((_, i) => i !== idx),
    });
  };

  const addStep = () => {
    if (!newStep.trim() || !editingCase) return;
    setEditingCase({
      ...editingCase,
      test_steps: [...editingCase.test_steps, newStep.trim()],
    });
    setNewStep('');
  };

  const removeStep = (idx: number) => {
    if (!editingCase) return;
    setEditingCase({
      ...editingCase,
      test_steps: editingCase.test_steps.filter((_, i) => i !== idx),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            {docType === 'poc' ? 'POC Use Cases' : 'Implementation Use Cases'}
          </CardTitle>
          <CardDescription>
            Define test scenarios with success criteria and validation steps
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            AI Generate
          </Button>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Use Case
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {useCases.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No use cases defined yet</p>
            <p className="text-sm">Add use cases or use AI to generate them</p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {useCases.map((useCase, index) => (
              <AccordionItem key={useCase.id} value={useCase.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <Badge variant="outline" className="font-mono">{useCase.id}</Badge>
                    {statusIcons[useCase.status || 'pending']}
                    <span className="font-medium">{useCase.title}</span>
                    <Badge className={priorityColors[useCase.priority]}>{useCase.priority}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <p className="text-muted-foreground">{useCase.description}</p>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Success Criteria
                        </h4>
                        <ul className="space-y-1">
                          {useCase.success_criteria.map((c, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-green-500">✓</span>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Test Steps</h4>
                        <ol className="space-y-1 list-decimal list-inside">
                          {useCase.test_steps.map((s, i) => (
                            <li key={i} className="text-sm">{s}</li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Status:</Label>
                        <Select 
                          value={useCase.status || 'pending'}
                          onValueChange={(v) => handleStatusChange(index, v)}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="passed">Passed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(useCase, index)}>
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(index)}>
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? 'Edit Use Case' : 'Add Use Case'}
              </DialogTitle>
            </DialogHeader>
            {editingCase && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Use Case ID</Label>
                    <Input
                      value={editingCase.id}
                      onChange={(e) => setEditingCase({ ...editingCase, id: e.target.value })}
                      placeholder="UC-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select 
                      value={editingCase.priority}
                      onValueChange={(v) => setEditingCase({ ...editingCase, priority: v as UseCase['priority'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={editingCase.title}
                    onChange={(e) => setEditingCase({ ...editingCase, title: e.target.value })}
                    placeholder="e.g., Threat Detection and Alert Generation"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingCase.description}
                    onChange={(e) => setEditingCase({ ...editingCase, description: e.target.value })}
                    placeholder="Describe the use case scenario..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Success Criteria</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newCriterion}
                      onChange={(e) => setNewCriterion(e.target.value)}
                      placeholder="Add success criterion..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCriterion())}
                    />
                    <Button type="button" size="sm" onClick={addCriterion}>Add</Button>
                  </div>
                  <div className="space-y-1 mt-2">
                    {editingCase.success_criteria.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="flex-1 text-sm">{c}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCriterion(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Test Steps</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newStep}
                      onChange={(e) => setNewStep(e.target.value)}
                      placeholder="Add test step..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStep())}
                    />
                    <Button type="button" size="sm" onClick={addStep}>Add</Button>
                  </div>
                  <div className="space-y-1 mt-2">
                    {editingCase.test_steps.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm">{s}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeStep(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={!editingCase.title}>Save</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
