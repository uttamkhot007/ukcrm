import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, History } from "lucide-react";
import { format } from "date-fns";

export function AssetAssignmentHistory() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["asset-assignments", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("asset_assignments")
        .select(`
          *,
          asset:assets(name, asset_number)
        `)
        .order("assigned_at", { ascending: false })
        .limit(100);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email");
      if (error) throw error;
      return data;
    },
  });

  const getProfileName = (userId: string) => {
    const profile = profiles?.find((p) => p.user_id === userId);
    return profile?.full_name || profile?.email || "Unknown";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Assigned By</TableHead>
              <TableHead>Assigned Date</TableHead>
              <TableHead>Returned Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading assignment history...
                </TableCell>
              </TableRow>
            ) : assignments?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <History className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    No assignment history found
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              assignments?.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{assignment.asset?.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {assignment.asset?.asset_number}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getProfileName(assignment.assigned_to)}</TableCell>
                  <TableCell>{getProfileName(assignment.assigned_by)}</TableCell>
                  <TableCell>
                    {format(new Date(assignment.assigned_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {assignment.returned_at
                      ? format(new Date(assignment.returned_at), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {assignment.returned_at ? (
                      <Badge variant="outline">Returned</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
