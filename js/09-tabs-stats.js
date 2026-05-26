// ══════════════════════════════════════
// TABS
//
// v208 ES Modules パイロット (案 β) stage 2: `<script type="module">` 化。
// 末尾で switchTab / renderList / renderStats を window に明示公開。
// switchTab は HTML onclick から、renderList / renderStats は 13-mypage-common / 13a / 13c
// (module) から bare 識別子で呼ばれる。
//
// v223 ES Modules stage 3: 11-fraud-detection を import 化。
// v224: 12-auth から currentUserId / authBearerToken を import 化。
// v345: 不正検知撤回に伴い 11-fraud-detection の import を撤去。
// v225: 13-mypage-common.renderMypage を import 化。
// ══════════════════════════════════════
import { currentUserId, authBearerToken } from './12-auth.js';
import { renderMypage, tripCardHtml } from './13-mypage-common.js';
import { filterTripsByDate, lStats } from './05-supabase-data.js';
// v359: 路線タブの 📺 旅程 / 📸 メモ アイコン → 詳細モーダルで一覧表示
import { memoCardHtml } from './16-memos.js';

function switchTab(n){
  // 旧 'list' / 'stats' は 'mypage' にリダイレクト (タブ集約のため)
  if(n==='list'||n==='stats')n='mypage';
  const tabs=['map','mypage'];
  const panes=['pane-map','pane-mypage'];
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',tabs[i]===n));
  document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
  document.getElementById(`pane-${n}`)?.classList.add('active');
  if(n==='map'&&NORIRECO.map.instance)setTimeout(()=>NORIRECO.map.instance.invalidateSize(),50);
  if(n==='mypage')renderMypage();
}

// ══════════════════════════════════════
// LIST
// ══════════════════════════════════════
const SL_GROUP_ORDER = [
  '首都圏・JR','東京メトロ・都営',
  '首都圏・私鉄（東・北）','首都圏・私鉄（南・西）','首都圏・ローカル',
  '関西','東海・中部','東北','九州','北海道','四国','中国・山陰','新幹線',
  'その他'
];

// v358: 路線タブの車両形式フィルタ (IME 安全のためフィルタバーは残置、リスト本体だけ再描画)
let _linesCarModelQuery = '';

// 全 trip から sl_id → Map<carModel, count> を集計。
// 集計結果は車両形式バッジ表示と検索フィルタの両方で使う
function aggregateCarModelsByLineId() {
  const carsByLid = new Map();
  const trips = (window.NORIRECO && NORIRECO.mypage && NORIRECO.mypage.state && NORIRECO.mypage.state._mypageCache) || [];
  for (const t of trips) {
    if (!t.car_model) continue;
    const lineIds = new Set();
    for (const seg of (t.segments || [])) {
      if (seg && seg.lineId) lineIds.add(seg.lineId);
    }
    for (const lid of lineIds) {
      if (!carsByLid.has(lid)) carsByLid.set(lid, new Map());
      const m = carsByLid.get(lid);
      m.set(t.car_model, (m.get(t.car_model) || 0) + 1);
    }
  }
  return carsByLid;
}

// 出現回数の多い順に上位 N 件取得 (同数は順序問わず)
function topCarModels(carMap, n) {
  if (!carMap) return [];
  return Array.from(carMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(e => e[0]);
}

// v359: 路線詳細モーダル用の集計 — 各 sl ごとに trips[] / memos[]
function aggregateTripsByLineId() {
  const map = new Map();
  const trips = (window.NORIRECO && NORIRECO.mypage && NORIRECO.mypage.state && NORIRECO.mypage.state._mypageCache) || [];
  for (const t of trips) {
    const seen = new Set();
    for (const seg of (t.segments || [])) {
      if (seg && seg.lineId && !seen.has(seg.lineId)) {
        seen.add(seg.lineId);
        if (!map.has(seg.lineId)) map.set(seg.lineId, []);
        map.get(seg.lineId).push(t);
      }
    }
  }
  return map;
}

// メモは line_id 直接 (路線メモ) と station_id 経由 (駅メモ、その駅が含まれる sl) を両方拾う。
// 同じ memo が両ルートで重複しないよう Set<memoId> で排除
function aggregateMemosByLineId() {
  const map = new Map();   // lineId → memo[]
  const memos = (window.NORIRECO && NORIRECO.memos && NORIRECO.memos.state && NORIRECO.memos.state.cache) || [];
  // 1. 路線メモ
  for (const m of memos) {
    if (m && m.line_id) {
      if (!map.has(m.line_id)) map.set(m.line_id, []);
      map.get(m.line_id).push(m);
    }
  }
  // 2. 駅メモ → station_id から該当 sl を全て拾う
  const stationIdToLineIds = new Map();   // sid → Set<lineId>
  for (const sl of (NORIRECO.data?.SERVICE_LINES || [])) {
    for (const st of (sl.stations || [])) {
      if (!st.id) continue;
      if (!stationIdToLineIds.has(st.id)) stationIdToLineIds.set(st.id, new Set());
      stationIdToLineIds.get(st.id).add(sl.id);
    }
  }
  for (const m of memos) {
    if (!m || !m.station_id) continue;
    const lids = stationIdToLineIds.get(m.station_id);
    if (!lids) continue;
    for (const lid of lids) {
      if (!map.has(lid)) map.set(lid, []);
      const arr = map.get(lid);
      if (!arr.includes(m)) arr.push(m);   // 重複排除 (路線メモと駅メモ両ルートで拾った場合)
    }
  }
  return map;
}

// v359: モーダル open/close/switch
let _lineDetailContext = null;   // { sl, trips, memos }
function openLineDetailModal(slId, initialTab) {
  const sl = (NORIRECO.data?.SERVICE_LINES || []).find(l => l.id === slId);
  if (!sl) return;
  const tripsByLid = aggregateTripsByLineId();
  const memosByLid = aggregateMemosByLineId();
  const trips = tripsByLid.get(slId) || [];
  const memos = memosByLid.get(slId) || [];
  // 並びは新しい順
  trips.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  memos.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  _lineDetailContext = { sl, trips, memos };
  const titleEl = document.getElementById('mp-line-detail-title');
  const subEl   = document.getElementById('mp-line-detail-sub');
  if (titleEl) titleEl.textContent = sl.name;
  if (subEl)   subEl.textContent = `${sl.operator || ''} · 旅程 ${trips.length} 件 / メモ ${memos.length} 件`;
  document.getElementById('mp-line-detail-tab-trips').textContent = `📺 旅程 (${trips.length})`;
  document.getElementById('mp-line-detail-tab-memos').textContent = `📸 メモ (${memos.length})`;
  // 初期タブ: 引数優先、無ければ件数の多い方 (両方 0 なら trips)
  const tab = initialTab || (memos.length > trips.length ? 'memos' : 'trips');
  switchLineDetailTab(tab);
  document.getElementById('mp-line-detail-modal')?.classList.add('open');
}
window.openLineDetailModal = openLineDetailModal;

function closeLineDetailModal() {
  document.getElementById('mp-line-detail-modal')?.classList.remove('open');
  _lineDetailContext = null;
}
window.closeLineDetailModal = closeLineDetailModal;

function switchLineDetailTab(tab) {
  if (!_lineDetailContext) return;
  const { trips, memos, sl } = _lineDetailContext;
  const body = document.getElementById('mp-line-detail-body');
  if (!body) return;
  const tripsTab = document.getElementById('mp-line-detail-tab-trips');
  const memosTab = document.getElementById('mp-line-detail-tab-memos');
  const activate = (btn, on) => {
    if (!btn) return;
    btn.style.color = on ? 'var(--gold)' : 'var(--silver)';
    btn.style.borderBottomColor = on ? 'var(--gold)' : 'transparent';
    btn.style.fontWeight = on ? '600' : '400';
  };
  activate(tripsTab, tab === 'trips');
  activate(memosTab, tab === 'memos');
  if (tab === 'trips') {
    body.innerHTML = trips.length
      ? trips.map(tripCardHtml).join('')
      : `<div style="padding:24px;text-align:center;color:var(--silver);font-size:11px">${sl.name} を通る旅程はまだありません</div>`;
  } else {
    body.innerHTML = memos.length
      ? `<div class="mp-memo-list">${memos.map(memoCardHtml).join('')}</div>`
      : `<div style="padding:24px;text-align:center;color:var(--silver);font-size:11px">${sl.name} に関係するメモはまだありません</div>`;
  }
}
window.switchLineDetailTab = switchLineDetailTab;

export async function renderList(){
  const c=document.getElementById('list-content');
  await NORIRECO.serviceLines.build();

  // v358: フィルタバーは IME を壊さないよう 1 度だけ build、リスト本体だけ毎回置換
  let filterBar = c.querySelector('#mp-lines-filter-bar');
  let listBody  = c.querySelector('#mp-lines-list-body');
  if (!filterBar) {
    c.innerHTML = `
      <div id="mp-lines-filter-bar" class="mp-filter-bar" style="margin-bottom:8px">
        <div class="mp-filter-row">
          <label class="mp-filter-lbl">🚆 車両</label>
          <input type="search" class="mp-filter-input" id="mp-lines-fil-car" placeholder="例: E235 / キハ110" title="乗車した車両形式で路線を絞り込み" value="${_linesCarModelQuery}" oninput="onMpLinesCarModelInput(this.value)">
        </div>
      </div>
      <div id="mp-lines-list-body"></div>`;
    listBody = c.querySelector('#mp-lines-list-body');
  } else {
    listBody.innerHTML = '';
  }

  const carsByLid  = aggregateCarModelsByLineId();
  const tripsByLid = aggregateTripsByLineId();   // v359
  const memosByLid = aggregateMemosByLineId();   // v359
  const cmq = (_linesCarModelQuery || '').trim().toLowerCase();
  // 車両形式フィルタ: クエリに一致する車両形式を持つ sl_id だけ通す
  const matchingLids = cmq ? new Set() : null;
  if (cmq) {
    for (const [lid, m] of carsByLid) {
      for (const cm of m.keys()) {
        if (cm.toLowerCase().includes(cmq)) { matchingLids.add(lid); break; }
      }
    }
  }

  const grouped={};
  NORIRECO.data.SERVICE_LINES.forEach(sl=>{
    if (matchingLids && !matchingLids.has(sl.id)) return;
    const g=sl.group||'その他';if(!grouped[g])grouped[g]=[];grouped[g].push(sl);
  });
  // クエリでヒット 0 件のとき案内
  if (cmq && Object.keys(grouped).length === 0) {
    listBody.innerHTML = `<div style="padding:24px;text-align:center;color:var(--silver);font-size:11px">「${cmq}」を含む車両形式の記録なし</div>`;
    return;
  }
  const groupOrder = [...SL_GROUP_ORDER, ...Object.keys(grouped).filter(g => !SL_GROUP_ORDER.includes(g))];
  groupOrder.forEach(grp => {
    const lines = grouped[grp]; if (!lines || lines.length === 0) return;
    // グループ内: 達成率(降順) → 路線名
    lines.sort((a,b) => NORIRECO.serviceLines.stats(b).pct - NORIRECO.serviceLines.stats(a).pct || a.name.localeCompare(b.name, 'ja'));
    const t=document.createElement('div');t.className='sec-lbl';t.textContent=`${grp} (${lines.length})`;listBody.appendChild(t);
    lines.forEach(sl=>{
      const s=NORIRECO.serviceLines.stats(sl);const card=document.createElement('div');
      card.className='lcard'+(s.pct===100?' done':s.r>0?' partial':'');
      const isOverridden = !!(sl.originalColor && sl.originalColor !== sl.color);
      // v358: 乗車車両形式 上位 3 件 + 「他 N 件」
      const carMap = carsByLid.get(sl.id);
      const totalCarCount = carMap ? carMap.size : 0;
      const topCars = topCarModels(carMap, 3);
      const moreCount = totalCarCount - topCars.length;
      const carLine = topCars.length
        ? `<div class="lc-cars" style="font-size:10px;color:var(--silver);margin-top:4px;padding-left:2px">🚆 ${topCars.join(', ')}${moreCount > 0 ? ` <span style="opacity:.6">+他${moreCount}</span>` : ''}</div>`
        : '';
      // v359: 📺 旅程 / 📸 メモ アイコン (件数 0 は非表示)
      const tripCount = (tripsByLid.get(sl.id) || []).length;
      const memoCount = (memosByLid.get(sl.id) || []).length;
      const iconBtnStyle = 'background:rgba(20,32,46,.8);color:var(--silver);border:1px solid var(--track);border-radius:14px;padding:3px 8px;font-size:10px;cursor:pointer;margin-left:6px';
      const tripIcon = tripCount > 0
        ? `<button class="lc-icon-trips" data-line-id="${sl.id}" title="${sl.name} の旅程一覧" style="${iconBtnStyle}">📺 ${tripCount}</button>`
        : '';
      const memoIcon = memoCount > 0
        ? `<button class="lc-icon-memos" data-line-id="${sl.id}" title="${sl.name} のメモ一覧" style="${iconBtnStyle}">📸 ${memoCount}</button>`
        : '';
      const iconRow = (tripIcon || memoIcon)
        ? `<div class="lc-icons" style="margin-top:4px;display:flex;flex-wrap:wrap">${tripIcon}${memoIcon}</div>`
        : '';
      card.innerHTML = `
        <div class="lc-h">
          <input type="color" class="lc-color" value="${sl.color}" data-line-id="${sl.id}" title="この系統の色を変更">
          <span class="lc-name">${sl.name}</span>
          <span class="lc-reg">${sl.operator||''}</span>
          <span class="lc-pct" style="color:${s.r>0?sl.color:'var(--silver)'}">${s.pct}%</span>
        </div>
        <div class="prog"><div class="prog-bar" style="width:${s.pct}%;background:${sl.color}"></div></div>
        <div class="lc-sub">
          ${s.r}/${s.t}駅${s.pct===100?' ✓ 完乗！':''}
          ${isOverridden ? `<button class="lc-color-reset" data-line-id="${sl.id}" title="元の色に戻す">↺ 色をリセット</button>` : ''}
        </div>
        ${carLine}
        ${iconRow}`;
      listBody.appendChild(card);
    });
  });

  // v243: color picker / reset ボタンのイベント設定 (listBody スコープ内)
  listBody.querySelectorAll('.lc-color').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = e.target.dataset.lineId;
      const color = e.target.value;
      if (window.NORIRECO && NORIRECO.colorOverrides) NORIRECO.colorOverrides.set(id, color);
    });
  });
  listBody.querySelectorAll('.lc-color-reset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.lineId;
      if (window.NORIRECO && NORIRECO.colorOverrides) NORIRECO.colorOverrides.reset(id);
    });
  });
  // v359: 旅程/メモアイコンのクリック → 路線詳細モーダル
  listBody.querySelectorAll('.lc-icon-trips').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openLineDetailModal(e.currentTarget.dataset.lineId, 'trips');
    });
  });
  listBody.querySelectorAll('.lc-icon-memos').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openLineDetailModal(e.currentTarget.dataset.lineId, 'memos');
    });
  });
}

// v358: 車両形式 input の oninput ハンドラ。フィルタバー DOM は触らずリスト本体だけ再描画 (IME 安全)
function onMpLinesCarModelInput(value) {
  _linesCarModelQuery = value || '';
  renderList();
}
window.onMpLinesCarModelInput = onMpLinesCarModelInput;

// ══════════════════════════════════════
// STATS
// ══════════════════════════════════════
export async function renderStats(){
  const c=document.getElementById('stats-content');c.innerHTML='';
  await NORIRECO.serviceLines.build();

  // 完乗率カードはマイページ上部に常時表示されるため、ここでは活動量メトリクスのみ

  // ── Supabaseからの旅程統計（非同期） ──
  const tripSection = document.createElement('div');
  tripSection.innerHTML = `<div class="sec-lbl">活動量 <span style="font-size:9px;color:var(--silver)">☁️ Supabase</span></div>
    <div class="stat-grid" id="trip-stat-grid">
      <div class="scard"><div class="sc-l">読み込み中...</div><div class="sc-v" style="font-size:14px">...</div></div>
    </div>`;
  c.appendChild(tripSection);

  // Supabaseから統計を非同期取得 — ログイン中なら自分のデータのみ
  const _uid = currentUserId();
  const _statsUrl = _uid
    ? `${SUPABASE_URL}/rest/v1/norireco_trips?select=*&user_id=eq.${_uid}`
    : `${SUPABASE_URL}/rest/v1/norireco_trips?select=*`;
  fetch(_statsUrl, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authBearerToken()}` }
  }).then(r => r.json()).then(rawTrips => {
    // グローバル過去モード (_tripDateFilter) が有効なら絞る
    const trips = filterTripsByDate(rawTrips);
    const totalTrips = trips.length;
    const totalStations = trips.reduce((s,t) => s + (t.total_stations||0), 0);
    const totalTransfers = trips.reduce((s,t) => s + (t.transfers||0), 0);
    const totalMinutes = trips.reduce((s,t) => s + (t.total_minutes||0), 0);

    // 月別集計
    const byMonth = {};
    trips.forEach(t => {
      const m = (t.date||'').slice(0,7);
      if (!m) return;
      if (!byMonth[m]) byMonth[m] = { trips:0, stations:0 };
      byMonth[m].trips++;
      byMonth[m].stations += t.total_stations||0;
    });

    const grid = document.getElementById('trip-stat-grid');
    if (!grid) return;
    grid.innerHTML = `
      <div class="scard"><div class="sc-l">総旅程数</div><div class="sc-v">${totalTrips}<span class="sc-u">回</span></div></div>
      <div class="scard" title="同じ駅を複数回通過した場合は都度カウント (重複あり)"><div class="sc-l">延べ乗車駅数</div><div class="sc-v">${totalStations}<span class="sc-u">駅</span></div><div class="sc-s" style="font-size:8px;color:var(--silver);opacity:.7">重複含む</div></div>
      <div class="scard"><div class="sc-l">総乗換回数</div><div class="sc-v">${totalTransfers}<span class="sc-u">回</span></div></div>
      <div class="scard"><div class="sc-l">総乗車時間</div><div class="sc-v">${Math.floor(totalMinutes/60)}<span class="sc-u">時間</span>${totalMinutes%60}<span class="sc-u">分</span></div></div>
    `;

    // 月別グラフ
    if (Object.keys(byMonth).length > 0) {
      const ch = document.createElement('div'); ch.className='bc';
      ch.innerHTML = '<div class="bc-t">月別 旅程数</div>';
      const maxT = Math.max(...Object.values(byMonth).map(v=>v.trips));
      Object.entries(byMonth).sort().forEach(([m,v]) => {
        const row = document.createElement('div'); row.className='bc-r';
        row.innerHTML = `<div class="bc-l">${m}</div><div class="bc-bg"><div class="bc-fill" style="width:${Math.round(v.trips/maxT*100)}%;background:var(--red)"></div></div><div class="bc-n">${v.trips}回</div>`;
        ch.appendChild(row);
      });
      tripSection.appendChild(ch);
    }

    // 直近の旅程 — 列車情報・時刻・認証バッジも表示
    if (trips.length > 0) {
      const recent = document.createElement('div'); recent.className='bc';
      recent.innerHTML = '<div class="bc-t">直近の旅程</div>';
      [...trips].sort((a,b) => (b.recorded_at||b.date||'').localeCompare(a.recorded_at||a.date||'')).slice(0,10).forEach(t => {
        const row = document.createElement('div'); row.className='bc-r';
        row.style.flexWrap = 'wrap';
        // 記録バッジ: 📍 = GPS / 📝 = 手動
        const verifiedBadge = t.verified
          ? '<span style="color:#5fb5ff;font-size:10px;margin-left:4px" title="GPS で記録">📍</span>'
          : '<span style="color:var(--silver);font-size:10px;margin-left:4px" title="手で入力した記録">📝</span>';
        const timeStr = (t.depart_time && t.arrive_time)
          ? `${(t.depart_time||'').slice(0,5)}〜${(t.arrive_time||'').slice(0,5)}${t.total_minutes ? ` (${t.total_minutes}分)` : ''}`
          : '';
        // 列車情報バッジ (列車名 / 車両形式 / 手入力マーク)
        const trainBits = [];
        if (t.train_name) {
          const customMark = t.train_id ? '' : '<span title="マスター未登録 (手入力)" style="opacity:.7;font-size:9px;margin-left:2px">📝</span>';
          trainBits.push(`<span style="color:var(--gold);font-weight:600">🚆 ${t.train_name}</span>${customMark}`);
          if (t.car_model) trainBits.push(`<span style="color:rgba(255,255,255,.7);font-family:'DM Mono',monospace">${t.car_model}</span>`);
        }
        const trainLine = trainBits.length
          ? `<div style="flex-basis:100%;display:flex;gap:8px;font-size:10px;margin-top:3px;padding-left:2px">${trainBits.join('<span style=\"color:rgba(140,160,179,.5)\">·</span>')}</div>`
          : '';
        row.innerHTML = `
          <div class="bc-l" style="width:140px;font-weight:600">${t.name||''}${verifiedBadge}</div>
          <div style="flex:1;font-size:10px;color:var(--silver);min-width:0">
            <div>${t.date||''}${timeStr ? ` · ${timeStr}` : ''}</div>
          </div>
          <div class="bc-n" style="color:var(--silver)">${t.total_stations||0}駅</div>
          ${trainLine}
        `;
        recent.appendChild(row);
      });
      tripSection.appendChild(recent);
    }

    // ── 🚆 列車制覇 ── (train_id ベースで集計、手入力は別欄)
    const trainSection = document.createElement('div'); trainSection.className='bc';
    trainSection.innerHTML = '<div class="bc-t">🚆 列車制覇</div>';

    const ridTrainIds = new Set();
    const ridCustomNames = new Set();
    const carModelsByTrainId = {};       // id → Set<string>
    const carModelsByCustomName = {};    // name → Set<string>
    // v378→v379: 乗換ありの混在旅程は trip 直下が null になるため segments 走査が必要。
    //   ただし v374 以前の trip は segments[] を持つが segments[].train_id を持たない
    //   (per-seg 列車情報は v375 から)。そのため「segments の中に列車情報があれば segments を使い、
    //   なければ trip 直下にフォールバック」する条件分岐に変更。
    trips.forEach(t => {
      const segs = Array.isArray(t.segments) ? t.segments : [];
      const segSources = segs
        .map(s => ({ train_id: s.train_id, train_name: s.train_name, car_model: s.car_model }))
        .filter(s => s.train_id || s.train_name || s.car_model);
      const sources = segSources.length > 0
        ? segSources
        : [{ train_id: t.train_id, train_name: t.train_name, car_model: t.car_model }];
      sources.forEach(src => {
        if (src.train_id) {
          ridTrainIds.add(src.train_id);
          if (src.car_model) {
            if (!carModelsByTrainId[src.train_id]) carModelsByTrainId[src.train_id] = new Set();
            carModelsByTrainId[src.train_id].add(src.car_model);
          }
        } else if (src.train_name) {
          ridCustomNames.add(src.train_name);
          if (src.car_model) {
            if (!carModelsByCustomName[src.train_name]) carModelsByCustomName[src.train_name] = new Set();
            carModelsByCustomName[src.train_name].add(src.car_model);
          }
        }
      });
    });

    const byCategory = {};
    (NORIRECO.trains.TRAINS || []).forEach(t => {
      const cat = t.category || 'other';
      if (!byCategory[cat]) byCategory[cat] = { total: 0, ridden: 0, ridden_trains: [] };
      byCategory[cat].total++;
      if (ridTrainIds.has(t.id)) {
        byCategory[cat].ridden++;
        byCategory[cat].ridden_trains.push(t);
      }
    });

    // 主要カテゴリのスコアカード (達成 0 のものは表示しないと味気ないので 0 でも total>0 なら出す)
    const mainCats = ['shinkansen', 'limited_express', 'sleeper', 'cruise_train', 'joyful_train', 'steam', 'express'];
    const trainGrid = document.createElement('div');
    trainGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px;margin-bottom:10px';
    mainCats.forEach(cat => {
      const c = byCategory[cat];
      const meta = (NORIRECO.trains.TRAIN_CATEGORIES || {})[cat];
      if (!c || !meta || c.total === 0) return;
      const pct = c.total ? Math.round(c.ridden / c.total * 100) : 0;
      const card = document.createElement('div');
      card.className = 'scard';
      card.innerHTML = `
        <div class="sc-l">${meta.icon||''} ${meta.label}</div>
        <div class="sc-v">${c.ridden}<span class="sc-u">/${c.total}</span></div>
        <div style="font-size:9px;color:var(--silver);margin-top:2px">${pct}%</div>
      `;
      trainGrid.appendChild(card);
    });
    trainSection.appendChild(trainGrid);

    // カテゴリ別 乗った列車リスト (常時展開)
    mainCats.forEach(cat => {
      const c = byCategory[cat];
      const meta = (NORIRECO.trains.TRAIN_CATEGORIES || {})[cat];
      if (!c || !meta || c.ridden_trains.length === 0) return;
      const block = document.createElement('div');
      block.style.cssText = 'margin-top:6px';
      const hdr = document.createElement('div');
      hdr.style.cssText = 'padding:6px 10px;background:rgba(20,32,46,.6);border-radius:6px 6px 0 0;font-size:11px;color:var(--white);font-weight:600';
      hdr.textContent = `${meta.icon||''} ${meta.label} ${c.ridden} 種類`;
      block.appendChild(hdr);
      const list = document.createElement('div');
      list.style.cssText = 'padding:8px 10px;display:flex;flex-wrap:wrap;gap:6px;background:rgba(20,32,46,.3);border-radius:0 0 6px 6px';
      c.ridden_trains
        .sort((a,b) => (a.name||'').localeCompare(b.name||'', 'ja'))
        .forEach(t => {
          const tag = document.createElement('span');
          const rarityBadge = t.rarity === 'legendary' ? ' ⭐' : (t.rarity === 'rare' ? ' ✨' : '');
          const discTag = t.discontinued ? ' (廃止)' : '';
          // 廃止/レアは色を変える
          let bg = 'rgba(242,169,0,.15)', border = 'rgba(242,169,0,.4)', color = 'var(--gold)';
          if (t.rarity === 'legendary') { bg = 'rgba(199,125,255,.18)'; border = 'rgba(199,125,255,.5)'; color = '#c77dff'; }
          else if (t.rarity === 'rare') { bg = 'rgba(72,213,151,.18)'; border = 'rgba(72,213,151,.5)'; color = '#48d597'; }
          tag.style.cssText = `padding:3px 9px;background:${bg};border:1px solid ${border};border-radius:12px;color:${color};font-size:10px;font-weight:600;display:inline-flex;align-items:center;gap:5px`;
          // 乗った車両形式 (記録に car_model があれば併記)
          const cars = carModelsByTrainId[t.id];
          const carHtml = cars && cars.size
            ? ` <span style="font-weight:400;font-size:9px;opacity:.8;font-family:'DM Mono',monospace">[${[...cars].sort().join(' · ')}]</span>`
            : '';
          tag.innerHTML = `${t.name}${rarityBadge}${discTag}${carHtml}`;
          list.appendChild(tag);
        });
      block.appendChild(list);
      trainSection.appendChild(block);
    });

    // マニア手入力 (マスター未登録) リスト
    if (ridCustomNames.size > 0) {
      const block = document.createElement('div');
      block.style.cssText = 'margin-top:8px';
      const hdr = document.createElement('div');
      hdr.style.cssText = 'padding:6px 10px;background:rgba(20,32,46,.6);border-radius:6px 6px 0 0;font-size:11px;color:var(--silver);font-weight:600';
      hdr.textContent = `📝 マスター未登録 (手入力) ${ridCustomNames.size} 件`;
      block.appendChild(hdr);
      const list = document.createElement('div');
      list.style.cssText = 'padding:8px 10px;display:flex;flex-wrap:wrap;gap:6px;background:rgba(20,32,46,.3);border-radius:0 0 6px 6px';
      [...ridCustomNames].sort((a,b) => a.localeCompare(b, 'ja')).forEach(n => {
        const tag = document.createElement('span');
        tag.style.cssText = 'padding:3px 9px;background:rgba(140,160,179,.12);border:1px dashed var(--track);border-radius:12px;color:var(--silver);font-size:10px';
        const cars = carModelsByCustomName[n];
        const carHtml = cars && cars.size
          ? ` <span style="font-weight:400;font-size:9px;opacity:.8;font-family:'DM Mono',monospace">[${[...cars].sort().join(' · ')}]</span>`
          : '';
        tag.innerHTML = `${n}${carHtml}`;
        list.appendChild(tag);
      });
      block.appendChild(list);
      trainSection.appendChild(block);
    }

    tripSection.appendChild(trainSection);
  }).catch(e => {
    const grid = document.getElementById('trip-stat-grid');
    if (grid) grid.innerHTML = `<div class="scard"><div class="sc-l">取得失敗</div><div class="sc-v" style="font-size:12px;color:var(--silver)">localStorageを使用中</div></div>`;
  });

  // ── 系統別達成率 (乗車済みのみ) ──
  const rLines=NORIRECO.data.SERVICE_LINES.filter(l=>NORIRECO.serviceLines.stats(l).r>0).sort((a,b)=>NORIRECO.serviceLines.stats(b).pct-NORIRECO.serviceLines.stats(a).pct);
  if(rLines.length){
    const hdr=document.createElement('div');hdr.className='sec-lbl';hdr.textContent=`乗車系統別 達成率 (${rLines.length})`;c.appendChild(hdr);
    const ch=document.createElement('div');ch.className='bc';
    rLines.forEach(sl=>{const s=NORIRECO.serviceLines.stats(sl);const row=document.createElement('div');row.className='bc-r';row.innerHTML=`<div class="bc-l">${sl.name}</div><div class="bc-bg"><div class="bc-fill" style="width:${s.pct}%;background:${sl.color}"></div></div><div class="bc-n">${s.pct}%</div>`;ch.appendChild(row);});
    c.appendChild(ch);
  }

  // ── 実績 ──
  const at=document.createElement('div');at.className='sec-lbl';at.textContent='実績';c.appendChild(at);
  // v265+: gs 定義漏れの bug 修正 (renderStats 内で gs が参照されていたが定義されていなかった)
  const gs = NORIRECO.serviceLines.globalStats();
  const achs=[
    {ic:'🚃',nm:'乗り鉄デビュー',ds:'初めての旅程を記録',on:gs.rt>=1},
    {ic:'🔀',nm:'乗換マスター',ds:'乗換を含む旅程を記録',on:RIDDEN_SEGS.length>=2},
    {ic:'🗾',nm:'2路線制覇',ds:'2路線以上に乗車',on:gs.la>=2},
    {ic:'🚄',nm:'新幹線デビュー',ds:'新幹線に初乗車',on:!!riddenSt['tokaido-shinkansen']||!!riddenSt['tohoku']||!!riddenSt['hokuriku']},
    {ic:'⚡',nm:'東海道新幹線完乗',ds:'東京〜博多を全駅乗車',on:lStats(NORIRECO.data.LINES.find(l=>l.id==='tokaido-shinkansen')||{stations:[]}).pct===100},
    {ic:'🌐',nm:'3路線制覇',ds:'3路線以上に乗車',on:gs.la>=3},
    {ic:'🏅',nm:'5路線制覇',ds:'5路線以上に乗車',on:gs.la>=5},
    {ic:'🏆',nm:'乗りつぶし50%',ds:'全路線の50%達成',on:gs.pct>=50},
    {ic:'👑',nm:'完全乗りつぶし',ds:'全路線・全駅に乗車',on:gs.pct===100},
  ];
  const al=document.createElement('div');al.className='ach-list';
  achs.forEach(a=>{const el=document.createElement('div');el.className='ach'+(a.on?' on':'');el.innerHTML=`<div class="ach-ic">${a.ic}</div><div><div class="ach-nm">${a.nm}</div><div class="ach-ds">${a.ds}</div></div>${a.on?'<div class="ach-bj">UNLOCKED</div>':''}`;al.appendChild(el);});
  c.appendChild(al);
}

// v208 stage 2 (type=module 化) で必要になった window bridge。
// v225 stage 3: renderList / renderStats を `export` 経由に移行。
// switchTab は HTML onclick のため window 維持。
window.switchTab = switchTab;
