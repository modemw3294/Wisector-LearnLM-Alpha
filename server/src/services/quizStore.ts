import fs from "fs/promises";
import path from "path";
import type { Quiz, QuizStore } from "../types/quiz";

const DATA_DIR = path.resolve(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "quizzes.json");

function emptyStore(): QuizStore {
  return { quizzes: [] };
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function read(): Promise<QuizStore> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return JSON.parse(raw) as QuizStore;
  } catch {
    return emptyStore();
  }
}

async function write(store: QuizStore): Promise<void> {
  await ensureDir();
  await fs.writeFile(FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function listQuizzes(): Promise<Quiz[]> {
  const store = await read();
  return store.quizzes.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  const store = await read();
  return store.quizzes.find((q) => q.id === id) || null;
}

export async function createQuiz(quiz: Quiz): Promise<Quiz> {
  const store = await read();
  store.quizzes.push(quiz);
  await write(store);
  return quiz;
}

export async function updateQuiz(id: string, patch: Partial<Quiz>): Promise<Quiz | null> {
  const store = await read();
  const idx = store.quizzes.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  store.quizzes[idx] = { ...store.quizzes[idx], ...patch };
  await write(store);
  return store.quizzes[idx];
}

export async function deleteQuiz(id: string): Promise<boolean> {
  const store = await read();
  const before = store.quizzes.length;
  store.quizzes = store.quizzes.filter((q) => q.id !== id);
  if (store.quizzes.length === before) return false;
  await write(store);
  return true;
}
