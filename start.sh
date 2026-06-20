#!/bin/bash
cd "$(dirname "$0")"
./generate_changelog.sh
echo "启动服务器 http://localhost:8080"
python3 -m http.server 8080
