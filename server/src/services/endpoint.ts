import type { ModelConfig, RequestFormat } from "../types";

/**
 * 各请求格式的官方默认 API 端点。
 * 当用户在模型配置中将 BaseUrl 留空时，使用这些默认值。
 */
const DEFAULT_ENDPOINTS: Record<RequestFormat, string> = {
  "openai-completions": "https://api.openai.com/v1",
  "openai-responses": "https://api.openai.com/v1",
  "anthropic-messages": "https://api.anthropic.com/v1",
  "gemini": "https://generativelanguage.googleapis.com/v1beta",
};

/**
 * 解析模型配置的实际请求端点。
 * 若用户填入了 endpoint 则使用用户值，否则回退到该格式的官方默认 API。
 */
export function resolveEndpoint(config: ModelConfig): string {
  const ep = (config.endpoint || "").trim();
  return (ep || DEFAULT_ENDPOINTS[config.format]).replace(/\/$/, "");
}

/** 获取指定格式的官方默认端点（用于前端提示）。 */
export function getDefaultEndpoint(format: RequestFormat): string {
  return DEFAULT_ENDPOINTS[format];
}
