"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface MarkdownRendererProps {
  children: string;
}

/**
 * 完整的 Markdown 渲染组件：
 * - GFM 表格/任务列表
 * - LaTeX 行内公式 $...$ 和块级公式 $$...$$
 * - 代码块语法高亮
 * - 图片、链接等标准 Markdown 元素
 */
export default function MarkdownRenderer({ children }: MarkdownRendererProps) {
  // 预处理：将 \\( ... \\) 转为 $...$ 格式，将 \\[ ... \\] 转为 $$...$$ 格式
  const processed = useMemo(() => {
    let text = children;
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m}$$`);
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`);
    return text;
  }, [children]);

  return (
    <div className="prose prose-sm prose-neutral max-w-none [&>*:first-child]:mt-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // 代码块：语法高亮
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeStr = String(children).replace(/\n$/, "");
            const isInline = !match && !codeStr.includes("\n");

            if (isInline || !match) {
              return (
                <code
                  className="bg-gray-100 text-rose-600 rounded px-1.5 py-0.5 text-[13px] font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="rounded-lg overflow-hidden border border-gray-200 my-3">
                <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                  <span className="text-xs text-gray-500 font-mono">
                    {match[1]}
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(codeStr)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    title="复制代码"
                  >
                    复制
                  </button>
                </div>
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    fontSize: "13px",
                    padding: "14px 16px",
                  }}
                >
                  {codeStr}
                </SyntaxHighlighter>
              </div>
            );
          },

          // 表格
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3">
                <table className="min-w-full border-collapse border border-gray-200 text-sm">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-gray-200 px-3 py-2 bg-gray-50 font-semibold text-left">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-gray-200 px-3 py-1.5">{children}</td>
            );
          },

          // 块引用
          blockquote({ children }) {
            return (
              <blockquote className="border-l-3 border-blue-400 pl-4 my-3 text-gray-600 italic">
                {children}
              </blockquote>
            );
          },

          // 链接
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}