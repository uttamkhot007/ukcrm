import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Mail, Phone, Building, Briefcase, Calendar, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type DealStage = Database["public"]["Enums"]["deal_stage"];
type LeadStatus = Database["public"]["Enums"]["lead_status"];

interface ContactDetailsSheetProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const stageLabels: Record<DealStage, string> = {
  pipeline: "Pipeline",
  upside: "Upside",
  strong_upside: "Strong Upside",
  commit: "Commit",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const statusLabels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  unqualified: "Unqualified",
  converted: "Converted",
};

export function ContactDetailsSheet({ contact, open, onOpenChange }: ContactDetailsSheetProps) {
  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ["contact-deals", contact?.id],
    queryFn: async () => {
      if (!contact) return [];
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!contact,
  });

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["contact-leads", contact?.id],
    queryFn: async () => {
      if (!contact) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!contact,
  });

  if (!contact) return null;

  const totalDealValue = deals?.reduce((sum, d) => sum + Number(d.value), 0) || 0;
  const totalLeadValue = leads?.reduce((sum, l) => sum + Number(l.estimated_value || 0), 0) || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {contact.name}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-4">
          <div className="space-y-6">
            {/* Contact Info */}
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Information</h3>
              <div className="space-y-2">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${contact.phone}`} className="hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span>{contact.company}</span>
                  </div>
                )}
                {contact.designation && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span>{contact.designation}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Added {format(new Date(contact.created_at), "MMM d, yyyy")}</span>
                </div>
              </div>
              {contact.notes && (
                <>
                  <Separator />
                  <p className="text-sm text-muted-foreground">{contact.notes}</p>
                </>
              )}
            </Card>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-primary/20">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Deal Value</p>
                    <p className="font-semibold">${totalDealValue.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-blue-500/20">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lead Value</p>
                    <p className="font-semibold">${totalLeadValue.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Deals */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Deals ({deals?.length || 0})
              </h3>
              {dealsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : deals?.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No deals associated with this contact.</p>
              ) : (
                <div className="space-y-2">
                  {deals?.map((deal) => (
                    <Card key={deal.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{deal.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ${Number(deal.value).toLocaleString()} • {deal.probability}% probability
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {stageLabels[deal.stage]}
                        </Badge>
                      </div>
                      {deal.expected_close_date && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Expected close: {format(new Date(deal.expected_close_date), "MMM d, yyyy")}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Leads */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Leads ({leads?.length || 0})
              </h3>
              {leadsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : leads?.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No leads associated with this contact.</p>
              ) : (
                <div className="space-y-2">
                  {leads?.map((lead) => (
                    <Card key={lead.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{lead.title}</p>
                          {lead.estimated_value && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Est. ${Number(lead.estimated_value).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {statusLabels[lead.status]}
                        </Badge>
                      </div>
                      {lead.source && (
                        <p className="text-xs text-muted-foreground mt-2">Source: {lead.source}</p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
