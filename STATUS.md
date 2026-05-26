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

**`CACHE_VERSION = 'v366'`** · デプロイ回数 = バージョン番号の不変式

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
| **Phase 3.8 through_lines + GPS 位置づけ変更 + 車両形式 DB + 記録モーダル整理 + 乗換候補自動提案** (v334〜v366) | ✅ 進行中 — through_lines 本格運用化 (v334 で 3 手動キュレーション系統 + UI / v335-v343 で新幹線 3 ペア + 関東 26 + 関西 27 + 名古屋 19 + 第三セクター+細支線 23、through 持ち系統 14→142/642 で 22.1% カバー)。v344-v346 で GPS 記録の位置づけを「世間への証明」→「手動の手間省略」に方針転換 (`11-fraud-detection.js` 削除・バッジ中立化・`retroactivelyVerifyTrip` 撤去)。v347-v348 で営業系統×車両形式 DB を Notion 連携で構築 (`service_line_vehicles.json` / 記録モード UI にトグル + 区間→候補車両 dropdown)。v350 で記録モーダルを整理: ⏱ 遅延入力を独立トグル化 (デフォ非表示) + 普通電車/特急 ラジオで車両形式 UI を排他表示。v351 で「(マニア向け)」文言削除 + 普通電車レーン dropdown 末尾に「✏️ 別形式を入力」option 追加。v352 で v350 のラジオを撤廃 → カテゴリ dropdown 駆動に統一 (cat='local' なら sl レーン / それ以外なら cascade レーン)。v353 でカテゴリ dropdown の並びを「普通」先頭に変更 (最頻出選択肢のアクセス性優先)。v354 で旅程カードに車両形式表示を追加 (普通=`🚆 [E235系0番台]` / 特急=`🚆 あずさ [E353系]`)。v355 で旅程編集モーダルも整理 (カテゴリ「普通」先頭 + 「指定しない」両 input hide / 「普通」列車名 hide / それ以外両表示)。v356 で編集モーダルにも記録モーダル並みの列車 dropdown を追加 (特急等選択時にマスターから候補表示、「リストにない」で手入力 fallback)。v357 で旅程タブに「🚆 車両」検索 input を追加 (substring 検索、大文字小文字不問、駅名検索と AND 関係)。v358 で路線タブにも車両形式を表示 (各路線カードに乗車車両 上位 3 個 + 「他 N 件」) + 同検索 input (IME 安全な再描画分割)。v359 で路線カードに 📺 旅程 / 📸 メモ アイコン (件数 0 は非表示) を追加、クリックで路線詳細モーダル (#mp-line-detail-modal、タブ切替) で関連旅程/メモを一覧表示。v360 でメモ側にも車両形式を統合 (Supabase migration `v360_memo_car_model.sql` 実行済 2026-05-27 + 記録/編集モーダル input + 一覧 `🚆 [E235系]` 表示 + 「🚆 車両」検索 input)。v361 でメモ車両選択を記録モーダルと同じフル cascade 化 (カテゴリ → 普通=line_id から sl 車両 / 特急=列車選択→車両形式)。v362 で cascade を整理 (`#m-car-model` は `__custom__` 選択時のみ show、それ以外 hide で二重 UI 解消)。v363 でメモに train_name 列を追加 (Supabase migration `v363_memo_train_name.sql` 実行済 2026-05-27) — `onMemoTrainIdChange` で master train.name を shadow セット、一覧で `🚆 あずさ [E353系]` 旅程カード形式表示。v364 (no deploy) で CHANGELOG 行数チェックを Stop hook → セッション末手続きに移管 (毎ターン警告過剰のため)。v365 で記録モードに「乗換候補自動提案」を追加: 別系統 2 駅 (例: 浅草 → 新宿) を選ぶと「⚠️ 共通する運行系統がありません」だけでなく 1 hop で繋がる乗換駅候補 Top 5 を chip 表示 (id ベース駅一致 + name fallback、総駅数昇順 dedupe)、chip タップで R.selection 挿入 + lineA/lineB を pairLineChoices に pre-select。v366 で 2 つ強化: (1) through_lines (直通系統) の 1 hop 候補は「🚉 直通あり」バッジ付き + 直通優先ソート (例: 中央線快速→青梅線 立川直通)、(2) 1 hop ゼロなら 2 hop fallback (例: 函館→弘前で「🔁🔁 新函館北斗/新青森」3 系統提案、`insertTwoTransferStations` で 2 駅同時挿入)、駅→系統索引キャッシュで 2 hop 探索 ~400ms。CHANGELOG.md 現本体参照 |
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
- **Phase 3.8** (v158〜): データ補修 + 期間フィルタ拡充 + 記録 UX (v158〜v188, [-early](CHANGELOG_PHASE3.8-early.md)) → ES Modules 全面化 (v189〜v225, [-modules](CHANGELOG_PHASE3.8-modules.md)) → シェア MVP + Cloudflare 移行 (v226〜v249, [-share](CHANGELOG_PHASE3.8-share.md)) → 駅メモ + R2/Workers + 写真添付 + Notion 整理 (v250〜v278, [-photo](CHANGELOG_PHASE3.8-photo.md)) → マイページ即時反映 + 駅/路線アクションシート + 駅名検索 (v279〜v289, [-mypage](CHANGELOG_PHASE3.8-mypage.md)) → 駅 ID 体系 Phase 1〜3 完結 (v290〜v333, [-station-id](CHANGELOG_PHASE3.8-station-id.md)) → through_lines 本格運用化 + GPS 位置づけ変更 + 車両形式 DB + 記録モーダル整理 + 乗換候補自動提案 (v334〜v366) ← **今ここ**
- **ドキュメント整理**
  - (2026-05-20): CHANGELOG.md 4 ファイル分割
  - (2026-05-23): §0.1 を `STATUS.md` に分離・git 管轄化（Stop フック対象に）
  - (2026-05-25): CLAUDE.md セッション開始時手順を強化 — Notion §0 fetch を毎セッション必須化 + 完了報告 3 行を強制（v322 §172）
  - (2026-05-26): CHANGELOG.md 5722 行を分割 — 当初 2 アーカイブ (share-r2 + station-id) に退避したが share-r2 が 3275 行で太かったため同ターン内で share / photo / mypage の 3 ファイルに再分割し最終 4 アーカイブ構成に。Stop hook に 1500 行超チェックを追加、CLAUDE.md に「CHANGELOG.md 整理時は STATUS.md も同時整理」ルール明記（v349）
