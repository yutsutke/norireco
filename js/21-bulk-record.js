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
//   A-2 (v401): 営業系統チェックリスト本体 + たたむモード (本ファイル現状)
//                draft 配列 _bulkDrafts: Map<lineId, draft> をローカル管理
//                チェックで全線 1 segment の draft を push、アンチェックで pop
//                保存ボタンは disabled の骨だけ (実保存は A-3)
//   A-3: 一括保存 (draft 配列ループ → trip 構築 → Supabase upsert)
//   A-4: 検索 + フィルタ (近く / 会社 / 都道府県) + 既定「近く」並べ替え
//   A-5: アコーディオン展開 (createTripDetailEditor per-seg-rows mode を行内 mount)
//   A-6: 空マップ時オンボーディングバナー
//   A-7: unknown 完乗率/塗り集計まわりの検証
//
// 前提 (B カテゴリ完結で揃った):
//   - createTripDetailEditor (js/20-trip-detail-editor.js) が 3 mode 実装済み
//   - multi-container API (`containers`) で行展開ごとに別 container mount 可能
//   - グローバル可変 state なし → 複数行展開でも互いに干渉しない
// ══════════════════════════════════════════════════════════════

window.NORIRECO = window.NORIRECO || {};
window.NORIRECO.bulkRecord = window.NORIRECO.bulkRecord || {};

const SHEET_ID = 'bulk-record-sheet';
const BODY_ID  = 'bulk-record-body';

// A-2: draft 配列。チェックされた営業系統ごとに 1 件保持。
//   key = sl.id, value = { lineId, lineName, segments, source, verified,
//                          date_precision, _circular }
// 永続化はしない (sheet close 時に空にする)。A-3 の保存処理で読み出す。
const _bulkDrafts = new Map();

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
      <button id="bulk-save-btn" class="bulk-save-btn" disabled
              title="A-3 で実装予定 (現段階は選択状態の確認のみ)">
        💾 まとめて保存 (A-3 で実装)
      </button>
    </div>
    <div class="bulk-note">
      🚧 A-2: 全 ${SL.length} 系統を一覧表示中。検索 / フィルタ (近く・会社・都道府県) は A-4 で追加します。
    </div>
    <div id="bulk-checklist" class="bulk-checklist"></div>
  `;

  const list = body.querySelector('#bulk-checklist');
  for (const sl of SL) {
    list.appendChild(_buildLineItem(sl));
  }
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
  // 保存ボタンは A-3 まで disabled だが、件数 0 のときも明示的に disabled に保つ
  // (A-3 で `disabled = _bulkDrafts.size === 0` に置き換える)
}

function _esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
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
NORIRECO.bulkRecord._debugGetDrafts = _debugGetDrafts;
