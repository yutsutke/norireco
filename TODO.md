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
  - **残り** (S-2 → S-3 の順、依存関係あり):
    - S-2: 画像保存先 R2 + Workers (`/upload/share-image` presigned PUT、布石 #2/#4、永続シェア URL に必須)
    - S-3: シェア専用ページ `/share/<id>` + OGP メタタグ + 「自分も記録」CTA (Supabase `norireco_shares` + Cloudflare Pages Function)。S-2 の永続画像 URL が前提
  - 注: v345 で「verified 限定ガード」は撤回 (GPS = 手動の手間省略、世間への証明不要)。手動記録も対等にシェア可

- [ ] **垢BAN（不正利用ペナルティ）対応**
  - 共有・シェア機能のみ停止、個人記録は通常通り使える設計
  - 「自分の達成は壊さない、外への発信だけを制限する」 = やり直しの余地を残す
  - 段階: warn（注意）→ share_banned（シェア不可）→ full_banned（極端な場合のみ）
  - `users.share_status` を Supabase に追加。マイページにバッジ表示
  - 発動条件 (v345 改): 不正検知連動は撤回。代わりにスパム的シェア量・他ユーザー通報・規約違反コンテンツ等を別軸で検討

- [ ] **Supabase RLS 強化 (v233 の残課題)**
  - 現状: anon key で REST API 直叩きで他人の生 trip / character_grants を取得可能
  - v233 で UI 側では他人データを表示しないよう防御済だが、本格対策は RLS policy で `user_id = auth.uid()` 必須にする
  - 影響テーブル: `norireco_trips` / `norireco_character_grants` / `norireco_memos`
  - 注意: backfill (user_id=NULL → 自分の uid に PATCH) は access_token ベースなので RLS 強化後も動作する

- [ ] **駅 ID 体系 Phase 2: trip データ自体に `*_station_id` 列追加 + Supabase 移行**
  - Phase 1 完成 (v293〜v300): 駅マスター (merged_stations 9,017 駅) に `s_NNNNN` id 付与、SERVICE_LINES に伝播、集計・描画判定すべて id ベース化
  - **Phase 2-a 完成 (v310)**: `from_station_id` / `to_station_id` 列追加 + 並行書き込み
  - **Phase 2-b 完成 (v311)**: 既存 trip 125 件のバックフィル完遂 (失敗 0)
  - **Phase 2-c 完成 (v312)**: 完全一致経路 (駅シート/地図駅クリック) を id 優先化
  - **Phase 2 残り**:
    - 2-d: 集計の `seg.from/to` name 経由 fallback を撤去 (Phase 3 と一緒でも可)
    - 完了時: `js/20-dev-backfill.js` を撤去
  - 動機: 同名異所駅 (例: 高松 香川 / 石川 / 多摩) を trip データレベルで厳密に区別。Phase 1 では SERVICE_LINE 経由で間接解決していたが、trip データそのものが name しか持たないと将来 (グローバル展開・AI 自動列車判定) で破綻する

- [ ] **駅 ID 体系 Phase 3: memo / characters_master / 駅名検索の id 化**
  - **Phase 3-a/3-b 完成 (v313)**: `characters_master.json` schema_v2 で id 化、キャラ獲得判定 / GPS 獲得 / 駅シート連携 を id 優先 + name fallback に
  - **Phase 3-c 完成 (v314)**: GPS 後追い認証 `findStCoord` を id 対応に
  - **Phase 3-d 完成 (v315)**: メモに station_id 列追加 + 並行書き込み + 読み込み id 優先化 (バックフィル省略、既存 3 件は name fallback)
  - **Phase 3-e 部分完成 (v316)**: 13a-stats の visitCount を id 化、`js/20-dev-backfill.js` 撤去
  - **Phase 3-e 仕上げ完成 (v317)**: マイページ駅名検索を id 解決層経由 (resolveStationQueryIds) に、slVisitCount を SERVICE_LINES + 駅 id キーに統一、08-rendering / キャラモーダルの参照側も ms.id ベースに
  - **Phase 3-f 完成 (v323)**: slStopType を駅名 → 駅 id キーに切替 (同名異所駅の stop_type 判定混線を解消)
  - **Phase 3-g 完成 (v324)**: characters_master schema_v3 で `station_names` / `obtainable_at_names` 撤去、stationCharMap / `getStationCharacter` 系 API を駅 id ベースに統一
  - **Phase 3-h 完成 (v325 + Run 2026-05-25 + v333 cleanup)**: memo.station 列 DROP 完遂、fallback 分岐撤去、backfill 関数撤去
  - **Phase 3-i 完成 (v326 + Run 2026-05-25 + v333 cleanup)**: trip.from_station/to_station 列 DROP 完遂、fallback 分岐撤去、backfill 関数撤去
  - **Phase 3-j 完成 (v327)**: LINES (lines-p1〜p4.json) の stations[] に駅 id 付与 (10,164 中 10,151 / 99.87%)、p2 を「1 路線 1 行」フォーマットに統一。先回り対応 (実態としては N02 LINES.stations[].n 参照箇所が 12 ファイル数十箇所あり、データ側に id を持たせて将来 reader 移行をインクリメンタルに可能にした)
  - **Phase 3-k 完成 (v328)**: lines-p2.json の座標を流用して merged_stations.json に 13 駅 (s_09018〜s_09030) を追加 (常磐線震災区間 11 + 山陽線 2 + 東北線 1)。add_line_station_ids.js 再実行で **カバレッジ 100.00%** 達成 (far=0, missing=0)
  - **Phase 3-k+ データ充実完成 (v329)**: 上記 13 駅を jr_joban_medium / jr_sanyo_main / jr_tohoku_main_rifu の 3 SERVICE_LINES に収録、merged_stations の lines/colors も同時更新、compute_isolation_rank.js で isolation_rank 再計算 (新規駅 rank 3-5 / 9030 駅全てが SERVICE_LINE 収録)

## 🟡 体験向上（コア層の継続率を上げる）

- [ ] **旅程予定ページ（未着手、アイデア段階）**
  - 過去の記録だけでなく「これから乗る予定」の旅程を組み立てられるページ
  - 未乗車路線・未訪問駅を選んで予定リスト作成、マップ上で予定経路を点線等で別表現
  - 実乗後に「予定 → 記録」へ昇格させる導線
  - 既存機能との相性: v177「未乗車のみ表示」+ v174「〜月指定」で「旅行計画 ⇄ 振り返り」両軸を揃える
  - スキーマ案: `norireco_planned_trips` テーブル新設 or `norireco_trips.status='planned'` 拡張、localStorage 先行も可
  - 詳細: Notion §3.1 次のフェーズ 「🟡 体験向上」参照

- [ ] **一括記録 (まとめて記録)** (Notion §1.3 設計確定 / B カテゴリ完結 v392-v399 / **A 段階 A-1〜A-8 完結 v400-v406** = 全機能 + 区間ピッカー / **v407 で旧 `noritetsu-log.html` 削除完了** = 受け皿として完全置換、残: 環状線対応 + 写真添付 = 別タスク)
  - **動機 2 層**:
    - マニア層 (Lv3): 過去何十年ぶんの乗車を遡って一括入力。路線・区間まで正確に
    - 新規〜ライト層 (Lv0/1): 登録直後の空マップを「乗ったことある路線」で塗って初期状態作り (虚無対策 / シェア・OGP に効く)
  - **形式**: 営業系統チェックリスト (検索 + 「近く / 会社 / 都道府県」フィルタ)。タップ = 全線完乗の draft trip (`source=manual, verified=false, date_precision='unknown'`)。アコーディオン同時 1 行で詳細フォーム展開
  - **入口**: マイページ「過去の乗車をまとめて記録」 + 空マップ時オンボーディングバナー
  - **UI 本体**: 地図にかぶせるボトムシート (オーバーレイ)。チェックするたび背面の地図が塗られ完乗率が上がる "可視化で報酬"
  - **必須前提**: trip 詳細エディタ抽出。確認モーダル中身を 02/07/13b 3 箇所重複 (v383 落とし穴) から単一 `createTripDetailEditor` に集約
  - **段階**:
    - ✅ B-1 (v392): `js/20-trip-detail-editor.js` skeleton 配置 + API 設計合意 (factory + features + internal クロージャ state + photos 実体化)
    - ✅ B-1 続き (v392): per-seg-chip mode 本実装 (`selectSlChip` / `applyRecTrainCategory` / `populateSlVehiclePicker` / 02 dropdown handlers をクロージャ移植) + 07 確認モーダルを component 経由に書き換え + noritetsu-map.html `#rec-train-picker` 圧縮 + preview server 実機 simulate で動作確認
    - ✅ B-2 (v393): 13b 編集モーダルを per-seg-rows / trip-level mode で factory 移行。`saveTripEdit` を `editor.getDraft()` 経由に統一。CHANGELOG §243
    - ✅ B-3a (v394): 13b の ⏱ 遅延 + 📝 自由メモ を 2nd factory instance (`_tripEditMetaEditor`) に集約。CHANGELOG §244
    - ✅ B-3b (v396): 13b の 🕒 乗車時刻を 3rd factory instance (`_tripEditTimeEditor`) に集約 (`precisions=['minute','day']` 専用ロジック、closure に `_initialPrecision` snapshot)。`features.timeRow` を `{ precisions: [...] }` object に拡張、5 精度版は `_supportsFull5Precisions()` 分岐で TODO 残置。CHANGELOG §246
    - ✅ B-3c (v397): 07 確認モーダルへ 🕒 乗車時刻 (5 精度 + GPS preset 連動) + ⏱ 遅延 (mania toggle + localStorage 永続化) + 📝 自由メモ を factory に集約。factory に `_initTimeRowFull5/_collectTimeRowFull5` 追加、`features.delay` を `{ maniaToggle, prefKey }` object 対応に拡張。`saveMultiSegmentTrip` 60 行を 13 行に圧縮、`updateRecConfirmTimeRow` を draft 経由に。CHANGELOG §247
    - ✅ B-4-a (v398): 13b/07 の visible dead code 撤去 (~350 行)。13b: 旧 10 関数 (264 行) + HTML 12 element + onchange 参照削除。07: 旧 4 関数 (70 行) + HTML 12 element 削除。CHANGELOG §248
    - ✅ B-4-b (v399): グローバル `NORIRECO.trains.selectedXxxBySl / activeChipSlId / selectedTrainId-Name-Category-CarModel` 9 fields 撤廃 + 02 旧 cascade handler (~190 行) + 07 旧 SL chip ロジック (~330 行) 撤去 + factory に `containers` multi-container API 追加 + 各 modal 3 instance を 1 instance に統合 (07 `_recEditor` / 13b `_tripEditEditor`)、HTML の `#xxx-meta-container` を delay/notes 独立コンテナに分割。正味 ~540 行削除。CHANGELOG §249
    - ✅ A-1 (v400): skeleton — `js/21-bulk-record.js` 新設 (open/close + window 公開) + `#bulk-record-sheet` モーダル枠 (`.memo-modal` 流用) + マイページ旅程サブタブ上部に `.mp-bulk-entry` 常設エントリボタン (13b-trips.js renderMpTripsSection 先頭挿入 + import で間接ロード)。preview で eval 検証 OK。CHANGELOG §250
    - ✅ A-2 (v401): 営業系統チェックリスト本体 + たたむモード — `_bulkDrafts: Map<lineId, draft>` で管理、638 系統 (A-4 までフィルタなし) 全件描画、チェック = 全線 1 segment の draft push (`source=manual, verified=false, date_precision='unknown'`)、アンチェック = Map.delete、サマリ「N 件選択中」リアクティブ更新、保存ボタンは A-3 まで disabled 骨だけ、環状線は 🔄 マーク。CHANGELOG §251
    - ✅ A-3 (v402) **MVP 完成**: 一括保存 — `saveBulkDrafts` で draft 配列を順次 trip 構築 → Supabase POST (anon Bearer) → localStorage push (部分コミット許容) → 全件後に RIDDEN_SEGS bulk push + `rebuild()` 1 回 + `redrawAllLinesAfterTripChange` + `updateOverlays` + `_mypageCache.push` + `renderMpTripsResultOnly` + 駅シート refresh + トースト + sheet 自動 close。trip 構造: `id=trip_${baseTime}_${idx}` / `name=${lineName} 全線` / `transfers=0` / `total_stations=stations.length`。preview 3 件保存検証で riddenSt 全展開 + 完乗率更新 + console error 0 確認。CHANGELOG §252
    - ✅ A-4 (v403): 検索 + 並び替え + 地域フィルタ — `_filter = { query, sort: 'near'|'name', group }` state、検索 input (系統名/会社/id 部分一致 + 空白 AND)、`近く順 (lastUserGps > map center)` / `名前順 (50 音)`、地域 group dropdown (13 値)。`_renderChecklistOnly()` でフィルタバー保持 + checklist だけ再描画 (IME 安定 / mp-trip-filter と同設計)。preview 5 シナリオ + チェック保持 全 OK。運営会社 dropdown は 180 件で UI 不向きのため検索 input に統合 (「JR東日本 新幹線」のような AND 検索で代替)。CHANGELOG §253
    - ✅ A-5 (v404): アコーディオン展開 — 行右端 ▶/▼ ボタンで `createTripDetailEditor` (`trainPicker='per-seg-rows'` + 5 精度 time + delay + notes、photos は将来) を multi-container API で行内 mount。Notion §1.3 確定の「同時 1 行制御」: 別行を開くと現開行は close 時に `editor.getDraft()` で `_bulkDrafts` 上書き (`_edited: true` フラグ) + destroy。`_buildTripFromDraft` を `_edited` 分岐対応。編集済み行は名前に ✏️ マーク。preview で展開→入力→別行展開→上書き→保存→trip 反映 全 OK。**環状線対応**: 半周分割を検証したが SERVICE_LINES と N02 line の駅順ズレで根本解決せず A-5 スコープ外へ (山手線 17/30 駅塗りの既知制約として bulk-note に明記)。CHANGELOG §254
    - ✅ A-6+A-7 (v405): 空マップ時オンボーディングバナー + unknown 集計検証 — gold + 矢印アニメ banner を地図中央下に、旅程 0 件 (localStorage AND RIDDEN_SEGS 空) で表示、タップで bulk sheet 起動。`updateOnboardingBanner()` を `saveBulkDrafts` 後 + `saveMultiSegmentTrip` 後 (07 に hook 1 行追加) + DOMContentLoaded で呼ぶ。A-7 検証: 期間フィルタが地図塗りにも影響することを確認、ユスケ判断で現状 (b) 確定 = 「期間フィルタ = 日時判明 trip 内で絞る」意味論で整合、Notion §1.3 採用 (a) を撤回。CHANGELOG §255
    - ✅ A-8 (v406) **A 段階完結 + 区間ピッカー**: アコーディオン body 先頭に「🚉 区間」セクション、from/to 2 select + 駅数 meta (全線/区間自動判別)、change で `_bulkDrafts.segments[0]` 更新 + `_edited=true` + factory 再 mount。`_buildTripFromDraft` の name と total_stations を segments[0] from/to で動的化 (両端=「全線」、中間=「from→to」+ 区間内駅数)。preview で「中央本線快速 新宿→高尾 20 駅」+「上野東京ライン 全線 44 駅」両立保存 OK。CHANGELOG §256
    - 別タスク (A 段階外、別途): **環状線対応** — N02 山手線 line データに東京〜上野間補完 or SERVICE_LINES.candidateN02Ids の環状線専用ロジック (A-5 で根本解決不可と判明、駅 ID 体系延長作業として別途)
    - 別タスク (A 段階外、別途): **bulk-record アコーディオンに写真添付** — A-5 で `photos: false` で skip、factory は対応済なので追加は軽い
    - 別段階・後回し: ② 地図上路線直接タップ / ③ 都道府県シード
  - **要検討 (実装時に潰す)**:
    - `date_precision='unknown'` の集計経路 — 採用 (a) 2026-05-26: 期間フィルタからは除外維持、地図の塗り・完乗率には含める (嘘の年で埋めない方針)。実装時に「集計が期間フィルタの unknown 除外と別経路になっているか」要確認
    - 一括保存の途中失敗: 部分コミット許容か全ロールバックか、写真 R2 ゴミ方針 (v258 同様 "一部残り許容")
    - `node --check --input-type=module < file` でシンタックスチェック (v372 教訓) — js-syntax-guard サブエージェント (v391-v392) で自動化済

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
  - **残り**:
    - OGP シェア画像の R2 永続化 + `/share/<id>` 受け側ページ (🔥 シェア機能の残りと統合)

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

- [ ] **#6 垢 BAN 設計（共有のみ停止・個人記録は維持）** ← 🔥 残 TODO の「垢BAN 対応」と連動
  - 理由: シェア機能（OGP）リリース後に垢 BAN を後付けすると trip / share テーブルの flag 設計がスパゲッティになる
  - 発動条件 (v345 改): シェア機能リリース時。不正検知連動は撤回 (世間への証明不要方針)
  - 今のうちにやること: シェア機能設計時に `users.share_status`（warn / share_banned / full_banned）と RLS を含める。trip / character_grant は触らない設計に

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
