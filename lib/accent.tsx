"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

// 预设色板
export const ACCENT_COLORS = [
  { name: "蓝色", value: "#2563eb", light: "#dbeafe", ring: "#93c5fd" },    // blue-600
  { name: "靛青", value: "#0891b2", light: "#cffafe", ring: "#67e8f9" },    // cyan-600
  { name: "紫色", value: "#7c3aed", light: "#ede9fe", ring: "#c4b5fd" },    // violet-600
  { name: "粉色", value: "#db2777", light: "#fce7f3", ring: "#f9a8d4" },    // pink-600
  { name: "橙色", value: "#ea580c", light: "#fff7ed", ring: "#fdba74" },    // orange-600
  { name: "绿色", value: "#16a34a", light: "#dcfce7", ring: "#86efac" },    // green-600
  { name: "红色", value: "#dc2626", light: "#fee2e2", ring: "#fca5a5" },    // red-600
  { name: "石板灰", value: "#475569", light: "#f1f5f9", ring: "#cbd5e1" },  // slate-600
];

export type AccentColor = (typeof ACCENT_COLORS)[number];

const STORAGE_KEY = "wisector-accent-color";

interface AccentContextValue {
  accent: AccentColor;
  setAccent: (color: AccentColor) => void;
}

const AccentContext = createContext<AccentContextValue>({
  accent: ACCENT_COLORS[0],
  setAccent: () => {},
});

export function useAccent() {
  return useContext(AccentContext);
}

export function AccentProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<AccentColor>(ACCENT_COLORS[0]);

  // 初始化从 localStorage 读取
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AccentColor;
        const found = ACCENT_COLORS.find((c) => c.value === parsed.value);
        if (found) setAccentState(found);
      }
    } catch {
      // ignore
    }
  }, []);

  const setAccent = useCallback((color: AccentColor) => {
    setAccentState(color);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(color));
  }, []);

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentContext.Provider>
  );
}

/** 应用 CSS 变量到 :root */
export function useAccentCSS() {
  const { accent } = useAccent();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", accent.value);
    root.style.setProperty("--accent-light", accent.light);
    root.style.setProperty("--accent-ring", accent.ring);
  }, [accent]);
}