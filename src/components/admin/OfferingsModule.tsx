import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Package, Shield, Server, Briefcase } from "lucide-react";

interface Offering {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  category?: string | null;
  service_type?: string | null;
  status: string;
  created_at: string;
  created_by: string;
}

type OfferingType = "solutions" | "offensive_security" | "managed_security" | "professional_services";

const offeringTabs: { value: OfferingType; label: string; icon: React.ElementType; table: string }[] = [
  { value: "solutions", label: "Solutions", icon: Package, table: "offerings_solutions" },
  { value: "offensive_security", label: "Offensive Security Services", icon: Shield, table: "offerings_offensive_security" },
  { value: "managed_security", label: "Managed Security Services", icon: Server, table: "offerings_managed_security" },
  { value: "professional_services", label: "Professional Services", icon: Briefcase, table: "offerings_professional_services" },
];

export function OfferingsModule() {
  const [activeTab, setActiveTab] = useState<OfferingType>("solutions");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Offering | null>(null);
  
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const currentTabConfig = offeringTabs.find(t => t.value === activeTab)!;

  // Fetch offerings for current tab
  const { data: offerings = [], isLoading } = useQuery({
    queryKey: ["offerings", activeTab, currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      let query;
      switch (activeTab) {
        case "solutions":
          query = supabase.from("offerings_solutions").select("*").eq("tenant_id", currentTenant.id).order("name");
          break;
        case "offensive_security":
          query = supabase.from("offerings_offensive_security").select("*").eq("tenant_id", currentTenant.id).order("name");
          break;
        case "managed_security":
          query = supabase.from("offerings_managed_security").select("*").eq("tenant_id", currentTenant.id).order("name");
          break;
        case "professional_services":
          query = supabase.from("offerings_professional_services").select("*").eq("tenant_id", currentTenant.id).order("name");
          break;
        default:
          return [];
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Offering[];
    },
    enabled: !!currentTenant,
  });

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async (itemData: Partial<Offering>) => {
      const updateData: any = {
        name: itemData.name,
        description: itemData.description,
        status: itemData.status,
      };
      if (activeTab === "solutions") {
        updateData.category = itemData.category;
      } else {
        updateData.service_type = itemData.service_type;
      }

      if (editingItem) {
        let updateQuery;
        switch (activeTab) {
          case "solutions":
            updateQuery = supabase.from("offerings_solutions").update(updateData).eq("id", editingItem.id);
            break;
          case "offensive_security":
            updateQuery = supabase.from("offerings_offensive_security").update(updateData).eq("id", editingItem.id);
            break;
          case "managed_security":
            updateQuery = supabase.from("offerings_managed_security").update(updateData).eq("id", editingItem.id);
            break;
          case "professional_services":
            updateQuery = supabase.from("offerings_professional_services").update(updateData).eq("id", editingItem.id);
            break;
        }
        const { error } = await updateQuery!;
        if (error) throw error;
      } else {
        const insertData: any = {
          ...updateData,
          tenant_id: currentTenant?.id,
          created_by: user?.id!,
        };
        let insertQuery;
        switch (activeTab) {
          case "solutions":
            insertQuery = supabase.from("offerings_solutions").insert(insertData);
            break;
          case "offensive_security":
            insertQuery = supabase.from("offerings_offensive_security").insert(insertData);
            break;
          case "managed_security":
            insertQuery = supabase.from("offerings_managed_security").insert(insertData);
            break;
          case "professional_services":
            insertQuery = supabase.from("offerings_professional_services").insert(insertData);
            break;
        }
        const { error } = await insertQuery!;
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offerings", activeTab] });
      setIsDialogOpen(false);
      setEditingItem(null);
      toast.success(editingItem ? "Item updated" : "Item created");
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      let deleteQuery;
      switch (activeTab) {
        case "solutions":
          deleteQuery = supabase.from("offerings_solutions").delete().eq("id", id);
          break;
        case "offensive_security":
          deleteQuery = supabase.from("offerings_offensive_security").delete().eq("id", id);
          break;
        case "managed_security":
          deleteQuery = supabase.from("offerings_managed_security").delete().eq("id", id);
          break;
        case "professional_services":
          deleteQuery = supabase.from("offerings_professional_services").delete().eq("id", id);
          break;
      }
      const { error } = await deleteQuery!;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offerings", activeTab] });
      toast.success("Item deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const filteredOfferings = offerings.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    mutation.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      category: formData.get("category") as string,
      service_type: formData.get("service_type") as string,
      status: formData.get("status") as string,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Offerings Management</h2>
          <p className="text-muted-foreground">Manage your solutions and services catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OfferingType)}>
        <TabsList className="grid w-full grid-cols-4">
          {offeringTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden lg:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {offeringTabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{tab.label} ({filteredOfferings.length})</h3>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) setEditingItem(null);
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add {tab.label.replace(" Services", "")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingItem ? "Edit" : "Add"} {tab.label.replace(" Services", "")}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" name="name" required defaultValue={editingItem?.name} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" defaultValue={editingItem?.description || ""} />
                    </div>
                    {activeTab === "solutions" ? (
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Input id="category" name="category" defaultValue={editingItem?.category || ""} />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="service_type">Service Type</Label>
                        <Input id="service_type" name="service_type" defaultValue={editingItem?.service_type || ""} />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue={editingItem?.status || "active"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>{activeTab === "solutions" ? "Category" : "Service Type"}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : filteredOfferings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No items found</TableCell>
                    </TableRow>
                  ) : (
                    filteredOfferings.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.description || "-"}</TableCell>
                        <TableCell>{activeTab === "solutions" ? item.category : item.service_type || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === "active" ? "default" : "secondary"}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingItem(item);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
