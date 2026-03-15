import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type Locale = "ko" | "en";

const STORAGE_KEY = "musecore-locale";

type Translations = Record<string, unknown>;

import enTranslations from "./translations/en.json";
import koTranslations from "./translations/ko.json";

const translationsMap: Record<Locale, Translations> = {
  en: enTranslations as Translations,
  ko: koTranslations as Translations,
};

const getNested = (obj: unknown, path: string): string | string[] | undefined => {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    const idx = /^\d+$/.test(key) ? parseInt(key, 10) : key;
    current = Array.isArray(current) ? current[idx as number] : (current as Record<string, unknown>)[key];
  }
  return current as string | string[] | undefined;
};

const interpolate = (str: string, vars: Record<string, string | number>): string => {
  return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tArray: (key: string) => string[];
  isLoading: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    return stored === "ko" || stored === "en" ? stored : "en";
  });
  const [translations, setTranslations] = useState<Translations>(() => translationsMap[locale]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setTranslations(translationsMap[locale]);
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLocale);
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const value = getNested(translations, key);
      if (value == null) return key;
      const str = typeof value === "string" ? value : key;
      return vars ? interpolate(str, vars) : str;
    },
    [translations]
  );

  const tArray = useCallback(
    (key: string): string[] => {
      const value = getNested(translations, key);
      return Array.isArray(value) ? value : [];
    },
    [translations]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, tArray, isLoading }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
