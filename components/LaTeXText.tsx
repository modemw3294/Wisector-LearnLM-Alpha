"use client";

import { useMemo } from "react";
import katex from "katex";

interface LaTeXTextProps {
  children: string;
}

/**
 * 渲染混合文本中的 LaTeX 公式：
 * - $...$ 为行内公式
 * - $$...$$ 为块级公式
 */
export default function LaTeXText({ children }: LaTeXTextProps) {
  const parts = useMemo(() => {
    // 先处理块级公式 $$...$$
    const segments: { type: "text" | "math" | "display"; value: string }[] = [];
    const displayRegex = /\$\$([\s\S]*?)\$\$/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = displayRegex.exec(children)) !== null) {
      if (match.index > lastIdx) {
        segments.push({ type: "text", value: children.slice(lastIdx, match.index) });
      }
      segments.push({ type: "display", value: match[1] });
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < children.length) {
      segments.push({ type: "text", value: children.slice(lastIdx) });
    }

    // 再处理行内公式 $...$
    const result: { type: "text" | "math" | "display"; value: string }[] = [];
    for (const seg of segments) {
      if (seg.type !== "text") {
        result.push(seg);
        continue;
      }
      const inlineRegex = /\$([^$]+)\$/g;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = inlineRegex.exec(seg.value)) !== null) {
        if (m.index > last) {
          result.push({ type: "text", value: seg.value.slice(last, m.index) });
        }
        result.push({ type: "math", value: m[1] });
        last = m.index + m[0].length;
      }
      if (last < seg.value.length) {
        result.push({ type: "text", value: seg.value.slice(last) });
      }
    }

    return result;
  }, [children]);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.value}</span>;
        }
        try {
          const html = katex.renderToString(part.value, {
            displayMode: part.type === "display",
            throwOnError: false,
            strict: false,
          });
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{ __html: html }}
              className={part.type === "display" ? "block my-2 text-center" : ""}
            />
          );
        } catch {
          return <span key={i}>{part.value}</span>;
        }
      })}
    </span>
  );
}