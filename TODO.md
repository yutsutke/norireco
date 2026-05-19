# 乗レコ - 電車旅 TODO

新セッションでは、まず本ファイルを読んで次の着手項目を選ぶ。
詳しい仕様や経緯は `CHANGELOG.md`（更新履歴詳細）、ビジネス背景は [Notion 開発ノート](https://www.notion.so/35b71b458b63818494afe7c1ab917ca5)。

**ブランド**: 乗レコ - 電車旅（2026-05-13 確定）
**現在の SW**: v196 / **キャラ**: 7体（八王子3・立川3・小宮1）
**列車マスター**: 約260種（新幹線19・特急90+・寝台18・クルーズ3・観光列車60+・SL9・急行18、戦前〜現代まで）
**コード構成**: `js/01-..〜13-..` 機能別分割（v131〜v138、`CHANGELOG.md §20, §21` 参照）
**認証**: Supabase Auth (Magic Link + Google OAuth) — v135〜 / 3 テーブルに user_id 紐付け済
**マイページ**: 3 サブタブ (統計 / 旅程 / 路線)、詳細統計 16 種、期間指定で過去状態 (地図ピル「〜月指定」)
**用語**: 📝 経路選択 = **手動記録** (manual) / 📍 GPS 開始 = **GPS 記録** (verified) — v175 で統一
**保存ボタン**: 記録種別に応じて「💾 手動記録で保存する」/「💾 GPS 記録で保存する」に動的切替（v176）
**直近の作業**: ES Modules パイロット (案 β) stage 1 — map domain state (`map` / `memoMode` / `clickInfo`) を `window.NORIRECO.map` に集約、6 ファイル約 50 箇所の call site 書き換え（v196）/ 認証 state を `window.NORIRECO.auth` に集約（v195）/ trip 解決 + 乗車状態集計 を `04b-ride-record.js` に切り出し（v194）/ シンタックスチェック自動化 `npm run check`（v193）

---

## 🔧 ドキュメント整合性（最優先で潰す）

- [x] **Notion 子ページの中抜けバージョン補完（v132〜v189）— 完了 (2026-05-18)**
  - 全子ページのバージョン履歴を v189 まで同期完了:
    - ✅ **1.3 📝 記録モード**: v133/v134/v135-137/v144/v175/v176/v178/v179/v180/v186 を追記
    - ✅ **1.4 👤 マイページ**: v174/v175/v178/v179 を追記
    - ✅ **1.2 🗾 地図画面**: v173 / v174 / v177 を追記
    - ✅ **2.1 🗂 データアーキテクチャ**: v157 / v174 / v178-180 / v181 / v186 を追記
    - ✅ **2.2 🗄 Supabase**: v178-180 / v181/v185 を追記（schema 未拡張 workaround 含む）
    - ✅ **2.6 🔀 データの流れ**: フロー D を「期間フィルタ」に改名（v174 タイムマシン吸収）
    - ✅ **2.3 ⚡ SW/PWA**: CACHE_VERSION を v157 → v189 に更新
    - ✅ **2.4 📁 コード構成**: v158-189 の各ファイル変更を反映
    - ✅ **1.4.1 📊 統計サブタブ**: v179 精度除外 / v182「📌 直近の旅程」追記
    - ✅ **1.4.2 🚃 旅程サブタブ**: v174/v175/v178/v179/v181-185/v182 並び替え追記
    - ✅ **1.4.3 📋 路線サブタブ**: v157/v173/v174 追記
    - ✅ **1.4.4 🕰️ タイムマシンサブタブ**: v174 廃止を冒頭マーク + バージョン履歴に記録
  - 1.3 配下の「不正検知 / 現在地・GPS / 列車・車両形式 / 駅キャラ」サブサブページは独立ページとして存在せず（テキスト参照のみ）、スコープ外と判定
  - セッション末ルール（§0 に明記）で今後同じ漏れが起きないようにしてある

---

## 🔥 最優先（プロダクトとして欠けている）

- [ ] **ES Modules 化 (本番、13-mypage 分割は v190 で完了済)**
  - **理由**: 今 N=1 (ユーザー自分だけ) のうちが破壊的リファクタの唯一の安全窓。シェア機能でユーザーが増える前にやる
  - **現状の課題**: クラシック `<script>` ロードで全 16 ファイルが同じグローバル Script 環境を共有 → v127 で `const grid` 重複宣言で全滅した教訓
  - **v190 で完了済 (Notion §2.4 布石①③④)**:
    - ✅ `window.NORIRECO` 名前空間を導入 (新規・移動分は `NORIRECO.mypage.xxx` に登録、既存はそのまま)
    - ✅ `js/13-mypage.js` (1947行) を 4 ファイル分割: `13-mypage-common.js` (366) / `13a-stats.js` (1308) / `13b-trips.js` (354) / `13c-lines.js` (21)
    - ✅ HTML `<script src>` リスト・`sw.js` STATIC_ASSETS・CACHE_VERSION 連動更新（v189→v190）
  - **v191 で完了済**:
    - ✅ `04-gps-location.js` のデータローダー (`loadMergedStations` / `loadServiceLinesMaster` / `loadLines` / `loadLinesForZoom` / `PRIORITY_FILES` / `getPriorityThreshold`) と関連状態 (`SERVICE_LINES_MASTER` / `SERVICE_LINES` / `serviceLinesLoaded` / `serviceLinesBuilt`) を `02-data-loaders.js` に移管 (04: 1037→927 / 02: 227→346)。Notion §2.5 落とし穴「04 にローダーがいる」を解消
  - **v192 で完了済 (案 D 採用: ES Modules の最終形に近いドメイン分割)**:
    - ✅ SERVICE_LINES 構築・分類・達成率ロジック (`buildServiceLines` / `buildPerLineCoordMap` / `deriveN02IdFromAutoId` / `regionOf` / `detectServiceLineGroup` / `_JR_OP_IDS` 他 / `slStats` / `slGlobalStats`) を `js/02b-service-lines-builder.js` (166 行、IIFE) に切り出し
    - ✅ `NORIRECO.serviceLines = { build, stats, globalStats, detectGroup, regionOf }` ドメイン名前空間で公開
    - ✅ call site (06/08/09/05/13-common 計 12 箇所) を `NORIRECO.serviceLines.xxx` に書き換え
    - ✅ `deriveN02IdFromAutoId` の 04 内自己重複を解消 (v191 の積み残し)
    - 04: 927→788 行 / HTML `<script>` リスト・sw.js STATIC_ASSETS 更新・CACHE_VERSION v191→v192
  - **v193 で完了済**:
    - ✅ シンタックスチェック自動化 (`npm run check` / `scripts/syntax-check.js`)。`new Function` パース + 同名トップレベル `function` 重複警告。Notion §2.4 布石② 完了
  - **v194 で完了済**:
    - ✅ trip 解決 + 乗車状態集計を `04b-ride-record.js` に切り出し (`NORIRECO.rideRecord.{rebuild, normStName}`)
    - ✅ 04-gps-location.js を 788 → 430 行に縮小、ファイル名と中身を一致させる
    - ✅ dead code `resolveLineId` 削除
  - **v195 で完了済 (案 β stage 1 パイロット — auth)**:
    - ✅ 認証 state (`supabaseAuthClient` / `currentUser` / `currentSession` / `authBackfillRan`) を `window.NORIRECO.auth` mutable object に集約
    - ✅ 12-auth.js 内は `const auth = NORIRECO.auth` の local alias で短縮、外部 (13-mypage-common.js) は `NORIRECO.auth.currentUser` のフルパス
    - ✅ `currentUserId()` / `authBearerToken()` 等の関数 API は維持 (内部実装のみ書き換え)
    - call site: 12-auth.js (21) + 13-mypage-common.js (1) = 22 箇所
  - **v196 で完了済 (案 β stage 1 — map)**:
    - ✅ map domain state (`map` Leaflet インスタンス / `memoMode` / `clickInfo`) を `window.NORIRECO.map` に集約
    - ✅ 06-map-leaflet.js 内は `const M = NORIRECO.map` の local alias で `M.instance` / `M.memoMode` / `M.clickInfo` を短縮、外部 (04/05/07/08/09) はフルパス
    - call site: 6 ファイル約 50 箇所 (`map.X` member access + `addTo(map)` + `if(!map)` + `memoMode` + `clickInfo`)
    - `Array.prototype.map(...)` との曖昧性は `map.` (literal) と `addTo(map)` / `if(map)` のパターン分離で対処
    - `typeof map !== 'undefined' && map` の defensiveness 箇所 (v131 ロード順事故の名残) も同時に `NORIRECO.map.instance` 化でシンプル化
  - **次セッション v197+ 候補**:
    1. **案 β stage 1 残ドメイン** (推奨進行): `record` (07) → `gps` (04) → `trains` (02 の selectedTrain*) → `data` (02 の LINES/SERVICE_LINES/MERGED_STATIONS/CHARACTERS — 最大規模) → `mypage` (13-common)
    2. **案 β stage 2 パイロット**: 12-auth を `<script type="module">` 化。deferred 化で初期化順が崩れる可能性があるので、`initAuth()` の呼び出しタイミングを `DOMContentLoaded` 後に揃える + bridge `export const auth = window.NORIRECO.auth` を追加。SW (`sw.js`) の Network-First が `type="module"` でも維持できるか確認
    3. Notion §2.4 布石⑤ Supabase 呼び出しを `NORIRECO.api.xxx` ラッパー化 (案 β と独立、auth wrapper の延長)
  - **安全装置**: 「動くマップが画面に出る」を毎ステップで確認、各段階を独立コミット (戻せる)。Cloudflare Pages 移行は別タスクに切り出し、今は GitHub Pages のままで完結させる
  - 詳細仕様: 2.4 コード構成（js/01〜13c）参照

- [ ] **シェア機能（OGP 画像生成）**
  - 自分の達成地図のスクショ → Twitter/X で拡散
  - 主要ターミナル何駅制覇など要約も載せる
  - **認証済みのみ**シェア可（Notion 方針 - コア化への自然誘導）
  - 着手は ES Modules 化完了後、クリーンな基盤の上で

- [ ] **垢BAN（不正利用ペナルティ）対応**
  - 共有・シェア機能のみ停止、個人記録は通常通り使える設計
  - 「自分の達成は壊さない、外への発信だけを制限する」 = やり直しの余地を残す
  - 段階: warn（注意）→ share_banned（シェア不可）→ full_banned（極端な場合のみ）
  - `users.share_status` を Supabase に追加。マイページにバッジ表示
  - 不正検知 (`fraudAssessTrip`) で繰り返し suspicious 判定された場合などに自動付与

## 🟡 体験向上（コア層の継続率を上げる）

- [ ] **旅程予定ページ（未着手、アイデア段階）**
  - 過去の記録だけでなく「これから乗る予定」の旅程を組み立てられるページ
  - 未乗車路線・未訪問駅を選んで予定リスト作成、マップ上で予定経路を点線等で別表現
  - 実乗後に「予定 → 記録」へ昇格させる導線
  - 既存機能との相性: v177「未乗車のみ表示」+ v174「〜月指定」で「旅行計画 ⇄ 振り返り」両軸を揃える
  - スキーマ案: `norireco_planned_trips` テーブル新設 or `norireco_trips.status='planned'` 拡張、localStorage 先行も可
  - 詳細: Notion §3.1 次のフェーズ 「🟡 体験向上」参照

- [ ] **ノリレコログを地図画面のタブとして統合**
  - `noritetsu-log.html` は別ページだとほぼ見ない → 地図画面のサブタブとして埋め込み
  - 利点: 過去の旅程をまとめて編集、後から特急列車種別を登録、メモ追記が片手間にできる
  - 地図 / 📋 ログ / 👤 マイページ の 3 タブナビに統合

- [ ] **後追い記録モードの拡張（駅メモ + Supabase 列追加）**
  - v178 で「乗車日 / 出発 / 到着」の手動入力対応済（`date_precision='minute'`）
  - v181 で `trip.notes` (text) / `trip.delay_minutes` (int) を確認モーダル + マイページに実装済（CHANGELOG §30）
    - 現状は Supabase 送信時に `tripForSupabase()` で除外、localStorage のみ保存
    - **Supabase スキーマ追加 SQL** を実行後、workaround を撤去:
      ```sql
      ALTER TABLE norireco_trips ADD COLUMN notes text, ADD COLUMN delay_minutes integer;
      NOTIFY pgrst, 'reload schema';
      ```
      その後、`js/07-record-mode.js` の `tripForSupabase()` 呼び出しを `JSON.stringify(trip)` に戻す
  - 残り:
    - **駅の設備メモ**（トイレあり、混雑度、改札位置 等） — `trip.station_notes` (jsonb) を駅ごとに保存。構造設計大きいため別タスク

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

- [ ] **系統の色をユーザーカスタマイズ可能に**
  - マップ上の系統色と、ユーザー（特にマニア）が想起する色が乖離するとイワカン
  - 系統ごとに color override を localStorage / Supabase に保存
  - マイページ or 路線一覧タブから「この系統の色を変える」ピッカー
  - パイチャート・凡例・路線一覧バッジ全てに反映

- [ ] **普通電車の車両形式も記録できるように**
  - 現在 `trains_master.json` は特急・新幹線中心、`car_model` 選択 UI も特急前提
  - 普通列車も car_model（例: E233系・315系・東武50000系 等）を選べるように
  - 記録モーダルで「普通列車」を選んだ後に車両形式リストが出る導線
  - trains_master に普通列車エントリ追加 or car_model だけ別管理にするか要検討

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
  - 西武池袋線駅順 / 箱根登山系 / 伊豆箱根 の 4 件は v173 で対応済（`CHANGELOG.md §22`）

- [ ] **直通系統の追加**（service_lines_master.json）
  - F ライナー（元町中華街〜小川町/小手指）
  - 半蔵門線↔田園都市線↔東武スカイツリーライン
  - 東急目黒線↔南北線/三田線↔埼玉高速
  - 千代田線↔小田急小田原線/常磐線各停

- [ ] **新幹線各系統の手動連結**
  - 東海道・山陽新幹線（東京〜博多）を1系統に
  - 北陸新幹線（東京〜敦賀）、九州新幹線、西九州新幹線
  - 東北新幹線↔北海道新幹線（東京〜新函館北斗）
  - 山形新幹線、秋田新幹線

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

- [ ] **路線一覧タブの絞り込み UI**
  - 637 系統あるとスクロール大変
  - 検索ボックス・地域フィルター・運営会社フィルター

- [ ] **モバイル描画パフォーマンス継続改善**
  - Phase 2 で改善したが、まだ重い駅がある（多系統駅のパイ・キャラ）
  - 必要なら viewport culling、divIcon → canvas への寄せを再検討

## 🌱 布石（B カテゴリ：設計だけ今・実装は後）

長期スケール（10万〜100万 MAU）で必要になるが、今やらないと後で改修コストが爆発する項目。「今のうちにやること」欄を必ず明記する。詳細・運用ルールは [🌱 布石リスト（Notion）](https://www.notion.so/36471b458b6381198769fcbf5ab630bd) と [🏗 インフラ戦略（Notion）](https://www.notion.so/36171b458b63818f8687d3d05ad0926e)。

- [ ] **#1 静的アセット: GitHub Pages → Cloudflare Pages 移行**
  - 理由: GitHub Pages は帯域 100GB/月のソフト上限。1 万 MAU で警告ライン、それ以上で読み込み障害。Cloudflare Pages なら帯域無制限・無料
  - 発動条件: **今すぐ**（ユーザー数関係なし、デメリットほぼなし）
  - 今のうちにやること: リポジトリ連携設定・カスタムドメイン DNS 切替・GitHub Pages は当面残してフォールバックに

- [ ] **#2 画像ストレージ: Cloudflare R2 + Workers API ゲートウェイ**
  - 理由: 写真保存は将来必ず量が爆発。R2 の egress 無料を最初から取らないと月額 30 倍以上の差（Supabase Storage は地獄）
  - 発動条件: 画像機能（旅程の写真添付・OGP 生成）の実装着手時 ≒ Phase 2（500〜2,000 ユーザー）
  - 今のうちにやること: 画像保存先を Supabase Storage にしない。新規 API を書くなら Worker 前提で設計

- [ ] **#3 `norireco_trips` テーブルの将来シャーディング可能化**
  - 理由: 100 万 MAU で trip データ 2TB、Postgres 単一テーブルは 10 万 MAU で限界。`created_year` で水平分割できる構造にしておけば Neon 移行時もスムーズ
  - 発動条件: 10 万 MAU 手前で実際の `PARTITION BY RANGE` 設定
  - 今のうちにやること: 新規テーブル設計時は `created_year`（または同等のパーティションキー）カラムを含める。`PARTITION` 自体は今まだ設定しない

- [ ] **#4 API を Workers 経由に統一**
  - 理由: 現状は Supabase SDK でブラウザ → 直接 DB。Cloudflare Workers の API ゲートウェイ経由にしておけば、後で DB を Neon に差し替えてもフロントエンドを触らずに済む
  - 発動条件: 画像機能着手時（= #2 と同時、Phase 2 頃）
  - 今のうちにやること: 新規 API エンドポイントは Worker で書く。ブラウザから Supabase SDK で直接 DB を叩くコードをこれ以上増やさない

- [ ] **#5 認証ベンダーロックイン回避**
  - 理由: Supabase Enterprise は \$数千/月でコスト交渉力が低い。10 万 MAU で Auth を Clerk / Auth.js に逃がせる選択肢を残す
  - 発動条件: 10 万 MAU 手前でベンダー比較開始。今は Supabase Auth 一本で OK
  - 今のうちにやること: Magic Link / Google OAuth の UI コードは Supabase 依存を 1 関数に集約する（ユーザー情報取得・JWT 検証の口を狭める）

- [ ] **#6 垢 BAN 設計（共有のみ停止・個人記録は維持）** ← 🔥 残 TODO の「垢BAN 対応」と連動
  - 理由: シェア機能（OGP）リリース後に垢 BAN を後付けすると trip / share テーブルの flag 設計がスパゲッティになる
  - 発動条件: シェア機能リリース時 or 不正検知が一定数の偽陽性を出した時
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
  - 不正検知の suspicious → verified 昇格ロジックと統合予定

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
  - Phase 3（5-10年）: 欧州（ドイツ・イギリス・スイス）
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
- 編集後は **`sw.js` の `CACHE_VERSION` を上げる**こと（現在 v194）
- HTML 編集後は `</script></body></html>` が末尾に残っているか必ず確認
- **JS 編集後は必ずシンタックスチェック** — `npm run check` で 17/17 OK を確認 (v193〜、Notion §2.4 布石② 完了)
- 新規 trip の `lineId` は `service_lines_master.json` の id を使う（旧 N02 id も `LEGACY_LINE_ID_ALIAS` で透過解決）
- キャラ追加: `characters/<id>.svg` 配置 → `characters_master.json` に entry 追加 → `sw.js` STATIC_ASSETS に追加 → CACHE_VERSION 上げ
- 列車追加: `trains_master.json` の trains 配列に entry 追加（id/name/category/operator/description/stations_typical、必要なら car_models と rarity と discontinued）
- 認証情報フィールド: `source` / `verified` / `gps_lat-lon` / `recorded_at` / `date_precision`
- 列車情報フィールド: `train_id` / `train_name` / `train_category` / `car_model`（v122〜）。`train_id IS NULL AND train_name IS NOT NULL` = マニア手入力 = マスター補完候補
- 完了済みタスクの履歴は `CHANGELOG.md` へ。本ファイルには未着手の項目のみ残す。
