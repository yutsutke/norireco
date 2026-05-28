// ══════════════════════════════════════════════════════════════
// 一括記録 (まとめて記録) — Notion §1.3 設計確定の A カテゴリ本体。
//
// 入口:
//   (a) マイページ 🚃 旅程サブタブ上部「📋 過去の乗車をまとめて記録」ボタン
//   (b) 空マップ時オンボーディングバナー (A-6 で実装)
//
// 形式: 営業系統チェックリスト (検索 + 「近く / 会社 / 都道府県」フィルタ)。
//   タップ = 全線完乗の draft trip (source=manual, verified=false,
//   date_precision='unknown')。アコーディオン同時 1 行で詳細フォーム展開。
//
// 段階:
//   A-1 (v400): skeleton — open/close 制御 + 空ボトムシート mount のみ
//   A-2 (v401): 営業系統チェックリスト本体 + たたむモード (Map<lineId, draft>)
//   A-3 (v402): 一括保存 MVP — saveBulkDrafts で順次 Supabase POST + localStorage push
//                + RIDDEN_SEGS push + rideRecord.rebuild + redrawAllLinesAfterTripChange
//                + updateOverlays + _mypageCache push + renderMpTripsResultOnly
//                + トースト + sheet 自動 close。環状線は 1 駅のみ ridden (既知 / A-5 で改善)
//   A-4: 検索 + フィルタ (近く / 会社 / 都道府県) + 既定「近く」並べ替え
//   A-5: アコーディオン展開 (createTripDetailEditor per-seg-rows mode を行内 mount)
//        + 環状線の半周分割対応
//   A-6: 空マップ時オンボーディングバナー
//   A-7: unknown 完乗率/塗り集計まわりの検証
//
// 前提 (B カテゴリ完結で揃った):
//   - createTripDetailEditor (js/20-trip-detail-editor.js) が 3 mode 実装済み
//   - multi-container API (`containers`) で行展開ごとに別 container mount 可能
//   - グローバル可変 state なし → 複数行展開でも互いに干渉しない
// ══════════════════════════════════════════════════════════════

// A-3 (v402): 一括保存に必要な依存。saveMultiSegmentTrip 同様の経路で
//   trip 1 件ずつを Supabase に POST + ローカル状態更新を行う。
import { currentUserId } from './12-auth.js';
import { redrawAllLinesAfterTripChange, showRecordToast } from './07-record-mode.js';
import { updateOverlays } from './08-rendering.js';

window.NORIRECO = window.NORIRECO || {};
window.NORIRECO.bulkRecord = window.NORIRECO.bulkRecord || {};

const SHEET_ID = 'bulk-record-sheet';
const BODY_ID  = 'bulk-record-body';

// A-2: draft 配列。チェックされた営業系統ごとに 1 件保持。
//   key = sl.id, value = { lineId, lineName, segments, source, verified,
//                          date_precision, _circular }
// 永続化はしない (sheet close 時に空にする)。A-3 の保存処理で読み出す。
const _bulkDrafts = new Map();

// A-3: 一括保存中フラグ。多重クリック防止 + 保存完了まで close 抑止。
let _saving = false;

// ──────────────────────────────────────────────────────────────
// draft 構築 (たたむモード = ゼロ摩擦)
// ──────────────────────────────────────────────────────────────

// 営業系統 1 件 → 全線 1 segment の draft trip。
// 端駅: stations[0] → stations.at(-1)。環状線は同一駅になる (A-5 で半周 2 seg
// に分割するか検討するが、A-2 段階では端駅同名のままで一旦保持 = visit-only 相当)。
function _buildDefaultDraft(sl) {
  const sts = Array.isArray(sl.stations) ? sl.stations : [];
  if (sts.length < 1) return null;
  const first = sts[0];
  const last  = sts[sts.length - 1];
  return {
    lineId:   sl.id,
    lineName: sl.name || sl.id,
    segments: [{
      lineId: sl.id,
      from:   first.name,
      to:     last.name,
      // v293+ 駅 id も同時に持つ (A-3 の resolveByServiceLine + trip 列追加で使う)
      from_station_id: first.id || null,
      to_station_id:   last.id  || null,
    }],
    source:         'manual',
    verified:       false,
    date_precision: 'unknown',
    _circular:      !!sl.circular,
  };
}

// ──────────────────────────────────────────────────────────────
// レンダリング
// ──────────────────────────────────────────────────────────────

function _renderBody() {
  const body = document.getElementById(BODY_ID);
  if (!body) return;
  const SL = (window.NORIRECO?.data?.SERVICE_LINES) || [];

  if (SL.length === 0) {
    body.innerHTML = '<div style="padding:24px;color:var(--silver);font-size:12px;text-align:center">⏳ 営業系統データ読込中... 数秒後に再度開いてください</div>';
    return;
  }

  // A-2 段階では全 642 系統を素のリストで描画 (検索/フィルタは A-4)。
  // 件数サマリ + 保存ボタン (disabled) を上部、続いてチェックリスト。
  body.innerHTML = `
    <div id="bulk-summary-bar" class="bulk-summary-bar">
      <div class="bulk-summary-count" id="bulk-summary-count">0 件選択中</div>
      <button id="bulk-save-btn" class="bulk-save-btn" disabled>
        💾 まとめて保存
      </button>
    </div>
    <div class="bulk-note">
      🚧 A-2/A-3: 全 ${SL.length} 系統を一覧表示中 / 環状線は 1 駅のみ ridden になります (A-5 で半周分割予定)。検索 / フィルタは A-4 で追加します。
    </div>
    <div id="bulk-checklist" class="bulk-checklist"></div>
  `;

  const list = body.querySelector('#bulk-checklist');
  for (const sl of SL) {
    list.appendChild(_buildLineItem(sl));
  }
  // A-3: 保存ボタンに handler 取付
  const saveBtn = body.querySelector('#bulk-save-btn');
  if (saveBtn) saveBtn.addEventListener('click', () => { saveBulkDrafts(); });
  _updateSummary();
}

function _buildLineItem(sl) {
  const row = document.createElement('label');
  row.className = 'bulk-line-item';
  row.dataset.lineId = sl.id;

  const checked = _bulkDrafts.has(sl.id);
  const sts = Array.isArray(sl.stations) ? sl.stations : [];
  const opName = sl.operator || '';
  const stCount = sts.length;
  const circularMark = sl.circular ? ' 🔄' : '';
  const color = sl.color || '#888';

  row.innerHTML = `
    <input type="checkbox" class="bulk-line-check" ${checked ? 'checked' : ''}>
    <span class="bulk-line-swatch" style="background:${color}"></span>
    <span class="bulk-line-main">
      <span class="bulk-line-name">${_esc(sl.name || sl.id)}${circularMark}</span>
      <span class="bulk-line-meta">${_esc(opName)} · ${stCount} 駅</span>
    </span>
  `;

  const cb = row.querySelector('input.bulk-line-check');
  cb.addEventListener('change', () => _onToggleLine(sl, cb.checked));
  return row;
}

function _onToggleLine(sl, checked) {
  if (checked) {
    const draft = _buildDefaultDraft(sl);
    if (draft) _bulkDrafts.set(sl.id, draft);
  } else {
    _bulkDrafts.delete(sl.id);
  }
  _updateSummary();
}

function _updateSummary() {
  const countEl = document.getElementById('bulk-summary-count');
  if (countEl) countEl.textContent = `${_bulkDrafts.size} 件選択中`;
  // A-3: 件数 0 / 保存中 のときは disabled、それ以外は enable。
  const saveBtn = document.getElementById('bulk-save-btn');
  if (saveBtn) saveBtn.disabled = _saving || _bulkDrafts.size === 0;
}

function _esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

// ──────────────────────────────────────────────────────────────
// A-3: 一括保存 MVP
//
// draft 1 件 → trip 1 件として個別に POST する素直な実装。
// 部分コミット許容 (saveMultiSegmentTrip と整合) — Supabase POST 失敗時も
// localStorage / RIDDEN_SEGS / _mypageCache には反映する (オフライン耐性)。
// バッチ API (`POST /rest/v1/norireco_trips` に配列を渡す) も検討したが、
// 1 件失敗で全件 rollback されるため、UX 上は逐次 + 部分許容が良い。
// ──────────────────────────────────────────────────────────────

function _buildTripFromDraft(draft, idx, ctx) {
  const sl = (window.NORIRECO?.data?.SERVICE_LINES || []).find(x => x.id === draft.lineId);
  const stations = sl?.stations || [];
  const seg = draft.segments[0];
  // 全線完乗想定の自己申告。環状線は同名 from=to で resolve は 1 駅しか塗らないが、
  // 表示上は「全駅」として記録 (実態とのズレは A-5 で半周分割して解消する既知 TODO)。
  const totalStations = stations.length;
  const lineName = draft.lineName;
  const tripName = `${lineName} 全線`;
  return {
    id: `trip_${ctx.baseTime}_${idx}`,
    date: ctx.today,                  // date_precision='unknown' でも Supabase NOT NULL 制約のため今日を入れる (v179 仕様)
    name: tripName,
    photos: [],
    from_station_id: seg.from_station_id || null,
    to_station_id:   seg.to_station_id   || null,
    total_stations:  totalStations,
    transfers:       0,               // 全線 1 系統 = 乗換 0
    line_list:       lineName,
    total_minutes:   0,
    depart_time:     '',
    arrive_time:     '',
    segments: [{
      lineId: seg.lineId,
      from:   seg.from,
      to:     seg.to,
      from_id: seg.from_station_id || null,
      to_id:   seg.to_station_id   || null,
      train_category: null,
      train_id:       null,
      train_name:     null,
      car_model:      null,
    }],
    source:        'manual',
    verified:      false,
    gps_lat:       null,
    gps_lon:       null,
    gps_accuracy:  null,
    recorded_at:   ctx.recordedAt,
    date_precision: 'unknown',
    train_id:       null,
    train_name:     null,
    train_category: null,
    car_model:      null,
    notes:          null,
    delay_minutes:  null,
    user_id:        ctx.userId,
  };
}

async function _postTripToSupabase(trip) {
  // saveMultiSegmentTrip と同じパターン (anon Bearer)。RLS 緩和済のため anon でも書ける。
  const res = await fetch(`${window.SUPABASE_URL}/rest/v1/norireco_trips`, {
    method: 'POST',
    headers: {
      'apikey':        window.SUPABASE_KEY,
      'Authorization': `Bearer ${window.SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(window.tripForSupabase(trip)),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${body.slice(0, 150)}`);
  }
}

async function saveBulkDrafts() {
  if (_saving) return;
  if (_bulkDrafts.size === 0) return;
  _saving = true;

  const saveBtn = document.getElementById('bulk-save-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 保存中...';
  }

  const drafts = Array.from(_bulkDrafts.values());
  const ctx = {
    baseTime:   Date.now(),
    userId:     currentUserId(),
    today:      window.localDateStr(),
    recordedAt: new Date().toISOString(),
  };

  let savedCount = 0;
  let failedCount = 0;
  let totalStations = 0;
  const errors = [];
  const tripsForRebuild = [];

  for (let i = 0; i < drafts.length; i++) {
    const trip = _buildTripFromDraft(drafts[i], i, ctx);
    tripsForRebuild.push(trip);
    totalStations += trip.total_stations;

    // 進捗表示 (10 件以上のときだけ更新、頻繁な reflow を避ける)
    if (saveBtn && drafts.length >= 10 && i % 5 === 0) {
      saveBtn.textContent = `💾 保存中... (${i + 1} / ${drafts.length})`;
    }

    try {
      await _postTripToSupabase(trip);
      savedCount++;
    } catch (e) {
      failedCount++;
      if (errors.length < 3) errors.push(e.message || String(e));
      console.warn('[bulk-record] Supabase POST failed:', drafts[i].lineId, e);
    }

    // localStorage push (Supabase 失敗時も継続 = 部分コミット許容)
    try {
      const existing = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
      existing.push(trip);
      localStorage.setItem('norireco_trips', JSON.stringify(existing));
    } catch (e) { /* localStorage 失敗は無視 (容量超過程度) */ }
  }

  // 全 trip の segments を RIDDEN_SEGS に一括 push、その後 1 回だけ rebuild + redraw
  for (const trip of tripsForRebuild) {
    for (const seg of trip.segments) window.RIDDEN_SEGS.push(seg);
    try {
      const mc = NORIRECO.mypage?.state?._mypageCache;
      if (Array.isArray(mc)) mc.push(trip);
    } catch (e) {}
  }
  try { NORIRECO.rideRecord?.rebuild?.(); } catch (e) { console.warn('[bulk-record] rebuild failed:', e); }
  try { redrawAllLinesAfterTripChange(); } catch (e) { console.warn('[bulk-record] redraw failed:', e); }
  try { updateOverlays(); } catch (e) { console.warn('[bulk-record] updateOverlays failed:', e); }
  try { NORIRECO.stationActions?.refreshTripListIfOpen?.(); } catch (e) {}
  try { NORIRECO.mypage?.renderMpTripsResultOnly?.(); } catch (e) {}

  // トースト
  if (failedCount === 0) {
    showRecordToast(`✅ ${savedCount} 件まとめて記録 (${totalStations} 駅)`);
  } else if (savedCount > 0) {
    showRecordToast(`⚠️ ${savedCount} 件保存 / ${failedCount} 件 Supabase 失敗 (ローカル保存済)\n${errors[0] || ''}`, 'warn', 9000);
  } else {
    showRecordToast(`❌ Supabase 全 ${failedCount} 件失敗 (ローカル保存のみ)\n${errors[0] || ''}`, 'warn', 9000);
  }

  _saving = false;
  closeBulkRecordSheet();
}

// ──────────────────────────────────────────────────────────────
// 公開 API
// ──────────────────────────────────────────────────────────────

export function openBulkRecordSheet() {
  const sheet = document.getElementById(SHEET_ID);
  if (!sheet) {
    console.warn('[bulk-record] #bulk-record-sheet element not found in HTML');
    return;
  }
  // A-2: 開く度に draft をリセット (中断状態の永続化はしない方針)。
  //   sheet を閉じずに別 modal を重ねたケースでも、再 open で初期状態に戻す。
  _bulkDrafts.clear();
  _renderBody();
  sheet.classList.add('open');
}

export function closeBulkRecordSheet() {
  const sheet = document.getElementById(SHEET_ID);
  if (!sheet) return;
  sheet.classList.remove('open');
  _bulkDrafts.clear();
  const body = document.getElementById(BODY_ID);
  if (body) body.innerHTML = '';
}

// 検査用: A-3 以降で _bulkDrafts の中身を取りたい呼び出し元のために、
//   読み取り専用の snapshot を返す関数を公開しておく (今は console テスト用)。
export function _debugGetDrafts() {
  return Array.from(_bulkDrafts.values()).map(d => ({ ...d }));
}

// HTML onclick / 他 module から呼べるよう公開。
window.openBulkRecordSheet  = openBulkRecordSheet;
window.closeBulkRecordSheet = closeBulkRecordSheet;
NORIRECO.bulkRecord.open  = openBulkRecordSheet;
NORIRECO.bulkRecord.close = closeBulkRecordSheet;
NORIRECO.bulkRecord.save  = saveBulkDrafts;
NORIRECO.bulkRecord._debugGetDrafts = _debugGetDrafts;
