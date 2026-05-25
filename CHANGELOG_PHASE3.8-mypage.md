# 乗レコ - 電車旅 更新履歴 (Phase 3.8 マイページ強化期 — v279〜v289 アーカイブ)

`CHANGELOG.md` から退避した Phase 3.8 マイページ強化期 (v279〜v289 相当, §127〜§137) のセッションログ。
他フェーズは:
- [CHANGELOG.md](CHANGELOG.md) — 現行 Phase 3.8 後半 (v334〜)
- [CHANGELOG_PHASE3.8-station-id.md](CHANGELOG_PHASE3.8-station-id.md) — Phase 3.8 駅 ID 体系期 (v290〜v333)
- [CHANGELOG_PHASE3.8-photo.md](CHANGELOG_PHASE3.8-photo.md) — Phase 3.8 駅メモ + R2/写真期 (v250〜v278)
- [CHANGELOG_PHASE3.8-share.md](CHANGELOG_PHASE3.8-share.md) — Phase 3.8 シェア + Cloudflare 移行期 (v226〜v249)
- [CHANGELOG_PHASE3.8-modules.md](CHANGELOG_PHASE3.8-modules.md) — Phase 3.8 中盤 (v189〜v225)
- [CHANGELOG_PHASE3.8-early.md](CHANGELOG_PHASE3.8-early.md) — Phase 3.8 前半 (v173〜v188)
- [CHANGELOG_PHASE1-3.7.md](CHANGELOG_PHASE1-3.7.md) — Phase 1〜3.7 (v60〜v157)

カバー範囲 (ファイル内は DESC 配置・新しい順):
- §137 v289: 駅名検索のマッチ範囲を 4 チップ (始点/終点/乗換/通過) で個別 ON/OFF
- §136 v288: マイページ駅名検索を通過駅まで含めて判定 (v282 と共通化)
- §135 v287: v286 で直りきらなかった IME 問題を構造的に解決 (フィルタバー固定化)
- §134 v286: v285 駅名検索の IME 変換中フォーカス飛び問題を修正
- §133 v285: マイページの旅程・メモに駅名検索を追加
- §132 v284: 旧 📸 memoMode を完全撤去 (駅・路線シートで代替済)
- §131 v283: 路線クリックでメモ/写真を残せるように「路線アクションシート」追加
- §130 v282: 地図駅クリックで「この駅を含む旅程」一覧を表示
- §129 v281: GPS 後追い認証も即時反映に修正
- §128 v280: v279 の追加修正 (renderMypage 未 import で削除即時反映が効いていなかった)
- §127 v279: 旅程削除が即時 UI 反映されないバグを修正

---

## 137. v289 — 駅名検索のマッチ範囲を 4 チップ (始点/終点/乗換/通過) で個別 ON/OFF (2026-05-24)

### 背景

v288 で通過駅まで拾うようにしたら、ユスケから「始点/終点/乗換/通過 をそれぞれ ON/OFF できるともっと便利」との追加要望。

例:
- 「終点だけ」→ 「目的地が八王子だった旅程」を探す
- 「通過だけ」→ 「単に通り抜けただけの旅程」を探す
- 「乗換のみ OFF」→ 「乗換で経由しただけの駅は除外」(やや特殊用途)

### 設計

`tripMatchesAnyStation` に scope 引数を追加:

```js
tripMatchesAnyStation(trip, predicate, scope)
// scope = { from, end, transfer, pass } の object、未指定 (undefined) なら全 ON
```

scope 未指定の呼出 (v282 駅クリック側) は全 ON 互換動作。マイページ側のみ UI 連動。

state は `mpTripFilter.stationScope = { from, end, transfer, pass }` (default 全 true) を追加。

### UI

駅名 input の下に「🎯 範囲」ラベル + 4 チップ。チップは ON で金色 (`var(--gold)`)、OFF で灰色。タップで個別トグル。

トグル時は chip 単体の `.on` クラスだけ即時更新 + 結果領域だけ再描画 — 全フィルタバー再構築はしない (input の IME 安全性 v287 と同じ理由)。

### 主な変更

- [js/13-mypage-common.js](js/13-mypage-common.js): `tripMatchesAnyStation` に scope 引数追加、`mpTripFilter.stationScope` デフォルト追加。
- [js/13b-trips.js](js/13b-trips.js): フィルタバーに `.mp-scope-chips` 行追加、`toggleMpStationScope(key)` handler 追加、`applyTripFilters` で scope を渡す、`resetMpFilter` で stationScope も全 ON にリセット。
- [noritetsu-map.html](noritetsu-map.html): `.mp-scope-chip` CSS 追加 (ON で金色、OFF で灰色)。

### 残課題

- 全 OFF にすると駅名検索結果が空になる (当然)。エラーは出ないが「全部 OFF だと何も出ません」の案内は出していない。
- メモタブには適用しない (memo は `m.station` 単体しかフィールドが無く scope 概念がそもそも不要)。

---

## 136. v288 — マイページ駅名検索を通過駅まで含めて判定 (v282 と共通化) (2026-05-24)

### 背景

ユスケから「通過の場合は拾ってこない？」と指摘。v285 で実装したマイページの駅名検索は実装複雑性を避けて「始点・終点・乗換駅」だけの判定にしていたが、v282 の地図駅クリック側「この駅を含む旅程」は通過駅まで拾うようになっており、挙動が一貫していなかった。

### 修正

判定ロジックを `13-mypage-common.js` に共通化し、両者を統一:

- `tripMatchesAnyStation(trip, predicate)` — 高階関数。trip の関連駅すべて (始点/終点 + segments[].from/to + `seg.lineId` → `SERVICE_LINES` の駅順を辿った通過駅) を順に predicate で判定。
- `tripVisitsStation(trip, stationName)` — `tripMatchesAnyStation` の完全一致 wrapper (v282 互換)。

使い分け:

- **地図駅クリック (v282)**: 完全一致 — 駅「八王子」だけマッチ
- **マイページ検索 (v288)**: substring — 「八王子」入力で「八王子」「八王子みなみ野」両方マッチ

両者とも通過駅まで判定対象なので、ユスケの「東京駅で検索すれば東京駅を通過した新幹線旅程も出る」期待にマッチ。

### 主な変更

- [js/13-mypage-common.js](js/13-mypage-common.js): `tripMatchesAnyStation` / `tripVisitsStation` を新規 export + `NORIRECO.mypage` 名前空間にも登録。
- [js/17-station-actions.js](js/17-station-actions.js): local `tripVisitsStation` を削除し共通版を import。
- [js/13b-trips.js](js/13b-trips.js): `applyTripFilters` の駅名フィルタを `tripMatchesAnyStation(t, n => n && n.includes(q))` に置換。

メモタブの駅名検索は `m.station` 単体しかフィールドが無いので変更なし (substring 直接マッチのまま)。

---

## 135. v287 — v286 で直りきらなかった IME 問題を構造的に解決 (フィルタバー固定化) (2026-05-24)

### 背景

v286 で `compositionstart` / `compositionend` ガードを入れたが、ユスケから「改善しないね」のスクショ。フィルタ input に `hあ` のような合成途中文字列が残ったまま、結果は「合致するメモがありません」と表示されていた。

### 真の原因

ガード方式は本質的に脆い:

- `oninput` は composition 中も発火 → `M.filter[key] = value` が合成途中の文字列で更新される
- ブラウザ間で composition イベントの発火順序が微妙に違う (Firefox は `input → compositionend`、Chrome は `compositionstart → input`) — どこかでガードのタイミングがずれ得る
- たとえ render を skip できても、別の経路 (タブ切替・他フィルタ操作) で `renderMpMemosSection` が走った瞬間に input 要素ごと差し替わって IME 破壊

つまり「input 要素が DOM から消えない」ことが構造的に保証されない限り、IME と oninput の組合せは安全にならない。

### 修正

フィルタバー (input を含む) と結果領域を分離し、フィルタ変更時は結果領域だけを再描画する形に変更:

```
mp-trip-section
├─ .mp-filter-bar     ← 1 回だけ生成、以降触らない
└─ #mp-trip-result    ← フィルタ変更で毎回書き換え
```

- [js/13b-trips.js](js/13b-trips.js): `renderMpTripsSection` から結果生成部分を `renderMpTripsResultOnly` に切り出し。`updateMpFilter` は `renderMpTripsResultOnly` だけ呼ぶ。`resetMpFilter` のみ select の選択状態と input 値を初期化するため全体再描画 (`renderMpTripsSection`)。
- [js/16-memos.js](js/16-memos.js): 同様に `renderMpMemosResultOnly` を切り出し。
- 駅名 input から `oncompositionstart` / `oncompositionend` 属性を撤去 (もう不要)。v286 で入れた caret 保持 helper (`_rememberCaret` / `_restoreCaret`) も使わなくなったので削除。

### 学び

- 「全体を innerHTML で書き換える」UI は確かに簡単だが、テキスト入力との相性が悪い。最初から「ヘッダ・フィルタ・結果」を別 div に分離するのが王道。
- IME 周りはガード方式 (composition 検知 + skip) より「要素を消さない」構造の方が確実。

---

## 134. v286 — v285 駅名検索の IME 変換中フォーカス飛び問題を修正 (2026-05-24)

### 背景

ユスケから「駅名が打ち込めない」とのスクショ報告 (「hあいおうｊい」のような IME 合成途中の文字列のまま固まる)。

### 原因

`<input oninput="updateMpFilter('station', this.value)">` は **IME 変換中も発火する**。
日本語入力で「は」を入力 → composition 中の合成文字列で oninput が走る →
`renderMpTripsSection` で `sec.innerHTML = ''` → input 要素が DOM から消える →
IME セッションが破壊され、以降の変換が成立しない。

v285 で caret 復元は入れたが、IME 合成中の input は composition イベントの中で
特別扱いされていて、要素ごと差し替わると Chrome / Edge 等の IME がフリーズする。

### 修正

`compositionstart` / `compositionend` で flag を立て、`updateMpFilter` /
`updateMemoFilter` 内で「station キーかつ合成中」なら再描画を skip:

```html
<input ...
  oninput="updateMpFilter('station',this.value)"
  oncompositionstart="window._mpStationComposing=true"
  oncompositionend="window._mpStationComposing=false;updateMpFilter('station',this.value)">
```

```js
if (key === 'station' && window._mpStationComposing) return;
```

これで:
- 合成中: input.value は IME の合成文字列で更新されるが、render は走らない → input が消えない → IME が生きる
- 確定時: compositionend が flag を降ろし、確定後の値で render が走る → フィルタ反映

メモタブも同じパターンで対応 (`_mpMemoStationComposing`)。

### 学び

`oninput` + 全 sec 再描画は IME と相性が悪い。次にテキスト入力でリアルタイム
フィルタを書くときは最初から composition ガードを入れる。

---

## 133. v285 — マイページの旅程・メモに駅名検索を追加 (2026-05-24)

### 背景

ユスケから「マイページの旅程、メモ — 駅名で検索できるといいね」との要望。既存フィルタ (期間・認証・種別・並び替え / 路線・種別・気分) は dropdown のみで、駅名による絞り込み手段がなかった。

### 設計

両タブに「🚉 駅名」テキスト入力 (`<input type="search">`) を追加し substring 一致で絞り込み。

- **旅程**: `t.from_station` / `t.to_station` / `t.segments[].from` / `to` のいずれかに入力文字列が含まれれば一致。通過駅判定 (SERVICE_LINES 駅順展開) は今回は入れない — 駅画面の v282 「この駅を含む旅程」一覧で補完できるため。
- **メモ**: `m.station` のみ。memo は trip と違って segments を持たないので素直に substring 一致。

部分一致 (substring) にしたのは入力ミスへの寛容性 + 「八王子」「八王子みなみ野」を 1 度に拾えるため。

### フォーカス維持

`renderMpTripsSection` / `renderMpMemosSection` は `sec.innerHTML = ''` で全描画し直すため、`oninput` のたびに input 要素が消えてフォーカスが外れる問題がある。`update*Filter` 内で active element と caret 位置 (`selectionStart` / `End`) を覚えておき、再描画後に新しい input へ復元する。

### 主な変更

- [js/13-mypage-common.js](js/13-mypage-common.js): `mpTripFilter` に `station: ''` 追加。
- [js/13b-trips.js](js/13b-trips.js): フィルタバーに `<input>` 追加、`applyTripFilters` に駅名 substring チェック、`updateMpFilter` に caret 復元、`resetMpFilter` に station リセット。`escapeAttr` ヘルパ追加。
- [js/16-memos.js](js/16-memos.js): `M.filter` に `station: ''` 追加、フィルタバーに `<input>` 追加、`applyMemoFilters` に駅名 substring チェック、`updateMemoFilter` に caret 復元。
- [noritetsu-map.html](noritetsu-map.html): `.mp-filter-input` CSS 追加 (mp-filter-sel と同じ寸法、placeholder スタイル含む)。

### 残課題

- メモタブには「リセット」ボタンが無いので、station 入力消したいときは手で消すしかない (今回は範囲外)。
- 旅程の通過駅まで含めた検索が欲しくなったら `tripVisitsStation` (17-station-actions.js) を export 化して 13b で再利用する形に拡張可能。

---

## 132. v284 — 旧 📸 memoMode を完全撤去 (駅・路線シートで代替済) (2026-05-24)

### 背景

v282 (駅クリックで旅程一覧) + v283 (路線クリックで路線メモ) でメモ作成の動線が「対象をタップ → アクションシート → 📸 メモ」に統一されたため、地図右下の `📸` FAB から入る旧 memoMode は不要になった。

旧 memoMode は「📸 FAB ON → 地図上をタップ → 最寄駅 (2km 以内) で memo-modal を開く」もので、駅マーカークリックの 📸 メモとほぼ同等の機能だった。ユスケから「もう路線や駅をクリックするとメモできるから、写真のマークのメモモードは不要かな？」との指摘。

### 撤去範囲 (ユスケ判断: コードごと完全撤去 + 他 FAB を上に詰める)

- [noritetsu-map.html](noritetsu-map.html): `<button id="memo-btn">` と `.memo-fab` CSS を削除。`map-mode-fab` / `record-fab` / `char-fab` / `location-fab` の `bottom` を -55px ずつ (= 1 ボタン分) 詰める。
- [js/06-map-leaflet.js](js/06-map-leaflet.js): `NORIRECO.map.memoMode` フィールド削除、`map.click` ハンドラから memoMode 分岐削除 (記録モード単独に簡素化)。`openMemo` の import も不要に。
- [js/07-record-mode.js](js/07-record-mode.js): 記録モード開始時の `if (NORIRECO.map.memoMode) toggleMemoMode();` 排他処理を削除、`toggleMemoMode` の import も削除。
- [js/16-memos.js](js/16-memos.js): `toggleMemoMode` 関数本体と `window.toggleMemoMode` bridge、`NORIRECO.map.memoMode` 初期化を削除。
- [js/08-rendering.js](js/08-rendering.js): `attachStationDotClickV2` から `else if (NORIRECO.map.memoMode) { ... }` 分岐を削除。`attachLineClick` から memoMode ガードを削除 (記録モードガードは残置)。`openMemo` の import も削除。

### 学び

- 「機能を 1 つ追加した」より「重複した動線を撤去した」のほうが UX 改善幅が大きい。FAB の数が 5 → 4 になり右下が空く。
- CLAUDE.md「未使用物は削除」「コードベースの健康度を守る」原則どおり、UI 非表示だけで残すのではなく実コードまで撤去 (ユスケ判断)。

---

## 131. v283 — 路線クリックでメモ/写真を残せるように「路線アクションシート」追加 (2026-05-24)

### 背景

ユスケから「路線をクリックしても、路線に対してメモや写真を記録できるようにしたい」との要望。v245 以降、路線クリックは「🎨 系統色変更モーダル」直呼びのままだった。

メモのデータモデルは既に `memo_type='路線'` + `line_id` + `station=null` を想定済み (16-memos.js の TYPE_EMOJI に「🚃 路線」あり) だったので、UI 側だけ追加。

### 設計

駅アクションシートと同じ枠 (`station-action-modal`) を共用して「路線アクションシート」を提供:

- 📸 路線メモ (N件) — シート内一覧 + 「+ 新しい路線メモを残す」
- 🎨 系統色を変更 — 既存 colorOverrides editor を呼ぶ (旧挙動)

判定モードは `S.kind = 'station' | 'line'` で分岐。`S.currentSl` を路線時にセット。

### 主な変更

- [js/17-station-actions.js](js/17-station-actions.js): `openLineActionSheet(sl)` + 関連ハンドラ (`onSlOpenMemos` / `onSlChangeColor` / `onSlAddMemo` / `onSlBackToMain`) を追加。`memoCardHtmlMini` でシート内に詰めるコンパクトカードを自前で組み立て (マイページの `memoCardHtml` は D&D 写真付きで重いため流用せず)。
- [js/16-memos.js](js/16-memos.js): `openMemo(opts)` を拡張、`{ defaultMemoType, title, sub }` を渡せるように。後方互換 (既存呼出は全部引数なし)。
- [js/08-rendering.js](js/08-rendering.js): `attachLineClick` の色エディタ直呼びを `NORIRECO.stationActions.openLine(sl)` に切替。フォールバックで旧挙動も残置。
- [noritetsu-map.html](noritetsu-map.html): `.sa-memo-*` 系 CSS 追加 (60vh スクロール、サムネ 60px)。

### 残課題

- v282 と同じく、シート内でメモを保存/削除した直後はシート内表示が再描画されない (`rerenderMemosIfVisible` は `mp-sub-memos` か `station-memo-modal` しか見ない)。シートを閉じて再度開けば反映。
- 系統色エディタを開くために一旦シートを閉じる動線になっており、駅シートの「🎨 色変更」と挙動が揃っている分かりやすい一方、ワンタップ多い。将来 inline 化検討。

---

## 130. v282 — 地図駅クリックで「この駅を含む旅程」一覧を表示 (2026-05-24)

### 背景

ユスケから「地図で駅をクリックしたら関連するトリップデータを確認したい」との要望。TODO の「🟡 駅 UI の情報ハブ化（4 領域パネル）」の自分の記録領域に該当する機能。

### 設計

駅アクションシート ([js/17-station-actions.js](js/17-station-actions.js)) に「🚃 この駅を含む旅程 (N件)」ボタンを追加。押すと既存の「🎨 色変更」と同じパターンでシート内が一覧表示に差し替わり、「← 戻る」でメインアクションに戻る。

「関連する」の判定基準 (ユスケ確認):

1. `trip.from_station` または `trip.to_station` 直接一致
2. `trip.segments[].from` または `to` 直接一致 (乗換駅)
3. `seg.lineId` を `NORIRECO.data.SERVICE_LINES` から引いて駅順を辿り、`seg.from` 〜 `seg.to` の間にあれば一致 (通過駅)

3 の通過駅判定は `02b-service-lines-builder.js:191` の `seg.lineId → SERVICE_LINES.id` マッチと同じパターンを採用。`candidateN02Ids` フォールバックも追加して旧 ID 形式に対応。

### 表示

`NORIRECO.mypage.tripCardHtml` (bridge 経由) を再利用してフルカード表示。`max-height: 60vh; overflow-y: auto` でシート内スクロール。新しい順 (recorded_at desc) に並べる。

`_mypageCache` が null (マイページ未開封) の場合は「マイページを一度開くと旅程が読み込まれます」と案内するだけで、勝手に Supabase fetch はしない (体感優先 + 起動直後の地図表示を重くしない)。

### 残課題

- 一覧内で「🗑 削除」「📍 GPS で認証」「✏️ 編集」を押した時、`_mypageCache` は更新されるが**シート内の表示は再描画されない** (`applyMpSection` は mp-trip-section を対象にしているため)。シートを閉じて再度開けば反映される。深刻ではないが要改善。
- `_mypageCache` 未初期化のときに自動 fetch する設計は将来検討。

---

## 129. v281 — GPS 後追い認証も即時反映に修正 (renderMypage 未 import の同じ罠) (2026-05-24)

### 背景

v280 で `deleteTripFromMypage` の `renderMypage()` 未 import を修正した際、`retroactivelyVerifyTrip` ([js/13b-trips.js:560](js/13b-trips.js)) も同じパターン (`setTimeout(() => renderMypage(), 800)`) を踏んでいることに気付いた。ユスケに確認したら「やったことない」とのことだったので、症状報告なしのまま予防的に修正。

### 修正

`deleteTripFromMypage` と同じ形に統一:

- `_mypageCache` 内の該当 trip を PATCH と同じ値 (`verified: true`, `gps_lat/lon/accuracy`) で楽観更新
- `applyMpSection()` + `NORIRECO.mypage.buildCompletionCards()` で client 側のみで即時再描画
- `runCharacterGrantCheck()` の `setTimeout(600)` はそのまま残置 (キャラ獲得判定は GPS 認証の完了演出と並走させる意図)

`tripCardHtml` ([js/13-mypage-common.js:251](js/13-mypage-common.js)) は `trip.verified` フラグだけで「⚪ 手動記録」/「🟢 GPS 記録」を切り替えるので、楽観更新だけで表示も切り替わる。

### 学び

- `renderMypage` の bare 参照は 13b-trips.js 内で 2 箇所あり、v275 以前から両方とも ReferenceError で動いていなかった。`setTimeout` 内の async 失敗はコンソールに警告も出ずに静かに死ぬので、見つけるには「呼んでるのに反応がない」症状を踏むしかない。
- 今後 13b-trips.js から `renderMypage` を呼ぶことがあれば import (or `NORIRECO.mypage.renderMypage`) を必ず通す。ただし大抵のケースは Supabase 再 fetch 不要で client 側再計算で済むので、`applyMpSection` + `buildCompletionCards` の組み合わせをデフォルトに。

---

## 128. v280 — v279 の追加修正: renderMypage 未 import で削除即時反映が効いていなかった (2026-05-24)

### 背景

v279 push 後にユスケが動作確認したところ「削除しました」トーストは出るものの旅程一覧は古いまま、タブ切替で初めて消える挙動が残っていた。

### 原因

`js/13b-trips.js` が `renderMypage` を import していないため、v279 で書いた `renderMypage()` 呼び出し（および v275 以前から存在した `setTimeout(() => renderMypage(), 500)`）は ReferenceError で静かに失敗していた。`renderMypage` は `13-mypage-common.js` から `export` されているが、`window.renderMypage` としては登録されておらず `NORIRECO.mypage.renderMypage` のみ。

v279 で入れた `_mypageCache` の楽観的更新は効いていたので、`switchMpSection` → `applyMpSection` 経路で再描画されたタブ切替時には正しく消えていた。

### 修正

そもそも Supabase 再 fetch は不要なので `renderMypage()` 呼び出しをやめ、import 済みの `applyMpSection()` + `NORIRECO.mypage.buildCompletionCards()` で client 側のみで即時再描画する形に変更:

- 旅程セクション: `applyMpSection()` で件数 + 一覧を再描画
- 完乗率カード: `mp-completion-pinned` を `buildCompletionCards(filterTripsByDate(_mypageCache))` で差し替え

### 残課題

- `retroactivelyVerifyTrip` ([js/13b-trips.js:560](js/13b-trips.js)) も `setTimeout(() => renderMypage(), 800)` を使っていて同じく ReferenceError で動いてないはず。GPS 認証後の UI 反映も「タブ切替まで遅延」している可能性があるので別途確認。

---

## 127. v279 — 旅程削除が即時 UI 反映されないバグを修正 (2026-05-24)

### 背景

ユスケから「旅程データを削除後、すぐに反映されない。ホームページを更新する必要がある」との報告。

### 原因

`deleteTripFromMypage()` ([js/13b-trips.js:566](js/13b-trips.js)) で:

1. Supabase DELETE 成功 → `setTimeout(() => renderMypage(), 500)` で再描画
2. `_mypageCache` を即時更新していない（楽観的更新なし）
3. `renderMypage()` は async で Supabase から再 fetch するが、その完了まで完乗率カードは「📊 完乗率を計算中…」スピナーのまま
4. 500ms の遅延が「反映されない」感を増幅

### 修正

- 削除成功直後に `NORIRECO.mypage.state._mypageCache` から該当 trip を即座に除去（楽観的更新）
- `setTimeout(500)` 撤去し、即座に `renderMypage()` を呼び出し

これにより Supabase の再 fetch を待たずに UI 側のカウントや一覧が即座に反映される。

### 残課題

- 完乗率カードの再計算スピナー（数百 ms）は残る。気になるなら完乗率カードも楽観更新する余地あり（今回はスコープ外）。

---
