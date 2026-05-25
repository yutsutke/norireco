#!/usr/bin/env node
// v337: Phase C — 関西主要私鉄・JR・地下鉄の相互直通運転を through_lines に書き込む
//
// モデル: v336 と同じ「直接接続している路線同士のみ」ハブ navigable
//
// s0/s1 セグメント分割: 国土地理院 N02 polyline 由来で同一路線が 2 ID に分割されているケース
// (大阪メトロ中央線_s0/s1, 近鉄けいはんな線_s0/s1, 北大阪急行南北線_s0/s1)。
// 接続駅が含まれている s0 側にのみ書く (s1 は本線から離れた延伸/支線セグメントデータ)。
//
// 冪等: 既に書かれていれば skip、broken refs == 0 を assert してから write。

const fs = require('fs');
const path = require('path');

const PATH = path.resolve(__dirname, '..', 'service_lines_master.json');
const raw = fs.readFileSync(PATH, 'utf8');
const data = JSON.parse(raw);

const lines = data.service_lines;
const lineById = new Map(lines.map(l => [l.id, l]));

// id 定数
const HANKYU_KYOTO     = 'auto_京都線_阪急電鉄';
const HANKYU_KOBE      = 'auto_神戸線_阪急電鉄';
const HANKYU_SENRI     = 'auto_千里線_阪急電鉄';
const HANKYU_ARASHI    = 'auto_嵐山線_阪急電鉄';
const HANKYU_KOSOKU    = 'auto_神戸高速線_阪急電鉄';

const OSAKA_SAKAISUJI  = 'auto_6号線(堺筋線)_大阪市高速電気軌道';
const OSAKA_MIDOSUJI   = 'auto_1号線(御堂筋線)_大阪市高速電気軌道';
const OSAKA_CHUO_S0    = 'auto_4号線(中央線)_大阪市高速電気軌道_s0';

const HANSHIN_HONSEN   = 'auto_本線_阪神電気鉄道';
const HANSHIN_NAMBA    = 'auto_阪神なんば線_阪神電気鉄道';
const HANSHIN_KOSOKU   = 'auto_神戸高速線_阪神電気鉄道';
const SHINTETSU_KOSOKU = 'auto_神戸高速線_神戸電鉄';

const KINTETSU_NARA    = 'auto_奈良線_近畿日本鉄道';
const KINTETSU_NAMBA   = 'auto_難波線_近畿日本鉄道';
const KINTETSU_KYOTO   = 'auto_京都線_近畿日本鉄道';
const KINTETSU_KASHIH  = 'auto_橿原線_近畿日本鉄道';
const KINTETSU_OSAKA   = 'auto_大阪線_近畿日本鉄道';
const KINTETSU_MINAMI  = 'auto_南大阪線_近畿日本鉄道';
const KINTETSU_YOSHINO = 'auto_吉野線_近畿日本鉄道';
const KINTETSU_KEIHAN_S0 = 'auto_けいはんな線_近畿日本鉄道_s0';

const KEIHAN_HONSEN    = 'auto_京阪本線_京阪電気鉄道';
const KEIHAN_OTO       = 'auto_鴨東線_京阪電気鉄道';
const KEIHAN_NAKA      = 'auto_中之島線_京阪電気鉄道';
const KEIHAN_KATANO    = 'auto_交野線_京阪電気鉄道';
const KEIHAN_UJI       = 'auto_宇治線_京阪電気鉄道';
const KEIHAN_KEISHIN   = 'auto_京津線_京阪電気鉄道';

const KYOTO_TOZAI      = 'auto_東西線_京都市';

const KITA_OSAKA_S0    = 'auto_南北線_北大阪急行電鉄_s0';

const OSAKA_LOOP       = 'osaka_loop_line';
const JR_SAKURAJIMA    = 'auto_桜島線_西日本旅客鉄道';

const JR_HANWA         = 'jr_hanwa_line';
const JR_KANSAI_AIR    = 'auto_関西空港線_西日本旅客鉄道';

const NANKAI_HONSEN    = 'auto_南海本線_南海電気鉄道';
const NANKAI_AIR       = 'auto_空港線_南海電気鉄道';
const NANKAI_KOYA      = 'auto_高野線_南海電気鉄道';
const NANKAI_SENBOKU   = 'auto_泉北線_南海電気鉄道';

// pairs: [a, b, 接続駅, 備考]
const pairs = [
  // G1 阪急-堺筋線-千里線-嵐山
  [HANKYU_KYOTO, OSAKA_SAKAISUJI, '天神橋筋六丁目', '阪急京都/堺筋線直通'],
  [HANKYU_SENRI, OSAKA_SAKAISUJI, '天神橋筋六丁目', '阪急千里/堺筋線直通'],
  [HANKYU_KYOTO, HANKYU_SENRI, '淡路', '阪急内 (京都〜千里 直通運転)'],
  [HANKYU_KYOTO, HANKYU_ARASHI, '桂', '阪急内 (嵐山支線への直通)'],

  // G2 阪急神戸-神戸高速 (阪急内)
  [HANKYU_KOBE, HANKYU_KOSOKU, '新開地', '阪急内 (神戸線新開地延長)'],

  // G3 阪神なんば-近鉄
  [HANSHIN_NAMBA, KINTETSU_NARA, '大阪難波', '近鉄奈良/阪神なんば直通 (奈良-神戸間 快速急行)'],
  [HANSHIN_NAMBA, HANSHIN_HONSEN, '尼崎', '阪神内 (本線/なんば線直通)'],

  // G4 阪神-神戸高速 (阪神内)
  [HANSHIN_HONSEN, HANSHIN_KOSOKU, '元町', '阪神内 (本線新開地延長)'],

  // G5 神戸高速線同士 (新開地で 3 社接続)
  [HANKYU_KOSOKU, HANSHIN_KOSOKU, '新開地', '阪急/阪神 神戸高速線'],
  [HANKYU_KOSOKU, SHINTETSU_KOSOKU, '新開地', '阪急/神鉄 神戸高速線'],
  [HANSHIN_KOSOKU, SHINTETSU_KOSOKU, '新開地', '阪神/神鉄 神戸高速線'],

  // G6 京阪内部
  [KEIHAN_HONSEN, KEIHAN_OTO, '三条/出町柳', '京阪内 (本線/鴨東線 一体運行)'],
  [KEIHAN_HONSEN, KEIHAN_NAKA, '天満橋', '京阪内 (本線/中之島線)'],
  [KEIHAN_HONSEN, KEIHAN_KATANO, '枚方市', '京阪内 (本線/交野線)'],
  [KEIHAN_HONSEN, KEIHAN_UJI, '中書島', '京阪内 (本線/宇治線)'],

  // G7 京阪京津-京都市営東西
  [KEIHAN_KEISHIN, KYOTO_TOZAI, '御陵', '京阪/京都市営 直通'],

  // G8 近鉄内部
  [KINTETSU_NARA, KINTETSU_NAMBA, '大阪上本町', '近鉄内 (奈良/難波線 一体運行)'],
  [KINTETSU_NARA, KINTETSU_KYOTO, '大和西大寺', '近鉄内 (奈良/京都線)'],
  [KINTETSU_KYOTO, KINTETSU_KASHIH, '大和西大寺', '近鉄内 (京都/橿原線)'],
  [KINTETSU_OSAKA, KINTETSU_NAMBA, '大阪上本町', '近鉄内 (大阪線/難波線)'],
  [KINTETSU_MINAMI, KINTETSU_YOSHINO, '橿原神宮前', '近鉄内 (南大阪/吉野線)'],

  // G9 大阪メトロ中央-近鉄けいはんな (s0 同士)
  [OSAKA_CHUO_S0, KINTETSU_KEIHAN_S0, '長田', '大阪メトロ/近鉄 直通'],

  // G10 御堂筋-北大阪急行 (s0)
  [OSAKA_MIDOSUJI, KITA_OSAKA_S0, '江坂', '大阪メトロ/北大阪急行 直通'],

  // G11 環状-ゆめ咲
  [OSAKA_LOOP, JR_SAKURAJIMA, '西九条', 'USJ 直通 (環状線/桜島線)'],

  // G12 関西空港
  [JR_HANWA, JR_KANSAI_AIR, '日根野', '関空快速・はるか'],
  [NANKAI_HONSEN, NANKAI_AIR, '泉佐野', 'ラピート・空港急行'],

  // G13 南海高野-泉北
  [NANKAI_KOYA, NANKAI_SENBOKU, '中百舌鳥', '泉北高速直通'],
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
