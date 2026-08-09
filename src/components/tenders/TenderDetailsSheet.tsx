import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Calendar, Building, Mail, Phone, User, FileText, 
  Upload, ExternalLink, Activity, Users, Clock, 
  CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TenderDetailsSheetProps {
  tender: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function TenderDetailsSheet({ tender, open, onOpenChange, onRefresh }: TenderDetailsSheetProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  useEffect(() => {
    if (tender && open) {
      fetchRelatedData();
    }
  }, [tender, open]);

  const fetchRelatedData = async () => {
    if (!tender) return;

    try {
      const [docsRes, activitiesRes, teamRes] = await Promise.all([
        supabase.from('tender_documents').select('*').eq('tender_id', tender.id),
        supabase.from('tender_activities').select('*').eq('tender_id', tender.id).order('created_at', { ascending: false }),
        supabase.from('tender_team').select('*').eq('tender_id', tender.id),
      ]);

      setDocuments(docsRes.data || []);
      setActivities(activitiesRes.data || []);
      setTeamMembers(teamRes.data || []);
    } catch (error) {
      console.error('Error fetching related data:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!tender || !user) return;

    try {
      setLoading(true);
      const updateData: any = { status: newStatus };
      const { error } = await supabase
        .from('tenders')
        .update(updateData)
        .eq('id', tender.id);

      if (error) throw error;

      // Log activity
      const activityData: any = {
        tender_id: tender.id,
        user_id: user.id,
        activity_type: 'status_change',
        description: `Status changed to ${newStatus}`,
        tenant_id: currentTenant?.id,
      };
      await supabase.from('tender_activities').insert(activityData);

      toast.success('Status updated successfully');
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = e.target.files?.[0];
    if (!file || !tender || !user) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      if (!currentTenant?.id) {
        toast.error('No active workspace selected');
        return;
      }
      const filePath = `${currentTenant.id}/${tender.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('tender-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tender-documents')
        .getPublicUrl(filePath);

      await supabase.from('tender_documents').insert({
        tender_id: tender.id,
        document_type: documentType,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        uploaded_by: user.id,
        tenant_id: currentTenant?.id,
      });

      toast.success('Document uploaded successfully');
      fetchRelatedData();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string }> = {
      identified: { variant: 'outline' },
      evaluating: { variant: 'secondary' },
      bid_preparation: { variant: 'secondary', className: 'bg-blue-100 text-blue-800' },
      submitted: { variant: 'default' },
      under_evaluation: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800' },
      won: { variant: 'default', className: 'bg-green-100 text-green-800' },
      lost: { variant: 'destructive' },
      cancelled: { variant: 'outline' },
    };
    const config = variants[status] || { variant: 'outline' };
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (!tender) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-mono text-muted-foreground">{tender.tender_number}</p>
              <SheetTitle className="text-xl">{tender.title}</SheetTitle>
            </div>
            {getStatusBadge(tender.status)}
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Status Update */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Update Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={tender.status} onValueChange={handleStatusChange} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="identified">Identified</SelectItem>
                    <SelectItem value="evaluating">Evaluating</SelectItem>
                    <SelectItem value="bid_preparation">Bid Preparation</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="under_evaluation">Under Evaluation</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{tender.organization_name || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{tender.source?.toUpperCase()}</Badge>
                  {tender.category && <Badge variant="secondary">{tender.category}</Badge>}
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Estimated Value</p>
                    <p className="font-semibold">₹{((tender.estimated_value || 0) / 100000).toFixed(2)}L</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">EMD Amount</p>
                    <p className="font-semibold">
                      ₹{((tender.emd_amount || 0) / 1000).toFixed(0)}K
                      {tender.emd_submitted && (
                        <CheckCircle className="inline h-4 w-4 text-green-500 ml-1" />
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Important Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tender.publish_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Published: {format(new Date(tender.publish_date), 'dd MMM yyyy')}</span>
                  </div>
                )}
                {tender.submission_deadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span>Deadline: {format(new Date(tender.submission_deadline), 'dd MMM yyyy HH:mm')}</span>
                  </div>
                )}
                {tender.opening_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Opening: {format(new Date(tender.opening_date), 'dd MMM yyyy')}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact */}
            {(tender.contact_person || tender.contact_email || tender.contact_phone) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tender.contact_person && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{tender.contact_person}</span>
                    </div>
                  )}
                  {tender.contact_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${tender.contact_email}`} className="text-primary hover:underline">
                        {tender.contact_email}
                      </a>
                    </div>
                  )}
                  {tender.contact_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{tender.contact_phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {tender.tender_portal_url && (
              <Button variant="outline" className="w-full" asChild>
                <a href={tender.tender_portal_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Tender Portal
                </a>
              </Button>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Upload Document</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {['tender_notice', 'bid_document', 'technical_proposal', 'financial_proposal', 'supporting_docs'].map((type) => (
                    <div key={type}>
                      <Label className="text-xs capitalize">{type.replace('_', ' ')}</Label>
                      <Input
                        type="file"
                        onChange={(e) => handleFileUpload(e, type)}
                        disabled={uploading}
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Uploaded Documents ({documents.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {doc.document_type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        {doc.file_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Bid Team ({teamMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No team members assigned</p>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{member.user_id}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Activity Log ({activities.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity recorded</p>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                        <div>
                          <p>{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(activity.created_at), 'dd MMM yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
