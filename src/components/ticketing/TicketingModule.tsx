import { useState, useEffect } from "react";
import { TicketKanban } from "./TicketKanban";
import { AdvancedTicketsList } from "./AdvancedTicketsList";
import { TicketStats } from "./TicketStats";
import { NewTicketDialog } from "./NewTicketDialog";
import { TicketDetailsSheet } from "./TicketDetailsSheet";
import { TicketAnalytics } from "./TicketAnalytics";
import { TicketAutomation } from "./TicketAutomation";
import { CannedResponses } from "./CannedResponses";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, LayoutGrid, List, BarChart3, Zap, MessageSquare, 
  Ticket, Clock, AlertTriangle, CheckCircle 
} from "lucide-react";

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

  const isTicketView = ["all", "open", "escalated", "resolved"].includes(activeTab);

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
        <Button onClick={() => setIsNewTicketOpen(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {/* Stats */}
      <TicketStats />

      {/* Navigation Tabs - Vertical Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex gap-6">
        <div className="flex flex-col gap-2">
          <TabsList className="flex flex-col h-auto bg-transparent gap-1">
            <TabsTrigger value="all" className="w-full justify-start gap-2 data-[state=active]:bg-muted">
              <List className="w-4 h-4" />
              All Tickets
            </TabsTrigger>
            <TabsTrigger value="open" className="w-full justify-start gap-2 data-[state=active]:bg-muted">
              <Clock className="w-4 h-4" />
              Open
            </TabsTrigger>
            <TabsTrigger value="escalated" className="w-full justify-start gap-2 data-[state=active]:bg-muted">
              <AlertTriangle className="w-4 h-4" />
              Escalated
            </TabsTrigger>
            <TabsTrigger value="templates" className="w-full justify-start gap-2 data-[state=active]:bg-muted">
              <MessageSquare className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="analytics" className="w-full justify-start gap-2 data-[state=active]:bg-muted">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="automation" className="w-full justify-start gap-2 data-[state=active]:bg-muted">
              <Zap className="w-4 h-4" />
              Automation
            </TabsTrigger>
          </TabsList>

          {/* View Toggle - only for ticket views */}
          {isTicketView && (
            <div className="flex items-center gap-1 border rounded-lg p-1 mt-2">
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
        </div>

        <div className="flex-1">
          <TabsContent value="all" className="mt-0">
            {renderMainContent()}
          </TabsContent>
          <TabsContent value="open" className="mt-0">
            {renderMainContent()}
          </TabsContent>
          <TabsContent value="escalated" className="mt-0">
            {renderMainContent()}
          </TabsContent>
          <TabsContent value="templates" className="mt-0">
            {renderMainContent()}
          </TabsContent>
          <TabsContent value="analytics" className="mt-0">
            {renderMainContent()}
          </TabsContent>
          <TabsContent value="automation" className="mt-0">
            {renderMainContent()}
          </TabsContent>
        </div>
      </Tabs>

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
