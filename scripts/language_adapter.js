#!/usr/bin/env node
/**
 * Language Adapter for MCTS-TD Planner (Node.js Version)
 *
 * Provides:
 *   1. User language detection
 *   2. Fixed label translations
 *   3. Output format templates in multiple languages
 *   4. Language state tracking
 *
 * Usage:
 *   node language_adapter.js detect "帮我实现登录"
 *   node language_adapter.js labels zh
 *   node language_adapter.js template review_map zh "登录功能" "软件工程"
 *   node language_adapter.js state set zh
 *   node language_adapter.js state check
 */

// ============================================================================
// Language Detection
// ============================================================================

function detectLanguage(message) {
    if (!message) {
        return { lang: 'en', confidence: 1.0, breakdown: { zh: 0, ja: 0, ko: 0, en: 0 } };
    }

    const counts = { zh: 0, ja: 0, ko: 0, en: 0 };

    for (const char of message) {
        const code = char.codePointAt(0);

        // English: ASCII letters
        if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
            counts.en++;
        }
        // Chinese: CJK Unified Ideographs
        else if (code >= 0x4E00 && code <= 0x9FFF) {
            counts.zh++;
        }
        // Japanese: Hiragana and Katakana
        else if ((code >= 0x3040 && code <= 0x309F) || (code >= 0x30A0 && code <= 0x30FF)) {
            counts.ja++;
        }
        // Korean: Hangul
        else if (code >= 0xAC00 && code <= 0xD7AF) {
            counts.ko++;
        }
    }

    const total = counts.zh + counts.ja + counts.ko + counts.en;
    let lang = 'en';
    let maxCount = counts.en;

    if (counts.zh > maxCount) { lang = 'zh'; maxCount = counts.zh; }
    if (counts.ja > maxCount) { lang = 'ja'; maxCount = counts.ja; }
    if (counts.ko > maxCount) { lang = 'ko'; maxCount = counts.ko; }

    const confidence = total > 0 ? maxCount / total : 1.0;

    return {
        lang,
        confidence: Math.round(confidence * 100) / 100,
        breakdown: counts
    };
}

// ============================================================================
// Labels
// ============================================================================

const LABELS = {
    en: {
        review_map: 'Eight-Facet Review Map',
        recon_report: 'Reconnaissance Report',
        solution_list: 'Converged Solution List',
        decision_report: 'MCTS-TD Decision Report',
        mcts_conclusion: 'MCTS Tree Search Conclusion',
        confirm: 'Confirm',
        continue: 'Continue',
        add_solution: 'Add solution',
        remove_solution: 'Remove solution',
        just_do: 'Skip simulation, execute directly',
        F1: 'Source of Force',
        F2: 'Foundation & Capacity',
        F3: 'Change & Disruption',
        F4: 'Penetration & Diffusion',
        F5: 'Risk & Abyss',
        F6: 'Visible & Dependent',
        F7: 'Boundary & Limit',
        F8: 'Convergence & Mutual Benefit',
        solution: 'Solution',
        risk: 'Risk',
        confidence: 'Confidence',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
        recommended: 'Recommended',
        best_path: 'Best Path',
        main_risk: 'Main Risk',
    },
    zh: {
        review_map: '八面审视地图',
        recon_report: '侦查报告',
        solution_list: '收敛方案列表',
        decision_report: 'MCTS-TD 决策报告',
        mcts_conclusion: 'MCTS 树搜索结论',
        confirm: '确认',
        continue: '继续',
        add_solution: '添加方案',
        remove_solution: '移除方案',
        just_do: '跳过推演，直接执行',
        F1: '力量之源',
        F2: '根基承载',
        F3: '变动突破',
        F4: '渗透传播',
        F5: '风险深渊',
        F6: '显眼依附',
        F7: '边界止步',
        F8: '汇聚共赢',
        solution: '方案',
        risk: '风险',
        confidence: '信心',
        high: '高',
        medium: '中',
        low: '低',
        recommended: '推荐',
        best_path: '最佳路径',
        main_risk: '主要风险',
    },
    ja: {
        review_map: '八面審視マップ',
        recon_report: '偵察レポート',
        solution_list: '収束ソリューションリスト',
        decision_report: 'MCTS-TD 決定レポート',
        mcts_conclusion: 'MCTS ツリー検索結論',
        confirm: '確認',
        continue: '続行',
        add_solution: 'ソリューション追加',
        remove_solution: 'ソリューション削除',
        just_do: 'シミュレーション省略、直接実行',
        F1: '力の源',
        F2: '基盤と容量',
        F3: '変化と破壊',
        F4: '浸透と拡散',
        F5: 'リスクと深淵',
        F6: '可視と依存',
        F7: '境界と限界',
        F8: '収束と相互利益',
        solution: 'ソリューション',
        risk: 'リスク',
        confidence: '信頼度',
        high: '高',
        medium: '中',
        low: '低',
        recommended: '推奨',
        best_path: '最適パス',
        main_risk: '主なリスク',
    },
    ko: {
        review_map: '팔면심사지도',
        recon_report: '정찰 보고서',
        solution_list: '수렴 솔루션 목록',
        decision_report: 'MCTS-TD 결정 보고서',
        mcts_conclusion: 'MCTS 트리 검색 결론',
        confirm: '확인',
        continue: '계속',
        add_solution: '솔루션 추가',
        remove_solution: '솔루션 제거',
        just_do: '시뮬레이션 건너뛰고 직접 실행',
        F1: '힘의 원천',
        F2: '기반과 용량',
        F3: '변화와 파괴',
        F4: '침투와 확산',
        F5: '위험과 심연',
        F6: '가시적 의존',
        F7: '경계와 한계',
        F8: '수렴과 상호이익',
        solution: '솔루션',
        risk: '위험',
        confidence: '신뢰도',
        high: '높음',
        medium: '중간',
        low: '낮음',
        recommended: '추천',
        best_path: '최적 경로',
        main_risk: '주요 위험',
    },
};

function getLabels(lang) {
    return LABELS[lang] || LABELS.en;
}

function getLabel(lang, key) {
    const labels = getLabels(lang);
    return labels[key] || key;
}

// ============================================================================
// Templates
// ============================================================================

function formatReviewMapHeader(lang, task, domain) {
    const label = getLabel(lang, 'review_map');
    return `═══════════════════════════════════════
 【${label}】${task} · ${domain}
═══════════════════════════════════════`;
}

function formatSolutionConfirmation(lang, numSolutions, facetsCovered) {
    const labels = getLabels(lang);

    const templates = {
        en: `────────────────────────────
 【${labels.solution_list} Confirmation】

 Above are ${numSolutions} solutions from the diverge engine (covering ${facetsCovered}/8 decision facets).

 Next: MCTS tree search simulation for each solution.

 ${labels.confirm}:
   ✅ "${labels.continue}" → Enter simulation
   ➕ "${labels.add_solution}" → Add solution
   ➖ "${labels.remove_solution}" → Remove solution
   ⚡ "${labels.just_do}" → Skip simulation, execute directly
 ────────────────────────────`,
        zh: `────────────────────────────
 【${labels.solution_list}确认】

 发散引擎生成了 ${numSolutions} 个方案（覆盖 ${facetsCovered}/8 个决策面）。

 接下来：对每个方案进行 MCTS 树搜索推演。

 ${labels.confirm}:
   ✅ "${labels.continue}" → 进入推演引擎
   ➕ "${labels.add_solution}" → 补充方案
   ➖ "${labels.remove_solution}" → 移除
   ⚡ "${labels.just_do}" → 跳过推演，直接执行
 ────────────────────────────`,
        ja: `────────────────────────────
 【${labels.solution_list}確認】

 ダイバージェンスエンジンから${numSolutions}件のソリューション（${facetsCovered}/8決定面をカバー）。

 次へ：各ソリューションのMCTSツリー検索シミュレーション。

 ${labels.confirm}:
   ✅ "${labels.continue}" → シミュレーション開始
   ➕ "${labels.add_solution}" → ソリューション追加
   ➖ "${labels.remove_solution}" → ソリューション削除
   ⚡ "${labels.just_do}" → シミュレーション省略、直接実行
 ────────────────────────────`,
        ko: `────────────────────────────
 【${labels.solution_list} 확인】

 발산 엔진에서 ${numSolutions}개 솔루션 생성 (${facetsCovered}/8 결정면 커버).

 다음: 각 솔루션에 대한 MCTS 트리 검색 시뮬레이션.

 ${labels.confirm}:
   ✅ "${labels.continue}" → 시뮬레이션 시작
   ➕ "${labels.add_solution}" → 솔루션 추가
   ➖ "${labels.remove_solution}" → 솔루션 제거
   ⚡ "${labels.just_do}" → 시뮬레이션 건너뛰고 직접 실행
 ────────────────────────────`,
    };

    return templates[lang] || templates.en;
}

function formatDecisionReportHeader(lang, task, date, iterations) {
    const label = getLabel(lang, 'decision_report');
    return `═══════════════════════════════════════
 【${label}】${task} · ${date} · ${iterations} iterations
═══════════════════════════════════════`;
}

// ============================================================================
// State Management
// ============================================================================

const STATE_FILE = '/tmp/mcts_language_state.txt';
const fs = require('fs');

function setState(lang) {
    fs.writeFileSync(STATE_FILE, lang);
    return { lang, status: 'set' };
}

function getState() {
    try {
        return fs.readFileSync(STATE_FILE, 'utf8').trim();
    } catch {
        return 'en';
    }
}

function checkState(expected) {
    const current = getState();
    return { match: !expected || current === expected, current };
}

// ============================================================================
// CLI
// ============================================================================

const [,, command, ...args] = process.argv;

function output(data) {
    if (typeof data === 'object') {
        console.log(JSON.stringify(data, null, 2));
    } else {
        console.log(data);
    }
}

switch (command) {
    case 'detect':
        if (!args[0]) {
            console.error('Usage: node language_adapter.js detect <message>');
            process.exit(1);
        }
        output(detectLanguage(args[0]));
        break;

    case 'labels':
        output(getLabels(args[0] || 'en'));
        break;

    case 'label':
        if (!args[0] || !args[1]) {
            console.error('Usage: node language_adapter.js label <lang> <key>');
            process.exit(1);
        }
        output(getLabel(args[0], args[1]));
        break;

    case 'template':
        const phase = args[0];
        const lang = args[1] || 'en';
        switch (phase) {
            case 'review_map':
                output(formatReviewMapHeader(lang, args[2] || '', args[3] || ''));
                break;
            case 'solution_list':
                output(formatSolutionConfirmation(lang, parseInt(args[2]) || 0, parseInt(args[3]) || 0));
                break;
            case 'decision_report':
                output(formatDecisionReportHeader(lang, args[2] || '', args[3] || '', args[4] || ''));
                break;
            default:
                console.error('Unknown phase:', phase);
                console.error('Available: review_map, solution_list, decision_report');
                process.exit(1);
        }
        break;

    case 'state':
        const action = args[0];
        switch (action) {
            case 'set':
                output(setState(args[1] || 'en'));
                break;
            case 'get':
                output(getState());
                break;
            case 'check':
                output(checkState(args[1]));
                break;
            default:
                console.error('Usage: node language_adapter.js state [set|get|check] [lang]');
                process.exit(1);
        }
        break;

    default:
        console.error('Usage: node language_adapter.js <command> [args...]');
        console.error('Commands:');
        console.error('  detect <message>           - Detect language from message');
        console.error('  labels <lang>              - Get all labels for language');
        console.error('  label <lang> <key>         - Get single label');
        console.error('  template <phase> <lang>... - Format phase template');
        console.error('  state [set|get|check]      - Manage language state');
        process.exit(1);
}
