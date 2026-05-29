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

## 268. v418 — 未ログイン (ゲストモード) で記録機能とマイページ概要を開放 + オンボーディングバナー「一瞬しか出ない」修正

**バージョン**: v418 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A (実装 / 🔥 新規ユーザー導線の改善)

### 背景

ユスケが新規 (未ログイン) ユーザー目線でアクセスした際の問題が 2 つ重なって報告された:

1. **空マップ時の📋オンボーディングバナーが「一瞬しか表示されない」** — 既ログインで Supabase 旅程あり / localStorage 空 (初回起動 or 別端末からの初アクセス) のシナリオで、DOMContentLoaded 時点でバナー表示 → 数秒後 syncFromSupabase 完了 → 3 秒後 setTimeout で hide、という挙動。ユスケから見ると「ちらっと出てすぐ消える」状態。
2. **未ログインだと触れない機能が多すぎる** — マイページは「🔑 ログインしてください」エンプティで完全に閉ざされ、🔑 📝 📍 記録 FAB も `fab-login-only` クラスで CSS 非表示。新規訪問者が「何ができるか」を試せず、ログインの判断材料が得られない。

### ユーザー要望

ユスケ:
- 「タップしてまとめて記録が一瞬しか表示されない」 → バナー直し
- 「未ログインでも、記録できるようにする」
- 「マイページの画面の概要をみれるようにする」
- 「データは反映されなくていい」 (= Supabase 反映不要、localStorage で OK)
- 「更新すると記録はのこらないので、ログインして使うように説明を表示」

範囲確認 (AskUserQuestion): 一括記録 (📋) / 手動記録 (📝) / GPS 記録 (📍) / マイページ概要 すべて開放方針で確定。

### 実装

#### 1. オンボーディングバナーの settle ゲート ([`js/21-bulk-record.js`](js/21-bulk-record.js))

`_syncSettled` フラグを追加。Supabase 同期 (または未ログイン確認) が settle するまで `updateOnboardingBanner` は `hidden=true` を強制 → フラッシュ表示を防ぐ。

- `markSyncSettled()` を新規 export。一度 true になったら戻らない (ログアウト時に lifecycle 全体が purge されるため戻り経路は不要)。
- DOMContentLoaded 直後の `setTimeout(updateOnboardingBanner, 3000)` を撤去し、代わりに 8 秒の fallback `setTimeout(() => markSyncSettled(), 8000)` を置く (ネットワーク不調・SDK 初期化失敗時の保険)。

#### 2. settle hook を呼ぶ 3 経路 ([`js/05-supabase-data.js`](js/05-supabase-data.js) / [`js/12-auth.js`](js/12-auth.js))

循環 import 回避のため `window.NORIRECO?.bulkRecord?.markSyncSettled?.()` 経由で呼ぶ。

- 05 `syncFromSupabase`: 未ログイン return / trips 0 件 return / 正常完了 / catch 例外 の 4 経路すべてで markSyncSettled。
- 12 `initializeAuth`: getSession 初期セッションなし / getSession 例外 の 2 経路で markSyncSettled (handleAuthChange → syncFromSupabase 経路は 05 側でカバー)。

#### 3. 記録 FAB を未ログインに開放 ([`noritetsu-map.html`](noritetsu-map.html))

`.record-fab`(📝) と `.location-fab`(📍) から `fab-login-only` クラスを撤去。CSS ルール (`body:not(.user-authed) .fab-login-only{display:none}`) 自体は残置 (将来用)。📋 一括記録は元から制限なし。

#### 4. 保存系の uid=null 許容 ([`js/07-record-mode.js`](js/07-record-mode.js) / [`js/21-bulk-record.js`](js/21-bulk-record.js))

「Supabase 反映なし」要件に従い、未ログイン時は `_postTripToSupabase` をスキップして localStorage のみに保存。

- saveMultiSegmentTrip: `const isGuest = !currentUserId()` で分岐。POST スキップ + トースト分岐。
- saveBulkDrafts: 同様に分岐。未ログインは savedCount に直接カウント (Supabase 失敗カウントが立たないように)。
- トースト: 未ログイン時は黄色 (`'warn'`, 9 秒) で「✅ 記録 📝: 3区間 5駅 / ⚠️ 端末内のみ・ブラウザ更新で消えます / 🔑 ログインで保存」。

#### 5. マイページ ゲストモード ([`js/13-mypage-common.js`](js/13-mypage-common.js))

`renderMypage` 未ログイン分岐を「ログインしてください」エンプティから「ゲストヘッダ + 警告バナー + 完乗率カード + サブタブ nav」に置換。

- ゲストヘッダ: アバター「?」 + 「ゲスト / 未ログイン」 + 🔑 ログインボタン
- ゲスト警告バナー (`.mp-guest-warn`): 「ゲストモードで表示中 / 記録はこの端末にのみ保存され…ログインしてください」+ CTA。
- 完乗率カード: `localStorage` から trips を直接ロードして `buildCompletionCards` に渡す (Supabase fetch は行わない = 「反映不要」要件と整合)。`SERVICE_LINES build` は await。
- サブタブ nav: 5 タブ全部表示。
  - 📊 統計 / 🚃 旅程 / 📋 路線 → `_mypageCache` (localStorage trips) ベースで動作。
  - 📸 メモ / 🔗 シェア → 既存実装が `currentUserId() === null` で「ログインが必要です」エンプティを返すので、クラッシュせずそのまま表示。
- `showAllSubpanes(false)` を撤去 (各サブペインを表示可能に)。

#### 6. ゲスト警告バナー CSS ([`noritetsu-map.html`](noritetsu-map.html))

`.mp-guest-warn` を `.mp-tm-banner` (期間フィルタバナー) と同じ位置に追加。ゴールド系のグラデーション + 左ボーダーで注意喚起。

### syntax-guard

- node --check 5 ファイル clean
- 新規循環 import なし (21 → 05/12 への上り逆参照は window 経由のみ)
- window グローバル衝突なし (markSyncSettled は NORIRECO.bulkRecord のみで露出)

### 検証 ToDo (ユスケ)

- 未ログイン (シークレットウィンドウ) で開く → マイページに「ゲストモード」ヘッダ + 警告バナー + 5 タブ。
- 📋 一括記録モーダルで 1 件保存 → トーストに ⚠️ 警告。リロード → 記録は消える (localStorage は keep されるはずなので、もし「リロードで消える」を厳格に守るなら追加検討必要 → 現状は localStorage に残るが Supabase 同期しないので「他端末では見えない」 = 実用上「消える」と説明可)。

(localStorage の永続性については別途協議。今回は最小実装で「Supabase に行かない = 紛失リスクがある」として案内している。)

---

## 267. v417 — シェアモーダルを「📤 画像」「🔗 リンク」2 ボタンに再分離

**バージョン**: v417 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A（実装 / 🔥 シェア機能 磨き込み — v415 の方針見直し）

### 背景

ユスケが Windows 実機で 📤 シェアを検証 → OS (Windows) の共有シートが立ち上がるが、**ファイルを共有する際に `text` (= /share URL) を落とす**ことが判明。v415 で「📤 1 本に統合 (画像 + リンクを caption に載せる)」とした設計が、PC では URL を渡せず機能しない。さらに OS 共有シートはアプリ管轄外なので、そこに「URL ボタン」を足すことは不可能。→ **URL は専用ボタンとしてモーダル (自前 UI) 側に置くべき**という結論。

### 設計判断

- v415 の 1 本統合を見直し、役割で **2 ボタンに再分離** (v413 の 2 系統に近い形に回帰。ただし挙動は改良):
  - **📤 画像をシェア**: 画像ファイルのみを共有 (ログイン不要)。Web Share 対応端末は OS シートに file、非対応は X intent。R2 アップロードは行わない (高速・ログイン不要に戻した)。
  - **🔗 リンクをシェア**: /share/<id> を作成して共有 (ログイン必須)。**モバイル (pointer: coarse) = Web Share で URL 共有 (X アプリ等で unfurl)** / **PC = クリップボードにコピー** (OS シートに飛ばすと URL が埋もれるため、コピーが確実)。
- v415→v416 で「📤 のフォールバックにコピーを仕込む」延命策を入れていたが、PC で OS シートが先に出てフォールバックに到達しないため無効。専用ボタン化が正解だった。

### 変更

- **`js/14-share-ogp.js`**:
  - モーダルに `#share-ogp-link-btn` (🔗 リンクをシェア) を復活 (3 ボタン: 📥 ダウンロード / 📤 画像をシェア(青) / 🔗 リンクをシェア(緑))。
  - `shareCurrentCanvas` を純画像共有に戻す (`shareImageOnly` を呼ぶだけ。R2 upload / insert を除去)。
  - `shareImageWithLink` (v415 で追加した「画像+リンク」共有) を撤去し、`shareCurrentLink` (リンク専用) を新設。touch 判定 (`matchMedia('(pointer: coarse)')`) で Web Share / clipboard を分岐。`uploadShareImage` / `insertShareRecord` / `shareTextWithoutUrl` は流用。
- **`sw.js`**: CACHE_VERSION v416 → v417

### 検証 (preview, 擬似ログイン + fetch/clipboard スタブ)

- 3 ボタン描画 + ラベル確認。
- 🔗 未ログイン → alert「リンクをシェアするにはログインが必要です。」。
- 📤 画像をシェア → `/upload/share-image` を叩かない (純画像) + Web Share 無し時 X intent。
- 🔗 ログイン (PC, pointer fine) → `POST /upload/share-image` → `PUT r2` → `POST norireco_shares` → clipboard = `https://norireco.app/share/abc123` + ボタン「✅ リンクをコピーしました」。エラー 0。
- 副次確認: 偽 JWT で実 `api.norireco.app` を叩いたテスト残りが 401「Invalid Compact JWS」を返し、worker の JWT 検証 + shareCurrentLink の error handling が正しく動くことも確認。
- 備考: 当環境では 1200×630 canvas の `toBlob` が ~1s かかるため、Web Share/コピーまで体感 1 秒強。実機 PC では問題ない想定。

### 残課題

- ✅ 🔗 のモバイル (touch) 経路 = Web Share URL を iPhone 実機で確認済 (2026-05-29、ユスケ報告)。preview headless では pointer:coarse を再現できなかった分の裏取り完了。
- 垢BAN (share_banned) 連携は別タスク。

---

## 266. v416 — シェア取り消し UI (マイページ「🔗 シェア」タブ) + URL コピー導線の復活

**バージョン**: v416 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A（実装 / 🔥 シェア機能 残り = 取り消し UI 本体）

### 背景

- **ユスケ指摘**: v415 でシェアを 📤 1 本に統合した際、旧 🔗「シェアリンクを作成」が持っていた「URL をクリップボードにコピー」導線が後退。Web Share 非対応の PC ブラウザでは X intent が開くだけで、「/share URL を手元に取りたい (Discord・ブログ等に貼る)」ケースを拾えていなかった。URL 発行自体は継続していたが手段が不足。
- **取り消し UI 本体**: v415 で worker delete regex に `shares` 分岐を入れた下地を使い、作成済みシェアの一覧 + 取り消しを実装する番。

### 変更

- **`js/14-share-ogp.js`**:
  - **URL コピー復活**: `shareImageWithLink` の最終フォールバック (Web Share 不可時) を X intent → **クリップボードコピー (`✅ リンクをコピーしました`) + prompt** に戻した (旧 🔗 と同挙動)。これで PC でも /share URL を手元に取れる。
  - **取り消し UI**: `fetchMyShares` (norireco_shares を user_id で SELECT) / `shareCardHtml` / `renderMpSharesSection` / `copyShareLink` / `revokeShare` を追加。取り消し = `norireco_shares` DELETE (RLS 本人のみ) → /share が not-found 化で実質無効 → R2 画像を best-effort cleanup → 再描画。`deletePhotoByUrl` (18-photo-area) を import して R2 削除に流用 (share 画像も `cdn.norireco.app/shares/...` なので `urlToObjectKey` が解決、worker は v415 regex で `shares/<uid>/<file>` 受理)。`_sharesById` Map で image_url を保持。`NORIRECO.mypage.renderMpSharesSection` + `window.copyShareLink/revokeShare` 公開 (NORIRECO.mypage は guard して登録のみ = 循環 import 回避)。
  - `import { deletePhotoByUrl } from './18-photo-area.js'` 追加 (18 は 14 を import しないので循環なし)。
- **`js/13-mypage-common.js`**: サブタブ nav に「🔗 シェア」追加 (4→5 tab)。`applyMpSection` に `showShares` 分岐 (`#mp-sub-shares` 表示制御 + `renderMpSharesSection?.()`)。`mpActiveSection` コメントに `'shares'` 追記。
- **`noritetsu-map.html`**: `#mp-sub-shares` ペイン (`#mp-shares-section`) 追加 + `.mp-share-card` / `.mp-share-thumb` 系 CSS。
- **`sw.js`**: CACHE_VERSION v415 → v416

### 検証 (preview, 擬似ログイン + fetch スタブ)

- 5 サブタブ描画 (`stats/trips/lines/memos/shares`)、`🔗 シェア` 追加確認。
- 一覧: モック 2 件描画 + 各カードに `🔗 リンクをコピー` / `🗑 取り消し`。
- `copyShareLink('aaa111')` → clipboard = `https://norireco.app/share/aaa111`。
- `revokeShare('aaa111')` → `DELETE norireco_shares` → `DELETE /delete/photo` (object_key = `shares/uidTEST123/aaa111.png` = **v415 regex 経由で受理**) → 再描画で残り 1 件 (bbb222)。
- 本番コードのエラー 0 (初回テストの `new Response('', {status:204})` = 204 に body 不可の self-inflicted TypeError のみ。revokeShare の error handler が正しく捕捉することの裏取りにもなった)。

### 残課題

- 垢BAN (share_banned 状態) と「作成したシェア一覧」の連携は別タスク (TODO 🔥 垢BAN)。
- シェア機能 MVP + 磨き込み (S-1〜S-3 + v415/v416) でひと区切り。

---

## 265. v415 — シェア機能 磨き込み: 📤 シェアを /share リンクに統一 + delete regex に shares 分岐

**バージョン**: v415 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A（実装 / 🔥 シェア機能 残り = 磨き込み）

### 背景

S-1〜S-3 (v410〜v413) で MVP 完結後、シェアモーダル (`js/14-share-ogp.js`) に 2 系統のシェアが併存していた:
- **📤 シェア** (`shareCurrentCanvas`): 生画像ファイル + ルート URL `norireco.app/` を Web Share / X intent。ログイン不要だが、拡散時に OGP unfurl も /share への誘導も効かない。
- **🔗 シェアリンクを作成** (`createShareLink`, v413 追加): R2 → `norireco_shares` → `/share/<id>` を共有。ログイン必須。

役割が重複し UI が冗長。また Worker `/delete/photo` の object_key 正規表現は `memos|trips/<uid>/<owner>/<file>` (4 segment) のみ許可で、シェア画像 `shares/<uid>/<id>.png` (3 segment) を弾くため**永久に削除できない**潜在バグ (将来のシェア取り消し UI の下地が無い)。

### 設計判断 (ユスケ確認 — AskUserQuestion 2 軸)

- **スコープ**: 「📤 の /share 統一 + delete regex の shares 対応」を採用。シェア取り消し UI 本体は次回。
- **ボタン構成**: 「1 本に統合」を採用。📤 シェア 1 本に集約し v413 の 🔗 ボタンは撤去。

### 変更

- **`js/14-share-ogp.js`**:
  - 🔗 ボタン (`#share-ogp-link-btn`) + listener + `createShareLink` 関数を撤去。📤 シェアを主ボタン (緑アクセント) に格上げ、2 ボタン構成 (ダウンロード / シェア) に。
  - `shareCurrentCanvas` を統一: **ログイン時** = `uploadShareImage` → `insertShareRecord` → `/share/<id>` を「画像 + リンク」で共有 (`shareImageWithLink`)。**未ログイン / R2・insert 失敗時** = 従来通り画像ファイル + ルート URL (`shareImageOnly`) にフォールバック。
  - `shareTextWithoutUrl()` で `_shareText` 末尾のルート URL を剥がし、`/share/<id>` リンクに差し替え。`shareImageWithLink` は files 対応端末 = 画像添付 + リンクを caption 末尾 / 非対応 = リンクのみ Web Share → X intent (url 付きで card unfurl)。
- **`worker/src/index.js`**: `/delete/photo` の object_key 検証を 2 正規表現に分岐 — `memos|trips/<uid>/<owner>/<file>` (4 seg) と `shares/<uid>/<file>` (3 seg, v415〜)。どちらも prefix 直後 (2 つ目) のセグメントを uid として JWT と一致確認。**`npx wrangler deploy` で本番反映済** (Version `d854330d`, 2026-05-29、`api.norireco.app`)。secrets/bindings は既存保持。
- **`sw.js`**: CACHE_VERSION v414 → v415

### 検証 (preview)

- 2 ボタン化確認 (🔗 削除) + canvas 1200×630 描画。
- **未ログイン経路**: `navigator.share/canShare` 無しスタブ → X intent に `text=…\nhttps://norireco.app/` (ルート URL) が載る = 従来挙動維持。
- **擬似ログイン経路** (`NORIRECO.auth.currentUser` + fetch スタブ): `POST /upload/share-image` → `PUT <r2>` → `POST /rest/v1/norireco_shares` → `navigator.share({files, text})` で **画像添付 + text 末尾 `https://norireco.app/share/deadbeef99`** (ルート URL を正しく置換)。console error 0。
- screenshot はツール側 timeout (eval は即応答するためページは正常 = レンダラ/ツール起因)。状態は eval で確認済。

### 残課題

- **シェア取り消し UI 本体** (次回): マイページに「作成したシェア」一覧 + 取り消し (R2 `/delete/photo` に `shares/<uid>/<id>.png` を投げる + `norireco_shares` DELETE)。今回の delete regex 分岐 (本番反映済) はその下地として先行投入 (UI ができるまでは未使用 = dead path だが endpoint 側は準備完了)。

---

## 264. v414 — Notion §2.7 命名辞書を 3 ページ構成にリストラクチャ

**バージョン**: v414 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A（ドキュメント整理 / no functional code change）

### 背景

Notion §2.7 命名辞書が肥大化 (~83KB / 1,761 行 / 116 ヘッダ) し、`notion-fetch` 1 回で取れず token 上限超過。「統一済み語彙」が時系列追記で 7 か所に散乱、「意思決定ログ」も追記で複数か所に断片化。Stop hook の整合判断もコスト大。

### 設計判断 (ユスケ確認 — AskUserQuestion で 2 軸)

- **整理方針**: 「子ページ 2 分割（本体軽量化）」を採用。§2.7 本体は索引・基本軸・未統一のみに圧縮、子に (a) §2.7.1 用語集 (b) §2.7.2 意思決定ログ
- **古い記述の扱い**: 「完全マージ + 統合表に集約」を採用。全期の「v●●● 追加語彙」「廃止語」を機能カテゴリ別の統合表に再構成、出典バージョンは「適用 v」列で示す

### 新構成

- **§2.7 (本体)** — 役割・命名の基本軸・カテゴリ別索引（子へのリンク）・新語チェックリスト・未統一・要検討
- **§2.7.1 用語集** (新規) — 7 カテゴリ × 統合表 (記録の語彙 / マップ・期間フィルタ・シェア / インフラ・コード構造 / 駅・路線 / 列車・記録モーダル) + 廃止語（全期統合）+ 変数名・ファイル名対応
- **§2.7.2 意思決定ログ** (新規) — 目的 + 設計判断テンプレート + 記入例 (タイムマシン廃止 v174) + ログ一覧（時系列 DESC v249〜v413）
- **§2.7-archive** (既存) — Phase 1-3.7 + 3.8-early の過去意思決定ログ (read-only)、本体からは link で参照

### 変更

- **Notion**:
  - §2.7 本体 (id `36271b458b638114bb9ec4c05bf8d6c9`) を `replace_content` で軽量版に上書き (子ページ 3 つを `<page url=...>` で参照保持)
  - §2.7.1 用語集 (id `36f71b45-8b63-8189-b4bf-ecab371ca781`) 新規作成、`insert_content` を chunk で push
  - §2.7.2 意思決定ログ (id `36f71b45-8b63-817c-adae-e41a85adeda3`) 新規作成、同様に chunk で push
- **CLAUDE.md**: 「§2.7 に追記」→「§2.7.1 (新語) / §2.7.2 (設計判断) に追記」/「コードとずれたら §2.7 意思決定ログ」→「§2.7.2 意思決定ログ」/ ドキュメント地図に「§2.7 命名辞書は 3 ページ構成 (v414 整理)」追記
- **sw.js**: CACHE_VERSION v413 → v414

### 失敗教訓

- **Notion `insert_content` は `<page url=...>` 形式を受け付けない**: `create-pages` の content では OK だが、`insert_content` で同じ形式を送ると "Failed to create block"。代わりに markdown link (`[title](https://www.notion.so/...)`) を使う必要がある
- **content が大きい chunk (~40KB 超) は "Failed to create block" で失敗**: Notion API のブロック数または文字数の暗黙制限。5-10KB 単位で chunk して push する運用が安全。本セッションでは ~25 chunks に分割
- **fetched ページ全文の文字エンコーディング**: PowerShell `Get-Content -Raw` は UTF-8 をデフォルトで適切に扱えず Shift-JIS で読みかけて mojibake。`[System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)` で明示的に指定する必要があった

### 残課題

- Notion §0「ドキュメント役割分担」表内の §2.7 リンク自体は変更不要 (親 §2.7 経由で 3 ページに辿れる)
- 将来 §2.7.1 / §2.7.2 もさらに肥大化したら、用語集をテーマ別 (記録系 / マップ系 / インフラ系) に再分割の余地あり

詳細: 子ページ §2.7.1 / §2.7.2 を参照

---

## 263. v413 — シェア機能 S-3: /share/<id> ページ (OGP メタ + CTA)

**バージョン**: v413 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A（実装 / 🔥 シェア機能 S-3 = MVP 完結）

### 背景

SNS クローラは JS 非実行なので、シェアリンクをリッチプレビュー表示させるには OGP メタ (`og:image` = 実在の静的画像 URL) を埋めた HTML を返す必要がある。S-1 (画像生成) + S-2 (R2 永続 URL) の上に、受け側 `/share/<id>` ページを Cloudflare Pages Function で SSR する。これでシェア機能 MVP (S-1〜S-3) が完結。

### 設計判断 (ユスケ確認)

- **share レコード = Supabase テーブル `norireco_shares`** (vs R2 JSON): 既存スタックに沿う / id で構造化引き / 将来の垢BAN 連携可。**SELECT は公開 RLS** (未ログイン訪問者にも /share を見せる)、INSERT/UPDATE/DELETE は本人のみ
- **配信 = Cloudflare Pages Function** `functions/share/[id].js`: norireco.app は Git 連携 Pages (ビルドなし、ルート = 出力) なので `/functions` は main push で自動デプロイ。同一ドメインでクローラ向け SSR
- **share_id = S-2 の R2 画像 id を流用**: 画像 object と share レコードを 1 つの id で結ぶ
- **導線 = 「🔗 画像URLをコピー」→「🔗 シェアリンクを作成」に置換**: /share リンクは X で画像+タイトル+CTA が unfurl され生画像 URL より拡散に強い

### 変更

- `supabase/migrations/v413_norireco_shares.sql` 新規: `norireco_shares` (id text PK = R2 share_id / user_id / kind / title / description / image_url / payload / created_at)。RLS 4 policy (公開 SELECT + 本人 INSERT/UPDATE/DELETE) + anon/authenticated GRANT + NOTIFY pgrst。**未 Applied (ユスケが Run)**
- `functions/share/[id].js` 新規 (Pages Function): `onRequestGet` で params.id → Supabase REST (anon key + 公開 SELECT) で norireco_shares 引き → OGP メタ込み HTML を SSR。可視ページに画像 + タイトル + 説明 + 「🚃 自分も乗レコで記録してみる」CTA (→ norireco.app)。**セキュリティ**: title/desc/image を HTML エスケープ (XSS 防止)、og:image は `cdn.norireco.app/` 限定で他所誘導を弾く、未検出/不正 id は 404 + 汎用 fallback
- `js/14-share-ogp.js`:
  - `uploadShareImage` 戻り値を `{public_url, share_id}` に変更 (Worker の share_id を受ける)
  - `insertShareRecord(shareId, imageUrl)` 追加 (access_token Bearer で norireco_shares POST。RLS が auth.uid()=user_id を要求するので anon key でなく access_token)
  - `copyShareLink` → `createShareLink` に置換 (canvas→blob→R2→shares insert→`https://norireco.app/share/<id>`→Web Share or clipboard)
  - `_shareMeta {kind,title,description}` をモジュール変数化し open 関数 2 つでセット (profile: 完駅率% / trip: 路線名 + 区間・駅数・乗車日)
  - モーダルボタン「🔗 シェアリンクを作成」+ listener を createShareLink に
- CACHE_VERSION v412 → v413

### 検証

- **Pages Function (node テスト)**: FOUND → 200 + og:title/image/url 正常、`<script>` 文字は `&lt;script&gt;` にエスケープ。NOTFOUND → 404 + fallback 画像 + 「見つかりません」。不正 id → 404。**外部 image_url → icon-512.png に差し替え** (og:image 誘導防止)
- **クライアント (preview スタブ)**: 擬似ログイン + fetch/clipboard スタブで `createShareLink` 実フロー検証: `POST /upload/share-image` → `PUT <r2>` → `POST /rest/v1/norireco_shares` → clipboard に `https://norireco.app/share/hex9` → 「✅ リンクをコピーしました」。errors 0
- syntax-guard clean、Pages Function `node --check` clean
- **未検証 (要: migration Applied + 実ログイン + Pages デプロイ後)**: 実 Supabase insert (RLS) / 実 /share/<id> レンダリング / SNS unfurl。※ テスト中の console 401「Unsupported alg」は偽 JWT が実 Worker に届いた痕跡 = Worker 稼働の裏付け、コードは正しくエラーハンドリング

### デプロイ手順 (ユスケ)

1. main push → frontend + Pages Function `/share/[id]` 自動デプロイ
2. Supabase SQL Editor で `v413_norireco_shares.sql` を Run → 末尾に `-- Applied: 2026-05-29 by yutsutke` 追記して commit
3. 動作確認: ログイン → 旅程シェア → 「🔗 シェアリンクを作成」→ `/share/<id>` を開く → X 等でリンクプレビュー確認

### 残課題

- delete/photo object_key 正規表現に shares (3 segment) 分岐 + シェア取り消し UI
- 既存「📤 シェア」(Web Share/X) も /share リンク使用に統一

---

## 262. v412 — シェア機能 S-2: R2 永続画像保存

**バージョン**: v412 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A（実装 / 🔥 シェア機能 S-2）

### 背景

S-3 の `/share/<id>` ページが OGP の `og:image` に指す**恒久画像 URL**を作る土台。クライアント生成 PNG を R2 に保存して `cdn.norireco.app/shares/...` の永続 URL を得る。既存の写真アップロード基盤 (Worker presigned PUT + 18-photo-area の presign→PUT パターン) を踏襲。

### 設計判断

- **新エンドポイント `/upload/share-image`**: 写真と違いシェア画像は「所有 entity の id」を持たないので、`handlePhotoUpload` (owner_id 必須) を流用せず専用ハンドラに。**id は Worker 側で採番** (`genPhotoId`)、key = `shares/<uid>/<id>.png`
- **ログイン必須**: Worker が JWT の `sub` を要求するため。未ログイン時はクライアントで弾いて案内 (S-1 のローカル DL / Web Share は未ログインでも使える)
- **オンデマンドアップロード**: モーダルを開いた時点では上げず、「🔗 画像URLをコピー」を押したときだけ R2 write (無駄な書き込み回避)
- **S-2 単独の価値**: コピーした画像 URL を X 等に貼ると画像が unfurl される。S-3 への布石でもある

### 変更

- `worker/src/index.js`: `handleShareImageUpload` 追加 (verify auth → ext/size 検証 → `shares/<uid>/<id>.png` の presigned PUT 発行、`share_id` も返す) + ルート `POST /upload/share-image` + ヘッダコメント。`node --check` clean
- `worker/README.md`: エンドポイント表に trip-photo / share-image / delete を追記 + share-image の req/res 例
- `js/14-share-ogp.js`:
  - `import { authBearerToken, currentUserId } from './12-auth.js'` 追加 (本 module 初の import。14 は window 公開のみのリーフ = 循環なし)
  - `uploadShareImage(blob)` (presign→PUT、public_url 返却) + `copyShareLink()` (ログインガード + canvas→blob→upload→clipboard、ボタンに進捗/完了表示) 追加
  - シェアモーダルに「🔗 画像URLをコピー」ボタン (緑 #2ec486) + listener。既存「🔗 シェア」は「📤 シェア」に改称
- CACHE_VERSION v411 → v412

### ⚠️ デプロイ注意 (重要)

frontend は main push で即反映 (v412) だが、**Worker は別パイプライン**。`cd worker && npx wrangler deploy` を実行するまで `/upload/share-image` は 404。それまで「🔗 画像URLをコピー」は失敗トースト/alert になる。Worker デプロイはユスケの Cloudflare 認証が要るので Claude 側では実行不可。

### 検証 (preview, localhost)

- 「🔗 画像URLをコピー」ボタン表示 (緑)、未ログインクリックで「ログインが必要です」案内 + 非クラッシュ
- 擬似ログイン (NORIRECO.auth.currentUser 注入) + fetch/clipboard スタブで `copyShareLink` 実フロー検証: `POST /upload/share-image` → `PUT <upload_url>` → clipboard に public_url → ボタン「✅ コピーしました」
- syntax-guard clean (循環なし確認)、Worker `node --check` clean、console error 0
- **未検証 (Worker デプロイ後に要確認)**: 実 R2 への presign 署名 + PUT 成否、実 JWT verify

### 残課題

- Worker デプロイ (ユスケ)
- S-3: Supabase `norireco_shares` + Pages Function `/share/[id]`。delete/photo の object_key 正規表現に shares (3 segment) 分岐追加

---

## 261. v411 — 個別 trip シェア: 路線名を正式名で表示 + 区間別「経路」詳細

**バージョン**: v411 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A（UI 改善 / 🔥 シェア機能 S-1 仕上げ）

### 背景

v410 のシェア画像で見出しに `auto_相模原線_京王電鉄` のような内部 lineId が出ていた。原因は `seg.lineName` が記録時に null になりがちで、そのまま `lineId` にフォールバックしていたため (v369 の note 「lineName は null になりがち。name は SERVICE_LINES から引く」と同じ罠)。あわせてユスケ要望「どの路線に乗ったか、余白の許す範囲でもっと詳しく」に対応。

### 変更 (`js/14-share-ogp.js` のみ)

- `prettifyLineId(id)` 追加 — `auto_相模原線_京王電鉄` → `相模原線` (SERVICE_LINES 逆引きが効かないときの最終手段)
- `deriveTripDisplay` を書き換え:
  - 路線名を **SERVICE_LINES (lineId 逆引き) を一次情報**に解決 (`slById.get(lineId).name` → `lineName` → `prettifyLineId`)
  - 旧 `routeLabel` 単一フィールドを廃止し、`lineNames` (重複なし路線名配列) + `legs` (`[{name, from, to}]` 区間別) を返す
- `drawTripStatsPanel`:
  - 見出しを全路線名「・」連結に。収まらなければ font 縮小 → なお溢れたら「○○線 ほか N 路線」フォールバック
  - **🚉 経路セクション追加** (乗換あり = 2 区間以上のとき): 各脚を「路線名 (金) + 区間 (灰)」で最大 5 行列挙、超過は「…ほか N 区間」。余白を活用
- `openTripShareModal`: サブ文言・シェアテキストの路線ラベルを `lineNames` から算出 (最大 3 + ほか N)
- CACHE_VERSION v410 → v411

### 検証 (preview)

相模原線 (lineName 意図的に null) + 横浜線 の 2 区間 trip を注入:
- 見出し「相模原線・横浜線」(auto_ 消滅、SERVICE_LINES 逆引き成功)
- サブ文言「『相模原線・横浜線』を…」
- 🚉 経路に「相模原線 多摩境→橋本」「横浜線 大口→菊名」を表示
- PNG 抽出で目視確認、syntax-guard clean (routeLabel 未定義参照ゼロ)、console error 0

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

