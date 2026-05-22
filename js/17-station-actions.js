// ══════════════════════════════════════════════════════════════
// 駅アクションシート (v253)
// 通常モードで駅マーカーをタップしたときに開くシート型モーダル。
//
// ボタン構成 (動的):
//   🎭 キャラ名 を見る        (キャラ獲得済 or 未獲得 locked がある駅のみ)
//   📝 ここから手動記録を始める (常時)
//   📸 メモ (N件)              (常時、件数バッジ)
//   🎨 系統色を変更             (乗り入れ系統が 1 つ以上ある駅のみ)
//   閉じる
//
// 乗り入れ系統が複数あって「🎨 色変更」を押した場合は、シート内が
// 「どの系統の色を変更?」の系統選択リストに差し替わる。
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

window.NORIRECO = window.NORIRECO || {};
NORIRECO.stationActions = NORIRECO.stationActions || {
  state: {
    currentMs: null,     // 開いてる駅 (merged_stations の ms オブジェクト)
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
function pickCharacterForStation(stationName) {
  const list = NORIRECO.data?.stationCharMap?.get(stationName) || [];
  if (list.length === 0) return { character: null, locked: false };

  // 1. 獲得済みを優先
  const owned = list.find(c => isCharacterOwned(c.meta?.id));
  if (owned) return { character: owned, locked: false };

  // 2/3. 未獲得 (期間内も期間外も同じ「未獲得」扱いで openCharModal の locked 表示に任せる)
  return { character: list[0], locked: true };
}

// 駅マーカークリックから呼ばれるエントリポイント
export function openStationActionSheet(ms, options) {
  // options = { character, characterLocked }  // 後方互換のため受け付けるが、
  // options が無ければ自前で判定する (charModeOn=false でもキャラを露出させる v253.1 修正)
  S.currentMs = ms;
  if (options && options.character !== undefined) {
    S.currentChar = options.character;
    S.currentCharLocked = !!options.characterLocked;
  } else {
    const picked = pickCharacterForStation(ms.name);
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
  S.currentChar = null;
  S.colorPickLines = null;
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

// ── window bridge ──────────────────────────────────────────────
window.closeStationActionSheet = closeStationActionSheet;
window.onSaShowCharacter = onSaShowCharacter;
window.onSaStartRecording = onSaStartRecording;
window.onSaOpenMemos = onSaOpenMemos;
window.onSaChangeColor = onSaChangeColor;
window.onSaPickColorLine = onSaPickColorLine;
window.onSaBackToMain = onSaBackToMain;

NORIRECO.stationActions.open = openStationActionSheet;
