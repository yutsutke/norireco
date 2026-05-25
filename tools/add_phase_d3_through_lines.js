#!/usr/bin/env node
// v343: Phase D3 — 第三セクター北陸・東北 + 福岡空港線 + 私鉄細支線 関東 (23 ペア)
//
// G1 第三セクター北陸・東北 (7) — 旧 JR 北陸本線/東北本線 を分割継承した路線同士の越境運行
// G2 福岡市営空港線↔JR筑肥線 (1) — 福岡空港直通
// G3 私鉄細支線 関東 (15) — 京急/西武/小田急/京王/東武 の本線↔支線
//
// 「直接接続している路線同士のみ」モデル踏襲 (ハブ navigable)。
// 京急本線↔空港線は Phase B (v336) で意図的に skip したが、京急蒲田での直通実態を考えて補正。

const fs = require('fs');
const path = require('path');

const PATH = path.resolve(__dirname, '..', 'service_lines_master.json');
const raw = fs.readFileSync(PATH, 'utf8');
const data = JSON.parse(raw);

const lines = data.service_lines;
const lineById = new Map(lines.map(l => [l.id, l]));

// G1 第三セクター北陸・東北
const HAPI       = 'auto_ハピラインふくい線_ハピラインふくい';
const IR_ISHI    = 'auto_IRいしかわ鉄道線_IRいしかわ鉄道';
const AINOKAZE   = 'auto_あいの風とやま鉄道線_あいの風とやま鉄道';
const TOKI_HISUI = 'auto_日本海ひすいライン_えちごトキめき鉄道';
const TOKI_MYOKO = 'auto_妙高はねうまライン_えちごトキめき鉄道';
const SHINANO    = 'auto_しなの鉄道線_しなの鉄道';
const KITA_SHINANO = 'auto_北しなの線_しなの鉄道';
const IGR        = 'auto_いわて銀河鉄道線_アイジーアールいわて銀河鉄道';
const AOIMORI    = 'auto_青い森鉄道線_青い森鉄道';
const JR_NANAO   = 'auto_七尾線_西日本旅客鉄道';
const JR_SHINONOI = 'auto_篠ノ井線_東日本旅客鉄道';

// G2 福岡
const FUKUOKA_KUKO = 'auto_1号線(空港線)_福岡市';
const JR_CHIKUHI   = 'auto_筑肥線_九州旅客鉄道';

// G3 私鉄細支線 関東
const KEIKYU_HONSEN  = 'auto_本線_京浜急行電鉄';
const KEIKYU_KUKO    = 'auto_空港線_京浜急行電鉄';
const KEIKYU_KURI    = 'auto_久里浜線_京浜急行電鉄';
const KEIKYU_ZUSHI   = 'auto_逗子線_京浜急行電鉄';

const SEIBU_SHINJUKU = 'auto_新宿線_西武鉄道';
const SEIBU_HAIJIMA  = 'auto_拝島線_西武鉄道';
const SEIBU_KOKUBUN  = 'auto_国分寺線_西武鉄道';
const SEIBU_SEIBUEN  = 'auto_西武園線_西武鉄道';
const SEIBU_IKEBUKURO = 'auto_池袋線_西武鉄道';
const SEIBU_SAYAMA   = 'auto_狭山線_西武鉄道';
const SEIBU_CHICHIBU = 'auto_西武秩父線_西武鉄道';
const SEIBU_TOSHIMA  = 'auto_豊島線_西武鉄道';

const ODAKYU_ODAWARA = 'auto_小田原線_小田急電鉄';
const ODAKYU_ENOSHIMA = 'auto_江ノ島線_小田急電鉄';
const ODAKYU_TAMA    = 'auto_多摩線_小田急電鉄';

const KEIO_HONSEN    = 'auto_京王線_京王電鉄';
const KEIO_SAGAMI    = 'auto_相模原線_京王電鉄';
const KEIO_TAKAO     = 'auto_高尾線_京王電鉄';

const TOBU_ISESAKI   = 'auto_伊勢崎線_東武鉄道';
const TOBU_NIKKO     = 'auto_日光線_東武鉄道';
const TOBU_KINUGAWA  = 'auto_鬼怒川線_東武鉄道';

const pairs = [
  // G1 第三セクター北陸・東北
  [HAPI, IR_ISHI, '大聖寺', 'ハピライン/IRいしかわ越境 (旧北陸本線)'],
  [IR_ISHI, AINOKAZE, '倶利伽羅', 'IRいしかわ/あいの風越境 (旧北陸本線)'],
  [IR_ISHI, JR_NANAO, '津幡', 'IRいしかわ車両が七尾線に直通'],
  [AINOKAZE, TOKI_HISUI, '市振', 'あいの風/トキめき越境 (旧北陸本線)'],
  [TOKI_MYOKO, KITA_SHINANO, '妙高高原', 'トキめき/しなの鉄道越境 (旧信越本線)'],
  [SHINANO, JR_SHINONOI, '篠ノ井', 'しなの鉄道車両が篠ノ井線/長野まで直通'],
  [IGR, AOIMORI, '目時', 'IGR/青い森越境 (旧東北本線)'],

  // G2 福岡
  [FUKUOKA_KUKO, JR_CHIKUHI, '姪浜', 'JR筑肥線が福岡空港まで直通'],

  // G3 私鉄細支線 関東
  // 京急
  [KEIKYU_HONSEN, KEIKYU_KURI, '堀ノ内', '京急内 (本線/久里浜線)'],
  [KEIKYU_HONSEN, KEIKYU_ZUSHI, '金沢八景', '京急内 (本線/逗子線)'],
  [KEIKYU_HONSEN, KEIKYU_KUKO, '京急蒲田', 'エアポート急行/快特 (Phase B 漏れ補正)'],
  // 西武新宿線まわり
  [SEIBU_SHINJUKU, SEIBU_HAIJIMA, '小平', '西武内 (新宿線/拝島線)'],
  [SEIBU_SHINJUKU, SEIBU_KOKUBUN, '小平', '西武内 (新宿線/国分寺線)'],
  [SEIBU_SHINJUKU, SEIBU_SEIBUEN, '東村山', '西武内 (新宿線/西武園線)'],
  // 西武池袋線まわり
  [SEIBU_IKEBUKURO, SEIBU_SAYAMA, '西所沢', '西武内 (池袋線/狭山線)'],
  [SEIBU_IKEBUKURO, SEIBU_CHICHIBU, '吾野', '西武内 (池袋線/西武秩父線、特急ちちぶ等)'],
  [SEIBU_IKEBUKURO, SEIBU_TOSHIMA, '練馬', '西武内 (池袋線/豊島線)'],
  // 小田急
  [ODAKYU_ODAWARA, ODAKYU_ENOSHIMA, '相模大野', '小田急内 (小田原/江ノ島)'],
  [ODAKYU_ODAWARA, ODAKYU_TAMA, '新百合ヶ丘', '小田急内 (小田原/多摩)'],
  // 京王
  [KEIO_HONSEN, KEIO_SAGAMI, '調布', '京王内 (京王線/相模原線)'],
  [KEIO_HONSEN, KEIO_TAKAO, '北野', '京王内 (京王線/高尾線)'],
  // 東武日光・鬼怒川系統
  [TOBU_ISESAKI, TOBU_NIKKO, '東武動物公園', '東武内 (伊勢崎/日光線、特急リバティ等)'],
  [TOBU_NIKKO, TOBU_KINUGAWA, '下今市', '東武内 (日光線/鬼怒川線、鬼怒川温泉直通)'],
];

function addRef(srcId, dstId, note) {
  const src = lineById.get(srcId);
  if (!src) { console.error(`!! missing line: ${srcId}`); process.exit(1); }
  if (!Array.isArray(src.through_lines)) src.through_lines = [];
  if (src.through_lines.includes(dstId)) {
    console.log(`= already set: ${srcId} -> ${dstId} (skip)`);
    return 0;
  }
  src.through_lines.push(dstId);
  console.log(`+ added: ${srcId} -> ${dstId}  (${note})`);
  return 1;
}

let added = 0;
for (const [a, b, station, trains] of pairs) {
  const note = `at ${station}, ${trains}`;
  added += addRef(a, b, note);
  added += addRef(b, a, note);
}

data.updated_at = new Date().toISOString().slice(0, 10);

const ids = new Set(lines.map(l => l.id));
let broken = 0, unidi = 0;
for (const a of lines) {
  for (const b of (a.through_lines || [])) {
    if (!ids.has(b)) { broken++; console.error(`!! broken ref: ${a.id} -> ${b}`); continue; }
    if (!(lineById.get(b).through_lines || []).includes(a.id)) {
      unidi++;
      console.error(`!! unidirectional: ${a.id} -> ${b}`);
    }
  }
}
if (broken > 0 || unidi > 0) { console.error(`!! broken=${broken}, unidi=${unidi}. abort.`); process.exit(1); }

fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
console.log(`\nwrote ${PATH}`);
console.log(`pairs: ${pairs.length} (theoretical ${pairs.length * 2} refs)`);
console.log(`refs added: ${added}`);
console.log(`total service_lines: ${lines.length}`);
console.log(`broken refs: ${broken}, unidirectional refs: ${unidi}`);
