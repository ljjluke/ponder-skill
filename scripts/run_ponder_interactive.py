#!/usr/bin/env python3
"""
Ponder 交互模式执行器 — 替代 subprocess.run(['claude', '--print', ...])
用 expect 脚本启动交互式 Claude，让 Ponder 能使用 Agent tool 启动子 agent。

用法:
  python3 run_ponder_interactive.py <prompt_file> [output_dir] [max_turns]

依赖: expect (apt-get install expect)
"""

import os, sys, subprocess, json, re, time
from datetime import datetime

def run_ponder_interactive(prompt_text, output_dir='/opt/scripts/data', max_turns=100):
    """用交互模式运行 Ponder，返回 (ponder_text, json_data)"""

    os.makedirs(output_dir, exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')

    # 写入 prompt 到临时文件
    prompt_file = os.path.join(output_dir, f'ponder_prompt_{ts}.txt')
    with open(prompt_file, 'w') as f:
        f.write(prompt_text)

    # 输出文件
    output_file = os.path.join(output_dir, f'ponder_output_{ts}.txt')

    # expect 脚本路径
    expect_script = '/tmp/ponder_auto.exp'

    log(f'  启动交互式 Ponder (max_turns={max_turns})...')
    log(f'  prompt 已保存到: {prompt_file}')

    start = time.time()

    try:
        r = subprocess.run([
            'expect', expect_script, prompt_file, output_file, str(max_turns)
        ], capture_output=True, text=True, timeout=7200)

        elapsed = time.time() - start
        log(f'  expect 退出码: {r.returncode}, 耗时: {elapsed:.0f}s')

        if r.stderr:
            log(f'  expect stderr: {r.stderr[:200]}')

        # 读取输出文件
        ponder_text = ''
        if os.path.exists(output_file):
            with open(output_file, 'r') as f:
                ponder_text = f.read()
            log(f'  Ponder 输出: {len(ponder_text)} 字符')

        # 提取 JSON
        json_data = None
        json_file = output_file + '.json'
        if os.path.exists(json_file):
            try:
                with open(json_file, 'r') as f:
                    json_data = json.load(f)
                log(f'  ✅ JSON 提取成功')
            except Exception as e:
                log(f'  ⚠️ JSON 解析失败: {e}')
        else:
            # 尝试从文本中提取
            m = re.search(r'```json\s*\n(.*?)\n\s*```', ponder_text, re.DOTALL)
            if m:
                try:
                    json_data = json.loads(m.group(1))
                    log(f'  ✅ 从文本中提取 JSON 成功')
                except:
                    pass

        return ponder_text, json_data

    except subprocess.TimeoutExpired:
        elapsed = time.time() - start
        log(f'  ⛔ Ponder 超时({elapsed:.0f}s)')
        return '', None
    except Exception as e:
        log(f'  ⛔ Ponder 异常: {e}')
        return '', None


def log(msg):
    ts = datetime.now().strftime('%H:%M:%S')
    print(f'[{ts}] {msg}', flush=True)


if __name__ == '__main__':
    prompt_file = sys.argv[1] if len(sys.argv) > 1 else '/opt/scripts/data/last-ponder-prompt.txt'
    output_dir = sys.argv[2] if len(sys.argv) > 2 else '/opt/scripts/data'
    max_turns = int(sys.argv[3]) if len(sys.argv) > 3 else 100

    # 读取 prompt 文件
    with open(prompt_file, 'r') as f:
        prompt_text = f.read()

    log(f'读取 prompt: {len(prompt_text)} 字符')

    ponder_text, json_data = run_ponder_interactive(prompt_text, output_dir, max_turns)

    if json_data:
        print(f'\n✅ 成功! JSON 包含: {list(json_data.keys())}')
        if 'recommended_stocks' in json_data:
            print(f'   推荐股票: {len(json_data["recommended_stocks"])} 只')
        if 'position_adjustments' in json_data:
            print(f'   调仓建议: {len(json_data["position_adjustments"])} 条')
    else:
        print(f'\n❌ 未提取到 JSON')
        print(f'   输出长度: {len(ponder_text)} 字符')