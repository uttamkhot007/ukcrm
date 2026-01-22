import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BookOpen, 
  FileText, 
  Calculator, 
  Warehouse, 
  Building2,
  Receipt,
  BarChart3,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Banknote,
  FileSpreadsheet,
  Wallet,
  QrCode,
  Truck,
  Percent,
  Target,
  PieChart
} from "lucide-react";
import { ChartOfAccounts } from "./ChartOfAccounts";
import { VoucherEntry } from "./VoucherEntry";
import { DayBook } from "./DayBook";
import { CashBook } from "./CashBook";
import { BankBook } from "./BankBook";
import { TrialBalance } from "./TrialBalance";
import { ProfitAndLoss } from "./ProfitAndLoss";
import { BalanceSheet } from "./BalanceSheet";
import { GSTModule } from "./GSTModule";
import { InventoryModule } from "./InventoryModule";
import { BankReconciliation } from "./BankReconciliation";
import { CashFlowStatement } from "./CashFlowStatement";
import { EInvoicingModule } from "./EInvoicingModule";
import { EWayBillModule } from "./EWayBillModule";
import { TDSTCSModule } from "./TDSTCSModule";
import { EstimatesModule } from "./EstimatesModule";
import { BudgetManagement } from "./BudgetManagement";
import { RatioAnalysis } from "./RatioAnalysis";

interface TallyModuleProps {
  initialTab?: string;
}

export function TallyModule({ initialTab = "dashboard" }: TallyModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const quickActions = [
    { id: "voucher", label: "New Voucher", icon: FileText, color: "bg-blue-500" },
    { id: "ledger", label: "Create Ledger", icon: BookOpen, color: "bg-green-500" },
    { id: "estimate", label: "New Estimate", icon: FileText, color: "bg-purple-500" },
    { id: "gst", label: "GST Returns", icon: Receipt, color: "bg-orange-500" },
  ];

  const modules = [
    // Core Accounting
    { id: "chart-of-accounts", label: "Chart of Accounts", icon: BookOpen },
    { id: "voucher-entry", label: "Voucher Entry", icon: FileText },
    { id: "estimates", label: "Estimates", icon: FileText },
    // Books & Registers
    { id: "day-book", label: "Day Book", icon: FileSpreadsheet },
    { id: "cash-book", label: "Cash Book", icon: Banknote },
    { id: "bank-book", label: "Bank Book", icon: Building2 },
    { id: "bank-reconciliation", label: "Bank Reconciliation", icon: CreditCard },
    // Financial Reports
    { id: "trial-balance", label: "Trial Balance", icon: Calculator },
    { id: "profit-loss", label: "Profit & Loss", icon: TrendingUp },
    { id: "balance-sheet", label: "Balance Sheet", icon: PiggyBank },
    { id: "cash-flow", label: "Cash Flow", icon: Wallet },
    { id: "ratio-analysis", label: "Ratio Analysis", icon: PieChart },
    // Tax & Compliance
    { id: "gst", label: "GST Module", icon: Receipt },
    { id: "e-invoicing", label: "E-Invoicing", icon: QrCode },
    { id: "eway-bill", label: "E-Way Bill", icon: Truck },
    { id: "tds-tcs", label: "TDS/TCS", icon: Percent },
    // Planning
    { id: "budgets", label: "Budgets", icon: Target },
    { id: "inventory", label: "Inventory", icon: Warehouse },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
          <p className="text-muted-foreground">Complete accounting & financial management</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          {modules.map((module) => (
            <TabsTrigger key={module.id} value={module.id} className="gap-2">
              <module.icon className="h-4 w-4" />
              {module.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Card 
                key={action.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab(action.id === "voucher" ? "voucher-entry" : action.id === "ledger" ? "chart-of-accounts" : action.id === "stock" ? "inventory" : action.id)}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${action.color}`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="font-medium">{action.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Today's Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receipts</span>
                  <span className="font-medium text-green-600">₹0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payments</span>
                  <span className="font-medium text-red-600">₹0.00</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-muted-foreground">Net</span>
                  <span className="font-medium">₹0.00</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-blue-500" />
                  Cash & Bank
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash in Hand</span>
                  <span className="font-medium">₹0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank Balance</span>
                  <span className="font-medium">₹0.00</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-orange-500" />
                  GST Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GSTR-1 Due</span>
                  <span className="text-sm text-muted-foreground">11th of next month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GSTR-3B Due</span>
                  <span className="text-sm text-muted-foreground">20th of next month</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="chart-of-accounts">
          <ChartOfAccounts />
        </TabsContent>

        <TabsContent value="voucher-entry">
          <VoucherEntry />
        </TabsContent>

        <TabsContent value="day-book">
          <DayBook />
        </TabsContent>

        <TabsContent value="cash-book">
          <CashBook />
        </TabsContent>

        <TabsContent value="bank-book">
          <BankBook />
        </TabsContent>

        <TabsContent value="bank-reconciliation">
          <BankReconciliation />
        </TabsContent>

        <TabsContent value="trial-balance">
          <TrialBalance />
        </TabsContent>

        <TabsContent value="profit-loss">
          <ProfitAndLoss />
        </TabsContent>

        <TabsContent value="balance-sheet">
          <BalanceSheet />
        </TabsContent>

        <TabsContent value="gst">
          <GSTModule />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryModule />
        </TabsContent>

        <TabsContent value="cash-flow">
          <CashFlowStatement />
        </TabsContent>

        <TabsContent value="e-invoicing">
          <EInvoicingModule />
        </TabsContent>

        <TabsContent value="eway-bill">
          <EWayBillModule />
        </TabsContent>

        <TabsContent value="tds-tcs">
          <TDSTCSModule />
        </TabsContent>

        <TabsContent value="estimates">
          <EstimatesModule />
        </TabsContent>

        <TabsContent value="budgets">
          <BudgetManagement />
        </TabsContent>

        <TabsContent value="ratio-analysis">
          <RatioAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
