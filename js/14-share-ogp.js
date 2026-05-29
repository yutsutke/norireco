// ══════════════════════════════════════════════════════════════
// 14-share-ogp.js — OGP 画像生成 (v236〜)
// マイページ完乗率カードの「📸 シェア画像を作成」から呼ばれる。
// 1200×630 の Canvas を直接描画 → PNG 化 → プレビューモーダル表示。
// 外部依存なし (Canvas API のみ)。日本地図シルエットは lat/lon ベースで自己完結。
// ══════════════════════════════════════════════════════════════

import { authBearerToken, currentUserId } from './12-auth.js';
// R2 オブジェクト削除 (best-effort)。シェア取り消し時の画像掃除に流用 — share 画像も
// cdn.norireco.app/shares/<uid>/<id>.png なので urlToObjectKey が解決でき、worker の
// delete regex も v415 で shares 3-segment を許可済 (CHANGELOG §265)。
import { deletePhotoByUrl } from './18-photo-area.js';

const OGP_W = 1200;
const OGP_H = 630;

// S-2 (v412): シェア画像を R2 に保存して恒久 CDN URL を得る Worker ゲートウェイ。
const NORIRECO_API_BASE = 'https://api.norireco.app';

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

// lineId フォールバック整形: "auto_相模原線_京王電鉄" → "相模原線"。
// SERVICE_LINES 逆引きが効かなかったときの最終手段 (記録時 lineName が null のケース)。
function prettifyLineId(id) {
  if (!id) return '路線';
  const parts = String(id).replace(/^auto_/, '').split('_');
  return parts[0] || String(id);
}

// trip オブジェクトから個別シェア画像の表示用データを導出する。
// 路線名は lineName が null になりがちなので SERVICE_LINES (lineId 逆引き) を一次情報にする (v369 と同方針)。
function deriveTripDisplay(trip) {
  const SL = (window.NORIRECO && NORIRECO.data && NORIRECO.data.SERVICE_LINES) || [];
  const slById = new Map(SL.map(s => [s.id, s]));
  const resolveName = (seg) =>
    (slById.get(seg.lineId) && slById.get(seg.lineId).name) || seg.lineName || prettifyLineId(seg.lineId);

  const segs = Array.isArray(trip.segments) ? trip.segments : [];
  // 区間ごとの脚 (路線名 + from→to) — 「どの路線に乗ったか」の詳細表示用
  const legs = segs.map(s => ({ name: resolveName(s), from: s.from || '', to: s.to || '' }));
  // 重複しない路線名リスト (headline 用)
  const lineNames = [];
  legs.forEach(l => { if (l.name && !lineNames.includes(l.name)) lineNames.push(l.name); });

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
    lineNames, legs, fromTo,
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
  const maxLineW = w - 64;
  let y = y0 + 44;

  // ラベル
  ctx.fillStyle = '#8CA0B3';
  ctx.font = '16px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
  ctx.fillText('🚃 この旅程', lx, y);

  // 路線名 (headline) — 全路線を「・」で並べ、収まらなければ font 縮小、それでも溢れたら「○○ ほか N 路線」
  y += 48;
  ctx.fillStyle = '#F4F7FA';
  let headline = d.lineNames.join('・') || d.fromTo || '旅程';
  let fs = 32;
  const setH = () => { ctx.font = `bold ${fs}px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif`; };
  setH();
  while (ctx.measureText(headline).width > maxLineW && fs > 18) { fs -= 2; setH(); }
  if (ctx.measureText(headline).width > maxLineW && d.lineNames.length > 1) {
    headline = `${d.lineNames[0]} ほか ${d.lineNames.length - 1} 路線`;
    fs = 30; setH();
    while (ctx.measureText(headline).width > maxLineW && fs > 18) { fs -= 2; setH(); }
  }
  ctx.fillText(headline, lx, y);

  // 区間 (from → to)
  y += 40;
  ctx.fillStyle = '#5fb5ff';
  let fs2 = 23;
  ctx.font = `bold ${fs2}px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif`;
  while (ctx.measureText(d.fromTo).width > maxLineW && fs2 > 13) {
    fs2 -= 1;
    ctx.font = `bold ${fs2}px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif`;
  }
  ctx.fillText(d.fromTo, lx, y);

  // セパレータ
  y += 26;
  ctx.strokeStyle = 'rgba(140,160,179,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(rx, y); ctx.stroke();

  // value 行 (label 左 / value 右)。mono=false で和文フォント (列車名用)。
  const row = (label, value, valColor, mono) => {
    y += 38;
    ctx.fillStyle = '#8CA0B3';
    ctx.font = '15px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, lx, y);
    const labelW = ctx.measureText(label).width;
    ctx.fillStyle = valColor || '#F4F7FA';
    const fam = mono === false ? '"Zen Kaku Gothic New", "Hiragino Sans", sans-serif' : '"DM Mono", monospace';
    let vfs = 21;
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

  // 経路の詳細 (乗換あり = 区間 2 つ以上のとき): 各脚を「路線名 区間」で列挙。
  // 余白に収まる範囲で最大 5 脚、超過分は「ほか N 区間」。
  if (d.legs.length >= 2) {
    y += 34;
    ctx.strokeStyle = 'rgba(140,160,179,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(rx, y); ctx.stroke();
    y += 28;
    ctx.fillStyle = '#8CA0B3';
    ctx.font = '14px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
    ctx.fillText('🚉 経路', lx, y);

    const maxLegs = 5;
    const shown = d.legs.slice(0, maxLegs);
    shown.forEach((leg, i) => {
      y += 27;
      // 路線名 (金) — 幅の 45% まで、超えたら縮小
      ctx.fillStyle = '#F2A900';
      let nfs = 15;
      ctx.font = `bold ${nfs}px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif`;
      const nameMax = maxLineW * 0.5;
      while (ctx.measureText(leg.name).width > nameMax && nfs > 10) { nfs -= 1; ctx.font = `bold ${nfs}px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif`; }
      ctx.fillText(leg.name, lx, y);
      const nameW = ctx.measureText(leg.name).width;
      // 区間 (灰) — 残り幅
      const secX = lx + nameW + 12;
      ctx.fillStyle = '#8CA0B3';
      let sfs = 14;
      ctx.font = `${sfs}px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif`;
      const secText = `${leg.from} → ${leg.to}`;
      const secMax = rx - secX;
      while (ctx.measureText(secText).width > secMax && sfs > 9) { sfs -= 1; ctx.font = `${sfs}px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif`; }
      ctx.fillText(secText, secX, y);
    });
    if (d.legs.length > maxLegs) {
      y += 25;
      ctx.fillStyle = '#8CA0B3';
      ctx.font = '13px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
      ctx.fillText(`…ほか ${d.legs.length - maxLegs} 区間`, lx, y);
    }
  }
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
        <button class="btn-gen" id="share-ogp-download-btn" style="flex:1;min-width:110px">📥 ダウンロード</button>
        <button class="btn-gen" id="share-ogp-share-btn" style="flex:1;min-width:110px;background:rgba(95,181,255,.15);color:#5fb5ff;border:1.5px solid rgba(95,181,255,.4)">📤 画像をシェア</button>
        <button class="btn-gen" id="share-ogp-link-btn" style="flex:1;min-width:110px;background:rgba(46,196,134,.15);color:#2ec486;border:1.5px solid rgba(46,196,134,.4)">🔗 リンクをシェア</button>
      </div>
      <button class="btn-cls" id="share-ogp-close-btn">閉じる</button>
    </div>
  `;
  document.body.appendChild(m);
  m.querySelector('#share-ogp-close-btn').addEventListener('click', closeShareModal);
  m.querySelector('#share-ogp-download-btn').addEventListener('click', downloadCurrentCanvas);
  m.querySelector('#share-ogp-share-btn').addEventListener('click', shareCurrentCanvas);
  m.querySelector('#share-ogp-link-btn').addEventListener('click', shareCurrentLink);
  return m;
}

function closeShareModal() {
  const m = document.getElementById('share-ogp-modal');
  if (m) m.classList.remove('open');
}

// ── R2 アップロード (S-2) ──────────────────────────────────────
// 生成済み PNG blob を Worker 経由で R2 に保存し、{public_url, share_id} を返す。
// share_id は Worker が採番した R2 object id。S-3 で norireco_shares の PK に流用する。
// 写真アップロード (18-photo-area.js uploadPhoto) と同じ presign → PUT の 2 段。
async function uploadShareImage(blob) {
  const presignRes = await fetch(`${NORIRECO_API_BASE}/upload/share-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authBearerToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content_type: 'image/png', size_bytes: blob.size, ext: 'png' }),
  });
  if (!presignRes.ok) {
    const err = await presignRes.text();
    throw new Error(`presign 失敗 (${presignRes.status}): ${err.slice(0, 200)}`);
  }
  const { upload_url, public_url, share_id } = await presignRes.json();
  const putRes = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: blob,
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`R2 アップロード失敗 (${putRes.status}): ${err.slice(0, 200)}`);
  }
  return { public_url, share_id };
}

// norireco_shares に 1 行 insert (S-3)。RLS が auth.uid()=user_id を要求するので
// Authorization は anon key ではなく access_token を使う (シェアはログイン時のみ /share 化)。
async function insertShareRecord(shareId, imageUrl) {
  const row = {
    id: shareId,
    user_id: currentUserId(),
    kind: _shareMeta.kind || 'trip',
    title: _shareMeta.title || '乗レコの記録',
    description: _shareMeta.description || '',
    image_url: imageUrl,
  };
  const res = await fetch(`${window.SUPABASE_URL}/rest/v1/norireco_shares`, {
    method: 'POST',
    headers: {
      'apikey': window.SUPABASE_KEY,
      'Authorization': `Bearer ${authBearerToken()}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`share レコード作成失敗 (${res.status}): ${err.slice(0, 200)}`);
  }
}

// profile / trip でダウンロードファイル名・シェア文言・share レコードのメタが変わるので
// モジュール変数で保持。openShareModal / openTripShareModal が開く直前にセットする。
let _downloadName = 'norireco';
let _shareText = '全国鉄道の完乗マップ📍 #乗レコ #乗り鉄\nhttps://norireco.app/';
let _shareMeta = { kind: 'profile', title: '乗レコの記録', description: '' };

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

// 末尾のルート URL 行を取り除いた共有テキスト (/share リンクを別途載せるため)。
// _shareText は末尾が "…\nhttps://norireco.app/" 形式なのでそれを剥がす。
function shareTextWithoutUrl() {
  return String(_shareText).replace(/\s*https?:\/\/\S+\s*$/i, '').trim();
}

// 「📤 画像をシェア」: 画像ファイルそのものを共有する (ログイン不要)。
// Web Share 対応端末 (モバイル / Windows 等) は OS 共有シートに画像を渡し、
// 非対応なら X intent。/share リンクが欲しいときは別の「🔗 リンクをシェア」を使う
// (v417: Windows の OS 共有シートは file 共有時に text=URL を落とすため、URL は専用
//  ボタンに分離した。画像共有と URL 共有を別ボタンにして役割を明確化)。
async function shareCurrentCanvas() {
  const canvas = document.getElementById('share-ogp-canvas');
  if (!canvas) return;
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
  if (!blob) { alert('画像の生成に失敗しました'); return; }
  const file = new File([blob], `${_downloadName}.png`, { type: 'image/png' });
  await shareImageOnly(file);
}

// 「🔗 リンクをシェア」(v417): /share/<id> リンクを作成して共有する。ログイン必須
// (R2 アップロードと RLS insert が JWT を要求)。
//   - モバイル (タッチ端末) で Web Share 可: navigator.share({url}) で共有シートへ
//     (X アプリ等に渡すと og:image でリッチに unfurl される)。
//   - PC: クリップボードにコピー (PC の OS 共有シートに飛ばすと URL が埋もれるため、
//     コピーの方が確実。X・Discord・ブログ等どこへでも貼れる)。
async function shareCurrentLink() {
  if (typeof currentUserId !== 'function' || !currentUserId()) {
    alert('リンクをシェアするにはログインが必要です。');
    return;
  }
  const canvas = document.getElementById('share-ogp-canvas');
  if (!canvas) return;
  const btn = document.getElementById('share-ogp-link-btn');
  const orig = btn ? btn.textContent : '';
  const flash = (msg) => {
    if (!btn) return;
    btn.textContent = msg;
    setTimeout(() => { if (btn) btn.textContent = orig || '🔗 リンクをシェア'; }, 2400);
  };
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 作成中…'; }
  try {
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('画像の生成に失敗しました');
    const { public_url, share_id } = await uploadShareImage(blob);
    await insertShareRecord(share_id, public_url);
    const shareUrl = `https://norireco.app/share/${share_id}`;
    if (btn) btn.disabled = false;
    const isTouch = (typeof matchMedia === 'function') && matchMedia('(pointer: coarse)').matches;
    if (isTouch && navigator.share) {
      try {
        await navigator.share({ title: _shareMeta.title || '乗レコ', text: shareTextWithoutUrl(), url: shareUrl });
        flash('✅ 共有しました');
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') { if (btn) btn.textContent = orig; return; }
        // Web Share 失敗 → コピーへフォールバック
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      flash('✅ リンクをコピーしました');
    } catch (clipErr) {
      window.prompt('シェアリンク (コピーしてください)', shareUrl);
      if (btn) btn.textContent = orig || '🔗 リンクをシェア';
    }
  } catch (e) {
    console.error('[シェア] リンク作成失敗:', e);
    alert('リンクの作成に失敗しました。時間をおいて再度お試しください。');
    if (btn) { btn.disabled = false; btn.textContent = orig || '🔗 リンクをシェア'; }
  }
}

// 「📤 画像をシェア」の実体: 画像ファイル + ルート URL (従来挙動)。
async function shareImageOnly(file) {
  const shareText = _shareText;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: shareText });
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
  _shareMeta = {
    kind: 'profile',
    title: `全国鉄道 完駅率 ${stats.pct}%`,
    description: `制覇 ${(stats.ridden || 0).toLocaleString()} / ${(stats.totalUnique || 0).toLocaleString()} 駅 ・ 系統 ${stats.lines || 0} ・ 総距離 ${(stats.distanceKm || 0).toLocaleString()} km`,
  };
  m.classList.add('open');
  paintCanvas(await generateOgpCanvas(stats));
}

export async function openTripShareModal(trip) {
  const m = ensureModal();
  const d = deriveTripDisplay(trip);
  // 路線名は最大 3 つまで「・」で繋ぎ、超過は「ほか N 路線」
  let lineLabel = d.lineNames.slice(0, 3).join('・') || d.fromTo || '旅程';
  if (d.lineNames.length > 3) lineLabel += ` ほか ${d.lineNames.length - 3} 路線`;
  const title = document.getElementById('share-ogp-title');
  const sub = document.getElementById('share-ogp-sub');
  if (title) title.textContent = '📤 旅程をシェア';
  if (sub) sub.textContent = `「${lineLabel}」を 1200×630 の画像として書き出します。長押し or ダウンロードで保存できます。`;
  // ファイル名に乗車日 (あれば) を含める
  const datePart = (trip.date && trip.date_precision !== 'unknown') ? trip.date : new Date().toISOString().slice(0, 10);
  _downloadName = `norireco-trip-${datePart}`;
  const fromToText = d.fromTo ? ` ${d.fromTo}` : '';
  _shareText = `${lineLabel}${fromToText} に乗りました🚃 #乗レコ #乗り鉄 #電車旅\nhttps://norireco.app/`;
  const metaBits = [d.fromTo, `${d.stations}駅`, d.dateStr].filter(Boolean);
  _shareMeta = {
    kind: 'trip',
    title: lineLabel,
    description: metaBits.join(' ・ '),
  };
  m.classList.add('open');
  paintCanvas(await generateTripOgpCanvas(trip));
}

// ══════════════════════════════════════════════════════════════
// シェア取り消し UI (v416) — マイページ「🔗 シェア」サブタブ
// 作成済み norireco_shares を user_id で一覧し、リンクのコピー / 取り消しを行う。
// 取り消し = DB 行 DELETE (RLS 本人のみ) → /share は not-found になり実質無効化。
// 続けて R2 画像を best-effort cleanup (失敗してもシェアは取り消し済)。
// ══════════════════════════════════════════════════════════════

// 直近に描画したシェア (id → row)。取り消し時に image_url を引くために保持。
let _sharesById = new Map();

function escAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 自分のシェア一覧を取得 (RLS は公開 SELECT だが user_id 絞り込みで自分の分だけ)。
async function fetchMyShares(uid) {
  const res = await fetch(
    `${window.SUPABASE_URL}/rest/v1/norireco_shares?user_id=eq.${encodeURIComponent(uid)}&select=*&order=created_at.desc`,
    { headers: { 'apikey': window.SUPABASE_KEY, 'Authorization': `Bearer ${authBearerToken()}` } }
  );
  if (!res.ok) throw new Error(`shares fetch ${res.status}`);
  return await res.json();
}

function shareCardHtml(s) {
  const created = (s.created_at || '').slice(0, 10);
  const kindLabel = s.kind === 'profile' ? '完乗プロフィール' : '旅程';
  const title = s.title || '乗レコの記録';
  const desc = s.description || '';
  const id = escAttr(s.id);
  return `
    <div class="mp-share-card" data-share-id="${id}">
      <a class="mp-share-thumb-link" href="https://norireco.app/share/${id}" target="_blank" rel="noopener">
        <img class="mp-share-thumb" src="${escAttr(s.image_url)}" loading="lazy" alt="${escAttr(title)}">
      </a>
      <div class="mp-share-body">
        <div class="mp-share-head">
          <span class="mp-share-date">${escAttr(created)}</span>
          <span class="mp-badge">${escAttr(kindLabel)}</span>
        </div>
        <div class="mp-share-title">${escAttr(title)}</div>
        ${desc ? `<div class="mp-share-desc">${escAttr(desc)}</div>` : ''}
        <div class="mp-share-actions">
          <button class="mp-act-btn share" onclick="copyShareLink('${id}')">🔗 リンクをコピー</button>
          <button class="mp-act-btn delete" onclick="revokeShare('${id}')">🗑 取り消し</button>
        </div>
      </div>
    </div>`;
}

export async function renderMpSharesSection() {
  const host = document.getElementById('mp-shares-section');
  if (!host) return;
  const uid = currentUserId();
  if (!uid) {
    host.innerHTML = `<div class="mp-empty-s" style="padding:14px">ログインが必要です</div>`;
    return;
  }
  host.innerHTML = `<div class="mp-loading" style="padding:14px">🔗 シェアを読み込み中…</div>`;
  let shares = [];
  try {
    shares = await fetchMyShares(uid);
  } catch (e) {
    console.warn('[シェア] 一覧取得失敗:', e.message);
    host.innerHTML = `<div class="mp-empty-s" style="padding:14px">⚠ シェアの取得に失敗しました</div>`;
    return;
  }
  _sharesById = new Map((shares || []).map(s => [s.id, s]));
  if (!shares.length) {
    host.innerHTML = `
      <div class="mp-tip">📤 旅程カードや完乗率カードの「シェア」からリンクを作成すると、ここに一覧が出ます。リンクは X 等でリッチに表示され、いつでも取り消せます。</div>
      <div class="mp-empty-s" style="padding:14px;text-align:center">まだシェアはありません</div>`;
    return;
  }
  host.innerHTML =
    `<div class="mp-tip">作成したシェアリンクの一覧です。🔗 でリンクをコピー、🗑 で取り消し (開いても表示されなくなります)。</div>` +
    shares.map(shareCardHtml).join('');
}

// 「🔗 リンクをコピー」: /share/<id> をクリップボードへ。
async function copyShareLink(shareId) {
  const url = `https://norireco.app/share/${shareId}`;
  try {
    await navigator.clipboard.writeText(url);
    NORIRECO.mypage?.showMypageToast?.('🔗 リンクをコピーしました', 'success');
  } catch (e) {
    window.prompt('シェアリンク (コピーしてください)', url);
  }
}

// 「🗑 取り消し」: DB 行を削除 (→ /share が not-found) → R2 画像を best-effort cleanup。
async function revokeShare(shareId) {
  if (!currentUserId()) { alert('ログインが必要です'); return; }
  if (!confirm('このシェアを取り消しますか?\nリンクを開いても表示されなくなります。')) return;
  const s = _sharesById.get(shareId);
  try {
    const res = await fetch(
      `${window.SUPABASE_URL}/rest/v1/norireco_shares?id=eq.${encodeURIComponent(shareId)}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': window.SUPABASE_KEY,
          'Authorization': `Bearer ${authBearerToken()}`,
          'Prefer': 'return=minimal',
        },
      }
    );
    if (!res.ok) throw new Error(`delete ${res.status}`);
  } catch (e) {
    console.error('[シェア] 取り消し失敗:', e);
    alert('取り消しに失敗しました。時間をおいて再度お試しください。');
    return;
  }
  // R2 画像掃除 (失敗してもシェアは取り消し済なので握りつぶす)。
  if (s && s.image_url) {
    try { await deletePhotoByUrl(s.image_url); } catch (e) { /* best-effort */ }
  }
  NORIRECO.mypage?.showMypageToast?.('🗑 シェアを取り消しました', 'success');
  renderMpSharesSection();
}

window.NORIRECO = window.NORIRECO || {};
window.NORIRECO.share = { openShareModal, openTripShareModal };
// マイページ統合 (NORIRECO.mypage は 13-mypage-common が初期化。ここでは guard して登録のみ)。
window.NORIRECO.mypage = window.NORIRECO.mypage || {};
window.NORIRECO.mypage.renderMpSharesSection = renderMpSharesSection;
// HTML onclick から呼ぶ口
window.copyShareLink = copyShareLink;
window.revokeShare = revokeShare;
