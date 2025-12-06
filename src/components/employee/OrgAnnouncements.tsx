import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { LucideIcon, Plus, Calendar, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface OrgAnnouncementsProps {
  eventType: string;
  title: string;
  icon: LucideIcon;
  color: string;
}

interface OrgEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  event_date: string;
  created_at: string;
  created_by: string | null;
}

export function OrgAnnouncements({ eventType, title, icon: Icon, color }: OrgAnnouncementsProps) {
  const { user, isAdmin, isManager } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_date: "",
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["org-events", eventType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_events")
        .select("*")
        .eq("event_type", eventType)
        .order("event_date", { ascending: false });

      if (error) throw error;
      return data as OrgEvent[];
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      const { error } = await supabase.from("employee_events").insert({
        event_type: eventType,
        title: newEvent.title,
        description: newEvent.description || null,
        event_date: newEvent.event_date,
        created_by: user.id,
        is_recurring: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-events", eventType] });
      setIsAddDialogOpen(false);
      setNewEvent({ title: "", description: "", event_date: "" });
      toast.success("Event created successfully!");
    },
    onError: (error) => {
      toast.error("Failed to create event: " + error.message);
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employee_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-events", eventType] });
      setDeleteId(null);
      toast.success("Event deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete event: " + error.message);
    },
  });

  const getEventTypeLabel = () => {
    switch (eventType) {
      case "org_event":
        return "Organization Event";
      case "achievement":
        return "Team Achievement";
      case "performance":
        return "Exceptional Performance";
      default:
        return "Event";
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={cn("text-lg font-semibold flex items-center gap-2", color)}>
          <Icon className="w-5 h-5" />
          {title}
        </h2>
        {(isAdmin || isManager) && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add {getEventTypeLabel()}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add {getEventTypeLabel()}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newEvent.title}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder={
                      eventType === "org_event"
                        ? "Annual Company Meetup"
                        : eventType === "achievement"
                        ? "Q4 Sales Target Achieved"
                        : "Employee of the Month"
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, event_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Add details about this event..."
                    rows={4}
                  />
                </div>
                <Button
                  onClick={() => createEventMutation.mutate()}
                  disabled={!newEvent.title || !newEvent.event_date}
                  className="w-full"
                >
                  Create {getEventTypeLabel()}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Icon className={cn("w-12 h-12 mb-4", color)} />
            <p className="text-muted-foreground">No {title.toLowerCase()} yet</p>
            {(isAdmin || isManager) && (
              <p className="text-sm text-muted-foreground mt-2">Click the button above to add one</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0", `bg-${color.replace("text-", "")}/10`)}>
                    <Icon className={cn("w-7 h-7", color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(event.event_date), "MMMM d, yyyy")}
                        </p>
                      </div>
                      {(isAdmin || (event.created_by === user?.id)) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(event.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-muted-foreground mt-3 whitespace-pre-wrap">{event.description}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteEventMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
