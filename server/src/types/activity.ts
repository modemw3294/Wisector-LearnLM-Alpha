// 活动记录类型
export interface ActivityRecord {
  id: string;
  /** 活动类型 */
  type: "chat" | "video" | "quiz" | "note";
  /** 时间戳 ms */
  timestamp: number;
  /** 关联标题（可选） */
  title?: string;
}

// 聚合后按天的活动计数（含类型细分）
export interface ActivityDay {
  date: string; // "2026-06-18"
  count: number;
  /** 各类型活动数 */
  types: {
    chat: number;
    video: number;
    quiz: number;
    note: number;
  };
  /** 当日活动标题列表（最多保留 5 条） */
  titles: string[];
}

// 存储在 json 中的格式
export interface ActivityStore {
  records: ActivityRecord[];
}
