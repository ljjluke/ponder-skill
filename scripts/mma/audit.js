/** ═══════════════════════════════════════════════════════════════
 *  知识审计 (Knowledge Audit)  — 五行生克 × 完整性 × 矛盾 × 过期
 *  "观其脉证，知犯何逆，随证治之" —《伤寒论》
 *
 *  功能:
 *    ① 完整性审计: 检查知识是否缺维度
 *    ② 矛盾审计:  检测同经脉/同tags内结论冲突
 *    ③ 过期审计:  检测长期未验证的衰退知识
 *    ④ 五行生克审计: 检测五行链断裂或失衡
 *    ⑤ 跨界审计:  用八卦镜视角审视存量知识
 * ═══════════════════════════════════════════════════════════════ */
const { KNOWLEDGE_DIMENSIONS, FIVE_ELEMENT, KNOWLEDGE_INTERACTIONS } = require('./constants');
const { loadMMA, saveMMA, findPointById, markDirty } = require('./io');
const { ashiInsert } = require('./ashi');
const { isInStatusSet } = require('./state_machine');

// ── 知识完整度检查 (7维度覆盖) ──
function auditCompleteness(kg) {
    const dimKeys = Object.keys(KNOWLEDGE_DIMENSIONS);
    const results = [];
    let totalGaps = 0;

    for (const [key, m] of Object.entries(kg.meridians)) {
        for (const p of m.points) {
            if (p.hidden) continue;
            const missing = dimKeys.filter(d => !p[d] && p[d] !== false);
            if (missing.length > 0) {
                const completeness = (dimKeys.length - missing.length) / dimKeys.length;
                results.push({
                    point_id: p.id, meridian: key, meridian_name: m.name,
                    description: p.description?.substring(0, 60),
                    completeness: Math.round(completeness * 100) / 100,
                    missing_dimensions: missing,
                    needs_fix: completeness < 0.6,
                });
                totalGaps += missing.length;
            }
        }
    }
    return { examined: results.length, total_gaps: totalGaps, details: results.sort((a, b) => a.completeness - b.completeness) };
}

// ── 矛盾检测 (同经脉/tags重叠>50% + 结论矛盾) ──
function auditContradictions(kg) {
    const contradictions = [];
    for (const [key, m] of Object.entries(kg.meridians)) {
        const active = m.points.filter(p => !p.hidden);
        for (let i = 0; i < active.length; i++) {
            for (let j = i + 1; j < active.length; j++) {
                const a = active[i], b = active[j];
                if (!a.tags || !b.tags) continue;
                const overlap = a.tags.filter(t => b.tags.includes(t)).length;
                const minLen = Math.min(a.tags.length, b.tags.length);
                if (minLen > 0 && overlap / minLen > 0.5) {
                    const qDiff = Math.abs((a.q || 0.5) - (b.q || 0.5));
                    if (qDiff > 0.4) {
                        contradictions.push({
                            a: { id: a.id, desc: a.description?.substring(0, 40), q: a.q, status: a.status },
                            b: { id: b.id, desc: b.description?.substring(0, 40), q: b.q, status: b.status },
                            overlap_ratio: Math.round(overlap / minLen * 100) / 100,
                            q_gap: Math.round(qDiff * 100) / 100,
                            meridian: key, meridian_name: m.name,
                            severity: Math.abs(a.q - b.q) > 0.6 ? 'HIGH' : 'MED',
                            suggestion: 'Review and reconcile. One may need DISPUTED status.',
                        });
                    }
                }
            }
        }
    }
    // Also check DISPUTED points that were never resolved
    const unresolved = [];
    for (const [key, m] of Object.entries(kg.meridians)) {
        for (const p of m.points) {
            if (p.status === 'DISPUTED' && p.conflict_with && !p.hidden) {
                const found = findPointById(kg, p.conflict_with);
                unresolved.push({
                    point_id: p.id, disputed_with: p.conflict_with,
                    other_exists: !!found, meridian: key,
                    since: p.last_verified,
                });
            }
        }
    }
    return { contradictions, unresolved_disputes: unresolved };
}

// ── 过期审计 ──
function auditStaleness(kg) {
    const now = new Date();
    const results = { stale: [], sleeping: [], archival_candidates: [] };

    for (const [key, m] of Object.entries(kg.meridians)) {
        for (const p of m.points) {
            if (p.hidden) continue;
            const lastVer = new Date(p.last_verified || p.created_at);
            const daysSince = (now - lastVer) / 86400000;

            if (p.status === 'CONFIRMED' && daysSince > 90) {
                results.stale.push({
                    point_id: p.id, meridian: key, days: Math.round(daysSince),
                    q: p.q, consolidation: p.consolidation_score,
                    action: 'transition to SLEEPING recommended',
                });
            } else if (p.status === 'SLEEPING' && daysSince > 365) {
                results.archival_candidates.push({
                    point_id: p.id, days: Math.round(daysSince),
                    action: 'ARCHIVE recommended — unused >1yr',
                });
            } else if (p.status === 'PROVISIONAL' && daysSince > 60 && (p.n || 0) < 2) {
                results.archival_candidates.push({
                    point_id: p.id, days: Math.round(daysSince), n: p.n,
                    action: 'ARCHIVE recommended — never confirmed after 60d',
                });
            }
        }
    }
    results.sleeping = Object.values(kg.meridians).flatMap(m =>
        m.points.filter(p => p.status === 'SLEEPING' && !p.hidden)
    ).length;
    return results;
}

// ── 五行链分析 ──
function auditFiveElementBalance(kg) {
    const elementCounts = {};
    const elementQ = {};

    for (const [key, m] of Object.entries(kg.meridians)) {
        const el = m.element;
        if (!el) continue;
        if (!elementCounts[el]) elementCounts[el] = 0;
        if (!elementQ[el]) elementQ[el] = [];

        for (const p of m.points) {
            if (p.hidden) continue;
            elementCounts[el]++;
            if (p.q !== undefined) elementQ[el].push(p.q);
        }
    }

    const chains = [];
    for (const [el, childEl] of Object.entries(FIVE_ELEMENT.generating)) {
        const parentCount = elementCounts[el] || 0;
        const childCount = elementCounts[childEl] || 0;
        const avgQ = elementQ[childEl]?.length > 0
            ? elementQ[childEl].reduce((a, b) => a + b, 0) / elementQ[childEl].length
            : 0;
        const imbalance = childCount > 0 && parentCount > 0
            ? Math.abs(childCount - parentCount) / Math.max(childCount, parentCount) : 0;

        chains.push({
            from: el, to: childEl,
            from_count: parentCount, to_count: childCount,
            avg_q: Math.round(avgQ * 100) / 100,
            imbalance_ratio: Math.round(imbalance * 100) / 100,
            status: imbalance > 0.7 ? '⚠️ Severely imbalanced' : imbalance > 0.4 ? '⚡ Imbalanced' : '✅ Balanced',
        });
    }

    return { element_counts: elementCounts, chains };
}

// ── 跨界审计: 用八卦镜视角审视知识点 ──
function auditCrossDomain(kg, currentContextTags = []) {
    // 找出跨经脉的强关联知识
    const results = [];

    // 统计 tags 跨经脉分布
    const tagMeridian = {};
    for (const [key, m] of Object.entries(kg.meridians)) {
        for (const p of m.points) {
            if (p.hidden) continue;
            if (p.tags) {
                for (const t of p.tags) {
                    if (!tagMeridian[t]) tagMeridian[t] = [];
                    if (!tagMeridian[t].includes(key)) tagMeridian[t].push(key);
                }
            }
        }
    }

    // 跨经脉 tag — 可能值得跨领域迁移的知识
    for (const [tag, meridians] of Object.entries(tagMeridian)) {
        if (meridians.length >= 3) {
            results.push({
                tag, cross_meridians: meridians.length, meridians: meridians,
                insight: `Tag "${tag}" appears across ${meridians.length} meridians — potential cross-domain pattern`,
            });
        }
    }

    // 如果有当前上下文, 推荐可能相关的经脉
    if (currentContextTags.length > 0) {
        const related = [];
        for (const [key, m] of Object.entries(kg.meridians)) {
            const matchCount = m.points.filter(p =>
                p.tags && currentContextTags.some(t => p.tags.includes(t))
            ).length;
            if (matchCount > 0) related.push({ meridian: key, name: m.name, match_count: matchCount });
        }
        results.push({ context_relevance: related.sort((a, b) => b.match_count - a.match_count) });
    }

    return results;
}

// ── 自动修复: 对审计发现的问题执行修复 ──
function autoFix(kg, findings) {
    const actions = [];

    // 对不完整的知识, 标记为需要补全
    if (findings.completeness) {
        for (const d of findings.completeness.details) {
            if (d.needs_fix) {
                const found = findPointById(kg, d.point_id);
                if (found && !found.point._needs_completion) {
                    found.point._needs_completion = true;
                    markDirty(kg, found.meridianKey);
                    actions.push({ point_id: d.point_id, action: 'mark_needs_completion' });
                }
            }
        }
    }

    // 对过期 CONFIRMED 知识降级为 SLEEPING
    if (findings.staleness && findings.staleness.stale) {
        for (const s of findings.staleness.stale) {
            const found = findPointById(kg, s.point_id);
            if (found && found.point.status === 'CONFIRMED') {
                found.point.status = 'SLEEPING';
                found.point.slept_at = new Date().toISOString();
                markDirty(kg, found.meridianKey);
                actions.push({ point_id: s.point_id, action: 'demote_to_sleeping', reason: `${s.days}d without verification` });
            }
        }
    }

    return actions;
}

// ── 一键全审计 ──
function fullAudit(kg, contextTags = []) {
    const completeness = auditCompleteness(kg);
    const contradictions = auditContradictions(kg);
    const staleness = auditStaleness(kg);
    const fiveElement = auditFiveElementBalance(kg);
    const crossDomain = auditCrossDomain(kg, contextTags);
    const fix = autoFix(kg, {
        completeness,
        staleness,
    });

    // 总体健康度评分 (0-100)
    let health = 100;
    if (completeness.total_gaps > 0) health -= Math.min(30, completeness.total_gaps * 3);
    health -= Math.min(20, contradictions.contradictions.length * 5);
    health -= Math.min(15, staleness.stale.length * 3);
    const staleCount = staleness.stale.length;
    health -= Math.min(15, staleCount * 3);
    for (const c of fiveElement.chains) {
        if (c.imbalance_ratio > 0.7) health -= 5;
        else if (c.imbalance_ratio > 0.4) health -= 2;
    }
    health = Math.max(0, health);

    if (fix.length > 0) saveMMA(kg);

    return {
        health_score: health,
        summary: {
            total_points: completeness.examined,
            completeness_gaps: completeness.total_gaps,
            contradictions: contradictions.contradictions.length,
            unresolved_disputes: contradictions.unresolved_disputes.length,
            stale_confirmed: staleness.stale.length,
            sleeping: staleness.sleeping,
            archival_candidates: staleness.archival_candidates.length,
            five_element_imbalances: fiveElement.chains.filter(c => c.imbalance_ratio > 0.4).length,
        },
        completeness: {
            examined: completeness.examined,
            total_gaps: completeness.total_gaps,
            details: completeness.details.slice(0, 10), // top 10 worst
        },
        contradictions: {
            total: contradictions.contradictions.length,
            details: contradictions.contradictions.slice(0, 10),
            unresolved: contradictions.unresolved_disputes.slice(0, 10),
        },
        staleness: {
            stale_confirmed: staleness.stale.slice(0, 10),
            archival_candidates: staleness.archival_candidates.slice(0, 10),
        },
        five_element: fiveElement.chains,
        cross_domain: crossDomain.slice(0, 10),
        auto_fix_applied: fix,
    };
}

module.exports = {
    auditCompleteness, auditContradictions, auditStaleness,
    auditFiveElementBalance, auditCrossDomain,
    autoFix, fullAudit,
};
