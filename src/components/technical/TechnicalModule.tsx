import { Wrench } from "lucide-react";
import { CustomerContractsView } from "./CustomerContractsView";
import { CustomerContactsView } from "./CustomerContactsView";
import { ProductRecommendationSteps } from "@/components/shared/ProductRecommendationSteps";
import { SolutionDocumentationPage } from "@/components/shared/SolutionDocumentationPage";
import { RemoteSessionsModule } from "@/components/remote-sessions/RemoteSessionsModule";

interface TechnicalModuleProps {
  initialTab?: string;
}

export function TechnicalModule({ initialTab = "contracts" }: TechnicalModuleProps) {
  const renderContent = () => {
    switch (initialTab) {
      case "contracts":
        return <CustomerContractsView />;
      case "contacts":
        return <CustomerContactsView />;
      case "recommendations":
        return <ProductRecommendationSteps teamType="technical" />;
      case "implementation-plan":
        return <SolutionDocumentationPage docType="implementation" teamType="technical" />;
      case "remote-sessions":
        return <RemoteSessionsModule context="technical" />;
      default:
        return <CustomerContractsView />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-technical/10 flex items-center justify-center">
          <Wrench className="w-6 h-6 text-technical" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Technical Team</h1>
          <p className="text-muted-foreground">Customer contracts, support details & escalation matrix</p>
        </div>
      </div>

      <div className="min-w-0">
        {renderContent()}
      </div>
    </div>
  );
}
