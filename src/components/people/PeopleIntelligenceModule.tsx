import { lazy, Suspense, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { HeartPulse, Gauge, ClipboardCheck, PartyPopper } from "lucide-react";

const WellbeingTab = lazy(() => import("./WellbeingTab").then((m) => ({ default: m.WellbeingTab })));
const ProductivityCockpitTab = lazy(() =>
  import("./ProductivityCockpitTab").then((m) => ({ default: m.ProductivityCockpitTab })),
);
const AccountabilityTab = lazy(() =>
  import("./AccountabilityTab").then((m) => ({ default: m.AccountabilityTab })),
);
const RecognitionTab = lazy(() => import("./RecognitionTab").then((m) => ({ default: m.RecognitionTab })));

const TABS = [
  { id: "wellbeing", label: "Wellbeing", icon: HeartPulse, hint: "How people feel" },
  { id: "productivity", label: "Productivity", icon: Gauge, hint: "What people ship" },
  { id: "accountability", label: "Accountability", icon: ClipboardCheck, hint: "Who owes what" },
  { id: "recognition", label: "Recognition", icon: PartyPopper, hint: "Who gets credit" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const preloaders: Record<TabId, () => Promise<unknown>> = {
  wellbeing: () => import("./WellbeingTab"),
  productivity: () => import("./ProductivityCockpitTab"),
  accountability: () => import("./AccountabilityTab"),
  recognition: () => import("./RecognitionTab"),
};

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
  useEffect(() => {
    const idle = window.requestIdleCallback?.(() => {
      for (const key of Object.keys(preloaders) as TabId[]) void preloaders[key]().catch(() => {});
    });
    return () => {
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    if (e.key === "ArrowRight") setTab(TABS[(i + 1) % TABS.length].id);
    else if (e.key === "ArrowLeft") setTab(TABS[(i - 1 + TABS.length) % TABS.length].id);
    else if (e.key === "Home") setTab(TABS[0].id);
    else if (e.key === "End") setTab(TABS[TABS.length - 1].id);
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
              onClick={() => setTab(t.id)}
              onMouseEnter={() => void preloaders[t.id]().catch(() => {})}
              onFocus={() => void preloaders[t.id]().catch(() => {})}
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
        <Suspense
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
        </Suspense>
      </div>
    </div>
  );
}

export default PeopleIntelligenceModule;
