# 乗レコ - 電車旅 更新履歴詳細

各セッションごとの実装ログ・経緯・失敗教訓を時系列で残す詳細メモ。

> ドキュメント役割分担は Notion §0「ドキュメント役割分担」が真実の源（v276 で Notion に集約）。本ファイルは変更履歴詳細を扱う。
> 過去フェーズは [`CHANGELOG_PHASE1-3.7.md`](CHANGELOG_PHASE1-3.7.md) / [`CHANGELOG_PHASE3.8-early.md`](CHANGELOG_PHASE3.8-early.md) / [`CHANGELOG_PHASE3.8-modules.md`](CHANGELOG_PHASE3.8-modules.md) / [`CHANGELOG_PHASE3.8-share.md`](CHANGELOG_PHASE3.8-share.md) / [`CHANGELOG_PHASE3.8-photo.md`](CHANGELOG_PHASE3.8-photo.md) / [`CHANGELOG_PHASE3.8-mypage.md`](CHANGELOG_PHASE3.8-mypage.md) / [`CHANGELOG_PHASE3.8-station-id.md`](CHANGELOG_PHASE3.8-station-id.md) / [`CHANGELOG_PHASE3.8-vehicles.md`](CHANGELOG_PHASE3.8-vehicles.md) にアーカイブ。

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

---

## 226. v376 — v375 hotfix: `window.populateSlVehiclePicker` 未公開 (2026-05-27)

### 背景

v375 で `02-data-loaders.js` の `onTrainCategoryChange` から `window.populateSlVehiclePicker()` を呼ぶように変えたが、07 側で `window.populateSlVehiclePicker = ...` を書き忘れた。結果、カテゴリ「観光列車」「特急」等を選んでも cascade dropdown が populate されず、ユーザーが chip を再クリックするまで列車 dropdown が出ない (chip クリック経由の `selectSlChip` で populate される)。

ユスケから「特急を選択すぐには次のカスケードはでない / 五日市線をクリックすると次のカスケードが出る」と現象報告。

### 変更

- `js/07-record-mode.js:1705`: `window.populateSlVehiclePicker = populateSlVehiclePicker;` を追加

### 教訓

- 02→07 の循環 import を避けて window 経由で関数を渡す設計は維持しているが、「window. に exposed すべき関数を書き忘れる」事故が起きやすい
- 動作確認できない (preview の ES module キャッシュ問題) と、こういう「呼ばれてるはずだが function が undefined」型のバグが本番に出る。今後 `window.xxx` 公開漏れを Stop hook で機械チェックする案を検討する価値あり (TODO 候補)

---

## 225. v375 — 記録モード「区間 → カスケード」順に再編 + 完全 per-segment 化 (2026-05-27)

### 背景

v374 で特急時も SL chip + cascade を併存表示にしたが、ユスケから「順番を変えたほうがいいね、まずは区間を選んでから、車両形式のカスケード選択だね」+ 「区間ごとに完全独立 (列車種別も per-segment)」との指示。

### 設計判断

- **HTML 構造を再編**: 区間 chip ラッパ `#rec-seg-chips-wrap` を picker 直下 (カテゴリ select の上) に移動。フローは「区間 chip → カテゴリ → カスケード or sl-block dropdown」
- **完全 per-segment 化**: segments[].train_category / train_id / train_name / car_model 全部 per-seg。`NORIRECO.trains` に `selectedTrainCategoryBySl` / `selectedTrainIdBySl` / `selectedTrainNameBySl` / `selectedCarModelBySl` の 4 Map を保持
- **applyRecTrainCategory は単純表示切替に**: v374 の併存表示を撤回し、v352 排他型に戻す。ただし「trip 全体に対する cat」ではなく「現在 active chip の cat」を表す
- **chip 切替時の restore**: `selectSlChip(slId)` 内で Map から catRestored / tidRestored / tnameRestored / cmRestored を取り出し、catSel.value 設定 + applyRecTrainCategory + cat 別に cascade or sl-block を populate + value 復元。`Map.cat` 未設定で catSel.value 既存値があれば Map にコピー (cat 先選択フロー対応)
- **populateSlVehiclePicker は activeChipSlId を維持**: 再描画時に勝手に slIds[0] へ戻らないよう、既存 active があれば維持
- **`#rec-seg-chips-wrap` は segments ≥ 2 のときだけ表示**: 1 区間や visit-only では chip 不要、cascade が直接担当
- **各 handler に Map 同期書き込み**: `onTrainCategoryChange` / `onTrainChange` / `onTrainCustomInput` / `onCarModelChange` / `onCarModelCustomInput` でいずれも `T.selectedXxxBySl[activeChipSlId]` に書く。category 変更時は同じ chip の下位 train_id/name/car_model は矛盾するのでクリア
- **saveTrip の seg 構築**: `segments[i].train_category / train_id / train_name / car_model` を Map から埋める。Map に無いときは `T.selectedXxx` (trip 単位最後値) を fallback
- **trip 直下の集約**: car_model と同形 — 全 seg 一致なら値 / 不一致なら null。visit-only は `T.selectedXxx` (旧仕様)
- **clearAllTrainSelections**: 4 Map + activeChipSlId 全クリア

### 変更

- `noritetsu-map.html`:
  - 旧 `#rec-sl-chips` を picker 直下の `#rec-seg-chips-wrap` 内に切り出し、見出し「🚉 区間を選ぶ (区間ごとに列車・車両を記録できます)」を追加
  - `#rec-sl-vehicle-block` 内の chips 要素は削除
- `js/02-data-loaders.js`:
  - `NORIRECO.trains` に 4 Map (`selectedTrainCategoryBySl` / `selectedTrainIdBySl` / `selectedTrainNameBySl` / `selectedCarModelBySl`) + `activeChipSlId` を初期化
  - `onTrainCategoryChange`: applyRecTrainCategory + populateSlVehiclePicker を呼んで終わる (cascade populate は selectSlChip 任せ)。Map.cat 書き込み + train_id/name/car_model クリア
  - `onTrainChange` / `onTrainCustomInput` / `onCarModelChange` / `onCarModelCustomInput`: 各々 Map に同期書き込み
- `js/07-record-mode.js`:
  - `applyRecTrainCategory`: 排他型 (v352) に戻す
  - `selectSlChip`: Map から restore + cascade populate + value 復元、cat='local' なら fallthrough して sl-block dropdown 再生成
  - `populateSlVehiclePicker`: chip-wrap の segments ≥ 2 表示制御、active chip 維持
  - `initRecTrainToggle` / `onRecTrainToggle`: トグル ON 時に populateSlVehiclePicker を呼ぶ
  - `clearAllTrainSelections`: 4 Map 全クリア
  - saveTrip: tripSegments push 時に train_category / train_id / train_name / car_model を Map から埋める、trip 直下も per-seg 集約

### 残課題

- 編集モーダル (`openTripEditModal`) も同じ per-seg cascade に対応する必要 (現状 car_model のみ per-seg、train_category/train_id/train_name は trip 単位)
- 旅程カード表示 (`tripCardHtml`) で `segments[].train_name` 不一致時の joining 表示 (例: `🚆 あずさ / 中央線特急`)
- マイページ「🚆 車両」「📋 種類」フィルタの segments 走査対応 (種類フィルタは v371 で car_model だけ対応済、train_category は trip 直下のみ)
- 列車 dropdown populate / car_model dropdown populate のロジックが 02 (onTrainCategoryChange / onTrainChange) と 07 (selectSlChip restore) で重複。共通関数 `populateTrainDropdown(cat)` / `populateCarModelDropdown(trainId)` を window 経由で公開して 07 から呼ぶ方が DRY

### 教訓

- 「trip 単位 state を per-segment 化」は state 数 N 倍 + UI 表示制御 + DOM populate / restore で実装規模が大きい。同心円ターゲティングのコア層機能なので投資価値はあるが、慎重に
- 「初回 chip 描画時の cat 引き継ぎ」(`Map.cat` 未設定で catSel.value 既存値があれば Map にコピー) は地味だが重要。「ユーザーが catSel を先に触っていた」フローを壊さない
- DOM populate ロジックの重複 (02 / 07) は当座目をつぶる。将来のリファクタで共通化

---

## 224. v374 — 記録モード「特急選択時も系統別車両形式」対応 + state 分離 (2026-05-27)

### 背景

v371 の「系統別車両形式」実装後、ユスケから「普通を選ぶとそれぞれで選べるけど、特急を選ぶと一つしか選べない」との指摘。

原因は v352 で導入した「列車種別 cascade と SL chip 排他表示」設計。普通電車 (`cat='local'`) のとき SL chip 表示、特急など (`cat='shinkansen'` etc) のとき cascade 表示、と完全に分けていたため、特急選択時は SL chip が出ず系統別選択できなかった。

### 設計判断

- **排他撤回 → 併存**: `applyRecTrainCategory()` で「指定しない以外」は SL chip + cascade 両方を表示。特急で列車 (あずさ) を選びつつ、系統別に車両形式 (E353 / E257 等) を選べる
- **state 分離**: 元 v371 では `T.selectedCarModel` を SL chip dropdown と cascade で共有してしまっていた。これが衝突の原因:
  - cascade で E353 を選ぶ → `T.selectedCarModel = 'E353系'`
  - SL chip B に切替 → `selectedCarModelBySl[A] = T.selectedCarModel = 'E353系'` (cascade 値が SL Map に紛れ込む)
- v374 で完全分離:
  - `T.selectedCarModel`: cascade (列車種別 + 車両形式) 専用、trip 全体の代表
  - `T.selectedCarModelBySl`: SL chip 経由のみ、per-segment 個別指定
  - SL chip dropdown 操作 (`onSlVehicleChange` / `onSlVehicleCustomInput`) は DOM value 経由で Map 同期、`T.selectedCarModel` には書かない
  - `selectSlChip` 切替時の save / restore も DOM (`#rec-sl-vehicle-select.value`) 一次情報、`T.selectedCarModel` 参照しない
- **saveTrip 集約ルール強化**: `seg.car_model = Map[lineId] || T.selectedCarModel || null` の fallback で「cascade で E353 を選んだだけ」のときも全 segment に E353 が入る。trip.car_model 集約は v371 と同様だが「全 null かつ cascade 値あり」のときも cascade 値を採用
- **クリアロジック撤廃**: 旧 `onSlVehicleChange` の「車両を選んだら列車種別をクリア (普通電車パターン)」は cascade 併存設計と矛盾するので削除

### 変更

- `js/07-record-mode.js`:
  - `applyRecTrainCategory()`: `else if (cat)` ブロックで `slBlock.style.display = 'block'` + `populateSlVehiclePicker()` 呼び出しを追加
  - `selectSlChip()`: 切替 save / restore を `#rec-sl-vehicle-select.value` 経由に変更、`T.selectedCarModel` 参照削除
  - `onSlVehicleChange()` / `onSlVehicleCustomInput()`: `T.selectedCarModel` を更新せず Map のみ更新、クリアロジック削除
  - `saveTrip` 内 save 直前同期: DOM value から Map に書く方式に
  - `saveTrip` 内 `segCarModel`: `Map[lineId] || T.selectedCarModel || null` で cascade fallback
  - `saveTrip` 内 `trip.car_model` 集約: 全 null のとき cascade 値 fallback

### 教訓

- **state 共有は衝突の元**。元 v371 で「SL chip dropdown と cascade dropdown は別 DOM だが同じ `T.selectedCarModel` を読み書きしていた」のは設計ミス。今回完全分離
- 「排他 UI で同じ state を共有」は OK だが、「併存 UI で同じ state を共有」は破綻する。UI モード変更 (排他 → 併存) のときは state も見直すべき
- DOM 一次情報の原則: ユーザーが触る dropdown の値は DOM (`element.value`) が真。JS の state はそのキャッシュ。dropdown 同士が複数あって state を共有すると、どちらが「真」か曖昧になる。今回は SL chip dropdown は DOM 一次、cascade dropdown は state 一次、と分けた

---

## 223. v373 — 旅程編集モーダルも per-segment 車両形式編集に対応 (2026-05-27)

### 背景

v371 で記録モードの系統別車両形式に対応したが、マイページ旅程編集モーダル (`openTripEditModal`) は依然として trip 単位の `car_model` input 1 つだけだった。乗換ありの旅程を編集すると trip.car_model が上書きされ、v371 で保存した `segments[].car_model` との整合が崩れる潜在的問題があった (v371 STATUS で「将来課題 (Step 2)」と明記済)。

ユスケから「こちらの編集画面も乗換対応に修正しましょう」との指示。

### 設計判断

- **per-segment 入力に集約**: segments がある旅程では各区間行に「🚆 車両形式」input を追加し、これを一次入力に。trip 単位の `#trip-edit-car-model` input は hide。記録モード v371 と思想を統一
- **trip.car_model の集約**: v371 と同じく「全 segment 一致なら値 / 不一致なら null」で再計算。マイページ「🚆 車両」フィルタは v371 ですでに segments 走査対応済なので破綻なし
- **visit-only / segments 空のケース**: 従来通り trip 単位 input を使う。区別は `existingSegs.length > 0 && segCarInputs.length === existingSegs.length` で安全判定
- **dropdown 候補ピッカーは見送り**: 記録モード v347 の dropdown + 自由入力 UX は採用せず自由入力のみ。実装が重い + 編集モーダルは「後から微修正」用途が主なので自由入力で十分。要望次第で Step 2b
- **列車種別 (train_id/train_name/train_category) は trip 単位のまま**: 新規記録モードでも trip 単位なので整合的

### 変更

- `js/13b-trips.js`:
  - `openTripEditModal`: 区間表示部 (`#trip-edit-segments`) の innerHTML を改修、各行に `<input class="te-seg-car" data-seg-idx="${i}">` を生成。`_hasSegmentsForEdit` フラグで segments 有無を判定し、true のとき trip 単位 car_model input + 弟の説明 div を hide
  - `saveTripEdit`: `document.querySelectorAll('#trip-edit-segments .te-seg-car')` で各 input 読み込み、`existingSegs.length === segCarInputs.length` のとき newSegments を構築して `tripPatch.segments` / 集約 `tripPatch.car_model` をセット

### Supabase 連携

- `segments` は jsonb 列 (既存)。PATCH ペイロードに `segments` を含めると上書きされる
- v371 で新規記録時に segments[].car_model 入れてもエラー出なかったため、jsonb 列は新フィールド受け入れに問題なし

### 残課題

- 編集モーダルの per-seg input は自由入力のみ。記録モード相当の dropdown 候補ピッカー (service_line_vehicles.json から populate) は将来課題 (Step 2b)
- 列車種別 (train_id/train_name) の per-segment 対応は不要 (新規でも trip 単位)。要望出てから検討

### 教訓

- 「将来課題」を STATUS に明記しておくと、ユーザーから自然なタイミングで指示が来る。v371 STATUS で「残: 旅程編集モーダルでの per-segment 編集は将来課題」と書いておいたのが今回のトリガに

---

## 222. v372 — v371 hotfix: `const T` 二重宣言で画面真っ黒 (2026-05-27)

### 背景

v371 で `selectSlChip(slId)` 関数の冒頭に `const T = NORIRECO.trains` を追加したが、同関数内の 1689 行に既存の `const T = NORIRECO.trains` 宣言があり `SyntaxError: Identifier 'T' has already been declared` で初期化が止まり画面真っ黒に。ユスケから「表示されなくなったよ」+ DevTools console スクリーンショット報告。

### 変更

- `js/07-record-mode.js:1689`: 既存の `const T` 宣言を削除（冒頭宣言で統一）

### 教訓

- **`node --check js/file.js` は CommonJS として解釈するため関数内 `const` 重複を見逃す**。v371 push 前のチェックは exit 0 で通っていた。事後再現で `node --check --input-type=module < js/07-record-mode.js` を試したら期待通り SyntaxError を検出 (`Identifier 'T' has already been declared`)
- 当プロジェクトは `<script type="module">` の ESM。今後は **`node --check --input-type=module < <file>`** か、より厳格な linter (eslint / biome / tsc) を使うべき
- ES Modules では `const` 同一スコープ重複は即 SyntaxError → 初期化完全停止 → 画面真っ黒。ブラウザ側で確認できないと気付けない。preview の module キャッシュ問題で本セッションは UI 検証スキップしていたのが裏目に出た
- イディオム重複の事故: 既存関数の冒頭に変数を追加するときは、関数末尾まで grep して同名変数が無いか確認する。`const T = NORIRECO.trains` は複数関数で使われていた

### 追加対策候補 (TODO 化推奨)

- `node --check --input-type=module < <file>` を Stop hook か pre-push hook で全 ESM ファイルにかける
- もしくは eslint の `no-redeclare` ルールを最小構成で導入 (CI ではなくローカル check 用)

---

## 221. v371 — 記録モードに「系統別車両形式」対応 (2026-05-27)

### 背景

ユスケから「記録モードで乗換があるとき、それぞれの系統に対して車両形式を選べるようにしてほしい」との要望。現状 v347 (普通電車車両形式 MVP) の仕様では、乗換ありの旅程でも記録時の `T.selectedCarModel` が 1 つしか保持されず、最後に dropdown を触った系統の値だけが trip 全体の `car_model` として保存される設計だった。

「立川 (中央線 E233) → 八王子 (横浜線 E233) → 桜木町」のようなケースは E233 で揃うので問題ないが、「新宿 (あずさ E353) → 八王子 (横浜線 E233)」のように系統が変わる + 車両も変わるケースで、片方の車両情報が失われていた。

### 設計判断

- **state 拡張**: `NORIRECO.trains` に `selectedCarModelBySl: { sl_id: car_model_string }` Map と `activeChipSlId` (現在 active な区間 chip の sl_id) を追加。既存の `T.selectedCarModel` (単一値) は active chip の値として併走させ、UI 同期と既存 callsite (visit-only など) の後方互換を維持
- **UI 動線**: `selectSlChip()` 切替時、(1) 現在 chip の選択を Map に save → (2) 新 chip の値を Map から restore → (3) dropdown 再生成。`onSlVehicleChange()` / `onSlVehicleCustomInput()` は Map にも書き込み
- **データ書き込み**: `saveTrip()` 内 tripSegments push で `car_model: T.selectedCarModelBySl[seg.line.id] || null` を埋める。trip 直前に「active chip の最新値を Map に再 sync」する一行も追加 (chip 切替を経ないと Map に同期されないため)
- **trip.car_model の集約ルール**:
  - 全 segment が同じ非 null car_model → その値
  - 違う車両が混在 or 一部 null → null (segments[].car_model を一次情報として参照)
  - visit-only や segments 空 → 旧仕様で `T.selectedCarModel`
- **表示 (tripCardHtml)**: `trip.car_model` が無くても `segments[].car_model` から unique 値を joining (例: `🚆 [E353系 / 185系]`)。順序は segments 出現順 + unique
- **マイページ「🚆 車両」フィルタ**: trip.car_model だけでなく `segments[].car_model` も走査するように修正 (substring 検索、いずれか hit で OK)

### 変更

- `js/02-data-loaders.js:283`: `NORIRECO.trains` に `selectedCarModelBySl` / `activeChipSlId` 追加
- `js/07-record-mode.js`:
  - `clearAllTrainSelections()`: Map と activeChipSlId もクリア
  - `selectSlChip(slId)`: 切替前の値を Map に save → 新 chip の値を `T.selectedCarModel` に restore
  - `onSlVehicleChange()` / `onSlVehicleCustomInput()`: Map にも書き込み
  - `saveTrip()`: tripSegments push 時に `car_model: T.selectedCarModelBySl[lineId]`、trip.car_model は全 segment 一致なら値 / 不一致なら null
- `js/13-mypage-common.js:574`: `tripCardHtml()` で `carModelList` を `trip.car_model || segments[].car_model` から構築、joining 表示
- `js/13b-trips.js:292`: 「🚆 車両」フィルタを trip.car_model + segments[].car_model 両走査に

### 残課題 (将来)

- **旅程編集モーダル (`openTripEditModal`) の per-segment 編集**: 現状は `trip.car_model` 1 個編集の UI のまま。乗換ありの旅程を編集すると trip.car_model が上書きされ、segments[].car_model との整合が崩れる可能性。Step 2 で対応
- **Supabase スキーマ**: segments は JSON 列なのでスキーマ変更不要、既存 trip の `car_model` 列も残せて後方互換性あり

### 教訓

- 「1 つの state を多系統に拡張」する場合、最初から Map にしておくと拡張が楽。v347 で `selectedCarModel` 単一値スタートだったのは MVP として妥当だったが、乗換対応で必然的に Map 化する必要に
- chip 切替型 UI の state 同期: 「現在 active な ID」を別途追跡しないと、複数 dropdown の値を一意に保存できない。今回 `activeChipSlId` 追加で対応

---

## 220. v370 — 路線フィルタを `lineId × SERVICE_LINES` 逆引き方式に整理 (2026-05-27)

### 背景

v369 の路線フィルタで「東金」と入力したら 0 / 139 件になり、Claude は「`lineName` が null 主体だから事故」と即断して v370 を出した。**しかし実機検証 (京王線で動作) とユスケ確認の結果、東金線の旅程記録がそもそも無かっただけ** で、v369 のロジック自体は正しく動いていた。SERVICE_LINES の `id` (`s_京王線` のように日本語包含) と segments[].lineId が substring マッチしていたため。

つまり v370 は「事故修正」ではなく、たまたま正当化された **予防的リファクタ** だった。

### v370 の意義 (事後評価)

それでも v370 の方が筋は良い:
- `lineName` は記録時 null が主流 (`js/17-station-actions.js:485`, `js/16-memos.js:595` で `args.lineName || null`) なので、v369 の `lineName` 側 OR 条件は実質効いていなかった
- `lineId` を id 一次情報として `SERVICE_LINES.name` 逆引き経由でマッチするのは駅検索 v317 と同形パターン
- 旅程数 × segments 数の積で動く callback 内の文字列処理を、loop 前に Set 化することで O(L + N) になり性能も改善

### 設計判断

- 駅検索 v317 と同じパターン: filter loop の外で `SERVICE_LINES` を 1 回スキャンしてマッチする `lineId` Set を構築 → loop 内では `segments[].lineId` が Set に含まれるかだけ判定
- `candidateN02Ids` も Set に含める。SERVICE_LINES の `id` (`s_*`) と旧 N02 ID の両方が segments にあり得る (v330 関連)
- マッチ 0 件のときは `Set(['__nomatch__'])` を入れて all-false にする。`null` のままだと「フィルタ無効」と区別がつかない

### 変更

- `js/13b-trips.js:225` 付近: `_lnq` / `_lnMatchIds` を filter loop 前で構築
- `js/13b-trips.js:272` 付近: filter callback 内は `_lnMatchIds.has(s.lineId)` だけに簡略化

### 教訓

- **「ユーザー報告 = バグ」と即断しない**。「0 件」は単にデータが無いだけの可能性。Claude は v370 で「事故修正」と書いてしまったが、実際はデータ確認すれば「東金線記録ゼロ」が分かったはず
- 仮説検証の順番: (1) データの有無を `_mypageCache` から確認 → (2) ロジックの正誤を検証 → (3) 修正案を出す。今回は (1) をスキップして (3) に進んだ
- ただし v370 のリファクタ自体は筋が良く (id 一次情報 / Set 化 / O(L+N))、結果的に push したのは妥当だった。「事故」のラベルだけが誤り
- `lineName` が null 主体な事実は記録に値する。将来別の機能で `seg.lineName` を表示や検索に使う場合は逆引き必須

---

## 219. v369 — マイページ旅程タブに「🛤 路線」substring フィルタ追加 (2026-05-27)

### 背景

マイページ旅程タブには既に多種のフィルタ (期間/種類/種別/駅名/車両/範囲/並び) があったが、「路線で選択」する手段が無く、特定路線の旅程だけを見たいケースに対応できなかった。

### 設計判断

- **既存の `🚆 車両` (v357) フィルタと同形** で実装。input 1 個 + substring 検索、サジェストや select は使わず最小実装
- **マッチ対象は `segments[].lineName` と `segments[].lineId` の両方**。lineName は表示用日本語、lineId は内部 ID (`s_E27` 等) の両方で部分一致を許容
- **trip 直下に line 情報を持たない設計** (segments に集約) なので、segments 空の古い trip はフィルタ on のとき除外される。これは挙動として妥当 (路線情報を持たない trip は路線フィルタに該当しない)

### 変更

- `js/13-mypage-common.js:67`: state 初期値 `mpTripFilter.line: ''` 追加
- `js/13b-trips.js`:
  - フィルタバー HTML に `🛤 路線` input 行 (`#mp-fil-line`, placeholder 「例: 東金線 / 山手線」) 追加
  - `resetMpFilter()` の reset 対象に `line: ''` 追加
  - `applyTripFilters()` に segments 走査による substring 判定追加 (lineName / lineId をいずれも大文字小文字無視で照合)

### 検証

- ローカル preview の ES Modules HTTP キャッシュが頑固で動作確認は失敗（SW unregister + caches 全消 + URL クエリ変更でも module キャッシュが残る）。コード自体は `fetch` で v369 反映済を確認、ロジックは v357 `car_model` フィルタと同形のためデプロイ後に本番で実機確認
- 本番では SW が v368→v369 で新規 install されるため module キャッシュも刷新される

### 教訓

- preview の module キャッシュ問題は将来的にも繰り返し起きる。本番では SW バージョンバンプで解消されるため、ローカル確認できないことを理由に push を遅らせない判断は妥当だった。preview の制約は記録に留め、similarly fragile な実装 (state shape を変えるなど) のときは慎重に

---

## 218. v368 — 駅アクションシート「この駅を含む旅程 (タップで読み込み)」のカッコ書きを削除 (2026-05-27)

### 背景

ユスケから駅アクションシートの screenshot (福俵駅・東金線) と共に「タップで読み込みは不要」との指摘。v309 で「(マイページ未読込)」→「(タップで読み込み)」に変更してユーザーアクションを示唆する設計にしていたが、アクションシートはそもそも全アクションが「タップで実行」されるため、カッコ書きは冗長で UI ノイズになっていた。

### 変更

- `js/17-station-actions.js:151` のラベルを `この駅を含む旅程 (タップで読み込み)` → `この駅を含む旅程` に
- マイページ未開封 (tripsHere === null) ブランチのみ。マイページ開封済みブランチは元から `この駅を含む旅程一覧 / (なし)` で件数バッジ付きなので変更不要

### 検証

- 直接 preview で fetch して新ラベルが入り旧ラベルが消えたことを確認 (`hasNew: true, hasOld: false`)

### 教訓

- 「ユーザーアクションを示唆する補足文言」は、文脈で自明な場合は逆にノイズになる。アクションシート/ダイアログ等の「タップ前提」UI では「(タップで...)」「(クリックで...)」は冗長
- v309 の判断 (「(マイページ未読込)」→「(タップで読み込み)」) は当時は「データ未取得を伝える」意図だったが、ユーザーが押す動機としては「ここから旅程を見たい」で十分で、未読込状態の告知自体が冗長だった

---

## 217. v367 — 徒歩乗換グループ DB + 記録モード walk segment / walk fallback 候補 (2026-05-27)

### 背景

ユスケから「函館駅・函館駅前駅、西武秩父駅・御花畑駅、立川駅・立川北駅 など、歩いて乗換可能な駅をまとめておくと自動判定に使える」との指摘。merged_stations だけでは「同名駅マージ」止まりで、「別名・別駅扱いだが徒歩 200〜400m で連絡」のケースは別駅扱いになり、乗換候補抽出ロジックでも繋がらない。

例: 函館 (函館本線) → 松風町 (函館市電大森線) は 1 hop でも 2 hop でも 0 件 → 「経由駅を手動で追加してください」だった。実際は函館駅前 (市電) まで徒歩 230m で行けば 大森線で松風町に行ける。

### 設計判断

- **データ収集**: 自動抽出 + 細かい修正は後付けで (`walk_transfers_overrides.json` 機構)。手動キュレーションは初期 50 件くらいが必要だがメンテ負担が重い vs 自動抽出は誤検出を許容しつつ高網羅性
- **抽出条件**: 距離 < 400m AND 名前異なる AND 共通系統なし (= 同じ系統で繋がる駅は乗換扱いしない)。閾値は実例 (函館 230m / 西武秩父 267m / 立川 226m) 全部入る広めの 400m
- **transitive closure (Union-Find) でグループ化**: 立川↔立川北 + 立川↔立川南 → {立川, 立川北, 立川南} 1 グループに。利用側は「グループ内なら徒歩可」と判定するだけで済む
- **同名異所も別駅扱い**: 名前異なる条件があるので同名の高松・大宮等は今回は除外。本来「大宮 (関東)」と「大宮 (京都阪急)」も別駅だが同名なのでスキップされる (merged_stations 段階で別 id 付与済、同名異所問題は v293 で対応済)
- **walk segment は error にせず通過**: buildSegmentsFromSelection が連続 2 駅を walk pair と認識したら `{walk:true, walkM}` segment 化。pairLineChoices なし、saveMultiSegmentTrip でも `if (!seg.line) continue;` で自然に除外
- **walk fallback in findTransferCandidates**: lineB に直接乗っていない x について、x.id が属する walk グループ内の他駅を lineB から探して「walkPartner」として候補化
- **a 自身からの walk fallback 許可**: 旧コードは `x.name === a.name` で skip していたが、これだと「a で降りて徒歩 → b の系統」のケース (函館→松風町など) が拾えない。`i === aIdx && !walkPartner` のみ skip にした (walkPartner ありなら有効、a 自身を「降りる駅」として扱う)
- **挿入処理 (insertWalkTransfer)**: X = a の特殊ケースで Y だけ挿入、それ以外は X+Y 両方挿入。pairLineChoices シフト + lineA/lineB pre-select (walk pair の中間 pairIdx には line 設定なし)
- **手動修正 (walk_transfers_overrides.json)**: `add` (新規グループ追加 / 既存グループに駅追加) + `remove_pairs` (誤検出ペア除外) の 2 方向。任意ファイルで存在しなければ skip

### 変更

- [scripts/extract_walk_transfers.js](scripts/extract_walk_transfers.js) 新規: merged_stations.json 全 9030 駅から徒歩乗換ペアを抽出。グリッド分割 (0.005°) で総当りを 9030² → 2032 ペアに削減、Union-Find で transitive closure グループ化 → 243 グループ / 553 駅
- [walk_transfers.json](walk_transfers.json) 新規 (自動生成): 243 グループ、最大 max_walk_m=399m。主要例: 函館・函館駅前 / 立川・立川北・立川南 / 西武秩父・御花畑 / 大宮 (京都)・四条大宮 / 富山駅周辺 9 駅
- [js/02-data-loaders.js](js/02-data-loaders.js): `loadWalkTransfers()` 新規 export。`walk_transfers_overrides.json` の add/remove_pairs 処理 + `D.walkTransferIndex` (id → groupIdx) 構築。NORIRECO.data に `WALK_TRANSFERS` / `walkTransferIndex` を追加
- [js/06-map-leaflet.js](js/06-map-leaflet.js): boot Promise.all に `loadWalkTransfers()` 追加
- [js/07-record-mode.js](js/07-record-mode.js):
  - `_distMeters(a, b)`: 緯度経度から近似メートル
  - `_isWalkPair(a, b)`: 連続 2 駅が同じ walk グループに属するか判定
  - `_findWalkPartnerOnLine(stationId, lineB, anchor)`: lineB 上の同グループ駅を最近接 1 件返す
  - `buildSegmentsFromSelection`: walk pair を `{walk:true, walkM}` segment 化 (error 回避)
  - `refreshRecPanel`: walk segment 表示 (🚶 + 徒歩 Xm + 水色枠)、サマリに「徒歩乗換 N 回含む」追記
  - `findTransferCandidates`: walk fallback ロジック追加。lineB に x 直接乗ってないとき walk グループから別駅を Y として候補化、`walkPartner` フィールドで chip 用情報を保持。x = a でも walkPartner ありなら有効化
  - `insertWalkTransfer` 新規 + window 公開。X = a なら Y だけ挿入、それ以外は X+Y 両方挿入
  - chip render の `if (c.walkPartner)` 分岐で「🚶 X 〜 Y で乗換」+「徒歩 N m」バッジ表示
- [sw.js](sw.js): CACHE_VERSION v366 → v367、STATIC_ASSETS に walk_transfers.json 追加

### 検証

- 自動抽出: 「[乗レコ] 徒歩乗換 243 グループ (553 駅)」確認。函館・立川・西武秩父・大宮・名古屋すべて期待通り
- **walk pair 認識**: 函館 → 函館駅前 を選択 → 「🚶 函館 → 函館駅前 (徒歩 約228m)」walk segment、サマリ「合計 0駅 / 乗換 0回 (徒歩乗換 1回 含む)」、error にならない
- **walk fallback**: 函館 → 松風町 (函館本線駅 + 函館市電大森線駅、1 hop 0 件) → 「🚶 函館 〜 函館駅前 で乗換 徒歩 228m / 函館本線 → 🚶 → 大森線 ・ 合計 3駅」候補が 1 件出る
- **挿入**: 上記候補クリック → selection [函館, 函館駅前, 松風町] (X = a なので Y だけ挿入)、segments = walk + 大森線 (2駅) で正しく組まれた、pairChoices に pair[1] = 大森線 のみ pre-select (walk pair の pair[0] には line なし)

### 残課題

- 2 hop fallback には walk fallback を組み込まず: 1 hop で walk が出るケースは出るので実用上は問題ないはず。2 hop に組み込むと 4 種類のパスタイプ (X walk / Y walk / X+Y walk / neither walk) が増えてコード複雑化
- 同名異所 (高松・大宮等) は walk グループに入れていない: name 異なる条件 + merged_stations が同名異所を別 id で持つ (v293〜) ので、両駅は既に別駅扱いされている。徒歩乗換は別問題なので必要なら別途手動 override
- `walk_transfers_overrides.json` は今回コミット時点では存在しない (空でも問題なし、loader は fetch 失敗を warn だけにする)。手動修正したいケースが出てきたら追加する

---

## 216. v366 — 乗換候補: 直通系統「直通あり」バッジ + 2 hop fallback (2026-05-27)

### 背景

v365 で 1 hop 乗換候補を出すようにしたが、ユスケから 2 つフィードバック:
1. through_lines (直通系統) で繋がる乗換は「実質乗換不要」なのに「🔁 乗換」と表示されて誤解を招く (例: 立川での中央線快速→青梅線は青梅特快なら立川で降りずに直通)
2. 1 hop で繋がらないペア (函館 → 弘前など) は「経路が見つかりません」で詰まる。2 hop も提案してほしい

### 設計判断

- **直通系統判定**: SERVICE_LINES の `through_lines: string[]` を見て `lineA.through_lines.includes(lineB.id)` なら `isDirectThrough: true` フラグ。データは v334 以降に手動キュレーションで構築済 (642 系統中 142 が through_lines を持つ、対称性も担保 / `service_lines_master.json` 確認済)
- **直通あり優先ソート**: 1 hop 内で「直通あり」候補は totalStations が大きくても上位に。実生活の感覚に近い (立川直通 15 駅 > 八王子乗換 16 駅 のような順序が、本来「立川直通」が圧倒的に楽)
- **2 hop fallback**: 1 hop 候補ゼロのときだけ 2 hop を試す。1 hop が 1 件でもあれば 2 hop は表示しない (1 hop 1 件 < 2 hop 多数 だと UI が混乱、1 hop を選ぶインセンティブも消える)
- **2 hop top 3**: 1 hop 5 件と同じ密度だと縦に伸びすぎ。3 件に抑制
- **パフォーマンス**: 4 重ネストループ (linesA × stations × linesMid × stations × linesB) は浅い 〜400ms。最適化として駅→系統索引 `buildStationLineIndex` を初回構築・SERVICE_LINES 不変時はキャッシュ
- **2 hop は dedupe を (X, Y) ペア単位で**: 同じ (X, Y) 経路を異なる lineA/lineB 組合せが出すことが多いので、ペアキーで最良 (totalStations 最小) のみ採用
- **挿入処理は別関数**: `insertTwoTransferStations(pairIdx, x, y, laId, lmId, lbId)` — pairLineChoices を +2 シフト + 3 系統 pre-select

### 変更

- [js/07-record-mode.js](js/07-record-mode.js):
  - `buildStationLineIndex()` 新規: 駅 id (or `_n_<name>`) → Set<sl.id> 索引、SERVICE_LINES 配列が同一参照のあいだはキャッシュ
  - `_indexOnLine(line, target, targetId)` 抽出: id ベース + name fallback の駅 index 解決を関数化 (2 関数で共用)
  - `findTransferCandidates`: `isDirectThrough` フラグ追加、ソートを「直通優先 → totalStations 昇順」に。dedupe ロジックも「直通候補が同一駅に出たら non-direct より優先採用」
  - `find2HopTransferCandidates(a, b, maxResults=3)` 新規: A→X→Y→B の 3 線パスを探索。中間系統が linesB と同一なら 1 hop と等価なので skip (1 hop 側が拾うため)
  - `insertTwoTransferStations` 新規 + window 公開
  - `refreshRecPanel` の error 分岐: 1 hop chip の `isDirectThrough` 判定で「🚉 + 直通あり」バッジ表示、1 hop ゼロなら 2 hop fallback (「🔁🔁 X / Y で 2 回乗換」3 系統色付きドット + 合計駅数)
- [sw.js](sw.js): CACHE_VERSION v365 → v366

### 検証

- **直通あり判定**: 吉祥寺 → 拝島 で
  - 1 位: 🚉 立川 で乗換 直通あり (中央本線快速 → 青梅線) 15駅
  - 2 位: 🔁 八王子 で乗換 (中央本線快速 → 八高線) 16駅
  - 直通あり優先で正しくソート、totalStations は近いが直通候補が上に
- **2 hop fallback**: 函館 → 弘前 で
  - 1 hop ゼロ → 「💡 2 回乗換候補 (タップで 2 駅挿入)」見出し
  - 🔁🔁 新函館北斗 / 新青森 で 2 回乗換 (函館本線 → 北海道新幹線 → 奥羽線) 19駅
  - 計算 394ms (許容)
- **2 hop chip クリック**: 函館 → 新函館北斗 → 新青森 → 弘前 (4 駅 selection)、3 segments に分解、pairLineChoices に 3 系統 pre-select、合計 19駅 / 乗換 2回 表示で一致
- **3 hop 以上のケース** (札幌 → 鹿児島中央 / 富山 → 高知 / 岡山 → 旭川 等): 2 hop でもゼロ → 「2 回乗換でも繋がる経路が見つかりません。経由駅を手動で追加してください」フォールバック

### 残課題

- 3+ hop 探索は実装せず: BFS で全国ネットワーク全探索になり 1〜2 秒以上かかる可能性 + UI が複雑化 (3 駅同時挿入チップ?)。札幌 ↔ 鹿児島中央のような両端ケースだけなので手動 fallback で実用上問題ない
- through_lines 表示は「乗換駅 1 件」単位で出すので、上野東京ライン↔高崎線のように 6 駅重なるケースでも「直通あり」付きで複数候補が並ぶ。UI 上は重複に見えるが、ソートで一番駅数の少ない 1 件が trump で来るので実害はないはず

---

## 215. v365 — 記録モード: 別系統 2 駅選択時に乗換駅候補を自動提案 (2026-05-27)

### 背景

記録モードで A 駅 (例: 浅草) と B 駅 (例: 新宿) を選ぶと、両方を含む単一の営業系統が無い場合「⚠️ 共通する運行系統がありません(乗換可能な駅を間に追加してください)」と表示されるだけで行き止まりだった。ユーザーは自分で乗換駅を思い出して間にタップする必要があり、土地勘の無い地域では特に詰まる。1 hop で繋がる経路は機械的に列挙できるので、候補を chip で並べてタップ 1 つで挿入できるようにする。

### 設計判断

- **1 hop only (v1)**: 「a を含む系統 linesA × b を含む系統 linesB」を直交で見て、両方に乗る駅 x を抽出する素直な実装。Japan の都市鉄道網だと 95%+ のケースで 1 hop で繋がるはず (例: 札幌 ↔ 鹿児島中央 のような長距離だけ落ちる)。2 hop は UI が複雑化するので必要が出たら v2 で
- **駅一致は id ベース (v293 で付与した `sl.stations[].id`)**: 同名異所の高松 3 駅問題 / 同名異所の伊勢崎 (東武・JR) 等で「物理的には乗換できない同名駅」を候補から除外できる。id 無いケースは name fallback (極稀)
- **ソートは「総駅数」昇順**: a→x along lineA + x→b along lineB の合計駅数。rec-panel の「合計 N駅」表示と完全一致させるため、乗換駅は 2 系統ぶん重複カウント (重複除外で 1 計算後に表示と 1 駅ズレた → 即修正)
- **chip タップで自動 pre-select**: 挿入と同時に `R.pairLineChoices` に lineA/lineB を set。dropdown で上書きはできる。「ユーザーは新宿乗換を選んだ → 銀座線→中央線快速を勝手に決めるのは余計」とも考えたが、勝手に決めて「気に入らなければ dropdown で変更」のほうが圧倒的に手数少ない
- **dedupe (駅単位)**: 同じ x を複数の (lineA, lineB) ペアが指す (例: 新宿 = 山手線→中央線 / 山手線→丸ノ内線 / 山手線→小田急) ことが頻発するので、駅ごとに最良 (totalStations 最小) のみ採用
- **Top 5**: モバイル rec-panel (max-height:50vh) に収まる範囲。それ以上は情報過多

### 変更

- [js/07-record-mode.js](js/07-record-mode.js):
  - `findCommonServiceLines` 直下に新規 3 関数を追加:
    - `resolveSelectionStationId(st)` — R.selection の `{name, lat, lon}` から `MERGED_STATIONS` の駅 id を逆引き (1e-5 tolerance)
    - `findTransferCandidates(a, b, maxResults=5)` — 1 hop 乗換候補を totalStations 昇順で返す。id ベース判定 + name fallback、駅単位 dedupe
    - `insertTransferStation(pairIdx, name, lat, lon, lineAId, lineBId)` — R.selection に挿入 + 既存 pairLineChoices を +1 シフト + lineA/lineB を pre-select。window 公開 (chip onclick から呼ぶため)
  - `refreshRecPanel` の `seg.error` 分岐を全面置換: 旧「乗換可能な駅を間に追加してください」テキストを撤廃し、`findTransferCandidates` の結果を縦並びチップで提示。lineA・lineB の色付きドット + 系統名 + 合計駅数を 1 chip に集約
  - 候補ゼロのときは「1 回乗換で繋がる経路が見つかりません。経由駅を手動で追加してください」とガイダンス
- [sw.js](sw.js): CACHE_VERSION v363 → v365 (v364 は no-deploy だった)

### 検証

- 浅草 → 新宿 (1 hop で繋がる典型例) で候補が出るか preview_eval で確認:
  - 神田 (銀座線 → 中央本線快速) 11駅 ← 最短
  - 秋葉原 (常磐新線 → 中央・総武各駅停車) 13駅
  - 浅草橋 (都営浅草線 → 中央・総武各駅停車) 14駅
  - 上野 (銀座線 → 山手線) 17駅
  - 大門 (都営浅草線 → 都営大江戸線) 18駅
  - 5 件で総駅数昇順、現実的にも妥当な順序
- 神田 chip をクリック → R.selection に `['浅草', '神田', '新宿']` 挿入、segments が `銀座線 浅草→神田 (7駅)` + `中央本線快速 神田→新宿 (4駅)` に分かれ、rec-panel 下部に「合計 11駅 / 乗換 1回」と表示。chip 内の「合計 11駅」と完全一致

### 残課題

- 2 hop 乗換 (e.g. 札幌 ↔ 鹿児島中央) は候補ゼロのまま「手動追加してください」フォールバック。需要が出たら 2 hop も実装 (UI 設計をどうするかが論点 — 経由 2 駅をまとめて 1 chip にするか、2 段階で出すか)
- through_lines (直通系統) は SERVICE_LINES の独立系統として表現されているため、「実質乗換不要」な区間も「乗換候補」として出る可能性。例: 副都心線 ↔ 東急東横線 の渋谷。今回触らず、必要なら through_lines を見て「直通あり」表示を追加

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

