import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Presentation, Calendar, Clock, Video, MoreHorizontal, Loader2 } from "lucide-react";
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
  scheduled: "bg-blue-500/20 text-blue-500",
  completed: "bg-green-500/20 text-green-500",
  cancelled: "bg-muted text-muted-foreground",
  rescheduled: "bg-yellow-500/20 text-yellow-500",
  no_show: "bg-red-500/20 text-red-500",
};

export function DemoSchedulesTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    demo_type: "product",
    scheduled_date: "",
    duration_minutes: 60,
    meeting_link: "",
  });

  const { data: demos = [], isLoading } = useQuery({
    queryKey: ["demo-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_schedules")
        .select("*, deals(title), contacts(name, company)")
        .order("scheduled_date", { ascending: true });

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
      const { error } = await supabase.from("demo_schedules").insert({
        ...data,
        scheduled_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demo-schedules"] });
      toast({ title: "Demo scheduled successfully" });
      setIsDialogOpen(false);
      setFormData({ title: "", description: "", demo_type: "product", scheduled_date: "", duration_minutes: 60, meeting_link: "" });
    },
    onError: () => {
      toast({ title: "Failed to schedule demo", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "scheduled" | "completed" | "cancelled" | "rescheduled" | "no_show" }) => {
      const { error } = await supabase
        .from("demo_schedules")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demo-schedules"] });
      toast({ title: "Status updated" });
    },
  });

  const filteredDemos = demos.filter((demo: any) =>
    demo.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProfileName = (userId: string) => {
    const profile = profiles.find((p: any) => p.user_id === userId);
    return profile?.full_name || "Unknown";
  };

  const upcomingDemos = filteredDemos.filter((d: any) => 
    d.status === "scheduled" && new Date(d.scheduled_date) >= new Date()
  );
  const pastDemos = filteredDemos.filter((d: any) => 
    d.status !== "scheduled" || new Date(d.scheduled_date) < new Date()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search demos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Demo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {upcomingDemos.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Upcoming Demos ({upcomingDemos.length})
              </h3>
              <div className="grid gap-4">
                {upcomingDemos.map((demo: any) => (
                  <DemoCard
                    key={demo.id}
                    demo={demo}
                    getProfileName={getProfileName}
                    onUpdateStatus={(status) => updateStatusMutation.mutate({ id: demo.id, status })}
                  />
                ))}
              </div>
            </div>
          )}

          {pastDemos.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4 text-muted-foreground">Past & Other Demos ({pastDemos.length})</h3>
              <div className="grid gap-4">
                {pastDemos.map((demo: any) => (
                  <DemoCard
                    key={demo.id}
                    demo={demo}
                    getProfileName={getProfileName}
                    onUpdateStatus={(status) => updateStatusMutation.mutate({ id: demo.id, status })}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredDemos.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Presentation className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No demos scheduled</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Demo</DialogTitle>
            <DialogDescription>Schedule a product demo or presentation</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Demo title"
              />
            </div>
            <div className="space-y-2">
              <Label>Demo Type</Label>
              <Select value={formData.demo_type} onValueChange={(v) => setFormData({ ...formData, demo_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product Demo</SelectItem>
                  <SelectItem value="technical">Technical Deep Dive</SelectItem>
                  <SelectItem value="custom">Custom Solution</SelectItem>
                  <SelectItem value="poc_review">POC Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Meeting Link</Label>
              <Input
                value={formData.meeting_link}
                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Demo agenda and objectives"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createMutation.mutate(formData)} 
              disabled={!formData.title || !formData.scheduled_date || createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type DemoStatus = "scheduled" | "completed" | "cancelled" | "rescheduled" | "no_show";

function DemoCard({ demo, getProfileName, onUpdateStatus }: { 
  demo: any; 
  getProfileName: (id: string) => string;
  onUpdateStatus: (status: DemoStatus) => void;
}) {
  return (
    <div className="glass rounded-xl border border-border p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold">{demo.title}</h3>
            <Badge className={statusColors[demo.status] || "bg-muted"}>
              {demo.status?.replace("_", " ")}
            </Badge>
            <Badge variant="outline">{demo.demo_type?.replace("_", " ")}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(demo.scheduled_date), "MMM d, yyyy h:mm a")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {demo.duration_minutes} min
            </span>
            {demo.meeting_link && (
              <a href={demo.meeting_link} target="_blank" rel="noopener noreferrer" 
                 className="flex items-center gap-1 text-primary hover:underline">
                <Video className="w-3 h-3" />
                Join
              </a>
            )}
          </div>
          {demo.contacts?.name && (
            <p className="text-sm text-muted-foreground">
              Contact: {demo.contacts.name} {demo.contacts.company && `(${demo.contacts.company})`}
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
            <DropdownMenuItem onClick={() => onUpdateStatus("completed")}>
              Mark Completed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateStatus("rescheduled")}>
              Reschedule
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateStatus("cancelled")}>
              Cancel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateStatus("no_show")}>
              No Show
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}