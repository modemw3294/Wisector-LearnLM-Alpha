"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Pencil, Trash2, Check, AlertCircle, MessageSquare, Image as ImageIcon, Mic } from "lucide-react";
import { api } from "@/lib/api";
import {
  ModelConfig,
  ModelConfigInput,
  RequestFormat,
  InputModality,
  Currency,
  PDF_CAPABLE_FORMATS,
} from "@/lib/types";

const FORMAT_OPTIONS: { value: RequestFormat; label: string }[] = [
  { value: "openai-completions", label: "OpenAI Completions" },
  { value: "openai-responses", label: "OpenAI Responses" },
  { value: "anthropic-messages", label: "Anthropic Messages" },
  { value: "gemini", label: "Gemini" },
];

const MODALITY_OPTIONS: { value: InputModality; label: string }[] = [
  { value: "text", label: "文本" },
  { value: "image", label: "图像" },
  { value: "pdf", label: "PDF" },
  { value: "audio", label: "音频" },
];

const CURRENCY_OPTIONS: Currency[] = ["CNY", "USD"];

const DEFAULT_FORM: ModelConfigInput = {
  id: "",
  displayName: "",
  format: "openai-completions",
  endpoint: "https://api.openai.com/v1",
  apiKey: "",
  modelName: "",
  contextWindow: 128000,
  inputModalities: ["text"],
  maxOutput: 4096,
  maxTurns: 10,
  pricing: { input: 0, output: 0, currency: "CNY" },
  headers: {},
  enabled: true,
};

/* ──────────────────────  预设  ────────────────────── */

type ModelCategory = "chat" | "image" | "tts";

interface Preset {
  id: string;
  displayName: string;
  format: RequestFormat;
  endpoint: string;
  modelName?: string;
  contextWindow: number;
  inputModalities: InputModality[];
  maxOutput: number;
}

const CHAT_PRESETS: Preset[] = [
  {
    id: "claude-fable-5",
    displayName: "Claude Fable 5",
    format: "anthropic-messages",
    endpoint: "https://api.anthropic.com/v1",
    modelName: "claude-fable-5",
    contextWindow: 200000,
    inputModalities: ["text", "image", "pdf"],
    maxOutput: 8192,
  },
  {
    id: "claude-opus-4.8",
    displayName: "Claude Opus 4.8",
    format: "anthropic-messages",
    endpoint: "https://api.anthropic.com/v1",
    modelName: "claude-opus-4.8",
    contextWindow: 200000,
    inputModalities: ["text", "image", "pdf"],
    maxOutput: 8192,
  },
  {
    id: "gpt-5.5",
    displayName: "GPT-5.5",
    format: "openai-completions",
    endpoint: "https://api.openai.com/v1",
    modelName: "gpt-5.5",
    contextWindow: 128000,
    inputModalities: ["text", "image"],
    maxOutput: 16384,
  },
  {
    id: "gemini-3.1-pro",
    displayName: "Gemini 3.1 Pro",
    format: "gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    modelName: "gemini-3.1-pro",
    contextWindow: 2000000,
    inputModalities: ["text", "image", "pdf", "audio"],
    maxOutput: 8192,
  },
  {
    id: "deepseek-v4-pro",
    displayName: "Deepseek V4 Pro",
    format: "openai-completions",
    endpoint: "https://api.deepseek.com/v1",
    modelName: "deepseek-v4-pro",
    contextWindow: 128000,
    inputModalities: ["text"],
    maxOutput: 8192,
  },
  {
    id: "qwen-3.7-max",
    displayName: "Qwen 3.7 Max",
    format: "openai-completions",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    modelName: "qwen-3.7-max",
    contextWindow: 128000,
    inputModalities: ["text", "image"],
    maxOutput: 8192,
  },
];

const IMAGE_PRESETS: Preset[] = [
  {
    id: "gpt-image-2",
    displayName: "GPT Image 2",
    format: "openai-completions",
    endpoint: "https://api.openai.com/v1",
    modelName: "gpt-image-2",
    contextWindow: 32000,
    inputModalities: ["text"],
    maxOutput: 4096,
  },
  {
    id: "gemini-3.1-flash-image",
    displayName: "Nano Banana 2",
    format: "gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    modelName: "gemini-3.1-flash-image",
    contextWindow: 32000,
    inputModalities: ["text"],
    maxOutput: 4096,
  },
  {
    id: "seedream-4.0",
    displayName: "Seedream 4",
    format: "openai-completions",
    endpoint: "https://api.seedream.example.com/v1",
    modelName: "seedream-4.0",
    contextWindow: 32000,
    inputModalities: ["text"],
    maxOutput: 4096,
  },
];

const TTS_PRESETS: Preset[] = [
  {
    id: "speech-2.8-hd",
    displayName: "speech-2.8-hd",
    format: "openai-completions",
    endpoint: "https://api.hailuo.ai/v1",
    modelName: "speech-2.8-hd",
    contextWindow: 16000,
    inputModalities: ["text"],
    maxOutput: 4096,
  },
  {
    id: "gemini-3.1-flash-tts-preview",
    displayName: "gemini-3.1-flash-tts-preview",
    format: "gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    modelName: "gemini-3.1-flash-tts-preview",
    contextWindow: 32000,
    inputModalities: ["text"],
    maxOutput: 4096,
  },
];

const CATEGORIES: { id: ModelCategory; label: string; icon: React.FC<{ className?: string; strokeWidth?: number }> }[] = [
  { id: "chat", label: "对话模型", icon: MessageSquare },
  { id: "image", label: "生图模型", icon: ImageIcon },
  { id: "tts", label: "TTS 模型", icon: Mic },
];

function getPresets(category: ModelCategory): Preset[] {
  if (category === "chat") return CHAT_PRESETS;
  if (category === "image") return IMAGE_PRESETS;
  return TTS_PRESETS;
}

interface ModelsPanelProps {
  list: ModelConfig[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium text-notion-text">{label}</span>
        {hint && <span className="text-xs text-notion-text3">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

const inputCls =
  "w-full h-9 px-3 rounded-md bg-white border border-notion-border2 text-sm text-notion-text placeholder:text-notion-text4 focus:outline-none focus:border-notion-text2 transition-colors";

export default function ModelsPanel({ list, loading, error, onRefresh }: ModelsPanelProps) {
  const [category, setCategory] = useState<ModelCategory>("chat");
  const [editing, setEditing] = useState<ModelConfig | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ModelConfigInput>(DEFAULT_FORM);
  const [headersText, setHeadersText] = useState("{}");
  const [headersError, setHeadersError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 按分类筛选模型列表
  const categoryList = list.filter((m) => {
    if (category === "chat") return true; // 对话模型即现有全部（兼容）
    // 生图/TTS 按 id 前缀匹配
    const presets = getPresets(category);
    return presets.some((p) => m.id === p.id);
  });

  useEffect(() => {
    if (creating) {
      setForm(DEFAULT_FORM);
      setHeadersText("{}");
      setHeadersError(null);
    } else if (editing) {
      const { createdAt: _c, updatedAt: _u, ...rest } = editing;
      setForm(rest);
      setHeadersText(JSON.stringify(editing.headers || {}, null, 2));
      setHeadersError(null);
    }
  }, [creating, editing]);

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setFormError(null);
  };

  const openEdit = (m: ModelConfig) => {
    setCreating(false);
    setEditing(m);
    setFormError(null);
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  // 一键填入预设
  const applyPreset = (preset: Preset) => {
    setForm({
      ...DEFAULT_FORM,
      id: preset.id,
      displayName: preset.displayName,
      format: preset.format,
      endpoint: preset.endpoint,
      modelName: preset.modelName,
      contextWindow: preset.contextWindow,
      inputModalities: preset.inputModalities,
      maxOutput: preset.maxOutput,
    });
    setHeadersText("{}");
    setHeadersError(null);
    setFormError(null);
    setEditing(null);
    setCreating(true);
  };

  const submit = async () => {
    setFormError(null);
    setSaving(true);
    try {
      let parsedHeaders: Record<string, string> = {};
      try {
        parsedHeaders = headersText.trim() ? JSON.parse(headersText) : {};
        if (parsedHeaders && typeof parsedHeaders === "object" && !Array.isArray(parsedHeaders)) {
          // 校验值类型为 string
          for (const v of Object.values(parsedHeaders)) {
            if (typeof v !== "string") throw new Error("请求头的值必须是字符串");
          }
        } else {
          throw new Error("请求头必须是 JSON 对象");
        }
      } catch (e) {
        setHeadersError(e instanceof Error ? e.message : "JSON 解析失败");
        setSaving(false);
        return;
      }

      const payload: ModelConfigInput = {
        ...form,
        headers: parsedHeaders,
        id: form.id.trim(),
        displayName: form.displayName.trim(),
        endpoint: form.endpoint.trim(),
        apiKey: form.apiKey,
        modelName: form.modelName?.trim() || undefined,
      };

      if (!payload.id || !payload.displayName || !payload.endpoint || !payload.apiKey) {
        setFormError("请填写所有必填项（请求 ID、显示名称、API 端点、API Key）");
        setSaving(false);
        return;
      }

      if (editing) {
        await api.updateModel(editing.id, payload);
      } else {
        await api.createModel(payload);
      }
      closeForm();
      onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: ModelConfig) => {
    if (!confirm(`确认删除模型「${m.displayName}」？`)) return;
    try {
      await api.deleteModel(m.id);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const toggleModality = (mod: InputModality) => {
    const exists = form.inputModalities.includes(mod);
    setForm({
      ...form,
      inputModalities: exists
        ? form.inputModalities.filter((m) => m !== mod)
        : [...form.inputModalities, mod],
    });
  };

  const showForm = creating || editing;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-notion-text tracking-tight">模型</h2>
          <p className="text-xs text-notion-text3 mt-1">BYOK 模式 · 配置你自己的 API Key 与请求参数</p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-notion-text text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            新增模型
          </button>
        )}
      </div>

      {/* 分类 Tab */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-notion-overlay2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                category === cat.id
                  ? "bg-white text-notion-text shadow-sm"
                  : "text-notion-text3 hover:text-notion-text2"
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 列表 */}
      {!showForm && (
        <div className="space-y-4">
          {/* 预设快速填入 */}
          {categoryList.length === 0 && !loading && (
            <>
              <div className="text-sm font-medium text-notion-text3">
                一键填入预设
              </div>
              <div className="space-y-2">
                {getPresets(category).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="w-full flex items-center gap-3 p-3 rounded-md border border-notion-border2 bg-white hover:border-notion-text3 hover:bg-notion-overlay2 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                      <Plus className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-notion-text tracking-tight">
                        {preset.displayName}
                      </div>
                      <div className="text-xs text-notion-text4 mt-0.5">
                        <code>{preset.id}</code> · {preset.format}
                      </div>
                    </div>
                    <span className="text-xs text-blue-600 font-medium shrink-0">填入</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* 已配置的模型列表 */}
          {categoryList.length > 0 && (
            <div className="space-y-2">
              {loading ? (
                <div className="text-sm text-notion-text3">加载中…</div>
              ) : (
                <>
                  {categoryList.map((m) => {
                    const pdfCapable = PDF_CAPABLE_FORMATS.includes(m.format);
                    return (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-md border border-notion-border2 bg-white flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-notion-text truncate">
                              {m.displayName}
                            </span>
                            {!m.enabled && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-notion-overlay2 text-notion-text3">
                                已禁用
                              </span>
                            )}
                            {pdfCapable && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                                PDF
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-notion-text3 mt-0.5 truncate">
                            <code>{m.id}</code> · {m.format} · {m.contextWindow.toLocaleString()} ctx
                          </div>
                        </div>
                        <button
                          onClick={() => openEdit(m)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors"
                          title="编辑"
                        >
                          <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                        <button
                          onClick={() => remove(m)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-notion-text2 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                    );
                  })}

                  {/* 预设区：即使已有模型也显示可填入的预设 */}
                  {(() => {
                    const configuredIds = new Set(categoryList.map((m) => m.id));
                    const remainingPresets = getPresets(category).filter((p) => !configuredIds.has(p.id));
                    if (remainingPresets.length === 0) return null;
                    return (
                      <div className="pt-2">
                        <div className="text-xs font-medium text-notion-text4 mb-1.5">
                          添加更多预设
                        </div>
                        <div className="space-y-1.5">
                          {remainingPresets.map((preset) => (
                            <button
                              key={preset.id}
                              onClick={() => applyPreset(preset)}
                              className="w-full flex items-center gap-3 p-2.5 rounded-md border border-dashed border-notion-border2 bg-white hover:border-notion-text3 hover:bg-notion-overlay2 transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                                <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-notion-text tracking-tight">
                                  {preset.displayName}
                                </div>
                                <div className="text-xs text-notion-text4">
                                  <code>{preset.id}</code>
                                </div>
                              </div>
                              <span className="text-xs text-blue-600 font-medium shrink-0">填入</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {!loading && categoryList.length === 0 && (
            <div className="pt-2">
              <div className="text-xs text-notion-text4">
                或点击右上角「新增模型」手动配置。
              </div>
            </div>
          )}
        </div>
      )}

      {/* 表单 */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-notion-border">
              <span className="text-sm font-semibold text-notion-text">
                {editing ? "编辑模型" : "新增模型"}
              </span>
              <button
                onClick={closeForm}
                className="w-6 h-6 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="请求 ID" hint="唯一标识，如 claude-sonnet-4.6">
                <input
                  className={inputCls}
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  placeholder="claude-sonnet-4.6"
                  disabled={!!editing}
                />
              </Field>
              <Field label="模型显示名称">
                <input
                  className={inputCls}
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="Claude Sonnet 4.6"
                />
              </Field>
            </div>

            <Field label="请求格式">
              <select
                className={inputCls}
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value as RequestFormat })}
              >
                {FORMAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                    {PDF_CAPABLE_FORMATS.includes(o.value) ? "（支持原生 PDF）" : ""}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="API 端点">
                <input
                  className={inputCls}
                  value={form.endpoint}
                  onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                />
              </Field>
              <Field label="API Key">
                <input
                  className={inputCls}
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder={editing ? "留空则不修改" : "sk-…"}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="实际模型名" hint="缺省时使用请求 ID">
                <input
                  className={inputCls}
                  value={form.modelName || ""}
                  onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                  placeholder="claude-sonnet-4.6-20250514"
                />
              </Field>
              <Field label="上下文窗口" hint="token 数">
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  value={form.contextWindow}
                  onChange={(e) =>
                    setForm({ ...form, contextWindow: Number(e.target.value) || 0 })
                  }
                />
              </Field>
            </div>

            <Field label="输入模态">
              <div className="flex flex-wrap gap-2">
                {MODALITY_OPTIONS.map((o) => {
                  const active = form.inputModalities.includes(o.value);
                  const pdfSupported = PDF_CAPABLE_FORMATS.includes(form.format);
                  const disabled = o.value === "pdf" && !pdfSupported;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleModality(o.value)}
                      className={`h-8 px-3 rounded-md text-xs font-medium transition-colors border ${
                        active
                          ? "bg-notion-text text-white border-notion-text"
                          : disabled
                          ? "bg-notion-overlay text-notion-text4 border-notion-border cursor-not-allowed"
                          : "bg-white text-notion-text2 border-notion-border2 hover:bg-notion-overlay2"
                      }`}
                    >
                      {active && <Check className="w-3 h-3 inline mr-1" strokeWidth={2.5} />}
                      {o.label}
                      {o.value === "pdf" && !pdfSupported && "（当前格式不支持）"}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="最大输出" hint="token 数">
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  value={form.maxOutput}
                  onChange={(e) =>
                    setForm({ ...form, maxOutput: Number(e.target.value) || 0 })
                  }
                />
              </Field>
              <Field label="最大调用轮次">
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  value={form.maxTurns}
                  onChange={(e) => setForm({ ...form, maxTurns: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="输入费用" hint="每百万 token">
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.pricing.input}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pricing: { ...form.pricing, input: Number(e.target.value) || 0 },
                    })
                  }
                />
              </Field>
              <Field label="输出费用" hint="每百万 token">
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.pricing.output}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pricing: { ...form.pricing, output: Number(e.target.value) || 0 },
                    })
                  }
                />
              </Field>
              <Field label="货币">
                <select
                  className={inputCls}
                  value={form.pricing.currency}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pricing: { ...form.pricing, currency: e.target.value as Currency },
                    })
                  }
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="请求头" hint="JSON 对象">
              <textarea
                className={`${inputCls} h-24 py-2 font-mono text-xs`}
                value={headersText}
                onChange={(e) => {
                  setHeadersText(e.target.value);
                  setHeadersError(null);
                }}
                placeholder='{ "X-Custom": "value" }'
              />
              {headersError && (
                <span className="text-xs text-red-600">{headersError}</span>
              )}
            </Field>

            <Field label="启用">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-notion-text2">启用此模型</span>
              </label>
            </Field>

            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={closeForm}
                className="h-8 px-3 rounded-md text-sm font-medium text-notion-text2 hover:bg-notion-overlay2 transition-colors"
              >
                取消
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="h-8 px-4 rounded-md bg-notion-text text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
