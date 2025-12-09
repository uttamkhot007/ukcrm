import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit, Sparkles, Loader2, Users } from 'lucide-react';

interface RACIEntry {
  activity: string;
  project_manager: 'R' | 'A' | 'C' | 'I' | '';
  technical_lead: 'R' | 'A' | 'C' | 'I' | '';
  customer_poc: 'R' | 'A' | 'C' | 'I' | '';
  vendor_support: 'R' | 'A' | 'C' | 'I' | '';
  security_team: 'R' | 'A' | 'C' | 'I' | '';
}

interface RACIMatrixProps {
  matrix: RACIEntry[];
  onChange: (matrix: RACIEntry[]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const raciColors: Record<string, string> = {
  R: 'bg-blue-500 text-white',
  A: 'bg-green-500 text-white',
  C: 'bg-yellow-500 text-black',
  I: 'bg-gray-400 text-white',
  '': 'bg-transparent',
};

const raciLabels: Record<string, string> = {
  R: 'Responsible',
  A: 'Accountable',
  C: 'Consulted',
  I: 'Informed',
};

const roles = [
  { key: 'project_manager', label: 'Project Manager' },
  { key: 'technical_lead', label: 'Technical Lead' },
  { key: 'customer_poc', label: 'Customer POC' },
  { key: 'vendor_support', label: 'Vendor Support' },
  { key: 'security_team', label: 'Security Team' },
];

export const RACIMatrix: React.FC<RACIMatrixProps> = ({
  matrix,
  onChange,
  onGenerate,
  isGenerating
}) => {
  const [editingEntry, setEditingEntry] = useState<RACIEntry | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAdd = () => {
    setEditingEntry({
      activity: '',
      project_manager: '',
      technical_lead: '',
      customer_poc: '',
      vendor_support: '',
      security_team: '',
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (entry: RACIEntry, index: number) => {
    setEditingEntry({ ...entry });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingEntry || !editingEntry.activity) return;

    if (editingIndex !== null) {
      onChange(matrix.map((m, i) => i === editingIndex ? editingEntry : m));
    } else {
      onChange([...matrix, editingEntry]);
    }
    setIsDialogOpen(false);
    setEditingEntry(null);
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    onChange(matrix.filter((_, i) => i !== index));
  };

  const handleCellChange = (index: number, role: string, value: string) => {
    onChange(matrix.map((m, i) => 
      i === index ? { ...m, [role]: value } : m
    ));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            RACI Matrix
          </CardTitle>
          <CardDescription>
            Define responsibilities: Responsible, Accountable, Consulted, Informed
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
            Add Activity
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {matrix.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No RACI entries defined yet</p>
            <p className="text-sm">Add activities or use AI to generate a matrix</p>
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex gap-4 mb-4 pb-4 border-b">
              {Object.entries(raciLabels).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${raciColors[key]}`}>
                    {key}
                  </span>
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-64">Activity</TableHead>
                    {roles.map(role => (
                      <TableHead key={role.key} className="text-center w-28">
                        {role.label}
                      </TableHead>
                    ))}
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrix.map((entry, index) => (
                    <TableRow key={index} className="group">
                      <TableCell className="font-medium">{entry.activity}</TableCell>
                      {roles.map(role => (
                        <TableCell key={role.key} className="text-center p-1">
                          <Select 
                            value={entry[role.key as keyof RACIEntry] as string || 'none'}
                            onValueChange={(v) => handleCellChange(index, role.key, v === 'none' ? '' : v)}
                          >
                            <SelectTrigger className={`w-12 h-8 mx-auto ${raciColors[entry[role.key as keyof RACIEntry] as string] || ''}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">-</SelectItem>
                              <SelectItem value="R">R</SelectItem>
                              <SelectItem value="A">A</SelectItem>
                              <SelectItem value="C">C</SelectItem>
                              <SelectItem value="I">I</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(entry, index)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(index)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? 'Edit Activity' : 'Add Activity'}
              </DialogTitle>
            </DialogHeader>
            {editingEntry && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Activity Name</Label>
                  <Input
                    value={editingEntry.activity}
                    onChange={(e) => setEditingEntry({ ...editingEntry, activity: e.target.value })}
                    placeholder="e.g., Requirements Gathering"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {roles.map(role => (
                    <div key={role.key} className="space-y-2">
                      <Label>{role.label}</Label>
                      <Select 
                        value={editingEntry[role.key as keyof RACIEntry] as string || 'none'}
                        onValueChange={(v) => setEditingEntry({ 
                          ...editingEntry, 
                          [role.key]: v === 'none' ? '' : v 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="R">R - Responsible</SelectItem>
                          <SelectItem value="A">A - Accountable</SelectItem>
                          <SelectItem value="C">C - Consulted</SelectItem>
                          <SelectItem value="I">I - Informed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={!editingEntry.activity}>Save</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
