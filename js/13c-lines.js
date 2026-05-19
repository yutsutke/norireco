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
//
// v204 ES Modules パイロット (案 β) stage 2: `<script type="module">` 化。
// 最小ファイル (21 行 → 関数 1 個のみ)、NORIRECO.mypage namespace は 13-mypage-common
// (classic) が先に評価して確立済なので、module 評価時には存在保証あり。
//
// v223 ES Modules stage 3: `export` 公開へ移行。現状 caller ゼロ (プレースホルダ) なので
// import の追加先なし。将来呼出が必要になった時点で consumer 側に import を足す。
// 既存の `NORIRECO.mypage.renderMpLinesSection` 登録は互換維持のため残置。
// v225: 09-tabs-stats.renderList を import 化。
// ══════════════════════════════════════════════════════════════
import { renderList } from './09-tabs-stats.js';

// 路線サブタブのエントリラッパー (将来の拡張ポイント)
export function renderMpLinesSection() {
  try { renderList(); } catch (e) { console.warn('[マイページ路線] renderList:', e); }
}
NORIRECO.mypage.renderMpLinesSection = renderMpLinesSection;
