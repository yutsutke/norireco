# 乗レコ — Claude Code 規約

## セッション開始時（着手前に必ず — この順で）
1. **現状確認**: startup hook が渡す STATUS.md を流し見（CACHE_VERSION・領域別ステータス・直近フェーズ）。
   変更履歴詳細が必要なら CHANGELOG.md の最新セクションを Read。
   hook 出力が 2KB を超えてプレビュー切れする場合は `tool-results/hook-*-stdout.txt` 全文を Read。
2. **構造把握**: **毎セッション必ず Notion §0「乗レコ 全体像と最新仕様」を `notion-fetch`**（id `36171b458b638120b572fed38140e054`）。ドキュメント役割分担とサブページ目次（§1.x 画面 / §2.x 裏側 / §3.x 将来）の現在地を確認する。子ページ（§1.x / §2.x / §3.x）は該当作業時に追加 fetch。
   ※ STATUS.md だけで構造把握できた気になりやすいが §0 の役割分担表・目次は別物。スキップ禁止。
3. **TODO 把握**: startup hook の分類見出しで大枠を把握（必要なら TODO.md 全文へ）。
4. **完了報告 → 質問**: 1〜3 が揃ったら、**最初の応答冒頭で必ず以下 3 行を報告してから**「今日は何をやるか」をユスケに質問する。いきなり実装に入らない。
   ```
   ✅ 現状確認 (vXXX)
   ✅ 構造把握 (Notion §0)
   ✅ TODO 把握
   ```

## 憲法（5大原則 / 不変原則）
1. マップ中心、タブは副次的
2. 同心円ターゲティング（Lv0〜3 同時。コアは詳細・マニアモードに隠す）
3. 判断は 3 カテゴリ（A=今実装 / B=設計だけ / C=記録のみ）
4. 早期βで学習・本リリースで拡散（シェアが分水嶺）
5. コードベースの健康度を守る（1000行超で分割検討・syntax check 必須）
- コアは「記録・完乗」。拡張はコアを助けるためにある。

## コーディング規約
- ES Modules（全 js を <script type="module">）
- 名前空間は window.NORIRECO.mypage.xxx（既存 window.xxx 公開は HTML onclick 互換で維持）
- 1 ファイル 1000 行超で分割検討
- push 前に必ず syntax check

## デプロイ規約
- main 直 push（30秒〜2分で反映）
- CACHE_VERSION = デプロイ回数 の不変式。push のたびに sw.js を +1

## Supabase migration 規約（v333 で導入）
- **migration ファイル末尾の `-- Applied: YYYY-MM-DD by <user>` が「真実の源」**。Supabase Dashboard の状態は git で追跡できないので、ここで補う
- **ユスケ**: SQL Run 後すぐに `supabase/migrations/v*.sql` 末尾に Applied 行追記 → commit (1 ファイル変更だけで OK、push は次回まとめて可)
- **Claude**: `supabase/migrations/v*.sql` の存在を見ても **「Applied 行があるか」を必ず grep** してから着手する。Applied 無し = 未実行。STATUS.md の「実行待ち」表記は二次情報、migration ファイル末尾が一次情報
  - 例: `grep -L "^-- Applied:" supabase/migrations/v*.sql` で未実行 migration を列挙
- DROP COLUMN 前提の事前修正 (callsite を id ベースに直す等) を伴うタスクに着手する前に、必ず該当 migration の Applied 状態を確認する。「JS 側完了 / SQL 実行待ち」と書いてあっても疑う
- 経緯: v325/v326 SQL は実は Run 済だったが STATUS.md が古く「実行待ち」のまま → v331 で「事前修正」と称して既に不要な作業を実施 → 副作用で循環 import 事故 → v332/v333 修正。CHANGELOG §182 / §183 参照

## 原則
- 真実の源はコード。ドキュメントとずれたらコードが正しい → §2.7 意思決定ログに記録
- docs/ ミラーは作らない（二重管理回避）。HANDOFF.md は廃止済み

## セッション終了時（2系統）
【ターンごと・変更を伴ったら更新】
- **CHANGELOG.md** に変更履歴の詳細
  - 書く: 背景（何が問題か）・設計判断（重要分岐のみ 3 案比較）・失敗教訓・残課題
  - 書かない: 「コミット範囲」「変更ファイル一覧」セクション（git log/diff で代替可能、二重管理回避 — v270 ルール）
    - ファイル一覧が欲しければ `git diff --name-only <hash>` / 直近 commit は `git log --oneline -N`
  - バージョン番号 (v258 等) で参照可能にする（§NN は分割で動くため不安定）
- **STATUS.md** に現在のスナップショットを反映（v271 で Notion §0.1 から分離・git 管轄化）
  - CACHE_VERSION・領域別ステータス・直近のフェーズを最新に
  - 各行は概要 1〜2 文のみ。詳細は CHANGELOG.md のバージョン番号参照
- **TODO.md** 更新（終了項目は削除、新規は 🔥🟡🟢🔧🎮 で分類）
  - 「直近の作業」セクションは書かない: CHANGELOG への 1 行 link のみで OK（v270 で簡略化）

【セッション終了時・「終わったので手続きお願いします」の合図で】
- **CHANGELOG.md 行数チェックとアーカイブ判定**（v349 で導入 / v364 でセッション末手続きに移管）:
  - `wc -l CHANGELOG.md` で行数確認、**1500 行超なら分割**
  - 分割手順:
    1. `grep -n '^## [0-9]\+\. v[0-9]\+' CHANGELOG.md` で全セクション境界を取得
    2. **テーマで区切る**（バージョン番号でなく内容で区切る方が後から探しやすい）。命名例: `CHANGELOG_PHASE3.8-share-r2.md` / `CHANGELOG_PHASE3.8-station-id.md` のように内容に即したテーマ名
    3. アーカイブ冒頭に「他フェーズへのリンク + カバー範囲の § 一覧（DESC 配置）」をヘッダで付ける（過去ファイル `CHANGELOG_PHASE3.8-modules.md` を雛形に）
    4. CHANGELOG.md 本体の冒頭メタを更新: 過去フェーズリンク追加・分割履歴に今回分追記・過去ログ参照早見表に新ファイル追加
    5. **STATUS.md も同時に整理**: 領域別ステータス表の完了済み行を新アーカイブ単位にマージ、直近のフェーズも要約。1 アーカイブ = 表の 1 行が原則
  - CHANGELOG.md と STATUS.md は **常にセット**で整理する。CHANGELOG だけ整理して STATUS が古いと、後続セッションで「STATUS は二次情報」と判断する根拠が崩れる
  - v364 以前は Stop hook で毎ターン機械チェックしていたが、警告頻度が過剰だったためセッション末固定に変更
- 影響を受けた子ページ（§1.x / §2.x / §2.7）を現状に整合
- 新語・設計判断を §2.7 に追記、既存と矛盾しないか確認
- Notion §0.1 は STATUS.md へのリンクのみ（中身は git 管轄に集約済）

## ドキュメント地図（どこに何があるか）
- 役割分担の真実の源 = Notion 乗レコ全体像 §0「ドキュメント役割分担」(id `36171b458b638120b572fed38140e054`)。v276 で Notion に集約（更新頻度が低いドキュメントは context cost を避けて Notion 側に置く）
- コードとドキュメントがずれたらコードが正しい → Notion §2.7 意思決定ログに記録
