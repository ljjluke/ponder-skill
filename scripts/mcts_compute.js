#!/usr/bin/env node
/**
 * MCTS-TD Compute Engine (Pure Node.js — no Python dependency)
 * Core numerical computation for MCTS tree search.
 * Usage: node mcts_compute.js <command> [args...]
 */

const { log } = console;

// ===== UCB & Core =====
function computeUcb(v, nChild, nParent, c = 1.414, kBonus = 0) {
    if (nChild === 0) return Infinity;
    return v + c * Math.sqrt(Math.log(nParent) / nChild) + kBonus;
}

function computeCltUcb(v, sigma2, nI, N) {
    const phiInv = { 2: 1.5, 3: 1.0, 4: 0.8, 5: 0.7 };
    return v + (phiInv[N] || 0.5) * Math.sqrt(sigma2 / nI);
}

// ===== Welford & Backprop =====
function welfordUpdate(mu, m2, n, x) {
    const nNew = n + 1;
    const delta = x - mu;
    const muNew = mu + delta / nNew;
    const delta2 = x - muNew;
    const m2New = m2 + delta * delta2;
    const variance = nNew > 0 ? m2New / nNew : 0;
    return [muNew, m2New, nNew, variance];
}

function computeTdError(vActual, vPredicted) { return vActual - vPredicted; }

// ===== Convergence =====
function checkValueStability(vHistory, threshold = 0.05) {
    if (vHistory.length < 3) return false;
    const recent = vHistory.slice(-3);
    let maxChange = 0;
    for (let i = 1; i < recent.length; i++)
        maxChange = Math.max(maxChange, Math.abs(recent[i] - recent[i - 1]));
    return maxChange < threshold;
}

function checkHighConfidence(n, sigma2, threshold = 0.05) { return n >= 5 && sigma2 < threshold; }

function getMaxIterations(taskType) {
    return { simple: 5, medium: 10, complex: 20, debug: 8 }[taskType] || 10;
}

function shouldStopIteration(rootNodes, taskType, currentRound, vHistory) {
    if (currentRound >= getMaxIterations(taskType)) return [true, "Hard limit"];
    if (!rootNodes || rootNodes.length === 0) return [true, "No nodes"];
    const best = rootNodes.reduce((a, b) => (a.v || 0) > (b.v || 0) ? a : b);
    if (checkValueStability(vHistory)) return [true, "Value stable"];
    if (checkHighConfidence(best.n || 0, best.sigma2 || 1)) return [true, "High confidence"];
    return [false, "Continue"];
}

// ===== State Machine =====
const STATUS_WEIGHTS = { CONFIRMED: 1.0, PROVISIONAL: 0.3, DISPUTED: 0.2, REFUTED: 0.0, HYPOTHESIS: 0.1, SLEEPING: 0.15 };

function checkStatusTransition(currentStatus, n, hasContradiction = false, contradictionCount = 0) {
    if (currentStatus === "PROVISIONAL" && n >= 3 && !hasContradiction) return "CONFIRMED";
    if (currentStatus === "PROVISIONAL" && hasContradiction) return "DISPUTED";
    if (currentStatus === "CONFIRMED" && contradictionCount >= 2) return "DISPUTED";
    if (currentStatus === "DISPUTED" && contradictionCount >= 3) return "REFUTED";
    return null;
}

function getStatusWeight(status) { return STATUS_WEIGHTS[status] || 0; }

// ===== KBonus & Helpers =====
function computeKBonus(kgMatch, nChild) {
    if (nChild >= 3) return { k_bonus: 0.0, label: "enough samples" };
    if (!kgMatch) return { k_bonus: 0.0, label: "cold start" };
    const { status, n, q } = kgMatch;
    if (status === "CONFIRMED" && n >= 5 && q >= 0.8) return { k_bonus: 0.15, label: "high trust" };
    if (status === "PROVISIONAL" && n < 5 && q >= 0.7) return { k_bonus: 0.05, label: "medium trust" };
    if (status === "DISPUTED" || status === "REFUTED" || q < 0.5) return { k_bonus: -0.10, label: "warning" };
    return { k_bonus: 0.0, label: "no bias" };
}

function classifyBlindspot(score) {
    if (score < 4) return { class: "blank", label: "must learn first", action: "必须先补资料，不能跳过" };
    if (score < 7) return { class: "partial", label: "generate with caution", action: "可生成方案但标注'待验证'" };
    return { class: "covered", label: "can generate directly", action: "直接生成方案" };
}

function getConfidenceLevel(sigma2) {
    if (sigma2 < 0.1) return "high"; if (sigma2 < 0.3) return "medium"; return "low";
}

// ===== Ranking & User-Ask =====
function rankByConvergedV(solutions) {
    return [...solutions].sort((a, b) => {
        const vDiff = (b.v || 0) - (a.v || 0);
        if (Math.abs(vDiff) > 0.001) return vDiff;
        const nDiff = (b.n || 0) - (a.n || 0);
        if (Math.abs(nDiff) > 0.001) return nDiff;
        return (a.sigma2 || 1) - (b.sigma2 || 1);
    });
}

function shouldAskUserAfterSimulation(ranked) {
    if (ranked.length < 2) return { should_ask: false, reason: "only one solution" };
    const [first, second] = ranked;
    const vDiff = (first.v || 0) - (second.v || 0);
    if (vDiff < 0.02) return { should_ask: true, reason: `Nearly identical (deltaV=${vDiff.toFixed(3)})`, ask_about: ["usage_scenario", "priority_preference"] };
    if (vDiff < 0.04 && (first.n || 0) < 5 && (second.n || 0) < 5) return { should_ask: true, reason: `Close ranking with low confidence`, ask_about: ["constraint_detail", "usage_frequency"] };
    return { should_ask: false, reason: `Clear winner (deltaV=${vDiff.toFixed(3)})` };
}

function getFuseMode(accuracy, consecutiveBad = 0) {
    if (consecutiveBad >= 3) return { mode: "suggest_manual" };
    if (accuracy < 0.50) return { mode: "pause_ask_user" };
    if (accuracy < 0.70) return { mode: "simplified" };
    return { mode: "normal" };
}

function handleSelfCheckResult(conclusion, retryCount = 0) {
    if (conclusion === "passed") return { action: "execute" };
    if (conclusion === "risk") return { action: "ask user" };
    if (conclusion === "failed" && retryCount >= 2) return { action: "suggest_manual" };
    return { action: "re-simulate" };
}

// ===== Recursive Depth Guard =====
let _recursiveDepth = 0;
const MAX_DEPTH = parseInt(process.env.MCTS_MAX_DIVERGE_DEPTH || "3", 10);

function enterSimulation() {
    const d = _recursiveDepth;
    if (d === 0) return { depth: 0, mode: "full", variance_penalty: 0.0 };
    if (d === 1) return { depth: 1, mode: "simplified", variance_penalty: 0.0 };
    if (d === 2) return { depth: 2, mode: "micro_diverge", variance_penalty: 0.0 };
    return { depth: d, mode: "micro_diverge_risky", variance_penalty: 0.15 };
}

function beginSubDiverge() {
    if (_recursiveDepth + 1 > MAX_DEPTH) return { entered: false, error: "exceeds hard limit" };
    _recursiveDepth++;
    return { depth: _recursiveDepth, entered: true };
}
function endSubDiverge() { if (_recursiveDepth > 0) _recursiveDepth--; }
function resetRecursiveDepth() { _recursiveDepth = 0; }
function getDivergeDepthReport() { return { depth: _recursiveDepth, max_depth: MAX_DEPTH, status: enterSimulation().mode }; }

// ===== Trigger & Lambda =====
function quickTriggerCheck(message) {
    const triggers = ["做", "实现", "开发", "写", "改", "优化", "重构", "设计", "build", "implement", "develop", "create", "fix", "refactor", "design", "help", "how", "what", "which", "best", "帮我", "怎么", "如何"];
    for (const kw of triggers) if (message.includes(kw)) return { likely_trigger: true, reason: `keyword: ${kw}` };
    return { likely_trigger: false, reason: "no trigger keyword" };
}

function getLambdaByTraceLength(steps) {
    if (steps <= 3) return 0.0; if (steps <= 8) return 0.5; return 0.8;
}

// ===== Domain & Dimensions =====
const EIGHT_FACETS = [
    { id: 1, facet: "Source of Force", abstract: "Where does the driving force come from?" },
    { id: 2, facet: "Foundation & Capacity", abstract: "What is the foundation this rests on?" },
    { id: 3, facet: "Change & Disruption", abstract: "Where might the unexpected happen?" },
    { id: 4, facet: "Penetration & Diffusion", abstract: "How does this actually penetrate and reach people?" },
    { id: 5, facet: "Risk & Abyss", abstract: "Where is the deepest pit? Worst case? How to avoid?" },
    { id: 6, facet: "Visible & Dependent", abstract: "What is the shiny surface and what holds it up?" },
    { id: 7, facet: "Boundary & Limit", abstract: "What line cannot be crossed?" },
    { id: 8, facet: "Convergence & Mutual Benefit", abstract: "How to balance all interests? Win-win?" },
];

function getDimensions(domainHint = null) {
    return {
        facets: EIGHT_FACETS,
        template: null,
        instruction: "The 8 facets above are the abstract benchmark. LLM: determine concrete dimension names for each facet based on user needs."
    };
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
    if (args.length < 1) { log("Usage: node mcts_compute.js <command> [args...]"); process.exit(1); }
    const cmd = args[0];
    const o = parseArgs(args.slice(1));
    try {
        switch (cmd) {
            case "ucb": output({ ucb: computeUcb(+o.v, +o.n, +o.parent_n, +o.c || 1.414, +o.k_bonus || 0) }); break;
            case "rank": { const s = JSON.parse(o.solutions || "[]"); const r = rankByConvergedV(s); output({ ranked: r, close_analysis: shouldAskUserAfterSimulation(r) }); break; }
            case "converge": { output({ value_stable: checkValueStability((o.v_history || "").split(",").map(Number)), high_confidence: checkHighConfidence(+o.n, +o.sigma2), should_stop: checkValueStability((o.v_history || "").split(",").map(Number)) || checkHighConfidence(+o.n, +o.sigma2) }); break; }
            case "status-transition": output({ new_status: checkStatusTransition(o.current, +o.n || 0, o.has_contradiction, +o.contradiction_count || 0), current_weight: getStatusWeight(o.current) }); break;
            case "k-bonus": { const kg = o.status ? { status: o.status, n: +o.n || 0, q: +o.q || 0 } : null; output(computeKBonus(kg, +o.n_child || 0)); break; }
            case "classify-blindspot": output(classifyBlindspot(+o.score)); break;
            case "get-fuse-mode": output(getFuseMode(+o.accuracy, +o.consecutive_bad || 0)); break;
            case "handle-self-check": output(handleSelfCheckResult(o.conclusion, +o.retry_count || 0)); break;
            case "get-lambda": output({ lambda: getLambdaByTraceLength(+o.steps) }); break;
            case "get-status-weight": output({ status: o.status, weight: getStatusWeight(o.status) }); break;
            case "trigger-check": output(quickTriggerCheck(o.message || "")); break;
            case "get-dimensions": output(getDimensions(o.domain_hint || null)); break;
            case "enter-simulation": output(enterSimulation()); break;
            case "begin-sub-diverge": output(beginSubDiverge()); break;
            case "end-sub-diverge": endSubDiverge(); output({ depth: _recursiveDepth }); break;
            case "reset-depth": resetRecursiveDepth(); output({ depth: 0 }); break;
            case "diverge-depth": output(getDivergeDepthReport()); break;
            case "should-ask-user": { output(shouldAskUserAfterSimulation(JSON.parse(o.ranked || "[]"))); break; }
            case "cull": { const s = JSON.parse(o.solutions || "[]"); output({ kept: s.map(x => x.id), culled: [], summary: `${s.length} -> ${s.length} kept` }); break; }
            case "coverage-matrix": output({ matrix: {}, coverage_rate: 1.0 }); break;
            default: log(`Unknown: ${cmd}`); process.exit(1);
        }
    } catch (e) { log(`Error: ${e.message}`); process.exit(1); }
}

main();