import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Copy, Zap, MessageSquare } from "lucide-react";

const CATEGORIES = [
  "General",
  "Technical Support",
  "Billing",
  "Account",
  "Feature Request",
  "Bug Report",
  "Security",
  "Onboarding",
];

export function CannedResponses() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
    shortcut: "",
  });

  const { data: responses, isLoading } = useQuery({
    queryKey: ["canned-responses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canned_responses")
        .select("*")
        .eq("is_active", true)
        .order("usage_count", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("canned_responses").insert({
        title: data.title,
        content: data.content,
        category: data.category || null,
        shortcut: data.shortcut || null,
        created_by: user!.id,
        tenant_id: currentTenant?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
      resetForm();
      toast.success("Template created");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("canned_responses")
        .update({
          title: data.title,
          content: data.content,
          category: data.category || null,
          shortcut: data.shortcut || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
      resetForm();
      toast.success("Template updated");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("canned_responses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
      toast.success("Template deleted");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const resetForm = () => {
    setIsDialogOpen(false);
    setEditingResponse(null);
    setFormData({ title: "", content: "", category: "", shortcut: "" });
  };

  const handleEdit = (response: any) => {
    setEditingResponse(response);
    setFormData({
      title: response.title,
      content: response.content,
      category: response.category || "",
      shortcut: response.shortcut || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingResponse) {
      updateMutation.mutate({ id: editingResponse.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const copyToClipboard = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
    
    // Increment usage count
    await supabase
      .from("canned_responses")
      .update({ usage_count: (responses?.find(r => r.id === id)?.usage_count || 0) + 1 })
      .eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
  };

  const filteredResponses = responses?.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.content.toLowerCase().includes(search.toLowerCase()) ||
      r.shortcut?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && resetForm()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingResponse ? "Edit Template" : "Create Template"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Password Reset Instructions"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Shortcut</Label>
                  <Input
                    value={formData.shortcut}
                    onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                    placeholder="e.g., #pwdreset"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Content *</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  placeholder="Enter the response template..."
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{{customer_name}}"}, {"{{ticket_number}}"} for dynamic values
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingResponse ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading templates...</div>
      ) : filteredResponses?.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">No templates found</h3>
            <p className="text-sm text-muted-foreground">Create your first canned response to speed up replies</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResponses?.map((response) => (
            <Card key={response.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-1">{response.title}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Copy response" onClick={() => copyToClipboard(response.content, response.id)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit response" onClick={() => handleEdit(response)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" aria-label="Delete response" onClick={() => deleteMutation.mutate(response.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {response.category && <Badge variant="secondary">{response.category}</Badge>}
                  {response.shortcut && (
                    <Badge variant="outline" className="font-mono">
                      <Zap className="w-3 h-3 mr-1" />
                      {response.shortcut}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">{response.content}</p>
                <p className="text-xs text-muted-foreground mt-2">Used {response.usage_count} times</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
