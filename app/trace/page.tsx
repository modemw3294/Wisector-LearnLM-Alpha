"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  MessageSquare,
  Notebook,
  TrendingUp,
  Calendar,
  Menu,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import SettingsModal from "@/components/SettingsModal";
import { api } from "@/lib/api";
import type { ActivityDay } from "@/lib/activity-types";

interface StatsData {
  totalActivities: number;
  totalChats: number;
  totalNotes: number;
  totalQuizzes: number;
  totalVideos: number;
  streakDays: number;
}

// 标准贡献颜色（5 级）—— 使用重点色 + 不同透明度
const LEVEL_COLORS = [
  "bg-notion-overlay2", // 0
  "accent-level-1", // 1-3
  "accent-level-2", // 4-7
  "accent-level-3", // 8-15
  "accent-level-4", // 16+
];

/** 根据级别返回内联样式（使用 --accent CSS 变量 + 透明度） */
function getLevelStyle(level: number): React.CSSProperties {
  if (level === 0) return {};
  const opacities = [0, 0.25, 0.5, 0.75, 1];
  return { backgroundColor: "var(--accent)", opacity: opacities[level] };
}

const TYPE_LABELS: Record<string, string> = {
  chat: "对话",
  video: "视频",
  quiz: "测验",
  note: "笔记",
};

const TYPE_COLORS: Record<string, string> = {
  chat: "text-accent",
  video: "text-purple-600",
  quiz: "text-amber-600",
  note: "text-green-600",
};

function getLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 7) return 2;
  if (count <= 15) return 3;
  return 4;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}月${day}日`;
}

function getRelativeLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date(today.getTime() - 86400_000);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return "今天";
  if (isYesterday) return "昨天";
  return formatDate(dateStr);
}

export default function TracePage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [days, setDays] = useState<ActivityDay[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // 悬停/点击的小窗
  const [hoveredDay, setHoveredDay] = useState<ActivityDay | null>(null);
  const [pinnedDay, setPinnedDay] = useState<ActivityDay | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getActivity();
      setDays(data.days || []);
      setStats(data.stats || null);
    } catch {
      setDays([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  // 按周分组（用于纵向排列）
  const weeks: ActivityDay[][] = [];
  let currentWeek: ActivityDay[] = [];
  for (const day of days) {
    const dow = new Date(day.date).getDay();
    if (dow === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const total = stats?.totalActivities ?? 0;
  const streak = stats?.streakDays ?? 0;

  const activeDay = pinnedDay || hoveredDay;

  const handleCellEnter = (day: ActivityDay, e: React.MouseEvent) => {
    if (pinnedDay) return;
    setHoveredDay(day);
    updateTooltipPos(e);
  };

  const handleCellClick = (day: ActivityDay, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pinnedDay?.date === day.date) {
      setPinnedDay(null);
    } else {
      setPinnedDay(day);
      setHoveredDay(null);
    }
    updateTooltipPos(e);
  };

  const updateTooltipPos = (e: React.MouseEvent) => {
    const grid = gridRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTooltipPos({ x, y });
  };

  // 点击空白处取消固定
  useEffect(() => {
    if (!pinnedDay) return;
    const handler = () => setPinnedDay(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [pinnedDay]);

  return (
    <main className="flex h-screen bg-notion-bg overflow-hidden">
      <Sidebar
        onOpenSettings={() => setIsSettingsOpen(true)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        activeTab="trace"
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-8 border-b border-notion-border bg-white/60 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden w-8 h-8 rounded-md flex items-center justify-center text-notion-text2 hover:bg-notion-overlay2 transition-colors"
              aria-label="打开侧边栏"
            >
              <Menu className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <LineChart className="w-4 h-4 text-accent" strokeWidth={1.75} />
            <span className="text-sm font-semibold text-notion-text tracking-tight">学习轨迹</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-[960px] mx-auto space-y-8">
            {/* 统计数据卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "总活动数", value: total, icon: TrendingUp },
                { label: "总对话", value: stats?.totalChats ?? 0, icon: MessageSquare },
                { label: "笔记", value: stats?.totalNotes ?? 0, icon: Notebook },
                { label: "持续天数", value: streak, icon: Calendar },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl border border-notion-border2 bg-white"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-7 h-7 rounded-md bg-accent-light/60 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} />
                      </div>
                      <span className="text-xs text-notion-text3">{item.label}</span>
                    </div>
                    <div className="text-2xl font-bold text-notion-text tabular-nums">
                      {item.value.toLocaleString()}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* 紧凑式贡献热力图 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-5 rounded-xl border border-notion-border2 bg-white"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-semibold text-notion-text">
                  {new Date().getFullYear()} 年学习活跃度
                </span>
                <span className="text-[11px] text-notion-text4">
                  {total > 0 ? `${total} 次活动 · 持续 ${streak} 天` : "暂无数据"}
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-32 text-xs text-notion-text4">
                  加载中…
                </div>
              ) : days.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-xs text-notion-text4">
                  还没有学习活动记录
                </div>
              ) : (
                <div
                  ref={gridRef}
                  className="relative overflow-x-auto pb-2"
                  onMouseLeave={() => { if (!pinnedDay) setHoveredDay(null); }}
                >
                  {/* 紧凑方块网格：无月份/星期标签 */}
                  <div className="flex gap-[2px] w-fit">
                    {weeks.map((week, wi) => (
                      <div key={wi} className="flex flex-col gap-[2px]">
                        {week.map((day) => {
                          const level = getLevel(day.count);
                          const isActive = activeDay?.date === day.date;
                          return (
                            <div
                              key={day.date}
                              onMouseEnter={(e) => handleCellEnter(day, e)}
                              onClick={(e) => handleCellClick(day, e)}
                              style={getLevelStyle(level)}
                              className={`w-[11px] h-[11px] rounded-[2px] ${level === 0 ? LEVEL_COLORS[0] : ""} cursor-pointer transition-all ${
                                isActive ? "ring-1 ring-notion-text2 ring-offset-[1px]" : ""
                              } hover:ring-1 hover:ring-notion-text3`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* 图例 */}
                  <div className="flex items-center gap-1.5 mt-3">
                    <span className="text-[10px] text-notion-text4">少</span>
                    {LEVEL_COLORS.map((c, i) => (
                      <div
                        key={i}
                        style={getLevelStyle(i)}
                        className={`w-[11px] h-[11px] rounded-[2px] ${i === 0 ? c : ""}`}
                      />
                    ))}
                    <span className="text-[10px] text-notion-text4">多</span>
                    <span className="text-[10px] text-notion-text4 ml-2">
                      · 悬停或点击查看详情
                    </span>
                  </div>

                  {/* 悬停/点击小窗 */}
                  <AnimatePresence>
                    {activeDay && tooltipPos && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.12 }}
                        className="absolute z-20 pointer-events-none"
                        style={{
                          left: Math.min(tooltipPos.x + 12, (gridRef.current?.clientWidth || 800) - 200),
                          top: Math.max(tooltipPos.y - 10, 0),
                        }}
                      >
                        <div className="w-52 rounded-lg bg-notion-text text-white shadow-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold">
                              {getRelativeLabel(activeDay.date)}
                            </span>
                            <span className="text-[10px] text-white/60">
                              {activeDay.count > 0 ? `${activeDay.count} 次活动` : "无活动"}
                            </span>
                          </div>
                          {activeDay.count > 0 ? (
                            <>
                              {/* 类型细分 */}
                              <div className="space-y-1 mb-2">
                                {(["chat", "video", "quiz", "note"] as const).map((t) => {
                                  const n = activeDay.types[t];
                                  if (n === 0) return null;
                                  return (
                                    <div key={t} className="flex items-center justify-between text-[11px]">
                                      <span className="text-white/80">{TYPE_LABELS[t]}</span>
                                      <span className="font-medium tabular-nums">{n}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {/* 标题列表 */}
                              {activeDay.titles.length > 0 && (
                                <div className="pt-2 border-t border-white/15 space-y-0.5">
                                  {activeDay.titles.slice(0, 4).map((title, i) => (
                                    <div key={i} className="text-[10px] text-white/70 truncate">
                                      · {title}
                                    </div>
                                  ))}
                                  {activeDay.titles.length > 4 && (
                                    <div className="text-[10px] text-white/50">
                                      还有 {activeDay.titles.length - 4} 条…
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-[11px] text-white/60">
                              这一天没有学习活动
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>

            {/* 最近活动列表 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-xl border border-notion-border2 bg-white"
            >
              <div className="text-sm font-semibold text-notion-text mb-3">最近活动</div>
              {days.length === 0 ? (
                <div className="text-xs text-notion-text4 py-6 text-center">
                  暂无活动数据。开始对话或创建笔记后，活动将被记录。
                </div>
              ) : (
                <div className="space-y-0.5">
                  {days
                    .filter((d) => d.count > 0)
                    .slice(-10)
                    .reverse()
                    .map((day) => (
                      <div
                        key={day.date}
                        className="flex items-center justify-between py-1.5 px-1.5 -mx-1.5 rounded-md border-b border-notion-border last:border-b-0 hover:bg-notion-overlay2 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-notion-text">{getRelativeLabel(day.date)}</span>
                          {/* 类型小标签 */}
                          <div className="flex items-center gap-1">
                            {(["chat", "video", "quiz", "note"] as const).map((t) => {
                              const n = day.types[t];
                              if (n === 0) return null;
                              return (
                                <span
                                  key={t}
                                  className={`text-[10px] px-1.5 py-0.5 rounded bg-notion-overlay2 ${TYPE_COLORS[t]}`}
                                >
                                  {TYPE_LABELS[t]} {n}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <span className="text-xs text-notion-text4">
                          {day.count} 次
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </main>
  );
}
