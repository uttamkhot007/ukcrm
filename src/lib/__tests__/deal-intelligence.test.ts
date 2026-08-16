import { describe, expect, it } from "vitest";
import { analyzeDeal, levelFromScore, summarize, type IntelligenceDeal } from "../deal-intelligence";

const NOW = new Date("2026-06-01T00:00:00.000Z");

function makeDeal(overrides: Partial<IntelligenceDeal> = {}): IntelligenceDeal {
  return {
    id: "d1",
    title: "Managed SOC",
    value: 100000,
    stage: "qualified",
    probability: 50,
    expected_close_date: "2026-08-01",
    updated_at: "2026-05-28T00:00:00.000Z",
    created_at: "2026-04-01T00:00:00.000Z",
    next_steps: "Technical workshop on the 5th",
    contact_id: "c1",
    meddic_metrics: "20% SOC cost reduction",
    meddic_economic_buyer: "CFO",
    meddic_decision_criteria: "SLA and price",
    meddic_decision_process: "Board approval",
    meddic_identify_pain: "No 24x7 coverage",
    meddic_champion: "Head of IT",
    ...overrides,
  };
}

describe("analyzeDeal", () => {
  it("marks a fully qualified, freshly touched deal as healthy", () => {
    const result = analyzeDeal(makeDeal(), NOW);
    expect(result.level).toBe("healthy");
    expect(result.meddicGaps).toHaveLength(0);
    expect(result.actions[0].code).toBe("advance");
  });

  it("flags a stalled deal and recommends re-engagement", () => {
    const result = analyzeDeal(makeDeal({ updated_at: "2026-03-01T00:00:00.000Z" }), NOW);
    expect(result.factors.some((f) => f.code === "stalled")).toBe(true);
    expect(result.actions.some((a) => a.code === "re_engage")).toBe(true);
    expect(result.daysSinceActivity).toBeGreaterThan(80);
  });

  it("flags a slipped close date", () => {
    const result = analyzeDeal(makeDeal({ expected_close_date: "2026-04-01" }), NOW);
    expect(result.factors.some((f) => f.code === "close_date_past")).toBe(true);
    expect(result.actions[0].code).toBe("reset_close_date");
  });

  it("treats blank or trivial MEDDIC entries as gaps", () => {
    const result = analyzeDeal(makeDeal({ meddic_champion: "  ", meddic_economic_buyer: "x" }), NOW);
    expect(result.meddicGaps).toContain("Champion");
    expect(result.meddicGaps).toContain("Economic Buyer");
    expect(result.actions.some((a) => a.code === "find_eb")).toBe(true);
  });

  it("escalates late-stage deals with weak qualification", () => {
    const result = analyzeDeal(
      makeDeal({
        stage: "negotiation",
        probability: 20,
        meddic_champion: "",
        meddic_economic_buyer: "",
        meddic_decision_process: "",
        updated_at: "2026-04-01T00:00:00.000Z",
        expected_close_date: "2026-05-01",
      }),
      NOW,
    );
    expect(result.level).toBe("critical");
    expect(result.valueAtRisk).toBeGreaterThan(0);
  });

  it("computes value at risk proportional to the score", () => {
    const result = analyzeDeal(makeDeal({ value: 1000, expected_close_date: null }), NOW);
    expect(result.valueAtRisk).toBe(Math.round((1000 * result.riskScore) / 100));
  });
});

describe("levelFromScore", () => {
  it("maps score bands", () => {
    expect(levelFromScore(0)).toBe("healthy");
    expect(levelFromScore(30)).toBe("watch");
    expect(levelFromScore(50)).toBe("at_risk");
    expect(levelFromScore(80)).toBe("critical");
  });
});

describe("summarize", () => {
  it("aggregates levels and top actions", () => {
    const deals = [
      makeDeal({ id: "a" }),
      makeDeal({ id: "b", updated_at: "2026-01-01T00:00:00.000Z" }),
    ];
    const results = deals.map((d) => analyzeDeal(d, NOW));
    const summary = summarize(results, deals);
    expect(summary.total).toBe(2);
    expect(summary.totalValue).toBe(200000);
    expect(summary.topActions.length).toBeGreaterThan(0);
  });
});
