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

## 241. v391 (no deploy) — サブエージェント `js-syntax-guard` 配置 (Notion 「🤖 サブエージェント方針」実装) (2026-05-27)

### 背景

Notion 「🤖 サブエージェント方針 — 調査・検証の切り出し」(2026-05-26 ドラフト) で次の方針が確定していた:

- サブエージェントは「本筋のコンテキストを汚さず、調査と検証を切り出す」方向で使う。**実装の並列化には使わない**。
- 組み込み Explore を意識的に使う (read-only, 既定 Haiku, 設定不要)。
- custom サブエージェントは **read-only の構文＆グローバル衝突ゲート 1 個だけ** から始める。
- 多段パイプライン (PM→設計→実装→QA) は今はやらない (ソロ + 13 ファイル密結合フロントには過剰)。

これを実装した最初の (そして当面唯一の) custom subagent が `js-syntax-guard`。

### 配置

`.claude/agents/js-syntax-guard.md` (Notion ドラフトそのまま):

```yaml
---
name: js-syntax-guard
description: js/*.js や *.html を編集した直後に必ず使う。乗レコ(noritetsu-map)の ESM 構文エラーとグローバル衝突を検出する read-only チェッカー。問題の報告のみ。絶対に編集しない。
tools: Read, Grep, Glob, Bash
model: haiku
---
```

本文は以下 2 つの再発事故を仕組みで踏まなくするためのプロンプト:

1. **ESM 固有の構文エラーや関数内 const 重複を plain な `node --check` が見逃す** (CommonJS として解釈するため。**v372 教訓**)。エージェントは必ず `node --check --input-type=module < <file>` を使う。
2. **グローバルスコープを共有する複数ファイル間で、トップレベルの `const` / `let` / `function` 名が衝突 → アプリ全体が SyntaxError** (**v127 教訓**: `const grid` を `09-tabs-stats` と `07-record-mode` の両方で宣言)。クラシック `<script>` 群を横断 grep。

### 設計判断

- **配置場所**: `.claude/agents/` (project スコープ・git 管轄)。Notion ページは「方針と参照ドラフトのみ、実体は git」と明記してあるため二重管理回避。
- **モデル**: Haiku 既定。read-only + 機械的チェックで十分。
- **権限**: `Bash(node --check *)` は v273 で既に project shared 設定に許可済みのため、新規 permission prompt は出ない見込み。
- **CLAUDE.md には書かない**: Notion 方針が「任意ヘルパー」と位置づけているため、強制化しない。push フック (TODO 「PreToolUse (git push) フックの設計と実装」) が最終ゲート (強制・ブロック) として後で入る想定で、サブエージェントは編集ループ中の早期検出という役割分担。
- **deploy 不要**: `.claude/` 配下は Cloudflare Pages の deploy 対象外 (dot-dir は無視される慣例) かつ public/cdn には出ないため、`sw.js` CACHE_VERSION は v390 のまま据え置き。

### 既存の仕組みとの棲み分け (Notion 方針より)

- サブエージェント = 編集ループ中の早期検出 (コンテキストを汚さず・任意)
- PreToolUse(git push) フック (TODO §🔧) = 最終ゲート (強制・ブロック)

役割が違うので両立する。重複ではなく層。

### 動作確認

現セッション中に `subagent_type: js-syntax-guard` で呼び出してみたところ:

```
Agent type 'js-syntax-guard' not found. Available agents: claude, claude-code-guide, Explore, general-purpose, Plan, statusline-setup
```

Claude Code は SessionStart 時に `.claude/agents/` を読み込む仕様のため、**次セッション起動後から認識される想定**。配置自体は完了。

利用方法 (次セッション以降): js/*.js や *.html を編集した直後に Agent ツールで `subagent_type: js-syntax-guard` を指定して呼び出す。description が「編集した直後に必ず使う」なので、Claude 本体が自動委譲する判断も期待できる。

### 残課題

- 次セッションで実ファイル編集 → 自動委譲が走るかの動作確認
- PreToolUse(git push) フック (TODO 🔧) と統合した最終ゲート設計

---

## 240. v390 — 手動記録保存後、駅アクションシートのカウントが即座に反映される (2026-05-27)

### 背景

ユスケ報告:
- マップ上で「ここから手動記録を始める」→ 経路選択 → 保存
- 同じ駅をタップして駅アクションシートを開くと「この駅を含む旅程 (なし)」と表示される
- マイページタブを開いてから戻ってくると「この駅を含む旅程一覧 (1)」と正しく表示される

→ 保存直後は `_mypageCache` (マイページの trips 配列) に新 trip が反映されていない。マイページを開くと `loadMypageTripsIfNeeded` が Supabase から再 fetch して cache を更新するので、戻ってくると正しく見える。

### 原因

`saveAndCloseRec` (`js/07-record-mode.js:1452` 周辺) は以下を更新していた:
- ✅ localStorage `norireco_trips`
- ✅ `RIDDEN_SEGS`
- ✅ `rideRecord.rebuild()` → slRiddenSt / slStopType / slVisitCount
- ✅ `redrawAllLinesAfterTripChange()` → マップ再描画
- ✅ `updateOverlays()` → ヘッダ完乗率
- ❌ `_mypageCache` には触らず → 駅アクションシート / マイページタブ表示が stale

### 修正

`saveAndCloseRec` 末尾に追加 (`js/07-record-mode.js`):

```js
// _mypageCache が初期化済 (Array) なら append。未初期化 (undefined) なら触らず
// 次に必要になったタイミングで lazy fetch に任せる (空配列にしてしまうと lazy fetch が走らなくなる)
try {
  const mc = NORIRECO.mypage?.state?._mypageCache;
  if (Array.isArray(mc)) mc.push(trip);
} catch (e) {}

// 駅アクションシートが trip リスト表示中なら再描画 (v389 で delete 側に入れた仕組みの対称適用)
try { NORIRECO.stationActions?.refreshTripListIfOpen?.(); } catch (e) {}
```

`sw.js`: CACHE_VERSION v389 → v390

### 設計判断

- **未初期化 (undefined) のときは触らない**: `_mypageCache` は「マイページを一度も開いていない or 駅アクションシートから lazy fetch がまだ走っていない」状態だと undefined。ここで `[trip]` を入れてしまうと、次にマイページを開いたとき `loadMypageTripsIfNeeded` が「もう cache ある」と判断して Supabase 再 fetch をスキップしてしまい、他デバイスから入れた trip が見えなくなる。`Array.isArray` ガードで初期化済のみ append にする。
- **削除側 (v388/v389) との対称性**: delete 側で `applyDateFilter()` + `refreshTripListIfOpen()` を呼んでいるのと同じ精神。save 側にも対称適用。

### 検証 (preview MCP)

dynamic import で 07-record-mode.js を fresh load、save 末尾の新ロジックを単離して 3 ケース検証:

- **A: cache 初期化済 ([] / Array)**: `mc.push(trip)` で length=1 ✓
- **B: cache 未初期化 (undefined)**: `Array.isArray` で false → 触らない (`typeof === 'undefined'` 維持) ✓ (lazy fetch path 保持)
- **C: refreshTripListIfOpen 呼出 (modal 閉じ + currentMs=null)**: 何も throw せず no-op ✓

ローカル SW HTTP cache 制約は v388/v389 と同じ。本番デプロイ後に手動記録 → 同駅再タップで即時カウント反映を確認してください。

---

## 239. v389 — 旅程削除後に駅アクションシートの trip カードも即座に消える (2026-05-27)

### 背景

v388 で削除→マップ即時反映は入ったが、ユスケから追加報告: 駅アクションシートの **「この駅を含む旅程」一覧モーダル内のカード自体** は「削除しました」トースト後も残ったまま (リロードで初めて消える)。

`deleteTripFromMypage` は `_mypageCache` を filter / `applyMpSection` / `applyDateFilter` (マップ) を呼ぶが、駅アクションシート (`station-action-modal`) の trip リスト DOM は触らないため、削除直後の見た目に取り残されていた。

### 修正

- `js/17-station-actions.js`:
  - `refreshTripListIfOpen()` を新規追加し `NORIRECO.stationActions.refreshTripListIfOpen` として公開。
  - `S.currentMs` がセットされ、`station-action-modal` が `.open` で、かつ `#sa-actions` が trip 一覧モード (「を含む旅程」or「この駅を含む旅程はまだ」ラベル検出) のときだけ、`getTripsAtStation(ms)` + `renderTripListInSheet` で再描画。それ以外は no-op。
- `js/13b-trips.js`:
  - `deleteTripFromMypage` 末尾に `try { NORIRECO.stationActions?.refreshTripListIfOpen?.(); } catch(e) {}` を追加。
- `sw.js`: CACHE_VERSION v388 → v389

### 設計判断

- **public API は名前空間 bridge** (`NORIRECO.stationActions.refreshTripListIfOpen`): 13b → 17 への直 import を増やすと依存方向が広がるため、既存の bridge パターン (17 の各メソッドが NORIRECO.stationActions に並んでいる) に合わせた。
- **trip 一覧モードの検出は innerHTML 文字列マッチ**: 「を含む旅程」/「この駅を含む旅程はまだ」のラベルが他用途で出ない前提。専用 data 属性を足す案も検討したが、現状唯一の判定なので軽量に。

### 検証 (preview MCP)

fresh dynamic import で `refreshTripListIfOpen` が NORIRECO 名前空間に公開されていることを確認後、_mypageCache に synthetic trip を入れて DOM を trip 一覧モードに置き、3 ステップで検証:

- **初期**: trip カードが DOM に存在 ✓
- **`_mypageCache=[]` にして refreshTripListIfOpen 呼出**: カード消える + 「この駅を含む旅程はまだありません」表示 ✓
- **モーダル閉じた状態で呼出**: 何も書き換わらない (no-op) ✓

ローカル SW HTTP cache の制約は v388 と同じ。本番デプロイ後に視認確認お願いします。

---

## 238. v388 — 旅程削除後にマップへ即時反映 (リロード不要に) (2026-05-27)

### 背景

ユスケから「マップのモーダル (駅アクションシート →「この駅を含む旅程」一覧) から旅程を削除しても、マップにすぐ反映されずリロードが必要」報告。

`deleteTripFromMypage` (`js/13b-trips.js:1055`) は:
- ✅ Supabase 側で DELETE
- ✅ localStorage の `norireco_trips` から filter out
- ✅ `_mypageCache` からも除去 (mypage 側 UI は即座に更新)
- ✅ `applyMpSection()` でマイページ再描画
- ✅ 完乗率カード再計算
- ❌ **マップ側 (`RIDDEN_SEGS` / `slRiddenSt` / `slStopType` / `slVisitCount`) は更新せず、`drawLines()` も呼ばない**

→ マップ上の駅ドット / パイチャート / 路線実線 (= 乗車済) は古いまま、リロードで初めて反映されていた。

### 修正

`js/05-supabase-data.js` の `applyDateFilter()` を **export** 化。この関数は元々:
- localStorage から trips 再読込
- `RIDDEN_SEGS` 再構築
- `NORIRECO.rideRecord.rebuild()` (slRiddenSt / slStopType / slVisitCount 再計算)
- `updateOverlays()` (ヘッダ完乗率カード更新)
- `drawLines()` (地図再描画)

を 1 関数で一気通貫に行う。trip 削除後にこれを 1 回呼ぶだけで「localStorage 変更 → マップ反映」の全層が揃う。

`js/13b-trips.js`:
- `import { filterTripsByDate, applyDateFilter } from './05-supabase-data.js'` に `applyDateFilter` 追加
- `deleteTripFromMypage` 末尾 (applyMpSection / 完乗率カード再描画 の後) で `try { applyDateFilter(); } catch(e) {}` を呼ぶ

`sw.js`: CACHE_VERSION v387 → v388

### 検証 (preview MCP — 部分)

ローカルで end-to-end の動作確認は SW `networkFirst` の HTTP cache バイパス不全 (v385 検証で記録済) のため不可:
- ブラウザの HTTP cache が古い `/js/05-supabase-data.js` を返し続け、SW の cache.put がそれで上書き → 何度 reload しても古い JS が動く
- query string 付きで fetch すれば fresh content が取れることを確認 (HTTP cache miss する)

そこで以下で代替検証:
- **静的 source 検証**: `applyDateFilter` の export 化 ✓、`13b-trips.js` の import 行に追加 ✓、delete 末尾の `try { applyDateFilter(); } catch(e) {}` 挿入 ✓
- **dynamic import 単体**: `import('/js/05-supabase-data.js?_v=N')` で fresh load した applyDateFilter を実行 → `rideRecord.rebuild` が呼ばれることを spy で確認 ✓
- **syntax check**: 両ファイル `node --check --input-type=module` pass ✓

本番 (Cloudflare Pages) は CACHE_VERSION v388 bump + fresh 訪問者の HTTP cache miss で確実に反映される (v385 と同じ理屈)。

### 残課題

- 旅程**編集** (`saveTripEdit`) も同様の地図反映不足あり。ただし編集の典型ケース (車両形式 / メモ / 遅延の変更) は slRiddenSt / slStopType / slVisitCount を変えないので影響軽微。train_category の変更だけ地図表示と関係があるが、現状は触らず据置。必要になったら同じ `applyDateFilter()` 呼び出しで対応可
- SW `networkFirst` の `fetch(request, { cache: 'reload' })` 化 (v385 既述の dev DX 改善)

---

## 237. v387 — 駅フィルタ「乗車のみ」が実質効かない問題を解消 (`slStopType` 集計を `slRiddenSt` と同ループに統合) (2026-05-27)

### 背景

ユスケから「マップ表示、◎乗車だけ ON にしても乗車でない駅まで表示される」報告。スクリーンショットで駅フィルタ box の "◎乗車" だけ active なのに、alighted/passed のはずの駅 (始終駅・通過駅) も大量に表示されていた。

### 原因

`slStopType` の集計が `slRiddenSt` と別パスで実装されていた。

- `slRiddenSt` 側 ([js/04b-ride-record.js:311](js/04b-ride-record.js:311) 周辺): seg.lineId の直接 match 失敗時に **3 段 fallback** (`candidateN02Ids` → `resolveByServiceLine` → `resolveServiceTrip` → `resolveSegments`) で SERVICE_LINE を探し、見つかれば駅を ridden 化していた。
- `slStopType` 側 ([js/04b-ride-record.js:383](js/04b-ride-record.js:383) 周辺): `SL.find(x => x.id === seg.lineId)` のみ。**fallback 一切なし**。

結果、旧形式 trip (`seg.lineId` が N02 id `auto_中央線_東日本旅客鉄道` 等) は:
- `slRiddenSt` には fallback 経由で登録される
- `slStopType` には登録されない
- 描画側 ([js/08-rendering.js:705](js/08-rendering.js:705)) の `slStopType[ms.id] || 'boarded'` フォールバックで **全駅が一律 "boarded" 扱い**
- → フィルタ「◎乗車」を ON にすると本来 alighted/passed の駅も「boarded として表示」されてしまい、実質フィルタが機能しない

ユスケの環境は migration 前の旧 N02 形式 trip がまだ多く残っていたためこの問題が顕在化。

### 修正

`slStopType` 集計を `slRiddenSt` ループに統合 (2 パス → 1 パスへ):

- 旧第 2 パス (lines 383-405) を削除
- 第 1 パス内で `targetSl` 確定後、`slRiddenSt` / `slVisitCount` への add と同時に `slStopType` も `_mergeStopType(stId, stype)` で集計
- direct match 経路 (fromIdx/toIdx in targetSl): 位置で stype 判定 (fromIdx=boarded / toIdx=alighted / 中間=passed)
- resolve fallback 経路: 駅名で stype 判定 (`stName === seg.from` → boarded / `=== seg.to` → alighted / それ以外 → passed)

副次効果: 同じ seg を 2 回ループ走査していた処理が 1 回で済むので軽くもなる。

### 検証 (preview MCP)

synthetic RIDDEN_SEGS を `RIDDEN_SEGS` に注入して `rebuild()` 実行:

- **新形式 seg** (`lineId='jr_chuo_rapid'`, from='東京', to='八王子'): 直接 match 経路で集計 → 東京=boarded / 吉祥寺=passed / 八王子=alighted ✓
- **旧形式 seg** (`lineId='中央線_東日本旅客鉄道'` = N02 id, 同 from/to): resolve fallback 経路で集計 → 同 3 駅 同じ stype に正しく分類 ✓ (修正前は何も登録されず 'boarded' フォールバックされていた)
- `Object.keys(slStopType).length` = 22 (東京〜八王子間の駅数とほぼ一致)
- 検証後 `RIDDEN_SEGS` を元に戻して再 rebuild、副作用なし

### 残課題

- (実機ユスケアカウントで「◎乗車のみ ON」で本当に表示数が減るか) 本番 deploy 後に視認確認

---

## 236. v386 — ロゴクリックでマップ画面トップへ遷移 (2026-05-27)

### 背景

ユスケから「左上のロゴ (乗レコ NORITSUBU MAP) をクリックすると `https://norireco.app/noritetsu-map` をクリックしたのと同じ状態に遷移できると良い」要望。
従来は `<div class="logo">` で無反応 (cursor も default)。マイページ深堀り中などに「マップ画面のトップに戻りたい」操作が想定通りに動かない細かい不便。

### 変更

- `noritetsu-map.html`:
  - `.logo` の CSS に `text-decoration:none;color:inherit;cursor:pointer;` + `:hover` で em の opacity を僅かに下げる
  - `<div class="logo">` を `<a class="logo" href="noritetsu-map.html" title="マップ画面トップへ">` に変更
- `noritetsu-log.html`: 同様の修正 (log 画面のロゴもマップ画面へ)
- `sw.js`: CACHE_VERSION v385 → v386

### 検証 (preview MCP)

- 静的: `fetch('/noritetsu-map.html')` / `fetch('/noritetsu-log.html')` で `<a class="logo" href="noritetsu-map.html">` 形式の置換を確認 ✓
- 動的: ブラウザロード後 `document.querySelector('.logo')` が `<a>` 要素で `href=noritetsu-map.html` / `title=マップ画面トップへ` / `cursor=pointer` / `text-decoration=none` / `color` 継承 / `font-size 19px / font-weight 900` 維持 ✓
- スクリーンショット: ロゴ見た目変化なし、マップ表示は遷移後の default state (日本全体) ✓

### 設計判断

- **href は相対パス** (`noritetsu-map.html`): localhost と本番 (Cloudflare Pages が `/noritetsu-map` ↔ `/noritetsu-map.html` 両対応) どちらでも素直に動く。
- **`<a>` への置換は安全** (HTML5 で a は block content OK)、追加 JS なし。
- log 画面のロゴも同時に対応 — 「ロゴ=ホーム=マップトップ」のメンタルモデルを統一。

---

## 235. v385 — 確認モーダルに「乗換あり旅程の時刻仕様」注記を追加 (2026-05-27)

### 背景

データモデル調査の延長で、ユスケから「乗換ありで記録すると全体の乗車時間は正しく合うが、segments[] には時刻フィールドが無いので個別系統の乗車時間統計を出したら 0 分になる。この仕様を保存前に説明書きしておきたい」という要望。

確認したところ:
- `tripSegments.push({...})` は `lineId / from / to / from_id / to_id / train_category / train_id / train_name / car_model` のみ書き込み (depart_time / arrive_time / total_minutes は **trip 直下のみ**)
- マイページの 16 統計を見ても「路線別の乗車時間」統計は現状未実装 (路線タイムラインは初回/最新乗車日と完乗達成日のみ)
- ただしデータモデル上は 0 分扱いとなるため、将来「路線別乗車時間」統計を追加すれば顕在化する制約

### 設計判断

- **注記位置は記録モード確認モーダル** (`openRecConfirm`) — 保存ボタンを押す直前に見える位置。旅程編集モーダルは保存済 trip の編集なので注記不要 (新規記録時に伝われば十分)。
- **表示条件は `R.segments.length >= 2`** (= 乗換あり)。1 区間や立ち寄りでは無関係なので非表示。
- **代替手段の案内も同梱**: (1) 系統ごと分割記録 / (2) 乗換時の待ち時間は「📍 立ち寄り」(1 駅だけ選択して保存) で記録 — ユスケ依頼の通り 2 つの選択肢を併記。
- **styling は既存 info-box (rec-edit-unknown-row) に合わせる**: `background:rgba(95,181,255,.08) + border-left:3px solid #5fb5ff`。新規 CSS class は作らず inline で。

### 変更

- `js/07-record-mode.js`
  - `openRecConfirm` (multi-segment branch、line 786 周辺): `const transferNoteHtml = (R.segments.length >= 2) ? \`...\` : '';` を追加し、body.innerHTML 内で `🚉 駅数 / 区間` 行と `${timeRowHtml}` の間に挿入。
- `sw.js`: CACHE_VERSION v384 → v385

### 検証 (preview MCP)

NORIRECO.record の selection / segments を 3 ケース synthetic に注入して `openRecConfirm` 実行:

- **(1) 乗換あり** (segments=2、東京→新宿 [中央本線] / 篠ノ井→塩尻 [篠ノ井線]): 注記表示 ✓、テキスト 全文一致確認 ✓
- **(2) 乗換なし** (segments=1、東京→新宿): 注記非表示 ✓
- **(3) 立ち寄り** (visit-only、東京 1 駅): 注記非表示 ✓
- スクリーンショット: 駅数/区間行と乗車時刻行の間に青系 info-box で「ℹ️ 乗換あり旅程の時刻仕様」見出し + 本文 + 2 bullet が想定通り表示 ✓

### 補足: 検証時の SW キャッシュ罠

preview MCP で `noritetsu-map.html` を reload しても新コードが見えなかった。原因は **`networkFirst` の `fetch(request)` がブラウザの HTTP cache を経由していて古い JS を取得 → cache.put で SW キャッシュも古い内容で上書き**。一度キャッシュが汚れると `fetch('/js/x.js')` は古いまま、`fetch('/js/x.js?bust=N')` や `fetch(url, {cache:'reload'})` だと新しいバイト数で取れることを確認した。

本番では CACHE_VERSION を毎 push で bump するので最終的には反映されるが、**SW の `networkFirst` に `cache: 'reload'` または `cache: 'no-store'` を付ける改善余地あり** (将来の TODO)。今回は ESM 動的 import (`import('/js/07-record-mode.js?_freshtest=' + Date.now())`) でモジュール再評価して `window.openRecConfirm` を上書きし、無事ブラウザ render を確認できた。

### 残課題

- SW `networkFirst` の HTTP cache バイパス改善 (低優先) — preview MCP 検証の DX 改善のみ、本番影響なし

---

## 234. v384 — 旅程編集モーダル: cat 切替時の DOM 値残り問題を解消 (2026-05-27)

### 背景

v383 で旅程編集モーダルにも per-seg フル cascade を入れた直後の残課題。`applyTripEditSegCategoryVisibility` が cat 別に visibility を切り替える際、`cat='local'` 分岐は `carInpEl.value` を、`cat=other` 分岐は `tnameEl.value` と `carInpEl.value` をクリアせず、HTML レンダ直後の値をそのまま温存していた。これは初期 render では `restoreTripEditSegCascade` が直後に値を書き戻す前提で機能していたが、ユーザー操作で cat を切替えると以下の stale 値残りが起きていた:

- local (211系) → 特急 に切替: carInp の "211系" が残ったまま master cascade に進む
- 特急 (__custom__ + 手入力列車名 + 手入力車両) → local: 手入力列車名 / 手入力車両がそのまま残る

CHANGELOG §233 の残課題で「helper に input clear を足す」または「記録モード `selectedXxxBySl` 形式の Map 管理に統一」のどちらかを選ぶ判断を保留していたもの。

### 設計判断

- **DOM 直接管理を維持、helper を「cat 切替後に常にクリーンな状態」役割に統一** (Map 不採用)。
  - 編集モーダルは「seg 全部が常に画面上に並ぶ」UI で記録モード (chip + active 1 seg のみ) と DOM 構造が違うため、per-cat Map は overkill。
  - 副作用: cat を A→B→A と往復しても A の前回値は復活しない (記録モードは復活する)。これは「編集モーダルで cat を変える=新しい値を入れ直す意思」と解釈して許容。
- **helper でクリア + restore で書き戻し**: 既存の cat=other 経路は restore が必ず seg.car_model を書き戻すので問題なし。**cat='local' は従来 restore が早期 return していたため helper クリアと両立しない** → restore に local 分岐を追加して seg.car_model を書き戻すよう拡張。
- **代替案 (採用せず)**: helper を「visibility 専任」に絞り、クリアは `onTripEditSegCategoryChange` 側に置く案も検討したが、helper の責務が「visibility に応じた DOM 状態の確定」なので値クリアも helper に集約した方が呼び出し側が短くなる。

### 変更

- `js/13b-trips.js`
  - `applyTripEditSegCategoryVisibility` (line 580 周辺):
    - `cat='local'` 分岐: `if (carInpEl) { carInpEl.style.display = 'block'; carInpEl.value = ''; }` に変更 (value クリア追加)
    - `cat=other` 分岐: `if (tnameEl) tnameEl.value = '';` と `if (carInpEl) { carInpEl.style.display = 'block'; carInpEl.value = ''; }` を追加
  - `restoreTripEditSegCascade` (line 670 周辺): 早期 return 条件を `!cat` のみに変更、`cat === 'local'` を新分岐として追加し `carInpEl.value = seg.car_model || ''` で local の車両形式を書き戻す
- `sw.js`: CACHE_VERSION v383 → v384

### 検証 (preview MCP)

v383 と同じ 3 区間テスト trip (seg0=azusa+E353系 / seg1=__custom__+手入力 / seg2=local+211系) を `_mypageCache` に注入して `openTripEditModal` 実行:

- **初期 render**: seg0/seg1/seg2 全て期待通り値復元 ✓
  - 特に seg2 (local + 211系) が新 restore 経路で carInp='211系' に正しく書き戻されることを確認
- **cat 切替テスト** (6 ケース全パス):
  - (A) seg2 を local → limited_express: carInp='', tname='' ✓ (旧バグの 211系 残留解消)
  - (B) seg2 を express → local: carInp='', tname='' ✓ (Map 不採用方針通り前 cat 値復活せず)
  - (C) seg1 を express → local: tname='', carInp='' ✓ (__custom__ 手入力が消える)
  - (D) seg1 を local → express: tname='', carInp='' ✓
  - (E) seg0 を limited_express → shinkansen: tid='', tname='', carSel='', carInp='' ✓
  - (F) seg0 を express → '' (指定しない): 全 row hide + 全値 '' ✓

### 残課題

なし (v383 の残課題を本回で解消)。記録モードと同形の per-cat Map preservation が将来必要になれば別タスク化。

---

## 233. v383 — 旅程編集モーダルも per-seg フル cascade (マスター列車 dropdown + 車両形式 dropdown) 対応 (2026-05-27)

### 背景

v375 で記録モードは「区間ごとに完全独立」な per-seg フル cascade (カテゴリ → マスター列車 dropdown → 車両形式 dropdown) に再設計済だったが、旅程編集モーダル側は v380 までで「カテゴリ select + 列車名 input + 車両形式 input」の 3 自由入力に留めていた。CHANGELOG §223 / §229 の備考にも「編集モーダルでも候補車両 dropdown は未実装、自由入力のみ」と残課題として明記されていた。

ユスケから「編集モーダルのマスター列車 dropdown フル cascade」の指示があり、記録モード v375 と同形のカスケードを編集モーダル per-seg にも導入。

### 設計判断

- **既存自由入力 input は手入力 fallback として温存**: master 列車を選んだ後の `__custom__` (リストにない列車) や、master が `car_models[]` を持たないケース、cat='local' (普通電車) のケースで使われる。dropdown と input は併存する DOM 構造に。
- **記録モードの `selectedXxxBySl` Map は使わず DOM 直接管理**: 編集モーダルは「seg 全部が常に画面上に並ぶ」UI で、record モードの「chip + active な 1 seg のみ DOM」とは違う。Map で per-seg state を保持する必要が無いので、DOM 自体が source of truth で十分。シンプル。
- **visibility rule** (記録モード `applyRecTrainCategory` を per-seg にした版):
  - `cat=''` (指定しない) → 列車行 / 列車名行 / 車両行 全 hide
  - `cat='local'` → 列車行 / 列車名行 hide、車両行は dropdown hide + input show のみ
  - `cat=他` → 列車 dropdown show + populate、列車名行は `__custom__` 選択時のみ show、車両 dropdown は train 選択後に populate (master.car_models 空なら input fallback)
- **保存ルール** (master 列車選択時の `train_name` シャドウ書き込み):
  - master id 選択 → `train_id`=master id + `train_name`=master.name (記録モード v356 と同形)
  - `__custom__` 選択 → `train_id`=null + `train_name`=手入力値
  - 未選択 (空) → `train_id`=null + `train_name`=null
  - 車両も同様: master 車両形式選択 → そのまま採用、`__custom__` → 手入力値、未選択 → 手入力値 (空なら null)
- **trip 直下の集約は v371/v375 と同形** (全 seg 一致なら値 / 不一致なら null) — 既存ロジックを再利用

### 変更

- `js/13b-trips.js`
  - `openTripEditModal` (line 346 周辺): seg row HTML を 5 行構造 (種別 select / 列車 dropdown / 列車名 input / 車両 dropdown + 車両 input) に拡張、innerHTML 後に `segs.forEach` で各 seg の visibility + cascade 復元
  - 4 helper を新規追加:
    - `applyTripEditSegCategoryVisibility(idx, cat)` — cat 別に行表示を切替 + train dropdown populate (記録モードの `applyRecTrainCategory` + dropdown populate を 1 関数にまとめた)
    - `populateTripEditSegCarSelect(idx, trainId, restoreValue)` — 選択中 train の car_models[] を dropdown に流し込み + 既存値復元
    - `restoreTripEditSegCascade(idx, seg)` — 保存済み train_id / train_name / car_model を DOM に復元 (master 選択 → tid 採用 + car dropdown / __custom__ → train_name input show + car input show / どちらも null → 列車未選択 + car input)
    - イベントハンドラ 3 個: `onTripEditSegCategoryChange` / `onTripEditSegTrainChange` / `onTripEditSegCarChange`
  - `saveTripEdit`: per-seg dropdown 経由で `train_id` / `train_name` / `car_model` を読み取り。`segCatSels` の他に `segTrainIdSels` / `segCarSels` を新規追加、`hasPerSegInputs` 判定にも含める。`train_id` 採用時は TRAINS から master.name を引いて `train_name` にシャドウ書き込み
- `sw.js`: CACHE_VERSION v382 → v383

### 検証 (preview MCP)

3 区間のテスト trip (seg0=master 列車+master 車両 / seg1=__custom__ 列車+手入力車両 / seg2=local+手入力車両) を `NORIRECO.mypage.state._mypageCache` に注入して `openTripEditModal()` を実行:

- **復元**: seg0 列車 dropdown=azusa + 車両 dropdown=E353系、seg1 列車 dropdown=__custom__ + 列車名行 show + 車両 input show + 値復元、seg2 列車行 hide + 車両 input show + '211系' 復元 — 全パス ✓
- **インタラクション** (`window.onTripEditSegXxxChange()` 経由):
  - (A) seg2 を local → limited_express に変更 → 列車行 show + dropdown populate ✓
  - (B) seg0 列車を azusa → kaiji に変更 → 車両 dropdown が kaiji の car_models で再 populate ✓
  - (C) seg0 を `__custom__` に変更 → 列車名行 show + 車両入力 show + 車両 dropdown hide ✓
  - (D) seg0 車両 dropdown を `__custom__` に変更 → 車両入力 show + focus ✓
- **保存** (fetch をモックして `saveTripEdit()` 実行):
  - seg0: train_id='azusa' + train_name='あずさ' (master シャドウ) + car_model='テスト車両999' ✓
  - seg1: train_id=null + train_name='手入力カスタム特急' + car_model='手入力車両' ✓
  - seg2: train_id=null + train_name=null + car_model='211系' (元の値保持) ✓
  - trip 直下: train_category='limited_express' (全 seg 一致) + train_id/name/car_model=null (不一致) ✓

### 残課題

- cat 変更時に「以前の cat の値」が DOM に残る (例: local → express で 211系 が car_input に残る) — 記録モードは `selectedXxxBySl` Map で per-cat 値を分離しているが、編集モーダルは Map 不採用なので単純な DOM 上書きになる。混乱を招くようなら applyTripEditSegCategoryVisibility の cat=other 分岐に `carInpEl.value = ''` を追加するか検討。今回は「値が残る方が UX 親切」と判断して据置

---

## 232. v382 — パイチャート (divIcon) のみ alighted 倍率を 2.5 → 1.5 に調整 (2026-05-27)

### 背景

v381 で `stypeMul = 2.5` にしたが、ユスケから「パイチャートに限り 2 倍だとでかすぎ。1.5 倍にしてください」との指摘。circleMarker (普通のドット) は 2.5 が適切でもパイチャートは divIcon (HTML サイズ) なので絶対サイズが大きすぎた。

### 設計判断

- **stypeMul と stypeMulPie を分離**: 同じ alighted 駅でも circleMarker (radius) は 2.5、パイ系 (divIcon) は 1.5
- パイ系は 3 箇所 (多系統 装飾 / 多系統 平常の overlay pie / 単系統 装飾) で `stypeMulPie` を使う
- circleMarker (radius ベース) は v381 のまま 2.5 維持

### 変更

- `js/08-rendering.js:705-706`: `stypeMul` の隣に `stypeMulPie` を定義
- パイ系 size 計算 3 箇所 (`mScale * stypeMul` → `mScale * stypeMulPie`)

---

## 231. v381 — 乗降した駅 (alighted) のドットを目立たせるよう倍に拡大 (2026-05-27)

### 背景

ユスケから「乗降した駅を目立たせたい、ドット大きさは今の倍、ズームで表示するタイミングは今と同じ」との要望。

### 設計判断

- **「乗降した駅」= `stype='alighted'`** と解釈 (始点/終点/乗換)。`boarded` (乗車中だけ通過) や `passed` (別系統で通過) は据え置き
- **`stypeMul` を `1.25 → 2.5`** に変更。circleMarker の `radius` 計算と divIcon の `baseSize` 計算の両方が `* stypeMul` で乗じられているので、これだけで全描画パターン (多系統 / 単系統 / 装飾 / 平常) のサイズが倍に
- **ズーム表示タイミングは `tier` ベースの別ロジック** (`_station_tier` + bucket) なので影響なし。サイズだけ変わる

### 変更

- `js/08-rendering.js:704`: `const stypeMul = stype === 'alighted' ? 1.25 : ...` → `... ? 2.5 : ...`

### 検証

- preview の ES Module キャッシュ問題で UI 検証スキップ、本番デプロイで確認

---

## 230. v380 — 旅程編集モーダルも per-segment cascade (カテゴリ + 列車名 + 車両形式) 対応 (2026-05-27)

### 背景

v375 で記録モードが per-seg cascade に対応、v373/v377 で per-seg car_model 編集と表示まで対応した。ユスケから「マイページ旅程編集の区間も記録と同じように区間ごとに特急の中身まで選べるように」との要望。

### 設計判断

- **per-seg cascade UI** を各区間に複製: カテゴリ select + 列車名 input + 車両形式 input の 3 種
- **マスター列車 dropdown は見送り**: 編集モーダルは「微調整」用途。記録モード v375 の cascade (TRAIN マスター連動) は実装重く、また編集モーダルから cascade フル機能まで持つと UI が肥大化。**列車名は自由入力 only** とする
- **trip 単位 cascade input は hide**: segments があるとき、`#trip-edit-train-category` の親 div ごと (列車種別セクション) を hide。trip 直下入力との二重管理を回避
- **集約ルール**: 保存時に各 seg の category / train_id / train_name / car_model を更新、trip 直下は集約 (全 seg 一致なら値 / 不一致なら null)。v371 / v375 と同形
- **train_id の扱い**: 編集モーダルでは新規セットしないが、既存値は category が変わったときだけクリア。これで「マスター列車だった旅程をカテゴリだけ修正」しても train_id が温存される (列車名と矛盾するなら別途修正)

### 変更

- `js/13b-trips.js` `openTripEditModal`:
  - 区間表示の HTML 生成を拡張: 「📋 種別 / 🚆 列車名 / 🚆 車両形式」の 3 行を各区間に生成
  - `_hasSegmentsForEdit` 時、`catSel.parentElement.style.display = 'none'` で trip 単位 列車種別セクションごと hide
- `js/13b-trips.js` `saveTripEdit`:
  - `segCatSels` / `segTrainNameInps` / `segCarInputs` を query
  - `hasPerSegInputs` true なら newSegments の各 seg を category/train_name/car_model 更新、train_id は category 矛盾時のみクリア
  - trip 直下 train_category / train_id / train_name / car_model は集約 helper `aggSet(key)` で一括計算

### 残課題

- 旅程カードの per-seg train_name 表示は v377 で対応済 → 編集後の表示も自動的に追従する
- マイページ「📋 種類」フィルタ (`mpTripFilter.category`) は v378 でまだ未対応 → 段階で対応
- マイページ「車両形式コレクション」(`buildCarModelStats`) も segments 走査未対応

---

## 229. v379 — v378 hotfix: 古い trip (v374 以前) の特急が「列車制覇」に出ない (2026-05-27)

### 背景

v378 で「列車制覇」統計を segments 走査に対応したが、ユスケから「乗換ありで選んだ特急は表示されるけど、乗り換えなしの旅程の特急が表示されない」報告。

実際は「乗換なし」が問題ではなく **「v374 以前に記録した旅程」が問題**。v374 以前は `segments[]` を持つが `segments[].train_id` を持たない (per-seg 列車情報は v375 から)。v378 ロジックは `segs.length > 0` で segments を見ていたので、古い trip では segments[].train_id=undefined で集計が空になり、trip 直下の train_id にフォールバックしなかった。

### 設計判断

- **「segments の中に列車情報があれば segments、無ければ trip 直下 fallback」** に条件分岐を強化
- `segSources = segs.map(...).filter(s => s.train_id || s.train_name || s.car_model)` で「中身がある seg」だけ抽出
- `segSources.length > 0` なら segments を使う、それ以外は trip 直下 fallback
- この方が v375 以降の混在旅程と v374 以前の旧 trip 両方を正しく扱える

### 変更

- `js/09-tabs-stats.js:423-444` 付近: `segSources` フィルタを追加、`sources` を `segSources.length > 0 ? segSources : trip 直下` に変更

### 教訓

- 「segments[] が存在する」と「segments[].xxx が存在する」は別。v375 で per-seg 列車情報を追加したことで「segments があっても seg 中の xxx が無い古い trip」というケースが生まれた
- 同じ罠は他の集計 (`buildCarModelStats` / 「📋 種類」フィルタ等) にもある。今後 segments 走査対応するときは「segSources.filter で中身ありだけ」パターンを徹底

---

## 228. v378 — 「列車制覇」統計を segments 走査に対応 (2026-05-27)

### 背景

v375 で `segments[].train_id / train_name / car_model` per-seg 化したが、乗換ありで「特急 + 普通」のような混在旅程は trip 直下が集約ルール (全 seg 一致なら値 / 不一致なら null) で null になる。「列車制覇」統計 (`09-tabs-stats.js`) は trip 直下のみ集計していたため、混在旅程の特急が拾われていなかった。

ユスケから「統計に特急の乗車が反映されない / データの置き場を考えないといけない？それとも統計のほうで考える必要がある？」と相談。データ構造はもう per-seg に変えてあるので、**統計側を segments 走査に対応**するのが筋。

### 設計判断

- **trip 直下 → sources 配列に統一**: segments があれば各 seg を source として扱い、なければ trip 直下を 1 source として fallback。同じ列車に複数 segment で乗っても、Set で unique 化されるため count はダブらない
- **車両形式集計 (carModelsByTrainId / carModelsByCustomName) も per-seg**: 「あずさ E353 + 普通 E233」の旅程で E353 / E233 両方が拾われる

### 変更

- `js/09-tabs-stats.js:423-440`: `trips.forEach` 内の集計を sources 配列ベースに変更。segments 走査対応

### 残課題

- **マイページ「車両形式コレクション」(`buildCarModelStats` in `js/13a-stats.js`)** も trip 直下のみ走査 → 同じパターンで segments 対応が必要
- **マイページ「📋 種類」フィルタ (`mpTripFilter.category`)** も trip 直下のみ走査 → segments 対応が必要 (v371 で car_model だけ対応済)
- **編集モーダル (`openTripEditModal`) の per-seg cascade 対応**も未着手

これらはユスケと相談しつつ次回以降に対応。

---

## 227. v377 — 旅程カード表示を per-segment 列車・車両に対応 (2026-05-27)

### 背景

v375 で記録モードの per-seg 化が動き、ユスケから「2回乗換でもうまくできました。これにあわせて旅程の表示方法を変えてください」との要望。

v371 では `segments[].car_model` の unique 値を joining 表示 (例: `[E353系 / 185系]`) していたが、v375 で `segments[].train_name` も per-seg 保存されるようになったので、車両だけでなく列車名も区間ごとに表示したい。

旧表示の問題 (スクショ): `🚆 [ああ / 車両]` のように unique car_model だけが意味不明な joining になっていた。

### 設計判断

- **区間ごとに `train_name [car_model]` を " / " で joining**:
  - 例: `🚆 [E233-T車] / 中央線特急あずさ [E353系] / [205系]`
  - 区間ラベル ("八高線" 等) は付けない (メインタイトルに line_list が既にある)
- **train_name のみ / car_model のみ / 両方 / 両方なし** の組み合わせを 1 つの segBit で吸収
- **手入力列車** (`train_name && !train_id`) には `📝` を付けて区別 (旧仕様維持)
- **後方互換**: `segments[]` に train_name/car_model が 1 つも無い旧 trip (v375 以前) は、`trip.train_name` + `trip.car_model` の旧表示にフォールバック
- **空 segBit はフィルタアウト**: train_name も car_model も無い区間はその segment を表示行から除外。残った segBit を joining

### 変更

- `js/13-mypage-common.js:574-606` 付近: `tripCardHtml` の trainBit 構築ロジックを per-seg ベースに置換。旧 `carModelList` unique joining を撤去

### 残課題

- マイページ「📋 種類」フィルタ (train_category) は trip 直下のみ走査 (segments 走査未対応)。次回課題
- 編集モーダル (`openTripEditModal`) の per-seg cascade 対応も未着手

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

