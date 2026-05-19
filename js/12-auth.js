// ══════════════════════════════════════════════════════════════
// 認証 (Supabase Auth)
// Magic Link + Google OAuth、ヘッダボタン + モーダル UI
// 初回ログイン時に user_id=NULL の既存レコードを自分の uid に backfill
// ══════════════════════════════════════════════════════════════

// v195 ES Modules パイロット (案 β) — 状態を window.NORIRECO.auth に集約。
// stage 2 (type=module 化) では `export const auth` に置き換え、この
// `window.NORIRECO.auth = auth` ブリッジで classic script consumer
// (13-mypage-common.js 他) との互換を保つ。
window.NORIRECO = window.NORIRECO || {};
window.NORIRECO.auth = window.NORIRECO.auth || {
  supabaseAuthClient: null,    // Supabase JS SDK client (auth 専用)
  currentUser: null,           // { id, email, ... } or null
  currentSession: null,
  authBackfillRan: false,      // 初回ログインの backfill 重複防止
};
const auth = window.NORIRECO.auth;

// SDK 初期化 (CDN 経由で読み込まれた supabase グローバルを使う)
async function initAuth() {
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
  // マイページが開いていれば再描画
  const mypage = document.getElementById('pane-mypage');
  if (mypage && mypage.classList.contains('active') && typeof renderMypage === 'function') {
    setTimeout(() => renderMypage(), 100);
  }
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
function authBearerToken() {
  return auth.currentSession?.access_token || SUPABASE_KEY;
}

// 現在ログインしている user_id を返す (未ログイン時は null)
function currentUserId() {
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

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.handleAuthMagicLinkSubmit = handleAuthMagicLinkSubmit;
window.handleAuthGoogleClick = handleAuthGoogleClick;
