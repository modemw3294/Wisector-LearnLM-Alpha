import { Router } from "express";
import { z } from "zod";
import {
  listModels,
  getModel,
  createModel,
  updateModel,
  deleteModel,
} from "../services/modelStore";

const router = Router();

const pricingSchema = z.object({
  input: z.number().nonnegative(),
  output: z.number().nonnegative(),
  currency: z.enum(["CNY", "USD"]),
});

const modelInputSchema = z.object({
  id: z.string().min(1).max(64),
  displayName: z.string().min(1).max(128),
  format: z.enum([
    "openai-completions",
    "openai-responses",
    "anthropic-messages",
    "gemini",
  ]),
  endpoint: z.string().url().or(z.literal("")),
  apiKey: z.string().min(1),
  modelName: z.string().optional(),
  contextWindow: z.number().int().positive(),
  inputModalities: z
    .array(z.enum(["text", "image", "pdf", "audio"]))
    .nonempty(),
  maxOutput: z.number().int().positive(),
  maxTurns: z.number().int().positive(),
  pricing: pricingSchema,
  headers: z.record(z.string(), z.string()).optional(),
  enabled: z.boolean(),
  reasoning: z.enum(["intensity", "toggle", "none"]),
});

const updateSchema = modelInputSchema.partial();

/** GET /api/models — 列出全部模型（隐藏 apiKey） */
router.get("/", async (_req, res) => {
  const all = await listModels();
  const safe = all.map(({ apiKey, ...rest }) => ({
    ...rest,
    apiKey: apiKey ? "***" : "",
  }));
  res.json(safe);
});

/** GET /api/models/:id */
router.get("/:id", async (req, res) => {
  const found = await getModel(req.params.id);
  if (!found) return res.status(404).json({ error: "Not found" });
  const { apiKey, ...rest } = found;
  res.json({ ...rest, apiKey: apiKey ? "***" : "" });
});

/** POST /api/models */
router.post("/", async (req, res) => {
  const parsed = modelInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.format() });
  }
  try {
    const created = await createModel(parsed.data);
    res.status(201).json(created);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(409).json({ error: msg });
  }
});

/** PUT /api/models/:id */
router.put("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.format() });
  }
  const updated = await updateModel(req.params.id, parsed.data);
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

/** DELETE /api/models/:id */
router.delete("/:id", async (req, res) => {
  const ok = await deleteModel(req.params.id);
  if (!ok) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

export default router;
