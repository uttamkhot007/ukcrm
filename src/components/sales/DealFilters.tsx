import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type DealStage = Database["public"]["Enums"]["deal_stage"];

export interface DealFilters {
  stage: DealStage | "all";
  minValue: string;
  maxValue: string;
  startDate: string;
  endDate: string;
}

interface DealFiltersProps {
  filters: DealFilters;
  onFiltersChange: (filters: DealFilters) => void;
}

const stageLabels: Record<DealStage, string> = {
  pipeline: "Pipeline",
  upside: "Upside",
  strong_upside: "Strong Upside",
  commit: "Commit",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export const initialDealFilters: DealFilters = {
  stage: "all",
  minValue: "",
  maxValue: "",
  startDate: "",
  endDate: "",
};

export function DealFiltersComponent({ filters, onFiltersChange }: DealFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeFiltersCount = [
    filters.stage !== "all",
    filters.minValue,
    filters.maxValue,
    filters.startDate,
    filters.endDate,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange(initialDealFilters);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filter Deals</h4>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-1 text-xs">
                <X className="w-3 h-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Stage</Label>
            <Select
              value={filters.stage}
              onValueChange={(value) => onFiltersChange({ ...filters, stage: value as DealStage | "all" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {Object.entries(stageLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Value Range ($)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minValue}
                onChange={(e) => onFiltersChange({ ...filters, minValue: e.target.value })}
                className="flex-1"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxValue}
                onChange={(e) => onFiltersChange({ ...filters, maxValue: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expected Close Date</Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                className="flex-1"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <Button onClick={() => setOpen(false)} className="w-full">
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
