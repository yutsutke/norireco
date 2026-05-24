#!/usr/bin/env node
// SessionStart (startup) hook — see Notion ⚙️ セッション運用 三層設計 §2.3
// クロスプラットフォーム (Windows / macOS / Linux) — Node 標準 API のみ使用

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = process.cwd();

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

// ---- CACHE_VERSION (sw.js から抽出) ----
let cacheVersion = '(取得失敗)';
const sw = readFileSafe(path.join(root, 'sw.js'));
const cvMatch = sw.match(/const\s+CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);
if (cvMatch) cacheVersion = cvMatch[1];

// ---- git status --short ----
let gitStatus = '';
let gitOk = true;
try {
  gitStatus = execSync('git status --short', {
    encoding: 'utf8',
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe']
  }).replace(/\s+$/, '');
} catch {
  gitOk = false;
}
const gitSummary = !gitOk ? '(git status 取得失敗)' : (gitStatus ? '変更あり' : 'clean');

// ---- TODO.md 分類見出し（🔥🟡🟢🔧🎮）と配下項目 ----
const todoRaw = readFileSafe(path.join(root, 'TODO.md'));
const classHeader = /^##\s+[🔥🟡🟢🔧🎮]/;
const anyH2 = /^##\s+/;
const topItem = /^- \[[ xX]\] /;
let capture = false;
const todoLines = [];
for (const line of todoRaw.split(/\r?\n/)) {
  if (classHeader.test(line)) {
    capture = true;
    if (todoLines.length) todoLines.push('');
    todoLines.push(line);
    continue;
  }
  if (anyH2.test(line)) {
    capture = false;
    continue;
  }
  if (capture && topItem.test(line)) {
    todoLines.push(line);
  }
}
const todoBlock = todoLines.join('\n').trim() || '(TODO.md の分類見出しが見つからない)';

// ---- STATUS.md 全文（v271〜 Notion §0.1 から分離・git 管轄）----
const statusRaw = readFileSafe(path.join(root, 'STATUS.md')).trim()
  || '(STATUS.md が見つからない)';

// ---- 出力 ----
const indentedGit = gitStatus
  ? '\n' + gitStatus.split('\n').map(l => '  ' + l).join('\n')
  : '';
const indentedTodo = todoBlock.split('\n').map(l => '  ' + l).join('\n');

const out = `=== 乗レコ セッション開始（startup）===
[ローカル状態]
- CACHE_VERSION: ${cacheVersion}
- git: ${gitSummary}${indentedGit}
- TODO.md 分類見出し:
${indentedTodo}

[STATUS.md — 現在のスナップショット（v271〜 Notion §0.1 から分離）]
${statusRaw}
`;
// 着手前手順は CLAUDE.md「セッション開始時」に移管（v322 リファクタ）— hook 出力が 2KB を超えてプレビュー切れすると読まれない問題への対処

process.stdout.write(out);
