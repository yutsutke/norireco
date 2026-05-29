-- v425: norireco_trips の旧 FOR ALL policy を DROP (v424 enforcement の穴塞ぎ)
--
-- 経緯:
--   - v424 で trips INSERT policy に full_banned ガード追加 → Dashboard Run 後の確認 SELECT
--     (`SELECT tablename, cmd, count(*) FROM pg_policies ... GROUP BY ...`) が 12 行のはずが 13 行。
--     スクリーンショット確認で `norireco_trips` に `cmd='ALL'` の policy が 1 件追加で残留と判明。
--   - PostgreSQL の RLS は **同一操作に複数 policy がある場合 OR 評価** (PERMISSIVE = ANY)。
--     旧 ALL policy が `auth.uid()=user_id` だけで通せば、v424 の `auth.uid()=user_id AND
--     NOT EXISTS(full_banned)` の INSERT policy と OR 結合されて **full_banned ガードが素通り**。
--     v424 enforcement が機能していない状態だった。
--   - 旧 ALL policy は v135 (user_id 列追加) ～ v250 頃の歴史的残骸の可能性が高い。v421 の
--     RLS 強化が個別 cmd 名 (FOR SELECT/INSERT/UPDATE/DELETE) で DROP したため、ALL 名前は
--     漏れて残留した
--
-- スコープ:
--   - `norireco_trips` に対する `cmd='ALL'` の policy を **すべて** DROP (名前不問)
--   - `norireco_character_grants` / `norireco_memos` は v424 確認 SELECT で ALL policy 無し
--     確認済 → 触らない
--
-- 設計判断:
--   - **個別 policy 名を hard-code しない**: 過去の名前が不明 + 将来 Dashboard UI から誤って
--     ALL policy が再び作られた場合の保険として、DO ブロックで「ALL を全部消す」を冪等な操作と
--     して記述する。再 Run しても安全 (ALL 0 件なら NOOP)
--   - **v421 の 4 件 (本人のみ FOR SELECT/INSERT/UPDATE/DELETE) と v424 の INSERT policy
--     (full_banned ガード入り) は据え置き** — 触らない
--   - **CACHE_VERSION を v425 に bump** (sw.js): JS 変更ゼロだが「デプロイ回数 = バージョン番号」
--     の不変式 (CLAUDE.md 規約) に従う
--
-- 実行: Supabase Dashboard → SQL Editor → 全文ペースト → Run
-- 確認: 後段 SELECT で cmd='ALL' 行 0 件、SELECT/INSERT/UPDATE/DELETE 各 1 件 (= 4 行) を確認
-- 実行後: この migration ファイル末尾に `-- Applied: YYYY-MM-DD by <user>` を追記して commit

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 1. norireco_trips の cmd='ALL' policy を全て DROP             ║
-- ╚══════════════════════════════════════════════════════════════╝
DO $$
DECLARE
  pname text;
BEGIN
  FOR pname IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'norireco_trips'
      AND cmd = 'ALL'
  LOOP
    EXECUTE format('DROP POLICY %I ON norireco_trips', pname);
    RAISE NOTICE 'Dropped legacy ALL policy on norireco_trips: %', pname;
  END LOOP;
END $$;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 2. PostgREST にスキーマ変更を反映                              ║
-- ╚══════════════════════════════════════════════════════════════╝
NOTIFY pgrst, 'reload schema';

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 3. 確認                                                        ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 3-A. norireco_trips の現在の policy 一覧 (cmd='ALL' が消えていること)
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'norireco_trips'
ORDER BY cmd, policyname;
-- 期待: 4 行 (SELECT / INSERT / UPDATE / DELETE 各 1 件、cmd='ALL' は無し)

-- 3-B. INSERT policy の with_check に full_banned が残っていること (v424 が機能する確認)
SELECT policyname, cmd, (with_check LIKE '%full_banned%') AS has_full_banned_guard
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'norireco_trips' AND cmd = 'INSERT';
-- 期待: 1 行 (has_full_banned_guard = t)

-- Applied: 2026-05-29 by yutsutke (確認 3-A: 4 行 cmd='ALL' 0 件 OK / 3-B: has_full_banned_guard = true OK)
