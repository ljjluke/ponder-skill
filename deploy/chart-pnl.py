#!/usr/bin/env python3
"""生成收益折线图 — 近N次每日盈亏"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import json, os, sys
from datetime import datetime

DATA_DIR = "/opt/scripts/data"
OUTPUT_DIR = "/tmp/wechat-charts"

def generate_pnl_chart(days=20):
    """生成近 days 次每日盈亏折线图，返回图片路径"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    pnl_file = os.path.join(DATA_DIR, "daily-pnl.json")
    if not os.path.exists(pnl_file):
        return None

    with open(pnl_file) as f:
        records = json.load(f)

    if not records:
        return None

    # 取最近 days 条
    recent = records[-days:]

    dates = []
    pnls = []
    cumulative = 0
    cum_pnls = []

    for r in recent:
        try:
            d = datetime.strptime(r["date"][:10], "%Y-%m-%d")
        except:
            d = datetime.now()
        p = r.get("daily_pnl", 0)
        dates.append(d)
        pnls.append(p)
        cumulative += p
        cum_pnls.append(cumulative)

    # 计算合适的 y 轴范围
    all_vals = pnls + cum_pnls
    y_min = min(all_vals) * 1.3 if all_vals else -1000
    y_max = max(all_vals) * 1.3 if all_vals else 1000

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 7), gridspec_kw={'height_ratios': [1, 1]})
    fig.suptitle("每日盈亏趋势", fontsize=14, fontweight="bold", y=0.98)

    # 上：每日盈亏（柱状图）
    colors = ["#e74c3c" if v < 0 else "#2ecc71" for v in pnls]
    ax1.bar(dates, pnls, color=colors, width=0.6, alpha=0.85)
    ax1.axhline(y=0, color='gray', linewidth=0.5)
    ax1.set_ylabel("每日盈亏 (¥)", fontsize=11)
    ax1.xaxis.set_major_formatter(mdates.DateFormatter("%m/%d"))
    ax1.tick_params(axis='x', rotation=45)
    ax1.grid(axis='y', alpha=0.3)

    # 在柱子上标数值（只标绝对值大的）
    for i, (d, v) in enumerate(zip(dates, pnls)):
        if abs(v) > max(abs(y_min), abs(y_max)) * 0.05:
            va = 'bottom' if v >= 0 else 'top'
            offset = max(abs(y_min), abs(y_max)) * 0.02
            y_pos = v + offset if v >= 0 else v - offset
            ax1.text(d, y_pos, f"¥{v:+,.0f}", ha='center', va=va, fontsize=7, rotation=45)

    # 下：累计收益（折线图）
    ax2.plot(dates, cum_pnls, color="#3498db", linewidth=2, marker='o', markersize=4)
    ax2.fill_between(dates, cum_pnls, alpha=0.1, color="#3498db")
    ax2.axhline(y=0, color='gray', linewidth=0.5)
    ax2.set_ylabel("累计收益 (¥)", fontsize=11)
    ax2.set_xlabel("日期", fontsize=11)
    ax2.xaxis.set_major_formatter(mdates.DateFormatter("%m/%d"))
    ax2.tick_params(axis='x', rotation=45)
    ax2.grid(axis='y', alpha=0.3)

    # 终点标累计值
    if cum_pnls:
        last_d = dates[-1]
        last_v = cum_pnls[-1]
        ax2.annotate(f"¥{last_v:+,.0f}", xy=(last_d, last_v),
                    xytext=(10, 10), textcoords="offset points",
                    fontsize=10, fontweight="bold", color="#3498db",
                    arrowprops=dict(arrowstyle="->", color="#3498db"))

    plt.tight_layout(rect=[0, 0, 1, 0.95])
    out_path = os.path.join(OUTPUT_DIR, "pnl_chart.png")
    plt.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close()
    return out_path


if __name__ == "__main__":
    path = generate_pnl_chart()
    if path:
        print(path)
    else:
        print("NO_DATA")
        sys.exit(1)