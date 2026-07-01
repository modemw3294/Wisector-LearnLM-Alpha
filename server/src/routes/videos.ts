import { Router } from "express";
import { z } from "zod";
import {
  listVideos,
  getVideo,
  createVideo,
  updateVideo,
  deleteVideo,
} from "../services/videoStore";
import { addActivity } from "../services/activityStore";
import type { Video, VideoMode, VideoGenStep } from "../types/video";

const router = Router();

const createSchema = z.object({
  title: z.string().min(1).max(200),
  sourceLabel: z.string().max(200),
  subject: z.string().max(50),
  mode: z.enum(["slideshow", "cinematic"]),
  requirement: z.string().max(2000),
  models: z.object({
    main: z.string(),
    tts: z.string().optional(),
    image: z.string().optional(),
    video: z.string().optional(),
  }),
  imageStyle: z.string().optional(),
  durationSec: z.number().int().positive().max(3600),
});

/** GET /api/videos — 列出全部视频 */
router.get("/", async (_req, res) => {
  const all = await listVideos();
  res.json(all);
});

/** GET /api/videos/:id */
router.get("/:id", async (req, res) => {
  const v = await getVideo(req.params.id);
  if (!v) return res.status(404).json({ error: "Not found" });
  res.json(v);
});

/** POST /api/videos — 创建并启动后台生成 */
router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.format() });
  }

  const now = Date.now();
  const mode = parsed.data.mode;

  // 根据模式定义生成步骤
  const steps: VideoGenStep[] =
    mode === "cinematic"
      ? [
          { id: "script", label: "生成脚本", status: "pending" },
          { id: "storyboard", label: "分镜设计", status: "pending" },
          { id: "scenes", label: "AI 生成场景画面", status: "pending" },
          { id: "video", label: "视频生成模型渲染", status: "pending" },
          { id: "voice", label: "AI 配音", status: "pending" },
          { id: "compose", label: "合成与转场", status: "pending" },
        ]
      : [
          { id: "slides", label: "生成幻灯片", status: "pending" },
          { id: "annotate", label: "添加圈点动画", status: "pending" },
          { id: "interact", label: "设置互动环节", status: "pending" },
          { id: "voice", label: "AI 配音", status: "pending" },
          { id: "compose", label: "组织合成", status: "pending" },
        ];

  const video: Video = {
    id: `vid_${now}_${Math.random().toString(36).slice(2, 8)}`,
    ...parsed.data,
    status: "queued",
    steps,
    createdAt: now,
  };

  await createVideo(video);
  await addActivity("video", video.title);

  // 启动后台生成（非阻塞）
  runGenerationInBackground(video.id, mode).catch((err) => {
    console.error(`[video] background generation failed for ${video.id}:`, err);
  });

  res.status(201).json(video);
});

/** DELETE /api/videos/:id */
router.delete("/:id", async (req, res) => {
  const ok = await deleteVideo(req.params.id);
  if (!ok) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

/**
 * 后台生成视频（模拟流程）。
 * 实际生产中应调用真实视频生成 API。
 * 这里逐步推进状态，让前端可轮询进度。
 */
async function runGenerationInBackground(videoId: string, mode: VideoMode): Promise<void> {
  const video = await getVideo(videoId);
  if (!video) return;

  // 标记为生成中
  await updateVideo(videoId, { status: "generating" });

  const stepDelay = mode === "cinematic" ? 2500 : 1800;

  for (let i = 0; i < video.steps.length; i++) {
    // 重新读取（可能被删除）
    const current = await getVideo(videoId);
    if (!current) return;
    if (current.status === "error") return;

    const steps = current.steps.map((s, idx) => {
      if (idx < i) return { ...s, status: "done" as const, progress: 100 };
      if (idx === i) return { ...s, status: "running" as const, progress: 50 };
      return s;
    });
    await updateVideo(videoId, { steps });

    // 模拟步骤执行
    await sleep(stepDelay);

    // 标记当前步骤完成
    const after = await getVideo(videoId);
    if (!after) return;
    const steps2 = after.steps.map((s, idx) => {
      if (idx <= i) return { ...s, status: "done" as const, progress: 100 };
      return s;
    });
    await updateVideo(videoId, { steps: steps2 });
  }

  // 生成完成
  await updateVideo(videoId, {
    status: "done",
    finishedAt: Date.now(),
    // 实际项目中这里会是真实视频 URL
    videoUrl: undefined,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default router;
