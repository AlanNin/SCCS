"use client";

import { useEffect, useState } from "react";

/** SSR-safe: returns `false` on first render, then syncs to the real match after mount. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

/** Matches the app's mobile/desktop nav breakpoint (Tailwind `md`, see app-shell.tsx). */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
