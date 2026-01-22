import { ReactNode, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { DealWonCelebration } from "@/components/dashboard/DealWonCelebration";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Loader2 } from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
  activeModule: string;
  onModuleChange: (module: string) => void;
}

export function MainLayout({ children, activeModule, onModuleChange }: MainLayoutProps) {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { isLoading: authLoading } = useAuth();
  const { isLoading: tenantLoading } = useTenant();

  // Prevent sidebar/module flicker/disappearing by not rendering layout until
  // auth + tenant context are fully ready.
  if (authLoading || tenantLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background perspective-container overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-management/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-2s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-tech/10 rounded-full blur-[80px] animate-float" style={{ animationDelay: '-4s' }} />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar activeModule={activeModule} onModuleChange={onModuleChange} />
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 glass-sidebar border-0">
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
      
      <div className={cn(
        "transition-all duration-500 relative z-10",
        "md:ml-64"
      )}>
        {/* Desktop Header */}
        <div className="hidden md:block sticky top-0 z-50">
          <Header onAIToggle={() => setIsAIOpen(!isAIOpen)} />
        </div>
        
        <main className="min-h-[calc(100vh-4rem)] pb-safe relative page-3d">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
      
      {/* Deal Won Celebration - Shows on all pages */}
      <DealWonCelebration />
    </div>
  );
}
