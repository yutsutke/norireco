// ══════════════════════════════════════
// TABS
// ══════════════════════════════════════
function switchTab(n){
  // 旧 'list' / 'stats' は 'mypage' にリダイレクト (タブ集約のため)
  if(n==='list'||n==='stats')n='mypage';
  const tabs=['map','mypage'];
  const panes=['pane-map','pane-mypage'];
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',tabs[i]===n));
  document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
  document.getElementById(`pane-${n}`)?.classList.add('active');
  if(n==='map'&&map)setTimeout(()=>map.invalidateSize(),50);
  if(n==='mypage'&&typeof renderMypage==='function')renderMypage();
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

async function renderList(){
  const c=document.getElementById('list-content');c.innerHTML='';
  await buildServiceLines();
  const grouped={};SERVICE_LINES.forEach(sl=>{const g=sl.group||'その他';if(!grouped[g])grouped[g]=[];grouped[g].push(sl);});
  const groupOrder = [...SL_GROUP_ORDER, ...Object.keys(grouped).filter(g => !SL_GROUP_ORDER.includes(g))];
  groupOrder.forEach(grp => {
    const lines = grouped[grp]; if (!lines || lines.length === 0) return;
    // グループ内: 達成率(降順) → 路線名
    lines.sort((a,b) => slStats(b).pct - slStats(a).pct || a.name.localeCompare(b.name, 'ja'));
    const t=document.createElement('div');t.className='sec-lbl';t.textContent=`${grp} (${lines.length})`;c.appendChild(t);
    lines.forEach(sl=>{
      const s=slStats(sl);const card=document.createElement('div');
      card.className='lcard'+(s.pct===100?' done':s.r>0?' partial':'');
      card.innerHTML=`<div class="lc-h"><div class="lc-dot" style="background:${sl.color}"></div><span class="lc-name">${sl.name}</span><span class="lc-reg">${sl.operator||''}</span><span class="lc-pct" style="color:${s.r>0?sl.color:'var(--silver)'}">${s.pct}%</span></div><div class="prog"><div class="prog-bar" style="width:${s.pct}%;background:${sl.color}"></div></div><div class="lc-sub">${s.r}/${s.t}駅${s.pct===100?' ✓ 完乗！':''}</div>`;
      c.appendChild(card);
    });
  });
}

// ══════════════════════════════════════
// STATS
// ══════════════════════════════════════
async function renderStats(){
  const c=document.getElementById('stats-content');c.innerHTML='';
  await buildServiceLines();

  // 完乗率カードはマイページ上部に常時表示されるため、ここでは活動量メトリクスのみ

  // ── Supabaseからの旅程統計（非同期） ──
  const tripSection = document.createElement('div');
  tripSection.innerHTML = `<div class="sec-lbl">活動量 <span style="font-size:9px;color:var(--silver)">☁️ Supabase</span></div>
    <div class="stat-grid" id="trip-stat-grid">
      <div class="scard"><div class="sc-l">読み込み中...</div><div class="sc-v" style="font-size:14px">...</div></div>
    </div>`;
  c.appendChild(tripSection);

  // Supabaseから統計を非同期取得 — ログイン中なら自分のデータのみ
  const _uid = (typeof currentUserId === 'function') ? currentUserId() : null;
  const _statsUrl = _uid
    ? `${SUPABASE_URL}/rest/v1/norireco_trips?select=*&user_id=eq.${_uid}`
    : `${SUPABASE_URL}/rest/v1/norireco_trips?select=*`;
  fetch(_statsUrl, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${typeof authBearerToken==='function'?authBearerToken():SUPABASE_KEY}` }
  }).then(r => r.json()).then(trips => {
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
        // 認証バッジ: 🟢 = GPS 認証 / 🟡 = 不正検知で降格 / なし = 手動
        let verifiedBadge = '';
        if (t.verified) {
          verifiedBadge = '<span style="color:#48d597;font-size:10px;margin-left:4px" title="GPS認証">🟢</span>';
        } else if (typeof fraudIsDowngraded === 'function' && fraudIsDowngraded(t)) {
          let reasonTip = '不正検知で降格';
          if (typeof fraudAssessTrip === 'function') {
            try { const f = fraudAssessTrip(t); if (f.reason) reasonTip = f.reason; } catch(e) {}
          }
          verifiedBadge = `<span style="color:#f2a900;font-size:10px;margin-left:4px" title="${reasonTip.replace(/"/g,'&quot;')}">🟡</span>`;
        }
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
    trips.forEach(t => {
      if (t.train_id) {
        ridTrainIds.add(t.train_id);
        if (t.car_model) {
          if (!carModelsByTrainId[t.train_id]) carModelsByTrainId[t.train_id] = new Set();
          carModelsByTrainId[t.train_id].add(t.car_model);
        }
      } else if (t.train_name) {
        ridCustomNames.add(t.train_name);
        if (t.car_model) {
          if (!carModelsByCustomName[t.train_name]) carModelsByCustomName[t.train_name] = new Set();
          carModelsByCustomName[t.train_name].add(t.car_model);
        }
      }
    });

    const byCategory = {};
    (TRAINS || []).forEach(t => {
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
      const meta = (TRAIN_CATEGORIES || {})[cat];
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
      const meta = (TRAIN_CATEGORIES || {})[cat];
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
  const rLines=SERVICE_LINES.filter(l=>slStats(l).r>0).sort((a,b)=>slStats(b).pct-slStats(a).pct);
  if(rLines.length){
    const hdr=document.createElement('div');hdr.className='sec-lbl';hdr.textContent=`乗車系統別 達成率 (${rLines.length})`;c.appendChild(hdr);
    const ch=document.createElement('div');ch.className='bc';
    rLines.forEach(sl=>{const s=slStats(sl);const row=document.createElement('div');row.className='bc-r';row.innerHTML=`<div class="bc-l">${sl.name}</div><div class="bc-bg"><div class="bc-fill" style="width:${s.pct}%;background:${sl.color}"></div></div><div class="bc-n">${s.pct}%</div>`;ch.appendChild(row);});
    c.appendChild(ch);
  }

  // ── 実績 ──
  const at=document.createElement('div');at.className='sec-lbl';at.textContent='実績';c.appendChild(at);
  const achs=[
    {ic:'🚃',nm:'乗り鉄デビュー',ds:'初めての旅程を記録',on:gs.rt>=1},
    {ic:'🔀',nm:'乗換マスター',ds:'乗換を含む旅程を記録',on:RIDDEN_SEGS.length>=2},
    {ic:'🗾',nm:'2路線制覇',ds:'2路線以上に乗車',on:gs.la>=2},
    {ic:'🚄',nm:'新幹線デビュー',ds:'新幹線に初乗車',on:!!riddenSt['tokaido-shinkansen']||!!riddenSt['tohoku']||!!riddenSt['hokuriku']},
    {ic:'⚡',nm:'東海道新幹線完乗',ds:'東京〜博多を全駅乗車',on:lStats(LINES.find(l=>l.id==='tokaido-shinkansen')||{stations:[]}).pct===100},
    {ic:'🌐',nm:'3路線制覇',ds:'3路線以上に乗車',on:gs.la>=3},
    {ic:'🏅',nm:'5路線制覇',ds:'5路線以上に乗車',on:gs.la>=5},
    {ic:'🏆',nm:'乗りつぶし50%',ds:'全路線の50%達成',on:gs.pct>=50},
    {ic:'👑',nm:'完全乗りつぶし',ds:'全路線・全駅に乗車',on:gs.pct===100},
  ];
  const al=document.createElement('div');al.className='ach-list';
  achs.forEach(a=>{const el=document.createElement('div');el.className='ach'+(a.on?' on':'');el.innerHTML=`<div class="ach-ic">${a.ic}</div><div><div class="ach-nm">${a.nm}</div><div class="ach-ds">${a.ds}</div></div>${a.on?'<div class="ach-bj">UNLOCKED</div>':''}`;al.appendChild(el);});
  c.appendChild(al);
}
