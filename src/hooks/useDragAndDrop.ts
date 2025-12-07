import { useState } from "react";
import { 
  DragEndEvent, 
  DragStartEvent,
  DragOverEvent,
  UniqueIdentifier 
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

interface UseDragAndDropOptions<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  getId: (item: T) => string;
}

export function useDragAndDrop<T>({ items, onReorder, getId }: UseDragAndDropOptions<T>) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => getId(item) === active.id);
      const newIndex = items.findIndex((item) => getId(item) === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        onReorder(newItems);
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Can be extended for cross-container dragging
  };

  const activeItem = activeId 
    ? items.find((item) => getId(item) === activeId) 
    : null;

  return {
    activeId,
    activeItem,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
  };
}