import { Router } from "express";
import { listDevLogs, clearDevLogs } from "../services/devLog";

const router = Router();

/** GET /api/devlog — 列出所有开发者日志（最新在前） */
router.get("/", (_req, res) => {
  res.json(listDevLogs());
});

/** DELETE /api/devlog — 清空所有开发者日志 */
router.delete("/", (_req, res) => {
  clearDevLogs();
  res.status(204).end();
});

export default router;
