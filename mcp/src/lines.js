// 系統・駅の解決ドメイン。
//
// AI チャット経由の入力は「中央線で新宿から八王子」「やまのてせん一周」のように
// 曖昧なので、ここで 乗レコ の系統 id (jr_chuo_rapid 等) と駅 id (s_NNNNN) に落とす。
// 解決できないときは「候補を返して呼び元 (= AI) に選ばせる」方針。勝手に 1 つ選ぶと
// 誤った旅程が黙って保存されるので、曖昧さは必ず表に出す。
//
// データ: ./data/lines-index.json は mcp/scripts/build-index.mjs の生成物。
//   本体 js/02b-service-lines-builder.js と同じ手順で駅 id を解決済み。
import INDEX from './data/lines-index.json';
import { normLine, normStation } from './norm.js';

const LINES = INDEX.lines;

// 正規化駅名 → [{ line, idx }]。
//
// **module 直下で組む (遅延させない)。** Worker ではモジュール評価は「起動時間」
// (上限 400ms) の枠で走るのに対し、リクエスト中の計算は 1 リクエストあたりの CPU
// 上限 (無料プランは 10ms) に当たる。1 万駅ぶんの索引構築を最初のリクエストの中で
// やると、そのリクエストだけ失敗しうる。
//
// st[i][2] はビルド時に焼き込んだ正規化名 (src/norm.js)。ここで normalize を回すと
// 起動時間が数倍になるので使わない。
const STATION_INDEX = (() => {
  const idx = new Map();
  for (const line of LINES) {
    for (let i = 0; i < line.st.length; i++) {
      const key = line.st[i][2] || normStation(line.st[i][0]);
      let arr = idx.get(key);
      if (!arr) { arr = []; idx.set(key, arr); }
      arr.push({ line, idx: i });
    }
  }
  return idx;
})();
const stationIndex = () => STATION_INDEX;

export function lineSummary(line) {
  return {
    line_id: line.id,
    name: line.name,
    operator: line.operator,
    region: line.region,
    station_count: line.st.length,
    from: line.st[0][0],
    to: line.st[line.st.length - 1][0],
    circular: line.circular || undefined,
  };
}

export function findLineById(id) {
  return LINES.find((l) => l.id === id) || null;
}

// 系統名の一致度。0 は不一致。大きいほど確からしい。
function scoreLine(line, q) {
  const name = normLine(line.name);
  const kana = normLine(line.kana);
  const op = normLine(line.operator);
  if (line.id === q) return 1000;
  if (name === q) return 100;
  if (line.alias.some((a) => normLine(a) === q)) return 95;
  if (kana && kana === q) return 90;
  // 「JR東日本中央本線快速」のように事業者を前置きした聞き方
  if (op && (op + name) === q) return 88;
  if (name.startsWith(q)) return 80;
  if (line.alias.some((a) => normLine(a).includes(q))) return 70;
  if (name.includes(q)) return 60;
  if (kana && kana.includes(q)) return 50;
  if (op && (op + name).includes(q)) return 40;
  return 0;
}

export function searchLines(query, limit = 8) {
  const q = normLine(query);
  if (!q) return [];
  const hits = [];
  for (const line of LINES) {
    const score = scoreLine(line, q);
    if (score > 0) hits.push({ line, score });
  }
  hits.sort((a, b) => b.score - a.score || b.line.st.length - a.line.st.length);
  return hits.slice(0, limit).map((h) => lineSummary(h.line));
}

// 駅名 → その駅が乗っている系統。同名異所 (高松・大手町 等) は駅 id ごとに分かれる。
export function searchStations(query, limit = 8) {
  const q = normStation(query);
  if (!q) return [];
  const byStationId = new Map();
  for (const [key, entries] of stationIndex()) {
    // 完全一致を優先しつつ、部分一致も拾う (「東京テレポ」→「東京テレポート」)
    const exact = key === q;
    if (!exact && !key.includes(q)) continue;
    for (const { line, idx } of entries) {
      const [name, id] = line.st[idx];
      const mapKey = id || `${name}@${line.id}`;
      let rec = byStationId.get(mapKey);
      if (!rec) {
        rec = { station_id: id, name, exact, lines: [] };
        byStationId.set(mapKey, rec);
      }
      if (exact) rec.exact = true;
      if (!rec.lines.some((l) => l.line_id === line.id)) {
        rec.lines.push({ line_id: line.id, name: line.name, operator: line.operator });
      }
    }
  }
  const out = [...byStationId.values()];
  out.sort((a, b) => (b.exact - a.exact) || (b.lines.length - a.lines.length));
  // region は付けない: 系統側のラベルなので「高松 (四国) が中国・山陰」のように
  // 駅の所在地と食い違う。どの事業者のどの系統に乗っているかで見分けてもらう。
  return out.slice(0, limit).map((r) => ({
    station_id: r.station_id,
    name: r.name,
    lines: r.lines.slice(0, 12),
  }));
}

/**
 * 駅名 → その駅を含む系統の Map(line.id → {line, idx})。
 *
 * **完全一致を優先し、どこにも無いときだけ部分一致に落とす。** 系統ごとに独立して
 * 部分一致を許すと、「立川」が (立川を含まない) 西武拝島線の「西武立川」に一致して
 * しまい、頼んでいない駅で解決される (2026-08-29 に乗換候補の実測で発見)。
 *
 * 索引 (stationIndex) 経由なので全系統をなめない。ここを線形探索にすると 1 回の
 * 呼び出しで 1 万駅ぶんの正規化が走り、Worker の CPU 時間を食い潰す。
 *
 * @param {Set<string>} [allowedIds] 系統を絞る場合の id 集合 (line 指定があるとき)
 */
function linesWithStation(query, allowedIds) {
  const q = normStation(query);
  if (!q) return new Map();
  const pick = (entries, out) => {
    for (const e of entries) {
      if (allowedIds && !allowedIds.has(e.line.id)) continue;
      if (!out.has(e.line.id)) out.set(e.line.id, e);
    }
  };
  const exact = new Map();
  pick(stationIndex().get(q) || [], exact);
  if (exact.size > 0) return exact;
  const partial = new Map();
  for (const [key, entries] of stationIndex()) {
    if (key.includes(q)) pick(entries, partial);
  }
  return partial;
}

function indexOfStation(line, query) {
  const q = normStation(query);
  let hit = -1;
  for (let i = 0; i < line.st.length; i++) {
    if (normStation(line.st[i][0]) === q) { hit = i; break; }
  }
  if (hit >= 0) return hit;
  // 完全一致が無ければ部分一致で 1 件に絞れるときだけ採用
  const partial = [];
  for (let i = 0; i < line.st.length; i++) {
    if (normStation(line.st[i][0]).includes(q)) partial.push(i);
  }
  return partial.length === 1 ? partial[0] : -1;
}

/**
 * 1 区間 (乗り換えなしの一続き) を解決する。
 *
 * @param {object} input
 * @param {string} [input.line]  系統の言い方 (id でも名前でも可)。省略時は from/to から推測
 * @param {string} input.from    乗車駅
 * @param {string} [input.to]    降車駅。省略時は「訪問のみ」扱い
 * @returns {{ ok: true, segment: object } | { ok: false, error: string, candidates?: object[] }}
 */
export function resolveSegment({ line, from, to }) {
  if (!from) return { ok: false, error: '乗車駅 (from) が指定されていません' };

  // 候補系統: line 指定があれば名前で絞り込み、無ければ全系統が対象
  let allowedIds = null;
  if (line) {
    const byId = findLineById(line);
    if (byId) {
      allowedIds = new Set([byId.id]);
    } else {
      const q = normLine(line);
      const matched = LINES.filter((l) => scoreLine(l, q) > 0);
      if (matched.length === 0) {
        return { ok: false, error: `「${line}」に一致する系統が見つかりません`, candidates: [] };
      }
      allowedIds = new Set(matched.map((l) => l.id));
    }
  }

  // from (と to) が実際に並んでいる系統だけを残す
  const fromHits = linesWithStation(from, allowedIds);
  const toHits = (to == null || to === '') ? null : linesWithStation(to, allowedIds);
  const usable = [];
  for (const [lineId, f] of fromHits) {
    if (!toHits) { usable.push({ l: f.line, fi: f.idx, ti: f.idx }); continue; }
    const t = toHits.get(lineId);
    if (!t || t.idx === f.idx) continue; // 同じ駅を指している = 区間にならない
    usable.push({ l: f.line, fi: f.idx, ti: t.idx });
  }

  if (usable.length === 0) {
    const hint = line
      ? `「${line}」に ${from}${to ? ` と ${to}` : ''} の両方が含まれる系統が見つかりません`
      : `${from}${to ? ` と ${to}` : ''} の両方を含む系統が見つかりません`;
    // 1 本で繋がらないだけかもしれないので、乗り換え経路を自分で探して返す。
    // AI に「どう行きましたか」と人へ聞き返させるより、候補を出して選んでもらう方が速い。
    const routes = to ? suggestRoutes(from, to) : [];
    return {
      ok: false,
      error: hint,
      routes: routes.length > 0 ? routes : undefined,
      candidates: line ? searchLines(line) : searchStations(from),
    };
  }

  // 2 つ以上残ったら AI に選ばせる。ただし系統名が完全一致している 1 本があればそれを採る。
  if (usable.length > 1) {
    const q = normLine(line || '');
    const exact = usable.filter((u) => u.l.id === line || normLine(u.l.name) === q);
    if (exact.length !== 1) {
      return {
        ok: false,
        error: `系統を 1 つに絞れません (${usable.length} 件)。line にどれかの line_id を指定してください`,
        candidates: usable.slice(0, 8).map((u) => lineSummary(u.l)),
      };
    }
    usable.length = 0;
    usable.push(exact[0]);
  }

  const { l, fi, ti } = usable[0];
  const [fromName, fromId] = l.st[fi];
  const [toName, toId] = l.st[ti];
  // 環状線は駅の並びが一方向の配列なので、「東京→品川」を配列順で数えると外回り
  // (24 駅) になり、実際に乗った内回り (8 駅) と食い違う。本体 saveMultiSegmentTrip も
  // 同じ数え方なので数え方は変えず、警告だけ出して利用者に確かめてもらう。
  const span = Math.abs(ti - fi) + 1;
  const warning = (l.circular && span > l.st.length / 2 + 1)
    ? `${l.name} は環状線です。この区間は駅の並び順 (${l.st[0][0]}発) で数えているため ${span} 駅になります。逆回りなら ${l.st.length - span + 2} 駅です。どちら回りか確認してください`
    : undefined;
  return {
    ok: true,
    segment: {
      line_id: l.id,
      line_name: l.name,
      operator: l.operator,
      from: fromName,
      from_station_id: fromId,
      to: toName,
      to_station_id: toId,
      // 本体 saveMultiSegmentTrip と同じ数え方 (両端を含む駅数)
      station_count: span,
      visit_only: fi === ti,
      warning,
    },
  };
}

let _nameById = null;
/** 駅 id → 駅名。Supabase から返る trip は id しか持たないので表示用に逆引きする。 */
export function stationNameById(id) {
  if (!id) return null;
  if (!_nameById) {
    _nameById = new Map();
    for (const line of LINES) {
      for (const [name, sid] of line.st) if (sid && !_nameById.has(sid)) _nameById.set(sid, name);
    }
  }
  return _nameById.get(id) || null;
}

// ═══════════════════════════════════════════════════════════════════════
// 乗換候補の自動提案
//
// 「東京→拝島」のように 1 本の系統では繋がらない区間を、AI に聞き返させる代わりに
// 「どこで乗り換えれば繋がるか」を計算して返す。本体 js/07-record-mode.js の
// findTransferCandidates (v365) / v366 直通優先 / v367 徒歩乗換 を移植したもの:
//   - a を含む系統 linesA × b を含む系統 linesB の組合せで、両方に乗る駅 x を探す
//   - 駅一致は駅 id ベース (同名異所を混同しない)。直接無ければ徒歩乗換グループで探す
//   - 乗換駅ごとに dedupe し「総駅数最小」を残す (同じ駅で複数の系統組合せを並べない)
//   - 総駅数 = (a→x) + (x→b)。乗換駅を 2 系統ぶん重複カウントするのは本体の数え方と同じ
//   - lineA.through に lineB が含まれる = 直通電車がある → 総駅数が多くても上位に出す
// ═══════════════════════════════════════════════════════════════════════

let _idxMaps = null; // line.id → Map(駅 id → その系統での位置)
function stationIdxMap(line) {
  if (!_idxMaps) _idxMaps = new Map();
  let m = _idxMaps.get(line.id);
  if (!m) {
    m = new Map();
    for (let i = 0; i < line.st.length; i++) {
      const id = line.st[i][1];
      if (id && !m.has(id)) m.set(id, i);
    }
    _idxMaps.set(line.id, m);
  }
  return m;
}

let _walkOf = null; // 駅 id → 同じ徒歩乗換グループの他の駅 id[]
function walkPartners(stationId) {
  if (!_walkOf) {
    _walkOf = new Map();
    for (const group of INDEX.walk_groups || []) {
      for (const id of group) _walkOf.set(id, group);
    }
  }
  const group = _walkOf.get(stationId);
  return group ? group.filter((id) => id !== stationId) : [];
}

let _linesAt = null; // 駅 id → その駅を通る系統[]
function linesAtStation(stationId) {
  if (!_linesAt) {
    _linesAt = new Map();
    for (const line of LINES) {
      for (const [, id] of line.st) {
        if (!id) continue;
        let arr = _linesAt.get(id);
        if (!arr) { arr = []; _linesAt.set(id, arr); }
        if (arr[arr.length - 1] !== line) arr.push(line);
      }
    }
  }
  return _linesAt.get(stationId) || [];
}

const seg = (line, fromIdx, toIdx) => ({
  line: line.name,
  line_id: line.id,
  from: line.st[fromIdx][0],
  to: line.st[toIdx][0],
  station_count: Math.abs(toIdx - fromIdx) + 1,
});

function endpointLines(query) {
  return [...linesWithStation(query).values()].map((e) => ({ line: e.line, i: e.idx }));
}

// 1 回乗換で繋がる経路。本体 findTransferCandidates の移植。
function oneHop(linesA, linesB, toQuery, limit) {
  const toNorm = normStation(toQuery);
  const best = new Map();
  for (const { line: lineA, i: aIdx } of linesA) {
    const through = new Set(lineA.through || []);
    for (let i = 0; i < lineA.st.length; i++) {
      const [xName, xId] = lineA.st[i];
      if (normStation(xName) === toNorm) continue;
      const isA = i === aIdx;
      for (const { line: lineB, i: bIdx } of linesB) {
        if (lineB.id === lineA.id) continue;
        const map = stationIdxMap(lineB);
        let xOnB = xId ? map.get(xId) : undefined;
        let walkTo = null;
        if (xOnB === undefined && xId) {
          // 直接乗り換えられないなら「歩いて別の駅へ」を探す (新宿 → 西武新宿 など)
          for (const pid of walkPartners(xId)) {
            const j = map.get(pid);
            if (j !== undefined) { xOnB = j; walkTo = lineB.st[j][0]; break; }
          }
        }
        if (xOnB === undefined || xOnB === bIdx) continue;
        // x が乗車駅そのもの = 徒歩乗換のときだけ意味がある
        // (直接乗り換えられるなら、そもそも 1 本で繋がっていて ここに来ない)
        if (isA && !walkTo) continue;

        const first = seg(lineA, aIdx, i);
        const second = seg(lineB, xOnB, bIdx);
        const total = first.station_count + second.station_count;
        const direct = through.has(lineB.id);
        const key = `${xId || xName}${walkTo ? `|w_${walkTo}` : ''}`;
        const prev = best.get(key);
        const better = !prev
          || (direct && !prev.direct_through)
          || (direct === !!prev.direct_through && total < prev.total_stations);
        if (better) {
          best.set(key, {
            transfer_at: xName,
            walk_to: walkTo || undefined,
            direct_through: direct || undefined,
            total_stations: total,
            segments: [first, second],
          });
        }
      }
    }
  }
  return [...best.values()]
    .sort((p, q) => (Number(!!q.direct_through) - Number(!!p.direct_through)) || (p.total_stations - q.total_stations))
    .slice(0, limit);
}

// 2 回乗換の fallback (1 回で繋がらない遠距離用)。本体 find2HopTransferCandidates 相当。
// Worker の CPU 時間は有限なので、探索量に上限を置いて超えたらそこまでの結果を返す。
function twoHop(linesA, linesB, limit, budget = 40000) {
  const bIdxOf = new Map(linesB.map(({ line, i }) => [line.id, i]));
  const bStations = new Set();
  for (const { line } of linesB) for (const [, id] of line.st) if (id) bStations.add(id);

  const best = new Map();
  let work = 0;
  for (const { line: lineA, i: aIdx } of linesA) {
    for (let i = 0; i < lineA.st.length; i++) {
      if (i === aIdx) continue;
      const [xName, xId] = lineA.st[i];
      if (!xId) continue;
      for (const lineC of linesAtStation(xId)) {
        if (lineC.id === lineA.id || bIdxOf.has(lineC.id)) continue;
        const xOnC = stationIdxMap(lineC).get(xId);
        if (xOnC === undefined) continue;
        for (let j = 0; j < lineC.st.length; j++) {
          if (++work > budget) return finish(best, limit);
          const [yName, yId] = lineC.st[j];
          if (!yId || j === xOnC || !bStations.has(yId)) continue;
          for (const { line: lineB } of linesB) {
            const yOnB = stationIdxMap(lineB).get(yId);
            const bIdx = bIdxOf.get(lineB.id);
            if (yOnB === undefined || yOnB === bIdx) continue;
            const parts = [seg(lineA, aIdx, i), seg(lineC, xOnC, j), seg(lineB, yOnB, bIdx)];
            const total = parts.reduce((n, p) => n + p.station_count, 0);
            const key = `${xId}|${yId}`;
            const prev = best.get(key);
            if (!prev || total < prev.total_stations) {
              best.set(key, { transfer_at: `${xName} → ${yName}`, total_stations: total, segments: parts });
            }
          }
        }
      }
    }
  }
  return finish(best, limit);
}

function finish(best, limit) {
  return [...best.values()].sort((p, q) => p.total_stations - q.total_stations).slice(0, limit);
}

/**
 * from → to が 1 本の系統で繋がらないときに、乗り換え経路の候補を返す。
 * @returns {object[]} 総駅数の少ない順 (直通がある経路は優先)。見つからなければ空配列
 */
export function suggestRoutes(from, to, limit = 5) {
  const linesA = endpointLines(from);
  const linesB = endpointLines(to);
  if (linesA.length === 0 || linesB.length === 0) return [];
  const hop1 = oneHop(linesA, linesB, to, limit);
  if (hop1.length > 0) return hop1;
  return twoHop(linesA, linesB, Math.min(limit, 3));
}
