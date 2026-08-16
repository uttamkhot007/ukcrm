import { useState, useEffect } from "react";
import { TicketKanban } from "./TicketKanban";
import { AdvancedTicketsList } from "./AdvancedTicketsList";
import { TicketStats } from "./TicketStats";
import { NewTicketDialog } from "./NewTicketDialog";
import { TicketDetailsSheet } from "./TicketDetailsSheet";
import { TicketAnalytics } from "./TicketAnalytics";
import { TicketAutomation } from "./TicketAutomation";
import { CannedResponses } from "./CannedResponses";
import { SupportIntelligenceDashboard } from "./SupportIntelligenceDashboard";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List, Ticket } from "lucide-react";

interface TicketingModuleProps {
  initialTab?: string;
}

export function TicketingModule({ initialTab = "all" }: TicketingModuleProps) {
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"list" | "kanban">("list");
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const renderMainContent = () => {
    switch (activeTab) {
      case "analytics":
        return <TicketAnalytics />;
      case "automation":
        return <TicketAutomation />;
      case "templates":
        return <CannedResponses />;
      default:
        return activeView === "kanban" ? (
          <TicketKanban onTicketSelect={setSelectedTicketId} />
        ) : (
          <AdvancedTicketsList onTicketSelect={setSelectedTicketId} />
        );
    }
  };

  const isTicketView = ["all", "open", "escalated"].includes(activeTab);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Ticket className="w-6 h-6 text-primary" />
            </div>
            Support Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage support tickets with SLA tracking, templates & automation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle - only for ticket views */}
          {isTicketView && (
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={activeView === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveView("list")}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={activeView === "kanban" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveView("kanban")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          )}
          <Button onClick={() => setIsNewTicketOpen(true)} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Stats */}
      <TicketStats />

      {/* Main Content */}
      {renderMainContent()}

      {/* Dialogs & Sheets */}
      <NewTicketDialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen} />
      <TicketDetailsSheet 
        ticketId={selectedTicketId} 
        open={!!selectedTicketId} 
        onOpenChange={(open) => !open && setSelectedTicketId(null)} 
      />
    </div>
  );
}
