import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface ShellHeader {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

const Ctx = createContext<{ header: ShellHeader; setHeader: (h: ShellHeader) => void } | null>(null);

export function ShellHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<ShellHeader>({ title: "" });
  return <Ctx.Provider value={{ header, setHeader }}>{children}</Ctx.Provider>;
}

export function useShellHeaderState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShellHeaderState must be used inside ShellHeaderProvider");
  return ctx.header;
}

/**
 * Set the panel header ("Dashboard / Homepage" in the design) for the current page.
 * `deps` controls when actions are re-rendered into the header.
 */
export function useShellHeader(header: ShellHeader, deps: unknown[] = []) {
  const ctx = useContext(Ctx);
  const set = ctx?.setHeader;
  useEffect(() => {
    set?.(header);
    if (typeof header.title === "string") document.title = `${header.title} · DigiBizz Jobs`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, typeof header.title === "string" ? header.title : null, typeof header.subtitle === "string" ? header.subtitle : null, ...deps]);
}
