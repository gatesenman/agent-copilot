#!/usr/bin/env bash
# macOS 双击入口：Finder 中双击本文件即可在终端里运行 start.sh
cd "$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)" || exit 1
exec bash ./start.sh
