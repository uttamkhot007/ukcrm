import { ReactNode, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { arrayMove } from "@dnd-kit/sortable";
import { WidgetConfig } from "@/hooks/useDashboardWidgets";
import { DraggableWidget } from "./DraggableWidget";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WidgetItem {
  id: string;
  component: ReactNode;
}

interface DraggableWidgetContainerProps {
  widgets: WidgetItem[];
  widgetConfigs: WidgetConfig[];
  onReorder: (configs: WidgetConfig[]) => void;
  className?: string;
  strategy?: "vertical" | "grid";
  columns?: number;
}

export function DraggableWidgetContainer({
  widgets,
  widgetConfigs,
  onReorder,
  className,
  strategy = "vertical",
  columns = 1,
}: DraggableWidgetContainerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragMode, setIsDragMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sort widgets based on config order
  const sortedWidgets = [...widgets].sort((a, b) => {
    const aConfig = widgetConfigs.find((c) => c.id === a.id);
    const bConfig = widgetConfigs.find((c) => c.id === b.id);
    return (aConfig?.order || 0) - (bConfig?.order || 0);
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = widgetConfigs.findIndex((c) => c.id === active.id);
      const newIndex = widgetConfigs.findIndex((c) => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newConfigs = arrayMove(widgetConfigs, oldIndex, newIndex).map(
          (config, index) => ({
            ...config,
            order: index,
          })
        );
        onReorder(newConfigs);
      }
    }
  };

  const activeWidget = activeId
    ? sortedWidgets.find((w) => w.id === activeId)
    : null;

  const sortingStrategy =
    strategy === "grid" ? rectSortingStrategy : verticalListSortingStrategy;

  return (
    <div className="relative">
      {/* Edit Mode Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsDragMode(!isDragMode)}
        className={cn(
          "absolute -top-10 right-0 z-20 gap-2",
          isDragMode && "bg-primary/10 text-primary"
        )}
      >
        <Settings2 className="h-4 w-4" />
        {isDragMode ? "Done" : "Customize"}
      </Button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedWidgets.map((w) => w.id)}
          strategy={sortingStrategy}
        >
          <div
            className={cn(
              className,
              isDragMode && "ring-2 ring-dashed ring-primary/30 rounded-lg p-2"
            )}
          >
            {sortedWidgets.map((widget) => (
              <DraggableWidget
                key={widget.id}
                id={widget.id}
                isDragEnabled={isDragMode}
              >
                {widget.component}
              </DraggableWidget>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeWidget ? (
            <div className="opacity-80 scale-105 shadow-2xl rounded-lg">
              {activeWidget.component}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
