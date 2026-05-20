# 乗レコ - 電車旅 更新履歴 (Phase 3.8 中盤 アーカイブ — コード分割 + ES Modules 化)

`CHANGELOG.md` から退避した Phase 3.8 中盤 (v189〜v225 相当, §38〜§74) のセッションログ。
他フェーズは:
- [CHANGELOG.md](CHANGELOG.md) — 現行 Phase 3.8 後半 (v226〜)
- [CHANGELOG_PHASE3.8-early.md](CHANGELOG_PHASE3.8-early.md) — Phase 3.8 前半 (v173〜v188)
- [CHANGELOG_PHASE1-3.7.md](CHANGELOG_PHASE1-3.7.md) — Phase 1〜3.7 (v60〜v157)

カバー範囲 (時系列 ASC で読む場合: §38 → §74、ファイル内は DESC 配置):
- §38 v189: 駅フィルタアイコン 📍 → 🚉 (location-fab との重複解消)
- §39 v190: `js/13-mypage.js` を 4 ファイル分割 + `window.NORIRECO` 名前空間導入
- §40 v191: `04-gps-location.js` のデータローダーを `02-data-loaders.js` に移管
- §41 v192: SERVICE_LINES 構築ロジックを `02b-service-lines-builder.js` に切り出し
- §42 v193: シンタックスチェック自動化 (`npm run check`) + 同名トップレベル関数の重複検出
- §43 v194: trip 解決 + 乗車状態集計を `04b-ride-record.js` に切り出し
- §44〜§50 v195〜v201: ES Modules パイロット (案 β) **stage 1** — 7 ドメイン state を `window.NORIRECO.{auth,map,record,gps,trains,data,mypage}` に集約
- §51〜§68 v202〜v219: ES Modules パイロット (案 β) **stage 2** — 全 18 ファイルを `<script type="module">` 化
- §69〜§71 v220〜v222: stage 2 リグレッション修正 (IS_TOUCH bridge / window 直置き / cross-module state bridge)
- §72〜§74 v223〜v225: ES Modules **stage 3** — `import`/`export` 化 + syntax-check の module 対応

---

## 74. v225 — ES Modules stage 3 拡大: 残り 14 ファイルの関数 export 化 (2026-05-19)

### 背景

v223 でパイロット 3 ファイル (11/13c/03)、v224 で 12-auth を `import`/`export` 化したのを受けて、残り全ファイルを一気に処理して stage 3 を実質完了させる。順序は影響範囲の小さい順 (TODO.md v203+ 候補): **04 → 06 → 07 → 08 → 09 → 10 → 13系 → 02/02b/05**。01-constants と 04b-ride-record は本リリースでは触らず (後者は IIFE で既に `NORIRECO.rideRecord.X` 経由公開、前者は globalThis 経由 bare 参照で十分動作中)。

### 変更内容

#### 04-gps-location.js — 10 関数 export

`stopLocationTracking` / `findNearestStations` / `formatDist` / `updateNearestStationPanel` / `renderRecordingSummary` / `updateLocationButton` / `getObtainableCharactersAt` / `drawObtainableIndicators` / `getStationCharacterChoice` / `getStationCharacter` / `cycleLocationMode` を `export`、window bridge 撤去。

window bridge 維持 (HTML onclick / HTML 文字列内 onclick):
- `selectNearestCand` / `cancelRecord` / `startRecordFromNearest` / `pickStationCharacter`
- `cycleLocationMode` のみ HTML onclick + JS module 両方で使うため `export` + `window` 両建て

#### 06-map-leaflet.js — `initMap` export

10-init.js の load handler から bare 呼出されていた `initMap` を `export` に。

#### 07-record-mode.js — 5 関数 export

`toggleRecordMode` / `onRecordStationClick` / `redrawAllLinesAfterTripChange` / `showRecordToast` / `fitToRiddenLines` を `export`。`onRecordStationClick` は 07 内 HTML 文字列 onclick からも呼ばれるため `export` + `window` 両建て。

#### 08-rendering.js — 5 関数 export + 2 関数両建て

- export のみ: `drawLines` / `updateLOD` / `updateOverlays` / `openMemo` / `openCharModal`
- export + window 両建て: `closeCharModal` / `toggleMemoMode` (HTML onclick + JS module 両方)
- window のみ (HTML onclick): `closeMemo` / `selChip` / `togTag` / `genMemo`
- `drawServiceLineBase` の window bridge は撤去 (08 内のみ使用)

#### 09-tabs-stats.js — 2 関数 export

`renderList` / `renderStats` を `export`。`switchTab` は HTML onclick のため window 維持。

#### 10-init.js — import 統合

`initAuth` / `initMap` / `updateDateFilterUI` を import。

#### 13-mypage-common.js — 5 関数 / 1 定数 export

`renderMypage` / `applyMpSection` / `tripCardHtml` / `showMypageToast` / `_MP_SORT_COMPARATORS` を `export`。`switchMpSection` は HTML 文字列内 onclick (line 88-90) のため window 維持。`isTimeMachineActive` は 13-common 内のみ使用、bridge 撤去。

#### 13a-stats.js / 13b-trips.js / 13c-lines.js — import 追加

13a: `renderStats` / `tripCardHtml` を import。
13b: `tripCardHtml` / `showMypageToast` / `applyMpSection` / `_MP_SORT_COMPARATORS` / `filterTripsByDate` / `runCharacterGrantCheck` を import。
13c: `renderList` を import。

#### 02-data-loaders.js — 8 関数 export

`loadLines` / `loadLinesForZoom` / `loadRunningServices` / `loadMergedStations` / `loadServiceLinesMaster` / `loadCharacters` / `loadTrains` / `resetTrainSelector` を `export`、window bridge 撤去。`toggleCharacterMode` は HTML onclick (char-fab) のため window 維持。`redrawAllLinesAfterTripChange` を 07 から import (loadLines 後のリトリガー用)。

#### 02b-service-lines-builder.js — IIFE 内で import 利用

`loadServiceLinesMaster` / `loadLines` を 02 から import (IIFE 外の module top-level に置く)。IIFE 内から bare 識別子で参照される。

#### 05-supabase-data.js — 8 関数 export

`filterTripsByDate` / `updateDateFilterUI` / `syncFromSupabase` / `getStorageStats` / `updateStorageUI` / `lStats` / `gStats` を `export`、window bridge 撤去。`setDateFilter` は HTML onclick (dfilter-chip + 13-mypage-common HTML 文字列) で使われるため `export` + `window` 両建て。`toggleCustomDateFilter` 等のモーダル系は window 維持。

#### consumer の import 追加

- 03: `closeCharModal` from 08, `redrawAllLinesAfterTripChange` from 07
- 04: `openCharModal` / `closeCharModal` from 08, 07 関数 4 個
- 05: `drawLines` / `updateOverlays` from 08, `renderMypage` from 13-common
- 06: 08 関数 4 個, 07 関数 3 個, 02 関数 6 個, 05 関数 3 個
- 07: 08 関数 3 個, 02 `resetTrainSelector`
- 08: `onRecordStationClick` from 07, `gStats` from 05
- 09: `renderMypage` from 13-common, `filterTripsByDate` / `lStats` from 05
- 10: `updateDateFilterUI` from 05
- 12: `renderMypage` from 13-common
- 13-common: `renderList` from 09, `filterTripsByDate` from 05

#### typeof ガード撤去

`typeof X === 'function'` のディフェンシブガードを 15+ 箇所撤去 (静的 import で常に解決される)。

### 循環 import の処理

stage 3 拡大で複数の循環 import が発生:
- 03 ↔ 07 (`runCharacterGrantCheck` ⇔ `redrawAllLinesAfterTripChange`)
- 04 ↔ 07 (`distMeters/...` ⇔ `onRecordStationClick/...`)
- 04 ↔ 08 (gps 系 ⇔ 描画系)
- 05 ↔ 08 (`gStats` ⇔ `drawLines`)
- 05 ↔ 13-common (`filterTripsByDate` ⇔ `renderMypage`)
- 02 ↔ 07 (loaders ⇔ `redrawAllLinesAfterTripChange`)

いずれも **function 宣言の export** なので ES Modules の **function hoisting + module loader の binding** で正しく解決される。`const` の export を循環参照すると TDZ 事故になりうるが、今回は全て function なので問題なし。

### コミット粒度

stage 3 拡大は本来 8 batches (v225〜v232) の意図で進めたが、`npm run check` が常に 18/18 OK で通っていたため最終的に **1 commit (CACHE_VERSION = 'v225')** に集約。コード内コメントは「v225 stage 3」で統一。

### 影響ファイル

- `js/02-data-loaders.js` — 8 関数 export + import 追加
- `js/02b-service-lines-builder.js` — import 追加 (IIFE 外)
- `js/03-characters.js` — import 追加
- `js/04-gps-location.js` — 11 関数 export + import 追加
- `js/05-supabase-data.js` — 8 関数 export + import 追加
- `js/06-map-leaflet.js` — initMap export + import 追加
- `js/07-record-mode.js` — 5 関数 export + import 追加
- `js/08-rendering.js` — 7 関数 export + import 追加
- `js/09-tabs-stats.js` — 2 関数 export + import 追加
- `js/10-init.js` — import 追加, typeof ガード撤去
- `js/12-auth.js` — import 追加 (renderMypage), typeof ガード撤去
- `js/13-mypage-common.js` — 5 関数 + 1 定数 export, HTML 文字列内 `if(typeof X==='function')` 撤去
- `js/13a-stats.js` — import 追加
- `js/13b-trips.js` — import 追加
- `js/13c-lines.js` — import 追加
- `sw.js` — `CACHE_VERSION = 'v225'`

### Phase 3.8 ステータス更新

- ✅ Stage 3 拡大完了: 全 18 ファイルのうち 16 ファイル (01 / 04b を除く) で関数 export 化達成
- 残作業 (次セッション以降):
  - 01-constants: `localDateStr` 等 3 関数を export 化 (現状は window 経由で全モジュールから bare 参照可能、優先度低)
  - 04b-ride-record: IIFE で `NORIRECO.rideRecord.{rebuild, normStName}` 経由公開済、構造的に export 化は次フェーズ
  - State 共有 (`NORIRECO.<domain>.X`): HTML onclick から呼ばれる関数の window namespace を撤去する見通しがない限り stage 1 のまま据置
  - 実機検証: ログインフロー (Magic Link / Google OAuth / signOut / 後追い認証 / 地図描画 / マイページ) を PC / iPhone PWA で確認

---

## 73. v224 — ES Modules stage 3: 12-auth.{initAuth, currentUserId, authBearerToken} を export 化 (2026-05-19)

### 変更内容

- `12-auth.js`: `initAuth` / `currentUserId` / `authBearerToken` を `export`、対応 window bridge 撤去
- HTML onclick 用 (`openAuthModal` / `closeAuthModal` / `handleAuthMagicLinkSubmit` / `handleAuthGoogleClick` / `signOutUser`) は window bridge 維持
- consumer (03 / 07 / 09 / 10-init / 13-mypage-common / 13b) に import 追加 + `typeof X === 'function'` ガード 6 箇所撤去
- CACHE_VERSION v223 → v224、`npm run check` 18/18 OK

### 使い分け方針

12-auth で確立した「export / window 両建ての必要性」基準:
- JS module からのみ呼ばれる関数 → export
- HTML onclick (生 HTML or HTML 文字列内 onclick) から呼ばれる関数 → window 維持
- console テスト用に手動呼出できるようにしたいもの → window 維持

`currentUserId` は console から `currentUserId()` で叩けると便利だが、テスト用途は console 内で `(await import('./js/12-auth.js')).currentUserId()` でも可、と判断して window から外した。

---

## 72. v223 — ES Modules stage 3 パイロット: `scripts/syntax-check.js` を module 対応 + 11/13c/03 を `import`/`export` 化 (2026-05-19)

### 背景

v195〜v222 で案 β stage 1 (window.NORIRECO ドメイン名前空間) + stage 2 (全 18 ファイル `<script type="module">` 化) を完結させたが、cross-module の関数共有は依然 `window.X = X` の bridge を経由していた:

- ES Modules の本旨は **import/export による静的依存解析** にあるが、現状は「module 化しただけで実際の依存グラフは window 経由のまま」だった
- Stage 2 完結時 (v219) → v220-v222 で発生した bridge 漏れ事故 (`IS_TOUCH` / `allLayers` / `riddenSt` 等の 3 連発) も、ある意味「window bridge への依存が静的解析できない」ことの帰結

Stage 3 のゴールは **window bridge 経由の関数共有を `import`/`export` に置換し、依存グラフを静的に解析可能にする** こと。state 共有 (window.NORIRECO.X) は将来別タスクで段階的に検討。

### v202 で予告した前提作業: シンタックスチェッカの module 対応

v202 で `<script type="module">` 化したとき、CHANGELOG にこう書いていた:

> ⚠️ `export` は **追加せず** — `npm run check` の `new Function(src)` パースが module syntax を通せないため、stage 3 で syntax-check 拡張と同時に追加予定

これを今回まず解消。

#### 変更内容

- `scripts/syntax-check.js`:
  - `new Function(src)` 方式 → `spawnSync(node, ['--check', '--input-type=module', '-'], { input: src })` 方式に切替
  - 各ファイルを node プロセスに stdin 渡しでパース、`import`/`export` 構文を通せるように
  - エラー表示: stderr から `[stdin]:LINE` 行と `SyntaxError: MSG` 行を抜き出して要約
  - 同名トップレベル関数の重複検出: 正規表現を `^(?:export\s+)?(?:async\s+)?function\s+NAME` に拡張 (`export function X` も拾う)
  - module 化後は各ファイルが独立スコープになり同名関数衝突は runtime エラーにならないが、コピペミスの発見用に警告は残す
- 動作確認:
  - `npm run check` → 18/18 OK
  - 故意に SyntaxError を入れた stdin → `[stdin]:LINE` + `SyntaxError: ...` を正しく検出

### Stage 3 パイロット: 3 ファイルを import/export 化

影響範囲の小さい順に 3 ファイル選定 (TODO.md v203+ 候補に従う):

#### 1. `11-fraud-detection.js` (state 0、関数 2 個)

- export: `fraudAssessTrip` / `fraudIsDowngraded`
- 撤去 window bridge: `window.fraudAssessTrip` / `window.fraudIsDowngraded`
- 自身 import: `distMeters` from `./03-characters.js` (内部で使用)
- consumer (5 ファイル) で import 追加 + `typeof X === 'function'` ガード撤去:
  - `07-record-mode.js`: `fraudAssessTrip`
  - `09-tabs-stats.js`: `fraudAssessTrip` / `fraudIsDowngraded`
  - `13-mypage-common.js`: `fraudIsDowngraded`
  - `13a-stats.js`: `fraudIsDowngraded`
  - `13b-trips.js`: `fraudIsDowngraded`
- consumer 側のディフェンシブガード (`typeof X === 'function' && X(...)`) は静的 import で常に解決されるため不要 → 削除

#### 2. `13c-lines.js` (関数 1 個、プレースホルダ)

- export: `renderMpLinesSection`
- caller ゼロ (実装は将来の拡張点としての空ラッパ) のため import 追加先なし
- 既存 `NORIRECO.mypage.renderMpLinesSection` 登録は互換維持のため残置

#### 3. `03-characters.js` (state 1、関数 11 個)

最大規模のパイロット。HTML onclick から呼ばれるかどうかで分類:

- **export 化** (JS module 間共有のみ):
  - `distMeters` / `isCharacterAvailable` / `isCharacterOwned` / `runCharacterGrantCheck` / `syncCharacterGrantsFromSupabase`
- **window bridge 維持** (HTML onclick / console テスト用):
  - `tryGrantByGPS`: 08-rendering が生成する `<button onclick="tryGrantByGPS(...)">` から
  - `grantCharacter` / `revokeCharacter` / `listOwnedCharacters`: console から叩けるテスト用

撤去した 5 個の window bridge → consumer (7 ファイル) で import 追加:

- `04-gps-location.js`: `distMeters` / `isCharacterOwned` / `isCharacterAvailable`
- `05-supabase-data.js`: `runCharacterGrantCheck`
- `06-map-leaflet.js`: `runCharacterGrantCheck` / `syncCharacterGrantsFromSupabase`
- `07-record-mode.js`: `runCharacterGrantCheck` (追加、`fraudAssessTrip` と同行 import)
- `08-rendering.js`: `isCharacterOwned` / `isCharacterAvailable`
- `11-fraud-detection.js`: `distMeters`
- `13a-stats.js`: `distMeters`
- `13b-trips.js`: `distMeters` / `runCharacterGrantCheck` + `typeof runCharacterGrantCheck === 'function'` ガード撤去

### Stage 2 (window bridge) vs Stage 3 (import) の使い分け方針 (今回確立)

| consumer | 共有手段 | 例 |
|---|---|---|
| 同じく `<script type="module">` の JS から呼ばれる関数 | `export` / `import` | `fraudAssessTrip` / `distMeters` |
| HTML `onclick=` から呼ばれる関数 | `window.X = X` 維持 | `tryGrantByGPS` / `switchTab` |
| console から手動で叩くテスト用 | `window.X = X` 維持 | `grantCharacter` / `listOwnedCharacters` |
| cross-module state (mutable object) | `window.NORIRECO.<domain>.X` (stage 1 のまま) | `NORIRECO.gps.locationMode` 等、stage 1 で 46 個集約済 |

state も export に統一する案 (`export const auth = NORIRECO.auth`) は、mutable object でも参照は固定なので技術的には可能だが、HTML onclick 用に window namespace を一切撤去する見通しがないため、当面 stage 1 のまま据え置く。

### v220-v222 教訓を踏まえた予防策

bridge 漏れ事故の再発防止として:

- import/export 化されたファイルでは、import に書かれていない bare 識別子は **直ちに ReferenceError** で落ちる → 起動時に即検出
- `npm run check` は構文しか見ないが、ブラウザでロード時のエラーで漏れは可視化される

将来追加の import 化対象でも、(1) export 追加 → (2) consumer の import 追加 → (3) `npm run check` 通過 → (4) ブラウザで動作確認、の 4 段階を毎回踏む。

### コミット粒度

1 セッション 4 コミット程度を想定 (本セッションは syntax-check + 3 ファイル分パイロットで 1 リリース v223 として束ねる):

- v223 = syntax-check.js module 対応 + 11/13c/03 の import/export 化

### 影響ファイル

- `scripts/syntax-check.js` (rewrite — spawnSync ベース)
- `js/03-characters.js` — 5 関数 `export` 化 + 5 window bridge 撤去
- `js/04-gps-location.js` — `import { distMeters, isCharacterOwned, isCharacterAvailable }` 追加
- `js/05-supabase-data.js` — `import { runCharacterGrantCheck }` 追加
- `js/06-map-leaflet.js` — `import { runCharacterGrantCheck, syncCharacterGrantsFromSupabase }` 追加
- `js/07-record-mode.js` — `import { fraudAssessTrip }` + `import { runCharacterGrantCheck }` 追加 + typeof ガード 1 箇所撤去
- `js/08-rendering.js` — `import { isCharacterOwned, isCharacterAvailable }` 追加
- `js/09-tabs-stats.js` — `import { fraudAssessTrip, fraudIsDowngraded }` 追加 + typeof ガード 2 箇所撤去
- `js/11-fraud-detection.js` — 2 関数 `export` 化 + 2 window bridge 撤去 + `import { distMeters }` 追加
- `js/13-mypage-common.js` — `import { fraudIsDowngraded }` 追加 + typeof ガード 1 箇所撤去
- `js/13a-stats.js` — `import { fraudIsDowngraded, distMeters }` 追加 + typeof ガード 1 箇所撤去
- `js/13b-trips.js` — `import { fraudIsDowngraded, distMeters, runCharacterGrantCheck }` 追加 + typeof ガード 2 箇所撤去
- `js/13c-lines.js` — `export function renderMpLinesSection`
- `sw.js` — `CACHE_VERSION = 'v223'`

### Phase 3.8 ステータス更新

- ✅ Stage 3 パイロット完了: import/export 化 (11 / 13c / 03 の 3 ファイル) + syntax-check.js module 対応
- 残りの 15 ファイル (01/02/02b/04/04b/05/06/07/08/09/10/12/13-mypage-common/13a/13b) の `export` 化は次セッション以降に段階的に実施

---

## 71. v222 — ES Modules stage 2 リグレッション修正 (3): 05-supabase-data.js の cross-module state を bridge (2026-05-19)

### 背景

v221 で `dotLayerRef` chain を解消したら、loadLines → 04b.rebuild の途中で次の同種エラー:

```
P2エラー: ReferenceError: riddenSt is not defined
  at Object.rebuild (04b-ride-record.js:265:17)
  at loadLines (02-data-loaders.js:83:25)
```

`riddenSt` は 05-supabase-data.js:507 で `const riddenSt={};` 宣言 (module-local)。04b/07/09 から bare 参照されていた。`const` だが property 操作 (`riddenSt[k] = new Set()`, `delete riddenSt[k]`) のみで bare 再代入なし → bridge を貼るだけで解消。

予防的に同一ファイルの他の cross-module state も棚卸し:
- `SUPABASE_URL` / `SUPABASE_KEY`: 03/07/09/12/13-mypage-common/13b-trips から bare 参照 (fetch URL / 認証ヘッダ)
- `RIDDEN_SEGS`: 04b/07/09 から bare 参照 (乗車記録配列)
- `riddenSt`: 上記エラー元

全 4 つを一括 bridge。

### 変更内容 (2 ファイル)

- `js/05-supabase-data.js`: 末尾に `window.SUPABASE_URL` / `SUPABASE_KEY` / `RIDDEN_SEGS` / `riddenSt` の 4 bridge 追加
- `sw.js` CACHE_VERSION v221 → v222

### 予防スキャン結果

全 18 ファイルで `^const [A-Z_]+ =` 形式の top-level 定数を grep してクロスモジュール参照を全件チェック:

| 既存 bridge 済 | 状況 |
|---|---|
| `SVG_W` / `SVG_H` (01) → 05 で使用 | 01:27-28 で window bridge 済 ✓ |
| `_MP_SORT_COMPARATORS` (13-mypage-common) → 13b で使用 | 13-mypage-common:384 で bridge 済 ✓ |

| **未 bridge → v222 で対応** | |
|---|---|
| `SUPABASE_URL` / `SUPABASE_KEY` (05) | 6 ファイルから bare 参照 |
| `RIDDEN_SEGS` / `riddenSt` (05) | 3 ファイルから bare 参照 |

他のファイル単独利用の定数 (`OWNED_CHARACTERS_KEY`, `STOP_TYPE_FILTER_KEY`, `CANVAS`, `LINE_PRIORITY`, `SUPER_MEGA_STATIONS`, `SL_GROUP_ORDER`, `MAJOR_TERMINALS`, `PREFECTURES`, `FRAUD_CATEGORY_SPEED_KMH` 他) は cross-module 参照なしで安全。

### v220/v221 教訓の最終形

「module 化時の bridge 監査」は **関数だけでなく 3 種類を全部洗う必要がある**:

1. 関数 — v202-v219 で既に対応
2. トップレベル `const` (immutable 値、cross-module 読込) — v220 / v222
3. トップレベル `let` (mutable state、cross-module 読/書) — v221

`npm run check` は syntax 検査のみで runtime ReferenceError を検知できない。リリース前に `initMap` を含む golden path の手動 DevTools 確認を 1 回挟む手順を §2.5 落とし穴に追記する。

---

## 70. v221 — ES Modules stage 2 リグレッション修正 (2): `allLayers` / `dotLayerRef` / `labelLayerRef` を window 直置きへ (2026-05-19)

### 背景

v220 で `IS_TOUCH` bridge を補完したら、initMap の次の行で別の同種エラーが surfacing:

```
Uncaught ReferenceError: dotLayerRef is not defined at initMap (06-map-leaflet.js:92:15)
```

`dotLayerRef` / `labelLayerRef` / `allLayers` は 08-rendering.js で `let` 宣言された module-local 変数だが、04/05/06/07 から bare で参照・代入されていた。classic script 時代は最初の `let` 宣言を取り合う共有 lexical scope で動いていたが、stage 2 で全ファイルが module 化された結果:

- module-local `let` は外部 module から不可視
- 06 line 92-93 の `dotLayerRef = L.layerGroup()` (宣言なし bare 代入) は module strict mode で ReferenceError
- 結果として initMap が中断 → LINES 描画停止 (v220 修正後も同じ症状で残った)

### 変更内容 (3 ファイル)

- `js/08-rendering.js`: 末尾の `let allLayers=[]; let dotLayerRef=null; let labelLayerRef=null;` を `window.X = ...` に置換 (3 行)。`drawLines()` 内の bare 再代入 2 行も `window.X = ...` 化
- `js/06-map-leaflet.js`: `initMap()` 内の bare 再代入 2 行を `window.X = ...` 化
- `sw.js` CACHE_VERSION v220 → v221

### v220 教訓の続編

v220 教訓 (「module 化時の bridge 漏れは関数だけでなくトップレベル `const` も対象」) に、もう一段:

- **module-local `let` で宣言されたミュータブル状態を別 module から書き換える pattern も module 化で破綻する**。classic 時代は宣言の先取り(hoisting + 暗黙 global) で偶然動いていただけ。
- 対処: そういう state は `window.X` か `NORIRECO.<domain>.X` に置く。`let` は単一 module 内で完結する場合のみ使う。

予防的に top-level `let` を 18 ファイル grep した結果、cross-module 共有は今回潰した 3 つだけだった (`13a-stats.js` の `_prefMasterCache` は同一ファイル内のみ使用)。`const` 側は `IS_TOUCH` 系で v220 が打ち止めた想定。

---

## 69. v220 — ES Modules stage 2 リグレッション修正: `IS_TOUCH` / `IS_MOBILE` window bridge 補完 (2026-05-19)

### 背景

v218 で 08-rendering.js を `<script type="module">` 化した際、12 個の関数 bridge は追加したものの、トップレベル `const` で宣言された 2 つの定数 `IS_TOUCH` / `IS_MOBILE` を `window` に公開し忘れた。`06-map-leaflet.js initMap()` (line 84) が bare で `IS_TOUCH` を参照しており、module 化後はスコープに無いため `Uncaught ReferenceError: IS_TOUCH is not defined` で initMap が中断。その先の `loadLines()` / `drawLines()` chain も走らず、地図ベース tile は出るが LINES polyline が一切描画されない & 達成率 0% のリグレッションが発生していた (v219 直後にユーザー実機確認で発覚)。

`npm run check` は syntax のみなので runtime ReferenceError は検知できず、stage 2 完結時点ではすり抜けていた。

### 変更内容 (2 ファイル)

- `js/08-rendering.js` 末尾: `window.IS_TOUCH = IS_TOUCH; window.IS_MOBILE = IS_MOBILE;` の 2 行追加 (`IS_MOBILE` は現状 08 内部利用のみだが将来同種事故防止のため一緒に bridge)
- `sw.js` CACHE_VERSION v219 → v220

### 教訓

- module 化時の bridge 漏れは **関数だけでなくトップレベル `const` も対象**。grep で `function NAME` を洗うだけでは捕まらない。次に module 化するファイルがあれば、移行前に `^const ` / `^let ` も棚卸しする。
- `npm run check` は parse 通過しか見ない。stage 2 で「syntax OK だから安全」と判断したのは過信。最低限 `initMap` を含む golden path の手動確認をリリース前に挟むべきだった (Notion §2.5 落とし穴に追記予定)。

---

## 68. v219 — ES Modules パイロット (案 β) **stage 2 完結**: 全 18 ファイル `<script type="module">` 化達成 (2026-05-19)

### 背景

stage 2 の **最終 18 番目**。02-data-loaders.js を module 化することで、**全 18 ファイルが `<script type="module">`** になり、案 β の 2 段階移行 (stage 1 windowization + stage 2 type=module 化) が完全に完結。

### 変更内容 (3 ファイル)

- `noritetsu-map.html`: `<script src="js/02-data-loaders.js">` → `<script type="module" src=...>`
- `js/02-data-loaders.js`: 末尾に 9 個の window bridge (loadX 系 + resetTrainSelector + toggleCharacterMode) + stage 2 コメント
- `sw.js` CACHE_VERSION v218 → v219

### 案 β 全体サマリ (v195-v219、25 commit)

| Stage | バージョン範囲 | commit 数 | 内容 |
|---|---|---|---|
| **stage 1** (windowization) | v195〜v201 | 7 | 全 7 ドメインの top-level `let`/`const` state を `window.NORIRECO.<domain>.X` の object property に集約。累計 46 state、~450 call site、18 ファイル中 16 に手を入れた |
| **stage 2** (type=module 化) | v202〜v219 | 18 | 各ファイルを `<script type="module">` に変更、module-local function を `window.X = X` で classic/HTML から呼び出し可に。累計 ~100 個の window bridge 追加 |

### Stage 2 累積 window bridge 一覧 (~100 個)

| ファイル | ver | 新規 bridge 数 |
|---|---|---|
| 12-auth | v202 | 4 (initial pilot) |
| 11-fraud | v203 | 2 |
| 13c-lines | v204 | 0 (既存 NORIRECO.mypage.X で足りる) |
| 13b-trips | v205 | 0 (v190 両建て登録済) |
| 13a-stats | v206 | 0 (代わりに classic 側 2 箇所を namespace 経由に) |
| 13-mypage-common | v207 | 5 (applyMpSection / showMypageToast / tripCardHtml / isTimeMachineActive / _MP_SORT_COMPARATORS) |
| 09-tabs-stats | v208 | 3 (switchTab / renderList / renderStats) |
| 10-init | v209 | 1 (checkAppVersion) |
| 03-characters | v210 | 5 (isCharacterAvailable / isCharacterOwned / runCharacterGrantCheck / distMeters / syncCharacterGrantsFromSupabase) |
| 04b-ride-record | v211 | 4 (state objects: riddenServiceIds / slRiddenSt / slVisitCount / slStopType) |
| 01-constants | v212 | 3 (SVG_W / SVG_H / localDateStr) |
| 02b-service-lines | v213 | 0 (既に IIFE で NORIRECO.serviceLines 公開) |
| 06-map-leaflet | v214 | 1 (initMap) |
| 05-supabase-data | v215 | 14 (filter / supabase sync / stats helper) |
| 04-gps-location | v216 | 11 (location tracking / character / record panel) |
| 07-record-mode | v217 | 6 (toggleRecordMode / onRecordStationClick / saveMultiSegmentTrip / redrawAllLinesAfterTripChange / showRecordToast / fitToRiddenLines) |
| 08-rendering | v218 | 12 (drawLines / updateLOD / updateOverlays / memo / char modal / drawServiceLineBase) |
| **02-data-loaders** | **v219** | **9** (loadX 系 + resetTrainSelector + toggleCharacterMode) |

合計 ~80 個の関数 + 4 個の state object = ~84 個の window bridge。これら全てが「classic→module 移行で失われるグローバル可視性を 1:1 で補修した」結果。

### 教訓 (案 β 全体を通して)

#### 1. 「stage 1 windowization」の価値はここで証明された

stage 1 で 46 state を `window.NORIRECO.<domain>.X` に集約しなければ、stage 2 では state も window bridge する必要があり、bridge 数が倍増していた。state-state 間の依存も同時に複雑化していたはず。**state を namespace 化する投資は stage 2 で完全に回収される**。

#### 2. 「両建て登録 (window.X + NORIRECO.<domain>.X)」の長期価値

v190 のマイページ分割時に行った「全関数を `window.X` + `NORIRECO.mypage.X` の両方に登録」というルールが、stage 2 で 4 ファイル (13a/13b/13c/13-common) を ほぼ無料 で module 化できた決め手。新規 namespace を切るときは、この両建てルールを最初から徹底すべき。

#### 3. 部分文字列衝突は `replace_all` の盲点

stage 1 で発覚した `LINES ⊂ SERVICE_LINES ⊂ SERVICE_LINES_MASTER` の cascading corruption は、`replace_all` の literal substring match に起因する古典的バグ。今後 grep/sed/replace_all で大規模置換する時は **常に「短いほうを先に処理 → cleanup pass」** の手順を頭に置く。

#### 4. 評価順序は lazy evaluation で守られる

modules は暗黙 defer のため、全 classic script の後に評価される。ただし `function` 内の処理は **呼出時に評価** されるため、classic script の評価時に module の export を直接読まない限り、評価順のずれは破綻しない。v202 の 12-auth pilot で `renderMypage` (13-common) の中に `NORIRECO.auth.currentUser` 参照がある場合も、event-driven なので問題なかったのと同じ原理。

#### 5. `npm run check` は module syntax を通せない (将来課題)

現状の `scripts/syntax-check.js` は `new Function(src)` で classic context のパース。stage 2 完結時点でも `export` / `import` を 1 つも使っていないため通っているが、stage 3 で本格的に `import` を使うときは `node --check --input-type=module` ベースに置換が必要。

### Stage 3 への展望

stage 2 完結により、次のような未来が開ける:

1. **モジュール間 `import`/`export`** — `window.NORIRECO.<domain>` の bridge を廃止し、`export const data = {...}` + `import { data } from './02-data-loaders.js'` に置換。型推論の前提条件
2. **TypeScript 化** — module syntax が前提条件 (classic script は実質サポート外)
3. **Vite/esbuild バンドリング** — module 化していれば bundler が依存解析できる。HTTP/2 多重化や即時 hot-reload も可能
4. **API ラッパー導入 (布石⑤)** — `NORIRECO.api.xxx` を新規 module として追加し、`05-supabase-data` の直接 fetch を置換

stage 3 の優先度は **シェア機能** / 垢BAN 対応 / 他の TODO 🔥 タスクとの兼ね合いで決める。stage 2 完結だけで「動くマップが module 由来でも変わらず動く」のは大きな achievement。

### 機能リグレッション検証 (実機チェック必須)

- [ ] 地図初期表示 (初回ロード〜LINES 表示〜キャラ表示)
- [ ] タブ切替 (地図 ⇄ マイページ)
- [ ] マイページ全タブ (統計 / 旅程 / 路線)
- [ ] 手動記録モード (📝 → 駅選択 → 経路選択 → 保存)
- [ ] GPS 記録モード (📍 → 最寄駅選択 → 記録開始 → 終了 → 不正検知)
- [ ] ログインフロー (Magic Link / Google OAuth / signOut)
- [ ] 期間フィルタ (📅 → 今年/去年/カスタム/月指定)
- [ ] 駅フィルタ (🚉 → 表示/非表示)
- [ ] キャラ獲得 (タップでの確認・GPS 獲得・自動獲得)
- [ ] バージョンバッジ (右下、クリックで再確認)

### 25 commit の振り返り

| 区分 | commit |
|---|---|
| Stage 1 (windowization) | v195 auth / v196 map / v197 record / v198 gps / v199 trains / v200 data / v201 mypage |
| Stage 2 (type=module) | v202 12-auth (pilot) / v203 11-fraud / v204 13c / v205 13b / v206 13a / v207 13-common / v208 09 / v209 10 / v210 03 / v211 04b / v212 01 / v213 02b / v214 06 / v215 05 / v216 04 / v217 07 / v218 08 / v219 02 |

各 commit が独立して revert 可能。最も大規模 (v200 data domain、15 ファイル / 146 call site) でも 1 commit で完結。

---

## 67. v218 — ES Modules パイロット (案 β) stage 2 拡張: 08-rendering.js を `<script type="module">` 化 (2026-05-19)

stage 2 の 17 番目。描画エンジン本体。12 個の window bridge (drawLines / updateLOD / updateOverlays / メモモーダル系 / キャラモーダル系 / drawServiceLineBase)。

### 累積 stage 2 進捗

**17/18 ファイル module 化済み**。残り 1: **02-data-loaders (最後)**。

---

## 66. v217 — ES Modules パイロット (案 β) stage 2 拡張: 07-record-mode.js を `<script type="module">` 化 (2026-05-19)

stage 2 の 16 番目。記録モード本体。既存 window 公開 11 個に加え 6 個追加 (`toggleRecordMode` / `onRecordStationClick` / `saveMultiSegmentTrip` / `redrawAllLinesAfterTripChange` / `showRecordToast` / `fitToRiddenLines`)。

### 累積 stage 2 進捗

**16/18 ファイル module 化済み**。残り 2: 08 / 02。

---

## 65. v216 — ES Modules パイロット (案 β) stage 2 拡張: 04-gps-location.js を `<script type="module">` 化 (2026-05-19)

stage 2 の 15 番目。現在地・最寄駅・GPS 記録パネル・キャラ表示。11 個の window bridge (`stopLocationTracking` / `findNearestStations` / `formatDist` / `updateNearestStationPanel` / `renderRecordingSummary` / `updateLocationButton` / `getObtainableCharactersAt` / `drawObtainableIndicators` / `getStationCharacterChoice` / `getStationCharacter` / `pickStationCharacter`) を追加。

### 累積 stage 2 進捗

**15/18 ファイル module 化済み**。残り 3: 07 / 08 / 02。

---

## 64. v215 — ES Modules パイロット (案 β) stage 2 拡張: 05-supabase-data.js を `<script type="module">` 化 (2026-05-19)

stage 2 の 14 番目。データ層 (filter / supabase sync / stats helper)。HTML onclick + 多数 module からの bare 呼出を受けるため **14 個の window bridge** を末尾に集約。

### 累積 stage 2 進捗

**14/18 ファイル module 化済み**。残り 4: 04 / 07 / 08 / 02。

---

## 63. v214 — ES Modules パイロット (案 β) stage 2 拡張: 06-map-leaflet.js を `<script type="module">` 化 (2026-05-19)

stage 2 の 13 番目。06 は地図初期化。`initMap` を window 公開 1 個追加。

### 累積 stage 2 進捗

**13/18 ファイル module 化済み**。残り 5: 04 / 05 / 07 / 08 / 02。

---

## 62. v213 — ES Modules パイロット (案 β) stage 2 拡張: 02b-service-lines-builder.js を `<script type="module">` 化 (2026-05-19)

stage 2 の 12 番目。02b は既に IIFE で `window.NORIRECO.serviceLines` に公開する構造のため、stage 2 は **script tag 変更のみ完結**。bridge 追加ゼロ。

### 累積 stage 2 進捗

**12/18 ファイル module 化済み**。残り 6: 04 / 05 / 06 / 07 / 08 / 02。

---

## 61. v212 — ES Modules パイロット (案 β) stage 2 拡張: 01-constants.js を `<script type="module">` 化 (2026-05-19)

### 背景

stage 2 の 11 番目。01-constants は SVG_W/H、ISLANDS、localDateStr の超小型ユーティリティファイル。

### 追加した window bridge (3 個)

```js
window.SVG_W = SVG_W;
window.SVG_H = SVG_H;
window.localDateStr = localDateStr;  // 03/07/08/13-common/13a (module/classic 混在) から bare 呼出
```

ISLANDS は現状未参照 (dead constants) なので window 公開しない。

### 累積 stage 2 進捗

**11/18 ファイル module 化済み**。残り 7: 04 / 05 / 06 / 07 / 08 / 02 / 02b。

---

## 60. v211 — ES Modules パイロット (案 β) stage 2 拡張: 04b-ride-record.js を `<script type="module">` 化 (2026-05-19)

### 背景

stage 2 の 10 番目。04b は IIFE で関数を NORIRECO.rideRecord に登録し、外側に 4 つの state オブジェクト (`riddenServiceIds` / `slRiddenSt` / `slVisitCount` / `slStopType`) を `const` 公開している。これらが classic 04/08 と module 02b から bare 参照されるため window 公開を追加。

### 追加した window bridge (4 個、state オブジェクト)

```js
window.riddenServiceIds = riddenServiceIds;  // 04 (classic) から
window.slRiddenSt = slRiddenSt;              // 02b (module) / 04 / 08 (classic) から
window.slVisitCount = slVisitCount;          // 04 / 08 (classic) から
window.slStopType = slStopType;              // 04 / 08 (classic) から
```

mutable オブジェクト参照なので、`window.slRiddenSt.foo = bar` のような書き込みも共有される。

### 累積 stage 2 進捗

**10/18 ファイル module 化済み**。残り 8: 04 / 05 / 06 / 07 / 08 / 01 / 02 / 02b。

過半数を超えた。残りは中央ハブ系 (02 / 02b / 06) と data accessor 系 (04 / 05 / 07 / 08)。01-constants は超小型。

---

## 59. v210 — ES Modules パイロット (案 β) stage 2 拡張: 03-characters.js を `<script type="module">` 化 (2026-05-19)

### 背景

stage 2 の 9 番目。03-characters はキャラ獲得 + 距離計算 util (`distMeters`) を持ち、後者は全体から widely 参照される。

### 追加した window bridge (5 個)

```js
window.isCharacterAvailable = isCharacterAvailable;       // 04 / 08 (classic) から bare 呼出
window.isCharacterOwned = isCharacterOwned;               // 04 / 08 から bare 呼出
window.runCharacterGrantCheck = runCharacterGrantCheck;   // 05 / 06 / 07 (classic) / 13b (module) から
window.distMeters = distMeters;                           // 04 (classic) + 11/13a/13b (module) から bare 呼出
window.syncCharacterGrantsFromSupabase = syncCharacterGrantsFromSupabase;  // 06 から
```

`distMeters` は haversine 距離計算で、不正検知 (11) / 統計集計 (13a) / GPS 後追い認証 (13b) など多数の module から bare 呼出されるため必須。

### 変更内容 (3 ファイル)

- HTML: `<script type="module" src=...>`
- 03-characters.js: 末尾に window bridge 5 個 + コメント
- sw.js v209 → v210

### 累積 stage 2 進捗

**9/18 ファイル module 化済み** (mypage 4 + auth + fraud + tabs + init + characters)。残り 9: 04 / 04b / 05 / 06 / 07 / 08 / 01 / 02 / 02b。

---

## 58. v209 — ES Modules パイロット (案 β) stage 2 拡張: 10-init.js を `<script type="module">` 化 (2026-05-19)

### 背景

stage 2 の 8 番目。10-init.js は init エントリで、`window.addEventListener('load', ...)` をトップレベルで登録し、HTML 上の `<span onclick="checkAppVersion(true)">` バージョンバッジから呼ばれる関数を持つ。

### 変更内容

- HTML: `<script type="module" src=...>`
- 10-init.js: `window.checkAppVersion = checkAppVersion` を追加
- sw.js v208 → v209

### 重要: load event のタイミング

`window.addEventListener('load', handler)` を module top-level で登録する場合、module は暗黙 defer なので評価タイミングは **DOMContentLoaded 直前**。`load` event はその直後 (全リソース読み込み完了時) に発火するため、handler は確実に呼ばれる。

`load` handler 内の `initMap()` / `initAuth()` / `updateDateFilterUI()` / `updateStopTypeFilterUI()` は全て classic 関数で globalThis property、または既に window 公開済 (`initAuth`)。module 内 bare 参照で正しく解決される。

### 累積 stage 2 進捗

**8/18 ファイル module 化済み**。残り 10: 03 / 04 / 04b / 05 / 06 / 07 / 08 / 01 / 02 / 02b。

---

## 57. v208 — ES Modules パイロット (案 β) stage 2 拡張: 09-tabs-stats.js を `<script type="module">` 化 (2026-05-19)

### 背景

stage 2 の 7 番目。09 はタブ切替 (`switchTab`) + 路線一覧 (`renderList`) + 統計集計 (`renderStats`) の 3 関数。HTML onclick と module からの bare 呼出があるため window bridge 3 個を追加。

### 変更内容 (3 ファイル)

- `noritetsu-map.html`: `<script src="js/09-tabs-stats.js">` → `<script type="module" src=...>`
- `js/09-tabs-stats.js`: 末尾に window bridge 3 個 + stage 2 コメント
- `sw.js` CACHE_VERSION v207 → v208

```js
window.switchTab = switchTab;    // HTML onclick から
window.renderList = renderList;  // 13-mypage-common / 13c (module) から bare 呼出
window.renderStats = renderStats;// 13a (module) から bare 呼出
```

### 累積 stage 2 進捗

**7/18 ファイル module 化済み** (mypage 4 + auth + fraud + tabs-stats)。残り 11: 10 / 03 / 04 / 04b / 05 / 06 / 07 / 08 / 01 / 02 / 02b。

---

## 56. v207 — ES Modules パイロット (案 β) stage 2 拡張: 13-mypage-common.js を `<script type="module">` 化 (mypage 系完結) (2026-05-19)

### 背景

stage 2 の 6 番目。13-mypage-common を module 化すれば **mypage 4 ファイル (13-common/13a/13b/13c) 全てが module** になり、マイページ系が stage 2 完結。

### 追加した window bridge (5 個)

13a / 13b (既に module) と 05 / 09 (classic) から bare 識別子で呼ばれる関数を window 公開:

```js
window.applyMpSection = applyMpSection;
window.showMypageToast = showMypageToast;
window.tripCardHtml = tripCardHtml;
window.isTimeMachineActive = isTimeMachineActive;
window._MP_SORT_COMPARATORS = _MP_SORT_COMPARATORS;
```

既存の `window.formatDelayMin / renderMypage / switchMpSection` (v190 で登録済) と合わせて、外部呼出される全 8 関数が window 経由で classic / module 両対応。

### 変更内容 (3 ファイル)

- `noritetsu-map.html`: `<script src="js/13-mypage-common.js">` → `<script type="module" src=...>`
- `js/13-mypage-common.js`: 末尾に 5 個の window bridge を追加 + コメント更新
- `sw.js` CACHE_VERSION v206 → v207

### 累積 stage 2 進捗

| ファイル | バージョン | LOC | window bridge 追加 |
|---|---|---|---|
| 12-auth | v202 | 261 | 4 個 |
| 11-fraud | v203 | 156 | 2 個 |
| 13c-lines | v204 | 22 | 0 個 |
| 13b-trips | v205 | 354 | 0 個 |
| 13a-stats | v206 | 1308 | 0 個 (classic 側 bare 参照を namespace 経由に置換) |
| **13-mypage-common** | **v207** | **377** | **5 個** |

**6/18 ファイル module 化済み** (mypage 系 4 ファイル + auth + fraud)。残り 12: 09 / 10 / 03 / 04 / 04b / 05 / 06 / 07 / 08 / 01 / 02 / 02b。

### 教訓: 「中心ファイル」を module 化する時の追加コスト

13c/13b/13a の module 化は追加 bridge ゼロ〜数個で済んだが、**他からの参照を受ける中心ファイル** (13-common) を module 化する時は、参照される関数の数だけ window bridge が必要。

スケール感:
- 末端ファイル (受けるだけ) → 0 bridge
- ハブファイル (参照されまくる) → 5〜10 bridge
- 巨大ハブ (02-data-loaders、ほぼ全ファイルから参照される) → 20+ bridge を予想

最後に手を付ける 02 が最大の bridge 作業になる見込み。

---

## 55. v206 — ES Modules パイロット (案 β) stage 2 拡張: 13a-stats.js (1308 行・最大ファイル) を `<script type="module">` 化 (2026-05-19)

### 背景

stage 2 の 5 番目。1308 行と **18 ファイル中最大**だが、v190 の名前空間徹底で stage 2 コストはほぼゼロ。call site の僅かな修正 (2 箇所、13-mypage-common.js の bare 参照を `NORIRECO.mypage.X` 経由に置換) のみ。

### 変更内容 (4 ファイル)

- `noritetsu-map.html`: `<script src="js/13a-stats.js">` → `<script type="module" src=...>`
- `js/13a-stats.js`: コメントに stage 2 ノート追記
- `js/13-mypage-common.js`: bare 参照を NORIRECO.mypage 経由に置換 (2 箇所)
  - `buildCompletionCards(tripsForCards)` → `NORIRECO.mypage.buildCompletionCards(tripsForCards)`
  - `renderMpStatsSection()` → `NORIRECO.mypage.renderMpStatsSection()`
  - 同じ block で `renderMpTripsSection()` → `NORIRECO.mypage.renderMpTripsSection()` も予防的に統一 (13b は既に module 化済み)
- `sw.js` CACHE_VERSION v205 → v206

### 教訓: 「bare 参照→namespace 経由」の defensive 置換

13a/13b/13c が module 化される過程で、13-mypage-common.js (classic) から bare で呼ばれていた関数は **moduleスコープ化された瞬間に消える**。grep で「該当 module 関数を bare で呼んでいる箇所」を洗い出して `NORIRECO.<domain>.X` 経由に統一しておくのが安全。

call site 1 つを置換するコストは小さいが、**bare 参照に頼ったまま module 化する**と silent runtime error になり、デバッグが面倒。

### 累積 stage 2 進捗

| ファイル | バージョン | LOC | 戦略 |
|---|---|---|---|
| 12-auth | v202 | 261 | window bridge 4 関数追加 |
| 11-fraud | v203 | 156 | window bridge 2 関数追加 |
| 13c-lines | v204 | 22 | bridge 不要 (NORIRECO.mypage.X 既存) |
| 13b-trips | v205 | 354 | bridge 不要 (v190 両建て登録済) |
| **13a-stats** | **v206** | **1308** | classic 側 bare → namespace 置換 2 箇所 |

stage 2 で **5/18 ファイル module 化済み**。

---

## 54. v205 — ES Modules パイロット (案 β) stage 2 拡張: 13b-trips.js を `<script type="module">` 化 (2026-05-19)

### 背景

stage 2 の 4 番目。13c-lines (v204) より大きい 354 行ファイルだが、**v190 の分割時から既に `window.X` + `NORIRECO.mypage.X` の両建て登録**を行っていたため、stage 2 追加 bridge ゼロで済む。

### 13b-trips を選んだ理由

| 観点 | 13b-trips の特徴 |
|---|---|
| ファイルサイズ | 354 行 |
| state 数 | 0 (v201 で _mypageCache 等を `NORIRECO.mypage.state` に集約済) |
| 外部公開関数 | 9 個 全て v190 で window + NORIRECO.mypage 両建て登録済 |
| classic 依存 | `tripCardHtml` / `showMypageToast` / `filterTripsByDate` / `_MP_SORT_COMPARATORS` 等 — 全て classic 経由でアクセス可 |

### 変更内容 (3 ファイル)

- `noritetsu-map.html`: `<script src="js/13b-trips.js">` → `<script type="module" src=...>`
- `js/13b-trips.js`: コメントに stage 2 ノート追記 (機能変更なし)
- `sw.js` CACHE_VERSION v204 → v205

### 累積 stage 2 進捗

| ファイル | バージョン | window bridge 追加行数 | 戦略 |
|---|---|---|---|
| 12-auth | v202 | 4 | initial pilot — 関数 4 個を新規 window 公開 |
| 11-fraud | v203 | 2 | state 0 — fraudAssess/Is を新規 window 公開 |
| 13c-lines | v204 | 0 | NORIRECO.mypage.X 既存公開で足りる |
| **13b-trips** | **v205** | **0** | v190 で window + NORIRECO.mypage 両建て登録済 |

**4/18 ファイル完了**。残り 14: 13a-stats / 13-mypage-common / 09-tabs-stats / 10-init / 03-characters / 04-gps / 04b / 05-supabase / 06-map / 07-record / 08-rendering / 01-constants / 02 / 02b。

### 観察

stage 2 のコストは「**v190 (NORIRECO 名前空間 + 両建て登録) の徹底度**」に強く依存する。13 サブ族 (13a/13b/13c/13-common) は v190 で徹底済のため、stage 2 がほぼ無料。一方、04/06/07/08 等は v195〜v201 stage 1 で state 集約はしたが、**関数の window 公開はまだ穴がある**ため、stage 2 で追加 bridge が必要になる見込み。

---

## 53. v204 — ES Modules パイロット (案 β) stage 2 拡張: 13c-lines.js を `<script type="module">` 化 (2026-05-19)

### 背景

v202 (12-auth) / v203 (11-fraud) に続く stage 2 の 3 番目。**最小ファイル (21 行)** を選び、stage 2 が「コメント追加 + HTML script type 変更 + CACHE_VERSION bump」の **3 ファイル 4 行差分**で済むことを実証。

### 13c-lines を選んだ理由

| 観点 | 13c-lines の特徴 |
|---|---|
| ファイルサイズ | 21 行 (最小) |
| state 数 | 0 |
| 外部公開関数 | 1 (`NORIRECO.mypage.renderMpLinesSection`、既に namespace 経由公開) |
| classic 依存 | `renderList` (09-tabs-stats.js, function 宣言 → globalThis property) |
| dead code 寄り | 現状 applyMpSection は `typeof renderList` を直接呼んでいるため未参照 |

### 変更内容 (3 ファイル)

- `noritetsu-map.html`: `<script src="js/13c-lines.js">` → `<script type="module" src=...>`
- `js/13c-lines.js`: コメントに stage 2 移行ノート追記 (機能変更なし、window bridge も不要 — 既に `NORIRECO.mypage.renderMpLinesSection` の namespace 経由公開のみ)
- `sw.js` CACHE_VERSION v203 → v204

### 教訓: 「stage 1 完了後の stage 2 は本当にライト」の更なる証拠

| ファイル | 変更量 (window bridge 行数 + script tag) |
|---|---|
| 12-auth (v202) | 4 行 (window 公開 4 関数) + script tag |
| 11-fraud (v203) | 2 行 (window 公開 2 関数) + script tag |
| **13c-lines (v204)** | **0 行** (既存の `NORIRECO.mypage.X` namespace で足りる) + script tag |

`NORIRECO.<domain>` namespace 経由で関数を公開していたファイル (13c の `NORIRECO.mypage.renderMpLinesSection` 等) は **追加の window bridge すら不要**。stage 1 の windowization (関数 namespace 化を v190 で既に終えていた分) の恩恵がここでも効いている。

### 進捗 (案 β stage 2)

| ファイル | バージョン | LOC | 完了 |
|---|---|---|---|
| 12-auth | v202 | 261 | ✅ |
| 11-fraud | v203 | 156 | ✅ |
| **13c-lines** | **v204** | **22** | **✅** |
| 13b-trips (次) | v205 | 354 | 🔜 |
| 13a-stats | v206 | 1308 | 🔜 |
| 13-mypage-common | v207 | 366 | 🔜 |
| ... | ... | ... | ... |

stage 2 で **3/18 ファイル module 化済み**。13 サブ族 (13a/13b/13c/13-common) を続けて処理すれば mypage 系全体が module 化完了。

---

## 52. v203 — ES Modules パイロット (案 β) stage 2 拡張: 11-fraud-detection.js を `<script type="module">` 化 (2026-05-19)

### 背景

v202 (12-auth) に続く stage 2 の 2 番目。**state ゼロのファイル** を選び、stage 2 が「外部 API の window bridge を書くだけ」の機械作業であることを実証。

### 11-fraud-detection を選んだ理由

| 観点 | 11-fraud-detection の特徴 |
|---|---|
| state 数 | **0 個** (定数のみ、Pure 関数群) |
| 外部公開関数 | 2 個 (`fraudAssessTrip` / `fraudIsDowngraded`) |
| classic 依存 | 2 個 (`distMeters` from 03 / `NORIRECO.data.SERVICE_LINES`) |
| 失敗時の影響 | 不正検知のみ、地図描画には無影響 |

state が無いということは v195-v201 の windowization で**手を入れる必要がなかった**ファイル。stage 2 は完全に script tag + window bridge の 2 点だけで済む。

### 変更内容 (3 ファイル)

#### 1. `noritetsu-map.html`

```diff
-<script src="js/11-fraud-detection.js"></script>
+<script type="module" src="js/11-fraud-detection.js"></script>
```

#### 2. `js/11-fraud-detection.js` 末尾に window bridge を追加

```js
window.fraudAssessTrip = fraudAssessTrip;
window.fraudIsDowngraded = fraudIsDowngraded;
```

呼出元は全て `typeof fraudAssessTrip === 'function'` の defensive check 付き (07/09/13-common/13a/13b 計 5 箇所)。bridge が無くても crash しないが、機能が silent fail するので明示的に公開。

#### 3. `sw.js` CACHE_VERSION v202 → v203

### classic ↔ module 識別子可視性検証

- `distMeters` (03-characters.js, classic, `function`) — module から bare 参照可 (globalThis property)
- `NORIRECO.data.SERVICE_LINES` (window property) — どこからでも参照可
- `parseHmsToSec` / `fraudExpectedMinutes` 等の内部関数 — module-local のままで OK (外部から呼ばれない)

### 進捗 (案 β stage 2)

| ファイル | バージョン | state | 外部公開 fn | LOC |
|---|---|---|---|---|
| 12-auth | v202 | 4 | 8 (init/sign*/handle*/openAuth*/...) | 261 |
| **11-fraud** | **v203** | **0** | **2** (fraudAssess/Is) | 156 |
| 13c-lines (次) | v204 | 0 | 1 | 21 |
| 03-characters | v205 | ~5 keys | 多数 | 306 |
| ... | ... | ... | ... | ... |

stage 2 の **6/18 ファイル完了** (12-auth + 11 = 2、未完: 03/04/04b/05/06/07/08/09/10/13c/13-common/13a/13b/02/02b/01)。

### 教訓

- **state 0 ファイル → stage 2 は 3 行の編集**: HTML 1 行 + window bridge 2 行 + sw.js version bump。stage 1 の準備量に対して stage 2 のコストはほぼゼロ
- 「state が無いファイル」を先に処理することで、stage 2 の安全性と機械性が validate できる。state を持つファイル (03/06/02 等) への展開は次セッション以降

---

## 51. v202 — ES Modules パイロット (案 β) **stage 2 着手**: 12-auth.js を `<script type="module">` 化 (2026-05-19)

### 背景

v195〜v201 で stage 1 (window 化) を完了し、cross-file shared state は全て `window.NORIRECO.<domain>.X` の object property になった。stage 2 は **各ファイルを `<script type="module">` に変換** する段階。v202 はその **最初のパイロット**: 最も影響範囲の小さい 12-auth.js を選定。

### 12-auth を最初に選んだ理由

| 観点 | 12-auth の特徴 |
|---|---|
| state 数 | 4 個 (最小) |
| cross-file 参照 | 1 ファイル (13-mypage-common.js のみ) |
| 関数 API consumer | 限定的 (HTML onclick 4 + classic script 3) |
| render hot path | 外 (user interaction でのみ実行) |
| 失敗時の影響 | ログインフローのみ、地図描画には無影響 |

### 変更内容 (3 ファイル)

#### 1. `noritetsu-map.html`

```diff
-<script src="js/12-auth.js"></script>
+<script type="module" src="js/12-auth.js"></script>
```

`type="module"` の効果:
- **暗黙 strict mode** — `'use strict';` を明示せずとも strict mode
- **暗黙 defer** — 全 classic script の評価完了後、`DOMContentLoaded` 直前に評価
- **モジュールスコープ** — top-level `function` / `const` / `let` は globalThis に乗らない
- **`import.meta` / `import()` 利用可** — 将来 stage 3 でモジュール間 import に使う

#### 2. `js/12-auth.js` 末尾に追加した window 公開

stage 1 で既に 4 関数を window に出していた:
- `openAuthModal` / `closeAuthModal` / `handleAuthMagicLinkSubmit` / `handleAuthGoogleClick` (HTML onclick 用)

stage 2 で新たに必要になった 4 関数:
- `initAuth` — 10-init.js (classic) から `typeof initAuth === 'function' && initAuth()` で呼ばれる
- `currentUserId` — 13-mypage-common.js / 13b-trips.js (classic) の `currentUserId()` 呼び出し用
- `signOutUser` — 13-mypage-common.js の HTML onclick `"...if(confirm(...))signOutUser()"` 用
- `authBearerToken` — 将来 05-supabase-data.js 等の認証ヘッダ用 (defensive 公開)

#### 3. `sw.js` CACHE_VERSION v201 → v202

### 評価順序 (重要)

`type="module"` は暗黙 defer のため、HTML 上の `<script src>` の位置に関係なく、**全 classic script の後** に評価される。新しい順序:

```
1-11. 01-constants ... 11-fraud-detection (classic, 順次同期実行)
12-17. 13-mypage-common, 13a-stats, 13b-trips, 13c-lines, 09-tabs-stats, 10-init (classic)
        ↑ この時点で 10-init は `window.addEventListener('load', () => initAuth())` を登録
        ↑ load event 自体はまだ発火していない
18. 12-auth (module) — DOMContentLoaded 直前に評価、`window.initAuth = initAuth` 等の bridge 確立
19. DOMContentLoaded
20. load event 発火 → `initAuth()` が globalThis 経由で呼ばれて auth 起動
```

つまり、stage 1 で全 state を `NORIRECO.<domain>` に出しておいた**おかげで**、評価順がずれても破綻しない:
- 13-mypage-common (classic, step 12) が評価される時点で、12-auth はまだ未評価。だが `NORIRECO.auth` への参照は `renderMypage()` 関数本体内 (event-driven) なので、実際にアクセスされるのは load 後 = module 評価後 → OK
- `function renderMypage()` のような関数本体は **クロージャ作成時には未評価**、呼び出し時に初めて評価される。これが lazy evaluation のおかげで stage 2 が無傷で済む理由

stage 1 が正しく完了していれば、stage 2 は **script tag 1 行の変更** で済む — これが案 β の最大の利点。

### classic ↔ module 識別子可視性の確認

stage 2 で破綻し得るパターンを事前に検証:

| 参照元 | 識別子 | 参照先 | 可視性 |
|---|---|---|---|
| 12-auth (module) | `SUPABASE_URL` / `SUPABASE_KEY` | 05-supabase-data (classic, `const`) | ✅ Global Lexical Environment 経由で bare 参照可 (classic `const` は globalThis property ではないが Global Lexical Env には住む) |
| 12-auth (module) | `renderMypage` | 13-mypage-common (classic, `function`) | ✅ `function` 宣言は globalThis property になるので bare 参照可 |
| 12-auth (module) | `supabase` (Supabase JS SDK) | CDN global | ✅ window property |
| classic | `initAuth` | 12-auth (module, function 宣言) | ❌→✅ デフォルトでは見えない。`window.initAuth = initAuth` 明示で解決 |

### 注意: `npm run check` の制約

`scripts/syntax-check.js` は `new Function(src)` でパースする = classic script context。今回 12-auth.js は **module syntax (`export` / `import`) を一切使っていない** ため、`new Function` でもパースが通る (18/18 OK)。

将来 `export const auth = NORIRECO.auth;` を追加すると syntax-check が落ちる。その時は syntax-check.js を `node --check --input-type=module` ベースに切り替える必要がある (v202 では未着手、`export` 不要なため)。

### 機能リグレッション検証

実機検証ポイント:
- [ ] ログインボタンをクリック → モーダル表示 (`openAuthModal` HTML onclick)
- [ ] Magic Link 送信 (`handleAuthMagicLinkSubmit`)
- [ ] Google OAuth (`handleAuthGoogleClick`)
- [ ] アバター表示 → ログアウト confirm → 実行 (`signOutUser` inline onclick)
- [ ] マイページ表示時に `currentUser.email` 取得 (13-mypage-common.js `NORIRECO.auth.currentUser`)
- [ ] OAuth リダイレクト後の PKCE code 交換 (`initAuth` 内、URL に `code=` パラメータがある時)

### Stage 2 の今後 (v203+)

次のモジュール化対象は **影響範囲の小さい順** に進める:

| 候補 | state 数 | cross-file 参照 | 注意点 |
|---|---|---|---|
| 11-fraud-detection | 0 (定数のみ) | 1 (07 が `fraudAssessTrip` 呼出) | 関数 export だけ |
| 13c-lines | 0 | 0 (09 の renderList を呼ぶだけ) | 最小 |
| 03-characters | 1 (`OWNED_CHARACTERS_KEY`) | 多数 (キャラ獲得は全体に絡む) | 中規模 |
| 06-map-leaflet | 3 (`NORIRECO.map.X`) | 全体 (Leaflet インスタンス) | 大規模、最後 |
| 02-data-loaders | 11 (`NORIRECO.data.X`) | 全体 (LINES 等) | 最大、最後 |

`type="module"` 化したファイルが増えても、**未変換ファイル間で `NORIRECO.<domain>` の bridge を介してアクセス**できるので、incremental に進められる。

### 教訓

- **stage 1 が正しく完了していれば、stage 2 は script tag 1 行の変更で済む** — windowization の投資はこの瞬間に回収される
- module-local 関数の **window 明示公開** を忘れると、HTML onclick / classic script からの呼び出しが silent fail (undefined function) する。事前に「外から呼ばれる関数リスト」を grep で洗い出すのが重要
- `npm run check` は module syntax を**まだ通せない**。`export` 追加は v203+ で syntax-check 拡張と同時に

---

## 50. v201 — ES Modules パイロット (案 β) stage 1 **完結**: mypage state を `window.NORIRECO.mypage.state` に集約 (2026-05-19)

### 背景

v195 (auth) → v196 (map) → v197 (record) → v198 (gps) → v199 (trains) → v200 (data) に続く **案 β stage 1 の 7 番目・最終ドメイン**。

### 移行した state (3 個)

| 旧 (top-level `let` in 13-mypage-common) | 新 |
|---|---|
| `_mypageCache` (取得した自分の trip[]) | `NORIRECO.mypage.state._mypageCache` |
| `mpActiveSection` ('stats'/'trips'/'lines') | `NORIRECO.mypage.state.mpActiveSection` |
| `mpTripFilter` (フィルタ object) | `NORIRECO.mypage.state.mpTripFilter` |

`NORIRECO.mypage` namespace は v190 で既に確立済み (関数 namespace)。今回はその下に `.state` プロパティとして state を集約 — auth/map/record/gps/trains/data の各 `NORIRECO.<domain>` 直下 (state も関数も同階層) とは異なる構造を選択。理由: mypage は **関数が圧倒的に多い** ドメイン (renderMypage / applyMpSection / tripCardHtml / 並び替え comparator 等)、state は ~3 個しかない。state を `.state` サブ namespace に隔離した方が `NORIRECO.mypage.X` の関数群がフラットに見えて読みやすい。

13-mypage-common.js 内は `const MP = NORIRECO.mypage.state` の local alias で `MP._mypageCache` 等の短縮形。13a-stats.js / 13b-trips.js は `NORIRECO.mypage.state.X` のフルパス。

### call site 書き換え (3 ファイル、61 箇所)

- `js/13-mypage-common.js` — 宣言部 + 13 箇所
- `js/13b-trips.js` — 47 箇所 (旅程フィルタ・並び替え・編集の中心)
- `js/13a-stats.js` — 1 箇所

### 案 β stage 1 完了サマリ

| ドメイン | バージョン | state 数 | 関係ファイル | 累計 |
|---|---|---|---|---|
| auth | v195 | 4 | 2 | 4 |
| map | v196 | 3 | 6 | 7 |
| record | v197 | 7 | 4 | 14 |
| gps | v198 | 12 | 2 | 26 |
| trains | v199 | 6 | 4 | 32 |
| data | v200 | 11 | 15 | 43 |
| **mypage** | **v201** | **3** | **3** | **46** |

**累計 46 state を `window.NORIRECO.<domain>.X` に集約**。

- 関係ファイル数 (累計、重複あり): 36 ファイル参照
- call site 累計: **~450 箇所**
- セッション間隔: 全 7 commit が同日 (2026-05-19) に完了
- syntax check: 各 commit 後 18/18 OK

### 案 β stage 2 (`<script type="module">` 化) の準備が整った

stage 1 完了で **classic script 共有 lexical scope への依存はゼロ**。各ファイルは:
1. `<script src>` でロードされる順序が変わっても OK (state は `NORIRECO.<domain>` の object property、ロード順は副次的)
2. `<script type="module">` 化しても OK (module export の代わりに `window.NORIRECO.<domain>.X` で公開)
3. module / classic 混在ロード可 (deferred 化された module が走るときには bridge が既に classic ロード時点で確立済み)

stage 2 で各ファイルを `type="module"` 化するときの手順:
1. 該当ファイルの `<script>` タグに `type="module"` 追加
2. ファイル末尾に `export const <domain> = NORIRECO.<domain>;` を追加 (module consumer 用)
3. ロード順制約があれば top-level `await import('./xxx.js')` で逐次解決
4. SW (`sw.js`) の Network-First が `type="module"` でもキャッシュバスティング可能か実機検証

stage 2 は別セッションで集中して対応。stage 1 完了で「**いつでも module 化を始められる準備**」が整った。

### 教訓 (v195〜v201 通しで)

1. **mutable object property パターン** が classic→module 移行で最も安全
   - `let X` の rebinding (`X = ...`) を `obj.X = ...` の property assignment に置換するだけで意味論保存
   - module 側で `export const obj = {...}; window.<domain> = obj` の bridge 1 行で classic 側互換
2. **property 名と変数名の collision** は `replace_all` で宣言ブロックを壊す
   - 対策: 「宣言ブロック先書き → use 全置換 → 宣言ブロック修復」の 3 段階手順 (v198 で確立)
3. **state 名同士の部分文字列衝突** は cascading corruption を生む
   - 対策: 短い名前を先に置換 → 副作用 (substring 含意) を cleanup pass で復元 (v200 で確立)
4. **incremental commit のすばらしさ**: 7 commit に分けたので、どの段階でも `git revert` で戻せる。実際 v196 / v197 / v198 / v199 / v200 でそれぞれ replace_all 起因の局所事故があったが、commit 内 (push 前) の手動修正で吸収できた。1 commit で全部やっていたらどこで何が壊れたか追えなくなっていた。

---

## 49. v200 — ES Modules パイロット (案 β) stage 1: data domain state を `window.NORIRECO.data` に集約 (最大規模、2026-05-19)

### 背景

v195 (auth) / v196 (map) / v197 (record) / v198 (gps) / v199 (trains) に続く 6 番目のドメイン。**案 β stage 1 の最大規模** ドメイン。`data` (路線・営業系統・統合駅・キャラマスター・キャラモード等) の state は 02-data-loaders.js が中心、cross-file 参照は **15 ファイル / 146 箇所** という分量。

これまでの 5 ドメインで合計 32 state を集約。v200 で追加 11 state を集約、累計 **43 state**。停泊バージョンが「v200」になるのも象徴的。

### 移行した state (11 個)

| 旧 | 新 | 用途 |
|---|---|---|
| `LINES` | `NORIRECO.data.LINES` | N02 物理路線 (606) — central master |
| `RUNNING_SERVICES` | `NORIRECO.data.RUNNING_SERVICES` | running_services.json (後方互換) |
| `MERGED_STATIONS` | `NORIRECO.data.MERGED_STATIONS` | 統合駅 (9017) |
| `slMergedStationMap` | `NORIRECO.data.slMergedStationMap` | 営業系統 id → mergedStation 索引 |
| `SERVICE_LINES_MASTER` | `NORIRECO.data.SERVICE_LINES_MASTER` | service_lines_master.json |
| `SERVICE_LINES` | `NORIRECO.data.SERVICE_LINES` | 営業系統 (637+α) |
| `serviceLinesLoaded` | `NORIRECO.data.serviceLinesLoaded` | マスター読込済みフラグ |
| `serviceLinesBuilt` | `NORIRECO.data.serviceLinesBuilt` | 構築済みフラグ |
| `CHARACTERS` | `NORIRECO.data.CHARACTERS` | キャラマスター |
| `stationCharMap` | `NORIRECO.data.stationCharMap` | 駅名 → キャラリスト |
| `charModeOn` | `NORIRECO.data.charModeOn` | 🎭 キャラ表示 ON/OFF |

02-internal な loader 補助 state (`loadedPriorities` / `pendingLoads` / `PRIORITY_FILES`) は cross-file 参照なし → NORIRECO.data に載せず、02 内 const のまま維持。

02-data-loaders.js 内は `const D = NORIRECO.data` で `D.X` 短縮。外部 14 ファイル (02b/03/04/04b/05/06/07/08/09/10/11/13-common/13a/13b) は `NORIRECO.data.X` フルパス。

### 教訓: 部分文字列衝突 (substring collision) の致命性

state 名同士が **部分文字列** で被ると、replace_all の順序によっては cascading corruption が起きる。今回最も問題になった衝突:

| 包含関係 | 例 |
|---|---|
| `LINES` ⊂ `SERVICE_LINES` ⊂ `SERVICE_LINES_MASTER` | LINES を先に置換すると 3 重ネスト |
| `CHARACTERS` ⊂ `OWNED_CHARACTERS_KEY` | CHARACTERS を置換すると localStorage キー識別子も壊れる |

v195〜v199 の「property 名 vs 変数名」 collision とは別軸の問題。「**state 名の部分文字列が別の state 名 or 別の識別子の一部にもなっている**」ケース。

#### 対策 (v200 で確立)

**Pattern A: 短いほうを先に処理、後で復元**
1. `LINES` → `NORIRECO.data.LINES`
   - 副作用: `SERVICE_LINES` → `SERVICE_NORIRECO.data.LINES`
   - 副作用: `SERVICE_LINES_MASTER` → `SERVICE_NORIRECO.data.LINES_MASTER`
2. **クリーンアップ**: `SERVICE_NORIRECO.data.LINES` → `NORIRECO.data.SERVICE_LINES` (substring match で `_MASTER` 形も一括復元)

これで 3 つの状態を 2 ステップで処理できる (`LINES` / `SERVICE_LINES` / `SERVICE_LINES_MASTER`)。3 ステップ分の Edit が 2 ステップに圧縮できる。

ただしファイルによっては `SERVICE_LINES` を先に処理してしまい、2 重 / 3 重ネストが発生したケースもあった (例: 04-gps-location.js で `NORIRECO.data.NORIRECO.data.SERVICE_NORIRECO.data.LINES_MASTER` まで深くなった)。事後の cleanup pass で `NORIRECO.data.NORIRECO.data.X` を `NORIRECO.data.X` に collapse する必要があった。

#### 反省点

理想は **placeholder pattern** (`LINES` → `__L__`、`SERVICE_LINES` → `__SL__`、その後 placeholder → 最終形) だったが、ファイル数 × state 数で edit 数が 2 倍になるため断念。代わりに「Pattern A + cleanup pass」で実用上 OK と判断。

v200 の総 edit 数: 約 100 回 (うち 30 回は失敗 = state が該当ファイルになし、ほか cleanup 10 回)。

### call site 書き換え (15 ファイル、146 箇所)

| ファイル | refs |
|---|---|
| 02-data-loaders.js | 35 (宣言 + 内部) |
| 04b-ride-record.js | 16 |
| 04-gps-location.js | 14 |
| 02b-service-lines-builder.js | 14 |
| 08-rendering.js | 12 |
| 13a-stats.js | 21 |
| 03-characters.js | 7 |
| 05-supabase-data.js | 7 |
| 06-map-leaflet.js | 4 |
| 07-record-mode.js | 4 |
| 09-tabs-stats.js | 3 |
| 13-mypage-common.js | 3 |
| 13b-trips.js | 3 |
| 11-fraud-detection.js | 2 |
| 10-init.js | 1 |

### 影響範囲

- 全 18 ファイル中 15 ファイルが影響
- `sw.js` — `CACHE_VERSION = 'v200'`
- `npm run check` — 18/18 OK
- 機能リグレッション: なし (state 名前空間化のみ、ロジック無変更)

### 進捗 (案 β stage 1)

| ドメイン | バージョン | state 数 | 累計 |
|---|---|---|---|
| auth | v195 | 4 | 4 |
| map | v196 | 3 | 7 |
| record | v197 | 7 | 14 |
| gps | v198 | 12 | 26 |
| trains | v199 | 6 | 32 |
| **data** | **v200** | **11** | **43** |
| mypage | v201 (最終) | 3 | 46 |

残りは `mypage` 1 ドメインのみ。**案 β stage 1 は v201 で完結予定**。

### 案 β stage 2 (`<script type="module">` 化) への準備が整った

stage 1 完了で cross-file shared state は全て `window.NORIRECO.<domain>.X` の object property になった。stage 2 では各ファイルを `type="module"` 化して `import`/`export` で繋ぐが、その間 classic script との互換は `window.NORIRECO` bridge 1 つで保てる:

```js
// 例: 02-data-loaders.js (module 化後)
export const data = { LINES: [], SERVICE_LINES: [], ... };
window.NORIRECO.data = data;  // bridge for remaining classic scripts
```

bridge object は **mutable で参照同じ** のため、module 側で `data.LINES.push(...)` してもclassic script 側の `NORIRECO.data.LINES.length` が同期して見える。これが v195 で意図した「2 段階移行で classic と module が共存できる」設計の証明。

---

## 48. v199 — ES Modules パイロット (案 β) stage 1: trains domain state を `window.NORIRECO.trains` に集約 (2026-05-19)

### 背景

v198 (gps) に続く 5 番目のドメイン。`trains` (列車マスター + 列車セレクタ UI 状態) の state は 02-data-loaders.js が中心、cross-file 参照は 07 / 09 / 13a。

state 6 個。`TRAINS` / `TRAIN_CATEGORIES` (列車マスター本体) と `selectedTrain*` (UI セレクタ状態) が同じドメインに同居する形だが、両方とも列車関連なので 1 ドメインに集約。

### 移行した state (6 個)

| 旧 | 新 |
|---|---|
| `TRAINS` | `NORIRECO.trains.TRAINS` |
| `TRAIN_CATEGORIES` | `NORIRECO.trains.TRAIN_CATEGORIES` |
| `selectedTrainId` | `NORIRECO.trains.selectedTrainId` |
| `selectedTrainName` | `NORIRECO.trains.selectedTrainName` |
| `selectedTrainCategory` | `NORIRECO.trains.selectedTrainCategory` |
| `selectedCarModel` | `NORIRECO.trains.selectedCarModel` |

02-data-loaders.js 内は `const T = NORIRECO.trains` で `T.X` 短縮。外部 (07 / 09 / 13a) は `NORIRECO.trains.X` フルパス。

### call site 書き換え (4 ファイル、39 箇所)

- `js/02-data-loaders.js` — 宣言部 + 30 箇所 (列車セレクタ UI イベントハンドラ群)
- `js/07-record-mode.js` — 4 箇所 (記録モーダルの列車選択統合)
- `js/09-tabs-stats.js` — 3 箇所 (統計タブ「🚆 列車制覇」セクションで TRAINS / TRAIN_CATEGORIES を参照)
- `js/13a-stats.js` — 2 箇所 (車両形式集計で TRAINS を参照)

v198 で確立した 3 段階手順 (宣言 → replace_all → 宣言を 1 回まとめて修正) で機械的に処理。

### 影響範囲

- `js/02-data-loaders.js` — 宣言部 + 30 箇所書き換え (機能無変更)
- `js/07-record-mode.js` / `09-tabs-stats.js` / `13a-stats.js` — call site のみ
- `sw.js` — `CACHE_VERSION = 'v199'`
- `npm run check` — 18/18 OK
- 機能リグレッション: なし

### 進捗 (案 β stage 1)

| ドメイン | バージョン | state 数 | 累計 |
|---|---|---|---|
| auth | v195 | 4 | 4 |
| map | v196 | 3 | 7 |
| record | v197 | 7 | 14 |
| gps | v198 | 12 | 26 |
| **trains** | **v199** | **6** | **32** |
| data | v200 (次・最大規模) | ~10 (LINES/SERVICE_LINES/MERGED_STATIONS/CHARACTERS) | ~42 |
| mypage | v201 | 3 | ~45 |

残りは `data` (最大規模) と `mypage` の 2 ドメイン。

---

## 47. v198 — ES Modules パイロット (案 β) stage 1: gps domain state を `window.NORIRECO.gps` に集約 (2026-05-19)

### 背景

v195 (auth) / v196 (map) / v197 (record) に続く 4 番目のドメイン。`gps` (現在地表示 + GPS 認証 trip) の state は 04-gps-location.js が中心、cross-file 参照は 07-record-mode.js のみ。

state 数は **12 個** で最多 (auth=4 / map=3 / record=7 / **gps=12**)。現在地マーカー / 追従モード / GPS 認証 trip 始点・終点・タイムスタンプ / 最寄駅候補リストなど、Phase 1〜3.6 (v89〜v131) で段階的に増えた 12 個の state がフラットに置かれていた。

### 移行した state (12 個)

| 旧 (top-level `let`) | 新 (NORIRECO.gps プロパティ) | 用途 |
|---|---|---|
| `locationMode` | `NORIRECO.gps.locationMode` | 0:off / 1:on / 2:follow |
| `locationWatchId` | `NORIRECO.gps.locationWatchId` | watchPosition の id |
| `userLocationMarker` | `NORIRECO.gps.userLocationMarker` | 青ドット |
| `userLocationCircle` | `NORIRECO.gps.userLocationCircle` | 精度円 |
| `didInitialCenter` | `NORIRECO.gps.didInitialCenter` | mode=1 の初回中心化フラグ |
| `lastUserGps` | `NORIRECO.gps.lastUserGps` | 直近の {lat, lon, accuracy} |
| `recordStartedViaGPS` | `NORIRECO.gps.recordStartedViaGPS` | GPS 経由記録か否か |
| `recordStartGPS` | `NORIRECO.gps.recordStartGPS` | 発進時 GPS スナップショット |
| `recordStartedAt` | `NORIRECO.gps.recordStartedAt` | 記録モード突入時刻 ISO |
| `recordEndTime` | `NORIRECO.gps.recordEndTime` | 「ここで終了」押下時刻 ISO |
| `nearestCandidates` | `NORIRECO.gps.nearestCandidates` | 最寄駅候補リスト |
| `nearestPickedIdx` | `NORIRECO.gps.nearestPickedIdx` | 選択 index |

04-gps-location.js 内は `const G = NORIRECO.gps` の local alias で `G.X` に短縮。外部 (07) は `NORIRECO.gps.X` のフルパス。

### v197 教訓の適用 — 「宣言ブロック汚染」事故

v197 で発覚した「state object の property 名 (`pairLineChoices`) と外部識別子が同名のとき replace_all で宣言まで壊れる」事故が、v198 でも **同じ手順を踏んで再発**。今回 12 個の property すべてが該当 (property 名 = 変数名)。

対処手順 (v198 で確立):
1. 宣言ブロックを **先に** 書く (`NORIRECO.gps = { locationMode: 0, ... }`)
2. **その後** state 名ごとに replace_all (`locationMode` → `G.locationMode` 等) を実行 — 宣言ブロックも `G.locationMode: 0,` の syntax error 形に汚染される
3. **最後に** declaration block を **手動で 1 回まとめて** plain property 名 (`locationMode: 0,`) に戻す

宣言 → use 書き換え → 宣言を戻す、の 3 段階。declaration を 1 回まとめて修正できるので、property 数が増えても手間は線形にしか増えない (v198 12 個 = 1 回の Edit で 13 行修正)。

v200 (data domain) の事前準備として、property 名と変数名を明示的にずらす案 (`LINES` → `NORIRECO.data.lines`) も検討したが、cross-file 識別子の **意味の保存** (`lines` と `LINES` が同じものを指すと一目で分かる) を優先し、3 段階手順を踏襲する方針。

### call site 書き換え (2 ファイル、約 60 箇所)

- `js/04-gps-location.js` — 宣言部 (12 行) + 約 50 箇所 (12 state × 平均 4 ref)
- `js/07-record-mode.js` — 約 30 箇所 (`NORIRECO.gps.lastUserGps` / `recordStartedViaGPS` / `recordStartGPS` / `recordStartedAt` / `recordEndTime` / `locationMode` の 6 種類が記録パネル状態判定で使われる)

### 影響範囲

- `js/04-gps-location.js` — 宣言部 + 約 50 箇所書き換え (機能無変更)
- `js/07-record-mode.js` — 約 30 箇所 (記録モードの GPS 認証パス全般)
- `sw.js` — `CACHE_VERSION = 'v198'`
- `npm run check` — 18/18 OK
- 機能リグレッション: なし

### 進捗 (案 β stage 1)

| ドメイン | バージョン | state 数 | 関係ファイル | 累計 state |
|---|---|---|---|---|
| auth | v195 | 4 | 2 | 4 |
| map | v196 | 3 | 6 | 7 |
| record | v197 | 7 | 4 | 14 |
| **gps** | **v198** | **12** | **2** | **26** |
| trains | v199 (次) | 4 | 2-3 | 30 |
| data | v200 | ~10 (最大規模、cross-file 参照も最大) | 全体 | ~40 |
| mypage | v201 | 3 | 13-common/a/b | ~43 |

ここまでで 26 state を NORIRECO.<domain>.X に集約済み。残りは `data` (LINES/SERVICE_LINES 系) が最大規模だが、ロジックは ES Modules 化を見越して整理済み (v191 ローダー集約 + v192 builder 切り出し)。

---

## 46. v197 — ES Modules パイロット (案 β) stage 1: record domain state を `window.NORIRECO.record` に集約 (2026-05-19)

### 背景

v195 (auth) / v196 (map) に続く 3 番目のドメイン。`record` (📝 手動記録モード) の state は 07-record-mode.js が中心、cross-file 参照は 04 / 06 / 08 の 3 ファイル。state 数は 7 個と最多 (これまで auth=4 / map=3)。

### 移行した state (7 個)

| 旧 (top-level `let` / `const`) | 新 (NORIRECO.record プロパティ) |
|---|---|
| `recordMode` | `NORIRECO.record.mode` |
| `recordSelection` | `NORIRECO.record.selection` |
| `recordHighlights` | `NORIRECO.record.highlights` |
| `pairLineChoices` (Map) | `NORIRECO.record.pairLineChoices` |
| `currentSegments` | `NORIRECO.record.segments` |
| `endStationCandidates` (line 583) | `NORIRECO.record.endStationCandidates` |
| `endStationPickedIdx` (line 584) | `NORIRECO.record.endStationPickedIdx` |

`recordSelection` / `recordHighlights` / `pairLineChoices` は元 `const` (mutable container)、`recordMode` / `currentSegments` / `endStation*` は元 `let` (rebindable)。NORIRECO.record の object property としては区別なく扱える。

07-record-mode.js 内は `const R = NORIRECO.record` の local alias で `R.mode` / `R.selection` / `R.segments` 等の短縮形を使用。外部 (04 / 06 / 08) は `NORIRECO.record.X` のフルパス。

### call site 書き換え (4 ファイル、約 80 箇所)

- `js/07-record-mode.js` — 宣言部 + 約 75 箇所 (replace_all で `recordMode` → `R.mode` 等の機械置換)
- `js/04-gps-location.js` — 6 箇所 (`recordMode` ×3 + `recordSelection` ×複数 + `currentSegments` ×複数。手動記録パネルの表示更新ロジックで使う)
- `js/06-map-leaflet.js` — 2 箇所 (`map.on('click')` ハンドラ内の `recordMode` 判定)
- `js/08-rendering.js` — 1 箇所 (`attachStationDotClickV2` 内の `if (recordMode)`)

### 教訓: replace_all とコメント内識別子の衝突

state object 宣言内のプロパティ名 (`pairLineChoices: new Map()`) と外部識別子 (`pairLineChoices`) が同名の場合、`replace_all 'pairLineChoices' → 'R.pairLineChoices'` を実行すると **宣言内のキー名まで `R.pairLineChoices: ...` に化けて構文エラー**になる。

v197 では `pairLineChoices` / `endStationCandidates` / `endStationPickedIdx` の 3 つで実際にこの事故が発生 (npm run check で SyntaxError なし、別の visual review で発覚)。

対策:
1. 宣言ブロックは `replace_all` の前に書き換え済みにしておく (今回採用)
2. または declaration の property 名を意図的に変える (e.g., `pairLineChoices` → `pairChoices`) — 今回は採用せず
3. または `replace_all` ではなく `\brecordMode\b` のような単語境界 grep + sed 系ツールで boundary check付きで置換

v200 (data domain、LINES/SERVICE_LINES 等の最大規模) では state object のプロパティ名と外部識別子を意図的に分岐 (`NORIRECO.data.lines` / `NORIRECO.data.serviceLines` 等の camelCase 化) して衝突を構造的に防止する想定。

### 影響範囲

- `js/07-record-mode.js` — 宣言部 + 約 75 箇所書き換え (機能無変更)
- `js/04-gps-location.js` / `06-map-leaflet.js` / `08-rendering.js` — call site のみ
- `sw.js` — `CACHE_VERSION = 'v197'`
- `npm run check` — 18/18 OK
- 機能リグレッション: なし

### 進捗 (案 β stage 1)

| ドメイン | バージョン | state 数 | 関係ファイル | 状態 |
|---|---|---|---|---|
| auth | v195 | 4 | 2 | ✅ |
| map | v196 | 3 | 6 | ✅ |
| **record** | **v197** | **7** | **4** | **✅** |
| gps | v198 (次) | ~10 | 2 | 🔜 |
| trains | v199 | 4 | 2-3 | 🔜 |
| data | v200 | ~10 (LINES 系最大) | 全体 | 🔜 |
| mypage | v201 | 3 | 13-common/a/b | 🔜 |

state 数が増えるにつれ宣言ブロックの可読性確保が課題。v198 以降は宣言を JSDoc コメント付きで整理する。

---

## 45. v196 — ES Modules パイロット (案 β) stage 1: map domain state を `window.NORIRECO.map` に集約 (2026-05-19)

### 背景

v195 (auth pilot) で確立した「state を `window.NORIRECO.<domain>.X` の mutable object property に集約」パターンを **2 番目のドメイン (map)** に適用。`map` (Leaflet インスタンス) は cross-file 参照の三大塊の一つで、6 ファイル 39 箇所で使われる。

`map` を選んだ理由: state 数が少なく (3 個) Leaflet インスタンスの実体は 1 度だけ代入される (init 後は read-only に近い) ため、`let → object property` の機械的置換が最も安全。v200 で着手予定の `data` (LINES/SERVICE_LINES/MERGED_STATIONS 等の最大規模ドメイン) に進む前に、中規模で書き換え手順を習熟する位置付け。

### 移行した state (3 個)

| 旧 (top-level `let`) | 新 (NORIRECO.map プロパティ) |
|---|---|
| `map` (Leaflet インスタンス) | `NORIRECO.map.instance` |
| `memoMode` (📸 メモモード ON/OFF) | `NORIRECO.map.memoMode` |
| `clickInfo` (直近マップクリック context) | `NORIRECO.map.clickInfo` |

`map` は **単一代入** (init で一度だけ `L.map(...)` を代入) なので `let map = null` → `NORIRECO.map.instance = null; ... .instance = L.map(...)` の単純置換で済む。`memoMode` / `clickInfo` は read/write 両方ある mutable プロパティ。

06-map-leaflet.js 内では `const M = NORIRECO.map` の local alias で `M.instance` / `M.memoMode` / `M.clickInfo` の短い形を維持。外部 (04 / 05 / 07 / 08 / 09) からはフルパス `NORIRECO.map.instance` 等。

### call site 書き換え (6 ファイル、約 50 箇所)

- `js/06-map-leaflet.js` — 宣言箇所 + 内部 16 箇所 (`M.instance` / `M.memoMode` / `M.clickInfo`)
- `js/04-gps-location.js` — 8 箇所 (`map.setView` / `map.getZoom` / `map.removeLayer` / `addTo(map)` / `if(!map)`)
- `js/05-supabase-data.js` — 4 箇所 (`map.removeLayer` ×3 + `typeof map !== 'undefined' && map` / `if (map && dotLayerRef)`)
- `js/07-record-mode.js` — 9 箇所 (`map.removeLayer` ×3 / `map.setView` / `map.fitBounds` / `map.getContainer` ×2 / `addTo(map)` / `if(!map)` / `memoMode`)
- `js/08-rendering.js` — 約 20 箇所 (`map.hasLayer` / `map.addLayer` / `map.removeLayer` / `map.getZoom` / `map.getBounds` / `map.getContainer` / `addTo(map)` ×8 / `memoMode` ×4 / `clickInfo` ×6)
- `js/09-tabs-stats.js` — 1 箇所 (`map.invalidateSize`)

`Array.prototype.map(...)` の呼び出し (`stations.map(s => ...)` 等) と区別するため、`map.X` と `map ?` / `if(map)` / `addTo(map)` をそれぞれ別パターンで処理。最終確認で grep で bare `map` が残っていないことを検証。

### 設計上の判断

- **`NORIRECO.map.instance` を選んだ理由**: Leaflet インスタンスは「the map」というドメインの主役なので、ドメイン名前空間自体を `NORIRECO.map` にした。`NORIRECO.map.leaflet` / `NORIRECO.map.L` 等の代案もあったが、将来 Mapbox 等への乗り換え可能性を残すために中立な `instance` を採用。
- **`memoMode` を `NORIRECO.map` 配下に置いた理由**: メモモードは map クリックハンドラと一体で動くため (`map.on('click', ...)` の中で `memoMode` を読む)、論理的に同じドメイン。`NORIRECO.memo` を切るのは過剰分割。
- **`M` local alias を 06 内のみに留めた理由**: 外部ファイル (04/05/07/08/09) は単一短縮命名 (`M`) を共有できない (`M` が別の意味で使われる可能性)。フルパス `NORIRECO.map.X` は冗長だがファイル横断で曖昧性ゼロ。

### 影響範囲

- `js/06-map-leaflet.js` — 宣言部 + 19 箇所書き換え (機能無変更)
- `js/04-gps-location.js` / `05-supabase-data.js` / `07-record-mode.js` / `08-rendering.js` / `09-tabs-stats.js` — call site 書き換えのみ
- `sw.js` — `CACHE_VERSION = 'v196'`
- `npm run check` — 18/18 OK
- 機能リグレッション: なし (state 名前空間化のみ、ロジック無変更)

### v195 との比較

| 観点 | v195 (auth) | v196 (map) |
|---|---|---|
| state 数 | 4 | 3 |
| 関係ファイル | 2 | 6 |
| call site 数 | 22 | 約 50 |
| state の mutability | 全て mutable | 1 単一代入 + 2 mutable |
| Array.prototype.map 等との曖昧性 | なし | あり (`.map(...)` 多用) |

map の方が規模が大きいが、`let map=null` の単一代入性のおかげで実装は機械的に済んだ。次の `record` (07) / `gps` (04) / `data` (02 LINES 系) は更に規模拡大の見込み。

### 教訓

- **`Array.prototype.map(...)` の曖昧性対策**: `\bmap\b` で grep すると `arr.map(...)` も大量にヒットする。`map.X` (member access) と `addTo(map)` / `if(map)` / `map ?` のパターンを分けて edit するのが安全。`map.` (literal) の replace_all は `_mapMode` や `arr.map(` には誤マッチしないので利用可。
- **`typeof map !== 'undefined' && map`**: v131 ロード順事故の名残で defensiveness が複数箇所にあった。`NORIRECO.map.instance` 化で `typeof X !== 'undefined'` の必要性が消える (`NORIRECO.map` は常に存在する)。コードが少し短くなる副作用。

---

## 44. v195 — ES Modules パイロット (案 β) stage 1: 認証 state を `window.NORIRECO.auth` に集約 (2026-05-19)

### 背景

TODO.md §🔥「ES Modules 化 (本番)」の **案 β「window 化 → モジュール化の 2 段階」のパイロット**。v194 までで `NORIRECO.mypage` / `NORIRECO.serviceLines` / `NORIRECO.rideRecord` の **関数 / IIFE 単位の namespace 化** は終わっているが、`let LINES` / `let currentUser` のような **top-level mutable state** はまだ classic script 共有 lexical scope に住んでいる。これが `<script type="module">` 化の最大の壁 (モジュールスコープは script スコープと別物で、`let X` を他ファイルから素の名前で参照できなくなる)。

### 案 β の 2 段階

| Stage | 内容 | この commit (v195) |
|---|---|---|
| 1 | 共有 state を `window.NORIRECO.<domain>.X` の **mutable object property** に集約 (classic script のまま、`<script>` ロード順は変更なし) | 12-auth に対して実施 (pilot) |
| 2 | 各ファイルを `<script type="module">` 化し、`export const auth = ...; window.NORIRECO.auth = auth;` のブリッジで残り classic script 互換を保つ | 次セッション以降 |

stage 1 は **モジュール化に進む前段の地ならし** で、call site の書き換え量を「let → object property」の機械的置換に限定して安全に進められる。stage 2 で破壊的変更 (script type 変更・load 順 deferred 化) が入っても、bridge 1 行で classic script 側が動き続ける。

### 移行した state (4 個)

| 旧 (top-level `let`) | 新 (NORIRECO.auth プロパティ) |
|---|---|
| `supabaseAuthClient` | `NORIRECO.auth.supabaseAuthClient` |
| `currentUser` | `NORIRECO.auth.currentUser` |
| `currentSession` | `NORIRECO.auth.currentSession` |
| `authBackfillRan` | `NORIRECO.auth.authBackfillRan` |

12-auth.js 内では先頭で `const auth = window.NORIRECO.auth` のローカル alias を作り、ファイル内のすべての参照を `auth.currentUser` / `auth.supabaseAuthClient` 等に短縮。外部 (13-mypage-common.js) からは `NORIRECO.auth.currentUser` のフルパス。

### なぜ 12-auth を pilot に選んだか

- **state 数が少ない** (4 個) — レビューと検証が一目で済む
- **cross-file 参照が 13-mypage-common.js の 1 箇所のみ** (`renderMypage()` 内の email 表示) — 書き換えコスト最小
- **render hot path に乗らない** — auth 状態は user interaction で読まれるだけ、init や描画ループから外れている
- **モジュール化したい筆頭** (Notion §2.4 布石⑤ Supabase ラッパー化と地続き)

### call site 書き換え (5 ファイル → 2 ファイル、計 22 箇所)

- `js/12-auth.js` (21 箇所) — `supabaseAuthClient.auth.xxx` → `auth.supabaseAuthClient.auth.xxx`、`currentUser` → `auth.currentUser` 他
- `js/13-mypage-common.js:59` — `currentUser` → `NORIRECO.auth.currentUser`

`currentUserId()` / `authBearerToken()` / `signInWithMagicLink()` などの **関数 API は無変更** (内部で `auth.xxx` を読むようになっただけ)。他ファイルからは引き続き `currentUserId()` / `authBearerToken()` で呼べる。

### 影響範囲

- `js/12-auth.js` — `let X` × 4 を `window.NORIRECO.auth = { ... }` に集約、内部参照を `auth.X` に書き換え (機能無変更)
- `js/13-mypage-common.js:59` — `currentUser` → `NORIRECO.auth.currentUser` (1 行)
- `sw.js` — `CACHE_VERSION = 'v195'`
- `npm run check` — 18/18 OK

### stage 2 (次セッション) の段取り

12-auth を `<script type="module">` 化するには:

1. `<script src="js/12-auth.js">` → `<script type="module" src="js/12-auth.js">` に変更
2. 12-auth.js の最後に `export const auth = window.NORIRECO.auth;` を追加 (将来 module consumer 用)
3. **deferred 化の影響確認**: `type="module"` は暗黙 `defer` なので、12-auth は他の classic script (10-init.js 等) の後で評価される。`initAuth()` 呼び出しのタイミングを `DOMContentLoaded` 後に揃える
4. 04-gps-location.js / 13-mypage-common.js 等の **classic script から `NORIRECO.auth.currentUser` を読む側** は無変更で動く (bridge オブジェクトは module 評価時に確立される)

ただし stage 2 は **deferred 化で初期化順が崩れるリスク**があるため、別セッションで集中して対応。stage 1 (v195) で生まれた `NORIRECO.auth` namespace は stage 2 が来なくても単体で正しく動く。

### 残る windowization 候補 (案 β stage 1 の続き、優先度順)

| Domain | 候補 state | 候補ファイル | 利用箇所 |
|---|---|---|---|
| auth (済) | supabaseAuthClient, currentUser, currentSession, authBackfillRan | 12 | 12, 13-common |
| map | map, memoMode, clickInfo | 06 | 全体 (最大の cross-file 参照) |
| record | recordMode, recordSelection, recordHighlights, pairLineChoices, currentSegments | 07 | 06, 08, 13a |
| gps | locationMode, lastUserGps, recordStartGPS, recordEndTime 他 | 04 | 04, 07 |
| trains | TRAINS, TRAIN_CATEGORIES, selectedTrain* | 02 | 07, 13a |
| data | LINES, SERVICE_LINES, MERGED_STATIONS, CHARACTERS 他 | 02 | 全体 (最大の規模) |
| mypage | _mypageCache, mpActiveSection, mpTripFilter | 13-common | 13a-c |

`map` / `record` / `data` が cross-file 参照の三大塊。pilot (auth) で得た書き換え量の見積りは「state 1 個 ≒ 数行 / consumer file」。`data` 系 (LINES 単体で 100+ 参照) は 1 セッション = 1 ドメインの粒度で進める想定。

### 補足: 案 β を選んだ理由

TODO.md §🔥 で示された 3 案のうち、

- **(a) 全 18 ファイル一気にモジュール化** — 巨大 PR、戻し不能、checkpoint なし
- **(b) state を window.X に出すリファクタ先行 = 案 β** — incremental、各 commit が単体で動く、戻し可能
- **(c) 新規モジュールだけ追加、既存触らず** — pilot として最も safe だが、本質課題 (既存 state の lexical scope 依存) を先送りするだけで「ES Modules 化」のゴールに進まない

案 β は **どの commit でも `git revert` 1 発で戻せる**という安全装置が最大の利点。v131 以降の分割祭り (v190 / v192 / v194) と同じリズムで進められる。

### 教訓

- 「namespace に lift する」だけだと **bare identifier を mass rewrite する必要がある**ように見えるが、**file 内に `const auth = NORIRECO.auth` の local alias を置けばファイル内は短い書き方を維持できる**。cross-file 参照だけがフルパス。これは v192 の `NORIRECO.serviceLines` でも同じパターン。
- mutable state を `let X = ...; window.X = X` の 2 重宣言にしない。**single source of truth は `NORIRECO.<domain>.X` だけ**にする。`let X` を残すと stage 2 module 化で「export してるのは module-local X、bridge してるのは別の X」になり、bridge と module の値が divergence する事故が起きる。

---

## 43. v194 — trip 解決 + 乗車状態集計を `04` → `04b-ride-record.js` に切り出し + `NORIRECO.rideRecord` ドメイン (2026-05-19)

### 背景

v192 (SERVICE_LINES 構築の 02b 切り出し) と同じ案 D パターンで、04-gps-location.js の残るドメイン外コード ("trip → segments 解決" + "乗車状態集計") を `04b-ride-record.js` に切り出し。04 を本来の「現在地表示 + 最寄駅 + 記録パネル + キャラ獲得」のみのファイルに純化。

これで 04-gps-location.js は 1037 行 (v190) → 927 (v191、ローダー移管) → 788 (v192、SERVICE_LINES 構築移管) → 430 (v194、trip 解決 + 乗車集計移管) と **本来の責務サイズ (430 行) まで縮小**。「ファイル名と中身が一致する」状態に到達。

### 切り出した内容 (04 → 04b)

| カテゴリ | 名前 | v194 後の場所 |
|---|---|---|
| データ辞書 | `LEGACY_ID_MAP` (旧ID → N02-25 マッピング) | IIFE 内部 (非公開) |
| ヘルパー | `normStName(name)` 駅名正規化 | `NORIRECO.rideRecord.normStName` (05 から外部参照) |
| trip 解決 | `resolveLineWithStations` / `resolveServiceTrip` / `resolveSegments` / `resolveByServiceLine` | IIFE 内部 (非公開) |
| 派生状態 | `slRiddenSt` / `slStopType` / `slVisitCount` / `riddenServiceIds` | 04b top-level `const` (classic script lexical scope 共有のまま、他ファイルから名前で参照可) |
| 集計関数 | `rebuildRiddenStations` | `NORIRECO.rideRecord.rebuild` |
| dead code | `resolveLineId` (定義のみ、呼び出し 0) | **削除** |

state 変数を IIFE 外の top-level `const` に置く設計は v192 と同じ。これで外部スクリプト (04, 02b, 08 等) は `slRiddenSt[sl.id]` のような直接参照を変更せずに済み、関数呼び出し (`rebuildRiddenStations()` → `NORIRECO.rideRecord.rebuild()`) だけが書き換わる。

### call site 書き換え (7 箇所、5 ファイル)

- `rebuildRiddenStations()` → `NORIRECO.rideRecord.rebuild()`
  - `js/02-data-loaders.js:61`
  - `js/05-supabase-data.js:265, 399`
  - `js/06-map-leaflet.js:118`
  - `js/07-record-mode.js:895`
- `normStName(...)` → `NORIRECO.rideRecord.normStName(...)`
  - `js/05-supabase-data.js:516, 517` (05 内 lStats / 駅検索ループ)

04 自身の `slRiddenSt` 参照 (drawObtainableIndicators 内) は引き続き名前で読む (top-level const として lexical scope 経由)。

### ロード順

`04 → 04b → 05`。04b は内部で `riddenSt` (05 で `const riddenSt={}`) を読み書きするが、これは `rebuild()` 関数本体の runtime 参照なので、parse 時点の前後関係は無関係 (`rebuild()` の最初の呼び出しは `load` イベント以降)。

### 影響範囲

- `js/04-gps-location.js` — 788 → 430 行 (-358)
- 新規 `js/04b-ride-record.js` — 約 370 行 (IIFE + JSDoc + top-level state const)
- `js/02-data-loaders.js` / `05-supabase-data.js` / `06-map-leaflet.js` / `07-record-mode.js` — call site 書き換えのみ
- `js/02b-service-lines-builder.js` — JSDoc コメントの slRiddenSt 参照先を「04 → 04b」に更新 (機能無変更)
- `noritetsu-map.html` — `<script src="js/04b-ride-record.js">` を 04 と 05 の間に追加
- `sw.js` — STATIC_ASSETS に 04b 追加 + `CACHE_VERSION = 'v194'`
- `scripts/syntax-check.js` — FILES 配列に '04b-ride-record' 追加 (17 → 18)
- `npm run check` 18/18 OK + 同名関数重複なし

### dead code 除去

`resolveLineId(legacyId)` (旧 04 line 642) は **定義のみで呼び出し 0** だったため切り出し時に削除。grep で全 *.js / *.html を確認済み。

### Phase 3.8 ステータス更新

- ✅ trip 解決 + 乗車状態集計を `04b-ride-record.js` に切り出し、`NORIRECO.rideRecord.{rebuild, normStName}` で公開 (v194)
- ✅ 04-gps-location.js を本来の責務 (現在地・GPS・記録パネル) のみ 430 行に縮小
- ✅ dead code `resolveLineId` 削除
- 🔜 v195+ で ES Modules パイロット (要設計セッション: `let X` を `window.X` / `NORIRECO.store.X` 経由に出すか、全 18 ファイル一気にモジュール化するかの方針議論が必要)

---

## 42. v193 — シンタックスチェック自動化 (`npm run check`) + 同名トップレベル関数の重複検出 (2026-05-19)

### 背景

Notion §2.4 布石② の積み残し消化。v131 以降「`node -e "..."` ワンライナーを手動実行」運用で、忘れたら v127 (`const grid` 二重宣言事故) 型のデプロイ事故が起きる致命工程なのに、人間の記憶だけに依存していた。新規ファイル追加時 (v132/v135/v138/v190/v192) のたびにワンライナーのファイルリスト更新を忘れる落とし穴も同時に解消。

v192 (ES Modules 化の地ならし) → v195+ (本番モジュール化) に向けて、変更の幅が拡大する前にセーフティネットを敷くのが目的。

### 追加

- `package.json` (新規、最小構成) — `"scripts": { "check": "node scripts/syntax-check.js" }` のみ。`"private": true` で誤公開を防止。ランタイムには使われない (PWA は依然クラシック `<script>` 配信)
- `scripts/syntax-check.js` (新規、約 100 行) — `js/01..〜13c` の全 17 ファイルを `new Function(...)` でパース。SyntaxError 0 件を確認 + **同名トップレベル `function NAME(...)` の検出** (v127 / v131 で実際に踏んだ同名関数上書き事故型を警告) を兼ねる
- ファイルリストはスクリプト側にハードコード。新規ファイル追加時の更新先が「HTML / sw.js / scripts/syntax-check.js」の 3 点に整理 (従来の「コメント手書きワンライナー」より明示的)

### 使い方

```bash
npm run check
```

出力例 (clean):

```
OK   01-constants
... (17 行)
---
OK 17 / FAIL 0 (total 17)

✅ All clear.
```

SyntaxError がある場合は exit code 1 で停止し、原因ファイル・行を表示。同名関数があれば警告 (exit 0 のまま、意図的な重複もあるため終了させない)。

### CACHE_VERSION

`v192` → `v193`。ただし `package.json` と `scripts/syntax-check.js` は **`sw.js` の STATIC_ASSETS には含めない** (ランタイムに不要、PWA キャッシュ汚染回避)。CACHE_VERSION は「デプロイ回数 = バージョン番号の不変式」の運用ルールに従ってバンプ。

### 影響範囲

- `package.json` — 新規 (10 行)
- `scripts/syntax-check.js` — 新規 (約 100 行)
- `sw.js` — `CACHE_VERSION` のみ更新 (STATIC_ASSETS は無変更)
- Notion §2.4 布石② を「完了」に更新

### 将来の発展

- pre-commit hook 化は git config を触るので個別判断 (今回は手動 `npm run check` 推奨)
- ESLint / Prettier 導入は依存パッケージが増えるので保留 (現状は依存 0 で完結している軽さが利点)
- CI (GitHub Actions) は GitHub Pages デプロイ前にチェックを走らせる選択肢として残す (現状の「main push 即デプロイ」運用とは別レーン)

### Phase 3.8 ステータス更新

- ✅ Notion §2.4 布石② シンタックスチェック自動化を完了 (v193)
- 🔜 次は v194 で `NORIRECO.rideRecord` ドメイン抽出 (`slRiddenSt` / `slStopType` / `slVisitCount` / `rebuildRiddenStations` の 04 → 04b 切り出し)

---

## 41. v192 — SERVICE_LINES 構築ロジックを `04` → `02b-service-lines-builder.js` に切り出し + `NORIRECO.serviceLines` ドメイン名前空間 (2026-05-19)

### 背景

v190 (13-mypage 分割 + `window.NORIRECO` 導入) / v191 (04 → 02 ローダー移管) の続きとして、**ES Modules 化本番 (次セッション v193 予定) の地ならし**。N=1 (ユーザー自分だけ) のうちが破壊的リファクタの唯一の安全窓なので、シェア機能で新規ユーザーが入る前に進める。

中央ストア方針として 3 案を比較し、議論を経て **案 D「将来そのまま 1 ES Module になる形でドメイン名前空間に切り出す」** を採用:

- 案 A (`SERVICE_LINES` 自体を `NORIRECO.store` に集約) は 8 ファイル 30 箇所超を一度に書き換える単一障害点になりやすい。「巨大グローバルオブジェクト」は ES Modules の最終形ではなく中間形なので二度手間
- 案 B (名前空間の器だけ作る) は中立だが、関数移動だけだと「中央ストアの中身が空」で先送り感が強い
- 案 D = 「02b は IIFE + `NORIRECO.serviceLines = { build, stats, globalStats, detectGroup, regionOf }` でドメイン単位に切り出す」。ES Modules 化のときは IIFE を外して `export { ... }`、call site の `NORIRECO.serviceLines.build()` → `import { build } from './02b-service-lines-builder.js'` に**機械置換だけ**で済む

スケール志向の最終形は「ES Modules + ドメイン分割 export」であり、Redux/Zustand 的な中央ストアではない (`SERVICE_LINES` のようなマスターは domain-owned が自然) — という認識に揃えてから着手。

### 切り出した関数 (04 → 02b)

| 名前 | 公開名 |
|---|---|
| `buildServiceLines()` | `NORIRECO.serviceLines.build()` |
| `slStats(sl)` | `NORIRECO.serviceLines.stats(sl)` |
| `slGlobalStats()` | `NORIRECO.serviceLines.globalStats()` |
| `detectServiceLineGroup()` | `NORIRECO.serviceLines.detectGroup()` |
| `regionOf(lat, lon)` | `NORIRECO.serviceLines.regionOf()` |
| `buildPerLineCoordMap()` | (IIFE 内部、非公開) |
| `deriveN02IdFromAutoId()` | (IIFE 内部、非公開) |
| `_JR_OP_IDS` / `_METRO_TOEI` / `_KANTO_EAST_NORTH` / `_KANTO_SOUTH_WEST` | (IIFE 内部、非公開) |

加えて `deriveN02IdFromAutoId` の **04 内自己重複 (442/448 行で同一本体 2 回宣言)** を切り出し時に統合し、コメントを 1 本に整理 (v191 の宿題消化)。

### call site 書き換え (12 箇所、5 ファイル)

- `js/06-map-leaflet.js:117` `buildServiceLines()` → `NORIRECO.serviceLines.build()`
- `js/09-tabs-stats.js:28,34,37,50,275,279` `buildServiceLines` / `slStats` → `NORIRECO.serviceLines.{build,stats}`
- `js/08-rendering.js:530,1003` `slStats(sl)` → `NORIRECO.serviceLines.stats(sl)`
- `js/05-supabase-data.js:545` `slGlobalStats()` → `NORIRECO.serviceLines.globalStats()`
- `js/13-mypage-common.js:86` `typeof buildServiceLines === 'function'` ガードも `NORIRECO.serviceLines` ガードに置換

### ロード順 (02 → 02b → 03 → 04)

02b は内部で `LINES` / `SERVICE_LINES_MASTER` / `SERVICE_LINES` / `serviceLinesLoaded` / `serviceLinesBuilt` (02 で `let` 宣言) と `loadServiceLinesMaster` / `loadLines` (02 で定義) を参照するため、02 の直後にロード。`stats(sl)` は `slRiddenSt` (04 で `let` 宣言) を runtime に読むが、02b パース時には未宣言でも関数本体は評価されないので問題なし (実際の呼び出しは 04 ロード後のユーザー操作時)。

### 影響範囲

- 新規 `js/02b-service-lines-builder.js` — 166 行 (IIFE 包み + JSDoc コメント含む)
- `js/04-gps-location.js` — 927 → 788 行 (-139)
- `noritetsu-map.html` — `<script src="js/02b-service-lines-builder.js">` を 02 と 03 の間に追加
- `sw.js` — `STATIC_ASSETS` に 02b 追加 + `CACHE_VERSION = 'v192'`
- シンタックスチェックワンライナーのファイルリスト 16 → 17

### つまずきポイント

- IIFE 内で `'use strict';` を入れた上で `SERVICE_LINES = []` のような無修飾代入を行うが、これは 02 の `let SERVICE_LINES` がスクリプト共有レキシカル環境に存在するため strict mode でも合法。クラシック script ロードの「全ファイル同一スクリプト環境」を逆に活用
- 全角カッコ U+FF08/U+FF09 (`首都圏・私鉄（東・北）` 等) は 02b 移管後も保全されているか Python でコードポイント検証 (v190 で半角に誤変換した教訓踏襲)
- 02b は IIFE で内部関数を**スコープ閉じ込め**にしたので、v127 の `const grid` 重複宣言事故型の名前衝突は構造的に発生しない (将来 02c, 02d… を作っても同様)

### Phase 3.8 ステータス更新

- ✅ SERVICE_LINES 構築ロジックを `02b-service-lines-builder.js` に切り出し、`NORIRECO.serviceLines` ドメイン名前空間で公開 (v192)
- ✅ `deriveN02IdFromAutoId` の 04 内自己重複を解消 (v192、v191 の積み残し)
- 🔜 次セッション v193 で `<script type="module">` 化パイロット (02b → 02 → 01 の順に `export`/`import` 化、ロード戦略・SW Network-First 影響を確認)

---

## 40. v191 — `04-gps-location.js` のデータローダーを `02-data-loaders.js` に移管 (2026-05-19)

### 背景

`js/04-gps-location.js` (1037 行、最大ファイル) の中に v131 分割時の経緯で混入していたマスターローダー 3 関数を、本来あるべき `02-data-loaders.js` に移管。「ファイル名 `gps-location` なのに現在地表示と関係ないローダーがいる」という認知負荷を解消。Notion §2.5 落とし穴「04-gps-location.js にデータローダーがいる」を正式に解消した。

### 移管した関数・状態 (04 → 02)

| 種別 | 名前 | 説明 |
|---|---|---|
| ローダー | `loadMergedStations()` | `merged_stations.json` → `MERGED_STATIONS` + `slMergedStationMap` 構築 |
| ローダー | `loadServiceLinesMaster()` | `service_lines_master.json` → `SERVICE_LINES_MASTER` 構築 |
| ローダー | `loadLines(priority)` | `lines-p1〜p4.json` の遅延読込 (LOD) |
| ローダー | `loadLinesForZoom(zoom)` | ズームに応じて必要な priority を loadLines する |
| 定数 | `PRIORITY_FILES` | `{1: 'lines-p1.json', ...}` |
| 関数 | `getPriorityThreshold(zoom)` | ズーム→priority 閾値 |
| 状態 | `SERVICE_LINES_MASTER` / `SERVICE_LINES` | `let` 宣言を 02 へ |
| 状態 | `serviceLinesLoaded` / `serviceLinesBuilt` | `let` 宣言を 02 へ |

### 04 に残したもの

「ローダー」ではなく「構築・分類」ロジックなので 04 に残置:

- `buildServiceLines()` — SERVICE_LINES を構築 (将来は別ファイル候補)
- `buildPerLineCoordMap()` — N02 line ごとの座標索引
- `deriveN02IdFromAutoId()` — sl.id → N02 id (※ 04 内に同名定義が 2 回ある古い自己重複あり、別タスクで整理予定)
- `regionOf()` / `_JR_OP_IDS` / `_METRO_TOEI` / `_KANTO_EAST_NORTH` / `_KANTO_SOUTH_WEST` / `detectServiceLineGroup()` — 地域分類
- `slStats()` / `slGlobalStats()` — 達成率集計

これら「SERVICE_LINES 構築の重み」が大きくなったら、将来 04 から `02b-service-lines-builder.js` 等に切り出す余地あり。

### ロード順は無変更

`02-data-loaders.js` は `01-constants.js` の直後にロードされており、`04-gps-location.js` より先。これは v131 時点から変わっていないので、移管後の依存関係は問題なし (むしろデータローダーが 04 より先にあるべき形になった)。

### 影響範囲

- `js/02-data-loaders.js` — 227 → 346 行 (+119)
- `js/04-gps-location.js` — 1037 → 927 行 (-110)
- `sw.js` — `CACHE_VERSION = 'v191'` (STATIC_ASSETS は無変更、ファイル数も同じ)

### つまずきポイントなし

機能的にはコード移動のみ。グローバル変数 (`MERGED_STATIONS` / `LINES` / `loadedPriorities` / `pendingLoads`) はすでに 02 で `let` / `const` 宣言されていたので、移管した関数からそのまま参照できる。クラシック script ロードのグローバル共有が今回は逆に味方になった (ES Module 化時にはここを明示 `import` する必要が出るが、それは将来セッションへ持ち越し)。

### Phase 3.8 ステータス更新

- ✅ `04-gps-location.js` のデータローダー (`loadServiceLinesMaster` / `loadLines` / `loadMergedStations` 他) を `02-data-loaders.js` に移管、Notion §2.5 落とし穴を解消 (v191)

---

## 39. v190 — `js/13-mypage.js` を 4 ファイル分割 + `window.NORIRECO` 名前空間導入 (2026-05-19)

### 背景

`js/13-mypage.js` が v138 (初版) → v189 で約 **1947 行** に成長。詳細統計 16 種・旅程フィルタ・Trip 編集モーダル・後追い認証・トースト等がすべて 1 ファイルに同居し、これ以上の追加 (stop_type 編集 UI / シェア機能 / キャラ図鑑) を入れると 2500 行を超えて grep も diff も辛くなる。Notion §2.4「次のモジュール化セッションで仕込む布石」の優先度順 ①③④ を実施。

### 布石セクションのうち実施した項目

- ⭐ ① `window.NORIRECO` 名前空間の導入（議論ベース → 採用）
- ⭐ ③ 13-mypage.js から共通部分を `13-mypage-common.js` に抽出
- ④ 13a-stats / 13b-trips / 13c-lines に分割（`NORIRECO.mypage.xxx` に登録）

スコープ外（今回はやらない）:
- ②シンタックスチェック自動化 (package.json scripts)
- ⑤ Supabase 呼び出しを `NORIRECO.api.xxx` ラッパー化
- ES Module 化 / TypeScript 化 / 既存 `slStats` 等の書き換え

### 分割後のファイル構成

| ファイル | 行数 | 担当 |
|---|---|---|
| `js/13-mypage-common.js` | 366 | NORIRECO 名前空間初期化 / 状態 (`_mypageCache`, `mpActiveSection`, `mpTripFilter`) / `renderMypage` / `applyMpSection` / `switchMpSection` / `tripCardHtml` / `_MP_SORT_COMPARATORS` / `showMypageToast` / `isTimeMachineActive` / `formatDelayMin` |
| `js/13a-stats.js` | 1308 | 📊 統計タブ + 詳細統計 16 種 (`buildCompletionCards` / `buildDetailContent` / `buildOperatorYearly` / `buildCarModelStats` / `buildUnexplored` / `buildTimeHeatmap` / `buildStationTimeline` / `buildLineTimeline` / `buildRecentTripCard` / `buildPersonalRecords` / `buildPrefectureChart` 他) + `PREFECTURES` / `MAJOR_TERMINALS` / `prefOfStation` / `detailCard` |
| `js/13b-trips.js` | 354 | 🚃 旅程タブ + フィルタバー (`renderMpTripsSection` / `buildTripFilterBar` / `applyTripFilters`) + Trip 編集モーダル (v184/v185 メモ・遅延後追い編集) + `retroactivelyVerifyTrip` (GPS 後追い認証 v138) + `deleteTripFromMypage` |
| `js/13c-lines.js` | 21 | 📋 路線タブ (renderList ラッパー + 将来拡張ポイント) |

合計 2049 行 (旧 1947 行 + 102 行は `NORIRECO.mypage.xxx = ...` 登録行とヘッダコメント)。

### 名前空間の入れ方 (両建て方式)

- 関数定義は `function xxx() {}` のまま保持
- 末尾に `NORIRECO.mypage.xxx = xxx;` を追加して名前空間にも登録
- HTML onclick から呼ばれる関数 (`renderMypage` / `switchMpSection` / `toggleDetailPane` / `toggleInfo` / `openTripEditModal` / `closeTripEditModal` / `saveTripEdit` / `retroactivelyVerifyTrip` / `deleteTripFromMypage` / `updateMpFilter` / `resetMpFilter`) は従来通り `window.xxx = xxx` も維持
- 既存の `slStats` 等は書き換えしない（布石の精神どおり、新規・移動分のみルール導入）

### 状態変数の扱い

クラシック script ロードゆえに変数は同じグローバル Script 環境を共有するため、`_mypageCache` / `mpActiveSection` / `mpTripFilter` は 13-mypage-common.js のトップレベル `let` のまま据え置き。13a/13b から直接参照する（v189 までと挙動同一）。状態の名前空間化は ES Module 化セッションで一括検討。

### 13c-lines.js を薄く切った理由

路線一覧は `09-tabs-stats.js` の `renderList()` を再利用しているため、現状ロジックは実質ゼロ。それでも 13a/13b と並ぶ「3 タブ 3 ファイル」構成を維持するために `renderMpLinesSection` だけのプレースホルダを置いた。将来「路線色のユーザーカスタマイズ」「路線別バッジ表示」等が来る器。

### ロード順 (noritetsu-map.html)

```
01-constants → 02-data-loaders → 03-characters → 04-gps-location
→ 05-supabase-data → 06-map-leaflet → 07-record-mode → 08-rendering
→ 11-fraud-detection → 12-auth
→ 13-mypage-common → 13a-stats → 13b-trips → 13c-lines  ← v190 新規
→ 09-tabs-stats → 10-init
```

13系の中の依存: common → a/b/c。13a/13b は `_mypageCache` / `mpTripFilter` / `tripCardHtml` / `_MP_SORT_COMPARATORS` / `showMypageToast` を 13-common から参照。

### つまずきポイント

**全角カッコの混入**: `buildByGroup` の `order` 配列で「首都圏・私鉄（東・北）」「首都圏・私鉄（南・西）」が全角カッコ `（）` (U+FF08/U+FF09) なのを、初版で半角 `()` に取り違えた。SERVICE_LINES の group 名と文字列一致しなくなると、これらの路線がソート位置の末尾 (999) に追いやられて見た目が崩れる。CLAUDE.md にもある「漢字を扱うときは見た目の似た文字に注意」が刺さる事例。`python -c` でコードポイント直接確認 (0xff08/0xff09) して修正。

**`function buildTimeHeatmap` の `const grid` ローカル変数**: v127 の二重宣言事故と同名だが、これは関数スコープ内なのでグローバル衝突しない。ただし将来 13a-stats.js を更に分割するときに偶然トップレベル `const grid` を作ると v127 が再発する。今回は `heatGrid` にリネームして将来の事故予防もしておいた。

### 影響範囲

- `js/13-mypage.js` — **削除** (1947 行)
- `js/13-mypage-common.js` — 新規 (366 行)
- `js/13a-stats.js` — 新規 (1308 行)
- `js/13b-trips.js` — 新規 (354 行)
- `js/13c-lines.js` — 新規 (21 行)
- `noritetsu-map.html` — 1395-1398 の `<script src>` を 4 行に置換
- `sw.js` — `STATIC_ASSETS` に 4 ファイル追加 + `CACHE_VERSION = 'v190'`

### 動作確認チェック (デプロイ後にやる)

- マイページの 📊 統計 / 🚃 旅程 / 📋 路線 サブタブ切替
- 完乗率カード (公式 / 全記録) の表示
- 詳細統計 16 種すべての展開
- 旅程フィルタ (期間 / 認証 / 種別 / 並び替え)
- Trip 編集モーダル (✏️ メモ編集 → 保存)
- GPS 後追い認証 (📍 GPSで認証 ボタン)
- 旅程削除
- 統計タブ「📌 直近の旅程」カード表示
- 「〜月指定」バナー表示

### Phase 3.8 ステータス更新

- ✅ `13-mypage.js` 1947 行を 4 ファイル (common / 13a-stats / 13b-trips / 13c-lines) に分割、`window.NORIRECO` 名前空間を導入 (v190)

### 次への布石

- ES Module 化セッション本番は別途。これは「ES Module 化に向けた構造的予防」第一弾
- 04-gps-location.js からデータローダー (`loadServiceLinesMaster` 他) を 02-data-loaders.js に移管する作業はまだ残っている
- `NORIRECO.api.xxx` ラッパー (布石⑤) は次に 13系を触るときに `supabase.from('norireco_trips')` 直接呼び出しを置換していく

---

## 38. v189 — 駅フィルタアイコンを 📍 → 🚉 (location-fab との重複解消) (2026-05-18)

地図 FAB の現在地ボタン (`location-fab` = 📍) と地図上部の駅フィルタアイコン (`ctrl-icon-station` = 📍) が同じ絵文字でかぶっていた。
駅フィルタ側を **🚉** に変更し、視覚的な役割分担を明確化：
- 📍 = 現在地 / GPS 関連 (右下 FAB、GPS 記録開始モーダル等)
- 🚉 = 駅フィルタ (上部、●降車/◎乗車/○通過/□未訪問)

### 影響範囲

- `noritetsu-map.html` — `#ctrl-icon-station` のテキストを 📍 → 🚉
- `sw.js` — `CACHE_VERSION = 'v189'`

### Phase 3.8 ステータス更新

- ✅ 駅フィルタアイコンを 🚉 に変更（現在地アイコンとの重複解消）(v189)
