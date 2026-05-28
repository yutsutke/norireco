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

## 256. v406 — 一括記録 A-8 完了: 区間ピッカー (from/to 2 select) (2026-05-28)

### 背景

§255 (v405) で A-1〜A-7 が一区切り、ユスケから「どこからどこへ乗ったのかも選べるようにしたい」という追加要望。

たたむ default = 全線 (`stations[0]→stations[-1]`) は Notion §1.3 通りだが、アコーディオン展開時に区間を変更できないのは UX 上の不足。Notion §1.3「フル入力」項目には「区間」も含まれている (`時刻精度・**区間**・per-seg 列車車両・遅延・メモ・写真`) ので、A-8 として区間ピッカーを追加。

`createTripDetailEditor` の per-seg-rows mode は「既存 segments を表示するだけ」で区間そのものの編集機能はない (13b 旅程編集モーダルでも segments の追加/削除/経路変更は別タスク扱い)。→ bulk-record 専用に区間ピッカーを実装。

### 実装

#### UI パターン選択

ユスケ判断で **「from/to 2 select だけ (シンプル案)」** を採用:

| パターン | 採否 |
|---|---|
| ✅ from/to 2 select だけ | シンプル。両端 = 「全線 N 駅」、中間 = 「区間 M 駅」を meta 表示で自動判別 |
| 全線/区間ラジオ + from/to | UI 要素多め、選択 1 段増 |
| 駅チップ 2 個選択 | 長路線 (東海道線 100+ 駅) でかさばる |

#### `js/21-bulk-record.js`

新規 module-private 関数:

| 関数 | 役割 |
|---|---|
| `_mountSegmentPicker(sl, body)` | 区間ピッカー mount。stations 全駅を 2 つの select に表示、change で `_bulkDrafts.segments[0]` 更新 + `_edited=true` + meta 更新 + factory 再 mount |
| `_mountDetailEditor(sl, body)` | A-5 で `_openAccordion` 内に直書きしていた `createTripDetailEditor` 呼出を独立関数化。`_mountSegmentPicker` からも再 mount 用に呼ぶ |
| `_refreshLineHeader(lineId)` | 行ヘッダの ✏️ マーク再描画 (segment change で `_edited=true` になった後) |

`_openAccordion` 簡素化:
```js
_mountSegmentPicker(sl, body);
_mountDetailEditor(sl, body);
```

`_buildLineItem` の accordion body 構造に `<div class="bulk-segment-picker"></div>` を先頭に追加 (tde-time / train / delay / notes の前)。

##### 区間ピッカー HTML

```html
<div class="bsp-label">🚉 区間</div>
<div class="bsp-row">
  <select class="bsp-sel bsp-from">{stations 全駅 option}</select>
  <span class="bsp-arrow">→</span>
  <select class="bsp-sel bsp-to">{stations 全駅 option}</select>
</div>
<div class="bsp-meta">{駅数表示}</div>
```

##### change handler の挙動

1. from/to index を取得、`lo=min(f,t)`, `hi=max(f,t)` で正規化 (前後反転は resolveByServiceLine が結果同じなので順序だけ整える)
2. `stations[lo].name/id` を `seg.from/from_station_id`、`stations[hi].name/id` を `seg.to/to_station_id` に
3. `_bulkDrafts.set(sl.id, { ...cur, segments: [{...新seg}], _edited: true })` (train_* は引き継ぐ)
4. meta 更新 (`24 駅 (全線)` / `20 駅 / 24 駅中`)
5. 現 `_openEditor.getDraft()` で time/delay/notes 編集値を draft に保存 → `destroy()` → null
6. `_mountDetailEditor` を呼んで factory 再 mount (initial の segments を新 from/to で渡し直し)
7. `_refreshLineHeader` で ✏️ マーク反映

##### `_buildTripFromDraft` の動的 name + total_stations

旧 (A-3〜A-7) は `name = ${lineName} 全線` / `total_stations = stations.length` 固定。A-8 で動的化:

```js
let totalStations = stations.length;
let tripName = `${lineName} 全線`;
if (segs[0]) {
  const fromIdx = stations.findIndex(s => s.name === seg.from);
  const toIdx   = stations.findIndex(s => s.name === seg.to);
  if (fromIdx >= 0 && toIdx >= 0) {
    const lo = Math.min(fromIdx, toIdx), hi = Math.max(fromIdx, toIdx);
    totalStations = hi - lo + 1;
    const isFull = (lo === 0 && hi === stations.length - 1);
    tripName = isFull ? `${lineName} 全線` : `${lineName} ${seg.from}→${seg.to}`;
  }
}
```

#### `noritetsu-map.html` CSS (~10 ルール)

- `.bulk-segment-picker` — 区間 box (navy + gold border)
- `.bsp-label` — gold "🚉 区間"
- `.bsp-row` — flex から/到 select 横並び + arrow
- `.bsp-sel` — dropdown スタイル
- `.bsp-meta` — 駅数 (`.bsp-meta-full` で gold 強調)
- `.bsp-warn` — 駅情報不足のエラー表示用

#### `sw.js` v405 → v406

### 検証 (preview eval)

| シナリオ | 期待 | 実測 |
|---|---|---|
| accordion 展開で区間ピッカー mount | from/to 24 option / from=東京 / to=高尾 / meta="24 駅 (全線)" | 全て一致 ✅ |
| from を「新宿」に変更 | seg.from=新宿 / from_station_id=s_00004 / meta="20 駅 / 24 駅中" / metaFull=false | 一致 ✅ |
| change 後 `_edited=true` + ✏️ マーク | nameHasEditedMark=true | true ✅ |
| change 後 factory 再 mount | tde-time / tde-train が再生成 firstChild あり | 両方 true ✅ |
| 保存 trip (たたむ default 上野東京) | name="上野東京ライン(熱海〜宇都宮) 全線" / total_stations=44 | 一致 ✅ |
| 保存 trip (区間指定 中央線快速 新宿→高尾) | name="中央本線快速 新宿→高尾" / total_stations=20 | 一致 ✅ |
| console error | 0 | 0 ✅ |
| js-syntax-guard | clean | clean ✅ |

### 設計判断ログ

#### factory 再 mount vs partial update

`createTripDetailEditor` には `updateSegments()` のような部分更新 API がない (per-seg-rows mode は initial の segments を mount 時に DOM 生成し、change で `getDraft()` 経由で取り出す設計)。区間変更時に factory に segments 注入する API を追加するか、再 mount するかの 2 択。

| 案 | 採否 |
|---|---|
| ✅ 再 mount | 既存 API で完結、コード追加なし。各 sub-section DOM 再生成は 1 行 = 数十 ms で UX 上問題なし |
| factory に updateSegments() 追加 | 20-trip-detail-editor.js に新 API、テスト負荷増。本来の factory 責務 (display + collect) を逸脱 |

→ 再 mount 採用。time/delay/notes 編集値は再 mount 前に `getDraft()` で保存して `_bulkDrafts` に反映。

#### `_buildLineItem` 構造変更による A-5 影響

A-5 で `_buildLineItem` 内の accordion body に `tde-time/train/delay/notes` 4 子要素を直書き → A-8 で先頭に `bulk-segment-picker` を 1 つ追加。factory の `containers: {time, train, delay, notes}` 指定箇所は変更不要 (querySelector で各 .tde-* を取る限り影響なし)。

#### 前後反転 (from index > to index) の扱い

UI で from に「高尾」を選び to に「東京」を選ぶケース → 内部で `lo=min, hi=max` に正規化、`stations[lo]` を seg.from に。**ユーザーが意図して「折返し」記録したい場合**は対応できないが、その場合は通常の手動記録モード (07) を使うべき。bulk-record は「ざっくり全線/区間」を一気に記録する用途で、折返しのような細かい記録は別経路。

#### name 表示の動的化

旧 "全線" 固定 → 動的 "全線" / "from→to" 切替。理由:
- 名前で何の trip かがすぐ分かる (マイページ旅程リスト視認性)
- 区間 trip を後から editorial 編集する際、検索性が上がる
- total_stations と name の整合 (24 駅で "全線" だったのが 20 駅で "全線" のままだと違和感)

### 残課題 / 次のステップ

- **環状線対応** — 引き続き持ち越し
- bulk アコーディオンに写真添付 — 引き続き持ち越し
- 区間ピッカーの **複数 segment 対応** (現状は 1 系統 1 segment 想定) — 「上野東京ライン上野→大宮 + 大宮→宇都宮 で乗換 1 回」のような分割記録ニーズが出てきたら検討。今は 1 系統 1 trip の方が UX シンプル

### 関連

- §250〜§255 (v400〜v405) — A-1〜A-7 の前提
- Notion §1.3「フル入力」項目 (区間も含む)
- §249 (v399 B-4-b) — multi-container API が A-8 の factory 再 mount を支える

---

## 255. v405 — 一括記録 A-6+A-7 完了 (A 段階完結): オンボーディングバナー + unknown 集計検証 (2026-05-28)

### 背景

§254 (v404, A-5) でフル機能版完成。残 A-6 (オンボーディング) + A-7 (unknown 集計検証) を 1 commit に統合して A 段階を完結させる。

### A-6: 空マップ時オンボーディングバナー

Notion §1.3 入口 (b) の実装。新規ユーザーが初回マップを開いた瞬間に「ここから何をすれば良いか」を視覚的に誘導する。

#### `noritetsu-map.html`

新規 element (地図画面中央下に absolute float):

```html
<div class="empty-onboarding-banner" id="empty-onboarding-banner" hidden
     onclick="openBulkRecordSheet()">
  <div class="eob-icon">📋</div>
  <div class="eob-text">
    <div class="eob-title">乗ったことのある路線で<br>マップを塗ろう</div>
    <div class="eob-sub">タップして「過去の乗車をまとめて記録」を開く</div>
  </div>
</div>
```

CSS:
- `.empty-onboarding-banner`: absolute / bottom 96px / 中央 / gold グラデーション / 矢印アニメ (eob-bounce 1.6s ease-in-out infinite で `translateY(-4px)` 往復)
- `.eob-icon` / `.eob-title` / `.eob-sub`: 階層表示

#### `js/21-bulk-record.js`

新規 export:

```js
export function updateOnboardingBanner() {
  const banner = document.getElementById('empty-onboarding-banner');
  if (!banner) return;
  let lsLen = 0;
  try { lsLen = (JSON.parse(localStorage.getItem('norireco_trips') || '[]')).length; } catch (e) {}
  const segsLen = Array.isArray(window.RIDDEN_SEGS) ? window.RIDDEN_SEGS.length : 0;
  const isEmpty = lsLen === 0 && segsLen === 0;
  banner.hidden = !isEmpty;
}
```

呼出点:
1. **DOMContentLoaded / readyState != 'loading'** で初回チェック + 3 秒後フォローアップ (5-supabase-data の async 同期完了を待つ)
2. **saveBulkDrafts 末尾** で再評価 (1 件でも保存すれば hide)
3. **`window.NORIRECO.bulkRecord.updateOnboardingBanner`** で window 公開

#### `js/07-record-mode.js`

通常記録モードからも hook 1 行追加:

```js
// saveMultiSegmentTrip 末尾 (1418 行あたり)
try { window.NORIRECO?.bulkRecord?.updateOnboardingBanner?.(); } catch (e) {}
```

import を増やさず optional chain で side effect 注入 → 循環 import 回避 (07 が 21 を import しない)。

### A-7: unknown 集計検証

#### 検証結果

`applyDateFilter` (05-supabase-data.js:248) を読むと:

```js
export function applyDateFilter() {
  let trips = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
  // ...
  const filtered = filterTripsByDate(trips);   // unknown は specific フィルタで除外 (line 201)
  segs = tripsToSegs(filtered);
  RIDDEN_SEGS.length = 0;
  segs.forEach(s => RIDDEN_SEGS.push(s));      // ← 期間フィルタの結果が地図塗りソースになる
  NORIRECO.rideRecord.rebuild();
  // ...
}
```

つまり **期間フィルタが地図塗り (RIDDEN_SEGS/riddenSt) にも適用される**。Notion §1.3 末尾の採用 (a) (「期間フィルタからは除外維持、地図塗りには含む」) と実装が逆。

#### 対応方針: 現状 (b) で確定 (ユスケ判断)

二系統化案 (a 実装) との対比:

| 案 | 実装コスト | UX |
|---|---|---|
| **(b) 現状維持** ✅ | ゼロ | 「期間フィルタ = 日時判明 trip 内で絞る」意味論で整合。bulk-record 大量 unknown を入れても、デフォルト (mode='all') では全部見える。期間絞り込み時は「いつ乗ったか不明」が消えるのは自然 |
| (a) 二系統化 | applyDateFilter 大改修、RIDDEN_SEGS 単一参照を二系統化、後続コード広範影響 | 「今年」フィルタでも unknown が地図に塗られたまま。意味論的にやや不自然 |

→ **(b) 採用**。実装変更ゼロ、Notion §1.3 採用 (a) は (b) に更新する。

### `sw.js` v404 → v405

### 検証 (preview eval)

| シナリオ | 期待 | 実測 |
|---|---|---|
| `bannerExists` | true | ✅ |
| 既存 trips あり (lsLen=14) | banner.hidden=true | true ✅ |
| 空状態シミュレート (ls/segs clear) → `updateOnboardingBanner()` | banner.hidden=false + テキスト表示 | hidden=false / "📋 乗ったことのある路線でマップを塗ろう..." ✅ |
| 復元 + `updateOnboardingBanner()` | banner.hidden=true | true ✅ |
| 空状態 + banner.click() | sheet 開く | sheetOpenAfterBannerClick=true ✅ |
| A-7: `filterTripsByDate` で specific (`thisYear`) | unknown 除外 | line 201 で実装確認 ✅ |
| A-7: `applyDateFilter` 内で `RIDDEN_SEGS = tripsToSegs(filtered)` | 期間フィルタ specific 時に地図塗りも unknown 除外 | コード確認 ✅ (= 現状 (b)) |
| console error | 0 | 0 ✅ |
| js-syntax-guard | ESM clean + 衝突なし | OK ✅ |

### 設計判断ログ

#### banner の表示位置

| 案 | 採用 |
|---|---|
| 地図中央下 absolute (bottom:96px) | ✅ — FAB (📝/🎭/📍) と重ならず、画面中央付近で視認性高 |
| 地図上部 fixed | ❌ — ヘッダ完乗率/系統数表示と被る |
| 地図中央モーダル | ❌ — 強引、初回タップで操作中断 |

#### banner の永続化

`localStorage.norireco_trips` 空 AND `RIDDEN_SEGS` 空 = 真に「乗車記録ゼロ」のときだけ表示。ログインしていれば Supabase 同期後に `RIDDEN_SEGS` populate → banner 自動非表示。未ログインでも localStorage 1 件でも入れば消える。

`saveBulkDrafts` 後 + `saveMultiSegmentTrip` 後の両方で評価して、保存即時 hide。

#### saveMultiSegmentTrip からの hook 方式

| 方式 | 採用 |
|---|---|
| 07 が 21 を import | ❌ — 循環 import (21 が 07 から redrawAll/showRecordToast import 中) |
| `window.NORIRECO?.bulkRecord?.updateOnboardingBanner?.()` で side effect | ✅ — optional chain で 21 未ロード時も安全 |
| Custom Event dispatch + addEventListener | △ — 過剰設計、1 関数だけなら直接呼出が読みやすい |

#### A-7 で (b) 採用の理由

「期間フィルタは日時情報を持つ trip の中で絞る」という意味論で十分整合。bulk-record で大量 unknown を作っても、ユーザーが期間絞り込みを使う場面は「いつ乗ったかを基準に整理したい」意図なので、unknown が消えるのは妥当。

採用 (a) の二系統化は applyDateFilter / RIDDEN_SEGS の単一参照を破壊するため、副作用 (マイページ完駅率カード / GPS 完駅率 / 旅程グラフ / ヘッダ統計の整合性) を全部確認する必要があり、A 段階の終盤で着手する変更としては重い。

### 関連

- §250〜§254 (v400〜v404) — A-1〜A-5 の前提
- Notion §1.3 末尾「データの流れ」+「要検討」セクション (採用 (a) → (b) に更新が必要)

### A 段階完結

| 段階 | 機能 | バージョン |
|---|---|---|
| A-1 | skeleton (open/close + 入口ボタン) | v400 |
| A-2 | チェックリスト + たたむモード | v401 |
| A-3 | 一括保存 MVP | v402 |
| A-4 | 検索 + 並び替え + 地域フィルタ | v403 |
| A-5 | アコーディオン展開 (factory mount) | v404 |
| **A-6+A-7** | **オンボーディングバナー + unknown 集計検証** | **v405** |

残課題 (別タスク):
- **環状線対応** — 山手線 17/30 駅塗り問題、N02 line データ補完 (Phase 3 駅 ID 体系の延長)
- **写真添付** — A-5 では skip、bulk-record アコーディオン展開時の photos セクション (factory は対応済)

---

## 254. v404 — 一括記録 A-5 完了: アコーディオン展開 (createTripDetailEditor 行内 mount) (2026-05-28)

### 背景

§253 (v403, A-4) までで「638 系統 → 検索/地域/近くで絞り → チェック → 一括保存」の実用版が完成。A-5 で **「開く」フル入力モード** = Notion §1.3「2 段階入力 (たたむ / 開く)」の後半を実装。

A-5 着手前の事前検証で **環状線 (山手線) の bulk 保存で全駅塗れない問題** が再確認された (山手線 17/30 駅、別途 N02 山手線 line に東京〜上野間の駅が含まれていない構造起因)。半周分割を試みても結果同じ (17 駅) のため、A-5 のスコープから外して別タスクへ持ち越し、アコーディオン UI に集中。

### 実装

#### `js/21-bulk-record.js` (~450 行 → ~600 行)

##### 新規 import

```js
import { createTripDetailEditor } from './20-trip-detail-editor.js';
```

##### 新規 module-local state

```js
let _openLineId = null;     // 現在開いている SL.id (null = どれも開いていない)
let _openEditor = null;     // createTripDetailEditor instance
```

##### 新規関数

| 関数 | 役割 |
|---|---|
| `_toggleAccordion(sl)` | 同時 1 行制御の入口。別行を開く前に現開行 close、同じ行なら閉じるだけ |
| `_openAccordion(sl)` | チェック自動 ON + body 表示 + factory mount (multi-container)。`scrollIntoView` で見せる |
| `_closeAccordion()` | `editor.getDraft()` で `_bulkDrafts` 上書き (`_edited: true`) + destroy + body hide + ✏️ マーク追加 |
| `_findSegStationId(prevDraft, lineId, stName, role)` | 旧 draft の segments から駅 id 引き継ぎ (editor は from_id/to_id を持たないため) |
| `_draftToEditorInitial(draft, sl)` | bulk-record draft → factory initial 形式変換 (lineName 付与、train_* null fill) |

##### `_buildLineItem` 全面書換

旧 `<label>` 単独 → `<div class="bulk-line-row">` で包む新構造:

```html
<div class="bulk-line-row" data-line-id="...">
  <label class="bulk-line-item">                          ← 行クリックで checkbox toggle
    <input type="checkbox" class="bulk-line-check">
    <span class="bulk-line-swatch">                       ← 系統色
    <span class="bulk-line-main">                         ← 名前 + メタ
    <button class="bulk-accordion-toggle">▶</button>     ← stopPropagation で checkbox 守る
  </label>
  <div class="bulk-accordion-body" hidden>                ← 展開時のみ表示
    <div class="tde-time"></div>
    <div class="tde-train"></div>
    <div class="tde-delay"></div>
    <div class="tde-notes"></div>
  </div>
</div>
```

`▶/▼` ボタンは `e.preventDefault()` + `e.stopPropagation()` で `<label>` 内クリック伝播を止め、checkbox 誤 toggle を防ぐ。

##### `createTripDetailEditor` mount (B-4-b multi-container API)

```js
_openEditor = createTripDetailEditor({
  containers: {
    time:  body.querySelector('.tde-time'),
    train: body.querySelector('.tde-train'),
    delay: body.querySelector('.tde-delay'),
    notes: body.querySelector('.tde-notes'),
  },
  initial: _draftToEditorInitial(draft, sl),
  features: {
    timeRow:     { precisions: ['minute', 'day', 'month', 'year', 'unknown'] },
    trainPicker: 'per-seg-rows',     // segments の各行を独立カスケード
    delay:       true,
    notes:       true,
    photos:      false,              // A-5 では skip (将来追加可)
  },
});
```

##### `_buildTripFromDraft` の `_edited` 分岐

| field | 未編集 (たたむ default) | 編集済み (`_edited: true`) |
|---|---|---|
| date | ctx.today | draft.date \|\| ctx.today |
| date_precision | 'unknown' | draft.date_precision \|\| 'unknown' |
| depart_time | '' | draft.depart_time \|\| '' |
| arrive_time | '' | draft.arrive_time \|\| '' |
| segments | draft 由来 1 件、train_* null | editor の segments (per-seg train_* 含む) |
| transfers | 0 | `Math.max(0, segs.length - 1)` |
| train_id/name/category/car_model | null | 集約ルール (全 seg 一致なら値 / 不一致 null) |
| notes | null | draft.notes \|\| null |
| delay_minutes | null | draft.delay_minutes (number) \|\| null |

##### accordion close を 3 箇所に追加

- `saveBulkDrafts` 開始時: 開いている行があれば draft 上書きしてから save
- `closeBulkRecordSheet` で editor destroy + state reset
- `_renderChecklistOnly` 内: フィルタ変更で対象行が消える前に上書き

#### `noritetsu-map.html` CSS (~10 ルール)

- `.bulk-line-row` — flex column wrap
- `.bulk-accordion-toggle` — 28×28、aria-expanded=true で gold
- `.bulk-accordion-body` — gold border 上端なし (label と連続)、各 .tde-* セクション間 gap 8px

#### `sw.js` v403 → v404

### 検証 (preview eval)

| シナリオ | 期待 | 実測 |
|---|---|---|
| 行 ▶ クリック | チェック自動 ON + body 表示 + 4 section mount | cbBefore=false → cbAfter=true / hidden=false / tde-* 全 firstChild あり ✅ |
| toggle 状態 | ▶ → ▼ + aria-expanded=true | "▼" + "true" ✅ |
| delay 入力 (1h 30m) | draft.delay_minutes = 90 | 90 ✅ |
| notes 入力 | draft.notes 反映 | "一括記録テスト" ✅ |
| 別行を開く | 前行 close + draft._edited=true + ✏️ マーク + 別行展開 | "中央本線快速 ✏️" / chuoOpen=false / uenoTokyoOpen=true ✅ |
| 編集済み draft を保存 | trip.notes / delay_minutes に反映 | 保存された ✅ |
| 未編集 draft を保存 | trip.notes=null / delay=null (たたむ default 維持) | 期待通り ✅ |
| sheet close で editor destroy | _openLineId=null / drafts cleared | OK ✅ |
| console error | 0 | 0 ✅ |
| js-syntax-guard | ESM clean + 衝突なし | OK ✅ |

### 設計判断ログ

#### 環状線対応を A-5 で完結させなかった理由

| 案 | 結果 |
|---|---|
| (1) `_buildDefaultDraft` で半周 2 segments (`stations[0..mid]` + `stations[mid..-1]`) | 検証で 17/30 駅 (変化なし) |
| (2) 全 駅対 segments (`stations[i] → stations[i+1]` × N-1) | 未試行。trip.segments が 30 件になり Supabase 行サイズ膨張 |
| (3) bulk-record 側で riddenSt に直接駅追加 | rebuild() が破壊するので無意味 |
| (4) N02 山手線 line に東京〜上野間の駅を追加 | Phase 3 駅 ID 体系の延長作業。bulk-record スコープ外 |

→ A-5 では既知制約として明示 (`bulk-note` に「環状線は 1 駅のみ ridden になります」記載維持) + 行頭の 🔄 マークで視覚区別。**根本解決は (4) を別タスクで** — N02 山手線 line データに東京〜上野間を補完するか、SERVICE_LINES.candidateN02Ids を環状線専用ロジックにする。

#### per-seg-rows mode を選んだ理由

| mode | 採用判断 |
|---|---|
| `'per-seg-chip'` | ❌ — chip UI は記録モード (07 確認モーダル) 専用、bulk では segments 1 件しかないため chip 不要 |
| `'per-seg-rows'` | ✅ — segments を縦並びの row として表示、各行に種別/列車/車両カスケード。bulk 1 系統 = 1 segment なので 1 row だが、A-5 で半周分割を入れたとき自然に複数 row になる |
| `'trip-level'` | ❌ — segments 共通の trip 単位 train_*。bulk は segments で持つ方が将来の半周分割と一貫性ある |

#### `_edited` フラグの存在意義

未編集 draft は「たたむ default = ゼロ摩擦」で input cost 0 のまま記録できる Notion §1.3 仕様の核心。`_edited` フラグなしで editor から取った値を常に上書きすると、たたむ default も「日時を入力した記録」として保存されてしまい (editor の date 初期値 = today)、後から「日付不明だったのに今日と記録された」というデータ汚染になる。

`_edited` で「ユーザーが意図的に編集したか」を判定 → 未編集なら明示的に `dp='unknown' / depart=''` 等を保ち、editor の初期値を保存に持ち込まない。

#### 編集済み draft で行を再展開したらどうなる?

`_draftToEditorInitial` で `draft.date / depart_time / arrive_time / segments` (= 前回編集値) を editor initial に渡す → editor が値復元 → ユーザー継続編集可能。`_edited` フラグも維持。

### 残課題 / 次のステップ

- **A-6**: 空マップ時オンボーディングバナー (入口 (b)) — 新規ユーザーの初回画面で「乗ったことある路線を選んでマップを塗りましょう」誘導
- **A-7**: unknown 完乗率/塗り集計検証 (Notion §1.3 落とし穴 (a)) — 期間フィルタからは除外維持 + 地図塗り/完乗率には含める の整合確認
- **環状線対応 (別タスク)**: N02 山手線 line データ補完 or SERVICE_LINES.candidateN02Ids の環状線専用ロジック。TODO の 🔧 パフォーマンス・UI セクションに追記推奨
- **写真添付**: A-5 では `photos: false` で skip。後追いで「アコーディオン展開時のみ写真 mount」を追加可能 (factory が既に photos セクション対応済)

### 関連

- §250〜§253 (v400〜v403) — A-1〜A-4 の前提
- §242〜§249 (v392〜v399 trip 詳細エディタ抽出 B カテゴリ) — factory 本体
- Notion §1.3 「2 段階入力 (たたむ / 開く)」+「状態管理: アコーディオン (同時 1 行)」

---

## 253. v403 — 一括記録 A-4 完了: 検索 + 並び替え + 地域フィルタ (2026-05-28)

### 背景

§252 (v402, A-3) で MVP 完成。ただし 638 系統素の縦リストは実用性が低い (Notion §1.3 末尾「全国 606 系統あるので一覧は素では破綻」の通り)。A-4 で実用版に格上げ:

- 検索 input (系統名 / 運営会社 部分一致)
- 並び替え `近く順` / `名前順`
- 地域グループ dropdown (13 値)
- リセットボタン

180 件ある運営会社は dropdown には不向き → 検索 input に統合 (`JR東日本 新幹線` のような AND 検索で代替)。

### 実装

#### `js/21-bulk-record.js`

新規 module-local state:

```js
const _filter = { query: '', sort: 'near', group: 'all' };
```

新規関数:

| 関数 | 役割 |
|---|---|
| `_getCurrentLocation()` | `NORIRECO.gps.lastUserGps` > `map.getCenter()` の優先順で `{lat, lon}` を返す。両方無ければ null |
| `_distSq(stA, locB)` | lat/lon の二乗和 (km 単位ではないが順位比較なら十分、`Math.hypot` 等のオーバーヘッドを避ける) |
| `_applyFilter(SL, filter, loc)` | group → query → sort の順で適用。元配列非破壊、新配列を返す。`'near'` で `loc=null` のときは元順 |
| `_renderChecklistOnly()` | フィルタバーは触らず checklist 領域だけ再描画。mp-trip-filter と同じ IME 安定パターン |

`_renderBody` 大幅書換:
- フィルタバー HTML を `bulk-summary-bar` の下に追加
- 4 つの event listener (input / 2 select / reset)
- `'near'` で loc 無い場合は `'name'` に自動降格
- option label を `'近く順 (現在地)'` / `'近く順 (地図中心)'` / `'近く順 (取得不可)'` で動的切替

`openBulkRecordSheet` で `_filter` も毎回リセット (`_bulkDrafts` リセットと同じ open 毎クリーン状態方針)。

#### `noritetsu-map.html` CSS 追加 (~10 ルール)

- `.bulk-filter-bar`: flex 折返し、ボトムシート内に sticky なし (上の summary-bar が sticky)
- `.bulk-filter-input` / `.bulk-filter-sel`: mp-filter-* と類似のダーク系
- `.bulk-filter-reset`: 30×30 の ↺ ボタン
- `.bulk-checklist-meta`: フィルタ結果件数表示 (`N / 638 系統`)

#### `sw.js` v402 → v403

### 検証 (preview eval)

| シナリオ | 期待 | 実測 |
|---|---|---|
| 初期 sort | 'near' (地図中心ベース) | 'near'、option label「近く順 (地図中心)」 ✅ |
| 「近く順」初期先頭 (map center 36.5,138 = 長野県) | 中部地方の路線 | `auto_篠ノ井線_東日本旅客鉄道` ✅ |
| 検索「山手」 | 山手線 + 神戸市営山手線 | 2/638 ✅ |
| AND 検索「JR東日本 新幹線」 | JR東日本運営の新幹線 (山形 + 秋田) | 2/638 で正確 ✅ |
| 地域「関西」 | 関西の系統だけ | 134/638 ✅ |
| 関西 + 名前順 | 50 音順 | JR京都線, JR神戸線, JR東西線... ✅ |
| group 変更後もチェック保持 | 別 group の選択が残る | jr_kyoto_line チェック → group=all で 1 件保持 ✅ |
| リセット | query 空 / sort 'near' / group 'all' / チェックは保持 | 期待通り (チェック保持は仕様通り) ✅ |
| close → cleanup | sheet hide + _bulkDrafts clear | OK ✅ |
| console error | 0 | 0 ✅ |
| js-syntax-guard | clean | clean ✅ |

### 設計判断ログ

#### `近く順` の参照点優先順

| 候補 | 採用 |
|---|---|
| `NORIRECO.gps.lastUserGps` | ✅ 第 1 — 実 GPS が一番ユーザーの意図に近い |
| `map.getCenter()` | ✅ 第 2 — GPS 未許可でもユーザーがマップを動かして見ている領域は意図の表現になる |
| 全国センター固定 | ❌ — 「近く順」の名に反する |
| `'near'` 自体を hide | ❌ — フィルタ UI が地域 dropdown 1 つだけになり貧弱 |

#### 運営会社 dropdown を廃止して検索に統合

180 件の operator を dropdown にすると:
- 縦長すぎてモバイルで使い物にならない
- 「JR東日本」を選んでも JR本州 3 社の関係性は表現できない (グループフィルタとも被る)
- 「JR」で部分一致したい (検索 input なら自然) — dropdown だと「JR東日本」「JR西日本」を個別に切替必要

→ 検索 input に「系統名 / 会社 / id」を全部混ぜ込んで、空白 AND で絞り込む方が UX 良い。

#### group は 13 値 → dropdown 採用

`detectServiceLineGroup` の結果は ['首都圏・JR', '関西', '新幹線', '九州', '中国・山陰', '東北', '四国', '東海・中部', '北海道', '首都圏・ローカル', '首都圏・私鉄(南・西)', '首都圏・私鉄(東・北)', '東京メトロ・都営']。スマホでも開閉が現実的なサイズ。

#### リセットボタンの挙動: フィルタだけ vs フィルタ + チェック

mp-trip-filter は「フィルタだけリセット」(チェック概念がない)。bulk-record も同じく「フィルタだけリセット」を採用。チェックリセットは「閉じて開き直す」(open 毎クリーン状態方針) でカバー。

### 残課題 / 次のステップ

- **A-5**: アコーディオン展開で `createTripDetailEditor` (`trainPicker='per-seg-rows'`) を行内 mount + 環状線半周分割
- A-6: 空マップ時オンボーディングバナー (入り口 (b))
- A-7: unknown 完乗率/塗り集計の検証 (Notion §1.3 落とし穴 (a))

### 関連

- §250〜§252 (v400〜v402) — A-1〜A-3 の前提
- Notion §1.3「全国 606 系統あるので一覧は素では破綻。既定は『現在地の近くの路線』、上に検索＋会社/都道府県フィルタ」

---

## 252. v402 — 一括記録 A-3 完了 (MVP): 一括保存 (saveBulkDrafts) (2026-05-28)

### 背景

§251 (v401, A-2) でチェックリスト + たたむモードまで完成。本セッション A-3 は **A カテゴリの MVP** となる保存処理。Notion §1.3「データの流れ」の `[記録する] → draft 配列をループ → trip 構築 → 写真ありは tripId 確定 → upload → trip.photos → POST → tripForSupabase → upsert → resolveByServiceLine → redrawAll` を実装。

A-3 段階では:
- 写真添付なし (`photos: []` 固定 / A-5 アコーディオン展開で対応予定)
- 詳細編集なし (`train_id/category/car_model = null` / 全て「たたむ default」のまま)
- 検索/フィルタなし (A-4)

これで素の MVP として「マイページから 1 タップで 1 路線完乗を一括追記」が完結する。

### 実装

#### 新規 import (上部に追加)

```js
import { currentUserId } from './12-auth.js';
import { redrawAllLinesAfterTripChange, showRecordToast } from './07-record-mode.js';
import { updateOverlays } from './08-rendering.js';
```

`window.SUPABASE_URL / SUPABASE_KEY / RIDDEN_SEGS / tripForSupabase / localDateStr` は他 module の window 公開を流用。

#### 新規 state

```js
let _saving = false;   // 多重クリック防止
```

#### 新規関数

| 関数 | 役割 |
|---|---|
| `_buildTripFromDraft(draft, idx, ctx)` | draft → trip object (id, name, segments, dp='unknown', total_stations=stations.length, transfers=0 等) |
| `async _postTripToSupabase(trip)` | Supabase REST POST。失敗時は throw して呼び出し側 try/catch に任せる |
| `async saveBulkDrafts()` | メインフロー (下記) |

#### `saveBulkDrafts` フロー

1. `_saving` フラグで多重実行ガード、保存ボタン disabled + `'💾 保存中...'`
2. ctx 準備 (`baseTime`, `userId`, `today`, `recordedAt` を 1 回だけ評価)
3. drafts ループ:
   a. `_buildTripFromDraft` で trip 構築
   b. 進捗表示 (10 件以上で 5 件毎に `'💾 保存中... (i+1 / N)'`)
   c. `await _postTripToSupabase` (失敗は count + log、流れは止めない)
   d. localStorage push (失敗時も継続 = 部分コミット許容)
4. 全件ループ後に**一括で**:
   - RIDDEN_SEGS bulk push (各 trip.segments を順次)
   - `_mypageCache.push`
   - `NORIRECO.rideRecord.rebuild()` 1 回
   - `redrawAllLinesAfterTripChange()` 1 回 (saveMultiSegmentTrip は 1 trip 毎に redraw、一括では 1 回にまとめて FPS 低下を避ける)
   - `updateOverlays()`
   - `NORIRECO.stationActions.refreshTripListIfOpen()`
   - `NORIRECO.mypage.renderMpTripsResultOnly()`
5. トースト (全成功 / 部分失敗 / 全失敗) + `closeBulkRecordSheet()`

#### trip 構造

```js
{
  id: `trip_${baseTime}_${idx}`,    // 連続生成衝突回避
  date: today,                      // dp='unknown' でも Supabase NOT NULL 制約のため (v179 仕様)
  name: `${lineName} 全線`,
  photos: [],
  from_station_id, to_station_id,   // _buildDefaultDraft 段階で seg に付与済
  total_stations: stations.length,  // 自己申告 = 全駅
  transfers: 0,
  line_list: lineName,
  total_minutes: 0, depart_time: '', arrive_time: '',
  segments: [{ lineId, from, to, from_id, to_id, train_* = null, car_model = null }],
  source: 'manual', verified: false,
  gps_*: null,
  recorded_at: ctx.recordedAt,
  date_precision: 'unknown',
  train_*: null, car_model: null,
  notes: null, delay_minutes: null,
  user_id: ctx.userId,
}
```

### 検証 (preview eval)

未ログイン状態で localStorage 8 trips の上から bulk 3 件 (非環状) 追加:

| 項目 | 期待 | 実測 |
|---|---|---|
| `_bulkDrafts.size` 開始 | 3 | 3 ✅ |
| save 後 `_bulkDrafts.size` | 0 (clear) | 0 ✅ |
| localStorage delta | +3 | +3 ✅ |
| RIDDEN_SEGS delta | +3 | +3 ✅ |
| sheet 自動 close | true | true ✅ |
| 新 trip name | `中央本線快速 全線` 等 | 期待通り ✅ |
| 新 trip total_stations | 24 / 44 / 39 (stations.length) | 完全一致 ✅ |
| `riddenSt['中央線_東日本旅客鉄道'].size` | ~24 (中央線快速分) | 31 駅 (既存 trips との overlap 込) ✅ |
| `riddenSt['東海道線_東日本旅客鉄道'].size` | ~30+ (上野東京 + 湘南新宿) | 35 駅 ✅ |
| `riddenSt['山手線_東日本旅客鉄道'].size` | 増加 (両ラインが山手線区間走行) | 12 駅 ✅ |
| ヘッダ完駅率/系統数 | 増加 | 更新確認 ✅ |
| console error | 0 | 0 ✅ |
| js-syntax-guard サブエージェント | ESM clean + 循環 import なし | OK ✅ |

### 設計判断ログ

#### 部分コミット許容 vs 全ロールバック

| 戦略 | 採用 |
|---|---|
| 部分コミット許容 (saveMultiSegmentTrip と整合) | ✅ — オフライン耐性、Supabase 部分障害でも localStorage 復旧可能 |
| 全ロールバック (1 件失敗で全部巻き戻し) | ❌ — UX 悪化、再試行のコスト大。RLS 設定ミス等のシステミック失敗時もユーザーが繰り返し試行する羽目になる |

§251 の設計判断ログに「実装時に決定」と書いていた件を確定。

#### バッチ API vs 逐次 POST

`POST /rest/v1/norireco_trips` に配列を渡すと 1 リクエストで複数 trip 挿入できるが、

- 1 件失敗で全件 rollback されるため、「部分コミット許容」と相反
- 進捗表示が「保存中...」だけになり、N 件のうち K 件目という細かさが失われる
- 逐次 POST でも 638 系統チェックは現実的にはありえない (近く絞り込みで 100 件未満想定)

→ 逐次 POST 採用。

#### redraw を最後に 1 回だけ

saveMultiSegmentTrip は 1 trip 保存毎に `redrawAllLinesAfterTripChange` を呼ぶが、一括で同じことをすると N 回の全 polyline 再描画が走る (重い)。`rebuild → redraw → updateOverlays` を全 trip 処理後に 1 回だけ呼ぶことで FPS 低下を回避。

#### 環状線の扱い

`_buildDefaultDraft` で `from=stations[0].name to=stations[-1].name` → 環状線は同名 → `resolveByServiceLine` の `findIndex` が両方 0 にヒット → 1 駅のみ ridden になる。

UI 上の `total_stations: stations.length` (山手線なら 30) と実態 (1 駅 ridden) の乖離。**既知の不整合**として A-5 で半周 2 segment 分割で解消予定 (`stations[0..mid]` + `stations[mid..last]`)。

A-3 段階では bulk-note 末尾に明記 (`環状線は 1 駅のみ ridden になります (A-5 で半周分割予定)`)。

#### 「📋 列車・車両形式も記録する」マニアトグル相当の機能

A-3 段階では完全に省略 (`train_* = null`)。A-5 アコーディオン展開で `createTripDetailEditor` (`trainPicker='per-seg-rows'`) を mount するため、その段階で per-seg 車両形式が選べる。

### 残課題 / 次のステップ

- **A-4 (次)**: 検索 + フィルタ (近く / 会社 / 都道府県) + 既定「近く」並べ替え。638 系統素一覧を実用的に絞る
- A-5: アコーディオン展開で `createTripDetailEditor` を行内 mount + 環状線半周分割
- A-6: 空マップ時オンボーディングバナー (入り口 (b))
- A-7: unknown 完乗率/塗り集計の検証 (Notion §1.3 落とし穴 (a))

### 関連

- §250 (v400 A-1), §251 (v401 A-2) — A-3 の前提
- saveMultiSegmentTrip (07-record-mode.js:1147) — 単発 trip 保存の参考実装
- Notion §1.3「データの流れ」セクション

---

## 251. v401 — 一括記録 A-2 完了: 営業系統チェックリスト本体 + たたむモード (2026-05-28)

### 背景

§250 (v400, A-1) で skeleton (open/close + 空ボトムシート + 入口ボタン) を deploy。A-2 はその body 中身として **営業系統チェックリスト本体 + たたむモード (タップ = ゼロ摩擦 draft 1 件)** を実装。

Notion §1.3 設計確定の「2 段階入力 (たたむ / 開く)」の前半 = たたむ default を実装。チェック = 全線の draft trip 1 件 (`source=manual, verified=false, date_precision='unknown'`) を内部 Map に push、アンチェックで pop。

### 実装

#### `js/21-bulk-record.js` 全面書き換え (~70 行 → ~165 行)

A-1 skeleton の placeholder body を捨て、`_renderBody()` + `_buildLineItem(sl)` + `_onToggleLine(sl, checked)` の本体実装に置換。

##### 内部 state

```js
const _bulkDrafts = new Map();   // key = sl.id, value = draft trip
```

`open` で `clear()`、`close` でも `clear()`。中断状態の永続化はしない方針 (一括記録は「短時間に一気に塗る」ユースケース想定、ブラウザ離脱で消えても害は小さい)。

##### draft 構造 (Notion §1.3 仕様準拠)

```js
{
  lineId, lineName,
  segments: [{
    lineId,
    from: stations[0].name,
    to:   stations[stations.length - 1].name,
    from_station_id, to_station_id,    // v293+ 駅 id (A-3 resolveByServiceLine 用)
  }],
  source:         'manual',
  verified:       false,
  date_precision: 'unknown',
  _circular:      sl.circular,         // 環状線フラグ (UI 表示 + A-5 半周分割判断用)
}
```

`stations[0] → stations[-1]` の 1 segment で全線をカバー (記録モードの `resolveByServiceLine` が間の駅を全部 ridden に展開する設計に依存)。環状線は `from == to` で visit-only 相当になる落とし穴あり (A-5 で半周 2 segment 分割を検討)。

##### UI 構造

```
┌─ #bulk-summary-bar (position:sticky top:0)
│   "N 件選択中"           [💾 まとめて保存 (A-3 で実装)]
├─ .bulk-note (A-2 説明文)
└─ #bulk-checklist
    ├─ .bulk-line-item × 638
    │   [☐] [系統色 swatch] 系統名 🔄
    │                       運営会社 · N 駅
    └─ ...
```

各行は `<label class="bulk-line-item">` で囲み、行全体クリックで checkbox toggle (HTML 標準動作)。`:has(input:checked)` で gold tint。

#### `noritetsu-map.html` CSS 追加 (~15 ルール)

- `.bulk-summary-bar`: sticky top:0、`bulk-record-body` の上端固定
- `.bulk-checklist` / `.bulk-line-item`: 1 行 ~50px、hover で背景濃く、checked で gold tint
- `.bulk-line-swatch`: 系統色 14px 円
- `.bulk-save-btn`: disabled 時 opacity:.4 + cursor:not-allowed

#### `sw.js` v400 → v401

### 検証 (preview eval)

| シナリオ | 期待 | 実測 |
|---|---|---|
| `SERVICE_LINES.length` | ~638 | 638 ✅ |
| open → 描画件数 | 638 アイテム | 638 ✅ |
| 先頭アイテム (山手線) | name + 🔄 + "JR東日本 · 30 駅" | "山手線 🔄" / "JR東日本 · 30 駅" ✅ |
| 2 件チェック | summary "2 件選択中" + draft.length 2 | OK ✅ |
| アンチェック 1 件 | summary "1 件選択中" + 残 1 件 | OK ✅ |
| draft 内容 (山手線) | from=東京 to=有楽町 circular=true dp=unknown | 一致 ✅ |
| draft 内容 (中央線快速) | from=東京 to=高尾 circular=false | 一致 ✅ |
| close → cleanup | sheet hide + draft.size=0 + body 空 | 全 OK ✅ |
| console error | 0 | 0 ✅ |
| js-syntax-guard サブエージェント | ESM clean + 衝突なし | OK ✅ |

### 設計判断ログ

#### draft state を Map にした理由

`Array` だと「チェック済みかどうか」を毎回 find する必要があり、O(N×N) になる (チェック反転で頻繁に発生)。`Map<lineId, draft>` なら `has/set/delete` 全て O(1)。

#### 全 638 件を一度に描画 (A-2 段階)

検索/フィルタは A-4 で実装する設計だが、A-2 段階で virtualization (windowing) を入れるか迷った。

| 方式 | 採用 |
|---|---|
| 全件 DOM 一度描画 | ✅ 638 行 × 5 子要素 = ~3000 要素、現代ブラウザでは問題なし。実装単純 |
| virtual scroll | ❌ A-4 で「近く絞り込み」が入ると常時 100 件未満になる想定。前倒し最適化は不要 |

#### 環状線 (`circular: true`) の扱い

- A-2 段階: 🔄 マークで視覚的に区別、segment は `stations[0]→stations[-1]` で同名駅同士 (visit-only 相当)
- A-5 で展開: ユーザーが accordion 開けば編集できる
- A-3 保存: visit-only として扱われ、地図には 1 駅分しか塗られない問題あり
  - 対応案 1: 環状線専用ロジック (mid 駅で半周 2 segments に自動分割)
  - 対応案 2: A-5 でユーザーに気付かせる UI (「環状線は経路指定が必要」warning)
  - → A-3 で意識した上で、A-5 設計に持ち越し

#### `_bulkDrafts.clear()` を open でも実施

「一旦閉じて開き直したらチェック状態を戻したい」というニーズはありえるが:

- 一括記録は「短時間で一気にやる」想定 (ライト層 onboarding / マニア層 遡及入力)
- 中断・再開ニーズは A-3 一括保存後の「次のセット」が来るまでで、保存後は自然にクリアされる
- ブラウザ離脱と open/close 差を作ると state 整合性のテストが増える

→ open 毎にクリーン状態で開始。中断中の永続化 (sessionStorage 等) は将来要望が出たら検討。

#### サマリバー位置: 上部 sticky

ボタンの位置に迷ったが、

- 上部 sticky: スクロール中も「N 件選択中 + 保存」が常に見える → ✅ 採用
- 下部 fixed bar: モバイルでフッタ UI を増やすと記録モード FAB と干渉
- 末尾: スクロールが必要、フィードバック性が悪い

### 残課題 / 次のステップ

- **A-3 (次)**: 一括保存 — `_bulkDrafts` の値をループで trip 構築 → `tripForSupabase` → `upsert`。Notion §1.3 末尾の「データの流れ」記載通り、`resolveByServiceLine` + `redrawAllLinesAfterTripChange` まで一気通貫
- 一括保存途中失敗の扱い: 部分コミット許容 (現行 saveMultiSegmentTrip と整合) vs 全ロールバック (一貫性重視)。実装時に決定
- 環状線の半周分割は A-5 まで持ち越し
- 638 件素の一覧は確かに探しづらい → A-4 検索/フィルタの優先度高い

### 関連

- §250 (v400 A-1 skeleton) — open/close 制御の基盤
- Notion §1.3「一括記録」設計確定セクション
- Notion §1.3 落とし穴「date_precision='unknown' の集計経路」 = A-7 で検証

---

## 250. v400 — 一括記録 (まとめて記録) A-1 着手: skeleton + マイページ旅程タブ上部にエントリボタン (2026-05-28)

### 背景

§249 (v399, B-4-b) で trip 詳細エディタ抽出 B カテゴリ完結 = `createTripDetailEditor` factory に **3 mode (per-seg-chip / per-seg-rows / trip-level) + multi-container API** が揃った。これで Notion §1.3「一括記録 (まとめて記録)」設計確定の本体 (A カテゴリ) に着手できる前提が整った。

Notion §1.3 末尾の実装段階見通し:

1. マイページに「過去の乗車をまとめて記録」エントリ + 空マップ時オンボーディングバナー
2. 地図にかぶせるボトムシート (営業系統チェックリスト + 検索 + フィルタ)
3. タップで draft trip 生成 (`source=manual, verified=false, date_precision='unknown'`)
4. アコーディオン展開で `createTripDetailEditor` (`trainPicker='per-seg-rows'`) を行内 mount
5. 一括保存 (Supabase POST batch)

これを段階分解した A-1〜A-7 の最初 = **A-1: skeleton (open/close + 空ボトムシート + 入口ボタン)**。

### A 段階分解

| 段階 | 内容 |
|---|---|
| **A-1 (v400)** | skeleton: `js/21-bulk-record.js` 新設 + マイページに「📋 過去の乗車をまとめて記録」エントリ + 空ボトムシート開閉 |
| A-2 | 営業系統チェックリスト本体 (642 系統、まだ検索/フィルタなし) + たたむモード (タップ = ゼロ摩擦 draft 1 件) |
| A-3 | 一括保存 (draft 配列ループ → trip 構築 → Supabase upsert → resolveByServiceLine → redrawAll)。MVP 完成 |
| A-4 | 検索 + フィルタ (近く / 会社 / 都道府県) + 既定「近く」並べ替え |
| A-5 | アコーディオン展開 = factory `createTripDetailEditor` (`trainPicker='per-seg-rows'`) を行内 mount |
| A-6 | 空マップ時オンボーディングバナー (入り口 (b)) |
| A-7 | unknown 完乗率/塗り集計まわりの検証 + 必要なら期間フィルタ別経路化 |

### 実装

#### 新規 `js/21-bulk-record.js` (~70 行 / skeleton)

ファクトリ的な pure module。`window.NORIRECO.bulkRecord` namespace を初期化し、`openBulkRecordSheet()` / `closeBulkRecordSheet()` の 2 関数を export + `window` 公開。

- `openBulkRecordSheet`: `#bulk-record-sheet` を取得して `.open` クラス付与、body にプレースホルダ HTML を流し込む。A-2 以降で `renderChecklist()` に差し替え予定
- `closeBulkRecordSheet`: `.open` 外し + body を空に戻す (DOM ゴミ防止)。A-5 以降は factory instance の destroy も呼ぶ

#### `noritetsu-map.html` — ボトムシート + CSS 追加

`#rec-confirm-modal` (`.memo-modal` + `.memo-sheet`) と同じボトムシート構造を流用 (z-index 200 デフォルト、確認モーダルの 9999 と衝突しない)。

```html
<div class="memo-modal" id="bulk-record-sheet" onclick="if(event.target===this)closeBulkRecordSheet()">
  <div class="memo-sheet">
    <div class="sh"></div>
    <div class="modal-title">📋 過去の乗車をまとめて記録</div>
    <div class="modal-sub">営業系統をチェックすると、その路線を完乗 (全線) として記録します。</div>
    <div id="bulk-record-body"></div>
    <button class="btn-cls" onclick="closeBulkRecordSheet()">閉じる</button>
  </div>
</div>
```

CSS は `.mp-bulk-entry` を新設 (gold 系グラデーション + border-color gold)。

#### `js/13b-trips.js` — エントリボタン挿入

`renderMpTripsSection()` の `sec.innerHTML = ''` 直後 (フィルタバー appendChild の前) に `.mp-bulk-entry` button を生成して挿入。onclick で import 経由の `openBulkRecordSheet` を呼ぶ。

```js
import { openBulkRecordSheet } from './21-bulk-record.js';
// ...
const bulkEntry = document.createElement('button');
bulkEntry.className = 'mp-bulk-entry';
bulkEntry.innerHTML = '📋 過去の乗車をまとめて記録';
bulkEntry.onclick = () => openBulkRecordSheet();
sec.appendChild(bulkEntry);
```

import 自体が 21-bulk-record.js を module ロードさせる副作用を持つため、HTML 内の `onclick="closeBulkRecordSheet()"` (`window.closeBulkRecordSheet` 参照) も問題なく解決する。20-trip-detail-editor.js と同じパターン (HTML script タグ無しで、他 module の import 経由で間接ロード)。

#### `sw.js` — CACHE_VERSION v399 → v400 + STATIC_ASSETS 追加

`./js/21-bulk-record.js` を STATIC_ASSETS 配列に追加。

### 検証 (preview server)

- `typeof window.openBulkRecordSheet === 'function'` ✅
- `typeof window.closeBulkRecordSheet === 'function'` ✅
- `window.NORIRECO.bulkRecord` namespace ✅
- `#bulk-record-sheet` element 存在 ✅
- `renderMpTripsSection()` 直接呼び出しで `.mp-bulk-entry` が `mp-trip-section` の最初の子として描画 ✅
- ボタン onclick で `openBulkRecordSheet()` 呼出 → `.open` クラス付与 + display:flex + body プレースホルダ表示 ✅
- `closeBulkRecordSheet()` で `.open` 外し + body 空化 ✅
- js-syntax-guard サブエージェント: ESM 構文 clean、新規グローバル衝突なし、import 文と export 名一致 ✅

### 設計判断ログ

#### Notion §1.3 末尾「実装段階の見通し」5 ステップを 7 段階に分解した理由

Notion §1.3 末尾は 5 ステップだが、B カテゴリの段階分解 (B-1〜B-4-b の 8 段階) と同じく、各段階を deployable な単位に切る方が安全:

- B カテゴリでは段階内エラーがあっても次段階に進む前に preview 検証で潰せた (例: §245 hotfix が §244 完了後に発覚 → 単発で修正)
- A もチェックリスト本体 (A-2) / 保存 (A-3) / 検索 (A-4) / アコーディオン (A-5) は副作用の範囲が違うため別 commit に分けたい
- 既存負債 (オンボーディング A-6) と検証作業 (A-7) を最後に回すことで、コア機能だけのリリースも選択可能に

#### `.memo-modal` 流用 vs 独自ボトムシート

確認モーダル `#rec-confirm-modal` と同じ `.memo-modal` + `.memo-sheet` を流用。

| 比較 | 採用 |
|---|---|
| `.memo-modal` 流用 | ✅ — animation, スクロール, 角丸, sh handle まで揃っている。z-index 200 で確認モーダル (9999) と棲み分け可能 |
| 独自 bottom sheet | ❌ — 既存パターンと外観が違うと違和感、CSS 二重メンテ |

#### import 経由ロード vs HTML script タグ追加

| 比較 | 採用 |
|---|---|
| 13b-trips.js から import | ✅ — 依存関係明示、ESM 的に綺麗、20-trip-detail-editor.js と同じパターン |
| HTML に `<script type="module" src="js/21-bulk-record.js">` 追加 | ❌ — 依存 graph が不明瞭になる |

`closeBulkRecordSheet()` HTML onclick が間接ロードでタイミング的に解決するかは js-syntax-guard で検証 → `<script type="module">` は defer 相当なので DOMContentLoaded 後に実行、ユーザーが閉じるボタンを押せる時点 = sheet 開いてる時点 = 既にロード済み、で問題なし。

#### A-1 で UI 骨だけにしたか

A-1 の段階で営業系統チェックリスト本体 (A-2) まで一気に作る案もあったが、

- skeleton と本体を別 commit にすることで「ボトムシート枠が想定通り表示されるか」を独立検証できる
- 確認モーダル z-index との衝突や、マイページサブタブ上部のボタン視認性は本体実装前に潰したい
- A-2 で chip リストを mount する段階で structure (`<div id="bulk-record-body">` の中に何を mount するか) が固まる

→ B-1 (skeleton) と同じく、まず骨を deploy して構造を確認する選択。

### 残課題 / 次のステップ

- **A-2 (次)**: 営業系統チェックリスト本体。`SERVICE_LINES` 642 件をリストアップ (素では破綻、ただし A-2 段階では「全件 + 検索なし」で一旦表示)、タップで `_bulkDrafts` 配列に push (`source=manual, verified=false, date_precision='unknown'`)。たたむ/開く トグル UI もこの段階で
- **A-3**: 一括保存 — draft 配列ループで trip 構築 → tripForSupabase → upsert。途中失敗時の扱い (部分コミット vs 全ロールバック) は実装時に潰す
- preview の screenshot が timeout する事案あり (modal 開閉と無関係に発生) — preview tool 側の問題と思われるため deploy 検証は実機で

### 関連

- Notion §1.3「一括記録 (まとめて記録) — noritetsu-log.html 廃止の受け皿」設計確定セクション
- §242〜§249 (v392〜v399 trip 詳細エディタ抽出 B カテゴリ完結) — A の前提となる factory

---

## 249. v399 — trip 詳細エディタ B-4-b 完了 (グローバル Map 撤廃 + 旧 cascade handler / SL chip 撤去 + 3 instance を 1 instance に統合) (2026-05-28)

### 背景

§248 (v398, B-4-a) で 13b/07 の **visible** dead code (旧 14 関数 + HTML 19 element) を撤去。残り B-4-b は規模が大きい 3 セット:

1. グローバル `NORIRECO.trains.selectedXxxBySl / activeChipSlId` Map 撤廃 + `selectedTrainId / Name / Category / CarModel` (非 BySl) 撤廃
2. 02-data-loaders の旧 cascade handler (`onTrainCategoryChange / onTrainChange / onTrainCustomInput / onCarModelChange / onCarModelCustomInput`) + `resetTrainSelector` 撤去
3. 07-record-mode の旧 SL chip ロジック (`applyRecTrainCategory / clearAllTrainSelections / populateSlVehiclePicker / selectSlChip / populateSlVehicleSelect / onSlVehicleChange / isInDropdown / onSlVehicleCustomInput`) 撤去
4. 各 modal (07/13b) で **3 instance → 1 instance** 統合 (要 factory 拡張: multi-container API)

### 設計判断 — multi-container API

旧 3 instance (`_recTimeEditor / _recDetailEditor / _recMetaEditor`、`_tripEditTimeEditor / _tripEditDetailEditor / _tripEditMetaEditor`) は各々 1 つの container に mount していた。1 instance に統合するには、各 section (time / train / delay / notes / photos) を別々の DOM コンテナに配置する必要があるため、factory `createTripDetailEditor` に **`containers: { time, train, delay, notes, photos }`** opt を追加 (従来の `container` 単一 mount と排他)。

実装方針:
- `ext = containers && typeof containers === 'object' ? containers : null` で multi-container モードを判定
- `_timeEl / _trainEl / _delayEl / _notesEl / _photosEl` は `ext.X` または内部 subdiv に分岐
- 未提供セクション (`ext.X = undefined` だが feature ON) は detached dummy `<div>` を作って innerHTML 書き込みを no-op 化
- destroy: multi-container モードでは各 section コンテナを個別 `innerHTML = ''`、単一 container モードでは `container.innerHTML = ''`

### 撤去対象

#### `js/02-data-loaders.js` (~190 行削除)
- `NORIRECO.trains` の 9 fields (`selectedTrainId / Name / Category / CarModel`, `selectedTrainCategoryBySl / IdBySl / NameBySl / CarModelBySl`, `activeChipSlId`) 撤廃 → `{TRAINS, TRAIN_CATEGORIES}` のみ
- `resetTrainSelector` 関数 (28 行) 撤去 — `<script type="module">` の export だったが 07 の `import { resetTrainSelector }` 1 箇所からも呼出無し (v392 で `_mountRecDetailEditor` に置換されたまま import 文だけ残置)
- `onTrainCategoryChange` (33 行) / `onTrainChange` (52 行) / `onTrainCustomInput` (13 行) / `onCarModelChange` (18 行) / `onCarModelCustomInput` (8 行) + window bridges 撤去 — HTML 側の `#rec-train-category` 等 element は v392 で消滅済

#### `js/07-record-mode.js` (~330 行削除)
- 旧 SL chip ロジック (`applyRecTrainCategory / clearAllTrainSelections / populateSlVehiclePicker / selectSlChip / populateSlVehicleSelect / onSlVehicleChange / isInDropdown / onSlVehicleCustomInput`) — 297 行撤去
- `_mountRecDetailEditor` helper (27 行) 撤去 — `openRecConfirm` に inline 統合
- `import { resetTrainSelector }` 撤去
- `tripFromForm` の visit-only fallback (`NORIRECO.trains.selectedXxxx` 参照) を `null` 直返しに簡素化 — 新 factory `per-seg-chip` mode は segments 空のとき train picker chip 0 個で UI が非表示、旧フォールバック値も dead

#### 3 instance → 1 instance 統合
- **07 confirm modal**: `_recTimeEditor + _recDetailEditor + _recMetaEditor` 3 変数 → 1 `_recEditor` に統合。
  - `containers: { time: #rec-time-edit-container, train: #rec-train-picker-container, delay: #rec-delay-container, notes: #rec-notes-container }`
  - `features: { timeRow: isGps ? false : {precisions: 5精度}, trainPicker: 'per-seg-chip', delay: {maniaToggle, prefKey}, notes: true, photos: false }`
  - 列車マニアトグル (`#rec-train-toggle`) は HTML 外側 wrapper の visibility 制御のみ (editor は常時 mount)。save 時に `trainToggle.checked` が false なら editor の `editorSegMap` を空にして train fields を null override
  - `saveMultiSegmentTrip` の 3 回 `getDraft()` → 1 回に集約 (14 行短縮)
  - `closeRecConfirm / discardRecord / saveMultiSegmentTrip` の destroy も 3 → 1 に集約
- **13b trip-edit modal**: `_tripEditDetailEditor + _tripEditTimeEditor + _tripEditMetaEditor` → 1 `_tripEditEditor` に統合。
  - `containers: { time: #trip-edit-time-container, train: <segs >=1 ? #trip-edit-segments : #trip-edit-train-picker-container>, delay: #trip-edit-delay-container, notes: #trip-edit-notes-container }`
  - `features: { timeRow: {precisions: ['minute','day']}, trainPicker: <per-seg-rows or trip-level>, delay: true, notes: true, photos: false }`
  - `saveTripEdit` の 3 回 `getDraft()` → 1 回に集約

#### HTML (`noritetsu-map.html`、4 element 追加 + 2 削除)
- `#rec-meta-container` → `#rec-delay-container` + `#rec-notes-container` 分割 (delay と notes を独立 container に)
- `#trip-edit-meta-container` → `#trip-edit-delay-container` + `#trip-edit-notes-container` 分割

### 検証

`js-syntax-guard` サブエージェントで構文 clean + 削除済み変数の宣言ゼロ + 旧 HTML id 参照ゼロ + 循環 import なし確認。

preview server (`python -m http.server 8000`) で直接 factory 単体テスト + 各モーダル mount テスト + round-trip 検証:

| Test | 期待 | 結果 |
|---|---|---|
| factory multi-container 直接 mount (time/train/delay/notes 4 container) | エラー無し + 全 section 内容描画 + getDraft 返却 | ✅ error=null, timeFilled=5314, trainFilled=3820, delayFilled=1184, notesFilled=430, draftSegs=1 |
| 13b trip-edit modal open (segments 0、trip-level mode) | 単一 editor で 4 section mount | ✅ err=null, segContent=48 (read-only "from→to"), timeContent=1652, delayContent=957 (header 含む), notesContent=430 |
| 13b saveTripEdit round-trip (delay 1h30m + notes 入力 → localStorage 反映) | 90 min + notes 文字列保存 | ✅ afterDelay=90, afterNotes="test note v399 B-4-b", afterDate 維持 |
| 07 openRecConfirm (visit-only、manual) | 単一 editor で 4 section mount (5 精度 time + per-seg-chip train + maniaToggle delay + notes) | ✅ err=null, timeFilled=5314 (精度 select 含む), trainFilled=3282, delayFilled=1195 (mania toggle 含む), notesFilled=430 |
| 07 onRecTrainToggle ON/OFF | wrapper の display 切替 + editor 残置 | ✅ checked/pickerDisplay 同期、editor 維持 |

console error 0。

### 落とし穴 (SW キャッシュ汚染)

preview server で v398 → v399 sw.js bump 後、`SW unregister + caches.delete()` を試みても、ページが再 register した SW が v399 cache に **古い v398 内容を再キャッシュ** する事象に再遭遇 (v397 §247 末尾の落とし穴と同形)。原因仮説: networkFirst の `fetch(request)` が HTTP 304 を返した場合 `response.ok=false` で fallback → cached old content をそのまま return。本番 (Cloudflare Pages) では mtime が更新されて 304 が出ないため再現しない。検証は **直接 `import('/js/xxx.js?bust=...')` で fresh module を読み込んでから `window.xxx` 経由で modal 操作** する方法で完遂。

### 削除行数合計

- 02-data-loaders.js: ~190 行
- 07-record-mode.js: ~330 行
- 13b-trips.js: ~70 行 (3 instance destroy/getDraft の重複削除)
- 20-trip-detail-editor.js: +50 行 (multi-container 分岐 + destroy 拡張)
- **正味 ~540 行削除**、可読性大幅向上

### 残課題

trip 詳細エディタ抽出フェーズ (B カテゴリ) これにて完了 = 確認モーダル中身の 02/07/13b 3 箇所重複が完全に factory 経由に集約され、グローバル可変 state も撤廃。次は **A (一括記録パネル本体着手)** — Notion §1.3 設計確定済、factory が揃ったので一気に作れる。

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

