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
// ── データローダー (loadMergedStations / loadServiceLinesMaster / loadLines) は
// v191 で 02-data-loaders.js に移管された。SERVICE_LINES_MASTER / SERVICE_LINES /
// serviceLinesLoaded / serviceLinesBuilt 等のグローバル状態も 02 で宣言される。
// ── SERVICE_LINES の構築・分類・達成率 (buildServiceLines / detectServiceLineGroup /
// slStats / slGlobalStats / regionOf / 内部ヘルパー) は v192 で
// 02b-service-lines-builder.js に切り出し、NORIRECO.serviceLines.{build,stats,
// globalStats,detectGroup,regionOf} として公開。
// ── trip → segments 解決 (LEGACY_ID_MAP / normStName / resolveLineWithStations /
// resolveServiceTrip / resolveSegments / resolveByServiceLine) と乗車状態集計
// (slRiddenSt / slStopType / slVisitCount / riddenServiceIds / rebuildRiddenStations)
// は v194 で 04b-ride-record.js に切り出し、NORIRECO.rideRecord.{rebuild,normStName}
// として公開。dead code だった resolveLineId はこのとき削除。

