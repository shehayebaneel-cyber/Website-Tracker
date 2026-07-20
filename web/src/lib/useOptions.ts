import { useEffect, useState } from "react";
import { api } from "./api";
import type { OptionMap } from "./types";

let cache: OptionMap | null = null;

// Fetch the configurable dropdown lists once and cache them for the session.
export function useOptions() {
  const [options, setOptions] = useState<OptionMap>(cache ?? {});
  useEffect(() => {
    if (cache) return;
    api
      .get<{ options: OptionMap }>("/options")
      .then((r) => {
        cache = r.options;
        setOptions(r.options);
      })
      .catch(() => {});
  }, []);
  return options;
}
