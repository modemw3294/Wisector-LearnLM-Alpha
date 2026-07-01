import type { ChatResponse, ModelConfig } from "../types";
import { getModel } from "./modelStore";
import { resolveEndpoint } from "./endpoint";
import { loggedFetch } from "./devLog";

/**
 * 多模态（图片）对话入口。
 * 仅支持 OpenAI / Anthropic / Gemini 格式的多模态模型。
 */
export async function chatWithVision(
  prompt: string,
  imageBase64: string,
  imageType: string,
  modelId: string,
  opts: {
    webAccess?: boolean;
  } = {}
): Promise<ChatResponse> {
  if (!modelId) {
    return { reply: "请先选择一个已配置的模型。", model: "unknown" };
  }
  const config = await getModel(modelId);
  if (!config) {
    return { reply: `未找到模型配置：${modelId}`, model: modelId };
  }
  if (!config.enabled) {
    return { reply: `模型 ${config.displayName} 已禁用`, model: config.id };
  }

  switch (config.format) {
    case "openai-completions":
    case "openai-responses":
      return callOpenAIVision(config, prompt, imageBase64, imageType);
    case "anthropic-messages":
      return callAnthropicVision(config, prompt, imageBase64, imageType);
    case "gemini":
      return callGeminiVision(config, prompt, imageBase64, imageType);
    default:
      return {
        reply: `模型 ${config.displayName} 的格式 (${config.format}) 不支持图片输入。`,
        model: config.id,
      };
  }
}

// ============================================================
// OpenAI Vision
// ============================================================
async function callOpenAIVision(
  config: ModelConfig,
  prompt: string,
  imageBase64: string,
  imageType: string
): Promise<ChatResponse> {
  const url = `${resolveEndpoint(config)}/chat/completions`;
  const body: any = {
    model: config.modelName || config.id,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${imageType};base64,${imageBase64}`,
            },
          },
        ],
      },
    ],
    max_tokens: config.maxOutput,
  };

  const res = await loggedFetch("vision", config, url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...(config.headers || {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

  const data: any = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  return { reply: content, model: config.id };
}

// ============================================================
// Anthropic Vision
// ============================================================
async function callAnthropicVision(
  config: ModelConfig,
  prompt: string,
  imageBase64: string,
  imageType: string
): Promise<ChatResponse> {
  const url = `${resolveEndpoint(config)}/messages`;
  const mediaType = imageType === "image/png" ? "image/png" : imageType === "image/gif" ? "image/gif" : imageType === "image/webp" ? "image/webp" : "image/jpeg";

  const body: any = {
    model: config.modelName || config.id,
    max_tokens: config.maxOutput,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
            },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  };

  const res = await loggedFetch("vision", config, url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      ...(config.headers || {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

  const data: any = await res.json();
  const blocks = data?.content as any[] | undefined;
  const content = blocks?.map((b: any) => (b.type === "text" ? b.text : "")).join("") ?? "";
  return { reply: content, model: config.id };
}

// ============================================================
// Gemini Vision
// ============================================================
async function callGeminiVision(
  config: ModelConfig,
  prompt: string,
  imageBase64: string,
  imageType: string
): Promise<ChatResponse> {
  const model = config.modelName || config.id;
  const base = resolveEndpoint(config);
  const url = `${base}/models/${model}:generateContent?key=${config.apiKey}`;

  const body: any = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: imageType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: config.maxOutput },
  };

  const res = await loggedFetch("vision", config, url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.headers || {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

  const data: any = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts as any[] | undefined;
  const content = parts?.map((p: any) => p.text || "").join("") ?? "";
  return { reply: content, model: config.id };
}
