import { cn } from "@/lib/utils";

interface FunnelStage {
  name: string;
  value: number;
  amount: string;
  color: string;
}

const stages: FunnelStage[] = [
  { name: "Leads", value: 2500, amount: "$12.5M", color: "bg-sales/20" },
  { name: "Qualified", value: 1800, amount: "$9.2M", color: "bg-sales/40" },
  { name: "Proposal", value: 850, amount: "$5.8M", color: "bg-sales/60" },
  { name: "Negotiation", value: 420, amount: "$3.2M", color: "bg-sales/80" },
  { name: "Closed Won", value: 280, amount: "$2.1M", color: "bg-sales" },
];

export function SalesFunnel() {
  const maxValue = stages[0].value;

  return (
    <div className="glass rounded-xl p-6 border border-border animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Sales Funnel</h3>
        <select className="text-sm bg-muted border border-border rounded-lg px-3 py-1.5 text-muted-foreground">
          <option>This Quarter</option>
          <option>Last Quarter</option>
          <option>This Year</option>
        </select>
      </div>

      <div className="space-y-3">
        {stages.map((stage, index) => {
          const width = (stage.value / maxValue) * 100;

          return (
            <div key={stage.name} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-foreground">
                  {stage.name}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {stage.value.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-sales">
                    {stage.amount}
                  </span>
                </div>
              </div>
              <div className="h-8 bg-muted/30 rounded-lg overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-lg transition-all duration-500 group-hover:opacity-80",
                    stage.color
                  )}
                  style={{
                    width: `${width}%`,
                    transitionDelay: `${index * 100}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Conversion Rate
          </span>
          <span className="text-lg font-bold text-sales">11.2%</span>
        </div>
      </div>
    </div>
  );
}
