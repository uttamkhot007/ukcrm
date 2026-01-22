import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export function BankReconciliation() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Bank Reconciliation
        </h2>
        <p className="text-muted-foreground">Match bank statements with book entries</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Bank reconciliation with statement import, cheque clearing, and reconciliation reports will be available here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
