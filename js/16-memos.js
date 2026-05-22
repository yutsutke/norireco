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
// memoMode (地図クリックで openMemo するかどうか) は backward compat のため
// 既存の NORIRECO.map.memoMode を引き続き使う (07-record-mode.js が bare 参照)。
//
// 旧 08-rendering.js 内にあった openMemo / toggleMemoMode / closeMemo /
// selChip / togTag は本ファイルへ移動 (genMemo は廃止)。
// ══════════════════════════════════════════════════════════════

import { authBearerToken, currentUserId } from './12-auth.js';

// v256: R2/Workers 経由で memo 写真をアップロード
//   - api.norireco.app/upload/memo-photo に Supabase JWT 付きで POST
//   - 返ってきた presigned URL に直接 PUT
//   - photos jsonb は [{url, w, h, bytes, content_type}] 形式
const NORIRECO_API_BASE = 'https://api.norireco.app';
const PHOTO_MAX_LONG_SIDE = 1200;   // 圧縮後の長辺 px
const PHOTO_WEBP_QUALITY = 0.82;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;       // Worker 側上限と一致
const PHOTO_ORIGINAL_MAX_BYTES = 20 * 1024 * 1024; // 圧縮前ファイルの上限

window.NORIRECO = window.NORIRECO || {};
NORIRECO.memos = NORIRECO.memos || {
  state: {
    cache: [],
    editingId: null,
    filter: { line_id: 'all', memo_type: 'all', mood: 'all' },
    // v251: 駅タップ → 駅メモ一覧モーダルの開いている駅コンテキスト
    // (「+ 新しいメモを残す」を押したときに memo-modal に渡すための保存場所)
    stationContext: null, // { station, lineId, lineName, lat, lon } | null
    // v256: モーダル内の写真 UI 状態
    //   state: 'none' (写真なし) / 'existing' (既存 photos[0] を保持) / 'new' (新規圧縮済 blob を保存待ち)
    photo: { state: 'none', blob: null, meta: null, previewUrl: null, existingPhotos: null },
  },
};
const M = NORIRECO.memos.state;

// memoMode は NORIRECO.map.memoMode に置く (既存の 07/08 bare 参照と互換)
NORIRECO.map = NORIRECO.map || {};
if (typeof NORIRECO.map.memoMode === 'undefined') NORIRECO.map.memoMode = false;

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

// ── 写真アップロード (v256: R2 + Workers) ─────────────────────

// Canvas で長辺 PHOTO_MAX_LONG_SIDE px に縮小して WebP 化
async function compressImageToWebP(file) {
  const bitmap = await createImageBitmap(file);
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const ratio = longest > PHOTO_MAX_LONG_SIDE ? PHOTO_MAX_LONG_SIDE / longest : 1;
    const w = Math.round(bitmap.width * ratio);
    const h = Math.round(bitmap.height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve({ blob, w, h }) : reject(new Error('canvas.toBlob が null を返した')),
        'image/webp',
        PHOTO_WEBP_QUALITY
      );
    });
  } finally {
    bitmap.close?.();
  }
}

// Worker から presigned PUT URL を取得 → R2 へ直接アップロード → 公開 URL を返す
async function uploadPhotoForMemo(memoId, blob, meta) {
  const contentType = blob.type || 'image/webp';
  const sizeBytes = blob.size;

  // 1. Worker に presigned URL を要求
  const presignRes = await fetch(`${NORIRECO_API_BASE}/upload/memo-photo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authBearerToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      memo_id: memoId,
      content_type: contentType,
      size_bytes: sizeBytes,
      ext: 'webp',
    }),
  });
  if (!presignRes.ok) {
    const err = await presignRes.text();
    throw new Error(`presign 失敗 (${presignRes.status}): ${err.slice(0, 200)}`);
  }
  const { upload_url, public_url } = await presignRes.json();

  // 2. presigned URL に直接 PUT
  const putRes = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`R2 アップロード失敗 (${putRes.status}): ${err.slice(0, 200)}`);
  }

  return {
    url: public_url,
    w: meta.w,
    h: meta.h,
    bytes: sizeBytes,
    content_type: contentType,
  };
}

// ── 写真 UI (memo-modal 内) ───────────────────────────────────

function renderPhotoUI() {
  const p = M.photo;
  const btn = document.getElementById('m-photo-btn');
  const preview = document.getElementById('m-photo-preview');
  const img = document.getElementById('m-photo-img');
  const status = document.getElementById('m-photo-status');
  if (!btn || !preview || !img) return;
  if (p.state === 'none') {
    preview.style.display = 'none';
    btn.style.display = '';
    if (status) status.textContent = '';
  } else {
    preview.style.display = '';
    btn.style.display = 'none';
    img.src = p.previewUrl || '';
    if (status) {
      if (p.state === 'new') {
        const kb = Math.round((p.blob?.size || 0) / 1024);
        status.textContent = `新規 ${p.meta.w}×${p.meta.h} / ${kb} KB (保存時にアップロード)`;
      } else {
        status.textContent = '既存の写真';
      }
    }
  }
}

function revokePhotoPreview() {
  if (M.photo?.previewUrl && M.photo.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(M.photo.previewUrl);
  }
}

async function onPhotoFileSelected(file) {
  if (!/^image\/(jpe?g|png|webp)$/i.test(file.type)) {
    alert('JPEG / PNG / WebP のみ対応しています');
    return;
  }
  if (file.size > PHOTO_ORIGINAL_MAX_BYTES) {
    alert(`元ファイルが大きすぎます (上限 ${Math.round(PHOTO_ORIGINAL_MAX_BYTES / 1024 / 1024)}MB)`);
    return;
  }
  const statusEl = document.getElementById('m-photo-status');
  if (statusEl) statusEl.textContent = '圧縮中…';
  try {
    const { blob, w, h } = await compressImageToWebP(file);
    if (blob.size > PHOTO_MAX_BYTES) {
      alert(`圧縮後でも上限超え: ${Math.round(blob.size / 1024)} KB (上限 ${Math.round(PHOTO_MAX_BYTES / 1024)} KB)`);
      if (statusEl) statusEl.textContent = '';
      return;
    }
    revokePhotoPreview();
    M.photo = {
      state: 'new',
      blob,
      meta: { w, h },
      previewUrl: URL.createObjectURL(blob),
      existingPhotos: M.photo?.existingPhotos || null,
    };
    renderPhotoUI();
  } catch (e) {
    alert('写真の処理に失敗: ' + e.message);
    if (statusEl) statusEl.textContent = '';
  }
}

function clearPhotoInModal() {
  revokePhotoPreview();
  M.photo = {
    state: 'none',
    blob: null,
    meta: null,
    previewUrl: null,
    existingPhotos: M.photo?.existingPhotos || null,
  };
  renderPhotoUI();
}

// file input の change ハンドラを初回 open 時に 1 度だけ wire する
function ensurePhotoInputWired() {
  const input = document.getElementById('m-photo-file');
  if (!input || input.dataset.wired) return;
  input.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) onPhotoFileSelected(file);
    e.target.value = ''; // 同じファイルの再選択を許可
  });
  input.dataset.wired = '1';
}

async function deleteMemoOnServer(id) {
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
  return true;
}

// ── memo-modal ─────────────────────────────────────────────────

export function toggleMemoMode() {
  NORIRECO.map.memoMode = !NORIRECO.map.memoMode;
  const btn = document.getElementById('memo-btn');
  if (btn) btn.classList.toggle('on', NORIRECO.map.memoMode);
  if (NORIRECO.map.instance) {
    NORIRECO.map.instance.getContainer().style.cursor = NORIRECO.map.memoMode ? 'crosshair' : '';
  }
}

// 地図クリック起点 — clickInfo を立ててから呼ばれる「新規作成」モード
export function openMemo() {
  const ci = NORIRECO.map.clickInfo || {};
  M.editingId = null;
  fillModal({
    title: `📸 ${ci.station?.n || ''} のメモ`,
    sub: `${ci.line?.name || ''}  ·  ${ci.lat || ''}, ${ci.lon || ''}`,
    memo: {
      memo_type: '駅',
      mood: '良い',
      tags: [],
      comment: '',
      photos: [],
    },
  });
  document.getElementById('memo-modal').classList.add('open');
  ensurePhotoInputWired();
}

// マイページから「✏️ 編集」で呼ばれる
function openMemoForEdit(memoId) {
  const memo = M.cache.find(m => m.id === memoId);
  if (!memo) { alert('メモが見つかりません'); return; }
  M.editingId = memoId;
  fillModal({
    title: '✏️ メモを編集',
    sub: [memo.line_name, memo.station].filter(Boolean).join('  ·  '),
    memo: memo,
  });
  document.getElementById('memo-modal').classList.add('open');
  ensurePhotoInputWired();
}

function fillModal({ title, sub, memo }) {
  document.getElementById('m-title').textContent = title;
  document.getElementById('m-sub').textContent = sub;
  document.getElementById('m-comment').value = memo.comment || '';

  // 写真状態を初期化 (v256: file input 方式)
  revokePhotoPreview();
  const existing = Array.isArray(memo.photos) ? memo.photos : [];
  if (existing.length > 0 && existing[0].url) {
    M.photo = {
      state: 'existing',
      blob: null,
      meta: null,
      previewUrl: existing[0].url,
      existingPhotos: existing,
    };
  } else {
    M.photo = { state: 'none', blob: null, meta: null, previewUrl: null, existingPhotos: [] };
  }
  renderPhotoUI();

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
  // photos は M.photo から saveMemoFromModal() 側で組み立てる
  return { memo_type, mood, tags, comment };
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

    // photos の解決
    let photos;
    const p = M.photo;
    if (p?.state === 'new') {
      const statusEl = document.getElementById('m-photo-status');
      if (statusEl) statusEl.textContent = 'アップロード中…';
      const uploaded = await uploadPhotoForMemo(memoId, p.blob, p.meta);
      photos = [uploaded];
    } else if (p?.state === 'existing') {
      photos = p.existingPhotos || [];
    } else {
      photos = [];
    }

    let result;
    if (isEdit) {
      result = await updateMemoOnServer(memoId, { ...fields, photos });
      const idx = M.cache.findIndex(m => m.id === memoId);
      if (idx >= 0) M.cache[idx] = result;
    } else {
      const ci = NORIRECO.map.clickInfo || {};
      const newMemo = {
        id: memoId,
        ...fields,
        photos,
        line_id: ci.line?.id || null,
        line_name: ci.line?.name || null,
        station: ci.station?.n || null,
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
  revokePhotoPreview();
  M.photo = { state: 'none', blob: null, meta: null, previewUrl: null, existingPhotos: null };
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
        <div class="mp-empty-s">地図画面の右下「📸」を押してから駅をタップすると、メモを残せます</div>
      </div>`;
    return;
  }

  sec.appendChild(buildMemoFilterBar());

  const filtered = applyMemoFilters(M.cache);

  const head = document.createElement('div');
  head.className = 'sec-lbl';
  head.innerHTML = `自分の駅メモ (${filtered.length} / ${M.cache.length} 件)`;
  sec.appendChild(head);

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'mp-empty-s';
    empty.style.padding = '20px';
    empty.textContent = 'フィルタ条件に合致するメモがありません';
    sec.appendChild(empty);
    return;
  }

  sec.appendChild(buildMemoList(filtered));
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
  `;
  return bar;
}

function applyMemoFilters(memos) {
  return memos.filter(m => {
    if (M.filter.line_id !== 'all' && m.line_id !== M.filter.line_id) return false;
    if (M.filter.memo_type !== 'all' && m.memo_type !== M.filter.memo_type) return false;
    if (M.filter.mood !== 'all' && m.mood !== M.filter.mood) return false;
    return true;
  });
}

function updateMemoFilter(key, value) {
  M.filter[key] = value;
  renderMpMemosSection();
}

function buildMemoList(memos) {
  const wrap = document.createElement('div');
  wrap.className = 'mp-memo-list';
  wrap.innerHTML = memos.map(memoCardHtml).join('');
  return wrap;
}

function memoCardHtml(memo) {
  const created = (memo.created_at || '').slice(0, 10);
  const tags = Array.isArray(memo.tags) ? memo.tags : [];
  const tagsHtml = tags.map(t => `<span class="mp-memo-tag">${escapeHtml(t)}</span>`).join('');
  const photos = Array.isArray(memo.photos) ? memo.photos : [];
  const photoBit = (photos[0] && photos[0].url)
    ? `<div class="mp-memo-photo"><a href="${escapeHtml(photos[0].url)}" target="_blank" rel="noopener"><img class="mp-memo-thumb" src="${escapeHtml(photos[0].url)}" loading="lazy" alt="メモの写真"></a></div>`
    : '';
  const where = [
    memo.station ? `🚉 ${escapeHtml(memo.station)}` : '',
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
function openStationMemoList(args) {
  // args = { station, lineId, lineName, lat, lon }
  M.stationContext = {
    station: args.station,
    lineId: args.lineId || null,
    lineName: args.lineName || null,
    lat: typeof args.lat === 'number' ? args.lat : (parseFloat(args.lat) || null),
    lon: typeof args.lon === 'number' ? args.lon : (parseFloat(args.lon) || null),
  };
  const memos = M.cache.filter(m => m.station === args.station);

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
  NORIRECO.map.clickInfo = {
    line: ctx.lineId ? { id: ctx.lineId, name: ctx.lineName } : { id: null, name: ctx.lineName || '' },
    station: { n: ctx.station, lat: ctx.lat, lon: ctx.lon },
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

window.toggleMemoMode = toggleMemoMode;
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
// v256: memo-modal の写真 UI (HTML onclick から呼ぶ)
window.clearPhotoInModal = clearPhotoInModal;

NORIRECO.memos.sync = syncMemosFromSupabase;
NORIRECO.memos.clear = clearLocalMemos;
NORIRECO.memos.renderMpMemosSection = renderMpMemosSection;
// v251: 08-rendering の station マーカー click から呼ぶための公開 API
NORIRECO.memos.openStationMemoList = openStationMemoList;
NORIRECO.memos.hasMemosForStation = (stationName) =>
  M.cache.some(m => m.station === stationName);

// マイページ統合用 (13-mypage-common.applyMpSection から呼ばれる)
NORIRECO.mypage = NORIRECO.mypage || {};
NORIRECO.mypage.renderMpMemosSection = renderMpMemosSection;
