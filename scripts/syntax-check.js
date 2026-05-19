#!/usr/bin/env node
// 乗レコ JS シンタックスチェック (Notion §2.4 布石②)
//
// 使い方:
//   node scripts/syntax-check.js
//   npm run check
//
// 動作: js/*.js を `new Function()` でパースし、SyntaxError があるか確認。
// クラシック script ロード前提なので「全 17 ファイルが OK で並ぶ」のがリリース可能条件。
//
// v127 の教訓 (const grid 二重宣言で地図真っ黒) や v192 の全角カッコ取り違えを
// CI 不在の個人開発で防ぐためのシンプルな砦。新規ファイルを足したら下の files 配列に
// 追加すること (v131/v132/v135/v138/v190/v192 で都度更新してきた歴史)。

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const JS_DIR = path.join(ROOT, 'js');

// クラシック script ロード順 (HTML <script src> と同じ順)。
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
  try {
    new Function(fs.readFileSync(filePath, 'utf8'));
    console.log(`OK   ${f}`);
    okCount++;
  } catch (e) {
    console.log(`FAIL ${f}  — ${e.message}`);
    failCount++;
    failures.push({ file: f, message: e.message });
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
// `^function NAME(` のみ拾う。IIFE 内や const/let は除外 (誤検出が多いため簡易版)。
const fnSeen = new Map(); // name -> [files]
for (const f of FILES) {
  const filePath = path.join(JS_DIR, `${f}.js`);
  const src = fs.readFileSync(filePath, 'utf8');
  const re = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    if (!fnSeen.has(name)) fnSeen.set(name, []);
    fnSeen.get(name).push(f);
  }
}

const duplicates = [...fnSeen.entries()].filter(([, files]) => files.length > 1);
if (duplicates.length > 0) {
  console.warn('\n⚠️  Top-level function name collisions (later file wins silently):');
  for (const [name, files] of duplicates) {
    console.warn(`  - ${name}: ${files.join(', ')}`);
  }
  // 警告のみ。意図的な重複もありうるので exit はしない。
}

console.log('\n✅ All clear.');
