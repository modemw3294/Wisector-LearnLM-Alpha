import type {
  ChatMessage,
  ChatResponse,
  ChatStreamCallback,
  ModelConfig,
  ReasoningConfig,
  ToolCall,
  ToolResult,
} from "../types";
import { getModel } from "./modelStore";
import { TOOLS, getToolDefinitions } from "./tools";
import { resolveEndpoint } from "./endpoint";
import { loggedFetch } from "./devLog";

/**
 * BYOK 多厂商对话入口（支持工具调用 + 推理强度）。
 * 流程：用户消息 → LLM →（如需）工具调用 → 执行工具 → 把结果回传 LLM → 最终回答。
 * 最多循环 5 次，避免死循环。
 */
export async function chatWithTools(
  message: string,
  modelId: string | undefined,
  opts: {
    history?: ChatMessage[];
    webAccess?: boolean;
    reasoning?: ReasoningConfig;
    onStep?: ChatStreamCallback;
  } = {}
): Promise<ChatResponse> {
  const { history = [], webAccess = false, reasoning, onStep } = opts;

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

  // 构建对话上下文
  const sysPrompt = buildSystemPrompt(webAccess);
  const messages: ApiMessage[] = [
    { role: "system", content: sysPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  // 可用工具定义（根据 webAccess 过滤）
  const tools = getToolDefinitions(webAccess);

  const ctx = { webAccess };

  // 工具调用循环
  const MAX_ITERS = 5;
  for (let i = 0; i < MAX_ITERS; i++) {
    onStep?.({ type: "thinking" });

    const result = await callModelOnce(config, messages, {
      tools,
      reasoning,
    });

    // 无工具调用 → 直接返回文本
    if (!result.toolCalls || result.toolCalls.length === 0) {
      onStep?.({ type: "text", text: result.content });
      onStep?.({ type: "done", done: true });
      return { reply: result.content, model: config.id };
    }

    // 有工具调用：逐个执行
    // 1) 先把 assistant 的工具调用消息加入历史
    messages.push({
      role: "assistant",
      content: result.content || "",
      tool_calls: result.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.name, arguments: JSON.stringify(tc.args) },
      })),
      thought_signature: result.thoughtSignature,
      thought_text: result.thoughtText,
    });

    // 2) 逐个执行工具并把结果作为 tool 消息回传
    for (const tc of result.toolCalls) {
      onStep?.({
        type: "tool_call",
        toolCall: { id: tc.id, name: tc.name, args: tc.args },
      });

      const output = await executeTool(tc, ctx);

      onStep?.({
        type: "tool_result",
        toolResult: { toolCallId: tc.id, output },
      });

      messages.push({
        role: "tool",
        content: output,
        tool_call_id: tc.id,
        tool_name: tc.name,
      } as ApiMessage);
    }
    // 继续下一轮让 LLM 基于工具结果继续
  }

  onStep?.({ type: "done", done: true });
  return {
    reply: "已达最大工具调用次数，请简化问题后重试。",
    model: config.id,
  };
}

// ============================================================
// 系统提示词
// ============================================================
function buildSystemPrompt(webAccess: boolean): string {
  return [
    "你是 Wisector LearnLM，一个面向学生和教师的 AI 学习助手。",
    "回答应准确、有条理，善用 Markdown 格式（标题、列表、表格、代码块）。",
    "数学公式使用 LaTeX：行内用 $...$，块级用 $$...$$。",
    webAccess
      ? "用户已开启网络访问，必要时可调用网页搜索/抓取工具获取最新信息。"
      : "用户未开启网络访问，请基于自身知识回答。",
    "",
    "你拥有以下 Agent 工具，可在对话中直接调用以操作用户的学习数据：",
    "- 学习轨迹：activity_list（查看最近活动）、activity_stats（学习统计）",
    "- 测验：quiz_list / quiz_get / quiz_create / quiz_update / quiz_delete",
    "- 视频：video_list / video_get / video_create / video_update / video_delete",
    "- 笔记：note_list / note_read / note_create / note_update / note_delete",
    "- 数据库：db_read / db_write / db_delete（textbooks 课本、collections 题目合集、questions 题目）",
    "",
    "使用原则：",
    "1. 用户提到「我的测验/视频/笔记」时，主动用对应工具查询真实数据，不要凭空编造。",
    "2. 用户要求创建/编辑/删除时，直接调用工具执行，并简要告知结果。",
    "3. 工具返回的 JSON 数据，应用自然语言总结要点，不要原样粘贴大段 JSON。",
    "4. 需要操作数据时，优先使用工具，而不是让用户自己操作。",
  ].join("\n");
}

// ============================================================
// 工具执行
// ============================================================
async function executeTool(
  tc: ToolCall,
  ctx: { webAccess: boolean }
): Promise<string> {
  const tool = TOOLS[tc.name];
  if (!tool) return `未知工具：${tc.name}`;
  try {
    if (tool.requiresWebAccess && !ctx.webAccess) {
      return `工具 ${tc.name} 需要开启网络访问权限。`;
    }
    return await tool.execute(tc.args, ctx);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `工具执行失败：${msg}`;
  }
}

// ============================================================
// 统一的 API 消息类型（OpenAI 兼容）
// ============================================================
interface ApiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
  /** Gemini: 工具名（用于 functionResponse.name） */
  tool_name?: string;
  /** Gemini: thought signature（回传 model 消息时必须带上） */
  thought_signature?: string;
  /** Gemini: thought 文本（思考过程，回传时需要带上） */
  thought_text?: string;
}

// ============================================================
// 单次模型调用（含工具调用解析）
// ============================================================
interface CallResult {
  content: string;
  toolCalls?: ToolCall[];
  /** Gemini: thought signature（需要存入 assistant 消息） */
  thoughtSignature?: string;
  /** Gemini: thought 文本 */
  thoughtText?: string;
}

async function callModelOnce(
  config: ModelConfig,
  messages: ApiMessage[],
  opts: {
    tools: ReturnType<typeof getToolDefinitions>;
    reasoning?: ReasoningConfig;
  }
): Promise<CallResult> {
  switch (config.format) {
    case "openai-completions":
      return callOpenAI(config, messages, opts, "/chat/completions");
    case "openai-responses":
      return callOpenAI(config, messages, opts, "/responses");
    case "anthropic-messages":
      return callAnthropic(config, messages, opts);
    case "gemini":
      return callGemini(config, messages, opts);
    default:
      return { content: `不支持的请求格式: ${config.format}` };
  }
}

// ============================================================
// OpenAI Chat Completions / Responses（含原生 function calling）
// ============================================================
async function callOpenAI(
  config: ModelConfig,
  messages: ApiMessage[],
  opts: { tools: any[]; reasoning?: ReasoningConfig },
  path: "/chat/completions" | "/responses"
): Promise<CallResult> {
  const url = `${resolveEndpoint(config)}${path}`;
  const isResponses = path === "/responses";
  const body: any = isResponses
    ? {
        model: config.modelName || config.id,
        input: messagesToResponsesInput(messages),
        max_output_tokens: config.maxOutput,
      }
    : {
        model: config.modelName || config.id,
        messages,
        max_tokens: config.maxOutput,
      };
  if (opts.tools.length > 0) {
    body.tools = opts.tools;
  }
  if (opts.reasoning?.enabled) {
    body.reasoning_effort = mapReasoningIntensity(opts.reasoning.intensity);
  }

  const res = await loggedFetch("chat", config, url, {
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
  // OpenAI Responses API 返回结构不同
  if (isResponses) {
    const content: string =
      data?.output_text ??
      data?.output?.map((o: any) =>
        o?.content?.map((c: any) => c?.text || "").join("") || ""
      ).join("") ?? "";
    return { content, toolCalls: parseResponsesToolCalls(data?.output) };
  }
  const msg = data?.choices?.[0]?.message ?? {};
  const content: string = msg.content ?? "";
  const rawToolCalls = msg.tool_calls as any[] | undefined;

  const toolCalls = parseOpenAIToolCalls(rawToolCalls);
  return { content, toolCalls };
}

/** 将 ApiMessage[] 转换为 Responses API 的 input 格式 */
function messagesToResponsesInput(messages: ApiMessage[]): any[] {
  return messages.map((m) => {
    if (m.role === "tool") {
      return {
        type: "function_call_output",
        call_id: m.tool_call_id,
        output: m.content,
      };
    }
    if (m.role === "assistant" && m.tool_calls?.length) {
      return {
        role: "assistant",
        content: m.content || "",
        function_calls: m.tool_calls.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments,
        })),
      };
    }
    return { role: m.role, content: m.content };
  });
}

/** 解析 Responses API 的工具调用 */
function parseResponsesToolCalls(output: any[] | undefined): ToolCall[] | undefined {
  if (!output || output.length === 0) return undefined;
  const calls: ToolCall[] = [];
  for (const item of output) {
    if (item?.type === "function_call") {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(item.arguments || "{}");
      } catch {
        args = {};
      }
      calls.push({
        id: item.id || `call_${Date.now()}_${calls.length}`,
        name: item.name || "",
        args,
      });
    }
  }
  return calls.length ? calls : undefined;
}

function parseOpenAIToolCalls(
  raw: any[] | undefined
): ToolCall[] | undefined {
  if (!raw || raw.length === 0) return undefined;
  return raw.map((tc) => {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(tc.function?.arguments || "{}");
    } catch {
      args = {};
    }
    return {
      id: tc.id || `call_${Date.now()}`,
      name: tc.function?.name || "",
      args,
    };
  });
}

// ============================================================
// Anthropic Messages（原生 tool_use）
// ============================================================
async function callAnthropic(
  config: ModelConfig,
  messages: ApiMessage[],
  opts: { tools: any[]; reasoning?: ReasoningConfig }
): Promise<CallResult> {
  const url = `${resolveEndpoint(config)}/messages`;

  // 转换消息格式：Anthropic 用 user/assistant，工具结果放在 user 消息里
  const system = messages.find((m) => m.role === "system")?.content || "";
  const conv = messages.filter((m) => m.role !== "system");

  const body: any = {
    model: config.modelName || config.id,
    max_tokens: config.maxOutput,
    system,
    messages: conv.map((m) => convertAnthropicMessage(m)),
  };

  if (opts.tools.length > 0) {
    body.tools = opts.tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
  }
  if (opts.reasoning?.enabled) {
    body.thinking = {
      type: "enabled",
      budget_tokens: mapAnthropicBudget(opts.reasoning.intensity),
    };
  }

  const res = await loggedFetch("chat", config, url, {
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
  if (!blocks) return { content: "" };

  let content = "";
  const toolCalls: ToolCall[] = [];
  for (const b of blocks) {
    if (b.type === "text") content += b.text;
    if (b.type === "tool_use") {
      toolCalls.push({
        id: b.id,
        name: b.name,
        args: (b.input as Record<string, unknown>) || {},
      });
    }
  }
  return { content, toolCalls: toolCalls.length ? toolCalls : undefined };
}

function convertAnthropicMessage(m: ApiMessage): any {
  if (m.role === "tool") {
    // 工具结果：Anthropic 要求放在 user 消息里
    return {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: m.tool_call_id,
          content: m.content,
        },
      ],
    };
  }
  if (m.role === "assistant" && m.tool_calls?.length) {
    return {
      role: "assistant",
      content: [
        ...(m.content ? [{ type: "text", text: m.content }] : []),
        ...m.tool_calls.map((tc) => ({
          type: "tool_use",
          id: tc.id,
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments || "{}"),
        })),
      ],
    };
  }
  return { role: m.role, content: m.content };
}

// ============================================================
// Google Gemini（functionDeclarations）
// ============================================================
async function callGemini(
  config: ModelConfig,
  messages: ApiMessage[],
  opts: { tools: any[]; reasoning?: ReasoningConfig }
): Promise<CallResult> {
  const model = config.modelName || config.id;
  const base = resolveEndpoint(config);
  const url = `${base}/models/${model}:generateContent?key=${config.apiKey}`;

  const system = messages.find((m) => m.role === "system")?.content;
  const conv = messages.filter((m) => m.role !== "system");

  const body: any = {
    contents: conv.map((m) => convertGeminiMessage(m)),
    generationConfig: { maxOutputTokens: config.maxOutput },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  if (opts.tools.length > 0) {
    body.tools = [
      {
        functionDeclarations: opts.tools.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          parameters: geminiSchema(t.function.parameters),
        })),
      },
    ];
  }
  if (opts.reasoning?.enabled) {
    body.generationConfig.thinkingConfig = {
      thinkingBudget: mapGeminiBudget(opts.reasoning.intensity),
    };
  }

  const res = await loggedFetch("chat", config, url, {
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
  if (!parts) return { content: "" };

  let content = "";
  let thoughtSignature: string | undefined;
  let thoughtText: string | undefined;
  const toolCalls: ToolCall[] = [];
  for (const p of parts) {
    // Gemini thinking: thought=true 的 text 是思考过程，thoughtSignature 是签名
    if (p.thought === true && p.text) {
      thoughtText = p.text;
      continue;
    }
    if (p.thoughtSignature) {
      thoughtSignature = p.thoughtSignature;
      continue;
    }
    if (p.text) content += p.text;
    if (p.functionCall) {
      toolCalls.push({
        id: `call_${Date.now()}_${toolCalls.length}`,
        name: p.functionCall.name,
        args: p.functionCall.args || {},
      });
    }
  }
  return {
    content,
    toolCalls: toolCalls.length ? toolCalls : undefined,
    thoughtSignature,
    thoughtText,
  };
}

function convertGeminiMessage(m: ApiMessage): any {
  if (m.role === "tool") {
    // Gemini 工具结果用 role: "function"
    return {
      role: "function",
      parts: [
        {
          functionResponse: {
            name: m.tool_name || "tool",
            response: { result: m.content },
          },
        },
      ],
    };
  }
  if (m.role === "assistant" && m.tool_calls?.length) {
    const parts: any[] = [];
    // thought 文本（如果有）
    if (m.thought_text) parts.push({ text: m.thought_text, thought: true });
    // thought signature（必须紧跟在 thought text 之后、functionCall 之前）
    if (m.thought_signature) parts.push({ thoughtSignature: m.thought_signature });
    // 普通文本
    if (m.content) parts.push({ text: m.content });
    // function calls
    for (const tc of m.tool_calls) {
      parts.push({
        functionCall: {
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments || "{}"),
        },
      });
    }
    return { role: "model", parts };
  }
  return {
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  };
}

function geminiSchema(schema: any): any {
  // Gemini 的 schema 需要转换 type 字段
  return schema;
}

// ============================================================
// 推理强度映射
// ============================================================
function mapReasoningIntensity(
  level?: string
): "minimal" | "low" | "medium" | "high" {
  switch (level) {
    case "low":
      return "low";
    case "medium":
      return "medium";
    case "high":
    case "xhigh":
    case "max":
      return "high";
    default:
      return "medium";
  }
}

function mapAnthropicBudget(level?: string): number {
  switch (level) {
    case "low":
      return 2048;
    case "medium":
      return 4096;
    case "high":
      return 8192;
    case "xhigh":
      return 16384;
    case "max":
      return 24000;
    default:
      return 4096;
  }
}

function mapGeminiBudget(level?: string): number {
  switch (level) {
    case "low":
      return 1024;
    case "medium":
      return 4096;
    case "high":
      return 8192;
    case "xhigh":
      return 16384;
    case "max":
      return 24576;
    default:
      return 4096;
  }
}
