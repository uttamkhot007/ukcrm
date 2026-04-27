import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, 
  Search, 
  Download, 
  Settings, 
  Server, 
  AlertTriangle, 
  Layers,
  Database,
  Shield,
  Globe,
  Terminal,
  CheckCircle2,
  Copy,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DocSection {
  id: string;
  title: string;
  content: string;
  code?: string;
}

const installationDocs: DocSection[] = [
  {
    id: "prerequisites",
    title: "Prerequisites",
    content: `Before installing NexusCRM, ensure you have the following:
    
• Node.js 18.x or higher
• npm 9.x or higher (or pnpm/yarn)
• Git installed on your system
• A Supabase account for backend services
• Modern web browser (Chrome, Firefox, Safari, Edge)`,
  },
  {
    id: "clone-repo",
    title: "Clone Repository",
    content: "Clone the NexusCRM repository from your organization's Git server:",
    code: `git clone https://github.com/your-org/nexuscrm.git
cd nexuscrm`,
  },
  {
    id: "install-deps",
    title: "Install Dependencies",
    content: "Install all required npm packages:",
    code: `npm install
# or using pnpm
pnpm install`,
  },
  {
    id: "env-setup",
    title: "Environment Setup",
    content: "Create a .env file in the root directory pointing at your self-hosted backend:",
    code: `# Frontend
VITE_API_URL=http://localhost:3001

# Backend (in backend/.env)
DB_HOST=localhost
DB_NAME=nexuscrm
DB_USER=nexuscrm
DB_PASSWORD=changeme
COGNITO_USER_POOL_ID=ap-south-1_XXXX
COGNITO_CLIENT_ID=XXXX
S3_BUCKET=nexuscrm-uploads`,
  },
  {
    id: "start-dev",
    title: "Start Development Server",
    content: "Run the development server to start working locally:",
    code: `npm run dev
# Application will be available at http://localhost:5173`,
  },
];

const configurationDocs: DocSection[] = [
  {
    id: "database-config",
    title: "Database Configuration",
    content: `NexusCRM uses Supabase PostgreSQL as its database. Key tables include:

• profiles - User profile information
• contacts - Customer/client contacts
• deals - Sales pipeline deals
• employee_requests - Employee requests (leave, WFH, etc.)
• attendance - Employee attendance records
• notifications - In-app notifications

Row Level Security (RLS) is enabled on all tables to ensure data isolation.`,
  },
  {
    id: "auth-config",
    title: "Authentication Configuration",
    content: `Authentication is handled by Supabase Auth with the following settings:

• Email/Password authentication enabled
• Auto-confirm email enabled for development
• JWT token expiration: 1 hour
• Refresh token enabled for persistent sessions

User roles are managed in the user_roles table with three levels:
- admin: Full system access
- manager: Department-level access
- employee: Personal data access only`,
  },
  {
    id: "email-config",
    title: "Email Configuration",
    content: `For email notifications and alerts, configure the RESEND_API_KEY in your Supabase secrets:`,
    code: `# In Supabase Dashboard > Settings > Secrets
RESEND_API_KEY=re_xxxxxxxxxx`,
  },
  {
    id: "storage-config",
    title: "File Storage Configuration",
    content: `Supabase Storage is used for file uploads. Configure storage buckets as needed:

• documents - For legal and compliance documents
• avatars - User profile pictures
• attachments - Request attachments

Set appropriate RLS policies on storage buckets to control access.`,
  },
  {
    id: "attendance-config",
    title: "Attendance Settings",
    content: `Attendance tracking is configurable in Admin Center > Attendance tab:

• Work Start Time: Default 9:00 AM
• Work End Time: Default 6:00 PM
• Late Threshold: Minutes after start time before marking late
• Early Departure Threshold: Minutes before end time
• Alert settings for managers`,
  },
];

const deploymentDocs: DocSection[] = [
  {
    id: "build-production",
    title: "Build for Production",
    content: "Create an optimized production build:",
    code: `npm run build
# Output will be in the 'dist' folder`,
  },
  {
    id: "aws-deploy",
    title: "Deploy to AWS",
    content: `Production deployments target AWS:

1. Push to the main branch — GitHub Actions builds the Docker image
2. Image is pushed to Amazon ECR
3. ECS Fargate service performs a rolling update
4. The Application Load Balancer routes traffic to the new task set

See DEPLOYMENT.md for the full AWS runbook (Cognito, RDS, ECS, S3, SES).`,
  },
  {
    id: "self-hosting",
    title: "Self-Hosting Options",
    content: `For self-hosted deployments, you can use:

• Vercel - Connect your GitHub repo for automatic deployments
• Netlify - Similar to Vercel with built-in forms
• Docker - Containerized deployment for on-premise
• Traditional hosting - Upload dist folder to any static host

Ensure environment variables are configured on your hosting platform.`,
    code: `# Docker deployment example
docker build -t nexuscrm .
docker run -p 80:80 nexuscrm`,
  },
  {
    id: "backend-deploy",
    title: "Backend Deployment",
    content: `The Fastify backend ships as a Docker image and is deployed to AWS ECS Fargate via the GitHub Actions workflow. To deploy locally:`,
    code: `# Build and push the backend image
docker build -t nexuscrm-backend ./backend
docker push <your-ecr-repo>/nexuscrm-backend:latest

# Force a new ECS deployment
aws ecs update-service --cluster <cluster> --service <env>-backend --force-new-deployment`,
  },
  {
    id: "database-migrations",
    title: "Database Migrations",
    content: `Database changes are managed through Knex.js migrations under backend/src/db/migrations. Migrations run automatically as a one-shot ECS task during deploy. For manual runs:`,
    code: `# Apply pending migrations
cd backend
npm run migrate

# Roll back the last batch
npm run migrate:rollback`,
  },
];

const troubleshootingDocs: DocSection[] = [
  {
    id: "auth-issues",
    title: "Authentication Issues",
    content: `Common authentication problems and solutions:

**Problem**: Users can't log in
- Check Supabase URL and anon key in .env
- Verify email confirmation is disabled for development
- Check browser console for specific errors

**Problem**: Session expires too quickly
- Ensure autoRefreshToken is enabled in Supabase client
- Check JWT expiration settings in Supabase dashboard

**Problem**: "Invalid credentials" error
- Verify user exists in auth.users table
- Check password requirements
- Clear browser cache and try again`,
  },
  {
    id: "rls-issues",
    title: "Row Level Security (RLS) Errors",
    content: `If users can't access or modify data:

**"new row violates row-level security policy"**
- Check RLS policies for the table
- Ensure user has correct role/permissions
- Verify auth.uid() is being passed correctly

**Debug steps:**
1. Check Supabase logs for specific policy violations
2. Temporarily disable RLS to isolate the issue
3. Review policy expressions for logic errors`,
  },
  {
    id: "build-errors",
    title: "Build & Deployment Errors",
    content: `Common build issues:

**TypeScript errors**
- Run 'npm run typecheck' to see all errors
- Check for missing type definitions
- Ensure all imports are correct

**Missing environment variables**
- Verify all VITE_ prefixed variables are set
- Check for typos in variable names
- Restart dev server after changing .env

**Out of memory errors**
- Increase Node memory: NODE_OPTIONS="--max-old-space-size=4096"
- Clear node_modules and reinstall`,
  },
  {
    id: "performance-issues",
    title: "Performance Issues",
    content: `If the application is slow:

**Database queries slow**
- Add appropriate indexes to frequently queried columns
- Review query patterns and optimize N+1 queries
- Consider pagination for large datasets

**UI rendering slow**
- Check for unnecessary re-renders using React DevTools
- Memoize expensive computations with useMemo
- Lazy load components and routes

**API timeouts**
- Increase timeout in edge function config
- Optimize database queries
- Consider caching frequently accessed data`,
  },
  {
    id: "integration-issues",
    title: "Integration Issues",
    content: `Third-party integration problems:

**HubSpot sync failing**
- Verify API key is correct and not expired
- Check rate limits (100 requests/10 seconds)
- Review HubSpot API changelog for breaking changes

**Office 365 connection issues**
- Ensure OAuth redirect URIs are configured
- Check Azure AD app permissions
- Verify tenant ID is correct`,
  },
];

const architectureDocs = {
  overview: `
## NexusCRM High-Level Architecture

NexusCRM is built on a modern, scalable architecture using the following core technologies:

### Frontend Stack
- **React 18** - UI library with concurrent features
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **Shadcn/UI** - Accessible component library
- **TanStack Query** - Data fetching and caching
- **React Router** - Client-side routing

### Backend Stack (Self-hosted on AWS)
- **Fastify** - High-performance Node.js HTTP server
- **AWS Aurora PostgreSQL** - Primary database
- **AWS Cognito** - Authentication and user pools
- **AWS S3** - File storage with presigned URLs
- **ElastiCache (Valkey)** - BullMQ queues + realtime pub/sub

### Security
- Row Level Security (RLS) on all tables
- JWT-based authentication
- Role-based access control (RBAC)
- HTTPS encryption in transit
`,
  dataFlow: `
## Data Flow

1. **User Authentication**
   - User submits credentials
   - Supabase Auth validates and returns JWT
   - Client stores token in localStorage
   - All subsequent requests include JWT

2. **Data Operations**
   - Client makes request via Supabase SDK
   - RLS policies verify user permissions
   - PostgreSQL executes query
   - Results returned to client
   - TanStack Query caches response

3. **Real-time Updates**
   - Client subscribes to channel
   - Database changes trigger notifications
   - WebSocket pushes updates to client
   - UI updates automatically

4. **Background Jobs**
   - Scheduled checks run via edge functions
   - Cron jobs for renewal notifications
   - Automated workflow triggers
`,
  modules: `
## Module Overview

### Sales Module
- Deals pipeline (Kanban view)
- Lead tracking
- Quotation management
- Contact management

### Employee Portal
- Attendance tracking
- Leave & request management
- Events & celebrations
- Documentation & SOPs

### Admin Center
- Organization settings
- User & role management
- Integrations configuration
- Attendance rules

### Help Desk
- Ticket management
- SLA tracking
- Escalation workflows

### Billing
- Invoice generation
- Payment tracking
- Recurring billing

### Compliance
- Framework management
- Control tracking
- Assessment scheduling
`,
};

export function AdminDocumentation() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("installation");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const renderDocSections = (sections: DocSection[]) => {
    const filteredSections = sections.filter(
      section =>
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <Accordion type="single" collapsible className="w-full" defaultValue={sections[0]?.id}>
        {filteredSections.map(section => (
          <AccordionItem key={section.id} value={section.id}>
            <AccordionTrigger className="text-left">
              <span className="font-medium">{section.title}</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground whitespace-pre-line">
                  {section.content}
                </div>
                {section.code && (
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{section.code}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => copyToClipboard(section.code!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  };

  return (
    <div className="space-y-6">
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="installation" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Installation
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="deployment" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Deployment
          </TabsTrigger>
          <TabsTrigger value="troubleshooting" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Troubleshooting
          </TabsTrigger>
          <TabsTrigger value="architecture" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Architecture
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Installation Guide
              </CardTitle>
              <CardDescription>
                Step-by-step instructions to set up NexusCRM in your development environment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderDocSections(installationDocs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuration Guide
              </CardTitle>
              <CardDescription>
                Configure database, authentication, and application settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderDocSections(configurationDocs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Deployment Guide
              </CardTitle>
              <CardDescription>
                Deploy NexusCRM to production environments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderDocSections(deploymentDocs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troubleshooting">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Troubleshooting Guide
              </CardTitle>
              <CardDescription>
                Common issues and their solutions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderDocSections(troubleshootingDocs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="architecture">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  High-Level Architecture
                </CardTitle>
                <CardDescription>
                  System architecture and technology stack overview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-line text-sm text-muted-foreground">
                    {architectureDocs.overview}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Data Flow & Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-line text-sm text-muted-foreground">
                    {architectureDocs.dataFlow}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Module Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-line text-sm text-muted-foreground">
                    {architectureDocs.modules}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
