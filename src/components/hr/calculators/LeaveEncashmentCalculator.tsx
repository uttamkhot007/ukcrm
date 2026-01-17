import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  IndianRupee, 
  Info,
  CheckCircle2
} from "lucide-react";

export function LeaveEncashmentCalculator() {
  const [monthlyBasic, setMonthlyBasic] = useState<number>(50000);
  const [monthlyDA, setMonthlyDA] = useState<number>(10000);
  const [leavesAccrued, setLeavesAccrued] = useState<number>(45);
  const [yearsOfService, setYearsOfService] = useState<number>(10);
  const [encashmentType, setEncashmentType] = useState<"retirement" | "resignation" | "annual">("retirement");

  const calculation = useMemo(() => {
    const dailyWage = (monthlyBasic + monthlyDA) / 30;
    const encashmentAmount = dailyWage * leavesAccrued;

    // Tax exemption calculation
    // For retirement/death:
    // Exempt amount = LEAST of:
    // 1. Actual leave encashment received
    // 2. 10 months average salary
    // 3. Cash equivalent of leave for max 30 days per year of service
    // 4. ₹25,00,000 (limit as per latest amendment)

    let taxExemption = 0;
    let taxableAmount = 0;

    if (encashmentType === "retirement") {
      const tenMonthsSalary = (monthlyBasic + monthlyDA) * 10;
      const maxDays = yearsOfService * 30;
      const maxDaysValue = dailyWage * maxDays;
      const maxExemption = 2500000; // ₹25 lakhs

      const exemptAmounts = [
        encashmentAmount,
        tenMonthsSalary,
        maxDaysValue,
        maxExemption
      ];

      taxExemption = Math.min(...exemptAmounts);
      taxableAmount = Math.max(0, encashmentAmount - taxExemption);
    } else if (encashmentType === "resignation") {
      // Fully taxable as salary income
      taxExemption = 0;
      taxableAmount = encashmentAmount;
    } else {
      // Annual encashment - fully taxable
      taxExemption = 0;
      taxableAmount = encashmentAmount;
    }

    return {
      dailyWage,
      encashmentAmount,
      taxExemption,
      taxableAmount,
      maxDays: yearsOfService * 30
    };
  }, [monthlyBasic, monthlyDA, leavesAccrued, yearsOfService, encashmentType]);

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
          Leave Encashment Calculator
        </CardTitle>
        <CardDescription>
          Calculate leave encashment and tax implications
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
            />
          </div>
          <div className="space-y-2">
            <Label>Monthly DA (₹)</Label>
            <Input
              type="number"
              value={monthlyDA}
              onChange={(e) => setMonthlyDA(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Leaves to Encash (Days)</Label>
            <Input
              type="number"
              value={leavesAccrued}
              onChange={(e) => setLeavesAccrued(Number(e.target.value))}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label>Years of Service</Label>
            <Input
              type="number"
              value={yearsOfService}
              onChange={(e) => setYearsOfService(Number(e.target.value))}
              min={0}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Encashment Type</Label>
          <RadioGroup 
            value={encashmentType} 
            onValueChange={(v) => setEncashmentType(v as "retirement" | "resignation" | "annual")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="retirement" id="retirement" />
              <Label htmlFor="retirement" className="font-normal">
                Retirement / Superannuation / VRS
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="resignation" id="resignation" />
              <Label htmlFor="resignation" className="font-normal">
                Resignation
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="annual" id="annual" />
              <Label htmlFor="annual" className="font-normal">
                Annual Encashment (during service)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Results */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Daily Wage</p>
              <p className="font-bold">{formatCurrency(calculation.dailyWage)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Max Exempt Days</p>
              <p className="font-bold">{calculation.maxDays} days</p>
              <p className="text-xs text-muted-foreground">(30 days × {yearsOfService} years)</p>
            </div>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Leave Encashment Amount</span>
              <span className="text-xl font-bold text-green-700">
                {formatCurrency(calculation.encashmentAmount)}
              </span>
            </div>
          </div>

          {encashmentType === "retirement" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm text-blue-600">Tax Exempt</p>
                <p className="text-xl font-bold text-blue-700">
                  {formatCurrency(calculation.taxExemption)}
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <p className="text-sm text-red-600">Taxable Amount</p>
                <p className="text-xl font-bold text-red-700">
                  {formatCurrency(calculation.taxableAmount)}
                </p>
              </div>
            </div>
          )}

          {(encashmentType === "resignation" || encashmentType === "annual") && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium text-red-700">Fully Taxable as Salary</span>
                <span className="text-xl font-bold text-red-700">
                  {formatCurrency(calculation.encashmentAmount)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-400">
              <p className="font-medium mb-2">Tax Treatment:</p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-start gap-1">
                  <CheckCircle2 className="h-3 w-3 mt-0.5" />
                  <span><strong>Retirement:</strong> Exempt up to ₹25 lakhs (least of 4 conditions)</span>
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 className="h-3 w-3 mt-0.5" />
                  <span><strong>Resignation:</strong> Fully taxable as salary</span>
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 className="h-3 w-3 mt-0.5" />
                  <span><strong>Annual:</strong> Fully taxable as perquisite</span>
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 className="h-3 w-3 mt-0.5" />
                  <span><strong>Govt Employees:</strong> Fully exempt on retirement</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
