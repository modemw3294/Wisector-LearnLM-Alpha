import type { ToolDef } from "../../types";

/**
 * 网页搜索工具：使用 DuckDuckGo Instant Answer API（无需 API Key）。
 * 返回相关摘要与外链，供模型引用。
 */
export const webSearch: ToolDef = {
  name: "web_search",
  description:
    "在互联网上搜索信息。当用户询问最新资讯、你不确定的事实，或需要引用网络资源时使用。返回搜索结果的标题、摘要与链接。",
  icon: "search",
  requiresWebAccess: true,
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "搜索关键词",
      },
    },
    required: ["query"],
  },
  async execute(args) {
    const query = String(args.query || "").trim();
    if (!query) return "搜索失败：缺少查询关键词。";

    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
      query
    )}&format=json&no_html=1&skip_disambig=1&t=wisector-learnlm`;

    const res = await fetch(url, {
      headers: { "User-Agent": "WisectorLearnLM/1.0" },
    });
    if (!res.ok) return `搜索失败：HTTP ${res.status}`;

    const data: any = await res.json();

    const results: string[] = [];
    if (data.AbstractText) {
      results.push(
        `【摘要】${data.AbstractText}\n来源：${data.AbstractSource || "DuckDuckGo"}\n链接：${data.AbstractURL || ""}`
      );
    }
    if (Array.isArray(data.RelatedTopics)) {
      const topics = data.RelatedTopics.slice(0, 5);
      for (const t of topics) {
        if (t.Text) {
          results.push(`• ${t.Text}${t.FirstURL ? `\n  链接：${t.FirstURL}` : ""}`);
        }
      }
    }

    if (results.length === 0) {
      // 回退：提供一个可直接搜索的链接
      return `未找到即时答案。可参考搜索页面：https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    }
    return results.join("\n\n");
  },
};
