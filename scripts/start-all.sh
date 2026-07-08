#!/usr/bin/env bash
# =============================================================
# 一键启动脚本 — Agent Copilot 组件库
#
# 启动内容:
#   1. Java Mock 后端 (Spring WebFlux, :8080) — 16 种协议端点
#   2. 前端演示站   (Vite + Vue 3,     :3000)
#
# 用法:
#   bash scripts/start-all.sh          # 启动全部服务
#   bash scripts/start-all.sh --stop   # 停止全部服务
#   bash scripts/start-all.sh --status # 查看服务状态
#
# 日志: logs/backend.log / logs/frontend.log
# =============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/logs"
JAR="$ROOT/java-backend/target/agent-copilot-backend-1.0.0.jar"
FRONT_PORT=3000
BACK_PORT=8080

mkdir -p "$LOG_DIR"

# ---------- 工具函数 ----------

port_pid() {
  # 返回监听指定端口的 PID(无则为空)
  ss -tlnp 2>/dev/null | grep ":$1 " | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2 || true
}

wait_http() {
  # wait_http <url> <名称> <最大等待秒数>
  local url="$1" name="$2" max="$3" i=0
  while [ "$i" -lt "$max" ]; do
    if [ "$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null)" = "200" ]; then
      echo "  [OK] $name 已就绪: $url"
      return 0
    fi
    i=$((i + 2)); sleep 2
  done
  echo "  [FAIL] $name 在 ${max}s 内未就绪: $url"
  return 1
}

stop_all() {
  echo "==> 停止全部服务"
  for port in $FRONT_PORT $BACK_PORT; do
    local_pid="$(port_pid "$port")"
    if [ -n "$local_pid" ]; then
      kill "$local_pid" 2>/dev/null || true
      echo "  [OK] 已停止端口 :$port (pid $local_pid)"
    else
      echo "  [--] 端口 :$port 无运行进程"
    fi
  done
}

status_all() {
  echo "==> 服务状态"
  f="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$FRONT_PORT/" 2>/dev/null || echo 000)"
  b="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$BACK_PORT/api/mock/health" 2>/dev/null || echo 000)"
  echo "  前端演示站  :$FRONT_PORT -> HTTP $f $([ "$f" = 200 ] && echo '(运行中)' || echo '(未运行)')"
  echo "  Java 后端   :$BACK_PORT -> HTTP $b $([ "$b" = 200 ] && echo '(运行中)' || echo '(未运行)')"
}

# ---------- 参数分发 ----------

case "${1:-}" in
  --stop)   stop_all;   exit 0 ;;
  --status) status_all; exit 0 ;;
esac

echo "============================================="
echo " Agent Copilot 一键启动"
echo "============================================="

# ---------- 0. 环境自检 ----------

echo "==> 环境自检"

if ! command -v java >/dev/null 2>&1; then
  echo "  [..] 未找到 java,尝试安装 Amazon Corretto 21"
  sudo -n dnf install -y java-21-amazon-corretto-headless >/dev/null 2>&1 \
    || { echo "  [FAIL] java 安装失败,请手动安装 JDK 21"; exit 1; }
fi
echo "  [OK] java: $(java -version 2>&1 | head -1)"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "  [FAIL] 未找到 pnpm,请先安装 (npm i -g pnpm)"; exit 1
fi
echo "  [OK] pnpm: $(pnpm --version)"

if [ ! -d "$ROOT/node_modules" ]; then
  echo "  [..] node_modules 缺失,执行 pnpm install"
  (cd "$ROOT" && pnpm install >/dev/null 2>&1)
  echo "  [OK] 前端依赖安装完成"
fi

# ---------- 1. Java 后端 ----------

echo "==> 启动 Java Mock 后端 (:$BACK_PORT)"

if [ -n "$(port_pid $BACK_PORT)" ]; then
  echo "  [--] 端口 :$BACK_PORT 已被占用,跳过启动(如需重启先执行 --stop)"
else
  if [ ! -f "$JAR" ]; then
    echo "  [..] jar 不存在,尝试 mvn 打包"
    command -v mvn >/dev/null 2>&1 \
      || sudo -n dnf install -y maven-amazon-corretto21 >/dev/null 2>&1 \
      || { echo "  [FAIL] 未找到 mvn 且安装失败"; exit 1; }
    (cd "$ROOT/java-backend" && mvn -q -DskipTests package)
  fi
  nohup java -jar "$JAR" >"$LOG_DIR/backend.log" 2>&1 </dev/null &
  disown
  echo "  [..] 后端启动中 (pid $!, 日志 logs/backend.log)"
fi

# ---------- 2. 前端演示站 ----------

echo "==> 启动前端演示站 (:$FRONT_PORT)"

if [ -n "$(port_pid $FRONT_PORT)" ]; then
  echo "  [--] 端口 :$FRONT_PORT 已被占用,跳过启动(如需重启先执行 --stop)"
else
  (cd "$ROOT" && nohup pnpm dev >"$LOG_DIR/frontend.log" 2>&1 </dev/null &)
  echo "  [..] 前端启动中 (日志 logs/frontend.log)"
fi

# ---------- 3. 就绪探活 ----------

echo "==> 等待服务就绪"
wait_http "http://localhost:$BACK_PORT/api/mock/health" "Java 后端" 60
wait_http "http://localhost:$FRONT_PORT/" "前端演示站" 90

echo "============================================="
echo " 全部就绪"
echo "   前端演示站: http://localhost:$FRONT_PORT"
echo "   Java 后端:  http://localhost:$BACK_PORT/api/mock/health"
echo "   停止服务:   bash scripts/start-all.sh --stop"
echo "   查看状态:   bash scripts/start-all.sh --status"
echo "============================================="
