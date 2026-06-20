#!/bin/bash
# 从 git log 自动生成 changelog.js
cd "$(dirname "$0")"

echo "// changelog.js - 从 git log 自动生成" > changelog.js
echo "const CHANGELOG = [" >> changelog.js

git log --format="%H|%ai|%s" --no-merges | head -20 | while IFS='|' read -r hash date subject; do
    # 提取日期部分
    short_date=$(echo "$date" | cut -d' ' -f1)
    # 获取详细的改动文件列表
    files=$(git diff-tree --no-commit-id --name-only -r "$hash" 2>/dev/null | grep -E '\.(js|html|css)$' | head -10)
    # 获取改动统计
    stats=$(git diff-tree --no-commit-id --stat "$hash" 2>/dev/null | tail -1)

    echo "    {" >> changelog.js
    echo "        hash: '${hash:0:7}'," >> changelog.js
    echo "        date: '$short_date'," >> changelog.js
    echo "        title: '$(echo "$subject" | sed "s/'/\\\\'/g")'," >> changelog.js
    echo "        stats: '$(echo "$stats" | sed "s/'/\\\\'/g")'," >> changelog.js
    echo "    }," >> changelog.js
done

echo "];" >> changelog.js

echo "changelog.js 已生成"
