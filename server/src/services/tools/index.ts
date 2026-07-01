import type { ToolDef } from "../../types";
import { webSearch } from "./webSearch";
import { webFetch } from "./webFetch";
import { dbRead, dbWrite, dbDelete } from "./database";
import {
  noteList,
  noteCreate,
  noteRead,
  noteUpdate,
  noteDelete,
} from "./notes";
import {
  quizList,
  quizGet,
  quizCreate,
  quizUpdate,
  quizDelete,
} from "./quizzes";
import {
  videoList,
  videoGet,
  videoCreate,
  videoUpdate,
  videoDelete,
} from "./videos";
import { activityList, activityStats } from "./activity";

/** 所有可用工具按名称索引 */
export const TOOLS: Record<string, ToolDef> = {
  web_search: webSearch,
  web_fetch: webFetch,
  db_read: dbRead,
  db_write: dbWrite,
  db_delete: dbDelete,
  note_list: noteList,
  note_create: noteCreate,
  note_read: noteRead,
  note_update: noteUpdate,
  note_delete: noteDelete,
  quiz_list: quizList,
  quiz_get: quizGet,
  quiz_create: quizCreate,
  quiz_update: quizUpdate,
  quiz_delete: quizDelete,
  video_list: videoList,
  video_get: videoGet,
  video_create: videoCreate,
  video_update: videoUpdate,
  video_delete: videoDelete,
  activity_list: activityList,
  activity_stats: activityStats,
};

/** 获取工具 OpenAI 兼容的 function 定义 */
export function getToolDefinitions(webAccess: boolean) {
  const defs = Object.values(TOOLS).filter(
    (t) => !t.requiresWebAccess || webAccess
  );
  return defs.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

/** 获取工具名称对应的中文描述 */
export function getToolMeta(name: string) {
  const tool = TOOLS[name];
  if (!tool) return { icon: "wrench", label: "未知工具" };
  const labels: Record<string, string> = {
    web_search: "网页搜索",
    web_fetch: "网页抓取",
    db_read: "数据库读取",
    db_write: "数据库写入",
    db_delete: "数据库删除",
    note_list: "笔记列表",
    note_create: "创建笔记",
    note_read: "读取笔记",
    note_update: "更新笔记",
    note_delete: "删除笔记",
    quiz_list: "测验列表",
    quiz_get: "读取测验",
    quiz_create: "创建测验",
    quiz_update: "更新测验",
    quiz_delete: "删除测验",
    video_list: "视频列表",
    video_get: "读取视频",
    video_create: "创建视频",
    video_update: "更新视频",
    video_delete: "删除视频",
    activity_list: "学习轨迹",
    activity_stats: "学习统计",
  };
  return {
    icon: tool.icon,
    label: labels[name] || name,
  };
}
