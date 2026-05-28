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

**`CACHE_VERSION = 'v406'`** · デプロイ回数 = バージョン番号の不変式

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
| **Phase 3.8 乗換候補自動提案 + 徒歩乗換グループ + 系統別車両形式 + 旅程編集 per-seg cascade + サブエージェント** (v364〜v391) | ✅ 完成 — 乗換候補 (1 hop top 5 + 直通あり優先 + 2 hop fallback top 3)・徒歩乗換グループ DB (243 グループ/553 駅自動抽出 + Union-Find transitive closure)・系統別車両形式 (`T.selectedCarModelBySl` Map + chip 切替)・記録モード「区間 → カスケード」順 per-seg 化・旅程編集モーダル per-seg フル cascade・サブエージェント `js-syntax-guard` 配置。詳細 → [`CHANGELOG_PHASE3.8-transfer.md`](CHANGELOG_PHASE3.8-transfer.md) |
| **Phase 3.8 trip 詳細エディタ抽出 (B カテゴリ)** (v392〜v399) | ✅ 完成 — Notion §1.3「一括記録」設計判断より、確認モーダル中身の 02/07/13b 3 箇所重複 (v383 落とし穴) を解消する単一 factory `createTripDetailEditor` に段階リファクタで集約完了。B-1 (v392, per-seg-chip mode 本実装 + 07 切替) → B-2 (v393, 13b を per-seg-rows / trip-level mode 移行) → B-3a (v394, 13b 遅延/メモ集約) → v395 hotfix → B-3b (v396, 13b 時刻集約) → B-3c (v397, 07 へ 5 精度 + maniaToggle 移植) → B-4-a (v398, visible dead code ~350 行撤去) → B-4-b (v399, グローバル 9 fields 撤廃 + 02/07 旧 cascade/SL chip ~520 行撤去 + multi-container API + 3 instance → 1 instance 統合 ~540 行削除)。詳細 → CHANGELOG.md §242〜§249 |
| **Phase 3.8 一括記録 (A カテゴリ)** (v400〜v406) | ✅ 完成 — Notion §1.3 設計確定「営業系統チェックリスト + たたむ/開くアコーディオン」の本体。A-1 skeleton + A-2 チェックリスト + A-3 一括保存 MVP + A-4 検索/フィルタ + A-5 アコーディオン展開 (createTripDetailEditor 行内 mount、同時 1 行制御、編集 ✏️ マーク) + A-6+A-7 オンボーディングバナー + unknown 集計検証 (現状 (b) 確定) + **A-8 (v406)**: 区間ピッカー — アコーディオン body 先頭に「🚉 区間」セクション (from/to 2 select + 駅数 meta + 全線/区間自動判別)、change で `_bulkDrafts.segments[0]` 更新 + `_edited=true` + factory 再 mount。`_buildTripFromDraft` の `name` を `${lineName} ${from}→${to}` (区間時) と `${lineName} 全線` (両端時) で動的化、`total_stations` も区間内駅数に。preview 検証で「中央本線快速 新宿→高尾 / 20 駅」と「上野東京ライン 全線 / 44 駅」が両立保存。**環状線対応** (山手線 17/30 駅塗り問題) は A スコープ外として別タスクへ持ち越し (N02 line データ補完 = Phase 3 駅 ID 体系の延長作業)。詳細 → CHANGELOG.md §250〜§256 |
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
- **Phase 3.8** (v158〜): データ補修 + 期間フィルタ拡充 + 記録 UX (v158〜v188, [-early](CHANGELOG_PHASE3.8-early.md)) → ES Modules 全面化 (v189〜v225, [-modules](CHANGELOG_PHASE3.8-modules.md)) → シェア MVP + Cloudflare 移行 (v226〜v249, [-share](CHANGELOG_PHASE3.8-share.md)) → 駅メモ + R2/Workers + 写真添付 + Notion 整理 (v250〜v278, [-photo](CHANGELOG_PHASE3.8-photo.md)) → マイページ即時反映 + 駅/路線アクションシート + 駅名検索 (v279〜v289, [-mypage](CHANGELOG_PHASE3.8-mypage.md)) → 駅 ID 体系 Phase 1〜3 完結 (v290〜v333, [-station-id](CHANGELOG_PHASE3.8-station-id.md)) → through_lines + GPS 位置づけ + 車両形式 DB + 記録モーダル整理 (v334〜v363, [-vehicles](CHANGELOG_PHASE3.8-vehicles.md)) → 乗換候補・徒歩乗換・系統別車両形式・per-seg cascade・サブエージェント (v364〜v391, [-transfer](CHANGELOG_PHASE3.8-transfer.md)) → trip 詳細エディタ抽出 B-1〜B-4-b 完結 (v392〜v399) → 一括記録 A-1〜A-8 完結 (skeleton + チェックリスト + 保存 MVP + 検索/フィルタ + アコーディオン展開 + オンボーディング + unknown 検証 + 区間ピッカー) (v400〜v406) ← **今ここ** (A 段階全完了 / 残: 環状線対応は別タスク)
- **ドキュメント整理**
  - (2026-05-20): CHANGELOG.md 4 ファイル分割
  - (2026-05-23): §0.1 を `STATUS.md` に分離・git 管轄化（Stop フック対象に）
  - (2026-05-25): CLAUDE.md セッション開始時手順を強化 — Notion §0 fetch を毎セッション必須化 + 完了報告 3 行を強制（v322 §172）
  - (2026-05-26): CHANGELOG.md 5722 行を分割 — 当初 2 アーカイブ (share-r2 + station-id) に退避したが share-r2 が 3275 行で太かったため同ターン内で share / photo / mypage の 3 ファイルに再分割し最終 4 アーカイブ構成に。Stop hook に 1500 行超チェックを追加、CLAUDE.md に「CHANGELOG.md 整理時は STATUS.md も同時整理」ルール明記（v349）
  - (2026-05-27): CHANGELOG.md 1594 行を分割 — §184〜§213 (v334〜v363, through_lines + GPS + 車両形式 + 記録モーダル整理) を `CHANGELOG_PHASE3.8-vehicles.md` に退避。本体は §214 (v364, CHANGELOG 行数チェック移管) から開始 (乗換候補機能群 v365〜v367 を集約)
  - (2026-05-27): Notion 「🤖 サブエージェント方針」を実装 — `.claude/agents/js-syntax-guard.md` 配置 (v391 no deploy, §241)。サブエージェント = 編集ループ中の早期検出 (任意) vs PreToolUse(git push) フック (TODO 🔧 未着手) = 最終ゲート (強制) の層分け
  - (2026-05-27): trip 詳細エディタ B-1 着手 — `js/20-trip-detail-editor.js` skeleton 配置 (v392 no deploy, §242)。Notion §1.3「一括記録 (まとめて記録)」設計確定の受け皿。確認モーダル中身の 02/07/13b 3 箇所重複を単一 factory `createTripDetailEditor` に集約する段階リファクタの第 1 段
  - (2026-05-27): trip 詳細エディタ B-2 完了 — 13b 旅程編集モーダルを factory の per-seg-rows / trip-level mode に移行 (v393 deploy, §243)。`saveTripEdit` の DOM query を `editor.getDraft()` 経由に統一。旧 9 関数 + 旧 4 input は dead code (B-4 撤去予定)
  - (2026-05-27): trip 詳細エディタ B-3a 完了 — 13b の ⏱ 遅延 + 📝 自由メモ を factory の 2nd instance (`_tripEditMetaEditor`) に集約 (v394 deploy, §244)。factory に `initDelay/collectDelay` (h/m 入力、0→null、上限 5999 クランプ) + `initNotes/collectNotes` (textarea trim 空→null) + section header div を本実装。1 modal 2 editor instance は中間状態 (B-4 で統合)。残り: B-3b (time row、5 精度 + GPS preset) → B-3c (07 への移植、mania toggle 対応) → B-4 (グローバル Map + dead code 撤廃) → A (一括記録パネル)
  - (2026-05-27): v181 既存バグ修正 — trip の delay_minutes/notes が編集後リロードで消える件 (v395 hotfix, §245)。schema は v181 以前から両カラム保有していた (REST status 200 で確認) が、`tripForSupabase()` で destructure-strip + `saveTripEdit` の `tripPatch` から欠落していた追従漏れ。3 箇所修正: 07 strip 撤回 + 13b PATCH に追加 + syncFromSupabase で localStorage merge back (v395 以前データ救済)
  - (2026-05-28): trip 詳細エディタ B-3b 完了 — 13b の 🕒 乗車時刻 row も factory の 3rd instance (`_tripEditTimeEditor`) に集約 (v396 deploy, §246)。factory に `initTimeRow / collectTimeRow` を precisions=['minute','day'] 専用ロジックで本実装 (closure に `_initialPrecision` snapshot、`_supportsFull5Precisions()` で早期 return)。`features.timeRow` を boolean → `{ precisions: [...] }` object に拡張 (5 精度版 = B-3c で本実装)。`saveTripEdit` の DOM 直読み 30 行を `_tripEditTimeEditor.getDraft()` の 7 行に置換。preview server で 4 シナリオ (無変更 / date クリア / day 降格 / minute 昇格) round-trip 検証 + 全 patch 期待通り。13b の time/train/delay/notes 4 セクション全部 factory 経由に揃った。残り: B-3c (07 移植、5 精度 + GPS preset + mania toggle) → B-4 (3 instance 統合 + dead code 撤去) → A (一括記録パネル)
  - (2026-05-28): trip 詳細エディタ B-3c 完了 — 07 確認モーダル側の 🕒 乗車時刻 (5 精度 + GPS preset 連動) + ⏱ 遅延 (mania toggle + localStorage 永続化) + 📝 自由メモ を factory に集約 (v397 deploy, §247)。factory に `_initTimeRowFull5 / _collectTimeRowFull5` (5 精度 UI + 年/月 select + collect) を closure 内に追加、`features.delay` を boolean → `{ maniaToggle, prefKey }` object 両対応に拡張 (checkbox + localStorage 永続化 + 値クリア)。07 で `_recTimeEditor / _recMetaEditor` 2 instance を新設 (GPS 記録時は time skip)、`saveMultiSegmentTrip` の 60 行を 13 行に圧縮、`updateRecConfirmTimeRow` を draft 経由に書き換え。preview server で 7 シナリオ (5 精度 + delay maniaToggle + GPS 経路 hide) round-trip 完全合致 + 13b regression なし。検証中に SW キャッシュ事故 (sw.js bump 前で旧 JS が返り mount が動かない問題) を発見、教訓を §247 末尾に記録。02/07/13b 3 箇所重複していた確認モーダル中身は train/time/delay/notes の主要 4 セクション全てで factory 経由に揃った。残り: B-4 (各 modal 1 instance に統合 + dead code 撤去) → A (一括記録パネル)
  - (2026-05-28): trip 詳細エディタ B-4-a 完了 — 13b / 07 の visible dead code (旧 14 関数 + HTML 19 element + onchange 参照) を撤去、~350 行削除で可読性向上 (v398 deploy, §248)。13b: `applyTripEditCategoryVisibility / populateTripEditTrainDropdown / onTripEditCategoryChange / applyTripEditSegCategoryVisibility / populateTripEditSegCarSelect / restoreTripEditSegCascade / onTripEditSegCategoryChange / onTripEditSegTrainChange / onTripEditSegCarChange / onTripEditTrainChange` の 10 関数 (264 行) + 旧 12 HTML element 削除。07: `onRecEditPrecisionChange / _populateRecEditYearMonth / initRecDelayToggle / onRecDelayToggle` の 4 関数 (70 行) + 旧 12 HTML element 削除。グローバル `NORIRECO.trains.selectedXxxBySl / activeChipSlId` + 02 旧 cascade handler + 07 旧 SL chip ロジック (300+ 行) は dead 確認済だが規模大のため B-4-b 別 commit で対応。preview server で 07 確認 + 13b 編集モーダル両方の mount + 値復元 OK、console error 0。残り: B-4-b (グローバル selectedXxxBySl 撤廃 + 02/07 旧 cascade handler + SL chip ロジック撤去 + 各 modal 3 instance を 1 instance に統合) → A (一括記録パネル)
  - (2026-05-28): CHANGELOG.md 1652 行を分割 — §214〜§241 (v364〜v391, 乗換候補自動提案 + 徒歩乗換グループ + 系統別車両形式 + 旅程編集 per-seg cascade + サブエージェント方針実装) を [`CHANGELOG_PHASE3.8-transfer.md`](CHANGELOG_PHASE3.8-transfer.md) に退避。本体は §242 (v392, trip 詳細エディタ B-1) から開始 = trip 詳細エディタ抽出フェーズ。STATUS.md の領域別ステータス表も同時にスリム化 (v364〜v391 → 完成行、v392〜v398 → 進行中行)。命名: 主軸が乗換 (1 hop/2 hop/直通あり/徒歩乗換) のため `transfer`
  - (2026-05-28): 一括記録 A-8 完了 — 区間ピッカー (from/to 2 select) (v406 deploy, §256)。アコーディオン body 先頭に「🚉 区間」セクション、stations 全駅から from/to dropdown、駅数 + 「全線」/「N 駅 / M 駅中」自動判別表示。change で `_bulkDrafts.segments[0]` 更新 + `_edited=true` + factory 再 mount (initial 渡し直し、time/delay/notes 編集値は再 mount 前に保存)。`_buildTripFromDraft` の name と total_stations を segments[0] from/to ベースで動的化 (両端 = 「全線」, それ以外 = 「from→to」+ 区間内駅数)。preview で「中央本線快速 新宿→高尾 20 駅」+「上野東京ライン 全線 44 駅」の両立保存 OK
  - (2026-05-28): 一括記録 A-6+A-7 完了 (A 段階完結) — 空マップ時オンボーディングバナー + unknown 集計検証 (v405 deploy, §255)。**A-6**: `#empty-onboarding-banner` (gold + 矢印アニメ) を地図画面中央下に。`updateOnboardingBanner()` を 21-bulk-record.js に新設、`saveBulkDrafts` 後 + 通常記録 `saveMultiSegmentTrip` 後 (07 に hook 1 行追加) + DOMContentLoaded で呼ぶ。タップで `openBulkRecordSheet`。**A-7**: 期間フィルタが地図塗りにも影響することを確認、ユスケ判断で現状 (b) 確定 = 「期間フィルタ = 日時判明 trip 内で絞る」意味論で整合、Notion §1.3 採用 (a) を撤回。これで A 段階全完了 (環状線対応は別タスクへ持ち越し)
  - (2026-05-28): 一括記録 A-5 完了 — アコーディオン展開 (v404 deploy, §254)。行右端 ▶/▼ で `createTripDetailEditor` (per-seg-rows + 5 精度 time + delay + notes) を multi-container API で行内 mount。Notion §1.3「同時 1 行制御」: 別行展開で現開行 close → `editor.getDraft()` で draft 上書き (`_edited: true`) + destroy。`_buildTripFromDraft` を `_edited` 分岐対応、編集済み行は名前に ✏️。preview で展開→入力 (delay 90分+notes)→別行展開→上書き→保存→trip 反映 全 OK。環状線半周分割は SERVICE_LINES と N02 line の駅順ズレで根本解決せず A-5 スコープ外へ (山手線 17/30 駅塗りの既知制約として bulk-note に明記)
  - (2026-05-28): 一括記録 A-4 完了 — 検索 + 並び替え + 地域フィルタ (v403 deploy, §253)。`_filter = { query, sort, group }` state、検索 input (系統名/会社/id 部分一致 + 空白 AND)、並び替え `近く順 (lastUserGps > map center 優先)` / `名前順 (50 音)`、地域 group dropdown (13 値)。`_renderChecklistOnly()` でフィルタバー保持 + checklist だけ再描画 (IME 安定 / mp-trip-filter と同設計)。preview で 5 シナリオ (「山手」/AND「JR東日本 新幹線」/「関西」絞り込み/50 音順/リセット) + チェック状態保持 全 OK
  - (2026-05-28): 一括記録 A-3 完了 (MVP) — 一括保存実装 (v402 deploy, §252)。`saveBulkDrafts` で draft 配列を順次 trip 構築 + Supabase POST + localStorage push + RIDDEN_SEGS bulk push + rideRecord.rebuild + redrawAll + updateOverlays + _mypageCache push + renderMpTripsResultOnly + 駅シート refresh + トースト + sheet 自動 close。`_buildTripFromDraft` で `id=trip_${baseTime}_${idx}` / `name=${lineName} 全線` / `date_precision='unknown'` / `transfers=0` / `total_stations=stations.length`。部分コミット許容 (Supabase 失敗時も localStorage / RIDDEN_SEGS / cache 更新)。preview で 3 件保存 → riddenSt 全展開確認 + 完乗率更新確認 + console error 0。これで一括記録 MVP 完成 (残 A-4 検索/A-5 アコーディオン/A-6 オンボーディング/A-7 unknown 集計検証 は追加機能)
  - (2026-05-28): 一括記録 A-2 完了 — 営業系統チェックリスト本体 + たたむモード (v401 deploy, §251)。`_bulkDrafts: Map<lineId, draft>` で内部 state 管理、638 系統 (A-4 までフィルタなし) を全件描画、チェック = 全線 1 segment の draft push (`source=manual, verified=false, date_precision='unknown'`)、アンチェック = Map.delete、サマリ「N 件選択中」がリアクティブ更新。保存ボタンは A-3 まで disabled 骨だけ。環状線は 🔄 マーク (山手線 = 東京→有楽町 で visit-only 相当、A-5 で半周 2 seg 分割検討)。preview eval で 2 件チェック / 1 件アンチェック / close cleanup 全 OK、console error 0
  - (2026-05-28): 一括記録 (まとめて記録) A-1 着手 — `js/21-bulk-record.js` skeleton + `#bulk-record-sheet` モーダル枠 + マイページ旅程サブタブ上部に `.mp-bulk-entry` 常設エントリボタン (v400 deploy, §250)。`createTripDetailEditor` factory が B カテゴリで揃った上での A 本体着手 = Notion §1.3 設計確定「営業系統チェックリスト + アコーディオン同時 1 行展開」の受け皿。A-1 は open/close + 空 body プレースホルダのみ、A-2 以降で営業系統チェックリスト → たたむモード → 一括保存 MVP → 検索/フィルタ → アコーディオン (factory mount) → オンボーディング → unknown 集計検証 の順
  - (2026-05-28): trip 詳細エディタ B-4-b 完了 (リファクタ完結) — グローバル `NORIRECO.trains.selectedXxxBySl / activeChipSlId / selectedTrainId-Name-Category-CarModel` 9 fields 撤廃 + 02 旧 cascade handler (resetTrainSelector / onTrainCategoryChange / onTrainChange / onTrainCustomInput / onCarModelChange / onCarModelCustomInput ~190 行) + 07 旧 SL chip ロジック (applyRecTrainCategory / clearAllTrainSelections / populateSlVehiclePicker / selectSlChip / populateSlVehicleSelect / onSlVehicleChange / isInDropdown / onSlVehicleCustomInput ~330 行) 撤去 + factory に `containers: { time, train, delay, notes, photos }` multi-container API 追加 + 各 modal **3 instance → 1 instance** 統合 (07 `_recEditor` / 13b `_tripEditEditor`)、HTML の `#rec-meta-container` / `#trip-edit-meta-container` を delay/notes 独立コンテナに分割 (v399 deploy, §249)。正味 ~540 行削除。preview server で factory 直接テスト + 13b round-trip + 07 mount + train mania toggle 全 OK、console error 0。SW キャッシュ汚染 (HTTP 304 networkFirst fallback) で検証に時間取られたが本番では再現しない (§249 末尾記録)。これで trip 詳細エディタ抽出 B カテゴリ完結 = 次は A (一括記録パネル)
