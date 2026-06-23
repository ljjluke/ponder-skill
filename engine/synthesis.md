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
3. For each blindspot: need supplement? (based on feature complexity / user-facing vs backend)
4. Decision: all covered → pass | 1st place biased → supplement | 1st covers well → annotate

---

## Re-simulate Mode
