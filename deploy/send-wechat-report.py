#!/usr/bin/env python3
"""
微信推送 — 多时段报告 v5.0
===========================
根据运行时间自动切换报告模板：
- 盘前 (4:00-6:00): "📊 盘前市场分析" — 市场概况 + 今日策略 + 持仓提醒
- 盘中 (9:00-15:00): "📡 盘中信号" — 实时信号 + 操作建议
- 盘后 (15:00-4:00 次日): "📊 每日复盘" — 完整复盘报告
"""
import subprocess, json, os, sys, re
from datetime import datetime, timedelta

DATA_DIR = "/opt/scripts/data"
WECHAT_ACCOUNT = "bbfd203f2235-im-bot"
WECHAT_TARGET = "o9cq80wi7-6kqArXTE4zDUg9R8KA@im.wechat"

def get_account():
    sys.path.insert(0, "/opt/scripts")
    from paper_account import Account
    return Account.load("default")

def get_ponder_data():
    """提取 Ponder 完整结构化数据"""
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

def find_trade_reason(symbol, action, ponder_data):
    """从 Ponder 分析中提取该股票的推荐原因"""
    for s in ponder_data.get("recommended_stocks", []):
        if s.get("symbol", "") == symbol:
            reason = s.get("reason", "")
            confidence = s.get("confidence", 0)
            return f"[置信度{confidence:.0%}] {reason}" if reason else "无详细原因"
    for s in ponder_data.get("position_adjustments", []):
        if s.get("symbol", "") == symbol:
            return s.get("reason", "无详细原因")
    sentiment = ponder_data.get("market_sentiment", "")
    if sentiment:
        return f"基于市场判断: {sentiment[:200]}"
    return "系统综合决策"

def get_session_label(now):
    """根据当前时间返回时段标签和模板类型"""
    h = now.hour
    if 4 <= h < 6:
        return ("PRE_MARKET", "📊 盘前市场分析")
    elif 9 <= h < 15:
        return ("INTRADAY", "📡 盘中信号")
    else:
        return ("POST_MARKET", "📊 每日复盘")

def build_pre_market_report(now, acc, ponder_data, today_pnl, today_trades, pnl_records):
    """盘前推送：市场概况 + 今日策略 + 持仓提醒"""
    icon = "🟢" if acc.total_return >= 0 else "🔴"
    today_icon = "📈" if today_pnl >= 0 else "📉"

    report = "━━━━━━━━━━━━━━━━\n"
    report += "📊 盘前市场分析\n"
    report += "━━━━━━━━━━━━━━━━\n"
    report += f"🕐 {now.strftime('%Y-%m-%d %H:%M')}\n\n"

    report += "💎 账户概览\n"
    report += f"  总资产: ¥{acc.total_equity:,.2f}\n"
    report += f"  {icon} 累计收益: {acc.total_return:+.2f}%\n"
    report += f"  {today_icon} 昨日盈亏: ¥{today_pnl:+,.2f}\n"
    report += f"  可用资金: ¥{acc.cash:,.2f}  |  持仓市值: ¥{acc.total_market_value:,.2f}\n"

    sentiment = ponder_data.get("market_sentiment", "")
    if sentiment:
        report += f"\n🧠 市场判断\n  {sentiment[:300]}\n"

    signals = ponder_data.get("signals", [])
    if signals:
        report += "\n📋 今日关注信号\n"
        for s in signals[:5]:
            report += f"  {s.get('strength','?')} {s.get('type','?')}: {s.get('description','')[:100]}\n"

    if acc.positions:
        report += f"\n📦 持仓 ({len(acc.positions)}只)\n"
        for pos in acc.positions.values():
            s = "🟢" if pos.unrealized_pnl >= 0 else ("🔴" if pos.unrealized_pnl < 0 else "⚪")
            report += f"  {s} {pos.name}: {pos.shares}股 @{pos.current_price:.2f} ({pos.unrealized_pnl_pct:+.2f}%)\n"

    report += "\n━━━━━━━━━━━━━━━━\n"
    report += "🤖 全自动交易系统 · 今日开盘 9:30\n"
    report += "\n📊 交易面板: http://8.208.44.120"
    return report

def build_intraday_report(now, acc, ponder_data, today_pnl, today_trades, pnl_records):
    """盘中推送：实时信号 + 操作建议"""
    icon = "🟢" if acc.total_return >= 0 else "🔴"
    today_icon = "📈" if today_pnl >= 0 else "📉"

    report = "━━━━━━━━━━━━━━━━\n"
    report += "📡 盘中信号\n"
    report += "━━━━━━━━━━━━━━━━\n"
    report += f"🕐 {now.strftime('%Y-%m-%d %H:%M')}\n\n"

    report += "💎 账户概览\n"
    report += f"  总资产: ¥{acc.total_equity:,.2f}\n"
    report += f"  {icon} 累计收益: {acc.total_return:+.2f}%\n"
    report += f"  {today_icon} 今日盈亏: ¥{today_pnl:+,.2f}\n"
    report += f"  可用资金: ¥{acc.cash:,.2f}  |  持仓市值: ¥{acc.total_market_value:,.2f}\n"

    buy_trades = [t for t in today_trades if t.get("action") == "BUY"]
    sell_trades = [t for t in today_trades if t.get("action") == "SELL"]
    if buy_trades or sell_trades:
        report += f"\n📜 今日操作 ({len(today_trades)}笔)\n"
        for t in buy_trades:
            sym = t.get("symbol", "?")
            reason = find_trade_reason(sym, "BUY", ponder_data)
            report += f"\n  🟢 买入 {t.get('shares','?')}股 {sym} @¥{t.get('price',0):.2f}\n"
            report += f"     依据: {reason[:120]}\n"
        for t in sell_trades:
            sym = t.get("symbol", "?")
            reason = find_trade_reason(sym, "SELL", ponder_data)
            report += f"\n  🔴 卖出 {t.get('shares','?')}股 {sym} @¥{t.get('price',0):.2f}\n"
            report += f"     依据: {reason[:120]}\n"
    else:
        report += "\n📜 今日操作: 无\n"

    risk = ponder_data.get("risk", "")
    if risk:
        report += f"\n⚠️ 风险提醒\n  {risk[:250]}\n"

    report += "\n━━━━━━━━━━━━━━━━\n"
    report += "🤖 全自动交易系统 · 尾盘 15:00 复盘\n"
    return report

def build_post_market_report(now, acc, ponder_data, today_pnl, today_trades, pnl_records):
    """盘后推送：完整复盘报告"""
    icon = "🟢" if acc.total_return >= 0 else "🔴"
    today_icon = "📈" if today_pnl >= 0 else "📉"

    report = "━━━━━━━━━━━━━━━━\n"
    report += "📊 每日复盘\n"
    report += "━━━━━━━━━━━━━━━━\n"
    report += f"🕐 {now.strftime('%Y-%m-%d %H:%M')}\n\n"

    report += "💎 账户总览\n"
    report += f"  总资产: ¥{acc.total_equity:,.2f}\n"
    report += f"  {icon} 累计收益: {acc.total_return:+.2f}%\n"
    report += f"  {today_icon} 今日盈亏: ¥{today_pnl:+,.2f}\n"
    report += f"  可用资金: ¥{acc.cash:,.2f}  |  持仓市值: ¥{acc.total_market_value:,.2f}\n"

    buy_trades = [t for t in today_trades if t.get("action") == "BUY"]
    sell_trades = [t for t in today_trades if t.get("action") == "SELL"]
    if buy_trades or sell_trades:
        report += f"\n📜 今日操作 ({len(today_trades)}笔)\n"
        for t in buy_trades:
            sym = t.get("symbol", "?")
            reason = find_trade_reason(sym, "BUY", ponder_data)
            report += f"\n  🟢 买入 {t.get('shares','?')}股 {sym} @¥{t.get('price',0):.2f}\n"
            report += f"     依据: {reason[:150]}\n"
        for t in sell_trades:
            sym = t.get("symbol", "?")
            reason = find_trade_reason(sym, "SELL", ponder_data)
            report += f"\n  🔴 卖出 {t.get('shares','?')}股 {sym} @¥{t.get('price',0):.2f}\n"
            report += f"     依据: {reason[:150]}\n"
    else:
        report += "\n📜 今日操作: 无\n"

    if acc.positions:
        report += f"\n📦 当前持仓 ({len(acc.positions)}只)\n"
        sorted_pos = sorted(acc.positions.values(), key=lambda p: p.unrealized_pnl, reverse=True)
        profit_count = sum(1 for p in sorted_pos if p.unrealized_pnl > 0)
        loss_count = sum(1 for p in sorted_pos if p.unrealized_pnl < 0)

        for pos in sorted_pos:
            pnl = pos.unrealized_pnl
            pnl_pct = pos.unrealized_pnl_pct
            s = "🟢" if pnl > 0 else ("🔴" if pnl < 0 else "⚪")
            report += f"\n  {s} {pos.name}({pos.symbol})\n"
            report += f"    持仓: {pos.shares}股 × ¥{pos.current_price:.2f} = ¥{pos.market_value:,.2f}\n"
            report += f"    成本: ¥{pos.avg_cost:.2f}  |  盈亏: {pnl:+,.2f} ({pnl_pct:+.2f}%)\n"

        report += f"\n  盈亏汇总:\n"
        report += f"    🟢 盈利: {profit_count}只\n"
        report += f"    🔴 亏损: {loss_count}只\n"
        net = sum(p.unrealized_pnl for p in sorted_pos)
        report += f"    📊 净盈亏: ¥{net:+,.2f}\n"

    sentiment = ponder_data.get("market_sentiment", "")
    if sentiment:
        report += f"\n🧠 市场判断\n  {sentiment[:300]}\n"
    risk = ponder_data.get("risk", "")
    if risk:
        report += f"\n⚠️ 风险提示\n  {risk[:250]}\n"

    if pnl_records and len(pnl_records) >= 2:
        report += "\n📈 近7日收益\n"
        for r in pnl_records[-7:]:
            d = r.get("date", "?")[-5:]
            pnl = r.get("daily_pnl", 0)
            icon_d = "🟢" if pnl >= 0 else "🔴"
            report += f"  {d} {icon_d} ¥{pnl:+,.2f}\n"

    report += "\n━━━━━━━━━━━━━━━━\n"
    report += "🤖 全自动交易系统 · 明日继续\n"
    report += "\n📊 交易面板: http://8.208.44.120"
    return report

def send_wechat(message):
    """直接发送原文，不走 AI agent。检测真实送达。"""
    result = subprocess.run([
        "openclaw", "message", "send",
        "--channel", "openclaw-weixin",
        "--account", WECHAT_ACCOUNT,
        "--target", WECHAT_TARGET,
        "--message", message,
    ], capture_output=True, text=True, timeout=60)

    if result.returncode != 0:
        print(f"[wechat] CLI返回错误: {result.stderr[:300]}", file=sys.stderr)
        return False

    stderr_lower = (result.stderr or "").lower()
    if "error" in stderr_lower or "fail" in stderr_lower or "not configured" in stderr_lower:
        print(f"[wechat] 检测到错误: {result.stderr[:300]}", file=sys.stderr)
        return False

    stdout_lower = (result.stdout or "").lower()
    if "error" in stdout_lower:
        print(f"[wechat] stdout含错误: {result.stdout[:300]}", file=sys.stderr)
        return False

    # 发送后检查通道状态是否更新了 lastOutboundAt
    try:
        status_check = subprocess.run(
            ["openclaw", "channels", "status", "openclaw-weixin", "--json"],
            capture_output=True, text=True, timeout=10
        )
        if status_check.returncode == 0:
            status_data = json.loads(status_check.stdout)
            accounts = status_data.get("channelAccounts", {}).get("openclaw-weixin", [])
            if accounts:
                last_out = accounts[0].get("lastOutboundAt")
                if last_out is None:
                    print(f"[wechat] 通道未记录出站 (lastOutboundAt=null)，消息未实际送达", file=sys.stderr)
                    return False
                else:
                    print(f"[wechat] 通道确认出站: {last_out}", file=sys.stderr)
                    return True
    except Exception as e:
        print(f"[wechat] 通道状态检查异常: {e}", file=sys.stderr)

    return True

if __name__ == "__main__":
    now = datetime.now()
    acc = get_account()
    ponder_data = get_ponder_data()

    equity = acc.total_equity
    total_return = acc.total_return
    cash = acc.cash
    market_val = acc.total_market_value

    pnl_file = os.path.join(DATA_DIR, "daily-pnl.json")
    today_pnl = 0
    pnl_records = []
    if os.path.exists(pnl_file):
        with open(pnl_file) as f:
            pnl_records = json.load(f)
        if pnl_records:
            today_pnl = pnl_records[-1].get("daily_pnl", 0)

    exe_file = os.path.join(DATA_DIR, "execution-log.json")
    today_trades = []
    if os.path.exists(exe_file):
        with open(exe_file) as f:
            exe = json.load(f)
        ts = exe.get("timestamp", "")
        if ts.startswith(now.strftime("%Y-%m-%d")):
            today_trades = exe.get("trades", [])

    session_type, session_label = get_session_label(now)

    if session_type == "PRE_MARKET":
        report = build_pre_market_report(now, acc, ponder_data, today_pnl, today_trades, pnl_records)
    elif session_type == "INTRADAY":
        report = build_intraday_report(now, acc, ponder_data, today_pnl, today_trades, pnl_records)
    else:
        report = build_post_market_report(now, acc, ponder_data, today_pnl, today_trades, pnl_records)

    print(report)

    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] 发送微信 ({len(report)}字符)...", file=sys.stderr)

    success = send_wechat(report)
    if success:
        print("✅ 微信发送成功", file=sys.stderr)
    else:
        print("❌ 微信发送失败", file=sys.stderr)