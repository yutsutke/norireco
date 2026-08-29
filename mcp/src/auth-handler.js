// OAuth の「人が触る側」。Claude などの MCP クライアントに対して 乗レコ が
// 認可サーバとして振る舞い、その裏で Supabase の Google ログインを踏ませる。
//
//   Claude ──(OAuth 2.1)──▶ mcp.norireco.app ──(Supabase PKCE)──▶ Google
//
// つまりこの Worker は「Claude から見るとサーバ、Supabase から見るとクライアント」の
// プロキシ。この形は confused deputy の温床なので、Cloudflare の
// agents/docs/securing-mcp-servers.md が挙げる対策を踏襲する:
//   - 同意画面を自前で出す (Google の同意キャッシュに便乗させない)
//   - CSRF トークン (cookie ↔ hidden field)
//   - state を KV + cookie の 2 か所で突き合わせる
//   - クライアント名など外部由来の文字列は必ず HTML エスケープ
//   - CSP で inline script を禁止 (この画面に JS は無い)
import { AuthorizationError } from '@cloudflare/workers-oauth-provider';
import {
  codeChallengeOf,
  createCodeVerifier,
  exchangeCode,
  googleAuthorizeUrl,
  storeSession,
} from './supabase.js';

// 同意画面ごとに cookie 名を分ける (末尾に pending id を付ける)。
// 同じブラウザで同意画面を 2 回開くと、1 つの固定名だと後から開いた方が前の cookie を
// 上書きしてしまい、先に開いたページを送信した瞬間に「トークンが一致しない」になる。
const CSRF_COOKIE_PREFIX = '__Host-NORIRECO_CSRF_';
const STATE_COOKIE = '__Host-NORIRECO_STATE';
// cookie は KV の同意レコードより長生きさせる。逆にすると「期限切れ」なのに
// 「トークンが一致しない」と表示され、原因を取り違える (2026-08-29 に実際に踏んだ)。
const PENDING_TTL_SEC = 900;   // 同意画面を開いてからボタンを押すまでの猶予
const COOKIE_TTL_SEC = 1800;
const STATE_TTL_SEC = 900;     // Google ログインから戻ってくるまでの猶予

// pending id は form から来る = 信用できない。cookie 名に埋める前に UUID 形式に限定する
// (CRLF などを混ぜられるとヘッダを壊せるため)。
const PENDING_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SCOPES = ['norireco:read', 'norireco:write'];

function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function cookieValue(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) return trimmed.slice(name.length + 1);
  }
  return null;
}

const setCookie = (name, value, maxAge) =>
  `${name}=${value}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
const clearCookie = (name) => setCookie(name, '', 0);

// 【CSP form-action の落とし穴 — 2026-08-29 に 2 回踏んだ】
// `form-action` はフォーム送信の**リダイレクト先すべて**に適用される (Chrome/Firefox)。
// 同意ボタンの POST に Supabase の authorize へ 302 を返していたため、'self' だけだと
// ブラウザがその移動を拒否し、**押しても何も起きない**形で壊れていた。押した本人には
// エラーが見えず、同意レコードだけ消費されて 2 回目が「時間切れ」になるので原因が分かりにくい。
// 1 度目の修正で Supabase の origin を足したが、Supabase はさらに accounts.google.com へ
// 転送するのでそこで再びブロックされた。**ホップを列挙する方針そのものが壊れやすい**ため、
// 最終的に「POST はリダイレクトを返さず、200 + meta refresh で送り出す」形にした
// (通常のナビゲーションは form-action の対象外)。formAction 引数は将来のための余地。
function htmlResponse(body, { status = 200, cookies = [], formAction = "'self'" } = {}) {
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': [
      "default-src 'none'",
      "style-src 'unsafe-inline'",
      `form-action ${formAction}`,
      "frame-ancestors 'none'",
      "base-uri 'none'",
    ].join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  for (const c of cookies) headers.append('Set-Cookie', c);
  return new Response(body, { status, headers });
}

function page(title, inner) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — 乗レコ</title>
<style>
  body { font-family: -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif;
         margin: 0; padding: 32px 20px; background: #f7f7f5; color: #222; line-height: 1.7; }
  .card { max-width: 460px; margin: 0 auto; background: #fff; border-radius: 14px;
          padding: 28px 24px; box-shadow: 0 2px 12px rgba(0,0,0,.07); }
  h1 { font-size: 19px; margin: 0 0 4px; }
  .sub { color: #777; font-size: 13px; margin: 0 0 20px; }
  ul { padding-left: 1.2em; margin: 12px 0 20px; font-size: 14px; }
  li { margin-bottom: 4px; }
  .client { background: #f2f4f8; border-radius: 8px; padding: 10px 12px;
            font-size: 14px; margin-bottom: 18px; word-break: break-all; }
  button { width: 100%; padding: 13px; font-size: 15px; font-weight: 600; color: #fff;
           background: #2f6fed; border: 0; border-radius: 9px; cursor: pointer; }
  .note { font-size: 12px; color: #888; margin-top: 16px; }
  a { color: #2f6fed; }
</style>
</head>
<body><div class="card">${inner}</div></body>
</html>`;
}

// 接続を許してよい人か。`ALLOWED_EMAILS` (secret・カンマ区切り) が空 or 未設定なら誰でも可。
//
// 【なぜ後段でしか判定できないか】
// 本人確認は Google ログインを通したあとにしか成立しない。したがって「許可されていない人が
// ログインを試みると Supabase にアカウントだけは作られる」ことは避けられない。ただし
// norireco.app 自体が Google で誰でもサインアップできるので、これは MCP が新しく開けた穴ではない。
// ここで止めているのは「MCP から乗レコ を操作できること」の方。
function isAllowedEmail(env, email) {
  const raw = (env.ALLOWED_EMAILS || '').trim();
  if (!raw) return true; // 空 = 全開放 (テストが済んだら secret を消すだけで開放できる)
  const allowed = raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(String(email || '').trim().toLowerCase());
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── GET /authorize : 同意画面 ─────────────────────────────────────
async function showConsent(request, env) {
  let oauthRequest;
  try {
    oauthRequest = await env.OAUTH_PROVIDER.parseAuthRequest(request);
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error;
    // クライアント不明・redirect_uri 不正のときはリダイレクトせずその場で表示する
    if (!error.redirectUri) {
      return htmlResponse(page('接続できません', `<h1>接続できません</h1><p>${esc(error.description)}</p>`), { status: 400 });
    }
    const redirect = new URL(error.redirectUri);
    redirect.searchParams.set('error', error.code);
    redirect.searchParams.set('error_description', error.description);
    if (error.state) redirect.searchParams.set('state', error.state);
    if (error.issuer) redirect.searchParams.set('iss', error.issuer);
    return Response.redirect(redirect.toString(), 302);
  }

  const client = await env.OAUTH_PROVIDER.lookupClient(oauthRequest.clientId);
  if (!client) {
    return htmlResponse(page('接続できません', '<h1>接続できません</h1><p>不明なクライアントです。</p>'), { status: 400 });
  }

  const csrfToken = crypto.randomUUID();
  // 同意した内容そのものを KV に置き、POST 側は「この id の同意」しか進められないようにする
  const pendingId = crypto.randomUUID();
  await env.OAUTH_KV.put(
    `oauth:pending:${pendingId}`,
    JSON.stringify({ oauthRequest, clientName: client.clientName || '', csrfToken }),
    { expirationTtl: PENDING_TTL_SEC },
  );

  const body = `
    <h1>乗レコ に接続します</h1>
    <p class="sub">AI チャットから乗車記録を作れるようにします</p>
    <div class="client">接続元: <strong>${esc(client.clientName || oauthRequest.clientId)}</strong></div>
    <p>許可すると、このアプリは あなたの 乗レコ アカウントで:</p>
    <ul>
      <li>路線・駅を検索できます</li>
      <li>旅程 (乗車記録) を新しく保存できます</li>
      <li>直近の旅程を読み取れます</li>
    </ul>
    <form method="POST" action="/authorize">
      <input type="hidden" name="csrf_token" value="${esc(csrfToken)}">
      <input type="hidden" name="pending_id" value="${esc(pendingId)}">
      <button type="submit">Google でログインして許可</button>
    </form>
    <p class="note">写真の追加・記録の削除はできません。接続はいつでも
    <a href="https://norireco.app">乗レコ</a> 側からログアウトすれば切れます。</p>`;

  return htmlResponse(page('接続の確認', body), {
    cookies: [setCookie(CSRF_COOKIE_PREFIX + pendingId, csrfToken, COOKIE_TTL_SEC)],
  });
}

// ── POST /authorize : 同意 → Supabase の Google ログインへ ────────
async function startLogin(request, env) {
  const form = await request.formData();
  const csrfFromForm = form.get('csrf_token');
  const pendingId = form.get('pending_id');
  const retry = '<p class="note">お手数ですが、接続をもう一度最初から始めてください。</p>';

  if (typeof pendingId !== 'string' || !PENDING_ID_RE.test(pendingId)) {
    return htmlResponse(page('やり直してください', `<h1>やり直してください</h1><p>同意の情報が読み取れませんでした。</p>${retry}`), { status: 400 });
  }
  // 同意レコード (単回使用・PENDING_TTL_SEC で失効)
  const pendingRaw = await env.OAUTH_KV.get(`oauth:pending:${pendingId}`);
  if (!pendingRaw) {
    return htmlResponse(page('時間切れです', `<h1>時間切れです</h1><p>同意画面を開いてから時間が経ちすぎました（${PENDING_TTL_SEC / 60} 分まで）。</p>${retry}`), { status: 400 });
  }
  // ブラウザとの結び付け。cookie が無い = 別のブラウザ、または cookie が保存されていない
  const csrfFromCookie = cookieValue(request, CSRF_COOKIE_PREFIX + pendingId);
  if (!csrfFromCookie) {
    return htmlResponse(page('やり直してください', `<h1>やり直してください</h1>
      <p>同意画面を開いたブラウザと、送信元のブラウザが一致しませんでした。</p>
      <p class="note">別のブラウザやシークレットウィンドウで開き直した場合や、cookie が保存されない設定になっている場合に起きます。</p>${retry}`), { status: 400 });
  }
  await env.OAUTH_KV.delete(`oauth:pending:${pendingId}`);
  const pending = JSON.parse(pendingRaw);
  if (csrfFromForm !== csrfFromCookie || pending.csrfToken !== csrfFromForm) {
    return htmlResponse(page('やり直してください', `<h1>やり直してください</h1><p>確認トークンが一致しませんでした。</p>${retry}`), { status: 400 });
  }

  // Supabase から戻ってきたときに「同じブラウザの、同意済みのフロー」だと確かめるための state。
  // 中身 (認可リクエストと code_verifier) は KV、突合せ用のハッシュは cookie に置く。
  const stateToken = crypto.randomUUID();
  const codeVerifier = createCodeVerifier();
  await env.OAUTH_KV.put(
    `oauth:state:${stateToken}`,
    JSON.stringify({ oauthRequest: pending.oauthRequest, clientName: pending.clientName, codeVerifier }),
    { expirationTtl: STATE_TTL_SEC },
  );

  // Supabase に渡す戻り先は必ず https。request.url の scheme をそのまま使うと、
  // ローカル開発や TLS 終端の都合で http になったときに認可コードが平文で飛ぶ。
  // (localhost だけは http のままにして wrangler dev を壊さない)
  const redirectTo = new URL('/callback', request.url);
  if (!/^(localhost|127\.0\.0\.1)$/.test(redirectTo.hostname)) redirectTo.protocol = 'https:';
  const url = googleAuthorizeUrl(env, {
    redirectTo: redirectTo.toString(),
    codeChallenge: await codeChallengeOf(codeVerifier),
  });

  // 302 ではなく 200 + meta refresh で送り出す (上の htmlResponse のコメント参照)。
  // フォーム送信のリダイレクトは CSP form-action に縛られるが、meta refresh や
  // リンククリックは普通のナビゲーションなので縛られない。
  // 自動遷移が効かない環境のために手動リンクも置く。
  const body = `
    <h1>Google のログインに進みます</h1>
    <p class="sub">自動で移動します。切り替わらない場合は下のリンクを押してください。</p>
    <p><a href="${esc(url)}">Google のログインに進む</a></p>`;
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': [
      "default-src 'none'",
      "style-src 'unsafe-inline'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'none'",
    ].join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  });
  headers.append('Set-Cookie', clearCookie(CSRF_COOKIE_PREFIX + pendingId));
  headers.append('Set-Cookie', setCookie(STATE_COOKIE, `${stateToken}.${await sha256Hex(stateToken)}`, STATE_TTL_SEC));
  return new Response(
    page('Google に移動します', body).replace('</head>', `<meta http-equiv="refresh" content="0;url=${esc(url)}"></head>`),
    { status: 200, headers },
  );
}

// ── GET /callback : Supabase から戻ってきた ───────────────────────
async function finishLogin(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const supaError = url.searchParams.get('error_description') || url.searchParams.get('error');
  const cookies = [clearCookie(STATE_COOKIE)];

  if (supaError) {
    return htmlResponse(page('ログインできませんでした', `<h1>ログインできませんでした</h1><p>${esc(supaError)}</p>`), { status: 400, cookies });
  }
  if (!code) {
    return htmlResponse(page('ログインできませんでした', '<h1>ログインできませんでした</h1><p>認可コードがありません。</p>'), { status: 400, cookies });
  }

  const raw = cookieValue(request, STATE_COOKIE);
  const [stateToken, stateHash] = (raw || '').split('.');
  if (!stateToken || !stateHash || (await sha256Hex(stateToken)) !== stateHash) {
    return htmlResponse(page('やり直してください', '<h1>やり直してください</h1><p>ブラウザとの結び付けが確認できませんでした。もう一度接続を開始してください。</p>'), { status: 400, cookies });
  }
  const stored = await env.OAUTH_KV.get(`oauth:state:${stateToken}`);
  if (!stored) {
    return htmlResponse(page('やり直してください', '<h1>やり直してください</h1><p>ログインの有効期限が切れています。もう一度接続を開始してください。</p>'), { status: 400, cookies });
  }
  await env.OAUTH_KV.delete(`oauth:state:${stateToken}`);
  const { oauthRequest, clientName, codeVerifier } = JSON.parse(stored);

  let session;
  try {
    session = await exchangeCode(env, { code, codeVerifier });
  } catch (e) {
    return htmlResponse(page('ログインできませんでした', `<h1>ログインできませんでした</h1><p>${esc(e.message)}</p>`), { status: 502, cookies });
  }

  if (!isAllowedEmail(env, session.user?.email)) {
    // セッションは保存しない = KV に他人の refresh token を残さない
    return htmlResponse(page('まだ公開していません', `
      <h1>まだ公開していません</h1>
      <p>乗レコ の MCP 連携は現在テスト中で、限られたアカウントだけが接続できます。</p>
      <p class="note">乗レコ 本体は <a href="https://norireco.app">norireco.app</a> から
      いつも通りお使いいただけます。</p>`), { status: 403, cookies });
  }

  const userId = await storeSession(env, session);
  const requested = Array.isArray(oauthRequest.scope) ? oauthRequest.scope : [];
  const granted = requested.filter((s) => SCOPES.includes(s));

  const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthRequest,
    userId,
    metadata: { clientName },
    scope: granted.length > 0 ? granted : SCOPES,
    props: { userId, email: session.user?.email || '' },
  });

  return new Response(null, {
    status: 302,
    headers: [['Location', redirectTo], ['Set-Cookie', cookies[0]]],
  });
}

const landing = () =>
  htmlResponse(page('乗レコ MCP', `
    <h1>乗レコ MCP サーバ</h1>
    <p class="sub">AI チャットから乗車記録をつけるための接続口です</p>
    <p>お使いの AI クライアントに、MCP サーバとして次の URL を登録してください。</p>
    <div class="client">https://mcp.norireco.app/mcp</div>
    <p class="note">接続すると Google ログインを求められます。乗レコ本体は
    <a href="https://norireco.app">norireco.app</a> です。</p>`));

export const authHandler = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/authorize' && request.method === 'GET') return showConsent(request, env);
    if (url.pathname === '/authorize' && request.method === 'POST') return startLogin(request, env);
    if (url.pathname === '/callback' && request.method === 'GET') return finishLogin(request, env);
    if (url.pathname === '/health') return new Response('ok', { headers: { 'Content-Type': 'text/plain' } });
    if (url.pathname === '/') return landing();
    return new Response('Not found', { status: 404 });
  },
};
