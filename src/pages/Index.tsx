import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { SalesModule } from "@/components/sales/SalesModule";
import { LegalModule } from "@/components/legal/LegalModule";
import { RenewalsModule } from "@/components/renewals/RenewalsModule";
import { InsideSalesModule } from "@/components/sales/InsideSalesModule";
import { RequestsModule } from "@/components/employee/RequestsModule";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [activeModule, setActiveModule] = useState("dashboard");
  const [isAIOpen, setIsAIOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (activeModule) {
      case "admin":
        return <AdminPanel />;
      case "sales":
      case "sales-funnel":
      case "sales-quotations":
      case "sales-leads":
      case "contacts":
        return <SalesModule />;
      case "inside-sales":
        return <InsideSalesModule />;
      case "legal":
      case "legal-documents":
      case "legal-approvals":
        return <LegalModule />;
      case "renewals":
      case "renewals-contracts":
      case "renewals-licenses":
      case "renewals-subscriptions":
        return <RenewalsModule />;
      case "employee-requests":
        return <RequestsModule />;
      default:
        return <Dashboard onModuleChange={setActiveModule} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      
      <div className={cn("transition-all duration-300 ml-64")}>
        <Header onAIToggle={() => setIsAIOpen(!isAIOpen)} />
        
        <main className="min-h-[calc(100vh-4rem)]">
          {renderContent()}
        </main>
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
};

export default Index;
