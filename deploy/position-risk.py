#!/usr/bin/env python3
"""
持仓五维风控模块 (Position Risk Audit)
======================================
对每个持仓做五维扫描：技术面/基本面/资金面/消息面/大盘相关性
输出每只股票的风险评分(0-100) + 反身性检查
"""

import json, sys, os, traceback
from datetime import datetime, timedelta

DATA_DIR = "/opt/scripts/data"

def safe_fetch(fn, label):
    try: return fn()
    except Exception as e: return {"error": f"{label}: {str(e)[:120]}"}

# ═══ 维度1: 技术面 ═══

def technical_risk(pos):
    """检查持仓的技术面风险：趋势/波动率/支撑压力"""
    import akshare as ak
    symbol = pos.get("symbol", "")
    code = symbol.replace("sh", "").replace("sz", "")
    risk = {"score": 0, "signals": [], "level": "low"}

    try:
        # 拉近20日K线
        df = ak.stock_zh_a_hist(symbol=code, period="daily",
            start_date=(datetime.now()-timedelta(days=30)).strftime("%Y%m%d"),
            end_date=datetime.now().strftime("%Y%m%d"),
            adjust="qfq")
        if df is None or len(df) < 5:
            risk["signals"].append("无法获取K线数据")
            risk["score"] += 20
            return risk

        closes = df["收盘"].values
        current = closes[-1]

        # 1. 均线偏离度
        ma5 = closes[-5:].mean()
        ma20 = closes[-20:].mean() if len(closes) >= 20 else closes.mean()
        ma_dev = abs(current - ma20) / ma20 * 100
        if ma_dev > 15:
            risk["score"] += 25
            risk["signals"].append(f"远离20日均线 {ma_dev:.1f}%")
        elif ma_dev > 10:
            risk["score"] += 15
            risk["signals"].append(f"偏离20日均线 {ma_dev:.1f}%")

        # 2. 短期趋势
        if current < ma5 < ma20:
            risk["score"] += 20
            risk["signals"].append("空头排列(短期<中期)")
        elif current < ma20:
            risk["score"] += 10
            risk["signals"].append("跌破20日均线")

        # 3. 波动率突变
        if len(closes) >= 10:
            vol_recent = closes[-5:].std() / closes[-5:].mean()
            vol_prev = closes[-10:-5].std() / closes[-10:-5].mean()
            if vol_recent > vol_prev * 2:
                risk["score"] += 15
                risk["signals"].append(f"波动率急剧放大 {vol_recent/vol_prev:.1f}x")

        # 4. 成交量异常
        if "成交量" in df.columns:
            vol_recent = df["成交量"].iloc[-5:].mean()
            vol_prev = df["成交量"].iloc[-20:-5].mean() if len(df) >= 20 else df["成交量"].mean()
            if vol_recent > vol_prev * 3:
                risk["score"] += 10
                risk["signals"].append("放量异常(3倍+)")

    except Exception as e:
        risk["signals"].append(f"技术面分析异常: {str(e)[:60]}")
        risk["score"] += 15

    risk["level"] = "high" if risk["score"] >= 30 else ("medium" if risk["score"] >= 15 else "low")
    return risk

# ═══ 维度2: 基本面 ═══

def fundamental_risk(pos):
    """检查基本面风险：财报异动/估值漂移"""
    risk = {"score": 0, "signals": [], "level": "low"}

    try:
        import akshare as ak
        symbol = pos.get("symbol", "")
        code = symbol.replace("sh", "").replace("sz", "")

        # 业绩预告
        df = ak.stock_yjyg_em()
        if df is not None and len(df) > 0:
            name = pos.get("name", "")
            for _, r in df.iterrows():
                if name and name in str(r.get("股票简称", "")):
                    change = str(r.get("业绩变动", ""))
                    if "亏损" in change or "预减" in change or "下降" in change:
                        risk["score"] += 25
                        risk["signals"].append(f"业绩预警: {change}")
                    break
    except: pass

    try:
        import akshare as ak
        symbol = pos.get("symbol", "")
        code = symbol.replace("sh", "").replace("sz", "")
        df = ak.stock_individual_info_em(symbol=code)
        if df is not None and len(df) > 0:
            info = dict(zip(df["item"], df["value"]))
            pe = float(info.get("市盈率-动态", 0))
            if pe > 100:
                risk["score"] += 15
                risk["signals"].append(f"PE极高: {pe:.0f}")
            elif pe > 50:
                risk["score"] += 8
                risk["signals"].append(f"PE偏高: {pe:.0f}")
    except: pass

    risk["level"] = "high" if risk["score"] >= 20 else ("medium" if risk["score"] >= 10 else "low")
    return risk

# ═══ 维度3: 资金面 ═══

def capital_flow_risk(pos):
    """检查资金面风险：北向/两融/大单资金流变化"""
    risk = {"score": 0, "signals": [], "level": "low"}

    try:
        import akshare as ak
        symbol = pos.get("symbol", "")
        code = symbol.replace("sh", "").replace("sz", "")

        # 个股资金流
        df = ak.stock_individual_fund_flow(code, market="sh" if "sh" in symbol else "sz")
        if df is not None and len(df) >= 5:
            recent = df.tail(5)
            main_net = recent["主力净流入-净额"].sum()
            if main_net < -10000:  # 近5日主力净流出超1亿
                risk["score"] += 20
                risk["signals"].append(f"主力持续流出 {main_net/10000:.0f}万")
            elif main_net < -5000:
                risk["score"] += 10
                risk["signals"].append(f"主力偏流出 {main_net/10000:.0f}万")
    except: pass

    try:
        # 融资融券标的检查
        import akshare as ak
        df = ak.stock_margin_sse()
        if df is not None and len(df) >= 5:
            recent = df.tail(5)
            if "融资余额" in df.columns:
                margin_change = (recent["融资余额"].iloc[-1] - recent["融资余额"].iloc[0]) / recent["融资余额"].iloc[0]
                if margin_change < -0.05:
                    risk["score"] += 10
                    risk["signals"].append("融资余额快速下降")
    except: pass

    risk["level"] = "high" if risk["score"] >= 20 else ("medium" if risk["score"] >= 10 else "low")
    return risk

# ═══ 维度4: 消息面 ═══

def news_risk(pos):
    """检查消息面风险：公告/舆情/政策"""
    risk = {"score": 0, "signals": [], "level": "low"}

    try:
        import akshare as ak
        name = pos.get("name", "")

        # 新闻搜索
        df = ak.stock_news_em()
        if df is not None and len(df) > 0:
            neg_keywords = ["亏损", "下滑", "减持", "处罚", "诉讼", "退市", "违规", "冻结", "立案",
                          "利空", "暴雷", "暴跌", "崩盘"]
            for _, r in df.head(20).iterrows():
                title = str(r.get("新闻标题", ""))
                if name and name in title:
                    for kw in neg_keywords:
                        if kw in title:
                            risk["score"] += 15
                            risk["signals"].append(f"负面新闻: {title[:60]}")
                            break
    except: pass

    risk["level"] = "high" if risk["score"] >= 20 else ("medium" if risk["score"] >= 10 else "low")
    return risk

# ═══ 维度5: 大盘相关性 ═══

def market_correlation_risk(pos):
    """检查大盘相关性风险：beta/行业联动/系统性风险"""
    risk = {"score": 0, "signals": [], "level": "low"}

    try:
        import akshare as ak
        symbol = pos.get("symbol", "")
        code = symbol.replace("sh", "").replace("sz", "")

        # 大盘状态
        df = ak.stock_zh_index_spot_em()
        if df is not None and len(df) > 0:
            targets = {"上证指数": None, "科创50": None, "中证1000": None}
            for _, r in df.iterrows():
                if r["名称"] in targets:
                    targets[r["名称"]] = float(r["涨跌幅"])

            # 大盘整体走弱
            sh = targets.get("上证指数", 0) or 0
            if sh < -1.5:
                risk["score"] += 20
                risk["signals"].append(f"大盘下跌 {sh:.1f}%")
            elif sh < -0.5:
                risk["score"] += 10
                risk["signals"].append(f"大盘偏弱 {sh:.1f}%")

        # 市场宽度
        up = len(df[df["涨跌幅"] > 0])
        total = len(df)
        if total > 0 and up / total < 0.3:
            risk["score"] += 15
            risk["signals"].append(f"市场极弱势(涨跌比<0.3)")

    except: pass

    risk["level"] = "high" if risk["score"] >= 20 else ("medium" if risk["score"] >= 10 else "low")
    return risk

# ═══ 反身性检查 ═══

def reflexivity_check(pos, total_score):
    """如果我不持有这只股票，基于当前信号我还推荐吗？"""
    name = pos.get("name", "")
    pnl_pct = pos.get("unrealized_pnl_pct", 0)

    if total_score >= 60:
        return {"conclusion": "如果今天才看到它，不会买", "reason": f"五维风险总分{total_score}过高",
            "bias_alert": "可能被持仓偏见蒙蔽——已有收益让我忽略了风险信号"}
    elif pnl_pct < -10:
        return {"conclusion": "沉没成本效应风险", "reason": f"已亏损{pnl_pct:.1f}%，可能因不愿止损而持有",
            "bias_alert": "人在亏损时倾向于冒险——应客观评估"}
    elif pnl_pct > 30 and total_score >= 30:
        return {"conclusion": "收益锁定偏好", "reason": f"已盈利{pnl_pct:.1f}%但风险信号在积累",
            "bias_alert": "获利了结的诱惑可能让人忽略中期风险信号"}
    else:
        return {"conclusion": "判断一致性良好", "reason": "当前风险水平与持仓逻辑一致",
            "bias_alert": None}

# ═══ 主函数 ═══

def main():
    print(f"🔍 持仓风控审计... {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", file=sys.stderr)

    # 加载持仓
    sys.path.insert(0, "/opt/scripts")
    from paper_account import Account

    try:
        acc = Account.load("default")
    except Exception as e:
        print(f"❌ 无法加载账户: {e}", file=sys.stderr)
        sys.exit(1)

    positions = acc.positions
    if not positions:
        print("ℹ️ 无持仓，跳过大盘风控", file=sys.stderr)
        result = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "positions": [],
            "summary": {"total_positions": 0, "high_risk_count": 0,
                "avg_risk_score": 0, "overall_level": "low"}
        }
        print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
        return

    results = []
    for sid, pos in positions.items():
        pos_dict = {
            "symbol": pos.symbol,
            "name": pos.name,
            "shares": pos.shares,
            "current_price": pos.current_price,
            "unrealized_pnl": pos.unrealized_pnl,
            "unrealized_pnl_pct": pos.unrealized_pnl_pct,
        }
        print(f"  扫描 {pos.name}({pos.symbol})...", file=sys.stderr)

        tech = safe_fetch(lambda: technical_risk(pos_dict), "技术面")
        funda = safe_fetch(lambda: fundamental_risk(pos_dict), "基本面")
        flow = safe_fetch(lambda: capital_flow_risk(pos_dict), "资金面")
        news = safe_fetch(lambda: news_risk(pos_dict), "消息面")
        mkt = safe_fetch(lambda: market_correlation_risk(pos_dict), "大盘")

        dimensions = {"technical": tech, "fundamental": funda, "capital_flow": flow,
            "news_sentiment": news, "market_corr": mkt}

        total = sum(max(0, d.get("score", 0)) for d in dimensions.values())
        high_dims = [k for k, d in dimensions.items() if d.get("level") == "high"]
        overall = "high" if total >= 60 or len(high_dims) >= 3 else ("medium" if total >= 30 else "low")

        reflex = reflexivity_check(pos_dict, total)

        results.append({
            "symbol": pos.symbol,
            "name": pos.name,
            "risk_score": total,
            "risk_level": overall,
            "high_risk_dimensions": high_dims,
            "dimensions": dimensions,
            "reflexivity": reflex,
            "position": pos_dict
        })

    # 汇总
    high_count = sum(1 for r in results if r["risk_level"] == "high")
    avg_score = sum(r["risk_score"] for r in results) / len(results) if results else 0

    result = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "positions": results,
        "summary": {
            "total_positions": len(results),
            "high_risk_count": high_count,
            "avg_risk_score": round(avg_score, 1),
            "overall_level": "high" if high_count >= 2 else ("medium" if high_count >= 1 else "low")
        }
    }

    # 落盘
    os.makedirs(DATA_DIR, exist_ok=True)
    risk_file = os.path.join(DATA_DIR, "position-risk.json")
    with open(risk_file, 'w') as f:
        json.dump(result, f, ensure_ascii=False, indent=2, default=str)

    print(f"✅ 风控完成: {len(results)}只持仓, {high_count}只高风险, 均分{avg_score:.0f}", file=sys.stderr)
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))

if __name__ == "__main__":
    main()
