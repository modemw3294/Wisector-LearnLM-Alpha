import { Router } from "express";
import { z } from "zod";
import {
  listQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
} from "../services/quizStore";
import { chatWithAI } from "../services/ai";
import { listModels } from "../services/modelStore";
import { addActivity } from "../services/activityStore";
import { listTextbooks, listQuestions } from "../services/dataStore";
import type { Quiz, QuizQuestion, QuestionType, QuizSpec } from "../types/quiz";

const router = Router();

/** 时长 → 题量 + 标签 */
const SPEC_CONFIG: Record<
  QuizSpec,
  { durationMin: number; label: string; total: number }
> = {
  short:  { durationMin: 5,  label: "快闪测验", total: 5 },
  medium: { durationMin: 15, label: "小型测验", total: 10 },
  long:   { durationMin: 30, label: "综合测验", total: 20 },
};

const TYPE_LABELS: Record<QuestionType, string> = {
  single: "单选题",
  multiple: "多选题",
  blank: "填空题",
  essay: "解答题",
  composition: "作文",
};

const generateSchema = z.object({
  subject: z.string().min(1).max(50),
  duration: z.enum(["short", "medium", "long"]),
  topic: z.string().max(500).optional(),
  model: z.string().min(1),
  /** 难度：1 简单 ~ 5 困难 */
  difficulty: z.number().int().min(1).max(5).optional(),
  sourceType: z.enum(["textbook", "textbook-questions"]).optional(),
  sourceLabel: z.string().max(200).optional(),
  sourceIds: z.array(z.string()).optional(),
});

const submitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      response: z.union([z.string(), z.array(z.string())]),
    })
  ),
  model: z.string().min(1),
});

/** GET /api/quiz — 列出全部测验 */
router.get("/", async (_req, res) => {
  const all = await listQuizzes();
  res.json(all);
});

/** GET /api/quiz/:id */
router.get("/:id", async (req, res) => {
  const quiz = await getQuiz(req.params.id);
  if (!quiz) return res.status(404).json({ error: "Not found" });
  res.json(quiz);
});

/** POST /api/quiz/generate — AI 生成测验 */
router.post("/generate", async (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.format() });
  }
  const {
    subject,
    duration,
    topic,
    model,
    difficulty = 3,
    sourceType,
    sourceIds,
  } = parsed.data;

  // 校验模型
  const models = await listModels();
  const modelConfig = models.find((m) => m.id === model && m.enabled);
  if (!modelConfig) {
    return res.status(400).json({ error: `模型「${model}」未配置或未启用` });
  }

  const cfg = SPEC_CONFIG[duration];
  const difficultyText = ["", "简单", "偏易", "中等", "偏难", "困难"][difficulty];

  // 组装来源上下文
  let sourceContext = "";
  if (sourceType && sourceIds && sourceIds.length > 0) {
    const [textbooks, questions] = await Promise.all([
      listTextbooks(),
      listQuestions(),
    ]);
    const textbookId = sourceIds[0];
    const textbook = textbooks.find((t) => t.id === textbookId);
    if (textbook) {
      const selectedQuestions =
        sourceType === "textbook-questions"
          ? questions.filter((q) => sourceIds.includes(q.id))
          : [];
      const lines = [
        `来源课本：《${textbook.name}》`,
        `课本学科：${textbook.subject}`,
        `课本年级：${textbook.grade}`,
        `课本章节数：${textbook.chapters}`,
      ];
      if (selectedQuestions.length > 0) {
        lines.push("关联题目：");
        selectedQuestions.forEach((q, i) => {
          lines.push(
            `${i + 1}. [${q.type} · ${q.difficulty}] ${q.title}${
              q.answer ? `（答案：${q.answer}）` : ""
            }`
          );
        });
      }
      sourceContext = lines.join("\n");
    }
  }

  const prompt = [
    `你是一位专业的${subject}教师，请生成一份「${cfg.label}」测验。`,
    `学科：${subject}`,
    topic ? `考查范围：${topic}` : `考查范围：${subject}通用知识点`,
    `难度等级：${difficultyText}`,
    `总时长：${cfg.durationMin} 分钟`,
    `题目总数：约 ${cfg.total} 道`,
    sourceContext || "",
    "",
    "要求：",
    "1. 题型由你根据学科特点、考查范围和来源内容自动决定，可包含单选题、多选题、填空题、解答题、作文等，不要局限于固定分布",
    "2. 每道题必须有明确的标准答案",
    "3. 单选题给出 4 个选项（A/B/C/D），答案为单个字母",
    "4. 多选题给出 4 个选项（A/B/C/D），答案为选项字母数组",
    "5. 填空题用 ____ 标出空位",
    "6. 解答题和作文给出参考答案 / 评分要点",
    "7. 数学公式用 LaTeX：行内 $...$，块级 $$...$$",
    "8. **必须输出合法 JSON**，不要任何额外文字",
    "",
    "输出格式（JSON）：",
    "```json",
    "{",
    '  "title": "测验标题",',
    '  "questions": [',
    "    {",
    '      "type": "single",',
    '      "prompt": "题干文本",',
    '      "options": ["选项A", "选项B", "选项C", "选项D"],',
    '      "answer": "B",',
    '      "score": 5,',
    '      "explanation": "解析（可选）"',
    "    },",
    "    {",
    '      "type": "multiple",',
    '      "prompt": "题干文本",',
    '      "options": ["A","B","C","D"],',
    '      "answer": ["A","C"],',
    '      "score": 8',
    "    },",
    "    {",
    '      "type": "blank",',
    '      "prompt": "填空题，用 ____ 标出空位",',
    '      "answer": "标准答案",',
    '      "score": 4',
    "    },",
    "    {",
    '      "type": "essay",',
    '      "prompt": "解答题题干",',
    '      "answer": "参考答案 / 评分要点",',
    '      "score": 10',
    "    },",
    "    {",
    '      "type": "composition",',
    '      "prompt": "作文题目",',
    '      "answer": "评分要点",',
    '      "score": 20',
    "    }",
    "  ]",
    "}",
    "```",
  ].join("\n");

  try {
    const result = await chatWithAI(prompt, model);
    const jsonStr = extractJson(result.reply);
    if (!jsonStr) {
      return res.status(500).json({ error: "AI 返回内容无法解析为 JSON", raw: result.reply.slice(0, 500) });
    }

    let parsed2: { title?: string; questions?: any[] };
    try {
      parsed2 = JSON.parse(jsonStr);
    } catch {
      return res.status(500).json({ error: "AI 返回的 JSON 格式错误", raw: result.reply.slice(0, 500) });
    }

    if (!parsed2.questions || !Array.isArray(parsed2.questions) || parsed2.questions.length === 0) {
      return res.status(500).json({ error: "AI 未生成有效题目" });
    }

    // 构造 Quiz 对象
    const now = Date.now();
    const quiz: Quiz = {
      id: `quiz_${now}_${Math.random().toString(36).slice(2, 8)}`,
      title: parsed2.title || `${subject} · ${cfg.label}`,
      subject,
      spec: duration,
      durationMin: cfg.durationMin,
      questions: parsed2.questions.map((q, i): QuizQuestion => ({
        id: `q_${i + 1}`,
        type: (q.type as QuestionType) || "single",
        prompt: String(q.prompt || ""),
        options: Array.isArray(q.options) ? q.options.map(String) : undefined,
        answer: Array.isArray(q.answer) ? q.answer.map(String) : String(q.answer ?? ""),
        score: Number(q.score) || 5,
        explanation: q.explanation ? String(q.explanation) : undefined,
      })),
      createdAt: now,
      status: "ready",
    };

    await createQuiz(quiz);
    await addActivity("quiz", quiz.title);

    res.json(quiz);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `AI 出题失败：${msg}` });
  }
});

/** POST /api/quiz — 手动创建测验 */
router.post("/", async (req, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200),
    subject: z.string().min(1).max(50),
    spec: z.enum(["short", "medium", "long"]),
    durationMin: z.number().int().positive(),
    questions: z.array(z.any()),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.format() });
  }
  const now = Date.now();
  const quiz: Quiz = {
    id: `quiz_${now}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    status: "ready",
    ...parsed.data,
  } as Quiz;
  await createQuiz(quiz);
  res.status(201).json(quiz);
});

/** POST /api/quiz/:id/submit — 交卷并 AI 阅卷分析 */
router.post("/:id/submit", async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.format() });
  }
  const quiz = await getQuiz(req.params.id);
  if (!quiz) return res.status(404).json({ error: "Not found" });

  const { answers, model } = parsed.data;

  // 校验模型
  const models = await listModels();
  const modelConfig = models.find((m) => m.id === model && m.enabled);
  if (!modelConfig) {
    return res.status(400).json({ error: `模型「${model}」未配置或未启用` });
  }

  // 客观题自动判分
  const objectiveTypes: QuestionType[] = ["single", "multiple", "blank"];
  const perQuestion: { questionId: string; earned: number; max: number; comment: string }[] = [];
  let earnedScore = 0;
  let totalScore = 0;

  const answerMap = new Map(answers.map((a) => [a.questionId, a.response]));

  // 先处理客观题
  for (const q of quiz.questions) {
    totalScore += q.score;
    if (!objectiveTypes.includes(q.type)) continue;

    const userAns = answerMap.get(q.id);
    if (userAns === undefined || userAns === "" || (Array.isArray(userAns) && userAns.length === 0)) {
      perQuestion.push({ questionId: q.id, earned: 0, max: q.score, comment: "未作答" });
      continue;
    }

    if (q.type === "single") {
      const correct = String(q.answer).trim().toUpperCase();
      const user = String(userAns).trim().toUpperCase();
      const ok = correct === user;
      const earned = ok ? q.score : 0;
      earnedScore += earned;
      perQuestion.push({
        questionId: q.id,
        earned,
        max: q.score,
        comment: ok ? "正确" : `错误，正确答案：${correct}`,
      });
    } else if (q.type === "multiple") {
      const correct = (Array.isArray(q.answer) ? q.answer : [String(q.answer)])
        .map((s) => String(s).trim().toUpperCase())
        .sort();
      const user = (Array.isArray(userAns) ? userAns : [String(userAns)])
        .map((s) => String(s).trim().toUpperCase())
        .sort();
      const ok = correct.length === user.length && correct.every((v, i) => v === user[i]);
      const earned = ok ? q.score : 0;
      earnedScore += earned;
      perQuestion.push({
        questionId: q.id,
        earned,
        max: q.score,
        comment: ok ? "正确" : `错误，正确答案：${correct.join("")}`,
      });
    } else if (q.type === "blank") {
      const correct = String(q.answer).trim();
      const user = String(userAns).trim();
      const ok = correct === user;
      const earned = ok ? q.score : 0;
      earnedScore += earned;
      perQuestion.push({
        questionId: q.id,
        earned,
        max: q.score,
        comment: ok ? "正确" : `错误，参考答案：${correct}`,
      });
    }
  }

  // 主观题交给 AI 评分
  const subjectiveQuestions = quiz.questions.filter(
    (q) => q.type === "essay" || q.type === "composition"
  );

  if (subjectiveQuestions.length > 0) {
    const subjectLines = subjectiveQuestions.map((q) => {
      const userAns = answerMap.get(q.id);
      const userText = Array.isArray(userAns) ? userAns.join("，") : String(userAns || "未作答");
      return [
        `【题 ${q.id}】（${TYPE_LABELS[q.type]}，满分 ${q.score}）`,
        `题目：${q.prompt}`,
        `参考答案：${Array.isArray(q.answer) ? q.answer.join("；") : q.answer}`,
        `学生作答：${userText}`,
      ].join("\n");
    });

    const prompt = [
      `你是一位专业的${quiz.subject}教师，请对以下主观题作答进行评分。`,
      `测验：${quiz.title}`,
      "",
      ...subjectLines,
      "",
      "要求：",
      "1. 根据参考答案和学生作答给出每题得分（0 ~ 满分）",
      "2. 给出简短评语（1-2 句）",
      "3. 给出总体评价、薄弱知识点、改进建议",
      "4. **必须输出合法 JSON**，不要任何额外文字",
      "",
      "输出格式：",
      "```json",
      "{",
      '  "perQuestion": [',
      '    { "questionId": "q_3", "earned": 8, "comment": "评语" }',
      "  ],",
      '  "summary": "总体评价",',
      '  "weakPoints": ["薄弱点1", "薄弱点2"],',
      '  "suggestions": ["建议1", "建议2"]',
      "}",
      "```",
    ].join("\n");

    try {
      const result = await chatWithAI(prompt, model);
      const jsonStr = extractJson(result.reply);
      if (jsonStr) {
        try {
          const aiResult = JSON.parse(jsonStr);
          // 合并 AI 评分
          for (const pq of aiResult.perQuestion || []) {
            const q = quiz.questions.find((x) => x.id === pq.questionId);
            if (q) {
              const earned = Math.min(Math.max(0, Number(pq.earned) || 0), q.score);
              earnedScore += earned;
              perQuestion.push({
                questionId: pq.questionId,
                earned,
                max: q.score,
                comment: String(pq.comment || ""),
              });
            }
          }

          const analysis = {
            totalScore,
            earnedScore,
            perQuestion,
            summary: String(aiResult.summary || ""),
            weakPoints: Array.isArray(aiResult.weakPoints) ? aiResult.weakPoints.map(String) : [],
            suggestions: Array.isArray(aiResult.suggestions) ? aiResult.suggestions.map(String) : [],
          };

          const updated = await updateQuiz(quiz.id, {
            answers,
            analysis,
            status: "analyzed",
            finishedAt: Date.now(),
          });
          return res.json(updated);
        } catch {
          // JSON 解析失败，返回客观题结果
        }
      }
    } catch {
      // AI 评分失败，返回客观题结果
    }
  }

  // 无主观题或 AI 评分失败：返回客观题结果
  const analysis = {
    totalScore,
    earnedScore,
    perQuestion,
    summary: `本次测验客观题得分 ${earnedScore}/${totalScore}。`,
    weakPoints: [],
    suggestions: [],
  };

  const updated = await updateQuiz(quiz.id, {
    answers,
    analysis,
    status: "analyzed",
    finishedAt: Date.now(),
  });
  res.json(updated);
});

/** DELETE /api/quiz/:id */
router.delete("/:id", async (req, res) => {
  const ok = await deleteQuiz(req.params.id);
  if (!ok) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

/** 从文本中提取 JSON 对象 */
function extractJson(text: string): string | null {
  // 先尝试找 ```json ... ``` 块
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  // 再尝试找第一个 { ... } 块
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return null;
}

export default router;
