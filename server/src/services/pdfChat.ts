import type { ChatResponse, ModelConfig } from "../types";
import { getModel } from "./modelStore";
import { PDF_CAPABLE_FORMATS } from "../types";
import { resolveEndpoint } from "./endpoint";
import { loggedFetch } from "./devLog";

/**
 * PDF 文档对话入口。
 * - Anthropic / Gemini：原生 PDF 上传（vision）
 * - OpenAI：用 pdf-parse 提取文本后发送
 */
export async function chatWithPDF(
  prompt: string,
  pdfBase64: string,
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

  // 校验模型支持视觉
  if (!config.inputModalities?.includes("image")) {
    return {
      reply: `模型 ${config.displayName} 不支持视觉输入，请选择支持视觉的模型。`,
      model: config.id,
    };
  }

  switch (config.format) {
    case "anthropic-messages":
      return callAnthropicPDF(config, prompt, pdfBase64);
    case "gemini":
      return callGeminiPDF(config, prompt, pdfBase64);
    case "openai-completions":
    case "openai-responses":
      return callOpenAITextFallback(config, prompt, pdfBase64);
    default:
      return {
        reply: `模型 ${config.displayName} 的格式 (${config.format}) 不支持 PDF 输入。`,
        model: config.id,
      };
  }
}

// ============================================================
// Anthropic — 原生 PDF
// ============================================================
async function callAnthropicPDF(
  config: ModelConfig,
  prompt: string,
  pdfBase64: string
): Promise<ChatResponse> {
  const url = `${resolveEndpoint(config)}/messages`;

  const body: any = {
    model: config.modelName || config.id,
    max_tokens: config.maxOutput,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  };

  const res = await loggedFetch("pdf", config, url, {
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
// Gemini — 原生 PDF
// ============================================================
async function callGeminiPDF(
  config: ModelConfig,
  prompt: string,
  pdfBase64: string
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
              mimeType: "application/pdf",
              data: pdfBase64,
            },
          },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: config.maxOutput },
  };

  const res = await loggedFetch("pdf", config, url, {
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

// ============================================================
// OpenAI — 文本提取回退
// ============================================================
async function callOpenAITextFallback(
  config: ModelConfig,
  prompt: string,
  pdfBase64: string
): Promise<ChatResponse> {
  // 从 base64 解码为 Buffer
  const pdfBuffer = Buffer.from(pdfBase64, "base64");

  // 动态导入 pdf-parse v2
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
  const textResult = await parser.getText();
  const extractedText = (textResult.text || "").slice(0, 80000); // 限制 80K 字符
  await parser.destroy();

  const fullPrompt = [
    prompt,
    "",
    "以下是从 PDF 中提取的文本内容：",
    "---",
    extractedText,
    "---",
  ].join("\n");

  const url = `${resolveEndpoint(config)}/chat/completions`;
  const body: any = {
    model: config.modelName || config.id,
    messages: [{ role: "user", content: fullPrompt }],
    max_tokens: config.maxOutput,
  };

  const res = await loggedFetch("pdf", config, url, {
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

/** 判断模型是否支持 PDF 分析（需要视觉能力） */
export function isModelPDFCapable(config: ModelConfig): boolean {
  return (
    config.inputModalities?.includes("image") ||
    PDF_CAPABLE_FORMATS.includes(config.format)
  );
}
