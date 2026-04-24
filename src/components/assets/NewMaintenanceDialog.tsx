import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface NewMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewMaintenanceDialog({ open, onOpenChange }: NewMaintenanceDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    asset_id: "",
    maintenance_type: "preventive",
    description: "",
    scheduled_date: "",
    cost: "",
    vendor: "",
    notes: "",
  });

  const { data: assets } = useQuery({
    queryKey: ["assets-for-maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("id, name, asset_number")
        .in("status", ["available", "assigned", "maintenance"])
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("asset_maintenance").insert({
        asset_id: data.asset_id,
        maintenance_type: data.maintenance_type,
        description: data.description,
        scheduled_date: data.scheduled_date || null,
        cost: data.cost ? parseFloat(data.cost) : null,
        vendor: data.vendor || null,
        notes: data.notes || null,
        created_by: user?.id,
        status: "scheduled",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["assets-stats"] });
      toast.success("Maintenance scheduled successfully");
      onOpenChange(false);
      setFormData({
        asset_id: "",
        maintenance_type: "preventive",
        description: "",
        scheduled_date: "",
        cost: "",
        vendor: "",
        notes: "",
      });
    },
    onError: (error) => {
      toast.error("Failed to schedule maintenance: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_id || !formData.description) {
      toast.error("Please select an asset and enter a description");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Maintenance</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asset">Asset *</Label>
            <Select
              value={formData.asset_id}
              onValueChange={(value) =>
                setFormData({ ...formData, asset_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                {assets?.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.name} ({asset.asset_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Maintenance Type</Label>
              <Select
                value={formData.maintenance_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, maintenance_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">Preventive</SelectItem>
                  <SelectItem value="corrective">Corrective</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Scheduled Date</Label>
              <Input
                id="scheduled_date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) =>
                  setFormData({ ...formData, scheduled_date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe the maintenance work"
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Estimated Cost (₹)</Label>
              <Input
                id="cost"
                type="number"
                value={formData.cost}
                onChange={(e) =>
                  setFormData({ ...formData, cost: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                value={formData.vendor}
                onChange={(e) =>
                  setFormData({ ...formData, vendor: e.target.value })
                }
                placeholder="Vendor name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Additional notes"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Scheduling..." : "Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
