import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface NewTenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NewTenderDialog({ open, onOpenChange, onSuccess }: NewTenderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    organization_name: '',
    source: 'portal',
    estimated_value: '',
    emd_amount: '',
    submission_deadline: '',
    tender_portal_url: '',
    category: '',
    description: '',
    eligibility_criteria: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
  });
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      
      const insertData: any = {
        title: formData.title,
        organization_name: formData.organization_name,
        source: formData.source,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : 0,
        emd_amount: formData.emd_amount ? parseFloat(formData.emd_amount) : 0,
        submission_deadline: formData.submission_deadline || null,
        tender_portal_url: formData.tender_portal_url || null,
        category: formData.category || null,
        description: formData.description || null,
        eligibility_criteria: formData.eligibility_criteria || null,
        contact_person: formData.contact_person || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        created_by: user.id,
        tenant_id: currentTenant?.id,
        status: 'identified',
      };

      const { error } = await supabase.from('tenders').insert(insertData);
      if (error) throw error;

      toast.success('Tender created successfully');
      onSuccess();
      onOpenChange(false);
      setFormData({
        title: '',
        organization_name: '',
        source: 'portal',
        estimated_value: '',
        emd_amount: '',
        submission_deadline: '',
        tender_portal_url: '',
        category: '',
        description: '',
        eligibility_criteria: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
      });
    } catch (error) {
      console.error('Error creating tender:', error);
      toast.error('Failed to create tender');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Tender</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Tender Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="organization_name">Organization Name</Label>
              <Input
                id="organization_name"
                value={formData.organization_name}
                onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="source">Source</Label>
              <Select 
                value={formData.source} 
                onValueChange={(v) => setFormData({ ...formData, source: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="psu">PSU</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="portal">Portal</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="estimated_value">Estimated Value (₹)</Label>
              <Input
                id="estimated_value"
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="emd_amount">EMD Amount (₹)</Label>
              <Input
                id="emd_amount"
                type="number"
                value={formData.emd_amount}
                onChange={(e) => setFormData({ ...formData, emd_amount: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="submission_deadline">Submission Deadline</Label>
              <Input
                id="submission_deadline"
                type="datetime-local"
                value={formData.submission_deadline}
                onChange={(e) => setFormData({ ...formData, submission_deadline: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., IT Services, Equipment"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="tender_portal_url">Tender Portal URL</Label>
              <Input
                id="tender_portal_url"
                type="url"
                value={formData.tender_portal_url}
                onChange={(e) => setFormData({ ...formData, tender_portal_url: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="eligibility_criteria">Eligibility Criteria</Label>
              <Textarea
                id="eligibility_criteria"
                value={formData.eligibility_criteria}
                onChange={(e) => setFormData({ ...formData, eligibility_criteria: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Tender'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
