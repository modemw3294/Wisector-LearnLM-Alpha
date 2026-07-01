// 与后端共享的类型定义（前端副本）
export type RequestFormat =
  | "openai-completions"
  | "openai-responses"
  | "anthropic-messages"
  | "gemini";

export type InputModality = "text" | "image" | "pdf" | "audio";

export type Currency = "CNY" | "USD";

/**
 * 推理能力类型：
 * - "intensity" 支持推理强度档位（强推理模型）
 * - "toggle"    仅支持推理开/关（可切换模型）
 * - "none"      不支持推理
 */
export type ReasoningMode = "intensity" | "toggle" | "none";

export interface PriceEntry {
  input: number;
  output: number;
  currency: Currency;
}

export interface ModelConfig {
  id: string;
  displayName: string;
  format: RequestFormat;
  endpoint: string;
  apiKey: string;
  modelName?: string;
  contextWindow: number;
  inputModalities: InputModality[];
  maxOutput: number;
  maxTurns: number;
  pricing: PriceEntry;
  headers?: Record<string, string>;
  enabled: boolean;
  reasoning: ReasoningMode;
  createdAt: number;
  updatedAt: number;
}

export type ModelConfigInput = Omit<ModelConfig, "createdAt" | "updatedAt">;

export const PDF_CAPABLE_FORMATS: RequestFormat[] = [
  "anthropic-messages",
  "gemini",
];
