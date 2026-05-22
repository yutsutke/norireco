// ══════════════════════════════════════════════════════════════
// 写真エリア共通コンポーネント (v258)
//
// 用途: memo / trip 両方の写真添付 UI を 1 つの module で扱う
//   - 1〜5 枚対応 (maxCount で制御)
//   - Canvas で長辺 1200px / WebP 0.82 圧縮
//   - Worker 経由で R2 に presigned PUT
//   - 既存写真 (URL) と新規写真 (Blob) を統一的に管理
//
// 公開 API:
//   const area = createPhotoArea({
//     container,      // HTMLElement (中身は本 module が描画)
//     kind,           // 'memo' | 'trip'
//     getOwnerId,     // () => string (保存時に memo_id / trip_id を返す)
//     initialPhotos,  // [{url, w, h, bytes, content_type}] (既存写真、編集モード用)
//     maxCount,       // default: 5
//     onChange,       // (optional) 状態が変わるたびに呼ばれる
//   });
//
//   await area.uploadAndGetPhotos(memoOrTripId) // 新規 blob を順次 upload して全件返す
//   area.destroy()  // blob URL revoke + DOM 撤去
//
// 注: ownerId は保存直前にも確定可能 (新規 trip 生成時など) のため
//     uploadAndGetPhotos に引数で渡せる。getOwnerId のみで決まる場合は省略可。
// ══════════════════════════════════════════════════════════════

import { authBearerToken } from './12-auth.js';

const NORIRECO_API_BASE = 'https://api.norireco.app';
const PHOTO_MAX_LONG_SIDE = 1200;
const PHOTO_WEBP_QUALITY = 0.82;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_ORIGINAL_MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES_REGEX = /^image\/(jpe?g|png|webp)$/i;

// ── 圧縮 ───────────────────────────────────────────────────────
export async function compressImageToWebP(file) {
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

// ── アップロード ───────────────────────────────────────────────
// kind: 'memo' | 'trip', ownerId: memo_id | trip_id
export async function uploadPhoto(kind, ownerId, blob, meta) {
  const contentType = blob.type || 'image/webp';
  const sizeBytes = blob.size;
  const endpoint = `${NORIRECO_API_BASE}/upload/${kind}-photo`;
  const idField = kind === 'memo' ? 'memo_id' : 'trip_id';

  // 1. Worker から presigned URL を取得
  const presignRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authBearerToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      [idField]: ownerId,
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

// ── PhotoArea コンポーネント ─────────────────────────────────
export function createPhotoArea(opts) {
  const {
    container,
    kind,
    getOwnerId,
    initialPhotos = [],
    maxCount = 5,
    onChange = null,
  } = opts;

  // items[]: { kind: 'existing', url, w, h, bytes, content_type }
  //       | { kind: 'new', blob, w, h, previewUrl }
  let items = (Array.isArray(initialPhotos) ? initialPhotos : [])
    .filter((p) => p && p.url)
    .map((p) => ({
      kind: 'existing',
      url: p.url,
      w: p.w || null,
      h: p.h || null,
      bytes: p.bytes || null,
      content_type: p.content_type || 'image/webp',
    }));

  // DOM 構築
  container.innerHTML = `
    <div class="pa-wrap">
      <div class="pa-grid"></div>
      <input type="file" class="pa-file-input" accept="image/jpeg,image/png,image/webp" multiple style="display:none">
      <div class="pa-status">
        <div class="pa-status-text"></div>
        <div class="pa-progress" style="display:none"><div class="pa-progress-fill" style="width:0%"></div></div>
      </div>
    </div>
  `;
  const gridEl = container.querySelector('.pa-grid');
  const fileInput = container.querySelector('.pa-file-input');
  const statusEl = container.querySelector('.pa-status');
  const statusTextEl = container.querySelector('.pa-status-text');
  const progressEl = container.querySelector('.pa-progress');
  const progressFillEl = container.querySelector('.pa-progress-fill');

  // v259+: 進捗バー (表示/非表示 + 0〜100%)
  let _hideTimer = null;
  function setStatus(text) {
    if (statusTextEl) statusTextEl.textContent = text || '';
  }
  function setProgress(percent) {
    if (!progressEl || !progressFillEl) return;
    if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }
    const p = Math.max(0, Math.min(100, Math.round(percent)));
    progressEl.style.display = '';
    progressFillEl.style.width = `${p}%`;
  }
  function hideProgress(delayMs) {
    if (!progressEl) return;
    if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }
    if (delayMs && delayMs > 0) {
      _hideTimer = setTimeout(() => {
        progressEl.style.display = 'none';
        if (progressFillEl) progressFillEl.style.width = '0%';
      }, delayMs);
    } else {
      progressEl.style.display = 'none';
      if (progressFillEl) progressFillEl.style.width = '0%';
    }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function render() {
    const cells = items.map((it, i) => {
      const src = it.kind === 'existing' ? it.url : it.previewUrl;
      const badge = it.kind === 'new'
        ? `<span class="pa-badge">NEW</span>` : '';
      // v260+: 並び替え ‹ › ボタン (2 枚以上のとき、両端は disabled)
      const moveRow = items.length > 1
        ? `<div class="pa-move-row">
             <button type="button" class="pa-move" data-action="left" data-idx="${i}" aria-label="左へ" ${i === 0 ? 'disabled' : ''}>‹</button>
             <button type="button" class="pa-move" data-action="right" data-idx="${i}" aria-label="右へ" ${i === items.length - 1 ? 'disabled' : ''}>›</button>
           </div>`
        : '';
      return `
        <div class="pa-item" data-idx="${i}">
          <img class="pa-thumb" src="${escapeHtml(src)}" loading="lazy" alt="写真 ${i + 1}">
          ${badge}
          <button type="button" class="pa-remove" data-idx="${i}" aria-label="削除">✕</button>
          ${moveRow}
        </div>
      `;
    }).join('');

    const canAdd = items.length < maxCount;
    const addBtn = canAdd
      ? `<button type="button" class="pa-add" aria-label="写真を追加">＋<small>${items.length}/${maxCount}</small></button>`
      : `<div class="pa-add pa-add-disabled">${items.length}/${maxCount}</div>`;

    gridEl.innerHTML = cells + addBtn;
    if (onChange) onChange();
  }

  // items 配列内で idx の要素を direction (-1 = 左/前, +1 = 右/後) に 1 つ動かす
  function moveItem(idx, direction) {
    const target = idx + direction;
    if (target < 0 || target >= items.length) return;
    [items[idx], items[target]] = [items[target], items[idx]];
    render();
  }

  // ── イベント ──
  gridEl.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.pa-remove');
    if (removeBtn) {
      const idx = parseInt(removeBtn.dataset.idx, 10);
      if (Number.isInteger(idx) && items[idx]) {
        if (items[idx].kind === 'new' && items[idx].previewUrl) {
          URL.revokeObjectURL(items[idx].previewUrl);
        }
        items.splice(idx, 1);
        render();
      }
      return;
    }
    const moveBtn = e.target.closest('.pa-move');
    if (moveBtn && !moveBtn.disabled) {
      const idx = parseInt(moveBtn.dataset.idx, 10);
      const dir = moveBtn.dataset.action === 'left' ? -1 : +1;
      if (Number.isInteger(idx)) moveItem(idx, dir);
      return;
    }
    if (e.target.closest('.pa-add') && !e.target.closest('.pa-add-disabled')) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const remaining = maxCount - items.length;
    const accepted = files.slice(0, remaining);
    if (files.length > remaining) {
      alert(`最大 ${maxCount} 枚までです (${files.length - remaining} 枚は無視されました)`);
    }

    let processed = 0;
    for (const file of accepted) {
      processed++;
      if (!ALLOWED_TYPES_REGEX.test(file.type)) {
        alert(`「${file.name}」は JPEG / PNG / WebP のみ対応`);
        continue;
      }
      if (file.size > PHOTO_ORIGINAL_MAX_BYTES) {
        alert(`「${file.name}」が大きすぎ (上限 ${Math.round(PHOTO_ORIGINAL_MAX_BYTES / 1024 / 1024)}MB)`);
        continue;
      }
      setStatus(`🗜 圧縮中 ${processed}/${accepted.length}`);
      setProgress((processed - 1) / accepted.length * 100);
      try {
        const { blob, w, h } = await compressImageToWebP(file);
        if (blob.size > PHOTO_MAX_BYTES) {
          alert(`「${file.name}」圧縮後でも上限超え: ${Math.round(blob.size / 1024)} KB`);
          continue;
        }
        items.push({
          kind: 'new',
          blob,
          w,
          h,
          previewUrl: URL.createObjectURL(blob),
        });
        setProgress(processed / accepted.length * 100);
      } catch (err) {
        alert(`「${file.name}」処理失敗: ${err.message}`);
      }
    }
    setStatus('');
    hideProgress(800); // 完了後 0.8 秒で消す (バーが満タンになった視覚効果を残す)
    render();
  });

  render();

  // ── 公開メソッド ──
  return {
    // 新規 blob を順次 R2 にアップロードして、最終 photos[] を返す
    // ownerIdOverride: 保存直前に決まる ID (新規 trip 生成等) を渡したい場合
    async uploadAndGetPhotos(ownerIdOverride) {
      const ownerId = ownerIdOverride || (typeof getOwnerId === 'function' ? getOwnerId() : null);
      // アップロードが必要な新規アイテムだけ数えて進捗分母にする
      const newCount = items.filter((it) => it.kind === 'new').length;
      const result = [];
      let uploadedSoFar = 0;
      try {
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (it.kind === 'existing') {
            result.push({
              url: it.url,
              w: it.w,
              h: it.h,
              bytes: it.bytes,
              content_type: it.content_type,
            });
          } else {
            if (!ownerId) throw new Error('uploadAndGetPhotos: ownerId が未確定');
            setStatus(`☁️ アップロード中 ${uploadedSoFar + 1}/${newCount}`);
            // バーは「これからアップロードする 1 枚」の開始時点を表示 (進行中の枚目を示す)
            setProgress(newCount > 0 ? uploadedSoFar / newCount * 100 : 0);
            const uploaded = await uploadPhoto(kind, ownerId, it.blob, { w: it.w, h: it.h });
            result.push(uploaded);
            uploadedSoFar++;
            setProgress(newCount > 0 ? uploadedSoFar / newCount * 100 : 100);
          }
        }
        if (newCount > 0) {
          setStatus(`✅ アップロード完了 (${newCount} 枚)`);
          hideProgress(1200); // 完了表示を 1.2 秒残してから消す
        } else {
          setStatus('');
          hideProgress(0);
        }
      } catch (e) {
        // 失敗時はバーをそのまま残して赤系メッセージ
        setStatus(`❌ アップロード失敗 (${uploadedSoFar}/${newCount} 完了)`);
        throw e;
      }
      return result;
    },

    getItemCount() {
      return items.length;
    },

    hasUnsavedNew() {
      return items.some((it) => it.kind === 'new');
    },

    destroy() {
      items.forEach((it) => {
        if (it.kind === 'new' && it.previewUrl) URL.revokeObjectURL(it.previewUrl);
      });
      items = [];
      container.innerHTML = '';
    },
  };
}
