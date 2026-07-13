#!/bin/bash
# 每日流水线 wrapper v3.0 — 7阶段全自动交易
# Crontab: 0 4 * * * cd /opt/scripts && bash /opt/scripts/daily-pipeline.sh

export PATH="/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/bin:/sbin:$PATH"
export HOME=/root

LOG="/opt/scripts/data/cron.log"
exec >> "$LOG" 2>&1

echo ""
echo "=========================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 每日流水线启动"

# 1. 确保 gateway 存活（不重启，只检查）
GW_HEALTH=$(curl -s http://127.0.0.1:18789/health 2>/dev/null)
if echo "$GW_HEALTH" | python3 -c "import json,sys; d=json.load(sys.stdin); exit(0 if d.get('ok') else 1)" 2>/dev/null; then
    echo "[$(date '+%H:%M:%S')] Gateway 存活 ✅"
else
    echo "[$(date '+%H:%M:%S')] Gateway 不存活，启动中..."
    pkill -9 -f "openclaw gateway" 2>/dev/null || true
    sleep 3
    nohup bash -c "openclaw gateway run 2>&1" > /tmp/gateway-nohup.log 2>&1 &
    sleep 20
    if curl -s http://127.0.0.1:18789/health 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); exit(0 if d.get('ok') else 1)" 2>/dev/null; then
        echo "[$(date '+%H:%M:%S')] Gateway 启动成功 ✅"
    else
        echo "[$(date '+%H:%M:%S')] ❌ Gateway 启动失败，退出"
        exit 1
    fi
fi

# 2. 微信通道快速出站测试（失败不阻塞，继续执行）
echo "[$(date '+%H:%M:%S')] 微信通道出站测试..."
WC_RESULT=$(timeout 20 openclaw message send \
    --channel openclaw-weixin \
    --account bbfd203f2235-im-bot \
    --target o9cq80wi7-6kqArXTE4zDUg9R8KA@im.wechat \
    --message "🕐 $(date '+%m/%d %H:%M') 巡检" 2>&1)
WC_EXIT=$?
if [ $WC_EXIT -eq 0 ] && echo "$WC_RESULT" | grep -q "Sent"; then
    echo "[$(date '+%H:%M:%S')] 微信通道正常 ✅"
else
    echo "[$(date '+%H:%M:%S')] ⚠️ 微信出站测试失败（报告由 Phase 7 发送，不受影响）"
fi

# 3. 跑7阶段流水线
echo "[$(date '+%H:%M:%S')] 开始7阶段流水线..."
python3 /opt/scripts/run-pipeline.py default
EXIT_CODE=$?

# 4. 清理
echo "[$(date '+%H:%M:%S')] 流水线退出码: $EXIT_CODE"
echo "[$(date '+%H:%M:%S')] ====== 每日流水线结束 ======"
echo "=========================================="