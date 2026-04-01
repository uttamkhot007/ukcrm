import { AccountsContractWorkflow } from "./AccountsContractWorkflow";
import { AccountsWorkflows } from "./AccountsWorkflows";
import { AccountsARaging } from "./AccountsARAging";
import { AccountsSLAReminders } from "./AccountsSLAReminders";
import { AccountsProcurement } from "./AccountsProcurement";
import { AccountsStocking } from "./AccountsStocking";
import { SalesAnalyticsModule } from "./SalesAnalyticsModule";
import { PostSaleWorkflowView } from "./PostSaleWorkflowView";
import { QuotationApprovals } from "./QuotationApprovals";

interface AccountsModuleProps {
  initialTab?: string;
}

export function AccountsModule({ initialTab = "contracts" }: AccountsModuleProps) {
  const renderContent = () => {
    if (initialTab.startsWith("contracts-")) {
      const stage = initialTab.replace("contracts-", "");
      return <AccountsContractWorkflow filterStage={stage} />;
    }
    
    switch (initialTab) {
      case "contracts":
        return <AccountsContractWorkflow filterStage="all" />;
      case "post-sale":
        return <PostSaleWorkflowView />;
      case "workflows":
        return <AccountsWorkflows />;
      case "procurement":
        return <AccountsProcurement />;
      case "stocking":
        return <AccountsStocking />;
      case "ar-aging":
        return <AccountsARaging />;
      case "sla-reminders":
        return <AccountsSLAReminders />;
      case "quotation-approvals":
        return <QuotationApprovals />;
      case "analytics":
        return <SalesAnalyticsModule />;
      default:
        return <AccountsContractWorkflow filterStage="all" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Accounts Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage contracts, workflows, procurement, stocking, AR aging, and SLA reminders
        </p>
      </div>

      <div className="min-w-0">
        {renderContent()}
      </div>
    </div>
  );
}
