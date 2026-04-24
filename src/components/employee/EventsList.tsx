import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format, isToday, isTomorrow, differenceInDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { LucideIcon, Send, Plus, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const EMOJIS = ["🎉", "🎂", "🎈", "🥳", "💐", "🌟", "❤️", "👏", "🙌", "✨"];

interface EventsListProps {
  eventType: string;
  title: string;
  icon: LucideIcon;
  color: string;
}

interface EmployeeEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  title: string;
  description: string | null;
  event_date: string;
  is_recurring: boolean;
  created_at: string;
}

interface EventWish {
  id: string;
  event_id: string;
  sender_id: string;
  message: string | null;
  emoji: string | null;
  created_at: string;
  sender?: {
    full_name: string | null;
  };
}

export function EventsList({ eventType, title, icon: Icon, color }: EventsListProps) {
  const { user, isAdmin, isManager } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<EmployeeEvent | null>(null);
  const [wishMessage, setWishMessage] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_date: "",
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["employee-events", eventType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_events")
        .select("*")
        .eq("event_type", eventType)
        .order("event_date", { ascending: true });

      if (error) throw error;
      return data as EmployeeEvent[];
    },
  });

  const { data: wishes = [] } = useQuery({
    queryKey: ["event-wishes", selectedEvent?.id],
    enabled: !!selectedEvent,
    queryFn: async () => {
      // Get wishes
      const { data: wishesData, error } = await supabase
        .from("event_wishes")
        .select("*")
        .eq("event_id", selectedEvent!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set(wishesData?.map(w => w.sender_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (wishesData || []).map(wish => ({
        ...wish,
        sender: profileMap.get(wish.sender_id) || null,
      })) as EventWish[];
    },
  });

  const sendWishMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEvent || !user) return;

      const { error } = await supabase.from("event_wishes").insert({
        event_id: selectedEvent.id,
        sender_id: user.id,
        recipient_id: selectedEvent.user_id,
        message: wishMessage || null,
        emoji: selectedEmoji || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-wishes", selectedEvent?.id] });
      setWishMessage("");
      setSelectedEmoji("");
      toast.success("Wish sent successfully!");
    },
    onError: (error) => {
      toast.error("Failed to send wish: " + error.message);
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
        user_id: user.id,
        created_by: user.id,
        is_recurring: eventType === "birthday" || eventType === "anniversary",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-events", eventType] });
      setIsAddDialogOpen(false);
      setNewEvent({ title: "", description: "", event_date: "" });
      toast.success("Event created successfully!");
    },
    onError: (error) => {
      toast.error("Failed to create event: " + error.message);
    },
  });

  const getEventStatus = (date: string) => {
    const eventDate = parseISO(date);
    if (isToday(eventDate)) return { label: "Today!", variant: "destructive" as const };
    if (isTomorrow(eventDate)) return { label: "Tomorrow", variant: "default" as const };
    const days = differenceInDays(eventDate, new Date());
    if (days > 0 && days <= 7) return { label: `In ${days} days`, variant: "secondary" as const };
    return null;
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
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New {eventType === "birthday" ? "Birthday" : "Anniversary"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newEvent.title}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder={eventType === "birthday" ? "John's Birthday" : "5 Year Work Anniversary"}
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
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Add a note..."
                  />
                </div>
                <Button onClick={() => createEventMutation.mutate()} disabled={!newEvent.title || !newEvent.event_date}>
                  Create Event
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
            <p className="text-muted-foreground">No upcoming {eventType}s</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const status = getEventStatus(event.event_date);
            return (
              <Card key={event.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedEvent(event)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", `bg-${color.replace("text-", "")}/10`)}>
                      <Icon className={cn("w-6 h-6", color)} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{event.title}</h3>
                        {status && <Badge variant={status.variant}>{status.label}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {format(parseISO(event.event_date), "MMMM d, yyyy")}
                      </p>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className={cn("w-5 h-5", color)} />
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {selectedEvent && format(parseISO(selectedEvent.event_date), "MMMM d, yyyy")}
            </div>
            {selectedEvent?.description && (
              <p className="text-sm">{selectedEvent.description}</p>
            )}

            {/* Wishes Section */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Send a wish</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setSelectedEmoji(emoji)}
                    className={cn(
                      "text-2xl p-2 rounded-lg transition-all hover:scale-110",
                      selectedEmoji === emoji ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={wishMessage}
                  onChange={(e) => setWishMessage(e.target.value)}
                  placeholder="Write a message (optional)..."
                  className="flex-1"
                  rows={2}
                />
                <Button
                  onClick={() => sendWishMutation.mutate()}
                  disabled={!wishMessage && !selectedEmoji}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Previous Wishes */}
            {wishes.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Wishes ({wishes.length})</h4>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {wishes.map((wish) => (
                    <div key={wish.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {wish.sender?.full_name?.slice(0, 2).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{wish.sender?.full_name || "Anonymous"}</p>
                        <div className="flex items-center gap-2">
                          {wish.emoji && <span className="text-xl">{wish.emoji}</span>}
                          {wish.message && <p className="text-sm text-muted-foreground">{wish.message}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
