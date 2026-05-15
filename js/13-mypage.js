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

  // 完乗率カード placeholder (SERVICE_LINES と trips を並列取得しながらスケルトン表示)
  const pinned = document.getElementById('mp-completion-pinned');
  if (pinned) pinned.innerHTML = `<div class="mp-loading" style="padding:14px">📊 完乗率を計算中…</div>`;

  // 並列: SERVICE_LINES 構築 + Supabase から自分の trip 取得
  let trips = [];
  try {
    const [_, tripsRes] = await Promise.all([
      (typeof buildServiceLines === 'function' ? buildServiceLines() : Promise.resolve()),
      fetch(`${SUPABASE_URL}/rest/v1/norireco_trips?user_id=eq.${uid}&select=*&order=recorded_at.desc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${typeof authBearerToken==='function'?authBearerToken():SUPABASE_KEY}` }
      }),
    ]);
    if (tripsRes.ok) trips = await tripsRes.json();
  } catch (e) {
    console.warn('[マイページ] 取得エラー:', e.message);
  }
  _mypageCache = trips;

  // 常時表示の完乗率カードを描画 (サブタブ切替に依存しない)
  if (pinned) {
    pinned.innerHTML = '';
    if (Array.isArray(SERVICE_LINES) && SERVICE_LINES.length > 0) {
      pinned.appendChild(buildCompletionCards(trips));
    } else {
      pinned.innerHTML = `<div class="mp-empty-s" style="padding:14px">⚠ 営業系統マスターの読込に失敗しました</div>`;
    }
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

  // 全駅マスター (ユニーク) — SERVICE_LINES から駅名 Set を作る
  const allUniqueStations = new Set();
  let lineUnitTotal = 0;
  for (const sl of SERVICE_LINES) {
    for (const s of sl.stations) allUniqueStations.add(s.name);
    lineUnitTotal += sl.stations.length;
  }
  const totalUnique = allUniqueStations.size;
  const totalLines = SERVICE_LINES.length;

  // ── 共通の集計 (verifiedOnly / 全記録) ────────────────────────────
  function collect(verifiedOnly) {
    const slSet = {};
    const visitedUnique = new Set();
    const visitCount = {};       // 駅名 → 訪問 trip 数
    const lineRideCount = {};    // sl.id → 乗車 trip 数
    let totalDistanceKm = 0;
    let totalMinutes = 0;
    let validTrips = 0;
    for (const trip of trips) {
      if (verifiedOnly && !trip.verified) continue;
      if (!trip.segments) continue;
      validTrips++;
      if (trip.total_minutes) totalMinutes += trip.total_minutes;
      const tripStations = new Set();
      const tripLines = new Set();
      for (const seg of trip.segments) {
        const sl = SERVICE_LINES.find(l => l.id === seg.lineId);
        if (!sl) continue;
        const fromIdx = sl.stations.findIndex(s => s.name === seg.from);
        const toIdx = sl.stations.findIndex(s => s.name === seg.to);
        if (fromIdx < 0 || toIdx < 0) continue;
        const [a, b] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        if (!slSet[sl.id]) slSet[sl.id] = new Set();
        tripLines.add(sl.id);
        for (let i = a; i <= b; i++) {
          const name = sl.stations[i].name;
          slSet[sl.id].add(name);
          visitedUnique.add(name);
          tripStations.add(name);
        }
        // 距離
        for (let i = a; i < b; i++) {
          const s1 = sl.stations[i], s2 = sl.stations[i+1];
          if (s1.lat != null && s2.lat != null) {
            totalDistanceKm += distMeters(s1.lat, s1.lon, s2.lat, s2.lon) / 1000;
          }
        }
      }
      for (const n of tripStations) visitCount[n] = (visitCount[n]||0) + 1;
      for (const lid of tripLines) lineRideCount[lid] = (lineRideCount[lid]||0) + 1;
    }
    let lineUnitRidden = 0, lines = 0, complete = 0;
    for (const sl of SERVICE_LINES) {
      const r = slSet[sl.id] ? slSet[sl.id].size : 0;
      lineUnitRidden += r;
      if (r > 0) lines++;
      if (r === sl.stations.length && sl.stations.length > 0) complete++;
    }
    return {
      uniquePct: totalUnique > 0 ? Math.round(visitedUnique.size / totalUnique * 100) : 0,
      uniqueRidden: visitedUnique.size,
      lines, complete,
      lineUnitRidden, lineUnitTotal,
      lineUnitPct: lineUnitTotal > 0 ? Math.round(lineUnitRidden / lineUnitTotal * 100) : 0,
      totalDistanceKm: Math.round(totalDistanceKm),
      totalMinutes,
      validTrips,
      slSet, visitCount, lineRideCount,
    };
  }
  const sv = collect(true), all = collect(false);

  // ── サマリカード 2 枚 ─────────────────────────────────────────
  const cards = document.createElement('div');
  cards.className = 'mp-stat-grid';
  cards.innerHTML = `
    <div class="mp-scard verified">
      <div class="mp-sc-h">🟢 公式完乗率</div>
      <div class="mp-sc-sub">verified のみ</div>
      <div class="mp-sc-pct">${sv.uniquePct}<span>%</span></div>
      <div class="mp-sc-detail">${sv.uniqueRidden.toLocaleString()} / ${totalUnique.toLocaleString()} 駅</div>
      <div class="mp-sc-detail">${sv.lines} / ${totalLines} 系統 (完乗 ${sv.complete})</div>
    </div>
    <div class="mp-scard all">
      <div class="mp-sc-h">⚪ 全記録完乗率</div>
      <div class="mp-sc-sub">manual / suspicious 含む</div>
      <div class="mp-sc-pct">${all.uniquePct}<span>%</span></div>
      <div class="mp-sc-detail">${all.uniqueRidden.toLocaleString()} / ${totalUnique.toLocaleString()} 駅</div>
      <div class="mp-sc-detail">${all.lines} / ${totalLines} 系統 (完乗 ${all.complete})</div>
    </div>
  `;
  wrap.appendChild(cards);

  // ── 詳細トグル ────────────────────────────────────────────────
  const detailBtn = document.createElement('button');
  detailBtn.className = 'mp-detail-toggle-main';
  detailBtn.id = 'mp-detail-toggle-main';
  detailBtn.textContent = '▾ 詳細を見る';
  detailBtn.onclick = () => toggleDetailPane();
  wrap.appendChild(detailBtn);

  const detailPane = document.createElement('div');
  detailPane.className = 'mp-detail-pane-main';
  detailPane.id = 'mp-detail-pane-main';
  detailPane.style.display = 'none';
  buildDetailContent(detailPane, sv, all, trips, totalUnique, totalLines);
  wrap.appendChild(detailPane);

  return wrap;
}

function toggleDetailPane() {
  const btn = document.getElementById('mp-detail-toggle-main');
  const pane = document.getElementById('mp-detail-pane-main');
  if (!btn || !pane) return;
  const isOpen = pane.style.display !== 'none';
  pane.style.display = isOpen ? 'none' : 'block';
  btn.textContent = isOpen ? '▾ 詳細を見る' : '▴ 詳細を閉じる';
}
window.toggleDetailPane = toggleDetailPane;

// ⓘ ボタンの説明トグル (1 度見れば閉じる)
function toggleInfo(btn) {
  const pop = btn.parentElement.parentElement.querySelector('.mp-info-pop');
  if (pop) pop.classList.toggle('open');
}
window.toggleInfo = toggleInfo;

// ── 詳細セクションの内容構築 ──
function buildDetailContent(pane, sv, all, trips, totalUnique, totalLines) {
  pane.innerHTML = '';

  // ① 集計方式 (系統単位)
  pane.appendChild(detailCard('集計方式の違い (系統単位)',
    `<div class="mp-d-row"><span>🟢 公式</span><strong>${sv.lineUnitRidden.toLocaleString()} / ${sv.lineUnitTotal.toLocaleString()}</strong> 駅 <span class="mp-d-pct">(${sv.lineUnitPct}%)</span></div>
     <div class="mp-d-row"><span>⚪ 全記録</span><strong>${all.lineUnitRidden.toLocaleString()} / ${all.lineUnitTotal.toLocaleString()}</strong> 駅 <span class="mp-d-pct">(${all.lineUnitPct}%)</span></div>`,
    `<strong>系統単位</strong>: 八王子駅 (横浜線・中央本線・中央本線快速・八高線 の 4 系統に属する) のように、複数路線に属する駅を「系統ごとに 1 駅」としてカウントする集計方法。<br>サマリ表示の「ユニーク駅」では八王子は 1 駅扱いだが、ここでは 4 駅枠としてカウントする。<em>「完乗 = 全系統の全駅乗車」を厳密に評価する指標</em>。`
  ));

  // ② 総走行距離
  pane.appendChild(detailCard('総走行距離 (推定)',
    `<div class="mp-d-row"><span>🟢 公式</span><strong>${sv.totalDistanceKm.toLocaleString()}</strong> km</div>
     <div class="mp-d-row"><span>⚪ 全記録</span><strong>${all.totalDistanceKm.toLocaleString()}</strong> km</div>`,
    `各旅程の区間 (出発駅〜到着駅) を service_lines_master の駅順で展開し、隣接駅間の Haversine 距離を累積。営業キロではなく直線距離なので、実際の運行距離より少し短めに出る。GPS 軌跡 (将来) で精度向上予定。`
  ));

  // ③ 運営会社別 完乗率 (公式ベース)
  pane.appendChild(detailCard('運営会社別 完乗率 (公式)',
    buildByOperator(sv),
    `SERVICE_LINES の operator (運営会社) でグルーピングし、駅をユニークに集計。同じ会社の中で複数系統に属する駅は 1 駅としてカウント。`
  ));

  // ④ 三大都市圏完乗率
  pane.appendChild(detailCard('地域別 完乗率 (公式)',
    buildByGroup(sv),
    `SERVICE_LINES の group (地域分類: 首都圏・関西・東海・東北・北海道・九州・四国・中国・新幹線 等) でグルーピング。三大都市圏での完乗率を見やすく可視化。`
  ));

  // ⑤ よく乗る路線 Top 10
  pane.appendChild(detailCard('よく乗る路線 (公式 Top 10)',
    buildTopLines(sv),
    `公式 (verified) 旅程の中で、各系統に乗った旅程数を集計。完乗率と乗車回数の両方が見える。`
  ));

  // ⑥ よく訪れる駅 Top 10
  pane.appendChild(detailCard('よく訪れる駅 (公式 Top 10)',
    buildTopStations(sv),
    `公式旅程の経路上に登場した駅を訪問回数でランキング。途中通過した駅も含む。ホーム駅・職場最寄駅などが上位に来る傾向。`
  ));

  // ⑦ 認証ステータス分布
  pane.appendChild(detailCard('認証ステータス分布',
    buildAuthBreakdown(trips),
    `自分の全旅程を 🟢 公式 (GPS 認証) / 🟡 要確認 (不正検知で降格) / ⚪ 自己申告 (manual) で分類。シェア機能 (将来) は 🟢 公式のみ対象になる予定。`
  ));

  // ⑧ 累計駅数の推移 (月別)
  pane.appendChild(detailCard('累計駅数の推移 (月別)',
    buildStationProgressMonthly(trips),
    `各月末時点でのユニーク訪問駅数の累計。バーの長さが累計、右端の <em>+N</em> はその月に <strong>新規訪問</strong> した駅数。長く続けるほど右肩上がりに伸びる「乗りつぶし日記」。乗り鉄撮り鉄アプリと同じ発想の指標。`
  ));

  // ⑨ 累計駅数の推移 (年別)
  pane.appendChild(detailCard('累計駅数の推移 (年別)',
    buildStationProgressYearly(trips),
    `年ごとの新規訪問駅数とその累計。最初の年は当然多くなり、続ければ毎年 +N が増える形に。「今年は去年より頑張った?」をチェック。`
  ));

  // ⑩ 都道府県別 訪問駅数 (公式ベース)
  pane.appendChild(detailCard('都道府県別 訪問駅数 (公式)',
    buildPrefectureChart(sv),
    `47 都道府県ごとに <strong>自分が訪問した駅数 / その県の全駅数</strong> を集計。<em>verified (GPS認証) のみ</em> 対象。<br>判定は駅座標 (緯度経度) からの簡易 bbox + centroid 最近接で行うため、県境付近の数駅は誤分類されることがある。乗りつぶしオンライン・鉄レコの定番機能の簡易版。`
  ));

  // ⑪ 個人記録 (PR) + 連続乗車日数
  pane.appendChild(detailCard('🏆 個人記録 (PR)',
    buildPersonalRecords(trips),
    `Strava 風の個人ベスト記録セット。<br><strong>連続乗車日数</strong>: 1日でも記録があれば連続カウント、空白日が出るとリセット。「現在の連続」と「過去最長」を併記。<br>その他、最長旅程 (時間・駅数)・最多旅程日・最早/最遅時刻など、マニア心をくすぐる数字を集約。`
  ));
}

// ── 個人記録 (PR) + 連続乗車日数 ────────────────────────────
function buildPersonalRecords(trips) {
  if (!trips || trips.length === 0) return '<div class="mp-empty-s">記録なし</div>';

  // ── 連続乗車日数 (date 列のユニーク日付ベース) ──
  const datesSet = new Set();
  for (const t of trips) if (t.date) datesSet.add(t.date);
  const dates = [...datesSet].sort();  // YYYY-MM-DD 昇順
  // 連続日数の計算: dates を走査して run length を出す
  let maxStreak = 0, curStreakAtRun = 0;
  let runs = [];
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) { curStreakAtRun = 1; }
    else {
      const prev = new Date(dates[i-1] + 'T00:00:00');
      const curr = new Date(dates[i] + 'T00:00:00');
      const diff = (curr - prev) / 86400000;
      if (diff === 1) curStreakAtRun++;
      else { runs.push(curStreakAtRun); curStreakAtRun = 1; }
    }
  }
  if (curStreakAtRun > 0) runs.push(curStreakAtRun);
  maxStreak = runs.length > 0 ? Math.max(...runs) : 0;

  // 現在の連続: 今日 (ローカル) から逆向きに連続している日数
  let currentStreak = 0;
  if (dates.length > 0) {
    const today = localDateStr ? localDateStr() : new Date().toISOString().slice(0,10);
    const lastDate = dates[dates.length - 1];
    const todayD = new Date(today + 'T00:00:00');
    const lastD = new Date(lastDate + 'T00:00:00');
    const gapFromToday = Math.round((todayD - lastD) / 86400000);
    // 最後の記録が今日 or 昨日 (今日まだ乗ってない場合) なら streak は最後の run
    if (gapFromToday <= 1) {
      currentStreak = runs[runs.length - 1];
    }
  }

  // ── 1 日の最多 ──
  const tripsByDate = {};
  const stationsByDate = {};
  for (const t of trips) {
    if (!t.date) continue;
    tripsByDate[t.date] = (tripsByDate[t.date] || 0) + 1;
    if (!stationsByDate[t.date]) stationsByDate[t.date] = new Set();
    if (t.segments) {
      for (const seg of t.segments) {
        const sl = SERVICE_LINES.find(l => l.id === seg.lineId);
        if (!sl) continue;
        const fromIdx = sl.stations.findIndex(s => s.name === seg.from);
        const toIdx = sl.stations.findIndex(s => s.name === seg.to);
        if (fromIdx < 0 || toIdx < 0) continue;
        const [a, b] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        for (let i = a; i <= b; i++) stationsByDate[t.date].add(sl.stations[i].name);
      }
    }
  }
  let maxTripsDay = null, maxTripsCount = 0;
  for (const [d, n] of Object.entries(tripsByDate)) {
    if (n > maxTripsCount) { maxTripsCount = n; maxTripsDay = d; }
  }
  let maxStationsDay = null, maxStationsCount = 0;
  for (const [d, st] of Object.entries(stationsByDate)) {
    if (st.size > maxStationsCount) { maxStationsCount = st.size; maxStationsDay = d; }
  }

  // ── 最長旅程 (時間・駅数・距離) ──
  let longestMin = null, longestStations = null, longestKm = null;
  for (const t of trips) {
    if (t.total_minutes && (!longestMin || t.total_minutes > longestMin.total_minutes)) longestMin = t;
    if (t.total_stations && (!longestStations || t.total_stations > longestStations.total_stations)) longestStations = t;
    // 距離計算
    if (t.segments) {
      let km = 0;
      for (const seg of t.segments) {
        const sl = SERVICE_LINES.find(l => l.id === seg.lineId);
        if (!sl) continue;
        const fromIdx = sl.stations.findIndex(s => s.name === seg.from);
        const toIdx = sl.stations.findIndex(s => s.name === seg.to);
        if (fromIdx < 0 || toIdx < 0) continue;
        const [a, b] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        for (let i = a; i < b; i++) {
          const s1 = sl.stations[i], s2 = sl.stations[i+1];
          if (s1.lat != null && s2.lat != null) km += distMeters(s1.lat, s1.lon, s2.lat, s2.lon) / 1000;
        }
      }
      if (!longestKm || km > longestKm._km) { longestKm = {...t, _km: km}; }
    }
  }

  // ── 最早出発 / 最遅到着 (depart_time / arrive_time) ──
  let earliest = null, latest = null;
  for (const t of trips) {
    if (t.depart_time) {
      if (!earliest || t.depart_time < earliest.depart_time) earliest = t;
    }
    if (t.arrive_time) {
      if (!latest || t.arrive_time > latest.arrive_time) latest = t;
    }
  }

  // ── 最初の記録 / 最新の記録 ──
  const firstTrip = dates.length > 0 ? trips.find(t => t.date === dates[0]) : null;
  const lastTrip = dates.length > 0 ? [...trips].sort((a,b) => (b.recorded_at||b.date||'').localeCompare(a.recorded_at||a.date||''))[0] : null;

  // ── レンダリング ──
  const recordRow = (icon, label, value, sub) => `
    <div class="mp-pr-row">
      <span class="mp-pr-ic">${icon}</span>
      <span class="mp-pr-lbl">${label}</span>
      <span class="mp-pr-val">${value}</span>
      ${sub ? `<span class="mp-pr-sub">${sub}</span>` : ''}
    </div>
  `;

  return `
    <div class="mp-pr-section">
      <div class="mp-pr-section-h">📅 連続記録</div>
      ${recordRow('🔥', '現在の連続', `${currentStreak} 日`, currentStreak === 0 ? '(今日 or 昨日に記録なし)' : '')}
      ${recordRow('🏅', '過去最長', `${maxStreak} 日`, '')}
    </div>
    <div class="mp-pr-section">
      <div class="mp-pr-section-h">🌅 1 日の最多</div>
      ${maxTripsDay ? recordRow('🎫', '最多旅程数', `${maxTripsCount} 件`, maxTripsDay) : ''}
      ${maxStationsDay ? recordRow('🚉', '最多訪問駅数', `${maxStationsCount} 駅`, maxStationsDay) : ''}
    </div>
    <div class="mp-pr-section">
      <div class="mp-pr-section-h">🏆 最長旅程</div>
      ${longestMin ? recordRow('⏱', '時間', `${longestMin.total_minutes} 分`, `${longestMin.date || ''} · ${longestMin.name || ''}`) : ''}
      ${longestStations ? recordRow('🚉', '駅数', `${longestStations.total_stations} 駅`, `${longestStations.date || ''} · ${longestStations.name || ''}`) : ''}
      ${longestKm ? recordRow('📏', '距離', `${Math.round(longestKm._km)} km`, `${longestKm.date || ''} · ${longestKm.name || ''}`) : ''}
    </div>
    <div class="mp-pr-section">
      <div class="mp-pr-section-h">⏰ 時刻記録</div>
      ${earliest ? recordRow('🌄', '最早出発', earliest.depart_time.slice(0,5), `${earliest.date || ''} · ${earliest.name || ''}`) : ''}
      ${latest ? recordRow('🌃', '最遅到着', latest.arrive_time.slice(0,5), `${latest.date || ''} · ${latest.name || ''}`) : ''}
    </div>
    <div class="mp-pr-section">
      <div class="mp-pr-section-h">📆 履歴</div>
      ${firstTrip ? recordRow('🎉', '最初の記録', firstTrip.date, firstTrip.name || '') : ''}
      ${lastTrip ? recordRow('📌', '最新の記録', lastTrip.date, lastTrip.name || '') : ''}
      ${recordRow('📊', '記録日数', `${dates.length} 日`, `(全 ${trips.length} 旅程)`)}
    </div>
  `;
}

// ── 都道府県 BBOX テーブル (簡易判定用) ────────────────────────
// 各都道府県の概略の経緯度範囲。境界線上の駅は誤分類される可能性あり。
// 重複時は bbox が小さい県 (面積優先度) でなく、centroid 距離が最も近い県を採用。
const PREFECTURES = [
  // [name, minLat, maxLat, minLon, maxLon, centerLat, centerLon]
  ['北海道', 41.3, 45.6, 139.3, 146.0, 43.5, 142.6],
  ['青森県', 40.2, 41.6, 139.4, 141.7, 40.8, 140.7],
  ['岩手県', 38.7, 40.5, 140.6, 142.1, 39.6, 141.4],
  ['宮城県', 37.8, 39.0, 140.3, 141.7, 38.3, 140.9],
  ['秋田県', 38.9, 40.5, 139.7, 141.0, 39.7, 140.3],
  ['山形県', 37.7, 39.3, 139.5, 140.8, 38.4, 140.2],
  ['福島県', 36.8, 38.0, 139.2, 141.0, 37.4, 140.4],
  ['茨城県', 35.8, 36.9, 139.7, 140.9, 36.3, 140.4],
  ['栃木県', 36.2, 37.2, 139.3, 140.3, 36.7, 139.8],
  ['群馬県', 36.0, 37.0, 138.4, 139.7, 36.4, 139.0],
  ['埼玉県', 35.7, 36.3, 138.7, 139.9, 36.0, 139.4],
  ['千葉県', 34.9, 36.1, 139.7, 140.9, 35.5, 140.3],
  ['東京都', 35.5, 35.9, 139.0, 139.9, 35.69, 139.69],
  ['神奈川県', 35.1, 35.7, 139.0, 139.8, 35.4, 139.4],
  ['新潟県', 36.7, 38.5, 137.6, 139.6, 37.6, 138.6],
  ['富山県', 36.3, 36.9, 136.8, 137.8, 36.6, 137.3],
  ['石川県', 36.0, 37.6, 136.2, 137.4, 36.7, 136.8],
  ['福井県', 35.3, 36.3, 135.4, 136.8, 35.9, 136.2],
  ['山梨県', 35.1, 35.9, 138.2, 139.1, 35.6, 138.6],
  ['長野県', 35.2, 37.0, 137.3, 138.9, 36.2, 138.2],
  ['岐阜県', 35.1, 36.4, 136.2, 137.7, 35.7, 136.9],
  ['静岡県', 34.6, 35.7, 137.4, 139.2, 35.0, 138.4],
  ['愛知県', 34.6, 35.4, 136.7, 137.8, 35.0, 137.0],
  ['三重県', 33.7, 35.3, 135.8, 136.9, 34.5, 136.5],
  ['滋賀県', 34.7, 35.7, 135.7, 136.5, 35.2, 136.1],
  ['京都府', 34.7, 35.8, 134.8, 136.0, 35.1, 135.5],
  ['大阪府', 34.2, 35.0, 135.1, 135.7, 34.65, 135.5],
  ['兵庫県', 34.1, 35.7, 134.2, 135.5, 34.8, 134.8],
  ['奈良県', 33.8, 34.8, 135.6, 136.3, 34.4, 135.9],
  ['和歌山県', 33.4, 34.4, 135.0, 136.0, 33.9, 135.5],
  ['鳥取県', 35.0, 35.7, 133.1, 134.5, 35.4, 133.8],
  ['島根県', 34.3, 35.7, 131.6, 133.4, 35.0, 132.6],
  ['岡山県', 34.3, 35.3, 133.3, 134.5, 34.8, 133.9],
  ['広島県', 34.0, 35.1, 132.0, 133.5, 34.5, 132.7],
  ['山口県', 33.7, 34.8, 130.7, 132.2, 34.2, 131.4],
  ['徳島県', 33.6, 34.3, 133.7, 134.9, 33.9, 134.3],
  ['香川県', 34.0, 34.6, 133.5, 134.5, 34.3, 134.0],
  ['愛媛県', 32.9, 34.3, 132.0, 133.7, 33.6, 132.8],
  ['高知県', 32.7, 33.9, 132.5, 134.3, 33.3, 133.4],
  ['福岡県', 33.1, 34.0, 130.0, 131.2, 33.6, 130.6],
  ['佐賀県', 33.1, 33.6, 129.8, 130.6, 33.3, 130.2],
  ['長崎県', 32.7, 34.7, 128.6, 130.4, 33.0, 129.7],
  ['熊本県', 32.1, 33.4, 130.1, 131.2, 32.8, 130.7],
  ['大分県', 32.7, 33.7, 130.7, 132.0, 33.2, 131.4],
  ['宮崎県', 31.3, 32.9, 130.6, 131.9, 32.0, 131.3],
  ['鹿児島県', 27.0, 32.2, 128.4, 131.2, 31.5, 130.5],
  ['沖縄県', 24.0, 27.0, 122.9, 131.0, 26.2, 127.7],
];

// 駅座標 → 都道府県名 (bbox 含む県のうち centroid 最近接、無ければ centroid 最近接)
const _prefCache = new Map();  // 'lat,lon' → 県名
function prefOfStation(lat, lon) {
  if (lat == null || lon == null) return null;
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (_prefCache.has(key)) return _prefCache.get(key);
  let best = null, bestDist = Infinity;
  for (const p of PREFECTURES) {
    const [name, minLat, maxLat, minLon, maxLon, cLat, cLon] = p;
    const inBbox = lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
    const dx = lat - cLat, dy = lon - cLon;
    const dist = dx*dx + dy*dy;
    if (inBbox && dist < bestDist) { best = name; bestDist = dist; }
  }
  if (!best) {
    // bbox に入らない: centroid 最近接でフォールバック
    for (const p of PREFECTURES) {
      const [name, , , , , cLat, cLon] = p;
      const dx = lat - cLat, dy = lon - cLon;
      const dist = dx*dx + dy*dy;
      if (dist < bestDist) { best = name; bestDist = dist; }
    }
  }
  _prefCache.set(key, best);
  return best;
}

// 全駅を都道府県別に集計 (1 回だけ計算してキャッシュ)
let _prefMasterCache = null;  // { byPref: { 県: Set<駅名> }, totalByPref: { 県: 駅数 } }
function buildPrefectureMaster() {
  if (_prefMasterCache) return _prefMasterCache;
  const byPref = {};
  for (const sl of (SERVICE_LINES || [])) {
    for (const s of sl.stations) {
      if (s.lat == null) continue;
      const pref = prefOfStation(s.lat, s.lon);
      if (!pref) continue;
      if (!byPref[pref]) byPref[pref] = new Set();
      byPref[pref].add(s.name);
    }
  }
  _prefMasterCache = { byPref };
  return _prefMasterCache;
}

// 都道府県別 訪問駅数チャート
function buildPrefectureChart(snap) {
  const master = buildPrefectureMaster();
  // 自分が訪問した駅 (snap.slSet) から都道府県別に集計
  const visitedByPref = {};
  for (const sl of (SERVICE_LINES || [])) {
    const set = snap.slSet[sl.id];
    if (!set) continue;
    for (const name of set) {
      const station = sl.stations.find(s => s.name === name);
      if (!station || station.lat == null) continue;
      const pref = prefOfStation(station.lat, station.lon);
      if (!pref) continue;
      if (!visitedByPref[pref]) visitedByPref[pref] = new Set();
      visitedByPref[pref].add(name);
    }
  }

  // 47 都道府県でリスト化、訪問率降順 → 未訪問は最後
  const rows = PREFECTURES.map(p => {
    const name = p[0];
    const total = master.byPref[name] ? master.byPref[name].size : 0;
    const ridden = visitedByPref[name] ? visitedByPref[name].size : 0;
    const pct = total > 0 ? Math.round(ridden / total * 100) : 0;
    return { name, ridden, total, pct, hasData: total > 0 };
  });
  // 訪問あり → 完乗率降順、未訪問 → 駅数降順
  rows.sort((a, b) => {
    if (a.ridden > 0 && b.ridden === 0) return -1;
    if (a.ridden === 0 && b.ridden > 0) return 1;
    if (a.ridden > 0) return b.pct - a.pct || b.ridden - a.ridden;
    return b.total - a.total;
  });

  const visitedPref = rows.filter(r => r.ridden > 0).length;
  const totalPref = 47;

  const chart = rows.map(r => {
    const cls = r.ridden === 0 ? ' unvisited' : '';
    return `<div class="mp-pref-row${cls}">
      <span class="mp-pref-name">${r.name}</span>
      <div class="mp-pref-bar">
        <div class="mp-pref-fill" style="width:${r.pct}%"></div>
      </div>
      <span class="mp-pref-count">${r.ridden} / ${r.total}</span>
      <span class="mp-pref-pct">${r.pct}%</span>
    </div>`;
  }).join('');

  return `
    <div class="mp-pref-summary">
      <strong>${visitedPref}</strong> / ${totalPref} 都道府県で乗車記録あり
      ${visitedPref < totalPref ? ` (未訪問 <strong style="color:var(--silver)">${totalPref - visitedPref}</strong> 県)` : ' 🎉 全国制覇!'}
    </div>
    <div class="mp-pref-list">${chart}</div>
  `;
}
function buildStationProgressMonthly(trips) {
  const sorted = [...trips]
    .filter(t => t.date && t.segments)
    .sort((a,b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return '<div class="mp-empty-s">データなし</div>';

  const seen = new Set();
  const monthly = new Map();  // 'YYYY-MM' → { newCount }

  for (const trip of sorted) {
    const month = (trip.date || '').slice(0, 7);
    if (!monthly.has(month)) monthly.set(month, { newCount: 0 });
    for (const seg of trip.segments) {
      const sl = SERVICE_LINES.find(l => l.id === seg.lineId);
      if (!sl) continue;
      const fromIdx = sl.stations.findIndex(s => s.name === seg.from);
      const toIdx = sl.stations.findIndex(s => s.name === seg.to);
      if (fromIdx < 0 || toIdx < 0) continue;
      const [a, b] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
      for (let i = a; i <= b; i++) {
        const name = sl.stations[i].name;
        if (!seen.has(name)) {
          seen.add(name);
          monthly.get(month).newCount++;
        }
      }
    }
  }

  // 累計を計算
  const months = [...monthly.keys()].sort();
  let cum = 0;
  const rows = months.map(m => {
    cum += monthly.get(m).newCount;
    return { month: m, cum, newCount: monthly.get(m).newCount };
  });
  const maxCum = rows[rows.length-1].cum;

  const chart = rows.map(r => `
    <div class="mp-prog-row">
      <span class="mp-prog-key">${r.month}</span>
      <div class="mp-prog-bar"><div class="mp-prog-fill" style="width:${maxCum>0?Math.round(r.cum/maxCum*100):0}%"></div></div>
      <span class="mp-prog-cum">${r.cum.toLocaleString()}</span>
      <span class="mp-prog-new">${r.newCount > 0 ? '+'+r.newCount : '±0'}</span>
    </div>
  `).join('');

  return `
    <div class="mp-prog-wrap">${chart}</div>
    <div class="mp-prog-summary">
      <div>📅 最初の記録月: <strong>${rows[0].month}</strong></div>
      <div>📅 最新の記録月: <strong>${rows[rows.length-1].month}</strong></div>
      <div>📈 累計ユニーク駅: <strong>${cum.toLocaleString()}</strong> 駅</div>
    </div>
  `;
}

// ── 累計駅数の推移 (年別) ─────────────────────────────────────
function buildStationProgressYearly(trips) {
  const sorted = [...trips]
    .filter(t => t.date && t.segments)
    .sort((a,b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return '<div class="mp-empty-s">データなし</div>';

  const seen = new Set();
  const yearly = new Map();

  for (const trip of sorted) {
    const year = (trip.date || '').slice(0, 4);
    if (!yearly.has(year)) yearly.set(year, { newCount: 0 });
    for (const seg of trip.segments) {
      const sl = SERVICE_LINES.find(l => l.id === seg.lineId);
      if (!sl) continue;
      const fromIdx = sl.stations.findIndex(s => s.name === seg.from);
      const toIdx = sl.stations.findIndex(s => s.name === seg.to);
      if (fromIdx < 0 || toIdx < 0) continue;
      const [a, b] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
      for (let i = a; i <= b; i++) {
        const name = sl.stations[i].name;
        if (!seen.has(name)) {
          seen.add(name);
          yearly.get(year).newCount++;
        }
      }
    }
  }

  const years = [...yearly.keys()].sort();
  let cum = 0;
  const rows = years.map(y => {
    cum += yearly.get(y).newCount;
    return { year: y, cum, newCount: yearly.get(y).newCount };
  });
  const maxNew = Math.max(...rows.map(r => r.newCount), 1);

  // 年別は新規駅数を棒の長さに (年ごとのペース比較)
  const chart = rows.map(r => `
    <div class="mp-prog-row">
      <span class="mp-prog-key">${r.year}</span>
      <div class="mp-prog-bar"><div class="mp-prog-fill year" style="width:${maxNew>0?Math.round(r.newCount/maxNew*100):0}%"></div></div>
      <span class="mp-prog-cum">+${r.newCount}</span>
      <span class="mp-prog-new" style="color:var(--silver)">累計 ${r.cum}</span>
    </div>
  `).join('');

  return `
    <div class="mp-prog-wrap">${chart}</div>
    <div class="mp-prog-summary">
      <div>🚆 活動年数: <strong>${rows.length}</strong> 年</div>
      <div>🏆 最も訪問した年: <strong>${rows.reduce((m,r)=>r.newCount>m.newCount?r:m, rows[0]).year}</strong> (${Math.max(...rows.map(r=>r.newCount))} 駅)</div>
    </div>
  `;
}

// 1 つの詳細カードを構築 (header with ⓘ + content + 隠し説明)
function detailCard(title, contentHtml, infoHtml) {
  const card = document.createElement('div');
  card.className = 'mp-d-card';
  card.innerHTML = `
    <div class="mp-d-hd">
      <span class="mp-d-title">${title}</span>
      <button class="mp-info-btn" onclick="toggleInfo(this)" title="解説">ⓘ</button>
    </div>
    <div class="mp-info-pop">${infoHtml}</div>
    <div class="mp-d-body">${contentHtml}</div>
  `;
  return card;
}

// 運営会社別
function buildByOperator(snap) {
  const byOp = {};
  for (const sl of SERVICE_LINES) {
    const op = sl.operator || '不明';
    if (!byOp[op]) byOp[op] = { unique: new Set(), ridden: new Set() };
    for (const s of sl.stations) byOp[op].unique.add(s.name);
    const r = snap.slSet[sl.id];
    if (r) for (const n of r) byOp[op].ridden.add(n);
  }
  const rows = Object.entries(byOp)
    .map(([op, v]) => ({ op, total: v.unique.size, ridden: v.ridden.size }))
    .filter(r => r.total >= 20)
    .sort((a,b) => (b.ridden/Math.max(1,b.total)) - (a.ridden/Math.max(1,a.total)) || b.total - a.total)
    .slice(0, 10);
  if (rows.length === 0) return '<div class="mp-empty-s">データなし</div>';
  return rows.map(r => {
    const pct = r.total > 0 ? Math.round(r.ridden / r.total * 100) : 0;
    return `<div class="mp-d-row">
      <span class="mp-d-l">${r.op}</span>
      <strong>${r.ridden} / ${r.total}</strong>
      <span class="mp-d-pct">(${pct}%)</span>
    </div>`;
  }).join('');
}

// 地域別
function buildByGroup(snap) {
  const byGroup = {};
  for (const sl of SERVICE_LINES) {
    const g = sl.group || 'その他';
    if (!byGroup[g]) byGroup[g] = { unique: new Set(), ridden: new Set() };
    for (const s of sl.stations) byGroup[g].unique.add(s.name);
    const r = snap.slSet[sl.id];
    if (r) for (const n of r) byGroup[g].ridden.add(n);
  }
  const order = ['首都圏・JR','東京メトロ・都営','首都圏・私鉄（東・北）','首都圏・私鉄（南・西）','首都圏・ローカル','関西','東海・中部','東北','九州','北海道','四国','中国・山陰','新幹線','その他'];
  const sortedGroups = Object.keys(byGroup).sort((a,b) => (order.indexOf(a) === -1 ? 999 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 999 : order.indexOf(b)));
  return sortedGroups.map(g => {
    const v = byGroup[g];
    const pct = v.unique.size > 0 ? Math.round(v.ridden.size / v.unique.size * 100) : 0;
    return `<div class="mp-d-row">
      <span class="mp-d-l">${g}</span>
      <strong>${v.ridden.size.toLocaleString()} / ${v.unique.size.toLocaleString()}</strong>
      <span class="mp-d-pct">(${pct}%)</span>
    </div>`;
  }).join('');
}

// 路線 Top 10
function buildTopLines(snap) {
  const rows = Object.entries(snap.lineRideCount)
    .map(([slId, n]) => {
      const sl = SERVICE_LINES.find(l => l.id === slId);
      if (!sl) return null;
      const ridden = snap.slSet[slId] ? snap.slSet[slId].size : 0;
      const pct = sl.stations.length > 0 ? Math.round(ridden / sl.stations.length * 100) : 0;
      return { name: sl.name, count: n, ridden, total: sl.stations.length, pct, color: sl.color };
    })
    .filter(r => r)
    .sort((a,b) => b.count - a.count)
    .slice(0, 10);
  if (rows.length === 0) return '<div class="mp-empty-s">乗車記録がありません</div>';
  return rows.map(r => `
    <div class="mp-d-row">
      <span class="mp-d-l"><span class="mp-d-dot" style="background:${r.color}"></span>${r.name}</span>
      <strong>${r.count}回</strong>
      <span class="mp-d-pct">完乗率 ${r.pct}% (${r.ridden}/${r.total})</span>
    </div>
  `).join('');
}

// 駅 Top 10
function buildTopStations(snap) {
  const rows = Object.entries(snap.visitCount)
    .map(([name, n]) => ({ name, count: n }))
    .sort((a,b) => b.count - a.count)
    .slice(0, 10);
  if (rows.length === 0) return '<div class="mp-empty-s">訪問駅なし</div>';
  return rows.map((r, i) => `
    <div class="mp-d-row">
      <span class="mp-d-l">${i+1}. ${r.name}</span>
      <strong>${r.count}回</strong>
    </div>
  `).join('');
}

// 認証ステータス分布
function buildAuthBreakdown(trips) {
  let verified = 0, manual = 0, suspicious = 0;
  for (const t of trips) {
    if (t.verified) verified++;
    else if (typeof fraudIsDowngraded === 'function' && fraudIsDowngraded(t)) suspicious++;
    else manual++;
  }
  const total = trips.length;
  const pct = (n) => total > 0 ? Math.round(n/total*100) : 0;
  return `
    <div class="mp-d-row"><span class="mp-d-l">🟢 公式 (verified)</span><strong>${verified}</strong> 件 <span class="mp-d-pct">(${pct(verified)}%)</span></div>
    <div class="mp-d-row"><span class="mp-d-l">🟡 要確認 (降格)</span><strong>${suspicious}</strong> 件 <span class="mp-d-pct">(${pct(suspicious)}%)</span></div>
    <div class="mp-d-row"><span class="mp-d-l">⚪ 自己申告 (manual)</span><strong>${manual}</strong> 件 <span class="mp-d-pct">(${pct(manual)}%)</span></div>
    <div class="mp-d-bar">
      <div class="mp-d-bar-seg verified" style="width:${pct(verified)}%"></div>
      <div class="mp-d-bar-seg suspicious" style="width:${pct(suspicious)}%"></div>
      <div class="mp-d-bar-seg manual" style="width:${pct(manual)}%"></div>
    </div>
  `;
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
