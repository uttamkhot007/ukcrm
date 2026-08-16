import { describe, expect, it } from "vitest";
import { BUILD_TIME } from "@/lib/build-info";
import { compareServedBuild, type ServedBuild } from "@/lib/build-cache-strategy";

function release(buildTime: string): ServedBuild {
  return { buildTime, commit: null, id: `?|${buildTime}` };
}

describe("release coherence ordering", () => {
  it("allows an upgrade when the server release is newer", () => {
    const newer = new Date(Date.parse(BUILD_TIME) + 60_000).toISOString();
    expect(compareServedBuild(release(newer))).toBe("newer");
  });

  it("blocks a downgrade when a lagging target serves an older release", () => {
    const older = new Date(Date.parse(BUILD_TIME) - 60_000).toISOString();
    expect(compareServedBuild(release(older))).toBe("older");
  });

  it("does not act when release ordering cannot be established", () => {
    expect(compareServedBuild({ buildTime: null, commit: "other", id: "other|?" })).toBe("different");
    expect(compareServedBuild({ buildTime: null, commit: null, id: null })).toBe("unknown");
  });
});