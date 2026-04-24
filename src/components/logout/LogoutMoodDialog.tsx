import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/api/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LogoutMoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmLogout: () => void;
  userId: string;
}

type MoodType = "interesting" | "boring" | "good" | "informative" | "stressful";

interface MoodOption {
  value: MoodType;
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
}

const moodOptions: MoodOption[] = [
  { value: "interesting", emoji: "🤩", label: "Interesting", color: "text-amber-500", bgColor: "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50" },
  { value: "good", emoji: "😊", label: "Good", color: "text-green-500", bgColor: "bg-green-500/20 hover:bg-green-500/30 border-green-500/50" },
  { value: "informative", emoji: "🧠", label: "Informative", color: "text-blue-500", bgColor: "bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50" },
  { value: "boring", emoji: "😐", label: "Boring", color: "text-gray-500", bgColor: "bg-gray-500/20 hover:bg-gray-500/30 border-gray-500/50" },
  { value: "stressful", emoji: "😫", label: "Stressful", color: "text-red-500", bgColor: "bg-red-500/20 hover:bg-red-500/30 border-red-500/50" },
];

export function LogoutMoodDialog({ open, onOpenChange, onConfirmLogout, userId }: LogoutMoodDialogProps) {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedMood) {
      toast.error("Please select how your day was");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("employee_mood_logs").insert({
        user_id: userId,
        mood: selectedMood,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success("Thanks for sharing! Have a great day!");
      onConfirmLogout();
    } catch (error) {
      console.error("Error logging mood:", error);
      toast.error("Failed to save your feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onConfirmLogout();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">How was your day? 🌟</DialogTitle>
          <DialogDescription className="text-center">
            Your feedback helps us create a better workplace for everyone
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mood Selection */}
          <div className="grid grid-cols-5 gap-2">
            {moodOptions.map((mood) => (
              <button
                key={mood.value}
                onClick={() => setSelectedMood(mood.value)}
                className={cn(
                  "flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-300 transform hover:scale-105",
                  selectedMood === mood.value
                    ? `${mood.bgColor} border-2 scale-105 shadow-lg`
                    : "border-transparent bg-muted/50 hover:bg-muted"
                )}
              >
                <span className="text-3xl mb-1 animate-bounce" style={{ animationDelay: `${moodOptions.indexOf(mood) * 100}ms` }}>
                  {mood.emoji}
                </span>
                <span className={cn("text-xs font-medium", selectedMood === mood.value ? mood.color : "text-muted-foreground")}>
                  {mood.label}
                </span>
              </button>
            ))}
          </div>

          {/* Optional Notes */}
          {selectedMood && (
            <div className="animate-fade-in space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Want to share more? (Optional)
              </label>
              <Textarea
                placeholder="Any thoughts about your day..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="flex-1"
              disabled={isSubmitting}
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedMood || isSubmitting}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80"
            >
              {isSubmitting ? "Saving..." : "Submit & Logout"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}