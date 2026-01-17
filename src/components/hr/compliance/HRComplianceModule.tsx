import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Scale, 
  Shield, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen,
  Building2,
  Users,
  Calculator,
  IndianRupee,
  Calendar,
  Info,
  ExternalLink
} from "lucide-react";
import { POSHCompliance } from "./POSHCompliance";
import { LabourLawsCompliance } from "./LabourLawsCompliance";
import { StatutoryCompliance } from "./StatutoryCompliance";
import { SalaryCalculator } from "../calculators/SalaryCalculator";
import { GratuityCalculator } from "../calculators/GratuityCalculator";
import { PFCalculator } from "../calculators/PFCalculator";
import { TaxCalculator } from "../calculators/TaxCalculator";
import { BonusCalculator } from "../calculators/BonusCalculator";
import { LeaveEncashmentCalculator } from "../calculators/LeaveEncashmentCalculator";

export function HRComplianceModule() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            HR Legal Compliance & Calculators
          </h2>
          <p className="text-muted-foreground mt-1">
            Indian labour laws, statutory compliance, and benefits calculators
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Last Updated: January 2025
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="posh" className="text-xs">POSH</TabsTrigger>
          <TabsTrigger value="labour" className="text-xs">Labour Laws</TabsTrigger>
          <TabsTrigger value="statutory" className="text-xs">Statutory</TabsTrigger>
          <TabsTrigger value="salary-calc" className="text-xs">Salary Calc</TabsTrigger>
          <TabsTrigger value="pf-calc" className="text-xs">PF/ESI</TabsTrigger>
          <TabsTrigger value="gratuity" className="text-xs">Gratuity</TabsTrigger>
          <TabsTrigger value="tax" className="text-xs">Tax</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <ComplianceOverview />
        </TabsContent>

        <TabsContent value="posh" className="mt-6">
          <POSHCompliance />
        </TabsContent>

        <TabsContent value="labour" className="mt-6">
          <LabourLawsCompliance />
        </TabsContent>

        <TabsContent value="statutory" className="mt-6">
          <StatutoryCompliance />
        </TabsContent>

        <TabsContent value="salary-calc" className="mt-6">
          <SalaryCalculator />
        </TabsContent>

        <TabsContent value="pf-calc" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PFCalculator />
            <BonusCalculator />
          </div>
        </TabsContent>

        <TabsContent value="gratuity" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GratuityCalculator />
            <LeaveEncashmentCalculator />
          </div>
        </TabsContent>

        <TabsContent value="tax" className="mt-6">
          <TaxCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ComplianceOverview() {
  const complianceAreas = [
    {
      title: "POSH Act 2013",
      icon: Shield,
      status: "mandatory",
      description: "Prevention of Sexual Harassment at Workplace",
      keyPoints: [
        "Mandatory for organizations with 10+ employees",
        "Internal Complaints Committee (ICC) required",
        "Annual report submission to District Officer",
        "Awareness programs mandatory"
      ],
      penalty: "Up to ₹50,000 fine, license cancellation for repeat offenses"
    },
    {
      title: "Minimum Wages Act 1948",
      icon: IndianRupee,
      status: "mandatory",
      description: "State-wise minimum wage compliance",
      keyPoints: [
        "Wages vary by state and skill level",
        "Revised periodically (usually annually)",
        "Covers basic + DA (Dearness Allowance)",
        "Non-compliance is a criminal offense"
      ],
      penalty: "Imprisonment up to 5 years or fine up to ₹10,000"
    },
    {
      title: "EPF & MP Act 1952",
      icon: Building2,
      status: "mandatory",
      description: "Employee Provident Fund contributions",
      keyPoints: [
        "Mandatory for establishments with 20+ employees",
        "12% employer + 12% employee contribution",
        "Current wage ceiling: ₹15,000/month",
        "EPS pension scheme included"
      ],
      penalty: "Imprisonment 1-3 years + fine"
    },
    {
      title: "ESI Act 1948",
      icon: Users,
      status: "conditional",
      description: "Employee State Insurance for health coverage",
      keyPoints: [
        "Applicable to establishments with 10+ employees",
        "Wage ceiling: ₹21,000/month",
        "Employer: 3.25%, Employee: 0.75%",
        "Covers medical, maternity, disability"
      ],
      penalty: "Imprisonment up to 2 years + fine"
    },
    {
      title: "Payment of Gratuity Act 1972",
      icon: Calculator,
      status: "mandatory",
      description: "Gratuity payment after 5 years of service",
      keyPoints: [
        "Applicable after 5 years of continuous service",
        "15 days wages per year of service",
        "Maximum limit: ₹20 lakhs (tax-free)",
        "Payable on resignation, retirement, death"
      ],
      penalty: "Imprisonment up to 2 years or fine up to ₹20,000"
    },
    {
      title: "Payment of Bonus Act 1965",
      icon: IndianRupee,
      status: "mandatory",
      description: "Annual bonus payment to eligible employees",
      keyPoints: [
        "Minimum 8.33% of wages/salary",
        "Maximum 20% of wages/salary",
        "Eligibility: Worked 30+ days in a year",
        "Wage ceiling: ₹21,000/month"
      ],
      penalty: "Imprisonment up to 6 months + fine"
    }
  ];

  const stateWiseMinWages = [
    { state: "Maharashtra", skilled: 14456, semi: 13266, unskilled: 12086 },
    { state: "Karnataka", skilled: 15294, semi: 13726, unskilled: 12158 },
    { state: "Tamil Nadu", skilled: 14137, semi: 12897, unskilled: 11657 },
    { state: "Delhi", skilled: 21215, semi: 19473, unskilled: 17494 },
    { state: "Gujarat", skilled: 12836, semi: 11726, unskilled: 10616 },
    { state: "Telangana", skilled: 15738, semi: 13948, unskilled: 12158 },
    { state: "West Bengal", skilled: 12500, semi: 11500, unskilled: 10500 },
    { state: "Uttar Pradesh", skilled: 11622, semi: 10556, unskilled: 9490 },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/10 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">6</p>
                <p className="text-xs text-red-600">Critical Compliances</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/10 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">15+</p>
                <p className="text-xs text-green-600">Labour Laws Covered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calculator className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">6</p>
                <p className="text-xs text-blue-600">Benefit Calculators</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">28</p>
                <p className="text-xs text-purple-600">States Covered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Key Compliance Areas
          </CardTitle>
          <CardDescription>
            Critical HR legal requirements for Indian organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {complianceAreas.map((area, index) => (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <area.icon className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold text-sm">{area.title}</h4>
                    </div>
                    <Badge variant={area.status === "mandatory" ? "destructive" : "secondary"} className="text-xs">
                      {area.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{area.description}</p>
                  <ul className="space-y-1 mb-3">
                    {area.keyPoints.slice(0, 3).map((point, i) => (
                      <li key={i} className="text-xs flex items-start gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs">
                    <span className="font-medium text-red-600">Penalty:</span>
                    <span className="text-red-500 ml-1">{area.penalty}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* State-wise Minimum Wages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            State-wise Minimum Wages (2024-25)
          </CardTitle>
          <CardDescription>
            Monthly minimum wages in INR (Basic + DA) - Subject to periodic revision
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">State</th>
                  <th className="text-right py-2 px-3 font-medium">Skilled</th>
                  <th className="text-right py-2 px-3 font-medium">Semi-Skilled</th>
                  <th className="text-right py-2 px-3 font-medium">Unskilled</th>
                </tr>
              </thead>
              <tbody>
                {stateWiseMinWages.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3 font-medium">{row.state}</td>
                    <td className="text-right py-2 px-3">₹{row.skilled.toLocaleString()}</td>
                    <td className="text-right py-2 px-3">₹{row.semi.toLocaleString()}</td>
                    <td className="text-right py-2 px-3">₹{row.unskilled.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Wages are indicative and subject to state notifications. Always verify with latest government orders.
          </p>
        </CardContent>
      </Card>

      {/* Important Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Annual Compliance Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { month: "Monthly", items: ["PF/ESI challan (15th)", "TDS deposit (7th)", "Professional Tax"] },
              { month: "Quarterly", items: ["TDS Returns", "ESI Returns", "Advance Tax"] },
              { month: "Annual", items: ["Form 16 (June 15)", "PF Annual Return", "Bonus Payment (Nov)"] },
              { month: "POSH", items: ["Annual Report (Jan)", "ICC Meeting (Quarterly)", "Awareness Training"] }
            ].map((period, index) => (
              <Card key={index} className="bg-muted/30">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm mb-2">{period.month}</h4>
                  <ul className="space-y-1">
                    {period.items.map((item, i) => (
                      <li key={i} className="text-xs flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
