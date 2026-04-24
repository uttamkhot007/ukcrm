import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Lightbulb, Calendar, User, MoreHorizontal, Loader2 } from "lucide-react";
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
  requested: "bg-blue-500/20 text-blue-500",
  planning: "bg-yellow-500/20 text-yellow-500",
  in_progress: "bg-purple-500/20 text-purple-500",
  completed: "bg-green-500/20 text-green-500",
  cancelled: "bg-muted text-muted-foreground",
  converted: "bg-emerald-500/20 text-emerald-500",
};

export function POCRequestsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    success_criteria: "",
    technical_requirements: "",
  });

  const { data: pocRequests = [], isLoading } = useQuery({
    queryKey: ["poc-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("poc_requests")
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
      const { error } = await supabase.from("poc_requests").insert({
        ...data,
        requested_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poc-requests"] });
      toast({ title: "POC request created successfully" });
      setIsDialogOpen(false);
      setFormData({ title: "", description: "", priority: "medium", success_criteria: "", technical_requirements: "" });
    },
    onError: () => {
      toast({ title: "Failed to create POC request", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "requested" | "planning" | "in_progress" | "completed" | "cancelled" | "converted" }) => {
      const { error } = await supabase
        .from("poc_requests")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poc-requests"] });
      toast({ title: "Status updated" });
    },
  });

  const filteredPOCs = pocRequests.filter((poc: any) =>
    poc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    poc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProfileName = (userId: string) => {
    const profile = profiles.find((p: any) => p.user_id === userId);
    return profile?.full_name || "Unassigned";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search POC requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New POC Request
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredPOCs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No POC requests found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPOCs.map((poc: any) => (
            <div
              key={poc.id}
              className="glass rounded-xl border border-border p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{poc.title}</h3>
                    <Badge className={statusColors[poc.status] || "bg-muted"}>
                      {poc.status?.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline">{poc.priority}</Badge>
                  </div>
                  {poc.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{poc.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {poc.deals?.title && (
                      <span className="flex items-center gap-1">
                        Deal: {poc.deals.title}
                      </span>
                    )}
                    {poc.contacts?.name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {poc.contacts.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(poc.created_at), "MMM d, yyyy")}
                    </span>
                    <span>Requested by: {getProfileName(poc.requested_by)}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: poc.id, status: "planning" })}>
                      Move to Planning
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: poc.id, status: "in_progress" })}>
                      Start POC
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: poc.id, status: "completed" })}>
                      Mark Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: poc.id, status: "converted" })}>
                      Convert to Deal
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New POC Request</DialogTitle>
            <DialogDescription>Create a new Proof of Concept request</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="POC title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the POC objectives"
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Success Criteria</Label>
              <Textarea
                value={formData.success_criteria}
                onChange={(e) => setFormData({ ...formData, success_criteria: e.target.value })}
                placeholder="Define success criteria for the POC"
              />
            </div>
            <div className="space-y-2">
              <Label>Technical Requirements</Label>
              <Textarea
                value={formData.technical_requirements}
                onChange={(e) => setFormData({ ...formData, technical_requirements: e.target.value })}
                placeholder="List technical requirements"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.title || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}