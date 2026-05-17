# 乗レコ - 電車旅 更新履歴詳細

各セッションごとの実装ログ・経緯・失敗教訓を時系列で残す詳細メモ。
「いま何がどうなっているか」のスナップショットは Notion §0、次の着手項目は `TODO.md`、各セッションで具体的に何を実装してどこで詰まったかはこのファイルを参照。

## 役割と使い分け

| ドキュメント | 内容 | 更新タイミング |
|---|---|---|
| Notion §0 全体像 | 現在地マップ (SW バージョン・領域別ステータス・直近フェーズ) | セッション末に変化があった部分だけ |
| `TODO.md` | 次の着手項目 (🔥/🟡/🟢/🔧 で分類) | 着手・完了の都度 |
| `CHANGELOG.md` (本ファイル) | セッションごとの実装詳細・失敗教訓・コード変更の経緯 | 各セッション末に新セクション追記 |

## 分割ポリシー

ファイルが長くなり扱いづらくなったら（目安: **1500 行超**、または Phase が一区切りついたタイミング）、過去フェーズを別ファイルに切り出す:
- `CHANGELOG_PHASE1-3.md` — Phase 1〜3 のセッション (§1〜§18 相当) を退避
- `CHANGELOG.md` — 現行 Phase の最新セッションのみ残す
- 切り出し時は本ファイル冒頭に「過去ログは `CHANGELOG_PHASE1-3.md` 参照」を明記
- Notion §0 と `TODO.md` の参照リンクも合わせて更新

## 🎯 今ここ (TLDR — 2026-05-14 夜時点)

**現在の SW**: `v131` / **キャラ**: 7体 / **列車マスター**: 約260種

| 領域 | 状態 |
|---|---|
| 地図描画・営業系統 | ✅ 完成 (Phase 2, v60〜v73) |
| 駅キャラシステム | ✅ 完成 (Phase 2.5, v74〜v88) |
| GPS 認証グラデーション Step a | ✅ 完成 (v89) — source / verified / gps_*/ recorded_at |
| GPS 記録フロー (📍→🔖→終了) | ✅ 安定化完了 (v109〜v116) |
| 列車種別記録 (train_id / car_model) | ✅ 完成 (v117〜v129) — マニア手入力対応 |
| コードベース分割 (`js/01-..〜10-..`) | ✅ 完成 (v130〜v131) |
| Supabase 認証＋ログイン | ❌ 未着手 (🔥 最優先) |
| マイページ (自分の trip 一覧・認証昇格) | ❌ 未着手 (🔥) |
| シェア機能 (OGP) | ❌ 未着手 (🔥) |
| 不正検知 (所要時間チェック) | ❌ 設計のみ (`memory/project_fraud_detection.md`) |

**最初に読むべき節**:
- **§19** セッション 3.6 (v109-v131) の進捗詳細
- **§20** ファイル構成 (`js/` の分割と編集時注意)
- **TODO.md** の 🔥 最優先タスク

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

---

## 18. セッション 3.5 (2026-05-14 後半) の進捗

### 完了したこと（v95〜v108）

| ver | 内容 |
|---|---|
| v95 | Supabase 保存エラー詳細を toast 表示（スマホ調査用） |
| v96 | `tripForSupabase()` で認証フィールドを送信時除外（schema 未対応のため） |
| v97 | Supabase の `norireco_trips` に認証カラム追加完了 → workaround 撤去 |
| v98 | `norireco_character_grants` テーブル新設、獲得履歴を Supabase に保存 |
| v99 | キャラ獲得を Supabase ↔ localStorage 双方向同期 (migration push 含む) |
| v100 | **現在地表示 Phase 1** — 📍 ボタン、青ドット、精度円、3状態トグル |
| v101 | **現在地表示 Phase 2** — 最寄駅検出 + 「ここから記録開始」(GPS 認証 trip) |
| v102 | 最寄駅候補リスト化（1.5km / 6駅 / ラジオ） + 終了→確認→保存フロー |
| v103 | 確認モーダル z-index 修正 + 1駅のみ「訪問」記録対応 |
| v104 | **「📍 ここで終了 (GPS)」** — 終点も GPS 候補から選択モーダル |
| v105 | 記録モード突入時の中間 rec-panel を撤去、最寄駅パネルに「📝 記録中」状態を統合 |
| v106 | trip データに `depart_time / arrive_time / total_minutes` を実装 (GPS 時刻ベース) |
| v107 | 保存後に `toggleRecordMode()` を呼んで記録モード OFF（未完成） |
| v108 | toggleRecordMode else 分岐の DOM 更新を `lastUserGps` 条件外に出した（未完成） |

### 現状の構成

地図画面（noritetsu-map.html）の右下 FAB スタック (下から上):
- 📸 memo
- 🗺️ map mode
- 📝 record
- 🎭 char toggle
- 📍 location
- + / − zoom

地図中央下に表示される最寄駅パネル `nearest-station-panel`:
- 📍 ON + 1.5km 内に駅あり、かつ記録モード OFF → **開始駅選択モード** (候補ラジオ + 「🔖 選んだ駅から記録開始」)
- 記録モード ON → **記録中モード** (出発駅サマリ + 「📍 ここで終了 (GPS)」「× 破棄」)

確認モーダル `rec-confirm-modal` (z-index:9999):
- 経路 / 駅数・区間 / 🕒 時刻 / 🛡 認証バッジ
- 「💾 保存する」「✏️ 戻って編集する」「❌ 破棄する」

### 認証グラデーション（実装済みの全体像）

| ソース | source 値 | verified | gps_lat/lon | キャラ自動獲得 |
|---|---|---|---|---|
| 地図 📝 区間記録（手動のみ） | `manual` | `false` | null | ❌ |
| ログ画面 GPS ボタン | `gps_button` | `true` | あり | ✅ |
| 地図 📍 → 「🔖 記録開始」 → 終了 | `gps_button` | `true` | 開始時 GPS | ✅ |
| 地図 ✨ → 「📍 今ゲット」 | (trip 作らず char_grants のみ) | — | あり | 🎯 直接獲得 |

### Supabase テーブル状態

- `norireco_trips`: 認証フィールド (source / verified / gps_lat / gps_lon / gps_accuracy / recorded_at / date_precision) 追加済み
- `norireco_character_grants`: 新設（id / character_id / station_name / source / granted_at / gps_lat / gps_lon / gps_accuracy）、RLS 無効
- `norireco_memos`: 既存

### 未解決バグ → ✅ §19 で全解消

「保存後に「📝 記録中」パネルが残る」問題は **v109 で根治** (saveMultiSegmentTrip 内 `let tripDate = today;` の `today` 参照が同関数内の `const today` で TDZ ReferenceError を起こしていた)。詳細は §19 参照。

### 次セッションへの推奨アクション

1. `git log --oneline -10` で最新コミット確認
2. **TODO.md 冒頭の 🐛 既知バグ** を読んで原因究明
3. ハードリロード後にスマホ実機 or PC DevTools Sensors で実際の挙動を確認
4. console.log でデバッグして実行パスを追跡
5. 解決したら v109 として push + TODO.md からバグエントリ削除

---

## 19. セッション 3.6 (2026-05-14 夜〜) の進捗 (v109〜v131)

### 完了したこと

| ver | 内容 |
|---|---|
| v109 | **バグ修正**: saveMultiSegmentTrip 内 `let tripDate = today;` の `today` 参照が、同関数内の `const today` で TDZ ReferenceError を起こし、保存処理と toggleRecordMode が両方走らず「📝 記録中」パネルが残っていた問題を解消 (v107/v108 が空振りだった真因) |
| v110 | 保存後に 📍 を自動 OFF にする + GPS が取れない PC でも `recordStartedAt` を fallback に depart_time/arrive_time が入るように |
| v111 | 「ここで終了 (GPS)」で間違った終点を選び直すとエラー区間が残る問題: 末尾区間が error なら末尾駅を toggle off してから新終点追加 |
| v112 | 記録中の最寄駅パネルを「ここで終了 (GPS)」「× 破棄」のミニマル UI に (出発駅サマリ撤去で地図見やすく) |
| v113 | 地図画面の凡例パネル撤去 |
| v114 | 📝 ボタン (手動フロー) では rec-panel UI が出るように分岐復活 (v105 で完全非表示にしていたのを recordStartedViaGPS で分け直し) |
| v115 | 手動フロー記録中、watchPosition が最寄駅パネルを再表示して二重表示になる問題を修正 |
| v116 | rec-panel から重複ボタン「📍 ここで終了 (GPS)」を撤去 |
| v117〜v121 | **trains_master.json** 新規作成 + 約260種に拡充 (新幹線19・特急90+・寝台18・クルーズ3・観光列車60+・SL9・急行18、廃止列車 `discontinued: true` フラグ、戦前〜昭和の伝説特急 legendary) |
| v122 | 記録時の **🚆 列車種別 / 🚃 車両形式** 選択 UI 実装 (確認モーダルにカテゴリ→列車→車両形式の cascading select)。trip に train_id/train_name/train_category/car_model を保存。Supabase schema 未拡張のため tripForSupabase workaround |
| v123 | Supabase に train 系 4 カラム追加完了 → tripForSupabase workaround 撤去 |
| v124 | **マニア向け手入力対応**: 各セレクトの末尾に「📝 リストにない (手入力)」追加。train_id IS NULL かつ train_name IS NOT NULL = マスター未登録の合図 (後で開発側で trains_master 追加 → 既存記録 UPDATE で id 補完できる運用) |
| v125 | 統計タブ「直近の旅程」を拡張: 🟢 認証バッジ、時刻、🚆 列車名、車両形式、📝 手入力マーク表示 |
| v126 | 統計タブに「🚆 列車制覇」セクション追加 (カテゴリ別ridden/total スコアカード、乗った列車タグ、マスター未登録リスト) |
| v127 | **バグ修正**: v126 で `const grid` を重複宣言して JS 全体が SyntaxError で死に地図が真っ黒に → trainGrid にリネーム。**今後は `node -e "new Function(...)"` で必ずシンタックスチェック** |
| v128 | 列車制覇セクションを details/summary 折りたたみから常時展開に |
| v129 | 列車制覇タグに乗った車両形式を併記 `[E353系 · 189系]` |
| v130 | **Phase 1 リファクタリング**: noritetsu-map.html の inline `<script>` 4054行を `js/app.js` に外出し。HTML は 4965→910 行に圧縮。sw.js の Network-First パターンに `.js$` 追加 |
| v131 | **Phase 2 リファクタリング**: `js/app.js` を機能別 10 ファイルに分割 (下記参照) |

### 認証グラデーション・列車種別の完成像

| ソース | source 値 | verified | train_id | train_name | 用途 |
|---|---|---|---|---|---|
| GPS 「🔖 記録開始」 + 列車選択 (マスター) | `gps_button` | `true` | あり | あり | ⭐ 公式統計対象 |
| GPS + 列車手入力 | `gps_button` | `true` | `null` | 手入力文字列 | 公式統計対象だがマスター未収集 |
| 手動 📝 + 列車選択 | `manual` | `false` | あり | あり | 全記録には入る |
| 手動 + 列車選択なし | `manual` | `false` | `null` | `null` | 全記録 |

### Supabase テーブル状態 (v123 以降)

- `norireco_trips`: 認証フィールド + **train_id / train_name / train_category / car_model** 追加済み
- `norireco_character_grants`: 既存
- `norireco_memos`: 既存

### マスター補完運用 (マニア手入力レビュー)

定期的に以下クエリで未収集を確認 → trains_master.json に追加 → UPDATE で既存記録を補完:

```sql
-- 未収集一覧 (件数の多い順)
SELECT train_name, train_category, car_model, COUNT(*)
FROM norireco_trips
WHERE train_id IS NULL AND train_name IS NOT NULL
GROUP BY train_name, train_category, car_model
ORDER BY COUNT(*) DESC;

-- マスター追加後の補完例
UPDATE norireco_trips SET train_id = 'shonan_liner'
WHERE train_name = '湘南ライナー' AND train_id IS NULL;
```

### 全解決済みバグ

v95〜v108 で残っていた「📝 記録中」パネルが残るバグ、その他 GPS フロー周りのバグはすべて解消。TODO.md の 🐛 セクションは撤去可能。

---

## 20. ファイル構成 (v131 以降)

### JS 機能分割 (`js/` ディレクトリ)

依存順 (ロード順) で 01〜10 のプレフィックスを付与。HTML には `<script src>` をこの順に並べる。`.js` は sw.js で Network-First (v130〜) なので開発中の更新は即反映。

| ファイル | 行数 | 主な責務 |
|---|---:|---|
| `js/01-constants.js` | 13 | SVG_W / SVG_H / ISLANDS (日本地図 SVG 用定数) |
| `js/02-data-loaders.js` | 228 | `loadRunningServices` / `loadCharacters` / `loadTrains` + 列車セレクタの UI ロジック (resetTrainSelector / onTrainCategoryChange / onTrainChange / onCarModelChange / 手入力ハンドラ) |
| `js/03-characters.js` | 306 | キャラ獲得・期間限定システム (`checkAndGrantCharacters` / `tryGrantByGPS` / 獲得モーダル) |
| `js/04-gps-location.js` | 992 | 現在地表示 (📍 トグル / 青ドット / 精度円 / watchPosition) / 最寄駅検出 / 「🔖 記録開始」/ `loadMergedStations` / `loadServiceLinesMaster` / `loadLines` |
| `js/05-supabase-data.js` | 342 | Supabase 設定 / trip データ localStorage / 期間フィルタ / `loadDateFilter` / `loadRiddenSegsFromStorage` |
| `js/06-map-leaflet.js` | 172 | Leaflet 初期化 / 国土地理院タイル設定 / マップ DOM |
| `js/07-record-mode.js` | 715 | 区間記録モード (📝) / `toggleRecordMode` / `refreshRecPanel` / `openRecConfirm` / `saveMultiSegmentTrip` / 「ここで終了 (GPS)」フロー |
| `js/08-rendering.js` | 909 | Canvas renderer / LOD / 営業系統ベース描画 / 駅マーカー (キャラ含む) / パイチャート |
| `js/09-tabs-stats.js` | 288 | タブ切替 / 路線一覧 / 統計タブ (達成率・直近の旅程・🚆 列車制覇) |
| `js/10-init.js` | 89 | 初期化エントリ (Promise.all で並列ロード) / SW バージョン管理 / バッジ更新 |

### ルート構成

```
norireco/
├── noritetsu-map.html    # 地図画面 (910行、HTML+CSS のみ)
├── noritetsu-log.html    # ログ画面 (フォーム式記録入力)
├── sw.js                 # Service Worker (キャッシュ戦略)
├── manifest.json         # PWA manifest
├── HANDOFF.md            # セッション間の引き継ぎ (このファイル)
├── TODO.md               # タスクリスト
├── js/                   # 機能別 JS (v131〜)
│   ├── 01-constants.js
│   ├── 02-data-loaders.js
│   ├── 03-characters.js
│   ├── 04-gps-location.js
│   ├── 05-supabase-data.js
│   ├── 06-map-leaflet.js
│   ├── 07-record-mode.js
│   ├── 08-rendering.js
│   ├── 09-tabs-stats.js
│   └── 10-init.js
├── characters/           # キャラ SVG
├── lines-p1.json ...     # 路線データ (Phase 別)
├── running_services.json
├── merged_stations.json
├── service_lines_master.json
├── characters_master.json
└── trains_master.json    # 列車マスター (v117〜、約260種)
```

### 編集時の注意

- **クラシック `<script>` ロード** なので、トップレベルの `let`/`const`/`var`/`function` はすべて同じグローバル環境を共有する (モジュール化していない)
- 別ファイルで宣言した変数も `window.xxx` 経由なしでそのまま参照可能
- **同一スコープでの重複宣言は SyntaxError** (v127 で焼かれた)。複数ファイルにまたがる const/let も同じグローバル Script 環境で名前衝突する
- **編集後は必ず以下でシンタックスチェック**:

```bash
node -e "
const fs=require('fs');
for (const f of ['01-constants','02-data-loaders','03-characters','04-gps-location','05-supabase-data','06-map-leaflet','07-record-mode','08-rendering','09-tabs-stats','10-init']) {
  try { new Function(fs.readFileSync('js/'+f+'.js','utf8')); console.log('OK',f); }
  catch(e) { console.log('FAIL',f,e.message); }
}
"
```

### 次セッションへの推奨アクション

1. `git log --oneline -15` で最新コミット確認
2. このセクション (§19, §20) を読んで構造把握
3. TODO.md の 🐛 セクション撤去 (もう未解決バグはない)
4. 次の優先タスクを TODO.md 🔥 から選ぶ (Supabase 認証 / マイページ / シェア機能 等)

---

## 21. セッション 3.7 (2026-05-15) の進捗 — v132 〜 v157

このセッションで TODO 🔥 最優先のうち **不正検知 / Supabase 認証 / マイページ** を一気に完成させた。詳細統計 11 種類追加、タイムマシン (期間フィルタの全タブ連動) 実装。

### v132 〜 v134 — 不正検知 (所要時間チェック)
- v132: 初回実装。`js/11-fraud-detection.js` 新設、`fraudAssessTrip(trip)` で判定
- v133: 日付タイムゾーンバグ修正 (`localDateStr()` ヘルパー、UTC → ローカル)
- v134: 30 秒未満が素通りバグ修正 + `_elapsed_sec` 秒精度フィールド追加

降格マーカーは `source='gps_button' && verified===false` の不変条件で表現 (Supabase スキーマ変更なし)。

### v135 〜 v137 — ログイン機能 (Supabase Auth)
- v135: Magic Link + Google OAuth + `user_id` カラム migration + 初回ログイン時 backfill
- v136: PC Google ログイン失敗対策 (`flowType: 'pkce'`, `redirectTo` クリーン化)
- v137: 手動 PKCE code 交換フォールバック (SDK auto-detect が動かない環境救済)

SQL マイグレーション: `supabase/migrations/v135_add_user_id.sql` を Supabase Dashboard で実行済。
Site URL: `https://yutsutke.github.io/norireco/`
Google OAuth Client: Google Cloud Console で作成、Supabase Dashboard に貼り付け済。

### v138 〜 v144 — マイページ Phase 2
- v138: マイページタブ追加 (👤)、自分の trip 一覧、🟢 公式完乗率 / ⚪ 全記録完乗率、GPS 後追い認証、削除 UI
- v139: タブ集約 — 統計・路線一覧をマイページ配下に統合 (タブは 🗾 地図 / 👤 マイページ の 2 つに)
- v140: サブタブ (📊 統計 / 🚃 旅程 / 📋 路線) + 旅程フィルタ (期間 / 認証 / 種別)
- v141: 完乗率カード常時表示 + 未ログイン時 FAB (📝📍📸) を非表示
- v142: 数字の重複表記を整理 (旧「全体達成率」削除、「延べ乗車駅数」に名称変更)
- v143: 主指標をユニーク駅 (約 9,000) に変更、系統単位 (10,446) は折りたたみで詳細化
- v144: 完乗率カード消失バグ修正 (`buildServiceLines` を並列 await)

### v145 — 詳細統計 7 種類 (基本)
1. 集計方式の違い (系統単位)
2. 総走行距離 (推定 km)
3. 運営会社別 完乗率 Top 10
4. 地域別 完乗率 (首都圏・関西・中京・新幹線 等)
5. よく乗る路線 Top 10
6. よく訪れる駅 Top 10
7. 認証ステータス分布 (3 色バー)

各カードに ⓘ クリックで解説ポップアップ展開、再クリックで閉じる UX を確立。

### v146 〜 v154 — 詳細統計 #1〜#9 (研究結果反映)
乗り鉄撮り鉄・乗りつぶしオンライン・鉄レコ・駅メモ・Strava を参考に追加:

| ver | 内容 |
|---|---|
| v146 | #1 累計駅数の推移 (月別・年別) |
| v147 | #2 都道府県別 訪問駅数 + 完乗率 (簡易 bbox 判定) |
| v148 | #3 個人記録 (PR) — 連続日数・最長旅程・最早出発 etc |
| v149 | #4 路線タイムライン — 初回/最新/完乗達成日 |
| v150 | #5 駅タイムライン Top 50 — 訪問回数 + 初回/最新訪問日 |
| v151 | #6 利用パターン — 曜日 × 時間帯ヒートマップ |
| v152 | #7 未踏領域 — 未訪問都道府県・未踏ターミナル 47 駅 |
| v153 | #8 車両形式コレクション + ⭐✨ レアリティバッジ |
| v154 | #9 会社別 年別 進捗グラフ |

### v155 〜 v157 — 乗りつぶしタイムマシン
- v155: 4 つ目のサブタブ 🕰 タイムマシン 追加、日付ピッカー + プリセット + スナップショット + デルタ表示
- v156: グローバル過去モード — 「🌍 全タブを過去状態にする」ボタンで地図含む全タブ連動
- v157: 期間フィルタ双方向連動 — 地図ピル ⇄ マイページ、全フィルタモードで紫/青バナー

### マイページ最終構成 (v157)

```
👤 マイページ
├─ ユーザー情報ヘッダ (コンパクト)
├─ 期間フィルタバナー (条件付き表示)
├─ 完乗率カード ピン留め (常時表示)
│   🟢 公式完乗率 (verified, ユニーク駅ベース)
│   ⚪ 全記録完乗率 (manual含む)
│   [▾ 詳細を見る] (16 種類の詳細統計)
├─ サブタブ nav
│   📊 統計 / 🚃 旅程 / 📋 路線 / 🕰 タイムマシン
└─ 各サブタブのコンテンツ
```

### コードベース (v157 時点)

```
js/01-constants.js          (定数 + localDateStr ヘルパー)
js/02-data-loaders.js       (路線/キャラ/列車マスター)
js/03-characters.js         (キャラ獲得・GPS, +user_id)
js/04-gps-location.js       (現在地・最寄駅)
js/05-supabase-data.js      (Supabase + 期間フィルタ + setDateFilter)
js/06-map-leaflet.js        (Leaflet 初期化)
js/07-record-mode.js        (区間記録 + 不正検知連携)
js/08-rendering.js          (Canvas + LOD + 駅マーカー)
js/09-tabs-stats.js         (サブタブ + 統計 + 路線一覧)
js/10-init.js               (初期化 + SW)
js/11-fraud-detection.js    ← v132 新設
js/12-auth.js               ← v135 新設 (Supabase Auth)
js/13-mypage.js             ← v138 新設、約 1500 行に成長
```

### Supabase 状態
- 3 テーブルに `user_id UUID` 列追加済
- norireco_character_grants.user_id は `text` 型のまま (uuid に変換可能だが互換性を保つ)
- 初回ログイン時 (`backfillUserIdForLegacyData`) で全 NULL レコードに自分の uid 自動付与

### 次セッション着手候補

🔥 最優先で残るもの:
- **シェア機能 (OGP 画像生成)** — 達成バッジ画像、verified のみシェア可
- **記録モード認証グラデーション Step b/c** — stop_type 反映、ⓘ 後追い登録 UI (GPS後追いはマイページで完了)

🟡 体験向上:
- **キャラ図鑑タブ** — 所持キャラ + 未獲得 ?
- **stop_type 反映の駅 UI 個人化** (alighted/boarded/passed)
- **駅 UI 情報ハブ化** (4 領域パネル)

★ 低優先 (今日のうち提案、未着手):
- **#10 称号・バッジシステム** (駅メモ風)
- **#12 地球N周分** (累計距離 ÷ 40,075km 小ネタ)
- **#13 OGP 画像生成** (シェア機能と統合)

---

## 22. v173 — データ補修 (2026-05-17)

TODO 🟢 データ充実 の 3 項目をまとめて対応。`service_lines_master.json` のみ変更で JS ロジック改修は無し。

### v173 — 西武池袋線 駅順 / 箱根登山系 表示名・operator_id

**1. 西武池袋線の駅順バグ (飯能・東飯能 入れ替え)**
- `auto_池袋線_西武鉄道` の order 5/6 が `飯能 → 東飯能` になっていたのを `東飯能 → 飯能` に修正
- 線路実測 km: 元加治(36.1)→ **飯能(38.6, switchback)** → **東飯能(39.6)** → 高麗(43.7)
- 飯能で進行方向が反転する Z 字配線のため、地理直線距離だけでは正しい順序が出ない（東飯能は飯能の南東側だが、線路はいったん北上→反転）

**2. 箱根登山系 (小田急箱根) の表示名と operator_id を最新化**
- `auto_鋼索線_小田急箱根`: name `鋼索線` → `箱根登山ケーブルカー`（他社の汎用 "鋼索線" と区別、小田急箱根の公式ブランド名に合わせる）
- `auto_鉄道線_小田急箱根`: name `鉄道線` → `箱根登山電車`
- 両者の `operator_id` を placeholder `op______` → `hakone_tozan` に。地域グループ判定 (`detectServiceLineGroup`) で「首都圏・私鉄（南・西）」にようやく入る
- 駅 (強羅 / 公園下 / 公園上 / 中強羅 / 上強羅 / 早雲山) は 2026-05-17 現在の公式駅名と一致しており変更なし
- 2024-04-01 に 箱根登山鉄道 → 小田急箱根 に社名変更済（運営会社名は反映済、operator_id だけが取り残されていた）

**3. 伊豆箱根鉄道 (駿豆線・大雄山線) の operator_id placeholder を解消**
- `auto_駿豆線_伊豆箱根鉄道` / `auto_大雄山線_伊豆箱根鉄道` の `op_______` → `izuhakone` に
- 関東南西 私鉄グループに正しく分類されるように

### 同社別系統乗換判定 (TODO 🟢 1 つ目) — コード調査結果

> **西武池袋線 ↔ 西武秩父線 のように同社別系統は乗換扱いにすべき** 

調べてみたら、既に**系統 (`service_line.id`) ベース**になっていることを確認。具体的には:

- `js/07-record-mode.js:117 findCommonServiceLines()` — 2 駅両方を含む `SERVICE_LINES` 列を抽出（系統単位）
- `buildSegmentsFromSelection()` — 連続ペアで `chosen[i].id === chosen[j].id` の継続性を見てマージ → 系統が変われば segment が分かれる
- `saveMultiSegmentTrip()` line 578: `transfers: Math.max(0, tripSegments.length - 1)` — segment 数（= 系統数）− 1 が乗換回数
- `js/11-fraud-detection.js fraudExpectedMinutes(trip)` — `trip.segments` を順に処理、各 segment の `lineId` から `SERVICE_LINES` を引いて速度を推定（系統単位）

例: 池袋 → 飯能 → 吾野 → 西武秩父 と選んだ場合:
- pair 1: 池袋, 飯能 → 西武池袋線
- pair 2: 飯能, 吾野 → 西武池袋線（同一系統なのでマージ）
- pair 3: 吾野, 西武秩父 → 西武秩父線
→ 2 segments、乗換 1 回 ✅

`operator` フィールドは UI 表示と地域グループ分類にしか使われておらず、乗換判定や経路推定では `service_lines_master.id` を直接参照している。よって今回 TODO 側の説明 (「会社ベースから系統ベースに見直す」) は古い記述で、実装上は対処済み。TODO.md から該当項目を削除。

### 影響範囲

`service_lines_master.json` のみ変更。JS は無改修。SW 再起動で全クライアントに即反映。

### 残データ補修候補 (v173 では棚卸しのみ)

- `service_lines_master.json` に `operator_id` が `op____` 系の placeholder のまま残る系統が約 277 件あり (横浜市営・京都市営・京福電気鉄道・埼玉高速 等)。`detectServiceLineGroup` の地域グループ分類が「首都圏・ローカル」「その他」にフォールバックしてしまうので、今後一括補修すると路線一覧の見出しが正しく出るようになる
- 距離スキャンでは複数系統に「東京駅」「関」など同名駅が含まれる影響で、駅順バグ検出には系統内の per-line 座標 (`buildPerLineCoordMap`) を使う必要がある。簡易な offline 検査では偽陽性が多くなる（次回検査時の覚え書き）


---

## 23. v174 — 「〜月指定」期間フィルタ追加 + タイムマシン subtab 廃止 (2026-05-17)

「マイページ 🕰 タイムマシン サブタブ」を廃止し、その役割を地図画面の期間フィルタピルに新チップ **「〜月指定」** として統合。日付任意精度のスナップショット選択 → **年月単位** のシンプル UI に置き換え。

### 変更内容

**1. 期間フィルタに `untilMonth` モード追加**

- `js/05-supabase-data.js`:
  - `_lastDayOfMonth(yyyymm)` ヘルパー追加 (`'2024-03'` → `'2024-03-31'`)
  - `filterTripsByDate(trips)` に `mode === 'untilMonth'` 分岐追加 — `from=0000-01-01`、`to=指定月末` で絞り込み
  - `updateDateFilterUI()` に `dfilter-um-label` 反映 (例: `〜2024/03`)
  - `toggleUntilMonthFilter` / `applyUntilMonthFilter` / `closeUntilMonthFilter` を追加
  - year セレクタは過去 15 年 + 今年、month セレクタは 1-12 月

- `noritetsu-map.html`:
  - 期間フィルタピルに新チップ追加: `全期間 / 今年 / 去年 / 〜月指定 / カスタム`
  - 専用 popup `#dfilter-um-pop` (年/月 dropdown + 適用ボタン)
  - select 要素用 CSS 追加

- バナー (`renderMpTimeMachineBanner`): `untilMonth` モード時は `🕰 〜2024/03 までの記録で表示中` と表示

**2. タイムマシン subtab 削除**

- `noritetsu-map.html`: `<div id="mp-sub-timemachine">` 撤去
- `js/13-mypage.js`:
  - サブタブ nav から「🕰 タイムマシン」ボタン削除
  - `applyMpSection` で旧 `'timemachine'` 選択は `'stats'` にフォールバック
  - `_tmDate`、`computeSnapshotUntil`、`renderMpTimeMachineSection`、`renderMpTimeMachineSnapshot`、`updateTmDate`、`applyTimeMachineGlobally`、`clearTimeMachineGlobally`、`shiftDate` を削除 (約 240 行のdead code 除去)
  - `isTimeMachineActive` は残す (バナー表示で使用)、`untilMonth` モードにも対応するように更新
- `noritetsu-map.html` の `mp-tm-controls` 系 CSS (約 30 行) も削除、`mp-tm-banner` 系は残す

### 統計連動の確認

- 統計タブ (`js/09-tabs-stats.js:71`): `filterTripsByDate(rawTrips)` で既に絞り込み済 ✅
- 路線タブ (`renderList()`): `slStats(sl)` → `slRiddenSt` を参照、`applyDateFilter()` で `RIDDEN_SEGS` が再構築されるため絞り込み追随 ✅
- マイページ完乗率カード (`buildCompletionCards`): `filterTripsByDate(trips)` で絞り込み済 ✅
- 旅程タブ (`js/13-mypage.js:1501`): `filterTripsByDate` 適用済 ✅

地図側も `applyDateFilter()` 内で `drawLines()` + `updateOverlays()` を再実行するため、`untilMonth` 設定で当該月までの「乗車路線・乗車駅」のみが描画される。

### ユーザー体験

- **以前**: マイページ → 🕰 タイムマシン サブタブ → 日付選択 → 「🌍 全タブを過去状態にする」ボタンで全タブ反映 (2 アクション + 確認)
- **以後**: 地図画面 上部ピル「〜月指定」→ 年月選択 → 適用 (1 アクション)、地図・統計・路線・旅程 全てが当該月末時点に切替

複雑な日付ピッカー UI を撤去して年月の Select だけにしたので、モバイル含めて操作が軽くなった。

### Phase 3.8 ステータス更新

- ✅ マップ LOD 整理 (v158〜v172)
- ✅ 予讃線 Y 字分岐解消 (v164〜v167)
- ✅ データ補修 (v173)
- ✅ 期間指定機能拡充「〜月指定」+ タイムマシン廃止 (v174)

---

## 24. v175 — 記録モード用語統一「手動記録 / GPS 記録」 (2026-05-17)

「区間記録モード」「自己申告」「GPS 認証」「認証済」などの混在表記を、すべて **手動記録 / GPS 記録** に統一。ユーザー目線で 2 つの記録経路の違いがラベル名だけで分かるようにした。

### 用語マッピング

| 旧 | 新 | 意味 |
|---|---|---|
| 区間記録モード | **手動記録** | 📝 ボタン経由、駅を選んで経路を作る (verified=false) |
| 自己申告 / 自己申告 (manual) | **手動記録** | trip バッジ |
| GPS 認証 / 認証済 | **GPS 記録** | 📍→「ここから記録開始」経由 (verified=true) |
| GPS フロー / 手動フロー | GPS 記録 / 手動記録 | コメント内も統一 |

内部 DB 値 (`source='gps_button' / 'manual'`、`verified`) はそのまま — 既存データとの互換性を維持。

### 変更ファイル

- `noritetsu-map.html`:
  - 📝 ボタン title `区間記録モード` → `手動記録 — 駅をタップして経路を記録`
  - rec-panel タイトル `📝 区間記録モード — 駅をタップして選択` → `📝 手動記録 — 駅をタップして選択`
  - 最寄駅パネル `📍 近くの駅を選んで記録開始` → `📍 近くの駅を選んで GPS 記録開始`
  - 「🔖 選んだ駅から記録開始」 → `🔖 選んだ駅から GPS 記録開始`
  - CSS コメント (`.rec-panel.on`) も更新

- `js/07-record-mode.js`:
  - 確認モーダルのバッジ `🟢 GPS認証` → `🟢 GPS 記録`、`⚪ 自己申告` → `⚪ 手動記録`
  - 不正検知降格トースト `認証を「自己申告」に降格` → `GPS 認証を取り消しました (要確認)`
  - ヘッダコメント「区間記録モード (RECORD MODE)」を「手動記録 / GPS 記録」両方の説明に拡張

- `js/13-mypage.js`:
  - 旅程カードのバッジ `🟢 認証済` → `🟢 GPS 記録`、`⚪ 自己申告` → `⚪ 手動記録`
  - フィルタオプション (認証セレクト): `🟢 公式 (認証済)` → `🟢 GPS 記録`、`⚪ 自己申告` → `⚪ 手動記録`
  - 認証ステータス分布の説明文を更新
  - 都道府県別の説明文中 `verified (GPS認証) のみ` → `verified (GPS 記録) のみ`

- `js/09-tabs-stats.js`:
  - 直近の旅程の 🟢 バッジ title `GPS認証` → `GPS 記録 (認証済)`

- `js/11-fraud-detection.js`:
  - 「GPS フロー」のコメントを「GPS 記録」に統一

- `js/04-gps-location.js`:
  - 「GPS フロー」「手動フロー」のコメントを「GPS 記録」「手動記録」に統一

### Phase 3.8 ステータス更新

- ✅ マップ LOD 整理 (v158〜v172)
- ✅ 予讃線 Y 字分岐解消 (v164〜v167)
- ✅ データ補修 (v173)
- ✅ 期間指定機能拡充「〜月指定」+ タイムマシン廃止 (v174)
- ✅ 記録モード用語統一 (v175)

---

## 25. v176 — 保存ボタンを「手動記録で保存する / GPS 記録で保存する」に (2026-05-17)

経路を確認モーダルの 💾 ボタンが「保存する」だと種別がぱっと見で分からなかったので、`recordStartedViaGPS` を見て動的に切り替え:

- 手動記録の場合: `💾 手動記録で保存する`
- GPS 記録の場合: `💾 GPS 記録で保存する`

`openRecConfirm()` でモーダルを開く直前にラベルを書き換える。`#rec-confirm-save-btn` を追加。

---

## 26. v177 — マップ表示モード切替「両方 / 乗車のみ / 未乗車のみ」 (2026-05-17)

地図ピル下に新トグル追加。乗車区間だけ・未乗車区間だけを切り替えて表示できる。〜月指定 (v174) と組み合わせて「2024 年 3 月時点で乗っていない区間だけ表示」のような旅行計画 / 振り返り体験が可能に。

### 仕様

- 「両方」(`both`): デフォルト。従来通り、未乗車は点線・乗車済は solid + 背景点線
- 「🟢 乗車のみ」(`ridden`): 乗車区間 (solid run) だけを描画
  - 完全未乗車系統は skip
  - 部分乗車系統は背景点線を抑制、solid 乗車区間のみ表示
  - 駅マーカーは乗車駅のみ表示
  - キャラ獲得インジケータも乗車駅のみ
- 「⚪ 未乗車のみ」(`unridden`): 未乗車区間 (点線) だけを描画
  - 完全乗車系統は skip
  - 部分乗車系統は solid 乗車区間を抑制、背景点線のみ表示
  - 駅マーカーは未乗車駅のみ表示
  - キャラ獲得インジケータも未乗車駅のみ (= まだ獲得できていない駅のヒント)

### ファイル変更

- `js/05-supabase-data.js`:
  - `MAP_DISPLAY_MODE_KEY` / `loadMapDisplayMode` / `setMapDisplayMode` / `updateMapDisplayModeUI` を追加
  - `setMapDisplayMode` は localStorage 永続化 + 地図再描画 (drawLines + updateOverlays)
- `noritetsu-map.html`:
  - 期間フィルタピル直下に新ピル `#map-mode-box` (両方/乗車のみ/未乗車のみ) を追加
  - `.map-mode-box` / `.mfilter-chip` / `.mfilter-icon` の CSS を期間フィルタと同スタイルで追加
- `js/08-rendering.js`:
  - `drawServiceLineBase(sl)` に `mode` 分岐を追加 — 完全乗車/完全未乗車の early skip と、部分乗車系統の bg/solid 選択描画
  - `drawStationsLayer()` に `_mapMode` フィルタを追加 — 乗車/未乗車駅のスキップ
- `js/04-gps-location.js`:
  - `drawObtainableIndicators()` にも同モードフィルタを追加 (✨ インジケータが隠れている駅に乗らないように)
- `js/10-init.js`:
  - 起動時に `updateMapDisplayModeUI()` を呼んで前回モードのチップを active 表示

### 〜月指定 と組み合わせた使い方

1. 地図ピル「〜月指定」で 2024-03 を選択 → 2024-03 末時点の達成状態に切替
2. 「⚪ 未乗車のみ」をクリック → 2024-03 末時点で乗っていなかった区間だけ表示
3. 「過去の自分は次にどこへ乗りに行くべきだったか」が地図一面でわかる

### Phase 3.8 ステータス更新

- ✅ マップ LOD 整理 (v158〜v172)
- ✅ 予讃線 Y 字分岐解消 (v164〜v167)
- ✅ データ補修 (v173)
- ✅ 期間指定機能拡充「〜月指定」+ タイムマシン廃止 (v174)
- ✅ 記録モード用語統一 (v175)
- ✅ 保存ボタン記録種別明記 (v176)
- ✅ マップ表示モード切替 (v177)

---

## 27. v178 — 手動記録の乗車日時編集 + 「後追い記録」可視化 (2026-05-17)

「後追い記録モード（時間を空けてから登録）」TODO の第一段。Supabase スキーマ変更なしで、既存フィールド (`date` / `depart_time` / `arrive_time` / `total_minutes` / `recorded_at` / `date_precision`) を UI から編集可能にした。

### 仕様

**1. 記録確認モーダルに時刻編集セクション追加（手動記録のみ）**

- `📋 経路を確認` モーダル内、経路情報の下に展開済の `🕒 乗車日時を入力` セクション
- 入力欄:
  - 📅 乗車日 (date input)
  - 🕐 出発 / 🕑 到着 (time input)
- 初期値は記録モード突入時刻 + 終了時刻 (現行どおりの挙動)
- 入力されたら `saveMultiSegmentTrip` で trip フィールドを上書き
  - `date` ← editDate
  - `depart_time` / `arrive_time` ← `HH:MM:00`
  - `total_minutes` / `_elapsed_sec` ← (到着 − 出発)、日跨ぎ補正あり
  - `date_precision` ← `'minute'` (時刻入力時) / `'day'` (日付のみ)
- GPS 記録のときは時刻が正確なので編集セクション非表示

**2. `recorded_at` (記録した日時) をマイページ旅程カードに表示**

- 旅程カード末尾に `📌 記録: YYYY-MM-DD HH:MM` を追加
- 乗車日と記録日が異なる場合は **`📝 後追い`** バッジを認証バッジの隣に表示
- バッジカラー: 青系 (`#5fb5ff`) — 不正・要確認ではなく中立的な情報マーク

### Supabase スキーマは無改修

- 必要なフィールドは全て既存:
  - `date` (YYYY-MM-DD)
  - `depart_time` / `arrive_time` (HH:MM:SS)
  - `total_minutes` (int)
  - `recorded_at` (ISO timestamp) — `new Date().toISOString()` で自動セット
  - `date_precision` ('day' / 'minute' / 'year')
- 既存データとも完全互換、`date_precision` が `'day'` のままでも OK

### 残タスク

`trip.notes` / `delay_minutes` / `station_notes` の追加（メモ・遅延入力）は別バージョンで対応予定。TODO 「後追い記録モードの拡張」に整理済。

### Phase 3.8 ステータス更新

- ✅ マップ LOD 整理 (v158〜v172)
- ✅ 予讃線 Y 字分岐解消 (v164〜v167)
- ✅ データ補修 (v173)
- ✅ 期間指定機能拡充「〜月指定」+ タイムマシン廃止 (v174)
- ✅ 記録モード用語統一 (v175)
- ✅ 保存ボタン記録種別明記 (v176)
- ✅ マップ表示モード切替 (v177)
- ✅ 手動記録 乗車日時編集 + recorded_at 表示 (v178)

---

## 28. v179 — 記憶の精度 5 段階対応「正確/日付/月/年/不明」 (2026-05-17)

「乗車日を忘れた」「年だけ覚えてる」「年すら覚えてない」などの曖昧な記憶でも記録できるよう、`date_precision` を 5 段階に拡張。

### 5 段階の精度

| 精度 | 入力 | trip.date | trip.depart/arrive | trip.date_precision |
|---|---|---|---|---|
| ⏱ 正確な時刻まで | 日付+出発+到着 | YYYY-MM-DD | HH:MM:SS | `minute` |
| 📅 日付のみ覚えてる | 日付のみ | YYYY-MM-DD | (空) | `day` |
| 🗓 月までしか覚えてない | 年+月 | YYYY-MM-01 | (空) | `month` |
| 📆 年だけ覚えてる | 年だけ | YYYY-01-01 | (空) | `year` |
| ❓ 思い出せない | なし | (今日の日付) | (空) | `unknown` |

Supabase スキーマ無改修。`date_precision` フィールドは既存。`date` は `unknown` のときも今日の日付を入れて Supabase の NOT NULL 制約に対応、フィルタロジックで除外。

### UI 変更

**記録確認モーダル**（手動記録のみ展開）
```
🕒 乗車日時（後追い記録向け）
📐 記憶の精度: [⏱ 正確な時刻まで ▼]
  ├ ⏱ 正確な時刻まで  → 📅 乗車日 + 🕐 出発 + 🕑 到着
  ├ 📅 日付のみ覚えてる → 📅 乗車日
  ├ 🗓 月までしか覚えてない → 年 + 月 セレクタ
  ├ 📆 年だけ覚えてる → 年セレクタ
  └ ❓ 思い出せない → （入力なし、注意書きのみ）
```

セレクタ変更時に `onRecEditPrecisionChange()` で該当行を show/hide、年/月セレクタは過去 20 年分を populate。

**マイページ旅程カード**
- `date_precision` 別の表示:
  - `year` → 「2024年ごろ」 + `〜` 紫バッジ
  - `month` → 「2024年3月ごろ」 + `〜` 紫バッジ
  - `unknown` → 「日時不明」 + `❓` 紫バッジ
  - `day` / `minute` → 従来通り
- `unknown` 精度は recorded_at と日付が必ず違うので `📝 後追い` バッジも表示

### filterTripsByDate の調整

- `date_precision === 'unknown'` の trip は specific フィルタ (thisYear / lastYear / untilMonth / custom) で常に除外
- `all` モードのときだけ表示
- `year` / `month` 精度の trip は date の YYYY-MM-DD で通常通り日付比較される
  - 「2020 年ごろ」(date=2020-01-01) は 〜2020-12 / 〜2021 等で含まれる
  - 「thisYear=2026」 では含まれない（適切）

### Phase 3.8 ステータス更新

- ✅ 手動記録 乗車日時編集 + recorded_at 表示 (v178)
- ✅ 記憶の精度 5 段階対応 (v179)

---

## 29. v180 — 確認モーダル「🕒 時刻」行を記録種別・精度連動に (2026-05-17)

v179 で `❓ 思い出せない` 等を選んでも、確認モーダル上部の `🕒 時刻 23:05 → 23:05 (0分)` 行が記録ボタン押下時刻を表示していて誤解を生んでいたので、記録種別と精度に応じてラベル + 値を動的に書き換えるよう改修。

### 表示パターン

| 状況 | ラベル | 値 |
|---|---|---|
| GPS 記録 | 🕒 乗車時刻 | `08:30 → 09:15 (45分)` (実 GPS 時刻) |
| 手動記録 + minute | 🕒 乗車時刻 | `2026-05-17 08:30 → 09:15 (45分)` |
| 手動記録 + day | 📅 乗車日 | `2026-05-17` |
| 手動記録 + month | 🗓 乗車月 | `2024年3月ごろ` |
| 手動記録 + year | 📆 乗車年 | `2020年ごろ` |
| 手動記録 + unknown | ❓ 日時 | `不明（記録時刻のみ保存）` |

### 実装

- `openRecConfirm` のテンプレート: `🕒 時刻` 行を空のプレースホルダに変更し `#rec-confirm-time-row` で参照可能に
- 新関数 `updateRecConfirmTimeRow()`:
  - `recordStartedViaGPS` を見て GPS / 手動を分岐
  - 手動の場合は `#rec-edit-precision` の値で `minute/day/month/year/unknown` を分岐
  - 入力値が空ならその行を非表示に
- リアクティブ更新トリガー:
  - 精度セレクタの変更 (`onRecEditPrecisionChange` 末尾で呼び出し)
  - 各入力欄 (`oninput` / `onchange`) で `updateRecConfirmTimeRow()` を発火
  - `openRecConfirm` 末尾で初期化呼び出し

### Phase 3.8 ステータス更新

- ✅ 確認モーダル 🕒 時刻行を精度連動 (v180)
