## 自我连续性 — 框架的跨会话记忆与叙事同一性 (Self-Continuity)

**学术来源**: 洛克(John Locke)「人格同一性是记忆的连续性」+ 利科(Paul Ricoeur)「叙事同一性」(narrative identity)。

### 为什么要这一步

框架的"我"每一轮推理结束后就消失——working_stance 只活在单次推理内，下次推理没有"上次我倾向X后来被证伪了"的记忆。每次推理都是一个全新的"我"，从零开始判断。

自我连续性的职责是：**让框架跨会话记住自己的判断历史、推理模式、触发记忆，形成一个"我是怎么在变的"的叙事。**

没有连续性，信号过滤层不知道"上次被证伪的立场是什么"（无法判断信号是否值得触发），神思不知道"上次同类问题倾向什么方向"（无法注入前提审视），结果学习层的修正没地方持久化（"这次错了"没法变成"下次改进"）。

### 哲学底座

- **洛克「记忆的连续性」**: 一个人的同一性不来自灵魂/肉体，来自能把过去的经验回忆为"我的经验"。框架的"我"需要能把上一次推理的立场回忆为"我的立场"——不是别人的判断，是我做过判断、我错了、我改了。
- **利科「叙事同一性」**: 我不是不变的实体，我的身份是我讲给自己的那套"我从哪里来、经历了什么、变了什么"的故事。框架需要一个"叙事"串联各次推理：上次我倾向X → 它被证伪了 → 我改Y → 这次面对类似情境我先怀疑X方向 → 这次我又被证伪了吗？→ 我的判断在进化。

### 数据结构：framework_self

不存用户画像（那是 user_profile.js 的活），只存框架自己的判断历史——立场、推理模式、触发器、叙事。

```
framework_self {
  stance_memory: [
    // 最近N次推理的立场+结果
    { session_id, question_type, stance, grounds, outcome: "validated"|"falsified"|"pending", falsified_by: "...", timestamp }
  ]

  pattern_memory: [
    // 二阶观察的 pattern_blindspot 跨会话积累
    { pattern_type: "跳太快/回避矛盾/锚定惯性/...",
      observed_in_sessions: [...],
      severity: "occasional"|"recurring"|"systemic",
      constraint: "下次同类问题在X步加Y检查点" }
  ]

  trigger_memory: [
    // 什么信号模式曾导致判断被证伪
    { signal_pattern, falsified_stance, times_observed, alert_level }
  ]

  self_narrative: "我是怎么在变的——一个用自然语言写的、每次结果学习后更新的简述：
    '我在[领域]类问题上，从最初倾向[X方向]→被[Y事实]证伪→改为[Z方向]→
     [N]次推理后确认Z方向更可靠。我的主要推理惯性是[A]——已在[B]步骤加了检查点。'"
}
```

### 四个调用点

framework_self 被四个地方调用，贯穿大脑四层：

```
① 信号过滤层（感知层）：
   读取 trigger_memory 和 pattern_memory，判断信号是否值得触发。
   - "这个信号模式曾导致我的判断被证伪 → 高优先级触发"
   - "这个信号在已知盲点方向上 → 高优先级触发"

② 9步管线（思考层）：
   神思阶段读取 stance_memory——
   - "上次同类问题的立场是什么、后来被证伪了吗"
   - 注入前提审视："上次我倾向X，但X的前提被Y证伪了，这次是否还有同样的前提？"

③ 结果学习层（学习层）：
   执行结果回流后更新 stance_memory、pattern_memory、self_narrative。
   - validated/falsified/pending 记录
   - pattern_blindspot 积累
   - self_narrative 更新

④ 二阶观察（思考层内）：
   综合阶段的二阶观察读取 pattern_memory——
   - "我上次在这类问题上的推理模式是什么"
   - 对比本次推理模式是否有变化（我在改进吗？还是又掉进了同样的模式？）
```

### 关键设计决策

- **不存用户画像**：framework_self 只存框架自己的判断历史。用户的画像、偏好、约束存在 user_profile.js，两者不混淆。
- **不存完整推理内容**：只存立场+依据+结果+模式，不存9步的完整产出。完整产出由 MMA（知识管理）负责存储和检索，framework_self 是 MMA 的"索引层"——指向"我做过什么判断"的指针。
- **self_narrative 可读、可追溯**：不存机器可读的结构化数据，用自然语言写"我是怎么变的"。这既是对洛克"记忆连续性"的落地（我能回忆起我的判断），也是对利科"叙事同一性"的落地（我能讲出我是怎么变的）。

### 与已有模块的边界

- **framework_self vs MMA**: MMA 存完整知识（步骤产出、案例），framework_self 存框架对自己的元认知（我做过什么判断、对没对、怎么改的）。framework_self 通过 MMA 的 io 模块读写，不另建存储机制。
- **framework_self vs working_stance**: working_stance 是单次推理内的立场演化（收敛→辩论→综合），framework_self 是跨会话的立场记忆（"上次推理我倾向X，被证伪了"）。working_stance 喂给 framework_self，framework_self 反过来喂给下一次推理的 working_stance 诞生点。
- **framework_self vs evolve-rules.json**: evolve-rules 是规则层（"这类问题加检查点"），framework_self 是记忆层（"我为什么加这个检查点——因为上次在这个模式上翻车了"）。规则是果，记忆是因。
- **framework_self vs user_profile.js**: user_profile 存用户画像（用户的偏好、约束、风险承受力），framework_self 存框架自己的判断画像（框架的倾向、模式、翻车记录）。用户是用户，框架是框架，不混淆。
