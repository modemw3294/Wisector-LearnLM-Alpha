"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Check, ChevronDown, Search, X, Plus } from "lucide-react";

export interface Textbook {
  id: string;
  name: string;
  subject: string;
  grade?: string;
}

// 占位数据：实际从数据管理页 / API 获取
export const TEXTBOOKS: Textbook[] = [
  { id: "math-7", name: "人教版 · 七年级数学（上）", subject: "数学", grade: "七年级" },
  { id: "math-8", name: "人教版 · 八年级数学（上）", subject: "数学", grade: "八年级" },
  { id: "physics-9", name: "教科版 · 九年级物理", subject: "物理", grade: "九年级" },
  { id: "eng-7", name: "外研版 · 七年级英语", subject: "英语", grade: "七年级" },
  { id: "cs-hs1", name: "浙教版 · 高中信息技术（必修一）", subject: "信息技术", grade: "高一" },
];

interface TextbookSelectorProps {
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export default function TextbookSelector({
  selectedId,
  onSelect,
}: TextbookSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasSelection = !!selectedId;
  const selected = hasSelection
    ? TEXTBOOKS.find((t) => t.id === selectedId)
    : undefined;

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => searchInputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const filtered = TEXTBOOKS.filter((t) =>
    t.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 pt-[10vh] sm:pt-0"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[560px] max-h-[80vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-notion-border">
              <Search className="w-4 h-4 text-notion-text3 shrink-0" strokeWidth={1.75} />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索课本…"
                className="flex-1 h-7 bg-transparent text-sm text-notion-text placeholder:text-notion-text4 focus:outline-none"
              />
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors shrink-0"
                aria-label="关闭"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-notion-text3">
                  没有匹配的课本
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map((tb) => {
                    const isSelected = selected?.id === tb.id;
                    return (
                      <button
                        key={tb.id}
                        onClick={() => {
                          onSelect?.(tb.id);
                          setOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                          isSelected
                            ? "bg-blue-50"
                            : "hover:bg-notion-overlay2"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-blue-100 text-blue-700">
                          <BookOpen className="w-4 h-4" strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium tracking-tight truncate text-notion-text">
                            {tb.name}
                          </div>
                          <div className="text-[11px] text-notion-text4 mt-0.5">
                            {[tb.subject, tb.grade].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        {isSelected && (
                          <Check
                            className="w-4 h-4 text-blue-600 shrink-0"
                            strokeWidth={2.5}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 底部：前往数据管理 */}
            <div className="px-3 py-2 border-t border-notion-border">
              <button
                onClick={() => {
                  setOpen(false);
                  window.location.href = "/data";
                }}
                className="w-full flex items-center justify-center gap-1.5 h-8 rounded-md text-sm text-notion-text2 hover:bg-notion-overlay2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                管理课本
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 h-8 px-2.5 rounded-full transition-colors text-sm ${
          hasSelection
            ? "text-notion-text hover:bg-notion-overlay2"
            : "text-blue-600 bg-blue-50 hover:bg-blue-100"
        }`}
        title="选择课本"
      >
        <BookOpen className="w-4 h-4" strokeWidth={1.75} />
        <span className="max-w-[160px] truncate font-medium tracking-tight">
          {hasSelection ? selected!.name : "选择课本"}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60" strokeWidth={1.5} />
      </motion.button>

      {mounted ? createPortal(modal, document.body) : null}
    </>
  );
}
