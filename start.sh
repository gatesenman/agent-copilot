#!/usr/bin/env bash
# ============================================================
#  Agent Copilot - 一键启动 (macOS / Linux)
#  用法: ./start.sh   （或 macOS 双击 start.command）
# ============================================================
set -u

# 始终切到脚本所在目录（兼容双击 / 任意路径调用 / 符号链接）
cd "$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)" || exit 1

BLUE=$'\033[34m'; GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; NC=$'\033[0m'

fail() {
  echo ""
  echo "${RED}启动失败：$1${NC}"
  echo "请根据上方提示修复环境后重新运行本脚本。"
  # 双击运行时窗口不要直接关掉
  read -r -p "按回车键退出 ..." _ || true
  exit 1
}

echo "============================================"
echo "  Agent Copilot | 企业级 AI UI Kit 一键启动"
echo "  (macOS / Linux)"
echo "============================================"
echo ""

# ---------- 1. 检查 Node.js ----------
echo "[1/4] 检查 Node.js ..."
if ! command -v node >/dev/null 2>&1; then
  echo "  ${RED}[错误]${NC} 未检测到 Node.js"
  echo "  请先安装 Node.js 18+：https://nodejs.org/ （或 brew install node）"
  fail "缺少 Node.js"
fi
NODE_VER="$(node -v 2>/dev/null || echo v0)"
NODE_MAJOR="${NODE_VER#v}"; NODE_MAJOR="${NODE_MAJOR%%.*}"
case "$NODE_MAJOR" in (''|*[!0-9]*) NODE_MAJOR=0;; esac
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "  ${RED}[错误]${NC} Node.js 版本过低：$NODE_VER（需要 18+）"
  fail "Node.js 版本过低"
fi
echo "  ${GREEN}[通过]${NC} Node.js $NODE_VER"

# ---------- 2. 检查 pnpm ----------
echo "[2/4] 检查 pnpm ..."
if ! command -v pnpm >/dev/null 2>&1; then
  echo "  ${YELLOW}[提示]${NC} 未检测到 pnpm，尝试通过 corepack 启用 ..."
  corepack enable pnpm >/dev/null 2>&1 || true
fi
if ! command -v pnpm >/dev/null 2>&1; then
  echo "  ${YELLOW}[提示]${NC} corepack 不可用，尝试 npm 全局安装 pnpm ..."
  npm install -g pnpm || true
fi
command -v pnpm >/dev/null 2>&1 || fail "pnpm 安装失败，请手动执行: npm install -g pnpm"
echo "  ${GREEN}[通过]${NC} pnpm $(pnpm -v)"

# ---------- 3. 检查依赖 ----------
echo "[3/4] 检查项目依赖 ..."
if [ -d node_modules ]; then
  echo "  ${GREEN}[通过]${NC} 依赖已就绪"
else
  echo "  ${YELLOW}[提示]${NC} node_modules 不存在，开始安装依赖（首次约 1-3 分钟）..."
  pnpm install || fail "依赖安装失败，请检查网络后重试"
  echo "  ${GREEN}[通过]${NC} 依赖安装完成"
fi

# ---------- 4. 检查端口并启动 ----------
echo "[4/4] 检查端口 3000 ..."
port_in_use() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1
  elif command -v ss >/dev/null 2>&1; then
    ss -ltn 2>/dev/null | grep -q ':3000 '
  else
    return 1
  fi
}
open_browser() {
  if command -v open >/dev/null 2>&1; then open "$1"        # macOS
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1"  # Linux
  fi
}

if port_in_use; then
  echo "  ${YELLOW}[提示]${NC} 端口 3000 已被占用，可能已有实例在运行"
  echo "  直接打开浏览器访问 http://localhost:3000"
  open_browser "http://localhost:3000"
  read -r -p "按回车键退出 ..." _ || true
  exit 0
fi
echo "  ${GREEN}[通过]${NC} 端口可用"
echo ""
echo "============================================"
echo "  环境检查全部通过，正在启动开发服务器 ..."
echo "  启动后访问: ${BLUE}http://localhost:3000${NC}"
echo "  按 Ctrl+C 可停止服务"
echo "============================================"
echo ""

# 3 秒后自动打开浏览器（等待 Vite 就绪），失败不影响主流程
( sleep 3; open_browser "http://localhost:3000" ) >/dev/null 2>&1 &

pnpm dev
