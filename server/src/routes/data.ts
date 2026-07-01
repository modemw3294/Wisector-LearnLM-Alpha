import { Router } from "express";
import { z } from "zod";
import {
  listTextbooks,
  createTextbook,
  updateTextbook,
  deleteTextbook,
  listCollections,
  createCollection,
  deleteCollection,
  listQuestions,
  createQuestion,
  createQuestions,
  updateQuestion,
  deleteQuestion,
} from "../services/dataStore";
import { chatWithAI } from "../services/ai";
import { chatWithPDF, isModelPDFCapable } from "../services/pdfChat";
import { listModels } from "../services/modelStore";
import { addActivity } from "../services/activityStore";
import { createTask, updateTask, updateTaskSteps, getTask } from "../services/taskStore";
import type { TaskStep } from "../types/task";
import type { CatalogEntry } from "../types/data";

const router = Router();

// ============================================================
// 课本
// ============================================================
const textbookSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(50),
  grade: z.string().max(50),
  chapters: z.number().int().min(0),
  uploadedAt: z.string(),
});

router.get("/textbooks", async (_req, res) => {
  res.json(await listTextbooks());
});

router.post("/textbooks", async (req, res) => {
  const parsed = textbookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.format() });
  }
  const tb = await createTextbook(parsed.data);
  await addActivity("note", `上传课本：${tb.name}`);
  res.status(201).json(tb);
});

router.put("/textbooks/:id", async (req, res) => {
  const parsed = textbookSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.format() });
  }
  const updated = await updateTextbook(req.params.id, parsed.data);
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

router.delete("/textbooks/:id", async (req, res) => {
  const ok = await deleteTextbook(req.params.id);
  if (!ok) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

// ============================================================
// 课本 AI 分析（PDF 上传 → AI 分析 → 返回目录/大纲）
// ============================================================
const analyzeSchema = z.object({
  fileName: z.string().min(1).max(300),
  fileBase64: z.string().min(1),
  subject: z.string().min(1).max(50),
  grade: z.string().max(50).optional(),
  model: z.string().min(1),
});

router.post("/textbooks/analyze", async (req, res) => {
  const parsed = analyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.format() });
  }
  const { fileName, fileBase64, subject, grade, model } = parsed.data;

  // 校验模型
  const models = await listModels();
  const modelConfig = models.find((m) => m.id === model && m.enabled);
  if (!modelConfig) {
    return res.status(400).json({ error: `模型「${model}」未配置或未启用` });
  }
  if (!isModelPDFCapable(modelConfig)) {
    return res.status(400).json({
      error: `模型「${modelConfig.displayName}」不支持视觉输入，请选择支持视觉的模型`,
    });
  }

  // 先创建课本记录（状态 analyzing）
  const tb = await createTextbook({
    name: fileName.replace(/\.pdf$/i, ""),
    subject,
    grade: grade || "",
    chapters: 0,
    uploadedAt: new Date().toISOString().slice(0, 10),
    status: "analyzing",
    sourceFile: fileName,
  });

  // 创建任务
  const steps: TaskStep[] = [
    { id: "upload", label: "上传 PDF 文件", status: "done" },
    { id: "parse", label: "解析 PDF 内容", status: "pending" },
    { id: "analyze", label: "AI 分析课本结构", status: "pending" },
    { id: "extract", label: "提取目录与大纲", status: "pending" },
    { id: "save", label: "保存分析结果", status: "pending" },
  ];

  const task = await createTask({
    type: "analyze_textbook",
    title: `分析课本：${tb.name}`,
    status: "running",
    steps,
    resourceId: tb.id,
  });

  // 关联任务到课本
  await updateTextbook(tb.id, { taskId: task.id });

  // 立即返回课本和任务 ID
  res.status(201).json({ textbook: tb, taskId: task.id });

  // 后台执行分析
  runTextbookAnalysis(tb.id, task.id, fileBase64, subject, model).catch(
    async (err) => {
      console.error(`[data] textbook analysis failed for ${tb.id}:`, err);
      await updateTextbook(tb.id, { status: "error" });
      await updateTask(task.id, {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
        finishedAt: Date.now(),
      });
    }
  );
});

/**
 * 后台执行课本分析
 */
async function runTextbookAnalysis(
  textbookId: string,
  taskId: string,
  pdfBase64: string,
  subject: string,
  modelId: string
): Promise<void> {
  const updateStep = async (stepIdx: number, status: TaskStep["status"]) => {
    const task = await getTask(taskId);
    if (!task) return;
    const steps = task.steps.map((s, idx) => {
      if (idx < stepIdx) return { ...s, status: "done" as const, progress: 100 };
      if (idx === stepIdx) return { ...s, status, progress: status === "done" ? 100 : 50 };
      return s;
    });
    await updateTaskSteps(taskId, steps);
  };

  // 步骤 1: 解析 PDF
  await updateStep(1, "running");

  // 步骤 2: AI 分析
  await updateStep(2, "running");

  const prompt = [
    `你是一位专业的${subject}教材分析专家。请仔细分析这份课本 PDF，并返回结构化的分析结果。`,
    `学科：${subject}`,
    "",
    "请分析课本的以下内容：",
    "1. **课本名称**：从封面或标题页识别",
    "2. **年级**：从封面或版权页识别",
    "3. **目录**：完整提取课本目录，包括章节标题和页码",
    "4. **大纲**：用 Markdown 格式编写课本的知识大纲，按章节组织，包含每章的核心知识点",
    "5. **章节数**：统计总章节数",
    "",
    "要求：",
    "- 目录要完整准确，包括章、节、小节层级",
    "- 大纲要详实，涵盖每章的核心知识点和技能要求",
    "- 数学公式用 LaTeX：行内 $...$，块级 $$...$$",
    "- **必须输出合法 JSON**，不要任何额外文字",
    "",
    "输出格式（JSON）：",
    "```json",
    "{",
    '  "name": "课本名称",',
    '  "grade": "年级",',
    '  "chapters": 10,',
    '  "catalog": [',
    "    {",
    '      "title": "第一章 xxx",',
    '      "page": 1,',
    '      "children": [',
    "        {",
    '          "title": "第一节 xxx",',
    '          "page": 2',
    "        }",
    "      ]",
    "    }",
    "  ],",
    '  "outline": "# 课本大纲\\n\\n## 第一章 xxx\\n\\n### 核心知识点\\n- 知识点1\\n- 知识点2"',
    "}",
    "```",
  ].join("\n");

  const result = await chatWithPDF(prompt, pdfBase64, modelId);

  await updateStep(2, "done");

  // 步骤 3: 提取结果
  await updateStep(3, "running");

  const jsonStr = extractJson(result.reply);
  if (!jsonStr) {
    throw new Error("AI 返回内容无法解析为 JSON");
  }

  let analysis: {
    name?: string;
    grade?: string;
    chapters?: number;
    catalog?: CatalogEntry[];
    outline?: string;
  };

  try {
    analysis = JSON.parse(jsonStr);
  } catch {
    throw new Error("AI 返回的 JSON 格式错误");
  }

  await updateStep(3, "done");

  // 步骤 4: 保存结果
  await updateStep(4, "running");

  await updateTextbook(textbookId, {
    name: analysis.name || undefined,
    grade: analysis.grade || undefined,
    chapters: analysis.chapters || (analysis.catalog?.length || 0),
    catalog: analysis.catalog || [],
    outline: analysis.outline || "",
    status: "ready",
  });

  await updateStep(4, "done");

  // 完成任务
  await updateTask(taskId, {
    status: "done",
    resultSummary: `已分析课本：${analysis.name || "未命名"}`,
    finishedAt: Date.now(),
  });

  await addActivity("note", `分析课本：${analysis.name || "未命名"}`);
}

// ============================================================
// 题目合集
// ============================================================
const collectionSchema = z.object({
  name: z.string().min(1).max(200),
  sourceFile: z.string().max(200),
  subject: z.string().max(50),
  questionCount: z.number().int().min(0),
  uploadedAt: z.string(),
});

router.get("/collections", async (_req, res) => {
  res.json(await listCollections());
});

router.post("/collections", async (req, res) => {
  const parsed = collectionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.format() });
  }
  const col = await createCollection(parsed.data);
  res.status(201).json(col);
});

router.delete("/collections/:id", async (req, res) => {
  const ok = await deleteCollection(req.params.id);
  if (!ok) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

// ============================================================
// 题目
// ============================================================
const questionSchema = z.object({
  title: z.string().min(1).max(2000),
  subject: z.string().max(50),
  type: z.enum(["选择题", "填空题", "解答题", "判断题"]),
  difficulty: z.enum(["简单", "中等", "困难"]),
  answer: z.string().max(5000).optional(),
  collectionId: z.string().optional(),
  updatedAt: z.string(),
});

router.get("/questions", async (_req, res) => {
  res.json(await listQuestions());
});

router.post("/questions", async (req, res) => {
  const parsed = questionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.format() });
  }
  const q = await createQuestion(parsed.data);
  res.status(201).json(q);
});

router.post("/questions/batch", async (req, res) => {
  const parsed = z.array(questionSchema).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.format() });
  }
  const created = await createQuestions(parsed.data);
  res.status(201).json(created);
});

router.put("/questions/:id", async (req, res) => {
  const parsed = questionSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.format() });
  }
  const updated = await updateQuestion(req.params.id, parsed.data);
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

router.delete("/questions/:id", async (req, res) => {
  const ok = await deleteQuestion(req.params.id);
  if (!ok) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

// ============================================================
// AI 识别题目
// ============================================================
const recognizeSchema = z.object({
  content: z.string().min(1).max(100000),
  subject: z.string().max(50),
  model: z.string().min(1),
  collectionName: z.string().max(200).optional(),
});

router.post("/recognize", async (req, res) => {
  const parsed = recognizeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.format() });
  }
  const { content, subject, model, collectionName } = parsed.data;

  // 校验模型
  const models = await listModels();
  const modelConfig = models.find((m) => m.id === model && m.enabled);
  if (!modelConfig) {
    return res.status(400).json({ error: `模型「${model}」未配置或未启用` });
  }

  const prompt = [
    `你是一位专业的${subject}教师，请从以下内容中识别并提取所有题目。`,
    `学科：${subject}`,
    "",
    "要求：",
    "1. 识别每道题目的题型（选择题/填空题/解答题/判断题）",
    "2. 识别难度（简单/中等/困难）",
    "3. 如有答案，一并提取",
    "4. 数学公式用 LaTeX：行内 $...$，块级 $$...$$",
    "5. **必须输出合法 JSON**，不要任何额外文字",
    "",
    "输出格式：",
    "```json",
    "[",
    "  {",
    '    "title": "题干文本",',
    '    "type": "选择题",',
    '    "difficulty": "中等",',
    '    "answer": "答案（可选）"',
    "  }",
    "]",
    "```",
    "",
    "以下是需要识别的内容：",
    "---",
    content,
  ].join("\n");

  try {
    const result = await chatWithAI(prompt, model);
    const jsonStr = extractJson(result.reply);
    if (!jsonStr) {
      return res.status(500).json({ error: "AI 返回内容无法解析", raw: result.reply.slice(0, 500) });
    }

    let parsed2: any[];
    try {
      parsed2 = JSON.parse(jsonStr);
    } catch {
      return res.status(500).json({ error: "AI 返回的 JSON 格式错误", raw: result.reply.slice(0, 500) });
    }

    if (!Array.isArray(parsed2) || parsed2.length === 0) {
      return res.status(500).json({ error: "AI 未识别到题目" });
    }

    // 创建合集（如有名称）
    let collectionId: string | undefined;
    if (collectionName) {
      const col = await createCollection({
        name: collectionName,
        sourceFile: "AI识别",
        subject,
        questionCount: 0,
        uploadedAt: new Date().toISOString().slice(0, 10),
      });
      collectionId = col.id;
    }

    // 批量创建题目
    const now = new Date().toISOString().slice(0, 10);
    const questions = parsed2.map((q) => ({
      title: String(q.title || ""),
      subject,
      type: (["选择题", "填空题", "解答题", "判断题"].includes(q.type) ? q.type : "解答题") as any,
      difficulty: (["简单", "中等", "困难"].includes(q.difficulty) ? q.difficulty : "中等") as any,
      answer: q.answer ? String(q.answer) : undefined,
      collectionId,
      updatedAt: now,
    }));

    const created = await createQuestions(questions);
    await addActivity("note", `AI 识别题目：${collectionName || subject}`);

    res.json({ questions: created, collectionId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `AI 识别失败：${msg}` });
  }
});

/** 从文本中提取 JSON */
function extractJson(text: string): string | null {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  // 尝试找 [ ... ] 数组
  const startArr = text.indexOf("[");
  const endArr = text.lastIndexOf("]");
  if (startArr !== -1 && endArr !== -1 && endArr > startArr) {
    return text.slice(startArr, endArr + 1);
  }
  // 尝试找 { ... } 对象
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return null;
}

export default router;
