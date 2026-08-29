# 乗レコ - 電車旅 更新履歴 (Phase 3.8 ゲストモード開放 + RLS 強化 + 垢BAN 期 — v418〜v427 アーカイブ)

`CHANGELOG.md` から退避した Phase 3.8 後半 (v418〜v427 相当, §268〜§277) のセッションログ。主軸テーマ: 未ログインでも記録できるように開放し (v418)、その副作用で露出したゲスト集計バグ 2 件を潰したうえで、**v233 から残っていた RLS の本丸を閉じた** (v421 — `norireco_trips` / `norireco_character_grants` を本人のみ CRUD + `user_id` NOT NULL + anon REVOKE)。ゲスト開放によって「user_id NULL の行はもう増えない」契約が成立したことが、RLS を締められた前提条件。続けて垢BAN (シェア停止ペナルティ) を本体 → full_banned enforcement → 旧 policy の穴塞ぎ → 管理 GUI MVP と積み上げた。駅 ID 体系 Phase 2 のクローズ (v422) も含む。

他フェーズは:
- [CHANGELOG.md](CHANGELOG.md) — 現行
- [CHANGELOG_PHASE3.8-share-metrics.md](CHANGELOG_PHASE3.8-share-metrics.md) — Phase 3.8 一括記録の後始末 + シェア計測期 (v428〜v448)
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
- §277 v427: admin タブ空白 hotfix (13e-admin.js の import 修正)
- §276 v426: 垢BAN 管理 GUI MVP (norireco_admins + admin RPC + マイページ 🛠 サブタブ)
- §275 v425: norireco_trips の旧 FOR ALL policy を DROP (v424 enforcement の穴塞ぎ)
- §274 v424: 垢BAN: full_banned 時の個人記録新規作成停止 enforcement
- §273 v423: 垢BAN（シェア停止ペナルティ）本体
- §272 v422: 駅 ID 体系 Phase 2 クローズ (集計 rebuild を id 優先 + name fallback に)
- §271 v421: Supabase RLS 強化 (v233 残課題本丸を閉じる)
- §270 v420: ゲスト📊統計タブが anon key で全ユーザーの trip を取得してたバグ修正
- §269 v419: ゲストモード統計が過去ログイン中の trip まで集計してたバグ修正
- §268 v418: 未ログイン (ゲストモード) で記録機能とマイページ概要を開放 + オンボーディングバナー「一瞬しか出ない」修正

---

## 277. v427 — admin タブ空白 hotfix (13e-admin.js の import 修正)

**バージョン**: v427 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A (v426 hotfix)
**migration**: なし (JS のみ)

### 背景

v426 push 後、ユスケが SQL Run + 初期 admin INSERT を済ませて本番で「🛠 admin」サブタブをタップ → **中身が完全に空白**で何も表示されないと報告。サブタブ自体は出ているので `window.NORIRECO.profile.is_admin = true` で 13-mypage-common.js の admin gate は通過、`applyMpSection` の admin 分岐も入っているのに subpane 内が空。

### 原因

[`js/13e-admin.js`](js/13e-admin.js) の冒頭 import:

```js
import { SUPABASE_URL, SUPABASE_KEY, authBearerToken, currentUserId } from './12-auth.js';
```

**`SUPABASE_URL` / `SUPABASE_KEY` は 12-auth.js が export していない**。12-auth.js のヘッダコメント (line 17-18) には:

> SUPABASE_URL / SUPABASE_KEY (classic の top-level const) は Global Lexical Environment 経由でモジュールから bare 参照可。

とあるとおり、両者は別のクラシック script の top-level const で、12-auth.js は **bare 参照**するだけで export はしていない。13e-admin.js の named import に `SUPABASE_URL` / `SUPABASE_KEY` を含めたため、ES Modules の解決時に **module 全体のロードが SyntaxError で失敗** → 副作用 (`NORIRECO.mypage.renderMpAdminSection = renderMpAdminSection`) が走らず、admin タブ表示時に `applyMpSection` 内の `NORIRECO.mypage.renderMpAdminSection?.()` が undefined で何もしない → 空 subpane だけが残る。

`npm run check` は parse OK で通る (named import の名前は dynamic に解決されるため static check できない)。実機ロード時にのみ console error。

### 修正

21-bulk-record.js などと同じパターンに揃え、**`window.SUPABASE_URL` / `window.SUPABASE_KEY` 経由** に変更:

```js
import { authBearerToken, currentUserId } from './12-auth.js';
// ... callRpc 内
const res = await fetch(`${window.SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
  headers: { 'apikey': window.SUPABASE_KEY, ... },
  ...
});
```

これで 12-auth.js から実際に export されている関数だけを named import し、`SUPABASE_URL` / `SUPABASE_KEY` はクラシック script が定義した window globals 経由でアクセス。

### 設計判断 (再発防止)

- **新規 module ファイルを作るときは、12-auth.js から import する `SUPABASE_URL` / `SUPABASE_KEY` は必ず `window.SUPABASE_URL` 経由で書く** (named import に含めない) — 既存 module (16-memos.js / 17-station-actions.js / 21-bulk-record.js etc.) は混在しており bare 参照と window 参照が両方ある。bare 参照は classic script のロード順序に依存するので fragile、window 経由が安全な定石
- **`npm run check` は import 解決を検証しない** (parse のみ) ことを認識する。新規 module の追加時は本番 / preview でブラウザ console エラーの確認まで含めて 1 サイクル — ただし admin 機能のように DB 状態 (admins INSERT) を要するものは preview で完結できないため、本番 deploy 直後に DevTools console を確認する手順を残課題に追加
- **教訓**: 「syntax check 25/25 OK」は実行時の import 解決を含まない指標。CLAUDE.md の検証規約に「新規 ES Modules ファイル追加時は実行時 console エラー有無まで確認」を追記検討

### 触ったもの

- [`js/13e-admin.js`](js/13e-admin.js) import 行修正 + `callRpc` 内の SUPABASE_URL/KEY を window 経由に
- [`sw.js`](sw.js) v427

### 検証

- syntax `npm run check` 25/25 OK
- 修正後の admin タブ動作確認はユスケ実機 reload で確認予定 (ユーザー `a28287d9-...` が share_banned で v426 SQL Apply 済なので、admin タブを開けば 1 行表示されるはず)

### 残課題

- ユスケ実機 reload で admin タブに `a28287d9-...` が share_banned で表示されること、ボタン操作が動くことを確認
- 確認 OK なら垢BAN 「管理 GUI」は MVP として完了
- 別タスク継続: 自動発動 (スパム量 / 通報フロー)

---

## 276. v426 — 垢BAN 管理 GUI MVP (norireco_admins + admin RPC + マイページ 🛠 サブタブ)

**バージョン**: v426 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A (運用 GUI / 垢BAN 別タスク残課題回収)
**migration**: [`supabase/migrations/v426_admin_gui_mvp.sql`](supabase/migrations/v426_admin_gui_mvp.sql)（Run 後 Applied 行追記 + Dashboard で初期 admin INSERT）

### 背景

v423/v424/v425 で垢BAN 本体・full_banned enforcement・旧 ALL policy 穴塞ぎが完了し、enforcement は実機確認済み。発動は Supabase Dashboard で `SELECT ban_user_share('<uuid>','理由')` を毎回 SQL Editor 操作で行う運用だったが、CHANGELOG §273 残課題「管理 GUI」を回収。MVP スコープは「BAN/warn 履歴のあるユーザー一覧 + uid/email 検索 + 4 ボタン (ok/warn/share_banned/full_banned)」(ユスケ確定 2026-05-29)。

### スコープ

- **SQL**: `norireco_admins` テーブル + 4 関数 (`is_admin` / `admin_list_profiles` / `admin_search_user` / `admin_set_account_status`)
- **JS**: 新規 [`js/13e-admin.js`](js/13e-admin.js) (admin タブ実装) + [`js/12-auth.js`](js/12-auth.js) fetchMyProfile に `is_admin` 取得 + [`js/13-mypage-common.js`](js/13-mypage-common.js) サブタブ nav に「🛠 admin」追加 (is_admin で表示制御) + [`noritetsu-map.html`](noritetsu-map.html) に subpane div + script tag 登録
- **対象外 (将来別タスク)**: 自動発動 (スパム量・通報フロー) / share 履歴詳細閲覧 / 統計情報 (share 数・trip 数) / admin 追加 UI (Dashboard 手動 INSERT のまま)

### 設計判断

#### セキュリティ

- **真実の源 = `norireco_admins` テーブル** — git repo に admin uid を hard-code しない (ユスケ uid は migration の運用コメントに従って Dashboard で 1 行 INSERT)
- **`norireco_admins` RLS**: 「本人の行のみ SELECT」 — 自分が admin かどうかは知れるが他 admin は見えない。INSERT/UPDATE/DELETE policy 無し = service_role (Dashboard) のみ書込。v423 profiles と同形の二重防御 (anon REVOKE + authenticated SELECT のみ GRANT)
- **全 admin_* 関数は SECURITY DEFINER** — 関数オーナー (postgres) 権限で auth.users / norireco_profiles を直接読める。**関数冒頭で `IF NOT is_admin() THEN RAISE EXCEPTION 'admin only'` で必ずゲート**
- **EXECUTE は public REVOKE + authenticated GRANT** — 非 admin の authenticated user が RPC を叩いても関数内の `is_admin()` で EXCEPTION で弾かれる。anon は EXECUTE 自体無いので 401 で弾かれる
- **`admin_set_account_status` は v423 `set_account_status` を内部 PERFORM** — DB 内ロジック 1 か所原則。admin_ 関数は authz layer (admin ゲート) として薄く存在
- **クライアント側の `is_admin` 偽装は無意味** — タブ表示が変わるだけで、操作は RPC を通すので非 admin は何もできない

#### UX

- **マイページに溶け込ませる** — 専用画面 (`noritetsu-admin.html`) は新規 HTML + ルーティング + sw.js precache + 切替 nav 等のコスト高で却下。1 人運営なら既存マイページ内で完結
- **サブタブ nav に「🛠 admin」を追加 (is_admin で hide / show)** — 既存 5 サブタブ (📊統計/🚃旅程/📋路線/📸メモ/🔗シェア) と並列。non-admin には表示自体出ない
- **状態 4 ボタン (ok / warn / share_banned / full_banned)** — 直感的な「現状況 vs 変更先」が一覧で見える。各ボタンに理由入力 `prompt()` + 確認 `confirm()`
- **自分自身 BAN 防止ガード** — admin が自分を `full_banned` にすると復帰不能 (service_role でないと `set_account_status` 呼べない) → クライアント側で disabled + サーバー側でも将来追加検討 (今は MVP 範囲外)

#### Admin タブ実装 (js/13e-admin.js)

- **RPC 共通 `callRpc(fnName, body)`**: void RETURN は空文字、TABLE RETURN は配列パース。エラーは throw → UI で alert
- **状態管理 `A.{rows, mode, query, loading}`**: list / search の 2 モード。検索は空文字なら自動で list に戻る
- **status badge / 日時フォーマット / esc** はファイル内ローカル (DRY より循環 import 回避優先)
- **window.NORIRECO.admin にハンドラ集約** — HTML onclick から呼びやすい (admin タブは admin だけ表示なので onclick 露出は問題なし)

### 触ったもの

- 新規 [`supabase/migrations/v426_admin_gui_mvp.sql`](supabase/migrations/v426_admin_gui_mvp.sql)
- 新規 [`js/13e-admin.js`](js/13e-admin.js) (~190 行)
- 編集
  - [`js/12-auth.js`](js/12-auth.js) `fetchMyProfile` に `is_admin` 取得 + ログアウト時のリセットに `is_admin: false` 追加
  - [`js/13-mypage-common.js`](js/13-mypage-common.js) サブタブ nav に「🛠 admin」追加 (is_admin gate) + applyMpSection に admin 分岐追加
  - [`noritetsu-map.html`](noritetsu-map.html) `mp-sub-admin` subpane div + 13e-admin.js script tag
  - [`sw.js`](sw.js) v426 + precache に 13e-admin.js 追加
  - [`scripts/syntax-check.js`](scripts/syntax-check.js) FILES リストに 13e-admin 追加

### 検証

- syntax `npm run check` 25/25 OK (新規 13e-admin 含む)
- preview 動作確認は v426 SQL Run + Dashboard で初期 admin INSERT が必要なため、v423/v424 と同じく **ロジックレビュー + syntax で担保 → ユスケ実機確認** の体制
- RPC ガードは SECURITY DEFINER + `is_admin()` で多重防御済

### 残課題

- **ユスケ作業**:
  1. v426 SQL を Dashboard で Run → 末尾に `-- Applied:` 追記
  2. Dashboard で初期 admin (ユスケ) を INSERT: `INSERT INTO norireco_admins (user_id, note) VALUES ('<yutsutke の uuid>', 'プロジェクトオーナー');`
  3. 本番 reload → マイページに「🛠 admin」サブタブが出現することを確認 → 一覧表示 + 4 ボタン動作確認
- **垢BAN 別タスク継続**: 自動発動 (スパム量検知 / 通報フロー)

---

## 275. v425 — norireco_trips の旧 FOR ALL policy を DROP (v424 enforcement の穴塞ぎ)

**バージョン**: v425 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A (セキュリティ / v424 の必須補修)
**migration**: [`supabase/migrations/v425_drop_trips_legacy_all_policy.sql`](supabase/migrations/v425_drop_trips_legacy_all_policy.sql)（Run 後 Applied 行追記）

### 背景

v424 SQL を Dashboard で Run した直後の確認 SELECT (5-B: 各テーブル×cmd 別 policy 件数) が 12 行のはずが **13 行**。スクリーンショット確認で `norireco_trips` に `cmd='ALL'` の policy が 1 件追加で残留していた。

**PostgreSQL の RLS は同一操作に複数 policy がある場合 PERMISSIVE = OR 評価** (= ANY)。つまり:

- v424 INSERT policy: `WITH CHECK (auth.uid()=user_id AND NOT EXISTS(profiles WHERE share_status='full_banned'))`
- 残留 ALL policy: 推定 `auth.uid()=user_id` のみ

→ INSERT のとき OR 結合 = 旧 ALL policy が `auth.uid()=user_id` を満たすだけで通る = **v424 の full_banned ガードが完全に空転、enforcement 破綻**。

### 原因仮説

- v135 (user_id 列追加) ～ v250 頃の歴史的残骸。v421 の RLS 強化が `FOR SELECT/INSERT/UPDATE/DELETE` 個別 cmd 名で `DROP POLICY IF EXISTS` しただけで、`FOR ALL` で作られた古い policy 名は漏れて残留したと推定。
- `norireco_character_grants` / `norireco_memos` は ALL policy 無し (v424 確認 SELECT で 4 cmd 各 1 件のみ) → trips 固有の歴史的事故。

### 設計判断

- **個別 policy 名を hard-code せず DO ブロックで「ALL を全部消す」**: 過去の名前が不明 + 将来 Dashboard UI から誤って ALL policy が再び作られた場合の保険として、DO ブロックで `pg_policies` を引き名前を取得 → `EXECUTE format(...)` で DROP。再 Run しても ALL 0 件なら NOOP = 冪等
- **v421 の 4 件 + v424 の INSERT (full_banned ガード入り) は据え置き** — 触らない
- **CACHE_VERSION を v425 に bump**: JS 変更ゼロだが「デプロイ回数 = バージョン番号」(CLAUDE.md デプロイ規約) の不変式に従う。本セッションは SQL 補修 + sw.js bump の最小コミット
- **v424 と統合せず別 commit**: v424 は本番 push 済み・別 SQL 既 Apply。v425 として記録する方が migration 履歴の真実性が高い (「v424 で穴があったが v425 で塞いだ」という事実が残る)

### 教訓

- **migration の確認 SELECT は行数まで指差し確認**: v424 で「3 tables × 4 cmd = 12 行」を期待値として書いていたのに「13 行」見落とし → Run 直後に気づけず push まで進んだ。次回以降、新規 RLS migration には期待行数を明示してチェック
- **PERMISSIVE RLS の OR 評価は穴になりやすい**: `FOR INSERT` policy を新規に作る時、同テーブルに `FOR ALL` が無いことを **migration 内で明示確認**するパターンを今後採用 (今回の v425 確認 SELECT 3-A がその雛形)

### 触ったもの

- 新規 [`supabase/migrations/v425_drop_trips_legacy_all_policy.sql`](supabase/migrations/v425_drop_trips_legacy_all_policy.sql) (DO ブロックで ALL policy 全 DROP + 確認 SELECT)
- [`sw.js`](sw.js) v425

### 検証

- syntax (JS 変更なし、sw.js は文字列 1 文字差替えのみ)
- Dashboard Run 後の期待確認:
  - 3-A: 4 行 (cmd ∈ SELECT/INSERT/UPDATE/DELETE、cmd='ALL' 0 件)
  - 3-B: 1 行 (has_full_banned_guard = t)

### 残課題

- **ユスケ作業**: v425 SQL を Dashboard で Run → 末尾に `-- Applied:` 追記 → JS push (もう commit 済み・push 済みなら不要)
- 本番動作確認: テスト BAN (`SELECT set_account_status('<自分の uuid>','full_banned','テスト')`) → 記録 FAB tap → alert 表示 + Supabase POST が 403 で弾かれる (Network タブで確認) → `SELECT unban_user_share('<uuid>')` で復帰

---

## 274. v424 — 垢BAN: full_banned 時の個人記録新規作成停止 enforcement

**バージョン**: v424 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A (セキュリティ / 垢BAN 段階の差別化)
**migration**: [`supabase/migrations/v424_full_ban_insert_enforcement.sql`](supabase/migrations/v424_full_ban_insert_enforcement.sql)（Run 後 Applied 行追記）

### 背景

v423 で垢BAN 本体 (`norireco_profiles` + `share_status`) を入れ実機確認まで完了。enforcement の対象は **share 系 INSERT** だけだったので、`share_banned` と `full_banned` の挙動が同じ（= 段階が空転）状態になっていた。v423 CHANGELOG §273 残課題:

> 別タスク: 管理 GUI / 自動発動 / **full_banned の個人記録新規作成停止 enforcement** (v421 trip policy に AND NOT EXISTS(full_banned) を足す形・ただし SELECT/閲覧は最後まで残す方針)

v424 で **full_banned に「個人記録 INSERT 停止」の意味を付与**し、段階の差別化を完了。

### スコープ (yutsutke 確定 2026-05-29)

- **対象テーブル**: `norireco_trips` / `norireco_character_grants` / `norireco_memos` の **INSERT のみ**
- **触らない**: UPDATE / DELETE / SELECT — 過去 trip の閲覧・編集・削除は通常通り
- **`shares` は v423 で既に `('share_banned','full_banned')` 両方ブロック済**なので本 migration では触らない
- **`share_banned` 段階は通過** — シェアだけ止めて記録は通常通り作れる（やり直しの余地）
- **管理 GUI / 自動発動 (スパム量 / 通報フロー) は本 migration の範囲外** = 別タスクのまま据置

### 設計判断

- **v423 shares INSERT policy と完全同形**: `WITH CHECK (auth.uid()=user_id AND NOT EXISTS(profiles WHERE user_id=auth.uid() AND share_status=...))`。差は IN リストが `('share_banned','full_banned')` vs `'full_banned'` 単独のみ。「真実の源 = profiles.share_status」の片方向参照という構造を保つ
- **段階の意味設計**:
  | 状態 | 既存 share 配信 | share INSERT | trip/grant/memo INSERT | trip 閲覧/編集/削除 |
  |---|---|---|---|---|
  | `ok` | ✅ | ✅ | ✅ | ✅ |
  | `warn` | ✅ | ✅ | ✅ | ✅ |
  | `share_banned` | ❌ (revoked) | ❌ RLS | ✅ | ✅ |
  | `full_banned` | ❌ (revoked) | ❌ RLS | ❌ RLS **(v424)** | ✅ |
  - 「外への発信を全て止める / 自分の達成は壊さない / やり直しの余地を残す」の最も忠実な実装
- **profiles 行が無い = ok 扱い** (NOT EXISTS で新規ユーザーは通る) — v423 と同じ
- **DROP POLICY → CREATE POLICY** で冪等化 (v421/v423 と同じパターン、policy 名を旧 → 新で書き換え)
- **クライアントガードは各 INSERT 呼び元の冒頭に inline** — 14-share-ogp.js の `isShareBlocked()` パターンに倣う。`window.NORIRECO.profile.share_status === 'full_banned'` を直接見る薄い check。`isFullBanned()` ヘルパー化はせず循環 import 事故 (v331→v332 教訓) を避ける。RLS が最後の砦、クライアントは UX 改善 (= 403 を返して入力を捨てる代わりに alert)
- **`grantCharacter()` 冒頭にもガード** — trip 保存がブロックされれば連鎖獲得経路 (07 → 03:312) は呼ばれないが、`window.grantCharacter` 直叩き / GPS 駅近獲得などの独立経路でもガードが効くように 03 で断つ。localStorage への二重登録もスキップ
- **デプロイ順序**: SQL/JS どちらが先でも安全 (full_banned 該当者が現状 0 人 + RLS が最後の砦)。SQL 先を推奨 (v423 と揃える)

### 触ったもの

- 新規 [`supabase/migrations/v424_full_ban_insert_enforcement.sql`](supabase/migrations/v424_full_ban_insert_enforcement.sql) (trip/grant/memo の INSERT policy 差し替え + 確認 SELECT)
- 編集
  - [`js/07-record-mode.js`](js/07-record-mode.js) `saveMultiSegmentTrip()` 冒頭に full_banned ガード
  - [`js/21-bulk-record.js`](js/21-bulk-record.js) `saveBulkDrafts()` 冒頭に full_banned ガード (一括記録の入口)
  - [`js/16-memos.js`](js/16-memos.js) `createMemoOnServer()` 冒頭に full_banned ガード
  - [`js/03-characters.js`](js/03-characters.js) `grantCharacter()` 冒頭に full_banned ガード (localStorage 保存もスキップ)
  - [`js/13-mypage-common.js`](js/13-mypage-common.js) `_mpStatusChip()` を share_banned/full_banned で分岐 (full_banned → 「🚫 アカウント停止中」)
  - [`js/14-share-ogp.js`](js/14-share-ogp.js) `_shareStatusBanner()` を share_banned/full_banned で分岐 (full_banned 用に「シェア + 新規記録停止」の詳細文言)
- [`sw.js`](sw.js) v424

### 検証

- syntax `npm run check` 24/24 OK
- preview 動作確認は full_banned 状態のテストユーザー (Supabase Dashboard で `set_account_status('<uuid>','full_banned')` 設定) が必要なため、v423 と同じく **ロジックレビュー + syntax で担保 → ユスケ実機確認** の体制
- ガード文は 14-share-ogp.js の `isShareBlocked()` (v423) と同じ薄い check で、循環 import や top-level 副作用は無し

### 残課題

- **ユスケ作業**: v424 SQL を Dashboard で Run → migration 末尾に `-- Applied:` 追記。Run 後に JS push (順序逆でも安全だが揃える)
- 別タスク (v423 から継続): 管理 GUI / 自動発動 (スパム量・通報フロー)

---

## 273. v423 — 垢BAN（シェア停止ペナルティ）本体

**バージョン**: v423 (CACHE_VERSION)
**日付**: 2026-05-29

### 背景
シェア機能 MVP (v410〜v418) が本番稼働。TODO 🔥「垢BAN」+ 布石 #6 で「シェア機能リリース後に垢BAN を後付けすると trip/share テーブルの flag 設計がスパゲッティになる」と警告されていた本丸。v413 の migration コメントが既に「将来の垢BAN: share_banned なら配信停止 or revoked 列追加で対応」と予告しており、それを回収。思想は TODO の「自分の達成は壊さない、外への発信だけ制限する＝やり直しの余地を残す」。

### スコープ
enforcement が実際に効くところまで＝本体。発動は当面 Supabase Dashboard の手動 SQL 関数。**管理 GUI・自動発動 (スパム検知/通報)・full_banned の個人記録停止は別タスク** (TODO で「別軸・未確定」)。段階: `ok` → `warn` (注意・enforcement なし) → `share_banned` (シェア不可) → `full_banned` (極端時・今は share_banned と同等の器)。

### 設計判断
- **真実の源 = `norireco_profiles.share_status` 一本**。`norireco_shares.revoked` は「share_status の片方向・非正規化キャッシュ」(配信高速化 + anon に profiles を晒さない両立)。同期は `set_account_status` 関数 1 か所のみ (profiles → shares 片方向)。二重管理ではなく明確な主従。
- **profiles の書込 policy を作らない**: SELECT (本人のみ) policy だけ作成。RLS 有効下で INSERT/UPDATE/DELETE policy が無い = authenticated/anon は書込全拒否、service_role (Dashboard) のみ書込 → **本人が自分の BAN を自己解除できない**。v421 と同じ二重防御で anon REVOKE + authenticated は SELECT のみ GRANT。
- **関数の EXECUTE を public から REVOKE** (Plan 中に気づいた穴): PostgREST は public スキーマの関数を `/rest/v1/rpc/<fn>` として自動公開する。剥がさないと authenticated が `unban_user_share` を叩いて自己解除できてしまう。REVOKE で Dashboard 専用に。
- **shares UPDATE policy 強化** (Plan エージェントが発見した穴): 現状 `auth.uid()=user_id` だけなので banned ユーザーが `PATCH {revoked:false}` で自分の全 share を自力復活できた。`WITH CHECK (... AND revoked=false)` で塞ぐ。現状クライアントは shares を PATCH しないので既存挙動は不変。
- **enforcement 2 層**: (1) DB の RLS が最後の砦 (INSERT BAN中不可・回避不可)、(2) クライアントガードが UX。**trip/character_grant の RLS は一切触らない** (布石 #6 厳守)。**Worker も触らない** (INSERT を弾けば shares 行が作られず /share は not-found、R2 orphan は許容)。
- **ユスケ確定の仕様 (2026-05-29)**: ①既存リンクも無効化 (revoked で配信停止、unban で復活) ②画像シェアも禁止 = シェアモーダル自体を開かせない (open*ShareModal 冒頭ガードで リンク作成・画像 Web Share・画像 DL を一括ブロック。最終防御は RLS) ③列名は `share_status` (account_status ではなく TODO/CHANGELOG 表記に統一)。

### デプロイ順序 (v421 とは逆・SQL 先)
配信側 `functions/share/[id].js` が `&revoked=is.false` を要求 → 列が無い間にこのクエリが出ると PostgREST 400 → catch で全 share が not-found 化する事故。profiles 側はクライアントが catch で 'ok' フォールバックするので安全側。→ **v423 SQL を Dashboard で Run (Applied 確認) → その後 JS + functions + sw.js を push**。

### 検証
- syntax `npm run check` 24/24 OK。
- preview (python http.server) でモジュールロード console エラー 0 (循環 import 事故なし、12-auth に fetchMyProfile 追加 + renderMypage 直呼び)。
- ガード eval テスト: `share_banned`/`full_banned` でモーダル不開 + alert、`warn`/`ok` で通常通り開く、を確認。
- バナー/チップ (マイページ) と配信側 revoked・RLS はログイン状態/DB が要るため本番確認 (ロジックはレビュー済 + syntax OK)。

### 触ったもの
新規 `supabase/migrations/v423_share_ban.sql` (profiles 新設 + RLS + shares.revoked + INSERT/UPDATE policy 強化 + set_account_status/ban_user_share/unban_user_share + EXECUTE REVOKE)。編集 `functions/share/[id].js` (revoked フィルタ) / `js/12-auth.js` (fetchMyProfile) / `js/14-share-ogp.js` (open*ShareModal ガード + 状態バナー) / `js/13-mypage-common.js` (ヘッダ状態チップ) / `sw.js` (v423)。

### 残課題
- **ユスケ作業**: v423 SQL を Dashboard で Run → migration 末尾に `-- Applied:` 追記。Run 後に JS を push (デプロイ順)。
- 別タスク: 管理 GUI / 自動発動 (スパム量・通報) / full_banned の個人記録新規作成停止 enforcement (v421 trip policy に `AND NOT EXISTS(full_banned)` を足す形・ただし SELECT/閲覧は最後まで残す方針、v423 コメントに拡張点を記録済)。

---

## 272. v422 — 駅 ID 体系 Phase 2 クローズ (集計 rebuild を id 優先 + name fallback に)

**バージョン**: v422 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A (クリーンアップ / 駅 ID 体系の純度向上)
**変更ファイル**: [`js/04b-ride-record.js`](js/04b-ride-record.js)（1 ファイルのみ）

### 背景

TODO 🔥「駅 ID 体系 Phase 2: trip データに `*_station_id` 列追加 + Supabase 移行」が未チェックのまま残っていたが、着手前調査で **本丸 (2-a/2-b/2-c) は v310〜v312 で完成・デプロイ済**、旧 `from_station`/`to_station` 列も v326 で DROP 済 (Applied 2026-05-25)、`js/20-dev-backfill.js` も撤去済と判明。実質残っていたのは TODO の「2-d: 集計の `seg.from/to` name 経由 fallback を撤去」(明示的に「Phase 3 と一緒でも可」扱い) の 1 点だけだった。

具体的には、マイページ検索/フィルタ ([`13-mypage-common.js`](js/13-mypage-common.js) `tripMatchesAnyStation`) は v3xx で既に「`seg.from_id`/`to_id` 優先 + name fallback」になっていたのに、**地図塗りの中核集計 [`04b-ride-record.js`](js/04b-ride-record.js) `rebuild()` だけが駅名照合のまま取り残されていた**:

```js
const fromIdx = targetSl.stations.findIndex(s => s.name === seg.from);
const toIdx   = targetSl.stations.findIndex(s => s.name === seg.to);
```

### 設計判断

- **「実用版」を採用** (ユスケ判断): id 優先を足しつつ name fallback は残す。`seg.from_id` を持たない旧形式 trip も従来どおり塗れる。完全版 (segments JSONB を全件 backfill して name 照合を物理撤去) は半日級 + 旧 N02-id trip 救済 fallback まで壊すリスクがあり、Phase 3 とまとめる方が筋なので見送り。
- 13-mypage-common と**同一パターンに統一**: `if (seg.from_id) findIndex(id); if (<0) findIndex(name);`。これで「集計 (地図塗り) も trip データが持つ駅 id を尊重」= 同名異所駅を trip データレベルで厳密区別する Phase 2 の動機を集計経路でも満たす。
- resolve 経路 fallback ブランチ ([04b:364-387](js/04b-ride-record.js:364)、旧 N02-id trip 救済) は name 照合のまま据置 (これらの trip は from_id/to_id を持たないため)。

### 検証 (preview, 山手線 東京 s_00001 → 秋葉原 s_00049 で合成 seg を rebuild)

| ケース | 入力 | 期待 | 結果 |
|---|---|---|---|
| A: id 優先 | name をわざと壊し from_id/to_id 正 | 塗れる | ✅ 3 駅 (旧コードは 0) |
| B: name fallback | from_id/to_id 無し | 塗れる | ✅ 3 駅 |
| C: 無効 | id も name も不一致 | 塗れない | ✅ 0 駅 |
| D: id miss → fallback | 存在しない id + 正しい name | 塗れる | ✅ 3 駅 |

console error 0。id 優先・回帰なし・誤爆なし・グレースフルデグレードを確認。

### 落とし穴 (preview SW キャッシュ)

検証中、ローカル python http.server + ブラウザ HTTP キャッシュの相互作用で **SW (`norireco-v422`) が install 時に `cache.addAll`(=`cache:'default'`) で旧 04b を拾って固定化**し、新コードが配信されない事象に遭遇。`fetch(no-store)` / `fetch(cache:'reload')` では新が取れることを確認 → SW キャッシュの該当エントリを fresh fetch で put 上書き → reload で新コード確認、という手順で回避した。本番 (Cloudflare Pages) では commit 済ファイルが配信されるため起きない、ローカル検証限定の現象。

### 残課題 → 「name 照合の物理撤去 (完全版)」は今やらないと決定

- v422 調査で現状を正確に棚卸し: 格納 trip segment を name 照合する箇所は **6 ファイル ~15 ペア**、id 優先化済は 04b `rebuild` (v422) + 13-mypage の 2 箇所のみ。残りは 13a-stats ~9 (完乗率・統計 16 種) / 02b-service-lines-builder / 14-share-ogp / 21-bulk-record ×2 が素の name 照合 (いずれも SL resolve 後なので機能上は正しく動作)。
- 完全版 = 残 ~13 サイト id 優先化 → segments JSONB の from_id/to_id 全件 backfill → name fallback + 旧 N02 救済 (04b:331-389 / 02b candidateN02Ids) 撤去 → 全層回帰検証。**1.5〜2 セッション級**。
- **判断: 今やらない (採用 A)**。SERVICE_LINE 内で駅名は一意 = name 照合は実質 id 照合と等価で体験改善ゼロ、逆に backfill 漏れで履歴 trip が地図から消える silent 破壊リスクを負うだけ。動機 (グローバル展開・AI 自動列車判定) の着手直前にまとめてやる。TODO 🌱 布石 #7 に発動条件付きで記録、設計判断は Notion §2.7.2 意思決定ログ参照。
- これで TODO 🔥「駅 ID 体系 Phase 2」は実用上クローズ → TODO から削除 (Phase 3 も全サブ項目完了済のため完了コメント化)。

---

## 271. v421 — Supabase RLS 強化 (v233 残課題本丸を閉じる)

**バージョン**: v421 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A (セキュリティ / アーキテクチャ補強)
**migration**: [`supabase/migrations/v421_trips_grants_rls.sql`](supabase/migrations/v421_trips_grants_rls.sql) (Run 後 Applied 行追記)

### 背景

v420 (§270) で `renderMpStatsSection` の anon select バグを応急対処したが、**根本原因は v233 (2026-05-19) から残置されていた「`norireco_trips` / `norireco_character_grants` の RLS が anon SELECT を許可している」状態そのもの**。SUPABASE_KEY は frontend 公開 anon key なので、UI 防御だけ重ねても curl からは `?select=*` で全件取れる。v420 の症状はその穴がたまたま JS バグ経由で表面化しただけで、curl 経路は依然として開いていた。

v418 で未ログイン (ゲストモード) を `saveMultiSegmentTrip` / `saveBulkDrafts` の `isGuest` 分岐で「Supabase POST skip / localStorage 行き」と確定したことで、「`user_id IS NULL` の新規 row は二度と作られない」契約が成立。**RLS を `auth.uid() = user_id` で締めるための前提条件が今ちょうど整った**ので、本セッションで本丸を閉じる。

### 設計判断

#### 1. 既存 `user_id IS NULL` レコードは物理 DELETE
- 選択肢:
  - (A) 物理 DELETE — RLS 厳格化、NOT NULL 化、FK CASCADE 化が綺麗に通る
  - (B) backfill 用に「NULL は authenticated に SELECT/UPDATE 許可」policy を残す — 「未ログインで作った row を誰でも横取りできる」抜け穴になる
  - (C) 何もしない (NULL は永遠に取り出せない死蔵データ化)
- **(A) を採用 (ユスケ承認 2026-05-29)**。v418 以降は NULL が新規発生せず、現存 NULL は v135 (2026-...) 以前の残骸で本人含め誰も取り出せない死蔵データ。残しても容量浪費 + NOT NULL 化を阻むだけ。

#### 2. `user_id` を NOT NULL + `auth.users(id) ON DELETE CASCADE` 化
- v250 (`norireco_memos`) / v413 (`norireco_shares`) と同形に揃える。将来の穴防止 (nullable のままだと「次の v418 みたいな経路で誰かが NULL を入れた瞬間 RLS が無効になる」リスク)。
- CASCADE: アカウント削除時に trip / grant も自動掃除される。GDPR 的にもこの方が綺麗。

#### 3. RLS policy 4 件 (本人のみ全 CRUD) + REVOKE anon
- policy 4 件: SELECT/INSERT/UPDATE/DELETE 各 `auth.uid() = user_id` (v250 と同テンプレ、日本語 policy 名も統一)。
- **二重防御**: `REVOKE ALL ON ... FROM anon` でロール権限でも anon の SELECT を潰す。RLS policy だけだと future-proofing が弱い (将来「SELECT は公開」policy を誤って足したら穴が空く)。`norireco_shares` のように意図的に anon SELECT したいテーブルだけ `GRANT SELECT TO anon` する方針 (本件は両テーブルとも公開不要)。

#### 4. JS 側: anon Bearer → `authBearerToken()` (3 ファイル / 4 箇所)
| ファイル | 用途 | 修正前 | 修正後 |
|---|---|---|---|
| `js/03-characters.js` (2 箇所) | キャラ獲得 POST / SELECT | `Bearer ${SUPABASE_KEY}` | `Bearer ${authBearerToken()}` |
| `js/07-record-mode.js:1349-1358` | `saveMultiSegmentTrip` の trip POST | 同上 | 同上 |
| `js/21-bulk-record.js:_postTripToSupabase` | 一括記録の trip POST | `Bearer ${window.SUPABASE_KEY}` | `Bearer ${authBearerToken()}` |

`authBearerToken()` は 12-auth.js 既存のヘルパ (`auth.currentSession?.access_token || SUPABASE_KEY` — `||` 右辺の anon フォールバックは未ログイン時のみ作用するが、RLS が `auth.uid() = user_id` を要求するので結果として 403)。`isGuest` 分岐で未ログイン POST 自体を skip 済なので実害なし。

05/09/12/13/13b/14/15/16/18 は v418 以前から `authBearerToken()` 経由だったので無変更。

#### 5. backfill ロジック (`backfillUserIdForLegacyData`) を廃止
- v135 で導入された「初回ログイン時に `user_id=NULL` を自 uid に PATCH」処理。v418 以降 NULL 新規発生が止まり、v421 で残骸物理 DELETE + NOT NULL 化したことで完全な死にコードになった。
- `auth.authBackfillRan` state は「初回同期 (trip/grant/color/memo) の重複防止」用途で `auth.initialSyncRan` にリネームして残置 (後段の `syncFromSupabase` / `syncCharacterGrantsFromSupabase` / `colorOverrides.syncFromSupabase` / `memos.sync` が二重に走らないようにするため)。

#### 6. デプロイ順序: JS 先 deploy → SQL 後 Run
- 逆順だと「SQL 実行直後・JS deploy 前」の隙間で旧 anon Bearer 経路 (03/07/21) が 401/403 を返してユーザーの保存・同期が失敗する。
- JS 先 deploy なら「JS deploy 済・SQL 未 Run」の隙間は RLS 緩和の旧状態のままなので、誰の操作も失敗しない (代わりに anon 穴がほんの少しだけ続くが、これは v233 から続いている既存状態の継続なので新規リスクはない)。

### 失敗教訓

- **v233 で「UI 防御だけ入れて RLS 据え置き」とドキュメント化したのが甘かった**。anon key 公開前提なら UI 防御は frontend の挙動を整えるだけで、curl から の生 REST は防げない。半年以上「Supabase RLS 強化 (v233 残課題)」が TODO 🔥 に残り、最終的に v420 で実害バグとして顕在化した。
- **次回以降の教訓**: 「frontend に anon key を渡すアプリケーションでテーブルを新規作成するときは、最初から RLS policy + GRANT/REVOKE をテンプレ migration に書く」を v250 以降は徹底できているが、v135 (まだ未ログイン主体だった頃のスキーマ) はこの規律の前に作られていた。今回それを後追いで揃えた。

### 変更ファイル

- 新規: `supabase/migrations/v421_trips_grants_rls.sql`
- 変更: `js/03-characters.js` / `js/07-record-mode.js` / `js/21-bulk-record.js` / `js/12-auth.js` / `sw.js` / `STATUS.md` / `TODO.md`
- 詳細は `git diff --name-only` 参照 (v270 ルール)

### 残課題

- なし。本タスクで完結。
- 関連の TODO 🔥「Supabase RLS 強化 (v233 の残課題)」を削除。

### Notion 反映 (セッション末まとめで対応)

- §2.2 Supabase: テーブル一覧の `norireco_trips` / `norireco_character_grants` 行に RLS 4 policy を追記、Applied 規約準拠
- §2.7.2 意思決定ログ: 「v233 → v421 の経緯」「物理 DELETE 採用理由」「JS 先 deploy → SQL 後 Run の順序判断」

---

## 270. v420 — ゲスト📊統計タブが anon key で全ユーザーの trip を取得してたバグ修正

**バージョン**: v420 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A (バグ修正 / v419 のフォロー — 同一症状の別ルート)

### 症状

v419 push 後、ユスケがハードリロード再確認 — **依然として** ゲストモードで「総旅程 168 回」と表示。v419 で `_mypageCache` を `user_id` 空フィルタに直したのに改善しない。

### 原因

📊 統計タブの実体である [`js/09-tabs-stats.js`](js/09-tabs-stats.js#L317) `renderStats()` は `_mypageCache` を使わず、**直接 Supabase に fetch** していた:

```js
const _uid = currentUserId();
const _statsUrl = _uid
  ? `${SUPABASE_URL}/rest/v1/norireco_trips?select=*&user_id=eq.${_uid}`
  : `${SUPABASE_URL}/rest/v1/norireco_trips?select=*`;   // ← uid 無しで全 trip 取得
fetch(_statsUrl, { headers: { 'apikey': SUPABASE_KEY, ... } })
```

ゲストモードでは `_uid=null` で 3 項演算の else 枝に入り、`user_id` フィルタなしの全件 SELECT を anon key で投げる。RLS が anon select を許可しているため (v233 残課題)、**他人を含む全ユーザーの trip が取れて 168 件出ていた**。

データ取得経路の整理:
- 完乗率カード (`buildCompletionCards(trips)`): 引数の `guestTrips` (v419 で user_id 空のみ) → 正しい ✅
- 🚃 旅程 (`renderMpTripsSection`): `_mypageCache` 読込 → 正しい ✅
- 📋 路線 (`aggregateTripsByLineId` 等): `_mypageCache` 読込 → 正しい ✅
- 📊 統計 (`renderStats`): **直接 Supabase fetch** → 壊れていた ❌
- 📸 メモ / 🔗 シェア: 既存 uid ガード → 正しい ✅

`renderStats` だけが他と異なる読込経路を持っていた (v60〜 初期実装の名残)。

### 修正

[`js/13a-stats.js`](js/13a-stats.js#L29) `renderMpStatsSection` に未ログインガードを追加。`renderStats` 自体には触らず、呼び出し手前で分岐する形にして v233 RLS 残課題の真の解決は将来に持ち越し。

```js
import { currentUserId } from './12-auth.js';
function renderMpStatsSection() {
  const statsDiv = document.getElementById('stats-content');
  if (!statsDiv) return;
  statsDiv.innerHTML = '';
  if (!currentUserId()) {
    statsDiv.innerHTML = `<div class="mp-empty">...
      <div class="mp-empty-t">統計はログイン後に表示されます</div>
      <button onclick="openAuthModal()">🔑 ログイン / 会員登録</button>
    </div>`;
    return;
  }
  try { renderStats(); } catch(e) { ... }
}
```

ユスケの要件「データは反映されなくていい」(= Supabase fetch 不要) と整合する。ゲストモードで「今作った分」を見たい場合は 🚃 旅程 / 📋 路線サブタブで確認可能 (こちらは localStorage user_id 空フィルタが効いている)。

### v420 で完成したゲストモード挙動

- 上部完乗率カード: 0% (ゲストで作った分 = user_id 空、をベースに計算。今は何も作ってなければ 0)
- 📊 統計: 「統計はログイン後に表示されます」エンプティ + 🔑 ログイン CTA
- 🚃 旅程: 「過去の乗車をまとめて記録」ボタン + ゲストで作った trip のリスト (なければ空状態)
- 📋 路線: SERVICE_LINES + ゲスト trip ベースの集計
- 📸 メモ: 「ログインしてください」(既存)
- 🔗 シェア: 「ログインが必要です」(既存)

### v233 RLS 残課題 (持ち越し)

`renderStats` が anon key で全 trip を取れる根本問題は今回触っていない。すべての mypage 統計表示が **クライアント側で** uid フィルタを徹底しているのと、anon select を許可している RLS ポリシーがあるため、悪意ある攻撃者は REST 直叩きで他人の旅程データを取得可能。垢 BAN 対応と並んで TODO 🔥 最優先に残置。

---

## 269. v419 — ゲストモード統計が過去ログイン中の trip まで集計してたバグ修正

**バージョン**: v419 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A (バグ修正 / v418 のフォロー)

### 症状

ユスケが v418 をシークレットウィンドウではなく通常ブラウザでテスト。マイページが「ゲスト / 未ログイン」と認識されているのに統計タブで:

- 総旅程数: **168 回** (実際は今回ゲストで作った 1 件のはず)
- 延べ乗車駅数: 1321 駅 / 総乗換 25 回 / 総乗車時間 2 時間 33 分
- 月別グラフに 2025-01 や 2025-05 の旅程が表示

ユスケ「ゲストモードで統計がおかしいね / 1 旅程しかしてないのに、、、」。

### 原因

v418 の `renderMypage` 未ログイン分岐は `localStorage.norireco_trips` を **無条件で全件** `_mypageCache` に詰めていた。

ユスケの localStorage には過去ログイン中に Supabase 同期で書き込まれた `user_id` 付の trip が 167 件残っていた状態で:
1. 何らかの理由 (session expire / 別タブで logout 等) でログイン状態が解けた
2. でも `clearLocalUserDataAfterSignOut` が走らなかった → localStorage は keep
3. ゲストモードでマイページを開く → 過去 167 件 + ゲストで作った 1 件 = 168 件が集計に出た

### 修正

[`js/13-mypage-common.js`](js/13-mypage-common.js) のゲスト分岐で localStorage を **`user_id` が空のもの (= ゲストモードで作った分) だけ** に絞る。

```js
const raw = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
guestTrips = Array.isArray(raw) ? raw.filter(t => !t.user_id) : [];
```

[`js/05-supabase-data.js`](js/05-supabase-data.js) の `loadRiddenSegsFromStorage` が「user_id 付のみ」通す既存挙動 (v238) と **対称** になり、地図側とマイページ側で「ゲストモードに見えるデータ」が一致する:

- 地図 (起動時 RIDDEN_SEGS): `user_id` 付のみ → 過去ログインの trip は地図に塗られる
- マイページ ゲストモード統計: `user_id` 空のみ → 過去ログインの trip は除外

注意: 過去ログインのデータが地図に塗られたまま見えるのは「ログインを促す」UI 上は許容範囲 (ログインすれば自分のデータとして扱える、ゲストモードでは「他人の/古いセッションの」扱い)。

### 検証 ToDo

- ゲストモードでマイページ → 統計タブ → 「総旅程 0 回」になっているか (まだ何も保存してない時)
- 📋 で 1 件保存 → 統計タブ → 「総旅程 1 回」になるか
- リロード → 0 回に戻るか (loadRiddenSegsFromStorage が user_id 空を弾くので RIDDEN_SEGS にも入らない、localStorage には残るが renderMypage は user_id 空フィルタで通す → 1 件残るはず → ここの意味論を v419 中の挙動として確認)

---

## 268. v418 — 未ログイン (ゲストモード) で記録機能とマイページ概要を開放 + オンボーディングバナー「一瞬しか出ない」修正

**バージョン**: v418 (CACHE_VERSION)
**日付**: 2026-05-29
**カテゴリ**: A (実装 / 🔥 新規ユーザー導線の改善)

### 背景

ユスケが新規 (未ログイン) ユーザー目線でアクセスした際の問題が 2 つ重なって報告された:

1. **空マップ時の📋オンボーディングバナーが「一瞬しか表示されない」** — 既ログインで Supabase 旅程あり / localStorage 空 (初回起動 or 別端末からの初アクセス) のシナリオで、DOMContentLoaded 時点でバナー表示 → 数秒後 syncFromSupabase 完了 → 3 秒後 setTimeout で hide、という挙動。ユスケから見ると「ちらっと出てすぐ消える」状態。
2. **未ログインだと触れない機能が多すぎる** — マイページは「🔑 ログインしてください」エンプティで完全に閉ざされ、🔑 📝 📍 記録 FAB も `fab-login-only` クラスで CSS 非表示。新規訪問者が「何ができるか」を試せず、ログインの判断材料が得られない。

### ユーザー要望

ユスケ:
- 「タップしてまとめて記録が一瞬しか表示されない」 → バナー直し
- 「未ログインでも、記録できるようにする」
- 「マイページの画面の概要をみれるようにする」
- 「データは反映されなくていい」 (= Supabase 反映不要、localStorage で OK)
- 「更新すると記録はのこらないので、ログインして使うように説明を表示」

範囲確認 (AskUserQuestion): 一括記録 (📋) / 手動記録 (📝) / GPS 記録 (📍) / マイページ概要 すべて開放方針で確定。

### 実装

#### 1. オンボーディングバナーの settle ゲート ([`js/21-bulk-record.js`](js/21-bulk-record.js))

`_syncSettled` フラグを追加。Supabase 同期 (または未ログイン確認) が settle するまで `updateOnboardingBanner` は `hidden=true` を強制 → フラッシュ表示を防ぐ。

- `markSyncSettled()` を新規 export。一度 true になったら戻らない (ログアウト時に lifecycle 全体が purge されるため戻り経路は不要)。
- DOMContentLoaded 直後の `setTimeout(updateOnboardingBanner, 3000)` を撤去し、代わりに 8 秒の fallback `setTimeout(() => markSyncSettled(), 8000)` を置く (ネットワーク不調・SDK 初期化失敗時の保険)。

#### 2. settle hook を呼ぶ 3 経路 ([`js/05-supabase-data.js`](js/05-supabase-data.js) / [`js/12-auth.js`](js/12-auth.js))

循環 import 回避のため `window.NORIRECO?.bulkRecord?.markSyncSettled?.()` 経由で呼ぶ。

- 05 `syncFromSupabase`: 未ログイン return / trips 0 件 return / 正常完了 / catch 例外 の 4 経路すべてで markSyncSettled。
- 12 `initializeAuth`: getSession 初期セッションなし / getSession 例外 の 2 経路で markSyncSettled (handleAuthChange → syncFromSupabase 経路は 05 側でカバー)。

#### 3. 記録 FAB を未ログインに開放 ([`noritetsu-map.html`](noritetsu-map.html))

`.record-fab`(📝) と `.location-fab`(📍) から `fab-login-only` クラスを撤去。CSS ルール (`body:not(.user-authed) .fab-login-only{display:none}`) 自体は残置 (将来用)。📋 一括記録は元から制限なし。

#### 4. 保存系の uid=null 許容 ([`js/07-record-mode.js`](js/07-record-mode.js) / [`js/21-bulk-record.js`](js/21-bulk-record.js))

「Supabase 反映なし」要件に従い、未ログイン時は `_postTripToSupabase` をスキップして localStorage のみに保存。

- saveMultiSegmentTrip: `const isGuest = !currentUserId()` で分岐。POST スキップ + トースト分岐。
- saveBulkDrafts: 同様に分岐。未ログインは savedCount に直接カウント (Supabase 失敗カウントが立たないように)。
- トースト: 未ログイン時は黄色 (`'warn'`, 9 秒) で「✅ 記録 📝: 3区間 5駅 / ⚠️ 端末内のみ・ブラウザ更新で消えます / 🔑 ログインで保存」。

#### 5. マイページ ゲストモード ([`js/13-mypage-common.js`](js/13-mypage-common.js))

`renderMypage` 未ログイン分岐を「ログインしてください」エンプティから「ゲストヘッダ + 警告バナー + 完乗率カード + サブタブ nav」に置換。

- ゲストヘッダ: アバター「?」 + 「ゲスト / 未ログイン」 + 🔑 ログインボタン
- ゲスト警告バナー (`.mp-guest-warn`): 「ゲストモードで表示中 / 記録はこの端末にのみ保存され…ログインしてください」+ CTA。
- 完乗率カード: `localStorage` から trips を直接ロードして `buildCompletionCards` に渡す (Supabase fetch は行わない = 「反映不要」要件と整合)。`SERVICE_LINES build` は await。
- サブタブ nav: 5 タブ全部表示。
  - 📊 統計 / 🚃 旅程 / 📋 路線 → `_mypageCache` (localStorage trips) ベースで動作。
  - 📸 メモ / 🔗 シェア → 既存実装が `currentUserId() === null` で「ログインが必要です」エンプティを返すので、クラッシュせずそのまま表示。
- `showAllSubpanes(false)` を撤去 (各サブペインを表示可能に)。

#### 6. ゲスト警告バナー CSS ([`noritetsu-map.html`](noritetsu-map.html))

`.mp-guest-warn` を `.mp-tm-banner` (期間フィルタバナー) と同じ位置に追加。ゴールド系のグラデーション + 左ボーダーで注意喚起。

### syntax-guard

- node --check 5 ファイル clean
- 新規循環 import なし (21 → 05/12 への上り逆参照は window 経由のみ)
- window グローバル衝突なし (markSyncSettled は NORIRECO.bulkRecord のみで露出)

### 検証 ToDo (ユスケ)

- 未ログイン (シークレットウィンドウ) で開く → マイページに「ゲストモード」ヘッダ + 警告バナー + 5 タブ。
- 📋 一括記録モーダルで 1 件保存 → トーストに ⚠️ 警告。リロード → 記録は消える (localStorage は keep されるはずなので、もし「リロードで消える」を厳格に守るなら追加検討必要 → 現状は localStorage に残るが Supabase 同期しないので「他端末では見えない」 = 実用上「消える」と説明可)。

(localStorage の永続性については別途協議。今回は最小実装で「Supabase に行かない = 紛失リスクがある」として案内している。)

---
