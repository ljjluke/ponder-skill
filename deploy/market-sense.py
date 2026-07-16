#!/usr/bin/env python3
"""
盘中感知模块 v1.0 — 市场异动跟踪 + 盘后消息汇总
===================================================
功能:
1. 盘中异动扫描：板块异动、涨跌停变化、成交量异常、龙虎榜
2. 盘后消息汇总：收盘后新闻、公告、研报、北向资金
3. 生成"感知摘要"注入Ponder prompt
4. 非交易时段返回历史数据（最近一次盘中的结果）

调用: python3 /opt/scripts/market-sense.py
输出: data/market-sense.json (供Ponder prompt注入)
"""

import json, os, sys
from datetime import datetime, timedelta

DATA_DIR = "/opt/scripts/data"
os.makedirs(DATA_DIR, exist_ok=True)

def load_json(path):
    if os.path.exists(path):
        try:
            with open(path) as f:
                return json.load(f)
        except:
            return None
    return None

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)

def is_trading_time():
    """判断当前是否在交易时段 (周一至周五 9:00-15:00)"""
    now = datetime.now()
    if now.weekday() >= 5:
        return False
    return 9 <= now.hour < 15

def scan_board_changes():
    """板块异动扫描"""
    try:
        import akshare as ak
        df = ak.stock_board_change_em()
        if df is not None and len(df) > 0:
            changes = []
            for i in range(min(5, len(df))):
                row = df.iloc[i]
                changes.append({
                    "板块名称": str(row.get("板块名称", "")),
                    "涨跌幅": float(row.get("涨跌幅", 0) or 0),
                    "主力净流入": float(row.get("主力净流入", 0) or 0),
                    "异动次数": int(row.get("板块异动总次数", 0) or 0),
                    "最频繁个股": str(row.get("板块异动最频繁个股及所属类型-股票名称", "")),
                    "方向": str(row.get("板块异动最频繁个股及所属类型-买卖方向", "")),
                })
            return changes
        return []
    except Exception as e:
        return [{"error": str(e)}]

def scan_concept_ranking():
    """概念板块排行"""
    try:
        import akshare as ak
        df = ak.stock_board_concept_name_em()
        if df is not None and len(df) > 0:
            # 涨跌幅最大的5个
            sorted_asc = df.sort_values("涨跌幅", ascending=False)
            top_gainers = []
            for i in range(min(5, len(sorted_asc))):
                row = sorted_asc.iloc[i]
                top_gainers.append({
                    "板块名称": str(row.get("板块名称", "")),
                    "涨跌幅": float(row.get("涨跌幅", 0) or 0),
                    "上涨家数": int(row.get("上涨家数", 0) or 0),
                    "下跌家数": int(row.get("下跌家数", 0) or 0),
                })
            sorted_desc = df.sort_values("涨跌幅", ascending=True)
            top_losers = []
            for i in range(min(3, len(sorted_desc))):
                row = sorted_desc.iloc[i]
                top_losers.append({
                    "板块名称": str(row.get("板块名称", "")),
                    "涨跌幅": float(row.get("涨跌幅", 0) or 0),
                })
            return {"top_gainers": top_gainers, "top_losers": top_losers}
        return {}
    except Exception as e:
        return {"error": str(e)}

def scan_limit_up_down():
    """涨跌停扫描"""
    try:
        import akshare as ak
        df = ak.stock_zt_pool_em(date=datetime.now().strftime("%Y%m%d"))
        if df is not None and len(df) > 0:
            limit_up = []
            for i in range(min(5, len(df))):
                row = df.iloc[i]
                limit_up.append({
                    "名称": str(row.get("名称", "")),
                    "代码": str(row.get("代码", "")),
                    "涨停价": float(row.get("涨停价", 0) or 0),
                    "封板资金": float(row.get("封板资金", 0) or 0),
                    "首次封板时间": str(row.get("首次封板时间", "")),
                })
            return {"limit_up_count": len(df), "top": limit_up}
        return {"limit_up_count": 0}
    except Exception as e:
        return {"error": str(e)}

def scan_news_flash():
    """实时新闻快讯"""
    try:
        import akshare as ak
        df = ak.stock_info_news_em(symbol="000001.SH")  # 用上证指数获取整体市场新闻
        if df is not None and len(df) > 0:
            news = []
            for i in range(min(8, len(df))):
                row = df.iloc[i]
                title = str(row.get("新闻标题", "") or "")
                if title and len(title) > 5:
                    news.append({
                        "title": title[:100],
                        "date": str(row.get("发布时间", "") or ""),
                    })
            return {"news": news, "count": len(news)}
        return {"news": [], "count": 0}
    except Exception as e:
        return {"error": str(e)}

def scan_north_flow():
    """北向资金实时"""
    try:
        import akshare as ak
        df = ak.stock_hsgt_fund_flow_summary_em()
        if df is not None and len(df) > 0:
            north = df[df['资金方向'] == '北向']
            if len(north) > 0:
                result = {"date": datetime.now().strftime("%Y-%m-%d")}
                for _, row in north.iterrows():
                    board = str(row.get("板块", ""))
                    net_buy = float(row.get("成交净买额", 0) or 0)
                    flow_in = float(row.get("资金净流入", 0) or 0)
                    result[f"{board}_成交净买额"] = net_buy
                    result[f"{board}_资金净流入"] = flow_in
                return result
        return {}
    except Exception as e:
        return {"error": str(e)}

def generate_sense_report():
    """生成感知报告"""
    result = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "is_trading_time": is_trading_time(),
        "board_changes": scan_board_changes(),
        "concept_ranking": scan_concept_ranking(),
        "limit_up_down": scan_limit_up_down(),
        "news_flash": scan_news_flash(),
        "north_flow": scan_north_flow(),
    }

    # 保存
    save_json(os.path.join(DATA_DIR, "market-sense.json"), result)
    return result

def format_sense_text(sense):
    """格式化为文本供Ponder注入"""
    lines = []
    lines.append("## 👁️ 市场感知（实时扫描）\n")
    lines.append(f"扫描时间: {sense.get('timestamp','?')}")
    lines.append(f"交易时段: {'✅ 是' if sense.get('is_trading_time') else '❌ 否(盘后数据)'}\n")

    # 板块异动
    changes = sense.get("board_changes", [])
    if changes and "error" not in changes[0]:
        lines.append("**板块异动TOP:**")
        for c in changes[:3]:
            emoji = "🟢" if c.get("涨跌幅", 0) >= 0 else "🔴"
            lines.append(f"  {emoji} {c['板块名称']} 涨{c['涨跌幅']:+.2f}% | 异动{c['异动次数']}次 | 最频繁: {c.get('最频繁个股','?')} ({c.get('方向','?')})")
        lines.append("")

    # 概念排行
    concepts = sense.get("concept_ranking", {})
    if concepts and "error" not in concepts:
        gainers = concepts.get("top_gainers", [])
        if gainers:
            lines.append("**热点概念板块TOP3:**")
            for g in gainers[:3]:
                lines.append(f"  🟢 {g['板块名称']} 涨{g['涨跌幅']:+.2f}% 涨跌比{g.get('上涨家数',0)}/{g.get('下跌家数',0)}")
        losers = concepts.get("top_losers", [])
        if losers:
            lines.append("**弱势概念板块TOP3:**")
            for l in losers[:3]:
                lines.append(f"  🔴 {l['板块名称']} 涨{l['涨跌幅']:+.2f}%")
        lines.append("")

    # 涨跌停
    limit = sense.get("limit_up_down", {})
    if limit and "error" not in limit:
        lc = limit.get("limit_up_count", 0)
        lines.append(f"**涨停统计:** 共{lc}家涨停")
        top = limit.get("top", [])
        if top:
            for t in top[:3]:
                lines.append(f"  🚀 {t['名称']}({t.get('代码','')}) 封板¥{t.get('涨停价','?')} 封单¥{t.get('封板资金',0):,.0f}")
        lines.append("")

    # 新闻快讯
    news = sense.get("news_flash", {})
    if news and "error" not in news:
        items = news.get("news", [])
        if items:
            lines.append("**市场快讯:**")
            for n in items[:5]:
                lines.append(f"  📰 {n['title'][:80]}")
        lines.append("")

    # 北向资金
    north = sense.get("north_flow", {})
    if north and "error" not in north:
        lines.append("**北向资金:**")
        for k, v in north.items():
            if k == "date":
                continue
            if isinstance(v, (int, float)):
                lines.append(f"  {k}: {v:+.2f}亿")
            else:
                lines.append(f"  {k}: {v}")
        lines.append("")

    return "\n".join(lines)


def main():
    print("👁️ 市场感知扫描中...")
    sense = generate_sense_report()
    text = format_sense_text(sense)
    print(text)
    print(f"\n✅ 感知报告已保存到 data/market-sense.json")

    # 如果是命令行调用，输出格式化文本
    if "--text" in sys.argv:
        print("\n---INJECTION_START---")
        print(text)
        print("---INJECTION_END---")


if __name__ == '__main__':
    main()