// ---------------------------------------------------------------------------
// The customer's configuration, shared by every page.
//
// Section 22 of the spec: a customer may choose E-commerce on the Pricing page,
// add a pack in the builder, wander off to read a pack's details, add that too,
// and come back — and nothing they picked may be lost. So the selection lives
// here (and in localStorage), never inside a page component.
//
// This holds only WHAT was chosen. What it COSTS is always derived by the
// pricing engine from the catalogue, never stored alongside it.
// ---------------------------------------------------------------------------

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE = "ignis.configuration.v2";

export interface BusinessInfo {
  businessName: string;
  businessType: string;
  contactName: string;
  phone: string;
  email: string;
  contactMethod: string;
  notes: string;
}

export interface Configuration {
  systemKeys: string[];
  packKeys: string[];
  oneTimeKeys: string[];
  externalKeys: string[];
  info: BusinessInfo;
}

export const EMPTY_INFO: BusinessInfo = {
  businessName: "",
  businessType: "",
  contactName: "",
  phone: "",
  email: "",
  contactMethod: "WhatsApp",
  notes: "",
};

export const EMPTY: Configuration = {
  systemKeys: [],
  packKeys: [],
  oneTimeKeys: [],
  externalKeys: [],
  info: EMPTY_INFO,
};

interface Store {
  config: Configuration;
  /** true once the customer has actually chosen something. */
  touched: boolean;
  setSystems: (keys: string[]) => void;
  addSystem: (key: string) => void;
  /** Removing a system also drops packs that cannot run without it. */
  removeSystem: (key: string, alsoRemovePacks: string[]) => void;
  togglePack: (key: string) => void;
  addPacks: (keys: string[]) => void;
  removePack: (key: string) => void;
  toggleOneTime: (key: string) => void;
  toggleExternal: (key: string) => void;
  setInfo: (info: Partial<BusinessInfo>) => void;
  /** Replace everything — used by "Use This Setup" and the questionnaire. */
  apply: (next: Partial<Configuration>) => void;
  reset: () => void;
}

const Ctx = createContext<Store>(null!);

function load(): Configuration {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Configuration>;
    return {
      ...EMPTY,
      ...parsed,
      // Arrays are trusted only as far as their shape; unknown keys are simply
      // priced as unknown by the engine and reported, never silently charged.
      systemKeys: Array.isArray(parsed.systemKeys) ? parsed.systemKeys : [],
      packKeys: Array.isArray(parsed.packKeys) ? parsed.packKeys : [],
      oneTimeKeys: Array.isArray(parsed.oneTimeKeys) ? parsed.oneTimeKeys : [],
      externalKeys: Array.isArray(parsed.externalKeys) ? parsed.externalKeys : [],
      info: { ...EMPTY_INFO, ...(parsed.info ?? {}) },
    };
  } catch {
    return EMPTY;
  }
}

const uniq = (a: string[]) => [...new Set(a)];

export function ConfigurationProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Configuration>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(config));
    } catch {
      /* a full or blocked storage must never break the page */
    }
  }, [config]);

  const patch = useCallback((fn: (c: Configuration) => Configuration) => setConfig(fn), []);

  const store = useMemo<Store>(
    () => ({
      config,
      touched:
        config.systemKeys.length > 0 ||
        config.packKeys.length > 0 ||
        config.oneTimeKeys.length > 0,

      setSystems: (keys) => patch((c) => ({ ...c, systemKeys: uniq(keys) })),
      addSystem: (key) => patch((c) => ({ ...c, systemKeys: uniq([...c.systemKeys, key]) })),
      removeSystem: (key, alsoRemovePacks) =>
        patch((c) => ({
          ...c,
          systemKeys: c.systemKeys.filter((k) => k !== key),
          packKeys: c.packKeys.filter((k) => !alsoRemovePacks.includes(k)),
        })),

      // Adding the same pack twice is impossible by construction, not by a
      // check somewhere downstream.
      togglePack: (key) =>
        patch((c) => ({
          ...c,
          packKeys: c.packKeys.includes(key)
            ? c.packKeys.filter((k) => k !== key)
            : [...c.packKeys, key],
        })),
      addPacks: (keys) => patch((c) => ({ ...c, packKeys: uniq([...c.packKeys, ...keys]) })),
      removePack: (key) => patch((c) => ({ ...c, packKeys: c.packKeys.filter((k) => k !== key) })),

      toggleOneTime: (key) =>
        patch((c) => ({
          ...c,
          oneTimeKeys: c.oneTimeKeys.includes(key)
            ? c.oneTimeKeys.filter((k) => k !== key)
            : [...c.oneTimeKeys, key],
        })),
      toggleExternal: (key) =>
        patch((c) => ({
          ...c,
          externalKeys: c.externalKeys.includes(key)
            ? c.externalKeys.filter((k) => k !== key)
            : [...c.externalKeys, key],
        })),

      setInfo: (info) => patch((c) => ({ ...c, info: { ...c.info, ...info } })),
      apply: (next) =>
        patch((c) => ({
          ...c,
          ...next,
          systemKeys: uniq(next.systemKeys ?? c.systemKeys),
          packKeys: uniq(next.packKeys ?? c.packKeys),
        })),
      reset: () => setConfig({ ...EMPTY, info: EMPTY_INFO }),
    }),
    [config, patch]
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export const useConfiguration = () => useContext(Ctx);
