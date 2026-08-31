"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("contextcore_theme") as "dark" | "light" | null;
    if (stored === "light") {
      setTheme("light");
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("contextcore_theme", "light");
    } else {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("contextcore_theme", "dark");
    }
  };

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-lg bg-surface/50 border border-border/80 flex items-center justify-center text-muted" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle Theme"
      className="w-8 h-8 rounded-lg bg-surface hover:bg-surface/80 border border-border hover:border-accent/40 flex items-center justify-center text-muted hover:text-foreground transition-all duration-200 shadow-sm cursor-pointer select-none"
    >
      {theme === "dark" ? (
        <Sun className="w-3.5 h-3.5 text-amber-400 hover:text-amber-300 transition-colors" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-indigo-500 hover:text-indigo-600 transition-colors" />
      )}
    </button>
  );
}
