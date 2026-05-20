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

// HTML onclick 互換のため window.NORIRECO に公開
window.NORIRECO = window.NORIRECO || {};
window.NORIRECO.colorOverrides = {
  get: getColorOverrides,
  set: setLineColor,
  reset: resetLineColor,
  resetAll: resetAllColors,
  applyAfterBuild: applyOverridesAfterBuild,
};
