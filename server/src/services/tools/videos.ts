import type { ToolDef } from "../../types";
import {
  listVideos,
  getVideo,
  createVideo,
  updateVideo,
  deleteVideo,
} from "../videoStore";
import { addActivity } from "../activityStore";
import type { Video, VideoMode, VideoStatus } from "../../types/video";

/**
 * 视频管理工具：基于持久化 videoStore，支持查看 / 创建 / 编辑 / 删除视频。
 */
const MODE_VALUES: VideoMode[] = ["slideshow", "cinematic"];

function summarize(v: Video) {
  return {
    id: v.id,
    title: v.title,
    subject: v.subject,
    sourceLabel: v.sourceLabel,
    mode: v.mode,
    durationSec: v.durationSec,
    status: v.status,
    models: v.models,
    createdAt: v.createdAt,
    finishedAt: v.finishedAt,
    error: v.error,
  };
}

export const videoList: ToolDef = {
  name: "video_list",
  description:
    "列出所有已创建的视频，返回每条视频的概要（ID、标题、学科、模式、时长、状态、模型配置）。",
  icon: "video",
  requiresWebAccess: false,
  parameters: { type: "object", properties: {} },
  async execute() {
    const all = await listVideos();
    if (all.length === 0) return "暂无视频。";
    return JSON.stringify(all.map(summarize), null, 2);
  },
};

export const videoGet: ToolDef = {
  name: "video_get",
  description: "按 ID 读取一条视频的完整信息。",
  icon: "video",
  requiresWebAccess: false,
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "视频 ID" },
    },
    required: ["id"],
  },
  async execute(args) {
    const id = String(args.id || "");
    const v = await getVideo(id);
    if (!v) return `未找到视频：${id}`;
    return JSON.stringify(v, null, 2);
  },
};

export const videoCreate: ToolDef = {
  name: "video_create",
  description:
    "创建一条视频记录（仅创建元数据，不触发实际渲染）。需提供 title、subject、sourceLabel、mode（slideshow/cinematic）、requirement、models（main 必填）、durationSec。",
  icon: "video",
  requiresWebAccess: false,
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "视频标题" },
      subject: { type: "string", description: "学科" },
      sourceLabel: { type: "string", description: "关联课本/题目标签" },
      mode: { type: "string", enum: MODE_VALUES, description: "生成模式" },
      requirement: { type: "string", description: "用户需求描述" },
      models: {
        type: "object",
        description: "模型配置，main 必填；可选 tts/image/video",
        properties: {
          main: { type: "string" },
          tts: { type: "string" },
          image: { type: "string" },
          video: { type: "string" },
        },
      },
      imageStyle: { type: "string", description: "图片风格（可选）" },
      durationSec: { type: "number", description: "时长（秒）" },
    },
    required: ["title", "subject", "sourceLabel", "mode", "requirement", "models", "durationSec"],
  },
  async execute(args) {
    const title = String(args.title || "").trim();
    const subject = String(args.subject || "").trim();
    const sourceLabel = String(args.sourceLabel || "").trim();
    const mode = String(args.mode || "") as VideoMode;
    const requirement = String(args.requirement || "").trim();
    const durationSec = Number(args.durationSec || 0);
    const models = (args.models as Video["models"]) || { main: "" };

    if (!title || !subject || !sourceLabel || !requirement || !durationSec) {
      return "创建失败：title / subject / sourceLabel / requirement / durationSec 均不能为空。";
    }
    if (!MODE_VALUES.includes(mode)) {
      return `创建失败：mode 必须是 ${MODE_VALUES.join("/")} 之一。`;
    }
    if (!models.main) {
      return "创建失败：models.main 不能为空。";
    }

    const now = Date.now();
    const video: Video = {
      id: `video_${now}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      sourceLabel,
      subject,
      mode,
      requirement,
      models,
      imageStyle: args.imageStyle ? String(args.imageStyle) : undefined,
      durationSec,
      status: "queued" as VideoStatus,
      steps: [
        { id: "plan", label: "规划脚本", status: "pending" },
        { id: "content", label: "生成内容", status: "pending" },
        { id: "render", label: "渲染输出", status: "pending" },
      ],
      createdAt: now,
    };

    await createVideo(video);
    await addActivity("video", video.title);
    return `视频已创建（ID: ${video.id}）：\n${JSON.stringify(summarize(video), null, 2)}`;
  },
};

export const videoUpdate: ToolDef = {
  name: "video_update",
  description:
    "按 ID 更新视频字段。可更新 title、subject、sourceLabel、mode、requirement、models、imageStyle、durationSec、status 等。",
  icon: "video",
  requiresWebAccess: false,
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "视频 ID" },
      title: { type: "string" },
      subject: { type: "string" },
      sourceLabel: { type: "string" },
      mode: { type: "string", enum: MODE_VALUES },
      requirement: { type: "string" },
      models: { type: "object" },
      imageStyle: { type: "string" },
      durationSec: { type: "number" },
      status: { type: "string", enum: ["queued", "generating", "done", "error"] },
    },
    required: ["id"],
  },
  async execute(args) {
    const id = String(args.id || "");
    const patch: Partial<Video> = {};
    if (args.title) patch.title = String(args.title);
    if (args.subject) patch.subject = String(args.subject);
    if (args.sourceLabel) patch.sourceLabel = String(args.sourceLabel);
    if (args.mode && MODE_VALUES.includes(args.mode as VideoMode))
      patch.mode = args.mode as VideoMode;
    if (args.requirement) patch.requirement = String(args.requirement);
    if (args.models) patch.models = args.models as Video["models"];
    if (args.imageStyle) patch.imageStyle = String(args.imageStyle);
    if (args.durationSec) patch.durationSec = Number(args.durationSec);
    if (args.status)
      patch.status = args.status as VideoStatus;

    const updated = await updateVideo(id, patch);
    if (!updated) return `未找到视频：${id}`;
    return `视频已更新：\n${JSON.stringify(summarize(updated), null, 2)}`;
  },
};

export const videoDelete: ToolDef = {
  name: "video_delete",
  description: "按 ID 删除一条视频。",
  icon: "video",
  requiresWebAccess: false,
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "视频 ID" },
    },
    required: ["id"],
  },
  async execute(args) {
    const id = String(args.id || "");
    const ok = await deleteVideo(id);
    if (!ok) return `未找到视频：${id}`;
    return `视频已删除：${id}`;
  },
};
