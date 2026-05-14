# 乗レコ（NORITSUBU MAP）プロジェクト引き継ぎ

Cowork → Claude Code への引き継ぎドキュメント。最初の会話でこれを `@HANDOFF.md` で参照させるか、ファイル内容をそのまま渡してください。

**最新状況は §15 〜 §17 を読むのが早い**（2026-05-13〜14 セッションの進捗・新方針）。

---

## 1. プロジェクト概要

日本全国の鉄道路線・駅を扱う乗車記録 PWA（Progressive Web App）。
- 利用者が「乗車した区間」を入力 → 地図上に色付きで可視化
- 達成率（路線完乗率）を集計
- PWA としてインストール可能・オフライン動作
- 駅にキャラを配置（期間限定・ポケモンGO風 GPS 獲得対応）

**ブランド（2026-05-13 確定）**: 乗レコ - 電車旅
- コア機能: 記録・完乗
- 拡張機能: 電車旅のハブ・プラットフォーム

**デプロイ先**: https://yutsutke.github.io/norireco/  
**GitHub リポジトリ**: `yutsutke/norireco`（パブリック・GitHub Pages 配信）
**Notion 開発ノート**: https://www.notion.so/NORITSUBU-MAP-35b71b458b63818494afe7c1ab917ca5（最新方針・ビジネス設計）

## 2. 技術スタック

- フロントエンドのみの単一 HTML アプリ（バックエンドなし、ただし Supabase オプションで同期）
- Leaflet.js 1.9.4 + 国土地理院タイル
- Service Worker（`sw.js`）でキャッシュ＋オフライン
- データソース: N02-25（国土数値情報 鉄道時系列データ）
- ホスティング: GitHub Pages（main ブランチ直配信）
- 同期: Supabase（任意、`norireco_trips` / `norireco_memos` テーブル）

## 3. ファイル構成（リポジトリルート直下）

| ファイル | サイズ | 役割 |
|---|---|---|
| `noritetsu-map.html` | 約 150 KB / 3000+ 行 | **メインの地図画面**（CSS + HTML + JS 全部入り、Phase 2.5・キャラシステム込み）|
| `noritetsu-log.html` | 約 80 KB | 乗車ログ入力画面（GPS 記録ボタン搭載）|
| `sw.js` | 約 6 KB | Service Worker（CACHE_VERSION 管理、現 v94）|
| `lines-p1.json` 〜 `lines-p4.json` | 計約 1.3 MB | 物理路線データ（606 路線・10154 駅、N02-25 由来）|
| `running_services.json` | 約 260 KB | 旧運行系統定義（後方互換、新規参照は不要）|
| `service_lines_master.json` | 約 1.4 MB | **営業系統マスター（637 系統・10450 駅）** ← 描画の真実の源 |
| `merged_stations.json` | 約 2.8 MB | 統合駅マスター（9017 駅、複数路線乗り入れ 926 駅）|
| `characters_master.json` | 約 2 KB | **駅キャラマスター**（id, station_ids, rarity, available_from/until, obtainable_at 等）|
| `characters/*.svg` | 各 1-2 KB | キャラ SVG ファイル（クワテン・ヨウマユ・ヨマツリマユ・コミヤウ・アール・プレーン・タチハナビ・タチユキ の7体）|
| `manifest.json` | PWA manifest |
| `icon-192.png` / `icon-512.png` / `icon.svg` | アイコン |

## 4. データアーキテクチャ

```
N02-25（地理院データ）
  ↓ 加工
lines-p1〜p4.json（物理路線・駅 with branch/o）
running_services.json（運行系統 = 物理路線の組み合わせ）
merged_stations.json（同名近接駅の統合）
  ↓ 読み込み
noritetsu-map.html（全部メモリに展開して描画）
```

- **物理路線**: N02-25 の生データ。例: `「東海道本線_東海旅客鉄道」`
- **運行系統**: 利用者の感覚に近い単位。例: `「JR京浜東北線」`は複数の物理路線をまたぐ
- **branch + o**: 駅順を正確に表現するための支線番号（branch）と駅順番号（o）。polyline 順が壊れる問題を回避するために導入

## 5. デプロイ方法（現状）

リポジトリの `main` ブランチに push すると GitHub Pages が自動配信。
- Claude Code から `git add` / `commit` / `push origin <worktree-branch>:main` で直接デプロイ
- ユーザー全体設定 (`~/.claude/settings.json`) で `Bash(git push origin claude/*:main)` 等を allow 登録済み（自動承認）
- **重要**: `sw.js` の `CACHE_VERSION` を毎回上げないと、ブラウザが古いキャッシュを使う。現在 `v94`
- ヘッダ右側の **`v94 🟢` バッジ** で現在のデプロイ反映状態が一目でわかる（🔄 黄色点滅 = 反映待ち、🟢 緑 = 最新動作中）

## 6. 描画ロジックの重要ポイント

### 駅マーカー（ドット）と駅名（ラベル）の階層表示

`stationTier(nLines, name)` で各駅に重要度を割り当て（tier 1〜6）:
- tier 6: 東京・名古屋・新大阪・札幌・仙台・博多・広島（最重要）
- tier 5: 7 路線以上（新宿・渋谷・池袋等の超ターミナル）
- tier 4: 4-6 路線
- tier 3: 3 路線
- tier 2: 2 路線
- tier 1: 1 路線

ズームレベル × tier で表示判定。`getDotMinTier(z, isMetro)` / `getLabelMinTier(z, isMetro)`。

### 端末判定

- `IS_MOBILE`: iPhone / Android スマホのみ（iPad は除外、PC 扱い）
- `IS_TOUCH`: タッチデバイス全般（iPad 含む）→ ズームボタン非表示等に使う

### 現在の閾値（ユーザー確定済み）

| 端末 | エリア | ドット (全駅) | ラベル (全駅名) |
|---|---|---|---|
| PC/iPad | 首都圏 | z≥12 | z≥13（ドット+1ズーム後）|
| PC/iPad | 地方 | z≥10 | z≥11（ドット+1ズーム後）|
| スマホ | 首都圏 | z≥15（密集対策で遅め）| z≥16 |
| スマホ | 地方 | z≥9（疎なので早く）| z≥11（ドット+2ズーム後）|

ロジックは `getLabelMinTier(z, isMetro) = getDotMinTier(z + offset, isMetro)` で実装。

### isMetro 判定（三大都市圏のbbox）

```js
function isMetroArea(lat, lon) {
  // 首都圏（山手線+周辺）約20×22km
  if (lat >= 35.60 && lat <= 35.78 && lon >= 139.60 && lon <= 139.85) return true;
  // 大阪都心（大阪・京都・神戸の中心部）約20×20km
  if (lat >= 34.65 && lat <= 34.78 && lon >= 135.40 && lon <= 135.60) return true;
  // 名古屋都心（名古屋駅周辺）約15×15km
  if (lat >= 35.13 && lat <= 35.22 && lon >= 136.85 && lon <= 136.97) return true;
  return false;
}
```

### パフォーマンス最適化（重要）

ラベル DOM が大量にあるとズーム/パンが重くなる問題への対策:

1. **`window._allLabels` マスターリスト方式**: 全ラベルを `_allLabels` に保持。`labelLayer` には**実際に表示すべきラベルだけ** addLayer する。表示外は removeLayer で DOM から完全に外す。
2. **ビューポート限定描画**: `updateLOD` の中で `map.getBounds().pad(0.15)` を使い、画面内のラベルのみ DOM に追加。画面外は完全に除外。
3. **ズーム/パン中の DOM 一掃**: `movestart`/`zoomstart` で `labelLayer` を map から完全 remove、`moveend`/`zoomend` で `updateLOD()` 呼んで必要なものだけ復元。

これらは三段重ねで効いている。今これを壊すと一気に重くなる。

### 統合駅マーカー（パイチャート）

`merged_stations.json` で同名近接駅を統合。複数路線が乗り入れる駅は **SVG divIcon でパイチャート表示**（路線色が円グラフ状）。`makePieIcon(colors, sizePx, ridden)` で生成。

注意: 過去にスマホで circleMarker にして「軽くなったけどパイチャートじゃない」とユーザー却下。PC もスマホもパイチャートが必須。軽量化は他の手段で行う。

### UI 表示（2026-05-13 更新）

| | PC | iPad | スマホ |
|---|---|---|---|
| バージョンバッジ `v94 🟢` | ロゴ横 | ロゴ横 | ロゴ横 |
| 期間フィルタピル `📅 全期間/今年/去年/カスタム` | 地図上部中央 | 地図上部中央 | 地図上部中央 |
| 統計ボックス（右上 達成率） | 表示 | 表示 | **非表示**（CSS media query） |
| 凡例ボックス（左上、`top:90px`）| スクロール可 | スクロール可 | **非表示** |
| Leaflet ズームボタン `+/−` | **右下**（FAB スタックの上）| 非表示 | 非表示 |
| FAB スタック（右下、縦並び）| ズーム+/− → 🎭 キャラ ON/OFF → 📝 区間記録 → 🗺️ マップモード → 📸 メモ | 同 (-zoom) | 同 (-zoom) |
| ✨ 獲得可能インジケータ | 駅マーカー真上に金色バブル | 同 | 同 |

凡例は `top:90px / z-index:500`、FAB 群は `z-index:1000`、char-modal は `z-index:9999 !important`。

## 7. 過去に踏んだ落とし穴

### Edit ツールで noritetsu-map.html の末尾が切れる

このセッション中に**3〜4 回**発生。`</script>`, `</body>`, `</html>` が消えて `window.addEventListener('load', ...)` も消失するため、`initMap()` が呼ばれずに地図が真っ白になる。

**Cowork での回避策**: Python スクリプトで `str.replace` してファイル丸ごと書き直し。Edit ツールは使わない。

**Claude Code での予想**: Edit ツールの実装が改善されているので、より起きにくい可能性。ただし**毎回末尾 (`</script></body></html>`) が残っているか必ず grep で確認**してから push してください。

```bash
grep -c '</script>' noritetsu-map.html  # 2 であること
grep -c '</body>'   noritetsu-map.html  # 1 であること
grep -c '</html>'   noritetsu-map.html  # 1 であること
```

復元用のクリーンなバックアップは `noritetsu-map-base.html`（Cowork outputs 内）に保存していたが、Claude Code 環境にはない。**最初に main の最新版を保管しておくこと**を推奨。

### Service Worker のキャッシュ

- `sw.js` の `CACHE_VERSION` を上げないと古い HTML が出続ける
- 直近で `response.clone()` が非同期コールバック内にあるとボディ消費済みで失敗するバグを v33 で修正済み
- 修正後の clone は同期的に行うパターン（`networkFirst` / `cacheFirstSWR` の両方）

### isMetro 領域の bbox

ユーザーは「首都圏範囲は今の 1/3 ぐらいでいい」「都心の超密集エリアのみ」が好み。広げると逆効果。

## 8. ユーザーの好み・進め方

- **日本語**でやり取り。簡潔・直接的なフィードバックを好む。
- 「いまの状態 → こうしたい」を 1〜3 行で言うことが多い。スクリーンショットで状況を共有。
- **小刻みなイテレーション**を好む。1 回の変更を多く詰め込みすぎると後から「これは元に戻したい」となる。
- 過去の遺産（不要 UI、エイリアス）は遠慮なく削除する方針。
- **モバイル UX への配慮**を強く意識（iPhone 14 でのズーム/パン重さが直近の課題だった）

## 9. 直近の状況（このセッション終了時点）

### 直前のデプロイ
- `noritetsu-map.html` のサイズ: 約 90 KB / 1800 行強
- `sw.js` の CACHE_VERSION: `v33`
- 最新の閾値ロジックは「ドット先・ラベル後」で統一済み（このドキュメント §6 の表）

### 残課題（ユーザーから明示はないが想定される）
- `noritetsu-log.html`（乗車ログ画面）の UX 改善はまだ手付かず
- 復元モーダルは残っている（地図画面の「新端末？Notion」ボタンだけ削除）
- スマホでの拡大縮小（ピンチ）の挙動確認
- Supabase 同期周りのエラーハンドリング
- 路線一覧タブ・統計タブの UI が未確認

### 引き続き想定される作業
- ユーザー追加要望ベースの UI 微調整
- 駅名表示の閾値の最終調整（ユーザーが乗りこなしてみて重い/軽いを判断）
- 新規路線（私鉄）の追加キュレート
- ログ画面のフォーム改善

## 12. セッション 2 (2026-05-11〜12) の進捗と現在地

### 全体方向性の変化
N02 物理路線 (606) 中心の設計から、**「営業系統」(運行系統) 中心の設計** に大きく転換した。地図描画・記録 UI・路線セレクト・パイチャートまで全て営業系統ベースに統一。

### 新規追加データファイル
- **`service_lines_master.json`** ← **最重要**
  - 638 系統 / 約 10,300 駅。利用者目線の運行系統を全国網羅
  - スキーマ: `{id, name, operator, operator_id, color, official_line, alias, stations, candidateN02Ids等}`
  - 自動生成 (`auto_<n02_id>(_bN|_sN)?` 形式) ≈ 600 系統 + 手動キュレーション約 30 系統
  - N02 駅名と完全一致 (不一致 0 駅) を維持しているので、ここを編集する場合は必ず駅名検証

### service_lines_master の作り方
1. **AUTO_GEN_EXCLUDE** に登録した 12 路線 (東海道線/東北線/山手線/中央線/総武線/横須賀線/高崎線/常磐線/赤羽線/東海道線(西)/山陽線(西)/大阪環状線(西)) **以外**は N02 物理路線から 1:1 で自動生成
2. 上記 12 路線分は **Phase B 手動キュレーション**で運行系統を作成 (京浜東北・根岸線、宇都宮線、高崎線、横須賀線、埼京線、中央・総武各駅停車、総武快速線、常磐線快速/各駅停車/中距離、琵琶湖線、山陽本線、東海道線(東京〜熱海)、中央本線(東京〜塩尻)、中央本線(辰野支線)、総武本線(銚子〜千葉)、東北本線(黒磯〜盛岡)、東北本線(利府支線))
3. 直通先まで運行系統として延長: 両毛線(高崎)、男鹿線(秋田始発)、仙山線(山形始発)、八高線(高崎)、内房線(千葉始発)、上野東京ライン(熱海〜宇都宮/高崎)、湘南新宿ライン(小田原〜宇都宮、逗子〜高崎) 等

### 路線名・駅順の正規化ルール
- 「○○線」→「○○本線」(鹿児島本線/紀勢本線/信越本線/東海道本線/山陽本線/中央本線/東北本線/関西本線/山陰本線/日豊本線/長崎本線/函館本線/室蘭本線/根室本線/宗谷本線/石北本線/釧網本線/北陸本線/久大本線/豊肥本線/高山本線)
- 支線は「（支線N）」ではなく具体名「(羽衣支線)」「(浜川崎支線)」「(空港支線)」「(常陸太田支線)」「(砂原支線)」「(二俣支線)」 等
- 私鉄: 「本線」→「京急本線」/「京成本線」/「南海本線」「阪神本線」等のように会社略称 prefix
- 東京地下鉄: 「2号線日比谷線」→「東京メトロ日比谷線」
- 大阪市高速電気軌道: 「1号線(御堂筋線)」→「大阪メトロ御堂筋線」
- 東京都: 「1号線浅草線」→「都営浅草線」、「荒川線」→「都電荒川線」
- 阪急: 「神戸線」→「阪急神戸本線」、「京都線」→「阪急京都本線」、「宝塚線」→「阪急宝塚本線」(正式路線名「本線」付加)

### 主要な実装パターン
- **`buildPerLineCoordMap()`**: N02 物理路線ごとの「駅名→座標」マップ。**キーは `line.id`** (同名・別会社の路線を区別)。**同 line.id N02 エントリ (富山地方鉄道本線の鉄道線+軌道線 等 10 路線) は station をマージ**
- **`resolveServiceLineCoords(sl, perLineMap)`**: 営業系統の各駅座標を解決。優先順位 = `idMatch` (sl.id が `auto_<n02_id>` 形式なら N02 id 強マッチ) > 駅名重なり >=2 > `official_line` 一致
- **`deriveN02IdFromAutoId(slId)`**: `auto_<n02_id>(_bN|_sN)?` → N02 id を取り出す regex 処理

### `merged_stations.json` の構造変更
パイチャート用統合駅マスター。**新形式**:
```json
{
  "name": "東京", "lat": ..., "lon": ...,
  "lines":  [...service line id 配列...],     // 視覚化用 (パイチャート色)
  "colors": [...service line color 配列...],
  "n02_lines": [...N02 物理路線 id 配列...]    // 索引用 (mergedStationMap のキー)
}
```
- 9017 駅、乗り入れ複数 926 駅 (東京 14系統、大宮/横浜 13系統、新宿 12系統等)
- 地図画面の `mergedStationMap` は **`n02_lines` で索引** する (描画は N02 を回すため)
- ツールチップは **`SERVICE_LINES` を優先で引いて運行系統名表示** (lazy 評価で `_linesTextFn()` 関数)

### 地図画面 (`noritetsu-map.html`) の新機能
1. **🚆 ボタン**: 営業系統オーバーレイ (起動時に自動構築)
2. **📝 ボタン**: 区間記録モード - クリック詳細は §13
3. **路線一覧タブ・統計タブ**: 営業系統ベース (`slStats`, `slGlobalStats`, `detectServiceLineGroup`)
4. ヘッダー「達成率 X% / N系統 / 完乗 N系統」も営業系統ベース
5. 凡例: 乗車済み営業系統を達成率降順で表示

### ログ画面 (`noritetsu-log.html`) の新機能
- `loadAppData` が `service_lines_master.json` から LINES (営業系統) を構築
- `LEGACY_LINE_ID_ALIAS`: 旧 lineId (N02 物理路線 id) → 新 lineId (auto_<id>) の透過解決
- `detectGroupByStations`: 駅座標 + operator_id で地域グループを自動判定 (首都圏・JR / 関西 / 東海・中部 / 東北 / 九州 / 北海道 / 四国 / 中国・山陰 / 新幹線 等)
- `canonicalOperator`: 表示時の運営会社名正規化 (東日本旅客鉄道 → JR東日本 等)
- `lineSortKey`: グループ内で運営会社 → 路線名 → 本線/支線 の順にソート

## 13. 区間記録モード 📝 の仕様 (このセッションで実装)

### 操作フロー
1. 地図画面右下 📝 ボタンタップで記録モード ON (カーソル crosshair、左下にパネル出現)
2. 駅ドット (パイチャート/単色) をタップで選択 (黄色いリングがつく)
3. 2 駅目以降を追加していくと**経路として自動連結**:
   - 連続2駅ペアごとに **共通の営業系統 (`findCommonServiceLines`)** を判定
   - 同一路線が連続するペアは1区間にマージ
   - 路線継続性を優先 (前ペアと同じ路線が候補にあれば優先採用)
4. 各区間に**複数候補がある場合は選択 dropdown** (例 渋谷→新宿は 山手線/埼京線/副都心線)
5. 「🔖 この経路を記録」で Supabase + localStorage に保存
6. 即時マップに反映 (色付き乗車済みスタイル + 達成率更新)

### 重要な内部関数
- `buildSegmentsFromSelection()`: 駅列 → 区間リスト
- `pairLineChoices: Map<pairIdx, lineId>`: ユーザー手動選択を記憶
- `changeSegmentLine(segIdx, lineId)`: 区間の路線切替
- `saveMultiSegmentTrip()`: 複数区間を 1 trip として保存 (transfers = segs.length - 1)
- `attachStationDotClick(dot, line, s)`: 駅ドットに直接クリックハンドラを付与 (drawSingleLine 内 3 箇所で呼ぶ)
- `resolveByServiceLine(slId, fromName, toName)`: 新形式 trip を SERVICE_LINES から N02 riddenSt へ展開 (rebuildRiddenStations が使用)
- `redrawAllLinesAfterTripChange()`: 記録後の地図全体再描画 (drawLines() を呼ぶ。`drawnMergedStations.clear()` 必須なので drawLines 経由がベスト)

### 記録 trip データ形式 (ログ画面と互換)
```json
{
  "id": "trip_<timestamp>",
  "date": "2026-05-12",
  "name": "山手線 ▸ 中央線快速 渋谷→東京",  // 単一なら「○○線 A→B」、複数なら ▸ 連結
  "from_station": "渋谷", "to_station": "東京",
  "total_stations": 9,
  "transfers": 1,                            // 区間数 - 1
  "line_list": "山手線 ▸ 中央線快速",
  "segments": [
    {"lineId": "jr_yamanote_line", "from": "渋谷", "to": "新宿"},
    {"lineId": "jr_chuo_rapid",   "from": "新宿", "to": "東京"}
  ]
}
```

## 14. 次セッション開始時の推奨アクション

1. `git log --oneline -30` で直近のコミットを確認
2. `HANDOFF.md` (このファイル) を再読
3. `service_lines_master.json` の `service_lines.length` を確認 (現在 638 前後)
4. 着手したい候補:
   - **既知の N02 inline-支線問題の解消** (利府支線と同パターン): 鹿児島本線貨物分岐、信越線 横川以北、紀勢線 など。N02 でブランチを分けると本線ポリラインがきれいになる
   - **直通系統の追加** (Fライナー = 元町中華街〜小川町/小手指、半蔵門線↔田園都市線↔東武スカイツリーライン、東急目黒線↔南北線/三田線↔埼玉高速 等)
   - **新幹線の網羅** (北陸新幹線・九州新幹線・西九州新幹線・北海道新幹線・山形新幹線・秋田新幹線) — auto-gen されてはいるが、東京〜博多のように複数の物理路線にまたがる運行系統を「東海道・山陽新幹線」として手動連結すると分かりやすい
   - **記録モードの拡張**: 経路プレビュー線の描画、保存後の trip 一覧表示・削除、駅長押しで詳細パネル
   - **描画パフォーマンス改善**: 638 系統 × 2 層 polyline は重い。canvas renderer 化、可視範囲限定描画など
   - **路線一覧タブの絞り込み UI**: 営業系統が 638 もあるとスクロールが大変

### このセッションで注意すべき罠
- **noritetsu-map.html / noritetsu-log.html を Edit する際は CRLF/LF 改行と全角空白に注意**。Python スクリプトで書き換える際にヌルバイトを混入させた事例あり (修正済み)
- **`sw.js` の `CACHE_VERSION` を必ず上げる**。Service Worker のキャッシュが古いと「修正反映されない」の原因 No.1
- **GitHub Pages の反映は 30秒〜2分程度**かかる。push 直後に curl で確認すると確実
- **新規 trip の lineId は `service_lines_master` の id** を使う。旧 N02 物理路線 id (`東海道線_東日本旅客鉄道`) も `LEGACY_LINE_ID_ALIAS` で透過解決されるが、新規入力は新形式で
- **`buildServiceLines()` は非同期で構築される**。初回構築前に他の処理が走ると未解決のまま。`rebuildRiddenStations()` を構築後に呼び直す処理を入れてある

## 10. ローカル開発の始め方

```bash
# リポジトリを取得
git clone https://github.com/yutsutke/norireco.git
cd norireco

# ローカルプレビュー（Service Worker 動作も含めて）
python3 -m http.server 8000
# → http://localhost:8000/noritetsu-map.html
```

ハードリロード（Cmd/Ctrl+Shift+R）で SW キャッシュをバイパスして最新コードを確認できる。

## 11. Claude Code で最初に伝えると良いこと

```
このリポジトリ（yutsutke/norireco）は、日本全国の鉄道路線・駅を扱う乗車記録 PWA「乗レコ」です。
HANDOFF.md に全体の文脈・直近の実装・落とし穴をまとめてあります。まずこれを読んでください。

直近の作業履歴は git log で見られます（Cowork から手動アップロードしてきたので
コミットメッセージは "Add files via upload" ばかりですが、ファイルの中身は最新です）。

今後は git push で直接デプロイしたいです。
```

これを最初の会話の冒頭で渡せば、Claude Code 側で `HANDOFF.md` を `Read` で読んで完全に文脈復元できます。

---

## 15. セッション 3 (2026-05-13〜14) の進捗

### Phase 2: 地図描画を営業系統ベースに完全切替（v70〜v73）

- 旧 N02 物理路線中心の `drawSingleLine()` → 撤去
- 新ベース:
  - `drawServiceLineBase(sl)`: 1営業系統のポリライン描画（branch/o ロジック不要、`sl.stations` の順そのまま）
  - `drawStationsLayer()`: 全駅マーカー+ラベルを mergedStations から1パスで描画
  - `slRiddenSt[sl.id]`: 営業系統 id → 乗車駅 Set
- 🚆 ボタン撤去（常時 service line base になったため）
- LOD（tier × isMetro）は完全維持

### Phase 2.5: 駅 UI 個人化（v74〜v75）

- `slVisitCount[駅名]`: 訪問回数集計（`rebuildRiddenStations` 内）
- 個人化レベル: `getStationLevel(visits)` → 0/1/2/3/4
  - Lv1 (1-4回): 通常乗車済み
  - Lv2 (5-9回): 金色内側リング、サイズ+1
  - Lv3 (10-49回): 金色外輪、サイズ+2
  - Lv4 (50+回): パルスする金色ハロー、サイズ+4
- `makePieIcon(colors, sizePx, ridden, level)`: level 引数追加

### 駅キャラクターシステム（v76〜v88）

**データソース:** `characters_master.json` + `characters/*.svg`

```json
{
  "id": "kuwaten",
  "name": "クワテン",
  "subtitle": "八王子市",
  "description": "桑×天狗。八王子の養蚕業と高尾山天狗の融合。",
  "station_ids": ["八王子"],
  "svg_path": "characters/kuwaten.svg",
  "rarity": "common",          // common / rare / limited
  "default_unlocked": true,    // false なら locked 状態で開始
  "unlock_condition": null,    // 将来用
  "available_from": null,      // 期間限定の開始日
  "available_until": null,     // 期間限定の終了日
  "obtainable_at": ["八王子"], // 期間限定の取得対象駅
  "colorable": false,          // 将来: 色変更対応
  "default_color": null
}
```

**主要 API（noritetsu-map.html 内）:**
- `loadCharacters()`: 起動時に master + 各 SVG を並列ロード
- `getStationCharacter(stationName)`: 駅の代表キャラを返す（所持済みのみ、ユーザー選択優先）
- `getStationCharacterChoice / setStationCharacterChoice`: 駅ごとの選択を localStorage 永続化
- `isCharacterOwned(id) / isCharacterAvailable(meta)`: 所持・期間チェック
- `grantCharacter(id) / revokeCharacter(id)`: 獲得・取消、地図再描画トリガー
- `makeCharacterIcon(char, lineColors, ridden, level)`: キャラ中心 + 細い路線色ドーナツリング
- `makePieIcon(colors, sizePx, ridden, level, character)`: character あれば makeCharacterIcon に委譲

**駅クリック → モーダル:**
- 通常モード時、所持キャラあれば openCharModal、なければ locked preview として開く
- モーダル内: 大型キャラ表示・駅情報・訪問回数・乗り入れ系統・🎭 キャラ切替サムネ・🔒 未獲得キャラ
- 期間限定キャラには「📍 今ここ！」/「📍 今ゲット」GPS 獲得ボタン
- 🎭 ボタン (FAB) で表示 ON/OFF 切替

**現在のキャラ 7体:**
| キャラ | 駅 | レアリティ | 期間 |
|---|---|---|---|
| クワテン | 八王子 | common | 常時 |
| ヨウマユ | 八王子 | common | 常時 |
| ヨマツリマユ | 八王子 | limited | 2026-05-10〜2026-08-15 |
| アール・プレーン 2.0 | 立川 | common | 常時 |
| タチハナビ | 立川 | limited | 2026-05-10〜2026-08-31 |
| タチユキ | 立川 | limited | 2026-05-10〜2027-02-15 |
| コミヤウ | 小宮 | common | 常時 |

### 認証グラデーション Step a（v89）

trip データに Notion §「記録モード設計」既定スキーマを追加：

```json
{
  "id": "trip_...",
  "segments": [...既存...],
  "source": "manual" | "gps_button" | "ic_card",
  "verified": false,            // 認証済みフラグ
  "gps_lat": null,              // GPS 使用時のみ
  "gps_lon": null,
  "gps_accuracy": null,
  "recorded_at": "2026-05-13T10:35:00",
  "date_precision": "day"       // day / month / year / unknown
}
```

- 地図画面 📝 区間記録 → `source: "manual"`, `verified: false`（⚪ 自己申告）
- ログ画面 GPS 使用時 → `source: "gps_button"`, `verified: true`（🟢 弱認証）
- 既存 trip は後方互換（フィールド未定義 = falsy 扱い）

### ポケモンGO風 GPS 獲得（v89〜v92, v94）

- モーダル内「📍 今ここ！」/「📍 今ゲット」ボタン → GPS 位置取得 → 駅から半径以内なら即 grant
- 半径: 現在は **1km（テスト中）**、本番は `max(300m, accuracy+100m)` に戻す予定
- 距離計算: Haversine（`distMeters(lat1, lon1, lat2, lon2)`）
- マップ上の **✨ 金色バブル**: 期間限定キャラ獲得可能駅の真上に配置、パルスアニメ、複数件は右上にバッジ
- モーダル冒頭の **「✨ ここで獲得できる！」プロンプト**: 未獲得 locked キャラあれば最上部に大型 CTA 表示
- 未訪問駅でもクリック可能（locked preview として）
- 獲得時はトースト通知 `.char-grant-toast`（金色ボーダー + cubic-bezier バウンス、4.5秒で自動消滅）

### trip 自動獲得（v89）

`checkAndGrantCharacters()`: `verified === true` の trip の from/to を抽出し、obtainable_at と一致する未獲得キャラを自動 grant。初回ロード後・Supabase 同期後・trip 保存後に呼ぶ。

### UI 改修（v66〜v72, v94）

- v66: 期間フィルタピル（`📅 全期間/今年/去年/カスタム`）→ `trip.date` でフィルタ、`localStorage.norireco_date_filter` 永続化
- v67-v69: バージョンバッジ `vXX 🟢/🔄`（両画面）→ SW の CACHE_VERSION と最新 sw.js を比較
- v70-v73: Phase 2 + dead code 削除
- v71-v72: FAB スタック整列、ズームボタン左上→右下に統合
- v77: 🎭 キャラ表示 ON/OFF トグル（localStorage 永続化）
- v94: モーダル冒頭プロンプトのモバイル対応（flex-wrap + media query、ボタン下段折返し）

## 16. Notion 開発ノート 2026-05-14 新方針

Notion で大幅にビジョンが拡張された。実装はまだだが、設計判断時に意識する。

### ブランド（確定）
```
プロダクト名：乗レコ
サブタイトル：電車旅
コア機能：記録・完乗
拡張機能：電車旅のハブ・プラットフォーム
```

### 駅 UI の情報ハブ化（4領域パネル）

駅タップで以下の 4 領域を表示する設計（実装は将来）：
1. **自分の記録**: 乗降回数・最終訪問日・路線別記録・メモ・写真
2. **公的情報**: 時刻表・ホーム番号・出口・運行状況・Wikipedia
3. **周辺情報**: Google Maps 連携・駅周辺店舗・乗換案内
4. **個人メモ**: 自分のメモ・写真・訪問時のエピソード

シーン別: 乗車前 → 乗車中 → 降車後 → 乗換時 でそれぞれ違う情報を出す。

### 位置情報（現在地表示）

`navigator.geolocation.watchPosition` で青ドット + 精度円 + 追従モード（Google Maps 風）。Phase 1（半日）= 現在地表示のみ、Phase 4 = 駅近自動記録通知まで段階拡張。

### 列車種別の記録（train_type）

「あずさ」「四季島」など列車名を `train_type` として記録。**乗車記録に1フィールド追加するだけ**で対応可能。列車マスター `trains_master.json`（仮）に 100〜150 種別を格納（category: shinkansen/limited_express/express/rapid/local/sleeper/cruise_train/joyful_train/seasonal、rarity: common/uncommon/rare/legendary）。

手動選択 → 提案 → AI 自動判定（プレミアム）の3段階。

### AI 自動列車判定（プレミアム機能・月 300 円）

GPS 軌跡 + Web 検索（時刻表） + Claude Haiku で「あずさ9号」レベルまで特定。
- 無料版: 手動列車種別選択
- 有料版: AI が GPS から自動判定 + 認証バッジ自動付与
- コスト構造: 1乗車 約2円 × 月20回 = 月40円コスト、課金300円 → 月260円利益/人

### 文脈型タイミング広告

「電車旅」のタイミング 5 段階で広告/情報を出し分け：
1. 出発前: 目的地天気・宿空室
2. 乗車前: 駅弁ランキング・駅構内店舗
3. 乗車中: 目的地観光・到着駅タクシー
4. 到着前 (10 分): 送迎手配・周辺レストラン
5. 到着後: 駅周辺飲食・観光バス

CPM 350 円（通常）→ 2,000-5,000 円（文脈型）期待。広告 + アフィリエイト（楽天トラベル 10% / GO 15% 等）の2本立て。

### 提携戦略

予約システム（宿・タクシー・レンタカー・レストラン・体験）は**自前で作らず、楽天・GO・Booking 等と提携**。乗レコは「情報のハブ」に専念。

### グローバル展開・道路版・自動運転時代

長期ビジョン（5〜10 年）。プロダクト名「乗レコ」は不変、サブタイトルを「電車旅」→「移動の記録」→「あなたの移動ライフ」と進化させる。道路版は宿場町・道の駅・国道完走を「駅・路線・完乗」のメタファーで再現。

## 17. 現在の構成要素まとめ（2026-05-14 時点）

### グローバル状態（noritetsu-map.html 内）

| 変数 | 役割 |
|---|---|
| `LINES` | N02 物理路線（606本）。lazy load 後の coord 解決用、描画には使わない |
| `SERVICE_LINES` | 営業系統（637 + α）。**描画と完乗計算の真実の源** |
| `MERGED_STATIONS` | 統合駅（9017）。マーカー描画のループ対象 |
| `mergedStationMap` / `slMergedStationMap` | N02 / SL 索引のマップ |
| `RIDDEN_SEGS` | 全 segment 配列 (lineId/from/to)、trip から build |
| `riddenSt[n02_id]` | N02 keyed の乗車駅 Set（rebuild 内部で使用） |
| `slRiddenSt[sl_id]` | **営業系統 id → 乗車駅 Set**（primary）|
| `slVisitCount[stationName]` | 駅名 → 訪問回数（個人化レベル判定用）|
| `CHARACTERS` / `stationCharMap` | キャラマスター + 駅→キャラリスト |
| `charModeOn` | 🎭 キャラ表示 ON/OFF |

### 主要関数（noritetsu-map.html 内）

```
データロード:
  loadServiceLinesMaster / loadLines(p) / loadMergedStations / loadCharacters
  buildServiceLines / rebuildRiddenStations (slRiddenSt + slVisitCount 同時更新)

描画:
  drawLines (master 関数)
    → drawServiceLineBase(sl) × 637
    → drawStationsLayer (mergedStations を 1 パス)
       → makeCharacterIcon or makePieIcon (level に応じて)
       → attachStationDotClickV2 (record/memo/locked-preview/grant)
    → drawObtainableIndicators (✨ 金色バブル)

キャラ獲得:
  isCharacterOwned / isCharacterAvailable / grantCharacter / revokeCharacter
  getStationCharacterChoice / setStationCharacterChoice (駅ごとの選択)
  checkAndGrantCharacters (verified trip から自動 grant)
  tryGrantByGPS (Pokemon GO 風)
  showCharacterGrantToast

モーダル:
  openCharModal (character or locked preview)
    → renderRarityBadge / 期間表示 / 乗り入れ系統表示
    → "✨ ここで獲得できる！" プロンプト (CTA)
    → 🎭 切替サムネ + 🔒 未獲得サムネ

ログ画面 (noritetsu-log.html):
  detectNearest (GPS で最寄駅検索)
  saveToLocalStorage (Notion 既定スキーマで保存、GPS 使用なら verified: true)
```

### push 運用

- ユーザー全体設定 (`~/.claude/settings.json`) で `Bash(git push origin claude/*:main)` 等 allow 済み
- コミット + push は確認なしで進めて OK（自動承認）
- 大規模リファクタや破壊的変更は事前に方針確認
- 詳細はメモリ `feedback_deploy.md` 参照

### 次セッション着手前のおすすめ

1. `git log --oneline -20` で直近を確認
2. ヘッダのバージョンバッジで現状デプロイ状態を確認
3. **TODO.md の 🔥 最優先セクション**を読んで次の着手項目を選ぶ
4. Notion 開発ノートで方針確認（5/14 大幅追記された）
