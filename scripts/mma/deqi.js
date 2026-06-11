/** ═══════════════════════════════════════════════════════════════
 *  得气 (Deqi) — 知识召回 + 经气预热 + 三焦工作记忆 + 循经感传
 *  "刺之要，气至而有效" —《灵枢·九针十二原》
 * ═══════════════════════════════════════════════════════════════ */
const { SHU_LEVELS, SPECIAL_POINT_TYPES, HEXAGRAM_SEQUENCE, getNextHexagram } = require('./constants');
const { ziwuLiuzhu } = require('./ziwu');
const { loadWorkingMemory, saveWorkingMemory } = require('./io');
const { getDiagnosisWeight } = require('./diagnosis');

const UPPER_BURNER_LIMIT = 7; // 上焦容量 = 认知负荷7±2

/**
 * 得气 — 不是"搜索"，而是让上下文"共振"出最相关的记忆。
 * 召回流程: 三焦工作记忆 → 子午流注经脉 → 得气计分 → 循经感传扩散
 */
function deqi(kg, query, context = {}) {
    const wm = loadWorkingMemory();
    const results = [];

    // ── 第0层: 三焦气化工作记忆 ──
    const upperHits = searchUpperBurner(wm, query);
    if (upperHits.length > 0) results.push(...upperHits);

    // ── 第1层: 子午流注 → 活跃经脉 ──
    const activeMeridians = ziwuLiuzhu(kg, context);

    // ── 经气预热: 上次召回的经脉权重+0.15 ──
    const primedMeridian = getPrimedMeridian(wm);

    // ── 第2层: 沿经脉遍历穴位 ──
    for (const mKey of activeMeridians) {
        const meridian = kg.meridians[mKey] || kg.extra[mKey];
        if (!meridian) continue;
        const primingBonus = (mKey === primedMeridian) ? 0.15 : 0;

        for (let i = 0; i < meridian.points.length; i++) {
            const point = meridian.points[i];
            if (point.hidden) continue; // 隐穴不出现在常规召回
            let score = computeDeqiScore(point, query, meridian, i) + primingBonus;
            // 八纲辨证权重调整
            const diagWeight = getDiagnosisWeight(point, meridian, context);
            score *= diagWeight;
            if (score > 0.1) {
                results.push({
                    point, meridian: mKey, meridian_name: meridian.name,
                    position: i, deqi_score: Math.min(score, 1.0),
                    source: mKey === primedMeridian ? 'primed' : 'ziwu',
                    diagnosis_weight: diagWeight,
                });
            }
        }
    }

    // ── 第3层: 循经感传扩散 ──
    propagateSensation(results, kg, 0.3);

    // ── 排序 ──
    results.sort((a, b) => b.deqi_score - a.deqi_score);
    const top = results.slice(0, query.limit || 10);

    // ── 记忆再巩固: 被召回的穴位进入不稳定窗口(30分钟) ──
    openReconsolidationWindow(top);

    // ── 更新三焦工作记忆 ──
    updateWorkingMemory(wm, top);
    saveWorkingMemory(wm);

    // 卦序预召回 — 追加演化链上的下一卦知识（不超过limit的30%）
    const evolutionResults = hexagramPreRecall(kg, top);
    const maxEvolution = Math.max(1, Math.floor((query.limit || 10) * 0.3));
    for (const er of evolutionResults.slice(0, maxEvolution)) {
        if (!top.find(t => t.point.id === er.point.id)) {
            top.push(er);
        }
    }
    
    return top;
}

/** 上焦检查 — 最近用过的知识直接浮现 */
function searchUpperBurner(wm, query) {
    const hits = [];
    for (const entry of wm.upper) {
        if (!entry || !entry.point) continue;
        let score = 0;
        if (query.tags && entry.point.tags)
            score = entry.point.tags.filter(t => query.tags.includes(t)).length / Math.max(query.tags.length, 1) * 0.6;
        if (query.category && entry.point.category === query.category) score += 0.3;
        if (score > 0.3) hits.push({ ...entry, deqi_score: Math.min(score + 0.2, 1.0), source: 'upper_burner' });
    }
    return hits;
}

/** 经气预热 — 上次召回的经脉如果还在5分钟内 */
function getPrimedMeridian(wm) {
    if (!wm.last_meridian || !wm.last_meridian_ts) return null;
    const elapsed = (Date.now() - wm.last_meridian_ts) / 1000;
    if (elapsed > 300) return null; // 5分钟半衰
    return wm.last_meridian;
}

/** 更新三焦: 新召回→上焦, 上焦溢出→中焦 */
function updateWorkingMemory(wm, topResults) {
    const now = new Date().toISOString();
    // 上焦: 本回合召回结果
    for (const r of topResults.slice(0, UPPER_BURNER_LIMIT)) {
        const entry = { point_id: r.point.id, point: r.point, meridian: r.meridian, recalled_at: now };
        const idx = wm.upper.findIndex(e => e.point_id === r.point.id);
        if (idx >= 0) wm.upper.splice(idx, 1);
        wm.upper.unshift(entry);
    }
    // 上焦溢出→中焦 (旧条目)
    while (wm.upper.length > UPPER_BURNER_LIMIT) {
        const overflow = wm.upper.pop();
        const midIdx = wm.middle.findIndex(e => e.point_id === overflow.point_id);
        if (midIdx >= 0) wm.middle.splice(midIdx, 1);
        wm.middle.unshift(overflow);
    }
    // 中焦清理: 超过72小时未召回 → 降入下焦
    const MIDDLE_TTL_HOURS = 72;
    const demoted = [];
    wm.middle = wm.middle.filter(e => {
        const hoursSince = (Date.now() - new Date(e.recalled_at)) / 3600000;
        if (hoursSince > MIDDLE_TTL_HOURS) {
            demoted.push(e);
            return false;
        }
        return true;
    });
    // 降入下焦（去重后追加）
    for (const d of demoted) {
        const lowerIdx = wm.lower.findIndex(e => e.point_id === d.point_id);
        if (lowerIdx >= 0) wm.lower.splice(lowerIdx, 1);
        wm.lower.push(d);
    }
    // 下焦清理: 超过24小时 → 移出
    wm.lower = wm.lower.filter(e => (Date.now() - new Date(e.recalled_at)) / 3600000 < 24);
    // 记录最后活跃经脉
    if (topResults.length > 0) {
        wm.last_meridian = topResults[0].meridian;
        wm.last_meridian_ts = Date.now();
    }
}

function computeDeqiScore(point, query, meridian, position) {
    let score = 0;
    if (query.category && meridian.category === query.category) score += 0.4;
    if (query.tags && query.tags.length > 0 && point.tags)
        score += (point.tags.filter(t => query.tags.includes(t)).length / Math.max(query.tags.length, 1)) * 0.3;
    if (query.context_words && query.context_words.length > 0 && point.description) {
        const pt = [point.id, point.description, point.emotion||'', (point.tags||[]).join(' '), (point.keywords||[]).join(' ')].join(' ').toLowerCase();
        const m = query.context_words.filter(w => pt.includes(w.toLowerCase())).length;
        score += (m / query.context_words.length) * 0.2;
    }
    if (point.shu_level && SHU_LEVELS[point.shu_level]) score += SHU_LEVELS[point.shu_level].weight * 0.05;
    if (point.special_type && SPECIAL_POINT_TYPES[point.special_type]) score += (SPECIAL_POINT_TYPES[point.special_type].boost - 1) * 0.1;
    score += (point.q || 0.5) * 0.05;
    score += Math.min((point.consolidation_score || 0) / 100, 0.05);

    // 源监控: 亲历>推理>传闻
    const srcReliability = point.source_reliability;
    if (srcReliability !== undefined) {
        if (srcReliability >= 0.8) score *= 1.1;       // 亲历/告知 → 加分
        else if (srcReliability < 0.4) score *= 0.7;    // 传闻/类比 → 减分
    }

    // 编码特异性: 情景记忆匹配当前task_type → 加分
    if (point.memory_type === 'episodic' && point.task_type && query.task_type) {
        if (point.task_type === query.task_type) score *= 1.15;
    }

    // 再巩固窗口内 → 略微加分(刚被用过)
    if (point._reconsolidation_active && point.reconsolidation_window) {
        const closesAt = new Date(point.reconsolidation_window.closes_at);
        if (Date.now() < closesAt.getTime()) score *= 1.05;
    }

    return score;
}

/** 循经感传 — 高分穴位沿经脉前后扩散 + 表里经传导 */
function propagateSensation(results, kg, threshold = 0.3) {
    const existingIds = new Set(results.map(r => r.point.id));
    const toAdd = [];
    for (const r of results) {
        if (r.deqi_score < threshold) continue;
        const meridian = kg.meridians[r.meridian] || kg.extra[r.meridian];
        if (!meridian) continue;
        // 前后各2穴位扩散
        for (let d = -2; d <= 2; d++) {
            if (d === 0) continue;
            const pos = r.position + d;
            if (pos >= 0 && pos < meridian.points.length) {
                const np = meridian.points[pos];
                if (!existingIds.has(np.id) && !np.hidden) {
                    const s = r.deqi_score * (1 - Math.abs(d) * 0.25);
                    if (s > 0.1) { toAdd.push({ point: np, meridian: r.meridian, meridian_name: r.meridian_name, position: pos, deqi_score: s, propagated_from: r.point.id, source: 'propagation' }); existingIds.add(np.id); }
                }
            }
        }
        // 表里经传导
        if (kg.meridians[r.meridian] && kg.meridians[r.meridian].paired) {
            const paired = kg.meridians[kg.meridians[r.meridian].paired];
            if (paired && r.position < paired.points.length && paired.points[r.position] && !paired.points[r.position].hidden) {
                const pp = paired.points[r.position];
                if (!existingIds.has(pp.id)) { toAdd.push({ point: pp, meridian: kg.meridians[r.meridian].paired, meridian_name: paired.name, position: r.position, deqi_score: r.deqi_score * 0.5, propagated_from: r.point.id, source: 'paired' }); existingIds.add(pp.id); }
            }
        }
    }
    results.push(...toAdd);
}


/**
 * 卦序预召回 — 根据六十四卦演化链预召回后续知识
 * 屯→蒙→需→讼→师→... 每条知识在卦序中有位置
 * 召回当前知识时，同时预召回演化链上的下一卦知识
 */
function hexagramPreRecall(kg, topResults) {
    const results = [];
    for (const r of topResults.slice(0, 3)) { // 只对top-3做预召回
        if (!r.point.hexagram_seq) continue;
        const nextHex = getNextHexagram(r.point.hexagram_seq);
        if (!nextHex) continue;
        // 在所有经脉中查找hexagram_seq匹配的穴位
        for (const [key, m] of Object.entries(kg.meridians)) {
            for (const p of m.points) {
                if (p.hexagram_seq === nextHex && !p.hidden) {
                    results.push({
                        point: p, meridian: key, meridian_name: m.name,
                        deqi_score: r.deqi_score * 0.6, // 预召回权重较低
                        source: 'hexagram_evolution',
                        evolved_from: r.point.id,
                    });
                }
            }
        }
    }
    return results;
}

module.exports = { deqi, computeDeqiScore, propagateSensation, updateWorkingMemory, hexagramPreRecall, openReconsolidationWindow };


/**
 * ═══════════════════════════════════════════════════════════════
 *  记忆再巩固 (Memory Reconsolidation)
 *  "温故而知新，可以为师矣" —《论语》
 * ═══════════════════════════════════════════════════════════════
 *
 *  每次得气召回成功后，被召回的穴位进入"不稳定窗口"(30分钟)。
 *  在这个窗口内，新传入的相关信息可以修改该穴位的属性。
 *  这是人脑"每次回忆都是重构"的神经基础。
 *
 *  效果:
 *    → 窗口内再次被调用 → 巩固分+3(回忆加强)
 *    → 窗口内被TD更新 → q值可塑性×1.5
 *    → 窗口关闭 → 穴位重新锁定
 */
function openReconsolidationWindow(topResults) {
    const now = new Date().toISOString();
    const windowMs = 30 * 60 * 1000; // 30分钟

    for (const r of topResults.slice(0, 5)) { // 只对top-5开窗口
        if (!r.point) continue;
        r.point.reconsolidation_window = {
            opened_at: now,
            closes_at: new Date(Date.now() + windowMs).toISOString(),
            opened_by: 'deqi_recall',
        };
        // 窗口内标记: 下次TD更新时检查
        r.point._reconsolidation_active = true;
    }
}

/**
 * 检查穴位是否在再巩固窗口内
 * @returns {boolean}
 */
function isInReconsolidationWindow(point) {
    if (!point.reconsolidation_window || !point._reconsolidation_active) return false;
    const closesAt = new Date(point.reconsolidation_window.closes_at);
    if (Date.now() > closesAt.getTime()) {
        point._reconsolidation_active = false;
        return false;
    }
    return true;
}