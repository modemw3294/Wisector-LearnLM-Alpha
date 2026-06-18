"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import SettingsModal from "@/components/SettingsModal";

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <main className="flex h-screen bg-notion-bg overflow-hidden">
      {/* 桌面端：固定侧边栏 */}
      <Sidebar
        onOpenSettings={() => setIsSettingsOpen(true)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <ChatArea
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </main>
  );
}
