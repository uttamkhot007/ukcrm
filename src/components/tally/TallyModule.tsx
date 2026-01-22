import { ChartOfAccounts } from "./ChartOfAccounts";
import { VoucherEntry } from "./VoucherEntry";
import { DayBook } from "./DayBook";
import { CashBook } from "./CashBook";
import { BankBook } from "./BankBook";
import { TrialBalance } from "./TrialBalance";
import { ProfitAndLoss } from "./ProfitAndLoss";
import { BalanceSheet } from "./BalanceSheet";
import { GSTModule } from "./GSTModule";
import { InventoryModule } from "./InventoryModule";
import { BankReconciliation } from "./BankReconciliation";
import { CashFlowStatement } from "./CashFlowStatement";
import { EInvoicingModule } from "./EInvoicingModule";
import { EWayBillModule } from "./EWayBillModule";
import { TDSTCSModule } from "./TDSTCSModule";
import { EstimatesModule } from "./EstimatesModule";
import { BudgetManagement } from "./BudgetManagement";
import { RatioAnalysis } from "./RatioAnalysis";
import { TallyDashboard } from "./TallyDashboard";

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
      case "day-book":
        return <DayBook />;
      case "cash-book":
        return <CashBook />;
      case "bank-book":
        return <BankBook />;
      case "bank-reconciliation":
        return <BankReconciliation />;
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
      case "gst":
        return <GSTModule />;
      case "e-invoicing":
        return <EInvoicingModule />;
      case "eway-bill":
        return <EWayBillModule />;
      case "tds-tcs":
        return <TDSTCSModule />;
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
