import { promises as fs } from "fs";
import path from "path";

/**
 * 笔记数据结构
 */
export interface Note {
  id: string;
  title: string;
  content: string; // Markdown 源码
  createdAt: number;
  updatedAt: number;
}

export type NoteInput = {
  title: string;
  content: string;
};

/**
 * 简单的文件存储：将笔记持久化到 server/data/notes.json
 */
const DATA_DIR = path.resolve(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "notes.json");

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

export async function listNotes(): Promise<Note[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw) as Note[];
  } catch {
    return [];
  }
}

export async function getNote(id: string): Promise<Note | undefined> {
  const all = await listNotes();
  return all.find((n) => n.id === id);
}

export async function createNote(input: NoteInput): Promise<Note> {
  const all = await listNotes();
  const now = Date.now();
  const note: Note = {
    id: `note-${now}`,
    title: input.title || "未命名笔记",
    content: input.content || "",
    createdAt: now,
    updatedAt: now,
  };
  all.push(note);
  await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2), "utf-8");
  return note;
}

export async function updateNote(
  id: string,
  patch: Partial<NoteInput>
): Promise<Note | null> {
  const all = await listNotes();
  const idx = all.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  const updated: Note = {
    ...all[idx],
    ...patch,
    updatedAt: Date.now(),
  };
  all[idx] = updated;
  await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2), "utf-8");
  return updated;
}

export async function deleteNote(id: string): Promise<boolean> {
  const all = await listNotes();
  const next = all.filter((n) => n.id !== id);
  if (next.length === all.length) return false;
  await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf-8");
  return true;
}
