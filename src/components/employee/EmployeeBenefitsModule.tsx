import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  Gift, 
  Shield, 
  TrendingUp, 
  Download,
  Calendar,
  FileText,
  Award,
  Inbox
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const EmptyState = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
  <Card>
    <CardContent className="p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
    </CardContent>
  </Card>
);

export function EmployeeBenefitsModule() {
  const [activeTab, setActiveTab] = useState("salary");
  const { profile } = useAuth();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Compensation & Benefits</h1>
        <p className="text-muted-foreground">
          View your salary, bonuses, insurance, and incentives
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="salary" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Salary
          </TabsTrigger>
          <TabsTrigger value="bonus" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Bonus
          </TabsTrigger>
          <TabsTrigger value="insurance" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Insurance
          </TabsTrigger>
          <TabsTrigger value="incentives" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Incentives
          </TabsTrigger>
        </TabsList>

        <TabsContent value="salary" className="space-y-6">
          <EmptyState 
            icon={DollarSign}
            title="Salary details not configured"
            description="Your salary breakdown will appear here once payroll is set up by your HR team."
          />
        </TabsContent>

        <TabsContent value="bonus" className="space-y-6">
          <EmptyState 
            icon={Gift}
            title="No bonus records yet"
            description="Your bonus history will be displayed here as they are processed."
          />
        </TabsContent>

        <TabsContent value="insurance" className="space-y-6">
          <EmptyState 
            icon={Shield}
            title="No insurance policies linked"
            description="Health, life, and accident insurance details will appear once configured by HR."
          />
        </TabsContent>

        <TabsContent value="incentives" className="space-y-6">
          <EmptyState 
            icon={TrendingUp}
            title="No incentive records yet"
            description="Performance-based incentives and rewards will appear here as they are approved."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
