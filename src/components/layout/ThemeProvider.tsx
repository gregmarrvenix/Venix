"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

function getStorageKey(contractorId: string) {
  return `venix-theme-${contractorId}`;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { contractorId } = useAuthContext();
  const [theme, setTheme] = useState<Theme>("dark");

  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem(getStorageKey(contractorId));
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    }
  }, [contractorId]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem(getStorageKey(contractorId), next);
      return next;
    });
  }, [contractorId]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
