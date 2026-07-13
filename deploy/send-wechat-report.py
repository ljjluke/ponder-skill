#!/usr/bin/env python3
"""
微信推送 — 多时段报告 v7.0 (自愈版)
====================================
- 自动获取 context token（长轮询或磁盘）
- 多 text_item 实现换行
- 全 emoji 图标
- 通道失效时自动重试
"""
import requests, json, os, sys, re, random, base64, time
from datetime import datetime

DATA_DIR = "/opt/scripts/data"
WECHAT_TOKEN = "bbfd203f2235@im.bot:0600000cd8f51fde11ad98f82403c49be85467"
WECHAT_TARGET = "o9cq80wi7-6kqArXTE4zDUg9R8KA@im.wechat"
WECHAT_BASE_URL = "https://ilinkai.weixin.qq.com"
CTX_FILE = "/root/.openclaw/openclaw-weixin/accounts/bbfd203f2235-im-bot.context-tokens.json"

def make_uin():
    return base64.b64encode(str(random.randint(0, 2**32 - 1)).encode()).decode()

def headers():
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {WECHAT_TOKEN}",
        "AuthorizationType": "ilink_bot_token",
        "iLink-App-Id": "wx5c4a06b210e5173f",
        "iLink-App-ClientVersion": "65547",
        "X-WECHAT-UIN": make_uin(),
    }

def get_context_token():
    """先读磁盘，如果失败就长轮询"""
    try:
        with open(CTX_FILE) as f:
            tokens = json.load(f)
        ctx = tokens.get(WECHAT_TARGET, "")
        if ctx:
            return ctx
    except:
        pass

    # 长轮询获取
    try:
        r = requests.post(
            f"{WECHAT_BASE_URL}/ilink/bot/getupdates?limit=3&timeout=25",
            json={"get_updates_buf": "", "base_info": {"channel_version": "1.0.11", "bot_agent": "OpenClaw"}},
            headers=headers(), timeout=35
        )
        msgs = r.json().get("msgs", [])
        if msgs:
            return msgs[-1].get("context_token", "")
    except:
        pass
    return ""

def check_weixin_health():
    try:
        body = {"base_info": {"channel_version": "1.0.11", "bot_agent": "OpenClaw"}}
        resp = requests.post(f"{WECHAT_BASE_URL}/ilink/bot/msg/notifystart", json=body, headers=headers(), timeout=10)
        return resp.status_code == 200 and resp.json().get("ret", -1) == 0
    except:
        return False

def send_wechat(message):
    """
    发送微信消息（自动获取 token + 重试）
    使用多 text_item 实现换行
    """
    ctx = get_context_token()
    if not ctx:
        print(f"[wechat] 无 context token", file=sys.stderr)
        return False

    lines = message.split("\n")
    item_list = []
    for line in lines:
        text = line if line.strip() else " "
        item_list.append({"type": 1, "text_item": {"text": text}})

    body = {
        "msg": {
            "from_user_id": "",
            "to_user_id": WECHAT_TARGET,
            "client_id": "rpt-" + datetime.now().strftime("%H%M%S") + str(random.randint(100, 999)),
            "message_type": 2,
            "message_state": 2,
            "item_list": item_list,
            "context_token": ctx,
        },
        "base_info": {"channel_version": "1.0.11", "bot_agent": "OpenClaw"},
    }

    # 最多重试 2 次（token 可能过期，重试时重新获取）
    for attempt in range(2):
        try:
            resp = requests.post(
                f"{WECHAT_BASE_URL}/ilink/bot/sendmessage",
                json=body, headers=headers(), timeout=15
            )
            resp_text = resp.text.strip()
            if resp.status_code == 200 and (resp_text == "{}" or resp_text == ""):
                print(f"[wechat] 发送成功 ({len(item_list)}行)", file=sys.stderr)
                return True
            else:
                print(f"[wechat] 发送失败: HTTP={resp.status_code} ret={resp_text[:50]}", file=sys.stderr)
                if attempt == 0:
                    # 可能是 token 过期，重新获取
                    print(f"[wechat] 重试中...", file=sys.stderr)
                    time.sleep(1)
                    ctx = get_context_token()
                    if ctx:
                        body["msg"]["context_token"] = ctx
                    else:
                        return False
        except Exception as e:
            print(f"[wechat] 发送异常: {e}", file=sys.stderr)
            if attempt == 0:
                time.sleep(2)
    return False

def get_account():
    sys.path.insert(0, "/opt/scripts")
    from paper_account import Account
    return Account.load("default")

def get_ponder_data():
    f = os.path.join(DATA_DIR, "ponder-output.json")
    if not os.path.exists(f):
        return {}
    with open(f) as fh:
        text = fh.read()
    if len(text) < 100:
        return {}
    m = re.search(r'```json\s*\n(.*?)\n\s*```', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except:
            pass
    return {}

def get_session_label(now):
    h = now.hour
    if 4 <= h < 6:
        return "📊 盘前"
    elif 9 <= h < 15:
        return "📡 盘中"
    else:
        return "📊 复盘"

def build_report(now, acc, ponder_data, today_pnl, today_trades):
    session = get_session_label(now)

    lines = []
    lines.append(session + "  " + now.strftime("%m/%d %H:%M"))
    lines.append("")
    lines.append("💰 [资产总览]")
    lines.append("  总资产: " + f"¥{acc.total_equity:,.0f}")
    lines.append("  累计收益: " + f"{acc.total_return:+.2f}%")
    lines.append("  今日盈亏: " + f"¥{today_pnl:+,.0f}")
    lines.append("  可用资金: " + f"¥{acc.cash:,.0f}")
    lines.append("")

    buy_trades = [t for t in today_trades if t.get("action") == "BUY"]
    sell_trades = [t for t in today_trades if t.get("action") == "SELL"]
    if buy_trades or sell_trades:
        lines.append("📋 [今日操作]")
        for t in buy_trades:
            lines.append("  🟢 买入 " + str(t.get("symbol","?")) + " " + str(t.get("shares","?")) + "股 @" + f"{t.get('price',0):.2f}")
        for t in sell_trades:
            lines.append("  🔴 卖出 " + str(t.get("symbol","?")) + " " + str(t.get("shares","?")) + "股 @" + f"{t.get('price',0):.2f}")
        lines.append("")

    if acc.positions:
        profit_count = sum(1 for p in acc.positions.values() if p.unrealized_pnl > 0)
        loss_count = sum(1 for p in acc.positions.values() if p.unrealized_pnl < 0)
        lines.append("📊 [持仓] " + str(len(acc.positions)) + "只 / " + str(profit_count) + "盈" + str(loss_count) + "亏")
        lines.append("")

        sorted_pos = sorted(acc.positions.values(), key=lambda p: p.unrealized_pnl_pct, reverse=True)
        for pos in sorted_pos:
            pnl_pct = pos.unrealized_pnl_pct
            icon = "✅" if pnl_pct > 0 else ("⚠️" if pnl_pct < 0 else "➖")
            lines.append("  " + icon + " " + pos.name + "  " + f"{pnl_pct:+.2f}%")
        lines.append("")

    sentiment = ponder_data.get("market_sentiment", "")
    if sentiment:
        lines.append("🧠 [市场判断]")
        lines.append("  " + sentiment[:200])
        lines.append("")

    risk = ponder_data.get("risk", "")
    if risk:
        lines.append("⚠️ [风险提示]")
        lines.append("  " + risk[:150])
        lines.append("")

    lines.append("---")
    lines.append("详情: http://8.208.44.120")
    return "\n".join(lines)

def generate_chart():
    try:
        result = subprocess.run(
            [sys.executable, "/opt/scripts/chart-pnl.py"],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            path = result.stdout.strip()
            if path and os.path.exists(path):
                return path
    except Exception as e:
        print(f"[chart] 生成折线图失败: {e}", file=sys.stderr)
    return None

if __name__ == "__main__":
    import subprocess

    now = datetime.now()
    acc = get_account()
    ponder_data = get_ponder_data()

    # 今日盈亏
    pnl_file = os.path.join(DATA_DIR, "daily-pnl.json")
    today_pnl = 0
    if os.path.exists(pnl_file):
        with open(pnl_file) as f:
            records = json.load(f)
        if records:
            today_pnl = records[-1].get("daily_pnl", 0)

    # 今日操作
    exe_file = os.path.join(DATA_DIR, "execution-log.json")
    today_trades = []
    if os.path.exists(exe_file):
        with open(exe_file) as f:
            exe = json.load(f)
        ts = exe.get("timestamp", "")
        if ts.startswith(now.strftime("%Y-%m-%d")):
            today_trades = exe.get("trades", [])

    report = build_report(now, acc, ponder_data, today_pnl, today_trades)
    print(report)

    chart_path = generate_chart()
    if chart_path:
        print(f"[chart] 折线图: {chart_path}", file=sys.stderr)

    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] 检测微信通道...", file=sys.stderr)

    if check_weixin_health():
        print(f"[wechat] 通道正常", file=sys.stderr)
        print(f"[{ts}] 发送微信 ({len(report)}字符)...", file=sys.stderr)
        success = send_wechat(report)
        if success:
            print("✅ 微信发送成功", file=sys.stderr)
        else:
            print("❌ 微信发送失败", file=sys.stderr)
    else:
        print(f"[wechat] ⏭️ 微信通道不可用，跳过推送（不阻塞管线）", file=sys.stderr)