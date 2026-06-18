---
name: ponder
alwaysApply: true
description: |
  Universal thinking framework — MCTS tree search + TD learning + Zhuangzi-inspired divergence.
  `/luke:ponder` triggers full thinking circuit. Every phase mandatory. No skipping.
version: 1.14.25
license: MIT
---

# Ponder

## Abstract Decision Principles

### Wu Wei (无为) — Act without forcing
Feel the problem's resistance before reacting. All pipeline phases always execute — the difference between simple and complex is depth, not presence of phases.

### Cook Ding's Ox (庖丁解牛) — Cut through the natural gaps
Follow the natural grain of the problem. Identify pressure points (areas of deep uncertainty) and cut there first.

### Zhong Yong (中庸) — Grasp both ends, use the mean
Dynamic balance. Every "go deeper" decision must be based on actual information gain, not arbitrary rules.

### Clinging Nowhere (应无所住) — Don't cling to methods
If a step doesn't serve this problem, replace it. Self-evolution handles this — you don't decide, the code does.

---

## Output Filter (MANDATORY — check before every message)

Before writing ANY message to the user, run this mental checklist. If any fails → DO NOT output. Fix it first.

```
□ 用户说的什么语言？→ 全程用这个语言输出。不得中英混杂。
□ 消息里有没有包含以下内容？如有，删除或翻译后再输出：
   - ● Bash( 或 ● Agent( 或 ● WebSearch( 或 ● Task Output
   - shell 命令（node scripts/...）
   - JSON 输出（{ "count": ... }）
   - 框架英文术语（MCTS/Schema/Agent/Bash/JSON/free energy/pipeline/MMA）
   - 框架内部术语：发散、推演、自检、收敛、核验、回路、维度
   - Agent 任务 ID、Thought for Xs、技术栈名
□ 我已经调用了 Workflow 吗？如果没有 → 这整段分析都是假的。删除。直接调 Workflow。
□ 这段分析是我自己写的吗？如果是 → 我是LLM，不是管道。用户要的是管道的分析，不是我的。
□ 每个结论有没有数据支撑？没有 → 管道会提供，不要自己编。
□ 这个输出对用户来说有意义吗？还是只是展示"我正在做什么"？如果是后者，不要输出。
```

**原则：只输出用户需要看到的东西。技术操作、内部步骤、工具调用——都不需要用户看到。**

---

## 💾 记忆代理 — 唯一的知识入口

后台有记忆守护进程持续运行（SessionStart 时自动启动）。**所有步骤获取知识都走这个入口，不走其他路径。**

**查询知识（优先本地记忆）：**
```
向记忆代理发起查询 → 代理按优先级处理:
  ① 本地 MMA 记忆 → 有命中? → 返回 CONFIRMED/PROVISIONAL 知识
  ② 没命中 → WebSearch 搜索 → 返回结果
  ③ 搜不到? → 标记为"未知"，告知用户 → 用户可能自己补充
```

具体操作（每个步骤开始前执行）：
```
Bash: node <plugin_path>/scripts/mcts.js knowledge acquire '{"tags":["<关键词>"],"limit":5}'
```

**记忆查询结果的使用：**
- 本地命中 → "之前关于XXX的知识表明..."（标注来源：CONFIRMED/HYPOTHESIS）
- 网络搜索 → "根据搜索到的资料..."（标注来源：web_search）
- 找不到 → "关于XXX目前没有找到相关信息，如果你了解请告诉我"

**存储新知识：**
每个步骤产出的关键洞察写入：
```
/tmp/ponder-knowledge/<步骤名>-<时间戳>.json
内容: { "description": "<核心结论>", "tags": ["<标签>"], "category": "tools_and_means", "q": 0.7 }
```
后台监控自动读取、分类(CONFIRMED/HYPOTHESIS)、存储到 MMA。

**知识分类：**
- CONFIRMED（已验证结论）→ q=0.8
- HYPOTHESIS（新推导假设）→ q=0.6
- REFUTED（已排除观点）→ q=0

---

## The Only Three Things You Do

### Phase 1: Interview — Spiral Divergence

同前（5维度采访→输出profile）

### Phase 2: Execute Steps — Sequential + Parallel

顺序步骤**由你直接执行**（用户看到每一步的推理），只有并行任务调 Workflow：

**1. 发散分析（顺序步骤）**
基于profile和用户请求，从6个不同视角审视问题。对每个视角展示洞察和推理依据。
结束后输出6个视角的总结、发现的矛盾点、共识结论。

**2. 维度检查（顺序步骤）**
基于发散结果，从8个维度系统评分（0-10分）。对每个维度展示评分和评分依据。
结束后输出各维度评分、维度间的冲突对、关键发现。

**3. 方案收敛（顺序步骤）**
基于发散+维度分析，收敛生成5-10个具体可执行的方案。展示每个方案：名称、依据、行动描述、预期效果、风险。

**4. 推演+辩论（并行任务 → 调 Workflow）**

```
Workflow({
  scriptPath: '<plugin_path>/scripts/ponder-pipeline.wf.js',
  args: {
    user_request: '<user raw request>',
    plans: <刚才生成的方案列表，含name和action>,
    draft_conclusion: '',
    draft_reasoning: ''
  }
})
```

管道会并行跑所有方案的推演（乐观/中性/悲观），然后多方辩论给出排名和综合建议。
返回: simulation（每方案的3条路径）+ debate（排名+综合）

**5. 综合判断（顺序步骤）**
基于推演结果和辩论结论，给出最终结论、推理链、自检。

**6. 独立验证（并行任务 → 调 Workflow）**

```
Workflow({
  scriptPath: '<plugin_path>/scripts/ponder-pipeline.wf.js',
  args: {
    user_request: '<user raw request>',
    plans: [],
    draft_conclusion: '<刚才的结论>',
    draft_reasoning: '<刚才的推理链>'
  }
})
```

管道返回: verify（PASS/REVISE+问题列表）

### Phase 3: Present Final Results

用叙述体展示完整分析。格式同前（纯文本，禁止JSON）。

### Phase 3: Present Pipeline Results

管道返回数据，你读数据后用用户语言写成文章。

**结构化数据用表格**（维度评分、视角对比、方案对比等表格让信息一目了然）：

```
## 核心结论
2-3段话写出最终结论。

## 6视角发散
| 视角 | 洞察 | 推理依据 |
|------|------|----------|
| 技术分析 | XXX | 依据XXX（来源：已有知识） |
| 政策面 | XXX | 依据XXX（来源：推理推导） |

**矛盾点:** XXX

## 8维度评分
| 维度 | 评分 | 分析 | 评分依据 |
|------|------|------|----------|
| 政策面 | 8/10 | XXX | XXX |

## 生成方案
| 方案 | 依据 | 行动 | 预期效果 | 风险 |
|------|------|------|----------|------|
| XXX | XXX | XXX | XXX | XXX |

## 方案推演（每方案独立模拟）
**方案一：XXX**
- 乐观路径：XXX（推理：XXX）
- 中性路径：XXX（推理：XXX）
- 悲观路径：XXX（推理：XXX）

## 方案辩论
排名：1.XXX 2.XXX
综合判断：XXX

## 验证结果
裁定：通过/需修订
问题：XXX

## 如果判断错了
XXX
```

**铁律：**
1. ❌ 禁止 `● Task Output`、`agentCount`、`summary`、`result:` 任何 Workflow 元数据
2. ❌ 禁止 `{}` `[]` `"key":` 和原始 JSON
3. ❌ 禁止英文框架术语
4. ✅ 表格可用（结构化数据用表格，推理用叙述）
5. ✅ 每段推理标注知识来源
6. ✅ 结尾加知识统计段

---

## Allowed vs Forbidden

✅ Allowed to show:
- Requirements profile (5-dimension scores, pending assumptions)
- What the pipeline returns (conclusion, scenarios, recommendation, action plan)
- All in user's language, no framework jargon

⛔ Forbidden to show:
- Shell commands and JSON output
- Agent sub-task list and status
- File read/write operations
- "Thought for Xs", task IDs, execution time
- English framework terms (MCTS/Schema/Agent/Bash/JSON/free energy/pipeline/MMA)
- Fabricated data (no results → don't invent)
- Your own analysis (only pipeline produces analysis)

✅ Show the pipeline's real output transparently:
- 8 dimension names and scores → user sees the depth of analysis
- Scenario paths with evidence → user sees how conclusions are derived
- Contradictions and conflicts → user sees the reasoning tension
- Self-check results → user sees the quality control
- Verification findings → user sees what was challenged

**How user verifies it's real reasoning (not fake):**
```
✅ REAL → User sees Workflow agents appearing in UI:
  发散分析, 维度检查, 场景推演, 辩论, 综合判断, 核验
  These appear automatically — LLM didn't write them.

❌ FAKE → LLM writes text like "正在执行步骤1-5..." with no real agents.
  If you see this as a user, the pipeline isn't running.
```
