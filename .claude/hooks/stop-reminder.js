#!/usr/bin/env node
// Stop hook — see Notion ⚙️ セッション運用 三層設計 §2.4
// (1) git にコード変更ありなのに CHANGELOG / TODO 未更新なら一言
// (2) CHANGELOG.md が 1500 行超なら分割を促す (STATUS.md 同時整理も併記) — v349 ルール
// ブロックしない。

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let raw = '';
try {
  raw = execSync('git status --short', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
} catch {
  process.exit(0);
}

const lines = raw.split(/\r?\n/).filter(Boolean);

// "XY path" / "XY oldpath -> newpath" を path 配列に
const paths = [];
for (const line of lines) {
  const rest = line.replace(/^...\s?/, '');
  const arrow = rest.indexOf(' -> ');
  const p = arrow >= 0 ? rest.slice(arrow + 4) : rest;
  paths.push(p.replace(/^"|"$/g, ''));
}

const isCodeChange = (p) =>
  p === 'sw.js' ||
  p.startsWith('js/') ||
  p.endsWith('.html') ||
  p.endsWith('.css');

const hasCode      = paths.some(isCodeChange);
const hasSw        = paths.some(p => p === 'sw.js');
const hasChangelog = paths.some(p => p === 'CHANGELOG.md');
const hasTodo      = paths.some(p => p === 'TODO.md');
const hasStatus    = paths.some(p => p === 'STATUS.md');

const missing = [];
if (hasCode) {
  if (!hasChangelog) missing.push('CHANGELOG.md');
  if (!hasTodo)      missing.push('TODO.md');
}
// sw.js が変わったら STATUS.md の CACHE_VERSION 追従が必須 (v271 ルール)
if (hasSw && !hasStatus) missing.push('STATUS.md (CACHE_VERSION 追従)');

if (missing.length) {
  process.stdout.write(
    `[stop-reminder] このターンの変更を ${missing.join(' / ')} に反映して\n`
  );
}

// (2) CHANGELOG.md 行数チェック — 1500 行超で分割を促す (v349 ルール)
const CHANGELOG_LIMIT = 1500;
try {
  const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');
  if (fs.existsSync(changelogPath)) {
    const content = fs.readFileSync(changelogPath, 'utf8');
    const lineCount = content.split(/\r?\n/).length;
    if (lineCount > CHANGELOG_LIMIT) {
      process.stdout.write(
        `[stop-reminder] CHANGELOG.md が ${lineCount} 行 (閾値 ${CHANGELOG_LIMIT}) — 完成したサブフェーズを CHANGELOG_PHASE*.md に退避し、STATUS.md も同時に整理して\n`
      );
    }
  }
} catch {
  // 読めなければ無視
}

process.exit(0);
