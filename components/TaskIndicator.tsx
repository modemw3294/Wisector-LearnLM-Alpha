"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ListChecks,
  BookOpen,
  ScanLine,
  ClipboardCheck,
  Video,
  FileQuestion,
} from "lucide-react";
import { api, type Task } from "@/lib/api";

const TASK_TYPE_ICON: Record<string, typeof BookOpen> = {
  analyze_textbook: BookOpen,
  scan_notes: ScanLine,
  generate_quiz: ClipboardCheck,
  generate_video: Video,
  recognize_questions: FileQuestion,
};

const TASK_TYPE_LABEL: Record<string, string> = {
  analyze_textbook: "分析课本",
  scan_notes: "扫描笔记",
  generate_quiz: "组卷",
  generate_video: "生成视频",
  recognize_questions: "识别题目",
};

export default function TaskIndicator({ collapsed }: { collapsed?: boolean }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useState(() => setMounted(true));

  const loadTasks = useCallback(async () => {
    try {
      const all = await api.listTasks();
      setTasks(all);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadTasks();
    const timer = setInterval(loadTasks, 3000);
    return () => clearInterval(timer);
  }, [loadTasks]);

  const runningTasks = tasks.filter(
    (t) => t.status === "queued" || t.status === "running"
  );
  const hasRunning = runningTasks.length > 0;

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* 指示器按钮 */}
      <button
        onClick={() => setPanelOpen(true)}
        className={`w-full h-8 px-2.5 rounded-md flex items-center gap-2.5 text-sm font-medium tracking-tight transition-colors ${
          hasRunning
            ? "text-accent bg-accent-light/30"
            : "text-notion-text2 hover:bg-notion-overlay2"
        } ${collapsed ? "justify-center px-0" : ""}`}
        title={collapsed ? "任务" : undefined}
      >
        {hasRunning ? (
          <Loader2 className="w-[18px] h-[18px] shrink-0 animate-spin" strokeWidth={1.75} />
        ) : (
          <ListChecks className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
        )}
        {!collapsed && (
          <span className="flex-1 text-left">
            {hasRunning ? `${runningTasks.length} 个任务进行中` : "任务"}
          </span>
        )}
      </button>

      {/* 任务面板 */}
      {mounted && (
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setPanelOpen(false)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[520px] max-h-[70vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden"
              >
                {/* 头部 */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-notion-border">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-accent" strokeWidth={1.75} />
                    <span className="text-sm font-semibold text-notion-text tracking-tight">
                      任务列表
                    </span>
                    {hasRunning && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-light/60 text-accent font-medium">
                        {runningTasks.length} 进行中
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setPanelOpen(false)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors"
                  >
                    <X className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </div>

                {/* 任务列表 */}
                <div className="flex-1 overflow-y-auto p-3">
                  {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ListChecks className="w-8 h-8 text-notion-text4 mb-2" strokeWidth={1.5} />
                      <div className="text-sm text-notion-text3">暂无任务</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map((task) => {
                        const Icon = TASK_TYPE_ICON[task.type] || ListChecks;
                        const isRunning = task.status === "queued" || task.status === "running";
                        const isDone = task.status === "done";
                        const isError = task.status === "error";

                        return (
                          <div
                            key={task.id}
                            className="p-3 rounded-lg border border-notion-border2 bg-white"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                                  isRunning
                                    ? "bg-accent-light/60 text-accent"
                                    : isDone
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                              >
                                {isRunning ? (
                                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                                ) : isDone ? (
                                  <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
                                ) : (
                                  <AlertCircle className="w-4 h-4" strokeWidth={1.75} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <Icon className="w-3 h-3 text-notion-text3 shrink-0" strokeWidth={1.75} />
                                  <span className="text-[10px] text-notion-text3">
                                    {TASK_TYPE_LABEL[task.type] || task.type}
                                  </span>
                                </div>
                                <div className="text-sm font-medium text-notion-text tracking-tight mt-0.5 truncate">
                                  {task.title}
                                </div>

                                {/* 步骤进度 */}
                                {task.steps.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {task.steps.map((step) => (
                                      <div key={step.id} className="flex items-center gap-1.5">
                                        {step.status === "done" ? (
                                          <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" strokeWidth={2} />
                                        ) : step.status === "running" ? (
                                          <Loader2 className="w-3 h-3 text-accent animate-spin shrink-0" strokeWidth={2} />
                                        ) : step.status === "error" ? (
                                          <AlertCircle className="w-3 h-3 text-red-500 shrink-0" strokeWidth={2} />
                                        ) : (
                                          <div className="w-3 h-3 rounded-full border border-notion-border2 shrink-0" />
                                        )}
                                        <span
                                          className={`text-xs ${
                                            step.status === "done"
                                              ? "text-notion-text3"
                                              : step.status === "running"
                                              ? "text-notion-text"
                                              : "text-notion-text4"
                                          }`}
                                        >
                                          {step.label}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* 结果/错误 */}
                                {task.resultSummary && isDone && (
                                  <div className="mt-1.5 text-xs text-green-700">{task.resultSummary}</div>
                                )}
                                {task.error && isError && (
                                  <div className="mt-1.5 text-xs text-red-600">{task.error}</div>
                                )}
                              </div>

                              {/* 删除按钮（仅完成/失败） */}
                              {!isRunning && (
                                <button
                                  onClick={() => handleDelete(task.id)}
                                  className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-notion-text4 hover:text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
