// ══════════════════════════════════════════════════════════════
// マイページ 📊 統計サブタブ (v190 分割)
// - 完乗率カード (🟢 公式 / ⚪ 全記録)
// - 詳細統計 16 種 (運営会社別 / 三大都市圏 / Top10 / 都道府県 / 時間帯ヒートマップ ...)
// - 詳細セクション ⓘ 解説トグル
//
// 共通レイヤー (13-mypage-common.js) の以下を使用:
//   - _mypageCache / _tripDateFilter
//   - tripCardHtml (直近の旅程カード)
//   - showMypageToast / isTimeMachineActive
// 新規・移動分の関数は NORIRECO.mypage.xxx にも公開。
// ══════════════════════════════════════════════════════════════

// ── 📊 統計セクション ──────────────────────────────────────────
function renderMpStatsSection() {
  // 完乗率カードは上部に常時表示されているので、ここでは既存 renderStats だけ呼ぶ
  // (月別グラフ・直近旅程・列車制覇など)
  const statsDiv = document.getElementById('stats-content');
  if (!statsDiv) return;
  statsDiv.innerHTML = '';
  try { if (typeof renderStats === 'function') renderStats(); } catch(e) { console.warn('[マイページ] renderStats:', e); }
}
NORIRECO.mypage.renderMpStatsSection = renderMpStatsSection;

function buildCompletionCards(trips) {
  const wrap = document.createElement('div');
  wrap.className = 'mp-stats-wrap';

  // 全駅マスター (ユニーク) — NORIRECO.data.SERVICE_LINES から駅名 Set を作る
  const allUniqueStations = new Set();
  let lineUnitTotal = 0;
  for (const sl of NORIRECO.data.SERVICE_LINES) {
    for (const s of sl.stations) allUniqueStations.add(s.name);
    lineUnitTotal += sl.stations.length;
  }
  const totalUnique = allUniqueStations.size;
  const totalLines = NORIRECO.data.SERVICE_LINES.length;

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
        const sl = NORIRECO.data.SERVICE_LINES.find(l => l.id === seg.lineId);
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
    for (const sl of NORIRECO.data.SERVICE_LINES) {
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
NORIRECO.mypage.buildCompletionCards = buildCompletionCards;

function toggleDetailPane() {
  const btn = document.getElementById('mp-detail-toggle-main');
  const pane = document.getElementById('mp-detail-pane-main');
  if (!btn || !pane) return;
  const isOpen = pane.style.display !== 'none';
  pane.style.display = isOpen ? 'none' : 'block';
  btn.textContent = isOpen ? '▾ 詳細を見る' : '▴ 詳細を閉じる';
}
window.toggleDetailPane = toggleDetailPane;
NORIRECO.mypage.toggleDetailPane = toggleDetailPane;

// ⓘ ボタンの説明トグル (1 度見れば閉じる)
function toggleInfo(btn) {
  const pop = btn.parentElement.parentElement.querySelector('.mp-info-pop');
  if (pop) pop.classList.toggle('open');
}
window.toggleInfo = toggleInfo;
NORIRECO.mypage.toggleInfo = toggleInfo;

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
    `NORIRECO.data.SERVICE_LINES の operator (運営会社) でグルーピングし、駅をユニークに集計。同じ会社の中で複数系統に属する駅は 1 駅としてカウント。`
  ));

  // ④ 三大都市圏完乗率
  pane.appendChild(detailCard('地域別 完乗率 (公式)',
    buildByGroup(sv),
    `NORIRECO.data.SERVICE_LINES の group (地域分類: 首都圏・関西・東海・東北・北海道・九州・四国・中国・新幹線 等) でグルーピング。三大都市圏での完乗率を見やすく可視化。`
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
    `自分の全旅程を 🟢 GPS 記録 (GPS 認証) / 🟡 要確認 (不正検知で降格) / ⚪ 手動記録 (manual) で分類。シェア機能 (将来) は 🟢 GPS 記録のみ対象になる予定。`
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
    `47 都道府県ごとに <strong>自分が訪問した駅数 / その県の全駅数</strong> を集計。<em>verified (GPS 記録) のみ</em> 対象。<br>判定は駅座標 (緯度経度) からの簡易 bbox + centroid 最近接で行うため、県境付近の数駅は誤分類されることがある。乗りつぶしオンライン・鉄レコの定番機能の簡易版。`
  ));

  // ⑩-2 直近の旅程 (v182) — メモ・遅延も含めた最新カードを統計タブから即確認
  pane.appendChild(detailCard('📌 直近の旅程',
    buildRecentTripCard(trips),
    `<strong>recorded_at</strong> が最も新しい旅程を 1 件だけカード形式で表示。<br>後追い記録モード (v181) で入れた <strong>📝 メモ・⏱ 遅延</strong> もここで一目で振り返れる。<br>もっと過去まで遡りたい場合は 🚃旅程タブへ。`
  ));

  // ⑪ 個人記録 (PR) + 連続乗車日数
  pane.appendChild(detailCard('🏆 個人記録 (PR)',
    buildPersonalRecords(trips),
    `Strava 風の個人ベスト記録セット。<br><strong>連続乗車日数</strong>: 1日でも記録があれば連続カウント、空白日が出るとリセット。「現在の連続」と「過去最長」を併記。<br>その他、最長旅程 (時間・駅数)・最多旅程日・最早/最遅時刻など、マニア心をくすぐる数字を集約。`
  ));

  // ⑫ 路線別 初回/最新乗車日 + 完乗達成日
  pane.appendChild(detailCard('🚃 路線タイムライン',
    buildLineTimeline(trips),
    `各営業系統ごとに <strong>初回乗車日</strong>・<strong>最新乗車日</strong>・<strong>完乗達成日</strong> を記録。<br>完乗系統は ✅ マーク + 達成日新しい順、進行中は完乗率降順で並ぶ。NAVITIME 移動・路線ログの定番機能を踏襲。<br>「いつあの路線を完乗したっけ?」を振り返るための記録。`
  ));

  // ⑬ 駅別 初回/最新訪問日 + 訪問回数 Top 50
  pane.appendChild(detailCard('🚉 駅タイムライン (訪問回数 Top 50)',
    buildStationTimeline(trips),
    `自分が訪問した駅を <strong>訪問回数の多い順</strong> に Top 50 表示。<br>各駅に <strong>初回訪問日</strong>・<strong>最新訪問日</strong> を併記。<br>ホーム駅・通勤通学最寄駅・乗換駅などが上位に来やすい。「初めて◯◯駅に行ったのはいつ?」が振り返れる。<br>※ 経路上の通過駅も含む (segment 内の中間駅もカウント)。`
  ));

  // ⑭ 時間帯×曜日ヒートマップ
  pane.appendChild(detailCard('🗓 利用パターン (曜日×時間帯)',
    buildTimeHeatmap(trips),
    `<strong>出発時刻</strong>を曜日 × 時間帯のヒートマップで可視化。色が濃いほど利用回数が多い。<br>通勤時間帯 (平日 7-9 時) や休日のお出かけパターンが一目でわかる。<br>Strava の活動傾向グラフを駅版に応用。`
  ));

  // ⑮ 未踏領域 (未訪問の都道府県・主要ターミナル)
  pane.appendChild(detailCard('🗺 未踏領域',
    buildUnexplored(sv),
    `<strong>未訪問の都道府県</strong>と <strong>未踏の主要ターミナル駅</strong>。<br>次の旅の目的地候補に。完乗マラソンの「残り」が見える化される。<br>※ 都道府県判定は簡易 bbox 法のため境界付近の駅は要注意。`
  ));

  // ⑯ 車両形式別 乗車回数
  pane.appendChild(detailCard('🚃 車両形式コレクション',
    buildCarModelStats(trips),
    `乗車記録に紐づけた <strong>車両形式 (E5系・N700S・E353系 等)</strong> の乗車回数集計。<br>同じ形式でも複数の列車で運用されているケース (例: E353系 → あずさ・かいじ・富士回遊) は併記。<br>初回乗車日・最新乗車日も記録、希少車両 (寝台・SL・観光列車) は ✨ 表示。<br>※ 確認モーダルで車両形式を選択した旅程のみ集計。`
  ));

  // ⑰ 会社別 年別 進捗
  pane.appendChild(detailCard('🏢 会社別 年別 進捗',
    buildOperatorYearly(trips),
    `<strong>各年に新規訪問した駅</strong> を運営会社別に分解。<br>「2025 年は JR東日本 +40 駅、東京メトロ +15 駅...」のように、その年どの会社で新しい駅を踏んだか分かる。<br>年別の旅行スタイルの変化が見える (例: 関東中心→関西進出など)。`
  ));
}
NORIRECO.mypage.buildDetailContent = buildDetailContent;

// ── 会社別 年別 進捗 ──────────────────────────────────────────
function buildOperatorYearly(trips) {
  const sorted = [...trips]
    .filter(t => t.date && t.segments)
    .sort((a,b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return '<div class="mp-empty-s">データなし</div>';

  const seen = new Set();
  const yearlyByOp = {};  // 'YYYY' → { operator → new count }

  for (const trip of sorted) {
    const year = (trip.date || '').slice(0, 4);
    if (!year) continue;
    for (const seg of trip.segments) {
      const sl = NORIRECO.data.SERVICE_LINES.find(l => l.id === seg.lineId);
      if (!sl) continue;
      const op = sl.operator || '不明';
      const fromIdx = sl.stations.findIndex(s => s.name === seg.from);
      const toIdx = sl.stations.findIndex(s => s.name === seg.to);
      if (fromIdx < 0 || toIdx < 0) continue;
      const [a, b] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
      for (let i = a; i <= b; i++) {
        const name = sl.stations[i].name;
        if (seen.has(name)) continue;
        seen.add(name);
        if (!yearlyByOp[year]) yearlyByOp[year] = {};
        yearlyByOp[year][op] = (yearlyByOp[year][op] || 0) + 1;
      }
    }
  }

  const years = Object.keys(yearlyByOp).sort();
  if (years.length === 0) return '<div class="mp-empty-s">データなし</div>';

  // 全体で最大の +n を見つける (バー幅基準)
  let maxYearTotal = 0;
  for (const y of years) {
    const t = Object.values(yearlyByOp[y]).reduce((s,n)=>s+n, 0);
    if (t > maxYearTotal) maxYearTotal = t;
  }

  return `
    <div class="mp-prog-summary" style="margin-bottom:10px">
      <div>📅 活動年数: <strong>${years.length}</strong> 年</div>
      <div>🏢 これまでに乗った会社数: <strong>${(() => {
        const allOps = new Set();
        for (const y of years) for (const op of Object.keys(yearlyByOp[y])) allOps.add(op);
        return allOps.size;
      })()}</strong> 社</div>
    </div>
    <div class="mp-yr-list">
      ${years.map(y => {
        const opEntries = Object.entries(yearlyByOp[y]).sort((a,b) => b[1] - a[1]);
        const total = opEntries.reduce((s, [, n]) => s + n, 0);
        const top = opEntries.slice(0, 6);
        const restCount = opEntries.length - top.length;
        return `
          <div class="mp-yr-row">
            <div class="mp-yr-header">
              <span class="mp-yr-year">${y}</span>
              <div class="mp-yr-bar"><div class="mp-yr-fill" style="width:${maxYearTotal>0?Math.round(total/maxYearTotal*100):0}%"></div></div>
              <span class="mp-yr-total">+${total} 駅</span>
            </div>
            <div class="mp-yr-ops">
              ${top.map(([op, n]) => `<span class="mp-yr-op">${op} <strong>+${n}</strong></span>`).join('')}
              ${restCount > 0 ? `<span class="mp-yr-op rest">他 ${restCount} 社</span>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
NORIRECO.mypage.buildOperatorYearly = buildOperatorYearly;

// ── 車両形式コレクション ────────────────────────────────────
function buildCarModelStats(trips) {
  const cmData = {};  // car_model → { count, firstDate, lastDate, trains: Set, trainIds: Set }
  for (const t of trips) {
    if (!t.car_model) continue;
    if (!cmData[t.car_model]) {
      cmData[t.car_model] = { count: 0, firstDate: t.date, lastDate: t.date, trains: new Set(), trainIds: new Set() };
    }
    const d = cmData[t.car_model];
    d.count++;
    if (t.date) {
      if (!d.firstDate || t.date < d.firstDate) d.firstDate = t.date;
      if (!d.lastDate || t.date > d.lastDate) d.lastDate = t.date;
    }
    if (t.train_name) d.trains.add(t.train_name);
    if (t.train_id) d.trainIds.add(t.train_id);
  }
  const rows = Object.entries(cmData)
    .map(([cm, d]) => ({ cm, count: d.count, firstDate: d.firstDate, lastDate: d.lastDate, trains: [...d.trains], trainIds: [...d.trainIds] }))
    .sort((a, b) => b.count - a.count || (a.cm || '').localeCompare(b.cm || '', 'ja'));

  if (rows.length === 0) return '<div class="mp-empty-s">車両形式が記録された旅程がありません<br>記録時に確認モーダルで形式を選ぶと集計されます</div>';

  // NORIRECO.trains.TRAINS マスターから rarity を取得 (関連 train の最高レアリティ)
  const rarityRank = { legendary: 4, rare: 3, uncommon: 2, common: 1 };
  function highestRarity(trainIds) {
    let best = null, bestRank = 0;
    for (const id of trainIds) {
      const tr = (NORIRECO.trains.TRAINS || []).find(t => t.id === id);
      if (tr && tr.rarity) {
        const r = rarityRank[tr.rarity] || 0;
        if (r > bestRank) { bestRank = r; best = tr.rarity; }
      }
    }
    return best;
  }

  const maxCount = rows[0].count;
  return `
    <div class="mp-pref-summary">
      <strong>${rows.length}</strong> 種類の車両形式に乗車 (全 <strong>${rows.reduce((s,r)=>s+r.count,0)}</strong> 回)
    </div>
    <div class="mp-st-tl-list">
      ${rows.map((r, i) => {
        const rar = highestRarity(r.trainIds);
        const rarBadge = rar === 'legendary' ? ' ⭐'
                       : rar === 'rare' ? ' ✨'
                       : '';
        const trainsText = r.trains.length > 0
          ? r.trains.slice(0, 3).join(' · ') + (r.trains.length > 3 ? ` 他${r.trains.length - 3}種` : '')
          : '(列車未指定)';
        return `
          <div class="mp-st-tl-row">
            <span class="mp-st-tl-rank">${i+1}</span>
            <div class="mp-st-tl-body">
              <div class="mp-st-tl-name" style="font-family:'DM Mono',monospace">${r.cm}${rarBadge}</div>
              <div class="mp-st-tl-dates" style="color:var(--gold);font-family:inherit">${trainsText}</div>
              <div class="mp-st-tl-dates">${r.firstDate === r.lastDate ? r.firstDate : `${r.firstDate} → ${r.lastDate}`}</div>
            </div>
            <div class="mp-st-tl-stats">
              <div class="mp-st-tl-count">${r.count}回</div>
              <div class="mp-st-tl-bar"><div class="mp-st-tl-fill" style="width:${Math.round(r.count/maxCount*100)}%"></div></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
NORIRECO.mypage.buildCarModelStats = buildCarModelStats;

// 全国主要ターミナル駅 (路線数が多い・地域代表)
const MAJOR_TERMINALS = [
  // 関東
  { name: '東京', region: '関東' }, { name: '新宿', region: '関東' }, { name: '渋谷', region: '関東' },
  { name: '池袋', region: '関東' }, { name: '品川', region: '関東' }, { name: '上野', region: '関東' },
  { name: '横浜', region: '関東' }, { name: '大宮', region: '関東' }, { name: '千葉', region: '関東' },
  // 関西
  { name: '大阪', region: '関西' }, { name: '京都', region: '関西' }, { name: '三ノ宮', region: '関西' },
  { name: '天王寺', region: '関西' }, { name: '難波', region: '関西' },
  // 中部・北陸
  { name: '名古屋', region: '中部' }, { name: '金沢', region: '北陸' }, { name: '新潟', region: '北陸信越' },
  { name: '長野', region: '北陸信越' }, { name: '静岡', region: '東海' }, { name: '浜松', region: '東海' },
  { name: '富山', region: '北陸' },
  // 中国・四国
  { name: '広島', region: '中国' }, { name: '岡山', region: '中国' },
  { name: '高松', region: '四国' }, { name: '松山', region: '四国' },
  { name: '高知', region: '四国' }, { name: '徳島', region: '四国' },
  // 九州
  { name: '博多', region: '九州' }, { name: '小倉', region: '九州' },
  { name: '熊本', region: '九州' }, { name: '鹿児島中央', region: '九州' },
  { name: '大分', region: '九州' }, { name: '宮崎', region: '九州' },
  { name: '長崎', region: '九州' }, { name: '佐賀', region: '九州' },
  // 北海道・東北
  { name: '札幌', region: '北海道' }, { name: '函館', region: '北海道' },
  { name: '旭川', region: '北海道' }, { name: '釧路', region: '北海道' },
  { name: '青森', region: '東北' }, { name: '盛岡', region: '東北' },
  { name: '仙台', region: '東北' }, { name: '秋田', region: '東北' },
  { name: '山形', region: '東北' }, { name: '福島', region: '東北' }, { name: '水戸', region: '関東' },
];

function buildUnexplored(snap) {
  // 訪問済み駅 (公式) のフラットセット
  const visited = new Set();
  for (const [_, set] of Object.entries(snap.slSet || {})) {
    for (const n of set) visited.add(n);
  }

  // 未訪問都道府県
  const master = buildPrefectureMaster();
  const visitedByPref = {};
  for (const sl of (NORIRECO.data.SERVICE_LINES || [])) {
    const set = snap.slSet[sl.id];
    if (!set) continue;
    for (const name of set) {
      const station = sl.stations.find(s => s.name === name);
      if (!station || station.lat == null) continue;
      const pref = prefOfStation(station.lat, station.lon);
      if (!pref) continue;
      if (!visitedByPref[pref]) visitedByPref[pref] = 0;
      visitedByPref[pref]++;
    }
  }
  const unvisitedPrefs = PREFECTURES
    .map(p => p[0])
    .filter(name => !visitedByPref[name] && (master.byPref[name] && master.byPref[name].size > 0));

  // 未訪問主要ターミナル
  const unvisitedTerminals = MAJOR_TERMINALS.filter(t => !visited.has(t.name));
  // 地域別グループ化
  const termByRegion = {};
  for (const t of unvisitedTerminals) {
    if (!termByRegion[t.region]) termByRegion[t.region] = [];
    termByRegion[t.region].push(t.name);
  }

  const regionOrder = ['関東','関西','中部','東海','北陸','北陸信越','中国','四国','九州','北海道','東北'];
  const sortedRegions = Object.keys(termByRegion).sort((a,b) => {
    const ai = regionOrder.indexOf(a), bi = regionOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const totalTerm = MAJOR_TERMINALS.length;
  const visitedTermCount = totalTerm - unvisitedTerminals.length;

  return `
    <div class="mp-pr-section">
      <div class="mp-pr-section-h">🗾 未訪問の都道府県 (${unvisitedPrefs.length} / 47 県)</div>
      ${unvisitedPrefs.length === 0
        ? `<div class="mp-pref-summary" style="background:rgba(72,213,151,.1);border-color:#48d597"><strong style="color:#48d597">🎉 47 都道府県すべてに乗車記録あり!</strong></div>`
        : `<div class="mp-unex-list">${unvisitedPrefs.map(p => `<span class="mp-unex-tag">${p}</span>`).join('')}</div>`
      }
    </div>
    <div class="mp-pr-section">
      <div class="mp-pr-section-h">🏙 未踏の主要ターミナル (${unvisitedTerminals.length} / ${totalTerm} 駅)</div>
      <div class="mp-pref-summary">
        制覇 <strong style="color:#48d597">${visitedTermCount}</strong> / ${totalTerm} 駅
      </div>
      ${sortedRegions.map(reg => `
        <div class="mp-unex-region">
          <div class="mp-unex-region-h">${reg}</div>
          <div class="mp-unex-list">
            ${termByRegion[reg].map(name => `<span class="mp-unex-tag terminal">${name}</span>`).join('')}
          </div>
        </div>
      `).join('')}
      ${unvisitedTerminals.length === 0 ? `<div class="mp-pref-summary" style="background:rgba(72,213,151,.1)"><strong style="color:#48d597">🎉 主要ターミナルすべて制覇!</strong></div>` : ''}
    </div>
  `;
}
NORIRECO.mypage.buildUnexplored = buildUnexplored;

// ── 時間帯×曜日ヒートマップ ────────────────────────────────
function buildTimeHeatmap(trips) {
  // 7 曜日 × 24 時間
  const heatGrid = Array.from({length: 7}, () => Array(24).fill(0));
  const dowNames = ['日','月','火','水','木','金','土'];

  let total = 0;
  for (const t of trips) {
    if (!t.date || !t.depart_time) continue;
    const d = new Date(t.date + 'T00:00:00');
    if (isNaN(d.getTime())) continue;
    const dow = d.getDay();
    const hour = parseInt(t.depart_time.slice(0, 2), 10);
    if (isNaN(hour) || hour < 0 || hour > 23) continue;
    heatGrid[dow][hour]++;
    total++;
  }

  if (total === 0) return '<div class="mp-empty-s">depart_time 付き旅程がありません</div>';

  // 最大値 (色強度の基準)
  let max = 0;
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) if (heatGrid[d][h] > max) max = heatGrid[d][h];

  // 平日朝 / 休日 のサマリ
  let weekdayMorning = 0, weekendDay = 0;
  for (let d = 1; d <= 5; d++) for (let h = 6; h < 10; h++) weekdayMorning += heatGrid[d][h];
  for (let d of [0, 6]) for (let h = 9; h < 18; h++) weekendDay += heatGrid[d][h];

  // ピーク時間帯
  let peakDow = 0, peakHour = 0, peakVal = 0;
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) {
    if (heatGrid[d][h] > peakVal) { peakVal = heatGrid[d][h]; peakDow = d; peakHour = h; }
  }

  // ヒートマップ描画 (横: 時間 0-23, 縦: 曜日 日-土)
  let html = '<div class="mp-hm-wrap">';
  html += '<div class="mp-hm-grid">';
  html += '<div class="mp-hm-corner"></div>';
  for (let h = 0; h < 24; h++) {
    html += `<div class="mp-hm-hr">${h%3===0?h:''}</div>`;
  }
  for (let d = 0; d < 7; d++) {
    html += `<div class="mp-hm-dow${d===0||d===6?' weekend':''}">${dowNames[d]}</div>`;
    for (let h = 0; h < 24; h++) {
      const v = heatGrid[d][h];
      const intensity = max > 0 ? v / max : 0;
      const opacity = v > 0 ? (0.15 + 0.85 * intensity) : 0;
      const title = v > 0 ? `${dowNames[d]}曜 ${h}時台: ${v} 件` : '';
      html += `<div class="mp-hm-cell" style="background:rgba(232,53,42,${opacity})" title="${title}"></div>`;
    }
  }
  html += '</div>';
  html += `<div class="mp-prog-summary">
    <div>🔥 ピーク: <strong>${dowNames[peakDow]}曜 ${peakHour}時台</strong> (${peakVal} 件)</div>
    <div>💼 平日朝 (6-10時): <strong>${weekdayMorning}</strong> 件</div>
    <div>🎒 休日昼 (9-18時): <strong>${weekendDay}</strong> 件</div>
  </div>`;
  html += '</div>';
  return html;
}
NORIRECO.mypage.buildTimeHeatmap = buildTimeHeatmap;

// ── 駅タイムライン (初回/最新訪問日 + 訪問回数 Top 50) ─────
function buildStationTimeline(trips) {
  const sorted = [...trips]
    .filter(t => t.date && t.segments)
    .sort((a,b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return '<div class="mp-empty-s">訪問駅がありません</div>';

  // 駅 → { firstDate, lastDate, count }
  const stData = {};

  for (const trip of sorted) {
    const tripStations = new Set();  // この trip で訪問した駅 (1 trip で同じ駅を複数回カウントしない)
    for (const seg of trip.segments) {
      const sl = NORIRECO.data.SERVICE_LINES.find(l => l.id === seg.lineId);
      if (!sl) continue;
      const fromIdx = sl.stations.findIndex(s => s.name === seg.from);
      const toIdx = sl.stations.findIndex(s => s.name === seg.to);
      if (fromIdx < 0 || toIdx < 0) continue;
      const [a, b] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
      for (let i = a; i <= b; i++) tripStations.add(sl.stations[i].name);
    }
    for (const name of tripStations) {
      if (!stData[name]) stData[name] = { firstDate: trip.date, lastDate: trip.date, count: 0 };
      stData[name].lastDate = trip.date;
      stData[name].count++;
    }
  }

  const rows = Object.entries(stData)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.count - a.count || a.firstDate.localeCompare(b.firstDate))
    .slice(0, 50);

  if (rows.length === 0) return '<div class="mp-empty-s">訪問駅がありません</div>';

  const maxCount = rows[0].count;

  return `
    <div class="mp-pref-summary">
      <strong>${Object.keys(stData).length.toLocaleString()}</strong> ユニーク駅 訪問 (上位 ${Math.min(50, rows.length)} 駅を表示)
    </div>
    <div class="mp-st-tl-list">
      ${rows.map((r, i) => `
        <div class="mp-st-tl-row">
          <span class="mp-st-tl-rank">${i+1}</span>
          <div class="mp-st-tl-body">
            <div class="mp-st-tl-name">${r.name}</div>
            <div class="mp-st-tl-dates">
              ${r.firstDate === r.lastDate ? r.firstDate : `${r.firstDate} → ${r.lastDate}`}
            </div>
          </div>
          <div class="mp-st-tl-stats">
            <div class="mp-st-tl-count">${r.count}回</div>
            <div class="mp-st-tl-bar"><div class="mp-st-tl-fill" style="width:${Math.round(r.count/maxCount*100)}%"></div></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
NORIRECO.mypage.buildStationTimeline = buildStationTimeline;

// ── 路線タイムライン (初回/最新乗車日 + 完乗達成日) ──────────
function buildLineTimeline(trips) {
  const sorted = [...trips]
    .filter(t => t.date && t.segments)
    .sort((a,b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return '<div class="mp-empty-s">乗車記録がありません</div>';

  const lineData = {};  // sl.id → { firstDate, lastDate, completeDate, rides, stations: Set }

  for (const trip of sorted) {
    const tripLines = new Set();
    for (const seg of trip.segments) {
      const sl = NORIRECO.data.SERVICE_LINES.find(l => l.id === seg.lineId);
      if (!sl) continue;
      tripLines.add(sl.id);
      const fromIdx = sl.stations.findIndex(s => s.name === seg.from);
      const toIdx = sl.stations.findIndex(s => s.name === seg.to);
      if (fromIdx < 0 || toIdx < 0) continue;
      const [a, b] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
      if (!lineData[sl.id]) {
        lineData[sl.id] = { firstDate: trip.date, lastDate: trip.date, completeDate: null, rides: 0, stations: new Set() };
      }
      for (let i = a; i <= b; i++) lineData[sl.id].stations.add(sl.stations[i].name);
      lineData[sl.id].lastDate = trip.date;
      if (!lineData[sl.id].completeDate &&
          lineData[sl.id].stations.size === sl.stations.length &&
          sl.stations.length > 0) {
        lineData[sl.id].completeDate = trip.date;
      }
    }
    for (const slId of tripLines) {
      if (lineData[slId]) lineData[slId].rides++;
    }
  }

  const rows = Object.entries(lineData).map(([slId, d]) => {
    const sl = NORIRECO.data.SERVICE_LINES.find(l => l.id === slId);
    if (!sl) return null;
    return {
      slId,
      name: sl.name,
      color: sl.color || '#888',
      operator: sl.operator || '',
      total: sl.stations.length,
      ridden: d.stations.size,
      firstDate: d.firstDate,
      lastDate: d.lastDate,
      completeDate: d.completeDate,
      rides: d.rides,
      pct: sl.stations.length > 0 ? Math.round(d.stations.size / sl.stations.length * 100) : 0,
    };
  }).filter(r => r);

  // 並び: 完乗 (達成日新しい順) → 進行中 (完乗率降順)
  rows.sort((a, b) => {
    if (a.completeDate && !b.completeDate) return -1;
    if (!a.completeDate && b.completeDate) return 1;
    if (a.completeDate && b.completeDate) return b.completeDate.localeCompare(a.completeDate);
    return b.pct - a.pct || b.ridden - a.ridden;
  });

  const completeCount = rows.filter(r => r.completeDate).length;
  const SHOW_LIMIT = 60;
  const visible = rows.slice(0, SHOW_LIMIT);

  return `
    <div class="mp-pref-summary">
      <strong>${completeCount}</strong> 系統 完乗 / 進行中 <strong style="color:var(--gold)">${rows.length - completeCount}</strong> 系統
    </div>
    <div class="mp-line-tl-list">
      ${visible.map(r => `
        <div class="mp-line-tl-row${r.completeDate ? ' complete' : ''}">
          <span class="mp-line-tl-dot" style="background:${r.color}"></span>
          <div class="mp-line-tl-body">
            <div class="mp-line-tl-name">${r.name}${r.completeDate ? ' <span class="mp-line-tl-check">✅</span>' : ''}</div>
            <div class="mp-line-tl-dates">
              ${r.completeDate
                ? `初回 ${r.firstDate} → 完乗 ${r.completeDate}`
                : `初回 ${r.firstDate} · 最新 ${r.lastDate}`}
            </div>
          </div>
          <div class="mp-line-tl-stats">
            <div class="mp-line-tl-pct">${r.pct}%</div>
            <div class="mp-line-tl-sub">${r.ridden}/${r.total}駅 · ${r.rides}回</div>
          </div>
        </div>
      `).join('')}
      ${rows.length > SHOW_LIMIT ? `<div class="mp-empty-s" style="text-align:center;padding:6px">…他 ${rows.length - SHOW_LIMIT} 系統 (上位 ${SHOW_LIMIT} 系統を表示)</div>` : ''}
    </div>
  `;
}
NORIRECO.mypage.buildLineTimeline = buildLineTimeline;

// ── 直近の旅程 (v182) ──────────────────────────────────────────
// recorded_at が最新の trip を 1 件だけ tripCardHtml で表示。
// メモ・遅延を含むフル情報を統計タブで即確認できるようにする。
function buildRecentTripCard(trips) {
  if (!trips || trips.length === 0) {
    return '<div class="mp-empty-s">乗車記録がありません</div>';
  }
  const sorted = [...trips].sort((a, b) =>
    (b.recorded_at || b.date || '').localeCompare(a.recorded_at || a.date || '')
  );
  const latest = sorted[0];
  return `<div class="mp-trip-list">${tripCardHtml(latest)}</div>`;
}
NORIRECO.mypage.buildRecentTripCard = buildRecentTripCard;

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
        const sl = NORIRECO.data.SERVICE_LINES.find(l => l.id === seg.lineId);
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
        const sl = NORIRECO.data.SERVICE_LINES.find(l => l.id === seg.lineId);
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
NORIRECO.mypage.buildPersonalRecords = buildPersonalRecords;

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
NORIRECO.mypage.prefOfStation = prefOfStation;

// 全駅を都道府県別に集計 (1 回だけ計算してキャッシュ)
let _prefMasterCache = null;  // { byPref: { 県: Set<駅名> }, totalByPref: { 県: 駅数 } }
function buildPrefectureMaster() {
  if (_prefMasterCache) return _prefMasterCache;
  const byPref = {};
  for (const sl of (NORIRECO.data.SERVICE_LINES || [])) {
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
NORIRECO.mypage.buildPrefectureMaster = buildPrefectureMaster;

// 都道府県別 訪問駅数チャート
function buildPrefectureChart(snap) {
  const master = buildPrefectureMaster();
  // 自分が訪問した駅 (snap.slSet) から都道府県別に集計
  const visitedByPref = {};
  for (const sl of (NORIRECO.data.SERVICE_LINES || [])) {
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
NORIRECO.mypage.buildPrefectureChart = buildPrefectureChart;

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
      const sl = NORIRECO.data.SERVICE_LINES.find(l => l.id === seg.lineId);
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
NORIRECO.mypage.buildStationProgressMonthly = buildStationProgressMonthly;

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
      const sl = NORIRECO.data.SERVICE_LINES.find(l => l.id === seg.lineId);
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
NORIRECO.mypage.buildStationProgressYearly = buildStationProgressYearly;

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
NORIRECO.mypage.detailCard = detailCard;

// 運営会社別
function buildByOperator(snap) {
  const byOp = {};
  for (const sl of NORIRECO.data.SERVICE_LINES) {
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
NORIRECO.mypage.buildByOperator = buildByOperator;

// 地域別
function buildByGroup(snap) {
  const byGroup = {};
  for (const sl of NORIRECO.data.SERVICE_LINES) {
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
NORIRECO.mypage.buildByGroup = buildByGroup;

// 路線 Top 10
function buildTopLines(snap) {
  const rows = Object.entries(snap.lineRideCount)
    .map(([slId, n]) => {
      const sl = NORIRECO.data.SERVICE_LINES.find(l => l.id === slId);
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
NORIRECO.mypage.buildTopLines = buildTopLines;

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
NORIRECO.mypage.buildTopStations = buildTopStations;

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
    <div class="mp-d-row"><span class="mp-d-l">🟢 GPS 記録 (verified)</span><strong>${verified}</strong> 件 <span class="mp-d-pct">(${pct(verified)}%)</span></div>
    <div class="mp-d-row"><span class="mp-d-l">🟡 要確認 (降格)</span><strong>${suspicious}</strong> 件 <span class="mp-d-pct">(${pct(suspicious)}%)</span></div>
    <div class="mp-d-row"><span class="mp-d-l">⚪ 手動記録 (manual)</span><strong>${manual}</strong> 件 <span class="mp-d-pct">(${pct(manual)}%)</span></div>
    <div class="mp-d-bar">
      <div class="mp-d-bar-seg verified" style="width:${pct(verified)}%"></div>
      <div class="mp-d-bar-seg suspicious" style="width:${pct(suspicious)}%"></div>
      <div class="mp-d-bar-seg manual" style="width:${pct(manual)}%"></div>
    </div>
  `;
}
NORIRECO.mypage.buildAuthBreakdown = buildAuthBreakdown;
