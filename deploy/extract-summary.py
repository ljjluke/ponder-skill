#!/usr/bin/env python3
"""从采集JSON提取全维度信号摘要 —— 覆盖全部12个维度，目标3000+字符"""
import json, sys, math

with open(sys.argv[1]) as f:
    data = json.load(f)

dims = data.get("dimensions", {})
lines = [f'📡 采集时间: {data.get("timestamp","-")}', ""]

# ─────────────── 1. price — A股/美股/港股指数 ───────────────
price = dims.get("price", {})
a_share = price.get("a_share", [])
if isinstance(a_share, list) and a_share:
    items = [f'{i["name"]}{i["price"]}({i["change_pct"]:+.2f}%)' for i in a_share[:8]]
    lines.append(f'【A股指数】{" | ".join(items)}')
us = price.get("us", {})
if isinstance(us, dict) and us:
    items = []
    for k, v in us.items():
        if "error" not in str(v):
            items.append(f'{k}{v["price"]}({v["change_pct"]:+.2f}%)')
    if items:
        lines.append(f'【美股】{" | ".join(items)}')
hk = price.get("hk", [])
if isinstance(hk, list) and hk:
    items = [f'{i["name"]}{i["price"]}({i["change_pct"]:+.2f}%)' for i in hk]
    lines.append(f'【港股】{" | ".join(items)}')
gl = price.get("global", {})
if isinstance(gl, dict) and gl:
    items = []
    for k, v in gl.items():
        if isinstance(v, dict) and "error" not in str(v):
            items.append(f'{k}{v["price"]}({v["change_pct"]:+.2f}%)')
    if items:
        lines.append(f'【全球指数】{" | ".join(items)}')

# ─────────────── 2. fund_flow — 资金流向 ───────────────
ff = dims.get("fund_flow", {})
mkt = ff.get("market", {})
if isinstance(mkt, dict) and mkt and mkt.get("main_net_wan") is not None and not (isinstance(mkt.get("main_net_wan"), float) and math.isnan(mkt["main_net_wan"])):
    wan = mkt["main_net_wan"] / 1e8
    lines.append(f'【主力资金】净流{"入" if wan>=0 else "出"}{abs(wan):.1f}亿,占比{mkt.get("main_net_pct",0):.2f}%')
north = ff.get("north", {})
if isinstance(north, dict) and north.get("net_flow_wan") is not None:
    nw = north["net_flow_wan"]
    if isinstance(nw, (int, float)) and not math.isnan(nw):
        lines.append(f'【北向资金】净买{"入" if nw>=0 else "出"}{abs(nw)/1e4:.2f}亿')
    else:
        lines.append(f'【北向资金】数据暂缺')
margin = ff.get("margin", [])
if isinstance(margin, list) and margin:
    latest = margin[-1]
    mz = latest.get("融资余额","-")
    if isinstance(mz, (int,float)):
        mz = f'{mz/1e8:.0f}亿'
    lines.append(f'【融资融券】融资{mz}')

# ─────────────── 3. sentiment — 新闻/百度热搜/社交媒体 ───────────────
sent = dims.get("sentiment", {})
news = sent.get("news", [])
if isinstance(news, list) and news:
    lines.append("【财经新闻TOP5】")
    for n in news[:5]:
        emoji = "📈" if n.get("情感",0) > 0 else "📉" if n.get("情感",0) < 0 else "📑"
        lines.append(f'  {emoji}[{n.get("关键词","")}]{n.get("新闻标题","")[:80]}')
baidu = sent.get("baidu", [])
if isinstance(baidu, list) and baidu:
    names = ", ".join([b.get("名称/代码","") for b in baidu[:8]])
    lines.append(f'【百度热搜股】{names}')
xueqiu = sent.get("xueqiu", [])
if isinstance(xueqiu, list) and xueqiu:
    items = [f'{x.get("股票名称","")}热度{x.get("热度",0)}' for x in xueqiu[:5]]
    lines.append(f'【雪球热议】{" | ".join(items)}')
hot_rank = sent.get("hot_rank", [])
if isinstance(hot_rank, list) and hot_rank:
    items = [f'{h.get("股票名称","")}' for h in hot_rank[:5]]
    lines.append(f'【人气榜】{" | ".join(items)}')

# ─────────────── 4. dragon_tiger — 龙虎榜 ───────────────
dt = dims.get("dragon_tiger", {})
overview = dt.get("overview", [])
if isinstance(overview, list) and overview:
    lines.append("【龙虎榜净买TOP5】")
    for s in overview[:5]:
        jj = s.get("净额", 0)
        emoji = "🟢" if jj > 0 else "🔴"
        lines.append(f'  {emoji}{s.get("股票名称","")}净买{jj/1e4:.1f}万 | 上榜{s.get("上榜次数",1)}次')
stocks = dt.get("stocks", [])
if isinstance(stocks, list) and stocks:
    for s in stocks[:3]:
        jj = s.get("龙虎榜净买额",0)
        emoji = "🟢" if jj > 0 else "🔴"
        lines.append(f'  {emoji}{s.get("名称","")}净买{jj}万 | {str(s.get("解读",""))[:60]}')

# ─────────────── 5. institutions — 研报/机构调研 ───────────────
inst = dims.get("institutions", {})
research = inst.get("research", [])
if isinstance(research, list) and research:
    lines.append("【最新研报推荐】")
    for r in research[:5]:
        lines.append(f'  📄 {r.get("股票简称","")} {r.get("东财评级","")} — {r.get("机构","")} 目标价{r.get("目标价","-")}')
visits = inst.get("visits", [])
if isinstance(visits, list) and visits:
    lines.append("【机构密集调研】")
    for v in visits[:5]:
        lines.append(f'  🏢 {v.get("名称","")} 接待{v.get("接待机构数量",0)}家')
earnings = inst.get("earnings", [])
if isinstance(earnings, list) and earnings:
    items = [f'{e.get("股票简称","")}{e.get("业绩变动","")[:30]}' for e in earnings[:3] if e.get("业绩变动")]
    if items:
        lines.append(f'【业绩预告】{" | ".join(items)}')

# ─────────────── 6. macro — 宏观数据 ───────────────
macro = dims.get("macro", {})
snap = macro.get("snapshot", {})
if isinstance(snap, dict) and snap:
    items = []
    for k, v in snap.items():
        label = {"pmi_mfg":"PMI制造业","pmi_non_mfg":"PMI非制造业","cpi_yoy":"CPI同比","ppi_yoy":"PPI同比",
                 "m2_yoy":"M2同比","m1_yoy":"M1同比","shibor_on":"Shibor隔夜","shibor_1w":"Shibor1周",
                 "shibor_1m":"Shibor1月","lpr_1y":"LPR1年","lpr_5y":"LPR5年","lpr_reform":"LPR改革",
                 "loan_rate":"贷款基准","deposit_rate":"存款基准","fx_reserve":"外汇储备",
                 "trade_balance":"贸易顺差","gdp_q1":"GDP一季度","gdp_q2":"GDP二季度"}.get(k, k)
        items.append(f'{label}{v}')
    if items:
        lines.append(f'【宏观数据】{" | ".join(items)}')
fed = macro.get("fed", {})
if isinstance(fed, dict) and fed:
    rate = fed.get("rate")
    if isinstance(rate, (int,float)) and not math.isnan(rate):
        lines.append(f'【美联储利率】{rate}% ({fed.get("date","")})')

# ─────────────── 7. commodities — 大宗商品 ───────────────
com = dims.get("commodities", {})
intl = com.get("intl", {})
if isinstance(intl, dict) and intl:
    items = []
    for k, v in intl.items():
        if "error" not in str(v):
            items.append(f'{k}{v["price"]}({v["change_pct"]:+.2f}%)')
    if items:
        lines.append(f'【国际大宗】{" | ".join(items)}')
dom = com.get("domestic", [])
if isinstance(dom, list) and dom:
    items = [f'{d.get("商品名称",d.get("name","?"))}{d.get("最新价格",d.get("price","?"))}' for d in dom[:5]]
    lines.append(f'【国内大宗】{" | ".join(items)}')

# ─────────────── 8. market_structure — 市场宽度 ───────────────
ms = dims.get("market_structure", {})
breadth = ms.get("breadth", {})
if isinstance(breadth, dict) and "up_pct" in breadth:
    note = breadth.get("note","")
    lines.append(f'【市场宽度】涨{breadth["up_pct"]}%/跌{breadth["down_pct"]}% | {note}')
limit_up = ms.get("limit_up", {})
if isinstance(limit_up, dict) and limit_up:
    lu = f'涨停{limit_up.get("limit_up_count",0)}家'
    ft = limit_up.get("first_time","")
    if ft: lu += f' | 首板{ft}'
    lines.append(f'【涨跌停】{lu}')
limit_down = ms.get("limit_down", {})
if isinstance(limit_down, dict) and limit_down:
    lines.append(f'【跌停】{limit_down.get("limit_down_count",0)}家')

# ─────────────── 9. anti_consensus — 反共识信号 ───────────────
ac = dims.get("anti_consensus", {})
# 期权IV
option_iv = ac.get("option_iv", {})
if isinstance(option_iv, dict) and option_iv.get("iv_call", 0) != 0:
    lines.append(f'【期权IV】看涨{option_iv["iv_call"]:.1f}% 看跌{option_iv["iv_put"]:.1f}% | PCR{option_iv.get("pcr_volume",0):.2f}')
# 期货基差
futures = ac.get("futures_basis", {})
if isinstance(futures, dict) and futures:
    items = []
    for k, v in futures.items():
        if isinstance(v, dict) and "basis" in v:
            items.append(f'{k}基差{v["basis"]:+.2f}%')
    if items:
        lines.append(f'【期货基差】{" | ".join(items)}')
# 转债溢价
cb = ac.get("cb_premium", [])
if isinstance(cb, list) and cb:
    items = [f'{c.get("转债名称","")}溢价{c.get("转股溢价率",0):.1f}%' for c in cb[:5]]
    lines.append(f'【转债溢价率】{" | ".join(items)}')
# 内部交易
insider = ac.get("insider_trade", [])
if isinstance(insider, list) and insider:
    items = []
    for it in insider[:5]:
        emoji = "🟢" if "增" in str(it.get("变动方向","")) else "🔴"
        items.append(f'{emoji}{it.get("股票名称","")}{it.get("变动方向","")}{it.get("变动数量",0)}股')
    if items:
        lines.append(f'【内部交易】{" | ".join(items)}')

# ─────────────── 10. cross_market — 跨市场比价 ───────────────
cm = dims.get("cross_market", {})
us_china = cm.get("us_china", {})
if isinstance(us_china, dict) and us_china:
    items = []
    for k, v in us_china.items():
        if isinstance(v, dict) and "change_pct" in v:
            items.append(f'{k}{v["price"]}({v["change_pct"]:+.2f}%)')
    if items:
        lines.append(f'【中概股】{" | ".join(items)}')
ah = cm.get("ah", {})
if isinstance(ah, dict) and ah:
    items = []
    for k, v in ah.items():
        if isinstance(v, dict) and "溢价率" in v:
            items.append(f'{k}AH溢价{v["溢价率"]:+.2f}%')
    if items:
        lines.append(f'【A/H溢价】{" | ".join(items)}')

# ─────────────── 11. shares — 限售解禁/股东增减持 ───────────────
sh = dims.get("shares", {})
restricted = sh.get("restricted", [])
if isinstance(restricted, list) and restricted:
    items = [f'{r.get("股票名称","")}解禁{r.get("解禁数量(股)",0)/1e4:.0f}万股' for r in restricted[:5]]
    # 过滤掉全0
    items = [i for i in items if "解禁0万股" not in i]
    if items:
        lines.append(f'【限售解禁】{" | ".join(items)}')
holders = sh.get("holders", [])
if isinstance(holders, list) and holders:
    items = []
    for h in holders[:5]:
        emoji = "🟢" if "增" in str(h.get("变动方向","")) else "🔴"
        items.append(f'{emoji}{h.get("股票名称","")}{h.get("变动方向","")}{abs(h.get("变动数量",0))/1e4:.0f}万股')
    items = [i for i in items if "0万股" not in i.split("动")[-1]]
    if items:
        lines.append(f'【股东增减持】{" | ".join(items)}')

# ─────────────── 12. data_quality — 数据质量诊断 ───────────────
dq = dims.get("data_quality", {})
if isinstance(dq, dict) and dq:
    degraded = dq.get("degraded_dimensions", [])
    if degraded:
        lines.append(f'⚠️ 降级维度: {", ".join(degraded)}')
    errors = dq.get("errors", [])
    if errors:
        lines.append(f'⚠️ 数据异常: {"; ".join(str(e)[:80] for e in errors[:3])}')

output = "\n".join(lines)
sys.stderr.write(f"[extract-summary] 生成摘要 {len(output)} 字符\n")
print(output)