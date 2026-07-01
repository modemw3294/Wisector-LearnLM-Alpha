import { ModelConfig, ModelConfigInput } from "./types";
import type { Quiz, QuizSpec, QuizAnswer } from "./quiz-types";
import type { Video, VideoMode } from "./video-types";
import type { ActivityDay } from "./activity-types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

// ============================================================
// 任务系统类型
// ============================================================
export interface TaskStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  progress?: number;
}

export interface Task {
  id: string;
  type: "analyze_textbook" | "scan_notes" | "generate_quiz" | "generate_video" | "recognize_questions";
  title: string;
  status: "queued" | "running" | "done" | "error";
  steps: TaskStep[];
  resourceId?: string;
  error?: string;
  resultSummary?: string;
  createdAt: number;
  finishedAt?: number;
}

// ============================================================
// 课本类型（前端）
// ============================================================
export interface CatalogEntry {
  title: string;
  page?: number;
  children?: CatalogEntry[];
}

export interface TextbookItem {
  id: string;
  name: string;
  subject: string;
  grade: string;
  chapters: number;
  uploadedAt: string;
  status?: "analyzing" | "ready" | "error";
  catalog?: CatalogEntry[];
  outline?: string;
  taskId?: string;
  sourceFile?: string;
}

// ============================================================
// 聊天相关类型
// ============================================================
export interface ChatMessageFE {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallStateFE[];
}

export interface ToolCallStateFE {
  id: string;
  name: string;
  status: "running" | "done" | "error";
  output?: string;
}

export interface ChatStepFE {
  type: "thinking" | "tool_call" | "tool_result" | "text" | "done" | "error";
  toolCall?: { id: string; name: string; args: Record<string, unknown> };
  toolResult?: { toolCallId: string; output: string };
  text?: string;
  error?: string;
  result?: { reply: string; model: string };
}

export interface ChatOptions {
  message: string;
  model: string;
  history?: ChatMessageFE[];
  webAccess?: boolean;
  reasoning?: { enabled: boolean; intensity?: string };
  onStep?: (step: ChatStepFE) => void;
  signal?: AbortSignal;
}

// ============================================================
// 笔记类型
// ============================================================
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface NoteInput {
  title: string;
  content: string;
}

export interface ScanNoteRequest {
  imageBase64: string;
  imageType: string;
  model: string;
  mode?: "auto" | "outline" | "summary" | "flashcard";
}

export interface ScanNoteResult {
  markdown: string;
  model: string;
}

export const api = {
  async listModels(): Promise<ModelConfig[]> {
    return handle(await fetch(`${API_BASE}/api/models`));
  },
  async createModel(input: ModelConfigInput): Promise<ModelConfig> {
    return handle(
      await fetch(`${API_BASE}/api/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
  },
  async updateModel(id: string, patch: Partial<ModelConfigInput>): Promise<ModelConfig> {
    return handle(
      await fetch(`${API_BASE}/api/models/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
    );
  },
  async deleteModel(id: string): Promise<void> {
    await handle<void>(
      await fetch(`${API_BASE}/api/models/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
    );
  },

  /**
   * 模型健康检测
   */
  async checkModelHealth(): Promise<
    { id: string; displayName: string; status: "ok" | "error"; latencyMs?: number; error?: string }[]
  > {
    return handle(await fetch(`${API_BASE}/api/health/models`));
  },

  /**
   * 智能对话（SSE 流式）
   * 通过 onStep 回调实时接收工具调用 / 文本增量。
   */
  async chat(opts: ChatOptions): Promise<{ reply: string; model: string }> {
    const {
      message,
      model,
      history,
      webAccess,
      reasoning,
      onStep,
      signal,
    } = opts;

    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        message,
        model,
        history: history?.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        webAccess,
        reasoning,
      }),
      signal,
    });

    if (!res.ok || !res.body) {
      // 回退到普通 JSON
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult = { reply: "", model: model };
    let receivedDone = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // 解析 SSE 数据行
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr) continue;
        let step: ChatStepFE;
        try {
          step = JSON.parse(jsonStr) as ChatStepFE;
        } catch {
          // JSON 解析失败时忽略
          continue;
        }
        if (step.type === "done" && step.result) {
          finalResult = step.result;
          receivedDone = true;
        }
        if (step.type === "error") {
          onStep?.(step);
          throw new Error(step.error || "对话失败");
        }
        onStep?.(step);
      }
    }

    if (!receivedDone) {
      throw new Error("连接异常断开，请重试");
    }

    return finalResult;
  },

  // ============================================================
  // 笔记 API
  // ============================================================
  async listNotes(): Promise<Note[]> {
    return handle(await fetch(`${API_BASE}/api/notes`));
  },
  async getNote(id: string): Promise<Note> {
    return handle(await fetch(`${API_BASE}/api/notes/${encodeURIComponent(id)}`));
  },
  async createNote(input: NoteInput): Promise<Note> {
    return handle(
      await fetch(`${API_BASE}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
  },
  async updateNote(id: string, patch: Partial<NoteInput>): Promise<Note> {
    return handle(
      await fetch(`${API_BASE}/api/notes/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
    );
  },
  async deleteNote(id: string): Promise<void> {
    await handle<void>(
      await fetch(`${API_BASE}/api/notes/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
    );
  },
  async scanNote(req: ScanNoteRequest): Promise<ScanNoteResult> {
    return handle(
      await fetch(`${API_BASE}/api/notes/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      })
    );
  },

  // ============================================================
  // 测验 API
  // ============================================================
  async listQuizzes(): Promise<Quiz[]> {
    return handle(await fetch(`${API_BASE}/api/quiz`));
  },
  async getQuiz(id: string): Promise<Quiz> {
    return handle(await fetch(`${API_BASE}/api/quiz/${encodeURIComponent(id)}`));
  },
  async generateQuiz(input: {
    subject: string;
    duration: QuizSpec;
    durationMin: number;
    totalQuestions: number;
    topic?: string;
    model: string;
    difficulty?: number;
    sourceType?: "textbook" | "textbook-questions";
    sourceLabel?: string;
    sourceIds?: string[];
  }): Promise<Quiz> {
    return handle(
      await fetch(`${API_BASE}/api/quiz/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
  },
  async submitQuiz(
    id: string,
    answers: QuizAnswer[],
    model: string
  ): Promise<Quiz> {
    return handle(
      await fetch(`${API_BASE}/api/quiz/${encodeURIComponent(id)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, model }),
      })
    );
  },
  async deleteQuiz(id: string): Promise<void> {
    await handle<void>(
      await fetch(`${API_BASE}/api/quiz/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
    );
  },

  // ============================================================
  // 视频 API
  // ============================================================
  async listVideos(): Promise<Video[]> {
    return handle(await fetch(`${API_BASE}/api/videos`));
  },
  async getVideo(id: string): Promise<Video> {
    return handle(await fetch(`${API_BASE}/api/videos/${encodeURIComponent(id)}`));
  },
  async createVideo(input: {
    title: string;
    sourceLabel: string;
    subject: string;
    mode: VideoMode;
    requirement: string;
    models: { main: string; tts?: string; image?: string; video?: string };
    imageStyle?: string;
    durationSec: number;
  }): Promise<Video> {
    return handle(
      await fetch(`${API_BASE}/api/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
  },
  async deleteVideo(id: string): Promise<void> {
    await handle<void>(
      await fetch(`${API_BASE}/api/videos/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
    );
  },

  // ============================================================
  // 活动 API
  // ============================================================
  async getActivity(): Promise<{
    days: ActivityDay[];
    stats: {
      totalActivities: number;
      totalChats: number;
      totalNotes: number;
      totalQuizzes: number;
      totalVideos: number;
      streakDays: number;
    };
  }> {
    return handle(await fetch(`${API_BASE}/api/activity`));
  },

  // ============================================================
  // 数据管理 API（课本 + 题目合集 + 题目）
  // ============================================================
  async listTextbooks(): Promise<any[]> {
    return handle(await fetch(`${API_BASE}/api/data/textbooks`));
  },
  async createTextbook(input: any): Promise<any> {
    return handle(
      await fetch(`${API_BASE}/api/data/textbooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
  },
  async updateTextbook(id: string, patch: any): Promise<any> {
    return handle(
      await fetch(`${API_BASE}/api/data/textbooks/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
    );
  },
  async deleteTextbook(id: string): Promise<void> {
    await handle<void>(
      await fetch(`${API_BASE}/api/data/textbooks/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
    );
  },
  async listCollections(): Promise<any[]> {
    return handle(await fetch(`${API_BASE}/api/data/collections`));
  },
  async createCollection(input: any): Promise<any> {
    return handle(
      await fetch(`${API_BASE}/api/data/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
  },
  async deleteCollection(id: string): Promise<void> {
    await handle<void>(
      await fetch(`${API_BASE}/api/data/collections/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
    );
  },
  async listQuestions(): Promise<any[]> {
    return handle(await fetch(`${API_BASE}/api/data/questions`));
  },
  async createQuestion(input: any): Promise<any> {
    return handle(
      await fetch(`${API_BASE}/api/data/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
  },
  async updateQuestion(id: string, patch: any): Promise<any> {
    return handle(
      await fetch(`${API_BASE}/api/data/questions/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
    );
  },
  async deleteQuestion(id: string): Promise<void> {
    await handle<void>(
      await fetch(`${API_BASE}/api/data/questions/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
    );
  },
  async recognizeQuestions(input: {
    content: string;
    subject: string;
    model: string;
    collectionName?: string;
  }): Promise<{ questions: any[]; collectionId?: string }> {
    return handle(
      await fetch(`${API_BASE}/api/data/recognize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
  },

  /** 上传 PDF 课本并启动 AI 分析 */
  async analyzeTextbook(input: {
    fileName: string;
    fileBase64: string;
    subject: string;
    grade?: string;
    model: string;
  }): Promise<{ textbook: TextbookItem; taskId: string }> {
    return handle(
      await fetch(`${API_BASE}/api/data/textbooks/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
  },

  // ============================================================
  // 任务 API
  // ============================================================
  async listTasks(): Promise<Task[]> {
    return handle(await fetch(`${API_BASE}/api/tasks`));
  },
  async getRunningTasks(): Promise<Task[]> {
    return handle(await fetch(`${API_BASE}/api/tasks/running`));
  },
  async getTask(id: string): Promise<Task> {
    return handle(await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}`));
  },
  async deleteTask(id: string): Promise<void> {
    await handle<void>(
      await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
    );
  },

  // ============================================================
  // 开发者日志 API
  // ============================================================
  async listDevLogs(): Promise<DevLogEntry[]> {
    return handle(await fetch(`${API_BASE}/api/devlog`));
  },
  async clearDevLogs(): Promise<void> {
    await handle<void>(
      await fetch(`${API_BASE}/api/devlog`, {
        method: "DELETE",
      })
    );
  },
};

// ============================================================
// 开发者日志类型
// ============================================================
export interface DevLogEntry {
  id: string;
  timestamp: number;
  feature: string;
  model: string;
  format: string;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody: unknown;
  responseStatus: number;
  responseBody: unknown;
  durationMs: number;
  error?: string;
}