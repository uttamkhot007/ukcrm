import { Card, CardContent } from "@/components/ui/card";
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
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No reconciliation data</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Bank reconciliation with statement import, cheque clearing, and reconciliation reports will be available once bank accounts are configured.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
