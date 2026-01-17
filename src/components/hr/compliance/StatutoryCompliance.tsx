import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  IndianRupee, 
  Calculator,
  FileText,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Info,
  MapPin
} from "lucide-react";

export function StatutoryCompliance() {
  const [selectedState, setSelectedState] = useState("maharashtra");

  const stateCompliance = {
    maharashtra: {
      state: "Maharashtra",
      professionalTax: {
        slabs: [
          { range: "Up to ₹7,500", tax: "₹0" },
          { range: "₹7,501 - ₹10,000", tax: "₹175/month" },
          { range: "Above ₹10,000", tax: "₹200/month (₹300 for Feb)" }
        ],
        maxAnnual: "₹2,500",
        dueDate: "End of each month"
      },
      labourWelfare: {
        employee: "₹12/6 months",
        employer: "₹36/6 months",
        dueDate: "June 30, December 31"
      },
      minimumWages: {
        skilled: 14456,
        semiSkilled: 13266,
        unskilled: 12086
      },
      shopsAct: {
        workHours: "9 hours/day, 48 hours/week",
        weeklyOff: "1 day mandatory",
        overtime: "Double the ordinary rate",
        annualLeave: "21 days"
      }
    },
    karnataka: {
      state: "Karnataka",
      professionalTax: {
        slabs: [
          { range: "Up to ₹15,000", tax: "₹0" },
          { range: "Above ₹15,000", tax: "₹200/month" }
        ],
        maxAnnual: "₹2,400",
        dueDate: "20th of following month"
      },
      labourWelfare: {
        employee: "₹10/6 months",
        employer: "₹20/6 months",
        dueDate: "January 15, July 15"
      },
      minimumWages: {
        skilled: 15294,
        semiSkilled: 13726,
        unskilled: 12158
      },
      shopsAct: {
        workHours: "9 hours/day, 48 hours/week",
        weeklyOff: "1 day mandatory",
        overtime: "Double the ordinary rate",
        annualLeave: "18 days"
      }
    },
    delhi: {
      state: "Delhi",
      professionalTax: {
        slabs: [
          { range: "Not Applicable", tax: "No Professional Tax in Delhi" }
        ],
        maxAnnual: "N/A",
        dueDate: "N/A"
      },
      labourWelfare: {
        employee: "N/A",
        employer: "N/A",
        dueDate: "N/A"
      },
      minimumWages: {
        skilled: 21215,
        semiSkilled: 19473,
        unskilled: 17494
      },
      shopsAct: {
        workHours: "9 hours/day, 48 hours/week",
        weeklyOff: "1 day mandatory",
        overtime: "Double the ordinary rate",
        annualLeave: "15 days"
      }
    },
    tamilnadu: {
      state: "Tamil Nadu",
      professionalTax: {
        slabs: [
          { range: "Up to ₹21,000", tax: "₹0" },
          { range: "₹21,001 - ₹30,000", tax: "₹100/month" },
          { range: "₹30,001 - ₹45,000", tax: "₹235/month" },
          { range: "₹45,001 - ₹60,000", tax: "₹510/month" },
          { range: "₹60,001 - ₹75,000", tax: "₹760/month" },
          { range: "Above ₹75,000", tax: "₹1,095/month" }
        ],
        maxAnnual: "₹13,140",
        dueDate: "1st of each month"
      },
      labourWelfare: {
        employee: "₹10/month",
        employer: "₹20/month",
        dueDate: "15th of following month"
      },
      minimumWages: {
        skilled: 14137,
        semiSkilled: 12897,
        unskilled: 11657
      },
      shopsAct: {
        workHours: "8 hours/day, 48 hours/week",
        weeklyOff: "1 day mandatory",
        overtime: "Double the ordinary rate",
        annualLeave: "12 days"
      }
    },
    telangana: {
      state: "Telangana",
      professionalTax: {
        slabs: [
          { range: "Up to ₹15,000", tax: "₹0" },
          { range: "₹15,001 - ₹20,000", tax: "₹150/month" },
          { range: "Above ₹20,000", tax: "₹200/month" }
        ],
        maxAnnual: "₹2,500",
        dueDate: "10th of following month"
      },
      labourWelfare: {
        employee: "₹2/month",
        employer: "₹5/month",
        dueDate: "15th of following month"
      },
      minimumWages: {
        skilled: 15738,
        semiSkilled: 13948,
        unskilled: 12158
      },
      shopsAct: {
        workHours: "9 hours/day, 48 hours/week",
        weeklyOff: "1 day mandatory",
        overtime: "Double the ordinary rate",
        annualLeave: "12 days"
      }
    }
  };

  const currentState = stateCompliance[selectedState as keyof typeof stateCompliance];

  const centralCompliances = [
    {
      name: "Provident Fund (EPF)",
      applicability: "20+ employees",
      rate: "12% Employee + 12% Employer",
      ceiling: "₹15,000/month (statutory)",
      deadline: "15th of following month",
      form: "ECR via EPFO Portal"
    },
    {
      name: "Employee State Insurance (ESI)",
      applicability: "10+ employees in notified areas",
      rate: "0.75% Employee + 3.25% Employer",
      ceiling: "₹21,000/month gross",
      deadline: "15th of following month",
      form: "ESI Challan"
    },
    {
      name: "TDS on Salary",
      applicability: "All employers",
      rate: "As per income tax slabs",
      ceiling: "N/A",
      deadline: "7th of following month",
      form: "24Q (Quarterly), Form 16 (Annual)"
    },
    {
      name: "Gratuity",
      applicability: "5+ years of service",
      rate: "15 days wages per year of service",
      ceiling: "₹20,00,000 maximum",
      deadline: "Within 30 days of becoming due",
      form: "Form I (Nomination)"
    }
  ];

  return (
    <div className="space-y-6">
      {/* State Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                State-Specific Compliance
              </CardTitle>
              <CardDescription>
                Select a state to view specific statutory requirements
              </CardDescription>
            </div>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maharashtra">Maharashtra</SelectItem>
                <SelectItem value="karnataka">Karnataka</SelectItem>
                <SelectItem value="delhi">Delhi</SelectItem>
                <SelectItem value="tamilnadu">Tamil Nadu</SelectItem>
                <SelectItem value="telangana">Telangana</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Professional Tax */}
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <IndianRupee className="h-4 w-4" />
                  Professional Tax
                </h4>
                <div className="space-y-2">
                  {currentState.professionalTax.slabs.map((slab, index) => (
                    <div key={index} className="text-xs">
                      <span className="text-muted-foreground">{slab.range}:</span>
                      <span className="font-medium ml-1">{slab.tax}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t mt-2">
                    <p className="text-xs text-muted-foreground">
                      Max Annual: <span className="font-medium">{currentState.professionalTax.maxAnnual}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due: <span className="font-medium">{currentState.professionalTax.dueDate}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Labour Welfare Fund */}
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4" />
                  Labour Welfare Fund
                </h4>
                <div className="space-y-2 text-xs">
                  <p>
                    <span className="text-muted-foreground">Employee:</span>
                    <span className="font-medium ml-1">{currentState.labourWelfare.employee}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Employer:</span>
                    <span className="font-medium ml-1">{currentState.labourWelfare.employer}</span>
                  </p>
                  <p className="pt-2 border-t">
                    <span className="text-muted-foreground">Due Date:</span>
                    <span className="font-medium ml-1">{currentState.labourWelfare.dueDate}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Minimum Wages */}
            <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <IndianRupee className="h-4 w-4" />
                  Minimum Wages (Monthly)
                </h4>
                <div className="space-y-2 text-xs">
                  <p>
                    <span className="text-muted-foreground">Skilled:</span>
                    <span className="font-medium ml-1">₹{currentState.minimumWages.skilled.toLocaleString()}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Semi-Skilled:</span>
                    <span className="font-medium ml-1">₹{currentState.minimumWages.semiSkilled.toLocaleString()}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Unskilled:</span>
                    <span className="font-medium ml-1">₹{currentState.minimumWages.unskilled.toLocaleString()}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Shops & Establishment */}
            <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4" />
                  Shops & Establishment
                </h4>
                <div className="space-y-2 text-xs">
                  <p>
                    <span className="text-muted-foreground">Work Hours:</span>
                    <span className="font-medium ml-1">{currentState.shopsAct.workHours}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Weekly Off:</span>
                    <span className="font-medium ml-1">{currentState.shopsAct.weeklyOff}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Annual Leave:</span>
                    <span className="font-medium ml-1">{currentState.shopsAct.annualLeave}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Central Compliances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Central Statutory Compliances
          </CardTitle>
          <CardDescription>
            Applicable across all states in India
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium">Compliance</th>
                  <th className="text-left py-3 px-4 font-medium">Applicability</th>
                  <th className="text-left py-3 px-4 font-medium">Rate</th>
                  <th className="text-left py-3 px-4 font-medium">Ceiling</th>
                  <th className="text-left py-3 px-4 font-medium">Deadline</th>
                  <th className="text-left py-3 px-4 font-medium">Form/Filing</th>
                </tr>
              </thead>
              <tbody>
                {centralCompliances.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium">{item.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{item.applicability}</td>
                    <td className="py-3 px-4">{item.rate}</td>
                    <td className="py-3 px-4">{item.ceiling}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-xs">{item.deadline}</Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{item.form}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* EPF Contribution Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            EPF Contribution Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Employee Contribution (12%)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span>EPF Account</span>
                  <span className="font-medium">12%</span>
                </div>
                <div className="flex justify-between p-2 bg-primary/10 rounded font-medium">
                  <span>Total Employee</span>
                  <span>12%</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Employer Contribution (12% + Admin)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span>EPF Account</span>
                  <span className="font-medium">3.67%</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span>EPS (Pension)</span>
                  <span className="font-medium">8.33%</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span>EDLI (Insurance)</span>
                  <span className="font-medium">0.50%</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span>Admin Charges</span>
                  <span className="font-medium">0.50%</span>
                </div>
                <div className="flex justify-between p-2 bg-primary/10 rounded font-medium">
                  <span>Total Employer</span>
                  <span>13%</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-sm">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5" />
              <p className="text-blue-700 dark:text-blue-400">
                Statutory wage ceiling for EPF is ₹15,000/month. Contributions can be made on higher wages 
                voluntarily. EPS contribution is capped at ₹15,000 wage.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Monthly Compliance Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { task: "PF/ESI Payment", deadline: "15th", priority: "high" },
              { task: "TDS Deposit", deadline: "7th", priority: "high" },
              { task: "Professional Tax", deadline: "End of month", priority: "medium" },
              { task: "Salary Processing", deadline: "Last working day", priority: "high" },
              { task: "Attendance Records", deadline: "Continuous", priority: "medium" },
              { task: "Leave Records Update", deadline: "Continuous", priority: "low" }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.task}</span>
                </div>
                <Badge variant={item.priority === "high" ? "destructive" : item.priority === "medium" ? "secondary" : "outline"}>
                  {item.deadline}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
