import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";
import "./globals.css";
import ClientProvider from "@/components/ClientProvider";

export const metadata: Metadata = {
  title: "Wisector LearnLM",
  description: "AI 学习平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <ClientProvider>{children}</ClientProvider>
      </body>
    </html>
  );
}
