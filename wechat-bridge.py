#!/usr/bin/env python3
"""
微信 ↔ Claude Code 桥接服务
个人微信 (itchat-uos) → tmux Claude Code 会话
"""

import itchat
from itchat.content import TEXT, PICTURE
import subprocess
import time
import re
import os
import threading
import queue
import uuid
import logging

# ==================== 配置 ====================
TMUX_SESSION = "claude-wechat"
WORK_DIR = "/opt/workspace/mcts-skill"
OUTPUT_LOG = "/tmp/claude-wechat-output.log"
WECHAT_TARGET = None  # 会在首次收到消息时自动设置（回复该用户）

# ==================== 日志 ====================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('/tmp/claude-wechat-bridge.log'),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

# ==================== 状态管理 ====================
msg_queue = queue.Queue()
processing = False
last_position = 0  # 日志文件读取位置
lock = threading.Lock()

# ==================== 工具函数 ====================

def strip_ansi(text):
    """去除 ANSI 转义序列"""
    ansi_escape = re.compile(r'''
        \x1B            # ESC
        (?:
            [@-Z\\-_]   # 单字符序列
            |           # OR
            \[          # CSI
            [0-?]*      # 参数
            [ -/]*      # 中间字符
            [@-~]       # 最终字符
        )
    ''', re.VERBOSE)
    text = ansi_escape.sub('', text)
    # 去除其他控制字符（除了换行和制表符）
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    return text


def clean_output(text):
    """清理 Claude Code 输出，提取用户消息之后的响应"""
    lines = text.split('\n')

    # 过滤掉无意义行
    cleaned = []
    for line in lines:
        # 去除空行和纯装饰行
        if line.strip() == '':
            continue
        # 去除特殊符号行
        if re.match(r'^[❯>\s❰━─│▸→]+$', line.strip()):
            continue
        # 去除纯边框行
        if re.match(r'^[─━│┃┄┅┈┉╌╍║⎺⎻⎼⎽⎽]+$', line.strip()):
            continue
        cleaned.append(line.rstrip())

    return '\n'.join(cleaned)


def format_for_wechat(text):
    """将 Claude Code 输出格式化为微信友好格式"""
    if not text or text.strip() == '':
        return None

    raw = text

    # 第一步：去除 ANSI
    raw = strip_ansi(raw)

    # 第二步：清理控制字符和多余的转义
    # 去除倒退序列 (如 \b 和光标移动)
    raw = re.sub(r'.\x08', '', raw)  # 字符+退格（粗体效果）

    # 清理整行重复（常见于终端刷新）
    lines_raw = raw.split('\n')
    deduped = []
    prev = None
    for line in lines_raw:
        line_stripped = line.strip()
        if line_stripped != prev:
            deduped.append(line)
        prev = line_stripped

    # 第三步：找到实际响应的起始点（去掉终端提示和输入回显）
    result_lines = []
    skip_header = True
    in_thinking = False
    in_output = False

    for line in deduped:
        s = line.strip()

        # 跳过空行（连续空行合并）
        if not s:
            if result_lines and result_lines[-1] != '':
                result_lines.append('')
            continue

        # 忽略终端管理行
        if s in ('❯', '>', '$', '#') or re.match(r'^❯\s', s):
            continue
        if re.match(r'^\d+\s+\w+\s+\d+', s) and '·' in s:  # 状态行
            continue
        if 'for shortcuts' in s and 'for agents' in s:
            continue

        # 检测思考标签
        if s.startswith('<thinking>'):
            in_thinking = True
            continue
        if s.startswith('</thinking>'):
            in_thinking = False
            continue

        if in_thinking:
            continue

        # 检测 XML 工具调用标签（不需要显示给用户）
        if s.startswith('<') and s.endswith('>') and not s.startswith('</'):
            if any(tag in s for tag in ['<invoke>', '<tool>', '<result>', '<function>']):
                continue

        result_lines.append(line)

    # 第四步：重新格式化，添加视觉分隔
    # 合并连续空行
    final = []
    prev_empty = False
    for line in result_lines:
        if line == '':
            if prev_empty:
                continue
            prev_empty = True
        else:
            prev_empty = False
        final.append(line)

    text = '\n'.join(final).strip()

    if not text:
        return None

    # 第五步：美化代码块
    # 用框线包围代码
    text = re.sub(
        r'```(\w*)\n(.*?)```',
        lambda m: format_code_block(m.group(2), m.group(1)),
        text,
        flags=re.DOTALL
    )

    # 处理行内代码（用反引号包裹的）
    text = re.sub(r'`([^`]+)`', r'「\1」', text)

    return text


def format_code_block(code, lang=''):
    """用框线包围代码块"""
    lines = code.strip().split('\n')
    if not lines:
        return ''

    header = f"┌─ {lang} " + "─" * max(2, 30 - len(lang)) if lang else "┌" + "─" * 34
    body = '\n'.join(f"│ {line}" for line in lines)
    footer = "└" + "─" * 36

    return f"{header}\n{body}\n{footer}"


def send_to_tmux(message):
    """发送消息到 tmux Claude Code"""
    # 转义特殊字符
    safe = message.replace('"', '\\"').replace('$', '\\$').replace('`', '\\`')
    cmd = f'tmux send-keys -t {TMUX_SESSION} "{safe}" Enter'
    subprocess.run(cmd, shell=True, timeout=5)
    log.info(f"已发送到 tmux: {message[:60]}...")


def reset_tmux_session():
    """重置 tmux 会话（输入空行直到回到提示符，然后重新开始）"""
    # 发送 Ctrl+C 中断当前操作
    subprocess.run(['tmux', 'send-keys', '-t', TMUX_SESSION, 'C-c'], timeout=3)
    time.sleep(1)


def setup_log_pipe():
    """设置 tmux 输出管道到日志文件"""
    # 清除旧日志
    try:
        os.remove(OUTPUT_LOG)
    except FileNotFoundError:
        pass

    # 设置管道
    result = subprocess.run(
        ['tmux', 'pipe-pane', '-t', TMUX_SESSION, '-o', f'cat >> {OUTPUT_LOG}'],
        capture_output=True, text=True, timeout=5
    )
    log.info(f"管道设置: {result.stdout} {result.stderr}")
    # tmux pipe-pane -o 是开关，可能已经开了，试两次
    if result.returncode != 0:
        # 可能是第一次没开成功，再试
        subprocess.run(
            ['tmux', 'pipe-pane', '-t', TMUX_SESSION, f'cat >> {OUTPUT_LOG}'],
            capture_output=True, timeout=5
        )

    time.sleep(0.5)


def wait_for_response(timeout=120):
    """等待 Claude Code 完成响应，返回新增的文本"""
    global last_position

    # 记录当前日志位置
    try:
        with open(OUTPUT_LOG, 'r', errors='replace') as f:
            f.seek(last_position)
            initial = f.read()
    except FileNotFoundError:
        initial = ""
        last_position = 0

    start_time = time.time()
    stable_time = 0
    prev_content = initial

    while time.time() - start_time < timeout:
        time.sleep(0.3)

        try:
            with open(OUTPUT_LOG, 'r', errors='replace') as f:
                f.seek(last_position)
                new_text = f.read()
        except FileNotFoundError:
            new_text = ""

        if not new_text:
            # 没有新内容，继续等待
            stable_time += 0.3
            if stable_time > 2.0:
                break
            continue

        # 有新内容，看看是否包含提示符（表示 Claude 输出完毕）
        stripped = strip_ansi(new_text)

        # Claude Code 完成输出后会显示 ❯ 提示符
        last_line = stripped.strip().split('\n')[-1] if stripped else ''
        has_prompt = bool(re.match(r'^❯', last_line))

        # 或者检测状态栏行
        has_status = '·' in last_line and any(x in last_line for x in ['effort', 'mode', 'high'])

        # 或者内容稳定了一段时间
        if has_prompt or has_status:
            stable_time += 0.3
            if stable_time > 1.5:
                break
        else:
            stable_time = 0
            prev_content = stripped

        if time.time() - start_time > timeout:
            break

    # 读取最终内容
    try:
        with open(OUTPUT_LOG, 'r', errors='replace') as f:
            f.seek(last_position)
            final_text = f.read()
            last_position = f.tell()  # 更新位置
    except FileNotFoundError:
        return ""

    return final_text


def init_tmux_session():
    """初始化 tmux 会话并启动 Claude Code"""
    # 杀掉旧会话
    subprocess.run(['tmux', 'kill-session', '-t', TMUX_SESSION],
                   capture_output=True, timeout=5)
    time.sleep(0.5)

    # 创建新会话，不attach
    subprocess.run([
        'tmux', 'new-session', '-d', '-s', TMUX_SESSION, '-c', WORK_DIR
    ], timeout=5)

    # 设置 scrollback 足够大
    subprocess.run([
        'tmux', 'set-option', '-t', TMUX_SESSION, 'history-limit', '50000'
    ], timeout=3)

    time.sleep(0.5)

    # 启动 Claude Code
    subprocess.run([
        'tmux', 'send-keys', '-t', TMUX_SESSION, 'claude', 'Enter'
    ], timeout=5)

    # 等待 Claude Code 启动（显示欢迎界面）
    log.info("等待 Claude Code 启动...")
    time.sleep(8)

    # 确认 Claude Code 正在运行
    pane_content = subprocess.run(
        ['tmux', 'capture-pane', '-t', TMUX_SESSION, '-p'],
        capture_output=True, text=True, timeout=5
    ).stdout

    if not pane_content or len(pane_content) < 50:
        log.warning("Claude Code 可能未完全启动，继续等待...")
        time.sleep(5)

    # 设置日志管道
    setup_log_pipe()

    log.info("tmux 会话初始化完成")


def send_welcome(user_wxid):
    """发送欢迎消息到微信"""
    welcome = (
        "🤖 *Claude Code 已就绪*\n"
        "━━━━━━━━━━━━━━━━\n"
        "直接发消息给我，我会转发给 Claude 处理。\n\n"
        "支持命令：\n"
        "🔁 /reset   重置会话\n"
        "ℹ️  /status  查看状态\n"
        "━━━━━━━━━━━━━━━━"
    )
    itchat.send(welcome, user_wxid)


# ==================== 微信消息处理 ====================

@itchat.msg_register(TEXT, isFriendChat=True)
def handle_text(msg):
    """处理文本消息"""
    global WECHAT_TARGET, processing

    text = msg['Text'].strip()
    user = msg['User']
    wxid = msg['FromUserName']

    # 设置目标用户（只回复第一个发消息的人）
    if WECHAT_TARGET is None:
        WECHAT_TARGET = wxid
        log.info(f"设置目标用户: {user['NickName'] or wxid}")
        send_welcome(wxid)
        return

    # 如果不是目标用户，忽略
    if wxid != WECHAT_TARGET:
        return

    # 处理命令
    if text == '/reset':
        reset_tmux_session()
        itchat.send("🔄 *会话已重置*\n━━━━━━━━━━━━━━━━\n输入消息重新开始对话", wxid)
        return

    if text == '/status':
        itchat.send("✅ Claude Code 运行中", wxid)
        return

    # 非命令，转发到 Claude Code
    if processing:
        itchat.send("⏳ 正在处理上一条消息，请稍候...\n（每轮最多处理 2 分钟）", wxid)
        return

    with lock:
        processing = True

    try:
        # 发送消息到 tmux
        send_to_tmux(text)

        # 等待响应，先发一个"正在思考"的提示
        itchat.send("🤔 *Claude 正在思考...*\n━━━━━━━━━━━━━━━━", wxid)

        # 等待 Claude Code 响应
        raw_response = wait_for_response(timeout=120)
        log.info(f"获取到原始响应长度: {len(raw_response)}")

        if not raw_response.strip():
            itchat.send("⚠️ Claude 无输出，可能是命令执行时间过长。输入 /reset 重置。", wxid)
            return

        # 格式化输出
        formatted = format_for_wechat(raw_response)

        if not formatted:
            itchat.send("✅ 已处理（无文本输出）", wxid)
            return

        # 微信消息长度限制 ~5000 字符
        # 拆分长消息
        chunk_size = 4000

        # 添加消息分隔
        if len(formatted) > chunk_size:
            itchat.send(f"📎 *响应较长，分 { (len(formatted) // chunk_size) + 1 } 段发送*\n━━━━━━━━━━━━━━━━", wxid)

        for i in range(0, len(formatted), chunk_size):
            chunk = formatted[i:i+chunk_size]
            itchat.send(chunk, wxid)
            time.sleep(0.3)

    except Exception as e:
        log.error(f"处理消息出错: {e}", exc_info=True)
        itchat.send(f"❌ *处理出错*\n━━━━━━━━━━━━━━━━\n{str(e)[:200]}", wxid)
    finally:
        with lock:
            processing = False


@itchat.msg_register(PICTURE, isFriendChat=True)
def handle_picture(msg):
    """处理图片消息"""
    global WECHAT_TARGET

    wxid = msg['FromUserName']

    if WECHAT_TARGET is None:
        WECHAT_TARGET = wxid
    elif wxid != WECHAT_TARGET:
        return

    itchat.send("📷 已收到图片\n⚠️ 当前 Claude Code 不支持通过微信发送图片", wxid)


# ==================== 启动 ====================

if __name__ == '__main__':
    print("=" * 50)
    print(" 微信 ↔ Claude Code 桥接服务")
    print("=" * 50)
    print()

    # 初始化 tmux 会话
    print("[1/2] 初始化 tmux Claude Code 会话...")
    init_tmux_session()
    print("  ✅ Claude Code 已在 tmux 中运行")

    # 登录微信
    print("[2/2] 登录个人微信...")
    print("  📱 请用手机微信扫描二维码")
    print()

    itchat.auto_login(enableCmdQR=2, hotReload=True)

    print()
    print("=" * 50)
    print(" ✅ 桥接服务运行中")
    print("  · 在微信中向自己发消息即可与 Claude 对话")
    print("  · 输入 /reset 重置会话")
    print("  · 输入 /status 查看状态")
    print("  · 日志: /tmp/claude-wechat-bridge.log")
    print("=" * 50)

    itchat.run()
