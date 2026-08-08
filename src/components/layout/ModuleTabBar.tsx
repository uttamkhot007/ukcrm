import { useNavigate } from "react-router-dom";
import { useModuleTabs } from "@/contexts/ModuleTabsContext";
import { cn } from "@/lib/utils";

interface ModuleTabBarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

/**
 * Horizontal sub-module navigation. Renders the children of the currently
 * active main module (published by the Sidebar) as a scrollable tab strip
 * directly under the header, instead of nesting them in the left sidebar.
 */
export function ModuleTabBar({ activeModule, onModuleChange }: ModuleTabBarProps) {
  const { parentId, tabs } = useModuleTabs();
  const navigate = useNavigate();

  if (!parentId || tabs.length === 0) return null;

  const handleClick = (id: string) => {
    // Mirror the routing behaviour the sidebar children previously had.
    if (id.startsWith("admin-center-")) {
      navigate(`/admin/${id.replace("admin-center-", "")}`);
    } else if (id.startsWith("platform-")) {
      navigate(`/admin/platform/${id.replace("platform-", "")}`);
    }
    onModuleChange(id);
  };

  return (
    <div className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center gap-1 overflow-x-auto px-4 py-2 scrollbar-none">
        {/* Parent acts as the module overview tab */}
        <button
          onClick={() => onModuleChange(parentId)}
          className={cn(
            "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
            activeModule === parentId
              ? "bg-primary/15 text-primary shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          Overview
        </button>

        {tabs.map((tab) => {
          const isActive = activeModule === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleClick(tab.id)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
