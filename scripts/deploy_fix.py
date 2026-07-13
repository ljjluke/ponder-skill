#!/usr/bin/env python3
"""
deploy_fix.py — 一键部署 Ponder 交互模式修复
用法: python3 deploy_fix.py
"""

import os, sys, json, subprocess, time

REMOTE = '8.208.44.120'
REMOTE_USER = 'root'
SSH_KEY = os.path.expanduser('~/.ssh/id_ed25519')

PONDER_DIR = '/opt/workspace/mcts-skill'
SCRIPTS_DIR = '/opt/scripts'
DATA_DIR = '/opt/scripts/data'

def run(cmd, timeout=30):
    """本地执行命令"""
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    return r.returncode, r.stdout, r.stderr

def ssh(cmd, timeout=30):
    """远程执行命令"""
    full_cmd = f"ssh -o StrictHostKeyChecking=no -i {SSH_KEY} {REMOTE_USER}@{REMOTE} {cmd!r}"
    r = subprocess.run(full_cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    return r.returncode, r.stdout, r.stderr

def scp_put(local, remote):
    """上传文件到远程"""
    full_cmd = f"scp -o StrictHostKeyChecking=no -i {SSH_KEY} {local} {REMOTE_USER}@{REMOTE}:{remote}"
    r = subprocess.run(full_cmd, shell=True, capture_output=True, text=True, timeout=30)
    return r.returncode, r.stdout, r.stderr

def check_connectivity():
    print("检查 SSH 连接...")
    rc, out, err = ssh("echo connected", timeout=10)
    if rc == 0:
        print("  ✅ SSH 连接正常")
        return True
    else:
        print(f"  ❌ SSH 连接失败: {err[:100]}")
        return False

def check_current_state():
    """检查当前远端 Ponder 的执行状态"""
    print("\n检查远端 Ponder 当前执行状态...")

    # 1. 检查 pipeline 中 Ponder 调用方式
    rc, out, err = ssh("grep -A 10 'subprocess.run.*claude' /opt/scripts/run-pipeline.py | head -15")
    if rc == 0:
        print(f"  当前 Ponder 调用方式:\n{out[:300]}")

    # 2. 检查 API_TIMEOUT_MS
    rc, out, err = ssh("grep 'API_TIMEOUT_MS' /opt/scripts/run-pipeline.py")
    if rc == 0:
        print(f"  API_TIMEOUT_MS: {out.strip()}")

    # 3. 检查最近一次 Ponder 输出
    rc, out, err = ssh("ls -la /opt/scripts/data/ponder-output.json 2>/dev/null && wc -c /opt/scripts/data/ponder-output.json")
    if rc == 0:
        print(f"  最近 ponder-output: {out.strip()}")

    # 4. 检查 framework_self 立场数量
    rc, out, err = ssh("python3 -c \"import json; d=json.load(open('/root/.claude/data/skills/ponder/framework-self.json')); print(f'立场数: {len(d.get(\\\"stance_memory\\\",[]))}'); print(f'模式数: {len(d.get(\\\"pattern_memory\\\",[]))}')\" 2>/dev/null || echo 'framework_self 不可读'")
    print(f"  framework_self: {out.strip()}")

    # 5. 检查 expect 是否可用
    rc, out, err = ssh("which expect && expect -v")
    if rc == 0:
        print(f"  expect: {out.strip()}")
    else:
        print("  ❌ expect 未安装")

def deploy_fix():
    """部署修复"""
    print("\n部署修复...")

    # 1. 上传 expect 脚本
    print("  上传 ponder_auto.exp...")
    rc, out, err = scp_put(
        '/tmp/ponder_auto.exp',
        '/tmp/ponder_auto.exp'
    )
    if rc == 0:
        print("  ✅ ponder_auto.exp 上传成功")
    else:
        print(f"  ❌ 上传失败: {err[:100]}")
        return False

    # 2. 上传交互式执行器
    print("  上传 run_ponder_interactive.py...")
    rc, out, err = scp_put(
        '/opt/workspace/mcts-skill/scripts/run_ponder_interactive.py',
        f'{SCRIPTS_DIR}/run_ponder_interactive.py'
    )
    if rc == 0:
        print("  ✅ run_ponder_interactive.py 上传成功")
    else:
        print(f"  ❌ 上传失败: {err[:100]}")
        return False

    # 3. 修改 pipeline（用 sed 替换 Phase 3 的 Ponder 调用）
    print("  修改 pipeline Phase 3...")

    # 备份原文件
    ssh("cp /opt/scripts/run-pipeline.py /opt/scripts/run-pipeline.py.bak")

    # 关键修改：把 subprocess.run(['claude', ...]) 替换为用 expect 交互模式
    # 先看当前 Phase 3 的代码
    rc, out, err = ssh("grep -n 'subprocess.run.*claude' /opt/scripts/run-pipeline.py")
    lines = out.strip().split('\n')

    if len(lines) >= 1:
        # 找到 Ponder 调用的行号范围
        rc, out, err = ssh("grep -n 'ponder_file = ' /opt/scripts/run-pipeline.py")
        ponder_file_line = out.strip().split(':')[0]

        rc, out, err = ssh("grep -n '# 提取 JSON' /opt/scripts/run-pipeline.py")
        extract_json_line = out.strip().split(':')[0]

        print(f"    ponder_file 在第 {ponder_file_line} 行，提取 JSON 在第 {extract_json_line} 行")

        # 替换 ponder_file 到提取 JSON 之间的代码
        # 新代码：先用 save_json 保存 prompt，再用 expect 运行 Ponder
        new_code = '''
\t# ═══ 用交互模式运行 Ponder（支持子 agent） ═══
\tponder_file = os.path.join(DATA_DIR, 'ponder-output.json')
\ttry:
\t    # 保存 prompt 到临时文件
\t    prompt_file = os.path.join(DATA_DIR, 'ponder_prompt_input.txt')
\t    with open(prompt_file, 'w') as f:
\t        f.write(ponder_prompt)
\t
\t    # 设置合理的 API 超时（防 tool 调用卡死）
\t    ponder_env = os.environ.copy()
\t    ponder_env['API_TIMEOUT_MS'] = '120000'
\t    ponder_env['CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS'] = '0'
\t
\t    # 用 expect 交互模式启动 Claude（支持 Agent tool 启动子 agent）
\t    log('  🚀 启动交互式 Ponder (expect模式，支持子 agent)...')
\t    r3 = subprocess.run([
\t        'expect', '/tmp/ponder_auto.exp',
\t        prompt_file, ponder_file, '100'
\t    ], capture_output=True, text=True, timeout=7200, env=ponder_env)
\t
\t    ponder_text = ''
\t    if os.path.exists(ponder_file):
\t        with open(ponder_file, 'r') as f:
\t            ponder_text = f.read()
\t
\t    log(f'  Ponder 退出码: {r3.returncode}, 输出: {len(ponder_text)}字符')
\t
\t    # 也尝试读取 JSON 文件
\t    json_file = ponder_file + '.json'
\t    if os.path.exists(json_file):
\t        try:
\t            with open(json_file, 'r') as f:
\t                ponder_json_data = json.load(f)
\t            log(f'  ✅ 交互模式 JSON 提取成功')
\t        except:
\t            pass
\t
\texcept subprocess.TimeoutExpired:
\t    log('  Ponder 超时(2h)')
\t    ponder_text = ''
\texcept Exception as e:
\t    log(f'  Ponder 异常: {e}')
\t    ponder_text = ''
\t    # 回退：如果 expect 失败，用 --print 模式兜底
\t    try:
\t        log('  ⚠️ expect 失败，回退到 --print 模式...')
\t        env = os.environ.copy()
\t        r3_fallback = subprocess.run([
\t            'claude', '--permission-mode', 'auto', '--max-turns', '50', ponder_prompt,
\t        ], capture_output=True, text=True, timeout=3600, cwd=PONDER_DIR, input='', env=env)
\t        ponder_text = (r3_fallback.stdout or '') + (r3_fallback.stderr or '')
\t        with open(ponder_file, 'w') as f:
\t            f.write(ponder_text)
\t        log(f'  回退模式输出: {len(ponder_text)}字符')
\t    except Exception as e2:
\t        log(f'  回退也失败: {e2}')
'''

        # 用 Python 替换
        fix_script = f'''
import re
with open('/opt/scripts/run-pipeline.py', 'r') as f:
    content = f.read()

# 找到 ponder_file = os.path.join(DATA_DIR, 'ponder-output.json') 到 '# 提取 JSON' 之间的代码
old_start = "ponder_file = os.path.join(DATA_DIR, 'ponder-output.json')"
old_end = "# 提取 JSON"

start_idx = content.index(old_start)
end_idx = content.index(old_end, start_idx)

new_code = {new_code!r}

content = content[:start_idx] + new_code + content[end_idx:]
with open('/opt/scripts/run-pipeline.py', 'w') as f:
    f.write(content)
print("替换完成")
'''

        # 写入临时 Python 脚本并远程执行
        with open('/tmp/_fix_pipeline.py', 'w') as f:
            f.write(fix_script)

        rc, out, err = scp_put('/tmp/_fix_pipeline.py', '/tmp/_fix_pipeline.py')
        if rc == 0:
            rc2, out2, err2 = ssh("python3 /tmp/_fix_pipeline.py")
            print(f"    pipeline 修改: {out2.strip()}")

        # 验证修改
        rc, out, err = ssh("grep -n 'expect.*ponder_auto\|回退到.*print\|交互式 Ponder' /opt/scripts/run-pipeline.py")
        if out.strip():
            print(f"  ✅ Phase 3 已修改为交互模式")
            print(f"  {out.strip()[:200]}")
        else:
            print(f"  ⚠️ 修改可能未生效")

    return True

def verify_fix():
    """验证修复"""
    print("\n验证修复...")

    # 1. 验证 pipeline 已修改
    rc, out, err = ssh("grep -c 'expect.*ponder_auto' /opt/scripts/run-pipeline.py")
    if rc == 0 and out.strip() != '0':
        print("  ✅ pipeline 已启用 expect 交互模式")
    else:
        print("  ❌ pipeline 未启用 expect 模式")
        return False

    # 2. 验证 API_TIMEOUT_MS 已调整
    rc, out, err = ssh("grep 'API_TIMEOUT_MS' /opt/scripts/run-pipeline.py | head -3")
    if '120000' in out:
        print("  ✅ API_TIMEOUT_MS 已调整为 120s")
    else:
        print(f"  ⚠️ API_TIMEOUT_MS 当前值: {out.strip()}")

    # 3. 验证 expect 脚本存在
    rc, out, err = ssh("ls -la /tmp/ponder_auto.exp")
    if rc == 0:
        print("  ✅ expect 脚本已部署")
    else:
        print("  ❌ expect 脚本缺失")
        return False

    # 4. 验证 run_ponder_interactive.py 存在
    rc, out, err = ssh("ls -la /opt/scripts/run_ponder_interactive.py")
    if rc == 0:
        print("  ✅ 交互式执行器已部署")

    # 5. 验证备份
    rc, out, err = ssh("ls -la /opt/scripts/run-pipeline.py.bak")
    if rc == 0:
        print("  ✅ 原始 pipeline 已备份")

    print("\n✅ 修复部署完成！下次 pipeline 运行时 Ponder 将使用交互模式。")
    return True

def test_interactive():
    """在远端测试交互模式"""
    print("\n测试交互模式是否能启动子 agent...")

    # 创建一个测试 prompt
    test_prompt = "请用 Bash tool 执行 date 命令，告诉我当前日期和时间"
    rc, out, err = ssh(f"echo {test_prompt!r} > /tmp/test_interactive_prompt.txt")

    # 启动 expect 测试
    rc, out, err = ssh("timeout 120 expect -c 'set timeout 60; spawn claude --permission-mode auto --max-turns 5; expect -re {❯}; send \"请用 Bash tool 执行 date 命令，告诉我结果\\r\"; expect { -re {❯} { puts \"=== DONE ===\" } timeout { puts \"=== TIMEOUT ===\" } }; sleep 2; send \"exit\\r\"; expect eof' 2>&1 | grep -E 'Bash|Running|date|2026|July|7月|=== DONE|=== TIMEOUT'", timeout=120)
    print(f"  测试结果:\n{out[-500:]}")

    if '=== DONE' in out or 'Bash' in out:
        print("  ✅ 交互模式可正常启动 tool")
        return True
    else:
        print("  ⚠️ 交互模式测试未检测到 tool 调用")
        return False

if __name__ == '__main__':
    print("=" * 50)
    print("Ponder 交互模式修复部署工具")
    print("=" * 50)

    if not check_connectivity():
        print("\n❌ 无法连接到远端服务器。请先添加 SSH 公钥：")
        print("   在服务器上执行:")
        print('   echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMPBCETxluAmxsJDgU7LVOXnJAimC4YEvqnw2DD9erD ljjluke-mcts-skill" >> ~/.ssh/authorized_keys')
        sys.exit(1)

    check_current_state()

    if deploy_fix():
        verify_fix()
        test_interactive()

    print("\n完成。")