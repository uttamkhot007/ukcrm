import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit, Sparkles, Loader2, Calendar, GripVertical } from 'lucide-react';

interface Milestone {
  id: string;
  name: string;
  description?: string;
  start_week: number;
  end_week: number;
  dependencies: string[];
  deliverables: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
}

interface GanttChartProps {
  milestones: Milestone[];
  onChange: (milestones: Milestone[]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  docType: 'poc' | 'implementation';
}

const statusColors: Record<string, string> = {
  pending: 'bg-muted',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  delayed: 'bg-red-500',
};

const barColors: Record<string, string> = {
  pending: 'bg-muted-foreground/30',
  in_progress: 'bg-blue-500/80',
  completed: 'bg-green-500/80',
  delayed: 'bg-red-500/80',
};

export const GanttChart: React.FC<GanttChartProps> = ({
  milestones,
  onChange,
  onGenerate,
  isGenerating,
  docType
}) => {
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState('');

  const totalWeeks = docType === 'poc' ? 4 : 12;
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  const handleAdd = () => {
    const newMilestone: Milestone = {
      id: `M${milestones.length + 1}`,
      name: '',
      description: '',
      start_week: 1,
      end_week: 2,
      dependencies: [],
      deliverables: [],
      status: 'pending',
    };
    setEditingMilestone(newMilestone);
    setIsDialogOpen(true);
  };

  const handleEdit = (milestone: Milestone) => {
    setEditingMilestone({ ...milestone });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingMilestone || !editingMilestone.name) return;

    const existing = milestones.find(m => m.id === editingMilestone.id);
    if (existing) {
      onChange(milestones.map(m => m.id === editingMilestone.id ? editingMilestone : m));
    } else {
      onChange([...milestones, editingMilestone]);
    }
    setIsDialogOpen(false);
    setEditingMilestone(null);
  };

  const handleDelete = (id: string) => {
    onChange(milestones.filter(m => m.id !== id));
  };

  const handleStatusChange = (id: string, status: string) => {
    onChange(milestones.map(m => m.id === id ? { ...m, status: status as Milestone['status'] } : m));
  };

  const addDeliverable = () => {
    if (!newDeliverable.trim() || !editingMilestone) return;
    setEditingMilestone({
      ...editingMilestone,
      deliverables: [...editingMilestone.deliverables, newDeliverable.trim()],
    });
    setNewDeliverable('');
  };

  const removeDeliverable = (index: number) => {
    if (!editingMilestone) return;
    setEditingMilestone({
      ...editingMilestone,
      deliverables: editingMilestone.deliverables.filter((_, i) => i !== index),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {docType === 'poc' ? 'POC' : 'Implementation'} Timeline
          </CardTitle>
          <CardDescription>
            {totalWeeks}-week project plan with milestones and deliverables
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
            Add Milestone
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No milestones defined yet</p>
            <p className="text-sm">Add milestones or use AI to generate a timeline</p>
          </div>
        ) : (
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              {/* Header */}
              <div className="flex border-b pb-2 mb-4">
                <div className="w-48 font-medium text-sm">Milestone</div>
                <div className="flex-1 flex">
                  {weeks.map(week => (
                    <div key={week} className="flex-1 text-center text-xs text-muted-foreground">
                      W{week}
                    </div>
                  ))}
                </div>
                <div className="w-24 text-center text-sm font-medium">Status</div>
                <div className="w-20"></div>
              </div>

              {/* Milestones */}
              <div className="space-y-3">
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center group">
                    <div className="w-48 pr-4">
                      <div className="font-medium text-sm truncate">{milestone.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {milestone.deliverables.length} deliverables
                      </div>
                    </div>
                    
                    <div className="flex-1 flex items-center h-8 relative">
                      {/* Grid lines */}
                      {weeks.map(week => (
                        <div key={week} className="flex-1 border-l border-dashed border-muted h-full" />
                      ))}
                      
                      {/* Bar */}
                      <div
                        className={`absolute h-6 rounded-md ${barColors[milestone.status]} transition-all cursor-pointer hover:opacity-80`}
                        style={{
                          left: `${((milestone.start_week - 1) / totalWeeks) * 100}%`,
                          width: `${((milestone.end_week - milestone.start_week + 1) / totalWeeks) * 100}%`,
                        }}
                        onClick={() => handleEdit(milestone)}
                      >
                        <span className="text-xs text-white px-2 truncate block leading-6">
                          {milestone.name}
                        </span>
                      </div>
                    </div>

                    <div className="w-24 px-2">
                      <Select 
                        value={milestone.status} 
                        onValueChange={(v) => handleStatusChange(milestone.id, v)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="delayed">Delayed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(milestone)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(milestone.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex gap-4 mt-6 pt-4 border-t">
                <span className="text-xs text-muted-foreground">Status:</span>
                {Object.entries(statusColors).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded ${color}`} />
                    <span className="text-xs capitalize">{status.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingMilestone?.id && milestones.find(m => m.id === editingMilestone.id) 
                  ? 'Edit Milestone' 
                  : 'Add Milestone'}
              </DialogTitle>
            </DialogHeader>
            {editingMilestone && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Milestone Name</Label>
                  <Input
                    value={editingMilestone.name}
                    onChange={(e) => setEditingMilestone({ ...editingMilestone, name: e.target.value })}
                    placeholder="e.g., Environment Setup"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingMilestone.description || ''}
                    onChange={(e) => setEditingMilestone({ ...editingMilestone, description: e.target.value })}
                    placeholder="Describe the milestone..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Week</Label>
                    <Select 
                      value={String(editingMilestone.start_week)}
                      onValueChange={(v) => setEditingMilestone({ ...editingMilestone, start_week: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weeks.map(w => (
                          <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>End Week</Label>
                    <Select 
                      value={String(editingMilestone.end_week)}
                      onValueChange={(v) => setEditingMilestone({ ...editingMilestone, end_week: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weeks.filter(w => w >= editingMilestone.start_week).map(w => (
                          <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Deliverables</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newDeliverable}
                      onChange={(e) => setNewDeliverable(e.target.value)}
                      placeholder="Add a deliverable..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDeliverable())}
                    />
                    <Button type="button" size="sm" onClick={addDeliverable}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingMilestone.deliverables.map((d, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {d}
                        <button onClick={() => removeDeliverable(i)} className="ml-1 hover:text-destructive">
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={!editingMilestone.name}>Save</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
