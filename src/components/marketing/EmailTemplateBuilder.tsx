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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Mail, Search, Edit, Trash2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  category: string | null;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export function EmailTemplateBuilder() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    category: "",
    html_content: "",
    text_content: "",
  });

  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*").order("name");
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("email_templates").insert({
        name: data.name,
        subject: data.subject,
        category: data.category || null,
        html_content: data.html_content,
        text_content: data.text_content || null,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Template created successfully");
    },
    onError: () => toast.error("Failed to create template"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("email_templates")
        .update({
          name: data.name,
          subject: data.subject,
          category: data.category || null,
          html_content: data.html_content,
          text_content: data.text_content || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      setIsDialogOpen(false);
      setSelectedTemplate(null);
      resetForm();
      toast.success("Template updated successfully");
    },
    onError: () => toast.error("Failed to update template"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template deleted successfully");
    },
    onError: () => toast.error("Failed to delete template"),
  });

  const resetForm = () => {
    setFormData({ name: "", subject: "", category: "", html_content: "", text_content: "" });
  };

  const openEditDialog = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      category: template.category || "",
      html_content: template.html_content,
      text_content: template.text_content || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTemplate) {
      updateMutation.mutate({ id: selectedTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredTemplates = templates.filter(
    (t) => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = ["Welcome", "Follow-up", "Newsletter", "Promotional", "Transactional", "Notification"];

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
          <h2 className="text-2xl font-bold">Email Templates</h2>
          <p className="text-muted-foreground">Create and manage email templates</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setSelectedTemplate(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTemplate ? "Edit Template" : "Create Email Template"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subject Line *</Label>
                <Input value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="Use {{variable}} for personalization" required />
              </div>
              <div className="space-y-2">
                <Label>HTML Content *</Label>
                <Textarea value={formData.html_content} onChange={(e) => setFormData({ ...formData, html_content: e.target.value })} rows={12} placeholder="<html>...</html>" className="font-mono text-sm" required />
              </div>
              <div className="space-y-2">
                <Label>Plain Text Content</Label>
                <Textarea value={formData.text_content} onChange={(e) => setFormData({ ...formData, text_content: e.target.value })} rows={6} placeholder="Plain text version for email clients that don't support HTML" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {selectedTemplate ? "Update Template" : "Create Template"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search templates..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No email templates found</p>
            <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-1">{template.subject}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(template)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(template.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{template.category || "Uncategorized"}</Badge>
                  <span className="text-sm text-muted-foreground">{template.usage_count} uses</span>
                </div>
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground line-clamp-3 font-mono">
                    {template.html_content.replace(/<[^>]*>/g, "").substring(0, 150)}...
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Badge variant={template.is_active ? "default" : "secondary"}>{template.is_active ? "Active" : "Inactive"}</Badge>
                  <Button variant="ghost" size="sm" className="ml-auto"><Copy className="h-3 w-3 mr-1" />Clone</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
