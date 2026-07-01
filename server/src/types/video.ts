// ============================================================
// 视频类型
// ============================================================

/** 生成模式 */
export type VideoMode = "slideshow" | "cinematic";

/** 生成状态 */
export type VideoStatus = "queued" | "generating" | "done" | "error";

/** 生成步骤 */
export interface VideoGenStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  /** 进度 0-100 */
  progress?: number;
}

/** 视频记录 */
export interface Video {
  id: string;
  title: string;
  /** 关联课本/题目 */
  sourceLabel: string;
  /** 学科 */
  subject: string;
  /** 生成模式 */
  mode: VideoMode;
  /** 用户需求描述 */
  requirement: string;
  /** 模型配置 */
  models: {
    main: string;
    tts?: string;
    image?: string;
    /** 视频生成模型（cinematic 模式） */
    video?: string;
  };
  /** 图片风格 */
  imageStyle?: string;
  /** 时长（秒） */
  durationSec: number;
  /** 状态 */
  status: VideoStatus;
  /** 生成步骤 */
  steps: VideoGenStep[];
  /** 错误信息 */
  error?: string;
  /** 视频缩略图 URL（data URI 或路径） */
  thumbnail?: string;
  /** 视频文件 URL */
  videoUrl?: string;
  /** 创建时间 */
  createdAt: number;
  /** 完成时间 */
  finishedAt?: number;
}

/** 存储格式 */
export interface VideoStore {
  videos: Video[];
}
