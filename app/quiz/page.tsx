"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Trophy,
  TrendingDown,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Flag,
  Menu,
  Check,
  BookOpen,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import { useModelConfigs } from "@/lib/useModelConfigs";
import type { ModelConfig } from "@/lib/types";
import type {
  Quiz,
  QuestionType,
  QuizAnswer,
} from "@/lib/quiz-types";
import { QUESTION_TYPE_LABELS, QUIZ_SPEC_INFO } from "@/lib/quiz-types";
import Sidebar from "@/components/Sidebar";
import SettingsModal from "@/components/SettingsModal";
import DevLogPanel from "@/components/DevLogPanel";
import LaTeXText from "@/components/LaTeXText";

type View = "list" | "create" | "take" | "result";

type QuizDuration = "short" | "medium" | "long";
type SourceType = "textbook" | "textbook-questions";

interface TextbookItem {
  id: string;
  name: string;
  subject: string;
  grade: string;
  chapters: number;
  uploadedAt: string;
}

interface QuestionItem {
  id: string;
  title: string;
  subject: string;
  type: "选择题" | "填空题" | "解答题" | "判断题";
  difficulty: "简单" | "中等" | "困难";
  answer?: string;
  collectionId?: string;
  updatedAt: string;
}

const DURATION_OPTIONS: { key: QuizDuration; label: string; desc: string; totalQuestions: number; durationMin: number }[] = [
  { key: "short", label: "短", desc: "快闪测验", totalQuestions: 5, durationMin: 5 },
  { key: "medium", label: "中", desc: "小型测验", totalQuestions: 10, durationMin: 15 },
  { key: "long", label: "长", desc: "综合测验", totalQuestions: 20, durationMin: 30 },
];

export default function QuizPage() {
  const { models } = useModelConfigs();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [textbooks, setTextbooks] = useState<TextbookItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const enabledModels = models.filter((m) => m.enabled);

  const loadQuizzes = useCallback(async () => {
    try {
      const list = await api.listQuizzes();
      setQuizzes(list);
    } catch {
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  useEffect(() => {
    (async () => {
      try {
        const [tbs, qs] = await Promise.all([
          api.listTextbooks(),
          api.listQuestions(),
        ]);
        setTextbooks((tbs as TextbookItem[]) || []);
        setQuestions((qs as QuestionItem[]) || []);
      } catch {
        setTextbooks([]);
        setQuestions([]);
      } finally {
        setDataLoading(false);
      }
    })();
  }, []);

  const handleGenerate = async (input: {
    subject: string;
    duration: QuizDuration;
    durationMin: number;
    totalQuestions: number;
    topic?: string;
    model: string;
    difficulty?: number;
    sourceType?: SourceType;
    sourceLabel?: string;
    sourceIds?: string[];
  }) => {
    setGenerating(true);
    setGenError(null);
    try {
      const quiz = await api.generateQuiz(input);
      await loadQuizzes();
      setActiveQuiz(quiz);
      setView("take");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (answers: QuizAnswer[]) => {
    if (!activeQuiz) return;
    // 使用第一个可用模型阅卷
    const model = enabledModels[0]?.id || "";
    try {
      const result = await api.submitQuiz(activeQuiz.id, answers, model);
      setActiveQuiz(result);
      setView("result");
      loadQuizzes();
    } catch (err) {
      alert(err instanceof Error ? err.message : "提交失败");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.deleteQuiz(id);
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
  };

  const handleOpenQuiz = (quiz: Quiz) => {
    if (quiz.status === "analyzed") {
      setActiveQuiz(quiz);
      setView("result");
    } else {
      setActiveQuiz(quiz);
      setView("take");
    }
  };

  const handleBack = () => {
    setView("list");
    setActiveQuiz(null);
  };

  return (
    <main className="flex h-screen bg-notion-bg overflow-hidden">
      <Sidebar
        onOpenSettings={() => setIsSettingsOpen(true)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        activeTab="quiz"
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
      {/* 顶部栏 */}
      <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-8 border-b border-notion-border bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          {view !== "list" ? (
            <button
              onClick={handleBack}
              className="w-8 h-8 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors"
              aria-label="返回"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
            </button>
          ) : (
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden w-8 h-8 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors"
              aria-label="打开侧边栏"
            >
              <Menu className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}
          <ClipboardCheck className="w-4 h-4 text-accent" strokeWidth={1.75} />
          <span className="text-sm font-semibold text-notion-text tracking-tight">
            测验 Studio
          </span>
        </div>
        {view === "list" && (
          <button
            onClick={() => setView("create")}
            className="h-8 px-3 rounded-md bg-accent text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">开始创建</span>
          </button>
        )}
      </header>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto">
        {view === "list" && (
          <ListView
            quizzes={quizzes}
            loading={loading}
            onOpen={handleOpenQuiz}
            onDelete={handleDelete}
            onCreate={() => setView("create")}
          />
        )}
        {view === "create" && (
          <CreateWizard
            models={enabledModels}
            textbooks={textbooks}
            questions={questions}
            dataLoading={dataLoading}
            generating={generating}
            error={genError}
            onBack={handleBack}
            onGenerate={handleGenerate}
          />
        )}
        {view === "take" && activeQuiz && (
          <TakeView quiz={activeQuiz} onSubmit={handleSubmit} />
        )}
        {view === "result" && activeQuiz && (
          <ResultView quiz={activeQuiz} onBack={handleBack} />
        )}
      </div>

      <div className="shrink-0 px-4 md:px-8 py-2 border-t border-notion-border bg-white/60">
        <DevLogPanel />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      </div>
    </main>
  );
}

// ============================================================
// 列表视图
// ============================================================
function ListView({
  quizzes,
  loading,
  onOpen,
  onDelete,
  onCreate,
}: {
  quizzes: Quiz[];
  loading: boolean;
  onOpen: (q: Quiz) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onCreate: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-notion-text4">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        加载中…
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="max-w-[1000px] mx-auto p-4 md:p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-light/60 to-accent-light/30 flex items-center justify-center mb-4">
            <ClipboardCheck className="w-8 h-8 text-accent" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-semibold text-notion-text mb-1.5">
            还没有测验
          </h2>
          <p className="text-sm text-notion-text3 mb-6 max-w-md">
            AI 将根据你的需求自动出题，支持五种题型，交卷后自动阅卷分析
          </p>

          {/* 特性卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 w-full max-w-2xl">
            {[
              { icon: Clock, title: "3 种时长", desc: "短 / 中 / 长" },
              { icon: ClipboardCheck, title: "5 种题型", desc: "客观+主观" },
              { icon: Sparkles, title: "AI 出题", desc: "智能生成" },
              { icon: TrendingDown, title: "自动阅卷", desc: "薄弱分析" },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-3 rounded-lg border border-notion-border2 bg-white text-left"
                >
                  <Icon className="w-4 h-4 text-accent mb-1.5" strokeWidth={1.75} />
                  <div className="text-xs font-semibold text-notion-text">{f.title}</div>
                  <div className="text-[10px] text-notion-text4 mt-0.5">{f.desc}</div>
                </div>
              );
            })}
          </div>

          <button
            onClick={onCreate}
            className="h-9 px-5 rounded-md bg-accent text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            开始创建
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto p-4 md:p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quizzes.map((quiz) => (
          <QuizCard key={quiz.id} quiz={quiz} onOpen={() => onOpen(quiz)} onDelete={(e) => onDelete(quiz.id, e)} />
        ))}
      </div>
    </div>
  );
}

function QuizCard({
  quiz,
  onOpen,
  onDelete,
}: {
  quiz: Quiz;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const specInfo = QUIZ_SPEC_INFO[quiz.spec];
  const isAnalyzed = quiz.status === "analyzed";
  const score = quiz.analysis
    ? `${quiz.analysis.earnedScore}/${quiz.analysis.totalScore}`
    : null;
  const percentage = quiz.analysis && quiz.analysis.totalScore > 0
    ? Math.round((quiz.analysis.earnedScore / quiz.analysis.totalScore) * 100)
    : null;

  // 统计题型分布
  const typeCounts: Record<string, number> = {};
  quiz.questions.forEach((q) => {
    typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
  });
  const typeEntries = Object.entries(typeCounts).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group rounded-xl border border-notion-border2 bg-white p-4 hover:shadow-md hover:border-notion-text3/30 transition-all cursor-pointer flex flex-col"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-notion-border2 text-accent font-medium">
            {specInfo.label}
          </span>
          {isAnalyzed && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-green-200 text-green-700 font-medium flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" />
              已完成
            </span>
          )}
        </div>
        <button
          onClick={onDelete}
          className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-notion-text4 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="删除"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>
      <h3 className="text-sm font-medium text-notion-text mb-2 line-clamp-2 flex-1">
        {quiz.title}
      </h3>

      {/* 题型分布 */}
      <div className="flex items-center gap-1 flex-wrap mb-2.5">
        {typeEntries.map(([t, n]) => (
          <span
            key={t}
            className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-notion-border2 text-notion-text2"
          >
            {QUESTION_TYPE_LABELS[t as QuestionType]} ×{n}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-notion-text4 pt-2.5 border-t border-notion-border">
        <span>{quiz.subject}</span>
        <span>·</span>
        <span>{quiz.questions.length} 题</span>
        <span>·</span>
        <span className="flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" />
          {quiz.durationMin} 分钟
        </span>
      </div>
      {score && percentage !== null && (
        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-sm font-bold text-notion-text tabular-nums">
              {score}
            </span>
            <span className="text-[10px] text-notion-text4">分</span>
          </div>
          <span
            className={`text-[11px] font-medium tabular-nums ${
              percentage >= 80
                ? "text-green-600"
                : percentage >= 60
                ? "text-amber-600"
                : "text-red-500"
            }`}
          >
            {percentage}%
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
// 创建向导（页面内）
// ============================================================
const WIZARD_STEPS = [
  { id: 0, label: "测验规格" },
  { id: 1, label: "学科与范围" },
  { id: 2, label: "难度与模型" },
  { id: 3, label: "确认生成" },
];

function CreateWizard({
  models,
  textbooks,
  questions,
  dataLoading,
  generating,
  error,
  onBack,
  onGenerate,
}: {
  models: ModelConfig[];
  textbooks: TextbookItem[];
  questions: QuestionItem[];
  dataLoading: boolean;
  generating: boolean;
  error: string | null;
  onBack: () => void;
  onGenerate: (input: {
    subject: string;
    duration: QuizDuration;
    durationMin: number;
    totalQuestions: number;
    topic?: string;
    model: string;
    difficulty?: number;
    sourceType?: SourceType;
    sourceLabel?: string;
    sourceIds?: string[];
  }) => void;
}) {
  const [step, setStep] = useState(0);
  const [duration, setDuration] = useState<QuizDuration>("medium");
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [selectedTextbookId, setSelectedTextbookId] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [model, setModel] = useState("");
  const [difficulty, setDifficulty] = useState(3);

  const selectedTextbook = textbooks.find((t) => t.id === selectedTextbookId) || null;

  const relatedQuestions = useMemo(() => {
    if (!selectedTextbook) return [];
    return questions.filter(
      (q) => q.collectionId === selectedTextbook.id || q.subject === selectedTextbook.subject
    );
  }, [questions, selectedTextbook]);

  useEffect(() => {
    if (selectedTextbook) {
      setSubject(selectedTextbook.subject);
    }
  }, [selectedTextbook]);

  useEffect(() => {
    setSelectedQuestionIds([]);
  }, [selectedTextbookId, sourceType]);

  useEffect(() => {
    if (models.length > 0 && !model) {
      setModel(models[0].id);
    }
  }, [models, model]);

  const durationInfo = DURATION_OPTIONS.find((d) => d.key === duration)!;

  const sourceLabel = useMemo(() => {
    if (!selectedTextbook) return "";
    if (sourceType === "textbook") return selectedTextbook.name;
    const count = selectedQuestionIds.length;
    return count > 0 ? `${selectedTextbook.name} + ${count} 道题目` : selectedTextbook.name;
  }, [selectedTextbook, sourceType, selectedQuestionIds]);

  const handleConfirm = () => {
    if (!subject.trim()) return;
    if (!model) return;
    onGenerate({
      subject: subject.trim(),
      duration,
      durationMin: durationInfo.durationMin,
      totalQuestions: durationInfo.totalQuestions,
      topic: topic.trim() || undefined,
      model,
      difficulty,
      sourceType: sourceType || undefined,
      sourceLabel: sourceLabel || undefined,
      sourceIds: sourceType === "textbook-questions" && selectedQuestionIds.length > 0
        ? [selectedTextbookId, ...selectedQuestionIds]
        : selectedTextbookId
        ? [selectedTextbookId]
        : undefined,
    });
  };

  const canNext =
    (step === 0 && !!duration) ||
    (step === 1 &&
      !!sourceType &&
      !!selectedTextbookId &&
      subject.trim().length > 0 &&
      (sourceType === "textbook" || selectedQuestionIds.length > 0)) ||
    (step === 2 && !!model) ||
    step === 3;

  return (
    <div className="max-w-[760px] mx-auto p-4 md:p-8">
      {/* 步骤指示器 */}
      <div className="flex items-center justify-between mb-8">
        {WIZARD_STEPS.map((s, i) => {
          const isDone = step > s.id;
          const isActive = step === s.id;
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-accent text-white"
                      : isDone
                      ? "bg-accent-light text-accent"
                      : "bg-white border border-notion-border2 text-notion-text4"
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" strokeWidth={2.5} /> : s.id + 1}
                </div>
                <span
                  className={`text-[11px] font-medium whitespace-nowrap ${
                    isActive ? "text-accent" : isDone ? "text-notion-text2" : "text-notion-text4"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < WIZARD_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 -mt-5 transition-colors ${
                    step > s.id ? "bg-accent" : "bg-notion-border2"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-xl border border-notion-border2 bg-white p-6 mb-4"
      >
        {/* Step 0: 测验时长 */}
        {step === 0 && (
          <div>
            <h2 className="text-base font-semibold text-notion-text mb-1">选择测验时长</h2>
            <p className="text-xs text-notion-text3 mb-4">时长决定题目数量与预计用时</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DURATION_OPTIONS.map((opt) => {
                const selected = duration === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setDuration(opt.key)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? "border-accent bg-accent-light/30"
                        : "border-notion-border2 hover:border-notion-text4"
                    }`}
                  >
                    <div className={`text-sm font-medium ${selected ? "text-accent" : "text-notion-text"}`}>
                      {opt.label} · {opt.desc}
                    </div>
                    <div className="text-[11px] text-notion-text3 mt-1.5 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {opt.durationMin} 分钟
                      </div>
                      <div>约 {opt.totalQuestions} 道题</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 p-3 rounded-md bg-white border border-notion-border2 text-[11px] text-notion-text3 leading-relaxed">
              题型由 AI 根据所选来源与考查范围自动决定，可包含单选、多选、填空、解答、作文等。
            </div>
          </div>
        )}

        {/* Step 1: 学科与范围（选择来源） */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-notion-text mb-1">学科与考查范围</h2>
              <p className="text-xs text-notion-text3 mb-4">选择课本或课本+关联题目作为出题来源</p>
            </div>

            {/* 来源类型 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setSourceType("textbook")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  sourceType === "textbook"
                    ? "border-accent bg-accent-light/30"
                    : "border-notion-border2 hover:border-notion-text4"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <BookOpen
                    className={`w-4 h-4 ${sourceType === "textbook" ? "text-accent" : "text-notion-text3"}`}
                    strokeWidth={1.75}
                  />
                  <span className={`text-sm font-medium ${sourceType === "textbook" ? "text-accent" : "text-notion-text"}`}>
                    课本
                  </span>
                </div>
                <p className="text-[11px] text-notion-text3 leading-relaxed">
                  基于单本课本出题
                </p>
              </button>
              <button
                onClick={() => setSourceType("textbook-questions")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  sourceType === "textbook-questions"
                    ? "border-accent bg-accent-light/30"
                    : "border-notion-border2 hover:border-notion-text4"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText
                    className={`w-4 h-4 ${sourceType === "textbook-questions" ? "text-accent" : "text-notion-text3"}`}
                    strokeWidth={1.75}
                  />
                  <span className={`text-sm font-medium ${sourceType === "textbook-questions" ? "text-accent" : "text-notion-text"}`}>
                    课本 + 题目
                  </span>
                </div>
                <p className="text-[11px] text-notion-text3 leading-relaxed">
                  基于课本并选择关联题目出题
                </p>
              </button>
            </div>

            {/* 课本选择 */}
            {sourceType && (
              <div>
                <label className="text-xs font-semibold text-notion-text3 mb-1.5 block">选择课本</label>
                <select
                  value={selectedTextbookId}
                  onChange={(e) => setSelectedTextbookId(e.target.value)}
                  disabled={dataLoading}
                  className="w-full h-9 px-3 rounded-md border border-notion-border2 bg-white text-sm text-notion-text outline-none focus:border-accent transition-colors disabled:opacity-50"
                >
                  <option value="">{dataLoading ? "加载中…" : "请选择课本"}</option>
                  {textbooks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.subject} · {t.grade}
                    </option>
                  ))}
                </select>
                {!dataLoading && textbooks.length === 0 && (
                  <p className="text-[11px] text-notion-text4 mt-1.5">
                    暂无课本数据，请先在数据管理中上传课本。
                  </p>
                )}
              </div>
            )}

            {/* 关联题目 */}
            {sourceType === "textbook-questions" && selectedTextbook && (
              <div>
                <label className="text-xs font-semibold text-notion-text3 mb-1.5 block">
                  关联题目（可多选）
                  <span className="ml-1.5 text-notion-text4 font-normal">
                    {relatedQuestions.length > 0 ? `共 ${relatedQuestions.length} 道` : ""}
                  </span>
                </label>
                {relatedQuestions.length === 0 ? (
                  <div className="p-3 rounded-md border border-notion-border2 bg-notion-bg text-xs text-notion-text4">
                    未找到与《{selectedTextbook.name}》关联的题目
                  </div>
                ) : (
                  <div className="max-h-[200px] overflow-y-auto rounded-md border border-notion-border2 bg-white divide-y divide-notion-border">
                    {relatedQuestions.map((q) => {
                      const selected = selectedQuestionIds.includes(q.id);
                      return (
                        <label
                          key={q.id}
                          className={`flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${
                            selected ? "bg-accent-light/30" : "hover:bg-notion-overlay2"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQuestionIds((prev) => [...prev, q.id]);
                              } else {
                                setSelectedQuestionIds((prev) => prev.filter((id) => id !== q.id));
                              }
                            }}
                            className="mt-0.5 accent-accent"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-notion-text truncate">{q.title}</div>
                            <div className="text-[11px] text-notion-text3 mt-0.5">
                              {[q.subject, q.type, q.difficulty].join(" · ")}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-notion-text3 mb-1.5 block">学科</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="如：数学、物理、英语…"
                className="w-full h-9 px-3 rounded-md border border-notion-border2 bg-white text-sm text-notion-text outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-notion-text3 mb-1.5 block">
                考查范围 <span className="text-notion-text4 font-normal">（可选）</span>
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="如：二次函数、牛顿运动定律、定语从句…"
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-notion-border2 bg-white text-sm text-notion-text outline-none focus:border-accent transition-colors resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 2: 难度与模型 */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-notion-text mb-1">难度与出题模型</h2>
              <p className="text-xs text-notion-text3 mb-4">调整难度档位并选择 AI 模型</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-notion-text3 mb-1.5 block">
                难度：{["", "简单", "偏易", "中等", "偏难", "困难"][difficulty]}
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors ${
                      difficulty >= d
                        ? "bg-accent text-white"
                        : "bg-white border border-notion-border2 text-notion-text3 hover:bg-notion-overlay2"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-notion-text3 mb-1.5 block">
                出题模型
                <span className="text-notion-text4 font-normal ml-1">
                  · 建议配置高精度图片生成模型以支持图文题
                </span>
              </label>
              {models.length === 0 ? (
                <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  尚未配置任何模型，请先在设置中添加。
                </div>
              ) : (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-notion-border2 bg-white text-sm text-notion-text outline-none focus:border-accent"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* Step 3: 确认 */}
        {step === 3 && (
          <div>
            <h2 className="text-base font-semibold text-notion-text mb-1">确认生成</h2>
            <p className="text-xs text-notion-text3 mb-4">请核对以下信息</p>
            <dl className="text-sm divide-y divide-notion-border">
              {[
                { label: "时长", value: `${durationInfo.label} · ${durationInfo.durationMin} 分钟 · 约 ${durationInfo.totalQuestions} 题` },
                { label: "来源", value: sourceLabel || "—" },
                { label: "学科", value: subject || "—" },
                { label: "考查范围", value: topic || "（未指定）" },
                { label: "难度", value: ["", "简单", "偏易", "中等", "偏难", "困难"][difficulty] },
                { label: "出题模型", value: models.find((m) => m.id === model)?.displayName || "—" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5">
                  <dt className="text-notion-text3">{row.label}</dt>
                  <dd className="text-notion-text font-medium text-right">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {error && step === 3 && (
          <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-600">
            {error}
          </div>
        )}
      </motion.div>

      {/* 底部导航 */}
      <div className="flex items-center justify-between">
        <button
          onClick={step === 0 ? onBack : () => setStep((s) => Math.max(0, s - 1))}
          className="h-9 px-4 rounded-md text-sm font-medium text-notion-text2 hover:bg-notion-overlay2 transition-colors"
        >
          {step === 0 ? "返回列表" : "上一步"}
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep((s) => Math.min(3, s + 1))}
            disabled={!canNext}
            className="h-9 px-4 rounded-md bg-accent text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            下一步
            <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            disabled={generating || !subject.trim() || !model}
            className="h-9 px-4 rounded-md bg-accent text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                AI 出题中…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" strokeWidth={1.75} />
                生成测验
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 答题视图
// ============================================================
function TakeView({
  quiz,
  onSubmit,
}: {
  quiz: Quiz;
  onSubmit: (answers: QuizAnswer[]) => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timeLeft, setTimeLeft] = useState(quiz.durationMin * 60);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 倒计时
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    const answerList: QuizAnswer[] = quiz.questions.map((q) => ({
      questionId: q.id,
      response: answers[q.id] ?? (q.type === "multiple" ? [] : ""),
    }));
    await onSubmit(answerList);
    setSubmitting(false);
  };

  const question = quiz.questions[currentIdx];
  const total = quiz.questions.length;
  const answeredCount = Object.values(answers).filter(
    (v) => v !== "" && !(Array.isArray(v) && v.length === 0)
  ).length;

  const setAnswer = (qid: string, val: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [qid]: val }));
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const isLow = timeLeft < 60;

  return (
    <div className="max-w-[800px] mx-auto p-4 md:p-8">
      {/* 顶部信息 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-notion-text">{quiz.title}</h1>
          <div className="flex items-center gap-2 text-xs text-notion-text4 mt-0.5">
            <span>{quiz.subject}</span>
            <span>·</span>
            <span>{total} 题</span>
            <span>·</span>
            <span>已答 {answeredCount}/{total}</span>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-sm font-medium tabular-nums ${
          isLow ? "bg-red-50 text-red-600" : "bg-white border border-notion-border2 text-notion-text"
        }`}>
          <Clock className="w-4 h-4" />
          {fmtTime(timeLeft)}
        </div>
      </div>

      {/* 进度条 */}
      <div className="h-1 bg-notion-border2 rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-accent"
          animate={{ width: `${((currentIdx + 1) / total) * 100}%` }}
        />
      </div>

      {/* 题目卡片 */}
      <div className="rounded-xl border border-notion-border2 bg-white p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-accent">
            第 {currentIdx + 1} / {total} 题
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-notion-border2 text-notion-text3">
            {QUESTION_TYPE_LABELS[question.type]}
          </span>
          <span className="text-[10px] text-notion-text4 ml-auto">
            {question.score} 分
          </span>
        </div>

        {/* 题干 */}
        <div className="text-sm text-notion-text leading-relaxed mb-4">
          <LaTeXText>{question.prompt}</LaTeXText>
        </div>

        {/* 答题区 */}
        <AnswerInput
          type={question.type}
          options={question.options}
          value={answers[question.id] ?? (question.type === "multiple" ? [] : "")}
          onChange={(val) => setAnswer(question.id, val)}
        />
      </div>

      {/* 导航 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          className="h-9 px-4 rounded-md text-sm font-medium text-notion-text2 hover:bg-notion-overlay2 transition-colors flex items-center gap-1 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          上一题
        </button>

        {/* 题号导航 */}
        <div className="flex items-center gap-1 flex-wrap max-w-md justify-center">
          {quiz.questions.map((q, i) => {
            const isAnswered = answers[q.id] !== undefined && answers[q.id] !== "" && !(Array.isArray(answers[q.id]) && answers[q.id].length === 0);
            const isCurrent = i === currentIdx;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                  isCurrent
                    ? "bg-accent text-white"
                    : isAnswered
                    ? "bg-green-100 text-green-700"
                    : "bg-notion-overlay2 text-notion-text3 hover:bg-notion-border2"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {currentIdx < total - 1 ? (
          <button
            onClick={() => setCurrentIdx((i) => Math.min(total - 1, i + 1))}
            className="h-9 px-4 rounded-md text-sm font-medium bg-accent text-white flex items-center gap-1 hover:opacity-90 transition-opacity"
          >
            下一题
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="h-9 px-4 rounded-md text-sm font-medium bg-accent text-white flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Flag className="w-4 h-4" />
            交卷
          </button>
        )}
      </div>

      {/* 交卷确认 */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowSubmitConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <Flag className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-base font-semibold text-notion-text mb-1">确认交卷？</h3>
              <p className="text-sm text-notion-text3 mb-4">
                已答 {answeredCount}/{total} 题
                {answeredCount < total && "，未答的题目将计为零分"}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 h-9 rounded-md text-sm font-medium text-notion-text2 hover:bg-notion-overlay2 transition-colors"
                >
                  继续答题
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 h-9 rounded-md bg-accent text-white text-sm font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      阅卷中…
                    </>
                  ) : (
                    "确认交卷"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// 答题输入组件
// ============================================================
function AnswerInput({
  type,
  options,
  value,
  onChange,
}: {
  type: QuestionType;
  options?: string[];
  value: string | string[];
  onChange: (val: string | string[]) => void;
}) {
  if (type === "single") {
    const selected = value as string;
    return (
      <div className="space-y-2">
        {(options || []).map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const isSelected = selected === letter;
          return (
            <button
              key={i}
              onClick={() => onChange(letter)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? "border-accent bg-accent-light/20"
                  : "border-notion-border2 hover:border-notion-text4"
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                isSelected ? "bg-accent text-white" : "bg-white border border-notion-border2 text-notion-text3"
              }`}>
                {letter}
              </div>
              <div className="text-sm text-notion-text">
                <LaTeXText>{opt}</LaTeXText>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (type === "multiple") {
    const selected = (Array.isArray(value) ? value : []) as string[];
    const toggle = (letter: string) => {
      if (selected.includes(letter)) {
        onChange(selected.filter((l) => l !== letter));
      } else {
        onChange([...selected, letter]);
      }
    };
    return (
      <div className="space-y-2">
        {(options || []).map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const isSelected = selected.includes(letter);
          return (
            <button
              key={i}
              onClick={() => toggle(letter)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? "border-accent bg-accent-light/20"
                  : "border-notion-border2 hover:border-notion-text4"
              }`}
            >
              <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-medium shrink-0 ${
                isSelected ? "bg-accent text-white" : "bg-white border border-notion-border2 text-notion-text3"
              }`}>
                {isSelected ? "✓" : letter}
              </div>
              <div className="text-sm text-notion-text">
                <LaTeXText>{opt}</LaTeXText>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (type === "blank") {
    return (
      <input
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        placeholder="在此填入答案…"
        className="w-full h-10 px-3 rounded-md border border-notion-border2 bg-white text-sm text-notion-text outline-none focus:border-accent"
      />
    );
  }

  // essay / composition
  return (
    <textarea
      value={value as string}
      onChange={(e) => onChange(e.target.value)}
      placeholder={type === "composition" ? "在此撰写作文…" : "在此输入解答…"}
      rows={type === "composition" ? 12 : 6}
      className="w-full px-3 py-2 rounded-md border border-notion-border2 bg-white text-sm text-notion-text outline-none focus:border-accent resize-none leading-relaxed"
    />
  );
}

// ============================================================
// 结果视图
// ============================================================
function ResultView({
  quiz,
  onBack,
}: {
  quiz: Quiz;
  onBack: () => void;
}) {
  const analysis = quiz.analysis;
  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-notion-text4">
        暂无分析结果
      </div>
    );
  }

  const percentage = analysis.totalScore > 0
    ? Math.round((analysis.earnedScore / analysis.totalScore) * 100)
    : 0;

  return (
    <div className="max-w-[800px] mx-auto p-4 md:p-8">
      {/* 成绩总览 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-notion-border2 bg-white p-6 mb-4"
      >
        <div className="flex items-center gap-5">
          {/* 环形进度图 */}
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r="42"
                fill="none"
                strokeWidth="6"
                className="stroke-notion-overlay2"
              />
              <motion.circle
                cx="48"
                cy="48"
                r="42"
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{
                  strokeDashoffset: 2 * Math.PI * 42 * (1 - percentage / 100),
                }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                className={
                  percentage >= 80
                    ? "stroke-green-500"
                    : percentage >= 60
                    ? "stroke-amber-500"
                    : "stroke-red-500"
                }
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-2xl font-bold tabular-nums leading-none ${
                  percentage >= 80
                    ? "text-green-600"
                    : percentage >= 60
                    ? "text-amber-600"
                    : "text-red-500"
                }`}
              >
                {percentage}
              </span>
              <span className="text-[10px] text-notion-text4 mt-0.5">分率</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-notion-text truncate">{quiz.title}</h1>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold text-notion-text tabular-nums">
                {analysis.earnedScore}
              </span>
              <span className="text-sm text-notion-text4">/ {analysis.totalScore} 分</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  percentage >= 80
                    ? "bg-green-50 text-green-700"
                    : percentage >= 60
                    ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {percentage >= 80 ? "优秀" : percentage >= 60 ? "及格" : "需努力"}
              </span>
              <span className="text-xs text-notion-text4">
                {quiz.subject} · {quiz.questions.length} 题
              </span>
            </div>
          </div>
        </div>
        {analysis.summary && (
          <p className="text-sm text-notion-text2 mt-4 leading-relaxed border-l-2 border-accent/40 pl-3">
            {analysis.summary}
          </p>
        )}
      </motion.div>

      {/* 薄弱知识点 & 建议 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {analysis.weakPoints.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-notion-border2 bg-white p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold text-notion-text">薄弱知识点</span>
            </div>
            <ul className="space-y-1.5">
              {analysis.weakPoints.map((p, i) => (
                <li key={i} className="text-xs text-notion-text2 flex items-start gap-1.5">
                  <span className="text-red-400 mt-0.5">·</span>
                  {p}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
        {analysis.suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-notion-border2 bg-white p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-notion-text">改进建议</span>
            </div>
            <ul className="space-y-1.5">
              {analysis.suggestions.map((s, i) => (
                <li key={i} className="text-xs text-notion-text2 flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">·</span>
                  {s}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      {/* 逐题分析 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-notion-border2 bg-white p-5"
      >
        <div className="text-sm font-semibold text-notion-text mb-4">逐题分析</div>
        <div className="space-y-4">
          {quiz.questions.map((q, i) => {
            const pq = analysis.perQuestion.find((p) => p.questionId === q.id);
            const userAns = quiz.answers?.find((a) => a.questionId === q.id);
            const earned = pq?.earned ?? 0;
            const isFull = earned === q.score;
            const isZero = earned === 0;

            return (
              <div key={q.id} className="border-b border-notion-border last:border-b-0 pb-4 last:pb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-notion-text3">
                    第 {i + 1} 题
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-notion-border2 text-notion-text3">
                    {QUESTION_TYPE_LABELS[q.type]}
                  </span>
                  <span className={`text-xs font-medium ml-auto ${
                    isFull ? "text-green-600" : isZero ? "text-red-500" : "text-amber-600"
                  }`}>
                    {earned} / {q.score} 分
                  </span>
                </div>
                <div className="text-sm text-notion-text mb-2">
                  <LaTeXText>{q.prompt}</LaTeXText>
                </div>
                {/* 学生作答 */}
                <div className="text-xs text-notion-text3 mb-1">
                  <span className="font-medium">你的答案：</span>
                  {formatAnswer(userAns?.response, q.type)}
                </div>
                {/* 正确答案 */}
                {!isFull && (
                  <div className="text-xs text-green-700 mb-1">
                    <span className="font-medium">正确答案：</span>
                    {formatAnswer(q.answer, q.type)}
                  </div>
                )}
                {/* 评语 */}
                {pq?.comment && (
                  <div className="text-xs text-notion-text2 mt-1.5 p-2 rounded bg-white border border-notion-border2">
                    {pq.comment}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* 返回按钮 */}
      <div className="flex justify-center mt-6">
        <button
          onClick={onBack}
          className="h-9 px-6 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          返回测验列表
        </button>
      </div>
    </div>
  );
}

function formatAnswer(ans: string | string[] | undefined, type: QuestionType): string {
  if (ans === undefined || ans === "") return "未作答";
  if (Array.isArray(ans)) {
    if (ans.length === 0) return "未作答";
    return ans.join("、");
  }
  if (type === "essay" || type === "composition") {
    return ans.length > 100 ? ans.slice(0, 100) + "…" : ans;
  }
  return ans;
}
