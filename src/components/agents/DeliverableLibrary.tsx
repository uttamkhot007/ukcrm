import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileStack, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DeliverablePreview } from "./DeliverablePreview";
import { getAgentMeta } from "@/lib/agents/registry";
import { cn } from "@/lib/utils";

interface DeliverableRow {
  id: string;
  title: string;
  deliverable_type: string;
  agent_key: string | null;
  summary: string | null;
  body_html: string | null;
  created_at: string;
}

export function DeliverableLibrary() {
  const { currentTenant } = useTenant();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ai-deliverables", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_deliverables")
        .select("id,title,deliverable_type,agent_key,summary,body_html,created_at")
        .eq("tenant_id", currentTenant!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as DeliverableRow[];
    },
  });

  const rows = (data ?? []).filter((d) =>
    search ? d.title.toLowerCase().includes(search.toLowerCase()) : true,
  );
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileStack className="h-4 w-4 text-primary" />
            Deliverables
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deliverables"
              className="pl-8"
              aria-label="Search deliverables"
            />
          </div>
        </CardHeader>
        <CardContent className="max-h-[65vh] space-y-2 overflow-y-auto">
          {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          {!isLoading && rows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No deliverables yet. Run an agent to produce one.
            </p>
          )}
          {rows.map((row) => (
            <button
              key={row.id}
              onClick={() => setSelectedId(row.id)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition-colors",
                selected?.id === row.id ? "border-primary bg-primary/5" : "hover:border-primary/40",
              )}
            >
              <p className="truncate text-sm font-medium">{row.title}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {getAgentMeta(row.agent_key ?? "")?.name ?? row.deliverable_type}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(row.created_at).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {selected?.body_html ? (
        <DeliverablePreview
          title={selected.title}
          html={selected.body_html}
          subtitle={selected.summary ?? undefined}
        />
      ) : (
        <Card className="flex items-center justify-center p-10 text-sm text-muted-foreground">
          Select a deliverable to preview it.
        </Card>
      )}
    </div>
  );
}
