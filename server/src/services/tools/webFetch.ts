import type { ToolDef } from "../../types";

/**
 * 网页抓取工具：抓取指定 URL 的页面文本内容。
 * 用于在 web_search 之后深入读取某篇文章。
 */
export const webFetch: ToolDef = {
  name: "web_fetch",
  description:
    "抓取指定网页 URL 的内容，返回纯文本（去除 HTML 标签）。用于读取搜索结果中某个链接的详细内容。",
  icon: "globe",
  requiresWebAccess: true,
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "要抓取的网页 URL" },
    },
    required: ["url"],
  },
  async execute(args) {
    const url = String(args.url || "").trim();
    if (!url) return "抓取失败：缺少 URL。";

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return `抓取失败：HTTP ${res.status}`;

    const html = await res.text();
    // 简易 HTML → 纯文本转换
    const text = html
      // 移除脚本与样式
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      // 将块级元素转为换行
      .replace(/<(?:p|div|br|h[1-6]|li|tr)[^>]*>/gi, "\n")
      // 移除所有标签
      .replace(/<[^>]+>/g, "")
      // 解码常见实体
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // 压缩空白
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // 截断，避免过长
    const truncated = text.length > 4000 ? text.slice(0, 4000) + "\n…（已截断）" : text;
    return truncated || "页面无可用文本内容。";
  },
};
