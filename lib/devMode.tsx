"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "wisector-dev-mode";

interface DevModeContextValue {
  devMode: boolean;
  setDevMode: (v: boolean) => void;
}

const DevModeContext = createContext<DevModeContextValue>({
  devMode: false,
  setDevMode: () => {},
});

export function useDevMode() {
  return useContext(DevModeContext);
}

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [devMode, setDevModeState] = useState(false);

  // 初始化从 localStorage 读取
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "true") setDevModeState(true);
    } catch {
      // ignore
    }
  }, []);

  const setDevMode = useCallback((v: boolean) => {
    setDevModeState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "true" : "false");
    } catch {
      // ignore
    }
  }, []);

  return (
    <DevModeContext.Provider value={{ devMode, setDevMode }}>
      {children}
    </DevModeContext.Provider>
  );
}
