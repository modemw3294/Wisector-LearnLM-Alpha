import { ModelConfig, ModelConfigInput } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
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
};
