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

# ═══════════════════════════════════════════════════════════
# 引擎思维工具箱 — 27个引擎文档的精简摘要（约3KB）
# ═══════════════════════════════════════════════════════════
def build_engine_toolbox():
    """从 engine/*.md 生成精简思维工具箱，注入 Ponder prompt"""
    engine_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine')
    if not os.path.isdir(engine_dir):
        # 远端路径
        alt = '/opt/workspace/mcts-skill/engine'
        if os.path.isdir(alt):
            engine_dir = alt
        else:
            return ""

    # 核心框架：每个文档提炼1-3句
    summaries = {
        # ── 认知管线步骤 ──
        "shensi": "**神思(前提审视)**：检查问题预设的前提是否成立，不成立则消解问题而非在框架内解题。先问问题该不该这样问，再问怎么答。",
        "divergence": "**发散(六合)**：6视角审视(多/空/趋势/价值/情绪/对冲)。高赌注问题做视角互否——找1-2对对立视角互质疑再合题，共识须是互否后存活的判断。",
        "bagua": "**八卦镜(盲点扫描)**：8维度并行扫描盲点(政策/资金/基本面/技术/外盘/结构/筹码/季节)。盲点是被忽视但可能致命的缺口。",
        "converge": "**收敛(合意)**：从多个选项中筛选幸存方案。淘汰弱方案并记录淘汰理由。收敛后幸存方案才进入后续评分推演。",
        "debate": "**辩论(抗压)**：每方案立论→汇总→相互攻击评估→抗压排名。第一名是压力下最站得住的方案。",
        "synthesis": "**综合(枢机)**：输出最终结论+风险+结论自反(质疑自己结论的成立条件)+可谬标注(最可能错在哪+备选)+不可同化项(合题消化不掉的他者立场)。",

        # ── 独立思维工具 ──
        "working-stance": "**工作立场**：在推理中维持一个会演化的临时倾向(有倾向/有依据/会演化/可被质疑)。框架不再中立裁判，而是每次推理都沉淀一个判断。进化回路因立场而闭环。",
        "signal-filter": "**信号过滤**：从连续信号流中识别值得注意的东西，只放行有信息增量的信号进深度管线。防止被噪音淹没。",
        "phronesis": "**实践智慧(巴氏)**：在不确定情境中做明智判断，平衡理性分析与直觉经验。不是最优解而是足够好且可执行的解。",
        "outcome-learning": "**结果学习**：每次判断的后果回流，修正后续判断的权重和倾向。与进化回路协同，让框架从经验中学习。",
        "self-continuity": "**自我连续性**：框架维护一个跨时间的身份叙事(自我叙事)，确保判断在时间上一致——今天的我不会轻易推翻昨天的我的判断，除非有新证据。",
        "dissolve-frame": "**问题消解**：不是所有问题都需要回答——有些问题的提法本身预设了错误的前提。识别并消解伪问题，不浪费精力。",
        "counterfactual-thinking": "**反事实思考**：在方案评估中做如果当时不这么做会怎样的假设推演，评估决策的边际价值。",
        "error-pattern": "**错误模式**：识别重复出现的错误类型(确认偏误/锚定/过度自信等)，在推理中主动检测并标记。",

        # ── 十大家族范式 ──
        "teleology": "**目的论(终态反推)**：先锚定成了的样子(可判定的验收标准)，再从终态反推今天第一步做什么。不是从当下向前铺选项，是从未来倒推路径。",
        "transcendental-audit": "**先验自检**：质疑评分工具/推理框架本身的前提是否适用于当前情境。当评分合法性可疑时触发——问这个评分框架本身对吗而非继续用它。",
        "socratic-ignorance": "**苏格拉底无知**：承认我不知道我知道什么。在做判断前先识别自己可能不知道的东西，让结论自带一个未知边界。",
        "otherness": "**他者性**：每个判断都可能有无法被消化吸收的残余——那个不认同不配合不合题的他者。识别不可同化项，标注这个结论不适用于谁。",
        "prospect-theory": "**前景理论**：人在损失区域的决策比获利区域更激进(损失厌恶)。在亏损持仓上主动检查是否因厌恶实现亏损而持有过久。",
        "mcts-constraint": "**MCTS约束**：搜索深度有限时，优先扩展高信息量的分支，而非高收益的分支——不确定性越大的分支，探索价值越高。",
        "mcts-predictive": "**预测性MCTS**：模拟时不仅看平均回报，还看回报的分布——最差情形、最佳情形、分布的偏度。",
        "mcts-simulate": "**模拟推演**：对每个幸存方案做乐观/悲观/现实3种情景的模拟，展示各情景下的路径和终态。",
        "mcts-diverge": "**MCTS发散**：在搜索树的每个节点刻意向不同方向发散，防止过早收敛到局部最优。",
        "mcts-converge": "**MCTS收敛**：当多个分支的评估趋同时主动收敛，避免在无差异的分支上浪费计算资源。",

        # ── 道家思想 ──
        "dao": "**道家思想**：(1)为道日损——交易策略做减法而非加法，去除不必要的操作，保留核心判断。(2)反者道之动——物极必反，大跌之后考虑反弹机会，大涨之后警惕回调。(3)坐忘——暂时放下已有立场重新审视市场。(4)涤除玄览——清除偏见后重新观察。",

        # ── 心理学/认知科学 ──
        "psychology": "**心理学**：(1)贝特森学习层次——零学习(不调整)/I(调参数)/II(调框架)/III(调前提)。亏损时应检查是参数错了还是框架错了。(2)弗拉维尔元认知——对自己的思考过程做二阶观察：我此刻的推理可靠吗？有没有跳步？(3)库伯学习圈——具体经验/反思观察/抽象概念化/主动实验，每轮交易完整走一圈。(4)邓宁-克鲁格——刚接触新策略时最容易过度自信，应在此时主动降仓。(5)记忆科学——间隔重复(教训需反复接触才内化)+记忆重构(每次回忆都是重写，因此记录必须原始完整)。",
    }

    parts = ["\n## 🧠 思维工具箱（引擎文档精简）\n"]
    # 按分类顺序排列
    order = ["shensi","divergence","bagua","converge","debate","synthesis",
             "working-stance","signal-filter","phronesis","outcome-learning","self-continuity",
             "dissolve-frame","counterfactual-thinking","error-pattern",
             "teleology","transcendental-audit","socratic-ignorance","otherness","prospect-theory",
             "mcts-constraint","mcts-predictive","mcts-simulate","mcts-diverge","mcts-converge",
             "dao","psychology"]
    for key in order:
        if key in summaries:
            parts.append(summaries[key])

    return "\n".join(parts)
os.environ['TRADINGAGENTS_LLM_MAX_RETRIES'] = '6'

ACCOUNT_NAME = sys.argv[1] if len(sys.argv) > 1 else 'default'
DATA_DIR = '/opt/scripts/data'
PONDER_DIR = '/opt/workspace/mcts-skill'
os.makedirs(DATA_DIR, exist_ok=True)

def log(msg):
    ts = datetime.now().strftime('%H:%M:%S')
    line = f'[{ts}] {msg}'
    print(line, flush=True)
    # 同时写入文件
    try:
        log_file = os.path.join(DATA_DIR, 'pipeline.log')
        with open(log_file, 'a') as f:
            f.write(line + '\n')
    except:
        pass

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

# 0a. Gateway 存活检查（快速，不阻塞）
try:
    r = subprocess.run(['openclaw', 'status'], capture_output=True, text=True, timeout=5)
    if r.returncode != 0:
        log(f'  ⚠️ Gateway 状态异常（继续执行）')
    else:
        log('  Gateway ✅')
except Exception as e:
    log(f'  ⚠️ Gateway 不可达（继续执行）')

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
        env = os.environ.copy()
        env['TQDM_DISABLE'] = '1'
        subprocess.run(['python3', '/opt/scripts/position-risk.py'], timeout=60, env=env)
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
    env = os.environ.copy()
    env['TQDM_DISABLE'] = '1'
    r = subprocess.run(['python3', '/opt/scripts/position-risk.py'],
                       capture_output=True, text=True, timeout=60, env=env)
    if r.returncode == 0 and r.stdout.strip():
        with open(risk_file, 'w') as f:
            f.write(r.stdout)
        risk_data = json.loads(r.stdout)
        risk_summary = risk_data.get('summary', {})
        log(f'  风控完成: {risk_summary.get("total_positions",0)}只持仓, '
            f'{risk_summary.get("high_risk_count",0)}只高风险, '
            f'均分{risk_summary.get("avg_risk_score",0)}')
    else:
        log(f'  风控异常(rc={r.returncode})，继续')
        risk_data = {"positions": [], "summary": {"overall_level": "unknown"}}
except subprocess.TimeoutExpired:
    log('  ⚠️ 风控超时60s，跳过（不影响后续）')
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

# ═══ 注入当前持仓+可用资金到 Ponder prompt ═══
position_prompt = ""
try:
    sys.path.insert(0, '/opt/scripts')
    from paper_account import Account
    acc_positions = Account.load(ACCOUNT_NAME)
    if acc_positions.positions:
        position_prompt = "\n\n## 当前持仓（必须对每只持仓在 position_adjustments 中给出调仓建议）\n\n"
        for pos in acc_positions.positions.values():
            pnl_icon = "🟢" if pos.unrealized_pnl >= 0 else "🔴"
            position_prompt += f"{pnl_icon} {pos.name}({pos.symbol}): {pos.shares}股, 成本¥{pos.avg_cost:.2f}, 现价¥{pos.current_price:.2f}, 盈亏{pos.unrealized_pnl:+,.2f}({pos.unrealized_pnl_pct:+.2f}%)\n"
        position_prompt += "\n⚠️ 以上是当前持仓。**必须对每只持仓给出调仓建议**：\n"
        position_prompt += "  - HOLD → 继续持有\n"
        position_prompt += "  - REDUCE → 减仓（需填 reduce_ratio: 0.5 = 卖一半）\n"
        position_prompt += "  - CLEAR → 清仓（趋势走坏/基本面恶化/风控信号触发）\n"
        position_prompt += "  - ADD → 加仓（非常看好，当前仓位不够）\n"
        position_prompt += "\n📌 亏损超-5% → REDUCE或CLEAR | 盈利超+5% → REDUCE一半止盈 | 盈利超+10% → CLEAR止盈\n"
    else:
        position_prompt = "\n\n当前无持仓。\n"
    position_prompt += f"\n💰 **可用资金: ¥{acc_positions.cash:,.2f}**  (占总资产约{acc_positions.cash/acc_positions.total_equity*100:.0f}%)\n"
    position_prompt += "\n🔥 **核心指令：你是交易员不是风控员。你的目标不是'不犯错'而是'赚钱'。**\n"
    position_prompt += "  - 当传感器数据显示强烈买入信号时，**必须推荐 BUY action**，不能因为怕错就写 HOLD\n"
    position_prompt += "  - 闲置资金不产生收益。可用资金多时必须积极寻找买入机会\n"
    position_prompt += "  - 每只推荐股票请在 recommended_stocks 中填写 position_size 字段(0.05-0.30)，表示占总资产的比例\n"
    position_prompt += "    - confidence≥0.80 → position_size=0.20~0.30（重仓）\n"
    position_prompt += "    - confidence 0.60-0.79 → position_size=0.10~0.20（中等仓位）\n"
    position_prompt += "    - confidence<0.60 → position_size=0.05~0.10（轻仓试错）\n"
    position_prompt += "  - 单只股票最高不超过总资产的30%（position_size≤0.30）\n"
    position_prompt += "  - 所有推荐的 BUY 加起来不超过可用资金的90%\n"
    log(f'  📋 注入持仓+资金到 Ponder prompt')
except Exception as e:
    log(f'  ⚠️ 持仓注入失败: {e}')
    position_prompt = ""

# ═══ 从文件加载历史交易教训（供 Ponder 参考，避免重复犯错） ═══
trade_lessons_injection = ""
lessons_file = os.path.join(DATA_DIR, 'trade-lessons.json')
if os.path.exists(lessons_file):
    try:
        lessons_data = load_json(lessons_file)
        if lessons_data and lessons_data.get('lessons'):
            lessons_text = ""
            for l in lessons_data['lessons'][-10:]:
                severity_map = {"critical": "⛔", "high": "⚠️", "medium": "⚡", "low": "💡"}
                icon = severity_map.get(l.get("severity",""), "📌")
                text = l.get('lesson_text', l.get('lesson', l.get('id', '?')))
                lessons_text += f"{icon} [{l['type']}] {text}\n"
            # 统计
            try:
                sys.path.insert(0, '/opt/scripts')
                from paper_account import Account
                acc_tmp = Account.load(ACCOUNT_NAME)
                buy_count = sum(1 for t in acc_tmp.trades if t.action == "BUY")
                sell_count = sum(1 for t in acc_tmp.trades if t.action == "SELL")
                stats = f"\n📊 历史统计: {len(acc_tmp.trades)}笔交易（买入{buy_count}笔 / 卖出{sell_count}笔）\n" \
                        f"   当前持仓: {len(acc_tmp.positions)}只\n" \
                        f"   总资产: ¥{acc_tmp.total_equity:,.2f}"
            except:
                stats = ""
            trade_lessons_injection = "\n\n## 📚 历史交易教训（trade-lessons.json）\n\n" + lessons_text + stats
            log(f'  📚 加载 {len(lessons_data["lessons"])} 条历史交易教训到 Ponder')
    except Exception as e:
        log(f'  ⚠️ 加载教训失败: {e}')

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

# ═══ 注入引擎思维工具箱（27个引擎文档的精简摘要） ═══
engine_toolbox = build_engine_toolbox()
log(f'  🧠 注入引擎工具箱 ({len(engine_toolbox)} 字符)')

# ═══ 启动外部子 agent（八卦镜 8 维度并行） ═══
sub_agent_injection = ""
try:
    log('  🔄 启动外部子 agent（八卦镜 8 维度并行）...')
    sub_agent_json = os.path.join(DATA_DIR, 'sub_agent_results.json')
    r_sa = subprocess.run([
        'python3', '/opt/scripts/sub_agents.py',
        os.path.join(DATA_DIR, 'last-signals.json'),
        sub_agent_json,
    ], capture_output=True, text=True, timeout=1800)
    if os.path.exists(sub_agent_json):
        with open(sub_agent_json, 'r') as f:
            sub_data = json.load(f)
        injection_text = sub_data.get('injection_text', '')
        ok_count = sub_data.get('stats', {}).get('ok', 0)
        if injection_text:
            sub_agent_injection = "\n\n## Bagua Mirrors (Sub-Agent Results)\n\n" + injection_text + "\n"
        log(f'  ✅ 外部子 agent: {ok_count}/8 维度成功, 注入 {len(injection_text)} 字符')
except Exception as e:
    log(f'  ⚠️ 外部子 agent 异常: {e}')

# ═══ 注入市场感知（持续感知机制） ═══
market_sense_injection = ""
try:
    log('  👁️ 注入市场感知...')
    r_sense = subprocess.run(
        ['python3', '/opt/scripts/market-sense.py', '--text'],
        capture_output=True, text=True, timeout=60)
    output = r_sense.stdout
    m = re.search(r'---INJECTION_START---\n(.*?)\n---INJECTION_END---', output, re.DOTALL)
    if m:
        market_sense_injection = "\n\n" + m.group(1) + "\n"
        log(f'  市场感知注入: {len(m.group(1))} 字符')
    else:
        log('  市场感知输出未找到注入标记')
except Exception as e:
    log(f'  ⚠️ 市场感知异常: {e}')

# ═══ 注入证伪引擎 ═══
falsify_injection = ""
try:
    log('  ❓ 注入证伪引擎...')
    r_fal = subprocess.run(
        ['python3', '/opt/scripts/falsify.py'],
        capture_output=True, text=True, timeout=30)
    output = r_fal.stdout
    m = re.search(r'---FALSIFY_START---\n(.*?)\n---FALSIFY_END---', output, re.DOTALL)
    if m:
        falsify_injection = "\n\n" + m.group(1) + "\n"
        log(f'  证伪引擎注入: {len(m.group(1))} 字符')
    else:
        # 可能是无持仓时的简短输出
        falsify_injection = "\n\n" + output + "\n" if output.strip() else ""
        log(f'  证伪引擎输出: {len(output)} 字符（无持仓）')
except Exception as e:
    log(f'  ⚠️ 证伪引擎异常: {e}')

# 构建完整的 Ponder 分析 prompt —— 触发 SKILL.md 的 9 步管线
ponder_prompt = f"""⛔ 全自动模式：使用 /luke:ponder 完整能力分析A股市场数据，产出交易决策。

当前时间: {ts}
可用市场: 沪深A股、创业板、科创板、ETF

{sub_agent_injection}

## 自动交互规则

1. AskUserQuestion 全部自行判断：基于传感器数据+经验库+持仓风控结果，不选预设选项，自己描述答案。引用具体数值。
2. 流程不要停顿，不要等待用户输入。

## 传感器数据

{summary}
{stock_price_hint}
{experience_prompt}
{engine_toolbox}
{risk_context}

{position_prompt}
{trade_lessons_injection}
{market_sense_injection}
{falsify_injection}

## ⛔ 强制输出格式（第一优先级 — JSON 必须在最开头）

🚨 致命规则：你的**第一个输出**必须是 ```json 代码块，包含完整决策数据。JSON 之后可以附上自然语言总结。
如果第一个字符不是 ```json，整个推理将被视为无效，操盘指令无法执行，交易机会永久丢失！

⛔ JSON 关键规则：
1. buy_price 必须填写真实价格（参考上方"个股实时行情"），不能为 null。没有实时行情数据的股票不要推荐。
2. target_price 和 stop_loss 必须根据 buy_price 计算（例如 target_price = buy_price * 1.05~1.15, stop_loss = buy_price * 0.93~0.97），不能为 null。
3. recommended_stocks 每只股票都要有完整的 symbol/name/action/confidence/buy_price/target_price/stop_loss/reason/position_size。
4. position_adjustments 必须包含所有现有持仓的调仓建议（HOLD/REDUCE/CLEAR/ADD），不能遗漏。每条必须包含 symbol/name/current_action/reason/pnl_analysis。
5. 亏损超-5%的持仓优先 REDUCE 或 CLEAR | 盈利超+5%的持仓优先 REDUCE 一半止盈 | 盈利超+10%必须 CLEAR 止盈
6. REDUCE 时须填写 reduce_ratio（0~1，如 0.5 = 卖一半），CLEAR 时不需要 reduce_ratio。
7. **🔥 BUY 规则**：当传感器数据呈现强烈信号（至少2个独立维度同时指向同一方向）+ 有可用资金时，**必须推荐 BUY action**。不允许因为"等确认"而写 HOLD。信号明确就出手，信号模糊才等待。
8. **position_size** 0.05~0.30 表示占总资产的比例。confidence高则高仓位，低则轻仓试错。

```json
{{
  "timestamp": "{ts}",
  "market_sentiment": "整体市场判断",
  "signals": [{{"type": "异常/机会/矛盾", "description": "信号描述+具体数值", "source": "数据来源", "strength": "强/中/弱"}}],
  "conclusion": "综合结论（至少200字）",
  "recommended_stocks": [
    {{"symbol": "000001.SZ", "name": "平安银行", "action": "BUY", "confidence": 0.75, "buy_price": 11.20, "target_price": 12.50, "stop_loss": 10.50, "position_size": 0.15, "reason": "多维度理由"}}
  ],
  "position_adjustments": [
    {{"symbol": "000001.SZ", "name": "平安银行", "current_action": "HOLD", "reason": "调整理由", "pnl_analysis": "盈亏分析"}},
    {{"symbol": "600036.SH", "name": "招商银行", "current_action": "REDUCE", "reduce_ratio": 0.5, "reason": "调整理由", "pnl_analysis": "盈亏分析"}},
    {{"symbol": "300433.SZ", "name": "蓝思科技", "current_action": "CLEAR", "reason": "调整理由", "pnl_analysis": "盈亏分析"}}
  ],
  "action_plan": [{{"step": 1, "action": "具体动作", "criterion": "完成判据", "urgency": "时间"}}],
  "kill_conditions": ["可观测中止条件"],
  "expected_results": {{"short_term": "1-3日预期", "verification": "验证方式"}},
  "risk": "主要风险",
  "likely_wrong_point": "最可能出错的环节"
}}
```

⚠️ 再次强调：完成全部推理后，必须先用上述 JSON 格式输出决策数据，再附自然语言总结。JSON 是第一优先级。"""

# 保存 prompt 到文件（供 Phase 6.5 复盘分析使用）
with open(os.path.join(DATA_DIR, 'last-ponder-prompt.txt'), 'w') as _f:
    _f.write(ponder_prompt)

ponder_file = os.path.join(DATA_DIR, 'ponder-output.json')
ponder_tmp = os.path.join(DATA_DIR, '.ponder-tmp.txt')
try:
    # ═══ --print 模式 + 文件重定向（避免 pipe 截断输出） ═══
    ponder_env = os.environ.copy()
    ponder_env['API_TIMEOUT_MS'] = '120000'
    log('  🚀 启动 Ponder (--print 模式，子 agent 可用)...')
    with open(ponder_tmp, 'w') as out_f:
        r3 = subprocess.run([
            'claude', '--permission-mode', 'auto', '--max-turns', '100', '-p', ponder_prompt,
        ], stdout=out_f, stderr=subprocess.PIPE, text=True, timeout=7200, cwd=PONDER_DIR, env=ponder_env)
    # 从临时文件读取输出
    if os.path.exists(ponder_tmp):
        with open(ponder_tmp) as f:
            ponder_text = f.read()
        os.rename(ponder_tmp, ponder_file)
    else:
        ponder_text = ''
    stderr_text = r3.stderr or ''
    if stderr_text:
        log(f'  Ponder stderr: {len(stderr_text)}字符')
    log(f'  Ponder 退出码: {r3.returncode}, 输出: {len(ponder_text)}字符')
except subprocess.TimeoutExpired:
    log('  Ponder 超时(2h)')
    ponder_text = ''
except Exception as e:
    log(f'  Ponder 异常: {e}')
    ponder_text = ''

# ═══ 记录 Ponder 立场到 framework_self（供 Phase 6 recordOutcome 使用） ═══
if ponder_text and len(ponder_text) > 200:
    try:
        r_stance = subprocess.run([
            'node', '-e', f'''
            const fs = require("fs");
            const self = require("{PONDER_DIR}/scripts/mma/framework_self.js");
            const result = self.recordStance(
                "pipeline_{datetime.now().strftime('%Y%m%d_%H%M')}",
                "股票交易决策",
                {json.dumps(ponder_text[:300])},
                {json.dumps(summary[:300])}
            );
            console.log("stance_recorded:", result);
            ''',
        ], capture_output=True, text=True, timeout=15, cwd=PONDER_DIR)
        if r_stance.returncode == 0:
            log(f'  立场已记录到 framework_self')
        else:
            log(f'  立场记录异常: {r_stance.stderr[:100]}')
    except Exception as e:
        log(f'  立场记录失败: {e}')

# 提取 JSON — 支持多种格式：```json 块、裸 JSON、被截断的 JSON
recommended = []
position_adj = []
if ponder_text:
    # 策略1：```json 代码块
    m = re.search(r'```json\s*\n(.*?)\n\s*```', ponder_text, re.DOTALL)
    json_str = m.group(1) if m else ''

    # 策略2：文本以 { 开头（JSON 在最开头）
    if not json_str:
        stripped = ponder_text.strip()
        if stripped.startswith('{'):
            # 找第一个完整的 } 作为 JSON 结束
            depth = 0
            end = -1
            for i, ch in enumerate(stripped):
                if ch == '{': depth += 1
                elif ch == '}': depth -= 1
                if depth == 0 and ch == '}':
                    end = i + 1
                    break
            if end > 0:
                json_str = stripped[:end]

    # 策略3：任意位置找 { ... }
    if not json_str:
        m2 = re.search(r'\{[^{}]*"recommended_stocks"[^{}]*\}', ponder_text, re.DOTALL)
        if m2:
            json_str = m2.group(0)

    if json_str:
        try:
            data = json.loads(json_str)
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

# ═══ 独立止损+止盈扫描（不依赖任何外部信号，直接执行） ═══
stop_loss_executed = []
take_profit_executed = []
for sid, pos in list(acc.positions.items()):
    pnl_pct = pos.unrealized_pnl_pct
    # --- 止损 ---
    if pnl_pct < -7:
        # 亏损超过7% → 强制清仓
        sell_shares = max(int(pos.shares / 100) * 100, 100)
        if sell_shares <= pos.shares:
            acc.sell(sid, sell_shares, pos.current_price, f'止损清仓(亏损{pnl_pct:.1f}%)')
            execution_log['trades'].append({'action': 'SELL', 'symbol': sid, 'shares': sell_shares, 'price': pos.current_price, 'reason': 'stop_loss_7pct'})
            log(f'  🛑 止损清仓 {pos.name}({sid}) 亏损{pnl_pct:+.1f}%')
            stop_loss_executed.append(sid)
    elif pnl_pct < -5:
        # 亏损超过5% → 强制减半
        sell_shares = max(int(pos.shares * 0.5 / 100) * 100, 100)
        if sell_shares <= pos.shares:
            acc.sell(sid, sell_shares, pos.current_price, f'止损减半(亏损{pnl_pct:.1f}%)')
            execution_log['trades'].append({'action': 'SELL', 'symbol': sid, 'shares': sell_shares, 'price': pos.current_price, 'reason': 'stop_loss_5pct'})
            log(f'  🛑 止损减半 {pos.name}({sid}) 亏损{pnl_pct:+.1f}%')
            stop_loss_executed.append(sid)

    # --- 止盈 ---
    if pnl_pct > 10:
        # 盈利超过10% → 强制清仓止盈
        sell_shares = max(int(pos.shares / 100) * 100, 100)
        if sell_shares <= pos.shares:
            acc.sell(sid, sell_shares, pos.current_price, f'止盈清仓(盈利{pnl_pct:.1f}%)')
            execution_log['trades'].append({'action': 'SELL', 'symbol': sid, 'shares': sell_shares, 'price': pos.current_price, 'reason': 'take_profit_10pct'})
            log(f'  ✅ 止盈清仓 {pos.name}({sid}) 盈利{pnl_pct:+.1f}%')
            take_profit_executed.append(sid)
    elif pnl_pct > 5:
        # 盈利超过5% → 止盈一半
        sell_shares = max(int(pos.shares * 0.5 / 100) * 100, 100)
        if sell_shares <= pos.shares:
            acc.sell(sid, sell_shares, pos.current_price, f'止盈减半(盈利{pnl_pct:.1f}%)')
            execution_log['trades'].append({'action': 'SELL', 'symbol': sid, 'shares': sell_shares, 'price': pos.current_price, 'reason': 'take_profit_5pct'})
            log(f'  ✅ 止盈减半 {pos.name}({sid}) 盈利{pnl_pct:+.1f}%')
            take_profit_executed.append(sid)

for i, stock in enumerate(recommended[:5]):  # 最多处理5只推荐
    ta = ta_results[i] if i < len(ta_results) else {}
    action = ta.get('action', stock.get('action', 'HOLD')).upper()
    symbol = stock['symbol']
    name = stock.get('name', symbol)

    if 'BUY' in action or 'OVERWEIGHT' in action:
        # 动态仓位: Ponder 指定 position_size(0.05~0.30)，否则按 confidence 计算
        pos_size = stock.get('position_size', None)
        if pos_size and isinstance(pos_size, (int, float)) and 0.03 <= pos_size <= 0.30:
            budget = acc.total_equity * pos_size
        else:
            conf = stock.get('confidence', 0.5)
            # confidence 映射到仓位比例: 0.5→0.08, 0.6→0.12, 0.75→0.18, 0.9→0.25
            pos_size = 0.05 + (conf - 0.3) * 0.35
            pos_size = max(0.05, min(0.25, pos_size))
            budget = acc.total_equity * pos_size
        # 检查可用现金
        budget = min(budget, acc.cash * 0.95)
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
            execution_log['trades'].append({'action': 'BUY', 'symbol': symbol, 'shares': shares, 'price': price, 'pos_size': pos_size})
            log(f'  🟢 买入 {name} {shares}股 @{price:.2f} (仓位{pos_size*100:.0f}%, 预算¥{budget:,.0f})')
        else:
            # 现金不足时按实际现金比例买
            affordable = max(int(acc.cash / price / 100) * 100, 100)
            if affordable >= 100:
                trade = acc.buy(symbol, name, affordable, price, 'Ponder决策(现金受限)')
                execution_log['trades'].append({'action': 'BUY', 'symbol': symbol, 'shares': affordable, 'price': price, 'pos_size': affordable * price / acc.total_equity})
                log(f'  🟡 买入 {name} {affordable}股 @{price:.2f} (现金受限)')
            else:
                log(f'  ⚠️ 现金不足跳过 {name}, 可用¥{acc.cash:,.0f} < ¥{price:.0f}')

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

# 处理调仓建议（REDUCE/CLEAR/ADD）
for adj in position_adj:
    symbol = adj.get('symbol', '')
    action = adj.get('current_action', '').upper()
    if symbol in stop_loss_executed or symbol in take_profit_executed:
        continue  # 已被止损/止盈执行，跳过
    if symbol not in acc.positions:
        continue
    pos = acc.positions[symbol]
    if 'CLEAR' in action:
        # 清仓
        sell_shares = max(int(pos.shares / 100) * 100, 100)
        if sell_shares <= pos.shares:
            acc.sell(symbol, sell_shares, pos.current_price, f'Ponder清仓: {adj.get("reason","")}')
            execution_log['trades'].append({'action': 'SELL', 'symbol': symbol, 'shares': sell_shares, 'price': pos.current_price, 'reason': 'ponder_clear'})
            log(f'  🔴 清仓 {symbol} {sell_shares}股 — {adj.get("reason","")[:60]}')
    elif 'REDUCE' in action:
        # 减仓（按 reduce_ratio 或默认卖一半）
        ratio = adj.get('reduce_ratio', 0.5)
        if not isinstance(ratio, (int, float)) or ratio <= 0 or ratio > 1:
            ratio = 0.5
        sell_shares = max(int(pos.shares * ratio / 100) * 100, 100)
        if sell_shares <= pos.shares:
            acc.sell(symbol, sell_shares, pos.current_price, f'Ponder减仓({ratio:.0%}): {adj.get("reason","")}')
            execution_log['trades'].append({'action': 'SELL', 'symbol': symbol, 'shares': sell_shares, 'price': pos.current_price, 'reason': 'ponder_reduce'})
            log(f'  🔴 减仓 {symbol} {sell_shares}股({ratio:.0%}) — {adj.get("reason","")[:60]}')
    elif 'SELL' in action:
        # 兼容旧的 SELL 标记
        sell_shares = max(int(pos.shares * 0.5 / 100) * 100, 100)
        if sell_shares <= pos.shares:
            acc.sell(symbol, sell_shares, pos.current_price, f'风控调仓: {adj.get("reason","")}')
            execution_log['trades'].append({'action': 'SELL', 'symbol': symbol, 'shares': sell_shares, 'price': pos.current_price, 'reason': 'risk_sell'})
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
    # 根据今日交易盈亏判断 outcome
    trade_outcome = "validated" if today_pnl >= 0 else "falsified"
    session_id = "pipeline_{}".format(datetime.now().strftime('%Y%m%d_%H%M'))
    r6 = subprocess.run([
        'node', '-e', f'''
        const self = require("{PONDER_DIR}/scripts/mma/framework_self.js");
        const result = self.recordOutcome(
            "{session_id}",
            "{trade_outcome}",
            "今日盈亏: {today_pnl:+.2f}, 交易数: {len(execution_log['trades'])}"
        );
        console.log("outcome_recorded:", JSON.stringify(result));
        ''',
    ], capture_output=True, text=True, timeout=15, cwd=PONDER_DIR)
    if r6.returncode == 0:
        log(f'  经验结晶完成 (outcome={trade_outcome})')
    else:
        log(f'  经验结晶异常: {r6.stderr[:100]}')
except Exception as e:
    log(f'  经验结晶失败: {e}')

# ═══════════════════════════════════════════════════════════
# Phase 6.5: 交易复盘与自我迭代
# ═══════════════════════════════════════════════════════════
log('═ Phase 6.5/7: 交易复盘与自我迭代 ═')
try:
    r65 = subprocess.run(['python3', '/opt/scripts/trade-analyzer.py'],
                         capture_output=True, text=True, timeout=60)
    if r65.returncode == 0:
        # 提取注入文本
        output = r65.stdout
        m = re.search(r'---INJECTION_START---\n(.*?)\n---INJECTION_END---', output, re.DOTALL)
        if m:
            trade_lessons_injection = m.group(1)
            log(f'  复盘完成，生成 {len(trade_lessons_injection)} 字教训注入')
        else:
            trade_lessons_injection = ""
            log('  复盘完成（无新教训）')
        # 输出复盘摘要
        for line in output.split('\n'):
            if line.strip() and not line.startswith('---') and not line.startswith('{'):
                print(line)
    else:
        log(f'  复盘异常: {r65.stderr[:100]}')
        trade_lessons_injection = ""
except Exception as e:
    log(f'  复盘失败: {e}')
    trade_lessons_injection = ""

# ═══ 进化权重学习（基于教训采纳率和账户表现自动调整） ═══
log('  🔄 进化权重学习...')
try:
    weights_path = os.path.expanduser('~/.claude/data/skills/ponder/learned-weights.json')
    if os.path.exists(weights_path):
        with open(weights_path) as f:
            weights = json.load(f)
    else:
        # 默认权重
        weights = {
            'uncertainty_ambiguity': 0.35, 'uncertainty_risk': 0.4, 'uncertainty_ignorance': 0.25,
            'boundary_deepen': 0.5, 'boundary_adjust': 0.25,
            'free_energy_verify': 0.4, 'free_energy_selfcheck': 0.3, 'free_energy_prederror': 0.3,
            'vfinal_feas': 0.5, 'vfinal_robust': 0.3, 'vfinal_persp': 0.2,
            '_learning_rate': 0.08, '_version': 1, '_total_learns': 0
        }

    # 计算学习信号
    lesson_adopt_rate = 0
    lessons_path = os.path.join(DATA_DIR, 'trade-lessons.json')
    if os.path.exists(lessons_path):
        with open(lessons_path) as f:
            ld = json.load(f)
        all_lessons = ld.get('lessons', [])
        total = len(all_lessons)
        adopted = sum(1 for l in all_lessons if l.get('adopted_count', 0) > 0)
        if total > 0:
            lesson_adopt_rate = adopted / total

    # 基于教训采纳率和账户表现调整权重
    lr = weights.get('_learning_rate', 0.08)
    learn_signals = []

    # 信号1: 教训采纳率低 → 减少经验权重依赖
    if lesson_adopt_rate < 0.3:
        # adopt 率低说明经验注入效果差 → 降低 reliance, 增加 uncertainty
        delta = lr * (0.3 - lesson_adopt_rate) * 2
        weights['uncertainty_ambiguity'] = min(0.99, weights.get('uncertainty_ambiguity', 0.35) + delta)
        weights['_total_learns'] = weights.get('_total_learns', 0) + 1
        learn_signals.append(f'教训采纳率{lesson_adopt_rate:.0%}低 → uncertainty_ambiguity+{delta:.3f}')

    # 信号2: 账户盈亏为正 → 强化当前权重
    if acc.total_return > 0:
        delta = lr * min(acc.total_return / 50, 0.5)
        for key in ['vfinal_feas', 'vfinal_robust']:
            weights[key] = min(0.99, weights.get(key, 0.5) + delta)
        weights['_total_learns'] = weights.get('_total_learns', 0) + 1
        learn_signals.append(f'收益{acc.total_return:+.2f}%正 → 强化vfinal权重+{delta:.3f}')

    # 信号3: 账户亏损 → 增加不确定性权重
    if acc.total_return < -5:
        delta = lr * min(abs(acc.total_return) / 100, 0.3)
        weights['uncertainty_ambiguity'] = min(0.99, weights.get('uncertainty_ambiguity', 0.35) + delta)
        weights['boundary_deepen'] = min(0.99, weights.get('boundary_deepen', 0.5) + delta)
        weights['_total_learns'] = weights.get('_total_learns', 0) + 1
        learn_signals.append(f'亏损{acc.total_return:+.2f}% → 增加不确定性+{delta:.3f}')

    weights['_updated_at'] = datetime.now().isoformat()

    os.makedirs(os.path.dirname(weights_path), exist_ok=True)
    with open(weights_path, 'w') as f:
        json.dump(weights, f, ensure_ascii=False, indent=2)

    if learn_signals:
        for s in learn_signals:
            log(f'    📈 {s}')
    else:
        log(f'    无权重调整信号（采纳率{lesson_adopt_rate:.0%}，收益{acc.total_return:+.2f}%）')
except Exception as e:
    log(f'  ⚠️ 权重学习异常: {e}')

# ═══════════════════════════════════════════════════════════
# Phase 7: 微信推送（含真实送达检测）
# ═══════════════════════════════════════════════════════════
log('═ Phase 7/7: 微信推送 ═')

wechat_sent = False
try:
    r7 = subprocess.run(['python3', '/opt/scripts/send-wechat-report.py'],
                        capture_output=True, text=True, timeout=300)
    if r7.returncode == 0:
        # 检查 send-wechat-report.py 的输出，确认实际送达
        r7_out = (r7.stderr or '') + (r7.stdout or '')
        if '✅ 微信发送成功' in r7_out or '✅ 微信发送成功' in r7_out:
            log('  微信推送 ✅')
            wechat_sent = True
        else:
            err_snippet = (r7.stderr or '')[:200]
            log(f'  ⚠️ 微信推送脚本退出码0但未确认送达')
            log(f'  stderr: {err_snippet}')
    else:
        log(f'  微信推送失败: {r7.stderr[:200]}')
except Exception as e:
    log(f'  微信推送异常: {e}')

# 如果微信推送失败，保存报告到本地供查看
if not wechat_sent and r7.returncode == 0 and r7.stdout:
    report_path = os.path.join(DATA_DIR, 'last-report.txt')
    with open(report_path, 'w') as f:
        f.write(r7.stdout)
    log(f'  📄 报告已保存到 {report_path}')

# ═══════════════════════════════════════════════════════════
# 完成
# ═══════════════════════════════════════════════════════════
print()
print('=' * 70)
print(f'  🤖 全自动交易流水线完成 — {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
print(f'  总资产: ¥{acc.total_equity:,.2f}  |  收益: {acc.total_return:+.2f}%')
print(f'  今日操作: {len(execution_log["trades"])}笔')
print(f'  微信推送: {"✅" if wechat_sent else "❌"}')
print('=' * 70)

log('流水线完成 ✅')
