// ══════════════════════════════════════════════════════════════
// マイページ (Phase 2)
// - 公式完乗率 (verified) と 全記録完乗率 (manual含む) の二本立て
// - 自分の trip 一覧 (編集・削除・GPS 後追い認証)
// - 認証バッジ: 🟢 verified / 🟡 suspicious / ⚪ manual
// ══════════════════════════════════════════════════════════════

let _mypageCache = null;  // 最新の trip[] (renderMypage が取得後にセット、編集UIで参照)

async function renderMypage() {
  const c = document.getElementById('mypage-content');
  if (!c) return;
  c.innerHTML = '';

  // 未ログイン
  const uid = (typeof currentUserId === 'function') ? currentUserId() : null;
  if (!uid) {
    c.innerHTML = `
      <div class="mp-empty">
        <div class="mp-empty-ic">🔑</div>
        <div class="mp-empty-t">ログインしてください</div>
        <div class="mp-empty-s">マイページではあなたの旅程・公式完乗率・GPS 後追い認証が使えます</div>
        <button class="mp-empty-btn" onclick="openAuthModal()">🔑 ログイン / 会員登録</button>
      </div>`;
    return;
  }

  // ユーザー情報ヘッダ
  const email = (currentUser && currentUser.email) || '(メール非公開)';
  const header = document.createElement('div');
  header.className = 'mp-header';
  header.innerHTML = `
    <div class="mp-avatar">${(email[0]||'?').toUpperCase()}</div>
    <div class="mp-userinfo">
      <div class="mp-username">${email.split('@')[0]}</div>
      <div class="mp-email">${email}</div>
      <div class="mp-uid">uid: ${uid.slice(0,8)}…</div>
    </div>
    <button class="mp-logout-btn" onclick="if(confirm('ログアウトしますか?'))signOutUser()">ログアウト</button>
  `;
  c.appendChild(header);

  // データ取得中表示
  const loading = document.createElement('div');
  loading.className = 'mp-loading';
  loading.textContent = '☁️ 旅程を読み込み中…';
  c.appendChild(loading);

  // 自分の trip を取得
  let trips = [];
  try {
    const url = `${SUPABASE_URL}/rest/v1/norireco_trips?user_id=eq.${uid}&select=*&order=recorded_at.desc`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${typeof authBearerToken==='function'?authBearerToken():SUPABASE_KEY}` }
    });
    if (res.ok) trips = await res.json();
    else console.warn('[マイページ] 旅程取得失敗:', res.status);
  } catch (e) {
    console.warn('[マイページ] 通信エラー:', e.message);
  }
  loading.remove();
  _mypageCache = trips;

  if (trips.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'mp-empty';
    empty.innerHTML = `
      <div class="mp-empty-ic">🚃</div>
      <div class="mp-empty-t">旅程がまだありません</div>
      <div class="mp-empty-s">地図画面で 📝 区間記録 / 📍 GPS で記録 すると、ここに表示されます</div>`;
    c.appendChild(empty);
    return;
  }

  // 完乗率 (公式 = verified only / 全記録 = manual含む)
  const statsBlock = renderMypageStats(trips);
  c.appendChild(statsBlock);

  // trip 一覧
  const listBlock = renderMypageTripList(trips);
  c.appendChild(listBlock);
}

// 自分の trip から完乗率を計算 (Service Lines マスター駅数を分母に、自分が乗った駅を分子に)
function renderMypageStats(trips) {
  const block = document.createElement('div');
  block.className = 'mp-stats-wrap';

  // SERVICE_LINES が未構築ならスキップ
  if (!Array.isArray(SERVICE_LINES) || SERVICE_LINES.length === 0) {
    block.innerHTML = `<div class="mp-empty-s">SERVICE_LINES 未構築のため統計をスキップ</div>`;
    return block;
  }

  // verified のみ / 全記録 の 2 通りで集計
  const collectStations = (verifiedOnly) => {
    const slStationSet = {}; // sl.id → Set<stationName>
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
        if (!slStationSet[sl.id]) slStationSet[sl.id] = new Set();
        for (let i = a; i <= b; i++) slStationSet[sl.id].add(sl.stations[i].name);
      }
    }
    let totalRidden = 0, totalStations = 0, linesAtLeastOne = 0, linesComplete = 0;
    for (const sl of SERVICE_LINES) {
      const r = slStationSet[sl.id] ? slStationSet[sl.id].size : 0;
      const t = sl.stations.length;
      totalRidden += r;
      totalStations += t;
      if (r > 0) linesAtLeastOne++;
      if (r === t && t > 0) linesComplete++;
    }
    return {
      pct: totalStations > 0 ? Math.round(totalRidden / totalStations * 100) : 0,
      ridden: totalRidden, stations: totalStations,
      lines: linesAtLeastOne, complete: linesComplete,
    };
  };

  const sv = collectStations(true);   // 公式 (verified)
  const all = collectStations(false); // 全記録 (manual 含む)

  block.innerHTML = `
    <div class="sec-lbl">完乗率</div>
    <div class="mp-stat-grid">
      <div class="mp-scard verified">
        <div class="mp-sc-h">🟢 公式完乗率</div>
        <div class="mp-sc-sub">verified のみ</div>
        <div class="mp-sc-pct">${sv.pct}<span>%</span></div>
        <div class="mp-sc-detail">${sv.ridden} / ${sv.stations} 駅</div>
        <div class="mp-sc-detail">${sv.lines} 系統乗車 (完乗 ${sv.complete})</div>
      </div>
      <div class="mp-scard all">
        <div class="mp-sc-h">⚪ 全記録完乗率</div>
        <div class="mp-sc-sub">manual / suspicious 含む</div>
        <div class="mp-sc-pct">${all.pct}<span>%</span></div>
        <div class="mp-sc-detail">${all.ridden} / ${all.stations} 駅</div>
        <div class="mp-sc-detail">${all.lines} 系統乗車 (完乗 ${all.complete})</div>
      </div>
    </div>
    <div class="mp-tip">公式完乗率は GPS 認証された旅程のみカウント。シェア機能 (将来) は公式完乗率を使用します。</div>
  `;
  return block;
}

// trip 一覧 (新しい順、編集・削除・後追い認証ボタン付き)
function renderMypageTripList(trips) {
  const block = document.createElement('div');
  block.className = 'mp-trip-wrap';
  const hdr = document.createElement('div');
  hdr.className = 'sec-lbl';
  hdr.textContent = `自分の旅程 (${trips.length}件)`;
  block.appendChild(hdr);

  const list = document.createElement('div');
  list.className = 'mp-trip-list';

  for (const trip of trips) {
    const card = document.createElement('div');
    card.className = 'mp-tcard';
    card.dataset.tripId = trip.id;

    // 認証バッジ
    let badge = '<span class="mp-badge manual" title="手動 (自己申告)">⚪ 自己申告</span>';
    if (trip.verified) {
      badge = '<span class="mp-badge verified" title="GPS 認証">🟢 認証済</span>';
    } else if (typeof fraudIsDowngraded === 'function' && fraudIsDowngraded(trip)) {
      badge = '<span class="mp-badge suspicious" title="不正検知で降格">🟡 要確認</span>';
    }

    // 時刻表示
    const timeStr = (trip.depart_time && trip.arrive_time)
      ? `${trip.depart_time.slice(0,5)}〜${trip.arrive_time.slice(0,5)}${trip.total_minutes ? ` (${trip.total_minutes}分)` : ''}`
      : '';

    // 列車情報
    let trainBit = '';
    if (trip.train_name) {
      const customMark = trip.train_id ? '' : ' 📝';
      trainBit = `<div class="mp-tcard-train">🚆 ${trip.train_name}${customMark}${trip.car_model?` <span class="mp-car">[${trip.car_model}]</span>`:''}</div>`;
    }

    // 後追い認証ボタン (verified=false のみ)
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

  block.appendChild(list);
  return block;
}

// GPS 後追い認証
// 現在地と trip の from/to 駅 の距離を比較、いずれかが半径 500m 以内なら verified=true へ昇格
async function retroactivelyVerifyTrip(tripId) {
  const trip = (_mypageCache || []).find(t => t.id === tripId);
  if (!trip) { alert('旅程が見つかりません'); return; }
  if (!navigator.geolocation) { alert('このブラウザは GPS 非対応です'); return; }

  // 現在地取得
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

  // trip の出発/到着駅の座標を取得 (mergedStationMap か SERVICE_LINES から)
  const findStCoord = (name) => {
    // MERGED_STATIONS 優先
    if (Array.isArray(MERGED_STATIONS)) {
      const m = MERGED_STATIONS.find(s => s.name === name);
      if (m && m.lat != null) return [m.lat, m.lon];
    }
    // フォールバック: SERVICE_LINES の駅 lat/lon
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

  // 距離計算 (Haversine — distMeters は 03-characters.js で定義)
  const dFrom = fromCoord ? distMeters(myLat, myLon, fromCoord[0], fromCoord[1]) : Infinity;
  const dTo = toCoord ? distMeters(myLat, myLon, toCoord[0], toCoord[1]) : Infinity;
  const minDist = Math.min(dFrom, dTo);
  const VERIFY_RADIUS_M = 500;

  if (minDist > VERIFY_RADIUS_M) {
    const nearer = dFrom < dTo ? trip.from_station : trip.to_station;
    alert(`現在地が遠すぎます (最寄 "${nearer}" まで ${Math.round(minDist)}m)\nこの旅程の駅から半径 ${VERIFY_RADIUS_M}m 以内で再試行してください。`);
    return;
  }

  // 認証成功 → Supabase PATCH
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
      body: JSON.stringify({
        verified: true,
        gps_lat: myLat,
        gps_lon: myLon,
        gps_accuracy: acc,
      }),
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
  // キャラ自動獲得チェック (verified に昇格したので obtainable_at と一致したら grant)
  if (typeof runCharacterGrantCheck === 'function') setTimeout(() => runCharacterGrantCheck(), 600);
  // 再描画
  setTimeout(() => renderMypage(), 800);
}

// 削除
async function deleteTripFromMypage(tripId) {
  if (!confirm('この旅程を削除しますか? (元に戻せません)')) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/norireco_trips?id=eq.${tripId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${typeof authBearerToken==='function'?authBearerToken():SUPABASE_KEY}`,
      },
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
  // localStorage からも除去
  try {
    const existing = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    const next = existing.filter(t => t.id !== tripId);
    localStorage.setItem('norireco_trips', JSON.stringify(next));
  } catch(e) {}
  showMypageToast('🗑 削除しました', 'success');
  setTimeout(() => renderMypage(), 500);
}

// マイページ内トースト (画面下中央)
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
