// ══════════════════════════════════════════════════════════════
// マイページ 📋 路線サブタブ (v190 分割)
//
// 路線一覧は 09-tabs-stats.js の renderList() を再利用しているため、
// 現状このファイルは「将来、路線サブタブ専用ロジックが入る器」として
// 用意したプレースホルダー。13a/13b と並ぶ「3 タブ 3 ファイル」構成を
// 維持するために、薄くてもファイルを切ってある。
//
// applyMpSection (13-mypage-common.js) 内では typeof renderList を直接
// 呼んでいるため、現状ここを経由する必要はないが、将来の追加ロジック
// (例: 路線色のユーザーカスタマイズ / 路線別バッジ表示 など) はここで
// 受ける。
// ══════════════════════════════════════════════════════════════

// 路線サブタブのエントリラッパー (将来の拡張ポイント)
function renderMpLinesSection() {
  if (typeof renderList === 'function') {
    try { renderList(); } catch (e) { console.warn('[マイページ路線] renderList:', e); }
  }
}
NORIRECO.mypage.renderMpLinesSection = renderMpLinesSection;
