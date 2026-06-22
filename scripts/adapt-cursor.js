#!/usr/bin/env node
/**
 * Ponder → Cursor 适配脚本
 * 生成 .cursor/rules/ 目录下的 .mdc 规则文件
 *
 * 用法: node scripts/adapt-cursor.js [--output <目录>]
 * 默认输出: adapters/cursor/*.mdc + adapters/cursor/modes.json
 *
 * 生成的文件是工具无关的适配层 — 用户自行决定是否复制到 .cursor/
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const PLUGIN_NAME = 'ponder-skill';
const OUTPUT_BASE = process.argv.includes('--output')
    ? path.resolve(process.argv[process.argv.indexOf('--output') + 1])
    : path.join(process.cwd(), 'adapters', 'cursor');
const RULES_DIR = path.join(OUTPUT_BASE, 'rules');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function writeFile(file, content) { fs.writeFileSync(file, content, 'utf-8'); console.log('  ✓ ' + path.relative(process.cwd(), file)); }

function detectPluginPath() {
    const candidates = [
        path.join(os.homedir(), '.claude', 'plugins', 'cache', 'luke'),
        path.join(os.homedir(), '.cursor', 'plugins', 'ponder'),
        process.cwd(),
    ];
    for (const c of candidates) {
        if (fs.existsSync(path.join(c, 'SKILL.md')) || fs.existsSync(path.join(c, 'scripts', 'mcts.js'))) {
            return c;
        }
    }
    return process.cwd();
}

function generate() {
    const pluginPath = detectPluginPath();
    ensureDir(RULES_DIR);

    // 00-core.mdc — always apply
    writeFile(path.join(RULES_DIR, '00-core.mdc'), `---
description: "Ponder core rules — always active"
alwaysApply: true
---

## 绝对规则

1. 不准跳过步骤。采访→发散→方案→推演→辩论→综合→验证。
2. 不准无数据做判断。每结论必须有数据来源。
3. 不准替用户做决定。有分支用 AskUserQuestion 问用户。
4. 所有问题必须用带选项的 AskUserQuestion。
5. 最终结论必须清晰。不清晰就深度循环。

输出过滤器:
- 不含步骤过程、验证表、评分数字
- 不含 Bash 输出、JSON、专有术语
`);

    // 01-interview.mdc
    writeFile(path.join(RULES_DIR, '01-interview.mdc'), `---
description: "Ponder interview — requirement refinement"
alwaysApply: false
---

## 采访阶段

用 AskUserQuestion 一次一问, 覆盖天时/地利/人和/法/本质。

完成标准: 画像清晰 (is_clear=true)。不清晰→继续追问, 无上限。

CLI: \`node ${pluginPath}/scripts/mcts.js template interview-script\`
`);

    // 02-divergence.mdc
    writeFile(path.join(RULES_DIR, '02-divergence.mdc'), `---
description: "Ponder divergence — 神思 + 六视 + 八卦镜"
alwaysApply: false
---

## 发散阶段

三步, 强制:

1. 神思 — 打破框架
   先虚静(清空预设)→神凝(凝聚注意力)→神游(无目的漫游)→意象(浮现)→言意(带回)
   外部锚点: \`node ${pluginPath}/scripts/mcts.js compute random-anchor\`
   详细: \`${pluginPath}/engine/mcts-diverge.md\`

2. 六视 — 6种尺度系统审视 (强制)
   鲲鹏之视(全局) / 蜩鸠之视(微观) / 朝菌之视(时间压缩)
   冥灵之视(时间膨胀) / 列子御风(顺势) / 至人无己(去自我)

3. 八卦镜 — 8个维度交叉检查
   F1驱动力/F2基础/F3变化/F4渗透/F5风险/F6依赖/F7边界/F8平衡
`);

    // 03-plans.mdc
    writeFile(path.join(RULES_DIR, '03-plans.mdc'), `---
description: "Ponder plans — solution generation"
alwaysApply: false
---

## 方案生成阶段

基于发散阶段的发现, 生成 5-8 个有实质差异的方案。
标注每个方案的依据(来源)和适用条件。
`);

    // 04-simulation.mdc
    writeFile(path.join(RULES_DIR, '04-simulation.mdc'), `---
description: "Ponder simulation — 推演 + MCTS"
alwaysApply: false
---

## 推演阶段

对每个方案独立走一遍后果模拟:

- 可行性: 给定条件下能否行得通
- 反事实: 关键条件不满足会怎样
- 长期: 二阶和三阶效应

输出: 人脑可模拟的推理, 不带 V/σ² 数值。
`);

    // 05-synthesis.mdc
    writeFile(path.join(RULES_DIR, '05-synthesis.mdc'), `---
description: "Ponder synthesis — 辩论 + 综合 + 验证"
alwaysApply: false
---

## 收敛阶段

1. 辩论 — 比较方案间的分歧点
2. 综合 — 把分歧收拢成结论
3. 验证 — 验证结论可靠性

输出: 推荐 + 理由 + 风险。不带步骤过程。
`);

    // 06-memory.mdc
    writeFile(path.join(RULES_DIR, '06-memory.mdc'), `---
description: "Ponder memory — MMA recall & store"
alwaysApply: false
---

## 记忆阶段

\`\`\`bash
# 召回(启动时): 加载历史经验
node ${pluginPath}/scripts/mcts.js mma recall '{"tags":["<关键词>"],"limit":5}'

# 存储(每次决策后): 保存结果和洞察
node ${pluginPath}/scripts/mcts.js mma remember '{"description":"...","tags":["..."],"source":"execution_result"}'

# 收尾(会话结束): 巩固记忆
node ${pluginPath}/scripts/mcts.js mma finalize '{"points":["<IDs>"]}'
\`\`\`
`);

    // 07-depth-loop.mdc
    writeFile(path.join(RULES_DIR, '07-depth-loop.mdc'), `---
description: "Ponder deep loop — clarity enforcement"
alwaysApply: true
---

## 深度循环

任何步骤做完后不清晰 → 不能跳到下一步。

循环规则:
1. 为什么不清晰? (缺数据/缺方向/不够深)
2. 缺数据→搜索→重做
3. 缺方向→问用户→重做
4. 不够深→缩小范围挖→重做
5. 没有轮数上限, 清为止
`);

    // modes.json
    const modesPath = path.join(OUTPUT_BASE, 'modes.json');
    const modes = {
        modes: [
            {
                name: "Ponder",
                description: "深度分析模式 — 先拆解需求, 再发散/推演/综合。用 Node.js CLI 辅助决策。",
                model: "claude-sonnet-4-20250514",
                systemPrompt: [
                    "# Ponder — 结构化推理框架",
                    "",
                    "执行流程:",
                    "1. 采访 (需求拆解, AskUserQuestion)",
                    "2. 发散 (神思→六视→八卦镜)",
                    "3. 方案 (生成5-8个方向)",
                    "4. 推演 (模拟各方案后果)",
                    "5. 辩论+综合+验证 (收拢成结论)",
                    "",
                    "贯穿全程: 深度循环 — 不清不推进",
                    "输出: 不带步骤细节, 只出结论+理由+风险",
                    "",
                    `CLI路径: ${pluginPath}/scripts/`,
                ].join('\n'),
                tools: ["agent"],
            }
        ]
    };
    writeFile(modesPath, JSON.stringify(modes, null, 2));

    // 输出汇总
    console.log(`\n✅ 已生成 ${OUTPUT_BASE}/ (7个规则文件 + modes.json)`);
    console.log('\n使用方式:');
    console.log(`  复制到 .cursor/:  cp -r ${OUTPUT_BASE}/* .cursor/`);
    console.log('  Cursor → Settings → Rules → Add Remote Rule');
    console.log(`  自定义路径: node scripts/adapt-cursor.js --output /your/path`);
    console.log(`\n插件路径: ${pluginPath}`);
}

generate();
