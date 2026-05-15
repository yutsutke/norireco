// ══════════════════════════════════════
// Canvas renderer（原則1：DOM排除）
// ══════════════════════════════════════
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
function getLinePriority(line){
  return LINE_PRIORITY[line.id] || (line.group==='新幹線'?1:
    line.group==='首都圏'?3:
    line.group==='関西'?3:
    line.group==='東海・中部'?3:3);
}

// ズームレベルで表示する優先度の閾値
function getVisiblePriority(zoom){
  // 大手私鉄まで(priority 3)は常時表示。地方鉄道(priority 4)はズーム10+で
  if(zoom>=10) return 4;
  return 3;
}

// 全Leafletレイヤーを管理
let allLayers=[];
let dotLayerRef=null;
let labelLayerRef=null;

// 描画済み統合駅追跡 (重複マーカー抑制)
const drawnMergedStations = new Map();

function drawLines(){
  // ラベルマスターリストもリセット (新規ロード時)
  window._allLabels = [];

  drawnMergedStations.clear();
  // レイヤーグループ初期化（まだなければ）
  if (!dotLayerRef) {
    dotLayerRef = L.layerGroup();
    labelLayerRef = L.layerGroup();
  } else {
    // 既存のレイヤーをクリア (再描画時のDOM残留防止)
    labelLayerRef.clearLayers();
    dotLayerRef.clearLayers();
  }

  // Phase 2: 営業系統ベース描画 (構築前は何も描かない)
  if (SERVICE_LINES && SERVICE_LINES.length > 0) {
    for (const sl of SERVICE_LINES) drawServiceLineBase(sl);
    drawStationsLayer();
    // ✨ 獲得可能キャラがある駅にインジケータ配置
    drawObtainableIndicators();
  }

  // LOD初期適用
  updateLOD();
}

// ── LOD：ズームに応じて路線・ドット・ラベルを表示/非表示 ──
function updateLOD() {
  if (!map) return;
  const z = map.getZoom();
  const maxP = getVisiblePriority(z);

  // 路線ラインのLOD
  allLayers.forEach(layer => {
    const p = layer._norireco_priority || 3;
    if (p <= maxP) {
      if (!map.hasLayer(layer)) map.addLayer(layer);
    } else {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    }
  });

  // ドット/パイ: 重要度ティアによる段階表示 (地域別閾値)
  // パイチャート (_station_use_pie_threshold=true) は getPieMinTier で別管理
  // → 低ズームでは多系統駅も単色ドットで表示、ズームが上がるとパイに昇格
  if (dotLayerRef) {
    const dotMinMetro = getDotMinTier(z, true);
    const dotMinRural = getDotMinTier(z, false);
    const pieMinMetro = getPieMinTier(z, true);
    const pieMinRural = getPieMinTier(z, false);
    const minOfAll = Math.min(dotMinMetro, dotMinRural, pieMinMetro, pieMinRural);
    if (minOfAll <= 6) {
      if (!map.hasLayer(dotLayerRef)) map.addLayer(dotLayerRef);
      dotLayerRef.eachLayer(d => {
        const t = d._station_tier || 1;
        const m = d._station_isMetro;
        let minTier;
        if (d._station_use_pie_threshold) {
          minTier = m ? pieMinMetro : pieMinRural;
        } else {
          minTier = m ? dotMinMetro : dotMinRural;
        }
        setStationVisible(d, t >= minTier);
      });
    } else {
      if (map.hasLayer(dotLayerRef)) map.removeLayer(dotLayerRef);
    }
  }

  // ラベル: addLayer/removeLayer でDOM要素自体を出し入れ (ズーム/パン高速化)
  if (labelLayerRef) {
    const labelMinMetro = getLabelMinTier(z, true);
    const labelMinRural = getLabelMinTier(z, false);
    const minOfBoth = Math.min(labelMinMetro, labelMinRural);
    if (minOfBoth <= 6) {
      if (!map.hasLayer(labelLayerRef)) map.addLayer(labelLayerRef);
      // ★最重要最適化: ビューポート内のラベルだけDOMに追加
      // 画面外の駅名は読み込まない → 巨大エリアでも軽量
      const _bounds = map.getBounds().pad(0.15);  // 少しゆとり持つ
      (window._allLabels || []).forEach(l => {
        const t = l._station_tier || 1;
        const m = l._station_isMetro;
        const minTier = m ? labelMinMetro : labelMinRural;
        const passesT = t >= minTier;
        const passesView = passesT && _bounds.contains(l.getLatLng());
        const inLayer = labelLayerRef.hasLayer(l);
        if (passesView && !inLayer) {
          labelLayerRef.addLayer(l);
        } else if (!passesView && inLayer) {
          labelLayerRef.removeLayer(l);
        }
      });
    } else {
      if (map.hasLayer(labelLayerRef)) map.removeLayer(labelLayerRef);
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

// 三大都市圏の判定 (lat/lon境界ボックス)
// 都心の超密集エリアのみ (山手線~周辺の半径10km程度)
function isMetroArea(lat, lon) {
  // 首都圏 (山手線+周辺): 約25km × 25km
  if (lat >= 35.60 && lat <= 35.78 && lon >= 139.60 && lon <= 139.85) return true;
  // 大阪都心 (大阪・京都・神戸の中心部のみ): 約20km × 20km
  if (lat >= 34.65 && lat <= 34.78 && lon >= 135.40 && lon <= 135.60) return true;
  // 名古屋都心 (名古屋駅周辺のみ): 約15km × 15km
  if (lat >= 35.13 && lat <= 35.22 && lon >= 136.85 && lon <= 136.97) return true;
  return false;
}

// 駅の重要度ティア
// tier 6: 三大都市中心 (東京・名古屋・新大阪)
// tier 5: 7+路線(新宿・渋谷・池袋・横浜・大宮等の超ターミナル)
// tier 4: 4-6路線(主要ターミナル)
// tier 3: 3路線(中規模junction)
// tier 2: 2路線(小junction)
// tier 1: 1路線(通常駅)
function stationTier(nLines, name) {
  if (name && SUPER_MEGA_STATIONS.has(name)) return 6;
  if (nLines >= 7) return 5;
  if (nLines >= 4) return 4;
  if (nLines >= 3) return 3;
  if (nLines >= 2) return 2;
  return 1;
}
// ズームレベルで表示するべき最小ティア (ドット用 = 小さい単色マーカー)
// ドットは早めに出して鉄道網の形を見せる、パイチャートは後出し (getPieMinTier)
function getDotMinTier(z, isMetro) {
  // スマホ + 首都圏は駅マーカーを1ズーム遅く出す (密集対策)
  if (IS_MOBILE && isMetro) z -= 1;
  // スマホ + 地方は駅マーカーを2ズーム早く出す (疎なので早めに見たい)
  if (IS_MOBILE && !isMetro) z += 2;
  if (IS_MOBILE) {
    if (isMetro) {
      if (z >= 13) return 1;  // 全駅
      if (z >= 12) return 2;
      if (z >= 11) return 3;
      if (z >= 10) return 4;
      if (z >= 8)  return 5;
      if (z >= 5)  return 6;
      return 99;
    } else {
      if (z >= 11) return 1;
      if (z >= 10) return 2;
      if (z >= 9)  return 3;
      if (z >= 8)  return 4;
      if (z >= 7)  return 5;
      if (z >= 5)  return 6;
      return 99;
    }
  } else {
    // PC/iPad
    if (isMetro) {
      if (z >= 11) return 1;  // 全駅 (ドットだけなら早めに)
      if (z >= 10) return 2;
      if (z >= 9)  return 3;
      if (z >= 8)  return 4;
      if (z >= 7)  return 5;
      if (z >= 5)  return 6;
      return 99;
    } else {
      // 地方
      if (z >= 10) return 1;  // 全駅
      if (z >= 9)  return 2;
      if (z >= 8)  return 3;
      if (z >= 7)  return 4;
      if (z >= 6)  return 5;
      if (z >= 5)  return 6;
      return 99;
    }
  }
}

// ズームレベルで「パイチャート」を表示する最小ティア (ドットより厳しめ)
// 多系統駅は低ズームでは単色ドットで、ズーム上がるとパイに昇格
function getPieMinTier(z, isMetro) {
  if (IS_MOBILE && isMetro) z -= 1;
  if (IS_MOBILE) {
    if (isMetro) {
      if (z >= 14) return 2;
      if (z >= 13) return 3;
      if (z >= 12) return 4;
      if (z >= 11) return 5;
      if (z >= 9)  return 6;
      return 99;
    } else {
      if (z >= 13) return 2;
      if (z >= 12) return 3;
      if (z >= 11) return 4;
      if (z >= 10) return 5;
      if (z >= 8)  return 6;
      return 99;
    }
  } else {
    if (isMetro) {
      if (z >= 13) return 2;  // 全多系統駅をパイで
      if (z >= 12) return 3;
      if (z >= 11) return 4;  // Image 5 = z=11 で tier 4+
      if (z >= 10) return 5;  // 超ターミナルのみ
      if (z >= 9)  return 6;
      return 99;
    } else {
      if (z >= 12) return 2;
      if (z >= 11) return 3;
      if (z >= 10) return 4;
      if (z >= 9)  return 5;
      if (z >= 8)  return 6;
      return 99;
    }
  }
}
// ラベル用 (さらに厳しめ)
function getLabelMinTier(z, isMetro) {
  // 一貫して「駅マーカーが先、駅名は後」
  //   首都圏:        ドットから1ズーム後に駅名
  //   PC/iPad+地方:  ドットから1ズーム後に駅名
  //   スマホ+地方:   ドットから2ズーム後に駅名
  let offset;
  if (isMetro) {
    offset = -1;  // 首都圏: ドット +1ズームで駅名
  } else {
    offset = IS_MOBILE ? -2 : -1;  // 地方: PC+1ズーム / スマホ+2ズームで駅名
  }
  return getDotMinTier(z + offset, isMetro);
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
// 1: 新幹線（最低ズームから表示） 2: 首都圏JR/メトロ 3: その他都市系（常時表示）
// 4: 北海道/東北/四国/中国山陰/九州（zoom>=10 で表示）
function getServiceLinePriority(sl) {
  if (!sl) return 3;
  if (sl.group === '新幹線') return 1;
  if (sl.group === '首都圏・JR' || sl.group === '東京メトロ・都営') return 2;
  if (sl.group === '北海道' || sl.group === '東北' || sl.group === '四国' ||
      sl.group === '中国・山陰' || sl.group === '九州') return 4;
  return 3;
}

// 営業系統 1本のポリライン描画
function drawServiceLineBase(sl) {
  const canvas = CANVAS;
  if (!sl || !sl.stations || sl.stations.length < 2) return;
  const latlngs = sl.stations.map(s => [s.lat, s.lon]);
  if (sl.circular) latlngs.push(latlngs[0]);
  const rs = slRiddenSt[sl.id];
  const isRidden = rs && rs.size > 0;
  const priority = getServiceLinePriority(sl);
  const stats = slStats(sl);
  const z = map ? map.getZoom() : 5;
  const visible = priority <= getVisiblePriority(z);

  if (!isRidden) {
    // 未乗車: 色付き点線 + 薄いグロー
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
    if (visible) { glow.addTo(map); main.addTo(map); }
    if (!IS_MOBILE) {
      const hover = L.polyline(latlngs, {color:'transparent',weight:10,opacity:0,lineCap:'round'})
        .bindTooltip(
          `<b style="color:${sl.color}">${sl.name}</b><br><span style="color:rgba(140,160,179,.7)">${sl.operator || ''} · 未乗車 ${stats.t}駅</span>`,
          {className:'norireco-tooltip',sticky:true,offset:[10,0]}
        );
      hover._norireco_priority = priority;
      allLayers.push(hover);
      if (visible) hover.addTo(map);
    }
  } else {
    // 乗車済み (一部含む): 背景の薄い点線 + 乗車区間のグロー
    const bg = L.polyline(latlngs, {
      color: sl.color, weight: 2.2, opacity: 0.35,
      dashArray: '6 5', lineCap: 'round', renderer: canvas
    });
    bg._norireco_priority = priority;
    allLayers.push(bg);
    if (visible) bg.addTo(map);
    if (!IS_MOBILE) {
      const hover = L.polyline(latlngs, {color:'transparent',weight:10,opacity:0,lineCap:'round'})
        .bindTooltip(
          `<b style="color:${sl.color}">${sl.name}</b><br><span style="color:rgba(140,160,179,.8)">${sl.operator || ''}</span><br><span style="color:rgba(242,169,0,.9);font-family:monospace">${stats.r}/${stats.t}駅 — ${stats.pct}%</span>`,
          {className:'norireco-tooltip',sticky:true,offset:[12,0]}
        );
      hover._norireco_priority = priority;
      allLayers.push(hover);
      if (visible) hover.addTo(map);
    }
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
  if (visible) { glow.addTo(map); main.addTo(map); hi.addTo(map); }
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
  if (visible) { glow.addTo(map); main.addTo(map); hi.addTo(map); }
}

// 全駅マーカー+ラベル (mergedStationsベース) — 1パスで描画
function drawStationsLayer() {
  if (!dotLayerRef || !labelLayerRef) return;
  if (!MERGED_STATIONS || !MERGED_STATIONS.length) return;
  if (!SERVICE_LINES || !SERVICE_LINES.length) return;

  for (const ms of MERGED_STATIONS) {
    const nLines = (ms.lines || []).length;
    if (nLines === 0) continue;
    const tier = stationTier(nLines, ms.name);
    const isMetro = isMetroArea(ms.lat, ms.lon);
    const mScale = nLines === 1 ? 1.0 : Math.min(2.5, 1.0 + Math.log2(nLines) * 0.5);

    // 乗車判定: ms.lines のどれかでこの駅が ridden か
    let ridden = false;
    for (const slId of ms.lines) {
      const rs = slRiddenSt[slId];
      if (rs && rs.has(ms.name)) { ridden = true; break; }
    }

    // 訪問回数 → 個人化レベル (1-4回:Lv1, 5-9:Lv2, 10-49:Lv3, 50+:Lv4)
    const visits = slVisitCount[ms.name] || 0;
    const level = getStationLevel(visits);

    // 駅キャラ (訪問1回以上の駅にのみ表示)
    const character = (visits > 0) ? getStationCharacter(ms.name) : null;

    // 色 (営業系統色を優先)
    const colors = ms.colors && ms.colors.length === nLines ? ms.colors : ms.lines.map(lid => {
      const sl = SERVICE_LINES.find(x => x.id === lid);
      return sl ? sl.color : '#888';
    });

    // 描画方針:
    //   - 多系統駅 (nLines>1) 平常: 単色ドット + パイ (パイは別閾値で遅出し)
    //   - 多系統駅 × (Lv2+ または キャラ): 装飾 divIcon 1個 (パイ閾値で出す)
    //   - 単系統駅 × Lv0/1: 単色 circleMarker
    //   - 単系統駅 × (Lv2+ または キャラ): 装飾 divIcon
    let dot;
    let extraDot = null;  // 多系統駅にだけ作る「低ズーム用の単色ドット」
    if (nLines > 1) {
      if (level >= 2 || character) {
        // 装飾 divIcon (Lv2+/キャラ付き) — これだけパイ閾値で出す
        const baseSize = ridden ? 14 : 11;
        const levelBonus = level >= 4 ? 4 : level >= 3 ? 2 : level >= 2 ? 1 : 0;
        const size = Math.round((baseSize + levelBonus) * mScale);
        dot = L.marker([ms.lat, ms.lon], {
          icon: makePieIcon(colors, size, ridden, level, character),
          opacity: ridden ? 1.0 : 0.7,
          interactive: true
        });
        dot._station_use_pie_threshold = true;
      } else {
        // 平常多系統駅: ベースの単色ドット (常に出る) + パイ (パイ閾値で遅出し)
        const c = colors[0] || '#888';
        const radius = (ridden ? 5.5 : 4) * Math.min(1.4, mScale);
        dot = L.circleMarker([ms.lat, ms.lon], {
          radius,
          fillColor: c,
          color: ridden ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
          weight: ridden ? 1.4 : 1.2,
          fillOpacity: ridden ? 1.0 : 0.85,
          renderer: CANVAS,
        });
        // パイマーカー (上に重ねる、パイ閾値で出す)
        const baseSize = ridden ? 14 : 11;
        const size = Math.round(baseSize * mScale);
        extraDot = L.marker([ms.lat, ms.lon], {
          icon: makePieIcon(colors, size, ridden, 0, null),
          opacity: ridden ? 1.0 : 0.7,
          interactive: true
        });
        extraDot._station_use_pie_threshold = true;
      }
    } else if (level >= 2 || character) {
      const baseSize = ridden ? 12 : 9;
      const levelBonus = level >= 4 ? 4 : level >= 3 ? 2 : level >= 2 ? 1 : 0;
      const size = Math.round((baseSize + levelBonus) * mScale);
      dot = L.marker([ms.lat, ms.lon], {
        icon: makePieIcon(colors, size, ridden, level, character),
        opacity: ridden ? 1.0 : 0.7,
        interactive: true
      });
    } else {
      const c = colors[0] || '#888';
      const radius = (ridden ? 6 : 4) * mScale;
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
      const sl = SERVICE_LINES.find(x => x.id === lid);
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
    dot._station_isMetro = isMetro;
    attachStationDotClickV2(dot, ms);
    dotLayerRef.addLayer(dot);

    // パイチャート用の追加マーカー (多系統駅 × 平常時のみ)
    if (extraDot) {
      extraDot.bindTooltip(tooltipHtml, {className:'norireco-tooltip', offset:[8,0]});
      extraDot._station_tier = tier;
      extraDot._station_isMetro = isMetro;
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
    label._station_isMetro = isMetro;
    (window._allLabels = window._allLabels || []).push(label);
  }
}

function attachStationDotClickV2(dot, ms) {
  dot.on('click', (e) => {
    if (recordMode) {
      onRecordStationClick({name: ms.name, lat: ms.lat, lon: ms.lon});
      L.DomEvent.stopPropagation(e);
    } else if (memoMode) {
      // memo モード用に代表系統を pseudoLine として渡す
      const firstSlId = ms.lines && ms.lines[0];
      const sl = firstSlId ? SERVICE_LINES.find(x => x.id === firstSlId) : null;
      const pseudoLine = sl
        ? {id: sl.id, name: sl.name, color: sl.color, region: sl.operator || ''}
        : {id: 'unknown', name: ms.name, color: '#888', region: ''};
      const pseudoSt = {n: ms.name, lat: ms.lat, lon: ms.lon};
      clickInfo = {line: pseudoLine, station: pseudoSt, lat: (+ms.lat).toFixed(5), lon: (+ms.lon).toFixed(5)};
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
function openCharModal(ms, character) {
  const modal = document.getElementById('char-modal');
  const body = document.getElementById('char-modal-body');
  if (!body || !modal) return;
  const visits = slVisitCount[ms.name] || 0;
  const level = getStationLevel(visits);
  const levelStars = level >= 4 ? '⭐⭐⭐' : level >= 3 ? '⭐⭐' : level >= 2 ? '⭐' : level >= 1 ? '✓' : '';
  // 乗り入れ系統リスト
  const slRows = (ms.lines || []).map((lid, idx) => {
    const sl = SERVICE_LINES.find(x => x.id === lid);
    const color = (ms.colors && ms.colors[idx]) || (sl && sl.color) || '#888';
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
      const allChars = stationCharMap.get(ms.name) || [];
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
function closeCharModal() {
  document.getElementById('char-modal')?.classList.remove('open');
}
// ESC で閉じる
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const m = document.getElementById('char-modal');
    if (m && m.classList.contains('open')) closeCharModal();
  }
});

function updateOverlays(){
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
  if (SERVICE_LINES && SERVICE_LINES.length > 0) {
    const ridSls = SERVICE_LINES
      .map(sl => ({sl, stats: slStats(sl)}))
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
function toggleMemoMode(){
  memoMode=!memoMode;
  const btn=document.getElementById('memo-btn');
  btn.classList.toggle('on',memoMode);
  if(map)map.getContainer().style.cursor=memoMode?'crosshair':'';
}

function openMemo(){
  document.getElementById('m-title').textContent=`📸 ${clickInfo.station?.n||''} のメモ`;
  document.getElementById('m-sub').textContent=`${clickInfo.line?.name||''}  ·  ${clickInfo.lat}, ${clickInfo.lon}`;
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
  const payload={_type:'駅メモ_記録',
    タイトル:`${clickInfo.station?.n||''}（${clickInfo.line?.name||''}）`,
    駅名:type!=='路線'?clickInfo.station?.n||'':'',路線名:clickInfo.line?.name||'',
    種別:type,コメント:comment,写真URL:photo,
    日付:localDateStr(),
    気分:mood,タグ:tags.join('、'),緯度:clickInfo.lat||'',経度:clickInfo.lon||''};
  const text=`📸駅メモデータ\n${JSON.stringify(payload)}\nこのデータをNotionの「駅メモ」DBに保存してください。`;
  const ta=document.getElementById('out-ta');
  ta.value=text;document.getElementById('out-area').style.display='block';ta.select();
}
