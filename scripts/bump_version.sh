#!/bin/bash
# 版本号替换脚本
# 用法: ./scripts/bump_version.sh 1.17.6 1.17.7

if [ $# -ne 2 ]; then
  echo "用法: ./scripts/bump_version.sh <旧版本> <新版本>"
  echo "示例: ./scripts/bump_version.sh 1.17.6 1.17.7"
  exit 1
fi

OLD=$1
NEW=$2

sed -i "s/\"version\": \"$OLD\"/\"version\": \"$NEW\"/g" .claude-plugin/plugin.json
sed -i "s/\"version\": \"$OLD\"/\"version\": \"$NEW\"/g" .claude-plugin/marketplace.json
sed -i "s/版本-$OLD/版本-$NEW/g" README_CN.md
sed -i "s/version-$OLD/version-$NEW/g" README.md

echo "版本号 $OLD → $NEW 已替换"
echo "请检查:"
grep -n "$NEW" .claude-plugin/plugin.json .claude-plugin/marketplace.json README_CN.md README.md | head -8
