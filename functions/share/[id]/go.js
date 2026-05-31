// 乗レコ シェア CTA リダイレクト /share/<id>/go (Cloudflare Pages Function, v436)
// ───────────────────────────────────────────────────────────────
// /share/<id> ページの CTA ボタンの遷移先。クリックをサーバー側で確実に計測してから
// アプリ本体へ 302 する。JS 不要 (リンクを踏むだけ) なので計測が漏れない。
//   - click カウントを bump_share_metric(id,'click') で +1 (waitUntil で非ブロック)
//   - ?ref=s_<id> を付けて遷移 → Phase 2 で「シェア経由の新規登録」attribution の土台
// ───────────────────────────────────────────────────────────────

import { APP_URL, bumpShareMetric, isValidShareId } from '../_metrics.js';

export function onRequestGet(context) {
  const { params } = context;
  const id = params && params.id;

  // 不正 id でもアプリは開けるようにする (計測だけ skip)。
  const dest = isValidShareId(id)
    ? `${APP_URL}?ref=s_${encodeURIComponent(id)}`
    : APP_URL;

  if (isValidShareId(id)) {
    context.waitUntil(bumpShareMetric(id, 'click'));
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: dest,
      // リダイレクト自体はキャッシュさせない (CDN にキャッシュされると click が数えられなくなる)。
      'Cache-Control': 'no-store',
    },
  });
}
