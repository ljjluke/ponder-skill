/** ═══════════════════════════════════════════════════════════════
 *  记忆衰减 + 隐穴唤醒 + 睡眠回放
 *  "夜卧则血归于肝" —《素问·五脏生成》
 *  睡眠时海马体以20倍速回放白天经历，筛选重要记忆巩固到皮层
 * ═══════════════════════════════════════════════════════════════ */
const { EMOTION_CONSOLIDATION } = require('./constants');
const { hidePoint } = require('./reinforce');
const { findPointById, markDirty } = require('./io');
const { isInStatusSet } = require('./state_machine');

/**
 * 记忆衰减检查 — 久不使用则"气虚"，自动降级或隐穴
 *  情景记忆(episodic): >60天 → 隐穴 (具体经历忘得快)
 *  语义记忆(semantic): >90天 → 隐穴 (事实知识忘得慢)
 *   >30天 + CONFIRMED → SLEEPING
 *   ≤7天 + SLEEPING → 唤醒
 */
function decayCheck(kg) {
    const now = new Date();
    const decayed = [];
    for (const [key, m] of Object.entries(kg.meridians)) {
        for (let i = m.points.length - 1; i >= 0; i--) {
            const p = m.points[i];
            if (p.hidden) continue;
            const lastVerified = new Date(p.last_verified || p.created_at);
            const daysSince = (now - lastVerified) / 86400000;

            // 情景记忆衰减更快
            const hideThreshold = p.memory_type === 'episodic' ? 60 : 90;
            const baseConsolidation = p.consolidation_score || 0;
            // 源不可靠的知识衰减更快（传闻比亲历忘得快）
            const sourceDecayFactor = (p.source_reliability && p.source_reliability < 0.5) ? 0.7 : 1.0;
            const effectiveDays = daysSince / sourceDecayFactor;

            if (effectiveDays > hideThreshold && baseConsolidation <= 3 && !isInStatusSet(p.status, 'reliable')) {
                hidePoint(kg, key, p.id);
                markDirty(kg, key);
                decayed.push({ point_id: p.id, meridian: key, action: 'hide',
                    days: Math.round(daysSince), memory_type: p.memory_type, source: p.source });
            } else if (daysSince > 30 && isInStatusSet(p.status, 'decayable') && p.status !== 'SLEEPING') {
                p.status = 'SLEEPING'; p.slept_at = now.toISOString();
                markDirty(kg, key);
                decayed.push({ point_id: p.id, meridian: key, action: 'sleep', days: Math.round(daysSince) });
            } else if (daysSince <= 7 && p.status === 'SLEEPING') {
                p.status = 'PROVISIONAL'; p.awoke_at = now.toISOString();
                markDirty(kg, key);
                decayed.push({ point_id: p.id, meridian: key, action: 'awaken', days: Math.round(daysSince) });
            }
        }
    }
    return decayed;
}

/**
 * 慢波修剪 (Slow Wave Pruning) — NREM Stage 3-4 深度睡眠
 * 人脑机制: 深度NREM期间, 突触强度全局下调, 弱连接被清除
 * (Tonomi & Cirelli, 2014: 突触稳态假说)
 * 功能: 清除低于阈值的弱知识, 防止记忆饱和
 */
function slowWavePrune(kg) {
  const pruned = []
  for (const [key, m] of Object.entries(kg.meridians)) {
    for (let i = m.points.length - 1; i >= 0; i--) {
      const p = m.points[i]
      if (p.hidden) continue
      // 弱知识: 低巩固分 + 低访问次数 + 非可靠状态
      const isWeak = (p.consolidation_score || 0) < 2 && (p.n || 0) < 2
        && !['CONFIRMED', 'ACTIVE', 'MATURE'].includes(p.status)
      const isStale = p.status === 'SLEEPING' && (p.consolidation_score || 0) < 1
      if (isWeak || isStale) {
        hidePoint(kg, key, p.id)
        pruned.push({ point_id: p.id, meridian: key, reason: isWeak ? 'weak' : 'stale' })
      }
    }
  }
  // 第二遍: 清理经脉中空穴位保留的related_points
  for (const [, m] of Object.entries(kg.meridians)) {
    for (const p of m.points) {
      if (!p.related_points) continue
      p.related_points = p.related_points.filter(rp => {
        for (const [, m2] of Object.entries(kg.meridians)) {
          if (m2.points.some(pp => pp.id === rp.id && !pp.hidden)) return true
        }
        return false
      })
    }
  }
  return pruned
}

/**
 * 多周期睡眠回放 (Multi-Cycle Sleep Replay)
 * 模拟人脑 NREM→REM 多周期睡眠 (每个周期90分钟, 每夜4-6周期)
 * Phase 1 - 慢波修剪(NREM深睡): 清除弱连接 ← 新增
 * Phase 2 - NREM期: 强化事实 — 增加巩固分, 降低方差
 * Phase 3 - REM期: 连接概念 — 建立跨经脉 promotes, 情感再处理
 * Phase 4 - 终末: 突触稳态 — 全局微调, 情绪衰减
 *
 * @param {object} kg
 * @param {array} sessionPoints — 本会话涉及的所有穴位ID列表
 * @param {array} sessionEmotions — 本会话的情感时间线
 * @param {number} cycles — 睡眠周期数 (默认4, 范围1-6)
 */
function sessionEnd(kg, sessionPoints = [], sessionEmotions = [], cycles = 4) {
    const now = new Date();
    cycles = Math.max(1, Math.min(6, cycles || 4));
    const results = { cycles: [], global: {} };

    // 收集本会话点
    const pointIds = sessionPoints.filter(id => findPointById(kg, id));

    // ── Phase 0: 慢波修剪 (每次睡眠前执行一次) ──
    const pruned = slowWavePrune(kg);
    results.pruned = pruned.length;

    // ── 多周期循环 ──
    for (let cycle = 1; cycle <= cycles; cycle++) {
        const cycleLog = { cycle, nrem: 0, rem: 0 };

        // ── NREM期: 强化事实 ──
        // 人脑NREM慢波振荡→海马尖波涟漪→新皮层纺锤波→记忆印记写入
        for (const found of pointIds) {
            const fp = findPointById(kg, found);
            if (!fp || fp.point.hidden) continue;
            const p = fp.point;
            // 早期周期(1-2)强化多, 后期周期(3+)强化递减
            const nremBoost = Math.max(1, 4 - cycle);
            const oldCons = p.consolidation_score || 0;
            p.consolidation_score = oldCons + nremBoost;
            // sigma2 降低 (方差的倒数 = 置信度提升)
            p.sigma2 = Math.max(0.01, (p.sigma2 || 0.25) * 0.95);

            // 状态提升
            if (p.status === 'HYPOTHESIS' && p.consolidation_score >= 5) p.status = 'PROVISIONAL';
            if (p.status === 'PROVISIONAL' && p.consolidation_score >= 20 && (p.n || 0) >= 3) p.status = 'CONFIRMED';

            markDirty(kg, fp.meridianKey);
            cycleLog.nrem++;
        }

        // ── REM期: 连接概念 + 情绪再处理 ──
        // 人脑REM期: 海马θ波→前额叶→跨脑区连接重组
        if (cycle > 1) { // 第一个周期跳过REM(人脑第一个周期NREM为主)
            for (const found of pointIds) {
                const fp = findPointById(kg, found);
                if (!fp || fp.point.hidden) continue;
                const p = fp.point;
                if (!p.tags) continue;

                // 从不相干经脉找潜在关联 (跨领域连接)
                for (const [key, m] of Object.entries(kg.meridians)) {
                    if (key === fp.meridianKey) continue;
                    for (const other of m.points) {
                        if (other.hidden || !other.tags) continue;
                        // 找tags完全不同但有潜在关联的知识
                        const overlap = p.tags.filter(t => other.tags.includes(t)).length;
                        if (overlap === 0 && p.tags.length > 0 && other.tags.length > 0) {
                            // 不同但互补的话题 → 建立弱promotes
                            p.promotes = p.promotes || [];
                            if (!p.promotes.find(r => r.target_meridian === key)) {
                                p.promotes.push({
                                    target_meridian: key, target_id: other.id,
                                    strength: 0.05, type: 'promote',
                                    desc: 'REM sleep cross-meridian association',
                                    created: now.toISOString(),
                                });
                                cycleLog.rem++;
                            }
                        }
                    }
                }

                // 情绪衰减: 情绪浓度随时间周期性降低
                if (p.emotion_boost && p.emotion_boost > 0) {
                    p.emotion_boost = Math.max(0, p.emotion_boost - 1 * (cycle / cycles));
                    markDirty(kg, fp.meridianKey);
                }
            }
        }
        results.cycles.push(cycleLog);
    }

    // ── 突触稳态 (Synaptic Homeostasis) ──
    // REM睡眠后期: 全局突触强度微降, 保持可塑性
    // 人脑机制: 慢波活动→突触下缩放→防止饱和
    let scaled = 0;
    for (const [key, m] of Object.entries(kg.meridians)) {
        for (const p of m.points) {
            if (p.hidden) continue;
            if (p.q !== undefined) {
                const scale = 0.98; // 全局下调2%
                p.q = Math.max(0.01, p.q * scale);
                markDirty(kg, key);
                scaled++;
            }
        }
    }
    results.global = { synaptic_scaling: '0.98', points_scaled: scaled };

    // ── 衰减检查 ──
    const decayed = decayCheck(kg);

    // 汇总
    const totalNrem = results.cycles.reduce((s, c) => s + c.nrem, 0);
    const totalRem = results.cycles.reduce((s, c) => s + c.rem, 0);
    return {
        cycles: cycles,
        replayed: pointIds.length,
        pruned: results.pruned || 0,
        nrem_consolidations: totalNrem,
        rem_associations: totalRem,
        synaptic_scaling: scaled,
        decayed: decayed.length,
    };
}

/**
 * 温故知新 — 定期回顾旧知识
 * "温故而知新，可以为师矣" —《论语》
 */
function experienceReplay(kg, limit = 10) {
    const candidates = [];
    for (const [key, m] of Object.entries(kg.meridians)) {
        for (const p of m.points) {
            if (p.hidden) continue;
            const daysSince = (Date.now() - new Date(p.last_verified || p.created_at)) / 86400000;
            if (daysSince > 7 && daysSince < 30 && p.status === 'CONFIRMED') {
                candidates.push({
                    point_id: p.id, meridian: key, meridian_name: m.name,
                    days_since_verified: Math.round(daysSince),
                    replay_priority: (p.q||0.5) * (1 - daysSince/30) + (p.consolidation_score||0)/100,
                });
            }
        }
    }
    candidates.sort((a, b) => b.replay_priority - a.replay_priority);
    return candidates.slice(0, limit);
}

module.exports = { decayCheck, sessionEnd, experienceReplay };