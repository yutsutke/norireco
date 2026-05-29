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

**`CACHE_VERSION = 'v418'`** · デプロイ回数 = バージョン番号の不変式

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

- `noritetsu-map.html`（910 行、地図画面 — 唯一の HTML 画面、v407 で `noritetsu-log.html` 削除）
- `js/01-..〜21-..`（機能別 ES Modules、v131〜v138 で 13 ファイル化、v190 で 13-mypage を 4 分割、v192 で 02b-service-lines-builder を分離、v194 で 04b-ride-record を分離、v258 で 18-photo-area を分離、v392 で 20-trip-detail-editor を新設、v400 で 21-bulk-record を新設）
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
| **Phase 3.8 シェア + Cloudflare 移行期** (v226〜v249) | ✅ 完成 — 旅程編集拡張 / ログアウトセキュリティ + 静的デモ撤去 + LOD シンプル化 / OGP 画像生成 MVP + リージョン中央駅 / 完乗率統合 + 用語統一 / 系統色カスタマイズ + Supabase 同期 / onclick window bridge 漏れ修正 / GitHub Pages → Cloudflare Pages + norireco.app。シェア機能の残 → **v410〜v413 (S-1〜S-3) で完結** (verified 限定ガードは v345 で撤回)。詳細 → [`CHANGELOG_PHASE3.8-share.md`](CHANGELOG_PHASE3.8-share.md) |
| **Phase 3.8 駅メモ + R2/写真期** (v250〜v278) | ✅ 完成 — 駅メモ本格化 (Supabase CRUD + マイページ「📸 メモ」タブ) / 駅アクションシート / R2/Workers ゲートウェイ (api.norireco.app + cdn.norireco.app、presigned PUT URL、JWT ES256 JWKS verify) / 写真添付フル機能 (memo/trip 最大 5 枚、Canvas 圧縮、D&D 並び替え、削除時 R2 cleanup) / Notion ドキュメント整理 (STATUS.md 分離 + 役割分担再集約)。詳細 → [`CHANGELOG_PHASE3.8-photo.md`](CHANGELOG_PHASE3.8-photo.md) |
| **Phase 3.8 マイページ強化期** (v279〜v289) | ✅ 完成 — 削除/GPS 認証の即時 UI 反映 (renderMypage) / 地図駅クリックで「この駅を含む旅程」一覧 (v282) / 路線アクションシート + 旧 📸 memoMode 撤去 / マイページ旅程・メモに駅名検索 (4 chip 始点/終点/乗換/通過 + IME 変換安定化)。詳細 → [`CHANGELOG_PHASE3.8-mypage.md`](CHANGELOG_PHASE3.8-mypage.md) |
| **Phase 3.8 駅 ID 体系期: Phase 1〜3 完結 + ドキュメント整理** (v290〜v333) | ✅ 完成 — `merged_stations.json` 全 9,030 駅に `s_NNNNN` id 付与、SERVICE_LINES / LINES / trip / memo / キャラ全層を id ベース化、同名異所駅の判定混線を全面解消。SQL DROP COLUMN (memo.station / trip.from_station/to_station) も Applied 規約 (migration ファイル末尾の `-- Applied:` を真実の源) 導入で完了。駅クリック確実化 (map.click delegate + polyline 近傍駅検索) / 駅名+都道府県検索 / FAB 並び 📍📝🎭🌙 / startup 着手前手順を hook → CLAUDE.md へ移管。詳細 → [`CHANGELOG_PHASE3.8-station-id.md`](CHANGELOG_PHASE3.8-station-id.md) |
| **Phase 3.8 through_lines + GPS 位置づけ変更 + 車両形式 DB + 記録モーダル整理** (v334〜v363) | ✅ 完成 — through_lines (直通系統) 本格運用化 (v334-v343 で新幹線 3 + 関東 26 + 関西 27 + 名古屋 19 + 第三セクター 23 = 142/642 系統 22.1% カバー)。GPS 記録の位置づけを「世間への証明」→「手間省略」に転換 (`11-fraud-detection.js` 削除)。営業系統×車両形式 DB を Notion → JSON 連携 (`service_line_vehicles.json`)。記録モーダル全面整理 (遅延独立トグル + カテゴリ dropdown 駆動 + 普通電車 cascade)。旅程/路線/メモ全層に車両形式統合 + 検索 + 路線詳細モーダル。メモ migration 2 件 (v360/v363) Applied。詳細 → [`CHANGELOG_PHASE3.8-vehicles.md`](CHANGELOG_PHASE3.8-vehicles.md) |
| **Phase 3.8 乗換候補自動提案 + 徒歩乗換グループ + 系統別車両形式 + 旅程編集 per-seg cascade + サブエージェント** (v364〜v391) | ✅ 完成 — 乗換候補 (1 hop top 5 + 直通あり優先 + 2 hop fallback top 3)・徒歩乗換グループ DB (243 グループ/553 駅自動抽出 + Union-Find transitive closure)・系統別車両形式 (`T.selectedCarModelBySl` Map + chip 切替)・記録モード「区間 → カスケード」順 per-seg 化・旅程編集モーダル per-seg フル cascade・サブエージェント `js-syntax-guard` 配置。詳細 → [`CHANGELOG_PHASE3.8-transfer.md`](CHANGELOG_PHASE3.8-transfer.md) |
| **Phase 3.8 trip 詳細エディタ抽出 + 一括記録 (B + A カテゴリ)** (v392〜v406) | ✅ 完成 — **B (v392〜v399)**: 確認モーダル中身の 02/07/13b 3 箇所重複を単一 factory `createTripDetailEditor` (per-seg-chip / per-seg-rows / trip-level 3 mode + multi-container API) に段階リファクタで集約、グローバル `NORIRECO.trains.selectedXxxBySl` 9 fields 撤廃 + 02/07 旧 cascade/SL chip ~520 行撤去、正味 ~540 行削除。**A (v400〜v406)**: Notion §1.3 設計確定「営業系統チェックリスト + たたむ/開くアコーディオン」本体実装。A-1 skeleton + A-2 チェックリスト + たたむモード + A-3 一括保存 MVP + A-4 検索/並び替え/地域フィルタ + A-5 アコーディオン展開 (factory 行内 mount、同時 1 行制御、編集 ✏️ マーク) + A-6 空マップオンボーディングバナー + A-7 unknown 集計検証 (現状 (b) 確定 = 「期間フィルタ = 日時判明 trip 内で絞る」意味論で整合) + A-8 区間ピッカー (from/to 2 select + 駅数 meta、change で factory 再 mount、name と total_stations を segments[0] from/to で動的化)。**残課題** (別タスクへ持ち越し): 環状線対応 (山手線 17/30 駅塗り、N02 line データ補完) + bulk アコーディオンに写真添付 + 複数 segment 対応。詳細 → [`CHANGELOG_PHASE3.8-bulk-record.md`](CHANGELOG_PHASE3.8-bulk-record.md) §242〜§256 |
| **Phase 3.8 ログ画面廃止 + 年横断フィルタ + シェア機能 MVP (S-1〜S-3) + 磨き込み + 取り消し UI + 未ログイン開放** (v407〜v418) | ✅ 完結 — 旧 `noritetsu-log.html` 削除 (一括記録が受け皿、v407) / 乗車日時ラベル整理 (v408) / 期間フィルタに「年横断 (季節/月)」モード (春夏秋冬プリセット + 月複数トグル、行楽期区切り 春4-5/夏7-8/秋10-11/冬12-1、v409)。**シェア機能 MVP 完結**: 個別 trip シェア画像 (区間ズーム地図 + 始点○終点● + 路線/経路詳細、v410-v411) → R2 永続保存 (Worker `/upload/share-image`、v412) → `/share/<id>` 受け側ページ (Supabase `norireco_shares` 公開SELECT RLS + Cloudflare Pages Function で OGP メタ SSR + 「自分も記録」CTA、v413、X unfurl 実機確認済)。**磨き込み (v415→v417)**: 📤 シェアを一旦 /share リンクに統合 (v415) → Windows 実機で OS 共有シートが file 共有時に URL を落とすと判明 → **「📤 画像をシェア」「🔗 リンクをシェア」の 2 ボタンに再分離 (v417、🔗 は PC=コピー / モバイル=Web Share)**。Worker delete regex に `shares` 3-segment 分岐 (deploy 済 Version d854330d)。**取り消し UI (v416)**: マイページ 5 番目「🔗 シェア」サブタブ = 作成済みシェア一覧 + リンクコピー + 取り消し (norireco_shares DELETE → R2 best-effort cleanup)。**未ログイン開放 (v418)**: 📝/📍/📋 記録 FAB から `fab-login-only` 撤去 + マイページ未ログイン分岐をゲストモード UI (⚠️ 警告バナー + サブタブ nav + localStorage trips ベースの完乗率) に改修 + 保存系を `uid=null` 許容 (Supabase POST スキップ + 「端末内のみ / 更新で消失」トースト)。オンボーディングバナー「一瞬しか出ない」を `_syncSettled` ゲートで修正 (Supabase 同期 or 未ログイン確認まで hidden 維持)。残: 垢BAN (share_banned) 連携は別タスク。詳細 → CHANGELOG §257〜§268 |
| Supabase RLS 強化 (user_id = auth.uid() 必須) | ❌ 未着手（🔥 v233 残課題）— SUPABASE_KEY は frontend 露出 anon key、REST 直叩きで他人生データを取れる。UI 防御は v233 で済 |
| **Phase 1.5: Map × Claude チャット統合 MVP** | ❌ 未着手（🔥 新規 / 2026-05-19）— 地図画面横にチャットパネル + Claude API + 乗レコ MCP server。最小 1 ヶ月。Notion §3.3 参照 |
| 駅 UI 情報ハブ化（4 領域パネル） | ❌ 未着手 |
| キャラ図鑑タブ | ❌ 未着手 |
| 普通電車の車両形式選択 | 🟡 MVP 完成 (v348) — データ層 (v347) + UI (v348) 完成、Phase 2 で unmatch 17 件 + Notion DB 表記揺れクリーンアップ予定 |
| ノリレコログ廃止 → 一括記録で置換 | ✅ 完成 — v407 で `noritetsu-log.html` 削除、一括記録 (v400-v406) が受け皿 |
| 垢 BAN 対応（共有のみ停止・個人記録は維持） | ❌ 未着手（🔥 不正検知連動） |
| マップ情報レイヤー構想 | ❌ 未着手（将来） |
| 廃線対応 | ❌ 未着手（🎮 将来） |

詳細は `TODO.md`（🔥最優先 / 🟡体験向上 / 🟢データ充実 / 🔧パフォーマンス / 🎮将来 / 🌱布石）を参照。

---

## 直近のフェーズ

- **Phase 2〜3.7** (v60〜v157): 営業系統ベース地図 → 駅キャラ → 認証グラデーション + GPS 獲得 → 現在地・最寄駅 → 列車種別・コード分割 → 不正検知・ログイン・マイページ
- **Phase 3.8** (v158〜): データ補修 + 期間フィルタ拡充 + 記録 UX (v158〜v188, [-early](CHANGELOG_PHASE3.8-early.md)) → ES Modules 全面化 (v189〜v225, [-modules](CHANGELOG_PHASE3.8-modules.md)) → シェア MVP + Cloudflare 移行 (v226〜v249, [-share](CHANGELOG_PHASE3.8-share.md)) → 駅メモ + R2/Workers + 写真添付 + Notion 整理 (v250〜v278, [-photo](CHANGELOG_PHASE3.8-photo.md)) → マイページ即時反映 + 駅/路線アクションシート + 駅名検索 (v279〜v289, [-mypage](CHANGELOG_PHASE3.8-mypage.md)) → 駅 ID 体系 Phase 1〜3 完結 (v290〜v333, [-station-id](CHANGELOG_PHASE3.8-station-id.md)) → through_lines + GPS 位置づけ + 車両形式 DB + 記録モーダル整理 (v334〜v363, [-vehicles](CHANGELOG_PHASE3.8-vehicles.md)) → 乗換候補・徒歩乗換・系統別車両形式・per-seg cascade・サブエージェント (v364〜v391, [-transfer](CHANGELOG_PHASE3.8-transfer.md)) → trip 詳細エディタ抽出 B-1〜B-4-b 完結 (v392〜v399) → 一括記録 A-1〜A-8 完結 (skeleton + チェックリスト + 保存 MVP + 検索/フィルタ + アコーディオン展開 + オンボーディング + unknown 検証 + 区間ピッカー) (v400〜v406) → ログ画面廃止 + 年横断 (季節/月) フィルタ + シェア機能 MVP (S-1 個別 trip 画像 / S-2 R2 永続 / S-3 `/share/<id>` ページ) (v407〜v413) → Notion §2.7 命名辞書を 3 ページ構成にリストラクチャ (v414 no code) → シェア磨き込み: 📤 を /share リンクに統一 + delete regex に shares 分岐 (v415) → シェア取り消し UI: マイページ「🔗 シェア」タブ (一覧 + コピー + 取り消し) + URL コピー導線復活 (v416) → シェアモーダルを「📤 画像」「🔗 リンク」2 ボタンに再分離 (Windows OS 共有シートが file 共有時 URL を落とすため、v417) → 未ログイン (ゲストモード) で記録 (📝/📍/📋) とマイページ概要を開放 + オンボーディングバナー「一瞬しか出ない」修正 (`_syncSettled` ゲートで Supabase 同期完了まで判定遅延) (v418) ← **今ここ**
- **ドキュメント整理**
  - (2026-05-20): CHANGELOG.md 4 ファイル分割
  - (2026-05-23): §0.1 を `STATUS.md` に分離・git 管轄化（Stop フック対象に）
  - (2026-05-25): CLAUDE.md セッション開始時手順を強化 — Notion §0 fetch を毎セッション必須化 + 完了報告 3 行を強制（v322 §172）
  - (2026-05-26): CHANGELOG.md 5722 行を分割 — 当初 2 アーカイブ (share-r2 + station-id) に退避したが share-r2 が 3275 行で太かったため同ターン内で share / photo / mypage の 3 ファイルに再分割し最終 4 アーカイブ構成に。Stop hook に 1500 行超チェックを追加、CLAUDE.md に「CHANGELOG.md 整理時は STATUS.md も同時整理」ルール明記（v349）
  - (2026-05-27): CHANGELOG.md 1594 行を分割 — §184〜§213 (v334〜v363, through_lines + GPS + 車両形式 + 記録モーダル整理) を `CHANGELOG_PHASE3.8-vehicles.md` に退避。本体は §214 (v364, CHANGELOG 行数チェック移管) から開始 (乗換候補機能群 v365〜v367 を集約)
  - (2026-05-27): Notion 「🤖 サブエージェント方針」を実装 — `.claude/agents/js-syntax-guard.md` 配置 (v391 no deploy, §241)。サブエージェント = 編集ループ中の早期検出 (任意) vs PreToolUse(git push) フック (TODO 🔧 未着手) = 最終ゲート (強制) の層分け
  - (2026-05-27〜28): trip 詳細エディタ抽出 + 一括記録 (B + A カテゴリ全 16 段階) 完結 — B-1〜B-4-b (v392〜v399) で `createTripDetailEditor` factory に 02/07/13b 3 箇所重複を集約 (~540 行削除)、A-1〜A-8 (v400〜v406) で Notion §1.3「一括記録 (まとめて記録)」本体実装 (チェックリスト + たたむ/開くアコーディオン + 検索/フィルタ + 一括保存 + 同時 1 行 factory 行内 mount + オンボーディングバナー + unknown 集計検証 (現状 (b) 確定) + 区間ピッカー)。詳細 → [`CHANGELOG_PHASE3.8-bulk-record.md`](CHANGELOG_PHASE3.8-bulk-record.md) §242〜§256
  - (2026-05-28): CHANGELOG.md 6 回目分割 — 1682 行に膨らんだため §242〜§256 (v392〜v406) を [`CHANGELOG_PHASE3.8-bulk-record.md`](CHANGELOG_PHASE3.8-bulk-record.md) に退避。命名: B (trip 詳細エディタ抽出) は A (一括記録) のための前提作業なので両者を 1 アーカイブに統合、主軸の `bulk-record` で命名。STATUS.md 領域別ステータス表も同時にマージ (B + A → 1 行)
  - (2026-05-29): ログ画面廃止 (v407) + 乗車日時ラベル整理 (v408) + 年横断 (季節/月) フィルタ (v409) + シェア機能 MVP S-1〜S-3 (v410〜v413) を実装。シェアは「個別 trip 画像 → R2 永続 → /share/<id> ページ (OGP + CTA)」で完結し X unfurl を実機確認。新インフラ: Cloudflare Pages Function (`functions/share/[id].js`、norireco.app と同一ドメインで OGP SSR) + Supabase `norireco_shares` テーブル (公開 SELECT RLS、migration v413 Applied)。CHANGELOG §257〜§263。Notion §1.1 / §2.2 / §2.7 を整合済
  - (2026-05-29): Notion §2.7 命名辞書を 3 ページ構成にリストラクチャ (v414, no functional code change) — §2.7 本体を索引・基本軸・新語チェックリスト・未統一のみに圧縮 (83KB → ~5KB)、新規 §2.7.1 用語集 (7 カテゴリの統合表 + 廃止語全期統合 + 変数名対応) と §2.7.2 意思決定ログ (テンプレ + 記入例 + 時系列 DESC ログ一覧 v249〜v413) を子ページとして作成。CLAUDE.md「§2.7 に追記」→「§2.7.1 (新語) / §2.7.2 (設計判断) に追記」に修正。CHANGELOG §264
  - (2026-05-29): 未ログイン (ゲストモード) 開放 (v418) — マイページ未ログイン分岐をエンプティから「ゲストヘッダ + ⚠️ 警告バナー + 5 サブタブ nav」に置換、`fab-login-only` クラスを 📝/📍 から撤去して全 FAB を未ログインでも触れるように、saveMultiSegmentTrip / saveBulkDrafts に `isGuest` 分岐を入れて未ログイン時は Supabase POST スキップ + 「⚠️ 端末内のみ・更新で消失 / 🔑 ログインで保存」トースト。同時にオンボーディングバナー「一瞬しか表示されない」を `_syncSettled` ゲート (Supabase 同期完了 or 未ログイン確認まで hidden 維持、循環 import 回避のため `window.NORIRECO.bulkRecord.markSyncSettled` 経由) で修正。CHANGELOG §268
