#!/bin/bash
# 每日流水线 wrapper v2.1 — 7阶段全自动交易
# Crontab: 0 4 * * * cd /opt/scripts && bash /opt/scripts/daily-pipeline.sh

# cron 环境没有 /usr/local/bin，必须手动设
export PATH="/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/bin:/sbin:$PATH"
export HOME=/root

LOG="/opt/scripts/data/cron.log"
exec >> "$LOG" 2>&1

echo ""
echo "=========================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 每日流水线启动"
echo "[$(date '+%H:%M:%S')] PATH=$PATH"
echo "[$(date '+%H:%M:%S')] claude=$(which claude 2>&1)"
echo "[$(date '+%H:%M:%S')] openclaw=$(which openclaw 2>&1)"

# 1. 确保 gateway 存活 + 微信通道真正连通
GW_HEALTH=$(curl -s http://127.0.0.1:18789/health 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('ok',False))" 2>/dev/null)
NEED_RESTART=false

if [ "$GW_HEALTH" != "True" ]; then
    echo "[$(date '+%H:%M:%S')] Gateway 不存活，启动中..."
    NEED_RESTART=true
else
    echo "[$(date '+%H:%M:%S')] Gateway 存活 ✅"
    # 检查微信通道是否真正能发消息（不只是 running 状态）
    # lastOutboundAt=null 或 lastInboundAt 超过12小时 → 强制重启
    CHANNEL_JSON=$(openclaw channels status openclaw-weixin --json 2>/dev/null)
    LAST_OUT=$(echo "$CHANNEL_JSON" | python3 -c "
import json,sys
try:
    d = json.load(sys.stdin)
    accts = d.get('channelAccounts',{}).get('openclaw-weixin',[])
    if accts:
        lo = accts[0].get('lastOutboundAt')
        li = accts[0].get('lastInboundAt',0) or 0
        print(f'{lo}|{li}')
    else:
        print('null|0')
except: print('null|0')
" 2>/dev/null)
    LO_VAL=$(echo "$LAST_OUT" | cut -d'|' -f1)
    LI_VAL=$(echo "$LAST_OUT" | cut -d'|' -f2)
    NOW_MS=$(date +%s%3N 2>/dev/null || echo 0)

    if [ "$LO_VAL" = "null" ] || [ "$LO_VAL" = "None" ]; then
        echo "[$(date '+%H:%M:%S')] ⚠️ 微信通道从未成功出站 (lastOutboundAt=null)，需要重启gateway"
        NEED_RESTART=true
    elif [ "$NOW_MS" -gt 0 ] && [ "$LI_VAL" -gt 0 ]; then
        GAP_MS=$((NOW_MS - LI_VAL))
        GAP_H=$((GAP_MS / 3600000))
        if [ "$GAP_H" -gt 12 ]; then
            echo "[$(date '+%H:%M:%S')] ⚠️ 微信通道 ${GAP_H}小时无入站，需要重启gateway"
            NEED_RESTART=true
        else
            echo "[$(date '+%H:%M:%S')] 微信通道活跃 (入站: ${GAP_H}小时前) ✅"
        fi
    else
        echo "[$(date '+%H:%M:%S')] 微信通道状态正常 ✅"
    fi
fi

if [ "$NEED_RESTART" = "true" ]; then
    echo "[$(date '+%H:%M:%S')] 微信通道从未成功出站 (lastOutboundAt=null)"
    echo "[$(date '+%H:%M:%S')] 需要扫码配对：在服务器上运行 openclaw channels login --channel openclaw-weixin --account bbfd203f2235-im-bot"
    echo "[$(date '+%H:%M:%S')] 扫码完成后 lastOutboundAt 会更新为时间戳，微信推送才能正常工作"
    echo "[$(date '+%H:%M:%S')] 当前通道状态:"
    echo "  $CHANNEL_JSON" | head -5

    echo "[$(date '+%H:%M:%S')] 重启 Gateway..."
    pkill -f "openclaw gateway" 2>/dev/null || true
    sleep 5
    # 确保旧进程彻底清理
    pkill -9 -f "openclaw gateway" 2>/dev/null || true
    sleep 3
    nohup bash -c "openclaw gateway run 2>&1" > /tmp/gateway-nohup.log 2>&1 &
    sleep 20
    GW_HEALTH2=$(curl -s http://127.0.0.1:18789/health 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('ok',False))" 2>/dev/null)
    if [ "$GW_HEALTH2" != "True" ]; then
        echo "[$(date '+%H:%M:%S')] ❌ Gateway 启动失败，退出"
        exit 1
    fi
    echo "[$(date '+%H:%M:%S')] Gateway 重启完成"
    # 重启后再验证通道
    sleep 10
fi

# 2. 微信通道实际出站测试（发一条静默测试消息）
echo "[$(date '+%H:%M:%S')] 微信通道出站测试..."
WC_TEST_MSG="openclaw message send --channel openclaw-weixin --account bbfd203f2235-im-bot --target o9cq80wi7-6kqArXTE4zDUg9R8KA@im.wechat --message \"🕐 $(date '+%m/%d %H:%M') 盘前巡检 — 系统正常\""
WC_RESULT=$(timeout 30 bash -c "$WC_TEST_MSG" 2>&1)
WC_EXIT=$?
echo "  [$WC_EXIT] $WC_RESULT"
if [ $WC_EXIT -ne 0 ]; then
    echo "[$(date '+%H:%M:%S')] ⚠️ 微信出站测试失败，但继续执行（Phase 7会重试）"
fi

# 3. 跑7阶段流水线
echo "[$(date '+%H:%M:%S')] 开始7阶段流水线..."
python3 /opt/scripts/run-pipeline.py default
EXIT_CODE=$?

# 4. 清理
echo "[$(date '+%H:%M:%S')] 流水线退出码: $EXIT_CODE"
echo "[$(date '+%H:%M:%S')] ====== 每日流水线结束 ======"
echo "=========================================="
