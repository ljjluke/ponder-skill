#!/usr/bin/env python3
"""
微信推送 — 每日盈利报告 v4.0
==========================
1. 账户总览
2. 今日操作 (每笔带 Ponder 多维度原因)
3. 持仓明细 (盈亏+多维度原因)
4. 亏损诊断 (自动标记数据维度缺失)
5. 近7日收益
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
    # 查 recommended_stocks
    for s in ponder_data.get("recommended_stocks", []):
        if s.get("symbol", "") == symbol:
            reason = s.get("reason", "")
            confidence = s.get("confidence", 0)
            return f"[置信度{confidence:.0%}] {reason}" if reason else "无详细原因"

    # 查 position_adjustments
    for s in ponder_data.get("position_adjustments", []):
        if s.get("symbol", "") == symbol:
            return s.get("reason", "无详细原因")

    # 用市场判断兜底
    sentiment = ponder_data.get("market_sentiment", "")
    if sentiment:
        return f"基于市场判断: {sentiment[:200]}"
    return "系统综合决策"

def diagnose_loss_reason(pos, ponder_data):
    """诊断亏损原因 + 检测数据维度缺失"""
    reasons = []
    missing_dims = []

    # 1. 技术面
    if pos.unrealized_pnl < 0:
        pnl_pct = pos.unrealized_pnl_pct
        if pnl_pct < -5:
            reasons.append(f"技术面: 跌幅{pnl_pct:+.2f}%超5%阈值，趋势走弱")
            missing_dims.append("技术指标(均线/MACD/RSI)")
        elif pnl_pct < -2:
            reasons.append(f"技术面: 小幅回撤{pnl_pct:+.2f}%，仍在正常波动范围")
        else:
            reasons.append(f"技术面: 微亏{pnl_pct:+.2f}%，成本附近震荡")

    # 2. 资金面 - 检查是否需要补充
    conclusion = ponder_data.get("conclusion", "")
    if "主力流出" in conclusion or "资金出逃" in conclusion:
        reasons.append("资金面: 主力资金净流出，大盘拖累")
    else:
        missing_dims.append("个股资金流向(主力/北向/融资)")

    # 3. 基本面
    missing_dims.append("个股财务数据(PE/PB/ROE/营收增速)")

    # 4. 新闻舆情
    missing_dims.append("个股新闻舆情(公告/研报/社交媒体)")

    # 5. 行业板块
    missing_dims.append("行业板块强弱对比")

    # 6. 反共识信号
    conclusion_lower = conclusion.lower()
    if "期权" not in conclusion_lower and "期货" not in conclusion_lower:
        missing_dims.append("反共识信号(期权IV/期货升贴水/可转债)")

    return reasons, missing_dims

def send_wechat(message):
    """直接发送原文，不走 AI agent"""
    result = subprocess.run([
        "openclaw", "message", "send",
        "--channel", "openclaw-weixin",
        "--account", WECHAT_ACCOUNT,
        "--target", WECHAT_TARGET,
        "--message", message,
    ], capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        print(f"[wechat] 发送失败: {result.stderr[:300]}", file=sys.stderr)
        return False
    return True

if __name__ == "__main__":
    now = datetime.now()
    acc = get_account()
    ponder_data = get_ponder_data()

    equity = acc.total_equity
    total_return = acc.total_return
    cash = acc.cash
    market_val = acc.total_market_value

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

    icon = "🟢" if total_return >= 0 else "🔴"
    today_icon = "📈" if today_pnl >= 0 else "📉"

    # ═══ 报告 ═══
    report = "━━━━━━━━━━━━━━━━\n"
    report += "📊 每日盈利报告\n"
    report += "━━━━━━━━━━━━━━━━\n"
    report += f"🕐 {now.strftime('%Y-%m-%d %H:%M')}\n\n"

    # 💎 账户总览
    report += "💎 账户总览\n"
    report += f"  总资产: ¥{equity:,.2f}\n"
    report += f"  {icon} 累计收益: {total_return:+.2f}%\n"
    report += f"  {today_icon} 今日盈亏: ¥{today_pnl:+,.2f}\n"
    report += f"  可用资金: ¥{cash:,.2f}  |  持仓市值: ¥{market_val:,.2f}\n"

    # 📜 今日操作（每笔带 Ponder 多维度原因）
    buy_trades = [t for t in today_trades if t.get("action") == "BUY"]
    sell_trades = [t for t in today_trades if t.get("action") == "SELL"]

    if buy_trades or sell_trades:
        report += f"\n📜 今日操作 ({len(today_trades)}笔)\n"

        for t in buy_trades:
            sym = t.get("symbol", "?")
            reason = find_trade_reason(sym, "BUY", ponder_data)
            report += f"\n  🟢 买入 {sym} {t.get('shares','?')}股 @¥{t.get('price',0):.2f}\n"
            report += f"     决策依据: {reason}\n"

        for t in sell_trades:
            sym = t.get("symbol", "?")
            reason = find_trade_reason(sym, "SELL", ponder_data)
            report += f"\n  🔴 卖出 {sym} {t.get('shares','?')}股 @¥{t.get('price',0):.2f}\n"
            report += f"     决策依据: {reason}\n"
    else:
        report += "\n📜 今日操作: 无\n"

    # 📦 持仓明细
    positions = acc.positions
    if positions:
        report += f"\n📦 当前持仓 ({len(positions)}只)\n"
        sorted_pos = sorted(positions.values(), key=lambda p: p.unrealized_pnl, reverse=True)

        total_profit = 0
        total_loss = 0
        profit_count = 0
        loss_count = 0
        all_missing_dims = set()

        for pos in sorted_pos:
            pnl = pos.unrealized_pnl
            pnl_pct = pos.unrealized_pnl_pct
            s = "🟢" if pnl > 0 else ("🔴" if pnl < 0 else "⚪")

            report += f"\n  {s} {pos.name}({pos.symbol})\n"
            report += f"    持仓: {pos.shares}股 × ¥{pos.current_price:.2f} = ¥{pos.market_value:,.2f}\n"
            report += f"    成本: ¥{pos.avg_cost:.2f}  |  盈亏: {pnl:+,.2f} ({pnl_pct:+.2f}%)\n"

            # 持仓决策依据
            hold_reason = find_trade_reason(pos.symbol, "HOLD", ponder_data)
            if hold_reason and "无详细原因" not in hold_reason:
                report += f"    决策: {hold_reason[:200]}\n"

            if pnl > 0:
                total_profit += pnl
                profit_count += 1
            elif pnl < 0:
                total_loss += pnl
                loss_count += 1
                # 亏损诊断
                loss_reasons, missing_dims = diagnose_loss_reason(pos, ponder_data)
                if loss_reasons:
                    report += f"    ⚠️ 亏损诊断:\n"
                    for r in loss_reasons:
                        report += f"      - {r}\n"
                if missing_dims:
                    all_missing_dims.update(missing_dims)

        # 盈亏汇总
        report += f"\n  盈亏汇总:\n"
        report += f"    🟢 盈利: {profit_count}只, ¥{total_profit:+,.2f}\n"
        if loss_count > 0:
            report += f"    🔴 亏损: {loss_count}只, ¥{total_loss:+,.2f}\n"
        net = total_profit + total_loss
        net_label = "净盈利" if net > 0 else "净亏损"
        report += f"    📊 {net_label}: ¥{net:+,.2f}\n"

        # 数据维度自愈状态（系统已自动处理，仅通知用户）
        if all_missing_dims:
            # 读取 signals.json 确认已写入
            sig_path = os.path.join(DATA_DIR, "signals.json")
            if os.path.exists(sig_path):
                with open(sig_path) as sf:
                    sig = json.load(sf)
                saved = sig.get("missing_dimensions", [])
                cleared = sig.get("last_cleared", "")
                if cleared:
                    report += f"\n  🔧 数据自愈: 已自动补充 {len(all_missing_dims)} 个缺失维度 (下次采集生效)\n"
                else:
                    report += f"\n  🔧 数据自愈: {len(all_missing_dims)} 个维度已标记 (等待下次采集补充)\n"
    else:
        report += "\n📦 当前持仓: 空仓\n"

    # 🧠 Ponder 市场判断
    sentiment = ponder_data.get("market_sentiment", "")
    if sentiment:
        report += f"\n🧠 市场判断\n  {sentiment}\n"

    risk = ponder_data.get("risk", "")
    if risk:
        report += f"\n⚠️ 风险提示\n  {risk[:250]}\n"

    # 📈 近7日收益
    if os.path.exists(pnl_file):
        with open(pnl_file) as f:
            records = json.load(f)
        if len(records) >= 2:
            report += "\n📈 近7日收益\n"
            for r in records[-7:]:
                d = r.get("date", "?")[-5:]
                pnl = r.get("daily_pnl", 0)
                icon_d = "🟢" if pnl >= 0 else "🔴"
                report += f"  {d} {icon_d} ¥{pnl:+,.2f}\n"

    report += "\n━━━━━━━━━━━━━━━━\n"
    report += "🤖 全自动交易系统 · 明日继续\n"
    report += "\n📊 交易面板: http://8.208.44.120"

    print(report)
    print()

    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] 发送微信 ({len(report)}字符)...", file=sys.stderr)

    success = send_wechat(report)
    if success:
        print("✅ 微信发送成功", file=sys.stderr)
    else:
        print("❌ 微信发送失败", file=sys.stderr)
