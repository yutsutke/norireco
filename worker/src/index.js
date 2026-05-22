// 乗レコ API ゲートウェイ Worker
// ───────────────────────────────────────────────────────────────
// エンドポイント:
//   POST   /upload/memo-photo  : Supabase JWT verify → R2 presigned PUT URL
//   GET    /me                 : JWT verify テスト用 (uid/email 返却)
//   GET    /health             : 認証なし疎通確認
//
// 認証: Supabase Auth が発行する access token (ES256, JWKS 経由で公開鍵 verify)
// ストレージ: R2 (S3 互換、SigV4 presigned URL を aws4fetch で生成)
//
// 設計判断 (CHANGELOG §99 を参照):
//   - presigned URL 方式: アップロードのみ Worker 経由、配信は cdn.norireco.app 直
//   - JWKS は Worker isolate 内でキャッシュ (jose の createRemoteJWKSet が自動でやる)
//   - JWT 共有シークレット不要 (非対称 ES256)
// ───────────────────────────────────────────────────────────────

import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AwsClient } from 'aws4fetch';

const EXT_TO_MIME = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const PRESIGN_EXPIRES_IN = 300;    // 5 分

// ── isolate キャッシュ (cold start 後の 2 回目以降を高速化) ──────
let _jwks = null;
let _r2 = null;

function getJWKS(env) {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(
      new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
    );
  }
  return _jwks;
}

function getR2Client(env) {
  if (!_r2) {
    _r2 = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      service: 's3',
      region: 'auto',
    });
  }
  return _r2;
}

// ── CORS ──────────────────────────────────────────────────────
function corsHeaders(env, origin) {
  const allowList = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '3600',
    'Vary': 'Origin',
  };
  if (origin && allowList.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function jsonResponse(body, status, env, origin) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(env, origin),
    },
  });
}

// ── 認証 ──────────────────────────────────────────────────────
async function verifyAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error('missing Authorization');
  const token = m[1];
  const JWKS = getJWKS(env);
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `${env.SUPABASE_URL}/auth/v1`,
    audience: 'authenticated',
  });
  if (!payload.sub) throw new Error('missing sub claim');
  return { uid: payload.sub, payload };
}

// ── ユーティリティ ───────────────────────────────────────────
function genPhotoId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function sanitizeMemoId(id) {
  return typeof id === 'string' && /^memo_[a-zA-Z0-9_]{1,80}$/.test(id) ? id : null;
}

// ── ハンドラ: POST /upload/memo-photo ─────────────────────────
async function handleMemoPhotoUpload(request, env, origin) {
  let auth;
  try {
    auth = await verifyAuth(request, env);
  } catch (e) {
    return jsonResponse({ error: 'unauthorized', detail: e.message }, 401, env, origin);
  }
  const { uid } = auth;

  const body = await request.json().catch(() => null);
  if (!body) {
    return jsonResponse({ error: 'invalid JSON body' }, 400, env, origin);
  }
  const memoId = sanitizeMemoId(body.memo_id);
  if (!memoId) {
    return jsonResponse({ error: 'invalid memo_id' }, 400, env, origin);
  }
  const ext = String(body.ext || 'webp').toLowerCase();
  if (!EXT_TO_MIME[ext]) {
    return jsonResponse({ error: `unsupported ext: ${ext}` }, 400, env, origin);
  }
  const sizeBytes = Number(body.size_bytes || 0);
  if (!sizeBytes || sizeBytes <= 0 || sizeBytes > MAX_BYTES) {
    return jsonResponse(
      { error: `size out of range (1..${MAX_BYTES})` },
      413,
      env,
      origin
    );
  }

  const photoId = genPhotoId();
  const objectKey = `memos/${uid}/${memoId}/${photoId}.${ext}`;
  const r2 = getR2Client(env);

  const s3Url = new URL(
    `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${objectKey}`
  );
  s3Url.searchParams.set('X-Amz-Expires', String(PRESIGN_EXPIRES_IN));

  const signedReq = await r2.sign(s3Url.toString(), {
    method: 'PUT',
    aws: { signQuery: true },
  });

  const expiresAt = Math.floor(Date.now() / 1000) + PRESIGN_EXPIRES_IN;
  return jsonResponse(
    {
      upload_url: signedReq.url,
      public_url: `${env.CDN_BASE_URL}/${objectKey}`,
      object_key: objectKey,
      expires_at: expiresAt,
    },
    200,
    env,
    origin
  );
}

// ── ハンドラ: GET /me ─────────────────────────────────────────
async function handleMe(request, env, origin) {
  try {
    const { uid, payload } = await verifyAuth(request, env);
    return jsonResponse(
      { uid, email: payload.email || null, role: payload.role || null, exp: payload.exp },
      200,
      env,
      origin
    );
  } catch (e) {
    return jsonResponse({ error: 'unauthorized', detail: e.message }, 401, env, origin);
  }
}

// ── ハンドラ: GET /health ─────────────────────────────────────
function handleHealth(env, origin) {
  return jsonResponse(
    { ok: true, service: 'norireco-api', ts: Date.now() },
    200,
    env,
    origin
  );
}

// ── ルーター ──────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env, origin) });
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return handleHealth(env, origin);
    }
    if (url.pathname === '/me' && request.method === 'GET') {
      return handleMe(request, env, origin);
    }
    if (url.pathname === '/upload/memo-photo' && request.method === 'POST') {
      return handleMemoPhotoUpload(request, env, origin);
    }

    return jsonResponse({ error: 'not found' }, 404, env, origin);
  },
};
