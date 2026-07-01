import type { ToolDef } from "../../types";
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
} from "../noteStore";
import { addActivity } from "../activityStore";

/**
 * 笔记管理工具：基于持久化 noteStore，支持查看 / 创建 / 编辑 / 删除学习笔记。
 */
export const noteList: ToolDef = {
  name: "note_list",
  description: "列出所有已保存的学习笔记，返回标题与 ID 列表。",
  icon: "file-text",
  requiresWebAccess: false,
  parameters: { type: "object", properties: {} },
  async execute() {
    const all = await listNotes();
    if (all.length === 0) return "暂无笔记。";
    const rows = all.map((n) => ({
      id: n.id,
      title: n.title,
      updatedAt: n.updatedAt,
    }));
    return JSON.stringify(rows, null, 2);
  },
};

export const noteCreate: ToolDef = {
  name: "note_create",
  description: "创建一条新的学习笔记。需要提供标题和内容（支持 Markdown）。",
  icon: "file-text",
  requiresWebAccess: false,
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "笔记标题" },
      content: { type: "string", description: "笔记正文（支持 Markdown）" },
    },
    required: ["title", "content"],
  },
  async execute(args) {
    const title = String(args.title || "").trim();
    const content = String(args.content || "").trim();
    if (!title || !content) return "创建失败：标题和内容不能为空。";

    const note = await createNote({ title, content });
    await addActivity("note", note.title);
    return `笔记已创建（ID: ${note.id}）：\n${JSON.stringify(note, null, 2)}`;
  },
};

export const noteRead: ToolDef = {
  name: "note_read",
  description: "按 ID 读取一条笔记的完整内容。",
  icon: "file-text",
  requiresWebAccess: false,
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "笔记 ID" },
    },
    required: ["id"],
  },
  async execute(args) {
    const id = String(args.id || "");
    const note = await getNote(id);
    if (!note) return `未找到笔记：${id}`;
    return JSON.stringify(note, null, 2);
  },
};

export const noteUpdate: ToolDef = {
  name: "note_update",
  description: "按 ID 更新一条笔记的标题或内容。未提供的字段保持不变。",
  icon: "file-text",
  requiresWebAccess: false,
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "笔记 ID" },
      title: { type: "string", description: "新标题（可选）" },
      content: { type: "string", description: "新内容（可选）" },
    },
    required: ["id"],
  },
  async execute(args) {
    const id = String(args.id || "");
    const patch: { title?: string; content?: string } = {};
    if (args.title) patch.title = String(args.title);
    if (args.content) patch.content = String(args.content);

    const updated = await updateNote(id, patch);
    if (!updated) return `未找到笔记：${id}`;
    return `笔记已更新：\n${JSON.stringify(updated, null, 2)}`;
  },
};

export const noteDelete: ToolDef = {
  name: "note_delete",
  description: "按 ID 删除一条笔记。",
  icon: "file-text",
  requiresWebAccess: false,
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "笔记 ID" },
    },
    required: ["id"],
  },
  async execute(args) {
    const id = String(args.id || "");
    const ok = await deleteNote(id);
    if (!ok) return `未找到笔记：${id}`;
    return `笔记已删除：${id}`;
  },
};
