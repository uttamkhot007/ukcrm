import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Users,
  FileText,
  Calendar,
  Scale,
  BookOpen,
  Download,
  ExternalLink
} from "lucide-react";

export function POSHCompliance() {
  const iccRequirements = [
    { role: "Presiding Officer", requirement: "Senior woman employee", mandatory: true },
    { role: "Internal Members", requirement: "Minimum 2 employees committed to women's cause", mandatory: true },
    { role: "External Member", requirement: "NGO/legal background with 5+ years experience", mandatory: true },
    { role: "Tenure", requirement: "Maximum 3 years for all members", mandatory: true }
  ];

  const complaintProcess = [
    { step: 1, title: "Filing Complaint", description: "Written complaint within 3 months of incident (extendable by 3 months)", timeline: "Within 3-6 months" },
    { step: 2, title: "Conciliation", description: "ICC may attempt conciliation at complainant's request (no monetary settlement)", timeline: "Optional" },
    { step: 3, title: "Inquiry", description: "Formal inquiry following principles of natural justice", timeline: "90 days" },
    { step: 4, title: "Report Submission", description: "ICC submits report with recommendations to employer", timeline: "10 days after inquiry" },
    { step: 5, title: "Action by Employer", description: "Employer must act on ICC recommendations", timeline: "60 days" }
  ];

  const penaltiesData = [
    { offense: "First offense of non-compliance", penalty: "Fine up to ₹50,000" },
    { offense: "Repeated non-compliance", penalty: "Double the penalty + License cancellation" },
    { offense: "Failure to constitute ICC", penalty: "Fine up to ₹50,000" },
    { offense: "Non-submission of annual report", penalty: "Fine up to ₹50,000" },
    { offense: "False or malicious complaint", penalty: "Action as per service rules" }
  ];

  return (
    <div className="space-y-6">
      {/* Header Alert */}
      <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <AlertTitle className="text-red-700">Mandatory Compliance</AlertTitle>
        <AlertDescription className="text-red-600">
          The Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 
          is mandatory for all organizations with 10 or more employees.
        </AlertDescription>
      </Alert>

      {/* Key Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-red-500" />
              <h4 className="font-semibold">Applicability</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Organizations with <strong>10 or more employees</strong> including temporary, 
              contractual, and part-time workers.
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <h4 className="font-semibold">Coverage</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              All women employees, including those visiting the workplace 
              (clients, customers, apprentices, interns).
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="h-5 w-5 text-green-500" />
              <h4 className="font-semibold">Enforcement</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              District Officer appointed by State Government monitors compliance 
              and receives annual reports.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ICC Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Internal Complaints Committee (ICC) Requirements
          </CardTitle>
          <CardDescription>
            Every organization must constitute an ICC at each office/branch with 10+ employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium">Role</th>
                  <th className="text-left py-3 px-4 font-medium">Requirement</th>
                  <th className="text-center py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {iccRequirements.map((req, index) => (
                  <tr key={index} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium">{req.role}</td>
                    <td className="py-3 px-4 text-muted-foreground">{req.requirement}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={req.mandatory ? "destructive" : "secondary"}>
                        {req.mandatory ? "Mandatory" : "Optional"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Key ICC Responsibilities
            </h5>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                Receive and process complaints
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                Conduct fair and impartial inquiry
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                Maintain confidentiality
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                Submit recommendations to employer
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                Prepare annual report
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                Conduct awareness programs
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Complaint Process */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Complaint & Inquiry Process
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {complaintProcess.map((step, index) => (
              <div key={index} className="flex gap-4 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </div>
                  {index < complaintProcess.length - 1 && (
                    <div className="w-0.5 h-full bg-border mt-2" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{step.title}</h4>
                    <Badge variant="outline" className="text-xs">{step.timeline}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Employer Obligations */}
      <Card>
        <CardHeader>
          <CardTitle>Employer Obligations</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Policy & Awareness</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Formulate and widely disseminate POSH policy</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Display penal consequences at conspicuous places</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Organize regular awareness and sensitization programs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Include POSH in induction/orientation programs</span>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>ICC Support & Action</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Provide necessary facilities to ICC for conducting inquiry</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Assist in securing attendance of respondent and witnesses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Act on ICC recommendations within 60 days</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Provide interim relief as recommended by ICC</span>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Annual Compliance</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Submit annual report to District Officer by January 31</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Include POSH compliance in Annual Report (if applicable)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Maintain records of all complaints and actions for 3 years</span>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Penalties */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Penalties for Non-Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-red-50 dark:bg-red-950/20">
                  <th className="text-left py-3 px-4 font-medium">Offense</th>
                  <th className="text-left py-3 px-4 font-medium">Penalty</th>
                </tr>
              </thead>
              <tbody>
                {penaltiesData.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4">{item.offense}</td>
                    <td className="py-3 px-4 font-medium text-red-600">{item.penalty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Resources & Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
              <Download className="h-5 w-5" />
              <span className="text-sm">POSH Policy Template</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
              <Download className="h-5 w-5" />
              <span className="text-sm">ICC Formation Guidelines</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              <span className="text-sm">Ministry of WCD Portal</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
