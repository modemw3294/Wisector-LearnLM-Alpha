import type { ChatResponse, ModelConfig } from "../types";
import { getModel } from "./modelStore";
import { resolveEndpoint } from "./endpoint";
import { loggedFetch } from "./devLog";

/**
 * BYOK 多厂商调用入口（简单单轮对话，不含工具调用）。
 * 保留此文件用于向后兼容，新代码应使用 chat.ts 中的 chatWithTools。
 */

export async function chatWithAI(
  message: string,
  modelId?: string
): Promise<ChatResponse> {
  if (!modelId) {
    return { reply: `Echo (no model): ${message}`, model: "unknown" };
  }

  const config = await getModel(modelId);
  if (!config) {
    return { reply: `Echo (model not found): ${message}`, model: modelId };
  }
  if (!config.enabled) {
    return { reply: `模型 ${config.displayName} 已禁用`, model: config.id };
  }

  try {
    switch (config.format) {
      case "openai-completions":
        return await callOpenAICompletions(config, message);
      case "openai-responses":
        return await callOpenAIResponses(config, message);
      case "anthropic-messages":
        return await callAnthropicMessages(config, message);
      case "gemini":
        return await callGemini(config, message);
      default:
        return { reply: `不支持的请求格式: ${config.format}`, model: config.id };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { reply: `调用失败: ${msg}`, model: config.id };
  }
}

function buildHeaders(config: ModelConfig, defaults: Record<string, string>): Record<string, string> {
  return { ...defaults, ...(config.headers || {}) };
}

// ============================================================
// OpenAI Chat Completions（/chat/completions）
// ============================================================
async function callOpenAICompletions(
  config: ModelConfig,
  message: string
): Promise<ChatResponse> {
  const url = `${resolveEndpoint(config)}/chat/completions`;
  const res = await loggedFetch("chat", config, url, {
    method: "POST",
    headers: buildHeaders(config, {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    }),
    body: JSON.stringify({
      model: config.modelName || config.id,
      messages: [{ role: "user", content: message }],
      max_tokens: config.maxOutput,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  const reply: string = data?.choices?.[0]?.message?.content ?? "";
  return { reply, model: config.id };
}

// ============================================================
// OpenAI Responses API（/responses）
// ============================================================
async function callOpenAIResponses(
  config: ModelConfig,
  message: string
): Promise<ChatResponse> {
  const url = `${resolveEndpoint(config)}/responses`;
  const res = await loggedFetch("chat", config, url, {
    method: "POST",
    headers: buildHeaders(config, {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    }),
    body: JSON.stringify({
      model: config.modelName || config.id,
      input: message,
      max_output_tokens: config.maxOutput,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  const reply: string = data?.output_text ?? data?.output?.[0]?.content?.[0]?.text ?? "";
  return { reply, model: config.id };
}

// ============================================================
// Anthropic Messages（/messages）— 支持原生 PDF
// ============================================================
async function callAnthropicMessages(
  config: ModelConfig,
  message: string
): Promise<ChatResponse> {
  const url = `${resolveEndpoint(config)}/messages`;
  const res = await loggedFetch("chat", config, url, {
    method: "POST",
    headers: buildHeaders(config, {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    }),
    body: JSON.stringify({
      model: config.modelName || config.id,
      max_tokens: config.maxOutput,
      messages: [{ role: "user", content: message }],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  const reply: string = data?.content?.map((c: any) => c.text).join("") ?? "";
  return { reply, model: config.id };
}

// ============================================================
// Google Gemini（/models/{model}:generateContent）— 支持原生 PDF
// ============================================================
async function callGemini(
  config: ModelConfig,
  message: string
): Promise<ChatResponse> {
  const model = config.modelName || config.id;
  const base = resolveEndpoint(config);
  const url = `${base}/models/${model}:generateContent?key=${config.apiKey}`;
  const res = await loggedFetch("chat", config, url, {
    method: "POST",
    headers: buildHeaders(config, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: { maxOutputTokens: config.maxOutput },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  const reply: string =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
  return { reply, model: config.id };
}
