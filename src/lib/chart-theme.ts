/**
 * Shared Recharts theming.
 *
 * Recharts renders tooltips/axes with inline styles, so it bypasses Tailwind
 * and our semantic tokens unless we feed it explicit values. Everything here
 * resolves through CSS variables (`--popover`, `--border`, `--muted-foreground`
 * ...), which means charts follow the active theme automatically and never
 * paint navy text or dark surfaces while the white theme is active.
 *
 * Usage:
 *   <Tooltip {...chartTooltipProps} />
 *   <CartesianGrid {...chartGridProps} />
 *   <XAxis dataKey="month" {...chartAxisProps} />
 */

export const CHART_TOKENS = {
  surface: "hsl(var(--popover))",
  surfaceForeground: "hsl(var(--popover-foreground))",
  border: "hsl(var(--border))",
  muted: "hsl(var(--muted-foreground))",
  grid: "hsl(var(--border))",
  cursor: "hsl(var(--muted-foreground) / 0.15)",
  primary: "hsl(var(--primary))",
  destructive: "hsl(var(--destructive))",
  accent: "hsl(var(--accent))",
} as const;

/** Token-driven palette for multi-series charts (pies, stacked bars, ...). */
export const CHART_SERIES_COLORS = [
  "hsl(var(--chart-1, var(--primary)))",
  "hsl(var(--chart-2, var(--accent)))",
  "hsl(var(--chart-3, var(--muted-foreground)))",
  "hsl(var(--chart-4, var(--destructive)))",
  "hsl(var(--chart-5, var(--primary)))",
];

export const chartTooltipContentStyle: React.CSSProperties = {
  backgroundColor: CHART_TOKENS.surface,
  border: `1px solid ${CHART_TOKENS.border}`,
  borderRadius: 8,
  color: CHART_TOKENS.surfaceForeground,
  boxShadow: "0 8px 24px -12px hsl(var(--foreground) / 0.25)",
  fontSize: 12,
};

export const chartTooltipItemStyle: React.CSSProperties = {
  color: CHART_TOKENS.surfaceForeground,
};

export const chartTooltipLabelStyle: React.CSSProperties = {
  color: CHART_TOKENS.muted,
  fontWeight: 600,
};

/** Spread onto every Recharts <Tooltip />. */
export const chartTooltipProps = {
  contentStyle: chartTooltipContentStyle,
  itemStyle: chartTooltipItemStyle,
  labelStyle: chartTooltipLabelStyle,
  cursor: { fill: CHART_TOKENS.cursor, stroke: CHART_TOKENS.border },
  wrapperStyle: { outline: "none" } as React.CSSProperties,
};

/** Spread onto <XAxis /> / <YAxis /> so ticks and lines stay theme-aware. */
export const chartAxisProps = {
  stroke: CHART_TOKENS.muted,
  tick: { fill: CHART_TOKENS.muted, fontSize: 12 },
  tickLine: { stroke: CHART_TOKENS.border },
  axisLine: { stroke: CHART_TOKENS.border },
};

/** Spread onto <CartesianGrid /> / <PolarGrid />. */
export const chartGridProps = {
  strokeDasharray: "3 3",
  stroke: CHART_TOKENS.grid,
};

export const chartLegendStyle: React.CSSProperties = {
  color: CHART_TOKENS.muted,
  fontSize: 12,
};
