// ══════════════════════════════════════════════════════════════
// 14-share-ogp.js — OGP 画像生成 (v236〜)
// マイページ完乗率カードの「📸 シェア画像を作成」から呼ばれる。
// 1200×630 の Canvas を直接描画 → PNG 化 → プレビューモーダル表示。
// 外部依存なし (Canvas API のみ)。日本地図シルエットは lat/lon ベースで自己完結。
// ══════════════════════════════════════════════════════════════

const OGP_W = 1200;
const OGP_H = 630;

// 日本全国 bbox (固定) — 沖縄は OGP では切り落とし、メイン 4 島 + 主要離島を表示
const JP_BBOX = { lat0: 30.5, lat1: 45.7, lon0: 128.5, lon1: 146.0 };

// 47 都道府県境界ポリゴン: scripts/build-japan-geo.js が
// dataofjapan/land/japan.geojson (public domain) を Douglas-Peucker (tol 0.02 deg)
// で簡略化したものを js/share-japan-geo.js が export している (window.JAPAN_PREFS)。
function getJapanPrefs() {
  return (window.JAPAN_PREFS) || [];
}

function projToCanvas(lat, lon, bbox, x0, y0, w, h) {
  return {
    x: x0 + ((lon - bbox.lon0) / (bbox.lon1 - bbox.lon0)) * w,
    y: y0 + ((bbox.lat1 - lat) / (bbox.lat1 - bbox.lat0)) * h,
  };
}

// SERVICE_LINES と区間配列から「描画用ポリライン」配列を作る。
// segs 省略時は全国累計版 (window.RIDDEN_SEGS)、指定時は個別 trip の segments。
// segs の各要素は { lineId, from(駅名), to(駅名) } 形式 (RIDDEN_SEGS / trip.segments 共通)。
// 返値: [{ color, points: [{lat,lon},...] }, ...]
function buildSegmentPolylines(segs) {
  const SL = (window.NORIRECO && NORIRECO.data && NORIRECO.data.SERVICE_LINES) || [];
  segs = segs || (window.RIDDEN_SEGS) || [];
  if (!SL.length || !segs.length) return [];

  const slById = new Map(SL.map(sl => [sl.id, sl]));
  const out = [];
  for (const seg of segs) {
    const sl = slById.get(seg.lineId);
    if (!sl) continue;
    const fromIdx = sl.stations.findIndex(s => s.name === seg.from);
    const toIdx = sl.stations.findIndex(s => s.name === seg.to);
    if (fromIdx < 0 || toIdx < 0) continue;
    const [a, b] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
    const points = [];
    for (let i = a; i <= b; i++) {
      const s = sl.stations[i];
      if (s.lat != null && s.lon != null) points.push({ lat: s.lat, lon: s.lon });
    }
    if (points.length >= 2) out.push({ color: sl.color || '#E8352A', points });
  }
  return out;
}

// 個別 trip 用にポリラインの全点を覆う bbox を計算し、パネルのアスペクト比に合わせて拡張する。
// 投影 (projToCanvas) は lon→x / lat→y を独立に線形写像するため、緯度補正 (cos) を入れて
// 経路が過度に縦横歪まないよう lonSpan/latSpan を調整する。pad は外周の余白率。
function computeTripBbox(polylines, w, h, pad) {
  let lat0 = Infinity, lat1 = -Infinity, lon0 = Infinity, lon1 = -Infinity;
  for (const pl of polylines) {
    for (const p of pl.points) {
      if (p.lat < lat0) lat0 = p.lat;
      if (p.lat > lat1) lat1 = p.lat;
      if (p.lon < lon0) lon0 = p.lon;
      if (p.lon > lon1) lon1 = p.lon;
    }
  }
  if (!isFinite(lat0)) return null;
  let latC = (lat0 + lat1) / 2, lonC = (lon0 + lon1) / 2;
  let latSpan = Math.max(lat1 - lat0, 0.02);
  let lonSpan = Math.max(lon1 - lon0, 0.02);
  // 最小スパン: 短距離 trip を過度にズームしない。県境ポリゴン (Douglas-Peucker tol 0.02°)
  // を拡大しすぎるとギザギザの三角形に見えるので、地域が判別できる広さを下限にする。
  const MIN_LAT_SPAN = 0.9;
  if (latSpan < MIN_LAT_SPAN) latSpan = MIN_LAT_SPAN;
  const cos = Math.cos(latC * Math.PI / 180) || 0.8;
  // 目標 lonSpan/latSpan = (w/h) / cos （地理的に正方に近づける）
  const targetRatio = (w / h) / cos;
  const curRatio = lonSpan / latSpan;
  if (curRatio < targetRatio) lonSpan = latSpan * targetRatio;
  else latSpan = lonSpan / targetRatio;
  const p = (pad == null ? 0.14 : pad);
  latSpan *= (1 + p * 2);
  lonSpan *= (1 + p * 2);
  return {
    lat0: latC - latSpan / 2, lat1: latC + latSpan / 2,
    lon0: lonC - lonSpan / 2, lon1: lonC + lonSpan / 2,
  };
}

// bbox = 描画範囲 (省略時は全国 JP_BBOX)。opts.lineWidth で polyline 太さ、opts.glow でハイライト。
function drawJapanMap(ctx, x0, y0, w, h, polylines, bbox, opts) {
  bbox = bbox || JP_BBOX;
  opts = opts || {};
  // 背景パネル
  ctx.fillStyle = '#060f1a';
  ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = '#1E3448';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);

  // ズーム時に都道府県ポリゴンがパネル外へはみ出すのでクリップ
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();

  // 緯度経度グリッド (薄く) — bbox 内の整数度線を描く
  ctx.strokeStyle = 'rgba(46,74,99,0.25)';
  ctx.lineWidth = 0.5;
  for (let la = Math.ceil(bbox.lat0); la <= Math.floor(bbox.lat1); la++) {
    const p1 = projToCanvas(la, bbox.lon0, bbox, x0, y0, w, h);
    const p2 = projToCanvas(la, bbox.lon1, bbox, x0, y0, w, h);
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  }
  for (let lo = Math.ceil(bbox.lon0); lo <= Math.floor(bbox.lon1); lo++) {
    const p1 = projToCanvas(bbox.lat0, lo, bbox, x0, y0, w, h);
    const p2 = projToCanvas(bbox.lat1, lo, bbox, x0, y0, w, h);
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  }

  // 47 都道府県シルエット (v237〜 Natural Earth ベース)
  // 1 段目: 全 polygon を陸地色で fill (隣接 polygon の境を消す)
  // 2 段目: 全 polygon を境界線色で stroke (都道府県境を細く)
  const prefs = getJapanPrefs();
  ctx.fillStyle = '#152434';
  prefs.forEach(pref => {
    pref.polygons.forEach(ring => {
      ctx.beginPath();
      ring.forEach(([la, lo], i) => {
        const p = projToCanvas(la, lo, bbox, x0, y0, w, h);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
    });
  });
  ctx.strokeStyle = '#243d55';
  ctx.lineWidth = 0.6;
  prefs.forEach(pref => {
    pref.polygons.forEach(ring => {
      ctx.beginPath();
      ring.forEach(([la, lo], i) => {
        const p = projToCanvas(la, lo, bbox, x0, y0, w, h);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.stroke();
    });
  });

  // 乗車区間 polyline
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const lw = opts.lineWidth || 2.5;
  for (const pl of polylines) {
    // glow: 同じ経路を太く淡く下敷きに描いて視認性を上げる
    if (opts.glow) {
      ctx.strokeStyle = 'rgba(244,247,250,0.35)';
      ctx.lineWidth = lw + 3;
      ctx.beginPath();
      pl.points.forEach((p, i) => {
        const xy = projToCanvas(p.lat, p.lon, bbox, x0, y0, w, h);
        if (i === 0) ctx.moveTo(xy.x, xy.y); else ctx.lineTo(xy.x, xy.y);
      });
      ctx.stroke();
    }
    ctx.strokeStyle = pl.color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    pl.points.forEach((p, i) => {
      const xy = projToCanvas(p.lat, p.lon, bbox, x0, y0, w, h);
      if (i === 0) ctx.moveTo(xy.x, xy.y); else ctx.lineTo(xy.x, xy.y);
    });
    ctx.stroke();
  }

  // 端点マーカー (個別 trip のみ): 始点 ○ / 終点 ●
  if (opts.endpoints && polylines.length) {
    const first = polylines[0].points[0];
    const lastPl = polylines[polylines.length - 1];
    const last = lastPl.points[lastPl.points.length - 1];
    if (first) {
      const s = projToCanvas(first.lat, first.lon, bbox, x0, y0, w, h);
      ctx.fillStyle = '#060f1a'; ctx.strokeStyle = '#F4F7FA'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    if (last) {
      const e = projToCanvas(last.lat, last.lon, bbox, x0, y0, w, h);
      ctx.fillStyle = '#E8352A'; ctx.strokeStyle = '#F4F7FA'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }

  ctx.restore();

  // 北方位
  const cx = x0 + w - 26, cy = y0 + 26;
  ctx.fillStyle = 'rgba(6,15,26,0.85)';
  ctx.strokeStyle = '#2E4A63';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#E8352A';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx - 4, cy + 3);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + 4, cy + 3);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 9px "DM Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('N', cx, cy - 3);
  ctx.textAlign = 'left';
}

function drawStatsPanel(ctx, x0, y0, w, h, stats) {
  const { pct, ridden, totalUnique, lines, complete, totalLines, distanceKm } = stats;

  // パネル背景
  ctx.fillStyle = 'rgba(30,52,72,0.4)';
  ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = '#2E4A63';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);

  // タイトル
  let y = y0 + 50;
  ctx.fillStyle = '#8CA0B3';
  ctx.font = '18px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
  ctx.fillText('全国鉄道 完駅率', x0 + 32, y);

  // 大きな % 表示
  y += 80;
  ctx.fillStyle = '#E8352A';
  ctx.font = 'bold 110px "DM Mono", monospace';
  const pctText = String(pct);
  ctx.fillText(pctText, x0 + 32, y);
  const pctW = ctx.measureText(pctText).width;
  ctx.fillStyle = '#F4F7FA';
  ctx.font = 'bold 48px "DM Mono", monospace';
  ctx.fillText('%', x0 + 32 + pctW + 8, y);

  // セパレータ
  y += 30;
  ctx.strokeStyle = 'rgba(140,160,179,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0 + 32, y);
  ctx.lineTo(x0 + w - 32, y);
  ctx.stroke();

  // 制覇駅
  y += 38;
  ctx.fillStyle = '#8CA0B3';
  ctx.font = '15px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
  ctx.fillText('制覇駅', x0 + 32, y);
  ctx.fillStyle = '#F4F7FA';
  ctx.font = 'bold 22px "DM Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${ridden.toLocaleString()} / ${totalUnique.toLocaleString()} 駅`, x0 + w - 32, y);
  ctx.textAlign = 'left';

  // 系統
  y += 42;
  ctx.fillStyle = '#8CA0B3';
  ctx.font = '15px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
  ctx.fillText('系統', x0 + 32, y);
  ctx.fillStyle = '#F4F7FA';
  ctx.font = 'bold 22px "DM Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${lines} / ${totalLines} (完乗 ${complete})`, x0 + w - 32, y);
  ctx.textAlign = 'left';

  // 距離
  y += 42;
  ctx.fillStyle = '#8CA0B3';
  ctx.font = '15px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
  ctx.fillText('総走行距離', x0 + 32, y);
  ctx.fillStyle = '#F2A900';
  ctx.font = 'bold 22px "DM Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${distanceKm.toLocaleString()} km`, x0 + w - 32, y);
  ctx.textAlign = 'left';
}

// trip オブジェクトから個別シェア画像の表示用データを導出する。
// 路線名・区間 (from→to)・駅数・乗換・乗車日 (精度別) ・列車/車両を tripCardHtml と同じ規則で整形。
function deriveTripDisplay(trip) {
  const segs = Array.isArray(trip.segments) ? trip.segments : [];
  const lineNames = [];
  segs.forEach(s => {
    const n = s.lineName || s.lineId;
    if (n && !lineNames.includes(n)) lineNames.push(n);
  });
  let routeLabel = lineNames[0] || trip.name || '旅程';
  if (lineNames.length > 1) routeLabel = `${lineNames[0]} ほか ${lineNames.length - 1} 路線`;

  let fromTo = '';
  if (segs.length) {
    const from = segs[0].from || '';
    const to = segs[segs.length - 1].to || '';
    if (from && to) fromTo = `${from} → ${to}`;
  }
  if (!fromTo) fromTo = trip.name || '';

  const prec = trip.date_precision || 'day';
  let dateStr;
  if (prec === 'unknown' || !trip.date) dateStr = '日時不明';
  else if (prec === 'year') dateStr = `${trip.date.slice(0, 4)}年ごろ`;
  else if (prec === 'month') dateStr = `${trip.date.slice(0, 4)}年${parseInt(trip.date.slice(5, 7), 10)}月ごろ`;
  else dateStr = trip.date;

  const bits = [];
  segs.forEach(s => {
    const tn = s.train_name || '', cm = s.car_model || '';
    if (!tn && !cm) return;
    bits.push([tn, cm ? `[${cm}]` : ''].filter(Boolean).join(' '));
  });
  let trainStr = '';
  if (bits.length) trainStr = bits.join(' / ');
  else if (trip.train_name || trip.car_model) {
    trainStr = [trip.train_name || '', trip.car_model ? `[${trip.car_model}]` : ''].filter(Boolean).join(' ');
  }

  return {
    routeLabel, fromTo,
    stations: trip.total_stations || 0,
    transfers: trip.transfers || 0,
    dateStr, trainStr,
  };
}

function drawTripStatsPanel(ctx, x0, y0, w, h, d) {
  // パネル背景
  ctx.fillStyle = 'rgba(30,52,72,0.4)';
  ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = '#2E4A63';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);

  const lx = x0 + 32, rx = x0 + w - 32;
  let y = y0 + 48;

  // ラベル
  ctx.fillStyle = '#8CA0B3';
  ctx.font = '16px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
  ctx.fillText('🚃 この旅程', lx, y);

  // 路線名 (headline) — 幅に収まるようフォント自動縮小
  y += 52;
  ctx.fillStyle = '#F4F7FA';
  let fs = 34;
  ctx.font = `bold ${fs}px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif`;
  while (ctx.measureText(d.routeLabel).width > w - 64 && fs > 18) {
    fs -= 2;
    ctx.font = `bold ${fs}px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif`;
  }
  ctx.fillText(d.routeLabel, lx, y);

  // 区間 (from → to)
  y += 42;
  ctx.fillStyle = '#5fb5ff';
  let fs2 = 24;
  ctx.font = `bold ${fs2}px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif`;
  while (ctx.measureText(d.fromTo).width > w - 64 && fs2 > 13) {
    fs2 -= 1;
    ctx.font = `bold ${fs2}px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif`;
  }
  ctx.fillText(d.fromTo, lx, y);

  // セパレータ
  y += 28;
  ctx.strokeStyle = 'rgba(140,160,179,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(rx, y); ctx.stroke();

  // value 行 (label 左 / value 右)。mono=false で和文フォント (列車名用)。
  const row = (label, value, valColor, mono) => {
    y += 42;
    ctx.fillStyle = '#8CA0B3';
    ctx.font = '15px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, lx, y);
    const labelW = ctx.measureText(label).width;
    ctx.fillStyle = valColor || '#F4F7FA';
    const fam = mono === false ? '"Zen Kaku Gothic New", "Hiragino Sans", sans-serif' : '"DM Mono", monospace';
    let vfs = 22;
    ctx.font = `bold ${vfs}px ${fam}`;
    const maxW = w - 64 - labelW - 16;
    while (ctx.measureText(value).width > maxW && vfs > 11) {
      vfs -= 1;
      ctx.font = `bold ${vfs}px ${fam}`;
    }
    ctx.textAlign = 'right';
    ctx.fillText(value, rx, y);
    ctx.textAlign = 'left';
  };

  row('駅数', `${d.stations} 駅`);
  row('乗換', `${d.transfers} 回`);
  row('乗車日', d.dateStr);
  if (d.trainStr) row('列車・車両', d.trainStr, '#F2A900', false);
}

async function generateOgpCanvas(stats) {
  const canvas = document.createElement('canvas');
  canvas.width = OGP_W;
  canvas.height = OGP_H;
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = '#0D1B2A';
  ctx.fillRect(0, 0, OGP_W, OGP_H);

  // 上端アクセントライン
  ctx.fillStyle = '#E8352A';
  ctx.fillRect(0, 0, OGP_W, 6);

  // ヘッダ: ロゴ
  ctx.fillStyle = '#F4F7FA';
  ctx.font = 'bold 42px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
  ctx.fillText('🚃 乗レコ', 50, 78);
  ctx.fillStyle = '#8CA0B3';
  ctx.font = '22px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
  ctx.fillText('- 電車旅', 270, 78);

  // ヘッダ: URL (右上)
  ctx.textAlign = 'right';
  ctx.font = '18px "DM Mono", monospace';
  ctx.fillStyle = 'rgba(140,160,179,0.7)';
  ctx.fillText('norireco.app', OGP_W - 50, 78);
  ctx.textAlign = 'left';

  // 地図エリア (左)
  const mapX = 50, mapY = 110, mapW = 620, mapH = 470;
  const polylines = buildSegmentPolylines();
  drawJapanMap(ctx, mapX, mapY, mapW, mapH, polylines);

  // ステータスパネル (右)
  drawStatsPanel(ctx, 710, 110, 440, 470, stats);

  // フッタ
  ctx.fillStyle = '#8CA0B3';
  ctx.font = '18px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
  ctx.fillText('#乗レコ  #乗り鉄  #全国制覇', 50, OGP_H - 28);

  return canvas;
}

// 個別 trip 版 OGP 画像: 地図を trip 区間にズームし、右パネルに 1 旅程分の情報を描く。
async function generateTripOgpCanvas(trip) {
  const canvas = document.createElement('canvas');
  canvas.width = OGP_W;
  canvas.height = OGP_H;
  const ctx = canvas.getContext('2d');

  // 背景 + アクセント
  ctx.fillStyle = '#0D1B2A';
  ctx.fillRect(0, 0, OGP_W, OGP_H);
  ctx.fillStyle = '#E8352A';
  ctx.fillRect(0, 0, OGP_W, 6);

  // ヘッダ (profile 版と共通)
  ctx.fillStyle = '#F4F7FA';
  ctx.font = 'bold 42px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
  ctx.fillText('🚃 乗レコ', 50, 78);
  ctx.fillStyle = '#8CA0B3';
  ctx.font = '22px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
  ctx.fillText('- 電車旅', 270, 78);
  ctx.textAlign = 'right';
  ctx.font = '18px "DM Mono", monospace';
  ctx.fillStyle = 'rgba(140,160,179,0.7)';
  ctx.fillText('norireco.app', OGP_W - 50, 78);
  ctx.textAlign = 'left';

  // 地図 (左) — trip 区間にズーム
  const mapX = 50, mapY = 110, mapW = 620, mapH = 470;
  const segs = Array.isArray(trip.segments) ? trip.segments : [];
  const polylines = buildSegmentPolylines(segs);
  const bbox = computeTripBbox(polylines, mapW, mapH, 0.16);
  drawJapanMap(ctx, mapX, mapY, mapW, mapH, polylines, bbox, { lineWidth: 4.5, glow: true, endpoints: true });

  // ステータスパネル (右)
  drawTripStatsPanel(ctx, 710, 110, 440, 470, deriveTripDisplay(trip));

  // フッタ
  ctx.fillStyle = '#8CA0B3';
  ctx.font = '18px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
  ctx.fillText('#乗レコ  #乗り鉄  #電車旅', 50, OGP_H - 28);

  return canvas;
}

// ─────────────────────────────────────────────
// モーダル UI
// ─────────────────────────────────────────────
function ensureModal() {
  let m = document.getElementById('share-ogp-modal');
  if (m) return m;
  m = document.createElement('div');
  m.id = 'share-ogp-modal';
  m.className = 'memo-modal';
  m.addEventListener('click', (e) => { if (e.target === m) closeShareModal(); });
  m.innerHTML = `
    <div class="memo-sheet" style="max-width:520px">
      <div class="sh"></div>
      <div class="modal-title" id="share-ogp-title">📸 シェア画像</div>
      <div class="modal-sub" id="share-ogp-sub" style="color:var(--silver);font-size:11px;margin-bottom:12px">
        全国鉄道の完乗状況を 1200×630 の OGP 画像として書き出します。長押し or ダウンロードで保存できます。
      </div>
      <div id="share-ogp-preview-wrap" style="background:#060f1a;border:1px solid var(--track);border-radius:8px;padding:8px;margin-bottom:12px;text-align:center">
        <canvas id="share-ogp-canvas" style="width:100%;height:auto;max-width:480px;border-radius:4px;display:block;margin:0 auto"></canvas>
      </div>
      <div id="share-ogp-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <button class="btn-gen" id="share-ogp-download-btn" style="flex:1;min-width:120px">📥 ダウンロード</button>
        <button class="btn-gen" id="share-ogp-share-btn" style="flex:1;min-width:120px;background:rgba(95,181,255,.15);color:#5fb5ff;border:1.5px solid rgba(95,181,255,.4)">🔗 シェア</button>
      </div>
      <button class="btn-cls" id="share-ogp-close-btn">閉じる</button>
    </div>
  `;
  document.body.appendChild(m);
  m.querySelector('#share-ogp-close-btn').addEventListener('click', closeShareModal);
  m.querySelector('#share-ogp-download-btn').addEventListener('click', downloadCurrentCanvas);
  m.querySelector('#share-ogp-share-btn').addEventListener('click', shareCurrentCanvas);
  return m;
}

function closeShareModal() {
  const m = document.getElementById('share-ogp-modal');
  if (m) m.classList.remove('open');
}

// profile / trip でダウンロードファイル名・シェア文言が変わるのでモジュール変数で保持。
// openShareModal / openTripShareModal が開く直前にセットする。
let _downloadName = 'norireco';
let _shareText = '全国鉄道の完乗マップ📍 #乗レコ #乗り鉄\nhttps://norireco.app/';

async function downloadCurrentCanvas() {
  const canvas = document.getElementById('share-ogp-canvas');
  if (!canvas) return;
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
  if (!blob) { alert('画像の生成に失敗しました'); return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${_downloadName}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareCurrentCanvas() {
  const canvas = document.getElementById('share-ogp-canvas');
  if (!canvas) return;
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
  if (!blob) { alert('画像の生成に失敗しました'); return; }
  const file = new File([blob], `${_downloadName}.png`, { type: 'image/png' });
  const shareText = _shareText;

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        text: shareText,
      });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      console.warn('[シェア] navigator.share 失敗:', e);
    }
  }
  // フォールバック: X (Twitter) intent
  const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  window.open(intent, '_blank', 'noopener,noreferrer');
}

function paintCanvas(canvas) {
  const target = document.getElementById('share-ogp-canvas');
  if (target) {
    target.width = canvas.width;
    target.height = canvas.height;
    target.getContext('2d').drawImage(canvas, 0, 0);
  }
}

export async function openShareModal(stats) {
  const m = ensureModal();
  const title = document.getElementById('share-ogp-title');
  const sub = document.getElementById('share-ogp-sub');
  if (title) title.textContent = '📸 シェア画像';
  if (sub) sub.textContent = '全国鉄道の完乗状況を 1200×630 の OGP 画像として書き出します。長押し or ダウンロードで保存できます。';
  _downloadName = `norireco-${new Date().toISOString().slice(0, 10)}`;
  _shareText = '全国鉄道の完乗マップ📍 #乗レコ #乗り鉄\nhttps://norireco.app/';
  m.classList.add('open');
  paintCanvas(await generateOgpCanvas(stats));
}

export async function openTripShareModal(trip) {
  const m = ensureModal();
  const d = deriveTripDisplay(trip);
  const title = document.getElementById('share-ogp-title');
  const sub = document.getElementById('share-ogp-sub');
  if (title) title.textContent = '📤 旅程をシェア';
  if (sub) sub.textContent = `「${d.routeLabel}」を 1200×630 の画像として書き出します。長押し or ダウンロードで保存できます。`;
  // ファイル名に乗車日 (あれば) を含める
  const datePart = (trip.date && trip.date_precision !== 'unknown') ? trip.date : new Date().toISOString().slice(0, 10);
  _downloadName = `norireco-trip-${datePart}`;
  const fromToText = d.fromTo ? ` ${d.fromTo}` : '';
  _shareText = `${d.routeLabel}${fromToText} に乗りました🚃 #乗レコ #乗り鉄 #電車旅\nhttps://norireco.app/`;
  m.classList.add('open');
  paintCanvas(await generateTripOgpCanvas(trip));
}

window.NORIRECO = window.NORIRECO || {};
window.NORIRECO.share = { openShareModal, openTripShareModal };
