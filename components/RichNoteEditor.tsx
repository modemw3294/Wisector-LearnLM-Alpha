"use client";

import { useCallback, useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import type { Editor } from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon,
  Link,
  CheckSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Minus,
  Undo2,
  Redo2,
} from "lucide-react";

const lowlight = createLowlight(common);

interface RichNoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  onAISelect?: (selectedText: string) => void;
  readOnly?: boolean;
}

function MenuButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
        active
          ? "bg-accent-light/60 text-accent"
          : "text-notion-text2 hover:bg-notion-overlay2 hover:text-notion-text"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-notion-border shrink-0" />;
}

export default function RichNoteEditor({
  content,
  onChange,
  onAISelect,
  readOnly = false,
}: RichNoteEditorProps) {
  const [editorReady, setEditorReady] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      Markdown.configure({
        indentation: { style: "space", size: 2 },
      }),
      Placeholder.configure({
        placeholder: "开始写笔记…（支持 Markdown 快捷语法）",
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-600 underline cursor-pointer hover:text-blue-800" },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: content || "",
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      const md = (ed.storage.markdown as any)?.getMarkdown?.() ?? ed.getHTML();
      onChange(md);
    },
  });

  // 当外部 content 变化时更新编辑器（仅当编辑器准备好且内容不同时）
  useEffect(() => {
    if (!editor) return;
    if (!editorReady) {
      setEditorReady(true);
      return;
    }
    const currentMd = (editor.storage.markdown as any)?.getMarkdown?.() ?? "";
    if (content !== currentMd) {
      editor.commands.setContent(content || "");
    }
  }, [content, editor, editorReady]);

  // 选中文字时弹出 AI 工具栏（预留）
  const handleSelectionChange = useCallback(() => {
    if (!editor || !onAISelect) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      const selectedText = editor.state.doc.textBetween(from, to, " ").trim();
      if (selectedText.length > 0) {
        // 预留：选中文字通过 onAISelect 传到上层
        // 实际使用 AIAssistModal 弹出窗口，由父组件处理
      }
    }
  }, [editor, onAISelect]);

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("输入链接地址：", "https://");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-notion-border bg-white/60 backdrop-blur-sm shrink-0 overflow-x-auto flex-wrap">
        {/* 撤销/重做 */}
        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          title="撤销"
        >
          <Undo2 className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          title="重做"
        >
          <Redo2 className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>

        <Divider />

        {/* 标题 */}
        <MenuButton
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="一级标题"
        >
          <Heading1 className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
        <MenuButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="二级标题"
        >
          <Heading2 className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
        <MenuButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="三级标题"
        >
          <Heading3 className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>

        <Divider />

        {/* 文字样式 */}
        <MenuButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="加粗"
        >
          <Bold className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
        <MenuButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="斜体"
        >
          <Italic className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
        <MenuButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="下划线"
        >
          <UnderlineIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
        <MenuButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="删除线"
        >
          <Strikethrough className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
        <MenuButton
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          title="高亮"
        >
          <Highlighter className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
        <MenuButton
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="行内代码"
        >
          <Code className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>

        <Divider />

        {/* 段落/列表 */}
        <MenuButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="无序列表"
        >
          <List className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
        <MenuButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="有序列表"
        >
          <ListOrdered className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
        <MenuButton
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          title="任务列表"
        >
          <CheckSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
        <MenuButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="引用"
        >
          <Quote className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
        <MenuButton
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="代码块"
        >
          <Code className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>

        <Divider />

        {/* 对齐方式 */}
        <MenuButton
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          title="左对齐"
        >
          <AlignLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
        <MenuButton
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          title="居中"
        >
          <AlignCenter className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
        <MenuButton
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          title="右对齐"
        >
          <AlignRight className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>

        <Divider />

        {/* 表格 / 链接 / 分隔线 */}
        <MenuButton
          active={editor.isActive("table")}
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          title="插入表格"
        >
          <TableIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
        <MenuButton
          active={editor.isActive("link")}
          onClick={addLink}
          title="插入链接"
        >
          <Link className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="分隔线"
        >
          <Minus className="w-3.5 h-3.5" strokeWidth={1.75} />
        </MenuButton>
      </div>

      {/* 编辑器内容区 */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none p-4 min-h-full focus:outline-none
            [&_.ProseMirror]:outline-none
            [&_.ProseMirror_p]:my-1.5
            [&_.ProseMirror_h1]:text-xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:my-3
            [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:my-2
            [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:my-1.5
            [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5
            [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5
            [&_.ProseMirror_li]:my-0.5
            [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-gray-300 [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-gray-600
            [&_.ProseMirror_pre]:bg-gray-100 [&_.ProseMirror_pre]:rounded-md [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:text-sm [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:overflow-x-auto
            [&_.ProseMirror_code]:bg-gray-100 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:text-sm [&_.ProseMirror_code]:font-mono
            [&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0
            [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full
            [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-gray-300 [&_.ProseMirror_th]:px-2 [&_.ProseMirror_th]:py-1 [&_.ProseMirror_th]:bg-gray-50 [&_.ProseMirror_th]:text-left [&_.ProseMirror_th]:font-semibold
            [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-gray-300 [&_.ProseMirror_td]:px-2 [&_.ProseMirror_td]:py-1
            [&_.ProseMirror_hr]:my-4 [&_.ProseMirror_hr]:border-gray-300
            [&_.ProseMirror_a]:text-blue-600 [&_.ProseMirror_a]:underline
            [&_.ProseMirror_ul[data-type='taskList']]:list-none [&_.ProseMirror_ul[data-type='taskList']]:pl-0
            [&_.ProseMirror_li[data-type='taskItem']]:flex [&_.ProseMirror_li[data-type='taskItem']]:items-start [&_.ProseMirror_li[data-type='taskItem']]:gap-1.5
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-notion-text4 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0
          "
        />
      </div>
    </div>
  );
}