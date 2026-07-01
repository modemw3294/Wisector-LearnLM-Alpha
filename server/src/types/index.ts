// ============================================================
// 通用聊天接口（保留原有）
// ============================================================

export interface ChatRequest {
  message: string;
  model?: string;
  history?: ChatMessage[];
  reasoning?: ReasoningConfig;
  webAccess?: boolean;
}

export interface ChatResponse {
  reply: string;
  model: string;
}

// ============================================================
// 对话消息 & 工具
// ============================================================

export interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  /** Gemini: 每个工具调用自带的 thought 签名（回传时必须附在对应 functionCall part 上） */
  thoughtSignature?: string;
}

export interface ToolResult {
  toolCallId: string;
  output: string;
}

export interface ToolDef {
  name: string;
  description: string;
  icon: string;
  parameters: Record<string, unknown>;
  requiresWebAccess: boolean;
  execute(args: Record<string, unknown>, ctx: ToolContext): Promise<string>;
}

export interface ToolContext {
  webAccess: boolean;
  userId?: string;
}

export interface ChatStep {
  type: "thinking" | "tool_call" | "tool_result" | "text" | "done" | "error";
  toolCall?: { id: string; name: string; args: Record<string, unknown> };
  toolResult?: { toolCallId: string; output: string };
  text?: string;
  done?: true;
  error?: string;
}

export type ChatStreamCallback = (step: ChatStep) => void;

// ============================================================
// 推理配置
// ============================================================

export interface ReasoningConfig {
  enabled: boolean;
  intensity?: "low" | "medium" | "high" | "xhigh" | "max";
}

// ============================================================
// 模型配置（BYOK）
// ============================================================

/** 用户可选的请求格式 */
export type RequestFormat =
  | "openai-completions"
  | "openai-responses"
  | "anthropic-messages"
  | "gemini";

/** 输入模态 */
export type InputModality = "text" | "image" | "pdf" | "audio";

/** 货币 */
export type Currency = "CNY" | "USD";

/**
 * 推理能力类型：
 * - "intensity" 支持推理强度档位（强推理模型）
 * - "toggle"    仅支持推理开/关（可切换模型）
 * - "none"      不支持推理
 */
export type ReasoningMode = "intensity" | "toggle" | "none";

export interface PriceEntry {
  /** 每百万 token 输入价格 */
  input: number;
  /** 每百万 token 输出价格 */
  output: number;
  currency: Currency;
}

export interface ModelConfig {
  /** 请求 ID（用户自定义的唯一标识，如 "claude-sonnet-4.6"） */
  id: string;
  /** 模型显示名称（如 "Claude Sonnet 4.6"） */
  displayName: string;
  /** 请求格式 */
  format: RequestFormat;
  /** API 端点 URL */
  endpoint: string;
  /** API Key */
  apiKey: string;
  /** 实际请求时使用的模型名（如 "claude-sonnet-4.6-20250514"），缺省时使用 id */
  modelName?: string;
  /** 上下文窗口（token 数） */
  contextWindow: number;
  /** 支持的输入模态 */
  inputModalities: InputModality[];
  /** 最大输出 token 数 */
  maxOutput: number;
  /** 最大调用轮次（多轮对话上限） */
  maxTurns: number;
  /** 输入输出费用 */
  pricing: PriceEntry;
  /** 额外的请求头（JSON 对象） */
  headers?: Record<string, string>;
  /** 是否启用 */
  enabled: boolean;
  /** 推理能力类型 */
  reasoning: ReasoningMode;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/** 创建时使用的 payload（不含自动生成的字段） */
export type ModelConfigInput = Omit<ModelConfig, "createdAt" | "updatedAt">;

/** 哪些请求格式支持原生 PDF 上传 */
export const PDF_CAPABLE_FORMATS: RequestFormat[] = [
  "anthropic-messages",
  "gemini",
];

// ============================================================
// 模型健康检测
// ============================================================

export interface ModelHealth {
  id: string;
  displayName: string;
  status: "ok" | "error" | "checking";
  latencyMs?: number;
  error?: string;
}
