// ══════════════════════════════════════
// LEAFLET MAP（国土地理院タイル）
// ══════════════════════════════════════
let map=null, memoMode=false, clickInfo={};

function initMap(){
  map=L.map('leaflet-map',{
    center:[36.5,138.0], zoom:5,
    zoomControl:false,
    preferCanvas:true,
  });

  const gsiPaleTile = L.tileLayer(
    'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',{
    maxZoom:18,
    attribution:'<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
  });
  const gsiStdTile = L.tileLayer(
    'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',{
    maxZoom:18,
    attribution:'<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
  });
  const cartoTile = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
    maxZoom:19, subdomains:'abcd',
    attribution:'© OpenStreetMap © CARTO',
  });

  // モード: 0=ダーク(GSI淡色+フィルタ) / 1=淡色(フィルタなし) / 2=標準
  // ダークが既定。ボタンで循環切り替え
  window._mapMode = parseInt(localStorage.getItem('mapMode') || '0');
  window._mapTiles = [gsiPaleTile, gsiPaleTile, gsiStdTile];
  const FILTERS = [
    'brightness(0.40) contrast(1.30) saturate(0.45) hue-rotate(195deg)',  // ダーク (より暗く)
    'none',  // 淡色
    'none',  // 標準
  ];
  const MODE_LABELS = ['🌙', '🗺️', '🌐'];

  let gsiErrors=0;
  gsiPaleTile.on('tileerror',()=>{
    gsiErrors++;
    if(gsiErrors>3 && map.hasLayer(gsiPaleTile)){
      map.removeLayer(gsiPaleTile);
      cartoTile.addTo(map);
      const tp=document.querySelector('.leaflet-tile-pane');
      if(tp) tp.style.filter='none';
    }
  });

  function applyMapMode(mode){
    window._mapTiles.forEach(t=>{ if(map.hasLayer(t)) map.removeLayer(t); });
    if(map.hasLayer(cartoTile)) map.removeLayer(cartoTile);
    const tile = window._mapTiles[mode];
    tile.addTo(map);
    setTimeout(()=>{
      const tp=document.querySelector('.leaflet-tile-pane');
      if(tp) tp.style.filter = FILTERS[mode];
    }, 50);
    const btn=document.getElementById('map-mode-btn');
    if(btn) btn.textContent = MODE_LABELS[mode];
    localStorage.setItem('mapMode', String(mode));
    window._mapMode = mode;
  }
  window.cycleMapMode = function(){
    applyMapMode((window._mapMode + 1) % 3);
  };
  applyMapMode(window._mapMode);

  // タッチデバイス(iPad/スマホ): Leafletの拡大縮小ボタンを出さない
  // PC: 右下 FAB スタックの上に配置 (CSS で margin-bottom 調整)
  if (!IS_TOUCH) {
    L.control.zoom({position:'bottomright'}).addTo(map);
  } else {
    // bodyにクラスを付けて、もしどこかで生成されてもCSSで隠す
    document.body.classList.add('no-zoom-control');
  }

  // レイヤーグループを先に作成
  dotLayerRef = L.layerGroup();
  labelLayerRef = L.layerGroup();

  // 初期描画（LINES空でも問題なし、JSONロード後に再描画される）
  drawLines();
  updateOverlays();

  // ストレージ状態を表示（まずlocalStorageの状態を反映）
  const stats = getStorageStats();
  updateStorageUI(stats.count, stats.source);

  // Supabaseから最新データを非同期で取得・同期（バックグラウンド）
  syncFromSupabase();

  // 復元ヒント表示
  if (stats.source === 'static') {
    // restore-hint は削除済み (ユーザー要望)
  }

  // 復元モーダルの情報更新
  const tripCount = document.getElementById('current-trip-count');
  const dataSource = document.getElementById('current-data-source');
  if (tripCount) tripCount.textContent = stats.count;
  if (dataSource) dataSource.textContent = stats.source === 'local'
    ? 'このiPhoneのlocalStorage' : '静的データ（Supabaseから自動同期）';

  // 路線データをJSONファイルから読み込み
  // 初期表示: P1（新幹線）+ P2（JR在来）+ P3（大手私鉄）
  (async () => {
    console.log('[乗レコ] 初期ロード開始');
    await Promise.all([loadRunningServices(), loadMergedStations(), loadCharacters(), loadTrains()]);
    await loadLines(1);
    await loadLines(2);
    await loadLines(3);
    console.log(`[乗レコ] 初期ロード完了: 計${LINES.length}路線`);
    fitToRiddenLines();
    // 営業系統(SERVICE_LINES)を構築 → 新形式 trip(jr_xxx/auto_xxx) を再解決して再描画
    NORIRECO.serviceLines.build().then(() => {
      rebuildRiddenStations();
      if (typeof redrawAllLinesAfterTripChange === 'function') redrawAllLinesAfterTripChange();
      updateOverlays();
      // Supabase からキャラ獲得履歴を同期 → その後 trip 由来の自動獲得チェック
      syncCharacterGrantsFromSupabase().finally(() => {
        setTimeout(() => runCharacterGrantCheck(), 800);
      });
    }).catch(e => console.warn('[乗レコ] SERVICE_LINES 構築失敗:', e));
  })();

  // ズーム変更時にP3/P4を追加読み込み + LOD更新
  map.on('zoomend', () => {
    const z = map.getZoom();
    loadLinesForZoom(z);
    updateLOD();
  });

  // ズーム/パン中はラベル(DOM)を完全に外してDOM負荷をゼロに
  // 操作終了後 updateLOD() で必要なラベルだけ復元
  let _labelsHidden = false;
  function hideLabelsTemporarily() {
    if (_labelsHidden) return;
    if (labelLayerRef && map.hasLayer(labelLayerRef)) {
      map.removeLayer(labelLayerRef);
      _labelsHidden = true;
    }
  }
  function restoreLabelsAfterMove() {
    if (!_labelsHidden) { updateLOD(); return; }
    _labelsHidden = false;
    updateLOD();  // updateLOD が必要なラベルを addLayer して labelLayer を map に戻す
  }
  map.on('movestart', hideLabelsTemporarily);
  map.on('zoomstart', hideLabelsTemporarily);
  map.on('moveend', restoreLabelsAfterMove);
  // zoomend は上で既に updateLOD を呼ぶので追加処理不要

  // メモモード or 記録モード のクリックハンドラ
  map.on('click',e=>{
    if(!memoMode && !recordMode) return;
    let bLine=null,bSt=null,bD=Infinity;
    LINES.forEach(line=>line.stations.forEach(s=>{
      const d=map.distance([s.lat,s.lon],e.latlng);
      if(d<bD){bD=d;bLine=line;bSt=s;}
    }));
    if (!bSt || bD > 2000) return;
    if (memoMode) {
      clickInfo={line:bLine,station:bSt,lat:e.latlng.lat.toFixed(5),lon:e.latlng.lng.toFixed(5)};
      openMemo();
    } else if (recordMode) {
      onRecordStationClick({name: bSt.n, lat: bSt.lat, lon: bSt.lon});
    }
  });
}
