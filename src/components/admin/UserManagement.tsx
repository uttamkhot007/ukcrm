import { useState } from "react";
import { Users, UserCog } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeesManagement } from "./users/EmployeesManagement";
import { ContractorsManagement } from "./users/ContractorsManagement";

export function UserManagement() {
  const [activeTab, setActiveTab] = useState("employees");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">User Management</h2>
          <p className="text-muted-foreground text-sm">
            Manage employees and contractors
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="contractors" className="flex items-center gap-2">
            <UserCog className="w-4 h-4" />
            Contractors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <EmployeesManagement />
        </TabsContent>

        <TabsContent value="contractors">
          <ContractorsManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
