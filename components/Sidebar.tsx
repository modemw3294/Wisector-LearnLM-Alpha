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
  Trash2,
  FileText,
  X,
  Database,
} from "lucide-react";
import { useState } from "react";
import Logo from "./Logo";

const navItems = [
  { id: "new", label: "新对话", icon: Plus },
  { id: "video", label: "视频", icon: Video },
  { id: "explain", label: "讲解", icon: BookOpen },
  { id: "quiz", label: "测验", icon: ClipboardCheck },
  { id: "track", label: "学习轨迹", icon: LineChart },
  { id: "notes", label: "笔记", icon: Notebook },
];

interface Note {
  id: string;
  title: string;
  updatedAt: number;
}

interface SidebarProps {
  onOpenSettings: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /** 底部自定义内容（如视频目录） */
  bottomSlot?: React.ReactNode;
  /** 外部控制高亮的导航项 */
  activeTab?: string;
}

export default function Sidebar({
  onOpenSettings,
  mobileOpen = false,
  onMobileClose,
  bottomSlot,
  activeTab: activeTabProp,
}: SidebarProps) {
  const [internalTab, setInternalTab] = useState("new");
  const activeTab = activeTabProp ?? internalTab;
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([
    { id: "demo-1", title: "欢迎使用笔记", updatedAt: Date.now() - 3600_000 },
  ]);
  const [newNoteTitle, setNewNoteTitle] = useState("");

  const handleNavClick = (id: string) => {
    // 有独立页面的导航项：跳转
    if (id === "new") {
      window.location.href = "/";
      return;
    }
    if (id === "video") {
      window.location.href = "/video";
      return;
    }
    if (id === "notes") {
      setNotesPanelOpen((v) => !v);
      setInternalTab("notes");
    } else {
      setNotesPanelOpen(false);
      setInternalTab(id);
    }
    // 移动端：点完关闭抽屉
    if (id !== "notes" && onMobileClose) {
      onMobileClose();
    }
  };

  const addNote = () => {
    const title = newNoteTitle.trim() || `未命名笔记 ${notes.length + 1}`;
    const note: Note = {
      id: `note-${Date.now()}`,
      title,
      updatedAt: Date.now(),
    };
    setNotes((prev) => [note, ...prev]);
    setNewNoteTitle("");
  };

  const removeNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const isNotesActive = activeTab === "notes";
  const isNotesPanelOpen = notesPanelOpen && isNotesActive;

  // 侧边栏主体内容
  const sidebarContent = (
    <>
      {/* Logo 区域 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center px-4 py-3 gap-2"
      >
        <Logo />
        <span className="text-sm text-notion-text tracking-tight font-medium flex-1">
          Wisector LearnLM
        </span>
        {/* 移动端关闭按钮 */}
        <button
          onClick={onMobileClose}
          className="md:hidden w-7 h-7 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors"
          aria-label="关闭侧边栏"
        >
          <X className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </motion.div>

      {/* 垂直导航菜单 */}
      <nav className="flex flex-col gap-0.5 px-2 py-2">
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
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-notion-overlay rounded-md -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
              <span className="text-sm font-medium tracking-tight">
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>

      {/* 笔记列表面板 */}
      <AnimatePresence initial={false}>
        {isNotesPanelOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-2">
              <div className="flex items-center gap-1.5 px-2">
                <input
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addNote();
                  }}
                  placeholder="新建笔记…"
                  className="flex-1 h-7 px-2 rounded-md bg-white border border-notion-border2 text-xs text-notion-text placeholder:text-notion-text4 focus:outline-none focus:border-notion-text2 transition-colors"
                />
                <button
                  onClick={addNote}
                  className="w-7 h-7 rounded-md flex items-center justify-center bg-notion-text text-white hover:opacity-90 transition-opacity"
                  title="新建笔记"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>

              <div className="space-y-0.5 max-h-[40vh] overflow-y-auto">
                {notes.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-notion-text4 text-center">
                    暂无笔记
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="group relative flex items-center gap-2 px-2 h-7 rounded-md hover:bg-notion-overlay2 transition-colors"
                    >
                      <FileText
                        className="w-3.5 h-3.5 shrink-0 text-notion-text3"
                        strokeWidth={1.5}
                      />
                      <span className="flex-1 text-xs text-notion-text2 truncate">
                        {note.title}
                      </span>
                      <button
                        onClick={() => removeNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-notion-text3 hover:text-red-600 transition-all"
                        title="删除"
                      >
                        <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1" />

      {/* 自定义底部内容（如视频目录） */}
      {bottomSlot}

      {/* 底部：数据管理 + 设置 */}
      <div className="p-2 border-t border-notion-border space-y-0.5">
        <motion.a
          href="/data"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.25 }}
          whileTap={{ scale: 0.98 }}
          className="w-full h-8 px-2.5 rounded-md flex items-center gap-2.5 text-sm font-medium tracking-tight text-notion-text2 hover:bg-notion-overlay2 transition-colors"
        >
          <Database className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
          <span>数据管理</span>
        </motion.a>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.25 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenSettings}
          className="w-full h-8 px-2.5 rounded-md flex items-center gap-2.5 text-sm font-medium tracking-tight text-notion-text2 hover:bg-notion-overlay2 transition-colors"
        >
          <Settings className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
          <span>设置</span>
        </motion.button>
      </div>
    </>
  );

  return (
    <>
      {/* 桌面端：固定侧边栏 */}
      <aside className="hidden md:flex w-[270px] h-screen bg-notion-sidebar flex-col border-r border-notion-border shrink-0">
        {sidebarContent}
      </aside>

      {/* 移动端：抽屉式侧边栏 */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* 遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onMobileClose}
              className="md:hidden fixed inset-0 bg-black/40 z-40"
            />
            {/* 抽屉 */}
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

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  return `${day} 天前`;
}
