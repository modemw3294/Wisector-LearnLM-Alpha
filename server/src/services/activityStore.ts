import fs from "fs/promises";
import path from "path";
import type { ActivityRecord, ActivityDay, ActivityStore } from "../types/activity";

const DATA_DIR = path.resolve(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "activity.json");

function emptyStore(): ActivityStore {
  return { records: [] };
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function read(): Promise<ActivityStore> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return JSON.parse(raw) as ActivityStore;
  } catch {
    return emptyStore();
  }
}

async function write(store: ActivityStore): Promise<void> {
  await ensureDir();
  await fs.writeFile(FILE, JSON.stringify(store, null, 2), "utf-8");
}

/** 记录一条活动 */
export async function addActivity(
  type: ActivityRecord["type"],
  title?: string
): Promise<void> {
  const store = await read();
  store.records.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp: Date.now(),
    title,
  });
  await write(store);
}

/**
 * 获取最近 N 天的活动聚合（含类型细分与标题）
 * @param days 天数（默认 365）
 */
export async function getActivityDays(days = 365): Promise<ActivityDay[]> {
  const store = await read();
  const cutoff = Date.now() - days * 86400_000;

  // 按日期聚合
  const map = new Map<
    string,
    { count: number; types: ActivityDay["types"]; titles: string[] }
  >();

  for (const r of store.records) {
    if (r.timestamp < cutoff) continue;
    const date = new Date(r.timestamp).toISOString().slice(0, 10);
    const entry =
      map.get(date) || {
        count: 0,
        types: { chat: 0, video: 0, quiz: 0, note: 0 },
        titles: [],
      };
    entry.count += 1;
    entry.types[r.type] += 1;
    if (r.title && entry.titles.length < 5) {
      entry.titles.push(r.title);
    }
    map.set(date, entry);
  }

  // 生成完整日期序列
  const result: ActivityDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const date = d.toISOString().slice(0, 10);
    const entry = map.get(date);
    result.push({
      date,
      count: entry?.count || 0,
      types: entry?.types || { chat: 0, video: 0, quiz: 0, note: 0 },
      titles: entry?.titles || [],
    });
  }
  return result;
}

/** 获取统计数据 */
export async function getStats() {
  const store = await read();
  // 总活动数
  const totalActivities = store.records.length;
  // 对话次数
  const totalChats = store.records.filter((r) => r.type === "chat").length;
  // 笔记数
  const totalNotes = store.records.filter((r) => r.type === "note").length;
  // 测验次数
  const totalQuizzes = store.records.filter((r) => r.type === "quiz").length;
  // 视频数
  const totalVideos = store.records.filter((r) => r.type === "video").length;
  // 持续天数（最早记录至今）
  const timestamps = store.records.map((r) => r.timestamp).sort((a, b) => a - b);
  const streakDays = timestamps.length > 0
    ? Math.ceil((Date.now() - timestamps[0]) / 86400_000)
    : 0;

  return { totalActivities, totalChats, totalNotes, totalQuizzes, totalVideos, streakDays };
}
