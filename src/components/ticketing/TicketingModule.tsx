import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketsList } from "./TicketsList";
import { TicketStats } from "./TicketStats";
import { NewTicketDialog } from "./NewTicketDialog";
import { TicketDetailsSheet } from "./TicketDetailsSheet";
import { Button } from "@/components/ui/button";
import { Plus, Ticket, Clock, AlertTriangle, CheckCircle } from "lucide-react";

export function TicketingModule() {
  const [activeTab, setActiveTab] = useState("all");
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help Desk</h1>
          <p className="text-muted-foreground">Manage support tickets and SLA tracking</p>
        </div>
        <Button onClick={() => setIsNewTicketOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>

      <TicketStats />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Ticket className="w-4 h-4" />
            All Tickets
          </TabsTrigger>
          <TabsTrigger value="open" className="gap-2">
            <Clock className="w-4 h-4" />
            Open
          </TabsTrigger>
          <TabsTrigger value="escalated" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Escalated
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Resolved
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <TicketsList statusFilter={null} onTicketSelect={setSelectedTicketId} />
        </TabsContent>
        <TabsContent value="open">
          <TicketsList statusFilter="open" onTicketSelect={setSelectedTicketId} />
        </TabsContent>
        <TabsContent value="escalated">
          <TicketsList statusFilter="escalated" onTicketSelect={setSelectedTicketId} />
        </TabsContent>
        <TabsContent value="resolved">
          <TicketsList statusFilter="resolved" onTicketSelect={setSelectedTicketId} />
        </TabsContent>
      </Tabs>

      <NewTicketDialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen} />
      <TicketDetailsSheet 
        ticketId={selectedTicketId} 
        open={!!selectedTicketId} 
        onOpenChange={(open) => !open && setSelectedTicketId(null)} 
      />
    </div>
  );
}
