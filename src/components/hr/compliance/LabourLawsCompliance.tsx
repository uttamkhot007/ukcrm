import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Scale, 
  Clock, 
  IndianRupee, 
  Users,
  Baby,
  Heart,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Calendar
} from "lucide-react";

export function LabourLawsCompliance() {
  const labourCodes = [
    {
      code: "Code on Wages, 2019",
      icon: IndianRupee,
      status: "enacted",
      description: "Consolidates 4 laws: Payment of Wages Act, Minimum Wages Act, Payment of Bonus Act, Equal Remuneration Act",
      keyProvisions: [
        "Universal minimum wage across all sectors",
        "Floor wage determined by Central Government",
        "Wages to be paid by 7th (monthly) or 10th (weekly) of following month",
        "Equal remuneration for equal work regardless of gender",
        "Bonus eligibility: Employees earning up to ₹21,000/month"
      ],
      penalties: "Fine up to ₹20,000 to ₹1,00,000"
    },
    {
      code: "Code on Social Security, 2020",
      icon: Shield,
      status: "enacted",
      description: "Consolidates 9 laws including EPF, ESI, Gratuity, Maternity Benefit Acts",
      keyProvisions: [
        "EPF applicable to establishments with 20+ employees",
        "ESI extended to all establishments in notified areas",
        "Gratuity to all employees after 5 years",
        "Maternity benefit: 26 weeks (first two children)",
        "Gig and platform workers included"
      ],
      penalties: "Imprisonment up to 3 years or fine up to ₹1,00,000"
    },
    {
      code: "Industrial Relations Code, 2020",
      icon: Users,
      status: "enacted",
      description: "Consolidates Trade Unions Act, Industrial Employment Act, Industrial Disputes Act",
      keyProvisions: [
        "Standing Orders mandatory for 300+ employees (earlier 100)",
        "Prior permission for retrenchment in 300+ establishments",
        "Fixed-term employment recognized",
        "Re-skilling fund for retrenched workers",
        "Grievance Redressal Committee mandatory for 20+ workers"
      ],
      penalties: "Fine up to ₹1,00,000"
    },
    {
      code: "Occupational Safety Code, 2020",
      icon: Heart,
      status: "enacted",
      description: "Consolidates 13 labour laws on safety, health, and working conditions",
      keyProvisions: [
        "Applicable to establishments with 10+ workers (with power) or 20+ (without)",
        "Annual health checkups for workers in hazardous processes",
        "Maximum 8 hours work per day",
        "Women allowed in night shifts with safety measures",
        "Interstate migrant workers registration and benefits"
      ],
      penalties: "Imprisonment up to 3 months or fine up to ₹3,00,000"
    }
  ];

  const existingLaws = [
    {
      category: "Working Hours & Leave",
      laws: [
        {
          name: "Shops & Establishments Act",
          applicability: "State-specific, all commercial establishments",
          keyPoints: [
            "Working hours: 8-9 hours/day, 48 hours/week",
            "Weekly off: 1 day mandatory",
            "Overtime: Double the ordinary wage",
            "Annual leave: 12-21 days (varies by state)",
            "Registration mandatory"
          ]
        },
        {
          name: "Factories Act, 1948",
          applicability: "Factories with 10+ workers (with power) or 20+ (without)",
          keyPoints: [
            "Working hours: 48 hours/week, 9 hours/day",
            "Overtime: Double wages, max 50 hours/quarter",
            "Weekly holiday: 1 day mandatory",
            "Annual leave: 1 day per 20 days worked",
            "Night shift for women: With safeguards"
          ]
        }
      ]
    },
    {
      category: "Wages & Compensation",
      laws: [
        {
          name: "Minimum Wages Act, 1948",
          applicability: "All scheduled employments",
          keyPoints: [
            "State-wise minimum wages",
            "Revised periodically (6 months to 1 year)",
            "Includes Basic + DA (Dearness Allowance)",
            "Skilled, Semi-skilled, Unskilled categories",
            "Violations: Criminal offense"
          ]
        },
        {
          name: "Payment of Wages Act, 1936",
          applicability: "Employees earning ≤ ₹24,000/month",
          keyPoints: [
            "Wages to be paid by 7th (for < 1000 employees)",
            "Maximum 10% deductions allowed",
            "Fines limited to 3% of wages",
            "Wage period: Max 1 month",
            "Authorized deductions only"
          ]
        },
        {
          name: "Equal Remuneration Act, 1976",
          applicability: "All employers",
          keyPoints: [
            "Equal pay for equal work",
            "No discrimination in recruitment",
            "No discrimination based on gender",
            "Penalty: Fine + imprisonment",
            "Now subsumed under Code on Wages"
          ]
        }
      ]
    },
    {
      category: "Social Security",
      laws: [
        {
          name: "Employees' Provident Fund Act, 1952",
          applicability: "Establishments with 20+ employees",
          keyPoints: [
            "Employee contribution: 12% of Basic + DA",
            "Employer contribution: 12% (3.67% EPF + 8.33% EPS)",
            "Wage ceiling: ₹15,000/month for statutory compliance",
            "Pension eligibility: 10 years of service",
            "Partial withdrawal allowed for specific purposes"
          ]
        },
        {
          name: "Employees' State Insurance Act, 1948",
          applicability: "Establishments with 10+ employees in notified areas",
          keyPoints: [
            "Wage ceiling: ₹21,000/month",
            "Employer contribution: 3.25%",
            "Employee contribution: 0.75%",
            "Benefits: Medical, sickness, maternity, disability",
            "Dependants' benefit in case of death"
          ]
        }
      ]
    },
    {
      category: "Maternity & Parental",
      laws: [
        {
          name: "Maternity Benefit Act, 1961",
          applicability: "All establishments with 10+ employees",
          keyPoints: [
            "Maternity leave: 26 weeks (first 2 children)",
            "Maternity leave: 12 weeks (third child onwards)",
            "Eligibility: 80 days work in preceding 12 months",
            "Work from home option post-leave",
            "Creche mandatory for 50+ employees"
          ]
        },
        {
          name: "Paternity Leave (Central Rules)",
          applicability: "Central Government employees (private sector: company policy)",
          keyPoints: [
            "15 days within 6 months of child's birth",
            "Not mandated for private sector",
            "Many companies offer 2-15 days",
            "Adoption leave provisions vary",
            "Recommended: Formalize company policy"
          ]
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* New Labour Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            New Labour Codes (2019-2020)
          </CardTitle>
          <CardDescription>
            The Central Government has consolidated 29 labour laws into 4 codes. Implementation pending state rules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {labourCodes.map((code, index) => (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <code.icon className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">{code.code}</h4>
                    </div>
                    <Badge variant="secondary">{code.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{code.description}</p>
                  <ul className="space-y-1 mb-3">
                    {code.keyProvisions.map((provision, i) => (
                      <li key={i} className="text-xs flex items-start gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{provision}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-xs">
                    <span className="font-medium text-yellow-700">Penalty: </span>
                    <span className="text-yellow-600">{code.penalties}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Existing Laws by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Current Labour Laws (Until New Codes Implemented)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="working-hours" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto">
              <TabsTrigger value="working-hours" className="text-xs">Working Hours</TabsTrigger>
              <TabsTrigger value="wages" className="text-xs">Wages</TabsTrigger>
              <TabsTrigger value="social-security" className="text-xs">Social Security</TabsTrigger>
              <TabsTrigger value="maternity" className="text-xs">Maternity</TabsTrigger>
            </TabsList>

            {existingLaws.map((category, catIndex) => (
              <TabsContent 
                key={catIndex} 
                value={category.category.toLowerCase().replace(/[&\s]/g, '-').replace('--', '-')}
                className="mt-4"
              >
                <div className="space-y-4">
                  {category.laws.map((law, lawIndex) => (
                    <Card key={lawIndex}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{law.name}</CardTitle>
                        </div>
                        <CardDescription>{law.applicability}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {law.keyPoints.map((point, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Key Compliance Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Key Compliance Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { 
                title: "EPF/ESI Payments", 
                deadline: "15th of following month",
                description: "Monthly contribution deposit",
                penalty: "12% interest + damages"
              },
              { 
                title: "PF ECR Filing", 
                deadline: "15th of following month",
                description: "Electronic Challan cum Return",
                penalty: "₹5,000 - ₹25,000"
              },
              { 
                title: "Form 16", 
                deadline: "June 15",
                description: "Annual TDS certificate",
                penalty: "₹100/day delay"
              },
              { 
                title: "Professional Tax", 
                deadline: "Varies by state",
                description: "Monthly/Annual filing",
                penalty: "Interest + penalty varies"
              },
              { 
                title: "Labour Welfare Fund", 
                deadline: "Half-yearly (Jun 30, Dec 31)",
                description: "Employee + Employer contribution",
                penalty: "State-specific"
              },
              { 
                title: "Bonus Payment", 
                deadline: "Within 8 months of FY close",
                description: "Usually before November 30",
                penalty: "Imprisonment + fine"
              }
            ].map((item, index) => (
              <Card key={index} className="bg-muted/30">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm">{item.title}</h4>
                  <Badge variant="outline" className="mt-1 text-xs">{item.deadline}</Badge>
                  <p className="text-xs text-muted-foreground mt-2">{item.description}</p>
                  <p className="text-xs text-red-500 mt-1">Penalty: {item.penalty}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-700 dark:text-amber-400">Implementation Note</h4>
              <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                The new Labour Codes have been enacted but are awaiting implementation pending notification of 
                state-specific rules. Until then, existing laws remain in force. Organizations should prepare 
                for transition by reviewing policy changes required under the new codes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
