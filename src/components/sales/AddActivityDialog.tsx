import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Loader2, Phone, Mail, Calendar, MessageSquare, FileText, Video } from "lucide-react";

const activityTypes = [
  { value: "call", label: "Phone Call", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Calendar },
  { value: "video_call", label: "Video Call", icon: Video },
  { value: "note", label: "Note", icon: MessageSquare },
  { value: "document", label: "Document", icon: FileText },
];

interface AddActivityDialogProps {
  dealId: string;
  dealTitle: string;
  trigger?: React.ReactNode;
}

export function AddActivityDialog({ dealId, dealTitle, trigger }: AddActivityDialogProps) {
  const [open, setOpen] = useState(false);
  const [activityType, setActivityType] = useState("note");
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createActivity = useMutation({
    mutationFn: async () => {
      if (!description.trim()) {
        throw new Error("Description is required");
      }
      if (description.length > 1000) {
        throw new Error("Description must be less than 1000 characters");
      }
      
      const { error } = await supabase.from("deal_activities").insert({
        deal_id: dealId,
        user_id: user!.id,
        activity_type: activityType,
        description: description.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-activities"] });
      setOpen(false);
      setDescription("");
      setActivityType("note");
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
  const Icon = selectedType?.icon || MessageSquare;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Log Activity
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Deal</Label>
            <Input value={dealTitle} disabled className="bg-muted" />
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

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Describe the ${selectedType?.label.toLowerCase() || 'activity'}...`}
              maxLength={1000}
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/1000
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={createActivity.isPending}>
            {createActivity.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Icon className="w-4 h-4 mr-2" />
            Log {selectedType?.label || "Activity"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
