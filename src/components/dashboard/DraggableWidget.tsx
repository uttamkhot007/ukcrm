import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableWidgetProps {
  id: string;
  children: React.ReactNode;
  isDragEnabled?: boolean;
}

export function DraggableWidget({ id, children, isDragEnabled = true }: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!isDragEnabled) {
    return <div>{children}</div>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "z-50 opacity-90 scale-[1.02] shadow-2xl"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute -left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-md cursor-grab",
          "bg-muted/80 backdrop-blur-sm border border-border/50",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "hover:bg-primary/10 hover:border-primary/30",
          isDragging && "cursor-grabbing opacity-100"
        )}
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}
