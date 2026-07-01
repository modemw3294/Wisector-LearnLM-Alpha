"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Table,
  Divide,
  Image as ImageIcon,
  Eye,
  Edit3,
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  onAISelect?: (selectedText: string) => void;
  readOnly?: boolean;
}

type ToolbarAction = {
  icon: React.FC<{ className?: string; strokeWidth?: number }>;
  label: string;
  action: () => void;
  prefix: string;
  suffix: string;
};

export default function NoteEditor({ content, onChange, onAISelect, readOnly = false }: NoteEditorProps) {
  const [preview, setPreview] = useState(true);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = useCallback(
    (prefix: string, suffix: string, placeholder: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = content.slice(start, end);
      const newText =
        content.slice(0, start) +
        prefix +
        (selected || placeholder) +
        suffix +
        content.slice(end);
      onChange(newText);
      // 恢复光标位置
      requestAnimationFrame(() => {
        ta.focus();
        const newCursor = start + prefix.length + (selected || placeholder).length;
        ta.setSelectionRange(newCursor, newCursor);
      });
    },
    [content, onChange]
  );

  const toolbarActions: ToolbarAction[] = [
    { icon: Heading1, label: "一级标题", action: () => insertAtCursor("# ", "", "标题"), prefix: "# ", suffix: "" },
    { icon: Heading2, label: "二级标题", action: () => insertAtCursor("## ", "", "标题"), prefix: "## ", suffix: "" },
    { icon: Heading3, label: "三级标题", action: () => insertAtCursor("### ", "", "标题"), prefix: "### ", suffix: "" },
    { icon: Bold, label: "加粗", action: () => insertAtCursor("**", "**", "加粗文字"), prefix: "**", suffix: "**" },
    { icon: Italic, label: "斜体", action: () => insertAtCursor("*", "*", "斜体文字"), prefix: "*", suffix: "*" },
    { icon: Code, label: "代码", action: () => insertAtCursor("`", "`", "代码"), prefix: "`", suffix: "`" },
    { icon: List, label: "无序列表", action: () => insertAtCursor("- ", "", "列表项"), prefix: "- ", suffix: "" },
    { icon: ListOrdered, label: "有序列表", action: () => insertAtCursor("1. ", "", "列表项"), prefix: "1. ", suffix: "" },
    { icon: Quote, label: "引用", action: () => insertAtCursor("> ", "", "引用"), prefix: "> ", suffix: "" },
    { icon: Table, label: "表格", action: () => insertAtCursor("| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| ", " | ", "值"), prefix: "| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| ", suffix: " | " },
    { icon: Divide, label: "公式", action: () => insertAtCursor("$$", "$$", "E=mc^2"), prefix: "$$", suffix: "$$" },
    { icon: ImageIcon, label: "图片", action: () => insertAtCursor("![", ")(", "描述"), prefix: "![", suffix: "](url)" },
  ];

  // 选中文字时弹出 AI 工具栏
  const handleMouseUp = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end).trim();
    if (selected && selected.length > 0) {
      // 计算选中文字位置
      const rect = ta.getBoundingClientRect();
      // 粗略估算：用行号和字符位置
      const beforeSelection = content.slice(0, start);
      const lines = beforeSelection.split("\n");
      const lineHeight = 20;
      const charWidth = 8;
      const lineIdx = lines.length - 1;
      const colIdx = lines[lineIdx]?.length || 0;
      setSelection({
        text: selected,
        x: rect.left + colIdx * charWidth,
        y: rect.top + lineIdx * lineHeight - 4,
      });
    } else {
      setSelection(null);
    }
  };

  // 点击外部关闭 AI 工具栏
  useEffect(() => {
    const handler = () => setSelection(null);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative flex flex-col h-full">
      {/* 工具栏 */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 px-3 py-2 border-b border-notion-border bg-white/60 backdrop-blur-sm shrink-0 overflow-x-auto">
          {toolbarActions.map((item) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={item.action}
                className="w-8 h-8 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 hover:text-notion-text transition-colors"
                title={item.label}
              >
                <Icon className="w-4 h-4" strokeWidth={1.75} />
              </motion.button>
            );
          })}
          <div className="flex-1" />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setPreview((v) => !v)}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              preview
                ? "text-accent bg-accent-light/50"
                : "text-notion-text2 hover:bg-notion-overlay2"
            }`}
            title={preview ? "编辑" : "预览"}
          >
            {preview ? (
              <Edit3 className="w-4 h-4" strokeWidth={1.75} />
            ) : (
              <Eye className="w-4 h-4" strokeWidth={1.75} />
            )}
          </motion.button>
        </div>
      )}

      {/* 编辑 / 预览区域 */}
      <div className="flex-1 overflow-hidden">
        {preview ? (
          <div className="h-full overflow-y-auto p-4">
            <MarkdownRenderer>{content}</MarkdownRenderer>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            onMouseUp={handleMouseUp}
            onKeyUp={handleMouseUp}
            readOnly={readOnly}
            placeholder="开始写笔记…&#10;&#10;支持 Markdown 语法：&#10;# 标题&#10;**加粗** *斜体* `代码`&#10;- 列表&#10;$$公式$$&#10;> 引用"
            className="w-full h-full resize-none bg-transparent p-4 text-sm text-notion-text placeholder:text-notion-text4 focus:outline-none leading-relaxed font-mono"
          />
        )}
      </div>

      {/* AI 选中文字工具栏 */}
      {selection && onAISelect && (
        <div
          className="fixed z-50 -translate-x-1/2"
          style={{ left: selection.x, top: selection.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-notion-text text-white shadow-lg"
          >
            <button
              onClick={() => { onAISelect(selection.text); setSelection(null); }}
              className="px-2 py-0.5 text-[11px] font-medium hover:bg-white/20 rounded transition-colors whitespace-nowrap"
            >
              AI 解释
            </button>
            <button
              onClick={() => { onAISelect(`请润色以下文字，使其更清晰流畅：\n\n${selection.text}`); setSelection(null); }}
              className="px-2 py-0.5 text-[11px] font-medium hover:bg-white/20 rounded transition-colors whitespace-nowrap"
            >
              AI 润色
            </button>
            <button
              onClick={() => { onAISelect(`请续写以下内容：\n\n${selection.text}`); setSelection(null); }}
              className="px-2 py-0.5 text-[11px] font-medium hover:bg-white/20 rounded transition-colors whitespace-nowrap"
            >
              AI 续写
            </button>
            <button
              onClick={() => { onAISelect(`请将以下内容翻译为英文：\n\n${selection.text}`); setSelection(null); }}
              className="px-2 py-0.5 text-[11px] font-medium hover:bg-white/20 rounded transition-colors whitespace-nowrap"
            >
              AI 翻译
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}