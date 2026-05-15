// ══════════════════════════════════════════════════════════════
// マイページ (Phase 2)
// - サブタブ: 📊統計 / 🚃旅程 / 📋路線
// - 旅程タブにフィルタ (期間・認証ステータス・列車カテゴリ)
// - 完乗率二本立て・GPS 後追い認証・削除
// ══════════════════════════════════════════════════════════════

let _mypageCache = null;            // 取得した自分の trip[]
let mpActiveSection = 'stats';      // 'stats' | 'trips' | 'lines'
let mpTripFilter = {
  auth: 'all',     // all | verified | manual | suspicious
  period: 'all',   // all | thisYear | lastYear | custom (日付フィルタは _tripDateFilter と独立)
  category: 'all', // all | shinkansen | limited_express | ...
};

async function renderMypage() {
  const c = document.getElementById('mypage-content');
  if (!c) return;
  c.innerHTML = '';

  const uid = (typeof currentUserId === 'function') ? currentUserId() : null;
  if (!uid) {
    showAllSubpanes(false);
    c.innerHTML = `
      <div class="mp-empty">
        <div class="mp-empty-ic">🔑</div>
        <div class="mp-empty-t">ログインしてください</div>
        <div class="mp-empty-s">マイページではあなたの旅程・公式完乗率・GPS 後追い認証が使えます</div>
        <button class="mp-empty-btn" onclick="openAuthModal()">🔑 ログイン / 会員登録</button>
      </div>`;
    return;
  }

  // 1. コンパクトユーザーヘッダ + 常時表示の完乗率カード + サブタブ nav
  const email = (currentUser && currentUser.email) || '(メール非公開)';
  const initial = (email[0] || '?').toUpperCase();
  c.innerHTML = `
    <div class="mp-header-compact">
      <div class="mp-avatar-sm">${initial}</div>
      <div class="mp-userinfo-sm">
        <div class="mp-username-sm">${email.split('@')[0]}</div>
        <div class="mp-uid-sm">${email}</div>
      </div>
      <button class="mp-logout-btn-sm" onclick="if(confirm('ログアウトしますか?'))signOutUser()">×</button>
    </div>
    <div id="mp-completion-pinned"></div>
    <div class="mp-subtab-nav">
      <button class="mp-subtab" data-sec="stats" onclick="switchMpSection('stats')">📊 統計</button>
      <button class="mp-subtab" data-sec="trips" onclick="switchMpSection('trips')">🚃 旅程</button>
      <button class="mp-subtab" data-sec="lines" onclick="switchMpSection('lines')">📋 路線</button>
    </div>
  `;

  // データ取得
  let trips = [];
  try {
    const url = `${SUPABASE_URL}/rest/v1/norireco_trips?user_id=eq.${uid}&select=*&order=recorded_at.desc`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${typeof authBearerToken==='function'?authBearerToken():SUPABASE_KEY}` }
    });
    if (res.ok) trips = await res.json();
  } catch (e) {
    console.warn('[マイページ] 取得エラー:', e.message);
  }
  _mypageCache = trips;

  // 常時表示の完乗率カードを描画 (サブタブ切替に依存しない)
  const pinned = document.getElementById('mp-completion-pinned');
  if (pinned && Array.isArray(SERVICE_LINES) && SERVICE_LINES.length > 0) {
    pinned.innerHTML = '';
    pinned.appendChild(buildCompletionCards(trips));
  }

  applyMpSection();
}

function showAllSubpanes(show) {
  document.querySelectorAll('.mp-subpane').forEach(p => p.style.display = show ? '' : 'none');
}

function switchMpSection(name) {
  mpActiveSection = name;
  applyMpSection();
}
window.switchMpSection = switchMpSection;

function applyMpSection() {
  // サブタブ activeクラス
  document.querySelectorAll('.mp-subtab').forEach(b => {
    b.classList.toggle('active', b.dataset.sec === mpActiveSection);
  });
  // サブペイン表示切替
  const showStats = mpActiveSection === 'stats';
  const showTrips = mpActiveSection === 'trips';
  const showLines = mpActiveSection === 'lines';
  document.getElementById('mp-sub-stats').style.display  = showStats ? '' : 'none';
  document.getElementById('mp-sub-trips').style.display  = showTrips ? '' : 'none';
  document.getElementById('mp-sub-lines').style.display  = showLines ? '' : 'none';

  // 内容描画 (遅延でレイアウト確定後)
  setTimeout(() => {
    if (showStats) { renderMpStatsSection(); }
    if (showTrips) renderMpTripsSection();
    if (showLines) { try { if (typeof renderList === 'function') renderList(); } catch(e) {} }
  }, 30);
}

// ── 📊 統計セクション ──────────────────────────────────────────
function renderMpStatsSection() {
  // 完乗率カードは上部に常時表示されているので、ここでは既存 renderStats だけ呼ぶ
  // (月別グラフ・直近旅程・列車制覇など)
  const statsDiv = document.getElementById('stats-content');
  if (!statsDiv) return;
  statsDiv.innerHTML = '';
  try { if (typeof renderStats === 'function') renderStats(); } catch(e) { console.warn('[マイページ] renderStats:', e); }
}

function buildCompletionCards(trips) {
  const wrap = document.createElement('div');
  wrap.className = 'mp-stats-wrap';

  const collect = (verifiedOnly) => {
    const slSet = {};
    for (const trip of trips) {
      if (verifiedOnly && !trip.verified) continue;
      if (!trip.segments) continue;
      for (const seg of trip.segments) {
        const sl = SERVICE_LINES.find(l => l.id === seg.lineId);
        if (!sl) continue;
        const fromIdx = sl.stations.findIndex(s => s.name === seg.from);
        const toIdx = sl.stations.findIndex(s => s.name === seg.to);
        if (fromIdx < 0 || toIdx < 0) continue;
        const [a, b] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        if (!slSet[sl.id]) slSet[sl.id] = new Set();
        for (let i = a; i <= b; i++) slSet[sl.id].add(sl.stations[i].name);
      }
    }
    let rd = 0, st = 0, ln = 0, cp = 0;
    for (const sl of SERVICE_LINES) {
      const r = slSet[sl.id] ? slSet[sl.id].size : 0;
      const t = sl.stations.length;
      rd += r; st += t;
      if (r > 0) ln++;
      if (r === t && t > 0) cp++;
    }
    return { pct: st > 0 ? Math.round(rd / st * 100) : 0, ridden: rd, stations: st, lines: ln, complete: cp };
  };
  const sv = collect(true), all = collect(false);

  wrap.innerHTML = `
    <div class="mp-stat-grid">
      <div class="mp-scard verified" title="公式完乗率: GPS 認証された旅程のみで集計\n分母は営業系統ごとに駅をカウント (同じ駅が複数系統に属する場合は各々で 1 駅)">
        <div class="mp-sc-h">🟢 公式完乗率</div>
        <div class="mp-sc-sub">verified のみ</div>
        <div class="mp-sc-pct">${sv.pct}<span>%</span></div>
        <div class="mp-sc-detail">${sv.ridden} / ${sv.stations} 駅 <span style="opacity:.6;font-size:9px">(系統単位)</span></div>
        <div class="mp-sc-detail">${sv.lines} 系統 (完乗 ${sv.complete})</div>
      </div>
      <div class="mp-scard all" title="全記録完乗率: manual / suspicious を含む全旅程で集計\n分母は営業系統ごとに駅をカウント">
        <div class="mp-sc-h">⚪ 全記録完乗率</div>
        <div class="mp-sc-sub">manual / suspicious 含む</div>
        <div class="mp-sc-pct">${all.pct}<span>%</span></div>
        <div class="mp-sc-detail">${all.ridden} / ${all.stations} 駅 <span style="opacity:.6;font-size:9px">(系統単位)</span></div>
        <div class="mp-sc-detail">${all.lines} 系統 (完乗 ${all.complete})</div>
      </div>
    </div>
  `;
  return wrap;
}

// ── 🚃 旅程セクション ──────────────────────────────────────────
function renderMpTripsSection() {
  const sec = document.getElementById('mp-trip-section');
  if (!sec) return;
  sec.innerHTML = '';

  // フィルタバー
  sec.appendChild(buildTripFilterBar());

  // フィルタ適用
  const filtered = applyTripFilters(_mypageCache || []);

  // 件数表示
  const head = document.createElement('div');
  head.className = 'sec-lbl';
  head.innerHTML = `自分の旅程 (${filtered.length} / ${(_mypageCache||[]).length} 件)`;
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

function buildTripFilterBar() {
  const bar = document.createElement('div');
  bar.className = 'mp-filter-bar';
  bar.innerHTML = `
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">📅 期間</label>
      <select class="mp-filter-sel" id="mp-fil-period" onchange="updateMpFilter('period',this.value)">
        <option value="all" ${mpTripFilter.period==='all'?'selected':''}>全期間</option>
        <option value="thisYear" ${mpTripFilter.period==='thisYear'?'selected':''}>今年</option>
        <option value="lastYear" ${mpTripFilter.period==='lastYear'?'selected':''}>去年</option>
        <option value="thisMonth" ${mpTripFilter.period==='thisMonth'?'selected':''}>今月</option>
        <option value="last7" ${mpTripFilter.period==='last7'?'selected':''}>直近7日</option>
      </select>
    </div>
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">🛡 認証</label>
      <select class="mp-filter-sel" id="mp-fil-auth" onchange="updateMpFilter('auth',this.value)">
        <option value="all" ${mpTripFilter.auth==='all'?'selected':''}>すべて</option>
        <option value="verified" ${mpTripFilter.auth==='verified'?'selected':''}>🟢 公式 (認証済)</option>
        <option value="manual" ${mpTripFilter.auth==='manual'?'selected':''}>⚪ 自己申告</option>
        <option value="suspicious" ${mpTripFilter.auth==='suspicious'?'selected':''}>🟡 要確認 (降格)</option>
      </select>
    </div>
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">🚆 種別</label>
      <select class="mp-filter-sel" id="mp-fil-cat" onchange="updateMpFilter('category',this.value)">
        <option value="all" ${mpTripFilter.category==='all'?'selected':''}>すべて</option>
        <option value="shinkansen" ${mpTripFilter.category==='shinkansen'?'selected':''}>新幹線</option>
        <option value="limited_express" ${mpTripFilter.category==='limited_express'?'selected':''}>特急</option>
        <option value="express" ${mpTripFilter.category==='express'?'selected':''}>急行</option>
        <option value="rapid" ${mpTripFilter.category==='rapid'?'selected':''}>快速</option>
        <option value="sleeper" ${mpTripFilter.category==='sleeper'?'selected':''}>寝台</option>
        <option value="cruise_train" ${mpTripFilter.category==='cruise_train'?'selected':''}>クルーズ</option>
        <option value="joyful_train" ${mpTripFilter.category==='joyful_train'?'selected':''}>観光列車</option>
        <option value="steam" ${mpTripFilter.category==='steam'?'selected':''}>SL</option>
        <option value="none" ${mpTripFilter.category==='none'?'selected':''}>列車指定なし</option>
      </select>
    </div>
    <button class="mp-filter-reset" onclick="resetMpFilter()" title="フィルタをリセット">↺</button>
  `;
  return bar;
}

function updateMpFilter(key, value) {
  mpTripFilter[key] = value;
  renderMpTripsSection();
}
window.updateMpFilter = updateMpFilter;

function resetMpFilter() {
  mpTripFilter = { auth: 'all', period: 'all', category: 'all' };
  renderMpTripsSection();
}
window.resetMpFilter = resetMpFilter;

function applyTripFilters(trips) {
  return trips.filter(t => {
    // 認証
    if (mpTripFilter.auth === 'verified' && !t.verified) return false;
    if (mpTripFilter.auth === 'manual' && (t.verified || (t.source === 'gps_button' && !t.verified))) return false;
    if (mpTripFilter.auth === 'suspicious') {
      const downgraded = (typeof fraudIsDowngraded === 'function') ? fraudIsDowngraded(t) : (t.source === 'gps_button' && !t.verified);
      if (!downgraded) return false;
    }
    // 期間
    const d = t.date || '';
    if (mpTripFilter.period !== 'all' && d) {
      const today = new Date();
      const ty = today.getFullYear();
      if (mpTripFilter.period === 'thisYear' && !d.startsWith(String(ty))) return false;
      if (mpTripFilter.period === 'lastYear' && !d.startsWith(String(ty-1))) return false;
      if (mpTripFilter.period === 'thisMonth') {
        const ym = `${ty}-${String(today.getMonth()+1).padStart(2,'0')}`;
        if (!d.startsWith(ym)) return false;
      }
      if (mpTripFilter.period === 'last7') {
        const cutoff = new Date(today.getTime() - 7*24*3600*1000);
        const tripDate = new Date(d);
        if (tripDate < cutoff) return false;
      }
    }
    // カテゴリ
    if (mpTripFilter.category !== 'all') {
      if (mpTripFilter.category === 'none') {
        if (t.train_category) return false;
      } else {
        if (t.train_category !== mpTripFilter.category) return false;
      }
    }
    return true;
  });
}

function buildTripList(trips) {
  const list = document.createElement('div');
  list.className = 'mp-trip-list';

  for (const trip of trips) {
    const card = document.createElement('div');
    card.className = 'mp-tcard';
    card.dataset.tripId = trip.id;

    let badge = '<span class="mp-badge manual" title="手動 (自己申告)">⚪ 自己申告</span>';
    if (trip.verified) {
      badge = '<span class="mp-badge verified" title="GPS 認証">🟢 認証済</span>';
    } else if (typeof fraudIsDowngraded === 'function' && fraudIsDowngraded(trip)) {
      badge = '<span class="mp-badge suspicious" title="不正検知で降格">🟡 要確認</span>';
    }

    const timeStr = (trip.depart_time && trip.arrive_time)
      ? `${trip.depart_time.slice(0,5)}〜${trip.arrive_time.slice(0,5)}${trip.total_minutes ? ` (${trip.total_minutes}分)` : ''}`
      : '';

    let trainBit = '';
    if (trip.train_name) {
      const customMark = trip.train_id ? '' : ' 📝';
      trainBit = `<div class="mp-tcard-train">🚆 ${trip.train_name}${customMark}${trip.car_model?` <span class="mp-car">[${trip.car_model}]</span>`:''}</div>`;
    }

    const verifyBtn = !trip.verified
      ? `<button class="mp-act-btn verify" onclick="retroactivelyVerifyTrip('${trip.id}')">📍 GPSで認証</button>`
      : '';

    card.innerHTML = `
      <div class="mp-tcard-head">
        <span class="mp-tcard-date">${trip.date || ''}</span>
        ${timeStr ? `<span class="mp-tcard-time">${timeStr}</span>` : ''}
        ${badge}
      </div>
      <div class="mp-tcard-name">${trip.name || ''}</div>
      <div class="mp-tcard-sub">${trip.total_stations || 0}駅 · 乗換${trip.transfers || 0}回</div>
      ${trainBit}
      <div class="mp-tcard-actions">
        ${verifyBtn}
        <button class="mp-act-btn delete" onclick="deleteTripFromMypage('${trip.id}')">🗑 削除</button>
      </div>
    `;
    list.appendChild(card);
  }
  return list;
}

// ── GPS 後追い認証 ─────────────────────────────────────────────
async function retroactivelyVerifyTrip(tripId) {
  const trip = (_mypageCache || []).find(t => t.id === tripId);
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
    if (Array.isArray(MERGED_STATIONS)) {
      const m = MERGED_STATIONS.find(s => s.name === name);
      if (m && m.lat != null) return [m.lat, m.lon];
    }
    for (const sl of (SERVICE_LINES || [])) {
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
        'Authorization': `Bearer ${typeof authBearerToken==='function'?authBearerToken():SUPABASE_KEY}`,
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
  if (typeof runCharacterGrantCheck === 'function') setTimeout(() => runCharacterGrantCheck(), 600);
  setTimeout(() => renderMypage(), 800);
}

// ── 削除 ───────────────────────────────────────────────────────
async function deleteTripFromMypage(tripId) {
  if (!confirm('この旅程を削除しますか? (元に戻せません)')) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/norireco_trips?id=eq.${tripId}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${typeof authBearerToken==='function'?authBearerToken():SUPABASE_KEY}` },
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

// ── トースト ──────────────────────────────────────────────────
function showMypageToast(text, kind) {
  let el = document.getElementById('mp-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mp-toast';
    el.className = 'mp-toast';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.className = 'mp-toast show' + (kind ? ' ' + kind : '');
  clearTimeout(showMypageToast._t);
  showMypageToast._t = setTimeout(() => { el.className = 'mp-toast'; }, 3500);
}

window.renderMypage = renderMypage;
window.retroactivelyVerifyTrip = retroactivelyVerifyTrip;
window.deleteTripFromMypage = deleteTripFromMypage;
