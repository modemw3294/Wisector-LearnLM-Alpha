"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ScanLine, Loader2, Check, Upload, Image as ImageIcon } from "lucide-react";
import { api, ScanNoteResult } from "@/lib/api";
import ModelSelector from "./ModelSelector";
import { useModelConfigs } from "@/lib/useModelConfigs";

interface ScanNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (markdown: string) => void;
}

const MODES = [
  { value: "auto" as const, label: "自动识别", desc: "AI 自动选择最合适的结构" },
  { value: "outline" as const, label: "大纲", desc: "层次化标题与列表" },
  { value: "summary" as const, label: "摘要", desc: "要点总结" },
  { value: "flashcard" as const, label: "问答卡", desc: "Q&A 形式" },
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function ScanNoteModal({ isOpen, onClose, onApply }: ScanNoteModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>("");
  const [imageType, setImageType] = useState<string>("");
  const [mode, setMode] = useState<"auto" | "outline" | "summary" | "flashcard">("auto");
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanNoteResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { models: configuredModels } = useModelConfigs();
  // 仅显示支持图片的已启用模型
  const visionModels = configuredModels.filter(
    (m) => m.enabled && m.inputModalities?.includes("image")
  );

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("请上传图片文件（PNG、JPEG、WebP 等）");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("图片大小不能超过 20MB");
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // dataUrl 格式: "data:image/png;base64,xxxx"
      const [header, base64] = dataUrl.split(",");
      const mimeType = header.split(":")[1].split(";")[0];
      setImagePreview(dataUrl);
      setImageBase64(base64);
      setImageType(mimeType);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) processFile(file);
          return;
        }
      }
    },
    [processFile]
  );

  const handleScan = async () => {
    if (!imageBase64 || !imageType) return;
    if (!selectedModelId) {
      setError("请先选择支持多模态的模型");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.scanNote({
        imageBase64,
        imageType,
        model: selectedModelId,
        mode,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result?.markdown) {
      onApply(result.markdown);
      handleClose();
    }
  };

  const handleClose = () => {
    setImagePreview(null);
    setImageBase64("");
    setImageType("");
    setResult(null);
    setError(null);
    setMode("auto");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            onPaste={handlePaste}
            className="w-full max-w-[680px] max-h-[85vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden"
          >
            {/* 头部 */}
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-notion-border">
              <ScanLine className="w-5 h-5 text-accent" strokeWidth={1.75} />
              <span className="text-base font-semibold text-notion-text tracking-tight flex-1">
                扫描笔记
              </span>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {!result ? (
                <>
                  {/* 模型选择 */}
                  <div>
                    <label className="text-xs text-notion-text3 mb-1.5 block">
                      使用模型（支持多模态）
                    </label>
                    <ModelSelector
                      models={visionModels}
                      selectedId={selectedModelId}
                      onSelect={setSelectedModelId}
                    />
                  </div>

                  {/* 扫描模式 */}
                  <div>
                    <label className="text-xs text-notion-text3 mb-1.5 block">
                      扫描模式
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {MODES.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => setMode(m.value)}
                          className={`p-2.5 rounded-md text-left border transition-colors ${
                            mode === m.value
                              ? "border-accent-ring bg-accent-light/50"
                              : "border-notion-border2 hover:bg-notion-overlay2"
                          }`}
                        >
                          <div className="text-sm font-medium text-notion-text">
                            {m.label}
                          </div>
                          <div className="text-[11px] text-notion-text4 mt-0.5">
                            {m.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 图片上传区域 */}
                  <div>
                    <label className="text-xs text-notion-text3 mb-1.5 block">
                      上传笔记图片
                    </label>

                    {imagePreview ? (
                      <div className="relative rounded-md overflow-hidden border border-notion-border2">
                        <img
                          src={imagePreview}
                          alt="笔记预览"
                          className="w-full max-h-[300px] object-contain bg-notion-overlay2"
                        />
                        <button
                          onClick={() => {
                            setImagePreview(null);
                            setImageBase64("");
                            setImageType("");
                          }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-md bg-white/80 hover:bg-white flex items-center justify-center text-notion-text2 transition-colors shadow-sm"
                        >
                          <X className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative flex flex-col items-center justify-center gap-2 p-8 rounded-md border-2 border-dashed cursor-pointer transition-colors ${
                          dragOver
                            ? "border-accent-ring bg-accent-light/50"
                            : "border-notion-border2 hover:border-notion-text3 hover:bg-notion-overlay"
                        }`}
                      >
                        {dragOver ? (
                          <ImageIcon className="w-10 h-10 text-accent" strokeWidth={1.5} />
                        ) : (
                          <Upload className="w-10 h-10 text-notion-text4" strokeWidth={1.5} />
                        )}
                        <div className="text-center">
                          <p className="text-sm font-medium text-notion-text2">
                            {dragOver ? "松开以添加图片" : "点击上传或拖拽图片到此处"}
                          </p>
                          <p className="text-[11px] text-notion-text4 mt-0.5">
                            支持粘贴剪贴板中的图片 · PNG/JPEG/WebP · 最大 20MB
                          </p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="p-2.5 rounded-md bg-red-50 text-red-600 text-xs">
                      {error}
                    </div>
                  )}
                </>
              ) : (
                /* 扫描结果 */
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                    <Check className="w-4 h-4" strokeWidth={2} />
                    扫描完成，已格式化为 Markdown
                  </div>
                  <pre className="p-3 rounded-md bg-notion-overlay2 text-xs text-notion-text2 font-mono whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                    {result.markdown}
                  </pre>
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-notion-border">
              {!result ? (
                <>
                  <button
                    onClick={handleClose}
                    className="h-8 px-3 rounded-md text-sm font-medium text-notion-text2 hover:bg-notion-overlay2 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleScan}
                    disabled={loading || !imageBase64 || !selectedModelId}
                    className="h-8 px-4 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
                        扫描中…
                      </>
                    ) : (
                      <>
                        <ScanLine className="w-3.5 h-3.5" strokeWidth={2} />
                        开始扫描
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setResult(null)}
                    className="h-8 px-3 rounded-md text-sm font-medium text-notion-text2 hover:bg-notion-overlay2 transition-colors"
                  >
                    重新扫描
                  </button>
                  <button
                    onClick={handleApply}
                    className="h-8 px-4 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-colors"
                  >
                    应用到笔记
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}