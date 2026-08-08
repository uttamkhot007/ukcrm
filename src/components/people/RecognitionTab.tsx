import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useKudosFeed, useTenantPeople } from "@/hooks/usePeopleIntelligence";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Loader2, Award, Flame } from "lucide-react";

const CATEGORIES = [
  { value: "teamwork", label: "Teamwork", emoji: "🤝" },
  { value: "ownership", label: "Ownership", emoji: "🎯" },
  { value: "craft", label: "Craft", emoji: "🛠️" },
  { value: "customer", label: "Customer love", emoji: "💙" },
  { value: "above_beyond", label: "Above & beyond", emoji: "🚀" },
];

const REACTIONS = ["👏", "🔥", "❤️", "🎉"];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export function RecognitionTab() {
  const { data, isLoading, give, toggleReaction } = useKudosFeed();
  const { people, byId } = useTenantPeople();
  const { user } = useAuth();
  const { toast } = useToast();
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("teamwork");
  const [message, setMessage] = useState("");

  const kudos = data?.kudos ?? [];
  const reactions = data?.reactions ?? [];

  const leaderboard = useMemo(() => {
    const counts = new Map<string, number>();
    for (const k of kudos) counts.set(k.to_user_id, (counts.get(k.to_user_id) ?? 0) + k.points);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [kudos]);

  const reactionsFor = (kudosId: string) => reactions.filter((r) => r.kudos_id === kudosId);

  const submit = async () => {
    if (!to || !message.trim()) {
      toast({ title: "Almost there", description: "Pick a person and write a line.", variant: "destructive" });
      return;
    }
    try {
      await give.mutateAsync({ to_user_id: to, category, message });
      setMessage("");
      setTo("");
      toast({ title: "Kudos sent 🎉", description: "It's now on the wall for the whole workspace." });
    } catch (e) {
      toast({
        title: "Could not send kudos",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Give kudos</CardTitle>
            <CardDescription>Recognition works best when it is specific and public.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger aria-label="Recipient">
                  <SelectValue placeholder="Who deserves it?" />
                </SelectTrigger>
                <SelectContent>
                  {people
                    .filter((p) => p.user_id !== user?.id)
                    .map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger aria-label="Category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What did they do, and why did it matter?"
              rows={3}
              aria-label="Kudos message"
            />
            <div className="flex justify-end">
              <Button onClick={submit} disabled={give.isPending}>
                {give.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
                Send kudos
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading the wall…</p>
          ) : kudos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-1">
                <p className="font-medium">The wall is empty</p>
                <p className="text-sm text-muted-foreground">Be the first to recognise someone this week.</p>
              </CardContent>
            </Card>
          ) : (
            kudos.map((k) => {
              const from = byId.get(k.from_user_id);
              const toP = byId.get(k.to_user_id);
              const cat = CATEGORIES.find((c) => c.value === k.category);
              const rs = reactionsFor(k.id);
              return (
                <Card key={k.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarImage src={toP?.avatar_url ?? undefined} alt="" />
                        <AvatarFallback>{initials(toP?.full_name ?? "?")}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{from?.full_name ?? "Someone"}</span>
                          <span className="text-muted-foreground"> recognised </span>
                          <span className="font-semibold">{toP?.full_name ?? "a teammate"}</span>
                        </p>
                        <p className="mt-1">{k.message}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {cat?.emoji} {cat?.label ?? k.category}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {REACTIONS.map((emoji) => {
                        const list = rs.filter((r) => r.emoji === emoji);
                        const mine = list.some((r) => r.user_id === user?.id);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => toggleReaction.mutate({ kudos_id: k.id, emoji, active: mine })}
                            aria-pressed={mine}
                            aria-label={`React with ${emoji}`}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-sm transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              mine ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
                            )}
                          >
                            <span aria-hidden="true">{emoji}</span>
                            {list.length > 0 && <span className="ml-1 text-xs tabular-nums">{list.length}</span>}
                          </button>
                        );
                      })}
                      <span className="ml-auto self-center text-xs text-muted-foreground">
                        {new Date(k.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="w-5 h-5 text-primary" aria-hidden="true" />
            Most recognised
          </CardTitle>
          <CardDescription>Points from recent kudos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">No kudos yet.</p>
          ) : (
            leaderboard.map(([userId, points], i) => {
              const p = byId.get(userId);
              return (
                <div key={userId} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={p?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback>{initials(p?.full_name ?? "?")}</AvatarFallback>
                  </Avatar>
                  <p className="flex-1 min-w-0 truncate text-sm font-medium">{p?.full_name ?? "Unknown"}</p>
                  <Badge variant="secondary" className="gap-1">
                    <Flame className="w-3 h-3" aria-hidden="true" />
                    {points}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
