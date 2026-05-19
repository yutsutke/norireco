// ══════════════════════════════════════════════
// 段階1: キャラ獲得・期間限定システム
//
// v210 ES Modules パイロット (案 β) stage 2: `<script type="module">` 化。
// 既存 window 公開 (grantCharacter / revokeCharacter / listOwnedCharacters / tryGrantByGPS)
// に加え、stage 2 で必要になった 5 関数 (isCharacterAvailable / isCharacterOwned /
// runCharacterGrantCheck / distMeters / syncCharacterGrantsFromSupabase) を末尾で window
// 公開。distMeters は 11/13a/13b (既に module) と 04 (classic) から bare 呼出される
// ユーティリティ。
// ══════════════════════════════════════════════
const OWNED_CHARACTERS_KEY = 'norireco_owned_characters';
function getOwnedCharacters() {
  try {
    return new Set(JSON.parse(localStorage.getItem(OWNED_CHARACTERS_KEY) || '[]'));
  } catch(e) { return new Set(); }
}
function setOwnedCharacters(set) {
  try {
    localStorage.setItem(OWNED_CHARACTERS_KEY, JSON.stringify([...set]));
  } catch(e) {}
}
function grantCharacter(charId, opts) {
  const set = getOwnedCharacters();
  if (set.has(charId)) {
    console.log(`[キャラ] ${charId} は既に所持済み`);
    return false;
  }
  set.add(charId);
  setOwnedCharacters(set);
  const char = NORIRECO.data.CHARACTERS[charId];
  console.log(`[キャラ] 🎉 獲得: ${char ? char.meta.name : charId}`);
  // Supabase にも獲得履歴を記録 (非同期、失敗してもローカルは保存済み)
  const source = (opts && opts.source) || 'manual_grant';
  const stationName = (opts && opts.station_name) || null;
  const gpsData = (opts && opts.gps) || null;
  saveCharacterGrantToSupabase(charId, stationName, source, gpsData);
  // 地図再描画
  if (typeof redrawAllLinesAfterTripChange === 'function') {
    redrawAllLinesAfterTripChange();
  }
  return true;
}

// キャラ獲得履歴を Supabase に保存
async function saveCharacterGrantToSupabase(charId, stationName, source, gpsData) {
  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_KEY === 'undefined') return;
  const grant = {
    id: `grant_${Date.now()}_${charId}`,
    character_id: charId,
    station_name: stationName,
    source: source,
    granted_at: new Date().toISOString(),
    gps_lat: gpsData ? gpsData.lat : null,
    gps_lon: gpsData ? gpsData.lon : null,
    gps_accuracy: gpsData ? gpsData.accuracy : null,
    user_id: (typeof currentUserId === 'function') ? currentUserId() : null,
  };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/norireco_character_grants`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(grant),
    });
    if (res.ok) {
      console.log(`[乗レコ] キャラ獲得記録を Supabase 保存: ${charId} (${source})`);
    } else {
      const errBody = await res.text().catch(() => '');
      console.warn(`[乗レコ] キャラ獲得 Supabase 保存失敗: HTTP ${res.status} ${errBody.slice(0,200)}`);
    }
  } catch(e) {
    console.warn('[乗レコ] キャラ獲得 Supabase 接続エラー:', e.message);
  }
}

// Supabase ↔ localStorage の双方向同期
async function syncCharacterGrantsFromSupabase() {
  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_KEY === 'undefined') return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/norireco_character_grants?select=character_id`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) {
      console.warn('[乗レコ] キャラ獲得同期失敗 HTTP', res.status);
      return;
    }
    const grants = await res.json();
    const supabaseCharIds = new Set(grants.map(g => g.character_id).filter(Boolean));
    const owned = getOwnedCharacters();

    // ① Pull: Supabase → localStorage
    let pulled = 0;
    for (const charId of supabaseCharIds) {
      if (!owned.has(charId)) {
        owned.add(charId);
        pulled++;
      }
    }
    if (pulled > 0) {
      setOwnedCharacters(owned);
      console.log(`[乗レコ] ⬇ Supabase → localStorage: ${pulled}体 取得`);
    }

    // ② Push: localStorage → Supabase (v98 以前にローカルだけで grant したキャラを後付け)
    const localOnly = [...owned].filter(id => !supabaseCharIds.has(id));
    if (localOnly.length > 0) {
      console.log(`[乗レコ] ⬆ localStorage → Supabase: ${localOnly.length}体 後付け記録 (source=migration)`);
      // 並列で実行、エラーは個別に握りつぶす
      await Promise.allSettled(localOnly.map(charId =>
        saveCharacterGrantToSupabase(charId, null, 'migration', null)
      ));
    }

    if (pulled === 0 && localOnly.length === 0) {
      console.log(`[乗レコ] キャラ獲得同期: 完全一致 (${supabaseCharIds.size}体)`);
    } else if (pulled > 0 && typeof redrawAllLinesAfterTripChange === 'function') {
      redrawAllLinesAfterTripChange();
    }
  } catch(e) {
    console.warn('[乗レコ] キャラ獲得同期エラー:', e.message);
  }
}
function revokeCharacter(charId) {
  const set = getOwnedCharacters();
  set.delete(charId);
  setOwnedCharacters(set);
  if (typeof redrawAllLinesAfterTripChange === 'function') {
    redrawAllLinesAfterTripChange();
  }
}
// 期間内 (available_from ≤ 今日 ≤ available_until) かチェック
function isCharacterAvailable(charMeta) {
  if (!charMeta) return false;
  const today = localDateStr();
  if (charMeta.available_from && today < charMeta.available_from) return false;
  if (charMeta.available_until && today > charMeta.available_until) return false;
  return true;
}
// 所持判定 (default_unlocked or 獲得済み)
function isCharacterOwned(charId) {
  const char = NORIRECO.data.CHARACTERS[charId];
  if (!char) return false;
  if (char.meta.default_unlocked) return true;
  return getOwnedCharacters().has(charId);
}
// グローバル expose (テスト用にコンソールから叩ける)
window.grantCharacter = grantCharacter;
window.revokeCharacter = revokeCharacter;
window.listOwnedCharacters = () => [...getOwnedCharacters()];

// 認証済み trip の訪問駅から、該当キャラを自動獲得
function checkAndGrantCharacters() {
  if (!NORIRECO.data.CHARACTERS || Object.keys(NORIRECO.data.CHARACTERS).length === 0) return [];
  let trips = [];
  try { trips = JSON.parse(localStorage.getItem('norireco_trips') || '[]'); } catch(e) { return []; }
  // verified === true の trip の駅を抽出 (駅名 → GPS データのマップ)
  // 1駅のみ「訪問」記録 (segments 空) にも対応するため trip.from_station / to_station もスキャン
  const verifiedStationGps = new Map(); // station name → {lat, lon, accuracy} or null
  for (const trip of trips) {
    if (!trip.verified) continue;
    const gps = (trip.gps_lat != null && trip.gps_lon != null)
      ? { lat: trip.gps_lat, lon: trip.gps_lon, accuracy: trip.gps_accuracy }
      : null;
    // segments の from/to
    for (const seg of (trip.segments || [])) {
      if (seg.from && !verifiedStationGps.has(seg.from)) verifiedStationGps.set(seg.from, gps);
      if (seg.to && !verifiedStationGps.has(seg.to)) verifiedStationGps.set(seg.to, gps);
    }
    // trip 本体の from_station/to_station (1駅訪問でも捕捉)
    if (trip.from_station && !verifiedStationGps.has(trip.from_station)) {
      verifiedStationGps.set(trip.from_station, gps);
    }
    if (trip.to_station && !verifiedStationGps.has(trip.to_station)) {
      verifiedStationGps.set(trip.to_station, gps);
    }
  }
  if (verifiedStationGps.size === 0) return [];

  const granted = [];
  const owned = getOwnedCharacters();
  for (const charId in NORIRECO.data.CHARACTERS) {
    const char = NORIRECO.data.CHARACTERS[charId];
    if (!char.meta || char.meta.default_unlocked) continue;
    if (owned.has(charId)) continue;
    if (!isCharacterAvailable(char.meta)) continue;
    const obtainAt = char.meta.obtainable_at || char.meta.station_ids || [];
    for (const stationName of obtainAt) {
      if (verifiedStationGps.has(stationName)) {
        owned.add(charId);
        granted.push({ char, station: stationName, gps: verifiedStationGps.get(stationName) });
        break;
      }
    }
  }
  if (granted.length > 0) {
    setOwnedCharacters(owned);
    console.log(`[乗レコ] 🎉 自動獲得: ${granted.map(g => g.char.meta.name).join(', ')}`);
    // Supabase に獲得履歴を記録 (各々独立に)
    for (const g of granted) {
      saveCharacterGrantToSupabase(g.char.meta.id, g.station, 'trip_auto', g.gps);
    }
  }
  return granted.map(g => g.char);
}

// キャラ獲得トースト通知
function showCharacterGrantToast(character) {
  const toast = document.createElement('div');
  toast.className = 'char-grant-toast';
  toast.innerHTML = `
    <div class="char-grant-icon">
      <svg viewBox="0 0 64 64" width="56" height="56">${character.innerSvg}</svg>
    </div>
    <div class="char-grant-text">
      <div class="char-grant-label">🎉 新しいキャラを獲得！</div>
      <div class="char-grant-name">${character.meta.name}</div>
      <div class="char-grant-sub">${character.meta.subtitle || ''}</div>
    </div>
  `;
  document.body.appendChild(toast);
  // フェードイン
  requestAnimationFrame(() => toast.classList.add('show'));
  // 4.5秒後にフェードアウト
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 500);
  }, 4500);
}

// 認証済み trip から自動獲得を実行 + トースト表示 (画面初期化後 or trip 保存後に呼ぶ)
function runCharacterGrantCheck() {
  const granted = checkAndGrantCharacters();
  if (granted.length === 0) return;
  // 地図再描画 (新キャラが表示されるように)
  if (typeof redrawAllLinesAfterTripChange === 'function') redrawAllLinesAfterTripChange();
  // 連続トースト (順次表示)
  granted.forEach((char, idx) => {
    setTimeout(() => showCharacterGrantToast(char), idx * 600);
  });
}

// ── ポケモンGO 式: 現在地が駅 GPS 圏内なら 1タップでキャラ獲得 ──
function distMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function tryGrantByGPS(charId, ev) {
  const char = NORIRECO.data.CHARACTERS[charId];
  if (!char) return;
  if (!navigator.geolocation) {
    alert('このブラウザは位置情報に非対応です');
    return;
  }
  const btn = ev && ev.target;
  const origText = btn ? btn.textContent : '';
  if (btn) { btn.textContent = '📡 取得中…'; btn.disabled = true; }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const userLat = pos.coords.latitude;
      const userLon = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;
      // 半径: テスト中は 1km まで緩める (本番は max(300, accuracy+100) に戻す)
      const radius = Math.max(1000, accuracy + 100);
      const obtainAt = char.meta.obtainable_at || char.meta.station_ids || [];
      let nearestMs = null;
      let nearestDist = Infinity;
      for (const stationName of obtainAt) {
        const ms = NORIRECO.data.MERGED_STATIONS.find(m => m.name === stationName);
        if (!ms) continue;
        const d = distMeters(userLat, userLon, ms.lat, ms.lon);
        if (d < nearestDist) { nearestDist = d; nearestMs = ms; }
      }
      if (!nearestMs) {
        alert(`${char.meta.name} の対象駅座標が見つかりません`);
        if (btn) { btn.textContent = origText; btn.disabled = false; }
        return;
      }
      if (nearestDist > radius) {
        alert(`${nearestMs.name} 駅から ${Math.round(nearestDist)}m 離れています。\n半径 ${Math.round(radius)}m 以内で再試行してください。\n(GPS 精度: ±${Math.round(accuracy)}m)`);
        if (btn) { btn.textContent = origText; btn.disabled = false; }
        return;
      }
      // 獲得！
      grantCharacter(charId, {
        source: 'gps',
        station_name: nearestMs.name,
        gps: { lat: userLat, lon: userLon, accuracy: accuracy }
      });
      showCharacterGrantToast(char);
      closeCharModal();
      console.log(`[乗レコ] 🎯 GPS 獲得: ${char.meta.name} (${nearestMs.name} から ${Math.round(nearestDist)}m / 精度±${Math.round(accuracy)}m)`);
    },
    err => {
      let msg = '位置情報の取得に失敗しました';
      if (err.code === 1) msg = '位置情報のアクセスを許可してください';
      if (err.code === 3) msg = 'タイムアウト。再試行してください';
      alert(msg);
      if (btn) { btn.textContent = origText; btn.disabled = false; }
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
  );
}
window.tryGrantByGPS = tryGrantByGPS;

// v210 stage 2 (type=module 化) で必要になった window bridge。
// isCharacterAvailable / isCharacterOwned: 04 / 08 から bare 呼出
// runCharacterGrantCheck: 05 / 06 / 07 / 13b (module) から bare 呼出
// distMeters: 04 (classic) + 11 / 13a / 13b (module) から bare 呼出される距離計算 util
// syncCharacterGrantsFromSupabase: 06 から bare 呼出
window.isCharacterAvailable = isCharacterAvailable;
window.isCharacterOwned = isCharacterOwned;
window.runCharacterGrantCheck = runCharacterGrantCheck;
window.distMeters = distMeters;
window.syncCharacterGrantsFromSupabase = syncCharacterGrantsFromSupabase;
