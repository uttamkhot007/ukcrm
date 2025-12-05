import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { cn } from "@/lib/utils";

const Index = () => {
  const [activeModule, setActiveModule] = useState("dashboard");
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <Header onAIToggle={() => setIsAIOpen(!isAIOpen)} />
        
        <main className="min-h-[calc(100vh-4rem)]">
          <Dashboard onModuleChange={setActiveModule} />
        </main>
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
};

export default Index;
