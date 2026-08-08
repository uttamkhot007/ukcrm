import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from "react";

export interface ModuleTab {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface ModuleTabsValue {
  parentId: string | null;
  parentLabel: string | null;
  tabs: ModuleTab[];
  publishModuleTabs: (parentId: string | null, parentLabel: string | null, tabs: ModuleTab[]) => void;
}

const ModuleTabsContext = createContext<ModuleTabsValue>({
  parentId: null,
  parentLabel: null,
  tabs: [],
  publishModuleTabs: () => {},
});

export function ModuleTabsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ parentId: string | null; parentLabel: string | null; tabs: ModuleTab[] }>({
    parentId: null,
    parentLabel: null,
    tabs: [],
  });

  // Signature guard prevents render loops when several sidebars publish the
  // same set (desktop sidebar + mobile sheet sidebar are mounted together).
  const signatureRef = useRef<string>("");

  const publishModuleTabs = useCallback(
    (parentId: string | null, parentLabel: string | null, tabs: ModuleTab[]) => {
      const signature = `${parentId}|${tabs.map((t) => t.id).join(",")}`;
      if (signature === signatureRef.current) return;
      signatureRef.current = signature;
      setState({ parentId, parentLabel, tabs });
    },
    []
  );

  const value = useMemo(
    () => ({ ...state, publishModuleTabs }),
    [state, publishModuleTabs]
  );

  return <ModuleTabsContext.Provider value={value}>{children}</ModuleTabsContext.Provider>;
}

export function useModuleTabs() {
  return useContext(ModuleTabsContext);
}
