import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-notion-bg flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold text-notion-text tracking-tight mb-4">
          404
        </div>
        <h1 className="text-xl font-semibold text-notion-text mb-2">
          页面未找到
        </h1>
        <p className="text-sm text-notion-text3 mb-8">
          你访问的页面不存在或已被移动。请返回首页继续使用。
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-notion-text text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          返回首页
        </Link>
      </div>
    </main>
  );
}
