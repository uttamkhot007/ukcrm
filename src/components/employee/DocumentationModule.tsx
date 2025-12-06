import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  BookOpen, 
  Search, 
  FileText, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Laptop,
  Mail,
  Calendar,
  CreditCard,
  Shield,
  Building2,
  Phone
} from "lucide-react";

interface SOPStep {
  step: number;
  title: string;
  description: string;
  tips?: string;
}

interface SOP {
  id: string;
  title: string;
  category: string;
  description: string;
  estimatedTime: string;
  difficulty: "easy" | "medium" | "advanced";
  icon: React.ElementType;
  steps: SOPStep[];
}

const sops: SOP[] = [
  {
    id: "leave-request",
    title: "Submitting a Leave Request",
    category: "HR Processes",
    description: "Step-by-step guide to submit leave requests through the employee portal",
    estimatedTime: "5 mins",
    difficulty: "easy",
    icon: Calendar,
    steps: [
      { step: 1, title: "Access Employee Portal", description: "Navigate to Employee Portal > My Requests from the sidebar", tips: "Make sure you're logged into your account" },
      { step: 2, title: "Click New Request", description: "Click the 'New Request' button at the top right corner of the page" },
      { step: 3, title: "Select Request Type", description: "Choose 'Leave' from the request type dropdown menu" },
      { step: 4, title: "Fill Leave Details", description: "Enter the leave type (Annual, Sick, etc.), start date, end date, and reason for leave" },
      { step: 5, title: "Submit Request", description: "Review your details and click 'Submit Request'. You'll receive a confirmation notification", tips: "You can track the status in 'My Requests'" },
    ],
  },
  {
    id: "expense-reimbursement",
    title: "Expense Reimbursement Process",
    category: "Finance",
    description: "How to submit expense claims and get reimbursements",
    estimatedTime: "10 mins",
    difficulty: "medium",
    icon: CreditCard,
    steps: [
      { step: 1, title: "Gather Documentation", description: "Collect all receipts and invoices for expenses to be reimbursed", tips: "Ensure receipts are clear and show date, vendor, and amount" },
      { step: 2, title: "Create New Request", description: "Go to Employee Portal > My Requests and click 'New Request'" },
      { step: 3, title: "Select Advance Salary/Expense", description: "Choose the appropriate expense category from the dropdown" },
      { step: 4, title: "Enter Expense Details", description: "Fill in the amount, date of expense, category, and attach supporting documents" },
      { step: 5, title: "Submit for Approval", description: "Review all information and submit. The request will go to your manager for approval" },
      { step: 6, title: "Track Reimbursement", description: "Monitor the status in your requests dashboard. Finance will process within 5-7 business days after approval" },
    ],
  },
  {
    id: "hardware-request",
    title: "Requesting New Hardware",
    category: "IT",
    description: "Process to request new hardware equipment or replacements",
    estimatedTime: "15 mins",
    difficulty: "medium",
    icon: Laptop,
    steps: [
      { step: 1, title: "Assess Your Need", description: "Determine what hardware you need and why (new role, upgrade, replacement, etc.)" },
      { step: 2, title: "Submit Hardware Request", description: "Navigate to Employee Portal > My Requests and select 'New Hardware' as request type" },
      { step: 3, title: "Specify Hardware Details", description: "Describe the hardware needed, specifications required, and business justification" },
      { step: 4, title: "Manager Approval", description: "Your manager will review and approve based on budget and necessity" },
      { step: 5, title: "IT Review", description: "IT team reviews compatibility and availability. They may contact you for alternatives" },
      { step: 6, title: "Procurement & Delivery", description: "Once approved, IT procures and sets up the hardware. You'll be notified when ready for pickup/delivery" },
    ],
  },
  {
    id: "onboarding-new-hire",
    title: "New Employee Onboarding",
    category: "HR Processes",
    description: "Complete onboarding checklist for new team members",
    estimatedTime: "2-3 days",
    difficulty: "advanced",
    icon: Users,
    steps: [
      { step: 1, title: "Complete HR Documentation", description: "Fill out all required HR forms including tax forms, emergency contacts, and policy acknowledgments" },
      { step: 2, title: "Setup System Access", description: "Work with IT to get email, system credentials, and required software access" },
      { step: 3, title: "Complete Profile", description: "Update your employee profile with personal details, profile photo, and professional information" },
      { step: 4, title: "Attend Orientation", description: "Join the new hire orientation session to learn about company culture, values, and policies" },
      { step: 5, title: "Meet Your Team", description: "Schedule introductory meetings with team members and key stakeholders" },
      { step: 6, title: "Complete Training", description: "Finish all mandatory training modules in the Training section of Employee Portal" },
      { step: 7, title: "30-Day Check-in", description: "Schedule a check-in with your manager to discuss progress and any concerns" },
    ],
  },
  {
    id: "password-reset",
    title: "Password Reset & Account Recovery",
    category: "IT",
    description: "How to reset your password or recover account access",
    estimatedTime: "5 mins",
    difficulty: "easy",
    icon: Shield,
    steps: [
      { step: 1, title: "Access Login Page", description: "Go to the application login page" },
      { step: 2, title: "Click Forgot Password", description: "Click the 'Forgot Password' link below the login form" },
      { step: 3, title: "Enter Your Email", description: "Enter your registered work email address" },
      { step: 4, title: "Check Email", description: "Open the password reset email (check spam folder if not in inbox)" },
      { step: 5, title: "Create New Password", description: "Follow the link and create a new strong password meeting security requirements", tips: "Password must be at least 8 characters with upper, lower, number, and special character" },
    ],
  },
  {
    id: "contact-management",
    title: "Managing Customer Contacts",
    category: "Sales",
    description: "How to add, update, and manage customer contacts in the CRM",
    estimatedTime: "10 mins",
    difficulty: "medium",
    icon: Phone,
    steps: [
      { step: 1, title: "Navigate to Contacts", description: "Click on 'Contacts' in the sidebar navigation" },
      { step: 2, title: "Add New Contact", description: "Click 'Add Contact' button and fill in customer details" },
      { step: 3, title: "Enter Contact Information", description: "Fill name, email, phone, company, and designation fields" },
      { step: 4, title: "Add Notes", description: "Include any relevant notes about the contact or relationship" },
      { step: 5, title: "Link to Deals", description: "Associate the contact with relevant deals for better tracking" },
      { step: 6, title: "Save Contact", description: "Review and save the contact. They'll appear in your contacts list" },
    ],
  },
  {
    id: "meeting-room-booking",
    title: "Meeting Room Booking",
    category: "Office Management",
    description: "How to book meeting rooms and conference spaces",
    estimatedTime: "5 mins",
    difficulty: "easy",
    icon: Building2,
    steps: [
      { step: 1, title: "Check Availability", description: "View the meeting room calendar to check availability for your desired time slot" },
      { step: 2, title: "Select Room", description: "Choose the appropriate room based on capacity and equipment needs" },
      { step: 3, title: "Book Time Slot", description: "Select your meeting date and time, typically in 30-minute increments" },
      { step: 4, title: "Add Meeting Details", description: "Enter meeting title, attendees, and any special requirements (projector, video conference, etc.)" },
      { step: 5, title: "Confirm Booking", description: "Save the booking. Attendees will receive calendar invites automatically" },
    ],
  },
  {
    id: "email-signature-setup",
    title: "Setting Up Email Signature",
    category: "IT",
    description: "Configure your professional email signature",
    estimatedTime: "10 mins",
    difficulty: "easy",
    icon: Mail,
    steps: [
      { step: 1, title: "Access Email Settings", description: "Open your email client and go to Settings > Signatures" },
      { step: 2, title: "Copy Signature Template", description: "Get the company-approved signature template from the IT/HR shared folder" },
      { step: 3, title: "Personalize Your Signature", description: "Replace placeholder text with your name, title, phone number, and other details" },
      { step: 4, title: "Add Company Logo", description: "Insert the company logo image using the provided link" },
      { step: 5, title: "Set as Default", description: "Set this signature as your default for new emails and replies" },
      { step: 6, title: "Test Signature", description: "Send a test email to yourself to verify the signature appears correctly" },
    ],
  },
];

const categories = ["All", "HR Processes", "IT", "Finance", "Sales", "Office Management"];

export function DocumentationModule() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSOP, setSelectedSOP] = useState<SOP | null>(null);

  const filteredSOPs = sops.filter(sop => {
    const matchesSearch = sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sop.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || sop.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-500/10 text-green-500";
      case "medium": return "bg-amber-500/10 text-amber-500";
      case "advanced": return "bg-red-500/10 text-red-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (selectedSOP) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="ghost" size="sm" onClick={() => setSelectedSOP(null)}>
            <BookOpen className="w-4 h-4 mr-1" />
            Documentation
          </Button>
          <ChevronRight className="w-4 h-4" />
          <span>{selectedSOP.category}</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">{selectedSOP.title}</span>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <selectedSOP.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{selectedSOP.title}</CardTitle>
                <CardDescription className="mt-1">{selectedSOP.description}</CardDescription>
                <div className="flex gap-3 mt-3">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {selectedSOP.estimatedTime}
                  </Badge>
                  <Badge className={getDifficultyColor(selectedSOP.difficulty)}>
                    {selectedSOP.difficulty}
                  </Badge>
                  <Badge variant="secondary">{selectedSOP.category}</Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {selectedSOP.steps.map((step, index) => (
                <div key={step.step} className="relative">
                  {index < selectedSOP.steps.length - 1 && (
                    <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border" />
                  )}
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 z-10">
                      <span className="text-sm font-bold text-primary">{step.step}</span>
                    </div>
                    <div className="flex-1 pb-6">
                      <h4 className="font-semibold text-lg">{step.title}</h4>
                      <p className="text-muted-foreground mt-1">{step.description}</p>
                      {step.tips && (
                        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-amber-600 dark:text-amber-400">{step.tips}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium text-green-600 dark:text-green-400">Process Complete!</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Documentation & SOPs</h1>
          <p className="text-muted-foreground">Step-by-step guides for common processes and procedures</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList>
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-sm">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSOPs.map(sop => (
          <Card 
            key={sop.id} 
            className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
            onClick={() => setSelectedSOP(sop)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <sop.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base line-clamp-2">{sop.title}</CardTitle>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {sop.category}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {sop.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{sop.estimatedTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs", getDifficultyColor(sop.difficulty))}>
                    {sop.difficulty}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {sop.steps.length} steps
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSOPs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg">No documentation found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
