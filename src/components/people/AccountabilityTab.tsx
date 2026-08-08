import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCommitments, useTenantPeople } from "@/hooks/usePeopleIntelligence";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Plus, CheckCircle2, Clock, AlertTriangle, Loader2 } from "lucide-react";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const priorityStyles: Record<string, string> = {
  high: "border-destructive/40 text-destructive",
  medium: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  low: "border-border text-muted-foreground",
};

export function AccountabilityTab() {
  const { commitments, isLoading, create, setStatus } = useCommitments();
  const { people, byId } = useTenantPeople();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ owner_id: "", title: "", description: "", due_date: "", priority: "medium" });

  const today = new Date().toISOString().slice(0, 10);

  const buckets = useMemo(() => {
    const open_ = commitments.filter((c) => c.status !== "done");
    return {
      overdue: open_.filter((c) => c.due_date < today),
      dueSoon: open_.filter((c) => c.due_date >= today && c.due_date <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)),
      mine: open_.filter((c) => c.owner_id === user?.id),
      done: commitments.filter((c) => c.status === "done"),
    };
  }, [commitments, today, user?.id]);

  const visible = useMemo(() => {
    switch (filter) {
      case "overdue": return buckets.overdue;
      case "mine": return buckets.mine;
      case "done": return buckets.done;
      default: return commitments.filter((c) => c.status !== "done");
    }
  }, [filter, buckets, commitments]);

  const submit = async () => {
    if (!form.owner_id || !form.title.trim() || !form.due_date) {
      toast({ title: "Missing details", description: "Owner, title and due date are required.", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync(form);
      setForm({ owner_id: "", title: "", description: "", due_date: "", priority: "medium" });
      setOpen(false);
      toast({ title: "Commitment created", description: "The owner now sees it on their board." });
    } catch (e) {
      toast({
        title: "Could not create commitment",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Overdue", value: buckets.overdue.length, icon: AlertTriangle },
          { label: "Due this week", value: buckets.dueSoon.length, icon: Clock },
          { label: "Owned by me", value: buckets.mine.length, icon: CheckCircle2 },
          { label: "Completed", value: buckets.done.length, icon: CheckCircle2 },
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
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Who owes what</CardTitle>
            <CardDescription>Explicit commitments with a named owner and a date. Nothing hides in a thread.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40" aria-label="Filter commitments">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All open</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="mine">Owned by me</SelectItem>
                <SelectItem value="done">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                  New commitment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New commitment</DialogTitle>
                  <DialogDescription>One owner, one outcome, one date.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={form.owner_id} onValueChange={(v) => setForm({ ...form, owner_id: v })}>
                    <SelectTrigger aria-label="Owner">
                      <SelectValue placeholder="Owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {people.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="What will be delivered?"
                    aria-label="Commitment title"
                  />
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Context or definition of done (optional)"
                    rows={3}
                    aria-label="Description"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                      aria-label="Due date"
                    />
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger aria-label="Priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={submit} disabled={create.isPending}>
                    {create.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading commitments…</p>
          ) : visible.length === 0 ? (
            <div className="py-10 text-center space-y-1">
              <p className="font-medium">Nothing here</p>
              <p className="text-sm text-muted-foreground">Create a commitment to make ownership explicit.</p>
            </div>
          ) : (
            visible.map((c) => {
              const owner = byId.get(c.owner_id);
              const overdue = c.status !== "done" && c.due_date < today;
              return (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-lg border p-4 flex flex-wrap items-center gap-4",
                    overdue && "border-destructive/40 bg-destructive/5",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-48">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={owner?.avatar_url ?? undefined} alt="" />
                      <AvatarFallback>{initials(owner?.full_name ?? "?")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{owner?.full_name ?? "Unassigned"}</p>
                      <p className="text-xs text-muted-foreground">{owner?.department ?? "—"}</p>
                    </div>
                  </div>

                  <div className="flex-1 min-w-56">
                    <p className={cn("font-medium", c.status === "done" && "line-through text-muted-foreground")}>
                      {c.title}
                    </p>
                    {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={priorityStyles[c.priority]}>{c.priority}</Badge>
                    <Badge variant={overdue ? "destructive" : "secondary"}>
                      {overdue ? "Overdue " : "Due "}
                      {c.due_date}
                    </Badge>
                  </div>

                  <Button
                    size="sm"
                    variant={c.status === "done" ? "outline" : "default"}
                    onClick={() => setStatus.mutate({ id: c.id, status: c.status === "done" ? "open" : "done" })}
                    disabled={setStatus.isPending}
                  >
                    {c.status === "done" ? "Reopen" : "Mark done"}
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
