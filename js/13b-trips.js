// ══════════════════════════════════════════════════════════════
// マイページ 🚃 旅程サブタブ (v190 分割)
// - 旅程フィルタバー (期間 / 認証 / 種別 / 並び替え)
// - 旅程リスト描画 (tripCardHtml は 13-mypage-common.js)
// - Trip 編集モーダル (メモ・遅延の後追い編集) v184/v185
// - GPS 後追い認証 (半径 500m 以内で verified=true に昇格) v138
// - 旅程削除
//
// 共通レイヤー (13-mypage-common.js) の以下を使用:
//   - NORIRECO.mypage.state._mypageCache / NORIRECO.mypage.state.mpTripFilter / _MP_SORT_COMPARATORS
//   - tripCardHtml / showMypageToast / applyMpSection / renderMypage
// 新規・移動分の関数は NORIRECO.mypage.xxx にも公開。
//
// v205 ES Modules パイロット (案 β) stage 2: `<script type="module">` 化。
// 内部関数は既に末尾で `window.X = X` + `NORIRECO.mypage.X = X` の両建て登録済みのため、
// stage 2 追加 bridge ゼロ。外部参照 (tripCardHtml / showMypageToast / filterTripsByDate /
// _MP_SORT_COMPARATORS) は classic function 宣言 + Global Lexical Env 経由で module から
// bare 識別子として読める。
//
// v223 ES Modules stage 3: 11-fraud-detection と 03-characters を import 化。
// v224: 12-auth.authBearerToken を import 化。
// ══════════════════════════════════════════════════════════════
import { fraudIsDowngraded } from './11-fraud-detection.js';
import { distMeters, runCharacterGrantCheck } from './03-characters.js';
import { authBearerToken } from './12-auth.js';

// ── 🚃 旅程セクション ──────────────────────────────────────────
function renderMpTripsSection() {
  const sec = document.getElementById('mp-trip-section');
  if (!sec) return;
  sec.innerHTML = '';

  // フィルタバー
  sec.appendChild(buildTripFilterBar());

  // フィルタ適用
  const filtered = applyTripFilters(NORIRECO.mypage.state._mypageCache || []);

  // 件数表示
  const head = document.createElement('div');
  head.className = 'sec-lbl';
  head.innerHTML = `自分の旅程 (${filtered.length} / ${(NORIRECO.mypage.state._mypageCache||[]).length} 件)`;
  sec.appendChild(head);

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'mp-empty-s';
    empty.style.padding = '20px';
    empty.textContent = 'フィルタ条件に合致する旅程がありません';
    sec.appendChild(empty);
    return;
  }

  // trip list
  sec.appendChild(buildTripList(filtered));
}
NORIRECO.mypage.renderMpTripsSection = renderMpTripsSection;

function buildTripFilterBar() {
  const bar = document.createElement('div');
  bar.className = 'mp-filter-bar';
  bar.innerHTML = `
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">📅 期間</label>
      <select class="mp-filter-sel" id="mp-fil-period" onchange="updateMpFilter('period',this.value)">
        <option value="all" ${NORIRECO.mypage.state.mpTripFilter.period==='all'?'selected':''}>全期間</option>
        <option value="thisYear" ${NORIRECO.mypage.state.mpTripFilter.period==='thisYear'?'selected':''}>今年</option>
        <option value="lastYear" ${NORIRECO.mypage.state.mpTripFilter.period==='lastYear'?'selected':''}>去年</option>
        <option value="thisMonth" ${NORIRECO.mypage.state.mpTripFilter.period==='thisMonth'?'selected':''}>今月</option>
        <option value="last7" ${NORIRECO.mypage.state.mpTripFilter.period==='last7'?'selected':''}>直近7日</option>
      </select>
    </div>
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">🛡 認証</label>
      <select class="mp-filter-sel" id="mp-fil-auth" onchange="updateMpFilter('auth',this.value)">
        <option value="all" ${NORIRECO.mypage.state.mpTripFilter.auth==='all'?'selected':''}>すべて</option>
        <option value="verified" ${NORIRECO.mypage.state.mpTripFilter.auth==='verified'?'selected':''}>🟢 GPS 記録</option>
        <option value="manual" ${NORIRECO.mypage.state.mpTripFilter.auth==='manual'?'selected':''}>⚪ 手動記録</option>
        <option value="suspicious" ${NORIRECO.mypage.state.mpTripFilter.auth==='suspicious'?'selected':''}>🟡 要確認 (降格)</option>
      </select>
    </div>
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">🚆 種別</label>
      <select class="mp-filter-sel" id="mp-fil-cat" onchange="updateMpFilter('category',this.value)">
        <option value="all" ${NORIRECO.mypage.state.mpTripFilter.category==='all'?'selected':''}>すべて</option>
        <option value="shinkansen" ${NORIRECO.mypage.state.mpTripFilter.category==='shinkansen'?'selected':''}>新幹線</option>
        <option value="limited_express" ${NORIRECO.mypage.state.mpTripFilter.category==='limited_express'?'selected':''}>特急</option>
        <option value="express" ${NORIRECO.mypage.state.mpTripFilter.category==='express'?'selected':''}>急行</option>
        <option value="rapid" ${NORIRECO.mypage.state.mpTripFilter.category==='rapid'?'selected':''}>快速</option>
        <option value="sleeper" ${NORIRECO.mypage.state.mpTripFilter.category==='sleeper'?'selected':''}>寝台</option>
        <option value="cruise_train" ${NORIRECO.mypage.state.mpTripFilter.category==='cruise_train'?'selected':''}>クルーズ</option>
        <option value="joyful_train" ${NORIRECO.mypage.state.mpTripFilter.category==='joyful_train'?'selected':''}>観光列車</option>
        <option value="steam" ${NORIRECO.mypage.state.mpTripFilter.category==='steam'?'selected':''}>SL</option>
        <option value="none" ${NORIRECO.mypage.state.mpTripFilter.category==='none'?'selected':''}>列車指定なし</option>
      </select>
    </div>
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">⇅ 並び替え</label>
      <select class="mp-filter-sel" id="mp-fil-sort" onchange="updateMpFilter('sort',this.value)">
        <option value="date_desc" ${NORIRECO.mypage.state.mpTripFilter.sort==='date_desc'?'selected':''}>📅 乗車日 (新しい順)</option>
        <option value="date_asc" ${NORIRECO.mypage.state.mpTripFilter.sort==='date_asc'?'selected':''}>📅 乗車日 (古い順)</option>
        <option value="stations_desc" ${NORIRECO.mypage.state.mpTripFilter.sort==='stations_desc'?'selected':''}>🚉 訪問駅数 (多い順)</option>
        <option value="minutes_desc" ${NORIRECO.mypage.state.mpTripFilter.sort==='minutes_desc'?'selected':''}>⏱ 乗車時間 (長い順)</option>
        <option value="recorded_desc" ${NORIRECO.mypage.state.mpTripFilter.sort==='recorded_desc'?'selected':''}>📌 記録日 (新しい順)</option>
        <option value="delay_desc" ${NORIRECO.mypage.state.mpTripFilter.sort==='delay_desc'?'selected':''}>🐢 遅延 (多い順)</option>
      </select>
    </div>
    <button class="mp-filter-reset" onclick="resetMpFilter()" title="フィルタをリセット">↺</button>
  `;
  return bar;
}
NORIRECO.mypage.buildTripFilterBar = buildTripFilterBar;

function updateMpFilter(key, value) {
  NORIRECO.mypage.state.mpTripFilter[key] = value;
  renderMpTripsSection();
}
window.updateMpFilter = updateMpFilter;
NORIRECO.mypage.updateMpFilter = updateMpFilter;

function resetMpFilter() {
  NORIRECO.mypage.state.mpTripFilter = { auth: 'all', period: 'all', category: 'all', sort: 'date_desc' };
  renderMpTripsSection();
}
window.resetMpFilter = resetMpFilter;
NORIRECO.mypage.resetMpFilter = resetMpFilter;

function applyTripFilters(trips) {
  // グローバル過去モード (_tripDateFilter) を先に適用
  if (typeof filterTripsByDate === 'function') {
    trips = filterTripsByDate(trips);
  }
  const filtered = trips.filter(t => {
    // 認証
    if (NORIRECO.mypage.state.mpTripFilter.auth === 'verified' && !t.verified) return false;
    if (NORIRECO.mypage.state.mpTripFilter.auth === 'manual' && (t.verified || (t.source === 'gps_button' && !t.verified))) return false;
    if (NORIRECO.mypage.state.mpTripFilter.auth === 'suspicious') {
      const downgraded = fraudIsDowngraded(t);
      if (!downgraded) return false;
    }
    // 期間
    const d = t.date || '';
    if (NORIRECO.mypage.state.mpTripFilter.period !== 'all' && d) {
      const today = new Date();
      const ty = today.getFullYear();
      if (NORIRECO.mypage.state.mpTripFilter.period === 'thisYear' && !d.startsWith(String(ty))) return false;
      if (NORIRECO.mypage.state.mpTripFilter.period === 'lastYear' && !d.startsWith(String(ty-1))) return false;
      if (NORIRECO.mypage.state.mpTripFilter.period === 'thisMonth') {
        const ym = `${ty}-${String(today.getMonth()+1).padStart(2,'0')}`;
        if (!d.startsWith(ym)) return false;
      }
      if (NORIRECO.mypage.state.mpTripFilter.period === 'last7') {
        const cutoff = new Date(today.getTime() - 7*24*3600*1000);
        const tripDate = new Date(d);
        if (tripDate < cutoff) return false;
      }
    }
    // カテゴリ
    if (NORIRECO.mypage.state.mpTripFilter.category !== 'all') {
      if (NORIRECO.mypage.state.mpTripFilter.category === 'none') {
        if (t.train_category) return false;
      } else {
        if (t.train_category !== NORIRECO.mypage.state.mpTripFilter.category) return false;
      }
    }
    return true;
  });
  // v182: ソート (デフォルト date_desc)
  const cmp = _MP_SORT_COMPARATORS[NORIRECO.mypage.state.mpTripFilter.sort] || _MP_SORT_COMPARATORS.date_desc;
  return [...filtered].sort(cmp);
}
NORIRECO.mypage.applyTripFilters = applyTripFilters;

// v184: 旅程カードからメモ・遅延を後追い編集 ────────────────────
// Supabase スキーマ未拡張のため、編集結果は localStorage と NORIRECO.mypage.state._mypageCache に書き戻すのみ。
// 旅程タブ・統計タブ「直近の旅程」を即時再描画して反映する。
function openTripEditModal(tripId) {
  const trip = (NORIRECO.mypage.state._mypageCache || []).find(t => t.id === tripId);
  if (!trip) { alert('旅程が見つかりません'); return; }
  const idInp = document.getElementById('trip-edit-id');
  const delayHInp = document.getElementById('trip-edit-delay-h');
  const delayMInp = document.getElementById('trip-edit-delay-m');
  const notesInp = document.getElementById('trip-edit-notes');
  const subTitle = document.getElementById('trip-edit-subtitle');
  if (idInp) idInp.value = tripId;
  // v185: 既存 delay_minutes を 時間+分 に分解してプリセット
  const total = (typeof trip.delay_minutes === 'number' && trip.delay_minutes > 0) ? trip.delay_minutes : 0;
  if (delayHInp) delayHInp.value = total >= 60 ? String(Math.floor(total / 60)) : '';
  if (delayMInp) delayMInp.value = (total % 60) > 0 ? String(total % 60) : (total > 0 && total < 60 ? String(total) : '');
  if (notesInp) notesInp.value = trip.notes || '';
  if (subTitle) {
    const label = trip.name || tripId;
    subTitle.textContent = `${label} の 📝 自由メモ と ⏱ 遅延 を編集します。`;
  }
  document.getElementById('trip-edit-modal')?.classList.add('open');
}
window.openTripEditModal = openTripEditModal;
NORIRECO.mypage.openTripEditModal = openTripEditModal;

function closeTripEditModal() {
  document.getElementById('trip-edit-modal')?.classList.remove('open');
}
window.closeTripEditModal = closeTripEditModal;
NORIRECO.mypage.closeTripEditModal = closeTripEditModal;

function saveTripEdit() {
  const tripId = document.getElementById('trip-edit-id')?.value;
  if (!tripId) { closeTripEditModal(); return; }
  const trip = (NORIRECO.mypage.state._mypageCache || []).find(t => t.id === tripId);
  if (!trip) { alert('旅程が見つかりません'); closeTripEditModal(); return; }

  // v185: 時間+分 から delay_minutes (分) を算出
  const delayHRaw = document.getElementById('trip-edit-delay-h')?.value;
  const delayMRaw = document.getElementById('trip-edit-delay-m')?.value;
  const notesRaw = document.getElementById('trip-edit-notes')?.value;
  const dh = (delayHRaw !== undefined && delayHRaw !== null && delayHRaw !== '')
    ? Math.max(0, Math.min(99, parseInt(delayHRaw, 10) || 0))
    : 0;
  const dm = (delayMRaw !== undefined && delayMRaw !== null && delayMRaw !== '')
    ? Math.max(0, Math.min(59, parseInt(delayMRaw, 10) || 0))
    : 0;
  const dTotal = dh * 60 + dm;
  const newDelay = (dTotal > 0) ? Math.min(5999, dTotal) : null;
  const newNotes = (notesRaw || '').trim() || null;

  // NORIRECO.mypage.state._mypageCache 内の trip を直接更新
  trip.delay_minutes = newDelay;
  trip.notes = newNotes;

  // localStorage 側も同期更新 (新規エントリだったら追加)
  try {
    const local = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    const idx = local.findIndex(t => t.id === tripId);
    if (idx >= 0) {
      local[idx] = { ...local[idx], delay_minutes: newDelay, notes: newNotes };
    } else {
      // Supabase からのみ取得した旧 trip を初めて localStorage に置く場合
      local.push({ ...trip });
    }
    localStorage.setItem('norireco_trips', JSON.stringify(local));
  } catch (e) {
    console.warn('[マイページ] localStorage 更新失敗:', e.message);
  }

  closeTripEditModal();
  // 旅程タブ・統計タブ「直近の旅程」を再描画
  if (typeof renderMpTripsSection === 'function') renderMpTripsSection();
  applyMpSection();
  if (typeof showMypageToast === 'function') showMypageToast('✏️ メモ・遅延を保存しました');
}
window.saveTripEdit = saveTripEdit;
NORIRECO.mypage.saveTripEdit = saveTripEdit;

function buildTripList(trips) {
  const list = document.createElement('div');
  list.className = 'mp-trip-list';
  list.innerHTML = trips.map(tripCardHtml).join('');
  return list;
}
NORIRECO.mypage.buildTripList = buildTripList;

// ── GPS 後追い認証 ─────────────────────────────────────────────
async function retroactivelyVerifyTrip(tripId) {
  const trip = (NORIRECO.mypage.state._mypageCache || []).find(t => t.id === tripId);
  if (!trip) { alert('旅程が見つかりません'); return; }
  if (!navigator.geolocation) { alert('このブラウザは GPS 非対応です'); return; }

  showMypageToast('📍 現在地を取得中…');
  let pos;
  try {
    pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    });
  } catch (e) {
    alert('GPS 取得失敗: ' + (e.message || 'permission denied'));
    return;
  }
  const myLat = pos.coords.latitude, myLon = pos.coords.longitude, acc = pos.coords.accuracy;

  const findStCoord = (name) => {
    if (Array.isArray(NORIRECO.data.MERGED_STATIONS)) {
      const m = NORIRECO.data.MERGED_STATIONS.find(s => s.name === name);
      if (m && m.lat != null) return [m.lat, m.lon];
    }
    for (const sl of (NORIRECO.data.SERVICE_LINES || [])) {
      const s = sl.stations.find(s => s.name === name);
      if (s && s.lat != null) return [s.lat, s.lon];
    }
    return null;
  };
  const fromCoord = findStCoord(trip.from_station);
  const toCoord = findStCoord(trip.to_station);
  if (!fromCoord && !toCoord) {
    alert(`駅座標が見つかりません: ${trip.from_station} / ${trip.to_station}`);
    return;
  }

  const dFrom = fromCoord ? distMeters(myLat, myLon, fromCoord[0], fromCoord[1]) : Infinity;
  const dTo = toCoord ? distMeters(myLat, myLon, toCoord[0], toCoord[1]) : Infinity;
  const minDist = Math.min(dFrom, dTo);
  const VERIFY_RADIUS_M = 500;

  if (minDist > VERIFY_RADIUS_M) {
    const nearer = dFrom < dTo ? trip.from_station : trip.to_station;
    alert(`現在地が遠すぎます (最寄 "${nearer}" まで ${Math.round(minDist)}m)\nこの旅程の駅から半径 ${VERIFY_RADIUS_M}m 以内で再試行してください。`);
    return;
  }

  const nearStation = dFrom < dTo ? trip.from_station : trip.to_station;
  if (!confirm(`✅ "${nearStation}" の近く (${Math.round(minDist)}m) で認証します。よろしいですか?`)) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/norireco_trips?id=eq.${tripId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${authBearerToken()}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ verified: true, gps_lat: myLat, gps_lon: myLon, gps_accuracy: acc }),
    });
    if (!res.ok) {
      const err = await res.text();
      alert('Supabase 更新失敗: ' + err.slice(0, 200));
      return;
    }
  } catch (e) {
    alert('通信エラー: ' + e.message);
    return;
  }

  showMypageToast(`✅ "${nearStation}" で認証完了!`, 'success');
  setTimeout(() => runCharacterGrantCheck(), 600);
  setTimeout(() => renderMypage(), 800);
}
window.retroactivelyVerifyTrip = retroactivelyVerifyTrip;
NORIRECO.mypage.retroactivelyVerifyTrip = retroactivelyVerifyTrip;

// ── 削除 ───────────────────────────────────────────────────────
async function deleteTripFromMypage(tripId) {
  if (!confirm('この旅程を削除しますか? (元に戻せません)')) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/norireco_trips?id=eq.${tripId}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authBearerToken()}` },
    });
    if (!res.ok) {
      const err = await res.text();
      alert('削除失敗: ' + err.slice(0, 200));
      return;
    }
  } catch (e) {
    alert('通信エラー: ' + e.message);
    return;
  }
  try {
    const existing = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    const next = existing.filter(t => t.id !== tripId);
    localStorage.setItem('norireco_trips', JSON.stringify(next));
  } catch(e) {}
  showMypageToast('🗑 削除しました', 'success');
  setTimeout(() => renderMypage(), 500);
}
window.deleteTripFromMypage = deleteTripFromMypage;
NORIRECO.mypage.deleteTripFromMypage = deleteTripFromMypage;
