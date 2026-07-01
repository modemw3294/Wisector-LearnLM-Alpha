// ============================================================
// 测验 / 考试类型
// ============================================================

/** 测验规格（时长与规模） */
export type QuizSpec = "short" | "medium" | "long";

/** 题型 */
export type QuestionType =
  | "single"     // 单选题
  | "multiple"   // 多选题
  | "blank"      // 填空题
  | "essay"      // 解答题
  | "composition"; // 作文

/** 题目 */
export interface QuizQuestion {
  id: string;
  type: QuestionType;
  /** 题干（支持 Markdown / LaTeX） */
  prompt: string;
  /** 选项（仅选择题） */
  options?: string[];
  /** 正确答案：
   *  - single: 选项索引字符串，如 "B"
   *  - multiple: 选项索引字符串数组，如 ["A","C"]
   *  - blank: 标准答案文本
   *  - essay/composition: 参考答案 / 评分要点
   */
  answer: string | string[];
  /** 分值 */
  score: number;
  /** 解析（可选） */
  explanation?: string;
}

/** 学生作答 */
export interface QuizAnswer {
  questionId: string;
  /** 选择题：选项索引；主观题：文本作答 */
  response: string | string[];
}

/** AI 分析结果 */
export interface QuizAnalysis {
  /** 总分 */
  totalScore: number;
  /** 得分 */
  earnedScore: number;
  /** 每题评分 */
  perQuestion: {
    questionId: string;
    earned: number;
    max: number;
    comment: string;
  }[];
  /** 总体评价 */
  summary: string;
  /** 薄弱知识点 */
  weakPoints: string[];
  /** 改进建议 */
  suggestions: string[];
}

/** 测验记录 */
export interface Quiz {
  id: string;
  /** 标题 */
  title: string;
  /** 学科 */
  subject: string;
  /** 规格 */
  spec: QuizSpec;
  /** 时长（分钟） */
  durationMin: number;
  /** 题目 */
  questions: QuizQuestion[];
  /** 创建时间 */
  createdAt: number;
  /** 状态 */
  status: "draft" | "ready" | "analyzed";
  /** 学生作答（交卷后填充） */
  answers?: QuizAnswer[];
  /** AI 分析结果（交卷后填充） */
  analysis?: QuizAnalysis;
  /** 完成时间 */
  finishedAt?: number;
}

/** 存储格式 */
export interface QuizStore {
  quizzes: Quiz[];
}
