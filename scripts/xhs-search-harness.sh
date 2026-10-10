#!/bin/bash
# ============================================================
# 小红书 MCP 搜索 Harness（v2 - 含重试机制）
# 固定流程：清理进程 → 启动服务 → 等待就绪 → 预热 → 搜索 → 解析
# 用法: bash scripts/xhs-search-harness.sh [关键词] [排序] [时间范围]
# 示例: bash scripts/xhs-search-harness.sh "欧洲婚礼" "综合" "不限"
# ============================================================
set -euo pipefail

# ---- 配置 ----
MCP_BIN="/Users/hongli/WorkSpace/Verra-Voile/tools/xiaohongshu-mcp/xiaohongshu-mcp-darwin-arm64"
MCP_PORT="${XHS_PORT:-18060}"
MCP_URL="http://localhost:${MCP_PORT}/mcp"
WORK_DIR="/Users/hongli/WorkSpace/Verra-Voile"
RESULT_DIR="/tmp/xhs-harness"
LOG_FILE="/tmp/xhs-mcp.log"
MAX_WAIT=15
SEARCH_TIMEOUT=120
MAX_RETRIES=3

KEYWORD="${1:-欧洲婚礼}"
SORT_BY="${2:-综合}"
PUBLISH_TIME="${3:-不限}"

mkdir -p "$RESULT_DIR"

echo "=========================================="
echo "小红书搜索 Harness v2"
echo "关键词: $KEYWORD | 排序: $SORT_BY | 时间: $PUBLISH_TIME"
echo "=========================================="

# ---- 函数: 重启 MCP ----
restart_mcp() {
    echo "  → 重启 MCP..."
    pkill -f "xiaohongshu-mcp-darwin-arm64" 2>/dev/null || true
    sleep 2
    cd "$WORK_DIR"
    nohup "$MCP_BIN" > "$LOG_FILE" 2>&1 &
    sleep 5
}

# ---- 函数: 等待就绪 ----
wait_ready() {
    for i in $(seq 1 $MAX_WAIT); do
        RESP=$(curl -s --max-time 3 -X POST "$MCP_URL" \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"harness","version":"2.0"}},"id":1}' 2>/dev/null || true)
        if echo "$RESP" | grep -q "serverInfo"; then
            echo "  ✓ 服务就绪 (${i}s)"
            return 0
        fi
        sleep 1
    done
    echo "  ✗ 服务未就绪"
    return 1
}

# ---- 函数: 检查登录 ----
check_login() {
    local resp
    resp=$(curl -s --max-time 30 -X POST "$MCP_URL" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"check_login_status","arguments":{}},"id":1}')
    if echo "$resp" | grep -q "已登录"; then
        echo "  ✓ 已登录"
        return 0
    else
        echo "  ✗ 未登录"
        return 1
    fi
}

# ---- 函数: 执行搜索 ----
do_search() {
    local result_file="$1"
    local request_json
    request_json=$(python3 -c "
import json
print(json.dumps({
    'jsonrpc': '2.0',
    'method': 'tools/call',
    'params': {'name': 'search_feeds', 'arguments': {
        'keyword': '$KEYWORD',
        'filters': {'sort_by': '$SORT_BY', 'publish_time': '$PUBLISH_TIME'}
    }},
    'id': 1
}, ensure_ascii=False))
")
    curl -s --max-time "$SEARCH_TIMEOUT" -X POST "$MCP_URL" \
        -H "Content-Type: application/json" \
        -d "$request_json" \
        -o "$result_file"
}

# ---- 函数: 验证结果 ----
validate_result() {
    local result_file="$1"
    if [ ! -s "$result_file" ]; then
        echo "empty"
        return
    fi
    if grep -q "isError" "$result_file"; then
        echo "error"
        return
    fi
    local count
    count=$(python3 -c "
import json
with open('$result_file') as f:
    d = json.load(f)
text = d['result']['content'][0]['text']
feeds = json.loads(text).get('feeds',[])
print(len(feeds))
" 2>/dev/null || echo "0")
    echo "$count"
}

# ---- Step 1: 清理并启动 ----
echo ""
echo "[Step 1] 清理并启动 MCP..."
restart_mcp
wait_ready || { restart_mcp && wait_ready || exit 1; }

# ---- Step 2: 检查登录 ----
echo ""
echo "[Step 2] 检查登录..."
check_login || { echo "请先登录！"; exit 1; }

# ---- Step 3: 带重试的搜索 ----
echo ""
echo "[Step 3] 搜索 (最多重试 ${MAX_RETRIES} 次)..."
RESULT_FILE="$RESULT_DIR/search-$(date +%s).json"
SUCCESS=false

for attempt in $(seq 1 $MAX_RETRIES); do
    echo "  尝试 $attempt/$MAX_RETRIES..."
    do_search "$RESULT_FILE"
    
    STATUS=$(validate_result "$RESULT_FILE")
    case "$STATUS" in
        empty)
            echo "    → 空响应（超时），重启后重试..."
            restart_mcp
            wait_ready
            ;;
        error)
            echo "    → 服务端错误，重启后重试..."
            restart_mcp
            wait_ready
            ;;
        0)
            echo "    → 0 条结果（可能是关键词无结果或页面未加载）"
            echo "    → 重启后重试..."
            restart_mcp
            wait_ready
            ;;
        *)
            echo "    ✓ 成功! $STATUS 条结果"
            SUCCESS=true
            break
            ;;
    esac
    sleep 2
done

if [ "$SUCCESS" = false ]; then
    echo ""
    echo "✗ ${MAX_RETRIES} 次尝试均失败"
    echo "  可能原因: Cookie 过期 / 小红书页面结构变更 / 网络问题"
    echo "  建议: 检查登录状态或手动排查日志 $LOG_FILE"
    exit 1
fi

# ---- Step 4: 解析结果 ----
echo ""
echo "[Step 4] 解析结果..."
echo ""

python3 << 'PYEOF'
import json, glob, sys

files = sorted(glob.glob("/tmp/xhs-harness/search-*.json"))
if not files:
    print("无结果文件"); sys.exit(1)
result_file = files[-1]

with open(result_file) as f:
    data = json.load(f)

text = data["result"]["content"][0]["text"]
result = json.loads(text)
feeds = result.get("feeds", [])

print(f"共 {len(feeds)} 条结果:")
print("=" * 80)

for i, feed in enumerate(feeds):
    nc = feed.get("noteCard", {})
    info = nc.get("interactInfo", {})
    title = nc.get("displayTitle", "(无标题)")
    note_type = "视频" if nc.get("type") == "video" else "图文"
    user = nc.get("user", {}).get("nickname", "未知")
    liked = info.get("likedCount", "0")
    collected = info.get("collectedCount", "0")
    commented = info.get("commentCount", "0")
    feed_id = feed.get("id", "")
    xsec = feed.get("xsecToken", "")
    
    # 标记高价值帖（询盘/求助类）
    tags = []
    title_lower = title.lower()
    if any(kw in title for kw in ["求推荐", "求助", "有没有", "推荐", "求助帖", "想邀请", "预算"]):
        tags.append("🔥询盘")
    if int(liked) >= 50:
        tags.append("⭐热门")
    
    tag_str = " ".join(tags)
    print(f"{i+1:2d}. [{note_type}] {title} {tag_str}")
    print(f"    赞:{liked} 藏:{collected} 评:{commented} | by {user}")
    print(f"    feed_id: {feed_id}")
    print(f"    xsec_token: {xsec}")
    print()

# 输出可复制的 TS 数组（方便粘贴到代码中）
print("=" * 80)
print("TypeScript INITIAL_POSTS 格式:")
print("=" * 80)
for i, feed in enumerate(feeds):
    nc = feed.get("noteCard", {})
    info = nc.get("interactInfo", {})
    title = nc.get("displayTitle", "(无标题)")
    user = nc.get("user", {}).get("nickname", "未知")
    liked = info.get("likedCount", "0")
    collected = info.get("collectedCount", "0")
    commented = info.get("commentCount", "0")
    feed_id = feed.get("id", "")
    xsec = feed.get("xsecToken", "")
    url = f"https://www.xiaohongshu.com/explore/{feed_id}?xsec_token={xsec}"
    
    print(f"  {{ index: {i+1}, title: '{title}', author: '{user}', likes: '{liked}', collects: '{collected}', comments: '{commented}', shares: '0', id: '{feed_id}', token: '{xsec}', url: '{url}' }},")

PYEOF

echo ""
echo "=========================================="
echo "完成！结果文件: $RESULT_FILE"
echo "=========================================="
