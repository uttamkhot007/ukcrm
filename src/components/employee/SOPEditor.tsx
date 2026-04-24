import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RichTextEditor } from "./RichTextEditor";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Save, 
  Send, 
  X, 
  Upload, 
  History, 
  Image as ImageIcon,
  FileText,
  Clock,
  User
} from "lucide-react";

interface SOPEditorProps {
  sopId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SOPVersion {
  id: string;
  version_number: number;
  content: string;
  change_notes: string | null;
  created_by: string;
  created_at: string;
}

const categories = ["general", "hr", "it", "finance", "sales", "operations", "security"];

export function SOPEditor({ sopId, open, onOpenChange }: SOPEditorProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [content, setContent] = useState("");
  const [changeNotes, setChangeNotes] = useState("");
  const [activeTab, setActiveTab] = useState("editor");

  // Fetch SOP data if editing
  const { data: sop, isLoading: sopLoading } = useQuery({
    queryKey: ['sop', sopId],
    queryFn: async () => {
      if (!sopId) return null;
      const { data, error } = await supabase
        .from('sops')
        .select('*')
        .eq('id', sopId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sopId && open,
  });

  // Fetch latest version content
  const { data: latestVersion } = useQuery({
    queryKey: ['sop-latest-version', sopId],
    queryFn: async () => {
      if (!sopId) return null;
      const { data, error } = await supabase
        .from('sop_versions')
        .select('*')
        .eq('sop_id', sopId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!sopId && open,
  });

  // Fetch version history
  const { data: versions } = useQuery({
    queryKey: ['sop-versions', sopId],
    queryFn: async () => {
      if (!sopId) return [];
      const { data, error } = await supabase
        .from('sop_versions')
        .select('*')
        .eq('sop_id', sopId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data as SOPVersion[];
    },
    enabled: !!sopId && open,
  });

  // Initialize form when SOP data loads
  useState(() => {
    if (sop) {
      setTitle(sop.title);
      setDescription(sop.description || "");
      setCategory(sop.category);
    }
    if (latestVersion) {
      setContent(latestVersion.content);
    }
  });

  // Update form when data changes
  if (sop && title !== sop.title && !title) {
    setTitle(sop.title);
    setDescription(sop.description || "");
    setCategory(sop.category);
  }
  if (latestVersion && !content) {
    setContent(latestVersion.content);
  }

  // Create SOP mutation
  const createMutation = useMutation({
    mutationFn: async (status: 'draft' | 'published') => {
      if (!user) throw new Error("Not authenticated");
      
      // Create SOP
      const { data: newSop, error: sopError } = await supabase
        .from('sops')
        .insert({
          title,
          description,
          category,
          status,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (sopError) throw sopError;
      
      // Create initial version
      const { error: versionError } = await supabase
        .from('sop_versions')
        .insert({
          sop_id: newSop.id,
          version_number: 1,
          content,
          change_notes: "Initial version",
          created_by: user.id,
        });
      
      if (versionError) throw versionError;
      
      return newSop;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sops'] });
      toast.success("SOP created successfully");
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create SOP: " + error.message);
    },
  });

  // Update SOP mutation
  const updateMutation = useMutation({
    mutationFn: async (status: 'draft' | 'published') => {
      if (!user || !sopId) throw new Error("Not authenticated or no SOP ID");
      
      // Update SOP
      const newVersion = (sop?.current_version || 1) + 1;
      const { error: sopError } = await supabase
        .from('sops')
        .update({
          title,
          description,
          category,
          status,
          current_version: newVersion,
        })
        .eq('id', sopId);
      
      if (sopError) throw sopError;
      
      // Create new version
      const { error: versionError } = await supabase
        .from('sop_versions')
        .insert({
          sop_id: sopId,
          version_number: newVersion,
          content,
          change_notes: changeNotes || null,
          created_by: user.id,
        });
      
      if (versionError) throw versionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sops'] });
      queryClient.invalidateQueries({ queryKey: ['sop', sopId] });
      queryClient.invalidateQueries({ queryKey: ['sop-versions', sopId] });
      toast.success("SOP updated successfully");
      setChangeNotes("");
    },
    onError: (error) => {
      toast.error("Failed to update SOP: " + error.message);
    },
  });

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('sop-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('sop-images')
        .getPublicUrl(fileName);

      // Insert image markdown into content
      setContent(prev => prev + `\n<img src="${publicUrl}" alt="${file.name}" />\n`);
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload image: " + error.message);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("general");
    setContent("");
    setChangeNotes("");
  };

  const loadVersion = (version: SOPVersion) => {
    setContent(version.content);
    setActiveTab("editor");
    toast.info(`Loaded version ${version.version_number}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {sopId ? "Edit SOP" : "Create New SOP"}
            {sop && (
              <Badge variant="outline" className="ml-2">
                v{sop.current_version}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Editor
            </TabsTrigger>
            {sopId && (
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Version History
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="editor" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter SOP title..."
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Short Description</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description..."
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Content</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  onImageUpload={() => fileInputRef.current?.click()}
                />
              </div>

              {sopId && (
                <div>
                  <Label htmlFor="changeNotes">Version Notes (Optional)</Label>
                  <Textarea
                    id="changeNotes"
                    value={changeNotes}
                    onChange={(e) => setChangeNotes(e.target.value)}
                    placeholder="Describe what changed in this version..."
                    rows={2}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-auto mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {versions?.map((version) => (
                  <Card key={version.id} className="cursor-pointer hover:border-primary/50" onClick={() => loadVersion(version)}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Badge variant="outline">v{version.version_number}</Badge>
                          {version.change_notes || "No notes"}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {format(new Date(version.created_at), "MMM d, yyyy HH:mm")}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
                {(!versions || versions.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No version history available
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => (sopId ? updateMutation : createMutation).mutate('draft')}
            disabled={!title || !content || createMutation.isPending || updateMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={() => (sopId ? updateMutation : createMutation).mutate('published')}
            disabled={!title || !content || createMutation.isPending || updateMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}