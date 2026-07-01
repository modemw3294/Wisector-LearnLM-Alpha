// 视频类型（前端）

export type VideoMode = "slideshow" | "cinematic";

export type VideoStatus = "queued" | "generating" | "done" | "error";

export interface VideoGenStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  progress?: number;
}

export interface Video {
  id: string;
  title: string;
  sourceLabel: string;
  subject: string;
  mode: VideoMode;
  requirement: string;
  models: {
    main: string;
    tts?: string;
    image?: string;
    video?: string;
  };
  imageStyle?: string;
  durationSec: number;
  status: VideoStatus;
  steps: VideoGenStep[];
  error?: string;
  thumbnail?: string;
  videoUrl?: string;
  createdAt: number;
  finishedAt?: number;
}
