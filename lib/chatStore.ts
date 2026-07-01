"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api, ChatMessageFE, ChatStepFE } from "./api";
import type { ToolCallState } from "@/components/ToolCallPanel";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: ToolCallState[];
  loading?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  conversations: Conversation[];
  currentConversationId: string | null;
}

const STORAGE_KEY = "wisector-conversations";
const MAX_CONVERSATIONS = 50;

/** 全局单例状态（组件外存活） */
let globalState: ChatState = {
  messages: [],
  isLoading: false,
  conversations: [],
  currentConversationId: null,
};

let globalAbort: AbortController | null = null;

// 订阅者列表
const subscribers = new Set<() => void>();

function notify() {
  for (const fn of subscribers) fn();
}

function setState(patch: Partial<ChatState>) {
  globalState = { ...globalState, ...patch };
  notify();
}

// ============================================================
// localStorage 持久化
// ============================================================
function loadConversationsFromStorage(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveConversationsToStorage(conversations: Conversation[]) {
  if (typeof window === "undefined") return;
  try {
    // 只保存最近 MAX_CONVERSATIONS 条，且去掉 loading 状态
    const toSave = conversations
      .slice(0, MAX_CONVERSATIONS)
      .map((c) => ({
        ...c,
        messages: c.messages.map((m) => ({ ...m, loading: false })),
      }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // localStorage 满了或不可用，忽略
  }
}

/** 初始化：从 localStorage 加载对话列表 */
function initConversations() {
  if (typeof window === "undefined") return;
  const conversations = loadConversationsFromStorage();
  setState({ conversations });
}

// 标记是否已初始化（避免重复加载 localStorage）
let initialized = false;

/** React Hook：订阅全局对话状态 */
export function useChatStore() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    // 客户端挂载后才从 localStorage 加载，避免 SSR 水合不匹配
    if (!initialized && typeof window !== "undefined") {
      initialized = true;
      initConversations();
    }
    const fn = () => forceUpdate((n) => n + 1);
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }, []);

  return globalState;
}

/** 将当前对话保存到 conversations 列表 */
function saveCurrentConversation() {
  const { messages, currentConversationId, conversations } = globalState;
  if (messages.length === 0) return;

  // 以第一条用户消息作为标题
  const firstUserMsg = messages.find((m) => m.role === "user");
  const title = firstUserMsg
    ? firstUserMsg.content.slice(0, 40) + (firstUserMsg.content.length > 40 ? "…" : "")
    : "新对话";

  const now = Date.now();

  if (currentConversationId) {
    // 更新已有对话
    const updated = conversations.map((c) =>
      c.id === currentConversationId
        ? { ...c, title, messages: [...messages], updatedAt: now }
        : c
    );
    // 按 updatedAt 降序排序
    updated.sort((a, b) => b.updatedAt - a.updatedAt);
    setState({ conversations: updated });
    saveConversationsToStorage(updated);
  } else {
    // 新建对话
    const newId = `conv-${now}`;
    const newConv: Conversation = {
      id: newId,
      title,
      messages: [...messages],
      updatedAt: now,
    };
    const updated = [newConv, ...conversations];
    setState({ conversations: updated, currentConversationId: newId });
    saveConversationsToStorage(updated);
  }
}

/** 发送消息（后台运行，组件卸载也不中断） */
export async function sendMessage(params: {
  text: string;
  /** 显示在对话中的用户消息文本（若不提供则使用 text） */
  displayText?: string;
  model: string;
  history: ChatMessageFE[];
  webAccess?: boolean;
  reasoning?: { enabled: boolean; intensity: string };
}) {
  const { text, displayText, model, history, webAccess, reasoning } = params;
  if (!text || !model || globalState.isLoading) return;

  const userMsg: ChatMessage = {
    id: `user-${Date.now()}`,
    role: "user",
    content: displayText ?? text,
    toolCalls: [],
  };

  const assistantMsgId = `assistant-${Date.now()}`;
  const assistantMsg: ChatMessage = {
    id: assistantMsgId,
    role: "assistant",
    content: "",
    toolCalls: [],
    loading: true,
  };

  setState({
    messages: [...globalState.messages, userMsg, assistantMsg],
    isLoading: true,
  });

  const controller = new AbortController();
  globalAbort = controller;

  try {
    await api.chat({
      message: text,
      model,
      history,
      webAccess,
      reasoning,
      signal: controller.signal,
      onStep: (step: ChatStepFE) => {
        const updated = [...globalState.messages];
        const idx = updated.findIndex((m) => m.id === assistantMsgId);
        if (idx === -1) return;

        const msg = { ...updated[idx] };

        if (step.type === "tool_call" && step.toolCall) {
          msg.toolCalls = [...msg.toolCalls, {
            id: step.toolCall.id,
            name: step.toolCall.name,
            status: "running" as const,
          }];
        }
        if (step.type === "tool_result" && step.toolResult) {
          msg.toolCalls = msg.toolCalls.map((tc) =>
            tc.id === step.toolResult!.toolCallId
              ? { ...tc, status: "done" as const, output: step.toolResult!.output }
              : tc
          );
        }
        if (step.type === "text" && step.text) {
          msg.content += step.text;
        }
        if (step.type === "done") {
          msg.loading = false;
        }
        if (step.type === "error") {
          msg.content += `\n\n> ❌ 错误：${step.error || "未知错误"}`;
          msg.loading = false;
        }

        updated[idx] = msg;
        setState({ messages: updated });
      },
    });
    // 对话完成后保存
    saveCurrentConversation();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // 用户取消
      saveCurrentConversation();
    } else {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const updated = [...globalState.messages];
      const idx = updated.findIndex((m) => m.id === assistantMsgId);
      if (idx !== -1) {
        updated[idx] = {
          ...updated[idx],
          content: updated[idx].content + `\n\n> ❌ 错误：${errorMsg}`,
          loading: false,
        };
        setState({ messages: updated });
      }
      // 出错也保存（保留错误信息）
      saveCurrentConversation();
    }
  } finally {
    setState({ isLoading: false });
    globalAbort = null;
  }
}

/** 停止生成 */
export function stopGeneration() {
  globalAbort?.abort();
  globalAbort = null;
  setState({ isLoading: false });
  // 标记最后一条消息为非加载
  const msgs = [...globalState.messages];
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].loading) {
      msgs[i] = { ...msgs[i], loading: false, content: msgs[i].content + "\n\n> ⏹ 已停止生成" };
      break;
    }
  }
  setState({ messages: msgs });
}

/** 清空对话（开始新对话） */
export function clearChat() {
  if (globalState.isLoading) {
    stopGeneration();
  }
  setState({ messages: [], isLoading: false, currentConversationId: null });
}

/** 加载一个已有的对话 */
export function loadConversation(id: string) {
  if (globalState.isLoading) {
    stopGeneration();
  }
  const conv = globalState.conversations.find((c) => c.id === id);
  if (!conv) return;
  setState({
    messages: conv.messages.map((m) => ({ ...m, loading: false })),
    isLoading: false,
    currentConversationId: id,
  });
}

/** 删除一个对话 */
export function deleteConversation(id: string) {
  const updated = globalState.conversations.filter((c) => c.id !== id);
  setState({ conversations: updated });
  saveConversationsToStorage(updated);
  // 如果删除的是当前对话，清空消息
  if (globalState.currentConversationId === id) {
    setState({ messages: [], currentConversationId: null });
  }
}

/** 重命名对话 */
export function renameConversation(id: string, title: string) {
  const updated = globalState.conversations.map((c) =>
    c.id === id ? { ...c, title: title.trim() || c.title } : c
  );
  setState({ conversations: updated });
  saveConversationsToStorage(updated);
}

/** 重新生成指定 assistant 消息 */
export async function regenerateMessage(params: {
  messageIndex: number;
  model: string;
  webAccess?: boolean;
  reasoning?: { enabled: boolean; intensity: string };
}) {
  const { messageIndex, model, webAccess, reasoning } = params;
  if (globalState.isLoading || model === "unknown") return;

  const msgs = [...globalState.messages];
  // 找到要重新生成的 assistant 消息
  const targetMsg = msgs[messageIndex];
  if (!targetMsg || targetMsg.role !== "assistant") return;

  // 找到它前面的那条 user 消息
  let userMsg: ChatMessage | null = null;
  for (let i = messageIndex - 1; i >= 0; i--) {
    if (msgs[i].role === "user") {
      userMsg = msgs[i];
      break;
    }
  }
  if (!userMsg) return;

  // 截断到 user 消息为止（删除旧的 assistant 回答及之后的所有消息）
  const truncated = msgs.slice(0, messageIndex);

  // 新的 assistant 占位
  const assistantMsgId = `assistant-${Date.now()}`;
  const assistantMsg: ChatMessage = {
    id: assistantMsgId,
    role: "assistant",
    content: "",
    toolCalls: [],
    loading: true,
  };

  setState({
    messages: [...truncated, assistantMsg],
    isLoading: true,
  });

  // 构建历史（截断后的消息）
  const history: ChatMessageFE[] = truncated.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const controller = new AbortController();
  globalAbort = controller;

  try {
    await api.chat({
      message: userMsg.content,
      model,
      history,
      webAccess,
      reasoning,
      signal: controller.signal,
      onStep: (step: ChatStepFE) => {
        const updated = [...globalState.messages];
        const idx = updated.findIndex((m) => m.id === assistantMsgId);
        if (idx === -1) return;

        const msg = { ...updated[idx] };

        if (step.type === "tool_call" && step.toolCall) {
          msg.toolCalls = [...msg.toolCalls, {
            id: step.toolCall.id,
            name: step.toolCall.name,
            status: "running" as const,
          }];
        }
        if (step.type === "tool_result" && step.toolResult) {
          msg.toolCalls = msg.toolCalls.map((tc) =>
            tc.id === step.toolResult!.toolCallId
              ? { ...tc, status: "done" as const, output: step.toolResult!.output }
              : tc
          );
        }
        if (step.type === "text" && step.text) {
          msg.content += step.text;
        }
        if (step.type === "done") {
          msg.loading = false;
        }
        if (step.type === "error") {
          msg.content += `\n\n> ❌ 错误：${step.error || "未知错误"}`;
          msg.loading = false;
        }

        updated[idx] = msg;
        setState({ messages: updated });
      },
    });
    saveCurrentConversation();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      saveCurrentConversation();
    } else {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const updated = [...globalState.messages];
      const idx = updated.findIndex((m) => m.id === assistantMsgId);
      if (idx !== -1) {
        updated[idx] = {
          ...updated[idx],
          content: updated[idx].content + `\n\n> ❌ 错误：${errorMsg}`,
          loading: false,
        };
        setState({ messages: updated });
      }
      saveCurrentConversation();
    }
  } finally {
    setState({ isLoading: false });
    globalAbort = null;
  }
}

/** 是否有后台对话进行中 */
export function isChatRunning(): boolean {
  return globalState.isLoading;
}
