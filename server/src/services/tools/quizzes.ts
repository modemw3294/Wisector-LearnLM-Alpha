import type { ToolDef } from "../../types";
import {
  listQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
} from "../quizStore";
import { addActivity } from "../activityStore";
import type { Quiz, QuizQuestion, QuestionType, QuizSpec } from "../../types/quiz";

/**
 * 测验管理工具：基于持久化 quizStore，支持查看 / 创建 / 编辑 / 删除测验。
 */
const SPEC_VALUES: QuizSpec[] = ["short", "medium", "long"];
const TYPE_VALUES: QuestionType[] = [
  "single",
  "multiple",
  "blank",
  "essay",
  "composition",
];

function summarize(q: Quiz) {
  return {
    id: q.id,
    title: q.title,
    subject: q.subject,
    spec: q.spec,
    durationMin: q.durationMin,
    status: q.status,
    questionCount: q.questions.length,
    createdAt: q.createdAt,
    finishedAt: q.finishedAt,
    score: q.analysis
      ? `${q.analysis.earnedScore}/${q.analysis.totalScore}`
      : undefined,
  };
}

export const quizList: ToolDef = {
  name: "quiz_list",
  description:
    "列出所有已创建的测验/考试，返回每份测验的概要（ID、标题、学科、规格、题量、状态、得分）。",
  icon: "clipboard-list",
  requiresWebAccess: false,
  parameters: { type: "object", properties: {} },
  async execute() {
    const all = await listQuizzes();
    if (all.length === 0) return "暂无测验。";
    return JSON.stringify(all.map(summarize), null, 2);
  },
};

export const quizGet: ToolDef = {
  name: "quiz_get",
  description: "按 ID 读取一份测验的完整内容（题目、选项、答案、解析、作答与分析）。",
  icon: "clipboard-list",
  requiresWebAccess: false,
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "测验 ID" },
    },
    required: ["id"],
  },
  async execute(args) {
    const id = String(args.id || "");
    const quiz = await getQuiz(id);
    if (!quiz) return `未找到测验：${id}`;
    return JSON.stringify(quiz, null, 2);
  },
};

export const quizCreate: ToolDef = {
  name: "quiz_create",
  description:
    "手动创建一份测验。需提供 title、subject、spec（规格）、durationMin（分钟）、questions（题目数组）。spec 可选：short（快闪）/medium（小型）/long（综合）。题型 type 可选：single/multiple/blank/essay/composition。",
  icon: "clipboard-list",
  requiresWebAccess: false,
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "测验标题" },
      subject: { type: "string", description: "学科" },
      spec: { type: "string", enum: SPEC_VALUES, description: "测验规格（short/medium/long）" },
      durationMin: { type: "number", description: "时长（分钟）" },
      questions: {
        type: "array",
        description: "题目数组",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: TYPE_VALUES },
            prompt: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            answer: { description: "字符串或字符串数组" },
            score: { type: "number" },
            explanation: { type: "string" },
          },
        },
      },
    },
    required: ["title", "subject", "spec", "durationMin", "questions"],
  },
  async execute(args) {
    const title = String(args.title || "").trim();
    const subject = String(args.subject || "").trim();
    const spec = String(args.spec || "") as QuizSpec;
    const durationMin = Number(args.durationMin || 0);
    const rawQuestions = Array.isArray(args.questions) ? args.questions : [];

    if (!title || !subject || !durationMin || rawQuestions.length === 0) {
      return "创建失败：title / subject / durationMin / questions 均不能为空。";
    }
    if (!SPEC_VALUES.includes(spec)) {
      return `创建失败：spec 必须是 ${SPEC_VALUES.join("/")} 之一。`;
    }

    const now = Date.now();
    const questions: QuizQuestion[] = rawQuestions.map((q: any, i: number) => ({
      id: `q_${i + 1}`,
      type: (TYPE_VALUES.includes(q.type) ? q.type : "single") as QuestionType,
      prompt: String(q.prompt || ""),
      options: Array.isArray(q.options) ? q.options.map(String) : undefined,
      answer: Array.isArray(q.answer)
        ? q.answer.map(String)
        : String(q.answer ?? ""),
      score: Number(q.score) || 5,
      explanation: q.explanation ? String(q.explanation) : undefined,
    }));

    const quiz: Quiz = {
      id: `quiz_${now}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      subject,
      spec,
      durationMin,
      questions,
      createdAt: now,
      status: "ready",
    };

    await createQuiz(quiz);
    await addActivity("quiz", quiz.title);
    return `测验已创建（ID: ${quiz.id}）：\n${JSON.stringify(summarize(quiz), null, 2)}`;
  },
};

export const quizUpdate: ToolDef = {
  name: "quiz_update",
  description:
    "按 ID 更新测验字段。可更新 title、subject、spec（short/medium/long）、durationMin、questions、status 等。未提供的字段保持不变。",
  icon: "clipboard-list",
  requiresWebAccess: false,
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "测验 ID" },
      title: { type: "string" },
      subject: { type: "string" },
      spec: { type: "string", enum: SPEC_VALUES, description: "测验规格（short/medium/long）" },
      durationMin: { type: "number" },
      questions: {
        type: "array",
        description: "题目数组",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: TYPE_VALUES },
            prompt: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            answer: { description: "字符串或字符串数组" },
            score: { type: "number" },
            explanation: { type: "string" },
          },
        },
      },
      status: { type: "string", enum: ["draft", "ready", "analyzed"] },
    },
    required: ["id"],
  },
  async execute(args) {
    const id = String(args.id || "");
    const patch: Partial<Quiz> = {};
    if (args.title) patch.title = String(args.title);
    if (args.subject) patch.subject = String(args.subject);
    if (args.spec && SPEC_VALUES.includes(args.spec as QuizSpec))
      patch.spec = args.spec as QuizSpec;
    if (args.durationMin) patch.durationMin = Number(args.durationMin);
    if (args.status) patch.status = args.status as Quiz["status"];
    if (Array.isArray(args.questions)) {
      patch.questions = (args.questions as any[]).map((q, i) => ({
        id: q.id || `q_${i + 1}`,
        type: (TYPE_VALUES.includes(q.type) ? q.type : "single") as QuestionType,
        prompt: String(q.prompt || ""),
        options: Array.isArray(q.options) ? q.options.map(String) : undefined,
        answer: Array.isArray(q.answer)
          ? q.answer.map(String)
          : String(q.answer ?? ""),
        score: Number(q.score) || 5,
        explanation: q.explanation ? String(q.explanation) : undefined,
      }));
    }

    const updated = await updateQuiz(id, patch);
    if (!updated) return `未找到测验：${id}`;
    return `测验已更新：\n${JSON.stringify(summarize(updated), null, 2)}`;
  },
};

export const quizDelete: ToolDef = {
  name: "quiz_delete",
  description: "按 ID 删除一份测验。",
  icon: "clipboard-list",
  requiresWebAccess: false,
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "测验 ID" },
    },
    required: ["id"],
  },
  async execute(args) {
    const id = String(args.id || "");
    const ok = await deleteQuiz(id);
    if (!ok) return `未找到测验：${id}`;
    return `测验已删除：${id}`;
  },
};
