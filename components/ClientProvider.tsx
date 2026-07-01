"use client";

import { AccentProvider, useAccentCSS } from "@/lib/accent";
import { DevModeProvider } from "@/lib/devMode";

function AccentApplier({ children }: { children: React.ReactNode }) {
  useAccentCSS();
  return <>{children}</>;
}

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <AccentProvider>
      <DevModeProvider>
        <AccentApplier>{children}</AccentApplier>
      </DevModeProvider>
    </AccentProvider>
  );
}
