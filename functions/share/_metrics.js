// 乗レコ シェア計測ヘルパー (v436) — /share/<id> と /share/<id>/go で共有
// ───────────────────────────────────────────────────────────────
// `_` 始まりのファイルは Cloudflare Pages のルーティング対象外 (import 専用)。
//
// Pages Function は anon key で Supabase を叩く。norireco_shares の UPDATE は本人限定 RLS
// (v413) なので、view/click カウンタの increment は SECURITY DEFINER 関数 bump_share_metric
// (v436 migration、anon EXECUTE 許可) 経由でしか行えない。
// ───────────────────────────────────────────────────────────────

// frontend (js/05-supabase-data.js) / 配信側 ([id].js) と同じ公開値。anon key は元々露出済み。
export const SUPABASE_URL = 'https://zkscxhhlyhdaanisjhdi.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprc2N4aGhseWhkYWFuaXNqaGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTAzNjcsImV4cCI6MjA5MzcyNjM2N30.rGOli3UJjjBtF8caD7NXaoCYdfgbIyv4j_GCdjmPpsU';
export const APP_URL = 'https://norireco.app/';

// SNS の OGP unfurl クローラ等は JS を実行せず GET だけ叩く。view を人間の閲覧に近づけるため
// 既知の bot UA / UA 無しは view カウントから除外する (CTA click は人間しか踏まないので無関係)。
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|twitterbot|slackbot|discordbot|whatsapp|telegram|linkedinbot|pinterest|googlebot|bingbot|applebot|yandex|line\/|skypeuripreview|embedly|redditbot|vkshare|preview|headless|fetch|curl|wget|python-requests|axios|go-http/i;

export function isLikelyBot(ua) {
  return !ua || BOT_RE.test(ua);
}

// 指定 share の view / click カウンタを RPC で +1。fire-and-forget 前提で例外は握りつぶす
// (計測はベストエフォート。失敗してもページ表示・リダイレクトは止めない)。
// 呼び出し側は context.waitUntil(bumpShareMetric(...)) でレスポンスをブロックせず実行する。
export function bumpShareMetric(id, kind) {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/bump_share_metric`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_id: id, p_kind: kind }),
  }).catch(() => {});
}

// /share/<id> と /share/<id>/go で共通の id バリデーション (R2 share_id = 英数 6〜64)。
export function isValidShareId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{6,64}$/.test(id);
}
