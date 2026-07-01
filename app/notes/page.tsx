"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Trash2,
  FileText,
  ScanLine,
  Menu,
  X,
  Clock,
  Pencil,
  Sparkles,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import SettingsModal from "@/components/SettingsModal";
import DevLogPanel from "@/components/DevLogPanel";
import RichNoteEditor from "@/components/RichNoteEditor";
import ScanNoteModal from "@/components/ScanNoteModal";
import AIAssistModal from "@/components/AIAssistModal";
import MenuBar, { buildNotesMenuBar } from "@/components/MenuBar";
import { api, Note } from "@/lib/api";

export default function NotesPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // 主侧边栏折叠
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // 笔记侧边栏折叠
  const [notesSidebarCollapsed, setNotesSidebarCollapsed] = useState(false);

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // 全局搜索
  const [globalSearch, setGlobalSearch] = useState("");
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // 重命名
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // 上下文菜单
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; note: Note } | null>(null);

  // 弹窗
  const [scanOpen, setScanOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);

  // 加载笔记列表
  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listNotes();
      setNotes(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // 键盘快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n" && !e.shiftKey) {
        e.preventDefault();
        handleNewNote();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // 切换选中笔记
  useEffect(() => {
    if (selectedNote) {
      setContent(selectedNote.content);
    } else {
      setContent("");
    }
  }, [selectedNote]);

  // 自动保存（防抖500ms）
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      if (!selectedNote) return;
      if (saveTimer) clearTimeout(saveTimer);
      const timer = setTimeout(async () => {
        setSaving(true);
        try {
          const updated = await api.updateNote(selectedNote.id, {
            content: newContent,
          });
          setNotes((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
          setSelectedNote(updated);
        } catch {
          // silent
        } finally {
          setSaving(false);
        }
      }, 500);
      setSaveTimer(timer);
    },
    [selectedNote, saveTimer]
  );

  // 新建笔记
  const handleNewNote = async () => {
    try {
      const note = await api.createNote({ title: "未命名笔记", content: "" });
      setNotes((prev) => [note, ...prev]);
      setSelectedNote(note);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // 删除笔记
  const handleDeleteNote = async (id: string) => {
    if (!confirm("确认删除这条笔记？")) return;
    try {
      await api.deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // 重命名笔记
  const startRename = (note: Note) => {
    setRenamingId(note.id);
    setRenameValue(note.title);
    setContextMenu(null);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    try {
      const updated = await api.updateNote(renamingId, { title: trimmed });
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      if (selectedNote?.id === renamingId) {
        setSelectedNote(updated);
      }
    } catch {
      // silent
    }
    setRenamingId(null);
  };

  // 右键上下文菜单
  const handleContextMenu = (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, note });
  };

  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // 更新标题
  const handleTitleChange = async (newTitle: string) => {
    if (!selectedNote) return;
    setSelectedNote({ ...selectedNote, title: newTitle });
    try {
      const updated = await api.updateNote(selectedNote.id, { title: newTitle });
      setNotes((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n))
      );
      setSelectedNote(updated);
    } catch {
      // silent
    }
  };

  // 扫描笔记结果
  const handleScanApply = (markdown: string) => {
    if (selectedNote) {
      const newContent = selectedNote.content
        ? selectedNote.content + "\n\n" + markdown
        : markdown;
      handleContentChange(newContent);
    } else {
      api
        .createNote({ title: "扫描笔记", content: markdown })
        .then((note) => {
          setNotes((prev) => [note, ...prev]);
          setSelectedNote(note);
        });
    }
  };

  // AI 辅助结果
  const handleAIApply = (result: string) => {
    setContent((prev) => prev + "\n\n" + result);
    if (selectedNote) {
      api
        .updateNote(selectedNote.id, { content: content + "\n\n" + result })
        .then((updated) => {
          setNotes((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
          setSelectedNote(updated);
        });
    }
    setAiPrompt(null);
  };

  const handleAISelect = (selectedText: string) => {
    setAiPrompt(selectedText);
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const globalFilteredNotes = globalSearch
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(globalSearch.toLowerCase()) ||
          n.content.toLowerCase().includes(globalSearch.toLowerCase())
      )
    : notes;

  // 菜单栏配置
  const menuGroups = buildNotesMenuBar({
    onNewNote: handleNewNote,
    onNewChat: () => { window.location.href = "/"; },
    onToggleSidebar: () => setSidebarCollapsed((v) => !v),
    onToggleNotesSidebar: () => setNotesSidebarCollapsed((v) => !v),
    onOpenSettings: () => setIsSettingsOpen(true),
  });

  return (
    <main className="flex h-screen bg-notion-bg overflow-hidden">
      <Sidebar
        onOpenSettings={() => setIsSettingsOpen(true)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        activeTab="notes"
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 菜单栏 */}
        <MenuBar
          menus={menuGroups}
          onNewNote={handleNewNote}
          onNewChat={() => { window.location.href = "/"; }}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          onToggleNotesSidebar={() => setNotesSidebarCollapsed((v) => !v)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* 主体区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧笔记列表 - 可折叠 */}
          <AnimatePresence>
            {!notesSidebarCollapsed && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="border-r border-notion-border bg-white flex flex-col shrink-0 overflow-hidden"
                style={{ minWidth: 0 }}
              >
                <div className="w-[280px] h-full flex flex-col">
                  {/* 头部 */}
                  <div className="flex items-center gap-2 px-3 h-10 border-b border-notion-border shrink-0">
                    <span className="text-xs font-semibold text-notion-text tracking-tight flex-1">
                      笔记列表
                    </span>
                    <button
                      onClick={() => setNotesSidebarCollapsed(true)}
                      className="w-6 h-6 rounded flex items-center justify-center text-notion-text3 hover:bg-notion-overlay2 transition-colors"
                      title="折叠笔记列表"
                    >
                      <PanelLeftClose className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>

                  {/* 列表搜索 */}
                  <div className="p-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-notion-text4" strokeWidth={1.5} />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="筛选笔记…"
                        className="w-full h-8 pl-8 pr-2 rounded-md bg-notion-overlay2 border border-transparent text-xs text-notion-text placeholder:text-notion-text4 focus:outline-none focus:border-notion-border2 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="px-2 pb-2 flex gap-1.5">
                    <button
                      onClick={handleNewNote}
                      className="flex-1 h-7 rounded-md bg-notion-text text-white text-[11px] font-medium hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" strokeWidth={2} />
                      新建
                    </button>
                    <button
                      onClick={() => setScanOpen(true)}
                      className="flex-1 h-7 rounded-md border border-dashed border-notion-border2 text-notion-text3 text-[11px] font-medium hover:bg-notion-overlay2 hover:text-notion-text2 transition-colors inline-flex items-center justify-center gap-1"
                    >
                      <ScanLine className="w-3 h-3" strokeWidth={1.75} />
                      扫描
                    </button>
                  </div>

                  {/* 笔记列表 */}
                  <div className="flex-1 overflow-y-auto">
                    {loading ? (
                      <div className="px-4 py-8 text-center text-xs text-notion-text4">加载中…</div>
                    ) : error ? (
                      <div className="px-4 py-8 text-center text-xs text-red-500">{error}</div>
                    ) : filteredNotes.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-notion-text4">
                        {searchQuery ? "没有匹配的笔记" : "还没有笔记，点击「新建」开始"}
                      </div>
                    ) : (
                      <div className="p-2 space-y-0.5">
                        <AnimatePresence initial={false}>
                          {filteredNotes.map((note) => {
                            const isSelected = selectedNote?.id === note.id;
                            const isRenaming = renamingId === note.id;
                            return (
                              <motion.div
                                key={note.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 8 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => !isRenaming && setSelectedNote(note)}
                                onContextMenu={(e) => handleContextMenu(e, note)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === "Enter" && !isRenaming) setSelectedNote(note); }}
                                className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-md text-left transition-colors group cursor-pointer ${
                                  isSelected ? "bg-accent-light/50" : "hover:bg-notion-overlay2"
                                }`}
                              >
                                <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? "text-accent" : "text-notion-text3"}`} strokeWidth={1.5} />
                                <div className="flex-1 min-w-0">
                                  {isRenaming ? (
                                    <input
                                      ref={renameInputRef}
                                      value={renameValue}
                                      onChange={(e) => setRenameValue(e.target.value)}
                                      onBlur={commitRename}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") commitRename();
                                        if (e.key === "Escape") setRenamingId(null);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full bg-white border border-accent-ring rounded px-1.5 py-0.5 text-sm font-medium text-notion-text focus:outline-none"
                                    />
                                  ) : (
                                    <div className="text-sm font-medium text-notion-text truncate">{note.title}</div>
                                  )}
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Clock className="w-3 h-3 text-notion-text4" strokeWidth={1.5} />
                                    <span className="text-[10px] text-notion-text4">{formatTime(note.updatedAt)}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                                  className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-notion-text3 hover:text-red-600 transition-all shrink-0"
                                  title="删除"
                                >
                                  <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                                </button>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 当笔记侧边栏折叠时的展开按钮 */}
          {notesSidebarCollapsed && (
            <div className="w-10 shrink-0 border-r border-notion-border bg-notion-sidebar flex flex-col items-center pt-3">
              <button
                onClick={() => setNotesSidebarCollapsed(false)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 hover:text-notion-text transition-colors"
                title="展开笔记列表"
              >
                <PanelLeft className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          )}

          {/* 右侧编辑器 */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {selectedNote ? (
              <>
                {/* 笔记标题栏 */}
                <div className="flex items-center gap-2 px-4 h-10 border-b border-notion-border shrink-0">
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="md:hidden w-7 h-7 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors"
                  >
                    <X className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                  <input
                    value={selectedNote.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="flex-1 bg-transparent text-sm font-semibold text-notion-text placeholder:text-notion-text4 focus:outline-none"
                    placeholder="笔记标题"
                  />
                  {saving && (
                    <span className="text-[11px] text-notion-text4">保存中…</span>
                  )}
                  <button
                    onClick={() => setAiPrompt("")}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 hover:text-accent transition-colors"
                    title="AI 辅助"
                  >
                    <Sparkles className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </div>

                {/* 编辑器 */}
                <RichNoteEditor
                  content={content}
                  onChange={handleContentChange}
                  onAISelect={handleAISelect}
                />
              </>
            ) : (
              /* 空状态 */
              <div className="flex-1 flex flex-col items-center justify-center gap-5 text-notion-text4 px-8">
                <div className="w-16 h-16 rounded-2xl bg-notion-overlay2 flex items-center justify-center">
                  <FileText className="w-8 h-8" strokeWidth={1.25} />
                </div>
                <div className="text-center space-y-1">
                  <div className="text-sm font-medium text-notion-text">还没有选中笔记</div>
                  <div className="text-xs">新建一篇笔记，或扫描图片让 AI 帮你整理</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleNewNote}
                    className="h-8 px-3.5 rounded-md bg-notion-text text-white text-xs font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                    新建笔记
                  </button>
                  <button
                    onClick={() => setScanOpen(true)}
                    className="h-8 px-3.5 rounded-md border border-notion-border2 text-notion-text2 text-xs font-medium hover:bg-notion-overlay2 transition-colors inline-flex items-center gap-1.5"
                  >
                    <ScanLine className="w-3.5 h-3.5" strokeWidth={1.75} />
                    扫描笔记
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 px-4 md:px-8 py-2 border-t border-notion-border bg-white/60">
          <DevLogPanel />
        </div>
      </div>

      {/* 右键上下文菜单 */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="fixed z-50 w-44 bg-white rounded-lg shadow-xl border border-notion-border overflow-hidden py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => startRename(contextMenu.note)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-notion-text hover:bg-notion-overlay2 transition-colors"
            >
              <Pencil className="w-4 h-4 text-notion-text3" strokeWidth={1.5} />
              重命名
            </button>
            <button
              onClick={() => { setSelectedNote(contextMenu.note); setContextMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-notion-text hover:bg-notion-overlay2 transition-colors"
            >
              <FileText className="w-4 h-4 text-notion-text3" strokeWidth={1.5} />
              打开
            </button>
            <div className="h-px bg-notion-border my-1" />
            <button
              onClick={() => { handleDeleteNote(contextMenu.note.id); setContextMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
              删除
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 设置弹窗 */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* 扫描笔记弹窗 */}
      <ScanNoteModal isOpen={scanOpen} onClose={() => setScanOpen(false)} onApply={handleScanApply} />

      {/* AI 辅助弹窗 */}
      <AIAssistModal
        isOpen={aiPrompt !== null}
        onClose={() => setAiPrompt(null)}
        prompt={aiPrompt || ""}
        onApply={handleAIApply}
      />
    </main>
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