#!/usr/bin/env python3
"""
股票多维度信号采集脚本 v3.0
专业投资者10维信息框架 — 直接拉交易所/东方财富公开数据
"""

import json, sys, traceback
from datetime import datetime, timedelta

def safe_fetch(fn, label):
    try: return fn()
    except Exception as e: return {"error": f"{label}: {str(e)[:120]}"}

def df_latest(df):
    if df is None or len(df) == 0: return {}
    return dict(df.iloc[-1]) if hasattr(df, "iloc") else {}

# ═══ 维度1: 价格行情 ═══

def fetch_a_share_index():
    """腾讯行情API获取指数快照（东方财富接口不稳定时的稳定替代）"""
    import requests
    code_map = {
        "sh000001": "上证指数", "sz399001": "深证成指", "sz399006": "创业板指",
        "sh000688": "科创50", "sh000016": "上证50", "sh000300": "沪深300",
        "sh000905": "中证500", "sh000852": "中证1000"
    }
    url = f"http://qt.gtimg.cn/q={','.join(code_map.keys())}"
    r = requests.get(url, timeout=8)
    results = []
    for line in r.text.strip().split("\n"):
        parts = line.split("~")
        if len(parts) > 40:
            name = parts[1]
            price = float(parts[3]) if parts[3] else 0
            change_pct = float(parts[32]) if parts[32] else 0
            volume = float(parts[6]) if len(parts) > 6 and parts[6] else 0
            amount = float(parts[37]) if len(parts) > 37 and parts[37] else 0
            if name in code_map.values():
                results.append({"name": name, "price": price, "change_pct": change_pct,
                               "volume": volume, "amount": amount})
    return results

def fetch_hk_market():
    import akshare as ak
    try:
        df = ak.stock_hk_index_spot_em()
        targets = ["恒生指数","恒生科技指数","恒生中国企业指数"]
        return [{"name": r["名称"], "price": float(r["最新价"]), "change_pct": float(r["涨跌幅"])}
                for _, r in df.iterrows() if r["名称"] in targets]
    except: return None

def fetch_us_market():
    import yfinance as yf
    tickers = {"^GSPC":"标普500","^DJI":"道琼斯","^IXIC":"纳斯达克","^VIX":"VIX恐慌指数"}
    result = {}
    for sym, name in tickers.items():
        t = yf.Ticker(sym)
        info = t.history(period="5d")
        if len(info) >= 2:
            prev, cur = info["Close"].iloc[-2], info["Close"].iloc[-1]
            result[name] = {"price": round(float(cur),2), "change_pct": round((cur-prev)/prev*100,2), "volume": int(info["Volume"].iloc[-1])}
    return result

def fetch_global_indices():
    import yfinance as yf
    tickers = {"^N225":"日经225","^FTSE":"富时100","^STOXX50E":"欧洲斯托克50","^KS11":"韩国KOSPI","^TWII":"台湾加权","^BSESN":"印度SENSEX"}
    result = {}
    for sym, name in tickers.items():
        t = yf.Ticker(sym)
        info = t.history(period="2d")
        if len(info) >= 2:
            prev, cur = info["Close"].iloc[-2], info["Close"].iloc[-1]
            result[name] = {"price": round(float(cur),2), "change_pct": round((cur-prev)/prev*100,2)}
    return result

# ═══ 维度2: 资金面 ═══

def fetch_market_fund_flow():
    import akshare as ak
    try:
        df = ak.stock_market_fund_flow()
        r = df_latest(df)
        return {"date": str(r.get("日期","")), "main_net_wan": float(r.get("主力净流入-净额",0)),
            "main_net_pct": float(r.get("主力净流入-净占比",0)),
            "super_large_net": float(r.get("超大单净流入-净额",0)),
            "large_net": float(r.get("大单净流入-净额",0)),
            "medium_net": float(r.get("中单净流入-净额",0)),
            "small_net": float(r.get("小单净流入-净额",0))}
    except: return None

def fetch_north_flow():
    import akshare as ak
    try:
        df = ak.stock_hsgt_hist_em(symbol="北向资金")
        if df is not None and len(df) > 0:
            r = df.iloc[-1]
            return {"date": str(r.get("日期","")), "net_flow_wan": float(r.get("当日成交净买额",0)),
                "buy_wan": float(r.get("买入成交额",0)), "sell_wan": float(r.get("卖出成交额",0))}
    except: pass
    return None

def fetch_margin_trading():
    import akshare as ak
    try:
        df = ak.stock_margin_sse()
        return df.tail(5)[["信用交易日期","融资余额","融资买入额","融券余量","融资融券余额"]].to_dict("records")
    except: return None

def fetch_sector_fund_flow():
    import akshare as ak
    try:
        df = ak.stock_sector_fund_flow_summary()
        if df is not None and len(df) > 0:
            s = df.sort_values("主力净流入-净额", ascending=False)
            return {"top_inflow": s.head(5)[["板块名称","主力净流入-净额","涨跌幅"]].to_dict("records"),
                    "top_outflow": s.tail(5)[["板块名称","主力净流入-净额","涨跌幅"]].to_dict("records")}
    except: pass
    return None

# ═══ 维度3: 情绪/舆情 ═══

def fetch_news_em():
    import akshare as ak
    try:
        df = ak.stock_news_em()
        return df.head(15)[["关键词","新闻标题","发布时间","文章来源"]].to_dict("records")
    except: return None

def fetch_baidu_hot():
    import akshare as ak
    try:
        df = ak.stock_hot_search_baidu(symbol="A股", date=datetime.now().strftime("%Y%m%d"), time="今日")
        return df.head(10)[["名称/代码","涨跌幅","综合热度"]].to_dict("records")
    except: return None

def fetch_xueqiu_hot():
    import akshare as ak
    try:
        df = ak.stock_hot_tweet_xq()
        return df.sort_values("关注", ascending=False).head(10)[["股票简称","关注","最新价"]].to_dict("records")
    except: return None

def fetch_hot_rank():
    import akshare as ak
    try:
        df = ak.stock_hot_rank_em()
        return df.head(10)[["股票代码","股票简称","人气排名","涨跌幅"]].to_dict("records")
    except: return None

# ═══ 维度4: 龙虎榜 ═══

def fetch_lhb_stocks():
    import akshare as ak
    try:
        df = ak.stock_lhb_stock_detail_em()
        if df is not None and len(df) > 0:
            g = df.groupby("代码").agg({"名称":"first","龙虎榜净买额":"sum","涨跌幅":"first","解读":"first"}).reset_index()
            return g.sort_values("龙虎榜净买额", ascending=False).head(15).to_dict("records")
    except: pass
    return None

def fetch_lhb_overview():
    import akshare as ak
    try:
        df = ak.stock_lhb_ggtj_sina()
        if df is not None and len(df) > 0:
            return df.sort_values("净额", ascending=False).head(10)[["股票名称","上榜次数","累积购买额","累积卖出额","净额"]].to_dict("records")
    except: pass
    return None

# ═══ 维度5: 机构动向 ═══

def fetch_research_reports():
    import akshare as ak
    try:
        df = ak.stock_research_report_em()
        return df.head(15)[["股票简称","报告名称","东财评级","机构","研究员"]].to_dict("records")
    except: return None

def fetch_institution_visits():
    import akshare as ak
    try:
        df = ak.stock_jgdy_tj_em()
        return df.sort_values("接待机构数量", ascending=False).head(5)[["名称","接待机构数量","涨跌幅"]].to_dict("records")
    except: return None

def fetch_earnings_forecast():
    import akshare as ak
    try:
        df = ak.stock_yjyg_em()
        return df.sort_values("业绩变动", ascending=False).head(10)[["股票简称","预测指标","业绩变动","预测数值"]].to_dict("records")
    except: return None

# ═══ 维度6: 宏观/利率 ═══

def fetch_macro_snapshot():
    import akshare as ak
    result = {}
    try:
        df = ak.macro_china_pmi(); r = df_latest(df)
        result["pmi_mfg"] = float(r.get("制造业-指数",0))
        result["pmi_non_mfg"] = float(r.get("非制造业-指数",0))
    except: pass
    try:
        df = ak.macro_china_cpi(); r = df_latest(df)
        result["cpi_yoy"] = float(r.get("全国-同比增长",0))
    except: pass
    try:
        df = ak.macro_china_money_supply(); r = df_latest(df)
        result["m2_yoy"] = float(r.get("货币和准货币(M2)-同比增长",0))
        result["m1_yoy"] = float(r.get("货币(M1)-同比增长",0))
    except: pass
    try:
        df = ak.macro_china_shibor_all(); r = df_latest(df)
        result["shibor_on"] = float(r.get("O/N-定价",0))
        result["shibor_1w"] = float(r.get("1W-定价",0))
        result["shibor_1m"] = float(r.get("1M-定价",0))
    except: pass
    try:
        df = ak.macro_china_lpr(); r = df_latest(df)
        result["lpr_1y"] = float(r.get("LPR1Y",0))
        result["lpr_5y"] = float(r.get("LPR5Y",0))
    except: pass
    return result

def fetch_fed_rate():
    import akshare as ak
    try:
        df = ak.macro_bank_usa_interest_rate(); r = df_latest(df)
        return {"rate": float(r.get("今值",0)), "date": str(r.get("日期","")), "prev": float(r.get("前值",0))}
    except: return None

# ═══ 维度7: 期货/大宗 ═══

def fetch_domestic_futures():
    import akshare as ak
    try:
        df = ak.futures_spot_stock()
        return df.tail(20).to_dict("records")
    except: return None

def fetch_international_commodities():
    import yfinance as yf
    tickers = {"GC=F":"黄金期货","CL=F":"WTI原油","HG=F":"铜期货","SI=F":"白银期货","NG=F":"天然气","DX-Y.NYB":"美元指数"}
    result = {}
    for sym, name in tickers.items():
        t = yf.Ticker(sym)
        info = t.history(period="2d")
        if len(info) >= 2:
            prev, cur = info["Close"].iloc[-2], info["Close"].iloc[-1]
            result[name] = {"price": round(float(cur),2), "change_pct": round((cur-prev)/prev*100,2)}
    return result

# ═══ 维度8: 限售/股东 ═══

def fetch_restricted_shares():
    import akshare as ak
    try:
        df = ak.stock_restricted_release_summary_em()
        return df.tail(10).to_dict("records")
    except: return None

def fetch_major_holders():
    import akshare as ak
    try:
        df = ak.stock_share_hold_change_sse()
        return df.tail(10).to_dict("records")
    except: return None

# ═══ 维度9: 跨市场联动 ═══

def fetch_ah_comparison():
    import akshare as ak
    try:
        df = ak.stock_zh_ah_spot()
        df["溢价率"] = (df["最新价"] / df["最新价.1"] - 1) * 100
        return df.nlargest(10, "溢价率")[["名称","最新价","最新价.1","溢价率"]].to_dict("records")
    except: return None

def fetch_us_china_stocks():
    import yfinance as yf
    tickers = {"BABA":"阿里巴巴","JD":"京东","PDD":"拼多多","BIDU":"百度","NIO":"蔚来","BILI":"哔哩哔哩"}
    result = {}
    for sym, name in tickers.items():
        t = yf.Ticker(sym)
        info = t.history(period="2d")
        if len(info) >= 2:
            prev, cur = info["Close"].iloc[-2], info["Close"].iloc[-1]
            result[name] = {"price": round(float(cur),2), "change_pct": round((cur-prev)/prev*100,2)}
    return result

# ═══ 维度10: 市场结构 ═══

def fetch_market_breadth():
    """腾讯行情API估算涨跌比"""
    import requests
    codes = ["sh000001", "sz399001", "sz399006", "sh000688", "sh000016", "sh000300", "sh000905", "sh000852"]
    url = f"http://qt.gtimg.cn/q={','.join(codes)}"
    r = requests.get(url, timeout=8)
    up = down = 0
    for line in r.text.strip().split("\n"):
        parts = line.split("~")
        if len(parts) > 32:
            chg = float(parts[32]) if parts[32] else 0
            if chg > 0: up += 1
            elif chg < 0: down += 1
    total = up + down
    return {"up_pct": round(up/total*100,1) if total else 50, "down_pct": round(down/total*100,1) if total else 50, "total": total, "note": "基于主要指数"}

def fetch_limit_up_stats():
    """涨停统计 — 东方财富接口不稳定，返回占位数据"""
    import akshare as ak
    try:
        df = ak.stock_zt_pool_em(date=datetime.now().strftime("%Y%m%d"))
        first = len(df[df["连板数"] == 1]) if "连板数" in df.columns else 0
        cons = len(df[df["连板数"] > 1]) if "连板数" in df.columns else 0
        return {"limit_up_count": len(df), "first_time": first, "consecutive": cons}
    except:
        return {"limit_up_count": 0, "first_time": 0, "consecutive": 0, "note": "数据源不可用"}

def fetch_sector_leaders():
    import akshare as ak
    try:
        df = ak.stock_board_industry_summary_ths()
        if df is not None and len(df) > 0:
            s = df.sort_values("涨跌幅", ascending=False)
            return {"top_gainers": s.head(3)[["板块名称","涨跌幅","领涨股"]].to_dict("records"),
                    "top_losers": s.tail(3)[["板块名称","涨跌幅","领涨股"]].to_dict("records")}
    except: pass
    return None

def fetch_concept_hot():
    import akshare as ak
    try:
        df = ak.stock_board_concept_name_ths()
        if df is not None and len(df) > 0:
            s = df.sort_values("涨跌幅", ascending=False)
            return {"top_concepts": s.head(5)[["板块名称","涨跌幅"]].to_dict("records"),
                    "bottom_concepts": s.tail(5)[["板块名称","涨跌幅"]].to_dict("records")}
    except: pass
    return None

# ═══ 反共识信号源采集 ═══

def fetch_futures_basis():
    """期货升贴水: 股指期货主力合约基差"""
    import akshare as ak
    try:
        df = ak.futures_zh_minute_sina(symbol="IF2507")
        if df is not None and len(df) > 0:
            last = df.iloc[-1]
            return {"symbol": "IF主力", "price": float(last["价格"]),
                "volume": int(last["成交量"]), "date": str(last.get("日期",""))}
    except: pass
    try:
        df = ak.futures_spot_stock()
        if df is not None and len(df) > 0:
            futures = df[df["name"].str.contains("IF|IC|IM", na=False)]
            return futures.tail(5)[["name","trade","changepercent"]].to_dict("records")
    except: pass
    return None

def fetch_option_iv():
    """期权隐含波动率: 50ETF期权IV和PCR"""
    import akshare as ak
    try:
        df = ak.option_risk_indicator_sse()
        if df is not None and len(df) > 0:
            r = df.iloc[-1]
            return {"date": str(r.get("日期","")),
                "iv_call": float(r.get("认购IV",0)),
                "iv_put": float(r.get("认沽IV",0)),
                "pcr_volume": float(r.get("成交量PCR",0))}
    except: pass
    try:
        df = ak.option_sina_sse_list(symbol="50ETF")
        if df is not None and len(df) > 0:
            return {"summary": f"{len(df)}个50ETF期权合约在线"}
    except: pass
    return None

def fetch_cb_premium():
    """可转债溢价率: 全市场转债溢价率分布"""
    import akshare as ak
    try:
        df = ak.bond_convert_zh_cov()
        if df is not None and len(df) > 0:
            cols = ["转债名称","纯债价值","转股价值","纯债溢价率","转股溢价率","到期收益率"]
            avail = [c for c in cols if c in df.columns]
            avg = round(float(df["转股溢价率"].mean()),2) if "转股溢价率" in df.columns else None
            high = df.nlargest(5,"转股溢价率")[avail].to_dict("records") if "转股溢价率" in df.columns else []
            low = df.nsmallest(5,"转股溢价率")[avail].to_dict("records") if "转股溢价率" in df.columns else []
            return {"total": len(df), "avg_premium": avg,
                "top_high_premium": high, "top_low_premium": low}
    except: pass
    return None

def fetch_insider_trading():
    """产业资本增减持异常"""
    import akshare as ak
    try:
        df = ak.stock_share_hold_change_sse()
        if df is not None and len(df) > 0:
            cols = ["名称","变动数量","变动比例","变动后持股比例"]
            avail = [c for c in cols if c in df.columns]
            return df.sort_values("变动数量", ascending=False).head(10)[avail].to_dict("records")
    except: pass
    try:
        df = ak.stock_share_hold_change_szse()
        if df is not None and len(df) > 0:
            cols = ["名称","变动数量","变动比例","变动后持股比例"]
            avail = [c for c in cols if c in df.columns]
            return df.sort_values("变动数量", ascending=False).head(10)[avail].to_dict("records")
    except: pass
    return None


# ═══ 自愈补充采集函数 ═══

def fetch_stock_financials():
    """个股财务数据: PE/PB/ROE/营收增速"""
    import akshare as ak
    try:
        df = ak.stock_a_lg_indicator()
        if df is not None and len(df) > 0:
            return df.tail(20).to_dict("records")
    except: pass
    try:
        df = ak.stock_financial_analysis_indicator()
        return df.tail(20).to_dict("records") if df is not None else None
    except: return None

def fetch_stock_news():
    """个股新闻舆情"""
    import akshare as ak
    try:
        df = ak.stock_news_em()
        return df.head(15).to_dict("records") if df is not None else None
    except: return None

def fetch_stock_fund_flow_detail():
    """个股资金流向(DDX/DDY)"""
    import akshare as ak
    try:
        df = ak.stock_individual_fund_flow()
        return df.head(20).to_dict("records") if df is not None else None
    except: return None

def fetch_technical_indicators():
    """技术指标: 上证指数的均线/MACD/RSI"""
    import akshare as ak
    try:
        df = ak.stock_zh_index_daily_em(symbol="sh000001")
        if df is not None and len(df) > 0:
            recent = df.tail(30)
            return {"latest": recent.iloc[-1].to_dict(), "ma5": round(float(recent["close"].tail(5).mean()), 2),
                    "ma10": round(float(recent["close"].tail(10).mean()), 2),
                    "ma20": round(float(recent["close"].tail(20).mean()), 2)}
    except: pass
    return None

def fetch_sector_ranking():
    """行业板块强弱排名"""
    import akshare as ak
    try:
        df = ak.stock_board_industry_summary_ths()
        if df is not None and len(df) > 0:
            s = df.sort_values("涨跌幅", ascending=False)
            return {"top": s.head(5)[["板块名称","涨跌幅"]].to_dict("records"),
                    "bottom": s.tail(5)[["板块名称","涨跌幅"]].to_dict("records")}
    except: pass
    return None

def fetch_lhb_individual():
    """龙虎榜个股明细"""
    import akshare as ak
    try:
        df = ak.stock_lhb_stock_detail_em()
        if df is not None and len(df) > 0:
            return df.head(20).to_dict("records")
    except: pass
    return None

def fetch_margin_detail():
    """融资融券个股明细"""
    import akshare as ak
    try:
        df = ak.stock_margin_detail_sse()
        return df.tail(20).to_dict("records") if df is not None else None
    except: return None

def fetch_skew_index():
    """偏度指数 / 尾部风险"""
    import akshare as ak
    try:
        df = ak.index_vix()
        return df.tail(5).to_dict("records") if df is not None else None
    except: return None

def fetch_put_call_ratio():
    """Put/Call Ratio"""
    import akshare as ak
    try:
        df = ak.option_risk_indicator_sse()
        if df is not None and len(df) > 0:
            r = df.iloc[-1]
            return {"date": str(r.get("日期","")), "pcr_volume": float(r.get("成交量PCR",0)),
                    "pcr_amount": float(r.get("成交额PCR",0))}
    except: pass
    return None


# ═══ 主流程 ═══
from concurrent.futures import ThreadPoolExecutor, as_completed

ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
print(f"📡 多线程采集开始... {ts}", file=sys.stderr)
data = {"timestamp": ts, "source": "akshare+yfinance", "framework": "专业投资者13维信息框架(多线程)", "dimensions": {}}
dims = data["dimensions"]

# 10个维度组 + 反共识，并行采集
tasks = {
    "price":          lambda: {"a_share": safe_fetch(fetch_a_share_index,"A股"), "hk": safe_fetch(fetch_hk_market,"港股"), "us": safe_fetch(fetch_us_market,"美股"), "global": safe_fetch(fetch_global_indices,"全球")},
    "fund_flow":      lambda: {"market": safe_fetch(fetch_market_fund_flow,"主力资金"), "north": safe_fetch(fetch_north_flow,"北向"), "margin": safe_fetch(fetch_margin_trading,"融资融券"), "sector": safe_fetch(fetch_sector_fund_flow,"板块资金")},
    "sentiment":      lambda: {"news": safe_fetch(fetch_news_em,"新闻"), "baidu": safe_fetch(fetch_baidu_hot,"百度热搜"), "xueqiu": safe_fetch(fetch_xueqiu_hot,"雪球"), "hot_rank": safe_fetch(fetch_hot_rank,"人气榜")},
    "dragon_tiger":   lambda: {"stocks": safe_fetch(fetch_lhb_stocks,"龙虎榜"), "overview": safe_fetch(fetch_lhb_overview,"概览")},
    "institutions":   lambda: {"research": safe_fetch(fetch_research_reports,"研报"), "visits": safe_fetch(fetch_institution_visits,"调研"), "earnings": safe_fetch(fetch_earnings_forecast,"业绩")},
    "macro":          lambda: {"snapshot": safe_fetch(fetch_macro_snapshot,"宏观"), "fed": safe_fetch(fetch_fed_rate,"美联储")},
    "commodities":    lambda: {"domestic": safe_fetch(fetch_domestic_futures,"国内期货"), "intl": safe_fetch(fetch_international_commodities,"国际")},
    "shares":         lambda: {"restricted": safe_fetch(fetch_restricted_shares,"限售"), "holders": safe_fetch(fetch_major_holders,"增减持")},
    "cross_market":   lambda: {"ah": safe_fetch(fetch_ah_comparison,"AH比价"), "us_china": safe_fetch(fetch_us_china_stocks,"中概股")},
    "market_structure": lambda: {"breadth": safe_fetch(fetch_market_breadth,"涨跌比"), "limit_up": safe_fetch(fetch_limit_up_stats,"涨停"), "sector": safe_fetch(fetch_sector_leaders,"板块"), "concept": safe_fetch(fetch_concept_hot,"概念")},
    "anti_consensus": lambda: {"futures_basis": safe_fetch(fetch_futures_basis,"期货升贴水"), "option_iv": safe_fetch(fetch_option_iv,"期权IV"), "cb_premium": safe_fetch(fetch_cb_premium,"可转债溢价"), "insider_trade": safe_fetch(fetch_insider_trading,"增减持异常")},
}

# ═══ 动态维度补充: 读取 signals.json 的 missing_dimensions ═══
import json as _json, os as _os
sig_cfg_path = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'data', 'signals.json')
missing_dims = []
if _os.path.exists(sig_cfg_path):
    try:
        with open(sig_cfg_path) as _f:
            sig_cfg = _json.load(_f)
        missing_dims = sig_cfg.get('missing_dimensions', [])
        if missing_dims:
            print(f"  🔧 自愈补全: {missing_dims}", file=sys.stderr)
    except: pass

for dim_name in missing_dims:
    if '个股财务数据' in dim_name:
        tasks["stock_financials"] = lambda: {"individual_stocks": safe_fetch(fetch_stock_financials, "个股财务")}
    if '个股新闻舆情' in dim_name:
        tasks["stock_news"] = lambda: {"individual_news": safe_fetch(fetch_stock_news, "个股舆情")}
    if '个股资金流向' in dim_name:
        tasks["stock_fund_flow"] = lambda: {"individual_fund": safe_fetch(fetch_stock_fund_flow_detail, "个股资金")}
    if '技术指标' in dim_name:
        tasks["tech_indicators"] = lambda: {"technical": safe_fetch(fetch_technical_indicators, "技术指标")}
    if '行业板块强弱' in dim_name:
        tasks["sector_compare"] = lambda: {"sector_ranking": safe_fetch(fetch_sector_ranking, "行业排名")}
    if '龙虎榜明细' in dim_name:
        tasks["lhb_detail"] = lambda: {"lhb_individual": safe_fetch(fetch_lhb_individual, "龙虎榜个股")}
    if '融资融券明细' in dim_name:
        tasks["margin_detail"] = lambda: {"margin_individual": safe_fetch(fetch_margin_detail, "融资融券个股")}
    if '反共识信号' in dim_name:
        tasks["anti_consensus_extra"] = lambda: {"skew_index": safe_fetch(fetch_skew_index, "偏度指数"), "put_call_ratio": safe_fetch(fetch_put_call_ratio, "PCR")}

if missing_dims:
    try:
        sig_cfg['missing_dimensions'] = []
        sig_cfg['last_cleared'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        with open(sig_cfg_path, 'w') as _f:
            _json.dump(sig_cfg, _f, ensure_ascii=False, indent=2)
    except: pass

print(f"  启动 {len(tasks)} 个采集线程...", file=sys.stderr)
with ThreadPoolExecutor(max_workers=min(len(tasks), 8)) as ex:
    futures = {ex.submit(fn): name for name, fn in tasks.items()}
    for fut in as_completed(futures):
        name = futures[fut]
        try:
            dims[name] = fut.result()
            print(f"    ✅ {name}", file=sys.stderr)
        except Exception as e:
            dims[name] = {"error": str(e)[:120]}
            print(f"    ❌ {name}: {e}", file=sys.stderr)

# ═══ 数据完整性校验 + 熔断标记 ═══
print("  数据完整性校验...", file=sys.stderr)
data_quality = {"meltdown_triggered": False, "degraded_dimensions": []}

price_data = dims.get("price", {})
if "error" in str(price_data.get("a_share", "")):
    data_quality["meltdown_triggered"] = True
    data_quality["meltdown_reason"] = "行情数据缺失"

fund_data = dims.get("fund_flow", {})
if "error" in str(fund_data.get("north", "")):
    data_quality["meltdown_triggered"] = True
    existing = data_quality.get("meltdown_reason", "")
    data_quality["meltdown_reason"] = (existing + " 北向资金缺失").strip()

for dim_name in ["dragon_tiger", "sentiment", "macro"]:
    dim = dims.get(dim_name, {})
    error_count = sum(1 for v in dim.values() if "error" in str(v))
    if error_count > 0:
        data_quality["degraded_dimensions"].append(f"{dim_name}({error_count}个失败)")

dims["data_quality"] = data_quality

if data_quality["meltdown_triggered"]:
    print(f'  ⛔ 熔断! {data_quality["meltdown_reason"]}', file=sys.stderr)

print(f"✅ 采集完成", file=sys.stderr)
print(json.dumps(data, ensure_ascii=False, indent=2, default=str))
