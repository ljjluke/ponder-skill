#!/usr/bin/env python3
"""
虚拟交易账户 Web 面板
访问: http://8.208.44.120:8080
"""
import json, os, sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

sys.path.insert(0, "/opt/scripts")
from paper_account import Account

DATA_DIR = "/opt/scripts/data"
HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>虚拟交易账户</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:#0f172a; color:#e2e8f0; padding:20px; }
.container { max-width:800px; margin:0 auto; }
h1 { font-size:1.5rem; margin-bottom:20px; color:#38bdf8; }
.card { background:#1e293b; border-radius:12px; padding:20px; margin-bottom:16px; }
.card h2 { font-size:1rem; color:#94a3b8; margin-bottom:12px; }
.stat-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #334155; }
.stat-row:last-child { border-bottom:none; }
.stat-label { color:#94a3b8; }
.stat-value { font-weight:600; }
.green { color:#4ade80; }
.red { color:#f87171; }
.yellow { color:#fbbf24; }
.trade-row { padding:6px 0; border-bottom:1px solid #1e293b; font-size:0.9rem; }
.trade-row:last-child { border-bottom:none; }
.badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:0.8rem; font-weight:600; }
.badge-buy { background:#065f46; color:#4ade80; }
.badge-sell { background:#7f1d1d; color:#f87171; }
.refresh { color:#64748b; font-size:0.8rem; text-align:center; margin-top:20px; }
</style>
</head>
<body>
<div class="container">
<h1>📊 虚拟交易账户</h1>
{body}
<div class="refresh">🕐 刷新于 {time}</div>
</div>
</body>
</html>"""

def build_page():
    acc = Account.load("default")
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 账户总览
    ret_icon = "🟢" if acc.total_return >= 0 else "🔴"
    overview = f"""<div class="card">
<h2>💎 账户总览</h2>
<div class="stat-row"><span class="stat-label">总资产</span><span class="stat-value">¥{acc.total_equity:,.2f}</span></div>
<div class="stat-row"><span class="stat-label">可用现金</span><span class="stat-value">¥{acc.cash:,.2f}</span></div>
<div class="stat-row"><span class="stat-label">持仓市值</span><span class="stat-value">¥{acc.total_market_value:,.2f}</span></div>
<div class="stat-row"><span class="stat-label">累计收益</span><span class="stat-value {ret_class(acc.total_return)}">{ret_icon} {acc.total_return:+.2f}%</span></div>
<div class="stat-row"><span class="stat-label">初始资金</span><span class="stat-value">¥{acc.initial_capital:,.2f}</span></div>
</div>"""

    # 持仓明细
    if acc.positions:
        pos_html = '<div class="card"><h2>📦 持仓 ({})</h2>'.format(len(acc.positions))
        sorted_pos = sorted(acc.positions.values(), key=lambda p: p.unrealized_pnl, reverse=True)
        for p in sorted_pos:
            icon = "🟢" if p.unrealized_pnl > 0 else ("🔴" if p.unrealized_pnl < 0 else "⚪")
            pos_html += f"""<div class="stat-row">
<span class="stat-label">{icon} {p.name}<br><small style="color:#64748b">{p.symbol}</small></span>
<span style="text-align:right">
<div>{p.shares:,}股 × ¥{p.current_price:.2f}</div>
<div>市值 ¥{p.market_value:,.2f}</div>
<div class="{ret_class(p.unrealized_pnl)}">{p.unrealized_pnl:+,.2f} ({p.unrealized_pnl_pct:+.2f}%)</div>
</span></div>"""
        pos_html += '</div>'
    else:
        pos_html = '<div class="card"><h2>📦 持仓</h2><p style="color:#64748b">空仓</p></div>'

    # 交易历史
    if acc.trades:
        trade_html = '<div class="card"><h2>📜 交易历史 ({})</h2>'.format(len(acc.trades))
        for t in reversed(acc.trades[-20:]):
            badge = "badge-buy" if t.action == "BUY" else "badge-sell"
            label = "买入" if t.action == "BUY" else "卖出"
            trade_html += f"""<div class="trade-row">
<span class="badge {badge}">{label}</span>
{t.symbol} {t.name} {t.shares}股 @¥{t.price:.2f}
<span style="color:#64748b;float:right">{t.date[:16]}</span>
</div>"""
        trade_html += '</div>'
    else:
        trade_html = '<div class="card"><h2>📜 交易历史</h2><p style="color:#64748b">暂无交易</p></div>'

    # 每日盈亏
    pnl_file = os.path.join(DATA_DIR, "daily-pnl.json")
    pnl_html = ""
    if os.path.exists(pnl_file):
        with open(pnl_file) as f:
            records = json.load(f)
        if records:
            pnl_html = '<div class="card"><h2>📈 每日盈亏</h2>'
            for r in records[-7:]:
                d = r.get("date", "?")[-5:]
                pnl = r.get("daily_pnl", 0)
                icon = "🟢" if pnl >= 0 else "🔴"
                pnl_html += f'<div class="stat-row"><span class="stat-label">{d}</span><span class="stat-value {ret_class(pnl)}">{icon} ¥{pnl:+,.2f}</span></div>'
            pnl_html += '</div>'

    body = overview + pos_html + trade_html + pnl_html
    return HTML.replace('{body}', body).replace('{time}', now)

def ret_class(val):
    return "green" if val > 0 else ("red" if val < 0 else "")

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(build_page().encode("utf-8"))
        elif self.path == "/api":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            acc = Account.load("default")
            data = {
                "equity": acc.total_equity,
                "cash": acc.cash,
                "market_value": acc.total_market_value,
                "return": acc.total_return,
                "positions": {s: {"name": p.name, "shares": p.shares, "price": p.current_price, "pnl": p.unrealized_pnl, "pnl_pct": p.unrealized_pnl_pct} for s, p in acc.positions.items()},
                "trades": [{"date": t.date, "action": t.action, "symbol": t.symbol, "shares": t.shares, "price": t.price} for t in acc.trades[-10:]],
                "updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass

if __name__ == "__main__":
    port = 80
    print(f"📊 虚拟交易账户面板启动: http://8.208.44.120:{port}")
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()
