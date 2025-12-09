import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, MapPin, Users, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Territory {
  id: string;
  name: string;
  description: string | null;
  region: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
}

interface TerritoryAssignment {
  id: string;
  territory_id: string;
  user_id: string;
  is_primary: boolean;
}

export function TerritoryManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", region: "", country: "" });

  const queryClient = useQueryClient();

  const { data: territories = [], isLoading } = useQuery({
    queryKey: ["sales-territories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales_territories").select("*").order("name");
      if (error) throw error;
      return data as Territory[];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["territory-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("territory_assignments").select("*");
      if (error) throw error;
      return data as TerritoryAssignment[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("sales_territories").insert({
        name: data.name,
        description: data.description || null,
        region: data.region || null,
        country: data.country || null,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-territories"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Territory created successfully");
    },
    onError: () => toast.error("Failed to create territory"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("sales_territories")
        .update({
          name: data.name,
          description: data.description || null,
          region: data.region || null,
          country: data.country || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-territories"] });
      setIsDialogOpen(false);
      setEditingTerritory(null);
      resetForm();
      toast.success("Territory updated successfully");
    },
    onError: () => toast.error("Failed to update territory"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales_territories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-territories"] });
      toast.success("Territory deleted successfully");
    },
    onError: () => toast.error("Failed to delete territory"),
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", region: "", country: "" });
  };

  const openEditDialog = (territory: Territory) => {
    setEditingTerritory(territory);
    setFormData({
      name: territory.name,
      description: territory.description || "",
      region: territory.region || "",
      country: territory.country || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTerritory) {
      updateMutation.mutate({ id: editingTerritory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getAssignedUsers = (territoryId: string) => {
    return assignments.filter((a) => a.territory_id === territoryId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Territory Management</h2>
          <p className="text-muted-foreground">Manage sales territories and assignments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingTerritory(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Territory</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTerritory ? "Edit Territory" : "Add New Territory"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Territory Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Input value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} placeholder="e.g., North America" />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} placeholder="e.g., USA" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingTerritory ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {territories.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No territories defined yet</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Create Territory
              </Button>
            </CardContent>
          </Card>
        ) : (
          territories.map((territory) => {
            const assigned = getAssignedUsers(territory.id);
            return (
              <Card key={territory.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {territory.name}
                    </CardTitle>
                    {(territory.region || territory.country) && (
                      <p className="text-sm text-muted-foreground">
                        {[territory.region, territory.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(territory)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(territory.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {territory.description && <p className="text-sm text-muted-foreground mb-3">{territory.description}</p>}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{assigned.length} assigned</span>
                    <Badge variant={territory.is_active ? "default" : "secondary"} className="ml-auto">
                      {territory.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {assigned.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {assigned.slice(0, 3).map((a) => (
                        <div key={a.id} className="text-sm flex items-center gap-2">
                          <span>User assigned</span>
                          {a.is_primary && <Badge variant="outline" className="text-xs">Primary</Badge>}
                        </div>
                      ))}
                      {assigned.length > 3 && <p className="text-xs text-muted-foreground">+{assigned.length - 3} more</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
