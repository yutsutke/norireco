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

const LINES = INDEX.lines;

// 駅名の正規化。本体 04b-ride-record.js の normStName (ケ→ヶ・空白除去) が土台。
// 検索用にはさらに全角半角の揺れ (NFKC)・中黒・末尾の「駅」を吸収する。
function normStation(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFKC')
    .replace(/ケ/g, 'ヶ')
    .replace(/[\s・]/g, '')
    .replace(/駅$/, '')
    .toLowerCase();
}

// 系統名の正規化。「JR 中央線（快速）」→「jr中央線快速」
function normLine(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFKC')
    .replace(/[\s・()（）「」]/g, '')
    .toLowerCase();
}

let _stationIndex = null; // 正規化駅名 → [{ line, idx }]
function stationIndex() {
  if (_stationIndex) return _stationIndex;
  _stationIndex = new Map();
  for (const line of LINES) {
    for (let i = 0; i < line.st.length; i++) {
      const key = normStation(line.st[i][0]);
      let arr = _stationIndex.get(key);
      if (!arr) { arr = []; _stationIndex.set(key, arr); }
      arr.push({ line, idx: i });
    }
  }
  return _stationIndex;
}

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

  // 候補系統: line 指定があれば名前解決、無ければ全系統から from/to の両方を含むものを探す
  let candidates;
  if (line) {
    const byId = findLineById(line);
    if (byId) {
      candidates = [byId];
    } else {
      const q = normLine(line);
      candidates = LINES.map((l) => ({ l, s: scoreLine(l, q) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.l);
      if (candidates.length === 0) {
        return { ok: false, error: `「${line}」に一致する系統が見つかりません`, candidates: [] };
      }
    }
  } else {
    candidates = LINES;
  }

  // from (と to) が実際に並んでいる系統だけを残す
  const usable = [];
  for (const l of candidates) {
    const fi = indexOfStation(l, from);
    if (fi < 0) continue;
    if (to == null || to === '') { usable.push({ l, fi, ti: fi }); continue; }
    const ti = indexOfStation(l, to);
    if (ti < 0) continue;
    if (ti === fi) continue; // 同じ駅を指している = 区間にならない
    usable.push({ l, fi, ti });
  }

  if (usable.length === 0) {
    const hint = line
      ? `「${line}」に ${from}${to ? ` と ${to}` : ''} の両方が含まれる系統が見つかりません`
      : `${from}${to ? ` と ${to}` : ''} の両方を含む系統が見つかりません`;
    return {
      ok: false,
      error: hint,
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
