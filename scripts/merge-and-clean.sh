#!/bin/bash
# 用法: ./scripts/merge-and-clean.sh <branch-name>
# 在 main 分支上合并指定分支，然后删除该分支（本地 + 远程）

set -e

BRANCH="$1"

if [ -z "$BRANCH" ]; then
  echo "❌ 请指定要合并的分支名"
  echo "用法: ./scripts/merge-and-clean.sh <branch-name>"
  exit 1
fi

CURRENT=$(git branch --show-current)

if [ "$CURRENT" != "main" ]; then
  echo "⚠️  当前不在 main 分支，正在切换..."
  git checkout main
fi

echo "📥 拉取最新 main..."
git pull origin main

echo "🔀 合并分支: $BRANCH"
git merge "$BRANCH"

echo "🗑️  删除本地分支: $BRANCH"
git branch -d "$BRANCH"

# 检查远程是否存在该分支
if git ls-remote --heads origin "$BRANCH" | grep -q "$BRANCH"; then
  echo "🗑️  删除远程分支: $BRANCH"
  git push origin --delete "$BRANCH"
else
  echo "ℹ️  远程不存在分支 $BRANCH，跳过"
fi

echo "✅ 完成！已合并并清理分支: $BRANCH"
