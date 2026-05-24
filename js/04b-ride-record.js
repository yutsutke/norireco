// 乗車記録 (RIDDEN_SEGS) → 派生状態の集計を担うドメイン。
// v194 で 04-gps-location.js から切り出し (v192 02b と同じ案 D = ドメイン分割パターン)。
//
// 状態 (top-level const、外部スクリプトから lexical scope 経由で参照される):
//   slRiddenSt[sl.id]    — 営業系統 id → 乗車済み駅名 Set (Phase 2 主索引)
//   slStopType[駅名]      — 'alighted' | 'boarded' | 'passed' (v186 自動派生)
//   slVisitCount[駅名]    — 駅名 → 訪問回数 (個人化 Lv1-4 判定用)
//   riddenServiceIds     — 旧運行系統 (running_services.json) の乗車済み set
//
// 公開 API (window.NORIRECO.rideRecord):
//   .rebuild()           — RIDDEN_SEGS から上記状態を再構築 (旧 rebuildRiddenStations)
//   .normStName(name)    — 駅名正規化 (「ケ」→「ヶ」+ 空白除去)。05-supabase-data.js から外部参照
//
// 参照グローバル:
//   - NORIRECO.data.LINES / NORIRECO.data.SERVICE_LINES / NORIRECO.data.SERVICE_LINES_MASTER → 02-data-loaders.js
//   - NORIRECO.data.RUNNING_SERVICES → 02-data-loaders.js
//   - RIDDEN_SEGS / riddenSt → 05-supabase-data.js (riddenSt は N02 keyed の内部用)
//
// ロード順: 04 → 04b → 05 (04 内で slRiddenSt を読む drawObtainableIndicators がある
// が runtime 参照のため、04b が 04 の直後でも parse 時点では問題なし)。

(function () {
  'use strict';
  window.NORIRECO = window.NORIRECO || {};

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
  };

  const _STYPE_PRIORITY = { alighted: 3, boarded: 2, passed: 1 };

  function normStName(name) {
    if (!name) return '';
    return String(name).replace(/ケ/g, 'ヶ').replace(/[ 　]/g, '');
  }

  // 旧ID + from駅 + to駅 から、両駅が含まれる路線を探す
  function resolveLineWithStations(legacyId, fromName, toName) {
    const candidates = LEGACY_ID_MAP[legacyId] || [legacyId];
    const fromN = normStName(fromName);
    const toN = normStName(toName);
    for (const candId of candidates) {
      const line = NORIRECO.data.LINES.find(l => l.id === candId);
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
  function resolveServiceTrip(serviceId, fromName, toName) {
    const service = NORIRECO.data.RUNNING_SERVICES[serviceId];
    if (!service || !service.segments) return null;

    const segments = service.segments;
    const fromN = normStName(fromName);
    const toN = normStName(toName);

    const segInfos = segments.map(seg => {
      const line = NORIRECO.data.LINES.find(l => l.id === seg.line);
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

    if (fromSegIdx === toSegIdx) {
      const info = segInfos[fromSegIdx];
      return [{
        line: info.line,
        fi: Math.min(fromIdxInLine, toIdxInLine),
        ti: Math.max(fromIdxInLine, toIdxInLine),
      }];
    }

    const N = segInfos.length;
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
      const fwd = buildPath(1);
      const bwd = buildPath(-1);
      return totalSt(fwd) <= totalSt(bwd) ? fwd : bwd;
    } else {
      const dir = (fromSegIdx <= toSegIdx) ? 1 : -1;
      return buildPath(dir);
    }
  }

  // ジャンクション介在マッチ: 候補路線群の中で from と to を含む路線が異なる場合、
  // 両路線に共通する駅(ジャンクション)を見つけて2つの区間に分割
  function resolveSegments(legacyId, fromName, toName) {
    const direct = resolveLineWithStations(legacyId, fromName, toName);
    if (direct) return [direct];

    const candidates = LEGACY_ID_MAP[legacyId] || [legacyId];
    const fromN = normStName(fromName);
    const toN = normStName(toName);
    const fromLines = [];
    const toLines = [];
    for (const candId of candidates) {
      const line = NORIRECO.data.LINES.find(l => l.id === candId);
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

  // 営業系統(NORIRECO.data.SERVICE_LINES)id から N02 路線セグメントへの解決
  function resolveByServiceLine(slId, fromName, toName) {
    if (!NORIRECO.data.SERVICE_LINES || NORIRECO.data.SERVICE_LINES.length === 0) return null;
    const sl = NORIRECO.data.SERVICE_LINES.find(x => x.id === slId);
    if (!sl || !sl.stations || sl.stations.length < 2) return null;
    const fromN = normStName(fromName), toN = normStName(toName);
    const fromIdx = sl.stations.findIndex(s => normStName(s.name) === fromN);
    const toIdx = sl.stations.findIndex(s => normStName(s.name) === toN);
    if (fromIdx < 0 || toIdx < 0) return null;
    const lo = Math.min(fromIdx, toIdx), hi = Math.max(fromIdx, toIdx);
    const candidates = sl.candidateN02Ids || [];
    if (candidates.length === 0) return null;
    const lineParts = new Map();
    for (let i = lo; i <= hi; i++) {
      const nm = normStName(sl.stations[i].name);
      for (const n02Id of candidates) {
        const ln = NORIRECO.data.LINES.find(l => l.id === n02Id);
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

  // 乗車済みデータを再構築 (RIDDEN_SEGS 全件 → slRiddenSt / slStopType / slVisitCount / riddenServiceIds)
  function rebuild() {
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
      if (viaService && NORIRECO.data.RUNNING_SERVICES[seg.lineId]) {
        riddenServiceIds.add(seg.lineId);
      }
      for (const part of parts) {
        const { line, fi, ti } = part;
        if (!riddenSt[line.id]) riddenSt[line.id] = new Set();
        for (let i = Math.min(fi,ti); i <= Math.max(fi,ti); i++) {
          const stName = line.stations[i].n;
          riddenSt[line.id].add(stName);
          slVisitCount[stName] = (slVisitCount[stName] || 0) + 1;
        }
      }
    });
    // Phase 2: 営業系統別 ridden 状態を RIDDEN_SEGS から直接構築
    // v298: ばらまき方式 (旧) を撤廃し、seg.lineId が示す 1 SL のみに add する方針。
    //   ばらまかないので「八王子で中央線に乗ったら、横浜線・八高線の八王子も ridden」
    //   問題が解消する。
    //
    // v299: ただし v298 単純実装は seg.lineId 直接 match と candidateN02Ids fallback
    //   しか試さず、旧 trip の N02 id (例 "auto_中央線_東日本旅客鉄道") を持つ大半の
    //   trip が拾えなくなって全 SL が「乗車なし」扱い (実線が出ず点線のみ) になっていた。
    //   resolve 経路 (resolveByServiceLine / resolveServiceTrip / resolveSegments) も
    //   使って物理路線 N02 id から SL を 1 つ推定 → そこに add する形に拡張。
    Object.keys(slRiddenSt).forEach(k => delete slRiddenSt[k]);
    if (NORIRECO.data.SERVICE_LINES && NORIRECO.data.SERVICE_LINES.length > 0) {
      const SL = NORIRECO.data.SERVICE_LINES;
      for (const seg of RIDDEN_SEGS) {
        if (!seg || !seg.lineId) continue;
        // 1. SERVICE_LINE.id 直接 match (新形式 trip)
        let targetSl = SL.find(l => l.id === seg.lineId);
        // 2. candidateN02Ids 経由 fallback (1 SL のみ)
        if (!targetSl) targetSl = SL.find(l => (l.candidateN02Ids || []).includes(seg.lineId));
        // 3. resolve 経路から SL 推定 (旧 N02 id trip の救済、1 SL のみ)
        let resolvedParts = null;
        if (!targetSl) {
          resolvedParts = resolveByServiceLine(seg.lineId, seg.from, seg.to)
            || resolveServiceTrip(seg.lineId, seg.from, seg.to)
            || resolveSegments(seg.lineId, seg.from, seg.to);
          if (resolvedParts) {
            for (const part of resolvedParts) {
              const sl = SL.find(l => (l.candidateN02Ids || []).includes(part.line.id));
              if (sl) { targetSl = sl; break; }
            }
          }
        }
        if (!targetSl) continue;

        if (!slRiddenSt[targetSl.id]) slRiddenSt[targetSl.id] = new Set();

        // targetSl 内で seg.from/to が見つかれば駅順展開、見つからなければ
        // resolve 結果の駅名で照合 (旧 N02 形式 trip のための救済)
        const fromIdx = targetSl.stations.findIndex(s => s.name === seg.from);
        const toIdx = targetSl.stations.findIndex(s => s.name === seg.to);
        if (fromIdx >= 0 && toIdx >= 0) {
          const [a, b] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
          for (let i = a; i <= b; i++) {
            const st = targetSl.stations[i];
            if (st.id) slRiddenSt[targetSl.id].add(st.id);
          }
        } else {
          // resolve 結果の駅名を targetSl の駅と照合 (1 SL に限定)
          if (!resolvedParts) {
            resolvedParts = resolveByServiceLine(seg.lineId, seg.from, seg.to)
              || resolveServiceTrip(seg.lineId, seg.from, seg.to)
              || resolveSegments(seg.lineId, seg.from, seg.to);
          }
          if (resolvedParts) {
            for (const part of resolvedParts) {
              const { line, fi, ti } = part;
              for (let i = Math.min(fi, ti); i <= Math.max(fi, ti); i++) {
                const stName = line.stations[i].n;
                const slSt = targetSl.stations.find(s => s.name === stName);
                if (slSt && slSt.id) slRiddenSt[targetSl.id].add(slSt.id);
              }
            }
          }
        }
      }
    }

    // v186: 駅ごとの stop_type 集計 (営業系統 NORIRECO.data.SERVICE_LINES ベース)
    //   - seg.from = boarded (乗車駅)
    //   - seg.to   = alighted (降車駅)
    //   - 中間駅   = passed (通過)
    // 複数 seg / 複数 trip で同じ駅が出る場合は最高優先度 (alighted > boarded > passed) を採用。
    // 乗換駅は実質「降りて乗った」ので alighted 扱いになる (どこかの seg.to に必ず該当)。
    Object.keys(slStopType).forEach(k => delete slStopType[k]);
    if (NORIRECO.data.SERVICE_LINES && NORIRECO.data.SERVICE_LINES.length > 0) {
      RIDDEN_SEGS.forEach(seg => {
        const sl = NORIRECO.data.SERVICE_LINES.find(x => x.id === seg.lineId);
        if (!sl || !sl.stations) return;
        const fromIdx = sl.stations.findIndex(s => s.name === seg.from);
        const toIdx = sl.stations.findIndex(s => s.name === seg.to);
        if (fromIdx < 0 || toIdx < 0) return;
        const lo = Math.min(fromIdx, toIdx), hi = Math.max(fromIdx, toIdx);
        for (let i = lo; i <= hi; i++) {
          const nm = sl.stations[i].name;
          let type;
          if (i === fromIdx) type = 'boarded';
          else if (i === toIdx) type = 'alighted';
          else type = 'passed';
          const cur = slStopType[nm];
          if (!cur || _STYPE_PRIORITY[type] > _STYPE_PRIORITY[cur]) {
            slStopType[nm] = type;
          }
        }
      });
    }

    if (RIDDEN_SEGS.length > 0) {
      const total = RIDDEN_SEGS.length;
      console.log(`[乗レコ] 乗車記録 ${resolvedCount}/${total} 件マッチ`);
      if (unresolved.length > 0) {
        console.warn(`  未解決 (${unresolved.length}件):`, unresolved);
      }
    }
  }

  window.NORIRECO.rideRecord = {
    rebuild,
    normStName,
  };
})();

// 派生状態は top-level const (IIFE の外側) として置き、外部スクリプト
// (04, 02b, 08 等) から lexical scope 経由でそのまま読めるようにする。
//
// v211 ES Modules パイロット (案 β) stage 2: `<script type="module">` 化。
// module スコープ化で classic 04/08 と module 02b からの bare 参照が壊れるため、
// 末尾で window.X 公開を追加。state は **mutable オブジェクト参照** なので
// window.slRiddenSt.foo = bar のような書き込みも共有される。
const riddenServiceIds = new Set();
const slRiddenSt = {};
const slVisitCount = {};
const slStopType = {};
window.riddenServiceIds = riddenServiceIds;
window.slRiddenSt = slRiddenSt;
window.slVisitCount = slVisitCount;
window.slStopType = slStopType;
