"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface MenuItem {
  label?: string;
  shortcut?: string;
  divider?: boolean;
  disabled?: boolean;
  action?: () => void;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export default function MenuBar({
  menus,
  onNewChat,
  onNewNote,
  onToggleSidebar,
  onToggleNotesSidebar,
  onOpenSettings,
}: {
  menus: MenuGroup[];
  onNewChat?: () => void;
  onNewNote?: () => void;
  onToggleSidebar?: () => void;
  onToggleNotesSidebar?: () => void;
  onOpenSettings?: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAction = (item: MenuItem) => {
    setOpenMenu(null);
    if (item.disabled) return;
    item.action?.();
  };

  return (
    <div
      ref={barRef}
      className="flex items-center h-7 bg-notion-sidebar border-b border-notion-border px-1 select-none shrink-0"
    >
      {/* 左侧菜单 */}
      {menus.map((group) => (
        <div key={group.label} className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === group.label ? null : group.label)}
            onMouseEnter={() => {
              // 如果已有菜单打开，hover 到另一个菜单时自动切换
              if (openMenu) setOpenMenu(group.label);
            }}
            className={`h-7 px-2.5 rounded text-xs font-medium transition-colors ${
              openMenu === group.label
                ? "bg-accent-light/60 text-accent"
                : "text-notion-text2 hover:bg-notion-overlay2 hover:text-notion-text"
            }`}
          >
            {group.label}
          </button>

          <AnimatePresence>
            {openMenu === group.label && (
              <motion.div
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.1 }}
                className="absolute top-full left-0 mt-0.5 w-52 bg-white rounded-lg shadow-xl border border-notion-border overflow-hidden py-1 z-50"
                onMouseEnter={() => setOpenMenu(group.label)}
              >
                {group.items.map((item, idx) => {
                  if (item.divider) {
                    return <div key={idx} className="h-px bg-notion-border my-1" />;
                  }
                  return (
                    <button
                      key={item.label}
                      onClick={() => handleAction(item)}
                      disabled={item.disabled}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                        item.disabled
                          ? "text-notion-text4 cursor-not-allowed"
                          : "text-notion-text hover:bg-notion-overlay2"
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="text-[10px] text-notion-text4 ml-4">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {/* 右侧窗口控制 */}
      <div className="flex-1" />
    </div>
  );
}

/** 构建笔记页面的菜单配置 */
export function buildNotesMenuBar({
  onNewNote,
  onNewChat,
  onToggleSidebar,
  onToggleNotesSidebar,
  onOpenSettings,
}: {
  onNewNote: () => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
  onToggleNotesSidebar: () => void;
  onOpenSettings: () => void;
}): MenuGroup[] {
  return [
    {
      label: "文件(F)",
      items: [
        { label: "新建笔记", shortcut: "⌘N", action: onNewNote },
        { label: "新建对话", shortcut: "⌘⇧N", action: onNewChat },
        { divider: true },
        { label: "设置", shortcut: "⌘,", action: onOpenSettings },
      ],
    },
    {
      label: "编辑(E)",
      items: [
        { label: "撤销", shortcut: "⌘Z", disabled: true },
        { label: "重做", shortcut: "⌘⇧Z", disabled: true },
        { divider: true },
        { label: "剪切", shortcut: "⌘X", disabled: true },
        { label: "复制", shortcut: "⌘C", disabled: true },
        { label: "粘贴", shortcut: "⌘V", disabled: true },
      ],
    },
    {
      label: "视图(V)",
      items: [
        { label: "切换主侧边栏", shortcut: "⌘B", action: onToggleSidebar },
        { label: "切换笔记列表", shortcut: "⌘⇧B", action: onToggleNotesSidebar },
      ],
    },
  ];
}