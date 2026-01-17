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
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export function GratuityCalculator() {
  const [lastBasicDA, setLastBasicDA] = useState<number>(50000);
  const [yearsOfService, setYearsOfService] = useState<number>(10);
  const [monthsOfService, setMonthsOfService] = useState<number>(0);
  const [employeeType, setEmployeeType] = useState<"covered" | "notCovered">("covered");

  const calculation = useMemo(() => {
    // Total years (including fractional from months)
    let totalYears = yearsOfService;
    if (monthsOfService >= 6) {
      totalYears += 1; // Round up if 6+ months
    }

    // Gratuity formula
    // For employees covered under Payment of Gratuity Act:
    // Gratuity = (Last Basic + DA) × 15 × Years of Service / 26
    
    // For employees NOT covered:
    // Gratuity = (Last Basic + DA) × 15 × Years of Service / 30

    let gratuityAmount: number;
    let formula: string;
    let divisor: number;

    if (employeeType === "covered") {
      divisor = 26;
      gratuityAmount = (lastBasicDA * 15 * totalYears) / divisor;
      formula = `(₹${lastBasicDA.toLocaleString()} × 15 × ${totalYears}) / 26`;
    } else {
      divisor = 30;
      gratuityAmount = (lastBasicDA * 15 * totalYears) / divisor;
      formula = `(₹${lastBasicDA.toLocaleString()} × 15 × ${totalYears}) / 30`;
    }

    // Maximum gratuity limit
    const maxGratuity = 2000000; // ₹20 lakhs
    const isMaxCapped = gratuityAmount > maxGratuity;
    const finalGratuity = Math.min(gratuityAmount, maxGratuity);

    // Tax exemption
    // Gratuity is exempt up to ₹20 lakhs under Section 10(10) of Income Tax Act
    const taxableAmount = Math.max(0, gratuityAmount - maxGratuity);

    return {
      calculatedGratuity: gratuityAmount,
      finalGratuity,
      isMaxCapped,
      taxableAmount,
      formula,
      totalYears,
      divisor
    };
  }, [lastBasicDA, yearsOfService, monthsOfService, employeeType]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const isEligible = yearsOfService >= 5 || (yearsOfService === 4 && monthsOfService >= 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Gratuity Calculator
        </CardTitle>
        <CardDescription>
          Calculate gratuity under Payment of Gratuity Act, 1972
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="basicDA">Last Drawn Basic + DA (Monthly)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="basicDA"
                type="number"
                value={lastBasicDA}
                onChange={(e) => setLastBasicDA(Number(e.target.value))}
                className="pl-9"
                placeholder="50000"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="years">Years of Service</Label>
              <Input
                id="years"
                type="number"
                value={yearsOfService}
                onChange={(e) => setYearsOfService(Number(e.target.value))}
                min={0}
                max={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="months">Months</Label>
              <Input
                id="months"
                type="number"
                value={monthsOfService}
                onChange={(e) => setMonthsOfService(Number(e.target.value))}
                min={0}
                max={11}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Employee Category</Label>
          <RadioGroup value={employeeType} onValueChange={(v) => setEmployeeType(v as "covered" | "notCovered")}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="covered" id="covered" />
              <Label htmlFor="covered" className="font-normal">
                Covered under Gratuity Act (Most private sector employees)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="notCovered" id="notCovered" />
              <Label htmlFor="notCovered" className="font-normal">
                Not covered under Gratuity Act (Central/State Govt employees)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Eligibility Check */}
        {!isEligible && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-400">Not Yet Eligible</p>
                <p className="text-sm text-yellow-600 mt-1">
                  Minimum 5 years of continuous service required for gratuity eligibility.
                  You need {5 - yearsOfService} more year(s) to become eligible.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {isEligible && (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Calculation Formula:</h4>
              <p className="text-sm font-mono bg-background p-2 rounded">
                Gratuity = (Last Basic + DA) × 15 × Years of Service / {calculation.divisor}
              </p>
              <p className="text-sm font-mono bg-background p-2 rounded mt-1">
                = {calculation.formula}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                <p className="text-sm text-green-600">Gratuity Amount</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(calculation.finalGratuity)}
                </p>
                {calculation.isMaxCapped && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    Capped at ₹20 Lakhs (Max Limit)
                  </Badge>
                )}
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600">Tax Treatment</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  {calculation.taxableAmount > 0 ? (
                    <>
                      <span className="text-green-600">{formatCurrency(2000000)} Tax-Free</span>
                      <br />
                      <span className="text-red-500 text-sm">{formatCurrency(calculation.taxableAmount)} Taxable</span>
                    </>
                  ) : (
                    "Fully Tax Exempt"
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-400">
              <p className="font-medium mb-2">Key Points:</p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-start gap-1">
                  <CheckCircle2 className="h-3 w-3 mt-0.5" />
                  <span>Eligibility: Minimum 5 years of continuous service</span>
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 className="h-3 w-3 mt-0.5" />
                  <span>If service is 4 years + 6 months, it's rounded to 5 years</span>
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 className="h-3 w-3 mt-0.5" />
                  <span>Maximum gratuity limit: ₹20,00,000 (tax-exempt)</span>
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 className="h-3 w-3 mt-0.5" />
                  <span>Payable on resignation, retirement, death, or disablement</span>
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 className="h-3 w-3 mt-0.5" />
                  <span>Applies to establishments with 10+ employees</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
