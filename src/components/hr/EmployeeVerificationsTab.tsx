import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Shield,
  GraduationCap,
  FileWarning,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Sparkles,
  Loader2,
  Download,
  Eye,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

interface EmployeeVerificationsTabProps {
  employee: any;
}

const VERIFICATION_TYPES = [
  {
    id: "background",
    label: "Background Verification",
    icon: Shield,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    documents: ["ID Proof", "Address Proof", "Previous Employment Letter", "Reference Letter"],
  },
  {
    id: "crime",
    label: "Crime Record Verification",
    icon: FileWarning,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    documents: ["Police Clearance Certificate", "Court Records", "Background Check Report"],
  },
  {
    id: "education",
    label: "Education Verification",
    icon: GraduationCap,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    documents: ["Degree Certificate", "Mark Sheet", "Diploma", "Course Completion Certificate"],
  },
];

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-500/20 text-yellow-700" },
  in_progress: { label: "In Progress", icon: Loader2, color: "bg-blue-500/20 text-blue-700" },
  verified: { label: "Verified", icon: CheckCircle2, color: "bg-green-500/20 text-green-700" },
  failed: { label: "Failed", icon: XCircle, color: "bg-red-500/20 text-red-700" },
  requires_review: { label: "Needs Review", icon: AlertTriangle, color: "bg-orange-500/20 text-orange-700" },
};

export function EmployeeVerificationsTab({ employee }: EmployeeVerificationsTabProps) {
  const [activeTab, setActiveTab] = useState("background");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: verifications = [], isLoading } = useQuery({
    queryKey: ["employee-verifications", employee.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_verifications")
        .select("*")
        .eq("user_id", employee.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["verification-documents", employee.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_documents")
        .select("*")
        .eq("user_id", employee.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createVerificationMutation = useMutation({
    mutationFn: async (type: string) => {
      const { data: profile } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("employee_verifications")
        .insert({
          user_id: employee.id,
          verification_type: type,
          status: "pending",
          tenant_id: employee.tenant_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-verifications", employee.id] });
      toast.success("Verification initiated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create verification");
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, documentType, verificationId }: { file: File; documentType: string; verificationId?: string }) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `${employee.id}/${activeTab}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("verification-documents")
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from("verification_documents")
        .insert({
          user_id: employee.id,
          verification_id: verificationId,
          document_type: documentType,
          file_name: file.name,
          file_url: filePath,
          file_size: file.size,
          mime_type: file.type,
          tenant_id: employee.tenant_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification-documents", employee.id] });
      toast.success("Document uploaded successfully");
      setUploadingType(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to upload document");
      setUploadingType(null);
    },
  });

  const analyzeDocumentMutation = useMutation({
    mutationFn: async ({ documentId, verificationType }: { documentId: string; verificationType: string }) => {
      const doc = documents.find((d: any) => d.id === documentId);
      if (!doc) throw new Error("Document not found");

      // For demo, we'll simulate extracted text - in production, use OCR
      const extractedText = `Document: ${doc.file_name}\nType: ${doc.document_type}\nEmployee: ${employee.full_name}`;

      const { data, error } = await supabase.functions.invoke("verify-document", {
        body: {
          documentType: doc.document_type,
          verificationType,
          extractedText,
          employeeName: employee.full_name,
          employeeData: {
            name: employee.full_name,
            email: employee.email,
            department: employee.department,
            hire_date: employee.hire_date,
          },
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Update document with AI analysis
      await supabase
        .from("verification_documents")
        .update({ ai_extracted_data: data.analysis })
        .eq("id", documentId);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["verification-documents", employee.id] });
      toast.success("AI analysis complete");
    },
    onError: (error: any) => {
      toast.error(error.message || "AI analysis failed");
    },
  });

  const updateVerificationMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data: profile } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("employee_verifications")
        .update({
          status,
          notes,
          verification_date: status === "verified" ? new Date().toISOString() : null,
          verified_by: status === "verified" ? profile?.user?.id : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-verifications", employee.id] });
      toast.success("Verification updated");
    },
  });

  const handleFileUpload = (documentType: string, verificationId?: string) => {
    setUploadingType(documentType);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingType) return;

    const verification = verifications.find((v: any) => v.verification_type === activeTab);
    uploadDocumentMutation.mutate({
      file,
      documentType: uploadingType,
      verificationId: verification?.id,
    });

    e.target.value = "";
  };

  const getVerificationForType = (type: string) => verifications.find((v: any) => v.verification_type === type);
  const getDocumentsForType = (type: string) => documents.filter((d: any) => {
    const verification = getVerificationForType(type);
    return d.verification_id === verification?.id || 
           VERIFICATION_TYPES.find(t => t.id === type)?.documents.includes(d.document_type);
  });

  const getOverallProgress = () => {
    const total = VERIFICATION_TYPES.length;
    const completed = VERIFICATION_TYPES.filter(t => {
      const v = getVerificationForType(t.id);
      return v?.status === "verified";
    }).length;
    return (completed / total) * 100;
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={handleFileChange}
      />

      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Verification Progress</CardTitle>
          <CardDescription>Overall employee verification status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {VERIFICATION_TYPES.filter(t => getVerificationForType(t.id)?.status === "verified").length} of {VERIFICATION_TYPES.length} verifications complete
              </span>
              <span className="font-medium">{Math.round(getOverallProgress())}%</span>
            </div>
            <Progress value={getOverallProgress()} className="h-2" />
            <div className="flex gap-2 flex-wrap">
              {VERIFICATION_TYPES.map((type) => {
                const verification = getVerificationForType(type.id);
                const status = verification?.status || "pending";
                const StatusIcon = STATUS_CONFIG[status]?.icon || Clock;
                return (
                  <Badge
                    key={type.id}
                    variant="secondary"
                    className={`${STATUS_CONFIG[status]?.color} gap-1`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {type.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          {VERIFICATION_TYPES.map((type) => {
            const Icon = type.icon;
            const verification = getVerificationForType(type.id);
            return (
              <TabsTrigger key={type.id} value={type.id} className="gap-2">
                <Icon className={`w-4 h-4 ${type.color}`} />
                <span className="hidden sm:inline">{type.label.split(" ")[0]}</span>
                {verification?.status === "verified" && (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {VERIFICATION_TYPES.map((type) => {
          const Icon = type.icon;
          const verification = getVerificationForType(type.id);
          const typeDocs = getDocumentsForType(type.id);

          return (
            <TabsContent key={type.id} value={type.id} className="space-y-4 mt-4">
              {/* Verification Status Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${type.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${type.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{type.label}</CardTitle>
                        <CardDescription>
                          {verification ? `Status: ${STATUS_CONFIG[verification.status]?.label}` : "Not initiated"}
                        </CardDescription>
                      </div>
                    </div>
                    {!verification && (
                      <Button
                        onClick={() => createVerificationMutation.mutate(type.id)}
                        disabled={createVerificationMutation.isPending}
                      >
                        Start Verification
                      </Button>
                    )}
                    {verification && verification.status !== "verified" && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateVerificationMutation.mutate({ 
                            id: verification.id, 
                            status: "requires_review" 
                          })}
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Needs Review
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateVerificationMutation.mutate({ 
                            id: verification.id, 
                            status: "verified" 
                          })}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Mark Verified
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                {verification?.ai_analysis && (
                  <CardContent>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">AI Analysis Summary</span>
                      </div>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {JSON.stringify(verification.ai_analysis, null, 2)}
                      </pre>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Document Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Required Documents</CardTitle>
                  <CardDescription>Upload documents for {type.label.toLowerCase()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {type.documents.map((docType) => {
                      const uploadedDoc = typeDocs.find((d: any) => d.document_type === docType);
                      return (
                        <div
                          key={docType}
                          className={`border rounded-lg p-4 ${uploadedDoc ? "border-green-500/50 bg-green-500/5" : "border-dashed"}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className={`w-5 h-5 ${uploadedDoc ? "text-green-500" : "text-muted-foreground"}`} />
                              <div>
                                <p className="font-medium text-sm">{docType}</p>
                                {uploadedDoc && (
                                  <p className="text-xs text-muted-foreground">
                                    {uploadedDoc.file_name} • {format(new Date(uploadedDoc.created_at), "PP")}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {uploadedDoc ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => analyzeDocumentMutation.mutate({
                                      documentId: uploadedDoc.id,
                                      verificationType: type.id,
                                    })}
                                    disabled={analyzeDocumentMutation.isPending}
                                  >
                                    <Sparkles className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleFileUpload(docType, verification?.id)}
                                  disabled={uploadDocumentMutation.isPending && uploadingType === docType}
                                >
                                  {uploadDocumentMutation.isPending && uploadingType === docType ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Upload className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                          {uploadedDoc?.ai_extracted_data && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex items-center gap-1 text-xs text-primary mb-1">
                                <Sparkles className="w-3 h-3" />
                                AI Analysis
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Status: {(uploadedDoc.ai_extracted_data as any)?.status || "Analyzed"}
                                {(uploadedDoc.ai_extracted_data as any)?.confidence_score && (
                                  <> • Confidence: {(uploadedDoc.ai_extracted_data as any).confidence_score}%</>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Uploaded Documents List */}
              {typeDocs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Uploaded Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {typeDocs.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{doc.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.document_type} • {format(new Date(doc.created_at), "PPp")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.is_verified && (
                              <Badge variant="secondary" className="bg-green-500/20 text-green-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => analyzeDocumentMutation.mutate({
                                documentId: doc.id,
                                verificationType: type.id,
                              })}
                              disabled={analyzeDocumentMutation.isPending}
                            >
                              <Sparkles className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
