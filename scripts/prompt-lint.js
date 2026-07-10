#!/usr/bin/env node
/**
 * prompt-lint.js — 引擎文档引用完整性校验
 *
 * 检测:
 *   1. 哪些 engine/*.md 存在但未被任何 prompt 的 engine_ref 引用
 *   2. 哪些 prompt 的 engine_ref 指向了不存在的文档
 *   3. 哪些 engine 文档仅被 SKILL.md 引用但未被 prompt 引用
 *
 * 用法:
 *   node scripts/prompt-lint.js          — 完整检查
 *   node scripts/prompt-lint.js --fix    — 检查并给出修复建议
 *   node scripts/prompt-lint.js --json   — JSON 输出
 */

const fs = require('fs');
const path = require('path');

const ENGINE_DIR = path.join(__dirname, '..', 'engine');
const PROMPTS_DIR = path.join(__dirname, 'prompts');
const SKILL_FILE = path.join(__dirname, '..', 'SKILL.md');

// 预期不被 prompt 引用的文档(审计文档本身、内部参考文档)
const EXEMPT_DOCS = [
  'multi-discipline-audit.md',  // 多学科审计文档，自身是审计工具
  'td-learner.md',              // 旧 MCTS pipeline 核心引擎，当前 SKILL.md 管线不再直接调用
];

function getEngineDocs() {
  return fs.readdirSync(ENGINE_DIR).filter(f => f.endsWith('.md')).sort();
}

function getPromptFiles() {
  return fs.readdirSync(PROMPTS_DIR).filter(f => f.endsWith('.json')).sort();
}

function getPromptRefs(promptFile) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(PROMPTS_DIR, promptFile), 'utf-8'));
    let refs = d.engine_ref || [];
    if (typeof refs === 'string') refs = [refs];
    return refs;
  } catch (e) {
    return [];
  }
}

function getSkillRefs() {
  if (!fs.existsSync(SKILL_FILE)) return new Set();
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  const docs = getEngineDocs();
  const refs = new Set();
  for (const doc of docs) {
    if (content.includes('engine/' + doc)) refs.add(doc);
  }
  return refs;
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const fixMode = args.includes('--fix');

  const engineDocs = getEngineDocs();
  const promptFiles = getPromptFiles();
  const skillRefs = getSkillRefs();

  // 收集所有 prompt 引用
  const allPromptRefs = new Set();
  const promptRefMap = {};
  for (const pf of promptFiles) {
    const refs = getPromptRefs(pf);
    promptRefMap[pf] = refs;
    for (const r of refs) {
      const docName = path.basename(r);
      allPromptRefs.add(docName);
    }
  }

  // 问题1: 存在但未被引用的 engine 文档
  const unreferenced = engineDocs.filter(d => !allPromptRefs.has(d) && !EXEMPT_DOCS.includes(d));

  // 问题2: prompt 引用不存在的文档
  const brokenRefs = [];
  for (const pf of promptFiles) {
    for (const r of promptRefMap[pf]) {
      const docName = path.basename(r);
      if (!engineDocs.includes(docName)) {
        brokenRefs.push({ prompt: pf, ref: r });
      }
    }
  }

  // 问题3: 仅被 SKILL.md 引用但未被任何 prompt 引用
  const skillOnly = engineDocs.filter(d => skillRefs.has(d) && !allPromptRefs.has(d) && !EXEMPT_DOCS.includes(d));

  if (jsonMode) {
    console.log(JSON.stringify({
      unreferenced_docs: unreferenced,
      broken_refs: brokenRefs,
      skill_only_docs: skillOnly,
      exempt: EXEMPT_DOCS,
      total_engine_docs: engineDocs.length,
      referenced_in_prompts: engineDocs.length - unreferenced.length - EXEMPT_DOCS.length,
    }, null, 2));
    return;
  }

  console.log('=== Ponder 引擎文档引用完整性报告 ===\n');

  // 统计
  console.log('引擎文档总数: ' + engineDocs.length);
  console.log('Prompt 文件数: ' + promptFiles.length);
  console.log('被 prompt 引用: ' + (engineDocs.length - unreferenced.length - EXEMPT_DOCS.length) + ' 个');
  console.log('豁免文档:     ' + EXEMPT_DOCS.length + ' 个 (审计/内部参考)');
  console.log('');

  if (unreferenced.length > 0) {
    console.log('⚠️  未被任何 prompt 的 engine_ref 引用的文档:');
    for (const d of unreferenced) {
      const skillNote = skillRefs.has(d) ? ' [仅被 SKILL.md 引用]' : '';
      console.log('   engine/' + d + skillNote);
    }
    console.log('');
  } else {
    console.log('✅ 所有引擎文档都被 prompt 引用了\n');
  }

  if (brokenRefs.length > 0) {
    console.log('❌ 引用了不存在的文档:');
    for (const b of brokenRefs) {
      console.log('   ' + b.prompt + ' → ' + b.ref + ' (不存在!)');
    }
    console.log('');
  } else {
    console.log('✅ 没有引用不存在文档的情况\n');
  }

  if (skillOnly.length > 0) {
    console.log('💡 仅被 SKILL.md 引用但未被 prompt 引用的文档:');
    for (const d of skillOnly) {
      console.log('   engine/' + d);
    }
    console.log('   建议: 将其加入相应 prompt 的 engine_ref 数组\n');
  }

  // 总结
  const totalIssues = unreferenced.length + brokenRefs.length + skillOnly.length;
  if (totalIssues === 0) {
    console.log('🎉 引用完整性 100%');
    process.exit(0);
  } else {
    console.log('共 ' + totalIssues + ' 个问题');
    if (fixMode) {
      console.log('\n--fix 模式下，请手动将未引用文档加入对应 prompt 的 engine_ref');
      console.log('参考映射:');
      console.log('  counterfactual-thinking → debate.json');
      console.log('  dissolve-frame           → shensi.json');
      console.log('  error-pattern            → synthesis.json');
      console.log('  otherness                → synthesis.json');
      console.log('  preference-structure     → synthesis.json');
      console.log('  prospect-theory          → shensi.json');
      console.log('  socratic-ignorance       → shensi.json');
      console.log('  teleology                → plans.json');
      console.log('  transcendental-audit     → simulate.json');
      console.log('  working-stance           → converge.json, debate.json, synthesis.json');
    }
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { getEngineDocs, getPromptFiles, getPromptRefs };
