import { ExpenseReportsList } from "./ExpenseReportsList";
import { TravelRequestsList } from "./TravelRequestsList";
import { ExpenseApprovals } from "./ExpenseApprovals";
import { ExpenseStats } from "./ExpenseStats";
import { useAuth } from "@/hooks/useAuth";

interface ExpenseModuleProps {
  initialTab?: string;
}

export function ExpenseModule({ initialTab = "my-expenses" }: ExpenseModuleProps) {
  const { role, teams } = useAuth();
  
  const isFinanceOrManager = role === "admin" || role === "manager" || teams.includes("finance");

  const renderContent = () => {
    switch (initialTab) {
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

      <div className="min-w-0">
        {renderContent()}
      </div>
    </div>
  );
}
