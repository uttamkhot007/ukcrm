import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, ClipboardCheck, Calendar, MoreHorizontal, Loader2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  completed: "bg-green-500/20 text-green-500",
};

export function TechnicalAssessmentsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    current_environment: "",
    requirements: "",
    integration_points: "",
    security_requirements: "",
    scalability_needs: "",
  });

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["technical-assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technical_assessments")
        .select("*, deals(title), contacts(name, company)")
        .order("created_at", { ascending: false });

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
      const { error } = await supabase.from("technical_assessments").insert({
        ...data,
        assessed_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technical-assessments"] });
      toast({ title: "Assessment created successfully" });
      setIsDialogOpen(false);
      setFormData({ title: "", current_environment: "", requirements: "", integration_points: "", security_requirements: "", scalability_needs: "" });
    },
    onError: () => {
      toast({ title: "Failed to create assessment", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("technical_assessments")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technical-assessments"] });
      toast({ title: "Status updated" });
    },
  });

  const filteredAssessments = assessments.filter((a: any) =>
    a.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProfileName = (userId: string) => {
    const profile = profiles.find((p: any) => p.user_id === userId);
    return profile?.full_name || "Unknown";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assessments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Assessment
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No technical assessments found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAssessments.map((assessment: any) => (
            <div
              key={assessment.id}
              className="glass rounded-xl border border-border p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{assessment.title}</h3>
                    <Badge className={statusColors[assessment.status] || "bg-muted"}>
                      {assessment.status?.replace("_", " ")}
                    </Badge>
                    {assessment.score && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Score: {assessment.score}/100
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {assessment.deals?.title && (
                      <span>Deal: {assessment.deals.title}</span>
                    )}
                    {assessment.contacts?.name && (
                      <span>Contact: {assessment.contacts.name}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(assessment.created_at), "MMM d, yyyy")}
                    </span>
                    <span>By: {getProfileName(assessment.assessed_by)}</span>
                  </div>
                  {assessment.requirements && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      Requirements: {assessment.requirements}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: assessment.id, status: "in_progress" })}>
                      Start Assessment
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: assessment.id, status: "review" })}>
                      Send for Review
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: assessment.id, status: "completed" })}>
                      Mark Completed
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Technical Assessment</DialogTitle>
            <DialogDescription>Create a technical assessment for a prospect</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Assessment title"
              />
            </div>
            <div className="space-y-2">
              <Label>Current Environment</Label>
              <Textarea
                value={formData.current_environment}
                onChange={(e) => setFormData({ ...formData, current_environment: e.target.value })}
                placeholder="Describe the prospect's current technical environment"
              />
            </div>
            <div className="space-y-2">
              <Label>Requirements</Label>
              <Textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="Technical requirements"
              />
            </div>
            <div className="space-y-2">
              <Label>Integration Points</Label>
              <Textarea
                value={formData.integration_points}
                onChange={(e) => setFormData({ ...formData, integration_points: e.target.value })}
                placeholder="List systems that need integration"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Security Requirements</Label>
                <Textarea
                  value={formData.security_requirements}
                  onChange={(e) => setFormData({ ...formData, security_requirements: e.target.value })}
                  placeholder="Security needs"
                />
              </div>
              <div className="space-y-2">
                <Label>Scalability Needs</Label>
                <Textarea
                  value={formData.scalability_needs}
                  onChange={(e) => setFormData({ ...formData, scalability_needs: e.target.value })}
                  placeholder="Scalability requirements"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.title || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}