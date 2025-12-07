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
  Award
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function EmployeeBenefitsModule() {
  const [activeTab, setActiveTab] = useState("salary");
  const { profile } = useAuth();

  // Mock data - in production, fetch from database
  const salaryData = {
    basicSalary: 85000,
    hra: 25500,
    specialAllowance: 15000,
    pf: 10200,
    tax: 18500,
    netSalary: 96800,
    currency: "INR",
  };

  const bonusData = [
    { id: 1, type: "Annual Bonus", amount: 50000, date: "2024-03-15", status: "paid" },
    { id: 2, type: "Performance Bonus", amount: 25000, date: "2024-06-30", status: "paid" },
    { id: 3, type: "Festive Bonus", amount: 10000, date: "2024-10-15", status: "pending" },
  ];

  const insuranceData = {
    health: {
      provider: "ICICI Lombard",
      coverage: 500000,
      policyNumber: "HL-2024-123456",
      validTill: "2025-03-31",
      members: ["Self", "Spouse", "Child 1"],
    },
    life: {
      provider: "LIC",
      coverage: 2500000,
      policyNumber: "LI-2024-789012",
      validTill: "2025-03-31",
    },
    accident: {
      provider: "HDFC Ergo",
      coverage: 1000000,
      policyNumber: "PA-2024-345678",
      validTill: "2025-03-31",
    },
  };

  const incentiveData = [
    { id: 1, type: "Sales Target Achievement", amount: 15000, month: "October 2024", status: "approved" },
    { id: 2, type: "Project Completion", amount: 20000, month: "September 2024", status: "paid" },
    { id: 3, type: "Referral Bonus", amount: 25000, month: "August 2024", status: "paid" },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: salaryData.currency,
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

        {/* Salary Tab */}
        <TabsContent value="salary" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardHeader className="pb-2">
                <CardDescription>Net Monthly Salary</CardDescription>
                <CardTitle className="text-3xl">{formatCurrency(salaryData.netSalary)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Gross Salary</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(salaryData.basicSalary + salaryData.hra + salaryData.specialAllowance)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Deductions</CardDescription>
                <CardTitle className="text-2xl text-destructive">{formatCurrency(salaryData.pf + salaryData.tax)}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Salary Breakdown
              </CardTitle>
              <CardDescription>Current month salary structure</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">Earnings</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Basic Salary</span>
                      <span className="font-medium">{formatCurrency(salaryData.basicSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>House Rent Allowance (HRA)</span>
                      <span className="font-medium">{formatCurrency(salaryData.hra)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Special Allowance</span>
                      <span className="font-medium">{formatCurrency(salaryData.specialAllowance)}</span>
                    </div>
                  </div>
                </div>
                <div className="border-b pb-4">
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">Deductions</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Provident Fund (PF)</span>
                      <span className="font-medium text-destructive">-{formatCurrency(salaryData.pf)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Income Tax (TDS)</span>
                      <span className="font-medium text-destructive">-{formatCurrency(salaryData.tax)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>Net Payable</span>
                  <span className="text-primary">{formatCurrency(salaryData.netSalary)}</span>
                </div>
              </div>
              <Button variant="outline" className="mt-4 w-full" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Salary Slip
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bonus Tab */}
        <TabsContent value="bonus" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Bonus History
              </CardTitle>
              <CardDescription>Your bonus payments for the current financial year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bonusData.map((bonus) => (
                  <div key={bonus.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{bonus.type}</p>
                        <p className="text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(bonus.date).toLocaleDateString("en-IN", { 
                            day: "numeric", 
                            month: "short", 
                            year: "numeric" 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">{formatCurrency(bonus.amount)}</p>
                      <Badge variant={bonus.status === "paid" ? "default" : "secondary"}>
                        {bonus.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insurance Tab */}
        <TabsContent value="insurance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Shield className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Health Insurance</CardTitle>
                    <CardDescription>{insuranceData.health.provider}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Coverage</span>
                  <span className="font-medium">{formatCurrency(insuranceData.health.coverage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Policy No.</span>
                  <span className="font-medium text-xs">{insuranceData.health.policyNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valid Till</span>
                  <span className="font-medium">{new Date(insuranceData.health.validTill).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Covered Members</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {insuranceData.health.members.map((member) => (
                      <Badge key={member} variant="outline" className="text-xs">{member}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Life Insurance</CardTitle>
                    <CardDescription>{insuranceData.life.provider}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Coverage</span>
                  <span className="font-medium">{formatCurrency(insuranceData.life.coverage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Policy No.</span>
                  <span className="font-medium text-xs">{insuranceData.life.policyNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valid Till</span>
                  <span className="font-medium">{new Date(insuranceData.life.validTill).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Shield className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Personal Accident</CardTitle>
                    <CardDescription>{insuranceData.accident.provider}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Coverage</span>
                  <span className="font-medium">{formatCurrency(insuranceData.accident.coverage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Policy No.</span>
                  <span className="font-medium text-xs">{insuranceData.accident.policyNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valid Till</span>
                  <span className="font-medium">{new Date(insuranceData.accident.validTill).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Incentives Tab */}
        <TabsContent value="incentives" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Incentive History
              </CardTitle>
              <CardDescription>Performance-based incentives and rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {incentiveData.map((incentive) => (
                  <div key={incentive.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">{incentive.type}</p>
                        <p className="text-sm text-muted-foreground">{incentive.month}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">{formatCurrency(incentive.amount)}</p>
                      <Badge 
                        variant={incentive.status === "paid" ? "default" : incentive.status === "approved" ? "secondary" : "outline"}
                      >
                        {incentive.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}