import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { cn } from "@/lib/utils";
import { GripVertical, DollarSign, Calendar, Pencil, Trash2, User } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Deal = Database["public"]["Tables"]["deals"]["Row"];
type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type DealStage = Database["public"]["Enums"]["deal_stage"];
type DealWithContact = Deal & { contacts: Pick<Contact, "id" | "name" | "company"> | null };

interface DealsKanbanProps {
  deals: DealWithContact[];
  onEdit: (deal: DealWithContact) => void;
  onDelete: (deal: DealWithContact) => void;
}

const stages: { id: DealStage; label: string; color: string; bgColor: string }[] = [
  { id: "pipeline", label: "Pipeline", color: "text-muted-foreground", bgColor: "bg-muted/50" },
  { id: "upside", label: "Upside", color: "text-blue-400", bgColor: "bg-blue-500/10" },
  { id: "strong_upside", label: "Strong Upside", color: "text-amber-400", bgColor: "bg-amber-500/10" },
  { id: "commit", label: "Commit", color: "text-purple-400", bgColor: "bg-purple-500/10" },
  { id: "closed_won", label: "Closed Won", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  { id: "closed_lost", label: "Closed Lost", color: "text-red-400", bgColor: "bg-red-500/10" },
];

export function DealsKanban({ deals, onEdit, onDelete }: DealsKanbanProps) {
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);
  const { toast } = useToast();
  const { formatCurrency } = useOrganizationSettings();
  const queryClient = useQueryClient();

  const updateDealStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: DealStage }) => {
      const { error } = await supabase
        .from("deals")
        .update({ stage })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast({ title: "Deal stage updated" });
    },
    onError: (error) => {
      toast({ title: "Error updating deal", description: error.message, variant: "destructive" });
    },
  });

  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", deal.id);
  };

  const handleDragEnd = () => {
    setDraggedDeal(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stage: DealStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, stage: DealStage) => {
    e.preventDefault();
    setDragOverStage(null);
    
    if (draggedDeal && draggedDeal.stage !== stage) {
      updateDealStage.mutate({ id: draggedDeal.id, stage });
    }
    setDraggedDeal(null);
  };

  const getDealsByStage = (stage: DealStage) => {
    return deals.filter((deal) => deal.stage === stage);
  };

  const getStageTotal = (stage: DealStage) => {
    return getDealsByStage(stage).reduce((sum, deal) => sum + Number(deal.value), 0);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const stageDeals = getDealsByStage(stage.id);
        const stageTotal = getStageTotal(stage.id);
        const isDropTarget = dragOverStage === stage.id && draggedDeal?.stage !== stage.id;

        return (
          <div
            key={stage.id}
            className={cn(
              "flex-shrink-0 w-72 rounded-xl border border-border transition-all duration-200",
              stage.bgColor,
              isDropTarget && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className="p-3 border-b border-border/50">
              <div className="flex items-center justify-between mb-1">
                <h3 className={cn("font-semibold", stage.color)}>{stage.label}</h3>
                <Badge variant="secondary" className="text-xs">
                  {stageDeals.length}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(stageTotal)}
              </p>
            </div>

            <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
              {stageDeals.map((deal) => (
                <Card
                  key={deal.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, deal)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "p-3 cursor-grab active:cursor-grabbing bg-card hover:bg-accent/50 transition-all duration-200 group",
                    draggedDeal?.id === deal.id && "opacity-50 scale-95"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground/50 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{deal.title}</h4>
                      
                      {deal.contacts && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span className="truncate">{deal.contacts.name}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span className="font-medium text-foreground">
                            {formatCurrency(Number(deal.value))}
                          </span>
                        </div>
                        <span>•</span>
                        <span>{deal.probability}%</span>
                      </div>

                      {deal.expected_close_date && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(deal.expected_close_date), "MMM d, yyyy")}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(deal);
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(deal);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {stageDeals.length === 0 && (
                <div className="flex items-center justify-center h-20 text-sm text-muted-foreground/50 border-2 border-dashed border-border/50 rounded-lg">
                  Drop deals here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
