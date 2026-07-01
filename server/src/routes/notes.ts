import { Router } from "express";
import { z } from "zod";
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
} from "../services/noteStore";
import { chatWithTools } from "../services/chat";
import { chatWithVision } from "../services/visionChat";
import { listModels } from "../services/modelStore";

const router = Router();

const noteInputSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(1_000_000),
});

const notePatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(1_000_000).optional(),
});

const scanSchema = z.object({
  imageBase64: z.string().min(1).max(20_000_000),
  imageType: z.string().min(1).max(50),
  model: z.string().min(1),
  mode: z.enum(["auto", "outline", "summary", "flashcard"]).optional(),
});

/** GET /api/notes — 列出所有笔记 */
router.get("/", async (_req, res) => {
  const all = await listNotes();
  res.json(all);
});

/** GET /api/notes/:id */
router.get("/:id", async (req, res) => {
  const note = await getNote(req.params.id);
  if (!note) return res.status(404).json({ error: "Not found" });
  res.json(note);
});

/** POST /api/notes */
router.post("/", async (req, res) => {
  const parsed = noteInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid body", details: parsed.error.format() });
  }
  const created = await createNote(parsed.data);
  res.status(201).json(created);
});

/** PUT /api/notes/:id */
router.put("/:id", async (req, res) => {
  const parsed = notePatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid body", details: parsed.error.format() });
  }
  const updated = await updateNote(req.params.id, parsed.data);
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

/** DELETE /api/notes/:id */
router.delete("/:id", async (req, res) => {
  const ok = await deleteNote(req.params.id);
  if (!ok) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

/**
 * POST /api/notes/scan — 扫描图片笔记，AI 识别为结构化 Markdown 笔记
 * 接受 imageBase64 + imageType + model，返回格式化后的 Markdown 字符串。
 */
router.post("/scan", async (req, res) => {
  const parsed = scanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid body", details: parsed.error.format() });
  }
  const { imageBase64, imageType, model, mode = "auto" } = parsed.data;

  // 校验模型存在
  const models = await listModels();
  const modelConfig = models.find((m) => m.id === model && m.enabled);
  if (!modelConfig) {
    return res.status(400).json({
      error: `模型「${model}」未配置或未启用，请先在设置中配置。`,
    });
  }

  // 校验模型支持多模态（图片）
  if (!modelConfig.inputModalities?.includes("image")) {
    return res.status(400).json({
      error: `模型「${modelConfig.displayName}」不支持图片输入，请选择支持多模态（图片）的模型。`,
    });
  }

  const modeInstruction: Record<string, string> = {
    auto:
      "自动识别内容类型并选择最合适的结构。如果是知识点，提取为层次化大纲；如果是错题，提取题目与解析；如果是会议/课堂，提取要点与待办。",
    outline:
      "将内容整理为清晰的层次化大纲，使用多级标题（# / ## / ###）与列表。",
    summary:
      "将内容总结为要点，每个要点用 bullet 列出，并给出一段 2-3 句的摘要。",
    flashcard:
      "将内容整理为问答卡片：每个知识点用 **Q:** / **A:** 的形式列出。",
  };

  const prompt = [
    "请扫描并识别图片中的内容，将其格式化为结构化的 Markdown 学习笔记。",
    modeInstruction[mode] || modeInstruction.auto,
    "要求：",
    "1. 仔细识别图片中的所有文字、公式、图表、代码等内容",
    "2. 使用合适的 Markdown 元素（标题、列表、表格、代码块、加粗等）",
    "3. 如有数学公式，用 LaTeX：行内 $...$，块级 $$...$$",
    "4. 保留所有原始关键信息，不要凭空添加",
    "5. 如果图片模糊或内容不清晰，请尽力识别并标注不确定的部分",
    "6. 直接输出 Markdown 内容，不要用 ```markdown 代码块包裹",
  ].join("\n");

  try {
    const result = await chatWithVision(prompt, imageBase64, imageType, model, {
      webAccess: false,
    });
    res.json({ markdown: result.reply, model: result.model });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `AI 扫描失败：${msg}` });
  }
});

export default router;
