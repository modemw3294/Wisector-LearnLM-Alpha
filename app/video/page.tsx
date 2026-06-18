"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Search,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Video,
  Sparkles,
  Mic,
  Image as ImageIcon,
  Bot,
  Loader2,
  PartyPopper,
  Download,
  RotateCcw,
  ListChecks,
  Play,
  Clock,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import SettingsModal from "@/components/SettingsModal";
import { TEXTBOOKS } from "@/components/TextbookSelector";
import { MODELS } from "@/components/ModelSelector";

/* ──────────────────────────  数据  ────────────────────────── */

interface Question {
  id: string;
  title: string;
  subject: string;
  type: string;
  difficulty: string;
  textbook?: string;
}

const QUESTIONS: Question[] = [
  { id: "q-1", title: "已知 a + b = 5，ab = 6，求 a² + b² 的值", subject: "数学", type: "解答", difficulty: "中等", textbook: "七年级数学（上）" },
  { id: "q-2", title: "下列关于力的说法正确的是", subject: "物理", type: "选择", difficulty: "简单", textbook: "九年级物理" },
  { id: "q-3", title: "光合作用的化学方程式", subject: "生物", type: "填空", difficulty: "简单" },
  { id: "q-4", title: "一元二次方程的求根公式推导", subject: "数学", type: "解答", difficulty: "困难", textbook: "八年级数学（上）" },
  { id: "q-5", title: "动词时态：一般现在时 vs 现在进行时", subject: "英语", type: "选择", difficulty: "中等", textbook: "七年级英语" },
];

const TTS_MODELS = [
  { id: "speech-2.8-hd", name: "speech-2.8-hd", provider: "Hailuo AI", desc: "高质量语音合成" },
  { id: "gemini-3.1-flash-tts-preview", name: "gemini-3.1-flash-tts-preview", provider: "Google", desc: "Google Gemini TTS 预览" },
];

const IMAGE_MODELS = [
  { id: "gpt-image-2", name: "GPT Image 2", provider: "OpenAI", desc: "高质量图像生成" },
  { id: "gemini-3.1-flash-image", name: "Nano Banana 2", provider: "Google", desc: "快速图像生成" },
  { id: "seedream-4.0", name: "Seedream 4", provider: "ByteDance", desc: "创意图像生成" },
];

const IMAGE_STYLES = [
  { id: "illustration", name: "教学插画", desc: "精美教学插画，细节丰富" },
  { id: "lineart", name: "简约线稿", desc: "简洁清晰，适合示意图" },
  { id: "realistic", name: "写实风格", desc: "逼真写实的场景图" },
  { id: "cartoon", name: "卡通风", desc: "活泼可爱，适合低年级" },
];

const STEPS = [
  { id: 0, label: "选择题目", icon: ListChecks },
  { id: 1, label: "输入需求", icon: Sparkles },
  { id: 2, label: "模型配置", icon: Bot },
  { id: 3, label: "生成", icon: Video },
  { id: 4, label: "完成", icon: PartyPopper },
];

const GEN_SUB_STEPS = [
  { id: "slides", label: "生成幻灯片" },
  { id: "annotate", label: "添加圈点动画" },
  { id: "interact", label: "设置互动环节" },
  { id: "voice", label: "AI 配音" },
  { id: "compose", label: "组织合成" },
];

interface VideoItem {
  id: string;
  title: string;
  status: "done" | "processing";
  duration: string;
  createdAt: string;
}

const DEMO_VIDEOS: VideoItem[] = [
  { id: "v-1", title: "一元二次方程求根公式", status: "done", duration: "3:42", createdAt: "2026-06-15" },
  { id: "v-2", title: "光合作用详解", status: "done", duration: "5:18", createdAt: "2026-06-14" },
];

/* ──────────────────────────  页面  ────────────────────────── */

export default function VideoPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [step, setStep] = useState(0);

  // 步骤 0：选择模式 + 课本 + 题目
  const [selectionMode, setSelectionMode] = useState<"textbook" | "question">("textbook");
  const [selectedTextbookId, setSelectedTextbookId] = useState<string>("");
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  // 步骤 1：需求
  const [requirement, setRequirement] = useState("");
  // 步骤 2：模型
  const [mainModel, setMainModel] = useState(MODELS[0].id);
  const [ttsModel, setTtsModel] = useState(TTS_MODELS[0].id);
  const [imageModel, setImageModel] = useState<string>("");
  const [useImageGen, setUseImageGen] = useState(true);
  const [imageStyle, setImageStyle] = useState(IMAGE_STYLES[0].id);
  // 步骤 3：生成
  const [genStepIdx, setGenStepIdx] = useState(-1);
  const [genDone, setGenDone] = useState(false);
  const [stepMode, setStepMode] = useState(false);

  // 我的视频：播放状态
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);

  // 题目模式下，按课本筛选题目；课本模式下不涉及题目
  const filteredQuestions = selectionMode === "question" && selectedTextbookId
    ? QUESTIONS.filter((q) => q.textbook && q.textbook.includes(TEXTBOOKS.find((t) => t.id === selectedTextbookId)?.name ?? ""))
    : [];

  const selectedTextbook = TEXTBOOKS.find((t) => t.id === selectedTextbookId);

  // 可进入下一步的条件
  // - 课本模式：选中了课本
  // - 题目模式：选中了课本且选中了题目
  const canNext =
    (step === 0 && (selectionMode === "textbook" ? !!selectedTextbookId : !!selectedTextbookId && !!selectedQuestion)) ||
    (step === 1 && requirement.trim().length > 0) ||
    (step === 2);

  const handleStartGenerate = () => {
    setGenStepIdx(0);
  };

  useEffect(() => {
    if (step !== 3 || genStepIdx < 0 || genDone) return;
    if (genStepIdx >= GEN_SUB_STEPS.length) {
      setGenDone(true);
      return;
    }
    const timer = setTimeout(() => {
      if (!stepMode) {
        setGenStepIdx((i) => i + 1);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [step, genStepIdx, stepMode, genDone]);

  const handleStepModeNext = () => {
    if (genStepIdx < GEN_SUB_STEPS.length - 1) {
      setGenStepIdx((i) => i + 1);
    } else {
      setGenDone(true);
    }
  };

  const handleReset = () => {
    setStep(0);
    setSelectionMode("textbook");
    setSelectedTextbookId("");
    setSelectedQuestion(null);
    setRequirement("");
    setMainModel(MODELS[0].id);
    setTtsModel(TTS_MODELS[0].id);
    setImageModel("");
    setUseImageGen(true);
    setImageStyle(IMAGE_STYLES[0].id);
    setGenStepIdx(-1);
    setGenDone(false);
  };

  const videoListSlot = (
    <div className="px-2 pb-1 border-t border-notion-border">
      <div className="px-2.5 pt-2 pb-1 text-[11px] font-medium text-notion-text4 uppercase tracking-wider">
        我的视频
      </div>
      <div className="space-y-0.5 max-h-[35vh] overflow-y-auto pb-1">
        {DEMO_VIDEOS.length === 0 ? (
          <div className="px-2.5 py-2 text-xs text-notion-text4">暂无视频</div>
        ) : (
          DEMO_VIDEOS.map((v) => (
            <button
              key={v.id}
              onClick={() => setPlayingVideo(v)}
              className="w-full flex items-center gap-2 px-2 h-8 rounded-md hover:bg-notion-overlay2 transition-colors group"
            >
              <Play className="w-3.5 h-3.5 shrink-0 text-notion-text3" strokeWidth={1.5} />
              <span className="flex-1 text-xs text-notion-text2 truncate text-left">
                {v.title}
              </span>
              <span className="text-[10px] text-notion-text4 shrink-0">{v.duration}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-notion-bg overflow-hidden">
      {/* 桌面端侧边栏 */}
      <div className="hidden md:block">
        <Sidebar
          activeTab="video"
          bottomSlot={videoListSlot}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      {/* 移动端侧边栏 */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <Sidebar
            activeTab="video"
            bottomSlot={videoListSlot}
            mobileOpen
            onMobileClose={() => setMobileSidebarOpen(false)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* 设置弹窗 */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* 主区域 */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex items-center gap-2 px-4 md:px-8 h-12 border-b border-notion-border bg-white/60 backdrop-blur-sm shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors"
            aria-label="打开侧边栏"
          >
            <ListChecks className="w-5 h-5" strokeWidth={1.75} />
          </button>
          <a
            href="/"
            className="flex items-center gap-1.5 h-8 px-2 rounded-md text-sm text-notion-text2 hover:bg-notion-overlay2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">返回</span>
          </a>
          <div className="w-px h-5 bg-notion-border2" />
          <h1 className="text-sm font-semibold text-notion-text tracking-tight flex items-center gap-1.5">
            <Video className="w-4 h-4" strokeWidth={1.75} />
            视频创作
          </h1>
        </div>

        {/* 步骤指示器 */}
        <div className="px-4 md:px-8 py-4 border-b border-notion-border bg-white/40 shrink-0">
          <div className="max-w-[720px] mx-auto flex items-center">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === i;
              const isDone = step > i || (step === 4 && genDone);
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? "bg-blue-500 text-white shadow-md shadow-blue-200"
                          : isDone
                          ? "bg-green-100 text-green-700"
                          : "bg-notion-overlay2 text-notion-text4"
                      }`}
                    >
                      {isDone && !isActive ? (
                        <Check className="w-4 h-4" strokeWidth={2.5} />
                      ) : (
                        <Icon className="w-4 h-4" strokeWidth={1.75} />
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-medium tracking-tight whitespace-nowrap ${
                        isActive ? "text-notion-text" : "text-notion-text4"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                        step > i ? "bg-green-300" : "bg-notion-border2"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 步骤内容 */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          <div className="max-w-[640px] mx-auto">
            <AnimatePresence mode="wait">
              {/* 步骤 0：选择课本 + 题目 */}
              {step === 0 && (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <StepTitle title="选择内容" desc="选择课本整体讲解，或指定课本中的某道题目。" />

                  {/* 模式切换 */}
                  <div className="flex items-center gap-2 mb-4 p-1 rounded-lg bg-notion-overlay2">
                    <button
                      onClick={() => { setSelectionMode("textbook"); setSelectedQuestion(null); }}
                      className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors ${
                        selectionMode === "textbook" ? "bg-white text-notion-text shadow-sm" : "text-notion-text3"
                      }`}
                    >
                      仅课本
                    </button>
                    <button
                      onClick={() => setSelectionMode("question")}
                      className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors ${
                        selectionMode === "question" ? "bg-white text-notion-text shadow-sm" : "text-notion-text3"
                      }`}
                    >
                      课本 + 题目
                    </button>
                  </div>

                  {/* 选择课本 */}
                  <div className="mb-4">
                    <div className="text-xs font-medium text-notion-text3 mb-2">选择课本</div>
                    <div className="space-y-1.5">
                      {TEXTBOOKS.map((tb) => {
                        const isSelected = selectedTextbookId === tb.id;
                        return (
                          <button
                            key={tb.id}
                            onClick={() => {
                              setSelectedTextbookId(tb.id);
                              setSelectedQuestion(null);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left border transition-colors ${
                              isSelected
                                ? "border-blue-200 bg-blue-50"
                                : "border-notion-border2 bg-white hover:border-notion-text3"
                            }`}
                          >
                            <div className="w-9 h-9 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                              <BookOpen className="w-4 h-4" strokeWidth={1.75} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-notion-text tracking-tight truncate">
                                {tb.name}
                              </div>
                              <div className="text-xs text-notion-text4 mt-0.5">
                                {[tb.subject, tb.grade].join(" · ")}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2.5} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 选择题目（仅题目模式 + 已选课本时显示） */}
                  {selectionMode === "question" && selectedTextbookId && (
                    <div>
                      <div className="text-xs font-medium text-notion-text3 mb-2">
                        选择题目 · {selectedTextbook?.name}
                      </div>
                      {filteredQuestions.length === 0 ? (
                        <div className="px-3 py-6 text-center text-sm text-notion-text3 bg-notion-overlay2 rounded-md">
                          该课本暂无可用题目
                        </div>
                      ) : (
                        <QuestionPicker
                          selected={selectedQuestion}
                          onSelect={setSelectedQuestion}
                          questions={filteredQuestions}
                        />
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* 步骤 1：输入需求 */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <StepTitle title="输入需求" desc="描述你对视频的期望，包括讲解风格、时长、重点等。" />
                  <div className="mb-4">
                    <div className="text-xs text-notion-text3 mb-2">已选内容</div>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-blue-50 border border-blue-200">
                      <BookOpen className="w-4 h-4 text-blue-700 shrink-0" strokeWidth={1.75} />
                      <span className="text-sm text-notion-text truncate">
                        {selectedTextbook?.name}
                        {selectedQuestion && ` · ${selectedQuestion.title}`}
                      </span>
                    </div>
                  </div>
                  <textarea
                    value={requirement}
                    onChange={(e) => setRequirement(e.target.value)}
                    placeholder="例如：请以生动有趣的方式讲解这道题的解题思路，适合初中生观看，时长控制在 3 分钟左右……"
                    rows={6}
                    className="w-full resize-none px-3 py-2.5 rounded-xl border border-notion-border2 bg-white text-sm text-notion-text placeholder:text-notion-text4 focus:outline-none focus:border-notion-text3 transition-colors"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["通俗易懂", "详细步骤", "举一反三", "互动问答"].map((tag) => (
                      <button
                        key={tag}
                        onClick={() =>
                          setRequirement((prev) =>
                            prev.includes(tag) ? prev : prev ? `${prev}，${tag}` : tag
                          )
                        }
                        className="px-2.5 py-1 rounded-full text-xs text-notion-text2 bg-notion-overlay2 hover:bg-notion-overlay transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* 步骤 2：模型配置 */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <StepTitle title="模型配置" desc="选择用于生成视频的 AI 模型。已从设置中加载默认值，可按需覆盖。" />

                  <ModelCard
                    icon={<Bot className="w-4 h-4" strokeWidth={1.75} />}
                    label="主模型"
                    hint="建议选择高质量多模态模型"
                    required
                  >
                    <ModelDropdown
                      options={MODELS.map((m) => ({ id: m.id, name: m.name }))}
                      value={mainModel}
                      onChange={setMainModel}
                    />
                  </ModelCard>

                  <ModelCard
                    icon={<Mic className="w-4 h-4" strokeWidth={1.75} />}
                    label="配音 TTS 模型"
                    hint="为视频生成语音讲解"
                    required
                  >
                    <OptionDropdown
                      options={TTS_MODELS.map((m) => ({ id: m.id, name: m.name, subtitle: m.provider }))}
                      value={ttsModel}
                      onChange={setTtsModel}
                    />
                  </ModelCard>

                  <ModelCard
                    icon={<ImageIcon className="w-4 h-4" strokeWidth={1.75} />}
                    label="图片生成模型"
                    hint="生成教学插图（可选，强烈推荐）"
                    toggle
                    toggleValue={useImageGen}
                    onToggle={setUseImageGen}
                  >
                    <OptionDropdown
                      options={IMAGE_MODELS.map((m) => ({ id: m.id, name: m.name, subtitle: m.provider }))}
                      value={imageModel || IMAGE_MODELS[0].id}
                      onChange={setImageModel}
                      disabled={!useImageGen}
                    />

                    {useImageGen && (
                      <div className="mt-3">
                        <div className="text-xs text-notion-text4 mb-2">图片风格</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {IMAGE_STYLES.map((style) => {
                            const isActive = imageStyle === style.id;
                            return (
                              <button
                                key={style.id}
                                onClick={() => setImageStyle(style.id)}
                                className={`flex items-center gap-2 px-2.5 py-2 rounded-md border text-left transition-colors ${
                                  isActive
                                    ? "border-blue-200 bg-blue-50"
                                    : "border-notion-border2 bg-white hover:border-notion-text3"
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-notion-text tracking-tight">
                                    {style.name}
                                  </div>
                                  <div className="text-[10px] text-notion-text4 truncate">
                                    {style.desc}
                                  </div>
                                </div>
                                {isActive && (
                                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" strokeWidth={2.5} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </ModelCard>
                </motion.div>
              )}

              {/* 步骤 3：生成 */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <StepTitle title="生成视频" desc="AI 将依次完成以下步骤，请耐心等待。" />

                  <div className="flex items-center gap-2 mb-4 p-1 rounded-lg bg-notion-overlay2">
                    <button
                      onClick={() => setStepMode(false)}
                      className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors ${
                        !stepMode ? "bg-white text-notion-text shadow-sm" : "text-notion-text3"
                      }`}
                    >
                      全自动
                    </button>
                    <button
                      onClick={() => setStepMode(true)}
                      className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors ${
                        stepMode ? "bg-white text-notion-text shadow-sm" : "text-notion-text3"
                      }`}
                    >
                      逐步模式
                    </button>
                  </div>

                  <div className="space-y-2">
                    {GEN_SUB_STEPS.map((gs, i) => {
                      const isCurrent = i === genStepIdx && !genDone;
                      const isComplete = i < genStepIdx || genDone;
                      const isWaiting = i > genStepIdx;
                      return (
                        <div
                          key={gs.id}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                            isCurrent
                              ? "border-blue-200 bg-blue-50/50"
                              : isComplete
                              ? "border-green-200 bg-green-50/30"
                              : "border-notion-border2 bg-white"
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0">
                            {isComplete ? (
                              <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                                <Check className="w-4 h-4" strokeWidth={2.5} />
                              </div>
                            ) : isCurrent ? (
                              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" strokeWidth={2} />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-notion-overlay2 text-notion-text4 flex items-center justify-center text-xs font-medium">
                                {i + 1}
                              </div>
                            )}
                          </div>
                          <span
                            className={`text-sm font-medium tracking-tight ${
                              isWaiting ? "text-notion-text4" : "text-notion-text"
                            }`}
                          >
                            {gs.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {stepMode && !genDone && genStepIdx >= 0 && (
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={handleStepModeNext}
                        className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        下一步
                        <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                    </div>
                  )}

                  {genStepIdx === -1 && (
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={handleStartGenerate}
                        className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        <Sparkles className="w-4 h-4" strokeWidth={1.75} />
                        开始生成
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* 步骤 4：完成 */}
              {step === 4 && genDone && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center text-center py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-4">
                    <PartyPopper className="w-8 h-8" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-xl font-semibold text-notion-text tracking-tight mb-1">
                    视频已生成！
                  </h2>
                  <p className="text-sm text-notion-text3 mb-6">
                    「{selectedTextbook?.name}{selectedQuestion ? ` · ${selectedQuestion.title}` : ""}」讲解视频已就绪。
                  </p>

                  <div className="w-full aspect-video max-w-[480px] rounded-xl bg-notion-sidebar border border-notion-border2 flex items-center justify-center mb-6">
                    <div className="flex flex-col items-center gap-2 text-notion-text4">
                      <Video className="w-10 h-10" strokeWidth={1.5} />
                      <span className="text-xs">视频预览</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors">
                      <Download className="w-4 h-4" strokeWidth={1.75} />
                      下载视频
                    </button>
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white border border-notion-border2 text-notion-text2 text-sm font-medium hover:bg-notion-overlay2 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" strokeWidth={1.75} />
                      重新创建
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {step < 4 && (
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-notion-border">
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className={`inline-flex items-center gap-1 h-8 px-3 rounded-md text-sm font-medium transition-colors ${
                    step === 0
                      ? "text-notion-text4 cursor-not-allowed"
                      : "text-notion-text2 hover:bg-notion-overlay2"
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
                  上一步
                </button>

                {step < 3 ? (
                  <button
                    onClick={() => setStep((s) => s + 1)}
                    disabled={!canNext}
                    className={`inline-flex items-center gap-1 h-8 px-4 rounded-md text-sm font-medium transition-colors ${
                      canNext
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-notion-overlay2 text-notion-text4 cursor-not-allowed"
                    }`}
                  >
                    下一步
                    <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                ) : step === 3 && genDone ? (
                  <button
                    onClick={() => setStep(4)}
                    className="inline-flex items-center gap-1 h-8 px-4 rounded-md text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
                  >
                    查看结果
                    <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 我的视频播放弹窗 */}
      {playingVideo && (
        <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />
      )}
    </div>
  );
}

/* ──────────────────────────  视频播放弹窗  ────────────────────────── */

function VideoPlayerModal({ video, onClose }: { video: VideoItem; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useState(() => { setMounted(true); });

  const modal = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[720px] bg-white rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-notion-border">
            <div className="flex items-center gap-2 min-w-0">
              <Video className="w-4 h-4 text-notion-text2 shrink-0" strokeWidth={1.75} />
              <span className="text-sm font-semibold text-notion-text tracking-tight truncate">
                {video.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-notion-text3">
                <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                {video.duration}
              </span>
              <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors">
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
          <div className="aspect-video bg-notion-sidebar flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-notion-text4">
              <Play className="w-12 h-12" strokeWidth={1.5} />
              <span className="text-sm">视频播放区域</span>
              <span className="text-xs">{video.duration}</span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-notion-border">
            <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors">
              <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
              下载
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return mounted ? createPortal(modal, document.body) : null;
}

/* ──────────────────────────  子组件  ────────────────────────── */

function StepTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold text-notion-text tracking-tight">{title}</h2>
      <p className="text-sm text-notion-text3 mt-1">{desc}</p>
    </div>
  );
}

function QuestionPicker({
  selected,
  onSelect,
  questions,
}: {
  selected: Question | null;
  onSelect: (q: Question) => void;
  questions: Question[];
}) {
  const [query, setQuery] = useState("");
  const filtered = questions.filter((q) =>
    q.title.toLowerCase().includes(query.trim().toLowerCase())
  );
  return (
    <div>
      <div className="flex items-center gap-2 h-9 px-3 mb-3 rounded-md bg-white border border-notion-border2">
        <Search className="w-4 h-4 text-notion-text3 shrink-0" strokeWidth={1.75} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索题目…"
          className="flex-1 bg-transparent text-sm text-notion-text placeholder:text-notion-text4 focus:outline-none"
        />
      </div>
      <div className="space-y-1.5">
        {filtered.map((q) => {
          const isSelected = selected?.id === q.id;
          return (
            <button
              key={q.id}
              onClick={() => onSelect(q)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left border transition-colors ${
                isSelected
                  ? "border-blue-200 bg-blue-50"
                  : "border-notion-border2 bg-white hover:border-notion-text3"
              }`}
            >
              <div className="w-9 h-9 rounded-md bg-notion-overlay2 text-notion-text2 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-notion-text tracking-tight truncate">
                  {q.title}
                </div>
                <div className="text-[11px] text-notion-text4 mt-0.5">
                  {[q.subject, q.type, q.difficulty, q.textbook].filter(Boolean).join(" · ")}
                </div>
              </div>
              {isSelected && (
                <Check className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2.5} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModelCard({
  icon,
  label,
  hint,
  required,
  toggle,
  toggleValue,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  required?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`mb-4 p-4 rounded-xl border transition-opacity ${toggle && !toggleValue ? "opacity-50" : "opacity-100"} border-notion-border2 bg-white`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-notion-overlay2 text-notion-text2 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium text-notion-text tracking-tight">
              {label}
              {required && <span className="text-red-500 ml-0.5">*</span>}
            </div>
            <div className="text-[11px] text-notion-text4">{hint}</div>
          </div>
        </div>
        {toggle && (
          <button
            onClick={() => onToggle?.(!toggleValue)}
            className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors shrink-0 ${
              toggleValue ? "bg-blue-500" : "bg-notion-border2"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                toggleValue ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/** 带副标题（如 provider）的下拉选择 */
function OptionDropdown({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { id: string; name: string; subtitle?: string }[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value) ?? options[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`w-full flex items-center justify-between h-9 px-3 rounded-md border text-sm transition-colors ${
          disabled
            ? "bg-notion-overlay2 border-notion-border2 text-notion-text4 cursor-not-allowed"
            : "bg-white border-notion-border2 text-notion-text hover:border-notion-text3"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{selected?.name}</span>
          {selected?.subtitle && (
            <span className="text-[10px] text-notion-text4 shrink-0">{selected.subtitle}</span>
          )}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-notion-text3 shrink-0" strokeWidth={1.5} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md bg-white border border-notion-border2 shadow-lg py-1 z-30"
          >
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-sm transition-colors ${
                  o.id === value
                    ? "text-blue-700 bg-blue-50 font-medium"
                    : "text-notion-text2 hover:bg-notion-overlay2"
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{o.name}</span>
                  {o.subtitle && (
                    <span className="text-[10px] text-notion-text4 shrink-0">{o.subtitle}</span>
                  )}
                </span>
                {o.id === value && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModelDropdown({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value) ?? options[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`w-full flex items-center justify-between h-9 px-3 rounded-md border text-sm transition-colors ${
          disabled
            ? "bg-notion-overlay2 border-notion-border2 text-notion-text4 cursor-not-allowed"
            : "bg-white border-notion-border2 text-notion-text hover:border-notion-text3"
        }`}
      >
        <span className="font-medium truncate">{selected?.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-notion-text3 shrink-0" strokeWidth={1.5} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md bg-white border border-notion-border2 shadow-lg py-1 z-30"
          >
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-sm transition-colors ${
                  o.id === value
                    ? "text-blue-700 bg-blue-50 font-medium"
                    : "text-notion-text2 hover:bg-notion-overlay2"
                }`}
              >
                <span>{o.name}</span>
                {o.id === value && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}