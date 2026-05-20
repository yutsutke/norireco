# 乗レコ - 電車旅 更新履歴 (Phase 3.8 前半 アーカイブ)

`CHANGELOG.md` から退避した Phase 3.8 前半 (v173〜v188 相当, §22〜§37) のセッションログ。
他フェーズは:
- [CHANGELOG.md](CHANGELOG.md) — 現行 Phase 3.8 後半 (v226〜)
- [CHANGELOG_PHASE3.8-modules.md](CHANGELOG_PHASE3.8-modules.md) — Phase 3.8 中盤 (v189〜v225, コード分割 + ES Modules 化)
- [CHANGELOG_PHASE1-3.7.md](CHANGELOG_PHASE1-3.7.md) — Phase 1〜3.7 (v60〜v157)

カバー範囲 (時系列, 2026-05-17〜2026-05-18):
- §22 v173: データ補修 (西武池袋線 駅順 / 箱根登山系 表示名・operator_id)
- §23 v174: 「〜月指定」期間フィルタ追加 + タイムマシン subtab 廃止
- §24 v175: 記録モード用語統一「手動記録 / GPS 記録」
- §25 v176: 保存ボタンを「手動記録で保存する / GPS 記録で保存する」に
- §26 v177: マップ表示モード切替「両方 / 乗車のみ / 未乗車のみ」
- §27 v178: 手動記録の乗車日時編集 + 「後追い記録」可視化
- §28 v179: 記憶の精度 5 段階対応「正確/日付/月/年/不明」
- §29 v180: 確認モーダル「🕒 時刻」行を記録種別・精度連動に
- §30 v181: 後追い記録モード拡張 (メモ・遅延入力)
- §31 v182: 統計タブ「📌 直近の旅程」 + 旅程タブ並び替え
- §32 v183: メモ/遅延が表示されないバグ修正 (localStorage merge)
- §33 v184: 旅程カードからメモ・遅延を後追い編集
- §34 v185: 遅延入力を「時間 + 分」に分割
- §35 v186: stop_type 反映の駅 UI 個人化 + 表示/非表示フィルタ
- §36 v187: 地図フィルタを 3 アイコンに集約 + 未訪問駅 ON/OFF
- §37 v188: 路線モード切替を撤廃、駅フィルタから自動派生に統合

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
