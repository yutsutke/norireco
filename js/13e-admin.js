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
  view: 'ban',      // 'ban' (BAN/warn 管理) | 'share' (シェア計測 横断ビュー、v438)
  rows: [],         // 直近 fetch 結果 (一覧 or 検索結果)
  mode: 'list',     // 'list' | 'search'
  query: '',
  loading: false,
  shareRows: [],    // v438: admin_list_share_metrics の結果
  shareLoading: false,
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

// ── シェア計測 横断ビュー (v438) ─────────────────────────────
async function loadShareMetrics() {
  A.shareLoading = true;
  renderShell();
  try {
    const rows = await callRpc('admin_list_share_metrics', {});
    A.shareRows = Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn('[admin] share metrics error:', e.message);
    A.shareRows = [];
    alert('シェア計測の取得に失敗: ' + e.message);
  } finally {
    A.shareLoading = false;
    renderShell();
  }
}

// ビュー切替 (BAN管理 ⇄ シェア計測)。シェア計測は初回のみ自動ロード。
function showView(v) {
  A.view = (v === 'share') ? 'share' : 'ban';
  if (A.view === 'share' && A.shareRows.length === 0 && !A.shareLoading) {
    loadShareMetrics();
  } else {
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
// v439: シェア計測ビューを 1 枚に保存 (#admin-share-capture = サマリ + ランキング、ツールバー除く)。
// html2canvas ベースの共通ヘルパー (14-share-ogp.js) を window 経由で呼ぶ。
function captureMetrics(btn) {
  const el = document.getElementById('admin-share-capture');
  const fn = `norireco-share-metrics-${new Date().toISOString().slice(0, 10)}.png`;
  window.NORIRECO?.share?.captureElementToPng?.(el, fn, btn);
}
window.NORIRECO.admin = { setStatus, searchUsers, loadList, showView, loadShareMetrics, captureMetrics };

// ── レンダリング ─────────────────────────────────────────────
function renderShell() {
  const c = document.getElementById('mp-admin-section');
  if (!c) return;
  const tab = (v, label) => `<button class="mp-act-btn" onclick="NORIRECO.admin.showView('${v}')" style="${A.view === v ? 'color:var(--gold);border-color:var(--gold)' : ''}">${label}</button>`;
  const viewNav = `
    <div style="display:flex;gap:6px;border-bottom:1px solid var(--track);padding-bottom:10px">
      ${tab('ban', '🚫 BAN管理')}
      ${tab('share', '📊 シェア計測')}
    </div>`;
  const body = A.view === 'share' ? shareBodyHtml() : banBodyHtml();
  c.innerHTML = `
    <div style="padding:12px;display:flex;flex-direction:column;gap:10px">
      ${viewNav}
      ${body}
    </div>
  `;
}

// BAN/warn 管理ビュー本体 (v426 からの内容)。
function banBodyHtml() {
  const rowsHtml = A.loading
    ? `<div class="mp-loading" style="padding:14px">⏳ 読み込み中…</div>`
    : (A.rows.length === 0
        ? `<div class="mp-empty-s" style="padding:14px">${A.mode === 'search' ? '🔍 該当ユーザーなし' : '📭 BAN/warn 履歴のあるユーザーはいません'}</div>`
        : A.rows.map(rowHtml).join(''));
  return `
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
  `;
}

// シェア計測 横断ビュー本体 (v438)。サマリ (Σview→click→signup + CTR/登録率) + シェア別ランキング。
function shareBodyHtml() {
  if (A.shareLoading) return `<div class="mp-loading" style="padding:14px">⏳ シェア計測を読み込み中…</div>`;
  const rows = A.shareRows || [];
  const refreshBtn = `<button class="mp-act-btn" onclick="NORIRECO.admin.loadShareMetrics()">🔄 再読み込み</button>`;
  if (!rows.length) {
    return `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${refreshBtn}<span style="font-size:11px;color:var(--silver)">全シェアの view→click→signup を俯瞰</span></div>
            <div class="mp-empty-s" style="padding:14px">📭 シェアはまだありません</div>`;
  }
  let tv = 0, tc = 0, ts = 0;
  rows.forEach(r => { tv += (+r.view_count || 0); tc += (+r.click_count || 0); ts += (+r.signup_count || 0); });
  const pct = (n, d) => d ? (n / d * 100).toFixed(1) : '0.0';
  const summary = `
    <div style="border:1px solid var(--track);border-radius:8px;padding:12px;background:var(--track)">
      <div style="font-size:12px;color:var(--silver);margin-bottom:6px">📤 シェア ${rows.length} 件の合計</div>
      <div style="font-size:14px;font-weight:700;line-height:1.8">
        👁 ${tv.toLocaleString()} 表示<span style="color:var(--silver)"> → </span>🚃 ${tc.toLocaleString()} クリック <span style="font-size:11px;color:var(--silver)">(CTR ${pct(tc, tv)}%)</span><span style="color:var(--silver)"> → </span>✨ ${ts.toLocaleString()} 登録 <span style="font-size:11px;color:var(--silver)">(登録率 ${pct(ts, tc)}%)</span>
      </div>
    </div>`;
  return `<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap">
            <span style="font-size:11px;color:var(--silver)">engagement 降順 (signup→click→view)</span>
            <span style="display:flex;gap:6px">${refreshBtn}<button class="mp-act-btn" onclick="NORIRECO.admin.captureMetrics(this)">📷 スクショ保存</button></span>
          </div>
          <div id="admin-share-capture" style="display:flex;flex-direction:column;gap:10px;background:var(--navy,#0D1B2A);padding:2px">
            ${summary}
            <div style="display:flex;flex-direction:column;gap:8px">${rows.map(shareRowHtml).join('')}</div>
          </div>`;
}

function shareRowHtml(r) {
  const v = +r.view_count || 0, c = +r.click_count || 0, s = +r.signup_count || 0;
  const kindLabel = r.kind === 'profile' ? '完乗プロフィール' : '旅程';
  const ctr = v ? (c / v * 100).toFixed(0) : '0';
  const email = r.email || '(email 不明)';
  const rev = r.revoked ? `<span style="font-size:10px;color:var(--red);border:1px solid var(--red);border-radius:8px;padding:1px 6px">取消済</span>` : '';
  return `
    <div style="border:1px solid var(--track);border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:5px;${r.revoked ? 'opacity:0.6' : ''}">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="font-size:13px;font-weight:700;word-break:break-word">${esc(r.title || '(無題)')}</span>
        <span class="mp-badge" style="background:rgba(140,160,179,.1);color:var(--silver);border:1px solid var(--track)">${kindLabel}</span>
        ${rev}
      </div>
      <div style="font-size:13px;font-weight:700">👁 ${v.toLocaleString()} ・ 🚃 ${c.toLocaleString()} <span style="font-size:11px;color:var(--silver)">(CTR ${ctr}%)</span> ・ ✨ ${s.toLocaleString()} 登録</div>
      <div style="font-size:11px;color:var(--silver);word-break:break-all">${esc(email)} ・ ${fmtDate(r.created_at)} ・ <span style="font-family:monospace">${esc(r.id)}</span></div>
    </div>`;
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
  // 初回 or 復帰時のロード (アクティブなビューに応じて)
  if (A.view === 'share') {
    if (A.shareRows.length === 0 && !A.shareLoading) loadShareMetrics();
    else renderShell();
    return;
  }
  if (A.rows.length === 0 && !A.loading) {
    loadList();
  } else {
    renderShell();
  }
}
NORIRECO.mypage.renderMpAdminSection = renderMpAdminSection;
