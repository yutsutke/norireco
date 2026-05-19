// 営業系統 (NORIRECO.data.SERVICE_LINES) の構築・分類・達成率を担うドメイン。
// v192 で 04-gps-location.js から切り出し。
//
// 公開 API は window.NORIRECO.serviceLines 配下:
//   NORIRECO.serviceLines.build()        — NORIRECO.data.SERVICE_LINES を構築 (idempotent、NORIRECO.data.serviceLinesBuilt フラグで二重ガード)
//   NORIRECO.serviceLines.stats(sl)      — 営業系統 sl の達成率 {t, r, pct}
//   NORIRECO.serviceLines.globalStats()  — 全営業系統の集計 {ts, rt, la, ld, pct}
//   NORIRECO.serviceLines.detectGroup(stations, name, operatorId) — 地域グループ判定
//   NORIRECO.serviceLines.regionOf(lat, lon) — 駅座標 → 地域名
//
// 参照グローバル (宣言場所):
//   - NORIRECO.data.LINES / NORIRECO.data.SERVICE_LINES_MASTER / NORIRECO.data.SERVICE_LINES / NORIRECO.data.serviceLinesLoaded / NORIRECO.data.serviceLinesBuilt → 02-data-loaders.js
//   - loadServiceLinesMaster / loadLines → 02-data-loaders.js
//   - slRiddenSt → 04b-ride-record.js (v194〜、stats が runtime に読む。02b ロード時点では未宣言だが関数呼び出しは 04b ロード後なので OK)
//
// 将来 ES Modules 化のときは IIFE を外して `export { build, stats, ... }` に置換、
// call site の NORIRECO.serviceLines.build → import { build } に機械的に書き換え可能。

(function () {
  'use strict';
  window.NORIRECO = window.NORIRECO || {};

  // N02 物理路線ごとの「駅名→座標」マップを構築
  // キーは line.id。同 id N02 エントリ(富山地方鉄道本線の鉄道線+軌道線等)はマージ
  function buildPerLineCoordMap() {
    const m = new Map(); // line.id -> { name, stations: Map(stationName -> [lat,lon]) }
    for (const line of NORIRECO.data.LINES) {
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

  // NORIRECO.data.SERVICE_LINES を構築 (路線一覧・統計・🚆オーバーレイ共通)
  async function build() {
    if (!NORIRECO.data.serviceLinesLoaded) {
      await loadServiceLinesMaster();
      NORIRECO.data.serviceLinesLoaded = true;
    }
    await Promise.all([loadLines(1), loadLines(2), loadLines(3), loadLines(4)]);
    if (NORIRECO.data.serviceLinesBuilt) return;
    const perLineMap = buildPerLineCoordMap();
    NORIRECO.data.SERVICE_LINES = [];
    for (const sl of (NORIRECO.data.SERVICE_LINES_MASTER || [])) {
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
      NORIRECO.data.SERVICE_LINES.push({
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
    NORIRECO.data.serviceLinesBuilt = true;
    console.log(`[乗レコ] NORIRECO.data.SERVICE_LINES built: ${NORIRECO.data.SERVICE_LINES.length} 系統`);
  }

  // 営業系統の達成率 (slRiddenSt は 04b-ride-record.js で宣言、runtime に参照)
  function stats(sl) {
    const t = sl.stations.length;
    const rs = slRiddenSt[sl.id];
    const r = rs ? rs.size : 0;
    return { t, r, pct: t > 0 ? Math.round(r/t*100) : 0 };
  }

  // 全営業系統の集計
  function globalStats() {
    let ts = 0, rt = 0, la = 0, ld = 0;
    NORIRECO.data.SERVICE_LINES.forEach(sl => {
      const s = stats(sl);
      ts += s.t; rt += s.r;
      if (s.r > 0) la++;
      if (s.pct === 100) ld++;
    });
    return { ts, rt, la, ld, pct: ts > 0 ? Math.round(rt/ts*100) : 0 };
  }

  window.NORIRECO.serviceLines = {
    build,
    stats,
    globalStats,
    detectGroup: detectServiceLineGroup,
    regionOf,
  };
})();
