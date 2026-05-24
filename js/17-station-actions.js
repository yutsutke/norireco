// ══════════════════════════════════════════════════════════════
// 駅アクションシート (v253)
// 通常モードで駅マーカーをタップしたときに開くシート型モーダル。
//
// ボタン構成 (動的):
//   🎭 キャラ名 を見る        (キャラ獲得済 or 未獲得 locked がある駅のみ)
//   🚃 この駅を含む旅程 (N件)   (v282〜、_mypageCache 利用)
//   📝 ここから手動記録を始める (常時)
//   📸 メモ (N件)              (常時、件数バッジ)
//   🎨 系統色を変更             (乗り入れ系統が 1 つ以上ある駅のみ)
//   閉じる
//
// 乗り入れ系統が複数あって「🎨 色変更」を押した場合は、シート内が
// 「どの系統の色を変更?」の系統選択リストに差し替わる。
// 「🚃 旅程」を押すと、シート内が trip カード一覧に差し替わる (v282)。
//
// 記録モード ON 中・メモモード ON 中は本シートを開かない (08-rendering 側で
// 早期 return) — 経路選択 / メモ新規作成の操作を妨げないため。
//
// TODO「🟡 駅 UI の情報ハブ化（4領域パネル）」の自分の記録・個人メモ・
// 公的情報・周辺情報の 4 領域パネルへの足がかり。
// ══════════════════════════════════════════════════════════════

import { toggleRecordMode, onRecordStationClick } from './07-record-mode.js';
import { openCharModal } from './08-rendering.js';
import { isCharacterOwned } from './03-characters.js';
// v283: 路線アクションシート「+ 新しい路線メモを残す」から呼ぶ
import { openMemo } from './16-memos.js';
// v287.1: tripVisitsStation は 13-mypage-common に共通化済 (マイページの駅名検索も同じロジックを使う)
// v309: loadMypageTripsIfNeeded — タブ未開封時の lazy fetch
import { tripVisitsStation, loadMypageTripsIfNeeded } from './13-mypage-common.js';

window.NORIRECO = window.NORIRECO || {};
NORIRECO.stationActions = NORIRECO.stationActions || {
  state: {
    currentMs: null,     // 開いてる駅 (merged_stations の ms オブジェクト) — kind='station' のときセット
    currentSl: null,     // v283: 開いてる路線 (SERVICE_LINES の sl) — kind='line' のときセット
    kind: null,          // v283: 'station' | 'line' | null (どちらモードで開いているか)
    currentChar: null,   // この駅のキャラ (取得済 or 未獲得 obtainable[0]) | null
    currentCharLocked: false,
    colorPickLines: null, // 色変更系統選択中の lines[]
  },
};
const S = NORIRECO.stationActions.state;

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]
  ));
}

// 駅にキャラが紐付いているかを charModeOn / 獲得状態に依存せずに判定し、
// 「🎭 を見る」ボタンに出す代表キャラ + locked フラグを返す。
//
// 優先順位:
//   1. 獲得済み (charModeOn でフィルタされた getStationCharacter は使えないので
//      stationCharMap → isCharacterOwned で自前判定)
//   2. 未獲得だが期間内・obtainable (locked obtainable)
//   3. 未獲得 + 期間外 (= シーズン外でも、お客さんが「あれ?」と
//      なる前にキャラ情報を見られるよう露出)
// v324 (Phase 3): 引数を stationName → stationId (s_NNNNN)。stationCharMap は駅 id キー化済。
function pickCharacterForStation(stationId) {
  if (!stationId) return { character: null, locked: false };
  const list = NORIRECO.data?.stationCharMap?.get(stationId) || [];
  if (list.length === 0) return { character: null, locked: false };

  // 1. 獲得済みを優先
  const owned = list.find(c => isCharacterOwned(c.meta?.id));
  if (owned) return { character: owned, locked: false };

  // 2/3. 未獲得 (期間内も期間外も同じ「未獲得」扱いで openCharModal の locked 表示に任せる)
  return { character: list[0], locked: true };
}

// v287.1: tripVisitsStation 本体は 13-mypage-common.js へ移動 (マイページ駅名検索と共通化)。

// v312 (Phase 2-c): 引数を ms オブジェクトに変更 (id 優先比較のため)。
//   tripVisitsStation 側が ms.id ↔ trip.*_station_id の一致を優先、無ければ name 比較。
function getTripsAtStation(ms) {
  const trips = NORIRECO.mypage?.state?._mypageCache;
  if (!Array.isArray(trips)) return null;     // cache 未初期化 (マイページ未開封)
  return trips.filter(t => tripVisitsStation(t, ms));
}

// 駅マーカークリックから呼ばれるエントリポイント
export function openStationActionSheet(ms, options) {
  // options = { character, characterLocked }  // 後方互換のため受け付けるが、
  // options が無ければ自前で判定する (charModeOn=false でもキャラを露出させる v253.1 修正)
  S.kind = 'station';
  S.currentMs = ms;
  S.currentSl = null;
  if (options && options.character !== undefined) {
    S.currentChar = options.character;
    S.currentCharLocked = !!options.characterLocked;
  } else {
    const picked = pickCharacterForStation(ms.id);
    S.currentChar = picked.character;
    S.currentCharLocked = picked.locked;
  }
  S.colorPickLines = null;

  // 乗り入れ系統を解決
  const lines = (ms.lines || [])
    .map(lid => (NORIRECO.data?.SERVICE_LINES || []).find(x => x.id === lid))
    .filter(Boolean);

  // メモ件数
  const memoCount = (window.NORIRECO?.memos?.state?.cache || [])
    .filter(m => m.station === ms.name).length;

  // 見出し
  document.getElementById('sa-title').textContent = `🚉 ${ms.name}`;
  document.getElementById('sa-sub').textContent =
    lines.length > 0 ? lines.map(l => l.name).join(' · ') : '';

  // ボタン群を組み立て
  renderActionList({ ms, lines, memoCount });

  document.getElementById('station-action-modal').classList.add('open');
}

function renderActionList({ ms, lines, memoCount }) {
  const container = document.getElementById('sa-actions');
  const buttons = [];

  // 🎭 キャラ (あれば)
  if (S.currentChar) {
    const charMeta = S.currentChar.meta || {};
    const lockedSuffix = S.currentCharLocked ? ' (未獲得)' : '';
    const charName = charMeta.name || 'キャラ';
    buttons.push(`
      <button class="sa-btn" onclick="onSaShowCharacter()">
        <span class="sa-btn-ic">🎭</span>
        <span class="sa-btn-tx">${escapeHtml(charName)} を見る${escapeHtml(lockedSuffix)}</span>
        <span class="sa-btn-arrow">›</span>
      </button>
    `);
  }

  // 🚃 この駅を含む旅程 (v282)
  // _mypageCache が null (マイページ未開封) の場合は件数バッジ無しで案内文に切り替え
  // v309: タップ時に lazy fetch するため、ラベルを「タップで読み込み」へ
  // v312 (Phase 2-c): 引数を ms オブジェクトに (id 優先比較)
  const tripsHere = getTripsAtStation(ms);
  if (tripsHere === null) {
    buttons.push(`
      <button class="sa-btn" onclick="onSaShowTrips()">
        <span class="sa-btn-ic">🚃</span>
        <span class="sa-btn-tx">この駅を含む旅程 (タップで読み込み)</span>
        <span class="sa-btn-arrow">›</span>
      </button>
    `);
  } else {
    const tripBadge = tripsHere.length > 0 ? `<span class="sa-btn-badge">${tripsHere.length}</span>` : '';
    buttons.push(`
      <button class="sa-btn" onclick="onSaShowTrips()">
        <span class="sa-btn-ic">🚃</span>
        <span class="sa-btn-tx">この駅を含む旅程${tripsHere.length > 0 ? '一覧' : ' (なし)'}</span>
        ${tripBadge}
        <span class="sa-btn-arrow">›</span>
      </button>
    `);
  }

  // 📝 手動記録
  buttons.push(`
    <button class="sa-btn" onclick="onSaStartRecording()">
      <span class="sa-btn-ic">📝</span>
      <span class="sa-btn-tx">ここから手動記録を始める</span>
      <span class="sa-btn-arrow">›</span>
    </button>
  `);

  // 📸 メモ
  const memoBadge = memoCount > 0
    ? `<span class="sa-btn-badge">${memoCount}</span>`
    : '';
  buttons.push(`
    <button class="sa-btn" onclick="onSaOpenMemos()">
      <span class="sa-btn-ic">📸</span>
      <span class="sa-btn-tx">メモ ${memoCount > 0 ? '一覧' : 'を残す'}</span>
      ${memoBadge}
      <span class="sa-btn-arrow">›</span>
    </button>
  `);

  // 🎨 色変更 (乗り入れ系統あれば)
  if (lines.length > 0) {
    buttons.push(`
      <button class="sa-btn" onclick="onSaChangeColor()">
        <span class="sa-btn-ic">🎨</span>
        <span class="sa-btn-tx">系統色を変更${lines.length > 1 ? ` (${lines.length}系統)` : ''}</span>
        <span class="sa-btn-arrow">›</span>
      </button>
    `);
  }

  container.innerHTML = buttons.join('');
}

function renderColorLineSelector(lines) {
  const container = document.getElementById('sa-actions');
  const items = lines.map((l, i) => `
    <button class="sa-btn" onclick="onSaPickColorLine(${i})">
      <span class="sa-line-swatch" style="background:${escapeHtml(l.color || '#888')}"></span>
      <span class="sa-btn-tx">${escapeHtml(l.name || l.id)}</span>
      <span class="sa-btn-arrow">›</span>
    </button>
  `).join('');
  container.innerHTML = `
    <div class="sa-section-label">どの系統の色を変更?</div>
    ${items}
    <button class="sa-btn sa-btn-back" onclick="onSaBackToMain()">← 戻る</button>
  `;
  S.colorPickLines = lines;
}

function closeStationActionSheet() {
  document.getElementById('station-action-modal').classList.remove('open');
  S.currentMs = null;
  S.currentSl = null;
  S.kind = null;
  S.currentChar = null;
  S.colorPickLines = null;
}

// ── 路線アクションシート (v283) ────────────────────────────────────
// 地図上で路線 (polyline) をクリックすると、駅アクションシートと同じ枠で
// 開く。中身は「📸 メモ」「🎨 系統色を変更」。
export function openLineActionSheet(sl) {
  if (!sl) return;
  S.kind = 'line';
  S.currentSl = sl;
  S.currentMs = null;
  S.currentChar = null;
  S.currentCharLocked = false;
  S.colorPickLines = null;

  document.getElementById('sa-title').textContent = `🚃 ${sl.name || sl.id}`;
  document.getElementById('sa-sub').textContent = sl.group || '';

  renderLineActionList(sl);
  document.getElementById('station-action-modal').classList.add('open');
}

function getMemosForLine(lineId) {
  const memos = window.NORIRECO?.memos?.state?.cache;
  if (!Array.isArray(memos)) return null;     // memo cache 未初期化
  return memos.filter(m => m.line_id === lineId);
}

function renderLineActionList(sl) {
  const container = document.getElementById('sa-actions');
  const buttons = [];

  // 📸 メモ — 一覧 + 新規 (路線メモ: memo_type='路線' or station=null && line_id=sl.id)
  const lineMemos = getMemosForLine(sl.id);
  const memoBadge = lineMemos && lineMemos.length > 0
    ? `<span class="sa-btn-badge">${lineMemos.length}</span>`
    : '';
  const memoLabel = lineMemos === null
    ? 'メモ (未読込)'
    : (lineMemos.length > 0 ? '路線メモ 一覧' : '路線メモを残す');
  buttons.push(`
    <button class="sa-btn" onclick="onSlOpenMemos()">
      <span class="sa-btn-ic">📸</span>
      <span class="sa-btn-tx">${escapeHtml(memoLabel)}</span>
      ${memoBadge}
      <span class="sa-btn-arrow">›</span>
    </button>
  `);

  // 🎨 系統色を変更
  buttons.push(`
    <button class="sa-btn" onclick="onSlChangeColor()">
      <span class="sa-btn-ic">🎨</span>
      <span class="sa-btn-tx">系統色を変更</span>
      <span class="sa-btn-arrow">›</span>
    </button>
  `);

  container.innerHTML = buttons.join('');
}

function onSlChangeColor() {
  const sl = S.currentSl;
  if (!sl) return;
  closeStationActionSheet();
  window.NORIRECO?.colorOverrides?.openEditor?.(sl);
}

// 路線メモ一覧をシート内に展開 (駅の onSaShowTrips と同じパターン)
function onSlOpenMemos() {
  const sl = S.currentSl;
  if (!sl) return;
  renderLineMemoListInSheet(sl);
}

function renderLineMemoListInSheet(sl) {
  const container = document.getElementById('sa-actions');
  if (!container) return;

  const memos = getMemosForLine(sl.id);
  if (memos === null) {
    container.innerHTML = `
      <div class="sa-section-label">マイページ「📸 メモ」を一度開くとメモが読み込まれます</div>
      <button class="sa-btn sa-btn-back" onclick="onSlBackToMain()">← 戻る</button>
    `;
    return;
  }

  // 「+ 新しい路線メモを残す」ボタンは常に表示
  const addBtn = `
    <button class="sa-btn" onclick="onSlAddMemo()" style="border-style:dashed;justify-content:center;">
      <span class="sa-btn-ic">＋</span>
      <span class="sa-btn-tx">新しい路線メモを残す</span>
    </button>
  `;

  if (memos.length === 0) {
    container.innerHTML = `
      <div class="sa-section-label">この路線のメモはまだありません</div>
      ${addBtn}
      <button class="sa-btn sa-btn-back" onclick="onSlBackToMain()">← 戻る</button>
    `;
    return;
  }

  // memoCardHtml は 16-memos.js 内で private なので、軽量版を自前で組み立てる
  const sorted = [...memos].sort((a, b) =>
    (b.created_at || '').localeCompare(a.created_at || '')
  );
  const cards = sorted.map(memoCardHtmlMini).join('');

  container.innerHTML = `
    <div class="sa-section-label">📸 ${escapeHtml(sl.name || sl.id)} のメモ (${memos.length}件)</div>
    ${addBtn}
    <div class="sa-memo-list">${cards}</div>
    <button class="sa-btn sa-btn-back" onclick="onSlBackToMain()">← 戻る</button>
  `;
}

// シート内に詰めるための軽量メモカード (マイページの memoCardHtml は draggable 写真等で重いので別途)
function memoCardHtmlMini(memo) {
  const TYPE_ICON = { '駅': '🚉', '車内': '🪟', '路線': '🚃', 'その他': '📍' };
  const MOOD_ICON = { '最高': '🤩', '良い': '😊', '普通': '😐', '微妙': '😕', '最悪': '😤' };
  const dateStr = (memo.created_at || '').slice(0, 10) || '日時不明';
  const typeIc = TYPE_ICON[memo.memo_type] || '📍';
  const moodIc = MOOD_ICON[memo.mood] || '';
  const station = memo.station ? `🚉 ${escapeHtml(memo.station)}` : '';
  const photos = (Array.isArray(memo.photos) ? memo.photos : []).filter(p => p && p.url);
  const photosHtml = photos.length > 0
    ? `<div class="sa-memo-thumbs">${photos.map(p =>
        `<a href="${escapeHtml(p.url)}" target="_blank" rel="noopener"><img src="${escapeHtml(p.url)}" loading="lazy" alt=""></a>`
      ).join('')}</div>`
    : '';
  const comment = memo.comment ? `<div class="sa-memo-comment">${escapeHtml(memo.comment)}</div>` : '';
  return `
    <div class="sa-memo-card" data-memo-id="${escapeHtml(memo.id)}">
      <div class="sa-memo-head">
        <span class="sa-memo-date">${escapeHtml(dateStr)}</span>
        <span>${typeIc}${moodIc ? ' ' + moodIc : ''}</span>
        ${station ? `<span>${station}</span>` : ''}
      </div>
      ${comment}
      ${photosHtml}
      <div class="sa-memo-actions">
        <button class="mp-act-btn edit-memo" onclick="openMemoForEdit('${escapeHtml(memo.id)}')">✏️ 編集</button>
        <button class="mp-act-btn delete" onclick="deleteMemoById('${escapeHtml(memo.id)}')">🗑 削除</button>
      </div>
    </div>
  `;
}

// 「+ 新しい路線メモを残す」: memo-modal を開く前に clickInfo を路線用に組み立てる
function onSlAddMemo() {
  const sl = S.currentSl;
  if (!sl) return;
  // 16-memos.js の openMemo は NORIRECO.map.clickInfo / opts を読む
  window.NORIRECO = window.NORIRECO || {};
  NORIRECO.map = NORIRECO.map || {};
  NORIRECO.map.clickInfo = {
    line: { id: sl.id, name: sl.name || sl.id },
    station: { n: null, lat: null, lon: null },
    lat: '',
    lon: '',
  };
  closeStationActionSheet();
  openMemo({
    defaultMemoType: '路線',
    title: `📸 ${sl.name || sl.id} の路線メモ`,
    sub: sl.group || '路線全体',
  });
}

function onSlBackToMain() {
  const sl = S.currentSl;
  if (!sl) return;
  renderLineActionList(sl);
}

// ── 各アクションのハンドラ ─────────────────────────────────────

function onSaShowCharacter() {
  const ms = S.currentMs;
  const ch = S.currentChar;
  if (!ms || !ch) return;
  closeStationActionSheet();
  // openCharModal は 08 の export を直接 import 済 (window bridge 廃止のため)
  openCharModal(ms, ch);
}

function onSaStartRecording() {
  const ms = S.currentMs;
  if (!ms) return;
  closeStationActionSheet();
  if (!NORIRECO.record?.mode) {
    toggleRecordMode();
  }
  // 短い遅延で記録モードの DOM 更新を待ってから 1 駅目を追加
  setTimeout(() => {
    onRecordStationClick({ name: ms.name, lat: ms.lat, lon: ms.lon });
  }, 50);
}

function onSaOpenMemos() {
  const ms = S.currentMs;
  if (!ms) return;
  closeStationActionSheet();
  const firstSlId = ms.lines && ms.lines[0];
  const sl = firstSlId
    ? (NORIRECO.data?.SERVICE_LINES || []).find(x => x.id === firstSlId)
    : null;
  window.NORIRECO?.memos?.openStationMemoList?.({
    station: ms.name,
    station_id: ms.id || null,  // v315 (Phase 3-d): 駅 id も渡す
    lineId: sl?.id || null,
    lineName: sl?.name || null,
    lat: ms.lat,
    lon: ms.lon,
  });
}

function onSaChangeColor() {
  const ms = S.currentMs;
  if (!ms) return;
  const lines = (ms.lines || [])
    .map(lid => (NORIRECO.data?.SERVICE_LINES || []).find(x => x.id === lid))
    .filter(Boolean);
  if (lines.length === 0) return;
  if (lines.length === 1) {
    closeStationActionSheet();
    window.NORIRECO?.colorOverrides?.openEditor?.(lines[0]);
  } else {
    renderColorLineSelector(lines);
  }
}

function onSaPickColorLine(idx) {
  const line = S.colorPickLines?.[idx];
  if (!line) return;
  closeStationActionSheet();
  window.NORIRECO?.colorOverrides?.openEditor?.(line);
}

function onSaBackToMain() {
  const ms = S.currentMs;
  if (!ms) return;
  // メイン画面を再構築
  const lines = (ms.lines || [])
    .map(lid => (NORIRECO.data?.SERVICE_LINES || []).find(x => x.id === lid))
    .filter(Boolean);
  const memoCount = (window.NORIRECO?.memos?.state?.cache || [])
    .filter(m => m.station === ms.name).length;
  renderActionList({ ms, lines, memoCount });
  S.colorPickLines = null;
}

// v282: 「🚃 この駅を含む旅程」ボタンのハンドラ
// v309: マイページタブ未開封でも、ここで lazy fetch (loadMypageTripsIfNeeded) して
//       即座に旅程一覧を出せるようにした。fetch 中はローディング表示。
async function onSaShowTrips() {
  const ms = S.currentMs;
  if (!ms) return;
  if (!Array.isArray(NORIRECO.mypage?.state?._mypageCache)) {
    renderTripListInSheet('loading', ms.name);
    try { await loadMypageTripsIfNeeded(); } catch (e) {}
  }
  const trips = getTripsAtStation(ms);  // v312: ms オブジェクトに統一
  renderTripListInSheet(trips, ms.name);
}

function renderTripListInSheet(trips, stationName) {
  const container = document.getElementById('sa-actions');
  if (!container) return;

  // v309: lazy fetch 中 (onSaShowTrips が読込開始した直後の遷移用)
  if (trips === 'loading') {
    container.innerHTML = `
      <div class="sa-section-label">📡 旅程を読み込み中…</div>
    `;
    return;
  }

  // _mypageCache 未初期化 (lazy fetch 失敗、未ログイン等)
  if (trips === null) {
    container.innerHTML = `
      <div class="sa-section-label">旅程を読み込めませんでした (ログイン状態を確認してください)</div>
      <button class="sa-btn sa-btn-back" onclick="onSaBackToMain()">← 戻る</button>
    `;
    return;
  }

  if (trips.length === 0) {
    container.innerHTML = `
      <div class="sa-section-label">この駅を含む旅程はまだありません</div>
      <button class="sa-btn sa-btn-back" onclick="onSaBackToMain()">← 戻る</button>
    `;
    return;
  }

  // tripCardHtml はマイページ側の export (13-mypage-common.js)。
  // 17 → 13 への直 import は ride-record の他の dep を引き込みたくないので
  // NORIRECO.mypage 名前空間 bridge 経由で参照する。
  const tcHtml = NORIRECO.mypage?.tripCardHtml;
  if (typeof tcHtml !== 'function') {
    container.innerHTML = `
      <div class="sa-section-label">マイページ未初期化です</div>
      <button class="sa-btn sa-btn-back" onclick="onSaBackToMain()">← 戻る</button>
    `;
    return;
  }

  // 新しい順 (recorded_at desc, fallback date desc)
  const sorted = [...trips].sort((a, b) =>
    (b.recorded_at || b.date || '').localeCompare(a.recorded_at || a.date || '')
  );
  const cards = sorted.map(tcHtml).join('');

  container.innerHTML = `
    <div class="sa-section-label">🚃 ${escapeHtml(stationName)} を含む旅程 (${trips.length}件)</div>
    <div class="sa-trip-list">${cards}</div>
    <button class="sa-btn sa-btn-back" onclick="onSaBackToMain()">← 戻る</button>
  `;
}

// ── window bridge ──────────────────────────────────────────────
window.closeStationActionSheet = closeStationActionSheet;
window.onSaShowCharacter = onSaShowCharacter;
window.onSaStartRecording = onSaStartRecording;
window.onSaOpenMemos = onSaOpenMemos;
window.onSaChangeColor = onSaChangeColor;
window.onSaPickColorLine = onSaPickColorLine;
window.onSaBackToMain = onSaBackToMain;
window.onSaShowTrips = onSaShowTrips;
// v283: 路線アクションシート用 onclick handler
window.onSlOpenMemos = onSlOpenMemos;
window.onSlChangeColor = onSlChangeColor;
window.onSlAddMemo = onSlAddMemo;
window.onSlBackToMain = onSlBackToMain;

NORIRECO.stationActions.open = openStationActionSheet;
// v283: 路線アクションシートの公開 API
NORIRECO.stationActions.openLine = openLineActionSheet;
