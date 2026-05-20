#!/usr/bin/env node
// 乗レコ - 日本地図 GeoJSON ビルド (v237〜)
//
// 使い方:
//   node scripts/build-japan-geo.js
//
// 動作:
//   1. dataofjapan/land/japan.geojson (≈1.5MB, 47 都道府県境界, public domain)
//      を fetch
//   2. 全 47 都道府県の Polygon / MultiPolygon を Douglas-Peucker で簡略化
//   3. js/share-japan-geo.js に `export const JAPAN_PREFS = [...]` として書き出す
//
// 出力データ:
//   JAPAN_PREFS = [
//     { name: '北海道', polygons: [[[lat,lon], ...], [[lat,lon], ...], ...] },
//     ...
//   ]
//
//   polygons は MultiPolygon の場合は複数、Polygon の場合は 1 つ。
//   各 polygon は [lat,lon] の配列 (Canvas の y/x 順に合わせるため lon,lat ではなく lat,lon)
//
// 簡略化パラメータ (TOLERANCE) は経験則:
//   - 0.003 (≈ 300m) → ファイル ~50KB、海岸線は十分綺麗
//   - 0.005 (≈ 500m) → ファイル ~30KB、佐渡や島嶼が少し荒くなる
//   - 0.010 (≈ 1km)  → ファイル ~15KB、輪郭がぎこちなくなる
// v237 初期は 0.005 で開始 (OGP 1200×630 では十分なバランス)。

'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_URL = 'https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson';
const OUTPUT = path.resolve(__dirname, '..', 'js', 'share-japan-geo.js');
const TOLERANCE = 0.02;  // 度単位 (≈ 2km) — OGP 1200×630 の地図エリア (620×470) で 1px ≈ 3km なので十分

// ─────────────────────────────────────────────
// Douglas-Peucker (RDP) — 折れ線を簡略化
// 入力: [[lon,lat], [lon,lat], ...] / Tolerance は度単位の垂直距離
// 出力: 同じ形式の配列
// ─────────────────────────────────────────────
function rdp(points, tol) {
  if (points.length < 3) return points.slice();
  // 端点間の垂直距離を計算しつつ、最も離れた点を見つける
  const sq = (x) => x * x;
  function perpDistSq(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = sq(dx) + sq(dy);
    if (len2 === 0) return sq(p[0]-a[0]) + sq(p[1]-a[1]);
    const t = ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / len2;
    const tt = Math.max(0, Math.min(1, t));
    const projX = a[0] + tt * dx, projY = a[1] + tt * dy;
    return sq(p[0]-projX) + sq(p[1]-projY);
  }
  const tol2 = tol * tol;
  // スタックベース実装 (再帰深さでスタックオーバーフローしないため)
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    let maxD = 0, maxK = -1;
    for (let k = i + 1; k < j; k++) {
      const d = perpDistSq(points[k], points[i], points[j]);
      if (d > maxD) { maxD = d; maxK = k; }
    }
    if (maxD > tol2 && maxK !== -1) {
      keep[maxK] = true;
      stack.push([i, maxK], [maxK, j]);
    }
  }
  const out = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

// ─────────────────────────────────────────────
// メイン
// ─────────────────────────────────────────────
async function main() {
  console.log(`[build-japan-geo] fetching ${SOURCE_URL} ...`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  const raw = await res.text();
  console.log(`[build-japan-geo] fetched ${(raw.length/1024).toFixed(1)}KB`);
  const geo = JSON.parse(raw);
  if (!geo || geo.type !== 'FeatureCollection') throw new Error('not a FeatureCollection');

  const prefs = [];
  let totalIn = 0, totalOut = 0;
  for (const feat of geo.features) {
    const name = (feat.properties && (feat.properties.nam_ja || feat.properties.name_ja || feat.properties.name || feat.properties.nam)) || '?';
    const g = feat.geometry;
    if (!g) continue;
    const polys = [];
    if (g.type === 'Polygon') {
      // Polygon = [ outer_ring, hole_ring, ... ] / 各 ring は [lon,lat] の配列
      // 簡略化は outer ring のみ採用 (穴は OGP では不要)
      const ring = g.coordinates[0];
      totalIn += ring.length;
      const simp = rdp(ring, TOLERANCE);
      totalOut += simp.length;
      polys.push(simp);
    } else if (g.type === 'MultiPolygon') {
      // MultiPolygon = [ [outer, hole, ...], ... ]
      for (const poly of g.coordinates) {
        const ring = poly[0];
        if (ring.length < 4) continue; // 退化した tiny polygon は捨てる
        // bbox による足切り (OGP 用途では離島の見えない島は不要)
        let la0=Infinity, la1=-Infinity, lo0=Infinity, lo1=-Infinity;
        for (const [lo, la] of ring) {
          if (la<la0) la0=la; if (la>la1) la1=la;
          if (lo<lo0) lo0=lo; if (lo>lo1) lo1=lo;
        }
        const span = Math.max(la1-la0, lo1-lo0);
        if (span < 0.08) continue; // ≈ 8km 未満の小島は捨てる (OGP では点にもならない)
        totalIn += ring.length;
        const simp = rdp(ring, TOLERANCE);
        if (simp.length < 4) continue;
        totalOut += simp.length;
        polys.push(simp);
      }
    } else {
      continue;
    }
    // [lon,lat] → [lat,lon] に並べ替え、小数 3 桁に丸めて出力サイズ削減
    const polysLatLon = polys.map(p => p.map(([lon, lat]) => [
      Number(lat.toFixed(3)),
      Number(lon.toFixed(3)),
    ]));
    prefs.push({ name, polygons: polysLatLon });
  }
  console.log(`[build-japan-geo] simplified: ${totalIn} → ${totalOut} pts (${(totalOut/totalIn*100).toFixed(1)}%)`);
  console.log(`[build-japan-geo] prefectures: ${prefs.length}`);

  // 出力
  const banner = `// AUTO-GENERATED by scripts/build-japan-geo.js — DO NOT EDIT.
// Source: ${SOURCE_URL} (public domain, dataofjapan/land)
// Tolerance: ${TOLERANCE} deg (≈ 500m) / Douglas-Peucker
// Points: ${totalIn} → ${totalOut} (${(totalOut/totalIn*100).toFixed(1)}%)
// 各 prefecture は { name, polygons: [[[lat,lon], ...], ...] } 形式。
// OGP 画像生成 (js/14-share-ogp.js) の海岸線描画に使用。

`;
  const body = `export const JAPAN_PREFS = ${JSON.stringify(prefs)};\n\nwindow.JAPAN_PREFS = JAPAN_PREFS;\n`;
  fs.writeFileSync(OUTPUT, banner + body, 'utf8');
  const outBytes = fs.statSync(OUTPUT).size;
  console.log(`[build-japan-geo] wrote ${OUTPUT} (${(outBytes/1024).toFixed(1)}KB)`);
}

main().catch(e => {
  console.error('[build-japan-geo] FAIL:', e.message);
  process.exit(1);
});
