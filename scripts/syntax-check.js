#!/usr/bin/env node
// 乗レコ JS シンタックスチェック (Notion §2.4 布石②)
//
// 使い方:
//   node scripts/syntax-check.js
//   npm run check
//
// 動作: js/*.js を `node --check --input-type=module` でパースし SyntaxError を検出。
// v195〜v222 で全 18 ファイルが `<script type="module">` 化済 (案 β stage 2 完結)
// なので、ES Module syntax (import / export) を通せる必要がある。
// v223 stage 3 で `new Function()` (classic script パース) → `node --check --input-type=module`
// に切替え。これで `export const auth = NORIRECO.auth` のような module 構文を
// 書いた瞬間に SyntaxError にならずチェックが通る。
//
// v127 の教訓 (const grid 二重宣言で地図真っ黒) や v192 の全角カッコ取り違えを
// CI 不在の個人開発で防ぐためのシンプルな砦。新規ファイルを足したら下の FILES 配列に
// 追加すること (v131/v132/v135/v138/v190/v192/v194 で都度更新してきた歴史)。

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const JS_DIR = path.join(ROOT, 'js');

// `<script type="module">` のロード順 (HTML <script src> と同じ順)。
// 新規ファイル追加時はここと noritetsu-map.html / sw.js STATIC_ASSETS の 3 点更新。
const FILES = [
  '01-constants',
  '02-data-loaders',
  '02b-service-lines-builder',
  '03-characters',
  '04-gps-location',
  '04b-ride-record',
  '05-supabase-data',
  '06-map-leaflet',
  '07-record-mode',
  '08-rendering',
  '09-tabs-stats',
  '10-init',
  '11-fraud-detection',
  '12-auth',
  '13-mypage-common',
  '13a-stats',
  '13b-trips',
  '13c-lines',
  '14-share-ogp',
  'share-japan-geo',
];

let okCount = 0;
let failCount = 0;
const failures = [];

for (const f of FILES) {
  const filePath = path.join(JS_DIR, `${f}.js`);
  if (!fs.existsSync(filePath)) {
    console.log(`MISSING ${f}.js`);
    failCount++;
    failures.push({ file: f, message: 'file not found' });
    continue;
  }
  const src = fs.readFileSync(filePath, 'utf8');
  const result = spawnSync(
    process.execPath,
    ['--check', '--input-type=module', '-'],
    { input: src, encoding: 'utf8' }
  );
  if (result.status === 0) {
    console.log(`OK   ${f}`);
    okCount++;
  } else {
    // node --check は stderr に "[stdin]:LINE\n...\nSyntaxError: MSG" 形式で吐く。
    // 必要部分だけ抜く: SyntaxError 行 + 直前の行番号インジケータ。
    const stderr = (result.stderr || '').trim();
    const lines = stderr.split('\n');
    const synLine = lines.find(l => /SyntaxError/.test(l)) || lines[lines.length - 1] || 'unknown';
    const locLine = lines.find(l => /^\[stdin\]:\d+/.test(l)) || '';
    const summary = locLine ? `${locLine.trim()} — ${synLine.trim()}` : synLine.trim();
    console.log(`FAIL ${f}  — ${summary}`);
    failCount++;
    failures.push({ file: f, message: summary, raw: stderr });
  }
}

console.log('---');
console.log(`OK ${okCount} / FAIL ${failCount} (total ${FILES.length})`);

if (failCount > 0) {
  console.error('\n❌ Syntax errors detected. Fix before deploying.');
  for (const { file, message } of failures) {
    console.error(`  - ${file}: ${message}`);
  }
  process.exit(1);
}

// 同名トップレベル関数の重複検出 (v127 const grid 型・同名 function 上書き型)
//
// module 化後 (v195〜v222) は各ファイルが独立スコープになり、`function NAME`
// 同名でも runtime 衝突は起きない。ただし「同じ関数を別ファイルにコピペした」
// 設計上のミスは依然として見つけたいので、警告として残す (exit はしない)。
// `^function NAME(` のみ拾う。IIFE 内や const/let は除外 (誤検出が多いため簡易版)。
const fnSeen = new Map(); // name -> [files]
for (const f of FILES) {
  const filePath = path.join(JS_DIR, `${f}.js`);
  const src = fs.readFileSync(filePath, 'utf8');
  const re = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    if (!fnSeen.has(name)) fnSeen.set(name, []);
    fnSeen.get(name).push(f);
  }
}

const duplicates = [...fnSeen.entries()].filter(([, files]) => files.length > 1);
if (duplicates.length > 0) {
  console.warn('\n⚠️  Top-level function name collisions (module 化後は runtime 衝突しないが、コピペミスの可能性):');
  for (const [name, files] of duplicates) {
    console.warn(`  - ${name}: ${files.join(', ')}`);
  }
  // 警告のみ。意図的な重複もありうるので exit はしない。
}

console.log('\n✅ All clear.');
