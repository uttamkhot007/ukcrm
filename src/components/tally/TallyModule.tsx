import { ChartOfAccounts } from "./ChartOfAccounts";
import { VoucherEntry } from "./VoucherEntry";
import { TrialBalance } from "./TrialBalance";
import { ProfitAndLoss } from "./ProfitAndLoss";
import { BalanceSheet } from "./BalanceSheet";
import { InventoryModule } from "./InventoryModule";
import { CashFlowStatement } from "./CashFlowStatement";
import { EstimatesModule } from "./EstimatesModule";
import { BudgetManagement } from "./BudgetManagement";
import { RatioAnalysis } from "./RatioAnalysis";
import { TallyDashboard } from "./TallyDashboard";
import { BookkeepingModule } from "./BookkeepingModule";
import { TaxationModule } from "./TaxationModule";

interface TallyModuleProps {
  initialTab?: string;
}

export function TallyModule({ initialTab = "dashboard" }: TallyModuleProps) {
  // Render the appropriate component based on initialTab
  const renderModule = () => {
    switch (initialTab) {
      case "dashboard":
        return <TallyDashboard />;
      case "chart-of-accounts":
        return <ChartOfAccounts />;
      case "voucher-entry":
        return <VoucherEntry />;
      case "estimates":
        return <EstimatesModule />;
      
      // Bookkeeping Module (consolidated)
      case "bookkeeping":
        return <BookkeepingModule initialTab="day-book" />;
      case "day-book":
        return <BookkeepingModule initialTab="day-book" />;
      case "cash-book":
        return <BookkeepingModule initialTab="cash-book" />;
      case "bank-book":
        return <BookkeepingModule initialTab="bank-book" />;
      case "bank-reconciliation":
        return <BookkeepingModule initialTab="bank-reconciliation" />;
      
      // Financial Reports
      case "trial-balance":
        return <TrialBalance />;
      case "profit-loss":
        return <ProfitAndLoss />;
      case "balance-sheet":
        return <BalanceSheet />;
      case "cash-flow":
        return <CashFlowStatement />;
      case "ratio-analysis":
        return <RatioAnalysis />;
      
      // Taxation Module (consolidated)
      case "taxation":
        return <TaxationModule initialTab="gst" />;
      case "gst":
        return <TaxationModule initialTab="gst" />;
      case "tds-tcs":
        return <TaxationModule initialTab="tds-tcs" />;
      case "e-invoicing":
        return <TaxationModule initialTab="e-invoicing" />;
      case "eway-bill":
        return <TaxationModule initialTab="eway-bill" />;
      
      // Others
      case "budgets":
        return <BudgetManagement />;
      case "inventory":
        return <InventoryModule />;
      
      default:
        return <TallyDashboard />;
    }
  };

  return (
    <div className="p-6">
      {renderModule()}
    </div>
  );
}
