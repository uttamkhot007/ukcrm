import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { format } from "date-fns";

interface LegalDocument {
  id: string;
  title: string;
  type: "contract" | "nda" | "agreement" | "policy" | "compliance";
  status: "draft" | "pending_review" | "approved" | "rejected" | "revision_needed";
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  assignedTo?: string;
  comments: Comment[];
}

interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: Date;
  type: "comment" | "suggestion" | "approval" | "rejection";
}

// Mock data
const mockDocuments: LegalDocument[] = [
  {
    id: "1",
    title: "Vendor Service Agreement - TechCorp",
    type: "contract",
    status: "pending_review",
    createdBy: "John Smith",
    createdAt: new Date("2024-01-15"),
    lastModified: new Date("2024-01-20"),
    assignedTo: "Legal Team",
    comments: [
      { id: "c1", author: "Jane Doe", text: "Please review clause 4.2", createdAt: new Date("2024-01-18"), type: "suggestion" },
    ],
  },
  {
    id: "2",
    title: "Employee NDA Template",
    type: "nda",
    status: "approved",
    createdBy: "HR Team",
    createdAt: new Date("2024-01-10"),
    lastModified: new Date("2024-01-12"),
    assignedTo: "Legal Head",
    comments: [],
  },
  {
    id: "3",
    title: "Data Privacy Policy v2.0",
    type: "policy",
    status: "revision_needed",
    createdBy: "Compliance Team",
    createdAt: new Date("2024-01-05"),
    lastModified: new Date("2024-01-19"),
    assignedTo: "Legal Team",
    comments: [
      { id: "c2", author: "Legal Head", text: "Need to update GDPR section", createdAt: new Date("2024-01-19"), type: "suggestion" },
    ],
  },
  {
    id: "4",
    title: "Partner Agreement - CloudSoft",
    type: "agreement",
    status: "draft",
    createdBy: "Sales Team",
    createdAt: new Date("2024-01-22"),
    lastModified: new Date("2024-01-22"),
    comments: [],
  },
];

const getStatusBadge = (status: LegalDocument["status"]) => {
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

const getTypeBadge = (type: LegalDocument["type"]) => {
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
  const [documents, setDocuments] = useState<LegalDocument[]>(mockDocuments);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);

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
              <DialogTitle>Upload Legal Document</DialogTitle>
              <DialogDescription>Upload a new document for review</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Document Title</label>
                <Input placeholder="Enter document title" />
              </div>
              <div>
                <label className="text-sm font-medium">Document Type</label>
                <Select>
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
                <Textarea placeholder="Brief description of the document" />
              </div>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Drag and drop or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or DOC up to 10MB</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>Upload Document</Button>
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
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        {doc.comments.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {doc.comments.length} comment{doc.comments.length > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(doc.type)}</TableCell>
                  <TableCell>{getStatusBadge(doc.status)}</TableCell>
                  <TableCell>{doc.createdBy}</TableCell>
                  <TableCell>{format(doc.lastModified, "MMM d, yyyy")}</TableCell>
                  <TableCell>{doc.assignedTo || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="w-4 h-4" />
                      </Button>
                      {doc.status === "pending_review" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:text-green-600">
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
