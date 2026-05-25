#!/usr/bin/env node
// v338: through_lines の双方向化バグ修正
//
// 問題: v334 で broken refs (jr_kyoto_line→biwako_line 等) を直すときに、参照先 (jr_biwako_line) 側の
// 逆方向 ref を追加していなかった。同様に v334 で書いた jr_ueno_tokyo_line / jr_shonan_shinjuku_line
// から派生路線 (宇都宮/高崎/常磐中距離/横須賀) への ref も片方向のまま。Phase A〜C 新規追加は
// addRef(a,b) + addRef(b,a) で双方向にしていたが、v334 で既存だった ref は監査漏れ。
//
// ユスケ報告: 「JR京都線 → 琵琶湖線 へは飛べるが、琵琶湖線 → JR京都線 へ戻れない」
//
// 修正方針: 既存 through_lines を全件監査し、片方向参照を全部双方向化する。

const fs = require('fs');
const path = require('path');

const PATH = path.resolve(__dirname, '..', 'service_lines_master.json');
const raw = fs.readFileSync(PATH, 'utf8');
const data = JSON.parse(raw);

const lines = data.service_lines;
const idx = new Map(lines.map(l => [l.id, l]));

// 片方向参照を検出
const missing = [];
for (const a of lines) {
  for (const b of (a.through_lines || [])) {
    const bLine = idx.get(b);
    if (!bLine) continue;
    const back = bLine.through_lines || [];
    if (!back.includes(a.id)) {
      missing.push([b, a.id]);  // bLine の through_lines に a.id を追加すべき
    }
  }
}

console.log(`=== 片方向参照: ${missing.length} 件検出 ===`);
let added = 0;
for (const [srcId, dstId] of missing) {
  const src = idx.get(srcId);
  if (!Array.isArray(src.through_lines)) src.through_lines = [];
  if (src.through_lines.includes(dstId)) continue;
  src.through_lines.push(dstId);
  console.log(`+ added: ${srcId} -> ${dstId}`);
  added++;
}

data.updated_at = new Date().toISOString().slice(0, 10);

// 再監査: 片方向 0 + broken refs 0 を assert
const ids = new Set(lines.map(l => l.id));
let stillMissing = 0;
for (const a of lines) {
  for (const b of (a.through_lines || [])) {
    const bLine = idx.get(b);
    if (!bLine) { console.error(`!! broken ref: ${a.id} -> ${b}`); continue; }
    if (!(bLine.through_lines || []).includes(a.id)) {
      console.error(`!! still unidirectional: ${a.id} -> ${b}`);
      stillMissing++;
    }
  }
}
if (stillMissing > 0) { console.error(`!! ${stillMissing} unidirectional refs remain. abort write.`); process.exit(1); }

let broken = 0;
for (const l of lines) {
  for (const r of (l.through_lines || [])) {
    if (!ids.has(r)) { broken++; }
  }
}
if (broken > 0) { console.error(`!! ${broken} broken refs. abort write.`); process.exit(1); }

fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
console.log(`\nwrote ${PATH}`);
console.log(`refs added: ${added}`);
console.log(`total service_lines: ${lines.length}`);
console.log(`broken refs: ${broken}`);
console.log(`unidirectional refs: ${stillMissing}`);
