import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(next)} aria-label="Toggle theme">
      {resolved === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
