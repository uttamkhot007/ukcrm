import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Search, 
  FileText, 
  ChevronRight, 
  Clock, 
  Plus,
  Edit,
  Trash2,
  Eye,
  History,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { SOPEditor } from "./SOPEditor";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SOP {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  current_version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface SOPVersion {
  id: string;
  version_number: number;
  content: string;
  change_notes: string | null;
  created_by: string;
  created_at: string;
}

const categories = ["All", "general", "hr", "it", "finance", "sales", "operations", "security"];

export function DocumentationModule() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSOP, setSelectedSOP] = useState<SOP | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSopId, setEditingSopId] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sopToDelete, setSopToDelete] = useState<SOP | null>(null);

  const canManageSOPs = role === 'admin' || role === 'manager';

  // Fetch SOPs from database
  const { data: sops = [], isLoading } = useQuery({
    queryKey: ['sops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sops')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as SOP[];
    },
  });

  // Fetch SOP content when viewing
  const { data: sopContent } = useQuery({
    queryKey: ['sop-content', selectedSOP?.id],
    queryFn: async () => {
      if (!selectedSOP) return null;
      const { data, error } = await supabase
        .from('sop_versions')
        .select('*')
        .eq('sop_id', selectedSOP.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as SOPVersion | null;
    },
    enabled: !!selectedSOP,
  });

  // Fetch version history for viewing
  const { data: versionHistory = [] } = useQuery({
    queryKey: ['sop-versions', selectedSOP?.id],
    queryFn: async () => {
      if (!selectedSOP) return [];
      const { data, error } = await supabase
        .from('sop_versions')
        .select('*')
        .eq('sop_id', selectedSOP.id)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data as SOPVersion[];
    },
    enabled: !!selectedSOP,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (sopId: string) => {
      const { error } = await supabase
        .from('sops')
        .delete()
        .eq('id', sopId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sops'] });
      toast.success("SOP deleted successfully");
      setDeleteDialogOpen(false);
      setSopToDelete(null);
    },
    onError: (error) => {
      toast.error("Failed to delete SOP: " + error.message);
    },
  });

  const filteredSOPs = sops.filter(sop => {
    const matchesSearch = sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (sop.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = selectedCategory === "All" || sop.category === selectedCategory;
    const isVisible = sop.status === 'published' || sop.created_by === user?.id || canManageSOPs;
    return matchesSearch && matchesCategory && isVisible;
  });

  const handleEdit = (sop: SOP) => {
    setEditingSopId(sop.id);
    setEditorOpen(true);
  };

  const handleCreateNew = () => {
    setEditingSopId(undefined);
    setEditorOpen(true);
  };

  const handleDelete = (sop: SOP) => {
    setSopToDelete(sop);
    setDeleteDialogOpen(true);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      hr: "bg-purple-500/10 text-purple-500",
      it: "bg-blue-500/10 text-blue-500",
      finance: "bg-green-500/10 text-green-500",
      sales: "bg-orange-500/10 text-orange-500",
      operations: "bg-cyan-500/10 text-cyan-500",
      security: "bg-red-500/10 text-red-500",
      general: "bg-gray-500/10 text-gray-500",
    };
    return colors[category] || colors.general;
  };

  // SOP Detail View
  if (selectedSOP) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="ghost" size="sm" onClick={() => setSelectedSOP(null)}>
            <BookOpen className="w-4 h-4 mr-1" />
            Documentation
          </Button>
          <ChevronRight className="w-4 h-4" />
          <span className="capitalize">{selectedSOP.category}</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">{selectedSOP.title}</span>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{selectedSOP.title}</CardTitle>
                  <CardDescription className="mt-1">{selectedSOP.description}</CardDescription>
                  <div className="flex gap-3 mt-3">
                    <Badge className={getCategoryColor(selectedSOP.category)}>
                      {selectedSOP.category}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <History className="w-3 h-3" />
                      v{selectedSOP.current_version}
                    </Badge>
                    <Badge variant={selectedSOP.status === 'published' ? 'default' : 'secondary'}>
                      {selectedSOP.status}
                    </Badge>
                  </div>
                </div>
              </div>
              {canManageSOPs && (
                <Button variant="outline" onClick={() => handleEdit(selectedSOP)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="content">
              <TabsList>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="versions">Version History ({versionHistory.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="content" className="mt-4">
                {sopContent ? (
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: sopContent.content }}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No content available
                  </div>
                )}
              </TabsContent>

              <TabsContent value="versions" className="mt-4">
                <div className="space-y-3">
                  {versionHistory.map((version) => (
                    <Card key={version.id}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">v{version.version_number}</Badge>
                            <span className="text-sm font-medium">
                              {version.change_notes || "No notes"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(new Date(version.created_at), "MMM d, yyyy HH:mm")}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Documentation & SOPs</h1>
            <p className="text-muted-foreground">Step-by-step guides for common processes and procedures</p>
          </div>
        </div>
        {canManageSOPs && (
          <Button onClick={handleCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            Create SOP
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="flex-wrap">
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-sm capitalize">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSOPs.map(sop => (
            <Card 
              key={sop.id} 
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base line-clamp-2">{sop.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn("text-xs", getCategoryColor(sop.category))}>
                        {sop.category}
                      </Badge>
                      {sop.status === 'draft' && (
                        <Badge variant="secondary" className="text-xs">Draft</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {sop.description || "No description"}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{format(new Date(sop.updated_at), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      v{sop.current_version}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSOP(sop);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  {canManageSOPs && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(sop);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(sop);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredSOPs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg">No documentation found</h3>
            <p className="text-muted-foreground mb-4">
              {sops.length === 0 
                ? "No SOPs have been created yet" 
                : "Try adjusting your search or filter criteria"}
            </p>
            {canManageSOPs && sops.length === 0 && (
              <Button onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                Create First SOP
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* SOP Editor Sheet */}
      <SOPEditor 
        sopId={editingSopId}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SOP</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sopToDelete?.title}"? This action cannot be undone and all version history will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => sopToDelete && deleteMutation.mutate(sopToDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}