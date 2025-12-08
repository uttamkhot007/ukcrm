import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { User, Clock, Edit3 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AuditInfoProps {
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  className?: string;
  compact?: boolean;
}

export function AuditInfo({ 
  createdAt, 
  updatedAt, 
  createdBy, 
  updatedBy,
  className = "",
  compact = false
}: AuditInfoProps) {
  // Fetch user names for created_by and updated_by
  const { data: creatorProfile } = useQuery({
    queryKey: ["profile", createdBy],
    queryFn: async () => {
      if (!createdBy) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", createdBy)
        .maybeSingle();
      return data;
    },
    enabled: !!createdBy,
    staleTime: 5 * 60 * 1000,
  });

  const { data: updaterProfile } = useQuery({
    queryKey: ["profile", updatedBy],
    queryFn: async () => {
      if (!updatedBy) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", updatedBy)
        .maybeSingle();
      return data;
    },
    enabled: !!updatedBy && updatedBy !== createdBy,
    staleTime: 5 * 60 * 1000,
  });

  const creatorName = creatorProfile?.full_name || creatorProfile?.email || "Unknown";
  const updaterName = updatedBy === createdBy 
    ? creatorName 
    : (updaterProfile?.full_name || updaterProfile?.email || "Unknown");

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "MMM d, yyyy 'at' h:mm a");
  };

  const formatRelative = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  if (!createdAt && !updatedAt) return null;

  if (compact) {
    return (
      <div className={`text-xs text-muted-foreground space-y-1 ${className}`}>
        {createdAt && createdBy && (
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3" />
            <span>Created by {creatorName} {formatRelative(createdAt)}</span>
          </div>
        )}
        {updatedAt && updatedBy && updatedAt !== createdAt && (
          <div className="flex items-center gap-1.5">
            <Edit3 className="h-3 w-3" />
            <span>Updated by {updaterName} {formatRelative(updatedAt)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-border/50 bg-muted/30 p-3 ${className}`}>
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Record Information
      </h4>
      <div className="space-y-3">
        {createdAt && (
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Created by {createdBy ? creatorName : "System"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(createdAt)} ({formatRelative(createdAt)})
              </p>
            </div>
          </div>
        )}
        
        {updatedAt && updatedAt !== createdAt && (
          <>
            <Separator className="my-2" />
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-amber-500/10 shrink-0">
                <Edit3 className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Last updated by {updatedBy ? updaterName : "System"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(updatedAt)} ({formatRelative(updatedAt)})
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
