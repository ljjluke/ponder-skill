# Changelog

## 1.6.0 (2026-06-12)

### Major — 记忆引擎仿脑化 (Brain-Inspired Memory)
- **情景记忆 vs 语义记忆**: 穴位新增 `memory_type` 字段(episodic/semantic)。情景记忆衰减快(60d)、语义记忆衰减慢(90d)。编码特异性: 情景记忆匹配当前 task_type 时得气分数×1.15
- **记忆再巩固 (Reconsolidation)**: 得气召回后穴位进入30分钟"不稳定窗口"，窗口内TD更新可塑性×1.5，巩固分+3。"温故而知新"的神经基础
- **源监控 (Source Monitoring)**: 7级来源可靠性(亲历1.0→传闻0.2)。`source` 字段激活，得气计分时可靠源×1.1、不可靠源×0.7
- **精细加工深度**: 4级评估(浅/中/深/最深)→影响初始巩固分(+0~+6)。"格物致知"的层次映射

### Added
- `scripts/mcts_guard.js` — 9引擎合规守卫: 反唯一方案/阶段强制/信息获取优先级/方案多样性/自检/MemoryAgent/合规审计/约束检查/引擎模式
- `scripts/mcts.js` — 统一CLI入口，一命令管理5子引擎(compute/guard/mma/lang/memory)
- `scripts/mma/diagnosis.js` — 八纲辨证知识诊断: 表里寒热虚实→脉象(浮沉数迟缓滑涩平)→权重调整
- `scripts/mcts_guard.js constraint-checklist` — 9项约束检查(6硬3软)，区分 auto_detect/必须问用户
- `scripts/mcts_guard.js engine-mode` — 4模式自动判定(full/quick/re-simulate/direct)
- `scripts/mma/constants.js` — 天干地支时空编码(10天干+12地支+60甲子+日干支精确算法+十二消息卦)
- `scripts/mma/constants.js` — `SOURCE_RELIABILITY` 7级源可靠性权重

### Changed
- SKILL.md: COMPRESSION-SAFE 块扩展为完整可执行框架(30行)，压缩后仍可独立运行
- SKILL.md: 新增 Compliance Guard 和 Unified CLI 入口
- 5个 engine/*.md + 2个 agents/*.md: 全部加入守卫调用点
- `ashi.js`: 新增 memory_type/source/elaboration_level/context_snapshot/reconsolidation_window 字段
- `decay.js`: 情景记忆60d衰减+源不可靠加速衰减；兼容六爻新状态(ACTIVE/MATURE)
- `deqi.js`: 得气计分加入源监控权重+编码特异性+再巩固窗口；中焦72h自动降入下焦
- `reinforce.js`: 六爻生命周期+本卦/之卦/变卦；再巩固窗口内塑性×1.5
- `ziwu.js`: 九宫飞星四级叠加+天干地支经脉增强；修复时支bug(day%12→精确日地支)
- `status.js`: 新增 `computeFourImages` 四象成熟度诊断
- `io.js`: 新增 `findPointById` 通用查找，删除 reinforce.js/cluster.js 重复代码
- `mcts_compute.js`: 奇正相生自适应UCB(0.5~2.5)+势成熟度；cull/coverage-matrix 真实实现
- `language_guard.js`: 修复 lang 截断(ha→zh)；新增 scriptToLang 映射
- `knowledge_lifecycle.js`: loadKG 解析失败加错误日志
- `meridian_memory.js`: 新增 four-images/diagnose 命令
- Version bumped 1.5.0 → 1.6.0 across all files

### Fixed
- decay.js 不兼容六爻新状态(ACTIVE/MATURE)→知识永不衰减
- language_guard.js lang="ha" vs check 期望"zh"不一致
- deqi.js searchUpperBurner 缺少 entry.point 空值保护
- ashi.js detectYinYangConflict 时间解析可能 NaN
- mcts_compute.js shouldStopIteration 空 rootNodes 崩溃
- deqi.js 中焦工作记忆无限增长
- constants.js 重复导出 KNOWLEDGE_DIMENSIONS
- deqi.js getNextHexagram 与 constants.js 重复定义
- reinforce.js 双重 require constants
- status.js 引入未使用的 TWELVE_XIAOXI
- reinforce.js/cluster.js 各有一个 findPoint 重复代码

## 1.5.0 (2026-06-10)

### Major
- **MMA Meridian Memory Algorithm**: 12 meridians + 8 extraordinary vessels acupoint-based knowledge storage. Deqi recall, Ziwu Liuzhu context triggering, Propagated Sensation spreading activation. Inspired by Yellow Emperor's Inner Canon (《黄帝内经》).
- **Memory Agent (Sub-Agent)**: Silent observer running 5 auto-checkpoints alongside the decision engine. Court Historian dual role (records speech + records deeds) + Remonstrance Official (alerts on contradictions). `agents/memory-agent.md`
- **7 Cognitive Optimizations**: Emotion Modulator (七情→consolidation boost), Triple Burner Working Memory (三焦气化 7±2 chunks), Hidden Acupoint (隐穴 not delete), Meridian Priming (经气预热 +0.15), Yin-Yang Conflict Detection (阴阳对冲→DISPUTED), Sleep Replay (睡眠回放 consolidation), Acupoint Clusters (腧穴集群 auto-chunking)

### Added
- `scripts/meridian_memory.js` — MMA engine CLI with `observe` unified command for all 5 checkpoints
- `scripts/mma/` — Modular architecture: constants, io, ziwu, deqi, ashi, reinforce, decay, cluster, status (9 modules)
- `agents/memory-agent.md` — Memory Agent behavior definition (English, matching core engine language)
- UPGRADE section in README.md and README_CN.md

### Changed
- SKILL.md: MEMORY PROTOCOL upgraded to MEMORY AGENT LIFECYCLE with 5 observation checkpoints
- SKILL.md: Engine File Index updated with Memory Agent and MMA Engine entries
- README.md & README_CN.md: Human-like Memory section → MMA Meridian Memory System
- README.md & README_CN.md: Architecture diagram now includes Memory Agent layer
- Version bumped 1.4.0 → 1.5.0 across all files

### Removed
- `policies/code-task-policy.md` — merged into task-policy.md
- `deploy/` directory — removed all other-platform deployment references
- `scripts/install.sh` — install only via `/plugin marketplace add`

## 1.4.0 (2026-06-08)

### Major
- **Eight-Facet Mirror (Bagua)**: Universal decision framework replacing hardcoded 6-dimension tech-only map. All domains supported via `\p{Script=...}` Unicode detection.
- **Language Adaptation Layer**: LLM-native language detection + `language_guard.js` safety net. Any language, no hardcoded lists.
- **Diverge × Converge**: Diverge phase (brainstorming with 4 engagement checkpoints) → Converge phase (cluster→complete→cull→crystallize → exactly 3 solutions).
- **Full Node.js**: All scripts rewritten from Python to pure JavaScript. Zero environment dependencies.

### Changes
- `engine/mcts-diverge.md`: Eight-Facet Mirror replaces 6-dimension tech map. Conversational grill-the-user flow.
- `engine/mcts-simulate.md`: 5-level knowledge acquisition protocol (Diverge Handoff → Memory → Web → Ask → Assume).
- `engine/mcts-converge.md`: Ranking by converged V + self-check + blindspot audit + TD update.
- `engine/td-learner.md`: COMPRESSION-SAFE RULES added.
- `scripts/mcts_compute.js`: 16 CLI commands, pure JS.
- `scripts/knowledge_lifecycle.js`: L-GCMS gate filtering + tiered storage + forgetting curve.
- `scripts/language_guard.js`: Unicode Script property detection, no hardcoded ranges.
- `agents/mcts-decider.md`: Rewritten with phased output + constraint collection + 5-level triage.
- Deleted: `rules/RULES.md`, `engine/mcts-core.md`, all `.py` files.

---

## 1.3.0 (2026-06-04)

### Fixes
- memory/.gitignore path error
- manage_memory.py data loss path
- Knowledge state machine inconsistency (SLEEPING/ARCHIVED transitions)
- UCB formula hardcoded denominator (√(σ²/1) → √(σ²/n_i))
- Merged duplicate code-task-policy.md into task-policy.md
- CHANGELOG version sync

### Changes
- policies/task-policy.md: Added n_i explanation in UCB formula

---

## 1.1.1 (2026-06-03)

### Added
- Simulation result self-check (Step 3.5): pre-execution vulnerability finding + reverse thinking + risk assessment
- Skip mechanism: user can stop simulation at any stage
- Fuse mechanism: accuracy tracking, auto-degrade below 70%

### Optimized
- Trigger detection: from "specific types only" to "detect multiple approaches in any task"
- Removed duplicate trigger rules chapter

### Changed
- Knowledge recall algorithm rewrite: "multi-path parallel recall" → "associative recall + fragment completion + external verification"
- Memory tiered storage: active (current consciousness) + archive (long-term memory)

---

## 1.1.0 (2026-06-03)

### Added
- agents/openai.yaml
- agents/mcts-decider.md
- Plugin marketplace support (.claude-plugin/plugin.json + marketplace.json)
- Project restructured to plugin format

### Optimized
- README rewritten for general audience
- Removed third-party project references

---

## 1.0.0 (2026-06-03)

### Initial Release
- MCTS-TD Planner Skill core framework
- Multi-solution independent simulation decision engine
- Knowledge graph value function management
- Cross-session continuous learning