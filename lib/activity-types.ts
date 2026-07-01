// 活动类型（前端）

export interface ActivityDayTypes {
  chat: number;
  video: number;
  quiz: number;
  note: number;
}

export interface ActivityDay {
  date: string;
  count: number;
  types: ActivityDayTypes;
  titles: string[];
}
