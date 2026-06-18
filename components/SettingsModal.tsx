"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserCog, Settings, Bot, Database, Info, ChevronRight } from "lucide-react";
import ModelsPanel from "./ModelsPanel";
import { useModelConfigs } from "@/lib/useModelConfigs";

const settingTabs = [
  { id: "preferences", label: "个人偏好设置", icon: UserCog },
  { id: "general", label: "通用", icon: Settings },
  { id: "models", label: "模型", icon: Bot },
  { id: "data", label: "数据", icon: Database },
  { id: "about", label: "关于", icon: Info },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState("preferences");
  const models = useModelConfigs();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-0 sm:pt-16 pb-0 sm:pb-16 px-0 sm:px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-[900px] h-[100dvh] sm:h-[calc(100vh-128px)] sm:max-h-[640px] bg-white sm:rounded-xl shadow-2xl overflow-y-auto sm:overflow-hidden flex flex-col md:flex-row"
          >
            {/* 左侧灰色导航 */}
            <div className="w-full md:w-[220px] shrink-0 bg-notion-sidebar border-b md:border-b-0 md:border-r border-notion-border flex flex-col md:max-h-none">
              <div className="flex items-center justify-between px-4 py-3 border-b border-notion-border">
                <span className="text-sm font-semibold text-notion-text tracking-tight">设置</span>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={onClose}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={1.75} />
                </motion.button>
              </div>

              {/* 移动端：横向滚动 tab；桌面端：纵向列表 */}
              <nav className="flex md:flex-col gap-0.5 p-2 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden shrink-0">
                {settingTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative h-8 px-2.5 rounded-md flex items-center gap-2.5 text-sm font-medium tracking-tight transition-colors whitespace-nowrap ${
                        isActive
                          ? "text-notion-text bg-notion-overlay"
                          : "text-notion-text2 hover:bg-notion-overlay2"
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* 右侧内容区 */}
            <div className="flex-1 flex flex-col bg-white min-w-0 sm:min-h-0">
              <div className="flex-1 sm:overflow-y-auto p-5 md:p-8"
                >
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-full sm:max-w-[560px]"
                  >
                  {activeTab === "preferences" && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold text-notion-text tracking-tight">个人偏好设置</h2>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-notion-text">界面主题</span>
                          <span className="text-sm text-notion-text2">浅色</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-notion-text">语言</span>
                          <span className="text-sm text-notion-text2">简体中文</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-notion-text">字体大小</span>
                          <span className="text-sm text-notion-text2">标准</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "general" && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold text-notion-text tracking-tight">通用</h2>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-notion-text">自动保存对话</span>
                          <span className="text-sm text-notion-text2">开启</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-notion-text">启动时打开新对话</span>
                          <span className="text-sm text-notion-text2">关闭</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-notion-text">快捷键</span>
                          <span className="text-sm text-notion-text2">默认</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "models" && (
                    <ModelsPanel
                      list={models.models}
                      loading={models.loading}
                      error={models.error}
                      onRefresh={models.refresh}
                    />
                  )}

                  {activeTab === "data" && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold text-notion-text tracking-tight">数据</h2>
                      <div className="space-y-3">
                        {/* 数据管理入口卡片 */}
                        <a
                          href="/data"
                          className="flex items-center gap-3 p-3 rounded-md border border-notion-border2 hover:border-notion-text3 hover:bg-notion-overlay2 transition-colors group"
                        >
                          <div className="w-9 h-9 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                            <Database className="w-4 h-4" strokeWidth={1.75} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-notion-text">
                              数据管理
                            </div>
                            <div className="text-xs text-notion-text3 mt-0.5">
                              管理你上传的课本与题目
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-notion-text4 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.75} />
                        </a>

                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-notion-text">导出对话记录</span>
                          <span className="text-sm text-notion-text2">JSON / Markdown</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-notion-text">清除本地缓存</span>
                          <span className="text-sm text-notion-text2">立即清除</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-notion-text">数据同步</span>
                          <span className="text-sm text-notion-text2">本地优先</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "about" && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold text-notion-text tracking-tight">关于</h2>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-notion-text">版本</span>
                          <span className="text-sm text-notion-text2">Wisector LearnLM v0.1.0</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-notion-text">构建版本</span>
                          <span className="text-sm text-notion-text2">MVP</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-notion-text">许可证</span>
                          <span className="text-sm text-notion-text2">私有</span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
