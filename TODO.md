# 乗レコ - 電車旅 TODO

新セッションでは、まず本ファイルを読んで次の着手項目を選ぶ。
詳しい仕様や経緯は `CHANGELOG.md`（更新履歴詳細）、ビジネス背景は [Notion 開発ノート](https://www.notion.so/35b71b458b63818494afe7c1ab917ca5)。

---

**現在のステータス** → [`STATUS.md`](./STATUS.md)（CACHE_VERSION・カバレッジ・領域別ステータス・直近フェーズ）

**用語**: 📝 経路選択 = **手動** (manual) / 📍 GPS 開始 = **GPS** (verified) — v175 統一 / v345 中立化 (verified は「証明」ではなく「手動の手間省略」位置づけ)
**完駅率 vs 完乗** (v297 整理):
- **完駅率** = 乗車駅 / 全駅 (駅 id ベース、v293〜 同名異所も別駅扱い)。ヘッダ右上 / マイページ完駅率カード / 運営会社別 / 地域別カード等で使用
- **完乗** = 1 系統を完全走破した状態。「(完乗 8)」「完乗達成日」「完乗系統」のように系統数で語る用語として残す
- **乗車系統数** = 1 駅でも乗ったことのある系統数 (「29 系統」)

**直近の作業**: → [`CHANGELOG.md`](./CHANGELOG.md) の最新セクション (v271 時点で §75-§119 が現行 Phase 3.8 後半) を参照。各 commit ごとの背景・設計判断・失敗教訓まで含む。要約だけほしいときは git log でも可:
```
git log --oneline -20
```

---

## 🔥 最優先（プロダクトとして欠けている）

- [ ] **シェア機能 — MVP 以降の残り (v236 で OGP 画像生成 MVP は完成)**
  - ✅ v236: マイページ完乗率カードから「📸 シェア画像を作成」で 1200×630 PNG 生成・ダウンロード・Web Share / X intent
  - ✅ S-1 (v410): 個別 trip シェア — 旅程カードに「📤 シェア」、`generateTripOgpCanvas` で 1 旅程分の OGP (地図を trip 区間にズーム + 始点○/終点● + 路線名/区間/駅数/乗換/乗車日/車両パネル)。DL/Web Share/X。純クライアント
  - 🟡 S-2 (v412): R2 永続画像保存 — Worker `/upload/share-image` (presigned PUT, key `shares/<uid>/<id>.png`) + クライアント `uploadShareImage` + シェアモーダル「🔗 画像URLをコピー」(ログイン必須)。**⚠️ Worker は `cd worker && npx wrangler deploy` で別途デプロイが必要** (frontend は main push で反映済 v412 だが endpoint はデプロイ後に有効)
  - ✅ S-3 (v413): `/share/<id>` 受け側ページ完成・本番稼働確認済 — Supabase `norireco_shares` (公開 SELECT RLS、migration Applied 2026-05-29) + Pages Function `functions/share/[id].js` (OGP メタ SSR + 「自分も記録」CTA)。シェアモーダルは「🔗 シェアリンクを作成」に置換 (画像→R2→shares insert→/share/<id> 生成→Web Share/clipboard)
  - **シェア機能 残り** (S-1〜S-3 で MVP 完結。以降は磨き込み + 拡散強化):
    - ✅ v415→v417: シェアボタン整理。v415 で「📤 1 本化 (/share リンク統合)」+ Worker `/delete/photo` 正規表現に `shares` 3-segment 分岐 (deploy 済 Version d854330d) → **v417 で「📤 画像をシェア」「🔗 リンクをシェア」の 2 ボタンに再分離** (Windows OS 共有シートが file 共有時に URL=text を落とすため。🔗 は PC=クリップボードコピー / モバイル=Web Share、ログイン必須)。CHANGELOG §265〜§267
    - ✅ v416: シェア取り消し UI 本体 — マイページ 5 番目「🔗 シェア」サブタブ (作成済み `norireco_shares` を user_id で SELECT し一覧、🔗 リンクコピー + 🗑 取り消し)。取り消し = norireco_shares DELETE (RLS 本人) → R2 `/delete/photo` best-effort cleanup → 再描画。v415 統合で後退した「URL コピー」導線も PC で復活 (Web Share 不可時にクリップボードコピー)。CHANGELOG §266
    - ✅ v423: 垢BAN (share_banned) 連携を実装 — banned で /share リンク作成・画像シェアを停止 (シェアモーダル不開) + 既存リンクも revoked で配信停止 + マイページ「🔗 シェア」タブに状態バナー。詳細 → 🔥「垢BAN」/ CHANGELOG §273
    - 🟡 v436: **受け側ページ強化 (③) + view/click 計測 (④)** — MVP サブ項目が全 ✅ で空だった本 TODO を拡散バリューチェーンで再定義し ③+④ を着手 (ユスケ確定 2026-05-31)。`/share/<id>` に CTA 文脈化 (kind 別) + 「乗レコでできること」価値訴求 3 項目、view (bot UA 除外) + CTA click (`/share/<id>/go` リダイレクト Function 経由) を `SECURITY DEFINER` RPC `bump_share_metric` (anon EXECUTE) で計測 → マイページ🔗シェアカードに 👁/🚃 表示。CTA に `?ref=s_<id>` 付与 (Phase 2 attribution の土台)。**⚠️ `supabase/migrations/v436_share_metrics.sql` を Supabase Dashboard で Run 要** (それまでカウント貯まらず、ページ表示は正常)。`functions/` は main push で自動反映。CHANGELOG §283
    - **残り (Phase 2)**: 登録転換 attribution — CTA 付与済みの `?ref=s_<id>` を app 起動時に localStorage 保持 → 初回登録時に「どのシェア経由か」を記録 (12-auth 等 auth flow 改修)。集計の admin タブ横断ビューも候補。「シェアが分水嶺」(5大原則④) の本命指標
  - 注: v345 で「verified 限定ガード」は撤回 (GPS = 手動の手間省略、世間への証明不要)。手動記録も対等にシェア可

- [ ] **垢BAN（シェア停止ペナルティ）** — 本体 ✅ v423 + full_banned enforcement ✅ v424 + 穴塞ぎ ✅ v425 + 管理 GUI MVP ✅ v426 (発動を Dashboard SQL から GUI に移管)
  - ✅ v423 本体: `norireco_profiles` 新設 (share_status = 真実の源 / SELECT 本人のみ + 書込 policy 無し = 本人も自己解除不可)、`shares.revoked` 派生キャッシュ + INSERT(BAN中不可)/UPDATE(revoked 復活穴封鎖) policy 強化、関数 `set_account_status`/`ban_user_share`/`unban_user_share` (EXECUTE は public REVOKE で Dashboard 専用 = RPC 自己解除穴を塞ぐ)。enforcement = RLS(最後の砦) + クライアント(banned 時シェアモーダル不開で リンク作成/画像シェア/DL を一括ブロック) の 2 層。既存リンクも revoked で配信停止 (unban で復活)。マイページに状態バナー/チップ。CHANGELOG §273 (Applied + 実機確認済)
  - ✅ v424 full_banned enforcement: `norireco_trips` / `norireco_character_grants` / `norireco_memos` の INSERT policy に `NOT EXISTS(full_banned)` ガード追加 (UPDATE/DELETE/SELECT は据え置き = 過去記録の閲覧編集は通常通り)、各 INSERT 呼び元 (07 saveMultiSegmentTrip / 21 saveBulkDrafts / 16 createMemoOnServer / 03 grantCharacter) の冒頭に薄い inline ガード、マイページのバナー/チップを share_banned/full_banned で文言分岐 (full_banned → 「🚫 アカウント停止中」+ 「シェア + 新規記録停止」の詳細バナー)。CHANGELOG §274 (Applied)
  - ✅ v425 補修: 旧 `FOR ALL` policy 1 件残留を DO ブロック冪等 DROP で穴塞ぎ。教訓「migration 確認 SELECT の期待行数まで指差し確認 / FOR INSERT 追加時は同テーブルに FOR ALL が無いことを明示確認」を CHANGELOG §275 に追加。SQL Run + 実機 BAN テスト確認済
  - ✅ v426 管理 GUI MVP: `norireco_admins` (本人のみ SELECT RLS) + 4 関数 (`is_admin` / `admin_list_profiles` / `admin_search_user` / `admin_set_account_status`、全 SECURITY DEFINER + is_admin ゲート + EXECUTE public REVOKE + authenticated GRANT)、新規 `13e-admin.js` で マイページ「🛠 admin」サブタブ (BAN/warn 履歴のあるユーザー一覧 + uid/email 検索 + 4 ボタン + 自分自身 BAN 防止ガード)、`12-auth.fetchMyProfile` に is_admin 取得追加 (`window.NORIRECO.profile.is_admin`)。non-admin にはタブ自体出ない (UI ゲート) + RPC は関数内 is_admin で 401。CHANGELOG §276
  - ✅ v427 hotfix: v426 push 直後の本番で「🛠 admin」サブタブをタップしても中身が空白と判明。原因 = 13e-admin.js が 12-auth.js から `SUPABASE_URL` / `SUPABASE_KEY` を named import していたが両者は 12-auth で export 無し (classic top-level const を bare 参照しているだけ) → ES Modules ロードが SyntaxError で失敗し `renderMpAdminSection` の登録副作用が走らず空 subpane だけが残る事象。`window.SUPABASE_URL` 経由参照に修正 + named import から削除。教訓「`npm run check` は import 解決を検証しない、新規 ES Modules 追加時は本番 console 確認まで」を CHANGELOG §277 に記録
  - ✅ 実機確認済 (v427 SW 反映後): admin タブで share_banned ユーザー (`a28287d9-...`、norireco@gmail.com、理由「テスト」) が 1 行表示 + 4 ボタン操作可能 → **垢BAN 管理 GUI MVP 完成**
  - 段階: ok → warn(注意・バッジのみ・enforcement なし) → share_banned(シェアのみ停止) → full_banned(シェア + 新規記録停止 / 過去記録は閲覧編集可)
  - **残 (別タスク)**: 自動発動 (スパム的シェア量検知・通報フロー)

<!-- ✅ 駅 ID 体系 (Phase 1〜3) 完了: 駅マスター (merged_stations 9,030 駅) / SERVICE_LINES / trip / memo / characters_master / 駅名検索 / LINES の全層を `s_NNNNN` id ベース化、同名異所駅 (高松 香川/石川/多摩 等) の判定混線を全面解消。trip.from_station/to_station (v326) + memo.station (v325) の旧 name 列も DROP 済 (Applied 2026-05-25)。詳細 → CHANGELOG_PHASE3.8-station-id.md (Phase 1〜3, v290〜v333) + CHANGELOG §272 (v422 = 集計 rebuild の id 優先化で Phase 2 クローズ)。
     残るは「name 照合の物理撤去 (完全版)」のみ → **今はやらない**と決定 (v422)。🌱 布石 #7 に移動 -->

<!-- ✅ 駅 ID 体系 Phase 3 (memo / characters_master / 駅名検索 の id 化) は上記コメントの通り全サブ項目 (3-a〜3-k+, v313〜v329) 完了。詳細は CHANGELOG_PHASE3.8-station-id.md -->

## 🟡 体験向上（コア層の継続率を上げる）

- [ ] **旅程予定ページ（未着手、アイデア段階）**
  - 過去の記録だけでなく「これから乗る予定」の旅程を組み立てられるページ
  - 未乗車路線・未訪問駅を選んで予定リスト作成、マップ上で予定経路を点線等で別表現
  - 実乗後に「予定 → 記録」へ昇格させる導線
  - 既存機能との相性: v177「未乗車のみ表示」+ v174「〜月指定」で「旅行計画 ⇄ 振り返り」両軸を揃える
  - スキーマ案: `norireco_planned_trips` テーブル新設 or `norireco_trips.status='planned'` 拡張、localStorage 先行も可
  - 詳細: Notion §3.1 次のフェーズ 「🟡 体験向上」参照

- [ ] **後追い記録モードの拡張（駅メモ + Supabase 列追加）**
  - v178 で「乗車日 / 出発 / 到着」の手動入力対応済（`date_precision='minute'`）
  - v181 で `trip.notes` (text) / `trip.delay_minutes` (int) を確認モーダル + マイページに実装済
  - ✅ v395 で Supabase 同期完了 — schema には両カラムが最初から存在していた (REST status 200 で確認、dashboard 追加に追従漏れていた)。`tripForSupabase` を pass-through に変更 + `saveTripEdit` の `tripPatch` に追加 + `syncFromSupabase` で localStorage merge back (v395 以前データ救済)。CHANGELOG §245
  - 残り:
    - **駅の設備メモ**（トイレあり、混雑度、改札位置 等） — `trip.station_notes` (jsonb) を駅ごとに保存。構造設計大きいため別タスク

- [ ] **手動記録の旅程カードからの「📍 区間」フル編集**
  - v226 で時刻 (date/depart/arrive、minute precision) と 🚆 列車種別 (category/train_name/car_model) は完了
  - **残り**: `segments[]` の追加・削除・経路変更
    - 現状の「✏️ 編集」モーダルでは区間は read-only 表示、修正したい場合は 🗑 削除→記録モードで再作成のガイドのみ
    - 連鎖計算が必要: `segments[]` を変えると `from_station` / `to_station` / `line_list` / `total_stations` / `transfers` / `RIDDEN_SEGS` / 地図描画まで再計算
    - 設計案: 「区間を編集」ボタン → 現 trip の segments を記録モードに pre-load → ユーザーが追加/削除 → 保存で既存 trip を update (DELETE → INSERT or PATCH)
  - 関連: 🟡「ノリレコログを地図画面のタブとして統合」で「過去の旅程をまとめて編集」と被るので、UI 設計はそちらと統合検討

- [ ] **`stop_type` 編集 UI (記録モード Step b)** — 自動派生で扱えないケース対応
  - v186 で `slStopType` の自動派生（seg.from=boarded / seg.to=alighted / 中間=passed、最高優先度採用）と駅UI個人化（●大/◎中/○小）+ 表示/非表示フィルタは完成
  - 残り: 確認モーダルや旅程編集モーダルで「経路上の各駅の stop_type を上書き編集」できる UI
  - 例外シナリオ: 終点で降りずに折返し / 乗換駅で一度改札を出た / 通過するつもりだった駅で途中下車 など
  - trip.stop_types (jsonb) を追加して per-trip オーバーライドできるように
  - Notion §「乗降駅レイヤー」「駅UIの情報ハブ化」参照

- [ ] **現在地表示 Phase 4: 駅近自動記録通知**
  - Phase 1〜3（青ドット・最寄駅・追従モード）は v89〜v108 で実装済
  - 残: 駅近づいたら通知を出して自動で記録開始候補に
  - Notion §「位置情報（現在地表示）」参照

- [ ] **手動記録モード（📝）の拡張**
  - 経路プレビュー線（選択中の駅間を色付き線で予告）
  - 保存後の trip 一覧・削除 UI（記録モード内で完結）
  - 駅長押しで詳細パネル（駅情報・乗り入れ路線・過去訪問数）

<!-- ✅ v247 で完了: 系統色のユーザーカスタマイズ機能 (Supabase 同期含む) — CHANGELOG §92, §93, §94, §95, §96 参照 -->

- [ ] **普通電車の車両形式も記録できるように** — MVP 完成 (v348) + 記録モーダル整理 (v350) + 自由入力 (v351)、残: Phase 2 (データクリーンアップ) + Phase 4 (Notion §2.1) + 車両形式検索 UI
  - ✅ Phase 1 (v347): Notion DB「営業系統×車両形式 DB」(256 件) を `service_line_vehicles.json` に書き出すフロー完成 (`tools/export_service_line_vehicles.js`)。176 records → 197 SLs / 292 links に紐付け (非対象除外 91% カバレッジ)
  - ✅ Phase 3 (v348): 記録確認モーダルに「📋 列車・車両形式も記録する (マニア向け)」トグル、ON 時のみ区間 chip + 現役車両 dropdown 展開、`norireco.prefs.showTrainSelector` (localStorage) で永続化 (5大原則 ②同心円ターゲティング)
  - ✅ 記録モーダル整理 (v350): 遅延入力 (⏱) を独立トグルでデフォ非表示 (5大原則 ②同心円ターゲティング — 任意項目は UI ごと hide/show)。v350 で導入したラジオは v352 で撤廃
  - ✅ 自由入力 (v351): 普通電車レーン dropdown 末尾に「✏️ 別形式を入力」option を追加。選択肢に無い車両も `car_model` テキスト列に保存 (データ未登録系統でも入力可)
  - ✅ ラジオ撤廃 (v352): カテゴリ dropdown 駆動に統一 (cat='local' なら sl レーン / それ以外は cascade)。既存の TRAIN_CATEGORIES dropdown と排他選択の二重化を解消、新幹線で普通車形式が選べる不整合も解消
  - **Phase 2** (未着手): unmatch クリーンアップ — no_line_match 17 件 (他社直通・短縮形 alias 不足) + Notion DB 側の表記揺れ修正 (「各線」を具体化)。実機運用してから優先度判断
  - **Phase 4** (未着手): Notion §2.1 に新データソース追記
  - ✅ 車両形式検索 UI (v357): 旅程タブに「🚆 車両」input を追加 (`t.car_model` substring 検索、大文字小文字不問、駅名検索と AND 関係)
  - ✅ 旅程編集モーダルの per-seg フル cascade (v383): 種別 select / 列車 dropdown / 列車名手入力 (__custom__) / 車両形式 dropdown + 手入力 を各区間に。記録モード v375 と同じカスケード挙動
  - ✅ 編集モーダル cat 切替時 DOM 値残り解消 (v384): `applyTripEditSegCategoryVisibility` の local / other 分岐に carInpEl / tnameEl の value クリア追加 + `restoreTripEditSegCascade` の local 分岐で seg.car_model 復元。Map 不採用 = cat 往復で前値復活せず (記録モードとの差は許容)

- [ ] **駅 UI の情報ハブ化（4領域パネル）**
  - 駅タップで以下を表示:
    - [自分の記録]: 乗降回数・最終訪問日・路線別記録・メモ・写真
    - [公的情報]: 時刻表・ホーム番号・出口・運行状況・Wikipedia
    - [周辺情報]: Google Maps連携・駅周辺店舗・乗換案内
    - [個人メモ]: 自分のメモ・写真・訪問時のエピソード
  - シーン別体験: 乗車前 → 乗車中 → 降車後 → 乗換時 で出す情報を変える
  - Notion §「駅UIの情報ハブ化」参照（最も詳細な設計あり）

- [ ] **キャラ自動獲得トースト連動（Phase 2）**
  - 既に `checkAndGrantCharacters` は実装済み（v89）
  - 残: 獲得時の演出（マーカー光る、効果音、図鑑タブにアニメ表示）

- [ ] **キャラ図鑑タブ**
  - 統計タブに「所持キャラ一覧」「全キャラ一覧（未獲得は ?）」
  - 期間限定キャラの取得期限カウントダウン
  - 獲得日時記録（→ owned_characters を `{id: timestamp}` に変更）

- [ ] **GPS獲得半径を本番値に戻す**
  - 現在テスト用に 1km（v91）
  - 本番: `max(300m, accuracy+100m)` に戻す（`tryGrantByGPS` 内）

## 🟢 データ充実

- [ ] **operator_id placeholder の一括補修**（`op____` 等が約 277 件残）
  - 横浜市営・京都市営・京福電気鉄道・埼玉高速・横浜高速鉄道 ほか
  - `service_lines_master.json` 内の placeholder（`op_` の後にアンダースコア連続）を本来の id（例: `yokohama_city`, `kyoto_city`, `keifuku`, `saitama_rapid`）に置換
  - 影響: `detectServiceLineGroup` が地域グループを正しく付けられず「首都圏・ローカル」「その他」にフォールバックしている
  - 西武池袋線駅順 / 箱根登山系 / 伊豆箱根 の 4 件は v173 で対応済

- [ ] **直通系統の追加**（service_lines_master.json の `through_lines`）
  - **v334 で土台完成**: through_lines は line.id 形式で整備、broken refs 0、路線アクションシートで「🔀 直通先」UI 動作中、双方向 navigable
  - **v335**: 新幹線 3 直通ペア (東海道↔山陽 / 山陽↔九州 / 東北↔北海道) 双方向で書き込み完了
  - **v336**: Phase B 関東 26 直通ペア / 52 ref 完了 (京急-浅草-京成-北総 / 副都心+東横+みなとみらい / 有楽町 / 西武 / 半蔵門 / 千代田 / 東西 / 目黒-南北-三田-埼玉高速-相鉄 / 埼京-りんかい-川越)
  - **v337**: Phase C 関西 27 直通ペア / 54 ref 完了 (阪急-堺筋-千里-嵐山 / 阪急神戸-神戸高速 / 阪神なんば-近鉄 / 阪神-神戸高速 / 神戸高速 3 社相互 / 京阪内部 / 京阪京津-京都市営東西 / 近鉄内部 / メトロ中央-けいはんな / 御堂筋-北大阪急行 / 環状-ゆめ咲 / 関西空港 / 南海高野-泉北)
  - through_lines 持ち系統 80 / 640 (12.5%)、主要都市圏は概ねカバー
  - 残 (Phase D 散発):
    - <!-- ✅ v341 で完了: 名古屋エリア (名鉄相互直通 15 + 市営地下鉄↔名鉄 3 + JR武豊↔東海道 1) -->
    - <!-- ✅ v343 で完了: 第三セクター北陸・東北 (旧北陸本線/信越本線/東北本線 継承路線同士の越境運行 + IRいしかわ↔JR七尾・しなの鉄道↔JR篠ノ井)。北陸新幹線↔第三セクターは直通運転無しのため skip -->
    - <!-- ✅ v340 で完了: 山陽電鉄本線は既存だった、through_lines 2 ペア追加 (本線↔阪神神戸高速/網干線) -->
    - <!-- ✅ v342 で完了: s0/s1 sibling 機構 (案 B) で 10 路線一括解決、UI で sibling の through_lines を merge -->
    - <!-- ✅ v343 で完了: 福岡市営空港線↔JR筑肥 + 私鉄細支線 関東 15 (京急/西武/小田急/京王/東武)。仙台/札幌は他社直通無しのため skip -->
    - through_lines 設計上の主要な穴は概ね埋まった (142/642 = 22.1%)。残るのは独立運営の路面電車・新交通システム・モノレール等で直通無しのケースがほとんど

<!-- ✅ v339 で完了: 山形/秋田 ミニ新幹線 独立系統新設 + 東北新幹線と through 接続 (CHANGELOG §189) -->

- [ ] **新幹線各系統の手動連結**（through_lines による「ハブ表現」ではなく 1 系統として連結する独立タスク）
  - through_lines (v335) で新大阪・博多・新青森の直通関係は表現済。これとは別に、運行体系を 1 つの系統として扱いたい場合の手動キュレーション系統 (例: `tokaido_sanyo_shinkansen_through`) を新設するか検討
  - 北陸新幹線（東京〜敦賀）、西九州新幹線は through_lines 候補なし
  - **山形新幹線・秋田新幹線** はミニ新幹線で奥羽線/田沢湖線の在来線軌道を走る実体 → v334 の青梅線方式で `yamagata_shinkansen` (福島〜新庄) / `akita_shinkansen` (盛岡〜秋田) を新設して東北新幹線と through_lines で接続するのが筋

- [ ] **駅キャラを増やす**
  - 主要ターミナル（東京・新宿・渋谷・池袋・横浜・大阪・名古屋・札幌・仙台・博多）
  - 地域文化を反映したデザイン（クワテン式：地元産業 × 神話/伝統 × ご当地）
  - ファイル形式: SVG（viewBox 64x64, 1-5KB目標）
  - 八王子/立川は3体ずつあるので他駅にも展開

- [ ] **季節限定キャラの実イベント期間設定**
  - タチハナビ → 実際の昭和記念公園花火大会期間 (例: 7月下旬の数日)
  - タチユキ → 実際の冬イルミ期間 (例: 12月〜1月)
  - ヨマツリマユ → 八王子まつり期間 (例: 8月上旬)
  - 現在テスト用に長め期間設定中

## 🔧 パフォーマンス・UI

- [ ] **ES Modules 化 残作業 (v195〜v225 でほぼ完了、小規模残し)**
  - 01-constants / 04b-ride-record の export 化 (globalThis 経由 bare 参照で十分動作中のため据置中)
  - Notion §2.4 布石⑤ Supabase 呼び出しを `NORIRECO.api.xxx` ラッパー化 (RLS 強化と同時着手が効率的)
  - 実機検証: ログインフロー (Magic Link / Google OAuth / signOut / 後追い認証) を実機 (PC / iPhone PWA) で確認

- [ ] **路線一覧タブの絞り込み UI**
  - 637 系統あるとスクロール大変
  - 検索ボックス・地域フィルター・運営会社フィルター

- [ ] **モバイル描画パフォーマンス継続改善**
  - Phase 2 で改善したが、まだ重い駅がある（多系統駅のパイ・キャラ）
  - 必要なら viewport culling、divIcon → canvas への寄せを再検討

- [ ] **PreToolUse (git push) フックの設計と実装**
  - Notion ⚙️ セッション運用 三層設計 §2.1 / §5 を参照
  - `sw.js` CACHE_VERSION +1 grep / `.html` 内 inline script の syntax check / §2.5 落とし穴チェック を 1 本に統合
  - 漏れていたら exit 2 でブロック（PreToolUse はゲート）
  - §5 未確定論点（push 判定 / CACHE_VERSION 自動化 or 検査のみ / HTML syntax の深さ）を先に潰す

## 🌱 布石（B カテゴリ：設計だけ今・実装は後）

長期スケール（10万〜100万 MAU）で必要になるが、今やらないと後で改修コストが爆発する項目。「今のうちにやること」欄を必ず明記する。詳細・運用ルールは [🌱 布石リスト（Notion）](https://www.notion.so/36471b458b6381198769fcbf5ab630bd) と [🏗 インフラ戦略（Notion）](https://www.notion.so/36171b458b63818f8687d3d05ad0926e)。

<!-- ✅ v249 で完了: 静的アセット GitHub Pages → Cloudflare Pages 移行 + 独自ドメイン norireco.app 取得 — CHANGELOG §98 参照 -->

- [ ] **#2 画像ストレージ: Cloudflare R2 + Workers API ゲートウェイ (v256/v258 で着手済)**
  - ✅ v256: メモ写真の upload パス (`worker/` + R2 バケット `norireco-photos` + `api.norireco.app` + `cdn.norireco.app`)。CHANGELOG §105 参照
  - ✅ v258: 旅程写真の upload パス + 共通 PhotoArea モジュール化 + memo/trip 共に最大 5 枚対応。CHANGELOG §107 参照
  - ✅ v261: 写真の並び替え UI (← → ボタン方式、共通 PhotoArea 内)。CHANGELOG §110 参照
  - ✅ v262: 写真差し替え時の旧 R2 オブジェクト delete API (`POST /delete/photo` + フロント diff)。CHANGELOG §111 参照
  - ✅ v268: memo/trip 全削除時の R2 cleanup (deleteTripFromMypage / deleteMemoOnServer 内で deletePhotoByUrl 並列実行)。CHANGELOG §117 参照
  - ✅ v412/v413: OGP シェア画像の R2 永続化 (`/upload/share-image`) + `/share/<id>` 受け側ページ (Pages Function + `norireco_shares`)。シェア取り消し時の R2 cleanup は v416 で deletePhotoByUrl 流用 (shares 3-segment 対応は worker v415)。CHANGELOG §257〜§266
  - **残り**: 特になし (画像ストレージ基盤は memo/trip/share 全用途でひと通り完結。将来の定期 cleanup ジョブは未着手)

- [ ] **#3 `norireco_trips` テーブルの将来シャーディング可能化**
  - 理由: 100 万 MAU で trip データ 2TB、Postgres 単一テーブルは 10 万 MAU で限界。`created_year` で水平分割できる構造にしておけば Neon 移行時もスムーズ
  - 発動条件: 10 万 MAU 手前で実際の `PARTITION BY RANGE` 設定
  - 今のうちにやること: 新規テーブル設計時は `created_year`（または同等のパーティションキー）カラムを含める。`PARTITION` 自体は今まだ設定しない

- [ ] **#4 API を Workers 経由に統一 (一部 v256 で着手済)**
  - ✅ v256: `worker/` (norireco-api) を立ち上げ、`/upload/memo-photo` を Worker 経由で実装。新規 API はここに追加する規約を確立。CHANGELOG §105 参照
  - **残り**: 既存の Supabase SDK 直叩きコード (trip / character_grants / memos の CRUD) を順次 Worker 経由に移行。布石 #5 (認証ベンダーロックイン回避) と合わせて段階的に

- [ ] **#5 認証ベンダーロックイン回避**
  - 理由: Supabase Enterprise は \$数千/月でコスト交渉力が低い。10 万 MAU で Auth を Clerk / Auth.js に逃がせる選択肢を残す
  - 発動条件: 10 万 MAU 手前でベンダー比較開始。今は Supabase Auth 一本で OK
  - 今のうちにやること: Magic Link / Google OAuth の UI コードは Supabase 依存を 1 関数に集約する（ユーザー情報取得・JWT 検証の口を狭める）

<!-- ✅ #6 垢 BAN 設計（共有のみ停止・個人記録は維持）: v423 で本体実装完了 (🔥「垢BAN」に統合)。
     布石どおり「シェア機能設計時に share_status + RLS を組み込む / trip・character_grant は触らない」を実現 = 後付けスパゲッティを回避。
     真実の源 = norireco_profiles.share_status、shares.revoked は派生キャッシュ。CHANGELOG §273。残務・別タスクは 🔥「垢BAN」を参照 -->


- [ ] **#7 駅 ID name 照合の物理撤去（駅 ID 体系 完全版・今はやらない）** ← 駅 ID 体系 Phase 1〜3 完了 (v290〜v329) + Phase 2 クローズ (v422) の残務
  - 背景: 読み取りは id 化済だが、格納 trip segment を `s.name === seg.from` で照合する箇所が **6 ファイル ~15 ペア**残る（id 優先化済は 04b `rebuild` (v422) + 13-mypage の 2 箇所のみ、残りは **13a-stats ~9 (完乗率・統計 16 種)** / 02b-service-lines-builder / 14-share-ogp / 21-bulk-record ×2）。name 照合を物理的に消すには segments JSONB の `from_id`/`to_id` 全件 backfill が前提
  - 理由 (今やらない・v422 判断): SERVICE_LINE 内で駅名は一意なので「正しい SL に resolve → name 照合」は実質 id 照合と等価 = **体験改善ゼロ**。逆に backfill 漏れで履歴 trip が地図から消える silent 破壊リスクを負うだけ
  - 発動条件: グローバル展開 or AI 自動列車判定の着手直前（その頃データモデル自体が変わる可能性が高い）
  - 今のうちにやること: 特になし（新規 trip は既に from_id/to_id 入り、読み取りは id 優先 or name fallback で正しく動作中）。工数感のみ記録 = **1.5〜2 セッション級**（① 残 ~13 サイト id 優先化 ② segment backfill ③ fallback + 旧 N02 救済 (04b:331-389 / 02b candidateN02Ids) 撤去 ④ 全層回帰検証）。詳細 → CHANGELOG §272

---

## 🎮 将来（コア層 → マス層フェーズ）

### キャラシステム拡張

- [ ] **キャラのリアル画像版（モーダル内）**
  - SVG はマップ用、モーダル内は WebP/Lottie の高品質画像
  - `image_path` / `image_animation` フィールド追加

- [ ] **マップ上の広告アイコン**
  - 別レイヤー (`adsLayer`) でスポンサー駅アイコン表示
  - `ads_master.json` 新規（sponsor, station_ids, link_url, period_from-to）
  - クリックでモーダル → 詳細＋リンク
  - プレミアム会員は非表示

- [ ] **キャラの色変更 UI**
  - SVG 内の塗りを `currentColor` / CSS変数 に変更
  - characters_master に `colorable_parts` 追加

- [ ] **キャラの装束違い（variants）**
  - 1キャラに複数 SVG variant パスを `variants: [{id, name, svg_path}]` で持たせる
  - 桜・夏・冬・祭装束など季節バリエーション

### ビジネス・収益（Notion 新方針）

- [ ] **AI 自動列車判定（プレミアム機能・月 300 円）**
  - GPS 軌跡 + Web 検索（時刻表） + Claude Haiku
  - 「あずさ9号」レベルまで判別
  - コスト構造: 1乗車 約2円 × 月20回 = 40円コスト → 月300円利益260円/人
  - Notion §「AI活用のプレミアム機能化」参照
  - 注: v345 で不正検知撤回。「AI 判定 → verified 昇格」を残すなら、AI が判定した内容を「✨ AI 認定」のような別バッジで提示する方向で再設計

- [ ] **文脈型タイミング広告**
  - 5タイミング（出発前・乗車前・乗車中・到着前・到着後）で情報/広告を出し分け
  - CPM 350→2,000-5,000 円期待
  - 広告主審査・品質管理を厳格に
  - Notion §「収益の柱：文脈型タイミング広告」参照

- [ ] **提携（アフィリエイト）**
  - 楽天トラベル（10%）/ じゃらん / Booking.com / GO（タクシー） 等
  - 予約システムは自前で作らず、情報のマッチング業に専念
  - Notion §「提携戦略」参照

- [ ] **プレミアム会員機能**
  - 月額 300円: 広告非表示・統計詳細グラフ・廃線データ・CSV エクスポート・カスタムバッジ
  - AI 自動列車判定もここに含む

### マップ情報ハブ化（レイヤー拡張）

- [ ] **マップに情報レイヤーを重ねる構想**
  - 現状の地図は「自分の乗車記録」レイヤーのみ
  - 将来的にトグル可能な情報レイヤーを追加し、マップを「全国鉄道情報の入り口」にする
  - 候補レイヤー:
    - **乗降客数**: 1日の利用客数の多い駅をヒート/サイズで表現（公式オープンデータ活用）
    - **駅周辺情報**: 観光・グルメ・温泉・絶景駅
    - **車両配置**: どの系統にどんな車両が走っているか
    - **イベント/工事**: 一時的な運休・スタンプラリー
    - **歴史**: 廃線・旧線・年代別の路線網
  - 各駅・各系統が「詳細情報への入り口」になる → 閲覧数増・SEO 寄与
  - 駅 UI 情報ハブ化 (§ 🟡) と統合して設計する

### ゲーミフィケーション・イベント

- [ ] **イベント機能（自治体・季節）**
  - スタンプラリー × 乗車記録
  - `events_master.json`（id, period, target_stations, reward_badge, sponsor）
  - 3万人規模になってから本格展開（設計のみ先行）

### 長期ビジョン

- [ ] **アプリ化（React Native or Flutter）**
  - AdMob 導入で広告単価 2〜5倍
  - GPS常時取得、プッシュ通知（押し忘れ防止）
  - バックグラウンドGPS（Web では不可能）
  - ユーザー数 5,000人を超えたら検討

- [ ] **グローバル展開（5〜10 年スパン）**
  - Phase 1（1-2年）: 日本市場で完成度を高める
  - Phase 2（3-5年）: 韓国・台湾・中国・香港
  - Phase 3（5-10年）: 欧州(ドイツ・イギリス・スイス)
  - Phase 4（10年〜）: 米国・インド

- [ ] **道路版乗レコ（自動運転時代）**
  - サブタイトル進化: 電車旅 → 移動の記録 → あなたの移動ライフ
  - 3層構造: 道路 → 道の駅/IC/宿場町 → 絶景ドライブ
  - 鉄道での完乗思想をそのまま道路に応用
  - Notion §「道路版への拡張構想」参照

- [ ] **廃線対応（のちのち）**
  - 廃止された路線・駅をマップに重ね表示できる（年代スライダーで時代切替）
  - 「あなたが乗ったことのある廃線」「廃線完乗率」も別軸で算出
  - 鉄道オタクのコア需要に応える長期施策
  - データソース: 廃線 DB（要収集）+ 開業年/廃止年フィールドを `service_lines_master` に追加
  - マップ情報レイヤー構想（§ 🎮 マップ情報ハブ化）の「歴史レイヤー」と統合

---

## メモ

- **main 直 push 運用**（個人開発、PR・専用ブランチ不要、自動承認設定済み）
- 編集後は **`sw.js` の `CACHE_VERSION` を上げる**こと（最新値は [STATUS.md](./STATUS.md) 参照）
- HTML 編集後は `</script></body></html>` が末尾に残っているか必ず確認
- **JS 編集後は必ずシンタックスチェック** — `npm run check` で 18/18 OK を確認 (v193〜)
- 新規 trip の `lineId` は `service_lines_master.json` の id を使う（旧 N02 id も `LEGACY_LINE_ID_ALIAS` で透過解決）
- キャラ追加: `characters/<id>.svg` 配置 → `characters_master.json` に entry 追加 → `sw.js` STATIC_ASSETS に追加 → CACHE_VERSION 上げ
- 列車追加: `trains_master.json` の trains 配列に entry 追加（id/name/category/operator/description/stations_typical、必要なら car_models と rarity と discontinued）
- 認証情報フィールド: `source` / `verified` / `gps_lat-lon` / `recorded_at` / `date_precision`
- 列車情報フィールド: `train_id` / `train_name` / `train_category` / `car_model`（v122〜）。`train_id IS NULL AND train_name IS NOT NULL` = マニア手入力 = マスター補完候補
- 完了済みタスクの履歴は `CHANGELOG.md` へ。本ファイルには未着手の項目のみ残す。
