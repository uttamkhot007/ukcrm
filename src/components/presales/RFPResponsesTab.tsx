import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, FileText, Calendar, MoreHorizontal, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-500/20 text-blue-500",
  review: "bg-yellow-500/20 text-yellow-500",
  submitted: "bg-green-500/20 text-green-500",
  won: "bg-emerald-500/20 text-emerald-500",
  lost: "bg-red-500/20 text-red-500",
};

export function RFPResponsesTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    rfp_number: "",
    due_date: "",
    total_sections: 10,
    notes: "",
  });

  const { data: rfpResponses = [], isLoading } = useQuery({
    queryKey: ["rfp-responses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfp_responses")
        .select("*, deals(title), contacts(name, company)")
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("rfp_responses").insert({
        ...data,
        assigned_to: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfp-responses"] });
      toast({ title: "RFP response created" });
      setIsDialogOpen(false);
      setFormData({ title: "", rfp_number: "", due_date: "", total_sections: 10, notes: "" });
    },
    onError: () => {
      toast({ title: "Failed to create RFP response", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, submitted_date }: { id: string; status: string; submitted_date?: string }) => {
      const updateData: any = { status };
      if (submitted_date) updateData.submitted_date = submitted_date;
      
      const { error } = await supabase
        .from("rfp_responses")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfp-responses"] });
      toast({ title: "Status updated" });
    },
  });

  const filteredRFPs = rfpResponses.filter((rfp: any) =>
    rfp.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rfp.rfp_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProfileName = (userId: string) => {
    const profile = profiles.find((p: any) => p.user_id === userId);
    return profile?.full_name || "Unknown";
  };

  const getDaysUntilDue = (dueDate: string) => {
    return differenceInDays(new Date(dueDate), new Date());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search RFP responses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New RFP Response
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredRFPs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No RFP responses found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRFPs.map((rfp: any) => {
            const daysUntilDue = rfp.due_date ? getDaysUntilDue(rfp.due_date) : null;
            const progress = rfp.total_sections > 0 
              ? Math.round((rfp.sections_completed / rfp.total_sections) * 100) 
              : 0;

            return (
              <div
                key={rfp.id}
                className="glass rounded-xl border border-border p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{rfp.title}</h3>
                      <Badge className={statusColors[rfp.status] || "bg-muted"}>
                        {rfp.status?.replace("_", " ")}
                      </Badge>
                      {rfp.rfp_number && (
                        <Badge variant="outline">#{rfp.rfp_number}</Badge>
                      )}
                      {daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7 && rfp.status !== "submitted" && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {daysUntilDue === 0 ? "Due today" : `${daysUntilDue} days left`}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {rfp.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {format(new Date(rfp.due_date), "MMM d, yyyy")}
                        </span>
                      )}
                      {rfp.deals?.title && (
                        <span>Deal: {rfp.deals.title}</span>
                      )}
                      <span>Assigned: {getProfileName(rfp.assigned_to)}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{rfp.sections_completed}/{rfp.total_sections} sections ({progress}%)</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: rfp.id, status: "in_progress" })}>
                        Start Working
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: rfp.id, status: "review" })}>
                        Send for Review
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ 
                        id: rfp.id, 
                        status: "submitted",
                        submitted_date: new Date().toISOString().split('T')[0]
                      })}>
                        Mark as Submitted
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: rfp.id, status: "won" })}>
                        Won
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: rfp.id, status: "lost" })}>
                        Lost
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New RFP Response</DialogTitle>
            <DialogDescription>Create a new RFP/RFI response</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="RFP title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>RFP Number</Label>
                <Input
                  value={formData.rfp_number}
                  onChange={(e) => setFormData({ ...formData, rfp_number: e.target.value })}
                  placeholder="RFP-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Total Sections</Label>
              <Input
                type="number"
                value={formData.total_sections}
                onChange={(e) => setFormData({ ...formData, total_sections: parseInt(e.target.value) || 10 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.title || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}