import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export function TimeEntriesView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    project_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    hours: "",
    description: "",
    is_billable: true,
  });

  const { data: timeEntries, isLoading } = useQuery({
    queryKey: ["my-time-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_time_entries")
        .select(`
          *,
          project:projects(name, project_number)
        `)
        .eq("user_id", user?.id)
        .order("date", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: projects } = useQuery({
    queryKey: ["projects-for-time"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("project_time_entries").insert([{
        project_id: data.project_id,
        user_id: user?.id!,
        date: data.date,
        hours: parseFloat(data.hours),
        description: data.description || null,
        is_billable: data.is_billable,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["projects-stats"] });
      toast.success("Time entry logged successfully");
      setIsDialogOpen(false);
      setFormData({
        project_id: "",
        date: format(new Date(), "yyyy-MM-dd"),
        hours: "",
        description: "",
        is_billable: true,
      });
    },
    onError: (error) => {
      toast.error("Failed to log time: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id || !formData.hours) {
      toast.error("Please select a project and enter hours");
      return;
    }
    createMutation.mutate(formData);
  };

  const totalHours = timeEntries?.reduce((sum, t) => sum + Number(t.hours), 0) || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Total logged: <span className="font-medium">{totalHours.toFixed(1)} hours</span>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Log Time
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Time Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Project *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hours *</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="24"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What did you work on?"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : "Log Time"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Hours</TableHead>
              <TableHead>Billable</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading time entries...
                </TableCell>
              </TableRow>
            ) : timeEntries?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No time entries logged</p>
                </TableCell>
              </TableRow>
            ) : (
              timeEntries?.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                  <TableCell>{entry.project?.name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {entry.description || "-"}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {Number(entry.hours).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {entry.is_billable ? (
                      <Badge variant="default">Billable</Badge>
                    ) : (
                      <Badge variant="outline">Non-billable</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
