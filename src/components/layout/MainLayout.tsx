import { ReactNode, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
  activeModule: string;
  onModuleChange: (module: string) => void;
}

export function MainLayout({ children, activeModule, onModuleChange }: MainLayoutProps) {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar activeModule={activeModule} onModuleChange={onModuleChange} />
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar 
            activeModule={activeModule} 
            onModuleChange={(module) => {
              onModuleChange(module);
              setIsMobileSidebarOpen(false);
            }} 
          />
        </SheetContent>
      </Sheet>

      {/* Mobile Header */}
      <MobileHeader onMenuClick={() => setIsMobileSidebarOpen(true)} />
      
      <div className={cn("transition-all duration-300 relative z-10", "md:ml-64")}>
        {/* Desktop Header */}
        <div className="hidden md:block">
          <Header onAIToggle={() => setIsAIOpen(!isAIOpen)} />
        </div>
        
        <main className="min-h-[calc(100vh-4rem)] pb-safe relative">
          {children}
        </main>
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}
