#!/usr/bin/env bash
# Ponder demo: 直接回答 vs Ponder 推理管线 对比
# Usage: bash scripts/demo-comparison.sh
# Record with: asciinema rec -c "bash scripts/demo-comparison.sh" demo.cast

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GRAY='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

clear
echo ""
echo -e "${BOLD}🧠 Ponder Demo: 直接回答 vs 结构化推理${NC}"
echo -e "${GRAY}问题: 分析一个面向独立开发者的SaaS工具创业项目的竞争格局${NC}"
echo ""
sleep 2

# ─── 左侧：直接回答 ───
echo -e "${YELLOW}┌──────────────────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${YELLOW}│${NC}  ${BOLD}❌ 直接问 LLM${NC}                                                          ${YELLOW}│${NC}"
echo -e "${YELLOW}├──────────────────────────────────────────────────────────────────────────────┤${NC}"
echo -e "${YELLOW}│${NC}                                                                              ${YELLOW}│${NC}"
echo -e "${YELLOW}│${NC}  独立开发者SaaS工具市场竞争激烈。主要竞争对手包括Notion(笔记/文档)、               ${YELLOW}│${NC}"
echo -e "${YELLOW}│${NC}  Canva(设计)、Vercel(部署)、GitHub(代码托管)。成功的关键是找到细分垂直              ${YELLOW}│${NC}"
echo -e "${YELLOW}│${NC}  领域。建议做差异化竞争。                                                         ${YELLOW}│${NC}"
echo -e "${YELLOW}│${NC}                                                                              ${YELLOW}│${NC}"
echo -e "${YELLOW}│${NC}  ${GRAY}⚠️ 泛泛而谈，没有具体数据支撑，没有盲点分析，没有方案对比。${NC}                   ${YELLOW}│${NC}"
echo -e "${YELLOW}│${NC}  ${GRAY}   这种回答放在任何行业、任何时间都成立。价格: 0 次推理。${NC}                     ${YELLOW}│${NC}"
echo -e "${YELLOW}│${NC}                                                                              ${YELLOW}│${NC}"
echo -e "${YELLOW}└──────────────────────────────────────────────────────────────────────────────┘${NC}"
echo ""
sleep 3

# ─── 中间分隔 ───
echo -e "                          ${BOLD}⬇  vs  ⬇${NC}"
echo ""
sleep 2

# ─── 右侧：Ponder 管线 ───
echo -e "${GREEN}┌──────────────────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}│${NC}  ${BOLD}✅ Ponder 跑完 9 道工序${NC}                                                    ${GREEN}│${NC}"
echo -e "${GREEN}├──────────────────────────────────────────────────────────────────────────────┤${NC}"
echo -e "${GREEN}│${NC}                                                                              ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}  ${BOLD}① 采访 → 五诊画像${NC}                                                          ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   天(时机): 2026年SaaS市场竞争成熟期,垂直领域仍有窗口                               ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   地(资源): 单人团队,月预算有限,开发经验5年                                          ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   人(用户): 独立开发者,需要快速验证想法                                               ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   法(规则): 无合规负担,但支付渠道受限                                                ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   物(本质): 不是"做产品"而是"验证商业模式"                                            ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}                                                                              ${GREEN}│${NC}"
sleep 1
echo -e "${GREEN}│${NC}  ${BOLD}② 神思 → 反直觉发现${NC}                                                        ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   最大的竞争者不是Canva/Notion——是"用户用Excel/邮件自己解决问题"                         ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   独立开发者真正的护城河不是功能,是社区认同感                                           ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}                                                                              ${GREEN}│${NC}"
sleep 1
echo -e "${GREEN}│${NC}  ${BOLD}③ 发散 → 6视角扫描${NC}                                                          ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   宏观: SaaS成熟期,垂直SaaS正在取代水平SaaS                                        ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   微观: 独立开发者最痛的不是工具不够,是信息过载                                       ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   时间压缩: 如果只有一天,先上线一个支付页面试转化率                                    ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   时间扩展: 长期来看,数据沉淀比功能堆砌值钱得多                                        ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   顺自然: 如果不主动推广,产品三个月后0用户                                            ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   无我: 系统的最优解不是做产品,是做内容→引流→验证→迭代                                   ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}                                                                              ${GREEN}│${NC}"
sleep 1
echo -e "${GREEN}│${NC}  ${BOLD}④ 八卦镜 → 盲点发现${NC}                                                        ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   ⚠️ 盲点1: 假设独立开发者愿意付费——实际中国独立开发者的付费意愿极低                   ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   ⚠️ 盲点2: 忽略"已有开源替代品"对定价的天花板效应                                   ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   ⚠️ 盲点3: 以为产品力最重要——实际上渠道和分发能力才是短板                               ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}                                                                              ${GREEN}│${NC}"
sleep 1
echo -e "${GREEN}│${NC}  ${BOLD}⑤ 方案 → 5个差异化策略${NC}                                                      ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   A. 完全免费+咨询变现  B. 低配版+出海定价  C. 开源核心+付费云                          ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   D. 专注API+不做UI  E. 做内容社区而非工具                                            ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}                                                                              ${GREEN}│${NC}"
sleep 1
echo -e "${GREEN}│${NC}  ${BOLD}⑥ 推演 → 方案模拟${NC}                                                          ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   方案A(免费+咨询): V=0.78 短期有收入,但不可规模化                                      ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   方案C(开源+云): V=0.85 长期最佳,但需要社区运营能力                                    ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   方案E(内容社区): V=0.72 最轻启动,但见效慢                                           ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}                                                                              ${GREEN}│${NC}"
sleep 1
echo -e "${GREEN}│${NC}  ${BOLD}⑦ 辩论 → 方案攻防${NC}                                                          ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   C攻击A:"免费没有护城河,用户走了你就死了"                                             ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   A反击C:"开源运营比你想象的耗时间,单人团队扛不住"                                      ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   结论: 方案C扛住攻击,推荐优先执行,但需搭配阶段A的快速验证                                ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}                                                                              ${GREEN}│${NC}"
sleep 1
echo -e "${GREEN}│${NC}  ${BOLD}⑧ 用户确认 → 风险验收${NC}                                                       ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}   推荐方案C(开源+云),但依赖你持续输出内容的意愿,确认吗?                 ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}                                                                              ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}  ${GRAY}✅ 每一步有数据支撑,有盲点暴露,有方案对抗,有风险评估。${NC}                          ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}  ${GRAY}   价格: 9道工序 × 多重agent。但结论你敢信。${NC}                                  ${GREEN}│${NC}"
echo -e "${GREEN}│${NC}                                                                              ${GREEN}│${NC}"
echo -e "${GREEN}└──────────────────────────────────────────────────────────────────────────────┘${NC}"
echo ""
sleep 2
echo -e "${BOLD}💡 结论:Ponder 不是答得更快,是答得更可信。${NC}"
echo -e "${GRAY}每一次分析的结果自动积累。下一次,系统会记得这次发现的数据和结论。${NC}"
echo ""
