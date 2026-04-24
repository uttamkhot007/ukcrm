import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Warehouse, Package, MapPin, Plus, Search, ArrowUpDown, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { useForm } from "react-hook-form";

interface StockItemForm {
  name: string;
  code: string;
  category: string;
  unit: string;
  opening_quantity: number;
  opening_value: number;
  reorder_level: number;
  valuation_method: string;
  hsn_code: string;
  gst_rate: number;
}

export function InventoryModule() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("items");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddGodownOpen, setIsAddGodownOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StockItemForm>();

  // Fetch stock items
  const { data: stockItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["stock-items", currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_items")
        .select("*")
        .eq("tenant_id", currentTenant?.id)
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch godowns
  const { data: godowns = [] } = useQuery({
    queryKey: ["godowns", currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("godowns")
        .select("*")
        .eq("tenant_id", currentTenant?.id)
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch stock ledger
  const { data: stockLedger = [] } = useQuery({
    queryKey: ["stock-ledger", currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_ledger")
        .select("*, stock_item:stock_items(name, code), godown:godowns(name)")
        .eq("tenant_id", currentTenant?.id)
        .order("transaction_date", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Add stock item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: StockItemForm) => {
      const { error } = await supabase
        .from("stock_items")
        .insert({
          tenant_id: currentTenant?.id,
          created_by: user?.id,
          name: data.name,
          code: data.code,
          category: data.category,
          unit: data.unit,
          opening_quantity: data.opening_quantity || 0,
          current_quantity: data.opening_quantity || 0,
          opening_value: data.opening_value || 0,
          current_value: data.opening_value || 0,
          reorder_level: data.reorder_level || 0,
          valuation_method: data.valuation_method || "weighted_average",
          hsn_code: data.hsn_code,
          gst_rate: data.gst_rate || 18,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-items"] });
      toast.success("Stock item added successfully");
      setIsAddItemOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error("Failed to add stock item: " + error.message);
    },
  });

  // Add godown mutation
  const addGodownMutation = useMutation({
    mutationFn: async (data: { name: string; address: string; is_primary: boolean }) => {
      const { error } = await supabase
        .from("godowns")
        .insert({
          tenant_id: currentTenant?.id,
          name: data.name,
          address: data.address,
          is_primary: data.is_primary,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["godowns"] });
      toast.success("Godown added successfully");
      setIsAddGodownOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to add godown: " + error.message);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate summary stats
  const totalValue = stockItems.reduce((sum, item) => sum + (item.current_value || 0), 0);
  const totalItems = stockItems.length;
  const lowStockItems = stockItems.filter(item => 
    item.current_quantity <= (item.minimum_quantity || 0) && (item.minimum_quantity || 0) > 0
  );

  const filteredItems = stockItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Warehouse className="h-6 w-6" />
            Inventory Module
          </h2>
          <p className="text-muted-foreground">Stock groups, items, godowns, and valuation</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Godowns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{godowns.length}</p>
          </CardContent>
        </Card>
        <Card className={lowStockItems.length > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${lowStockItems.length > 0 ? "text-destructive" : ""}`}>
              {lowStockItems.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="items">Stock Items</TabsTrigger>
          <TabsTrigger value="godowns">Godowns</TabsTrigger>
          <TabsTrigger value="ledger">Stock Ledger</TabsTrigger>
          <TabsTrigger value="valuation">Valuation</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Stock Items</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add Stock Item</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit((data) => addItemMutation.mutate(data))} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Item Name *</Label>
                            <Input {...register("name", { required: true })} placeholder="Item name" />
                          </div>
                          <div>
                            <Label>Item Code</Label>
                            <Input {...register("code")} placeholder="SKU/Code" />
                          </div>
                          <div>
                            <Label>Category</Label>
                            <Input {...register("category")} placeholder="Category" />
                          </div>
                          <div>
                            <Label>Unit</Label>
                            <Select onValueChange={(v) => register("unit").onChange({ target: { value: v } })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pcs">Pieces</SelectItem>
                                <SelectItem value="nos">Numbers</SelectItem>
                                <SelectItem value="kg">Kilograms</SelectItem>
                                <SelectItem value="ltr">Litres</SelectItem>
                                <SelectItem value="box">Boxes</SelectItem>
                                <SelectItem value="set">Sets</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Opening Quantity</Label>
                            <Input {...register("opening_quantity", { valueAsNumber: true })} type="number" defaultValue={0} />
                          </div>
                          <div>
                            <Label>Opening Value (₹)</Label>
                            <Input {...register("opening_value", { valueAsNumber: true })} type="number" step="0.01" defaultValue={0} />
                          </div>
                          <div>
                            <Label>Reorder Level</Label>
                            <Input {...register("reorder_level", { valueAsNumber: true })} type="number" defaultValue={0} />
                          </div>
                          <div>
                            <Label>Valuation Method</Label>
                            <Select onValueChange={(v) => register("valuation_method").onChange({ target: { value: v } })} defaultValue="weighted_average">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fifo">FIFO</SelectItem>
                                <SelectItem value="lifo">LIFO</SelectItem>
                                <SelectItem value="weighted_average">Weighted Average</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>HSN Code</Label>
                            <Input {...register("hsn_code")} placeholder="HSN Code" />
                          </div>
                          <div>
                            <Label>GST Rate (%)</Label>
                            <Input {...register("gst_rate", { valueAsNumber: true })} type="number" defaultValue={18} />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
                          <Button type="submit" disabled={addItemMutation.isPending}>
                            {addItemMutation.isPending ? "Adding..." : "Add Item"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Valuation</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No stock items found. Add items to start managing inventory.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.item_code || "-"}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.stock_group_id ? "Group" : "-"}</TableCell>
                        <TableCell className="text-right">{item.current_quantity}</TableCell>
                        <TableCell>pcs</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.current_value || 0)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {item.valuation_method?.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.current_quantity <= (item.minimum_quantity || 0) && (item.minimum_quantity || 0) > 0 ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="secondary">In Stock</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="godowns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Godowns / Warehouses</CardTitle>
                <Dialog open={isAddGodownOpen} onOpenChange={setIsAddGodownOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Godown
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Godown</DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        addGodownMutation.mutate({
                          name: formData.get("name") as string,
                          address: formData.get("address") as string,
                          is_primary: formData.get("is_primary") === "on",
                        });
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <Label>Godown Name *</Label>
                        <Input name="name" required placeholder="Main Warehouse" />
                      </div>
                      <div>
                        <Label>Address</Label>
                        <Input name="address" placeholder="Address" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" name="is_primary" id="is_primary" />
                        <Label htmlFor="is_primary">Primary Godown</Label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsAddGodownOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={addGodownMutation.isPending}>
                          {addGodownMutation.isPending ? "Adding..." : "Add Godown"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {godowns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No godowns configured. Add godowns to manage stock locations.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {godowns.map((godown) => (
                    <Card key={godown.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{godown.name}</CardTitle>
                          {godown.is_active && <Badge>Active</Badge>}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{godown.address || "No address"}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Ledger</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Godown</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty In</TableHead>
                    <TableHead className="text-right">Qty Out</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockLedger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No stock transactions recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    stockLedger.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.transaction_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-medium">
                          {(entry.stock_item as any)?.name || "-"}
                        </TableCell>
                        <TableCell>{(entry.godown as any)?.name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={entry.quantity_in > 0 ? "default" : "destructive"}>
                            {entry.quantity_in > 0 ? "IN" : "OUT"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {entry.quantity_in > 0 ? `+${entry.quantity_in}` : "-"}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {entry.quantity_out > 0 ? `-${entry.quantity_out}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.rate || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.value || 0)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="valuation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Valuation Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Avg. Rate</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No stock items to value
                      </TableCell>
                    </TableRow>
                  ) : (
                    stockItems.map((item) => {
                      const avgRate = item.current_quantity > 0 
                        ? (item.current_value || 0) / item.current_quantity 
                        : 0;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {item.valuation_method?.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.current_quantity} pcs</TableCell>
                          <TableCell className="text-right">{formatCurrency(avgRate)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.current_value || 0)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                  {stockItems.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={4}>Total Stock Value</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalValue)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
