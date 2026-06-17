#!/usr/bin/env node
/**
 * 自进化管道配置管理
 * 管理 pipeline-meta.json（在用户数据目录，不会被插件更新覆盖）
 * 用法: node scripts/pipeline.js <command>
 *   init      — 初始化meta到数据目录
 *   status    — 查看当前meta状态
 *   disable <step> — 禁用某步骤
 *   enable <step>  — 启用某步骤
 *   set-weight <step> <0-1> — 调整权重
 *   reorder <step1,step2,...> — 重新排序
 */
const path = require('path')
const fs = require('fs')
const os = require('os')

const DATA_DIR = path.join(os.homedir(), '.claude', 'data', 'skills', 'ponder')
const META_FILE = path.join(DATA_DIR, 'pipeline-meta.json')
const DEFAULT_META = path.join(__dirname, '..', 'pipeline-meta.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function initMeta() {
  ensureDataDir()
  if (fs.existsSync(META_FILE)) {
    console.log('pipeline-meta.json already exists at ' + META_FILE)
    return
  }
  const defaultMeta = JSON.parse(fs.readFileSync(DEFAULT_META, 'utf-8'))
  defaultMeta._initialized_at = new Date().toISOString()
  defaultMeta._data_dir = DATA_DIR
  fs.writeFileSync(META_FILE, JSON.stringify(defaultMeta, null, 2), 'utf-8')
  console.log('✅ pipeline-meta.json initialized: ' + META_FILE)
}

function readMeta() {
  if (!fs.existsSync(META_FILE)) {
    console.error('pipeline-meta.json not found. Run: node scripts/pipeline.js init')
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(META_FILE, 'utf-8'))
}

function writeMeta(meta) {
  meta._updated_at = new Date().toISOString()
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), 'utf-8')
}

function main() {
  const args = process.argv.slice(2)
  const cmd = args[0]

  switch (cmd) {
    case 'init': return initMeta()
    case 'status': {
      const meta = readMeta()
      console.log('自由能: ' + (meta.free_energy?.current || 0) + ' / 阈值: ' + (meta.free_energy?.threshold || 0.4))
      console.log('代数: ' + (meta.evolution?.generation || 0))
      console.log('变异次数: ' + (meta.topology?.mutation_count || 0))
      console.log('')
      console.log('步骤状态:')
      for (const [id, s] of Object.entries(meta.steps)) {
        const status = s.enabled ? '✅' : '⛔'
        console.log(`  ${status} ${id.padEnd(10)} weight=${s.weight}  fitness=${s.fitness.avg_score}`)
      }
      console.log('')
      console.log('拓扑顺序: ' + (meta.topology?.order?.join(' → ') || 'none'))
      break
    }
    case 'disable': {
      const meta = readMeta()
      const step = args[1]
      if (!meta.steps[step]) { console.error('Unknown step: ' + step); process.exit(1) }
      meta.steps[step].enabled = false
      writeMeta(meta)
      console.log('⛔ ' + step + ' disabled')
      break
    }
    case 'enable': {
      const meta = readMeta()
      const step = args[1]
      if (!meta.steps[step]) { console.error('Unknown step: ' + step); process.exit(1) }
      meta.steps[step].enabled = true
      writeMeta(meta)
      console.log('✅ ' + step + ' enabled')
      break
    }
    case 'set-weight': {
      const meta = readMeta()
      const step = args[1]; const w = parseFloat(args[2])
      if (!meta.steps[step]) { console.error('Unknown step: ' + step); process.exit(1) }
      if (isNaN(w) || w < 0 || w > 1) { console.error('Weight must be 0-1'); process.exit(1) }
      meta.steps[step].weight = w
      writeMeta(meta)
      console.log('⚖️  ' + step + ' weight → ' + w)
      break
    }
    case 'reorder': {
      const meta = readMeta()
      const order = args.slice(1)
      const valid = order.every(id => meta.steps[id])
      if (!valid || order.length === 0) { console.error('Invalid order. All step IDs must exist.'); process.exit(1) }
      meta.topology.order = order
      meta.topology.mutation_count = (meta.topology.mutation_count || 0) + 1
      writeMeta(meta)
      console.log('🔄 order → ' + order.join(' → '))
      break
    }
    // ═══ 数据驱动的自进化命令 ═══
    case 'record-mutation': {
      // node scripts/pipeline.js record-mutation <type> <step> <fe_before> <fe_after>
      const meta = readMeta()
      const type = args[1]; const step = args[2]
      const feBefore = parseFloat(args[3]); const feAfter = parseFloat(args[4])
      if (!type || !step) { console.error('Usage: record-mutation <type> <step> <fe_before> <fe_after>'); process.exit(1) }
      const record = { type, step, fe_before: feBefore, fe_after: feAfter, delta: feAfter - feBefore, at: new Date().toISOString(), generation: meta.evolution.generation }
      meta.topology.mutation_count = (meta.topology.mutation_count || 0) + 1
      meta.evolution.last_mutation = record
      meta.evolution.generation = (meta.evolution.generation || 0) + 1
      meta.free_energy.history.push({ value: feAfter, at: record.at, mutation: type })
      // 写入MMA记忆
      const MMA = path.join(path.dirname(DATA_DIR), '..', 'plugins', 'cache', 'luke', 'luke')
      const mmaScript = path.join(MMA, 'scripts', 'mcts.js')
      writeMeta(meta)
      if (fs.existsSync(mmaScript)) {
        const mmaCmd = `node "${mmaScript}" mma ashi '{"description":"Mutation: ${type} on ${step}, free_energy ${feBefore}→${feAfter} (delta=${(feAfter-feBefore).toFixed(2)})","tags":["evolution","mutation","${type}"],"category":"zangxiang","emotion":"${feAfter < feBefore ? 'xi' : 'nu'}","q":0.85}'`
        require('child_process').spawnSync('node', [mmaScript, 'mma', 'ashi', JSON.stringify({
          description: `Mutation: ${type} on ${step}, free_energy ${feBefore}→${feAfter} (delta=${(feAfter-feBefore).toFixed(2)})`,
          tags: ['evolution', 'mutation', type],
          category: 'zangxiang',
          emotion: feAfter < feBefore ? 'xi' : 'nu',
          q: 0.85,
        })], { timeout: 5000 })
        console.log('  写入MMA进化记忆')
      }
      console.log(`📊 变异记录: ${type} on ${step}, 自由能 ${feBefore} → ${feAfter} (${feAfter < feBefore ? '改善' : '恶化'})`)
      break
    }
    case 'recommend-mutation': {
      // 基于历史数据推荐最优变异类型
      const meta = readMeta()
      const history = meta.free_energy.history || []
      if (history.length < 2) {
        // 没有历史数据 → 用默认顺序尝试
        console.log('📋 推荐: weight_adjust (无历史数据, 从最安全的变异开始)')
        break
      }
      // 分析历史变异的效果
      const mutationEffects = {}
      for (const record of (meta.evolution_history || [])) {
        if (!mutationEffects[record.type]) mutationEffects[record.type] = { count: 0, totalDelta: 0, successes: 0 }
        mutationEffects[record.type].count++
        mutationEffects[record.type].totalDelta += record.delta
        if (record.delta < 0) mutationEffects[record.type].successes++
      }
      // 找成功率最高的变异类型
      let bestType = null; let bestRate = -1
      for (const [type, stats] of Object.entries(mutationEffects)) {
        const rate = stats.successes / stats.count
        if (rate > bestRate) { bestRate = rate; bestType = type }
      }
      if (!bestType) { console.log('📋 推荐: weight_adjust (历史数据不足)'); break }
      console.log(`📋 推荐: ${bestType} (历史成功率 ${(bestRate*100).toFixed(0)}%, ${mutationEffects[bestType].count}次尝试)`)
      break
    }
    case 'rollback': {
      // 回滚到上一个稳定版本
      const meta = readMeta()
      const history = meta.free_energy.history || []
      if (history.length < 2) { console.log('没有可回滚的历史记录'); break }
      const lastTwo = history.slice(-2)
      if (lastTwo[1].value > lastTwo[0].value) {
        console.log(`⚠️  自由能从 ${lastTwo[0].value} 升到 ${lastTwo[1].value}, 建议回滚`)
        console.log('  执行: git revert 或修改 pipeline-meta.json 恢复上次权重')
      } else {
        console.log(`✅ 自由能趋势良好: ${lastTwo[0].value} → ${lastTwo[1].value}`)
      }
      break
    }
    case 'mutation-history': {
      const meta = readMeta()
      console.log('变异历史:')
      for (const h of (meta.evolution_history || [])) {
        const icon = h.delta < 0 ? '✅' : '⛔'
        console.log(`  ${icon} gen=${h.generation} ${h.type} on ${h.step} 自由能 ${h.fe_before}→${h.fe_after} (${h.delta > 0 ? '+' : ''}${h.delta.toFixed(2)})`)
      }
      break
    }
    default:
      console.log('Usage: node scripts/pipeline.js <command>')
      console.log('  init                 — Init meta to data dir')
      console.log('  status               — Show meta status')
      console.log('  disable <step>       — Disable a step')
      console.log('  enable <step>        — Enable a step')
      console.log('  set-weight <s> <v>   — Set step weight (0-1)')
      console.log('  reorder <s1,s2..>    — Change step order')
      console.log('  record-mutation <t> <s> <fb> <fa> — Record mutation result')
      console.log('  recommend-mutation   — Recommend best mutation type from history')
      console.log('  rollback             — Check if rollback needed')
      console.log('  mutation-history     — Show mutation history with success/fail')
  }
}

main()
