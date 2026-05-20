# 乗レコ - 電車旅 更新履歴詳細

各セッションごとの実装ログ・経緯・失敗教訓を時系列で残す詳細メモ。
「いま何がどうなっているか」のスナップショットは Notion §0、次の着手項目は `TODO.md`、各セッションで具体的に何を実装してどこで詰まったかはこのファイルを参照。

## 役割と使い分け

| ドキュメント | 内容 | 更新タイミング |
|---|---|---|
| Notion §0 全体像 | 現在地マップ (SW バージョン・領域別ステータス・直近フェーズ) | セッション末に変化があった部分だけ |
| `TODO.md` | 次の着手項目 (🔥/🟡/🟢/🔧 で分類) | 着手・完了の都度 |
| `CHANGELOG.md` (本ファイル) | 現行 Phase 3.8 後半 (§75〜, v226 以降) のセッション詳細・失敗教訓・コード変更の経緯 | 各セッション末に新セクション追記 |
| [`CHANGELOG_PHASE3.8-modules.md`](CHANGELOG_PHASE3.8-modules.md) | Phase 3.8 中盤 (§38〜§74, v189〜v225, コード分割 + ES Modules 化) | アーカイブ (2026-05-20 分割) |
| [`CHANGELOG_PHASE3.8-early.md`](CHANGELOG_PHASE3.8-early.md) | Phase 3.8 前半 (§22〜§37, v173〜v188, データ補修・期間フィルタ・記録 UX) | アーカイブ (2026-05-20 分割) |
| [`CHANGELOG_PHASE1-3.7.md`](CHANGELOG_PHASE1-3.7.md) | Phase 1〜3.7 (§1〜§21, v60〜v157) | アーカイブ (2026-05-20 分割) |

## 分割ポリシー

ファイルが長くなり扱いづらくなったら（目安: **1500 行超**、または Phase が一区切りついたタイミング）、過去フェーズを別ファイルに切り出す。

分割履歴:
- 2026-05-20 分割 (1回目): §1〜§21 (Phase 1〜3.7, v60〜v157) を [`CHANGELOG_PHASE1-3.7.md`](CHANGELOG_PHASE1-3.7.md) に退避
- 2026-05-20 分割 (2回目): 残った 3252 行をさらに 3 分割
  - §22〜§37 (v173〜v188) → [`CHANGELOG_PHASE3.8-early.md`](CHANGELOG_PHASE3.8-early.md)
  - §38〜§74 (v189〜v225, ES Modules 化) → [`CHANGELOG_PHASE3.8-modules.md`](CHANGELOG_PHASE3.8-modules.md)
  - 本ファイルは §75 (v226, Phase 3.8 後半) から開始

次回分割の目安: 本ファイルが 1500 行超になったら、その時点で完成しているサブフェーズを `CHANGELOG_PHASE3.8-late.md` (仮) などに退避。

切り出し時は本ファイル冒頭の役割表・分割ポリシー、`TODO.md`・Notion §0 の参照リンクも合わせて更新する。

過去ログの参照早見表:
- 認証グラデーション・GPS 記録フロー初期実装・列車種別・コードベース 13 ファイル分割・Supabase 認証/マイページ初期版 → [`CHANGELOG_PHASE1-3.7.md`](CHANGELOG_PHASE1-3.7.md)
- データ補修・期間フィルタ「〜月指定」・記録モード用語統一・後追い記録・stop_type 駅 UI 個人化・地図フィルタ統合 → [`CHANGELOG_PHASE3.8-early.md`](CHANGELOG_PHASE3.8-early.md)
- 13-mypage 4 分割・SERVICE_LINES builder 分離・ride-record 分離・ES Modules stage 1〜3 (`<script type="module">` + `import`/`export` 化) → [`CHANGELOG_PHASE3.8-modules.md`](CHANGELOG_PHASE3.8-modules.md)

---

## 93. v244 — 駅マーカーも色 override に追従 (2026-05-20)

### 背景

v243 で系統色をユーザーカスタマイズできるようにしたが、ユーザー報告:
> 路線の色しかかわらないね

路線ポリラインの色は変わるのに、**駅マーカー (ドット・パイチャート) の色は古いまま**だった。

### 原因

`merged_stations.json` の各駅 entry に `colors: [#RRGGBB, ...]` という**事前計算キャッシュ**が含まれていて、`drawStationsLayer` がそれを優先して読んでいた:

```js
// 旧 (v243 まで):
const colors = ms.colors && ms.colors.length === nLines ? ms.colors : ms.lines.map(...);
```

`ms.colors` は Python 等のビルドスクリプトで `service_lines_master.json` の color を事前焼き込みしたもの。実行時に `sl.color` を override してもキャッシュは古いまま。

### 修正内容

#### 1. `drawStationsLayer` 冒頭で `Map<lineId, color>` 構築 ([js/08-rendering.js:584](js/08-rendering.js:584))

```js
const _slColorById = new Map();
for (const sl of NORIRECO.data.SERVICE_LINES) _slColorById.set(sl.id, sl.color);
```

633 系統 × 1 回 = O(633) の初期化。駅ループ内では `_slColorById.get(lid)` の O(1) ルックアップ。

#### 2. 駅マーカー色取得を Map 経由に ([js/08-rendering.js:639](js/08-rendering.js:639))

```js
// 旧: ms.colors キャッシュ優先
// 新: 常に SERVICE_LINES から動的取得
const colors = ms.lines.map(lid => _slColorById.get(lid) || '#888');
```

#### 3. キャラモーダルの系統リスト色も修正 ([js/08-rendering.js:810](js/08-rendering.js:810))

```js
// 旧: const color = (ms.colors && ms.colors[idx]) || (sl && sl.color) || '#888';
// 新: const color = (sl && sl.color) || '#888';
```

`ms.colors` の参照を廃止。`sl.color` 1 本に統一。

### 影響範囲

色 override が即時反映されるようになった箇所:
- 駅ドット (単色 circleMarker / divIcon)
- 駅パイチャート (多系統駅の扇形分割)
- キャラモーダル内の乗り入れ系統リスト
- 既に v243 で動いていた: 路線ポリライン、路線一覧プログレスバー、OGP 画像

### パフォーマンス

`Map` 構築は `drawStationsLayer` 呼出時に 1 度だけ。
旧コードは 9017 駅 × 平均 5 系統 × `Array.find` (O(633)) = **28M 比較** 相当だったが、新コードは Map 初期化 633 + ルックアップ 45085 = **45K アクセス** に。むしろ高速化。

### 落とし穴メモ

- **`merged_stations.json` の `colors` 列は dead column 化**: ビルドスクリプトで再生成不要 (元 colors は無視されるため)。将来的に新ビルド時に `colors` 列を出さない選択肢もあるが、ファイルサイズ削減効果は小さい (1.8MB → 1.5MB 程度予想) ので緊急性なし
- **`_slColorById` がスナップショット**: drawStationsLayer 内で構築するため、その関数の実行中は固定。色変更すると triggerReRender が drawStationsLayer を呼び直すので問題なし

### バージョン番号

v244 (Phase 3.8 後半 §93)

---

## 92. v243 — 系統色のユーザーカスタマイズ機能 (2026-05-20)

### 背景

TODO.md 🟡 体験向上 の長期積み残し「系統の色をユーザーカスタマイズ可能に」を実装。

> マップ上の系統色と、ユーザー（特にマニア）が想起する色が乖離するとイワカン。
> 系統ごとに color override を localStorage / Supabase に保存。

### 仕様

1. **路線一覧タブ (📋 路線)** の各系統カード左に `<input type="color">` を配置 (旧 lc-dot 置換)
2. **change** で `NORIRECO.colorOverrides.set(slId, color)` → localStorage 保存 + 全関連箇所を即時再描画
3. override 中の系統は `↺ 色をリセット` ボタン表示 → 元色に戻せる
4. 起動時に localStorage から色を読み込んで地図描画に反映 (リロード後もカスタム色維持)
5. データは端末 localStorage のみ (Supabase 同期は次フェーズ)

### 変更内容

#### 1. `js/15-color-overrides.js` 新規作成 (107 行)

ES Module。`NORIRECO.colorOverrides` に以下を公開:
- `get()` — localStorage の override 全件
- `set(slId, color)` — 単一系統を override + 保存 + 再描画
- `reset(slId)` — 単一系統を元色に戻す
- `resetAll()` — 全系統リセット
- `applyAfterBuild()` — 02b.build() 後の一括適用 (現状 02b 側で直接読んでいるので未使用、将来用に残置)

再描画は `drawLines()` + `updateOverlays()` + `renderList()` をまとめて呼ぶ `triggerReRender()` で集約。`setDateFilter` と同じパターンで `allLayers` / `dotLayerRef` / `labelLayerRef` をクリアしてから redraw。

```js
const STORAGE_KEY = 'norireco_line_color_overrides';
// localStorage: { "auto_東海道線_東日本旅客鉄道": "#FF0000", ... }
```

#### 2. `js/02b-service-lines-builder.js` build() 末尾に override 適用

```js
NORIRECO.data.serviceLinesBuilt = true;
console.log(`[乗レコ] NORIRECO.data.SERVICE_LINES built: ${NORIRECO.data.SERVICE_LINES.length} 系統`);

// v243: 起動時に override 適用、sl.originalColor を退避
try {
  const overrides = JSON.parse(localStorage.getItem('norireco_line_color_overrides') || '{}');
  for (const sl of NORIRECO.data.SERVICE_LINES) {
    if (sl.originalColor == null) sl.originalColor = sl.color;
    if (overrides[sl.id]) sl.color = overrides[sl.id];
  }
} catch (e) {}
```

15-color-overrides に依存させない (循環 import 回避)。同じ STORAGE_KEY を直読み。

#### 3. `js/09-tabs-stats.js` renderList に color picker + reset ボタン

`<div class="lc-dot">` を `<input type="color" class="lc-color">` に置換。  
override 中なら下段に `<button class="lc-color-reset">↺ 色をリセット</button>` を表示。  
change / click イベントは `NORIRECO.colorOverrides.set/reset` 呼び出し。

#### 4. CSS in noritetsu-map.html ([line 985](noritetsu-map.html:985))

```css
.lc-color { width:18px; height:18px; border-radius:50%; border:1.5px solid var(--track); cursor:pointer; ... }
.lc-color::-webkit-color-swatch{ border:none; border-radius:50%; }
.lc-color:hover { transform:scale(1.15); }
.lc-color-reset { font-size:9px; background:rgba(255,255,255,.08); ... }
```

`-webkit-color-swatch` / `-moz-color-swatch` で input[type=color] の内側スウォッチを丸く整形。  

#### 5. ロード順 / アセット登録

- `noritetsu-map.html`: `<script type="module" src="js/15-color-overrides.js">` を 14-share-ogp の後に追加
- `sw.js`: CACHE_VERSION v242 → v243、STATIC_ASSETS に追加
- `scripts/syntax-check.js` FILES に追加 (21/21 OK)

### 反映される箇所

色を変えると即時に反映:
- 地図上の路線ポリライン (`drawLines()`)
- 駅マーカー / パイチャート (`drawStationsLayer()` 経由)
- 路線一覧タブの色ドット / プログレスバー / % 表示
- ヘッダ完乗率 (色変更で数字は変わらないが、関連 DOM 更新の副作用)
- OGP 画像生成 (`buildSegmentPolylines()` も `sl.color` を参照)

### 落とし穴メモ

- **再描画コスト**: drawLines は約 633 系統 + パイチャート再構築でやや重い。change イベント (確定時のみ発火) を使い、input イベント (ドラッグ中) では再描画しない方針
- **`#888` フォールバック**: service_lines_master.json に color 未定義の系統は `#888` (グレー)。override で色付け可能
- **Supabase 同期未対応**: 別端末では色設定が共有されない。Phase 2 で `users.preferences` JSON か別テーブルで同期検討
- **OGP のキャッシュ**: シェア画像生成時の色は実行時の `sl.color` を見るのでカスタム色がそのまま出る。意図通り
- **input[type=color] の制約**: HEX のみ (透明度 alpha なし)。RGBA で半透明色をつけたい場合は別 UI (例: tinycolor.js + slider) が必要だが、当面は HEX で十分

### バージョン番号

v243 (Phase 3.8 後半 §92)

---

## 91. v242 — 同名駅の誤マッチ修正 (REGION_CENTER の緯度経度判定化) (2026-05-20)

### 背景

v241 でリリースした「リージョン中央駅 10 駅を tier 7 で常時表示」機能で、**石川県の高松駅 (北陸鉄道) が金沢の隣にも tier 7 として表示**されていたとユーザー報告。

### 原因

`REGION_CENTER_STATIONS` を `Set('高松', ...)` で持っていたため、名前だけで判定 → 同名駅 (北陸鉄道高松駅) も誤マッチしていた。

### 修正内容

`REGION_CENTER_STATIONS` を `Set` → `Map(name → {lat, lon})` に変更し、緯度経度の近接判定を追加 ([js/08-rendering.js:202-232](js/08-rendering.js:202)):

```js
const REGION_CENTER_STATIONS = new Map([
  ['札幌',   { lat: 43.07, lon: 141.35 }],
  ['仙台',   { lat: 38.26, lon: 140.88 }],
  ['東京',   { lat: 35.68, lon: 139.77 }],
  ['新宿',   { lat: 35.69, lon: 139.70 }],
  ['金沢',   { lat: 36.58, lon: 136.65 }],
  ['名古屋', { lat: 35.17, lon: 136.88 }],
  ['大阪',   { lat: 34.70, lon: 135.50 }],
  ['広島',   { lat: 34.40, lon: 132.48 }],
  ['高松',   { lat: 34.35, lon: 134.05 }],  // ← JR高松駅、北陸鉄道高松駅(36.83, 136.74)は弾かれる
  ['博多',   { lat: 33.59, lon: 130.42 }],
]);

function isRegionCenter(name, lat, lon) {
  const c = REGION_CENTER_STATIONS.get(name);
  if (!c || lat == null || lon == null) return false;
  return Math.abs(lat - c.lat) < 0.5 && Math.abs(lon - c.lon) < 0.5;  // 約 50km 圏内
}

function stationTier(nLines, name, lat, lon) { // ← 引数追加
  if (name && isRegionCenter(name, lat, lon)) return 7;
  ...
}
```

callsite ([js/08-rendering.js:574](js/08-rendering.js:574)):
```js
const baseTier = stationTier(nLines, ms.name, ms.lat, ms.lon);
```

### トレランス選定

`0.5 度 ≈ 50km` は:
- canonical 座標と実駅座標 (MERGED_STATIONS の緯度経度) のズレ吸収には十分
- 同一都市内の駅でも問題なくマッチ
- 異なる都道府県の同名駅 (例: 北陸高松駅 36.83N vs 香川高松駅 34.35N、緯度差 2.48 度 ≈ 250km) は確実に弾ける

### 落とし穴メモ

- **SUPER_MEGA_STATIONS は据置**: 「東京」「博多」等の SUPER_MEGA 7 駅は同名駅の存在可能性が低い (北陸博多駅とかは無い) ため Set のまま維持。将来同名衝突が報告されたら同じパターンに移行
- **canonical 座標**: Wikipedia から拾った主要 JR 駅の中心座標。MERGED_STATIONS 側の駅座標 (国土地理院数値地図) と数百メートルズレがあり得るので、トレランスは余裕を持って 50km にしている

### バージョン番号

v242 (Phase 3.8 後半 §91)

---

## 90. v241 — 9 地域の中央駅 10 駅を tier 7 で日本全国ビューから表示 (2026-05-20)

### 背景

日本全国ビュー (z=4-5) で地図に路線は見えるが駅マーカーは何も出ていない (現状は z >= 5 で tier 6 = 三大都市中心 7 駅から表示)。「あの地域、自分はどこ訪問してたっけ?」を一目で把握しづらかった。

ユーザー指定の 9 地域 × 1〜2 駅 = 計 10 駅を、SUPER_MEGA より一段上の "tier 7" として日本全国ビューから常時表示する。

| 地域 | 中央駅 |
|---|---|
| 北海道 | 札幌 |
| 東北 | 仙台 |
| 関東 | 東京、新宿 |
| 北陸 | 金沢 |
| 東海 | 名古屋 |
| 近畿 | 大阪 |
| 中国 | 広島 |
| 四国 | 高松 |
| 九州 | 博多 |

### 変更内容

すべて [js/08-rendering.js](js/08-rendering.js) 内:

#### 1. `REGION_CENTER_STATIONS` 定数追加 (新規 Set)

```js
const REGION_CENTER_STATIONS = new Set([
  '札幌', '仙台',
  '東京', '新宿',
  '金沢', '名古屋',
  '大阪', '広島',
  '高松', '博多',
]);
```

既存 `SUPER_MEGA_STATIONS` (東京・名古屋・新大阪・札幌・仙台・博多・広島) と一部重複するが、`stationTier` が REGION_CENTER を先にチェックして tier 7 を返すため両建てで問題なし。`新大阪` は引き続き tier 6 (SUPER_MEGA)、`大阪` が tier 7 (REGION_CENTER) と独立。

#### 2. `stationTier()` に tier 7 を追加

```js
function stationTier(nLines, name) {
  if (name && REGION_CENTER_STATIONS.has(name)) return 7;  // ← 新規
  if (name && SUPER_MEGA_STATIONS.has(name)) return 6;
  ...
}
```

#### 3. 密集 penalty バイパス (tier 7 の特例)

```js
// 旧: const tier = Math.min(6, baseTier + isolationBonus);
const tier = (baseTier === 7) ? 7 : Math.min(6, baseTier + isolationBonus);
```

東京・新宿・大阪等は `nearest_km < 0.5` で `isolationBonus = -4` が乗るが、これを適用すると tier=3 になり日本全国ビューから消えてしまう。REGION_CENTER は密集 penalty を回避して常に tier 7。

#### 4. `getDotMinTier(z)` に z>=4 → 7 を追加

```js
if (z >= 5)  return 6;
if (z >= 4)  return 7; // 日本全国ビューでは REGION_CENTER のみ
return 99;
```

z=4 (PC では日本全国フィット) で 10 駅のドット、z=5 で SUPER_MEGA も含む 17 駅、と段階的に増える。ラベルは `getLabelMinTier(z) = getDotMinTier(z-1)` なので z=5 で REGION_CENTER のラベル表示。

#### 5. レイヤー追加/削除の閾値を `<= 7` に拡張

`drawStationsLayer` の zoom 切替判定 `if (dotMin <= 6)` / `if (labelMin <= 6)` を `<= 7` に。これがないと REGION_CENTER 専用ズーム (z=4) でレイヤー自体が removed されて何も出ない。

### 視覚的に変わること

- z=4 (日本全国ビュー): 10 駅のドットが見える → 「あの地域の中央駅にだけ訪問あり/なし」が分かる
- z=5: 旧来 7 駅 + 新 4 駅 (新宿・金沢・大阪・高松) のドット + ラベル
- z=6 以降: 従来通り (4-6 系統駅・通常駅が段階的に追加)

### 落とし穴メモ

- **新大阪 vs 大阪**: 別 tier。地理的に近接するが用途が違う (新幹線 vs 在来線ハブ)。両方表示でも視覚的に混乱しない (z=5 では両方出るが z=4 では大阪のみ)
- **東京駅の特例**: 既に SUPER_MEGA (tier 6) だったが REGION_CENTER 入り (tier 7) で密集 penalty が完全に外れる。旧仕様では z=5 で tier 6 → isolationBonus -4 で実効 tier 2 → z=9 でしか見えなかった可能性。今は z=4 から確実に出る
- **将来拡張**: 沖縄 (那覇) を含めたい場合は `REGION_CENTER_STATIONS` に追加するだけで済む。当面ノリレコは沖縄路線非対応なのでスキップ
- **データ駆動化**: 当面は JS にハードコード (10 駅は年単位で変わらない)。将来「リージョン別完乗率」「リージョンバッジ」等に展開する場合は `region_centers.json` に外出ししてユーザー提供の `regions[].main_stations[].features` も活用できる

### バージョン番号

v241 (Phase 3.8 後半 §90)

---

## 89. v240 — マイページ「公式」表記を「GPS 記録」に統一 (2026-05-20)

### 背景

マイページに「公式完乗率」「🟢 公式」「(公式)」「公式 (verified) 旅程」等が複数箇所に散らばっており、v175 で統一した記録モード用語 (📝 手動記録 / 📍 GPS 記録) と整合していなかった。「公式って何？」というユーザー混乱の原因。

### 変更内容

`公式` → `GPS 記録` への一括リネーム (UI 文言・コメント横断):

| Before | After |
|---|---|
| 🟢 公式完乗率 | 🟢 GPS 記録 完乗率 |
| 🟢 公式 (詳細パネル内) | 🟢 GPS 記録 |
| 運営会社別 完乗率 (公式) | 運営会社別 完乗率 (GPS 記録) |
| 地域別 完乗率 (公式) | 地域別 完乗率 (GPS 記録) |
| よく乗る路線 (公式 Top 10) | よく乗る路線 (GPS 記録 Top 10) |
| よく訪れる駅 (公式 Top 10) | よく訪れる駅 (GPS 記録 Top 10) |
| 都道府県別 訪問駅数 (公式) | 都道府県別 訪問駅数 (GPS 記録) |
| `公式 (verified) 旅程` | `GPS 記録 (verified) 旅程` |
| ヘッダ tooltip「GPS 認証のみの公式完乗率」 | 「GPS 記録のみの完乗率」 |
| 未ログイン CTA「あなたの旅程・公式完乗率・GPS 後追い」 | 「あなたの旅程・GPS 記録 完乗率・GPS 後追い」 |

### 対象ファイル

- [js/13a-stats.js](js/13a-stats.js) (11 箇所)
- [js/13-mypage-common.js](js/13-mypage-common.js) (1 箇所)
- [noritetsu-map.html](noritetsu-map.html) (1 箇所、ヘッダ tooltip)

### 触らなかった箇所

- `CHANGELOG.md` / `TODO.md` / CHANGELOG アーカイブ群: 過去ログなので歴史的記録としてそのまま
- `TODO.md:278` の「公式オープンデータ活用」は政府公式データの意で別文脈、置換せず

### バージョン番号

v240 (Phase 3.8 後半 §89)

---

## 88. v239 — ヘッダ/マップオーバーレイの系統数オーバーカウント修正 (2026-05-20)

### 背景

v238 で `updateOverlays()` を常時呼ぶよう修正したが、依然として「全期間」状態で
- 地図オーバーレイ: 完乗率 **8%** / 乗車系統 **81** / 完乗系統 **25**
- マイページ全記録: 完乗率 **4%** / 系統 **34** / 完乗 **9**

と数字が大きく乖離していた。

### 原因

`slRiddenSt` (`js/04b-ride-record.js:300-316` の `rebuild()` で構築) が 2 段階の **過剰バラまき**ロジックになっていた:

1. RIDDEN_SEGS → N02 路線解決 → `riddenSt[N02_line_id]` (駅名 Set) ※新形式・旧形式・3 段 fallback
2. 各 SERVICE_LINE で `candidateN02Ids` (複数候補) を全部見て駅名一致 → `slRiddenSt[sl.id]` に書く

結果: 「東京駅で山手線として乗った」と記録すると、東京駅を含む**全 SERVICE_LINE** (京浜東北線・東海道線・中央線等) の `slRiddenSt` にも書かれ、ヘッダの乗車系統数が膨らんでいた。

一方マイページの `collect()` は `seg.lineId === sl.id` の**直接 match** なので、明示的に記録した系統だけカウント (= 正しい数字)。

### 修正内容

`js/02b-service-lines-builder.js:160-205` の `globalStats()` を、マイページ `collect()` と同じ「直接 lineId match + LEGACY fallback」ロジックに置換:

```js
function globalStats() {
  const SL = NORIRECO.data.SERVICE_LINES;
  const segs = window.RIDDEN_SEGS || [];
  ...
  for (const seg of segs) {
    // 1. SERVICE_LINE.id への直接 match (新形式 trip)
    let sl = SL.find(l => l.id === seg.lineId);
    // 2. LEGACY fallback: trip データに N02 路線 id が残っているケース
    //    candidateN02Ids に含む 最初の 1 系統だけ採用 (バラまかない)
    if (!sl) sl = SL.find(l => (l.candidateN02Ids || []).includes(seg.lineId));
    if (!sl) continue;
    ...
  }
  ...
}
```

`slRiddenSt` 自体は地図描画 (駅 UI 個人化・パイチャート・凡例) で使われているため、構造は touch せず温存。`globalStats()` の数字だけがマイページと整合するようになる。

### 影響範囲

- ヘッダ `h-pct` / `h-ln`: マイページ全記録と一致 (`updateOverlays` 経由)
- マップオーバーレイ `ms-pct` / `ms-ln` / `ms-dn`: 同上
- `stats(sl)` (個別 SERVICE_LINE 単位): 触らない (slRiddenSt の Set サイズを返す既存挙動)
- マイページの数字: 変化なし (元から正しい数字を出していた)
- 地図描画の駅 UI / パイチャート: 変化なし (slRiddenSt そのものは温存)

### 落とし穴メモ

- `globalStats()` は `updateOverlays()` 経由で頻繁に呼ばれる。RIDDEN_SEGS のスキャンは O(segs × SERVICE_LINES) で線形だが、一般ユーザーの segs は <1万、SERVICE_LINES は ~633 なので問題なし。100万 trip 規模になったら memo 化を検討
- LEGACY fallback の「最初の 1 系統だけ採用」は若干アービトラリ。例えば横須賀線・湘南新宿ライン両方の candidateN02Ids に同じ N02 id があると、SERVICE_LINES 配列の登録順で決まる。実用上は問題なし
- 個別 SERVICE_LINE 単位の `stats(sl)` だけは未だ `slRiddenSt` を参照するため、地図凡例の系統別完乗率はまだオーバーカウントしうる。これは別タスク (もしユーザー報告があれば対応)

### バージョン番号

v239 (Phase 3.8 後半 §88)

---

## 87. v238 — ヘッダ完乗率とマイページ完乗率の数字ズレ修正 (2026-05-20)

### 背景

ユーザー報告: 「今年のみ表示中」状態で
- ヘッダ右上: **8%** / 79 系統
- マイページ全記録: **4%** / 32 系統 (完乗 9)

同じ「全記録」を見ているはずなのに 2 倍の差が出ていた。

### 原因 (2 つ)

#### A. `applyDateFilter` で localStorage を user_id フィルタなしで読んでいた

`js/05-supabase-data.js:232-243`
```js
let trips = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
// ↑ 過去ログインの他ユーザー trip や user_id 未設定の古い trip も全部読む
```

マイページは Supabase 側で `user_id=eq.{uid}` フィルタしているが、ヘッダ計算は localStorage を生で読むので localStorage に他ユーザー trip が混ざっていると数字が膨らむ。`syncFromSupabase` が走れば overwrite で綺麗になるが、起動直後やキャッシュ状態次第で残留することがある。

#### B. `updateOverlays()` が map 初期化条件下でしか呼ばれていなかった (主犯)

`js/05-supabase-data.js:248-255` (修正前):
```js
if (NORIRECO.map.instance && typeof dotLayerRef !== 'undefined' && dotLayerRef) {
  ...
  drawLines();
  updateOverlays();  ← この if の中
}
```

`updateOverlays()` は `h-pct` / `h-ln` / `ms-pct` などの DOM テキストを書き換えるだけで Leaflet 依存はない。にもかかわらず map 再描画ブロック内にあるため、マイページタブ滞在中に期間フィルタを変更すると `slRiddenSt` は更新されるがヘッダの数字は古い値に固定される。これが「ヘッダ 8% (全期間ベース) vs マイページ 4% (今年ベース)」の主因。

### 修正内容

#### 1. `applyDateFilter` に user_id フィルタ追加 ([js/05-supabase-data.js:232](js/05-supabase-data.js:232))

```js
function filterTripsByCurrentUser(trips) {
  const uid = currentUserId();
  if (!uid) return trips; // 未ログイン: localStorage の全件 (ガイド用)
  return trips.filter(t => !t.user_id || t.user_id === uid);
}
```

`!t.user_id` を許容するのは、ログイン前に作成された自分の trip (user_id 未設定) を排除しないため。他ユーザーの trip は `t.user_id === uid` で確実に弾く。

#### 2. `loadRiddenSegsFromStorage` で user_id 未設定 trip を除外 ([js/05-supabase-data.js:425](js/05-supabase-data.js:425))

起動時は `currentUserId()` がまだ未確定なので、確実に anonymous/遺物と判別できる `user_id === null/undefined` だけを排除。

#### 3. `updateOverlays()` を map 再描画ブロックから出して常に呼ぶ ([js/05-supabase-data.js:248](js/05-supabase-data.js:248))

```js
// 修正後:
try { updateOverlays(); } catch(e) {}
if (NORIRECO.map.instance && dotLayerRef) {
  ... // 地図再描画 (map.instance がある場合のみ)
  drawLines();
}
```

`syncFromSupabase` も同様に修正 ([js/05-supabase-data.js:408](js/05-supabase-data.js:408))。

### バージョン番号

v238 (Phase 3.8 後半 §87)

### 落とし穴メモ

- `updateOverlays` を unconditional に呼ぶときは `try/catch` 必須 (DOM 要素 `h-pct` が未生成な瞬間がありうる)
- user_id フィルタは `!t.user_id || t.user_id === uid` の OR 条件。`!t.user_id` を許容しないと、Magic Link 認証完了前に手動記録した trip が消える
- ヘッダ計算とマイページ計算は将来的に同じ関数ベースに統一すべき (今は片方が `globalStats() → slRiddenSt`、もう片方が `collect() → trip.segments` で経路が違う)。とはいえ slRiddenSt は地図描画にも使われるため、無理に統一すると影響範囲が広い

---

## 86. v237 — OGP 日本地図を Natural Earth ベース 47 都道府県境界に置換 (2026-05-20)

### 背景

v236 で実装した OGP 画像生成の日本地図シルエットが「45 頂点の 4 島ポリゴン (本州・北海道・九州・四国)」だったため、本州が自己交差して塗りつぶしが破綻していた (ユーザー報告のスクショで明白)。

業界の解法を調査:
- Strava: Mapbox Static API (商用、月 5 万 req 無料)
- 駅メモ! / 鉄レコ: 自前の簡略化 GeoJSON
- 乗りつぶしオンライン: 都道府県別 SVG パス
- StationGraph: OpenStreetMap タイル

乗レコのプロダクト不変原則 (外部依存最小化、無料配信維持) と布石ポリシー (ベンダーロックイン回避) を考慮し、**自前 GeoJSON 埋め込み** (Option A) を採用。

### 変更内容

#### 1. `scripts/build-japan-geo.js` 新規作成 (118 行)

- `dataofjapan/land/japan.geojson` (12.7MB, 47 都道府県境界, public domain) を fetch
- 自前実装の **Douglas-Peucker (RDP)** で簡略化 (tolerance 0.02 deg ≈ 2km)
- 8km 未満の小島は捨てる (OGP 1200×630 では点にもならない)
- [lon,lat] → [lat,lon] に並べ替え + 小数 3 桁に丸めて出力
- 出力: 80,370 → 3,482 points (4.3%)、ファイル 12.7MB → **59KB** (200倍圧縮)

```bash
node scripts/build-japan-geo.js
# → js/share-japan-geo.js (59KB) を生成
```

#### 2. `js/share-japan-geo.js` AUTO-GENERATED (59KB)

```js
export const JAPAN_PREFS = [
  { name: '北海道', polygons: [[[lat,lon], ...], ...] },
  ...  // 47 件
];
window.JAPAN_PREFS = JAPAN_PREFS;
```

各都道府県は `Polygon` (本州内陸の県) または `MultiPolygon` (北海道・長崎・鹿児島・東京都の島嶼) を持ち、`polygons[]` の長さで変わる。

#### 3. `js/14-share-ogp.js` を `JAPAN_PREFS` ベースに書き換え

- 旧: `JP_ISLANDS` (4 島粗ポリゴン) を撤去
- 新: `getJapanPrefs()` で `window.JAPAN_PREFS` を取得し、47 都道府県を 2-pass 描画
  - 1 pass: 全 polygon を陸地色 `#152434` で fill (隣接 polygon の境を消す)
  - 2 pass: 全 polygon を境界線色 `#243d55` (lw 0.6) で stroke (都道府県境を細く)
- 沖縄は OGP では bbox 外 (lat 30.5 以下) のため自動カット (Canvas clip)
- 北方領土は dataofjapan/land に未含のため自動的に描画されない

#### 4. ロード順 / アセット登録

- `noritetsu-map.html`: `<script type="module" src="js/share-japan-geo.js">` を 13c → 14 の間に追加 (14-share-ogp.js が `window.JAPAN_PREFS` を参照するため先読み)
- `sw.js`: CACHE_VERSION v236 → v237、STATIC_ASSETS に `./js/share-japan-geo.js` 追加
- `scripts/syntax-check.js`: FILES に `share-japan-geo` 追加 (20/20 OK)

### 期待される視覚的改善

- 本州が自己交差せず、リアスのある海岸線がちゃんと出る
- 47 都道府県の境界線が薄く見える (情報量増)
- 北海道・四国・九州も正しい輪郭で描画
- ファイル増分は SW キャッシュ後は無視できる (59KB)

### 落とし穴メモ

- **JAPAN_PREFS は window 公開必須**: ES Module の `export` だけだと 14-share-ogp.js から見えない。`window.JAPAN_PREFS = JAPAN_PREFS` も必須 (`share-japan-geo.js` の末尾で実施)
- **ロード順**: `share-japan-geo.js` を `14-share-ogp.js` より先に読まないと、シェアボタン押下時に `getJapanPrefs()` が空配列を返す
- **データソースのライセンス**: dataofjapan/land は public domain (CC0 相当)。出力ファイルの先頭にソース URL を AUTO-GENERATED コメントとして明記
- **build スクリプトは手動実行**: package.json には足してない (年単位で変わらないデータのため、必要なときに `node scripts/build-japan-geo.js` で再生成)
- **沖縄カット**: JP_BBOX を意図的に 30.5N から開始しており、沖縄本島 (26.5N) は OGP 画像に出ない。Phase 2 でインセット表示を検討
- **fetch エラー時のフォールバックなし**: `window.JAPAN_PREFS` が空のとき OGP は地図なしで生成される (segments と海岸線がない状態)。実用上は SW プリキャッシュで救われる

### バージョン番号

v237 (Phase 3.8 後半 §86)

---

## 85. v236 — シェア機能 MVP: OGP 画像生成 (Canvas) (2026-05-20)

### 背景

🔥 最優先 TODO「シェア機能 (OGP 画像生成)」の MVP。Notion §3.1 と TODO.md でずっと未着手だったが、ES Modules 化 (v195〜v225) でコード基盤がクリーンになったので着手。

既存実装の棚卸し:
- `noritetsu-log.html` の旅程結果画面に **テキストベース**のシェア (絵文字テキスト + クリップボードコピー) は実装済み (`#share-txt`)
- 画像生成・OGP・累計完乗率版・X intent などは未実装
- `js/13a-stats.js:217` の「シェア機能 (将来) は 🟢 GPS 記録のみ対象」はコメントだけで実装なし

### スコープ (MVP)

- **累計版**の OGP 画像 (全駅・全系統に対する完乗率) のみ。個別 trip 版は後回し
- **マイページ統計タブ**の完乗率カード直下に「📸 シェア画像を作成」ボタン
- **verified 限定ガードは未実装** (`users.share_status` スキーマ + RLS 強化と同時着手するため別タスク化、布石 #6)

### 変更内容

#### 1. `js/14-share-ogp.js` 新規作成 (286 行)

- ES Module、`window.NORIRECO.share.openShareModal(stats)` を公開
- `generateOgpCanvas(stats)` で 1200×630 の Canvas を直接描画
  - 背景: navy `#0D1B2A` + 上端アクセントライン
  - ヘッダ: 🚃 乗レコ ロゴ (左) / `yutsutke.github.io/norireco` (右)
  - 左パネル (620×470): 日本地図 (4 島ポリゴン + 緯度経度グリッド + 乗車区間 polyline + 北方位)
  - 右パネル (440×470): 完乗率 % / 制覇駅 / 系統 / 総距離
  - フッタ: `#乗レコ #乗り鉄 #全国制覇`
- 日本地図シルエットは lat/lon ベースで自己完結 (`JP_ISLANDS` 配列 + `JP_BBOX` 固定 bbox + `projToCanvas()` 投影)
- 乗車区間は `window.RIDDEN_SEGS` + `NORIRECO.data.SERVICE_LINES` から `buildSegmentPolylines()` で抽出 (lineId + from + to → station coords)
- モーダル UI は `ensureModal()` で `<body>` に append (既存 `.memo-modal` / `.memo-sheet` CSS を流用)
  - ダウンロード: `canvas.toBlob` → `<a download>` で `norireco-YYYY-MM-DD.png`
  - シェア: `navigator.canShare({files})` 対応端末は `navigator.share()` で画像 + テキスト同送、未対応は X intent (`x.com/intent/tweet`) にフォールバック
  - 閉じる: モーダル背景クリック or ボタン

#### 2. `js/01-constants.js` ISLANDS を window 公開

```js
// 旧: ISLANDS は現状未参照 (dead) なので window 公開なし
// 新 (v236): OGP 画像生成 (14-share-ogp.js) で利用するため公開
window.ISLANDS = ISLANDS;
```

ただし `01-constants.js` の ISLANDS は pre-projected x,y で「全国 view 固定」前提のため、14-share-ogp.js では結局 lat/lon 版 (`JP_ISLANDS`) を内部に持って自己完結化。01-constants の ISLANDS 公開は将来用 (boundary 共有時)。

#### 3. `js/13a-stats.js:132-153` 完乗率カード直下にボタン追加

```js
const shareBtn = document.createElement('button');
shareBtn.className = 'mp-share-btn';
shareBtn.textContent = '📸 シェア画像を作成';
shareBtn.onclick = () => NORIRECO.share.openShareModal({
  pct: all.uniquePct,
  ridden: all.uniqueRidden,
  totalUnique,
  lines: all.lines,
  complete: all.complete,
  totalLines,
  distanceKm: all.totalDistanceKm,
});
wrap.appendChild(shareBtn);
```

`all` (全記録) ベース。`sv` (verified のみ) でないのは MVP では全記録シェアを優先、verified ガードは別タスクのため。

#### 4. `noritetsu-map.html` module 登録

```html
<script type="module" src="js/13c-lines.js"></script>
<script type="module" src="js/14-share-ogp.js"></script>  ← 追加
<script type="module" src="js/09-tabs-stats.js"></script>
```

#### 5. `sw.js` CACHE_VERSION v235 → v236 + STATIC_ASSETS に追加

#### 6. `scripts/syntax-check.js` の FILES 配列に `14-share-ogp` 追加 (19/19 OK)

### 残課題 (次に着手すべき順)

1. **verified ガード** — `users.share_status` (warn / share_banned / full_banned) スキーマ追加 + RLS policy で実装。布石 #6 と同時
2. **個別 trip シェア** — 旅程カードからも 1 旅程分の OGP を生成可能に
3. **`noritetsu-log.html` のテキストシェアを地図画面に移植** — log 画面廃止 TODO とセット
4. **シェア専用ページ** (`/share/<id>`) で OGP メタタグ込みの受け側 URL + 「自分も記録してみる」CTA
5. **画像保存先** — 現状は端末ダウンロードのみ。永続シェア URL には R2 + Workers が必須 (布石 #2 / #4)

### 落とし穴メモ

- **`RIDDEN_SEGS` グローバル参照**: 14-share-ogp.js は `window.RIDDEN_SEGS` を直接読む。期間フィルタ (`setDateFilter`) で `RIDDEN_SEGS` が書き換わるので、シェアボタンを押した時点の期間フィルタ状態が反映される (=「今年だけ」シェアも可能)
- **絵文字フォント**: Canvas API の `🚃` は OS のフォールバックフォントに依存。Windows/macOS/iOS では Emoji フォント、Linux では表示崩れの可能性 (個人開発で実機検証範囲を限定)
- **`navigator.share` の files サポート**: iOS Safari 15+ / Android Chrome は OK、PC ブラウザは概ね非対応 → X intent fallback で吸収
- **`canvas.toBlob` は async**: ダウンロード/シェア両方で await 必須

### バージョン番号

v236 (Phase 3.8 後半 §85)

---

## 84. v235 — 完乗率の集計方式を「ユニーク駅単位」に統一 (2026-05-19)

### 背景

ユーザー報告: ヘッダ「達成率 10%」とマイページ「全記録完乗率 4%」と「公式完乗率 0%」、3 つの異なる数字が並んでいて一瞬で何が違うのか分からない。

### 原因

- **ヘッダ 10%** = `globalStats()` ([js/02b-service-lines-builder.js](js/02b-service-lines-builder.js)) の `pct` = 系統単位の駅数集計 (1 駅が複数系統に属すると複数回カウント、ts ≈ 10,446)
- **マイページ 全記録 4%** = `buildCompletionCards()` の `collect(false).uniquePct` = ユニーク駅単位 (Set で重複排除、ts ≈ 8,491)
- **マイページ 公式 0%** = `collect(true).uniquePct` = `trip.verified === true` のみ

ヘッダと全記録は同じ「全記録」を見ていたが集計方式 (系統単位 vs ユニーク駅単位) が違うため数字がズレ、初見ユーザーには判別不能だった。

### 変更内容

#### 1. `globalStats()` をユニーク駅単位に変更 ([js/02b-service-lines-builder.js:156-172](js/02b-service-lines-builder.js:156))

```js
function globalStats() {
  const allStations = new Set();
  const riddenStations = new Set();
  let la = 0, ld = 0;
  NORIRECO.data.SERVICE_LINES.forEach(sl => {
    for (const s of sl.stations) allStations.add(s.name);
    const rs = slRiddenSt[sl.id];
    const r = rs ? rs.size : 0;
    if (rs) for (const n of rs) riddenStations.add(n);
    if (r > 0) la++;
    if (r === sl.stations.length && sl.stations.length > 0) ld++;
  });
  const ts = allStations.size;
  const rt = riddenStations.size;
  return { ts, rt, la, ld, pct: ts > 0 ? Math.round(rt/ts*100) : 0 };
}
```

`la` (乗車系統数) と `ld` (完乗系統数) は系統単位を維持。`pct` だけがユニーク駅単位に。

#### 2. ヘッダ・右パネルのラベル統一 ([noritetsu-map.html:1045-1046](noritetsu-map.html:1045), [noritetsu-map.html:1132-1134](noritetsu-map.html:1132))

- ヘッダ: `達成率 10% / 路線 81` → `完乗率 4% / 系統 81`
- 右パネル: `全体 10% / 乗車路線 81系統 / 完乗 25系統` → `完乗率 4% / 乗車系統 81系統 / 完乗系統 25系統`
- title 属性で説明追記 (hover で「ユニーク駅単位の完乗率 (全記録)」)

#### 3. マイページ完乗率カードのサブタイトル明確化 ([js/13a-stats.js:117-130](js/13a-stats.js:117))

- `verified のみ` → `GPS 認証された乗車記録のみ`
- `manual / suspicious 含む` → `手動記録も含む全ての乗車`

### 結果

- ヘッダ「完乗率 4%」= マイページ「全記録完乗率 4%」が完全一致
- マイページ「公式完乗率 0%」(GPS のみ) との対比が「全記録 vs GPS 認証」の 2 軸で明快に
- 「達成率」「路線」など曖昧だった用語を全て「完乗率」「系統」に統一

### 落とし穴メモ

- `gStats()` / `globalStats()` を直接読む他の場所 (もしあれば) は `pct` の意味が変わるので注意。検索 → `updateOverlays` ([js/08-rendering.js:897-903](js/08-rendering.js:897)) と `mp-completion-pinned` の calc 経路のみ。後者は既にユニーク駅ベースなので影響なし
- `stats(sl)` (系統単位) と `globalStats()` (ユニーク駅単位) で `pct` の意味が分岐するので、命名 / コメントで明示

---

## 83. v234 — 静的デモデータ `RIDDEN_SEGS_STATIC` を撤去 (2026-05-19)

### 背景

v233 で未ログイン時の Supabase 同期を skip するようにしたが、ユーザーから「まだデータが残ってる」報告。スクリーンショットでは「📄 静的データ」ラベルで東海道新幹線・山手線・北陸新幹線・予讃線などのデモ線が表示されており、`RIDDEN_SEGS_STATIC` (21 segments の demo trip 集) が描画されていた。

このデモデータは元々「初回訪問時にアプリの可能性を見せる」目的だったが、本人の記録と区別が付かず混乱の元になっていた。乗レコは記録系アプリなので、ユーザーが自分で記録するまで空マップの方が UX 上正しい。

### 変更内容

#### 1. `RIDDEN_SEGS_STATIC` 配列を削除 ([js/05-supabase-data.js](js/05-supabase-data.js))

旧 [js/05-supabase-data.js:17-47](js/05-supabase-data.js) の 21 segment 定義 + 関連コメントを撤去。

#### 2. フォールバック先を空配列に

- `applyDateFilter()`: `trips.length === 0` → `segs = []` (旧 `[...RIDDEN_SEGS_STATIC]`)
- `RIDDEN_SEGS` モジュール初期化: `loadRiddenSegsFromStorage() || []` (旧 `|| [...RIDDEN_SEGS_STATIC]`)

#### 3. ストレージ識別子 `'static'` → `'empty'` に改名

- `getStorageStats()` の戻り値: `source: trips.length > 0 ? 'local' : 'empty'`
- `updateStorageUI('empty')`: ラベルを `📄 静的データ` → `📄 データなし` に
- 12-auth の `clearLocalUserDataAfterSignOut()` も `updateStorageUI(0, 'empty')` に
- 06-map-leaflet の復元モーダル文言も `'静的データ（Supabaseから自動同期）'` → `'データなし（ログイン後 Supabase から同期）'` に

### 影響範囲

- 未ログイン + 空 localStorage = 完全に空のマップ (路線も駅も描かれない)
- ログイン中の挙動は不変。Supabase 同期成功で従来通り表示
- 初回訪問者には「ログインしてください」UX 経路を強化する余地あり (別タスク)

---

## 82. v233 — 未ログイン時の Supabase 同期で他人の trip / キャラ獲得が漏れていたのを修正 (2026-05-19)

### 背景

ログアウト状態でも地図に乗車線が出る報告。スクリーンショットでは「ログイン」ボタン表示 (= 未ログイン) なのにストレージ表示が `☁ Supabase同期済 147件` で、東京・大宮・新横浜・横浜などにパイチャートが描かれていた。

### 原因

`syncFromSupabase()` ([js/05-supabase-data.js](js/05-supabase-data.js)) と `syncCharacterGrantsFromSupabase()` ([js/03-characters.js](js/03-characters.js)) の両方が:

- anon key (`Bearer ${SUPABASE_KEY}`) で fetch
- `user_id` フィルタなし

で全ユーザーの trip / キャラ獲得を取得していた。RLS が anon に SELECT 許可していたため、未ログイン状態でも全データが localStorage に書き込まれ、地図に反映されていた。

(同時に他ユーザーのデータがログアウト中の端末で見えていた = 軽微なプライバシー問題。SUPABASE_KEY は公開キーなので REST API でも誰でも引けるが、UI で他人のデータを表示するのは別問題)

### 変更内容

#### 1. `syncFromSupabase()` を user_id 必須 + ログイン中のみに ([js/05-supabase-data.js:392-410](js/05-supabase-data.js:392))

```js
const uid = currentUserId();
if (!uid) {
  console.log('[乗レコ] Supabase 同期スキップ (未ログイン)');
  return;
}
fetch(`${SUPABASE_URL}/rest/v1/norireco_trips?user_id=eq.${uid}&select=*&order=created_at.asc`, {
  headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authBearerToken()}` }
})
```

Bearer も anon key 直挿しから `authBearerToken()` (access_token 優先、フォールバックで anon key) へ統一。

#### 2. `syncCharacterGrantsFromSupabase()` も同様に修正 ([js/03-characters.js:86-95](js/03-characters.js:86))

#### 3. ログイン確定時に sync を再トリガー ([js/12-auth.js:117-126](js/12-auth.js:117))

`syncFromSupabase()` が起動時 (06-map-leaflet `initMap`) に走るタイミングではまだ `auth.currentUser` が null の可能性 (Supabase SDK の session 復元が間に合っていない)。`handleAuthChange` の `SIGNED_IN` / `INITIAL_SESSION` 分岐で `backfillUserIdForLegacyData` の後に `syncFromSupabase()` + `syncCharacterGrantsFromSupabase()` を明示的に呼ぶ。

```js
if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && auth.currentUser && !auth.authBackfillRan) {
  auth.authBackfillRan = true;
  backfillUserIdForLegacyData(auth.currentUser.id);
  syncFromSupabase();
  syncCharacterGrantsFromSupabase();
}
```

これにより 12 ↔ 05 と 12 ↔ 03 の 2 つの循環 import が新たに発生するが、全て function export なので ES Modules の hoisting で解決される (既存の 12 ↔ 13 / 12 ↔ 07 と同じパターン)。

### 影響範囲

- **未ログイン端末で他人の trip / キャラが見える問題が解消** (= 統計バッジ・乗車線・パイ・キャラ獲得が全て空 or 静的フォールバックになる)
- ログイン中の挙動は不変。session 復元時に backfill と並んで sync が走る
- Supabase RLS の policy 自体は据え置き (将来は anon SELECT を禁止すべきだが、別タスク)

### 落とし穴メモ

- SUPABASE_KEY は frontend に露出した anon key なので、誰でも REST API で生データを引ける。今回の修正は **UI で他人データを表示しない** ことに限定した防御。本格的なアクセス制御は Supabase RLS で `user_id=auth.uid()` 必須にする必要がある
- backfill (`user_id=NULL` を自分の uid に PATCH) は Bearer に access_token を使うとユーザーの認可が乗るため、RLS 強化後も動作する

---

## 81. v232 — 駅ドットとパイチャートの出現タイミングを統一 (2026-05-19)

### 背景

旧設計では `getDotMinTier(z)` (ドット用閾値) と `getPieMinTier(z)` (パイ用閾値、ドットより厳しめ) の 2 本立てで、多系統駅は **「低ズームでは単色ドットだけ表示 → 1〜2 ズーム上げるとパイチャートに昇格」** という段階表示を狙っていた。

しかし v230/v231 の tier 圧縮後、ドットとパイで出現タイミングがズレるとマップ上で「単色丸」と「パイ」が混在する違和感が出ていた。多系統駅は最初からパイで出した方が情報密度として自然。

### 変更内容 ([js/08-rendering.js](js/08-rendering.js))

#### 1. `getPieMinTier(z)` 関数を削除

旧 [js/08-rendering.js:244-252](js/08-rendering.js) の関数定義を撤去。

#### 2. `_station_use_pie_threshold = true` 代入を削除 (2 箇所)

- 装飾 divIcon (Lv2+/キャラ付き多系統駅) の `dot._station_use_pie_threshold = true`
- 平常多系統駅の `extraDot._station_use_pie_threshold = true`

両方ともパイマーカーだが、ドットと同じ `getDotMinTier` 閾値で出るように `_station_use_pie_threshold` フラグごと撤廃。

#### 3. `updateLOD` を簡素化 ([js/08-rendering.js:131-141](js/08-rendering.js:131))

```js
// 旧:
const dotMin = getDotMinTier(z);
const pieMin = getPieMinTier(z);
const minTier = d._station_use_pie_threshold ? pieMin : dotMin;

// 新:
const dotMin = getDotMinTier(z);
const minTier = dotMin; // 全マーカー共通
```

### 視覚的影響

- 多系統駅 (平常) は今後、出現と同時に **単色ドット + パイマーカー** が重なって表示される (パイがドットを視覚的に覆う)。単色ドットの上にパイが描画されるレイヤー順は据え置き
- 装飾 divIcon (Lv2+/キャラ付き) は元から 1 マーカーだったので、出現タイミングが旧 dotMin に合わせて早くなる (旧 pieMin より早く出る)
- ラベル (`getLabelMinTier`) は `getDotMinTier(z-1)` で 1 ズーム遅延の関係を維持

---

## 80. v231 — 駅ランク tier テーブルを圧縮 (都内クラッタ抑制) (2026-05-19)

### 背景

v230 で bbox 分岐を撤去した結果、都内の中間ターミナル (3-6 系統駅) が低ズームでも大量に出現して地図がクラッタになる現象を確認。スクリーンショットでは関東広域ビューで国分寺・倉子・新横浜・小山・古河など 4-6 系統相当の駅が密集表示されていた。

旧 tier テーブルは 1〜6 を細かく刻んでいたが、SUPER_MEGA とそれ以外の多系統駅の間で十分な差が出ず、`getDotMinTier` の閾値テーブル側で微調整しても限界があった。

### 変更内容 ([js/08-rendering.js](js/08-rendering.js))

`stationTier(nLines, name)` の戻り値を圧縮:

| 系統数 | 旧 tier | 新 tier |
|---|---|---|
| SUPER_MEGA (駅名リスト) | 6 | 6 (unchanged) |
| 7+ | 5 | **4** |
| 4-6 | 4 | **2** |
| 3 | 3 | **2** |
| 2 | 2 | 2 (unchanged) |
| 1 | 1 | 1 (unchanged) |

結果として tier 3 と tier 5 は使われなくなり、実質「6 / 4 / 2 / 1」の 4 段階になる。SUPER_MEGA (6) と 7+ ターミナル (4) の間に 2 段階差を確保、4-6 系統と 2-3 系統を同 tier (2) に統合して中規模駅を一括で遅出しにする。

isolationBonus テーブルと `getDotMinTier` の閾値表は据え置き。tier 値が 1〜2 段階下がることで、関東広域 (z=8-10) で旧 tier 3-4 駅が表示されなくなる。

### 影響予測

- 都内 z=8-10: 3-6 系統駅 (国分寺・新横浜・倉子・古河 等) が消える → クラッタ解消
- 都内 z=11+: 7+ ターミナル (新宿・渋谷・大宮 等) は出続ける
- 地方の中規模駅 (3-6 系統、例: 静岡・浜松): 同様に低ズームでは出にくくなる
  - ただし isolation bonus +1〜+2 が乗りやすいので、田舎の 4 系統駅は tier=3-4 となり 7+ ターミナル相当の早出しに

### 落とし穴メモ

`stationTier` の値域は理論上 `{1, 2, 4, 6}` の離散集合に縮小したが、isolation bonus との加算で `-3 〜 6` の連続範囲を維持。閾値表 `getDotMinTier` は連続値前提なので問題なし。

---

## 79. v230 — 地図 LOD から首都圏 bbox 分岐を撤去、駅ランク 1 本化 (2026-05-19)

### 背景

地図描画の LOD (level of detail) は (1) 駅ランク `tier` (baseTier from 系統数 + isolationBonus from `nearest_km`) と (2) 緯度経度 bbox による `isMetro` 判定の **二重メカニズム** で密集度を扱っていた。`isMetro` は首都圏 (山手線周辺) / 大阪都心 / 名古屋都心の bbox にヒットすると `getDotMinTier(z, true)` / `getDotMinTier(z, false)` の別テーブルを引く設計。

しかし `isolationBonus` (`nearest_km < 0.5km` → `-4`, `>= 10km` → `+2`) が既に密集度の連続値として最終 tier に織り込まれているため、bbox は同じ仕事を粗い離散分類で重複していた。京葉線・葛西臨海公園のように「首都圏 bbox の外だが実質都市駅」のようなエッジケースで bbox が機能しないのに対し、isolation は座標非依存で正しく機能する。

### 変更内容 ([js/08-rendering.js](js/08-rendering.js))

#### 1. `isMetroArea(lat, lon)` 関数を削除

3 領域 (首都圏 / 大阪 / 名古屋) の bbox 判定ロジック (旧 [js/08-rendering.js:215-225](js/08-rendering.js)) を撤去。

#### 2. `getDotMinTier` / `getPieMinTier` / `getLabelMinTier` を 1 本化

4 テーブル (PC+metro / PC+rural / Mobile+metro / Mobile+rural) を **旧 metro 側ベースに統合**。引数 `isMetro` を削除。

- `getDotMinTier(z)`: PC で `z>=16→-4 ... z>=5→6`。Mobile では z を 1 下げて同テーブル参照 (旧 mobile metro 相当)
- `getPieMinTier(z)`: 多系統駅をパイチャート昇格させる閾値。`z>=13→2 ... z>=9→6`
- `getLabelMinTier(z)`: `getDotMinTier(z-1)` でドットから 1 ズーム遅延

旧 rural 側のテーブル (PC で 2 ズーム緩く / Mobile で 3 ズーム緩く) は捨てた。tier+isolation で田舎駅は bonus +1/+2 が乗って tier が早出しされるので、閾値表は厳しめ寄りでも結果バランスする。

#### 3. `updateLOD` の分岐簡素化 ([js/08-rendering.js:127-156](js/08-rendering.js:127))

```js
// 旧: const dotMinMetro = ...; const dotMinRural = ...; (×4)
//     const m = d._station_isMetro;
//     minTier = m ? dotMinMetro : dotMinRural;
// 新: const dotMin = getDotMinTier(z);
//     const minTier = d._station_use_pie_threshold ? pieMin : dotMin;
```

各マーカーの `_station_isMetro` プロパティ参照も削除。

#### 4. 駅描画ループから `isMetro` 計算と `_station_isMetro` 代入を削除

[js/08-rendering.js:683 周辺](js/08-rendering.js:683)。`dot` / `extraDot` / `label` の 3 箇所。

### 駅ランク (tier) の計算式 (参考)

`tier = min(6, baseTier + isolationBonus)` で **-4 〜 6** の整数。

| 要素 | 値 |
|---|---|
| baseTier 6 | `SUPER_MEGA_STATIONS` (東京/名古屋/新大阪/札幌/仙台/博多/広島) |
| baseTier 5 | 7 系統以上 (新宿/渋谷/池袋/横浜/大宮 等) |
| baseTier 4 | 4-6 系統 |
| baseTier 3 | 3 系統 |
| baseTier 2 | 2 系統 |
| baseTier 1 | 1 系統 |
| isolationBonus +2 | `nearest_km >= 10km` (北海道ローカル駅等) |
| isolationBonus +1 | `nearest_km >= 5km` |
| isolationBonus 0 | `nearest_km >= 2km` |
| isolationBonus -1 | `nearest_km >= 1.2km` |
| isolationBonus -2 | `nearest_km >= 0.8km` |
| isolationBonus -3 | `nearest_km >= 0.5km` |
| isolationBonus -4 | `nearest_km < 0.5km` (山手線内側等) |

例:
- 東京駅: baseTier=6 → tier=6 (cap)
- 神田 (山手線): baseTier=2, bonus=-4 → tier=-2 (高ズームでのみ出現)
- 北海道・布部: baseTier=1, bonus=+2 → tier=3

### 影響範囲

LOD のみ。記録モード・統計・キャラ獲得など他機能には触れていない。bbox 撤去で「葛西臨海公園」のような bbox 外の首都圏駅も合理的に扱えるようになる副作用がある。

### 落とし穴メモ

`SUPER_MEGA_STATIONS` (東京/名古屋/新大阪/札幌/仙台/博多/広島) は `stationTier()` の最上位判定なので残置。これは bbox ではなく駅名ベースのリストなので tier 計算と整合。

---

## 78. v229 — v228 続報: 達成率/系統数バッジと mypage キャッシュも purge (2026-05-19)

### 背景

v228 デプロイ後の動作確認で「地図はリセットされるけど統計は残るね」とユーザー報告。
ヘッダ右上の「10% 達成率 / 81 路線」バッジ ([noritetsu-map.html:`h-pct` / `h-ln`](noritetsu-map.html)) と右側パネルの「全体 / 乗車路線 / 完乗」凡例 (`ms-pct` / `ms-ln` / `ms-dn`) が、ログアウト後も前ユーザーの数値のまま残っていた。

### 原因

`redrawAllLinesAfterTripChange()` ([js/07-record-mode.js:968](js/07-record-mode.js:968)) は地図の **線・駅ドット・パイチャート** を再描画するだけで、**`updateOverlays()`** ([js/08-rendering.js:1012](js/08-rendering.js:1012)) は呼ばない。バッジ・凡例の DOM テキストは `updateOverlays()` が `gStats()` を読んで反映する仕組みなので、明示的に併用しないと更新されない。

呼出側の慣習を見ると `07-record-mode.js:927-928` の `saveMultiSegmentTrip` も明示的に両方呼んでいた:

```js
NORIRECO.rideRecord.rebuild();
redrawAllLinesAfterTripChange();
updateOverlays();
```

v228 の `clearLocalUserDataAfterSignOut()` ではこの 2 段目を漏らしていた。

### 変更内容

#### 1. `updateOverlays()` を import して purge 末尾で呼ぶ ([js/12-auth.js](js/12-auth.js))

```js
import { updateOverlays } from './08-rendering.js';
// ...
try { redrawAllLinesAfterTripChange(); } catch(e) {}
try { updateOverlays(); } catch(e) {}
```

これで `h-pct` / `h-ln` / `ms-pct` / `ms-ln` / `ms-dn` の DOM テキストと `legend-lines` (営業系統別凡例) がログアウト時に 0 に揃う。

#### 2. mypage キャッシュ `NORIRECO.mypage.state._mypageCache` も null に ([js/12-auth.js](js/12-auth.js))

`renderMypage()` 自体は未ログイン時に「ログインしてください」空状態を出すので通常経路では問題にならないが、`tripCardHtml(trip)` 等の補助関数や旅程編集モーダルが `_mypageCache` を直接参照するため、キャッシュも明示的に null 化して前ユーザー由来の trip オブジェクトが UI に漏れないようにする。

### 影響範囲

ログアウト時のバッジ・凡例・mypage キャッシュのみ。`saveMultiSegmentTrip` 等の既存 trip 変更フローは元から両方呼んでいるので変化なし。

---

## 77. v228 — ログアウト時に地図の乗車データをローカルから purge (2026-05-19)

### 背景

ログアウトしても地図上の乗車線・駅ドット・キャラ獲得が前ユーザーのまま残り続けるバグ報告。Supabase 側のデータには触れず、ローカル (localStorage + in-memory 派生状態) だけを掃除して空状態を表示するのが正しい挙動。

### 原因

`signOutUser()` ([js/12-auth.js:148](js/12-auth.js:148)) は `supabaseAuthClient.auth.signOut()` で Supabase セッションを破棄するのみ。`onAuthStateChange` の `SIGNED_OUT` イベント側でも UI 更新 + マイページ再描画しか行っておらず、以下が残置されていた:

- `localStorage.norireco_trips` (乗車履歴) → `loadRiddenSegsFromStorage()` が起動時に読み込み続ける
- `localStorage.norireco_owned_characters` (キャラ獲得)
- `localStorage.norireco_station_char_pick` (駅ごとのキャラ選択)
- in-memory `RIDDEN_SEGS` / 派生状態 `slRiddenSt` / `slStopType` / `slVisitCount` / `riddenServiceIds`
- 地図再描画も走らないので、線・ドット・パイチャートが前ユーザーのまま

### 変更内容

#### 1. `handleAuthChange` に `SIGNED_OUT` 分岐 ([js/12-auth.js](js/12-auth.js))

`event === 'SIGNED_OUT'` で `clearLocalUserDataAfterSignOut()` を呼ぶよう追加。

#### 2. `clearLocalUserDataAfterSignOut()` 新規 ([js/12-auth.js](js/12-auth.js))

以下を順に実行:

1. `localStorage.removeItem('norireco_trips' / 'norireco_owned_characters' / 'norireco_station_char_pick')` — ユーザー紐付きキーのみ。期間フィルタ・地図モード・stop_type フィルタ等の UI 設定キーは据置
2. `window.RIDDEN_SEGS.length = 0` — in-memory 共有配列を空に
3. `NORIRECO.rideRecord.rebuild()` — `slRiddenSt` / `slStopType` / `slVisitCount` / `riddenServiceIds` を空 RIDDEN_SEGS から再構築 (= 空)
4. `redrawAllLinesAfterTripChange()` — 既存ポリライン・ドット・パイチャートをクリアして再描画 (07-record-mode export を利用)
5. `updateStorageUI(0, 'static')` — ストレージ表示ラベルを「📄 静的データ」に戻す

#### 3. import 追加 ([js/12-auth.js](js/12-auth.js))

- `redrawAllLinesAfterTripChange` from `./07-record-mode.js`
- `updateStorageUI` from `./05-supabase-data.js`

12 ↔ 07 は循環 import (07 が既に `currentUserId` を 12 から import) になるが、両側とも function export なので ES Modules の hoisting で解決される (03 ↔ 07 と同じ前例)。`npm run check` パス。

### 設計判断

- **Supabase は触らない**: ログアウト = ローカルビューの purge であり、データ削除ではない。再ログインで `syncFromSupabase()` が走り元通り復元される
- **静的フォールバックは呼ばない**: 05 の `loadRiddenSegsFromStorage()` は localStorage 空時に `RIDDEN_SEGS_STATIC` (デモ用の特定旅行者の記録) を返すが、ログアウト直後にデモ記録を表示すると混乱を招くため、in-memory も明示的に空にする
- **UI 設定キー (`mapMode` / `norireco_stop_type_filter` / `norireco_trip_date_filter` / `CHAR_MODE_KEY`) は保持**: 同じ端末を別ユーザーが使う場合でも、地図操作の好みは引き継ぐ方が UX 上自然

### 影響範囲

- ログアウト時の挙動のみ変更。ログイン中・未ログイン起動時の挙動は不変
- マイページが開いている状態でログアウトすると、既存の `setTimeout(() => renderMypage(), 100)` も走るので、マイページ側も空表示に切り替わる

---

## 76. v227 — 旅程カードのボタンラベル「メモ編集」→「編集」(2026-05-19)

v226 で trip-edit-modal の編集対象が notes/delay → 区間表示/時刻/列車種別/遅延/メモに拡大したが、ボタンラベルは「✏️ メモ編集」のままだった。実態に合わせて「✏️ 編集」に短縮 ([js/13-mypage-common.js:318](js/13-mypage-common.js:318))。モーダルタイトル「✏️ 旅程を編集」と整合。

---

## 75. v226 — 旅程カード「✏️ 編集」を区間・乗車時刻・列車種別まで拡張 (2026-05-19)

### 背景

これまで旅程カードの「✏️ メモ編集」モーダル ([js/13b-trips.js](js/13b-trips.js) `openTripEditModal`) は notes + delay_minutes のみ編集可。**📍 区間 / 🕒 乗車時刻 / 🚆 列車種別** は確認モーダル (保存時) でしか変えられず、後から「あ、これあずさ9号だった」「乗車日を 5/3 ではなく 5/4 だった」といった後追い修正ができなかった。Notion §0 / TODO の「手動記録の旅程カードからの後編集拡張」を消化。

### 変更内容

#### 1. trip-edit-modal を 5 セクション構成へ ([noritetsu-map.html:1280-1361](noritetsu-map.html:1280))

タイトルを「✏️ メモ・遅延を編集」→「✏️ 旅程を編集」に変更。セクション構成:

| セクション | 編集可否 | 備考 |
|---|---|---|
| 📍 区間 | read-only 表示 | `segments[]` を 1. A→B [lineId] 形式で列挙。修正したい場合は削除→再記録ガイド |
| 🕒 乗車時刻 | 手動記録のみ可 | 📅 乗車日 / 🕐 出発 / 🕑 到着。GPS 記録 (verified=true && source='gps_button') はロックして青ヒント表示 |
| 🚆 列車種別 (任意) | 常時編集可 | TRAIN_CATEGORIES ドロップダウン + train_name text + car_model text。簡易入力 (cascading なし) |
| ⏱ 遅延 | 既存 (v185) | 時間 + 分 |
| 📝 自由メモ | 既存 (v184) | textarea |

#### 2. `openTripEditModal` 拡張 ([js/13b-trips.js:184-247](js/13b-trips.js:184))

- 区間: `trip.segments[]` を inline HTML で列挙、空なら from→to のみ表示
- 時刻: `trip.date` / `trip.depart_time` (HH:MM:SS → HH:MM) / `trip.arrive_time` をプリセット
- GPS 記録なら `trip-edit-time-inputs` を hide、`trip-edit-time-lock` の青ヒントを show
- 列車: `NORIRECO.trains.TRAIN_CATEGORIES` から category dropdown を動的構築、現在値を選択状態に

#### 3. `saveTripEdit` 拡張 ([js/13b-trips.js:265-371](js/13b-trips.js:265))

`tripPatch` オブジェクトを構築し、(1) NORIRECO.mypage.state._mypageCache の trip オブジェクトに直接 Object.assign、(2) localStorage の `norireco_trips` 配列に書き戻し、(3) Supabase `PATCH /norireco_trips?id=eq.X` に同期、の 3 経路で更新。

- **時刻ロジック (手動記録のみ)**:
  - date + depart + arrive 全入力 → `date_precision='minute'`、`total_minutes` は日跨ぎ補正で再計算
  - date のみ入力 → 既存 `date_precision='minute'` を `'day'` に下げ、`depart_time` / `arrive_time` / `total_minutes` をクリア
  - 既存が `month` / `year` / `unknown` なら date のみ更新 (精度は据置)
  - GPS 記録は `tripPatch` に時刻フィールドを乗せない (verified 保護)
- **列車種別**:
  - `train_category` / `train_name` / `car_model` を入力値 (空文字 → null) で上書き
  - `train_name` が変わった場合のみ `train_id=null` に倒す (マニア手入力扱い、マイページに 📝 マーク)。train_name 据置なら train_id 維持
- **Supabase 同期**: notes / delay_minutes は schema 未拡張のため `tripPatch` から除外 (これまで通り localStorage のみ)
- **失敗トースト**: Supabase 失敗時は「⚠️ ローカルのみ保存 (Supabase 失敗)」

#### 4. ファイル & バージョン

- `sw.js` CACHE_VERSION v225 → **v226**
- `noritetsu-map.html` / `js/13b-trips.js` のみ変更、他ファイルは無修正

### 設計判断

- **📍 区間編集を先送りした理由**: `segments[]` を編集すると `from_station` / `to_station` / `line_list` / `total_stations` / `transfers` / `RIDDEN_SEGS` / 地図描画まで連鎖して再計算が必要。MVP では「削除→再記録」を案内する方が誤データ生成リスクが少ない。フル区間編集は別タスク (TODO 「区間 編集」項目)
- **GPS 記録の時刻ロック**: GPS 記録は `recorded_at` と `depart_time`/`arrive_time` の整合性が verified の根拠。手動編集を許すと不正検知 ([js/11-fraud-detection.js](js/11-fraud-detection.js)) の前提が崩れるため、UI 側でロック
- **train_id の自動 null 化**: train_name を手で書き換えた瞬間に「マスター由来」ではなくなる。マイページの 📝 マーク (マニア手入力) を活かして、マスター調査・補完候補として後から追跡できる

### 検証

- `npm run check`: 18/18 OK
- 未検証 (次セッションで実機確認): 実際にマイページ旅程カード → ✏️ → 時刻変更 → Supabase に反映されるか、GPS 記録のロック表示が正しく出るか

