#!/usr/bin/env node
// v347 (予定): 営業系統×車両形式 DB (Notion) → service_line_vehicles.json
//
// 入力:
//   tools/_notion_db_snapshot.json  (Claude セッションで Notion 親ページから抽出済)
//   service_lines_master.json
//
// 出力:
//   service_line_vehicles.json  (by_sl_id 索引)
//   コンソールに unmatch レポート
//
// マッチング戦略:
//   1. company (DB) → operator (SL) を alias dict で正規化
//   2. lines (DB free text) を ・ 、 / ／ + で分割、各トークンから (...) と "ほか" を除去
//   3. トークン中に 〜 ~ - が入っていれば「区間記述」と判定して skip (営業系統名ではない)
//   4. 同じ operator グループの SL から (name | alias[] | official_line) 一致を探す
//   5. 完全一致 0 件のとき loose: トークンが sl.name の substring (両方向)
//   6. JR貨物 は SL に該当無し → freight 配列に分離

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_PATH = path.join(__dirname, '_notion_db_snapshot.json');
const SL_MASTER_PATH = path.join(ROOT, 'service_lines_master.json');
const OUT_PATH = path.join(ROOT, 'service_line_vehicles.json');

// ── 路線名 alias (DB 表記 → SL の name/alias で見つかる正規形) ──
// SL master の alias 側に書く方が筋だが、SL 多数 (642) で副作用怖いのでここで吸収。
const LINE_ALIAS = {
  '東上線':           ['東上本線'],
  'アーバンパークライン': ['野田線'],
  'スカイツリーライン':   ['伊勢崎線'],
  '中央西線':         ['中央線', '中央本線'],
  '中央東線':         ['中央線', '中央本線'],
  'りんかい線':       ['臨海副都心線'],
  '成田スカイアクセス線': ['成田空港線'],
  '京成成田スカイアクセス線': ['成田空港線'],
  '京葉線':           ['京葉線'],
  '山形線':           ['奥羽本線', '奥羽線'],
  '羽越線':           ['羽越本線'],
  '常磐線':           ['常磐線'],
  '仙山線':           ['仙山線'],
  '仙台空港':         ['仙台空港アクセス線'],
  '東上線':           ['東上本線'],
  '京浜東北線':       ['京浜東北線'],
  '埼京線':           ['埼京線', '東北本線'],
  '湘南新宿ライン':   ['東海道本線', '宇都宮線', '高崎線'],
  '宇都宮線':         ['宇都宮線', '東北本線'],
  '高崎線':           ['高崎線'],
  '横浜線':           ['横浜線'],
  '南武線':           ['南武線'],
  '武蔵野線':         ['武蔵野線'],
  '京葉':             ['京葉線'],
  '川越線':           ['川越線'],
  '内房':             ['内房線'],
  '外房':             ['外房線'],
  '総武':             ['総武本線', '総武線'],
  '成田':             ['成田線'],
  '伯備':             ['伯備線'],
  '紀勢':             ['紀勢本線'],
  '山陽':             ['山陽本線'],
  '山陰':             ['山陰本線'],
  // 注: '東北' は地域名/路線/新幹線で曖昧 (false positive を生むため alias 化しない。
  //     DB 側で「東北本線」「東北新幹線」と明示する運用)
  '函館':             ['函館本線'],
  '宗谷':             ['宗谷本線'],
  '室蘭':             ['室蘭本線'],
  '日豊':             ['日豊本線'],
  '長崎':             ['長崎本線'],
  '高山':             ['高山本線'],
  '東海道':           ['東海道本線'],
  '関西線':           ['関西本線'],
  // 横浜市営 (DB「ブルー/グリーン」→ SL は号線で持つ)
  'ブルーライン':     ['横浜市営1号線', '横浜市営3号線'],
  'グリーンライン':   ['横浜市営4号線'],
  // 都営 (DB は「浅草線」等プレフィックス無し)
  '浅草線':           ['都営浅草線'],
  '三田線':           ['都営三田線'],
  '新宿線':           ['都営新宿線'],
  '大江戸線':         ['都営大江戸線'],
  '荒川線':           ['都電荒川線'],
  // JR千葉地区 短縮形
  '内房':             ['内房線'],
  '外房':             ['外房線'],
  // メトロ 通称 → 号線付き正式名
  '日比谷線':         ['東京メトロ日比谷線', '2号線日比谷線'],
  '銀座線':           ['東京メトロ銀座線', '3号線銀座線'],
  '丸ノ内線':         ['東京メトロ丸ノ内線', '4号線丸ノ内線'],
  '東西線':           ['東京メトロ東西線', '5号線東西線'],
  '千代田線':         ['東京メトロ千代田線', '9号線千代田線'],
  '有楽町線':         ['東京メトロ有楽町線', '8号線有楽町線'],
  '半蔵門線':         ['東京メトロ半蔵門線', '11号線半蔵門線'],
  '南北線':           ['東京メトロ南北線', '7号線南北線'],
  '副都心線':         ['東京メトロ副都心線', '13号線副都心線'],
  // 中央線快速
  '中央快速':         ['中央本線快速', '中央線快速'],
  '中央線快速':       ['中央本線快速'],
  // 京葉
  '京葉':             ['京葉線'],
  // 高崎宇都宮 → 連結表記 (主に E233系列のひっくるめ書き)
  '高崎宇都宮':       ['高崎線', '宇都宮線'],
  // 常磐各停
  '常磐各停':         ['常磐線各駅停車'],
};

// ── DB company → SL operator 候補 ──
// 1:N (例: JR東日本 = 東日本旅客鉄道 or JR東日本)
const COMPANY_ALIAS = {
  'JR北海道':       ['北海道旅客鉄道'],
  'JR東日本':       ['東日本旅客鉄道', 'JR東日本'],
  'JR東海':         ['東海旅客鉄道'],
  'JR西日本':       ['西日本旅客鉄道', 'JR西日本'],
  'JR四国':         ['四国旅客鉄道'],
  'JR九州':         ['九州旅客鉄道'],
  'JR貨物':         [],  // SL に該当系統無し (機関車は freight に分離)
  '東京メトロ':     ['東京地下鉄'],
  '都営地下鉄':     ['東京都', '舎人ライナー_東京都'],
  '大阪メトロ':     ['大阪市高速電気軌道'],
  '名古屋市交通局': ['名古屋市'],
  '横浜市営地下鉄': ['横浜市'],
  '京都市営地下鉄': ['京都市'],
  '神戸市営地下鉄': ['神戸市'],
  '札幌市営地下鉄': ['札幌市'],
  '仙台市地下鉄':   ['仙台市'],
  '福岡市地下鉄':   ['福岡市'],
  '東京臨海高速':   ['東京臨海高速鉄道'],
  '京都丹後鉄道':   ['WILLER　TRAINS', 'WILLER TRAINS', '京都丹後鉄道'],
  'IGRいわて銀河鉄道': ['アイジーアールいわて銀河鉄道'],
};

function operatorsFor(dbCompany) {
  if (COMPANY_ALIAS[dbCompany]) return COMPANY_ALIAS[dbCompany];
  return [dbCompany];
}

// ── lines テキスト分割 + クリーニング ──
// 各 token は { raw, norm } の両方を持ち、マッチング側で raw → ALIAS → norm の順に試す。
const GENERIC_TOKENS = new Set(['各線', '各方面', '各線等', '本線等', '支線', '全線', 'ワンマン区間']);

function tokenizeLines(linesText) {
  if (!linesText) return { tokens: [], skipReason: null };
  let t = linesText;
  // 1. 鍵括弧「...」内 (= 列車名 / 種別愛称) を除去
  t = t.replace(/「[^」]*」?/g, '');
  // 2. クォート除去
  t = t.replace(/["'']/g, '');

  // 3. 括弧内が「実際の路線リスト」(・を含む) なら別トークン群として抽出、
  //    そうでなければ単純に除去 (区間記述や注記)
  let extra = [];
  t = t.replace(/[（(]([^）)]*)[）)]?/g, (_, inner) => {
    if (inner && /[・、,/／]/.test(inner)) {
      extra = extra.concat(inner.split(/[・、,/／+]/).map(s => s.trim()).filter(Boolean));
    }
    return '';
  });

  t = t.trim();
  if (!t && extra.length === 0) return { tokens: [], skipReason: 'train_name_only_or_empty' };

  // 4. 分割 (区切り文字 + 空白) + 括弧内トークン
  let rawTokens = t.split(/[・、,/／+\s]+/).map(s => s.trim()).filter(Boolean).concat(extra);

  // 5. トークンごとの正規化 (raw を保持しつつ norm を作る)
  let tokens = rawTokens
    .filter(s => !/[〜~]/.test(s))         // 区間記述スキップ
    .map(raw => {
      let n = raw
        .replace(/^(特急|急行|快速|普通|寝台特急|観光特急|空港特急|快速特急|汎用|観光|寝台|新快速|超特急|特別快速)/, '')
        .replace(/(直通含む|直通|系統|方面|各方面|地区|タイプ|ほか|他|等|など|含む|相互)+$/, '')
        .replace(/^(JR|ＪＲ)/, '')         // 「JR埼京線」→「埼京線」(operator 一致は別軸でやる)
        .trim();
      return { raw, norm: n };
    })
    .filter(({ raw, norm }) => raw && (raw === '各線' || norm.length > 0))   // 完全 strip された train_name は捨てる
    .filter(({ norm }) => norm !== '線');  // 単独「線」は捨てるが「本線」は findMatchingSls の特殊ケースで処理

  if (tokens.length === 0) return { tokens: [], skipReason: 'train_name_only_or_empty' };

  // 6. 全部 generic ("各線" 等) の場合は別カテゴリ
  if (tokens.every(({ raw }) => GENERIC_TOKENS.has(raw))) {
    return { tokens: [], skipReason: 'generic_all_lines' };
  }
  // generic トークンは集計から外す
  tokens = tokens.filter(({ raw }) => !GENERIC_TOKENS.has(raw));
  if (tokens.length === 0) return { tokens: [], skipReason: 'generic_all_lines' };

  // 7. 「新幹線」suffix の propagation
  //    例: ["東北", "北海道新幹線"] → ["東北新幹線", "北海道新幹線"]
  //    隣接 token が "新幹線" 終わりなら、suffix を持たない地域名トークンに付与
  const hasShinkansen = tokens.some(t => /新幹線$/.test(t.norm));
  if (hasShinkansen) {
    for (const t of tokens) {
      if (!/(本線|新幹線|線|ライン)$/.test(t.norm) && t.norm.length >= 2) {
        t.norm = t.norm + '新幹線';
      }
    }
  }

  return { tokens, skipReason: null };
}

// ── 路線名の体系的揺れ展開: 奥羽本線 → 奥羽線, 中央西線 → 中央線/中央本線, etc. ──
function nameVariants(name) {
  const out = new Set([name]);
  if (!name) return out;
  // 本線 ↔ 線 (両方向)
  if (name.endsWith('本線')) out.add(name.slice(0, -2) + '線');
  else if (name.endsWith('線')) {
    out.add(name.slice(0, -1) + '本線');
    // 中央西線 → 中央 + 線/本線
    const m = name.match(/^(.+?)(東|西|南|北)線$/);
    if (m) {
      out.add(m[1] + '線');
      out.add(m[1] + '本線');
    }
  }
  return out;
}

// ── 1 トークン (raw + norm) を SL 1件以上にマッチ ──
function findMatchingSls({ raw, norm }, candidateSls) {
  // 特殊: 「本線」単独 → 候補グループ内の (operator-prefix)本線 SL を返す
  // (例: 相鉄 + 本線 → auto_相鉄本線_相模鉄道, 京急 + 本線 → auto_本線_京浜急行電鉄)
  if (raw === '本線' || norm === '本線') {
    const offBonsen = candidateSls.filter(sl => sl.official_line === '本線');
    if (offBonsen.length > 0) return { sls: offBonsen, mode: 'exact' };
    const nameBonsen = candidateSls.filter(sl => sl.name && sl.name.endsWith('本線'));
    if (nameBonsen.length > 0) return { sls: nameBonsen, mode: 'operator_本線' };
    return { sls: [], mode: 'none' };
  }

  // 0. raw / norm から variants を作り、LINE_ALIAS と 本線↔線 expander で拡張
  const variants = new Set();
  for (const seed of [raw, norm]) {
    for (const v of nameVariants(seed)) variants.add(v);
    if (LINE_ALIAS[seed]) {
      for (const al of LINE_ALIAS[seed]) {
        for (const vv of nameVariants(al)) variants.add(vv);
      }
    }
  }

  // 1. 完全一致
  const exact = candidateSls.filter(sl => {
    if (variants.has(sl.name)) return true;
    if (variants.has(sl.official_line)) return true;
    for (const a of (sl.alias || [])) if (variants.has(a)) return true;
    return false;
  });
  if (exact.length > 0) return { sls: exact, mode: 'exact' };

  // 2. loose: token が sl.name に含まれる or 逆 (len >= 3 で誤マッチ抑制)
  for (const t of [raw, norm].filter(s => s && s.length >= 3)) {
    const loose = candidateSls.filter(sl =>
      (sl.name && (sl.name.includes(t) || t.includes(sl.name))) ||
      (sl.official_line && (sl.official_line.includes(t) || t.includes(sl.official_line)))
    );
    if (loose.length > 0) return { sls: loose, mode: 'loose' };
  }

  return { sls: [], mode: 'none' };
}

// ── メイン ──
const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
const slMaster = JSON.parse(fs.readFileSync(SL_MASTER_PATH, 'utf8'));
const allSls = slMaster.service_lines;

// operator → SL[] index
const slByOperator = new Map();
for (const sl of allSls) {
  const op = sl.operator;
  if (!slByOperator.has(op)) slByOperator.set(op, []);
  slByOperator.get(op).push(sl);
}

const bySlId = {};        // sl_id → vehicle records[]
const freight = [];       // JR貨物
const unmatched = [];     // 未マッチ
const looseMatches = [];  // loose で当たった (要レビュー)

let totalSlLinks = 0;
let matchedRecords = 0;

for (const rec of snapshot) {
  const ops = operatorsFor(rec.company);

  // freight 専門
  if (rec.company === 'JR貨物') {
    freight.push(rec);
    continue;
  }

  // 候補 SL: operator が一致するもの
  const candidates = ops.flatMap(o => slByOperator.get(o) || []);
  if (candidates.length === 0) {
    unmatched.push({ ...rec, reason: 'no_operator_match' });
    continue;
  }

  const { tokens, skipReason } = tokenizeLines(rec.lines);
  if (tokens.length === 0) {
    unmatched.push({ ...rec, reason: skipReason || 'no_parseable_tokens' });
    continue;
  }

  const matchedSlSet = new Set();
  const tokenReports = [];
  for (const tok of tokens) {
    const { sls, mode } = findMatchingSls(tok, candidates);
    tokenReports.push({ token: tok.raw, norm: tok.norm, hits: sls.length, mode });
    for (const sl of sls) matchedSlSet.add(sl.id);
  }

  if (matchedSlSet.size === 0) {
    unmatched.push({ ...rec, reason: 'no_line_match', tokens, tokenReports });
    continue;
  }

  matchedRecords++;
  for (const slId of matchedSlSet) {
    if (!bySlId[slId]) bySlId[slId] = [];
    bySlId[slId].push({
      vehicle: rec.vehicle,
      company: rec.company,
      status: rec.status,
      trend: rec.trend,
      period: rec.period,
      memory: rec.memory,
      notes: rec.notes,
      source: rec.source,
    });
    totalSlLinks++;
  }
  const anyLoose = tokenReports.some(r => r.mode === 'loose');
  if (anyLoose) looseMatches.push({ ...rec, matchedSlIds: [...matchedSlSet], tokenReports });
}

// 出力
const out = {
  _meta: {
    generated_at: new Date().toISOString(),
    snapshot_records: snapshot.length,
    matched_records: matchedRecords,
    matched_sl_links: totalSlLinks,
    unmatched_records: unmatched.length,
    freight_records: freight.length,
    matched_sl_ids: Object.keys(bySlId).length,
    note: 'Generated from Notion DB "営業系統×車両形式 DB" snapshot via tools/export_service_line_vehicles.js. DB が真実の源、JSON は一方向で再生成 (手編集禁止)。',
  },
  by_sl_id: bySlId,
  freight,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');

// ── レポート ──
console.log('=== Export 完了 ===');
console.log(`snapshot:        ${snapshot.length} records`);
console.log(`matched:         ${matchedRecords} records → ${Object.keys(bySlId).length} SLs (${totalSlLinks} links)`);
console.log(`freight (JR貨物): ${freight.length} records (営業系統紐付け対象外)`);
console.log(`unmatched:       ${unmatched.length} records`);
console.log(`loose matches:   ${looseMatches.length} records (要レビュー)`);
console.log(`output:          ${path.relative(ROOT, OUT_PATH)}`);

// unmatched をカテゴリ別集計
const reasonCounts = unmatched.reduce((acc, u) => {
  acc[u.reason] = (acc[u.reason] || 0) + 1;
  return acc;
}, {});
console.log('\n--- UNMATCHED breakdown ---');
for (const [r, n] of Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${r}: ${n}`);
}

if (unmatched.length > 0) {
  console.log('\n--- UNMATCHED 詳細 (Phase 2 対応用) ---');
  // 同じ理由でグループ化
  const byReason = {};
  for (const u of unmatched) {
    if (!byReason[u.reason]) byReason[u.reason] = [];
    byReason[u.reason].push(u);
  }
  for (const [reason, group] of Object.entries(byReason)) {
    console.log(`\n  [${reason}] ${group.length} records:`);
    for (const u of group) {
      console.log(`    ${u.company} | ${u.vehicle} | "${u.lines}"`);
      if (u.tokenReports) {
        for (const tr of u.tokenReports) {
          console.log(`      token: "${tr.token}" (norm: "${tr.norm}") hits=${tr.hits} mode=${tr.mode}`);
        }
      }
    }
  }
}

if (looseMatches.length > 0) {
  console.log('\n--- LOOSE MATCHES (要レビュー、過剰マッチの可能性) ---');
  for (const lm of looseMatches.slice(0, 20)) {
    console.log(`  ${lm.company} | ${lm.vehicle} | "${lm.lines}" → ${lm.matchedSlIds.join(', ')}`);
  }
  if (looseMatches.length > 20) console.log(`  ... and ${looseMatches.length - 20} more`);
}
