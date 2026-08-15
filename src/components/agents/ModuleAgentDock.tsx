import { useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AgentPanel } from "./AgentPanel";
import { agentsForModule } from "@/lib/agents/registry";

/** Maps an app module id to the agent specialism that owns it. */
export function agentModuleFor(activeModule: string): string {
  const m = activeModule ?? "";
  if (m.startsWith("deal-desk") || m.startsWith("tender") || m.startsWith("rfp")) return "tenders";
  if (m.startsWith("sales") || m.startsWith("inside-sales") || m.startsWith("meddic")) return "sales";
  if (
    m.startsWith("finance") || m.startsWith("accounting") || m.startsWith("tally") ||
    m.startsWith("billing") || m.startsWith("taxation") || m.startsWith("bookkeeping") ||
    m.startsWith("expenses") || m.startsWith("procurement")
  ) return "finance";
  if (m.startsWith("support") || m.startsWith("customer-support") || m.startsWith("it") || m.startsWith("ticket"))
    return "support";
  if (m.startsWith("hr") || m.startsWith("employee") || m.startsWith("people") || m.startsWith("recruitment"))
    return "hr";
  if (m.includes("template") || m.startsWith("documents") || m.startsWith("legal") || m.startsWith("presales"))
    return "documents";
  if (
    m.startsWith("management") || m.startsWith("analytics") || m.startsWith("dashboard") ||
    m.startsWith("reports") || m.startsWith("projects") || m.startsWith("renewals") ||
    m.startsWith("compliance")
  ) return "reports";
  return "all";
}

interface ModuleAgentDockProps {
  activeModule: string;
}

/**
 * The agent entry point embedded in every module: a docked launcher that
 * opens the module's specialist agents pre-scoped to the current screen.
 */
export function ModuleAgentDock({ activeModule }: ModuleAgentDockProps) {
  const [open, setOpen] = useState(false);
  const module = agentModuleFor(activeModule);
  const roster = agentsForModule(module);
  const lead = roster[0];

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className="fixed bottom-24 right-6 z-40 gap-2 rounded-full shadow-lg shadow-primary/20"
        aria-label={`Open ${lead.name}`}
      >
        <Bot className="h-4 w-4" />
        <span className="hidden sm:inline">{lead.name}</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Agents for this module
            </SheetTitle>
          </SheetHeader>
          <AgentPanel
            key={module}
            module={module}
            context={{ surface: "module-dock", activeModule }}
            title={lead.name}
            className="border-0 bg-transparent shadow-none"
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
