# 乗レコ 現在のステータス

> 「現在のスナップショット」用ファイル。**ターンごとに最新に保つ**（変更を伴ったら必ず更新）。
> 履歴は `CHANGELOG.md`、やることは `TODO.md`、詳細仕様は Notion §1.x / §2.x。

---

## プロダクトブランド

| 項目 | 値 |
|---|---|
| プロダクト名 | **乗レコ** |
| サブタイトル | **電車旅** |
| コア機能 | 全国鉄道の乗車記録・完乗率の可視化 |
| 拡張機能 | 電車旅のハブ・プラットフォーム |
| ブランド確定日 | 2026-05-13 |

---

## URL ・ リポジトリ

- 公開 URL（本番）: <https://norireco.app> — Cloudflare Pages + Custom Domain (v249〜)
- フォールバック: <https://yutsutke.github.io/norireco/> — GitHub Pages（既存 PWA install 用に当面残置）
- GitHub: `yutsutke/norireco` (Public)
- デプロイ: main 直 push（30 秒〜2 分で反映）

---

## Service Worker

**`CACHE_VERSION = 'v387'`** · デプロイ回数 = バージョン番号の不変式

---

## カバレッジ

| カテゴリ | カバー状況 |
|---|---|
| 営業系統 | 642 系統 (v334 青梅線・大和路線・阪和線 + v339 山形新幹線・秋田新幹線 を手動キュレーション化) |
| 駅（国土地理院 N02 ベース） | 9,030 駅 (v328 で常磐線震災区間 11 + 山陽線 2 + 東北線 1 を補完) |
| キャラ | 6 体（八王子 3・立川 3） |
| 列車マスター | 約 260 種 |

列車マスターの内訳: 新幹線・在来特急・寝台・クルーズ・観光列車・SL・急行（戦前〜現代、廃止列車は `discontinued: true`）。

---

## コードベース

- `noritetsu-map.html`（910 行、地図画面）
- `noritetsu-log.html`（ログ画面）
- `js/01-..〜18-..`（機能別 ES Modules、v131〜v138 で 13 ファイル化、v190 で 13-mypage を 4 分割、v192 で 02b-service-lines-builder を分離、v194 で 04b-ride-record を分離、v258 で 18-photo-area を分離）
- `worker/`（Cloudflare Workers + R2 ゲートウェイ、v256〜）
- `sw.js` / `manifest.json`（PWA）
- `window.NORIRECO.mypage.xxx` 名前空間（v190〜、既存 `window.xxx` 公開は HTML onclick 互換で維持）

詳細 → Notion §2.4 コード構成

---

## 領域別ステータス

> ⚠️ 各行 1〜2 文の概要のみ。詳細は `CHANGELOG.md` のバージョン番号参照。

| 領域 | 状態 |
|---|---|
| **Phase 2〜3.7 コア機能一式** (v60〜v157) | ✅ 完成 — 営業系統ベース地図 / 駅 UI 個人化 / 駅キャラ / 認証グラデーション / GPS 記録 / 列車種別 / コード分割 / 不正検知 / Supabase 認証 / マイページ 3 サブタブ + 詳細統計 16 種。詳細 → [`CHANGELOG_PHASE1-3.7.md`](CHANGELOG_PHASE1-3.7.md) |
| **Phase 3.8 前半: データ補修 + 期間フィルタ + 記録 UX 磨き込み** (v158〜v188) | ✅ 完成 — データ補修・期間フィルタ「〜月指定」・記録モード用語統一・後追い記録・stop_type 駅 UI 個人化・地図フィルタ統合。詳細 → [`CHANGELOG_PHASE3.8-early.md`](CHANGELOG_PHASE3.8-early.md) |
| **Phase 3.8 中盤: コード分割 + ES Modules 化** (v189〜v225) | ✅ 完成 — 13-mypage 4 分割・SERVICE_LINES builder 分離・ride-record 分離・`<script type="module">` + `import`/`export` 全面化。詳細 → [`CHANGELOG_PHASE3.8-modules.md`](CHANGELOG_PHASE3.8-modules.md) |
| **Phase 3.8 シェア + Cloudflare 移行期** (v226〜v249) | ✅ 完成 — 旅程編集拡張 / ログアウトセキュリティ + 静的デモ撤去 + LOD シンプル化 / OGP 画像生成 MVP + リージョン中央駅 / 完乗率統合 + 用語統一 / 系統色カスタマイズ + Supabase 同期 / onclick window bridge 漏れ修正 / GitHub Pages → Cloudflare Pages + norireco.app。シェア機能の残: verified 限定ガード / 個別 trip シェア / 受け側 `/share/<id>` / R2 保存。詳細 → [`CHANGELOG_PHASE3.8-share.md`](CHANGELOG_PHASE3.8-share.md) |
| **Phase 3.8 駅メモ + R2/写真期** (v250〜v278) | ✅ 完成 — 駅メモ本格化 (Supabase CRUD + マイページ「📸 メモ」タブ) / 駅アクションシート / R2/Workers ゲートウェイ (api.norireco.app + cdn.norireco.app、presigned PUT URL、JWT ES256 JWKS verify) / 写真添付フル機能 (memo/trip 最大 5 枚、Canvas 圧縮、D&D 並び替え、削除時 R2 cleanup) / Notion ドキュメント整理 (STATUS.md 分離 + 役割分担再集約)。詳細 → [`CHANGELOG_PHASE3.8-photo.md`](CHANGELOG_PHASE3.8-photo.md) |
| **Phase 3.8 マイページ強化期** (v279〜v289) | ✅ 完成 — 削除/GPS 認証の即時 UI 反映 (renderMypage) / 地図駅クリックで「この駅を含む旅程」一覧 (v282) / 路線アクションシート + 旧 📸 memoMode 撤去 / マイページ旅程・メモに駅名検索 (4 chip 始点/終点/乗換/通過 + IME 変換安定化)。詳細 → [`CHANGELOG_PHASE3.8-mypage.md`](CHANGELOG_PHASE3.8-mypage.md) |
| **Phase 3.8 駅 ID 体系期: Phase 1〜3 完結 + ドキュメント整理** (v290〜v333) | ✅ 完成 — `merged_stations.json` 全 9,030 駅に `s_NNNNN` id 付与、SERVICE_LINES / LINES / trip / memo / キャラ全層を id ベース化、同名異所駅の判定混線を全面解消。SQL DROP COLUMN (memo.station / trip.from_station/to_station) も Applied 規約 (migration ファイル末尾の `-- Applied:` を真実の源) 導入で完了。駅クリック確実化 (map.click delegate + polyline 近傍駅検索) / 駅名+都道府県検索 / FAB 並び 📍📝🎭🌙 / startup 着手前手順を hook → CLAUDE.md へ移管。詳細 → [`CHANGELOG_PHASE3.8-station-id.md`](CHANGELOG_PHASE3.8-station-id.md) |
| **Phase 3.8 through_lines + GPS 位置づけ変更 + 車両形式 DB + 記録モーダル整理** (v334〜v363) | ✅ 完成 — through_lines (直通系統) 本格運用化 (v334-v343 で新幹線 3 + 関東 26 + 関西 27 + 名古屋 19 + 第三セクター 23 = 142/642 系統 22.1% カバー)。GPS 記録の位置づけを「世間への証明」→「手間省略」に転換 (`11-fraud-detection.js` 削除)。営業系統×車両形式 DB を Notion → JSON 連携 (`service_line_vehicles.json`)。記録モーダル全面整理 (遅延独立トグル + カテゴリ dropdown 駆動 + 普通電車 cascade)。旅程/路線/メモ全層に車両形式統合 + 検索 + 路線詳細モーダル。メモ migration 2 件 (v360/v363) Applied。詳細 → [`CHANGELOG_PHASE3.8-vehicles.md`](CHANGELOG_PHASE3.8-vehicles.md) |
| **Phase 3.8 乗換候補自動提案 + 徒歩乗換グループ + 系統別車両形式** (v364〜v387) | ✅ 進行中 — v365 で記録モードに「乗換候補自動提案」追加: 別系統 2 駅 (例: 浅草→新宿) で「⚠️ 共通系統なし」だけでなく 1 hop 乗換候補 Top 5 を chip 表示 (id ベース + 総駅数昇順、chip タップで R.selection 挿入 + lineA/lineB を pre-select)。v366 で (1) through_lines 候補に「🚉 直通あり」バッジ + 優先ソート、(2) 1 hop ゼロなら 2 hop fallback (函館→弘前で「新函館北斗/新青森」3 系統提案、駅→系統索引キャッシュで ~400ms)。v367 で徒歩乗換グループ機能 — `scripts/extract_walk_transfers.js` で merged_stations から 243 グループ/553 駅自動抽出 (函館↔函館駅前 230m, 立川↔立川北↔立川南 等)、`walk_transfers_overrides.json` で手動修正可。記録モードで walk pair を `{walk:true}` segment 化 (🚶 約Xm 表示)、`findTransferCandidates` に walk fallback (函館→松風町 で「🚶 函館〜函館駅前」候補)、`insertWalkTransfer` で X=a 特殊ケース対応。v368 で駅アクションシート「この駅を含む旅程 (タップで読み込み)」のカッコ書きを削除 (アクションシート文脈で自明)。v369→v370 でマイページ旅程タブに「🛤 路線」substring フィルタ追加 (v370 で `SERVICE_LINES` の name にマッチする lineId Set 構築、駅検索 v317 と同形、candidateN02Ids 包含、O(L+N))。v371 で記録モードに「系統別車両形式」対応 — 乗換ありの旅程で系統 chip 切替時に dropdown 値を `T.selectedCarModelBySl` Map に保存・復元、save 時に `segments[].car_model` に埋める。`trip.car_model` は全 segment 一致なら値 / 不一致なら null (旅程レベルの代表値)。旅程カード表示は `segments[].car_model` の unique 値を joining (例: `[E353系 / 185系]`)。マイページ「🚆 車両」フィルタも segments 走査に対応。v372 で v371 の hotfix — `selectSlChip()` 冒頭で `const T = NORIRECO.trains` を追加したが同関数内 1689 行に既存の `const T` 宣言があり SyntaxError で画面真っ黒に → 後者を削除して冒頭宣言に統合。**真因: `node --check` は CommonJS 解釈のため関数内 const 重複を見逃す → ESM プロジェクトは `node --check --input-type=module < file` で検査すべき**。v373 で旅程編集モーダルも per-segment 車両形式編集対応 — 区間表示の各行に「🚆 車両形式」input を生成、saveTripEdit で segments[].car_model 更新 + trip.car_model 集約。v374 で記録モードの「特急で系統別車両形式が選べない」問題に対応 — `applyRecTrainCategory()` の「cascade と SL chip 排他」を撤回、特急等でも併存表示。`T.selectedCarModel` (cascade 専用) と `T.selectedCarModelBySl` Map (SL chip 専用) を完全分離。v375 で「区間ごとに完全独立」な記録 UI に再設計 (ユスケ要望) — HTML 構造を「区間 chip → カテゴリ → カスケード」順に並べ替え、`segments[].train_category / train_id / train_name / car_model` 全部 per-seg 化。chip 切替時に Map から該当 cat を引いて applyRecTrainCategory + cascade or sl-block を populate + value 復元。各 handler (`onTrainCategoryChange` / `onTrainChange` / `onTrainCustomInput` / `onCarModelChange` / `onCarModelCustomInput`) で `T.selectedXxxBySl[activeChipSlId]` に同期書き込み。trip 直下の `train_category / train_id / train_name / car_model` は集約ルール (全 seg 一致なら値 / 不一致なら null、car_model と同形)。`#rec-seg-chips-wrap` は segments ≥ 2 のときだけ表示。v364 (no deploy) で CHANGELOG 行数チェックを Stop hook → セッション末手続きに移管。v383 で旅程編集モーダルも per-seg フル cascade 対応 — 各 seg row に「種別 select / 列車 dropdown / 列車名手入力 (__custom__ 時) / 車両形式 dropdown + 手入力」を生成、`applyTripEditSegCategoryVisibility` + `populateTripEditSegCarSelect` + `restoreTripEditSegCascade` の 3 helper で visibility と値復元を管理。saveTripEdit は train_id select 値 (master id) を採用しつつ master.name を train_name にシャドウ書き込み、__custom__ 時は手入力フィールドを採用。v384 で v383 の残課題「cat 切替時の DOM 値残り」を解消 — `applyTripEditSegCategoryVisibility` の `cat='local'` / `cat=other` 分岐に carInpEl / tnameEl の value クリアを追加、`restoreTripEditSegCascade` に local 分岐を追加して seg.car_model を書き戻し。v385 で確認モーダルに「乗換あり旅程の時刻仕様」注記を追加 — `openRecConfirm` の multi-segment branch、segments.length ≥ 2 のときだけ、「全体時間は記録されるが各系統時間は保持しない」+ 代替手段 (系統ごと分割 / 待ち時間は立ち寄りで記録) を青系 info-box で表示。v386 で左上ロゴ (乗レコ NORITSUBU MAP) を `<a href="noritetsu-map.html">` 化 — クリックでマップ画面トップへ遷移 (mypage 深堀り中などに戻れる)。v387 で駅フィルタ「◎乗車のみ」が実質効かない問題を解消 — `slStopType` 集計が `slRiddenSt` と別パスで fallback 無しだったため旧 N02 id trip の駅が `slStopType` 未登録 → 描画 fallback で全駅 "boarded" 化していた。集計を `slRiddenSt` と同ループに統合し resolve fallback も共有。CHANGELOG.md 現本体参照 |
| Supabase RLS 強化 (user_id = auth.uid() 必須) | ❌ 未着手（🔥 v233 残課題）— SUPABASE_KEY は frontend 露出 anon key、REST 直叩きで他人生データを取れる。UI 防御は v233 で済 |
| **Phase 1.5: Map × Claude チャット統合 MVP** | ❌ 未着手（🔥 新規 / 2026-05-19）— 地図画面横にチャットパネル + Claude API + 乗レコ MCP server。最小 1 ヶ月。Notion §3.3 参照 |
| 駅 UI 情報ハブ化（4 領域パネル） | ❌ 未着手 |
| キャラ図鑑タブ | ❌ 未着手 |
| 普通電車の車両形式選択 | 🟡 MVP 完成 (v348) — データ層 (v347) + UI (v348) 完成、Phase 2 で unmatch 17 件 + Notion DB 表記揺れクリーンアップ予定 |
| ノリレコログを地図画面のタブに統合 | ❌ 未着手（🟡 体験向上） |
| 垢 BAN 対応（共有のみ停止・個人記録は維持） | ❌ 未着手（🔥 不正検知連動） |
| マップ情報レイヤー構想 | ❌ 未着手（将来） |
| 廃線対応 | ❌ 未着手（🎮 将来） |

詳細は `TODO.md`（🔥最優先 / 🟡体験向上 / 🟢データ充実 / 🔧パフォーマンス / 🎮将来 / 🌱布石）を参照。

---

## 直近のフェーズ

- **Phase 2〜3.7** (v60〜v157): 営業系統ベース地図 → 駅キャラ → 認証グラデーション + GPS 獲得 → 現在地・最寄駅 → 列車種別・コード分割 → 不正検知・ログイン・マイページ
- **Phase 3.8** (v158〜): データ補修 + 期間フィルタ拡充 + 記録 UX (v158〜v188, [-early](CHANGELOG_PHASE3.8-early.md)) → ES Modules 全面化 (v189〜v225, [-modules](CHANGELOG_PHASE3.8-modules.md)) → シェア MVP + Cloudflare 移行 (v226〜v249, [-share](CHANGELOG_PHASE3.8-share.md)) → 駅メモ + R2/Workers + 写真添付 + Notion 整理 (v250〜v278, [-photo](CHANGELOG_PHASE3.8-photo.md)) → マイページ即時反映 + 駅/路線アクションシート + 駅名検索 (v279〜v289, [-mypage](CHANGELOG_PHASE3.8-mypage.md)) → 駅 ID 体系 Phase 1〜3 完結 (v290〜v333, [-station-id](CHANGELOG_PHASE3.8-station-id.md)) → through_lines + GPS 位置づけ + 車両形式 DB + 記録モーダル整理 (v334〜v363, [-vehicles](CHANGELOG_PHASE3.8-vehicles.md)) → 乗換候補自動提案 + 徒歩乗換グループ + 系統別車両形式 (v364〜v387) ← **今ここ**
- **ドキュメント整理**
  - (2026-05-20): CHANGELOG.md 4 ファイル分割
  - (2026-05-23): §0.1 を `STATUS.md` に分離・git 管轄化（Stop フック対象に）
  - (2026-05-25): CLAUDE.md セッション開始時手順を強化 — Notion §0 fetch を毎セッション必須化 + 完了報告 3 行を強制（v322 §172）
  - (2026-05-26): CHANGELOG.md 5722 行を分割 — 当初 2 アーカイブ (share-r2 + station-id) に退避したが share-r2 が 3275 行で太かったため同ターン内で share / photo / mypage の 3 ファイルに再分割し最終 4 アーカイブ構成に。Stop hook に 1500 行超チェックを追加、CLAUDE.md に「CHANGELOG.md 整理時は STATUS.md も同時整理」ルール明記（v349）
  - (2026-05-27): CHANGELOG.md 1594 行を分割 — §184〜§213 (v334〜v363, through_lines + GPS + 車両形式 + 記録モーダル整理) を `CHANGELOG_PHASE3.8-vehicles.md` に退避。本体は §214 (v364, CHANGELOG 行数チェック移管) から開始 (乗換候補機能群 v365〜v367 を集約)
