#!/usr/bin/env python3
"""
sub_agents.py — Ponder 外部子 agent 启动器
在 Phase 3 主 Ponder 调用之前，并行启动 8 个八卦镜子 agent
结果写入 JSON 文件供 run-pipeline.py 读取注入

用法: python3 /opt/scripts/sub_agents.py <signals_file> <output_file>
"""
import subprocess, json, sys, os, re, time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

ENV = os.environ.copy()
ENV['API_TIMEOUT_MS'] = '120000'
ENV['CLAUDE_CODE_QUIET_MODE'] = '1'
CWD = '/opt/workspace/mcts-skill'

DIMS = {
    '宏观': '分析当前宏观经济、利率、汇率、PMI等宏观数据对A股的影响，找出被忽略的宏观风险或机会',
    '市场结构': '分析市场宽度、涨跌比、板块轮动、大小盘风格等市场结构特征，找出结构性的盲点',
    '资金流向': '分析北向资金、主力资金、融资融券等资金动向，找出资金面的隐藏信号',
    '机构行为': '分析机构调研、龙虎榜、大宗交易等机构行为数据，找出机构动向的盲点',
    '散户情绪': '分析涨停跌停、换手率、社交媒体情绪等散户行为数据，找出情绪极端的盲点',
    '价格行为': '分析关键技术位、量价关系、缺口、K线形态等价格行为，找出技术面的盲点',
    '跨市场': '分析美股、港股、商品、债券等跨市场联动，找出外部市场的传导盲点',
    '反共识': '从期权隐含波动率、期货升贴水、可转债溢价等数据中，找出市场定价不一致的反共识信号',
}

def run_agent(prompt_text, label):
    start = time.time()
    try:
        r = subprocess.run([
            'claude', '--permission-mode', 'auto', '--max-turns', '5', '-p', prompt_text,
        ], capture_output=True, text=True, timeout=300, env=ENV, cwd=CWD)
        elapsed = time.time() - start
        output = (r.stdout or '')[:600]
        return {'label': label, 'output': output, 'elapsed': round(elapsed, 1), 'ok': r.returncode == 0}
    except Exception as e:
        return {'label': label, 'output': 'ERROR: ' + str(e), 'elapsed': round(time.time() - start, 1), 'ok': False}

def run_bagua_agents(summary):
    base_prompt = "你是一位专业的A股市场盲点分析师。请基于以下传感器数据，从【{dim}】维度找出被忽略的盲点、风险或机会。\n\n传感器数据：\n{summary}\n\n要求：\n1. 只从【{dim}】维度分析\n2. 找出1-3个具体的盲点/风险/机会\n3. 每个盲点要说明：具体现象、可能影响、置信度（高/中/低）\n4. 输出简洁，200字以内"
    results = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {}
        for dim, desc in DIMS.items():
            prompt = base_prompt.format(dim=dim, summary=summary[:1000])
            futures[executor.submit(run_agent, prompt, dim)] = dim
        for future in as_completed(futures):
            results.append(future.result())
    results.sort(key=lambda x: list(DIMS.keys()).index(x['label']) if x['label'] in DIMS else 99)
    return results

def main():
    summary_file = sys.argv[1] if len(sys.argv) > 1 else '/opt/scripts/data/last-signals.json'
    output_file = sys.argv[2] if len(sys.argv) > 2 else '/opt/scripts/data/sub_agent_results.json'

    summary = ""
    try:
        with open(summary_file) as f:
            sig = json.load(f)
        if sig.get('index_data'):
            idx = sig['index_data']
            summary += "【A股】上证" + str(idx.get('sh','?')) + " | 深证" + str(idx.get('sz','?')) + " | 创业板" + str(idx.get('cyb','?')) + "\n"
        dims = sig.get('dimensions', {})
        for dname, ddata in dims.items():
            if isinstance(ddata, dict) and ddata.get('summary'):
                summary += "【" + dname + "】" + str(ddata['summary'])[:200] + "\n"
    except:
        summary = "传感器数据读取失败"

    print('[SUB_AGENTS] Starting bagua 8-dimension sub-agents...', flush=True)
    bagua_results = run_bagua_agents(summary)

    ok_count = sum(1 for r in bagua_results if r['ok'])
    print('[SUB_AGENTS] Bagua done: ' + str(ok_count) + '/8 ok', flush=True)
    for r in bagua_results:
        status = 'OK' if r['ok'] else 'FAIL'
        print('  [' + status + '] ' + r['label'] + ' (' + str(r['elapsed']) + 's)', flush=True)

    # 构建注入文本
    injection_lines = []
    for r in bagua_results:
        icon = 'OK' if r.get('ok') else 'FAIL'
        out = r.get('output', '')[:300]
        injection_lines.append(icon + ' [' + r['label'] + ']: ' + out)
    injection_text = '\n\n'.join(injection_lines)

    output = {
        'timestamp': datetime.now().isoformat(),
        'injection_text': injection_text,
        'bagua': bagua_results,
        'stats': {'total': len(bagua_results), 'ok': ok_count}
    }
    with open(output_file, 'w') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print('[SUB_AGENTS] Results saved to ' + output_file, flush=True)
    print('[SUB_AGENTS] All done', flush=True)

if __name__ == '__main__':
    main()