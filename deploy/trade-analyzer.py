#!/usr/bin/env python3
"""
交易复盘与自我迭代引擎 v2.0
=============================
功能:
1. 归因分析 — 对每只亏损股票追溯维度采集→注入→Ponder→执行
2. 教训去重 — 同类型+同根因+同股票集合自动合并
3. 有效性追踪 — 每条教训标记是否被采纳和采纳后效果
4. 注入优化 — 按优先级排序注入 Ponder prompt
"""
import json, os, sys, re
from datetime import datetime
from collections import defaultdict

DATA_DIR = "/opt/scripts/data"
PONDER_DIR = "/opt/workspace/mcts-skill"

# ─── 工具函数 ───────────────────────────────────────────────

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

def read_file(path):
    if os.path.exists(path):
        try:
            with open(path) as f:
                return f.read()
        except:
            return ""
    return ""

# ─── 股票→维度映射（启发式） ──────────────────────────────

def get_relevant_dimensions(symbol, name=""):
    """判断一只股票需要关注哪些数据维度"""
    relevant = {"price", "fund_flow", "market_structure", "sentiment"}
    name_lower = (name + " " + symbol).lower()
    # 银行/金融
    if any(kw in name_lower for kw in ["银行", "招商", "平安", "兴业", "浦发", "中信"]):
        relevant.update(["macro", "cross_market", "shares"])
    # 科技
    if any(kw in name_lower for kw in ["科技", "半导体", "澜起", "立讯", "蓝思", "中芯", "688"]):
        relevant.update(["institutions", "dragon_tiger", "anti_consensus"])
    # 商品/资源
    if any(kw in name_lower for kw in ["黄金", "石油", "煤炭", "有色", "钢铁", "商品"]):
        relevant.update(["commodities", "macro"])
    # ETF
    if "etf" in name_lower:
        relevant.update(["macro", "commodities", "cross_market"])
    return list(relevant)

def get_stock_name_from_signals(symbol, signals):
    """从 signals 数据或账户中找股票名称"""
    if not signals:
        return symbol
    # 尝试从 signals 的 dragon_tiger / institutions 等列表找
    for dim_name, dim_data in signals.get("dimensions", {}).items():
        if isinstance(dim_data, dict):
            for sub_key, sub_val in dim_data.items():
                if isinstance(sub_val, list):
                    for item in sub_val:
                        if isinstance(item, dict):
                            for key in ["symbol", "代码", "ts_code", "stock_code"]:
                                if key in item:
                                    s = str(item[key]).replace(".SH","").replace(".SZ","")
                                    if s == symbol.replace(".SH","").replace(".SZ",""):
                                        return item.get("name", item.get("名称", symbol))
    # 尝试从账户快照取
    snap = load_json(os.path.join(DATA_DIR, "account-snapshot.json"))
    if snap:
        for sid, pos in snap.get("positions", {}).items():
            if sid.replace(".SH","").replace(".SZ","") == symbol.replace(".SH","").replace(".SZ",""):
                return pos.get("name", symbol)
    return symbol

# ─── 教训去重 ──────────────────────────────────────────────

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}

def dedup_key(lesson):
    """生成去重键"""
    return (
        lesson.get("type", "unknown"),
        lesson.get("root_cause", "unknown"),
        lesson.get("root_cause_dimension", "unknown"),
    )

def stocks_overlap(a, b):
    """两个股票列表是否有交集"""
    return bool(set(a or []) & set(b or []))

def merge_lesson(existing, new_obs):
    """将新观察合并到已有教训中"""
    existing["last_seen"] = new_obs.get("last_seen", datetime.now().strftime("%Y-%m-%d"))
    existing["times_observed"] = existing.get("times_observed", 1) + 1
    # 股票取并集
    old_stocks = set(existing.get("affected_stocks", []))
    new_stocks = set(new_obs.get("affected_stocks", []))
    existing["affected_stocks"] = sorted(old_stocks | new_stocks)
    # 严重度取最高
    if SEVERITY_ORDER.get(new_obs.get("severity", "low"), 3) < SEVERITY_ORDER.get(existing.get("severity", "low"), 3):
        existing["severity"] = new_obs["severity"]
    # 教训文本取更具体的
    if len(new_obs.get("lesson_text", "")) > len(existing.get("lesson_text", "")):
        existing["lesson_text"] = new_obs["lesson_text"]
    return existing

def add_lesson(lessons, new_lesson):
    """添加教训，自动去重合并"""
    new_key = dedup_key(new_lesson)
    new_stocks = set(new_lesson.get("affected_stocks", []))

    for i, existing in enumerate(lessons):
        if dedup_key(existing) == new_key:
            # 精确匹配 → 合并
            if stocks_overlap(existing.get("affected_stocks", []), list(new_stocks)):
                lessons[i] = merge_lesson(existing, new_lesson)
                return False, i  # merged
        elif (existing.get("type") == new_lesson.get("type") and
              existing.get("root_cause") == new_lesson.get("root_cause") and
              existing.get("root_cause_dimension") == new_lesson.get("root_cause_dimension") and
              stocks_overlap(existing.get("affected_stocks", []), list(new_stocks))):
            # 模糊匹配（同类型同根因，股票有交集）→ 合并
            lessons[i] = merge_lesson(existing, new_lesson)
            return False, i

    # 真正的新教训
    lessons.append(new_lesson)
    return True, len(lessons) - 1

# ─── 归因分析 ──────────────────────────────────────────────

def analyze_stock_root_cause(symbol, name, signals, ponder_prompt, ponder_text, ponder_json, exec_log):
    """对单只亏损股票追溯根因"""
    result = {
        "symbol": symbol,
        "name": name,
        "checkpoints": {},
        "root_cause": None,
        "root_cause_dimension": None,
        "dimensions_available": [],
        "dimensions_missing": [],
        "dimensions_in_prompt": [],
        "dimensions_in_ponder": [],
        "ponder_action": None,
        "ponder_reasoning": "",
        "execution_result": None,
    }

    # Step 1: 检查哪些维度被采集了
    if signals and "dimensions" in signals:
        dims = signals["dimensions"]
        result["dimensions_available"] = list(dims.keys())
        # 检查哪些维度有错误
        for dim_name, dim_data in dims.items():
            if isinstance(dim_data, dict):
                for sub_key, sub_val in dim_data.items():
                    if isinstance(sub_val, dict) and "error" in sub_val:
                        result["dimensions_missing"].append(f"{dim_name}.{sub_key}")

    # Step 2: 判断哪些维度对该股票重要
    relevant_dims = get_relevant_dimensions(symbol, name)
    result["relevant_dimensions"] = relevant_dims

    # 检查重要维度是否缺失
    for dim in relevant_dims:
        if dim not in result["dimensions_available"]:
            result["checkpoints"]["dimension_not_collected"] = dim
        elif dim in [m.split(".")[0] for m in result["dimensions_missing"]]:
            result["checkpoints"]["dimension_collected_with_errors"] = dim

    # Step 2.5: 检查 prompt 中是否包含了这些维度（即是否注入给了Ponder）
    if ponder_prompt:
        prompt_lower = ponder_prompt.lower()
        for dim in relevant_dims:
            if dim in prompt_lower:
                result["dimensions_in_prompt"].append(dim)
    else:
        result["dimensions_in_prompt"] = []

    # Step 3: 检查 Ponder 输出中是否提及了相关维度
    if ponder_text:
        text_lower = ponder_text.lower()
        dim_mentioned = []
        for dim in relevant_dims:
            if dim in text_lower:
                dim_mentioned.append(dim)
        result["dimensions_mentioned"] = dim_mentioned

        # 检查 Ponder 的调仓建议
        if ponder_json:
            for adj in ponder_json.get("position_adjustments", []):
                if adj.get("symbol") == symbol or adj.get("symbol", "").replace(".SH","").replace(".SZ","") == symbol.replace(".SH","").replace(".SZ",""):
                    result["ponder_action"] = adj.get("current_action", "unknown")
                    result["ponder_reasoning"] = adj.get("reason", "")
                    result["ponder_pnl_analysis"] = adj.get("pnl_analysis", "")
                    break

    # Step 4: 检查执行
    if exec_log:
        for trade in exec_log.get("trades", []):
            tsym = trade.get("symbol", "")
            if tsym == symbol or tsym.replace(".SH","").replace(".SZ","") == symbol.replace(".SH","").replace(".SZ",""):
                result["execution_result"] = trade

    # 确定根因
    if "dimension_not_collected" in result["checkpoints"]:
        result["root_cause"] = "dimension_not_collected"
        result["root_cause_dimension"] = result["checkpoints"]["dimension_not_collected"]
    elif "dimension_collected_with_errors" in result["checkpoints"]:
        result["root_cause"] = "dimension_collected_with_errors"
    elif result.get("dimensions_in_prompt") and len(result.get("dimensions_mentioned",[])) < len(result["dimensions_in_prompt"]):
        # 数据在prompt里但Ponder没分析
        not_mentioned = [d for d in result["dimensions_in_prompt"] if d not in result.get("dimensions_mentioned",[])]
        result["checkpoints"]["ponder_ignored_dimensions"] = not_mentioned
        result["root_cause"] = "ponder_ignored_dimensions"
        result["root_cause_dimension"] = str(not_mentioned[0]) if not_mentioned else "unknown"
    elif result.get("dimensions_in_prompt") is not None and len(result["dimensions_in_prompt"]) < len(relevant_dims):
        # 数据采集到了但没全部注入prompt
        result["root_cause"] = "dimension_not_injected"
    elif result.get("ponder_action") in (None, "HOLD", "ADD"):
        result["root_cause"] = "ponder_held_despite_loss"
    elif result.get("ponder_action") in ("REDUCE", "CLEAR") and result.get("execution_result") is None:
        result["root_cause"] = "execution_not_followed"
    else:
        result["root_cause"] = "market_unavoidable"

    return result


def root_cause_to_lesson(rc):
    """将归因分析结果转化为教训对象"""
    severity_map = {
        "dimension_not_collected": "high",
        "dimension_collected_with_errors": "high",
        "dimension_not_injected": "medium",
        "ponder_held_despite_loss": "high",
        "execution_not_followed": "critical",
        "market_unavoidable": "low",
    }
    text_map = {
        "dimension_not_collected":
            f"{rc['name']}({rc['symbol']})亏损，但相关维度 {rc['checkpoints'].get('dimension_not_collected','?')} 未采集到数据，"
            f"导致Ponder缺乏关键信息。需确保该维度采集成功。",
        "dimension_collected_with_errors":
            f"{rc['name']}({rc['symbol']})亏损，相关维度虽有数据但包含采集错误，"
            f"数据质量不可靠。",
        "dimension_not_injected":
            f"{rc['name']}({rc['symbol']})亏损，相关维度已采集但未全部注入Ponder prompt。"
            f"需检查prompt构建逻辑。",
        "ponder_ignored_dimensions":
            f"{rc['name']}({rc['symbol']})亏损，数据已注入Ponder prompt但Ponder未在分析中提及维度"
            f" {rc['checkpoints'].get('ponder_ignored_dimensions','?')}。Ponder忽略了已有数据。",
        "ponder_held_despite_loss":
            f"{rc['name']}({rc['symbol']})持续亏损但Ponder选择HOLD。"
            f"需检查Ponder的推理逻辑：{rc.get('ponder_reasoning','')[:100]}",
        "execution_not_followed":
            f"{rc['name']}({rc['symbol']})Ponder建议了{rc.get('ponder_action','?')}但执行环节未执行。",
        "market_unavoidable":
            f"{rc['name']}({rc['symbol']})亏损属于市场系统性波动，无法通过维度分析规避。",
    }

    sev = severity_map.get(rc["root_cause"], "medium")
    text = text_map.get(rc["root_cause"], f"{rc['name']}({rc['symbol']})亏损，根因: {rc['root_cause']}")

    # 对于 ponder_ignored_dimensions，加上具体维度名
    if rc["root_cause"] == "ponder_ignored_dimensions":
        ignored = rc.get("checkpoints", {}).get("ponder_ignored_dimensions", [])
        text = f"{rc['name']}({rc['symbol']})亏损。数据已采集并注入prompt，但Ponder分析未提及关键维度 {ignored}。Ponder忽略了已有数据。"

    return {
        "id": f"{rc['root_cause']}_{rc.get('root_cause_dimension','unknown')}_{rc['symbol'].replace('.','_')}",
        "type": rc["root_cause"],
        "root_cause": rc["root_cause"],
        "root_cause_dimension": rc.get("root_cause_dimension", "unknown"),
        "severity": sev,
        "lesson_text": text,
        "affected_stocks": [rc["symbol"]],
        "first_seen": datetime.now().strftime("%Y-%m-%d"),
        "last_seen": datetime.now().strftime("%Y-%m-%d"),
        "times_observed": 1,
        "adopted_count": 0,
        "last_adopted": "",
        "effectiveness": {
            "state": "pending",
            "improvement_pct": None,
        },
    }

# ─── 有效性评估 ────────────────────────────────────────────

def evaluate_effectiveness(lessons, prev_ponder_text, curr_ponder_text, curr_account, prev_account=None):
    """评估每条 pending 教训的有效性"""
    for lesson in lessons:
        if lesson.get("effectiveness", {}).get("state") in ("proven", "disproven"):
            continue

        # 检查这条教训是否在本次被采纳了
        was_adopted = False
        if curr_ponder_text and lesson.get("affected_stocks"):
            action_keywords = {
                "dimension_not_collected": ["REDUCE", "CLEAR", "确保"],
                "ponder_held_despite_loss": ["REDUCE", "CLEAR"],
                "execution_not_followed": ["SELL", "REDUCE", "CLEAR"],
            }
            keywords = action_keywords.get(lesson.get("type", ""), [])
            if keywords:
                for stock in lesson.get("affected_stocks", []):
                    # 在 ponder 文本中找股票代码 + 动作关键词
                    for kw in keywords:
                        if stock in curr_ponder_text and kw in curr_ponder_text:
                            was_adopted = True
                            break

        if was_adopted:
            lesson["adopted_count"] = lesson.get("adopted_count", 0) + 1
            lesson["last_adopted"] = datetime.now().strftime("%Y-%m-%d")
            lesson.setdefault("effectiveness", {}).setdefault("followed_actions", []).append({
                "date": datetime.now().strftime("%Y-%m-%d"),
                "action": "followed"
            })

        # 检查受影响股票是否改善
        if prev_account and curr_account and lesson.get("affected_stocks"):
            improvements = []
            prev_positions = prev_account.get("positions", {})
            curr_positions = curr_account.get("positions", {})
            for sym in lesson["affected_stocks"]:
                sym_clean = sym.replace(".SH","").replace(".SZ","")
                prev_pnl = None
                curr_pnl = None
                for k, v in prev_positions.items():
                    if k.replace(".SH","").replace(".SZ","") == sym_clean:
                        prev_pnl = v.get("pnl_pct", 0)
                        break
                for k, v in curr_positions.items():
                    if k.replace(".SH","").replace(".SZ","") == sym_clean:
                        curr_pnl = v.get("pnl_pct", 0)
                        break
                if prev_pnl is not None and curr_pnl is not None:
                    improvements.append(curr_pnl - prev_pnl)

            if improvements:
                avg_imp = sum(improvements) / len(improvements)
                lesson["effectiveness"]["improvement_pct"] = round(avg_imp, 2)

                # 足够数据点后判定
                if lesson.get("times_observed", 1) >= 3 and lesson.get("adopted_count", 0) >= 2:
                    if avg_imp > 0:
                        lesson["effectiveness"]["state"] = "proven"
                    elif avg_imp < -2:
                        lesson["effectiveness"]["state"] = "disproven"
                    else:
                        lesson["effectiveness"]["state"] = "neutral"

            lesson["effectiveness"]["evaluation_date"] = datetime.now().strftime("%Y-%m-%d")

# ─── 注入优化 ──────────────────────────────────────────────

def build_optimized_injection(lessons, max_lessons=8, max_chars=1500):
    """按优先级排序，精选教训注入"""
    if not lessons:
        return ""

    def priority_key(l):
        eff = l.get("effectiveness", {})
        state = eff.get("state", "pending")
        unresolved = 0 if state == "pending" else 10
        sev = SEVERITY_ORDER.get(l.get("severity", "low"), 3)
        never_adopted = 0 if l.get("adopted_count", 0) == 0 else 5
        # 最近更新
        last_seen = l.get("last_seen", "")
        try:
            days_since = (datetime.now() - datetime.strptime(last_seen, "%Y-%m-%d")).days
        except:
            days_since = 999
        recency = min(days_since, 30) * 0.5
        return unresolved + sev + never_adopted + recency

    sorted_lessons = sorted(lessons, key=priority_key)

    prompt = "\n\n## 📚 历史交易教训（trade-lessons.json）\n\n"
    budget = max_chars - len(prompt)
    selected = []
    eff_map = {"proven": "✅", "disproven": "❌", "neutral": "➖", "pending": "⏳"}
    sev_icon = {"critical": "⛔", "high": "⚠️", "medium": "⚡", "low": "💡"}

    for l in sorted_lessons:
        icon = sev_icon.get(l.get("severity", ""), "📌")
        eff_tag = eff_map.get(l.get("effectiveness", {}).get("state", "pending"), "")
        adopted = l.get("adopted_count", 0)
        adopted_tag = f"[采纳{adopted}次]" if adopted > 0 else "[未采纳]"
        line = f"{icon}{eff_tag}{adopted_tag} {l.get('lesson_text','')}\n"
        if len(line) + sum(len(t) for t in selected) <= budget:
            selected.append(line)
        if len(selected) >= max_lessons:
            break

    prompt += "".join(selected)

    # 统计
    total = len(lessons)
    unresolved = sum(1 for l in lessons if l.get("effectiveness", {}).get("state", "pending") == "pending")
    prompt += f"\n📊 共{total}条教训，{unresolved}条待验证"

    return prompt

# ─── 主类 ──────────────────────────────────────────────────

class TradeAnalyzer:
    def __init__(self):
        self.account = self._load_account()
        self.signals = load_json(os.path.join(DATA_DIR, "last-signals.json")) or {}
        self.risk_data = load_json(os.path.join(DATA_DIR, "position-risk.json")) or {}
        self.ponder_text = read_file(os.path.join(DATA_DIR, "ponder-output.json"))
        self.ponder_prompt = read_file(os.path.join(DATA_DIR, "last-ponder-prompt.txt"))
        self.ponder_json = self._parse_ponder_json()
        self.exec_log = load_json(os.path.join(DATA_DIR, "execution-log.json")) or {}
        self.snapshot = load_json(os.path.join(DATA_DIR, "account-snapshot.json")) or {}
        self.prev_snapshot = self._load_prev_snapshot()
        self.pnl_records = load_json(os.path.join(DATA_DIR, "daily-pnl.json")) or []
        self.lessons = self._load_lessons()

    def _load_account(self):
        sys.path.insert(0, "/opt/scripts")
        from paper_account import Account
        return Account.load("default")

    def _parse_ponder_json(self):
        if not self.ponder_text:
            return None
        m = re.search(r'```json\s*\n(.*?)\n\s*```', self.ponder_text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(1))
            except:
                return None
        return None

    def _load_prev_snapshot(self):
        prev = load_json(os.path.join(DATA_DIR, "account-snapshot.prev.json"))
        return prev

    def _load_lessons(self):
        data = load_json(os.path.join(DATA_DIR, "trade-lessons.json"))
        if data and "schema_version" in data:
            return data
        # 旧格式迁移 — 去重
        lessons_list = []
        seen_ids = set()
        if data and data.get("lessons"):
            for l in data["lessons"]:
                stocks = l.get("affected", [])
                stock_str = "_".join(sorted(stocks)) if stocks else "general"
                lid = f"legacy_{l.get('type','unknown')}_{stock_str}"
                if lid in seen_ids:
                    continue
                seen_ids.add(lid)
                lessons_list.append({
                    "id": lid,
                    "type": l.get("type", "unknown"),
                    "root_cause": "legacy_migration",
                    "root_cause_dimension": "unknown",
                    "severity": l.get("severity", "medium"),
                    "lesson_text": l.get("lesson", ""),
                    "affected_stocks": l.get("affected", []),
                    "first_seen": l.get("date", "2026-07-12"),
                    "last_seen": l.get("date", "2026-07-12"),
                    "times_observed": 1,
                    "adopted_count": 0,
                    "last_adopted": "",
                    "effectiveness": {"state": "pending", "improvement_pct": None},
                })
        return {
            "schema_version": 2,
            "last_updated": datetime.now().strftime("%Y-%m-%d"),
            "lessons": lessons_list,
        }

    def calc_real_pnl(self):
        """计算每只持仓的真实盈亏"""
        results = []
        for sid, pos in self.account.positions.items():
            results.append({
                "symbol": sid,
                "name": pos.name,
                "shares": pos.shares,
                "avg_cost": round(pos.avg_cost, 4),
                "current_price": round(pos.current_price, 2),
                "market_value": round(pos.market_value, 2),
                "unrealized_pnl": round(pos.unrealized_pnl, 2),
                "unrealized_pnl_pct": round(pos.unrealized_pnl_pct, 2)
            })
        return sorted(results, key=lambda x: x["unrealized_pnl_pct"])

    def run(self):
        """执行完整复盘"""
        print("=" * 60)
        print(f"📋 交易复盘分析 — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        print("=" * 60)

        positions = self.calc_real_pnl()
        losers = [p for p in positions if p["unrealized_pnl"] < 0]
        winners = [p for p in positions if p["unrealized_pnl"] > 0]

        # ── 盈亏汇总 ──
        print(f"📉 亏损股票 ({len(losers)}只):")
        for p in losers:
            print(f"  🔴 {p['name']}({p['symbol']}): {p['unrealized_pnl_pct']:+.2f}%  ¥{p['unrealized_pnl']:+,.0f}")
        print(f"📈 盈利股票 ({len(winners)}只):")
        for p in winners:
            print(f"  🟢 {p['name']}({p['symbol']}): {p['unrealized_pnl_pct']:+.2f}%  ¥{p['unrealized_pnl']:+,.0f}")
        total_pnl = sum(p["unrealized_pnl"] for p in positions)
        print(f"💎 总未实现盈亏: ¥{total_pnl:+,.2f}")

        # ── 归因分析 ──
        print("\n" + "-" * 60)
        print("🔍 亏损归因分析:")
        new_lessons = []
        for p in losers:
            name = get_stock_name_from_signals(p["symbol"], self.signals) or p["name"]
            rc = analyze_stock_root_cause(
                p["symbol"], name,
                self.signals, self.ponder_prompt, self.ponder_text, self.ponder_json, self.exec_log
            )
            print(f"  [{rc['root_cause']}] {name}({p['symbol']}): ", end="")
            if rc["root_cause"] == "dimension_not_collected":
                print(f"维度 {rc['checkpoints'].get('dimension_not_collected','?')} 未采集")
            elif rc["root_cause"] == "dimension_collected_with_errors":
                print(f"维度采集含错误: {rc['dimensions_missing']}")
            elif rc["root_cause"] == "dimension_not_injected":
                print(f"维度已采集但未全部注入prompt")
            elif rc["root_cause"] == "ponder_ignored_dimensions":
                ignored = rc['checkpoints'].get('ponder_ignored_dimensions', [])
                print(f"数据在prompt中但Ponder未分析维度: {ignored}")
            elif rc["root_cause"] == "ponder_held_despite_loss":
                print(f"Ponder选择HOLD: {rc.get('ponder_reasoning','')[:60]}")
            elif rc["root_cause"] == "execution_not_followed":
                print(f"Ponder建议{rc.get('ponder_action','?')}但未执行")
            else:
                print(f"市场系统性波动")

            lesson = root_cause_to_lesson(rc)
            new_lessons.append(lesson)

        # ── 有效性评估 ──
        if self.prev_snapshot:
            evaluate_effectiveness(
                self.lessons["lessons"],
                self.ponder_prompt, self.ponder_text,
                self.snapshot, self.prev_snapshot
            )

        # ── 去重合并 ──
        add_count = 0
        merge_count = 0
        for lesson in new_lessons:
            is_new, idx = add_lesson(self.lessons["lessons"], lesson)
            if is_new:
                add_count += 1
            else:
                merge_count += 1

        print(f"\n📝 教训: 新增{add_count}条 / 合并{merge_count}条 (共{len(self.lessons['lessons'])}条)")

        # ── 构建注入文本 ──
        injection = build_optimized_injection(self.lessons["lessons"])
        if injection:
            print(f"\n📎 Ponder注入 ({len(injection)}字符):")
            # 只显示前几条
            for line in injection.split("\n")[:10]:
                if line.strip():
                    print(f"  {line[:100]}")

        # ── 保存 ──
        self.lessons["last_updated"] = datetime.now().strftime("%Y-%m-%d")
        save_json(os.path.join(DATA_DIR, "trade-lessons.json"), self.lessons)

        # 保存当前快照作为下次的"prev"
        curr_snap = load_json(os.path.join(DATA_DIR, "account-snapshot.json"))
        if curr_snap:
            save_json(os.path.join(DATA_DIR, "account-snapshot.prev.json"), curr_snap)

        return injection


if __name__ == "__main__":
    analyzer = TradeAnalyzer()
    injection = analyzer.run()
    if injection:
        print("\n---INJECTION_START---")
        print(injection)
        print("---INJECTION_END---")