#!/usr/bin/env node
// v336: 関東主要私鉄・JR の相互直通運転を through_lines に書き込む (Phase B)
//
// モデル: 「直接接続している路線同士」のみ書く (v334 の osaka_loop_line ↔ jr_yamatoji_line スタイル)
// 例: 副都心線 → 東横線 → みなとみらい線 は副都心↔東横、東横↔みなとみらい の 2 ペアで表現。
//     副都心↔みなとみらい は書かない (ハブ navigable UI でホップ可能)
//
// 冪等: 既に書かれていれば skip、broken refs == 0 を assert してから write。

const fs = require('fs');
const path = require('path');

const PATH = path.resolve(__dirname, '..', 'service_lines_master.json');
const raw = fs.readFileSync(PATH, 'utf8');
const data = JSON.parse(raw);

const lines = data.service_lines;
const lineById = new Map(lines.map(l => [l.id, l]));

// id 定数 (typo 防止)
const KEIKYU_HONSEN    = 'auto_本線_京浜急行電鉄';
const TOEI_ASAKUSA     = 'auto_1号線浅草線_東京都';
const KEISEI_OSHIAGE   = 'auto_押上線_京成電鉄';
const KEISEI_HONSEN    = 'auto_本線_京成電鉄';
const KEISEI_NARITA_SKY = 'auto_成田空港線_京成電鉄';
const HOKUSO           = 'auto_北総線_北総鉄道';

const FUKUTOSHIN       = 'auto_13号線副都心線_東京地下鉄';
const YURAKUCHO        = 'auto_8号線有楽町線_東京地下鉄';
const TOYOKO           = 'auto_東横線_東急電鉄';
const MINATOMIRAI      = 'auto_みなとみらい21線_横浜高速鉄道';
const TOJO             = 'auto_東上本線_東武鉄道';
const SEIBU_YURAKUCHO  = 'auto_西武有楽町線_西武鉄道';
const SEIBU_IKEBUKURO  = 'auto_池袋線_西武鉄道';

const HANZOMON         = 'auto_11号線半蔵門線_東京地下鉄';
const DENENTOSHI       = 'auto_田園都市線_東急電鉄';
const TOBU_ISESAKI     = 'auto_伊勢崎線_東武鉄道';

const CHIYODA          = 'auto_9号線千代田線_東京地下鉄';
const ODAKYU_ODAWARA   = 'auto_小田原線_小田急電鉄';
const JR_JOBAN_LOCAL   = 'jr_joban_local';

const METRO_TOZAI      = 'auto_5号線東西線_東京地下鉄';
const TOYO_RAPID       = 'auto_東葉高速線_東葉高速鉄道';
const JR_CHUO_SOBU     = 'jr_chuo_sobu_local';

const MEGURO           = 'auto_目黒線_東急電鉄';
const TOEI_MITA        = 'auto_6号線三田線_東京都';
const NANBOKU          = 'auto_7号線南北線_東京地下鉄';
const SAITAMA_RAPID    = 'auto_埼玉高速鉄道線_埼玉高速鉄道';
const TOKYU_SHINYOKO   = 'auto_東急新横浜線_東急電鉄';
const SOTETSU_SHINYOKO = 'auto_相鉄新横浜線_相模鉄道';
const SOTETSU_HONSEN   = 'auto_相鉄本線_相模鉄道';

const JR_SAIKYO        = 'jr_saikyo_line';
const RINKAI           = 'auto_臨海副都心線_東京臨海高速鉄道';
const JR_KAWAGOE       = 'auto_川越線_東日本旅客鉄道';

// pairs: [a, b, 接続駅, 備考]
const pairs = [
  // G1: 京急-浅草-京成-北総
  [KEIKYU_HONSEN, TOEI_ASAKUSA, '泉岳寺', 'エアポート快特他'],
  [TOEI_ASAKUSA, KEISEI_OSHIAGE, '押上', 'エアポート快特/アクセス特急他'],
  [KEISEI_OSHIAGE, KEISEI_HONSEN, '青砥', '京成内直通'],
  [KEISEI_OSHIAGE, HOKUSO, '京成高砂', 'アクセス特急他'],
  [KEISEI_HONSEN, KEISEI_NARITA_SKY, '京成成田', 'スカイライナー/アクセス特急'],

  // G2: 副都心線 + 東横 + みなとみらい (F ライナー他)
  [FUKUTOSHIN, TOYOKO, '渋谷', 'F ライナー他'],
  [TOYOKO, MINATOMIRAI, '横浜', '横浜高速みなとみらい線'],
  [FUKUTOSHIN, TOJO, '和光市', 'F ライナー他'],
  [FUKUTOSHIN, SEIBU_YURAKUCHO, '小竹向原', 'F ライナー他'],

  // G3: 有楽町線
  [YURAKUCHO, TOJO, '和光市', '有楽町線直通'],
  [YURAKUCHO, SEIBU_YURAKUCHO, '小竹向原', '有楽町線直通'],

  // G4: 西武有楽町線 ↔ 西武池袋線
  [SEIBU_YURAKUCHO, SEIBU_IKEBUKURO, '練馬', '西武内直通'],

  // G5: 半蔵門線
  [HANZOMON, DENENTOSHI, '渋谷', '半蔵門線直通'],
  [HANZOMON, TOBU_ISESAKI, '押上', '半蔵門線直通 (スカイツリーライン)'],

  // G6: 千代田線
  [CHIYODA, ODAKYU_ODAWARA, '代々木上原', 'メトロはこね他'],
  [CHIYODA, JR_JOBAN_LOCAL, '綾瀬', '常磐緩行線直通'],

  // G7: 東西線
  [METRO_TOZAI, TOYO_RAPID, '西船橋', '東葉高速線直通'],
  [METRO_TOZAI, JR_CHUO_SOBU, '中野/西船橋', '中央・総武緩行線直通'],

  // G8: 目黒-南北-三田-埼玉高速-相鉄
  [MEGURO, TOEI_MITA, '目黒', '三田線直通'],
  [MEGURO, NANBOKU, '目黒', '南北線直通'],
  [NANBOKU, SAITAMA_RAPID, '赤羽岩淵', '埼玉高速直通'],
  [MEGURO, TOKYU_SHINYOKO, '日吉', '東急目黒線新横浜延伸'],
  [TOKYU_SHINYOKO, SOTETSU_SHINYOKO, '新横浜', '東急/相鉄 新横浜線'],
  [SOTETSU_SHINYOKO, SOTETSU_HONSEN, '西谷', '相鉄内直通'],

  // G9: 埼京-りんかい-川越
  [JR_SAIKYO, RINKAI, '大崎', 'りんかい線直通'],
  [JR_SAIKYO, JR_KAWAGOE, '大宮', '川越線直通'],
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

// 整合性チェック
const ids = new Set(lines.map(l => l.id));
let broken = 0;
for (const l of lines) {
  for (const ref of (l.through_lines || [])) {
    if (!ids.has(ref)) {
      console.error(`!! broken ref: ${l.id} -> ${ref}`);
      broken++;
    }
  }
}
if (broken > 0) { console.error(`!! ${broken} broken refs remain. abort write.`); process.exit(1); }

fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
console.log(`\nwrote ${PATH}`);
console.log(`pairs: ${pairs.length} (${pairs.length * 2} refs theoretical)`);
console.log(`refs added (excluding already-set): ${added}`);
console.log(`total service_lines: ${lines.length}`);
console.log(`through_lines broken refs: ${broken}`);
