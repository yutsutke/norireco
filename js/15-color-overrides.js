// ══════════════════════════════════════════════════════════════
// 15-color-overrides.js — 系統色のユーザーカスタマイズ (v243〜)
//
// 路線一覧タブの color picker から各営業系統の色を変更し、地図描画・
// パイチャート・凡例・ヘッダに即時反映する。
//
// 保存: localStorage.norireco_line_color_overrides = { slId: "#RRGGBB" }
// 再描画: drawLines + updateOverlays + renderList を 1 関数でまとめて呼ぶ
//
// load 順 (noritetsu-map.html):
//   ... 13c-lines → 14-share-ogp → share-japan-geo → 15-color-overrides
//   → 09-tabs-stats → 10-init
//
// 02b-service-lines-builder.js の build() 末尾でも同じ localStorage を読んで
// sl.color を初期値からオーバーライドする (起動直後の地図描画もカスタム色)。
// ══════════════════════════════════════════════════════════════
import { drawLines, updateOverlays } from './08-rendering.js';
import { renderList } from './09-tabs-stats.js';

const STORAGE_KEY = 'norireco_line_color_overrides';

function readOverrides() {
  try {
    const o = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return (o && typeof o === 'object') ? o : {};
  } catch (e) { return {}; }
}

function writeOverrides(o) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(o)); }
  catch (e) { console.warn('[色override] 保存失敗:', e); }
}

export function getColorOverrides() {
  return readOverrides();
}

// 単一系統の色を変更
export function setLineColor(slId, color) {
  if (!slId || !/^#[0-9a-fA-F]{6}$/.test(color)) return;
  const o = readOverrides();
  o[slId] = color;
  writeOverrides(o);
  applyToServiceLine(slId, color);
  triggerReRender();
}

// 単一系統をデフォルト色に戻す
export function resetLineColor(slId) {
  if (!slId) return;
  const o = readOverrides();
  delete o[slId];
  writeOverrides(o);
  restoreOriginal(slId);
  triggerReRender();
}

// 全系統をデフォルト色に戻す
export function resetAllColors() {
  writeOverrides({});
  const SL = (NORIRECO.data && NORIRECO.data.SERVICE_LINES) || [];
  for (const sl of SL) {
    if (sl.originalColor) sl.color = sl.originalColor;
  }
  triggerReRender();
}

// 02b.build() 末尾から呼ぶ: localStorage の override 全てを SERVICE_LINES に適用
export function applyOverridesAfterBuild() {
  const SL = (NORIRECO.data && NORIRECO.data.SERVICE_LINES) || [];
  const o = readOverrides();
  for (const sl of SL) {
    if (sl.originalColor == null) sl.originalColor = sl.color;
    if (o[sl.id]) sl.color = o[sl.id];
    else sl.color = sl.originalColor;
  }
}

function applyToServiceLine(slId, color) {
  const SL = (NORIRECO.data && NORIRECO.data.SERVICE_LINES) || [];
  const sl = SL.find(l => l.id === slId);
  if (!sl) return;
  if (sl.originalColor == null) sl.originalColor = sl.color;
  sl.color = color;
}

function restoreOriginal(slId) {
  const SL = (NORIRECO.data && NORIRECO.data.SERVICE_LINES) || [];
  const sl = SL.find(l => l.id === slId);
  if (sl && sl.originalColor) sl.color = sl.originalColor;
}

// 地図ライン・駅マーカー・凡例・路線タブを全てやり直す。
// drawLines は allLayers / dotLayerRef / labelLayerRef をクリアしてから描き直す前提なので、
// ここでも setDateFilter と同じパターンで先にクリア。
function triggerReRender() {
  try {
    if (NORIRECO.map && NORIRECO.map.instance && window.dotLayerRef) {
      (window.allLayers || []).forEach(l => { try { NORIRECO.map.instance.removeLayer(l); } catch(e){} });
      if (window.allLayers) window.allLayers.length = 0;
      window.dotLayerRef.clearLayers();
      if (window.labelLayerRef) window.labelLayerRef.clearLayers();
      drawLines();
    }
  } catch (e) { console.warn('[色override] 地図再描画:', e); }
  try { updateOverlays(); } catch (e) {}
  try { renderList(); } catch (e) {}
}

// ─────────────────────────────────────────────
// 地図上の路線クリック → 色変更モーダル (v245)
// ─────────────────────────────────────────────
function ensureLineColorModal() {
  let m = document.getElementById('line-color-modal');
  if (m) return m;
  m = document.createElement('div');
  m.id = 'line-color-modal';
  m.className = 'memo-modal';
  m.addEventListener('click', (e) => { if (e.target === m) closeLineColorModal(); });
  m.innerHTML = `
    <div class="memo-sheet" style="max-width:380px">
      <div class="sh"></div>
      <div class="modal-title">🎨 系統色を変更</div>
      <div id="lcm-name" style="font-size:14px;font-weight:700;color:var(--white);margin-bottom:4px"></div>
      <div id="lcm-operator" style="font-size:11px;color:var(--silver);margin-bottom:16px"></div>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;padding:12px;background:rgba(20,32,46,.6);border-radius:8px">
        <input type="color" id="lcm-picker" style="width:48px;height:48px;border-radius:50%;border:2px solid var(--track);cursor:pointer;padding:0;-webkit-appearance:none;appearance:none;background:transparent;flex-shrink:0">
        <div style="flex:1">
          <div style="font-size:10px;color:var(--silver);margin-bottom:2px">現在の色</div>
          <div id="lcm-hex" style="font-family:'DM Mono',monospace;font-size:14px;color:var(--white);font-weight:500"></div>
          <div id="lcm-original-row" style="font-size:9px;color:var(--silver);margin-top:4px;display:none">
            元の色: <span id="lcm-original-hex" style="font-family:'DM Mono',monospace"></span>
          </div>
        </div>
      </div>
      <div style="font-size:10px;color:var(--silver);opacity:.7;margin-bottom:12px;line-height:1.5">
        ※ 色は端末 localStorage に保存され、地図・パイチャート・路線一覧・シェア画像に即時反映されます。
      </div>
      <button class="btn-cls" id="lcm-reset" style="display:none">↺ 元の色に戻す</button>
      <button class="btn-cls" id="lcm-close">閉じる</button>
    </div>
  `;
  document.body.appendChild(m);
  m.querySelector('#lcm-close').addEventListener('click', closeLineColorModal);
  m.querySelector('#lcm-picker').addEventListener('change', (e) => {
    const id = m.dataset.lineId;
    const color = e.target.value;
    if (!id) return;
    setLineColor(id, color);
    // モーダル内表示も更新 (リセットボタンの出し分けを再評価)
    const sl = (NORIRECO.data && NORIRECO.data.SERVICE_LINES || []).find(l => l.id === id);
    if (sl) refreshModalDisplay(sl);
  });
  m.querySelector('#lcm-reset').addEventListener('click', () => {
    const id = m.dataset.lineId;
    if (!id) return;
    resetLineColor(id);
    const sl = (NORIRECO.data && NORIRECO.data.SERVICE_LINES || []).find(l => l.id === id);
    if (sl) refreshModalDisplay(sl);
  });
  return m;
}

function refreshModalDisplay(sl) {
  const m = document.getElementById('line-color-modal');
  if (!m) return;
  m.querySelector('#lcm-name').textContent = sl.name || sl.id;
  m.querySelector('#lcm-operator').textContent = sl.operator || '';
  m.querySelector('#lcm-picker').value = sl.color;
  m.querySelector('#lcm-hex').textContent = (sl.color || '').toUpperCase();
  const isOverridden = !!(sl.originalColor && sl.originalColor !== sl.color);
  m.querySelector('#lcm-reset').style.display = isOverridden ? '' : 'none';
  const origRow = m.querySelector('#lcm-original-row');
  origRow.style.display = isOverridden ? '' : 'none';
  if (isOverridden) m.querySelector('#lcm-original-hex').textContent = sl.originalColor.toUpperCase();
}

function closeLineColorModal() {
  const m = document.getElementById('line-color-modal');
  if (m) m.classList.remove('open');
}

// v246: ESC キーでモーダルを閉じる (脱出経路の保険)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const m = document.getElementById('line-color-modal');
    if (m && m.classList.contains('open')) closeLineColorModal();
  }
});

export function openLineColorEditor(sl) {
  if (!sl) return;
  const m = ensureLineColorModal();
  m.dataset.lineId = sl.id;
  refreshModalDisplay(sl);
  m.classList.add('open');
}

// HTML onclick 互換のため window.NORIRECO に公開
window.NORIRECO = window.NORIRECO || {};
window.NORIRECO.colorOverrides = {
  get: getColorOverrides,
  set: setLineColor,
  reset: resetLineColor,
  resetAll: resetAllColors,
  applyAfterBuild: applyOverridesAfterBuild,
  openEditor: openLineColorEditor,
};
