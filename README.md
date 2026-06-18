# Wisector LearnLM

基于 Next.js 构建的 AI 学习助手，面向学生和教师，提供智能对话、题目管理、视频创作和数据管理等一体化学习体验。

## 功能特性

### AI 对话
- 支持配置多个模型（OpenAI / Anthropic / Gemini 等）
- 未选择课本时锁定对话，引导用户先选择学习范围
- 快捷操作：撰写笔记、分析题目、创建任务跟踪器等

### 课本与题目管理
- 独立窗口选择课本
- 支持编辑课本和题目
- 题目支持 LaTeX 公式渲染（KaTeX）
- 题目可写入参考答案

### 视频创作
- 向导式创作流程：选择课本/题目 → 输入需求 → 选择模型
- 支持单选课本或「课本 + 题目」组合
- 配音 TTS 模型（speech-2.8-hd、gemini-3.1-flash-tts-preview）
- 图片生成模型（GPT Image 2、Nano Banana 2、Seedream 4）+ 风格选择
- 左侧栏显示已生成视频目录

### 数据管理
- 上传试卷/教辅图片
- AI 自动识别题目并入库
- 独立页面统一管理课本和题目

### 设置
- 个人偏好、通用配置
- 模型管理（对话 / 生图 / TTS 三类）
- 预设模型一键填入
- 完整移动端适配

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16.2 (App Router) |
| UI 库 | React 19 |
| 语言 | TypeScript 5.7 |
| 样式 | Tailwind CSS 3.4（Notion 风格设计系统） |
| 动画 | Framer Motion |
| 公式 | KaTeX |
| 图标 | Lucide React |

## 项目结构

```
├── app/                    # Next.js App Router 页面
│   ├── page.tsx            # 首页（对话）
│   ├── data/page.tsx       # 数据管理
│   └── video/page.tsx      # 视频创作
├── components/             # 通用组件
│   ├── ChatArea.tsx        # 对话区
│   ├── Sidebar.tsx         # 侧边栏导航
│   ├── TextbookSelector.tsx
│   ├── ModelSelector.tsx
│   ├── ModelsPanel.tsx     # 模型管理面板
│   ├── SettingsModal.tsx   # 设置弹窗
│   ├── Math.tsx            # LaTeX 块级公式
│   └── LaTeXText.tsx       # LaTeX 行内公式
├── lib/                    # 工具与类型
│   ├── api.ts
│   ├── types.ts
│   └── useModelConfigs.ts
└── server/                 # 后端服务
```

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
npm start
```

### 代码检查

```bash
npm run lint
```

## 环境变量

在项目根目录创建 `.env.local` 文件：

```env
# API 配置（按需填写）
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
```

## 许可证

私有项目，版权所有 © Wisector。