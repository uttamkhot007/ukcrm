import { Suspense, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { lazyNamed } from "@/lib/lazy-module";
import { ModuleErrorBoundary } from "@/components/shared/ModuleErrorBoundary";
import { ModuleSwitchProbe } from "@/components/shared/ModuleSwitchProbe";
import { beginModuleSwitch } from "@/lib/perf-metrics";
import { shouldSkipSpeculativePreload } from "@/lib/chunk-retry";
import { cn } from "@/lib/utils";
import { HeartPulse, Gauge, ClipboardCheck, PartyPopper } from "lucide-react";

// lazyNamed retries with backoff, waits out offline periods and recovers from
// stale deploys, so a dropped connection is a delay rather than a blank tab.
const WellbeingTab = lazyNamed(() => import("./WellbeingTab"), "WellbeingTab");
const ProductivityCockpitTab = lazyNamed(
  () => import("./ProductivityCockpitTab"),
  "ProductivityCockpitTab",
);
const AccountabilityTab = lazyNamed(() => import("./AccountabilityTab"), "AccountabilityTab");
const RecognitionTab = lazyNamed(() => import("./RecognitionTab"), "RecognitionTab");

const TAB_COMPONENTS = {
  wellbeing: WellbeingTab,
  productivity: ProductivityCockpitTab,
  accountability: AccountabilityTab,
  recognition: RecognitionTab,
} as const;

const TABS = [
  { id: "wellbeing", label: "Wellbeing", icon: HeartPulse, hint: "How people feel" },
  { id: "productivity", label: "Productivity", icon: Gauge, hint: "What people ship" },
  { id: "accountability", label: "Accountability", icon: ClipboardCheck, hint: "Who owes what" },
  { id: "recognition", label: "Recognition", icon: PartyPopper, hint: "Who gets credit" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface PeopleIntelligenceModuleProps {
  initialTab?: string;
}

export function PeopleIntelligenceModule({ initialTab }: PeopleIntelligenceModuleProps) {
  const [tab, setTab] = useState<TabId>(
    (TABS.find((t) => t.id === initialTab)?.id ?? "wellbeing") as TabId,
  );

  useEffect(() => {
    const next = TABS.find((t) => t.id === initialTab)?.id;
    if (next) setTab(next);
  }, [initialTab]);

  // Warm sibling chunks once the browser is idle so tab switches feel instant.
  // Skipped on offline / metered / 2g links, and retried when we come back.
  useEffect(() => {
    let idle: number | undefined;
    const warmAll = () => {
      if (shouldSkipSpeculativePreload()) return;
      for (const key of Object.keys(TAB_COMPONENTS) as TabId[]) void TAB_COMPONENTS[key].warm();
    };
    const schedule = () => {
      idle = window.requestIdleCallback?.(warmAll);
      if (idle === undefined) window.setTimeout(warmAll, 1200);
    };
    if (shouldSkipSpeculativePreload()) window.addEventListener("online", schedule, { once: true });
    else schedule();
    return () => {
      window.removeEventListener("online", schedule);
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    if (e.key === "ArrowRight") selectTab(TABS[(i + 1) % TABS.length].id);
    else if (e.key === "ArrowLeft") selectTab(TABS[(i - 1 + TABS.length) % TABS.length].id);
    else if (e.key === "Home") selectTab(TABS[0].id);
    else if (e.key === "End") selectTab(TABS[TABS.length - 1].id);
    else return;
    e.preventDefault();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <HeartPulse className="w-6 h-6 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">People Intelligence</h1>
          <p className="text-muted-foreground">
            Sentiment, output and ownership in one place — so managers act on signal, not hunches.
          </p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="People Intelligence sections"
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-2 border-b pb-2"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              id={`people-tab-${t.id}`}
              aria-selected={active}
              aria-controls="people-tabpanel"
              tabIndex={active ? 0 : -1}
              onClick={() => selectTab(t.id)}
              onMouseEnter={() => void TAB_COMPONENTS[t.id].warm()}
              onFocus={() => void TAB_COMPONENTS[t.id].warm()}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <t.icon className="w-4 h-4" aria-hidden="true" />
              {t.label}
              <span className="hidden md:inline text-xs text-muted-foreground/70">· {t.hint}</span>
            </button>
          );
        })}
      </div>

      <div id="people-tabpanel" role="tabpanel" aria-labelledby={`people-tab-${tab}`} aria-live="polite">
        <ModuleErrorBoundary resetKey={tab} onRetry={() => TAB_COMPONENTS[tab].preload()}>
          <Suspense
            key={tab}
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            {tab === "wellbeing" && <WellbeingTab />}
            {tab === "productivity" && <ProductivityCockpitTab />}
            {tab === "accountability" && <AccountabilityTab />}
            {tab === "recognition" && <RecognitionTab />}
            <ModuleSwitchProbe moduleId={`people-intel:${tab}`} />
          </Suspense>
        </ModuleErrorBoundary>
      </div>
    </div>
  );
}

export default PeopleIntelligenceModule;
