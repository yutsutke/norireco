# 乗レコ - 電車旅 更新履歴詳細

各セッションごとの実装ログ・経緯・失敗教訓を時系列で残す詳細メモ。

> ドキュメント役割分担は Notion §0「ドキュメント役割分担」が真実の源（v276 で Notion に集約）。本ファイルは変更履歴詳細を扱う。
> 過去フェーズは [`CHANGELOG_PHASE1-3.7.md`](CHANGELOG_PHASE1-3.7.md) / [`CHANGELOG_PHASE3.8-early.md`](CHANGELOG_PHASE3.8-early.md) / [`CHANGELOG_PHASE3.8-modules.md`](CHANGELOG_PHASE3.8-modules.md) / [`CHANGELOG_PHASE3.8-share.md`](CHANGELOG_PHASE3.8-share.md) / [`CHANGELOG_PHASE3.8-photo.md`](CHANGELOG_PHASE3.8-photo.md) / [`CHANGELOG_PHASE3.8-mypage.md`](CHANGELOG_PHASE3.8-mypage.md) / [`CHANGELOG_PHASE3.8-station-id.md`](CHANGELOG_PHASE3.8-station-id.md) / [`CHANGELOG_PHASE3.8-vehicles.md`](CHANGELOG_PHASE3.8-vehicles.md) / [`CHANGELOG_PHASE3.8-transfer.md`](CHANGELOG_PHASE3.8-transfer.md) / [`CHANGELOG_PHASE3.8-bulk-record.md`](CHANGELOG_PHASE3.8-bulk-record.md) にアーカイブ。

## 分割ポリシー

ファイルが長くなり扱いづらくなったら（目安: **1500 行超**、または Phase が一区切りついたタイミング）、過去フェーズを別ファイルに切り出す。**Stop hook (`.claude/hooks/stop-reminder.js`) が 1500 行超を機械検知して警告する**（v349〜）。

CHANGELOG.md を整理するときは **STATUS.md も同時に整理** する（領域別ステータス表の完了済み行をマージ・スリム化）。

分割履歴:
- 2026-05-20 分割 (1回目): §1〜§21 (Phase 1〜3.7, v60〜v157) を [`CHANGELOG_PHASE1-3.7.md`](CHANGELOG_PHASE1-3.7.md) に退避
- 2026-05-20 分割 (2回目): 残った 3252 行をさらに 3 分割
  - §22〜§37 (v173〜v188) → [`CHANGELOG_PHASE3.8-early.md`](CHANGELOG_PHASE3.8-early.md)
  - §38〜§74 (v189〜v225, ES Modules 化) → [`CHANGELOG_PHASE3.8-modules.md`](CHANGELOG_PHASE3.8-modules.md)
  - 本ファイルは §75 (v226, Phase 3.8 後半) から開始
- 2026-05-26 分割 (3回目): 5722 行に膨らんだ本体をテーマで分割
  - §75〜§98 (v226〜v249, シェア MVP + 完乗率統合 + 系統色 + Cloudflare 移行) → [`CHANGELOG_PHASE3.8-share.md`](CHANGELOG_PHASE3.8-share.md)
  - §99〜§126 (v250〜v278, 駅メモ + R2/Workers + 写真添付 + Notion ドキュメント整理) → [`CHANGELOG_PHASE3.8-photo.md`](CHANGELOG_PHASE3.8-photo.md)
  - §127〜§137 (v279〜v289, マイページ即時反映 + 駅/路線アクションシート + 駅名検索) → [`CHANGELOG_PHASE3.8-mypage.md`](CHANGELOG_PHASE3.8-mypage.md)
  - §138〜§183 (v290〜v333, 駅 ID 体系 Phase 1〜3 完結) → [`CHANGELOG_PHASE3.8-station-id.md`](CHANGELOG_PHASE3.8-station-id.md)
  - 本ファイルは §184 (v334, through_lines 本格運用化) から開始
  - (経緯: 当初は share-r2.md 1 ファイルに退避したが 3275 行で太かったため同ターン内で share / photo / mypage に再分割)
- 2026-05-27 分割 (4回目): v367 時点で 1594 行に膨らんだため、完了済みサブテーマを退避
  - §184〜§213 (v334〜v363, through_lines 本格運用化 + GPS 位置づけ変更 + 車両形式 DB + 記録モーダル整理 + 路線詳細モーダル + メモ車両 + CHANGELOG 行数チェック導入) → [`CHANGELOG_PHASE3.8-vehicles.md`](CHANGELOG_PHASE3.8-vehicles.md)
  - 本ファイルは §214 (v364, CHANGELOG 行数チェックを Stop hook → セッション末手続きに移管) から開始 = 乗換候補機能群 (v365〜v367) を集約
- 2026-05-28 分割 (5回目): v398 時点で 1652 行に膨らんだため、完了済みサブテーマを退避
  - §214〜§241 (v364〜v391, 乗換候補自動提案 + 徒歩乗換グループ + 系統別車両形式 + 記録モード per-seg 化 + 旅程編集モーダル per-seg cascade + サブエージェント方針実装) → [`CHANGELOG_PHASE3.8-transfer.md`](CHANGELOG_PHASE3.8-transfer.md)
  - 本ファイルは §242 (v392, trip 詳細エディタ B-1) から開始 = trip 詳細エディタ抽出フェーズ (v392〜)
- 2026-05-28 分割 (6回目): v406 時点で 1682 行に膨らんだため、完了済みサブテーマを退避
  - §242〜§256 (v392〜v406, trip 詳細エディタ抽出 B-1〜B-4-b + 一括記録 A-1〜A-8 完結) → [`CHANGELOG_PHASE3.8-bulk-record.md`](CHANGELOG_PHASE3.8-bulk-record.md)
  - 本ファイルは次のフェーズの最初の §257 から開始 (現時点ではセクションなし、ヘッダのみ)

次回分割の目安: 本ファイルが 1500 行超になったら、その時点で完成しているサブフェーズを別ファイルに退避（命名例: 内容に即したテーマ名）。

切り出し時は本ファイル冒頭の役割表・分割ポリシー、`TODO.md`・Notion §0 の参照リンクも合わせて更新する。

過去ログの参照早見表:
- 認証グラデーション・GPS 記録フロー初期実装・列車種別・コードベース 13 ファイル分割・Supabase 認証/マイページ初期版 → [`CHANGELOG_PHASE1-3.7.md`](CHANGELOG_PHASE1-3.7.md)
- データ補修・期間フィルタ「〜月指定」・記録モード用語統一・後追い記録・stop_type 駅 UI 個人化・地図フィルタ統合 → [`CHANGELOG_PHASE3.8-early.md`](CHANGELOG_PHASE3.8-early.md)
- 13-mypage 4 分割・SERVICE_LINES builder 分離・ride-record 分離・ES Modules stage 1〜3 (`<script type="module">` + `import`/`export` 化) → [`CHANGELOG_PHASE3.8-modules.md`](CHANGELOG_PHASE3.8-modules.md)
- 旅程編集拡張・ログアウトセキュリティ・OGP シェア MVP・完乗率統合・系統色カスタマイズ + Supabase 同期・Cloudflare Pages 移行 + norireco.app → [`CHANGELOG_PHASE3.8-share.md`](CHANGELOG_PHASE3.8-share.md)
- 駅メモ本格化 (Supabase CRUD + マイページ「📸 メモ」タブ)・駅アクションシート・R2/Workers ゲートウェイ・写真添付フル機能 (memo/trip 最大 5 枚 + D&D 並び替え)・Notion ドキュメント整理 (STATUS.md 分離 + 役割分担再集約) → [`CHANGELOG_PHASE3.8-photo.md`](CHANGELOG_PHASE3.8-photo.md)
- マイページ即時反映 (renderMypage)・地図駅クリックで「この駅を含む旅程」一覧・路線アクションシート・旧 📸 memoMode 完全撤去・マイページ駅名検索 (4 chip 始点/終点/乗換/通過 + IME 安定化) → [`CHANGELOG_PHASE3.8-mypage.md`](CHANGELOG_PHASE3.8-mypage.md)
- 駅 ID 体系 Phase 1〜3 (集計・描画・キャラ・GPS 後追い認証・メモ/旅程列・LINES に駅 id 付与・カバレッジ 100%・SERVICE_LINES の駅追加・Supabase migration Applied 規約導入)・駅クリック確実化・駅名+都道府県検索・FAB 並び・hook→CLAUDE.md 移管 → [`CHANGELOG_PHASE3.8-station-id.md`](CHANGELOG_PHASE3.8-station-id.md)
- through_lines (直通系統) 本格運用化 (142 系統/642 で 22.1% カバー、新幹線 + 関東 + 関西 + 名古屋 + 第三セクター)・GPS 記録の位置づけ変更 (世間への証明 → 手間省略、不正検知撤回)・営業系統×車両形式 DB (Notion → JSON)・記録モーダル全面整理 (遅延独立トグル + カテゴリ dropdown 駆動 + 普通電車 cascade)・旅程/路線/メモ全層に車両形式統合 + 検索・路線詳細モーダル → [`CHANGELOG_PHASE3.8-vehicles.md`](CHANGELOG_PHASE3.8-vehicles.md)
- 乗換候補自動提案 (1 hop top 5 + 直通あり優先 + 2 hop fallback top 3、駅→系統索引キャッシュで ~400ms)・徒歩乗換グループ DB (243 グループ/553 駅自動抽出 + Union-Find transitive closure + override 機構)・系統別車両形式 (`T.selectedCarModelBySl` Map + chip 切替)・記録モード「区間 → カスケード」順 per-seg 化・旅程編集モーダルも per-seg フル cascade 対応・サブエージェント `js-syntax-guard` 配置 → [`CHANGELOG_PHASE3.8-transfer.md`](CHANGELOG_PHASE3.8-transfer.md)
- trip 詳細エディタ抽出 (`createTripDetailEditor` factory + per-seg-chip / per-seg-rows / trip-level 3 mode + multi-container API、02/07/13b 3 箇所重複から単一 factory に集約、~540 行削除)・一括記録 (まとめて記録) 本体 (営業系統チェックリスト + たたむ/開くアコーディオン + 検索/フィルタ + 一括保存 + 同時 1 行制御 factory 行内 mount + オンボーディングバナー + 区間ピッカー)・unknown 集計検証 (現状 (b) 確定) → [`CHANGELOG_PHASE3.8-bulk-record.md`](CHANGELOG_PHASE3.8-bulk-record.md)

---

## 260. v410 — シェア機能 S-1: 個別 trip シェア画像

**バージョン**: v410 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A（実装 / 🔥 シェア機能）

### 背景

🔥 シェア機能の残りは ①個別 trip シェア / ②`/share/<id>` ページ / ③R2 保存 の 3 つ。`/share/<id>` のリッチプレビューには OGP メタの `og:image` が**実在する静的画像 URL**を指す必要があり (クローラは JS 非実行)、現状のクライアント Canvas 生成では足りない。よって 3 パートは独立でなく依存関係があり、**S-1 (純クライアント) → S-2 (R2 永続画像) → S-3 (/share ページ)** の順に分割。本セッションは S-1。

「verified 限定ガード」は v345 で撤回済 (GPS = 手間省略であって証明ではない)。手動記録も対等にシェア可なので S-1 では全 trip にシェアボタンを出す。

### 変更

- `js/14-share-ogp.js`:
  - `buildSegmentPolylines(segs)` を引数対応化 (省略時 `RIDDEN_SEGS` = 累計版、指定時 trip.segments)
  - `computeTripBbox(polylines, w, h, pad)` 追加 — trip 区間を覆う bbox を計算。投影が lon→x/lat→y 独立線形なので緯度補正 (cos) で歪み防止 + **最小スパン 0.9°** で短距離 trip の過度ズーム (粗い県境ポリゴンのギザギザ) を回避
  - `drawJapanMap` を `(…, bbox, opts)` 対応化 — bbox 省略時 JP_BBOX (profile 版は変更不要)。グリッドを bbox から動的計算、パネルへ clip、`opts.lineWidth`/`glow`/`endpoints` (始点○/終点●) 対応
  - `deriveTripDisplay(trip)` + `drawTripStatsPanel` 追加 — 路線名 (複数路線は「○○線 ほか N 路線」)/区間 (from→to)/駅数/乗換/乗車日 (precision 別)/列車・車両。長文は font 自動縮小
  - `generateTripOgpCanvas(trip)` + `openTripShareModal(trip)` 追加
  - モーダルを動的化: `_downloadName`/`_shareText` モジュール変数 + `paintCanvas` helper。タイトル/サブを profile/trip で出し分け (`#share-ogp-title`/`#share-ogp-sub`)
  - `window.NORIRECO.share` に `openTripShareModal` 追加
- `js/13b-trips.js`: `shareTripFromMypage(tripId)` 追加 (_mypageCache から trip 引き当て → window 経由で share モジュール呼出) + window 公開
- `js/13-mypage-common.js`: `tripCardHtml` のアクション行に「📤 シェア」ボタン追加 (編集とゴミ箱の間)
- `noritetsu-map.html`: `.mp-act-btn.share` CSS (緑系アクセント #2ec486)
- CACHE_VERSION v409 → v410

### 検証 (preview)

外房線 千葉→鎌取 (4 駅) の test trip を注入して `openTripShareModal` を実行。1200×630 Canvas を PNG 抽出して目視確認:
- 右パネル: 「🚃 この旅程 / 外房線 / 千葉 → 鎌取 / 駅数 4 駅 / 乗換 0 回 / 乗車日 2025-08-15 / 列車・車両 [209系]」正常
- 地図: 当初ズームが寄りすぎて県境ポリゴンが三角形に割れた → 最小スパン 0.9° 導入で東京湾・房総半島の海岸線が認識できる地域ビューに改善、trip 経路 (シアン線 + 白 glow + ○始点/●終点) が描画
- syntax-guard clean (3 ファイル)、console error 0

### 残課題

- S-2: Worker `/upload/share-image` (presigned PUT) で生成 PNG を R2 へ → 永続 CDN URL
- S-3: Supabase `norireco_shares` + Cloudflare Pages Function `/share/[id]` で OGP メタ込み HTML + CTA
- ブラウザのモジュール HTTP キャッシュにより、同一ページ内ホットリロードでは旧 `window.NORIRECO.share` が残ることがある (本番は CACHE_VERSION 更新で SW が新ファイル配信するため問題なし)

---

## 259. v409 — 期間フィルタに「年横断 (季節/月)」モード追加

**バージョン**: v409 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A（実装 / 体験向上）

### 背景

期間フィルタ (`js/05-supabase-data.js`) の既存モードは `all / thisYear / lastYear / untilMonth / custom` の 5 つで、いずれも**連続した日付レンジ** (`fromStr 〜 toStr`) で表現されていた。ユスケ要望「年をまたいで『夏だけ』『12月だけ』を見たい」はレンジでは表現できず、**月メンバーシップ**で絞る新モードが必要だった (例: 2023 年の夏と 2024 年の夏を同時に塗る)。

### 設計判断

- **ピッカー形式**: 季節プリセット (春夏秋冬) + 1〜12 月の複数トグル。ユスケ選択。「夏 (複数月)」も「12 月だけ」も「12 月と 1 月」も表現できる最も柔軟な形
- **季節区切り**: 行楽期重視 = 春 4-5 / 夏 7-8 / 秋 10-11 / 冬 12-1 月。ユスケ選択。気象庁式 (各 3 ヶ月) でなく、旅行・乗り鉄のハイシーズン寄りに各 2 ヶ月へ絞り、中間の端境期月を外した
- **精度の扱い**: `date_precision='unknown'` は従来通り除外。加えて **`year` 精度も除外** — `year` 精度の trip は `date=YYYY-01-01` で月が常に 01 になり「夏」フィルタに 1 月の記録が紛れ込むため。`month`/`day`/`minute` のみ月が信頼できる

### 変更

- `js/05-supabase-data.js`:
  - `SEASON_PRESETS` const (行楽期区切り) 追加
  - `seasonFilterLabel(months)` export 追加 — プリセット一致なら「夏 (7・8月)」、それ以外は「7・9月」を返す。チップ/バナー共用
  - `filterTripsByDate` に `season` 分岐追加 (レンジ計算の手前で早期 return)
  - `toggleSeasonFilter` / `closeSeasonFilter` / `applySeasonPreset` / `applySeasonFilter` 追加 + window 公開 (HTML onclick 用)。月トグルは初回 open 時に 12 個を JS 生成、現在の選択を反映
  - `updateDateFilterUI` に season チップラベル更新を追加
- `js/13-mypage-common.js`: `seasonFilterLabel` を import、`renderMpTimeMachineBanner` に season 分岐追加 (「🗓 夏 (7・8月) の記録で表示中 (年横断)」)
- `noritetsu-map.html`: 〜月指定とカスタムの間に `data-mode="season"` チップ追加、`#dfilter-season-pop` ポップアップ (季節プリセット 4 + 月グリッド + 適用/×) 追加、`.dfilter-season-preset` / `.dfilter-season-months` / `.dfilter-month-tog` CSS 追加
- CACHE_VERSION v408 → v409

### 検証 (preview)

- `filterTripsByDate` 直接テスト: 夏 (07,08) → 2024 年 + 2023 年の両 trip がヒット (年横断 OK)、12 月だけ → 12 月 trip のみ、冬 (12,01) → Dec 2024 + Jan 2022 (年またぎ季節 OK)、`year` 精度 + `unknown` は正しく除外
- ラベル: 夏 (7・8月) / 12月 / 7・9月
- UI フロー: 季節チップ → ポップアップ open → 夏プリセットで 7,8 ハイライト → 12 月手動追加 → 適用 → チップ「7・8・12月」+ active + localStorage 永続化 + 再 open で選択復元。console error 0

### 残課題

- Notion §1.1 (共通 UI 期間フィルタ) の仕様更新はセッション末にまとめて反映

---

## 258. v408 — 時刻セクションのラベルから「（後追い記録向け）」を削除

**バージョン**: v408 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A（UI 文言修正）

### 背景

`createTripDetailEditor` factory の 5 精度 time row (`_initTimeRowFull5`, `js/20-trip-detail-editor.js:302`) のヘッダが「🕒 乗車日時（後追い記録向け）」だった。この文言は 5 段階 `date_precision` 導入時 (CHANGELOG_PHASE3.8-early §72 付近)、記録確認モーダルで「手動記録のみ展開する後追い記録専用の補助」として作られた名残。

その後 factory 集約 (B-1〜B-4-b) で同じ time row が 07 経路確認モーダル（ライブ記録直後）・13b 旅程編集・一括記録アコーディオンの 3 箇所で共有されるようになり、**乗ったばかりで日時が既に正しく埋まっているライブ記録の確認画面でも「(後追い記録向け)」と出てミスリード**になっていた。精度ドロップダウン「📐 記憶の精度」自体が後追い用途を伝えるので括弧書きは冗長。

### 変更

- `js/20-trip-detail-editor.js:302`: 「🕒 乗車日時（後追い記録向け）」→「🕒 乗車日時」
- 2 精度版 (`_initTimeRow`, line 227) のヘッダ「🕒 乗車時刻」は元から括弧書きなしのため変更なし
- CACHE_VERSION v407 → v408

preview で factory を 5 精度 time で mount しヘッダ textContent が「🕒 乗車日時」になることを確認、map 全モジュール console error 0。

---

## 257. v407 — 旧 `noritetsu-log.html` 削除（一括記録による完全置換）

**バージョン**: v407 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A（実装 / クリーンアップ）

### 背景

`noritetsu-log.html` (1879 行) は v60 期以前から続いた「フォーム式 1 件入力」のログ画面。Phase 3.7 以降は地図画面 (`noritetsu-map.html`) の FAB 記録モード + マイページ旅程編集 + 一括記録 (v400〜v406) が機能を完全に引き継いだため、もはや起点として開く意味がなくなっていた。残置すると sw.js のプリキャッシュ対象として無駄に転送される + PWA `start_url` が旧 log を指したままで install 済ユーザーが意図しない画面に着地する問題があった。

TODO 🟡「ノリレコログを地図画面のタブとして統合」は Notion §1.3 一括記録の本体実装 (v400〜v406) により受け皿が揃ったので、log 画面そのものを統合せず削除する判断。

### 変更

- `noritetsu-log.html` を `git rm` で削除（1879 行）
- `manifest.json`:
  - `start_url` を `./noritetsu-log.html` → `./noritetsu-map.html` に変更
  - shortcut「新しい乗車を記録」(`url: ./noritetsu-log.html`) を削除。残るは「乗りつぶしマップ」shortcut 1 個
- `sw.js`: STATIC_ASSETS から `./noritetsu-log.html` を除去、CACHE_VERSION v406 → v407
- `STATUS.md`: コードベース説明から log 行削除、本数を `js/01-..〜21-..` に更新（21-bulk-record まで反映）、CACHE_VERSION 更新
- `TODO.md`:
  - 🔥 シェア機能の「noritetsu-log.html のテキストシェアを地図画面に移植」を削除（log 廃止により消滅）
  - 🟡「ノリレコログを地図画面のタブとして統合」項目を削除（一括記録で代替済）
  - 🟡「一括記録」項目のサブタイトル「— noritetsu-log.html 廃止の受け皿」を「v407 で旧 log 削除完了 = 受け皿として完全置換」に書き換え

### 残作業

過去フェーズの CHANGELOG_*.md と `supabase/migrations/v250_norireco_memos.sql` のコメント内には `noritetsu-log.html` への言及が残っているが、いずれも履歴・コメントとしての文脈であり修正不要（過去アーカイブは read-only 方針 + migration コメントは「当時の状況説明」として有意味）。

### 教訓

- **PWA `start_url` 変更は install 済ユーザーへ波及する** — 削除前に start_url を必ず生存しているページに付け替える。今回は manifest 変更を 1 commit に含めたので新 install / 再起動で自動的に map.html へ遷移する
- **ファイル削除タスクの参照棚卸し**は `git grep` 一発で済む。今回 10 ファイルヒットの内訳: アクティブ参照 4 (manifest / sw / STATUS / TODO) + CHANGELOG 5 + migration コメント 1。アクティブだけ直し履歴は触らない

---

