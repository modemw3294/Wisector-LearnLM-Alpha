import fs from "fs/promises";
import path from "path";
import type { Task, TaskStep } from "../types/task";

const DATA_DIR = path.resolve(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "tasks.json");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readAll(): Promise<Task[]> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return JSON.parse(raw) as Task[];
  } catch {
    return [];
  }
}

async function writeAll(tasks: Task[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(FILE, JSON.stringify(tasks, null, 2), "utf-8");
}

export async function listTasks(): Promise<Task[]> {
  return readAll();
}

export async function getTask(id: string): Promise<Task | undefined> {
  const all = await readAll();
  return all.find((t) => t.id === id);
}

export async function createTask(
  task: Omit<Task, "id" | "createdAt">
): Promise<Task> {
  const all = await readAll();
  const full: Task = {
    ...task,
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  all.push(full);
  await writeAll(all);
  return full;
}

export async function updateTask(
  id: string,
  patch: Partial<Task>
): Promise<Task | null> {
  const all = await readAll();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  await writeAll(all);
  return all[idx];
}

export async function updateTaskSteps(
  id: string,
  steps: TaskStep[]
): Promise<Task | null> {
  return updateTask(id, { steps });
}

export async function deleteTask(id: string): Promise<boolean> {
  const all = await readAll();
  const next = all.filter((t) => t.id !== id);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}

/** 获取进行中的任务 */
export async function getRunningTasks(): Promise<Task[]> {
  const all = await readAll();
  return all.filter((t) => t.status === "queued" || t.status === "running");
}
