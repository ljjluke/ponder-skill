/**
 * ═══════════════════════════════════════════════════════════════
 *  Shared utilities for MCTS-TD CLI scripts
 *  "工欲善其事，必先利其器" —《论语·卫灵公》
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Parse CLI args into key-value map
 * --key value or --flag
 */
function parseArgs(args) {
    const r = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const k = args[i].replace(/^--/, '');
            const v = args[i + 1];
            if (v && !v.startsWith('--')) { r[k] = v; i++; }
            else r[k] = true;
        }
    }
    return r;
}

module.exports = { parseArgs };
