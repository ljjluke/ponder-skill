#!/usr/bin/env python3
"""
fix_ponder_subagents.py — 替换 Phase 3 为交互模式，让 Ponder 能启动子 agent

用法:
  python3 fix_ponder_subagents.py [--remote] [--local]

--remote: 在远端执行（通过 SSH）
--local:  在本地 deploy/run-pipeline.py 执行
默认: --local
"""

import os, sys, re

def fix_pipeline(filepath):
    """替换 Phase 3 的 Ponder 调用为 expect 交互模式"""
    with open(filepath, 'r') as f:
        content = f.read()

    # 要替换的旧代码（精确匹配）
    old_code = """ponder_file = os.path.join(DATA_DIR, 'ponder-output.json')
try:
    env = os.environ.copy()
    env['CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS'] = '0'  # 无限等待子agent，防止截断
    r3 = subprocess.run([
        'claude',
        '--permission-mode', 'auto',
        '--max-turns', '50',
        ponder_prompt,
    ], capture_output=True, text=True, timeout=7200, cwd=PONDER_DIR, input='', env=env)
    ponder_text = (r3.stdout or '')
    if r3.stderr:
        ponder_text = (r3.stderr + '\n' + ponder_text)
    log(f'  Ponder 退出码: {r3.returncode}, 输出: {len(ponder_text)}字符 (stdout:{len(r3.stdout or "")} stderr:{len(r3.stderr or "")})')
except subprocess.TimeoutExpired:
    log('  Ponder 超时(2h)')
    ponder_text = ''
except Exception as e:
    log(f'  Ponder 异常: {e}')
    ponder_text = ''

with open(ponder_file, 'w') as f:
    f.write(ponder_text)"""

    new_code = """ponder_file = os.path.join(DATA_DIR, 'ponder-output.json')
try:
    # ═══ 交互模式：用 expect 启动 Claude，支持 Agent tool 启动子 agent ═══
    prompt_file = os.path.join(DATA_DIR, 'ponder_prompt_input.txt')
    with open(prompt_file, 'w') as f:
        f.write(ponder_prompt)

    # 设置合理 API 超时（太长会让 tool retry 卡死）
    ponder_env = os.environ.copy()
    ponder_env['API_TIMEOUT_MS'] = '120000'
    ponder_env['CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS'] = '0'

    log('  🚀 启动交互式 Ponder (expect模式，子 agent 可用)...')
    r3 = subprocess.run([
        'expect', '/tmp/ponder_auto.exp',
        prompt_file, ponder_file, '100'
    ], capture_output=True, text=True, timeout=7200, env=ponder_env)

    ponder_text = ''
    if os.path.exists(ponder_file):
        with open(ponder_file, 'r') as f:
            ponder_text = f.read()

    log(f'  Ponder 退出码: {r3.returncode}, 输出: {len(ponder_text)}字符')

    # 尝试读取独立 JSON 文件（expect 脚本会额外提取）
    json_file = ponder_file + '.json'
    if os.path.exists(json_file):
        try:
            with open(json_file, 'r') as f:
                ponder_json_extra = json.load(f)
            log(f'  ✅ 交互模式额外 JSON 提取成功')
        except:
            pass

except subprocess.TimeoutExpired:
    log('  Ponder 超时(2h)')
    ponder_text = ''
except Exception as e:
    log(f'  Ponder 异常: {e}')
    ponder_text = ''
    # 回退：expect 失败时降级到 --print 模式保底
    try:
        log('  ⚠️ expect 失败，回退到 --print 模式...')
        env = os.environ.copy()
        r3_fb = subprocess.run([
            'claude', '--permission-mode', 'auto', '--max-turns', '50', ponder_prompt,
        ], capture_output=True, text=True, timeout=3600, cwd=PONDER_DIR, input='', env=env)
        ponder_text = (r3_fb.stdout or '') + (r3_fb.stderr or '')
        with open(ponder_file, 'w') as f:
            f.write(ponder_text)
        log(f'  回退模式输出: {len(ponder_text)}字符')
    except Exception as e2:
        log(f'  回退也失败: {e2}')"""

    if old_code in content:
        content = content.replace(old_code, new_code, 1)
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"✅ 替换成功: {filepath}")
        return True
    else:
        print(f"❌ 替换失败: 未找到匹配的旧代码")
        # 调试：找出哪里不匹配
        idx = content.find("ponder_file = os.path.join(DATA_DIR, 'ponder-output.json')")
        if idx >= 0:
            print(f"  找到 ponder_file 行在位置 {idx}")
            # 显示附近内容
            snippet = content[idx:idx+400]
            print(f"  附近内容: {snippet[:200]}...")
        return False


def verify(filepath):
    """验证修改结果"""
    with open(filepath, 'r') as f:
        content = f.read()

    checks = [
        ("expect 交互模式", "expect.*ponder_auto" in content),
        ("API_TIMEOUT_MS 已调低", "API_TIMEOUT_MS.*120000" in content),
        ("--print 回退兜底", "回退到 --print 模式" in content),
        ("子 agent 可用提示", "子 agent 可用" in content),
    ]

    all_ok = True
    print("\n验证结果:")
    for label, ok in checks:
        print(f"  {'✅' if ok else '❌'} {label}")
        if not ok:
            all_ok = False
    return all_ok


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--remote', action='store_true', help='在远端执行')
    parser.add_argument('--local', action='store_true', default=True, help='在本地执行')
    args = parser.parse_args()

    if args.remote:
        # 远端路径
        fix_pipeline('/opt/scripts/run-pipeline.py')
        verify('/opt/scripts/run-pipeline.py')
    else:
        # 本地路径
        fix_pipeline('/opt/workspace/mcts-skill/deploy/run-pipeline.py')
        verify('/opt/workspace/mcts-skill/deploy/run-pipeline.py')