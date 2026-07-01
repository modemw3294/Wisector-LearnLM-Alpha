"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Globe,
  Database,
  FileText,
  Wrench,
  Check,
  Loader2,
  ClipboardList,
  Video,
  Activity,
} from "lucide-react";

/** 工具名称 → Lucide 图标映射 */
const TOOL_ICONS: Record<string, React.FC<{ className?: string; strokeWidth?: number }>> = {
  search: Search,
  globe: Globe,
  database: Database,
  "file-text": FileText,
  "clipboard-list": ClipboardList,
  video: Video,
  activity: Activity,
  wrench: Wrench,
};

/** 工具名称 → 中文标签映射 */
const TOOL_LABELS: Record<string, string> = {
  web_search: "网页搜索",
  web_fetch: "网页抓取",
  db_read: "数据库读取",
  db_write: "数据库写入",
  db_delete: "数据库删除",
  note_list: "笔记列表",
  note_create: "创建笔记",
  note_read: "读取笔记",
  note_update: "更新笔记",
  note_delete: "删除笔记",
  quiz_list: "测验列表",
  quiz_get: "读取测验",
  quiz_create: "创建测验",
  quiz_update: "更新测验",
  quiz_delete: "删除测验",
  video_list: "视频列表",
  video_get: "读取视频",
  video_create: "创建视频",
  video_update: "更新视频",
  video_delete: "删除视频",
  activity_list: "学习轨迹",
  activity_stats: "学习统计",
};

function getToolIcon(name: string) {
  // 按前缀匹配
  if (name.startsWith("web_")) return Search;
  if (name.startsWith("db_")) return Database;
  if (name.startsWith("note_")) return FileText;
  if (name.startsWith("quiz_")) return ClipboardList;
  if (name.startsWith("video_")) return Video;
  if (name.startsWith("activity_")) return Activity;
  return Wrench;
}

function getToolLabel(name: string): string {
  return TOOL_LABELS[name] || name;
}

export interface ToolCallState {
  id: string;
  name: string;
  status: "running" | "done" | "error";
  output?: string;
}

interface ToolCallPanelProps {
  tools: ToolCallState[];
}

/** 不在对话中显示可视化的工具（数据库底层操作，对用户无意义） */
const HIDDEN_TOOLS = new Set(["db_read", "db_write", "db_delete"]);

/**
 * 工具调用可视化面板。
 * 运行中：动画图标 + "正在XX…"
 * 完成：静态灰色图标 + "已XX" + 可展开结果
 * 注：db_read/db_write/db_delete 为底层操作，不显示给用户
 */
export default function ToolCallPanel({ tools }: ToolCallPanelProps) {
  const visibleTools = tools.filter((t) => !HIDDEN_TOOLS.has(t.name));
  if (visibleTools.length === 0) return null;

  return (
    <div className="mb-3 space-y-1.5">
      {visibleTools.map((tool) => {
        const Icon = getToolIcon(tool.name);
        const label = getToolLabel(tool.name);
        const isRunning = tool.status === "running";
        const isDone = tool.status === "done";
        const isError = tool.status === "error";

        return (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-1 py-0.5 text-xs"
          >
            {/* 图标：运行中动画，完成后静态 */}
            {isRunning ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="text-blue-500"
              >
                <Loader2 className="w-3.5 h-3.5" strokeWidth={2} />
              </motion.span>
            ) : isError ? (
              <span className="text-red-500">
                <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              </span>
            ) : (
              <span className="text-notion-text3">
                <Check className="w-3.5 h-3.5" strokeWidth={2} />
              </span>
            )}

            {/* 状态文字 */}
            <span
              className={`font-medium ${
                isRunning
                  ? "text-blue-600"
                  : isError
                  ? "text-red-500"
                  : "text-notion-text3"
              }`}
            >
              {isRunning
                ? `正在${label}…`
                : isError
                ? `${label}出错`
                : `已${label}`}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export { getToolIcon, getToolLabel };