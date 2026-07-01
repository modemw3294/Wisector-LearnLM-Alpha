import fs from "fs/promises";
import path from "path";
import type { DataStore, Textbook, Collection, Question } from "../types/data";

const DATA_DIR = path.resolve(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "data.json");

function emptyStore(): DataStore {
  return { textbooks: [], collections: [], questions: [] };
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function read(): Promise<DataStore> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return JSON.parse(raw) as DataStore;
  } catch {
    return emptyStore();
  }
}

async function write(store: DataStore): Promise<void> {
  await ensureDir();
  await fs.writeFile(FILE, JSON.stringify(store, null, 2), "utf-8");
}

// ============================================================
// 课本
// ============================================================
export async function listTextbooks(): Promise<Textbook[]> {
  const store = await read();
  return store.textbooks;
}

export async function createTextbook(item: Omit<Textbook, "id">): Promise<Textbook> {
  const store = await read();
  const tb: Textbook = { ...item, id: `tb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  store.textbooks.push(tb);
  await write(store);
  return tb;
}

export async function updateTextbook(id: string, patch: Partial<Textbook>): Promise<Textbook | null> {
  const store = await read();
  const idx = store.textbooks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  store.textbooks[idx] = { ...store.textbooks[idx], ...patch };
  await write(store);
  return store.textbooks[idx];
}

export async function deleteTextbook(id: string): Promise<boolean> {
  const store = await read();
  const before = store.textbooks.length;
  store.textbooks = store.textbooks.filter((t) => t.id !== id);
  if (store.textbooks.length === before) return false;
  await write(store);
  return true;
}

// ============================================================
// 题目合集
// ============================================================
export async function listCollections(): Promise<Collection[]> {
  const store = await read();
  return store.collections;
}

export async function createCollection(item: Omit<Collection, "id">): Promise<Collection> {
  const store = await read();
  const col: Collection = { ...item, id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  store.collections.push(col);
  await write(store);
  return col;
}

export async function deleteCollection(id: string): Promise<boolean> {
  const store = await read();
  const before = store.collections.length;
  store.collections = store.collections.filter((c) => c.id !== id);
  // 同时删除合集下的题目
  store.questions = store.questions.filter((q) => q.collectionId !== id);
  if (store.collections.length === before) return false;
  await write(store);
  return true;
}

// ============================================================
// 题目
// ============================================================
export async function listQuestions(): Promise<Question[]> {
  const store = await read();
  return store.questions;
}

export async function createQuestion(item: Omit<Question, "id">): Promise<Question> {
  const store = await read();
  const q: Question = { ...item, id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  store.questions.push(q);
  // 更新合集计数
  if (q.collectionId) {
    const col = store.collections.find((c) => c.id === q.collectionId);
    if (col) col.questionCount = store.questions.filter((x) => x.collectionId === col.id).length;
  }
  await write(store);
  return q;
}

export async function createQuestions(items: Omit<Question, "id">[]): Promise<Question[]> {
  const store = await read();
  const created: Question[] = [];
  for (const item of items) {
    const q: Question = { ...item, id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
    store.questions.push(q);
    created.push(q);
  }
  // 更新合集计数
  for (const col of store.collections) {
    col.questionCount = store.questions.filter((x) => x.collectionId === col.id).length;
  }
  await write(store);
  return created;
}

export async function updateQuestion(id: string, patch: Partial<Question>): Promise<Question | null> {
  const store = await read();
  const idx = store.questions.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  store.questions[idx] = { ...store.questions[idx], ...patch };
  await write(store);
  return store.questions[idx];
}

export async function deleteQuestion(id: string): Promise<boolean> {
  const store = await read();
  const before = store.questions.length;
  store.questions = store.questions.filter((q) => q.id !== id);
  if (store.questions.length === before) return false;
  // 更新合集计数
  for (const col of store.collections) {
    col.questionCount = store.questions.filter((x) => x.collectionId === col.id).length;
  }
  await write(store);
  return true;
}
