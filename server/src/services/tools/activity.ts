import type { ToolDef } from "../../types";
import { getActivityDays, getStats } from "../activityStore";

/**
 * 学习轨迹工具：查看用户的学习活动历史与统计。
 */

export const activityList: ToolDef = {
  name: "activity_list",
  description:
    "查看用户的学习轨迹（最近 N 天的活动聚合）。返回每天的对话/视频/测验/笔记次数与代表性标题。默认 30 天。",
  icon: "activity",
  requiresWebAccess: false,
  parameters: {
    type: "object",
    properties: {
      days: {
        type: "number",
        description: "查看最近多少天的活动（默认 30，最大 365）",
      },
    },
  },
  async execute(args) {
    const days = Math.min(Math.max(Number(args.days) || 30, 1), 365);
    const days_data = await getActivityDays(days);
    const active = days_data.filter((d) => d.count > 0);
    if (active.length === 0) return `最近 ${days} 天暂无学习活动记录。`;

    return JSON.stringify(
      {
        range: `最近 ${days} 天`,
        activeDays: active.length,
        totalActivities: active.reduce((s, d) => s + d.count, 0),
        byType: active.reduce(
          (acc, d) => {
            acc.chat += d.types.chat;
            acc.video += d.types.video;
            acc.quiz += d.types.quiz;
            acc.note += d.types.note;
            return acc;
          },
          { chat: 0, video: 0, quiz: 0, note: 0 }
        ),
        days: active.map((d) => ({
          date: d.date,
          count: d.count,
          types: d.types,
          titles: d.titles,
        })),
      },
      null,
      2
    );
  },
};

export const activityStats: ToolDef = {
  name: "activity_stats",
  description: "查看学习统计概要：总活动数、对话/笔记/测验/视频次数、持续天数。",
  icon: "activity",
  requiresWebAccess: false,
  parameters: { type: "object", properties: {} },
  async execute() {
    const stats = await getStats();
    return JSON.stringify(stats, null, 2);
  },
};
