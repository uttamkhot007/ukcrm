import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calculator, 
  IndianRupee, 
  Info,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export function BonusCalculator() {
  const [monthlyBasic, setMonthlyBasic] = useState<number>(25000);
  const [monthlyDA, setMonthlyDA] = useState<number>(5000);
  const [allocableSurplus, setAllocableSurplus] = useState<number>(1000000);
  const [numberOfEmployees, setNumberOfEmployees] = useState<number>(50);
  const [daysWorked, setDaysWorked] = useState<number>(300);

  const calculation = useMemo(() => {
    // Wage ceiling for bonus calculation
    const wageCeiling = 21000;
    const minWage = 7000; // If actual wage is less, calculate on this

    // Calculate effective wage for bonus
    const actualWage = monthlyBasic + monthlyDA;
    const effectiveWage = Math.min(Math.max(actualWage, minWage), wageCeiling);

    // Minimum and Maximum bonus percentages
    const minBonusPercent = 8.33;
    const maxBonusPercent = 20;

    // Minimum bonus (8.33% = 1/12 of annual wages)
    const annualEffectiveWage = effectiveWage * 12;
    const minimumBonus = (annualEffectiveWage * minBonusPercent) / 100;
    
    // Maximum bonus (20% of annual wages)
    const maximumBonus = (annualEffectiveWage * maxBonusPercent) / 100;

    // Eligibility check (worked at least 30 days)
    const isEligible = daysWorked >= 30;

    // Pro-rata calculation if not worked full year
    const proRataFactor = daysWorked / 365;
    const proRataMinBonus = minimumBonus * proRataFactor;
    const proRataMaxBonus = maximumBonus * proRataFactor;

    // Company allocable surplus per employee (simplified)
    const surplusPerEmployee = numberOfEmployees > 0 ? allocableSurplus / numberOfEmployees : 0;
    
    // Actual bonus = MIN(Max Bonus, Available Surplus per employee)
    // but not less than minimum bonus
    let actualBonus = Math.max(Math.min(surplusPerEmployee, proRataMaxBonus), proRataMinBonus);

    // Salary ceiling check (Bonus Act doesn't apply if salary > ₹21,000)
    const isCoveredUnderAct = actualWage <= wageCeiling;

    return {
      actualWage,
      effectiveWage,
      annualEffectiveWage,
      minimumBonus,
      maximumBonus,
      proRataMinBonus,
      proRataMaxBonus,
      actualBonus,
      isEligible,
      isCoveredUnderAct,
      proRataFactor,
      surplusPerEmployee
    };
  }, [monthlyBasic, monthlyDA, allocableSurplus, numberOfEmployees, daysWorked]);

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
          Statutory Bonus Calculator
        </CardTitle>
        <CardDescription>
          Calculate bonus under Payment of Bonus Act, 1965
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Monthly Basic (₹)</Label>
            <Input
              type="number"
              value={monthlyBasic}
              onChange={(e) => setMonthlyBasic(Number(e.target.value))}
              placeholder="25000"
            />
          </div>
          <div className="space-y-2">
            <Label>Monthly DA (₹)</Label>
            <Input
              type="number"
              value={monthlyDA}
              onChange={(e) => setMonthlyDA(Number(e.target.value))}
              placeholder="5000"
            />
          </div>
          <div className="space-y-2">
            <Label>Days Worked in Year</Label>
            <Input
              type="number"
              value={daysWorked}
              onChange={(e) => setDaysWorked(Number(e.target.value))}
              min={0}
              max={365}
            />
          </div>
          <div className="space-y-2">
            <Label>Company Allocable Surplus (₹)</Label>
            <Input
              type="number"
              value={allocableSurplus}
              onChange={(e) => setAllocableSurplus(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Number of Eligible Employees</Label>
            <Input
              type="number"
              value={numberOfEmployees}
              onChange={(e) => setNumberOfEmployees(Number(e.target.value))}
              min={1}
            />
          </div>
        </div>

        {/* Eligibility Alert */}
        {!calculation.isEligible && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Employee must work at least 30 days in the accounting year to be eligible for bonus.
            </AlertDescription>
          </Alert>
        )}

        {!calculation.isCoveredUnderAct && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Salary exceeds ₹21,000/month. Payment of Bonus Act doesn't apply. 
              Any bonus paid is ex-gratia/discretionary.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Calculation Results */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Actual Wage (Basic + DA)</p>
              <p className="font-bold">{formatCurrency(calculation.actualWage)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Effective Wage for Bonus</p>
              <p className="font-bold">{formatCurrency(calculation.effectiveWage)}</p>
              <p className="text-xs text-muted-foreground">(Capped at ₹21,000)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <p className="text-sm text-yellow-600">Minimum Bonus (8.33%)</p>
              <p className="text-xl font-bold text-yellow-700">
                {formatCurrency(calculation.proRataMinBonus)}
              </p>
              {calculation.proRataFactor < 1 && (
                <p className="text-xs text-muted-foreground">
                  Pro-rata for {daysWorked} days
                </p>
              )}
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">Maximum Bonus (20%)</p>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(calculation.proRataMaxBonus)}
              </p>
              {calculation.proRataFactor < 1 && (
                <p className="text-xs text-muted-foreground">
                  Pro-rata for {daysWorked} days
                </p>
              )}
            </div>
          </div>

          {calculation.isEligible && calculation.isCoveredUnderAct && (
            <div className="p-4 bg-primary/10 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Calculated Bonus</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(calculation.actualBonus)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Based on allocable surplus of {formatCurrency(calculation.surplusPerEmployee)} per employee
              </p>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-400">
              <p className="font-medium mb-2">Payment of Bonus Act Key Points:</p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-start gap-1">
                  <CheckCircle2 className="h-3 w-3 mt-0.5" />
                  <span>Applies to employees earning ≤ ₹21,000/month (Basic + DA)</span>
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 className="h-3 w-3 mt-0.5" />
                  <span>Minimum bonus: 8.33% (1/12) of annual wages</span>
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 className="h-3 w-3 mt-0.5" />
                  <span>Maximum bonus: 20% of annual wages</span>
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 className="h-3 w-3 mt-0.5" />
                  <span>Eligibility: Worked at least 30 days in the year</span>
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 className="h-3 w-3 mt-0.5" />
                  <span>Payment deadline: Within 8 months from close of accounting year</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
