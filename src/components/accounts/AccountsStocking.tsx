import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Package,
  Search,
  Plus,
  Loader2,
  ArrowUpDown,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Warehouse,
  BarChart3,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  quantity_on_hand: number;
  reorder_level: number | null;
  unit_cost: number | null;
  location: string | null;
  supplier: string | null;
  last_restocked_at: string | null;
  is_active: boolean;
}

interface StockTransaction {
  id: string;
  item_id: string;
  transaction_type: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  performed_by: string;
}

export function AccountsStocking() {
  const [activeTab, setActiveTab] = useState("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [newItem, setNewItem] = useState({
    sku: "",
    name: "",
    description: "",
    category: "",
    quantity_on_hand: 0,
    reorder_level: 10,
    unit_cost: 0,
    location: "",
    supplier: "",
  });
  const [newTransaction, setNewTransaction] = useState({
    transaction_type: "stock_in",
    quantity: 0,
    notes: "",
  });
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["accounts-stocking-inventory", currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["accounts-stocking-transactions", currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as StockTransaction[];
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (item: typeof newItem) => {
      const { error } = await supabase
        .from("inventory_items")
        .insert({
          ...item,
          created_by: user?.id,
          tenant_id: currentTenant?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-stocking-inventory"] });
      toast.success("Item added to inventory");
      setDialogOpen(false);
      setNewItem({
        sku: "",
        name: "",
        description: "",
        category: "",
        quantity_on_hand: 0,
        reorder_level: 10,
        unit_cost: 0,
        location: "",
        supplier: "",
      });
    },
    onError: (error) => {
      toast.error("Failed to add item: " + error.message);
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: { itemId: string; transaction: typeof newTransaction }) => {
      const item = inventory.find((i) => i.id === data.itemId);
      if (!item) throw new Error("Item not found");

      const newQuantity = data.transaction.transaction_type === "stock_in"
        ? item.quantity_on_hand + data.transaction.quantity
        : item.quantity_on_hand - data.transaction.quantity;

      if (newQuantity < 0) throw new Error("Insufficient stock");

      // Create transaction record
      const { error: txError } = await supabase
        .from("inventory_transactions")
        .insert({
          item_id: data.itemId,
          transaction_type: data.transaction.transaction_type,
          quantity: data.transaction.quantity,
          notes: data.transaction.notes,
          performed_by: user?.id,
          tenant_id: currentTenant?.id,
        });

      if (txError) throw txError;

      // Update item quantity
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({
          quantity_on_hand: newQuantity,
          last_restocked_at: data.transaction.transaction_type === "stock_in" ? new Date().toISOString() : undefined,
        })
        .eq("id", data.itemId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-stocking-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-stocking-transactions"] });
      toast.success("Stock transaction recorded");
      setTransactionDialogOpen(false);
      setSelectedItem(null);
      setNewTransaction({
        transaction_type: "stock_in",
        quantity: 0,
        notes: "",
      });
    },
    onError: (error) => {
      toast.error("Failed to record transaction: " + error.message);
    },
  });

  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = inventory.filter(
    (item) => item.reorder_level && item.quantity_on_hand <= item.reorder_level
  );

  const stats = {
    totalItems: inventory.length,
    totalValue: inventory.reduce((sum, item) => sum + (item.quantity_on_hand * (item.unit_cost || 0)), 0),
    lowStock: lowStockItems.length,
    categories: [...new Set(inventory.map((i) => i.category).filter(Boolean))].length,
  };

  const openStockTransaction = (item: InventoryItem) => {
    setSelectedItem(item);
    setTransactionDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{stats.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  ${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold">{stats.lowStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Warehouse className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{stats.categories}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-orange-700 dark:text-orange-300 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((item) => (
                <Badge
                  key={item.id}
                  variant="outline"
                  className="border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300"
                >
                  {item.name} ({item.quantity_on_hand}/{item.reorder_level})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Inventory Management</CardTitle>
            <CardDescription>Manage stock levels and track inventory movements</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Inventory Item</DialogTitle>
                <DialogDescription>Add a new item to inventory</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SKU</Label>
                    <Input
                      value={newItem.sku}
                      onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                      placeholder="SKU-001"
                    />
                  </div>
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="Item name"
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Item description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Input
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      placeholder="Electronics"
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={newItem.location}
                      onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                      placeholder="Warehouse A"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Initial Qty</Label>
                    <Input
                      type="number"
                      value={newItem.quantity_on_hand}
                      onChange={(e) => setNewItem({ ...newItem, quantity_on_hand: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Reorder Level</Label>
                    <Input
                      type="number"
                      value={newItem.reorder_level}
                      onChange={(e) => setNewItem({ ...newItem, reorder_level: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Unit Cost</Label>
                    <Input
                      type="number"
                      value={newItem.unit_cost}
                      onChange={(e) => setNewItem({ ...newItem, unit_cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Supplier</Label>
                  <Input
                    value={newItem.supplier}
                    onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                    placeholder="Supplier name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => createItemMutation.mutate(newItem)}
                  disabled={!newItem.sku || !newItem.name || createItemMutation.isPending}
                >
                  {createItemMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Add Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
              </TabsList>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search inventory..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
            </div>

            <TabsContent value="inventory" className="m-0">
              {filteredInventory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No inventory items found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Reorder Level</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          {item.category && <Badge variant="secondary">{item.category}</Badge>}
                        </TableCell>
                        <TableCell>{item.location || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={item.reorder_level && item.quantity_on_hand <= item.reorder_level ? "destructive" : "default"}
                          >
                            {item.quantity_on_hand}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.reorder_level || "-"}</TableCell>
                        <TableCell>${(item.unit_cost || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => openStockTransaction(item)}>
                            <ArrowUpDown className="w-4 h-4 mr-1" />
                            Adjust
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="transactions" className="m-0">
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowUpDown className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions recorded</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => {
                      const item = inventory.find((i) => i.id === tx.item_id);
                      return (
                        <TableRow key={tx.id}>
                          <TableCell>{format(new Date(tx.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                          <TableCell className="font-medium">{item?.name || "Unknown"}</TableCell>
                          <TableCell>
                            <Badge
                              className={tx.transaction_type === "stock_in"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                              }
                            >
                              <span className="flex items-center gap-1">
                                {tx.transaction_type === "stock_in" ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                {tx.transaction_type.replace("_", " ")}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>{tx.quantity}</TableCell>
                          <TableCell className="text-muted-foreground">{tx.notes || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Stock Transaction Dialog */}
      <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Adjustment</DialogTitle>
            <DialogDescription>
              {selectedItem && `Adjust stock for: ${selectedItem.name} (Current: ${selectedItem.quantity_on_hand})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Transaction Type</Label>
              <Select
                value={newTransaction.transaction_type}
                onValueChange={(value) => setNewTransaction({ ...newTransaction, transaction_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock_in">Stock In (Add)</SelectItem>
                  <SelectItem value="stock_out">Stock Out (Remove)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                value={newTransaction.quantity}
                onChange={(e) => setNewTransaction({ ...newTransaction, quantity: parseInt(e.target.value) || 0 })}
                min={1}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newTransaction.notes}
                onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                placeholder="Reason for adjustment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransactionDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedItem && createTransactionMutation.mutate({
                itemId: selectedItem.id,
                transaction: newTransaction,
              })}
              disabled={!newTransaction.quantity || createTransactionMutation.isPending}
            >
              {createTransactionMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Record Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
