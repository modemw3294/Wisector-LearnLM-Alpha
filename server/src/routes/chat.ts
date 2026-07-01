import { Router } from "express";
import { z } from "zod";
import { chatWithTools } from "../services/chat";

const router = Router();

const chatRequestSchema = z.object({
  message: z.string().min(1).max(100000),
  model: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "tool"]),
        content: z.string(),
        toolCalls: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              args: z.record(z.string(), z.unknown()),
            })
          )
          .optional(),
        toolResults: z
          .array(
            z.object({
              toolCallId: z.string(),
              output: z.string(),
            })
          )
          .optional(),
      })
    )
    .optional(),
  reasoning: z
    .object({
      enabled: z.boolean(),
      intensity: z
        .enum(["low", "medium", "high", "xhigh", "max"])
        .optional(),
    })
    .optional(),
  webAccess: z.boolean().optional(),
});

/**
 * POST /api/chat — 智能对话（含工具调用 + 推理强度）
 * 支持 SSE 流式或普通 JSON 响应。
 */
router.post("/", async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid request body", details: parsed.error.format() });
  }

  const { message, model, history, reasoning, webAccess } = parsed.data;

  // 如果客户端请求 SSE 流式
  const acceptSSE = req.headers.accept?.includes("text/event-stream");

  if (acceptSSE) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      const result = await chatWithTools(message, model, {
        history,
        webAccess,
        reasoning,
        onStep: (step) => {
          res.write(`data: ${JSON.stringify(step)}\n\n`);
        },
      });
      res.write(
        `data: ${JSON.stringify({
          type: "done",
          result: { reply: result.reply, model: result.model },
        })}\n\n`
      );
    } catch (err) {
      console.error("[chat] error:", err);
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          error: err instanceof Error ? err.message : "Internal server error",
        })}\n\n`
      );
    }
    res.end();
    return;
  }

  // 普通 JSON 响应
  try {
    const result = await chatWithTools(message, model, {
      history,
      webAccess,
      reasoning,
    });
    res.json(result);
  } catch (err) {
    console.error("[chat] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
