import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";

interface NewInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewInventoryDialog({ open, onOpenChange }: NewInventoryDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    category: "",
    unit: "piece",
    quantity_on_hand: "0",
    reorder_level: "0",
    reorder_quantity: "",
    unit_cost: "",
    location: "",
    supplier: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("inventory_items").insert({
        sku: data.sku,
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        unit: data.unit || "piece",
        quantity_on_hand: parseInt(data.quantity_on_hand) || 0,
        reorder_level: parseInt(data.reorder_level) || 0,
        reorder_quantity: data.reorder_quantity ? parseInt(data.reorder_quantity) : null,
        unit_cost: data.unit_cost ? parseFloat(data.unit_cost) : null,
        location: data.location || null,
        supplier: data.supplier || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["assets-stats"] });
      toast.success("Inventory item created successfully");
      onOpenChange(false);
      setFormData({
        sku: "",
        name: "",
        description: "",
        category: "",
        unit: "piece",
        quantity_on_hand: "0",
        reorder_level: "0",
        reorder_quantity: "",
        unit_cost: "",
        location: "",
        supplier: "",
      });
    },
    onError: (error) => {
      toast.error("Failed to create inventory item: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku || !formData.name) {
      toast.error("Please enter SKU and name");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                placeholder="Enter SKU"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter item name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="Enter category"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                placeholder="e.g., piece, kg, box"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity_on_hand">Initial Quantity</Label>
              <Input
                id="quantity_on_hand"
                type="number"
                value={formData.quantity_on_hand}
                onChange={(e) =>
                  setFormData({ ...formData, quantity_on_hand: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorder_level">Reorder Level</Label>
              <Input
                id="reorder_level"
                type="number"
                value={formData.reorder_level}
                onChange={(e) =>
                  setFormData({ ...formData, reorder_level: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorder_quantity">Reorder Quantity</Label>
              <Input
                id="reorder_quantity"
                type="number"
                value={formData.reorder_quantity}
                onChange={(e) =>
                  setFormData({ ...formData, reorder_quantity: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_cost">Unit Cost (₹)</Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) =>
                  setFormData({ ...formData, unit_cost: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Enter storage location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) =>
                  setFormData({ ...formData, supplier: e.target.value })
                }
                placeholder="Enter supplier name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Enter item description"
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
              {createMutation.isPending ? "Creating..." : "Create Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
