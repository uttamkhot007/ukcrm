import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  FileText, Search, Check, X, User, 
  Filter, Loader2, ExternalLink 
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmployeeDocument {
  id: string;
  user_id: string;
  document_type: string;
  title: string;
  description?: string;
  file_name?: string;
  file_url?: string;
  is_verified: boolean;
  verified_at?: string;
  created_at: string;
  user?: {
    full_name: string;
    employee_code: string;
  };
}

export function EmployeeDocumentsView() {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("all");

  const { data: documents, isLoading } = useQuery({
    queryKey: ['hr-employee-documents', currentTenant?.id, docTypeFilter],
    queryFn: async () => {
      if (!currentTenant?.id) return [];

      let query = supabase
        .from('employee_documents')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (docTypeFilter !== 'all') {
        query = query.eq('document_type', docTypeFilter);
      }

      const { data: docs, error } = await query;
      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(docs?.map(d => d.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, employee_code')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return docs?.map(doc => ({
        ...doc,
        user: profileMap.get(doc.user_id)
      })) as EmployeeDocument[];
    },
    enabled: !!currentTenant?.id
  });

  const verifyDocument = useMutation({
    mutationFn: async ({ docId, verified }: { docId: string; verified: boolean }) => {
      const { error } = await supabase
        .from('employee_documents')
        .update({
          is_verified: verified,
          verified_at: verified ? new Date().toISOString() : null
        })
        .eq('id', docId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-employee-documents'] });
      toast.success("Document verification status updated");
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    }
  });

  const filteredDocuments = documents?.filter(doc => {
    const searchLower = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(searchLower) ||
      doc.user?.full_name?.toLowerCase().includes(searchLower) ||
      doc.user?.employee_code?.toLowerCase().includes(searchLower) ||
      doc.file_name?.toLowerCase().includes(searchLower)
    );
  });

  const getDocTypeColor = (type: string) => {
    switch (type) {
      case 'cv': return 'bg-blue-500';
      case 'certificate': return 'bg-green-500';
      case 'id_proof': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'cv': return 'Resume/CV';
      case 'certificate': return 'Certificate';
      case 'id_proof': return 'ID Proof';
      default: return 'Other';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Employee Documents</h2>
          <p className="text-muted-foreground text-sm">
            View and verify employee CVs, certificates, and documents
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by employee name, code, or document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            <SelectItem value="cv">Resume/CV</SelectItem>
            <SelectItem value="certificate">Certificates</SelectItem>
            <SelectItem value="id_proof">ID Proofs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredDocuments && filteredDocuments.length > 0 ? (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{doc.user?.full_name || 'Unknown'}</p>
                        {doc.user?.employee_code && (
                          <Badge variant="outline">{doc.user.employee_code}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getDocTypeColor(doc.document_type)}>
                          {getDocTypeLabel(doc.document_type)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {doc.title} • {doc.file_name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.is_verified ? (
                      <Badge variant="default" className="bg-green-500">
                        <Check className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => verifyDocument.mutate({ docId: doc.id, verified: true })}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => verifyDocument.mutate({ docId: doc.id, verified: false })}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {doc.file_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No documents found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}