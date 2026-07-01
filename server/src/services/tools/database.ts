import type { ToolDef } from "../../types";
import {
  listTextbooks,
  createTextbook,
  updateTextbook,
  deleteTextbook,
  listCollections,
  createCollection,
  deleteCollection,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "../dataStore";

/**
 * 数据库工具：基于持久化 dataStore，支持课本 / 题目合集 / 题目的查看与增删改。
 *
 * 集合类型：
 *  - textbooks  课本
 *  - collections 题目合集
 *  - questions  题目
 */
type CollectionName = "textbooks" | "collections" | "questions";

function isValidCollection(name: string): name is CollectionName {
  return name === "textbooks" || name === "collections" || name === "questions";
}

export const dbRead: ToolDef = {
  name: "db_read",
  description:
    "读取数据库中指定集合的数据。支持 collection：textbooks（课本）、collections（题目合集）、questions（题目）。可按 ID 查询单条记录，或返回全部列表。",
  icon: "database",
  requiresWebAccess: false,
  parameters: {
    type: "object",
    properties: {
      collection: {
        type: "string",
        enum: ["textbooks", "collections", "questions"],
        description: "要查询的集合名称",
      },
      id: { type: "string", description: "可选，按 ID 查询单条记录" },
    },
    required: ["collection"],
  },
  async execute(args) {
    const col = String(args.collection || "");
    if (!isValidCollection(col)) {
      return `不支持的集合：${col}（可选：textbooks / collections / questions）`;
    }
    const id = args.id ? String(args.id) : undefined;

    if (col === "textbooks") {
      const all = await listTextbooks();
      if (id) {
        const r = all.find((t) => t.id === id);
        return r ? JSON.stringify(r, null, 2) : `未找到记录：${id}`;
      }
      return all.length === 0
        ? "集合「textbooks」为空。"
        : JSON.stringify(all, null, 2);
    }
    if (col === "collections") {
      const all = await listCollections();
      if (id) {
        const r = all.find((c) => c.id === id);
        return r ? JSON.stringify(r, null, 2) : `未找到记录：${id}`;
      }
      return all.length === 0
        ? "集合「collections」为空。"
        : JSON.stringify(all, null, 2);
    }
    // questions
    const all = await listQuestions();
    if (id) {
      const r = all.find((q) => q.id === id);
      return r ? JSON.stringify(r, null, 2) : `未找到记录：${id}`;
    }
    return all.length === 0
      ? "集合「questions」为空。"
      : JSON.stringify(all, null, 2);
  },
};

export const dbWrite: ToolDef = {
  name: "db_write",
  description:
    "向数据库中写入或更新记录。支持 collection：textbooks（课本）、collections（题目合集）、questions（题目）。提供 id 时更新已有记录，否则创建新记录。data 为对应字段的对象。",
  icon: "database",
  requiresWebAccess: false,
  parameters: {
    type: "object",
    properties: {
      collection: {
        type: "string",
        enum: ["textbooks", "collections", "questions"],
        description: "要写入的集合名称",
      },
      id: { type: "string", description: "可选，更新已有记录时指定 ID" },
      data: {
        type: "object",
        description:
          "要写入的数据。textbooks: name/subject/grade/chapters；collections: name/sourceFile/subject；questions: title/subject/type/difficulty/answer/collectionId",
      },
    },
    required: ["collection", "data"],
  },
  async execute(args) {
    const col = String(args.collection || "");
    if (!isValidCollection(col)) {
      return `不支持的集合：${col}（可选：textbooks / collections / questions）`;
    }
    const data = (args.data as Record<string, any>) || {};
    const id = args.id ? String(args.id) : undefined;

    if (col === "textbooks") {
      if (id) {
        const updated = await updateTextbook(id, data);
        return updated
          ? `已更新「textbooks」：\n${JSON.stringify(updated, null, 2)}`
          : `未找到记录：${id}`;
      }
      const created = await createTextbook({
        name: String(data.name || "未命名课本"),
        subject: String(data.subject || ""),
        grade: String(data.grade || ""),
        chapters: Number(data.chapters) || 0,
        uploadedAt: new Date().toISOString(),
      });
      return `已创建「textbooks」：\n${JSON.stringify(created, null, 2)}`;
    }
    if (col === "collections") {
      if (id) {
        // collections 不支持更新，仅提示
        return `合集不支持更新，请删除后重建。ID: ${id}`;
      }
      const created = await createCollection({
        name: String(data.name || "未命名合集"),
        sourceFile: String(data.sourceFile || ""),
        subject: String(data.subject || ""),
        questionCount: 0,
        uploadedAt: new Date().toISOString(),
      });
      return `已创建「collections」：\n${JSON.stringify(created, null, 2)}`;
    }
    // questions
    if (id) {
      const updated = await updateQuestion(id, data);
      return updated
        ? `已更新「questions」：\n${JSON.stringify(updated, null, 2)}`
        : `未找到记录：${id}`;
    }
    const created = await createQuestion({
      title: String(data.title || ""),
      subject: String(data.subject || ""),
      type: data.type || "选择题",
      difficulty: data.difficulty || "中等",
      answer: data.answer ? String(data.answer) : undefined,
      collectionId: data.collectionId ? String(data.collectionId) : undefined,
      updatedAt: new Date().toISOString(),
    });
    return `已创建「questions」：\n${JSON.stringify(created, null, 2)}`;
  },
};

export const dbDelete: ToolDef = {
  name: "db_delete",
  description:
    "从数据库中删除指定记录。支持 collection：textbooks（课本）、collections（题目合集）、questions（题目）。",
  icon: "database",
  requiresWebAccess: false,
  parameters: {
    type: "object",
    properties: {
      collection: {
        type: "string",
        enum: ["textbooks", "collections", "questions"],
        description: "要删除的集合名称",
      },
      id: { type: "string", description: "要删除的记录 ID" },
    },
    required: ["collection", "id"],
  },
  async execute(args) {
    const col = String(args.collection || "");
    if (!isValidCollection(col)) {
      return `不支持的集合：${col}（可选：textbooks / collections / questions）`;
    }
    const id = String(args.id || "");

    let ok = false;
    if (col === "textbooks") ok = await deleteTextbook(id);
    else if (col === "collections") ok = await deleteCollection(id);
    else ok = await deleteQuestion(id);

    return ok ? `已从「${col}」中删除记录：${id}` : `未找到记录：${id}`;
  },
};
