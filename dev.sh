#!/bin/bash
set -e

# 获取脚本所在目录（前端项目根目录）
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR"
BACKEND_DIR="$ROOT_DIR/server"

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}[dev] Wisector LearnLM — 一键启动前后端${NC}"

# ---------------- 后端 ----------------
if [ ! -d "$BACKEND_DIR" ]; then
  echo "[dev] 错误：找不到后端目录 $BACKEND_DIR"
  exit 1
fi

cd "$BACKEND_DIR"
if [ ! -d "node_modules" ]; then
  echo -e "${BLUE}[dev] 安装后端依赖...${NC}"
  npm install
fi
echo -e "${BLUE}[dev] 启动后端（http://localhost:3001）...${NC}"
npm run dev &
BACKEND_PID=$!

# ---------------- 前端 ----------------
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
  echo -e "${BLUE}[dev] 安装前端依赖...${NC}"
  npm install
fi
echo -e "${BLUE}[dev] 启动前端（http://localhost:3000）...${NC}"
npm run dev &
FRONTEND_PID=$!

# ---------------- 退出处理 ----------------
cleanup() {
  echo -e "${GREEN}[dev] 正在停止前后端...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  wait 2>/dev/null
}
trap cleanup EXIT INT TERM

echo -e "${GREEN}[dev] 前后端已启动：${NC}"
echo -e "  - 前端:  http://localhost:3000"
echo -e "  - 后端:  http://localhost:3001"
echo -e "${GREEN}[dev] 按 Ctrl+C 停止全部${NC}"

wait
