import { useState, useEffect } from "react";

export interface WidgetConfig {
  id: string;
  visible: boolean;
  order: number;
}

const DEFAULT_WIDGET_ORDER: WidgetConfig[] = [
  { id: "revenue-chart", visible: true, order: 0 },
  { id: "sales-funnel", visible: true, order: 1 },
  { id: "cyber-news", visible: true, order: 2 },
  { id: "notifications", visible: true, order: 3 },
  { id: "currency-converter", visible: true, order: 4 },
  { id: "upcoming-events", visible: true, order: 5 },
  { id: "quick-actions", visible: true, order: 6 },
  { id: "pending-approvals", visible: true, order: 7 },
  { id: "upcoming-followups", visible: true, order: 8 },
  { id: "upcoming-tasks", visible: true, order: 9 },
  { id: "activity-feed", visible: true, order: 10 },
  { id: "team-performance", visible: true, order: 11 },
];

const STORAGE_KEY = "dashboard-widget-order";

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new widgets
        const mergedWidgets = DEFAULT_WIDGET_ORDER.map((defaultWidget) => {
          const storedWidget = parsed.find((w: WidgetConfig) => w.id === defaultWidget.id);
          return storedWidget || defaultWidget;
        });
        return mergedWidgets.sort((a, b) => a.order - b.order);
      }
    } catch (e) {
      console.error("Failed to load widget order:", e);
    }
    return DEFAULT_WIDGET_ORDER;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  }, [widgets]);

  const reorderWidgets = (newWidgets: WidgetConfig[]) => {
    const reordered = newWidgets.map((w, index) => ({ ...w, order: index }));
    setWidgets(reordered);
  };

  const getWidgetsByIds = (ids: string[]) => {
    return ids
      .map((id) => widgets.find((w) => w.id === id))
      .filter(Boolean)
      .sort((a, b) => (a?.order || 0) - (b?.order || 0)) as WidgetConfig[];
  };

  const resetOrder = () => {
    setWidgets(DEFAULT_WIDGET_ORDER);
  };

  return {
    widgets,
    reorderWidgets,
    getWidgetsByIds,
    resetOrder,
  };
}
