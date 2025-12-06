import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  in_app_enabled: boolean;
  in_app_requests: boolean;
  in_app_approvals: boolean;
  in_app_deals: boolean;
  in_app_tickets: boolean;
  in_app_renewals: boolean;
  in_app_compliance: boolean;
  email_enabled: boolean;
  email_requests: boolean;
  email_approvals: boolean;
  email_deals: boolean;
  email_tickets: boolean;
  email_renewals: boolean;
  email_compliance: boolean;
  created_at: string;
  updated_at: string;
}

const defaultPreferences: Omit<NotificationPreferences, "id" | "user_id" | "created_at" | "updated_at"> = {
  in_app_enabled: true,
  in_app_requests: true,
  in_app_approvals: true,
  in_app_deals: true,
  in_app_tickets: true,
  in_app_renewals: true,
  in_app_compliance: true,
  email_enabled: false,
  email_requests: true,
  email_approvals: true,
  email_deals: true,
  email_tickets: true,
  email_renewals: true,
  email_compliance: true,
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // If no preferences exist, create default ones
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        return newData as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
    enabled: !!user,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("notification_preferences")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as NotificationPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
      toast.success("Preferences saved");
    },
    onError: (error) => {
      console.error("Error updating preferences:", error);
      toast.error("Failed to save preferences");
    },
  });

  return {
    preferences: preferences ?? {
      ...defaultPreferences,
      id: "",
      user_id: user?.id ?? "",
      created_at: "",
      updated_at: "",
    } as NotificationPreferences,
    isLoading,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
}
