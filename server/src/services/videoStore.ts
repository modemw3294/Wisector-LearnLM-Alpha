import fs from "fs/promises";
import path from "path";
import type { Video, VideoStore } from "../types/video";

const DATA_DIR = path.resolve(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "videos.json");

function emptyStore(): VideoStore {
  return { videos: [] };
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function read(): Promise<VideoStore> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return JSON.parse(raw) as VideoStore;
  } catch {
    return emptyStore();
  }
}

async function write(store: VideoStore): Promise<void> {
  await ensureDir();
  await fs.writeFile(FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function listVideos(): Promise<Video[]> {
  const store = await read();
  return store.videos.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getVideo(id: string): Promise<Video | null> {
  const store = await read();
  return store.videos.find((v) => v.id === id) || null;
}

export async function createVideo(video: Video): Promise<Video> {
  const store = await read();
  store.videos.push(video);
  await write(store);
  return video;
}

export async function updateVideo(id: string, patch: Partial<Video>): Promise<Video | null> {
  const store = await read();
  const idx = store.videos.findIndex((v) => v.id === id);
  if (idx === -1) return null;
  store.videos[idx] = { ...store.videos[idx], ...patch };
  await write(store);
  return store.videos[idx];
}

export async function deleteVideo(id: string): Promise<boolean> {
  const store = await read();
  const before = store.videos.length;
  store.videos = store.videos.filter((v) => v.id !== id);
  if (store.videos.length === before) return false;
  await write(store);
  return true;
}
