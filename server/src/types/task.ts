// ============================================================
// 任务系统类型
// ============================================================

export type TaskType =
  | "analyze_textbook"
  | "scan_notes"
  | "generate_quiz"
  | "generate_video"
  | "recognize_questions";

export type TaskStatus = "queued" | "running" | "done" | "error";

export interface TaskStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  progress?: number;
}

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  status: TaskStatus;
  steps: TaskStep[];
  /** 关联资源 ID（如课本 ID） */
  resourceId?: string;
  /** 错误信息 */
  error?: string;
  /** 结果摘要 */
  resultSummary?: string;
  createdAt: number;
  finishedAt?: number;
}
