import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMyPulseToday } from "@/hooks/usePeopleIntelligence";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2 } from "lucide-react";

const MOODS = [
  { score: 1, emoji: "😔", label: "Struggling" },
  { score: 2, emoji: "😕", label: "Drained" },
  { score: 3, emoji: "😐", label: "Okay" },
  { score: 4, emoji: "🙂", label: "Good" },
  { score: 5, emoji: "🤩", label: "Energised" },
];

export function PulseCheckInCard() {
  const { checkin, isLoading, save } = useMyPulseToday();
  const { toast } = useToast();
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState(3);
  const [workload, setWorkload] = useState(3);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (checkin) {
      setMood(checkin.mood_score);
      setEnergy(checkin.energy_level ?? 3);
      setWorkload(checkin.workload_level ?? 3);
      setNote(checkin.note ?? "");
    }
  }, [checkin]);

  const submit = async () => {
    if (!mood) return;
    try {
      await save.mutateAsync({ mood_score: mood, energy_level: energy, workload_level: workload, note });
      toast({ title: "Check-in saved", description: "Thanks for sharing how today went." });
    } catch (e) {
      toast({
        title: "Could not save your check-in",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">How is today going?</CardTitle>
            <CardDescription>
              A ten-second check-in. Your note is only read by your manager and HR.
            </CardDescription>
          </div>
          {checkin && (
            <Badge variant="secondary" className="gap-1 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              Logged today
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="How are you feeling today?"
        >
          {MOODS.map((m) => {
            const active = mood === m.score;
            return (
              <button
                key={m.score}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={m.label}
                onClick={() => setMood(m.score)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border px-4 py-3 transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary bg-primary/10 scale-105 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-muted",
                )}
              >
                <span className="text-2xl" aria-hidden="true">{m.emoji}</span>
                <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label htmlFor="pulse-energy" className="font-medium">Energy</label>
              <span className="text-muted-foreground">{energy}/5</span>
            </div>
            <Slider
              id="pulse-energy"
              min={1}
              max={5}
              step={1}
              value={[energy]}
              onValueChange={(v) => setEnergy(v[0])}
              aria-label="Energy level"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label htmlFor="pulse-workload" className="font-medium">Workload</label>
              <span className="text-muted-foreground">{workload}/5</span>
            </div>
            <Slider
              id="pulse-workload"
              min={1}
              max={5}
              step={1}
              value={[workload]}
              onValueChange={(v) => setWorkload(v[0])}
              aria-label="Workload level"
            />
          </div>
        </div>

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything worth flagging? Blockers, wins, something that drained you..."
          rows={3}
          aria-label="Optional note about your day"
        />

        <div className="flex justify-end">
          <Button onClick={submit} disabled={!mood || save.isPending || isLoading}>
            {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
            {checkin ? "Update check-in" : "Save check-in"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
