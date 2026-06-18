"use client";

import { useMemo } from "react";
import katex from "katex";

interface MathProps {
  children: string;
  display?: boolean;
}

export default function Math({ children, display = false }: MathProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(children, {
        displayMode: display,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return children;
    }
  }, [children, display]);

  return (
    <span
      dangerouslySetInnerHTML={{ __html: html }}
      className={display ? "block my-2 text-center" : ""}
    />
  );
}