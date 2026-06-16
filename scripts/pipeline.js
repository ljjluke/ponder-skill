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

const DATA_DIR = path.join(os.homedir(), '.claude', 'data', 'skills', 'mcts-td-planner')
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
    default:
      console.log('Usage: node scripts/pipeline.js <command>')
      console.log('  init              — Init meta to data dir')
      console.log('  status            — Show meta status')
      console.log('  disable <step>    — Disable a step')
      console.log('  enable <step>     — Enable a step')
      console.log('  set-weight <s> <v> — Set step weight (0-1)')
      console.log('  reorder <s1,s2..>  — Change step order')
  }
}

main()
