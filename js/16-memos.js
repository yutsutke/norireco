// ══════════════════════════════════════════════════════════════
// 駅メモ機能 (v250 で本格化)
// - 地図画面 memo-modal の Supabase CRUD (POST/PATCH/DELETE)
// - マイページ「📸 メモ」サブタブの一覧 + フィルタ + 編集/削除
//
// v90 頃に「📋 データを生成 → Claudeに貼り付け」用の textarea 生成だけだった
// genMemo() を破棄し、authBearerToken 付き REST + RLS (user_id=auth.uid()) で
// 本格的な CRUD に置き換え。
//
// 状態: NORIRECO.memos.state
//   - cache: 自分のメモ全件 (created_at DESC)
//   - editingId: null = 新規作成、string = 編集中の memo.id
//   - filter: { line_id, memo_type, mood }
//
// v284: 旧 memoMode (地図上クリックで最寄駅メモ作成) は撤去。駅・路線アクション
// シート (17-station-actions.js) の「📸 メモ」で代替されたため。
//
// 旧 08-rendering.js 内にあった openMemo / closeMemo / selChip / togTag は
// 本ファイルへ移動 (genMemo は廃止、toggleMemoMode は v284 で撤去)。
// ══════════════════════════════════════════════════════════════

import { authBearerToken, currentUserId } from './12-auth.js';
// v258: 写真 UI は共通モジュール (memo / trip 両用、1〜5枚対応)
// v267+: deletePhotoByUrl は memo 削除時の R2 cleanup でも使う
import { createPhotoArea, deletePhotoByUrl } from './18-photo-area.js';
// v263+: マイページ memo カード / 駅メモ一覧モーダル上で写真をドラッグ&ドロップ並び替え
import { enableDragSort } from './19-drag-sort.js';
// v317 (Phase 3-e): 駅名検索を id 解決層経由に
// v318: 都道府県トークン対応 (resolveStationQuery が {ids, names, ...} を返す)
import { resolveStationQuery } from './13-mypage-common.js';

window.NORIRECO = window.NORIRECO || {};
NORIRECO.memos = NORIRECO.memos || {
  state: {
    cache: [],
    editingId: null,
    filter: { line_id: 'all', memo_type: 'all', mood: 'all', station: '', car_model: '' },   // v360: car_model 検索
    // v251: 駅タップ → 駅メモ一覧モーダルの開いている駅コンテキスト
    // (「+ 新しいメモを残す」を押したときに memo-modal に渡すための保存場所)
    stationContext: null, // { station, lineId, lineName, lat, lon } | null
    // v258: モーダル内の写真 UI コントローラ (createPhotoArea 戻り値、null = 未生成)
    photoArea: null,
  },
};
const M = NORIRECO.memos.state;

// v325 (Phase 3): memo.station_id から駅名を逆引き。
// v331 (Phase 3): 他モジュール (17-station-actions) から共用するため export。
// v333 (Phase 3): memo.station 列 DROP 完遂 (v325 SQL Applied 2026-05-25) — name fallback 撤去。
export function getMemoStationName(memo) {
  if (!memo || !memo.station_id) return '';
  const ms = (NORIRECO.data?.MERGED_STATIONS || []).find(m => m.id === memo.station_id);
  return ms ? ms.name : '';
}

const MOOD_EMOJI = { '最高': '🤩', '良い': '😊', '普通': '😐', '微妙': '😕', '最悪': '😤' };
const TYPE_EMOJI = { '駅': '🚉', '車内': '🪟', '路線': '🚃', 'その他': '📍' };

function genMemoId() {
  return 'memo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]
  ));
}

function showToast(text, kind) {
  if (NORIRECO.mypage && typeof NORIRECO.mypage.showMypageToast === 'function') {
    NORIRECO.mypage.showMypageToast(text, kind);
  }
}

// ── Supabase CRUD ──────────────────────────────────────────────

export async function syncMemosFromSupabase() {
  const uid = currentUserId();
  if (!uid) {
    M.cache = [];
    try { localStorage.removeItem('norireco_memos'); } catch (e) {}
    return;
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/norireco_memos?user_id=eq.${uid}&select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${authBearerToken()}`,
        },
      }
    );
    if (res.ok) {
      M.cache = await res.json();
      try { localStorage.setItem('norireco_memos', JSON.stringify(M.cache)); } catch (e) {}
      console.log(`[Memos] sync 完了: ${M.cache.length} 件`);
    } else {
      const err = await res.text();
      console.warn('[Memos] sync 失敗:', err.slice(0, 200));
    }
  } catch (e) {
    console.warn('[Memos] sync エラー:', e.message);
  }
}

async function createMemoOnServer(memo) {
  const uid = currentUserId();
  if (!uid) throw new Error('ログインしてください');
  const payload = { ...memo, user_id: uid };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/norireco_memos`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${authBearerToken()}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`保存に失敗: ${err.slice(0, 200)}`);
  }
  const inserted = await res.json();
  return inserted[0];
}

async function updateMemoOnServer(id, patch) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/norireco_memos?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${authBearerToken()}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(patch),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`更新に失敗: ${err.slice(0, 200)}`);
  }
  const updated = await res.json();
  return updated[0];
}

async function deleteMemoOnServer(id) {
  // v267+: 削除前に photos[] を取って R2 並列削除の準備 (ベストエフォート、失敗してもログのみ)
  const memo = M.cache.find(m => m.id === id);
  const photosToDelete = (memo && Array.isArray(memo.photos)) ? memo.photos.filter(p => p && p.url) : [];

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/norireco_memos?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${authBearerToken()}`,
      },
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`削除に失敗: ${err.slice(0, 200)}`);
  }

  // v267+: memo 削除成功後に R2 オブジェクトも削除 (非同期 fire-and-forget)
  if (photosToDelete.length > 0) {
    Promise.all(photosToDelete.map(p => deletePhotoByUrl(p.url)))
      .catch(e => console.warn('[Memos] memo 写真の R2 削除失敗:', e));
  }

  return true;
}

// ── memo-modal ─────────────────────────────────────────────────

// 地図クリック起点 — clickInfo を立ててから呼ばれる「新規作成」モード
// opts (v283): { defaultMemoType, title, sub } を渡せる。路線アクションシートからの
// 「+ 新しいメモを残す」用 (memo_type='路線' で初期化、見出しを路線名にする)。
export function openMemo(opts) {
  const ci = NORIRECO.map.clickInfo || {};
  M.editingId = null;
  fillModal({
    title: opts?.title || `📸 ${ci.station?.n || ''} のメモ`,
    sub: opts?.sub || `${ci.line?.name || ''}  ·  ${ci.lat || ''}, ${ci.lon || ''}`,
    memo: {
      memo_type: opts?.defaultMemoType || '駅',
      mood: '良い',
      tags: [],
      comment: '',
      photos: [],
    },
  });
  document.getElementById('memo-modal').classList.add('open');
}

// マイページから「✏️ 編集」で呼ばれる
function openMemoForEdit(memoId) {
  const memo = M.cache.find(m => m.id === memoId);
  if (!memo) { alert('メモが見つかりません'); return; }
  M.editingId = memoId;
  fillModal({
    title: '✏️ メモを編集',
    sub: [memo.line_name, getMemoStationName(memo)].filter(Boolean).join('  ·  '),
    memo: memo,
  });
  document.getElementById('memo-modal').classList.add('open');
}

function fillModal({ title, sub, memo }) {
  document.getElementById('m-title').textContent = title;
  document.getElementById('m-sub').textContent = sub;
  document.getElementById('m-comment').value = memo.comment || '';
  // v360: 車両形式 (新規は空、編集は memo.car_model から復元)
  const carInp = document.getElementById('m-car-model');
  if (carInp) carInp.value = memo.car_model || '';
  // v361: cascade 初期化 — カテゴリ dropdown を populate + 「指定しない」から始める。
  //   memo.car_model があれば後で dropdown 一致 option を探して選択状態に復元するが、
  //   メモは train_category 列を持たないので「自由入力モード」を保つ方が予測可能 (input 側に値が残る)
  initMemoTrainCascade();

  // 写真エリアを再生成 (v258: 共通 PhotoArea を使用、最大 5 枚)
  if (M.photoArea) {
    try { M.photoArea.destroy(); } catch (e) {}
    M.photoArea = null;
  }
  const container = document.getElementById('m-photo-container');
  if (container) {
    M.photoArea = createPhotoArea({
      container,
      kind: 'memo',
      // memo_id は保存直前に確定するため getOwnerId は呼ばれず、
      // uploadAndGetPhotos に直接 ownerIdOverride を渡す方式
      getOwnerId: () => M.editingId,
      initialPhotos: Array.isArray(memo.photos) ? memo.photos : [],
      maxCount: 5,
    });
  }

  document.querySelectorAll('#type-row .chip').forEach(b => {
    b.classList.toggle('active', b.dataset.v === (memo.memo_type || '駅'));
  });
  document.querySelectorAll('#mood-row .chip').forEach(b => {
    b.classList.toggle('active', b.dataset.v === (memo.mood || '良い'));
  });
  document.querySelectorAll('.chip[data-tag]').forEach(b => {
    const on = Array.isArray(memo.tags) && memo.tags.includes(b.dataset.tag);
    b.classList.toggle('active', on);
    b.classList.toggle('tag-on', on);
  });

  const saveBtn = document.getElementById('m-save-btn');
  if (saveBtn) saveBtn.textContent = M.editingId ? '✏️ 更新' : '☁️ 保存';
  const deleteBtn = document.getElementById('m-delete-btn');
  if (deleteBtn) deleteBtn.style.display = M.editingId ? '' : 'none';
}

function readModal() {
  const memo_type = document.querySelector('#type-row .chip.active')?.dataset.v || '駅';
  const mood = document.querySelector('#mood-row .chip.active')?.dataset.v || '良い';
  const tags = [...document.querySelectorAll('.chip[data-tag].active')].map(b => b.dataset.tag);
  const comment = document.getElementById('m-comment').value.trim();
  // v360: 車両形式 (任意、空文字なら null として送信)
  const car_model = (document.getElementById('m-car-model')?.value || '').trim() || null;
  // photos は M.photo から saveMemoFromModal() 側で組み立てる
  return { memo_type, mood, tags, comment, car_model };
}

async function saveMemoFromModal() {
  if (!currentUserId()) { alert('ログインしてください'); return; }
  const btn = document.getElementById('m-save-btn');
  const isEdit = !!M.editingId;
  if (btn) { btn.disabled = true; btn.textContent = '保存中…'; }
  try {
    const fields = readModal();

    // memo_id を事前に確定 (新規時もアップロード前に決定)
    const memoId = isEdit ? M.editingId : genMemoId();

    // 写真エリアから photos[] を確定 (新規 blob は順次 R2 にアップロード)
    const photos = M.photoArea
      ? await M.photoArea.uploadAndGetPhotos(memoId)
      : [];

    let result;
    if (isEdit) {
      result = await updateMemoOnServer(memoId, { ...fields, photos });
      const idx = M.cache.findIndex(m => m.id === memoId);
      if (idx >= 0) M.cache[idx] = result;
    } else {
      const ci = NORIRECO.map.clickInfo || {};
      // v325 (Phase 3): station 列 (駅名) への並行書き込みを撤去、station_id のみ。
      //   既存メモの station 列は v325 SQL DROP で除去予定 (backfill 済みであれば安全)。
      const newMemo = {
        id: memoId,
        ...fields,
        photos,
        line_id: ci.line?.id || null,
        line_name: ci.line?.name || null,
        station_id: ci.station?.id || null,
        lat: ci.lat ? parseFloat(ci.lat) : null,
        lon: ci.lon ? parseFloat(ci.lon) : null,
      };
      result = await createMemoOnServer(newMemo);
      M.cache.unshift(result);
    }
    try { localStorage.setItem('norireco_memos', JSON.stringify(M.cache)); } catch (e) {}
    closeMemo();
    showToast(isEdit ? 'メモを更新しました' : 'メモを保存しました', 'success');
    rerenderMemosIfVisible();
  } catch (e) {
    alert(e.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = M.editingId ? '✏️ 更新' : '☁️ 保存';
    }
  }
}

async function deleteMemoFromModal() {
  if (!M.editingId) return;
  if (!confirm('このメモを削除しますか?')) return;
  try {
    await deleteMemoOnServer(M.editingId);
    M.cache = M.cache.filter(m => m.id !== M.editingId);
    try { localStorage.setItem('norireco_memos', JSON.stringify(M.cache)); } catch (e) {}
    closeMemo();
    showToast('メモを削除しました', 'success');
    rerenderMemosIfVisible();
  } catch (e) {
    alert(e.message);
  }
}

async function deleteMemoById(memoId) {
  if (!confirm('このメモを削除しますか?')) return;
  try {
    await deleteMemoOnServer(memoId);
    M.cache = M.cache.filter(m => m.id !== memoId);
    try { localStorage.setItem('norireco_memos', JSON.stringify(M.cache)); } catch (e) {}
    showToast('メモを削除しました', 'success');
    rerenderMemosIfVisible();
  } catch (e) {
    alert(e.message);
  }
}

function closeMemo() {
  document.getElementById('memo-modal').classList.remove('open');
  M.editingId = null;
  if (M.photoArea) {
    try { M.photoArea.destroy(); } catch (e) {}
    M.photoArea = null;
  }
}

function selChip(btn, rowId) {
  document.querySelectorAll(`#${rowId} .chip`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function togTag(btn) {
  btn.classList.toggle('tag-on');
  btn.classList.toggle('active', btn.classList.contains('tag-on'));
}

function rerenderMemosIfVisible() {
  const pane = document.getElementById('mp-sub-memos');
  if (pane && pane.style.display !== 'none') renderMpMemosSection();
  // v251: 駅メモ一覧モーダルが開いていれば、その駅のメモ部分も再描画
  rerenderStationMemoListIfVisible();
}

// ── マイページ「📸 メモ」サブタブ ─────────────────────────────

// v286.1: 駅名検索 input の IME 互換のため、フィルタバー固定 + 結果領域だけ更新する構造へ。
function renderMpMemosSection() {
  const sec = document.getElementById('mp-memo-section');
  if (!sec) return;
  sec.innerHTML = '';

  if (!currentUserId()) {
    sec.innerHTML = `
      <div class="mp-empty">
        <div class="mp-empty-ic">🔑</div>
        <div class="mp-empty-t">ログインしてください</div>
      </div>`;
    return;
  }

  if (M.cache.length === 0) {
    sec.innerHTML = `
      <div class="mp-empty">
        <div class="mp-empty-ic">📸</div>
        <div class="mp-empty-t">メモがまだありません</div>
        <div class="mp-empty-s">地図上の駅 / 路線をタップして「📸 メモ」から残せます</div>
      </div>`;
    return;
  }

  sec.appendChild(buildMemoFilterBar());

  const result = document.createElement('div');
  result.id = 'mp-memo-result';
  sec.appendChild(result);

  renderMpMemosResultOnly();
}

function renderMpMemosResultOnly() {
  const result = document.getElementById('mp-memo-result');
  if (!result) return;
  result.innerHTML = '';

  const filtered = applyMemoFilters(M.cache);

  const head = document.createElement('div');
  head.className = 'sec-lbl';
  head.innerHTML = `自分の駅メモ (${filtered.length} / ${M.cache.length} 件)`;
  result.appendChild(head);

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'mp-empty-s';
    empty.style.padding = '20px';
    empty.textContent = 'フィルタ条件に合致するメモがありません';
    result.appendChild(empty);
    return;
  }

  result.appendChild(buildMemoList(filtered));
  attachPhotoDragSortToMemoCards(result);
}

function buildMemoFilterBar() {
  const bar = document.createElement('div');
  bar.className = 'mp-filter-bar';

  // 路線フィルタ: 自分のメモに登場する line_id をユニーク抽出
  const seen = new Map();
  M.cache.forEach(m => {
    if (m.line_id && !seen.has(m.line_id)) seen.set(m.line_id, m.line_name || m.line_id);
  });
  const lineOpts = [...seen.entries()]
    .map(([id, name]) =>
      `<option value="${escapeHtml(id)}" ${M.filter.line_id === id ? 'selected' : ''}>${escapeHtml(name)}</option>`
    ).join('');

  bar.innerHTML = `
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">🚃 路線</label>
      <select class="mp-filter-sel" onchange="updateMemoFilter('line_id',this.value)">
        <option value="all" ${M.filter.line_id === 'all' ? 'selected' : ''}>すべて</option>
        ${lineOpts}
      </select>
    </div>
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">📍 種別</label>
      <select class="mp-filter-sel" onchange="updateMemoFilter('memo_type',this.value)">
        <option value="all" ${M.filter.memo_type === 'all' ? 'selected' : ''}>すべて</option>
        <option value="駅" ${M.filter.memo_type === '駅' ? 'selected' : ''}>🚉 駅</option>
        <option value="車内" ${M.filter.memo_type === '車内' ? 'selected' : ''}>🪟 車内</option>
        <option value="路線" ${M.filter.memo_type === '路線' ? 'selected' : ''}>🚃 路線</option>
        <option value="その他" ${M.filter.memo_type === 'その他' ? 'selected' : ''}>📍 その他</option>
      </select>
    </div>
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">😊 気分</label>
      <select class="mp-filter-sel" onchange="updateMemoFilter('mood',this.value)">
        <option value="all" ${M.filter.mood === 'all' ? 'selected' : ''}>すべて</option>
        <option value="最高" ${M.filter.mood === '最高' ? 'selected' : ''}>🤩 最高</option>
        <option value="良い" ${M.filter.mood === '良い' ? 'selected' : ''}>😊 良い</option>
        <option value="普通" ${M.filter.mood === '普通' ? 'selected' : ''}>😐 普通</option>
        <option value="微妙" ${M.filter.mood === '微妙' ? 'selected' : ''}>😕 微妙</option>
        <option value="最悪" ${M.filter.mood === '最悪' ? 'selected' : ''}>😤 最悪</option>
      </select>
    </div>
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">🚉 駅名</label>
      <input type="search" class="mp-filter-input" id="mp-memo-fil-station" placeholder="例: 八王子 / 八王子 東京" title="駅名のみ / 駅名 都道府県 (空白区切り、AND 検索)" value="${escapeHtml(M.filter.station || '')}" oninput="updateMemoFilter('station',this.value)">
    </div>
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">🚆 車両</label>
      <input type="search" class="mp-filter-input" id="mp-memo-fil-car" placeholder="例: E235 / キハ110" title="車両形式の部分一致 (大文字小文字不問)" value="${escapeHtml(M.filter.car_model || '')}" oninput="updateMemoFilter('car_model',this.value)">
    </div>
  `;
  return bar;
}

function applyMemoFilters(memos) {
  const q = (M.filter.station || '').trim();
  // v317 (Phase 3-e): 駅名検索を id 解決層経由に。
  // v318: 空白区切りで「駅名 都道府県」検索 (例: "八王子 東京")。
  // v320: pref モード時は id 厳密。fallback で混入する同名異所駅を排除。
  // v333 (Phase 3): memo.station 列 DROP 完遂で全 memo が station_id 入り。name fallback 撤去。
  const res = q ? resolveStationQuery(q) : null;
  return memos.filter(m => {
    if (M.filter.line_id !== 'all' && m.line_id !== M.filter.line_id) return false;
    if (M.filter.memo_type !== 'all' && m.memo_type !== M.filter.memo_type) return false;
    if (M.filter.mood !== 'all' && m.mood !== M.filter.mood) return false;
    if (res) {
      if (!m.station_id || !res.ids.has(m.station_id)) return false;
    }
    // v360: 車両形式 substring 検索 (大文字小文字不問)
    const cmq = (M.filter.car_model || '').trim();
    if (cmq) {
      if (!m.car_model || !m.car_model.toLowerCase().includes(cmq.toLowerCase())) return false;
    }
    return true;
  });
}

function updateMemoFilter(key, value) {
  M.filter[key] = value;
  // v286.1: フィルタバーは触らず、結果領域だけ更新 → input は DOM 残り続け IME 安全
  renderMpMemosResultOnly();
}

function buildMemoList(memos) {
  const wrap = document.createElement('div');
  wrap.className = 'mp-memo-list';
  wrap.innerHTML = memos.map(memoCardHtml).join('');
  return wrap;
}

// v359: 09-tabs-stats.js の路線詳細モーダルから流用するため export 化
export function memoCardHtml(memo) {
  const created = (memo.created_at || '').slice(0, 10);
  const tags = Array.isArray(memo.tags) ? memo.tags : [];
  const tagsHtml = tags.map(t => `<span class="mp-memo-tag">${escapeHtml(t)}</span>`).join('');
  const photos = (Array.isArray(memo.photos) ? memo.photos : []).filter(p => p && p.url);
  // v263+: マイページ memo カード上でドラッグ&ドロップ並び替え (renderMpMemosSection / openStationMemoList で D&D attach)
  const photoBit = photos.length > 0
    ? `<div class="mp-memo-photo" data-memo-id="${escapeHtml(memo.id)}">${photos.map((p, i) =>
        `<div class="mp-photo-cell"><a href="${escapeHtml(p.url)}" target="_blank" rel="noopener" draggable="false"><img class="mp-memo-thumb" src="${escapeHtml(p.url)}" loading="lazy" alt="メモの写真 ${i + 1}" draggable="false"></a></div>`
      ).join('')}</div>`
    : '';
  // v325 (Phase 3): station 列 DROP 後は station_id → MERGED_STATIONS で名前を逆引き
  const stationName = getMemoStationName(memo);
  const where = [
    stationName ? `🚉 ${escapeHtml(stationName)}` : '',
    memo.line_name ? `🚃 ${escapeHtml(memo.line_name)}` : '',
  ].filter(Boolean).join(' · ');
  const updatedNote = (memo.updated_at && memo.created_at && memo.updated_at !== memo.created_at)
    ? `<span class="mp-memo-edited" title="編集済み">✏️</span>` : '';
  return `
    <div class="mp-memo-card" data-id="${escapeHtml(memo.id)}">
      <div class="mp-memo-head">
        <span class="mp-memo-date">${created}</span>
        <span class="mp-memo-type">${TYPE_EMOJI[memo.memo_type] || ''} ${escapeHtml(memo.memo_type || '')}</span>
        <span class="mp-memo-mood">${MOOD_EMOJI[memo.mood] || ''}</span>
        ${updatedNote}
      </div>
      ${where ? `<div class="mp-memo-where">${where}</div>` : ''}
      ${memo.car_model ? `<div class="mp-memo-car" style="font-size:11px;color:var(--silver);margin-top:2px">🚆 <span style="font-family:'DM Mono',monospace">${escapeHtml(memo.car_model)}</span></div>` : ''}
      ${memo.comment ? `<div class="mp-memo-comment">${escapeHtml(memo.comment)}</div>` : ''}
      ${tagsHtml ? `<div class="mp-memo-tags">${tagsHtml}</div>` : ''}
      ${photoBit}
      <div class="mp-memo-actions">
        <button class="mp-act-btn edit-memo" onclick="openMemoForEdit('${escapeHtml(memo.id)}')">✏️ 編集</button>
        <button class="mp-act-btn delete" onclick="deleteMemoById('${escapeHtml(memo.id)}')">🗑 削除</button>
      </div>
    </div>`;
}

// ── 駅メモ一覧モーダル (v251: 駅タップから「その駅のメモ」を閲覧) ──────

// 駅マーカークリックから呼ばれる。args は station 情報を持つ。
// v315 (Phase 3-d): args.station_id があれば id 優先で filter (同名駅取り違え回避)。
// v333 (Phase 3): station 列 DROP 完遂で全 memo が station_id 入り。name fallback 撤去。
function openStationMemoList(args) {
  // args = { station, station_id, lineId, lineName, lat, lon }
  M.stationContext = {
    station: args.station,
    station_id: args.station_id || null,
    lineId: args.lineId || null,
    lineName: args.lineName || null,
    lat: typeof args.lat === 'number' ? args.lat : (parseFloat(args.lat) || null),
    lon: typeof args.lon === 'number' ? args.lon : (parseFloat(args.lon) || null),
  };
  // v333: id 一致のみ (station 列 DROP 済、name fallback は無効化)
  const memos = args.station_id
    ? M.cache.filter(m => m.station_id === args.station_id)
    : [];

  document.getElementById('sm-title').textContent =
    `📸 ${args.station} のメモ (${memos.length} 件)`;
  document.getElementById('sm-sub').textContent = args.lineName || '';

  const list = document.getElementById('sm-list');
  if (memos.length === 0) {
    list.innerHTML = `
      <div class="mp-empty-s" style="padding:18px 0;text-align:center">
        この駅のメモはまだありません
      </div>`;
  } else {
    list.innerHTML = `<div class="mp-memo-list">${memos.map(memoCardHtml).join('')}</div>`;
    // v263+: 駅メモ一覧モーダル内のカードに写真の D&D を attach
    attachPhotoDragSortToMemoCards(list);
  }

  document.getElementById('station-memo-modal').classList.add('open');
}

function closeStationMemoModal() {
  document.getElementById('station-memo-modal').classList.remove('open');
  M.stationContext = null;
}

// 「+ 新しいメモを残す」: station-memo-modal を閉じて memo-modal を新規モードで開く
function addNewMemoForStation() {
  const ctx = M.stationContext;
  if (!ctx) return;
  // memo-modal の openMemo() は NORIRECO.map.clickInfo を読むので組み立て直す
  // v315 (Phase 3-d): station.id を伝播し、保存時に memo.station_id に入る
  NORIRECO.map.clickInfo = {
    line: ctx.lineId ? { id: ctx.lineId, name: ctx.lineName } : { id: null, name: ctx.lineName || '' },
    station: { n: ctx.station, id: ctx.station_id || null, lat: ctx.lat, lon: ctx.lon },
    lat: ctx.lat != null ? ctx.lat.toFixed(5) : '',
    lon: ctx.lon != null ? ctx.lon.toFixed(5) : '',
  };
  closeStationMemoModal();
  openMemo();
}

// station-memo-modal が開いている間にメモを編集/削除/追加したら、その駅のメモ一覧を再描画
function rerenderStationMemoListIfVisible() {
  const pane = document.getElementById('station-memo-modal');
  if (pane && pane.classList.contains('open') && M.stationContext) {
    openStationMemoList(M.stationContext);
  }
}

// ── ログアウト時のクリア ────────────────────────────────────────

export function clearLocalMemos() {
  M.cache = [];
  M.editingId = null;
  try { localStorage.removeItem('norireco_memos'); } catch (e) {}
}

// ── window bridge ──────────────────────────────────────────────
// HTML onclick (memo-modal / マイページ memo カード) からの呼出と、
// 他モジュールからの NORIRECO.memos.* アクセスをサポート。

// v263+: マイページ memo カード / 駅メモ一覧モーダル上で写真をドラッグ&ドロップ並び替え
async function reorderMemoPhotos(memoId, fromIdx, toIdx) {
  const memo = M.cache.find(m => m.id === memoId);
  if (!memo) return;
  const photos = Array.isArray(memo.photos) ? [...memo.photos] : [];
  if (fromIdx < 0 || fromIdx >= photos.length || toIdx < 0 || toIdx >= photos.length || fromIdx === toIdx) return;
  const [moved] = photos.splice(fromIdx, 1);
  photos.splice(toIdx, 0, moved);

  // Supabase 同期 (失敗時は alert なし、console.warn のみ。再描画はローカル状態で進める)
  try {
    const updated = await updateMemoOnServer(memoId, { photos });
    const cacheIdx = M.cache.findIndex(m => m.id === memoId);
    if (cacheIdx >= 0) M.cache[cacheIdx] = updated;
  } catch (e) {
    console.warn('[Memos] 写真並び替え失敗:', e.message);
    memo.photos = photos; // ローカルだけでも反映
  }

  // localStorage 同期
  try { localStorage.setItem('norireco_memos', JSON.stringify(M.cache)); } catch (e) {}

  rerenderMemosIfVisible();
}

// renderMpMemosSection / openStationMemoList 末尾から呼ばれる: 全 .mp-memo-photo に D&D を attach
function attachPhotoDragSortToMemoCards(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll('.mp-memo-photo').forEach((photosEl) => {
    const memoId = photosEl.dataset.memoId;
    if (!memoId) return;
    enableDragSort(photosEl, {
      itemSelector: '.mp-photo-cell',
      onReorder: (oldIdx, newIdx) => reorderMemoPhotos(memoId, oldIdx, newIdx),
    });
  });
}

// ════════════════════════════════════════════════════════════════
// v361: メモモーダルの車両形式 cascade (記録モーダル v352 と同じ動線)
// ════════════════════════════════════════════════════════════════

// 編集中なら memo.line_id、新規なら clickInfo.line.id を返す。普通カテゴリの sl 引きに使う
function getMemoCurrentLineId() {
  if (M.editingId) {
    const memo = M.cache.find(m => m.id === M.editingId);
    return memo?.line_id || null;
  }
  return (NORIRECO.map?.clickInfo?.line?.id) || null;
}

function initMemoTrainCascade() {
  // カテゴリ dropdown を populate (記録モーダル resetTrainSelector と同じ、普通先頭 sort)
  const catSel = document.getElementById('m-train-category');
  if (!catSel) return;
  let catHtml = '<option value="">指定しない</option>';
  const cats = (NORIRECO.trains && NORIRECO.trains.TRAIN_CATEGORIES) || {};
  const catEntries = Object.entries(cats).sort((a, b) => {
    if (a[0] === 'local') return -1;
    if (b[0] === 'local') return 1;
    return 0;
  });
  for (const [k, v] of catEntries) {
    catHtml += `<option value="${k}">${v.icon || ''} ${v.label || k}</option>`;
  }
  catSel.innerHTML = catHtml;
  catSel.value = '';
  // 各サブ select を初期化
  const trainSel = document.getElementById('m-train-id');
  if (trainSel) { trainSel.innerHTML = '<option value="">列車を選ぶ...</option>'; trainSel.style.display = 'none'; }
  const trainCustom = document.getElementById('m-train-name-custom');
  if (trainCustom) { trainCustom.value = ''; trainCustom.style.display = 'none'; }
  const carSel = document.getElementById('m-car-model-select');
  if (carSel) { carSel.innerHTML = '<option value="">車両形式を選ぶ (任意)...</option>'; carSel.style.display = 'none'; }
  const slBlock = document.getElementById('m-sl-vehicle-block');
  if (slBlock) slBlock.style.display = 'none';
  const cascade = document.getElementById('m-train-cascade');
  if (cascade) cascade.style.display = 'none';
}

function onMemoTrainCategoryChange() {
  const cat = document.getElementById('m-train-category')?.value || '';
  const slBlock = document.getElementById('m-sl-vehicle-block');
  const cascade = document.getElementById('m-train-cascade');
  const trainSel = document.getElementById('m-train-id');
  const trainCustom = document.getElementById('m-train-name-custom');
  const carSel = document.getElementById('m-car-model-select');
  const carInp = document.getElementById('m-car-model');
  // 一旦すべてリセット (車両形式 input value は維持、ユーザーが手入力した値を消さない)
  if (slBlock) slBlock.style.display = 'none';
  if (cascade) cascade.style.display = 'none';
  if (trainSel) { trainSel.style.display = 'none'; }
  if (trainCustom) { trainCustom.style.display = 'none'; trainCustom.value = ''; }
  if (carSel) { carSel.style.display = 'none'; }
  if (cat === '') return;
  if (cat === 'local') {
    if (slBlock) slBlock.style.display = 'block';
    populateMemoSlVehiclePicker();
    return;
  }
  // 特急など: cascade 表示 + 列車 dropdown populate
  if (cascade) cascade.style.display = 'block';
  populateMemoTrainDropdown(cat);
}
window.onMemoTrainCategoryChange = onMemoTrainCategoryChange;

// 普通カテゴリ: memo.line_id から bySlId 引いて dropdown 構築
function populateMemoSlVehiclePicker() {
  const selectEl = document.getElementById('m-sl-vehicle-select');
  const emptyEl = document.getElementById('m-sl-vehicle-empty');
  if (!selectEl) return;
  const lid = getMemoCurrentLineId();
  const bySlId = NORIRECO.serviceLineVehicles?.bySlId || {};
  const vehicles = lid ? ((bySlId[lid] || []).slice().sort((a, b) => {
    const order = { '導入予定': 0, '導入': 1, '現役主力': 2, '譲受': 3, '組織再編': 4, '譲渡': 5, '引退': 6 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  })) : [];
  let html = '<option value="">車両形式を選ぶ (任意)...</option>';
  for (const v of vehicles) {
    const tag = v.status === '導入予定' ? ' ★新' :
                v.status === '導入'     ? ' 🆕' :
                v.status === '引退'     ? ' (引退)' :
                v.status === '譲受'     ? ' (譲受)' :
                v.status === '譲渡'     ? ' (譲渡)' : '';
    html += `<option value="${v.vehicle.replace(/"/g, '&quot;')}">${v.vehicle}${tag}</option>`;
  }
  if (vehicles.length > 0) html += '<option value="" disabled>──────</option>';
  html += '<option value="__custom__">✏️ 別形式を入力...</option>';
  selectEl.innerHTML = html;
  if (emptyEl) emptyEl.style.display = (vehicles.length === 0) ? 'block' : 'none';
  // 既存 car_model 値を dropdown 一致で復元 (なければ '__custom__' = text input そのまま)
  const carInp = document.getElementById('m-car-model');
  const currentVal = carInp?.value?.trim() || '';
  if (currentVal && vehicles.some(v => v.vehicle === currentVal)) {
    selectEl.value = currentVal;
  } else if (currentVal) {
    selectEl.value = '__custom__';
  } else {
    selectEl.value = '';
  }
}

function onMemoSlVehicleChange() {
  const selectEl = document.getElementById('m-sl-vehicle-select');
  const carInp = document.getElementById('m-car-model');
  if (!selectEl || !carInp) return;
  const v = selectEl.value;
  if (v === '__custom__') {
    carInp.focus();   // 自由入力にフォーカス
    // value は維持 (ユーザーが手入力した内容を消さない)
  } else {
    carInp.value = v || '';
  }
}
window.onMemoSlVehicleChange = onMemoSlVehicleChange;

// 特急など: TRAINS の category 別 dropdown
function populateMemoTrainDropdown(cat) {
  const trainSel = document.getElementById('m-train-id');
  if (!trainSel) return;
  const trains = ((NORIRECO.trains && NORIRECO.trains.TRAINS) || [])
    .filter(t => t.category === cat)
    .sort((a, b) => {
      if (!!a.discontinued !== !!b.discontinued) return a.discontinued ? 1 : -1;
      return (a.name || '').localeCompare(b.name || '', 'ja');
    });
  let html = '<option value="">列車を選ぶ...</option>';
  for (const t of trains) {
    const disc = t.discontinued ? ' (廃止)' : '';
    const rarity = t.rarity === 'legendary' ? ' ⭐' : (t.rarity === 'rare' ? ' ✨' : '');
    html += `<option value="${t.id}">${t.name}${rarity}${disc}</option>`;
  }
  html += '<option value="__custom__">📝 リストにない (手入力)</option>';
  trainSel.innerHTML = html;
  trainSel.style.display = 'block';
}

function onMemoTrainIdChange() {
  const trainSel = document.getElementById('m-train-id');
  const trainCustom = document.getElementById('m-train-name-custom');
  const carSel = document.getElementById('m-car-model-select');
  const carInp = document.getElementById('m-car-model');
  if (!trainSel) return;
  const v = trainSel.value;
  if (carSel) { carSel.style.display = 'none'; carSel.innerHTML = '<option value="">車両形式を選ぶ (任意)...</option>'; }
  if (v === '__custom__') {
    if (trainCustom) { trainCustom.style.display = 'block'; trainCustom.value = ''; trainCustom.focus(); }
    if (carInp) carInp.focus();   // 車両形式は自由入力
    return;
  }
  if (trainCustom) { trainCustom.style.display = 'none'; trainCustom.value = ''; }
  if (!v) return;
  // 選ばれた列車の car_models を dropdown に populate
  const train = ((NORIRECO.trains && NORIRECO.trains.TRAINS) || []).find(t => t.id === v);
  const carModels = (train && Array.isArray(train.car_models)) ? train.car_models : [];
  if (carModels.length === 0) return;
  let html = '<option value="">車両形式を選ぶ (任意)...</option>';
  for (const cm of carModels) html += `<option value="${cm.replace(/"/g, '&quot;')}">${cm}</option>`;
  html += '<option value="" disabled>──────</option>';
  html += '<option value="__custom__">✏️ 別形式を入力...</option>';
  if (carSel) { carSel.innerHTML = html; carSel.style.display = 'block'; }
  // 既存 car_model 値を dropdown 一致で復元
  const currentVal = carInp?.value?.trim() || '';
  if (currentVal && carSel) {
    if (carModels.includes(currentVal)) carSel.value = currentVal;
    else carSel.value = '__custom__';
  }
}
window.onMemoTrainIdChange = onMemoTrainIdChange;

function onMemoCarModelSelectChange() {
  const carSel = document.getElementById('m-car-model-select');
  const carInp = document.getElementById('m-car-model');
  if (!carSel || !carInp) return;
  const v = carSel.value;
  if (v === '__custom__') {
    carInp.focus();
  } else {
    carInp.value = v || '';
  }
}
window.onMemoCarModelSelectChange = onMemoCarModelSelectChange;

function onMemoTrainCustomInput() {
  // 列車名そのものはメモに保存しないが、UX 上 input は表示し続ける。
  // car_model 側 (#m-car-model) はユーザーが別途記入する想定
}
window.onMemoTrainCustomInput = onMemoTrainCustomInput;

window.closeMemo = closeMemo;
window.selChip = selChip;
window.togTag = togTag;
window.saveMemoFromModal = saveMemoFromModal;
window.deleteMemoFromModal = deleteMemoFromModal;
window.openMemoForEdit = openMemoForEdit;
window.deleteMemoById = deleteMemoById;
window.updateMemoFilter = updateMemoFilter;
// v251: 駅メモ一覧モーダル
window.closeStationMemoModal = closeStationMemoModal;
window.addNewMemoForStation = addNewMemoForStation;

NORIRECO.memos.sync = syncMemosFromSupabase;
NORIRECO.memos.clear = clearLocalMemos;
NORIRECO.memos.renderMpMemosSection = renderMpMemosSection;
// v251: 08-rendering の station マーカー click から呼ぶための公開 API
NORIRECO.memos.openStationMemoList = openStationMemoList;
// v315 (Phase 3-d): ms オブジェクト引数で id 比較。
// v333 (Phase 3): station 列 DROP 完遂で全 memo が station_id 入り。name fallback / string 引数を撤去。
//   呼び出し側は ms オブジェクト ({id, name, ...}) を渡すこと。
NORIRECO.memos.hasMemosForStation = (ms) => {
  if (!ms || !ms.id) return false;
  return M.cache.some(m => m.station_id === ms.id);
};

// v325 (Phase 3): 「この駅のメモは何件か」を id で集計 (17-station-actions の memoCount 用)。
// v333 (Phase 3): name fallback 撤去 (DROP 完遂)。
NORIRECO.memos.countMemosForStation = (ms) => {
  if (!ms || !ms.id) return 0;
  return M.cache.filter(m => m.station_id === ms.id).length;
};

// v333 (Phase 3): norirecoBackfillMemoStationIds は撤去。
//   v325 SQL Applied 2026-05-25 で station 列 DROP 済、もう backfill する元データがない。
//   過去のヘルパー全文は git log 16-memos.js (v325..v332) を参照。

// マイページ統合用 (13-mypage-common.applyMpSection から呼ばれる)
NORIRECO.mypage = NORIRECO.mypage || {};
NORIRECO.mypage.renderMpMemosSection = renderMpMemosSection;
