// 测验类型（前端）

export type QuizSpec = "short" | "medium" | "long";

export type QuestionType =
  | "single"
  | "multiple"
  | "blank"
  | "essay"
  | "composition";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  answer: string | string[];
  score: number;
  explanation?: string;
}

export interface QuizAnswer {
  questionId: string;
  response: string | string[];
}

export interface QuizAnalysis {
  totalScore: number;
  earnedScore: number;
  perQuestion: {
    questionId: string;
    earned: number;
    max: number;
    comment: string;
  }[];
  summary: string;
  weakPoints: string[];
  suggestions: string[];
}

export interface Quiz {
  id: string;
  title: string;
  subject: string;
  spec: QuizSpec;
  durationMin: number;
  questions: QuizQuestion[];
  createdAt: number;
  status: "draft" | "ready" | "analyzed";
  answers?: QuizAnswer[];
  analysis?: QuizAnalysis;
  finishedAt?: number;
}

export const QUIZ_SPEC_INFO: Record<
  QuizSpec,
  { label: string; durationMin: number; desc: string }
> = {
  short: { label: "快闪测验", durationMin: 5, desc: "5 分钟完成" },
  medium: { label: "小型测验", durationMin: 15, desc: "15 分钟完成" },
  long: { label: "综合测验", durationMin: 30, desc: "30 分钟完成" },
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: "单选题",
  multiple: "多选题",
  blank: "填空题",
  essay: "解答题",
  composition: "作文",
};
