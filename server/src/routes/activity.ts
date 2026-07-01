import { Router } from "express";
import { getActivityDays, addActivity, getStats } from "../services/activityStore";
import { z } from "zod";

const router = Router();

/** GET /api/activity — 获取活动日历（方块图数据） */
router.get("/", async (_req, res) => {
  try {
    const days = await getActivityDays(365);
    const stats = await getStats();
    res.json({ days, stats });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /api/activity — 记录活动 */
router.post("/", async (req, res) => {
  const schema = z.object({
    type: z.enum(["chat", "video", "quiz", "note"]),
    title: z.string().max(200).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.format() });
  }
  await addActivity(parsed.data.type, parsed.data.title);
  res.status(201).json({ ok: true });
});

export default router;
