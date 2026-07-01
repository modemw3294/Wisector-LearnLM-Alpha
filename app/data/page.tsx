"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  FileText,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileQuestion,
  ChevronDown,
  ChevronRight,
  Upload,
  X,
  Loader2,
  Check,
  AlertCircle,
  FolderOpen,
  Sparkles,
  FileCheck,
  Menu,
  Database,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import SettingsModal from "@/components/SettingsModal";
import DevLogPanel from "@/components/DevLogPanel";
import { api } from "@/lib/api";
import { useModelConfigs } from "@/lib/useModelConfigs";

/* ──────────────────────────  类型  ────────────────────────── */

type Tab = "textbooks" | "questions";

interface TextbookItem {
  id: string;
  name: string;
  subject: string;
  grade: string;
  chapters: number;
  uploadedAt: string;
  status?: "analyzing" | "ready" | "error";
  catalog?: CatalogEntry[];
  outline?: string;
  taskId?: string;
  sourceFile?: string;
}

interface CatalogEntry {
  title: string;
  page?: number;
  children?: CatalogEntry[];
}

type QuestionType = "选择题" | "填空题" | "解答题" | "判断题";
type Difficulty = "简单" | "中等" | "困难";

interface QuestionItem {
  id: string;
  title: string;
  subject: string;
  type: QuestionType;
  difficulty: Difficulty;
  answer?: string;
  collectionId?: string;
  updatedAt: string;
}

/** 题目合集 */
interface Collection {
  id: string;
  name: string;
  sourceFile: string;
  subject: string;
  questionCount: number;
  uploadedAt: string;
  expanded?: boolean;
}

/* ──────────────────────────  占位数据  ────────────────────────── */

const SUBJECTS = ["全部", "数学", "物理", "化学", "英语", "语文", "生物", "信息技术", "政治", "历史", "地理"];

/* ──────────────────────────  页面  ────────────────────────── */

export default function DataPage() {
  const [tab, setTab] = useState<Tab>("textbooks");
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("全部");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // 侧边栏状态
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 合集 + 题目状态
  const [textbooks, setTextbooks] = useState<TextbookItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [dataLoading, setDataLoading] = useState(true);

  // 上传弹窗
  const [uploadOpen, setUploadOpen] = useState(false);
  const [textbookUploadOpen, setTextbookUploadOpen] = useState(false);

  // 编辑弹窗
  const [editTextbook, setEditTextbook] = useState<TextbookItem | null>(null);
  const [editQuestion, setEditQuestion] = useState<QuestionItem | null>(null);

  // 课本详情
  const [detailTextbook, setDetailTextbook] = useState<TextbookItem | null>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      const [tbs, cols, qs] = await Promise.all([
        api.listTextbooks(),
        api.listCollections(),
        api.listQuestions(),
      ]);
      setTextbooks(tbs as TextbookItem[]);
      setCollections(cols as Collection[]);
      setQuestions(qs as QuestionItem[]);
    } catch {
      // 加载失败保持空数组
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 轮询正在分析的课本
  const hasAnalyzing = textbooks.some((t) => t.status === "analyzing");
  useEffect(() => {
    if (!hasAnalyzing) return;
    const timer = setInterval(async () => {
      const tbs = await api.listTextbooks();
      setTextbooks(tbs as TextbookItem[]);
      // 如果详情课本在分析中，也更新详情
      if (detailTextbook) {
        const updated = (tbs as TextbookItem[]).find((t) => t.id === detailTextbook.id);
        if (updated) setDetailTextbook(updated);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [hasAnalyzing, detailTextbook]);

  // 保存课本
  const handleSaveTextbook = async (updated: TextbookItem) => {
    try {
      await api.updateTextbook(updated.id, updated);
      setTextbooks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      alert("保存失败");
    }
    setEditTextbook(null);
  };
  const handleDeleteTextbook = async (id: string) => {
    try {
      await api.deleteTextbook(id);
      setTextbooks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert("删除失败");
    }
  };

  // 保存题目
  const handleSaveQuestion = async (updated: QuestionItem) => {
    try {
      await api.updateQuestion(updated.id, updated);
      setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    } catch {
      alert("保存失败");
    }
    setEditQuestion(null);
  };
  const handleDeleteQuestion = async (id: string) => {
    try {
      await api.deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch {
      alert("删除失败");
    }
  };

  const toggleCollection = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredTextbooks = textbooks.filter((t) => {
    const matchQuery = t.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchSubject = subjectFilter === "全部" || t.subject === subjectFilter;
    return matchQuery && matchSubject;
  });

  // 独立题目（不属于任何合集）
  const standaloneQuestions = questions.filter((q) => !q.collectionId);
  const filteredStandalone = standaloneQuestions.filter((q) => {
    const matchQuery = q.title.toLowerCase().includes(query.trim().toLowerCase());
    const matchSubject = subjectFilter === "全部" || q.subject === subjectFilter;
    return matchQuery && matchSubject;
  });

  const filteredCollections = collections.filter((c) => {
    const matchQuery = c.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchSubject = subjectFilter === "全部" || c.subject === subjectFilter;
    return matchQuery && matchSubject;
  });

  // 处理上传完成：API 已创建合集+题目，重新加载数据
  const handleUploadComplete = async (
    _collectionName: string,
    _sourceFile: string,
    _subject: string,
    _recognizedQuestions: QuestionItem[]
  ) => {
    // 重新从 API 加载数据
    try {
      const [cols, qs] = await Promise.all([
        api.listCollections(),
        api.listQuestions(),
      ]);
      setCollections(cols as Collection[]);
      setQuestions(qs as QuestionItem[]);
      // 展开最新合集
      if (cols.length > 0) {
        setExpandedCollections((prev) => new Set(prev).add((cols[0] as Collection).id));
      }
    } catch {
      // ignore
    }
    setUploadOpen(false);
  };

  return (
    <main className="flex h-screen bg-notion-bg overflow-hidden">
      <Sidebar
        onOpenSettings={() => setSettingsOpen(true)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 shrink-0 z-30 flex items-center justify-between px-4 md:px-8 bg-white/60 backdrop-blur-sm border-b border-notion-border">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden w-8 h-8 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors"
              aria-label="打开侧边栏"
            >
              <Menu className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <Database className="w-4 h-4 text-accent" strokeWidth={1.75} />
            <h1 className="text-sm font-semibold text-notion-text tracking-tight">数据管理</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1024px] mx-auto px-4 md:px-8 py-6">
        {dataLoading ? (
          <div className="flex items-center justify-center h-40 text-sm text-notion-text4">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            加载中…
          </div>
        ) : (
        <>
        {/* Tab 切换 */}
        <div className="flex items-center gap-1 mb-6">
          <TabButton active={tab === "textbooks"} onClick={() => setTab("textbooks")} icon={<BookOpen className="w-4 h-4" strokeWidth={1.75} />} label="课本" count={textbooks.length} />
          <TabButton active={tab === "questions"} onClick={() => setTab("questions")} icon={<FileQuestion className="w-4 h-4" strokeWidth={1.75} />} label="题目" count={questions.length} />
        </div>

        {/* 工具栏 */}
        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-md bg-white border border-notion-border2">
            <Search className="w-4 h-4 text-notion-text3 shrink-0" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "textbooks" ? "搜索课本…" : "搜索题目 / 合集…"}
              className="flex-1 bg-transparent text-sm text-notion-text placeholder:text-notion-text4 focus:outline-none"
            />
          </div>
          <SubjectDropdown value={subjectFilter} onChange={setSubjectFilter} />
          {tab === "questions" ? (
            <button
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-notion-text text-white text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Upload className="w-4 h-4" strokeWidth={2} />
              上传试卷识别
            </button>
          ) : (
            <button
              onClick={() => setTextbookUploadOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-notion-text text-white text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              上传课本
            </button>
          )}
        </div>

        {/* 列表 */}
        <AnimatePresence mode="wait">
          {tab === "textbooks" ? (
            <motion.div key="textbooks" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
              {filteredTextbooks.length === 0 ? (
                <EmptyState icon={<BookOpen className="w-8 h-8" strokeWidth={1.5} />} title="还没有课本" hint="上传 PDF 课本，AI 将自动分析目录与大纲" />
              ) : (
                <div className="space-y-1.5">
                  {filteredTextbooks.map((tb) => (
                    <div
                      key={tb.id}
                      onClick={() => setDetailTextbook(tb)}
                      className="group relative flex items-center gap-3 px-3 py-2.5 rounded-md bg-white border border-notion-border2 hover:border-notion-text3 transition-colors cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-md bg-accent-light/60 text-accent flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-notion-text tracking-tight truncate">{tb.name}</div>
                        <div className="text-xs text-notion-text3 mt-0.5">{[tb.subject, tb.grade, `${tb.chapters} 章节`].join(" · ")}</div>
                      </div>
                      {tb.status === "analyzing" && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-accent-light/60 text-accent font-medium shrink-0">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          分析中
                        </span>
                      )}
                      {tb.status === "ready" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-medium shrink-0">
                          已分析
                        </span>
                      )}
                      {tb.status === "error" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-medium shrink-0">
                          分析失败
                        </span>
                      )}
                      <div className="text-xs text-notion-text4 shrink-0">{tb.uploadedAt}</div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <RowMenu
                          id={tb.id}
                          openMenuId={openMenuId}
                          setOpenMenuId={setOpenMenuId}
                          onEdit={() => setEditTextbook(tb)}
                          onDelete={() => handleDeleteTextbook(tb.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="questions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
              <QuestionsList
                collections={filteredCollections}
                questions={questions}
                expandedCollections={expandedCollections}
                onToggleCollection={toggleCollection}
                standaloneQuestions={filteredStandalone}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                subjectFilter={subjectFilter}
                query={query}
                onEditQuestion={(q) => setEditQuestion(q)}
                onDeleteQuestion={handleDeleteQuestion}
              />
            </motion.div>
          )}
        </AnimatePresence>
        </>
        )}
          </div>
        </div>
        <div className="shrink-0 px-4 md:px-8 py-2 border-t border-notion-border bg-white/60">
          <DevLogPanel />
        </div>
      </div>

      {/* 上传弹窗 */}
      {uploadOpen && (
        <UploadModal onClose={() => setUploadOpen(false)} onComplete={handleUploadComplete} />
      )}

      {/* 课本上传弹窗 */}
      {textbookUploadOpen && (
        <TextbookUploadModal
          onClose={() => setTextbookUploadOpen(false)}
          onComplete={async () => {
            setTextbookUploadOpen(false);
            await loadData();
          }}
        />
      )}

      {/* 课本详情弹窗 */}
      {detailTextbook && (
        <TextbookDetailModal
          textbook={detailTextbook}
          onClose={() => setDetailTextbook(null)}
          onSave={async (updated) => {
            await api.updateTextbook(updated.id, updated);
            setTextbooks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            setDetailTextbook(updated);
          }}
        />
      )}

      {/* 编辑弹窗 */}
      {editTextbook && (
        <EditModal
          type="textbook"
          item={editTextbook}
          onClose={() => setEditTextbook(null)}
          onSave={(updated) => handleSaveTextbook(updated as TextbookItem)}
        />
      )}
      {editQuestion && (
        <EditModal
          type="question"
          item={editQuestion}
          onClose={() => setEditQuestion(null)}
          onSave={(updated) => handleSaveQuestion(updated as QuestionItem)}
        />
      )}

      {/* 设置弹窗 */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

/* ──────────────────────────  题目列表（含合集）  ────────────────────────── */

function QuestionsList({
  collections,
  questions,
  expandedCollections,
  onToggleCollection,
  standaloneQuestions,
  openMenuId,
  setOpenMenuId,
  subjectFilter,
  query,
  onEditQuestion,
  onDeleteQuestion,
}: {
  collections: Collection[];
  questions: QuestionItem[];
  expandedCollections: Set<string>;
  onToggleCollection: (id: string) => void;
  standaloneQuestions: QuestionItem[];
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  subjectFilter: string;
  query: string;
  onEditQuestion: (q: QuestionItem) => void;
  onDeleteQuestion: (id: string) => void;
}) {
  if (collections.length === 0 && standaloneQuestions.length === 0) {
    return (
      <EmptyState
        icon={<FileQuestion className="w-8 h-8" strokeWidth={1.5} />}
        title="还没有题目"
        hint="上传试卷，AI 将自动识别题目、判断题型与难度，整理成合集"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* 合集列表 */}
      {collections.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-notion-text4 uppercase tracking-wider px-1">
            合集
          </div>
          {collections.map((col) => {
            const isExpanded = expandedCollections.has(col.id);
            const colQuestions = questions
              .filter((q) => q.collectionId === col.id)
              .filter((q) => {
                const matchQuery = q.title.toLowerCase().includes(query.trim().toLowerCase());
                const matchSubject = subjectFilter === "全部" || q.subject === subjectFilter;
                return matchQuery && matchSubject;
              });
            return (
              <div key={col.id}>
                {/* 合集头 */}
                <button
                  onClick={() => onToggleCollection(col.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md bg-white border border-notion-border2 hover:border-notion-text3 transition-colors"
                >
                  <div className="w-9 h-9 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <FolderOpen className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium text-notion-text tracking-tight truncate">
                      {col.name}
                    </div>
                    <div className="text-xs text-notion-text3 mt-0.5 truncate">
                      {[col.subject, `${col.questionCount} 题`, col.sourceFile].join(" · ")}
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium shrink-0">
                    合集
                  </span>
                  <div className="text-xs text-notion-text4 shrink-0">{col.uploadedAt}</div>
                  <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
                    <ChevronRight className="w-4 h-4 text-notion-text3" strokeWidth={1.75} />
                  </motion.div>
                </button>

                {/* 合集中的题目 */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 pl-4 border-l-2 border-notion-border space-y-1 mt-1 mb-2">
                        {colQuestions.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-notion-text4">暂无题目</div>
                        ) : (
                          colQuestions.map((q) => (
                            <QuestionRow
                              key={q.id}
                              question={q}
                              openMenuId={openMenuId}
                              setOpenMenuId={setOpenMenuId}
                              onEdit={() => onEditQuestion(q)}
                              onDelete={() => onDeleteQuestion(q.id)}
                            />
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* 独立题目 */}
      {standaloneQuestions.length > 0 && (
        <div className="space-y-1.5">
          {collections.length > 0 && (
            <div className="text-xs font-medium text-notion-text4 uppercase tracking-wider px-1">
              独立题目
            </div>
          )}
          {standaloneQuestions.map((q) => (
            <QuestionRow
              key={q.id}
              question={q}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              onEdit={() => onEditQuestion(q)}
              onDelete={() => onDeleteQuestion(q.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionRow({
  question,
  openMenuId,
  setOpenMenuId,
  onEdit,
  onDelete,
}: {
  question: QuestionItem;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative flex items-center gap-3 px-3 py-2.5 rounded-md bg-white border border-notion-border2 hover:border-notion-text3 transition-colors">
      <div className="w-9 h-9 rounded-md bg-notion-overlay2 text-notion-text2 flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-notion-text tracking-tight truncate">{question.title}</div>
        <div className="text-xs text-notion-text3 mt-0.5 truncate">
          {[question.subject, question.type].join(" · ")}
        </div>
      </div>
      <DifficultyBadge difficulty={question.difficulty} />
      <QuestionTypeBadge type={question.type} />
      <div className="text-xs text-notion-text4 shrink-0">{question.updatedAt}</div>
      <RowMenu id={question.id} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

/* ──────────────────────────  上传弹窗  ────────────────────────── */

type UploadStage = "upload" | "config" | "recognizing" | "done";

function UploadModal({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: (name: string, sourceFile: string, subject: string, questions: QuestionItem[]) => void;
}) {
  const { models } = useModelConfigs();
  const enabledModels = models.filter((m) => m.enabled);
  const [stage, setStage] = useState<UploadStage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [collectionName, setCollectionName] = useState("");
  const [subject, setSubject] = useState("数学");
  const [modelId, setModelId] = useState("");
  const [recognizeStep, setRecognizeStep] = useState(0);
  const [recognizedQuestions, setRecognizedQuestions] = useState<QuestionItem[]>([]);
  const [recognizeError, setRecognizeError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const RECOGNIZE_STEPS = ["上传文件", "AI 识别题目", "判断题型与难度", "整理完成"];

  // 默认选第一个模型
  useEffect(() => {
    if (enabledModels.length > 0 && !modelId) {
      setModelId(enabledModels[0].id);
    }
  }, [enabledModels, modelId]);

  useState(() => {
    setMounted(true);
  });

  // 真实 AI 识别
  const startRecognize = async () => {
    if (!fileContent || !modelId) return;
    setStage("recognizing");
    setRecognizeStep(0);
    setRecognizeError(null);

    // 推进步骤动画
    const stepTimer = setInterval(() => {
      setRecognizeStep((prev) => Math.min(prev + 1, RECOGNIZE_STEPS.length - 2));
    }, 1000);

    try {
      const result = await api.recognizeQuestions({
        content: fileContent,
        subject,
        model: modelId,
        collectionName: collectionName || file?.name || "未命名合集",
      });

      clearInterval(stepTimer);
      setRecognizeStep(RECOGNIZE_STEPS.length - 1);

      const questions: QuestionItem[] = (result.questions || []).map((q: any) => ({
        id: q.id,
        title: q.title,
        subject: q.subject,
        type: q.type,
        difficulty: q.difficulty,
        answer: q.answer,
        collectionId: q.collectionId,
        updatedAt: q.updatedAt,
      }));
      setRecognizedQuestions(questions);
      setTimeout(() => setStage("done"), 500);
    } catch (err) {
      clearInterval(stepTimer);
      setRecognizeError(err instanceof Error ? err.message : "AI 识别失败");
      setStage("config");
    }
  };

  const handleFileChange = async (f: File | null) => {
    if (!f) return;
    setFile(f);
    // 自动填充合集名
    const baseName = f.name.replace(/\.[^.]+$/, "");
    setCollectionName(baseName);
    // 读取文件内容（文本文件）
    try {
      const text = await f.text();
      setFileContent(text.slice(0, 100000)); // 限制 100KB
    } catch {
      setFileContent("");
    }
    setStage("config");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileChange(f);
  };

  const handleConfirmDone = () => {
    onComplete(
      collectionName || file?.name || "未命名合集",
      file?.name || "unknown.pdf",
      subject,
      recognizedQuestions
    );
  };

  const modal = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[520px] max-h-[85vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-notion-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" strokeWidth={1.75} />
              <span className="text-sm font-semibold text-notion-text tracking-tight">
                上传试卷 · AI 识别题目
              </span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors">
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* 阶段 1：上传文件 */}
            {stage === "upload" && (
              <div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-3 py-12 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                    dragging ? "border-accent-ring bg-accent-light/50" : "border-notion-border2 hover:border-notion-text3 hover:bg-notion-overlay2"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-accent-light/60 text-accent flex items-center justify-center">
                    <Upload className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-notion-text">拖拽文件到此或点击上传</div>
                    <div className="text-xs text-notion-text3 mt-1">支持 PDF / 图片（JPG, PNG）</div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
            )}

            {/* 阶段 2：配置 */}
            {stage === "config" && (
              <div className="space-y-4">
                {/* 文件预览 */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="w-10 h-10 rounded-md bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-notion-text truncate">{file?.name}</div>
                    <div className="text-xs text-notion-text3 mt-0.5">
                      {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ""}
                    </div>
                  </div>
                  <Check className="w-4 h-4 text-green-600" strokeWidth={2.5} />
                </div>

                {/* 合集名称 */}
                <div>
                  <label className="text-sm font-medium text-notion-text block mb-1.5">合集名称</label>
                  <input
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    placeholder="如：2025 期末数学模拟卷"
                    className="w-full h-9 px-3 rounded-md bg-white border border-notion-border2 text-sm text-notion-text placeholder:text-notion-text4 focus:outline-none focus:border-notion-text2 transition-colors"
                  />
                </div>

                {/* 学科 */}
                <div>
                  <label className="text-sm font-medium text-notion-text block mb-1.5">学科</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-white border border-notion-border2 text-sm text-notion-text focus:outline-none focus:border-notion-text2 transition-colors"
                  >
                    {SUBJECTS.filter((s) => s !== "全部").map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* 识别模型 */}
                <div>
                  <label className="text-sm font-medium text-notion-text block mb-1.5">
                    多模态识别模型
                    <span className="text-xs text-notion-text3 ml-1.5">用于识别试卷中的题目</span>
                  </label>
                  <select
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-white border border-notion-border2 text-sm text-notion-text focus:outline-none focus:border-notion-text2 transition-colors"
                  >
                    {enabledModels.length === 0 ? (
                      <option value="">请先在设置中配置模型</option>
                    ) : (
                      enabledModels.map((m) => (
                        <option key={m.id} value={m.id}>{m.displayName}</option>
                      ))
                    )}
                  </select>
                  {recognizeError && (
                    <div className="mt-2 text-xs text-red-600">{recognizeError}</div>
                  )}
                </div>

                {/* 说明 */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-light/40 border border-accent-ring/40">
                  <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div className="text-xs text-notion-text2 leading-relaxed">
                    AI 将自动识别试卷中的每道题目，判断其题型（选择题 / 填空题 / 解答题 / 判断题）和难度等级（简单 / 中等 / 困难），并整理为合集。
                  </div>
                </div>

                {/* 按钮 */}
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setStage("upload")} className="h-8 px-3 rounded-md text-sm font-medium text-notion-text2 hover:bg-notion-overlay2 transition-colors">
                    重新选择
                  </button>
                  <button
                    onClick={startRecognize}
                    disabled={!collectionName.trim()}
                    className="h-8 px-4 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
                    开始识别
                  </button>
                </div>
              </div>
            )}

            {/* 阶段 3：识别中 */}
            {stage === "recognizing" && (
              <div className="py-8">
                <div className="flex flex-col items-center text-center mb-6">
                  <Loader2 className="w-10 h-10 text-accent animate-spin mb-3" strokeWidth={1.5} />
                  <div className="text-sm font-medium text-notion-text">AI 正在识别题目…</div>
                  <div className="text-xs text-notion-text3 mt-1">{file?.name}</div>
                </div>

                <div className="space-y-2.5">
                  {RECOGNIZE_STEPS.map((s, i) => {
                    const isDone = i < recognizeStep;
                    const isCurrent = i === recognizeStep;
                    return (
                      <div key={s} className={`flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors ${
                        isDone ? "border-green-200 bg-green-50/30" : isCurrent ? "border-accent-ring/60 bg-accent-light/40" : "border-notion-border2 bg-white"
                      }`}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0">
                          {isDone ? (
                            <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                              <Check className="w-4 h-4" strokeWidth={2.5} />
                            </div>
                          ) : isCurrent ? (
                            <Loader2 className="w-5 h-5 text-accent animate-spin" strokeWidth={2} />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-notion-overlay2 text-notion-text4 flex items-center justify-center text-xs font-medium">
                              {i + 1}
                            </div>
                          )}
                        </div>
                        <span className={`text-sm font-medium tracking-tight ${isCurrent || isDone ? "text-notion-text" : "text-notion-text4"}`}>
                          {s}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 阶段 4：完成 */}
            {stage === "done" && (
              <div className="py-6">
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-3">
                    <Check className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <div className="text-sm font-semibold text-notion-text">识别完成</div>
                  <div className="text-xs text-notion-text3 mt-1">
                    共识别出 {recognizedQuestions.length} 道题目
                  </div>
                </div>

                {/* 预览识别的题目 */}
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {recognizedQuestions.map((q) => (
                    <div key={q.id} className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-white border border-notion-border2">
                      <FileText className="w-3.5 h-3.5 text-notion-text3 shrink-0" strokeWidth={1.5} />
                      <span className="flex-1 text-xs text-notion-text2 truncate">{q.title}</span>
                      <QuestionTypeBadge type={q.type} />
                      <DifficultyBadge difficulty={q.difficulty} />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-notion-border">
                  <button onClick={() => { setStage("upload"); setFile(null); }} className="h-8 px-3 rounded-md text-sm font-medium text-notion-text2 hover:bg-notion-overlay2 transition-colors">
                    重新上传
                  </button>
                  <button
                    onClick={handleConfirmDone}
                    className="h-8 px-4 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    添加到合集
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return mounted ? createPortal(modal, document.body) : null;
}

/* ──────────────────────────  通用子组件  ────────────────────────── */

function TabButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 h-9 px-3.5 rounded-md text-sm font-medium tracking-tight transition-colors ${
        active ? "bg-notion-overlay text-notion-text" : "text-notion-text2 hover:bg-notion-overlay2"
      }`}
    >
      {icon}
      {label}
      <span className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${active ? "bg-white text-notion-text3" : "bg-notion-overlay2 text-notion-text4"}`}>{count}</span>
    </button>
  );
}

function SubjectDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-white border border-notion-border2 text-sm text-notion-text hover:border-notion-text3 transition-colors whitespace-nowrap">
        <span className="text-notion-text3">学科：</span>
        <span className="font-medium">{value}</span>
        <ChevronDown className="w-3.5 h-3.5 text-notion-text3" strokeWidth={1.5} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }} className="absolute top-full left-0 mt-1 w-32 rounded-md bg-white border border-notion-border2 shadow-lg py-1 z-20">
              {SUBJECTS.map((s) => (
                <button key={s} onClick={() => { onChange(s); setOpen(false); }} className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${s === value ? "text-notion-text bg-notion-overlay2 font-medium" : "text-notion-text2 hover:bg-notion-overlay2"}`}>{s}</button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const map = { 简单: "bg-green-50 text-green-700", 中等: "bg-amber-50 text-amber-700", 困难: "bg-red-50 text-red-700" } as const;
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${map[difficulty]}`}>{difficulty}</span>;
}

function QuestionTypeBadge({ type }: { type: QuestionType }) {
  const map = { 选择题: "bg-blue-50 text-blue-700", 填空题: "bg-purple-50 text-purple-700", 解答题: "bg-teal-50 text-teal-700", 判断题: "bg-orange-50 text-orange-700" } as const;
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${map[type]}`}>{type}</span>;
}

function RowMenu({ id, openMenuId, setOpenMenuId, onEdit, onDelete }: { id: string; openMenuId: string | null; setOpenMenuId: (id: string | null) => void; onEdit: () => void; onDelete: () => void }) {
  const open = openMenuId === id;
  return (
    <div className="relative shrink-0">
      <button onClick={() => setOpenMenuId(open ? null : id)} className="w-7 h-7 rounded-md flex items-center justify-center text-notion-text3 hover:bg-notion-overlay2 transition-colors" aria-label="更多操作">
        <MoreHorizontal className="w-4 h-4" strokeWidth={1.75} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }} className="absolute top-full right-0 mt-1 w-28 rounded-md bg-white border border-notion-border2 shadow-lg py-1 z-20">
              <button onClick={() => { setOpenMenuId(null); onEdit(); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-notion-text2 hover:bg-notion-overlay2 transition-colors">
                <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />编辑
              </button>
              <button onClick={() => { setOpenMenuId(null); onDelete(); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />删除
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ icon, title, hint, action }: { icon: React.ReactNode; title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-notion-overlay2 to-notion-border2 flex items-center justify-center text-notion-text3 mb-3">{icon}</div>
      <div className="text-sm font-semibold text-notion-text">{title}</div>
      <div className="text-xs text-notion-text3 mt-1 max-w-xs">{hint}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ──────────────────────────  课本上传弹窗  ────────────────────────── */

function TextbookUploadModal({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: () => void;
}) {
  const { models } = useModelConfigs();
  const visionModels = models.filter(
    (m) => m.enabled && m.inputModalities?.includes("image")
  );
  const [stage, setStage] = useState<"upload" | "config" | "analyzing" | "done" | "error">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState("");
  const [subject, setSubject] = useState("数学");
  const [grade, setGrade] = useState("");
  const [modelId, setModelId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (visionModels.length > 0 && !modelId) {
      setModelId(visionModels[0].id);
    }
  }, [visionModels, modelId]);

  useState(() => setMounted(true));

  const handleFileChange = async (f: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("请上传 PDF 文件");
      return;
    }
    setError(null);
    setFile(f);
    // 读取为 base64
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || "";
      setFileBase64(base64);
    };
    reader.readAsDataURL(f);
    setStage("config");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileChange(f);
  };

  const startAnalysis = async () => {
    if (!fileBase64 || !modelId) return;
    setStage("analyzing");
    setError(null);
    try {
      await api.analyzeTextbook({
        fileName: file?.name || "未命名.pdf",
        fileBase64,
        subject,
        grade: grade || undefined,
        model: modelId,
      });
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败");
      setStage("error");
    }
  };

  const modal = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[520px] max-h-[85vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-notion-border">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent" strokeWidth={1.75} />
              <span className="text-sm font-semibold text-notion-text tracking-tight">
                上传课本 · AI 分析
              </span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors">
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* 阶段 1：上传文件 */}
            {stage === "upload" && (
              <div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-3 py-12 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                    dragging ? "border-accent-ring bg-accent-light/50" : "border-notion-border2 hover:border-notion-text3 hover:bg-notion-overlay2"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-accent-light/60 text-accent flex items-center justify-center">
                    <Upload className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-notion-text">拖拽 PDF 到此或点击上传</div>
                    <div className="text-xs text-notion-text3 mt-1">仅支持 PDF 格式</div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  />
                </div>
                {error && <div className="mt-3 text-xs text-red-600 text-center">{error}</div>}
              </div>
            )}

            {/* 阶段 2：配置 */}
            {stage === "config" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="w-10 h-10 rounded-md bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-notion-text truncate">{file?.name}</div>
                    <div className="text-xs text-notion-text3 mt-0.5">
                      {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ""}
                    </div>
                  </div>
                  <Check className="w-4 h-4 text-green-600" strokeWidth={2.5} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-notion-text block mb-1.5">学科</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-white border border-notion-border2 text-sm text-notion-text focus:outline-none focus:border-notion-text2 transition-colors"
                    >
                      {SUBJECTS.filter((s) => s !== "全部").map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-notion-text block mb-1.5">年级（可选）</label>
                    <input
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder="如：高一"
                      className="w-full h-9 px-3 rounded-md bg-white border border-notion-border2 text-sm text-notion-text placeholder:text-notion-text4 focus:outline-none focus:border-notion-text2 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-notion-text block mb-1.5">
                    分析模型
                    <span className="text-xs text-notion-text3 ml-1.5">需支持视觉输入</span>
                  </label>
                  <select
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-white border border-notion-border2 text-sm text-notion-text focus:outline-none focus:border-notion-text2 transition-colors"
                  >
                    {visionModels.length === 0 ? (
                      <option value="">请先在设置中配置支持视觉的模型</option>
                    ) : (
                      visionModels.map((m) => (
                        <option key={m.id} value={m.id}>{m.displayName}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-light/40 border border-accent-ring/40">
                  <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div className="text-xs text-notion-text2 leading-relaxed">
                    AI 将分析课本 PDF，自动提取目录、生成知识大纲。分析在后台运行，完成后可查看和编辑。
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setStage("upload")} className="h-8 px-3 rounded-md text-sm font-medium text-notion-text2 hover:bg-notion-overlay2 transition-colors">
                    重新选择
                  </button>
                  <button
                    onClick={startAnalysis}
                    disabled={!fileBase64 || !modelId}
                    className="h-8 px-4 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
                    开始分析
                  </button>
                </div>
              </div>
            )}

            {/* 阶段 3：分析中 */}
            {stage === "analyzing" && (
              <div className="py-8">
                <div className="flex flex-col items-center text-center mb-6">
                  <Loader2 className="w-10 h-10 text-accent animate-spin mb-3" strokeWidth={1.5} />
                  <div className="text-sm font-medium text-notion-text">正在上传并启动分析…</div>
                  <div className="text-xs text-notion-text3 mt-1">{file?.name}</div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-light/40 border border-accent-ring/40">
                  <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div className="text-xs text-notion-text2 leading-relaxed">
                    上传完成后分析将在后台继续运行，你可以关闭此窗口。分析完成后课本会显示"已分析"状态。
                  </div>
                </div>
              </div>
            )}

            {/* 阶段 4：完成 */}
            {stage === "done" && (
              <div className="py-8">
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-3">
                    <Check className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <div className="text-sm font-semibold text-notion-text">已启动分析</div>
                  <div className="text-xs text-notion-text3 mt-1">
                    AI 正在后台分析课本，请稍后查看
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={onComplete}
                    className="h-8 px-4 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    完成
                  </button>
                </div>
              </div>
            )}

            {/* 阶段 5：错误 */}
            {stage === "error" && (
              <div className="py-8">
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <div className="text-sm font-semibold text-notion-text">分析启动失败</div>
                  <div className="text-xs text-red-600 mt-1 max-w-xs">{error}</div>
                </div>
                <div className="flex justify-center gap-2">
                  <button onClick={() => setStage("config")} className="h-8 px-4 rounded-md text-sm font-medium text-notion-text2 hover:bg-notion-overlay2 transition-colors">
                    返回重试
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return mounted ? createPortal(modal, document.body) : null;
}

/* ──────────────────────────  课本详情弹窗  ────────────────────────── */

function TextbookDetailModal({
  textbook,
  onClose,
  onSave,
}: {
  textbook: TextbookItem;
  onClose: () => void;
  onSave: (updated: TextbookItem) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [outline, setOutline] = useState(textbook.outline || "");
  const [catalog, setCatalog] = useState<CatalogEntry[]>(textbook.catalog || []);

  useState(() => setMounted(true));

  useEffect(() => {
    setOutline(textbook.outline || "");
    setCatalog(textbook.catalog || []);
  }, [textbook]);

  const handleSave = () => {
    onSave({ ...textbook, outline, catalog });
    setEditMode(false);
  };

  const renderCatalog = (entries: CatalogEntry[], depth = 0): React.ReactNode => {
    if (!entries || entries.length === 0) return null;
    return (
      <div className={depth > 0 ? "ml-4 border-l border-notion-border2 pl-3" : ""}>
        {entries.map((entry, i) => (
          <div key={i} className="py-1">
            <div className="flex items-center gap-2 text-sm text-notion-text2">
              {depth > 0 && <ChevronRight className="w-3 h-3 text-notion-text4" strokeWidth={1.5} />}
              <span>{entry.title}</span>
              {entry.page && <span className="text-xs text-notion-text4">P{entry.page}</span>}
            </div>
            {entry.children && entry.children.length > 0 && renderCatalog(entry.children, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  const modal = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[680px] max-h-[85vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-notion-border">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 text-accent shrink-0" strokeWidth={1.75} />
              <span className="text-sm font-semibold text-notion-text tracking-tight truncate">
                {textbook.name}
              </span>
              {textbook.status === "analyzing" && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-accent-light/60 text-accent font-medium shrink-0">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  分析中
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {editMode ? (
                <>
                  <button onClick={() => setEditMode(false)} className="h-7 px-2.5 rounded-md text-xs font-medium text-notion-text2 hover:bg-notion-overlay2 transition-colors">
                    取消
                  </button>
                  <button onClick={handleSave} className="h-7 px-3 rounded-md bg-accent text-white text-xs font-medium hover:opacity-90 transition-opacity">
                    保存
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  disabled={textbook.status === "analyzing"}
                  className="h-7 px-2.5 rounded-md text-xs font-medium text-notion-text2 hover:bg-notion-overlay2 transition-colors disabled:opacity-40 inline-flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" strokeWidth={1.75} />
                  编辑
                </button>
              )}
              <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors">
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* 基本信息 */}
            <div className="flex items-center gap-4 mb-5 pb-4 border-b border-notion-border">
              <div className="w-12 h-12 rounded-xl bg-accent-light/60 text-accent flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-notion-text">{textbook.name}</div>
                <div className="text-xs text-notion-text3 mt-0.5">
                  {[textbook.subject, textbook.grade, `${textbook.chapters} 章节`, textbook.uploadedAt].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>

            {textbook.status === "analyzing" ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-accent animate-spin mb-3" strokeWidth={1.5} />
                <div className="text-sm font-medium text-notion-text">AI 正在分析课本…</div>
                <div className="text-xs text-notion-text3 mt-1">分析完成后将自动显示目录与大纲</div>
              </div>
            ) : textbook.status === "error" ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-8 h-8 text-red-500 mb-3" strokeWidth={1.5} />
                <div className="text-sm font-medium text-notion-text">分析失败</div>
                <div className="text-xs text-notion-text3 mt-1">请删除后重新上传</div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 目录 */}
                <div>
                  <div className="text-xs font-semibold text-notion-text3 uppercase tracking-wider mb-2">目录</div>
                  {editMode ? (
                    <textarea
                      value={JSON.stringify(catalog, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setCatalog(parsed);
                        } catch {
                          // 忽略 JSON 解析错误
                        }
                      }}
                      rows={10}
                      placeholder="JSON 格式的目录数据"
                      className="w-full resize-none px-3 py-2 rounded-md bg-white border border-notion-border2 text-xs font-mono text-notion-text focus:outline-none focus:border-notion-text2 transition-colors"
                    />
                  ) : catalog.length > 0 ? (
                    renderCatalog(catalog)
                  ) : (
                    <div className="text-xs text-notion-text4">暂无目录数据</div>
                  )}
                </div>

                {/* 大纲 */}
                <div>
                  <div className="text-xs font-semibold text-notion-text3 uppercase tracking-wider mb-2">大纲</div>
                  {editMode ? (
                    <textarea
                      value={outline}
                      onChange={(e) => setOutline(e.target.value)}
                      rows={12}
                      placeholder="Markdown 格式的知识大纲"
                      className="w-full resize-none px-3 py-2 rounded-md bg-white border border-notion-border2 text-xs font-mono text-notion-text focus:outline-none focus:border-notion-text2 transition-colors"
                    />
                  ) : outline ? (
                    <div className="text-sm text-notion-text2 leading-relaxed whitespace-pre-wrap">{outline}</div>
                  ) : (
                    <div className="text-xs text-notion-text4">暂无大纲数据</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return mounted ? createPortal(modal, document.body) : null;
}

/* ──────────────────────────  编辑弹窗  ────────────────────────── */

function EditModal({
  type,
  item,
  onClose,
  onSave,
}: {
  type: "textbook" | "question";
  item: TextbookItem | QuestionItem;
  onClose: () => void;
  onSave: (item: TextbookItem | QuestionItem) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  useState(() => {
    setMounted(true);
  });

  useEffect(() => {
    setForm({ ...item });
  }, [item]);

  const handleChange = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // 对于课本：name / subject / grade / chapters
    // 对于题目：title / subject / type / difficulty
    const updated = { ...item, ...form } as TextbookItem | QuestionItem;
    onSave(updated);
  };

  const modal = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[440px] bg-white rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-notion-border">
            <span className="text-sm font-semibold text-notion-text tracking-tight">
              {type === "textbook" ? "编辑课本" : "编辑题目"}
            </span>
            <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors">
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
          <div className="p-5 space-y-4">
            {type === "textbook" ? (
              <>
                <div>
                  <label className="text-sm font-medium text-notion-text block mb-1.5">名称</label>
                  <input
                    value={(form.name as string) ?? ""}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-white border border-notion-border2 text-sm text-notion-text focus:outline-none focus:border-notion-text2 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-notion-text block mb-1.5">学科</label>
                    <select
                      value={(form.subject as string) ?? ""}
                      onChange={(e) => handleChange("subject", e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-white border border-notion-border2 text-sm text-notion-text focus:outline-none focus:border-notion-text2 transition-colors"
                    >
                      {SUBJECTS.filter((s) => s !== "全部").map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-notion-text block mb-1.5">年级</label>
                    <input
                      value={(form.grade as string) ?? ""}
                      onChange={(e) => handleChange("grade", e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-white border border-notion-border2 text-sm text-notion-text focus:outline-none focus:border-notion-text2 transition-colors"
                      placeholder="如：七年级"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-notion-text block mb-1.5">章节数</label>
                  <input
                    type="number"
                    value={(form.chapters as number) ?? 0}
                    onChange={(e) => handleChange("chapters", Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-md bg-white border border-notion-border2 text-sm text-notion-text focus:outline-none focus:border-notion-text2 transition-colors"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-notion-text block mb-1.5">题目内容</label>
                  <textarea
                    value={(form.title as string) ?? ""}
                    onChange={(e) => handleChange("title", e.target.value)}
                    rows={3}
                    className="w-full resize-none px-3 py-2 rounded-md bg-white border border-notion-border2 text-sm text-notion-text focus:outline-none focus:border-notion-text2 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-notion-text block mb-1.5">学科</label>
                    <select
                      value={(form.subject as string) ?? ""}
                      onChange={(e) => handleChange("subject", e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-white border border-notion-border2 text-sm text-notion-text focus:outline-none focus:border-notion-text2 transition-colors"
                    >
                      {SUBJECTS.filter((s) => s !== "全部").map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-notion-text block mb-1.5">题型</label>
                    <select
                      value={(form.type as string) ?? ""}
                      onChange={(e) => handleChange("type", e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-white border border-notion-border2 text-sm text-notion-text focus:outline-none focus:border-notion-text2 transition-colors"
                    >
                      <option value="选择题">选择题</option>
                      <option value="填空题">填空题</option>
                      <option value="解答题">解答题</option>
                      <option value="判断题">判断题</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-notion-text block mb-1.5">难度</label>
                  <div className="flex gap-2">
                    {(["简单", "中等", "困难"] as Difficulty[]).map((d) => {
                      const isActive = form.difficulty === d;
                      return (
                        <button
                          key={d}
                          onClick={() => handleChange("difficulty", d)}
                          className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors border ${
                            isActive
                              ? "bg-notion-text text-white border-notion-text"
                              : "bg-white text-notion-text2 border-notion-border2 hover:bg-notion-overlay2"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-notion-border">
            <button onClick={onClose} className="h-8 px-3 rounded-md text-sm font-medium text-notion-text2 hover:bg-notion-overlay2 transition-colors">
              取消
            </button>
            <button onClick={handleSave} className="h-8 px-4 rounded-md bg-notion-text text-white text-sm font-medium hover:opacity-90 transition-opacity">
              保存
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return mounted ? createPortal(modal, document.body) : null;
}
