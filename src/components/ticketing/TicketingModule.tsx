import { useState } from "react";
import { TicketsList } from "./TicketsList";
import { TicketStats } from "./TicketStats";
import { NewTicketDialog } from "./NewTicketDialog";
import { TicketDetailsSheet } from "./TicketDetailsSheet";
import { TicketAnalytics } from "./TicketAnalytics";
import { TicketAutomation } from "./TicketAutomation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface TicketingModuleProps {
  initialTab?: string;
}

export function TicketingModule({ initialTab = "all" }: TicketingModuleProps) {
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const renderContent = () => {
    switch (initialTab) {
      case "all":
        return <TicketsList statusFilter={null} onTicketSelect={setSelectedTicketId} />;
      case "open":
        return <TicketsList statusFilter="open" onTicketSelect={setSelectedTicketId} />;
      case "escalated":
        return <TicketsList statusFilter="escalated" onTicketSelect={setSelectedTicketId} />;
      case "resolved":
        return <TicketsList statusFilter="resolved" onTicketSelect={setSelectedTicketId} />;
      case "analytics":
        return <TicketAnalytics />;
      case "automation":
        return <TicketAutomation />;
      default:
        return <TicketsList statusFilter={null} onTicketSelect={setSelectedTicketId} />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help Desk</h1>
          <p className="text-muted-foreground">Manage support tickets, SLA tracking, analytics & automation</p>
        </div>
        <Button onClick={() => setIsNewTicketOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>

      <TicketStats />

      <div className="min-w-0">
        {renderContent()}
      </div>

      <NewTicketDialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen} />
      <TicketDetailsSheet 
        ticketId={selectedTicketId} 
        open={!!selectedTicketId} 
        onOpenChange={(open) => !open && setSelectedTicketId(null)} 
      />
    </div>
  );
}
