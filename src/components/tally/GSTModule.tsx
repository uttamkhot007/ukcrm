import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt } from "lucide-react";

export function GSTModule() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="h-6 w-6" />
          GST Module
        </h2>
        <p className="text-muted-foreground">GSTR-1, GSTR-3B, HSN codes, and tax reports</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">GST compliance features including GSTR-1, GSTR-3B, e-Way bills, and TDS/TCS will be available here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
