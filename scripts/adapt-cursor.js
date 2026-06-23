#!/usr/bin/env node
/**
 * Ponder → Cursor 适配脚本
 * 生成 .cursor/rules/ 目录下的 .mdc 规则文件
 *
 * 用法: node scripts/adapt-cursor.js [--output <目录>]
 * 默认输出: adapters/cursor/*.mdc + adapters/cursor/modes.json
 */
const fs = require('fs');
const path = require('path');

const OUTPUT_BASE = process.argv.includes('--output')
    ? path.resolve(process.argv[process.argv.indexOf('--output') + 1])
    : path.join(process.cwd(), 'adapters', 'cursor');
const RULES_DIR = path.join(OUTPUT_BASE, 'rules');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function writeFile(file, content) { fs.writeFileSync(file, content, 'utf-8'); console.log('  ✓ ' + path.relative(process.cwd(), file)); }

function generate() {
    ensureDir(RULES_DIR);

    writeFile(path.join(RULES_DIR, '00-core.mdc'), `---
description: "Ponder core rules"
alwaysApply: true
---

1. 不准跳过任何阶段：需求打磨→神思→发散→八卦镜→方案→方案评分→收敛→推演→辩论→用户确认→综合
2. 不准无数据做判断
3. 不准替用户做决定，用 AskUserQuestion 带选项
4. 输出不出框架术语（神思/六视/八卦镜/V值/σ²/UCB）
5. 输出不出 JSON、路径、Bash 命令
6. 不出"正在等待"、"让我检查"等状态消息
`);

    writeFile(path.join(RULES_DIR, '01-interview.mdc'), `---
description: "Ponder 需求打磨"
alwaysApply: false
---

用 AskUserQuestion 一次一问，覆盖天时/地利/人和/法/本质。
完成后用一两句话总结用户需求。
`);

    writeFile(path.join(RULES_DIR, '02-divergence.mdc'), `---
description: "Ponder 神思 + 发散 + 八卦镜"
alwaysApply: false
---

## 神思
五步法（内部用）：虚静→神凝→神游→意象→言意。直接出反直觉发现，不输出思考过程。

## 发散
6视角：宏观全局 / 微观细节 / 时间压缩 / 时间扩展 / 顺其自然 / 无我
每个视角：洞察 + 数据来源 + 假设

## 八卦镜（找盲点）
8维度盲点发现：驱动力/基础/变化/渗透/风险/依附/边界/平衡
表格展示盲点，不评分。
`);

    writeFile(path.join(RULES_DIR, '03-plans.mdc'), `---
description: "Ponder 方案 + 评分 + 收敛"
alwaysApply: false
---

## 方案
5-10个有本质差异的方案。对比表格（名称/方向/核心逻辑）。

## 方案评分
8维度评分(0-10)：可行性/基础/应变/穿透/风险/资源/边界/价值
展示各维度单项分和总分。

## 收敛
依评分保留最优3-5个，展示幸存方案及淘汰理由。
`);

    writeFile(path.join(RULES_DIR, '04-simulation.mdc'), `---
description: "Ponder 推演"
alwaysApply: false
---

## 推演
对每个幸存方案独立模拟。逐步步推演，每步基于上一步结果推理。
展示推演结果表格，💡关键发现单独写一段。
`);

    writeFile(path.join(RULES_DIR, '05-synthesis.mdc'), `---
description: "Ponder 辩论 + 确认 + 结论"
alwaysApply: false
---

## 辩论
1. 每方案立论 → 2. 每方案承受其他方案攻击 → 3. 抗压排名

## 用户确认
出推荐方案后，检查遗留盲点/风险，用 AskUserQuestion 让用户确认。

## 结论
🏆 推荐方案 → 核心判断 → 风险应对 → 待确认事项
`);

    writeFile(path.join(RULES_DIR, '06-memory.mdc'), `---
description: "Ponder memory"
alwaysApply: false
---

每步执行后产出自动存入 MMA。下次同类问题自动调取 top3 历史注入 prompt。

手动操作:
node <插件路径>/scripts/orchestrate.js history <步骤名> <问题类型>
node <插件路径>/scripts/orchestrate.js step <步骤名> <问题类型> '<产出JSON>'
node <插件路径>/scripts/orchestrate.js finalize <问题类型> <问题描述>
`);

    writeFile(path.join(RULES_DIR, '07-quality.mdc'), `---
description: "Ponder output quality"
alwaysApply: true
---

- 框架术语、JSON、路径、Bash 一律不出现在输出中
- 评分和对比用表格，配总结文字
- 每段至少 2-3 句
- ⭐ 亮点 / 💡 发现 / ⚠️ 风险 / ✅ 结论 / 🏆 推荐
`);

    // modes.json
    const modes = {
        modes: [{
            name: "Ponder",
            description: "结构化分析：需求打磨→神思→发散→盲点发现→方案→评分→收敛→推演→辩论→确认→结论",
            model: "claude-sonnet-4-20250514",
            systemPrompt: "Ponder 结构化分析框架\n\n流程:\n1. 需求打磨(AskUserQuestion)\n2. 神思(跳出常规)\n3. 发散(6视角)\n4. 八卦镜(8维盲点)\n5. 方案(5-10个)\n6. 方案评分(8维评分)\n7. 收敛(依评分保留)\n8. 推演(模拟)\n9. 辩论(立论+围攻+抗压)\n10. 用户确认(遗留盲点)\n11. 综合结论",
            tools: ["agent"],
        }]
    };
    writeFile(path.join(OUTPUT_BASE, 'modes.json'), JSON.stringify(modes, null, 2));

    console.log(`\n✅ 已生成 ${OUTPUT_BASE}/ (8个规则文件 + modes.json)`);
    console.log(`\n使用: cp -r ${OUTPUT_BASE}/* .cursor/`);
}

generate();
