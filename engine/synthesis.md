## Step 3.6: Blindspot Audit + 言意 Gap

### Cultural Sub-Lens Coverage

1. Extract blindspots from diverge phase's sub-lenses
2. Check each against ranked solutions → covered/missed
3. 3+ missed → WARNING → return to converge | 1-2 → annotate in report

### 言意 (Word-Meaning) Gap Detection

**⛔ Scan for 3 specific mismatches between user statements and our interpretations:**

① **Literal vs Metaphorical**: User said X literally, but we interpreted as metaphor? Or vice versa?
   - "Make it fast" → faster delivery timeline? Or "don't make people wait"?
   - "Must be robust" → zero failure tolerance? Or "shouldn't break easily"?

② **Same words, different intent**: User and we use the same term but mean different things.
   - "Simple" → minimal steps? Easy to explain? Quick to implement?
   - "Secure" → protected? Verified? Documented?

③ **Unstated expectations**: User didn't say it, but we assumed it (or missed it).
   - Did we assume a specific methodology or toolset without confirmation?
   - Did we ignore an implicit "it should work like [familiar process]"?

**Resolution rules:**
- Same yi different yan → merge solutions (false diversity)
- Same yan different yi → keep both (fundamental disagreement, need user clarification)
- Gap affects ranking → re-simulate → mark for user confirmation

Code: yan-yi-check --statements '<JSON>' --interpretations '<JSON>'

### Blindspot Audit Framework

1. List perspectives of all solutions
2. Compare with Eight-Facet + Sub-Lens coverage → find missing dimensions
3. For each blindspot: need supplement? (based on importance / direct vs indirect impact)
4. Decision: all covered → pass | 1st place biased → supplement | 1st covers well → annotate

---

## Re-simulate Mode

---

## 结论自反 — Meta-Questioning of the Conclusion

**学术来源**: 黑格尔辩证法「正题→反题→合题→再否定」+ 胡塞尔现象学「悬置」

**为什么要这一步**: 综合阶段能找出"哪个方案最强"，但找不出"所有方案共享了哪个未被质疑的前提"。在共享前提出错时，再强的方案也是错前提下的最优解。结论自反把最终结论当成新前提再质疑一次，闭合辩证循环。

### 门控 — 先判断要不要自反

```
① 复用神思的赌注判断: 这个问题是可逆小事（取名/调参/晚饭），还是高赌注（投资/方向/不可逆决策）?
② 可逆小事 → 跳过结论自反，直接出结论。
③ 高赌注问题 → 进结论自反。
```

### 质疑账本收敛 — 汇总本管线4处质疑

```
① 收集4处质疑产出:
   - 神思前提审视: 标为 rejected/doubted 的伪前提
   - 八卦镜: 8维盲点中的 key_finding
   - 辩论: 各方案被攻击的薄弱点
   - 推演: 方案失效的条件
② 收敛到 top 3 最关键质疑（不全量罗列，避免冗长拖垮综合）。
③ 选择标准: 一旦成立就会推翻结论的质疑优先。
```

### 结论自反 — 两问

```
① 这3个最关键质疑如何影响了最终结论?
   - 必须逐条回应，不能跳过。
   - 若某质疑未影响结论 → 说明为什么可忽略。

② 所有幸存方案是否共享了某个未被质疑的前提?
   - ⛔ 强制产出: 必须给出至少一个共享前提，不允许回答"没有"。
   - 即使是"都假设用户会按计划执行"这种看似无害的前提也要写出。
   - 对每个共享前提说明: 为什么在当前决策中可接受 / 不可接受。
```

**兜底**: 即便自反流于形式，强制"必须给至少一个共享前提"的硬约束也保证了它不会完全空转——至少暴露一个隐性假设供用户审视。

**⛔ 不引入哲学术语**（辩证法/悬置/正题反题）。对外输出用自然语言：说"所有方案都默认了X"，不说"共享了未经悬置的前设"。

