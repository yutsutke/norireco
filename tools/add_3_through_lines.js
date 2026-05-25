#!/usr/bin/env node
// v334: through_lines broken refs 修正 + 3 手動キュレーション系統追加
//   - jr_ome_line (青梅線): 立川〜奥多摩, 25 駅
//   - jr_yamatoji_line (大和路線): JR難波〜加茂, 22 駅
//   - jr_hanwa_line (阪和線): 天王寺〜和歌山, 35 駅
//   - 既存 3 件の表記揺れ修正:
//       jr_ueno_tokyo_line: jr_joban_line → jr_joban_medium
//       jr_kyoto_line:      biwako_line   → jr_biwako_line
//       jr_kobe_line:       sanyo_honsen  → jr_sanyo_main

const fs = require('fs');
const path = require('path');

const PATH = path.resolve(__dirname, '..', 'service_lines_master.json');
const raw = fs.readFileSync(PATH, 'utf8');
const data = JSON.parse(raw);

const lines = data.service_lines;
const lineById = new Map(lines.map(l => [l.id, l]));

function mkStations(names) {
  return names.map((nm, i) => ({ order: i + 1, name: nm, n02_match: true }));
}

const omeStations = ["立川","西立川","東中神","中神","昭島","拝島","牛浜","福生","羽村","小作","河辺","東青梅","青梅","宮ノ平","日向和田","石神前","二俣尾","軍畑","沢井","御嶽","川井","古里","鳩ノ巣","白丸","奥多摩"];
const yamatojiStations = ["JR難波","今宮","新今宮","天王寺","東部市場前","平野","加美","久宝寺","八尾","志紀","柏原","高井田","河内堅上","三郷","王寺","法隆寺","大和小泉","郡山","奈良","平城山","木津","加茂"];
const hanwaStations = ["天王寺","美章園","南田辺","鶴ヶ丘","長居","我孫子町","杉本町","浅香","堺市","三国ヶ丘","百舌鳥","上野芝","津久野","鳳","富木","北信太","信太山","和泉府中","久米田","下松","東岸和田","東貝塚","和泉橋本","東佐野","熊取","日根野","長滝","新家","和泉砂川","和泉鳥取","山中渓","紀伊","六十谷","紀伊中ノ島","和歌山"];

const newLines = [
  {
    id: "jr_ome_line",
    name: "青梅線",
    name_kana: "おうめせん",
    operator: "JR東日本",
    operator_id: "jr_east",
    color: "#F15A22",
    official_line: "青梅線",
    alias: [],
    through_lines: ["jr_chuo_rapid"],
    is_circular: false,
    parent_id: null,
    branch_from: null,
    branch_to: null,
    stations: mkStations(omeStations),
  },
  {
    id: "jr_yamatoji_line",
    name: "大和路線",
    name_kana: "やまとじせん",
    operator: "JR西日本",
    operator_id: "jr_west",
    color: "#58B947",
    official_line: "関西本線",
    alias: ["関西本線(JR難波〜加茂)"],
    through_lines: ["osaka_loop_line"],
    is_circular: false,
    parent_id: null,
    branch_from: null,
    branch_to: null,
    stations: mkStations(yamatojiStations),
  },
  {
    id: "jr_hanwa_line",
    name: "阪和線",
    name_kana: "はんわせん",
    operator: "JR西日本",
    operator_id: "jr_west",
    color: "#EA5520",
    official_line: "阪和線",
    alias: [],
    through_lines: ["osaka_loop_line"],
    is_circular: false,
    parent_id: null,
    branch_from: null,
    branch_to: null,
    stations: mkStations(hanwaStations),
  },
];

for (const nl of newLines) {
  if (lineById.has(nl.id)) {
    console.error(`!! duplicate id: ${nl.id} — already in service_lines_master.json. abort.`);
    process.exit(1);
  }
  lines.push(nl);
  lineById.set(nl.id, nl);
  console.log(`+ added: ${nl.id} (${nl.name}, ${nl.stations.length} stations)`);
}

const renames = [
  { lineId: "jr_ueno_tokyo_line", from: "jr_joban_line",  to: "jr_joban_medium" },
  { lineId: "jr_kyoto_line",      from: "biwako_line",     to: "jr_biwako_line"  },
  { lineId: "jr_kobe_line",       from: "sanyo_honsen",    to: "jr_sanyo_main"   },
];

for (const r of renames) {
  const l = lineById.get(r.lineId);
  if (!l) { console.error(`!! missing line: ${r.lineId}`); process.exit(1); }
  const idx = (l.through_lines || []).indexOf(r.from);
  if (idx === -1) { console.error(`!! ${r.lineId}.through_lines does not contain ${r.from}`); process.exit(1); }
  l.through_lines[idx] = r.to;
  console.log(`~ renamed: ${r.lineId}.through_lines: ${r.from} -> ${r.to}`);
}

data.updated_at = new Date().toISOString().slice(0, 10);

const ids = new Set(lines.map(l => l.id));
let broken = 0;
for (const l of lines) {
  for (const ref of (l.through_lines || [])) {
    if (!ids.has(ref)) {
      console.error(`!! broken ref still: ${l.id} -> ${ref}`);
      broken++;
    }
  }
}
if (broken > 0) { console.error(`!! ${broken} broken refs remain. abort write.`); process.exit(1); }

fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
console.log(`\nwrote ${PATH}`);
console.log(`total service_lines: ${lines.length}`);
console.log(`through_lines broken refs: ${broken}`);
