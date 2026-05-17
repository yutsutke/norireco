// ══════════════════════════════════════════════
// 現在地表示 (Phase 1)
// 3状態トグル: off → on (中心化) → follow (追従) → off
// ══════════════════════════════════════════════
let locationMode = 0; // 0:off, 1:on (一度中心化), 2:follow (毎回中心化)
let locationWatchId = null;
let userLocationMarker = null;
let userLocationCircle = null;
let didInitialCenter = false;
let lastUserGps = null;                // 直近の {lat, lon, accuracy}
let recordStartedViaGPS = false;       // 「ここから記録開始」で発進した記録か
let recordStartGPS = null;             // 発進時の GPS スナップショット {lat, lon, accuracy, timestamp}
let recordStartedAt = null;            // 記録モード突入時刻 ISO (GPS 無くても depart_time に使う)
let recordEndTime = null;              // 「ここで終了」or「終了して確認」押下時刻 ISO

function cycleLocationMode() {
  locationMode = (locationMode + 1) % 3;
  if (locationMode === 0) {
    stopLocationTracking();
  } else {
    didInitialCenter = false; // 状態遷移で再度センター
    startLocationTracking();
    // フォロー突入時は最後の位置で即座にセンター
    if (locationMode === 2 && userLocationMarker) {
      const ll = userLocationMarker.getLatLng();
      map.setView(ll, Math.max(map.getZoom(), 15), { animate: true });
    }
  }
  updateLocationButton();
}
window.cycleLocationMode = cycleLocationMode;

function startLocationTracking() {
  if (!navigator.geolocation) {
    alert('このブラウザは位置情報に非対応です');
    locationMode = 0;
    updateLocationButton();
    return;
  }
  if (locationWatchId) return; // 既に動作中
  locationWatchId = navigator.geolocation.watchPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const acc = pos.coords.accuracy;
      lastUserGps = { lat, lon, accuracy: acc };
      updateUserLocationMarker(lat, lon, acc);
      updateNearestStationPanel(lat, lon);
      if (locationMode === 1 && !didInitialCenter) {
        // 初回のみ中心化、その後はマーカーだけ更新
        map.setView([lat, lon], Math.max(map.getZoom(), 15), { animate: true });
        didInitialCenter = true;
      } else if (locationMode === 2) {
        // 追従モード: 毎回中心化 (ズームは維持)
        map.setView([lat, lon], map.getZoom(), { animate: true });
      }
    },
    err => {
      console.warn('[乗レコ] 位置情報エラー:', err.code, err.message);
      if (err.code === 1) {
        alert('位置情報のアクセスが拒否されています。\nブラウザ設定でこのサイトの位置情報を許可してください。');
        locationMode = 0;
        updateLocationButton();
        stopLocationTracking();
      }
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );
}

function stopLocationTracking() {
  if (locationWatchId) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
  }
  removeUserLocationMarker();
  hideNearestStationPanel();
  lastUserGps = null;
  didInitialCenter = false;
}

// 最寄駅パネル (Phase 2) — 候補リスト
let nearestCandidates = [];   // [{station, distance}, ...]
let nearestPickedIdx = 0;     // ユーザーが選んだインデックス

function findNearestStations(lat, lon, maxRangeM, maxCount) {
  if (!MERGED_STATIONS || MERGED_STATIONS.length === 0) return [];
  const candidates = [];
  for (const ms of MERGED_STATIONS) {
    const d = distMeters(lat, lon, ms.lat, ms.lon);
    if (d > maxRangeM) continue;
    candidates.push({ station: ms, distance: d });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates.slice(0, maxCount);
}

function formatDist(meters) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters/1000).toFixed(1)} km`;
}

function updateNearestStationPanel(lat, lon) {
  const panel = document.getElementById('nearest-station-panel');
  if (!panel) return;
  const selectModeEl = document.getElementById('ns-mode-select');
  const recModeEl = document.getElementById('ns-mode-recording');

  // 記録モード中: GPS 記録のみ「記録中」ミニマル UI を表示
  // 手動記録 (📝 ボタン経由) では rec-panel が UI を担当するので最寄駅パネルは隠す
  if (recordMode) {
    if (recordStartedViaGPS) {
      if (selectModeEl) selectModeEl.style.display = 'none';
      if (recModeEl) recModeEl.style.display = 'block';
      renderRecordingSummary();
      panel.classList.add('show');
    } else {
      panel.classList.remove('show');
    }
    return;
  }

  // 記録モード OFF: 開始駅候補リスト
  if (selectModeEl) selectModeEl.style.display = 'block';
  if (recModeEl) recModeEl.style.display = 'none';

  const nearby = findNearestStations(lat, lon, 1500, 6); // 1.5km 以内、最大 6 駅
  if (nearby.length === 0) { panel.classList.remove('show'); return; }

  // 候補が変わったらインデックスをリセット (駅名のシグネチャで比較)
  const newSig = nearby.map(n => n.station.name).join('|');
  const oldSig = nearestCandidates.map(n => n.station.name).join('|');
  if (newSig !== oldSig) {
    nearestPickedIdx = 0;
  }
  nearestCandidates = nearby;

  const listEl = document.getElementById('ns-list');
  if (!listEl) return;
  listEl.innerHTML = nearby.map((n, idx) => {
    const lineIds = n.station.lines || [];
    const lineNames = lineIds.slice(0, 3).map(lid => {
      const sl = (SERVICE_LINES || []).find(x => x.id === lid);
      return sl ? sl.name : lid;
    }).filter(Boolean).join('・');
    const more = lineIds.length > 3 ? ` ほか${lineIds.length - 3}` : '';
    const checked = idx === nearestPickedIdx ? 'checked' : '';
    const selClass = idx === nearestPickedIdx ? ' selected' : '';
    return `
      <label class="ns-cand${selClass}" onclick="selectNearestCand(${idx})">
        <input type="radio" name="ns-pick" ${checked}>
        <div class="ns-cand-info">
          <div class="ns-cand-name">${n.station.name}</div>
          <div class="ns-cand-meta">
            <span class="ns-cand-dist">${formatDist(n.distance)}</span>
            <span class="ns-cand-lines">${lineNames}${more}</span>
          </div>
        </div>
      </label>
    `;
  }).join('');
  panel.classList.add('show');
}

function selectNearestCand(idx) {
  nearestPickedIdx = idx;
  document.querySelectorAll('.ns-cand').forEach((el, i) => {
    el.classList.toggle('selected', i === idx);
    const radio = el.querySelector('input[type=radio]');
    if (radio) radio.checked = (i === idx);
  });
}
window.selectNearestCand = selectNearestCand;

function hideNearestStationPanel() {
  const panel = document.getElementById('nearest-station-panel');
  if (panel) panel.classList.remove('show');
}

// 記録中サマリの描画 (最寄駅パネルの記録中モード内)
function renderRecordingSummary() {
  const el = document.getElementById('ns-recording-summary');
  if (!el) return;
  if (!recordSelection || recordSelection.length === 0) {
    el.innerHTML = '<div class="ns-rec-hint">駅を選択してください</div>';
    return;
  }
  const start = recordSelection[0].name;
  const last = recordSelection[recordSelection.length - 1].name;
  const segs = currentSegments?.length || 0;
  const hasError = currentSegments?.some(s => s.error);
  el.innerHTML = `
    <div class="ns-rec-lbl">📍 出発駅</div>
    <div class="ns-rec-start">${start}</div>
    ${recordSelection.length > 1 ? `
      <div class="ns-rec-route">
        ${hasError ? '⚠️ 未解決区間あり' : `経路: ${recordSelection.length}駅 / ${segs}区間`}
      </div>
      <div class="ns-rec-route-info">→ ${last}</div>
    ` : `
      <div class="ns-rec-hint">「📍 ここで終了」で終点を選ぶか、<br>地図上で駅をクリックして経路を追加</div>
    `}
  `;
}

// 記録キャンセル (破棄)
function cancelRecord() {
  if (recordSelection.length > 0 && !confirm('記録中の経路を破棄しますか？')) return;
  recordStartedViaGPS = false;
  recordStartGPS = null;
  recordEndTime = null;
  if (recordMode) toggleRecordMode();
  showRecordToast('🗑 記録を破棄しました', 'warn', 2500);
}
window.cancelRecord = cancelRecord;

// 「ここから記録開始」: 選んだ候補駅で記録モードに入る + GPS 認証フラグ
function startRecordFromNearest() {
  if (!lastUserGps) {
    alert('現在地を取得できていません。📍 ボタンで位置情報を有効にしてください。');
    return;
  }
  if (!nearestCandidates || nearestCandidates.length === 0) {
    alert('近くに駅が見つかりません');
    return;
  }
  const picked = nearestCandidates[nearestPickedIdx] || nearestCandidates[0];
  // GPS 認証情報を記録 (saveMultiSegmentTrip でこのフラグを見て verified=true にする)
  recordStartedViaGPS = true;
  recordStartGPS = { ...lastUserGps, timestamp: new Date().toISOString() };
  recordEndTime = null;
  // 記録モードへ
  if (!recordMode) toggleRecordMode();
  // 選択された駅をプリセレクト
  onRecordStationClick({
    name: picked.station.name,
    lat: picked.station.lat,
    lon: picked.station.lon,
  });
  hideNearestStationPanel();
  console.log(`[乗レコ] 🔖 GPS 発進記録: ${picked.station.name} (距離 ${Math.round(picked.distance)}m, 精度±${Math.round(lastUserGps.accuracy)}m)`);
}
window.startRecordFromNearest = startRecordFromNearest;

function updateUserLocationMarker(lat, lon, accuracy) {
  if (!map) return;
  if (!userLocationMarker) {
    // 青ドット (Google Maps風)
    userLocationMarker = L.marker([lat, lon], {
      icon: L.divIcon({
        className: 'user-location-marker',
        html: '<div class="user-loc-dot"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
      interactive: false,
      zIndexOffset: 2000,
    }).addTo(map);
    // 精度円
    userLocationCircle = L.circle([lat, lon], {
      radius: accuracy,
      color: '#1A6FE5',
      fillColor: '#1A6FE5',
      fillOpacity: 0.08,
      weight: 1,
      opacity: 0.45,
      interactive: false,
    }).addTo(map);
  } else {
    userLocationMarker.setLatLng([lat, lon]);
    if (userLocationCircle) {
      userLocationCircle.setLatLng([lat, lon]);
      userLocationCircle.setRadius(accuracy);
    }
  }
}

function removeUserLocationMarker() {
  if (userLocationMarker) {
    try { map.removeLayer(userLocationMarker); } catch(e) {}
    userLocationMarker = null;
  }
  if (userLocationCircle) {
    try { map.removeLayer(userLocationCircle); } catch(e) {}
    userLocationCircle = null;
  }
}

function updateLocationButton() {
  const btn = document.getElementById('location-fab');
  if (!btn) return;
  btn.classList.remove('on', 'follow');
  if (locationMode === 1) {
    btn.classList.add('on');
    btn.title = '現在地を表示中（タップで追従モード）';
  } else if (locationMode === 2) {
    btn.classList.add('follow');
    btn.title = '追従モード（タップで OFF）';
  } else {
    btn.title = '現在地表示 (タップで 表示→追従→OFF)';
  }
}

// この駅で獲得可能なキャラ一覧 (locked + 期間内 + obtainable_at 一致)
function getObtainableCharactersAt(stationName) {
  if (!charModeOn) return [];
  const result = [];
  for (const id in CHARACTERS) {
    const char = CHARACTERS[id];
    if (!char.meta || char.meta.default_unlocked) continue;
    if (isCharacterOwned(id)) continue;
    if (!isCharacterAvailable(char.meta)) continue;
    const obtainAt = char.meta.obtainable_at || char.meta.station_ids || [];
    if (obtainAt.includes(stationName)) result.push(char);
  }
  return result;
}

// ✨ フローティングインジケータアイコン (駅マーカーの上に浮かべる)
function makeObtainableIndicator(count) {
  const size = 30;
  return L.divIcon({
    className: 'obtainable-indicator-marker',
    html: `<div class="obtainable-bubble"><span class="obtainable-spark">✨</span>${count > 1 ? `<span class="obtainable-count">${count}</span>` : ''}</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, 42],  // 駅マーカーから ~12px 上に浮かべる
  });
}

// 全駅をスキャンして、獲得可能キャラがある駅に ✨ インジケータを配置
function drawObtainableIndicators() {
  if (!charModeOn) return;
  if (!MERGED_STATIONS || !MERGED_STATIONS.length) return;

  const _mapMode = window._mapDisplayMode || 'both';
  let count = 0;
  for (const ms of MERGED_STATIONS) {
    const chars = getObtainableCharactersAt(ms.name);
    if (chars.length === 0) continue;

    // マップ表示モードに応じて駅単位で skip
    if (_mapMode !== 'both' && typeof slRiddenSt === 'object') {
      let ridden = false;
      for (const slId of (ms.lines || [])) {
        const rs = slRiddenSt[slId];
        if (rs && rs.has(ms.name)) { ridden = true; break; }
      }
      if (_mapMode === 'ridden' && !ridden) continue;
      if (_mapMode === 'unridden' && ridden) continue;
    }

    const marker = L.marker([ms.lat, ms.lon], {
      icon: makeObtainableIndicator(chars.length),
      interactive: true,
      zIndexOffset: 1500,  // 駅マーカーより前に出す
    });

    const tipHtml = `<b style="color:#FFD740">✨ ここで獲得できる！</b><br>` +
      chars.map(c => {
        const period = c.meta.available_until ? `〜${c.meta.available_until}` : '';
        return `<span style="color:#FFD740">●</span> ${c.meta.name} <span style="color:rgba(140,160,179,.7);font-size:9px">${period}</span>`;
      }).join('<br>');
    marker.bindTooltip(tipHtml, { className: 'norireco-tooltip', offset: [10, 0] });

    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      // 既存所持キャラがあればそれを優先、なければ locked preview として開く
      const ownedChar = getStationCharacter(ms.name);
      openCharModal(ms, ownedChar || chars[0]);
    });

    marker.addTo(map);
    allLayers.push(marker);
    count++;
  }
  if (count > 0) console.log(`[乗レコ] ✨ 獲得可能駅 ${count}駅にインジケータ配置`);
}

// 駅ごとのキャラ選択 (localStorage 永続化)
const STATION_CHAR_PICK_KEY = 'norireco_station_char_pick';
function getStationCharacterChoice(stationName) {
  try {
    const data = JSON.parse(localStorage.getItem(STATION_CHAR_PICK_KEY) || '{}');
    return data[stationName] || null;
  } catch(e) { return null; }
}
function setStationCharacterChoice(stationName, charId) {
  try {
    const data = JSON.parse(localStorage.getItem(STATION_CHAR_PICK_KEY) || '{}');
    if (charId) data[stationName] = charId; else delete data[stationName];
    localStorage.setItem(STATION_CHAR_PICK_KEY, JSON.stringify(data));
  } catch(e) {}
}

// 駅の代表キャラを取得 (所持済み中からユーザー選択優先)
function getStationCharacter(stationName) {
  if (!charModeOn) return null;
  const list = stationCharMap.get(stationName);
  if (!list || !list.length) return null;
  // 所持済みキャラのみに絞る (default_unlocked or owned_characters)
  const ownedList = list.filter(c => isCharacterOwned(c.meta.id));
  if (!ownedList.length) return null;
  const choice = getStationCharacterChoice(stationName);
  if (choice) {
    const chosen = ownedList.find(c => c.meta.id === choice);
    if (chosen) return chosen;
  }
  return ownedList[0]; // デフォルト: 所持済みリスト先頭
}

// キャラ選択を変更してマップ再描画
function pickStationCharacter(stationName, charId) {
  setStationCharacterChoice(stationName, charId);
  closeCharModal();
  if (typeof redrawAllLinesAfterTripChange === 'function') {
    redrawAllLinesAfterTripChange();
  }
}
async function loadMergedStations() {
  try {
    const res = await fetch('merged_stations.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    MERGED_STATIONS = data.stations || [];
    slMergedStationMap.clear();
    for (const ms of MERGED_STATIONS) {
      // 営業系統 id で索引
      for (const lid of (ms.lines || [])) {
        slMergedStationMap.set(`${lid}:${ms.name}`, ms);
      }
    }
    console.log(`[乗レコ] 統合駅 ${MERGED_STATIONS.length}駅 (索引 ${slMergedStationMap.size}件)`);
  } catch (e) {
    console.warn('[乗レコ] merged_stations.json 読込失敗:', e.message);
  }
}

// ── 営業系統マスター (service_lines_master.json) ──
// 物理路線(N02)とは別に、乗客視点の「営業系統」を polyline で重ね描き
// 路線一覧・統計タブの達成率計算もこちらをベースにする
let SERVICE_LINES_MASTER = null;
let SERVICE_LINES = []; // 駅座標解決済み + 候補 N02 id を持つ
let serviceLinesLoaded = false;
let serviceLinesBuilt = false;

async function loadServiceLinesMaster() {
  if (SERVICE_LINES_MASTER) return SERVICE_LINES_MASTER;
  try {
    const res = await fetch('service_lines_master.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    SERVICE_LINES_MASTER = data.service_lines || [];
    console.log(`[乗レコ] 営業系統 ${SERVICE_LINES_MASTER.length}系統 読込`);
    return SERVICE_LINES_MASTER;
  } catch (e) {
    console.warn('[乗レコ] service_lines_master.json 読込失敗:', e.message);
    SERVICE_LINES_MASTER = [];
    return SERVICE_LINES_MASTER;
  }
}

// N02 物理路線ごとの「駅名→座標」マップを構築
// キーは line.id。同 id N02 エントリ(富山地方鉄道本線の鉄道線+軌道線等)はマージ
function buildPerLineCoordMap() {
  const m = new Map(); // line.id -> { name, stations: Map(stationName -> [lat,lon]) }
  for (const line of LINES) {
    let info = m.get(line.id);
    if (!info) {
      info = { name: line.name, stations: new Map() };
      m.set(line.id, info);
    }
    for (const st of (line.stations || [])) {
      const nm = st.n;
      if (!nm || typeof st.lat !== 'number' || typeof st.lon !== 'number') continue;
      if (!info.stations.has(nm)) info.stations.set(nm, [st.lat, st.lon]);
    }
  }
  return m;
}

// sl.id "auto_<n02_id>", "auto_<n02_id>_bN", "auto_<n02_id>_sN" のいずれも N02 id を返す
function deriveN02IdFromAutoId(slId) {
  if (!slId || !slId.startsWith('auto_')) return null;
  return slId.slice(5).replace(/_b\d+$/, '').replace(/_s\d+$/, '');
}

// 営業系統 sl.id "auto_<n02_id>(_bN|_sN)?" → N02 id
function deriveN02IdFromAutoId(slId) {
  if (!slId || !slId.startsWith('auto_')) return null;
  return slId.slice(5).replace(/_b\d+$/, '').replace(/_s\d+$/, '');
}

// 駅 lat/lon から地域グループを推定 (路線一覧の見出し用)
function regionOf(lat, lon) {
  if (lat >= 41.3) return '北海道';
  if (lat >= 34.9 && lat <= 37.0 && lon >= 138.5 && lon <= 141.5) return '関東';
  if (lat >= 37.0 && lat <= 41.3 && lon >= 138.5) return '東北';
  if (lat >= 34.5 && lat <= 37.5 && lon >= 136.0 && lon <= 139.5) return '東海・中部';
  if (lat >= 33.5 && lat <= 35.8 && lon >= 134.5 && lon <= 137.0) return '関西';
  if (lat >= 33.5 && lat <= 35.8 && lon >= 130.85 && lon <= 134.5) return '中国・山陰';
  if (lat >= 32.7 && lat <= 34.5 && lon >= 132.0 && lon <= 135.0) return '四国';
  if (lat <= 34.0 && lon <= 132.0) return '九州';
  if (lat <= 27.0) return '九州';
  return null;
}
const _JR_OP_IDS = new Set(['jr_east','jr_central','jr_west','jr_kyushu','jr_hokkaido','jr_shikoku']);
const _METRO_TOEI = new Set(['tokyo_metro','toei']);
const _KANTO_EAST_NORTH = new Set(['tobu','seibu','keisei','toyo_rapid','shin_keisei','hokuso','saitama_rapid','tx','nippori_toneri','choshi','isumi','kashima_rinkai']);
const _KANTO_SOUTH_WEST = new Set(['tokyu','odakyu','keikyu','keio','sotetsu','yokohama_minato_mirai','izuhakone','enoshima','tama_toshi','hakone_tozan','rinkai']);
function detectServiceLineGroup(stations, name, operatorId) {
  if (name && name.includes('新幹線')) return '新幹線';
  if (!stations || stations.length === 0) return 'その他';
  const samples = [stations[0], stations[Math.floor(stations.length/2)], stations[stations.length-1]];
  const counts = {};
  for (const s of samples) {
    const r = regionOf(s.lat, s.lon);
    if (r) counts[r] = (counts[r] || 0) + 1;
  }
  let region = null, max = 0;
  for (const [r, c] of Object.entries(counts)) if (c > max) { region = r; max = c; }
  if (!region) return 'その他';
  if (region === '関東') {
    if (_JR_OP_IDS.has(operatorId)) return '首都圏・JR';
    if (_METRO_TOEI.has(operatorId)) return '東京メトロ・都営';
    if (_KANTO_EAST_NORTH.has(operatorId)) return '首都圏・私鉄（東・北）';
    if (_KANTO_SOUTH_WEST.has(operatorId)) return '首都圏・私鉄（南・西）';
    return '首都圏・ローカル';
  }
  return region;
}

// SERVICE_LINES を構築 (路線一覧・統計・🚆オーバーレイ共通)
async function buildServiceLines() {
  if (!serviceLinesLoaded) {
    await loadServiceLinesMaster();
    serviceLinesLoaded = true;
  }
  await Promise.all([loadLines(1), loadLines(2), loadLines(3), loadLines(4)]);
  if (serviceLinesBuilt) return;
  const perLineMap = buildPerLineCoordMap();
  SERVICE_LINES = [];
  for (const sl of (SERVICE_LINES_MASTER || [])) {
    const sourceN02Id = deriveN02IdFromAutoId(sl.id);
    const masterNames = new Set((sl.stations || []).map(s => s.name));
    const candidates = [];
    for (const [n02Id, info] of perLineMap) {
      let overlap = 0;
      for (const n of masterNames) if (info.stations.has(n)) overlap++;
      const idMatch = sourceN02Id && sourceN02Id === n02Id;
      const officialMatch = sl.official_line && info.name && info.name.startsWith(sl.official_line);
      if (idMatch || overlap >= 2 || officialMatch) {
        candidates.push({ n02Id, info, overlap, idMatch, officialMatch });
      }
    }
    candidates.sort((a,b) => (b.idMatch-a.idMatch) || (b.overlap-a.overlap) || (b.officialMatch-a.officialMatch));
    const stations = [];
    for (const s of (sl.stations || [])) {
      let coord = null;
      for (const c of candidates) {
        if (c.info.stations.has(s.name)) { coord = c.info.stations.get(s.name); break; }
      }
      if (coord) stations.push({ name: s.name, lat: coord[0], lon: coord[1] });
    }
    if (stations.length < 2) continue;
    const group = detectServiceLineGroup(stations, sl.name, sl.operator_id);
    SERVICE_LINES.push({
      id: sl.id,
      name: sl.name || sl.id,
      color: sl.color || '#888',
      group,
      operator: sl.operator || '',
      operator_id: sl.operator_id || '',
      stations,
      candidateN02Ids: candidates.map(c => c.n02Id),
      circular: sl.is_circular || false,
    });
  }
  serviceLinesBuilt = true;
  console.log(`[乗レコ] SERVICE_LINES built: ${SERVICE_LINES.length} 系統`);
}

// 営業系統の達成率 (Phase 2: slRiddenSt 直参照)
function slStats(sl) {
  const t = sl.stations.length;
  const rs = slRiddenSt[sl.id];
  const r = rs ? rs.size : 0;
  return { t, r, pct: t > 0 ? Math.round(r/t*100) : 0 };
}

// 全営業系統の集計
function slGlobalStats() {
  let ts = 0, rt = 0, la = 0, ld = 0;
  SERVICE_LINES.forEach(sl => {
    const s = slStats(sl);
    ts += s.t; rt += s.r;
    if (s.r > 0) la++;
    if (s.pct === 100) ld++;
  });
  return { ts, rt, la, ld, pct: ts > 0 ? Math.round(rt/ts*100) : 0 };
}

// 優先度別JSONファイル（N02-25 全国データ・606路線・10154駅）
const PRIORITY_FILES = {
  1: 'lines-p1.json',  // 新幹線（ズーム5〜）
  2: 'lines-p2.json',  // JR在来線（ズーム7〜）
  3: 'lines-p3.json',  // 大手私鉄・都市鉄道（ズーム8〜）
  4: 'lines-p4.json',  // 地方鉄道・路面電車（ズーム10〜）
};

// ズームレベル→読み込む優先度の閾値
function getPriorityThreshold(zoom) {
  if (zoom >= 10) return 4;
  if (zoom >= 8) return 3;
  if (zoom >= 7) return 2;
  return 1;
}

// 路線データを非同期で読み込む
async function loadLines(priority) {
  if (loadedPriorities.has(priority)) return;
  if (pendingLoads.has(priority)) {
    // 既に読み込み中なら完了を待つ
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (loadedPriorities.has(priority) || !pendingLoads.has(priority)) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }
  pendingLoads.add(priority);

  const url = PRIORITY_FILES[priority];
  if (!url) { pendingLoads.delete(priority); return; }

  console.log(`[乗レコ] P${priority} fetch開始: ${url}`);
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const newLines = await resp.json();

    const existingIds = new Set(LINES.map(l => l.id));
    const added = newLines.filter(l => !existingIds.has(l.id));
    LINES.push(...added);

    loadedPriorities.add(priority);
    pendingLoads.delete(priority);

    console.log(`[乗レコ] P${priority}完了: +${added.length}路線（計${LINES.length}路線）`);

    rebuildRiddenStations();
    // Phase 2: 描画は SERVICE_LINES 構築後の drawLines() に一任。
    // ここで個別 N02 line を描画する必要はない。
  } catch(e) {
    pendingLoads.delete(priority);
    loadedPriorities.add(priority); // エラーでも再試行しない
    console.error(`[乗レコ] P${priority}エラー:`, e);
  }
}

// 注: 以前 Supabase から路線・駅情報を取得する関数 (loadLinesFromSupabase /
// loadManualLinesFromSupabase) があったが、現状は lines-p?.json が唯一のソースのため削除
// Supabase の norireco_lines / norireco_stations テーブルも未使用

// ズームに応じて必要な優先度を読み込む
async function loadLinesForZoom(zoom) {
  const maxP = getPriorityThreshold(zoom);
  for (let p = 1; p <= maxP; p++) {
    if (!loadedPriorities.has(p)) {
      loadLines(p); // 非同期で並行実行
    }
  }
}

// 旧ID（v1のローマ字ID）→ 新ID（N02-25 路線名_会社名）のマッピング
// localStorage や Supabase に旧形式の lineId が残っていても新データと紐づくように
// 各旧IDに対して複数の候補路線を持つ。運行系統(JR山手線など)が複数の物理路線を
// またぐケース(例: 山手線の東京-神田は東北線, 大崎-品川は東海道線)に対応するため。
const LEGACY_ID_MAP = {
  'chuo':                  ['中央線_東日本旅客鉄道', '東北線_東日本旅客鉄道'],
  'keihin':                ['東北線_東日本旅客鉄道', '東海道線_東日本旅客鉄道', '根岸線_東日本旅客鉄道'],
  'yamanote':              ['山手線_東日本旅客鉄道', '東北線_東日本旅客鉄道', '東海道線_東日本旅客鉄道'],
  'saikyo':                ['東北線_東日本旅客鉄道', '赤羽線_東日本旅客鉄道', '山手線_東日本旅客鉄道', '臨海副都心線_東京臨海高速鉄道'],
  'shonan':                ['東海道線_東日本旅客鉄道', '東北線_東日本旅客鉄道', '横須賀線_東日本旅客鉄道'],
  'yokosuka':              ['横須賀線_東日本旅客鉄道', '総武線_東日本旅客鉄道', '東海道線_東日本旅客鉄道'],
  'sobu':                  ['総武線_東日本旅客鉄道'],
  'tokaido':               ['東海道線_東日本旅客鉄道'],
  'hachioji':              ['八高線_東日本旅客鉄道'],
  'yokohama':              ['横浜線_東日本旅客鉄道'],
  'sagami':                ['相模線_東日本旅客鉄道'],
  'linie':                 ['相模線_東日本旅客鉄道'],     // 相模線のlineId入力ミス
  'ome':                   ['青梅線_東日本旅客鉄道'],
  'minobu':                ['身延線_東海旅客鉄道'],
  'odakyu':                ['小田原線_小田急電鉄'],
  'keikyu':                ['本線_京浜急行電鉄'],
  'keikyu-kurihama':       ['久里浜線_京浜急行電鉄', '本線_京浜急行電鉄'],
  // 新幹線
  'tokaido-shinkansen':    ['東海道新幹線_東海旅客鉄道', '山陽新幹線_西日本旅客鉄道'],
  'tohoku-shinkansen':     ['東北新幹線_東日本旅客鉄道'],
  'joetsu-shinkansen':     ['上越新幹線_東日本旅客鉄道'],
  'hokuriku':              ['北陸新幹線_東日本旅客鉄道', '北陸新幹線_西日本旅客鉄道', '東北新幹線_東日本旅客鉄道'],
  // 東京メトロ
  'tokyometro-ginza':      ['3号線銀座線_東京地下鉄'],
  'tokyometro-marunouchi': ['4号線丸ノ内線_東京地下鉄'],
  'tokyometro-hibiya':     ['2号線日比谷線_東京地下鉄'],
  'tokyometro-tozai':      ['5号線東西線_東京地下鉄'],
  'tokyometro-chiyoda':    ['9号線千代田線_東京地下鉄'],
  'tokyometro-yurakucho':  ['8号線有楽町線_東京地下鉄'],
  'tokyometro-hanzomon':   ['11号線半蔵門線_東京地下鉄'],
  'tokyometro-namboku':    ['7号線南北線_東京地下鉄'],
  'tokyometro-fukutoshin': ['13号線副都心線_東京地下鉄'],
  // 都営
  'toei-asakusa':          ['1号線浅草線_東京都'],
  'toei-mita':             ['6号線三田線_東京都'],
  'toei-shinjuku':         ['10号線新宿線_東京都'],
  'toei-oedo':             ['12号線大江戸線_東京都'],
  // 私鉄
  'tobu-skytree':          ['伊勢崎線_東武鉄道'],
  'tobu-isesaki':          ['伊勢崎線_東武鉄道'],
  'tokyu-toyoko':          ['東横線_東急電鉄'],
  'tokyu-denentoshi':      ['田園都市線_東急電鉄'],
  'keio':                  ['京王線_京王電鉄'],
  'tobu-tojo':             ['東上本線_東武鉄道'],
  'seibu-ikebukuro':       ['池袋線_西武鉄道'],
  'seibu-shinjuku':        ['新宿線_西武鉄道'],
};

// 駅名正規化: ケ↔ヶ、空白除去
function normStName(name) {
  if (!name) return '';
  return String(name).replace(/ケ/g, 'ヶ').replace(/[ \u3000]/g, '');
}

// 旧ID + from駅 + to駅 から、両駅が含まれる路線を探す
function resolveLineWithStations(legacyId, fromName, toName) {
  const candidates = LEGACY_ID_MAP[legacyId] || [legacyId];
  const fromN = normStName(fromName);
  const toN = normStName(toName);
  for (const candId of candidates) {
    const line = LINES.find(l => l.id === candId);
    if (!line) continue;
    const fi = line.stations.findIndex(s => normStName(s.n) === fromN);
    const ti = line.stations.findIndex(s => normStName(s.n) === toN);
    if (fi >= 0 && ti >= 0) {
      return { line, fi, ti };
    }
  }
  return null;
}

// 運行系統(running_services.json)に基づき乗車区間を物理路線に展開
// service の segments を順にたどり、from駅と to駅 を含むセグメントを特定して、
// その間のすべての物理路線×範囲を返す
function resolveServiceTrip(serviceId, fromName, toName) {
  const service = RUNNING_SERVICES[serviceId];
  if (!service || !service.segments) return null;

  const segments = service.segments;
  const fromN = normStName(fromName);
  const toN = normStName(toName);

  const segInfos = segments.map(seg => {
    const line = LINES.find(l => l.id === seg.line);
    if (!line) return null;
    const segFromIdx = line.stations.findIndex(s => normStName(s.n) === normStName(seg.from));
    const segToIdx = line.stations.findIndex(s => normStName(s.n) === normStName(seg.to));
    if (segFromIdx < 0 || segToIdx < 0) return null;
    return { line, segFromIdx, segToIdx };
  });

  const inSegRange = (info, idx) => {
    if (!info) return false;
    return idx >= Math.min(info.segFromIdx, info.segToIdx) &&
           idx <= Math.max(info.segFromIdx, info.segToIdx);
  };

  let fromSegIdx = -1, fromIdxInLine = -1;
  let toSegIdx = -1, toIdxInLine = -1;
  for (let i = 0; i < segInfos.length; i++) {
    const info = segInfos[i];
    if (!info) continue;
    if (fromSegIdx < 0) {
      const idx = info.line.stations.findIndex(s => normStName(s.n) === fromN);
      if (idx >= 0 && inSegRange(info, idx)) { fromSegIdx = i; fromIdxInLine = idx; }
    }
    if (toSegIdx < 0) {
      const idx = info.line.stations.findIndex(s => normStName(s.n) === toN);
      if (idx >= 0 && inSegRange(info, idx)) { toSegIdx = i; toIdxInLine = idx; }
    }
  }
  if (fromSegIdx < 0 || toSegIdx < 0) return null;

  // 同一セグメント内
  if (fromSegIdx === toSegIdx) {
    const info = segInfos[fromSegIdx];
    return [{
      line: info.line,
      fi: Math.min(fromIdxInLine, toIdxInLine),
      ti: Math.max(fromIdxInLine, toIdxInLine),
    }];
  }

  const N = segInfos.length;
  // direction: +1=forward (segments配列順), -1=backward
  function buildPath(direction) {
    const parts = [];
    let i = fromSegIdx;
    let safety = N + 1;
    while (safety-- > 0) {
      const info = segInfos[i];
      if (info) {
        let fi, ti;
        if (i === fromSegIdx) {
          fi = fromIdxInLine;
          ti = (direction === 1) ? info.segToIdx : info.segFromIdx;
        } else if (i === toSegIdx) {
          fi = (direction === 1) ? info.segFromIdx : info.segToIdx;
          ti = toIdxInLine;
        } else {
          fi = (direction === 1) ? info.segFromIdx : info.segToIdx;
          ti = (direction === 1) ? info.segToIdx : info.segFromIdx;
        }
        parts.push({ line: info.line, fi: Math.min(fi,ti), ti: Math.max(fi,ti) });
      }
      if (i === toSegIdx) break;
      i = (i + direction + N) % N;
    }
    return parts;
  }
  const totalSt = parts => parts.reduce((s,p) => s + (p.ti - p.fi + 1), 0);

  if (service.circular) {
    // 環状線: 両方向計算し短い方を採用
    const fwd = buildPath(1);
    const bwd = buildPath(-1);
    return totalSt(fwd) <= totalSt(bwd) ? fwd : bwd;
  } else {
    // 非環状: 順方向のみ
    const dir = (fromSegIdx <= toSegIdx) ? 1 : -1;
    return buildPath(dir);
  }
}

// ジャンクション介在マッチ: 候補路線群の中で from と to を含む路線が異なる場合、
// 両路線に共通する駅(ジャンクション)を見つけて2つの区間に分割
// 例: tokaido-shinkansen 東京→博多 → 東海道新幹線(東京→新大阪) + 山陽新幹線(新大阪→博多)
function resolveSegments(legacyId, fromName, toName) {
  // 1. 直接マッチ
  const direct = resolveLineWithStations(legacyId, fromName, toName);
  if (direct) return [direct];

  // 2. ジャンクション介在
  const candidates = LEGACY_ID_MAP[legacyId] || [legacyId];
  const fromN = normStName(fromName);
  const toN = normStName(toName);
  const fromLines = [];
  const toLines = [];
  for (const candId of candidates) {
    const line = LINES.find(l => l.id === candId);
    if (!line) continue;
    if (line.stations.some(s => normStName(s.n) === fromN)) fromLines.push(line);
    if (line.stations.some(s => normStName(s.n) === toN)) toLines.push(line);
  }
  if (fromLines.length === 0 || toLines.length === 0) return null;

  for (const lF of fromLines) {
    const lF_set = new Set(lF.stations.map(s => normStName(s.n)));
    for (const lT of toLines) {
      if (lF.id === lT.id) continue;
      for (const sT of lT.stations) {
        const tn = normStName(sT.n);
        if (lF_set.has(tn) && tn !== fromN && tn !== toN) {
          const jN = sT.n;  // junction (lT 側の駅名)
          const jNF = lF.stations.find(s => normStName(s.n) === tn).n;  // lF側の駅名(同名)
          const fi1 = lF.stations.findIndex(s => normStName(s.n) === fromN);
          const ti1 = lF.stations.findIndex(s => normStName(s.n) === tn);
          const fi2 = lT.stations.findIndex(s => normStName(s.n) === tn);
          const ti2 = lT.stations.findIndex(s => normStName(s.n) === toN);
          return [
            { line: lF, fi: fi1, ti: ti1 },
            { line: lT, fi: fi2, ti: ti2 },
          ];
        }
      }
    }
  }
  return null;
}

// 後方互換用 (legacyIdを最初の候補のみ返す)
function resolveLineId(legacyId) {
  const v = LEGACY_ID_MAP[legacyId];
  if (Array.isArray(v)) return v[0];
  return v || legacyId;
}

// 乗車済み運行系統セット (legendで表示する用)
const riddenServiceIds = new Set();
// Phase 2: 営業系統 id → 乗車済み駅名 Set (rebuildRiddenStations で riddenSt から導出)
const slRiddenSt = {};
// Phase 2.5: 駅名 → 訪問回数 (個人化UI: 育つマーカー用)
const slVisitCount = {};

// 営業系統(SERVICE_LINES)id から N02 路線セグメントへの解決
// 新形式の trip (lineId='jr_chuo_main', 'auto_xxx' 等) に対応
function resolveByServiceLine(slId, fromName, toName) {
  if (!SERVICE_LINES || SERVICE_LINES.length === 0) return null;
  const sl = SERVICE_LINES.find(x => x.id === slId);
  if (!sl || !sl.stations || sl.stations.length < 2) return null;
  const fromN = normStName(fromName), toN = normStName(toName);
  const fromIdx = sl.stations.findIndex(s => normStName(s.name) === fromN);
  const toIdx = sl.stations.findIndex(s => normStName(s.name) === toN);
  if (fromIdx < 0 || toIdx < 0) return null;
  const lo = Math.min(fromIdx, toIdx), hi = Math.max(fromIdx, toIdx);
  const candidates = sl.candidateN02Ids || [];
  if (candidates.length === 0) return null;
  // 各駅を最適な候補 N02 路線に振り分け
  const lineParts = new Map(); // n02_id → { line, fi, ti }
  for (let i = lo; i <= hi; i++) {
    const nm = normStName(sl.stations[i].name);
    for (const n02Id of candidates) {
      const ln = LINES.find(l => l.id === n02Id);
      if (!ln) continue;
      const idx = ln.stations.findIndex(s => normStName(s.n) === nm);
      if (idx < 0) continue;
      if (!lineParts.has(n02Id)) {
        lineParts.set(n02Id, { line: ln, fi: idx, ti: idx });
      } else {
        const p = lineParts.get(n02Id);
        p.fi = Math.min(p.fi, idx);
        p.ti = Math.max(p.ti, idx);
      }
      break;
    }
  }
  if (lineParts.size === 0) return null;
  return [...lineParts.values()];
}

// 乗車済みデータを再構築（路線追加後に呼ぶ）
function rebuildRiddenStations() {
  Object.keys(riddenSt).forEach(k => delete riddenSt[k]);
  Object.keys(slVisitCount).forEach(k => delete slVisitCount[k]);
  riddenServiceIds.clear();
  let resolvedCount = 0;
  const unresolved = [];
  RIDDEN_SEGS.forEach(seg => {
    // 1. 営業系統 (service_lines_master.json) で解決 — 新形式
    let parts = resolveByServiceLine(seg.lineId, seg.from, seg.to);
    let viaServiceLine = !!parts;
    // 2. 運行系統 (running_services.json) — 旧形式互換
    if (!parts) {
      parts = resolveServiceTrip(seg.lineId, seg.from, seg.to);
    }
    let viaService = !viaServiceLine && !!parts;
    // 3. N02 直接フォールバック
    if (!parts) parts = resolveSegments(seg.lineId, seg.from, seg.to);
    if (!parts) {
      unresolved.push(`${seg.lineId} ${seg.from}→${seg.to}`);
      return;
    }
    resolvedCount++;
    if (viaService && RUNNING_SERVICES[seg.lineId]) {
      riddenServiceIds.add(seg.lineId);
    }
    for (const part of parts) {
      const { line, fi, ti } = part;
      if (!riddenSt[line.id]) riddenSt[line.id] = new Set();
      for (let i = Math.min(fi,ti); i <= Math.max(fi,ti); i++) {
        const stName = line.stations[i].n;
        riddenSt[line.id].add(stName);
        // 訪問回数カウント (個人化UI用)
        slVisitCount[stName] = (slVisitCount[stName] || 0) + 1;
      }
    }
  });
  // Phase 2: 営業系統別 ridden 状態を riddenSt から導出
  Object.keys(slRiddenSt).forEach(k => delete slRiddenSt[k]);
  if (SERVICE_LINES && SERVICE_LINES.length > 0) {
    for (const sl of SERVICE_LINES) {
      const cand = sl.candidateN02Ids || [];
      const allRidden = new Set();
      for (const n02Id of cand) {
        const rs = riddenSt[n02Id];
        if (rs) for (const n of rs) allRidden.add(n);
      }
      if (allRidden.size === 0) continue;
      const slSet = new Set();
      for (const s of sl.stations) {
        if (allRidden.has(s.name)) slSet.add(s.name);
      }
      if (slSet.size > 0) slRiddenSt[sl.id] = slSet;
    }
  }

  if (RIDDEN_SEGS.length > 0) {
    const total = RIDDEN_SEGS.length;
    console.log(`[乗レコ] 乗車記録 ${resolvedCount}/${total} 件マッチ`);
    if (unresolved.length > 0) {
      console.warn(`  未解決 (${unresolved.length}件):`, unresolved);
    }
  }
}
