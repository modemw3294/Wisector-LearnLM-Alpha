"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  Plus,
  Play,
  Trash2,
  X,
  Loader2,
  Film,
  Image as ImageIcon,
  Mic,
  Clapperboard,
  Sparkles,
  Maximize2,
  Menu,
  Check,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import { useModelConfigs } from "@/lib/useModelConfigs";
import type { Video as VideoType, VideoMode } from "@/lib/video-types";
import type { ModelConfig } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import SettingsModal from "@/components/SettingsModal";
import DevLogPanel from "@/components/DevLogPanel";

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

type SourceType = "textbook" | "textbook-questions";

const DURATION_OPTIONS: { key: "short" | "medium" | "long"; label: string; sec: number }[] = [
  { key: "short", label: "短", sec: 30 },
  { key: "medium", label: "中", sec: 120 },
  { key: "long", label: "长", sec: 300 },
];

const MODE_INFO: Record<VideoMode, { label: string; desc: string; icon: typeof Film }> = {
  slideshow: {
    label: "幻灯片模式",
    desc: "AI 生成幻灯片 + 圈点动画 + 互动环节 + 配音",
    icon: ImageIcon,
  },
  cinematic: {
    label: "电影效果模式",
    desc: "AI 生成场景画面 + 视频生成模型渲染 + 转场 + 配音",
    icon: Film,
  },
};

const IMAGE_STYLES = [
  "扁平插画",
  "水彩手绘",
  "3D 渲染",
  "像素风格",
  "写实摄影",
  "动漫风格",
];

export default function VideoPage() {
  const { models } = useModelConfigs();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);

  const [textbooks, setTextbooks] = useState<TextbookItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [view, setView] = useState<"list" | "create">("list");
  const [playingVideo, setPlayingVideo] = useState<VideoType | null>(null);

  const enabledModels = models.filter((m) => m.enabled);

  const loadVideos = useCallback(async () => {
    try {
      const list = await api.listVideos();
      setVideos(list);
    } catch {
      setVideos([]);
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

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

  // 轮询正在生成的视频
  const hasGenerating = videos.some(
    (v) => v.status === "queued" || v.status === "generating"
  );
  useEffect(() => {
    if (!hasGenerating) return;
    const timer = setInterval(loadVideos, 2000);
    return () => clearInterval(timer);
  }, [hasGenerating, loadVideos]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.deleteVideo(id);
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <main className="flex h-screen bg-notion-bg overflow-hidden">
      <Sidebar
        onOpenSettings={() => setIsSettingsOpen(true)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        activeTab="video"
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
      {/* 顶部栏 */}
      <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-8 border-b border-notion-border bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          {view !== "list" ? (
            <button
              onClick={() => setView("list")}
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
          <Video className="w-4 h-4 text-accent" strokeWidth={1.75} />
          <span className="text-sm font-semibold text-notion-text tracking-tight">
            视频 Studio
          </span>
        </div>
        {view === "list" && (
          <button
            onClick={() => setView("create")}
            className="h-8 px-3 rounded-md bg-accent text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">新建视频</span>
          </button>
        )}
      </header>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto">
        {view === "list" ? (
          <div className="p-4 md:p-8">
            <div className="max-w-[1200px] mx-auto">
              {loadingVideos ? (
                <div className="flex items-center justify-center h-64 text-sm text-notion-text4">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  加载中…
                </div>
              ) : videos.length === 0 ? (
                <EmptyState onCreate={() => setView("create")} />
              ) : (
                <>
                  {/* 生成中的视频 */}
                  {videos.some((v) => v.status === "queued" || v.status === "generating") && (
                    <div className="mb-6">
                      <div className="text-xs font-semibold text-notion-text3 mb-3 flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        后台生成中
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {videos
                          .filter((v) => v.status === "queued" || v.status === "generating")
                          .map((v) => (
                            <GeneratingCard key={v.id} video={v} />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* 已完成的视频 */}
                  {videos.some((v) => v.status === "done") && (
                    <div>
                      <div className="text-xs font-semibold text-notion-text3 mb-3">
                        已生成
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {videos
                          .filter((v) => v.status === "done")
                          .map((v) => (
                            <VideoCard
                              key={v.id}
                              video={v}
                              onPlay={() => setPlayingVideo(v)}
                              onDelete={(e) => handleDelete(v.id, e)}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* 失败的视频 */}
                  {videos.some((v) => v.status === "error") && (
                    <div className="mt-6">
                      <div className="text-xs font-semibold text-notion-text3 mb-3">
                        生成失败
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {videos
                          .filter((v) => v.status === "error")
                          .map((v) => (
                            <ErrorCard
                              key={v.id}
                              video={v}
                              onDelete={(e) => handleDelete(v.id, e)}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <CreateWizard
            models={enabledModels}
            textbooks={textbooks}
            questions={questions}
            dataLoading={dataLoading}
            onBack={() => setView("list")}
            onCreated={() => {
              setView("list");
              loadVideos();
            }}
          />
        )}
      </div>

      <div className="shrink-0 px-4 md:px-8 py-2 border-t border-notion-border bg-white/60">
        <DevLogPanel />
      </div>

      {/* 全屏播放器 */}
      <AnimatePresence>
        {playingVideo && (
          <FullscreenPlayer
            video={playingVideo}
            onClose={() => setPlayingVideo(null)}
          />
        )}
      </AnimatePresence>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      </div>
    </main>
  );
}

// ============================================================
// 空状态
// ============================================================
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mb-4">
        <Clapperboard className="w-8 h-8 text-purple-600" strokeWidth={1.5} />
      </div>
      <h2 className="text-lg font-semibold text-notion-text mb-1.5">
        还没有视频
      </h2>
      <p className="text-sm text-notion-text3 mb-6 max-w-md">
        创建你的第一个教学视频，支持幻灯片和电影效果两种模式，任务后台运行
      </p>

      {/* 两种模式对比 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 w-full max-w-xl">
        <div className="p-4 rounded-xl border border-notion-border2 bg-white text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-md bg-accent-light/60 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-accent" strokeWidth={1.75} />
            </div>
            <span className="text-sm font-semibold text-notion-text">幻灯片模式</span>
          </div>
          <p className="text-[11px] text-notion-text3 leading-relaxed">
            AI 生成幻灯片 + 圈点动画 + 互动环节 + 配音
          </p>
        </div>
        <div className="p-4 rounded-xl border border-notion-border2 bg-white text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-md bg-purple-50 flex items-center justify-center">
              <Film className="w-4 h-4 text-purple-600" strokeWidth={1.75} />
            </div>
            <span className="text-sm font-semibold text-notion-text">电影效果模式</span>
          </div>
          <p className="text-[11px] text-notion-text3 leading-relaxed">
            AI 生成场景画面 + 视频生成模型渲染 + 转场 + 配音
          </p>
        </div>
      </div>

      <button
        onClick={onCreate}
        className="h-9 px-5 rounded-md bg-accent text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
      >
        <Plus className="w-4 h-4" strokeWidth={1.75} />
        新建视频
      </button>
    </div>
  );
}

// ============================================================
// 视频卡片（已完成）
// ============================================================
function VideoCard({
  video,
  onPlay,
  onDelete,
}: {
  video: VideoType;
  onPlay: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const ModeIcon = MODE_INFO[video.mode].icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-xl border border-notion-border2 bg-white overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onPlay}
    >
      <div className="aspect-video bg-gradient-to-br from-notion-overlay2 to-notion-border2 flex items-center justify-center relative">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <ModeIcon className="w-10 h-10 text-notion-text4" strokeWidth={1.5} />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-5 h-5 text-notion-text ml-0.5" fill="currentColor" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] tabular-nums">
          {formatDuration(video.durationSec)}
        </div>
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] flex items-center gap-1">
          <ModeIcon className="w-3 h-3" />
          {video.mode === "cinematic" ? "电影" : "幻灯片"}
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-notion-text truncate flex-1">
            {video.title}
          </h3>
          <button
            onClick={onDelete}
            className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-notion-text4 hover:text-red-500 hover:bg-red-50 transition-colors"
            aria-label="删除"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-notion-text4">
          <span>{video.subject}</span>
          <span>·</span>
          <span>{video.sourceLabel}</span>
        </div>
        <div className="text-[11px] text-notion-text4 mt-1">
          {formatDate(video.createdAt)}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// 生成中卡片
// ============================================================
function GeneratingCard({ video }: { video: VideoType }) {
  const completedSteps = video.steps.filter((s) => s.status === "done").length;
  const totalSteps = video.steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const currentStep = video.steps.find((s) => s.status === "running");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-accent-ring/60 bg-accent-light/40 overflow-hidden"
    >
      <div className="aspect-video bg-gradient-to-br from-accent-light to-accent-ring/60 flex items-center justify-center relative">
        <Loader2 className="w-8 h-8 text-accent animate-spin" strokeWidth={1.5} />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent-ring/50">
          <motion.div
            className="h-full bg-accent"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-notion-text truncate">
          {video.title}
        </h3>
        <div className="text-[11px] text-accent mt-1 flex items-center gap-1">
          {currentStep ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              {currentStep.label}…
            </>
          ) : (
            <>排队中…</>
          )}
        </div>

        {/* 步骤列表可视化 */}
        <div className="mt-2.5 space-y-1">
          {video.steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center gap-1.5 text-[10px]"
            >
              {step.status === "done" ? (
                <div className="w-3 h-3 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <Check className="w-2 h-2 text-white" strokeWidth={3} />
                </div>
              ) : step.status === "running" ? (
                <Loader2 className="w-3 h-3 text-accent animate-spin shrink-0" strokeWidth={2} />
              ) : (
                <div className="w-3 h-3 rounded-full border border-accent-ring/60 bg-white shrink-0" />
              )}
              <span
                className={
                  step.status === "done"
                    ? "text-accent"
                    : step.status === "running"
                    ? "text-accent font-medium"
                    : "text-notion-text4"
                }
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <div className="text-[10px] text-notion-text4 mt-2 pt-2 border-t border-accent-ring/40">
          {completedSteps} / {totalSteps} 步骤 · 后台运行中
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// 失败卡片
// ============================================================
function ErrorCard({
  video,
  onDelete,
}: {
  video: VideoType;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 overflow-hidden">
      <div className="aspect-video bg-red-100 flex items-center justify-center">
        <X className="w-8 h-8 text-red-400" strokeWidth={1.5} />
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-notion-text truncate flex-1">
            {video.title}
          </h3>
          <button
            onClick={onDelete}
            className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-notion-text4 hover:text-red-500 hover:bg-red-100 transition-colors"
            aria-label="删除"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="text-[11px] text-red-500 mt-1">
          {video.error || "生成失败"}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 创建向导（页面内）
// ============================================================
const VIDEO_WIZARD_STEPS = [
  { id: 0, label: "生成模式" },
  { id: 1, label: "选择来源" },
  { id: 2, label: "内容需求" },
  { id: 3, label: "模型配置" },
  { id: 4, label: "确认生成" },
];

function CreateWizard({
  models,
  textbooks,
  questions,
  dataLoading,
  onBack,
  onCreated,
}: {
  models: ModelConfig[];
  textbooks: TextbookItem[];
  questions: QuestionItem[];
  dataLoading: boolean;
  onBack: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<VideoMode>("slideshow");
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [selectedTextbookId, setSelectedTextbookId] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [requirement, setRequirement] = useState("");
  const [durationSec, setDurationSec] = useState(120);
  const [imageStyle, setImageStyle] = useState(IMAGE_STYLES[0]);
  const [mainModel, setMainModel] = useState("");
  const [imageModel, setImageModel] = useState("");
  const [ttsModel, setTtsModel] = useState("");
  const [videoModel, setVideoModel] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const sourceLabel = useMemo(() => {
    if (!selectedTextbook) return "";
    if (sourceType === "textbook") return selectedTextbook.name;
    const count = selectedQuestionIds.length;
    return count > 0 ? `${selectedTextbook.name} + ${count} 道题目` : selectedTextbook.name;
  }, [selectedTextbook, sourceType, selectedQuestionIds]);

  const requirementPrefix = useMemo(() => {
    if (!selectedTextbook) return "";
    if (sourceType === "textbook") return `基于课本《${selectedTextbook.name}》生成教学视频`;
    const count = selectedQuestionIds.length;
    if (count > 0) {
      return `基于课本《${selectedTextbook.name}》及 ${count} 道关联题目生成讲解视频`;
    }
    return `基于课本《${selectedTextbook.name}》生成教学视频`;
  }, [selectedTextbook, sourceType, selectedQuestionIds]);

  const finalRequirement = useMemo(() => {
    const user = requirement.trim();
    if (!requirementPrefix) return user;
    return user ? `${requirementPrefix}。${user}` : requirementPrefix;
  }, [requirementPrefix, requirement]);

  const titlePlaceholder = useMemo(() => {
    if (sourceType === "textbook") return "如：二次函数图像变换";
    if (sourceType === "textbook-questions") return "如：二次函数易错题讲解";
    return "请输入视频标题";
  }, [sourceType]);

  useEffect(() => {
    if (models.length > 0 && !mainModel) {
      setMainModel(models[0].id);
    }
  }, [models, mainModel]);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("请输入视频标题");
      return;
    }
    if (!subject.trim()) {
      setError("请输入学科");
      return;
    }
    if (!mainModel) {
      setError("请选择主模型");
      return;
    }
    if (mode === "cinematic" && !videoModel) {
      setError("电影效果模式需要选择视频生成模型");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await api.createVideo({
        title: title.trim(),
        sourceLabel: sourceLabel.trim() || "通用",
        subject: subject.trim(),
        mode,
        requirement: finalRequirement.trim(),
        models: {
          main: mainModel,
          image: imageModel || undefined,
          tts: ttsModel || undefined,
          video: videoModel || undefined,
        },
        imageStyle,
        durationSec,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const canNext =
    (step === 0 && !!mode) ||
    (step === 1 &&
      !!sourceType &&
      !!selectedTextbookId &&
      title.trim().length > 0 &&
      subject.trim().length > 0 &&
      (sourceType === "textbook" || selectedQuestionIds.length > 0)) ||
    (step === 2) ||
    (step === 3 && !!mainModel && (mode !== "cinematic" || !!videoModel)) ||
    step === 4;

  return (
    <div className="max-w-[760px] mx-auto p-4 md:p-8">
      {/* 步骤指示器 */}
      <div className="flex items-center justify-between mb-8">
        {VIDEO_WIZARD_STEPS.map((s, i) => {
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
                      : "bg-notion-overlay2 text-notion-text4"
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
              {i < VIDEO_WIZARD_STEPS.length - 1 && (
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
        {/* Step 0: 模式 */}
        {step === 0 && (
          <div>
            <h2 className="text-base font-semibold text-notion-text mb-1">选择生成模式</h2>
            <p className="text-xs text-notion-text3 mb-4">不同模式决定视频的画面呈现方式</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(MODE_INFO) as VideoMode[]).map((m) => {
                const info = MODE_INFO[m];
                const Icon = info.icon;
                const selected = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? "border-accent bg-accent-light/30"
                        : "border-notion-border2 hover:border-notion-text4"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon
                        className={`w-4 h-4 ${selected ? "text-accent" : "text-notion-text3"}`}
                        strokeWidth={1.75}
                      />
                      <span className={`text-sm font-medium ${selected ? "text-accent" : "text-notion-text"}`}>
                        {info.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-notion-text3 leading-relaxed">
                      {info.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: 选择来源 */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-notion-text mb-1">选择来源</h2>
              <p className="text-xs text-notion-text3 mb-4">选择视频基于的课本或课本+关联题目</p>
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
                  基于单本课本生成教学视频
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
                  基于课本并选择关联题目生成讲解视频
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

            {/* 标题与学科 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-notion-text3 mb-1.5 block">标题</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={titlePlaceholder}
                  className="w-full h-9 px-3 rounded-md border border-notion-border2 bg-white text-sm text-notion-text outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-notion-text3 mb-1.5 block">学科</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="如：数学"
                  className="w-full h-9 px-3 rounded-md border border-notion-border2 bg-white text-sm text-notion-text outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* 来源标签（只读） */}
            <div>
              <label className="text-xs font-semibold text-notion-text3 mb-1.5 block">来源标签</label>
              <input
                value={sourceLabel}
                readOnly
                placeholder="选择课本后自动生成"
                className="w-full h-9 px-3 rounded-md border border-notion-border2 bg-notion-bg text-sm text-notion-text outline-none"
              />
            </div>

            {/* 时长 */}
            <div>
              <label className="text-xs font-semibold text-notion-text3 mb-1.5 block">
                时长：{formatDuration(durationSec)}
              </label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map((opt) => {
                  const selected = durationSec === opt.sec;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setDurationSec(opt.sec)}
                      className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors border ${
                        selected
                          ? "bg-accent text-white border-accent"
                          : "bg-white text-notion-text2 border-notion-border2 hover:bg-notion-overlay2"
                      }`}
                    >
                      {opt.label} · {formatDuration(opt.sec)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: 内容需求 */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-notion-text mb-1">内容需求与画面风格</h2>
              <p className="text-xs text-notion-text3 mb-4">描述视频内容并选择画面风格</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-notion-text3 mb-1.5 block">需求描述</label>
              <textarea
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder="描述你希望视频涵盖的内容、重点、风格等…"
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-notion-border2 bg-white text-sm text-notion-text outline-none focus:border-accent transition-colors resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-notion-text3 mb-1.5 block">画面风格</label>
              <div className="flex flex-wrap gap-2">
                {IMAGE_STYLES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setImageStyle(s)}
                    className={`h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                      imageStyle === s
                        ? "bg-accent text-white"
                        : "bg-notion-overlay2 text-notion-text2 hover:bg-notion-border2"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: 模型配置 */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-notion-text mb-1">模型配置</h2>
              <p className="text-xs text-notion-text3 mb-4">为不同环节选择合适的 AI 模型</p>
            </div>
            {models.length === 0 ? (
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700">
                尚未配置任何模型，请先在设置中添加模型。
              </div>
            ) : (
              <div className="space-y-3">
                <ModelSelect
                  label="主模型（脚本生成）"
                  icon={Sparkles}
                  models={models}
                  value={mainModel}
                  onChange={setMainModel}
                  required
                />
                <ModelSelect
                  label="图片生成模型"
                  icon={ImageIcon}
                  models={models}
                  value={imageModel}
                  onChange={setImageModel}
                  placeholder="可选 — 用于生成场景画面"
                />
                <ModelSelect
                  label="配音模型（TTS）"
                  icon={Mic}
                  models={models}
                  value={ttsModel}
                  onChange={setTtsModel}
                  placeholder="可选 — 用于 AI 配音"
                />
                {mode === "cinematic" && (
                  <ModelSelect
                    label="视频生成模型"
                    icon={Film}
                    models={models}
                    value={videoModel}
                    onChange={setVideoModel}
                    placeholder="必选 — 电影效果模式必需"
                    required
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4: 确认 */}
        {step === 4 && (
          <div>
            <h2 className="text-base font-semibold text-notion-text mb-1">确认生成</h2>
            <p className="text-xs text-notion-text3 mb-4">请核对以下信息</p>
            <dl className="text-sm divide-y divide-notion-border">
              {[
                { label: "生成模式", value: MODE_INFO[mode].label },
                { label: "标题", value: title || "—" },
                { label: "学科", value: subject || "—" },
                { label: "来源标签", value: sourceLabel || "通用" },
                { label: "时长", value: formatDuration(durationSec) },
                { label: "画面风格", value: imageStyle },
                { label: "需求描述", value: finalRequirement || "（未指定）" },
                { label: "主模型", value: models.find((m) => m.id === mainModel)?.displayName || "—" },
                { label: "图片模型", value: models.find((m) => m.id === imageModel)?.displayName || "（未指定）" },
                { label: "TTS 模型", value: models.find((m) => m.id === ttsModel)?.displayName || "（未指定）" },
                ...(mode === "cinematic"
                  ? [{ label: "视频模型", value: models.find((m) => m.id === videoModel)?.displayName || "—" }]
                  : []),
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5 gap-3">
                  <dt className="text-notion-text3 shrink-0">{row.label}</dt>
                  <dd className="text-notion-text font-medium text-right break-all">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {error && step === 4 && (
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
        {step < 4 ? (
          <button
            onClick={() => setStep((s) => Math.min(4, s + 1))}
            disabled={!canNext}
            className="h-9 px-4 rounded-md bg-accent text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            下一步
            <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={creating || models.length === 0}
            className="h-9 px-4 rounded-md bg-accent text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                创建中…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" strokeWidth={1.75} />
                开始生成
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function ModelSelect({
  label,
  icon: Icon,
  models,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  icon: typeof Sparkles;
  models: ModelConfig[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-40 shrink-0">
        <Icon className="w-3.5 h-3.5 text-notion-text3" strokeWidth={1.75} />
        <span className="text-xs text-notion-text2">{label}</span>
        {required && <span className="text-red-500 text-xs">*</span>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-8 px-2 rounded-md border border-notion-border2 bg-white text-xs text-notion-text outline-none focus:border-accent"
      >
        <option value="">{placeholder || "请选择模型"}</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================
// 全屏播放器
// ============================================================
function FullscreenPlayer({
  video,
  onClose,
}: {
  video: VideoType;
  onClose: () => void;
}) {
  const ModeIcon = MODE_INFO[video.mode].icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      <div className="h-12 shrink-0 flex items-center justify-between px-4">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-md flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" strokeWidth={1.75} />
        </button>
        <div className="flex items-center gap-2 text-white/80">
          <ModeIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{video.title}</span>
          <span className="text-xs text-white/50">
            · {video.mode === "cinematic" ? "电影效果" : "幻灯片"} · {formatDuration(video.durationSec)}
          </span>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {video.videoUrl ? (
          <video
            src={video.videoUrl}
            controls
            autoPlay
            className="max-w-full max-h-full"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <div className="text-center text-white/60">
            <ModeIcon className="w-16 h-16 mx-auto mb-4 opacity-50" strokeWidth={1} />
            <p className="text-sm">
              {video.mode === "cinematic" ? "电影效果视频" : "幻灯片视频"}预览
            </p>
            <p className="text-xs text-white/40 mt-2 max-w-md">
              {video.requirement || "无需求描述"}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white/10 text-white/80 text-xs">
              <Maximize2 className="w-3.5 h-3.5" />
              全屏播放模式
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 p-4 bg-black/50">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 text-xs text-white/60 mb-2">
            <span>{video.subject}</span>
            <span>·</span>
            <span>{video.sourceLabel}</span>
            <span>·</span>
            <span>{formatDate(video.createdAt)}</span>
          </div>
          {video.requirement && (
            <p className="text-xs text-white/50 leading-relaxed">
              {video.requirement}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// 工具函数
// ============================================================
function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
