import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Loader2, 
  Phone, 
  Mail, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Video,
  Send
} from "lucide-react";

const activityTypes = [
  { value: "call", label: "Phone Call", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Calendar },
  { value: "video_call", label: "Video Call", icon: Video },
  { value: "note", label: "Note", icon: MessageSquare },
  { value: "document", label: "Document", icon: FileText },
];

export function LogActivitySection() {
  const [selectedDealId, setSelectedDealId] = useState("");
  const [activityType, setActivityType] = useState("note");
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: deals } = useQuery({
    queryKey: ["deals-for-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createActivity = useMutation({
    mutationFn: async () => {
      if (!selectedDealId) {
        throw new Error("Please select a deal");
      }
      if (!description.trim()) {
        throw new Error("Description is required");
      }
      if (description.length > 1000) {
        throw new Error("Description must be less than 1000 characters");
      }
      
      const { error } = await supabase.from("deal_activities").insert({
        deal_id: selectedDealId,
        user_id: user!.id,
        activity_type: activityType,
        description: description.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-activities"] });
      setDescription("");
      toast({ title: "Activity logged successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error logging activity", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createActivity.mutate();
  };

  const selectedType = activityTypes.find(t => t.value === activityType);

  return (
    <Card className="p-4 glass border-border">
      <h3 className="font-semibold mb-4">Log New Activity</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="deal-select">Deal</Label>
            <Select value={selectedDealId} onValueChange={setSelectedDealId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a deal" />
              </SelectTrigger>
              <SelectContent>
                {deals?.map(deal => (
                  <SelectItem key={deal.id} value={deal.id}>
                    {deal.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="activity-type">Activity Type</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map(type => {
                  const TypeIcon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`Describe the ${selectedType?.label.toLowerCase() || 'activity'}...`}
            maxLength={1000}
            rows={3}
            required
          />
          <p className="text-xs text-muted-foreground text-right">
            {description.length}/1000
          </p>
        </div>

        <Button 
          type="submit" 
          disabled={createActivity.isPending || !selectedDealId}
        >
          {createActivity.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Log Activity
        </Button>
      </form>
    </Card>
  );
}
