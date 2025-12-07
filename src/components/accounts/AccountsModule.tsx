import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountsContractWorkflow } from "./AccountsContractWorkflow";
import { AccountsWorkflows } from "./AccountsWorkflows";
import { AccountsARaging } from "./AccountsARAging";
import { AccountsSLAReminders } from "./AccountsSLAReminders";
import { AccountsProcurement } from "./AccountsProcurement";
import { AccountsStocking } from "./AccountsStocking";
import { FileText, GitBranch, Clock, Bell, ShoppingCart, Package } from "lucide-react";

interface AccountsModuleProps {
  initialTab?: string;
}

export function AccountsModule({ initialTab = "contracts" }: AccountsModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage contracts, workflows, procurement, stocking, AR aging, and SLA reminders
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 flex-wrap h-auto">
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Contracts
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="procurement" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Procurement
          </TabsTrigger>
          <TabsTrigger value="stocking" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Stocking
          </TabsTrigger>
          <TabsTrigger value="ar-aging" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            AR Aging
          </TabsTrigger>
          <TabsTrigger value="sla-reminders" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            SLA & Reminders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="m-0">
          <AccountsContractWorkflow initialTab="all" />
        </TabsContent>

        <TabsContent value="workflows" className="m-0">
          <AccountsWorkflows />
        </TabsContent>

        <TabsContent value="procurement" className="m-0">
          <AccountsProcurement />
        </TabsContent>

        <TabsContent value="stocking" className="m-0">
          <AccountsStocking />
        </TabsContent>

        <TabsContent value="ar-aging" className="m-0">
          <AccountsARaging />
        </TabsContent>

        <TabsContent value="sla-reminders" className="m-0">
          <AccountsSLAReminders />
        </TabsContent>
      </Tabs>
    </div>
  );
}
