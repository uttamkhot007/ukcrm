import { useState, useEffect } from "react";
import { Users, UserCog, Key, Monitor, Shield, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeesManagement } from "./users/EmployeesManagement";
import { ContractorsManagement } from "./users/ContractorsManagement";
import { RolesManagement } from "./users/RolesManagement";
import { CredentialsManagement } from "./users/CredentialsManagement";
import { ConsoleAccessManagement } from "./users/ConsoleAccessManagement";
import { UsersImport } from "./users/UsersImport";

interface UserAccessManagementProps {
  defaultTab?: string;
}

export function UserAccessManagement({ defaultTab = "employees" }: UserAccessManagementProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">User & Access Management</h2>
          <p className="text-muted-foreground text-sm">
            Manage users, roles, credentials, and portal access
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-4xl grid-cols-6">
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="contractors" className="flex items-center gap-2">
            <UserCog className="w-4 h-4" />
            Contractors
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="credentials" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="console" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Console Access
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <EmployeesManagement />
        </TabsContent>

        <TabsContent value="contractors">
          <ContractorsManagement />
        </TabsContent>

        <TabsContent value="roles">
          <RolesManagement />
        </TabsContent>

        <TabsContent value="credentials">
          <CredentialsManagement />
        </TabsContent>

        <TabsContent value="console">
          <ConsoleAccessManagement />
        </TabsContent>

        <TabsContent value="import">
          <UsersImport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
