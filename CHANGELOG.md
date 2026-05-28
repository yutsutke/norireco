# 乗レコ - 電車旅 更新履歴詳細

各セッションごとの実装ログ・経緯・失敗教訓を時系列で残す詳細メモ。

> ドキュメント役割分担は Notion §0「ドキュメント役割分担」が真実の源（v276 で Notion に集約）。本ファイルは変更履歴詳細を扱う。
> 過去フェーズは [`CHANGELOG_PHASE1-3.7.md`](CHANGELOG_PHASE1-3.7.md) / [`CHANGELOG_PHASE3.8-early.md`](CHANGELOG_PHASE3.8-early.md) / [`CHANGELOG_PHASE3.8-modules.md`](CHANGELOG_PHASE3.8-modules.md) / [`CHANGELOG_PHASE3.8-share.md`](CHANGELOG_PHASE3.8-share.md) / [`CHANGELOG_PHASE3.8-photo.md`](CHANGELOG_PHASE3.8-photo.md) / [`CHANGELOG_PHASE3.8-mypage.md`](CHANGELOG_PHASE3.8-mypage.md) / [`CHANGELOG_PHASE3.8-station-id.md`](CHANGELOG_PHASE3.8-station-id.md) / [`CHANGELOG_PHASE3.8-vehicles.md`](CHANGELOG_PHASE3.8-vehicles.md) / [`CHANGELOG_PHASE3.8-transfer.md`](CHANGELOG_PHASE3.8-transfer.md) にアーカイブ。

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

---

## 248. v398 — trip 詳細エディタ B-4-a 完了 (13b/07 の visible dead code 撤去) (2026-05-28)

### 背景

§247 (v397, B-3c) で 07 確認モーダル側の time/delay/notes を factory 集約。13b/07 で旧 cascade UI (DOM id ベース直書き) + 旧 helper 関数 + 旧 input が display:none で「dead code として残置」状態だった。B-4 は「dead code 撤去 + 3 instance を 1 instance に統合」を含むが、規模が大きいので 2 段階に分割:

- **B-4-a (本 deploy)**: visible な確認モーダル / 編集モーダル内の旧 HTML + 関数撤去
- **B-4-b (次 deploy 予定)**: グローバル `NORIRECO.trains.selectedXxxBySl / activeChipSlId` 撤廃 + 02-data-loaders の旧 cascade handler + 07 の旧 SL chip ロジック撤去 + 各 modal 3 instance を 1 instance に統合

### 撤去対象

#### 13b (`js/13b-trips.js`、264 行削除)
旧 10 関数 (line 488-751 だった範囲):
- `applyTripEditCategoryVisibility` / `populateTripEditTrainDropdown` / `onTripEditCategoryChange`
- `applyTripEditSegCategoryVisibility` / `populateTripEditSegCarSelect` / `restoreTripEditSegCascade`
- `onTripEditSegCategoryChange` / `onTripEditSegTrainChange` / `onTripEditSegCarChange` / `onTripEditTrainChange`

factory `createTripDetailEditor` (per-seg-rows / trip-level mode) が完全置き換え (v393 B-2)。`window.xxx` 公開していた 5 関数も削除、HTML 内 onchange ハンドラ参照は HTML 側削除と同時撤去。

#### 07 (`js/07-record-mode.js`、70 行削除)
旧 4 関数:
- `onRecEditPrecisionChange` (line 974-988 + window 公開)
- `_populateRecEditYearMonth` (line 1069-1099)
- `initRecDelayToggle` (line 1708-1715)
- `onRecDelayToggle` (line 1717-1731 + window 公開)

factory `_initTimeRowFull5` / `initDelay({ maniaToggle, prefKey })` が完全置き換え (v397 B-3c)。`initRecTrainToggle` 末尾の `initRecDelayToggle()` 呼出は v397 で既に撤去済。

#### HTML (`noritetsu-map.html`、計 19 element 削除)
- **13b modal**:
  - `#trip-edit-train-category` (select) / `-id` (select) / `-name` (input) / `-car-model` (input) — 4 select/input
  - `#trip-edit-date` / `-depart` / `-arrive` / `-time-lock` / `-time-inputs` — 5 element
  - `#trip-edit-delay-h` / `-m` / `#trip-edit-notes` — 3 element
- **07 modal**:
  - `#rec-edit-precision` / `-date` / `-depart` / `-arrive` / `-year-m` / `-month-m` / `-year-y` — 7 element
  - `#rec-delay-toggle` / `-row` / `#rec-edit-delay-h` / `-m` / `#rec-edit-notes` — 5 element

旧 HTML 内 `onchange="onTripEditCategoryChange()"` 等のハンドラ参照も同時撤去 (関数本体削除と整合)。

### グローバル `selectedXxxBySl / activeChipSlId` 撤廃調査

HTML 側に `#rec-train-category / -id / -name / car-model / rec-sl-chips / rec-sl-vehicle-select 等` の旧 DOM が**既に存在しないこと**を Grep で確認。よって `02-data-loaders.js` の `onTrainCategoryChange / onTrainChange / ...` (line 342-492) と `07-record-mode.js` の `applyRecTrainCategory / clearAllTrainSelections / populateSlVehiclePicker / selectSlChip / onSlVehicleChange / onSlVehicleCustomInput` (line 1626-1917) は実質 dead 確認。グローバル T fields も visit-only fallback (line 1344-1370) を除き dead。

ただし規模 (300+ 行削除 + saveMultiSegmentTrip の visit-only fallback 書き換え) が大きく、本 deploy に詰め込むと test 範囲が広がりすぎるため **B-4-b 別 commit** で対応する判断。今回は visible HTML + 関数のみに留める。

### 検証

`node --check --input-type=module` 全 module clean、`js-syntax-guard` サブエージェントで構文 + window 公開関数の onclick/oninput 残存ゼロ + dead chain 撤去漏れゼロ + 旧 input id の実コード参照ゼロ確認。

preview server で smoke test (sw.js v397→v398 bump + SW unregister + caches clear + cache-busting reload):

| Test | 期待 | 結果 |
|---|---|---|
| 07 確認モーダル open (manual, visit-only) | modal open + time editor (5 精度) mount + meta editor (delay toggle + notes) mount | ✅ all true |
| 13b 編集モーダル open (segments あり) | modal open + time editor (2 精度) mount + meta editor (delay 常時表示) mount + per-seg-rows + notes 値復元 | ✅ all true、`has5PrecUI=false`/`hasDelayToggle=false` (13b の features 通り) |

console error 0。

### 削除行数合計

- 13b: 264 行 (関数群) + α (HTML 内 onchange 参照)
- 07: 70 行 (4 関数)
- HTML: 19 element + コメント
- **合計 ~350 行削除**、可読性が大幅向上

---

## 247. v397 — trip 詳細エディタ B-3c 完了 (07 確認モーダルへ time/delay/notes 移植 + 5 精度 + maniaToggle) (2026-05-28)

### 背景

§246 (v396, B-3b) で 13b の 🕒 乗車時刻 row を factory に集約。残った 07 確認モーダル側の time row (5 精度 + GPS preset 連動) + ⏱ 遅延 (mania toggle + localStorage 永続化) + 📝 自由メモ も同じ factory に移植するのが B-3c。これで「確認モーダル中身が 02/07/13b 3 箇所重複していた v383 落とし穴」の主要 4 セクション (time / train / delay / notes) は全て factory 経由に揃う。

### 方針

#### factory 拡張

1. **5 精度 time row** (`_initTimeRowFull5` / `_collectTimeRowFull5` を closure 内に追加):
   - `_supportsFull5Precisions()` (precisions に month/year/unknown のどれかを含む) で early-dispatch
   - 精度 select の option は `features.timeRow.precisions` 配列で絞れる (将来 A 一括記録の「全 5 + unknown default」も同じ仕組みで対応)
   - 行表示切替: minute=date+time、day=date のみ、month=年月 select、year=年 select、unknown=注記のみ
   - 年/月 select は過去 20 年で初期 populate (旧 `_populateRecEditYearMonth` 相当)
   - collect: precision ごとに draft.date / depart_time / arrive_time / total_minutes / date_precision を埋める
   - **unknown のときの date 扱い**: factory は draft.date=null にして呼出側に判断を委ねる (Supabase の NOT NULL 制約は呼出側で today を入れる責務)

2. **delay maniaToggle** (`features.delay` を boolean OR object 両対応に拡張):
   - `true` → 常時表示 (13b 互換)
   - `{ maniaToggle:true, prefKey:'norireco.prefs.showDelayInput' }` → checkbox + localStorage 永続化 (07)
   - checkbox OFF で h/m input は hide + value クリア + collect は null を返す
   - 初期値が `delay_minutes > 0` (= 既存記録) なら maniaToggle 関係なく row 表示 (古い値が hide で消えるのを防ぐ)

#### 07 (`js/07-record-mode.js`)

- 新 module-level `let _recTimeEditor` / `let _recMetaEditor`
- `openRecConfirm`: 旧 `timeSec` DOM 直書き 35 行 + `_populateRecEditYearMonth` 呼出 を削除し、`createTripDetailEditor({ timeRow:{precisions:[...5精度...]}, onChange: updateRecConfirmTimeRow })` mount に置換。GPS 記録時は section 全体 hide で factory mount skip。delay/notes は GPS / 手動どちらでも mount (`features.delay = { maniaToggle:true, prefKey: PREF_SHOW_DELAY_INPUT }`、`features.notes=true`)
- `closeRecConfirm` (戻って編集) は modal close のみ — destroy は次回 openRecConfirm 冒頭で行う
- `discardRecord` / `saveMultiSegmentTrip` 末尾で `_recTimeEditor` / `_recMetaEditor` を destroy
- `saveMultiSegmentTrip`: 時刻計算ブロック 60 行 を `_recTimeEditor.getDraft()` + `_recMetaEditor.getDraft()` 経由の 13 行に圧縮。unknown のとき `tripDate = today` の特殊処理は呼出側に残置
- `updateRecConfirmTimeRow`: 旧 DOM 直読み 50 行 を factory draft 経由の 40 行に書き換え。GPS 記録時は実 GPS 時刻 (startTs/endTs) 直接読み (不変)
- 旧 `onRecEditPrecisionChange` / `_populateRecEditYearMonth` / `initRecDelayToggle` / `onRecDelayToggle` は dead code (B-4 撤去予定)
- `initRecTrainToggle()` 末尾の `initRecDelayToggle()` 呼出を撤去

#### HTML (`noritetsu-map.html`)

- `#rec-time-edit-section`: 精度 select + 4 種の精度行 (date/time/month/year/unknown) を `<div id="rec-time-edit-container"></div>` 1 つに置換。旧 input 7 個は display:none で dead code
- `#rec-memo-section`: delay toggle + h/m + textarea を `<div id="rec-meta-container"></div>` 1 つに置換。📷 写真は別 instance (`_recPhotoArea`) で維持

### 検証 (preview server, fetch monkey-patch で POST body を捕捉)

7 シナリオ完全合致:

| Test | 入力 | 結果 |
|---|---|---|
| t1 minute デフォルト | startTs=09:30, endTs=10:45 | `date=2026-05-20, prec=minute, dep=09:30:00, arr=10:45:00, total=75` ✓ |
| t2 day | precision→day | `prec=day, dep/arr='', total=0` ✓ |
| t3 month | precision→month, 2024年6月 | `date=2024-06-01, prec=month` ✓ |
| t4 year | precision→year, 2020年 | `date=2020-01-01, prec=year` ✓ |
| t5 unknown | precision→unknown | `date=today (2026-05-28), prec=unknown` (factory が null を返し、呼出側が today を埋め) ✓ |
| t6 delay+notes | maniaToggle ON + 1h30m + "テストメモ" | `delay_minutes=90, notes='テストメモ'` ✓ |
| t7 GPS 経路 | recordStartedViaGPS=true | `#rec-time-edit-section display='none'` ✓ |

13b regression check: 既存 trip (delay=5, notes='13b 既存値') で `precisions=['minute','day']` mount → 精度 select 非表示 + delay toggle 非表示 (常時表示) + 値復元 OK。

`node --check --input-type=module` 全 module clean、`js-syntax-guard` サブエージェントで構文 + グローバル衝突 + 循環 import 全項目 clean。console error 0。

#### Service Worker キャッシュ事故

検証中、最初の round-trip テストで「factory mount が一切走らない」現象が発生。原因は **Service Worker キャッシュ**: sw.js v395 → v396 のままで preview server 起動 + reload しても、SW が古い 07-record-mode.js をキャッシュから返していた (`updateRecConfirmTimeRow` が旧 DOM 直読み版だった)。sw.js を v397 に bump + 全 SW unregister + caches.delete + cache-busting query 付きで navigate して新版を取得。

教訓: **preview server で大きい module を編集したら、検証前に sw.js を bump しておく** べき。reload(true) は modern browser で ignore、`?nocache=` は HTML には効くが SW controlled fetch は bypass しない。確実な手順は `regs.unregister() + caches.delete() + 新 URL navigate`。

### 残課題

- **B-4**: 13b 3 instance (`_tripEditDetailEditor + _tripEditMetaEditor + _tripEditTimeEditor`) と 07 3 instance (`_recDetailEditor + _recTimeEditor + _recMetaEditor`) を各 modal 1 instance に統合 + HTML 側の display:none input 全撤去 + 旧 helper 関数 (`onRecEditPrecisionChange` / `_populateRecEditYearMonth` / `initRecDelayToggle` / `onRecDelayToggle` / 13b の旧 9 関数) 撤去 + グローバル `NORIRECO.trains.selectedXxxBySl` / `activeChipSlId` 撤廃
- **A**: 一括記録パネル本体 (Notion §1.3) — 行展開で同 factory を `per-seg-rows + timeRow:{precisions:['minute','day','month','year','unknown']} (unknown default)` で mount

---

## 246. v396 — trip 詳細エディタ B-3b 完了 (13b の time row も createTripDetailEditor に集約) (2026-05-28)

### 背景

§244 (v394, B-3a) で 13b の ⏱ 遅延 + 📝 自由メモ、§243 (v393, B-2) で 🚆 列車種別 / 車両形式を factory に集約済。13b 旅程編集モーダルで残っていた「🕒 乗車時刻」セクション (date + depart + arrive の 3 input + 暗黙の 2 精度ロジック) を factory に移すのが B-3b。これで 13b 編集モーダルの主要 4 セクション (time / train / delay / notes) は全て factory mount 経由に揃う。

### 方針

factory `createTripDetailEditor` の `features.timeRow` を従来の `false` 固定から「`{ precisions: [...] }` を受け付ける object」に拡張。precisions の値で実装を分岐:

- `['minute', 'day']` → **本実装** (13b 旅程編集モーダル専用 2 精度ロジック)
- `month / year / unknown` のどれかを含む → **TODO 残置** (B-3c で 07 確認モーダルから 5 精度切替 UI を移植)

`_supportsFull5Precisions()` helper を closure 内に追加し、init / collect の冒頭で early-return。これにより同じ factory で「2 精度 (13b)」「5 精度 (07・B-3c で追加)」「一括記録 (将来 A、5 精度 unknown default)」を呼出側 features で出し分けられる設計を維持。

### 実装

#### 1. factory (`js/20-trip-detail-editor.js`)

- closure 冒頭に `const _initialPrecision = initial.date_precision || null` を保持 (collect で「元 'minute' のみ 'day' 降格」判定に使う)
- `draft.total_minutes` を追加 (initial 由来の値を保持、collect で必要に応じて再計算)
- `initTimeRow()` を本実装: header「🕒 乗車時刻」 + 3 input (`.tde-time-date / .tde-time-depart / .tde-time-arrive`) + 注記。`date_precision === 'unknown'` のときは date input を空に倒す (13b 旧実装と同形)
- `collectTimeRow()` を本実装: 4 分岐
  - dateRaw 空 → `draft.date=null` (呼出側で「key を patch に入れない」判定して元値温存)
  - dateRaw あり + dep/arr 両方入力 → `date_precision='minute' + total_minutes = (arr-dep+1440)%1440` で日跨ぎ補正
  - dateRaw あり + dep/arr 片方のみ → `date_precision='minute'` で空側を空文字、`total_minutes=null` (不定マーカー、呼出側で patch から除外)
  - dateRaw あり + dep/arr 共に空 → 初期精度が `minute` なら `day` 降格 (depart/arrive=空文字 + total=0)、それ以外は据置

#### 2. 13b (`js/13b-trips.js`)

- 新 module-level `let _tripEditTimeEditor = null` (3rd instance、draft 独立)
- `openTripEditModal`: 旧 `dateInp/depInp/arrInp + timeLockEl/timeInputsEl` 直書き 13 行を削除し、`createTripDetailEditor({ container: #trip-edit-time-container, initial: { date, depart_time, arrive_time, date_precision, total_minutes }, features: { timeRow: { precisions: ['minute','day'] }, … } })` を mount
- `closeTripEditModal`: 他 3 editor (`_tripEditPhotoArea / _tripEditDetailEditor / _tripEditMetaEditor`) と同パターンで `_tripEditTimeEditor.destroy()` を追加
- `saveTripEdit`: 旧 770-801 行の DOM 直読み + 2 精度ロジック 30 行を、`_tripEditTimeEditor.getDraft()` の参照 7 行に置換。`if (timeDraft.date)` ガードで「date 空入力 → patch から除外」を実現。`depart_time / arrive_time` は `!= null` で「key を patch に含めるか」を判定 (片方のみ入力で total_minutes=null のとき total キーは patch から除外、旧実装互換)

#### 3. HTML (`noritetsu-map.html`)

- `#trip-edit-time-section` の中身を `<div id="trip-edit-time-container"></div>` に置換 (factory mount 先)
- 旧 3 input (`#trip-edit-date / #trip-edit-depart / #trip-edit-arrive`) と `#trip-edit-time-lock / #trip-edit-time-inputs` は `display:none` で dead code 化 (B-4 撤去予定)。section wrapper の border-top + padding-top は維持 (UI 上の区切り)

### 検証

preview server (`python -m http.server 8000`) で 4 シナリオを fetch monkey-patch で round-trip:

| シナリオ | 入力 | tripPatch | 判定 |
|---|---|---|---|
| 1) 無変更 minute trip | date=2026-05-20, dep=09:30, arr=10:45 | `date+date_precision=minute+depart=09:30:00+arrive=10:45:00+total=75` | ✅ |
| 2) date クリア | date=空 | time 系 key 全て無し (元値温存) | ✅ |
| 3) dep/arr クリアで降格 | date 残し + dep/arr 空 | `date_precision=day+depart=arrive=空文字+total=0` | ✅ |
| 4) day → minute 昇格 | date+dep=08:00+arr=09:15 | `date_precision=minute+depart=08:00:00+arrive=09:15:00+total=75` | ✅ |

`node --check --input-type=module` 全 module clean、`js-syntax-guard` サブエージェント (sonnet) で構文 + グローバル衝突 + 循環 import 全項目 clean。console error 0 (warn は fetch monkey-patch の Response 204+body コンストラクタ例外のみ、本番無関係)。

### 残課題

- **B-3c**: 07 確認モーダルへの移植 (mania toggle 連動 + 5 精度 (minute/day/month/year/unknown) 切替 UI + GPS preset プリフィル)。factory の `_supportsFull5Precisions()` 分岐に本実装を入れる。
- **B-4**: 13b 編集モーダルの 3 instance (`_tripEditDetailEditor + _tripEditMetaEditor + _tripEditTimeEditor`) を 1 instance に統合 + 旧 dead code (HTML の display:none input + 旧 onTripEdit* 関数 + 旧 helper) を撤去。1 modal 3 instance は中間状態。
- **A**: 一括記録パネル本体 (Notion §1.3) — 行展開で同 factory を per-seg-rows + timeRow 5 精度 unknown default で mount

---

## 245. v395 — hotfix: 旅程の delay_minutes / notes が編集後リロードで消える既存バグ修正 (2026-05-27)

### 背景

§244 (v394, B-3a) で 13b の ⏱ 遅延 + 📝 自由メモ を factory に集約。ユスケ実機 (norireco.app) で編集確認後、「保存まではいくけど、リロードすると消えちゃう」と報告。

### 真因 (v181 から潜在していた追従漏れ)

`norireco_trips` の Supabase スキーマには **`delay_minutes` と `notes` カラムが実は最初から存在** (REST `select=id,delay_minutes,notes&limit=1` で `status: 200`, `[{id, delay_minutes: null, notes: null}]` を確認)。

しかし JS 側は v181 で「schema 未拡張」と判断して両フィールドを除外する設計を入れていた:

1. **07 `tripForSupabase(trip)`**: 新規記録の POST body から `notes / delay_minutes` を destructure で剥がす
2. **13b `saveTripEdit`**: 編集の PATCH body (`tripPatch`) に両フィールドを含めない

結果として両フィールドは **localStorage のみに保存**され、`syncFromSupabase()` (06-map-leaflet 起動時 + 12-auth SIGNED_IN/INITIAL_SESSION) が `localStorage.setItem('norireco_trips', JSON.stringify(trips))` で localStorage を Supabase 値 (null) で上書きすると消失する。

なぜスキーマ追加に追従できなかったかは不明 (dashboard で列追加した記録が migration ファイルにない — CLAUDE.md「Applied 規約」導入は v333 のため v181 当時はまだ migration を git 管轄に置く運用がなかった)。13-mypage-common.js `loadTripsIfNeeded` は merge-back を持っていたが、これは mypage view 表示専用で `syncFromSupabase` の破壊操作の前段ではなかったため救済できていなかった。

### 修正

3 箇所:

1. **`js/07-record-mode.js` `tripForSupabase`** — `return trip` の pass-through に変更 (destructure-strip 撤回)。新規記録 POST に `notes / delay_minutes` が乗るようになる。trip オブジェクトのその他フィールドは v181 以前から送られていたため、追加で送るのはこの 2 カラムのみ。Supabase REST は未知の列を無視するため schema 増減でも 400 にならない (PATCH 検証: `id=eq.trip_xxx_test_nonexistent` への PATCH で `status: 204` を確認、列認識 OK)。

2. **`js/13b-trips.js` `saveTripEdit`** — Supabase PATCH の直前で `tripPatch.delay_minutes = newDelay; tripPatch.notes = newNotes;` を追加。`newDelay/newNotes` は factory の `_tripEditMetaEditor.getDraft()` 経由で正規化済 (B-3a)。

3. **`js/05-supabase-data.js` `syncFromSupabase`** — `const trips` を `let trips` に変えて、`localStorage.setItem` の直前に localStorage から `notes / delay_minutes` を merge back する処理を追加。これは v395 以前に発生した「localStorage にしかない既存データ」の救済策。次回その trip を編集 + 保存すると Supabase 側にも届く (v395 修正後の経路で)。同形 merge は 13-mypage-common.js にも残置 (UI 表示用、二重防護)。

### 検証

- 3 ファイル `node --check --input-type=module` 共に OK
- `.claude/agents/js-syntax-guard.md` 実行: ESM 構文・グローバル衝突なし、`let trips` への変更も同関数内再代入と整合
- preview 経由で Supabase REST 直叩き PATCH (`delay_minutes: 75, notes: 'schema test'`) → `status: 204` (列 accept 確認)

### 教訓

- Supabase 列の存在は **REST で実際に叩いて確かめる** のが最も信頼できる (schema 追加が migration ファイルに記録されていない場合も)。CLAUDE.md「Applied 規約」は v333 以降の write 履歴を救うが、それ以前の dashboard 追加分は遡れない
- `tripForSupabase` のような「送信時除外フィルタ」は将来の schema 変化に追従するのが難しい。**列が存在しないことの判定は POST 時の 400 で受けてから outage を直す方が安全** — preemptive strip は schema 進化と乖離する
- `syncFromSupabase` のような **destructive overwrite operation** には常に merge-back の余地を残すべき (もしくは少なくとも警告を出すべき)。今回は 13-mypage-common.js が部分的に補っていたが、UI 層に限定されていたため恒久的な救済にならなかった

### dead code (B-4 撤去対象、§243-§244 と合算)

新規追加なし (本コミットは hotfix のため)。

### 次

v394 の §244 next 計画通り: B-3b (13b time row) → B-3c (07 への移植) → B-3d (07 time row) → B-4 → A。

CHANGELOG.md §244 (B-3a) からの続き。

---

## 244. v394 — trip 詳細エディタ B-3a 完了: 13b の ⏱ 遅延 + 📝 自由メモ を factory に集約 (2026-05-27)

### 背景

§243 (v393, B-2) で 13b 旅程編集モーダルの 🚆 列車種別 / 車両形式 を `createTripDetailEditor` (per-seg-rows / trip-level mode) に移行済。次は同 modal の ⏱ 遅延 + 📝 自由メモ + 🕒 乗車日時を factory に集約する **B-3**。スコープが大きいので段階分割:

- **B-3a (本コミット v394)**: 遅延 + メモ (シンプル、toggle なし) → 13b
- B-3b (次): 時刻行 (5 精度切替 + GPS preset) → 13b は `['minute', 'day']` 限定
- B-3c (次々): 07 確認モーダルへ移植 (mania toggle `#rec-delay-toggle` の visibility 制御は呼出側に残す)

### 設計判断

- **2nd factory instance** `_tripEditMetaEditor` を 13b モーダルに追加 mount。既存の `_tripEditDetailEditor` (列車種別 / 車両形式 担当) と並列で動く。drafts は分離されているため `saveTripEdit` で各 editor の `getDraft()` を merge する。1 modal 2 editor instance は中間状態 — 将来 B-4 で time / train / delay / notes を 1 instance に統合予定。
- **section header を factory 側に持たせる** — `initDelay` は `<div class="tde-delay-header">⏱ 遅延</div>` + h/m input、`initNotes` は `<div class="tde-notes-header">📝 自由メモ</div>` + textarea を render。modal HTML 側は単一 `<div id="trip-edit-meta-container">` だけ持てばよい。
- **factory の delay 集約規約**: `h*60 + m`、`0 → null`、上限 `5999` (99h59m) クランプ — 13b v185 + 07 v185 の `saveTripEdit` ロジックと同形。
- **factory の notes 集約規約**: `.trim() || null` (空白のみは null)。
- **mania toggle (07 の `#rec-delay-toggle`) の挙動**: factory の `.tde-delay` 表示制御は呼出側の責務。07 (B-3c) では `#rec-delay-row` ラッパの display を toggle で切替、factory の delay section をその中に配置する想定。13b には toggle なし (常時表示)。

### 実装範囲

`js/20-trip-detail-editor.js` (+42 行):

- `initDelay()` — h/m number input ペア (class `tde-delay-h` / `tde-delay-m`) + section header (`tde-delay-header`)。 initial.delay_minutes を h/m に分解してプリセット (13b v185 と同形)、`onChange` callback も bind。
- `collectDelay()` — DOM 直読み、`h*60+m` を `draft.delay_minutes` に集約 (0→null, 5999 クランプ)。
- `initNotes()` — textarea (class `tde-notes-textarea`) + section header (`tde-notes-header`)。initial.notes プリセット + `onChange` bind。
- `collectNotes()` — textarea を trim、空 → null で `draft.notes` に反映。

`js/13b-trips.js` (+30 / −24 行 net):

- module-level `let _tripEditMetaEditor = null` 追加。
- `openTripEditModal`: `delayHInp / delayMInp / notesInp` 直接代入ブロック (8 行) を撤去。代わりに `_tripEditMetaEditor` を `#trip-edit-meta-container` に mount (initial に `delay_minutes` / `notes` を渡す)。
- `closeTripEditModal`: `_tripEditMetaEditor.destroy()` 追加。
- `saveTripEdit`: 旧 DOM query (`#trip-edit-delay-h/m` + `#trip-edit-notes` から値取得 + 正規化 12 行) を `_tripEditMetaEditor.getDraft()` 経由 (3 行) に置換。集約は factory の `collectDelay/collectNotes` が完結。

`noritetsu-map.html` (−18 行 net):

- ⏱ 遅延 section + 📝 自由メモ section の HTML inline (h/m input + textarea) を単一 `<div id="trip-edit-meta-container"></div>` に統合。
- 旧 4 要素 (`#trip-edit-delay-h` / `#trip-edit-delay-m` / `#trip-edit-notes`) は `style="display:none"` 固定 (B-4 撤去まで dead code)。
- 旧 2 つの section wrapper (`margin-bottom + border-top` 装飾) の 1 つも削除 (factory の section header + 1 wrapper で表示が成立)。

### 検証

`node --check --input-type=module < js/20-trip-detail-editor.js` / `js/13b-trips.js` 共に OK。`.claude/agents/js-syntax-guard.md` 実行: ESM 構文エラー・グローバル衝突・class 命名衝突 (`tde-delay-* / tde-notes-*` 系) なし、clean。

preview server で factory を fresh import → `#trip-edit-meta-container` に mount → 5 ケース getDraft() round-trip:

| 入力 | 期待 delay_minutes | 期待 notes | 結果 |
|---|---|---|---|
| initial: 75 / "事故影響あり" | 75 (1h15m 表示) | "事故影響あり" | ✅ |
| h/m emptied | null | (unchanged) | ✅ |
| notes whitespace-only | null | null | ✅ |
| 2h30m / "雷雨" | 150 | "雷雨" | ✅ |
| 99h59m | 5999 (max clamp) | (unchanged) | ✅ |

(window.openTripEditModal 経由のフルフロー確認は preview 環境の HTTP cache が `js/05-supabase-data.js` の applyDateFilter 未追加版を握る v393 と同じ理由で阻まれた。本番 Cloudflare では再現しない)

### dead code (B-4 撤去対象、§243 と合算)

`noritetsu-map.html`: `#trip-edit-delay-h` / `#trip-edit-delay-m` / `#trip-edit-notes` (今回追加)。

### 次

- **B-3b**: 13b の 🕒 乗車日時 を factory の `timeRow` section (precisions=['minute','day']) に集約。13b は精度 5 種すべては要らない (date_precision のうち minute/day のみ編集可、month/year/unknown は新規作成で固定)。
- **B-3c**: 07 確認モーダルへ delay + notes 移植。`#rec-delay-toggle` mania toggle の visibility 制御は呼出側 (07) に残し、factory の `.tde-delay` を `#rec-delay-row` 内に配置する設計。
- **B-3 締め (B-3d?)**: 07 の `#rec-time-edit-section` (5 精度 + GPS preset + `updateRecConfirmTimeRow` の dynamic 更新) も factory に移植。
- **B-4**: グローバル Map + 13b 旧 9 関数 + HTML dead input 撤去 + 1 modal 1 editor instance に統合。

CHANGELOG.md §243 (B-2) からの続き。

---

## 243. v393 — trip 詳細エディタ B-2 完了: 13b 旅程編集モーダルを per-seg-rows / trip-level mode で factory に移行 (2026-05-27)

### 背景

v392 (§242) で B-1 (07 確認モーダル → per-seg-chip mode) を deploy し実機 (norireco.app) で動作確認済。次段階の **B-2** は同 factory `createTripDetailEditor` で **13b 旅程編集モーダル** (`#trip-edit-modal`) をカバーする。13b は 2 ケースを扱う:

- **segments あり** (通常の手動/GPS 記録): 各区間に種別 + 列車 + 車両形式の cascade。v383 で per-seg フル cascade 化済。
- **segments なし旧 trip / visit-only**: 旅程 1 つに対して trip 単位 1 set の 4 input (`trip-edit-train-category` / `train-id` / `train-name` / `car-model`)。v356 で master 選択 + `__custom__` 切替対応済。

これら 2 ケースを factory の `per-seg-rows` mode と `trip-level` mode に統合する。

### 設計判断

- **per-seg-rows** mode: 全 seg を同時に row 描画。chip 切替 (per-seg-chip mode 特有) なしのため、`_segState` mirror は使わず **DOM 自体が state**。`collectTrainPicker` で DOM を直読みして `draft.segments[i].train_*` に反映。
- **trip-level** mode: `train_id` select が master 値なら採用 + `train_name` input に master の name を **shadow value** で書き込み (v356 の挙動踏襲、`saveTripEdit` が input から読む前提)。`__custom__` で手入力に切替、`local` カテゴリでは car_model input のみ表示。
- **集約ルール (per-seg-rows のみ)**: `trip.train_*` は **全 seg 一致なら値 / 不一致なら null** (v371 / v375 / v383 と同形)。factory は draft.segments のみ更新し、集約は呼出側 `saveTripEdit` で行う (v392 B-1 で 07 が同じく集約を保持しているのと同形)。
- **共有ヘルパ**: `_populateCategorySelect / _populateTrainCascadeOptions / _populateRowCarSelect / _applyRowVisibility / _restoreRowCascade / _bindRowHandlers / _escHtml` を factory 内に追加。chip mode (B-1 で自前実装済) は触らずに rows / trip-level に再利用。chip mode の populate ロジック重複は許容 (refactor リスクを取らない方針)。
- **mount 戦略**: per-seg-rows は `#trip-edit-segments` を factory に明け渡し (seg header 込みで render)、🚆 列車種別 section 全体は hide。trip-level は `#trip-edit-segments` に "from → to" read-only を残しつつ、新設の `#trip-edit-train-picker-container` (🚆 列車種別 section 内) に factory mount。
- **旧 4 input / 旧 9 関数の扱い**: HTML 側で `display:none` 固定 + JS 側で呼ばれなくなった (dead code)。B-4 で撤去予定。B-1 で 07/02 dead code を温存したのと同形。

### 実装範囲

`js/20-trip-detail-editor.js` (+418 行):

- `initTrainPickerRows()` — per-seg-rows mode 本実装。`segs.map(...)` で row HTML 生成 (`tde-rows-seg[data-seg-idx]` / `tde-rows-cat` / `tde-rows-train-id` / `tde-rows-train-name` / `tde-rows-car-select` / `tde-rows-car` クラスセレクタ)。
- `initTrainPickerTripLevel()` — trip-level mode 本実装。4 input (`tde-trip-category` / `tde-trip-train-id` / `tde-trip-train-name` / `tde-trip-car-model`) + 説明 div。
- `collectTrainPicker()` の per-seg-rows / trip-level 分岐実装 (DOM 直読み)。
- 共有ヘルパ + `_escHtml` (lineName / from / to の HTML escape)。

`js/13b-trips.js` (+25 / −145 行 net):

- `openTripEditModal`: `segs.length >= 1` 分岐で per-seg-rows mode (#trip-edit-segments に factory mount + #trip-edit-train-section hide)、segments なしで trip-level mode (#trip-edit-train-picker-container に factory mount)。trip-level 用の trip-level 4 input 復元ブロック (旧 30 行) を削除。
- `closeTripEditModal`: `_tripEditDetailEditor.destroy()` 追加。
- `saveTripEdit`: per-seg / trip-level の DOM 読み出しブロック (旧 70 行) を `editor.getDraft()` 経由に置換。集約ルールは保持。

`noritetsu-map.html` (−15 行 net):

- 🚆 列車種別 section に `id="trip-edit-train-section"` + 新 `<div id="trip-edit-train-picker-container"></div>`。
- 旧 4 input は `style="display:none"` 固定 (B-4 撤去まで dead code)。
- 旧 helper text 撤去 (factory 側で複製済)。

### 検証

`node --check --input-type=module < js/20-trip-detail-editor.js` / `js/13b-trips.js` 共に OK。`.claude/agents/js-syntax-guard.md` 実行: ESM 構文エラー・グローバル衝突・class 命名衝突なし、clean。

preview server (http://localhost:8000) で `import('/js/20-trip-detail-editor.js?fresh=...')` 経由で factory を直接 mount し getDraft() round-trip を確認:

- **trip-level**: 初期 `cat=limited_express, tid=azusa, tname=あずさ, car=E353系` を draft に正しく復元。`cat→local` change event + `car=キハ110系` input で `cat=local, tid=null, tname=null, car=キハ110系` に正しく更新。
- **per-seg-rows**: 3 seg 初期 (limited_express+azusa+E353系 / local+E235系 / 空) を全 row 復元。seg 3 を `cat=limited_express` + `tid=mt_takao` に change event で flip し、seg 3 のみ `cat=limited_express, tid=mt_takao, tname='Mt.TAKAO号'` (master 自動補完) に更新、seg 1/2 は元値維持で row 間の独立性を確認。

(preview server の HTTP cache が `js/05-supabase-data.js` の古い版 (2026-05-20、`applyDateFilter` 未追加) を握っていたため、`window.openTripEditModal` 経由のフルフロー確認は 13b の binding error で阻まれた。`fetch(..., { cache: 'no-store' })` で disk と HTTP server が一致することは確認済、Cloudflare Pages 本番では Cache-Control が正しいため再現しない。本番デプロイ後にユスケ実機で動作確認予定)

### dead code (B-4 撤去対象)

- `js/13b-trips.js`: `applyTripEditCategoryVisibility` / `populateTripEditTrainDropdown` / `onTripEditCategoryChange` / `onTripEditTrainChange` / `applyTripEditSegCategoryVisibility` / `populateTripEditSegCarSelect` / `restoreTripEditSegCascade` / `onTripEditSegCategoryChange` / `onTripEditSegTrainChange` / `onTripEditSegCarChange` の 10 関数 (window 公開含む)。HTML 側の inline `onchange="onTripEditCategoryChange()"` / `onchange="onTripEditTrainChange()"` も dead (target の input が display:none)。`onTripEditSeg*` 3 関数は呼ばれるエントリポイントすら存在しない (旧 `te-seg-*` クラスの inline onchange は v393 で factory に置換)。
- `noritetsu-map.html`: 4 input (`#trip-edit-train-category` / `#trip-edit-train-id` / `#trip-edit-train-name` / `#trip-edit-car-model`) と `onchange="onTripEdit*"` inline 属性。

### 次

- **B-3**: 時刻行 (`#rec-time-edit-section` + `onRecEditPrecisionChange` + `updateRecConfirmTimeRow`) / 遅延 / メモ を factory に移植。features 定義済の `timeRow` / `delay` / `notes` を本実装化。
- **B-4**: `NORIRECO.trains.selectedXxxBySl` / `activeChipSlId` グローバル Map 撤廃 + 13b の dead 10 関数 + HTML の dead input 撤去。07/02 の dead helper (B-1 で残置) も同時に撤去。
- **A**: 一括記録パネル本体 (Notion §1.3) — `noritetsu-log.html` 廃止の受け皿。1 行 = 1 trip、行展開で factory を inline mount。

CHANGELOG.md §242 (B-1) からの続き。

---

## 242. v392 — trip 詳細エディタ B-1 完了: `createTripDetailEditor` per-seg-chip 本実装 + 07 確認モーダル切替 + B 段階の API 設計合意 (2026-05-27)

### 背景

Notion §1.3 末尾「一括記録（まとめて記録） — noritetsu-log.html 廃止の受け皿」の設計判断より。

一括記録 (A) を作るには、確認モーダル `#rec-confirm-modal` の中身 (時刻行 v180 / per-seg cascade v371-v383 / 遅延 v185 / メモ / 写真 v258) を「行展開で inline mount できる」コンポーネントに切り出すことが前提。v371-v383 の per-seg cascade 実装で、列車種別＋車両形式の populate ロジックが既に **02-data-loaders / 07-record-mode / 13b-trips の 3 箇所に複製** されており (v383 §233 落とし穴で明示)、一括記録で 4 箇所目を作ると確実に壊れる。

そこで A の前段階として **B-1〜B-4 のリファクタ段階** を踏む。本コミット (v392) は B-1 の skeleton 配置とインターフェース合意。

### B 段階の API 設計合意 (2026-05-27)

ユスケと合意した内容:

- **単一 factory 関数** `createTripDetailEditor({ container, initial, features, onChange })`。PhotoArea (v258) と同型のパターン。
- features フラグでセクション可視・モードを切替:

```js
{
  timeRow:     { precisions: ['minute','day','month','year','unknown'] } | { precisions: [...] } | false,
  trainPicker: 'per-seg-chip' | 'per-seg-rows' | 'trip-level' | false,
  delay:       boolean,
  notes:       boolean,
  photos:      { kind, getOwnerId, initialPhotos, maxCount } | false,
}
```

- 公開メソッド: `getDraft()` (DOM 値を draft に反映してから clone を返す) / `uploadAndGetPhotos(tripId)` (PhotoArea ラッパ) / `destroy()`。
- **state は internal クロージャ** で `_segState: Map<lineId, {train_category, train_id, train_name, car_model}>` を保持。グローバル `NORIRECO.trains.selectedXxxBySl` / `activeChipSlId` は **撤廃** (B-4 完了時)。クロージャ完結なので、一括記録で複数 editor を同時 mount しても state 衝突しない。
- 呼出元 → features マッピング:
  - 07 確認モーダル: `trainPicker='per-seg-chip'`, `timeRow` 全 5 精度
  - 13b 編集モーダル (segments あり): `trainPicker='per-seg-rows'`, `timeRow=['minute','day']`
  - 13b 編集モーダル (segments なし旧 trip): `trainPicker='trip-level'`, `timeRow=['minute','day']`
  - 将来 A 一括記録の行展開: `trainPicker='per-seg-rows'`, `timeRow` 全 5 (`unknown` デフォ)

### 段階分割

| 段階 | スコープ | 価値 |
|---|---|---|
| **B-1** (本コミット) | `js/20-trip-detail-editor.js` skeleton 配置 (factory + features 分岐 + section 枠 + PhotoArea wrap)。per-seg-chip の本格ロジックは TODO で次セッション。 | 構造合意 + 次セッションの助走 |
| **B-2** | 13b 編集モーダルを per-seg-rows / trip-level mode で本コンポーネントに移行 | 02/13b の重複ロジック削除 |
| **B-3** | 時刻 / 遅延 / メモ も完全に本コンポーネントへ集約、両モーダル HTML を圧縮 | 共通エディタ完成 |
| **B-4** | グローバル `NORIRECO.trains.selectedXxxBySl` / `activeChipSlId` 撤廃 | global 汚染解消 |

A (一括記録パネル本体) は B-3 まで終わってから着手する。B-4 は並走可。

### B-1 (本コミット) で配置したもの

`js/20-trip-detail-editor.js` (291 行) を新規追加:

- factory 関数 `createTripDetailEditor(opts)` の外形
- features 正規化 (5 セクション)
- internal state (draft + `_segState` Map + `_activeChipSlId`)
- セクション枠 5 つ (`.tde-time` / `.tde-train` / `.tde-delay` / `.tde-notes` / `.tde-photos`) を `container.innerHTML` に一気に注入
- 各 `initXxx` / `collectXxx` 関数の関数枠 (中身は B-X タグ付き TODO コメント)
- **photos のみ実体化済** — PhotoArea (v258) を wrap し、新規ファイル単体で写真機能が完結
- 公開メソッド `getDraft()` / `uploadAndGetPhotos()` / `destroy()` 配線

既存 `js/07-record-mode.js` / `js/13b-trips.js` / `js/02-data-loaders.js` はまだ本コンポーネントを import していない。**動作には何の影響もない** (deploy 不要)。

### 設計上のメモ

- **DOM id 衝突回避**: section 内の要素は **class 名 (`.tde-*`) で参照する方針**。コンポーネントが複数 mount されても (= 一括記録の行展開) id 衝突しない。13b は v383 時点で `data-seg-idx` で行を識別しているが、本コンポーネントの方が一段 scoped (container 内 query)。
- **per-seg-chip / per-seg-rows の data layer は共通化**: `_segState` Map を両 mode で持つ。chip mode は active な 1 件だけ DOM に出すために Map から読み戻し、rows mode は全 row の DOM が source of truth だが Map と双方向同期する。`getDraft()` の `collectTrainPicker` は mode に応じてどちらを優先するか分岐。
- **photos のみ B-1 で実体化した理由**: PhotoArea は既に v258 で抽出済の独立コンポーネント。wrap するだけで動くため、わざわざ TODO にせず実装した。次セッションで `initTrainPickerChip` の実装に進む際に「動く section が 1 つある」状態でデバッグできる利点もある。

### B-1 続き (同セッション継続): per-seg-chip mode 本実装 + 07 確認モーダル切替

- **20-trip-detail-editor.js** の `initTrainPickerChip` / `collectTrainPicker` を本実装 (+約 355 行で計 646 行に):
  - HTML テンプレ (chip + cat + sl-block + cascade) を class セレクタ (`.tde-train-*`) で scoped 化。`#rec-*` id を使わないので一括記録の複数 mount でも衝突しない
  - `applyCategoryVisibility(cat)` で sl-block / cascade を排他切替 (07 `applyRecTrainCategory` 相当)
  - `renderChips()` で `draft.segments` から chip 生成、`selectChip(slId)` で active 切替 + `_segState` から DOM 復元 (07 `selectSlChip` 相当)
  - 各 dropdown (cat/train/train-custom/car/car-custom/sl/sl-custom) の change/input handler が `_segState[_activeChipSlId].*` に同期書き込み (= グローバル `NORIRECO.trains.selectedXxxBySl` への書き込みは無し → B-4 に向けた前進)
  - 列車マスター / TRAIN_CATEGORIES / serviceLineVehicles は呼び出し時に `window.NORIRECO` から都度参照 (initial snapshot しない)
  - sl-block dropdown の populate 順 (導入予定 → 導入 → 現役主力 → 譲受 → 組織再編 → 譲渡 → 引退) は 07 v374 selectSlChip の挙動を踏襲
- **07-record-mode.js** を component 経由に書き換え:
  - `createTripDetailEditor` を import、module-local `_recDetailEditor` 追加
  - `_mountRecDetailEditor` helper を新設 — R.segments を `draft.segments` の形に変換して initial で渡す (新規記録なので列車情報は全て null)
  - `initRecTrainToggle` / `onRecTrainToggle` を editor の mount/destroy 切替に。マニアトグル OFF → editor destroy (= 旧 `clearAllTrainSelections` 相当の効果) / ON → editor 再 mount
  - `saveMultiSegmentTrip` の DOM 同期 safety net (1167-1192、29 行) を削除し、`editorSegMap = editor.getDraft().segments` を作成して各 seg の per-seg cascade 値 (category/train_id/train_name/car_model) を取得
  - `discardRecord` / `saveMultiSegmentTrip` 末尾で editor destroy を追加
  - 旧 helper (`applyRecTrainCategory` / `clearAllTrainSelections` / `populateSlVehiclePicker` / `selectSlChip` / `onSlVehicleChange` / `onSlVehicleCustomInput`) は **dead code として温存**。B-2 で 13b 移行が終わり、B-4 で `NORIRECO.trains.selectedXxxBySl` も撤廃した時点で 02 のハンドラと一緒に撤去予定
- **noritetsu-map.html**: `#rec-train-picker` 内の chip/cat/sl-block/cascade を全撤去し `<div id="rec-train-picker-container"></div>` 1 つに圧縮 (実質約 50 行 → 1 行)。マニアトグル (`#rec-train-toggle`) と picker の display 制御は外側に残置

### 動作確認 (preview server 実機 simulate)

`norireco-static` preview server (port 8000) で `R.selection` / `R.segments` をモック inject、`openRecConfirm()` を直接呼出して editor の挙動を確認:

| 確認 | 結果 |
|---|---|
| editor mount (マニアトグル ON) | container.children = 1 (.tde-root) ✓ |
| cat select populate | 11 option (指定しない + 10 カテゴリ、`local` 先頭の v353 順) ✓ |
| cat='local' → sl-block 表示 | 山手線 (jr_yamanote_line) の車両 (E235系0番台) populate ✓ |
| cat='limited_express' → cascade 表示 | 特急列車 139 件 populate ✓ |
| train='azusa' → car_model populate | E353系 / E257系 / 189系 / 183系 + `__custom__` ✓ |
| マニアトグル OFF → editor destroy | container.children = 0、picker hidden ✓ |
| マニアトグル ON → 再 mount | container.children = 1、cat/chip 復活 ✓ |
| closeRecConfirm (戻って編集) | modal 閉じる、editor は維持 ✓ |
| console エラー | **0 件** ✓ |

直接確認していないが構文・実装で担保した範囲:
- 2 区間以上の chip 切替・active state 復元
- `__custom__` 手入力モード
- `discardRecord` の editor destroy
- 実保存パス (`saveMultiSegmentTrip` → `editor.getDraft()` → trip Supabase POST) の end-to-end

### 教訓: Service Worker キャッシュで preview HTML が古いまま読まれる

preview server を Cloudflare Pages 経由でなくローカル http server (`norireco-static`, port 8000) で立てているが、Service Worker (sw.js v390) が install 済で旧 HTML をキャッシュ返却していた。新 HTML を反映する手順:

```js
const regs = await navigator.serviceWorker.getRegistrations();
await Promise.all(regs.map(r => r.unregister()));
const keys = await caches.keys();
await Promise.all(keys.map(k => caches.delete(k)));
location.reload();
```

`preview_eval` で実行可能。今後の preview 確認シナリオでは「新 HTML 反映が読まれているか」をまず `fetch('/foo.html?_v=' + Date.now(), { cache: 'no-store' })` で確認し、ブラウザ DOM とずれている場合は上記 unregister 手順を踏む。

### CACHE_VERSION (deploy 必要)

当初「(no deploy)」として CHANGELOG に書いたが、B-1 続きで HTML + JS 変更が入った時点で **deploy 必要** に変更。`sw.js` の `CACHE_VERSION` を v390 → v392 に更新 (v391 no deploy を経たので 1 ステップ飛んでジャンプ = 過去の v364 no deploy → v365 deploy と同パターン)。

`STATIC_ASSETS` にも新規 `./js/20-trip-detail-editor.js` を追加 (`./js/19-drag-sort.js` の直後)。これで offline 時も editor module が読み込める。

### 構文チェック

`js-syntax-guard` サブエージェント (model: sonnet) で検査:

```
node --check --input-type=module < js/20-trip-detail-editor.js
exit code 0 (stderr なし)
```

ESM 構文 OK、トップレベル const は `DEFAULT_PRECISIONS` のみで衝突なし、`createPhotoArea` import 解決 OK。

### サブエージェント運用メモ (今セッションの副産物)

v391 で配置したばかりの `js-syntax-guard` の動作実験を兼ねて:

- **haiku → sonnet に変更** (frontmatter `model: sonnet`)。haiku では「`node --check` を実行した形跡なし → 目視判定の疑い」(tool_uses: 39 で冗長)、sonnet は指示通り Bash で実行し exit code + stderr を貼り付け (tool_uses: 5 で簡潔)。乗レコの read-only ゲート用途では sonnet が明確に良い。
- **`.claude/agents/*.md` の編集は Claude Code auto mode で「Self-Modification」判定** で拒否される。`agents/js-syntax-guard.md` の `model: haiku → sonnet` 編集はユスケが GitHub Web で行い、ローカルは `git pull` で取り込んだ。今後 agent 定義を Claude に編集させたい場合は settings.json に permission rule を追加するか、ユスケ手動編集が正規ルート。
- **陽性テスト合格**: わざと壊した一時ファイル (関数内 const 重複 + 単純な構文破損) を投げたら、`node --check --input-type=module` で exit code 1 + stderr を正しく検出。haiku では未確認、sonnet では明確に検出。

---

