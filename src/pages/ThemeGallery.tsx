/**
 * Deterministic theme specimen page used by the visual regression harness
 * (`scripts/theme-visual-regression.py`).
 *
 * It renders one instance of every surface family that historically leaked dark
 * tokens into light mode — cards, glass/neon cards, tables, tabs, dialogs,
 * tooltips, charts, badges, empty states and skeletons — with no network data,
 * no animation and no random values, so screenshots are byte-stable.
 *
 * Theme is driven by query params instead of persisted preferences:
 *   /__theme?mode=light&mood=ocean&brand=blue
 *
 * The route is only registered outside production builds.
 */
import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { chartAxisProps, chartGridProps } from "@/lib/chart-theme";

const MOODS = ["default", "ocean", "forest", "sunset", "midnight", "cyber"] as const;
const BRANDS = ["emerald", "blue", "purple", "orange"] as const;

const SERIES = [
  { label: "Jan", pipeline: 42, closed: 18 },
  { label: "Feb", pipeline: 55, closed: 24 },
  { label: "Mar", pipeline: 48, closed: 31 },
  { label: "Apr", pipeline: 61, closed: 27 },
  { label: "May", pipeline: 72, closed: 39 },
];

const ROWS = [
  { deal: "Managed SOC", account: "Acme Corp", stage: "Proposal", value: "₹15,00,000" },
  { deal: "EDR Rollout", account: "Northwind", stage: "Negotiation", value: "₹8,40,000" },
  { deal: "Cloud Audit", account: "Globex", stage: "Qualified", value: "₹3,25,000" },
];

export default function ThemeGallery() {
  const [params] = useSearchParams();

  const mode = params.get("mode") === "dark" ? "dark" : "light";
  const mood = useMemo(() => {
    const value = params.get("mood") ?? "default";
    return (MOODS as readonly string[]).includes(value) ? value : "default";
  }, [params]);
  const brand = useMemo(() => {
    const value = params.get("brand") ?? "emerald";
    return (BRANDS as readonly string[]).includes(value) ? value : "emerald";
  }, [params]);

  // Apply the requested theme directly to <html>; never persist it, so running
  // the harness cannot clobber the developer's own theme preference.
  useEffect(() => {
    const root = document.documentElement;
    const previous = {
      className: root.className,
      mood: root.getAttribute("data-mood"),
      brand: root.getAttribute("data-brand"),
      colorScheme: root.style.colorScheme,
    };

    root.classList.remove("light", "dark");
    root.classList.add(mode);
    root.style.colorScheme = mode;
    if (mood === "default") root.removeAttribute("data-mood");
    else root.setAttribute("data-mood", mood);
    root.setAttribute("data-brand", brand);
    root.setAttribute("data-theme-gallery", "ready");

    return () => {
      root.className = previous.className;
      root.style.colorScheme = previous.colorScheme;
      if (previous.mood) root.setAttribute("data-mood", previous.mood);
      else root.removeAttribute("data-mood");
      if (previous.brand) root.setAttribute("data-brand", previous.brand);
      else root.removeAttribute("data-brand");
      root.removeAttribute("data-theme-gallery");
    };
  }, [mode, mood, brand]);

  return (
    <div className="min-h-screen bg-background text-foreground p-8" data-testid="theme-gallery">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Theme specimen sheet</h1>
        <p className="text-muted-foreground text-sm">
          mode={mode} · mood={mood} · brand={brand}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Standard card</CardTitle>
            <CardDescription>Muted description text on card surface.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
            <div className="flex gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <Input placeholder="Input placeholder" readOnly />
            <Progress value={64} />
          </CardContent>
        </Card>

        <div className="glass neon-card rounded-xl p-6 space-y-2">
          <h2 className="text-lg font-semibold">Glass / neon card</h2>
          <p className="text-muted-foreground text-sm">
            Glass background, border and shadow tokens.
          </p>
          <div className="bg-gradient-dark rounded-lg p-4 text-sm">Gradient surface</div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Table</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROWS.map((row) => (
                  <TableRow key={row.deal}>
                    <TableCell>{row.deal}</TableCell>
                    <TableCell>{row.account}</TableCell>
                    <TableCell>{row.stage}</TableCell>
                    <TableCell>{row.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tabs</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="one">
              <TabsList>
                <TabsTrigger value="one">Overview</TabsTrigger>
                <TabsTrigger value="two">Pipeline</TabsTrigger>
                <TabsTrigger value="three">Insights</TabsTrigger>
              </TabsList>
              <TabsContent value="one" className="text-sm text-muted-foreground pt-3">
                Tab panel content on background surface.
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bar chart</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SERIES}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="label" {...chartAxisProps} />
                <YAxis {...chartAxisProps} />
                <Bar dataKey="pipeline" fill="hsl(var(--primary))" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Line chart</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SERIES}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="label" {...chartAxisProps} />
                <YAxis {...chartAxisProps} />
                <Line
                  type="monotone"
                  dataKey="closed"
                  stroke="hsl(var(--primary))"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inline replica of dialog/tooltip surfaces so no portal timing is involved. */}
        <div className="rounded-lg border bg-popover text-popover-foreground p-6 space-y-2">
          <h3 className="font-semibold">Popover / dialog surface</h3>
          <p className="text-sm text-muted-foreground">Popover foreground on popover background.</p>
          <div className="inline-flex rounded-md border bg-popover px-3 py-1.5 text-xs shadow-md">
            Tooltip content
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Empty state &amp; skeletons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No records yet
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
