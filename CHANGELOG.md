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

## 196. v346 — 「GPS に変換」ボタン (retroactivelyVerifyTrip) を撤去 (2026-05-25)

### 背景
v345 で「📍 GPSで認証」→「📍 GPS に変換」と文言変更したが、ユスケから「旅程 (複数駅) の GPS 変換ってどういう仕組み?」と指摘。実装を読み返すと:

- 仕様: 現在地が **出発駅 OR 終着駅** のどちらかと 500m 以内なら、旅程全体を `verified=true` に昇格
- 副作用: キャラ獲得チェック ([js/03-characters.js:170](js/03-characters.js#L170) `checkAndGrantCharacters`) は `verified` trip の **segments[].from/to / from_station_id / to_station_id すべて** をスキャンするため、中間駅にもキャラ自動付与が波及

つまり「東京→博多」の手動 trip を作って博多で GPS 変換すれば、東京駅含む中間全駅のキャラが取れてしまう loose な実装だった。旧方針 (証明) の下でもこの抜けは放置されていた。

### 設計判断
- 新方針「GPS = 手動の手間省略、世間への証明不要」(v345) に照らせば「GPS に変換」自体の意味付けが薄い
- キャラ獲得を `verified` 限定 (v345 Q1) で残す前提では、loose な変換は「実際に来た駅」セマンティクスを壊す
- → ボタン + 関数 (`retroactivelyVerifyTrip`) ごと撤去するのがクリーン
- GPS 記録は記録モードでのみ生成される (📍 → 「ここから記録開始」フロー)。手動 trip は手動のまま

### 変更
- **削除**: [js/13b-trips.js](js/13b-trips.js) の `retroactivelyVerifyTrip` 関数 (118 行) + `window.retroactivelyVerifyTrip` / `NORIRECO.mypage.retroactivelyVerifyTrip` bridge
- **import 撤去**: 13b-trips から `distMeters` / `runCharacterGrantCheck` (関数削除に伴い未使用化)
- **撤去**: [js/13-mypage-common.js:602-604](js/13-mypage-common.js#L602) の `verifyBtn` (「📍 GPS に変換」ボタン生成 + tripCardHtml 配置)
- **案内文**: 「マイページではあなたの旅程・GPS 完駅率・GPS 変換が使えます」→ 「GPS 変換」削除
- **CSS**: noritetsu-map.html の `.mp-act-btn.verify` (green) 削除
- **コメント**: 13b-trips.js ファイルヘッダから「GPS 後追い認証」記述削除、フィルタバー「認証」→「種類」、撤去メモ追記

### 残り
- Phase 3-c (v314) `findStCoord(id, nameFallback)` も道連れで撤去された。CHANGELOG §162 / STATUS の Phase 3-c 行は履歴として残置 (機能は消えたが当時の id 化作業の事実は残る)

---

## 195. v345 — GPS 記録の位置づけ変更 + 不正検知撤回 + バッジ中立化 (2026-05-25)

### 背景・方針転換 (重要)
従来「GPS 記録 (verified=true) = 認証済み = 世間に対して『この記録は正しい』と証明する手段」「手動記録 = 自己申告」という設計だった。これを以下のように変更する:

- **新方針**: GPS 記録 = **手動記録の煩わしい手間を省く便利機能**。世間への「証明」は不要。
- 結果として「不正検知 (速度チェック → suspicious 降格)」「🟡 要確認バッジ」「verified 限定シェアガード」「verified を守るための時刻ロック」など、証明を担保する周辺装置は全て不要になる。

### 設計判断
- verified 列は内部実装として残す (キャラ獲得が「実際に GPS で来た駅」を判定する目印、Phase 3-c 後追い認証、統計タブの GPS のみ完駅率カードで使用)。世間向けの「証明」表現だけ撤回。
- 不正検知 (`js/11-fraud-detection.js`) は完全削除 (CLAUDE.md「backwards-compatibility shims を残さない」に従い、スタブ化ではなくクリーン削除)。
- バッジは「📍 GPS」「📝 手動」の中立 2 値に統一。色は GPS=ブルー (情報的)、手動=シルバー (中立)。
- 旅程編集の「GPS 記録は時刻を編集できません (verified を守るため)」を撤回。自分の記録なので自分で直せるべき。
- キャラ獲得は引き続き verified 限定 (自分の達成感の担保として「実際に来た目印」は残す)。
- 「📍 GPSで認証」ボタンは「📍 GPS に変換」へ文言変更 (機能は維持: 手動 trip を半径 500m 以内の GPS で verified に昇格させる)。
- 垢BAN は保留 (発動条件から「不正検知連動」を撤回、スパム量・通報など別軸を将来検討)。
- シェアの verified 限定ガードは TODO から撤回。

### 変更ファイル
- **削除**: [js/11-fraud-detection.js](js/11-fraud-detection.js) (177 行、`fraudAssessTrip` / `fraudIsDowngraded` / 速度マップ・定数すべて)
- **削除参照**: [sw.js:31](sw.js#L31) / [scripts/syntax-check.js:43](scripts/syntax-check.js#L43) / [noritetsu-map.html:1599](noritetsu-map.html#L1599) (script tag)
- **import 撤去**: [js/07-record-mode.js](js/07-record-mode.js) / [js/09-tabs-stats.js](js/09-tabs-stats.js) / [js/13-mypage-common.js](js/13-mypage-common.js) / [js/13a-stats.js](js/13a-stats.js) / [js/13b-trips.js](js/13b-trips.js) の `import { ... } from './11-fraud-detection.js'` 全削除
- **fraud ブロック削除**: 07-record-mode.js の `fraudAssessTrip` 呼出 + `_elapsed_sec` ハンドリング + `elapsedSec` 変数 + 🟡 トースト 8 秒表示
- **バッジ中立化**: 13-mypage-common (tripCardHtml) / 09-tabs-stats (直近の旅程行) / 07-record-mode (確認モーダルバッジ + 保存ボタン) / 13a-stats (完駅率カード + buildAuthBreakdown + 説明文 + ⑨ 認証グラデーション内訳)
- **フィルタ option**: 13b-trips の「🛡 認証 (verified / manual / suspicious)」を「📋 種類 (GPS / 手動)」に
- **時刻ロック撤回**: 13b-trips の `isVerifiedGps` 分岐削除 (openTripEditModal + saveTripEdit 両方)、noritetsu-map.html の `trip-edit-time-lock` 案内文撤去
- **CSS**: noritetsu-map.html の `.mp-badge.suspicious` / `.mp-d-bar-seg.suspicious` 削除、`.mp-badge.verified` を green → blue に色変更
- **TODO.md**: シェア 「verified 限定ガード」削除、垢BAN 発動条件改、布石 #6 改、AI 自動列車判定の不正検知統合注記改、用語行に v345 注記追加
- **STATUS.md**: 領域別ステータスに v345 行追加、直近のフェーズ末尾に追記

### 関連
- v138 GPS 後追い認証 (CHANGELOG_PHASE3.8-early)
- v344 後追いバッジ GPS 限定化 (CHANGELOG §194)
- Notion §0.2 大方針 4「事業誘導も verified 認証中心に」「不正検知・認証グラデーションが骨格」 → セッション末手続きで Notion 更新が必要

### 残り
- Notion §0.2 大方針 4 の文言更新 (セッション末)
- Notion §2.8 自動記録・乗車検知設計の「verified」周辺記述見直し
- Notion §2.7 命名辞書に「verified の意味変更」エントリ追加 (意思決定ログ)

---

## 194. v344 — 「📝 後追い」バッジ + 「📌 記録」行を GPS 記録 (verified) 限定に (2026-05-25)

### 背景
旅程カードの `📝 後追い` バッジと `📌 記録: YYYY-MM-DD HH:MM` 行は、`recorded_at` と `date` が同日でない / または `date_precision = 'unknown'` のとき出していた (v181 由来)。当初 GPS 記録の「即時記録」を前提に「乗車日と記録日のズレ = 異例」のシグナルとして導入したが、手動記録はそもそも「あとから入力」がデフォルト (今日昼の乗車を夜にまとめて入力 / 過去の旅程を思い出して入力など) のため、手動記録カードのほぼ全てに後追いバッジが付いてしまい情報量がゼロ・むしろノイズになっていた。

### 設計判断
- `trip.verified === true` のとき (GPS 記録) のみ判定を走らせる
- GPS 記録で当日記録 → バッジなし (普通)
- GPS 記録で後追い認証 (`retroactivelyVerifyTrip` で半径 500m 内に来て verified=true に昇格) → 📝後追い + 📌 記録 (異例だと一目でわかる)
- 手動記録 → バッジも行も非表示

### 変更
- [js/13-mypage-common.js:549-573](js/13-mypage-common.js#L549): `if (trip.recorded_at)` を `if (trip.verified && trip.recorded_at)` に変更。`recordedAtStr` と `isAfterTheFact` を一括で GPS 記録だけに gating。`afterTheFactBadge` / `recordedAtLine` の生成式は変更なし (str / bool が空のまま渡るので自動的に出力されない)
- 旅程編集モーダル (v226 拡張) の「🕒 乗車時刻ロック」(GPS = ロック、手動 = フル編集) の仕分けと整合

### 関連
- v181 後追い記録モード拡張 (CHANGELOG_PHASE3.8-early)
- v226 旅程編集モーダル 5 セクション化 (CHANGELOG §75)

---

## 193. v343 — Phase D3: 第三セクター北陸・東北 + 福岡空港線 + 私鉄細支線 関東 (23 ペア / 46 ref) (2026-05-25)

### 背景

Phase D2 (v341) で名古屋エリアまで埋まり、残るのは第三セクター・地方都市地下鉄・私鉄支線。一気に Phase D3 として 23 ペアを追加。through_lines 持ち系統 112 → **142 / 642 (22.1%)**。

### 追加した 3 グループ / 23 ペア

| グループ | ペア | 内容 |
|---|---|---|
| G1 第三セクター北陸・東北 (7) | ハピライン↔IRいしかわ (大聖寺) / IRいしかわ↔あいの風 (倶利伽羅) / IRいしかわ↔JR七尾 (津幡) / あいの風↔トキめき日本海ひすい (市振) / トキめき妙高はねうま↔しなの鉄道北しなの (妙高高原) / しなの鉄道↔JR篠ノ井 (篠ノ井) / IGRいわて銀河↔青い森 (目時) | 旧 JR 北陸本線/信越本線/東北本線 を新幹線開業時に第三セクター転換した路線同士の越境運行 |
| G2 福岡 (1) | 福岡市営空港線↔JR筑肥線 | 姪浜で JR 筑肥線が福岡空港まで直通 |
| G3 私鉄細支線 関東 (15) | 京急本線↔久里浜/逗子/空港 (Phase B 漏れ補正) / 西武新宿↔拝島/国分寺/西武園 / 西武池袋↔狭山/西武秩父/豊島 / 小田急↔江ノ島/多摩 / 京王↔相模原/高尾 / 東武伊勢崎↔日光 / 東武日光↔鬼怒川 | 本線↔支線の社内直通、京急本線↔空港線は Phase B 時に意図的 skip したのを再評価して補正 |

### 変更

- **tools/add_phase_d3_through_lines.js**: 新規
- **service_lines_master.json**: 46 ref 追加
- **sw.js**: CACHE_VERSION v342 → v343

### 設計判断

- **京急本線↔空港線**: Phase B (v336) では「京急内会社内、本線↔浅草線経由で間接的に表現」と判断して skip したが、京急蒲田での実質直通 (エアポート急行・エアポート快特) を考えると書く方が筋。Phase B 漏れ補正として追加
- **第三セクター↔JR**: 「直通運転がある」関係に絞った。IRいしかわ↔JR七尾線 (津幡で IR 車両が JR 入線) / しなの鉄道↔JR篠ノ井線 (しなの鉄道車両が篠ノ井線経由で長野まで JR 入線) など、運用実態のあるものだけ
- **北陸新幹線↔第三セクター**: 接続するが直通運転は無い (新幹線/在来線で物理接続せず、乗換のみ)。through_lines は「直通運転」用なので skip
- **仙台/札幌市営地下鉄**: いずれも他社直通無し → skip。福岡だけ空港線が JR 筑肥線直通あり
- **東武野田線 (アーバンパークライン)**: 大宮・春日部・柏・船橋を結ぶが伊勢崎線とは接続のみで直通無し → skip
- **西武多摩湖線/多摩川線/山口線**: 多摩湖線は萩山で拝島線と接続するが新宿線とは直通せず、多摩川線/山口線は完全独立で skip

### 検証

- node tools/add_phase_d3_through_lines.js: 46 ref 追加, broken 0, unidi 0
- through_lines 持ち系統 112 → **142 / 642 (22.1%)**

### 残り (重要度低)

through_lines 設計上の主要な穴は概ね埋まった。残るのは:
- 関東: つくばエクスプレス (独立) / 多摩モノレール / りんかい線↔JR埼京以外
- 関西: 阪堺電気軌道 (路面、独立) / 京福電気鉄道嵐電 / 神戸新交通など
- 地方: 名古屋市営東山線↔リニモ (接続のみ、直通無し) / 仙台市内 / 札幌市内 / 広島電鉄 (路面)

これらは大半が「接続のみで直通無し」または「独立運営」のため、through_lines に書く価値は限定的。

---

## 192. v342 — s0/s1 セグメント分割路線の sibling 機構 (案 B 採用) (2026-05-25)

### 背景

国土地理院 N02 polyline 由来で同一運行路線が複数 ID に分割されているケース 10 路線あり:
- 大阪メトロ中央線 (s0/s1, 夢洲延伸)
- 大阪メトロニュートラム南港ポートタウン線 (s0/s1)
- 北大阪急行南北線 (s0/s1, 箕面延伸)
- 近鉄けいはんな線 (s0/s1, 大阪側/奈良側)
- 広島新交通1号線 (s0/s1)
- 神戸新交通 六甲アイランド線 (s0/s1)
- 神戸新交通 ポートアイランド線 (s0/s1)
- 富山地方鉄道 本線 (s0/s1)
- 富山地方鉄道 富山港線 (s0/s1)
- 福井鉄道 福武線 (s0/s1)

v337 時点では through_lines を主たる接続駅を含む s0 側のみに書いたため、ユーザーが s1 polyline をクリックしても直通先が表示されない問題があった。

### 設計判断 — 案 B (builder で sibling 機構)

3 案中、案 B を採用:
- 案 A (s1 にも冗長に through_lines を書く): データに重複、s0/s1 が同一路線という意味的情報なし
- **案 B (採用): builder で operator+name グルーピング → siblingIds → UI で merge** — データ無変更、ロジック追加だけで根本解決
- 案 C (スキーマ拡張 + データ統合): 重い、将来 LINES polyline 統合と一緒に検討

### 副作用チェック

`operator + name` で 2 系統以上が同じキーに入るグループを全件抽出した結果、**10 グループすべてが正当な s0/s1 分割** で、意図せぬ衝突 (例: 異なる路線が同 operator+name でグループ化される) はゼロ。`operator + name` を安全にグループキーとして使える。

### 変更

- **js/02b-service-lines-builder.js**: SERVICE_LINES 構築後に operator+name でグループ化、各 sl に `siblingIds: string[]` を追加 (同 operator+name 他系統の id 配列)
- **js/17-station-actions.js**: 路線アクションシートの「🔀 直通先」生成時、自系統の through_lines だけでなく sibling の through_lines も merge (自己参照 + 重複は除外)。これで s1 をクリックしても s0 側に書かれた直通先が表示される
- **sw.js**: CACHE_VERSION v341 → v342

### 期待される効果

例: ユーザーが 近鉄けいはんな線の **奈良側 (s1)** polyline をクリック → アクションシートに「🔀 直通先: 大阪メトロ中央線」が出る (これまでは s0 = 大阪側にしか書かれていなかったため何も出なかった)。

逆もしかり: 大阪メトロ中央線 _s1 (夢洲延伸) クリック → 「🔀 直通先: 近鉄けいはんな線」が出る。

### 検証

- syntax check 2/2 OK (02b-service-lines-builder.js / 17-station-actions.js)
- 副作用ゼロを実測 (10 グループ全部が正当な s0/s1 分割)
- 実機での UI 目視確認は v342 デプロイ後

### 残り

- 北陸新幹線↔IRいしかわ/あいの風とやま/ハピライン (第三セクター転換系)
- 仙台/福岡/札幌市営地下鉄
- 私鉄の細かい支線

s0/s1 統合改善ができたので、through_lines まわりの設計負債は概ね解消。

---

## 191. v341 — Phase D2: 名古屋エリア through_lines 19 ペア (38 ref) 追加 (2026-05-25)

### 背景

through_lines 持ち系統 84 / 642 (13.1%) で関東/関西の主要直通は揃ったが、名古屋エリアが空。名鉄相互直通網 (15 ペア) + 名古屋市営地下鉄↔名鉄 (3 ペア) + JR東海 武豊線直通 (1 ペア) の 19 ペアを一気に追加。

### 追加した 3 グループ / 19 ペア

| グループ | ペア | 接続駅 |
|---|---|---|
| G1 名鉄相互直通 (15) | 名古屋本線↔犬山/常滑/西尾/三河/豊川/津島/竹鼻, 犬山↔各務原/広見, 常滑↔空港/河和, 河和↔知多新, 西尾↔蒲郡, 津島↔尾西, 竹鼻↔羽島 | 枇杷島分岐/神宮前/新安城/知立/国府/須ヶ口/笠松/新鵜沼/犬山/常滑/太田川/富貴/吉良吉田/津島/江吉良 |
| G2 名古屋市営地下鉄↔名鉄 (3) | 鶴舞線↔犬山線 / 鶴舞線↔豊田線 / 上飯田線↔小牧線 | 上小田井/赤池/上飯田 |
| G3 JR東海 (1) | 武豊線↔東海道本線 | 大府 (直通快速・区間快速) |

これで名古屋エリアの主要直通が through_lines に揃った。名古屋本線が「名鉄ネットワークのハブ」として全 7 系統 (犬山/常滑/西尾/三河/豊川/津島/竹鼻) に直結する状態に。

### 変更

- **tools/add_nagoya_through_lines.js**: 新規 (3 グループ ID 定数化 + 冪等 + 双方向 + assert)
- **service_lines_master.json**: 38 ref 追加
- **sw.js**: CACHE_VERSION v340 → v341

### 設計判断

- **名鉄名古屋本線↔犬山線の接続駅**: 物理的な接続は枇杷島分岐だが、運行系統としては名鉄名古屋経由で全列車が直通するため備考に「枇杷島分岐(名鉄名古屋経由)」と書いた。実態を捉えた表現
- **名鉄空港線を独立直通扱い**: 常滑線の支線とも言えるが、常滑〜中部国際空港の独立 ID `auto_空港線_名古屋鉄道` があるので、京急空港線とは異なり接続を書く (中部国際空港アクセス特急の重要性)
- **JR中央本線 (名古屋〜中津川〜塩尻) と関西本線 (名古屋〜亀山)**: 名古屋駅で接続するが直通運転は無いため skip。中央本線は東日本/東海で別 ID なので接続するなら別 v で検討
- **愛知環状鉄道**: 一時期 JR中央本線と直通運転していたが、現在は別運営。接続するなら需要次第で別 v に
- **東部丘陵線 (リニモ)**: 名古屋市営東山線藤が丘で接続するが直通運転なし (リニモは磁気浮上式で他路線と物理接続不可)。skip

### 検証

- node tools/add_nagoya_through_lines.js: 38 ref 追加, broken 0, unidi 0
- through_lines 持ち系統 84 → **112 / 642 (17.4%)**

### 残り

- s0/s1 セグメント分割路線の統合改善 (中央線/けいはんな/北大阪急行) — スキーマ拡張案件で重い
- 北陸新幹線↔第三セクター転換系 (IRいしかわ/あいの風とやま/ハピライン)
- 仙台市営地下鉄、福岡市営地下鉄、札幌市営地下鉄等の中規模都市
- 私鉄の細かい支線

---

## 190. v340 — 山陽電鉄 through_lines 補完 (Phase C 漏れ 2 ペア) (2026-05-25)

### 背景

v337 Phase C で `grep '山陽電'` を line.name / official_line で検索したため、`auto_本線_山陽電気鉄道` (name='本線') と `auto_網干線_山陽電気鉄道` (name='網干線') が引っかからず、「山陽電鉄は service_lines_master に未追加」と誤判断。実際は両方とも既存で、through_lines 未設定の状態だった。今回 merged_stations から 49 駅が `auto_本線_山陽電気鉄道` に所属していることに気づき、漏れを補完。

### 追加した 2 ペア / 4 ref

| 元 | 先 | 接続駅 | 列車 |
|---|---|---|---|
| 山陽電鉄本線 | 阪神神戸高速線 | 西代 | 直通特急 山陽姫路〜阪神大阪梅田 |
| 山陽電鉄本線 | 山陽電鉄網干線 | 飾磨 | 社内 (本線/網干線) |

これで「Phase C 神戸高速線 3 社相互 (新開地)」(阪急/阪神/神鉄) に山陽電鉄本線が「阪神神戸高速線→阪神本線まで navigable」で接続される。新開地で乗り換える従来の経路よりも、直通特急 (西代経由) の実態を表現できる。

### 変更

- **tools/add_sanyo_dentetsu_through.js**: 新規 (冪等 + 双方向 + assert)
- **service_lines_master.json**: 4 ref 追加
- **sw.js**: CACHE_VERSION v339 → v340

### 教訓

「データが無い」と判断する前に、`operator` フィールドや merged_stations.stations[].lines でクロスチェックすべき。`grep '山陽電'` を line.name / official_line にだけ通すのは不十分 (auto_* 系統は name が `本線` 等の短縮名のことが多く、operator フィールドに会社名が入る)。今後の through_lines 追加スクリプトでは:
1. service_lines_master を operator/operator_id でフィルタ
2. merged_stations.stations[].lines に出現する line.id を逆引き
の 2 段階で確認する。

### 検証

- node tools/add_sanyo_dentetsu_through.js: 4 ref 追加, broken 0, unidi 0
- through_lines 持ち系統 82 → **84 / 642**

---

## 189. v339 — 山形/秋田 ミニ新幹線を独立系統として新設 + 東北新幹線と through_lines 接続 (2026-05-25)

### 背景

Phase A (v335) で「新幹線網の through_lines」を扱った時、山形・秋田新幹線はミニ新幹線で奥羽本線/田沢湖線の在来線軌道を走るため、service_lines_master に独立 ID が無く対象外とした。TODO で「v334 青梅線方式で `yamagata_shinkansen` / `akita_shinkansen` を新設」を予告していたものを完遂。

### 設計

採用案 B: **独立系統新設 (青梅線方式)**。実体としては在来線 (奥羽本線・田沢湖線) を改軌してミニ新幹線車両が走るが、ユーザー体験的に「つばさ/こまち乗車を奥羽線として記録」されるのは違和感。同じ駅が複数系統に所属する (`福島` が東北新幹線・奥羽線・山形新幹線の 3 系統など) が、完駅率は駅 id ベース (v293〜) なのでダブルカウントしない。

### 追加した 2 系統

| ID | 名前 | 区間 | 駅数 | 色 | 接続 |
|---|---|---|---|---|---|
| yamagata_shinkansen | 山形新幹線 (つばさ) | 福島〜新庄 | 11 | #B11283 (E3/E8系紫) | 東北新幹線 (福島で併結) |
| akita_shinkansen | 秋田新幹線 (こまち) | 盛岡〜秋田 | 6 | #BE0028 (E6系ルージュ) | 東北新幹線 (盛岡で併結) |

through_lines は双方向 (yamagata ↔ 東北 / akita ↔ 東北)。これで新幹線網は東海道↔山陽↔九州 + 東北↔北海道 + 東北↔山形/秋田 の全直通が出揃った。

### 変更

- **tools/add_mini_shinkansen.js**: 新規。冪等な新規系統追加 + 東北新幹線への双方向 ref 追加 + assert (broken refs 0, unidirectional refs 0)
- **service_lines_master.json**: 2 系統追加 (640 → 642)、through_lines 4 ref 追加 (双方向 2 ペア)
- **sw.js**: CACHE_VERSION v338 → v339

### 設計判断 — official_line の選び方

`02b-service-lines-builder.js` は SERVICE_LINES_MASTER の駅順から実座標を解決するとき、N02 LINES (lines-p?.json) の candidate を `officialMatch` (LINES.name.startsWith(official_line)) または `overlap >= 2` で紐づける。

- yamagata_shinkansen.official_line = `'奥羽線'` (LINES の name は「奥羽線」、当初「奥羽本線」と書いて修正)
- akita_shinkansen.official_line = `'田沢湖線'` (実体は田沢湖線 + 奥羽本線だが、田沢湖線で 5/6 駅 overlap、残りの「秋田」も奥羽線 candidate (overlap>=2 で自動採用) から座標解決される)

教訓: 新規手動キュレーション系統の `official_line` は **N02 LINES.name と完全一致するもの** にする必要がある。startsWith なので途中までは OK だが、`'奥羽本線'` のように LINES の name 'プレフィックス' でないものは hit しない。

### 検証

- node tools/add_mini_shinkansen.js: 2 系統追加 + 4 ref 追加, broken refs 0, unidirectional refs 0
- node tools/fix_bidirectional_through_lines.js: 片方向参照 0 件検出 (双方向化完璧)
- through_lines 持ち系統 80 → 82 (山形/秋田/東北新幹線 が +1 ずつ更新)

### 残り

- 名古屋エリア (名鉄/JR東海/名古屋市営)
- 北陸新幹線↔IRいしかわ/あいの風とやま/ハピライン (第三セクター転換系)
- s0/s1 セグメント分割路線の統合改善
- 山陽電鉄本線の service_lines_master 追加

---

## 188. v338 — through_lines 双方向化バグ修正 (v334 由来の片方向参照 8 件) (2026-05-25)

### バグ報告

ユスケが v337 verify 中に発見:
- 「JR京都線 → 琵琶湖線 へは飛べるが、琵琶湖線シートには直通先が出ず JR京都線 に戻れない」
- 「JR神戸線 → 山陽本線 も同じ症状」

### 原因

v334 で 6 つの broken refs を直したとき、参照元側 (`jr_kyoto_line.through_lines = [jr_kobe_line, jr_biwako_line]` 等) は正しく書いたが、**参照先側 (`jr_biwako_line.through_lines`) に逆方向 ref を追加していなかった**。同様に v334 で書いた `jr_ueno_tokyo_line` / `jr_shonan_shinjuku_line` も派生路線 (宇都宮/高崎/常磐中距離/横須賀) への片方向 ref のまま。

Phase A〜C (v335〜v337) の新規追加は `addRef(a,b)` + `addRef(b,a)` で常に双方向にしていたが、v334 由来の既存 ref は監査漏れ。

### 監査結果と修正

`tools/fix_bidirectional_through_lines.js` を新規作成。全 through_lines を走査して片方向参照を検出 → 自動修正。

検出された 8 件:
- jr_utsunomiya_line ← jr_ueno_tokyo_line
- jr_takasaki_line ← jr_ueno_tokyo_line
- jr_joban_medium ← jr_ueno_tokyo_line
- jr_utsunomiya_line ← jr_shonan_shinjuku_line
- jr_takasaki_line ← jr_shonan_shinjuku_line
- jr_yokosuka_line ← jr_shonan_shinjuku_line
- jr_biwako_line ← jr_kyoto_line (ユスケ報告)
- jr_sanyo_main ← jr_kobe_line (ユスケ報告)

修正後の `jr_utsunomiya_line.through_lines` = `[jr_ueno_tokyo_line, jr_shonan_shinjuku_line]` のように、宇都宮/高崎線は両ハブからの直通を持つ正しい状態に。

### スクリプトの assert

修正後に再監査して `unidirectional refs: 0` + `broken refs: 0` の両方を assert してから write。今後 v339 以降で新規追加した時の網羅監査ツールとしても使える。

### 変更

- **tools/fix_bidirectional_through_lines.js**: 新規 (汎用片方向参照検出 + 自動双方向化 + assert)
- **service_lines_master.json**: 8 ref 追加 (`updated_at: 2026-05-25`、640 系統のまま)
- **sw.js**: CACHE_VERSION v337 → v338

### 教訓

v334 で broken refs を直したとき「ref を書く」だけで満足し、「逆方向 ref も書く」ことを忘れていた。through_lines は本質的に **対称関係** (A が B に直通するなら B も A に直通する) なので、データ操作スクリプトは常に双方向で書くべきだった。Phase A〜C のスクリプトでは `addRef(a, b)` と `addRef(b, a)` を必ずペアで呼んでいたが、v334 のスクリプト (add_3_through_lines.js) では「broken ref の文字列を rename」する操作だったので双方向化のことが頭から抜けた。

今後の予防策: `fix_bidirectional_through_lines.js` を CI 的に through_lines 編集後に必ず通す運用にすれば、片方向参照は機械的に検出できる。

---

## 187. v337 — Phase C: 関西主要 27 直通ペア (54 ref) を through_lines に追加 (2026-05-25)

### 背景

v336 (Phase B 関東) に続き、関西の主要相互直通運転を一気にカバー。13 グループ計 27 ペア / 54 ref。through_lines 持ち系統は 46 → **80 / 640**。

### 追加した 13 グループ / 27 ペア

| グループ | ペア | 接続駅 |
|---|---|---|
| G1 阪急-堺筋-千里-嵐山 (4) | 阪急京都↔堺筋 / 阪急千里↔堺筋 / 阪急京都↔阪急千里 / 阪急京都↔阪急嵐山 | 天神橋筋六丁目/淡路/桂 |
| G2 阪急神戸-神戸高速 (1) | 阪急神戸↔阪急神戸高速 | 新開地 |
| G3 阪神なんば-近鉄 (2) | 阪神なんば↔近鉄奈良 / 阪神なんば↔阪神本線 | 大阪難波/尼崎 (奈良-神戸快速急行) |
| G4 阪神-神戸高速 (1) | 阪神本線↔阪神神戸高速 | 元町 |
| G5 神戸高速線 3 社相互 (3) | 阪急神戸高速↔阪神神戸高速 / 阪急神戸高速↔神鉄神戸高速 / 阪神神戸高速↔神鉄神戸高速 | 新開地 |
| G6 京阪内部 (4) | 京阪本線↔鴨東 / 京阪本線↔中之島 / 京阪本線↔交野 / 京阪本線↔宇治 | 三条出町柳/天満橋/枚方市/中書島 |
| G7 京阪京津-京都市営東西 (1) | 京阪京津↔京都市営東西 | 御陵 |
| G8 近鉄内部 (5) | 近鉄奈良↔難波 / 奈良↔京都 / 京都↔橿原 / 大阪↔難波 / 南大阪↔吉野 | 大阪上本町/大和西大寺/橿原神宮前 |
| G9 大阪メトロ中央-近鉄けいはんな (1) | 大阪メトロ中央_s0 ↔ 近鉄けいはんな_s0 | 長田 |
| G10 御堂筋-北大阪急行 (1) | 御堂筋 ↔ 北大阪急行_s0 | 江坂 |
| G11 環状-ゆめ咲 (1) | 大阪環状↔桜島 | 西九条 (USJ) |
| G12 関西空港 (2) | JR阪和↔JR関西空港 / 南海本線↔南海空港 | 日根野/泉佐野 (関空快速・はるか・ラピート) |
| G13 南海高野-泉北 (1) | 南海高野↔南海泉北 | 中百舌鳥 |

### 変更

- **tools/add_kansai_through_lines.js**: 新規
- **service_lines_master.json**: 54 ref 追加 (`updated_at: 2026-05-25`、640 系統のまま)
- **sw.js**: CACHE_VERSION v336 → v337

### 設計判断 — s0/s1 セグメント分割の扱い

国土地理院 N02 polyline 由来で、同一運行路線が複数 ID に分割されているケースが 3 路線ある:
- 大阪メトロ中央線: s0 (長田〜朝潮橋 12 駅) + s1 (大阪港〜夢洲 3 駅、夢洲延伸)
- 近鉄けいはんな線: s0 (新石切〜長田 4 駅、大阪側) + s1 (生駒〜学研奈良登美ヶ丘 4 駅、奈良側)
- 北大阪急行南北線: s0 (千里中央〜江坂 4 駅) + s1 (箕面船場阪大前〜箕面萱野 2 駅、2024 北方延伸)

through_lines は接続駅を含む s0 側にのみ書いた。s1 はデータ的に本線から離れた延伸/分岐セグメントで、接続駅 (長田 / 江坂 など) を含まないので意味的に書けない。ユーザーが s1 セグメントの polyline をクリックした場合は直通先が表示されないが、本来同じ路線なので s0 から navigable に辿れる。

将来的な改善案:
- (案 a) s0/s1 を統合する main_id をスキーマに追加し、through_lines を main_id 単位で扱う
- (案 b) s0/s1 両方に同じ through_lines を書く (重複データ管理が必要)
- (案 c) builder で operator + name でグルーピングして runtime に統合

### 検証

- node tools/add_kansai_through_lines.js: 54 ref 追加, broken refs 0, total 640
- JSON parse OK

### 残り (TODO)

- 山形/秋田ミニ新幹線の独立系統新設 + 東北新幹線への through_lines (青梅線方式)
- 北陸新幹線↔IRいしかわ/あいの風とやま/ハピライン (新幹線開業に伴い JR から第三セクター転換した路線同士の接続)
- 名古屋エリア (名鉄/JR東海/名古屋市営地下鉄など)
- 山陽電鉄本線が service_lines_master 未追加 (阪神/阪急直通特急のため追加価値あり)

through_lines 持ち系統 80 / 640 (12.5%) で主要都市圏は概ねカバー。残りは長距離路線・第三セクター転換系の補完が中心。

---

## 186. v336 — Phase B: 関東主要 26 直通ペア (52 ref) を through_lines に追加 (2026-05-25)

### 背景

v335 で新幹線 3 ペアまで完了。Phase B として関東の主要相互直通運転を一気にカバーする。9 グループ計 26 ペア / 52 ref。through_lines 持ち系統は 14 → **40 系統**に。

### 設計モデル

「直接接続している路線同士」のみ書く (v334 osaka_loop_line ↔ jr_yamatoji_line スタイル踏襲)。
副都心線 → 東横線 → みなとみらい線 のような 3 段直通は、副都心↔東横、東横↔みなとみらい の 2 ペアで表現し、副都心↔みなとみらい は書かない。ユーザーは路線アクションシートの「🔀 直通先」で 1 ホップずつ navigable に辿る。

### 追加した 9 グループ / 26 ペア

| グループ | ペア | 接続駅 / 列車 |
|---|---|---|
| G1 京急-浅草-京成-北総 (5) | 京急本線↔都営浅草線 / 浅草↔京成押上 / 押上↔京成本線 / 押上↔北総 / 京成本線↔成田空港線 | 泉岳寺/押上/青砥/京成高砂/京成成田 |
| G2 副都心線+東横+みなとみらい (4) | 副都心↔東横 / 東横↔みなとみらい / 副都心↔東上本線 / 副都心↔西武有楽町 | 渋谷/横浜/和光市/小竹向原 (F ライナー) |
| G3 有楽町線 (2) | 有楽町↔東上本線 / 有楽町↔西武有楽町 | 和光市/小竹向原 |
| G4 西武 (1) | 西武有楽町↔西武池袋 | 練馬 |
| G5 半蔵門線 (2) | 半蔵門↔田園都市 / 半蔵門↔伊勢崎 | 渋谷/押上 (スカイツリーライン) |
| G6 千代田線 (2) | 千代田↔小田原線 / 千代田↔常磐線各駅 | 代々木上原/綾瀬 |
| G7 東西線 (2) | 東西↔東葉高速 / 東西↔中央・総武緩行 | 西船橋/中野・西船橋 |
| G8 目黒-南北-三田-埼玉高速-相鉄 (6) | 目黒↔三田 / 目黒↔南北 / 南北↔埼玉高速 / 目黒↔東急新横浜 / 東急新横浜↔相鉄新横浜 / 相鉄新横浜↔相鉄本線 | 目黒/赤羽岩淵/日吉/新横浜/西谷 |
| G9 埼京-りんかい-川越 (2) | 埼京↔りんかい / 埼京↔川越 | 大崎/大宮 |

### 変更

- **tools/add_kanto_through_lines.js**: 新規。9 グループの ID を定数化、冪等な双方向追加、broken refs == 0 assert
- **service_lines_master.json**: 52 ref 追加 (`updated_at: 2026-05-25`、640 系統のまま)
- **sw.js**: CACHE_VERSION v335 → v336

### 設計判断

- **ハブ navigable vs 全直通記述**: 「ハブ navigable」 (1 ホップずつ辿る) を選択。理由は (1) v334 のスキーマと UI がそのモデル前提、(2) 「副都心↔みなとみらい」のような 2 ホップ先は実体としては東横線を経由する別物 (種別やダイヤが違う) なので、データ的にも 1 ホップ単位の方が正確
- **「同一会社内の支線・本線」を through_lines に入れるか**: 京成本線↔京成押上線 / 京成本線↔成田空港線 / 西武有楽町↔西武池袋 / 相鉄新横浜↔相鉄本線 は入れた。理由は接続駅で実際に直通列車が走り、ユーザーが知りたいのは「会社境界」より「直通の事実」だから
- **京急空港線↔京急本線**: あえて入れなかった。空港線は「都営浅草線への直通幹線」として独立し、京急本線↔浅草線 のペアで間接的に表現される。空港線↔本線 を追加すると京急内のホップが冗長になる
- **東急東横線↔東武東上本線 / 西武池袋線↔東武東上本線**: F ライナーは副都心線を介して直通するが、「直接接続している駅」が無いため books out (副都心↔東上、副都心↔東横 のホップで辿れる)

### 検証

- node tools/add_kanto_through_lines.js: 52 ref 追加, broken refs 0, total 640
- JSON parse OK

### 残り

- 関西相互直通 (阪急京都↔堺筋線、阪神なんば↔近鉄奈良、神戸高速線関連 ほか) — Phase C
- 山形/秋田ミニ新幹線の独立系統新設 — 別フェーズ (青梅線方式で新規系統作成が必要)

---

## 185. v335 — 新幹線 3 直通ペアを through_lines に追加 (双方向) (2026-05-25)

### 背景

v334 で through_lines は土台 (broken refs == 0, 路線アクションシート「🔀 直通先」UI 動作中) が整ったが、9 系統しか実データが入っていなかった。新幹線 9 系統はすべて `through_lines: []` のまま。事実関係が明らかで件数も少ない新幹線から手を付ける。

### 追加した 3 ペア (6 ref / 双方向)

| 元 | 先 | 経由駅 | 列車 |
|---|---|---|---|
| 東海道新幹線 | 山陽新幹線 | 新大阪 | のぞみ・ひかり・さくら・みずほ |
| 山陽新幹線 | 九州新幹線 | 博多 | さくら・みずほ |
| 東北新幹線 | 北海道新幹線 | 新青森 | はやぶさ |

各ペアは双方向に書き込み (path A→B / B→A 計 6 ref)。これで山陽新幹線は東海道・九州の両方を持つ「ハブ」になる。

### 対象外と理由

- **上越新幹線・北陸新幹線**: 大宮で東北新幹線と分岐線を共有するが直通運転は行わない (大宮〜東京は線路共有・列車運用は独立)。through_lines 候補外
- **西九州新幹線**: 武雄温泉での在来線リレー特急 (リレーかもめ) はあるが、新幹線同士の直通ではない。在来線リレーは表現困難なため対象外
- **山形新幹線 (つばさ) ・秋田新幹線 (こまち)**: 福島〜新庄 / 盛岡〜秋田 は奥羽線・田沢湖線の在来線軌道をミニ新幹線が走るのが実体で、service_lines_master には独立系統が存在しない (auto_奥羽線_東日本旅客鉄道 / auto_田沢湖線_東日本旅客鉄道 のみ)。v334 の青梅線方式 (手動キュレーション系統を新設) で `yamagata_shinkansen` / `akita_shinkansen` を作る別フェーズで対応する

### 変更

- **tools/add_shinkansen_through_lines.js**: 新規。冪等な双方向書き込み + broken refs == 0 を assert してから write
- **service_lines_master.json**: 3 ペア / 6 ref 追加 (`updated_at: 2026-05-25`、640 系統のまま)
- **sw.js**: CACHE_VERSION v334 → v335

JS 側は v334 で UI (17-station-actions.js の「🔀 直通先」ボタン) と runtime 伝播 (02b-service-lines-builder.js) を既に入れてあるので、データ追加だけで動く。

### 設計判断

- **ID 命名**: 新幹線系統は `auto_*` ID (`auto_東海道新幹線_東海旅客鉄道` 等) で長文字列だが、through_lines に直接書く。v334 で短い ID (`jr_biwako_line` 等) に直したのは「新規手動系統作成 + 旧 broken ref 解消」のセットだったケース。新幹線は既存手動系統が無いので、Phase A の範囲では auto_* をそのまま使う。将来「新幹線 1 系統化 (TODO 🟢 新幹線各系統の手動連結)」を実施する時に短い ID に移行できる
- **Phase 分割**: ユーザーに 4 択 (Phase A 新幹線のみ / A+B 関東私鉄 / A+山形秋田新設 / 全部) で確認 → Phase A のみを選択。小さい単位で push → 確認できる方が安全

### 検証

- node tools/add_shinkansen_through_lines.js: `through_lines broken refs: 0`, total 640
- JSON parse OK (Node がそのまま読めている)

---

## 184. v334 — through_lines (直通系統) を本格運用化: 3 系統追加 + broken refs 修正 + UI (2026-05-25)

### 背景

ユスケから「営業系統は ID 化されている？」と確認 → 系統そのもの・駅・operator は ID 化済 (`jr_yamanote_line` 形式 + `s_NNNNN`)。`through_lines` も既に line.id 形式で書かれていたが、**13 件の参照中 6 件が壊れていた**ことが判明。さらに `through_lines` を消費する JS は 0 件だったため、データ整備と簡易 UI を同時に入れる。

### broken refs の内訳

| 参照元 | 元 | 状態 |
|---|---|---|
| jr_kyoto_line | `biwako_line` | ID 表記揺れ → `jr_biwako_line` に修正 |
| jr_kobe_line | `sanyo_honsen` | ID 表記揺れ → `jr_sanyo_main` に修正 |
| jr_ueno_tokyo_line | `jr_joban_line` | 参照先 ID 不在 → `jr_joban_medium` (中距離) に修正 |
| jr_chuo_rapid | `jr_ome_line` | 手動キュレーション系統が未追加 → **新規追加** |
| osaka_loop_line | `jr_yamatoji_line` | 同上 → **新規追加** |
| osaka_loop_line | `jr_hanwa_line` | 同上 → **新規追加** |

### 新規追加した 3 手動キュレーション系統

すべて auto_* 系統 (N02 由来) を駅順データとして流用、色は JR ラインカラー準拠。

- **jr_ome_line** (青梅線, 立川〜奥多摩, 25 駅, `#F15A22` 中央線同色) — `through_lines: ["jr_chuo_rapid"]` で双方向化
- **jr_yamatoji_line** (大和路線, JR難波〜加茂, 22 駅, `#58B947`) — `through_lines: ["osaka_loop_line"]`
- **jr_hanwa_line** (阪和線, 天王寺〜和歌山, 35 駅, `#EA5520`) — `through_lines: ["osaka_loop_line"]`

合計 637 → **640 系統**。

### 変更

- **service_lines_master.json**: 3 系統追加 + 表記揺れ 3 件修正 (`updated_at: 2026-05-25`)
- **tools/add_3_through_lines.js**: 新規。冪等な追加 + 表記揺れ修正 + 整合性チェック (broken refs == 0 を assert してから write)
- **js/02b-service-lines-builder.js**: runtime SERVICE_LINES オブジェクトに `through_lines` を伝播 (今までは捨てていた)
- **js/17-station-actions.js**: 路線アクションシートに「🔀 直通先: ●系統名」ボタンを追加。クリックで直通先の路線シートに再オープン (双方向 navigable)。色は 10px の丸スウォッチで先頭表示
- **sw.js**: CACHE_VERSION v333 → v334

### 設計判断

- **broken refs 修正 vs 新規系統追加**: ユーザーに 3 択 (表記揺れ修正のみ / auto_* を暫定参照 / 手動系統追加) で確認 → 「手動系統追加」を選択。auto_* 参照は将来同 ID 重複が発生して再差し替えが必要なので、根本対応を選んだ
- **runtime through_lines を伝播するか**: 系統オブジェクトに 1 行 (`through_lines: sl.through_lines || []`) 増やすだけなので、UI 側で master を再読込せずに済む方を選択
- **UI 配置**: 路線アクションシートに「直通先」セクションを置くのが自然 (📸メモ・🎨色変更と同列の操作)。深い navigation 階層は作らず、直通先の路線シートを開き直すだけのシンプルな遷移にした

### 検証

- node tools/add_3_through_lines.js: `through_lines broken refs: 0` を確認
- syntax check: 02b-service-lines-builder.js / 17-station-actions.js OK

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

