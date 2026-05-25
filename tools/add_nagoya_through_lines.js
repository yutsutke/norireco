#!/usr/bin/env node
// v341: 名古屋エリア主要相互直通 (Phase D2)
//
// グループ:
//   G1 名鉄相互直通 (15 ペア) — 名古屋本線を中心に犬山/常滑/河和/西尾/三河/津島/尾西/竹鼻/羽島/空港 等の支線網
//   G2 名古屋市営地下鉄↔名鉄 (3 ペア) — 鶴舞線↔犬山/豊田線 + 上飯田線↔小牧線
//   G3 JR東海 (1 ペア) — 武豊線↔東海道本線 (大府で直通快速)
//
// 「直接接続している路線同士のみ」モデル踏襲 (ハブ navigable)。

const fs = require('fs');
const path = require('path');

const PATH = path.resolve(__dirname, '..', 'service_lines_master.json');
const raw = fs.readFileSync(PATH, 'utf8');
const data = JSON.parse(raw);

const lines = data.service_lines;
const lineById = new Map(lines.map(l => [l.id, l]));

// id 定数 (typo 防止)
const MEITETSU_NH    = 'auto_名古屋本線_名古屋鉄道';
const MEITETSU_INU   = 'auto_犬山線_名古屋鉄道';
const MEITETSU_TOKO  = 'auto_常滑線_名古屋鉄道';
const MEITETSU_KUKO  = 'auto_空港線_名古屋鉄道';
const MEITETSU_KOWA  = 'auto_河和線_名古屋鉄道';
const MEITETSU_CHITA = 'auto_知多新線_名古屋鉄道';
const MEITETSU_KAKA  = 'auto_各務原線_名古屋鉄道';
const MEITETSU_HIRO  = 'auto_広見線_名古屋鉄道';
const MEITETSU_NISI  = 'auto_西尾線_名古屋鉄道';
const MEITETSU_GAMA  = 'auto_蒲郡線_名古屋鉄道';
const MEITETSU_MIKA  = 'auto_三河線_名古屋鉄道';
const MEITETSU_TOYO  = 'auto_豊川線_名古屋鉄道';
const MEITETSU_TUSHI = 'auto_津島線_名古屋鉄道';
const MEITETSU_BISA  = 'auto_尾西線_名古屋鉄道';
const MEITETSU_TAKE  = 'auto_竹鼻線_名古屋鉄道';
const MEITETSU_HASI  = 'auto_羽島線_名古屋鉄道';
const MEITETSU_KOMA  = 'auto_小牧線_名古屋鉄道';
const MEITETSU_TOYD  = 'auto_豊田線_名古屋鉄道';

const NAGOYA_TSUR    = 'auto_3号線鶴舞線_名古屋市';
const NAGOYA_KAMI    = 'auto_上飯田線_名古屋市';

const JR_TAKETOYO    = 'auto_武豊線_東海旅客鉄道';
const JR_TOKAIDO_TK  = 'auto_東海道線_東海旅客鉄道';

const pairs = [
  // G1 名鉄相互直通
  [MEITETSU_NH, MEITETSU_INU, '枇杷島分岐(名鉄名古屋経由)', '名鉄内 (名古屋本線↔犬山線)'],
  [MEITETSU_NH, MEITETSU_TOKO, '神宮前', '名鉄内 (名古屋本線↔常滑線)'],
  [MEITETSU_TOKO, MEITETSU_KUKO, '常滑', '中部国際空港アクセス特急'],
  [MEITETSU_TOKO, MEITETSU_KOWA, '太田川', '名鉄内 (常滑線↔河和線)'],
  [MEITETSU_KOWA, MEITETSU_CHITA, '富貴', '名鉄内 (河和線↔知多新線)'],
  [MEITETSU_INU, MEITETSU_KAKA, '新鵜沼', '名鉄内 (犬山線↔各務原線)'],
  [MEITETSU_INU, MEITETSU_HIRO, '犬山', '名鉄内 (犬山線↔広見線)'],
  [MEITETSU_NH, MEITETSU_NISI, '新安城', '名鉄内 (名古屋本線↔西尾線)'],
  [MEITETSU_NH, MEITETSU_MIKA, '知立', '名鉄内 (名古屋本線↔三河線)'],
  [MEITETSU_NISI, MEITETSU_GAMA, '吉良吉田', '名鉄内 (西尾線↔蒲郡線)'],
  [MEITETSU_NH, MEITETSU_TOYO, '国府', '名鉄内 (名古屋本線↔豊川線)'],
  [MEITETSU_NH, MEITETSU_TUSHI, '須ヶ口', '名鉄内 (名古屋本線↔津島線)'],
  [MEITETSU_TUSHI, MEITETSU_BISA, '津島', '名鉄内 (津島線↔尾西線)'],
  [MEITETSU_NH, MEITETSU_TAKE, '笠松', '名鉄内 (名古屋本線↔竹鼻線)'],
  [MEITETSU_TAKE, MEITETSU_HASI, '江吉良', '名鉄内 (竹鼻線↔羽島線)'],

  // G2 名古屋市営地下鉄↔名鉄
  [NAGOYA_TSUR, MEITETSU_INU, '上小田井', '名古屋市営↔名鉄犬山線 直通'],
  [NAGOYA_TSUR, MEITETSU_TOYD, '赤池', '名古屋市営↔名鉄豊田線 直通'],
  [NAGOYA_KAMI, MEITETSU_KOMA, '上飯田', '名古屋市営↔名鉄小牧線 直通'],

  // G3 JR東海
  [JR_TAKETOYO, JR_TOKAIDO_TK, '大府', '直通快速・区間快速'],
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
