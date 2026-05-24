// ══════════════════════════════════════
// LEAFLET MAP（国土地理院タイル）
//
// v214 ES Modules パイロット (案 β) stage 2: `<script type="module">` 化。
// initMap は 10-init.js (module) の load handler から bare 呼出されるため末尾で window 公開。
//
// v223 ES Modules stage 3: 03-characters の 2 関数を import 化。
// v225: initMap を `export` 公開へ移行 (10-init は import で取り込む)。
// v225: 07-record-mode の 3 関数を import 化。
// ══════════════════════════════════════
import { runCharacterGrantCheck, syncCharacterGrantsFromSupabase } from './03-characters.js';
import {
  onRecordStationClick,
  redrawAllLinesAfterTripChange,
  fitToRiddenLines,
} from './07-record-mode.js';
import { drawLines, updateLOD, updateOverlays } from './08-rendering.js';
import {
  loadLines,
  loadLinesForZoom,
  loadRunningServices,
  loadMergedStations,
  loadCharacters,
  loadTrains,
} from './02-data-loaders.js';
import {
  getStorageStats,
  updateStorageUI,
  syncFromSupabase,
} from './05-supabase-data.js';

// v196 ES Modules パイロット (案 β) — 状態を window.NORIRECO.map に集約。
// stage 2 (type=module 化) で `export const map = NORIRECO.map` ブリッジに置換予定。
window.NORIRECO = window.NORIRECO || {};
NORIRECO.map = NORIRECO.map || {
  instance: null,     // L.map(...) インスタンス (init 後に set、以後単一代入)
  clickInfo: {},      // 直近のマップクリック context {line, station, lat, lon}
};
const M = NORIRECO.map;

export function initMap(){
  M.instance=L.map('leaflet-map',{
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
    if(gsiErrors>3 && M.instance.hasLayer(gsiPaleTile)){
      M.instance.removeLayer(gsiPaleTile);
      cartoTile.addTo(M.instance);
      const tp=document.querySelector('.leaflet-tile-pane');
      if(tp) tp.style.filter='none';
    }
  });

  function applyMapMode(mode){
    window._mapTiles.forEach(t=>{ if(M.instance.hasLayer(t)) M.instance.removeLayer(t); });
    if(M.instance.hasLayer(cartoTile)) M.instance.removeLayer(cartoTile);
    const tile = window._mapTiles[mode];
    tile.addTo(M.instance);
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
    L.control.zoom({position:'bottomright'}).addTo(M.instance);
  } else {
    // bodyにクラスを付けて、もしどこかで生成されてもCSSで隠す
    document.body.classList.add('no-zoom-control');
  }

  // レイヤーグループを先に作成
  // v221: 08 module-local `let` から window 直置きへ移行 (08 と 06 が両方書込側で
  // module strict mode の bare 代入禁止に抵触していた)
  window.dotLayerRef = L.layerGroup();
  window.labelLayerRef = L.layerGroup();

  // 初期描画（NORIRECO.data.LINES空でも問題なし、JSONロード後に再描画される）
  drawLines();
  updateOverlays();

  // ストレージ状態を表示（まずlocalStorageの状態を反映）
  const stats = getStorageStats();
  updateStorageUI(stats.count, stats.source);

  // Supabaseから最新データを非同期で取得・同期（バックグラウンド）
  syncFromSupabase();

  // v234: 旧 'static' (静的デモデータ) は撤去済。データ未取得状態は 'empty'。
  // 復元モーダルの情報更新
  const tripCount = document.getElementById('current-trip-count');
  const dataSource = document.getElementById('current-data-source');
  if (tripCount) tripCount.textContent = stats.count;
  if (dataSource) dataSource.textContent = stats.source === 'local'
    ? 'このiPhoneのlocalStorage' : 'データなし（ログイン後 Supabase から同期）';

  // 路線データをJSONファイルから読み込み
  // 初期表示: P1（新幹線）+ P2（JR在来）+ P3（大手私鉄）
  (async () => {
    console.log('[乗レコ] 初期ロード開始');
    await Promise.all([loadRunningServices(), loadMergedStations(), loadCharacters(), loadTrains()]);
    await loadLines(1);
    await loadLines(2);
    await loadLines(3);
    console.log(`[乗レコ] 初期ロード完了: 計${NORIRECO.data.LINES.length}路線`);
    fitToRiddenLines();
    // 営業系統(NORIRECO.data.SERVICE_LINES)を構築 → 新形式 trip(jr_xxx/auto_xxx) を再解決して再描画
    NORIRECO.serviceLines.build().then(() => {
      NORIRECO.rideRecord.rebuild();
      redrawAllLinesAfterTripChange();
      updateOverlays();
      // Supabase からキャラ獲得履歴を同期 → その後 trip 由来の自動獲得チェック
      syncCharacterGrantsFromSupabase().finally(() => {
        setTimeout(() => runCharacterGrantCheck(), 800);
      });
    }).catch(e => console.warn('[乗レコ] NORIRECO.data.SERVICE_LINES 構築失敗:', e));
  })();

  // ズーム変更時にP3/P4を追加読み込み + LOD更新
  M.instance.on('zoomend', () => {
    const z = M.instance.getZoom();
    loadLinesForZoom(z);
    updateLOD();
  });

  // ズーム/パン中はラベル(DOM)を完全に外してDOM負荷をゼロに
  // 操作終了後 updateLOD() で必要なラベルだけ復元
  let _labelsHidden = false;
  function hideLabelsTemporarily() {
    if (_labelsHidden) return;
    if (labelLayerRef && M.instance.hasLayer(labelLayerRef)) {
      M.instance.removeLayer(labelLayerRef);
      _labelsHidden = true;
    }
  }
  function restoreLabelsAfterMove() {
    if (!_labelsHidden) { updateLOD(); return; }
    _labelsHidden = false;
    updateLOD();  // updateLOD が必要なラベルを addLayer して labelLayer を map に戻す
  }
  M.instance.on('movestart', hideLabelsTemporarily);
  M.instance.on('zoomstart', hideLabelsTemporarily);
  M.instance.on('moveend', restoreLabelsAfterMove);
  // zoomend は上で既に updateLOD を呼ぶので追加処理不要

  // v284: 記録モードのみのクリックハンドラ (旧 memoMode 撤去 — 駅・路線アクションシートで代替)
  // v304: 通常モード時も map.click を delegate として使い、ピクセル距離 30px 以内に
  //   merged_stations の駅があれば駅アクションシートを開く。Canvas circleMarker の
  //   click が効かない環境 (v303 で hit area を全駅追加したら重すぎた) への対策。
  //   多系統駅 (divIcon) は自前 click + stopPropagation するので map.click は発火せず、
  //   ここに来るのは circleMarker 駅 (= small dot) の周辺をタップしたときだけ。
  M.instance.on('click', e => {
    // 記録モード: 既存ロジック (N02 LINES の最寄駅から距離判定)
    if (NORIRECO.record.mode) {
      let bSt=null,bD=Infinity;
      NORIRECO.data.LINES.forEach(line=>line.stations.forEach(s=>{
        const d=M.instance.distance([s.lat,s.lon],e.latlng);
        if(d<bD){bD=d;bSt=s;}
      }));
      if (!bSt || bD > 2000) return;
      onRecordStationClick({name: bSt.n, lat: bSt.lat, lon: bSt.lon});
      return;
    }

    // v304/v305: 通常モード — ピクセル距離 40px 以内の merged_station を駅クリック扱い。
    //   v306: 動作確認できたのでデバッグ用 console.log を撤去。
    const MS = NORIRECO.data?.MERGED_STATIONS;
    if (!Array.isArray(MS) || MS.length === 0) return;
    const cp = e.containerPoint;
    const HIT_PX = 40;
    let best = null, bestPx = HIT_PX;
    for (const ms of MS) {
      const pt = M.instance.latLngToContainerPoint([ms.lat, ms.lon]);
      const dx = pt.x - cp.x, dy = pt.y - cp.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < bestPx) { bestPx = d; best = ms; }
    }
    if (best && window.NORIRECO?.stationActions?.open) {
      NORIRECO.stationActions.open(best);
    }
  });
}

// v225 stage 3: initMap は `export` 経由に移行。10-init.js が import で取り込む。
