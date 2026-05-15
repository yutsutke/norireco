// ══════════════════════════════════════════════════════════════
// 認証 (Supabase Auth)
// Magic Link + Google OAuth、ヘッダボタン + モーダル UI
// 初回ログイン時に user_id=NULL の既存レコードを自分の uid に backfill
// ══════════════════════════════════════════════════════════════

let supabaseAuthClient = null;     // Supabase JS SDK client (auth 専用)
let currentUser = null;            // { id, email, ... } or null
let currentSession = null;
let authBackfillRan = false;       // 初回ログインの backfill 重複防止

// SDK 初期化 (CDN 経由で読み込まれた supabase グローバルを使う)
function initAuth() {
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.warn('[Auth] Supabase JS SDK が未ロード');
    return;
  }
  supabaseAuthClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: window.localStorage,
      storageKey: 'norireco-auth',
    },
  });

  // 起動時にセッション復元
  supabaseAuthClient.auth.getSession().then(({ data }) => {
    if (data.session) handleAuthChange('INITIAL_SESSION', data.session);
    else updateAuthHeaderUI();
  });

  // ログイン/ログアウトイベント購読
  supabaseAuthClient.auth.onAuthStateChange((event, session) => {
    handleAuthChange(event, session);
  });
}

function handleAuthChange(event, session) {
  currentSession = session;
  currentUser = session?.user || null;
  console.log(`[Auth] ${event}`, currentUser ? `uid=${currentUser.id.slice(0,8)}` : '(logout)');
  updateAuthHeaderUI();
  closeAuthModal();
  // 初回ログイン (SIGNED_IN) は backfill
  if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && currentUser && !authBackfillRan) {
    authBackfillRan = true;
    backfillUserIdForLegacyData(currentUser.id);
  }
}

// ── 認証アクション ──────────────────────────────────────────────
async function signInWithMagicLink(email) {
  if (!supabaseAuthClient) return { error: { message: 'SDK 未初期化' } };
  if (!email || !/.+@.+\..+/.test(email)) return { error: { message: 'メールアドレスが不正です' } };
  const { error } = await supabaseAuthClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href },
  });
  return { error };
}

async function signInWithGoogle() {
  if (!supabaseAuthClient) return { error: { message: 'SDK 未初期化' } };
  const { error } = await supabaseAuthClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href },
  });
  return { error };
}

async function signOutUser() {
  if (!supabaseAuthClient) return;
  await supabaseAuthClient.auth.signOut();
  authBackfillRan = false;
}

// 認証ヘッダ (Authorization Bearer) を access_token があれば返す
// 既存の anon key fetch を漸進的に切り替えるためのヘルパー
function authBearerToken() {
  return currentSession?.access_token || SUPABASE_KEY;
}

// 現在ログインしている user_id を返す (未ログイン時は null)
function currentUserId() {
  return currentUser?.id || null;
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
  const btn = document.getElementById('auth-btn');
  if (!btn) return;
  if (currentUser) {
    // ログイン中: アバター + メール (簡易表示)
    const email = currentUser.email || '';
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
