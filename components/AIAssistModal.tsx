"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2, Check } from "lucide-react";
import { api } from "@/lib/api";
import ModelSelector from "./ModelSelector";
import MarkdownRenderer from "./MarkdownRenderer";
import { useModelConfigs } from "@/lib/useModelConfigs";

interface AIAssistModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  onApply: (result: string) => void;
}

export default function AIAssistModal({ isOpen, onClose, prompt, onApply }: AIAssistModalProps) {
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const { models: configuredModels } = useModelConfigs();

  const handleRun = async () => {
    if (!selectedModelId) {
      setError("请先选择模型");
      return;
    }
    setLoading(true);
    setError(null);
    setResult("");
    try {
      const res = await api.chat({
        message: prompt,
        model: selectedModelId,
      });
      setResult(res.reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult("");
    setError(null);
    onClose();
  };

  const handleApply = () => {
    onApply(result);
    handleClose();
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
            className="w-full max-w-[680px] max-h-[85vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden"
          >
            {/* 头部 */}
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-notion-border">
              <Sparkles className="w-5 h-5 text-violet-600" strokeWidth={1.75} />
              <span className="text-base font-semibold text-notion-text tracking-tight flex-1">
                AI 辅助
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
              {/* 模型选择 */}
              <div>
                <label className="text-xs text-notion-text3 mb-1.5 block">
                  使用模型
                </label>
                <ModelSelector
                  models={configuredModels}
                  selectedId={selectedModelId}
                  onSelect={setSelectedModelId}
                />
              </div>

              {/* 提示词预览 */}
              <div>
                <label className="text-xs text-notion-text3 mb-1.5 block">
                  任务
                </label>
                <div className="p-3 rounded-md bg-notion-overlay2 text-sm text-notion-text2 whitespace-pre-wrap max-h-[120px] overflow-y-auto">
                  {prompt}
                </div>
              </div>

              {/* 结果 */}
              {(result || loading) && (
                <div>
                  <label className="text-xs text-notion-text3 mb-1.5 block">
                    AI 结果
                  </label>
                  <div className="p-3 rounded-md border border-notion-border2 bg-white max-h-[300px] overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center gap-2 text-sm text-notion-text3">
                        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                        AI 思考中…
                      </div>
                    ) : (
                      <MarkdownRenderer>{result}</MarkdownRenderer>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-2.5 rounded-md bg-red-50 text-red-600 text-xs">
                  {error}
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-notion-border">
              <button
                onClick={handleClose}
                className="h-8 px-3 rounded-md text-sm font-medium text-notion-text2 hover:bg-notion-overlay2 transition-colors"
              >
                关闭
              </button>
              {result && !loading && (
                <button
                  onClick={handleApply}
                  className="h-8 px-4 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-colors inline-flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={2} />
                  插入到笔记
                </button>
              )}
              {!result && (
                <button
                  onClick={handleRun}
                  disabled={loading || !selectedModelId}
                  className="h-8 px-4 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
                      执行中…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                      执行
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}