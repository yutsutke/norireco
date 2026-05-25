# 乗レコ - 電車旅 更新履歴 (Phase 3.8 駅 ID 体系期 — v290〜v333 アーカイブ)

`CHANGELOG.md` から退避した Phase 3.8 駅 ID 体系期 (v290〜v333 相当, §138〜§183) のセッションログ。
他フェーズは:
- [CHANGELOG.md](CHANGELOG.md) — 現行 Phase 3.8 後半 (v334〜)
- [CHANGELOG_PHASE3.8-share-r2.md](CHANGELOG_PHASE3.8-share-r2.md) — Phase 3.8 share + R2 期 (v226〜v289)
- [CHANGELOG_PHASE3.8-modules.md](CHANGELOG_PHASE3.8-modules.md) — Phase 3.8 中盤 (v189〜v225)
- [CHANGELOG_PHASE3.8-early.md](CHANGELOG_PHASE3.8-early.md) — Phase 3.8 前半 (v173〜v188)
- [CHANGELOG_PHASE1-3.7.md](CHANGELOG_PHASE1-3.7.md) — Phase 1〜3.7 (v60〜v157)

カバー範囲 (ファイル内は DESC 配置・新しい順):
- §183 v333: Supabase migration Applied 規約導入 + Phase 3-h/3-i 完全クロージング
- §182 v332: 緊急修正 (循環 import で 13b-trips.js top-level が落ちて画面真っ黒)
- §181 v331: Phase 3-h/3-i 仕上げ準備 (駅名検索 + メモシート display を getter 経由に)
- §180 v330: 修正 (陸前山王 を利府支線から東北本線本線に移動)
- §179 v329: データ充実 (13 駅を 3 SERVICE_LINES に収録 + isolation_rank 再計算)
- §178 v328: Phase 3-k (LINES id 付与カバレッジ 100% / merged_stations 13 駅補完)
- §177 v327: Phase 3-j (LINES に駅 id 付与 + p2 フォーマット統一)
- §176 v326: Phase 3-i (norireco_trips.from_station/to_station 列廃止準備 JS)
- §175 v325: Phase 3-h (norireco_memos.station 列廃止準備 JS + backfill)
- §174 v324: Phase 3-g (characters_master station_names 撤去 + stationCharMap id 化)
- §173 v323: Phase 3-f (slStopType を駅 id キー化)
- §172 v322: CLAUDE.md セッション開始時手順を強化 (Notion §0 必須化 + 完了報告 3 行)
- §171 v322: startup 着手前手順を hook から CLAUDE.md に移管
- §170 v322: 地図 FAB アイコン並び順を 📍📝🎭🌙 に変更
- §167〜169 v319-321: 駅名+都道府県検索の調整 + prefOfStation bbox 重複バグ修正
- §166 v318: マイページ駅名検索を「駅名 都道府県」AND 検索に拡張
- §165 v317: Phase 3-e 仕上げ (駅名検索 id 解決層 + slVisitCount SERVICE_LINES + id 化)
- §164 v316: Phase 3-e 部分 (13a-stats visitCount を id 化 + dev-backfill 撤去)
- §163 v315: Phase 3-d (メモに station_id 列追加 + 並行書き込み + 読み込み id 優先化)
- §162 v314: Phase 3-c (GPS 後追い認証 id 対応)
- §161 v313: Phase 3-a/3-b (キャラデータと獲得判定の id 化)
- §160 v312: Phase 2-c (完全一致経路の id 優先化)
- §159 v311: Phase 2-b (既存 trip バックフィル dev ヘルパー)
- §158 v310: Phase 2-a (trip データに `*_station_id` 列追加 + 並行書き込み)
- §157 v309: 駅シート「この駅を含む旅程」を lazy fetch 化
- §156 v308: polyline click が delegate を奪う件を修正
- §155 v307: TODO.md + STATUS.md 整理
- §154 v306: v304/v305 確認後のデバッグログ撤去
- §149〜153 v301-305: 小さい駅クリック問題 (HIT_PX 拡大 + Canvas circleMarker DOM hit area)
- §146〜148 v298-300: slRiddenSt のばらまき撤廃 → seg.lineId 直接 match 統一
- §145 v297: 「完乗率」→「完駅率」用語整理
- §144 v296: 運営会社別/地域別カードに「合計は全国総駅数を超える」注記
- §142〜143 v294-295: Phase 1 抜け修正 (マイページ完乗率・13a-stats 残り 6 箇所)
- §141 v293: 駅 ID 体系 Phase 1 (集計・描画を駅名→駅 id 化、同名異所を正しく区別)
- §140 v292: STATUS.md カバレッジ表の駅数を実値に更新
- §139 v291: 駅キャラ「コミヤウ (小宮)」を削除
- §138 v290: 小さい未乗車駅マーカーをタップしやすく (Canvas tolerance)

---

## 183. v333 — Supabase migration Applied 規約導入 + Phase 3-h/3-i 完全クロージング (2026-05-25)

### 事故の発見と原因分析

v331 push 後ユスケから「画面真っ黒」スクショ報告 → v332 で循環 import を緊急修正したが、**そもそも v331 で「DROP COLUMN 前事前修正」をやる必要が無かった** ことが発覚。

git ログを追うと:
```
3da1d47 (2026-05-25) feat(supabase): v325+v326 — name 列廃止準備 (JS) + migration ファイル追加
                     ↓
                     [ユスケが Supabase Dashboard で SQL Run、しかし git に痕跡なし]
                     ↓
875345f (2026-05-25) v331 — Claude が「SQL 実行待ち」前提で事前修正 push ← 既に Run 済を知らず!
```

**3 つの欠落が重なった**:
1. **Supabase Dashboard 状態が git で追跡できない** (構造的欠陥)
2. ユスケが SQL Run 後に STATUS.md / CHANGELOG.md を更新する規約が無かった (プロセス欠陥)
3. Claude が「実行待ち」と書かれた項目に着手する前に状態確認しなかった (Claude 側の手抜き)

ユスケから「v325/v326 SQL DROP は既に完遂済がなぜ、君につたわってなかったんだろう？原因を特定したいね」で問題提起。

### 採用した再発防止策 — A: migration ファイル末尾に Applied コメント

選定理由: ユスケ・Claude 両方の認知負荷が最小、git で追跡可能、運用負荷が低い (1 ファイル変更だけ)。

ルール (CLAUDE.md に追記):
- **ユスケ**: SQL Run 直後に `supabase/migrations/v*.sql` 末尾に `-- Applied: YYYY-MM-DD by yutsutke` 追記 → commit
- **Claude**: migration を扱う作業に着手する前に **必ず該当ファイル末尾を grep** して Applied 状態を確認。STATUS.md の「実行待ち」表記は二次情報、migration ファイル末尾が一次情報
- 例コマンド: `grep -L "^-- Applied:" supabase/migrations/v*.sql` で未実行 migration を列挙

### 変更 (規約 + クロージング)

- **supabase/migrations/v325_memo_station_drop.sql**: 末尾に `-- Applied: 2026-05-25 by yutsutke` (事後追記、過去 Run の事実を記録)
- **supabase/migrations/v326_trip_station_drop.sql**: 同上
- **CLAUDE.md**: 「Supabase migration 規約」セクション新設、両者の義務と一次情報の位置を明文化
- **STATUS.md / TODO.md**: Phase 3-h / 3-i 行を「🟡 実行待ち」→「✅ 完成 (Run 済 + cleanup)」に更新

### 変更 (Phase 3-h/3-i 完全クロージング — DROP 前提の cleanup)

DROP 完遂が確認できたので、過渡期用の fallback / backfill コードを全撤去。

- **js/16-memos.js**:
  - `getMemoStationName`: `if (memo.station) return memo.station;` 撤去、id 解決のみに
  - 駅名検索 filter: `m.station.includes(nameToken)` の name fallback 撤去、id 一致のみ (v317 で resolveStationQuery が substring → ids 解決済なので影響なし)
  - `openStationMemoList`: `m.station === args.station` の name fallback 撤去
  - `hasMemosForStation` / `countMemosForStation`: name fallback 撤去、string 引数 (旧シグネチャ互換) も撤去
  - `window.norirecoBackfillMemoStationIds` 関数全体撤去 (50 行)
- **js/13-mypage-common.js**:
  - `getTripStationName`: name fallback 撤去、id 解決のみに
- **js/13b-trips.js**:
  - `window.norirecoBackfillTripStationIds` 関数全体撤去 (70 行)
- **js/03-characters.js**:
  - `setId(trip.from_station_id, ...); if (!trip.from_station_id) setByName(trip.from_station, ...)` の name fallback 撤去、id のみに (seg.from / seg.to は jsonb 内データなので残置)
- **js/17-station-actions.js**:
  - `m.station === ms.name` フォールバック (countMemosForStation 不在時) を `0` に変更 — 2 箇所
- **sw.js**: CACHE_VERSION v332 → v333

### 検証

- syntax check 25/25 OK
- 残った `memo.station` / `trip.from_station` / `trip.to_station` の grep ヒットは全部コメント文字列のみ (実コード上の参照は 0 件)

### 教訓 — 「分散システムで状態を 1 か所に集約せよ」

Supabase Dashboard と git の間に状態の窓が空いていた。CHANGELOG / STATUS だけが情報源だと「ユスケが Run したのに更新を忘れた」で簡単に古くなる。migration ファイル自体に Applied を書く方式なら、Run と記録がほぼ同時で漏れにくい (commit するだけ)。

判定ルール:「真実の源が複数ある時、git で追跡可能な側を一次情報に置く」 — 今回は migration ファイル末尾を一次情報、STATUS.md を二次情報に降格。

### 変更ファイル

`git diff --name-only HEAD` (supabase/migrations/v325_memo_station_drop.sql / v326_trip_station_drop.sql / CLAUDE.md / STATUS.md / TODO.md / js/16-memos.js / js/13-mypage-common.js / js/13b-trips.js / js/03-characters.js / js/17-station-actions.js / sw.js / CHANGELOG.md)

---

## 182. v332 — 緊急修正: 循環 import で 13b-trips.js top-level が落ちて画面真っ黒 (v331 事故) (2026-05-25)

### 事故概要

v331 で `import { getTripStationName } from './13b-trips.js'` を 13-mypage-common.js に追加したが、13b-trips.js は既に `import { ..., tripMatchesAnyStation, ... } from './13-mypage-common.js'` していたため **循環 import** が成立。

ES Modules の循環 import は **関数バインディング (live binding) は安全** だが、**top-level の副作用が依存順序を持つ場合** に壊れる。今回は:

1. 13-mypage-common.js が評価開始
2. import 解決中に 13b-trips.js が評価開始
3. 13b-trips.js は 13-mypage-common.js を import (循環検出、partial namespace 返却)
4. 13b-trips.js の top-level が走る: `NORIRECO.mypage.deleteTripFromMypage = deleteTripFromMypage`
5. しかし `NORIRECO.mypage = NORIRECO.mypage || {}` は 13-mypage-common.js 内で **まだ実行されていない**
6. `NORIRECO.mypage` が undefined → TypeError → 全モジュールロード失敗 → 画面真っ黒

v331 push 後ユスケから「急に画面が画像のようになってしまった」「メニューだけ表示 / 完駅率 0% / local」のスクショ報告で発覚。

### v331 で「安全」と判断したのは誤り

v331 の CHANGELOG で「ES Modules の循環 import は関数バインディングのみ参照 + top-level で参照しない 条件で動作する。本ケースは両条件を満たすので許容」と書いたが、見落としていたのは **13b-trips.js が top-level で `NORIRECO.mypage` 名前空間に依存している** という点。

`NORIRECO.mypage` の初期化は 13-mypage-common.js の top-level で `NORIRECO.mypage = NORIRECO.mypage || {}` で行われるが、これは 13-mypage-common.js の import 解決の **後** に実行される。循環で 13b-trips の top-level が先に走ると未初期化。

### 修正

- **js/13-mypage-common.js**: `getTripStationName` 関数定義を 13b-trips.js から本ファイルに移動 (export)
- **js/13b-trips.js**:
  - 関数定義を削除
  - import 文の `from './13-mypage-common.js'` に `getTripStationName` を追加
  - 過去場所には「v332 で common に移動」コメントだけ残置
- **sw.js**: CACHE_VERSION v331 → v332

これで循環は解消 (13-mypage-common は何も 13b- から import しない、一方向のみ)。

### 検証

- syntax check 25/25 OK
- 13-mypage-common.js は外部依存なし (11-fraud / 12-auth / 09-tabs / 05-supabase のみ import、13b- から import なし)
- 13b-trips.js は 13-mypage-common.js から getTripStationName + 既存の 6 関数を import
- 17-station-actions.js は 16-memos.js から getMemoStationName を import (こちらは循環なしで安全)

### 教訓

ES Modules の循環 import は「関数だけなら安全」では不十分。**循環の片方が top-level で名前空間 (window.NORIRECO.mypage 等) に副作用を持つ場合、初期化順序が壊れる**。常識的に「common 層への一方向 import」を維持すべきだった。

判断基準: 循環を作りそうになったら、関数を common 層に移動する (本件で言えば `getTripStationName` は trip 固有でも common に置く)。

### 変更ファイル

`git diff --name-only HEAD` (js/13-mypage-common.js / js/13b-trips.js / sw.js / CHANGELOG.md / STATUS.md)

---

## 181. v331 — 駅 ID 体系 Phase 3-h/3-i 仕上げ準備: 駅名検索 + メモシート display を getter 経由に (DROP COLUMN 前事前修正) (2026-05-25)

### 背景

v325/v326 で memo.station / trip.from_station/to_station 列の **書き込み側** は撤去済 (INSERT/UPDATE で id 列のみ送信)。display 側も `getMemoStationName` / `getTripStationName` ヘルパーで「id 優先 + name fallback」化済。

しかし grep で残漏れを確認したところ、**2 箇所で `memo.station` / `trip.from_station` を直接参照** していた:
- [13-mypage-common.js:86-87](js/13-mypage-common.js#L86) `tripMatchesAnyStation` の `predicate(trip.from_station, trip.from_station_id)` — 駅名検索 (substring) で name 必須。DROP 後は undefined になり 0 件落ちする
- [17-station-actions.js:352](js/17-station-actions.js#L352) `memoCardHtmlMini` の `memo.station ? '🚉 ${memo.station}' : ''` — 駅シート内のメモカード駅名表示。DROP 後は空文字に

このまま SQL DROP COLUMN を実行すると上記 2 箇所が壊れる。事前に getter 経由に直してから DROP を走らせるのが安全。

### 動機

- DROP COLUMN を「動作影響ゼロ」で実行できる状態にする (2 段階デプロイの 1 段目)
- 駅名検索 + メモシート表示は乗レコの主要 UX なので壊せない
- getter (`getMemoStationName` / `getTripStationName`) は既に存在するので、callsite を直すだけの最小修正

### 変更

- **js/16-memos.js**: `getMemoStationName` を `function` → `export function` に変更 (他モジュールから import 可能に)
- **js/13b-trips.js**: `getTripStationName` を `function` → `export function` に変更
- **js/13-mypage-common.js**:
  - 冒頭で `import { getTripStationName } from './13b-trips.js'` 追加 (13-mypage-common ↔ 13b-trips は循環するが ES Modules の live binding + 関数のみ参照で安全)
  - `tripMatchesAnyStation` 内の `predicate(trip.from_station, ...)` → `predicate(getTripStationName(trip, 'from'), ...)` / 同 'to'
- **js/17-station-actions.js**:
  - import に `getMemoStationName` を追加
  - `memoCardHtmlMini` 内の `memo.station` → `getMemoStationName(memo)`
- **sw.js**: CACHE_VERSION v330 → v331

### 設計判断 — 循環 import を許容

13-mypage-common.js は既に 13b-trips から `tripCardHtml` などをインポートされる「common 層」だが、`getTripStationName` は trip 固有のヘルパーなので 13b-trips に置きたい。常識的には共通モジュールに置くべきだが、移動するとさらに広範囲の変更になる。

ES Modules の循環 import は **関数バインディングのみ参照 + top-level で参照しない** 条件で動作する。本ケースは両条件を満たすので許容。

代替案として `getTripStationName` を 13-mypage-common.js に移動も検討したが、`getMemoStationName` (16-memos に残る) との対称性が崩れる + 13b-trips 内の他関数からも使うため、現状の trip 側に置く方が一貫している。

### 検証

- syntax check 25/25 OK
- 循環 import チェック: 13-mypage-common ↔ 13b-trips のみ (16-memos は 17-station-actions と相互依存なし)
- 既存の DROP 後動作シナリオを想定: `trip.from_station = undefined` で `getTripStationName(trip, 'from')` が MERGED_STATIONS 経由で name を返すこと

### 残課題 (次ステップ)

1. **ユスケ手動作業**: v331 デプロイ確認 → ブラウザコンソールで backfill 2 関数実行 → Supabase で NULL チェック → `v325_memo_station_drop.sql` / `v326_trip_station_drop.sql` を順に Run
2. **v332 cleanup**: DROP 完了 + 動作確認後、getter 内の `if (memo.station)` / `if (trip[nameKey])` fallback 分岐を撤去、backfill 関数 + 03-characters.js の `setByName` dead code を撤去

### 変更ファイル

`git diff --name-only HEAD` (js/16-memos.js / js/13b-trips.js / js/13-mypage-common.js / js/17-station-actions.js / sw.js / CHANGELOG.md / STATUS.md / TODO.md)

---

## 180. v330 — 修正: 陸前山王 を利府支線から東北本線本線に移動 (v329 の誤配属修正) (2026-05-25)

### 背景

v329 で陸前山王 (s_09030) を `jr_tohoku_main_rifu` (東北本線利府支線) に配属したが、ユスケから地図スクリーンショットで「**陸前山王は本線のようですね**」と指摘あり。

確認:
- N02 polyline (`lines-p2.json` の 東北線_東日本旅客鉄道) で並びを確認すると `... 岩切(branch:0) → 陸前山王(branch:0) → 国府多賀城(branch:0) ...` で、本線 (`branch:0`)
- 利府支線 (branch:1) は `利府 → 新利府` で別系統 (岩切 から分岐)
- Wikipedia でも 陸前山王駅 は 東北本線本線 (岩切〜国府多賀城) で確認

v329 で「`jr_tohoku_main_rifu` という支線 SERVICE_LINE が既存だったので、そこに収録するのが正しい」と判断したのは誤り。利府支線は本線の旧線跡 (1962 廃止) ではなく、現代の独立支線で、本線とは異なるルート。

### 動機

- 駅の路線所属の正確性 (鉄道オタクが見て違和感を持たない最低限のデータ品質)
- 利府支線駅数 4 → 3 に戻すことで「岩切起点の支線 3 駅」という実態に整合
- 隣接駅距離が改善 (利府支線では新利府 2.0km、本線では岩切 1.3km が最近接) → isolation_rank 3 → 2 に正常化

### 変更

- **tools/fix_rikuzen_sannou.js** (新規): idempotent な修正スクリプト
- **service_lines_master.json**:
  - `jr_tohoku_main_rifu`: 陸前山王を除去、4 駅 → 3 駅 (岩切 → 新利府 → 利府)
  - `jr_tohoku_main_north`: 陸前山王を 岩切 (order 45) と 国府多賀城 (order 46) の間に挿入、82 駅 → 83 駅 (国府多賀城以降 order +1 シフト)
- **merged_stations.json**:
  - 陸前山王 (s_09030): `lines: ["jr_tohoku_main_rifu"]` → `["jr_tohoku_main_north"]` (color は両線とも #F4A300 で同じ → 不変)
  - isolation_rank: 3 → 2、nearest_km: 2.0 → 1.3 (compute_isolation_rank.js 再実行)
- **sw.js**: CACHE_VERSION v329 → v330

### 教訓

利府支線 (`jr_tohoku_main_rifu`) の駅名に「利府」が入っているからといって周辺駅も支線とは限らない (陸前山王のように本線の駅もある)。SERVICE_LINE 配属判定は **N02 polyline の branch 値** か **公式路線図** で確認すべき。v329 では既存 SERVICE_LINE 名から推測してしまった。

### 検証

- syntax check 25/25 OK (JSON のみ変更)
- 陸前山王の周辺 (岩切→陸前山王→国府多賀城) が jr_tohoku_main_north に order 45/46/47 で並ぶこと確認
- jr_tohoku_main_rifu が 岩切→新利府→利府 の 3 駅に戻ること確認
- isolation_rank 全体分布: rank 3 が 1625 → 1624、rank 2 が 2959 → 2960 (陸前山王 1 駅のみ移動、他は不変)

### 変更ファイル

`git diff --name-only HEAD` (tools/fix_rikuzen_sannou.js / service_lines_master.json / merged_stations.json / sw.js / CHANGELOG.md / STATUS.md)

---

## 179. v329 — データ充実: v328 で補完した 13 駅を 3 SERVICE_LINES に収録 + isolation_rank 再計算 (2026-05-25)

### 背景

v328 で merged_stations.json に 13 駅 (常磐線震災区間 11 + 山陽線 2 + 東北線 1) を補完したが、`lines: []` のままだった (SERVICE_LINE 未収録)。このままだと:
- 完駅率カードや運営会社別カードの「乗車系統数」で表示されない
- 系統別の集計 (路線タブ・slVisitCount) に出てこない
- 地図上の駅マーカーは N02 LINES polyline 経由でしか描画されない (SERVICE_LINES マーカーレイヤーで欠落)
- isolation_rank が 0 にフォールバックして「東京山手内側並みの密集」扱い (実際は 4-6km 間隔)

ユスケから「13 駅を SERVICE_LINES に収録するところまでやる」依頼で v329 で対応。

### 動機

- v328 で「データ充実カテゴリの別タスク」と punt したが、3 線追加だけなのでまとめてやる方が綺麗
- 利府線 (jr_tohoku_main_rifu) は陸前山王が抜けていた **既存データ漏れ** (震災と無関係) で、これも同時修正できる
- isolation_rank が 0 のままだと低ズーム LOD で表示優先度が低くなり、ユーザーに「ない駅」のように見える

### 変更

- **tools/add_13_stations_to_service_lines.js** (新規): 3 つの SERVICE_LINES に駅を追加して order を採番し直し + merged_stations.json の lines/colors を同時更新する Node スクリプト。idempotent (再実行で重複追加しない)。デフォルト dry-run、`--write` で書き込み。
- **service_lines_master.json**:
  - `jr_joban_medium`: 11 駅を 原ノ町 (order 63) の後に追加 (鹿島〜岩沼)、駅数 63 → 74、name を「常磐線中距離(品川〜原ノ町)」→「**常磐線中距離(品川〜岩沼)**」に更新
  - `jr_sanyo_main`: 英賀保・はりま勝原 を 姫路 (idx 0) と 網干 (idx 1) の間に挿入、駅数 101 → 103、網干以降の order を +2 シフト
  - `jr_tohoku_main_rifu`: 陸前山王 を 岩切 (idx 0) と 新利府 (idx 1) の間に挿入、駅数 3 → 4 (1:岩切 → 2:陸前山王 → 3:新利府 → 4:利府)
- **merged_stations.json**:
  - 11 常磐線駅: `lines: ["jr_joban_medium"]` / `colors: ["#2DA9DF"]`
  - 岩沼 (s_04138): 既存 `jr_tohoku_main_north` に加えて `jr_joban_medium` を追加 (lines 2 個に)
  - 2 山陽線駅 (はりま勝原 s_09018 / 英賀保 s_09019): `jr_sanyo_main` / `#0072BC`
  - 陸前山王 (s_09030): `jr_tohoku_main_rifu` / `#F4A300`
- **isolation_rank 再計算** (`tools/compute_isolation_rank.js`):
  - 新規 13 駅は SERVICE_LINE 経由で隣接駅と距離計算可能になり、rank 3-5 / nearest 2-6.7km に確定 (前回は 0 / null)
  - **隣接駅情報なし: 0 駅** (前回も 0 駅、9030 駅全てが何らかの SERVICE_LINE に含まれた)
  - rank 分布: rank 0=716 / 1=1938 / 2=2959 / 3=1625 / 4=1393 / 5=319 / 6=80
- **sw.js**: CACHE_VERSION v328 → v329

### 設計判断 — jr_joban_medium に append (新規 SERVICE_LINE 作成せず)

代替案として「常磐線 原ノ町〜岩沼 を別 SERVICE_LINE として独立 (`jr_joban_north` 等)」もありえたが:
- 国土地理院 N02 は 1 本の `常磐線_東日本旅客鉄道` 線
- 中距離・特急ひたち系統 (上野〜仙台直通) の運転実績あり (1 日数本)
- 完駅率の集計で「常磐線」が 2 つに分裂すると混乱

→ 単一 SERVICE_LINE 内に append、name を「品川〜岩沼」に更新する形を採用。

### 設計判断 — 陸前山王 は jr_tohoku_main_north ではなく jr_tohoku_main_rifu

陸前山王 は東北本線の 利府支線 (旧線) 上の駅。本線 (海岸線) は 岩切 → 国府多賀城 → 塩釜 を通る。`jr_tohoku_main_rifu` という支線 SERVICE_LINE が既存だったので、そこに収録するのが正しい (本線に紛れ込ませない)。

### リスク・検証

- 既存駅 (岩沼) の lines 拡張は `addLineToMs` の existing check で重複追加されない
- 山下 (常磐線 s_09023) は msByName Map の last-write-wins で正しく s_09023 (s_00536 / s_04031 ではなく) が更新される。検証済
- syntax check 25/25 OK (JSON のみ変更)
- jr_joban_medium の通し駅数 74 駅・name 「常磐線中距離(品川〜岩沼)」確認済
- jr_sanyo_main の冒頭 6 駅順序 (姫路→英賀保→はりま勝原→網干→竜野→相生) 確認済
- jr_tohoku_main_rifu の 4 駅順序 (岩切→陸前山王→新利府→利府) 確認済

### 残課題

- 常磐線特急 (ひたち・ときわ) の系統定義は別 SERVICE_LINE (`jr_joban_express` 等) が無いため、現状中距離と混在
- 山陽本線・東北本線の更なる SERVICE_LINES 拡充は別タスク (operator_id placeholder 一括補修と同カテゴリ)

### 変更ファイル

`git diff --name-only HEAD` (tools/add_13_stations_to_service_lines.js / service_lines_master.json / merged_stations.json / sw.js / CHANGELOG.md / STATUS.md / TODO.md)

---

## 178. v328 — 駅 ID 体系 Phase 3-k: LINES id 付与カバレッジ 100% (merged_stations 13 駅補完) (2026-05-25)

### 背景

v327 で LINES (lines-p?.json) に駅 id を付与した際、merged_stations.json 側のデータ欠落により 13 駅 (10,164 中) が id 未付与で残った (カバレッジ 99.87%)。内訳:
- **常磐線 (震災区間) 11 駅**: 逢隈・亘理・浜吉田・山下・坂元・新地・駒ヶ嶺・相馬・日立木・鹿島 (10 駅は merged_stations に存在せず) + 山下 (兵庫の能勢電鉄 山下と 280km 離れて far skip)
- **山陽線 2 駅**: はりま勝原・英賀保
- **東北線 1 駅**: 陸前山王

v327 では「merged_stations 側のデータ整備マターとして別件」と棚上げしていたが、座標は lines-p2.json に既にあるため流用すれば自己完結する。

### 動機

- 「あとあと問題が起きなそう」予防的目的の完遂 (v327 と同じ動機)
- LINES → id ベース reader 移行を将来始めるとき、データに穴があるとそこで例外処理が必要になる。100% にしておく
- 山下 (常磐線) を 山下 (世田谷線/能勢電鉄) と厳密区別できる状態にしておく (同名異所駅の典型例)

### 変更

- **tools/add_missing_13_stations.js** (新規): lines-p2.json の座標を流用して merged_stations.json に 13 駅を追加する Node スクリプト。デフォルト dry-run、`--write` で書き込み
  - 採番: s_09018 〜 s_09030 (連番)
  - `lines: []` / `colors: []`: 該当 SERVICE_LINE が無いため空 (jr_joban_medium は 原ノ町 で終わり、山陽線・東北線の該当駅も SERVICE_LINES 未収録)
  - `n02_lines: [<該当 N02 line id>]`: 山陽線 / 常磐線 / 東北線
  - `isolation_rank: 0` / `nearest_km: null`: compute_isolation_rank.js は lines:[] のとき 0 にフォールバックする挙動と一致
- **merged_stations.json**: 9017 駅 → 9030 駅 (+13)
- **lines-p?.json**: tools/add_line_station_ids.js --write を再実行し 13 駅に id 付与。カバレッジ 99.87% → **100.00%** (far=0, missing=0)
  - 集計内訳: exact 9068 → 9080 (+12), near 1083 → 1084 (+1, 常磐線 山下 が 3 候補中の最近接として near 扱い)
- **sw.js**: CACHE_VERSION v327 → v328

### 設計判断 — SERVICE_LINES への追加は別スコープ

13 駅のうち常磐線 11 駅は震災後 2020 年に運転再開済だが、service_lines_master.json の jr_joban_medium は 原ノ町 で終わっており、いわき方面が継続していない。これらを SERVICE_LINES に追加するのは「🟢 データ充実」カテゴリの別タスク (用語、station_class、運営会社等の妥当性も検討必要)。

今回は「LINES の id 付与カバレッジ 100% にする」だけが目的なので、merged_stations への駅追加 + n02_lines セットに留め、SERVICE_LINES は触らない。

### リスク・検証

- 既存 s_NNNNN id は変更なし (新規 s_09018〜s_09030 のみ追加) → trip / memo / character_grants の既存データに影響なし
- 山下 (常磐線 / s_09023) は 3 候補中の最近接で id 付与され、世田谷線 (s_04031) / 能勢電鉄 (s_00536) の id は変わらず
- 9017 駅 → 9030 駅で完駅率分母が +13 = 0.14% 上昇 (UI 上ほぼ影響なし)
- syntax check 不要 (JSON データのみ変更、JS は新規 tool のみ)
- 全 4 lines-p?.json の JSON parse 成功 + id 付与カウント確認 (前回比 +13)

### 残課題

- 常磐線 jr_joban_medium SERVICE_LINE をいわき方面まで延伸 (データ充実、別タスク)
- 山陽線 / 東北線 の SERVICE_LINES 拡充 (同上)
- N02 LINES.stations[].n キーで集計している reader 側コードの段階的 id 化 (必要になってから 1 箇所ずつ、v327 と同じ方針)

### 変更ファイル

`git diff --name-only HEAD` (tools/add_missing_13_stations.js / merged_stations.json / lines-p1.json / lines-p2.json / lines-p3.json / lines-p4.json / sw.js / CHANGELOG.md / STATUS.md / TODO.md)

---

## 177. v327 — 駅 ID 体系 Phase 3-j: LINES (lines-p?.json) 各駅に id 付与 + p2 フォーマット統一 (2026-05-25)

### 背景

v326 で「Phase 3 残り (LINES の id 付与)」は **棚上げ** とした (`lines-p?.json` の stations[] を直接参照する処理が現状なし、必要になってから再考)。しかしユスケから「あとあと問題が起きなそう」観点で先回り対応依頼。

実際 grep してみると **N02 LINES.stations[].n キーで findIndex / forEach している箇所が 12 ファイル・数十箇所残っている** (04b-ride-record / 05-supabase-data / 07-record-mode / 11-fraud-detection 等)。SERVICE_LINES.stations[].id (v293 で付与済) と違い、N02 LINES は name しか持たないため、複数路線を跨いだ駅集計や同名異所駅の厳密区別が将来できない。

データ側に id を持たせておけば、後で reader を id 化する時にいつでも置換可能になる。これがユスケの予防的目的に合致する最小スコープ。

### 動機

- 同名異所駅 (高松 香川/石川/多摩 / 山下 宮城/兵庫 等) を N02 物理路線レベルでも厳密区別可能にする
- 将来 reader を id 化する作業を「データ整備の手間なしで」始められる状態にしておく
- v324 までの Phase 3 (SERVICE_LINES 側 + characters_master + memos + trips) を補完して「駅 id 体系」を全面適用 (LINES だけ name のままという歪みを解消)

### 変更

- **tools/add_line_station_ids.js** (新規): `merged_stations.json` と (name + 座標近接) で照合して `lines-p1〜4.json` の各駅に `id: s_NNNNN` を付与する Node スクリプト。デフォルト dry-run、`--write` で書き込み。
  - 照合キー: `merged_stations.json` は国土地理院 `c` コードを持たないため、name で候補を絞り座標最近接 1 件を採用
  - 安全策: 距離 0.5km 超の最近接候補は「同名異所駅で誤マッチ」の危険があるため id 付与しない (reader 側 name fallback に任せる)
  - 集計: total 10,164 駅 / exact (single cand, <0.5km) 9,068 / near (multi cand, <0.5km) 1,083 / far (>=0.5km, skip) 1 / missing (no name) 12 → **カバレッジ 99.87%**
- **lines-p1.json / lines-p3.json / lines-p4.json**: 各駅に `id` プロパティ追加 (1 路線 1 行フォーマット維持)
- **lines-p2.json**: id 付与 + **フォーマット統一**。元は「1 駅複数行のインデント形式」だったが、p1/p3/p4 と揃えて「1 路線 1 行」に統一 (38,289 行 → 170 行、766KB → 450KB)
- **sw.js**: CACHE_VERSION v326 → v327

### id 付与スキップ駅 (13 駅、約 0.13%)

reader 側 name fallback で従来どおり動作:
- **常磐線 (震災不通区間 11 駅)**: 逢隈・亘理・浜吉田・坂元・新地・駒ヶ嶺・相馬・日立木・鹿島 + 山下 (山下のみ「他県の山下と座標 280km 差で far skip」、他 10 駅は merged_stations に存在せず missing)
- **山陽線**: はりま勝原・英賀保 (merged_stations 漏れ)
- **東北線**: 陸前山王 (merged_stations 漏れ)

これらは merged_stations.json 側のデータ整備マターとして別件 (今回スコープ外)。

### 設計判断 — reader 側変更なしで stop

「N02 LINES.stations[].n キー findIndex」が大量に残っているが、ほぼすべて **特定の路線スコープ内** での検索 (例: `line.stations.findIndex(s => s.n === seg.from)`)。line.id でスコープされる範囲内では同名異所駅問題は発生しないため、reader 側変更は今回不要と判断。

将来「複数路線を跨いだ駅集計」を書く時に id ベースに移行すれば良い (データは既に揃っている)。インクリメンタルに進められる。

### 検証

- syntax check 25/25 OK
- 全 4 ファイルの JSON parse + id 付与カウント確認 (p1 110/110 / p2 4558/4571 / p3 2872/2872 / p4 2611/2611)
- dry-run → write 切替時にもサイズ・カバレッジ変動なし

### 残課題 / 棚上げ

- merged_stations.json の常磐線震災区間 + 山陽線 はりま勝原・英賀保 + 東北線 陸前山王 のデータ補完 (別件、🟢 データ充実カテゴリ)
- N02 LINES.stations[].n キーで集計している reader 側コードの段階的 id 化 (必要になってから 1 箇所ずつ)

### 変更ファイル

`git diff --name-only HEAD` (tools/add_line_station_ids.js / lines-p1.json / lines-p2.json / lines-p3.json / lines-p4.json / sw.js / CHANGELOG.md / STATUS.md / TODO.md)

---

## 176. v326 — 駅 ID 体系 Phase 3-i: norireco_trips.from_station/to_station 列廃止準備 (JS) (2026-05-25)

### 背景

Phase 2-a (v310) で `from_station_id` / `to_station_id` 列追加 + 並行書き込み開始、Phase 2-b (v311) で既存 125 件を backfill 完遂、Phase 2-c (v312) で読み込みパスを id 優先化済。Phase 3 完了として name 列 (`from_station` / `to_station`) を Supabase からも撤去する。

### 動機

- 同名異所駅 (高松 香川/石川/多摩 等) を trip データレベルで厳密区別
- 将来 (グローバル展開・AI 自動列車判定) で name 依存があると破綻
- v323/v324/v325 で「データ全体を id 一本化」する流れを完成させる

### 変更 (JS のみ — Supabase SQL DROP はユスケが Dashboard で実行)

- **supabase/migrations/v326_trip_station_drop.sql** (新規): `ALTER TABLE norireco_trips DROP COLUMN from_station, DROP COLUMN to_station;` + `NOTIFY pgrst, 'reload schema'`
- **js/07-record-mode.js**: 新規 trip 保存時の `from_station: fromStation, to_station: toStation` 並行書き込みを撤去。id 列のみ書く
- **js/13b-trips.js**:
  - `getTripStationName(trip, 'from'|'to')` ヘルパー追加: `trip.from_station_id` から MERGED_STATIONS で名前を逆引き。過渡期 (DROP 未実行) は `trip.from_station` をそのまま返す
  - 旅程編集モーダルの segments 折り畳み表示 (line 299) を helper 経由に
  - retroactivelyVerifyTrip の findStCoord / alert メッセージ (line 611-629) を helper 経由に
  - `window.norirecoBackfillTripStationIds()` 追加: `_mypageCache` をスキャンして `from_station_id` または `to_station_id` が NULL の trip を MERGED_STATIONS から逆引き backfill する dev ヘルパー (gps_lat/gps_lon があれば最近接 ms を選ぶ)
- **CACHE_VERSION**: v325 → v326

### リスク・検証

- v311 で 125 件 backfill 完遂 + v310 並行書き込みで新規 trip も id 入り → 全 trip が *_station_id NOT NULL になっているはず。SQL DROP 前に backfill ヘルパーで再確認推奨
- trip カード本体は `trip.name` (フォーマット済) を表示しているので、name 列 DROP の display 影響は edit modal + verify alert の 2 箇所のみ
- syntax check 25/25 OK

### 残り手順 (ユスケ)

1. Cloudflare Pages デプロイ完了後、`https://norireco.app` をリロード (PWA キャッシュ更新)
2. マイページタブを 1 度開いて `_mypageCache` を満たす
3. ブラウザコンソールで `await norirecoBackfillTripStationIds()` を実行 → `OK ... / FAIL ...` を確認
4. Supabase Dashboard → SQL Editor で `SELECT COUNT(*) FROM norireco_trips WHERE from_station_id IS NULL OR to_station_id IS NULL;` が 0 件を確認
5. `supabase/migrations/v326_trip_station_drop.sql` を貼り付け Run
6. 旅程の表示・編集・GPS 認証が壊れていないか確認

### 変更ファイル

`git diff --name-only HEAD` (supabase/migrations/v326_trip_station_drop.sql / js/07-record-mode.js / js/13b-trips.js / sw.js / CHANGELOG.md / STATUS.md / TODO.md)

---

## 175. v325 — 駅 ID 体系 Phase 3-h: norireco_memos.station 列廃止準備 (JS + backfill) (2026-05-25)

### 背景

Phase 3-d (v315) で `station_id` 列追加 + 並行書き込み + 読み込み id 優先化済。既存メモ 3 件は `station_id = NULL` のまま name fallback で動いていた。Phase 3 完了として name 列を Supabase からも撤去する。

### 動機

- v324 で characters_master を name 撤去したのと同じ流れで、Supabase 側も name 列を一掃して駅 id 一本化を完成させる
- 同名異所駅対応 (例: 高松 香川/石川/多摩でメモ取り違え) を根絶

### 変更 (JS のみ — Supabase SQL DROP はユスケが Dashboard で実行)

- **supabase/migrations/v325_memo_station_drop.sql** (新規): `ALTER TABLE norireco_memos DROP COLUMN station;` + `NOTIFY pgrst`
- **js/16-memos.js**:
  - `getMemoStationName(memo)` ヘルパー追加: `memo.station_id` から MERGED_STATIONS で名前を逆引き。過渡期 (DROP 未実行) は `memo.station` をそのまま返す
  - createMemoOnServer に渡す newMemo から `station: ci.station?.n` を撤去 (id-only writes)
  - 編集モーダル sub 行 (line 200) / マイページ memo カード where 行 (line 519) を helper 経由に
  - openStationMemoList のフィルタ (line 558-561) は id 優先 + name fallback のまま (DROP 後は name fallback が no-op になる)
  - `NORIRECO.memos.countMemosForStation(ms)` 追加: 17-station-actions の memoCount 用 id 優先カウント
  - `window.norirecoBackfillMemoStationIds()` 追加: `M.cache` をスキャンして `station_id` NULL のメモを MERGED_STATIONS から逆引き backfill (lat/lon があれば最近接で同名異所駅を選別)
- **js/17-station-actions.js**: memoCount フィルタ (line 109, 474) を `NORIRECO.memos.countMemosForStation(ms)` 経由に
- **CACHE_VERSION**: v324 → v325

### リスク・検証

- 既存メモ 3 件が `station_id = NULL` のまま SQL DROP するとフィルタから消える → backfill 必須
- name 列を fallback で残しているのは過渡期 (SQL DROP まで) のみ。DROP 後は `memo.station = undefined` で fallback が no-op に
- syntax check 25/25 OK

### 残り手順 (ユスケ)

1. Cloudflare Pages デプロイ完了後、`https://norireco.app` をリロード (PWA キャッシュ更新)
2. マイページ「📸 メモ」タブを 1 度開いて `M.cache` を満たす
3. ブラウザコンソールで `await norirecoBackfillMemoStationIds()` を実行 → `OK ... / FAIL ...` を確認
4. Supabase Dashboard → SQL Editor で `SELECT COUNT(*) FROM norireco_memos WHERE station_id IS NULL;` が 0 件を確認
5. `supabase/migrations/v325_memo_station_drop.sql` を貼り付け Run
6. メモの表示・フィルタ・駅メモ一覧モーダルが壊れていないか確認

### 変更ファイル

`git diff --name-only HEAD` (supabase/migrations/v325_memo_station_drop.sql / js/16-memos.js / js/17-station-actions.js / sw.js / CHANGELOG.md / STATUS.md / TODO.md)

---

## 174. v324 — 駅 ID 体系 Phase 3-g: characters_master station_names 撤去 + stationCharMap id 化 (2026-05-25)

### 背景

Phase 3-a/3-b (v313) で characters_master.json は schema_v2 化し `station_ids` (s_NNNNN 配列) を追加したが、旧 `station_names` も「name fallback 用」として並行保持していた。Phase 3 完了 (name 列廃止 + 駅 id ベース完全統一) に向けて以下を撤去:

- characters_master.json: `station_names` / `obtainable_at_names`
- js 全体: name → id fallback パス (`stationCharMap` の name キー、`getStationCharacter(ms.name)` 等)

### 動機

- 同名異所駅 (例: 高松 香川/石川/多摩) でキャラ獲得・選択 UI が name 経由だと取り違える可能性
- v324 時点でキャラは 6 体・対象駅 2 駅 (八王子・立川) で同名異所が現実問題化していないが、将来 (主要ターミナル展開・地域文化キャラ) で必ず爆発する。今のうちに id 一本化が安全

### 変更

- **characters_master.json**: schema_v2 → schema_v3。`station_names` / `obtainable_at_names` を全 6 キャラから削除。
- **js/02-data-loaders.js (loadCharacters)**: stationCharMap への name キー二重登録を撤去。駅 id (s_NNNNN) のみのキーに統一。
- **js/03-characters.js**:
  - `checkAndGrantCharacters`: trip の `from_station`/`to_station` (name) を MERGED_STATIONS で id に変換してから集約。obtainable_at の id 配列とだけ照合。Supabase 記録時は id → name 逆引きで表示用駅名を取得。
  - `tryGrantByGPS`: obtainAtNames fallback ループを撤去、id 経路のみ。
- **js/04-gps-location.js**:
  - `getObtainableCharactersAt(ms)`: name 経由判定を撤去、`ms.id` で `obtainable_at` 配列を直接 includes。
  - `getStationCharacter(ms)`: 引数を stationName → ms オブジェクトに変更。内部で `stationCharMap.get(ms.id)`。
  - `getStationCharacterChoice(stationId)` / `setStationCharacterChoice(stationId, charId)`: 引数を駅 id に。localStorage キー名 (`norireco_station_char_pick`) は維持するが、保存値は駅 id ベースに切替 (旧 name キーのレコードは孤児化する。八王子/立川の 6 キャラ分のユーザー再選択コストは極小なので migration はしない)。
  - `pickStationCharacter(stationId, charId)`: 引数を stationName → stationId に。HTML 文字列内 onclick 呼出 (`08-rendering.js:963`) も `'${ms.id}'` 化。
- **js/08-rendering.js**: `getStationCharacter(ms.name)` 2 箇所 → `(ms)`、`stationCharMap.get(ms.name)` → `(ms.id)`、`getStationCharacterChoice(ms.name)` → `(ms.id)`、`pickStationCharacter('${ms.name}', ...)` → `('${ms.id}', ...)`。
- **js/17-station-actions.js**: `pickCharacterForStation(stationName)` → `(stationId)`、`stationCharMap.get(stationName)` → `(stationId)`。caller (`openStationActionSheet`) は `ms.id` を渡す。

### リスク・検証

- HTML 文字列内 onclick (`pickStationCharacter`) は ms.id を直接渡す形にしたので、駅名にシングルクォート等が含まれた場合の XSS は元から心配不要 (s_NNNNN のみ)
- 旧 localStorage キー (駅名キー) のデータは残置 → 孤児になるが lookup されないので無害
- syntax check 25/25 OK
- name → id 変換は MERGED_STATIONS から 1 回構築する nameToId Map で O(1) lookup、checkAndGrantCharacters の処理コストは無視できる範囲

### CACHE_VERSION

v323 → v324

### 変更ファイル

`git diff --name-only HEAD` で確認 (characters_master.json / js/02-data-loaders.js / js/03-characters.js / js/04-gps-location.js / js/08-rendering.js / js/17-station-actions.js / sw.js / CHANGELOG.md / STATUS.md / TODO.md)

---

## 173. v323 — 駅 ID 体系 Phase 3-f: slStopType を駅 id キー化 (2026-05-25)

### 背景

Phase 3-e (v316/v317) で visitCount / 駅名検索 / slVisitCount は駅 id 化が完了したが、**slStopType だけは name キーのまま据え置き** (CHANGELOG §165 でも理由を「id 化メリットが薄い、Phase 3 完了 = name 列廃止と一緒にやる方が効率的」と明記)。Phase 3 残り (name 列廃止) 着手にあたり、まず JS のみで完結する slStopType id 化を v323 で先に潰す。

### 動機

- 同名異所駅 (高松 香川/石川/多摩、原町 福島/茨城 等) で stop_type 判定が混線するリスクを潰す。現状は両方が同じ slStopType[name] スロットを共有しており、片方で 'alighted' になるともう片方も 'alighted' 表示になる
- name 列廃止後に slStopType を残すと「stop_type だけ name 経由」という残骸になり、name 廃止判断が複雑化する

### 変更

- **js/04b-ride-record.js**:
  - rebuild() 内 v186 ブロック: `slStopType[nm]` (駅名キー) → `slStopType[sid]` (駅 id キー) に変更。`sid = sl.stations[i].id` (v293 以降必ず存在)
  - SERVICE_LINES.stations[].id が無い場合は continue で防御 (v293 以前データ救済)
  - 冒頭コメント「slStopType[駅名]」→「slStopType[駅 id]」に修正
- **js/08-rendering.js:700**: `slStopType[ms.name]` → `slStopType[ms.id]` に変更

### リスク・検証

- SERVICE_LINES の全 stations が id を持つことは v293 で確認済 (`02b-service-lines-builder.js:150` で必ず付与)
- ms.id も MERGED_STATIONS で必ず付くため (v290〜)、両側とも id 引きで動く
- 既存 RIDDEN_SEGS は seg.from/to が name のままだが、sl.stations.findIndex(s => s.name === seg.from) で SERVICE_LINES の駅順 index を得てから id を引くので、seg 側 schema 変更は不要

### CACHE_VERSION

v322 → v323

### 変更ファイル

`git diff --name-only HEAD` で確認 (sw.js / js/04b-ride-record.js / js/08-rendering.js / CHANGELOG.md / STATUS.md / TODO.md)

---

## 172. v322 (no deploy) — CLAUDE.md セッション開始時手順を強化（Notion §0 必須化 + 完了報告 3 行） (2026-05-25)

### 背景

v322 (§171) で着手前手順を hook → CLAUDE.md に移管したが、文言が緩く今朝のセッションで手順 2「構造把握 (Notion §0 fetch)」をスキップした。原因は 2 点:

1. 「必要時 fetch」「役割分担に迷ったら §0」と逃げ道がある表現で、STATUS.md で情報が十分な気がして飛ばした
2. 「3 つ全部やった」という外形チェックが効かず、抜けが見えない

### 対応 (A + B 案)

- **A. 文言強化**: 手順 2 を「**毎セッション必ず Notion §0 を `notion-fetch`**」に変更。「必要時」「迷ったら」を削除。「STATUS.md だけで構造把握できた気になりやすいがスキップ禁止」の注意を併記
- **B. 完了報告の強制**: 最初の応答冒頭に必ず以下 3 行を出してから質問するルールを追加
  ```
  ✅ 現状確認 (vXXX)
  ✅ 構造把握 (Notion §0)
  ✅ TODO 把握
  ```
  → 抜けたらユスケがすぐ気付ける

### 検討した没案

- **§0 を hook に inline**: notion-fetch が必要で hook 起動遅延 + 出力サイズ更に肥大 → 却下
- **STATUS.md に §0 サマリを inline**: v274「同じ内容を 2 か所に書かない」ルールに反する → 却下
- **hook 末尾にチェックリスト追加**: hook 出力は既に 10KB でプレビュー切れ → B (CLAUDE.md) の方が確実

### 変更ファイル

- CLAUDE.md: 「セッション開始時」セクションを A + B で改訂

### 失敗教訓

CLAUDE.md の指示は「必要時」「迷ったら」のような逃げ道を残すと飛ばされる。やってほしいことは「毎回必ず」と書く + 完了報告で外形チェックを効かせる。

---

## 171. v322 (no deploy) — startup 着手前手順を hook から CLAUDE.md に移管 (2026-05-25)

### 背景

`.claude/hooks/session-start.js` は出力末尾に「着手前に必ず — この順で / 1. 現状確認 / 2. 構造把握 / 3. TODO 把握 / 4. 質問してから着手」という指示文を載せていたが、hook 出力が 10.5KB に肥大化してプレビュー (2KB) を超えてしまうと、Claude 側はこの指示文を読まずに startup を済ませる可能性があった (実際に今朝起きていた)。

### 対応

- 指示文を `CLAUDE.md` の「セッション開始時（着手前に必ず — この順で）」セクションに移管。CLAUDE.md は毎セッション必ずコンテキストに入るので確実に読まれる。
- `.claude/hooks/session-start.js` 末尾の指示文ブロックを削除。代わりに移管した旨のコメントだけ残す。
- hook 出力に「プレビュー切れ時は `tool-results/hook-*-stdout.txt` 全文を Read」のルールも CLAUDE.md 側に明記。

### 変更ファイル

- CLAUDE.md: 「セッション開始時」セクションを追加
- .claude/hooks/session-start.js: 着手前手順ブロックを削除

### 失敗教訓

hook 出力は短く保つこと。長い指示は必ずコンテキストに入る CLAUDE.md に置く。

---

## 170. v322 — 地図 FAB アイコン並び順を 📍📝🎭🌙 に変更 (2026-05-25)

### 背景

ユスケの希望で、地図右下の FAB スタック (縦並び) の並び順を変更したい。

### 旧並び (top→bottom)
- 📍 location (bottom:225px)
- 🎭 char (bottom:170px)
- 📝 record (bottom:115px)
- 🌙/🗺️/🌐 map-mode (bottom:60px)

### 新並び (top→bottom)
- 📍 location (bottom:225px) — 変更なし
- 📝 record (bottom:170px) — 🎭 と入れ替え
- 🎭 char (bottom:115px) — 📝 と入れ替え
- 🌙/🗺️/🌐 map-mode (bottom:60px) — 変更なし

### 変更ファイル
- noritetsu-map.html: `.record-fab` と `.char-fab` の bottom 値を入れ替え
- sw.js: CACHE_VERSION v321 → v322

---

## 169. v321 — prefOfStation の bbox 重複時バグ修正 (「八王子 東京」が 0 件落ちしていた真の原因) (2026-05-24)

### 背景

v320 で「v318 と同じ厳密モードに戻した」が、ユスケが Supabase で確認 → 八王子 trip の id 列はすべて埋まっていた (NULL なし)。一方 console で `resolveStationQuery("八王子 東京")` を見ると **`ids count: 0`**。

つまり「trip 側のバックフィル漏れ」が原因ではなく、resolveStationQuery 自体が東京の八王子を idSet に入れていなかった。

調査: prefOfStation(35.6557, 139.3389) を辿ると、八王子は **東京都と神奈川県の両方の bbox に入る**:
- 東京都 bbox: 35.5-35.9, 139.0-139.9 ✓
- 神奈川県 bbox: 35.1-35.7, 139.0-139.8 ✓

旧ロジックは「bbox 含む県のうち centroid 距離が最小」を採用していたため:
- 東京都中心 (35.69, 139.69) との距離² = 0.1244
- 神奈川県中心 (35.4, 139.4) との距離² = 0.0691 ← より近い

→ 八王子は **神奈川県判定** になる → `"神奈川県".includes("東京")` = false → idSet から落ちる → 「八王子 東京」が 0 件。

### 対処

[`js/13-mypage-common.js`](js/13-mypage-common.js): `prefOfStation` の bbox 重複時ロジックを **「面積最小の県を優先」** に変更。

```js
// 旧: centroid 距離が最小の県
// 新: bbox 面積が最小の県 (= より特定の県を優先)
let bestArea = Infinity;
for (const p of PREFECTURES) {
  if (!inBbox) continue;
  const area = (maxLat - minLat) * (maxLon - minLon);
  if (area < bestArea) { best = name; bestArea = area; }
}
```

八王子の場合:
- 東京都 bbox 面積 = 0.4 × 0.9 = 0.36
- 神奈川県 bbox 面積 = 0.6 × 0.8 = 0.48

→ 東京都が小さい → 東京都採用 ✓

### 設計判断

- **面積優先 heuristic の根拠**: 同じ bbox に入る複数県のうち、面積が小さい県の方が「その県を局所的に切り取った範囲」である可能性が高い (= 真の県境より bbox が広く張り出している副作用が出にくい)。境界付近の駅でも、「より局所的な県」が優先される。
- **影響範囲**: 13a-stats.js の「都道府県別 訪問駅数」「未訪問の都道府県」も同じ関数を使うので、これらの統計値も改善される (より正確に県を判定)。
- **限界**: bbox はそもそも粗い手法。本来は GeoJSON ポリゴン判定が正解だが、データサイズと処理コストが大きい。Phase 4 / GeoJSON 連携と一緒に再検討。

### 動作確認

- マイページ → 🚃 旅程 → 「八王子 東京」入力 → 東京の八王子の trip がヒット (ユスケ実機で確認待ち)
- 「八王子」だけ → 全国の八王子含む trip がヒット (従来通り)
- 「高松 香川」 → 香川の高松の trip だけヒット (v320 から変更なし)
- 13a-stats の都道府県統計も同じロジックを使うため、八王子・町田・神奈川県北部など bbox 重複地域の判定が改善
- npm run check: 25/25 OK

### 残作業

- 別途、id 列が NULL の 5 件の古い trip (蘇我/大網/館山/安房鴨川/立川/西国立) を補修する SQL (別 issue として記録)。pref モードでは影響するが、name モードでは fallback でヒットするため緊急性は低い。

---

## 168. v320 — 駅名+都道府県検索を v318 の厳密モードに戻す (v319 で混入した同名異所駅を排除) (2026-05-24)

### 背景

v319 で pref モード時にも name fallback を有効化した結果:
- ユスケの実機で「高松 香川」検索: 香川の高松 (予讃線) ・石川の高松 (七尾線) ・東京の高松 (多摩モノレールの通過駅) すべてヒット
- v318 では「予讃線 高松→宇多津」だけが綺麗に出ていた (id ベース厳密判定だったため)

「八王子 東京」が v318 で 0 件落ちした真の原因は、name fallback off ではなく **trip 側の `from_station_id` / `to_station_id` / `seg.from_id` / `seg.to_id` が NULL のままバックフィル漏れしていた** こと。fallback を緩めたことで他の同名異所駅まで巻き込んでしまったため revert。

### 対処

predicate を v318 と同じ厳密モードに戻す:

```js
(name, id) => {
  if (id && ids.has(id)) return true;
  if (hasPrefFilter) return false;  // pref モード時は id only
  return !!name && name.includes(nameToken);
}
```

13b-trips.js / 16-memos.js 両方で同じ修正。resolveStationQuery (v319 で新設) のシグネチャは維持。`names` Set は今後 fallback を再検討する余地のために残すか撤去するか、Phase 4 (name 列廃止) と一緒に判断。

### 設計判断

- **同名異所駅の混入 vs 一部 trip の脱落** のトレードオフで、ユスケは「混入を嫌う」方を選択 (ユスケ確認済)。Phase 2/3 完成形の姿に近い挙動。
- **データ補修の段取り**: ユスケに以下を確認してもらう:
  1. 駅名フィルタを「八王子」だけにして何件出るか (= name fallback でヒットする trip 数)
  2. Supabase Table Editor で `norireco_trips` を開き、`from_station='八王子'` または `to_station='八王子'` の行で `from_station_id` / `to_station_id` 列が NULL になっているレコードを特定
  3. seg.from_id / to_id (jsonb 内部) はもっと深いので、必要なら別の SQL クエリで調査
- **将来の根本対応**: Phase 4 (name 列廃止) と同時に、id 列のバックフィルを完璧に完了 → fallback 自体が不要になる。

### 動作確認

- マイページ → 🚃 旅程 → 「高松 香川」入力 → 予讃線の trip だけ残ることを確認 (v318 と同じ挙動)
- 「八王子」だけ → name fallback で全国の八王子含む trip がヒット (v318/v319 と同じ)
- npm run check: 25/25 OK

### 残作業

- ユスケが Supabase で id 列 NULL の trip を特定 → SQL で補修 (例: `UPDATE norireco_trips SET from_station_id = 's_NNNNN' WHERE id = '...'`) もしくは frontend 経由のリスキャン
- それが完了すれば「八王子 東京」も id ベース厳密でヒットするはず

---

## 167. v319 — 駅名+都道府県検索の fallback バグ修正試行 (「八王子 東京」が 0 件になる問題) (2026-05-24)

### 背景

v318 で「八王子 東京」検索を出したが、ユスケの実機で「フィルタ条件に合致する旅程がありません」になる。「八王子」だけは動く。

原因: v318 では pref モード時に `name fallback off` (厳密 id-only) にしていた。trip 側に `from_station_id` 列がある前提だったが、実際は v311 バックフィル後でも一部 trip (or seg 内の from/to) が id 列を持っていなかった (or NULL)。「八王子」だけだと name fallback でヒットしていたのが、pref モードで fallback off になり 0 件落ち。

### 対処

`resolveStationQueryIds` (Set 返し) と `parseStationQueryTokens` を、新 API `resolveStationQuery(q)` (Object 返し) に統合:

```
{ ids: Set<string>, names: Set<string>, nameToken, prefTokens, hasPrefFilter }
```

- `ids` — v318 と同じ (pref 条件を満たす駅 id Set)
- `names` — 同条件を満たす駅 name Set (fallback 用に追加)

predicate を以下に変更:

```js
(name, id) => {
  if (id && ids.has(id)) return true;       // 厳密 id 比較 (新形式 trip)
  if (!name || !name.includes(nameToken)) return false;
  if (hasPrefFilter) return names.has(name); // pref 指定時は pref を満たす name 候補のみ
  return true;                               // pref 無し: 従来通り substring fallback
}
```

これで id 列が NULL のレガシー trip でも pref 検索が機能する。代償として「高松 香川」入力で trip.from_station="高松" の id 列 NULL trip は香川/石川/多摩 の区別不能 (いずれかが pref を満たせばヒット) — Phase 2/3 完了前の妥協。

callsite 修正:
- [`js/13b-trips.js`](js/13b-trips.js): `_stResult` 1 個に集約
- [`js/16-memos.js`](js/16-memos.js): 同じパターン

### 設計判断

- **resolveStationQueryIds → resolveStationQuery にリネーム**: v317 で公開した API だが、callsite が 2 つ + 同セッション内なので清算。Object 返却で `ids` / `names` / 各 token を一括取得できる方が呼び出し側も clean。
- **同名異所駅の厳密区別を諦めるトレードオフ**: 「香川の高松」だけほしいユスケで「石川の高松」trip もヒットする可能性が残る (id 列 NULL のレガシー trip だけ)。新規 trip (id 並行書き込み稼働中、v310〜) は idSet 経由で厳密判定されるため、時間経過とともに不一致は減る。
- **Phase 4 へのつなぎ**: trip / memo の name 列を廃止すれば fallback 自体が消えて常に厳密判定になる。それまでは「id があれば厳密 / 無ければ name + pref-candidate names」のハイブリッドが妥当。

### 動作確認

- マイページ → 🚃 旅程 → 「八王子 東京」入力 → 東京の八王子の trip がヒットすることを確認 (ユスケ実機で要確認)
- 「八王子」だけ → 全国の八王子含む trip (従来通り)
- 「高松 香川」「高松 石川」入力で結果が変わる (id 列ある trip は厳密、無いものは pref で絞り込み)
- npm run check: 25/25 OK

---

## 166. v318 — マイページ駅名検索を「駅名 都道府県」AND 検索に拡張 (2026-05-24)

### 背景

v317 で駅名検索を id 解決層経由にしたが、ユスケから「同名異所駅 (高松 香川/石川/多摩 など) を都道府県で絞れると便利」との要望。

UI 制約として、駅名フィルタの入力欄を 2 つに分ける (駅名 + 都道府県セレクト) と画面が重くなる。1 つの入力欄でモード切替できる方が直感的:
- "八王子" → 駅名のみ (北八王子・京王八王子・香川の八王子 等すべて)
- "八王子 東京" → 駅名 AND 都道府県

### 対処

**13-mypage-common.js**

- `PREFECTURES` / `prefOfStation(lat, lon)` を 13a-stats.js から本ファイルに移動 (駅名+都道府県検索と 13a 統計タブ「未訪問都道府県」両方で使うため共通化)。
- `parseStationQueryTokens(q)` を新規追加 — 半角/全角空白で分解し `{ nameToken, prefTokens, hasPrefFilter }` を返す。
- `resolveStationQueryIds(q)` を都道府県トークン対応に拡張:
  - 駅名トークンで name.includes() → 候補駅
  - 都道府県トークンが ≥1 個あれば `prefOfStation(ms.lat, ms.lon)` で県名解決 → 全 prefToken が含まれる駅のみ採用 (AND)
  - 結果は id Set。

**13b-trips.js / 16-memos.js**

- `parseStationQueryTokens` を import、predicate を以下のロジックに:
  - `id && idSet.has(id)` → ヒット
  - 都道府県トークン有 → そこで終了 (fallback off、厳密モード)
  - 都道府県トークン無 → `name.includes(nameToken)` に fallback (id 列なしの旧データ救済)

**UI**

- 旅程タブ / メモタブの駅名 input の placeholder を「例: 八王子 / 八王子 東京」に、title 属性で「駅名のみ / 駅名 都道府県 (空白区切り、AND 検索)」のヒント追加。

**13a-stats.js**

- PREFECTURES / prefOfStation の自前定義を削除し、13-mypage-common から import に変更。

### 設計判断

- **入力欄 1 つ案 vs 2 つ案**: 都道府県専用 select を別途置く設計も検討したが、UI 縦幅が増える + 47 + 「すべて」の 48 オプションがダルい + マイページの IME composition 安全 (v286.1) を保ちたい → 1 input + 空白区切りに。"八王子 東京都" でも "八王子 東京" でも `prefToken.every(t => pref.includes(t))` で動く (substring AND)。

- **fallback off の根拠**: prefecture 判定は lat/lon ベース、trip / memo 側の name 列だけでは pref が分からない。pref 指定時に name fallback を残すと「trip の id 列が無い & name match」のレガシーが pref 無視で漏れてしまう。Phase 2-b で trip 125 件全バックフィル済 / Phase 3-d で memo は新規のみ id 並行書き込み (既存 3 件は NULL fallback 想定) という現状では、pref 指定時に fallback を切るデメリットは limited (既存 3 件のみ)。

- **PREFECTURES 移動の影響**: 13a-stats.js のローカル import に変えただけなので機能影響なし。13-mypage-common は他多数から import されているので循環参照リスクをチェック (13a → 13-common は既存方向、逆方向は無し) → OK。

- **同名 substring の落とし穴**: 「香川県」と「香川」の関係 — pref トークンが "香川" でも `pref.includes("香川")` で `香川県` がマッチする。「東京」でも `東京都` がマッチする。OK。逆に "京" だけ入力すると `東京都` / `京都府` 両方ヒット (AND マッチなので 1 県だけほしいなら "東京" or "京都" と入力)。

### 動作確認

- マイページ → 🚃 旅程 → 駅名フィルタに「八王子 東京」入力 → 東京の八王子の trip だけ残る (香川の八王子は除外)
- 「八王子」だけ入力 → 全国の八王子含む駅 (北八王子・京王八王子 等) で trip が引ける
- マイページ → 📸 メモ → 同様に動く
- npm run check: 25/25 OK

### 残作業

- Phase 4 (name 列廃止) の計画と SQL migration 設計

---

## 165. v317 — 駅 ID 体系 Phase 3-e 仕上げ: 駅名検索 id 解決層 + slVisitCount を SERVICE_LINES + id ベース化 (2026-05-24)

### 背景

v316 で 13a-stats の visitCount を id 化したが、Phase 3-e の残作業として:
- マイページ駅名検索 (`13b-trips.js` / `16-memos.js`) の substring → trip/memo の name 列だけを見る経路
- `04b-ride-record.js` の slVisitCount が LINES (旧 N02) ベース駅名キー集計

がまだ Phase 1〜2 の id 体系から外れていた。同名異所駅 (高松 香川/石川/多摩 等) や、08-rendering / キャラモーダルの個人化 Lv 判定が name 経由なので、同名駅で偶発ヒット・カウント混入の余地が残る。

### 対処

**マイページ駅名検索を id 解決層経由に**

- [`js/13-mypage-common.js`](js/13-mypage-common.js): `resolveStationQueryIds(q)` を新規 export 追加 (MERGED_STATIONS の name.includes(q) で駅 id Set を返す)。
- [`js/13b-trips.js:applyTripFilters`](js/13b-trips.js): `_stIdSet` を filter() の外で 1 回だけ計算 (毎 trip で 9,017 駅ループを避ける)、predicate を `(name, id) => (id && idSet.has(id)) || (name && name.includes(q))` に変更。trip 側の `*_station_id` があれば id 比較、無ければ name fallback。
- [`js/16-memos.js:applyMemoFilters`](js/16-memos.js): 同じパターン。`m.station_id` (v315〜) があれば idSet、無ければ name fallback。

**slVisitCount を SERVICE_LINES + 駅 id ベースに**

- [`js/04b-ride-record.js:rebuild`](js/04b-ride-record.js): 旧 N02 LINES ベースの `slVisitCount[stName]++` を撤去。v298 の SERVICE_LINES 駅順展開ループ内で `slVisitCount[st.id]++` を追加 (slRiddenSt と同じ駅集合で +1)。
- [`js/08-rendering.js`](js/08-rendering.js): 駅 marker と `openCharModal` の `slVisitCount[ms.name]` → `slVisitCount[ms.id]` に変更 (2 箇所)。
- [`js/13a-stats.js`](js/13a-stats.js): v316 のコメント (「slVisitCount は LINES ベース据え置き」) を v317 状態に更新。

### 設計判断

- **id Set 計算は filter ループ外に出す**: `resolveStationQueryIds` は MERGED_STATIONS 9,017 駅を走査する O(N)。filter callback 内で trip 毎に呼ぶと O(N*M) (trip 125 件 × 9,017 = 1.1M 比較) になる。`applyTripFilters` 関数冒頭で 1 回だけ計算する形に。

- **predicate の fallback 順序**: `id && idSet.has(id)` を先にチェック → name.includes() に fallback。これで「id 列があるが name 列が NULL」のエッジケースでも拾える (現状はほぼ無いが、Phase 3 完了に向けて name 列廃止する伏線)。

- **slVisitCount は seg 単位の重複カウント**: 旧 N02 ベースは「1 seg を resolve した path 上の全駅で +1」(ジャンクション介在で 2 N02 路線にまたがると重複 +1 することあり)。新 SL ベースは「1 seg = 1 SL の駅順展開で +1」(seg.lineId が指す 1 SL に限定済 v298 と同じ方針)。結果として **同じ trip でジャンクション駅が +2 されていた挙動が +1 に正規化**。個人化 Lv 判定は閾値ベース (1/5/10/50回) なので軽微にレベルダウンする駅が稀に出る可能性あり (実用上問題なし)。

- **slStopType は name キーのまま**: v186 の自動派生 (alighted/boarded/passed) は name で十分機能していて、08-rendering の参照も `slStopType[ms.name]` ベース。id 化するメリットが薄いので touching せず据え置き。Phase 3 完了 (name 列廃止) と一緒にやる方が効率的。

### 動作確認

- マイページ → 🚃 旅程 → 駅名検索に「八王子」入力 → 始点/終点/乗換/通過で旅程が引ける
- マイページ → 📸 メモ → 駅名検索が機能する
- 地図 → ズームインで駅 marker が個人化 Lv 表示 (visits バッジ / キャラ) が出る
- キャラモーダルの「N回訪問」表示が正しい
- npm run check: 25/25 OK

### 残作業 (Phase 3 全完了まで)

- `norireco_trips` / `characters_master.json` / `norireco_memos` の name 列を最終撤去 (id 列だけで動くと確認後)
- slStopType の id 化 (name 列廃止と同時)
- LINES (lines-p1〜p4.json) の stations[].id 付与 (将来 N02 路線レベルの id 統一が必要になれば)

---

## 164. v316 — 駅 ID 体系 Phase 3-e 部分: 13a-stats visitCount を id 化 + dev-backfill 撤去 (2026-05-24)

### 背景

Phase 3 cleanup の小規模・低リスク部分を一括で。

調査で判明したこと:
- **slRiddenSt の name fallback** は既に Phase 1 (v293〜v300) で撤去済 — 残課題なし
- **04b-ride-record.js の slVisitCount** は LINES (旧 N02、stations[].id 未付与) ベースなので、touching すると別 refactor を引きずる → 据え置き
- **13a-stats.js の visitCount** は SERVICE_LINES (stations[].id 付与済 v293) ベースなので clean に id 化可能
- **20-dev-backfill.js** は v311 の一度限り dev コード、ユスケが v311 でバックフィル完遂済 → 撤去 OK

### 対処

**visitCount を id キーに移行**

- [`js/13a-stats.js:collect`](js/13a-stats.js): `tripStations` を駅名 Set → 駅 id Set に変更、`visitCount` のキーを id に。`slSet` / `visitedUnique` と同じ id 経路に統一。
- [`js/13a-stats.js:buildTopStations`](js/13a-stats.js): `snap.visitCount` のキーが id になったので、MERGED_STATIONS から `nameById` Map を作って表示時に id → name 解決。解決失敗時は id をそのまま表示 (フォールバック)。

**dev-backfill 撤去**

- `js/20-dev-backfill.js` を削除 (v311 で追加した一度限りの dev tool)。
- [`sw.js`](sw.js) STATIC_ASSETS から該当行を削除。
- [`noritetsu-map.html`](noritetsu-map.html) の `<script type="module" src="js/20-dev-backfill.js">` を削除。

### 設計判断

- **slVisitCount は据え置き**: LINES 側 (lines-p1〜p4.json) の stations[] には `.n / lat / lon / c / o / branch` のみで `.id` がない。Phase 1 で id 付与対象外だった。これを後付けで id 化するには lines-p\*.json の再生成 (merged_stations と lat/lon 一致で id 引き) が必要で範囲が広い。本セッションは見送り、Phase 3 残として記録。
- **20-dev-backfill.js の撤去タイミング**: v311 でユスケ実行後 (125 件 PATCH 成功)、全 trip が id を持つ状態。再実行が必要なケースは「v309 以前のデータが新たに発生する」ような状況だけで、現状では起きない。万一必要になったら git history から復元可能。

### 動作確認

- マイページ → 📊 統計 → 「駅 Top 10」が引き続き正しい駅名で表示されるか (id → name 解決)
- Devtools コンソールで `NORIRECO.dev` が undefined になっていることを確認 (撤去確認)

### 残作業 (Phase 3 全完了まで)

- マイページ駅名検索 (substring) を id 解決層経由に
- `04b-ride-record.js` の slVisitCount を SERVICE_LINES ベースに統一 (or LINES 側にも id 付与)
- 最終: trip の name 列廃止 + characters_master の name 列廃止

---

## 163. v315 — 駅 ID 体系 Phase 3-d: メモに station_id 列追加 + 並行書き込み + 読み込み id 優先化 (2026-05-24)

### 背景

Phase 2 で trip、Phase 3-a/b でキャラ、Phase 3-c で GPS 後追い認証を id 化した。残るは **メモ (norireco_memos)**。

ユスケから「メモは 3 件しかないのでバックフィル不要」との指示。新規メモから station_id を埋めていき、既存 3 件は name 列 fallback で動かす方針。

### 対処

**migration** [`supabase/migrations/v315_memo_station_id.sql`](supabase/migrations/v315_memo_station_id.sql):

- `norireco_memos` に `station_id TEXT` を `ADD COLUMN IF NOT EXISTS` で追加 (NULL 許容)
- 部分インデックス `idx_norireco_memos_user_station_id` (WHERE station_id IS NOT NULL)
- `NOTIFY pgrst, 'reload schema';`

**書き込みパス**:

- [`js/17-station-actions.js:onSaOpenMemos`](js/17-station-actions.js): `openStationMemoList` に `station_id: ms.id` を追加で渡す
- [`js/16-memos.js:openStationMemoList`](js/16-memos.js): args に station_id を受け取り `M.stationContext.station_id` に保存
- [`js/16-memos.js:addNewMemoForStation`](js/16-memos.js): `clickInfo.station.id` に station_id 伝播
- [`js/16-memos.js:saveMemoFromModal`](js/16-memos.js): newMemo に `station_id: ci.station?.id || null` を追加 (Supabase POST で並行書き込み)

**読み込みパス**:

- [`js/16-memos.js:openStationMemoList`](js/16-memos.js): `M.cache.filter` を「id があれば id 比較、無ければ name 比較」の fallback ロジックに
- [`js/16-memos.js:hasMemosForStation`](js/16-memos.js): 引数を `ms` オブジェクトに拡張、id 優先 + name fallback。旧シグネチャ (string) も互換維持

### 設計判断

- **バックフィルなし**: 既存 3 件は station_id NULL のまま。fallback で動くので致命的でないし、3 件なら必要なら手動で Dashboard から PATCH 可能。Phase 2 のように一括 dev ヘルパーを作るほどではない。
- **hasMemosForStation の旧シグネチャ互換**: 引数が string でも動くようにしてある。callsite が現状 grep で見つからなかった (v253 前後で駅シート統合により呼び出し元が消えた可能性) が、念のため。
- **路線メモには station_id を入れない**: 路線アクションシートからの「+ 新しい路線メモ」は `clickInfo.station = { n: null, id: null, ... }` で開くので、保存される memo の station_id も null。これは仕様通り (路線メモは駅情報を持たない)。

### 残作業

- ⚠ Supabase Dashboard で `v315_memo_station_id.sql` 実行 (ユスケ)
- 動作確認: 新規メモを駅から作成 → Supabase Dashboard で station_id 列が `s_NNNNN` に埋まっているか
- Phase 3-e: 集計 (slRiddenSt 構築) の name fallback 撤去 (Phase 2-d と一括)
- マイページ駅名検索 (v285〜v289) を id 解決層経由に
- 最終: name 列の廃止 + `js/20-dev-backfill.js` 撤去

---

## 162. v314 — 駅 ID 体系 Phase 3-c: GPS 後追い認証 (findStCoord) を id 対応に (2026-05-24)

### 背景

Phase 2 で trip に `from_station_id` / `to_station_id` が入ったので、GPS 後追い認証 (`retroactivelyVerifyTrip`) の駅座標解決も id 経由でやれば同名駅取り違えがなくなる。同名駅 (例: 高松 香川/石川/多摩) の旅程を後追い認証するときに、name 検索だと取り違える可能性があった (今までは leaflet が他の地域の駅座標を返してしまえば「現在地が遠すぎます」エラーで失敗するだけ、致命的ではないが正確性向上)。

### 対処

[`js/13b-trips.js`](js/13b-trips.js) の `retroactivelyVerifyTrip` 内ローカル関数 `findStCoord(name)` を `(id, nameFallback)` に拡張:

1. id があれば MERGED_STATIONS / SERVICE_LINES.stations から id 一致で検索
2. id が NULL もしくは見つからなければ name で fallback (バックフィル前の trip を救う)

呼び出しは `findStCoord(trip.from_station_id, trip.from_station)` / `findStCoord(trip.to_station_id, trip.to_station)` に。

### 設計判断

- **ローカル関数のまま**: `findStCoord` は `retroactivelyVerifyTrip` 内でしか使われないので、共通ユーティリティに昇格はしない。将来「id → 座標」の参照が他で必要になったら 02-data-loaders.js あたりに移動可能。
- **MERGED_STATIONS と SERVICE_LINES 両方フォールバック**: 既存の挙動 (両方探す) を踏襲。SERVICE_LINES.stations は v293 で id 付与済なので id 検索でも動く。

### 動作確認

- 既存の verified ではない trip で「📍 GPS で認証」ボタン → 駅座標解決して距離判定 → 半径 500m 以内なら verified=true に昇格

---

## 161. v313 — 駅 ID 体系 Phase 3-a/3-b: キャラデータと獲得判定の id 化 (2026-05-24)

### 背景

Phase 2 (v310〜v312) で trip データを id ベースに移行した。続いて駅キャラまわりも id 化する。

現状の問題:
- `characters_master.json` の `station_ids` フィールド名だが、中身は **駅名** (`["八王子"]`) — フィールド名と実体が不一致
- `obtainable_at` も駅名配列
- `stationCharMap` のキーが駅名
- これでは Phase 2 の trip id 化と接続できない (verified trip の `from_station_id` でキャラ判定できない)

### 対処

**3-a: `characters_master.json` schema_v2** [`characters_master.json`](characters_master.json)

- `station_ids` の中身を実 id (`["s_00060"]` 等) に置換。
  - 八王子 → `s_00060`、立川 → `s_00084` (merged_stations.json から確認済)
- 旧駅名は `station_names` フィールドに残置 (表示用 + name fallback 用)。
- 期間限定キャラの `obtainable_at` も id 化、旧駅名は `obtainable_at_names` に。
- `schema_version: 1 → 2` に bump。

**3-b: 消費側を id 対応に**

- [`js/02-data-loaders.js`](js/02-data-loaders.js): `stationCharMap` を **id と name の dual キー map** に。両方のキーから同じキャラ entry に到達 (消費側 `stationCharMap.get(ms.id)` / `.get(ms.name)` が両方動く)。
- [`js/03-characters.js`](js/03-characters.js):
  - `checkAndGrantCharacters` の `verifiedStations` を id + name の dual map 化 (trip.from_station_id / segments[].from_id も含めて格納)。
  - obtainable_at は id 優先で照合、無ければ name fallback。
  - Supabase `norireco_character_grants` の `station_name` 列は駅名で記録 (互換のため `station_names` の最初を引く)。
  - `tryGrantByGPS` の MERGED_STATIONS 検索を id 優先 + name fallback に。
- [`js/04-gps-location.js`](js/04-gps-location.js): `getObtainableCharactersAt(stationName)` → `getObtainableCharactersAt(ms)` に変更、`ms.id ∈ obtainable_at` または `ms.name ∈ obtainable_at_names` で判定。
- [`js/08-rendering.js`](js/08-rendering.js): `getObtainableCharactersAt(ms.name)` → `getObtainableCharactersAt(ms)` に。

### 設計判断

- **dual キー map 採用**: stationCharMap を id 単一キーにすると消費側 4 箇所すべてを `ms.id` 渡しに書き換える必要がある (`getStationCharacter(name)` 等の関数引数も)。dual map は entry が同じオブジェクト参照なので余分なメモリは数バイト、消費側互換性が保てる。
- **station_names フィールドを残す理由**: (1) Supabase の `norireco_character_grants.station_name` カラムが name ベース、(2) UI 表示 (「八王子駅で獲得」等)、(3) name fallback。Phase 3 全完了時に整理予定。
- **localStorage の駅選択 (`STATION_CHAR_PICK_KEY`) は name キーのまま**: dual map で hit するので変更不要。UI 個人化と「駅マスター id 体系」を分離。

### 動作確認

- 八王子・立川駅マーカーをタップ → アクションシートが今まで通り出る (stationCharMap dual map)
- 期間限定キャラの「📍 今ここ！」ボタンが MERGED_STATIONS 検索で動く (id 優先)
- 新規 verified trip 記録 → 自動キャラ獲得トーストが正しく出る

### 残作業

- 3-c: GPS 後追い認証 `findStCoord` を id 対応に
- 3-d: `norireco_memos` に `station_id` 列追加 + バックフィル + 書き込みパス
- 3-e: 集計 (slRiddenSt 構築) の name fallback 撤去
- 最終: `norireco_trips` / `characters_master.json` の name 列廃止、`js/20-dev-backfill.js` 撤去

---

## 160. v312 — 駅 ID 体系 Phase 2-c: 完全一致経路 (駅シート/地図駅クリック) の id 優先化 (2026-05-24)

### 背景

Phase 2-b (v311) で 125 件のバックフィルが成功し、全 trip が `from_station_id` / `to_station_id` + segments 各要素の `from_id` / `to_id` を持つ状態になった。続いて読み込み側を id 優先 + name fallback に切り替える。

ただし読み込み 5 パスのうち、今すぐ id 化が筋なのは **完全一致経路** だけ。理由:

- **完全一致** (`tripVisitsStation`): 地図駅クリック「この駅を含む旅程」、駅シート lazy fetch 一覧。`ms.id` が常に取れる → id 比較が一意で高速、同名駅問題回避
- **substring** (マイページ駅名検索): 自由入力なので id 化は意味なし → name のまま
- **キャラ獲得判定**: `characters_master.json` の `station_ids` がまだ駅名配列 → Phase 3 で id 化
- **GPS 後追い認証**: `findStCoord(name)` の name→座標変換は別フェーズ
- **集計 (`slRiddenSt`)**: Phase 1 で既に id ベース化済

### 対処

[`js/13-mypage-common.js`](js/13-mypage-common.js):

1. `tripMatchesAnyStation` の `predicate` を **`(name, id)` 2 引数** に拡張。既存の substring callsite (`13b-trips.js:241` `n => n.includes(q)`) は id を無視するだけで従来通り動く (callsite 変更不要)。
2. 通過駅展開 (sc.pass) でも `seg.from_id` / `to_id` を優先して `sl.stations` 内の index を解決、無ければ name fallback。
3. `tripVisitsStation` を `(trip, ms)` 引数に変更。`ms.id && trip.*_id` 両方ある時のみ id 比較、無ければ name 比較。

[`js/17-station-actions.js`](js/17-station-actions.js):

4. `getTripsAtStation(stationName)` → `getTripsAtStation(ms)` に変更。
5. 呼び出し 2 箇所 (`buildStationActionSheet` / `onSaShowTrips`) も `ms.name` → `ms` に。

### 設計判断

- **id 優先 + name fallback の二段構え**: バックフィル 100% 成功とはいえ、将来の編集や手動 patch ミスで id が NULL に戻る可能性は残る。fallback は安全弁。
- **predicate 引数拡張 vs 別関数化**: predicate を 2 引数に拡張する方が DRY (`tripMatchesAnyStation` 1 本で完全一致/substring 両対応)。別関数化は通過駅展開ロジックが二重実装になる。
- **マイページ駅名検索 (substring) を触らない**: 自由入力なので id 化のメリットがゼロ。Phase 2-d 以降 (name 列廃止) のときに駅名 → 候補 id[] 解決層を経由させる予定。

### 残作業 (Phase 2-d / Phase 3)

- 2-d: 集計の name 経由 fallback (slRiddenSt 構築の name match) を撤去 (Phase 3 と一緒可)
- Phase 3: characters_master の id 化、キャラ獲得判定の id 化、GPS 後追い認証の id 化、マイページ駅名検索を id 解決層経由に、`norireco_memos` の station_id 列追加
- 最終: `norireco_trips` の name 列削除 (代わりに stations master との JOIN で取得)

---

## 159. v311 — 駅 ID 体系 Phase 2-b: 既存 trip バックフィル用 dev ヘルパー追加 (2026-05-24)

### 背景

Phase 2-a (v310) で `from_station_id` / `to_station_id` 列を追加して並行書き込みは始まったが、v309 以前に作られた既存 trip の id 列は NULL のまま。Phase 2-c (読み込み id 優先化) を始める前に、既存 trip も id 化しておくとロジックが clean になる。

ユスケから「ひとつずつやっていきましょう」との指示。慎重派の進め方として、まず dry-run で対象件数と解決可否を確認 → 問題なければ本実行、の 2 段。

### 対処

新規 [`js/20-dev-backfill.js`](js/20-dev-backfill.js) を追加。一度限りの dev コード扱い (Phase 2 全完了時に撤去予定)。`19-drag-sort.js` が既存だったため番号を 20 に。

API: `NORIRECO.dev.backfillStationIds({ dryRun: true })` / `NORIRECO.dev.backfillStationIds()`

resolve 戦略 (saveMultiSegmentTrip と同じ):
1. `trip.segments[].lineId` → SERVICE_LINES から検索 → `stations[]` 内 name match で **一意に id 解決** (同名駅問題なし)
2. 1 が失敗したら MERGED_STATIONS の name match で **fallback** (同名駅は最初の hit)
3. trip 全体の `from_station_id` / `to_station_id` は segments の最初/最後の id を優先、無理なら trip.from_station / to_station から fallback

返り値: `{ updated, skipped, partial, failed, failures }` — 失敗 / 部分解決リストはコンソールに出して原因追跡可能。

### 使い方 (ユスケ作業)

ログイン状態で <https://norireco.app> を開いてマイページか地図画面を一度開いてから (SERVICE_LINES / MERGED_STATIONS の読込待ち)、Devtools コンソールで:

```js
// 1. dry-run で対象件数確認
await NORIRECO.dev.backfillStationIds({ dryRun: true });

// 2. 問題なければ本実行
await NORIRECO.dev.backfillStationIds();
```

Supabase Dashboard で `from_station_id` / `to_station_id` 列が埋まっていれば成功。

### 設計判断

- **dev コードを本コードベースに置く**: 1 回限りの使い捨てだが、ユスケが console から手作業実行する性質上「コードレビュー可能な状態でデプロイ」が安全。実行後に Phase 2 完了タイミングで撤去すれば良い。
- **dryRun オプション**: 件数や PATCH 内容を実行前に確認できる安全策。
- **partial 追跡**: from のみ resolve できたとか、to が同名駅取り違えで間違ってる可能性があるケースを後で個別確認できるよう、PATCH には進めつつ報告だけ残す方針。

### 残作業

- ⚠ ユスケが <https://norireco.app> で console 実行 (dry-run → 本実行)
- Phase 2-c (読み込み id 優先化) は別セッション
- Phase 2 全完了時に `20-dev-backfill.js` 撤去

---

## 158. v310 — 駅 ID 体系 Phase 2-a: trip データに `*_station_id` 列追加 + 並行書き込み開始 (2026-05-24)

### 背景

Phase 1 (v290〜v306) で `merged_stations.json` 全 9,017 駅に `s_NNNNN` id を付与し、SERVICE_LINES の `stations[]` にも伝播、集計・描画判定 (slRiddenSt 等) は id ベース化した。

しかし **trip データ本体 (Supabase `norireco_trips`)** はまだ name 文字列ベース。すなわち:

- `trip.from_station` / `trip.to_station` — 駅名文字列
- `trip.segments[].from` / `.to` — 駅名文字列

これでは同名駅 (例: 「府中」=東京/広島) の取り違えや、駅名表記揺れの保守が脆い。Phase 2 で trip も id ベースに移行する。

### Phase 2 の段階分け

| 段階 | 内容 |
|------|------|
| 2-a (本セッション) | 列追加 + 並行書き込み (新規 trip は name + id 両方書く、読み込みは name 優先のまま) |
| 2-b | 既存 trip のバックフィル (SQL or 一度限り js スクリプト) |
| 2-c | 読み込み (tripMatchesAnyStation / キャラ獲得 / GPS 後追い認証) を id 優先 + name fallback に |
| 2-d / Phase 3 | name 列の最終撤去 |

### 対処 (2-a)

1. **SQL migration** [`supabase/migrations/v310_trip_station_ids.sql`](supabase/migrations/v310_trip_station_ids.sql) を新規追加。
   - `norireco_trips` に `from_station_id` (TEXT) / `to_station_id` (TEXT) を `ADD COLUMN IF NOT EXISTS` で追加 (NOT NULL 制約なし — バックフィルまで NULL 許容)。
   - 部分インデックス (`WHERE IS NOT NULL`) を 2 本作成。
   - `segments` JSONB は schema 変更不要 — 各要素に `from_id` / `to_id` を JSON 側で同居させる。
   - 末尾に `NOTIFY pgrst, 'reload schema';`。
2. **書き込み修正** [`js/07-record-mode.js:saveMultiSegmentTrip`](js/07-record-mode.js):
   - tripSegments 構築時、`seg.line.stations[fromIdx].id` / `[toIdx].id` を取り出して `from_id` / `to_id` として埋める (seg.line が特定済みなので同名駅問題に当たらず一意に id 化できる)。
   - trip 全体の `from_station_id` / `to_station_id`:
     - 通常: 最初の segment の `from_id` / 最後の segment の `to_id`
     - isVisitOnly: `R.selection[0]` の lat/lon + name で MERGED_STATIONS を絞り込んで id を引く
   - `tripForSupabase()` は notes / delay_minutes だけ除外する仕様なので、新列は自動的に Supabase に送られる。

### 設計判断

- **同名駅問題の回避**: trip 全体の始終駅 id を「最初/最後の segment の id」から取ることで、lineId 経由で一意に解決できる。MERGED_STATIONS 全体から name 検索するアプローチだと「府中」「中野」など同名駅で誤マッチするため避けた。
- **NOT NULL 制約を付けない**: バックフィル前は既存 trip が NULL を持つため。2-b バックフィル完了後に NOT NULL に昇格させる予定。
- **読み込み側は触らない**: 2-a の責務は「並行書き込みを始める」だけ。既存 trip の name 経路は壊さない。

### 残作業

- ⚠ **Supabase Dashboard で `v310_trip_station_ids.sql` を実行する** (ユスケ作業)。実行しないと Supabase POST 時に存在しない列を送ることになるが、PostgREST は不明な列を黙って捨てる挙動なので致命的ではない (が、id が保存されないだけ)。
- Phase 2-b (バックフィル) / 2-c (読み込み id 優先化) は別セッションで。

### saveTripEdit (旅程編集) との関係

`13b-trips.js:saveTripEdit` は segments / from_station / to_station を編集しないため、既存 trip の `from_station_id` / `to_station_id` も触らない。バックフィル後は値が保たれる。

---

## 157. v309 — 駅シート「この駅を含む旅程 (マイページ未読込)」を lazy fetch 化 (2026-05-24)

### 背景

v282 で導入した駅アクションシートの「🚃 この駅を含む旅程」は `NORIRECO.mypage.state._mypageCache` を参照する設計だった。`_mypageCache` は `renderMypage()` が初めて呼ばれる (= マイページタブを初めて開く) まで `null` のままなので、「マイページタブを一度も開いていない状態で駅をクリックすると、ボタンに『(マイページ未読込)』と出てタップしても旅程一覧は出ない」状態になっていた。

ユスケから「塩崎駅で『この駅を含む旅程 (マイページ未読込)』だけ出てしまう、これは Phase 2 の話?」との指摘。Phase 2 (駅 ID 体系) とは無関係で、純粋に UX 設計の話 — タブ未開封ガードを「ボタンタップで初期化する」モデルに切替。

### 対処

- [`js/13-mypage-common.js`](js/13-mypage-common.js) に `loadMypageTripsIfNeeded()` を新規追加。
  - `MP._mypageCache` がすでに array なら no-op。
  - 未ログインなら null を返す (キャッシュは触らない)。
  - そうでなければ `renderMypage` と同じ Supabase fetch + localStorage merge を行い、`MP._mypageCache` に詰めて返す。完乗率カードやサブタブ描画はしない (純粋にデータだけ)。
- [`js/17-station-actions.js`](js/17-station-actions.js):
  - `onSaShowTrips()` を async 化、`_mypageCache` が null なら `loadMypageTripsIfNeeded` を await してから一覧描画。
  - `renderTripListInSheet` に `'loading'` 状態を追加 (📡 読み込み中表示)。
  - ボタンラベル「(マイページ未読込)」→「(タップで読み込み)」に変更してユーザーアクションを示唆。
  - 「読込失敗 / 未ログイン」時はその旨を表示する案内に整理。

### 設計判断

- **案 A (採用): タップ時 lazy fetch**
  - メリット: 起動時の余分なデータ転送なし、見た目で「タップで読み込み」と分かる
  - デメリット: 最初のタップでワンテンポ遅延 (Supabase 往復 1 回)
- **案 B: 起動時 background load**
  - メリット: 操作感が最も滑らか
  - デメリット: 駅シートを使わないユーザーにも常時 fetch が走る (転送量増)
- **案 C: 現状維持 + TODO 化**
  - メリット: 一切手を入れない
  - デメリット: UI 上「マイページタブを開いて戻ってきてください」と暗黙に求めるのは不親切

ユスケ判断で **A 採用**。

### renderMypage との DRY について

`renderMypage` 内の fetch + localStorage merge ブロックと `loadMypageTripsIfNeeded` は似ているが、`renderMypage` は SERVICE_LINES.build() と並列、完乗率カード描画、サブタブ描画など他の責務と絡んでいるため、現時点では別ロジックとして併存させた。スキーマ拡張 (notes / delay_minutes の Supabase 列化) のときに両方とも一緒に整理する。

---

## 156. v308 — 小さい駅のクリック問題 残課題: polyline click が delegate を奪う件を修正 (2026-05-24)

### 背景

v304〜v306 で `map.click` delegate (40px 円内の最寄 MS を駅アクションに) を入れて「Canvas tolerance 不発環境」を救ったが、ユスケから **まだクリックが効かない駅がある** との報告。

### 原因

[`js/08-rendering.js`](js/08-rendering.js) `attachLineClick` (v283 で導入された路線 polyline クリックハンドラ) が、クリック直後に **無条件で `L.DomEvent.stopPropagation(e)`** してから路線アクションシートを開いていた。

その結果、

1. ユーザーが「小さい駅 (circleMarker) の上に重なる路線 polyline」をタップ
2. Canvas tolerance (v301 で 16/12 まで拡張) を超えて circleMarker は反応せず
3. polyline (SVG) が click を拾う → `stopPropagation` で `map.click` delegate (40px) に到達しない
4. **駅は選ばれず、路線アクションシートだけが開く**

= ユーザー体感としては「小さい駅をタップしたのに開かない / 路線シートだけ出る」。

### 対処

`attachLineClick` の handler 先頭でも `06-map-leaflet.js` の delegate と同じ「40px 円内最寄 MS」検索を行い、

- 近傍駅があれば → **駅アクションシート** を開いて `return`
- 無ければ → 従来通り **路線アクションシート**

これで「polyline の上に重なる小さい駅」もタップで開けるようになる。

### 設計判断

- **案 A (採用): polyline click 側で同じ近傍検索を最初に実行**
  - メリット: 既存の map.click delegate と同じロジックで一貫。9000 駅ループは click 時のみで実害なし
  - デメリット: 同じ検索が 2 箇所に存在 (delegate と polyline) → 後日 helper に括る余地あり
- **案 B: polyline click で stopPropagation を外す**
  - メリット: コード変更が小さい
  - デメリット: map.click delegate が必ず発火するため、近傍駅が無い場合に「ただ路線をタップしたのに駅検索だけ走る」副作用が出る
- **案 C: polyline の interactive を false** にする
  - 路線アクションシートが完全に死ぬので不可

A を採用。後で `findNearestStation(containerPoint, hitPx)` のような共通関数に括れば DRY 化できるが、現時点では 2 箇所なので展開のまま許容。

### 残課題

- v305 のように発火を console.log で確認するフェーズは省略 (v304 → v306 で delegate 自体は動作確認済み、今回は「polyline が delegate を奪う」のロジック問題のみ)。ユスケ側で動作確認後、問題なければそのまま閉じる。

---

## 155. v307 — セッション締め: TODO.md + STATUS.md 整理、Phase 2/3 を 🔥 に追加 (2026-05-24)

### 背景

2026-05-24 セッション (v279〜v306) を締めるにあたり、ドキュメント整合。

### TODO.md

- 完了済「**マイページ即時反映 + 駅/路線アクションシート + 駅名検索**」「**駅 id 体系 Phase 1**」を CHANGELOG 参照で完了状態に
- 🔥 最優先に「**駅 ID 体系 Phase 2: trip データに `*_station_id` 列追加 + Supabase 移行**」「**駅 ID 体系 Phase 3: memo / characters_master / 駅名検索の id 化**」を新規追加
- 用語見出し「**完乗率**」を「**完駅率 vs 完乗**」に整理 (v297 規約に追従)
- CACHE_VERSION 注記「(現在 v235)」を「最新値は STATUS.md 参照」(自動更新困難なので参照型に)

### STATUS.md

- 領域別ステータス表に 2 行追加:
  - v279〜v289 (即時反映 / アクションシート / 駅名検索 / memoMode 撤廃)
  - v290〜v306 (駅 id 体系 Phase 1 + 完駅率用語 + slRiddenSt 修正 + 駅クリック確実化)
- 直近フェーズの矢印を v306 まで延伸

### Notion §2.7 への記録は次セッションで

時間とトピック量からして次セッション冒頭に「駅 id 体系」「完駅率用語規約」「Canvas tolerance 不発環境対応 (map.click delegate)」を意思決定ログに記載するのが筋。

---

## 154. v306 — v304/v305 確認後のデバッグ console.log 撤去 (クリーンアップ) (2026-05-24)

### 背景

ユスケのスクショで武蔵増戸駅 (五日市線の小さい駅) のアクションシートが開いており、v304/v305 の map.click delegate (HIT_PX=40) が動作確認できた。ユスケから「小さい駅もタップできるようになった」確認も得たので、v305 で入れたデバッグ用 console.log を撤去。

### 変更

- [js/06-map-leaflet.js](js/06-map-leaflet.js): `console.log('[乗レコ map.click]'...)` の 2 箇所と `MERGED_STATIONS 未初期化` 警告を撤去
- ロジック自体は v304/v305 のまま (`map.on('click')` で 40px 以内最寄駅を `openStationActionSheet` に渡す)

### 駅クリック改修 v290〜v306 サマリ

| バージョン | 内容 | 結果 |
|---|---|---|
| v290 | Canvas tolerance: タッチ 10 / PC 6 | ユスケ環境で不発 |
| v301 | tolerance タッチ 16 / PC 12 | まだ不発 |
| v302 | radius 最小 5px 底上げ | 一部改善 |
| v303 | DOM hit area marker を全 circleMarker に追加 | 動くが描画が重い |
| **v304** | hit area 撤回 + map.click delegate (HIT_PX=30) | 軽い、まだ届かない |
| **v305** | HIT_PX 30 → 40 + デバッグログ | 動作確認 OK |
| **v306** | デバッグログ撤去 | クリーンアップ完了 |

---

## 153. v305 — HIT_PX を 40px に拡大 + 切り分け用 console.log (2026-05-24)

### 背景

v304 (map.click delegate, HIT_PX=30) でも小さい駅がタップできないとの報告。

考えられる原因の切り分け候補:
1. map.click が発火していない (polyline click が stopPropagation で握り潰し)
2. map.click は発火しているが HIT_PX 30 では届かない
3. 発火 + 検索成功しているが openStationActionSheet が動かない

### 修正 + 観測

- HIT_PX を 30 → **40px** に拡大 (混雑エリアでも誤検出は許容範囲のはず)
- 一時的に `console.log('[乗レコ map.click]', { hit, name, distPx })` を追加。DevTools Console で発火確認することで上記 3 つのどれかを切り分け可能に
- 安定したら次回コミットで撤去予定

### ユスケに確認してほしいこと

DevTools の Console を開いて小さい駅をタップしたとき:
- **ログが出ない** → polyline 等が click を握り潰している (case 1) → 別対策
- **ログが出る (hit: false)** → HIT_PX 40 でも当たらない (case 2) → さらに広げる or polyline 干渉対策
- **ログが出る (hit: true)** → openStationActionSheet 側の問題 (case 3) → 17 側のデバッグ

---

## 152. v304 — v303 撤回 → map.click delegate で最寄駅検索 (重い問題を解消) (2026-05-24)

### 背景

v303 で全 circleMarker 駅に DOM hit area marker を重ねた結果、マーカー数が約 9000 → 18000 になり地図描画が重くなった。ユスケから「めっちゃおもい」報告。

### 修正

v303 の hit area marker 追加を撤回 (マーカー数を元に戻す) し、代わりに `map.on('click')` の delegate で「ピクセル距離 30px 以内の merged_station」を検索して `openStationActionSheet` を呼ぶ方式に切替:

- 多系統駅 (divIcon) は自前 click + `stopPropagation` するので `map.click` は発火せず干渉なし
- circleMarker 駅 (small dot) の周辺をタップしたときだけ delegate が拾う
- polyline (路線) クリックも `stopPropagation` 済 (v283)、線アクションシート維持
- 9000 駅全件ループは毎 click で走るが 1ms 未満なので問題なし

[js/06-map-leaflet.js](js/06-map-leaflet.js) の `M.instance.on('click')` を拡張。`js/08-rendering.js` から hit area 追加コードを撤去。CSS `.station-hit-area` も削除。

### 効果

- マーカー数は v302 以前に戻る → 描画性能回復
- 小さい circleMarker 駅でも 30px 以内なら click 取れる
- 既存の divIcon マーカー click は引き続き優先

### 残課題

- 30px 以内に複数駅がある場合 (混雑エリア) は最寄 1 駅のみ選択。意図しない駅が開く可能性は低いが要観察。
- 厳密には「現在表示されている駅 (LOD で priority <= visible)」だけを対象にすべきだが、現状は全 9017 駅対象 (ズームアウト時に非表示の駅でも近ければ開く)。実用上気にならなければ放置。

---

## 151. v303 — Canvas circleMarker に透明な DOM hit area を重ねて click を確実に (2026-05-24)

### 背景

ユスケ決定的な観察: 「複数路線乗り入れている駅や何度も訪問している駅はクリックできる、最小ドット駅だけクリックできない」。

これらの大型マーカーは `L.marker({ icon: L.divIcon(...) })` (DOM 要素ベース) で描画されており click が効く一方、最小ドット駅は `L.circleMarker({ renderer: CANVAS })` (Canvas) で描画されており **環境によって Canvas tolerance が効かない** ことが原因と特定。

v290 → v301 → v302 で Canvas tolerance 拡大・radius 底上げを試したが、Canvas tolerance がそもそも効いていないので根本解決にならず。

### 修正

`L.CircleMarker` インスタンスの場合に限り、同じ座標に **透明な DOM hit area marker (divIcon, 22x22px)** を重ねて click を担保:

```js
if (dot instanceof L.CircleMarker) {
  const hitArea = L.marker([ms.lat, ms.lon], {
    icon: L.divIcon({ className: 'station-hit-area', html: '', iconSize: [22,22], iconAnchor: [11,11] }),
    interactive: true,
  });
  attachStationDotClickV2(hitArea, ms);
  dotLayerRef.addLayer(hitArea);
}
```

CSS: `.station-hit-area { cursor: pointer; background: transparent; }`

DOM 要素なので click が確実に取れる。divIcon は内容空でも 22x22 の click 範囲を持つ。

### Trade-off

マーカー数が circleMarker 駅の分だけ倍増 (約 9000 → 多めに見て 1〜2 万)。divIcon は HTML 空要素なので軽量だが、描画パフォーマンスへの影響を要観察。重ければ未乗車かつ最小サイズの駅だけに絞る等の追加最適化を検討。

---

## 150. v302 — 最小駅 circleMarker の radius を 5px で底上げ (タップ性確保) (2026-05-24)

### 背景

v290 → v301 で Canvas tolerance を増やしたが、ユスケ環境 (PC) で「最小ドットの駅だけタップできない、大きいドット駅は OK」とのこと。tolerance 12 が効くはずだが Leaflet バージョン依存か他の要因で不発の可能性。

### 修正

`circleMarker.radius` の最小値を 5px (= 直径 10px) で底上げ — tolerance より radius そのものを増やすほうが確実:

- 多系統 baseDot (line 718): `(ridden ? 5.5 : 4) * Math.min(1.4, mScale) * stypeMul` → `Math.max(5, ...)`
- 単系統/fallback (line 747): `(ridden ? 6 : 4) * mScale * stypeMul` → `Math.max(5, ...)`

stypeMul (passed=0.8) で 4 → 3.2px に縮む通過駅も最小 5px 保証。

### Trade-off

混雑エリアで微妙にマーカー密度が上がる可能性。ただし元々 4px と 5px の見分けは付かないレベルなので体感差は小さいはず。tolerance 12 はそのまま残置 (radius + tolerance で 17px の判定範囲)。

---

## 149. v301 — 小さい駅の click 判定範囲を更に拡大 (タッチ +16 / PC +12) (2026-05-24)

### 背景

v290 で `L.canvas({ tolerance: IS_TOUCH ? 10 : 6 })` を入れたが、ユスケ再報告で PC 環境でも小さい○の駅がクリックできないとのこと。PC tolerance 6px だと circleMarker radius 4px と合わせて click 範囲 10px 弱、まだ狭い。

### 修正

tolerance を増やす:
- タッチ: 10 → **16px**
- PC: 6 → **12px**

隣接駅同士で被るリスクは Leaflet が「後から add したマーカー」を優先するので、ridden / マルチ系統の派手なマーカーが勝ち、体感問題なし。

### 残課題

それでも当たらない場合は circleMarker の radius 最低値 (現状 4px) 自体を増やす対応もあり得る。まず tolerance だけで様子見。

---

## 148. v300 — v293 の修正漏れ: drawServiceLineBase の実線描画ループも id 化 (2026-05-24)

### 背景

v299 で `slRiddenSt` を正しく構築できるようになったが、ユスケのスクショで「路線実線が出ない、点線のみ」が継続。

### 原因

v293 で `slRiddenSt[sl.id]` を **駅 id Set** に変えたが、[js/08-rendering.js:573 / 584](js/08-rendering.js#L573) の **drawServiceLineBase 内の実線連続ラン描画ループ** だけ `rs.has(sl.stations[i].name)` のまま残っていた。id Set に対して name で `has()` を呼ぶので常に false → 実線が一度も描かれない。

v293 の grep で `slRiddenSt[*].has(` パターンは捕まえたが、`rs.has(` 単独だと他の Set との区別が付かず見落としていた。

### 修正

- [js/08-rendering.js:572-591](js/08-rendering.js#L572): 実線連続ランループの `rs.has(sl.stations[i].name)` を `rs.has(sl.stations[i].id)` に。null check (`!!stid &&`) も追加。
- 環状線 (circular) の wrap 判定も同様に id ベースに。

念のため `rs.has(` の全箇所を grep → 残りは v293 で id 化済みの行のみ確認。

### 学び

v293 で grep をかけたとき `slRiddenSt\[.*\]\.has\(` のパターンしか探さなかった。一旦 `const rs = slRiddenSt[...]` で束ねて `rs.has(...)` する箇所が漏れた。**Set の中身を変えるリファクタの grep は、参照先の局所変数名まで含めるべき** (今後の規約)。

---

## 147. v299 — v298 の副作用修正: resolve 経路を活用しつつ 1 SL のみに add (2026-05-24)

### 背景

v298 で `slRiddenSt` を「seg.lineId 直接 match + candidateN02Ids fallback」だけにしたら、旧 trip データの大半が `seg.lineId = "auto_中央線_東日本旅客鉄道"` のような N02 prefix 形式で、SL.id (例: `中央本線_東日本旅客鉄道`) にも candidateN02Ids にも直接マッチせず、**ほぼ全 SL が「乗車駅 0」扱い → 路線描画が全部点線**になっていた。

### 修正

resolve 経路 (`resolveByServiceLine` / `resolveServiceTrip` / `resolveSegments`) を活用するが、ばらまかず **1 SL のみに add** する三段構えに:

1. `seg.lineId === SL.id` 直接 match
2. `candidateN02Ids` に含む最初の 1 SL
3. resolve 結果 (parts) の `line.id` から `candidateN02Ids` 経由で最初の 1 SL を推定

targetSl 内で `seg.from/to` が見つかれば駅順展開、見つからなければ resolve 結果の駅名で targetSl 内を再照合 (旧 N02 形式 trip の救済)。

これで:
- v298 の意図 (八王子で中央線に乗ったら八高線・横浜線の八王子は未乗車のまま) は維持
- v298 の副作用 (全 SL 乗車なし → 点線のみ) を解消、resolve 経由の旧データも正しく拾える

---

## 146. v298 — slRiddenSt 構築をばらまき方式から「seg.lineId 直接 match」に統一 (2026-05-24)

### 背景

ユスケ要望: 「八王子で中央線に乗ったら、八王子 中央線だけ乗車判定にしたい。横浜線・八高線の八王子は未乗車のままに」。

### 原因

`slRiddenSt[sl.id]` 構築 ([js/04b-ride-record.js:299](js/04b-ride-record.js#L299)) が旧 ロジック (`candidateN02Ids` 経由で駅名一致して全 SERVICE_LINE にばらまく) のまま:

1. RIDDEN_SEGS → `riddenSt[N02 line id]` (駅名 Set) を構築
2. 各 SERVICE_LINE について `candidateN02Ids` の中から駅名を集めて、SL 駅と name 一致したら ridden 扱い

これだと「中央線の八王子」乗車 → `riddenSt[中央線_東日本旅客鉄道]` に「八王子」 → 八高線 SL の `candidateN02Ids` に中央線が含まれていなくても、駅名一致でばらまかれて八高線 SL の八王子も ridden 化されていた (実害: 駅マーカーの ridden 色判定、路線リストの完駅率計算)。

`globalStats` ([js/02b:181](js/02b-service-lines-builder.js#L181)) は v239 で `seg.lineId` 直接 match に変えていたが、`slRiddenSt` は変更漏れだった。

### 修正

`slRiddenSt` 構築を `globalStats` と同じ方針に統一:

- RIDDEN_SEGS を直接スキャンし、`seg.lineId === SL.id` でマッチした SL にのみ ridden 駅を add
- 旧形式互換 (seg.lineId が N02 id の trip データ) は `candidateN02Ids` fallback で最初の 1 SL だけ採用 (バラまかない)

これで:
- 中央線で八王子乗車 → SERVICE_LINE「中央本線」だけ ridden、八高線・横浜線の八王子は未乗車のまま
- 駅マーカー (08-rendering) の ridden 色判定は系統ごと正確に
- 路線リスト (`stats(sl)`) の完駅率も系統ごとの実態を反映

### 副次効果

旧バラまきロジックで膨張していた `slRiddenSt[sl.id].size` が圧縮される。マイページ路線タブで「ある路線の完駅率」が下がる可能性 (これが本当の値)。完駅率カードの分子 (globalStats 由来) は元から直接 match だったので変わらない。

---

## 145. v297 — 駅集計の指標名を「完乗率」→「完駅率」に整理 (2026-05-24)

### 背景

ユスケから「駅集計のほうは『完駅率』など、完乗率とは違う分かりやすい表現にしたい」との提案。従来は駅単位の指標も系統単位の指標も同じ「完乗率」ラベルで、混乱の元だった。

### 用語整理 (今後の規約)

- **完駅率** = 乗車駅 / 全駅 (駅 id ベース、Phase 1 で 9,017 駅) — ユーザーが「どれだけ全国の駅を踏破したか」
- **完乗** = 1 系統を **完全に走破した状態** (本来の意味) — 「完乗 8」のように系統数で語る
- 「乗車系統数」 = 1 駅でも乗ったことがある系統数 — 「29 系統」のように

### 主な変更

- [noritetsu-map.html](noritetsu-map.html): ヘッダ右上の `h-pct` / `ms-pct` を「完駅率」、title 属性も更新
- [js/13a-stats.js](js/13a-stats.js):
  - メインカード「🟢 GPS 記録 完駅率」「⚪ 全記録 完駅率」
  - 詳細カード「運営会社別 完駅率」「地域別 完駅率」
  - 路線リスト個別表示「完駅率 ${r.pct}% (...)」
- [js/13-mypage-common.js](js/13-mypage-common.js): ローディング文言・未ログイン案内
- [js/14-share-ogp.js](js/14-share-ogp.js): シェア画像のタイトル「全国鉄道 完駅率」

### 残置 (意味的に正しい「完乗」)

- 「(完乗 0)」「(完乗 8)」のサブ行 — 完乗系統数を指すので残す
- 「完乗達成日」「完乗系統」のドキュメント記述 — 路線完全走破の意味で正しい
- meta description / og:description の「完乗率を可視化」 — 一般認知性優先で残置 (将来見直し可)

---

## 144. v296 — 運営会社別 / 地域別カードの解説に「合計は全国総駅数を超える」注記 (2026-05-24)

### 背景

ユスケから「運営会社別の合計が 9,017 を超える」が違和感との指摘。これは仕様 (乗り入れ駅は各社それぞれにカウント) だが、解説不足だった。

### 修正

`detailCard` の `ⓘ` ボタンで開く infoHtml に注記を追加:

- 運営会社別: 「東京駅は JR 東日本 + JR 東海 + 東京メトロ等それぞれにカウントされる」
- 地域別: 「新幹線駅は『首都圏』と『新幹線』両方にカウントされる」

数字 (集計ロジック) は変更なし。説明テキストのみ。

### 残課題

将来案として、合計が破綻しない「主運営会社で按分」「主地域で按分」設計もあり得るが、現状は「自社路線に乗ったか」が分かれば十分という判断で見送り。

---

## 143. v295 — 13a-stats.js の残り 6 箇所も駅 id ベース化 (Phase 1 完結) (2026-05-24)

### 背景

v294 で `buildCompletionCards` の `collect()` を id Set 化したが、これにより `snap.slSet[sl.id]` の中身が id Set に切り替わった結果、それを参照する **下流関数 6 箇所が整合性崩壊**していた:

- `buildByOperator` ([js/13a-stats.js:1238](js/13a-stats.js#L1238)): `unique` (name Set) と `ridden` (v294 で id Set 化) を比較 → 数字がデタラメ
- `buildByGroup` ([js/13a-stats.js:1265](js/13a-stats.js#L1265)): 同様
- `buildPrefectureChart` ([js/13a-stats.js:1047](js/13a-stats.js#L1047)): `for (const name of set) sl.stations.find(s => s.name === name)` → `set` の中身が id なので find が失敗、ridden 数が常に 0

ユスケのスクショで「東日本旅客鉄道 4/1534」が表示されたのはこの状態。

### 修正

13a-stats.js の駅集計箇所 6 件すべてを id Set 化:

| 場所 | 関数 | 変更 |
|---|---|---|
| line 641 | 訪問駅履歴 stData | `tripStations` を Map<id, name> 化、stData のキーを id に。表示用 name は value に保持 |
| line 706 | 路線別 lineData | `lineData[sl.id].stations` を id Set 化 |
| line 845 | 日付別駅数 stationsByDate | `stationsByDate[date]` を id Set 化 |
| line 1032 | 都道府県マスター byPref | `byPref[pref]` を id Set 化 |
| line 1054 | 都道府県チャート visitedByPref | `snap.slSet` (id Set) を id でループ、`sl.stations.find(s => s.id === stid)` に変更 |
| line 1237 | 運営会社別 byOp | `unique` も id Set 化 |
| line 1264 | 地域別 byGroup | `unique` も id Set 化 |

### 効果

すべての統計カードで:
- 分母 (全駅 / 運営会社別駅数 / 都道府県別駅数 等) が同名異所を別駅としてカウントするようになり、正確値に
- 分子 (ridden) と分母 (unique) が同じ id 空間で比較されるようになり、整合性が回復

### 残課題 (Phase 2 / Phase 3)

- trip データ自体 (`from_station` / `to_station` / `segments[].from` / `to`) は引き続き name 保存 — Phase 2 で id 化 + Supabase 移行
- memo の `m.station` も name のまま — Phase 3
- characters_master.json の `station_ids` も name 配列 — Phase 3

---

## 142. v294 — v293 抜け修正: マイページ完乗率カードも id ベース化 (2026-05-24)

### 背景

v293 デプロイ後、ユスケのスクショで「完乗率カードの分母が 8,491 のまま」を確認。`globalStats()` は id 化したが、マイページの完乗率カード ([js/13a-stats.js:36 `buildCompletionCards`](js/13a-stats.js#L36)) は **独自実装で name ベース集計**しており、分母が変わっていなかった。

ヘッダの「3% / 29 系統」(画面右上) は `globalStats()` 由来で正しく動作していたが、マイページのカード (画面中央) は別経路。

### 修正

`buildCompletionCards` の `collect()` 内集計を id ベース化:

- `allUniqueStations.add(s.name)` → `if (s.id) ... add(s.id)`
- `visitedUnique.add(name)` → `if (st.id) ... add(st.id)`
- `slSet[sl.id].add(name)` → `add(st.id)`
- `visitCount` の key は名前のまま (他の統計カード [v641 / v706 / v845 / v1032 / v1237 / v1264] と互換性を保つため、`tripStations` は引き続き name Set)

### 残課題

13a-stats.js には他にも `add(sl.stations[i].name)` パターンが 6 箇所あり (運営会社別 / 地域別 / 都道府県別 / 路線別 etc)。これらは Phase 3 で順次 id 化予定。今回は画面トップの完乗率カードだけ正常化。

---

## 141. v293 — 駅 id 体系を導入 Phase 1 (集計・描画を駅名→駅 id 化、同名異所を正しく区別) (2026-05-24)

### 背景

ユスケ気づき: 「高松」が 3 駅 (香川県 JR / 石川県 JR / 多摩都市モノレール) あるのに `name` Set で集約されていて 1 駅扱いになっていた。同様の同名異所が約 526 駅あり、完乗率分母が 8,491 (本来 9,017) と過小。グローバル展開・廃線・AI 自動列車判定など将来要件すべてに影響する根本問題。

ユスケ「将来的に考えると駅 ID ベース化が一番いい」「今やる」の判断で着手。

### Phase 分割

- **Phase 1 (本コミット)**: 駅マスター + 集計 + 描画判定を id 化。trip / memo データ層には触らない (既存 trip データは `seg.lineId + from/to` 経由で id 解決される互換構造)。
- **Phase 2 (次セッション以降)**: trip データに `from_station_id` / `to_station_id` / `segments[].from_id` / `to_id` 列追加 + Supabase 移行 + 新規記録パスで id 付与。
- **Phase 3**: memo + キャラ + 駅名検索周りの id 化。

### Phase 1 の変更

ID 形式: `s_NNNNN` (5 桁ゼロパディング連番、ユスケ承認)。

- [merged_stations.json](merged_stations.json): 全 9,017 駅エントリに `id: "s_NNNNN"` を順序ベースで付与 (Node script で一括)。新規駅は末尾に append、削除は deprecated フラグで id 永続化。
- [js/02b-service-lines-builder.js](js/02b-service-lines-builder.js):
  - `build()` 内で merged_stations から (name → \[駅 entry\]) の逆引き map を作り、SERVICE_LINES の各 stations[i] に `.id` を付与。同名異所 (高松 3 駅等) は座標で最近接の id を選ぶ。
  - `globalStats()` の `allStations` / `riddenStations` / `slSet[sl.id]` を name Set → id Set に切替。id が無い駅 (極稀) は集計から除外。
- [js/04b-ride-record.js](js/04b-ride-record.js): `slRiddenSt[sl.id]` を name Set → id Set に変更 (構築元の `riddenSt` (N02 keyed) は引き続き name ベース)。
- [js/08-rendering.js](js/08-rendering.js): 駅マーカー描画の ridden 判定 3 箇所 (`attachStationDotClickV2` 前段の乗車判定 / tooltip ✓ / キャラモーダルの「✓ 乗車」表示) を `rs.has(ms.name)` → `rs.has(ms.id)` に切替。
- [js/04-gps-location.js](js/04-gps-location.js): `drawObtainableIndicators` のマップ表示モード判定も同様に id ベース化。
- [STATUS.md](STATUS.md): カバレッジ表「駅（ユニーク） 8,491」→「駅（国土地理院 N02 ベース） 9,017」。

### 期待される動作変化

- 完乗率の **分母が 8,491 → 9,017** に増える (本来の駅数)。ユーザーの ridden 駅数は当面ほぼ変わらないので、完乗率の数字は微妙に下がる可能性あり (これが正しい値)。
- 同名異所駅 (例: 香川の高松だけ踏破) で他の同名駅マーカーが誤って ridden 色になる現象が解消される。

### 残課題 / 既知の制約 (Phase 2/3 で解決予定)

- trip データ (`from_station` / `to_station` / `segments[].from` / `to`) は引き続き name 保存。集計は seg.lineId 経由で id 解決するため動くが、`trip.from_station = "高松"` だけ見ても香川か多摩か判別不能。
- memo の `m.station` も name のまま。マイページ駅名検索 (v285〜v289) でも 3 つの高松を区別できない。
- characters_master.json の `station_ids` も name 配列。今は影響なし (id 化したらキャラ獲得対象を駅単位に厳密化できる)。

---

## 140. v292 — STATUS.md カバレッジ表の駅数を実値に更新 + ユニーク 1 行に整理 (2026-05-24)

### 背景

ユスケから「8,491 駅 / 10,446 駅 / (STATUS の) 9,017 駅 / 10,450 駅 と数字がいろいろ」との指摘。`globalStats()` ([js/02b-service-lines-builder.js:181](js/02b-service-lines-builder.js#L181)) を読むと:

- **8,491 駅 (ユニーク)**: 全 SERVICE_LINES の stations を Set 化、重複排除 (`ts = allStations.size`)
- **10,446 駅 (系統単位)**: 各駅を乗り入れ系統数だけ延べカウント

ロジック差は意図通りで、v229-v235 で完乗率の主指標は「ユニーク駅単位」に統一済み。問題は STATUS.md の数字 (9,017 / 10,450) が実値とズレている点。

### 修正

- STATUS.md カバレッジ表の「駅（ユニーク）」を **9,017 → 8,491** (実値) に更新。
- 「駅（系統単位） 10,450 駅」行は撤去 (混乱の元なので主指標 1 本に絞る。コード側「集計方式の違い」カードでは引き続き両方表示するので教育的目的は維持)。

### 残課題

- 「営業系統 637 + α 系統」の数字も実値 (633) とズレ気味だが、`+ α` の意図 (今後追加見込みを織り込んだ表現) があるので今回は触らず。気になったら別途整理。

---

## 139. v291 — 駅キャラ「コミヤウ (小宮)」を削除 (2026-05-24)

### 背景

ユスケ判断で小宮駅キャラ「コミヤウ」(`id: "komiyau"`) を削除。

### 変更

- [characters_master.json](characters_master.json): `id: "komiyau"` のエントリを削除 (7 体 → 6 体)。
- `characters/komiyau.svg` を git rm。
- [STATUS.md](STATUS.md): カバレッジ表を「キャラ: 6 体（八王子 3・立川 3）」に更新。

### Supabase 孤児 grant の扱い

`default_unlocked: true` だったので過去ログインユーザー全員に `norireco_character_grants` レコードが残る可能性あり。コード側は [js/03-characters.js](js/03-characters.js) の全箇所で `const char = NORIRECO.data.CHARACTERS[charId]; if (!char) return;` の null-safe ガードが入っているので、孤児 grant が残っていても本番は壊れない (該当行は無視される)。

気になるなら別途 Supabase 上で:
```sql
DELETE FROM norireco_character_grants WHERE character_id = 'komiyau';
```

---

## 138. v290 — 小さい未乗車駅マーカーをタップしやすく (Canvas tolerance) (2026-05-24)

### 背景

ユスケから「小さい駅だとクリックできないね」(スクショ: 青梅線の未乗車駅 ○ がタップ困難)。

### 原因

08-rendering.js は駅マーカーを Canvas renderer (`L.canvas`) で描画している。Canvas renderer は SVG と違い click 判定が **circle の半径そのまま** = 数 px しかない。未乗車の駅は `radius = (ridden ? 6 : 4) * mScale * stypeMul` で、ズームによっては 2〜4 px。指のタッチサイズ (40〜44 px) に比べて極端に小さく、ほぼ当たらない。

### 修正

Leaflet 1.7+ の `L.canvas({ tolerance })` オプションで click 判定半径を全体に拡張:

- タッチデバイス: +10px
- PC マウス: +6px

`CANVAS` 定義を `IS_TOUCH` 判定の後に移動 (旧位置だと `window.IS_TOUCH` がまだ未定義で常に false 扱いだった)。`let CANVAS;` で先行宣言 + `IS_TOUCH` 決定後に代入。

### 副作用検討

- 近い 2 駅で判定範囲が重なるケース → Leaflet は「後から add したマーカー」を優先するので、ridden / マルチ系統の派手な divIcon マーカーが基本的に勝つ。未乗車円同士の隣接でも体感ほぼ問題なし。
- polyline click と被るケース → 既に polyline 側は `L.DomEvent.stopPropagation` 済みで、駅 click が先に発火するならそちらが取られる (Leaflet の z-order)。

---
