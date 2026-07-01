"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  ChevronDown,
  ChevronRight,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { api, type DevLogEntry } from "@/lib/api";
import { useDevMode } from "@/lib/devMode";

const FEATURE_LABELS: Record<string, string> = {
  chat: "对话",
  vision: "视觉",
  pdf: "PDF",
  ai: "AI",
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("zh-CN", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
}

function statusColor(status: number): string {
  if (status === 0) return "text-red-600";
  if (status >= 200 && status < 300) return "text-green-600";
  if (status >= 400) return "text-red-600";
  return "text-notion-text3";
}

function JsonBlock({ label, data }: { label: string; data: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const isLong = text.length > 300;
  const display = expanded ? text : text.slice(0, 300) + (isLong ? "…" : "");

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-notion-text3 uppercase tracking-wide">{label}</span>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-accent hover:underline"
          >
            {expanded ? "收起" : `展开 (${text.length} 字符)`}
          </button>
        )}
      </div>
      <pre className="text-[11px] leading-relaxed font-mono text-notion-text2 bg-notion-overlay rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
        {display || "(空)"}
      </pre>
    </div>
  );
}

function LogEntryItem({ entry }: { entry: DevLogEntry }) {
  const [open, setOpen] = useState(false);
  const hasError = entry.error || entry.responseStatus === 0 || entry.responseStatus >= 400;

  return (
    <div className="border border-notion-border2 rounded-md bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-notion-overlay2 transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-notion-text3 shrink-0" strokeWidth={2} />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-notion-text3 shrink-0" strokeWidth={2} />
        )}
        {hasError ? (
          <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" strokeWidth={2} />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" strokeWidth={2} />
        )}
        <span className="text-[11px] font-mono text-notion-text3 shrink-0">{formatTime(entry.timestamp)}</span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-accent-light/60 text-accent font-medium shrink-0">
          {FEATURE_LABELS[entry.feature] || entry.feature}
        </span>
        <span className="text-xs text-notion-text2 truncate flex-1 font-mono">
          {entry.method} {entry.url}
        </span>
        <span className={`text-xs font-mono font-medium shrink-0 ${statusColor(entry.responseStatus)}`}>
          {entry.responseStatus === 0 ? "ERR" : entry.responseStatus}
        </span>
        <span className="text-[11px] text-notion-text4 shrink-0">{entry.durationMs}ms</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-notion-border2"
          >
            <div className="p-3 space-y-3 bg-notion-overlay/30">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-notion-text4">模型</span>
                  <div className="font-mono text-notion-text2">{entry.model}</div>
                </div>
                <div>
                  <span className="text-notion-text4">格式</span>
                  <div className="font-mono text-notion-text2">{entry.format}</div>
                </div>
                <div>
                  <span className="text-notion-text4">方法</span>
                  <div className="font-mono text-notion-text2">{entry.method}</div>
                </div>
                <div>
                  <span className="text-notion-text4">耗时</span>
                  <div className="font-mono text-notion-text2">{entry.durationMs}ms</div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-notion-text3 uppercase tracking-wide">URL</span>
                <div className="text-[11px] font-mono text-notion-text2 bg-notion-overlay rounded p-2 break-all">
                  {entry.url}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-notion-text3 uppercase tracking-wide">请求头</span>
                <pre className="text-[11px] leading-relaxed font-mono text-notion-text2 bg-notion-overlay rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(entry.requestHeaders, null, 2) || "(空)"}
                </pre>
              </div>

              <JsonBlock label="请求体" data={entry.requestBody} />
              <JsonBlock label="响应体" data={entry.responseBody} />

              {entry.error && (
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-red-500 uppercase tracking-wide">错误</span>
                  <pre className="text-[11px] leading-relaxed font-mono text-red-600 bg-red-50 rounded p-2 whitespace-pre-wrap break-all">
                    {entry.error}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DevLogPanelProps {
  /** 自动刷新间隔（毫秒），默认 2000 */
  pollInterval?: number;
}

/**
 * 开发者日志面板：折叠式展示后端 AI 调用的请求/响应。
 * 仅当开发者模式开启时渲染。
 */
export default function DevLogPanel({ pollInterval = 2000 }: DevLogPanelProps) {
  const { devMode } = useDevMode();
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<DevLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listDevLogs();
      setLogs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(async () => {
    try {
      await api.clearDevLogs();
      setLogs([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // 轮询刷新
  useEffect(() => {
    if (!devMode || !open) return;
    refresh();
    const timer = setInterval(refresh, pollInterval);
    return () => clearInterval(timer);
  }, [devMode, open, refresh, pollInterval]);

  // 开发者模式开启时首次加载
  useEffect(() => {
    if (devMode && open && logs.length === 0) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devMode, open]);

  if (!devMode) return null;

  const errorCount = logs.filter((l) => l.error || l.responseStatus === 0 || l.responseStatus >= 400).length;

  return (
    <div className="border border-notion-border2 rounded-md bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-notion-overlay2 transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-notion-text3" strokeWidth={2} />
        ) : (
          <ChevronRight className="w-4 h-4 text-notion-text3" strokeWidth={2} />
        )}
        <Terminal className="w-4 h-4 text-notion-text2" strokeWidth={2} />
        <span className="text-sm font-medium text-notion-text">开发者日志</span>
        {logs.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-notion-overlay2 text-notion-text3 font-mono">
            {logs.length}
          </span>
        )}
        {errorCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-mono">
            {errorCount} 错误
          </span>
        )}
        {loading && <Loader2 className="w-3 h-3 text-notion-text4 animate-spin" strokeWidth={2} />}
        <span className="flex-1" />
        <span className="text-[11px] text-notion-text4">显示 AI 调用的请求与响应</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-notion-border2"
          >
            <div className="p-3 space-y-2 max-h-[480px] overflow-y-auto">
              <div className="flex items-center gap-2 pb-2 border-b border-notion-border">
                <button
                  onClick={refresh}
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs text-notion-text2 hover:bg-notion-overlay2 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" strokeWidth={2} />
                  刷新
                </button>
                <button
                  onClick={clear}
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs text-notion-text2 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3 h-3" strokeWidth={2} />
                  清空
                </button>
                <span className="text-[11px] text-notion-text4">每 {pollInterval / 1000}s 自动刷新</span>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 text-red-700 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!error && logs.length === 0 && !loading && (
                <div className="text-center py-8 text-sm text-notion-text4">
                  暂无日志。触发任意 AI 功能（对话、分析课本、扫描笔记等）后会在此显示。
                </div>
              )}

              {logs.length > 0 && (
                <div className="space-y-1.5">
                  {logs.map((entry) => (
                    <LogEntryItem key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
