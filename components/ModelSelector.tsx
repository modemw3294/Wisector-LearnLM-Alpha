"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  X,
  Search,
  Image as ImageIcon,
  FileText,
  Mic,
} from "lucide-react";
import type { ModelConfig } from "@/lib/types";

const ICON_BASE = "https://unpkg.com/@lobehub/icons-static-svg@latest/icons";

/** 图标映射：按 id 前缀匹配 */
function getModelIcon(id: string): string {
  const lower = id.toLowerCase();
  if (lower.startsWith("claude")) return "claude-color";
  if (lower.startsWith("gpt")) return "openai";
  if (lower.startsWith("gemini") || lower.startsWith("gemma")) return lower.startsWith("gemma") ? "gemma-color" : "gemini-color";
  if (lower.startsWith("kimi")) return "kimi-color";
  if (lower.startsWith("qwen")) return "qwen-color";
  if (lower.startsWith("glm")) return "zhipu-color";
  if (lower.startsWith("deepseek")) return "deepseek-color";
  if (lower.startsWith("speech")) return "hailuo-color";
  return "openai";
}

function ModelIcon({ id, name }: { id: string; name: string }) {
  const icon = getModelIcon(id);
  return (
    <img
      src={`${ICON_BASE}/${icon}.svg`}
      alt={name}
      width={20}
      height={20}
      className="w-5 h-5 shrink-0"
      onError={(e) => {
        // 图标加载失败时隐藏
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

/** 多模态图标 */
function ModalityTags({ modalities }: { modalities?: string[] }) {
  if (!modalities || modalities.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 ml-0.5">
      {modalities.includes("image") && (
        <ImageIcon className="w-3 h-3 text-notion-text4" strokeWidth={1.5} />
      )}
      {modalities.includes("pdf") && (
        <FileText className="w-3 h-3 text-notion-text4" strokeWidth={1.5} />
      )}
      {modalities.includes("audio") && (
        <Mic className="w-3 h-3 text-notion-text4" strokeWidth={1.5} />
      )}
    </span>
  );
}

interface ModelSelectorProps {
  /** 已配置（启用）的模型列表 */
  models: ModelConfig[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export default function ModelSelector({
  models,
  selectedId,
  onSelect,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const configuredModels = models.filter((m) => m.enabled);
  const hasAnyConfigured = configuredModels.length > 0;

  // 当前选中的模型：仅按外部传入的 id 匹配，不默认显示第一个，避免 state 与 UI 不一致
  const selected = selectedId
    ? configuredModels.find((m) => m.id === selectedId)
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

  const handleSelect = (model: ModelConfig) => {
    onSelect?.(model.id);
    setOpen(false);
  };

  const filteredModels = configuredModels.filter((m) =>
    (m.displayName || m.id).toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <>
      {/* 触发按钮 */}
      <motion.button
        whileHover={hasAnyConfigured ? { scale: 1.02 } : {}}
        whileTap={hasAnyConfigured ? { scale: 0.98 } : {}}
        onClick={() => hasAnyConfigured && setOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 h-7 rounded-full transition-colors ${
          hasAnyConfigured
            ? "hover:bg-notion-overlay2"
            : "cursor-not-allowed opacity-50"
        }`}
        title={hasAnyConfigured ? undefined : "请先在设置面板中配置模型"}
      >
        {selected ? (
          <>
            <ModelIcon id={selected.id} name={selected.displayName || selected.id} />
            <span className="text-sm font-medium text-notion-text tracking-tight whitespace-nowrap">
              {selected.displayName || selected.id}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-notion-text2" strokeWidth={1.5} />
          </>
        ) : hasAnyConfigured ? (
          <span className="text-sm text-notion-text3 tracking-tight whitespace-nowrap">
            选择模型
          </span>
        ) : (
          <span className="text-sm text-notion-text3 tracking-tight whitespace-nowrap">
            无可用模型
          </span>
        )}
      </motion.button>

      {/* 居中弹窗 */}
      <AnimatePresence>
        {open && hasAnyConfigured && (
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
              className="w-full max-w-[640px] max-h-[80vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden"
            >
              {/* 头部：搜索 + 关闭 */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-notion-border">
                <Search className="w-4 h-4 text-notion-text3 shrink-0" strokeWidth={1.75} />
                <input
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索模型…"
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

              {/* 模型列表 */}
              <div className="flex-1 overflow-y-auto p-2">
                {filteredModels.length === 0 ? (
                  <div className="px-3 py-10 text-center text-sm text-notion-text3">
                    {configuredModels.length === 0 ? "暂无可用模型" : "没有匹配的模型"}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {filteredModels.map((model) => {
                      const isSelected = selected?.id === model.id;
                      return (
                        <button
                          key={model.id}
                          onClick={() => handleSelect(model)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors border ${
                            isSelected
                              ? "bg-accent-light/50 border-accent-ring/60"
                              : "hover:bg-notion-overlay2 border-transparent"
                          }`}
                        >
                          <ModelIcon id={model.id} name={model.displayName || model.id} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium tracking-tight truncate text-notion-text">
                                {model.displayName || model.id}
                              </span>
                              <ModalityTags modalities={model.inputModalities} />
                            </div>
                            <div className="text-[11px] text-notion-text4 mt-0.5">
                              {model.reasoning === "intensity"
                                ? "支持推理强度"
                                : model.reasoning === "toggle"
                                ? "可切换推理"
                                : "无推理"}
                            </div>
                          </div>
                          {isSelected && (
                            <Check
                              className="w-4 h-4 text-accent shrink-0"
                              strokeWidth={2.5}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
