/** 统计诊断 — 经络系统全景视图 + 四象知识成熟度 */
const { SHU_LEVELS } = require('./constants');

function getStatus(kg) {
    const status = {
        algorithm: 'MMA (Meridian Memory Algorithm)',
        version: kg.meta?.version || '2.0.0',
        total_points: countAll(kg),
        visible_points: countVisible(kg),
        hidden_points: countHidden(kg),
        meridians: {},
        extra: {},
        element_distribution: {},
        shu_level_distribution: {},
        emotion_distribution: {},
        clusters: kg.meta?.clusters?.length || 0,
    };

    for (const [key, m] of Object.entries(kg.meridians)) {
        const visible = m.points.filter(p => !p.hidden);
        status.meridians[key] = {
            name: m.name, category: m.category,
            total: m.points.length, visible: visible.length, hidden: m.points.length - visible.length,
            element: m.element, yinyang: m.yinyang,
            avg_q: visible.length > 0 ? visible.reduce((s,p)=>s+(p.q||0.5),0)/visible.length : 0,
        };
    }
    for (const [key, m] of Object.entries(kg.extra)) {
        status.extra[key] = { name: m.name, role: m.role, points: m.points.length };
    }
    for (const m of Object.values(kg.meridians)) {
        const el = m.element || 'unknown';
        status.element_distribution[el] = (status.element_distribution[el]||0) + m.points.filter(p=>!p.hidden).length;
    }
    for (const m of Object.values(kg.meridians)) {
        for (const p of m.points) {
            if (p.hidden) continue;
            const sl = p.shu_level || 'ying';
            status.shu_level_distribution[sl] = (status.shu_level_distribution[sl]||0) + 1;
        }
    }
    for (const m of Object.values(kg.meridians)) {
        for (const p of m.points) {
            if (p.hidden) continue;
            const em = p.emotion || 'neutral';
            status.emotion_distribution[em] = (status.emotion_distribution[em]||0) + 1;
        }
    }
    return status;
}

function countAll(kg) {
    return Object.values(kg.meridians).reduce((s,m)=>s+m.points.length,0)
         + Object.values(kg.extra).reduce((s,m)=>s+m.points.length,0);
}
function countVisible(kg) {
    return Object.values(kg.meridians).reduce((s,m)=>s+m.points.filter(p=>!p.hidden).length,0)
         + Object.values(kg.extra).reduce((s,m)=>s+m.points.filter(p=>!p.hidden).length,0);
}
function countHidden(kg) {
    return Object.values(kg.meridians).reduce((s,m)=>s+m.points.filter(p=>p.hidden).length,0)
         + Object.values(kg.extra).reduce((s,m)=>s+m.points.filter(p=>p.hidden).length,0);
}

module.exports = { getStatus, computeFourImages, countAll, countVisible, countHidden };


/**
 * ═══════════════════════════════════════════════════════════════
 *  四象知识成熟度模型 (Four Images Maturity Model)
 *  "易有太极，是生两仪，两仪生四象" —《易经·系辞》
 * ═══════════════════════════════════════════════════════════════
 *
 * 老阳 (Old Yang) = 7: 稳定高频 — CONFIRMED, n≥10, q>0.7, σ²<0.1
 * 少阴 (Young Yin) = 8: 成熟有风险 — ACTIVE/MATURE, 7d<last_used<30d
 * 少阳 (Young Yang) = 9: 成长中 — PROVISIONAL/HYPOTHESIS, n<10
 * 老阴 (Old Yin) = 6: 趋忘 — SLEEPING/HIDDEN, last_used>30d
 *
 * 四象→五输穴宏观控制:
 *   老阳=合穴(he), 少阴=经穴(jingx), 少阳=荥穴(ying), 老阴=井穴(jing)
 */
function computeFourImages(kg) {
    const now = new Date();
    const images = {
        old_yang:   { count: 0, label: '老阳', name_en: 'Old Yang',   phase: 'stable_peak',    shu: 'he',    meridian_points: [] },
        young_yin:  { count: 0, label: '少阴', name_en: 'Young Yin',  phase: 'mature_risk',    shu: 'jingx', meridian_points: [] },
        young_yang: { count: 0, label: '少阳', name_en: 'Young Yang', phase: 'growing',         shu: 'ying',  meridian_points: [] },
        old_yin:    { count: 0, label: '老阴', name_en: 'Old Yin',    phase: 'fading',          shu: 'jing',  meridian_points: [] },
    };

    const allMeridians = { ...kg.meridians, ...kg.extra };
    for (const [mKey, m] of Object.entries(allMeridians)) {
        for (const p of m.points) {
            if (p.hidden) {
                images.old_yin.count++;
                images.old_yin.meridian_points.push({ id: p.id, meridian: mKey, status: 'HIDDEN' });
                continue;
            }
            const n = p.n || 0;
            const q = p.q || 0.5;
            const sigma2 = p.sigma2 || 0.25;
            const lastVerified = new Date(p.last_verified || p.created_at);
            const daysSince = (now - lastVerified) / 86400000;
            const status = p.status || 'HYPOTHESIS';

            if (status === 'SLEEPING' || daysSince > 60) {
                images.old_yin.count++;
                images.old_yin.meridian_points.push({ id: p.id, meridian: mKey, status, days_since: Math.round(daysSince) });
            } else if (n >= 10 && q > 0.7 && sigma2 < 0.1 && daysSince < 7) {
                images.old_yang.count++;
                images.old_yang.meridian_points.push({ id: p.id, meridian: mKey, status, q: q.toFixed(2), n });
            } else if ((status === 'ACTIVE' || status === 'MATURE' || status === 'CONFIRMED') && daysSince >= 7 && daysSince <= 30) {
                images.young_yin.count++;
                images.young_yin.meridian_points.push({ id: p.id, meridian: mKey, status, days_since: Math.round(daysSince) });
            } else {
                images.young_yang.count++;
                images.young_yang.meridian_points.push({ id: p.id, meridian: mKey, status, n });
            }
        }
    }

    const total = images.old_yang.count + images.young_yin.count + images.young_yang.count + images.old_yin.count;
    const summary = {
        old_yang_ratio:   total > 0 ? Math.round(images.old_yang.count / total * 100) : 0,
        young_yin_ratio:  total > 0 ? Math.round(images.young_yin.count / total * 100) : 0,
        young_yang_ratio: total > 0 ? Math.round(images.young_yang.count / total * 100) : 0,
        old_yin_ratio:    total > 0 ? Math.round(images.old_yin.count / total * 100) : 0,
        total_points: total,
        health_assessment: '',
    };

    // 健康评估
    if (summary.old_yang_ratio >= 40 && summary.old_yin_ratio < 20) {
        summary.health_assessment = '气盛 — 知识图谱成熟健康，经验丰富';
    } else if (summary.young_yang_ratio >= 50) {
        summary.health_assessment = '气生 — 知识图谱快速成长期，大量新知识积累中';
    } else if (summary.old_yin_ratio >= 30) {
        summary.health_assessment = '气虚 — 较多知识趋于遗忘，建议温故知新';
    } else if (summary.young_yin_ratio >= 40) {
        summary.health_assessment = '气平 — 知识图谱稳定运行中';
    } else {
        summary.health_assessment = '气杂 — 知识分布均匀，各方面均衡发展';
    }

    return { images, summary };
}