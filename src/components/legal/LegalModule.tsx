import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  FileText,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Upload,
  Filter,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type LegalDocumentType = "contract" | "nda" | "agreement" | "policy" | "compliance";
type LegalDocumentStatus = "draft" | "pending_review" | "approved" | "rejected" | "revision_needed";

interface LegalDocument {
  id: string;
  title: string;
  description: string | null;
  type: LegalDocumentType;
  status: LegalDocumentStatus;
  file_url: string | null;
  file_name: string | null;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

interface Comment {
  id: string;
  document_id: string;
  user_id: string;
  comment: string;
  comment_type: string;
  created_at: string;
  user_name?: string;
}

const getStatusBadge = (status: LegalDocumentStatus) => {
  const config = {
    draft: { label: "Draft", variant: "secondary" as const, icon: FileText },
    pending_review: { label: "Pending Review", variant: "outline" as const, icon: Clock },
    approved: { label: "Approved", variant: "default" as const, icon: CheckCircle },
    rejected: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
    revision_needed: { label: "Revision Needed", variant: "outline" as const, icon: MessageSquare },
  };
  const { label, variant, icon: Icon } = config[status];
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

const getTypeBadge = (type: LegalDocumentType) => {
  const colors = {
    contract: "bg-blue-500/10 text-blue-500",
    nda: "bg-purple-500/10 text-purple-500",
    agreement: "bg-green-500/10 text-green-500",
    policy: "bg-orange-500/10 text-orange-500",
    compliance: "bg-red-500/10 text-red-500",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${colors[type]}`}>
      {type.replace("_", " ")}
    </span>
  );
};

export function LegalModule() {
  const { user, isAdmin, isManager } = useAuth();
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for new document
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocType, setNewDocType] = useState<LegalDocumentType>("contract");
  const [newDocDescription, setNewDocDescription] = useState("");

  const canApprove = isAdmin || isManager;

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const { data: docs, error } = await supabase
        .from("legal_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch creator names from profiles
      const userIds = [...new Set(docs?.map(d => d.created_by) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name || p.email || "Unknown"]));

      const documentsWithNames = docs?.map(doc => ({
        ...doc,
        creator_name: profileMap.get(doc.created_by) || "Unknown",
      })) || [];

      setDocuments(documentsWithNames);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async (documentId: string) => {
    try {
      const { data: commentsData, error } = await supabase
        .from("legal_document_comments")
        .select("*")
        .eq("document_id", documentId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch user names from profiles
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name || p.email || "Unknown"]));

      const commentsWithNames = commentsData?.map(comment => ({
        ...comment,
        user_name: profileMap.get(comment.user_id) || "Unknown",
      })) || [];

      setComments(commentsWithNames);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleCreateDocument = async () => {
    if (!user || !newDocTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase.from("legal_documents").insert({
        title: newDocTitle,
        type: newDocType,
        description: newDocDescription || null,
        created_by: user.id,
        status: "draft",
      });

      if (error) throw error;

      toast.success("Document created successfully");
      setIsAddDialogOpen(false);
      setNewDocTitle("");
      setNewDocType("contract");
      setNewDocDescription("");
      fetchDocuments();
    } catch (error: any) {
      console.error("Error creating document:", error);
      toast.error("Failed to create document");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!user || !selectedDocument || !newComment.trim()) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase.from("legal_document_comments").insert({
        document_id: selectedDocument.id,
        user_id: user.id,
        comment: newComment,
        comment_type: "comment",
      });

      if (error) throw error;

      toast.success("Comment added");
      setNewComment("");
      fetchComments(selectedDocument.id);
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (documentId: string, newStatus: LegalDocumentStatus) => {
    try {
      const { error: updateError } = await supabase
        .from("legal_documents")
        .update({ status: newStatus })
        .eq("id", documentId);

      if (updateError) throw updateError;

      // Log the approval action
      if (canApprove && user) {
        const action = newStatus === "approved" ? "approved" : 
                       newStatus === "rejected" ? "rejected" : "revision_requested";
        
        await supabase.from("legal_document_approvals").insert({
          document_id: documentId,
          user_id: user.id,
          action,
        });
      }

      toast.success(`Document ${newStatus.replace("_", " ")}`);
      fetchDocuments();
      if (selectedDocument?.id === documentId) {
        setSelectedDocument({ ...selectedDocument, status: newStatus });
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Failed to update document status");
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const { error } = await supabase
        .from("legal_documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;

      toast.success("Document deleted");
      fetchDocuments();
      if (selectedDocument?.id === documentId) {
        setIsDetailSheetOpen(false);
        setSelectedDocument(null);
      }
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const openDocumentDetails = async (doc: LegalDocument) => {
    setSelectedDocument(doc);
    setIsDetailSheetOpen(true);
    await fetchComments(doc.id);
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const matchesType = typeFilter === "all" || doc.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: documents.length,
    pending: documents.filter((d) => d.status === "pending_review").length,
    approved: documents.filter((d) => d.status === "approved").length,
    needsRevision: documents.filter((d) => d.status === "revision_needed").length,
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Legal Documents</h1>
          <p className="text-muted-foreground">Manage, review, and approve legal documents</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Legal Document</DialogTitle>
              <DialogDescription>Add a new document for review</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Document Title *</label>
                <Input 
                  placeholder="Enter document title" 
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Document Type</label>
                <Select value={newDocType} onValueChange={(v) => setNewDocType(v as LegalDocumentType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="nda">NDA</SelectItem>
                    <SelectItem value="agreement">Agreement</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea 
                  placeholder="Brief description of the document" 
                  value={newDocDescription}
                  onChange={(e) => setNewDocDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateDocument} disabled={isSubmitting || !newDocTitle.trim()}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Document
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <MessageSquare className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.needsRevision}</p>
                <p className="text-sm text-muted-foreground">Needs Revision</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="revision_needed">Revision Needed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="nda">NDA</SelectItem>
                <SelectItem value="agreement">Agreement</SelectItem>
                <SelectItem value="policy">Policy</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No documents found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          {doc.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {doc.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(doc.type)}</TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>{doc.creator_name}</TableCell>
                    <TableCell>{format(new Date(doc.updated_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => openDocumentDetails(doc)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canApprove && doc.status === "pending_review" && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-green-500 hover:text-green-600"
                              onClick={() => handleUpdateStatus(doc.id, "approved")}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-orange-500 hover:text-orange-600"
                              onClick={() => handleUpdateStatus(doc.id, "revision_needed")}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => handleUpdateStatus(doc.id, "rejected")}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Document Detail Sheet */}
      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          {selectedDocument && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedDocument.title}</SheetTitle>
                <SheetDescription>
                  {getTypeBadge(selectedDocument.type)}
                  <span className="ml-2">{getStatusBadge(selectedDocument.status)}</span>
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {selectedDocument.description && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedDocument.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created by</span>
                    <p className="font-medium">{selectedDocument.creator_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created</span>
                    <p className="font-medium">
                      {format(new Date(selectedDocument.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                {/* Status Actions */}
                {selectedDocument.status === "draft" && selectedDocument.created_by === user?.id && (
                  <Button 
                    className="w-full"
                    onClick={() => handleUpdateStatus(selectedDocument.id, "pending_review")}
                  >
                    Submit for Review
                  </Button>
                )}

                {canApprove && selectedDocument.status === "pending_review" && (
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1"
                      onClick={() => handleUpdateStatus(selectedDocument.id, "approved")}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleUpdateStatus(selectedDocument.id, "revision_needed")}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Request Changes
                    </Button>
                  </div>
                )}

                {/* Comments Section */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Comments & Suggestions</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No comments yet</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              {comment.user_name || "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.created_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm">{comment.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Input
                      placeholder="Add a comment or suggestion..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                    />
                    <Button 
                      size="icon" 
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || isSubmitting}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
