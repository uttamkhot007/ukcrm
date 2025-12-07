import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpenseReportsList } from "./ExpenseReportsList";
import { TravelRequestsList } from "./TravelRequestsList";
import { ExpenseApprovals } from "./ExpenseApprovals";
import { ExpenseStats } from "./ExpenseStats";
import { useAuth } from "@/hooks/useAuth";

interface ExpenseModuleProps {
  initialTab?: string;
}

export function ExpenseModule({ initialTab = "my-expenses" }: ExpenseModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { role, teams } = useAuth();
  
  const isFinanceOrManager = role === "admin" || role === "manager" || teams.includes("finance");

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Expense & Travel Management</h1>
        <p className="text-muted-foreground">
          Submit expense reports, request travel, and track reimbursements
        </p>
      </div>

      <ExpenseStats />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="my-expenses">My Expenses</TabsTrigger>
          <TabsTrigger value="travel-requests">Travel Requests</TabsTrigger>
          {isFinanceOrManager && (
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
          )}
          {isFinanceOrManager && (
            <TabsTrigger value="all-expenses">All Expenses</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-expenses" className="mt-6">
          <ExpenseReportsList viewMode="personal" />
        </TabsContent>

        <TabsContent value="travel-requests" className="mt-6">
          <TravelRequestsList />
        </TabsContent>

        {isFinanceOrManager && (
          <TabsContent value="approvals" className="mt-6">
            <ExpenseApprovals />
          </TabsContent>
        )}

        {isFinanceOrManager && (
          <TabsContent value="all-expenses" className="mt-6">
            <ExpenseReportsList viewMode="all" />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
