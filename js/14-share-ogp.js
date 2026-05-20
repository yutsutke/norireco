// ══════════════════════════════════════════════════════════════
// 14-share-ogp.js — OGP 画像生成 (v236〜)
// マイページ完乗率カードの「📸 シェア画像を作成」から呼ばれる。
// 1200×630 の Canvas を直接描画 → PNG 化 → プレビューモーダル表示。
// 外部依存なし (Canvas API のみ)。日本地図シルエットは lat/lon ベースで自己完結。
// ══════════════════════════════════════════════════════════════

const OGP_W = 1200;
const OGP_H = 630;

// 日本全国 bbox (固定) — 沖縄は別レイアウトで描く
const JP_BBOX = { lat0: 30.5, lat1: 45.7, lon0: 128.5, lon1: 146.0 };

// 4 島シンプル化ポリゴン (lat, lon) — noritetsu-log.html の ISLANDS と同等
const JP_ISLANDS = [
  // 本州
  [[35.68,139.77],[35.55,139.88],[35.30,139.70],[35.18,136.90],[34.70,136.50],[34.50,135.10],[34.70,134.60],[34.85,134.25],[34.70,133.90],[34.55,133.60],[34.20,132.45],[34.00,131.90],[33.95,131.05],[34.05,130.85],[34.25,131.15],[34.80,132.10],[35.00,132.55],[35.30,133.20],[35.55,133.95],[35.80,135.00],[36.20,136.10],[36.65,137.20],[36.90,138.30],[37.30,138.85],[37.50,139.10],[37.90,139.50],[38.30,140.30],[38.90,141.15],[39.70,141.90],[40.20,142.00],[40.65,141.40],[40.90,140.80],[41.20,140.40],[41.40,140.20],[41.55,140.70],[41.10,141.40],[40.50,141.95],[39.80,141.95],[39.10,141.15],[38.25,140.90],[37.80,140.75],[36.80,140.65],[36.30,140.30],[35.75,140.35],[35.68,139.77]],
  // 北海道
  [[41.55,140.70],[42.00,140.95],[42.30,141.10],[42.60,141.40],[42.80,141.65],[43.10,141.35],[43.40,141.65],[43.65,142.00],[44.00,142.50],[44.40,143.20],[44.75,144.00],[44.35,144.60],[43.85,145.10],[43.50,145.45],[43.20,145.75],[43.00,145.55],[43.30,145.05],[43.60,144.65],[44.00,143.85],[43.70,143.30],[43.35,142.80],[43.00,142.30],[42.65,141.90],[42.30,141.60],[42.00,141.40],[41.80,141.00],[41.55,140.70]],
  // 九州
  [[33.95,131.05],[33.85,130.55],[33.60,130.25],[33.30,129.90],[33.00,129.70],[32.65,130.10],[32.45,130.70],[32.20,131.25],[31.60,130.55],[31.00,130.55],[31.20,131.10],[31.55,131.50],[32.05,131.90],[32.50,131.65],[32.90,131.00],[33.20,130.40],[33.55,130.90],[33.85,130.85],[33.95,131.05]],
  // 四国
  [[34.05,130.85],[34.20,132.45],[33.95,133.30],[33.50,133.55],[33.20,133.15],[32.95,132.55],[33.00,132.00],[33.30,131.50],[33.65,131.25],[34.05,130.85]],
];

function projToCanvas(lat, lon, bbox, x0, y0, w, h) {
  return {
    x: x0 + ((lon - bbox.lon0) / (bbox.lon1 - bbox.lon0)) * w,
    y: y0 + ((bbox.lat1 - lat) / (bbox.lat1 - bbox.lat0)) * h,
  };
}

// SERVICE_LINES と RIDDEN_SEGS から「描画用ポリライン」配列を作る。
// 返値: [{ color, points: [{lat,lon},...] }, ...]
function buildSegmentPolylines() {
  const SL = (window.NORIRECO && NORIRECO.data && NORIRECO.data.SERVICE_LINES) || [];
  const segs = (window.RIDDEN_SEGS) || [];
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

function drawJapanMap(ctx, x0, y0, w, h, polylines) {
  // 背景パネル
  ctx.fillStyle = '#060f1a';
  ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = '#1E3448';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);

  // 緯度経度グリッド (薄く)
  ctx.strokeStyle = 'rgba(46,74,99,0.25)';
  ctx.lineWidth = 0.5;
  for (let la = 32; la <= 45; la++) {
    const p1 = projToCanvas(la, JP_BBOX.lon0, JP_BBOX, x0, y0, w, h);
    const p2 = projToCanvas(la, JP_BBOX.lon1, JP_BBOX, x0, y0, w, h);
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  }
  for (let lo = 130; lo <= 145; lo++) {
    const p1 = projToCanvas(JP_BBOX.lat0, lo, JP_BBOX, x0, y0, w, h);
    const p2 = projToCanvas(JP_BBOX.lat1, lo, JP_BBOX, x0, y0, w, h);
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  }

  // 4 島シルエット
  ctx.fillStyle = '#152434';
  ctx.strokeStyle = '#243d55';
  ctx.lineWidth = 1.5;
  JP_ISLANDS.forEach(pts => {
    ctx.beginPath();
    pts.forEach(([la, lo], i) => {
      const p = projToCanvas(la, lo, JP_BBOX, x0, y0, w, h);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // 乗車区間 polyline
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.5;
  for (const pl of polylines) {
    ctx.strokeStyle = pl.color;
    ctx.beginPath();
    pl.points.forEach((p, i) => {
      const xy = projToCanvas(p.lat, p.lon, JP_BBOX, x0, y0, w, h);
      if (i === 0) ctx.moveTo(xy.x, xy.y); else ctx.lineTo(xy.x, xy.y);
    });
    ctx.stroke();
  }

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
  ctx.fillText('全国鉄道 完乗率', x0 + 32, y);

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
  ctx.fillText('yutsutke.github.io/norireco', OGP_W - 50, 78);
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
      <div class="modal-title">📸 シェア画像</div>
      <div class="modal-sub" style="color:var(--silver);font-size:11px;margin-bottom:12px">
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

async function downloadCurrentCanvas() {
  const canvas = document.getElementById('share-ogp-canvas');
  if (!canvas) return;
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
  if (!blob) { alert('画像の生成に失敗しました'); return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ymd = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `norireco-${ymd}.png`;
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
  const file = new File([blob], 'norireco.png', { type: 'image/png' });
  const shareText = '全国鉄道の完乗マップ📍 #乗レコ #乗り鉄\nhttps://yutsutke.github.io/norireco/';

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

export async function openShareModal(stats) {
  const m = ensureModal();
  m.classList.add('open');

  const canvas = await generateOgpCanvas(stats);
  const target = document.getElementById('share-ogp-canvas');
  if (target) {
    target.width = canvas.width;
    target.height = canvas.height;
    target.getContext('2d').drawImage(canvas, 0, 0);
  }
}

window.NORIRECO = window.NORIRECO || {};
window.NORIRECO.share = { openShareModal };
