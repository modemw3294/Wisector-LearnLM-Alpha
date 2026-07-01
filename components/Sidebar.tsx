"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Video,
  BookOpen,
  ClipboardCheck,
  LineChart,
  Settings,
  Notebook,
  X,
  Database,
  PanelLeftClose,
  PanelLeft,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import Logo from "./Logo";
import { useChatStore, clearChat, loadConversation, deleteConversation, renameConversation } from "@/lib/chatStore";
import TaskIndicator from "./TaskIndicator";
import { Trash2, MessageSquare, Pencil } from "lucide-react";

const navItems = [
  { id: "new", label: "新对话", icon: Plus },
  { id: "video", label: "视频", icon: Video },
  { id: "explain", label: "讲解", icon: BookOpen },
  { id: "quiz", label: "测验", icon: ClipboardCheck },
  { id: "trace", label: "学习轨迹", icon: LineChart },
  { id: "notes", label: "笔记", icon: Notebook },
];

interface SidebarProps {
  onOpenSettings: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /** 底部自定义内容（如视频目录） */
  bottomSlot?: React.ReactNode;
  /** 外部控制高亮的导航项 */
  activeTab?: string;
  /** PC 端折叠状态 */
  collapsed?: boolean;
  /** PC 端折叠切换回调 */
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  onOpenSettings,
  mobileOpen = false,
  onMobileClose,
  bottomSlot,
  activeTab: activeTabProp,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const [internalTab, setInternalTab] = useState("new");
  const activeTab = activeTabProp ?? internalTab;
  const chatState = useChatStore();
  const chatRunning = chatState.isLoading;
  const conversations = chatState.conversations || [];
  const currentConvId = chatState.currentConversationId;

  // 对话重命名状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const startRename = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
  };

  const commitRename = () => {
    if (editingId) {
      renameConversation(editingId, editingTitle);
    }
    setEditingId(null);
    setEditingTitle("");
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const handleNavClick = (id: string) => {
    if (id === "new") {
      // 清空对话再跳转
      clearChat();
      window.location.href = "/";
      return;
    }
    if (id === "video") {
      window.location.href = "/video";
      return;
    }
    if (id === "quiz") {
      window.location.href = "/quiz";
      return;
    }
    if (id === "notes") {
      window.location.href = "/notes";
      return;
    }
    if (id === "trace") {
      window.location.href = "/trace";
      return;
    }
    setInternalTab(id);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  // 侧边栏主体内容
  const sidebarContent = (
    <>
      {/* Logo 区域 */}
      <div
        className={`flex items-center py-3 gap-2 ${
          collapsed ? "flex-col px-1" : "px-4"
        }`}
      >
        <div className={`flex items-center gap-2 ${collapsed ? "flex-col" : "flex-1 w-full"}`}>
          <Logo />
          {!collapsed && (
            <span className="text-sm text-notion-text tracking-tight font-medium flex-1">
              Wisector LearnLM
            </span>
          )}
          {/* 折叠切换按钮 - 紧挨 Wisector LearnLM 字样右边 */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex w-7 h-7 rounded-md items-center justify-center text-notion-text3 hover:bg-notion-overlay2 transition-colors shrink-0"
              title={collapsed ? "展开侧边栏" : "折叠侧边栏"}
              aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
            >
              {collapsed ? (
                <PanelLeft className="w-4 h-4" strokeWidth={1.75} />
              ) : (
                <PanelLeftClose className="w-4 h-4" strokeWidth={1.75} />
              )}
            </button>
          )}
          {/* 移动端关闭按钮 */}
          <button
            onClick={onMobileClose}
            className="md:hidden w-7 h-7 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors"
            aria-label="关闭侧边栏"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* 垂直导航菜单 */}
      <nav className={`flex flex-col gap-0.5 py-2 ${collapsed ? "px-1" : "px-2"}`}>
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05, duration: 0.25 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNavClick(item.id)}
              className={`relative h-8 px-2.5 rounded-md flex items-center gap-2.5 transition-colors ${
                isActive
                  ? "text-notion-text"
                  : "text-notion-text2 hover:bg-notion-overlay2"
              } ${collapsed ? "justify-center px-0" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-notion-overlay rounded-md -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <div className="relative shrink-0">
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                {/* 无当前对话但有任务运行时：新对话按钮显示 spinner */}
                {item.id === "new" && chatRunning && !currentConvId && (
                  <Loader2
                    className="w-[18px] h-[18px] text-accent animate-spin absolute inset-0"
                    strokeWidth={1.75}
                  />
                )}
              </div>
              {!collapsed && (
                <span className="text-sm font-medium tracking-tight flex-1 text-left">
                  {item.label}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* 对话历史列表 */}
      {!collapsed && conversations.length > 0 && (
        <div className="px-3 pt-2 pb-1">
          <span className="text-[11px] font-medium text-notion-text4 px-1">最近对话</span>
        </div>
      )}
      {!collapsed && conversations.length > 0 && (
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 min-h-0">
          {conversations.map((conv) => {
            const isEditing = editingId === conv.id;
            return (
              <div
                key={conv.id}
                className={`group relative h-8 px-2.5 rounded-md flex items-center gap-2 cursor-pointer transition-colors ${
                  currentConvId === conv.id
                    ? "bg-notion-overlay text-notion-text"
                    : "text-notion-text2 hover:bg-notion-overlay2"
                } ${isEditing ? "bg-notion-overlay" : ""}`}
                onClick={() => {
                  if (isEditing) return;
                  loadConversation(conv.id);
                  window.location.href = "/";
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startRename(conv.id, conv.title);
                }}
              >
                <div className="relative shrink-0">
                  <MessageSquare className="w-[15px] h-[15px] text-notion-text4" strokeWidth={1.5} />
                  {/* 当前对话运行中：spinner 覆盖在图标上 */}
                  {chatRunning && currentConvId === conv.id && (
                    <Loader2
                      className="w-[15px] h-[15px] text-accent animate-spin absolute inset-0"
                      strokeWidth={1.5}
                    />
                  )}
                </div>
                {isEditing ? (
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitRename();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        cancelRename();
                      }
                    }}
                    className="flex-1 min-w-0 text-xs bg-white border border-accent-ring rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-accent"
                  />
                ) : (
                  <span className="text-xs flex-1 truncate" title={conv.title}>
                    {conv.title}
                  </span>
                )}
                {!isEditing && (
                  <div className="flex items-center shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(conv.id, conv.title);
                      }}
                      className="w-5 h-5 rounded flex items-center justify-center text-notion-text4 hover:text-notion-text hover:bg-notion-overlay opacity-0 group-hover:opacity-100 transition-all"
                      title="重命名"
                    >
                      <Pencil className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="w-5 h-5 rounded flex items-center justify-center text-notion-text4 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="删除对话"
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {collapsed && conversations.length === 0 && <div className="flex-1" />}
      {!collapsed && conversations.length === 0 && <div className="flex-1" />}

      {/* 自定义底部内容 */}
      {bottomSlot}

      {/* 底部按钮 */}
      <div className={`p-2 border-t border-notion-border space-y-0.5 ${collapsed ? "flex flex-col items-center" : ""}`}>
        {/* 任务指示器 */}
        <TaskIndicator collapsed={collapsed} />

        <motion.a
          href="/data"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.25 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full h-8 px-2.5 rounded-md flex items-center gap-2.5 text-sm font-medium tracking-tight text-notion-text2 hover:bg-notion-overlay2 transition-colors ${
            collapsed ? "justify-center px-0" : ""
          }`}
          title={collapsed ? "数据管理" : undefined}
        >
          <Database className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
          {!collapsed && <span>数据管理</span>}
        </motion.a>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.25 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenSettings}
          className={`w-full h-8 px-2.5 rounded-md flex items-center gap-2.5 text-sm font-medium tracking-tight text-notion-text2 hover:bg-notion-overlay2 transition-colors ${
            collapsed ? "justify-center px-0" : ""
          }`}
          title={collapsed ? "设置" : undefined}
        >
          <Settings className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
          {!collapsed && <span>设置</span>}
        </motion.button>
      </div>
    </>
  );

  return (
    <>
      {/* 桌面端：固定侧边栏 */}
      <aside
        className={`hidden md:flex h-screen bg-notion-sidebar flex-col border-r border-notion-border shrink-0 transition-all duration-200 ${
          collapsed ? "w-[56px]" : "w-[270px]"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* 移动端：抽屉式侧边栏 */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onMobileClose}
              className="md:hidden fixed inset-0 bg-black/40 z-40"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="md:hidden fixed top-0 left-0 bottom-0 w-[270px] bg-notion-sidebar flex flex-col z-50 shadow-xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}