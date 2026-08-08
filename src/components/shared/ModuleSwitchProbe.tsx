/**
 * Marks the end of a sub-module switch benchmark.
 *
 * Rendered as a sibling of the module content *inside* the Suspense boundary,
 * so it only mounts once the chunk has resolved and React has committed the
 * new tree. Two nested animation frames then push the measurement to just
 * after the browser has painted, which is the moment the user perceives the
 * switch as finished — resolving the import is an implementation detail they
 * never see.
 */

import { useEffect } from "react";
import { endModuleSwitch } from "@/lib/perf-metrics";

export function ModuleSwitchProbe({ moduleId }: { moduleId: string }) {
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => endModuleSwitch(moduleId));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [moduleId]);

  return null;
}
