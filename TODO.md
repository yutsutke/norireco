# 乗レコ - 電車旅 TODO

新セッションでは、まず本ファイルを読んで次の着手項目を選ぶ。
詳しい仕様や経緯は `CHANGELOG.md`（更新履歴詳細）、ビジネス背景は [Notion 開発ノート](https://www.notion.so/35b71b458b63818494afe7c1ab917ca5)。

---

**ブランド**: 乗レコ - 電車旅（2026-05-13 確定）
**現在の SW**: v237 / **キャラ**: 7体（八王子3・立川3・小宮1）
**列車マスター**: 約260種（新幹線19・特急90+・寝台18・クルーズ3・観光列車60+・SL9・急行18、戦前〜現代まで）
**コード構成**: `js/01-..〜13c-..` ES Modules (v195〜v225 で全 18 ファイル `<script type="module">` + `import`/`export` 化完了)
**認証**: Supabase Auth (Magic Link + Google OAuth) — v135〜 / 3 テーブルに user_id 紐付け済
**マイページ**: 3 サブタブ (統計 / 旅程 / 路線)、詳細統計 16 種、期間指定で過去状態 (地図ピル「〜月指定」)
**用語**: 📝 経路選択 = **手動記録** (manual) / 📍 GPS 開始 = **GPS 記録** (verified) — v175 で統一
**完乗率**: ユニーク駅単位に統一 (v235) — ヘッダ「完乗率 X%」と マイページ「全記録完乗率」が一致、「公式完乗率」は GPS 認証のみ

**直近の作業 (v228〜v237)**:
- v237: OGP 日本地図を Natural Earth ベース 47 都道府県境界に置換。`scripts/build-japan-geo.js` で dataofjapan/land を Douglas-Peucker 簡略化 (tolerance 0.02 deg) → `js/share-japan-geo.js` (59KB) を export。本州が自己交差して破綻していた v236 の 4 島粗ポリゴンを撤去
- v236: シェア機能 MVP — `js/14-share-ogp.js` で Canvas 1200×630 の OGP 画像を生成 (日本地図 + 乗車区間 + 完乗率/駅/系統/距離)。マイページ完乗率カード直下に「📸 シェア画像を作成」ボタン。ダウンロード + `navigator.share` (画像対応端末) + X intent fallback。verified ガードは未実装 (`users.share_status` + RLS 強化と同時着手予定)

**(v228〜v235、2026-05-19 セッション)**:
- v228〜v229: ログアウト時に地図・統計・mypage キャッシュをローカル purge (Supabase は据置、再ログインで復元)
- v230〜v232: 地図 LOD から首都圏 bbox 分岐を撤去 (駅ランク 1 本化)、stationTier を `6/4/2/2/2/1` に圧縮、ドットとパイチャートの出現タイミングを統一
- v233: 未ログイン時の `syncFromSupabase` / `syncCharacterGrantsFromSupabase` で他人 trip / キャラが漏れていたのを修正 (user_id=eq.uid フィルタ + skip)
- v234: 静的デモ `RIDDEN_SEGS_STATIC` (21 trips) を撤去、ストレージラベル「静的データ」→「データなし」に
- v235: 完乗率の集計方式を「ユニーク駅単位」に統一 — ヘッダ「達成率」→「完乗率」、`globalStats().pct` を Set ベースに、ラベル「路線」→「系統」

---

## 🔥 最優先（プロダクトとして欠けている）

- [ ] **シェア機能 — MVP 以降の残り (v236 で OGP 画像生成 MVP は完成)**
  - ✅ v236: マイページ完乗率カードから「📸 シェア画像を作成」で 1200×630 PNG 生成・ダウンロード・Web Share / X intent
  - **残り**:
    - verified 限定ガード (`users.share_status` スキーマ + RLS と同時、布石 #6)
    - 個別 trip シェア (旅程カードから 1 旅程分の OGP)
    - `noritetsu-log.html` のテキストシェアを地図画面に移植 (log 廃止 TODO とセット)
    - シェア専用ページ `/share/<id>` + OGP メタタグ + 「自分も記録」CTA
    - 画像保存先 R2 + Workers (布石 #2/#4、永続シェア URL に必須)

- [ ] **垢BAN（不正利用ペナルティ）対応**
  - 共有・シェア機能のみ停止、個人記録は通常通り使える設計
  - 「自分の達成は壊さない、外への発信だけを制限する」 = やり直しの余地を残す
  - 段階: warn（注意）→ share_banned（シェア不可）→ full_banned（極端な場合のみ）
  - `users.share_status` を Supabase に追加。マイページにバッジ表示
  - 不正検知 (`fraudAssessTrip`) で繰り返し suspicious 判定された場合などに自動付与

- [ ] **Supabase RLS 強化 (v233 の残課題)**
  - 現状: anon key で REST API 直叩きで他人の生 trip / character_grants を取得可能
  - v233 で UI 側では他人データを表示しないよう防御済だが、本格対策は RLS policy で `user_id = auth.uid()` 必須にする
  - 影響テーブル: `norireco_trips` / `norireco_character_grants` / `norireco_memos`
  - 注意: backfill (user_id=NULL → 自分の uid に PATCH) は access_token ベースなので RLS 強化後も動作する

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
  - v181 で `trip.notes` (text) / `trip.delay_minutes` (int) を確認モーダル + マイページに実装済
    - 現状は Supabase 送信時に `tripForSupabase()` で除外、localStorage のみ保存
    - **Supabase スキーマ追加 SQL** を実行後、workaround を撤去:
      ```sql
      ALTER TABLE norireco_trips ADD COLUMN notes text, ADD COLUMN delay_minutes integer;
      NOTIFY pgrst, 'reload schema';
      ```
      その後、`js/07-record-mode.js` の `tripForSupabase()` 呼び出しを `JSON.stringify(trip)` に戻す
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
  - 西武池袋線駅順 / 箱根登山系 / 伊豆箱根 の 4 件は v173 で対応済

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
- 編集後は **`sw.js` の `CACHE_VERSION` を上げる**こと（現在 v235）
- HTML 編集後は `</script></body></html>` が末尾に残っているか必ず確認
- **JS 編集後は必ずシンタックスチェック** — `npm run check` で 18/18 OK を確認 (v193〜)
- 新規 trip の `lineId` は `service_lines_master.json` の id を使う（旧 N02 id も `LEGACY_LINE_ID_ALIAS` で透過解決）
- キャラ追加: `characters/<id>.svg` 配置 → `characters_master.json` に entry 追加 → `sw.js` STATIC_ASSETS に追加 → CACHE_VERSION 上げ
- 列車追加: `trains_master.json` の trains 配列に entry 追加（id/name/category/operator/description/stations_typical、必要なら car_models と rarity と discontinued）
- 認証情報フィールド: `source` / `verified` / `gps_lat-lon` / `recorded_at` / `date_precision`
- 列車情報フィールド: `train_id` / `train_name` / `train_category` / `car_model`（v122〜）。`train_id IS NULL AND train_name IS NOT NULL` = マニア手入力 = マスター補完候補
- 完了済みタスクの履歴は `CHANGELOG.md` へ。本ファイルには未着手の項目のみ残す。
