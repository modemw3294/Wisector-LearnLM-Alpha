"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  StopCircle,
  Loader2,
  AlertCircle,
  Copy,
  RefreshCw,
  ArrowDown,
} from "lucide-react";
import ModelSelector from "./ModelSelector";
import TextbookSelector from "./TextbookSelector";
import MarkdownRenderer from "./MarkdownRenderer";
import TypewriterText from "./TypewriterText";
import ToolCallPanel from "./ToolCallPanel";
import { useModelConfigs } from "@/lib/useModelConfigs";
import { api, ChatMessageFE } from "@/lib/api";
import type { ModelConfig } from "@/lib/types";
import { useChatStore, sendMessage, stopGeneration, regenerateMessage } from "@/lib/chatStore";
import DevLogPanel from "./DevLogPanel";

/** 引用资源类型 */
type ResourceRef =
  | { type: "textbook"; id: string; name: string }
  | { type: "collection"; id: string; name: string };

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
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);
  const [selectedTextbookId, setSelectedTextbookId] = useState<string | undefined>(undefined);
  const [reasoningEnabled, setReasoningEnabled] = useState(false);
  const [intensity, setIntensity] = useState<number>(1); // 默认「Medium」
  const [reasoningMenuOpen, setReasoningMenuOpen] = useState(false);

  // 设置弹层
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [webAccess, setWebAccess] = useState(true);
  const [mode, setMode] = useState<"ask" | "edit">("edit");

  // 附件 / 引用资源弹层
  const [attachOpen, setAttachOpen] = useState(false);

  // 已引用的资源（课本 / 题目合集）
  const [resourceRefs, setResourceRefs] = useState<ResourceRef[]>([]);

  // 资源选择弹窗
  const [resourcePicker, setResourcePicker] = useState<{
    open: boolean;
    type: "textbook" | "collection" | null;
  }>({ open: false, type: null });

  // 对话状态（全局存储，支持后台运行）
  const chatState = useChatStore();
  const messages = chatState.messages;
  const isLoading = chatState.isLoading;
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const reasoningRef = useRef<HTMLDivElement>(null);

  // 滚动到底部按钮
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  // 复制成功的消息 id（用于显示 ✓）
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const { models: configuredModels } = useModelConfigs();

  // 默认选中第一个已启用的模型（避免 ModelSelector 显示已选但 state 未设置导致无法发送）
  useEffect(() => {
    const firstEnabled = configuredModels.find((m) => m.enabled);
    if (!selectedModelId || !configuredModels.some((m) => m.enabled && m.id === selectedModelId)) {
      setSelectedModelId(firstEnabled?.id);
    }
  }, [configuredModels, selectedModelId]);

  // 当前选中模型的后端配置（reasoning 能力来自后端）
  const currentConfiguredModel = configuredModels.find(
    (m) => m.enabled && m.id === selectedModelId
  );
  const supportsReasoning = currentConfiguredModel
    ? currentConfiguredModel.reasoning !== "none"
    : false;
  const isIntensityModel = currentConfiguredModel
    ? currentConfiguredModel.reasoning === "intensity"
    : false;

  // 自动滚动到底部（仅在已接近底部时）
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    // 如果用户已滚动到接近底部（100px 内），则自动滚动
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // 检测滚动位置，决定是否显示"滚动到底部"按钮
  const handleChatScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowScrollBottom(!isNearBottom && el.scrollHeight > el.clientHeight + 200);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  // 复制消息内容
  const handleCopyMessage = useCallback((msgId: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    });
  }, []);

  // 重新生成 AI 回答
  const handleRegenerate = useCallback((messageIndex: number) => {
    if (!selectedModelId || isLoading) return;
    regenerateMessage({
      messageIndex,
      model: selectedModelId,
      webAccess,
      reasoning: reasoningEnabled
        ? { enabled: true, intensity: INTENSITY_LEVELS[intensity].value }
        : undefined,
    });
  }, [selectedModelId, isLoading, webAccess, reasoningEnabled, intensity]);

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

  // 发送消息（通过全局存储，支持后台运行）
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !selectedModelId || !selectedTextbookId || isLoading) return;

    setInput("");
    setShowQuickActions(false);

    // 构建历史
    const history: ChatMessageFE[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 组装带上下文的 prompt：主课本 + 引用资源（仅发送给 API，不显示在对话中）
    let context = `当前课本 id=${selectedTextbookId}。\n`;
    if (resourceRefs.length > 0) {
      const refs = resourceRefs
        .map((r) => (r.type === "textbook" ? `课本「${r.name}」(id=${r.id})` : `题目合集「${r.name}」(id=${r.id})`))
        .join("；");
      context += `请参考以下资源：${refs}。\n\n`;
    } else {
      context += "\n";
    }
    const finalText = context + text;

    await sendMessage({
      text: finalText,
      displayText: text,
      model: selectedModelId,
      history,
      webAccess,
      reasoning: reasoningEnabled
        ? { enabled: true, intensity: INTENSITY_LEVELS[intensity].value }
        : undefined,
    });
  }, [input, selectedModelId, selectedTextbookId, isLoading, messages, webAccess, reasoningEnabled, intensity, resourceRefs]);

  // 停止生成
  const handleStop = () => {
    stopGeneration();
  };

  // 键盘发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
      <div className="flex-1 flex flex-col items-center px-4 md:px-20 lg:px-44 py-5 relative overflow-hidden">
        {messages.length === 0 ? (
          /* 空状态：保持原始欢迎 UI */
          <div className="w-full max-w-[704px] flex flex-col justify-center flex-1">
            {/* 未配置模型时的引导卡片 */}
            {configuredModels.filter((m) => m.enabled).length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-[704px] mb-6 p-5 rounded-xl border border-accent-ring/60 bg-accent-light/40"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-accent-light/60 text-accent flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-notion-text">
                      请先配置一个模型
                    </div>
                    <div className="text-xs text-notion-text3 mt-1">
                      点击右上角设置 → 模型，添加并启用一个对话模型后即可开始对话。
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 未选择课本时的引导卡片 */}
            {!selectedTextbookId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-[704px] mb-6 p-5 rounded-xl border border-accent-ring/60 bg-accent-light/40"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-accent-light/60 text-accent flex items-center justify-center shrink-0">
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
              <ChatInputBox
                input={input}
                setInput={setInput}
                handleKeyDown={handleKeyDown}
                isLoading={isLoading}
                handleStop={handleStop}
                handleSend={handleSend}
                attachOpen={attachOpen}
                setAttachOpen={setAttachOpen}
                attachRef={attachRef}
                settingsOpen={settingsOpen}
                setSettingsOpen={setSettingsOpen}
                settingsRef={settingsRef}
                webAccess={webAccess}
                setWebAccess={setWebAccess}
                mode={mode}
                setMode={setMode}
                supportsReasoning={supportsReasoning}
                reasoningEnabled={reasoningEnabled}
                setReasoningEnabled={setReasoningEnabled}
                isIntensityModel={isIntensityModel}
                reasoningMenuOpen={reasoningMenuOpen}
                setReasoningMenuOpen={setReasoningMenuOpen}
                intensity={intensity}
                setIntensity={setIntensity}
                reasoningRef={reasoningRef}
                models={configuredModels}
                selectedModelId={selectedModelId}
                setSelectedModelId={setSelectedModelId}
                selectedTextbookId={selectedTextbookId}
                resourceRefs={resourceRefs}
                onAttachTextbook={() => setResourcePicker({ open: true, type: "textbook" })}
                onAttachCollection={() => setResourcePicker({ open: true, type: "collection" })}
                onRemoveResource={(id) => setResourceRefs((prev) => prev.filter((r) => r.id !== id))}
              />
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
                          whileHover={{ scale: 1.02, backgroundColor: "rgba(0, 0, 0, 0.1)" }}
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
        ) : (
          /* 有消息时：对话流模式 */
          <>
            {/* 对话消息区域（可滚动，滚动条贴画面最右侧） */}
            <div
              ref={chatContainerRef}
              onScroll={handleChatScroll}
              className="w-full flex-1 overflow-y-auto relative"
            >
              <div className="w-full max-w-[704px] mx-auto px-4 space-y-4 mb-4 pt-2">
              <AnimatePresence initial={false}>
                {messages.map((msg, msgIndex) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`group/msg flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative ${
                        msg.role === "user"
                          ? "max-w-[85%] ml-auto rounded-2xl px-4 py-3 bg-white border border-notion-border2 text-notion-text"
                          : "w-full bg-transparent text-notion-text"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <>
                          <ToolCallPanel tools={msg.toolCalls} />
                          {msg.content ? (
                            <TypewriterText
                              content={msg.content}
                              loading={msg.loading}
                            />
                          ) : (
                            msg.loading && (
                              <div className="flex items-center gap-2 text-notion-text4 text-sm">
                                <motion.span
                                  animate={{ opacity: [0.4, 1, 0.4] }}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                  思考中…
                                </motion.span>
                              </div>
                            )
                          )}
                        </>
                      )}

                      {/* 消息操作按钮（hover 显示） */}
                      {!msg.loading && msg.content && (
                        <div
                          className={`absolute -bottom-7 ${
                            msg.role === "user" ? "right-0" : "left-0"
                          } flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity`}
                        >
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="w-6 h-6 rounded flex items-center justify-center text-notion-text4 hover:text-notion-text hover:bg-notion-overlay2 transition-colors"
                            title="复制"
                          >
                            {copiedMsgId === msg.id ? (
                              <Check className="w-3 h-3 text-green-500" strokeWidth={2} />
                            ) : (
                              <Copy className="w-3 h-3" strokeWidth={1.5} />
                            )}
                          </button>
                          {msg.role === "assistant" && !isLoading && (
                            <button
                              onClick={() => handleRegenerate(msgIndex)}
                              className="w-6 h-6 rounded flex items-center justify-center text-notion-text4 hover:text-notion-text hover:bg-notion-overlay2 transition-colors"
                              title="重新生成"
                            >
                              <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              </div>
            </div>
            <AnimatePresence>
              {showScrollBottom && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-32 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white border border-notion-border2 shadow-md flex items-center justify-center text-notion-text2 hover:text-notion-text hover:shadow-lg transition-all z-10"
                  title="滚动到底部"
                >
                  <ArrowDown className="w-4 h-4" strokeWidth={1.75} />
                </motion.button>
              )}
            </AnimatePresence>

            {/* 对话模式下的输入框（固定底部） */}
            <div className="w-full max-w-[704px] mx-auto shrink-0">
              <ChatInputBox
                input={input}
                setInput={setInput}
                handleKeyDown={handleKeyDown}
                isLoading={isLoading}
                handleStop={handleStop}
                handleSend={handleSend}
                attachOpen={attachOpen}
                setAttachOpen={setAttachOpen}
                attachRef={attachRef}
                settingsOpen={settingsOpen}
                setSettingsOpen={setSettingsOpen}
                settingsRef={settingsRef}
                webAccess={webAccess}
                setWebAccess={setWebAccess}
                mode={mode}
                setMode={setMode}
                supportsReasoning={supportsReasoning}
                reasoningEnabled={reasoningEnabled}
                setReasoningEnabled={setReasoningEnabled}
                isIntensityModel={isIntensityModel}
                reasoningMenuOpen={reasoningMenuOpen}
                setReasoningMenuOpen={setReasoningMenuOpen}
                intensity={intensity}
                setIntensity={setIntensity}
                reasoningRef={reasoningRef}
                models={configuredModels}
                selectedModelId={selectedModelId}
                setSelectedModelId={setSelectedModelId}
                selectedTextbookId={selectedTextbookId}
                resourceRefs={resourceRefs}
                onAttachTextbook={() => setResourcePicker({ open: true, type: "textbook" })}
                onAttachCollection={() => setResourcePicker({ open: true, type: "collection" })}
                onRemoveResource={(id) => setResourceRefs((prev) => prev.filter((r) => r.id !== id))}
              />
            </div>
          </>
        )}
      </div>
      <div className="shrink-0 px-4 md:px-8 pb-2">
        <DevLogPanel />
      </div>

      {/* 引用资源选择弹窗 */}
      <ResourcePicker
        type={resourcePicker.type}
        open={resourcePicker.open}
        onClose={() => setResourcePicker({ open: false, type: null })}
        onSelect={(ref) => {
          setResourceRefs((prev) => {
            if (prev.some((r) => r.id === ref.id)) return prev;
            return [...prev, ref];
          });
          setResourcePicker({ open: false, type: null });
        }}
        existingIds={resourceRefs.map((r) => r.id)}
      />
    </div>
  );
}

/* ──────────────────────  输入框组件（复用）  ────────────────────── */
interface ChatInputBoxProps {
  input: string;
  setInput: (v: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  handleStop: () => void;
  handleSend: () => void;
  attachOpen: boolean;
  setAttachOpen: (fn: (v: boolean) => boolean) => void;
  attachRef: React.RefObject<HTMLDivElement | null>;
  settingsOpen: boolean;
  setSettingsOpen: (fn: (v: boolean) => boolean) => void;
  settingsRef: React.RefObject<HTMLDivElement | null>;
  webAccess: boolean;
  setWebAccess: (fn: (v: boolean) => boolean) => void;
  mode: "ask" | "edit";
  setMode: (m: "ask" | "edit") => void;
  supportsReasoning: boolean;
  reasoningEnabled: boolean;
  setReasoningEnabled: (v: boolean) => void;
  isIntensityModel: boolean;
  reasoningMenuOpen: boolean;
  setReasoningMenuOpen: (fn: (v: boolean) => boolean) => void;
  intensity: number;
  setIntensity: (i: number) => void;
  reasoningRef: React.RefObject<HTMLDivElement | null>;
  models: ModelConfig[];
  selectedModelId: string | undefined;
  setSelectedModelId: (id: string) => void;
  selectedTextbookId: string | undefined;
  resourceRefs: ResourceRef[];
  onAttachTextbook: () => void;
  onAttachCollection: () => void;
  onRemoveResource: (id: string) => void;
}

function ChatInputBox(props: ChatInputBoxProps) {
  const {
    input, setInput, handleKeyDown, isLoading, handleStop, handleSend,
    attachOpen, setAttachOpen, attachRef,
    settingsOpen, setSettingsOpen, settingsRef, webAccess, setWebAccess, mode, setMode,
    supportsReasoning, reasoningEnabled, setReasoningEnabled, isIntensityModel,
    reasoningMenuOpen, setReasoningMenuOpen, intensity, setIntensity, reasoningRef,
    models, selectedModelId, setSelectedModelId, selectedTextbookId,
    resourceRefs, onAttachTextbook, onAttachCollection, onRemoveResource,
  } = props;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col gap-2 px-3 py-2.5 rounded-[22px] border border-notion-border2 shadow-[0_8px_12px_rgba(25,25,25,0.03),0_2px_6px_rgba(25,25,25,0.03),0_0_0_1px_rgba(0,0,0,0.07)] bg-white min-h-[97px]">
        {/* 已引用的资源标签（在输入框上方） */}
        {resourceRefs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {resourceRefs.map((ref) => (
              <span
                key={ref.id}
                className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-md bg-notion-overlay2 text-xs text-notion-text border border-notion-border2"
              >
                {ref.type === "textbook" ? (
                  <BookOpen className="w-3 h-3 text-notion-text2" strokeWidth={2} />
                ) : (
                  <FileText className="w-3 h-3 text-notion-text2" strokeWidth={2} />
                )}
                <span className="max-w-[120px] truncate">{ref.name}</span>
                <button
                  onClick={() => onRemoveResource(ref.id)}
                  className="w-4 h-4 rounded-md flex items-center justify-center text-notion-text3 hover:text-notion-text hover:bg-notion-overlay2"
                >
                  <X className="w-3 h-3" strokeWidth={2} />
                </button>
              </span>
            ))}
          </div>
        )}

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="询问任何问题..."
          rows={1}
          className="w-full resize-none bg-transparent px-1 pt-1 text-sm text-notion-text tracking-tight placeholder:text-notion-text4 focus:outline-none min-h-[28px] max-h-[200px]"
        />

        {/* 底部工具栏 */}
        <div className="flex items-center gap-1 mt-5 flex-wrap">
          {/* 上传附件 */}
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
                  className="absolute bottom-full left-0 mb-2 w-48 rounded-xl border border-notion-border2 bg-white shadow-[0_8px_24px_rgba(25,25,25,0.12),0_2px_6px_rgba(25,25,25,0.06),0_0_0_1px_rgba(0,0,0,0.07)] py-1.5 z-50"
                >
                  <button
                    onClick={() => {
                      setAttachOpen((v) => !v);
                      onAttachTextbook();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-notion-overlay2 transition-colors text-left text-sm text-notion-text"
                  >
                    <BookOpen className="w-4 h-4" strokeWidth={1.5} />
                    引用课本
                  </button>
                  <button
                    onClick={() => {
                      setAttachOpen((v) => !v);
                      onAttachCollection();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-notion-overlay2 transition-colors text-left text-sm text-notion-text"
                  >
                    <FileText className="w-4 h-4" strokeWidth={1.5} />
                    引用题目
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
                settingsOpen
                  ? "text-notion-text"
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
                  className="absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-notion-border2 bg-white shadow-[0_8px_24px_rgba(25,25,25,0.12),0_2px_6px_rgba(25,25,25,0.06),0_0_0_1px_rgba(0,0,0,0.07)] py-1.5 z-50"
                >
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <div className="flex items-center gap-2 text-sm text-notion-text">
                      <Globe className="w-4 h-4" strokeWidth={1.5} />
                      网络访问
                    </div>
                    <button
                      onClick={() => setWebAccess((v) => !v)}
                      className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors ${
                        webAccess ? "bg-accent" : "bg-notion-border2"
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

          {/* 推理开关 */}
          {supportsReasoning && (
            <div className="relative ml-1" ref={reasoningRef}>
              <button
                onClick={() => {
                  if (!reasoningEnabled) {
                    setReasoningEnabled(true);
                    if (isIntensityModel) setReasoningMenuOpen((v) => !v);
                  } else if (isIntensityModel) {
                    setReasoningMenuOpen((v) => !v);
                  } else {
                    setReasoningEnabled(false);
                  }
                }}
                className={`flex items-center gap-1 h-7 px-2 rounded-full text-xs font-medium transition-colors ${
                  reasoningEnabled
                    ? "bg-accent-light/60 text-accent"
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

              <AnimatePresence>
                {isIntensityModel && reasoningEnabled && reasoningMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 mb-2 w-44 rounded-xl border border-notion-border2 bg-white shadow-[0_8px_24px_rgba(25,25,25,0.12),0_2px_6px_rgba(25,25,25,0.06),0_0_0_1px_rgba(0,0,0,0.07)] py-1.5 z-50"
                  >
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-notion-text4">
                      推理强度
                    </div>
                    {INTENSITY_LEVELS.map((level, i) => (
                      <button
                        key={level.value}
                        onClick={() => {
                          setIntensity(i);
                          setReasoningMenuOpen((v) => !v);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-sm transition-colors ${
                          i === intensity
                            ? "text-accent bg-accent-light/50"
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
                        setReasoningMenuOpen((v) => !v);
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
            models={models}
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

          {/* 发送 / 停止按钮 */}
          {isLoading ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStop}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-red-500 text-white"
              title="停止生成"
            >
              <StopCircle className="w-4 h-4" strokeWidth={2} />
            </motion.button>
          ) : (
            <motion.button
              whileHover={input && selectedTextbookId && selectedModelId ? { scale: 1.05 } : {}}
              whileTap={input && selectedTextbookId && selectedModelId ? { scale: 0.95 } : {}}
              onClick={handleSend}
              disabled={!input || !selectedTextbookId || !selectedModelId}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                input && selectedTextbookId && selectedModelId
                  ? "bg-accent text-white opacity-100"
                  : "bg-notion-overlay text-notion-text2 opacity-40"
              }`}
            >
              <Send className="w-4 h-4" strokeWidth={1.5} />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ──────────────────────  引用资源选择弹窗  ────────────────────── */
interface ResourcePickerProps {
  type: "textbook" | "collection" | null;
  open: boolean;
  onClose: () => void;
  onSelect: (ref: ResourceRef) => void;
  existingIds: string[];
}

function ResourcePicker({ type, open, onClose, onSelect, existingIds }: ResourcePickerProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Array<{ id: string; name: string; subject?: string; grade?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !type) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setQuery("");

    const fetcher = type === "textbook" ? api.listTextbooks() : api.listCollections();
    fetcher
      .then((data) => {
        if (cancelled) return;
        setItems((data || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          subject: d.subject,
          grade: d.grade,
        })));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, type]);

  useEffect(() => {
    if (open) {
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
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const title = type === "textbook" ? "引用课本" : type === "collection" ? "引用题目" : "";
  const emptyText = type === "textbook" ? "暂无课本" : type === "collection" ? "暂无题目合集" : "";
  const Icon = type === "textbook" ? BookOpen : FileText;

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {open && type && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center bg-black/30 px-4 pt-[10vh] sm:pt-0"
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
              <Icon className="w-4 h-4 text-notion-text3 shrink-0" strokeWidth={1.75} />
              <span className="text-sm font-medium text-notion-text">{title}</span>
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索…"
                className="flex-1 h-7 bg-transparent text-sm text-notion-text placeholder:text-notion-text4 focus:outline-none"
              />
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors shrink-0"
                aria-label="关闭"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="px-3 py-10 text-center text-sm text-notion-text3">
                  <Loader2 className="w-5 h-5 mx-auto animate-spin text-accent" strokeWidth={2} />
                  <div className="mt-2">加载中…</div>
                </div>
              ) : error ? (
                <div className="px-3 py-10 text-center text-sm text-red-600">
                  <AlertCircle className="w-5 h-5 mx-auto" strokeWidth={2} />
                  <div className="mt-2">{error}</div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-notion-text3">{emptyText}</div>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map((item) => {
                    const existing = existingIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        disabled={existing}
                        onClick={() =>
                          onSelect({
                            type: type === "textbook" ? "textbook" : "collection",
                            id: item.id,
                            name: item.name,
                          })
                        }
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                          existing
                            ? "opacity-50 cursor-not-allowed bg-notion-overlay"
                            : "hover:bg-notion-overlay2"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-accent-light/60 text-accent">
                          <Icon className="w-4 h-4" strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium tracking-tight truncate text-notion-text">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-notion-text4 mt-0.5">
                            {[item.subject, item.grade].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        {existing && <span className="text-[11px] text-notion-text4">已引用</span>}
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
  );
}