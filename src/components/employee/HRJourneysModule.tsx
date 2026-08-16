import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  UserPlus,
  UserMinus,
  Plane,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  buildJourneyTimeline,
  summarizeJourneys,
  mapLeaveRequest,
  mapEmployeeRequest,
  summarizeLeaveTravel,
  mapTraining,
  mapCertification,
  summarizeTraining,
  type JourneyTimeline,
  type LeaveTravelItem,
} from "@/lib/hr-journeys";

function KpiRow({ items }: { items: { label: string; value: number | string; tone?: string }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((k) => (
        <Card key={k.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${k.tone ?? ""}`}>{k.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function JourneyCard({ journey }: { journey: JourneyTimeline }) {
  const [expanded, setExpanded] = useState(false);
  const visibleSteps = expanded
    ? journey.steps
    : journey.steps.filter(
        (s, i) =>
          s.state === "current" ||
          (s.state === "done" && journey.steps[i + 1]?.state === "current") ||
          (s.state === "upcoming" && journey.steps[i - 1]?.state === "current"),
      );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{journey.title}</CardTitle>
            <CardDescription>
              {journey.currentStageName} · day {journey.daysInJourney} of ~{journey.expectedTotalDays}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {journey.stalled && (
              <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">
                <AlertTriangle className="h-3 w-3 mr-1" aria-hidden="true" />
                Stalled {journey.daysInCurrentStage}d
              </Badge>
            )}
            <Badge variant="secondary">{journey.status}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={journey.progress} aria-label={`${journey.title} progress`} />
        <p className="text-sm">{journey.nextAction}</p>
        <ol className="space-y-1.5">
          {visibleSteps.map((s) => (
            <li key={s.id} className="flex items-start gap-2 text-sm">
              {s.state === "done" ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" aria-hidden="true" />
              ) : s.state === "current" ? (
                <Clock className="h-4 w-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
              )}
              <span className={s.state === "upcoming" ? "text-muted-foreground" : ""}>
                <span className="font-medium">{s.name}</span>
                {s.projectedDate && (
                  <span className="text-xs text-muted-foreground"> · target {format(s.projectedDate, "dd MMM")}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="text-xs text-primary underline-offset-2 hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show key stages only" : `Show all ${journey.steps.length} stages`}
        </button>
      </CardContent>
    </Card>
  );
}

function RequestList({ items }: { items: LeaveTravelItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No requests in this view.</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.id} className="rounded-lg border p-3 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="capitalize">
                {i.kind}
              </Badge>
              <span className="font-medium">{i.title}</span>
              {i.reference && <span className="text-xs text-muted-foreground">#{i.reference}</span>}
            </div>
            <Badge
              variant="outline"
              className={
                i.overdue
                  ? "bg-destructive/15 text-destructive border-destructive/30"
                  : i.status === "approved"
                    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                    : ""
              }
            >
              {i.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {i.startDate ? format(i.startDate, "dd MMM yyyy") : "no start date"}
            {i.endDate && i.startDate && i.endDate.getTime() !== i.startDate.getTime()
              ? ` → ${format(i.endDate, "dd MMM yyyy")}`
              : ""}
            {i.days ? ` · ${i.days} day(s)` : ""}
            {i.waitingDays ? ` · waiting ${i.waitingDays}d` : ""}
          </p>
          <p className="text-sm">{i.nextAction}</p>
        </div>
      ))}
    </div>
  );
}

export function HRJourneysModule() {
  const { currentTenant } = useTenant();
  const { user, isAdmin, isManager, isManagement } = useAuth();
  const tenantId = currentTenant?.id;
  const canSeeTeam = Boolean(isAdmin || isManager || isManagement);
  const [tab, setTab] = useState("onboarding");

  const { data: workflows = [], isLoading: wfLoading } = useQuery({
    queryKey: ["hrj-workflows", tenantId, canSeeTeam, user?.id],
    queryFn: async () => {
      if (!tenantId) return [];
      let q = (supabase.from("hr_workflows") as any)
        .select(
          "id, workflow_type, title, status, current_stage, target_user_id, initiated_by, started_at, completed_at, created_at, updated_at",
        )
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (!canSeeTeam && user?.id) q = q.eq("target_user_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: leaveRows = [], isLoading: leaveLoading } = useQuery({
    queryKey: ["hrj-leave", tenantId, canSeeTeam, user?.id],
    queryFn: async () => {
      if (!tenantId) return [];
      let q = (supabase.from("leave_requests") as any)
        .select("id, request_number, user_id, start_date, end_date, days_requested, reason, status, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!canSeeTeam && user?.id) q = q.eq("user_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: requestRows = [], isLoading: reqLoading } = useQuery({
    queryKey: ["hrj-requests", tenantId, canSeeTeam, user?.id],
    queryFn: async () => {
      if (!tenantId) return [];
      let q = (supabase.from("employee_requests") as any)
        .select(
          "id, request_number, user_id, type, title, status, leave_start_date, leave_end_date, wfh_date, sla_deadline, escalated, submitted_at, created_at",
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!canSeeTeam && user?.id) q = q.eq("user_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: progressRows = [], isLoading: progLoading } = useQuery({
    queryKey: ["hrj-learning", tenantId, user?.id],
    queryFn: async () => {
      if (!tenantId || !user?.id) return [];
      const { data, error } = await (supabase.from("learning_progress") as any)
        .select("id, course_id, progress_percent, started_at, completed_at, last_accessed_at")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && !!user?.id,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["hrj-courses", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("learning_courses") as any)
        .select("id, title, category, level, is_active")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: certRows = [] } = useQuery({
    queryKey: ["hrj-certs", tenantId, user?.id],
    queryFn: async () => {
      if (!tenantId || !user?.id) return [];
      const { data, error } = await (supabase.from("employee_certifications") as any)
        .select("id, name, issuing_organization, issue_date, expiry_date")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && !!user?.id,
  });

  const journeys = useMemo(() => workflows.map((w: any) => buildJourneyTimeline(w)), [workflows]);
  const onboarding = useMemo(() => journeys.filter((j) => j.type === "onboarding"), [journeys]);
  const offboarding = useMemo(
    () => journeys.filter((j) => j.type === "offboarding" || j.type === "retention"),
    [journeys],
  );

  const requests = useMemo(
    () => [
      ...leaveRows.map((r: any) => mapLeaveRequest(r)),
      ...requestRows.map((r: any) => mapEmployeeRequest(r)),
    ],
    [leaveRows, requestRows],
  );
  const requestHealth = useMemo(() => summarizeLeaveTravel(requests), [requests]);

  const courseMap = useMemo(() => new Map(courses.map((c: any) => [c.id, c])), [courses]);
  const training = useMemo(
    () => progressRows.map((p: any) => mapTraining(p, courseMap.get(p.course_id))),
    [progressRows, courseMap],
  );
  const certs = useMemo(() => certRows.map((c: any) => mapCertification(c)), [certRows]);
  const trainingHealth = useMemo(() => summarizeTraining(training, certs), [training, certs]);

  const loading = wfLoading || leaveLoading || reqLoading || progLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const onboardingHealth = summarizeJourneys(onboarding);
  const offboardingHealth = summarizeJourneys(offboarding);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">HR Journeys</h2>
        <p className="text-muted-foreground">
          End-to-end onboarding, exit, leave &amp; travel and training progress with the next action on every step
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-muted/50 flex-wrap h-auto py-2 gap-1">
          <TabsTrigger value="onboarding" className="gap-2">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="offboarding" className="gap-2">
            <UserMinus className="h-4 w-4" aria-hidden="true" />
            Offboarding
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <Plane className="h-4 w-4" aria-hidden="true" />
            Leave &amp; Travel
          </TabsTrigger>
          <TabsTrigger value="training" className="gap-2">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Training
          </TabsTrigger>
        </TabsList>

        <TabsContent value="onboarding" className="space-y-4">
          <KpiRow
            items={[
              { label: "Active", value: onboardingHealth.active },
              { label: "Stalled", value: onboardingHealth.stalled, tone: "text-destructive" },
              { label: "Completed", value: onboardingHealth.completed, tone: "text-emerald-500" },
              { label: "Avg progress", value: `${onboardingHealth.avgProgress}%` },
            ]}
          />
          {onboarding.length === 0 ? (
            <p className="text-sm text-muted-foreground">No onboarding journeys yet.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {onboarding.map((j) => (
                <JourneyCard key={j.workflowId} journey={j} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="offboarding" className="space-y-4">
          <KpiRow
            items={[
              { label: "Active exits", value: offboardingHealth.active },
              { label: "Stalled", value: offboardingHealth.stalled, tone: "text-destructive" },
              { label: "Completed", value: offboardingHealth.completed, tone: "text-emerald-500" },
              { label: "Avg progress", value: `${offboardingHealth.avgProgress}%` },
            ]}
          />
          {offboarding.length === 0 ? (
            <p className="text-sm text-muted-foreground">No offboarding or retention journeys yet.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {offboarding.map((j) => (
                <JourneyCard key={j.workflowId} journey={j} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <KpiRow
            items={[
              { label: "Pending", value: requestHealth.pending },
              { label: "Overdue", value: requestHealth.overdue, tone: "text-destructive" },
              { label: "Upcoming (30d)", value: requestHealth.upcoming },
              { label: "Approved days", value: requestHealth.daysOut },
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Needs a decision</CardTitle>
              <CardDescription>Pending leave, travel and work-from-home requests, oldest first</CardDescription>
            </CardHeader>
            <CardContent>
              <RequestList
                items={requests
                  .filter((r) => ["pending", "under_review", "submitted"].includes(r.status))
                  .sort((a, b) => b.waitingDays - a.waitingDays)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recently decided</CardTitle>
            </CardHeader>
            <CardContent>
              <RequestList
                items={requests
                  .filter((r) => !["pending", "under_review", "submitted"].includes(r.status))
                  .slice(0, 10)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <KpiRow
            items={[
              { label: "Enrolled", value: trainingHealth.enrolled },
              { label: "Completed", value: trainingHealth.completed, tone: "text-emerald-500" },
              { label: "Stalled", value: trainingHealth.stalled, tone: "text-amber-500" },
              { label: "Completion", value: `${trainingHealth.completionRate}%` },
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">My training track</CardTitle>
              <CardDescription>Course progress with the recommended next step</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {training.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No enrolments yet — start a course from the Learning Hub.
                </p>
              )}
              {training.map((t) => (
                <div key={t.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{t.courseTitle}</span>
                    <div className="flex items-center gap-2">
                      {t.category && <Badge variant="secondary">{t.category}</Badge>}
                      <Badge variant="outline">{t.progress}%</Badge>
                    </div>
                  </div>
                  <Progress value={t.progress} aria-label={`${t.courseTitle} progress`} />
                  <p className="text-sm text-muted-foreground">{t.nextAction}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                Certification validity
              </CardTitle>
              <CardDescription>
                {trainingHealth.certsExpired} expired · {trainingHealth.certsExpiring} expiring in 60 days
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {certs.length === 0 && (
                <p className="text-sm text-muted-foreground">No certifications recorded.</p>
              )}
              {certs.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.issuer ?? "—"}
                      {c.expiryDate ? ` · expires ${format(c.expiryDate, "dd MMM yyyy")}` : " · no expiry"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      c.state === "expired"
                        ? "bg-destructive/15 text-destructive border-destructive/30"
                        : c.state === "expiring"
                          ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                    }
                  >
                    {c.state === "expiring" ? `${c.daysToExpiry}d left` : c.state.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRJourneysModule;
