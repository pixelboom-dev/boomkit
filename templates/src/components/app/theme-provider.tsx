import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";
type ThemeContext = { theme: Theme; setTheme: (t: Theme) => void; resolved: "light" | "dark" };

const Ctx = createContext<ThemeContext | null>(null);
const STORAGE_KEY = "prototype-theme";

function resolve(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initial = (localStorage.getItem(STORAGE_KEY) as Theme | null) ??
    (import.meta.env.VITE_DEFAULT_THEME ?? "system");
  const [theme, setThemeState] = useState<Theme>(initial);
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolve(initial));

  useEffect(() => {
    const r = resolve(theme);
    setResolved(r);
    document.documentElement.classList.toggle("dark", r === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const r = mq.matches ? "dark" : "light";
      setResolved(r);
      document.documentElement.classList.toggle("dark", r === "dark");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return (
    <Ctx.Provider value={{ theme, setTheme: setThemeState, resolved }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
