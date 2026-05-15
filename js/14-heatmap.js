// ══════════════════════════════════════════════════════════════
// 都道府県ヒートマップ (z < 10 で表示) — Task 2
// 仕様: 📜 マップLOD設計 — Image 5 基準とヒートマップ
//
// z=5-9 はパイ/ラインを引っ込めて、代わりにこのレイヤで
// 「県別 制覇率」をブロック塗りで一目化する。
// 依存: SERVICE_LINES, slRiddenSt (描画系), prefOfStation (13-mypage.js)
// ══════════════════════════════════════════════════════════════

// 制覇率 → 塗り色 (スペック PREF_COLOR_SCALE)
const PREF_COLOR_SCALE = [
  { max: 0,   color: 'rgba(50,50,50,0.30)'     },  // 未訪問: 暗灰
  { max: 10,  color: 'rgba(120,80,60,0.40)'    },
  { max: 30,  color: 'rgba(180,100,60,0.50)'   },
  { max: 50,  color: 'rgba(220,140,60,0.60)'   },
  { max: 80,  color: 'rgba(250,180,60,0.70)'   },
  { max: 99,  color: 'rgba(255,200,80,0.75)'   },
  { max: 100, color: 'rgba(255,215,0,0.85)'    },  // 完全制覇: 金
];

function prefColorForPct(pct) {
  for (const tier of PREF_COLOR_SCALE) {
    if (pct <= tier.max) return tier.color;
  }
  return PREF_COLOR_SCALE[PREF_COLOR_SCALE.length - 1].color;
}

// 都道府県別 制覇率の集計 (描画系の slRiddenSt をそのまま使う)
//   pct = ridden_unique / total_unique × 100
//   フィルタ (期間など) は slRiddenSt 経由で自然に反映される
let _prefCoverageCache = null;
function computePrefCoverage() {
  // cache は更新されたら invalidate
  if (_prefCoverageCache && _prefCoverageCache._stamp === window._prefHeatmapStamp) {
    return _prefCoverageCache;
  }
  if (typeof prefOfStation !== 'function' || !window.SERVICE_LINES) {
    return {};
  }
  const total = {};   // pref → Set<駅名>
  const ridden = {};  // pref → Set<駅名>
  for (const sl of SERVICE_LINES) {
    const rs = (typeof slRiddenSt !== 'undefined') ? slRiddenSt[sl.id] : null;
    for (const s of sl.stations) {
      if (s.lat == null) continue;
      const p = prefOfStation(s.lat, s.lon);
      if (!p) continue;
      if (!total[p]) total[p] = new Set();
      total[p].add(s.name);
      if (rs && rs.has(s.name)) {
        if (!ridden[p]) ridden[p] = new Set();
        ridden[p].add(s.name);
      }
    }
  }
  const out = {};
  for (const p of Object.keys(total)) {
    const t = total[p].size;
    const r = ridden[p] ? ridden[p].size : 0;
    out[p] = { total: t, ridden: r, pct: t > 0 ? Math.round((r / t) * 100) : 0 };
  }
  _prefCoverageCache = out;
  _prefCoverageCache._stamp = window._prefHeatmapStamp;
  return out;
}

// trip 変更時にキャッシュを無効化するためのスタンプ
window._prefHeatmapStamp = 0;
function invalidatePrefHeatmap() {
  window._prefHeatmapStamp = (window._prefHeatmapStamp || 0) + 1;
}

// GeoJSON のロード
async function loadPrefHeatmap() {
  if (window._prefGeoJson) return window._prefGeoJson;
  try {
    const res = await fetch('jp_prefectures.geojson');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const gj = await res.json();
    window._prefGeoJson = gj;
    console.log(`[ヒートマップ] GeoJSON ロード完了: ${gj.features.length} 都道府県`);
    return gj;
  } catch (e) {
    console.warn('[ヒートマップ] GeoJSON ロード失敗:', e);
    return null;
  }
}

// 県ポリゴンの style 計算
function _prefStyle(feature) {
  const name = feature.properties && feature.properties.name;
  const cov = computePrefCoverage();
  const c = name && cov[name] ? cov[name] : null;
  const pct = c ? c.pct : 0;
  return {
    fillColor: prefColorForPct(pct),
    fillOpacity: 1,             // 色側 rgba ですでに alpha 制御
    weight: 1,
    color: 'rgba(255,255,255,0.25)',
    opacity: 0.6,
  };
}

// ヒートマップを描画 (zoom に応じて add/remove)
function renderPrefHeatmap() {
  if (!map) return;
  const z = map.getZoom();
  const shouldShow = z < 10;

  if (!shouldShow) {
    if (window._prefHeatmapLayer && map.hasLayer(window._prefHeatmapLayer)) {
      map.removeLayer(window._prefHeatmapLayer);
    }
    return;
  }

  // 必要 → GeoJSON を確実にロード
  if (!window._prefGeoJson) {
    loadPrefHeatmap().then(gj => {
      if (gj) renderPrefHeatmap();
    });
    return;
  }

  // 既存レイヤがあれば style だけ再計算 (covarage の最新化)
  if (window._prefHeatmapLayer) {
    window._prefHeatmapLayer.setStyle(_prefStyle);
    if (!map.hasLayer(window._prefHeatmapLayer)) map.addLayer(window._prefHeatmapLayer);
    // pane を最下層 (タイルの上 / 路線の下)
    return;
  }

  window._prefHeatmapLayer = L.geoJSON(window._prefGeoJson, {
    style: _prefStyle,
    interactive: true,
    onEachFeature: (feature, layer) => {
      const name = feature.properties && feature.properties.name;
      layer.on('click', (e) => {
        const cov = computePrefCoverage();
        const c = (name && cov[name]) || { total: 0, ridden: 0, pct: 0 };
        const html = `
          <div style="min-width:160px;font-family:'Zen Kaku Gothic New',sans-serif">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px">${name || '?'}</div>
            <div style="font-size:11px;color:rgba(255,255,255,.85)">
              <span style="color:#f2a900;font-weight:700">${c.pct}%</span> 制覇
            </div>
            <div style="font-size:10px;color:rgba(140,160,179,.85);margin-top:2px">
              ${c.ridden} / ${c.total} 駅 訪問
            </div>
          </div>
        `;
        L.popup({ className: 'norireco-tooltip', closeButton: true })
          .setLatLng(e.latlng)
          .setContent(html)
          .openOn(map);
      });
    },
  });
  // ヒートマップは路線/駅の下に置く (タイル直上)
  if (map.getPane('overlayPane') && window._prefHeatmapLayer.getPane) {
    // Leaflet default overlayPane で OK だが、必ず先頭側 (Z-index 400 近辺) に
    // ※ markers と polylines は同じ overlayPane なので bringToBack で対応
  }
  map.addLayer(window._prefHeatmapLayer);
  if (window._prefHeatmapLayer.bringToBack) window._prefHeatmapLayer.bringToBack();
}

// 初期ロード: 地図が準備できたら geojson をプリフェッチ + 初回描画
window.addEventListener('load', () => {
  // map / SERVICE_LINES が揃うまで polling
  let tries = 0;
  const iv = setInterval(() => {
    tries++;
    if (window.map && typeof prefOfStation === 'function') {
      clearInterval(iv);
      loadPrefHeatmap().then(() => {
        renderPrefHeatmap();
        // zoom イベントにフック
        map.on('zoomend', renderPrefHeatmap);
        // SERVICE_LINES 構築後にも再描画 (覆い率の遅延更新)
        const recheck = setInterval(() => {
          if (window.SERVICE_LINES && window.SERVICE_LINES.length > 0) {
            invalidatePrefHeatmap();
            renderPrefHeatmap();
            clearInterval(recheck);
          }
        }, 500);
        setTimeout(() => clearInterval(recheck), 30000);  // 30秒で諦め
      });
    } else if (tries > 60) {
      clearInterval(iv);
    }
  }, 250);
});
