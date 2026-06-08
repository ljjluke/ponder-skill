#!/usr/bin/env node
/**
 * L-GCMS Knowledge Lifecycle Engine (Pure Node.js)
 * Gate filtering + tiered storage + forgetting curve + context recall.
 * Usage: node knowledge_lifecycle.js <command> [args...]
 */

const { log } = console;

// ===== Gate Engine =====
function checkReusability(exp) {
    const text = (exp.description || "") + " " + (exp.tags || []).join(" ");
    const disposable = ["临时", "绕过", "偶发", "网络抖动", "temporary", "workaround", "once"];
    const reusable = ["通用", "模式", "原则", "最佳实践", "算法", "架构", "pattern", "principle", "generic", "reusable"];
    let score = 0.5;
    for (const p of disposable) if (text.includes(p)) score -= 0.2;
    for (const p of reusable) if (text.includes(p)) score += 0.15;
    return { score: Math.max(0, Math.min(1, score)), level: score >= 0.7 ? "high" : score >= 0.3 ? "medium" : "low" };
}

function checkInformationDensity(exp) {
    const hasCause = !!(exp.conditions && exp.conclusion);
    const hasAction = !!(exp.actionable_steps && exp.actionable_steps.length > 0);
    const notVague = (exp.description || "").length > 20;
    const score = (hasCause ? 0.35 : 0.1) + (hasAction ? 0.25 : 0.05) + (notVague ? 0.15 : 0.05) + 0.25;
    return { score: Math.max(0, Math.min(1, score)), level: score >= 0.7 ? "high" : score >= 0.4 ? "medium" : "low" };
}

function checkNovelty(exp, kg) {
    const newTags = new Set(exp.tags || []);
    let best = 0;
    for (const entry of (kg || [])) {
        const existTags = new Set(entry.tags || []);
        const overlap = [...newTags].filter(t => existTags.has(t)).length;
        const total = newTags.size + existTags.size - overlap || 1;
        best = Math.max(best, overlap / total);
    }
    const novelty = 1 - best;
    if (best > 0.8) return { score: novelty, action: "merge", reason: `highly similar (${best.toFixed(2)})` };
    if (best > 0.5) return { score: novelty, action: "create_linked", reason: `partially similar (${best.toFixed(2)})` };
    return { score: novelty, action: "create", reason: "novel" };
}

function checkReliability(exp) {
    const scores = { execution_result: 1.0, official_doc: 0.9, multiple_sources: 0.85, user_stated: 0.7, inference: 0.5, analogy: 0.3, hearsay: 0.1 };
    const base = scores[exp.source || "inference"] || 0.4;
    let score = base + (exp.verified ? 0.2 : 0) + (exp.cross_validated ? 0.1 : 0);
    return { score: Math.min(1, score), level: score >= 0.8 ? "expert" : score >= 0.6 ? "trusted" : "uncertain" };
}

function gateCheck(exp, kg) {
    const reusability = checkReusability(exp);
    const density = checkInformationDensity(exp);
    const novelty = checkNovelty(exp, kg);
    const reliability = checkReliability(exp);
    if (novelty.action === "merge") return { passed: true, score: 1.0, action: "merge", reasons: [novelty.reason] };
    const composite = reusability.score * 0.25 + density.score * 0.35 + novelty.score * 0.15 + reliability.score * 0.25;
    if (composite >= 0.6) return { passed: true, score: composite, action: "store" };
    if (composite >= 0.4) return { passed: true, score: composite, action: "observe" };
    return { passed: false, score: composite, action: "discard" };
}

// ===== Memory Strength =====
function computeMemoryStrength(entry, currentTime = null) {
    const now = currentTime ? new Date(currentTime) : new Date();
    const consolidation = entry.consolidation_score || 0;
    let recallBonus = 0;
    if (entry.last_recall) {
        const days = (now - new Date(entry.last_recall)) / 86400000;
        if (days <= 1) recallBonus = 10;
        else if (days <= 7) recallBonus = 5;
        else if (days <= 30) recallBonus = 1;
    }
    return Math.max(0, consolidation + recallBonus);
}

function getMemoryClarity(strength) {
    if (strength >= 40) return { clarity: "crisp" };
    if (strength >= 20) return { clarity: "active" };
    if (strength >= 10) return { clarity: "fuzzy" };
    if (strength >= 5) return { clarity: "fragmented" };
    return { clarity: "near_forgotten" };
}

// ===== Tiered Storage =====
function determineLayer(entry) {
    if (entry.status === "ARCHIVED") return "archive";
    if (entry.status === "SLEEPING") return "archive";
    if (entry.n >= 10 && entry.sigma2 < 0.05 && entry.status === "CONFIRMED") return "long_term";
    if (entry.is_gc_root_referenced) return "working";
    return "short_term";
}

function minorGc(entries) {
    const now = new Date();
    const surviving = [], collected = [];
    for (const e of entries) {
        const strength = computeMemoryStrength(e);
        if (strength < 5) { collected.push(e); continue; }
        if (e.status === "REFUTED") { collected.push(e); continue; }
        if (e.quality_tags && e.quality_tags.includes("probation")) {
            const days = (now - new Date(e.created_at || now)) / 86400000;
            if (days > 15 && (e.n || 0) === 0) { collected.push(e); continue; }
        }
        surviving.push(e);
    }
    return [surviving, collected];
}

function majorGc(entries, gcRoots) {
    const surviving = [], archived = [];
    for (const e of entries) {
        if (gcRoots.has(e.id)) { surviving.push(e); continue; }
        const strength = computeMemoryStrength(e);
        const daysSince = e.last_recall ? (new Date() - new Date(e.last_recall)) / 86400000 : 999;
        if (strength < 3 && daysSince > 60) { e.status = "ARCHIVED"; archived.push(e); continue; }
        surviving.push(e);
    }
    return [surviving, archived];
}

// ===== Context Recall =====
function computeContextMatch(current, anchor) {
    if (!anchor || !current) return 0;
    let score = 0, weight = 0;
    if (current.task_type && anchor.task_type) {
        weight += 0.3;
        if (current.task_type === anchor.task_type) score += 0.3;
    }
    if (current.tech_stack && anchor.tech_stack) {
        weight += 0.35;
        const cur = current.tech_stack.split("+");
        const anc = anchor.tech_stack.split("+");
        const overlap = cur.filter(c => anc.includes(c)).length;
        score += 0.35 * (overlap / Math.max(anc.length, 1));
    }
    if (current.keywords && anchor.keywords) {
        weight += 0.35;
        const overlap = current.keywords.filter(k => anchor.keywords.includes(k)).length;
        score += 0.35 * (overlap / Math.max(anchor.keywords.length, 1));
    }
    return weight === 0 ? 0 : score / weight;
}

function tryRecallFromArchive(currentCtx, archive, threshold = 0.7) {
    const recalled = [];
    for (const e of archive) {
        const match = computeContextMatch(currentCtx, e.context_anchor || {});
        if (match > threshold) {
            e.status = "PROVISIONAL";
            e.layer = "short_term";
            e.last_recall = new Date().toISOString();
            e.consolidation_score = (e.consolidation_score || 0) + 3;
            recalled.push(e);
        }
    }
    return recalled;
}

// ===== Full Maintenance =====
function fullMaintenance(kg, recentTaskIds, currentCtx = null) {
    const report = { gc_roots: 0, minor_collected: 0, major_archived: 0, recalled: 0 };
    // classify layers
    const shortTerm = [], longTerm = [], archive = [];
    for (const e of kg) {
        const layer = determineLayer(e);
        e.layer = layer;
        if (layer === "working" || layer === "short_term") shortTerm.push(e);
        else if (layer === "long_term") longTerm.push(e);
        else archive.push(e);
    }
    // GC
    const [, collected] = minorGc(shortTerm);
    report.minor_collected = collected.length;
    const gcRoots = new Set();
    for (const e of kg) {
        if ((e.recalled_in_tasks || []).some(t => recentTaskIds.includes(t))) {
            gcRoots.add(e.id); e.is_gc_root_referenced = true;
        }
    }
    report.gc_roots = gcRoots.size;
    const [, archived] = majorGc(longTerm, gcRoots);
    report.major_archived = archived.length;
    // recall
    if (currentCtx) {
        report.recalled = tryRecallFromArchive(currentCtx, archive).length;
    }
    return report;
}

// ===== CLI =====
function parseArgs(args) {
    const r = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith("--")) {
            const k = args[i].replace(/^--/, "").replace(/-/g, "_");
            const v = args[i + 1];
            if (v && !v.startsWith("--")) { r[k] = v; i++; }
            else r[k] = true;
        }
    }
    return r;
}

function output(data) { log(JSON.stringify(data)); }

function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) { log("Usage: node knowledge_lifecycle.js <command> [args...]"); process.exit(1); }
    const cmd = args[0];
    const o = parseArgs(args.slice(1));
    try {
        switch (cmd) {
            case "gate-check": { output(gateCheck(JSON.parse(o.experience || "{}"), JSON.parse(o.kg || "[]"))); break; }
            case "memory-strength": { const s = computeMemoryStrength(JSON.parse(o.entry || "{}")); output({ strength: s, ...getMemoryClarity(s) }); break; }
            case "determine-layer": output({ layer: determineLayer(JSON.parse(o.entry || "{}")) }); break;
            case "minor-gc": {
                const [surv, coll] = minorGc(JSON.parse(o.entries || "[]"));
                output({ surviving_count: surv.length, collected_count: coll.length, collected_ids: coll.map(e => e.id) });
                break;
            }
            case "major-gc": {
                const [surv, arch] = majorGc(JSON.parse(o.entries || "[]"), new Set(JSON.parse(o.gc_roots || "[]")));
                output({ surviving_count: surv.length, archived_count: arch.length });
                break;
            }
            case "full-maintenance": output(fullMaintenance(JSON.parse(o.kg || "[]"), JSON.parse(o.recent_tasks || "[]"), o.context ? JSON.parse(o.context) : null)); break;
            case "context-match": output({ match_score: computeContextMatch(JSON.parse(o.current || "{}"), JSON.parse(o.anchor || "{}")) }); break;
            case "recall-archive": output({ recalled_count: tryRecallFromArchive(JSON.parse(o.context || "{}"), JSON.parse(o.archive || "[]")).length }); break;
            default: log(`Unknown: ${cmd}`); process.exit(1);
        }
    } catch (e) { log(`Error: ${e.message}`); process.exit(1); }
}

main();