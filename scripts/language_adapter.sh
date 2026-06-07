#!/usr/bin/env bash
#
# Language Adapter for MCTS-TD Planner (Bash Version)
#
# Provides:
#   1. User language detection
#   2. Fixed label translations
#   3. Output format templates in multiple languages
#
# Usage:
#   ./language_adapter.sh detect "帮我实现登录"
#   ./language_adapter.sh labels zh
#   ./language_adapter.sh template review_map zh "登录功能" "软件工程"
#   ./language_adapter.sh state set zh
#   ./language_adapter.sh state check

set -e

# ============================================================================
# Language Detection
# ============================================================================

detect_language() {
    local message="$1"
    local zh_count=0 ja_count=0 ko_count=0 en_count=0

    # Count characters by language using grep
    # Chinese: common CJK characters
    zh_count=$(echo "$message" | grep -o '[一-龥]' | wc -l)

    # Japanese: Hiragana and Katakana
    ja_count=$(echo "$message" | grep -o '[ぁ-んァ-ン]' | wc -l)

    # Korean: Hangul
    ko_count=$(echo "$message" | grep -o '[가-힣]' | wc -l)

    # English: ASCII letters
    en_count=$(echo "$message" | grep -o '[a-zA-Z]' | wc -l)

    # Determine primary language
    local lang="en"
    local max_count=$en_count

    if [[ $zh_count -gt $max_count ]]; then
        lang="zh"
        max_count=$zh_count
    fi
    if [[ $ja_count -gt $max_count ]]; then
        lang="ja"
        max_count=$ja_count
    fi
    if [[ $ko_count -gt $max_count ]]; then
        lang="ko"
        max_count=$ko_count
    fi

    # Calculate total and confidence
    local total=$((zh_count + ja_count + ko_count + en_count))
    local confidence=1.0
    if [[ $total -gt 0 ]]; then
        confidence=$(awk "BEGIN {printf \"%.2f\", $max_count / $total}")
    fi

    echo "{\"lang\":\"$lang\",\"confidence\":$confidence,\"breakdown\":{\"zh\":$zh_count,\"ja\":$ja_count,\"ko\":$ko_count,\"en\":$en_count}}"
}

# ============================================================================
# Labels (stored as JSON)
# ============================================================================

LABELS_EN='{
  "review_map": "Eight-Facet Review Map",
  "recon_report": "Reconnaissance Report",
  "solution_list": "Converged Solution List",
  "decision_report": "MCTS-TD Decision Report",
  "mcts_conclusion": "MCTS Tree Search Conclusion",
  "confirm": "Confirm",
  "continue": "Continue",
  "add_solution": "Add solution",
  "remove_solution": "Remove solution",
  "just_do": "Skip simulation, execute directly",
  "F1": "Source of Force",
  "F2": "Foundation & Capacity",
  "F3": "Change & Disruption",
  "F4": "Penetration & Diffusion",
  "F5": "Risk & Abyss",
  "F6": "Visible & Dependent",
  "F7": "Boundary & Limit",
  "F8": "Convergence & Mutual Benefit",
  "solution": "Solution",
  "risk": "Risk",
  "confidence": "Confidence",
  "high": "High",
  "medium": "Medium",
  "low": "Low",
  "recommended": "Recommended",
  "best_path": "Best Path",
  "main_risk": "Main Risk"
}'

LABELS_ZH='{
  "review_map": "八面审视地图",
  "recon_report": "侦查报告",
  "solution_list": "收敛方案列表",
  "decision_report": "MCTS-TD 决策报告",
  "mcts_conclusion": "MCTS 树搜索结论",
  "confirm": "确认",
  "continue": "继续",
  "add_solution": "添加方案",
  "remove_solution": "移除方案",
  "just_do": "跳过推演，直接执行",
  "F1": "力量之源",
  "F2": "根基承载",
  "F3": "变动突破",
  "F4": "渗透传播",
  "F5": "风险深渊",
  "F6": "显眼依附",
  "F7": "边界止步",
  "F8": "汇聚共赢",
  "solution": "方案",
  "risk": "风险",
  "confidence": "信心",
  "high": "高",
  "medium": "中",
  "low": "低",
  "recommended": "推荐",
  "best_path": "最佳路径",
  "main_risk": "主要风险"
}'

LABELS_JA='{
  "review_map": "八面審視マップ",
  "recon_report": "偵察レポート",
  "solution_list": "収束ソリューションリスト",
  "decision_report": "MCTS-TD 決定レポート",
  "mcts_conclusion": "MCTS ツリー検索結論",
  "confirm": "確認",
  "continue": "続行",
  "add_solution": "ソリューション追加",
  "remove_solution": "ソリューション削除",
  "just_do": "シミュレーション省略、直接実行",
  "F1": "力の源",
  "F2": "基盤と容量",
  "F3": "変化と破壊",
  "F4": "浸透と拡散",
  "F5": "リスクと深淵",
  "F6": "可視と依存",
  "F7": "境界と限界",
  "F8": "収束と相互利益"
}'

LABELS_KO='{
  "review_map": "팔면심사지도",
  "recon_report": "정찰 보고서",
  "solution_list": "수렴 솔루션 목록",
  "decision_report": "MCTS-TD 결정 보고서",
  "mcts_conclusion": "MCTS 트리 검색 결론",
  "confirm": "확인",
  "continue": "계속",
  "add_solution": "솔루션 추가",
  "remove_solution": "솔루션 제거",
  "just_do": "시뮬레이션 건너뛰고 직접 실행",
  "F1": "힘의 원천",
  "F2": "기반과 용량",
  "F3": "변화와 파괴",
  "F4": "침투와 확산",
  "F5": "위험과 심연",
  "F6": "가시적 의존",
  "F7": "경계와 한계",
  "F8": "수렴과 상호이익"
}'

get_labels() {
    local lang="$1"
    case "$lang" in
        zh) echo "$LABELS_ZH" ;;
        ja) echo "$LABELS_JA" ;;
        ko) echo "$LABELS_KO" ;;
        *)  echo "$LABELS_EN" ;;
    esac
}

get_label() {
    local lang="$1"
    local key="$2"
    get_labels "$lang" | jq -r ".\"$key\" // \"$key\""
}

# ============================================================================
# Templates
# ============================================================================

format_review_map_header() {
    local lang="$1"
    local task="$2"
    local domain="$3"
    local label=$(get_label "$lang" "review_map")
    echo "═══════════════════════════════════════"
    echo " 【$label】$task · $domain"
    echo "═══════════════════════════════════════"
}

format_solution_confirmation() {
    local lang="$1"
    local num_solutions="$2"
    local facets_covered="$3"

    local labels=$(get_labels "$lang")
    local solution_list=$(echo "$labels" | jq -r '.solution_list')
    local confirm=$(echo "$labels" | jq -r '.confirm')
    local continue_label=$(echo "$labels" | jq -r '.continue')
    local add=$(echo "$labels" | jq -r '.add_solution')
    local remove=$(echo "$labels" | jq -r '.remove_solution')
    local just_do=$(echo "$labels" | jq -r '.just_do')

    case "$lang" in
        zh)
            cat << EOF
────────────────────────────
 【$solution_list 确认】

 发散引擎生成了 $num_solutions 个方案（覆盖 $facets_covered/8 个决策面）。

 接下来：对每个方案进行 MCTS 树搜索推演。

 $confirm:
   ✅ "$continue_label" → 进入推演引擎
   ➕ "$add" → 补充方案
   ➖ "$remove" → 移除
   ⚡ "$just_do" → 跳过推演，直接执行
 ────────────────────────────
EOF
            ;;
        ja)
            cat << EOF
────────────────────────────
 【$solution_list 確認】

 ダイバージェンスエンジンから${num_solutions}件のソリューション（${facets_covered}/8決定面をカバー）。

 次へ：各ソリューションのMCTSツリー検索シミュレーション。

 $confirm:
   ✅ "$continue_label" → シミュレーション開始
   ➕ "$add" → ソリューション追加
   ➖ "$remove" → ソリューション削除
   ⚡ "$just_do" → シミュレーション省略、直接実行
 ────────────────────────────
EOF
            ;;
        ko)
            cat << EOF
────────────────────────────
 【$solution_list 확인】

 발산 엔진에서 ${num_solutions}개 솔루션 생성 (${facets_covered}/8 결정면 커버).

 다음: 각 솔루션에 대한 MCTS 트리 검색 시뮬레이션.

 $confirm:
   ✅ "$continue_label" → 시뮬레이션 시작
   ➕ "$add" → 솔루션 추가
   ➖ "$remove" → 솔루션 제거
   ⚡ "$just_do" → 시뮬레이션 건너뛰고 직접 실행
 ────────────────────────────
EOF
            ;;
        *)
            cat << EOF
────────────────────────────
 【$solution_list Confirmation】

 Above are $num_solutions solutions from the diverge engine (covering $facets_covered/8 decision facets).

 Next: MCTS tree search simulation for each solution.

 $confirm:
   ✅ "$continue_label" → Enter simulation
   ➕ "$add" → Add solution
   ➖ "$remove" → Remove solution
   ⚡ "$just_do" → Skip simulation, execute directly
 ────────────────────────────
EOF
            ;;
    esac
}

format_decision_report_header() {
    local lang="$1"
    local task="$2"
    local date="$3"
    local iterations="$4"
    local label=$(get_label "$lang" "decision_report")
    echo "═══════════════════════════════════════"
    echo " 【$label】$task · $date · $iterations iterations"
    echo "═══════════════════════════════════════"
}

# ============================================================================
# State Management (using temp file)
# ============================================================================

STATE_FILE="/tmp/mcts_language_state.txt"

state_set() {
    local lang="$1"
    echo "$lang" > "$STATE_FILE"
    echo "{\"lang\":\"$lang\",\"status\":\"set\"}"
}

state_get() {
    if [[ -f "$STATE_FILE" ]]; then
        cat "$STATE_FILE"
    else
        echo "en"
    fi
}

state_check() {
    local current=$(state_get)
    echo "{\"match\":true,\"current\":\"$current\"}"
}

# ============================================================================
# CLI
# ============================================================================

case "${1:-}" in
    detect)
        if [[ -z "${2:-}" ]]; then
            echo "Usage: $0 detect <message>" >&2
            exit 1
        fi
        detect_language "$2"
        ;;
    labels)
        get_labels "${2:-en}"
        ;;
    label)
        if [[ -z "${2:-}" || -z "${3:-}" ]]; then
            echo "Usage: $0 label <lang> <key>" >&2
            exit 1
        fi
        get_label "$2" "$3"
        ;;
    template)
        phase="${2:-}"
        lang="${3:-en}"
        case "$phase" in
            review_map)
                format_review_map_header "$lang" "${4:-}" "${5:-}"
                ;;
            solution_list)
                format_solution_confirmation "$lang" "${4:-0}" "${5:-0}"
                ;;
            decision_report)
                format_decision_report_header "$lang" "${4:-}" "${5:-}" "${6:-}"
                ;;
            *)
                echo "Unknown phase: $phase" >&2
                echo "Available: review_map, solution_list, decision_report" >&2
                exit 1
                ;;
        esac
        ;;
    state)
        action="${2:-}"
        case "$action" in
            set)
                state_set "${3:-en}"
                ;;
            get)
                state_get
                ;;
            check)
                state_check
                ;;
            *)
                echo "Usage: $0 state [set|get|check] [lang]" >&2
                exit 1
                ;;
        esac
        ;;
    *)
        echo "Usage: $0 <command> [args...]" >&2
        echo "Commands:" >&2
        echo "  detect <message>           - Detect language from message" >&2
        echo "  labels <lang>              - Get all labels for language" >&2
        echo "  label <lang> <key>         - Get single label" >&2
        echo "  template <phase> <lang>... - Format phase template" >&2
        echo "  state [set|get|check]      - Manage language state" >&2
        exit 1
        ;;
esac
