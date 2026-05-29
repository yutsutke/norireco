-- v421: norireco_trips / norireco_character_grants の RLS 強化
--
-- 経緯:
--   - v135 で user_id 列を nullable 追加 (初回ログイン時 backfill 前提)
--   - v233 (2026-05-19) で UI 防御として「未ログイン時は Supabase 同期 skip」を入れたが、
--     RLS policy 自体は据え置きで anon SELECT が通る状態が残った (CHANGELOG_PHASE3.8-share.md §82)
--   - **v420 (2026-05-29) で顕在化**: マイページ📊統計タブ (`renderMpStatsSection`) が
--     anon key + user_id フィルタ無しの全 trip select を投げており、未ログインゲストモードで
--     他人 168 旅程が統計に出るバグ。応急処置として未ログインガードを足したが、
--     SUPABASE_KEY は frontend 公開 anon key なので curl からは依然として全件取れる状態
--   - v418 で未ログイン (ゲストモード) を開放したことで「user_id IS NULL の新規 row は Supabase に
--     作られない」契約が成立 (saveMultiSegmentTrip / saveBulkDrafts が isGuest 分岐で POST skip)。
--     RLS を `auth.uid() = user_id` で締めるための前提条件が今ちょうど整った
--
-- 設計判断:
--   - **既存 user_id IS NULL は物理 DELETE** (yutsutke 2026-05-29 承認) — v135 以前の残骸で、
--     RLS 強化後は本人含め誰も SELECT/UPDATE できない死蔵データ。残しておくと NOT NULL 化できない
--   - **user_id を NOT NULL + auth.users(id) ON DELETE CASCADE 化** — v250 / v413 と同形。将来の穴防止 +
--     アカウント削除時の trail 自動掃除
--   - **RLS policy 4 件 (本人のみ全 CRUD)** — v250 と同テンプレ。SELECT も本人限定なので anon は 0 行
--   - **REVOKE ALL FROM anon** — RLS だけでなくロール権限でも anon の SELECT を確実に潰す (二重防御)
--   - **デプロイ順**: JS 先 deploy (v421 = anon Bearer → access_token Bearer 切替) → 本 SQL を Run の順。
--     逆だと SQL 実行直後・JS deploy 前の隙間で旧 anon Bearer 経路 (03/07/21) が 401/403 で書き込み失敗する
--
-- 実行: Supabase Dashboard → SQL Editor → 全文ペースト → Run
-- 確認: 後段の SELECT で table 2 / policies 8 (各 4) / NOT NULL = NO が見えれば OK
-- 実行後: この migration ファイル末尾に `-- Applied: YYYY-MM-DD by <user>` を追記して commit

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 0. クリーンアップ前の件数確認 (Run 時に目視チェック用)        ║
-- ╚══════════════════════════════════════════════════════════════╝
SELECT
  'norireco_trips' AS table_name,
  count(*) AS null_user_id_rows
FROM norireco_trips WHERE user_id IS NULL
UNION ALL
SELECT
  'norireco_character_grants',
  count(*)
FROM norireco_character_grants WHERE user_id IS NULL;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 1. 残骸 (user_id IS NULL) を物理 DELETE                       ║
-- ╚══════════════════════════════════════════════════════════════╝
DELETE FROM norireco_trips             WHERE user_id IS NULL;
DELETE FROM norireco_character_grants  WHERE user_id IS NULL;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 2. user_id を NOT NULL + auth.users(id) FK CASCADE 化         ║
-- ╚══════════════════════════════════════════════════════════════╝
ALTER TABLE norireco_trips
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE norireco_character_grants
  ALTER COLUMN user_id SET NOT NULL;

-- FK は既存があれば DROP してから付け直す (CASCADE 化を冪等に)
ALTER TABLE norireco_trips
  DROP CONSTRAINT IF EXISTS norireco_trips_user_id_fkey;
ALTER TABLE norireco_trips
  ADD CONSTRAINT norireco_trips_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE norireco_character_grants
  DROP CONSTRAINT IF EXISTS norireco_character_grants_user_id_fkey;
ALTER TABLE norireco_character_grants
  ADD CONSTRAINT norireco_character_grants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 3. RLS 有効化 + 本人のみ全 CRUD policy (v250 と同テンプレ)    ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── 3-A. norireco_trips
ALTER TABLE norireco_trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "旅程は本人のみ読込可" ON norireco_trips;
CREATE POLICY "旅程は本人のみ読込可"
  ON norireco_trips FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "旅程は本人のみ追加可" ON norireco_trips;
CREATE POLICY "旅程は本人のみ追加可"
  ON norireco_trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "旅程は本人のみ更新可" ON norireco_trips;
CREATE POLICY "旅程は本人のみ更新可"
  ON norireco_trips FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "旅程は本人のみ削除可" ON norireco_trips;
CREATE POLICY "旅程は本人のみ削除可"
  ON norireco_trips FOR DELETE
  USING (auth.uid() = user_id);

-- ── 3-B. norireco_character_grants
ALTER TABLE norireco_character_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "キャラ獲得は本人のみ読込可" ON norireco_character_grants;
CREATE POLICY "キャラ獲得は本人のみ読込可"
  ON norireco_character_grants FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "キャラ獲得は本人のみ追加可" ON norireco_character_grants;
CREATE POLICY "キャラ獲得は本人のみ追加可"
  ON norireco_character_grants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "キャラ獲得は本人のみ更新可" ON norireco_character_grants;
CREATE POLICY "キャラ獲得は本人のみ更新可"
  ON norireco_character_grants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "キャラ獲得は本人のみ削除可" ON norireco_character_grants;
CREATE POLICY "キャラ獲得は本人のみ削除可"
  ON norireco_character_grants FOR DELETE
  USING (auth.uid() = user_id);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 4. ロール権限の整理 (二重防御: RLS + GRANT)                   ║
-- ║   anon は本人特定不能なので全権限を REVOKE。authenticated は  ║
-- ║   フル CRUD を許可 (RLS policy が auth.uid() でさらに絞る)   ║
-- ╚══════════════════════════════════════════════════════════════╝
REVOKE ALL ON norireco_trips             FROM anon;
REVOKE ALL ON norireco_character_grants  FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON norireco_trips            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON norireco_character_grants TO authenticated;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 5. PostgREST にスキーマ変更を反映                              ║
-- ╚══════════════════════════════════════════════════════════════╝
NOTIFY pgrst, 'reload schema';

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 6. 確認                                                        ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 6-A. user_id 列の NOT NULL 化が効いているか
SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('norireco_trips', 'norireco_character_grants')
  AND column_name = 'user_id'
ORDER BY table_name;

-- 期待: 2 行 (両テーブル, is_nullable = NO)

-- 6-B. RLS policy が 4 件ずつ並んでいるか
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('norireco_trips', 'norireco_character_grants')
ORDER BY tablename, policyname;

-- 期待: 8 行 (両テーブル × SELECT/INSERT/UPDATE/DELETE 各 1 件)

-- 6-C. rowsecurity が ON になっているか
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('norireco_trips', 'norireco_character_grants')
ORDER BY tablename;

-- 期待: 2 行とも rowsecurity = t

-- 6-D. anon ロールから読めなくなっているか (件数 0 を確認)
SELECT
  has_table_privilege('anon', 'norireco_trips', 'SELECT')            AS anon_can_select_trips,
  has_table_privilege('anon', 'norireco_character_grants', 'SELECT') AS anon_can_select_grants;

-- 期待: 1 行 (両カラム false) — RLS とは独立にロール権限でも anon は読めない

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 7. Applied 規約 (Run 後に追記)                                ║
-- ║   このファイル末尾の `-- Applied: YYYY-MM-DD by <user>` が    ║
-- ║   migration 実行済みの一次情報 (CLAUDE.md / v333 規約)        ║
-- ╚══════════════════════════════════════════════════════════════╝
