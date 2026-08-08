import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProductivityCockpit, useTenantPeople } from "@/hooks/usePeopleIntelligence";
import { Search, Trophy, CheckCircle2, Ticket, Briefcase, Activity } from "lucide-react";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const money = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function ProductivityCockpitTab() {
  const [days, setDays] = useState("30");
  const [search, setSearch] = useState("");
  const { data: rows = [], isLoading } = useProductivityCockpit(Number(days));
  const { byId } = useTenantPeople();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (byId.get(r.user_id)?.full_name ?? "").toLowerCase().includes(q));
  }, [rows, search, byId]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          tasks: acc.tasks + r.tasksCompleted,
          tickets: acc.tickets + r.ticketsResolved,
          deals: acc.deals + r.dealsWon,
          overdue: acc.overdue + r.tasksOverdue,
        }),
        { tasks: 0, tickets: 0, deals: 0, overdue: 0 },
      ),
    [rows],
  );

  const topScore = rows[0]?.score ?? 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Tasks completed", value: totals.tasks, icon: CheckCircle2 },
          { label: "Tickets resolved", value: totals.tickets, icon: Ticket },
          { label: "Deals won", value: totals.deals, icon: Briefcase },
          { label: "Overdue items", value: totals.overdue, icon: Activity },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5 text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-muted-foreground truncate">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Output scorecard</CardTitle>
              <CardDescription>
                Live from activities, project tasks, support tickets, deals and attendance. Overdue work pulls the score down.
              </CardDescription>
            </div>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-40" aria-label="Time range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people"
              className="pl-9"
              aria-label="Search people"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading scorecard…</p>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center space-y-1">
              <p className="font-medium">Nothing to show yet</p>
              <p className="text-sm text-muted-foreground">
                Scores appear as people log activities, close tasks and move deals.
              </p>
            </div>
          ) : (
            filtered.map((r, i) => {
              const person = byId.get(r.user_id);
              return (
                <div key={r.user_id} className="rounded-lg border p-4 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3 min-w-56 flex-1">
                    <span className="w-6 text-sm font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={person?.avatar_url ?? undefined} alt="" />
                      <AvatarFallback>{initials(person?.full_name ?? "?")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{person?.full_name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">{person?.department ?? "—"}</p>
                    </div>
                    {i === 0 && <Trophy className="w-4 h-4 text-amber-500" aria-label="Top performer" />}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{r.tasksCompleted} tasks</Badge>
                    <Badge variant="secondary">{r.ticketsResolved} tickets</Badge>
                    <Badge variant="secondary">{r.dealsWon} won</Badge>
                    <Badge variant="secondary">{r.activities} activities</Badge>
                    <Badge variant="secondary">{r.daysPresent} days in</Badge>
                    {r.tasksOverdue > 0 && (
                      <Badge variant="outline" className="border-destructive/40 text-destructive">
                        {r.tasksOverdue} overdue
                      </Badge>
                    )}
                    {r.pipelineValue > 0 && <Badge variant="outline">{money(r.pipelineValue)} pipeline</Badge>}
                  </div>

                  <div className="w-40 shrink-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-semibold tabular-nums">{r.score}</span>
                    </div>
                    <Progress
                      value={topScore ? (r.score / topScore) * 100 : 0}
                      aria-label={`Productivity score ${r.score}`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
