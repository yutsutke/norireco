// ══════════════════════════════════════════════════════════════
// 汎用ドラッグ&ドロップ並び替え (v263+)
//
// Pointer Events ベースで実装することで PC (mouse) と モバイル (touch) を
// 同じコードで両対応。HTML5 native drag-and-drop はモバイル非対応のため不採用。
//
// 設計:
//   - container に 1 つ listener (event delegation)。innerHTML 書き換えで
//     子要素が再生成されても listener は残るため、再 attach 不要
//   - pointerdown → 移動量が threshold を超えたらドラッグ確定 (誤動作防止)
//   - ドラッグ中: dragging item を translate で動かす + 重なってる他 item を
//     `.drag-over` でハイライト
//   - pointerup: targetItem があれば onReorder(oldIdx, newIdx) を呼ぶ
//
// 公開 API:
//   const handle = enableDragSort(container, {
//     itemSelector,        // ドラッグ対象を絞る selector (例: '.pa-item')
//     onReorder,           // (oldIdx, newIdx) => void
//     ignoreSelector,      // この selector に該当する子要素は掴まない (default: button, a, input)
//     threshold,           // drag 確定までの px (default: 5)
//     dragClass,           // drag 中の class (default: 'drag-dragging')
//     overClass,           // drop 候補の class (default: 'drag-over')
//   });
//   handle.destroy();
// ══════════════════════════════════════════════════════════════

export function enableDragSort(container, opts) {
  const {
    itemSelector,
    onReorder,
    ignoreSelector = 'button, a, input, textarea, select',
    threshold = 5,
    dragClass = 'drag-dragging',
    overClass = 'drag-over',
  } = opts;

  let dragging = null;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let started = false;

  function getItems() {
    return [...container.querySelectorAll(itemSelector)];
  }

  function clearOver() {
    container.querySelectorAll(`.${overClass}`).forEach((i) => i.classList.remove(overClass));
  }

  function reset() {
    if (dragging) {
      dragging.classList.remove(dragClass);
      dragging.style.transform = '';
      dragging.style.zIndex = '';
      try { dragging.releasePointerCapture(pointerId); } catch (e) {}
    }
    clearOver();
    dragging = null;
    pointerId = null;
    started = false;
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return; // left mouse / primary touch only
    if (e.target.closest(ignoreSelector)) return;
    const item = e.target.closest(itemSelector);
    if (!item || !container.contains(item)) return;
    dragging = item;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    started = false;
    // capture は drag 確定後 (threshold 超え時) に呼ぶ
  }

  function onPointerMove(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!started) {
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
      started = true;
      dragging.classList.add(dragClass);
      try { dragging.setPointerCapture(pointerId); } catch (e) {}
      // ドラッグ確定後はブラウザのデフォルト動作 (スクロール等) を抑制
      e.preventDefault();
    }
    dragging.style.transform = `translate(${dx}px, ${dy}px)`;
    dragging.style.zIndex = '10';

    // ドロップ候補の検出: pointer の位置に重なってる他 item
    const items = getItems().filter((i) => i !== dragging);
    let dropItem = null;
    for (const it of items) {
      const rect = it.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        dropItem = it;
        break;
      }
    }
    clearOver();
    if (dropItem) dropItem.classList.add(overClass);
  }

  // ドラッグ完了直後の click を 1 回だけ抑制 (サムネ内 <a target=_blank> の発火を防ぐ)
  function suppressNextClick() {
    function handler(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      window.removeEventListener('click', handler, true);
    }
    window.addEventListener('click', handler, true);
    // 念のため 500ms で listener を撤去 (click が来なかった場合の保険)
    setTimeout(() => window.removeEventListener('click', handler, true), 500);
  }

  function onPointerUp(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    if (!started) {
      reset();
      return;
    }
    // ドロップ判定
    const items = getItems();
    const oldIdx = items.indexOf(dragging);
    const targetItem = container.querySelector(`.${overClass}`);
    const newIdx = (targetItem && targetItem !== dragging) ? items.indexOf(targetItem) : -1;
    reset();
    // ドラッグ後の click を抑制 (リンク・ボタンの誤発火を防ぐ)
    suppressNextClick();
    if (newIdx >= 0 && newIdx !== oldIdx && typeof onReorder === 'function') {
      try { onReorder(oldIdx, newIdx); } catch (err) {
        console.warn('[DragSort] onReorder エラー:', err.message);
      }
    }
  }

  function onPointerCancel(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    reset();
  }

  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointercancel', onPointerCancel);

  return {
    destroy() {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerCancel);
      reset();
    },
  };
}
