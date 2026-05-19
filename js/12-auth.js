// ══════════════════════════════════════════════════════════════
// 認証 (Supabase Auth)
// Magic Link + Google OAuth、ヘッダボタン + モーダル UI
// 初回ログイン時に user_id=NULL の既存レコードを自分の uid に backfill
// ══════════════════════════════════════════════════════════════

// v195 ES Modules パイロット (案 β) stage 1: 状態を window.NORIRECO.auth に集約。
// v202 ES Modules パイロット (案 β) stage 2: `<script type="module">` 化 (noritetsu-map.html)。
//
// stage 2 の影響:
// - 暗黙 strict mode (use strict 明示と同じ)
// - 暗黙 defer (全 classic script の後に評価)
// - top-level `function` は **module-local**、window には乗らない
//   → HTML onclick / classic script 呼び出し用に末尾で `window.X = X` を明示
//
// state は v195 から既に NORIRECO.auth bridge にあるので、classic script consumer
// (13-mypage-common.js 他) は無変更で動く。SUPABASE_URL / SUPABASE_KEY (classic の
// top-level const) は Global Lexical Environment 経由でモジュールから bare 参照可。
//
// v224 ES Modules stage 3: 3 関数を `export` 公開へ移行。
// v225: 13-mypage-common.renderMypage を import 化。
//   - initAuth (10-init から呼出)
//   - currentUserId (03/07/09/13-mypage-common から)
//   - authBearerToken (09/13-mypage-common/13b から)
// 以下は window bridge 維持 (HTML onclick または HTML 文字列生成内 onclick から呼出):
//   - openAuthModal / closeAuthModal / handleAuthMagicLinkSubmit / handleAuthGoogleClick / signOutUser
//
// v228: SIGNED_OUT 時のローカル乗車データ purge のため 07/05 を import。
//   12 ↔ 07 は循環 import (07 が currentUserId を import) だが両側 function export
//   なので ES Modules の hoisting で解決される (03 ↔ 07 と同じ前例)。
import { renderMypage } from './13-mypage-common.js';
import { redrawAllLinesAfterTripChange } from './07-record-mode.js';
import { updateStorageUI } from './05-supabase-data.js';
import { updateOverlays } from './08-rendering.js';

window.NORIRECO = window.NORIRECO || {};
window.NORIRECO.auth = window.NORIRECO.auth || {
  supabaseAuthClient: null,    // Supabase JS SDK client (auth 専用)
  currentUser: null,           // { id, email, ... } or null
  currentSession: null,
  authBackfillRan: false,      // 初回ログインの backfill 重複防止
};
const auth = window.NORIRECO.auth;

// SDK 初期化 (CDN 経由で読み込まれた supabase グローバルを使う)
export async function initAuth() {
  console.log('[Auth] initAuth 開始');
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.warn('[Auth] Supabase JS SDK が未ロード');
    return;
  }
  auth.supabaseAuthClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: window.localStorage,
      storageKey: 'norireco-auth',
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
  console.log('[Auth] client 作成完了');

  // ログイン/ログアウトイベント購読 (createClient 直後に register)
  auth.supabaseAuthClient.auth.onAuthStateChange((event, session) => {
    handleAuthChange(event, session);
  });

  // URL に OAuth コールバック痕跡があれば手動 exchange (SDK auto-detect の取りこぼし対策)
  const _url = new URL(window.location.href);
  const _code = _url.searchParams.get('code');
  const _error = _url.searchParams.get('error') || (_url.hash.match(/error=([^&]+)/) || [])[1];
  if (_error) {
    console.warn('[Auth] OAuth エラー応答:', _error, _url.searchParams.get('error_description') || '');
    setAuthMsg('error', `OAuth エラー: ${_error}`);
  }
  if (_code) {
    console.log('[Auth] PKCE code 検出 → 手動 exchange 試行...');
    try {
      const { data, error } = await auth.supabaseAuthClient.auth.exchangeCodeForSession(_code);
      if (error) {
        console.warn('[Auth] exchange 失敗:', error.message);
      } else if (data?.session) {
        console.log('[Auth] exchange 成功 uid=' + data.session.user.id.slice(0,8));
      }
      // URL から code を除去
      _url.searchParams.delete('code');
      history.replaceState({}, document.title, _url.toString());
    } catch (e) {
      console.warn('[Auth] exchange 例外:', e.message || e);
    }
  }

  // 起動時にセッション復元
  try {
    const { data, error } = await auth.supabaseAuthClient.auth.getSession();
    if (error) console.warn('[Auth] getSession エラー:', error.message);
    if (data.session) {
      console.log('[Auth] セッション復元 uid=' + data.session.user.id.slice(0,8));
      handleAuthChange('INITIAL_SESSION', data.session);
    } else {
      console.log('[Auth] 初期セッションなし (未ログイン)');
      updateAuthHeaderUI();
    }
  } catch (e) {
    console.warn('[Auth] getSession 例外:', e.message || e);
    updateAuthHeaderUI();
  }
}

function handleAuthChange(event, session) {
  auth.currentSession = session;
  auth.currentUser = session?.user || null;
  console.log(`[Auth] ${event}`, auth.currentUser ? `uid=${auth.currentUser.id.slice(0,8)}` : '(logout)');
  updateAuthHeaderUI();
  closeAuthModal();
  // 初回ログイン (SIGNED_IN) は backfill
  if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && auth.currentUser && !auth.authBackfillRan) {
    auth.authBackfillRan = true;
    backfillUserIdForLegacyData(auth.currentUser.id);
  }
  // v228: ログアウト時はローカルに残った前ユーザーの乗車データ・キャラ獲得を purge し、
  // 地図を空状態で再描画する (Supabase のデータは破壊しない)。
  if (event === 'SIGNED_OUT') {
    clearLocalUserDataAfterSignOut();
  }
  // マイページが開いていれば再描画
  const mypage = document.getElementById('pane-mypage');
  if (mypage && mypage.classList.contains('active')) {
    setTimeout(() => renderMypage(), 100);
  }
}

// SIGNED_OUT 時に呼ぶ: 前ユーザーの localStorage / in-memory 乗車状態を消し、地図を更新。
// Supabase 側のデータには触らない (再ログインで復元できる前提)。
function clearLocalUserDataAfterSignOut() {
  try { localStorage.removeItem('norireco_trips'); } catch(e) {}
  try { localStorage.removeItem('norireco_owned_characters'); } catch(e) {}
  try { localStorage.removeItem('norireco_station_char_pick'); } catch(e) {}
  // in-memory RIDDEN_SEGS を空に (window bridge 経由 — 05 が export 済の共有配列)
  if (Array.isArray(window.RIDDEN_SEGS)) {
    window.RIDDEN_SEGS.length = 0;
  }
  // 派生状態 (slRiddenSt / slStopType / slVisitCount / riddenServiceIds) を再構築 → 空になる
  try { window.NORIRECO?.rideRecord?.rebuild(); } catch(e) {}
  // 地図再描画 + 達成率/系統数バッジ (h-pct/h-ln/ms-pct/ms-ln/ms-dn) と凡例の更新
  try { redrawAllLinesAfterTripChange(); } catch(e) {}
  try { updateOverlays(); } catch(e) {}
  // ストレージ表示ラベルを「📄 静的データ」相当に
  try { updateStorageUI(0, 'static'); } catch(e) {}
  // マイページキャッシュも空に (renderMypage は未ログイン時に空状態を出すが、
  // 念のためキャッシュ自体をクリアして他経路からの参照が漏れないようにする)
  try { if (window.NORIRECO?.mypage?.state) window.NORIRECO.mypage.state._mypageCache = null; } catch(e) {}
  console.log('[Auth] ローカル乗車データを purge しました (ログアウト)');
}

// ── 認証アクション ──────────────────────────────────────────────
// クリーンなコールバック URL を返す (現在の query/hash を除外)
// 既存の hash (例: #map=12) が付いていると OAuth code との衝突や SDK パース失敗を招くため
function authCleanRedirectUrl() {
  return window.location.origin + window.location.pathname;
}

async function signInWithMagicLink(email) {
  if (!auth.supabaseAuthClient) return { error: { message: 'SDK 未初期化' } };
  if (!email || !/.+@.+\..+/.test(email)) return { error: { message: 'メールアドレスが不正です' } };
  const { error } = await auth.supabaseAuthClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: authCleanRedirectUrl() },
  });
  return { error };
}

async function signInWithGoogle() {
  if (!auth.supabaseAuthClient) return { error: { message: 'SDK 未初期化' } };
  const { error } = await auth.supabaseAuthClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authCleanRedirectUrl() },
  });
  return { error };
}

async function signOutUser() {
  if (!auth.supabaseAuthClient) return;
  await auth.supabaseAuthClient.auth.signOut();
  auth.authBackfillRan = false;
}

// 認証ヘッダ (Authorization Bearer) を access_token があれば返す
// 既存の anon key fetch を漸進的に切り替えるためのヘルパー
export function authBearerToken() {
  return auth.currentSession?.access_token || SUPABASE_KEY;
}

// 現在ログインしている user_id を返す (未ログイン時は null)
export function currentUserId() {
  return auth.currentUser?.id || null;
}

// ── 既存データの user_id バックフィル ──────────────────────────
// 初回ログイン時 1 回だけ実行: user_id=NULL のレコードを自分の uid に PATCH
async function backfillUserIdForLegacyData(uid) {
  const tables = ['norireco_trips', 'norireco_character_grants', 'norireco_memos'];
  for (const tbl of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${tbl}?user_id=is.null`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${authBearerToken()}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ user_id: uid }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (updated.length > 0) {
          console.log(`[Auth] backfill ${tbl}: ${updated.length}件 → uid=${uid.slice(0,8)}`);
        }
      } else {
        // user_id 列が無い等のスキーマエラー時はサイレント (migration 未実行)
        const errBody = await res.text();
        console.warn(`[Auth] backfill ${tbl} 失敗:`, errBody.slice(0, 200));
      }
    } catch (e) {
      console.warn(`[Auth] backfill ${tbl} 接続エラー:`, e.message);
    }
  }
}

// ── ヘッダ UI ──────────────────────────────────────────────────
function updateAuthHeaderUI() {
  // body にログイン状態を反映 (CSS で .fab-login-only の表示制御に使う)
  document.body.classList.toggle('user-authed', !!auth.currentUser);
  document.body.classList.toggle('user-anonymous', !auth.currentUser);

  const btn = document.getElementById('auth-btn');
  if (!btn) return;
  if (auth.currentUser) {
    // ログイン中: アバター + メール (簡易表示)
    const email = auth.currentUser.email || '';
    const initial = (email[0] || '?').toUpperCase();
    btn.innerHTML = `<span class="auth-avatar">${initial}</span><span class="auth-email">${email.split('@')[0]}</span>`;
    btn.title = `ログイン中: ${email}\nクリックでログアウト`;
    btn.onclick = () => {
      if (confirm(`${email} からログアウトしますか?`)) signOutUser();
    };
  } else {
    btn.innerHTML = '🔑 ログイン';
    btn.title = 'ログイン / 会員登録';
    btn.onclick = openAuthModal;
  }
}

function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.add('open');
  // フォーカス
  setTimeout(() => document.getElementById('auth-email-input')?.focus(), 50);
}
function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.remove('open');
  // メッセージリセット
  const msg = document.getElementById('auth-msg');
  if (msg) { msg.textContent = ''; msg.className = 'auth-msg'; }
}

async function handleAuthMagicLinkSubmit() {
  const email = document.getElementById('auth-email-input')?.value?.trim();
  const msg = document.getElementById('auth-msg');
  const btn = document.getElementById('auth-magic-btn');
  if (!email) { setAuthMsg('error', 'メールアドレスを入力してください'); return; }
  if (btn) { btn.disabled = true; btn.textContent = '送信中...'; }
  const { error } = await signInWithMagicLink(email);
  if (btn) { btn.disabled = false; btn.textContent = '✉️ Magic Link を送信'; }
  if (error) setAuthMsg('error', error.message || '送信に失敗しました');
  else setAuthMsg('success', `✓ ${email} にログインリンクを送信しました。メールを確認してください。`);
}

async function handleAuthGoogleClick() {
  const btn = document.getElementById('auth-google-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'リダイレクト中...'; }
  const { error } = await signInWithGoogle();
  if (error) {
    setAuthMsg('error', error.message || 'Google ログインに失敗しました');
    if (btn) { btn.disabled = false; btn.textContent = '🔵 Google でログイン'; }
  }
  // 成功時はリダイレクトが発生する
}

function setAuthMsg(kind, text) {
  const msg = document.getElementById('auth-msg');
  if (!msg) return;
  msg.textContent = text;
  msg.className = `auth-msg auth-msg-${kind}`;
}

// HTML onclick / classic script consumer 用に window へ公開。
// module-scoped function は globalThis に自動登録されないため、ここで明示的に bridge する。
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.handleAuthMagicLinkSubmit = handleAuthMagicLinkSubmit;
window.handleAuthGoogleClick = handleAuthGoogleClick;
// signOutUser は 13-mypage-common.js が生成する HTML 文字列内 onclick から呼ばれる。
window.signOutUser = signOutUser;
// v224 stage 3: initAuth / currentUserId / authBearerToken は `export` 経由に移行。
// consumer (10-init / 03 / 07 / 09 / 13-mypage-common / 13b) は import で取り込む。
