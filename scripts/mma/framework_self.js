#!/usr/bin/env node
/**
 * framework_self.js — 框架自我状态模块
 *
 * 存框架自己的跨会话状态（区别于 user_profile.js 存用户的画像）。
 * 存：立场记忆 + 推理模式记忆 + 触发记忆 + 自我叙事
 *
 * 被四个地方调用：
 *   信号过滤层 — 读取 trigger_memory 和 pattern_memory
 *   9步管线(神思) — 读取 stance_memory 注入前提审视
 *   结果学习层 — 更新 stance_memory / pattern_memory / self_narrative
 *   二阶观察 — 读取 pattern_memory 对比推理模式变化
 *
 * 用法:
 *   const self = require('./framework_self');
 *   const state = self.load();                          // 加载当前状态
 *   self.recordStance(sessionId, type, stance, grounds); // 记录一次立场
 *   self.recordOutcome(sessionId, outcome, reason);      // 记录判断结果
 *   self.recordPattern(patternType, constraint);         // 记录推理模式
 *   self.getSelfNarrative();                             // 获取当前叙事
 *
 * 存储: ~/.claude/data/skills/ponder/framework-self.json
 * 不存用户画像（那是 user_profile.js 的活），只存框架自己的判断历史。
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

// ── 存储路径 ──
const DATA_DIR = process.env.PONDER_DATA_DIR
  ? path.resolve(process.env.PONDER_DATA_DIR)
  : path.join(os.homedir(), '.claude', 'data', 'skills', 'ponder');
const SELF_FILE = path.join(DATA_DIR, 'framework-self.json');

// ── 默认状态 ──
const DEFAULT_STATE = {
  version: '1.0.0',
  created_at: new Date().toISOString(),
  updated_at: null,
  stance_memory: [],
  pattern_memory: [],
  trigger_memory: [],
  self_narrative: '',
};

// ── 最大记忆数（防无限膨胀）──
const MAX_STANCE_MEMORY = 50;
const MAX_PATTERN_MEMORY = 20;
const MAX_TRIGGER_MEMORY = 30;

// ══════════════════════════════════════
//  加载框架自我状态
// ══════════════════════════════════════
function load() {
  try {
    if (!fs.existsSync(SELF_FILE)) {
      return { ...DEFAULT_STATE };
    }
    const raw = fs.readFileSync(SELF_FILE, 'utf-8');
    const state = JSON.parse(raw);
    // 确保所有字段存在
    return {
      ...DEFAULT_STATE,
      ...state,
      stance_memory: state.stance_memory || [],
      pattern_memory: state.pattern_memory || [],
      trigger_memory: state.trigger_memory || [],
      self_narrative: state.self_narrative || '',
    };
  } catch (e) {
    return { ...DEFAULT_STATE, _load_error: e.message };
  }
}

// ══════════════════════════════════════
//  保存（原子写入 tmp → rename）
// ══════════════════════════════════════
function save(state) {
  state.updated_at = new Date().toISOString();
  const tmp = SELF_FILE + '.tmp';
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmp, SELF_FILE);
    return true;
  } catch (e) {
    return false;
  }
}

// ══════════════════════════════════════
//  记录一次立场（推理进行时调用）
//  参数:
//    sessionId   — 本次推理的 session ID
//    questionType — 问题类型（如 "投资决策"、"职业选择"）
//    stance       — 框架倾向什么（如 "倾向方案B"）
//    grounds      — 倾向的依据（引用哪步哪个产出）
// ══════════════════════════════════════
function recordStance(sessionId, questionType, stance, grounds) {
  const state = load();
  state.stance_memory.push({
    session_id: sessionId,
    question_type: questionType,
    stance: stance,
    grounds: grounds,
    outcome: 'pending',
    falsified_by: null,
    timestamp: new Date().toISOString(),
  });

  // 裁剪旧记忆
  if (state.stance_memory.length > MAX_STANCE_MEMORY) {
    state.stance_memory = state.stance_memory.slice(-MAX_STANCE_MEMORY);
  }

  save(state);
  return state.stance_memory.length;
}

// ══════════════════════════════════════
//  记录判断结果（执行结果回流后调用）
//  参数:
//    sessionId    — 与 recordStance 相同的 session ID
//    outcome      — "validated" | "falsified" | "pending"
//    falsifiedBy  — 若被证伪，是什么证据证伪的
//  返回: { updated, narrative_updated }
// ══════════════════════════════════════
function recordOutcome(sessionId, outcome, falsifiedBy) {
  const state = load();
  let updated = false;

  // 找到对应的立场记录
  const entry = state.stance_memory.find(
    s => s.session_id === sessionId && s.outcome === 'pending'
  );
  if (entry) {
    entry.outcome = outcome;
    if (outcome === 'falsified' && falsifiedBy) {
      entry.falsified_by = falsifiedBy;
    }
    updated = true;
  }

  // 若被证伪，更新 trigger_memory
  if (outcome === 'falsified' && entry) {
    const signalPattern = `${entry.question_type}:${entry.stance}`;
    const existing = state.trigger_memory.find(
      t => t.signal_pattern === signalPattern
    );
    if (existing) {
      existing.times_observed += 1;
      existing.alert_level =
        existing.times_observed >= 3 ? 'high' :
        existing.times_observed >= 2 ? 'medium' : 'low';
    } else {
      state.trigger_memory.push({
        signal_pattern: signalPattern,
        falsified_stance: entry.stance,
        times_observed: 1,
        alert_level: 'low',
        last_falsified_by: falsifiedBy,
        last_timestamp: new Date().toISOString(),
      });
    }

    if (state.trigger_memory.length > MAX_TRIGGER_MEMORY) {
      state.trigger_memory = state.trigger_memory.slice(-MAX_TRIGGER_MEMORY);
    }
  }

  // 更新 self_narrative
  let narrativeUpdated = false;
  if (outcome === 'validated' || outcome === 'falsified') {
    const summary = buildNarrativeSummary(state);
    if (summary !== state.self_narrative) {
      state.self_narrative = summary;
      narrativeUpdated = true;
    }
  }

  save(state);
  return { updated, narrativeUpdated, total: state.stance_memory.length };
}

// ══════════════════════════════════════
//  记录推理模式（单次推理的二阶观察或多次翻车后）
//  参数:
//    patternType — "跳太快" | "回避矛盾" | "锚定惯性" | "过度发散" | 其他模式名
//    constraint  — "下次同类问题在X步加Y检查点"
//    severity    — "occasional" | "recurring" | "systemic"
// ══════════════════════════════════════
function recordPattern(patternType, constraint, severity) {
  const state = load();
  const existing = state.pattern_memory.find(
    p => p.pattern_type === patternType
  );

  if (existing) {
    // 如果严重度升级，更新
    const severityOrder = { occasional: 0, recurring: 1, systemic: 2 };
    if (severityOrder[severity] > severityOrder[existing.severity]) {
      existing.severity = severity;
      existing.constraint = constraint;
    }
    existing.observed_in_sessions.push(new Date().toISOString());
    // 裁剪 session 记录
    if (existing.observed_in_sessions.length > 20) {
      existing.observed_in_sessions = existing.observed_in_sessions.slice(-20);
    }
  } else {
    state.pattern_memory.push({
      pattern_type: patternType,
      observed_in_sessions: [new Date().toISOString()],
      severity: severity || 'occasional',
      constraint: constraint || '',
    });
  }

  if (state.pattern_memory.length > MAX_PATTERN_MEMORY) {
    state.pattern_memory = state.pattern_memory.slice(-MAX_PATTERN_MEMORY);
  }

  save(state);
  return state.pattern_memory.length;
}

// ══════════════════════════════════════
//  构建自我叙事（自然语言，可读）
// ══════════════════════════════════════
function buildNarrativeSummary(state) {
  const validated = state.stance_memory.filter(s => s.outcome === 'validated');
  const falsified = state.stance_memory.filter(s => s.outcome === 'falsified');
  const pending = state.stance_memory.filter(s => s.outcome === 'pending');

  if (state.stance_memory.length === 0) {
    return '尚无历史判断。';
  }

  const total = state.stance_memory.length;
  const accuracy = total > 0
    ? Math.round((validated.length / (validated.length + falsified.length || 1)) * 100)
    : 0;

  let narrative = `共做了 ${total} 次判断，`;

  if (validated.length + falsified.length > 0) {
    narrative += `其中 ${validated.length} 次被验证(${accuracy}%准确率)，${falsified.length} 次被证伪。`;
  }

  if (falsified.length > 0) {
    const byType = {};
    for (const f of falsified) {
      const t = f.question_type || '未知类型';
      if (!byType[t]) byType[t] = [];
      byType[t].push(f);
    }
    narrative += ` 主要翻车领域：`;
    for (const [type, entries] of Object.entries(byType)) {
      narrative += `「${type}」(${entries.length}次)，`;
    }
    narrative = narrative.slice(0, -1) + '。';
  }

  const systemic = state.pattern_memory.filter(p => p.severity === 'systemic');
  if (systemic.length > 0) {
    narrative += ` 系统性推理惯性：${systemic.map(p => p.pattern_type).join('、')}。`;
  }

  if (pending.length > 0) {
    narrative += ` ${pending.length} 次判断待验证。`;
  }

  return narrative;
}

// ══════════════════════════════════════
//  获取自我叙事（外部便捷调用）
// ══════════════════════════════════════
function getSelfNarrative() {
  return load().self_narrative || '尚无自我叙事。';
}

// ══════════════════════════════════════
//  查某类问题的历史立场（供信号过滤/神思）
//  参数:
//    questionType — 问题类型
//    limit        — 返回条数（默认5）
//  返回: 按时间倒序的立场记录
// ══════════════════════════════════════
function queryStanceHistory(questionType, limit) {
  const state = load();
  const max = limit || 5;
  return state.stance_memory
    .filter(s => s.question_type === questionType)
    .slice(-max)
    .reverse();
}

// ══════════════════════════════════════
//  查触发记忆（供信号过滤层判断信号是否值得触发）
//  参数:
//    signalPattern — 信号模式描述
//  返回: 匹配的 trigger_memory 条目，无匹配返回 null
// ══════════════════════════════════════
function queryTriggerMemory(signalPattern) {
  const state = load();
  // 模糊匹配：信号描述包含 trigger_memory 的 signal_pattern
  for (const t of state.trigger_memory) {
    if (signalPattern.includes(t.signal_pattern) ||
        t.signal_pattern.includes(signalPattern)) {
      return t;
    }
  }
  return null;
}

// ══════════════════════════════════════
//  获取所有已知推理模式（供二阶观察）
// ══════════════════════════════════════
function getPatterns() {
  return load().pattern_memory;
}

// ══════════════════════════════════════
//  CLI
// ══════════════════════════════════════
function cli() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'narrative') {
    console.log(getSelfNarrative());
  } else if (cmd === 'history') {
    const history = queryStanceHistory(args[1] || '', parseInt(args[2]) || 5);
    console.log(JSON.stringify(history, null, 2));
  } else if (cmd === 'triggers') {
    const t = queryTriggerMemory(args[1] || '');
    console.log(JSON.stringify(t, null, 2));
  } else if (cmd === 'patterns') {
    console.log(JSON.stringify(getPatterns(), null, 2));
  } else if (cmd === 'summary') {
    const state = load();
    console.log(`立场记忆: ${state.stance_memory.length} 条`);
    console.log(`  validated: ${state.stance_memory.filter(s => s.outcome === 'validated').length}`);
    console.log(`  falsified: ${state.stance_memory.filter(s => s.outcome === 'falsified').length}`);
    console.log(`  pending: ${state.stance_memory.filter(s => s.outcome === 'pending').length}`);
    console.log(`模式记忆: ${state.pattern_memory.length} 条`);
    console.log(`触发记忆: ${state.trigger_memory.length} 条`);
    console.log(`叙事: ${state.self_narrative || '(空)'}`);
  } else {
    console.log('用法:');
    console.log('  node scripts/mma/framework_self.js narrative         — 查看自我叙事');
    console.log('  node scripts/mma/framework_self.js history <type>     — 查某类问题的立场历史');
    console.log('  node scripts/mma/framework_self.js triggers <pattern> — 查触发记忆');
    console.log('  node scripts/mma/framework_self.js patterns           — 查推理模式');
    console.log('  node scripts/mma/framework_self.js summary            — 总览');
  }
}

if (require.main === module) cli();

module.exports = {
  load,
  save,
  recordStance,
  recordOutcome,
  recordPattern,
  getSelfNarrative,
  queryStanceHistory,
  queryTriggerMemory,
  getPatterns,
};
