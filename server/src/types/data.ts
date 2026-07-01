// ============================================================
// 数据管理类型（课本 + 题目合集 + 题目）
// ============================================================

export type QuestionType = "选择题" | "填空题" | "解答题" | "判断题";
export type Difficulty = "简单" | "中等" | "困难";

/** 课本分析状态 */
export type TextbookStatus = "analyzing" | "ready" | "error";

/** 目录条目 */
export interface CatalogEntry {
  title: string;
  page?: number;
  children?: CatalogEntry[];
}

export interface Textbook {
  id: string;
  name: string;
  subject: string;
  grade: string;
  chapters: number;
  uploadedAt: string;
  /** 分析状态 */
  status?: TextbookStatus;
  /** 目录 */
  catalog?: CatalogEntry[];
  /** 大纲（Markdown） */
  outline?: string;
  /** 关联任务 ID */
  taskId?: string;
  /** 原始文件名 */
  sourceFile?: string;
}

export interface Collection {
  id: string;
  name: string;
  sourceFile: string;
  subject: string;
  questionCount: number;
  uploadedAt: string;
}

export interface Question {
  id: string;
  title: string;
  subject: string;
  type: QuestionType;
  difficulty: Difficulty;
  answer?: string;
  collectionId?: string;
  updatedAt: string;
}

export interface DataStore {
  textbooks: Textbook[];
  collections: Collection[];
  questions: Question[];
}
