import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useModuleTabs } from "@/contexts/ModuleTabsContext";
import { cancelPreloadModule, preloadModule } from "@/lib/module-preload";
import { cn } from "@/lib/utils";

interface ModuleTabBarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

/**
 * Horizontal sub-module navigation. Renders the children of the currently
 * active main module (published by the Sidebar) as a scrollable tab strip
 * directly under the header, instead of nesting them in the left sidebar.
 *
 * Exposed as a real ARIA tablist: arrow keys move between tabs, Home/End jump
 * to the ends, and the selected tab is announced to screen readers.
 */
export function ModuleTabBar({ activeModule, onModuleChange }: ModuleTabBarProps) {
  const { parentId, tabs } = useModuleTabs();
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);

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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []
    );
    if (buttons.length === 0) return;
    const currentIndex = buttons.findIndex((b) => b === document.activeElement);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % buttons.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = buttons.length - 1;
    if (nextIndex < 0) nextIndex = 0;
    event.preventDefault();
    buttons[nextIndex]?.focus();
  };

  const tabClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      isActive
        ? "bg-primary/15 text-primary shadow-sm"
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
    );

  const isOverviewActive = activeModule === parentId;

  return (
    <div className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div
        ref={listRef}
        role="tablist"
        aria-label="Sub-modules"
        onKeyDown={handleKeyDown}
        className="flex items-center gap-1 overflow-x-auto px-4 py-2 scrollbar-none"
      >
        {/* Parent acts as the module overview tab */}
        <button
          type="button"
          role="tab"
          aria-selected={isOverviewActive}
          tabIndex={isOverviewActive ? 0 : -1}
          onClick={() => onModuleChange(parentId)}
          onMouseEnter={() => preloadModule(parentId, "hover")}
          onMouseLeave={() => cancelPreloadModule(parentId)}
          onFocus={() => preloadModule(parentId, "focus")}
          onBlur={() => cancelPreloadModule(parentId)}
          className={tabClass(isOverviewActive)}
        >
          Overview
        </button>

        {tabs.map((tab) => {
          const isActive = activeModule === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleClick(tab.id)}
              onMouseEnter={() => preloadModule(tab.id, "hover")}
              onMouseLeave={() => cancelPreloadModule(tab.id)}
              onFocus={() => preloadModule(tab.id, "focus")}
              onBlur={() => cancelPreloadModule(tab.id)}
              onPointerDown={() => preloadModule(tab.id, "pointer")}
              className={tabClass(isActive)}
            >
              <tab.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
