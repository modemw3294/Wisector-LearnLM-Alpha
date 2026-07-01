import type { ModelConfig } from "../types";

// ============================================================
// 开发者模式日志：记录所有 AI 调用的请求与响应
// 仅保存在内存中（环形缓冲），进程重启后清空
// ============================================================

export interface DevLogEntry {
  id: string;
  timestamp: number;
  /** 功能来源：chat / vision / pdf / ai */
  feature: string;
  /** 模型 ID */
  model: string;
  /** 请求格式 */
  format: string;
  /** HTTP 方法 */
  method: string;
  /** 实际请求 URL */
  url: string;
  /** 已脱敏的请求头（apiKey 等替换为 ***） */
  requestHeaders: Record<string, string>;
  /** 请求体（已截断） */
  requestBody: unknown;
  /** 响应状态码（0 表示网络错误） */
  responseStatus: number;
  /** 响应体（已截断） */
  responseBody: unknown;
  /** 耗时（毫秒） */
  durationMs: number;
  /** 错误信息（如有） */
  error?: string;
}

const MAX_ENTRIES = 200;
const MAX_BODY_CHARS = 8000;

const entries: DevLogEntry[] = [];

let counter = 0;

export function addDevLog(entry: Omit<DevLogEntry, "id" | "timestamp">): DevLogEntry {
  counter += 1;
  const full: DevLogEntry = {
    ...entry,
    id: `log_${Date.now()}_${counter}`,
    timestamp: Date.now(),
  };
  entries.unshift(full);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  return full;
}

export function listDevLogs(): DevLogEntry[] {
  return entries;
}

export function clearDevLogs(): void {
  entries.length = 0;
}

// ============================================================
// 辅助函数
// ============================================================

/** 脱敏请求头中的敏感字段 */
function redactHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  if (!headers) return {};
  const sensitive = new Set(["authorization", "x-api-key", "api-key", "cookie", "set-cookie"]);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = sensitive.has(k.toLowerCase()) ? "***" : v;
  }
  return out;
}

/** 脱敏 URL 中的敏感查询参数（如 Gemini 的 ?key=...） */
function redactUrl(url: string): string {
  return url.replace(/([?&])(key|api_key|apikey|access_token|token)=([^&]+)/gi, "$1$2=***");
}

/** 解析请求体（截断超长内容） */
function parseBody(body: BodyInit | null | undefined): unknown {
  if (body == null) return null;
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      return truncateDeep(parsed);
    } catch {
      return truncateStr(body);
    }
  }
  return `[non-string body: ${typeof body}]`;
}

function truncateStr(s: string): string {
  return s.length > MAX_BODY_CHARS ? s.slice(0, MAX_BODY_CHARS) + `…[+${s.length - MAX_BODY_CHARS} chars]` : s;
}

function truncateDeep(obj: unknown): unknown {
  if (typeof obj === "string") return truncateStr(obj);
  if (Array.isArray(obj)) return obj.slice(0, 50).map(truncateDeep);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      // 跳过超大的 base64 数据
      if (typeof v === "string" && v.length > 2000 && /^(data:|[A-Za-z0-9+/]{50})/.test(v)) {
        out[k] = `[base64 data, ${v.length} chars]`;
      } else {
        out[k] = truncateDeep(v);
      }
    }
    return out;
  }
  return obj;
}

// ============================================================
// 带日志记录的 fetch 封装
// ============================================================

/**
 * 在原有 fetch 之上记录请求/响应日志，不影响调用方逻辑。
 * 使用 response.clone() 读取响应体用于日志，原响应正常返回。
 */
export async function loggedFetch(
  feature: string,
  config: ModelConfig,
  url: string,
  init: RequestInit
): Promise<Response> {
  const start = Date.now();
  const safeHeaders = redactHeaders(init.headers as Record<string, string> | undefined);
  const requestBody = parseBody(init.body);
  const safeUrl = redactUrl(url);

  try {
    const response = await fetch(url, init);

    // 克隆响应以读取 body 用于日志（不影响原响应）
    try {
      const cloned = response.clone();
      const text = await cloned.text();
      let responseBody: unknown;
      try {
        responseBody = truncateDeep(JSON.parse(text));
      } catch {
        responseBody = truncateStr(text);
      }
      addDevLog({
        feature,
        model: config.id,
        format: config.format,
        method: init.method || "POST",
        url: safeUrl,
        requestHeaders: safeHeaders,
        requestBody,
        responseStatus: response.status,
        responseBody,
        durationMs: Date.now() - start,
      });
    } catch {
      // 日志记录失败不影响主流程
    }

    return response;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    addDevLog({
      feature,
      model: config.id,
      format: config.format,
      method: init.method || "POST",
      url: safeUrl,
      requestHeaders: safeHeaders,
      requestBody,
      responseStatus: 0,
      responseBody: null,
      durationMs: Date.now() - start,
      error,
    });
    throw err;
  }
}
