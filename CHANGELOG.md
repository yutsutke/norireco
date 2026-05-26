# 乗レコ - 電車旅 更新履歴詳細

各セッションごとの実装ログ・経緯・失敗教訓を時系列で残す詳細メモ。

> ドキュメント役割分担は Notion §0「ドキュメント役割分担」が真実の源（v276 で Notion に集約）。本ファイルは変更履歴詳細を扱う。
> 過去フェーズは [`CHANGELOG_PHASE1-3.7.md`](CHANGELOG_PHASE1-3.7.md) / [`CHANGELOG_PHASE3.8-early.md`](CHANGELOG_PHASE3.8-early.md) / [`CHANGELOG_PHASE3.8-modules.md`](CHANGELOG_PHASE3.8-modules.md) / [`CHANGELOG_PHASE3.8-share.md`](CHANGELOG_PHASE3.8-share.md) / [`CHANGELOG_PHASE3.8-photo.md`](CHANGELOG_PHASE3.8-photo.md) / [`CHANGELOG_PHASE3.8-mypage.md`](CHANGELOG_PHASE3.8-mypage.md) / [`CHANGELOG_PHASE3.8-station-id.md`](CHANGELOG_PHASE3.8-station-id.md) / [`CHANGELOG_PHASE3.8-vehicles.md`](CHANGELOG_PHASE3.8-vehicles.md) にアーカイブ。

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

---

## 218. v368 — 駅アクションシート「この駅を含む旅程 (タップで読み込み)」のカッコ書きを削除 (2026-05-27)

### 背景

ユスケから駅アクションシートの screenshot (福俵駅・東金線) と共に「タップで読み込みは不要」との指摘。v309 で「(マイページ未読込)」→「(タップで読み込み)」に変更してユーザーアクションを示唆する設計にしていたが、アクションシートはそもそも全アクションが「タップで実行」されるため、カッコ書きは冗長で UI ノイズになっていた。

### 変更

- `js/17-station-actions.js:151` のラベルを `この駅を含む旅程 (タップで読み込み)` → `この駅を含む旅程` に
- マイページ未開封 (tripsHere === null) ブランチのみ。マイページ開封済みブランチは元から `この駅を含む旅程一覧 / (なし)` で件数バッジ付きなので変更不要

### 検証

- 直接 preview で fetch して新ラベルが入り旧ラベルが消えたことを確認 (`hasNew: true, hasOld: false`)

### 教訓

- 「ユーザーアクションを示唆する補足文言」は、文脈で自明な場合は逆にノイズになる。アクションシート/ダイアログ等の「タップ前提」UI では「(タップで...)」「(クリックで...)」は冗長
- v309 の判断 (「(マイページ未読込)」→「(タップで読み込み)」) は当時は「データ未取得を伝える」意図だったが、ユーザーが押す動機としては「ここから旅程を見たい」で十分で、未読込状態の告知自体が冗長だった

---

## 217. v367 — 徒歩乗換グループ DB + 記録モード walk segment / walk fallback 候補 (2026-05-27)

### 背景

ユスケから「函館駅・函館駅前駅、西武秩父駅・御花畑駅、立川駅・立川北駅 など、歩いて乗換可能な駅をまとめておくと自動判定に使える」との指摘。merged_stations だけでは「同名駅マージ」止まりで、「別名・別駅扱いだが徒歩 200〜400m で連絡」のケースは別駅扱いになり、乗換候補抽出ロジックでも繋がらない。

例: 函館 (函館本線) → 松風町 (函館市電大森線) は 1 hop でも 2 hop でも 0 件 → 「経由駅を手動で追加してください」だった。実際は函館駅前 (市電) まで徒歩 230m で行けば 大森線で松風町に行ける。

### 設計判断

- **データ収集**: 自動抽出 + 細かい修正は後付けで (`walk_transfers_overrides.json` 機構)。手動キュレーションは初期 50 件くらいが必要だがメンテ負担が重い vs 自動抽出は誤検出を許容しつつ高網羅性
- **抽出条件**: 距離 < 400m AND 名前異なる AND 共通系統なし (= 同じ系統で繋がる駅は乗換扱いしない)。閾値は実例 (函館 230m / 西武秩父 267m / 立川 226m) 全部入る広めの 400m
- **transitive closure (Union-Find) でグループ化**: 立川↔立川北 + 立川↔立川南 → {立川, 立川北, 立川南} 1 グループに。利用側は「グループ内なら徒歩可」と判定するだけで済む
- **同名異所も別駅扱い**: 名前異なる条件があるので同名の高松・大宮等は今回は除外。本来「大宮 (関東)」と「大宮 (京都阪急)」も別駅だが同名なのでスキップされる (merged_stations 段階で別 id 付与済、同名異所問題は v293 で対応済)
- **walk segment は error にせず通過**: buildSegmentsFromSelection が連続 2 駅を walk pair と認識したら `{walk:true, walkM}` segment 化。pairLineChoices なし、saveMultiSegmentTrip でも `if (!seg.line) continue;` で自然に除外
- **walk fallback in findTransferCandidates**: lineB に直接乗っていない x について、x.id が属する walk グループ内の他駅を lineB から探して「walkPartner」として候補化
- **a 自身からの walk fallback 許可**: 旧コードは `x.name === a.name` で skip していたが、これだと「a で降りて徒歩 → b の系統」のケース (函館→松風町など) が拾えない。`i === aIdx && !walkPartner` のみ skip にした (walkPartner ありなら有効、a 自身を「降りる駅」として扱う)
- **挿入処理 (insertWalkTransfer)**: X = a の特殊ケースで Y だけ挿入、それ以外は X+Y 両方挿入。pairLineChoices シフト + lineA/lineB pre-select (walk pair の中間 pairIdx には line 設定なし)
- **手動修正 (walk_transfers_overrides.json)**: `add` (新規グループ追加 / 既存グループに駅追加) + `remove_pairs` (誤検出ペア除外) の 2 方向。任意ファイルで存在しなければ skip

### 変更

- [scripts/extract_walk_transfers.js](scripts/extract_walk_transfers.js) 新規: merged_stations.json 全 9030 駅から徒歩乗換ペアを抽出。グリッド分割 (0.005°) で総当りを 9030² → 2032 ペアに削減、Union-Find で transitive closure グループ化 → 243 グループ / 553 駅
- [walk_transfers.json](walk_transfers.json) 新規 (自動生成): 243 グループ、最大 max_walk_m=399m。主要例: 函館・函館駅前 / 立川・立川北・立川南 / 西武秩父・御花畑 / 大宮 (京都)・四条大宮 / 富山駅周辺 9 駅
- [js/02-data-loaders.js](js/02-data-loaders.js): `loadWalkTransfers()` 新規 export。`walk_transfers_overrides.json` の add/remove_pairs 処理 + `D.walkTransferIndex` (id → groupIdx) 構築。NORIRECO.data に `WALK_TRANSFERS` / `walkTransferIndex` を追加
- [js/06-map-leaflet.js](js/06-map-leaflet.js): boot Promise.all に `loadWalkTransfers()` 追加
- [js/07-record-mode.js](js/07-record-mode.js):
  - `_distMeters(a, b)`: 緯度経度から近似メートル
  - `_isWalkPair(a, b)`: 連続 2 駅が同じ walk グループに属するか判定
  - `_findWalkPartnerOnLine(stationId, lineB, anchor)`: lineB 上の同グループ駅を最近接 1 件返す
  - `buildSegmentsFromSelection`: walk pair を `{walk:true, walkM}` segment 化 (error 回避)
  - `refreshRecPanel`: walk segment 表示 (🚶 + 徒歩 Xm + 水色枠)、サマリに「徒歩乗換 N 回含む」追記
  - `findTransferCandidates`: walk fallback ロジック追加。lineB に x 直接乗ってないとき walk グループから別駅を Y として候補化、`walkPartner` フィールドで chip 用情報を保持。x = a でも walkPartner ありなら有効化
  - `insertWalkTransfer` 新規 + window 公開。X = a なら Y だけ挿入、それ以外は X+Y 両方挿入
  - chip render の `if (c.walkPartner)` 分岐で「🚶 X 〜 Y で乗換」+「徒歩 N m」バッジ表示
- [sw.js](sw.js): CACHE_VERSION v366 → v367、STATIC_ASSETS に walk_transfers.json 追加

### 検証

- 自動抽出: 「[乗レコ] 徒歩乗換 243 グループ (553 駅)」確認。函館・立川・西武秩父・大宮・名古屋すべて期待通り
- **walk pair 認識**: 函館 → 函館駅前 を選択 → 「🚶 函館 → 函館駅前 (徒歩 約228m)」walk segment、サマリ「合計 0駅 / 乗換 0回 (徒歩乗換 1回 含む)」、error にならない
- **walk fallback**: 函館 → 松風町 (函館本線駅 + 函館市電大森線駅、1 hop 0 件) → 「🚶 函館 〜 函館駅前 で乗換 徒歩 228m / 函館本線 → 🚶 → 大森線 ・ 合計 3駅」候補が 1 件出る
- **挿入**: 上記候補クリック → selection [函館, 函館駅前, 松風町] (X = a なので Y だけ挿入)、segments = walk + 大森線 (2駅) で正しく組まれた、pairChoices に pair[1] = 大森線 のみ pre-select (walk pair の pair[0] には line なし)

### 残課題

- 2 hop fallback には walk fallback を組み込まず: 1 hop で walk が出るケースは出るので実用上は問題ないはず。2 hop に組み込むと 4 種類のパスタイプ (X walk / Y walk / X+Y walk / neither walk) が増えてコード複雑化
- 同名異所 (高松・大宮等) は walk グループに入れていない: name 異なる条件 + merged_stations が同名異所を別 id で持つ (v293〜) ので、両駅は既に別駅扱いされている。徒歩乗換は別問題なので必要なら別途手動 override
- `walk_transfers_overrides.json` は今回コミット時点では存在しない (空でも問題なし、loader は fetch 失敗を warn だけにする)。手動修正したいケースが出てきたら追加する

---

## 216. v366 — 乗換候補: 直通系統「直通あり」バッジ + 2 hop fallback (2026-05-27)

### 背景

v365 で 1 hop 乗換候補を出すようにしたが、ユスケから 2 つフィードバック:
1. through_lines (直通系統) で繋がる乗換は「実質乗換不要」なのに「🔁 乗換」と表示されて誤解を招く (例: 立川での中央線快速→青梅線は青梅特快なら立川で降りずに直通)
2. 1 hop で繋がらないペア (函館 → 弘前など) は「経路が見つかりません」で詰まる。2 hop も提案してほしい

### 設計判断

- **直通系統判定**: SERVICE_LINES の `through_lines: string[]` を見て `lineA.through_lines.includes(lineB.id)` なら `isDirectThrough: true` フラグ。データは v334 以降に手動キュレーションで構築済 (642 系統中 142 が through_lines を持つ、対称性も担保 / `service_lines_master.json` 確認済)
- **直通あり優先ソート**: 1 hop 内で「直通あり」候補は totalStations が大きくても上位に。実生活の感覚に近い (立川直通 15 駅 > 八王子乗換 16 駅 のような順序が、本来「立川直通」が圧倒的に楽)
- **2 hop fallback**: 1 hop 候補ゼロのときだけ 2 hop を試す。1 hop が 1 件でもあれば 2 hop は表示しない (1 hop 1 件 < 2 hop 多数 だと UI が混乱、1 hop を選ぶインセンティブも消える)
- **2 hop top 3**: 1 hop 5 件と同じ密度だと縦に伸びすぎ。3 件に抑制
- **パフォーマンス**: 4 重ネストループ (linesA × stations × linesMid × stations × linesB) は浅い 〜400ms。最適化として駅→系統索引 `buildStationLineIndex` を初回構築・SERVICE_LINES 不変時はキャッシュ
- **2 hop は dedupe を (X, Y) ペア単位で**: 同じ (X, Y) 経路を異なる lineA/lineB 組合せが出すことが多いので、ペアキーで最良 (totalStations 最小) のみ採用
- **挿入処理は別関数**: `insertTwoTransferStations(pairIdx, x, y, laId, lmId, lbId)` — pairLineChoices を +2 シフト + 3 系統 pre-select

### 変更

- [js/07-record-mode.js](js/07-record-mode.js):
  - `buildStationLineIndex()` 新規: 駅 id (or `_n_<name>`) → Set<sl.id> 索引、SERVICE_LINES 配列が同一参照のあいだはキャッシュ
  - `_indexOnLine(line, target, targetId)` 抽出: id ベース + name fallback の駅 index 解決を関数化 (2 関数で共用)
  - `findTransferCandidates`: `isDirectThrough` フラグ追加、ソートを「直通優先 → totalStations 昇順」に。dedupe ロジックも「直通候補が同一駅に出たら non-direct より優先採用」
  - `find2HopTransferCandidates(a, b, maxResults=3)` 新規: A→X→Y→B の 3 線パスを探索。中間系統が linesB と同一なら 1 hop と等価なので skip (1 hop 側が拾うため)
  - `insertTwoTransferStations` 新規 + window 公開
  - `refreshRecPanel` の error 分岐: 1 hop chip の `isDirectThrough` 判定で「🚉 + 直通あり」バッジ表示、1 hop ゼロなら 2 hop fallback (「🔁🔁 X / Y で 2 回乗換」3 系統色付きドット + 合計駅数)
- [sw.js](sw.js): CACHE_VERSION v365 → v366

### 検証

- **直通あり判定**: 吉祥寺 → 拝島 で
  - 1 位: 🚉 立川 で乗換 直通あり (中央本線快速 → 青梅線) 15駅
  - 2 位: 🔁 八王子 で乗換 (中央本線快速 → 八高線) 16駅
  - 直通あり優先で正しくソート、totalStations は近いが直通候補が上に
- **2 hop fallback**: 函館 → 弘前 で
  - 1 hop ゼロ → 「💡 2 回乗換候補 (タップで 2 駅挿入)」見出し
  - 🔁🔁 新函館北斗 / 新青森 で 2 回乗換 (函館本線 → 北海道新幹線 → 奥羽線) 19駅
  - 計算 394ms (許容)
- **2 hop chip クリック**: 函館 → 新函館北斗 → 新青森 → 弘前 (4 駅 selection)、3 segments に分解、pairLineChoices に 3 系統 pre-select、合計 19駅 / 乗換 2回 表示で一致
- **3 hop 以上のケース** (札幌 → 鹿児島中央 / 富山 → 高知 / 岡山 → 旭川 等): 2 hop でもゼロ → 「2 回乗換でも繋がる経路が見つかりません。経由駅を手動で追加してください」フォールバック

### 残課題

- 3+ hop 探索は実装せず: BFS で全国ネットワーク全探索になり 1〜2 秒以上かかる可能性 + UI が複雑化 (3 駅同時挿入チップ?)。札幌 ↔ 鹿児島中央のような両端ケースだけなので手動 fallback で実用上問題ない
- through_lines 表示は「乗換駅 1 件」単位で出すので、上野東京ライン↔高崎線のように 6 駅重なるケースでも「直通あり」付きで複数候補が並ぶ。UI 上は重複に見えるが、ソートで一番駅数の少ない 1 件が trump で来るので実害はないはず

---

## 215. v365 — 記録モード: 別系統 2 駅選択時に乗換駅候補を自動提案 (2026-05-27)

### 背景

記録モードで A 駅 (例: 浅草) と B 駅 (例: 新宿) を選ぶと、両方を含む単一の営業系統が無い場合「⚠️ 共通する運行系統がありません(乗換可能な駅を間に追加してください)」と表示されるだけで行き止まりだった。ユーザーは自分で乗換駅を思い出して間にタップする必要があり、土地勘の無い地域では特に詰まる。1 hop で繋がる経路は機械的に列挙できるので、候補を chip で並べてタップ 1 つで挿入できるようにする。

### 設計判断

- **1 hop only (v1)**: 「a を含む系統 linesA × b を含む系統 linesB」を直交で見て、両方に乗る駅 x を抽出する素直な実装。Japan の都市鉄道網だと 95%+ のケースで 1 hop で繋がるはず (例: 札幌 ↔ 鹿児島中央 のような長距離だけ落ちる)。2 hop は UI が複雑化するので必要が出たら v2 で
- **駅一致は id ベース (v293 で付与した `sl.stations[].id`)**: 同名異所の高松 3 駅問題 / 同名異所の伊勢崎 (東武・JR) 等で「物理的には乗換できない同名駅」を候補から除外できる。id 無いケースは name fallback (極稀)
- **ソートは「総駅数」昇順**: a→x along lineA + x→b along lineB の合計駅数。rec-panel の「合計 N駅」表示と完全一致させるため、乗換駅は 2 系統ぶん重複カウント (重複除外で 1 計算後に表示と 1 駅ズレた → 即修正)
- **chip タップで自動 pre-select**: 挿入と同時に `R.pairLineChoices` に lineA/lineB を set。dropdown で上書きはできる。「ユーザーは新宿乗換を選んだ → 銀座線→中央線快速を勝手に決めるのは余計」とも考えたが、勝手に決めて「気に入らなければ dropdown で変更」のほうが圧倒的に手数少ない
- **dedupe (駅単位)**: 同じ x を複数の (lineA, lineB) ペアが指す (例: 新宿 = 山手線→中央線 / 山手線→丸ノ内線 / 山手線→小田急) ことが頻発するので、駅ごとに最良 (totalStations 最小) のみ採用
- **Top 5**: モバイル rec-panel (max-height:50vh) に収まる範囲。それ以上は情報過多

### 変更

- [js/07-record-mode.js](js/07-record-mode.js):
  - `findCommonServiceLines` 直下に新規 3 関数を追加:
    - `resolveSelectionStationId(st)` — R.selection の `{name, lat, lon}` から `MERGED_STATIONS` の駅 id を逆引き (1e-5 tolerance)
    - `findTransferCandidates(a, b, maxResults=5)` — 1 hop 乗換候補を totalStations 昇順で返す。id ベース判定 + name fallback、駅単位 dedupe
    - `insertTransferStation(pairIdx, name, lat, lon, lineAId, lineBId)` — R.selection に挿入 + 既存 pairLineChoices を +1 シフト + lineA/lineB を pre-select。window 公開 (chip onclick から呼ぶため)
  - `refreshRecPanel` の `seg.error` 分岐を全面置換: 旧「乗換可能な駅を間に追加してください」テキストを撤廃し、`findTransferCandidates` の結果を縦並びチップで提示。lineA・lineB の色付きドット + 系統名 + 合計駅数を 1 chip に集約
  - 候補ゼロのときは「1 回乗換で繋がる経路が見つかりません。経由駅を手動で追加してください」とガイダンス
- [sw.js](sw.js): CACHE_VERSION v363 → v365 (v364 は no-deploy だった)

### 検証

- 浅草 → 新宿 (1 hop で繋がる典型例) で候補が出るか preview_eval で確認:
  - 神田 (銀座線 → 中央本線快速) 11駅 ← 最短
  - 秋葉原 (常磐新線 → 中央・総武各駅停車) 13駅
  - 浅草橋 (都営浅草線 → 中央・総武各駅停車) 14駅
  - 上野 (銀座線 → 山手線) 17駅
  - 大門 (都営浅草線 → 都営大江戸線) 18駅
  - 5 件で総駅数昇順、現実的にも妥当な順序
- 神田 chip をクリック → R.selection に `['浅草', '神田', '新宿']` 挿入、segments が `銀座線 浅草→神田 (7駅)` + `中央本線快速 神田→新宿 (4駅)` に分かれ、rec-panel 下部に「合計 11駅 / 乗換 1回」と表示。chip 内の「合計 11駅」と完全一致

### 残課題

- 2 hop 乗換 (e.g. 札幌 ↔ 鹿児島中央) は候補ゼロのまま「手動追加してください」フォールバック。需要が出たら 2 hop も実装 (UI 設計をどうするかが論点 — 経由 2 駅をまとめて 1 chip にするか、2 段階で出すか)
- through_lines (直通系統) は SERVICE_LINES の独立系統として表現されているため、「実質乗換不要」な区間も「乗換候補」として出る可能性。例: 副都心線 ↔ 東急東横線 の渋谷。今回触らず、必要なら through_lines を見て「直通あり」表示を追加

---

## 214. v364 (no deploy) — CHANGELOG 行数チェックを Stop hook → セッション末手続きに移管 (2026-05-27)

### 背景

v349 で `.claude/hooks/stop-reminder.js` に CHANGELOG.md 行数の機械チェック (1500 行超で警告) を追加していたが、ユスケから「changelogの行数の確認及び分割はセッション末の手続きに変更してください」との指示。毎ターンの警告は過剰、「終わったので手続きお願いします」の合図のときに人手で確認する流れに揃える。

### 設計判断

- **Stop hook の機械チェックを撤去**: 「自動補助は強制したいときに使う」(Notion §0「判断軸」) を再評価し、CHANGELOG 行数チェックは「強制したいほど厳密でない」(分割タイミングはユスケの体感判断もある)。セッション末で `wc -l` 一発で済む
- **CLAUDE.md のセッション末「合図で」セクションに手順を移動**: v349 で書いた分割手順 (5 ステップ) はそのまま、判定タイミングと「常にセット」原則も残す
- **Stop hook 自体は維持**: 「コード変更ありなのに CHANGELOG/TODO/STATUS 未更新」のリマインドは引き続き機能

### 変更

- [.claude/hooks/stop-reminder.js](.claude/hooks/stop-reminder.js): CHANGELOG.md 行数チェックブロック (約 17 行) を削除。`fs` / `path` の require も削除。冒頭コメントに v364 移管の旨追記
- [CLAUDE.md](CLAUDE.md): 「## CHANGELOG.md 行数チェックとアーカイブ手順 (v349〜)」見出しを撤去し、内容を「【セッション終了時・『終わったので手続きお願いします』の合図で】」セクションの先頭に移動。分割手順 5 ステップは変更なし

### 検証

- `node .claude/hooks/stop-reminder.js` → exit 0、何も出力されない (現状 CHANGELOG 変更前なので missing チェックも通る)
- ファイル行数: stop-reminder.js 75 → 55 行

### 運用ルール (v364〜)

- CHANGELOG.md 行数チェックは「終わったので手続きお願いします」の合図で `wc -l CHANGELOG.md` を実行
- 1500 行超なら分割 (CHANGELOG_PHASE*.md に退避 + STATUS.md 同時整理)
- Stop hook は「コード変更時の CHANGELOG/TODO/STATUS 反映漏れ」のみリマインド

---

