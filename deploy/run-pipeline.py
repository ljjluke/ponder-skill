#!/usr/bin/env python3
"""
全自动交易流水线 v4.0 — 7阶段闭环
================================
Phase 0: 前置检查 (Gateway + 经验库 + 快照)
Phase 1: 13维数据采集 (stock-collector.py, 熔断检查)
Phase 2: 持仓五维风控 (position-risk.py)
Phase 3: Ponder 9步推理 (Claude Code + SKILL.md + 经验注入)
Phase 4: TradingAgents 多智能体决策
Phase 5: 虚拟账户自动执行
Phase 6: 经验结晶 (framework_self recordOutcome)
Phase 7: 微信推送纯盈利报告

调用: python3 /opt/scripts/run-pipeline.py [账户名]
"""

import os, sys, json, re, subprocess, time
from datetime import datetime

os.environ['HOME'] = '/root'
os.environ['ANTHROPIC_AUTH_TOKEN'] = '2814b318a74985fa0e4f8661697afbcf:YTU5YjY0ZWE0NjFkMDdhZTEwNmEzNTA4'
os.environ['ANTHROPIC_BASE_URL'] = 'https://maas-coding-api.cn-huabei-1.xf-yun.com/anthropic'
os.environ['ANTHROPIC_MODEL'] = 'astron-code-latest'
os.environ['ANTHROPIC_SMALL_FAST_MODEL'] = 'astron-code-latest'
os.environ['CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'] = '1'
os.environ['TRADINGAGENTS_LLM_PROVIDER'] = 'anthropic'
os.environ['TRADINGAGENTS_DEEP_THINK_LLM'] = 'astron-code-latest'
os.environ['TRADINGAGENTS_QUICK_THINK_LLM'] = 'astron-code-latest'
os.environ['TRADINGAGENTS_LLM_BACKEND_URL'] = 'https://maas-coding-api.cn-huabei-1.xf-yun.com/anthropic'
os.environ['TRADINGAGENTS_OUTPUT_LANGUAGE'] = 'Chinese'
os.environ['TRADINGAGENTS_LLM_MAX_RETRIES'] = '6'

ACCOUNT_NAME = sys.argv[1] if len(sys.argv) > 1 else 'default'
DATA_DIR = '/opt/scripts/data'
PONDER_DIR = '/opt/workspace/mcts-skill'
os.makedirs(DATA_DIR, exist_ok=True)

def log(msg):
    ts = datetime.now().strftime('%H:%M:%S')
    line = f'[{ts}] {msg}'
    print(line, flush=True)

def load_json(path):
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return None

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)

# ═══════════════════════════════════════════════════════════
# Phase 0: 前置检查
# ═══════════════════════════════════════════════════════════
log('═ Phase 0/7: 前置检查 ═')

# 0a. Gateway 存活检查
try:
    r = subprocess.run(['openclaw', 'status'], capture_output=True, text=True, timeout=10)
    if r.returncode != 0:
        log(f'  ⚠️ Gateway 异常: {r.stderr[:100]}')
    else:
        log('  Gateway ✅')
except Exception as e:
    log(f'  ⚠️ Gateway 不可达: {e}')

# 0b. 加载经验库
self_file = os.path.join(PONDER_DIR, 'scripts', 'mma', 'framework_self.json')
self_state = load_json(self_file)
if self_state:
    log(f'  经验库加载: {len(self_state.get("stance_memory",[]))}条立场, {len(self_state.get("pattern_memory",[]))}个模式')
else:
    log('  经验库为空(首次运行)')

# 0c. 上次持仓快照
prev_snapshot = load_json(os.path.join(DATA_DIR, 'account-snapshot.json'))
if prev_snapshot:
    log(f'  上次快照: 总资产 ¥{prev_snapshot.get("total_equity",0):,.0f}')
else:
    log('  无历史快照')

# ═══════════════════════════════════════════════════════════
# Phase 1: 13维数据采集 (3min, 180s超时)
# ═══════════════════════════════════════════════════════════
log('═ Phase 1/7: 13维数据采集 ═')

sig_file = os.path.join(DATA_DIR, 'last-signals.json')
meltdown = False

try:
    r = subprocess.run(['python3', '/opt/scripts/stock-collector.py'],
                       capture_output=True, text=True, timeout=180)
    if r.returncode == 0 and len(r.stdout) > 1000:
        with open(sig_file, 'w') as f:
            f.write(r.stdout)
        log(f'  采集完成: {len(r.stdout)}字节')

        # 检查熔断标记
        try:
            data = json.loads(r.stdout)
            dq = data.get('dimensions', {}).get('data_quality', {})
            if dq.get('meltdown_triggered'):
                meltdown = True
                log(f'  ⛔ 熔断! {dq.get("meltdown_reason", "")}')
                log(f'  降级维度: {dq.get("degraded_dimensions", [])}')
        except: pass
    else:
        raise Exception(f'采集异常: rc={r.returncode} len={len(r.stdout)}')
except Exception as e:
    if os.path.exists(sig_file) and os.path.getsize(sig_file) > 1000:
        log(f'  采集超时({e})，使用缓存 ({os.path.getsize(sig_file)}字节)')
    else:
        log(f'  ❌ 采集失败且无缓存，退出')
        sys.exit(1)

if meltdown:
    log('  🛑 熔断激活 — 跳过交易决策，只推风控报告')
    # 只跑风控+推送，不交易
    try:
        subprocess.run(['python3', '/opt/scripts/position-risk.py'], timeout=120)
    except: pass
    try:
        subprocess.run(['python3', '/opt/scripts/send-wechat-report.py'], timeout=300)
    except: pass
    sys.exit(0)

# 提取摘要
r2 = subprocess.run(['python3', '/opt/scripts/extract-summary.py', sig_file],
                    capture_output=True, text=True, timeout=30)
summary = r2.stdout.strip()
summary_file = os.path.join(DATA_DIR, 'signal-summary.txt')
with open(summary_file, 'w') as f:
    f.write(summary)
log(f'  摘要: {len(summary)}字符')

# ═══════════════════════════════════════════════════════════
# Phase 1.5: 股价同步 — 用真实行情更新虚拟账户的 current_price
# ═══════════════════════════════════════════════════════════
log('═ Phase 1.5/7: 股价同步 ═')
try:
    sig_data = load_json(sig_file)
    # 从采集数据提取个股价格
    price_map = {}
    # 1. 从 price 维度找沪深300成分股价格
    # 2. 用 akshare 快照接口补
    sys.path.insert(0, '/opt/scripts')
    from paper_account import Account
    acc_temp = Account.load(ACCOUNT_NAME)

    import akshare as ak
    import requests as _r
    # 腾讯行情API批量获取持仓价格
    qt_codes = []
    for sid in acc_temp.positions.keys():
        code = sid.replace('.SZ', '').replace('.SH', '')
        if sid.endswith('.SZ') or code.startswith('000') or code.startswith('002') or code.startswith('300'):
            qt_codes.append(f'sz{code}')
        else:
            qt_codes.append(f'sh{code}')
    if qt_codes:
        try:
            url = f"http://qt.gtimg.cn/q={','.join(qt_codes)}"
            resp = _r.get(url, timeout=10)
            if resp.status_code == 200:
                for line in resp.text.strip().split('\n'):
                    parts = line.split('~')
                    if len(parts) > 3:
                        name = parts[1]
                        price = float(parts[3])
                        full_code = parts[2]
                        if full_code.startswith('6') or full_code.startswith('5'):
                            sid = f'{full_code}.SH'
                        else:
                            sid = f'{full_code}.SZ'
                        if sid in acc_temp.positions:
                            acc_temp.update_price(sid, price)
                            log(f'  {name}({sid}): \xa5{price:.2f}')
        except Exception as e2:
            log(f'  腾讯行情失败: {e2}，尝试akshare')
            try:
                df_spot = ak.stock_zh_a_spot()
                for sid in list(acc_temp.positions.keys()):
                    code = sid.replace('.SZ', '').replace('.SH', '')
                    row = df_spot[df_spot['代码'] == code]
                    if len(row) > 0:
                        r = row.iloc[0]
                        price = float(r['最新价'])
                        name = str(r.get('名称', acc_temp.positions[sid].name))
                        acc_temp.update_price(sid, price, name)
                        log(f'  {name}({sid}): \xa5{price:.2f}')
            except:
                pass
    acc_temp.save()
except Exception as e:
    log(f'  股价同步异常: {e}')

# ═══════════════════════════════════════════════════════════
# Phase 2: 持仓五维风控
# ═══════════════════════════════════════════════════════════
log('═ Phase 2/7: 持仓五维风控 ═')

risk_file = os.path.join(DATA_DIR, 'position-risk.json')
try:
    r = subprocess.run(['python3', '/opt/scripts/position-risk.py'],
                       capture_output=True, text=True, timeout=120)
    if r.returncode == 0 and r.stdout.strip():
        with open(risk_file, 'w') as f:
            f.write(r.stdout)
        risk_data = json.loads(r.stdout)
        risk_summary = risk_data.get('summary', {})
        log(f'  风控完成: {risk_summary.get("total_positions",0)}只持仓, '
            f'{risk_summary.get("high_risk_count",0)}只高风险, '
            f'均分{risk_summary.get("avg_risk_score",0)}')
    else:
        log('  风控异常，继续')
        risk_data = {"positions": [], "summary": {"overall_level": "unknown"}}
except Exception as e:
    log(f'  风控失败: {e}')
    risk_data = {"positions": [], "summary": {"overall_level": "unknown"}}

# ═══════════════════════════════════════════════════════════
# Phase 3: Ponder 9步推理 (主力: 15min)
# — SKILL.md 注入 → 信号过滤 → 神思 → 发散 → 八卦镜 → 方案
# → 收敛 → 评分 → 推演 → 辩论 → 综合 → 行动翻译
# ═══════════════════════════════════════════════════════════
log('═ Phase 3/7: Ponder 9步推理 ═')

# 不注入完整 SKILL.md（16KB+ 在 -p 模式下太大，精简分析框架直接进 prompt）
experience_prompt = ""
if self_state:
    narrative = self_state.get('self_narrative', '')
    if narrative:
        experience_prompt = f"""

## 我的经验积累（framework_self）

自我叙事:
{narrative}

### 历史立场记忆（最近5条）"""
        for s in self_state.get('stance_memory', [])[-5:]:
            experience_prompt += f"\n- [{s.get('outcome','pending')}] {s.get('question_type','')}: {s.get('stance','')[:120]}"

        patterns = self_state.get('pattern_memory', [])
        if patterns:
            experience_prompt += "\n\n### 已知推理盲点"
            for p in patterns:
                experience_prompt += f"\n- {p.get('pattern_type','')} (严重度:{p.get('severity','')}): {p.get('constraint','')[:150]}"

        triggers = self_state.get('trigger_memory', [])
        if triggers:
            experience_prompt += "\n\n### 历史触发信号（曾导致判断被证伪的信号模式）"
            for t in triggers[:5]:
                experience_prompt += f"\n- {t.get('signal_pattern','')}: 曾证伪立场「{t.get('falsified_stance','')[:80]}」({t.get('times_observed',0)}次)"

# 构建风控摘要
risk_context = ""
if risk_data and risk_data.get('positions'):
    risk_context = "\n## 持仓风控结果（position-risk.json）\n\n"
    for pos_risk in risk_data['positions']:
        risk_context += f"### {pos_risk['name']}({pos_risk['symbol']}) — 风险评分: {pos_risk['risk_score']}分 [{pos_risk['risk_level']}]\n"
        risk_context += f"- 高风险维度: {pos_risk.get('high_risk_dimensions', []) or '无'}\n"
        for dim, d in pos_risk.get('dimensions', {}).items():
            if d.get('signals'):
                risk_context += f"  - {dim}: {'; '.join(d['signals'])}\n"
        reflex = pos_risk.get('reflexivity', {})
        risk_context += f"- 反身性自检: {reflex.get('conclusion','?')}\n"
        if reflex.get('bias_alert'):
            risk_context += f"  - ⚠️ 偏见预警: {reflex['bias_alert']}\n"
        risk_context += f"- 持仓: {pos_risk['position']['shares']}股 @{pos_risk['position']['current_price']:.2f}, 盈亏 {pos_risk['position']['unrealized_pnl_pct']:+.2f}%\n\n"

ts = datetime.now().strftime('%Y-%m-%d %H:%M')

# ═══ 获取推荐候选池的实时价格（注入 Ponder prompt） ═══
stock_price_hint = ""
try:
    import requests as _r
    # 从经验库和机构调研数据中提取热门股票代码
    hot_codes = []
    if sig_data:
        visits = sig_data.get('dimensions', {}).get('institutions', {}).get('visits', [])
        for v in (visits or [])[:10]:
            name = v.get('名称', '')
            # 常见的机构调研热门股 → 代码映射
            hot_map = {'澜起科技': '688008', '蓝思科技': '300433', '迈瑞医疗': '300760',
                       '立讯精密': '002475', '海康威视': '002415', '比亚迪': '002594',
                       '宁德时代': '300750', '贵州茅台': '600519'}
            if name in hot_map:
                hot_codes.append(hot_map[name])
    # 补齐到至少 8 个
    default_hot = ['000001', '600519', '300750', '000858', '601318', '600036', '000333', '002594']
    for c in default_hot:
        if c not in hot_codes:
            hot_codes.append(c)
    hot_codes = hot_codes[:15]

    # 腾讯行情批量查
    qt_list = []
    for c in hot_codes:
        if c.startswith('6') or c.startswith('5'):
            qt_list.append(f'sh{c}')
        else:
            qt_list.append(f'sz{c}')
    url = f"http://qt.gtimg.cn/q={','.join(qt_list)}"
    resp = _r.get(url, timeout=8)
    if resp.status_code == 200:
        for line in resp.text.strip().split('\n'):
            parts = line.split('~')
            if len(parts) > 32:
                name = parts[1]
                code = parts[2]
                price = parts[3]
                change_pct = parts[32]
                stock_price_hint += f"{name}({code}): ¥{price} 涨跌{change_pct}%\n"
    if stock_price_hint:
        stock_price_hint = f"\n## 个股实时行情（腾讯行情数据，用于填写 buy_price）\n\n{stock_price_hint}\n"
        log(f'  📡 已获取 {len(stock_price_hint.split(chr(10)))-3} 只个股实时价格')
except Exception as e:
    log(f'  ⚠️ 价格提示获取失败: {e}')

# 构建完整的 Ponder 分析 prompt —— 触发 SKILL.md 的 9 步管线
ponder_prompt = f"""⛔ 全自动模式：使用 /luke:ponder 完整能力分析A股市场数据，产出交易决策。

当前时间: {ts}
可用市场: 沪深A股、创业板、科创板、ETF

## 自动交互规则

1. AskUserQuestion 全部自行判断：基于传感器数据+经验库+持仓风控结果，不选预设选项，自己描述答案。引用具体数值。
2. 流程不要停顿，不要等待用户输入。

## 传感器数据

{summary}
{stock_price_hint}
{experience_prompt}

{risk_context}

## ⛔ 强制输出格式（第一优先级）

全部 9 步推理正常执行，但**最终回复必须以 ```json 代码块开头**，JSON 之后可以附上自然语言总结。
如果 JSON 不完整或缺失，整个推理将被视为无效，操盘指令无法执行。

⛔ JSON 关键规则：
1. buy_price 必须填写真实价格（参考上方"个股实时行情"），不能为 null。如果没有实时行情数据，用传感器数据中该股票的最新价估算。连估算都没有的股票不要推荐。
2. target_price 和 stop_loss 必须根据 buy_price 计算（例如 target_price = buy_price * 1.05, stop_loss = buy_price * 0.95），不能为 null。
3. recommended_stocks 每只股票都要有完整的 symbol/name/action/confidence/buy_price/target_price/stop_loss/reason。
4. position_adjustments 必须包含所有现有持仓的调仓建议（继续持有/减仓/清仓），不能遗漏。每条必须包含 symbol/name/current_action/reason/pnl_analysis。

```json
{{
  "timestamp": "{ts}",
  "market_sentiment": "整体市场判断",
  "signals": [{{"type": "异常/机会/矛盾", "description": "信号描述+具体数值", "source": "数据来源", "strength": "强/中/弱"}}],
  "conclusion": "综合结论（至少200字）",
  "recommended_stocks": [
    {{"symbol": "000001.SZ", "name": "平安银行", "action": "BUY", "confidence": 0.75, "buy_price": 11.20, "target_price": 12.50, "stop_loss": 10.50, "reason": "多维度理由"}}
  ],
  "position_adjustments": [
    {{"symbol": "000001.SZ", "name": "平安银行", "current_action": "HOLD", "reason": "调整理由", "pnl_analysis": "盈亏分析"}}
  ],
  "action_plan": [{{"step": 1, "action": "具体动作", "criterion": "完成判据", "urgency": "时间"}}],
  "kill_conditions": ["可观测中止条件"],
  "expected_results": {{"short_term": "1-3日预期", "verification": "验证方式"}},
  "risk": "主要风险",
  "likely_wrong_point": "最可能出错的环节"
}}
```

⚠️ 再次强调：完成全部推理后，必须先用上述 JSON 格式输出决策数据，再附自然语言总结。JSON 是第一优先级。"""


ponder_file = os.path.join(DATA_DIR, 'ponder-output.json')
try:
    env = os.environ.copy()
    env['CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS'] = '0'  # 无限等待子agent，防止截断
    r3 = subprocess.run([
        'claude',
        '--permission-mode', 'auto',
        '--max-turns', '50',
        ponder_prompt,
    ], capture_output=True, text=True, timeout=7200, cwd=PONDER_DIR, input='', env=env)
    ponder_text = (r3.stdout or '')
    if r3.stderr:
        ponder_text = (r3.stderr + '\n' + ponder_text)
    log(f'  Ponder 退出码: {r3.returncode}, 输出: {len(ponder_text)}字符 (stdout:{len(r3.stdout or "")} stderr:{len(r3.stderr or "")})')
except subprocess.TimeoutExpired:
    log('  Ponder 超时(2h)')
    ponder_text = ''
except Exception as e:
    log(f'  Ponder 异常: {e}')
    ponder_text = ''

with open(ponder_file, 'w') as f:
    f.write(ponder_text)

# 提取 JSON
recommended = []
position_adj = []
if ponder_text:
    m = re.search(r'```json\s*\n(.*?)\n\s*```', ponder_text, re.DOTALL)
    if m:
        try:
            data = json.loads(m.group(1))
            recommended = data.get('recommended_stocks', [])
            position_adj = data.get('position_adjustments', [])
        except Exception as e:
            log(f'  JSON解析失败: {e}')

if not recommended:
    if len(ponder_text) < 100:
        log('  🚫 Ponder 无有效输出，跳过交易（保护机制）')
        recommended = []
    else:
        log('  ⚠️ 无推荐股票，从摘要兜底')
        recommended = [{'symbol': '000001.SZ', 'name': '平安银行', 'action': 'HOLD', 'reason': 'Ponder无输出，保持观望'}]

log(f'  Ponder 推荐 {len(recommended)} 只股票, {len(position_adj)} 个调仓建议')
save_json(os.path.join(DATA_DIR, 'ponder-stocks.json'), recommended)

# ══ Phase 3b: 数据维度自愈 ══
missing_dims = []
if ponder_text:
    dim_keywords = {
        '个股资金流向': ['个股资金', 'DDX', 'DDY'],
        '个股财务数据': ['PE', 'PB', 'ROE', '营收增速', '市盈率', '市净率'],
        '个股新闻舆情': ['公告', '研报.*个股', '雪球.*个股', '舆情.*个股'],
        '反共识信号': ['期权.*IV', '期货升贴水', '可转债溢价', '隐含波动率'],
        '行业板块强弱': ['行业排名', '板块对比', '行业轮动', '申万行业'],
        '技术指标': ['MACD', 'RSI', 'KDJ', '布林带', 'BOLL'],
        '龙虎榜明细': ['龙虎榜.*个股', '游资.*席位'],
        '融资融券明细': ['融资余额.*个股', '融券余额.*个股'],
    }
    text_lower = ponder_text.lower()
    for dim_name, keywords in dim_keywords.items():
        for kw in keywords:
            if re.search(kw, text_lower):
                missing_dims.append(dim_name)
                break
    if 'data' in dir() and isinstance(data, dict):
        wrong_point = data.get('likely_wrong_point', '')
        if wrong_point and ('数据' in wrong_point or '信息' in wrong_point):
            missing_dims.append('反共识信号(可谬触发)')

missing_dims = list(set(missing_dims))[:8]
if missing_dims:
    signals_config_path = os.path.join(DATA_DIR, 'signals.json')
    signals_config = load_json(signals_config_path) or {}
    existing = set(signals_config.get('missing_dimensions', []))
    existing.update(missing_dims)
    signals_config['missing_dimensions'] = list(existing)
    signals_config['last_updated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    save_json(signals_config_path, signals_config)
    log(f'  🔧 数据自愈: 标记 {len(missing_dims)} 个缺失维度 → signals.json')
    if 'data' in dir() and isinstance(data, dict):
        data['missing_dimensions'] = missing_dims
else:
    log('  数据维度完整')

# ═══════════════════════════════════════════════════════════
# Phase 4: TradingAgents 多智能体决策 (15min, 只跑最重要的2只)
# ═══════════════════════════════════════════════════════════
log('═ Phase 4/7: TradingAgents 分析 ═')

# 构建 TA 环境变量
ta_env = os.environ.copy()
ta_env.setdefault('ANTHROPIC_API_KEY', '2814b318a74985fa0e4f8661697afbcf:YTU5YjY0ZWE0NjFkMDdhZTEwNmEzNTA4')
ta_env.setdefault('ANTHROPIC_BASE_URL', 'https://maas-coding-api.cn-huabei-1.xf-yun.com/anthropic')
ta_env.setdefault('TRADINGAGENTS_LLM_PROVIDER', 'anthropic')
ta_env.setdefault('TRADINGAGENTS_DEEP_THINK_LLM', 'astron-code-latest')
ta_env.setdefault('TRADINGAGENTS_QUICK_THINK_LLM', 'astron-code-latest')
ta_env.setdefault('TRADINGAGENTS_LLM_BACKEND_URL', 'https://maas-coding-api.cn-huabei-1.xf-yun.com/anthropic')
ta_env.setdefault('TRADINGAGENTS_OUTPUT_LANGUAGE', 'Chinese')
ta_env.setdefault('TRADINGAGENTS_LLM_MAX_RETRIES', '6')

ta_results = []
# 分析范围: Ponder推荐的股票 + 现有持仓
# 跳过 ETF（yfinance 没有 A 股 ETF 数据，由 Ponder 全权决策）
analyze_list = []
for s in recommended[:3]:
    sym = s.get('symbol', '')
    name = s.get('name', '')
    # 跳过 ETF（以 .SH 结尾且代码 5 开头，或名字含 ETF）
    if 'ETF' in name.upper() or (sym.startswith('5') and '.SH' in sym):
        log(f'  ⏭️ 跳过ETF TA: {name}({sym}) — 由Ponder决策')
        continue
    analyze_list.append(s)
sys.path.insert(0, '/opt/scripts')
from paper_account import Account
acc = Account.load(ACCOUNT_NAME)
for sid, pos in acc.positions.items():
    if sid not in [s.get('symbol','') for s in analyze_list]:
        pname = pos.name
        if 'ETF' not in pname.upper():
            analyze_list.append({'symbol': sid, 'name': pname, 'action': 'HOLD', 'reason': '现有持仓复核'})

for stock in analyze_list[:1]:  # 最多1只（ETF跳过+持仓复核），5分钟窗口
    symbol = stock['symbol']
    name = stock.get('name', symbol)
    log(f'  TA分析: {name}({symbol})')
    try:
        r4 = subprocess.run([
            '/opt/TradingAgents/.venv/bin/python3',
            '/opt/scripts/run-ta.py', symbol,
            datetime.now().strftime('%Y-%m-%d'),
        ], capture_output=True, text=True, timeout=300, env=ta_env)
        if r4.stdout and r4.stdout.strip():
            result = json.loads(r4.stdout)
        else:
            result = {'symbol': symbol, 'name': name, 'status': 'error', 'error': 'empty output'}
    except subprocess.TimeoutExpired:
        result = {'symbol': symbol, 'name': name, 'status': 'timeout'}
    except Exception as e:
        result = {'symbol': symbol, 'name': name, 'status': 'error', 'error': str(e)[:200]}
    ta_results.append(result)
    action = result.get('action', result.get('status', '?'))
    log(f'    → {action}')

save_json(os.path.join(DATA_DIR, 'ta-decision.json'), ta_results)

# ═══════════════════════════════════════════════════════════
# Phase 5: 虚拟账户自动执行
# ═══════════════════════════════════════════════════════════
log('═ Phase 5/7: 虚拟账户执行 ═')

execution_log = {"timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'), "trades": []}

# ═══ 价格查询辅助函数 ═══
def get_real_price(symbol):
    """多级兜底获取真实价格：腾讯行情 > akshare > 缓存 > 默认50"""
    code = symbol.replace('.SZ', '').replace('.SH', '')
    # 腾讯行情前缀
    if symbol.endswith('.SZ') or symbol.startswith('000') or symbol.startswith('002') or symbol.startswith('300'):
        qt_code = f'sz{code}'
    else:
        qt_code = f'sh{code}'

    # 1. 腾讯行情API（最稳定）
    try:
        import requests as _r
        url = f'http://qt.gtimg.cn/q={qt_code}'
        resp = _r.get(url, timeout=5)
        if resp.status_code == 200 and '~' in resp.text:
            parts = resp.text.split('~')
            if len(parts) > 3:
                p = float(parts[3])
                log(f'    📡 腾讯行情 {symbol}: ¥{p:.2f}')
                return p
    except:
        pass

    # 2. akshare
    try:
        df = ak.stock_zh_a_spot()
        row = df[df['代码'] == code]
        if len(row) > 0:
            p = float(row.iloc[0]['最新价'])
            log(f'    📡 akshare {symbol}: ¥{p:.2f}')
            return p
    except:
        pass

    # 3. 兜底
    log(f'    ⚠️ 无真实价格 {symbol}，使用默认50')
    return 50.0

for i, stock in enumerate(recommended[:3]):
    ta = ta_results[i] if i < len(ta_results) else {}
    action = ta.get('action', stock.get('action', 'HOLD')).upper()
    symbol = stock['symbol']
    name = stock.get('name', symbol)

    if 'BUY' in action or 'OVERWEIGHT' in action:
        budget = acc.cash * 0.15  # 单票最多15%仓位
        # 多级价格获取: Ponder JSON > TA > akshare实时 > 缓存 > 历史收盘价 > 默认50
        price = None
        if stock.get('buy_price') and isinstance(stock['buy_price'], (int, float)) and stock['buy_price'] > 1:
            price = float(stock['buy_price'])
            log(f'    📋 Ponder价 {symbol}: ¥{price:.2f}')
        elif ta.get('price') and isinstance(ta['price'], (int, float)) and ta['price'] > 1:
            price = float(ta['price'])
            log(f'    📊 TA价 {symbol}: ¥{price:.2f}')
        if price is None:
            price = get_real_price(symbol)
        shares = max(int(budget / price / 100) * 100, 100)
        if shares * price <= acc.cash:
            trade = acc.buy(symbol, name, shares, price, 'Ponder+TA联合决策')
            execution_log['trades'].append({'action': 'BUY', 'symbol': symbol, 'shares': shares, 'price': price})
            log(f'  🟢 买入 {name} {shares}股 @{price:.2f}')
        else:
            log(f'  ⚠️ 现金不足跳过 {name}')

    elif 'SELL' in action or 'UNDERWEIGHT' in action:
        if symbol in acc.positions:
            pos = acc.positions[symbol]
            sell_shares = max(int(pos.shares * 0.5 / 100) * 100, 100)
            if sell_shares <= pos.shares:
                trade = acc.sell(symbol, sell_shares, pos.current_price, 'Ponder+TA风控信号')
                execution_log['trades'].append({'action': 'SELL', 'symbol': symbol, 'shares': sell_shares, 'price': pos.current_price})
                log(f'  🔴 卖出 {name} {sell_shares}股 @{pos.current_price:.2f}')
    else:
        log(f'  ⚪ {name}: HOLD')

# 处理调仓建议
for adj in position_adj:
    symbol = adj.get('symbol', '')
    action = adj.get('current_action', '').upper()
    if 'SELL' in action and symbol in acc.positions:
        pos = acc.positions[symbol]
        sell_shares = max(int(pos.shares * 0.3 / 100) * 100, 100)
        if sell_shares <= pos.shares:
            trade = acc.sell(symbol, sell_shares, pos.current_price, f'风控调仓: {adj.get("reason","")}')
            execution_log['trades'].append({'action': 'SELL', 'symbol': symbol, 'shares': sell_shares, 'price': pos.current_price})
            log(f'  🔴 调仓卖出 {symbol} {sell_shares}股')

acc.save()
save_json(os.path.join(DATA_DIR, 'execution-log.json'), execution_log)

# 保存快照
snapshot = {
    "date": datetime.now().strftime('%Y-%m-%d'),
    "total_equity": acc.total_equity,
    "cash": acc.cash,
    "market_value": acc.total_market_value,
    "total_return": acc.total_return,
    "unrealized_pnl": acc.total_unrealized_pnl,
    "positions": {s: {"name": p.name, "shares": p.shares, "price": p.current_price,
                       "pnl": p.unrealized_pnl, "pnl_pct": p.unrealized_pnl_pct}
                  for s, p in acc.positions.items()}
}
save_json(os.path.join(DATA_DIR, 'account-snapshot.json'), snapshot)

# 更新每日盈亏记录
daily_pnl_file = os.path.join(DATA_DIR, 'daily-pnl.json')
daily_records = load_json(daily_pnl_file) or []
prev_equity = daily_records[-1].get('equity', acc.initial_capital) if daily_records else acc.initial_capital
today_pnl = acc.total_equity - prev_equity
daily_records.append({
    "date": datetime.now().strftime('%Y-%m-%d'),
    "equity": acc.total_equity,
    "daily_pnl": round(today_pnl, 2),
    "total_return": round(acc.total_return, 2),
    "trades": len(execution_log['trades'])
})
# 保留90天
if len(daily_records) > 90:
    daily_records = daily_records[-90:]
save_json(daily_pnl_file, daily_records)

log(f'  账户: 总资产 ¥{acc.total_equity:,.2f}, 收益 {acc.total_return:+.2f}%')

# ═══════════════════════════════════════════════════════════
# Phase 6: 经验结晶
# ═══════════════════════════════════════════════════════════
log('═ Phase 6/7: 经验结晶 ═')

try:
    r6 = subprocess.run([
        'node', '-e', f'''
        const fs = require("fs");
        const self = require("{PONDER_DIR}/scripts/mma/framework_self.js");
        const result = self.recordOutcome({{
            session_id: "pipeline_{datetime.now().strftime('%Y%m%d_%H%M')}",
            question_type: "股票交易决策",
            stance: {json.dumps(ponder_text[:500] if ponder_text else "无输出")},
            grounds: {json.dumps(summary[:500])},
            outcome: "pending",
            execution_result: {json.dumps(execution_log)}
        }});
        console.log(JSON.stringify(result));
        ''',
    ], capture_output=True, text=True, timeout=30, cwd=PONDER_DIR)
    if r6.returncode == 0:
        log(f'  经验结晶完成')
    else:
        log(f'  经验结晶异常: {r6.stderr[:100]}')
except Exception as e:
    log(f'  经验结晶失败: {e}')

# ═══════════════════════════════════════════════════════════
# Phase 7: 微信推送
# ═══════════════════════════════════════════════════════════
log('═ Phase 7/7: 微信推送 ═')

try:
    r7 = subprocess.run(['python3', '/opt/scripts/send-wechat-report.py'],
                        capture_output=True, text=True, timeout=300)
    if r7.returncode == 0:
        log('  微信推送 ✅')
    else:
        log(f'  微信推送失败: {r7.stderr[:100]}')
except Exception as e:
    log(f'  微信推送异常: {e}')

# ═══════════════════════════════════════════════════════════
# 完成
# ═══════════════════════════════════════════════════════════
print()
print('=' * 70)
print(f'  🤖 全自动交易流水线完成 — {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
print(f'  总资产: ¥{acc.total_equity:,.2f}  |  收益: {acc.total_return:+.2f}%')
print(f'  今日操作: {len(execution_log["trades"])}笔')
print(f'  微信推送: {"✅" if r7.returncode == 0 else "❌"}')
print('=' * 70)

log('流水线完成 ✅')
