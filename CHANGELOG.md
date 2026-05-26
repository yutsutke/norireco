# 乗レコ - 電車旅 更新履歴詳細

各セッションごとの実装ログ・経緯・失敗教訓を時系列で残す詳細メモ。

> ドキュメント役割分担は Notion §0「ドキュメント役割分担」が真実の源（v276 で Notion に集約）。本ファイルは変更履歴詳細を扱う。
> 過去フェーズは [`CHANGELOG_PHASE1-3.7.md`](CHANGELOG_PHASE1-3.7.md) / [`CHANGELOG_PHASE3.8-early.md`](CHANGELOG_PHASE3.8-early.md) / [`CHANGELOG_PHASE3.8-modules.md`](CHANGELOG_PHASE3.8-modules.md) / [`CHANGELOG_PHASE3.8-share.md`](CHANGELOG_PHASE3.8-share.md) / [`CHANGELOG_PHASE3.8-photo.md`](CHANGELOG_PHASE3.8-photo.md) / [`CHANGELOG_PHASE3.8-mypage.md`](CHANGELOG_PHASE3.8-mypage.md) / [`CHANGELOG_PHASE3.8-station-id.md`](CHANGELOG_PHASE3.8-station-id.md) にアーカイブ。

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

次回分割の目安: 本ファイルが 1500 行超になったら、その時点で完成しているサブフェーズを別ファイルに退避（命名例: `CHANGELOG_PHASE3.8-vehicles.md` など、内容に即したテーマ名）。

切り出し時は本ファイル冒頭の役割表・分割ポリシー、`TODO.md`・Notion §0 の参照リンクも合わせて更新する。

過去ログの参照早見表:
- 認証グラデーション・GPS 記録フロー初期実装・列車種別・コードベース 13 ファイル分割・Supabase 認証/マイページ初期版 → [`CHANGELOG_PHASE1-3.7.md`](CHANGELOG_PHASE1-3.7.md)
- データ補修・期間フィルタ「〜月指定」・記録モード用語統一・後追い記録・stop_type 駅 UI 個人化・地図フィルタ統合 → [`CHANGELOG_PHASE3.8-early.md`](CHANGELOG_PHASE3.8-early.md)
- 13-mypage 4 分割・SERVICE_LINES builder 分離・ride-record 分離・ES Modules stage 1〜3 (`<script type="module">` + `import`/`export` 化) → [`CHANGELOG_PHASE3.8-modules.md`](CHANGELOG_PHASE3.8-modules.md)
- 旅程編集拡張・ログアウトセキュリティ・OGP シェア MVP・完乗率統合・系統色カスタマイズ + Supabase 同期・Cloudflare Pages 移行 + norireco.app → [`CHANGELOG_PHASE3.8-share.md`](CHANGELOG_PHASE3.8-share.md)
- 駅メモ本格化 (Supabase CRUD + マイページ「📸 メモ」タブ)・駅アクションシート・R2/Workers ゲートウェイ・写真添付フル機能 (memo/trip 最大 5 枚 + D&D 並び替え)・Notion ドキュメント整理 (STATUS.md 分離 + 役割分担再集約) → [`CHANGELOG_PHASE3.8-photo.md`](CHANGELOG_PHASE3.8-photo.md)
- マイページ即時反映 (renderMypage)・地図駅クリックで「この駅を含む旅程」一覧・路線アクションシート・旧 📸 memoMode 完全撤去・マイページ駅名検索 (4 chip 始点/終点/乗換/通過 + IME 安定化) → [`CHANGELOG_PHASE3.8-mypage.md`](CHANGELOG_PHASE3.8-mypage.md)
- 駅 ID 体系 Phase 1〜3 (集計・描画・キャラ・GPS 後追い認証・メモ/旅程列・LINES に駅 id 付与・カバレッジ 100%・SERVICE_LINES の駅追加・Supabase migration Applied 規約導入)・駅クリック確実化・駅名+都道府県検索・FAB 並び・hook→CLAUDE.md 移管 → [`CHANGELOG_PHASE3.8-station-id.md`](CHANGELOG_PHASE3.8-station-id.md)

---

## 214. v364 (no deploy) — CHANGELOG 行数チェックを Stop hook → セッション末手続きに移管 (2026-05-27)

### 背景

v349 で `.claude/hooks/stop-reminder.js` に CHANGELOG.md 行数の機械チェック (1500 行超で警告) を追加していたが、ユスケから「changelogの行数の確認及び分割はセッション末の手続きに変更してください」との指示。毎ターンの警告は過剰、「終わったので手続きお願いします」の合図のときに人手で確認する流れに揃える。

### 設計判断

- **Stop hook の機械チェックを撤去**: 「自動補助は強制したいときに使う」(Notion §0「判断軸」) を再評価し、CHANGELOG 行数チェックは「強制したいほど厳密でない」(分割タイミングはユスケの体感判断もある)。セッション末で `wc -l` 一発で済む
- **CLAUDE.md のセッション末「合図で」セクションに手順を移動**: v349 で書いた分割手順 (5 ステップ) はそのまま、判定タイミングと「常にセット」原則も残す
- **Stop hook 自体は維持**: 「コード変更ありなのに CHANGELOG/TODO/STATUS 未更新」のリマインドは引き続き機能

### 変更

- [.claude/hooks/stop-reminder.js](.claude/hooks/stop-reminder.js): CHANGELOG.md 行数チェックブロック (約 17 行) を削除。`fs` / `path` の require も削除。冒頭コメントに v364 移管の旨追記
- [CLAUDE.md](CLAUDE.md): 「## CHANGELOG.md 行数チェックとアーカイブ手順 (v349〜)」見出しを撤去し、内容を「【セッション終了時・『終わったので手続きお願いします』の合図で】」セクションの先頭に移動。分割手順 5 ステップは変更なし

### 検証

- `node .claude/hooks/stop-reminder.js` → exit 0、何も出力されない (現状 CHANGELOG 変更前なので missing チェックも通る)
- ファイル行数: stop-reminder.js 75 → 55 行

### 運用ルール (v364〜)

- CHANGELOG.md 行数チェックは「終わったので手続きお願いします」の合図で `wc -l CHANGELOG.md` を実行
- 1500 行超なら分割 (CHANGELOG_PHASE*.md に退避 + STATUS.md 同時整理)
- Stop hook は「コード変更時の CHANGELOG/TODO/STATUS 反映漏れ」のみリマインド

---

## 213. v363 — メモに train_name 列追加: 「🚆 あずさ [E353系]」形式の表示 (2026-05-27)

### 背景

v362 cascade 整理後ユスケから「列車名がでてこない」との指摘。v360 で car_model だけ追加していたが、特急で「のぞみ → N700S」を選んでも一覧では `🚆 N700S` だけで、列車名「のぞみ」が表示されない。旅程カード v354 と同じ「🚆 列車名 [車両形式]」形式に揃える。

### 設計判断

- **`train_name` を新規列で追加**: メモは v122 時点で `train_name`/`train_id` を持っていなかった。`car_model` (v360) と同じく nullable TEXT で
- **`train_id` は保存しない**: メモは旅程と違って「列車を選んだ」というメタ情報は不要、名前文字列だけあれば一覧で完結。UI 補助の dropdown は使うが保存対象は `train_name` のみ
- **`#m-train-name-custom` を shadow value 兼用**: 元は「📝 リストにない」選択時の手入力 input だったが、v363 で「常に最終 train_name を保持する shadow」として再利用。`onMemoTrainIdChange` で master の `train.name` を `.value` に shadow セット、`readModal` がそこから読む。HTML 要素は不変、value の使い方だけ拡張
- **「指定しない」/「普通」は train_name 空**: 普通電車には固有列車名がない、指定しないは全リセット

### 変更

- **migration** [`supabase/migrations/v363_memo_train_name.sql`](supabase/migrations/v363_memo_train_name.sql) 新規:
  ```sql
  ALTER TABLE norireco_memos ADD COLUMN IF NOT EXISTS train_name text;
  NOTIFY pgrst, 'reload schema';
  ```
  → **ユスケへ実行依頼**: Supabase Dashboard SQL Editor で Run、Run 後 migration 末尾に `-- Applied: 2026-05-27 by yutsutke` 追記
- **JS** [js/16-memos.js](js/16-memos.js):
  - `fillModal`: `memo.train_name` を `#m-train-name-custom.value` に復元 (新規は '')
  - `initMemoTrainCascade`: trainCustom.value をクリアしない (shadow value 維持)、表示のみ hide
  - `onMemoTrainCategoryChange`: cat='' → trainCustom.value = '' (clear) / cat='local' → train_name shadow clear (普通電車に列車名なし) / cat='その他' → そのまま populate
  - `onMemoTrainIdChange`: 通常 train_id 選択 → master `train.name` を `trainCustom.value` に shadow セット / `__custom__` → trainCustom show + clear + focus / `''` → trainCustom hide + clear
  - `readModal`: `train_name = trainCustom.value.trim() || null` を戻り値に追加
  - `memoCardHtml`: 「🚆 [車両]」を「`train_name || car_model` どちらかあれば表示」の旅程カード v354 と同じパターンに改修
- sw.js: CACHE_VERSION 'v362' → 'v363'

### 表示パターン (旅程カード v354 と同等)

| ケース | train_name | car_model | 表示 |
|---|---|---|---|
| 普通 (車両のみ) | null | E235系0番台 | `🚆 [E235系0番台]` |
| 特急 (列車+車両) | あずさ | E353系 | `🚆 あずさ [E353系]` |
| 特急 (列車のみ) | のぞみ | null | `🚆 のぞみ` |
| 手入力列車+車両 | 湘南ライナー | 185系 | `🚆 湘南ライナー [185系]` |
| なし (両方 null) | null | null | (行なし) |

### 検証

- syntax check 24/24 OK
- preview の ES Module memory cache に古い 16-memos.js が貼り付いて `mod.memoCardHtml` テストが取れず → 実機ハードリロード後に確認

### 残課題

- v363 SQL を Supabase で Run → 実行後 migration 末尾に `-- Applied: 2026-05-27 by yutsutke` 追記 (v333 Applied 規約)

---

## 212. v362 — メモ車両 cascade 整理: `#m-car-model` を `__custom__` 選択時のみ表示 (2026-05-27)

### 背景

v361 push 後ユスケから「整理したいね」のスクショ指摘 3 枚:
1. カテゴリ「指定しない」なのに下に自由入力 input が表示されたまま
2. 「指定しない」だけのときも input 領域が大きく見える
3. 「新幹線 → のぞみ → ✏️ 別形式を入力」を選んだ時にも `#m-car-model` (自由入力 input) が dropdown の下に常時表示 → 二重 UI

v361 では `#m-car-model` を最終 shadow value 兼自由入力欄として常時表示にしていたが、dropdown 選択中も見えるので「どっちに入れたらいい?」と混乱しやすい。

### 設計判断

- **「`__custom__` (「✏️ 別形式を入力」/「リストにない (手入力)」) 選択時のみ表示」**: dropdown 選択中は自由入力 input を見せない、選んだ option の値が shadow セットされて隠れる。`__custom__` を選んだ時のみ表示+ focus
- **「指定しない」は完全 clear**: カテゴリ未指定なら車両情報を一切記録しない (input value も clear)
- **編集時の復元**: 既存 `memo.car_model` が dropdown 一致なら dropdown 選択 + input hide、一致しなければ `__custom__` 選択 + input show + 値復元
- **input 枠を gold border に**: 「自由入力モード」の視覚的強調 (旅程編集モーダル v356 と同じ)

### 変更

[noritetsu-map.html](noritetsu-map.html): `#m-car-model` の inline style に `display:none` 追加 + border を `var(--gold)` に変更

[js/16-memos.js](js/16-memos.js) の表示切替分岐を以下のとおり統一:

| 関数 | 入力 | `#m-car-model` 表示 |
|---|---|---|
| `initMemoTrainCascade()` | (初期化) | hide |
| `onMemoTrainCategoryChange()` | cat='' | hide + value clear |
| `onMemoTrainCategoryChange()` | cat='local'/'その他' | 一旦 hide (populate 側で再判定) |
| `populateMemoSlVehiclePicker()` | 既存値 dropdown 一致 | hide |
| `populateMemoSlVehiclePicker()` | 既存値 dropdown 不一致 (custom) | show + 値復元 |
| `populateMemoSlVehiclePicker()` | 既存値なし | hide |
| `onMemoSlVehicleChange()` | `__custom__` | show + focus |
| `onMemoSlVehicleChange()` | 通常 option | hide + value セット |
| `onMemoTrainIdChange()` | `__custom__` (列車手入力) | show |
| `onMemoTrainIdChange()` | 通常 train で car_models 0 件 | show (自由入力可) |
| `onMemoTrainIdChange()` | 通常 train、既存値が car_models 一致 | hide |
| `onMemoTrainIdChange()` | 通常 train、既存値が一致なし | show + 値復元 |
| `onMemoTrainIdChange()` | '' | hide |
| `onMemoCarModelSelectChange()` | `__custom__` | show + focus |
| `onMemoCarModelSelectChange()` | 通常 option | hide + value セット |

sw.js: CACHE_VERSION 'v361' → 'v362'

### 検証

- syntax check 24/24 OK
- DOM: `#m-car-model.style.display = 'none'` 初期確認
- 関数公開は preview の ES Module memory cache で反映されず → 実機ハードリロード

### 動線 (整理後)

```
[カテゴリ ▼]
 ├ 指定しない  → 全 hide (車両情報 0)
 ├ 🚉 普通     → [車両 ▼ (sl 車両 + ✏️ 別形式を入力)]
 │               └ 通常 option → input hide (shadow セット)
 │               └ ✏️ 別形式  → input show + focus
 └ 🚄 特急     → [列車 ▼] → [車両 ▼ (列車別 car_models + ✏️)]
                  └ 列車「リストにない」→ 列車手入力 + 車両 input show
                  └ 通常 train → car_models populate → 同上
```

---

## 211. v361 — メモ車両選択を記録モーダル方式 (フル cascade) に統一 (2026-05-27)

### 背景

v360 で SQL 実行 (`car_model | text | YES`) 完了、ユスケから「メモの車両の選び方が、旅程記録の方式に合わせたい」との指示。v360 は text input 1 つの最小実装だったが、記録モーダル (v352 以降) と動線を揃える。

### 設計判断

- **フル cascade** (ユスケ確認 2 択中の選択): カテゴリ → 普通=line_id から sl 車両 dropdown / 特急=列車選択 → 車両形式 dropdown
- **メモは train_id 列を持たないが UI は cascade**: train を選んでも保存するのは car_model のみ。列車名は UI 補助で、選んだ列車の car_models から正確な車両を選びやすくする
- **shadow value 方式**: 最終値は既存 `#m-car-model` text input に shadow セット (旅程編集モーダル v356 と同じパターン)。`readModal` は今まで通り `#m-car-model` を読むだけ、保存ロジック変更不要
- **「指定しない」が default**: メモは記録モーダルのマニアトグルに相当する仕組み不要、シンプルにカテゴリで出し分け
- **普通カテゴリの sl 引き**: 編集中なら `memo.line_id`、新規なら `clickInfo.line?.id`。`line_id` が無い場合 (車内/その他メモ) は普通カテゴリでも「車両データ未登録」案内 + 自由入力にフォール

### 変更

- **HTML** [noritetsu-map.html](noritetsu-map.html): `#memo-modal` の「🚆 車両」セクションを拡張
  - `<select id="m-train-category">` (新): 「指定しない / 🚉 普通 / 🚅 新幹線 / ...」 (普通先頭 sort)
  - `<div id="m-sl-vehicle-block">` (新, default hide): sl 車両 dropdown + 「データ未登録」案内
  - `<div id="m-train-cascade">` (新, default hide): 列車 dropdown + 列車手入力 + 車両形式 dropdown
  - 既存 `<input id="m-car-model">` は「最終 shadow value」として残置、`#m-train-cascade` の下に移動
- **JS** [js/16-memos.js](js/16-memos.js):
  - `getMemoCurrentLineId()` (新, internal): 編集中なら `memo.line_id`、新規なら `clickInfo.line?.id`
  - `initMemoTrainCascade()` (新): カテゴリ dropdown を populate (記録モーダル resetTrainSelector と同じ普通先頭 sort)、サブ dropdown を初期化、`fillModal` から呼出
  - `onMemoTrainCategoryChange()` (新, window 公開): cat='' → 全 hide / cat='local' → sl-block + populate / cat='その他' → cascade + populate
  - `populateMemoSlVehiclePicker()` (新): `getMemoCurrentLineId()` → bySlId → 状態順 sort + 末尾「✏️ 別形式を入力」option + 既存 `#m-car-model` 値で一致 option 復元
  - `onMemoSlVehicleChange()` (新, window 公開): 通常 option → `#m-car-model` に shadow セット / `__custom__` → input にフォーカス
  - `populateMemoTrainDropdown(cat)` (新): TRAINS を category filter + 廃止末尾・名前順 + 末尾「📝 リストにない」option
  - `onMemoTrainIdChange()` (新, window 公開): 通常 train_id → 選んだ列車の `car_models` を `#m-car-model-select` に populate + 一致 option 復元 / `__custom__` → 手入力 input + focus
  - `onMemoCarModelSelectChange()` (新, window 公開): 通常 option → `#m-car-model` に shadow セット / `__custom__` → input にフォーカス
- sw.js: CACHE_VERSION 'v360' → 'v361'

### 検証

- syntax check 24/24 OK
- DOM: `#m-train-category` / `#m-sl-vehicle-block` / `#m-train-cascade` / `#m-train-id` / `#m-car-model-select` / `#m-car-model` 全 6 要素存在を確認
- 関数 window 公開: `window.onMemoTrainCategoryChange/onMemoSlVehicleChange/onMemoTrainIdChange/onMemoCarModelSelectChange` が grep 4 件確認 (公開行: 756/806/860/873)
- preview の ES Module memory cache に古い 16-memos.js が残って window 関数公開が反映されず実機ハードリロードで検証

### 動線

```
[🚆 車両 (任意)]
[カテゴリ ▼]
  指定しない    → 何も出ない (m-car-model だけ自由入力)
  🚉 普通       → [車両を選ぶ▼ + (memo.line_id から引いた sl 車両 + ✏️ 別形式を入力)]
  🚄 特急       → [列車を選ぶ▼ (137 列車)] → [車両を選ぶ▼ (選んだ列車の car_models)]
                  ↳ 📝 リストにない → 列車手入力
[車両形式: shadow value 保持 + 自由編集可]
```

---

## 210. v360 — メモにも車両形式: migration + 記録/編集モーダル input + 一覧表示 + 検索 (2026-05-27)

### 背景

v354 → v357 → v358 と「旅程・路線タブに車両形式を統合」を進めた流れで、ユスケから「メモの記録/編集モーダルに車両形式選択 + 一覧でも検索/表示できるように」との要望。`norireco_memos` テーブルは v250 で作って以降 `car_model` 列を持っていなかったので migration から。

### 設計判断

- **`car_model` は nullable TEXT 列**: 既存 100 件超のメモを壊さない (NULL のまま動く)。`ALTER TABLE ADD COLUMN IF NOT EXISTS` で冪等
- **入力欄は free text、常時表示**: 記録モーダルの v348 sl レーン (区間→車両 dropdown) を持ち込むより、メモは「自由入力」が筋。場所・状況により乗ってる車両がまちまちなので、その場でタイプする方が早い
- **検索は substring 大文字小文字不問**: v357 旅程タブ・v358 路線タブと同じパターン (`includes(q.toLowerCase())`)
- **一覧表示は条件付き**: `memo.car_model` が空なら行ごと非表示 (UI クリーン)

### 変更

- **migration** [`supabase/migrations/v360_memo_car_model.sql`](supabase/migrations/v360_memo_car_model.sql) 新規:
  ```sql
  ALTER TABLE norireco_memos ADD COLUMN IF NOT EXISTS car_model text;
  NOTIFY pgrst, 'reload schema';
  ```
  → **ユスケへ実行依頼**: Supabase Dashboard SQL Editor で Run、実行後 migration ファイル末尾に `-- Applied: 2026-05-27 by yutsutke` を追記 (v333 Applied 規約)
- **HTML** [noritetsu-map.html](noritetsu-map.html): `#memo-modal` の「コメント」の上に `<input id="m-car-model" placeholder="例: E235系0番台、キハ110系 など">` を `fg` ブロックで追加
- **JS** [js/16-memos.js](js/16-memos.js):
  - `fillModal({ memo })` に `if (carInp) carInp.value = memo.car_model || ''` 追加 (新規は空、編集は復元)
  - `readModal()` 戻り値に `car_model` 追加 (`.trim() || null`)
  - `M.filter` 初期値に `car_model: ''` 追加
  - フィルタバー HTML に「🚆 車両」input 1 行追加 (`#mp-memo-fil-car`、`updateMemoFilter('car_model', ...)`)
  - `applyMemoFilters` 末尾に substring 判定追加 (大文字小文字不問)
  - `memoCardHtml` に `${memo.car_model ? '🚆 [...]' : ''}` 行追加 (where 行の下、comment の上)
- sw.js: CACHE_VERSION 'v359' → 'v360'

### 検証 (Claude Preview)

- syntax check 24/24 OK
- `memoCardHtml({ car_model: 'E235系0番台', ... })` → `🚆 E235系0番台` 含む ✓
- `memoCardHtml({ car_model: null, ... })` → `mp-memo-car` クラス含まない (行非表示) ✓
- DOM: `#m-car-model` input が `#memo-modal` 内に存在 ✓

### 残課題

- v360 SQL を Supabase で Run → 実行後 migration ファイル末尾に `-- Applied: YYYY-MM-DD by yutsutke` を追記して commit (v333 Applied 規約)
- SQL Run 前でも JS 側は動く (`car_model` が null として保存 → 列なしで insert/update も PostgREST が許容)。SQL Run 後に値が永続化される

---

## 209. v359 — 路線タブ: 📺 旅程 / 📸 メモ アイコン + 路線詳細モーダル (2026-05-26)

### 背景

v358 で軽い 2 機能 (車両形式表示 + 検索) を入れた続編。ユスケから「旅程・メモアイコン + 一覧モーダル」の実装指示。各路線カードに件数アイコンを置き、クリックで該当路線の旅程・メモを一覧表示するモーダルを開く。

### 設計判断

- **アイコン件数 0 は非表示**: クリーンな見た目を優先。`tripCount > 0` / `memoCount > 0` のときだけ描画
- **モーダル + タブ切替**: 旅程と メモを同じモーダル (`#mp-line-detail-modal`) で扱い、上部タブで切替。タブ移動 (旅程タブにジャンプ) より「路線タブの上で完結」が path のシンプル化に直結
- **既存 `tripCardHtml` / `memoCardHtml` を再利用**: 旅程カード・メモカードのレイアウトは既にあるので、import して使い回す。`memoCardHtml` は 16-memos.js 内のローカル関数だったので v359 で `export` 化
- **集計は `_mypageCache` / `memos.state.cache`**: マイページ用に既にメモリ上にあるデータを使い、追加 fetch なし
- **メモの紐付け**: `m.line_id` (路線メモ) と `m.station_id` 経由 (sl 内駅メモ) を **両方拾い + Set で重複排除**。「路線に関係するメモ」の自然な解釈

### 変更

- **HTML** ([noritetsu-map.html:1421](noritetsu-map.html#L1421)): 既存 `#trip-edit-modal` の上に `#mp-line-detail-modal` を追加 (memo-modal クラス踏襲、ヘッダ + タブボタン 2 つ + 本文 `#mp-line-detail-body`)
- **JS** ([js/16-memos.js:514](js/16-memos.js#L514)): `function memoCardHtml` → `export function memoCardHtml` (v359 で 09-tabs-stats から流用するため)
- **JS** ([js/09-tabs-stats.js](js/09-tabs-stats.js)):
  - `import { tripCardHtml }` を 13-mypage-common から追加、`import { memoCardHtml }` を 16-memos から追加
  - `aggregateTripsByLineId()` (新, internal): `_mypageCache` を走査して Map<lineId, trip[]>。1 trip 内の同一 lineId は Set で重複排除 (複数 segment が同じ路線でも 1 カウント)
  - `aggregateMemosByLineId()` (新, internal): Map<lineId, memo[]>。`m.line_id` 直接 + `m.station_id → sl.stations[].id` 逆引きを両ルート、Set で重複排除
  - `openLineDetailModal(slId, initialTab)` (新, window 公開): sl を resolve、trips / memos を集計 (date / created_at 降順 sort)、モーダルヘッダ + タブラベル更新、初期タブは引数 > 件数の多い方
  - `closeLineDetailModal()` / `switchLineDetailTab(tab)` (新, window 公開)
  - `renderList()` 内: 各 lcard 末尾に `<div class="lc-icons">📺 N / 📸 N</div>` 追加 (件数 0 は省略)
  - アイコンクリックハンドラ: `lc-icon-trips` / `lc-icon-memos` を `listBody` 内 querySelectorAll で attach、`e.stopPropagation()` で親要素のクリックを抑制
- sw.js: CACHE_VERSION 'v358' → 'v359'

### 検証

- syntax check 24/24 OK
- preview の ES Module memory cache に古い 09-tabs-stats.js (v358 版で memoCardHtml import 未対応) が貼り付いて `window.openLineDetailModal` が undefined のまま検証しきれず → 実機ハードリロード後に確認
- ファイル内容は grep で window 公開 4 つ (open/close/switch + v358 の onMpLinesCarModelInput) を確認済

### 路線タブカード新表示

```
●─ 山手線              JR東日本  100%
30/30駅 ✓ 完乗！
🚆 E235系0番台, E233系
[📺 12] [📸 3]                ← v359 追加 (クリックでモーダル)
```

モーダル中身: 上部タブ `📺 旅程 (12) | 📸 メモ (3)` 切替、本文に `tripCardHtml` / `memoCardHtml` の一覧。

---

## 208. v358 — 路線タブ: 乗車車両 上位 3 個を表示 + 車両形式検索 (2026-05-26)

### 背景

v357 で旅程タブに車両形式検索を入れた流れで、ユスケから路線タブの拡張 3 件: (1) 各路線カードに乗車した車両形式を表示 / (2) 旅程・メモアイコン → クリックで一覧モーダル / (3) 車両形式検索。3 機能を 1 commit に詰めると重いので、軽い 2 機能 (車両表示 + 検索) を先に v358、一覧モーダルは v359 で別出しの方針。

### 設計判断

- **集計は `NORIRECO.mypage.state._mypageCache` を使う**: マイページ用に既に Supabase から trips を取得済。renderList で別途 fetch せずに済む (ログイン前なら空配列、車両情報なしで表示)
- **「`trip.segments[].lineId` ベース集計」**: 駅 id ベースだと駅単位の集計になってしまう。路線単位なら segments の lineId を Set 化して 1 trip 1 line 1 カウント
- **上位 3 個 + 「他 N 件」**: ユスケ確認で 3 個に。たくさん乗った路線でカードが縦に肥大化するのを防ぐ
- **IME 安全な再描画分割**: 路線タブ全体を `c.innerHTML=''` で消すと検索 input のフォーカスが飛ぶ。`#mp-lines-filter-bar` (1 度だけ生成) と `#mp-lines-list-body` (毎回置換) に分け、フィルタ入力中も DOM を維持

### 変更

[js/09-tabs-stats.js:40](js/09-tabs-stats.js#L40) `renderList()` を大幅改修:

- `aggregateCarModelsByLineId()` (新, internal): `_mypageCache` を走査して Map<lineId, Map<carModel, count>> を作る
- `topCarModels(carMap, n)` (新, internal): カウント降順で上位 N 件
- `renderList` 冒頭: フィルタバーが無ければ生成、あればリスト本体だけクリア
- フィルタ ロジック: クエリ含む車両形式を持つ sl_id Set で SERVICE_LINES を filter (該当 0 件なら「『X』を含む車両形式の記録なし」案内)
- 各 lcard 末尾に `<div class="lc-cars">🚆 上位3個 +他N件</div>` を追加 (車両記録 0 件の路線では非表示)
- color picker / reset イベントは `listBody` スコープに変更 (`c` 直下から listBody 内に)
- `onMpLinesCarModelInput(value)` (新, window 公開): クエリ更新 + `renderList()` 再呼出

sw.js: CACHE_VERSION 'v357' → 'v358'

### 検証 (Claude Preview)

mock 6 trips (E235系×2, E233系×1, E353系×1, キハ110系×1, null×1) と 4 路線で:

| 操作 | 期待 | 実測 |
|---|---|---|
| 初期 | 山手線 `🚆 E235系0番台, E233系` / 中央本線 `🚆 E353系` / 小海線 `🚆 キハ110系` / 使ってない線 表示なし | ✓ |
| `E235` | 山手線のみ | ✓ |
| `キハ` | 小海線のみ | ✓ |
| `XYZ999` | 「『xyz999』を含む車両形式の記録なし」 | ✓ |
| 空 | 全 4 路線復元 | ✓ |

### 残課題 (v359 へ)

- 各路線カードに「📺 旅程 N 件」「📸 メモ N 件」アイコン + クリックで新規モーダル表示

---

## 207. v357 — 旅程タブに「🚆 車両」検索 input を追加 (substring 検索) (2026-05-26)

### 背景

v351 で「車両形式検索 UI は実機運用後に N=1 設計」と TODO に残していた件。v354 で旅程カードに車両形式表示が入り、v356 で編集モーダルにも列車 dropdown が入って車両形式入力の動線が一通り完成。ユスケから「旅程タブ 車両形式でも検索できるようにする」との指示。

### 設計判断

- **`t.car_model` substring 検索**: データ層は v122 から TEXT 列、フラットな文字列で保存されている。複雑な正規化 (車両形式マスターとの突き合わせ等) は不要、シンプルな部分一致で十分
- **大文字小文字不問**: `E235` でも `e235` でも引っ掛かる方が予測しやすい (車両形式は英数字混在)
- **駅名検索と AND 関係**: 既存の駅名検索 (v285〜) と並列で OR ではなく AND。「東京を発着した E235 系の旅程」のような掘り下げ検索が自然
- **UI: 既存 input の真下に配置**: フィルタバーは「期間 / 種類 / 種別 / 駅名 / 範囲 / 並び替え」と縦並び (`mp-filter-row`)。「駅名」と「範囲」の間に挿入

### 変更

- [js/13-mypage-common.js:67](js/13-mypage-common.js#L67) state 初期値 `mpTripFilter` に `car_model: ''` 追加
- [js/13b-trips.js:142-145](js/13b-trips.js#L142) `buildTripFilterBar` に `<input id="mp-fil-car-model" placeholder="例: E235 / キハ110">` 追加
- [js/13b-trips.js:194](js/13b-trips.js#L194) `resetMpFilter` の reset 値に `car_model: ''` 追加
- [js/13b-trips.js:264-267](js/13b-trips.js#L264) `applyTripFilters` の末尾に car_model 判定追加:
  ```js
  const cmq = (NORIRECO.mypage.state.mpTripFilter.car_model || '').trim();
  if (cmq) {
    if (!t.car_model || !t.car_model.toLowerCase().includes(cmq.toLowerCase())) return false;
  }
  ```
- sw.js: CACHE_VERSION 'v356' → 'v357'

### 検証 (Claude Preview)

mock 4 trips (`E235系0番台 / E353系 / キハ110系 / null`) で:

| クエリ | マッチ |
|---|---|
| `E235` | t1 (`E235系0番台`) |
| `e353` (小文字) | t2 (`E353系`) — 大文字小文字不問 |
| `系` | t1, t2, t3 (`null` は除外) |
| `キハ` | t3 |
| `` (空) | 全 4 件 |

`resetMpFilter` 後 `car_model = ''` を確認。`buildTripFilterBar` 出力 HTML に `mp-fil-car-model` 含有を確認。

---

## 206. v356 — 旅程編集モーダル: 特急等選択時に列車 dropdown を追加 (記録モーダルとの対称性向上) (2026-05-26)

### 背景

v355 の編集モーダル整理直後、ユスケから「特急で列車が手入力だけ、選択肢がでてこない」との指摘。記録モーダルでは特急カテゴリ選択 → 列車 dropdown (137 列車) → 列車選択 → 車両形式入力 という cascade フローだが、編集モーダルは text input のみの簡易入力だった。「※ 簡易入力です。マスター列車の cascading 選択は新規記録の確認モーダルでのみ可能」と注釈はあったが、UX が非対称で違和感大。

### 設計判断

- **車両形式は引き続き text input**: ユスケ要望は「列車選択肢」だけが目下の不満点。記録モーダルの「区間→車両 dropdown」(sl レーン) や「列車別車両 dropdown」(cascade レーン) を編集モーダルにも持ってくると工数大きい。最小工数で「列車 dropdown だけ追加」して様子見、必要なら車両側も後で追加
- **shadow value 方式**: `#trip-edit-train-name` text input は hide のまま残し、列車 dropdown 選択時にマスター train.name を text input に代入 (shadow セット)。これで saveTripEdit の既存ロジック (`trim()` で読む) を変えずに済む
- **train_id は dropdown 経由で取得**: dropdown value がそのまま train_id (`'azusa'` 等)、`'__custom__'` または空文字なら null。v355 まであった「train_name 変更で train_id を null に倒す」分岐を撤去、ロジックが明確に

### 変更

- [noritetsu-map.html:1461-1471](noritetsu-map.html#L1461):
  - `<select id="trip-edit-train-id" onchange="onTripEditTrainChange()">` を category select と train-name input の間に新設 (default `display:none`)
  - 既存 `#trip-edit-train-name` の枠を `var(--gold)` に変更 (手入力モードの視覚的強調)
- [js/13b-trips.js](js/13b-trips.js):
  - `applyTripEditCategoryVisibility(cat)` を拡張:
    - `cat === ''` → 全 hide + value clear
    - `cat === 'local'` → 列車 dropdown hide + 列車手入力 hide + 車両形式 show
    - `cat === 'その他'` → `populateTripEditTrainDropdown(cat)` 呼出 + 列車 dropdown show + 車両形式 show
  - `populateTripEditTrainDropdown(cat)` (新, internal): TRAINS をカテゴリで filter + 廃止末尾・名前順 sort、末尾に「📝 リストにない (手入力)」option
  - `onTripEditTrainChange()` (新, window 公開): dropdown value で分岐
    - `'__custom__'` → 列車手入力 show + value clear + focus
    - `''` → 列車手入力 hide + value clear
    - 通常 train_id → 列車手入力 hide + train_name input に master train.name を shadow セット
  - `openTripEditModal` 末尾: applyTripEditCategoryVisibility 後に、cat='その他' なら trip.train_id の有無で dropdown 値・列車手入力 input 表示を復元
  - `saveTripEdit`: train_id 取得を `tidRaw && tidRaw !== '__custom__'` 経由に変更、v355 まであった `tnameRaw !== trip.train_name` で train_id null 倒し分岐を撤去
- sw.js: CACHE_VERSION 'v355' → 'v356'

### 検証

- syntax check 24/24 OK
- preview の dynamic import で新 module 読込テスト: `exists.tid: true`, `onTrainChange: 'function'` を確認
- preview の ES Module memory cache に古い `applyTripEditCategoryVisibility` (v355 版) が貼り付いて dropdown populate / display 切替が反映されない問題があったため、エンドツーエンドの実機検証は push 後の本番ハードリロードで実施
- ファイル内容は grep + Read で「特急なら populate + show」のロジックが含まれていることを確認済

### フロー対比

| カテゴリ | v355 編集モーダル | v356 編集モーダル |
|---|---|---|
| 指定しない | 列車名 hide / 車両形式 hide | 列車 dropdown hide / 列車名 hide / 車両形式 hide |
| 普通 | 列車名 hide / 車両形式 input | 列車 dropdown hide / 列車名 hide / 車両形式 input |
| 特急など | 列車名 **text input のみ** | 列車 **dropdown** + 「リストにない」で text input fallback + 車両形式 input |

### 残課題

- 編集モーダルにも記録モーダルと同様の「車両形式 dropdown」を追加 (特急: 列車別車両候補 / 普通: 区間別 sl 候補)。これは UX 対称性を最大化する案だが、工数大きいので実機運用で「車両も dropdown ほしい」が出てから検討

---

## 205. v355 — 旅程編集モーダル整理: カテゴリ「普通」先頭 + 列車名 input を「普通」/「指定しない」で hide (2026-05-26)

### 背景

v354 で旅程一覧カードに車両形式表示を追加した後、ユスケから「旅程タブの編集画面を修正して」との要望。スクショでは「列車種別」カテゴリ dropdown で「🚉 普通」選択中なのに「列車名 (例: あずさ9号、富士回遊3号)」placeholder の input が空で残っていて、普通電車記録の編集で違和感があった。記録モーダル側 (v350-v354) と編集モーダル側で UI 哲学が揃っていなかった。

### 設計判断

- **案 A (軽い修正) 採用**: マニアトグル + sl レーンへの全面置換 (案 B) は工数大きい。編集モーダルは「すでに記録された値を直す」用途なので、簡易入力 (text input ベース) のまま、カテゴリ駆動で入力欄を出し分ける程度に留める
- **「普通」は列車名 input 不要**: 普通電車に固有列車名はない (`local` カテゴリは trains_master 0 件) → hide が筋
- **「指定しない」は両方 hide**: 「カテゴリ未指定なら列車名・車両形式も記録しない」が自然
- **hide 時は value も '' clear**: saveTripEdit が trim 後 null にする仕様なので、hide 状態の隠れた input value が予期せず保存されるのを防ぐ
- **「普通」先頭ソート**: v353 (記録モーダル) と同じ整理を編集モーダルにも適用

### 変更

- [noritetsu-map.html:1461-1467](noritetsu-map.html#L1461):
  - `#trip-edit-train-category` に `onchange="onTripEditCategoryChange()"` を追加
  - `#trip-edit-train-name` / `#trip-edit-car-model` の inline style に `display:none` を追加 (default hide、JS が show を切替)
- [js/13b-trips.js:324](js/13b-trips.js#L324) `openTripEditModal`:
  - カテゴリ dropdown 構築前に `Object.entries(cats)` を `local` 先頭 stable sort
  - 末尾で `applyTripEditCategoryVisibility(trip.train_category || '')` を呼んで現状反映
- [js/13b-trips.js](js/13b-trips.js) 新規関数:
  - `applyTripEditCategoryVisibility(cat)` (internal): `!cat` → 両方 hide / `cat === 'local'` → name hide + car show / それ以外 → 両方 show。hide 時は value も clear
  - `onTripEditCategoryChange()` (window 公開): select onchange ハンドラ
- sw.js: CACHE_VERSION 'v354' → 'v355'

### 検証 (Claude Preview)

mock TRAIN_CATEGORIES を仕込んで dropdown populate 後の挙動確認:

| 操作 | name | car | name.value | car.value |
|---|---|---|---|---|
| dropdown order | `['', 'local', 'shinkansen', 'limited_express', 'rapid', 'express', 'sleeper']` | | | |
| 「指定しない」 | none | none | '' | '' |
| 「普通」 | none | block | '' | '' |
| 「特急」 | block | block | (入力可) | (入力可) |
| 「新幹線」 | block | block | (入力可) | (入力可) |
| 「特急」→ 値入力 → 「指定しない」 | none | none | '' (clear) | '' (clear) |

全パターン期待通り。

---

## 204. v354 — 旅程カードに車両形式を表示 (普通=車両形式のみ / 特急=列車名+車両形式) (2026-05-26)

### 背景

ユスケから「旅程画面一覧で、普通車は車両形式を、特急者は列車名・車両形式を表示したい」との要望。現状の `tripCardHtml` は `trip.train_name` がある時だけ車両情報を描画していたため、v348 以降の sl レーン経由 (普通電車: `train_name=null` + `car_model=値`) で記録した旅程は車両形式が一切表示されていなかった。

### 変更

[js/13-mypage-common.js:572-585](js/13-mypage-common.js#L572) の `trainBit` 生成を「`train_name` か `car_model` のどちらかあれば表示」に変更:

```js
if (trip.train_name || trip.car_model) {
  const customMark = (trip.train_name && !trip.train_id) ? ' 📝' : '';
  const namePart = trip.train_name ? `${trip.train_name}${customMark}` : '';
  const carPart  = trip.car_model  ? `<span class="mp-car">[${trip.car_model}]</span>` : '';
  const sep = (namePart && carPart) ? ' ' : '';
  trainBit = `<div class="mp-tcard-train">🚆 ${namePart}${sep}${carPart}</div>`;
}
```

sw.js: CACHE_VERSION 'v353' → 'v354'

### 検証 (Claude Preview)

mock trip 5 パターンを `tripCardHtml` に通して `<div class="mp-tcard-train">` の中身を確認:

| ケース | train_id | train_name | car_model | 出力 |
|---|---|---|---|---|
| 普通 | null | null | E235系0番台 | `🚆 [E235系0番台]` |
| 特急 (列車+車両) | azusa | あずさ | E353系 | `🚆 あずさ [E353系]` |
| 特急 (列車のみ) | azusa | あずさ | null | `🚆 あずさ` |
| 手入力列車+車両 | null | 湘南ライナー | 185系 | `🚆 湘南ライナー 📝 [185系]` |
| 両方 null | null | null | null | (行なし) |

全 5 ケース期待通り。

---

## 203. v353 — 記録モーダル: カテゴリ dropdown の並びを「普通」先頭に (2026-05-26)

### 背景

v352 実機検証時にユスケから「普通車選ぶのがもっとも多いから一番上にしたい」。元の `trains_master.json` の `categories` 順は新幹線 → 特急 → 快速 → 急行 → 普通 → ... で「普通」が 5 番目。記録の多数派ケース (通勤・近郊で普通電車) が中段に埋もれて毎回スクロール要求していた。

### 変更

- [js/02-data-loaders.js:272-279](js/02-data-loaders.js#L272) `resetTrainSelector` の `Object.entries(T.TRAIN_CATEGORIES)` ループ前に stable sort 1 つ追加。`local` を先頭、それ以外は元順序維持
- sw.js: CACHE_VERSION 'v352' → 'v353'

### 検証 (Claude Preview)

`/js/02-data-loaders.js?bust=...` で module cache を bypass、`resetTrainSelector()` 呼出後の cat dropdown options:

```
0: (empty) — 指定しない
1: local — 🚉 普通          ← 先頭
2: shinkansen — 🚅 新幹線
3: limited_express — 🚄 特急
4: rapid — 🚆 快速
5: express — 🚃 急行
6: sleeper — 🛌 寝台列車
7: cruise_train — 💎 クルーズトレイン
8: joyful_train — 🎉 観光列車
9: steam — 🚂 蒸気機関車 (SL)
10: seasonal — 🎫 季節限定
```

期待通り。

---

## 202. v352 — 記録モーダル: 普通/特急ラジオを撤廃 → 既存カテゴリ dropdown 駆動に統一 (2026-05-26)

### 背景

v351 push 後ユスケから「設計もっと単純にできるのでは? ラジオボタンをなくす。普通車の選択肢があるんだから、それを使うようにする。普通車→車両形式を選択という流れに。ラジオボタンでは新幹線も普通車形式で選択できるのも見直したい」との指摘。
v350 で「ラジオ 2 選択『普通電車 / 特急・観光列車』」を入れたが、cascade レーンの中に既に存在するカテゴリ dropdown (新幹線/特急/快速/急行/普通/寝台/クルーズ/観光/SL/季節限定) と意味が二重化していた。さらに排他制御が荒く、新幹線カテゴリ選択中でも普通車向け車両形式が選べてしまう不整合があった。

### 設計判断

- **ラジオ撤廃 + カテゴリ dropdown を picker の主役に**: TRAIN_CATEGORIES dropdown を picker 最上位 (マニアトグル直下) に出し、カテゴリ選択 = レーン選択を兼ねる。1 つの UI で「列車カテゴリの意味」と「車両形式 UI の出し分け」を同時に表現
- **`local` (普通) → sl レーン分岐の根拠**: `trains_master.json` の category 別 train 数を見ると `local: 0` / `rapid: 1` / 他は十数〜100+。`local` だけはマスターに列車登録がないので「列車を選ぶ」dropdown が空になる。逆に sl-vehicle DB は普通電車の通勤車両を網羅しているので、`local` だけを sl レーンに振るのが筋
- **`rapid` / `express` も cascade レーンに残す**: 列車登録があるので cascade が機能する。「快速」「急行」は固有列車名 (例: 急行アルプス/急行きたぐに) を選ぶ動線が活きる
- **シンプル化の効果**: ラジオ + 復元用 localStorage キー (`recTrainMode`) + `onRecTrainModeChange()` + `applyRecTrainMode()` を全て削除。`onTrainCategoryChange()` が「カテゴリで分岐」する 1 か所に集約

### 変更

- **HTML** ([noritetsu-map.html](noritetsu-map.html)):
  - `<input type="radio" name="rec-train-mode">` 2 個と親 `<div>` を削除
  - cascade 内にあった `<select id="rec-train-category">` を `<div id="rec-train-picker">` の直下 (sl-block と cascade の上) に移動
  - `#rec-sl-vehicle-block` を default `display:none` に変更 (`applyRecTrainCategory` がカテゴリ選択時に show する)
  - `#rec-train-cascade` の中身を「列車 → 車両形式 cascade のみ」に縮約 (category select は外に出た)
- **JS** ([js/07-record-mode.js](js/07-record-mode.js)):
  - `onRecTrainModeChange()` / `applyRecTrainMode()` / `PREF_REC_TRAIN_MODE` を削除
  - `applyRecTrainCategory(cat)` (新, window 公開のみ — 循環 import 回避): cat='local' → sl-block show + cascade hide + populateSlVehiclePicker / cat='その他' → sl-block hide + cascade show / cat='' → 両方 hide
  - `initRecTrainToggle()` / `onRecTrainToggle()` を「カテゴリ毎回 '' リセット → applyRecTrainCategory('')」に簡素化 (前回モードの localStorage 復元は廃止)
- **JS** ([js/02-data-loaders.js:284](js/02-data-loaders.js#L284) `onTrainCategoryChange`):
  - 冒頭で T のクリア + cascade 内 UI 全 hide (既存)
  - `window.applyRecTrainCategory(cat)` 呼出を追加 (sl-block / cascade の表示切替を委譲)
  - `!cat || cat === 'local'` で early return (cascade の列車 dropdown populate は skip)
  - それ以外 (limited_express / shinkansen / rapid 等) は既存の cascade populate を継続
- **sw.js**: CACHE_VERSION 'v351' → 'v352'

### 検証

- syntax check 24/24 OK
- `window.applyRecTrainCategory('local')` 直接呼出: sl='block' / cas='none' ✓
- `window.applyRecTrainCategory('limited_express')` 直接呼出: sl='none' / cas='block' ✓
- `window.applyRecTrainCategory('')` 直接呼出: sl='none' / cas='none' ✓
- preview の ES Module memory cache に古い 02-data-loaders.js が貼り付いて `window.onTrainCategoryChange.toString()` が古い版を返したため、`onTrainCategoryChange` 経由のエンドツーエンド確認は push 後の実機ハードリロードで実施 (ファイル内容は grep + fetch で新版を確認済)

### 残課題

- 「季節限定」カテゴリは現状 trains_master に列車 0 件 → 選んでも cascade の列車 dropdown が空になる。これは別タスク (季節限定列車をマスターに追加)。今回は「普通」と挙動が違うので将来検討
- 車両形式検索 UI (v351 で TODO 残し済)

---

## 201. v351 — 記録モーダル: 「(マニア向け)」文言削除 + 普通電車レーンに「✏️ 別形式を入力」自由記述 option (2026-05-26)

### 背景

v350 push 後ユスケから 2 点フィードバック: (1) トグル右の「(マニア向け)」が排他的ニュアンスで Lv2 (記録に多少興味あるライト層) を遠ざける、削除したい。(2) 普通電車レーンの dropdown で `service_line_vehicles.json` に該当車両が登録されていないケース (例: 新形式・短期投入・データ未登録系統) で自由入力ができない。「あとから車両形式で検索もできるようにしたい、どういう形がいい?」と相談。

### 設計判断

- **(マニア向け) 削除**: 単純削除。文言だけの問題で構造は変えない
- **データ層は既に「自由文字列」対応済**: `norireco_trips.car_model` (TEXT) は v122 から存在、特急 cascade の `#rec-car-model-custom` で自由入力するパス、13a-stats / 09-tabs-stats も `t.car_model` 値で集計済。後から検索追加も技術的に軽量 (substring 検索 1 つ)
- **UI 案 A 採用 (dropdown 末尾の `__custom__` option + input 展開)**: 既存特急 cascade の同パターンと一貫、Lv0/1 は dropdown だけで完結、Lv2/3 は最後の option として発見可能。案 B (常時 input フォールバック) は UI スッキリしない、案 C (データ未登録時のみ input) は「データはあるけど自分が乗った車両がリストにない」ケースを拾えない
- **dropdown と input の整合**: 既存 T.selectedCarModel が dropdown の値に含まれていれば dropdown 表示、含まれない (自由入力済) 値なら `__custom__` 選択 + input に値を復元。chip 切替 / マニア OFF / ラジオ切替で input も hide + clear
- **検索 UI は別タスク**: ユスケ確認で「実機運用してから N=1 で設計」。データだけは v351 時点で揃った状態にする

### 変更

- **HTML** ([noritetsu-map.html:1340](noritetsu-map.html#L1340), [noritetsu-map.html:1356-1361](noritetsu-map.html#L1356)):
  - `<span>📋 列車・車両形式も記録する <span>(マニア向け)</span></span>` → `<span>📋 列車・車両形式も記録する</span>`
  - `#rec-sl-vehicle-select` の直下に `<input id="rec-sl-vehicle-custom" type="text" oninput="onSlVehicleCustomInput()" placeholder="例: E235系1500番台、外部車両など" style="display:none">` を追加
  - 「データ未登録」案内文を「dropdown 末尾の『✏️ 別形式を入力』から自由記述できます」に書き換え
- **JS** ([js/07-record-mode.js](js/07-record-mode.js)):
  - `selectSlChip()` の dropdown 生成: vehicles 0 件でも常に `<option value="__custom__">✏️ 別形式を入力...</option>` を末尾追加。vehicles 1 件以上なら separator (`<option disabled>──────</option>`) も
  - dropdown 選択値復元ロジック: T.selectedCarModel が options に存在 → dropdown 選択、存在しない (自由入力済の値) → `__custom__` 選択 + custom input に値復元
  - `onSlVehicleChange()` 改修: value === '__custom__' → custom input show + focus + 既存値を input に移行 / その他 → custom input hide + clear + T.selectedCarModel = value
  - `onSlVehicleCustomInput()` (新, window 公開): input.value.trim() を T.selectedCarModel に保存 + 列車種別 (train_id/name/category) クリア
  - `isInDropdown(value, selectEl)` (内部 helper): options 配列で実車両 option を検索
  - `clearAllTrainSelections()` に custom input の hide + clear も追加
- **sw.js**: CACHE_VERSION 'v350' → 'v351'

### 検証 (Claude Preview)

mock データ (山手線: E235系0番台/1000番台 / 京浜東北線: データ無し) で:
- 山手線 chip active: options = `[(任意) / E235系1000 🆕 / E235系0番台 / ──────(disabled) / ✏️ 別形式を入力]` 末尾に option 配置
- 京浜東北線 chip (データ無し): options = `[(任意) / ✏️ 別形式を入力]` separator 無し + empty 案内表示
- `__custom__` 選択 → custom input display='block' + focus
- input に `キハ E130系500番台` 入力 → T.selectedCarModel = 'キハ E130系500番台'
- 山手線 chip に戻す → dropdown の value が `__custom__` のまま、input value 維持 (dropdown に無い値なので custom モード継続)
- 普通の `E235系0番台` を dropdown から選ぶ → custom hide + clear、T.selectedCarModel='E235系0番台'
- 特急ラジオ ON → custom hide + clear、T.selectedCarModel=null (`clearAllTrainSelections` 経由)

### 残課題

- 車両形式検索 UI (マイページ旅程タブに「🚆 車両形式」検索 input を追加、`t.car_model` substring 検索)。データは v351 で揃った、実機運用後に N=1 設計

---

## 200. v350 — 記録モーダル整理: 遅延入力を独立トグル化 + 普通/特急 ラジオで車両形式 UI を排他表示 (2026-05-26)

### 背景

v348 で「📋 列車・車両形式も記録する (マニア向け)」トグルを導入したが、ON にすると「区間→候補車両」(普通電車向け) と `<details>` 内の「特急/観光列車 cascade」が同時に展開され、ユーザーが「自分はどちらを使うのか」を直感で判断しにくかった。さらに「⏱ 遅延」入力 (h/m) は普段使わないユスケでも常時見えていてノイズだった。ユスケから「遅延入力も基本はしまっておいてトグルで開ける」「特急を選択したら普通車の車両は選べないようにする (ラジオボタン)」との要望。

### 設計判断

- **遅延入力は独立トグル**: マニアトグル (車両形式) と統合せず別トグル。「車両は記録したいが遅延は記録しない」コアユーザーのチョイスが分離可能なため。`norireco.prefs.showDelayInput` で localStorage 永続化、OFF 時は h/m の値もクリア (隠れた state を残さない)
- **ラジオ 2 選択「普通電車 / 特急・観光列車」、default 普通**: 記録の多数派は普通電車。`<details>` の summary 「📝 特急・観光列車など別の列車として記録」が「副次的な選択肢」ニュアンスだったのを、ラジオで「対等な 2 択」に格上げ
- **切替時は両方の選択を null クリア**: ラジオ切替は明示的なモード変更なので、「特急で選んだ列車を覚えて戻す」より「クリアして潔く」がユーザー予測と一致 ([js/07-record-mode.js](js/07-record-mode.js) の `clearAllTrainSelections()` + `resetTrainSelector()`)
- **`<details>` → `<div>` 化**: ラジオが排他制御の主体になるので `<details>` は不要。`#rec-train-cascade` という直感的な ID に変更

### 変更

- **HTML** ([noritetsu-map.html:1378-1402](noritetsu-map.html#L1378), [noritetsu-map.html:1341-1380](noritetsu-map.html#L1341)):
  - 「📝 メモ・遅延 (任意)」見出し → 「📝 メモ (任意)」に変更、`#rec-delay-toggle` チェックボックスと `#rec-delay-row` (デフォ `display:none`) を追加
  - `#rec-train-picker` 内に `<input type="radio" name="rec-train-mode">` 2 個 (`local` / `express`、default `local`) を追加
  - `<details>` を `<div id="rec-train-cascade">` に置換、`<summary>` 撤去
- **JS** ([js/07-record-mode.js:1088-1199](js/07-record-mode.js#L1088)):
  - `PREF_SHOW_DELAY_INPUT` / `PREF_REC_TRAIN_MODE` 定数追加
  - `initRecTrainToggle()`: モードラジオの localStorage 復元 + `applyRecTrainMode()` 呼出 + `initRecDelayToggle()` 内包
  - `onRecTrainToggle()`: ON 時に現在のモードに応じたレーンを populate / OFF 時に `clearAllTrainSelections()`
  - `onRecTrainModeChange()` (新): ラジオ切替 → localStorage 保存 + 両レーンの選択クリア + `resetTrainSelector()` で cascade DOM もリセット + `applyRecTrainMode(mode)` で表示切替 + local モードなら `populateSlVehiclePicker()`
  - `applyRecTrainMode(mode)` (新, internal): `#rec-sl-vehicle-block` と `#rec-train-cascade` の display を排他切替
  - `clearAllTrainSelections()` (新, internal): T の selectedCarModel / selectedTrainId / selectedTrainName / selectedTrainCategory を null + sl-vehicle-select.value=''
  - `initRecDelayToggle()` / `onRecDelayToggle()` (新): 遅延行の hide/show + localStorage + OFF 時 h/m 値クリア
- **sw.js**: CACHE_VERSION 'v348' → 'v350' (v349 は no deploy だったため番号スキップ)
- **STATUS.md**: 進行中フェーズ行を「v334〜v350」に拡張、v350 の内容を 1 文追記

### 検証 (Claude Preview)

DOM + 関数存在チェック:
- `#rec-delay-toggle` / `#rec-delay-row` (デフォ `display:none`) / `#rec-train-mode-local` / `#rec-train-mode-express` / `#rec-train-cascade` 全要素存在
- `window.onRecDelayToggle` / `window.onRecTrainModeChange` / `window.onRecTrainToggle` 関数公開済
- メモ見出しが「📝 メモ (任意)」に変わっている

挙動テスト:
- 遅延トグル ON → `display:flex` + LS='1' / OFF → `display:none` + LS='0' + h/m 値クリア (`'1'`/`'30'` 入力後 → `''`)
- マニアトグル ON → picker `display:block` + デフォルト `local` checked + sl-block `block` + cascade `none` + chip 2 個生成
- 特急ラジオ ON → sl-block `none` + cascade `block` + selectedCarModel null クリア + LS='express'
- 普通電車ラジオに戻す → sl-block `block` + cascade `none` + selectedTrainId/Name null クリア + LS='local'

スクリーンショット撮影で UI 視覚確認済 (chip 山手線 active gold + 京浜東北線 inactive / 「この系統の車両データはまだ未登録です」案内 / 「⏱ 遅延も記録する」トグル + h/m 入力欄表示)。

### 残課題

- v347 unmatch 17 件 + Notion DB 表記揺れクリーンアップ (車両形式 DB Phase 2)
- 車両形式 DB Phase 4: Notion §2.1 への記載

---

## 199. v349 (no deploy) — ドキュメント整理: CHANGELOG.md 5722 行 → 749 行に 4 アーカイブ分割 + Stop hook に行数チェック導入 (2026-05-26)

### 背景

v348 までで CHANGELOG.md が 5722 行に膨張。本ファイル冒頭の「目安 1500 行超で分割」ポリシーが守られていなかった (前回分割は 2026-05-20)。ユスケから「更新のたびに行数を確認する手順を加えたい」「CHANGELOG.md と STATUS.md を定期的に整理」との要望。

### 設計判断

- **実装場所: Stop hook + CLAUDE.md 両方**: hook で機械検知 (強制したいこと + 自動補助 = hook の判断軸) + CLAUDE.md にアーカイブ手順 (Claude が手で動く時の具体的やり方)。これは Notion §0「判断軸」の原則に沿う
- **閾値 1500 行**: 既存 CHANGELOG.md 本体に書かれていた目安を踏襲。過去アーカイブ (920/898/1900 行) とも整合
- **テーマで切る (バージョン番号でなく)**: 内容に即したテーマ名にすると後から「あの経緯どこ?」で探しやすい
- **CHANGELOG.md と STATUS.md は常にセット**で整理する: STATUS の領域別ステータス表は古い ✅ 完成行で膨らみがち。アーカイブ単位でマージ (1 アーカイブ = 表 1 行が原則) しないと CHANGELOG だけ整理しても二次情報が古いまま残る
- **アーカイブ自身にも 1500 行ポリシーを適用**: 当初は v226〜v289 を `share-r2.md` 1 ファイルに退避したが 3275 行で太かった (ユスケ指摘) → 同ターン内で share / photo / mypage の 3 ファイルに再分割。アーカイブも 1 テーマ ≈ 1500 行を目安にする

### 変更

- **CHANGELOG.md 分割** (5722 行 → 749 行 / 4 アーカイブ構成):
  - §75〜§98 (v226〜v249) → [`CHANGELOG_PHASE3.8-share.md`](CHANGELOG_PHASE3.8-share.md) 1578 行 (シェア MVP + 完乗率統合 + 系統色 + Cloudflare 移行 + 旅程編集 + ログアウトセキュリティ + LOD)
  - §99〜§126 (v250〜v278) → [`CHANGELOG_PHASE3.8-photo.md`](CHANGELOG_PHASE3.8-photo.md) 1354 行 (駅メモ本格化 + 駅アクションシート + R2/Workers + 写真添付フル機能 + Notion ドキュメント整理)
  - §127〜§137 (v279〜v289) → [`CHANGELOG_PHASE3.8-mypage.md`](CHANGELOG_PHASE3.8-mypage.md) 375 行 (マイページ即時反映 + 駅/路線アクションシート + 駅名検索 4 chip + memoMode 撤廃)
  - §138〜§183 (v290〜v333) → [`CHANGELOG_PHASE3.8-station-id.md`](CHANGELOG_PHASE3.8-station-id.md) 1867 行 (駅 ID 体系 Phase 1〜3 完結 + 駅クリック確実化 + 駅名+都道府県検索)
  - 本体は §184 (v334) 以降のみ残置
- **CHANGELOG.md 冒頭メタ更新**: 過去フェーズリンク追加、分割履歴に今回分追記、過去ログ参照早見表に新ファイル追加、分割ポリシーに「Stop hook が機械検知」「STATUS.md も同時整理」を明記
- **STATUS.md 整理** (135 行 → 97 行): 領域別ステータス表の Phase 3.8 サブフェーズ 47 行を 6 行 (early / modules / share / photo / mypage / station-id) + 進行中 1 行 (through-lines + 車両形式) にマージ、「直近のフェーズ」も冗長な v158〜v333 の長文ナラティブをアーカイブリンク付きの 1 行に圧縮
- **Stop hook** ([.claude/hooks/stop-reminder.js](.claude/hooks/stop-reminder.js)): CHANGELOG.md 行数チェックを追加 (1500 行超で `[stop-reminder] CHANGELOG.md が NNNN 行 (閾値 1500) — 完成したサブフェーズを CHANGELOG_PHASE*.md に退避し、STATUS.md も同時に整理して` を出力)
- **CLAUDE.md**: 「CHANGELOG.md 行数チェックとアーカイブ手順 (v349〜)」セクション新設。具体手順 5 ステップ (grep で境界取得 / テーマで区切る / アーカイブ冒頭ヘッダ / 本体メタ更新 / STATUS.md 同時整理) を明記

### 検証

- `node .claude/hooks/stop-reminder.js`: exit 0 / CHANGELOG.md 749 行なので警告は出ない (期待動作)
- 閾値 500 でシミュレーション: `[stop-reminder] CHANGELOG.md が NNN 行 (閾値 500) — ...` メッセージが正しく出ることを確認
- アーカイブ 4 ファイルの境界確認: share §98(v249)〜§75(v226) / photo §126(v278)〜§99(v250) / mypage §137(v289)〜§127(v279) / station-id §183(v333)〜§138(v290) / 本体 §199(v349)〜§184(v334) と切れ目正しく退避

### 残課題

- 次回 CHANGELOG.md が 1500 行を超えたら、テーマで区切って `CHANGELOG_PHASE3.8-vehicles.md` 等に退避 (Stop hook が自動でリマインドする)
- アーカイブ自身も 1500 行を超えそうな時は同様にテーマで分割する (今回 share.md が 1578 行で僅かに超えているが、これ以上テーマ分けにくいため許容)

---

## 198. v348 — 営業系統×車両形式 DB Phase 3: 記録モード UI (C' 案・マニアトグル + 区間→候補車両) (2026-05-25)

### 背景
v347 で `service_line_vehicles.json` (176 records → 197 SLs / 292 links) のデータ層が完成。これを記録モードの確認モーダルに繋いで「区間から現役車両形式を候補に出す」UI を実装する Phase 3。

設計討議でユスケから「素人で車両形式に興味ない人が記録時に負担がなくなるよう、車両形式なしのチェックボタンみたいなのがあると便利」との提案。これは 5大原則 ② 同心円ターゲティング (Lv0〜3 同時に満たす、コアは詳細・マニアモードに隠す) に直結する観察 → 当初の C 案 (常時表示) を **C' 案** に改訂: デフォは UI 自体を非表示、マニアトグル ON 時のみ展開。

### 設計判断
- **トグル 1 個で「列車種別」「車両形式」両方の任意項目を一括 hide/show**: 単に dropdown に「(任意)」と書くだけでは Lv0/1 に「埋めないとダメ？」の心理負荷が残る (フィードバックメモ参照 → 自動メモリに保存)
- **localStorage 永続化** (`norireco.prefs.showTrainSelector`): 一度 ON にしたコア層は次回開いた時も展開状態
- **新 UI (区間→候補車両) と既存 UI (カテゴリ→列車→車両形式) を排他**: 新 UI で選択時は `train_id` / `train_name` / `train_category` を null クリア (普通電車パターン: 系統だけ確定して列車種別は無関係)
- **既存 UI は `<details>` 内に格納** (「📝 特急・観光列車など別の列車として記録」): マニアレーンとして温存
- **chip の active 状態は gold 背景 + 黒文字**: 既存の系統色テーマと一貫

### 変更
- **新規 loader** ([js/02-data-loaders.js:243-269](js/02-data-loaders.js#L243)): `loadServiceLineVehicles()` で `service_line_vehicles.json` を読み、`NORIRECO.serviceLineVehicles.bySlId` に格納。06-map-leaflet.js の初期 Promise.all に追加
- **HTML 改修** ([noritetsu-map.html:1332-1372](noritetsu-map.html#L1332)): `#rec-train-picker` 全体を `display:none` + 上に `<input type="checkbox" id="rec-train-toggle">` トグル設置。中に新 `#rec-sl-chips` / `#rec-sl-vehicle-select` / `#rec-sl-vehicle-empty` 追加、既存 cascading は `<details>` 内へ
- **新規 JS 関数** ([js/07-record-mode.js](js/07-record-mode.js) 末尾):
  - `initRecTrainToggle()`: モーダル開く時に localStorage から復元 + populate
  - `onRecTrainToggle()` (window 公開): toggle 切替 → localStorage 保存 + populate or クリア
  - `populateSlVehiclePicker()`: `R.segments` から unique sl_id を chip 化、最初を active で dropdown 描画
  - `selectSlChip(slId)`: chip の active 切替 + dropdown 再生成 (現役主力/導入/導入予定 を先頭ソート、状態 tag `★新` `🆕` `(引退)` 等付与)
  - `onSlVehicleChange()` (window 公開): `T.selectedCarModel` セット + 列車種別フィールドを null クリア
- **openRecConfirm** に `initRecTrainToggle()` 呼出追加 ([js/07-record-mode.js:456](js/07-record-mode.js#L456))

### 動作検証 (Claude Preview)
- 山手線 + 京浜東北 2 区間 → chip 2 個、山手線 active、E235系0番台 候補表示 → 京浜東北 chip クリック → E233系 候補に切替 → E233系 選択 → `T.selectedCarModel = 'E233系'` / `T.selectedTrainId = null` 確認
- toggle OFF → picker `display:none` + 選択クリア + `localStorage='0'` 永続化 確認
- 候補ゼロ系統 (九州新幹線) → chip 表示 + dropdown 空 + 「データ未登録」案内表示 確認
- visit-only (segments 空) → 「区間情報がないため候補車両を表示できません」+ dropdown 隠す 確認

### ファイル
- 更新: [sw.js](sw.js) v347 → v348, [STATUS.md](STATUS.md), [TODO.md](TODO.md), [CHANGELOG.md](CHANGELOG.md)
- 更新: [js/02-data-loaders.js](js/02-data-loaders.js) +28 行 (loadServiceLineVehicles)
- 更新: [js/06-map-leaflet.js](js/06-map-leaflet.js) +1 行 (import + Promise.all)
- 更新: [js/07-record-mode.js](js/07-record-mode.js) +98 行 (UI 関数群)
- 更新: [noritetsu-map.html](noritetsu-map.html) `#rec-train-picker` 全面改修
- 新規: [.claude/launch.json](.claude/launch.json) (Claude Preview 用 python http.server 設定)

### 残課題 (Phase 2 へ)
- Notion DB の表記揺れ 17 件 (他社直通記述・「名阪特急」等) を実機で実際に乗ったときに不便かどうかで優先度判断
- 候補車両 dropdown の選択肢が多すぎる系統 (引退含む) で UI 改善 (将来)

### フィードバック反映
ユスケ提案「車両形式なしのチェックボタン」が実質本実装の出発点。自動メモリ [feedback_optional_field_visibility.md](C:\Users\yutsu\.claude\projects\C--Users-yutsu-Documents-GitHub-norireco\memory\feedback_optional_field_visibility.md) に「任意項目はトグルで UI ごと hide/show」原則として保存。

---

## 197. v347 — 営業系統×車両形式 DB Phase 1: Notion → JSON exporter + service_line_vehicles.json (2026-05-25)

### 背景
ユスケが Notion に「営業系統×車両形式 DB」(id `b4bed329…7da785`) を構築済。256 件、9 バッチ (JR 主要・関東・関西・JR 全社・JR 貨物・三セク・観光列車・地下鉄) で `車両形式` / `鉄道会社` / `営業系統` / `動向区分` 等のスキーマで蓄積。これを乗レコの記録モードで「営業系統 → 現役車両形式を候補に出す」UI のデータソースにするのが目的（TODO 🟡「普通電車の車両形式も記録できるように」の素材）。

### 設計判断
- **UI 方針**: C' 案 (ユスケ提案で改訂)。デフォは「列車・車両形式 UI を非表示」、マニアトグル ON 時のみ展開 + 区間 chip + 現役車両 dropdown。5大原則 ② 同心円ターゲティング (Lv0/1 心理負荷ゼロ・Lv2/3 詳細記録) に直結
- **データ紐付け**: Notion DB の `営業系統`(text) → SERVICE_LINES.id の機械マッチング。完璧でなくても「ほぼ正しい現役車両」が出れば UX 改善になる
- **エクスポート方式**: Claude セッション内で Notion 親ページに埋まっている JSON スナップショット (256 件) を抽出 → Node 機械マッチング → service_line_vehicles.json 生成。DB の DataSource を 1 件ずつ query するより簡潔
- **複数系統対応**: 1 record の `lines`(text) を `・、,` 分割 → 各トークンを SL に紐付け。1 vehicle が複数 SL に登場する
- **JR貨物 (15 件)**: 営業系統紐付け対象外 (機関車は自由運用) → `freight` 配列に分離

### マッチング戦略 (tools/export_service_line_vehicles.js)
1. **会社 alias dict** (`COMPANY_ALIAS`): DB「JR東日本」→ SL ["東日本旅客鉄道", "JR東日本"]、「東京メトロ」→ ["東京地下鉄"]、「都営地下鉄」→ ["東京都"]、「大阪メトロ」→ ["大阪市高速電気軌道"] 等 (混在する正式名称 ↔ 短縮形を吸収)
2. **路線 alias dict** (`LINE_ALIAS`): 「東上線」→「東上本線」、「アーバンパークライン」→「野田線」、「スカイツリーライン」→「伊勢崎線」、「成田スカイアクセス線」→「成田空港線」、「ブルーライン」→「横浜市営1号線/3号線」、「日比谷線」→「東京メトロ日比谷線/2号線日比谷線」等
3. **本線 ↔ 線 expander** (`nameVariants`): 「奥羽本線」⇔「奥羽線」、「中央西線」→「中央線/中央本線」(東西南北 + 線 パターン抽出)
4. **「本線」単独 special case**: token === "本線" なら候補 SL から `official_line === '本線'` (京急/京成/阪神等) もしくは `name.endsWith('本線')` (相鉄本線/京阪本線等) を返す
5. **新幹線 propagation**: 隣接 token が "新幹線" 終わりなら、suffix なし region token に「新幹線」を付与。「東北・北海道新幹線」→「東北新幹線・北海道新幹線」
6. **括弧内 expand**: `(信越・上越・白新・越後線等)` のように `・` を含む括弧内は別 token 群として抽出 (単純な括弧除去だと路線リストが消える)
7. **不明な regional 短縮**: 「東北」「山陽」等の地域名は false positive を生むため alias 化しない (DB 側で「東北本線」「東北新幹線」と明示する運用)

### 結果
- **matched: 176 records → 197 SLs (292 links)**
- カテゴリ別 unmatched: train_name_only 37 (列車名のみ = trains_master 領分)、no_line_match 17 (Phase 2 で alias 追加 or 他社直通対応)、generic_all_lines 11 (「各線」とだけ)、freight 15 (JR貨物)
- 非対象除外したマッチ率: 176 / (256 − 15 − 37 − 11) = **91.2%**
- 抜き打ち検証: 山手線 → E235系0番台、京浜東北 → E233系、京急本線 → 新1000形/2100形、京阪本線 → 8000系/13000系、相鉄本線 → 20000系/12000系/11000系 (東急/JR 直通車含む)、東北新幹線 → E5系/H5系/E2系、山形新幹線 → E8系/E3系2000番台/E723系5000番台 すべて正常

### バグ修正履歴 (途中)
- 初版: `js_text.encode().decode('unicode_escape')` で日本語 UTF-8 バイトが double-encoded → mojibake。`.replace('\\\\n','\\n')` 系の手動 unescape に修正
- 第 2 版: tokenizer で「(京葉・東海道・高崎宇都宮)」を先に `・` 分割してから括弧除去していたため `["京葉", "東海道", "高崎宇都宮)"]` のように orphan `)` が残った → 括弧除去を先に実行
- 第 3 版: 末尾正規化で「ライン」「エリア」も strip していたため「アーバンパークライン」→「アーバンパーク」になり alias 引けず → これらは strip 対象から外し、alias 側に「アーバンパークライン」を登録
- 第 4 版: 「東北」を alias で `["東北本線", "東北新幹線"]` と双方向マッピング → 本線↔線 expander で「東北線」が変換され、京浜東北・根岸線 (official_line="東北線") に E5系/H5系 が誤紐付け → 「東北」alias を撤回
- 第 5 版: tokenize 最終 filter で `norm !== '本線'` が「本線」を完全廃棄 → findMatchingSls の special case に到達せず → filter から「本線」除外を削除 (「線」のみ捨てる)

### ファイル
- 新規: [tools/export_service_line_vehicles.js](tools/export_service_line_vehicles.js) (Node, 285 行)
- 新規: [tools/_extract_snapshot.py](tools/_extract_snapshot.py) (Notion fetch 結果から JSON 抽出 helper)
- 新規: [tools/_notion_db_snapshot.json](tools/_notion_db_snapshot.json) (2026-05-25 時点 256 件、再生成可能だがリプロデュース用に commit)
- 新規: [tools/_dump_sl_names.py](tools/_dump_sl_names.py) (SL 構造調査用 helper)
- 新規: [service_line_vehicles.json](service_line_vehicles.json) (97 KB, by_sl_id 索引 + freight)
- 更新: [sw.js](sw.js) v346 → v347, STATIC_ASSETS に service_line_vehicles.json 追加

### 残課題 (Phase 2)
- no_line_match 17 件: 「東急東横線方面直通」(相鉄 → 他社線記述)、「名阪特急」「関空特急」(列車種別記述)、「電気式気動車(羽越・米坂・津軽・五能一部等)」(短縮形 alias 不足) 等
- 他社直通の正規表現: 「JR直通(埼京線)」のように lines 内で operator 切替されるケース
- Notion DB 側の表記揺れを直接修正する選択肢もある (e.g. `各線` を具体名に展開)

### 残課題 (Phase 3: UI)
- 記録確認モーダルに「📋 列車・車両形式も記録する (マニア向け)」トグル
- ON 時: 区間から候補系統を chip 表示 → 選択系統の現役車両 (動向区分 `現役主力`/`導入`/`導入予定`) を dropdown
- トグル状態を localStorage (`NORIRECO.prefs.showTrainSelector`) 永続化

### 運用フロー (Notion DB 更新時の再生成)
1. Claude セッションで Notion 親ページを fetch (`notion-fetch` id `36b71b458b6381109483d1f52108a618`)
2. `python tools/_extract_snapshot.py` で _notion_db_snapshot.json を再生成
3. `node tools/export_service_line_vehicles.js` で service_line_vehicles.json を再生成 + unmatch レポート確認
4. sw.js の CACHE_VERSION を上げて push

---

## 196. v346 — 「GPS に変換」ボタン (retroactivelyVerifyTrip) を撤去 (2026-05-25)

### 背景
v345 で「📍 GPSで認証」→「📍 GPS に変換」と文言変更したが、ユスケから「旅程 (複数駅) の GPS 変換ってどういう仕組み?」と指摘。実装を読み返すと:

- 仕様: 現在地が **出発駅 OR 終着駅** のどちらかと 500m 以内なら、旅程全体を `verified=true` に昇格
- 副作用: キャラ獲得チェック ([js/03-characters.js:170](js/03-characters.js#L170) `checkAndGrantCharacters`) は `verified` trip の **segments[].from/to / from_station_id / to_station_id すべて** をスキャンするため、中間駅にもキャラ自動付与が波及

つまり「東京→博多」の手動 trip を作って博多で GPS 変換すれば、東京駅含む中間全駅のキャラが取れてしまう loose な実装だった。旧方針 (証明) の下でもこの抜けは放置されていた。

### 設計判断
- 新方針「GPS = 手動の手間省略、世間への証明不要」(v345) に照らせば「GPS に変換」自体の意味付けが薄い
- キャラ獲得を `verified` 限定 (v345 Q1) で残す前提では、loose な変換は「実際に来た駅」セマンティクスを壊す
- → ボタン + 関数 (`retroactivelyVerifyTrip`) ごと撤去するのがクリーン
- GPS 記録は記録モードでのみ生成される (📍 → 「ここから記録開始」フロー)。手動 trip は手動のまま

### 変更
- **削除**: [js/13b-trips.js](js/13b-trips.js) の `retroactivelyVerifyTrip` 関数 (118 行) + `window.retroactivelyVerifyTrip` / `NORIRECO.mypage.retroactivelyVerifyTrip` bridge
- **import 撤去**: 13b-trips から `distMeters` / `runCharacterGrantCheck` (関数削除に伴い未使用化)
- **撤去**: [js/13-mypage-common.js:602-604](js/13-mypage-common.js#L602) の `verifyBtn` (「📍 GPS に変換」ボタン生成 + tripCardHtml 配置)
- **案内文**: 「マイページではあなたの旅程・GPS 完駅率・GPS 変換が使えます」→ 「GPS 変換」削除
- **CSS**: noritetsu-map.html の `.mp-act-btn.verify` (green) 削除
- **コメント**: 13b-trips.js ファイルヘッダから「GPS 後追い認証」記述削除、フィルタバー「認証」→「種類」、撤去メモ追記

### 残り
- Phase 3-c (v314) `findStCoord(id, nameFallback)` も道連れで撤去された。CHANGELOG §162 / STATUS の Phase 3-c 行は履歴として残置 (機能は消えたが当時の id 化作業の事実は残る)

---

## 195. v345 — GPS 記録の位置づけ変更 + 不正検知撤回 + バッジ中立化 (2026-05-25)

### 背景・方針転換 (重要)
従来「GPS 記録 (verified=true) = 認証済み = 世間に対して『この記録は正しい』と証明する手段」「手動記録 = 自己申告」という設計だった。これを以下のように変更する:

- **新方針**: GPS 記録 = **手動記録の煩わしい手間を省く便利機能**。世間への「証明」は不要。
- 結果として「不正検知 (速度チェック → suspicious 降格)」「🟡 要確認バッジ」「verified 限定シェアガード」「verified を守るための時刻ロック」など、証明を担保する周辺装置は全て不要になる。

### 設計判断
- verified 列は内部実装として残す (キャラ獲得が「実際に GPS で来た駅」を判定する目印、Phase 3-c 後追い認証、統計タブの GPS のみ完駅率カードで使用)。世間向けの「証明」表現だけ撤回。
- 不正検知 (`js/11-fraud-detection.js`) は完全削除 (CLAUDE.md「backwards-compatibility shims を残さない」に従い、スタブ化ではなくクリーン削除)。
- バッジは「📍 GPS」「📝 手動」の中立 2 値に統一。色は GPS=ブルー (情報的)、手動=シルバー (中立)。
- 旅程編集の「GPS 記録は時刻を編集できません (verified を守るため)」を撤回。自分の記録なので自分で直せるべき。
- キャラ獲得は引き続き verified 限定 (自分の達成感の担保として「実際に来た目印」は残す)。
- 「📍 GPSで認証」ボタンは「📍 GPS に変換」へ文言変更 (機能は維持: 手動 trip を半径 500m 以内の GPS で verified に昇格させる)。
- 垢BAN は保留 (発動条件から「不正検知連動」を撤回、スパム量・通報など別軸を将来検討)。
- シェアの verified 限定ガードは TODO から撤回。

### 変更ファイル
- **削除**: [js/11-fraud-detection.js](js/11-fraud-detection.js) (177 行、`fraudAssessTrip` / `fraudIsDowngraded` / 速度マップ・定数すべて)
- **削除参照**: [sw.js:31](sw.js#L31) / [scripts/syntax-check.js:43](scripts/syntax-check.js#L43) / [noritetsu-map.html:1599](noritetsu-map.html#L1599) (script tag)
- **import 撤去**: [js/07-record-mode.js](js/07-record-mode.js) / [js/09-tabs-stats.js](js/09-tabs-stats.js) / [js/13-mypage-common.js](js/13-mypage-common.js) / [js/13a-stats.js](js/13a-stats.js) / [js/13b-trips.js](js/13b-trips.js) の `import { ... } from './11-fraud-detection.js'` 全削除
- **fraud ブロック削除**: 07-record-mode.js の `fraudAssessTrip` 呼出 + `_elapsed_sec` ハンドリング + `elapsedSec` 変数 + 🟡 トースト 8 秒表示
- **バッジ中立化**: 13-mypage-common (tripCardHtml) / 09-tabs-stats (直近の旅程行) / 07-record-mode (確認モーダルバッジ + 保存ボタン) / 13a-stats (完駅率カード + buildAuthBreakdown + 説明文 + ⑨ 認証グラデーション内訳)
- **フィルタ option**: 13b-trips の「🛡 認証 (verified / manual / suspicious)」を「📋 種類 (GPS / 手動)」に
- **時刻ロック撤回**: 13b-trips の `isVerifiedGps` 分岐削除 (openTripEditModal + saveTripEdit 両方)、noritetsu-map.html の `trip-edit-time-lock` 案内文撤去
- **CSS**: noritetsu-map.html の `.mp-badge.suspicious` / `.mp-d-bar-seg.suspicious` 削除、`.mp-badge.verified` を green → blue に色変更
- **TODO.md**: シェア 「verified 限定ガード」削除、垢BAN 発動条件改、布石 #6 改、AI 自動列車判定の不正検知統合注記改、用語行に v345 注記追加
- **STATUS.md**: 領域別ステータスに v345 行追加、直近のフェーズ末尾に追記

### 関連
- v138 GPS 後追い認証 (CHANGELOG_PHASE3.8-early)
- v344 後追いバッジ GPS 限定化 (CHANGELOG §194)
- Notion §0.2 大方針 4「事業誘導も verified 認証中心に」「不正検知・認証グラデーションが骨格」 → セッション末手続きで Notion 更新が必要

### 残り
- Notion §0.2 大方針 4 の文言更新 (セッション末)
- Notion §2.8 自動記録・乗車検知設計の「verified」周辺記述見直し
- Notion §2.7 命名辞書に「verified の意味変更」エントリ追加 (意思決定ログ)

---

## 194. v344 — 「📝 後追い」バッジ + 「📌 記録」行を GPS 記録 (verified) 限定に (2026-05-25)

### 背景
旅程カードの `📝 後追い` バッジと `📌 記録: YYYY-MM-DD HH:MM` 行は、`recorded_at` と `date` が同日でない / または `date_precision = 'unknown'` のとき出していた (v181 由来)。当初 GPS 記録の「即時記録」を前提に「乗車日と記録日のズレ = 異例」のシグナルとして導入したが、手動記録はそもそも「あとから入力」がデフォルト (今日昼の乗車を夜にまとめて入力 / 過去の旅程を思い出して入力など) のため、手動記録カードのほぼ全てに後追いバッジが付いてしまい情報量がゼロ・むしろノイズになっていた。

### 設計判断
- `trip.verified === true` のとき (GPS 記録) のみ判定を走らせる
- GPS 記録で当日記録 → バッジなし (普通)
- GPS 記録で後追い認証 (`retroactivelyVerifyTrip` で半径 500m 内に来て verified=true に昇格) → 📝後追い + 📌 記録 (異例だと一目でわかる)
- 手動記録 → バッジも行も非表示

### 変更
- [js/13-mypage-common.js:549-573](js/13-mypage-common.js#L549): `if (trip.recorded_at)` を `if (trip.verified && trip.recorded_at)` に変更。`recordedAtStr` と `isAfterTheFact` を一括で GPS 記録だけに gating。`afterTheFactBadge` / `recordedAtLine` の生成式は変更なし (str / bool が空のまま渡るので自動的に出力されない)
- 旅程編集モーダル (v226 拡張) の「🕒 乗車時刻ロック」(GPS = ロック、手動 = フル編集) の仕分けと整合

### 関連
- v181 後追い記録モード拡張 (CHANGELOG_PHASE3.8-early)
- v226 旅程編集モーダル 5 セクション化 (CHANGELOG §75)

---

## 193. v343 — Phase D3: 第三セクター北陸・東北 + 福岡空港線 + 私鉄細支線 関東 (23 ペア / 46 ref) (2026-05-25)

### 背景

Phase D2 (v341) で名古屋エリアまで埋まり、残るのは第三セクター・地方都市地下鉄・私鉄支線。一気に Phase D3 として 23 ペアを追加。through_lines 持ち系統 112 → **142 / 642 (22.1%)**。

### 追加した 3 グループ / 23 ペア

| グループ | ペア | 内容 |
|---|---|---|
| G1 第三セクター北陸・東北 (7) | ハピライン↔IRいしかわ (大聖寺) / IRいしかわ↔あいの風 (倶利伽羅) / IRいしかわ↔JR七尾 (津幡) / あいの風↔トキめき日本海ひすい (市振) / トキめき妙高はねうま↔しなの鉄道北しなの (妙高高原) / しなの鉄道↔JR篠ノ井 (篠ノ井) / IGRいわて銀河↔青い森 (目時) | 旧 JR 北陸本線/信越本線/東北本線 を新幹線開業時に第三セクター転換した路線同士の越境運行 |
| G2 福岡 (1) | 福岡市営空港線↔JR筑肥線 | 姪浜で JR 筑肥線が福岡空港まで直通 |
| G3 私鉄細支線 関東 (15) | 京急本線↔久里浜/逗子/空港 (Phase B 漏れ補正) / 西武新宿↔拝島/国分寺/西武園 / 西武池袋↔狭山/西武秩父/豊島 / 小田急↔江ノ島/多摩 / 京王↔相模原/高尾 / 東武伊勢崎↔日光 / 東武日光↔鬼怒川 | 本線↔支線の社内直通、京急本線↔空港線は Phase B 時に意図的 skip したのを再評価して補正 |

### 変更

- **tools/add_phase_d3_through_lines.js**: 新規
- **service_lines_master.json**: 46 ref 追加
- **sw.js**: CACHE_VERSION v342 → v343

### 設計判断

- **京急本線↔空港線**: Phase B (v336) では「京急内会社内、本線↔浅草線経由で間接的に表現」と判断して skip したが、京急蒲田での実質直通 (エアポート急行・エアポート快特) を考えると書く方が筋。Phase B 漏れ補正として追加
- **第三セクター↔JR**: 「直通運転がある」関係に絞った。IRいしかわ↔JR七尾線 (津幡で IR 車両が JR 入線) / しなの鉄道↔JR篠ノ井線 (しなの鉄道車両が篠ノ井線経由で長野まで JR 入線) など、運用実態のあるものだけ
- **北陸新幹線↔第三セクター**: 接続するが直通運転は無い (新幹線/在来線で物理接続せず、乗換のみ)。through_lines は「直通運転」用なので skip
- **仙台/札幌市営地下鉄**: いずれも他社直通無し → skip。福岡だけ空港線が JR 筑肥線直通あり
- **東武野田線 (アーバンパークライン)**: 大宮・春日部・柏・船橋を結ぶが伊勢崎線とは接続のみで直通無し → skip
- **西武多摩湖線/多摩川線/山口線**: 多摩湖線は萩山で拝島線と接続するが新宿線とは直通せず、多摩川線/山口線は完全独立で skip

### 検証

- node tools/add_phase_d3_through_lines.js: 46 ref 追加, broken 0, unidi 0
- through_lines 持ち系統 112 → **142 / 642 (22.1%)**

### 残り (重要度低)

through_lines 設計上の主要な穴は概ね埋まった。残るのは:
- 関東: つくばエクスプレス (独立) / 多摩モノレール / りんかい線↔JR埼京以外
- 関西: 阪堺電気軌道 (路面、独立) / 京福電気鉄道嵐電 / 神戸新交通など
- 地方: 名古屋市営東山線↔リニモ (接続のみ、直通無し) / 仙台市内 / 札幌市内 / 広島電鉄 (路面)

これらは大半が「接続のみで直通無し」または「独立運営」のため、through_lines に書く価値は限定的。

---

## 192. v342 — s0/s1 セグメント分割路線の sibling 機構 (案 B 採用) (2026-05-25)

### 背景

国土地理院 N02 polyline 由来で同一運行路線が複数 ID に分割されているケース 10 路線あり:
- 大阪メトロ中央線 (s0/s1, 夢洲延伸)
- 大阪メトロニュートラム南港ポートタウン線 (s0/s1)
- 北大阪急行南北線 (s0/s1, 箕面延伸)
- 近鉄けいはんな線 (s0/s1, 大阪側/奈良側)
- 広島新交通1号線 (s0/s1)
- 神戸新交通 六甲アイランド線 (s0/s1)
- 神戸新交通 ポートアイランド線 (s0/s1)
- 富山地方鉄道 本線 (s0/s1)
- 富山地方鉄道 富山港線 (s0/s1)
- 福井鉄道 福武線 (s0/s1)

v337 時点では through_lines を主たる接続駅を含む s0 側のみに書いたため、ユーザーが s1 polyline をクリックしても直通先が表示されない問題があった。

### 設計判断 — 案 B (builder で sibling 機構)

3 案中、案 B を採用:
- 案 A (s1 にも冗長に through_lines を書く): データに重複、s0/s1 が同一路線という意味的情報なし
- **案 B (採用): builder で operator+name グルーピング → siblingIds → UI で merge** — データ無変更、ロジック追加だけで根本解決
- 案 C (スキーマ拡張 + データ統合): 重い、将来 LINES polyline 統合と一緒に検討

### 副作用チェック

`operator + name` で 2 系統以上が同じキーに入るグループを全件抽出した結果、**10 グループすべてが正当な s0/s1 分割** で、意図せぬ衝突 (例: 異なる路線が同 operator+name でグループ化される) はゼロ。`operator + name` を安全にグループキーとして使える。

### 変更

- **js/02b-service-lines-builder.js**: SERVICE_LINES 構築後に operator+name でグループ化、各 sl に `siblingIds: string[]` を追加 (同 operator+name 他系統の id 配列)
- **js/17-station-actions.js**: 路線アクションシートの「🔀 直通先」生成時、自系統の through_lines だけでなく sibling の through_lines も merge (自己参照 + 重複は除外)。これで s1 をクリックしても s0 側に書かれた直通先が表示される
- **sw.js**: CACHE_VERSION v341 → v342

### 期待される効果

例: ユーザーが 近鉄けいはんな線の **奈良側 (s1)** polyline をクリック → アクションシートに「🔀 直通先: 大阪メトロ中央線」が出る (これまでは s0 = 大阪側にしか書かれていなかったため何も出なかった)。

逆もしかり: 大阪メトロ中央線 _s1 (夢洲延伸) クリック → 「🔀 直通先: 近鉄けいはんな線」が出る。

### 検証

- syntax check 2/2 OK (02b-service-lines-builder.js / 17-station-actions.js)
- 副作用ゼロを実測 (10 グループ全部が正当な s0/s1 分割)
- 実機での UI 目視確認は v342 デプロイ後

### 残り

- 北陸新幹線↔IRいしかわ/あいの風とやま/ハピライン (第三セクター転換系)
- 仙台/福岡/札幌市営地下鉄
- 私鉄の細かい支線

s0/s1 統合改善ができたので、through_lines まわりの設計負債は概ね解消。

---

## 191. v341 — Phase D2: 名古屋エリア through_lines 19 ペア (38 ref) 追加 (2026-05-25)

### 背景

through_lines 持ち系統 84 / 642 (13.1%) で関東/関西の主要直通は揃ったが、名古屋エリアが空。名鉄相互直通網 (15 ペア) + 名古屋市営地下鉄↔名鉄 (3 ペア) + JR東海 武豊線直通 (1 ペア) の 19 ペアを一気に追加。

### 追加した 3 グループ / 19 ペア

| グループ | ペア | 接続駅 |
|---|---|---|
| G1 名鉄相互直通 (15) | 名古屋本線↔犬山/常滑/西尾/三河/豊川/津島/竹鼻, 犬山↔各務原/広見, 常滑↔空港/河和, 河和↔知多新, 西尾↔蒲郡, 津島↔尾西, 竹鼻↔羽島 | 枇杷島分岐/神宮前/新安城/知立/国府/須ヶ口/笠松/新鵜沼/犬山/常滑/太田川/富貴/吉良吉田/津島/江吉良 |
| G2 名古屋市営地下鉄↔名鉄 (3) | 鶴舞線↔犬山線 / 鶴舞線↔豊田線 / 上飯田線↔小牧線 | 上小田井/赤池/上飯田 |
| G3 JR東海 (1) | 武豊線↔東海道本線 | 大府 (直通快速・区間快速) |

これで名古屋エリアの主要直通が through_lines に揃った。名古屋本線が「名鉄ネットワークのハブ」として全 7 系統 (犬山/常滑/西尾/三河/豊川/津島/竹鼻) に直結する状態に。

### 変更

- **tools/add_nagoya_through_lines.js**: 新規 (3 グループ ID 定数化 + 冪等 + 双方向 + assert)
- **service_lines_master.json**: 38 ref 追加
- **sw.js**: CACHE_VERSION v340 → v341

### 設計判断

- **名鉄名古屋本線↔犬山線の接続駅**: 物理的な接続は枇杷島分岐だが、運行系統としては名鉄名古屋経由で全列車が直通するため備考に「枇杷島分岐(名鉄名古屋経由)」と書いた。実態を捉えた表現
- **名鉄空港線を独立直通扱い**: 常滑線の支線とも言えるが、常滑〜中部国際空港の独立 ID `auto_空港線_名古屋鉄道` があるので、京急空港線とは異なり接続を書く (中部国際空港アクセス特急の重要性)
- **JR中央本線 (名古屋〜中津川〜塩尻) と関西本線 (名古屋〜亀山)**: 名古屋駅で接続するが直通運転は無いため skip。中央本線は東日本/東海で別 ID なので接続するなら別 v で検討
- **愛知環状鉄道**: 一時期 JR中央本線と直通運転していたが、現在は別運営。接続するなら需要次第で別 v に
- **東部丘陵線 (リニモ)**: 名古屋市営東山線藤が丘で接続するが直通運転なし (リニモは磁気浮上式で他路線と物理接続不可)。skip

### 検証

- node tools/add_nagoya_through_lines.js: 38 ref 追加, broken 0, unidi 0
- through_lines 持ち系統 84 → **112 / 642 (17.4%)**

### 残り

- s0/s1 セグメント分割路線の統合改善 (中央線/けいはんな/北大阪急行) — スキーマ拡張案件で重い
- 北陸新幹線↔第三セクター転換系 (IRいしかわ/あいの風とやま/ハピライン)
- 仙台市営地下鉄、福岡市営地下鉄、札幌市営地下鉄等の中規模都市
- 私鉄の細かい支線

---

## 190. v340 — 山陽電鉄 through_lines 補完 (Phase C 漏れ 2 ペア) (2026-05-25)

### 背景

v337 Phase C で `grep '山陽電'` を line.name / official_line で検索したため、`auto_本線_山陽電気鉄道` (name='本線') と `auto_網干線_山陽電気鉄道` (name='網干線') が引っかからず、「山陽電鉄は service_lines_master に未追加」と誤判断。実際は両方とも既存で、through_lines 未設定の状態だった。今回 merged_stations から 49 駅が `auto_本線_山陽電気鉄道` に所属していることに気づき、漏れを補完。

### 追加した 2 ペア / 4 ref

| 元 | 先 | 接続駅 | 列車 |
|---|---|---|---|
| 山陽電鉄本線 | 阪神神戸高速線 | 西代 | 直通特急 山陽姫路〜阪神大阪梅田 |
| 山陽電鉄本線 | 山陽電鉄網干線 | 飾磨 | 社内 (本線/網干線) |

これで「Phase C 神戸高速線 3 社相互 (新開地)」(阪急/阪神/神鉄) に山陽電鉄本線が「阪神神戸高速線→阪神本線まで navigable」で接続される。新開地で乗り換える従来の経路よりも、直通特急 (西代経由) の実態を表現できる。

### 変更

- **tools/add_sanyo_dentetsu_through.js**: 新規 (冪等 + 双方向 + assert)
- **service_lines_master.json**: 4 ref 追加
- **sw.js**: CACHE_VERSION v339 → v340

### 教訓

「データが無い」と判断する前に、`operator` フィールドや merged_stations.stations[].lines でクロスチェックすべき。`grep '山陽電'` を line.name / official_line にだけ通すのは不十分 (auto_* 系統は name が `本線` 等の短縮名のことが多く、operator フィールドに会社名が入る)。今後の through_lines 追加スクリプトでは:
1. service_lines_master を operator/operator_id でフィルタ
2. merged_stations.stations[].lines に出現する line.id を逆引き
の 2 段階で確認する。

### 検証

- node tools/add_sanyo_dentetsu_through.js: 4 ref 追加, broken 0, unidi 0
- through_lines 持ち系統 82 → **84 / 642**

---

## 189. v339 — 山形/秋田 ミニ新幹線を独立系統として新設 + 東北新幹線と through_lines 接続 (2026-05-25)

### 背景

Phase A (v335) で「新幹線網の through_lines」を扱った時、山形・秋田新幹線はミニ新幹線で奥羽本線/田沢湖線の在来線軌道を走るため、service_lines_master に独立 ID が無く対象外とした。TODO で「v334 青梅線方式で `yamagata_shinkansen` / `akita_shinkansen` を新設」を予告していたものを完遂。

### 設計

採用案 B: **独立系統新設 (青梅線方式)**。実体としては在来線 (奥羽本線・田沢湖線) を改軌してミニ新幹線車両が走るが、ユーザー体験的に「つばさ/こまち乗車を奥羽線として記録」されるのは違和感。同じ駅が複数系統に所属する (`福島` が東北新幹線・奥羽線・山形新幹線の 3 系統など) が、完駅率は駅 id ベース (v293〜) なのでダブルカウントしない。

### 追加した 2 系統

| ID | 名前 | 区間 | 駅数 | 色 | 接続 |
|---|---|---|---|---|---|
| yamagata_shinkansen | 山形新幹線 (つばさ) | 福島〜新庄 | 11 | #B11283 (E3/E8系紫) | 東北新幹線 (福島で併結) |
| akita_shinkansen | 秋田新幹線 (こまち) | 盛岡〜秋田 | 6 | #BE0028 (E6系ルージュ) | 東北新幹線 (盛岡で併結) |

through_lines は双方向 (yamagata ↔ 東北 / akita ↔ 東北)。これで新幹線網は東海道↔山陽↔九州 + 東北↔北海道 + 東北↔山形/秋田 の全直通が出揃った。

### 変更

- **tools/add_mini_shinkansen.js**: 新規。冪等な新規系統追加 + 東北新幹線への双方向 ref 追加 + assert (broken refs 0, unidirectional refs 0)
- **service_lines_master.json**: 2 系統追加 (640 → 642)、through_lines 4 ref 追加 (双方向 2 ペア)
- **sw.js**: CACHE_VERSION v338 → v339

### 設計判断 — official_line の選び方

`02b-service-lines-builder.js` は SERVICE_LINES_MASTER の駅順から実座標を解決するとき、N02 LINES (lines-p?.json) の candidate を `officialMatch` (LINES.name.startsWith(official_line)) または `overlap >= 2` で紐づける。

- yamagata_shinkansen.official_line = `'奥羽線'` (LINES の name は「奥羽線」、当初「奥羽本線」と書いて修正)
- akita_shinkansen.official_line = `'田沢湖線'` (実体は田沢湖線 + 奥羽本線だが、田沢湖線で 5/6 駅 overlap、残りの「秋田」も奥羽線 candidate (overlap>=2 で自動採用) から座標解決される)

教訓: 新規手動キュレーション系統の `official_line` は **N02 LINES.name と完全一致するもの** にする必要がある。startsWith なので途中までは OK だが、`'奥羽本線'` のように LINES の name 'プレフィックス' でないものは hit しない。

### 検証

- node tools/add_mini_shinkansen.js: 2 系統追加 + 4 ref 追加, broken refs 0, unidirectional refs 0
- node tools/fix_bidirectional_through_lines.js: 片方向参照 0 件検出 (双方向化完璧)
- through_lines 持ち系統 80 → 82 (山形/秋田/東北新幹線 が +1 ずつ更新)

### 残り

- 名古屋エリア (名鉄/JR東海/名古屋市営)
- 北陸新幹線↔IRいしかわ/あいの風とやま/ハピライン (第三セクター転換系)
- s0/s1 セグメント分割路線の統合改善
- 山陽電鉄本線の service_lines_master 追加

---

## 188. v338 — through_lines 双方向化バグ修正 (v334 由来の片方向参照 8 件) (2026-05-25)

### バグ報告

ユスケが v337 verify 中に発見:
- 「JR京都線 → 琵琶湖線 へは飛べるが、琵琶湖線シートには直通先が出ず JR京都線 に戻れない」
- 「JR神戸線 → 山陽本線 も同じ症状」

### 原因

v334 で 6 つの broken refs を直したとき、参照元側 (`jr_kyoto_line.through_lines = [jr_kobe_line, jr_biwako_line]` 等) は正しく書いたが、**参照先側 (`jr_biwako_line.through_lines`) に逆方向 ref を追加していなかった**。同様に v334 で書いた `jr_ueno_tokyo_line` / `jr_shonan_shinjuku_line` も派生路線 (宇都宮/高崎/常磐中距離/横須賀) への片方向 ref のまま。

Phase A〜C (v335〜v337) の新規追加は `addRef(a,b)` + `addRef(b,a)` で常に双方向にしていたが、v334 由来の既存 ref は監査漏れ。

### 監査結果と修正

`tools/fix_bidirectional_through_lines.js` を新規作成。全 through_lines を走査して片方向参照を検出 → 自動修正。

検出された 8 件:
- jr_utsunomiya_line ← jr_ueno_tokyo_line
- jr_takasaki_line ← jr_ueno_tokyo_line
- jr_joban_medium ← jr_ueno_tokyo_line
- jr_utsunomiya_line ← jr_shonan_shinjuku_line
- jr_takasaki_line ← jr_shonan_shinjuku_line
- jr_yokosuka_line ← jr_shonan_shinjuku_line
- jr_biwako_line ← jr_kyoto_line (ユスケ報告)
- jr_sanyo_main ← jr_kobe_line (ユスケ報告)

修正後の `jr_utsunomiya_line.through_lines` = `[jr_ueno_tokyo_line, jr_shonan_shinjuku_line]` のように、宇都宮/高崎線は両ハブからの直通を持つ正しい状態に。

### スクリプトの assert

修正後に再監査して `unidirectional refs: 0` + `broken refs: 0` の両方を assert してから write。今後 v339 以降で新規追加した時の網羅監査ツールとしても使える。

### 変更

- **tools/fix_bidirectional_through_lines.js**: 新規 (汎用片方向参照検出 + 自動双方向化 + assert)
- **service_lines_master.json**: 8 ref 追加 (`updated_at: 2026-05-25`、640 系統のまま)
- **sw.js**: CACHE_VERSION v337 → v338

### 教訓

v334 で broken refs を直したとき「ref を書く」だけで満足し、「逆方向 ref も書く」ことを忘れていた。through_lines は本質的に **対称関係** (A が B に直通するなら B も A に直通する) なので、データ操作スクリプトは常に双方向で書くべきだった。Phase A〜C のスクリプトでは `addRef(a, b)` と `addRef(b, a)` を必ずペアで呼んでいたが、v334 のスクリプト (add_3_through_lines.js) では「broken ref の文字列を rename」する操作だったので双方向化のことが頭から抜けた。

今後の予防策: `fix_bidirectional_through_lines.js` を CI 的に through_lines 編集後に必ず通す運用にすれば、片方向参照は機械的に検出できる。

---

## 187. v337 — Phase C: 関西主要 27 直通ペア (54 ref) を through_lines に追加 (2026-05-25)

### 背景

v336 (Phase B 関東) に続き、関西の主要相互直通運転を一気にカバー。13 グループ計 27 ペア / 54 ref。through_lines 持ち系統は 46 → **80 / 640**。

### 追加した 13 グループ / 27 ペア

| グループ | ペア | 接続駅 |
|---|---|---|
| G1 阪急-堺筋-千里-嵐山 (4) | 阪急京都↔堺筋 / 阪急千里↔堺筋 / 阪急京都↔阪急千里 / 阪急京都↔阪急嵐山 | 天神橋筋六丁目/淡路/桂 |
| G2 阪急神戸-神戸高速 (1) | 阪急神戸↔阪急神戸高速 | 新開地 |
| G3 阪神なんば-近鉄 (2) | 阪神なんば↔近鉄奈良 / 阪神なんば↔阪神本線 | 大阪難波/尼崎 (奈良-神戸快速急行) |
| G4 阪神-神戸高速 (1) | 阪神本線↔阪神神戸高速 | 元町 |
| G5 神戸高速線 3 社相互 (3) | 阪急神戸高速↔阪神神戸高速 / 阪急神戸高速↔神鉄神戸高速 / 阪神神戸高速↔神鉄神戸高速 | 新開地 |
| G6 京阪内部 (4) | 京阪本線↔鴨東 / 京阪本線↔中之島 / 京阪本線↔交野 / 京阪本線↔宇治 | 三条出町柳/天満橋/枚方市/中書島 |
| G7 京阪京津-京都市営東西 (1) | 京阪京津↔京都市営東西 | 御陵 |
| G8 近鉄内部 (5) | 近鉄奈良↔難波 / 奈良↔京都 / 京都↔橿原 / 大阪↔難波 / 南大阪↔吉野 | 大阪上本町/大和西大寺/橿原神宮前 |
| G9 大阪メトロ中央-近鉄けいはんな (1) | 大阪メトロ中央_s0 ↔ 近鉄けいはんな_s0 | 長田 |
| G10 御堂筋-北大阪急行 (1) | 御堂筋 ↔ 北大阪急行_s0 | 江坂 |
| G11 環状-ゆめ咲 (1) | 大阪環状↔桜島 | 西九条 (USJ) |
| G12 関西空港 (2) | JR阪和↔JR関西空港 / 南海本線↔南海空港 | 日根野/泉佐野 (関空快速・はるか・ラピート) |
| G13 南海高野-泉北 (1) | 南海高野↔南海泉北 | 中百舌鳥 |

### 変更

- **tools/add_kansai_through_lines.js**: 新規
- **service_lines_master.json**: 54 ref 追加 (`updated_at: 2026-05-25`、640 系統のまま)
- **sw.js**: CACHE_VERSION v336 → v337

### 設計判断 — s0/s1 セグメント分割の扱い

国土地理院 N02 polyline 由来で、同一運行路線が複数 ID に分割されているケースが 3 路線ある:
- 大阪メトロ中央線: s0 (長田〜朝潮橋 12 駅) + s1 (大阪港〜夢洲 3 駅、夢洲延伸)
- 近鉄けいはんな線: s0 (新石切〜長田 4 駅、大阪側) + s1 (生駒〜学研奈良登美ヶ丘 4 駅、奈良側)
- 北大阪急行南北線: s0 (千里中央〜江坂 4 駅) + s1 (箕面船場阪大前〜箕面萱野 2 駅、2024 北方延伸)

through_lines は接続駅を含む s0 側にのみ書いた。s1 はデータ的に本線から離れた延伸/分岐セグメントで、接続駅 (長田 / 江坂 など) を含まないので意味的に書けない。ユーザーが s1 セグメントの polyline をクリックした場合は直通先が表示されないが、本来同じ路線なので s0 から navigable に辿れる。

将来的な改善案:
- (案 a) s0/s1 を統合する main_id をスキーマに追加し、through_lines を main_id 単位で扱う
- (案 b) s0/s1 両方に同じ through_lines を書く (重複データ管理が必要)
- (案 c) builder で operator + name でグルーピングして runtime に統合

### 検証

- node tools/add_kansai_through_lines.js: 54 ref 追加, broken refs 0, total 640
- JSON parse OK

### 残り (TODO)

- 山形/秋田ミニ新幹線の独立系統新設 + 東北新幹線への through_lines (青梅線方式)
- 北陸新幹線↔IRいしかわ/あいの風とやま/ハピライン (新幹線開業に伴い JR から第三セクター転換した路線同士の接続)
- 名古屋エリア (名鉄/JR東海/名古屋市営地下鉄など)
- 山陽電鉄本線が service_lines_master 未追加 (阪神/阪急直通特急のため追加価値あり)

through_lines 持ち系統 80 / 640 (12.5%) で主要都市圏は概ねカバー。残りは長距離路線・第三セクター転換系の補完が中心。

---

## 186. v336 — Phase B: 関東主要 26 直通ペア (52 ref) を through_lines に追加 (2026-05-25)

### 背景

v335 で新幹線 3 ペアまで完了。Phase B として関東の主要相互直通運転を一気にカバーする。9 グループ計 26 ペア / 52 ref。through_lines 持ち系統は 14 → **40 系統**に。

### 設計モデル

「直接接続している路線同士」のみ書く (v334 osaka_loop_line ↔ jr_yamatoji_line スタイル踏襲)。
副都心線 → 東横線 → みなとみらい線 のような 3 段直通は、副都心↔東横、東横↔みなとみらい の 2 ペアで表現し、副都心↔みなとみらい は書かない。ユーザーは路線アクションシートの「🔀 直通先」で 1 ホップずつ navigable に辿る。

### 追加した 9 グループ / 26 ペア

| グループ | ペア | 接続駅 / 列車 |
|---|---|---|
| G1 京急-浅草-京成-北総 (5) | 京急本線↔都営浅草線 / 浅草↔京成押上 / 押上↔京成本線 / 押上↔北総 / 京成本線↔成田空港線 | 泉岳寺/押上/青砥/京成高砂/京成成田 |
| G2 副都心線+東横+みなとみらい (4) | 副都心↔東横 / 東横↔みなとみらい / 副都心↔東上本線 / 副都心↔西武有楽町 | 渋谷/横浜/和光市/小竹向原 (F ライナー) |
| G3 有楽町線 (2) | 有楽町↔東上本線 / 有楽町↔西武有楽町 | 和光市/小竹向原 |
| G4 西武 (1) | 西武有楽町↔西武池袋 | 練馬 |
| G5 半蔵門線 (2) | 半蔵門↔田園都市 / 半蔵門↔伊勢崎 | 渋谷/押上 (スカイツリーライン) |
| G6 千代田線 (2) | 千代田↔小田原線 / 千代田↔常磐線各駅 | 代々木上原/綾瀬 |
| G7 東西線 (2) | 東西↔東葉高速 / 東西↔中央・総武緩行 | 西船橋/中野・西船橋 |
| G8 目黒-南北-三田-埼玉高速-相鉄 (6) | 目黒↔三田 / 目黒↔南北 / 南北↔埼玉高速 / 目黒↔東急新横浜 / 東急新横浜↔相鉄新横浜 / 相鉄新横浜↔相鉄本線 | 目黒/赤羽岩淵/日吉/新横浜/西谷 |
| G9 埼京-りんかい-川越 (2) | 埼京↔りんかい / 埼京↔川越 | 大崎/大宮 |

### 変更

- **tools/add_kanto_through_lines.js**: 新規。9 グループの ID を定数化、冪等な双方向追加、broken refs == 0 assert
- **service_lines_master.json**: 52 ref 追加 (`updated_at: 2026-05-25`、640 系統のまま)
- **sw.js**: CACHE_VERSION v335 → v336

### 設計判断

- **ハブ navigable vs 全直通記述**: 「ハブ navigable」 (1 ホップずつ辿る) を選択。理由は (1) v334 のスキーマと UI がそのモデル前提、(2) 「副都心↔みなとみらい」のような 2 ホップ先は実体としては東横線を経由する別物 (種別やダイヤが違う) なので、データ的にも 1 ホップ単位の方が正確
- **「同一会社内の支線・本線」を through_lines に入れるか**: 京成本線↔京成押上線 / 京成本線↔成田空港線 / 西武有楽町↔西武池袋 / 相鉄新横浜↔相鉄本線 は入れた。理由は接続駅で実際に直通列車が走り、ユーザーが知りたいのは「会社境界」より「直通の事実」だから
- **京急空港線↔京急本線**: あえて入れなかった。空港線は「都営浅草線への直通幹線」として独立し、京急本線↔浅草線 のペアで間接的に表現される。空港線↔本線 を追加すると京急内のホップが冗長になる
- **東急東横線↔東武東上本線 / 西武池袋線↔東武東上本線**: F ライナーは副都心線を介して直通するが、「直接接続している駅」が無いため books out (副都心↔東上、副都心↔東横 のホップで辿れる)

### 検証

- node tools/add_kanto_through_lines.js: 52 ref 追加, broken refs 0, total 640
- JSON parse OK

### 残り

- 関西相互直通 (阪急京都↔堺筋線、阪神なんば↔近鉄奈良、神戸高速線関連 ほか) — Phase C
- 山形/秋田ミニ新幹線の独立系統新設 — 別フェーズ (青梅線方式で新規系統作成が必要)

---

## 185. v335 — 新幹線 3 直通ペアを through_lines に追加 (双方向) (2026-05-25)

### 背景

v334 で through_lines は土台 (broken refs == 0, 路線アクションシート「🔀 直通先」UI 動作中) が整ったが、9 系統しか実データが入っていなかった。新幹線 9 系統はすべて `through_lines: []` のまま。事実関係が明らかで件数も少ない新幹線から手を付ける。

### 追加した 3 ペア (6 ref / 双方向)

| 元 | 先 | 経由駅 | 列車 |
|---|---|---|---|
| 東海道新幹線 | 山陽新幹線 | 新大阪 | のぞみ・ひかり・さくら・みずほ |
| 山陽新幹線 | 九州新幹線 | 博多 | さくら・みずほ |
| 東北新幹線 | 北海道新幹線 | 新青森 | はやぶさ |

各ペアは双方向に書き込み (path A→B / B→A 計 6 ref)。これで山陽新幹線は東海道・九州の両方を持つ「ハブ」になる。

### 対象外と理由

- **上越新幹線・北陸新幹線**: 大宮で東北新幹線と分岐線を共有するが直通運転は行わない (大宮〜東京は線路共有・列車運用は独立)。through_lines 候補外
- **西九州新幹線**: 武雄温泉での在来線リレー特急 (リレーかもめ) はあるが、新幹線同士の直通ではない。在来線リレーは表現困難なため対象外
- **山形新幹線 (つばさ) ・秋田新幹線 (こまち)**: 福島〜新庄 / 盛岡〜秋田 は奥羽線・田沢湖線の在来線軌道をミニ新幹線が走るのが実体で、service_lines_master には独立系統が存在しない (auto_奥羽線_東日本旅客鉄道 / auto_田沢湖線_東日本旅客鉄道 のみ)。v334 の青梅線方式 (手動キュレーション系統を新設) で `yamagata_shinkansen` / `akita_shinkansen` を作る別フェーズで対応する

### 変更

- **tools/add_shinkansen_through_lines.js**: 新規。冪等な双方向書き込み + broken refs == 0 を assert してから write
- **service_lines_master.json**: 3 ペア / 6 ref 追加 (`updated_at: 2026-05-25`、640 系統のまま)
- **sw.js**: CACHE_VERSION v334 → v335

JS 側は v334 で UI (17-station-actions.js の「🔀 直通先」ボタン) と runtime 伝播 (02b-service-lines-builder.js) を既に入れてあるので、データ追加だけで動く。

### 設計判断

- **ID 命名**: 新幹線系統は `auto_*` ID (`auto_東海道新幹線_東海旅客鉄道` 等) で長文字列だが、through_lines に直接書く。v334 で短い ID (`jr_biwako_line` 等) に直したのは「新規手動系統作成 + 旧 broken ref 解消」のセットだったケース。新幹線は既存手動系統が無いので、Phase A の範囲では auto_* をそのまま使う。将来「新幹線 1 系統化 (TODO 🟢 新幹線各系統の手動連結)」を実施する時に短い ID に移行できる
- **Phase 分割**: ユーザーに 4 択 (Phase A 新幹線のみ / A+B 関東私鉄 / A+山形秋田新設 / 全部) で確認 → Phase A のみを選択。小さい単位で push → 確認できる方が安全

### 検証

- node tools/add_shinkansen_through_lines.js: `through_lines broken refs: 0`, total 640
- JSON parse OK (Node がそのまま読めている)

---

## 184. v334 — through_lines (直通系統) を本格運用化: 3 系統追加 + broken refs 修正 + UI (2026-05-25)

### 背景

ユスケから「営業系統は ID 化されている？」と確認 → 系統そのもの・駅・operator は ID 化済 (`jr_yamanote_line` 形式 + `s_NNNNN`)。`through_lines` も既に line.id 形式で書かれていたが、**13 件の参照中 6 件が壊れていた**ことが判明。さらに `through_lines` を消費する JS は 0 件だったため、データ整備と簡易 UI を同時に入れる。

### broken refs の内訳

| 参照元 | 元 | 状態 |
|---|---|---|
| jr_kyoto_line | `biwako_line` | ID 表記揺れ → `jr_biwako_line` に修正 |
| jr_kobe_line | `sanyo_honsen` | ID 表記揺れ → `jr_sanyo_main` に修正 |
| jr_ueno_tokyo_line | `jr_joban_line` | 参照先 ID 不在 → `jr_joban_medium` (中距離) に修正 |
| jr_chuo_rapid | `jr_ome_line` | 手動キュレーション系統が未追加 → **新規追加** |
| osaka_loop_line | `jr_yamatoji_line` | 同上 → **新規追加** |
| osaka_loop_line | `jr_hanwa_line` | 同上 → **新規追加** |

### 新規追加した 3 手動キュレーション系統

すべて auto_* 系統 (N02 由来) を駅順データとして流用、色は JR ラインカラー準拠。

- **jr_ome_line** (青梅線, 立川〜奥多摩, 25 駅, `#F15A22` 中央線同色) — `through_lines: ["jr_chuo_rapid"]` で双方向化
- **jr_yamatoji_line** (大和路線, JR難波〜加茂, 22 駅, `#58B947`) — `through_lines: ["osaka_loop_line"]`
- **jr_hanwa_line** (阪和線, 天王寺〜和歌山, 35 駅, `#EA5520`) — `through_lines: ["osaka_loop_line"]`

合計 637 → **640 系統**。

### 変更

- **service_lines_master.json**: 3 系統追加 + 表記揺れ 3 件修正 (`updated_at: 2026-05-25`)
- **tools/add_3_through_lines.js**: 新規。冪等な追加 + 表記揺れ修正 + 整合性チェック (broken refs == 0 を assert してから write)
- **js/02b-service-lines-builder.js**: runtime SERVICE_LINES オブジェクトに `through_lines` を伝播 (今までは捨てていた)
- **js/17-station-actions.js**: 路線アクションシートに「🔀 直通先: ●系統名」ボタンを追加。クリックで直通先の路線シートに再オープン (双方向 navigable)。色は 10px の丸スウォッチで先頭表示
- **sw.js**: CACHE_VERSION v333 → v334

### 設計判断

- **broken refs 修正 vs 新規系統追加**: ユーザーに 3 択 (表記揺れ修正のみ / auto_* を暫定参照 / 手動系統追加) で確認 → 「手動系統追加」を選択。auto_* 参照は将来同 ID 重複が発生して再差し替えが必要なので、根本対応を選んだ
- **runtime through_lines を伝播するか**: 系統オブジェクトに 1 行 (`through_lines: sl.through_lines || []`) 増やすだけなので、UI 側で master を再読込せずに済む方を選択
- **UI 配置**: 路線アクションシートに「直通先」セクションを置くのが自然 (📸メモ・🎨色変更と同列の操作)。深い navigation 階層は作らず、直通先の路線シートを開き直すだけのシンプルな遷移にした

### 検証

- node tools/add_3_through_lines.js: `through_lines broken refs: 0` を確認
- syntax check: 02b-service-lines-builder.js / 17-station-actions.js OK

