import { Router } from "express";
import { listModels } from "../services/modelStore";
import type { ModelHealth } from "../types";

const router = Router();

/**
 * GET /api/health/models — 检测所有已配置模型的连通性
 * 对每个模型发一个最小请求，记录延迟与状态。
 */
router.get("/models", async (_req, res) => {
  const models = await listModels();
  const results: ModelHealth[] = await Promise.all(
    models.map(async (m) => {
      const start = Date.now();
      try {
        const ok = await pingModel(m.endpoint, m.apiKey, m.format);
        if (!ok) throw new Error("请求失败");
        return {
          id: m.id,
          displayName: m.displayName,
          status: "ok" as const,
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        return {
          id: m.id,
          displayName: m.displayName,
          status: "error" as const,
          latencyMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );
  res.json(results);
});

/**
 * 对单个模型端点发一个最小检测请求。
 * 不同格式用不同的轻量请求方式。
 */
async function pingModel(
  endpoint: string,
  apiKey: string,
  format: string
): Promise<boolean> {
  const base = endpoint.replace(/\/$/, "");
  const timeout = AbortSignal.timeout(10000);

  try {
    // 对各种格式统一用 GET /v1/models 或类似方式做最低开销检测
    if (format === "openai-completions" || format === "openai-responses") {
      const res = await fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: timeout,
      });
      return res.ok || res.status === 401; // 401 也算连通（权限问题，但端点在线）
    }
    if (format === "anthropic-messages") {
      const res = await fetch(`${base}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
        signal: timeout,
      });
      return res.ok || res.status === 401 || res.status === 403;
    }
    if (format === "gemini") {
      const res = await fetch(`${base}/models?key=${apiKey}`, {
        signal: timeout,
      });
      return res.ok || res.status === 401 || res.status === 403;
    }
    // 其他格式：简单 GET 根路径
    const res = await fetch(base, { signal: timeout });
    return res.ok;
  } catch {
    return false;
  }
}

export default router;
