"use client";

import { useEffect, useRef, useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

interface TypewriterTextProps {
  /** 完整内容（可能仍在增长） */
  content: string;
  /** 是否正在生成（loading 中） */
  loading?: boolean;
  /** 打字速度（ms/字符），默认 12 */
  speed?: number;
}

/**
 * 打字机效果文本组件。
 * - loading=true 时：逐字显示已到达的内容，光标闪烁
 * - loading=false 时：立即显示全部内容（用于历史消息）
 * - 当 content 增长时，平滑追加新内容
 */
export default function TypewriterText({
  content,
  loading,
  speed = 12,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const targetRef = useRef<string>("");

  // 非 loading 状态（历史消息）直接显示全部
  useEffect(() => {
    if (!loading) {
      setDisplayed(content);
      targetRef.current = content;
    }
  }, [loading, content]);

  // loading 状态下打字动画
  useEffect(() => {
    if (!loading) return;
    targetRef.current = content;
    if (displayed.length >= content.length) return;

    let charIndex = displayed.length;
    lastTickRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - lastTickRef.current;
      const charsToAdvance = Math.max(1, Math.floor(elapsed / speed));

      if (charIndex < targetRef.current.length) {
        charIndex = Math.min(
          charIndex + charsToAdvance,
          targetRef.current.length
        );
        setDisplayed(targetRef.current.slice(0, charIndex));
        lastTickRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, loading, speed]);

  // 当 loading 结束时，确保全部显示
  useEffect(() => {
    if (!loading && displayed !== content) {
      setDisplayed(content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return (
    <div className="relative">
      <MarkdownRenderer>{displayed || " "}</MarkdownRenderer>
      {loading && (
        <span className="inline-block w-[2px] h-[1em] bg-accent align-text-bottom ml-0.5 animate-pulse" />
      )}
    </div>
  );
}
