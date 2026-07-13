#!/usr/bin/env python3
"""
微信推送守护进程 v1.0
====================
- 持续运行，不断轮询微信消息获取 token
- 检测到新 token 后立即发送最新报告
- 自动重试直到成功
- 不依赖 gateway 进程
"""
import requests, json, os, sys, re, random, base64, time, threading
sys.path.insert(0, "/opt/workspace/mcts-skill/deploy")
sys.path.insert(0, "/opt/scripts")

TOKEN = "bbfd203f2235@im.bot:0600000cd8f51fde11ad98f82403c49be85467"
TARGET = "o9cq80wi7-6kqArXTE4zDUg9R8KA@im.wechat"
DATA_DIR = "/opt/scripts/data"
CTX_FILE = "/root/.openclaw/openclaw-weixin/accounts/bbfd203f2235-im-bot.context-tokens.json"
CURRENT_CTX = None
HEARTBEAT_INTERVAL = 300

def make_uin():
    return base64.b64encode(str(random.randint(0, 2**32 - 1)).encode()).decode()

def hdrs():
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TOKEN}",
        "AuthorizationType": "ilink_bot_token",
        "iLink-App-Id": "wx5c4a06b210e5173f",
        "iLink-App-ClientVersion": "65547",
        "X-WECHAT-UIN": make_uin(),
    }

def poll_token(timeout=30):
    """长轮询获取新消息的 context token"""
    try:
        r = requests.post(
            "https://ilinkai.weixin.qq.com/ilink/bot/getupdates?limit=3&timeout=" + str(timeout),
            json={"get_updates_buf": "", "base_info": {"channel_version": "1.0.11", "bot_agent": "OpenClaw"}},
            headers=hdrs(), timeout=timeout+10
        )
        msgs = r.json().get("msgs", [])
        if msgs:
            ctx = msgs[-1].get("context_token", "")
            if ctx:
                print(f"[token] 获得新 token: {ctx[:30]}...", flush=True)
                # 同时写入磁盘
                try:
                    with open(CTX_FILE) as f:
                        tokens = json.load(f)
                except:
                    tokens = {}
                tokens[TARGET] = ctx
                with open(CTX_FILE, "w") as f:
                    json.dump(tokens, f)
                return ctx
    except Exception as e:
        print(f"[token] poll 异常: {e}", flush=True)
    return None

def get_stored_token():
    try:
        with open(CTX_FILE) as f:
            tokens = json.load(f)
        return tokens.get(TARGET, "")
    except:
        return ""

def send_message(text, ctx):
    item_list = [{"type": 1, "text_item": {"text": line if line.strip() else " "}} for line in text.split("\n")]
    body = {
        "msg": {
            "from_user_id": "",
            "to_user_id": TARGET,
            "client_id": "daemon-" + str(random.randint(10000, 99999)),
            "message_type": 2,
            "message_state": 2,
            "item_list": item_list,
            "context_token": ctx,
        },
        "base_info": {"channel_version": "1.0.11", "bot_agent": "OpenClaw"},
    }
    try:
        r = requests.post("https://ilinkai.weixin.qq.com/ilink/bot/sendmessage", json=body, headers=hdrs(), timeout=15)
        resp = r.text.strip()
        return r.status_code == 200 and (resp == "{}" or resp == "")
    except:
        return False

def build_report():
    """构建报告文本"""
    try:
        from paper_account import Account
        acc = Account.load("default")
    except:
        return "账户数据读取失败"

    ponder = {}
    pf = os.path.join(DATA_DIR, "ponder-output.json")
    if os.path.exists(pf):
        with open(pf) as f:
            text = f.read()
        m = re.search(r'```json\s*\n(.*?)\n\s*```', text, re.DOTALL)
        if m:
            try:
                ponder = json.loads(m.group(1))
            except:
                pass

    pnl_file = os.path.join(DATA_DIR, "daily-pnl.json")
    today_pnl = 0
    if os.path.exists(pnl_file):
        with open(pnl_file) as f:
            records = json.load(f)
        if records:
            today_pnl = records[-1].get("daily_pnl", 0)

    exe_file = os.path.join(DATA_DIR, "execution-log.json")
    today_trades = []
    if os.path.exists(exe_file):
        with open(exe_file) as f:
            exe = json.load(f)
        ts = exe.get("timestamp", "")
        if ts.startswith(__import__("datetime").datetime.now().strftime("%Y-%m-%d")):
            today_trades = exe.get("trades", [])

    now = __import__("datetime").datetime.now()
    h = now.hour
    session = "📡 盘中" if 9 <= h < 15 else "📊 复盘"

    lines = [
        session + "  " + now.strftime("%m/%d %H:%M"),
        "",
        "💰 [资产总览]",
        "  总资产: " + f"¥{acc.total_equity:,.0f}",
        "  累计收益: " + f"{acc.total_return:+.2f}%",
        "  今日盈亏: " + f"¥{today_pnl:+,.0f}",
        "  可用资金: " + f"¥{acc.cash:,.0f}",
        "",
    ]

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
            icon = "✅" if pos.unrealized_pnl_pct > 0 else "⚠️"
            lines.append("  " + icon + " " + pos.name + "  " + f"{pos.unrealized_pnl_pct:+.2f}%")
        lines.append("")

    sentiment = ponder.get("market_sentiment", "")
    if sentiment:
        lines.append("🧠 [市场判断]")
        lines.append("  " + sentiment[:200])
        lines.append("")

    risk = ponder.get("risk", "")
    if risk:
        lines.append("⚠️ [风险提示]")
        lines.append("  " + risk[:150])
        lines.append("")

    lines.append("---")
    lines.append("详情: http://8.208.44.120")
    return "\n".join(lines)

def main_loop():
    print("[daemon] 微信推送守护进程启动", flush=True)
    ctx = get_stored_token()
    if ctx:
        print(f"[daemon] 磁盘已有 token: {ctx[:30]}...", flush=True)

    last_send_time = 0
    while True:
        # 1. 尝试轮询新 token（30s 长轮询）
        new_ctx = poll_token(timeout=30)
        if new_ctx:
            ctx = new_ctx

        # 2. 如果有 token，发报告
        if ctx:
            report = build_report()
            if send_message(report, ctx):
                print(f"[daemon] ✅ 报告发送成功", flush=True)
                last_send_time = time.time()
                # 发送成功后 token 已消耗，标记为 None 等新 token
                ctx = None
            else:
                print(f"[daemon] ❌ 发送失败，重试...", flush=True)
                ctx = None
                time.sleep(2)
        else:
            # 尝试磁盘 token
            ctx = get_stored_token()
            if ctx:
                print(f"[daemon] 用磁盘 token 重试...", flush=True)
            else:
                print(f"[daemon] 等待新 token（暂无消息）...", flush=True)
                time.sleep(5)

if __name__ == "__main__":
    main_loop()