// 13e-admin.js — マイページ「🛠 admin」サブタブ (v426)
//
// 目的: 垢BAN 管理 GUI MVP。BAN/warn 履歴のあるユーザー一覧 + uid/email 検索 + 状態変更 4 ボタン。
//
// セキュリティ:
//   - 表示制御は window.NORIRECO.profile.is_admin (12-auth.fetchMyProfile が set)
//   - 最終防御は RPC 関数内の `is_admin()` ゲート (v426 SQL):
//     * admin_list_profiles / admin_search_user / admin_set_account_status
//     非 admin が叩いても 400 + 'admin only' で弾かれる
//   - クライアント側 is_admin の偽装は可能だが、操作は RPC を通すので何もできない
//
// 真実の源 = norireco_admins テーブル (本人のみ SELECT)、初期 admin (ユスケ) は
// Dashboard で手動 INSERT (v426 migration の運用コメント参照)。

// v426 hotfix: SUPABASE_URL / SUPABASE_KEY は 12-auth.js が export していない (classic
//   top-level const を Global Lexical Environment 経由で bare 参照する設計)。本 module 化
//   ファイルからは bare 参照だと undefined になるため window.SUPABASE_URL / window.SUPABASE_KEY
//   経由でアクセスする (21-bulk-record.js と同じパターン)。
import { authBearerToken, currentUserId } from './12-auth.js';

window.NORIRECO = window.NORIRECO || {};
NORIRECO.mypage = NORIRECO.mypage || {};

// ── 内部状態 ─────────────────────────────────────────────────
const A = {
  rows: [],         // 直近 fetch 結果 (一覧 or 検索結果)
  mode: 'list',     // 'list' | 'search'
  query: '',
  loading: false,
};

// ── RPC 共通 ─────────────────────────────────────────────────
async function callRpc(fnName, body) {
  const res = await fetch(`${window.SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'apikey': window.SUPABASE_KEY,
      'Authorization': `Bearer ${authBearerToken()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`RPC ${fnName} ${res.status}: ${t.slice(0, 200)}`);
  }
  // void RETURN の場合は空文字、TABLE RETURN の場合は JSON 配列
  const txt = await res.text();
  if (!txt) return null;
  try { return JSON.parse(txt); } catch { return txt; }
}

// ── HTML escape ──────────────────────────────────────────────
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function statusBadge(st) {
  const s = st || 'ok';
  const base = 'display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;';
  if (s === 'ok') return `<span style="${base}color:var(--silver);border:1px solid var(--track)">ok</span>`;
  if (s === 'warn') return `<span style="${base}color:var(--gold);border:1px solid var(--gold)">⚠️ warn</span>`;
  if (s === 'share_banned') return `<span style="${base}color:var(--red);border:1px solid var(--red)">🚫 share_banned</span>`;
  if (s === 'full_banned') return `<span style="${base}color:var(--red);border:1px solid var(--red);background:rgba(255,0,0,0.08)">🚫🚫 full_banned</span>`;
  return `<span style="${base}">${esc(s)}</span>`;
}

// ── 一覧 / 検索 取得 ─────────────────────────────────────────
async function loadList() {
  A.loading = true; A.mode = 'list'; A.query = '';
  renderShell();
  try {
    const rows = await callRpc('admin_list_profiles', {});
    A.rows = Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn('[admin] list error:', e.message);
    A.rows = [];
    alert('一覧取得に失敗: ' + e.message);
  } finally {
    A.loading = false;
    renderShell();
  }
}

async function searchUsers(q) {
  q = (q || '').trim();
  if (!q) { return loadList(); }
  A.loading = true; A.mode = 'search'; A.query = q;
  renderShell();
  try {
    const rows = await callRpc('admin_search_user', { q });
    A.rows = Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn('[admin] search error:', e.message);
    A.rows = [];
    alert('検索に失敗: ' + e.message);
  } finally {
    A.loading = false;
    renderShell();
  }
}

// ── 状態変更 ─────────────────────────────────────────────────
async function setStatus(uid, newStatus) {
  // 自分自身を BAN しないようガード (admin 自爆防止 — service_role でなければ復帰不能になる)
  if (uid === currentUserId() && newStatus !== 'ok') {
    alert('⚠️ 自分自身の状態は変更できません (admin 自爆防止)。');
    return;
  }
  const labels = { ok: '解除 (ok)', warn: '警告 (warn)', share_banned: 'シェア停止 (share_banned)', full_banned: 'アカウント停止 (full_banned)' };
  const label = labels[newStatus] || newStatus;
  let reason = null;
  if (newStatus !== 'ok') {
    reason = prompt(`${label} の理由を入力してください (任意、ban_reason に保存):`, '');
    if (reason === null) return;  // キャンセル
    reason = reason.trim() || null;
  }
  if (!confirm(`user_id: ${uid}\n→ ${label}\n\n実行しますか？`)) return;
  try {
    await callRpc('admin_set_account_status', { target_uid: uid, new_status: newStatus, reason });
  } catch (e) {
    alert('状態変更に失敗: ' + e.message);
    return;
  }
  // 直近表示の rows を再取得
  if (A.mode === 'search' && A.query) await searchUsers(A.query);
  else await loadList();
}
window.NORIRECO.admin = { setStatus, searchUsers, loadList };

// ── レンダリング ─────────────────────────────────────────────
function renderShell() {
  const c = document.getElementById('mp-admin-section');
  if (!c) return;
  const rowsHtml = A.loading
    ? `<div class="mp-loading" style="padding:14px">⏳ 読み込み中…</div>`
    : (A.rows.length === 0
        ? `<div class="mp-empty-s" style="padding:14px">${A.mode === 'search' ? '🔍 該当ユーザーなし' : '📭 BAN/warn 履歴のあるユーザーはいません'}</div>`
        : A.rows.map(rowHtml).join(''));

  c.innerHTML = `
    <div style="padding:12px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="mp-act-btn" onclick="NORIRECO.admin.loadList()">📋 BAN/warn 一覧 (${A.mode === 'list' && !A.loading ? A.rows.length : '—'})</button>
        <span style="font-size:11px;color:var(--silver)">真実の源 = norireco_profiles に行があるユーザー</span>
      </div>
      <div style="display:flex;gap:6px">
        <input type="text" id="mp-admin-search-input" placeholder="email または uid で検索 (部分一致)" value="${esc(A.query)}"
               style="flex:1;padding:6px 10px;background:var(--track);border:1px solid var(--silver);color:var(--text);border-radius:6px;font-size:13px"
               onkeydown="if(event.key==='Enter'){NORIRECO.admin.searchUsers(this.value)}">
        <button class="mp-act-btn" onclick="NORIRECO.admin.searchUsers(document.getElementById('mp-admin-search-input').value)">🔍 検索</button>
      </div>
      <div id="mp-admin-rows" style="display:flex;flex-direction:column;gap:8px">
        ${rowsHtml}
      </div>
    </div>
  `;
}

function rowHtml(p) {
  const uid = p.user_id;
  const email = p.email || '(email 不明)';
  const status = p.share_status || 'ok';
  const reason = p.ban_reason || '';
  const updated = fmtDate(p.updated_at);
  const isMe = uid === currentUserId();
  const meTag = isMe ? `<span style="font-size:10px;color:var(--gold);margin-left:6px">(自分)</span>` : '';
  return `
    <div style="border:1px solid var(--track);border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:6px">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${statusBadge(status)}
        <span style="font-size:13px;font-weight:600">${esc(email)}</span>
        ${meTag}
      </div>
      <div style="font-size:11px;color:var(--silver);font-family:monospace;word-break:break-all">${esc(uid)}</div>
      ${reason ? `<div style="font-size:12px;color:var(--silver)">理由: ${esc(reason)}</div>` : ''}
      <div style="font-size:11px;color:var(--silver)">最終更新: ${updated}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
        <button class="mp-act-btn" ${isMe ? 'disabled' : ''} onclick="NORIRECO.admin.setStatus('${esc(uid)}','ok')" style="${status==='ok'?'opacity:0.5':''}">ok (解除)</button>
        <button class="mp-act-btn" ${isMe ? 'disabled' : ''} onclick="NORIRECO.admin.setStatus('${esc(uid)}','warn')" style="color:var(--gold);${status==='warn'?'opacity:0.5':''}">⚠️ warn</button>
        <button class="mp-act-btn" ${isMe ? 'disabled' : ''} onclick="NORIRECO.admin.setStatus('${esc(uid)}','share_banned')" style="color:var(--red);${status==='share_banned'?'opacity:0.5':''}">🚫 share_banned</button>
        <button class="mp-act-btn" ${isMe ? 'disabled' : ''} onclick="NORIRECO.admin.setStatus('${esc(uid)}','full_banned')" style="color:var(--red);${status==='full_banned'?'opacity:0.5':''}">🚫🚫 full_banned</button>
      </div>
    </div>
  `;
}

// ── エントリ (renderMpAdminSection) ───────────────────────────
export function renderMpAdminSection() {
  // is_admin でない場合の念のための拒否 (タブ自体は出ない設計だが直接叩かれた場合の防御)
  if (!window.NORIRECO?.profile?.is_admin) {
    const c = document.getElementById('mp-admin-section');
    if (c) c.innerHTML = `<div class="mp-empty-s" style="padding:14px">🔒 admin 限定</div>`;
    return;
  }
  // 初回 or 復帰時に一覧をロード
  if (A.rows.length === 0 && !A.loading) {
    loadList();
  } else {
    renderShell();
  }
}
NORIRECO.mypage.renderMpAdminSection = renderMpAdminSection;
