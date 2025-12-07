import { useState } from "react";
import { ModuleVerticalNav, ModuleNavItem } from "@/components/ui/module-vertical-nav";
import { ExpenseReportsList } from "./ExpenseReportsList";
import { TravelRequestsList } from "./TravelRequestsList";
import { ExpenseApprovals } from "./ExpenseApprovals";
import { ExpenseStats } from "./ExpenseStats";
import { useAuth } from "@/hooks/useAuth";
import { Receipt, Plane, CheckCircle, FileText } from "lucide-react";

interface ExpenseModuleProps {
  initialTab?: string;
}

export function ExpenseModule({ initialTab = "my-expenses" }: ExpenseModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { role, teams } = useAuth();
  
  const isFinanceOrManager = role === "admin" || role === "manager" || teams.includes("finance");

  const navItems: ModuleNavItem[] = [
    { value: "my-expenses", label: "My Expenses", icon: Receipt },
    { value: "travel-requests", label: "Travel Requests", icon: Plane },
    ...(isFinanceOrManager ? [
      { value: "approvals", label: "Approvals", icon: CheckCircle },
      { value: "all-expenses", label: "All Expenses", icon: FileText },
    ] : []),
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "my-expenses":
        return <ExpenseReportsList viewMode="personal" />;
      case "travel-requests":
        return <TravelRequestsList />;
      case "approvals":
        return isFinanceOrManager ? <ExpenseApprovals /> : null;
      case "all-expenses":
        return isFinanceOrManager ? <ExpenseReportsList viewMode="all" /> : null;
      default:
        return <ExpenseReportsList viewMode="personal" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Expense & Travel Management</h1>
        <p className="text-muted-foreground">
          Submit expense reports, request travel, and track reimbursements
        </p>
      </div>

      <ExpenseStats />

      <ModuleVerticalNav
        items={navItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="min-w-0">
        {renderContent()}
      </div>
    </div>
  );
}
