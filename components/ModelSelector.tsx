"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, X, Search } from "lucide-react";

const ICON_BASE = "https://unpkg.com/@lobehub/icons-static-svg@latest/icons";

export interface ModelOption {
  id: string;
  name: string;
  icon: string;
  /**
   * reasoning:
   * - "intensity" 支持推理强度档位（强推理模型）
   * - "toggle"    仅支持推理开/关（可切换模型）
   * - "none"      不支持推理
   */
  reasoning: "intensity" | "toggle" | "none";
}

export const MODELS: ModelOption[] = [
  // 支持推理强度：Claude 全部
  { id: "claude-fable-5", name: "Claude Fable 5", icon: "claude-color", reasoning: "intensity" },
  { id: "claude-opus-4.8", name: "Claude Opus 4.8", icon: "claude-color", reasoning: "intensity" },
  { id: "claude-opus-4.7", name: "Claude Opus 4.7", icon: "claude-color", reasoning: "intensity" },
  { id: "claude-opus-4.6", name: "Claude Opus 4.6", icon: "claude-color", reasoning: "intensity" },
  { id: "claude-sonnet-4.6", name: "Claude Sonnet 4.6", icon: "claude-color", reasoning: "intensity" },
  // 支持推理强度：Gemini / Gemma 全部
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", icon: "gemini-color", reasoning: "intensity" },
  { id: "gemini-3-flash", name: "Gemini 3 Flash", icon: "gemini-color", reasoning: "intensity" },
  { id: "gemma-4-31b", name: "Gemma 4 31B", icon: "gemma-color", reasoning: "intensity" },
  // 支持推理强度：GPT 全部
  { id: "gpt-5.5", name: "GPT-5.5", icon: "openai", reasoning: "intensity" },
  { id: "gpt-5.4", name: "GPT-5.4", icon: "openai", reasoning: "intensity" },
  // 支持推理强度：GLM 5.2
  { id: "glm-5.2", name: "GLM 5.2", icon: "zhipu-color", reasoning: "intensity" },
  // 可切换推理：剩下的全部
  { id: "qwen-3.7-max", name: "Qwen 3.7 Max", icon: "qwen-color", reasoning: "toggle" },
  { id: "qwen-3.7-plus", name: "Qwen 3.7 Plus", icon: "qwen-color", reasoning: "toggle" },
  { id: "glm-5.1", name: "GLM 5.1", icon: "zhipu-color", reasoning: "toggle" },
  { id: "glm-5", name: "GLM 5", icon: "zhipu-color", reasoning: "toggle" },
  { id: "glm-5v-turbo", name: "GLM 5V Turbo", icon: "zhipu-color", reasoning: "toggle" },
  { id: "deepseek-v4-pro", name: "Deepseek V4 Pro", icon: "deepseek-color", reasoning: "toggle" },
  { id: "deepseek-v4-flash", name: "Deepseek V4 Flash", icon: "deepseek-color", reasoning: "toggle" },
];

interface ModelSelectorProps {
  /** 已配置（启用）的模型 id 列表 */
  configuredIds?: string[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

function ModelIcon({ icon, name }: { icon: string; name: string }) {
  return (
    <img
      src={`${ICON_BASE}/${icon}.svg`}
      alt={name}
      width={20}
      height={20}
      className="w-5 h-5 shrink-0"
    />
  );
}

export default function ModelSelector({
  configuredIds,
  selectedId,
  onSelect,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [internalSelected, setInternalSelected] = useState<ModelOption>(MODELS[0]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = selectedId
    ? MODELS.find((m) => m.id === selectedId) ?? internalSelected
    : internalSelected;

  // 关闭弹窗时重置搜索 & 锁定 body 滚动
  useEffect(() => {
    if (open) {
      setQuery("");
      // 自动聚焦搜索框
      setTimeout(() => searchInputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const isConfigured = (id: string) => {
    if (!configuredIds) return true;
    return configuredIds.includes(id);
  };

  const handleSelect = (model: ModelOption) => {
    if (!isConfigured(model.id)) return;
    setInternalSelected(model);
    onSelect?.(model.id);
    setOpen(false);
  };

  const filteredModels = MODELS.filter((m) =>
    m.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <>
      {/* 触发按钮 */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 h-7 rounded-full hover:bg-notion-overlay2 transition-colors"
      >
        <ModelIcon icon={selected.icon} name={selected.name} />
        <span className="text-sm font-medium text-notion-text tracking-tight whitespace-nowrap">
          {selected.name}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-notion-text2" strokeWidth={1.5} />
      </motion.button>

      {/* 居中弹窗 */}
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
                    没有匹配的模型
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {filteredModels.map((model) => {
                      const configured = isConfigured(model.id);
                      const isSelected = selected.id === model.id;
                      return (
                        <button
                          key={model.id}
                          onClick={() => handleSelect(model)}
                          disabled={!configured}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors border ${
                            isSelected
                              ? "bg-blue-50 border-blue-200"
                              : configured
                              ? "hover:bg-notion-overlay2 border-transparent"
                              : "cursor-not-allowed border-transparent opacity-50"
                          }`}
                        >
                          <ModelIcon icon={model.icon} name={model.name} />
                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-sm font-medium tracking-tight truncate ${
                                configured ? "text-notion-text" : "text-notion-text4"
                              }`}
                            >
                              {model.name}
                            </div>
                            <div className="text-[11px] text-notion-text4 mt-0.5">
                              {model.reasoning === "intensity"
                                ? "支持推理强度"
                                : model.reasoning === "toggle"
                                ? "可切换推理"
                                : "无推理"}
                              {!configured && " · 未配置"}
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
