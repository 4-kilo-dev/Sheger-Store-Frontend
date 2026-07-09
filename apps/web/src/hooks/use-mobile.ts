import { useState, useEffect } from "react";

/**
 * Returns `true` when the viewport is below the given breakpoint (default 768px).
 * Uses `matchMedia` for efficient, event-driven updates — no resize polling.
 */
export function useMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}

export const useIsMobile = useMobile;

