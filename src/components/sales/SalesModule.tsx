import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealsView } from "./DealsView";
import { LeadsView } from "./LeadsView";
import { ContactsView } from "./ContactsView";
import { QuotationsView } from "./QuotationsView";
import { ActivityTimeline } from "./ActivityTimeline";
import { SalesReports } from "./SalesReports";
import { LogActivitySection } from "./LogActivitySection";
import { SalesQuickActions } from "./SalesQuickActions";
import { Handshake, Users, UserPlus, FileText, Clock, BarChart3 } from "lucide-react";

interface SalesModuleProps {
  initialTab?: string;
}

export function SalesModule({ initialTab = "deals" }: SalesModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales</h1>
          <p className="text-muted-foreground mt-1">
            Manage your deals, leads, contacts, and quotations
          </p>
        </div>
        <SalesQuickActions />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="deals" className="flex items-center gap-2">
            <Handshake className="w-4 h-4" />
            Deals
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="quotations" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Quotations
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deals" className="space-y-4">
          <DealsView />
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <LeadsView />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <ContactsView />
        </TabsContent>

        <TabsContent value="quotations" className="space-y-4">
          <QuotationsView />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Activity Timeline</h2>
            <p className="text-muted-foreground mb-6">Track all interactions and changes for deals</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ActivityTimeline limit={50} />
              </div>
              <div>
                <LogActivitySection />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <SalesReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}