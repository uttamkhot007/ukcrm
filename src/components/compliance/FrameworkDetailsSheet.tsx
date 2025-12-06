import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, ChevronDown, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";

interface FrameworkDetailsSheetProps {
  frameworkId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  not_started: "bg-slate-500",
  in_progress: "bg-amber-500",
  compliant: "bg-green-500",
  non_compliant: "bg-red-500",
  needs_review: "bg-purple-500",
};

export function FrameworkDetailsSheet({ frameworkId, open, onOpenChange }: FrameworkDetailsSheetProps) {
  const queryClient = useQueryClient();
  const [isAddControlOpen, setIsAddControlOpen] = useState(false);
  const [newControl, setNewControl] = useState({ control_id: "", title: "", description: "", category: "" });

  const { data: framework } = useQuery({
    queryKey: ["compliance-framework", frameworkId],
    queryFn: async () => {
      if (!frameworkId) return null;
      const { data, error } = await supabase
        .from("compliance_frameworks")
        .select("*")
        .eq("id", frameworkId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!frameworkId,
  });

  const { data: controls } = useQuery({
    queryKey: ["compliance-controls", frameworkId],
    queryFn: async () => {
      if (!frameworkId) return [];
      const { data, error } = await supabase
        .from("compliance_controls")
        .select("*")
        .eq("framework_id", frameworkId)
        .order("control_id");
      if (error) throw error;
      return data;
    },
    enabled: !!frameworkId,
  });

  const handleAddControl = async () => {
    if (!frameworkId || !newControl.control_id || !newControl.title) return;
    try {
      const { error } = await supabase.from("compliance_controls").insert({
        framework_id: frameworkId,
        control_id: newControl.control_id,
        title: newControl.title,
        description: newControl.description || null,
        category: newControl.category || null,
      });
      if (error) throw error;
      toast.success("Control added");
      setIsAddControlOpen(false);
      setNewControl({ control_id: "", title: "", description: "", category: "" });
      queryClient.invalidateQueries({ queryKey: ["compliance-controls", frameworkId] });
      queryClient.invalidateQueries({ queryKey: ["compliance-stats"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleStatusChange = async (controlId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("compliance_controls")
        .update({ status: newStatus as "not_started" | "in_progress" | "compliant" | "non_compliant" | "needs_review", last_assessed_at: new Date().toISOString() })
        .eq("id", controlId);
      if (error) throw error;
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["compliance-controls", frameworkId] });
      queryClient.invalidateQueries({ queryKey: ["compliance-frameworks"] });
      queryClient.invalidateQueries({ queryKey: ["compliance-stats"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (!framework) return null;

  const total = controls?.length || 0;
  const compliant = controls?.filter(c => c.status === "compliant").length || 0;
  const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0;

  // Group controls by category
  const groupedControls = controls?.reduce((acc, control) => {
    const category = control.category || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(control);
    return acc;
  }, {} as Record<string, typeof controls>) || {};

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{framework.name}</SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
            <div className="space-y-6 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Compliance</span>
                  <span className="text-2xl font-bold">{complianceRate}%</span>
                </div>
                <Progress value={complianceRate} className="h-3" />
                <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                  <span>{compliant} of {total} controls compliant</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="font-medium">Controls</h3>
                <Button size="sm" onClick={() => setIsAddControlOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Control
                </Button>
              </div>

              <div className="space-y-4">
                {Object.entries(groupedControls).map(([category, categoryControls]) => (
                  <Collapsible key={category} defaultOpen>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted">
                      <span className="font-medium">{category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{categoryControls?.length} controls</span>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {categoryControls?.map((control) => (
                        <div key={control.id} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{control.control_id}</Badge>
                                <span className="font-medium text-sm">{control.title}</span>
                              </div>
                              {control.description && (
                                <p className="text-sm text-muted-foreground mt-1">{control.description}</p>
                              )}
                            </div>
                            <Select 
                              value={control.status} 
                              onValueChange={(v) => handleStatusChange(control.id, v)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_started">Not Started</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="compliant">Compliant</SelectItem>
                                <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                                <SelectItem value="needs_review">Needs Review</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={isAddControlOpen} onOpenChange={setIsAddControlOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Control</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Control ID *</Label>
                <Input
                  value={newControl.control_id}
                  onChange={(e) => setNewControl({ ...newControl, control_id: e.target.value })}
                  placeholder="e.g., CC1.1"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={newControl.category}
                  onChange={(e) => setNewControl({ ...newControl, category: e.target.value })}
                  placeholder="e.g., Access Control"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={newControl.title}
                onChange={(e) => setNewControl({ ...newControl, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newControl.description}
                onChange={(e) => setNewControl({ ...newControl, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddControlOpen(false)}>Cancel</Button>
              <Button onClick={handleAddControl}>Add Control</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
