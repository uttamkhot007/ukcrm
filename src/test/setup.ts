// Shared Vitest setup: adds DOM matchers (toBeInTheDocument, toHaveAttribute…)
// for component tests. Safe to load in the node environment too — it only
// extends `expect`.
import "@testing-library/jest-dom/vitest";
