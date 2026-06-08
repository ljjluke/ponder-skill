#!/usr/bin/env node
/**
 * MCTS-TD Memory Manager (Pure Node.js)
 * Archive/recall/cleanup for knowledge graph tiered storage.
 * Usage: node manage_memory.js <command> [args...]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { log } = console;

const DATA_DIR = path.join(os.homedir(), '.claude', 'data', 'skills', 'mcts-td-planner');
const MEMORY_DIR = path.join(DATA_DIR, 'memory');
const ACTIVE_FILE = path.join(MEMORY_DIR, 'mcts-td-value-archive.md');
const ARCHIVE_DIR = path.join(MEMORY_DIR, 'archive');

function ensureDirs() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });
    if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

function getStatus() {
    ensureDirs();
    const active = fs.existsSync(ACTIVE_FILE) ? fs.statSync(ACTIVE_FILE).size : 0;
    const archives = fs.existsSync(ARCHIVE_DIR) ? fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.md')) : [];
    return { active_file: ACTIVE_FILE, active_size_bytes: active, archive_dir: ARCHIVE_DIR, archive_files: archives.length, archives };
}

function archiveOld(days = 60) {
    ensureDirs();
    // Simple file-based: move old knowledge entries to archive
    if (!fs.existsSync(ACTIVE_FILE)) return { archived: 0, message: "No active file" };

    const content = fs.readFileSync(ACTIVE_FILE, 'utf-8');
    const month = new Date().toISOString().substring(0, 7);
    const archivePath = path.join(ARCHIVE_DIR, `${month}.md`);

    // Append current content to archive
    const header = `\n--- Archived: ${new Date().toISOString()} ---\n`;
    fs.appendFileSync(archivePath, header + content);

    // Reset active file
    fs.writeFileSync(ACTIVE_FILE, content.split('\n').slice(0, 5).join('\n') + '\n');

    return { archived: 1, archive_file: archivePath, message: "Active content moved to archive" };
}

function cleanup(days = 365) {
    ensureDirs();
    const cutoff = Date.now() - days * 86400000;
    let removed = 0;
    if (fs.existsSync(ARCHIVE_DIR)) {
        for (const f of fs.readdirSync(ARCHIVE_DIR)) {
            const fp = path.join(ARCHIVE_DIR, f);
            if (fs.statSync(fp).mtimeMs < cutoff) { fs.unlinkSync(fp); removed++; }
        }
    }
    return { removed, message: `Removed ${removed} archive files older than ${days} days` };
}

// CLI
function main() {
    const [cmd, ...rest] = process.argv.slice(2);
    const args = {};
    for (let i = 0; i < rest.length; i++) {
        if (rest[i].startsWith("--")) {
            const k = rest[i].replace(/^--/, "");
            const v = rest[i + 1];
            if (v && !v.startsWith("--")) { args[k] = v; i++; }
            else args[k] = true;
        }
    }

    try {
        switch (cmd) {
            case "status": log(JSON.stringify(getStatus(), null, 2)); break;
            case "archive": log(JSON.stringify(archiveOld(parseInt(args.days) || 60))); break;
            case "cleanup": log(JSON.stringify(cleanup(parseInt(args.days) || 365))); break;
            default: log("Usage: node manage_memory.js status|archive|cleanup [--days N]"); process.exit(1);
        }
    } catch (e) { log(`Error: ${e.message}`); process.exit(1); }
}

main();