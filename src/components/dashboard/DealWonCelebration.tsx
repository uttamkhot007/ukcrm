import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Trophy, PartyPopper, Star } from "lucide-react";

interface DealWonNotification {
  id: string;
  title: string;
  message: string;
  reference_id: string;
  created_at: string;
}

export function DealWonCelebration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Fetch recent deal won notifications (last 5 minutes, unread)
  const { data: celebrations = [] } = useQuery({
    queryKey: ["deal-won-celebrations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("category", "deal_won")
        .eq("is_read", false)
        .gte("created_at", fiveMinutesAgo)
        .order("created_at", { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data as DealWonNotification[];
    },
    enabled: !!user,
    refetchInterval: 30000, // Check every 30 seconds
  });

  const visibleCelebrations = celebrations.filter(c => !dismissed.has(c.id));

  const handleDismiss = async (notificationId: string) => {
    setDismissed(prev => new Set(prev).add(notificationId));
    
    // Mark as read
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
    
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  if (visibleCelebrations.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-md">
      {visibleCelebrations.map((celebration) => (
        <Card 
          key={celebration.id} 
          className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 border-green-500/30 shadow-xl animate-in slide-in-from-right-5"
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center animate-bounce">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <PartyPopper className="h-4 w-4 text-yellow-500" />
                  <h4 className="font-bold text-green-600 dark:text-green-400">
                    {celebration.title}
                  </h4>
                  <Star className="h-4 w-4 text-yellow-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {celebration.message}
                </p>
                <div className="flex gap-1 mt-2 text-xl">
                  🎉🏆🎊🥳✨🎈
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-6 w-6"
                onClick={() => handleDismiss(celebration.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
