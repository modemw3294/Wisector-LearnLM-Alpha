import { promises as fs } from "fs";
import path from "path";
import { ModelConfig, ModelConfigInput } from "../types";

/**
 * 简单的文件存储：将模型配置持久化到 server/data/models.json。
 * 生产环境可替换为数据库实现。
 */

const DATA_DIR = path.resolve(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "models.json");

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

export async function listModels(): Promise<ModelConfig[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw) as ModelConfig[];
  } catch {
    return [];
  }
}

export async function getModel(id: string): Promise<ModelConfig | undefined> {
  const all = await listModels();
  return all.find((m) => m.id === id);
}

export async function createModel(input: ModelConfigInput): Promise<ModelConfig> {
  const all = await listModels();
  if (all.some((m) => m.id === input.id)) {
    throw new Error(`Model with id "${input.id}" already exists`);
  }
  const now = Date.now();
  const config: ModelConfig = { ...input, createdAt: now, updatedAt: now };
  all.push(config);
  await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2), "utf-8");
  return config;
}

export async function updateModel(
  id: string,
  patch: Partial<ModelConfigInput>
): Promise<ModelConfig | null> {
  const all = await listModels();
  const idx = all.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const updated: ModelConfig = { ...all[idx], ...patch, updatedAt: Date.now() };
  all[idx] = updated;
  await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2), "utf-8");
  return updated;
}

export async function deleteModel(id: string): Promise<boolean> {
  const all = await listModels();
  const next = all.filter((m) => m.id !== id);
  if (next.length === all.length) return false;
  await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf-8");
  return true;
}
