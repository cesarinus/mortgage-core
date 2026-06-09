import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ThemeName = "ng-dark" | "ng-light" | "original" | "system";

const THEME_KEY = "ngc.theme";
const ALL_CLASSES = ["theme-ng-dark", "theme-ng-light", "theme-original", "dark"];

function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  ALL_CLASSES.forEach((c) => root.classList.remove(c));
  let resolved: Exclude<ThemeName, "system"> = "ng-dark";
  if (theme === "system") {
    resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "ng-dark" : "ng-light";
  } else {
    resolved = theme;
  }
  root.classList.add(`theme-${resolved}`);
  if (resolved === "ng-dark") root.classList.add("dark");
}

interface Ctx {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

const ThemeCtx = createContext<Ctx>({ theme: "ng-dark", setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return "ng-dark";
    return (localStorage.getItem(THEME_KEY) as ThemeName) || "ng-dark";
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("theme_preference")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const t = (data as any)?.theme_preference as ThemeName | undefined;
        if (t) setThemeState(t);
      });
  }, [user]);

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    if (user) {
      supabase.from("profiles").update({ theme_preference: t } as any).eq("id", user.id).then(() => {});
    }
  };

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);