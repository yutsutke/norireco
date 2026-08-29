// Supabase 認証まわり。
//
// 【方針】service_role キーは持たない】
// この Worker は「ユスケ本人の access token」で Supabase を叩く。つまり v421 の RLS
// (本人の行しか読み書きできない) と v424 の full_banned ガードがそのまま効く。
// service_role を持たせると RLS を素通りできてしまい、MCP だけ垢BAN が効かない・
// 事故時の被害が全ユーザーに及ぶ、という穴になるので採らない。
//
// 【トークンの持ち方】
//   OAuth 同意のときに Supabase の Google ログイン (PKCE) を通し、返ってきた
//   refresh token を KV に保管する。tool 実行のたびに access token を取り直し、
//   有効期限内は KV にキャッシュする。access token は 1 時間で失効するが refresh
//   token は使うたびにローテーションするので、必ず新しい方を書き戻すこと。
const RT_TTL_SEC = 60 * 60 * 24 * 60; // 60 日使われなければ失効させる (再接続してもらう)

const rtKey = (userId) => `supa:rt:${userId}`;
const atKey = (userId) => `supa:at:${userId}`;

export class ReauthRequired extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReauthRequired';
  }
}

// ── PKCE (RFC 7636) ────────────────────────────────────────────────
function base64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function createCodeVerifier() {
  return base64url(crypto.getRandomValues(new Uint8Array(48)));
}

export async function codeChallengeOf(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/**
 * Supabase の Google ログインを開始する URL。
 * supabase-js の signInWithOAuth({provider:'google', flowType:'pkce'}) が組み立てるものと
 * 同じ形 (auth-js GoTrueClient._getUrlForProvider 準拠)。ブラウザ JS を積まずに
 * サーバ側だけで PKCE を回せるので、同意画面の CSP を締めたまま扱える。
 */
export function googleAuthorizeUrl(env, { redirectTo, codeChallenge }) {
  const params = new URLSearchParams({
    provider: 'google',
    redirect_to: redirectTo,
    code_challenge: codeChallenge,
    code_challenge_method: 's256',
  });
  return `${env.SUPABASE_URL}/auth/v1/authorize?${params.toString()}`;
}

async function tokenRequest(env, query, body) {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/token?${query}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase auth ${res.status}: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text);
}

/** 認可コード → セッション (auth-js exchangeCodeForSession と同じ grant_type=pkce) */
export function exchangeCode(env, { code, codeVerifier }) {
  return tokenRequest(env, 'grant_type=pkce', { auth_code: code, code_verifier: codeVerifier });
}

/** セッションを KV に保存。refresh token は毎回ローテーションするので上書き必須。 */
export async function storeSession(env, session) {
  const userId = session?.user?.id;
  if (!userId || !session.refresh_token) throw new Error('Supabase セッションが不完全です');
  await env.OAUTH_KV.put(rtKey(userId), session.refresh_token, { expirationTtl: RT_TTL_SEC });
  await cacheAccessToken(env, userId, session);
  return userId;
}

async function cacheAccessToken(env, userId, session) {
  // expires_in の 2 分手前で切る。KV の最小 TTL は 60 秒なので下限を踏む。
  const ttl = Math.max(60, (session.expires_in || 3600) - 120);
  await env.OAUTH_KV.put(atKey(userId), session.access_token, { expirationTtl: ttl });
}

/**
 * tool 実行時に使う access token を返す。
 * キャッシュが切れていれば refresh token で取り直し、新しい refresh token を書き戻す。
 */
export async function getAccessToken(env, userId) {
  const cached = await env.OAUTH_KV.get(atKey(userId));
  if (cached) return cached;

  const refreshToken = await env.OAUTH_KV.get(rtKey(userId));
  if (!refreshToken) {
    throw new ReauthRequired('乗レコとの接続が切れています。MCP コネクタを繋ぎ直してください');
  }
  let session;
  try {
    session = await tokenRequest(env, 'grant_type=refresh_token', { refresh_token: refreshToken });
  } catch (e) {
    // refresh token 自体が失効・失効済みなら再接続してもらうしかない
    await env.OAUTH_KV.delete(rtKey(userId));
    throw new ReauthRequired(`乗レコへのログインが切れています。MCP コネクタを繋ぎ直してください (${e.message})`);
  }
  await env.OAUTH_KV.put(rtKey(userId), session.refresh_token, { expirationTtl: RT_TTL_SEC });
  await cacheAccessToken(env, userId, session);
  return session.access_token;
}

/**
 * PostgREST 呼び出し。本体 (js/05-supabase-data.js 等) と同じヘッダの張り方:
 *   apikey = 公開 anon key / Authorization = 本人の access token
 */
export async function restFetch(env, userId, path, init = {}) {
  const accessToken = await getAccessToken(env, userId);
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  return res;
}

/** 垢BAN 状態 (v423/v424)。full_banned なら新規記録を作らせない。 */
export async function fetchShareStatus(env, userId) {
  const res = await restFetch(
    env,
    userId,
    `norireco_profiles?user_id=eq.${encodeURIComponent(userId)}&select=share_status&limit=1`,
  );
  if (!res.ok) return null; // profiles 行が無い新規ユーザーは通常運転
  const rows = await res.json().catch(() => []);
  return rows[0]?.share_status || null;
}

// R2 に上がっている写真の削除。旅程を消すときに一緒に片付ける。
// 本体 js/18-photo-area.js の deletePhotoByUrl と同じで、api.norireco.app (別 Worker) に
// 本人の access token を付けて投げる。MCP 側は R2 の鍵を持たないので、この経路しかない。
// ベストエフォート: 失敗しても旅程の削除自体は成立させる (R2 のゴミは将来の cleanup で掃除)。
const CDN_BASE = 'https://cdn.norireco.app/';
const API_BASE = 'https://api.norireco.app';

export async function deletePhotoByUrl(env, userId, url) {
  if (typeof url !== 'string' || !url.startsWith(CDN_BASE)) return false;
  try {
    const accessToken = await getAccessToken(env, userId);
    const res = await fetch(`${API_BASE}/delete/photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ object_key: url.slice(CDN_BASE.length) }),
    });
    return res.ok;
  } catch (e) {
    console.warn('[norireco-mcp] 写真の削除に失敗', e.message);
    return false;
  }
}
