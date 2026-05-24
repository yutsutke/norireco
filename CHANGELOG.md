# 乗レコ - 電車旅 更新履歴詳細

各セッションごとの実装ログ・経緯・失敗教訓を時系列で残す詳細メモ。

> ドキュメント役割分担は Notion §0「ドキュメント役割分担」が真実の源（v276 で Notion に集約）。本ファイルは変更履歴詳細を扱う。
> 過去フェーズは [`CHANGELOG_PHASE1-3.7.md`](CHANGELOG_PHASE1-3.7.md) / [`CHANGELOG_PHASE3.8-early.md`](CHANGELOG_PHASE3.8-early.md) / [`CHANGELOG_PHASE3.8-modules.md`](CHANGELOG_PHASE3.8-modules.md) にアーカイブ。

## 分割ポリシー

ファイルが長くなり扱いづらくなったら（目安: **1500 行超**、または Phase が一区切りついたタイミング）、過去フェーズを別ファイルに切り出す。

分割履歴:
- 2026-05-20 分割 (1回目): §1〜§21 (Phase 1〜3.7, v60〜v157) を [`CHANGELOG_PHASE1-3.7.md`](CHANGELOG_PHASE1-3.7.md) に退避
- 2026-05-20 分割 (2回目): 残った 3252 行をさらに 3 分割
  - §22〜§37 (v173〜v188) → [`CHANGELOG_PHASE3.8-early.md`](CHANGELOG_PHASE3.8-early.md)
  - §38〜§74 (v189〜v225, ES Modules 化) → [`CHANGELOG_PHASE3.8-modules.md`](CHANGELOG_PHASE3.8-modules.md)
  - 本ファイルは §75 (v226, Phase 3.8 後半) から開始

次回分割の目安: 本ファイルが 1500 行超になったら、その時点で完成しているサブフェーズを `CHANGELOG_PHASE3.8-late.md` (仮) などに退避。

切り出し時は本ファイル冒頭の役割表・分割ポリシー、`TODO.md`・Notion §0 の参照リンクも合わせて更新する。

過去ログの参照早見表:
- 認証グラデーション・GPS 記録フロー初期実装・列車種別・コードベース 13 ファイル分割・Supabase 認証/マイページ初期版 → [`CHANGELOG_PHASE1-3.7.md`](CHANGELOG_PHASE1-3.7.md)
- データ補修・期間フィルタ「〜月指定」・記録モード用語統一・後追い記録・stop_type 駅 UI 個人化・地図フィルタ統合 → [`CHANGELOG_PHASE3.8-early.md`](CHANGELOG_PHASE3.8-early.md)
- 13-mypage 4 分割・SERVICE_LINES builder 分離・ride-record 分離・ES Modules stage 1〜3 (`<script type="module">` + `import`/`export` 化) → [`CHANGELOG_PHASE3.8-modules.md`](CHANGELOG_PHASE3.8-modules.md)

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

## 126. v278 — SessionStart hook の手順 2 を v276 移行後の文面に追従 (2026-05-23)

### 背景

v276 でドキュメント役割分担を Notion §0 に集約したのに、SessionStart hook が出す「手順 2」と Notion §9 子ページ §2.3 の対応記述が古いままだった:

```
2. 構造把握  CLAUDE.md のドキュメント地図（STATUS / CHANGELOG / TODO / Notion の役割分担）を踏まえ、
            仕様詳細は Notion §1 画面 / §2 裏側 / §3 将来 の該当子ページを必要時 fetch
```

CLAUDE.md「ドキュメント地図」は v276 で Notion §0 へのリンク 1 行に簡略化されていて、表は無い。

### 修正

両方同じ文言に書き換え:

```
2. 構造把握  仕様詳細は Notion §1 画面 / §2 裏側 / §3 将来 の該当子ページを必要時 fetch。
            ドキュメント役割分担に迷ったら Notion §0「ドキュメント役割分担」を fetch（v276〜真実の源）
```

- `.claude/hooks/session-start.js` 手順 2
- Notion §9「⚙️ セッション運用 三層設計」§2.3 SessionStart の中身（最終更新を v272 → v278 に）

### 学び

判断軸を明文化（v277）した直後の振り返りで、ユスケが「hook 出力と Notion §9 が古い」と即気付いてくれた。明文化の効果が早速出た。

---

## 125. v277 — Notion §0 役割分担表に「判断軸」セクションを追記 (2026-05-23)

### 背景

v270〜v276 の整理シリーズで「どこに置くか」を毎回個別に判断していたが、ユスケさんが綺麗な 4 ルールに整理してくれた:

| 場所 | 何を置く |
|---|---|
| `.claude/hooks/*.js` | 強制したいこと + 自動補助 |
| git（STATUS / CHANGELOG / TODO） | 更新が頻繁 |
| CLAUDE.md | 毎回読み込んでコストに見合う = 指針・規約 |
| Notion | 上記以外（静的・更新少ない・必要時のみ参照） |

### 実装

Notion §0 役割分担表の直下に「### 判断軸（どこに置くか — v277 追記）」セクションを 4 行で追加。

### 効果

「これどこに書く？」と迷ったとき、判断軸を見れば 4 択で即決できる。v270〜v276 のような迷走を再発させない。

---

## 124. v276 — ドキュメント役割分担表を Notion §0 に再集約（v275 の方針転換） (2026-05-23)

### 背景

v275 で CLAUDE.md「ドキュメント地図」に集約したばかりだが、ユスケさんの指摘で再考:

- 役割分担表は **更新頻度が低い**（一度確定すれば数ヶ月変わらない）
- **毎回見るものでもない**（Claude も覚えている）
- CLAUDE.md は Claude Code が毎回自動ロード → **context cost が毎回かかる**

→ Notion に置いて必要なときだけ fetch する方が合理的。

### 実装

- **Notion §0「ドキュメント役割分担」** に表 7 行（STATUS / CHANGELOG / TODO / CLAUDE.md / hooks / Notion / アーカイブ）を再配置 → **真実の源**
- **CLAUDE.md「ドキュメント地図」**: 表を撤去し Notion §0 へのリンク 1 行のみに
- **CHANGELOG.md 冒頭**: 「CLAUDE.md 参照」を「Notion §0 参照」に変更

### v270〜v276 の整理シリーズ振り返り

7 連続のドキュメント運用整理:

| v   | 整理内容 |
|---|---|
| v270 | CHANGELOG/TODO ルール簡略化 + CLAUDE.md git 追跡開始 |
| v271 | §0.1 → STATUS.md 分離（Stop hook で機械検知可に） |
| v272 | .claude/ git 追跡 + STATUS.md を SessionStart hook に inline |
| v273 | permission allowlist 整理（user global ↔ project shared） |
| v274 | Notion §0 を現状整合化 + §0.1 旧表削除 |
| v275 | 役割分担表を CLAUDE.md に一本化（3 か所重複の解消） |
| **v276** | **v275 を方針転換: CLAUDE.md ではなく Notion §0 に集約**（context cost 観点） |

教訓: ドキュメント置き場の選択基準は「更新頻度 × Claude Code の毎回ロードコスト」で判断する。静的なものほど Notion 側、動的なものほど git 側。

---

## 123. v275 — ドキュメント役割分担表を CLAUDE.md に一本化（3 か所重複の解消） (2026-05-23)

### 背景

v274 で「同じ内容を 2 か所に書かない」と決めた直後に、その役割分担表自体が 3 か所に書かれているという皮肉な状況に気づいた:

1. `CLAUDE.md`「ドキュメント地図」
2. `CHANGELOG.md` 冒頭「役割と使い分け」表
3. Notion §0「ドキュメント役割分担」表

### 設計判断

`CLAUDE.md` を**真実の源**にする。理由:
- Claude Code が毎回自動ロード → context に常駐
- git 管轄 → 機械検知可
- 規約・指針の置き場として既に位置付けられている

### 実装

- **CLAUDE.md「ドキュメント地図」**: 表形式で完全版に強化（7 行: STATUS / CHANGELOG / TODO / CLAUDE.md / hooks / Notion / アーカイブ）
- **CHANGELOG.md 冒頭「役割と使い分け」表**: 撤去 → CLAUDE.md へのリンク + 過去アーカイブ参照のみに簡略化。「分割ポリシー」「過去ログ早見表」は CHANGELOG 独自情報なので保持
- **Notion §0「ドキュメント役割分担」表**: 撤去 → CLAUDE.md へのリンクのみに簡略化。「作業中（トリガー → 参照先）」「真実の源」は Notion 内ナビゲーションとして保持

### 役割分担の単一の源

これで「ドキュメント役割分担」は CLAUDE.md「ドキュメント地図」一箇所のみ。他は全部リンク。

---

## 122. v274 — Notion §0 セッション運用ガイドの現状整合化 (2026-05-23)

### 背景

Notion §0「🎯 セッション運用ガイド」は v248 時点のドラフトのまま残っており、現在の運用 (hook + CLAUDE.md + STATUS.md) と矛盾していた。例:

- 「開始時 1. §0.1 を流し見」← 既に SessionStart hook が STATUS.md inline 化済 (v272)
- 「終了時 (セッション中はちょこちょこ更新せず、ここでまとめて反映)」← 既に CLAUDE.md ルールで「ターンごとに STATUS / CHANGELOG / TODO 更新」に
- 「Notion §0.1 領域別ステータスに概要1行追記」← §0.1 は v271 で STATUS.md に分離済

### 整理 (案 C: 中間)

- **§9 編集メモ下「⚙️ セッション運用 三層設計」子ページ** を真実の源として書き直し
  - 🚧 ドラフト → ✅ 確定 + 運用中 に格上げ
  - §2.3 SessionStart の内容を v272 版 (STATUS.md inline) に更新
  - §2.4 Stop の内容を v272 版 (sw.js 変更時 STATUS.md チェック追加) に更新
  - §3 CLAUDE.md ドラフト → 撤去し repo の CLAUDE.md を真実の源と明記
  - §4 Notion に残すもの → STATUS.md 分離後の整理版に
  - §5 未確定論点: Windows + node 安定動作を ✅ 解決済に、PreToolUse(git push) は引き続き残課題
  - §6 決定ログに v270〜v273 の整理を追記

- **親ページ §0** を簡略化
  - 「開始時 / 作業中 / 終了時」の冗長な手順 → 削除
  - ドキュメント役割分担表を v273 整理版 (STATUS / CHANGELOG / TODO / CLAUDE.md / Notion の 5 軸) に書き換え
  - 詳細な運用フローは子ページ参照、規約は repo の CLAUDE.md 参照 (二重管理回避)

- **§0.1 旧表撤去**
  - v271 で「次回 Notion 編集時に削除予定」と書いていた領域別ステータス旧表 + コメント 3 つ + 「直近のフェーズ (旧)」見出しを物理削除
  - §0.1 は STATUS.md / CHANGELOG.md §119 へのリンクのみに完全簡略化

### 役割分担の最終形 (v273 整理 + v274 で Notion 反映)

| ドキュメント | 役割 | 真実の源 |
|---|---|---|
| STATUS.md | 現在 (状態軸) | git |
| CHANGELOG.md | 履歴 (時間軸) | git |
| TODO.md | 予定 | git |
| CLAUDE.md | 規約 (指針) | git |
| Notion | 仕様詳細・大方針・戦略 | Notion (人間が俯瞰) |
| .claude/hooks/*.js | 強制 (機械) | git |

5 ドキュメント + hook で責務を直交化。同じ内容を 2 か所に書かない。

---

## 121. v273 — permission allowlist 整理 (user global ↔ project shared) (2026-05-23)

### 背景

`~/.claude/settings.json`（user global）に norireco 特化の `notion-fetch` 許可が混ざっていた。さらに毎セッション permission prompt が出るコマンドがあり、煩雑だった。

### 整理方針

**user global** (`~/.claude/settings.json`): 全プロジェクト共通
- `Bash(git push origin claude/*:main)`
- `Bash(git push origin HEAD:main)`
- `autoUpdatesChannel: latest`

**project shared** (`<norireco>/.claude/settings.json`): norireco 特化
- `mcp__...notion-fetch` (user global から移動)
- `mcp__...notion-search` (新規)
- `mcp__...notion-update-page` (新規・write だが運用上必須)
- `Bash(node --check *)` (新規・JS syntax check、`--check` フラグは実行せず構文検証のみ)
- `Bash(node .claude/hooks/*)` (新規・project hook の手動テスト用)
- hooks (SessionStart + Stop)

### 抽出方法

`~/.claude/projects/*/*.jsonl` の最近 37 セッション・5,470 tool 呼び出しを Node script でスキャン、頻度順にソート。auto-allow 済 (cat/ls/grep/git status 等) と write 操作 / 任意コード実行 (`node -e`, `curl`) は除外。`fewer-permission-prompts` skill を使用。

### スキップした候補（参考）

- `Bash(node -e ...)` (~102 件): 任意コード実行のため
- `Bash(curl ...)` (31 件): 任意 URL アクセス
- `Bash(git add/push/commit ...)`: mutation 系で global / 既存 allow 済
- `mcp__...notion-create-pages` (11 件): write・低頻度

---

## 120. v272 — .claude/ hook を git 追跡化 + STATUS.md を SessionStart に inline (2026-05-23)

### 背景

v271 で STATUS.md を作ったが、SessionStart hook がまだ「Notion §0.1 を fetch しろ」と指示していて整合が取れていなかった。さらに hook script (`.claude/hooks/session-start.js` 等) は untracked のまま運用していたため、他デバイスや将来の協業者に届かないリスクがあった。

### 設計判断

- **SessionStart hook の出力に STATUS.md 全文を inline**: Read tool call も不要で、セッション開始直後から最新スナップショットが context に乗る。STATUS.md は現状 ~70 行なので context cost も許容範囲
- **`.claude/` を git 追跡開始** (CLAUDE.md を v270 で追跡開始したのと同じ精神): プロジェクト共通の hook 設定はリポジトリの一部として管理
- **個人設定とローカル状態は除外**: `.gitignore` 新規作成して `.claude/settings.local.json` / `.claude/worktrees/` を ignore

### 実装

- `.claude/hooks/session-start.js`:
  - STATUS.md を `readFileSafe()` で読み込み hook 出力に inline する `[STATUS.md — 現在のスナップショット]` セクション追加
  - 「着手前に必ず」の手順 1 を「Notion §0 fetch」から「上の STATUS.md を流し見」に書き換え
  - 手順 2 も Notion を「仕様詳細の参照先」に格下げ
- `.claude/hooks/stop-reminder.js`:
  - sw.js を変更したら STATUS.md の CACHE_VERSION 追従もチェック対象に追加 (v271 ルール)
  - メッセージから「Notion §0.1」を撤去 (STATUS.md / CHANGELOG.md / TODO.md の git 三本柱に集約)
- `.gitignore` 新規作成
- `.claude/settings.json` + `.claude/hooks/*.js` を git 追跡

### 残課題

- session-start.js が STATUS.md を inline するので、STATUS.md が肥大化すると毎セッション開始の context cost が増える。1500 行超えたら「冒頭 + 領域別ステータス見出しだけ」抽出に切り替える
- CACHE_VERSION 上げ忘れ防止のため `.gitignore` に sw.js は含めない (当然)。stop-reminder が新規 v271 ルールで catch する

---

## 119. v271 — §0.1 現在のステータスを STATUS.md に分離（git 管轄化） (2026-05-23)

### 背景

§0.1「現在のステータス」（CACHE_VERSION / 領域別ステータス / 直近フェーズ）は Notion 側に置かれていたため、**Stop フックの機械チェック対象外**だった。§0.1 自身に注意書きとして「ターンごとの『概要1行』更新は意識して手で行う」と書かれていた時点で運用が苦しく、実際に v265〜v269 など複数のセッションで更新漏れが起きていた疑いあり。

### 設計判断（3 案比較）

| 案 | メリット | デメリット |
|---|---|---|
| A. Notion §0.1 に残す（現状） | リンク先 1 つで済む | 機械チェック不可、更新漏れが起きやすい |
| B. CHANGELOG.md に同居 | ファイル増えない | CHANGELOG が「履歴（時間軸）」と「現在のスナップショット（状態軸）」を兼任して責務濁る、git diff も混在で読みづらい |
| **C. STATUS.md 独立（採用）** | 役割分担クリア、git 管轄でStop フック検知可、CHANGELOG はピュアな履歴に保てる | リンク先が 1 つ増える |

→ C を採用。CHANGELOG = 履歴、STATUS = 現在のスナップショット、TODO = やること、と責務を直交化。

### 実装

- `STATUS.md` 新規作成 — Notion §0.1 の 6 セクション（ブランド / URL / SW / カバレッジ / コードベース / 領域別ステータス / 直近フェーズ）をそのまま移植
- `CLAUDE.md` 更新 — 「ターンごとに更新」リストに STATUS.md 追加、ドキュメント地図の冒頭を STATUS.md に
- `sw.js` v269 → v271（v270 はドキュメント変更のみで sw.js 未更新だったため、今回まとめて +1 ではなく +2 で整合）
- Notion §0.1 は STATUS.md へのリンクだけに簡略化（セッション末手続きで実施）

### 残課題

- カバレッジ数字（637 系統 / 9,017 駅 / 260 列車）は `service_lines_master.json` などから自動生成できるはずで、手書きはずれやすい。将来 build script で STATUS.md の該当箇所を自動更新するか検討
- 領域別ステータス表は CHANGELOG §番号で詳細参照する構造だが、CHANGELOG が分割されたとき STATUS のリンクが古い番号を指したままになるリスクあり。バージョン番号 (vNNN) で参照する原則は維持

### 振り返り

「現在の状態」と「変更履歴」は性質が違う（状態軸 vs 時間軸）。混ぜると CHANGELOG の冒頭ステータスセクションが毎ターン書き換わってノイズが増える。独立ファイルにすると git diff も読みやすい。

---

## 118. v269 — hotfix: deletePhotoByUrl の関数定義漏れで全モジュール崩壊 (2026-05-23)

### 背景

v268 push 後、ユスケさんから「急に路線が表示されなくなったよ」+ Console スクショ:

```
Uncaught SyntaxError: The requested module './18-photo-area.js'
does not provide an export named 'deletePhotoByUrl' (at 16-memos.js:25:27)
```

= ESM の import 解決失敗 = **全モジュール初期化失敗** = 地図描画もマイページもすべて停止。

### 真の原因

実は v262「写真差し替え時の旧 R2 オブジェクト delete API」の commit 時に、`deletePhotoByUrl` 関数の **定義 Edit が失敗** していた (tool 操作のミス)。`uploadAndGetPhotos` 内で `deletePhotoByUrl(url)` を呼ぶ箇所だけが追加されて、関数本体・export 文が無い状態のまま commit + push されていた。

v262〜v267 の間ずっと **写真差し替えを保存した瞬間に ReferenceError が出る潜在 bug** だったが:
- ユーザーがその操作をしてない (ReferenceError は実行時のみ)
- ファイル内 reference なので import 解決には影響しない

→ 顕在化せず通過。

v268 で `16-memos.js` / `13b-trips.js` に `import { deletePhotoByUrl } from './18-photo-area.js'` を書いた瞬間、**モジュールロード時の静的解析**で export 不在が検出 → SyntaxError → 連鎖崩壊。

### 修正

`js/18-photo-area.js` に欠落していた関数を追加 (`uploadPhoto` の手前):

- `CDN_BASE` constant
- `urlToObjectKey(url)` (内部関数)
- `export async function deletePhotoByUrl(url)` (Worker `/delete/photo` を呼ぶベストエフォート関数)

これらは v262 commit time に追加されているべきだったが Edit が失敗していた。今回正規化。

### 振り返り

- 同じ「Edit が失敗して使用だけ残る」パターンは v265「gs is not defined」と同じ構造の bug。リファクタ / 移動 / 追加時の半分操作残りは要注意
- ESM の良いところ: import 解決時に欠落が即検出される (CommonJS や global だと runtime まで気付かない)
- 救いは syntax check が静的に通っていたこと (使用側だけでは syntax error ではない)。runtime test で初めて顕在化
- 次回からは: 関数を新規 export する commit で `npm run check` 後に **`grep -E "^export\b" target.js | head` で実際に export されてるか目視確認** をルーチン化

## 117. v268 — memo/trip 全削除時の R2 cleanup (2026-05-22)

### 背景

v258 で R2 写真機能を本格化、v262 で差し替え時の旧オブジェクト delete API を実装した。残った穴は **「memo / trip 自体を 🗑 削除」する時に R2 オブジェクトが置き去り** になる問題。R2 無料枠 10GB あるので即困らないが、累積で地味に肥える + 「自分のアカウントから消したい」のに R2 に残るのは UX 的にも違和感。

### 実装

`deletePhotoByUrl(url)` は v262 で `js/18-photo-area.js` から export 済の関数 (Worker `/delete/photo` を呼ぶ、ベストエフォート)。これを 2 箇所の削除関数で再利用:

**`js/13b-trips.js:deleteTripFromMypage`**:
- 削除前に `_mypageCache` から trip を引いて `photos[]` 取得
- Supabase DELETE 成功後、`Promise.all(photos.map(p => deletePhotoByUrl(p.url)))` を fire-and-forget
- await しない → 削除 toast はすぐ表示、R2 削除は背景で進行
- 失敗時は console.warn のみ (trip 自体は既に DB から消えてるので、R2 ゴミが残るだけ。許容)

**`js/16-memos.js:deleteMemoOnServer`**:
- 同じパターンで `M.cache` から memo の photos[] 取得
- Supabase DELETE 成功後に R2 並列削除 (fire-and-forget)
- `deleteMemoFromModal` (モーダル内 🗑) / `deleteMemoById` (マイページ memo カード 🗑) 両方が `deleteMemoOnServer` を経由するので、1 箇所の修正で両方に効く

### 漏れケース

- Supabase DELETE 失敗 (network error など) → throw されるので R2 削除も実行されない (正しい挙動: trip/memo は DB に残ってる)
- Worker `/delete/photo` 失敗 → console.warn のみで継続 (R2 ゴミが残るが、将来の cleanup ジョブで掃除可能。trip/memo 自体の削除は完了済)
- `_mypageCache` / `M.cache` に該当 trip/memo がない (削除直前にリロードされた等) → `photosToDelete = []` で削除なし。R2 ゴミ残る (レアケース)

### Worker 側

無修正。v262 で実装した `POST /delete/photo` (JWT verify + uid prefix チェック付き) をそのまま呼ぶ。

### これで完結する範囲

R2 写真機能の完成度:
- ✅ アップロード (memo / trip、1〜5 枚、複数選択、進捗バー)
- ✅ 表示 (サムネ + クリック原寸、lazy load + CDN cache)
- ✅ 並び替え (ドラッグ&ドロップ、5 箇所統一)
- ✅ 写真個別の差し替え/削除 (✕ で外す or 差し替え時の旧 R2 cleanup)
- ✅ memo/trip 全削除時の R2 cleanup ← v268
- ✅ セキュリティ (JWT verify + uid prefix チェックで他人のオブジェクト削除不可)

布石 #2「画像ストレージ: Cloudflare R2 + Workers API ゲートウェイ」のうち **写真添付ユースケースは完了**。残るのは OGP シェア画像の R2 永続化 (別 use case)。

## 116. v267 — マイページの D&D が動かない真の原因 fix (ignoreSelector から `a` 削除) (2026-05-22)

### 真の原因

v264 で D&D を実装し、v265 (click 抑制)、v266 (dragstart 抑制) と修正を重ねたが、ユスケさんから「うごきませんでした」報告 (v266 反映済の Console スクショ付き、コンソールに pointerdown のエラーなし)。

再調査で見つけた**本当の原因**: `js/19-drag-sort.js:onPointerDown` 内の早期 return:

```js
if (e.target.closest(ignoreSelector)) return;
```

`ignoreSelector` のデフォルト値が `'button, a, input, textarea, select'` で **`a` を含んでいた**。マイページのサムネ HTML は:

```html
<div class="mp-photo-cell">
  <a href="..." target="_blank" draggable="false">
    <img class="mp-tcard-thumb" ...>
  </a>
</div>
```

`<img>` を pointerdown → `e.target = img` → `closest('a')` で `<a>` がマッチ → **即 return → ドラッグ開始されない**。

PhotoArea モーダル内のサムネは `<a>` で wrap してないため (img 直接)、こちらは正常に動いていた。だから「PhotoArea では動くがマイページでは動かない」という分かりにくい症状になった。

### 修正

`19-drag-sort.js` のデフォルト `ignoreSelector` から `a` を削除:

```js
ignoreSelector = 'button, input, textarea, select',
```

`<a>` 内の click は v265 で実装した `suppressNextClick()` で抑制されるので、ドラッグ後にリンクが開く問題は起きない。

`18-photo-area.js` 側の override 文字列からも `a` を削除 (こちらは元々無関係だが整合性のため)。

### 振り返り

3 連の bug fix (v265/266/267) になった原因:
- v265 click 抑制: 必要な保険だが、根本原因ではなかった
- v266 dragstart 抑制 + gs 修正: dragstart 抑制も保険、gs はそもそも別 bug
- v267 ignoreSelector: これが真因

最初から「pointerdown が発火してるか」のログを 1 行入れていれば早く特定できた。次回は実機で動かない時はまず console.log を仕込む。

## 115. v266 — D&D が動かない bug fix (dragstart 抑制 + `gs is not defined` 修正) (2026-05-22)

### 背景

v265 push 後、ユスケさんから「クリックして動かそうとしても動かないし、コンソールも反応なし」のフィードバック + Console スクショ。Console には別の独立した bug `ReferenceError: gs is not defined at renderStats (09-tabs-stats.js:328:45)` も見えていた (これは renderStats を呼んだ時の uncaught promise rejection、D&D 失敗の原因ではないが、放置すると統計タブが描画できない)。

### bug 1: D&D が動かない (`js/19-drag-sort.js`)

サムネは `<a target="_blank">` + `<img>` でラップされている。`draggable="false"` 属性を `<a>` / `<img>` に付けてあったが、**ブラウザによっては効かない**。ユーザーがマウスでサムネを掴むと、ブラウザのネイティブ「URL ドラッグ」or「画像ドラッグ」が即座に発動し、pointer events を奪っていた可能性が高い。

修正: `dragstart` イベント自体を container レベルで明示的に抑制 (`e.preventDefault()`):

```js
function onNativeDragStart(e) {
  if (e.target.closest(itemSelector)) e.preventDefault();
}
container.addEventListener('dragstart', onNativeDragStart);
```

destroy() 時にも removeEventListener。

### bug 2: `gs is not defined` (`js/09-tabs-stats.js`)

`renderStats` の「実績」セクション (line 327〜) で `gs.rt` `gs.la` `gs.pct` を参照していたが、`const gs = ...` の定義が消えていた (過去のリファクタで漏れた)。プロパティ名から `NORIRECO.serviceLines.globalStats()` の戻り値を期待していると判明 (`{ts, rt, la, ld, pct}`)。

修正: `achs` 配列定義の直前で `const gs = NORIRECO.serviceLines.globalStats();` を追加。

### 影響範囲

- bug 1 修正で 5 箇所すべての D&D (PhotoArea 3 モーダル + マイページ 旅程/メモ カード) が実際に動くようになる
- bug 2 修正で マイページ 📊 統計タブの「実績」セクション (9 個のバッジ) が正しく描画される

## 114. v265 — D&D 後の click 抑制 (リンク・ボタン誤発火を防止) (2026-05-22)

### 背景

v264 で D&D を全画面に実装した直後、ユスケさんから「マイページ memo タブでも動く?」と確認の質問。スクリーンショット上で実装は反映されているが、**写真サムネは `<a target="_blank">` でラップされている** ので、D&D 完了時に **pointer up → click イベント発火 → 新タブで原寸表示** という連鎖が起きる可能性がある (mouse 系では確実に発生)。

つまり「ドラッグ&ドロップした瞬間に、写真が新タブで開いてしまう」誤動作。

### 修正

`js/19-drag-sort.js:onPointerUp` 内で、ドラッグ確定 (`started=true`) 後の処理として `suppressNextClick()` を呼ぶ:

```js
function suppressNextClick() {
  function handler(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    window.removeEventListener('click', handler, true);
  }
  window.addEventListener('click', handler, true);
  // 保険: 500ms で listener を撤去 (click が来なかった場合)
  setTimeout(() => window.removeEventListener('click', handler, true), 500);
}
```

window への capture phase listener で「次の click を 1 回だけ吸収」する典型パターン。pointer up 直後の click は確実に捕まる。500ms タイムアウトでリーク防止。

### 影響範囲

- 5 箇所すべての D&D (PhotoArea 3 モーダル + マイページ 旅程/メモ カード) で同時改善
- ドラッグじゃない単純なクリック (5px 未満) は started=false のままなので suppressNextClick は呼ばれない → リンク開封は通常通り動く

## 113. v264 — 写真並び替えを D&D に全交換 + ‹ › 撤去 (2026-05-22)

### 背景

v261 (PhotoArea 内 ‹ ›) → v263 (マイページカードでも ‹ ›) と並び替え UI を入れたが、ユスケさんから「矢印があると見栄えがわかくなるね。ドラッグ&ドロップで操作するようにはできない?」とフィードバック。

D&D 自体は実装可能だが、PWA (モバイル想定) で HTML5 native drag-and-drop はモバイル非対応 → Pointer Events で自前実装する。

### 新規モジュール: `js/19-drag-sort.js`

汎用 D&D 並び替えライブラリ (66 行、依存なし):

```js
enableDragSort(container, {
  itemSelector,        // ドラッグ対象を絞る selector
  onReorder,           // (oldIdx, newIdx) => void
  ignoreSelector,      // 掴まない子要素 (button, a, input)
  threshold,           // drag 確定までの px (default: 5)
})
```

実装ポイント:
- **Pointer Events** で PC (mouse) + モバイル (touch) を統一 (HTML5 native は touch 不可)
- **threshold** 超過まで「クリック扱い」、超えたら「ドラッグ」に確定 (誤動作防止 = 軽くタップでドラッグ開始しない)
- **event delegation**: container に 1 つ listener、子要素は innerHTML 書き換えで再生成されても自動追従 → 再 attach 不要 (マイページの 153 枚カードでも軽量)
- **setPointerCapture** で長距離スワイプも追従 + `e.preventDefault()` で iOS Safari のスクロール抑制
- ドロップ位置検出: pointer 座標を全 item の `getBoundingClientRect()` と比較

### 各画面の統合

| 画面 | ファイル | 統合方法 |
|---|---|---|
| PhotoArea (memo/trip 編集モーダル + 記録モード確認) | `js/18-photo-area.js` | `createPhotoArea` 内で `enableDragSort(gridEl, {...})` を 1 回 attach、戻り値の `destroy()` を `area.destroy()` 内で呼ぶ |
| マイページ旅程カード | `js/13b-trips.js` | `reorderTripPhotos(tripId, fromIdx, toIdx)` を追加 (任意位置への移動。旧 `moveTripPhoto` 隣接スワップを廃止)。`renderMpTripsSection` 末尾で `attachPhotoDragSortToTripCards(sec)` を呼ぶ |
| マイページ memo カード + 駅メモ一覧モーダル | `js/16-memos.js` | `reorderMemoPhotos(memoId, fromIdx, toIdx)` を追加 (旧 `moveMemoPhoto` 廃止)。`renderMpMemosSection` / `openStationMemoList` の末尾で `attachPhotoDragSortToMemoCards(rootEl)` を呼ぶ |

### CSS (`noritetsu-map.html`)

撤去:
- `.pa-move-row` / `.pa-move` (PhotoArea 内 ‹ ›)
- `.mp-photo-move` (マイページカード上 ‹ ›)

追加:
- `.pa-item, .mp-photo-cell { cursor: grab; touch-action: none; user-select: none; }` (D&D 対象セル)
- `.drag-dragging { opacity: 0.7; cursor: grabbing; box-shadow: 0 8px 20px rgba(0,0,0,.6); }` (ドラッグ中のゴースト)
- `.drag-over { outline: 2px dashed var(--gold); }` (ドロップ候補のハイライト)
- `.pa-item img, .mp-photo-cell img { -webkit-user-drag: none; }` (画像のネイティブ drag を抑制)

### 挙動

1. サムネを mouse down or touch start → 5px 以上動かしたらドラッグ確定
2. ドラッグ中: サムネが透過 + 浮いた感、他のサムネ上で gold dashed outline ハイライト
3. 離したら入れ替え (即座に Supabase PATCH + 再描画)
4. ハイライト無しで離す or 圏外でキャンセル → 元位置に戻る

### 影響範囲 (D&D 統一の効果)

5 つの並び替え場所が同じ UX:
- 記録モード確認モーダルの 📷 写真
- 旅程編集モーダルの 📷 写真
- メモモーダルの 📷 写真
- マイページ 🚃 旅程タブの各カード
- マイページ 📸 メモタブの各カード + 駅メモ一覧モーダル

### 残課題

- ドラッグ中のスムーズなアニメ (他要素が「隙間を作る」transition) — 現状は即座に入れ替わるシンプル実装
- マイページのフィルタ/ソート変更直後にもドラッグ可 (event delegation で自動追従、未確認)

## 112. v263 — マイページの旅程・メモカード上で写真を ← → 並び替え (2026-05-22)

### 背景

v261 で PhotoArea (memo モーダル / 旅程編集モーダル / 記録モード確認) に並び替え UI が入ったが、ユスケさんからの指摘:「マイページ画面でも、写真が左右に移動できるようにしたい」。

確かに「並び替えだけのために 編集モーダル を開く」のは手数が多い。マイページ画面で直接やれた方が UX 上いい。

### 設計判断

| 方式 | 採否 | 理由 |
|---|---|---|
| 各カードに PhotoArea を埋め込む (フル機能) | ❌ | 153 件のカードに 153 個の PhotoArea = メモリ食い・DOM 重い。並び替えしか必要ないのにオーバーキル |
| カード上に **← → だけ**の軽量 UI | ✅ | 並び替えに限定、Supabase PATCH を直接呼ぶ |
| ✏️ 編集モーダルだけで完結 (現状維持) | ❌ | ユスケさんの希望: カード上で完結したい |

### 実装

`js/13-mypage-common.js:tripCardHtml`:
- 写真サムネを `.mp-photo-cell` (relative wrap) でラップ
- 2 枚以上のとき `.mp-photo-move.left` / `.mp-photo-move.right` を絶対配置 (top:50% / 左右端 / 20×20 半透明黒)
- 最左/最右は `disabled` で半透明

`js/13b-trips.js`:
- `moveTripPhoto(tripId, idx, direction)` を追加
  1. `_mypageCache` の trip から photos[] を取得 → swap
  2. localStorage 同期
  3. Supabase PATCH `{ photos: newOrder }`
  4. `renderMpTripsSection()` で再描画
- 失敗時は console.warn のみ (alert 出さない、ローカル状態は更新済なので UX 続行)

`js/16-memos.js`:
- 同じパターンで `moveMemoPhoto(memoId, idx, direction)` を追加 (memo カード + 駅メモ一覧モーダルで動作、`memoCardHtml` 共通)
- 既存の `updateMemoOnServer` を流用 (PATCH `{ photos }`)

`noritetsu-map.html`:
- `.mp-photo-cell` / `.mp-photo-move` CSS 追加 (PhotoArea の `.pa-move` と似た見た目だが、サムネサイズが小さい (64-80px) ため少しコンパクトに 20×20)

### 影響範囲

- マイページ **🚃 旅程タブ** の各カード
- マイページ **📸 メモタブ** の各カード
- **駅メモ一覧モーダル** (v251、`memoCardHtml` 共通使用のため自動追従)

3 箇所同時に並び替え可能になる。

### 残課題

- 1 枚しかない時はボタン非表示 (実装済、`photos.length > 1` 条件)
- スマホ画面の小さいサムネだと押しにくい可能性 — 実機テストで判断

## 111. v262 — 写真差し替え時の旧 R2 オブジェクト delete API (2026-05-22)

### 背景

v258 で複数枚化したことで、ユーザーが写真を **✕ で外す → 保存** したり **差し替え → 保存** した時に、Supabase の `photos jsonb` 列からは外れるが R2 のオブジェクト自体は残り続けるゴミ問題が顕在化。R2 は 10GB 無料枠あるので今すぐ困らないが、ユーザー数が増えると地味に肥大化する。

### Worker 拡張 (`worker/src/index.js`)

`POST /delete/photo` エンドポイントを追加:

- Request: `{ object_key: "memos/<uid>/<memo_id>/<photo_id>.webp" }` + `Authorization: Bearer <jwt>`
- Worker 内で:
  1. JWT verify → uid 取得
  2. `object_key` を正規表現 `^(memos|trips)\/([^/]+)\/([^/]+)\/([^/]+)$` で validate
  3. uid 部分が JWT の uid と一致するか確認 (他人のオブジェクト削除を防止)
  4. R2 に SigV4 署名付き DELETE 送信
  5. 404 は冪等性のため成功扱い (既に消えてた = 望む状態)

再 deploy 済 (Version `d8a57421`、64.23 KiB / gzip 15.40 KiB)。

### フロント (`js/18-photo-area.js`)

- `urlToObjectKey(url)`: `https://cdn.norireco.app/<key>` から `<key>` を抽出
- `deletePhotoByUrl(url)`: Worker `/delete/photo` を呼ぶ (ベストエフォート、失敗は console.warn のみ。アップロード処理は止めない)
- **`initialUrls` Set** を `createPhotoArea` 内に追加: モーダル開いた時点の existing URL を記憶
- `uploadAndGetPhotos` 冒頭で diff を計算:
  - `initialUrls` にあったが、現在の `items` (existing) から消えてる URL = **削除対象**
  - 並列実行 (`Promise.all`、delete は冪等)
  - ステータスバーに「🗑 旧写真を削除中 (N 枚)」表示

### 挙動シナリオ

| シナリオ | 削除対象 | アップロード対象 |
|---|---|---|
| 既存を ✕ で外して保存 | その 1 枚 | 0 枚 |
| 既存を ✕ + 新規追加して保存 | 外した 1 枚 | 追加した 1 枚 |
| 並び替えだけ | 0 枚 | 0 枚 (順序だけ DB に保存) |
| 全部削除して保存 | 全 existing | 0 枚 |

### 失敗時の挙動

- Worker `/delete/photo` が 4xx/5xx を返しても、フロントは **保存処理を続行**
  (ユーザー視点で「写真は外したいけど、外せてない」という不便を避ける。R2 ゴミは将来 cleanup ジョブで掃除可)
- console.warn でログを残すので、開発者は気付ける

### 残課題

- memo/trip 全削除時の R2 オブジェクト掃除 (現状は memo/trip row 削除のみで R2 はそのまま)。別タスクで実装

## 110. v261 — 写真の並び替え UI (← → ボタン方式) (2026-05-22)

### 背景

v258 で複数枚 (最大 5 枚) 化したことで、追加順以外の並びにしたい場面が出る (例: メインの写真を 1 枚目に持ってきたい、トップ画として OGP に使いたい等)。

### 設計判断

**← → ボタン方式**を採用 (ドラッグ&ドロップ / 長押しソート は不採用)。

| 方式 | 採否 | 理由 |
|---|---|---|
| ← → ボタン | ✅ | 最大 5 枚なら十分。PC / モバイル 同じ挙動 = テスト 1 回。実装小 |
| HTML5 native drag-and-drop | ❌ | モバイルで動かない (pointer events 必要) |
| 長押しソート (Sortable.js 系) | ❌ | ライブラリ追加 (~30KB) or 自前実装で重い。ES Module 構成と相性悪 |

### 実装

`js/18-photo-area.js`:
- `render()` でサムネ HTML に `.pa-move-row` (下端) を追加。`‹` (左) / `›` (右) ボタン、最左/最右は `disabled` で半透明
- 1 枚しかないときは row 自体を出さない (`items.length > 1` 条件)
- `moveItem(idx, direction)` 関数 (direction: -1=前 / +1=後) で `items` 配列を swap → render
- gridEl click delegate に `.pa-move` の handler を追加 (data-action="left|right" + data-idx で分岐)

`noritetsu-map.html`:
- `.pa-badge` (NEW バッジ) を `bottom:3px` → `top:3px` に変更 (下端の move-row と干渉しないように。NEW は左上、✕ は右上、‹ › は下端の左右、で 4 隅クリーン)
- `.pa-move-row` / `.pa-move` (22×22px 円形、半透明黒、hover で gold) CSS 追加

### 挙動

- items 配列の順序がそのまま `photos[]` の順序になる (uploadAndGetPhotos が items を順番にループ → 既存実装で自動追従)
- existing (R2 既存) と new (アップロード待ち) が混在しててもそのまま並び替え可
- 並び替えは即時 (sync)、保存ボタン押下で確定 (uploadAndGetPhotos が新順序で photos[] 返す)

### 影響範囲

memo / 旅程編集 / 記録モード確認の **3 箇所**で同時改善 (共通 PhotoArea を使ってる成果)。

## 109. v260 — 写真アップロードの進捗バー (2026-05-22)

### 背景

v258 で複数枚 (最大 5 枚) 化したことで、特にモバイル回線で 3-5 枚アップロード時に「いま何枚目」「あと何枚」が体感で分かりづらかった。テキストだけ (`アップロード中 (2/5)…`) では視覚的に進んでる感が薄い。

### 変更

`js/18-photo-area.js` の PhotoArea コンポーネントに**進捗バー**を追加 (`.pa-progress` / `.pa-progress-fill`、ゴールド色のフィルが滑らかに右へ伸びる):

- **DOM**: `.pa-status` を `<div>` から `<div class="pa-status-text">` + `<div class="pa-progress">` の縦並びに変更
- **API 追加**: `setProgress(percent)` / `hideProgress(delayMs)` (module 内 private)
- **圧縮フェーズ** (file 選択時): `🗜 圧縮中 N/M` + バー (枚数ベース)、完了後 0.8 秒で消える
- **アップロードフェーズ** (uploadAndGetPhotos): `☁️ アップロード中 N/M` + バー、完了表示 `✅ アップロード完了 (N 枚)` を 1.2 秒残す
- **失敗時**: バーをそのまま残して `❌ アップロード失敗 (X/Y 完了)` を表示 (どこまで進んだか確認できるように)

### CSS (`noritetsu-map.html`)

```css
.pa-status{display:flex;flex-direction:column;gap:4px;...}
.pa-progress{height:5px;border-radius:3px;background:var(--track);overflow:hidden;}
.pa-progress-fill{height:100%;background:var(--gold);width:0%;transition:width 0.25s ease;}
```

5px の細いバー (圧迫感を避ける) + 既存の `--gold` 色 (UI 全体の差別化アクセント) + 0.25s easing で滑らかに動く。

### 影響範囲

memo モーダル / 旅程編集モーダル / 記録モード確認モーダル の **3 箇所すべて**で進捗バーが共通動作。共通 PhotoArea を使ってる成果。

### 残課題 (まだやってない)

- ファイル単位の % 進捗 (XHR.upload.onprogress): 大きい単一ファイル時にバーが「枚数粒度」でしか動かない問題。将来 fetch → XHR に書き換え or `ReadableStream` 経由で実装可能だが、現状の写真 (圧縮後 < 5MB) なら 1 枚 0.5〜2 秒で完了するので体感影響小

## 108. v259 — `.btn-gen` の CSS 定義漏れを修正 (2026-05-22)

### 背景

v258 リリース後、ユスケさんから「保存ボタンがちいさいね」とのフィードバック。原因は `.btn-gen` クラスを 4 箇所のボタン (記録モード確認 / 旅程編集 / 復元 / 終了駅選択) で使っているが CSS 定義が無く、ブラウザのデフォルトスタイル (内容幅のみ) になっていたため。

実は v258 以前から存在していた潜在 bug だが、旅程編集モーダルに `📷 写真` セクションを追加してモーダル全体が縦長になったことで、small な保存ボタンの違和感が顕在化した格好。

### 修正

`.btn-save` (memo モーダル用) と同じスタイルを `.btn-gen` にも適用:
- `width:100%` (フルワイド)
- `padding:13px` / `border-radius:12px`
- `background:#48d597` (緑) / `color:var(--navy)`
- `font-size:15px` / `font-weight:700`

`.btn-gen:disabled` / `.btn-gen:hover` も `.btn-save` と同等に。

### 影響範囲

`.btn-gen` を使う 4 箇所が同時に視認性向上:
- 記録モード確認モーダル `💾 手動記録で保存する` / `💾 GPS 記録で保存する`
- 旅程編集モーダル `💾 保存する`
- 復元モーダルの実行ボタン
- 終了駅選択モーダル `✅ この駅で終了して確認へ`

## 107. v258 — 旅程の写真添付 + memo の複数枚化 + 共通 PhotoArea モジュール (2026-05-22)

### 背景

v256 で memo 写真の R2 アップロードが動いた直後、ユスケさんからの「旅程でも同じように写真登録できるようにしたい」フィードバック。布石 #2 「画像ストレージ: Cloudflare R2 + Workers API ゲートウェイ」の本来の use case は「旅程の写真添付 + OGP 生成」なので、想定通りの展開。memo の写真 UI を素朴に複製するのではなく、共通モジュールに切り出して両方で使う方針を採用。副次的に memo も「1 枚のみ → 5 枚まで」に拡張される。

### 設計判断

| 軸 | 採用 | 理由 |
|---|---|---|
| 共通化 vs 重複コード | **共通モジュール `js/18-photo-area.js`** | 圧縮 / アップロード / 複数枚 UI を 1 箇所に集約。memo / trip 両方で `createPhotoArea({ kind: 'memo' | 'trip', ... })` 形式で再利用。将来 OGP シェアや station photos でも転用可能 |
| Worker エンドポイント | **`/upload/memo-photo` + `/upload/trip-photo` の 2 本** | 内部実装は `handlePhotoUpload(kind, ...)` で共通化、`PHOTO_KINDS` map で kind→keyPrefix/idRegex/bodyIdField を分岐。エンドポイントを分けることで CORS や rate limit の細かい制御を後付け可能 |
| 1 旅程あたりの枚数 | **最大 5 枚** | 車窓・駅・乗換と複数場面を保存できる。memo も同じく 5 枚 (副次的) |
| R2 オブジェクトキー | `trips/<uid>/<trip_id>/<photo_uuid>.<ext>` | memo と同じく uid 最上位 prefix で破壊範囲限定、trip_id で grouping |

### Worker 拡張 (`worker/src/index.js`)

- `PHOTO_KINDS` map を追加 (memo / trip それぞれの `keyPrefix` / `bodyIdField` / `idRegex`)
- `handleMemoPhotoUpload` を `handlePhotoUpload(kind, ...)` にリネーム + 一般化
- ルーターに `/upload/trip-photo` を追加 (handler 共通)
- trip_id の regex は `^trip_[0-9a-zA-Z_]{8,40}$` (既存コードでは `trip_${Date.now()}` で 13 桁の UNIX time ms、将来 suffix 拡張に備えて緩めに)
- 再 deploy: `Uploaded norireco-api (2.89 sec)` (62.67 KiB / gzip 15.17 KiB)

### Supabase migration (`supabase/migrations/v258_trip_photos.sql`)

```sql
ALTER TABLE norireco_trips
  ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;
NOTIFY pgrst, 'reload schema';
```

ユーザーが Supabase Dashboard → SQL Editor で実行する必要あり。既存 trip 約 150 件は `photos=[]` で migrate される。

### 共通 PhotoArea モジュール (`js/18-photo-area.js` 新規 244 行)

公開 API:
```js
const area = createPhotoArea({
  container,       // HTMLElement (本 module が中身を描画)
  kind,            // 'memo' | 'trip'
  getOwnerId,      // () => string | null
  initialPhotos,   // [{url, w, h, bytes, content_type}]
  maxCount,        // default: 5
});
await area.uploadAndGetPhotos(ownerIdOverride)  // 新規 blob を順次アップロード
area.destroy()                                  // blob URL revoke + DOM 撤去
```

内部 items 配列で `{ kind: 'existing', url, ... }` (既存 R2 URL) と `{ kind: 'new', blob, w, h, previewUrl }` (アップロード待ちの Blob) を統一管理。圧縮 (Canvas → WebP 0.82 / 長辺 1200px) / プレビュー (blob:URL) / ✕ 削除 / + 追加 / 圧縮ステータス表示まで自己完結。

### Frontend 統合

3 箇所で `createPhotoArea` を使用:

1. **memo モーダル** (`js/16-memos.js`): 既存の手作り file input + 1 枚プレビュー UI を全部削除、`createPhotoArea({ kind: 'memo' })` に置き換え。**副次的に memo も最大 5 枚化**。memoCardHtml も複数枚サムネ並列表示に。
2. **旅程編集モーダル** (`js/13b-trips.js`): `📝 自由メモ` の下に `📷 写真` セクションを追加。`openTripEditModal` で area 生成、`saveTripEdit` で `tripPatch.photos = await area.uploadAndGetPhotos(tripId)` を Supabase PATCH に含める。
3. **記録モード確認モーダル** (`js/07-record-mode.js`): `rec-confirm-modal` の `📝 メモ` 行の下に `📷 写真` セクションを追加。`openRecConfirm` で area 生成 (毎回リセット、notes/delay と同じ挙動)、`saveMultiSegmentTrip` で trip_id 確定後にアップロード → `trip.photos = uploaded`。失敗時は alert + 保存全体をキャンセル。

### 旅程カードのサムネ表示 (`js/13-mypage-common.js:tripCardHtml`)

`📝 notes` の下に `📷 photos` 横並びサムネ (64×64 / object-fit:cover / lazy load / 角丸 / hover gold ボーダー / クリックで原寸別タブ)。memo カードと同じ視覚スタイル (memo は 80px、trip は少し小さめ 64px)。

### 失敗時の挙動

- **Worker presign 失敗** (network / 401 / 400): area が例外を throw、呼び出し側で alert + 保存中断
- **R2 PUT 失敗**: 同上
- **memo 保存中に 1 枚目アップロード OK・2 枚目失敗**: 1 枚目は R2 に残るが、memo POST が走らないので DB から見ると到達不能。R2 はゴミとして残る (将来の cleanup ジョブ)
- **trip 保存中に同様**: 同上、trip POST が走らない

### 残課題 (次回以降)

- 写真差し替え時の旧 R2 オブジェクト delete API (現状はゴミが残る、将来の定期 cleanup or `/delete/photo` エンドポイント)
- 写真の並び替え UI (現状は追加順固定)
- OGP シェア画像の R2 永続化 + `/share/<id>` 受け側ページ (布石 #2 のもう一つの大きな use case)
- 既存 Supabase SDK 直叩きコードの段階的 Worker 経由化 (布石 #4 の残り)

### コミット範囲

- `worker/src/index.js` (PHOTO_KINDS 共通化 + /upload/trip-photo 追加)
- `js/18-photo-area.js` 新規
- `js/16-memos.js` (PhotoArea に切替、複数枚化)
- `js/13b-trips.js` (旅程編集モーダルに photo セクション追加)
- `js/07-record-mode.js` (記録モード保存時に photo 添付)
- `js/13-mypage-common.js` (tripCardHtml に photo サムネ追加)
- `scripts/syntax-check.js` (FILES に 18-photo-area を追加)
- `noritetsu-map.html` (m-photo-* CSS を削除、.pa-* / .mp-tcard-photos / 各モーダルの photo container 追加)
- `sw.js` (CACHE_VERSION v257 → v258、STATIC_ASSETS に 18-photo-area)
- `supabase/migrations/v258_trip_photos.sql` 新規

## 106. v257 — マイページ memo カードに写真サムネイル表示 (2026-05-22)

### 背景

v256 で memo 写真の R2 アップロードが動いた直後、マイページの memo カードは「📷 写真を見る」テキストリンクのままで、写真が表示されていなかった (元コードは Supabase POST すらしてなかった v90 時代の名残)。ユスケさんからの直接フィードバック「重くならない?」に「lazy loading + 80px 縮小表示なら大丈夫」と回答してそのまま実装。

### 変更

- **`js/16-memos.js:memoCardHtml`**: テキストリンクを `<img class="mp-memo-thumb" loading="lazy">` に置換 (`<a>` で wrap して写真クリックで原寸表示は維持)
- **`noritetsu-map.html`**: `.mp-memo-photo` の色付きテキスト style を削除、`.mp-memo-thumb` (80×80px / object-fit: cover / 角丸 8px / 黒背景) を追加、hover で gold ボーダーに

### パフォーマンス試算

- 圧縮済 WebP は数十〜数百 KB/枚 (v256 で長辺 1200px / quality 0.82)
- `loading="lazy"` で画面外は読み込まれない (スクロール時に順次)
- `cdn.norireco.app` は Cloudflare CDN edge cache 効くので 2 回目以降は即時
- 100 件のメモがあっても、初期表示は画面に見えてる数件 (5-10 枚) だけ ≒ 1-2MB

### 残課題

- 複数枚対応 (現状 `photos[0]` のみ、UI が 1 枚前提)
- 駅メモ一覧モーダル (v251) 内のカードも同 `memoCardHtml` を使ってるので自動的に同改善が効くはず

## 105. v256 — R2/Workers 経由のメモ写真アップロード (布石 #2/#4 着手) (2026-05-22)

### 背景

v250 で `norireco_memos.photos jsonb` 列を追加した時点で「写真URL を直接 input で受ける」仮 UI のままだった (CHANGELOG §83 末尾、`m-photo` の `fl-hint` に「※ R2 アップロード対応は v251 以降」と書いてあった箇所)。TODO 布石 #2 (R2 + Workers API ゲートウェイ) と #4 (API を Workers 経由に統一) の発動条件が「画像機能の実装着手時」なので、ここで両方を一気に立ち上げる。

### 設計判断

| 軸 | 採用 | 理由 |
|---|---|---|
| 配信方式 | **presigned URL 方式** | アップロードのみ Worker 経由、配信は `cdn.norireco.app` の public R2 から直接 `<img src>` で読む。Worker リクエスト数を最小化 (R2 egress は無料なので Worker proxy にしてもコストは同じだが、レイテンシが減る) |
| JWT verify | **JWKS 経由の ES256 verify** | Supabase が JWT 署名を Legacy HS256 → ECC P-256 (ES256) に移行済 (current key = ECC、previous = HS256 / 15 日前 rotate)。新トークンは ES256 で署名されるので HS256 + 共有シークレットでは verify できない。JWKS 経由なら Worker 側に **シークレット共有不要** + 鍵 rotation にも自動追従 + 布石 #5 (認証ベンダーロックイン回避) とも整合 |
| R2 オブジェクトキー | `memos/<uid>/<memo_id>/<photo_uuid>.<ext>` | uid を最上位 prefix で破壊範囲を限定、memo_id で grouping (将来 1 メモ複数写真対応)、photo_uuid で衝突回避 |
| 画像圧縮 | クライアント側 Canvas で WebP / 長辺 1200px / quality 0.82 | Worker 側で sharp 等の画像処理ライブラリを動かすと CPU 制限に当たる。クライアント側なら無料 |
| 上限 | 元 20MB / 圧縮後 5MB (Worker 側で reject) | 通常のスマホ写真 (5〜10MB) を圧縮で 100〜400KB 程度に落とせる想定 |

### Cloudflare 側の構築 (2026-05-22)

- **R2 サブスク有効化**: 無料枠 10GB 保存 / 100万 PUT / 1000万 GET / **egress 完全無料**
- **R2 バケット**: `norireco-photos` (Asia-Pacific, Standard)
- **Custom Domain**: `cdn.norireco.app` を bind (TLS 1.2、Cloudflare DNS 配下なので CNAME 自動追加)
- **CORS Policy**: `norireco.app` / `yutsutke.github.io` / `localhost:3000-8080` / `127.0.0.1:5500` を allow、GET/PUT/HEAD、`Content-Type`/`Content-Length` ヘッダー、`ETag` expose
- **R2 API Token**: `norireco-worker` (Account API Token、Object Read & Write、`norireco-photos` バケット限定、Forever TTL)
  - これは production-tied (Account 紐付け) なので User Token (organization 離脱で失効) より安全
- **R2 Account ID**: `3684c46b0cdbd984e1057e86a52e6287` (S3 endpoint に含まれる、公開情報)

### Worker 実装

`worker/` を repo に追加 (5 ファイル):

```
worker/
├── package.json       deps: jose ^5.9.6, aws4fetch ^1.0.20, wrangler ^4.93.1
├── wrangler.toml      [vars] 公開設定 + [[routes]] api.norireco.app custom_domain
├── .gitignore         node_modules / .dev.vars / .wrangler
├── README.md          デプロイ手順
└── src/
    └── index.js       3 エンドポイント (62 KiB / gzip 14.86 KiB)
```

エンドポイント:

| Method | Path                  | 認証 | 用途                                  |
|--------|-----------------------|------|---------------------------------------|
| GET    | `/health`             | 不要 | 疎通確認                              |
| GET    | `/me`                 | 必要 | JWT verify テスト (uid/email 返却)    |
| POST   | `/upload/memo-photo`  | 必要 | 駅メモ写真の presigned PUT URL 発行    |

`/upload/memo-photo` のフロー:
1. `Authorization: Bearer <token>` から JWT 取得
2. `jose.jwtVerify(token, JWKS, { issuer: SUPABASE_URL/auth/v1, audience: 'authenticated' })`
3. `payload.sub` を uid として取得
4. body validate (`memo_id` 形式 / `ext` whitelist / `size_bytes` 上限)
5. `aws4fetch.AwsClient.sign(s3Url, { method: 'PUT', aws: { signQuery: true } })` で SigV4 presigned URL を生成 (有効期限 5 分)
6. `{ upload_url, public_url, object_key, expires_at }` を返す

### Secrets 管理

`wrangler secret put` で Cloudflare 側に直接暗号化保存 (ローカルにも git にも残らない):
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

`wrangler.toml` の `[vars]` には公開情報のみ (SUPABASE_URL / R2_ACCOUNT_ID / R2_BUCKET_NAME / CDN_BASE_URL / ALLOWED_ORIGINS)。

### デプロイの躓きポイント

1. **PowerShell の Execution Policy で `npm install` が走らない**: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` で恒久対応
2. **wrangler 3.114 (古い) で OAuth ログインが libuv assertion failure**: `npm install --save-dev wrangler@4` (現行 4.93.1) で解決
3. **`[[routes]] pattern = "api.norireco.app/*"` でデプロイエラー (`Wildcard operators (*) are not allowed in Custom Domains`)**: Custom Domain はドメイン全体を Worker に bind する仕組みなので path/wildcard 不要、`pattern = "api.norireco.app"` のみで OK

### フロント実装 (`js/16-memos.js` + `noritetsu-map.html`)

`m-photo` URL input を file input + プレビュー + Worker 経由 upload に置換:

**16-memos.js**:
- `NORIRECO_API_BASE = 'https://api.norireco.app'` constant
- `compressImageToWebP(file)`: Canvas + `createImageBitmap` で長辺 1200px / WebP 0.82
- `uploadPhotoForMemo(memoId, blob, meta)`: Worker から presigned URL 取得 → R2 へ PUT → `{url, w, h, bytes, content_type}` を返す
- `M.photo` state: `{ state: 'none' | 'existing' | 'new', blob, meta, previewUrl, existingPhotos }`
- `onPhotoFileSelected(file)`: type/size validate → 圧縮 → `blob:` URL でプレビュー
- `clearPhotoInModal()`: `URL.revokeObjectURL` してから state リセット
- `ensurePhotoInputWired()`: 初回 open 時に file input の change ハンドラを 1 度だけ wire
- `fillModal()` / `readModal()` / `saveMemoFromModal()` / `closeMemo()` を上記 state に合わせて書き換え
- 既存 memo の photo は `state: 'existing'` で表示 (URL から直接 `<img src>`)、新規ファイル選択時は `state: 'new'` に遷移して保存時にアップロード

**noritetsu-map.html**:
- `<input type="url" id="m-photo">` を `<input type="file" id="m-photo-file">` + `📷 写真を選ぶ` ボタン + プレビュー img + `✕ 削除` ボタンに置換
- CSS 追加: `.m-photo-area / .m-photo-btn / .m-photo-preview / .m-photo-remove / .m-photo-status` (既存 modal の `--gold / --silver / --track / --track2` CSS 変数を踏襲、最大高 280px・object-fit:contain で写真の縦横比を保持)

### 動作確認

- `npx wrangler deploy` 成功: `Uploaded norireco-api (2.67 sec) / Deployed norireco-api triggers / api.norireco.app (custom domain)`
- `curl https://api.norireco.app/health` → 200 OK `{"ok":true,"service":"norireco-api","ts":...}` + CORS ヘッダー全部出力
- `Invoke-RestMethod /me with Bearer <Supabase JWT>` → uid (`ece72ecb-...`) + email + role: `authenticated` + exp が返る = JWKS 経由 ES256 verify が動作確認

### 残課題 (次セッション以降)

- 実機 (PC + iPhone PWA) でメモ写真の選択 → 圧縮 → アップロード → 保存 → マイページ・駅メモ一覧モーダルでの表示の通しテスト
- 複数枚対応 (現状は `photos[0]` のみ、配列なので 1 メモ 5 枚程度まで拡張可能)
- 写真の差し替え時に旧 R2 オブジェクトを delete する API (現状はゴミが残る)
- マイページの memo カードのサムネイル化 (現状はリンクのみ)
- OGP シェア機能の R2 永続化 + `/share/<id>` ページ (布石 #2 のもう一つの use case)

### コミット範囲

- `worker/` 新規 (5 ファイル)
- `js/16-memos.js` (写真アップロード 4 関数追加、既存 4 関数書き換え、`NORIRECO_API_BASE` constant 追加)
- `noritetsu-map.html` (memo-modal の photo input セクション全置換 + CSS 9 行追加)
- `sw.js` (CACHE_VERSION v255 → v256)

## 104. v255 — キャラモーダル内のキャラ切り替えが「閉じるだけ」だったのを修正 (2026-05-22)

### 背景

ユスケさん報告: 「キャラ詳細モーダルでキャラのサムネイルを押しても切り替えられない」

### 原因

`js/04-gps-location.js:pickStationCharacter` が以下の動作だった:

```js
function pickStationCharacter(stationName, charId) {
  setStationCharacterChoice(stationName, charId);
  closeCharModal();  // ← モーダルを閉じてしまう
  redrawAllLinesAfterTripChange();
}
```

サムネイルクリック → `setStationCharacterChoice` で localStorage に保存 → **`closeCharModal()` でモーダルが閉じる** → 地図再描画。

ユーザー視点だと「サムネイルを押すとモーダルが閉じるだけで、何が起きたのか分からない」 → 「切り替えられない」と感じる。

### 変更内容

`pickStationCharacter` を「モーダルを閉じず、新しいキャラで再 render する」に変更:

```js
function pickStationCharacter(stationName, charId) {
  setStationCharacterChoice(stationName, charId);
  redrawAllLinesAfterTripChange();
  const ms = (NORIRECO.data.MERGED_STATIONS || []).find(s => s.name === stationName);
  const character = (NORIRECO.data.stationCharMap?.get(stationName) || [])
    .find(c => c.meta?.id === charId);
  if (ms && character) {
    openCharModal(ms, character);
  }
}
```

これで:
1. localStorage に新しい choice 保存
2. 地図再描画 (背景の駅マーカーキャラアイコンも切り替わる)
3. モーダル内のヒーロー画像 / 名前 / アクティブ枠が新しいキャラで再描画 ← UX 改善

サムネイルを次々タップして比較できる体験になる。

### バージョン番号

v255 (Phase 3.8 後半 §104)

---

## 103. v254 — v253 駅アクションシートの 2 つのバグ修正 (2026-05-22)

### 背景

v253 push 後ユスケさん報告:
1. **「🎭 アール・プレーン 2.0 を見る」ボタンを押しても無反応**
2. **「駅のキャラ表示が OFF でもキャラの詳細を選べないと混乱する」** (= キャラモード OFF 時に「🎭 を見る」ボタンが出ない)

### 原因

#### バグ 1: `window.openCharModal` が存在しない

`js/08-rendering.js:856` の `openCharModal` は v225 stage 3 で `export function` に移行済で、window bridge が無い。`js/17-station-actions.js:onSaShowCharacter` で `typeof window.openCharModal === 'function'` の判定が常に false → silent fail (アラートも出ないので押しても何も起きないように見えた)。

#### バグ 2: キャラ判定が `charModeOn` を要求

`getStationCharacter()` / `getObtainableCharactersAt()` は `if (!NORIRECO.data.charModeOn) return null;` で早期 return する。v253 の判定はこの 2 関数だけに依存していたため、キャラモード OFF 時に駅にキャラがあっても `charForSheet = null` で「🎭」ボタンが出なかった。

### 変更内容

#### 1. 17 から `openCharModal` を直接 import

```js
import { openCharModal } from './08-rendering.js';
import { isCharacterOwned } from './03-characters.js';
```

`onSaShowCharacter` で `window.openCharModal` 経由ではなく `openCharModal(ms, ch)` を直接呼ぶ。08 → (window) → 17 → (import) → 08 は循環ではなく一方向 import なので OK。

#### 2. キャラ判定を `stationCharMap` ベースに変更

17 内に `pickCharacterForStation(stationName)` を新設。`NORIRECO.data.stationCharMap.get(stationName)` から駅に紐付くキャラ全件を取得 (charModeOn 関係なし) し、優先順位:
1. 獲得済み (`isCharacterOwned(c.meta.id)`)
2. 未獲得 (`locked = true` でモーダル表示、シーズン内/外問わず)

これでキャラモード OFF + シーズン外でも「🎭 ◯◯ を見る (未獲得)」ボタンが出るようになり、駅にキャラがあることをお客さんが発見できる。

#### 3. 08 側の判定を簡素化

`attachStationDotClickV2` 通常モード分岐から `getStationCharacter` / `getObtainableCharactersAt` の呼出を撤去 → `NORIRECO.stationActions.open(ms)` を ms だけ渡して呼ぶ (options 不要)。フォールバックの旧挙動 (17 未ロード時) はそのまま残置。

#### 4. CACHE_VERSION v253 → v254

### バージョン番号

v254 (Phase 3.8 後半 §103)

---

## 102. v253 — 駅タップで「アクションシート」(手動記録 / メモ / 色変更 / キャラ) (2026-05-22)

### 背景

v251 で駅タップ → 駅メモ一覧、v252 で駅 hover に「📸 メモ N 件」を実装した流れで、ユスケさん要望: 「マップ、駅をタップ、手動記録/メモ/色の変更と選択肢が出るようにしたい」

これは TODO「🟡 駅 UI の情報ハブ化 (4領域パネル)」の自分の記録・個人メモ・公的情報・周辺情報 の 4 領域パネル本格版への足がかり。まず「自分の記録」(=手動記録の起点) と「個人メモ」と既存の「🎨 色変更」を統一されたシート UI で駅から呼べるようにする。

### 設計

**通常モード**で駅マーカータップ → 「駅アクションシート」(`#station-action-modal`) を開く:
- 見出し: `🚉 駅名` + 乗り入れ系統名
- アクションボタン (動的に出し分け):
  - 🎭 **〇〇 を見る** — キャラ獲得済 or 未獲得 locked があれば (locked は「(未獲得)」サフィックス)
  - 📝 **ここから手動記録を始める** — 常時
  - 📸 **メモ (N件)** or **メモを残す** — N>0 なら青バッジ
  - 🎨 **系統色を変更** — 乗り入れ系統あり時のみ (複数なら「(N系統)」)
  - 閉じる

「🎨 系統色変更」で乗り入れ系統が複数なら、シート内が **系統選択リスト** に差し替わる (色スウォッチ付き)。「← 戻る」でアクション一覧に戻る。

**記録モード ON 中・メモモード ON 中** はアクションシートを開かない (= 経路選択 / メモ新規作成の操作を妨げない)。

### 変更内容

#### 1. `js/17-station-actions.js` (新規, ~190 行)

- `NORIRECO.stationActions` 名前空間: `state` (currentMs / currentChar / colorPickLines) + `open(ms, opts)`
- `openStationActionSheet(ms, {character, characterLocked})` — エントリポイント (08 から呼出)
- `renderActionList({ms, lines, memoCount})` — メイン画面のボタン群を組み立て
- `renderColorLineSelector(lines)` — 色変更の系統選択画面
- 各アクション handler: `onSaShowCharacter` / `onSaStartRecording` / `onSaOpenMemos` / `onSaChangeColor` / `onSaPickColorLine` / `onSaBackToMain`
- 既存 API を window 経由 (`NORIRECO.memos.openStationMemoList` / `NORIRECO.colorOverrides.openEditor` / `window.openCharModal`) で呼出。記録モード周り (`toggleRecordMode` / `onRecordStationClick`) のみ import (07-record-mode.js)
- 「📝 手動記録」: `toggleRecordMode()` で ON → 50ms 遅延 (記録モード DOM 更新待ち) → `onRecordStationClick(ms)` で 1 駅目に追加

#### 2. `js/08-rendering.js:attachStationDotClickV2` 通常モード分岐を全置換

- 旧: キャラあり → キャラモーダル直行 / 未獲得 → キャラモーダル / キャラなし & メモあり → 駅メモ一覧 (v251)
- 新: キャラ取得済 or 未獲得 locked obtainable[0] を判定して `openStationActionSheet(ms, {character, characterLocked})` 1 行に集約
- フォールバック: `NORIRECO.stationActions.open` が未ロードの極端ケースだけ旧キャラモーダル直行を残す (実質発生しない安全網)

#### 3. `noritetsu-map.html`

- `#station-action-modal` 新設 (`.memo-modal` / `.memo-sheet` を流用)
- CSS: `.sa-actions` / `.sa-section-label` / `.sa-btn` / `.sa-btn-ic` / `.sa-btn-tx` / `.sa-btn-arrow` / `.sa-btn-badge` / `.sa-btn-back` / `.sa-line-swatch`
- `<script type="module" src="js/17-station-actions.js">` を追加 (16 と 09 の間)

#### 4. SW + syntax-check

- `sw.js`: CACHE_VERSION v252 → v253 + STATIC_ASSETS に `./js/17-station-actions.js`
- `scripts/syntax-check.js`: FILES に `'17-station-actions'` 追加 (23/23 OK、escapeHtml 重複は module 化後の無害警告)

### 既存挙動への影響

- **キャラ駅**: タップ → 従来の「キャラモーダル直行」が、アクションシート経由「🎭 ◯◯ を見る」ボタンになる (= 1 hop 増えるが手動記録/メモ/色変更にも到達可能)
- **未獲得キャラ駅**: 同上 (locked プレビューも「(未獲得)」サフィックス付きでシート経由)
- **キャラなし & メモあり**: v251 では駅メモ一覧モーダル直行だったが、アクションシート経由「📸 メモ (N件)」になる
- **キャラなし & メモなし & 系統あり**: v251 まで何も起きなかったが、v253 ではアクションシートで「📝 手動記録」「🎨 色変更」が呼べる ← 新規体験

### バージョン番号

v253 (Phase 3.8 後半 §102)

---

## 101. v252 — 駅 hover ツールチップに「📸 メモ N 件」を追加 (2026-05-22)

### 背景

v251 で駅タップ → 駅メモ一覧モーダルを実装したが、「どの駅にメモがあるか」が地図上で見えない。ユスケさん要望: 「地図 hover で、メモ１件などできる？」

### 変更内容

`js/08-rendering.js:drawStationsLayer` 内の駅マーカー (ドット / パイチャート extraDot 両方) の `bindTooltip` 部分を改修。既存の tooltip (駅名 / 乗車 ✓ / 訪問回数 / キャラ / 乗り入れ系統) の末尾に、自分のメモがある駅では「📸 メモ N 件」(青) を追加。

```js
const buildMemoTag = () => {
  const cache = window.NORIRECO?.memos?.state?.cache || [];
  let count = 0;
  for (let i = 0; i < cache.length; i++) if (cache[i].station === ms.name) count++;
  return count > 0
    ? `<br><span style="color:#5fb5ff;font-size:10px;font-weight:700">📸 メモ ${count} 件</span>`
    : '';
};
const buildFullTooltip = () => `${tooltipBase}${buildMemoTag()}${linesText}`;
dot.bindTooltip(buildFullTooltip(), {...});
dot.on('tooltipopen', () => { dot.getTooltip()?.setContent(buildFullTooltip()); });
```

`tooltipopen` ハンドラで毎回 NORIRECO.memos キャッシュから件数を再計算 → 新規メモ作成/削除直後でも次の hover で件数が反映される (地図全体再描画なしで即時更新)。

PC ユーザーの hover 操作のみが対象 (モバイルでは hover が無いため見えないが、駅タップ → 駅メモ一覧モーダル v251 で代替済)。

### 注意点

- 同名駅は文字列完全一致なので両駅のメモがマージカウントされる (v251 と同じ既知制約)。
- パイチャート用の `extraDot` も同じ tooltip 更新ロジックを bind 済み。

### バージョン番号

v252 (Phase 3.8 後半 §101)

---

## 100. v251 — 駅タップで駅メモ一覧モーダルを表示 (2026-05-22)

### 背景

v250 で駅メモ機能本格化完了 (動作確認 OK)。ユスケさん要望: 「マップの駅をタップしたら、その駅のメモを見れるようにしてください」。

これは TODO「🟡 駅 UI の情報ハブ化（4領域パネル）」の **個人メモ部分の MVP**。完全な 4 領域パネル (自分の記録/公的情報/周辺情報/個人メモ) は将来として、まず「📸 個人メモ」だけ駅 UI から見られる導線を追加する。

### 設計

- **通常モード**で駅マーカータップ:
  - キャラ駅 → 従来通りキャラモーダル (既存挙動を保つ。優先度高)
  - キャラなし & 自分のメモあり → **「📸 〇〇駅のメモ (N 件)」モーダル**
  - キャラなし & メモなし → 何もしない (従来通り)
- **memoMode (📸 FAB on)** は従来通り直接新規作成モード
- 駅メモ一覧モーダルから:
  - 各メモを「✏️ 編集」「🗑 削除」(マイページタブと同じ memoCardHtml を再利用)
  - 「+ 新しいメモを残す」で memo-modal を新規作成モードで起動 (NORIRECO.map.clickInfo を組み立て直して `openMemo()`)

### 変更内容

#### 1. `js/16-memos.js` (追記)

- `M.stationContext` を state に追加 ({ station, lineId, lineName, lat, lon } | null)
- `openStationMemoList(args)`: `args.station === m.station` でフィルタした memo[] を一覧として `#station-memo-modal` に描画
- `closeStationMemoModal()`: モーダルを閉じて stationContext を null に
- `addNewMemoForStation()`: stationContext から NORIRECO.map.clickInfo を組み立てて閉じる → `openMemo()` で新規モーダル起動
- `rerenderStationMemoListIfVisible()`: 編集/削除後の再描画 (rerenderMemosIfVisible から呼ぶ)
- `NORIRECO.memos.openStationMemoList` / `hasMemosForStation(name)` を公開 (08-rendering から呼ぶため)
- window bridge: `closeStationMemoModal` / `addNewMemoForStation`

#### 2. `js/08-rendering.js` `attachStationDotClickV2` 通常モード分岐に追加

キャラ駅 (`getStationCharacter` / `getObtainableCharactersAt`) が優先で、両方とも該当しないときに `NORIRECO.memos.hasMemosForStation(ms.name)` が true なら `openStationMemoList(...)` を呼ぶ。代表系統は ms.lines[0] から SERVICE_LINES.find で取得。

#### 3. `noritetsu-map.html`

`station-memo-modal` を memo-modal の直前に新設 (CSS は memo-modal と同じ `.memo-modal` / `.memo-sheet` を流用、追加 CSS なし)。

#### 4. `sw.js`

CACHE_VERSION v250 → v251 (16-memos.js の中身が変わったので STATIC_ASSETS の登録ファイル名は不変)

### 注意点

- station 名一致は文字列完全一致 (memo.station vs ms.name)。merged_stations.json の駅名と memo 保存時の `ci.station.n` が一致しているはず (v250 のメモはこの規約で保存)
- 同名駅 (「大原」が外房線・上毛電鉄等で複数存在) は現状区別なし。将来 lineId も合わせた絞り込みが必要なら拡張

### バージョン番号

v251 (Phase 3.8 後半 §100)

---

## 99. v250 — 駅メモ機能の本格化 (Supabase CRUD + マイページ「📸 メモ」タブ) (2026-05-22)

### 背景

地図画面の右下「📸」FAB → memo-modal の正体が、v90 頃に作られた `js/08-rendering.js:genMemo()` で「📸駅メモデータ\n{JSON}\nこのデータをNotionの「駅メモ」DBに保存してください。」というテキストを生成して textarea に貼り付け、ユーザーが長押しコピー → Claude に貼り付けて Notion DB に転写するという超レガシー運用だった。Supabase には POST すらしておらず、写真URLも手入力テキスト。

(`noritetsu-log.html` 側にだけ `norireco_memos` への POST 実装があったが、log ページは削除予定なので無関係。)

ユスケさんとの設計合意 (2026-05-22):
- 既存メモは捨てて OK → スキーマ刷新可能
- log ページは触らない (削除予定のため別タスク)
- マイページに「📸 メモ」を 4 タブ目として追加 (統計 / 旅程 / 路線 / メモ)
- 一覧 / 詳細 / 編集 / 削除 すべて実装
- 種別 / 気分 / タグ のチップ設計は現状を踏襲

### スキーマ刷新 (`supabase/migrations/v250_norireco_memos.sql`)

旧 `norireco_memos` テーブルを `DROP` し、以下で再作成:

```sql
CREATE TABLE norireco_memos (
  id          text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  line_id text, line_name text, station text,
  lat double precision, lon double precision,
  memo_type text NOT NULL DEFAULT '駅',     -- 駅/車内/路線/その他
  mood      text NOT NULL DEFAULT '良い',   -- 最高/良い/普通/微妙/最悪
  tags      jsonb NOT NULL DEFAULT '[]',
  comment   text NOT NULL DEFAULT '',
  photos    jsonb NOT NULL DEFAULT '[]'    -- v251+ R2 連携で {key,w,h,mime,created_at} 配列を入れる箱
);
```

主な変更点:
- `user_id NOT NULL` + RLS (`auth.uid() = user_id`) を必須化 (旧テーブルは anon key Bearer で実質匿名書き込み、🔥 TODO「Supabase RLS 強化」の `norireco_memos` 分も同時完了)
- `tags` を text `'、'` join から `jsonb` 配列に
- `photos jsonb` を新設 (v251+ で R2 連携の箱として先取り)
- `updated_at` 自動更新トリガー `norireco_memos_touch_updated_at()`
- index 3 種: `(user_id, created_at DESC)` / `(user_id, line_id)` / `(user_id, station)`

### 変更内容

#### 1. `js/16-memos.js` (新規, ~400 行)

`NORIRECO.memos` 名前空間に集約:
- state: `cache[]` / `editingId` / `filter`
- CRUD: `syncMemosFromSupabase()` / `createMemoOnServer()` / `updateMemoOnServer()` / `deleteMemoOnServer()` (全て `authBearerToken()` で RLS 通過)
- Modal: `openMemo()` (新規) / `openMemoForEdit(id)` (編集) / `saveMemoFromModal()` / `deleteMemoFromModal()` / `closeMemo()` / `selChip()` / `togTag()`
- マイページ: `renderMpMemosSection()` + フィルタバー (路線 / 種別 / 気分) + memo カード生成
- `clearLocalMemos()` (ログアウト時の purge 用)
- `toggleMemoMode()` (右下「📸」FAB の cursor crosshair 切替)

#### 2. `js/08-rendering.js` から memo 関連を撤去

- `toggleMemoMode` / `openMemo` / `closeMemo` / `selChip` / `togTag` を削除 → 16 へ移動
- `genMemo` (Claude 貼り付け用テキスト生成) を完全廃止
- L803 の station マーカー click から `openMemo()` を呼ぶ箇所は `import { openMemo } from './16-memos.js'` に変更
- 関連 window bridge 5 件 (`window.toggleMemoMode` 等) を削除 → 16 で改めて公開

#### 3. `js/06-map-leaflet.js` / `js/07-record-mode.js` の import 切替

- 06: `import { openMemo } from './16-memos.js'` (旧 08 から)
- 07: `import { toggleMemoMode } from './16-memos.js'` (旧 08 から、記録モードとの排他に使用)

#### 4. memo-modal HTML 改修 (`noritetsu-map.html`)

- `<button class="btn-gen" onclick="genMemo()">📋 データを生成 → Claudeに貼り付け</button>` → `<button class="btn-save" id="m-save-btn" onclick="saveMemoFromModal()">☁️ 保存</button>` に置換
- `<button class="btn-del" id="m-delete-btn" onclick="deleteMemoFromModal()" style="display:none">🗑 このメモを削除</button>` を追加 (編集モード時のみ表示)
- `<div class="out-area">` (Claude 貼り付け用 textarea) を完全削除
- 写真URL input は残し、ラベルに「※ R2 アップロード対応は v251 以降」のヒントを追加
- 関連 CSS: `.btn-gen` / `.out-area` / `.out-hint` / `.out-ta` を撤去、`.btn-save` / `.btn-del` / `.fl-hint` を追加

#### 5. マイページ「📸 メモ」サブタブ追加

- `js/13-mypage-common.js` の `renderMypage()` 内サブタブ nav に `📸 メモ` ボタン追加
- `applyMpSection()` に `showMemos = MP.mpActiveSection === 'memos'` 分岐追加 + `NORIRECO.mypage.renderMpMemosSection()` 呼出
- `noritetsu-map.html` の `pane-mypage` に `<div class="mp-subpane" id="mp-sub-memos"><div class="pane-inner" id="mp-memo-section"></div></div>` を追加
- メモカード CSS (`.mp-memo-list` / `.mp-memo-card` / `.mp-memo-head` / `.mp-memo-comment` / `.mp-memo-tag` / `.mp-memo-photo` / `.mp-memo-actions`) を追加 (既存の `.mp-act-btn.edit-memo` / `.mp-act-btn.delete` を流用)

#### 6. SIGNED_IN sync + SIGNED_OUT clear (`js/12-auth.js`)

- v247 colorOverrides 同期と同じパターン: `window.NORIRECO?.memos?.sync?.()` / `window.NORIRECO?.memos?.clear?.()` を window 経由 (循環 import 回避)
- SIGNED_IN 時に Supabase から自分のメモを fetch、SIGNED_OUT 時に in-memory + localStorage を purge

#### 7. SW + syntax-check 更新

- `sw.js`: `CACHE_VERSION = 'v250'` + `STATIC_ASSETS` に `./js/16-memos.js` を追加
- `scripts/syntax-check.js`: FILES 配列に `'16-memos'` を追加 (22/22 OK)

### 残課題 (次フェーズ)

- **写真添付の R2 アップロード対応** (B(b) = 駅メモに写真添付): `photos jsonb` の箱は確保済み。布石 #2 (R2 + Workers) と統合実装予定
- **駅 UI からの直接編集導線**: 現状は「右下「📸」FAB → 地図クリック」が起点、駅マーカー長押し → 既存メモ一覧表示等は未実装
- **メモのソート切替**: 現状 created_at DESC 固定。気分・路線でソートできると振り返り UX 向上
- **🔥 TODO「Supabase RLS 強化」の `norireco_trips` / `norireco_character_grants` 分は引き続き残**

### バージョン番号

v250 (Phase 3.8 後半 §99)

---

## 98. v249 — GitHub Pages → Cloudflare Pages 移行 + 独自ドメイン `norireco.app` (2026-05-22)

### 背景

TODO.md 布石 #1「静的アセット: GitHub Pages → Cloudflare Pages 移行」を実行。発動条件は「今すぐ」(ユーザー数関係なし)、GitHub Pages の帯域 100GB/月ソフト上限を回避し、将来の R2/Workers 統合の前提を整える。Notion §インフラ戦略 Phase 1 ✅。

### 決定事項

| 項目 | 値 | 理由 |
|---|---|---|
| ドメイン | `norireco.app` | Cloudflare Registrar at-cost ($14.20/年)、HTTPS 必須 (HSTS preload) で標準安全、"app" がブランドと整合 |
| 配信 | Cloudflare Pages (`norireco.pages.dev` + custom domain) | 帯域無制限・無料、git push 自動デプロイ、グローバル CDN |
| DNS | Cloudflare (apex CNAME flattening で `@ → norireco.pages.dev`) | 同一アカウント内 Zone なので Pages バインドが自動 |
| GitHub Pages | 当面残してフォールバック | 既存ユーザーの SW/PWA install を即時破壊しない (Notion 戦略通り) |

### 変更内容

#### 1. `_headers` (新規)

Cloudflare Pages のヘッダー制御。SW が古いキャッシュで居座る事故を防ぐ。

```
/sw.js
  Cache-Control: public, max-age=0, must-revalidate

/manifest.json
  Cache-Control: public, max-age=300, must-revalidate

/*.html
  Cache-Control: public, max-age=0, must-revalidate
```

#### 2. `_redirects` (新規)

ルート `/` アクセスを地図画面へ (`index.html` がないため 404 回避 + 憲法「マップ中心」)。

```
/  /noritetsu-map.html  302
```

#### 3. `noritetsu-map.html` / `noritetsu-log.html` に OGP メタタグ追加

シェア時の SNS カード表示用。og:image は `https://norireco.app/icon-512.png` で絶対 URL。

```html
<meta property="og:title" content="乗レコ - 電車旅">
<meta property="og:description" content="全国鉄道の乗車記録・完乗率を可視化する PWA。乗り鉄のための YAMAP。">
<meta property="og:image" content="https://norireco.app/icon-512.png">
<meta property="og:url" content="https://norireco.app/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="乗レコ">
<meta name="twitter:card" content="summary_large_image">
```

#### 4. `js/14-share-ogp.js` の URL を `norireco.app` に変更

OGP 画像右上の URL 表記 (L236) と X intent の shareText (L316) を旧 `yutsutke.github.io/norireco` → 新 `norireco.app` に。

#### 5. 認証 redirect URL は無修正で OK

`js/12-auth.js:172` の `authCleanRedirectUrl()` は `window.location.origin + window.location.pathname` で動的生成 → 新ドメインで自動追従。Supabase Dashboard 側で `https://norireco.app/**` を Redirect URLs に追加する作業のみ必要 (このセッション中に実施)。Google OAuth Client にも `https://norireco.app` を Authorized JavaScript origins + redirect URIs に追加。

### Cloudflare 側作業 (ユスケさん実施)

1. Cloudflare アカウント作成 (yutsutke@yahoo.co.jp)
2. Cloudflare Registrar で `norireco.app` 取得 ($14.20/年, expires 2027-05-22)
3. Workers & Pages → Pages → Connect to Git → `yutsutke/norireco` 連携 (Framework preset: None, Build command: 空欄, Output: `/`)
4. Custom Domain → `norireco.app` 追加 → DNS 自動設定 + SSL 自動発行

### 動作確認 (v249 push 直前)

- `norireco.pages.dev/noritetsu-map.html`: 地図描画 / パイチャート / リージョン中央駅 / ボタン反応すべて OK
- ログイン: 許可 URL 追加前は失敗 (想定通り)

### 残課題

- 既存 GitHub Pages ユーザーへの誘導 (アナウンス・将来 301 redirect 検討)
- シェア機能の「シェア専用ページ `/share/<id>`」(布石 #2 R2 + Workers と合わせて)
- 布石 #2〜#6 (R2 / Workers ゲートウェイ / シャーディング / 認証抽象化 / 垢 BAN) は引き続き残

### バージョン番号

v249 (Phase 3.8 後半 §98)

---

## 97. v248 — HTML onclick の window bridge 漏れ修正 (toggleRecordMode 他) (2026-05-20)

### 背景

ユーザー報告: 📝 (rec-btn FAB) を押しても無反応で手動記録できない。v246 で polyline click を抑制したが直っていない。スクショで「以前の問題化. クリックもタップもできない」。

### 原因

v225 (ES Modules stage 3) で `window.toggleRecordMode` 等を「`export` 経由に移行」として削除したが、`noritetsu-map.html` の rec-btn FAB が `onclick="toggleRecordMode()"` というインライン HTML onclick 属性で呼び出していたのを見落としていた。

HTML の inline onclick はグローバル (window) スコープを参照するため、module 内の `export function` は見えない → ReferenceError で無反応。

監査スクリプトで全 inline onclick と window bridge を突き合わせた結果、3 関数が漏れていた:

```bash
$ grep -oE 'onclick="[a-zA-Z_$][a-zA-Z0-9_$]*' noritetsu-map.html | sed 's/onclick="//' | sort -u > onclicks
$ grep -oE 'window\.[a-zA-Z_$][a-zA-Z0-9_$]*' js/*.js | sed 's/.*window\.//' | sort -u > windows
$ comm -23 onclicks windows
→ closeRestoreModal
→ restoreFromJson
→ toggleRecordMode
```

(`if` / `this` は `onclick="if(event.target===this)..."` のパース誤検知)

### 変更内容

#### 1. `js/07-record-mode.js` 末尾 ([js/07-record-mode.js:1024](js/07-record-mode.js:1024))

```js
window.toggleRecordMode = toggleRecordMode;
window.onRecordStationClick = onRecordStationClick;  // 既存
```

#### 2. `js/05-supabase-data.js` 末尾 ([js/05-supabase-data.js:591](js/05-supabase-data.js:591))

```js
// v248: 復元モーダル onclick="closeRestoreModal()" / "restoreFromJson(...)"
window.closeRestoreModal = closeRestoreModal;
window.restoreFromJson = restoreFromJson;
```

#### 3. 検証

修正後の差分:
```bash
$ comm -23 onclicks windows
→ if    # 誤検知
→ this  # 誤検知
```

クリーン。

### 期間: v225 〜 v247 までずっと壊れていた

- **2026 年 1 月〜春**: ユーザーは GPS 記録 (📍) を主に使っていたため、📝 手動記録の不具合に気付かなかった可能性が高い
- **2026-05-20 セッション**: v245 で地図 polyline click を実装した際にユーザーが手動記録を試して発覚

### v243-v247 の polyline click 関連は無罪

v245 で path click が記録モードと干渉する別バグ (v246 で修正) があったが、今回の「📝 が押せない」は v245 のせいではなく v225 から潜在していた別問題。

### 落とし穴メモ (今回の教訓)

- **ES Modules 化で window bridge を撤去するときは、HTML inline onclick も grep で確認する**:
  ```bash
  grep -oE 'onclick="[a-zA-Z_$][a-zA-Z0-9_$]*' *.html | ... | comm -23 ... windows
  ```
- **これを CI に組み込むなら**: `scripts/syntax-check.js` に「HTML onclick で参照されているが window 公開されていない関数」検出を追加検討
- **v219→v220 で `IS_TOUCH` const bridge 漏れ → LINES 描画停止の前例**: 同じ轍を踏んだ。bridge 監査チェックリストに「HTML inline event handler」も追加

### バージョン番号

v248 (Phase 3.8 後半 §97)

---

## 96. v247 — 系統色カスタマイズの Supabase 同期 (デバイス間共有) (2026-05-20)

### 背景

v243 で系統色のユーザーカスタマイズを実装、TODO.md には「Supabase 同期 (別端末でも色設定が引き継がれるように)」が残課題として残っていた。ユーザー要望:

> 色の変更をディバイス間で共有したい。

### 設計判断

| 検討項目 | 採用 | 不採用との比較 |
|---|---|---|
| 保存先 | 専用テーブル `norireco_line_color_overrides` | `users.preferences` JSON: 1 行更新で全 override がコンフリクト |
| PK | `(user_id, line_id)` 複合 | 行単位の upsert/delete が綺麗、RLS が簡潔 |
| 書き込みタイミング | `set/reset/resetAll` 即時 (非同期 fire-and-forget) | 都度 push の方が同期遅延が無い |
| 読み込みタイミング | ログイン時 (SIGNED_IN/INITIAL_SESSION) に pull → localStorage に merge | 起動時毎回 fetch は冗長 |
| マージ規則 | **Supabase 優先** (リモートにある entry はリモート色で上書き、リモートに無い localStorage entry は Supabase に bulk push) | 「未ログインで色変えた → ログイン後に消えた」を防ぎつつ、別端末の最新を優先 |
| オフライン | Supabase 失敗時は localStorage のみ更新 (グレースフルデグラデーション) | UI は常に動く |
| ログアウト | localStorage purge + 全 SL を originalColor に戻す | v228-v229 のローカル purge 方針と整合 |

### 必要な SQL (ユーザー実行)

`supabase/migrations/v247_line_color_overrides.sql` に作成済み。Supabase Dashboard → SQL Editor で実行:

```sql
CREATE TABLE IF NOT EXISTS norireco_line_color_overrides (
  user_id    uuid       NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  line_id    text       NOT NULL,
  color      text       NOT NULL,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, line_id)
);

ALTER TABLE norireco_line_color_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "色 override は本人のみ読込可" ON norireco_line_color_overrides
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "色 override は本人のみ追加可" ON norireco_line_color_overrides
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "色 override は本人のみ更新可" ON norireco_line_color_overrides
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "色 override は本人のみ削除可" ON norireco_line_color_overrides
  FOR DELETE USING (auth.uid() = user_id);
```

⚠️ SQL を実行する前にコードがデプロイされても問題なし: 404/500 で localStorage のみの動作にフォールバック。

### 変更内容

#### 1. `js/15-color-overrides.js` に Supabase 同期 4 関数追加

- `pushToSupabase(slId, color)` — 単一行 upsert (POST + `Prefer: resolution=merge-duplicates`)
- `deleteFromSupabase(slId)` — 単一行 DELETE
- `deleteAllFromSupabase()` — `user_id=eq.{uid}` 全件 DELETE
- `syncColorOverridesFromSupabase()` (export) — 起動同期:
  1. Supabase から自分の override を pull
  2. localStorage 既存 entry のうちリモートに無いものを bulk upsert
  3. localStorage を `{...local, ...remote}` (Supabase 優先) で上書き
  4. SERVICE_LINES に再適用 + triggerReRender

`set/reset/resetAll` は同期版だが内部で `pushToSupabase` / `deleteFromSupabase` / `deleteAllFromSupabase` を fire-and-forget で呼ぶ。`await` していないので UI は即時反映、ネットワーク失敗してもユーザーには見えない。

#### 2. `js/12-auth.js` SIGNED_IN handler に sync 呼出 + ログアウト cleanup

```js
// SIGNED_IN / INITIAL_SESSION 時:
try { window.NORIRECO?.colorOverrides?.syncFromSupabase?.(); } catch(e) {}

// SIGNED_OUT 時 (clearLocalUserDataAfterSignOut 内):
try { localStorage.removeItem('norireco_line_color_overrides'); } catch(e) {}
try { window.NORIRECO?.colorOverrides?.resetAll?.(); } catch(e) {}
```

ログアウト時 `resetAll` は `deleteAllFromSupabase` も呼ぶが、`currentUserId()` が既に null なので Supabase 側は触らない (= 安全)。

#### 3. 循環 import 回避

`12-auth.js` → `15-color-overrides.js` の direct import を避けるため、`window.NORIRECO.colorOverrides.syncFromSupabase` 経由で呼出。15 → 12 は currentUserId/authBearerToken の import を追加 (循環なし、12 から見て 15 への依存は無いまま)。

### 落とし穴メモ

- **SQL 実行が前提**: 未実行のままだと Supabase 呼出が 404 を返す。コンソールに警告が出るが、localStorage で UI は動く (= 段階的デプロイ可能)
- **anon key で REST 直叩き**: RLS policy なしでテーブルを公開するのは脆弱なため、今回は最初から RLS を入れる。`v233` の残課題 (trip 等の RLS 強化) と同じパターン
- **未ログイン時の色変更**: localStorage のみ保存。ログイン後の syncFromSupabase で「リモートに無い entry を bulk push」するので吸い上げられる
- **fire-and-forget の失敗を握りつぶし**: pushToSupabase は console.warn のみで止まる。ユーザーに通知しない (UI は localStorage で動いているため)。将来「同期失敗が連続したらバッジ表示」等を入れる場合は別タスク

### バージョン番号

v247 (Phase 3.8 後半 §96)

---

## 95. v246 — 記録モード中の polyline click 抑制 + ESC で色モーダル閉じる (2026-05-20)

### 背景

v245 で path をクリック → 色変更モーダルを実装後、ユーザー報告:
> 📝 がおせない. 手動記録できない.

### 原因

v245 の `attachLineClick` が**全てのモード**で polyline click に反応していた。記録モード (📝 手動記録 / 📍 GPS 記録) 中に駅をタップしても、駅周辺を通る polyline の click ハンドラが先に発火 (もしくは同時発火) して色変更モーダルが開いてしまい、駅選択ができなかった。

メモモード (📸 駅メモ) でも同じ干渉が発生していたはず。

### 修正内容

#### 1. `attachLineClick` で記録モード・メモモード中は早期 return ([js/08-rendering.js:478](js/08-rendering.js:478))

```js
layer.on('click', (e) => {
  // 記録モード・メモモード中は色モーダルを開かない
  if (window.NORIRECO && NORIRECO.record && NORIRECO.record.mode) return;
  if (window.NORIRECO && NORIRECO.map && NORIRECO.map.memoMode) return;
  L.DomEvent.stopPropagation(e);
  if (window.NORIRECO?.colorOverrides?.openEditor) {
    NORIRECO.colorOverrides.openEditor(sl);
  }
});
```

#### 2. ESC キーで color modal を閉じる ([js/15-color-overrides.js:155](js/15-color-overrides.js:155))

脱出経路の保険として、ESC でモーダルを即閉じできるように。`openCharModal` 等の他モーダルと同じパターン。

```js
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const m = document.getElementById('line-color-modal');
    if (m && m.classList.contains('open')) closeLineColorModal();
  }
});
```

### 落とし穴メモ

- **モード check の順序**: stopPropagation より先に return。stopPropagation を呼んでしまうと、その後 sub-handler (例: 駅 click) も発火しなくなるため
- **記録モード判定**: `NORIRECO.record.mode` (07-record-mode.js の R.mode) が真実の source。GPS 記録 (`gps_button` トリガ) でも record.mode=true になるので一括カバー
- **将来同種のモード追加時**: 別の「マップを直接タップする」モードを足す場合は、ここに `if (...) return` を追加する設計負債を残している。長期的には「現在アクティブな map mode」を 1 つの enum で管理する方がきれいだが、今は最小修正

### バージョン番号

v246 (Phase 3.8 後半 §95)

---

## 94. v245 — 地図クリックで系統色を変更 (2026-05-20)

### 背景

v243 で系統色のユーザーカスタマイズ機能を実装したが、路線一覧タブまで遷移して該当系統を探すのが面倒。地図上で目に入った路線をそのままクリックして色変更できるとずっと自然。

### 仕様

1. **地図上の路線ポリラインをクリック** → 色変更モーダル展開
2. モーダルに表示: 系統名 / 運営会社 / 現在の色 (HEX) / color picker / (override 中なら元の色も)
3. color picker で色変更 → localStorage 保存 + 地図/駅マーカー/路線一覧/OGP に即時反映
4. override 中の系統には「↺ 元の色に戻す」ボタン表示
5. 「閉じる」or モーダル外をタップで閉じる

### 変更内容

#### 1. `js/15-color-overrides.js` に色変更モーダルを追加

- `openLineColorEditor(sl)` (export) — モーダルを表示し、`sl` の情報・現在色を反映
- `ensureLineColorModal()` — 初回呼出時に DOM 生成、event listener 登録
- `refreshModalDisplay(sl)` — 色変更直後にモーダル内表示・リセットボタン出し分けを更新
- `closeLineColorModal()` — モーダルを閉じる
- `window.NORIRECO.colorOverrides.openEditor` として公開 (08 から循環 import を避けるため)

モーダルは `share-ogp` と同じパターンで `<body>` に動的 append。既存 `.memo-modal` / `.memo-sheet` の CSS を流用。

#### 2. `js/08-rendering.js` に `attachLineClick(layer, sl)` helper 追加

```js
function attachLineClick(layer, sl) {
  if (!layer || !sl) return;
  layer._norireco_sl_id = sl.id;
  layer.on('click', (e) => {
    L.DomEvent.stopPropagation(e);
    if (window.NORIRECO && NORIRECO.colorOverrides && NORIRECO.colorOverrides.openEditor) {
      NORIRECO.colorOverrides.openEditor(sl);
    }
  });
}
```

各路線描画箇所で全 polyline (glow / main / bg / hover) に attach:
- `drawServiceLineBase` 内: 未乗車の glow + main、デスクトップ用 hover、乗車済の bg、デスクトップ用 hover
- `drawSlRiddenRun`: glow + main (乗車済区間)
- `drawSlRiddenWrap`: glow + main (循環線の折返し区間)

`stopPropagation` で Leaflet の map クリックを抑制 (背景地図のクリックで何か起きるのを防ぐ)。

#### 3. ロードコンテキスト

15-color-overrides が drawLines を import している (循環依存避け) ため、08-rendering 側からは `window.NORIRECO.colorOverrides.openEditor` で参照する。

### UX 上の注意

- **重なる路線**: 駅密集地で複数路線が同じ座標に走る場合、Leaflet は重なり順 (z-index) で最前面のものを優先発火。priority 順 (新幹線=0 → 地方=4) で描かれているので、新幹線が最上層になりがち。次のクリックで別系統が反応することもある (回避不能、想定内)
- **モバイル**: tap target は polyline weight に依存。glow (weight 10) があるので 10px は確保
- **transparent hover**: `opacity:0` でも Leaflet polyline はデフォルトで interactive=true、click は発火する

### 落とし穴メモ

- **循環 import 回避**: 15 → 08 は import あり (drawLines 用)。08 → 15 はやりたくないので window 経由で openEditor を呼ぶ
- **モーダル内の color picker**: change イベントは値確定時のみ。input イベント (ドラッグ中) は使わない (drawLines 連発回避)
- **stopPropagation の必要性**: 将来「マップ クリックで現在地検索」等を追加した場合、polyline クリックがバブルすると誤発火する。今はそのような handler は無いが防衛的

### バージョン番号

v245 (Phase 3.8 後半 §94)

---

## 93. v244 — 駅マーカーも色 override に追従 (2026-05-20)

### 背景

v243 で系統色をユーザーカスタマイズできるようにしたが、ユーザー報告:
> 路線の色しかかわらないね

路線ポリラインの色は変わるのに、**駅マーカー (ドット・パイチャート) の色は古いまま**だった。

### 原因

`merged_stations.json` の各駅 entry に `colors: [#RRGGBB, ...]` という**事前計算キャッシュ**が含まれていて、`drawStationsLayer` がそれを優先して読んでいた:

```js
// 旧 (v243 まで):
const colors = ms.colors && ms.colors.length === nLines ? ms.colors : ms.lines.map(...);
```

`ms.colors` は Python 等のビルドスクリプトで `service_lines_master.json` の color を事前焼き込みしたもの。実行時に `sl.color` を override してもキャッシュは古いまま。

### 修正内容

#### 1. `drawStationsLayer` 冒頭で `Map<lineId, color>` 構築 ([js/08-rendering.js:584](js/08-rendering.js:584))

```js
const _slColorById = new Map();
for (const sl of NORIRECO.data.SERVICE_LINES) _slColorById.set(sl.id, sl.color);
```

633 系統 × 1 回 = O(633) の初期化。駅ループ内では `_slColorById.get(lid)` の O(1) ルックアップ。

#### 2. 駅マーカー色取得を Map 経由に ([js/08-rendering.js:639](js/08-rendering.js:639))

```js
// 旧: ms.colors キャッシュ優先
// 新: 常に SERVICE_LINES から動的取得
const colors = ms.lines.map(lid => _slColorById.get(lid) || '#888');
```

#### 3. キャラモーダルの系統リスト色も修正 ([js/08-rendering.js:810](js/08-rendering.js:810))

```js
// 旧: const color = (ms.colors && ms.colors[idx]) || (sl && sl.color) || '#888';
// 新: const color = (sl && sl.color) || '#888';
```

`ms.colors` の参照を廃止。`sl.color` 1 本に統一。

### 影響範囲

色 override が即時反映されるようになった箇所:
- 駅ドット (単色 circleMarker / divIcon)
- 駅パイチャート (多系統駅の扇形分割)
- キャラモーダル内の乗り入れ系統リスト
- 既に v243 で動いていた: 路線ポリライン、路線一覧プログレスバー、OGP 画像

### パフォーマンス

`Map` 構築は `drawStationsLayer` 呼出時に 1 度だけ。
旧コードは 9017 駅 × 平均 5 系統 × `Array.find` (O(633)) = **28M 比較** 相当だったが、新コードは Map 初期化 633 + ルックアップ 45085 = **45K アクセス** に。むしろ高速化。

### 落とし穴メモ

- **`merged_stations.json` の `colors` 列は dead column 化**: ビルドスクリプトで再生成不要 (元 colors は無視されるため)。将来的に新ビルド時に `colors` 列を出さない選択肢もあるが、ファイルサイズ削減効果は小さい (1.8MB → 1.5MB 程度予想) ので緊急性なし
- **`_slColorById` がスナップショット**: drawStationsLayer 内で構築するため、その関数の実行中は固定。色変更すると triggerReRender が drawStationsLayer を呼び直すので問題なし

### バージョン番号

v244 (Phase 3.8 後半 §93)

---

## 92. v243 — 系統色のユーザーカスタマイズ機能 (2026-05-20)

### 背景

TODO.md 🟡 体験向上 の長期積み残し「系統の色をユーザーカスタマイズ可能に」を実装。

> マップ上の系統色と、ユーザー（特にマニア）が想起する色が乖離するとイワカン。
> 系統ごとに color override を localStorage / Supabase に保存。

### 仕様

1. **路線一覧タブ (📋 路線)** の各系統カード左に `<input type="color">` を配置 (旧 lc-dot 置換)
2. **change** で `NORIRECO.colorOverrides.set(slId, color)` → localStorage 保存 + 全関連箇所を即時再描画
3. override 中の系統は `↺ 色をリセット` ボタン表示 → 元色に戻せる
4. 起動時に localStorage から色を読み込んで地図描画に反映 (リロード後もカスタム色維持)
5. データは端末 localStorage のみ (Supabase 同期は次フェーズ)

### 変更内容

#### 1. `js/15-color-overrides.js` 新規作成 (107 行)

ES Module。`NORIRECO.colorOverrides` に以下を公開:
- `get()` — localStorage の override 全件
- `set(slId, color)` — 単一系統を override + 保存 + 再描画
- `reset(slId)` — 単一系統を元色に戻す
- `resetAll()` — 全系統リセット
- `applyAfterBuild()` — 02b.build() 後の一括適用 (現状 02b 側で直接読んでいるので未使用、将来用に残置)

再描画は `drawLines()` + `updateOverlays()` + `renderList()` をまとめて呼ぶ `triggerReRender()` で集約。`setDateFilter` と同じパターンで `allLayers` / `dotLayerRef` / `labelLayerRef` をクリアしてから redraw。

```js
const STORAGE_KEY = 'norireco_line_color_overrides';
// localStorage: { "auto_東海道線_東日本旅客鉄道": "#FF0000", ... }
```

#### 2. `js/02b-service-lines-builder.js` build() 末尾に override 適用

```js
NORIRECO.data.serviceLinesBuilt = true;
console.log(`[乗レコ] NORIRECO.data.SERVICE_LINES built: ${NORIRECO.data.SERVICE_LINES.length} 系統`);

// v243: 起動時に override 適用、sl.originalColor を退避
try {
  const overrides = JSON.parse(localStorage.getItem('norireco_line_color_overrides') || '{}');
  for (const sl of NORIRECO.data.SERVICE_LINES) {
    if (sl.originalColor == null) sl.originalColor = sl.color;
    if (overrides[sl.id]) sl.color = overrides[sl.id];
  }
} catch (e) {}
```

15-color-overrides に依存させない (循環 import 回避)。同じ STORAGE_KEY を直読み。

#### 3. `js/09-tabs-stats.js` renderList に color picker + reset ボタン

`<div class="lc-dot">` を `<input type="color" class="lc-color">` に置換。  
override 中なら下段に `<button class="lc-color-reset">↺ 色をリセット</button>` を表示。  
change / click イベントは `NORIRECO.colorOverrides.set/reset` 呼び出し。

#### 4. CSS in noritetsu-map.html ([line 985](noritetsu-map.html:985))

```css
.lc-color { width:18px; height:18px; border-radius:50%; border:1.5px solid var(--track); cursor:pointer; ... }
.lc-color::-webkit-color-swatch{ border:none; border-radius:50%; }
.lc-color:hover { transform:scale(1.15); }
.lc-color-reset { font-size:9px; background:rgba(255,255,255,.08); ... }
```

`-webkit-color-swatch` / `-moz-color-swatch` で input[type=color] の内側スウォッチを丸く整形。  

#### 5. ロード順 / アセット登録

- `noritetsu-map.html`: `<script type="module" src="js/15-color-overrides.js">` を 14-share-ogp の後に追加
- `sw.js`: CACHE_VERSION v242 → v243、STATIC_ASSETS に追加
- `scripts/syntax-check.js` FILES に追加 (21/21 OK)

### 反映される箇所

色を変えると即時に反映:
- 地図上の路線ポリライン (`drawLines()`)
- 駅マーカー / パイチャート (`drawStationsLayer()` 経由)
- 路線一覧タブの色ドット / プログレスバー / % 表示
- ヘッダ完乗率 (色変更で数字は変わらないが、関連 DOM 更新の副作用)
- OGP 画像生成 (`buildSegmentPolylines()` も `sl.color` を参照)

### 落とし穴メモ

- **再描画コスト**: drawLines は約 633 系統 + パイチャート再構築でやや重い。change イベント (確定時のみ発火) を使い、input イベント (ドラッグ中) では再描画しない方針
- **`#888` フォールバック**: service_lines_master.json に color 未定義の系統は `#888` (グレー)。override で色付け可能
- **Supabase 同期未対応**: 別端末では色設定が共有されない。Phase 2 で `users.preferences` JSON か別テーブルで同期検討
- **OGP のキャッシュ**: シェア画像生成時の色は実行時の `sl.color` を見るのでカスタム色がそのまま出る。意図通り
- **input[type=color] の制約**: HEX のみ (透明度 alpha なし)。RGBA で半透明色をつけたい場合は別 UI (例: tinycolor.js + slider) が必要だが、当面は HEX で十分

### バージョン番号

v243 (Phase 3.8 後半 §92)

---

## 91. v242 — 同名駅の誤マッチ修正 (REGION_CENTER の緯度経度判定化) (2026-05-20)

### 背景

v241 でリリースした「リージョン中央駅 10 駅を tier 7 で常時表示」機能で、**石川県の高松駅 (北陸鉄道) が金沢の隣にも tier 7 として表示**されていたとユーザー報告。

### 原因

`REGION_CENTER_STATIONS` を `Set('高松', ...)` で持っていたため、名前だけで判定 → 同名駅 (北陸鉄道高松駅) も誤マッチしていた。

### 修正内容

`REGION_CENTER_STATIONS` を `Set` → `Map(name → {lat, lon})` に変更し、緯度経度の近接判定を追加 ([js/08-rendering.js:202-232](js/08-rendering.js:202)):

```js
const REGION_CENTER_STATIONS = new Map([
  ['札幌',   { lat: 43.07, lon: 141.35 }],
  ['仙台',   { lat: 38.26, lon: 140.88 }],
  ['東京',   { lat: 35.68, lon: 139.77 }],
  ['新宿',   { lat: 35.69, lon: 139.70 }],
  ['金沢',   { lat: 36.58, lon: 136.65 }],
  ['名古屋', { lat: 35.17, lon: 136.88 }],
  ['大阪',   { lat: 34.70, lon: 135.50 }],
  ['広島',   { lat: 34.40, lon: 132.48 }],
  ['高松',   { lat: 34.35, lon: 134.05 }],  // ← JR高松駅、北陸鉄道高松駅(36.83, 136.74)は弾かれる
  ['博多',   { lat: 33.59, lon: 130.42 }],
]);

function isRegionCenter(name, lat, lon) {
  const c = REGION_CENTER_STATIONS.get(name);
  if (!c || lat == null || lon == null) return false;
  return Math.abs(lat - c.lat) < 0.5 && Math.abs(lon - c.lon) < 0.5;  // 約 50km 圏内
}

function stationTier(nLines, name, lat, lon) { // ← 引数追加
  if (name && isRegionCenter(name, lat, lon)) return 7;
  ...
}
```

callsite ([js/08-rendering.js:574](js/08-rendering.js:574)):
```js
const baseTier = stationTier(nLines, ms.name, ms.lat, ms.lon);
```

### トレランス選定

`0.5 度 ≈ 50km` は:
- canonical 座標と実駅座標 (MERGED_STATIONS の緯度経度) のズレ吸収には十分
- 同一都市内の駅でも問題なくマッチ
- 異なる都道府県の同名駅 (例: 北陸高松駅 36.83N vs 香川高松駅 34.35N、緯度差 2.48 度 ≈ 250km) は確実に弾ける

### 落とし穴メモ

- **SUPER_MEGA_STATIONS は据置**: 「東京」「博多」等の SUPER_MEGA 7 駅は同名駅の存在可能性が低い (北陸博多駅とかは無い) ため Set のまま維持。将来同名衝突が報告されたら同じパターンに移行
- **canonical 座標**: Wikipedia から拾った主要 JR 駅の中心座標。MERGED_STATIONS 側の駅座標 (国土地理院数値地図) と数百メートルズレがあり得るので、トレランスは余裕を持って 50km にしている

### バージョン番号

v242 (Phase 3.8 後半 §91)

---

## 90. v241 — 9 地域の中央駅 10 駅を tier 7 で日本全国ビューから表示 (2026-05-20)

### 背景

日本全国ビュー (z=4-5) で地図に路線は見えるが駅マーカーは何も出ていない (現状は z >= 5 で tier 6 = 三大都市中心 7 駅から表示)。「あの地域、自分はどこ訪問してたっけ?」を一目で把握しづらかった。

ユーザー指定の 9 地域 × 1〜2 駅 = 計 10 駅を、SUPER_MEGA より一段上の "tier 7" として日本全国ビューから常時表示する。

| 地域 | 中央駅 |
|---|---|
| 北海道 | 札幌 |
| 東北 | 仙台 |
| 関東 | 東京、新宿 |
| 北陸 | 金沢 |
| 東海 | 名古屋 |
| 近畿 | 大阪 |
| 中国 | 広島 |
| 四国 | 高松 |
| 九州 | 博多 |

### 変更内容

すべて [js/08-rendering.js](js/08-rendering.js) 内:

#### 1. `REGION_CENTER_STATIONS` 定数追加 (新規 Set)

```js
const REGION_CENTER_STATIONS = new Set([
  '札幌', '仙台',
  '東京', '新宿',
  '金沢', '名古屋',
  '大阪', '広島',
  '高松', '博多',
]);
```

既存 `SUPER_MEGA_STATIONS` (東京・名古屋・新大阪・札幌・仙台・博多・広島) と一部重複するが、`stationTier` が REGION_CENTER を先にチェックして tier 7 を返すため両建てで問題なし。`新大阪` は引き続き tier 6 (SUPER_MEGA)、`大阪` が tier 7 (REGION_CENTER) と独立。

#### 2. `stationTier()` に tier 7 を追加

```js
function stationTier(nLines, name) {
  if (name && REGION_CENTER_STATIONS.has(name)) return 7;  // ← 新規
  if (name && SUPER_MEGA_STATIONS.has(name)) return 6;
  ...
}
```

#### 3. 密集 penalty バイパス (tier 7 の特例)

```js
// 旧: const tier = Math.min(6, baseTier + isolationBonus);
const tier = (baseTier === 7) ? 7 : Math.min(6, baseTier + isolationBonus);
```

東京・新宿・大阪等は `nearest_km < 0.5` で `isolationBonus = -4` が乗るが、これを適用すると tier=3 になり日本全国ビューから消えてしまう。REGION_CENTER は密集 penalty を回避して常に tier 7。

#### 4. `getDotMinTier(z)` に z>=4 → 7 を追加

```js
if (z >= 5)  return 6;
if (z >= 4)  return 7; // 日本全国ビューでは REGION_CENTER のみ
return 99;
```

z=4 (PC では日本全国フィット) で 10 駅のドット、z=5 で SUPER_MEGA も含む 17 駅、と段階的に増える。ラベルは `getLabelMinTier(z) = getDotMinTier(z-1)` なので z=5 で REGION_CENTER のラベル表示。

#### 5. レイヤー追加/削除の閾値を `<= 7` に拡張

`drawStationsLayer` の zoom 切替判定 `if (dotMin <= 6)` / `if (labelMin <= 6)` を `<= 7` に。これがないと REGION_CENTER 専用ズーム (z=4) でレイヤー自体が removed されて何も出ない。

### 視覚的に変わること

- z=4 (日本全国ビュー): 10 駅のドットが見える → 「あの地域の中央駅にだけ訪問あり/なし」が分かる
- z=5: 旧来 7 駅 + 新 4 駅 (新宿・金沢・大阪・高松) のドット + ラベル
- z=6 以降: 従来通り (4-6 系統駅・通常駅が段階的に追加)

### 落とし穴メモ

- **新大阪 vs 大阪**: 別 tier。地理的に近接するが用途が違う (新幹線 vs 在来線ハブ)。両方表示でも視覚的に混乱しない (z=5 では両方出るが z=4 では大阪のみ)
- **東京駅の特例**: 既に SUPER_MEGA (tier 6) だったが REGION_CENTER 入り (tier 7) で密集 penalty が完全に外れる。旧仕様では z=5 で tier 6 → isolationBonus -4 で実効 tier 2 → z=9 でしか見えなかった可能性。今は z=4 から確実に出る
- **将来拡張**: 沖縄 (那覇) を含めたい場合は `REGION_CENTER_STATIONS` に追加するだけで済む。当面ノリレコは沖縄路線非対応なのでスキップ
- **データ駆動化**: 当面は JS にハードコード (10 駅は年単位で変わらない)。将来「リージョン別完乗率」「リージョンバッジ」等に展開する場合は `region_centers.json` に外出ししてユーザー提供の `regions[].main_stations[].features` も活用できる

### バージョン番号

v241 (Phase 3.8 後半 §90)

---

## 89. v240 — マイページ「公式」表記を「GPS 記録」に統一 (2026-05-20)

### 背景

マイページに「公式完乗率」「🟢 公式」「(公式)」「公式 (verified) 旅程」等が複数箇所に散らばっており、v175 で統一した記録モード用語 (📝 手動記録 / 📍 GPS 記録) と整合していなかった。「公式って何？」というユーザー混乱の原因。

### 変更内容

`公式` → `GPS 記録` への一括リネーム (UI 文言・コメント横断):

| Before | After |
|---|---|
| 🟢 公式完乗率 | 🟢 GPS 記録 完乗率 |
| 🟢 公式 (詳細パネル内) | 🟢 GPS 記録 |
| 運営会社別 完乗率 (公式) | 運営会社別 完乗率 (GPS 記録) |
| 地域別 完乗率 (公式) | 地域別 完乗率 (GPS 記録) |
| よく乗る路線 (公式 Top 10) | よく乗る路線 (GPS 記録 Top 10) |
| よく訪れる駅 (公式 Top 10) | よく訪れる駅 (GPS 記録 Top 10) |
| 都道府県別 訪問駅数 (公式) | 都道府県別 訪問駅数 (GPS 記録) |
| `公式 (verified) 旅程` | `GPS 記録 (verified) 旅程` |
| ヘッダ tooltip「GPS 認証のみの公式完乗率」 | 「GPS 記録のみの完乗率」 |
| 未ログイン CTA「あなたの旅程・公式完乗率・GPS 後追い」 | 「あなたの旅程・GPS 記録 完乗率・GPS 後追い」 |

### 対象ファイル

- [js/13a-stats.js](js/13a-stats.js) (11 箇所)
- [js/13-mypage-common.js](js/13-mypage-common.js) (1 箇所)
- [noritetsu-map.html](noritetsu-map.html) (1 箇所、ヘッダ tooltip)

### 触らなかった箇所

- `CHANGELOG.md` / `TODO.md` / CHANGELOG アーカイブ群: 過去ログなので歴史的記録としてそのまま
- `TODO.md:278` の「公式オープンデータ活用」は政府公式データの意で別文脈、置換せず

### バージョン番号

v240 (Phase 3.8 後半 §89)

---

## 88. v239 — ヘッダ/マップオーバーレイの系統数オーバーカウント修正 (2026-05-20)

### 背景

v238 で `updateOverlays()` を常時呼ぶよう修正したが、依然として「全期間」状態で
- 地図オーバーレイ: 完乗率 **8%** / 乗車系統 **81** / 完乗系統 **25**
- マイページ全記録: 完乗率 **4%** / 系統 **34** / 完乗 **9**

と数字が大きく乖離していた。

### 原因

`slRiddenSt` (`js/04b-ride-record.js:300-316` の `rebuild()` で構築) が 2 段階の **過剰バラまき**ロジックになっていた:

1. RIDDEN_SEGS → N02 路線解決 → `riddenSt[N02_line_id]` (駅名 Set) ※新形式・旧形式・3 段 fallback
2. 各 SERVICE_LINE で `candidateN02Ids` (複数候補) を全部見て駅名一致 → `slRiddenSt[sl.id]` に書く

結果: 「東京駅で山手線として乗った」と記録すると、東京駅を含む**全 SERVICE_LINE** (京浜東北線・東海道線・中央線等) の `slRiddenSt` にも書かれ、ヘッダの乗車系統数が膨らんでいた。

一方マイページの `collect()` は `seg.lineId === sl.id` の**直接 match** なので、明示的に記録した系統だけカウント (= 正しい数字)。

### 修正内容

`js/02b-service-lines-builder.js:160-205` の `globalStats()` を、マイページ `collect()` と同じ「直接 lineId match + LEGACY fallback」ロジックに置換:

```js
function globalStats() {
  const SL = NORIRECO.data.SERVICE_LINES;
  const segs = window.RIDDEN_SEGS || [];
  ...
  for (const seg of segs) {
    // 1. SERVICE_LINE.id への直接 match (新形式 trip)
    let sl = SL.find(l => l.id === seg.lineId);
    // 2. LEGACY fallback: trip データに N02 路線 id が残っているケース
    //    candidateN02Ids に含む 最初の 1 系統だけ採用 (バラまかない)
    if (!sl) sl = SL.find(l => (l.candidateN02Ids || []).includes(seg.lineId));
    if (!sl) continue;
    ...
  }
  ...
}
```

`slRiddenSt` 自体は地図描画 (駅 UI 個人化・パイチャート・凡例) で使われているため、構造は touch せず温存。`globalStats()` の数字だけがマイページと整合するようになる。

### 影響範囲

- ヘッダ `h-pct` / `h-ln`: マイページ全記録と一致 (`updateOverlays` 経由)
- マップオーバーレイ `ms-pct` / `ms-ln` / `ms-dn`: 同上
- `stats(sl)` (個別 SERVICE_LINE 単位): 触らない (slRiddenSt の Set サイズを返す既存挙動)
- マイページの数字: 変化なし (元から正しい数字を出していた)
- 地図描画の駅 UI / パイチャート: 変化なし (slRiddenSt そのものは温存)

### 落とし穴メモ

- `globalStats()` は `updateOverlays()` 経由で頻繁に呼ばれる。RIDDEN_SEGS のスキャンは O(segs × SERVICE_LINES) で線形だが、一般ユーザーの segs は <1万、SERVICE_LINES は ~633 なので問題なし。100万 trip 規模になったら memo 化を検討
- LEGACY fallback の「最初の 1 系統だけ採用」は若干アービトラリ。例えば横須賀線・湘南新宿ライン両方の candidateN02Ids に同じ N02 id があると、SERVICE_LINES 配列の登録順で決まる。実用上は問題なし
- 個別 SERVICE_LINE 単位の `stats(sl)` だけは未だ `slRiddenSt` を参照するため、地図凡例の系統別完乗率はまだオーバーカウントしうる。これは別タスク (もしユーザー報告があれば対応)

### バージョン番号

v239 (Phase 3.8 後半 §88)

---

## 87. v238 — ヘッダ完乗率とマイページ完乗率の数字ズレ修正 (2026-05-20)

### 背景

ユーザー報告: 「今年のみ表示中」状態で
- ヘッダ右上: **8%** / 79 系統
- マイページ全記録: **4%** / 32 系統 (完乗 9)

同じ「全記録」を見ているはずなのに 2 倍の差が出ていた。

### 原因 (2 つ)

#### A. `applyDateFilter` で localStorage を user_id フィルタなしで読んでいた

`js/05-supabase-data.js:232-243`
```js
let trips = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
// ↑ 過去ログインの他ユーザー trip や user_id 未設定の古い trip も全部読む
```

マイページは Supabase 側で `user_id=eq.{uid}` フィルタしているが、ヘッダ計算は localStorage を生で読むので localStorage に他ユーザー trip が混ざっていると数字が膨らむ。`syncFromSupabase` が走れば overwrite で綺麗になるが、起動直後やキャッシュ状態次第で残留することがある。

#### B. `updateOverlays()` が map 初期化条件下でしか呼ばれていなかった (主犯)

`js/05-supabase-data.js:248-255` (修正前):
```js
if (NORIRECO.map.instance && typeof dotLayerRef !== 'undefined' && dotLayerRef) {
  ...
  drawLines();
  updateOverlays();  ← この if の中
}
```

`updateOverlays()` は `h-pct` / `h-ln` / `ms-pct` などの DOM テキストを書き換えるだけで Leaflet 依存はない。にもかかわらず map 再描画ブロック内にあるため、マイページタブ滞在中に期間フィルタを変更すると `slRiddenSt` は更新されるがヘッダの数字は古い値に固定される。これが「ヘッダ 8% (全期間ベース) vs マイページ 4% (今年ベース)」の主因。

### 修正内容

#### 1. `applyDateFilter` に user_id フィルタ追加 ([js/05-supabase-data.js:232](js/05-supabase-data.js:232))

```js
function filterTripsByCurrentUser(trips) {
  const uid = currentUserId();
  if (!uid) return trips; // 未ログイン: localStorage の全件 (ガイド用)
  return trips.filter(t => !t.user_id || t.user_id === uid);
}
```

`!t.user_id` を許容するのは、ログイン前に作成された自分の trip (user_id 未設定) を排除しないため。他ユーザーの trip は `t.user_id === uid` で確実に弾く。

#### 2. `loadRiddenSegsFromStorage` で user_id 未設定 trip を除外 ([js/05-supabase-data.js:425](js/05-supabase-data.js:425))

起動時は `currentUserId()` がまだ未確定なので、確実に anonymous/遺物と判別できる `user_id === null/undefined` だけを排除。

#### 3. `updateOverlays()` を map 再描画ブロックから出して常に呼ぶ ([js/05-supabase-data.js:248](js/05-supabase-data.js:248))

```js
// 修正後:
try { updateOverlays(); } catch(e) {}
if (NORIRECO.map.instance && dotLayerRef) {
  ... // 地図再描画 (map.instance がある場合のみ)
  drawLines();
}
```

`syncFromSupabase` も同様に修正 ([js/05-supabase-data.js:408](js/05-supabase-data.js:408))。

### バージョン番号

v238 (Phase 3.8 後半 §87)

### 落とし穴メモ

- `updateOverlays` を unconditional に呼ぶときは `try/catch` 必須 (DOM 要素 `h-pct` が未生成な瞬間がありうる)
- user_id フィルタは `!t.user_id || t.user_id === uid` の OR 条件。`!t.user_id` を許容しないと、Magic Link 認証完了前に手動記録した trip が消える
- ヘッダ計算とマイページ計算は将来的に同じ関数ベースに統一すべき (今は片方が `globalStats() → slRiddenSt`、もう片方が `collect() → trip.segments` で経路が違う)。とはいえ slRiddenSt は地図描画にも使われるため、無理に統一すると影響範囲が広い

---

## 86. v237 — OGP 日本地図を Natural Earth ベース 47 都道府県境界に置換 (2026-05-20)

### 背景

v236 で実装した OGP 画像生成の日本地図シルエットが「45 頂点の 4 島ポリゴン (本州・北海道・九州・四国)」だったため、本州が自己交差して塗りつぶしが破綻していた (ユーザー報告のスクショで明白)。

業界の解法を調査:
- Strava: Mapbox Static API (商用、月 5 万 req 無料)
- 駅メモ! / 鉄レコ: 自前の簡略化 GeoJSON
- 乗りつぶしオンライン: 都道府県別 SVG パス
- StationGraph: OpenStreetMap タイル

乗レコのプロダクト不変原則 (外部依存最小化、無料配信維持) と布石ポリシー (ベンダーロックイン回避) を考慮し、**自前 GeoJSON 埋め込み** (Option A) を採用。

### 変更内容

#### 1. `scripts/build-japan-geo.js` 新規作成 (118 行)

- `dataofjapan/land/japan.geojson` (12.7MB, 47 都道府県境界, public domain) を fetch
- 自前実装の **Douglas-Peucker (RDP)** で簡略化 (tolerance 0.02 deg ≈ 2km)
- 8km 未満の小島は捨てる (OGP 1200×630 では点にもならない)
- [lon,lat] → [lat,lon] に並べ替え + 小数 3 桁に丸めて出力
- 出力: 80,370 → 3,482 points (4.3%)、ファイル 12.7MB → **59KB** (200倍圧縮)

```bash
node scripts/build-japan-geo.js
# → js/share-japan-geo.js (59KB) を生成
```

#### 2. `js/share-japan-geo.js` AUTO-GENERATED (59KB)

```js
export const JAPAN_PREFS = [
  { name: '北海道', polygons: [[[lat,lon], ...], ...] },
  ...  // 47 件
];
window.JAPAN_PREFS = JAPAN_PREFS;
```

各都道府県は `Polygon` (本州内陸の県) または `MultiPolygon` (北海道・長崎・鹿児島・東京都の島嶼) を持ち、`polygons[]` の長さで変わる。

#### 3. `js/14-share-ogp.js` を `JAPAN_PREFS` ベースに書き換え

- 旧: `JP_ISLANDS` (4 島粗ポリゴン) を撤去
- 新: `getJapanPrefs()` で `window.JAPAN_PREFS` を取得し、47 都道府県を 2-pass 描画
  - 1 pass: 全 polygon を陸地色 `#152434` で fill (隣接 polygon の境を消す)
  - 2 pass: 全 polygon を境界線色 `#243d55` (lw 0.6) で stroke (都道府県境を細く)
- 沖縄は OGP では bbox 外 (lat 30.5 以下) のため自動カット (Canvas clip)
- 北方領土は dataofjapan/land に未含のため自動的に描画されない

#### 4. ロード順 / アセット登録

- `noritetsu-map.html`: `<script type="module" src="js/share-japan-geo.js">` を 13c → 14 の間に追加 (14-share-ogp.js が `window.JAPAN_PREFS` を参照するため先読み)
- `sw.js`: CACHE_VERSION v236 → v237、STATIC_ASSETS に `./js/share-japan-geo.js` 追加
- `scripts/syntax-check.js`: FILES に `share-japan-geo` 追加 (20/20 OK)

### 期待される視覚的改善

- 本州が自己交差せず、リアスのある海岸線がちゃんと出る
- 47 都道府県の境界線が薄く見える (情報量増)
- 北海道・四国・九州も正しい輪郭で描画
- ファイル増分は SW キャッシュ後は無視できる (59KB)

### 落とし穴メモ

- **JAPAN_PREFS は window 公開必須**: ES Module の `export` だけだと 14-share-ogp.js から見えない。`window.JAPAN_PREFS = JAPAN_PREFS` も必須 (`share-japan-geo.js` の末尾で実施)
- **ロード順**: `share-japan-geo.js` を `14-share-ogp.js` より先に読まないと、シェアボタン押下時に `getJapanPrefs()` が空配列を返す
- **データソースのライセンス**: dataofjapan/land は public domain (CC0 相当)。出力ファイルの先頭にソース URL を AUTO-GENERATED コメントとして明記
- **build スクリプトは手動実行**: package.json には足してない (年単位で変わらないデータのため、必要なときに `node scripts/build-japan-geo.js` で再生成)
- **沖縄カット**: JP_BBOX を意図的に 30.5N から開始しており、沖縄本島 (26.5N) は OGP 画像に出ない。Phase 2 でインセット表示を検討
- **fetch エラー時のフォールバックなし**: `window.JAPAN_PREFS` が空のとき OGP は地図なしで生成される (segments と海岸線がない状態)。実用上は SW プリキャッシュで救われる

### バージョン番号

v237 (Phase 3.8 後半 §86)

---

## 85. v236 — シェア機能 MVP: OGP 画像生成 (Canvas) (2026-05-20)

### 背景

🔥 最優先 TODO「シェア機能 (OGP 画像生成)」の MVP。Notion §3.1 と TODO.md でずっと未着手だったが、ES Modules 化 (v195〜v225) でコード基盤がクリーンになったので着手。

既存実装の棚卸し:
- `noritetsu-log.html` の旅程結果画面に **テキストベース**のシェア (絵文字テキスト + クリップボードコピー) は実装済み (`#share-txt`)
- 画像生成・OGP・累計完乗率版・X intent などは未実装
- `js/13a-stats.js:217` の「シェア機能 (将来) は 🟢 GPS 記録のみ対象」はコメントだけで実装なし

### スコープ (MVP)

- **累計版**の OGP 画像 (全駅・全系統に対する完乗率) のみ。個別 trip 版は後回し
- **マイページ統計タブ**の完乗率カード直下に「📸 シェア画像を作成」ボタン
- **verified 限定ガードは未実装** (`users.share_status` スキーマ + RLS 強化と同時着手するため別タスク化、布石 #6)

### 変更内容

#### 1. `js/14-share-ogp.js` 新規作成 (286 行)

- ES Module、`window.NORIRECO.share.openShareModal(stats)` を公開
- `generateOgpCanvas(stats)` で 1200×630 の Canvas を直接描画
  - 背景: navy `#0D1B2A` + 上端アクセントライン
  - ヘッダ: 🚃 乗レコ ロゴ (左) / `yutsutke.github.io/norireco` (右)
  - 左パネル (620×470): 日本地図 (4 島ポリゴン + 緯度経度グリッド + 乗車区間 polyline + 北方位)
  - 右パネル (440×470): 完乗率 % / 制覇駅 / 系統 / 総距離
  - フッタ: `#乗レコ #乗り鉄 #全国制覇`
- 日本地図シルエットは lat/lon ベースで自己完結 (`JP_ISLANDS` 配列 + `JP_BBOX` 固定 bbox + `projToCanvas()` 投影)
- 乗車区間は `window.RIDDEN_SEGS` + `NORIRECO.data.SERVICE_LINES` から `buildSegmentPolylines()` で抽出 (lineId + from + to → station coords)
- モーダル UI は `ensureModal()` で `<body>` に append (既存 `.memo-modal` / `.memo-sheet` CSS を流用)
  - ダウンロード: `canvas.toBlob` → `<a download>` で `norireco-YYYY-MM-DD.png`
  - シェア: `navigator.canShare({files})` 対応端末は `navigator.share()` で画像 + テキスト同送、未対応は X intent (`x.com/intent/tweet`) にフォールバック
  - 閉じる: モーダル背景クリック or ボタン

#### 2. `js/01-constants.js` ISLANDS を window 公開

```js
// 旧: ISLANDS は現状未参照 (dead) なので window 公開なし
// 新 (v236): OGP 画像生成 (14-share-ogp.js) で利用するため公開
window.ISLANDS = ISLANDS;
```

ただし `01-constants.js` の ISLANDS は pre-projected x,y で「全国 view 固定」前提のため、14-share-ogp.js では結局 lat/lon 版 (`JP_ISLANDS`) を内部に持って自己完結化。01-constants の ISLANDS 公開は将来用 (boundary 共有時)。

#### 3. `js/13a-stats.js:132-153` 完乗率カード直下にボタン追加

```js
const shareBtn = document.createElement('button');
shareBtn.className = 'mp-share-btn';
shareBtn.textContent = '📸 シェア画像を作成';
shareBtn.onclick = () => NORIRECO.share.openShareModal({
  pct: all.uniquePct,
  ridden: all.uniqueRidden,
  totalUnique,
  lines: all.lines,
  complete: all.complete,
  totalLines,
  distanceKm: all.totalDistanceKm,
});
wrap.appendChild(shareBtn);
```

`all` (全記録) ベース。`sv` (verified のみ) でないのは MVP では全記録シェアを優先、verified ガードは別タスクのため。

#### 4. `noritetsu-map.html` module 登録

```html
<script type="module" src="js/13c-lines.js"></script>
<script type="module" src="js/14-share-ogp.js"></script>  ← 追加
<script type="module" src="js/09-tabs-stats.js"></script>
```

#### 5. `sw.js` CACHE_VERSION v235 → v236 + STATIC_ASSETS に追加

#### 6. `scripts/syntax-check.js` の FILES 配列に `14-share-ogp` 追加 (19/19 OK)

### 残課題 (次に着手すべき順)

1. **verified ガード** — `users.share_status` (warn / share_banned / full_banned) スキーマ追加 + RLS policy で実装。布石 #6 と同時
2. **個別 trip シェア** — 旅程カードからも 1 旅程分の OGP を生成可能に
3. **`noritetsu-log.html` のテキストシェアを地図画面に移植** — log 画面廃止 TODO とセット
4. **シェア専用ページ** (`/share/<id>`) で OGP メタタグ込みの受け側 URL + 「自分も記録してみる」CTA
5. **画像保存先** — 現状は端末ダウンロードのみ。永続シェア URL には R2 + Workers が必須 (布石 #2 / #4)

### 落とし穴メモ

- **`RIDDEN_SEGS` グローバル参照**: 14-share-ogp.js は `window.RIDDEN_SEGS` を直接読む。期間フィルタ (`setDateFilter`) で `RIDDEN_SEGS` が書き換わるので、シェアボタンを押した時点の期間フィルタ状態が反映される (=「今年だけ」シェアも可能)
- **絵文字フォント**: Canvas API の `🚃` は OS のフォールバックフォントに依存。Windows/macOS/iOS では Emoji フォント、Linux では表示崩れの可能性 (個人開発で実機検証範囲を限定)
- **`navigator.share` の files サポート**: iOS Safari 15+ / Android Chrome は OK、PC ブラウザは概ね非対応 → X intent fallback で吸収
- **`canvas.toBlob` は async**: ダウンロード/シェア両方で await 必須

### バージョン番号

v236 (Phase 3.8 後半 §85)

---

## 84. v235 — 完乗率の集計方式を「ユニーク駅単位」に統一 (2026-05-19)

### 背景

ユーザー報告: ヘッダ「達成率 10%」とマイページ「全記録完乗率 4%」と「公式完乗率 0%」、3 つの異なる数字が並んでいて一瞬で何が違うのか分からない。

### 原因

- **ヘッダ 10%** = `globalStats()` ([js/02b-service-lines-builder.js](js/02b-service-lines-builder.js)) の `pct` = 系統単位の駅数集計 (1 駅が複数系統に属すると複数回カウント、ts ≈ 10,446)
- **マイページ 全記録 4%** = `buildCompletionCards()` の `collect(false).uniquePct` = ユニーク駅単位 (Set で重複排除、ts ≈ 8,491)
- **マイページ 公式 0%** = `collect(true).uniquePct` = `trip.verified === true` のみ

ヘッダと全記録は同じ「全記録」を見ていたが集計方式 (系統単位 vs ユニーク駅単位) が違うため数字がズレ、初見ユーザーには判別不能だった。

### 変更内容

#### 1. `globalStats()` をユニーク駅単位に変更 ([js/02b-service-lines-builder.js:156-172](js/02b-service-lines-builder.js:156))

```js
function globalStats() {
  const allStations = new Set();
  const riddenStations = new Set();
  let la = 0, ld = 0;
  NORIRECO.data.SERVICE_LINES.forEach(sl => {
    for (const s of sl.stations) allStations.add(s.name);
    const rs = slRiddenSt[sl.id];
    const r = rs ? rs.size : 0;
    if (rs) for (const n of rs) riddenStations.add(n);
    if (r > 0) la++;
    if (r === sl.stations.length && sl.stations.length > 0) ld++;
  });
  const ts = allStations.size;
  const rt = riddenStations.size;
  return { ts, rt, la, ld, pct: ts > 0 ? Math.round(rt/ts*100) : 0 };
}
```

`la` (乗車系統数) と `ld` (完乗系統数) は系統単位を維持。`pct` だけがユニーク駅単位に。

#### 2. ヘッダ・右パネルのラベル統一 ([noritetsu-map.html:1045-1046](noritetsu-map.html:1045), [noritetsu-map.html:1132-1134](noritetsu-map.html:1132))

- ヘッダ: `達成率 10% / 路線 81` → `完乗率 4% / 系統 81`
- 右パネル: `全体 10% / 乗車路線 81系統 / 完乗 25系統` → `完乗率 4% / 乗車系統 81系統 / 完乗系統 25系統`
- title 属性で説明追記 (hover で「ユニーク駅単位の完乗率 (全記録)」)

#### 3. マイページ完乗率カードのサブタイトル明確化 ([js/13a-stats.js:117-130](js/13a-stats.js:117))

- `verified のみ` → `GPS 認証された乗車記録のみ`
- `manual / suspicious 含む` → `手動記録も含む全ての乗車`

### 結果

- ヘッダ「完乗率 4%」= マイページ「全記録完乗率 4%」が完全一致
- マイページ「公式完乗率 0%」(GPS のみ) との対比が「全記録 vs GPS 認証」の 2 軸で明快に
- 「達成率」「路線」など曖昧だった用語を全て「完乗率」「系統」に統一

### 落とし穴メモ

- `gStats()` / `globalStats()` を直接読む他の場所 (もしあれば) は `pct` の意味が変わるので注意。検索 → `updateOverlays` ([js/08-rendering.js:897-903](js/08-rendering.js:897)) と `mp-completion-pinned` の calc 経路のみ。後者は既にユニーク駅ベースなので影響なし
- `stats(sl)` (系統単位) と `globalStats()` (ユニーク駅単位) で `pct` の意味が分岐するので、命名 / コメントで明示

---

## 83. v234 — 静的デモデータ `RIDDEN_SEGS_STATIC` を撤去 (2026-05-19)

### 背景

v233 で未ログイン時の Supabase 同期を skip するようにしたが、ユーザーから「まだデータが残ってる」報告。スクリーンショットでは「📄 静的データ」ラベルで東海道新幹線・山手線・北陸新幹線・予讃線などのデモ線が表示されており、`RIDDEN_SEGS_STATIC` (21 segments の demo trip 集) が描画されていた。

このデモデータは元々「初回訪問時にアプリの可能性を見せる」目的だったが、本人の記録と区別が付かず混乱の元になっていた。乗レコは記録系アプリなので、ユーザーが自分で記録するまで空マップの方が UX 上正しい。

### 変更内容

#### 1. `RIDDEN_SEGS_STATIC` 配列を削除 ([js/05-supabase-data.js](js/05-supabase-data.js))

旧 [js/05-supabase-data.js:17-47](js/05-supabase-data.js) の 21 segment 定義 + 関連コメントを撤去。

#### 2. フォールバック先を空配列に

- `applyDateFilter()`: `trips.length === 0` → `segs = []` (旧 `[...RIDDEN_SEGS_STATIC]`)
- `RIDDEN_SEGS` モジュール初期化: `loadRiddenSegsFromStorage() || []` (旧 `|| [...RIDDEN_SEGS_STATIC]`)

#### 3. ストレージ識別子 `'static'` → `'empty'` に改名

- `getStorageStats()` の戻り値: `source: trips.length > 0 ? 'local' : 'empty'`
- `updateStorageUI('empty')`: ラベルを `📄 静的データ` → `📄 データなし` に
- 12-auth の `clearLocalUserDataAfterSignOut()` も `updateStorageUI(0, 'empty')` に
- 06-map-leaflet の復元モーダル文言も `'静的データ（Supabaseから自動同期）'` → `'データなし（ログイン後 Supabase から同期）'` に

### 影響範囲

- 未ログイン + 空 localStorage = 完全に空のマップ (路線も駅も描かれない)
- ログイン中の挙動は不変。Supabase 同期成功で従来通り表示
- 初回訪問者には「ログインしてください」UX 経路を強化する余地あり (別タスク)

---

## 82. v233 — 未ログイン時の Supabase 同期で他人の trip / キャラ獲得が漏れていたのを修正 (2026-05-19)

### 背景

ログアウト状態でも地図に乗車線が出る報告。スクリーンショットでは「ログイン」ボタン表示 (= 未ログイン) なのにストレージ表示が `☁ Supabase同期済 147件` で、東京・大宮・新横浜・横浜などにパイチャートが描かれていた。

### 原因

`syncFromSupabase()` ([js/05-supabase-data.js](js/05-supabase-data.js)) と `syncCharacterGrantsFromSupabase()` ([js/03-characters.js](js/03-characters.js)) の両方が:

- anon key (`Bearer ${SUPABASE_KEY}`) で fetch
- `user_id` フィルタなし

で全ユーザーの trip / キャラ獲得を取得していた。RLS が anon に SELECT 許可していたため、未ログイン状態でも全データが localStorage に書き込まれ、地図に反映されていた。

(同時に他ユーザーのデータがログアウト中の端末で見えていた = 軽微なプライバシー問題。SUPABASE_KEY は公開キーなので REST API でも誰でも引けるが、UI で他人のデータを表示するのは別問題)

### 変更内容

#### 1. `syncFromSupabase()` を user_id 必須 + ログイン中のみに ([js/05-supabase-data.js:392-410](js/05-supabase-data.js:392))

```js
const uid = currentUserId();
if (!uid) {
  console.log('[乗レコ] Supabase 同期スキップ (未ログイン)');
  return;
}
fetch(`${SUPABASE_URL}/rest/v1/norireco_trips?user_id=eq.${uid}&select=*&order=created_at.asc`, {
  headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authBearerToken()}` }
})
```

Bearer も anon key 直挿しから `authBearerToken()` (access_token 優先、フォールバックで anon key) へ統一。

#### 2. `syncCharacterGrantsFromSupabase()` も同様に修正 ([js/03-characters.js:86-95](js/03-characters.js:86))

#### 3. ログイン確定時に sync を再トリガー ([js/12-auth.js:117-126](js/12-auth.js:117))

`syncFromSupabase()` が起動時 (06-map-leaflet `initMap`) に走るタイミングではまだ `auth.currentUser` が null の可能性 (Supabase SDK の session 復元が間に合っていない)。`handleAuthChange` の `SIGNED_IN` / `INITIAL_SESSION` 分岐で `backfillUserIdForLegacyData` の後に `syncFromSupabase()` + `syncCharacterGrantsFromSupabase()` を明示的に呼ぶ。

```js
if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && auth.currentUser && !auth.authBackfillRan) {
  auth.authBackfillRan = true;
  backfillUserIdForLegacyData(auth.currentUser.id);
  syncFromSupabase();
  syncCharacterGrantsFromSupabase();
}
```

これにより 12 ↔ 05 と 12 ↔ 03 の 2 つの循環 import が新たに発生するが、全て function export なので ES Modules の hoisting で解決される (既存の 12 ↔ 13 / 12 ↔ 07 と同じパターン)。

### 影響範囲

- **未ログイン端末で他人の trip / キャラが見える問題が解消** (= 統計バッジ・乗車線・パイ・キャラ獲得が全て空 or 静的フォールバックになる)
- ログイン中の挙動は不変。session 復元時に backfill と並んで sync が走る
- Supabase RLS の policy 自体は据え置き (将来は anon SELECT を禁止すべきだが、別タスク)

### 落とし穴メモ

- SUPABASE_KEY は frontend に露出した anon key なので、誰でも REST API で生データを引ける。今回の修正は **UI で他人データを表示しない** ことに限定した防御。本格的なアクセス制御は Supabase RLS で `user_id=auth.uid()` 必須にする必要がある
- backfill (`user_id=NULL` を自分の uid に PATCH) は Bearer に access_token を使うとユーザーの認可が乗るため、RLS 強化後も動作する

---

## 81. v232 — 駅ドットとパイチャートの出現タイミングを統一 (2026-05-19)

### 背景

旧設計では `getDotMinTier(z)` (ドット用閾値) と `getPieMinTier(z)` (パイ用閾値、ドットより厳しめ) の 2 本立てで、多系統駅は **「低ズームでは単色ドットだけ表示 → 1〜2 ズーム上げるとパイチャートに昇格」** という段階表示を狙っていた。

しかし v230/v231 の tier 圧縮後、ドットとパイで出現タイミングがズレるとマップ上で「単色丸」と「パイ」が混在する違和感が出ていた。多系統駅は最初からパイで出した方が情報密度として自然。

### 変更内容 ([js/08-rendering.js](js/08-rendering.js))

#### 1. `getPieMinTier(z)` 関数を削除

旧 [js/08-rendering.js:244-252](js/08-rendering.js) の関数定義を撤去。

#### 2. `_station_use_pie_threshold = true` 代入を削除 (2 箇所)

- 装飾 divIcon (Lv2+/キャラ付き多系統駅) の `dot._station_use_pie_threshold = true`
- 平常多系統駅の `extraDot._station_use_pie_threshold = true`

両方ともパイマーカーだが、ドットと同じ `getDotMinTier` 閾値で出るように `_station_use_pie_threshold` フラグごと撤廃。

#### 3. `updateLOD` を簡素化 ([js/08-rendering.js:131-141](js/08-rendering.js:131))

```js
// 旧:
const dotMin = getDotMinTier(z);
const pieMin = getPieMinTier(z);
const minTier = d._station_use_pie_threshold ? pieMin : dotMin;

// 新:
const dotMin = getDotMinTier(z);
const minTier = dotMin; // 全マーカー共通
```

### 視覚的影響

- 多系統駅 (平常) は今後、出現と同時に **単色ドット + パイマーカー** が重なって表示される (パイがドットを視覚的に覆う)。単色ドットの上にパイが描画されるレイヤー順は据え置き
- 装飾 divIcon (Lv2+/キャラ付き) は元から 1 マーカーだったので、出現タイミングが旧 dotMin に合わせて早くなる (旧 pieMin より早く出る)
- ラベル (`getLabelMinTier`) は `getDotMinTier(z-1)` で 1 ズーム遅延の関係を維持

---

## 80. v231 — 駅ランク tier テーブルを圧縮 (都内クラッタ抑制) (2026-05-19)

### 背景

v230 で bbox 分岐を撤去した結果、都内の中間ターミナル (3-6 系統駅) が低ズームでも大量に出現して地図がクラッタになる現象を確認。スクリーンショットでは関東広域ビューで国分寺・倉子・新横浜・小山・古河など 4-6 系統相当の駅が密集表示されていた。

旧 tier テーブルは 1〜6 を細かく刻んでいたが、SUPER_MEGA とそれ以外の多系統駅の間で十分な差が出ず、`getDotMinTier` の閾値テーブル側で微調整しても限界があった。

### 変更内容 ([js/08-rendering.js](js/08-rendering.js))

`stationTier(nLines, name)` の戻り値を圧縮:

| 系統数 | 旧 tier | 新 tier |
|---|---|---|
| SUPER_MEGA (駅名リスト) | 6 | 6 (unchanged) |
| 7+ | 5 | **4** |
| 4-6 | 4 | **2** |
| 3 | 3 | **2** |
| 2 | 2 | 2 (unchanged) |
| 1 | 1 | 1 (unchanged) |

結果として tier 3 と tier 5 は使われなくなり、実質「6 / 4 / 2 / 1」の 4 段階になる。SUPER_MEGA (6) と 7+ ターミナル (4) の間に 2 段階差を確保、4-6 系統と 2-3 系統を同 tier (2) に統合して中規模駅を一括で遅出しにする。

isolationBonus テーブルと `getDotMinTier` の閾値表は据え置き。tier 値が 1〜2 段階下がることで、関東広域 (z=8-10) で旧 tier 3-4 駅が表示されなくなる。

### 影響予測

- 都内 z=8-10: 3-6 系統駅 (国分寺・新横浜・倉子・古河 等) が消える → クラッタ解消
- 都内 z=11+: 7+ ターミナル (新宿・渋谷・大宮 等) は出続ける
- 地方の中規模駅 (3-6 系統、例: 静岡・浜松): 同様に低ズームでは出にくくなる
  - ただし isolation bonus +1〜+2 が乗りやすいので、田舎の 4 系統駅は tier=3-4 となり 7+ ターミナル相当の早出しに

### 落とし穴メモ

`stationTier` の値域は理論上 `{1, 2, 4, 6}` の離散集合に縮小したが、isolation bonus との加算で `-3 〜 6` の連続範囲を維持。閾値表 `getDotMinTier` は連続値前提なので問題なし。

---

## 79. v230 — 地図 LOD から首都圏 bbox 分岐を撤去、駅ランク 1 本化 (2026-05-19)

### 背景

地図描画の LOD (level of detail) は (1) 駅ランク `tier` (baseTier from 系統数 + isolationBonus from `nearest_km`) と (2) 緯度経度 bbox による `isMetro` 判定の **二重メカニズム** で密集度を扱っていた。`isMetro` は首都圏 (山手線周辺) / 大阪都心 / 名古屋都心の bbox にヒットすると `getDotMinTier(z, true)` / `getDotMinTier(z, false)` の別テーブルを引く設計。

しかし `isolationBonus` (`nearest_km < 0.5km` → `-4`, `>= 10km` → `+2`) が既に密集度の連続値として最終 tier に織り込まれているため、bbox は同じ仕事を粗い離散分類で重複していた。京葉線・葛西臨海公園のように「首都圏 bbox の外だが実質都市駅」のようなエッジケースで bbox が機能しないのに対し、isolation は座標非依存で正しく機能する。

### 変更内容 ([js/08-rendering.js](js/08-rendering.js))

#### 1. `isMetroArea(lat, lon)` 関数を削除

3 領域 (首都圏 / 大阪 / 名古屋) の bbox 判定ロジック (旧 [js/08-rendering.js:215-225](js/08-rendering.js)) を撤去。

#### 2. `getDotMinTier` / `getPieMinTier` / `getLabelMinTier` を 1 本化

4 テーブル (PC+metro / PC+rural / Mobile+metro / Mobile+rural) を **旧 metro 側ベースに統合**。引数 `isMetro` を削除。

- `getDotMinTier(z)`: PC で `z>=16→-4 ... z>=5→6`。Mobile では z を 1 下げて同テーブル参照 (旧 mobile metro 相当)
- `getPieMinTier(z)`: 多系統駅をパイチャート昇格させる閾値。`z>=13→2 ... z>=9→6`
- `getLabelMinTier(z)`: `getDotMinTier(z-1)` でドットから 1 ズーム遅延

旧 rural 側のテーブル (PC で 2 ズーム緩く / Mobile で 3 ズーム緩く) は捨てた。tier+isolation で田舎駅は bonus +1/+2 が乗って tier が早出しされるので、閾値表は厳しめ寄りでも結果バランスする。

#### 3. `updateLOD` の分岐簡素化 ([js/08-rendering.js:127-156](js/08-rendering.js:127))

```js
// 旧: const dotMinMetro = ...; const dotMinRural = ...; (×4)
//     const m = d._station_isMetro;
//     minTier = m ? dotMinMetro : dotMinRural;
// 新: const dotMin = getDotMinTier(z);
//     const minTier = d._station_use_pie_threshold ? pieMin : dotMin;
```

各マーカーの `_station_isMetro` プロパティ参照も削除。

#### 4. 駅描画ループから `isMetro` 計算と `_station_isMetro` 代入を削除

[js/08-rendering.js:683 周辺](js/08-rendering.js:683)。`dot` / `extraDot` / `label` の 3 箇所。

### 駅ランク (tier) の計算式 (参考)

`tier = min(6, baseTier + isolationBonus)` で **-4 〜 6** の整数。

| 要素 | 値 |
|---|---|
| baseTier 6 | `SUPER_MEGA_STATIONS` (東京/名古屋/新大阪/札幌/仙台/博多/広島) |
| baseTier 5 | 7 系統以上 (新宿/渋谷/池袋/横浜/大宮 等) |
| baseTier 4 | 4-6 系統 |
| baseTier 3 | 3 系統 |
| baseTier 2 | 2 系統 |
| baseTier 1 | 1 系統 |
| isolationBonus +2 | `nearest_km >= 10km` (北海道ローカル駅等) |
| isolationBonus +1 | `nearest_km >= 5km` |
| isolationBonus 0 | `nearest_km >= 2km` |
| isolationBonus -1 | `nearest_km >= 1.2km` |
| isolationBonus -2 | `nearest_km >= 0.8km` |
| isolationBonus -3 | `nearest_km >= 0.5km` |
| isolationBonus -4 | `nearest_km < 0.5km` (山手線内側等) |

例:
- 東京駅: baseTier=6 → tier=6 (cap)
- 神田 (山手線): baseTier=2, bonus=-4 → tier=-2 (高ズームでのみ出現)
- 北海道・布部: baseTier=1, bonus=+2 → tier=3

### 影響範囲

LOD のみ。記録モード・統計・キャラ獲得など他機能には触れていない。bbox 撤去で「葛西臨海公園」のような bbox 外の首都圏駅も合理的に扱えるようになる副作用がある。

### 落とし穴メモ

`SUPER_MEGA_STATIONS` (東京/名古屋/新大阪/札幌/仙台/博多/広島) は `stationTier()` の最上位判定なので残置。これは bbox ではなく駅名ベースのリストなので tier 計算と整合。

---

## 78. v229 — v228 続報: 達成率/系統数バッジと mypage キャッシュも purge (2026-05-19)

### 背景

v228 デプロイ後の動作確認で「地図はリセットされるけど統計は残るね」とユーザー報告。
ヘッダ右上の「10% 達成率 / 81 路線」バッジ ([noritetsu-map.html:`h-pct` / `h-ln`](noritetsu-map.html)) と右側パネルの「全体 / 乗車路線 / 完乗」凡例 (`ms-pct` / `ms-ln` / `ms-dn`) が、ログアウト後も前ユーザーの数値のまま残っていた。

### 原因

`redrawAllLinesAfterTripChange()` ([js/07-record-mode.js:968](js/07-record-mode.js:968)) は地図の **線・駅ドット・パイチャート** を再描画するだけで、**`updateOverlays()`** ([js/08-rendering.js:1012](js/08-rendering.js:1012)) は呼ばない。バッジ・凡例の DOM テキストは `updateOverlays()` が `gStats()` を読んで反映する仕組みなので、明示的に併用しないと更新されない。

呼出側の慣習を見ると `07-record-mode.js:927-928` の `saveMultiSegmentTrip` も明示的に両方呼んでいた:

```js
NORIRECO.rideRecord.rebuild();
redrawAllLinesAfterTripChange();
updateOverlays();
```

v228 の `clearLocalUserDataAfterSignOut()` ではこの 2 段目を漏らしていた。

### 変更内容

#### 1. `updateOverlays()` を import して purge 末尾で呼ぶ ([js/12-auth.js](js/12-auth.js))

```js
import { updateOverlays } from './08-rendering.js';
// ...
try { redrawAllLinesAfterTripChange(); } catch(e) {}
try { updateOverlays(); } catch(e) {}
```

これで `h-pct` / `h-ln` / `ms-pct` / `ms-ln` / `ms-dn` の DOM テキストと `legend-lines` (営業系統別凡例) がログアウト時に 0 に揃う。

#### 2. mypage キャッシュ `NORIRECO.mypage.state._mypageCache` も null に ([js/12-auth.js](js/12-auth.js))

`renderMypage()` 自体は未ログイン時に「ログインしてください」空状態を出すので通常経路では問題にならないが、`tripCardHtml(trip)` 等の補助関数や旅程編集モーダルが `_mypageCache` を直接参照するため、キャッシュも明示的に null 化して前ユーザー由来の trip オブジェクトが UI に漏れないようにする。

### 影響範囲

ログアウト時のバッジ・凡例・mypage キャッシュのみ。`saveMultiSegmentTrip` 等の既存 trip 変更フローは元から両方呼んでいるので変化なし。

---

## 77. v228 — ログアウト時に地図の乗車データをローカルから purge (2026-05-19)

### 背景

ログアウトしても地図上の乗車線・駅ドット・キャラ獲得が前ユーザーのまま残り続けるバグ報告。Supabase 側のデータには触れず、ローカル (localStorage + in-memory 派生状態) だけを掃除して空状態を表示するのが正しい挙動。

### 原因

`signOutUser()` ([js/12-auth.js:148](js/12-auth.js:148)) は `supabaseAuthClient.auth.signOut()` で Supabase セッションを破棄するのみ。`onAuthStateChange` の `SIGNED_OUT` イベント側でも UI 更新 + マイページ再描画しか行っておらず、以下が残置されていた:

- `localStorage.norireco_trips` (乗車履歴) → `loadRiddenSegsFromStorage()` が起動時に読み込み続ける
- `localStorage.norireco_owned_characters` (キャラ獲得)
- `localStorage.norireco_station_char_pick` (駅ごとのキャラ選択)
- in-memory `RIDDEN_SEGS` / 派生状態 `slRiddenSt` / `slStopType` / `slVisitCount` / `riddenServiceIds`
- 地図再描画も走らないので、線・ドット・パイチャートが前ユーザーのまま

### 変更内容

#### 1. `handleAuthChange` に `SIGNED_OUT` 分岐 ([js/12-auth.js](js/12-auth.js))

`event === 'SIGNED_OUT'` で `clearLocalUserDataAfterSignOut()` を呼ぶよう追加。

#### 2. `clearLocalUserDataAfterSignOut()` 新規 ([js/12-auth.js](js/12-auth.js))

以下を順に実行:

1. `localStorage.removeItem('norireco_trips' / 'norireco_owned_characters' / 'norireco_station_char_pick')` — ユーザー紐付きキーのみ。期間フィルタ・地図モード・stop_type フィルタ等の UI 設定キーは据置
2. `window.RIDDEN_SEGS.length = 0` — in-memory 共有配列を空に
3. `NORIRECO.rideRecord.rebuild()` — `slRiddenSt` / `slStopType` / `slVisitCount` / `riddenServiceIds` を空 RIDDEN_SEGS から再構築 (= 空)
4. `redrawAllLinesAfterTripChange()` — 既存ポリライン・ドット・パイチャートをクリアして再描画 (07-record-mode export を利用)
5. `updateStorageUI(0, 'static')` — ストレージ表示ラベルを「📄 静的データ」に戻す

#### 3. import 追加 ([js/12-auth.js](js/12-auth.js))

- `redrawAllLinesAfterTripChange` from `./07-record-mode.js`
- `updateStorageUI` from `./05-supabase-data.js`

12 ↔ 07 は循環 import (07 が既に `currentUserId` を 12 から import) になるが、両側とも function export なので ES Modules の hoisting で解決される (03 ↔ 07 と同じ前例)。`npm run check` パス。

### 設計判断

- **Supabase は触らない**: ログアウト = ローカルビューの purge であり、データ削除ではない。再ログインで `syncFromSupabase()` が走り元通り復元される
- **静的フォールバックは呼ばない**: 05 の `loadRiddenSegsFromStorage()` は localStorage 空時に `RIDDEN_SEGS_STATIC` (デモ用の特定旅行者の記録) を返すが、ログアウト直後にデモ記録を表示すると混乱を招くため、in-memory も明示的に空にする
- **UI 設定キー (`mapMode` / `norireco_stop_type_filter` / `norireco_trip_date_filter` / `CHAR_MODE_KEY`) は保持**: 同じ端末を別ユーザーが使う場合でも、地図操作の好みは引き継ぐ方が UX 上自然

### 影響範囲

- ログアウト時の挙動のみ変更。ログイン中・未ログイン起動時の挙動は不変
- マイページが開いている状態でログアウトすると、既存の `setTimeout(() => renderMypage(), 100)` も走るので、マイページ側も空表示に切り替わる

---

## 76. v227 — 旅程カードのボタンラベル「メモ編集」→「編集」(2026-05-19)

v226 で trip-edit-modal の編集対象が notes/delay → 区間表示/時刻/列車種別/遅延/メモに拡大したが、ボタンラベルは「✏️ メモ編集」のままだった。実態に合わせて「✏️ 編集」に短縮 ([js/13-mypage-common.js:318](js/13-mypage-common.js:318))。モーダルタイトル「✏️ 旅程を編集」と整合。

---

## 75. v226 — 旅程カード「✏️ 編集」を区間・乗車時刻・列車種別まで拡張 (2026-05-19)

### 背景

これまで旅程カードの「✏️ メモ編集」モーダル ([js/13b-trips.js](js/13b-trips.js) `openTripEditModal`) は notes + delay_minutes のみ編集可。**📍 区間 / 🕒 乗車時刻 / 🚆 列車種別** は確認モーダル (保存時) でしか変えられず、後から「あ、これあずさ9号だった」「乗車日を 5/3 ではなく 5/4 だった」といった後追い修正ができなかった。Notion §0 / TODO の「手動記録の旅程カードからの後編集拡張」を消化。

### 変更内容

#### 1. trip-edit-modal を 5 セクション構成へ ([noritetsu-map.html:1280-1361](noritetsu-map.html:1280))

タイトルを「✏️ メモ・遅延を編集」→「✏️ 旅程を編集」に変更。セクション構成:

| セクション | 編集可否 | 備考 |
|---|---|---|
| 📍 区間 | read-only 表示 | `segments[]` を 1. A→B [lineId] 形式で列挙。修正したい場合は削除→再記録ガイド |
| 🕒 乗車時刻 | 手動記録のみ可 | 📅 乗車日 / 🕐 出発 / 🕑 到着。GPS 記録 (verified=true && source='gps_button') はロックして青ヒント表示 |
| 🚆 列車種別 (任意) | 常時編集可 | TRAIN_CATEGORIES ドロップダウン + train_name text + car_model text。簡易入力 (cascading なし) |
| ⏱ 遅延 | 既存 (v185) | 時間 + 分 |
| 📝 自由メモ | 既存 (v184) | textarea |

#### 2. `openTripEditModal` 拡張 ([js/13b-trips.js:184-247](js/13b-trips.js:184))

- 区間: `trip.segments[]` を inline HTML で列挙、空なら from→to のみ表示
- 時刻: `trip.date` / `trip.depart_time` (HH:MM:SS → HH:MM) / `trip.arrive_time` をプリセット
- GPS 記録なら `trip-edit-time-inputs` を hide、`trip-edit-time-lock` の青ヒントを show
- 列車: `NORIRECO.trains.TRAIN_CATEGORIES` から category dropdown を動的構築、現在値を選択状態に

#### 3. `saveTripEdit` 拡張 ([js/13b-trips.js:265-371](js/13b-trips.js:265))

`tripPatch` オブジェクトを構築し、(1) NORIRECO.mypage.state._mypageCache の trip オブジェクトに直接 Object.assign、(2) localStorage の `norireco_trips` 配列に書き戻し、(3) Supabase `PATCH /norireco_trips?id=eq.X` に同期、の 3 経路で更新。

- **時刻ロジック (手動記録のみ)**:
  - date + depart + arrive 全入力 → `date_precision='minute'`、`total_minutes` は日跨ぎ補正で再計算
  - date のみ入力 → 既存 `date_precision='minute'` を `'day'` に下げ、`depart_time` / `arrive_time` / `total_minutes` をクリア
  - 既存が `month` / `year` / `unknown` なら date のみ更新 (精度は据置)
  - GPS 記録は `tripPatch` に時刻フィールドを乗せない (verified 保護)
- **列車種別**:
  - `train_category` / `train_name` / `car_model` を入力値 (空文字 → null) で上書き
  - `train_name` が変わった場合のみ `train_id=null` に倒す (マニア手入力扱い、マイページに 📝 マーク)。train_name 据置なら train_id 維持
- **Supabase 同期**: notes / delay_minutes は schema 未拡張のため `tripPatch` から除外 (これまで通り localStorage のみ)
- **失敗トースト**: Supabase 失敗時は「⚠️ ローカルのみ保存 (Supabase 失敗)」

#### 4. ファイル & バージョン

- `sw.js` CACHE_VERSION v225 → **v226**
- `noritetsu-map.html` / `js/13b-trips.js` のみ変更、他ファイルは無修正

### 設計判断

- **📍 区間編集を先送りした理由**: `segments[]` を編集すると `from_station` / `to_station` / `line_list` / `total_stations` / `transfers` / `RIDDEN_SEGS` / 地図描画まで連鎖して再計算が必要。MVP では「削除→再記録」を案内する方が誤データ生成リスクが少ない。フル区間編集は別タスク (TODO 「区間 編集」項目)
- **GPS 記録の時刻ロック**: GPS 記録は `recorded_at` と `depart_time`/`arrive_time` の整合性が verified の根拠。手動編集を許すと不正検知 ([js/11-fraud-detection.js](js/11-fraud-detection.js)) の前提が崩れるため、UI 側でロック
- **train_id の自動 null 化**: train_name を手で書き換えた瞬間に「マスター由来」ではなくなる。マイページの 📝 マーク (マニア手入力) を活かして、マスター調査・補完候補として後から追跡できる

### 検証

- `npm run check`: 18/18 OK
- 未検証 (次セッションで実機確認): 実際にマイページ旅程カード → ✏️ → 時刻変更 → Supabase に反映されるか、GPS 記録のロック表示が正しく出るか

