# 乗レコ - 電車旅 更新履歴 (Phase 3.8 一括記録の後始末 + シェア計測期 — v428〜v448 アーカイブ)

`CHANGELOG.md` から退避した Phase 3.8 後半 (v428〜v448 相当, §278〜§295) のセッションログ。主軸テーマ: 一括記録 (v400〜v406) の実地で出た詰まりを潰し切り (シート z-index / 地図タブで見えない / 写真添付 / 環状線の偽の注意書き撤去)、その上でシェアの漏斗を端から端まで計測できるようにした期。`/share/<id>` 受け側強化 + view/click 計測 (SECURITY DEFINER RPC + bot 除外 + `/go` リダイレクト)、シェア経由の新規登録 attribution (5大原則④「シェアが分水嶺」の本命指標)、admin 横断ビュー + スクショ、計測表示のユーザー非表示化。あわせてマイページ統計から GPS 特別扱いを撤去し (v441)、ゲストモードでも活動量を出せるようにした (v442)。シェア画像の期間チップと初回達成演出もここ。

他フェーズは:
- [CHANGELOG.md](CHANGELOG.md) — 現行
- [CHANGELOG_PHASE3.8-guest-rls-ban.md](CHANGELOG_PHASE3.8-guest-rls-ban.md) — Phase 3.8 ゲストモード開放 + RLS 強化 + 垢BAN 期 (v418〜v427)
- [CHANGELOG_PHASE3.8-share-mvp.md](CHANGELOG_PHASE3.8-share-mvp.md) — Phase 3.8 シェア機能 MVP 期 (v407〜v417)
- [CHANGELOG_PHASE3.8-bulk-record.md](CHANGELOG_PHASE3.8-bulk-record.md) — Phase 3.8 trip 詳細エディタ抽出 + 一括記録期 (v392〜v406)
- [CHANGELOG_PHASE3.8-transfer.md](CHANGELOG_PHASE3.8-transfer.md) — Phase 3.8 乗換候補 + 徒歩乗換 + 系統別車両形式 + 旅程編集 per-seg cascade 期 (v364〜v391)
- [CHANGELOG_PHASE3.8-vehicles.md](CHANGELOG_PHASE3.8-vehicles.md) — Phase 3.8 through_lines + GPS 位置づけ + 車両形式 DB + 記録モーダル整理 (v334〜v363)
- [CHANGELOG_PHASE3.8-station-id.md](CHANGELOG_PHASE3.8-station-id.md) — Phase 3.8 駅 ID 体系期 (v290〜v333)
- [CHANGELOG_PHASE3.8-mypage.md](CHANGELOG_PHASE3.8-mypage.md) — Phase 3.8 マイページ強化期 (v279〜v289)
- [CHANGELOG_PHASE3.8-photo.md](CHANGELOG_PHASE3.8-photo.md) — Phase 3.8 駅メモ + R2/写真期 (v250〜v278)
- [CHANGELOG_PHASE3.8-share.md](CHANGELOG_PHASE3.8-share.md) — Phase 3.8 シェア + Cloudflare 移行期 (v226〜v249)
- [CHANGELOG_PHASE3.8-modules.md](CHANGELOG_PHASE3.8-modules.md) — Phase 3.8 中盤 (v189〜v225)
- [CHANGELOG_PHASE3.8-early.md](CHANGELOG_PHASE3.8-early.md) — Phase 3.8 前半 (v173〜v188)
- [CHANGELOG_PHASE1-3.7.md](CHANGELOG_PHASE1-3.7.md) — Phase 1〜3.7 (v60〜v157)

カバー範囲 (ファイル内は DESC 配置・新しい順):
- §295 v448: ログイン直後にオンボーディングバナーが誤表示（settle の早期確定 + 再評価なし）
- §294 v447: 記録モーダルの入力を「前回の選択」で初期化（記憶の精度 + 系統別カスケード）
- §293 v446: 旅程編集モーダルを `.content` 外へ移設（v445 ① の完全修正）
- §292 v445: 記録の 2 バグ修正（旅程編集モーダルが路線詳細経由で開かない / 青梅線・阪和線が二重表示）
- §291 v444: 一括記録の達成演出（活性化強化 — 初回の塗れた感動 → シェア導線）
- §290 v443: シェア画像に期間チップ（この期間 / 今年 / 全期間 / 任意期間）
- §289 v442: ゲストモードでも活動量メトリクスを表示（renderStats を _mypageCache ベース化）
- §288 v441: マイページ統計を GPS+手動の全記録ベースに統一（GPS 特別扱い撤去）
- §287 v440: 計測表示とスクショをユーザー向けから撤去し admin 限定に集約
- §286 v439: シェア計測画面を 1 枚にスクショ保存するボタン (html2canvas)
- §285 v438: admin シェア計測 横断ビュー (運営が全シェアの漏斗を俯瞰)
- §284 v437: シェア経由の登録転換 attribution (Phase 2 / 「シェアが分水嶺」本命指標)
- §283 v436: シェア受け側 /share の強化 (③) + view/click 計測 (④)
- §282 v435: 環状線「17/30 駅塗り」は v422 で解消済みと判明 → 偽の注意書きを撤去 (残課題 #1)
- §281 v434: 一括記録アコーディオンに写真添付 (残課題 #2)
- §280 v433: 一括記録シートが地図タブで見えないバグ修正 (#bulk-record-sheet を .content 外へ移動)
- §279 v430〜v432: 一括記録シート 閉じるボタンを右上に移設 + ゲスト trip フィルタ対称修正
- §278 v429: 空マップ オンボーディングバナーが地図に隠れて「一瞬で消える」bug 修正 (z-index) + v428 調査

---

## 295. v448 — ログイン直後にオンボーディングバナーが誤表示（settle の早期確定 + 再評価なし）

**カテゴリ**: A（バグ修正 — ユスケ実機報告）

**症状**: ログイン直後、地図に乗車路線（9 系統）が塗られているにもかかわらず、空マップ用オンボーディングバナー `#empty-onboarding-banner`（「乗ったことのある路線でマップを塗ろう」）が表示され続ける。

**原因**: v418 の `_syncSettled` ゲートに 2 つの穴が重なった。
1. **settle の早期確定**: 起動時に 06-map-leaflet の地図初期化が `syncFromSupabase()` を呼ぶが、この時点では auth 初期化前で `currentUserId()` が必ず null → 05 の `!uid` 早期 return が「未ログイン確定」とみなして `markSyncSettled()` を呼んでいた (v418 で追加)。ログイン直後は直前のログアウト purge で localStorage が空のため、ここでバナーが表示される。
2. **再評価なし**: その後 OAuth 完了 → 本物の `syncFromSupabase` が trips を取得・描画して `markSyncSettled()` を再度呼ぶが、`if (_syncSettled) return;` の早期 return で `updateOnboardingBanner()` が走らず、塗られた地図の上にバナーが残留した。

v418 検証時にすり抜けた理由: テストシナリオが「ログイン済 + localStorage あり」(lsLen>0 で hidden) と「ゲスト + 空」(表示が正解) だったため。**「ログアウト → 再ログイン」の遷移 (localStorage 空スタート + あとから Supabase データ到着)** だけがこの 2 穴を両方踏む。

**修正** (3 点):
- `05-supabase-data.js`: `!uid` 早期 return での `markSyncSettled()` を撤去。「未ログイン確定」の settle は 12-auth `getSession` の no-session 経路に一本化（起動時の uid null は「auth 初期化前」であって「未ログイン」ではない）。
- `21-bulk-record.js` `markSyncSettled`: `if (_syncSettled) return;` を撤去し、settle 済みでも毎回 `updateOnboardingBanner()` を再評価。8 秒 fallback で仮 settle → その後同期完了、のような順でも hidden が最新データに追従する（残った settle 経路すべての安全網）。
- `12-auth.js` `clearLocalUserDataAfterSignOut`: purge 後に `updateOnboardingBanner()` を呼ぶ 1 行追加。ログアウトで地図が空に戻ったらバナーを再表示（従来は reload まで hidden のままだった対称漏れ）。

**検証**: preview (SW unregister + cache 全削除で stale 回避、`markSyncSettled.toString()` で新コードロード確認) で 3 点 — ① ゲスト空状態でバナー表示 (A-6 維持) / ② settle 済み + データ投入 + 再 settle でバナー消灯 (バグ再現シーケンス、旧コードでは no-op で残留) / ③ purge + 再評価でバナー復帰 (ログアウト相当)。console エラーなし、npm check 28/28。

**教訓**: 「一度 settle したら戻らない」フラグに表示判定を直結させると、フラグ確定後のデータ変化に UI が追従できない。ゲートは「判定を保留する」ためだけに使い、判定自体はデータ変化のたびに再評価する設計が安全。また「uid が null」は「未ログイン」と「auth 初期化前」の 2 状態を含む — 起動シーケンス中の判定は初期化完了側 (12-auth) に寄せる。

---

## 294. v447 — 記録モーダルの入力を「前回の選択」で初期化（記憶の精度 + 系統別カスケード）

**カテゴリ**: A（実装 — ユスケ要望 / 活性化強化の一環 = 記録の摩擦低減）

**背景**: ユスケ報告「記憶の精度を一度『日付のみ』でつけ始めたら、毎回まっさらの『正確な時刻まで』に戻るので結局そればかりになる」。列車・車両形式のカスケードも同様に毎回まっさら。**同じ路線を繰り返し記録する人 (通勤など) ほど、毎回同じ選択をやり直す摩擦が継続率を削る**。「前回選んだものを次回の初期値に」する。対象は記録モーダル (07 確認モーダル) のみ。

**確認 (AskUserQuestion)**: カスケードの記憶スコープを質問 → **「系統ごとに記憶」** で確定。車両形式は路線固有 (中央線の E353 を山手線に出すと不整合) なので、lineId をキーに記憶し同じ路線にのみ復元する。種別だけ全体記憶・直前選択をそのまま、は不採用。

**変更**（`js/07-record-mode.js` のみ。factory `20-trip-detail-editor.js` は `initial.date_precision` / `initial.segments[].train_*` を既にサポートしており無改修）:
- **localStorage 2 キー追加**: `norireco.prefs.lastDatePrecision` (単一値) / `norireco.prefs.lastSegTrainByLine` (`{ [lineId]: {train_category, train_id, train_name, car_model} }`)。get/set ヘルパーは精度を 5 値ホワイトリストで検証、JSON は壊れていたら `{}` にフォールバック。
- **復元 (`openRecConfirm`)**: ① `date_precision: 'minute'` 固定 → `getLastDatePrecision()`。② `initialSegments` の train_* 全 null → `loadSegTrainMemory()[lineId]` でプリフィル。factory の chip restore (`selectChip`) がそのまま表示するので restore 機構は既存 (= 旅程編集で保存済 trip を開くのと同一経路) を再利用。
- **保存 (`saveMultiSegmentTrip`)**: ① 手動記録 (非 GPS) 分岐で `saveLastDatePrecision(datePrecision)`。② 列車マニアトグル ON のときだけ `tripSegments` を lineId キーで記憶に書き戻し。**トグル OFF (train fields 全 null) のときは既存記憶を上書きしない** (セクションを開かなかっただけで記憶が消える誤消去を防止)。GPS 記録は精度 UI が無い (timeRow=false) ので精度記憶の対象外。

**検証**: `npm run check` 28/28。preview (別オリジン + SW unregister/caches purge — [[feedback_preview_sw_cache_staleness]]) で `NORIRECO.record` を実データ (山手線) で組み `openRecConfirm()` を駆動して E2E 3 段:
- A 精度復元: localStorage='day' → 精度 select が `day`「📅 日付のみ覚えてる」、日付行表示・時刻行非表示。
- B カスケード復元 (系統別): 山手線に `local`+車両「E235系テスト」を記憶 → 種別=local・SL 車両 custom に値復元・ピッカー表示。
- C 保存→記憶: 精度を `month`・車両を `SAVED-CAR-X` に変更 → `confirmAndSaveRecord` (ゲスト=localStorage のみ) → `lastDatePrecision='month'` / 記憶の山手線が `SAVED-CAR-X` に更新。コンソールエラー無し。

**残課題** (別タスク): 一括記録 (21 per-seg-rows) への同種記憶の横展開はスコープ外 (ユスケ要望は記録モーダル限定)。必要なら追って検討。

---

## 293. v446 — 旅程編集モーダルを `.content` 外へ移設（v445 ① の完全修正）

**カテゴリ**: A（バグ修正 — ユスケ実機フィードバック）

**背景**: v445 ①（編集を開く前に路線詳細を閉じる + `z-index:9999`）をデプロイ後、ユスケ実機確認で「✏️編集 を押すと**編集モーダルがマイページ側に出る**」と判明。「何も起きない」は解消したが、地図の駅アクションシート／路線詳細から押したのに編集フォームがマイページ pane に紐づいて表示される（地図の上に被さらない）。

**原因**: `#trip-edit-modal` が `.content`（`position:fixed; top:92px` = 入れ子 fixed の基準 + `.pane` 切替で表示される領域）の**内側**にあったため、`position:fixed; inset:0` でも基準が viewport でなく `.content` になり、タブ（pane）の文脈に縛られて「マイページ側に出る」挙動になっていた。v445 の z-index は最前面化はできても**配置基準の問題は解けない**。

**修正**: v433 が `#bulk-record-sheet` で採った対処と同じく、`#trip-edit-modal` ブロックを `.content` の外（body 直下・`bulk-record-sheet`/`station-action-modal` と同階層）へ移動。これで viewport 基準の全画面オーバーレイになり、マイページ／地図のどのタブから開いても同じ被さり方で表示される。`z-index:9999` は body レベルで `station-action-modal`（z200, DOM 後方）等の上に出すために維持。div バランス 177/177・内部コンテナ 7 種健在・`npm run check 28/28` 確認。

**教訓**: `.memo-modal`（全画面オーバーレイ意図）は **`.content` の中に置かない**。`.content` は `position:fixed` で入れ子 fixed の基準になり pane 文脈に縛られる。オーバーレイは body 直下に置く（v433 §279 の再確認）。残る `#mp-line-detail-modal`/`#restore-modal` は今回の導線では実害が出ていないため据置（z-index は付与済）。

---

## 292. v445 — 記録の 2 バグ修正（旅程編集モーダルが路線詳細経由で開かない / 青梅線・阪和線が二重表示）

**カテゴリ**: A（バグ修正 — ユスケ実機報告）

**背景**: ユスケから記録まわりで 2 件の不具合報告。① 「地図 → 路線詳細モーダル → 旅程の ✏️ 編集」を押しても**何も起きない**。② 「青梅線の記録時に青梅線が 2 路線出る」。

### ① 旅程編集モーダルがモーダル二段重ねで背面に出る

**原因**: `#mp-line-detail-modal`（路線詳細）と `#trip-edit-modal`（旅程編集）はどちらも `.memo-modal`（`position:fixed` + `backdrop-filter` + `z-index:200`）で `.content`（`position:fixed` = 入れ子 fixed の基準）内にある。路線詳細を開いたまま編集を開くと **memo-modal を二段重ね**することになり、モバイル Safari の `backdrop-filter` + 入れ子 fixed のスタッキング不具合で編集モーダルが路線詳細の**背面**に回り、画面が変わらず「押しても何も起きない」状態になっていた。`rec-confirm`/`char`/`end-station` だけ `z-index:9999` の最前面化を持ち、`trip-edit`/`line-detail`/`restore` はその穴に該当（z-index override 無し）。マイページ旅程タブ経由だと地図ペインが `display:none` で単一モーダルのため発症しないが、路線詳細経由は地図タブ上の二段重ねで発症。

**修正**:
- `js/13b-trips.js` `openTripEditModal` 冒頭で `#mp-line-detail-modal` を閉じ、モーダルを常に 1 枚に保つ（二段重ねの根本回避）。`saveTripEdit` は末尾で mypage 旅程セクションを再描画するだけで line-detail に依存しないため安全。
- `noritetsu-map.html` CSS で `#trip-edit-modal`/`#restore-modal` を `z-index:9999`、`#mp-line-detail-modal` を `z-index:9990`（編集を確実に詳細の上へ）に最前面化 + `.open{display:flex !important}`。rec-confirm 等と同じ最前面グループに揃えた防御。

**教訓**: `.memo-modal` を別の `.memo-modal` の上に重ねない（特に PWA/モバイルで `backdrop-filter` 入れ子 fixed はスタッキングが崩れる）。重ねる導線を作るときは下のモーダルを閉じる。

### ② 青梅線・阪和線が記録時に二重表示

**原因**: v334（CHANGELOG_PHASE3.8-vehicles §266）で `through_lines` の broken ref を解消するため `jr_ome_line`（青梅線）/ `jr_yamatoji_line`（大和路線）/ `jr_hanwa_line`（阪和線）を手動キュレーション系統として新設したが、**流用元の自動生成エントリ `auto_青梅線_東日本旅客鉄道` / `auto_阪和線_西日本旅客鉄道` を削除し忘れていた**（changelog にも「auto_* を駅順データとして流用」とだけ記載・削除記述なし）。記録時の路線候補は `SERVICE_LINES` 由来（`07-record-mode.getCommonServiceLines`、builder に dedup 無し）なので同名 2 件が両方候補に出ていた。大和路線は auto 側が「関西本線」名（全線・名古屋〜）で別物のため重複には出ない。

**修正（データのみ・JS 不変）**:
- `service_lines_master.json`: 重複 auto 2 件を削除（**642 → 640 系統**）。阪和線支線 `auto_阪和線_西日本旅客鉄道_b1`（羽衣支線・鳳/東羽衣）は別系統なので残し、`parent_id` を `jr_hanwa_line` に付替え。
- `merged_stations.json`: 各駅の所属路線 `lines[]` を canonical へ移行（青梅線 25 駅 → `jr_ome_line`、阪和線 35 駅 → `jr_hanwa_line`、支線 `_b1` の 2 件は閉じ引用符で区別され不変）。`ms.colors` は v244 以降未参照（色は `SERVICE_LINES.color` 動的取得）なので据置。
- **既存 trip の互換**: 旧 `auto_青梅線…` で記録済みの旅程も、`04b-ride-record.js` の slRiddenSt 構築が **resolve 経路 fallback**（N02 路線 id 経由で SL を推定）を持つため `jr_ome_line` に解決され、**地図塗りは維持**される（コード調査で確認）。`alias` フィールドはコード未参照のため未使用。

**検証**: `node` で JSON 妥当性 + 残存参照 0（`_b1` 除く）+ 青梅駅 `lines=["jr_ome_line"]` を確認。`npm run check` 28/28。`js-syntax-guard` で 13b-trips.js / HTML を clean 確認。実機確認はユスケに依頼（preview にブラウザ無し・モバイル backdrop-filter 挙動 + DB 要のため）。

**残課題**: 同種の auto/curated 重複は名前一致では他に無し（scan 済）。大和路線/関西本線の併存は意図的（別 official_line）。手動記録 07 からの編集導線（rec-confirm 内）も同じ最前面グループだが二段重ねの可能性は別途要確認。

---

## 291. v444 — 一括記録の達成演出（活性化強化 — 初回の塗れた感動 → シェア導線）

**カテゴリ**: A（実装 — 活性化強化 / ユスケ選択）

**背景**: 「宣伝広告・使う人をどう増やすか」の議論から。ニッチ無料アプリで有料広告は CAC が見合わず、5大原則④「早期βで学習 → 本リリースで拡散」に従えば **拡散の前にバケツの穴 (活性化/継続) を塞ぐ** のが順番。ファネルを実機で診断すると、完乗率・完乗達成日・連続日数 (streak) は `computeCompletionStats` / `buildPersonalRecords` で **計算済みなのに📊統計タブ深部の受け身の数字止まり** で、活性化を駆動する能動的な瞬間になっていなかった。ユスケ選択で「③ 初回の塗れた感動」を厚くする = 一括記録の保存直後に「全国○○駅 制覇！」のリザルトを祝い、そのままシェア (原則④) へ流す機能を実装。

**設計判断**:
- **新モジュール `js/22-celebrate.js` に切り出し**: 21-bulk-record.js が ~990 行で「1000 行で分割」規約に接触していたため、演出 (~190 行) は別ファイルへ。app モジュールを **import せず `window.NORIRECO.*` ブリッジのみ参照** (循環 import 回避 — [[feedback_es_modules_circular_import]])。完乗率は 13a の `computeCompletionStats`、シェアは 14 の `openShareModal` を再利用。DOM/CSS は `ensureModal` 流儀で自前 1 度だけ注入、オーバーレイは body 直下 + `position:fixed;inset:0` (v433 の「.content 内 fixed」罠回避)。
- **トリガは一括保存のみ** (`saveBulkDrafts` 末尾、`savedCount>0`)。手動記録 07 には付けず、オンボーディング経路 (空マップバナー → 一括記録) に限定して特別感を維持。
- **before/after 差分**: 保存前に完乗率をスナップショット → 保存後に再計算し「今回 +N駅 / +M系統」「新規完乗系統」を `slSet` 比較で算出。初回 (before.ridden=0) は 🎉「はじめてマップが塗れました！」、完乗達成ありは 🏆 と文言/絵文字を分岐。

**検証で発見した bug と修正 (重要)**: preview 実機で `_mypageCache: n/a` を実測 → **`_mypageCache` はマイページ描画時 (13-mypage-common.js:356/437/500) にしか populate されず、`syncFromSupabase` も set しない**。つまり今まさに最適化したいオンボーディング経路 (マイページ未表示) では `_mypageCache` が null のまま → 演出もシェア画像も `[]` 集計で **0%/空マップ** になる致命的な穴だった (シェア画像も同じ源なので latent 既存バグ)。修正: `saveBulkDrafts` で `_mypageCache` が array でなければ **localStorage `norireco_trips` から hydrate** (ゲストは `user_id` 無しのみ = v419 と対称、`_readStoredTrips` ヘルパー)。before スナップショットも同じ source 関数に統一。これで演出 + シェア画像が空集計にならず、`_mypageCache` がこの経路で live になる。**教訓**: 新規 UI を既存 state に乗せる前に「その state がこの導線で初期化済か」を実機で確認する ([[feedback_verify_with_primary_data]] と整合)。

**0% deflation 修正**: 当初ヒーロー数字を完乗率% にしたが、初期ユーザーは 15/9,030 駅 = 0.17% → 四捨五入で **「0%」が「おめでとう」直後に出て萎える**。ヒーローを **「乗った駅数」(必ず非ゼロで達成感)** に変更し、完乗率は補助行で 1% 未満のとき小数 1 桁 (「0.2%」) 表示にして非ゼロを保つ。

**検証**:
- `npm run check` 28/28。この際 **check の FILES 配列に 20/21 が抜けていた既存の検証漏れも是正** (20-trip-detail-editor / 21-bulk-record / 22-celebrate を追加、HTML/sw.js と 3 点更新)。
- preview (別オリジン + SW unregister/caches purge でキャッシュ stale 回避 — [[feedback_preview_sw_cache_staleness]]) で **実際の一括記録 UI を駆動して E2E**: ゲスト・`_mypageCache` null の状態で篠ノ井線 (15 駅) をチェック → 保存 → 「はじめて 🎉 / 15駅 / 完駅率 0.2% / +15駅 +1系統 1件記録 / 🏆 完乗達成: 篠ノ井線 / ⚠️端末内のみ」を確認。`_mypageCache` が null→1 に hydrate されたことも確認。シェアCTA クリック → 演出が閉じ → 1200×630 OGP キャンバス生成 (pixel サンプリングで 7 色 = ブランド赤/ネイビー/シルバー文字 = 中身入りを確認)。
- スクショは演出を閉じても**地図ページ全体が環境でタイムアウト** (地図タイル + heavy render の環境制約、演出が原因でないことを overlay 閉でも再現して確認) のため、DOM 状態 + canvas pixel で代替検証。

**残課題** (別タスク): 手動記録 (07 saveMultiSegmentTrip) で完乗到達時の演出 / 「戻る理由」= ネクスト目標「あと○駅で△△線完乗」の常時提示 (活性化ファネル④ の本丸、本タスクの議論で次の候補として整理済) / ゲスト記録の reload 喪失対策 (⑤)。

## 290. v443 — シェア画像に期間チップ（この期間 / 今年 / 全期間 / 任意期間）

**カテゴリ**: A（実装 — ユスケ要望）

**背景**: 完乗率マップのシェア画像 (`openShareModal`) は常に「全 RIDDEN_SEGS = 地図の現在フィルタ済み」で固定生成だった。「シェアを押した瞬間に期間を選びたい (今年だけ / 全期間 / 任意期間)、デフォルトは地図で今絞ってる期間に合わせる」(ユスケ)。

**確認 (AskUserQuestion)**: ①「この旅」チップ = **現在地図で絞っている期間** (季節/年/月指定をそのまま、デフォルト選択)。②期間変更は**シェア画像だけ** (地図・ヘッダ・グローバル `_tripDateFilter` は不変 = 一時的)。

**変更**（4 ファイル。循環 import 回避で window ブリッジに統一）:
- **`05-supabase-data.js`**: `filterTripsByDate(trips, override)` に override 引数追加 (グローバル `_tripDateFilter` を汚さず一時期間でフィルタ)。`filterTripsByDate` / `tripsToSegs` / `seasonFilterLabel` を window 公開。
- **`13a-stats.js`**: 完乗率集計を `buildCompletionCards` 内の closure `collect()` から module-level `computeCompletionStats(trips)` に切り出し + `NORIRECO.mypage.computeCompletionStats` 公開。戻り値は `drawStatsPanel`/`openShareModal` 用 (pct/ridden/totalUnique/lines/complete/totalLines/distanceKm) と `buildCompletionCards`/`buildDetailContent` 用 (uniquePct/uniqueRidden/lineUnitXxx/slSet) を両方含む。`buildCompletionCards` はこれを使うよう refactor (重複排除)。
- **`14-share-ogp.js`**: シェアモーダルに期間チップ row (この期間[地図準拠デフォルト]/今年/全期間/任意期間) + 日付 from/to 入力。チップ選択で `_mypageCache` の trips を `_sharePeriod` でフィルタ → `computeCompletionStats` で完乗率再計算 + `tripsToSegs` で地図ポリラインも期間連動 → `generateOgpCanvas(stats, segs)` で再生成。active チップは `_shareChipKey` で判定 (「この期間」と「全期間」が同 filter でも選んだ方だけ光る)。個別 trip シェア (`openTripShareModal`) では期間 row を隠す (1 旅程固定で期間無関係)。
- **`noritetsu-map.html`**: 期間チップ CSS (`.share-period-chip` / `.share-period-date` / `.share-period-apply`)。

**設計判断**:
- 期間変更スコープ「シェア画像だけ vs 地図連動」→ **シェア画像だけ** (ユスケ確定)。`filterTripsByDate` に override 引数を足してグローバル `_tripDateFilter` は触らない。「ちょっと今年分だけシェアしたい」ときに地図表示まで変わるのは過剰。
- 完乗率の再計算を「シェア専用の別ロジック」でなく既存 `collect` を `computeCompletionStats(trips)` に切り出して共有。完乗率カードとシェアで同じ計算 = 数字が必ず一致。
- 繋ぎは window ブリッジ (13e-admin が html2canvas を window 経由で呼ぶ定石)。14 は誰からも import されない「葉」だが、循環 import 事故 (v331) を構造的に避けるため import でなく window 経由に統一。

**検証**: preview 別オリジン (8043、SW キャッシュ stale 回避) で — window ブリッジ全 function、期間チップで完乗率 (今年=1系統30駅 / 全期間=2系統31駅) と地図 segs (1→2) が連動、active チップは選んだ 1 つだけ (key ベース)、任意期間で日付入力欄表示、個別 trip シェアで期間 row 非表示、console error 0。`npm run check` OK 25/25。

**残課題**: なし。

---

## 289. v442 — ゲストモードでも活動量メトリクスを表示（renderStats を _mypageCache ベース化）

**カテゴリ**: A（実装 — ユスケ要望）

**背景**: v441 で完乗率カードを全記録ベースに統一したが、📊統計サブタブ本体（`renderStats` の活動量メトリクス・月別グラフ・直近旅程・列車制覇）は v420 以降ゲストモードでは「ログイン後に表示されます」エンプティのままだった。理由は `renderStats` が Supabase を anon key で直 fetch しており、未ログイン時は `user_id` フィルタ無しで全ユーザーの trip を引いてしまう RLS 緩和の名残があったため（v420 でゲストガードを入れて封じていた）。ユスケ「②の活動量メトリクスもゲストの localStorage trip ベースで表示したい」。

**変更**（`js/09-tabs-stats.js` + `js/13a-stats.js`。Supabase/Worker 不触）:
- `renderStats` の Supabase 直 fetch（`fetch(norireco_trips?...)` + `.then`/`.catch`）を撤去し、`renderMypage` がセット済みの `_mypageCache`（ログイン = Supabase から取得した自分の trip / ゲスト = localStorage の user_id 無し trip）を使う同期処理に置換。上部の完乗率カードと同じデータ源になり整合。
- 不要になった `currentUserId` / `authBearerToken` の import を 09-tabs-stats.js から削除（`SUPABASE_URL`/`KEY` 参照も消滅）。
- 13a-stats.js `renderMpStatsSection` の v420 ゲストガード（エンプティ + CTA）を撤去し、ゲストでも `renderStats()` を呼ぶ。`currentUserId` の import も削除（他に使用なし）。

**設計判断**: `renderStats` を「ゲスト専用の別関数」にするのではなく、データ源を `_mypageCache` に一本化。`renderMypage` がログイン/ゲストの分岐で既に user_id 込みの正しい trip を `_mypageCache` にセット済みなので、`renderStats` はソースを意識せず描画でき、(a) anon key 全件 fetch の RLS リスクが消え、(b) 重複 fetch も削減、(c) 完乗率カードと統計が同じデータで必ず一致する。

**検証**: ゲストモード（currentUid:null）+ localStorage trip 1 件で renderMypage → renderMpStatsSection 実行 → 活動量メトリクス 4 枚（総旅程数 1 回 / 延べ乗車駅数 3 駅 / 総乗換回数 0 回 / 総乗車時間 0 時間 30 分）+ 月別グラフ + 直近旅程 + 列車制覇が表示、「ログイン後に表示」エンプティ・「取得失敗」catch 文言とも消滅、console error 0。`npm run check` OK 25/25。

**失敗教訓**: 検証中「読み込み中…」「取得失敗 localStorageを使用中」が出て実装ミスを疑ったが、原因は preview の SW/HTTP キャッシュが旧 JS を保持していたこと（実ファイルは `fetch(..., {cache:'no-store'})` で新版を確認済みだった）。**同一オリジンで SW unregister してもリロード時に再登録 + Cache-First で旧 js が戻るため、別ポート（別オリジン = SW スコープ/キャッシュ別）で立て直すのが確実**。

**残課題**: なし。

---

## 288. v441 — マイページ統計を GPS+手動の全記録ベースに統一（GPS 特別扱い撤去）

**カテゴリ**: A（実装 / 方針整合 — GPS 位置づけ変更 v334〜v363 の積み残し回収）

**背景**: GPS 記録の位置づけは v334〜v363 で「世間への公式認定」→「記録の手間を省くだけの手段」に転換し、`11-fraud-detection.js` も削除済み（[`CHANGELOG_PHASE3.8-vehicles.md`](CHANGELOG_PHASE3.8-vehicles.md)）。にもかかわらずマイページ統計には GPS を主役・特別扱いする UI が残っていた:
- 完乗率サマリが「📍 GPS 完駅率（verified のみ）」「📝 全記録 完駅率」の 2 枚並びで、GPS 側が先・緑グラデで主役風。
- 詳細統計のうち ③運営会社別 / ④地域別 / ⑤よく乗る路線 / ⑥よく訪れる駅 / ⑩都道府県別 / ⑮未踏領域 が `sv = collect(true)`（GPS 記録のみ）ベースで、タイトルも「(GPS 記録)」「verified のみ」表記。
- ⑦「認証ステータス分布」というカード名が公式認定を匂わせる（中身のコメントは v345 で「対等な記録」に更新済だがカード名は旧称のまま）。

方針（GPS = 手間省略）と UI がズレていた。ユスケ「統計も GPS+手動記録にもとづくように」。

**変更**（`js/13a-stats.js` + `noritetsu-map.html` の CSS のみ。Supabase/Worker 不触）:
- `collect(verifiedOnly)` から `verifiedOnly` 引数と `if (verifiedOnly && !trip.verified) continue;` を撤去 → `collect()` 一本化。GPS も手動も対等に集計する。
- 完乗率サマリを 2 枚 → **1 枚**に統合（`mp-stat-grid solo` + `mp-scard` 単独、見出し「🚃 完駅率」/ サブ「GPS・手動を含むすべての乗車記録」）。CSS に `.mp-stat-grid.solo{grid-template-columns:1fr;}` 追加。旧 `sv` 系の引数・カードは全廃。
- `buildDetailContent(pane, sv, all, ...)` → `(pane, all, ...)`。①集計方式・②走行距離の GPS/全記録 2 段表示を全記録 1 段に。③④⑤⑥⑩⑮ を `sv` → `all` に切替、タイトルの「(GPS 記録)」「verified のみ」表記を全削除。
- ⑦「認証ステータス分布」→「記録方法の内訳」にリネーム。内訳（📍 GPS（自動）/ 📝 手動 の件数・割合バー）は手間削減度として有用なため残置（説明文に「どちらで記録しても完駅率は同じように集計される」を明記）。

**設計判断**:
- 完乗率サマリ「1 枚統合 vs 全記録主役+GPS補足の 2 枚 vs 文言だけ調整」→ **1 枚統合**を採用（ユスケ確定）。GPS が認定でなくなった以上「verified だけの完駅率」を別枠で見せる意味が消え、2 枚並置はむしろ「GPS の方が正しい記録」という誤読を生む。
- 認証分布カード「リネーム維持 vs カード撤去」→ **リネーム維持**（ユスケ確定）。GPS/手動の比率は「どれだけ手間を省けたか」の指標として残す価値があり、「認証」という認定臭の語だけを排除。

**検証**: preview eval で `buildCompletionCards` にダミー trip（GPS 記録 1 + 手動 1）を渡し DOM 検査 — サマリ 1 枚（verified/all カード消滅）、GPS 3 駅 + 手動 2 駅 = 5 駅が合算（GPS 特別扱い撤去の証拠）、詳細タイトルから「(GPS 記録)」全削除、「記録方法の内訳」にリネーム済を確認。北陸新幹線 8 駅完乗 trip で「完乗 1」表示も確認。`npm run check` OK 25/25、console error/warn 0。

**残課題**: なし（統計の GPS 特別扱いは全廃。OGP シェア画像・`renderStats` 活動量メトリクスは元々全記録ベースで対象外）。

---

## 287. v440 — 計測表示とスクショをユーザー向けから撤去し admin 限定に集約

**カテゴリ**: A（実装 / スコープ修正 — ユスケ判断 2026-05-31）

**背景**: v436/v437 で マイページ🔗シェアカードに計測 (👁view/🚃click/✨signup) を出し、v439 で マイページ🔗シェア一覧に「📷 スクショ保存」を付けたが、**「お客さんから見えるページにはビュー/クリック/登録数も一覧のスクショも要らない、管理者だけ見れれば十分」(ユスケ)**。計測の表示面とスクショは admin に集約する。

**変更 (ユーザー向けの表示のみ撤去・計測ロジックと admin は不変)**:
- **`js/14-share-ogp.js`**: `shareCardHtml` の計測行 (👁/🚃/✨ = `.mp-share-stats`) と view/click/signup 集計 const を削除。`renderMpSharesSection` の「📷 一覧をスクショ保存」ボタン + `#mp-shares-capture` ラッパを撤去 (素の tip + カードに戻す)。`captureMyShares` 関数 + window bridge 登録を削除。**汎用ヘルパー `captureElementToPng` / `loadHtml2Canvas` は admin (13e) が使うので残す** (`window.NORIRECO.share.captureElementToPng` 公開維持)。
- **`noritetsu-map.html`**: 未使用化した `.mp-share-stats` CSS を削除。
- **`sw.js`**: CACHE_VERSION v439 → v440。

**不変 (= 残すもの)**: 計測のカウント自体 (functions/share の view/click + RPC bump_share_metric / record_share_referral)、DB 列、**admin シェア計測 横断ビュー (v438) と admin の「📷 スクショ保存」(v439)**。つまりデータは引き続き貯まり、運営は admin タブで全シェアの漏斗 + スクショを見られる。ユーザーには見せないだけ。

**デプロイ**: client + CSS のみ、main push で反映 (SQL/Function なし)。

**検証**: `npm run check` 25/25。`captureMyShares` / `mp-share-stats` / `mp-shares-capture` の残参照ゼロを grep 確認。admin 側 (captureMetrics → captureElementToPng) は無傷。

## 286. v439 — シェア計測画面を 1 枚にスクショ保存するボタン (html2canvas)

**カテゴリ**: A（実装 / 🟢 シェア計測の UX — ユスケ要望 2026-05-31）

**背景**: v438 の admin シェア計測ビュー (と マイページ🔗シェア一覧) は縦に伸びるリストで、通常のスクショだとビューポート分しか撮れず全体が 1 枚に収まらない。「スクショで一枚におさまるってとれるボタンが欲しい」(ユスケ)。→ **見切れる部分も含めて要素まるごとを 1 枚の PNG にする**ボタンを両画面に追加。

**設計判断 (ユスケ確定)**: ① 対象 = **両方** (admin シェア計測 + マイページ🔗シェア一覧) ② 方式 = **html2canvas で見たまま** (専用 Canvas デザインではなく DOM をそのまま画像化、縦長も一括・実装軽め) ③ 出力 = **ダウンロード**。
- **html2canvas は使うときだけ CDN から lazy load** (cdnjs、Leaflet と同 CDN)。初期ロードを太らせない / 任意機能なので offline は許容。STATIC_ASSETS には入れない (SW の CDN cache-first が機会的にキャッシュ)。
- 共通ヘルパーは 14-share-ogp.js (画像/DL 処理の集約先) に置き `window.NORIRECO.share` 経由で 13e-admin からも使う (import 依存を増やさず既存の window-bridge 流儀に合わせる)。

**実装**:
- **`js/14-share-ogp.js`**: `loadHtml2Canvas()` (CDN script を 1 回だけ注入、失敗時は再試行可に promise リセット) + `captureElementToPng(el, filename, btn)` (背景は body 背景を明示=透明黒落ち回避、scale 2、useCORS、toBlob → `<a download>`、ボタンに ⏳/✅ 進捗)。`captureMyShares` + `renderMpSharesSection` にツールバー「📷 一覧をスクショ保存」追加 + 一覧本体を `#mp-shares-capture` でラップ (ツールバー自身は撮らない)。`window.NORIRECO.share` に `captureElementToPng`/`captureMyShares` 公開。
- **`js/13e-admin.js`**: シェア計測ビューのツールバーに「📷 スクショ保存」追加 + サマリ+ランキングを `#admin-share-capture` でラップ。`captureMetrics(btn)` を `NORIRECO.admin` に追加 (window 経由で 14 のヘルパーを呼ぶ)。
- **`sw.js`**: CACHE_VERSION v438 → v439。

**既知の注意点**: マイページ一覧のサムネ (`cdn.norireco.app` の R2 画像) は CORS ヘッダ次第で html2canvas に写らない可能性 (useCORS で試行、ダメなら当該サムネだけ空白・他は正常)。admin 計測ビューは画像なし=影響なし。長大リストは scale 2 で canvas 上限に当たりうる (現状シェア数では問題なし)。

**デプロイ**: client のみ (SQL/Function なし)、main push で反映。

**検証**: `npm run check` 25/25。CDN lazy load → html2canvas 描画 → toBlob の核心を preview 実ブラウザ eval で確認 (script `loaded`・canvas 480×200・PNG 17,281 bytes 生成)。ボタン実押下 (#mp-shares-capture/#admin-share-capture 対象・ダウンロード) は ログイン + データが要るため本番確認。

## 285. v438 — admin シェア計測 横断ビュー (運営が全シェアの漏斗を俯瞰)

**カテゴリ**: A（実装 / 🟢 シェア計測の運営俯瞰 — v436/v437 で揃えた漏斗の集計面）

**背景**: v436 (view/click) + v437 (signup attribution) で計測が揃い、各シェアの反響は所有者本人がマイページ🔗カードで見られる。だが運営 (admin) が**全シェアを横断**して「どのシェアが view→click→signup を driving しているか」を俯瞰する面が無かった。admin タブ (13e-admin.js, v426) に追加。

**設計判断**:
- **client 直 SELECT (option A) ではなく admin RPC (option B) を採用**。理由: ① admin タブは全機能が RPC 経由 (`callRpc` → SECURITY DEFINER + `is_admin()` ゲート) で統一されており一貫する ② **所有者 email は `auth.users` を join せねば出せず、これは SECURITY DEFINER 関数でしか引けない** (REST 非公開) ③ 関数内 `is_admin()` ゲートで運営限定を強制できる。norireco_shares 自体は公開 SELECT だが、email + 強い gating のため RPC 化。
- 列追加・新規テーブルなし (view_count/click_count=v436、signup_count=v437 で既存)。**読み取り専用 RPC 1 本だけ**。

**実装**:
- **`supabase/migrations/v438_admin_share_metrics.sql`** (新規・**要 Run**): RPC `admin_list_share_metrics()` (SECURITY DEFINER + 冒頭 `IF NOT is_admin() THEN RAISE EXCEPTION 'admin only'` + EXECUTE public REVOKE → authenticated GRANT)。`norireco_shares` ⨝ `auth.users` で所有者 email 付き、engagement 降順 (signup→click→view→created_at)、LIMIT 500。既存 admin 関数ファミリ (admin_list_profiles 他) と同形。
- **`js/13e-admin.js`**: 上部に **🚫 BAN管理 / 📊 シェア計測** のビュー切替 (`A.view` + `showView()`)。renderShell をビュー nav + 本体分岐にリファクタ (既存 BAN UI は `banBodyHtml()` に抽出、無改変)。`shareBodyHtml()` = サマリ (Σview→click→signup + CTR/登録率) + シェア別ランキング、`shareRowHtml()` = title/kind/取消済バッジ + 👁🚃(CTR%)✨ + 所有者 email/日時/id。`loadShareMetrics()` (callRpc) は初回切替時のみ自動ロード + 🔄 再読み込み。`renderMpAdminSection` を view 別ロードに対応。
- **`sw.js`**: CACHE_VERSION v437 → v438。

**デプロイ / 順序**: `functions/` 不変。`v438_admin_share_metrics.sql` を **ユスケが Run → Applied 行追記**。未適用の間は RPC 404 → alert + 空表示 (BAN 管理ビューは影響なし)。

**検証**: `npm run check` 25/25。漏斗サマリの算術 (CTR=click/view・登録率=signup/click・合計・ゼロ除算ガード・行別 CTR・桁区切り) を preview 実ブラウザ eval で確認 (例: 合計 14/4/1 → CTR 28.6%・登録率 25.0%、pct(5,0)='0.0')。admin タブでの実表示は **admin 権限 + v438 RPC** が要るため本番確認 (v426 教訓「admin 機能は DB 状態が要り preview で完結しない」)。

## 284. v437 — シェア経由の登録転換 attribution (Phase 2 / 「シェアが分水嶺」本命指標)

**カテゴリ**: A（実装 / 🔥 シェア機能 Phase 2 — v436 で送りにした登録転換 attribution）

**背景**: v436 で /share の view/click を計測したが、漏斗の最終段=「シェア経由で**新規登録**したか」が未計測だった。5大原則④「シェアが分水嶺」の本命指標。v436 で CTA が付けていた `?ref=s_<id>` を回収する。

**設計の肝 (auth flow の制約から導出)**:
- **`?ref` は OAuth/Magic Link のリダイレクトで失われる** (`redirectTo` = クリーン URL)。→ **ログイン前の起動時に localStorage へ退避**しておく必要がある。`captureShareReferral` を `initAuth` の最初 (SDK チェックより前) に置き、確実に拾う。
- **`norireco_profiles` 行は新規ユーザーには無い** (v423 で BAN 時のみ作成)。→ 「profile 行の有無」では新規登録を判定できない。代わりに **`user.created_at` が直近 (24h 以内) か**で新規アカウントを判定し、既存ユーザーがシェアを踏んだだけのケースを attribution から除外する。
- **二重計上の最終保証 = `norireco_share_referrals` の PK (user_id)**。1 ユーザー 1 行。RPC は `ON CONFLICT DO NOTHING` で冪等、**実 INSERT できたときだけ** `shares.signup_count` を +1 (v436 の view/click と同じ主従: 真実の源=referrals テーブル / 派生キャッシュ=signup_count)。

**実装**:
- **`supabase/migrations/v437_share_referral.sql`** (新規・**要 Run**): `norireco_share_referrals` (user_id PK + share_id + created_at、RLS 有効 + policy 無し = RPC だけが触れる、anon/authenticated REVOKE) + `norireco_shares.signup_count` 列 + RPC `record_share_referral(p_share_id)` (SECURITY DEFINER、自己シェア/revoked 除外、once-per-user INSERT → 成功時のみ signup_count +1)。EXECUTE は **authenticated のみ** (anon に出さない = attribution は本人 uid 必須)。
- **`js/12-auth.js`**: `captureShareReferral()` (起動時 `?ref=s_<id>` → localStorage `norireco_share_ref` 退避 + URL から ref 除去) を `initAuth` 冒頭に。`maybeRecordShareReferral(user)` を初回ログイン確定ブロック (fetchMyProfile の隣) で呼ぶ。新規判定 (created_at 直近) + ref TTL 7 日 + 記録成功/既存判明で ref クリア・ネットワーク失敗時のみ残して次回再試行。RPC は REST で `Authorization: Bearer <access_token>` (auth.uid() が本人になる)。
- **`js/14-share-ogp.js`**: マイページ🔗シェアカードの計測行に `✨ N 登録` を追加 (`select=*` なので fetch 改修不要)。
- **`sw.js`**: CACHE_VERSION v436 → v437。

**デプロイ / 順序**: `functions/` 不変 (今回はクライアント + DB のみ)。`v437_share_referral.sql` を **ユスケが Run → Applied 行追記**。未適用の間も RPC 404 を握りつぶし ref を残すので破壊なし (適用後の次回ログインで記録)。

**残課題 / 補足**: created_at 24h ゲートは「保守的に新規のみ拾う」設計 (取りこぼし < 過大計上)。集計の admin タブ横断ビューは将来候補。これで **シェア漏斗 = view → click → signup** が一通り揃った。

**検証**: `npm run check` 25/25。`captureShareReferral` の中核 (regex 受理/拒否・`s_` 剥がし・URL から ref 除去で他 query 温存・localStorage 往復) を preview 実ブラウザ eval で確認。記録半分 (`maybeRecordShareReferral` + signup_count 表示) は認証 + 新規アカウント + v437 SQL が要るため本番 E2E で確認 (v436 同様 preview 不可)。

## 283. v436 — シェア受け側 /share の強化 (③) + view/click 計測 (④)

**カテゴリ**: A（実装 / 🔥 シェア機能 — MVP 以降の「残り」の定義から着手）

**背景**: 🔥「シェア機能 — MVP 以降の残り」の TODO はぶら下がりサブ項目 (MVP S-1〜S-3 / 磨き込み v415〜v417 / 取り消し UI v416 / 垢BAN 連携 v423) が**全て ✅ で中身が空**、チェックボックスだけ残っていた。5大原則④「早期βで学習・本リリースで拡散・**シェアが分水嶺**」に照らし、「残り」を**拡散バリューチェーン (①動機 → ②魅力度 → ③受け手の転換 → ④計測)** のどこを厚くするかで再定義。ユスケ判断 (2026-05-31) で **③受け側ページ強化 + ④計測** を選択 (発生済みシェアの価値を最大化する側)。

**設計判断 (ユスケ確定 2026-05-31)**:
- **④計測の格納先 = Supabase (RPC + 列)**。CF Analytics ではなく、アプリ内 admin / マイページ / Supabase SQL でそのまま見られる自己完結を優先。
- **登録転換 attribution = Phase 2 送り**。今回は view/click の漏斗まで。CTA リンクに `?ref=s_<id>` を仕込んで土台だけ作る (app の auth flow 改修は次回)。
- **③ページ強化 = CTA 文脈化 + 価値訴求ブロック**。Leaflet 埋め込みではない (OGP 画像自体が trip 区間ズーム地図なので、ページの役割はコールド訪問者への価値伝達と記録への送り込み)。

**設計の肝 (anon key 制約)**: 受け側は Cloudflare Pages Function で Supabase へ **anon key** でアクセス。`norireco_shares` の UPDATE は本人限定 RLS (v413) なので Function から view_count を直接 increment **できない** → `SECURITY DEFINER` 関数 `bump_share_metric(p_id,p_kind)` を 1 本だけ作り EXECUTE を anon に許可 (指定 id の view/click を +1 するだけ、`revoked=false` ガード、auth バイパス無し)。SNS unfurl クローラも GET で /share を叩くので、view は **UA で bot 除外**して人間の閲覧に寄せる。CTA は **`/share/<id>/go` リダイレクト Function 経由**にして JS 不要でサーバー側に click を確実計測 + `?ref` 付与。

**実装**:
- **`supabase/migrations/v436_share_metrics.sql`** (新規・**要 Run**): `norireco_shares` に `view_count`/`click_count` (integer NOT NULL DEFAULT 0) + RPC `bump_share_metric` (SECURITY DEFINER + 固定 search_path + revoked ガード) + EXECUTE を public REVOKE → anon/authenticated GRANT。確認 SELECT は列 2 / 関数 1 / anon EXECUTE 1 の期待行数付き。
- **`functions/share/_metrics.js`** (新規): `_` 始まりで Pages ルーティング除外・import 専用。SUPABASE 定数 + `isLikelyBot(ua)` (bot UA 正規表現) + `bumpShareMetric(id,kind)` (RPC fire-and-forget) + `isValidShareId(id)`。`[id].js` と `[id]/go.js` で共有。
- **`functions/share/[id].js`** (編集): SUPABASE 定数を `_metrics.js` import に集約。CTA を kind で文脈化 (trip→「🚃 自分も乗車記録をはじめる」/ profile→「🚃 自分の完乗マップをつくる」) + href を `/share/<id>/go` に + 「乗レコでできること」3 項目 (🗾完乗率マップ / 🎭駅キャラ / 📍ワンタップ記録) を本文追加。row 取得後に bot 除外で `context.waitUntil(bumpShareMetric(id,'view'))`。
- **`functions/share/[id]/go.js`** (新規): id 検証 → `context.waitUntil(bumpShareMetric(id,'click'))` → `302 → norireco.app/?ref=s_<id>` (Cache-Control: no-store で CDN キャッシュ回避)。
- **`js/14-share-ogp.js`** (編集): `shareCardHtml` に `👁 N 表示 ・ 🚃 N クリック` 行を追加 (本人が自分のシェアの反響を見られる = 拡散の動機づけ)。`fetchMyShares` は `select=*` なので fetch 改修不要、旧データは `Number()||0` で 0 表示。
- **`noritetsu-map.html`**: `.mp-share-stats` CSS。
- **`sw.js`**: CACHE_VERSION v435 → v436。

**デプロイ / 順序**: `functions/` は Pages の main push で自動反映 (worker のような個別 wrangler deploy 不要)。SQL は **ユスケが Supabase Dashboard で Run → 末尾に Applied 行追記**。RPC が未適用の間も Function は握りつぶすのでページ表示・リダイレクトは正常、カウントが貯まらないだけ。

**残課題 / Phase 2**: 登録転換 attribution (`?ref=s_<id>` → localStorage 保持 → 初回登録時に記録) は app の auth flow 改修込みで次回。集計の見方は当面マイページ各カードの 👁/🚃 + Supabase SQL (将来 admin タブに横断ビュー追加も可)。anon RPC 直叩きでの水増しは早期β内部指標として許容 (将来 rate-limit / bot 除外強化)。

**検証**: `npm run check` 25/25 OK。Pages Functions 3 本は `.mjs` コピー + `node --check` で構文 OK (PowerShell stdin パイプは日本語化けで偽 FAIL を出すため、一次データはファイル直 check で取得)。**preview 不可**: `/share` Function は Vite dev (:5173) では配信されず、計測表示も DB 列追加後でないと 0 以外にならないため、本番 push + SQL Run 後の実機確認が必要。

## 282. v435 — 環状線「17/30 駅塗り」は v422 で解消済みと判明 → 偽の注意書きを撤去 (残課題 #1)

**結論 (一次データで確定)**: 一括記録の残課題 #1「環状線対応 — 山手線 17/30 駅塗り」は **既に解消済み**で、コードの機能修正は不要だった。Notion §1.3 / STATUS の「17/30」記述は A-5 (v404) 当時のもので、**v422 (slRiddenSt を id 優先 + name fallback に統一) で実質解決していた**。残っていた実害は「一括記録シートに表示される偽の注意書き」だけ。

**調査 (preview eval で実機計測)**:
- 山手線 SL は実行時 `stations.length = 30` / `circular: true`。candidateN02Ids の N02「山手線」エンティティは西側 17 駅のみ (品川→新宿→田端)、東側は東北線(9)・東海道線(7) に分散。
- 全周 draft (`東京→有楽町`, stations[0]→stations[-1]) で rebuild → **`slRiddenSt['jr_yamanote_line'].size = 30/30`・欠落ゼロ**。`riddenSt` (N02 物理線) は 山手線17+東北線8+東海道線6 だが、**これは SERVICE_LINE のポリライン描画には使われない**。
- 実 redraw パス (ゲスト保存フロー) で計測 → `drawServiceLineBase` が SL 自身の 30 駅 + `sl.circular` の wrap で描画し、**ridden 実線が全 30 駅 + 環状閉じ線をカバー** (`riddenMainPolylines:2`=run+wrap, `circularWrapDrawn:true`)。
- 大阪環状線も同機構で **19/19・欠落ゼロ**。circular SL はこの 2 本のみ。

**仕組み**: `04b-ride-record.js` の slRiddenSt 構築は SL の `stations` 配列を index 0..N-1 で線形展開 (357-370)。`08-rendering.js` の `drawServiceLineBase` は `slRiddenSt[sl.id]` の駅 id Set + `sl.circular` の wrap (594-612) で描く。`riddenSt` (N02 17駅) は SERVICE_LINE 描画経路に不使用。よって slRiddenSt が 30 になった時点 (v422) で全周が塗られていた。

**実害の修正** (`21-bulk-record.js` + `noritetsu-map.html`):
- `_renderBody` の偽の注意書き `🚧 環状線は 1 駅のみ ridden になります (A-5 で半周分割予定)` の `<div class="bulk-note">` を撤去 (ユーザーに虚偽の制約を見せていた)。
- `.bulk-note` CSS (孤立) を削除。
- `_buildDefaultDraft` / ファイル header の「環状線は同一駅 / 1 駅のみ / 半周分割予定」コメントを実態 (全周塗られる) に修正。

**教訓**: STATUS / Notion の残課題記述を鵜呑みにせず、preview eval で `slRiddenSt` / `riddenSt` / 実描画ポリラインを実測して「ドキュメントが古い・コードが正しい」を確定した (CLAUDE.md「ずれたらコードが正しい」+ 一次データ規律)。`circular` は `master.is_circular` 由来 (raw JSON の `circular` 直読みでは undefined に見える点に注意)。

**残課題 (一括記録)**: ③ 複数 segment = 設計上スキップ推奨 (1 系統 1 行モデル / 手動記録 07 で代替)。

---

## 281. v434 — 一括記録アコーディオンに写真添付 (残課題 #2)

**背景**: 一括記録の残課題のうち「アコーディオン展開に写真添付」(Notion §1.3 / A 段階外、別タスク持ち越し #2)。A-5 (v404) では `features.photos: false` で skip していた。factory (`createTripDetailEditor`) と PhotoArea は写真対応済みなので、Notion では「`saveBulkDrafts` での `uploadAndGetPhotos(tripId)` 連結を追加すれば動く軽い拡張」と見積もられていた。

**見落としていた落とし穴**: 一括記録のアコーディオンは「同時 1 行」制御で、行を閉じる/切替えるたびに `_openEditor.destroy()` → `PhotoArea.destroy()` が走り、**未アップロードの新規写真 (内部 `items[]` の `kind:'new'` blob) が消える**。draft Map に退避される editor 状態 (`getDraft()`) には写真が含まれない (getDraft は collectPhotos しない)。素直に `features.photos:true` にするだけだと、別の行を開いた瞬間に前の行の写真が失われる。

**設計**: 「保留 blob を draft に退避 → 保存時に `uploadPhoto` で個別アップロード」方式。trip_id は保存時まで未確定なので、開いている間は `getOwnerId: () => null`、実アップロードは `saveBulkDrafts` で trip_id 確定後に行う (v258 の確認モーダルと同じ順序の発想)。

**実装** (3 ファイル):
- **`18-photo-area.js`**: ① `createPhotoArea` に `initialItems` オプション追加 — `getItemsSnapshot()` の戻り値を受け、`kind:'new'` は blob から previewUrl を再生成して復元 (既存 `initialPhotos` (url のみ) より優先)。② `getItemsSnapshot()` メソッド追加 — items を破壊せず複製で返す (new は previewUrl を含めず blob のみ = 二重 revoke 回避)。`initialUrls` (削除 diff 用) は existing のみに限定。
- **`20-trip-detail-editor.js`**: `initPhotos` で `featPhotos.initialItems` を passthrough。`getPhotoItems()` メソッド追加 (destroy 前に呼んで退避、destroy 後は空配列)。
- **`21-bulk-record.js`**: ① `uploadPhoto` を import。② アコーディオン body に `📷 写真` ラベル + `.tde-photos` コンテナ追加、`_mountDetailEditor` の `features.photos` を `{kind:'trip', getOwnerId:()=>null, initialItems: draft._photoItems}` に。③ `_closeAccordion` / 区間ピッカー変更時の再 mount の両方で、destroy 前に `editor.getPhotoItems()` を `draft._photoItems` に退避。④ `_uploadDraftPhotos(draft, tripId)` ヘルパー (existing はそのまま / new は `uploadPhoto('trip', tripId, blob)`)。⑤ `saveBulkDrafts` で trip_id 確定後にアップロード、未ログインはスキップ (R2 は JWT 必須)、写真失敗は trip 本体保存は継続 (部分コミット許容)、トーストに写真失敗/未ログインスキップ件数を付記。

**検証**: preview (python static) の eval で、(1) アコーディオン展開時に `📷 写真` + PhotoArea (`.pa-wrap` / `＋0/5`) が mount されること、(2) 合成 PNG を file input に注入 → 別行に切替 → 戻ると `＋1/5` でサムネイル復元 + `blob:` URL 再生成 (= snapshot→復元パスが正常) を確認。console エラー無し。実 R2 アップロード (`uploadPhoto` 経由) は認証必須でローカル静的 preview では再実行不可だが、v258 以降の確認モーダル写真フローと同一関数のため動作は実証済み。

**残課題 (一括記録)**: ① 環状線対応 (山手線 17/30 駅塗り)、③ 複数 segment (設計上スキップ推奨) は別途。

---

## 280. v433 — 一括記録シートが地図タブで見えないバグ修正 (#bulk-record-sheet を .content 外へ移動)

**症状**: 地図タブのオンボーディングバナーから `#bulk-record-sheet`（一括記録モーダル）を開くと、中身（638系統リスト）は描画されるのに地図タブでは見えず、ユーザーがマイページタブに手動で切り替えると見える。PC・スマホ両方で再現。ユーザーの「マイページタブに切り替えると表示されている」という証言が決定打になった。

**真因**: `#bulk-record-sheet`（class=memo-modal, `position:fixed; inset:0`）が `.content`（`position:fixed` ＝ containing block / stacking context を作る）の**内側**に取り残されていた。fixed 要素の基準が viewport でなく祖先の `.content`（top:92px〜）になり、タブの表示状態に巻き込まれて地図タブでは正しく全画面表示されなかった。他の正常に動くモーダル（`#station-action-modal` / `#end-station-modal` / `#char-modal` 等）はすべて `.content` の外のトップレベルにある。bulk-record-sheet だけが `.content` 内に取り残されていた（A-1 v400 で skeleton を置いた位置が `.content` 内だった）。

**修正**: `#bulk-record-sheet` ブロックを `.content` の外（`#station-action-modal` と同じトップレベル階層）へ移動。ブロック単位の移動なので div バランス不変（移動前後で `<div` 286 / `</div>` 286 が完全一致、`id="bulk-record-sheet"` 重複なしを git blob 比較で検証）。preview（python static, 390x780, SW purge 後）で「地図タブ表示のままバナークリック → シートが `0,0,390,780` 全画面表示・`centerInsideSheet:true`・親が `.content` でない」を実機検証。サブエージェント（general-purpose）で修正→検証→push まで実施。

**調査プロセスの教訓**: 当初 z-index やクリック貫通を疑い preview で測定したが、preview のビューポートが 0x0 の状態で測ってしまい「枠内 OK」等の壊れた測定値を信用して誤った報告を重ねた（CACHE_VERSION バッジは v432 を指すのに実 JS は別経路…等の誤診も含む）。最終的に、(1) ユーザー実機 console で `{zIndex:"1000",closeX:true,onclick:"openBulkRecordSheet()"}` を取得しコード新版を確定、(2) ユーザーの「マイページタブで見える」証言で DOM 配置問題に絞り込み、(3) git blob で div 数を直接数えて構造健全性を確認、という「ツール出力でなく一次データで確定する」手順で解決。**preview 測定は必ず `preview_resize` で `window.innerWidth>0` を確認してから。PowerShell/Bash の文字化け出力は信用せず Grep(ripgrep) や git blob で数える。**

詳細な z-index 調査 (v429) は §278、閉じるボタン移設 (v432) は §279 参照。

---

## 279. v430〜v432 — 一括記録シート 閉じるボタンを右上に移設 + ゲスト trip フィルタ対称修正

依頼3点（細かい改善）をまとめて処理。

**(1) バナータップ → 一括記録へ遷移 (v429 で解決済)**: 空マップバナーは元々 `onclick="openBulkRecordSheet()"` で一括記録シートを開く実装。§278 の z-index 修正でバナーが押せるようになり要件充足。新規作業なし。

**(2) 一括記録シート 閉じるボタンを上部へ (v432)**: `#bulk-record-sheet` (class=memo-modal) の閉じるボタンが最下部 (`btn-cls`「閉じる」) にあり、長い系統リスト (638 系統) を最後までスクロールしないと閉じられず面倒だった → `.memo-sheet` を `position:relative` にして右上に `✕` を absolute 配置 (`top:6px;right:8px;width:auto`)、下部フッターボタンは削除。desktop(1280)/mobile(390) 両幅で「枠内・はみ出しなし・クリック貫通あり」を preview DOM 実測で確認 (screenshot は modal の backdrop-filter:blur でタイムアウトするため eval 実測で代替)。

**(3) ゲスト trip フィルタの対称修正 (v430, §278 残課題回収)**: `filterTripsByCurrentUser` (05-supabase-data.js:280) がゲスト時に `return trips` で全件返しており、`applyDateFilter` 経由で過去ログインの `user_id` 付き trip が地図塗り/集計に混入しうる穴を修正。ゲスト時は `trips.filter(t => !t.user_id)` で uid=null 保存分のみ通す。v419 §269 で `loadRiddenSegsFromStorage`「user_id 空のみ」にしたのと対称。

**プロセス失敗の教訓**: (2) の HTML 変更で、Read せず推測した `old_string` (`bulk-sheet-head`/`bulk-sheet-footer`/`-inner` 重複等、実在しない構造) で Edit を 2 連続失敗させ、v430・v431 の commit メッセージに「閉じるボタン移動」と書きながら実際は sw の CACHE_VERSION bump だけが push される状態を 2 回作った。HTML を Grep/Read で実構造確認してから v432 でようやく実体反映。**反省: HTML/CSS の Edit 前は必ず該当箇所を Read して exact match を取る (このセッションは startup hook inline で読んだ気になり Read 履歴が無く、Edit が弾かれた / 推測 old_string で空振りした、を複数回繰り返した)**。

詳細な z-index 調査は §278 参照。

---

## 278. v429 — 空マップ オンボーディングバナーが地図に隠れて「一瞬で消える」bug 修正 (z-index) + v428 調査

**症状**: 新規ゲスト (localStorage 空・未ログイン) で初期ページを開くと、空マップ案内バナー `#empty-onboarding-banner`（「乗ったことのある路線でマップを塗ろう」）が一瞬表示 → 何もしなくても勝手に消える。記録ゼロのゲストなら本来は出続けるべき。

**調査 (v428 = debug trace)**: 静的解析では矛盾 = 「localStorage 空 + RIDDEN_SEGS 空なら `isEmpty=true` で出続けるはずで、消える経路が無い」。実行時の呼び出し元スタックを取るため `markSyncSettled` / `updateOnboardingBanner` に一時 `console.log('[banner-debug]', …, new Error().stack)` を仕込み本番 deploy → ユスケ実機ログ採取。結果: `updateOnboardingBanner` は計2回 (`not-settled→hide` ← `_onReady` / `settled {lsLen:0,segsLen:0,isEmpty:true,willHide:false}` ← `markSyncSettled` ← `syncFromSupabase` ← `initMap`) のみで、**最後は `willHide:false`（= `banner.hidden=false`、表示のまま）**。`willHide:true` の行は皆無 → **ロジックは正しくバナーを表示しており、hidden を戻す処理は走っていなかった**。

**真因 (CSS z-index)**: `.empty-onboarding-banner` の `z-index:120` が Leaflet 地図 pane (200〜700) より低く、`#map` が独立 stacking context を作らない (position:relative + z-index:auto) ため、地図のタイル/路線/駅マーカー描画完了でバナーが地図の下に潜り視覚的に消えていた。`initMap` 途中の `markSyncSettled` で一瞬表示 → 地図描画完了で隠れる = 「一瞬で消える」の正体。他フロート UI (FAB・統計ボックス・最寄駅パネル・日付フィルタ) は全て `z-index:1000` で地図の上に出ていたのに、バナーだけ 120 だった。

**修正**: `z-index:120 → 1000`（地図 pane の上・他フロート UI と同帯・モーダル 9999 より下）。v428 の調査用 trace を撤去。preview (python static, port 8000) で SW キャッシュ purge 後に実証 = v429 で `zIndex:1000`・rect 寸法あり (151×179)・`elementFromPoint`=バナー自身 (eob-title) = 地図に覆われず表示、を screenshot で確認。

**教訓**: 「DOM 上は表示 (hidden=false) なのに見えない」系はロジックではなく z-index/重なりを疑う。新規オーバーレイを地図上に置くときは Leaflet pane (200〜700) と既存フロート UI (1000) の z-index 帯を意識する。本番に debug trace を出して実機ログを取る手法が有効だった (preview は localhost で localStorage 空のため症状再現せず)。

**別件メモ (今回未対応・別タスク)**: `filterTripsByCurrentUser` (05-supabase-data.js:280) がゲスト時に `return trips;`（全件）で、v419 の `loadRiddenSegsFromStorage`「user_id 付きのみ」対称修正が漏れている。`applyDateFilter` 経由で過去ログインの trip が混入しうる。今回の症状とは無関係 (`applyDateFilter` 未実行をログで確認) なので残課題として記録のみ。

---
