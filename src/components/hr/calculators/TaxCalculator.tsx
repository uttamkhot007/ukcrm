import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calculator, 
  IndianRupee, 
  Info,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

export function TaxCalculator() {
  const [grossSalary, setGrossSalary] = useState<number>(1500000);
  const [regime, setRegime] = useState<"old" | "new">("new");
  const [age, setAge] = useState<"below60" | "60to80" | "above80">("below60");
  
  // Deductions for old regime
  const [section80C, setSection80C] = useState<number>(150000);
  const [section80D, setSection80D] = useState<number>(25000);
  const [hra, setHra] = useState<number>(200000);
  const [lta, setLta] = useState<number>(50000);
  const [nps, setNps] = useState<number>(50000);
  const [homeLoanInterest, setHomeLoanInterest] = useState<number>(0);
  const [otherDeductions, setOtherDeductions] = useState<number>(0);

  // Standard deduction
  const standardDeduction = 75000; // Updated for FY 2024-25

  const calculation = useMemo(() => {
    let taxableIncome = grossSalary;
    let totalDeductions = standardDeduction;

    if (regime === "old") {
      // Old regime deductions
      totalDeductions += Math.min(section80C, 150000); // 80C max 1.5L
      totalDeductions += Math.min(section80D, age === "above80" ? 100000 : age === "60to80" ? 50000 : 25000);
      totalDeductions += hra;
      totalDeductions += lta;
      totalDeductions += Math.min(nps, 50000); // 80CCD(1B)
      totalDeductions += Math.min(homeLoanInterest, 200000); // 24(b)
      totalDeductions += otherDeductions;
    }

    taxableIncome = Math.max(0, grossSalary - totalDeductions);

    // Tax slabs
    let tax = 0;
    let slabDetails: { slab: string; rate: string; tax: number }[] = [];

    if (regime === "new") {
      // New Tax Regime FY 2024-25
      // Rebate u/s 87A up to 7L income
      if (taxableIncome <= 700000) {
        slabDetails = [{ slab: "Up to ₹7,00,000", rate: "Rebate u/s 87A", tax: 0 }];
        tax = 0;
      } else {
        const slabs = [
          { limit: 300000, rate: 0 },
          { limit: 700000, rate: 5 },
          { limit: 1000000, rate: 10 },
          { limit: 1200000, rate: 15 },
          { limit: 1500000, rate: 20 },
          { limit: Infinity, rate: 30 }
        ];

        let remaining = taxableIncome;
        let prevLimit = 0;

        for (const slab of slabs) {
          if (remaining <= 0) break;
          
          const slabAmount = Math.min(remaining, slab.limit - prevLimit);
          const slabTax = (slabAmount * slab.rate) / 100;
          
          if (slabAmount > 0) {
            slabDetails.push({
              slab: prevLimit === 0 ? `Up to ₹${(slab.limit / 100000).toFixed(1)}L` : 
                    slab.limit === Infinity ? `Above ₹${(prevLimit / 100000).toFixed(1)}L` :
                    `₹${(prevLimit / 100000).toFixed(1)}L - ₹${(slab.limit / 100000).toFixed(1)}L`,
              rate: `${slab.rate}%`,
              tax: slabTax
            });
            tax += slabTax;
          }
          
          remaining -= slabAmount;
          prevLimit = slab.limit;
        }
      }
    } else {
      // Old Tax Regime
      const exemptionLimit = age === "above80" ? 500000 : age === "60to80" ? 300000 : 250000;
      
      // Rebate u/s 87A (old regime: up to 5L, max rebate 12500)
      if (taxableIncome <= 500000 && age === "below60") {
        slabDetails = [{ slab: "Up to ₹5,00,000", rate: "Rebate u/s 87A", tax: 0 }];
        tax = 0;
      } else {
        const slabs = [
          { limit: exemptionLimit, rate: 0 },
          { limit: 500000, rate: 5 },
          { limit: 1000000, rate: 20 },
          { limit: Infinity, rate: 30 }
        ];

        let remaining = taxableIncome;
        let prevLimit = 0;

        for (const slab of slabs) {
          if (remaining <= 0) break;
          
          const slabAmount = Math.min(remaining, slab.limit - prevLimit);
          const slabTax = (slabAmount * slab.rate) / 100;
          
          if (slabAmount > 0 && slab.rate > 0) {
            slabDetails.push({
              slab: `₹${(prevLimit / 100000).toFixed(1)}L - ₹${slab.limit === Infinity ? '∞' : (slab.limit / 100000).toFixed(1) + 'L'}`,
              rate: `${slab.rate}%`,
              tax: slabTax
            });
            tax += slabTax;
          }
          
          remaining -= slabAmount;
          prevLimit = slab.limit;
        }
      }
    }

    // Surcharge
    let surcharge = 0;
    if (taxableIncome > 5000000 && taxableIncome <= 10000000) {
      surcharge = tax * 0.10;
    } else if (taxableIncome > 10000000 && taxableIncome <= 20000000) {
      surcharge = tax * 0.15;
    } else if (taxableIncome > 20000000 && taxableIncome <= 50000000) {
      surcharge = tax * 0.25;
    } else if (taxableIncome > 50000000) {
      surcharge = tax * (regime === "new" ? 0.25 : 0.37); // New regime max 25%
    }

    // Health & Education Cess (4%)
    const cess = (tax + surcharge) * 0.04;

    const totalTax = tax + surcharge + cess;
    const monthlyTax = totalTax / 12;
    const effectiveRate = grossSalary > 0 ? (totalTax / grossSalary) * 100 : 0;

    return {
      grossSalary,
      totalDeductions,
      taxableIncome,
      slabDetails,
      baseTax: tax,
      surcharge,
      cess,
      totalTax,
      monthlyTax,
      effectiveRate,
      netIncome: grossSalary - totalTax
    };
  }, [grossSalary, regime, age, section80C, section80D, hra, lta, nps, homeLoanInterest, otherDeductions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Income Tax Calculator FY 2024-25
          </CardTitle>
          <CardDescription>
            Compare tax under Old vs New regime and optimize your tax planning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Annual Gross Salary (₹)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={grossSalary}
                  onChange={(e) => setGrossSalary(Number(e.target.value))}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tax Regime</Label>
              <RadioGroup value={regime} onValueChange={(v) => setRegime(v as "old" | "new")} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new" />
                  <Label htmlFor="new">New Regime</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="old" id="old" />
                  <Label htmlFor="old">Old Regime</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Age Category</Label>
              <RadioGroup value={age} onValueChange={(v) => setAge(v as "below60" | "60to80" | "above80")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="below60" id="below60" />
                  <Label htmlFor="below60" className="text-sm">Below 60</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="60to80" id="60to80" />
                  <Label htmlFor="60to80" className="text-sm">60-80</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="above80" id="above80" />
                  <Label htmlFor="above80" className="text-sm">Above 80</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Deductions (Old Regime) */}
          {regime === "old" && (
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Deductions (Old Regime Only)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">80C (Max ₹1.5L)</Label>
                    <Input
                      type="number"
                      value={section80C}
                      onChange={(e) => setSection80C(Number(e.target.value))}
                      placeholder="150000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">80D Health Insurance</Label>
                    <Input
                      type="number"
                      value={section80D}
                      onChange={(e) => setSection80D(Number(e.target.value))}
                      placeholder="25000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">HRA Exemption</Label>
                    <Input
                      type="number"
                      value={hra}
                      onChange={(e) => setHra(Number(e.target.value))}
                      placeholder="200000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">LTA</Label>
                    <Input
                      type="number"
                      value={lta}
                      onChange={(e) => setLta(Number(e.target.value))}
                      placeholder="50000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">80CCD NPS (Max ₹50K)</Label>
                    <Input
                      type="number"
                      value={nps}
                      onChange={(e) => setNps(Number(e.target.value))}
                      placeholder="50000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Home Loan Interest</Label>
                    <Input
                      type="number"
                      value={homeLoanInterest}
                      onChange={(e) => setHomeLoanInterest(Number(e.target.value))}
                      placeholder="200000"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label className="text-xs">Other Deductions</Label>
                    <Input
                      type="number"
                      value={otherDeductions}
                      onChange={(e) => setOtherDeductions(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Calculation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Tax Calculation
              <Badge variant={regime === "new" ? "default" : "secondary"}>
                {regime === "new" ? "New Regime" : "Old Regime"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Gross Salary</span>
                <span className="font-medium">{formatCurrency(calculation.grossSalary)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Less: Deductions</span>
                <span>-{formatCurrency(calculation.totalDeductions)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-medium">
                <span>Taxable Income</span>
                <span>{formatCurrency(calculation.taxableIncome)}</span>
              </div>
            </div>

            {/* Slab-wise Tax */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">TAX SLABS</h4>
              {calculation.slabDetails.map((slab, index) => (
                <div key={index} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                  <span>{slab.slab} @ {slab.rate}</span>
                  <span className="font-medium">{formatCurrency(slab.tax)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-sm">
                <span>Base Tax</span>
                <span className="font-medium">{formatCurrency(calculation.baseTax)}</span>
              </div>
              {calculation.surcharge > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Surcharge</span>
                  <span>+{formatCurrency(calculation.surcharge)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Health & Education Cess (4%)</span>
                <span>{formatCurrency(calculation.cess)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Tax Liability</span>
                <span className="text-red-600">{formatCurrency(calculation.totalTax)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Annual Tax</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(calculation.totalTax)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Monthly TDS</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(calculation.monthlyTax)}</p>
              </div>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Annual Net Income</span>
                <span className="text-xl font-bold text-green-600">{formatCurrency(calculation.netIncome)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Effective Tax Rate: {calculation.effectiveRate.toFixed(2)}%
              </p>
            </div>

            <Separator />

            {/* Tax Slabs Reference */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Tax Slabs FY 2024-25 (New Regime)</h4>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>₹0 - ₹3,00,000</span>
                  <span>Nil</span>
                </div>
                <div className="flex justify-between">
                  <span>₹3,00,001 - ₹7,00,000</span>
                  <span>5%</span>
                </div>
                <div className="flex justify-between">
                  <span>₹7,00,001 - ₹10,00,000</span>
                  <span>10%</span>
                </div>
                <div className="flex justify-between">
                  <span>₹10,00,001 - ₹12,00,000</span>
                  <span>15%</span>
                </div>
                <div className="flex justify-between">
                  <span>₹12,00,001 - ₹15,00,000</span>
                  <span>20%</span>
                </div>
                <div className="flex justify-between">
                  <span>Above ₹15,00,000</span>
                  <span>30%</span>
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
              <p className="font-medium mb-1">Key Updates for FY 2024-25:</p>
              <ul className="text-xs space-y-1">
                <li>• Standard deduction increased to ₹75,000 (from ₹50,000)</li>
                <li>• New regime is the default; old regime requires explicit opt-in</li>
                <li>• Rebate u/s 87A: No tax up to ₹7L (new) / ₹5L (old)</li>
                <li>• Maximum surcharge in new regime capped at 25%</li>
                <li>• NPS employer contribution limit increased to 14% for govt employees</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
