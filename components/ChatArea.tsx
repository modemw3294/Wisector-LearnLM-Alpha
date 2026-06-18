"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Settings2,
  Mic,
  Send,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Grid3x3,
  Globe,
  Brain,
  ChevronRight,
  Check,
  ChevronDown,
  Menu,
  BookOpen,
} from "lucide-react";
import ModelSelector, { MODELS } from "./ModelSelector";
import TextbookSelector from "./TextbookSelector";
import { useModelConfigs } from "@/lib/useModelConfigs";

const quickActions = [
  { icon: Sparkles, label: "Wisector LearnLM新功能" },
  { icon: FileText, label: "撰写笔记" },
  { icon: ImageIcon, label: "分析题目" },
  { icon: Grid3x3, label: "创建任务跟踪器" },
];

/** 推理强度档位（5 档） */
const INTENSITY_LEVELS = [
  { value: "low", label: "Low", short: "低" },
  { value: "medium", label: "Medium", short: "中" },
  { value: "high", label: "High", short: "高" },
  { value: "xhigh", label: "xHigh", short: "极高" },
  { value: "max", label: "Max", short: "最大" },
] as const;

export default function ChatArea({ onOpenMobileSidebar }: { onOpenMobileSidebar?: () => void }) {
  const [input, setInput] = useState("");
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [selectedModelId, setSelectedModelId] = useState<string>(MODELS[0].id);
  const [selectedTextbookId, setSelectedTextbookId] = useState<string | undefined>(undefined);
  const [reasoningEnabled, setReasoningEnabled] = useState(false);
  const [intensity, setIntensity] = useState<number>(1); // 默认「Medium」
  const [reasoningMenuOpen, setReasoningMenuOpen] = useState(false);

  // 设置弹层
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [webAccess, setWebAccess] = useState(false);
  const [mode, setMode] = useState<"ask" | "edit">("ask");

  // 附件 / 引用笔记弹层
  const [attachOpen, setAttachOpen] = useState(false);

  const settingsRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const reasoningRef = useRef<HTMLDivElement>(null);

  const { models: configuredModels } = useModelConfigs();
  const configuredIds = configuredModels
    .filter((m) => m.enabled)
    .map((m) => m.id);

  const currentModel = MODELS.find((m) => m.id === selectedModelId) ?? MODELS[0];
  const supportsReasoning = currentModel.reasoning !== "none";
  const isIntensityModel = currentModel.reasoning === "intensity";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) {
        setAttachOpen(false);
      }
      if (reasoningRef.current && !reasoningRef.current.contains(e.target as Node)) {
        setReasoningMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* 顶部栏 */}
      <div className="flex items-center gap-2 px-4 md:px-8 h-12 border-b border-notion-border bg-white/60 backdrop-blur-sm shrink-0">
        {/* 移动端：左上角打开侧边栏按钮 */}
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors"
          aria-label="打开侧边栏"
        >
          <Menu className="w-5 h-5" strokeWidth={1.75} />
        </button>

        {/* 课本选择器（靠左） */}
        <TextbookSelector
          selectedId={selectedTextbookId}
          onSelect={setSelectedTextbookId}
        />
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-20 lg:px-44 py-5 relative overflow-y-auto">
        {/* 未选择课本时的引导卡片 */}
        {!selectedTextbookId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[704px] mb-6 p-5 rounded-xl border border-blue-200 bg-blue-50/50"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-notion-text">
                  请先选择一本课本
                </div>
                <div className="text-xs text-notion-text3 mt-1">
                  选择课本后即可开启对话。Wisector LearnLM 会基于课本内容提供精准讲解与练习。
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 输入框区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[704px] mb-4"
        >
          <div className="flex flex-col gap-2 px-3 py-2.5 rounded-[22px] border border-notion-border2 shadow-[0_8px_12px_rgba(25,25,25,0.03),0_2px_6px_rgba(25,25,25,0.03),0_0_0_1px_rgba(42,28,0,0.07)] bg-white min-h-[97px]">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="询问任何问题..."
              rows={1}
            className="w-full resize-none bg-transparent px-1 pt-1 text-sm text-notion-text tracking-tight placeholder:text-notion-text4 focus:outline-none min-h-[28px] max-h-[200px]"
          />

          {/* 底部工具栏 */}
          <div className="flex items-center gap-1 mt-5 flex-wrap">
            {/* 上传附件 / 引用笔记（新 + 号） */}
            <div className="relative" ref={attachRef}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setAttachOpen((v) => !v)}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors"
                title="上传附件 / 引用笔记"
              >
                <Plus className="w-5 h-5" strokeWidth={1.5} />
              </motion.button>
              <AnimatePresence>
                {attachOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 mb-2 w-44 rounded-xl border border-notion-border2 bg-white shadow-[0_8px_24px_rgba(25,25,25,0.12),0_2px_6px_rgba(25,25,25,0.06),0_0_0_1px_rgba(42,28,0,0.07)] py-1.5 z-50"
                  >
                    <button className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-notion-overlay2 transition-colors text-left text-sm text-notion-text">
                      <ImageIcon className="w-4 h-4" strokeWidth={1.5} />
                      上传图片
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-notion-overlay2 transition-colors text-left text-sm text-notion-text">
                      <FileText className="w-4 h-4" strokeWidth={1.5} />
                      上传文件
                    </button>
                    <div className="border-t border-notion-border my-1" />
                    <button className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-notion-overlay2 transition-colors text-left text-sm text-notion-text">
                      <FileText className="w-4 h-4" strokeWidth={1.5} />
                      引用笔记
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 设置弹层 */}
            <div className="relative" ref={settingsRef}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSettingsOpen((v) => !v)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                  settingsOpen || webAccess || mode === "edit"
                    ? "text-notion-text bg-notion-overlay2"
                    : "text-notion-text2 hover:bg-notion-overlay2"
                }`}
                title="设置"
              >
                <Settings2 className="w-5 h-5" strokeWidth={1.5} />
              </motion.button>

              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-notion-border2 bg-white shadow-[0_8px_24px_rgba(25,25,25,0.12),0_2px_6px_rgba(25,25,25,0.06),0_0_0_1px_rgba(42,28,0,0.07)] py-1.5 z-50"
                  >
                    {/* 网络访问开关 */}
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <div className="flex items-center gap-2 text-sm text-notion-text">
                        <Globe className="w-4 h-4" strokeWidth={1.5} />
                        网络访问
                      </div>
                      <button
                        onClick={() => setWebAccess((v) => !v)}
                        className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors ${
                          webAccess ? "bg-blue-500" : "bg-notion-border2"
                        }`}
                        aria-pressed={webAccess}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            webAccess ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="border-t border-notion-border my-1" />

                    {/* 模式 */}
                    <div className="px-3 py-1.5">
                      <div className="text-xs text-notion-text3 mb-1.5">模式</div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => setMode("ask")}
                          className={`h-7 rounded-md text-xs font-medium transition-colors ${
                            mode === "ask"
                              ? "bg-notion-text text-white"
                              : "bg-notion-overlay2 text-notion-text2 hover:bg-notion-overlay"
                          }`}
                        >
                          询问
                        </button>
                        <button
                          onClick={() => setMode("edit")}
                          className={`h-7 rounded-md text-xs font-medium transition-colors ${
                            mode === "edit"
                              ? "bg-notion-text text-white"
                              : "bg-notion-overlay2 text-notion-text2 hover:bg-notion-overlay"
                          }`}
                        >
                          编辑
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 推理开关（仅支持推理的模型显示） */}
            {supportsReasoning && (
              <div className="relative ml-1" ref={reasoningRef}>
                <button
                  onClick={() => {
                    if (!reasoningEnabled) {
                      setReasoningEnabled(true);
                      if (isIntensityModel) setReasoningMenuOpen(true);
                    } else if (isIntensityModel) {
                      setReasoningMenuOpen((v) => !v);
                    } else {
                      setReasoningEnabled(false);
                    }
                  }}
                  className={`flex items-center gap-1 h-7 px-2 rounded-full text-xs font-medium transition-colors ${
                    reasoningEnabled
                      ? "bg-blue-50 text-blue-700"
                      : "text-notion-text2 hover:bg-notion-overlay2"
                  }`}
                  title={isIntensityModel ? "推理强度" : "推理开关"}
                >
                  <Brain className="w-3.5 h-3.5" strokeWidth={2} />
                  {reasoningEnabled && isIntensityModel
                    ? `推理 · ${INTENSITY_LEVELS[intensity].label}`
                    : "推理"}
                  {reasoningEnabled && isIntensityModel && (
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${
                        reasoningMenuOpen ? "rotate-180" : ""
                      }`}
                      strokeWidth={2}
                    />
                  )}
                </button>

                {/* 推理强度下拉菜单（仅 intensity 模型 + 推理开启时） */}
                <AnimatePresence>
                  {isIntensityModel && reasoningEnabled && reasoningMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 mb-2 w-44 rounded-xl border border-notion-border2 bg-white shadow-[0_8px_24px_rgba(25,25,25,0.12),0_2px_6px_rgba(25,25,25,0.06),0_0_0_1px_rgba(42,28,0,0.07)] py-1.5 z-50"
                    >
                      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-notion-text4">
                        推理强度
                      </div>
                      {INTENSITY_LEVELS.map((level, i) => (
                        <button
                          key={level.value}
                          onClick={() => {
                            setIntensity(i);
                            setReasoningMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-sm transition-colors ${
                            i === intensity
                              ? "text-blue-700 bg-blue-50"
                              : "text-notion-text hover:bg-notion-overlay2"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{level.label}</span>
                            <span className="text-xs text-notion-text4">
                              {level.short}
                            </span>
                          </span>
                          {i === intensity && (
                            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                          )}
                        </button>
                      ))}
                      <div className="border-t border-notion-border my-1" />
                      <button
                        onClick={() => {
                          setReasoningEnabled(false);
                          setReasoningMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-notion-text2 hover:bg-notion-overlay2 transition-colors"
                      >
                        关闭推理
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="flex-1" />

            <ModelSelector
              configuredIds={configuredIds}
              selectedId={selectedModelId}
              onSelect={setSelectedModelId}
            />

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-7 h-7 rounded-xl flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors"
            >
              <Mic className="w-5 h-5" strokeWidth={1.5} />
            </motion.button>

            <motion.button
              whileHover={input && selectedTextbookId ? { scale: 1.05 } : {}}
              whileTap={input && selectedTextbookId ? { scale: 0.95 } : {}}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                input && selectedTextbookId
                  ? "bg-blue-500 text-white opacity-100"
                  : "bg-notion-overlay text-notion-text2 opacity-40"
              }`}
            >
              <Send className="w-4 h-4" strokeWidth={1.5} />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* 快捷操作区域（可关闭） */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[704px] overflow-hidden"
          >
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs text-notion-text2">立即开始</span>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowQuickActions(false)}
                className="w-6 h-6 rounded-xl flex items-center justify-center hover:bg-notion-overlay2 transition-colors"
                title="收起"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </motion.button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(42, 28, 0, 0.1)" }}
                    whileTap={{ scale: 0.98 }}
                    className="p-3 rounded-2xl bg-notion-overlay2 transition-colors flex flex-col gap-2.5 text-left"
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                    <span className="text-xs text-notion-text2">{action.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 收起状态下的小入口 */}
      {!showQuickActions && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowQuickActions(true)}
          className="mt-2 inline-flex items-center gap-1 text-xs text-notion-text3 hover:text-notion-text2 transition-colors"
        >
          <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
          展开快捷操作
        </motion.button>
      )}
      </div>
    </div>
  );
}
