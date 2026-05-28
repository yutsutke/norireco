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
// A-5 (v404): アコーディオン展開で行内 mount する trip 詳細エディタ。
//   B-4-b の multi-container API (containers: {time, train, delay, notes})
//   を活用して 1 行に複数 section を縦並べ。photos は A-5 では skip。
import { createTripDetailEditor } from './20-trip-detail-editor.js';

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

// A-4: 検索 / 並び替え / 地域フィルタ state。open 毎にリセット。
//   - query: 検索文字列 (系統名 / 運営会社名 部分一致、空白区切り AND)
//   - sort:  'near' (現在地/map center から近い順) | 'name' (50 音順)
//   - group: 地域グループ ('all' | SL.group 値) - 13 値
const _filter = { query: '', sort: 'near', group: 'all' };

// A-5: アコーディオン同時 1 行制御。Notion §1.3「同時に開くのは1行だけ」確定。
//   - _openLineId: 現在開いている SL.id (なければ null)
//   - _openEditor: 開いている行の createTripDetailEditor インスタンス
//   別の行を開く / saveBulkDrafts / closeBulkRecordSheet で _closeAccordion を呼ぶ。
let _openLineId = null;
let _openEditor = null;

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

// A-4: 現在地 (lat,lon) を取得。lastUserGps > map center > null の優先順。
function _getCurrentLocation() {
  const gps = window.NORIRECO?.gps?.lastUserGps;
  if (gps && typeof gps.lat === 'number' && typeof gps.lon === 'number') {
    return { lat: gps.lat, lon: gps.lon };
  }
  const c = window.NORIRECO?.map?.instance?.getCenter?.();
  if (c && typeof c.lat === 'number' && typeof c.lng === 'number') {
    return { lat: c.lat, lon: c.lng };
  }
  return null;
}

// 簡易距離 (lat/lon の二乗和。km 単位ではないが順位比較には十分)
function _distSq(stA, locB) {
  if (!stA || !locB) return Infinity;
  const dLat = stA.lat - locB.lat;
  const dLon = stA.lon - locB.lon;
  return dLat * dLat + dLon * dLon;
}

// A-4: filter + sort 適用後の SL 配列を返す。元配列は破壊しない。
function _applyFilter(SL, filter, loc) {
  let arr = SL;

  // 地域 group
  if (filter.group && filter.group !== 'all') {
    arr = arr.filter(sl => (sl.group || '') === filter.group);
  }

  // 検索 query (空白 AND、系統名 / 運営会社 / id の小文字部分一致)
  const q = (filter.query || '').trim().toLowerCase();
  if (q) {
    const tokens = q.split(/\s+/).filter(Boolean);
    arr = arr.filter(sl => {
      const hay = `${sl.name || ''} ${sl.operator || ''} ${sl.id || ''}`.toLowerCase();
      return tokens.every(t => hay.includes(t));
    });
  }

  // 並び替え
  if (filter.sort === 'name') {
    arr = arr.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'));
  } else if (filter.sort === 'near' && loc) {
    arr = arr.slice().sort((a, b) => {
      const dA = _distSq(a.stations?.[0], loc);
      const dB = _distSq(b.stations?.[0], loc);
      return dA - dB;
    });
  }
  // 'near' で loc=null のとき: 元順 (master の登録順)

  return arr;
}

function _renderBody() {
  const body = document.getElementById(BODY_ID);
  if (!body) return;
  const SL = (window.NORIRECO?.data?.SERVICE_LINES) || [];

  if (SL.length === 0) {
    body.innerHTML = '<div style="padding:24px;color:var(--silver);font-size:12px;text-align:center">⏳ 営業系統データ読込中... 数秒後に再度開いてください</div>';
    return;
  }

  // A-4: 地域 group の選択肢を SL から動的生成 (13 値の見込み)。
  const groups = Array.from(new Set(SL.map(sl => sl.group || '').filter(Boolean))).sort();
  const groupOpts = ['<option value="all">すべての地域</option>']
    .concat(groups.map(g => `<option value="${_esc(g)}"${_filter.group === g ? ' selected' : ''}>${_esc(g)}</option>`))
    .join('');

  // 現在地が取れているかで「近く順」の使用可否を表示
  const loc = _getCurrentLocation();
  const nearAvailable = !!loc;
  const nearLabel = nearAvailable
    ? (window.NORIRECO?.gps?.lastUserGps ? '近く順 (現在地)' : '近く順 (地図中心)')
    : '近く順 (取得不可)';

  body.innerHTML = `
    <div id="bulk-summary-bar" class="bulk-summary-bar">
      <div class="bulk-summary-count" id="bulk-summary-count">0 件選択中</div>
      <button id="bulk-save-btn" class="bulk-save-btn" disabled>
        💾 まとめて保存
      </button>
    </div>
    <div class="bulk-filter-bar">
      <input type="search" class="bulk-filter-input" id="bulk-filter-query"
             placeholder="🔍 系統名 / 運営会社 (空白で AND)" value="${_esc(_filter.query)}">
      <select class="bulk-filter-sel" id="bulk-filter-sort">
        <option value="near"${_filter.sort === 'near' ? ' selected' : ''}${nearAvailable ? '' : ' disabled'}>${_esc(nearLabel)}</option>
        <option value="name"${_filter.sort === 'name' ? ' selected' : ''}>名前順 (50 音)</option>
      </select>
      <select class="bulk-filter-sel" id="bulk-filter-group">
        ${groupOpts}
      </select>
      <button class="bulk-filter-reset" id="bulk-filter-reset" title="フィルタをリセット">↺</button>
    </div>
    <div class="bulk-note">
      🚧 環状線は 1 駅のみ ridden になります (A-5 で半周分割予定)。
    </div>
    <div id="bulk-checklist-meta" class="bulk-checklist-meta"></div>
    <div id="bulk-checklist" class="bulk-checklist"></div>
  `;

  // 保存ボタン
  const saveBtn = body.querySelector('#bulk-save-btn');
  if (saveBtn) saveBtn.addEventListener('click', () => { saveBulkDrafts(); });

  // フィルタイベント (mp-trip-filter と同じパターン: input は触らず checklist だけ再描画)
  body.querySelector('#bulk-filter-query')?.addEventListener('input', e => {
    _filter.query = e.target.value;
    _renderChecklistOnly();
  });
  body.querySelector('#bulk-filter-sort')?.addEventListener('change', e => {
    _filter.sort = e.target.value;
    _renderChecklistOnly();
  });
  body.querySelector('#bulk-filter-group')?.addEventListener('change', e => {
    _filter.group = e.target.value;
    _renderChecklistOnly();
  });
  body.querySelector('#bulk-filter-reset')?.addEventListener('click', () => {
    _filter.query = ''; _filter.sort = nearAvailable ? 'near' : 'name'; _filter.group = 'all';
    _renderBody();    // input 表示値も初期に戻すため全体再描画
    _updateSummary();
  });

  // 初期: sort='near' だが loc 無いなら 'name' に降格
  if (_filter.sort === 'near' && !nearAvailable) _filter.sort = 'name';

  _renderChecklistOnly();
  _updateSummary();
}

// A-4: フィルタ変更時に呼ぶ。フィルタバーは触らず checklist 領域だけ書き換え。
function _renderChecklistOnly() {
  const list = document.getElementById('bulk-checklist');
  const meta = document.getElementById('bulk-checklist-meta');
  if (!list) return;
  // A-5: チェックリスト全 innerHTML 書き換え前に、開いている accordion editor の draft を保存して destroy
  //   (フィルタ変更でその行が消えたら editor 参照が宙ぶらりんになるため)
  if (_openLineId) _closeAccordion();
  const SL = (window.NORIRECO?.data?.SERVICE_LINES) || [];
  const loc = _getCurrentLocation();
  const filtered = _applyFilter(SL, _filter, loc);
  list.innerHTML = '';
  for (const sl of filtered) list.appendChild(_buildLineItem(sl));
  if (meta) meta.textContent = `${filtered.length} / ${SL.length} 系統`;
}

function _buildLineItem(sl) {
  // A-5: 1 行 = ヘッダ (label, クリックで checkbox toggle) + 非展開コンテナ (div, accordion body)。
  //   ▶/▼ ボタンは event.stopPropagation で checkbox toggle を抑止。
  const wrap = document.createElement('div');
  wrap.className = 'bulk-line-row';
  wrap.dataset.lineId = sl.id;

  const checked = _bulkDrafts.has(sl.id);
  const isOpen = _openLineId === sl.id;
  const isEdited = !!_bulkDrafts.get(sl.id)?._edited;
  const sts = Array.isArray(sl.stations) ? sl.stations : [];
  const opName = sl.operator || '';
  const stCount = sts.length;
  const circularMark = sl.circular ? ' 🔄' : '';
  const editedMark = isEdited ? ' ✏️' : '';
  const color = sl.color || '#888';

  wrap.innerHTML = `
    <label class="bulk-line-item" data-line-id="${_esc(sl.id)}">
      <input type="checkbox" class="bulk-line-check" ${checked ? 'checked' : ''}>
      <span class="bulk-line-swatch" style="background:${color}"></span>
      <span class="bulk-line-main">
        <span class="bulk-line-name">${_esc(sl.name || sl.id)}${circularMark}${editedMark}</span>
        <span class="bulk-line-meta">${_esc(opName)} · ${stCount} 駅</span>
      </span>
      <button type="button" class="bulk-accordion-toggle" aria-expanded="${isOpen ? 'true' : 'false'}"
              title="詳細フォームを開く (時刻 / 列車 / 遅延 / メモ)">
        ${isOpen ? '▼' : '▶'}
      </button>
    </label>
    <div class="bulk-accordion-body" data-line-id="${_esc(sl.id)}"${isOpen ? '' : ' hidden'}>
      <div class="bulk-segment-picker"></div>
      <div class="tde-time"></div>
      <div class="tde-train"></div>
      <div class="tde-delay"></div>
      <div class="tde-notes"></div>
    </div>
  `;

  // checkbox: ゼロ摩擦 default のチェック
  const cb = wrap.querySelector('input.bulk-line-check');
  cb.addEventListener('change', () => _onToggleLine(sl, cb.checked));

  // accordion toggle: チェックボックスの toggle に巻き込まれない
  const tgl = wrap.querySelector('.bulk-accordion-toggle');
  tgl.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    _toggleAccordion(sl);
  });

  return wrap;
}

// ──────────────────────────────────────────────────────────────
// A-5: アコーディオン展開 — 同時 1 行 / フル入力 (Notion §1.3)
// ──────────────────────────────────────────────────────────────

function _toggleAccordion(sl) {
  const wasOpen = _openLineId === sl.id;
  // 別の行を開く前 / 同じ行を閉じる前に: 現開行の draft を上書き保存 + editor destroy
  if (_openLineId) _closeAccordion();
  if (wasOpen) return;   // 同じ行 = 閉じるだけで終了
  _openAccordion(sl);
}

function _openAccordion(sl) {
  // 開く操作 = チェックも入る (Notion §1.3 仕様)
  if (!_bulkDrafts.has(sl.id)) {
    const d = _buildDefaultDraft(sl);
    if (d) _bulkDrafts.set(sl.id, d);
    const cb = document.querySelector(`.bulk-line-row[data-line-id="${CSS.escape(sl.id)}"] input.bulk-line-check`);
    if (cb) cb.checked = true;
  }
  _openLineId = sl.id;
  const body = document.querySelector(`.bulk-accordion-body[data-line-id="${CSS.escape(sl.id)}"]`);
  if (!body) { _updateSummary(); return; }
  body.hidden = false;

  // A-8: 区間ピッカー (from/to select) を mount。dropdown change で draft.segments
  //   を更新 → factory を再 mount (initial 渡し直し)。
  _mountSegmentPicker(sl, body);
  _mountDetailEditor(sl, body);

  // toggle ボタン ▶ → ▼ + scrollIntoView (展開部分が画面外なら見せる)
  const tgl = document.querySelector(`.bulk-line-row[data-line-id="${CSS.escape(sl.id)}"] .bulk-accordion-toggle`);
  if (tgl) { tgl.textContent = '▼'; tgl.setAttribute('aria-expanded', 'true'); }
  setTimeout(() => { try { body.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {} }, 30);
  _updateSummary();
}

// A-8: 区間ピッカー (from/to select) を mount。
//   - stations 全駅を 2 つの select に表示
//   - 初期値は draft.segments[0] の from/to (たたむ default なら両端)
//   - change で draft.segments[0] を更新 + _edited=true + meta 表示更新 +
//     factory 再 mount (initial 渡し直し)
//   - from >= to は許可しない (前後反転は dropdown 操作で起き得るので、
//     change 時に小さい方を from、大きい方を to に正規化)
function _mountSegmentPicker(sl, body) {
  const container = body.querySelector('.bulk-segment-picker');
  if (!container || !sl) return;
  const stations = Array.isArray(sl.stations) ? sl.stations : [];
  if (stations.length < 2) {
    container.innerHTML = '<div class="bsp-warn">⚠️ 駅情報不足 (区間指定不可)</div>';
    return;
  }
  const draft = _bulkDrafts.get(sl.id);
  const seg0 = draft?.segments?.[0];
  let fromIdx = stations.findIndex(s => s.name === seg0?.from);
  let toIdx   = stations.findIndex(s => s.name === seg0?.to);
  if (fromIdx < 0) fromIdx = 0;
  if (toIdx   < 0) toIdx   = stations.length - 1;

  const opts = stations.map((s, i) => `<option value="${i}">${_esc(s.name)}</option>`).join('');
  container.innerHTML = `
    <div class="bsp-label">🚉 区間</div>
    <div class="bsp-row">
      <select class="bsp-sel bsp-from">${opts}</select>
      <span class="bsp-arrow">→</span>
      <select class="bsp-sel bsp-to">${opts}</select>
    </div>
    <div class="bsp-meta" data-bsp-meta></div>
  `;
  const fromSel = container.querySelector('.bsp-from');
  const toSel   = container.querySelector('.bsp-to');
  fromSel.value = String(fromIdx);
  toSel.value   = String(toIdx);

  const updateMeta = () => {
    const f = parseInt(fromSel.value, 10);
    const t = parseInt(toSel.value, 10);
    const lo = Math.min(f, t), hi = Math.max(f, t);
    const segCount = hi - lo + 1;
    const isFull = (lo === 0 && hi === stations.length - 1);
    const meta = container.querySelector('[data-bsp-meta]');
    if (meta) {
      meta.textContent = isFull
        ? `${segCount} 駅 (全線)`
        : `${segCount} 駅 / ${stations.length} 駅中`;
      meta.classList.toggle('bsp-meta-full', isFull);
    }
  };
  updateMeta();

  const onChange = () => {
    const f = parseInt(fromSel.value, 10);
    const t = parseInt(toSel.value, 10);
    if (Number.isNaN(f) || Number.isNaN(t)) return;
    // 正規化: 前後反転は使い手の意図次第 (折返し記録) だが、resolveByServiceLine は
    //   lo..hi で範囲展開するため from/to の前後は同じ結果。順序保存だけ整える。
    const lo = Math.min(f, t), hi = Math.max(f, t);
    const fromSt = stations[lo];
    const toSt   = stations[hi];
    const cur = _bulkDrafts.get(sl.id);
    if (cur) {
      _bulkDrafts.set(sl.id, {
        ...cur,
        segments: [{
          lineId: sl.id,
          from:   fromSt.name,
          to:     toSt.name,
          from_station_id: fromSt.id || null,
          to_station_id:   toSt.id   || null,
          // 既存 segments[0] に train_* があれば引き継ぐ (factory 再 mount で再表示用)
          train_category: cur.segments?.[0]?.train_category || null,
          train_id:       cur.segments?.[0]?.train_id       || null,
          train_name:     cur.segments?.[0]?.train_name     || null,
          car_model:      cur.segments?.[0]?.car_model      || null,
        }],
        _edited: true,
      });
    }
    updateMeta();
    // factory を再 mount (initial の segments を新値で渡し直し)。
    //   現 editor の time / delay / notes の編集状態を draft に保存してから再生成。
    if (_openEditor) {
      try {
        const ed = _openEditor.getDraft();
        const cur2 = _bulkDrafts.get(sl.id);
        if (cur2) {
          _bulkDrafts.set(sl.id, {
            ...cur2,
            date:           ed.date           || null,
            depart_time:    ed.depart_time    || null,
            arrive_time:    ed.arrive_time    || null,
            date_precision: ed.date_precision || cur2.date_precision || 'unknown',
            delay_minutes:  (typeof ed.delay_minutes === 'number') ? ed.delay_minutes : null,
            notes:          ed.notes || null,
            // segments は今 picker で書き換えた新値を保持 (ed.segments は古い from/to)
          });
        }
        _openEditor.destroy();
      } catch (e) { console.warn('[bulk-record] editor.getDraft (segment change) failed:', e); }
      _openEditor = null;
    }
    _mountDetailEditor(sl, body);
    // 行ヘッダの ✏️ マーク反映
    _refreshLineHeader(sl.id);
  };
  fromSel.addEventListener('change', onChange);
  toSel.addEventListener('change', onChange);
}

// A-5: detail editor mount (区間 picker と分離、A-8 で picker change 時の
//   再 mount 呼出のため独立関数化)。
function _mountDetailEditor(sl, body) {
  const draft = _bulkDrafts.get(sl.id);
  try {
    _openEditor = createTripDetailEditor({
      containers: {
        time:  body.querySelector('.tde-time'),
        train: body.querySelector('.tde-train'),
        delay: body.querySelector('.tde-delay'),
        notes: body.querySelector('.tde-notes'),
      },
      initial: _draftToEditorInitial(draft, sl),
      features: {
        timeRow:     { precisions: ['minute', 'day', 'month', 'year', 'unknown'] },
        trainPicker: 'per-seg-rows',
        delay:       true,
        notes:       true,
        photos:      false,
      },
    });
  } catch (e) {
    console.warn('[bulk-record] createTripDetailEditor failed:', e);
    body.querySelector('.tde-time').innerHTML =
      `<div style="padding:12px;color:var(--red);font-size:11px">⚠️ 詳細フォーム生成失敗: ${_esc(e.message || String(e))}</div>`;
  }
}

// 行ヘッダの ✏️ マーク / アイコン状態を再描画 (segment change で _edited=true になった
// 後に呼ぶ)。アコーディオン展開中は ▼ のまま残す。
function _refreshLineHeader(lineId) {
  const wrap = document.querySelector(`.bulk-line-row[data-line-id="${CSS.escape(lineId)}"]`);
  if (!wrap) return;
  const nameEl = wrap.querySelector('.bulk-line-name');
  const d = _bulkDrafts.get(lineId);
  const SL = (window.NORIRECO?.data?.SERVICE_LINES) || [];
  const sl = SL.find(x => x.id === lineId);
  if (nameEl && sl) {
    const circularMark = sl.circular ? ' 🔄' : '';
    const editedMark   = d?._edited ? ' ✏️' : '';
    nameEl.textContent = `${sl.name || sl.id}${circularMark}${editedMark}`;
  }
}

function _closeAccordion() {
  if (!_openLineId) return;
  const lineId = _openLineId;
  // editor.getDraft() で _bulkDrafts に上書き
  if (_openEditor) {
    try {
      const ed = _openEditor.getDraft();
      const cur = _bulkDrafts.get(lineId);
      if (cur) {
        _bulkDrafts.set(lineId, {
          ...cur,
          date:           ed.date           || null,
          depart_time:    ed.depart_time    || null,
          arrive_time:    ed.arrive_time    || null,
          date_precision: ed.date_precision || cur.date_precision || 'unknown',
          segments: (Array.isArray(ed.segments) && ed.segments.length > 0)
            ? ed.segments.map(s => ({
                lineId: s.lineId,
                from:   s.from,
                to:     s.to,
                // factory は from_id/to_id ではなく from_station_id/to_station_id を返さないため、
                // 旧 draft の seg から駅 id を引き継ぐ (line/from/to 同じなら同じ id)
                from_station_id: s.from_station_id || s.from_id || _findSegStationId(cur, s.lineId, s.from, 'from'),
                to_station_id:   s.to_station_id   || s.to_id   || _findSegStationId(cur, s.lineId, s.to,   'to'),
                train_category:  s.train_category || null,
                train_id:        s.train_id       || null,
                train_name:      s.train_name     || null,
                car_model:       s.car_model      || null,
              }))
            : cur.segments,
          delay_minutes: (typeof ed.delay_minutes === 'number') ? ed.delay_minutes : null,
          notes:         ed.notes || null,
          _edited:       true,
        });
      }
    } catch (e) {
      console.warn('[bulk-record] editor.getDraft failed:', e);
    }
    try { _openEditor.destroy(); } catch (e) {}
    _openEditor = null;
  }
  // 行ヘッダ更新 (✏️ マーク追加 / ▼ → ▶)
  const wrap = document.querySelector(`.bulk-line-row[data-line-id="${CSS.escape(lineId)}"]`);
  if (wrap) {
    const body = wrap.querySelector('.bulk-accordion-body');
    if (body) body.hidden = true;
    const tgl = wrap.querySelector('.bulk-accordion-toggle');
    if (tgl) { tgl.textContent = '▶'; tgl.setAttribute('aria-expanded', 'false'); }
    const nameEl = wrap.querySelector('.bulk-line-name');
    const d = _bulkDrafts.get(lineId);
    const SL = (window.NORIRECO?.data?.SERVICE_LINES) || [];
    const sl = SL.find(x => x.id === lineId);
    if (nameEl && sl) {
      const circularMark = sl.circular ? ' 🔄' : '';
      const editedMark   = d?._edited ? ' ✏️' : '';
      nameEl.textContent = `${sl.name || sl.id}${circularMark}${editedMark}`;
    }
  }
  _openLineId = null;
  _updateSummary();
}

function _findSegStationId(prevDraft, lineId, stName, role /* 'from' | 'to' */) {
  if (!prevDraft || !Array.isArray(prevDraft.segments)) return null;
  for (const s of prevDraft.segments) {
    if (s.lineId !== lineId) continue;
    if (role === 'from' && s.from === stName) return s.from_station_id || s.from_id || null;
    if (role === 'to'   && s.to   === stName) return s.to_station_id   || s.to_id   || null;
  }
  return null;
}

function _draftToEditorInitial(draft, sl) {
  // factory の initial 構造に合わせる。segments には lineName が必要 (per-seg-rows mode の行ヘッダ表示)。
  return {
    date:           draft.date           || null,
    depart_time:    draft.depart_time    || null,
    arrive_time:    draft.arrive_time    || null,
    date_precision: draft.date_precision || 'unknown',
    segments: (draft.segments || []).map(s => ({
      lineId:   s.lineId,
      lineName: sl?.name || s.lineId,
      from:     s.from,
      to:       s.to,
      from_station_id: s.from_station_id || s.from_id || null,
      to_station_id:   s.to_station_id   || s.to_id   || null,
      train_category:  s.train_category || null,
      train_id:        s.train_id       || null,
      train_name:      s.train_name     || null,
      car_model:       s.car_model      || null,
    })),
    delay_minutes: (typeof draft.delay_minutes === 'number') ? draft.delay_minutes : null,
    notes:         draft.notes || null,
  };
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
// A-6: 空マップ時オンボーディングバナー — Notion §1.3 入口 (b)
//
// 表示条件: 旅程が 1 件もない (localStorage `norireco_trips` 空 AND
//   `window.RIDDEN_SEGS.length === 0`)。
// 何らかの記録があれば即 hide。saveBulkDrafts / 通常記録モード両方の保存後
// に呼ぶ必要があるが、bulk 側からは直接、通常記録は将来 hook を入れるか
// init 時に 1 回呼ぶだけでも当面十分 (新規ユーザーは bulk が主導線)。
// ──────────────────────────────────────────────────────────────

export function updateOnboardingBanner() {
  const banner = document.getElementById('empty-onboarding-banner');
  if (!banner) return;
  let lsLen = 0;
  try { lsLen = (JSON.parse(localStorage.getItem('norireco_trips') || '[]')).length; } catch (e) {}
  const segsLen = Array.isArray(window.RIDDEN_SEGS) ? window.RIDDEN_SEGS.length : 0;
  const isEmpty = lsLen === 0 && segsLen === 0;
  banner.hidden = !isEmpty;
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
  // A-5: 編集済み draft なら editor 値を採用。未編集 (たたむ default) は従来通り。
  const edited = !!draft._edited;
  const lineName = draft.lineName;
  // 編集済みなら segments に train/列車情報が乗っているかも → name に反映
  const segs = (draft.segments || []).map(s => ({
    lineId: s.lineId,
    from:   s.from,
    to:     s.to,
    from_id: s.from_station_id || s.from_id || null,
    to_id:   s.to_station_id   || s.to_id   || null,
    train_category: s.train_category || null,
    train_id:       s.train_id       || null,
    train_name:     s.train_name     || null,
    car_model:      s.car_model      || null,
  }));
  const fromStId = segs[0]?.from_id || null;
  const toStId   = segs[segs.length - 1]?.to_id || null;

  // A-8: total_stations と name は segments[0] の from/to から計算。
  //   - 全線 (両端) なら "{線名} 全線" / stations.length 駅
  //   - 区間指定なら "{線名} {from}→{to}" / 区間内駅数
  //   環状線は SERVICE_LINES と N02 line の駅順ズレで resolve が部分塗りになる
  //   既知問題あり (A-5 でも完全解決せず、別タスクへ持ち越し)。total_stations 自己申告は
  //   stations 配列 index ベースで素直に計算。
  let totalStations = stations.length;
  let tripName = `${lineName} 全線`;
  if (segs[0]) {
    const seg = segs[0];
    const fromIdx = stations.findIndex(s => s.name === seg.from);
    const toIdx   = stations.findIndex(s => s.name === seg.to);
    if (fromIdx >= 0 && toIdx >= 0) {
      const lo = Math.min(fromIdx, toIdx), hi = Math.max(fromIdx, toIdx);
      totalStations = hi - lo + 1;
      const isFull = (lo === 0 && hi === stations.length - 1);
      tripName = isFull ? `${lineName} 全線` : `${lineName} ${seg.from}→${seg.to}`;
    }
  }

  // trip 直下の train_* 集約 (saveMultiSegmentTrip v375 と同形)
  const aggTrain = (key) => {
    if (segs.length === 0) return null;
    const set = new Set(segs.map(s => s[key] || ''));
    return (set.size === 1 && [...set][0]) ? [...set][0] : null;
  };

  return {
    id: `trip_${ctx.baseTime}_${idx}`,
    // 編集済みなら editor の date / precision を使う。未編集なら today (NOT NULL 制約のため、
    // dp='unknown' のときも Supabase 側で除外フィルタが効く)
    date: edited ? (draft.date || ctx.today) : ctx.today,
    name: tripName,
    photos: [],
    from_station_id: fromStId,
    to_station_id:   toStId,
    total_stations:  totalStations,
    transfers:       Math.max(0, segs.length - 1),
    line_list:       lineName,
    total_minutes:   0,
    depart_time:     edited ? (draft.depart_time || '') : '',
    arrive_time:     edited ? (draft.arrive_time || '') : '',
    segments:        segs,
    source:          'manual',
    verified:        false,
    gps_lat:         null,
    gps_lon:         null,
    gps_accuracy:    null,
    recorded_at:     ctx.recordedAt,
    date_precision:  edited ? (draft.date_precision || 'unknown') : 'unknown',
    train_id:        aggTrain('train_id'),
    train_name:      aggTrain('train_name'),
    train_category:  aggTrain('train_category'),
    car_model:       aggTrain('car_model'),
    notes:           edited ? (draft.notes || null) : null,
    delay_minutes:   edited ? ((typeof draft.delay_minutes === 'number') ? draft.delay_minutes : null) : null,
    user_id:         ctx.userId,
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
  // A-5: 開いているアコーディオンがあれば draft 上書き保存してから save 開始
  if (_openLineId) _closeAccordion();
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
  // A-6: 空マップ banner を再評価 (1 件でも保存していれば自動で消える)
  updateOnboardingBanner();
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
  // A-4: フィルタも毎回リセット (open 毎に「今の現在地で近い順」を見せたい)。
  _filter.query = '';
  _filter.sort = 'near';
  _filter.group = 'all';
  _renderBody();
  sheet.classList.add('open');
}

export function closeBulkRecordSheet() {
  const sheet = document.getElementById(SHEET_ID);
  if (!sheet) return;
  sheet.classList.remove('open');
  // A-5: 開いている editor があれば destroy (draft 上書きは clear で破棄するので不要)
  if (_openEditor) { try { _openEditor.destroy(); } catch (e) {} _openEditor = null; }
  _openLineId = null;
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
NORIRECO.bulkRecord.updateOnboardingBanner = updateOnboardingBanner;
NORIRECO.bulkRecord._debugGetDrafts = _debugGetDrafts;

// A-6: ページ初期化時にも banner 評価。
//   - DOMContentLoaded 後に呼ぶ (banner element が存在する必要あり)
//   - RIDDEN_SEGS の populate は 05-supabase-data の async 同期後、
//     さらに数秒かかる可能性 → 初回チェック + 3 秒後フォローアップで十分カバー。
//   - 通常記録モード (saveMultiSegmentTrip) からの hook は別 issue (07 側で
//     window.NORIRECO.bulkRecord.updateOnboardingBanner?.() を呼ぶ追加が必要)。
if (typeof window !== 'undefined') {
  const _onReady = () => {
    updateOnboardingBanner();
    setTimeout(updateOnboardingBanner, 3000);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _onReady, { once: true });
  } else {
    _onReady();
  }
}
