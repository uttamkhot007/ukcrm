import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  IndianRupee, 
  ArrowRight,
  Info,
  Download,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function SalaryCalculator() {
  const [ctc, setCTC] = useState<number>(1200000);
  const [isESIApplicable, setIsESIApplicable] = useState(false);
  const [isPFOnFullSalary, setIsPFOnFullSalary] = useState(false);
  const [state, setState] = useState("maharashtra");
  const [variablePercent, setVariablePercent] = useState<number>(10);

  const professionalTaxRates: Record<string, { slab: number; tax: number }[]> = {
    maharashtra: [
      { slab: 7500, tax: 0 },
      { slab: 10000, tax: 175 },
      { slab: Infinity, tax: 200 }
    ],
    karnataka: [
      { slab: 15000, tax: 0 },
      { slab: Infinity, tax: 200 }
    ],
    delhi: [],
    tamilnadu: [
      { slab: 21000, tax: 0 },
      { slab: 30000, tax: 100 },
      { slab: 45000, tax: 235 },
      { slab: 60000, tax: 510 },
      { slab: 75000, tax: 760 },
      { slab: Infinity, tax: 1095 }
    ],
    telangana: [
      { slab: 15000, tax: 0 },
      { slab: 20000, tax: 150 },
      { slab: Infinity, tax: 200 }
    ]
  };

  const calculateProfessionalTax = (monthlyGross: number, selectedState: string): number => {
    const rates = professionalTaxRates[selectedState] || [];
    if (rates.length === 0) return 0;
    
    for (const rate of rates) {
      if (monthlyGross <= rate.slab) {
        return rate.tax;
      }
    }
    return rates[rates.length - 1]?.tax || 0;
  };

  const breakdown = useMemo(() => {
    // Annual calculations
    const variable = (ctc * variablePercent) / 100;
    const fixed = ctc - variable;
    const basicPercent = 40;
    const basic = (fixed * basicPercent) / 100;
    const hra = basic * 0.5;
    
    const pfWage = isPFOnFullSalary ? basic : Math.min(basic, 15000 * 12);
    const employerPF = pfWage * 0.12;
    const employerESI = isESIApplicable ? fixed * 0.0325 : 0;
    const gratuity = (basic / 26) * 15 / 12;
    const gratuityAnnual = gratuity * 12;
    
    let specialAllowance = fixed - basic - hra - employerPF - employerESI - gratuityAnnual;
    if (specialAllowance < 0) specialAllowance = 0;

    // Monthly calculations
    const monthlyGross = fixed / 12;
    const monthlyBasic = basic / 12;
    const monthlyHra = hra / 12;
    const monthlySpecialAllowance = specialAllowance / 12;
    const monthlyVariable = variable / 12;

    const employeePFWage = isPFOnFullSalary ? monthlyBasic : Math.min(monthlyBasic, 15000);
    const monthlyEmployeePF = employeePFWage * 0.12;
    const monthlyEmployerPF = employeePFWage * 0.12;
    const monthlyEmployeeESI = isESIApplicable ? monthlyGross * 0.0075 : 0;
    const monthlyEmployerESI = isESIApplicable ? monthlyGross * 0.0325 : 0;
    const monthlyProfessionalTax = calculateProfessionalTax(monthlyGross, state);
    
    const monthlyTotalDeductions = monthlyEmployeePF + monthlyEmployeeESI + monthlyProfessionalTax;
    const monthlyNetSalary = monthlyGross - monthlyTotalDeductions;
    const monthlyInHand = monthlyNetSalary;

    // Annual summary
    const annualGrossSalary = fixed;
    const annualEmployeePF = monthlyEmployeePF * 12;
    const annualEmployeeESI = monthlyEmployeeESI * 12;
    const annualProfessionalTax = monthlyProfessionalTax * 12;
    const annualTotalDeductions = annualEmployeePF + annualEmployeeESI + annualProfessionalTax;
    const annualNetSalary = annualGrossSalary - annualTotalDeductions;
    const annualTakeHome = annualNetSalary + variable;

    return {
      monthly: {
        gross: monthlyGross,
        basic: monthlyBasic,
        hra: monthlyHra,
        specialAllowance: monthlySpecialAllowance,
        variable: monthlyVariable,
        employeePF: monthlyEmployeePF,
        employerPF: monthlyEmployerPF,
        employeeESI: monthlyEmployeeESI,
        employerESI: monthlyEmployerESI,
        professionalTax: monthlyProfessionalTax,
        totalDeductions: monthlyTotalDeductions,
        netSalary: monthlyNetSalary,
        inHand: monthlyInHand
      },
      annual: {
        ctc,
        variable,
        fixed,
        basic,
        hra,
        specialAllowance,
        employerPF,
        employerESI,
        gratuityAnnual,
        grossSalary: annualGrossSalary,
        employeePF: annualEmployeePF,
        employeeESI: annualEmployeeESI,
        professionalTax: annualProfessionalTax,
        totalDeductions: annualTotalDeductions,
        netSalary: annualNetSalary,
        takeHome: annualTakeHome
      }
    };
  }, [ctc, isESIApplicable, isPFOnFullSalary, state, variablePercent]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Salary Structure Calculator
          </CardTitle>
          <CardDescription>
            Calculate detailed salary breakdown including PF, ESI, PT and take-home
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="ctc">Annual CTC (₹)</Label>
              <Input
                id="ctc"
                type="number"
                value={ctc}
                onChange={(e) => setCTC(Number(e.target.value))}
                placeholder="1200000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variable">Variable Pay (%)</Label>
              <Input
                id="variable"
                type="number"
                value={variablePercent}
                onChange={(e) => setVariablePercent(Number(e.target.value))}
                placeholder="10"
                min={0}
                max={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maharashtra">Maharashtra</SelectItem>
                  <SelectItem value="karnataka">Karnataka</SelectItem>
                  <SelectItem value="delhi">Delhi (No PT)</SelectItem>
                  <SelectItem value="tamilnadu">Tamil Nadu</SelectItem>
                  <SelectItem value="telangana">Telangana</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="esi" className="text-sm">ESI Applicable</Label>
                <Switch id="esi" checked={isESIApplicable} onCheckedChange={setIsESIApplicable} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="pfFull" className="text-sm">PF on Full Basic</Label>
                <Switch id="pfFull" checked={isPFOnFullSalary} onCheckedChange={setIsPFOnFullSalary} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Earnings */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">EARNINGS</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Basic Salary</span>
                  <span className="font-medium">{formatCurrency(breakdown.monthly.basic)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>House Rent Allowance</span>
                  <span className="font-medium">{formatCurrency(breakdown.monthly.hra)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Special Allowance</span>
                  <span className="font-medium">{formatCurrency(breakdown.monthly.specialAllowance)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-medium">
                  <span>Gross Salary</span>
                  <span className="text-green-700 dark:text-green-400">{formatCurrency(breakdown.monthly.gross)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">DEDUCTIONS</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Provident Fund (Employee)</span>
                  <span className="font-medium text-red-500">-{formatCurrency(breakdown.monthly.employeePF)}</span>
                </div>
                {isESIApplicable && (
                  <div className="flex justify-between text-sm">
                    <span>ESI (Employee)</span>
                    <span className="font-medium text-red-500">-{formatCurrency(breakdown.monthly.employeeESI)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Professional Tax</span>
                  <span className="font-medium text-red-500">-{formatCurrency(breakdown.monthly.professionalTax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Deductions</span>
                  <span className="text-red-600">-{formatCurrency(breakdown.monthly.totalDeductions)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Net Salary */}
            <div className="p-4 bg-primary/10 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Monthly In-Hand</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(breakdown.monthly.inHand)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Annual Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Annual Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                <span>Cost to Company (CTC)</span>
                <span className="font-bold">{formatCurrency(breakdown.annual.ctc)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Fixed Pay</span>
                <span className="font-medium">{formatCurrency(breakdown.annual.fixed)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Variable Pay ({variablePercent}%)</span>
                <span className="font-medium">{formatCurrency(breakdown.annual.variable)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span>Gross Salary</span>
                <span className="font-medium">{formatCurrency(breakdown.annual.grossSalary)}</span>
              </div>
              <div className="flex justify-between text-sm text-red-500">
                <span>Total Deductions</span>
                <span>-{formatCurrency(breakdown.annual.totalDeductions)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                <span className="font-semibold">Annual Take-Home (with variable)</span>
                <span className="font-bold text-green-700 dark:text-green-400">{formatCurrency(breakdown.annual.takeHome)}</span>
              </div>
            </div>

            {/* Employer Contributions */}
            <div className="mt-6">
              <h4 className="font-medium text-sm text-muted-foreground mb-2">EMPLOYER CONTRIBUTIONS (Part of CTC)</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Employer PF</span>
                  <span className="font-medium">{formatCurrency(breakdown.monthly.employerPF * 12)}</span>
                </div>
                {isESIApplicable && (
                  <div className="flex justify-between text-sm">
                    <span>Employer ESI</span>
                    <span className="font-medium">{formatCurrency(breakdown.monthly.employerESI * 12)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Gratuity Provision</span>
                  <span className="font-medium">{formatCurrency(breakdown.annual.gratuityAnnual)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Note */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-400">
              <p className="font-medium mb-1">Calculation Notes:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Basic salary calculated as 40% of fixed pay (industry standard)</li>
                <li>HRA calculated as 50% of basic (metro cities)</li>
                <li>PF statutory ceiling is ₹15,000/month. Toggle "PF on Full Basic" for voluntary higher contribution</li>
                <li>ESI is applicable only if gross salary ≤ ₹21,000/month</li>
                <li>This is an estimate. Actual salary may vary based on company policy</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
