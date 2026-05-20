// ══════════════════════════════════════
// Canvas renderer（原則1：DOM排除）
//
// v223 ES Modules stage 3: 03-characters の 2 関数を import 化。
// tryGrantByGPS は HTML onclick で呼ばれるため window 経由のまま (import 不要)。
// v225: 04-gps-location の 4 関数を import 化。
// v225: 07-record-mode.onRecordStationClick を import 化。
// ══════════════════════════════════════
import { isCharacterOwned, isCharacterAvailable } from './03-characters.js';
import {
  drawObtainableIndicators,
  getObtainableCharactersAt,
  getStationCharacter,
  getStationCharacterChoice,
} from './04-gps-location.js';
import { onRecordStationClick } from './07-record-mode.js';
import { gStats } from './05-supabase-data.js';

const CANVAS = L.canvas({ padding: 0.5 });

// 路線の優先度（LOD用）
// 1=最高優先（新幹線・主要幹線）ズーム5〜
// 2=高優先（主要私鉄・地下鉄幹線）ズーム7〜
// 3=中優先（在来線・主要私鉄支線）ズーム8〜
// 4=低優先（ローカル線・路面電車）ズーム9〜
const LINE_PRIORITY = {
  // 新幹線
  'tokaido-shinkansen':1,'tohoku':1,'hokuriku':1,'nishi-kyushu':1,
  // JR幹線
  'tohoku-main':1,'joban':1,'chuo':1,'keihin':1,'tokaido-nagoya':1,
  'kagoshima-main':1,'kagoshima-south':1,'nippo':1,'sanin':1,
  'hakodate-main':1,'soya':1,'nemuro':1,
  // 首都圏主要私鉄
  'yamanote':1,'saikyo':1,'shonan':1,'takasaki':1,'utsunomiya':1,
  'sobu':1,'keiyo':1,'nambu':1,'yokosuka':1,
  'tokyu-toyoko':2,'keikyu':2,'odakyu':2,'keio':2,'seibu':2,
  'tobu-skytree':2,'tobu-tojo':2,'tobu-nikko':2,'tobu-isesaki':2,
  'keisei':2,
  // 地下鉄幹線
  'tokyometro-ginza':2,'tokyometro-marunouchi':2,'tokyometro-hibiya':2,
  'tokyometro-tozai':2,'tokyometro-chiyoda':2,'tokyometro-hanzomon':2,
  'tokyometro-namboku':2,'tokyometro-fukutoshin':2,
  'toei-oedo':2,'toei-shinjuku':2,'toei-asakusa':2,'toei-mita':2,
  'osaka-midosuji':2,'keihan':2,'hanshin':2,'hankyu-kobe':2,
  // JR地方幹線
  'musashino':2,'hachiko':2,'senseki':2,'ou-main':2,'rikuu-east':2,
  'chitose':2,'yosan':2,'tosa':2,'kintetsu':2,'kintetsu-kyoto':2,
  'kintetsu-nagoya':2,'jr-osaka-kobe':2,'jr-kyoto':2,
};
// v218 ES Modules パイロット (案 β) stage 2: `<script type="module">` 化。
// 末尾で 12 個の window bridge を追加 (drawLines / updateLOD / updateOverlays /
// toggleMemoMode / openMemo / closeMemo / selChip / togTag / genMemo / openCharModal /
// closeCharModal / drawServiceLineBase)。

function getLinePriority(line){
  return LINE_PRIORITY[line.id] || (line.group==='新幹線'?1:
    line.group==='首都圏'?3:
    line.group==='関西'?3:
    line.group==='東海・中部'?3:3);
}

// ズームレベルで表示する優先度の閾値
// priority 0 = 新幹線 (一番早く出す)、1-4 = それ以外
//   z>=5: 全路線
//   z=4 : 新幹線のみ
//   z<4 : 何も出さない
function getVisiblePriority(zoom){
  if (zoom >= 5) return 4;
  if (zoom >= 4) return 0;
  return -1;
}

// 全Leafletレイヤーを管理
// v221: 04/05/06/07 から bare 参照 + 06 が再代入するため module-local `let` ではなく window 直置き。
// module strict mode では宣言なし bare 代入が ReferenceError になるため、書込側 (06/08) は
// `window.X = ...` で揃え、読込側 (04/05/07) は bare のまま global scope chain 経由で解決させる。
window.allLayers = [];
window.dotLayerRef = null;
window.labelLayerRef = null;

// 描画済み統合駅追跡 (重複マーカー抑制)
const drawnMergedStations = new Map();

export function drawLines(){
  // ラベルマスターリストもリセット (新規ロード時)
  window._allLabels = [];

  drawnMergedStations.clear();
  // レイヤーグループ初期化（まだなければ）
  if (!dotLayerRef) {
    window.dotLayerRef = L.layerGroup();
    window.labelLayerRef = L.layerGroup();
  } else {
    // 既存のレイヤーをクリア (再描画時のDOM残留防止)
    labelLayerRef.clearLayers();
    dotLayerRef.clearLayers();
  }

  // Phase 2: 営業系統ベース描画 (構築前は何も描かない)
  if (NORIRECO.data.SERVICE_LINES && NORIRECO.data.SERVICE_LINES.length > 0) {
    for (const sl of NORIRECO.data.SERVICE_LINES) drawServiceLineBase(sl);
    drawStationsLayer();
    // ✨ 獲得可能キャラがある駅にインジケータ配置
    drawObtainableIndicators();
  }

  // LOD初期適用
  updateLOD();
}

// ── LOD：ズームに応じて路線・ドット・ラベルを表示/非表示 ──
export function updateLOD() {
  if (!NORIRECO.map.instance) return;
  const z = NORIRECO.map.instance.getZoom();
  const maxP = getVisiblePriority(z);

  // 路線ラインのLOD
  allLayers.forEach(layer => {
    const p = layer._norireco_priority || 3;
    if (p <= maxP) {
      if (!NORIRECO.map.instance.hasLayer(layer)) NORIRECO.map.instance.addLayer(layer);
    } else {
      if (NORIRECO.map.instance.hasLayer(layer)) NORIRECO.map.instance.removeLayer(layer);
    }
  });

  // ドット/パイ: 重要度ティアによる段階表示。
  // v230: 旧 isMetro bbox 分岐を撤去 — tier (baseTier + isolationBonus) が密集度を内包。
  // v232: パイチャート専用閾値 (getPieMinTier) を撤去 — ドットとパイの出現タイミングを揃え、
  //       多系統駅では単色ドットの上にパイが同タイミングで重なる (パイが視覚的にドットを覆う)。
  if (dotLayerRef) {
    const dotMin = getDotMinTier(z);
    if (dotMin <= 7) { // v241: REGION_CENTER (tier 7) も含めて判定
      if (!NORIRECO.map.instance.hasLayer(dotLayerRef)) NORIRECO.map.instance.addLayer(dotLayerRef);
      dotLayerRef.eachLayer(d => {
        const t = d._station_tier || 1;
        setStationVisible(d, t >= dotMin);
      });
    } else {
      if (NORIRECO.map.instance.hasLayer(dotLayerRef)) NORIRECO.map.instance.removeLayer(dotLayerRef);
    }
  }

  // ラベル: addLayer/removeLayer でDOM要素自体を出し入れ (ズーム/パン高速化)
  if (labelLayerRef) {
    const labelMin = getLabelMinTier(z);
    if (labelMin <= 7) { // v241: REGION_CENTER (tier 7) も含めて判定
      if (!NORIRECO.map.instance.hasLayer(labelLayerRef)) NORIRECO.map.instance.addLayer(labelLayerRef);
      // ★最重要最適化: ビューポート内のラベルだけDOMに追加
      // 画面外の駅名は読み込まない → 巨大エリアでも軽量
      const _bounds = NORIRECO.map.instance.getBounds().pad(0.15);  // 少しゆとり持つ
      (window._allLabels || []).forEach(l => {
        const t = l._station_tier || 1;
        const passesT = t >= labelMin;
        const passesView = passesT && _bounds.contains(l.getLatLng());
        const inLayer = labelLayerRef.hasLayer(l);
        if (passesView && !inLayer) {
          labelLayerRef.addLayer(l);
        } else if (!passesView && inLayer) {
          labelLayerRef.removeLayer(l);
        }
      });
    } else {
      if (NORIRECO.map.instance.hasLayer(labelLayerRef)) NORIRECO.map.instance.removeLayer(labelLayerRef);
    }
  }
}

// モバイル端末判定 (ズーム/パン軽量化用)
// IS_MOBILE: iPhone/Android スマホのみ (iPad は画面が大きいので PC 扱い)
// IS_TOUCH: タッチデバイス全般 (iPad含む) - ズームボタン非表示等に使う
const IS_MOBILE = (() => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPhone, iPod, Android-mobile はモバイル
  if (/iPhone|iPod/i.test(ua)) return true;
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return true;
  // iPad は除外 (PC扱い)
  if (typeof window !== 'undefined' && window.innerWidth < 768) return true;
  return false;
})();
const IS_TOUCH = (() => {
  // UAベース判定: モバイル/iPadのみ true。PCのタッチパネル誤検知を防ぐ
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod|Android|Mobile/i.test(ua)) return true;
  // iPadOS 13+ は UA に Macintosh と出る → maxTouchPoints で判別
  if (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua)) return true;
  return false;
})();
console.log('[乗レコ] IS_MOBILE:', IS_MOBILE, '/ IS_TOUCH:', IS_TOUCH);

// 三大都市圏の中心駅 (最も低ズームから表示)
const SUPER_MEGA_STATIONS = new Set([
  // 三大都市圏
  '東京', '名古屋', '新大阪',
  // 政令指定都市の中心駅
  '札幌', '仙台', '博多', '広島',
]);

// v241: 9 地域の最主要駅 (1〜2 駅) — 日本全国ビュー (z >= 4) から常時表示。
// v242: 同名駅の誤マッチ対策で Set → Map(name → {lat, lon}) に変更。
//   例: 高松駅は香川県 (JR四国) と石川県 (北陸鉄道) に存在し、名前だけでは
//   北陸の高松駅まで中央駅扱いされてしまうため、緯度経度の近接判定で曖昧性解消。
// 各地域の「ここを起点に旅程が組まれる」中央駅を選定。SUPER_MEGA 7 駅では
// 関東(新宿)・北陸(金沢)・近畿(大阪)・四国(高松) が抜けていたため tier 7 として補完。
const REGION_CENTER_STATIONS = new Map([
  ['札幌',   { lat: 43.07, lon: 141.35 }],  // 北海道
  ['仙台',   { lat: 38.26, lon: 140.88 }],  // 東北
  ['東京',   { lat: 35.68, lon: 139.77 }],  // 関東
  ['新宿',   { lat: 35.69, lon: 139.70 }],  // 関東
  ['金沢',   { lat: 36.58, lon: 136.65 }],  // 北陸
  ['名古屋', { lat: 35.17, lon: 136.88 }],  // 東海
  ['大阪',   { lat: 34.70, lon: 135.50 }],  // 近畿
  ['広島',   { lat: 34.40, lon: 132.48 }],  // 中国
  ['高松',   { lat: 34.35, lon: 134.05 }],  // 四国 — JR高松駅 (北陸鉄道高松駅と区別)
  ['博多',   { lat: 33.59, lon: 130.42 }],  // 九州
]);

// 同名駅の誤マッチを排除: 約 0.5度 (≈ 50km) 以内に canonical 座標があれば中央駅
function isRegionCenter(name, lat, lon) {
  const c = REGION_CENTER_STATIONS.get(name);
  if (!c || lat == null || lon == null) return false;
  return Math.abs(lat - c.lat) < 0.5 && Math.abs(lon - c.lon) < 0.5;
}

// v230: 旧 isMetroArea(lat, lon) (首都圏・大阪・名古屋の bbox 判定) は撤去。
// 駅ランク (baseTier + isolationBonus from nearest_km) が密集度を自動で
// 扱うため、bbox による地域分岐は不要 (山手線駅は nearest_km < 0.5km で
// bonus=-4 → tier -2 〜 -3 となり自然に高ズーム遅出しになる)。

// 駅の重要度ティア
// v231: 都内の中間ターミナル多発によるクラッタを抑えるため、
// 7+/4-6/3 系統の tier を圧縮。SUPER_MEGA とそれ以外の多系統駅で 2 段階差を確保。
// v241: REGION_CENTER (9 地域の最主要駅 10 駅) を tier 7 として追加 — z >= 4 から表示
// tier 7: 9 地域中央駅 (REGION_CENTER) — z >= 4 から常時表示、密集 penalty 回避
// tier 6: 三大都市中心 (東京・名古屋・新大阪) + 政令市中心 (札幌・仙台・博多・広島)
// tier 4: 7+路線(新宿・渋谷・池袋・横浜・大宮等の超ターミナル)
// tier 2: 2-6路線 (中規模 junction / 小 junction を統合)
// tier 1: 1路線(通常駅)
function stationTier(nLines, name, lat, lon) {
  if (name && isRegionCenter(name, lat, lon)) return 7;
  if (name && SUPER_MEGA_STATIONS.has(name)) return 6;
  if (nLines >= 7) return 4;
  if (nLines >= 2) return 2;
  return 1;
}
// ズームレベルで表示するべき最小ティア (ドット用 = 小さい単色マーカー)
// 各ズーム = 1 tier。負の値は「超密集駅は更にズームしないと出ない」用
// effectiveTier の取りうる範囲: -4 (<0.5km, baseTier 1) 〜 6 (兆ターミナル)
// v230: 旧 isMetro 分岐 (4 テーブル) を 1 本に統合。密集度は tier 計算に
// 既に織り込まれている (nearest_km < 0.5km → bonus -4) ため地域分岐は不要。
// 旧 metro 側のテーブルをベース採用 (厳しめ) — 田舎駅は isolation bonus で
// tier 自体が早出しされるため、閾値表は密集対応の保守的値に揃える。
function getDotMinTier(z) {
  if (IS_MOBILE) z -= 1;
  if (z >= 16) return -4;
  if (z >= 15) return -3;
  if (z >= 14) return -2;
  if (z >= 13) return -1;
  if (z >= 12) return 0;
  if (z >= 11) return 1;
  if (z >= 10) return 2;
  if (z >= 9)  return 3;
  if (z >= 8)  return 4;
  if (z >= 7)  return 5;
  if (z >= 5)  return 6;
  if (z >= 4)  return 7; // v241: 日本全国ビューでは REGION_CENTER (10 駅) のみ
  return 99;
}

// v232: getPieMinTier 撤去 — ドットとパイの出現タイミングを揃えるため、
// 多系統駅のパイマーカーも getDotMinTier を共有する。

// ラベル用 (さらに厳しめ): ドットから 1 ズーム遅らせて駅名を出す。
// 「駅マーカーが先、駅名は後」の原則。
function getLabelMinTier(z) {
  return getDotMinTier(z - 1);
}
// マーカー(circleMarker or divIcon)の表示/非表示切り替え
function setStationVisible(m, visible) {
  if (!m) return;
  if (m.setOpacity) {
    m.setOpacity(visible ? (m._baseOpacity || 1) : 0);
  } else if (m.setStyle) {
    if (visible) {
      m.setStyle({opacity: m._baseStrokeOpacity || 1, fillOpacity: m._baseFillOpacity || 1});
    } else {
      m.setStyle({opacity: 0, fillOpacity: 0});
    }
  }
}

// 統合駅(複数路線)用パイチャートSVGアイコン生成
// 訪問回数→個人化レベル (0=未訪問, 1=1-4, 2=5-9, 3=10-49, 4=50+)
function getStationLevel(visits) {
  if (!visits || visits <= 0) return 0;
  if (visits >= 50) return 4;
  if (visits >= 10) return 3;
  if (visits >= 5) return 2;
  return 1;
}

// キャラ駅: キャラを中心に、外側に細いリングで路線色を表示
function makeCharacterIcon(character, lineColors, ridden, level) {
  const n = lineColors.length;
  // キャラサイズ (レベルで段階拡大)
  const charSize = level >= 4 ? 32 : level >= 3 ? 30 : level >= 2 ? 28 : 26;
  const halfChar = charSize / 2;
  const bgR = halfChar + 2.5;          // キャラ周りの白パディング
  const ringInnerR = bgR + 0.4;
  const ringOuterR = ringInnerR + 3.5; // 路線色リング厚 3.5px
  const haloMargin = level >= 4 ? 12 : level >= 3 ? 5 : 2;
  const total = (ringOuterR + haloMargin) * 2;
  const cx = total / 2;
  const cy = total / 2;

  // === 外側ハロー / Lv3+ アクセント ===
  let svgOuter = '';
  if (level >= 4) {
    svgOuter += `<circle class="lv4-halo" cx="${cx}" cy="${cy}" r="${ringOuterR + 9}" fill="rgba(242,169,0,0.28)" stroke="rgba(242,169,0,0.75)" stroke-width="1.5"/>`;
    svgOuter += `<circle cx="${cx}" cy="${cy}" r="${ringOuterR + 3}" fill="none" stroke="#f2a900" stroke-width="2.4"/>`;
  } else if (level >= 3) {
    svgOuter += `<circle cx="${cx}" cy="${cy}" r="${ringOuterR + 2}" fill="none" stroke="#f2a900" stroke-width="2.0"/>`;
  }

  // === 路線色リング (donut 風) ===
  let svgRing = '';
  if (n === 1) {
    // 単線: 単色リング
    const midR = (ringInnerR + ringOuterR) / 2;
    svgRing = `<circle cx="${cx}" cy="${cy}" r="${midR}" fill="none" stroke="${lineColors[0]}" stroke-width="${ringOuterR - ringInnerR}"/>`;
  } else {
    // 多線: パイ形状の donut セグメント
    for (let i = 0; i < n; i++) {
      const a1 = (i / n) * 2 * Math.PI - Math.PI/2;
      const a2 = ((i+1) / n) * 2 * Math.PI - Math.PI/2;
      const rO = ringOuterR;
      const rI = ringInnerR;
      const x1o = cx + rO * Math.cos(a1);
      const y1o = cy + rO * Math.sin(a1);
      const x2o = cx + rO * Math.cos(a2);
      const y2o = cy + rO * Math.sin(a2);
      const x1i = cx + rI * Math.cos(a2);
      const y1i = cy + rI * Math.sin(a2);
      const x2i = cx + rI * Math.cos(a1);
      const y2i = cy + rI * Math.sin(a1);
      const largeArc = (a2 - a1) > Math.PI ? 1 : 0;
      svgRing += `<path d="M ${x1o} ${y1o} A ${rO} ${rO} 0 ${largeArc} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${rI} ${rI} 0 ${largeArc} 0 ${x2i} ${y2i} Z" fill="${lineColors[i]}"/>`;
    }
  }

  // === 白背景 (キャラを引き立てる) ===
  const svgBg = `<circle cx="${cx}" cy="${cy}" r="${bgR}" fill="rgba(255,255,255,0.97)"/>`;

  // === キャラクター本体 (中央配置) ===
  const charX = cx - halfChar;
  const charY = cy - halfChar;
  const charOpacity = ridden ? 1.0 : 0.65;
  const svgChar = `<svg x="${charX}" y="${charY}" width="${charSize}" height="${charSize}" viewBox="0 0 64 64" opacity="${charOpacity}">${character.innerSvg}</svg>`;

  const cssClass = 'merged-pie-marker' + (level >= 4 ? ' lv4' : '');
  return L.divIcon({
    className: cssClass,
    html: `<svg width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 0 3px rgba(0,0,0,0.6));">
      ${svgOuter}
      ${svgRing}
      ${svgBg}
      ${svgChar}
    </svg>`,
    iconSize: [total, total],
    iconAnchor: [cx, cy],
  });
}

function makePieIcon(lineColors, sizePx, ridden, level = 0, character = null) {
  // キャラがあるならキャラ中心の描画に切替
  if (character && character.innerSvg) {
    return makeCharacterIcon(character, lineColors, ridden, level);
  }
  const n = lineColors.length;
  const r = sizePx / 2;
  // 高レベル: 外側マージンでハロー/外輪 + 右上にバッジ
  const halo = level >= 4 ? 12 : (level >= 3 ? 7 : 0);
  const outer = sizePx + halo * 2;
  const cx = halo + r;
  const cy = halo + r;

  // === 外側装飾 ===
  let svgOuter = '';
  if (level >= 4) {
    // Lv4: パルスする大きな金色ハロー (.lv4-halo)
    svgOuter += `<circle class="lv4-halo" cx="${cx}" cy="${cy}" r="${r + 10}" fill="rgba(242,169,0,0.28)" stroke="rgba(242,169,0,0.75)" stroke-width="1.5"/>`;
    // 固体の太い金色外輪
    svgOuter += `<circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="#f2a900" stroke-width="2.4"/>`;
  } else if (level >= 3) {
    // Lv3: はっきりした金色外輪 (太め)
    svgOuter += `<circle cx="${cx}" cy="${cy}" r="${r + 3.5}" fill="none" stroke="#f2a900" stroke-width="2.2"/>`;
  }

  // === 内側 (パイ or 単色) ===
  let svgInner = '';
  if (n === 1) {
    svgInner = `<circle cx="${cx}" cy="${cy}" r="${r-1}" fill="${lineColors[0]}"/>`;
  } else {
    for (let i = 0; i < n; i++) {
      const a1 = (i / n) * 2 * Math.PI - Math.PI/2;
      const a2 = ((i+1) / n) * 2 * Math.PI - Math.PI/2;
      const rr = r - 1;
      const x1 = cx + rr * Math.cos(a1);
      const y1 = cy + rr * Math.sin(a1);
      const x2 = cx + rr * Math.cos(a2);
      const y2 = cy + rr * Math.sin(a2);
      const largeArc = (a2 - a1) > Math.PI ? 1 : 0;
      svgInner += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${rr} ${rr} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${lineColors[i]}"/>`;
    }
  }

  // === 内側リング (level 2+ で金色) ===
  let ringColor, ringWidth;
  if (level >= 2) {
    ringColor = ridden ? 'rgba(242,169,0,0.95)' : 'rgba(242,169,0,0.65)';
    ringWidth = 1.7;
  } else {
    ringColor = ridden ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)';
    ringWidth = ridden ? 1.4 : 1.0;
  }

  const cssClass = 'merged-pie-marker' + (level >= 4 ? ' lv4' : '');
  return L.divIcon({
    className: cssClass,
    html: `<svg width="${outer}" height="${outer}" viewBox="0 0 ${outer} ${outer}" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 0 3px rgba(0,0,0,0.6));">
      ${svgOuter}
      ${svgInner}
      <circle cx="${cx}" cy="${cy}" r="${r-0.5}" fill="none" stroke="${ringColor}" stroke-width="${ringWidth}"/>
    </svg>`,
    iconSize: [outer, outer],
    iconAnchor: [cx, cy],
  });
}

// ═══════════════════════════════════════════════════════════════
// Phase 2: 営業系統ベース描画
// ═══════════════════════════════════════════════════════════════

// 営業系統の優先度 (LOD用)
// 0: 新幹線 (一番早く出す。z=4 から表示)
// 1: 首都圏JR/メトロ 主要幹線
// 2: 主要 (デフォルト都市系)
// 3-4: 地方ローカル
function getServiceLinePriority(sl) {
  if (!sl) return 3;
  if (sl.group === '新幹線') return 0;
  if (sl.group === '首都圏・JR' || sl.group === '東京メトロ・都営') return 2;
  if (sl.group === '北海道' || sl.group === '東北' || sl.group === '四国' ||
      sl.group === '中国・山陰' || sl.group === '九州') return 4;
  return 3;
}

// 営業系統 1本のポリライン描画
// 表示モード (window._mapDisplayMode):
//   'both'     — 通常 (未乗車=点線 / 乗車済=点線+solid run)
//   'ridden'   — 乗車区間のみ表示 (純未乗車系統は skip、partial の bg dotted は隠す)
//   'unridden' — 未乗車区間のみ表示 (完全乗車系統は skip、partial の solid run は隠す)
function drawServiceLineBase(sl) {
  const canvas = CANVAS;
  if (!sl || !sl.stations || sl.stations.length < 2) return;
  const latlngs = sl.stations.map(s => [s.lat, s.lon]);
  if (sl.circular) latlngs.push(latlngs[0]);
  const rs = slRiddenSt[sl.id];
  const isRidden = rs && rs.size > 0;
  const isFullyRidden = isRidden && rs.size >= sl.stations.length;
  const priority = getServiceLinePriority(sl);
  const stats = NORIRECO.serviceLines.stats(sl);
  const z = NORIRECO.map.instance ? NORIRECO.map.instance.getZoom() : 5;
  const visible = priority <= getVisiblePriority(z);
  const mode = window._mapDisplayMode || 'both';

  // モードによる早期 skip
  if (mode === 'ridden' && !isRidden) return;          // 完全未乗車は隠す
  if (mode === 'unridden' && isFullyRidden) return;    // 完全乗車は隠す

  if (!isRidden) {
    // 未乗車系統: 色付き点線 + 薄いグロー (mode='unridden' or 'both')
    const glow = L.polyline(latlngs, {
      color: sl.color, weight: 5, opacity: 0.07,
      lineCap: 'round', renderer: canvas
    });
    const main = L.polyline(latlngs, {
      color: sl.color, weight: 2.3, opacity: 0.55,
      dashArray: '6 5', lineCap: 'round', renderer: canvas
    });
    glow._norireco_priority = priority;
    main._norireco_priority = priority;
    allLayers.push(glow, main);
    if (visible) { glow.addTo(NORIRECO.map.instance); main.addTo(NORIRECO.map.instance); }
    if (!IS_MOBILE) {
      const hover = L.polyline(latlngs, {color:'transparent',weight:10,opacity:0,lineCap:'round'})
        .bindTooltip(
          `<b style="color:${sl.color}">${sl.name}</b><br><span style="color:rgba(140,160,179,.7)">${sl.operator || ''} · 未乗車 ${stats.t}駅</span>`,
          {className:'norireco-tooltip',sticky:true,offset:[10,0]}
        );
      hover._norireco_priority = priority;
      allLayers.push(hover);
      if (visible) hover.addTo(NORIRECO.map.instance);
    }
  } else {
    // 乗車済み (一部 or 完全): 背景点線 (未乗区間) + solid 乗車区間
    // mode='ridden' なら背景点線を抑制、mode='unridden' なら solid 乗車区間を抑制
    if (mode !== 'ridden') {
      const bg = L.polyline(latlngs, {
        color: sl.color, weight: 2.2, opacity: 0.35,
        dashArray: '6 5', lineCap: 'round', renderer: canvas
      });
      bg._norireco_priority = priority;
      allLayers.push(bg);
      if (visible) bg.addTo(NORIRECO.map.instance);
    }
    if (!IS_MOBILE) {
      const hover = L.polyline(latlngs, {color:'transparent',weight:10,opacity:0,lineCap:'round'})
        .bindTooltip(
          `<b style="color:${sl.color}">${sl.name}</b><br><span style="color:rgba(140,160,179,.8)">${sl.operator || ''}</span><br><span style="color:rgba(242,169,0,.9);font-family:monospace">${stats.r}/${stats.t}駅 — ${stats.pct}%</span>`,
          {className:'norireco-tooltip',sticky:true,offset:[12,0]}
        );
      hover._norireco_priority = priority;
      allLayers.push(hover);
      if (visible) hover.addTo(NORIRECO.map.instance);
    }
    if (mode !== 'unridden') {
      // 乗車済み連続ランを区間ごとにグロー描画
      let ss = null;
      for (let i = 0; i < sl.stations.length; i++) {
        const ir = rs.has(sl.stations[i].name);
        if (ir && ss === null) ss = i;
        if (!ir && ss !== null) {
          drawSlRiddenRun(sl, ss, i - 1, canvas, priority, visible);
          ss = null;
        }
        if (i === sl.stations.length - 1 && ss !== null) {
          drawSlRiddenRun(sl, ss, i, canvas, priority, visible);
        }
      }
      if (sl.circular && sl.stations.length >= 2 &&
          rs.has(sl.stations[0].name) && rs.has(sl.stations[sl.stations.length-1].name)) {
        drawSlRiddenWrap(sl, canvas, priority, visible);
      }
    }
  }
}

function drawSlRiddenRun(sl, fromIdx, toIdx, canvas, priority, visible) {
  if (toIdx - fromIdx < 1) return;
  const latlngs = sl.stations.slice(fromIdx, toIdx + 1).map(s => [s.lat, s.lon]);
  const glow = L.polyline(latlngs, {color:sl.color,weight:10,opacity:0.12,lineCap:'round',lineJoin:'round',renderer:canvas});
  const main = L.polyline(latlngs, {color:sl.color,weight:3.5,opacity:0.95,lineCap:'round',lineJoin:'round',renderer:canvas});
  const hi = L.polyline(latlngs, {color:'rgba(255,255,255,0.4)',weight:0.8,lineCap:'round',renderer:canvas});
  glow._norireco_priority = priority;
  main._norireco_priority = priority;
  hi._norireco_priority = priority;
  allLayers.push(glow, main, hi);
  if (visible) { glow.addTo(NORIRECO.map.instance); main.addTo(NORIRECO.map.instance); hi.addTo(NORIRECO.map.instance); }
}

function drawSlRiddenWrap(sl, canvas, priority, visible) {
  const n = sl.stations.length;
  const latlngs = [[sl.stations[n-1].lat, sl.stations[n-1].lon],
                   [sl.stations[0].lat, sl.stations[0].lon]];
  const glow = L.polyline(latlngs, {color:sl.color,weight:10,opacity:0.12,lineCap:'round',renderer:canvas});
  const main = L.polyline(latlngs, {color:sl.color,weight:3.5,opacity:0.95,lineCap:'round',renderer:canvas});
  const hi = L.polyline(latlngs, {color:'rgba(255,255,255,0.4)',weight:0.8,lineCap:'round',renderer:canvas});
  glow._norireco_priority = priority;
  main._norireco_priority = priority;
  hi._norireco_priority = priority;
  allLayers.push(glow, main, hi);
  if (visible) { glow.addTo(NORIRECO.map.instance); main.addTo(NORIRECO.map.instance); hi.addTo(NORIRECO.map.instance); }
}

// 全駅マーカー+ラベル (mergedStationsベース) — 1パスで描画
function drawStationsLayer() {
  if (!dotLayerRef || !labelLayerRef) return;
  if (!NORIRECO.data.MERGED_STATIONS || !NORIRECO.data.MERGED_STATIONS.length) return;
  if (!NORIRECO.data.SERVICE_LINES || !NORIRECO.data.SERVICE_LINES.length) return;

  // v244: SERVICE_LINES id → 現在の color の Map を 1 度だけ構築。
  //   駅ループ内で毎回 .find する代わりに O(1) ルックアップ。
  //   ユーザーが系統色を override しても直近の sl.color が反映される。
  const _slColorById = new Map();
  for (const sl of NORIRECO.data.SERVICE_LINES) _slColorById.set(sl.id, sl.color);

  for (const ms of NORIRECO.data.MERGED_STATIONS) {
    const nLines = (ms.lines || []).length;
    if (nLines === 0) continue;
    const baseTier = stationTier(nLines, ms.name, ms.lat, ms.lon);
    // nearest_km (隣接駅までの距離) で bonus を決定
    //   遠い (孤立): プラス boost で早出し
    //   近い (密集): マイナス boost で更にズームしないと出ない
    //   各ズーム = 1 tier 対応なので、bucket = 1 zoom 遅延
    const km = ms.nearest_km;
    let isolationBonus = 0;
    if (km != null) {
      if (km >= 10)       isolationBonus = 2;
      else if (km >= 5)   isolationBonus = 1;
      else if (km >= 2)   isolationBonus = 0;
      else if (km >= 1.2) isolationBonus = -1;
      else if (km >= 0.8) isolationBonus = -2;
      else if (km >= 0.5) isolationBonus = -3;
      else                isolationBonus = -4;
    }
    // v241: REGION_CENTER (baseTier=7) は密集 penalty を回避して常に tier 7 のまま。
    //   東京/新宿/大阪等は超密集で isolationBonus=-4 が乗るが、日本全国ビューでの
    //   表示を担保するため bypass。他の駅は従来通り Math.min(6, ...) でキャップ。
    const tier = (baseTier === 7) ? 7 : Math.min(6, baseTier + isolationBonus);
    const mScale = nLines === 1 ? 1.0 : Math.min(2.5, 1.0 + Math.log2(nLines) * 0.5);

    // 乗車判定: ms.lines のどれかでこの駅が ridden か
    let ridden = false;
    for (const slId of ms.lines) {
      const rs = slRiddenSt[slId];
      if (rs && rs.has(ms.name)) { ridden = true; break; }
    }

    // マップ表示モードに応じて駅もフィルタ
    //   'ridden'   : 乗車駅のみ表示
    //   'unridden' : 未乗車駅のみ表示
    const _mapMode = window._mapDisplayMode || 'both';
    if (_mapMode === 'ridden' && !ridden) continue;
    if (_mapMode === 'unridden' && ridden) continue;

    // v186/v187: stop_type ('alighted' | 'boarded' | 'passed' | 未訪問は 'unvisited' 扱い)
    //  - サイズ倍率: alighted=1.25 / boarded=1.0 / passed=0.8 / unvisited=1.0
    //  - フィルタ: 該当 stype が false ならその駅を skip (未訪問駅も含む)
    const stype = ridden ? (slStopType[ms.name] || 'boarded') : 'unvisited';
    const stf = window._stopTypeFilter || { alighted: true, boarded: true, passed: true, unvisited: true };
    if (stf[stype] === false) continue;
    const stypeMul = stype === 'alighted' ? 1.25 : stype === 'passed' ? 0.8 : 1.0;

    // 訪問回数 → 個人化レベル (1-4回:Lv1, 5-9:Lv2, 10-49:Lv3, 50+:Lv4)
    const visits = slVisitCount[ms.name] || 0;
    const level = getStationLevel(visits);

    // 駅キャラ (訪問1回以上の駅にのみ表示)
    const character = (visits > 0) ? getStationCharacter(ms.name) : null;

    // 色: SERVICE_LINES から動的に取得 (v243 で系統色のユーザーカスタマイズに対応した際、
    //      merged_stations.json の事前計算キャッシュ ms.colors が override に追従しなかったため、
    //      v244 で ms.colors は読まず常に SERVICE_LINES.color を見るように変更。
    //      _slColorById は drawStationsLayer 冒頭で 1 度だけ構築する Map<id, color>。
    const colors = ms.lines.map(lid => _slColorById.get(lid) || '#888');

    // 描画方針:
    //   - 多系統駅 (nLines>1) 平常: 単色ドット + パイ (パイは別閾値で遅出し)
    //   - 多系統駅 × (Lv2+ または キャラ): 装飾 divIcon 1個 (パイ閾値で出す)
    //   - 単系統駅 × Lv0/1: 単色 circleMarker
    //   - 単系統駅 × (Lv2+ または キャラ): 装飾 divIcon
    let dot;
    let extraDot = null;  // 多系統駅にだけ作る「低ズーム用の単色ドット」
    if (nLines > 1) {
      if (level >= 2 || character) {
        // 装飾 divIcon (Lv2+/キャラ付き)
        const baseSize = ridden ? 14 : 11;
        const levelBonus = level >= 4 ? 4 : level >= 3 ? 2 : level >= 2 ? 1 : 0;
        const size = Math.round((baseSize + levelBonus) * mScale * stypeMul);
        dot = L.marker([ms.lat, ms.lon], {
          icon: makePieIcon(colors, size, ridden, level, character),
          opacity: ridden ? 1.0 : 0.7,
          interactive: true
        });
      } else {
        // 平常多系統駅: ベースの単色ドット + パイマーカーを重ねる (v232 で出現タイミング統一)
        const c = colors[0] || '#888';
        const radius = (ridden ? 5.5 : 4) * Math.min(1.4, mScale) * stypeMul;
        dot = L.circleMarker([ms.lat, ms.lon], {
          radius,
          fillColor: c,
          color: ridden ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
          weight: ridden ? 1.4 : 1.2,
          fillOpacity: ridden ? 1.0 : 0.85,
          renderer: CANVAS,
        });
        // パイマーカー (上に重ねる、ドットと同タイミングで出現)
        const baseSize = ridden ? 14 : 11;
        const size = Math.round(baseSize * mScale * stypeMul);
        extraDot = L.marker([ms.lat, ms.lon], {
          icon: makePieIcon(colors, size, ridden, 0, null),
          opacity: ridden ? 1.0 : 0.7,
          interactive: true
        });
      }
    } else if (level >= 2 || character) {
      const baseSize = ridden ? 12 : 9;
      const levelBonus = level >= 4 ? 4 : level >= 3 ? 2 : level >= 2 ? 1 : 0;
      const size = Math.round((baseSize + levelBonus) * mScale * stypeMul);
      dot = L.marker([ms.lat, ms.lon], {
        icon: makePieIcon(colors, size, ridden, level, character),
        opacity: ridden ? 1.0 : 0.7,
        interactive: true
      });
    } else {
      const c = colors[0] || '#888';
      const radius = (ridden ? 6 : 4) * mScale * stypeMul;
      dot = L.circleMarker([ms.lat, ms.lon], {
        radius,
        fillColor: c,
        color: ridden ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
        weight: ridden ? 1.4 : 1.2,
        fillOpacity: ridden ? 1.0 : 0.85,
        renderer: CANVAS,
      });
    }

    // tooltip
    const slLinesHtml = ms.lines.map((lid, idx) => {
      const sl = NORIRECO.data.SERVICE_LINES.find(x => x.id === lid);
      const c = colors[idx] || (sl && sl.color) || '#888';
      const nm = sl ? sl.name : lid;
      const rs = slRiddenSt[lid];
      const mark = (rs && rs.has(ms.name)) ? '✓' : '';
      return `<span style="color:${c}">●</span> ${nm} ${mark}`;
    }).join('<br>');
    const linesText = nLines > 1
      ? `<br><span style="color:rgba(242,169,0,.85);font-size:10px">🔀 乗り入れ ${nLines}系統</span><br><span style="font-size:10px;color:rgba(255,255,255,.85);line-height:1.5">${slLinesHtml}</span>`
      : `<br><span style="font-size:10px;color:rgba(140,160,179,.85)">${slLinesHtml}</span>`;
    const riddenTag = ridden ? '<span style="color:#5fd17a;font-size:10px;margin-left:6px">✓ 乗車</span>' : '';
    // 訪問回数バッジ
    const levelStars = level >= 4 ? '⭐⭐⭐' : level >= 3 ? '⭐⭐' : level >= 2 ? '⭐' : '';
    const visitsTag = visits > 0
      ? `<span style="color:rgba(242,169,0,.95);font-size:10px;margin-left:6px;font-family:'DM Mono',monospace">${levelStars} ${visits}回訪問</span>`
      : '';
    // 駅キャラ情報
    const charTag = character
      ? `<br><span style="color:rgba(255,200,100,.95);font-size:11px;font-weight:700">🎭 ${character.meta.name}</span>` +
        (character.meta.subtitle ? `<span style="color:rgba(140,160,179,.7);font-size:9px;margin-left:6px">${character.meta.subtitle}</span>` : '')
      : '';
    const tooltipHtml = `<b>${ms.name}</b>${riddenTag}${visitsTag}${charTag}${linesText}`;
    dot.bindTooltip(tooltipHtml, {className:'norireco-tooltip', offset:[8,0]});

    dot._station_tier = tier;
    attachStationDotClickV2(dot, ms);
    dotLayerRef.addLayer(dot);

    // パイチャート用の追加マーカー (多系統駅 × 平常時のみ)
    if (extraDot) {
      extraDot.bindTooltip(tooltipHtml, {className:'norireco-tooltip', offset:[8,0]});
      extraDot._station_tier = tier;
      attachStationDotClickV2(extraDot, ms);
      dotLayerRef.addLayer(extraDot);
    }

    // ラベル
    const labelHtml = ridden
      ? `<div style="font-family:'Zen Kaku Gothic New',sans-serif;font-size:10px;font-weight:700;color:#fff;text-shadow:0 0 4px rgba(0,0,0,1),0 0 8px rgba(0,0,0,1);white-space:nowrap;pointer-events:none;padding-left:7px;margin-top:-6px">${ms.name}</div>`
      : `<div style="font-family:'Zen Kaku Gothic New',sans-serif;font-size:9px;font-weight:400;color:rgba(255,255,255,0.85);text-shadow:0 0 4px rgba(0,0,0,1);white-space:nowrap;pointer-events:none;padding-left:6px;margin-top:-5px">${ms.name}</div>`;
    const label = L.marker([ms.lat, ms.lon], {
      icon: L.divIcon({className:'', html:labelHtml, iconSize:[0,0], iconAnchor:[0,0]}),
      interactive: false,
    });
    label._station_tier = tier;
    (window._allLabels = window._allLabels || []).push(label);
  }
}

function attachStationDotClickV2(dot, ms) {
  dot.on('click', (e) => {
    if (NORIRECO.record.mode) {
      onRecordStationClick({name: ms.name, lat: ms.lat, lon: ms.lon});
      L.DomEvent.stopPropagation(e);
    } else if (NORIRECO.map.memoMode) {
      // memo モード用に代表系統を pseudoLine として渡す
      const firstSlId = ms.lines && ms.lines[0];
      const sl = firstSlId ? NORIRECO.data.SERVICE_LINES.find(x => x.id === firstSlId) : null;
      const pseudoLine = sl
        ? {id: sl.id, name: sl.name, color: sl.color, region: sl.operator || ''}
        : {id: 'unknown', name: ms.name, color: '#888', region: ''};
      const pseudoSt = {n: ms.name, lat: ms.lat, lon: ms.lon};
      NORIRECO.map.clickInfo = {line: pseudoLine, station: pseudoSt, lat: (+ms.lat).toFixed(5), lon: (+ms.lon).toFixed(5)};
      openMemo();
      L.DomEvent.stopPropagation(e);
    } else {
      // 通常モード: キャラ駅ならキャラ詳細モーダル
      const character = getStationCharacter(ms.name);
      if (character) {
        openCharModal(ms, character);
        L.DomEvent.stopPropagation(e);
      } else {
        // 未獲得 locked キャラがあればプレビュー表示
        const obtainable = getObtainableCharactersAt(ms.name);
        if (obtainable.length > 0) {
          openCharModal(ms, obtainable[0]);
          L.DomEvent.stopPropagation(e);
        }
      }
    }
  });
}

// レアリティバッジ HTML を返す
function renderRarityBadge(meta) {
  if (!meta) return '';
  const r = meta.rarity || 'common';
  if (r === 'limited') return `<div class="char-rarity-badge limited">🌸 期間限定</div>`;
  if (r === 'rare') return `<div class="char-rarity-badge rare">⭐ レア</div>`;
  return ''; // common は表示なし
}

// キャラ詳細モーダル
export function openCharModal(ms, character) {
  const modal = document.getElementById('char-modal');
  const body = document.getElementById('char-modal-body');
  if (!body || !modal) return;
  const visits = slVisitCount[ms.name] || 0;
  const level = getStationLevel(visits);
  const levelStars = level >= 4 ? '⭐⭐⭐' : level >= 3 ? '⭐⭐' : level >= 2 ? '⭐' : level >= 1 ? '✓' : '';
  // 乗り入れ系統リスト
  const slRows = (ms.lines || []).map((lid, idx) => {
    const sl = NORIRECO.data.SERVICE_LINES.find(x => x.id === lid);
    // v244: ms.colors の事前計算キャッシュは色 override に追従しないため SERVICE_LINES から動的に取得
    const color = (sl && sl.color) || '#888';
    const name = sl ? sl.name : lid;
    const rs = slRiddenSt[lid];
    const ridden = rs && rs.has(ms.name);
    return `<div class="char-modal-line-row">
      <span class="char-modal-line-dot" style="background:${color}"></span>
      <span class="char-modal-line-name">${name}</span>
      ${ridden ? '<span class="char-modal-line-ridden">✓ 乗車</span>' : ''}
    </div>`;
  }).join('');
  // ─ ここで獲得できるキャラを集計（モーダル冒頭の Call-to-Action 用）─
  const obtainableHere = getObtainableCharactersAt(ms.name);
  const getPromptHtml = obtainableHere.length > 0 ? `
    <div class="char-modal-get-prompt">
      <div class="char-modal-get-prompt-icon">
        <svg viewBox="0 0 64 64">${obtainableHere[0].innerSvg}</svg>
      </div>
      <div class="char-modal-get-prompt-text">
        <div class="char-modal-get-prompt-label">✨ ここで獲得できる！</div>
        <div class="char-modal-get-prompt-name">${obtainableHere.length === 1
          ? obtainableHere[0].meta.name
          : `${obtainableHere[0].meta.name} ほか ${obtainableHere.length - 1}体`}</div>
      </div>
      <button class="char-modal-get-prompt-btn" onclick="tryGrantByGPS('${obtainableHere[0].meta.id}', event)">
        📍 今ゲット
      </button>
    </div>
  ` : '';

  body.innerHTML = `
    ${getPromptHtml}
    <div class="char-modal-hero">
      <div class="char-modal-bg">
        <svg class="char-modal-svg" viewBox="0 0 64 64">${character.innerSvg}</svg>
      </div>
    </div>
    <div class="char-modal-name">${character.meta.name}</div>
    <div class="char-modal-sub">${character.meta.subtitle || ''}</div>
    <div class="char-modal-row">
      <span class="char-modal-row-lbl">📍 駅</span>
      <span class="char-modal-row-val">${ms.name}</span>
    </div>
    <div class="char-modal-row">
      <span class="char-modal-row-lbl">🚇 訪問回数</span>
      <span class="char-modal-row-val">${visits}回 ${levelStars}</span>
    </div>
    ${character.meta.description ? `<div class="char-modal-desc">${character.meta.description}</div>` : ''}
    ${slRows ? `<div class="char-modal-lines">乗り入れ系統 (${(ms.lines || []).length})</div>${slRows}` : ''}
    ${(() => {
      // キャラ選択セクション (所持済みのみ表示)
      const allChars = NORIRECO.data.stationCharMap.get(ms.name) || [];
      const ownedChars = allChars.filter(c => isCharacterOwned(c.meta.id));
      const lockedChars = allChars.filter(c => !isCharacterOwned(c.meta.id));
      let html = '';
      if (ownedChars.length >= 2) {
        const choiceId = getStationCharacterChoice(ms.name) || ownedChars[0].meta.id;
        html += `
          <div class="char-modal-section-title">🎭 キャラを切り替え (${ownedChars.length}体)</div>
          <div class="char-modal-thumbs">
            ${ownedChars.map(c => {
              const rarityBadge = renderRarityBadge(c.meta);
              return `
                <button class="char-modal-thumb ${c.meta.id === choiceId ? 'active' : ''}"
                        onclick="pickStationCharacter('${ms.name}', '${c.meta.id}')"
                        title="${c.meta.name}">
                  <svg viewBox="0 0 64 64">${c.innerSvg}</svg>
                  <div class="char-modal-thumb-name">${c.meta.name}</div>
                  ${rarityBadge}
                </button>
              `;
            }).join('')}
          </div>
        `;
      } else if (ownedChars.length === 1) {
        html += `<div class="char-modal-section-title">🎭 この駅のキャラ</div>
          <div class="char-modal-hint">所持キャラは 1 体です。${lockedChars.length > 0 ? `この駅では他に <b>${lockedChars.length}体</b> のキャラがあります（未獲得）。` : ''}</div>`;
      }
      if (lockedChars.length > 0) {
        html += `
          <div class="char-modal-section-title">🔒 未獲得キャラ (${lockedChars.length}体)</div>
          <div class="char-modal-thumbs">
            ${lockedChars.map(c => {
              const available = isCharacterAvailable(c.meta);
              const periodText = (c.meta.available_from || c.meta.available_until)
                ? `${c.meta.available_from || '〜'} 〜 ${c.meta.available_until || '〜'}`
                : '';
              const obtainAt = c.meta.obtainable_at || c.meta.station_ids || [];
              const showGpsBtn = available && obtainAt.length > 0;
              return `
                <div class="char-modal-thumb locked" title="${c.meta.name}">
                  <svg viewBox="0 0 64 64" style="opacity:.35;filter:grayscale(.7)">${c.innerSvg}</svg>
                  <div class="char-modal-thumb-name">${c.meta.name}</div>
                  ${renderRarityBadge(c.meta)}
                  ${periodText ? `<div class="char-modal-thumb-period">${available ? '🟢 開催中' : '⌛ 期間外'}<br>${periodText}</div>` : ''}
                  ${showGpsBtn ? `<button class="char-gps-btn" onclick="tryGrantByGPS('${c.meta.id}', event)">📍 今ここ！</button>` : ''}
                </div>
              `;
            }).join('')}
          </div>
          ${lockedChars.some(c => isCharacterAvailable(c.meta)) ? `<div class="char-modal-hint" style="margin-top:8px">💡 駅の GPS 範囲内 (半径 1km・テスト中) で「📍 今ここ！」をタップすると獲得できます。</div>` : ''}
        `;
      }
      return html;
    })()}
    <div class="char-modal-section-title">🎨 カスタマイズ <span class="char-modal-soon">近日対応</span></div>
    <div class="char-modal-hint">服の色変更・装束違いなどに対応予定。<br>期間限定キャラはイベント期間中に該当駅を訪問すると自動獲得 (実装予定)。</div>
  `;
  modal.classList.add('open');
}
export function closeCharModal() {
  document.getElementById('char-modal')?.classList.remove('open');
}
// ESC で閉じる
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const m = document.getElementById('char-modal');
    if (m && m.classList.contains('open')) closeCharModal();
  }
});

export function updateOverlays(){
  const gs=gStats();
  document.getElementById('h-pct').textContent=gs.pct+'%';
  document.getElementById('h-ln').textContent=gs.la;
  document.getElementById('ms-pct').textContent=gs.pct+'%';
  document.getElementById('ms-ln').textContent=gs.la+'系統';
  document.getElementById('ms-dn').textContent=gs.ld+'系統';
  const leg=document.getElementById('legend-lines');
  if (!leg) return; // 凡例パネル削除済み (v113〜)
  leg.innerHTML='';

  // 営業系統 — 乗車済みのみ、達成率降順
  if (NORIRECO.data.SERVICE_LINES && NORIRECO.data.SERVICE_LINES.length > 0) {
    const ridSls = NORIRECO.data.SERVICE_LINES
      .map(sl => ({sl, stats: NORIRECO.serviceLines.stats(sl)}))
      .filter(x => x.stats.r > 0)
      .sort((a,b) => b.stats.pct - a.stats.pct);
    if (ridSls.length > 0) {
      const hdr = document.createElement('div');
      hdr.style.cssText = 'font-size:9px;color:rgba(255,255,255,.45);margin-top:4px;letter-spacing:.05em';
      hdr.textContent = '── 営業系統 ──';
      leg.appendChild(hdr);
      ridSls.forEach(({sl, stats}) => {
        const d = document.createElement('div'); d.className='leg-row'; d.style.marginTop='3px';
        d.innerHTML = `<div class="leg-swatch" style="background:${sl.color};box-shadow:0 0 4px ${sl.color}60"></div>` +
          `<span style="font-size:10px;color:rgba(255,255,255,.75)">${sl.name}</span>` +
          `<span style="font-size:9px;color:rgba(242,169,0,.85);margin-left:6px;font-family:monospace">${stats.r}/${stats.t} ${stats.pct}%</span>`;
        leg.appendChild(d);
      });
    }
  }
}

// Memo mode
export function toggleMemoMode(){
  NORIRECO.map.memoMode=!NORIRECO.map.memoMode;
  const btn=document.getElementById('memo-btn');
  btn.classList.toggle('on',NORIRECO.map.memoMode);
  if(NORIRECO.map.instance)NORIRECO.map.instance.getContainer().style.cursor=NORIRECO.map.memoMode?'crosshair':'';
}

export function openMemo(){
  const ci = NORIRECO.map.clickInfo;
  document.getElementById('m-title').textContent=`📸 ${ci.station?.n||''} のメモ`;
  document.getElementById('m-sub').textContent=`${ci.line?.name||''}  ·  ${ci.lat}, ${ci.lon}`;
  document.getElementById('m-comment').value='';
  document.getElementById('m-photo').value='';
  document.getElementById('out-area').style.display='none';
  document.querySelectorAll('.chip').forEach(b=>{b.classList.remove('active','tag-on');});
  document.querySelector('#type-row .chip[data-v="駅"]').classList.add('active');
  document.querySelector('#mood-row .chip[data-v="良い"]').classList.add('active');
  document.getElementById('memo-modal').classList.add('open');
}
function closeMemo(){document.getElementById('memo-modal').classList.remove('open');}
function selChip(btn,rowId){document.querySelectorAll(`#${rowId} .chip`).forEach(b=>b.classList.remove('active'));btn.classList.add('active');}
function togTag(btn){btn.classList.toggle('tag-on');btn.classList.toggle('active',btn.classList.contains('tag-on'));}
function genMemo(){
  const type=document.querySelector('#type-row .chip.active')?.dataset.v||'駅';
  const mood=document.querySelector('#mood-row .chip.active')?.dataset.v||'良い';
  const tags=[...document.querySelectorAll('.chip[data-tag].tag-on')].map(b=>b.dataset.tag);
  const comment=document.getElementById('m-comment').value.trim();
  const photo=document.getElementById('m-photo').value.trim();
  const ci = NORIRECO.map.clickInfo;
  const payload={_type:'駅メモ_記録',
    タイトル:`${ci.station?.n||''}（${ci.line?.name||''}）`,
    駅名:type!=='路線'?ci.station?.n||'':'',路線名:ci.line?.name||'',
    種別:type,コメント:comment,写真URL:photo,
    日付:localDateStr(),
    気分:mood,タグ:tags.join('、'),緯度:ci.lat||'',経度:ci.lon||''};
  const text=`📸駅メモデータ\n${JSON.stringify(payload)}\nこのデータをNotionの「駅メモ」DBに保存してください。`;
  const ta=document.getElementById('out-ta');
  ta.value=text;document.getElementById('out-area').style.display='block';ta.select();
}

// v218 stage 2: classic / module 双方から bare 呼出される関数の window 公開
// v225 stage 3: drawLines / updateLOD / updateOverlays / openMemo / openCharModal を
// `export` 経由に移行。closeCharModal / toggleMemoMode は HTML onclick + JS module 両方から
// 呼ばれるので window と export の両建て。closeMemo / selChip / togTag / genMemo は HTML
// onclick のみのため window 維持。drawServiceLineBase は 08 内のみ使用、bridge 撤去。
window.toggleMemoMode = toggleMemoMode;
window.closeMemo = closeMemo;
window.selChip = selChip;
window.togTag = togTag;
window.genMemo = genMemo;
window.closeCharModal = closeCharModal;
// v220: v218 で 08 を module 化した際に bridge を貼り忘れた定数を追加公開。
// IS_TOUCH は 06-map-leaflet.js initMap が bare 参照しており、未公開だと ReferenceError で
// initMap が中断 → loadLines / drawLines chain が走らず LINES 描画停止のリグレッションが発生していた。
window.IS_TOUCH = IS_TOUCH;
window.IS_MOBILE = IS_MOBILE;
