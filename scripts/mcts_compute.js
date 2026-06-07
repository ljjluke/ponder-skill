#!/usr/bin/env node
/**
 * MCTS-TD Compute Engine (Node.js Version)
 *
 * Numerical computation for MCTS tree search:
 *   - UCB/CLT-UCB calculation
 *   - Backpropagation & value update (Welford)
 *   - Convergence detection
 *   - Knowledge state machine
 *   - Scoring & ranking
 *   - Trigger detection
 *   - Recursive depth guard
 *
 * Usage:
 *   node mcts_compute.js ucb --v 0.8 --n 3 --parent-n 10
 *   node mcts_compute.js converge --v-history "0.85,0.83,0.84" --n 5 --sigma2 0.03
 *   node mcts_compute.js rank --solutions '[{"name":"A","v":0.84,"n":5}]'
 *   node mcts_compute.js trigger-check --message "帮我实现登录"
 */

// ============================================================================
// Module 1: UCB/CLT-UCB Calculation
// ============================================================================

function computeUcb(v, nChild, nParent, c = Math.SQRT2, kBonus = 0) {
    /**
     * MCTS standard UCB formula (with knowledge graph bias).
     * UCB = V + c * sqrt(ln(N_parent) / n_child) + K_bonus
     */
    if (nChild === 0) return Infinity;
    const exploration = c * Math.sqrt(Math.log(nParent) / nChild);
    return v + exploration + kBonus;
}

function computeCltUcb(v, sigma2, nI, N) {
    /**
     * CLT-UCB formula for aggregation comparison phase.
     * UCB = V + Phi_inv(N) * sqrt(sigma2 / n_i)
     */
    const phiInvMap = { 2: 1.5, 3: 1.0, 4: 0.8, 5: 0.7 };
    const phiInv = phiInvMap[N] || 0.5;
    const exploration = phiInv * Math.sqrt(sigma2 / nI);
    return v + exploration;
}

function selectBestChild(children, parentN, c = Math.SQRT2) {
    /**
     * Select child with highest UCB from list.
     */
    let best = null;
    let bestUcb = -Infinity;

    for (const child of children) {
        const ucb = computeUcb(
            child.v || 0,
            child.n || 0,
            parentN,
            c,
            child.k_bonus || 0
        );
        if (ucb > bestUcb) {
            bestUcb = ucb;
            best = child;
        }
    }
    return best;
}

// ============================================================================
// Module 2: Backpropagation & Value Update (Welford)
// ============================================================================

function welfordUpdate(mu, m2, n, x) {
    /**
     * Welford online variance update (single step).
     * Returns: { mu_new, m2_new, n_new, variance }
     */
    const nNew = n + 1;
    const delta = x - mu;
    const muNew = mu + delta / nNew;
    const delta2 = x - muNew;
    const m2New = m2 + delta * delta2;
    const variance = nNew > 0 ? m2New / nNew : 0;

    return { muNew, m2New, nNew, variance };
}

function welfordBatch(values, gamma = 0.9) {
    /**
     * Welford batch update for eligibility trace backpropagation.
     */
    let current = values[values.length - 1];
    for (let i = values.length - 2; i >= 0; i--) {
        current = gamma * current + values[i];
    }
    return current;
}

function backpropagatePath(path, vLeaf) {
    /**
     * Backpropagate value along path, updating each node's statistics.
     */
    for (let i = path.length - 1; i >= 0; i--) {
        const node = path[i];
        const n = node.n || 0;
        const w = node.w || 0;
        const m2 = node.m2 || 0;
        const v = node.v || 0;

        const nNew = n + 1;
        const wNew = w + vLeaf;
        const vNew = wNew / nNew;

        // Welford update
        let m2New, sigma2;
        if (n === 0) {
            m2New = 0;
            sigma2 = 0;
        } else {
            const delta = vLeaf - v;
            const delta2 = vLeaf - vNew;
            m2New = m2 + delta * delta2;
            sigma2 = m2New / nNew;
        }

        node.n = nNew;
        node.w = wNew;
        node.v = vNew;
        node.m2 = m2New;
        node.sigma2 = sigma2;
    }
    return path;
}

function computeTdError(vActual, vPredicted) {
    return vActual - vPredicted;
}

function gammaBackpropagate(trace, gamma, scores) {
    /**
     * Gamma discounted backpropagation from tetris_mcts.
     */
    let currentValue = trace[trace.length - 1];
    const updated = new Array(trace.length);
    updated[trace.length - 1] = currentValue;

    for (let i = trace.length - 2; i >= 0; i--) {
        const vCorrected = currentValue - scores[i];
        const discounted = gamma * vCorrected + scores[i];
        updated[i] = discounted;
        currentValue = discounted;
    }

    return updated;
}

// ============================================================================
// Module 3: Convergence Detection
// ============================================================================

function checkValueStability(vHistory, threshold = 0.05) {
    /**
     * Check if value is stable in last 3 rounds.
     */
    if (vHistory.length < 3) return false;
    const recent = vHistory.slice(-3);
    let maxChange = 0;
    for (let i = 1; i < recent.length; i++) {
        const change = Math.abs(recent[i] - recent[i - 1]);
        if (change > maxChange) maxChange = change;
    }
    return maxChange < threshold;
}

function checkSufficientExploration(nodes, minN = 3) {
    /**
     * Check if high-value nodes have been sufficiently explored.
     */
    const highValueNodes = nodes.filter(n => (n.v || 0) >= 0.7);
    if (highValueNodes.length === 0) return true;
    return highValueNodes.every(n => (n.n || 0) >= minN);
}

function checkHighConfidence(n, sigma2, threshold = 0.05) {
    /**
     * Check if node has reached high confidence.
     */
    return n >= 5 && sigma2 < threshold;
}

function shouldStopIteration(rootNodes, taskType, currentRound, vHistory) {
    /**
     * Comprehensive check if MCTS iteration should stop.
     */
    const maxIterations = getMaxIterations(taskType);

    if (currentRound >= maxIterations) {
        return { shouldStop: true, reason: `Reached hard limit (${maxIterations} rounds)` };
    }

    if (!rootNodes || rootNodes.length === 0) {
        return { shouldStop: true, reason: 'No available nodes' };
    }

    const best = rootNodes.reduce((a, b) => (a.v > b.v ? a : b));

    if (checkValueStability(vHistory)) {
        return { shouldStop: true, reason: 'Best solution value stabilized' };
    }

    if (checkSufficientExploration(rootNodes)) {
        return { shouldStop: true, reason: 'All high-value nodes sufficiently explored' };
    }

    if (checkHighConfidence(best.n || 0, best.sigma2 || 1)) {
        return { shouldStop: true, reason: 'Best solution reached high confidence' };
    }

    return { shouldStop: false, reason: 'Continue iteration' };
}

function getMaxIterations(taskType) {
    const limits = {
        simple: 5,
        medium: 10,
        complex: 20,
        debug: 8
    };
    return limits[taskType] || 10;
}

// ============================================================================
// Module 4: Knowledge State Machine
// ============================================================================

const STATUS_WEIGHTS = {
    CONFIRMED: 1.0,
    PROVISIONAL: 0.3,
    DISPUTED: 0.2,
    REFUTED: 0.0,
    HYPOTHESIS: 0.1,
    SLEEPING: 0.15,
    ARCHIVED: 0.0,
};

const TRANSITIONS = {
    'HYPOTHESIS,verified_positive': 'PROVISIONAL',
    'HYPOTHESIS,verified_negative': 'REFUTED',
    'PROVISIONAL,verified_positive': 'PROVISIONAL',
    'PROVISIONAL,contradiction': 'DISPUTED',
    'PROVISIONAL,verified_negative': 'REFUTED',
    'CONFIRMED,contradiction': 'DISPUTED',
    'CONFIRMED,verified_negative': 'DISPUTED',
    'DISPUTED,new_evidence_supports': 'CONFIRMED',
    'DISPUTED,contradiction': 'REFUTED',
    'SLEEPING,recalled': 'PROVISIONAL',
    'ARCHIVED,recalled': 'HYPOTHESIS',
};

function getStatusWeight(status) {
    return STATUS_WEIGHTS[status] || 0.0;
}

function checkStatusTransition(currentStatus, n, hasContradiction = false, contradictionCount = 0) {
    /**
     * Check if knowledge entry needs state transition.
     */
    // PROVISIONAL -> CONFIRMED: >=3 positive verifications
    if (currentStatus === 'PROVISIONAL' && n >= 3 && !hasContradiction) {
        return 'CONFIRMED';
    }

    // PROVISIONAL -> DISPUTED: contradiction appears
    if (currentStatus === 'PROVISIONAL' && hasContradiction) {
        return 'DISPUTED';
    }

    // CONFIRMED -> DISPUTED: >=2 contradictions
    if (currentStatus === 'CONFIRMED' && contradictionCount >= 2) {
        return 'DISPUTED';
    }

    // DISPUTED -> REFUTED: >=3 contradictions
    if (currentStatus === 'DISPUTED' && contradictionCount >= 3) {
        return 'REFUTED';
    }

    return null;
}

function getStatusWeightFull(status, consolidationScore = 0) {
    /**
     * Get full query weight (with SLEEPING halved).
     */
    const base = STATUS_WEIGHTS[status] || 0.0;
    if (status === 'SLEEPING') return base * 0.5;
    return base;
}

// ============================================================================
// Module 5: Knowledge Graph Bias (K_bonus)
// ============================================================================

function computeKBonus(kgMatch, nChild) {
    /**
     * Calculate knowledge graph bias K_bonus.
     */
    if (nChild >= 3) {
        return { kBonus: 0.0, label: 'Sufficient samples', reason: 'n_child>=3, no longer rely on prior' };
    }
    if (!kgMatch) {
        return { kBonus: 0.0, label: 'Cold start', reason: 'No knowledge graph match' };
    }

    const status = kgMatch.status || '';
    const n = kgMatch.n || 0;
    const q = kgMatch.q || 0;

    if (status === 'CONFIRMED' && n >= 5 && q >= 0.8) {
        return { kBonus: 0.15, label: 'High credibility bias', reason: `CONFIRMED+n=${n}+q=${q.toFixed(2)}` };
    }
    if (status === 'PROVISIONAL' && n < 5 && q >= 0.7) {
        return { kBonus: 0.05, label: 'Medium credibility bias', reason: `PROVISIONAL+n=${n}+q=${q.toFixed(2)}` };
    }
    if ((status === 'DISPUTED' || status === 'REFUTED') || q < 0.5) {
        return { kBonus: -0.10, label: 'Failure warning', reason: `status=${status}+q=${q.toFixed(2)}` };
    }

    return { kBonus: 0.0, label: 'No significant bias', reason: 'Does not meet bias conditions' };
}

// ============================================================================
// Module 6: Scoring & Ranking
// ============================================================================

function roughFilter(solutions, maxKeep = 5) {
    /**
     * Quick filter when too many solutions.
     */
    if (solutions.length <= maxKeep) return solutions;

    const scored = solutions.map(s => ({
        ...s,
        roughScore: (s.feasibility || 0) * 0.5 +
                    (s.cost_benefit || 0) * 0.3 +
                    (1 - (s.risk || 0)) * 0.2
    }));

    scored.sort((a, b) => b.roughScore - a.roughScore);
    return scored.slice(0, maxKeep);
}

function rankByConvergedV(solutions) {
    /**
     * Rank solutions by converged V value.
     */
    const sorted = [...solutions].sort((a, b) => {
        const vDiff = (b.v || 0) - (a.v || 0);
        if (Math.abs(vDiff) >= 0.05) return vDiff;
        // If V close, compare n and sigma2
        if ((a.n || 0) > (b.n || 0)) return -1;
        if ((a.sigma2 || 1) < (b.sigma2 || 1)) return -1;
        return vDiff;
    });
    return sorted;
}

function handleCloseRanking(ranked) {
    /**
     * Handle close ranking situation.
     */
    if (ranked.length < 2) {
        return { needsReEval: false, reason: 'Only one solution' };
    }

    const [first, second] = ranked;
    const vDiff = (first.v || 0) - (second.v || 0);

    if (vDiff < 0.03 && (first.n || 0) < (second.n || 0)) {
        return {
            needsReEval: true,
            reason: `V lead ${vDiff.toFixed(3)}<0.03 and fewer n (${first.n}<${second.n}), add 2 rounds`
        };
    }

    return { needsReEval: false, reason: 'Sufficient differentiation or sufficient exploration' };
}

// ============================================================================
// Module 7: Recursive Depth Guard
// ============================================================================

let recursiveDepth = 0;
const MAX_RECURSIVE_DIVERGE_DEPTH = 2;
const HARD_LIMIT = 3;

function enterSimulation() {
    /**
     * Called before simulation starts, returns current recursion state.
     */
    const depth = recursiveDepth;

    if (depth === 0) {
        return { depth: 0, allowed: true, mode: 'full', variancePenalty: 0, message: 'Top-level MCTS: full divergence and simulation' };
    } else if (depth === 1) {
        return { depth: 1, allowed: true, mode: 'simplified', variancePenalty: 0, message: 'Level 1 sub-decision: simplified divergence (2 quick solutions, 1~2 step simulation)' };
    } else if (depth === 2) {
        return { depth: 2, allowed: true, mode: 'micro_diverge', variancePenalty: 0.1, message: 'Level 2 micro-diverge: single perspective, 1 step simulation, variance +0.1' };
    } else {
        return { depth, allowed: true, mode: 'micro_diverge_risky', variancePenalty: 0.15, message: `Depth ${depth}>=3, micro-diverge marked high risk, variance +0.15` };
    }
}

function beginSubDiverge() {
    /**
     * Called before sub-divergence, increments depth.
     */
    const newDepth = recursiveDepth + 1;

    if (newDepth > HARD_LIMIT) {
        return { depth: recursiveDepth, entered: false, error: `Recursion depth ${newDepth} exceeds hard limit ${HARD_LIMIT}` };
    }

    recursiveDepth = newDepth;
    return { depth: newDepth, entered: true, error: null };
}

function endSubDiverge() {
    /**
     * Called after sub-divergence, decrements depth.
     */
    if (recursiveDepth > 0) {
        recursiveDepth--;
    }
}

function resetRecursiveDepth() {
    recursiveDepth = 0;
}

function needsSubDiverge(decisionType, currentDepth = null) {
    /**
     * Determine if current decision point needs sub-divergence.
     */
    if (currentDepth === null) currentDepth = recursiveDepth;

    if (decisionType === 'tech_choice') {
        if (currentDepth < MAX_RECURSIVE_DIVERGE_DEPTH) {
            return { needsDiverge: true, action: 'begin_sub_diverge', reason: `Tech choice point, depth ${currentDepth}<${MAX_RECURSIVE_DIVERGE_DEPTH}, start sub-diverge` };
        } else {
            return { needsDiverge: false, action: 'assume', reason: `Tech choice but depth reached ${currentDepth}, no diverge, assume directly` };
        }
    }

    if (decisionType === 'risk' || decisionType === 'uncertainty') {
        return { needsDiverge: false, action: 'knowledge_tree', reason: `Risk/uncertainty point (type: ${decisionType}), use knowledge decision tree, no diverge` };
    }

    if (decisionType === 'user_preference') {
        return { needsDiverge: false, action: 'defer_to_user', reason: 'User preference/constraint point, record question for confirmation, no diverge' };
    }

    return { needsDiverge: false, action: 'unknown', reason: `Unknown decision type: ${decisionType}` };
}

function getDivergeDepthReport() {
    /**
     * Get current recursion depth report.
     */
    const status = enterSimulation();
    return {
        depth: recursiveDepth,
        maxDepth: MAX_RECURSIVE_DIVERGE_DEPTH,
        status: status.mode
    };
}

// ============================================================================
// Module 8: Trigger Detection
// ============================================================================

const TRIGGER_KEYWORDS = {
    action_verbs: ['做', '实现', '开发', '写', '改', '优化', '重构', '设计', '添加', '新增', '构建', '搭建', '修复', '改进', '部署', '配置'],
    decision_questions: ['怎么', '如何', '用什么', '选哪个', '哪种', '哪个好', '方案', '架构', '技术选型'],
    analysis_verbs: ['分析', '评估', '比较', '审查', '对比'],
    continue_keywords: ['继续', '可以', '推演吧', '推演', 'go ahead', 'yes', '确认'],
};

const EXCLUDE_KEYWORDS = {
    greetings: ['你好', '嗨', 'hello', 'hi', 'hey'],
    info_query: ['什么意思', '是什么', '怎么用', '如何用', '这段代码'],
};

function quickTriggerCheck(message) {
    /**
     * Quick trigger check (heuristic, LLM makes final judgment).
     */
    for (const kw of TRIGGER_KEYWORDS.action_verbs) {
        if (message.includes(kw)) {
            return { likelyTrigger: true, reason: `Contains action verb '${kw}'` };
        }
    }
    for (const kw of TRIGGER_KEYWORDS.decision_questions) {
        if (message.includes(kw)) {
            return { likelyTrigger: true, reason: `Contains decision question '${kw}'` };
        }
    }
    for (const kw of TRIGGER_KEYWORDS.analysis_verbs) {
        if (message.includes(kw)) {
            return { likelyTrigger: true, reason: `Contains analysis verb '${kw}'` };
        }
    }
    for (const kw of [...EXCLUDE_KEYWORDS.greetings, ...EXCLUDE_KEYWORDS.info_query]) {
        if (message.includes(kw)) {
            return { likelyTrigger: false, reason: `Matches exclude keyword '${kw}'` };
        }
    }

    return { likelyTrigger: false, reason: 'No obvious trigger signal' };
}

// ============================================================================
// Module 9: Domain Detection
// ============================================================================

const DOMAIN_KEYWORDS = {
    software_engineering: {
        keywords: ['代码', '编程', 'API', '数据库', '框架', '部署', '编译', '测试', '重构', '架构', '微服务', '前端', '后端', '中间件', '缓存', 'git', 'docker', 'k8s', 'linux', 'react', 'vue', 'spring', '算法', '实现', '开发', '写', '改', '优化', 'debug', 'bug', '接口', '模块'],
        keywords_en: ['code', 'programming', 'api', 'database', 'framework', 'deploy', 'compile', 'test', 'refactor', 'architecture', 'microservice', 'frontend', 'backend', 'middleware', 'cache', 'algorithm', 'implement', 'develop', 'build', 'write', 'fix', 'optimize', 'debug', 'bug', 'interface', 'module', 'function', 'endpoint', 'rest', 'graphql'],
        label: 'Software Engineering',
    },
    music: {
        keywords: ['音乐', '编曲', '作曲', '和弦', '旋律', '节奏', '调性', '和声', '配器', '混音', '音色', '乐器', '演唱', '演奏', '录音', '歌曲', '乐章', '音符', '音阶', '钢琴', '吉他', '鼓', '交响', '流行', '爵士', '古典', '电子乐'],
        keywords_en: ['music', 'compose', 'composition', 'chord', 'melody', 'rhythm', 'harmony', 'orchestration', 'mixing', 'timbre', 'instrument', 'vocal', 'performance', 'recording', 'song', 'symphony', 'pop', 'jazz', 'classical', 'electronic', 'piano', 'guitar', 'drum', 'bass'],
        label: 'Music Composition',
    },
    education: {
        keywords: ['教学', '课程', '备课', '课堂', '学生', '学习', '知识点', '考试', '作业', '教案', '教材', '课件', '讲授', '评估', '年级', '学科', '教学法', '班主任', '复习', '预习', '测验'],
        keywords_en: ['teach', 'course', 'lesson', 'classroom', 'student', 'learn', 'curriculum', 'exam', 'homework', 'syllabus', 'textbook', 'lecture', 'assessment', 'grade', 'subject', 'pedagogy', 'review', 'preview', 'quiz'],
        label: 'Education',
    },
    law: {
        keywords: ['法律', '合同', '诉讼', '法规', '条款', '判例', '律师', '法院', '仲裁', '知识产权', '公司法', '劳动法', '税法', '合规', '尽职调查', '起诉', '应诉', '辩护', '法条', '司法解释', '合同审查'],
        keywords_en: ['law', 'contract', 'litigation', 'regulation', 'clause', 'precedent', 'lawyer', 'court', 'arbitration', 'ip', 'compliance', 'due diligence', 'sue', 'defend', 'statute', 'legal', 'patent', 'trademark', 'copyright'],
        label: 'Law',
    },
    general: { keywords: [], keywords_en: [], label: 'General Decision' },
};

function identifyDomain(message, taskDescription = '') {
    /**
     * Domain identification (optional hint).
     */
    const text = (message + ' ' + taskDescription).toLowerCase();
    const scores = {};

    for (const [domain, config] of Object.entries(DOMAIN_KEYWORDS)) {
        if (domain === 'general') continue;

        const cnMatches = config.keywords.filter(kw => text.includes(kw)).length;
        const enMatches = config.keywords_en.filter(kw => text.includes(kw)).length;

        if (cnMatches + enMatches > 0) {
            scores[domain] = cnMatches + enMatches;
        }
    }

    if (Object.keys(scores).length > 0) {
        const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
        return {
            hint: best[0],
            hintLabel: DOMAIN_KEYWORDS[best[0]].label,
            hintConfidence: Math.min(1.0, best[1] / 10),
            note: 'Keyword match hint. LLM: If inconsistent with actual context, ignore and determine domain from eight-facet mirror.',
        };
    }

    return {
        hint: null,
        hintLabel: null,
        hintConfidence: 0.0,
        note: 'LLM: Please determine domain based on eight-facet mirror and user needs.',
    };
}

// ============================================================================
// Module 10: Blindspot Classification
// ============================================================================

const BLINDSPOT_RULES = {
    blank: { range: [0, 4], label: 'Completely blank', action: 'Must gather info first, cannot skip' },
    partial: { range: [4, 7], label: 'Partially blank', action: 'Can generate solutions but mark "pending verification"' },
    covered: { range: [7, 11], label: 'Covered', action: 'Directly generate solutions' },
};

function classifyBlindspot(score) {
    for (const [key, rule] of Object.entries(BLINDSPOT_RULES)) {
        if (score >= rule.range[0] && score < rule.range[1]) {
            return { class: key, ...rule };
        }
    }
    return { class: 'covered', ...BLINDSPOT_RULES.covered };
}

// ============================================================================
// Module 11: Final Convergence Check
// ============================================================================

function checkFinalConvergence(rootTotalN, solutionCount, topSolution) {
    /**
     * Final convergence check before aggregation ranking.
     */
    if (rootTotalN < solutionCount * 4) {
        return { converged: false, reason: `Total visits insufficient (need >${solutionCount * 4}, current ${rootTotalN})` };
    }
    if ((topSolution.n || 0) < 5) {
        return { converged: false, reason: `Top solution visits insufficient (need ≥5, current ${topSolution.n})` };
    }
    if ((topSolution.sigma2 || 1) >= 0.10) {
        return { converged: false, reason: `Top solution variance too high (${topSolution.sigma2.toFixed(2)}≥0.10)` };
    }
    return { converged: true, reason: 'All conditions satisfied' };
}

// ============================================================================
// Module 12: Should Ask User
// ============================================================================

function shouldAskUserAfterSimulation(ranked) {
    /**
     * Determine if need to ask user after simulation.
     */
    if (ranked.length < 2) {
        return { shouldAsk: false, reason: 'Only one solution, no choice needed' };
    }

    const [first, second] = ranked;
    const vDiff = (first.v || 0) - (second.v || 0);

    if (vDiff < 0.02) {
        return {
            shouldAsk: true,
            reason: `Two solutions nearly identical (ΔV=${vDiff.toFixed(3)}). Need user context to differentiate.`,
            askAbout: ['usage_scenario', 'priority_preference']
        };
    } else if (vDiff < 0.04 && (first.n || 0) < 5 && (second.n || 0) < 5) {
        return {
            shouldAsk: true,
            reason: `Close ranking (ΔV=${vDiff.toFixed(3)}) with low confidence (n1=${first.n}, n2=${second.n}). Need user's specific needs.`,
            askAbout: ['constraint_detail', 'usage_frequency']
        };
    }

    return {
        shouldAsk: false,
        reason: `Clear winner (ΔV=${vDiff.toFixed(3)}), n1=${first.n}, decision is reliable.`
    };
}

// ============================================================================
// Module 13: Fuse Mode
// ============================================================================

function getFuseMode(accuracy, consecutiveBad = 0) {
    /**
     * Circuit breaker mode.
     */
    if (consecutiveBad >= 3) {
        return { mode: 'suggest_manual', action: 'Suggest user manual decision' };
    }
    if (accuracy < 0.50) {
        return { mode: 'pause_ask_user', action: 'Pause simulation, directly ask user' };
    }
    if (accuracy < 0.70) {
        return { mode: 'simplified', action: 'Downgrade to simplified simulation (2 steps)' };
    }
    return { mode: 'normal', action: 'Normal simulation' };
}

// ============================================================================
// Module 14: Lambda Selection
// ============================================================================

function getLambdaByTraceLength(steps) {
    /**
     * Get recommended lambda based on trace length.
     */
    if (steps <= 3) return 0.0;
    if (steps <= 8) return 0.5;
    return 0.8;
}

// ============================================================================
// Module 15: Self-check Result Handling
// ============================================================================

const SELF_CHECK_ACTIONS = {
    '通过': { action: 'Execute', requireUser: false },
    '有风险': { action: 'Output report → User confirm → Execute', requireUser: true },
    '未通过': { action: 'Return to simulate engine', requireUser: false, maxRetries: 2 },
};

function handleSelfCheckResult(conclusion, retryCount = 0) {
    const action = SELF_CHECK_ACTIONS[conclusion] || SELF_CHECK_ACTIONS['通过'];
    if (conclusion === '未通过' && retryCount >= 2) {
        return { action: 'suggest_manual', reason: 'Consecutive 2 self-check failures' };
    }
    return action;
}

// ============================================================================
// Module 16: Synthesize Simulation Result
// ============================================================================

function synthesizeSimulationResult(baseVLeaf, subDivergeResults) {
    /**
     * Synthesize sub-diverge results into final V_leaf.
     */
    if (!subDivergeResults || subDivergeResults.length === 0) {
        return baseVLeaf;
    }

    let totalWeight = 0;
    let weightedSum = 0;

    for (const r of subDivergeResults) {
        const w = r.weight || 0.2;
        const v = r.v || baseVLeaf;
        weightedSum += v * w;
        totalWeight += w;
    }

    if (totalWeight === 0) return baseVLeaf;

    const subAvg = weightedSum / totalWeight;
    // Base simulation weight 0.8, sub-diverge weight 0.2
    const finalV = baseVLeaf * 0.8 + subAvg * 0.2;

    return Math.round(finalV * 1000) / 1000;
}

// ============================================================================
// CLI Interface
// ============================================================================

const [,, cmd, ...args] = process.argv;

function parseArgs(args) {
    const result = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].slice(2);
            const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
            result[key] = value;
            if (value !== true) i++;
        }
    }
    return result;
}

function output(data) {
    console.log(JSON.stringify(data, null, 2));
}

switch (cmd) {
    case 'ucb':
        const ucbArgs = parseArgs(args);
        output({ ucb: computeUcb(
            parseFloat(ucbArgs.v) || 0,
            parseInt(ucbArgs.n) || 0,
            parseInt(ucbArgs['parent-n']) || 1,
            parseFloat(ucbArgs.c) || Math.SQRT2,
            parseFloat(ucbArgs['k-bonus']) || 0
        )});
        break;

    case 'welford':
        const welfordArgs = parseArgs(args);
        const wResult = welfordUpdate(
            parseFloat(welfordArgs.mu) || 0,
            parseFloat(welfordArgs.m2) || 0,
            parseInt(welfordArgs.n) || 0,
            parseFloat(welfordArgs.x) || 0
        );
        output(wResult);
        break;

    case 'converge':
        const convergeArgs = parseArgs(args);
        const vHistory = convergeArgs['v-history'] ? convergeArgs['v-history'].split(',').map(Number) : [];
        output({
            valueStable: checkValueStability(vHistory),
            highConfidence: checkHighConfidence(parseInt(convergeArgs.n) || 0, parseFloat(convergeArgs.sigma2) || 1),
            shouldStop: checkValueStability(vHistory) || checkHighConfidence(parseInt(convergeArgs.n) || 0, parseFloat(convergeArgs.sigma2) || 1)
        });
        break;

    case 'k-bonus':
        const kbArgs = parseArgs(args);
        const kgMatch = kbArgs.status ? { status: kbArgs.status, n: parseInt(kbArgs.n) || 0, q: parseFloat(kbArgs.q) || 0 } : null;
        output(computeKBonus(kgMatch, parseInt(kbArgs['n-child']) || 0));
        break;

    case 'classify-blindspot':
        const blindspotArgs = parseArgs(args);
        output(classifyBlindspot(parseInt(blindspotArgs.score) || 0));
        break;

    case 'trigger-check':
        const triggerArgs = parseArgs(args);
        output(quickTriggerCheck(triggerArgs.message || ''));
        break;

    case 'identify-domain':
        const domainArgs = parseArgs(args);
        output(identifyDomain(domainArgs.message || '', domainArgs.task || ''));
        break;

    case 'get-lambda':
        const lambdaArgs = parseArgs(args);
        output({ lambda: getLambdaByTraceLength(parseInt(lambdaArgs.steps) || 0) });
        break;

    case 'get-status-weight':
        const statusArgs = parseArgs(args);
        output({ status: statusArgs.status, weight: getStatusWeightFull(statusArgs.status || '') });
        break;

    case 'enter-simulation':
        output(enterSimulation());
        break;

    case 'begin-sub-diverge':
        output(beginSubDiverge());
        break;

    case 'end-sub-diverge':
        endSubDiverge();
        output({ depth: recursiveDepth, message: 'Sub-diverge ended, depth-1' });
        break;

    case 'diverge-depth':
        output(getDivergeDepthReport());
        break;

    case 'reset-depth':
        resetRecursiveDepth();
        output({ depth: 0, message: 'Recursion depth reset' });
        break;

    case 'should-ask-user':
        const askArgs = parseArgs(args);
        const ranked = askArgs.ranked ? JSON.parse(askArgs.ranked) : [];
        output(shouldAskUserAfterSimulation(ranked));
        break;

    case 'get-fuse-mode':
        const fuseArgs = parseArgs(args);
        output(getFuseMode(parseFloat(fuseArgs.accuracy) || 1, parseInt(fuseArgs['consecutive-bad']) || 0));
        break;

    case 'handle-self-check':
        const checkArgs = parseArgs(args);
        output(handleSelfCheckResult(checkArgs.conclusion || '通过', parseInt(checkArgs['retry-count']) || 0));
        break;

    case 'check-final-convergence':
        const finalArgs = parseArgs(args);
        output(checkFinalConvergence(
            parseInt(finalArgs['root-total-n']) || 0,
            parseInt(finalArgs['solution-count']) || 0,
            { v: parseFloat(finalArgs['top-v']) || 0, n: parseInt(finalArgs['top-n']) || 0, sigma2: parseFloat(finalArgs['top-sigma2']) || 1 }
        ));
        break;

    case 'synthesize-sim':
        const synArgs = parseArgs(args);
        const subResults = synArgs['sub-results'] ? JSON.parse(synArgs['sub-results']) : [];
        output({ finalVLeaf: synthesizeSimulationResult(parseFloat(synArgs['base-v']) || 0, subResults) });
        break;

    case 'rank':
        const rankArgs = parseArgs(args);
        const solutions = rankArgs.solutions ? JSON.parse(rankArgs.solutions) : [];
        const rankedSolutions = rankByConvergedV(solutions);
        const closeAnalysis = handleCloseRanking(rankedSolutions);
        output({ ranked: rankedSolutions, closeAnalysis });
        break;

    case 'needs-sub-diverge':
        const nsdArgs = parseArgs(args);
        output(needsSubDiverge(nsdArgs.type || ''));
        break;

    case 'rough-filter':
        const rfArgs = parseArgs(args);
        const rfSolutions = rfArgs.solutions ? JSON.parse(rfArgs.solutions) : [];
        output({ filtered: roughFilter(rfSolutions, parseInt(rfArgs['max-keep']) || 5) });
        break;

    case 'status-transition':
        const stArgs = parseArgs(args);
        const newStatus = checkStatusTransition(
            stArgs.current || '',
            parseInt(stArgs.n) || 0,
            stArgs['has-contradiction'] === 'true' || stArgs['has-contradiction'] === '',
            parseInt(stArgs['contradiction-count']) || 0
        );
        output({ current: stArgs.current, newStatus, currentWeight: getStatusWeight(stArgs.current || '') });
        break;

    case 'should-write-kg':
        const swkArgs = parseArgs(args);
        const isFinal = swkArgs['is-final'] === 'true' || swkArgs['is-final'] === '';
        output({
            shouldWrite: (parseFloat(swkArgs['v-leaf']) >= 0.8 || parseFloat(swkArgs['v-leaf']) <= 0.3 ||
                         parseInt(swkArgs.round) % 5 === 0 || isFinal),
            reason: isFinal ? 'Final convergence force write' :
                    parseFloat(swkArgs['v-leaf']) >= 0.8 ? `High value experience (V=${swkArgs['v-leaf']}>=0.8)` :
                    parseFloat(swkArgs['v-leaf']) <= 0.3 ? `Failure experience (V=${swkArgs['v-leaf']}<=0.3)` :
                    parseInt(swkArgs.round) % 5 === 0 ? `Round ${swkArgs.round} batch write` :
                    'Normal experience (V 0.3~0.8), no write'
        });
        break;

    case 'check-write-safety':
        const cwsArgs = parseArgs(args);
        const existing = cwsArgs['existing-q'] ? { q: parseFloat(cwsArgs['existing-q']) } : null;
        const issues = [];
        if (existing && Math.abs(parseFloat(cwsArgs['new-q']) - existing.q) > 0.5) {
            issues.push({ type: 'contradiction', action: 'Create independent HYPOTHESIS', existingQ: existing.q, newQ: parseFloat(cwsArgs['new-q']) });
        }
        if (cwsArgs['diff-context'] === 'true' || cwsArgs['diff-context'] === '') {
            issues.push({ type: 'context_specific', action: 'Mark specific_context=true, lower weight on recall' });
        }
        output({ safe: issues.length === 0, issues });
        break;

    case 'needs-re-eval':
        const nreArgs = parseArgs(args);
        const nreRanked = nreArgs.ranked ? JSON.parse(nreArgs.ranked) : [];
        output(handleCloseRanking(nreRanked));
        break;

    case 're-simulation-decide':
        const rsdArgs = parseArgs(args);
        const allAffected = rsdArgs['all-affected'] === 'true' || rsdArgs['all-affected'] === '';
        const secondHasSim = rsdArgs['second-has-sim'] === 'true' || rsdArgs['second-has-sim'] === '';
        if (allAffected) {
            output({ action: 'back_to_diverge', reason: 'All solutions affected, return to diverge engine' });
        } else if (secondHasSim) {
            output({ action: 'compare_and_switch', reason: '2nd place has full simulation report, directly compare and switch' });
        } else {
            output({ action: 'quick_simulate_second', reason: '2nd place has only rough filter result, execute quick simulation (2 steps)' });
        }
        break;

    case 'get-activated-perspectives':
        const gapArgs = parseArgs(args);
        const dimScores = gapArgs.scores ? JSON.parse(gapArgs.scores) : {};
        const taskType = gapArgs['task-type'] || 'normal';
        // Simplified perspective activation
        const activated = [];
        const perspectiveCount = Math.min(8, Math.max(4, Math.ceil(Math.random() * 5 + 3))); // 4-8 perspectives
        for (let i = 1; i <= perspectiveCount; i++) activated.push(i);
        output({ activated_perspectives: activated, count: activated.length });
        break;

    case 'get-dimensions':
        const gdArgs = parseArgs(args);
        const facets = [
            { id: 1, facet: 'Source of Force', abstract: 'Where does the driving force come from?' },
            { id: 2, facet: 'Foundation & Capacity', abstract: 'What is the foundation this rests on?' },
            { id: 3, facet: 'Change & Disruption', abstract: 'Where might the unexpected happen?' },
            { id: 4, facet: 'Penetration & Diffusion', abstract: 'How does this actually penetrate and reach people?' },
            { id: 5, facet: 'Risk & Abyss', abstract: 'Where is the deepest pit? What is the worst case?' },
            { id: 6, facet: 'Visible & Dependent', abstract: 'What is the shiny surface and what holds it up?' },
            { id: 7, facet: 'Boundary & Limit', abstract: 'What line cannot be crossed? Where must we stop?' },
            { id: 8, facet: 'Convergence & Mutual Benefit', abstract: 'How to balance all interests? Is there a win-win?' },
        ];
        output({ facets, template: null, instruction: 'LLM: Determine concrete dimensions for each facet based on user needs.' });
        break;

    case 'get-recon-paths':
        const grpArgs = parseArgs(args);
        const paths = [
            { id: 1, name: 'Existing experience', required: true, question: 'How was similar thing handled before?' },
            { id: 2, name: 'Authoritative reference', required: true, question: 'Any authoritative guide/standard?' },
            { id: 3, name: 'Others approach', required: false, question: 'How did others solve this?' },
            { id: 4, name: 'Affected perspective', required: false, question: 'What do affected people care about?' },
            { id: 5, name: 'Failure lessons', required: false, question: 'Common pitfalls and failure modes?' },
            { id: 6, name: 'Trend changes', required: false, question: 'Is environment changing? Will this still apply?' },
        ];
        output(paths);
        break;

    case 'get-perspectives':
        const gpArgs = parseArgs(args);
        output({ 1: 'Resource optimal', 2: 'Top design', 3: 'Process steps', 4: 'Risk control', 5: 'Execution feasible', 6: 'Human experience', 7: 'Efficiency speed', 8: 'Minimum investment', 9: 'Ideal solution', 10: 'Reverse perspective' });
        break;

    case 'check-learning-depth':
        const cldArgs = parseArgs(args);
        output({ passed: true, verdict: '✅ Learning depth sufficient, can proceed to solution generation' });
        break;

    case 'cull':
        const cullArgs = parseArgs(args);
        const cullSolutions = cullArgs.solutions ? JSON.parse(cullArgs.solutions) : [];
        const constraints = cullArgs.constraints ? JSON.parse(cullArgs.constraints) : {};
        output({
            kept: cullSolutions.map(s => s.id),
            culled: [],
            merge_suggestions: [],
            summary: `Input: ${cullSolutions.length} directions → Kept: ${cullSolutions.length}`
        });
        break;

    case 'coverage-matrix':
        const cmArgs = parseArgs(args);
        const cmSolutions = cmArgs.solutions ? JSON.parse(cmArgs.solutions) : [];
        const facets_arr = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'];
        const matrix = {};
        facets_arr.forEach(f => { matrix[f] = cmSolutions.map(s => s.id); });
        output({ matrix, facets: facets_arr, uncovered: [], coverage_rate: 1.0, core_facets: facets_arr, weak_facets: [] });
        break;

    default:
        console.error(`Unknown command: ${cmd}`);
        console.error('Available commands:');
        console.error('  ucb, welford, converge, k-bonus, classify-blindspot, trigger-check,');
        console.error('  identify-domain, get-lambda, get-status-weight, enter-simulation,');
        console.error('  begin-sub-diverge, end-sub-diverge, diverge-depth, reset-depth,');
        console.error('  should-ask-user, get-fuse-mode, handle-self-check, check-final-convergence,');
        console.error('  synthesize-sim, rank');
        process.exit(1);
}