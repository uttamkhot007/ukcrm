import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { RevalidationBar, RevalidationBadge } from "@/components/shared/RevalidationIndicator";
import { Plus, Search, Edit, Trash2, Package, Loader2, UserPlus } from "lucide-react";
import { QuickAddLeadDialog } from "./QuickAddLeadDialog";


import { toast } from "sonner";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  unit_price: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export function ProductCatalog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [leadForProduct, setLeadForProduct] = useState<Product | null>(null);
  const [quickLeadOpen, setQuickLeadOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    category: "",
    unit_price: "",
    currency: "USD",
  });

  const queryClient = useQueryClient();
  const { formatCurrency } = useOrganizationSettings();

  const { data: products = [], isLoading, isFetching } = useQuery({
    queryKey: ["product-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_catalog")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    placeholderData: (prev: Product[] | undefined) => prev,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("product_catalog").insert({
        name: data.name,
        sku: data.sku || null,
        description: data.description || null,
        category: data.category || null,
        unit_price: parseFloat(data.unit_price) || 0,
        currency: data.currency,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-catalog"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Product created successfully");
    },
    onError: () => toast.error("Failed to create product"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("product_catalog")
        .update({
          name: data.name,
          sku: data.sku || null,
          description: data.description || null,
          category: data.category || null,
          unit_price: parseFloat(data.unit_price) || 0,
          currency: data.currency,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-catalog"] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      resetForm();
      toast.success("Product updated successfully");
    },
    onError: () => toast.error("Failed to update product"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_catalog").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-catalog"] });
      toast.success("Product deleted successfully");
    },
    onError: () => toast.error("Failed to delete product"),
  });

  const resetForm = () => {
    setFormData({ name: "", sku: "", description: "", category: "", unit_price: "", currency: "USD" });
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || "",
      description: product.description || "",
      category: product.category || "",
      unit_price: product.unit_price.toString(),
      currency: product.currency,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = ["Software", "Hardware", "Services", "Support", "Training", "Consulting"];

  const isRevalidating = isFetching && !isLoading;

  if (isLoading) {
    return (
      <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading product catalog">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="rounded-lg border border-border">
          <div className="border-b border-border p-4">
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">Loading product catalog…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RevalidationBar active={isRevalidating} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Product Catalog
            <RevalidationBadge active={isRevalidating} label="Refreshing catalog…" />
          </h2>
          <p className="text-muted-foreground">Manage your products and services</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingProduct(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit Price</Label>
                  <Input type="number" step="0.01" value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingProduct ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No products found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.description && <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{product.sku || "-"}</TableCell>
                    <TableCell><Badge variant="outline">{product.category || "Uncategorized"}</Badge></TableCell>
                    <TableCell>{formatCurrency(product.unit_price, product.currency)}</TableCell>
                    <TableCell><Badge variant={product.is_active ? "default" : "secondary"}>{product.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setLeadForProduct(product); setQuickLeadOpen(true); }}
                          title={`Add lead for ${product.name}`}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Add lead
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(product.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
