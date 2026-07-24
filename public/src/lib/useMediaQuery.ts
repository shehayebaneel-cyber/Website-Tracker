import { useEffect, useState } from "react";

/**
 * Layout that genuinely differs between phone and desktop — not just styling —
 * has to be decided in JavaScript. The builder shows one step at a time on a
 * phone and the whole form on a desktop, which CSS alone cannot express.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
