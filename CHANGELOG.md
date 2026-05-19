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

---

## 30. v181 — 後追い記録モード拡張: メモ・遅延入力 (2026-05-18)

v178 で「乗車日 / 出発 / 到着」の手動入力が入り、後追い記録の骨格は揃った。残るのは「現場で書き留めたかった情報」を保存するレイヤー。今セッションでは **自由メモ (notes)** と **遅延分 (delay_minutes)** の 2 つを確認モーダル + マイページに乗せた。駅メモ (jsonb) は構造設計が大きいので別タスクに残す。

### 何ができるか

確認モーダル (`rec-confirm-modal`) の列車選択直下に「📝 メモ・遅延 (任意)」セクションを追加：
- **⏱ 遅延 分** (number input, 0–999)
- **自由メモ** (textarea, 2 行分の高さ、`white-space:pre-wrap` で改行も保持)

手動記録・GPS 記録どちらの保存フローでも入力可。マイページ旅程カードでは：
- 遅延が 1 分以上 → ヘッダに `⏱ N分遅れ` ゴールドバッジ
- メモがあれば駅キャラ等の下に `📝 …` の青ライン引きブロックで全文表示

### trip スキーマ

```js
trip.notes          // string | null  — 自由メモ
trip.delay_minutes  // number | null  — 到着遅延分 (0..999)
```

null を採用したのは Supabase 側で `IS NULL` フィルタが扱いやすく、空文字との混在を避けるため。

### Supabase スキーマ未拡張中の workaround

v122→v123 と同じパターンで `tripForSupabase(trip)` を 07-record-mode.js に新設し、`POST /norireco_trips` の body 生成前に `notes` / `delay_minutes` を除外する。localStorage には全フィールドが保存される。

```js
function tripForSupabase(trip) {
  const { notes, delay_minutes, ...rest } = trip;
  return rest;
}
```

**スキーマ追加 SQL** (Supabase SQL Editor から実行):

```sql
ALTER TABLE norireco_trips
  ADD COLUMN notes text,
  ADD COLUMN delay_minutes integer;
-- (PostgREST schema cache reload)
NOTIFY pgrst, 'reload schema';
```

実行後にこの workaround を撤去し、`JSON.stringify(trip)` 直渡しに戻す予定（次セッション）。

### 影響範囲

- `noritetsu-map.html`
  - 確認モーダルに `#rec-memo-section` / `#rec-edit-delay` / `#rec-edit-notes` を追加
  - `.mp-badge.delay` (ゴールド) / `.mp-tcard-notes` (青ライン引き pre-wrap) スタイル追加
- `js/07-record-mode.js`
  - `tripForSupabase` 関数追加 (window 公開)
  - `openRecConfirm` 末尾でメモ・遅延欄をリセット
  - `saveMultiSegmentTrip` で trip に `notes` / `delay_minutes` を詰め、Supabase 送信時のみ `tripForSupabase(trip)` 経由
- `js/13-mypage.js`
  - 旅程カードレンダリングに `delayBit` バッジ + `notesLine` ブロックを追加
  - メモは `document.createElement('div').textContent` 経由で最低限の HTML エスケープ

### 後追い記録モードの残タスク (TODO に残す)

- 駅メモ (`station_notes` jsonb) — 駅ごとのトイレ/混雑/出口位置メモ。構造が複雑なので別セッション
- ノリレコログを地図画面のタブに統合（メモ後追い記入の主導線）

### Phase 3.8 ステータス更新

- ✅ 後追い記録モード拡張 (メモ + 遅延) (v181)

---

## 31. v182 — 統計タブ「📌 直近の旅程」 + 旅程タブ並び替え (2026-05-18)

v181 のメモ・遅延が「マイページ旅程タブを開くと最新カードに出る」だけだと統計タブから直行できず動線が遠かった。
そこで **統計タブに「📌 直近の旅程」セクション** を追加し、recorded_at が最新の旅程カードを 1 件だけフル表示する。同時に **旅程タブに並び替えセレクタ** を追加して「乗車日／駅数／乗車時間／記録日／遅延」の 5 軸で並べ替え可能にした。

### 直近の旅程セクション (統計タブ)

`buildRecordsRanks` (履歴ミニ表) と並んで、`buildRecentTripCard(trips)` を「🏆 個人記録 (PR)」の直前に挿入。
- 中身は `tripCardHtml(latest)` 1 件だけ
- 旅程タブと同じカード見た目 → メモ・遅延・後追いバッジ・列車種別・GPS 認証ボタン等が全て表示される

これに合わせて `buildTripList` のループ本体を **`tripCardHtml(trip)` という関数** に抽出。`buildTripList` は `trips.map(tripCardHtml).join('')` を innerHTML に詰めるだけになる。

```js
// 抽出後
function tripCardHtml(trip) { /* ... 旧ループ本体 ... */ return `<div class="mp-tcard" ...>...</div>`; }
function buildTripList(trips) {
  const list = document.createElement('div');
  list.className = 'mp-trip-list';
  list.innerHTML = trips.map(tripCardHtml).join('');
  return list;
}
function buildRecentTripCard(trips) {
  if (!trips || trips.length === 0) return '<div class="mp-empty-s">乗車記録がありません</div>';
  const latest = [...trips].sort((a,b) => (b.recorded_at||b.date||'').localeCompare(a.recorded_at||a.date||''))[0];
  return `<div class="mp-trip-list">${tripCardHtml(latest)}</div>`;
}
```

### 旅程タブの並び替え

`mpTripFilter` に `sort: 'date_desc'` を追加。`buildTripFilterBar` の最後に新セレクトを追加：

| 値 | 並び順 |
|---|---|
| `date_desc` (デフォルト) | 📅 乗車日 (新しい順) |
| `date_asc` | 📅 乗車日 (古い順) |
| `stations_desc` | 🚉 訪問駅数 (多い順) |
| `minutes_desc` | ⏱ 乗車時間 (長い順) |
| `recorded_desc` | 📌 記録日 (新しい順) |
| `delay_desc` | 🐢 遅延 (多い順) — 同値は記録日新しい順で安定化 |

`_MP_SORT_COMPARATORS` というキー→比較関数のマップを定義し、`applyTripFilters` の末尾で `[...filtered].sort(cmp)` する。`resetMpFilter` も `sort: 'date_desc'` を含む形に更新。

### 影響範囲

- `js/13-mypage.js`
  - `mpTripFilter` に `sort` を追加、`resetMpFilter` を更新
  - `tripCardHtml(trip)` を新設 (旧 `buildTripList` のループ本体を移動)
  - `buildTripList` は `trips.map(tripCardHtml).join('')` に簡略化
  - `buildRecentTripCard(trips)` を新設 (`buildPersonalRecords` の直前に配置)
  - 統計タブ pane の `buildPersonalRecords` の前で `📌 直近の旅程` detailCard を appendChild
  - `buildTripFilterBar` に `⇅ 並び替え` セレクト追加
  - `_MP_SORT_COMPARATORS` マップを新設、`applyTripFilters` で末尾ソート
- `sw.js` — `CACHE_VERSION = 'v182'`

### 落とし穴: card.dataset → data-trip-id

旧コードは `card.dataset.tripId = trip.id` で属性を設定していたが、`tripCardHtml` ではテンプレートリテラルで `<div class="mp-tcard" data-trip-id="${trip.id}">` を埋め込む形に変えた。`document.querySelector('[data-trip-id="..."]')` 経由のアクセスは引き続き同じ挙動。`trip.id` は内部生成の `trip_<timestamp>` なのでエスケープ不要。

### Phase 3.8 ステータス更新

- ✅ 統計タブ「📌 直近の旅程」 + 旅程タブ並び替え (v182)

---

## 32. v183 — メモ/遅延が表示されないバグ修正 (localStorage merge) (2026-05-18)

v181 で `📝 メモ` と `⏱ 遅延` を確認モーダルに追加したが、実際の旅程カードに表示されないユーザー報告。原因は v181 自体のワークアラウンドの副作用。

### 原因

v181 で `tripForSupabase()` を導入し、Supabase スキーマに `notes` / `delay_minutes` 列がない間は送信 body から除外していた。一方、マイページは `_mypageCache` を **Supabase からの取得のみ** で構築するため、保存しても再読込時にはこれらフィールドが復元されない。

つまり：
- `saveMultiSegmentTrip()` 時点: trip オブジェクトに notes/delay_minutes あり → localStorage には保存される
- Supabase 送信時: `tripForSupabase()` で除外 → DB には載らない
- マイページ表示時: `fetch(...norireco_trips)` で取得 → notes/delay_minutes フィールドなし → カード未表示

### 修正

`renderMypage()` の trip fetch 直後で localStorage の `norireco_trips` を id ベースで merge：

```js
const localTrips = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
const localById = new Map(localTrips.map(t => [t.id, t]));
trips = trips.map(t => {
  const lt = localById.get(t.id);
  if (!lt) return t;
  const merged = { ...t };
  if (merged.notes == null && lt.notes != null) merged.notes = lt.notes;
  if (merged.delay_minutes == null && lt.delay_minutes != null) merged.delay_minutes = lt.delay_minutes;
  return merged;
});
```

- Supabase 由来の値を優先しつつ、**欠落フィールドだけ** localStorage で補完（将来 DB に直接保存できる状態になっても上書きしない）
- 同一デバイス内では即時表示される
- 別デバイスからの閲覧では localStorage が空のため表示されない → Supabase スキーマ拡張で根本解決される暫定措置

### 撤去予定

`norireco_trips` テーブルに以下の SQL でカラム追加後、`tripForSupabase()` workaround と本 localStorage merge ロジックの両方を撤去する：

```sql
ALTER TABLE norireco_trips
  ADD COLUMN notes text,
  ADD COLUMN delay_minutes integer;
NOTIFY pgrst, 'reload schema';
```

### 影響範囲

- `js/13-mypage.js` `renderMypage()` の trip fetch 直後に localStorage merge を追加
- `sw.js` — `CACHE_VERSION = 'v183'`

### Phase 3.8 ステータス更新

- ✅ メモ/遅延の表示バグ修正 (localStorage merge) (v183)

---

## 33. v184 — 旅程カードからメモ・遅延を後追い編集 (2026-05-18)

v181 でメモ・遅延の入力欄を確認モーダルに追加したが、**v181 デプロイ以前の旅程** と **保存時に入力し忘れた旅程** には書き戻す手段がなかった。`v178` の「後追い記録」コンセプトと整合させて、旅程カードから後追いで編集できる UI を追加。

### UI

各旅程カードの actions 行に **「✏️ メモ編集」** ボタンを追加（GPS 認証ボタン / 削除ボタンと並ぶ位置、青系の色）。
タップすると `#trip-edit-modal` が開き：
- ⏱ 遅延 (number input, 0–999)
- 📝 自由メモ (textarea, 4 行)
- 💾 保存 / キャンセル

既存値があれば input にプリセットされる。

### 保存処理

`saveTripEdit()`:
1. `_mypageCache` 内の trip オブジェクトを直接更新 (delay_minutes / notes)
2. `localStorage.norireco_trips` も同期更新 (該当 id がなければ追加 = Supabase からのみ取得した旧 trip を初めて localStorage に置く形)
3. モーダル閉じる → `renderMpTripsSection()` + `applyMpSection()` で旅程タブ・統計タブ「直近の旅程」を再描画
4. トースト「✏️ メモ・遅延を保存しました」

Supabase に PATCH は送らない（スキーマ未拡張のため列なしエラーを避ける）。v183 の localStorage merge と同じく、スキーマ拡張後に同期できるようになる。

### 影響範囲

- `noritetsu-map.html`
  - `#trip-edit-modal` モーダル新設（`#char-modal` 直下）
  - `.mp-act-btn.edit-memo` (青系) スタイル追加
- `js/13-mypage.js`
  - `tripCardHtml` の actions に `✏️ メモ編集` ボタン追加
  - `openTripEditModal(tripId)` / `closeTripEditModal()` / `saveTripEdit()` 新設
  - `window.openTripEditModal` / `window.closeTripEditModal` / `window.saveTripEdit` を公開
- `sw.js` — `CACHE_VERSION = 'v184'`

### v181〜v184 の役割整理

| Ver | 何を追加したか |
|---|---|
| v181 | 確認モーダルにメモ・遅延の入力欄、tripForSupabase workaround |
| v182 | 統計タブ「📌 直近の旅程」、旅程タブの並び替え 5 軸 |
| v183 | Supabase fetch 後に localStorage を id merge して欠落を補完 |
| v184 | 旅程カードからメモ・遅延を後追い編集できる UI |

### Phase 3.8 ステータス更新

- ✅ 旅程カードからメモ・遅延を後追い編集 (v184)

---

## 34. v185 — 遅延入力を「時間 + 分」に分割 (2026-05-18)

ユーザー指摘: 「何時間も遅れた」シナリオで分単数 (0–999) の number input は入力が手間。`120` `300` のような分換算を頭で計算する必要がある。

### 変更

UI 入力を **時間 + 分** の 2 つの number input に分割：
- ⏱ 遅延 `[ 0 ]` 時間 `[ 0 ]` 分遅れ
- 時間: 0–99、分: 0–59
- 最大値 99×60+59 = 5999 分 ≈ 4 日弱（実用十分）

データモデルは **`delay_minutes` (整数分) のまま** 維持。UI 入力時に `h × 60 + m` で集約して保存し、表示時に `formatDelayMin()` で `N時間M分` / `N時間` / `N分` に整形する。

### 表示整形ロジック

```js
function formatDelayMin(min) {
  const n = typeof min === 'number' ? min : parseInt(min, 10);
  if (!n || n <= 0) return '';
  if (n < 60) return `${n}分`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}
```

旅程カードのバッジ: `⏱ 1時間30分遅れ` / `⏱ 2時間遅れ` / `⏱ 15分遅れ` のように適切に省略。

### プリセット (旅程編集モーダル)

既存の `delay_minutes` を時間と分に分解して入力欄に戻す：
- 90 → h=1, m=30
- 60 → h=1, m='' (= 0 だが空表示)
- 15 → h='', m=15
- null/0 → 両方空

### 影響範囲

- `noritetsu-map.html`
  - 確認モーダル `#rec-edit-delay` 単一 → `#rec-edit-delay-h` + `#rec-edit-delay-m` の 2 input
  - 旅程編集モーダル `#trip-edit-delay` 同様に分割
- `js/07-record-mode.js`
  - `saveMultiSegmentTrip` で `h × 60 + m` の合算式に変更
  - `openRecConfirm` のリセットを 2 input 対応
- `js/13-mypage.js`
  - `formatDelayMin(min)` ヘルパ新設（window 公開）
  - `tripCardHtml` の delayBit を `formatDelayMin()` 経由に
  - `openTripEditModal` で `delay_minutes` を h+m に分解してプリセット
  - `saveTripEdit` で 2 input → 合算
- `sw.js` — `CACHE_VERSION = 'v185'`

### 既存データ互換

`delay_minutes` のスキーマ・値は変更なし。v181 以降に保存された分単位の値（例: 30）は新フォーマット下でも `15分` `30分` のように正しく表示される。

### Phase 3.8 ステータス更新

- ✅ 遅延入力を「時間 + 分」に分割 (v185)

---

## 35. v186 — stop_type 反映の駅 UI 個人化 + 表示/非表示フィルタ (2026-05-18)

TODO 🟡「`stop_type` 反映の駅UI個人化」着手。
- **降りた駅 (alighted) = ●大** (1.25 倍)
- **乗車のみ (boarded) = ◎中** (等倍)
- **通過のみ (passed) = ○小** (0.8 倍)

各 stop_type ごとに **表示/非表示** を切り替えるフィルタチップを地図画面に追加。
状態は `localStorage.norireco_stop_type_filter` に保存され、リロードしても保持される。

### stop_type の自動派生

新たに記録モード Step b の入力 UI を作らず、**既存の `RIDDEN_SEGS` から自動派生** する MVP 設計：
- `seg.from` = boarded（その区間の乗車駅）
- `seg.to` = alighted（その区間の降車駅）
- 中間駅 = passed
- 複数 seg / 複数 trip で同じ駅が出る場合は最高優先度を採用 (`alighted > boarded > passed`)

→ 乗換駅は必ずどこかの `seg.to` に該当するため alighted 扱いになり、感覚と一致する。

### データレイヤ (`js/04-gps-location.js`)

```js
const slStopType = {};                        // station_name → stop_type
const _STYPE_PRIORITY = { alighted: 3, boarded: 2, passed: 1 };
// rebuildRiddenStations() 末尾で SERVICE_LINES ベースに集計
// (legacy N02 id は SERVICE_LINES で見つからないので無視 — 既存 trip は新形式 lineId 移行済)
```

### フィルタ state (`js/05-supabase-data.js`)

```js
window._stopTypeFilter = { alighted: true, boarded: true, passed: true };
toggleStopTypeFilter(stype);   // チップタップで該当 stop_type を ON/OFF
updateStopTypeFilterUI();      // チップの .active クラス更新
```

切替時は **駅レイヤだけ再描画**（`dotLayerRef.clearLayers()` + `drawStationsLayer()`）。路線は影響を受けないので不変。

### 描画反映 (`js/08-rendering.js` `drawStationsLayer`)

```js
const stype = ridden ? slStopType[ms.name] : undefined;
if (stype) {
  const stf = window._stopTypeFilter || {alighted:true,boarded:true,passed:true};
  if (stf[stype] === false) continue;          // フィルタで非表示
}
const stypeMul = stype === 'alighted' ? 1.25
               : stype === 'passed'   ? 0.8
               : 1.0;
// 既存 4 分岐 (divIcon × 2, circleMarker × 2) の size/radius に stypeMul を乗算
```

未訪問駅 (`ridden=false`) は `stype=undefined` でフィルタ・倍率の影響を受けない（既存マップ表示モード `両方/乗車のみ/未乗車のみ` でハンドル）。

### UI (`noritetsu-map.html`)

`map-mode-box` (両方/乗車のみ/未乗車のみ) の右隣に新たに `stop-type-box` を追加：
```
📍 [●降車] [◎乗車] [○通過]
```
各チップはタップで ON/OFF、`.active` のときは緑系 (`#48d597`)、非アクティブは透明度 0.45 の灰色。
モバイル時 (`max-width: 768px`) はパディング・フォントを縮小。

### 初期化 (`js/10-init.js`)

`window.addEventListener('load')` 内で `updateStopTypeFilterUI()` を呼んで localStorage 状態を UI に反映。

### Step b (記録モードでの stop_type 編集) は次タスク

「乗換駅で一度降りた」「終点で降りずに引き返した」などの例外シナリオは現状の自動派生では正確に拾えない。
将来 trip.stop_types (jsonb) を追加して確認モーダルで編集できるようにする → 別タスク (Step b)。

### 影響範囲

- `js/04-gps-location.js` — `slStopType` 宣言と集計ループ追加（`rebuildRiddenStations` 末尾）
- `js/05-supabase-data.js` — `loadStopTypeFilter` / `toggleStopTypeFilter` / `updateStopTypeFilterUI`
- `js/08-rendering.js` — `drawStationsLayer` 内 4 分岐の size/radius に `stypeMul` 乗算、フィルタ skip
- `js/10-init.js` — 初期化フックで `updateStopTypeFilterUI` 呼び出し
- `noritetsu-map.html` — `stop-type-box` UI + `.stfilter-chip` CSS
- `sw.js` — `CACHE_VERSION = 'v186'`

### Phase 3.8 ステータス更新

- ✅ stop_type 反映の駅 UI 個人化 + 表示/非表示フィルタ (v186)

---

## 36. v187 — 地図フィルタを 3 アイコンに集約 + 未訪問駅 ON/OFF (2026-05-18)

v186 までで地図上部に **3 段** のピル (期間 / マップ表示モード / 駅フィルタ) が並んで重く感じる + 「未乗車駅も ON/OFF したい」というユーザー指摘。
3 つの円形アイコンに集約してタップで開閉、駅フィルタに `unvisited` 種別を追加。

### UI 集約

```
[📅] [🗾] [📍]   ← 常時このアイコン行のみ表示
  ↓ タップ
[全期間 / 今年 / 去年 / 〜月指定 / カスタム]   ← 該当バーだけ表示
```

- 同じアイコン再タップで閉じる
- 別アイコンタップで前のを閉じて新しいのを開く
- 地図側 (date-filter-wrap 外) クリックで全部閉じる
- 既存の期間サブポップ (`dfilter-pop` / `dfilter-um-pop`) も閉じる連動

### 未訪問駅フィルタ

`_stopTypeFilter` に `unvisited: true` を追加。`drawStationsLayer` で
```js
const stype = ridden ? (slStopType[ms.name] || 'boarded') : 'unvisited';
if (stf[stype] === false) continue;
```
として未訪問駅 (`ridden=false`) も同じフィルタ仕組みに乗せる。

これでマップ表示モード（路線レベル: 両方/乗車路線/未乗車路線）と駅フィルタ（駅レベル: 降車/乗車/通過/未訪問）を **独立に組み合わせ可能** に：
- 「乗車路線だけ表示」+「駅は降車のみ」→ 路線網のうち実際に降りた駅だけハイライト
- 「両方表示」+「駅は未訪問のみ」→ まだ訪れていない駅を計画ピックアップ

### 影響範囲

- `noritetsu-map.html`
  - `date-filter-wrap` の先頭に `.map-ctrl-bar` (3 円形アイコン) を追加
  - 既存 `date-filter-box` / `map-mode-box` / `stop-type-box` に `style="display:none"` を付与
  - `stop-type-box` に `□未訪問` チップを追加
  - 既存の絵文字ラベル (`📅` `🗾` `📍`) を各バー内から撤去（アイコンに集約済み）
  - `.map-ctrl-bar` / `.map-ctrl-icon` の CSS 追加（モバイル時は 28×28）
- `js/05-supabase-data.js`
  - `loadStopTypeFilter` / `toggleStopTypeFilter` を `unvisited` 対応に拡張
  - `toggleMapCtrl(which, ev)` / `closeAllMapCtrl()` を新設
  - `document.addEventListener('click')` で外側クリック閉じ
- `js/08-rendering.js`
  - 駅描画で未訪問駅 (`ridden=false`) も `unvisited` 種別としてフィルタ評価
- `sw.js` — `CACHE_VERSION = 'v187'`

### Phase 3.8 ステータス更新

- ✅ 地図フィルタ 3 アイコン集約 + 未訪問駅 ON/OFF (v187)

---

## 37. v188 — 路線モード切替を撤廃、駅フィルタから自動派生に統合 (2026-05-18)

v187 で「マップ表示モード (路線レベル) と駅フィルタ (駅レベル) が独立 = 複雑で分かりにくい」「🗾 は 📍 があれば十分」というフィードバック。
🗾 アイコンと `map-mode-box` を撤去し、**路線描画モードは駅フィルタの状態から自動派生** する形に統合。

### 派生ロジック

```js
function deriveMapDisplayMode(stf) {
  const hasRidden = !!(stf.alighted || stf.boarded || stf.passed);
  const hasUnvisited = !!stf.unvisited;
  if (hasRidden && hasUnvisited) return 'both';     // 両方表示
  if (hasRidden) return 'ridden';                    // 乗車路線のみ
  if (hasUnvisited) return 'unridden';               // 未乗車路線のみ
  return 'both';                                     // 全部 OFF (実用想定外) は両方
}
```

- 駅フィルタの「●降車 / ◎乗車 / ○通過」がどれか ON → 乗車路線も描画
- 「□未訪問」が ON → 未乗車路線も描画
- 結果として 1 軸の駅フィルタ操作だけで、路線レベルの「両方/乗車のみ/未乗車のみ」が自然に表現される

### UI

地図上部のアイコン行が `[📅] [📍]` の 2 つに。`[🗾]` は撤去。`stop-type-box` をタップで開いて駅レベルを ON/OFF すると、路線も追従して再描画される。

### 撤去したもの

- `noritetsu-map.html`
  - 🗾 アイコン `#ctrl-icon-mode`
  - `map-mode-box` バー (両方/乗車のみ/未乗車のみ チップ)
- `js/05-supabase-data.js`
  - `MAP_DISPLAY_MODE_KEY` / `MAP_DISPLAY_MODES` 定数
  - `loadMapDisplayMode()` / `setMapDisplayMode()` / `updateMapDisplayModeUI()` 関数
  - `_MAP_CTRL_TARGETS` から `mode: 'map-mode-box'` を削除
- `js/10-init.js`
  - 起動時の `updateMapDisplayModeUI()` 呼び出し

`localStorage.norireco_map_display_mode` のキーはユーザー端末に残る可能性があるが、新ロジックは参照しないので無害。

### 残したもの

- `window._mapDisplayMode` グローバル変数自体（`drawServiceLineBase` 等が参照）
  - 値は `_refreshMapDisplayModeFromStopFilter()` が駅フィルタから派生して書き込む
  - 初期化時 + `toggleStopTypeFilter` ごとに更新
- 路線描画 (`drawServiceLineBase`) と駅描画 (`drawStationsLayer`) の既存ロジックは無変更

### 影響範囲

- `noritetsu-map.html` — 🗾 アイコンと map-mode-box 削除（5 行短縮）
- `js/05-supabase-data.js` — `setMapDisplayMode` 系を `deriveMapDisplayMode` + `_refreshMapDisplayModeFromStopFilter` に置換、`toggleStopTypeFilter` 内で路線レイヤも refresh
- `js/10-init.js` — `updateMapDisplayModeUI` 呼び出し削除
- `sw.js` — `CACHE_VERSION = 'v188'`

### Phase 3.8 ステータス更新

- ✅ 路線モード切替を撤廃、駅フィルタから自動派生に統合 (v188)

---

## 50. v201 — ES Modules パイロット (案 β) stage 1 **完結**: mypage state を `window.NORIRECO.mypage.state` に集約 (2026-05-19)

### 背景

v195 (auth) → v196 (map) → v197 (record) → v198 (gps) → v199 (trains) → v200 (data) に続く **案 β stage 1 の 7 番目・最終ドメイン**。

### 移行した state (3 個)

| 旧 (top-level `let` in 13-mypage-common) | 新 |
|---|---|
| `_mypageCache` (取得した自分の trip[]) | `NORIRECO.mypage.state._mypageCache` |
| `mpActiveSection` ('stats'/'trips'/'lines') | `NORIRECO.mypage.state.mpActiveSection` |
| `mpTripFilter` (フィルタ object) | `NORIRECO.mypage.state.mpTripFilter` |

`NORIRECO.mypage` namespace は v190 で既に確立済み (関数 namespace)。今回はその下に `.state` プロパティとして state を集約 — auth/map/record/gps/trains/data の各 `NORIRECO.<domain>` 直下 (state も関数も同階層) とは異なる構造を選択。理由: mypage は **関数が圧倒的に多い** ドメイン (renderMypage / applyMpSection / tripCardHtml / 並び替え comparator 等)、state は ~3 個しかない。state を `.state` サブ namespace に隔離した方が `NORIRECO.mypage.X` の関数群がフラットに見えて読みやすい。

13-mypage-common.js 内は `const MP = NORIRECO.mypage.state` の local alias で `MP._mypageCache` 等の短縮形。13a-stats.js / 13b-trips.js は `NORIRECO.mypage.state.X` のフルパス。

### call site 書き換え (3 ファイル、61 箇所)

- `js/13-mypage-common.js` — 宣言部 + 13 箇所
- `js/13b-trips.js` — 47 箇所 (旅程フィルタ・並び替え・編集の中心)
- `js/13a-stats.js` — 1 箇所

### 案 β stage 1 完了サマリ

| ドメイン | バージョン | state 数 | 関係ファイル | 累計 |
|---|---|---|---|---|
| auth | v195 | 4 | 2 | 4 |
| map | v196 | 3 | 6 | 7 |
| record | v197 | 7 | 4 | 14 |
| gps | v198 | 12 | 2 | 26 |
| trains | v199 | 6 | 4 | 32 |
| data | v200 | 11 | 15 | 43 |
| **mypage** | **v201** | **3** | **3** | **46** |

**累計 46 state を `window.NORIRECO.<domain>.X` に集約**。

- 関係ファイル数 (累計、重複あり): 36 ファイル参照
- call site 累計: **~450 箇所**
- セッション間隔: 全 7 commit が同日 (2026-05-19) に完了
- syntax check: 各 commit 後 18/18 OK

### 案 β stage 2 (`<script type="module">` 化) の準備が整った

stage 1 完了で **classic script 共有 lexical scope への依存はゼロ**。各ファイルは:
1. `<script src>` でロードされる順序が変わっても OK (state は `NORIRECO.<domain>` の object property、ロード順は副次的)
2. `<script type="module">` 化しても OK (module export の代わりに `window.NORIRECO.<domain>.X` で公開)
3. module / classic 混在ロード可 (deferred 化された module が走るときには bridge が既に classic ロード時点で確立済み)

stage 2 で各ファイルを `type="module"` 化するときの手順:
1. 該当ファイルの `<script>` タグに `type="module"` 追加
2. ファイル末尾に `export const <domain> = NORIRECO.<domain>;` を追加 (module consumer 用)
3. ロード順制約があれば top-level `await import('./xxx.js')` で逐次解決
4. SW (`sw.js`) の Network-First が `type="module"` でもキャッシュバスティング可能か実機検証

stage 2 は別セッションで集中して対応。stage 1 完了で「**いつでも module 化を始められる準備**」が整った。

### 教訓 (v195〜v201 通しで)

1. **mutable object property パターン** が classic→module 移行で最も安全
   - `let X` の rebinding (`X = ...`) を `obj.X = ...` の property assignment に置換するだけで意味論保存
   - module 側で `export const obj = {...}; window.<domain> = obj` の bridge 1 行で classic 側互換
2. **property 名と変数名の collision** は `replace_all` で宣言ブロックを壊す
   - 対策: 「宣言ブロック先書き → use 全置換 → 宣言ブロック修復」の 3 段階手順 (v198 で確立)
3. **state 名同士の部分文字列衝突** は cascading corruption を生む
   - 対策: 短い名前を先に置換 → 副作用 (substring 含意) を cleanup pass で復元 (v200 で確立)
4. **incremental commit のすばらしさ**: 7 commit に分けたので、どの段階でも `git revert` で戻せる。実際 v196 / v197 / v198 / v199 / v200 でそれぞれ replace_all 起因の局所事故があったが、commit 内 (push 前) の手動修正で吸収できた。1 commit で全部やっていたらどこで何が壊れたか追えなくなっていた。

---

## 49. v200 — ES Modules パイロット (案 β) stage 1: data domain state を `window.NORIRECO.data` に集約 (最大規模、2026-05-19)

### 背景

v195 (auth) / v196 (map) / v197 (record) / v198 (gps) / v199 (trains) に続く 6 番目のドメイン。**案 β stage 1 の最大規模** ドメイン。`data` (路線・営業系統・統合駅・キャラマスター・キャラモード等) の state は 02-data-loaders.js が中心、cross-file 参照は **15 ファイル / 146 箇所** という分量。

これまでの 5 ドメインで合計 32 state を集約。v200 で追加 11 state を集約、累計 **43 state**。停泊バージョンが「v200」になるのも象徴的。

### 移行した state (11 個)

| 旧 | 新 | 用途 |
|---|---|---|
| `LINES` | `NORIRECO.data.LINES` | N02 物理路線 (606) — central master |
| `RUNNING_SERVICES` | `NORIRECO.data.RUNNING_SERVICES` | running_services.json (後方互換) |
| `MERGED_STATIONS` | `NORIRECO.data.MERGED_STATIONS` | 統合駅 (9017) |
| `slMergedStationMap` | `NORIRECO.data.slMergedStationMap` | 営業系統 id → mergedStation 索引 |
| `SERVICE_LINES_MASTER` | `NORIRECO.data.SERVICE_LINES_MASTER` | service_lines_master.json |
| `SERVICE_LINES` | `NORIRECO.data.SERVICE_LINES` | 営業系統 (637+α) |
| `serviceLinesLoaded` | `NORIRECO.data.serviceLinesLoaded` | マスター読込済みフラグ |
| `serviceLinesBuilt` | `NORIRECO.data.serviceLinesBuilt` | 構築済みフラグ |
| `CHARACTERS` | `NORIRECO.data.CHARACTERS` | キャラマスター |
| `stationCharMap` | `NORIRECO.data.stationCharMap` | 駅名 → キャラリスト |
| `charModeOn` | `NORIRECO.data.charModeOn` | 🎭 キャラ表示 ON/OFF |

02-internal な loader 補助 state (`loadedPriorities` / `pendingLoads` / `PRIORITY_FILES`) は cross-file 参照なし → NORIRECO.data に載せず、02 内 const のまま維持。

02-data-loaders.js 内は `const D = NORIRECO.data` で `D.X` 短縮。外部 14 ファイル (02b/03/04/04b/05/06/07/08/09/10/11/13-common/13a/13b) は `NORIRECO.data.X` フルパス。

### 教訓: 部分文字列衝突 (substring collision) の致命性

state 名同士が **部分文字列** で被ると、replace_all の順序によっては cascading corruption が起きる。今回最も問題になった衝突:

| 包含関係 | 例 |
|---|---|
| `LINES` ⊂ `SERVICE_LINES` ⊂ `SERVICE_LINES_MASTER` | LINES を先に置換すると 3 重ネスト |
| `CHARACTERS` ⊂ `OWNED_CHARACTERS_KEY` | CHARACTERS を置換すると localStorage キー識別子も壊れる |

v195〜v199 の「property 名 vs 変数名」 collision とは別軸の問題。「**state 名の部分文字列が別の state 名 or 別の識別子の一部にもなっている**」ケース。

#### 対策 (v200 で確立)

**Pattern A: 短いほうを先に処理、後で復元**
1. `LINES` → `NORIRECO.data.LINES`
   - 副作用: `SERVICE_LINES` → `SERVICE_NORIRECO.data.LINES`
   - 副作用: `SERVICE_LINES_MASTER` → `SERVICE_NORIRECO.data.LINES_MASTER`
2. **クリーンアップ**: `SERVICE_NORIRECO.data.LINES` → `NORIRECO.data.SERVICE_LINES` (substring match で `_MASTER` 形も一括復元)

これで 3 つの状態を 2 ステップで処理できる (`LINES` / `SERVICE_LINES` / `SERVICE_LINES_MASTER`)。3 ステップ分の Edit が 2 ステップに圧縮できる。

ただしファイルによっては `SERVICE_LINES` を先に処理してしまい、2 重 / 3 重ネストが発生したケースもあった (例: 04-gps-location.js で `NORIRECO.data.NORIRECO.data.SERVICE_NORIRECO.data.LINES_MASTER` まで深くなった)。事後の cleanup pass で `NORIRECO.data.NORIRECO.data.X` を `NORIRECO.data.X` に collapse する必要があった。

#### 反省点

理想は **placeholder pattern** (`LINES` → `__L__`、`SERVICE_LINES` → `__SL__`、その後 placeholder → 最終形) だったが、ファイル数 × state 数で edit 数が 2 倍になるため断念。代わりに「Pattern A + cleanup pass」で実用上 OK と判断。

v200 の総 edit 数: 約 100 回 (うち 30 回は失敗 = state が該当ファイルになし、ほか cleanup 10 回)。

### call site 書き換え (15 ファイル、146 箇所)

| ファイル | refs |
|---|---|
| 02-data-loaders.js | 35 (宣言 + 内部) |
| 04b-ride-record.js | 16 |
| 04-gps-location.js | 14 |
| 02b-service-lines-builder.js | 14 |
| 08-rendering.js | 12 |
| 13a-stats.js | 21 |
| 03-characters.js | 7 |
| 05-supabase-data.js | 7 |
| 06-map-leaflet.js | 4 |
| 07-record-mode.js | 4 |
| 09-tabs-stats.js | 3 |
| 13-mypage-common.js | 3 |
| 13b-trips.js | 3 |
| 11-fraud-detection.js | 2 |
| 10-init.js | 1 |

### 影響範囲

- 全 18 ファイル中 15 ファイルが影響
- `sw.js` — `CACHE_VERSION = 'v200'`
- `npm run check` — 18/18 OK
- 機能リグレッション: なし (state 名前空間化のみ、ロジック無変更)

### 進捗 (案 β stage 1)

| ドメイン | バージョン | state 数 | 累計 |
|---|---|---|---|
| auth | v195 | 4 | 4 |
| map | v196 | 3 | 7 |
| record | v197 | 7 | 14 |
| gps | v198 | 12 | 26 |
| trains | v199 | 6 | 32 |
| **data** | **v200** | **11** | **43** |
| mypage | v201 (最終) | 3 | 46 |

残りは `mypage` 1 ドメインのみ。**案 β stage 1 は v201 で完結予定**。

### 案 β stage 2 (`<script type="module">` 化) への準備が整った

stage 1 完了で cross-file shared state は全て `window.NORIRECO.<domain>.X` の object property になった。stage 2 では各ファイルを `type="module"` 化して `import`/`export` で繋ぐが、その間 classic script との互換は `window.NORIRECO` bridge 1 つで保てる:

```js
// 例: 02-data-loaders.js (module 化後)
export const data = { LINES: [], SERVICE_LINES: [], ... };
window.NORIRECO.data = data;  // bridge for remaining classic scripts
```

bridge object は **mutable で参照同じ** のため、module 側で `data.LINES.push(...)` してもclassic script 側の `NORIRECO.data.LINES.length` が同期して見える。これが v195 で意図した「2 段階移行で classic と module が共存できる」設計の証明。

---

## 48. v199 — ES Modules パイロット (案 β) stage 1: trains domain state を `window.NORIRECO.trains` に集約 (2026-05-19)

### 背景

v198 (gps) に続く 5 番目のドメイン。`trains` (列車マスター + 列車セレクタ UI 状態) の state は 02-data-loaders.js が中心、cross-file 参照は 07 / 09 / 13a。

state 6 個。`TRAINS` / `TRAIN_CATEGORIES` (列車マスター本体) と `selectedTrain*` (UI セレクタ状態) が同じドメインに同居する形だが、両方とも列車関連なので 1 ドメインに集約。

### 移行した state (6 個)

| 旧 | 新 |
|---|---|
| `TRAINS` | `NORIRECO.trains.TRAINS` |
| `TRAIN_CATEGORIES` | `NORIRECO.trains.TRAIN_CATEGORIES` |
| `selectedTrainId` | `NORIRECO.trains.selectedTrainId` |
| `selectedTrainName` | `NORIRECO.trains.selectedTrainName` |
| `selectedTrainCategory` | `NORIRECO.trains.selectedTrainCategory` |
| `selectedCarModel` | `NORIRECO.trains.selectedCarModel` |

02-data-loaders.js 内は `const T = NORIRECO.trains` で `T.X` 短縮。外部 (07 / 09 / 13a) は `NORIRECO.trains.X` フルパス。

### call site 書き換え (4 ファイル、39 箇所)

- `js/02-data-loaders.js` — 宣言部 + 30 箇所 (列車セレクタ UI イベントハンドラ群)
- `js/07-record-mode.js` — 4 箇所 (記録モーダルの列車選択統合)
- `js/09-tabs-stats.js` — 3 箇所 (統計タブ「🚆 列車制覇」セクションで TRAINS / TRAIN_CATEGORIES を参照)
- `js/13a-stats.js` — 2 箇所 (車両形式集計で TRAINS を参照)

v198 で確立した 3 段階手順 (宣言 → replace_all → 宣言を 1 回まとめて修正) で機械的に処理。

### 影響範囲

- `js/02-data-loaders.js` — 宣言部 + 30 箇所書き換え (機能無変更)
- `js/07-record-mode.js` / `09-tabs-stats.js` / `13a-stats.js` — call site のみ
- `sw.js` — `CACHE_VERSION = 'v199'`
- `npm run check` — 18/18 OK
- 機能リグレッション: なし

### 進捗 (案 β stage 1)

| ドメイン | バージョン | state 数 | 累計 |
|---|---|---|---|
| auth | v195 | 4 | 4 |
| map | v196 | 3 | 7 |
| record | v197 | 7 | 14 |
| gps | v198 | 12 | 26 |
| **trains** | **v199** | **6** | **32** |
| data | v200 (次・最大規模) | ~10 (LINES/SERVICE_LINES/MERGED_STATIONS/CHARACTERS) | ~42 |
| mypage | v201 | 3 | ~45 |

残りは `data` (最大規模) と `mypage` の 2 ドメイン。

---

## 47. v198 — ES Modules パイロット (案 β) stage 1: gps domain state を `window.NORIRECO.gps` に集約 (2026-05-19)

### 背景

v195 (auth) / v196 (map) / v197 (record) に続く 4 番目のドメイン。`gps` (現在地表示 + GPS 認証 trip) の state は 04-gps-location.js が中心、cross-file 参照は 07-record-mode.js のみ。

state 数は **12 個** で最多 (auth=4 / map=3 / record=7 / **gps=12**)。現在地マーカー / 追従モード / GPS 認証 trip 始点・終点・タイムスタンプ / 最寄駅候補リストなど、Phase 1〜3.6 (v89〜v131) で段階的に増えた 12 個の state がフラットに置かれていた。

### 移行した state (12 個)

| 旧 (top-level `let`) | 新 (NORIRECO.gps プロパティ) | 用途 |
|---|---|---|
| `locationMode` | `NORIRECO.gps.locationMode` | 0:off / 1:on / 2:follow |
| `locationWatchId` | `NORIRECO.gps.locationWatchId` | watchPosition の id |
| `userLocationMarker` | `NORIRECO.gps.userLocationMarker` | 青ドット |
| `userLocationCircle` | `NORIRECO.gps.userLocationCircle` | 精度円 |
| `didInitialCenter` | `NORIRECO.gps.didInitialCenter` | mode=1 の初回中心化フラグ |
| `lastUserGps` | `NORIRECO.gps.lastUserGps` | 直近の {lat, lon, accuracy} |
| `recordStartedViaGPS` | `NORIRECO.gps.recordStartedViaGPS` | GPS 経由記録か否か |
| `recordStartGPS` | `NORIRECO.gps.recordStartGPS` | 発進時 GPS スナップショット |
| `recordStartedAt` | `NORIRECO.gps.recordStartedAt` | 記録モード突入時刻 ISO |
| `recordEndTime` | `NORIRECO.gps.recordEndTime` | 「ここで終了」押下時刻 ISO |
| `nearestCandidates` | `NORIRECO.gps.nearestCandidates` | 最寄駅候補リスト |
| `nearestPickedIdx` | `NORIRECO.gps.nearestPickedIdx` | 選択 index |

04-gps-location.js 内は `const G = NORIRECO.gps` の local alias で `G.X` に短縮。外部 (07) は `NORIRECO.gps.X` のフルパス。

### v197 教訓の適用 — 「宣言ブロック汚染」事故

v197 で発覚した「state object の property 名 (`pairLineChoices`) と外部識別子が同名のとき replace_all で宣言まで壊れる」事故が、v198 でも **同じ手順を踏んで再発**。今回 12 個の property すべてが該当 (property 名 = 変数名)。

対処手順 (v198 で確立):
1. 宣言ブロックを **先に** 書く (`NORIRECO.gps = { locationMode: 0, ... }`)
2. **その後** state 名ごとに replace_all (`locationMode` → `G.locationMode` 等) を実行 — 宣言ブロックも `G.locationMode: 0,` の syntax error 形に汚染される
3. **最後に** declaration block を **手動で 1 回まとめて** plain property 名 (`locationMode: 0,`) に戻す

宣言 → use 書き換え → 宣言を戻す、の 3 段階。declaration を 1 回まとめて修正できるので、property 数が増えても手間は線形にしか増えない (v198 12 個 = 1 回の Edit で 13 行修正)。

v200 (data domain) の事前準備として、property 名と変数名を明示的にずらす案 (`LINES` → `NORIRECO.data.lines`) も検討したが、cross-file 識別子の **意味の保存** (`lines` と `LINES` が同じものを指すと一目で分かる) を優先し、3 段階手順を踏襲する方針。

### call site 書き換え (2 ファイル、約 60 箇所)

- `js/04-gps-location.js` — 宣言部 (12 行) + 約 50 箇所 (12 state × 平均 4 ref)
- `js/07-record-mode.js` — 約 30 箇所 (`NORIRECO.gps.lastUserGps` / `recordStartedViaGPS` / `recordStartGPS` / `recordStartedAt` / `recordEndTime` / `locationMode` の 6 種類が記録パネル状態判定で使われる)

### 影響範囲

- `js/04-gps-location.js` — 宣言部 + 約 50 箇所書き換え (機能無変更)
- `js/07-record-mode.js` — 約 30 箇所 (記録モードの GPS 認証パス全般)
- `sw.js` — `CACHE_VERSION = 'v198'`
- `npm run check` — 18/18 OK
- 機能リグレッション: なし

### 進捗 (案 β stage 1)

| ドメイン | バージョン | state 数 | 関係ファイル | 累計 state |
|---|---|---|---|---|
| auth | v195 | 4 | 2 | 4 |
| map | v196 | 3 | 6 | 7 |
| record | v197 | 7 | 4 | 14 |
| **gps** | **v198** | **12** | **2** | **26** |
| trains | v199 (次) | 4 | 2-3 | 30 |
| data | v200 | ~10 (最大規模、cross-file 参照も最大) | 全体 | ~40 |
| mypage | v201 | 3 | 13-common/a/b | ~43 |

ここまでで 26 state を NORIRECO.<domain>.X に集約済み。残りは `data` (LINES/SERVICE_LINES 系) が最大規模だが、ロジックは ES Modules 化を見越して整理済み (v191 ローダー集約 + v192 builder 切り出し)。

---

## 46. v197 — ES Modules パイロット (案 β) stage 1: record domain state を `window.NORIRECO.record` に集約 (2026-05-19)

### 背景

v195 (auth) / v196 (map) に続く 3 番目のドメイン。`record` (📝 手動記録モード) の state は 07-record-mode.js が中心、cross-file 参照は 04 / 06 / 08 の 3 ファイル。state 数は 7 個と最多 (これまで auth=4 / map=3)。

### 移行した state (7 個)

| 旧 (top-level `let` / `const`) | 新 (NORIRECO.record プロパティ) |
|---|---|
| `recordMode` | `NORIRECO.record.mode` |
| `recordSelection` | `NORIRECO.record.selection` |
| `recordHighlights` | `NORIRECO.record.highlights` |
| `pairLineChoices` (Map) | `NORIRECO.record.pairLineChoices` |
| `currentSegments` | `NORIRECO.record.segments` |
| `endStationCandidates` (line 583) | `NORIRECO.record.endStationCandidates` |
| `endStationPickedIdx` (line 584) | `NORIRECO.record.endStationPickedIdx` |

`recordSelection` / `recordHighlights` / `pairLineChoices` は元 `const` (mutable container)、`recordMode` / `currentSegments` / `endStation*` は元 `let` (rebindable)。NORIRECO.record の object property としては区別なく扱える。

07-record-mode.js 内は `const R = NORIRECO.record` の local alias で `R.mode` / `R.selection` / `R.segments` 等の短縮形を使用。外部 (04 / 06 / 08) は `NORIRECO.record.X` のフルパス。

### call site 書き換え (4 ファイル、約 80 箇所)

- `js/07-record-mode.js` — 宣言部 + 約 75 箇所 (replace_all で `recordMode` → `R.mode` 等の機械置換)
- `js/04-gps-location.js` — 6 箇所 (`recordMode` ×3 + `recordSelection` ×複数 + `currentSegments` ×複数。手動記録パネルの表示更新ロジックで使う)
- `js/06-map-leaflet.js` — 2 箇所 (`map.on('click')` ハンドラ内の `recordMode` 判定)
- `js/08-rendering.js` — 1 箇所 (`attachStationDotClickV2` 内の `if (recordMode)`)

### 教訓: replace_all とコメント内識別子の衝突

state object 宣言内のプロパティ名 (`pairLineChoices: new Map()`) と外部識別子 (`pairLineChoices`) が同名の場合、`replace_all 'pairLineChoices' → 'R.pairLineChoices'` を実行すると **宣言内のキー名まで `R.pairLineChoices: ...` に化けて構文エラー**になる。

v197 では `pairLineChoices` / `endStationCandidates` / `endStationPickedIdx` の 3 つで実際にこの事故が発生 (npm run check で SyntaxError なし、別の visual review で発覚)。

対策:
1. 宣言ブロックは `replace_all` の前に書き換え済みにしておく (今回採用)
2. または declaration の property 名を意図的に変える (e.g., `pairLineChoices` → `pairChoices`) — 今回は採用せず
3. または `replace_all` ではなく `\brecordMode\b` のような単語境界 grep + sed 系ツールで boundary check付きで置換

v200 (data domain、LINES/SERVICE_LINES 等の最大規模) では state object のプロパティ名と外部識別子を意図的に分岐 (`NORIRECO.data.lines` / `NORIRECO.data.serviceLines` 等の camelCase 化) して衝突を構造的に防止する想定。

### 影響範囲

- `js/07-record-mode.js` — 宣言部 + 約 75 箇所書き換え (機能無変更)
- `js/04-gps-location.js` / `06-map-leaflet.js` / `08-rendering.js` — call site のみ
- `sw.js` — `CACHE_VERSION = 'v197'`
- `npm run check` — 18/18 OK
- 機能リグレッション: なし

### 進捗 (案 β stage 1)

| ドメイン | バージョン | state 数 | 関係ファイル | 状態 |
|---|---|---|---|---|
| auth | v195 | 4 | 2 | ✅ |
| map | v196 | 3 | 6 | ✅ |
| **record** | **v197** | **7** | **4** | **✅** |
| gps | v198 (次) | ~10 | 2 | 🔜 |
| trains | v199 | 4 | 2-3 | 🔜 |
| data | v200 | ~10 (LINES 系最大) | 全体 | 🔜 |
| mypage | v201 | 3 | 13-common/a/b | 🔜 |

state 数が増えるにつれ宣言ブロックの可読性確保が課題。v198 以降は宣言を JSDoc コメント付きで整理する。

---

## 45. v196 — ES Modules パイロット (案 β) stage 1: map domain state を `window.NORIRECO.map` に集約 (2026-05-19)

### 背景

v195 (auth pilot) で確立した「state を `window.NORIRECO.<domain>.X` の mutable object property に集約」パターンを **2 番目のドメイン (map)** に適用。`map` (Leaflet インスタンス) は cross-file 参照の三大塊の一つで、6 ファイル 39 箇所で使われる。

`map` を選んだ理由: state 数が少なく (3 個) Leaflet インスタンスの実体は 1 度だけ代入される (init 後は read-only に近い) ため、`let → object property` の機械的置換が最も安全。v200 で着手予定の `data` (LINES/SERVICE_LINES/MERGED_STATIONS 等の最大規模ドメイン) に進む前に、中規模で書き換え手順を習熟する位置付け。

### 移行した state (3 個)

| 旧 (top-level `let`) | 新 (NORIRECO.map プロパティ) |
|---|---|
| `map` (Leaflet インスタンス) | `NORIRECO.map.instance` |
| `memoMode` (📸 メモモード ON/OFF) | `NORIRECO.map.memoMode` |
| `clickInfo` (直近マップクリック context) | `NORIRECO.map.clickInfo` |

`map` は **単一代入** (init で一度だけ `L.map(...)` を代入) なので `let map = null` → `NORIRECO.map.instance = null; ... .instance = L.map(...)` の単純置換で済む。`memoMode` / `clickInfo` は read/write 両方ある mutable プロパティ。

06-map-leaflet.js 内では `const M = NORIRECO.map` の local alias で `M.instance` / `M.memoMode` / `M.clickInfo` の短い形を維持。外部 (04 / 05 / 07 / 08 / 09) からはフルパス `NORIRECO.map.instance` 等。

### call site 書き換え (6 ファイル、約 50 箇所)

- `js/06-map-leaflet.js` — 宣言箇所 + 内部 16 箇所 (`M.instance` / `M.memoMode` / `M.clickInfo`)
- `js/04-gps-location.js` — 8 箇所 (`map.setView` / `map.getZoom` / `map.removeLayer` / `addTo(map)` / `if(!map)`)
- `js/05-supabase-data.js` — 4 箇所 (`map.removeLayer` ×3 + `typeof map !== 'undefined' && map` / `if (map && dotLayerRef)`)
- `js/07-record-mode.js` — 9 箇所 (`map.removeLayer` ×3 / `map.setView` / `map.fitBounds` / `map.getContainer` ×2 / `addTo(map)` / `if(!map)` / `memoMode`)
- `js/08-rendering.js` — 約 20 箇所 (`map.hasLayer` / `map.addLayer` / `map.removeLayer` / `map.getZoom` / `map.getBounds` / `map.getContainer` / `addTo(map)` ×8 / `memoMode` ×4 / `clickInfo` ×6)
- `js/09-tabs-stats.js` — 1 箇所 (`map.invalidateSize`)

`Array.prototype.map(...)` の呼び出し (`stations.map(s => ...)` 等) と区別するため、`map.X` と `map ?` / `if(map)` / `addTo(map)` をそれぞれ別パターンで処理。最終確認で grep で bare `map` が残っていないことを検証。

### 設計上の判断

- **`NORIRECO.map.instance` を選んだ理由**: Leaflet インスタンスは「the map」というドメインの主役なので、ドメイン名前空間自体を `NORIRECO.map` にした。`NORIRECO.map.leaflet` / `NORIRECO.map.L` 等の代案もあったが、将来 Mapbox 等への乗り換え可能性を残すために中立な `instance` を採用。
- **`memoMode` を `NORIRECO.map` 配下に置いた理由**: メモモードは map クリックハンドラと一体で動くため (`map.on('click', ...)` の中で `memoMode` を読む)、論理的に同じドメイン。`NORIRECO.memo` を切るのは過剰分割。
- **`M` local alias を 06 内のみに留めた理由**: 外部ファイル (04/05/07/08/09) は単一短縮命名 (`M`) を共有できない (`M` が別の意味で使われる可能性)。フルパス `NORIRECO.map.X` は冗長だがファイル横断で曖昧性ゼロ。

### 影響範囲

- `js/06-map-leaflet.js` — 宣言部 + 19 箇所書き換え (機能無変更)
- `js/04-gps-location.js` / `05-supabase-data.js` / `07-record-mode.js` / `08-rendering.js` / `09-tabs-stats.js` — call site 書き換えのみ
- `sw.js` — `CACHE_VERSION = 'v196'`
- `npm run check` — 18/18 OK
- 機能リグレッション: なし (state 名前空間化のみ、ロジック無変更)

### v195 との比較

| 観点 | v195 (auth) | v196 (map) |
|---|---|---|
| state 数 | 4 | 3 |
| 関係ファイル | 2 | 6 |
| call site 数 | 22 | 約 50 |
| state の mutability | 全て mutable | 1 単一代入 + 2 mutable |
| Array.prototype.map 等との曖昧性 | なし | あり (`.map(...)` 多用) |

map の方が規模が大きいが、`let map=null` の単一代入性のおかげで実装は機械的に済んだ。次の `record` (07) / `gps` (04) / `data` (02 LINES 系) は更に規模拡大の見込み。

### 教訓

- **`Array.prototype.map(...)` の曖昧性対策**: `\bmap\b` で grep すると `arr.map(...)` も大量にヒットする。`map.X` (member access) と `addTo(map)` / `if(map)` / `map ?` のパターンを分けて edit するのが安全。`map.` (literal) の replace_all は `_mapMode` や `arr.map(` には誤マッチしないので利用可。
- **`typeof map !== 'undefined' && map`**: v131 ロード順事故の名残で defensiveness が複数箇所にあった。`NORIRECO.map.instance` 化で `typeof X !== 'undefined'` の必要性が消える (`NORIRECO.map` は常に存在する)。コードが少し短くなる副作用。

---

## 44. v195 — ES Modules パイロット (案 β) stage 1: 認証 state を `window.NORIRECO.auth` に集約 (2026-05-19)

### 背景

TODO.md §🔥「ES Modules 化 (本番)」の **案 β「window 化 → モジュール化の 2 段階」のパイロット**。v194 までで `NORIRECO.mypage` / `NORIRECO.serviceLines` / `NORIRECO.rideRecord` の **関数 / IIFE 単位の namespace 化** は終わっているが、`let LINES` / `let currentUser` のような **top-level mutable state** はまだ classic script 共有 lexical scope に住んでいる。これが `<script type="module">` 化の最大の壁 (モジュールスコープは script スコープと別物で、`let X` を他ファイルから素の名前で参照できなくなる)。

### 案 β の 2 段階

| Stage | 内容 | この commit (v195) |
|---|---|---|
| 1 | 共有 state を `window.NORIRECO.<domain>.X` の **mutable object property** に集約 (classic script のまま、`<script>` ロード順は変更なし) | 12-auth に対して実施 (pilot) |
| 2 | 各ファイルを `<script type="module">` 化し、`export const auth = ...; window.NORIRECO.auth = auth;` のブリッジで残り classic script 互換を保つ | 次セッション以降 |

stage 1 は **モジュール化に進む前段の地ならし** で、call site の書き換え量を「let → object property」の機械的置換に限定して安全に進められる。stage 2 で破壊的変更 (script type 変更・load 順 deferred 化) が入っても、bridge 1 行で classic script 側が動き続ける。

### 移行した state (4 個)

| 旧 (top-level `let`) | 新 (NORIRECO.auth プロパティ) |
|---|---|
| `supabaseAuthClient` | `NORIRECO.auth.supabaseAuthClient` |
| `currentUser` | `NORIRECO.auth.currentUser` |
| `currentSession` | `NORIRECO.auth.currentSession` |
| `authBackfillRan` | `NORIRECO.auth.authBackfillRan` |

12-auth.js 内では先頭で `const auth = window.NORIRECO.auth` のローカル alias を作り、ファイル内のすべての参照を `auth.currentUser` / `auth.supabaseAuthClient` 等に短縮。外部 (13-mypage-common.js) からは `NORIRECO.auth.currentUser` のフルパス。

### なぜ 12-auth を pilot に選んだか

- **state 数が少ない** (4 個) — レビューと検証が一目で済む
- **cross-file 参照が 13-mypage-common.js の 1 箇所のみ** (`renderMypage()` 内の email 表示) — 書き換えコスト最小
- **render hot path に乗らない** — auth 状態は user interaction で読まれるだけ、init や描画ループから外れている
- **モジュール化したい筆頭** (Notion §2.4 布石⑤ Supabase ラッパー化と地続き)

### call site 書き換え (5 ファイル → 2 ファイル、計 22 箇所)

- `js/12-auth.js` (21 箇所) — `supabaseAuthClient.auth.xxx` → `auth.supabaseAuthClient.auth.xxx`、`currentUser` → `auth.currentUser` 他
- `js/13-mypage-common.js:59` — `currentUser` → `NORIRECO.auth.currentUser`

`currentUserId()` / `authBearerToken()` / `signInWithMagicLink()` などの **関数 API は無変更** (内部で `auth.xxx` を読むようになっただけ)。他ファイルからは引き続き `currentUserId()` / `authBearerToken()` で呼べる。

### 影響範囲

- `js/12-auth.js` — `let X` × 4 を `window.NORIRECO.auth = { ... }` に集約、内部参照を `auth.X` に書き換え (機能無変更)
- `js/13-mypage-common.js:59` — `currentUser` → `NORIRECO.auth.currentUser` (1 行)
- `sw.js` — `CACHE_VERSION = 'v195'`
- `npm run check` — 18/18 OK

### stage 2 (次セッション) の段取り

12-auth を `<script type="module">` 化するには:

1. `<script src="js/12-auth.js">` → `<script type="module" src="js/12-auth.js">` に変更
2. 12-auth.js の最後に `export const auth = window.NORIRECO.auth;` を追加 (将来 module consumer 用)
3. **deferred 化の影響確認**: `type="module"` は暗黙 `defer` なので、12-auth は他の classic script (10-init.js 等) の後で評価される。`initAuth()` 呼び出しのタイミングを `DOMContentLoaded` 後に揃える
4. 04-gps-location.js / 13-mypage-common.js 等の **classic script から `NORIRECO.auth.currentUser` を読む側** は無変更で動く (bridge オブジェクトは module 評価時に確立される)

ただし stage 2 は **deferred 化で初期化順が崩れるリスク**があるため、別セッションで集中して対応。stage 1 (v195) で生まれた `NORIRECO.auth` namespace は stage 2 が来なくても単体で正しく動く。

### 残る windowization 候補 (案 β stage 1 の続き、優先度順)

| Domain | 候補 state | 候補ファイル | 利用箇所 |
|---|---|---|---|
| auth (済) | supabaseAuthClient, currentUser, currentSession, authBackfillRan | 12 | 12, 13-common |
| map | map, memoMode, clickInfo | 06 | 全体 (最大の cross-file 参照) |
| record | recordMode, recordSelection, recordHighlights, pairLineChoices, currentSegments | 07 | 06, 08, 13a |
| gps | locationMode, lastUserGps, recordStartGPS, recordEndTime 他 | 04 | 04, 07 |
| trains | TRAINS, TRAIN_CATEGORIES, selectedTrain* | 02 | 07, 13a |
| data | LINES, SERVICE_LINES, MERGED_STATIONS, CHARACTERS 他 | 02 | 全体 (最大の規模) |
| mypage | _mypageCache, mpActiveSection, mpTripFilter | 13-common | 13a-c |

`map` / `record` / `data` が cross-file 参照の三大塊。pilot (auth) で得た書き換え量の見積りは「state 1 個 ≒ 数行 / consumer file」。`data` 系 (LINES 単体で 100+ 参照) は 1 セッション = 1 ドメインの粒度で進める想定。

### 補足: 案 β を選んだ理由

TODO.md §🔥 で示された 3 案のうち、

- **(a) 全 18 ファイル一気にモジュール化** — 巨大 PR、戻し不能、checkpoint なし
- **(b) state を window.X に出すリファクタ先行 = 案 β** — incremental、各 commit が単体で動く、戻し可能
- **(c) 新規モジュールだけ追加、既存触らず** — pilot として最も safe だが、本質課題 (既存 state の lexical scope 依存) を先送りするだけで「ES Modules 化」のゴールに進まない

案 β は **どの commit でも `git revert` 1 発で戻せる**という安全装置が最大の利点。v131 以降の分割祭り (v190 / v192 / v194) と同じリズムで進められる。

### 教訓

- 「namespace に lift する」だけだと **bare identifier を mass rewrite する必要がある**ように見えるが、**file 内に `const auth = NORIRECO.auth` の local alias を置けばファイル内は短い書き方を維持できる**。cross-file 参照だけがフルパス。これは v192 の `NORIRECO.serviceLines` でも同じパターン。
- mutable state を `let X = ...; window.X = X` の 2 重宣言にしない。**single source of truth は `NORIRECO.<domain>.X` だけ**にする。`let X` を残すと stage 2 module 化で「export してるのは module-local X、bridge してるのは別の X」になり、bridge と module の値が divergence する事故が起きる。

---

## 43. v194 — trip 解決 + 乗車状態集計を `04` → `04b-ride-record.js` に切り出し + `NORIRECO.rideRecord` ドメイン (2026-05-19)

### 背景

v192 (SERVICE_LINES 構築の 02b 切り出し) と同じ案 D パターンで、04-gps-location.js の残るドメイン外コード ("trip → segments 解決" + "乗車状態集計") を `04b-ride-record.js` に切り出し。04 を本来の「現在地表示 + 最寄駅 + 記録パネル + キャラ獲得」のみのファイルに純化。

これで 04-gps-location.js は 1037 行 (v190) → 927 (v191、ローダー移管) → 788 (v192、SERVICE_LINES 構築移管) → 430 (v194、trip 解決 + 乗車集計移管) と **本来の責務サイズ (430 行) まで縮小**。「ファイル名と中身が一致する」状態に到達。

### 切り出した内容 (04 → 04b)

| カテゴリ | 名前 | v194 後の場所 |
|---|---|---|
| データ辞書 | `LEGACY_ID_MAP` (旧ID → N02-25 マッピング) | IIFE 内部 (非公開) |
| ヘルパー | `normStName(name)` 駅名正規化 | `NORIRECO.rideRecord.normStName` (05 から外部参照) |
| trip 解決 | `resolveLineWithStations` / `resolveServiceTrip` / `resolveSegments` / `resolveByServiceLine` | IIFE 内部 (非公開) |
| 派生状態 | `slRiddenSt` / `slStopType` / `slVisitCount` / `riddenServiceIds` | 04b top-level `const` (classic script lexical scope 共有のまま、他ファイルから名前で参照可) |
| 集計関数 | `rebuildRiddenStations` | `NORIRECO.rideRecord.rebuild` |
| dead code | `resolveLineId` (定義のみ、呼び出し 0) | **削除** |

state 変数を IIFE 外の top-level `const` に置く設計は v192 と同じ。これで外部スクリプト (04, 02b, 08 等) は `slRiddenSt[sl.id]` のような直接参照を変更せずに済み、関数呼び出し (`rebuildRiddenStations()` → `NORIRECO.rideRecord.rebuild()`) だけが書き換わる。

### call site 書き換え (7 箇所、5 ファイル)

- `rebuildRiddenStations()` → `NORIRECO.rideRecord.rebuild()`
  - `js/02-data-loaders.js:61`
  - `js/05-supabase-data.js:265, 399`
  - `js/06-map-leaflet.js:118`
  - `js/07-record-mode.js:895`
- `normStName(...)` → `NORIRECO.rideRecord.normStName(...)`
  - `js/05-supabase-data.js:516, 517` (05 内 lStats / 駅検索ループ)

04 自身の `slRiddenSt` 参照 (drawObtainableIndicators 内) は引き続き名前で読む (top-level const として lexical scope 経由)。

### ロード順

`04 → 04b → 05`。04b は内部で `riddenSt` (05 で `const riddenSt={}`) を読み書きするが、これは `rebuild()` 関数本体の runtime 参照なので、parse 時点の前後関係は無関係 (`rebuild()` の最初の呼び出しは `load` イベント以降)。

### 影響範囲

- `js/04-gps-location.js` — 788 → 430 行 (-358)
- 新規 `js/04b-ride-record.js` — 約 370 行 (IIFE + JSDoc + top-level state const)
- `js/02-data-loaders.js` / `05-supabase-data.js` / `06-map-leaflet.js` / `07-record-mode.js` — call site 書き換えのみ
- `js/02b-service-lines-builder.js` — JSDoc コメントの slRiddenSt 参照先を「04 → 04b」に更新 (機能無変更)
- `noritetsu-map.html` — `<script src="js/04b-ride-record.js">` を 04 と 05 の間に追加
- `sw.js` — STATIC_ASSETS に 04b 追加 + `CACHE_VERSION = 'v194'`
- `scripts/syntax-check.js` — FILES 配列に '04b-ride-record' 追加 (17 → 18)
- `npm run check` 18/18 OK + 同名関数重複なし

### dead code 除去

`resolveLineId(legacyId)` (旧 04 line 642) は **定義のみで呼び出し 0** だったため切り出し時に削除。grep で全 *.js / *.html を確認済み。

### Phase 3.8 ステータス更新

- ✅ trip 解決 + 乗車状態集計を `04b-ride-record.js` に切り出し、`NORIRECO.rideRecord.{rebuild, normStName}` で公開 (v194)
- ✅ 04-gps-location.js を本来の責務 (現在地・GPS・記録パネル) のみ 430 行に縮小
- ✅ dead code `resolveLineId` 削除
- 🔜 v195+ で ES Modules パイロット (要設計セッション: `let X` を `window.X` / `NORIRECO.store.X` 経由に出すか、全 18 ファイル一気にモジュール化するかの方針議論が必要)

---

## 42. v193 — シンタックスチェック自動化 (`npm run check`) + 同名トップレベル関数の重複検出 (2026-05-19)

### 背景

Notion §2.4 布石② の積み残し消化。v131 以降「`node -e "..."` ワンライナーを手動実行」運用で、忘れたら v127 (`const grid` 二重宣言事故) 型のデプロイ事故が起きる致命工程なのに、人間の記憶だけに依存していた。新規ファイル追加時 (v132/v135/v138/v190/v192) のたびにワンライナーのファイルリスト更新を忘れる落とし穴も同時に解消。

v192 (ES Modules 化の地ならし) → v195+ (本番モジュール化) に向けて、変更の幅が拡大する前にセーフティネットを敷くのが目的。

### 追加

- `package.json` (新規、最小構成) — `"scripts": { "check": "node scripts/syntax-check.js" }` のみ。`"private": true` で誤公開を防止。ランタイムには使われない (PWA は依然クラシック `<script>` 配信)
- `scripts/syntax-check.js` (新規、約 100 行) — `js/01..〜13c` の全 17 ファイルを `new Function(...)` でパース。SyntaxError 0 件を確認 + **同名トップレベル `function NAME(...)` の検出** (v127 / v131 で実際に踏んだ同名関数上書き事故型を警告) を兼ねる
- ファイルリストはスクリプト側にハードコード。新規ファイル追加時の更新先が「HTML / sw.js / scripts/syntax-check.js」の 3 点に整理 (従来の「コメント手書きワンライナー」より明示的)

### 使い方

```bash
npm run check
```

出力例 (clean):

```
OK   01-constants
... (17 行)
---
OK 17 / FAIL 0 (total 17)

✅ All clear.
```

SyntaxError がある場合は exit code 1 で停止し、原因ファイル・行を表示。同名関数があれば警告 (exit 0 のまま、意図的な重複もあるため終了させない)。

### CACHE_VERSION

`v192` → `v193`。ただし `package.json` と `scripts/syntax-check.js` は **`sw.js` の STATIC_ASSETS には含めない** (ランタイムに不要、PWA キャッシュ汚染回避)。CACHE_VERSION は「デプロイ回数 = バージョン番号の不変式」の運用ルールに従ってバンプ。

### 影響範囲

- `package.json` — 新規 (10 行)
- `scripts/syntax-check.js` — 新規 (約 100 行)
- `sw.js` — `CACHE_VERSION` のみ更新 (STATIC_ASSETS は無変更)
- Notion §2.4 布石② を「完了」に更新

### 将来の発展

- pre-commit hook 化は git config を触るので個別判断 (今回は手動 `npm run check` 推奨)
- ESLint / Prettier 導入は依存パッケージが増えるので保留 (現状は依存 0 で完結している軽さが利点)
- CI (GitHub Actions) は GitHub Pages デプロイ前にチェックを走らせる選択肢として残す (現状の「main push 即デプロイ」運用とは別レーン)

### Phase 3.8 ステータス更新

- ✅ Notion §2.4 布石② シンタックスチェック自動化を完了 (v193)
- 🔜 次は v194 で `NORIRECO.rideRecord` ドメイン抽出 (`slRiddenSt` / `slStopType` / `slVisitCount` / `rebuildRiddenStations` の 04 → 04b 切り出し)

---

## 41. v192 — SERVICE_LINES 構築ロジックを `04` → `02b-service-lines-builder.js` に切り出し + `NORIRECO.serviceLines` ドメイン名前空間 (2026-05-19)

### 背景

v190 (13-mypage 分割 + `window.NORIRECO` 導入) / v191 (04 → 02 ローダー移管) の続きとして、**ES Modules 化本番 (次セッション v193 予定) の地ならし**。N=1 (ユーザー自分だけ) のうちが破壊的リファクタの唯一の安全窓なので、シェア機能で新規ユーザーが入る前に進める。

中央ストア方針として 3 案を比較し、議論を経て **案 D「将来そのまま 1 ES Module になる形でドメイン名前空間に切り出す」** を採用:

- 案 A (`SERVICE_LINES` 自体を `NORIRECO.store` に集約) は 8 ファイル 30 箇所超を一度に書き換える単一障害点になりやすい。「巨大グローバルオブジェクト」は ES Modules の最終形ではなく中間形なので二度手間
- 案 B (名前空間の器だけ作る) は中立だが、関数移動だけだと「中央ストアの中身が空」で先送り感が強い
- 案 D = 「02b は IIFE + `NORIRECO.serviceLines = { build, stats, globalStats, detectGroup, regionOf }` でドメイン単位に切り出す」。ES Modules 化のときは IIFE を外して `export { ... }`、call site の `NORIRECO.serviceLines.build()` → `import { build } from './02b-service-lines-builder.js'` に**機械置換だけ**で済む

スケール志向の最終形は「ES Modules + ドメイン分割 export」であり、Redux/Zustand 的な中央ストアではない (`SERVICE_LINES` のようなマスターは domain-owned が自然) — という認識に揃えてから着手。

### 切り出した関数 (04 → 02b)

| 名前 | 公開名 |
|---|---|
| `buildServiceLines()` | `NORIRECO.serviceLines.build()` |
| `slStats(sl)` | `NORIRECO.serviceLines.stats(sl)` |
| `slGlobalStats()` | `NORIRECO.serviceLines.globalStats()` |
| `detectServiceLineGroup()` | `NORIRECO.serviceLines.detectGroup()` |
| `regionOf(lat, lon)` | `NORIRECO.serviceLines.regionOf()` |
| `buildPerLineCoordMap()` | (IIFE 内部、非公開) |
| `deriveN02IdFromAutoId()` | (IIFE 内部、非公開) |
| `_JR_OP_IDS` / `_METRO_TOEI` / `_KANTO_EAST_NORTH` / `_KANTO_SOUTH_WEST` | (IIFE 内部、非公開) |

加えて `deriveN02IdFromAutoId` の **04 内自己重複 (442/448 行で同一本体 2 回宣言)** を切り出し時に統合し、コメントを 1 本に整理 (v191 の宿題消化)。

### call site 書き換え (12 箇所、5 ファイル)

- `js/06-map-leaflet.js:117` `buildServiceLines()` → `NORIRECO.serviceLines.build()`
- `js/09-tabs-stats.js:28,34,37,50,275,279` `buildServiceLines` / `slStats` → `NORIRECO.serviceLines.{build,stats}`
- `js/08-rendering.js:530,1003` `slStats(sl)` → `NORIRECO.serviceLines.stats(sl)`
- `js/05-supabase-data.js:545` `slGlobalStats()` → `NORIRECO.serviceLines.globalStats()`
- `js/13-mypage-common.js:86` `typeof buildServiceLines === 'function'` ガードも `NORIRECO.serviceLines` ガードに置換

### ロード順 (02 → 02b → 03 → 04)

02b は内部で `LINES` / `SERVICE_LINES_MASTER` / `SERVICE_LINES` / `serviceLinesLoaded` / `serviceLinesBuilt` (02 で `let` 宣言) と `loadServiceLinesMaster` / `loadLines` (02 で定義) を参照するため、02 の直後にロード。`stats(sl)` は `slRiddenSt` (04 で `let` 宣言) を runtime に読むが、02b パース時には未宣言でも関数本体は評価されないので問題なし (実際の呼び出しは 04 ロード後のユーザー操作時)。

### 影響範囲

- 新規 `js/02b-service-lines-builder.js` — 166 行 (IIFE 包み + JSDoc コメント含む)
- `js/04-gps-location.js` — 927 → 788 行 (-139)
- `noritetsu-map.html` — `<script src="js/02b-service-lines-builder.js">` を 02 と 03 の間に追加
- `sw.js` — `STATIC_ASSETS` に 02b 追加 + `CACHE_VERSION = 'v192'`
- シンタックスチェックワンライナーのファイルリスト 16 → 17

### つまずきポイント

- IIFE 内で `'use strict';` を入れた上で `SERVICE_LINES = []` のような無修飾代入を行うが、これは 02 の `let SERVICE_LINES` がスクリプト共有レキシカル環境に存在するため strict mode でも合法。クラシック script ロードの「全ファイル同一スクリプト環境」を逆に活用
- 全角カッコ U+FF08/U+FF09 (`首都圏・私鉄（東・北）` 等) は 02b 移管後も保全されているか Python でコードポイント検証 (v190 で半角に誤変換した教訓踏襲)
- 02b は IIFE で内部関数を**スコープ閉じ込め**にしたので、v127 の `const grid` 重複宣言事故型の名前衝突は構造的に発生しない (将来 02c, 02d… を作っても同様)

### Phase 3.8 ステータス更新

- ✅ SERVICE_LINES 構築ロジックを `02b-service-lines-builder.js` に切り出し、`NORIRECO.serviceLines` ドメイン名前空間で公開 (v192)
- ✅ `deriveN02IdFromAutoId` の 04 内自己重複を解消 (v192、v191 の積み残し)
- 🔜 次セッション v193 で `<script type="module">` 化パイロット (02b → 02 → 01 の順に `export`/`import` 化、ロード戦略・SW Network-First 影響を確認)

---

## 40. v191 — `04-gps-location.js` のデータローダーを `02-data-loaders.js` に移管 (2026-05-19)

### 背景

`js/04-gps-location.js` (1037 行、最大ファイル) の中に v131 分割時の経緯で混入していたマスターローダー 3 関数を、本来あるべき `02-data-loaders.js` に移管。「ファイル名 `gps-location` なのに現在地表示と関係ないローダーがいる」という認知負荷を解消。Notion §2.5 落とし穴「04-gps-location.js にデータローダーがいる」を正式に解消した。

### 移管した関数・状態 (04 → 02)

| 種別 | 名前 | 説明 |
|---|---|---|
| ローダー | `loadMergedStations()` | `merged_stations.json` → `MERGED_STATIONS` + `slMergedStationMap` 構築 |
| ローダー | `loadServiceLinesMaster()` | `service_lines_master.json` → `SERVICE_LINES_MASTER` 構築 |
| ローダー | `loadLines(priority)` | `lines-p1〜p4.json` の遅延読込 (LOD) |
| ローダー | `loadLinesForZoom(zoom)` | ズームに応じて必要な priority を loadLines する |
| 定数 | `PRIORITY_FILES` | `{1: 'lines-p1.json', ...}` |
| 関数 | `getPriorityThreshold(zoom)` | ズーム→priority 閾値 |
| 状態 | `SERVICE_LINES_MASTER` / `SERVICE_LINES` | `let` 宣言を 02 へ |
| 状態 | `serviceLinesLoaded` / `serviceLinesBuilt` | `let` 宣言を 02 へ |

### 04 に残したもの

「ローダー」ではなく「構築・分類」ロジックなので 04 に残置:

- `buildServiceLines()` — SERVICE_LINES を構築 (将来は別ファイル候補)
- `buildPerLineCoordMap()` — N02 line ごとの座標索引
- `deriveN02IdFromAutoId()` — sl.id → N02 id (※ 04 内に同名定義が 2 回ある古い自己重複あり、別タスクで整理予定)
- `regionOf()` / `_JR_OP_IDS` / `_METRO_TOEI` / `_KANTO_EAST_NORTH` / `_KANTO_SOUTH_WEST` / `detectServiceLineGroup()` — 地域分類
- `slStats()` / `slGlobalStats()` — 達成率集計

これら「SERVICE_LINES 構築の重み」が大きくなったら、将来 04 から `02b-service-lines-builder.js` 等に切り出す余地あり。

### ロード順は無変更

`02-data-loaders.js` は `01-constants.js` の直後にロードされており、`04-gps-location.js` より先。これは v131 時点から変わっていないので、移管後の依存関係は問題なし (むしろデータローダーが 04 より先にあるべき形になった)。

### 影響範囲

- `js/02-data-loaders.js` — 227 → 346 行 (+119)
- `js/04-gps-location.js` — 1037 → 927 行 (-110)
- `sw.js` — `CACHE_VERSION = 'v191'` (STATIC_ASSETS は無変更、ファイル数も同じ)

### つまずきポイントなし

機能的にはコード移動のみ。グローバル変数 (`MERGED_STATIONS` / `LINES` / `loadedPriorities` / `pendingLoads`) はすでに 02 で `let` / `const` 宣言されていたので、移管した関数からそのまま参照できる。クラシック script ロードのグローバル共有が今回は逆に味方になった (ES Module 化時にはここを明示 `import` する必要が出るが、それは将来セッションへ持ち越し)。

### Phase 3.8 ステータス更新

- ✅ `04-gps-location.js` のデータローダー (`loadServiceLinesMaster` / `loadLines` / `loadMergedStations` 他) を `02-data-loaders.js` に移管、Notion §2.5 落とし穴を解消 (v191)

---

## 39. v190 — `js/13-mypage.js` を 4 ファイル分割 + `window.NORIRECO` 名前空間導入 (2026-05-19)

### 背景

`js/13-mypage.js` が v138 (初版) → v189 で約 **1947 行** に成長。詳細統計 16 種・旅程フィルタ・Trip 編集モーダル・後追い認証・トースト等がすべて 1 ファイルに同居し、これ以上の追加 (stop_type 編集 UI / シェア機能 / キャラ図鑑) を入れると 2500 行を超えて grep も diff も辛くなる。Notion §2.4「次のモジュール化セッションで仕込む布石」の優先度順 ①③④ を実施。

### 布石セクションのうち実施した項目

- ⭐ ① `window.NORIRECO` 名前空間の導入（議論ベース → 採用）
- ⭐ ③ 13-mypage.js から共通部分を `13-mypage-common.js` に抽出
- ④ 13a-stats / 13b-trips / 13c-lines に分割（`NORIRECO.mypage.xxx` に登録）

スコープ外（今回はやらない）:
- ②シンタックスチェック自動化 (package.json scripts)
- ⑤ Supabase 呼び出しを `NORIRECO.api.xxx` ラッパー化
- ES Module 化 / TypeScript 化 / 既存 `slStats` 等の書き換え

### 分割後のファイル構成

| ファイル | 行数 | 担当 |
|---|---|---|
| `js/13-mypage-common.js` | 366 | NORIRECO 名前空間初期化 / 状態 (`_mypageCache`, `mpActiveSection`, `mpTripFilter`) / `renderMypage` / `applyMpSection` / `switchMpSection` / `tripCardHtml` / `_MP_SORT_COMPARATORS` / `showMypageToast` / `isTimeMachineActive` / `formatDelayMin` |
| `js/13a-stats.js` | 1308 | 📊 統計タブ + 詳細統計 16 種 (`buildCompletionCards` / `buildDetailContent` / `buildOperatorYearly` / `buildCarModelStats` / `buildUnexplored` / `buildTimeHeatmap` / `buildStationTimeline` / `buildLineTimeline` / `buildRecentTripCard` / `buildPersonalRecords` / `buildPrefectureChart` 他) + `PREFECTURES` / `MAJOR_TERMINALS` / `prefOfStation` / `detailCard` |
| `js/13b-trips.js` | 354 | 🚃 旅程タブ + フィルタバー (`renderMpTripsSection` / `buildTripFilterBar` / `applyTripFilters`) + Trip 編集モーダル (v184/v185 メモ・遅延後追い編集) + `retroactivelyVerifyTrip` (GPS 後追い認証 v138) + `deleteTripFromMypage` |
| `js/13c-lines.js` | 21 | 📋 路線タブ (renderList ラッパー + 将来拡張ポイント) |

合計 2049 行 (旧 1947 行 + 102 行は `NORIRECO.mypage.xxx = ...` 登録行とヘッダコメント)。

### 名前空間の入れ方 (両建て方式)

- 関数定義は `function xxx() {}` のまま保持
- 末尾に `NORIRECO.mypage.xxx = xxx;` を追加して名前空間にも登録
- HTML onclick から呼ばれる関数 (`renderMypage` / `switchMpSection` / `toggleDetailPane` / `toggleInfo` / `openTripEditModal` / `closeTripEditModal` / `saveTripEdit` / `retroactivelyVerifyTrip` / `deleteTripFromMypage` / `updateMpFilter` / `resetMpFilter`) は従来通り `window.xxx = xxx` も維持
- 既存の `slStats` 等は書き換えしない（布石の精神どおり、新規・移動分のみルール導入）

### 状態変数の扱い

クラシック script ロードゆえに変数は同じグローバル Script 環境を共有するため、`_mypageCache` / `mpActiveSection` / `mpTripFilter` は 13-mypage-common.js のトップレベル `let` のまま据え置き。13a/13b から直接参照する（v189 までと挙動同一）。状態の名前空間化は ES Module 化セッションで一括検討。

### 13c-lines.js を薄く切った理由

路線一覧は `09-tabs-stats.js` の `renderList()` を再利用しているため、現状ロジックは実質ゼロ。それでも 13a/13b と並ぶ「3 タブ 3 ファイル」構成を維持するために `renderMpLinesSection` だけのプレースホルダを置いた。将来「路線色のユーザーカスタマイズ」「路線別バッジ表示」等が来る器。

### ロード順 (noritetsu-map.html)

```
01-constants → 02-data-loaders → 03-characters → 04-gps-location
→ 05-supabase-data → 06-map-leaflet → 07-record-mode → 08-rendering
→ 11-fraud-detection → 12-auth
→ 13-mypage-common → 13a-stats → 13b-trips → 13c-lines  ← v190 新規
→ 09-tabs-stats → 10-init
```

13系の中の依存: common → a/b/c。13a/13b は `_mypageCache` / `mpTripFilter` / `tripCardHtml` / `_MP_SORT_COMPARATORS` / `showMypageToast` を 13-common から参照。

### つまずきポイント

**全角カッコの混入**: `buildByGroup` の `order` 配列で「首都圏・私鉄（東・北）」「首都圏・私鉄（南・西）」が全角カッコ `（）` (U+FF08/U+FF09) なのを、初版で半角 `()` に取り違えた。SERVICE_LINES の group 名と文字列一致しなくなると、これらの路線がソート位置の末尾 (999) に追いやられて見た目が崩れる。CLAUDE.md にもある「漢字を扱うときは見た目の似た文字に注意」が刺さる事例。`python -c` でコードポイント直接確認 (0xff08/0xff09) して修正。

**`function buildTimeHeatmap` の `const grid` ローカル変数**: v127 の二重宣言事故と同名だが、これは関数スコープ内なのでグローバル衝突しない。ただし将来 13a-stats.js を更に分割するときに偶然トップレベル `const grid` を作ると v127 が再発する。今回は `heatGrid` にリネームして将来の事故予防もしておいた。

### 影響範囲

- `js/13-mypage.js` — **削除** (1947 行)
- `js/13-mypage-common.js` — 新規 (366 行)
- `js/13a-stats.js` — 新規 (1308 行)
- `js/13b-trips.js` — 新規 (354 行)
- `js/13c-lines.js` — 新規 (21 行)
- `noritetsu-map.html` — 1395-1398 の `<script src>` を 4 行に置換
- `sw.js` — `STATIC_ASSETS` に 4 ファイル追加 + `CACHE_VERSION = 'v190'`

### 動作確認チェック (デプロイ後にやる)

- マイページの 📊 統計 / 🚃 旅程 / 📋 路線 サブタブ切替
- 完乗率カード (公式 / 全記録) の表示
- 詳細統計 16 種すべての展開
- 旅程フィルタ (期間 / 認証 / 種別 / 並び替え)
- Trip 編集モーダル (✏️ メモ編集 → 保存)
- GPS 後追い認証 (📍 GPSで認証 ボタン)
- 旅程削除
- 統計タブ「📌 直近の旅程」カード表示
- 「〜月指定」バナー表示

### Phase 3.8 ステータス更新

- ✅ `13-mypage.js` 1947 行を 4 ファイル (common / 13a-stats / 13b-trips / 13c-lines) に分割、`window.NORIRECO` 名前空間を導入 (v190)

### 次への布石

- ES Module 化セッション本番は別途。これは「ES Module 化に向けた構造的予防」第一弾
- 04-gps-location.js からデータローダー (`loadServiceLinesMaster` 他) を 02-data-loaders.js に移管する作業はまだ残っている
- `NORIRECO.api.xxx` ラッパー (布石⑤) は次に 13系を触るときに `supabase.from('norireco_trips')` 直接呼び出しを置換していく

---

## 38. v189 — 駅フィルタアイコンを 📍 → 🚉 (location-fab との重複解消) (2026-05-18)

地図 FAB の現在地ボタン (`location-fab` = 📍) と地図上部の駅フィルタアイコン (`ctrl-icon-station` = 📍) が同じ絵文字でかぶっていた。
駅フィルタ側を **🚉** に変更し、視覚的な役割分担を明確化：
- 📍 = 現在地 / GPS 関連 (右下 FAB、GPS 記録開始モーダル等)
- 🚉 = 駅フィルタ (上部、●降車/◎乗車/○通過/□未訪問)

### 影響範囲

- `noritetsu-map.html` — `#ctrl-icon-station` のテキストを 📍 → 🚉
- `sw.js` — `CACHE_VERSION = 'v189'`

### Phase 3.8 ステータス更新

- ✅ 駅フィルタアイコンを 🚉 に変更（現在地アイコンとの重複解消）(v189)
