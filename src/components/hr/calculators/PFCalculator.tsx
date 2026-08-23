import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calculator, 
  IndianRupee, 
  Info,
  TrendingUp
} from "lucide-react";

export function PFCalculator() {
  const [basicDA, setBasicDA] = useState<number>(30000);
  const [isPFOnFullSalary, setIsPFOnFullSalary] = useState(false);
  const [age, setAge] = useState<number>(30);
  const [currentPFBalance, setCurrentPFBalance] = useState<number>(500000);
  const [expectedReturnRate, setExpectedReturnRate] = useState<number>(8.1);

  const monthlyCalculation = useMemo(() => {
    const pfWage = isPFOnFullSalary ? basicDA : Math.min(basicDA, 15000);
    
    // Employee contribution - 12%
    const employeeContribution = pfWage * 0.12;
    
    // Employer contributions
    const employerEPF = pfWage * 0.0367; // 3.67% to EPF
    const employerEPS = Math.min(pfWage, 15000) * 0.0833; // 8.33% to EPS (max on 15000)
    const employerTotal = employerEPF + employerEPS;
    
    // Total going to EPF account
    const totalEPF = employeeContribution + employerEPF;
    
    // Admin charges (paid by employer, not from EPF)
    const adminCharges = pfWage * 0.005; // 0.5%
    const edliCharges = pfWage * 0.005; // 0.5% EDLI
    
    return {
      pfWage,
      employeeContribution,
      employerEPF,
      employerEPS,
      employerTotal,
      totalEPF,
      adminCharges,
      edliCharges,
      totalMonthlyToEPF: totalEPF,
      totalMonthlyToEPS: employerEPS
    };
  }, [basicDA, isPFOnFullSalary]);

  const projectedCorpus = useMemo(() => {
    const yearsToRetirement = 58 - age;
    if (yearsToRetirement <= 0) return { corpus: currentPFBalance, totalContribution: 0, interestEarned: 0 };

    const monthlyContribution = monthlyCalculation.totalMonthlyToEPF;
    const monthlyRate = expectedReturnRate / 100 / 12;
    const totalMonths = yearsToRetirement * 12;

    // Future value calculation with compound interest
    // FV = PV(1+r)^n + PMT × [(1+r)^n - 1] / r
    const existingBalanceFV = currentPFBalance * Math.pow(1 + expectedReturnRate / 100, yearsToRetirement);
    const futureContributions = monthlyContribution * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate);
    
    const totalCorpus = existingBalanceFV + futureContributions;
    const totalContribution = currentPFBalance + (monthlyContribution * totalMonths);
    const interestEarned = totalCorpus - totalContribution;

    return {
      corpus: totalCorpus,
      totalContribution,
      interestEarned,
      yearsToRetirement
    };
  }, [age, currentPFBalance, expectedReturnRate, monthlyCalculation.totalMonthlyToEPF]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          PF & ESI Calculator
        </CardTitle>
        <CardDescription>
          Calculate EPF/EPS contributions and project retirement corpus
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="monthly">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Monthly Contribution</TabsTrigger>
            <TabsTrigger value="projection">Retirement Projection</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="space-y-6 mt-4">
            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="basicDA">Basic + DA (Monthly)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="basicDA"
                    type="number"
                    value={basicDA}
                    onChange={(e) => setBasicDA(Number(e.target.value))}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="pfFull" className="text-sm font-medium">PF on Full Basic</Label>
                  <p className="text-xs text-muted-foreground">Statutory limit is ₹15,000</p>
                </div>
                <Switch id="pfFull" checked={isPFOnFullSalary} onCheckedChange={setIsPFOnFullSalary} />
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p><strong>PF Wage considered:</strong> {formatCurrency(monthlyCalculation.pfWage)}</p>
            </div>

            {/* Contribution Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Employee */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Employee Contribution</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                    <span>EPF (12%)</span>
                    <span className="font-medium">{formatCurrency(monthlyCalculation.employeeContribution)}</span>
                  </div>
                  <div className="flex justify-between text-sm p-2 bg-primary/10 rounded font-medium">
                    <span>Total Employee</span>
                    <span>{formatCurrency(monthlyCalculation.employeeContribution)}</span>
                  </div>
                </div>
              </div>

              {/* Employer */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Employer Contribution</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                    <span>EPF (3.67%)</span>
                    <span className="font-medium">{formatCurrency(monthlyCalculation.employerEPF)}</span>
                  </div>
                  <div className="flex justify-between text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                    <span>EPS Pension (8.33%)</span>
                    <span className="font-medium">{formatCurrency(monthlyCalculation.employerEPS)}</span>
                  </div>
                  <div className="flex justify-between text-sm p-2 bg-primary/10 rounded font-medium">
                    <span>Total Employer</span>
                    <span>{formatCurrency(monthlyCalculation.employerTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-center">
                <p className="text-sm text-blue-600">Monthly to EPF Account</p>
                <p className="text-xl font-bold text-blue-700">{formatCurrency(monthlyCalculation.totalMonthlyToEPF)}</p>
                <p className="text-xs text-muted-foreground mt-1">(Employee + Employer EPF)</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
                <p className="text-sm text-green-700 dark:text-green-400">Monthly to EPS</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(monthlyCalculation.totalMonthlyToEPS)}</p>
                <p className="text-xs text-muted-foreground mt-1">(Pension Fund)</p>
              </div>
            </div>

            {/* Annual Summary */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Annual Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Employee Annual</p>
                  <p className="font-bold">{formatCurrency(monthlyCalculation.employeeContribution * 12)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Employer Annual</p>
                  <p className="font-bold">{formatCurrency(monthlyCalculation.employerTotal * 12)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total to EPF</p>
                  <p className="font-bold">{formatCurrency(monthlyCalculation.totalMonthlyToEPF * 12)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total to EPS</p>
                  <p className="font-bold">{formatCurrency(monthlyCalculation.totalMonthlyToEPS * 12)}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="projection" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Current Age</Label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  min={18}
                  max={57}
                />
              </div>
              <div className="space-y-2">
                <Label>Current PF Balance</Label>
                <Input
                  type="number"
                  value={currentPFBalance}
                  onChange={(e) => setCurrentPFBalance(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Expected Return (%)</Label>
                <Input
                  type="number"
                  value={expectedReturnRate}
                  onChange={(e) => setExpectedReturnRate(Number(e.target.value))}
                  step={0.1}
                />
              </div>
              <div className="space-y-2">
                <Label>Retirement Age</Label>
                <Input type="number" value={58} disabled />
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h4 className="font-semibold">Projected Retirement Corpus at Age 58</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Estimated Corpus</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(projectedCorpus.corpus)}</p>
                </div>
                <div className="text-center p-4 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Contribution</p>
                  <p className="text-xl font-bold">{formatCurrency(projectedCorpus.totalContribution)}</p>
                </div>
                <div className="text-center p-4 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Interest Earned</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">{formatCurrency(projectedCorpus.interestEarned)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                *Assuming consistent monthly contribution of {formatCurrency(monthlyCalculation.totalMonthlyToEPF)} for {projectedCorpus.yearsToRetirement} years
              </p>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500" />
                <div className="text-sm text-blue-700 dark:text-blue-400">
                  <p className="font-medium mb-1">Notes:</p>
                  <ul className="text-xs space-y-1">
                    <li>• Current EPF interest rate (2023-24): 8.15%</li>
                    <li>• EPF is tax-free on withdrawal if tenure &gt; 5 years</li>
                    <li>• Projection assumes no salary increments (actual corpus will be higher)</li>
                    <li>• EPS pension is additional benefit on retirement</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
