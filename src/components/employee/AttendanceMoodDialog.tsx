import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AttendanceMoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "check_in" | "check_out";
  onSubmit: (mood: string) => void;
}

const moods = [
  { id: "interesting", emoji: "🤩", label: "Interesting", color: "from-purple-500 to-pink-500" },
  { id: "good", emoji: "😊", label: "Good", color: "from-green-500 to-emerald-500" },
  { id: "informative", emoji: "🧠", label: "Informative", color: "from-blue-500 to-cyan-500" },
  { id: "productive", emoji: "💪", label: "Productive", color: "from-orange-500 to-yellow-500" },
  { id: "boring", emoji: "😐", label: "Boring", color: "from-gray-500 to-slate-500" },
  { id: "stressful", emoji: "😓", label: "Stressful", color: "from-red-500 to-rose-500" },
];

export function AttendanceMoodDialog({
  open,
  onOpenChange,
  type,
  onSubmit,
}: AttendanceMoodDialogProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const handleSubmit = () => {
    if (selectedMood) {
      onSubmit(selectedMood);
      setSelectedMood(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {type === "check_in" ? "How are you feeling today?" : "How was your day?"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {type === "check_in"
              ? "Select your mood as you start your day"
              : "Select your mood as you wrap up your day"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          {moods.map((mood) => (
            <button
              key={mood.id}
              onClick={() => setSelectedMood(mood.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200",
                "hover:scale-105 hover:shadow-lg",
                selectedMood === mood.id
                  ? `bg-gradient-to-br ${mood.color} text-white shadow-lg scale-105`
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              <span className="text-3xl">{mood.emoji}</span>
              <span className="text-xs font-medium">{mood.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setSelectedMood(null);
              onOpenChange(false);
            }}
          >
            Skip
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!selectedMood}
          >
            {type === "check_in" ? "Start Day" : "End Day"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
