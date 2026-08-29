# 乗レコ - 電車旅 更新履歴詳細

各セッションごとの実装ログ・経緯・失敗教訓を時系列で残す詳細メモ。

> ドキュメント役割分担は Notion §0「ドキュメント役割分担」が真実の源（v276 で Notion に集約）。本ファイルは変更履歴詳細を扱う。
> 過去フェーズは [`CHANGELOG_PHASE1-3.7.md`](CHANGELOG_PHASE1-3.7.md) / [`CHANGELOG_PHASE3.8-early.md`](CHANGELOG_PHASE3.8-early.md) / [`CHANGELOG_PHASE3.8-modules.md`](CHANGELOG_PHASE3.8-modules.md) / [`CHANGELOG_PHASE3.8-share.md`](CHANGELOG_PHASE3.8-share.md) / [`CHANGELOG_PHASE3.8-photo.md`](CHANGELOG_PHASE3.8-photo.md) / [`CHANGELOG_PHASE3.8-mypage.md`](CHANGELOG_PHASE3.8-mypage.md) / [`CHANGELOG_PHASE3.8-station-id.md`](CHANGELOG_PHASE3.8-station-id.md) / [`CHANGELOG_PHASE3.8-vehicles.md`](CHANGELOG_PHASE3.8-vehicles.md) / [`CHANGELOG_PHASE3.8-transfer.md`](CHANGELOG_PHASE3.8-transfer.md) / [`CHANGELOG_PHASE3.8-bulk-record.md`](CHANGELOG_PHASE3.8-bulk-record.md) / [`CHANGELOG_PHASE3.8-share-mvp.md`](CHANGELOG_PHASE3.8-share-mvp.md) / [`CHANGELOG_PHASE3.8-guest-rls-ban.md`](CHANGELOG_PHASE3.8-guest-rls-ban.md) / [`CHANGELOG_PHASE3.8-share-metrics.md`](CHANGELOG_PHASE3.8-share-metrics.md) にアーカイブ。

> 🗺 2026-06-19〜21 (非デプロイ・振り返り artifact): 開発史の可視化 [`journey.html`](journey.html)（Plotly 対話3D）/ [`journey3d.html`](journey3d.html)（three.js 地形トレース＋ミニマップ）/ [`journey-walk.html`](journey-walk.html)（スカルプト地形を歩く・編集できる版）を追加。PWA 非資産のため `sw.js` 据え置き（CACHE_VERSION 不変）。2D 側面図で意味を固めてから 3D・歩行版へ展開した流れ。

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
- 2026-08-29 分割 (7回目): v457 時点で 1789 行に膨らんだため、完成しているサブテーマを 3 つに退避
  - §257〜§267 (v407〜v417, 旧ログ画面廃止 + 年横断フィルタ + シェア MVP S-1〜S-3 + シェア磨き込み + Notion §2.7 整理) → [`CHANGELOG_PHASE3.8-share-mvp.md`](CHANGELOG_PHASE3.8-share-mvp.md)
  - §268〜§277 (v418〜v427, ゲストモード開放 + RLS 強化 + 駅 ID Phase 2 クローズ + 垢BAN + 管理 GUI) → [`CHANGELOG_PHASE3.8-guest-rls-ban.md`](CHANGELOG_PHASE3.8-guest-rls-ban.md)
  - §278〜§295 (v428〜v448, 一括記録の後始末 + シェア計測 3 段 + マイページ統計整合 + 達成演出) → [`CHANGELOG_PHASE3.8-share-metrics.md`](CHANGELOG_PHASE3.8-share-metrics.md)
  - 本ファイルは §296 (v449, iOS 対応 Phase A) から開始 = iOS 対応 → 「堀を作らない」→ MCP サーバ の現行フェーズ

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
- 旧 `noritetsu-log.html` 削除 (一括記録で完全置換)・期間フィルタ「年横断 (季節/月)」・シェア機能 MVP 3 段 (S-1 個別 trip 画像 / S-2 R2 永続 / S-3 `/share/<id>` ページ)・シェア導線の磨き込み (📤 のリンク統一 / 取り消し UI / Windows 共有シート対策の 2 ボタン分離)・Notion §2.7 命名辞書 3 ページ化 → [`CHANGELOG_PHASE3.8-share-mvp.md`](CHANGELOG_PHASE3.8-share-mvp.md)
- 未ログイン (ゲストモード) で記録開放とその集計バグ 2 件・**Supabase RLS 強化 (v233 残課題の本丸・本人のみ CRUD + user_id NOT NULL + anon REVOKE)**・駅 ID 体系 Phase 2 クローズ・垢BAN (本体 → full_banned enforcement → 旧 policy の穴塞ぎ → 管理 GUI MVP) → [`CHANGELOG_PHASE3.8-guest-rls-ban.md`](CHANGELOG_PHASE3.8-guest-rls-ban.md)
- 一括記録の後始末 (シート z-index / 写真添付 / 環状線の偽の注意書き撤去)・シェア計測 3 段 (view/click RPC → 登録転換 attribution → admin 横断ビュー + スクショ)・計測の admin 限定化・マイページ統計の GPS 特別扱い撤去 + ゲスト活動量表示・シェア画像の期間チップ・初回達成演出 → [`CHANGELOG_PHASE3.8-share-metrics.md`](CHANGELOG_PHASE3.8-share-metrics.md)

---

---

## 304. v457 — 🔌 乗レコ MCP サーバ：AI チャットから乗車記録をつけられるようにする

**カテゴリ**: A（ユスケ「mcp を作る。まずは AI チャット経由で旅の記録をできるようにする」2026-08-29）

STATUS の「Phase 1.5: Map × Claude チャット統合 MVP」のうち、**MCP サーバ側だけを先に独立して作った**。地図画面へのチャットパネル埋め込み（Claude API 課金・UI）は含まない。先に MCP を単体で立てておけば、Claude アプリからそのまま使えて価値を確かめられるし、後からパネルを載せるときも同じサーバを指すだけで済む。

新規 `mcp/`（Cloudflare Worker・`mcp.norireco.app`）。既存 `worker/`（R2 presigned URL 発行）とは別 Worker。

```
Claude ──OAuth 2.1──▶ mcp.norireco.app ──Supabase REST──▶ norireco_trips
                            └─ Supabase の Google ログイン (PKCE) で本人確認
```

**ツール 5 種（記録に必要な最小セット・ユスケ確定）**: `search_line`（「中央線」→ `jr_chuo_rapid`）/ `search_station`（同名駅は駅 id ごとに分けて返す）/ `preview_trip`（**保存せず**解決結果だけ返す）/ `record_trip`（保存）/ `list_recent_trips`。写真・削除・完乗率取得は入れていない。

### 設計判断①：ステートレス（Durable Object を使わない）

| 案 | 評価 |
|---|---|
| ローカル stdio サーバ（Node） | 実装は最短だがユスケの端末でしか動かず、スマホの Claude から使えない |
| `McpAgent`（Durable Object・セッション保持） | Cloudflare の定番だが DO の migration と課金プランが増える。今回のツールは全部 1 往復で完結しセッション状態が要らない |
| **`createMcpHandler`（ステートレス）** ← 採用 | `agents` v0.22 の現行推奨パス。DO 不要。バンドル 347 KB gzip |

### 設計判断②：service_role キーを持たない

MCP から Supabase に書く方法は 2 つある。**service_role キーで代理書き込み**すれば実装は楽だが、それは RLS を素通りするということで、v421（本人の行しか触れない）と v424（`full_banned` は新規記録不可）が **MCP 経由だけ効かない**穴になる。事故ったときの被害も全ユーザーに及ぶ。

採ったのは**ユスケ本人の access token で叩く**方式。OAuth 同意のときに Supabase の Google ログイン（PKCE）を通し、返ってきた refresh token を KV に置く。tool 実行のたびに access token を取り直す（refresh token は使うたびローテーションするので毎回書き戻す）。結果、既存の RLS と垢BAN がそのまま最終防衛線になる。

ブラウザ JS を一切積まずに PKCE を回せるのがこの方式の効いたところ（`@supabase/auth-js` の `_getUrlForProvider` / `exchangeCodeForSession` が組む URL とボディをサーバ側で再現した）。おかげで同意画面の CSP を `default-src 'none'` まで締められる。

### 設計判断③：駅 id はビルド時インデックスに焼く

`record_trip` は `from_station_id` / `to_station_id`（`s_NNNNN`）を正しく入れないと、**保存はできたのに地図が塗られない**という気付きにくい壊れ方をする。id の解決には本来 `service_lines_master.json` + `lines-p1〜4.json` + `merged_stations.json` の 5.6 MB が要るが、Worker で毎回 fetch + parse するのは無理がある。

`mcp/scripts/build-index.mjs` が **`js/02b-service-lines-builder.js` の `build()` をそのまま移植**して（N02 路線から座標を引く → 同名なら最近接の merged_stations の id を採る、v293 の `resolveStationId` 込み）、「系統 id / 名前 / 駅名と駅 id の並び」だけの 350 KB インデックスを吐く。636 系統 / 10,499 駅・**駅 id が付かなかった駅 0**。マスターデータを更新したら再生成が要る（README に明記）。

### 曖昧さは必ず表に出す

AI が勝手に解釈して誤った旅程を黙って保存するのが一番まずい。「新宿から八王子」だけだと中央本線快速・京王線・中央本線(東京〜塩尻) の 3 つが該当するので、**1 つに絞れないときは候補を返して呼び直させる**（実測で確認済）。環状線は配列の並び順で数えると逆回りの駅数になるため（山手線 東京→品川 = 25 駅）、本体 `saveMultiSegmentTrip` と数え方を揃えたうえで `warning` に「逆回りなら何駅か」を出す。同じ日・同じ区間の記録が既にあれば既定で保存を止める（`allow_duplicate: true` で突破）。

### 記録の出自（`source: 'mcp'`）

AI チャット経由は GPS を伴わない自己申告なので `verified: false`。ただし `source` は `gps_button` / `manual` に並ぶ 3 つ目として `'mcp'` を使い、後から「どこから入った記録か」を追えるようにした。`js/23-export.js` の `SOURCE_LABEL` に `mcp: 'AIチャット'` を追加（未知の値は生値表示にフォールバックする実装だったので、既存データは無影響）。**PWA 側の変更はこの 1 行だけ**。

### 検証

`wrangler dev` で実測:
- MCP: `initialize` / `tools/list` / `search_line`（中央線 → 3 候補）/ `preview_trip`（中央線快速 新宿→八王子 + 横浜線 八王子→町田 = 28 駅・乗換 1・75 分）/ 曖昧時の候補返却 / 未接続時の再接続案内。
- OAuth: 動的クライアント登録 → 同意画面（クライアント名が `Claude &lt;test&gt;` と HTML エスケープされること）→ POST で Supabase の Google authorize URL へ 302。同意の使い回しと CSRF 不一致がどちらも弾かれること。
- 保護: 無認証の `POST /mcp` が 401 + `WWW-Authenticate`、discovery 2 種が正しく出ること。
- `npm run check` 29/29。

途中で見つけて直した穴: 戻り先 URL を `request.url` から組むと **http のまま Supabase に渡り、認可コードが平文で飛ぶ**（`wrangler dev` で発覚）。localhost 以外は https に固定した。

### 接続できる人を絞れるようにした（ユスケ質問「これは、僕だけの設定？ほかの利用者への影響は？」への回答）

聞かれて初めて明文化した点: **この MCP は放っておくと誰でも繋げる**。Google アカウントがあれば
ユスケ以外の人でも `mcp.norireco.app/mcp` を自分の AI クライアントに登録して、自分の 乗レコ
アカウントに記録できる。データ自体は v421 の RLS で本人の行しか触れないので漏れないが、
**レート制限が無いので Cloudflare / Supabase の無料枠を外から使われうる**。

そこで `ALLOWED_EMAILS`（secret・カンマ区切り）を追加した。未設定 or 空なら全開放なので、
**本番で一度動くことを確かめるまでは自分だけに絞り、確かめたら secret を消すだけで開放できる**。
公開リポジトリなのでメールは `wrangler.toml`（git に載る）ではなく secret に置く。

判定は Google ログインの後（コード交換の直後・セッションを KV に保存する前）に置いた。本人確認は
ログインを通さないと成立しないので、許可外の人が試すと Supabase アカウント自体は作られる。ただし
norireco.app も Google で誰でもサインアップできるため、これは MCP が新しく開けた穴ではない。
ここで止めているのは「MCP から 乗レコ を操作できること」の方。判定ロジックは 8 ケース（未設定 /
空白のみ / 一致 / 大小文字 / カンマ + 空白 / 不一致 / email 無し / 空 email）で実測確認。

**既存の PWA 利用者への影響はほぼゼロ**であることも確認した: v457 の PWA 差分は
`js/23-export.js` の CSV ラベル 1 行と `sw.js` の CACHE_VERSION のみ、SQL migration 0 件
（スキーマ・RLS 無変更）。MCP Worker は別デプロイなので、デプロイしなければ誰にも何も起きない。

### 本番デプロイで踏んだ 同意画面の「やり直してください」（2026-08-29 追補）

ユスケが本番の Claude カスタムコネクタから繋いだところ、同意画面の送信で
「確認トークンが一致しませんでした」。原因の候補が 2 つあり、どちらも実際に踏みうる形だった:

1. **cookie の寿命が同意レコード (KV) と同じ 600 秒だった** — cookie がわずかに先に切れると
   「時間切れ」ではなく「トークンが一致しない」と表示され、**原因を取り違える**。
   → 同意レコード 900 秒 / cookie 1800 秒にして、cookie が必ず後に切れる順序にした。
2. **CSRF cookie の名前が固定だった** — 同じブラウザで同意画面を 2 回開くと、後から開いた方の
   cookie が前を上書きし、**先に開いたページを送信した瞬間に不一致**になる。OAuth
   クライアントが authorize を 2 度叩く実装だと普通に踏む。
   → cookie 名を `__Host-NORIRECO_CSRF_<pending id>` と同意ごとに分けた。form 由来の
   pending id は cookie 名に埋める前に UUID 形式へ限定（ヘッダ注入対策）。

エラーメッセージも 3 分岐（時間切れ / ブラウザ不一致 / トークン不一致）にした。どれで落ちたか
分からないままだと、次に同じことが起きたときにまた原因を取り違えるため。

回帰テスト 5 ケースを `wrangler dev` で実測: ①通常の 1 往復 → Supabase へ 302 ②同意画面 2 枚のうち
先に開いた方を送信 ③cookie 無し ④存在しない pending id ⑤壊れた pending id。②は修正前に落ちることも
確認済。**テスト自体が最初 `curl -c` の挙動（セッション単位で jar を書き直す）で偽陰性を出しており、
`-b` 併用に直して初めて正しく測れた** — 測定系を疑う手順は v433 と同根。

### さらに踏んだ: CSP `form-action` が自分のリダイレクトを止めていた

上の 2 点を直して再デプロイしても同じ画面が出た。ユスケの症状の言い方が決め手:
**「1 回目は押しても画面が切り替わらず、2 回目でエラーになる」**。

原因は同意画面に付けていた `form-action 'self'`。**`form-action` はフォーム送信後の
リダイレクト先にも適用される**（Chrome/Firefox）。同意ボタンの POST には Supabase の
authorize へ 302 を返しているので、ブラウザがその移動を拒否して**押しても何も起きない**。
そのとき同意レコード（単回使用）だけが消費されるので、2 回目の送信が失敗する。
押した本人にはエラーが一切見えないため、原因が非常に分かりにくい形で壊れていた。

1 度目の対処は「同意画面だけ `form-action 'self' <SUPABASE_URL の origin>` に緩める」だった。
**これでも直らなかった** — `form-action` は**リダイレクトの各ホップすべて**に適用されるので、
Supabase がさらに `accounts.google.com` へ転送した時点で再びブロックされる。ホップを列挙して
許可していく方針そのものが壊れやすい（Google 側の遷移先はこちらの都合で変わりうる）。

→ 最終形: **同意ボタンの POST は 302 を返さず、200 + `meta refresh`（＋手動リンク）で
送り出す**。meta refresh や リンククリックは普通のナビゲーションなので `form-action` の
対象外になり、CSP は `'self'` のまま締めておける。自動遷移が効かない環境のために
「Google のログインに進む」リンクも置いた。

**教訓 1**: セキュリティヘッダを締めるときは「このページから*出ていく*正当な遷移」を数え上げる。
`frame-ancestors` や `default-src` と違い、`form-action` は**成功パスを黙って壊す**。
症状が「エラーが出ない」なので、ログにも残らず切り分けが遅れた。ユスケの
「1 回目は何も起きない」という観察が無ければ、cookie 側をもう一巡疑っていた。

**教訓 2**: 外部サービスへ抜けていく遷移を許可リストで守ろうとすると、**相手のリダイレクト
チェーン全部を知っている前提**になる。知りようがないので、遷移の種類そのものを変えて
（フォーム送信 → 通常ナビゲーション）制約の外に出す方が壊れない。同じ「1 回目は何も
起きない」を 2 回踏んで初めてここに行き着いた = 1 度目の修正が対症療法だった。

### 乗換候補の自動提案（ユスケ要望・2026-08-29）

初日に `東京→拝島` で「1 本の系統では繋がりません」と返して人に聞き返したのを受けて、
**MCP 側で乗換経路を計算して候補を返す**ようにした。本体 `js/07-record-mode.js` の
`findTransferCandidates`（v365 / v366 直通優先 / v367 徒歩乗換）を移植:

- a を含む系統 × b を含む系統の組合せで、両方に乗る駅 x を探す（駅 id 一致ベース）
- 直接乗り換えられないときは徒歩乗換グループ（`walk_transfers.json` 243 グループ）から探す
- 乗換駅ごとに dedupe し「総駅数最小」を残す。`through_lines` に相手が居れば直通ありとして優先
- 1 回乗換で見つからなければ 2 回乗換も探す（探索量に上限あり）

インデックスに `through`（142 系統）と `walk_groups`（243）を追加。`東京→拝島` は
「🔁直通 @立川（中央本線快速 19 駅 + 青梅線 6 駅）」が 1 位、`新宿→田無` では
「🚶新宿西口→西武新宿」の徒歩乗換も出る。

### 実測して直した 2 件（乗換候補を作る過程で発覚）

1. **駅名の部分一致が誤解決を生んでいた** — `立川→八王子` の候補に
   「西武拝島線 **西武立川**→拝島」が混ざっていた。系統ごとに独立して部分一致を許して
   いたため、**その系統に「立川」が無ければ「西武立川」で代用**されていた。
   `新宿→八王子` の候補に京王線が出ていたのも同じ理由（京王線にあるのは
   **京王八王子** = `s_01902`、JR の八王子 = `s_00060` とは別の駅）。
   → **完全一致優先**（どの系統にも完全一致が無いときだけ部分一致に落とす）に変更。
   保存済みデータへの影響は無い（誤った候補が出るだけで、実際の記録は正しく解決されていた）。

2. **1 リクエストあたり 11〜18ms かかっていた** — 全 636 系統をなめて 1 万駅ぶんの駅名を
   毎回正規化していた。**Workers 無料プランの CPU 上限は 1 リクエスト 10ms** なので、
   このままでは乗換候補が動かない可能性があった。3 段で直して **0.4〜6.6ms**:
   - 駅名の索引（正規化名 → 系統）経由の探索に変更（全系統スキャンを廃止）
   - 正規化名をビルド時にインデックスへ焼き込み（`src/norm.js` をビルド側と実行側で共有し、
     別実装によるズレを防ぐ）
   - 索引の構築を module 直下に移動 = Worker の**起動時間**（上限 400ms）の枠で処理させ、
     リクエストの CPU 枠を使わない

   **教訓**: Worker では「リクエスト中の計算」と「モジュール評価」で予算が別。重い前処理は
   module 直下に置くだけで制約から外れる。遅延初期化は一見良さそうに見えて、初回リクエストに
   コストを寄せる分むしろ危ない。

### 公開に向けたレート制限（ユスケ「ほかの人が使えるようにして」・2026-08-29）

`ALLOWED_EMAILS` を外す前提が整ったので、先に上限を入れた。**1 ユーザー 1 日 500 回・
記録は 60 件**を KV カウンタで数え、超えたらその人だけその日は打ち止め。`wrangler.toml` の
`DAILY_LIMIT` / `DAILY_WRITE_LIMIT` でコードを触らず調整できる。

- 数え方は「読んで +1」だけ。同時呼び出しで数え漏らすが、**上限に届かない方向の誤差**なので
  この用途では許容する（厳密さより軽さ）
- `guard()` を `createServer(env)` の内側に移した。module 直下に置いて「直近の env」を差す形は、
  同時リクエストで取り違える余地がある
- 上限 2 回に設定して 3 回叩き、3 回目が `rate_limited: true` で止まることを実測

**これで防げないことも書いておく**: Google アカウントを増やせばその数だけ枠が増えるので、
総量の上限にはならない。「1 人の暴走で全体が止まる」のを防ぐためのもので、総量は
Cloudflare 側の使用量アラートで見張る必要がある。

### デプロイ実績（ユスケ環境・2026-08-29）

- `npx wrangler login` は 1 度タイムアウト（同意までの猶予を超過）。ダッシュボードに先にログインしてから
  再実行で成功。`Successfully logged in.`
- KV 作成 → `wrangler.toml` の id 差し替え → `wrangler secret put ALLOWED_EMAILS` → `wrangler deploy`。
  `Deployed norireco-mcp triggers / mcp.norireco.app (custom domain)`
- Claude の「カスタムコネクタを追加」は **認証=常に必須 / OAuth=DCR** を自動検出（= discovery が
  正しく生えている証拠）。CIMD は未対応なので選ばないこと。
- KV id (`48033c5d…`) はユスケが commit 54d5d3a で追加。秘密情報ではないので git 管轄で正しい。

### 残課題

- **実接続は未検証**。デプロイと下記のユスケ設定が要る。ここを通すまで「動く」とは言えない。
  1. `cd mcp` → `npm install` → `npx wrangler kv namespace create OAUTH_KV` を **1 行ずつ**実行 → 出た id を `wrangler.toml` に貼る
  2. Supabase Dashboard → Authentication → URL Configuration → Redirect URLs に `https://mcp.norireco.app/callback` を追加（**これが無いと Google ログインから戻れない**）
  3. `npx wrangler secret put ALLOWED_EMAILS` で当面は自分だけに絞る
  4. `npx wrangler deploy` → Claude の「カスタムコネクタ」に `https://mcp.norireco.app/mcp`

**（PowerShell では `&&` が使えない — ユスケ指摘 2026-08-29。手順書のコマンドは 1 行ずつ書く）**
- ログインは Google のみ（本体のマジックリンクは未対応）。
- 列車名は手入力扱い（`train_id` は常に NULL）。マスター照合は未実装。
- 写真添付・記録の削除・完乗率の取得は MVP スコープ外。
- レート制限は未実装。**全開放する前に 1 ユーザーあたりの上限（KV カウンタ）を入れること**。

---

## 303. v456 — 📦 エクスポートの写真が全滅する罠を修正（サムネ表示済み画像は CORS キャッシュ汚染で取れない）

**カテゴリ**: A（v455 を本番実データで実行したユスケの報告「写真は失敗してますね」= 旅程 18 / 駅メモ 3 / キャラ 14 は成功、写真 0・失敗 1）

**症状**: `export-report.txt` に `取得失敗: https://cdn.norireco.app/trips/.../xxx.webp (Failed to fetch)`。`Failed to fetch` は HTTP エラーではなくブラウザがリクエスト自体を弾いた印。

**原因**（本番で対照実験して確定）: マイページの旅程・メモ一覧は写真サムネを `<img>` で表示する。`<img>` は他ドメインの読み取り許可（CORS）を必要としないため、`cdn.norireco.app` はそのリクエストに `Access-Control-Allow-Origin` を**付けずに**返す。しかもそのレスポンスには `Vary: Origin`（リクエスト内容で中身が変わるという目印）も**付かない**ため、ブラウザは「このコピーはどの用途にも使い回せる」と判断してキャッシュする。後から JS の `fetch`（CORS 必須）が同じ URL を叩くと、その許可ヘッダ無しのコピーが返り、ブラウザが弾いて `TypeError: Failed to fetch` になる。

サーバ側は正常だったことを先に確認済み: `curl -H "Origin: https://norireco.app"` では `Access-Control-Allow-Origin: https://norireco.app` + `Vary: Origin` が返り、`cf-cache-status: DYNAMIC`（エッジキャッシュではない）。**Origin なしの応答にだけ `Vary` が無い**のが引き金。

本番での対照実験（同一 URL、順序だけ変えた）:

| 順序 | 結果 |
|---|---|
| `<img>` 表示 → 素の `fetch` | ❌ `Failed to fetch`（ユスケの症状と一致） |
| `<img>` 表示 → `cache:'reload'` 付き `fetch` | ✅ 200 / 37,202 bytes |
| `<img>` なし → 素の `fetch` | ✅ 200 / 37,202 bytes |

**修正**: `fetchPhoto(url)` を切り出し、`fetch(url, { mode:'cors', cache:'reload' })` に変更。`cache:'reload'` はキャッシュを読まず必ずネットワークへ行くので、Origin 付きリクエストが飛び正しい許可ヘッダ付きのレスポンスが返る。念のため失敗時はクエリを足して（＝別のキャッシュ入口にして）`cache:'no-store'` でもう一度だけ試す 2 段構え。

**検証**: 修正後の `fetchPhoto` を本番ページに注入して実測 — ①汚染あり（img 先行）で 37,202 bytes 取得 ✅ ②存在しないファイルは `HTTP 404` として正しく失敗（握り潰していない）✅ ③汚染なしの通常経路も成功 ✅。npm check 29/29。**デプロイ後、ユスケが本番実データで再実行して写真のダウンロード成功を確認（2026-08-06）= 📦 エクスポートは全カテゴリ動作。**

**教訓（v455 の検証が素通りした理由）**: v455 の preview 検証は fetch を fixture で差し替えていたため、この罠は原理的に踏めなかった。さらに本番での初回確認も、たまたまサムネ未表示の状態（上表の 3 行目）で試したため成功してしまった。**「モックで通った」も「一度成功した」も、実利用の順序を再現していなければ検証になっていない。** 実際の利用経路（一覧を見る → エクスポートする）と同じ順序を再現して初めてバグが出た。v433 の「測定系そのものを疑う」と同根。

---

## 302. v455 — 📦 データエクスポート：旅程・駅メモ・キャラ・写真を ZIP で持ち出せる

**カテゴリ**: A（ユスケ「堀を作るのはやめて、お客さん視点でサイトを作る。乗車履歴やメモや写真など、全部またはカテゴリーをきめて、エクスポートできる仕組みを」）

**位置づけ**: 囲い込み（データを人質にした引き留め）の逆を行く。記録はユーザーのもので、いつでも・何度でも・全部持ち出せる。プロダクト不変原則①「記録・完乗がコア」を信頼で支える機能。

**UI**: マイページのヘッダ（ログイン時・ゲスト時とも）に 📦 ボタン → モーダルでカテゴリを選んで ZIP 1 個をダウンロード。
- カテゴリ: 🚃 旅程（CSV + JSON）/ 📸 駅メモ（CSV + JSON）/ 🎭 キャラ獲得履歴（JSON）/ 📷 写真（実ファイル同梱）。全部 ON がデフォルト =「全部」
- ゲストは旅程（この端末の `user_id` 無し trip = v419 と同じ判定）のみ。他カテゴリは disabled + 注記

**ZIP の中身**: `trips.csv`/`trips.json`・`memos.csv`/`memos.json`・`characters.json`・`photos/`・`README.txt`（同梱内容と件数の説明）・`export-report.txt`（写真取得に失敗した URL 一覧、失敗時のみ）

**設計判断**:
- **JSON = `select=*` の完全 dump / CSV = 人が読める列に整形**。CSV は UTF-8 BOM 付き（無いと Excel が日本語を化かす）、駅 id → 駅名解決、`date_precision`/`source` は日本語ラベル化、列車・車両は per-seg 集約（v379 の sources パターン）、`,`/`"`/改行は CSV 標準エスケープ
- **データはエクスポート時に Supabase から取り直す**（画面キャッシュの古さを避ける）。notes/delay_minutes は v183 と同じ localStorage merge で補完
- **写真は cdn.norireco.app から fetch して同梱**。CORS が `norireco.app` に許可済みなことを事前に curl で確認。失敗は 1 枚ずつ握り潰さずレポートへ（URL は JSON 側に常に残るのでデータは失われない）。フォルダ名は「種類_日付or駅名_id 末尾 6 文字」— **id 先頭 6 文字だと `trip_<timestamp>` 形式で全旅程 `trip_1` になり同日 trip が衝突する**ことを検証中に発見し末尾に修正
- **JSZip は cdnjs から lazy load**（v439 html2canvas と同じパターン）
- 新規 `js/23-export.js`。import は 12-auth のみ（循環なし）、SUPabase URL/KEY は window 経由（v427 教訓）。モーダルは body 直下（v433/v446 教訓）

**検証**（preview 8002 = 素 origin で SW stale 回避、`dist/` ビルドから起動）:
- ゲスト E2E: localStorage に 2 trip 仕込み → 📦 → ZIP 解凍検証（BOM・CSV エスケープ・駅名解決・列車集約・README すべて期待通り）
- ログイン E2E: auth 疑似セット + fetch 横取り fixture で全カテゴリ実行 → 9 エントリの ZIP（写真 2 枚同梱 + 404 1 枚がレポートに）
- npm check 29/29

**書き込み事故（教訓）**: 初回 Write で正規表現の制御文字エスケープが**生バイト（NUL 含む）としてファイルに混入**し、grep/file がバイナリ扱いする状態になった。ツールは `\uXXXX` エスケープと実文字を相互変換することがある。**BOM・制御文字はソースに直接書かず `String.fromCharCode(0xFEFF)` のようにコードポイント指定で生成する** + 新規ファイルは Node でバイトレベル確認（NUL 数チェック）してから進む。

**残課題**: 本番の実データ（実写真・大量件数）での動作確認はユスケの実機で。CSV 列は将来のスキーマ追加に自動追随しない（JSON は `select=*` なので追随する）— 列を足したら `tripsToCsv`/`memosToCsv` にも足す。

---

## 301. v454 — 配信を「許可リスト方式」に：開発用ファイルの全公開を止める（`dist/` ビルド出力）

**カテゴリ**: A（v453 の副次発見 → ユスケが案2「Cloudflare Pages の配信対象から除外」を選択）

**問題（v453 で発覚し、調べたら .md だけの話ではなかった）**: Cloudflare Pages がリポジトリのルートをそのまま配信していたため、**git に入っているものが全部インターネットに公開**されていた。実測（全て HTTP 200）:

| 公開されていた URL | 中身 |
|---|---|
| `/CHANGELOG.md` `/CLAUDE.md` `/TODO.md` `/STATUS.md` | 開発履歴・設計判断・運用規約 |
| `/supabase/migrations/v135_add_user_id.sql` | DB スキーマ・RLS ポリシー |
| `/ios/App/App/Info.plist` | ネイティブアプリ設定 |
| `/.github/workflows/ios-testflight.yml` | CI 設定 |
| `/worker/src/index.js` | Worker ソース |
| `/package.json` `/capacitor.config.json` `/scripts/build-www.js` | 依存関係・ビルド手順 |

RLS ポリシーが読めること自体は直ちに脆弱性ではない（セキュリティは秘匿でなく RLS 本体で担保している）が、いずれも公開する意図がなかったもの。

**採らなかった案**:
- **robots.txt で `Disallow`**（案1）: クロールを抑止するだけで、URL を直接叩けば読める。ユスケ判断で不採用。
- **`_redirects` で 404 に飛ばす**: Cloudflare Pages の `_redirects` が対応するのは 301/302/303/307/308 と 200 rewrite のみで、**404 は非対応**（公式ドキュメントで確認）。そもそも配信物としてはアップロードされたまま。
- **`.cfignore` / `.assetsignore`**: `.assetsignore` は Workers Static Assets の機能で、**Git 連携の Pages ビルドには効かない**。Pages で配信対象を絞る公式手段は「ビルドコマンド + ビルド出力ディレクトリ」だけ（公式ドキュメントで確認）。

**解決（許可リスト方式）**: `scripts/build-pages.js` を新設し、**配信して良いものだけ**を `dist/` にコピーする。既存の `scripts/build-www.js`（Capacitor 用に `www/` を作る）と同じ考え方で、対になる存在。

- 入るもの: `noritetsu-map.html` / `journey*.html` / `js/` / `characters/` / `sw.js` / ルートの `*.json`（`package.json`・`package-lock.json`・`capacitor.config.json` を除く）/ アイコン 4 種 / `splash/` / `_headers` / `_redirects`
- 入らないもの: 上表の開発用ファイルすべて。**書き忘れたファイルは配信されない**ので、事故が「公開してしまう」側でなく「消える」側に倒れる
- `functions/`（`/share/<id>` の SSR）は **コピーしない**。Pages の仕様で Functions は「プロジェクトのルートの `functions/`」から読まれ、ビルド出力の中ではないため（公式ドキュメントで確認）。今の配置のままで動く
- `dist/` は `.gitignore` に追加（`www/` と同じ扱い）

**検証**（本番設定を切り替える前に、壊れないことを確かめた）:
1. **完全性チェック**（スクリプトで機械的に照合）— `sw.js` の `STATIC_ASSETS` 50 件 / HTML の `src`・`href` 29 件 / JS の `fetch()` 先 9 件が **すべて `dist/` に存在**。逆方向に、`dist/` 配下に `.md` / `.sql` / `.plist` / `.yml` が **0 件**であることも再帰確認
2. **実起動**（`python -m http.server --directory dist` で配信して読み込み）— 営業系統 636・路線 606 ロード、地図描画正常、console エラーは 404 が 1 件のみ。その 1 件は `walk_transfers_overrides.json`（もともとリポジトリに存在しない任意の上書きファイル。**現行の本番でも同じく 404**）
3. `npm run check` 28/28

**ユスケ側の作業（1 回だけ・これをやるまで現状のまま）**: Cloudflare ダッシュボード → Workers & Pages → norireco → Settings → Build:
- **Build command** = `node scripts/build-pages.js`
- **Build output directory** = `dist`
- Root directory は `/` のまま変更しない

切り替え後は `/CHANGELOG.md` 等が 404 になる。`/share/<id>` は `functions/` 由来なので影響を受けない。

**結果（2026-08-06 切り替え完了・本番確認済）**: ユスケが Build command / Build output を設定 → `9a493e9` を Retry deployment（成功 29s）。本番実測:

- **サイト正常** — 営業系統 636・路線 606 ロード、地図描画正常、JS/JSON/アイコン/splash/characters すべて 200。console エラーは `walk_transfers_overrides.json` の 404 が 1 件のみ（切り替え前と同一）
- **`/share/<id>` 健在** — 存在しない id で Function 由来の「シェアが見つかりません」HTML が返る = `functions/` がルートから読まれている確認
- **`/` → `/noritetsu-map.html` の 302 健在**（`_redirects` が `dist/` に入っている確認）
- **開発用ファイルは全て 404**（CHANGELOG/CLAUDE/TODO/STATUS.md・package.json・capacitor.config.json・scripts/\*・supabase/migrations/\*.sql・ios Info.plist・.github/workflows/\*・worker/src/index.js）

**落とし穴（切り替え直後に引っかかった）**: 切り替え直後の確認で開発用ファイルが **200 のまま**返ってきて「効いていない」ように見えた。実際は origin は 404 で、**Cloudflare のエッジキャッシュに残った古いコピー**が返っていた（`cf-cache-status: DYNAMIC` / `Age: 430` / `Cache-Control: public, s-maxage=604800` = **7 日保持**）。判別のヒントは「新規ファイル `scripts/build-pages.js` だけ 404」だったこと — 一度もアクセスされていない URL はキャッシュが無いので origin の真の姿が出る。**`?cb=<乱数>` を付けてキャッシュを迂回すると全て 404 で、切り替えは成功していた**。恒久対処として Cloudflare ダッシュボード → norireco.app（ドメイン側。Workers & Pages ではない）→ Caching → Configuration → Purge Everything でキャッシュを破棄する。

**教訓**: 配信の変更を検証するときは、**過去に自分がアクセスした URL は当てにならない**（自分の確認作業がエッジキャッシュを温めてしまう）。cache-buster 付きで叩くか、一度も触っていない URL を対照に使う。v433 の「preview 0x0 の壊れた測定値を信じて誤報を重ねた」と同種の、測定系そのものを疑う話。

**ついでに修正**: `sw.js` の `STATIC_ASSETS` に `characters/komiyau.svg` が残っていた（v291「駅キャラ コミヤウ削除」でファイルは消えたが一覧の行が残存）。本番でも 404 で、`cache.add()` を個別 `catch` しているため実害はなかったが、Service Worker インストールのたびに console 警告が出ていた。行を削除。

---

## 300. v453 — 検索結果・OGP の説明文から他社サービス名（YAMAP）を撤去

**カテゴリ**: A（ユスケ報告「Google で検索すると YAMAP と出てしまう。YAMAP は別会社のサービスなので困る」）

**問題**: `norireco.app` の Google 検索結果のスニペットが「全国鉄道の乗車記録・完乗率を可視化する PWA。**乗り鉄のための YAMAP。**」になっていた。初期の位置づけ説明として書いた比喩（登山記録アプリ YAMAP の鉄道版、という説明）がそのまま `meta description` に残っていたもの。他社の登録商標・サービス名を自社プロダクトの説明文として掲示している状態で、①ブランド上の誤認（提携・関連サービスに見える）②商標上のリスク ③検索エンジンが他社名で乗レコを紐づける、の 3 点で望ましくない。

**修正**（「乗り鉄のための YAMAP。」→ 自分の言葉で機能を言い切る文に置換）:

| ファイル | 箇所 | 新しい文 |
|---|---|---|
| `noritetsu-map.html` | `meta name="description"` / `og:description` | 全国鉄道の乗車記録・完乗率を可視化する PWA。乗った路線が地図に色づき、乗りつぶしの達成率が一目でわかる。 |
| `manifest.json` | `description`（PWA インストール時・ストア表示） | 全国鉄道の乗車記録・完乗率を可視化。乗った路線が地図に色づく乗りつぶしマップ。 |
| `functions/share/[id].js` | `/share/<id>` の **not-found 時**フォールバック `metaDesc` | 同上（HTML 側と同文） |

**触っていないもの**:
- `www/` と `ios/App/App/public/` は `.gitignore` 済みのビルド生成物（`node scripts/build-www.js` で再生成）。元ファイルを直せば次ビルドで追随するので直接編集しない。
- `CHANGELOG_PHASE3.8-share.md` の記述は当時の実装を記録した履歴なので改変しない（下記の公開範囲の論点は別）。
- `<title>`（`乗レコ - 乗りつぶしマップ`）は他社名を含まず検索語としても有効なので据え置き。`og:title` の `乗レコ - 電車旅`（ブランド正式表記）とは意図的に別物のまま。

**反映のタイミング（重要）**: `meta description` を直しても **Google の検索結果スニペットは即座には変わらない**。Google が再クロール・再インデックスするまで旧文言が表示され続ける（通常 数日〜数週間）。急ぐ場合は Google Search Console の URL 検査 →「インデックス登録をリクエスト」で再クロールを促す。

**セッション中に判明した別件（未対応・要判断）**: `https://norireco.app/CHANGELOG.md` が **200 / `text/markdown` で公開配信**されている（Cloudflare Pages がリポジトリルート配信のため `.md` も配信対象）。robots.txt は Cloudflare 既定の content-signals 版のみで `Disallow` 無し = クロール可能。開発履歴（設計判断・Supabase のテーブル構成・admin 機構の説明など）が公開状態で、`YAMAP` の記述もアーカイブ内に残る。対処候補は ①`robots.txt` に `Disallow: /*.md$`（クロール抑止のみ、直アクセスは可能）②Pages のビルド出力から `.md` を除外（配信自体を止める）。ユスケ判断待ち。

---

## 299. v452 — iOS 対応 Phase B-2: ネイティブアプリ内 Google ログイン（システムブラウザ + deep link）

**カテゴリ**: A（ユスケ依頼「iOS アプリ内で Google ログイン不可」を解決。AskUserQuestion で対象確定）

**問題**: Capacitor の WKWebView 内で `signInWithOAuth({provider:'google'})` を呼ぶと webview が Google の OAuth 画面に遷移するが、Google は埋め込み WebView を **`disallowed_useragent`** で拒否する（フィッシング対策）。ゲストモードは動くがアカウントログインができなかった。

**解決フロー**（Supabase 公式推奨の Capacitor パターン）:
1. ネイティブ時は `signInWithOAuth({ redirectTo: 'app.norireco://login-callback', skipBrowserRedirect: true })` で **OAuth URL だけ生成**（webview 内リダイレクトを抑止）
2. その URL を **システムブラウザ**（`@capacitor/browser` = SFSafariViewController、実 Safari UA なので Google が許可）で開く
3. 認証後 Supabase が `app.norireco://login-callback?code=...` に戻す → **`@capacitor/app` の `appUrlOpen`** が受信
4. code を `exchangeCodeForSession(code)` で交換（PKCE の code_verifier は同一 webview の localStorage にあるので成立）→ `onAuthStateChange` が UI 更新

**実装**:
- プラグイン: `@capacitor/browser@8.0.3` + `@capacitor/app@8.1.0`（Capacitor 8 系）。`npx cap sync ios` で SPM に登録（Package.swift の Windows バックスラッシュパスは `/` に正規化 — CI は cap sync 再生成だが commit 物として整える）。
- `ios/App/App/Info.plist`: `CFBundleURLTypes` にカスタムスキーム `app.norireco` を登録（deep link 受け口）。
- `js/12-auth.js`: `isCapacitorNative()`（`window.Capacitor.isNativePlatform()`）で分岐。native の `signInWithGoogle` は上記フロー、`registerNativeDeepLinkHandler()` を `initAuth` から native 時のみ登録（code/error はカスタムスキームの URL パース不安定を避け正規表現抽出）。**Web パスは完全に不変**。

**Web 非影響の検証**: preview で `typeof window.Capacitor === 'undefined'`（→ `isCapacitorNative()` false → 従来の in-page リダイレクト）、Google ボタン `handleAuthGoogleClick()` 健在、console エラー 0、636 系統ロード正常。npm check 28/28。**ネイティブ実機テストは次ビルド（TestFlight）で実施**（Windows では検証不可）。

**ユスケ側の必須設定（2 点、これが無いと動かない）**:
1. **Supabase**: Dashboard → Authentication → URL Configuration → **Redirect URLs に `app.norireco://login-callback` を追加**（無いと Supabase が Site URL に戻してしまい code が app に届かない）。※Google Cloud Console は変更不要（OAuth は Supabase 仲介で、Google が知るのは Supabase の callback だけ）。
2. **iOS 再ビルド**: Actions →「iOS TestFlight」→ Run workflow で新ビルド（プラグイン + Info.plist + deep link を含む）を上げる。

**結果（実機検証済 2026-07-04）**: Supabase Redirect URLs に `app.norireco://login-callback` 登録 → iOS 再ビルド（TestFlight build #5 = commit 2136b0d、CI 成功 3m42s）→ **iPhone 実機で Google ログイン成功**（ユスケ確認）。**Mac 無し・Windows のみで記録もログインも動く iOS ネイティブアプリが完成**。

**残（B-2 続き・任意）**: Magic Link もネイティブでは同じ deep link 対応が必要（今回は Google のみ）。iOS の Universal Links 化（カスタムスキームより堅牢）は将来検討。api.norireco.app（R2 Worker）の CORS が `capacitor://localhost` Origin を許すか（写真アップロード時に要確認、未検証）。

---

## 298. v451 — 駅キャラを一旦全て無効化（機能・コードは残す / 定義は保持 / 🎭 FAB 自動非表示）

**カテゴリ**: A（ユスケ依頼「機能は残して、現在登録しているキャラを消したい」。App Store 版に向けたプレースホルダキャラ（八王子3・立川3）の一旦撤去）

**「Supabase で消すだけでいいか？」→ No**（一次調査で確定）: 乗レコのキャラは 3 層 — ① **カタログ定義** = `characters_master.json`（静的、リポジトリ内）② 獲得キャッシュ = localStorage `norireco_owned_characters` ③ 獲得履歴 = Supabase `norireco_character_grants`。Supabase を消しても ① が残るためキャラは地図に出続ける（特に 6 体中 3 体は `default_unlocked: true` で獲得履歴と無関係に全員所持）。消すべき本体は ①。

**方針（AskUserQuestion で確定）**: ① 定義は**ファイル内に無効化して保持**（消さない）② 🎭 FAB は **0 体のとき自動で隠す** ③ 既存の獲得データ（Supabase 履歴・端末キャッシュ）は**残す**（カタログが空なら参照されず無害、将来分析用）。

**実装（2 ファイル）**:
- `characters_master.json`: キー `"characters"` → `"characters_disabled"` にリネーム（6 体の定義はそのまま保持）。ローダー `loadCharacters` は `master.characters` を読むため undefined → `|| []` で **0 体扱い**。`_disabled_note` に再有効化手順（リネームを戻すだけ）を明記。
- `02-data-loaders.js` `loadCharacters` 末尾: キャラ 0 体のとき `#char-fab` を `display:none`。**symmetric に判定**（`length === 0 ? 'none' : ''`）しているので、再有効化すれば FAB も自動で戻る。

**コードの安全性（事前確認済）**: `CHARACTERS` の consumer は 03/04/02 のみで、全て 0 体防御済 — `checkAndGrantCharacters` は `Object.keys(...).length === 0` で早期 return、描画（08/17/04）は `stationCharMap.get(id) || []`。よって空でクラッシュしない。

**検証**: npm check 28/28、JSON 妥当（characters: 0 / characters_disabled: 6 保持）、preview（別オリジン）で `charCount=0` / `stationCharMapSize=0` / `#char-fab` computed `display:none` / 地図は 606 系統・2363 パス正常描画・**キャラマーカー 0** / console エラー無し。

**残**: 将来キャラを本実装する際は `characters_disabled` → `characters` に戻すだけ。TODO の「キャラ図鑑タブ」「キャラ自動獲得トースト連動」「駅キャラを増やす」等は本無効化中は保留（機能コードは全て健在）。

---

## 297. v450 — iOS 対応 Phase B-1: Capacitor scaffold + GitHub Actions TestFlight パイプライン（Mac 無しクラウドビルド）

**カテゴリ**: A（iOS 対応の続き。§296 Phase A の直後、同セッション）

**やったこと**: App Store 配信のための土台一式。**Web/PWA 側の動作は完全不変**（`window.Capacitor` ガードのみ追加、Web では undefined で inert）。

1. **Capacitor 8.4.1 導入**: `@capacitor/core` + `@capacitor/ios`（deps）+ `@capacitor/cli`（devDep）。`capacitor.config.json` = appId **`app.norireco`**（norireco.app の逆引き。**App Store 初回リリース後は変更不可 — 提出前にユスケ最終確認**）/ appName 乗レコ / webDir `www`。
2. **`scripts/build-www.js`**: リポジトリルート = 本番サイトそのものなので、アプリ同梱分だけを `www/` に選別コピーするビルド script。HTML は index.html + noritetsu-map.html の 2 名義、js/・characters/・root JSON マスター全部（package*.json 等除外）・アイコン。**sw.js と splash/ は同梱しない**（ネイティブは SW 不要 + LaunchScreen 使用)。`www/`・`node_modules/` は .gitignore。
3. **`npx cap add ios`**: Windows でも scaffold 生成可能と確認（ビルドだけが macOS 必須）。Capacitor 8 は **SPM ベース（CocoaPods 不要）**で、capacitor-swift-pm を GitHub から取得 → CI が単純化。`ios/` は commit（テンプレの ios/.gitignore が Pods/public/build を除外）。
4. **Info.plist**: NSLocationWhenInUseUsageDescription（GPS 記録）/ NSCameraUsageDescription / NSPhotoLibraryAddUsageDescription / ITSAppUsesNonExemptEncryption=false（TestFlight 輸出コンプライアンス自動回答）。iPhone は Portrait 固定（PWA manifest と整合）、iPad は全方向（マルチタスク要件）。
5. **10-init.js ネイティブガード 2 点**: ① SW 登録を `!window.Capacitor` 時のみに（capacitor:// スキームで SW 不要・不安定）② バージョンバッジは Capacitor 時に非表示 + return（更新は App Store 経由なので PWA 更新バッジの概念が無い）。
6. **`.github/workflows/ios-testflight.yml`**: workflow_dispatch 手動トリガー。macos-15 ランナー（public repo 無料）で npm ci → build-www → cap sync → **xcodebuild cloud signing**（`-allowProvisioningUpdates` + App Store Connect API キー認証、証明書・プロファイル管理を Apple 側に丸投げ = fastlane match 不要）→ exportOptions `destination: upload` で TestFlight 直アップロード。ビルド番号 = `github.run_number`。

**ユスケ側の 1 回だけの事前作業**（workflow ヘッダにも記載）: ① developer.apple.com で App ID `app.norireco` 登録 ② App Store Connect で新規 App 作成 ③ API キー発行（App Manager 権限）④ GitHub Secrets 4 つ（ASC_KEY_ID / ASC_ISSUER_ID / ASC_API_KEY_P8 / APPLE_TEAM_ID）登録 → Actions から手動実行。

**既知の残課題（B-2 以降、TestFlight 稼働後に対応）**:
- **Google OAuth**: WKWebView は Google が `disallowed_useragent` で拒否 → `@capacitor/browser`（ASWebAuthenticationSession）+ deep link（カスタムスキーム or Universal Links）+ Supabase Redirect URLs 追加が必要。**初回 TestFlight はゲストモード（v418 で未ログイン開放済み）で検証可能**なのでビルド優先。
- **CI の署名証明書はクラウド管理（cloud-managed distribution cert）**: 現状 export 時に `-allowProvisioningUpdates` で Apple 側管理の配布証明書を使用。配布証明書には枚数上限（2〜3）があるため、将来リリース頻度が上がったら **fastlane match で証明書を非公開リポジトリに永続化**する方式へ移行を検討（今は不要）。
- **EU 配信のトレーダーステータス（DSA）**: App Store Connect に「EU 配信にはトレーダーステータス提供が必要」バナー。TestFlight・非 EU 配信には影響しないが、EU 一般公開前に対応要。
- Magic Link も同様に deep link 対応が本筋。
- api.norireco.app（R2 Worker）の CORS が `capacitor://localhost` Origin を許すか要確認。
- アプリアイコン（Assets.xcassets はテンプレのまま）・LaunchScreen のブランド化。
- 審査 4.2（最小機能性）対策として、ネイティブの果実（バックグラウンド GPS / プッシュ）を段階投入する構想は Notion §3.3。

**検証**: npm check 28/28、build-www 20 項目コピー確認、preview でバッジ v449 🟢 + console エラー 0（Capacitor ガードが Web で inert なこと確認）。

**CI 実運用で潰した詰まりどころ（4 run で成功、同セッション 2026-07-03）**: Windows ではコンパイル不可なので初回以降を CI ログで詰めた。3 つの実エラーと修正 —
1. **署名権限（`Cloud signing permission error` / `No signing certificate "iOS Distribution" found`）**: App Store Connect API キーの役割が **App Manager では配布用証明書を作成できない**。**Admin 役割のキーが必須**。App Manager は TestFlight アップロード・プロファイル管理はできるが証明書作成は不可。→ Admin キーを新規発行して `ASC_KEY_ID` / `ASC_API_KEY_P8` 差し替え。
2. **開発用プロファイルが実機を要求（`Your team has no devices` / `No profiles for 'app.norireco' were found: iOS App Development`）**: Capacitor テンプレの `CODE_SIGN_IDENTITY = "iPhone Developer"` が **archive 時に開発用プロファイルを要求 → 開発用は登録実機が最低 1 台必要**でデバイス 0 台のため失敗。→ archive を `CODE_SIGNING_ALLOWED=NO`（無署名）にし、**署名は export ステップで App Store 配布用プロファイル（実機不要）に一本化**。
3. **SDK バージョン（`This app was built with the iOS 18.5 SDK ... must be built with the iOS 26 SDK or later`）**: macos-15 ランナーの既定 Xcode 16.4（iOS 18.5 SDK）では **Apple の「iOS 26 SDK 以上必須」ポリシー**に弾かれる。→ ランナーを **macos-26** + `maxim-lobanov/setup-xcode@v1 latest-stable` で Xcode 26 系を明示選択。

**結果（run #4）**: build-upload 成功（2m19s）、IPA 署名 → App Store Connect アップロード完了。App Store Connect に「乗レコ - 電車旅」iOS 1.0 が「提出準備中」で出現。**Mac 無し・Windows のみで完全自動の TestFlight パイプラインが稼働**。

---

## 296. v449 — iOS 対応 Phase A: ホーム画面 PWA を「アプリ同然」に磨く（safe-area / 入力ズーム / アイコン / スプラッシュ / Magic Link 注記）

**カテゴリ**: A（ユスケ依頼「いま web 版だけど、iOS でもいけるように」）

**背景と方針**: ゴールを AskUserQuestion で確定 — **段階的に両方**（Phase A = iPhone Safari/PWA 磨き込み → Phase B = Capacitor で App Store 配信）。Apple Developer Program は加入済み、機材は iPhone/iPad のみ（Mac 無し → Phase B は GitHub Actions の macOS ランナーでクラウドビルド予定）。iOS 用メタタグ（`apple-mobile-web-app-capable` 等）は初期から入っており「動く」状態だったが、ノッチ機のホーム画面起動で見た目が崩れる・ログインが分離する等の「アプリとして使うと露呈する穴」が残っていた。

**修正 6 点**:
1. **safe-area 対応（本丸）**: `viewport-fit=cover` + `black-translucent` なのに `env(safe-area-inset-*)` を一切使っていなかった → ノッチ/Dynamic Island 機では時計・電池表示がヘッダに重なり、ホームインジケータがボトムシートに重なる。`.header`（padding-top/height + 横 inset）/ `.tabs`（top）/ `.content`（top）/ `.memo-sheet`（padding-bottom、**全ボトムシート 10 個が共用クラスなので 1 箇所で全対応**）/ `.mp-toast` / `.nearest-station-panel` / `.pane:not(#pane-map)`（スクロール末尾余白）に env() 追加。上書き宣言を基本宣言の後に置く方式なので env() 非対応環境では自動フォールバック、Android/PC は env()=0 でレイアウト完全不変（preview で computed 52px/92px/40px を確認済）。
2. **input フォーカス時の自動ズーム抑止**: 本アプリの input は 11〜13px で、iOS Safari は font-size<16px の input にフォーカスすると画面全体をズームする。10-init.js に iOS 判定（UA + iPadOS 13+ の Macintosh/maxTouchPoints 判別）時のみ viewport へ `maximum-scale=1.0` を動的付与。iOS はピンチズーム自体は殺さない方針なのでアクセシビリティ問題なし、Android には付与しない（pinch が死ぬため）。
3. **apple-touch-icon 修正**: 旧 `icon-192.png`（192px・透過 PNG）は iOS ホーム画面で角が黒抜けする → PowerShell System.Drawing で navy `#0D1B2A` に合成した不透明 `apple-touch-icon.png`（180×180 正規サイズ）を生成し差し替え。
4. **起動スプラッシュ**: `apple-touch-startup-image` 未設定で起動のたび白画面フラッシュ → navy 地 + 中央アイコンのスプラッシュ 27 枚（iPhone 縦 11 + iPad 縦横 16、計 884KB）を `splash/` に生成、デバイス解像度別 media query で 27 link タグ追加。OS が直接 fetch するため sw.js STATIC_ASSETS には追加しない。
5. **Magic Link の standalone 罠に注記**: iOS ホーム画面アプリは Safari と localStorage が分離。Magic Link のメールは Safari 側で開くため、**PKCE の code_verifier が見つからずログインが反映されない**（12-auth は flowType:'pkce'）。認証モーダルに注記 div を追加し、`navigator.standalone === true`（iOS 独自 API）のときだけ 12-auth initAuth が表示 →「Google でログイン」へ誘導。
6. **小物**: `-webkit-tap-highlight-color:transparent`（タップ時の灰色フラッシュ除去）、`-webkit-text-size-adjust:100%`、`mobile-web-app-capable` meta 追加、manifest の name/description を現行ブランド「乗レコ - 電車旅」に整合。

**検証**: npm check 28/28、HTML 末尾タグ整合（body/html 各 1）、preview（デスクトップ）で header 52px / content top 92px / memo-sheet padding-bottom 40px = env()=0 フォールバック確認 + console エラーなし + 新アセット 200 応答 + スプラッシュ link 27 本。**iOS 実機（時計重なり解消 / スプラッシュ / ホーム画面追加 → Google ログイン / GPS 記録）はユスケの iPhone で要確認**。

**残課題 (Phase B)**: Capacitor scaffold + GitHub Actions macOS ビルド + TestFlight。Capacitor の WKWebView では Google OAuth が `disallowed_useragent` で弾かれるため、ネイティブ側は ASWebAuthenticationSession 系 plugin が必要になる見込み（Phase B 設計時に対応）。

---
