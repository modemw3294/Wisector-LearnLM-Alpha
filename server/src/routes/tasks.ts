import { Router } from "express";
import { listTasks, getTask, deleteTask } from "../services/taskStore";

const router = Router();

/** GET /api/tasks — 列出全部任务（按创建时间倒序） */
router.get("/", async (_req, res) => {
  const all = await listTasks();
  all.sort((a, b) => b.createdAt - a.createdAt);
  res.json(all);
});

/** GET /api/tasks/running — 获取进行中的任务 */
router.get("/running", async (_req, res) => {
  const all = await listTasks();
  const running = all.filter(
    (t) => t.status === "queued" || t.status === "running"
  );
  res.json(running);
});

/** GET /api/tasks/:id */
router.get("/:id", async (req, res) => {
  const task = await getTask(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json(task);
});

/** DELETE /api/tasks/:id */
router.delete("/:id", async (req, res) => {
  const ok = await deleteTask(req.params.id);
  if (!ok) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

export default router;
