-- v438: admin シェア計測 横断ビュー RPC
--
-- 経緯:
--   - v436 (view/click) + v437 (signup attribution) でシェア漏斗の計測が揃った。
--   - 各シェアの反響は所有者本人がマイページ🔗カードで見られるが、運営 (admin) が
--     全シェアを横断して「どのシェアが view→click→signup を driving しているか」を
--     俯瞰する手段が無かった。それを admin タブ (13e-admin.js, v426) に足すための RPC。
--
-- 設計:
--   - 既存の admin 関数ファミリ (admin_list_profiles / admin_search_user /
--     admin_set_account_status、いずれも v426) と同形。SECURITY DEFINER + 関数冒頭の
--     is_admin() ゲート + EXECUTE public REVOKE → authenticated GRANT の多重防御。
--   - 読み取り専用 (SELECT のみ)。norireco_shares (公開 SELECT) + auth.users を LEFT JOIN し
--     所有者 email を付ける (auth.users は REST 非公開なので SECURITY DEFINER でしか引けない)。
--   - 並びは engagement 降順 (signup → click → view → created_at)。LIMIT 500 で上限。
--   - 列追加・新規テーブルは無し (view_count/click_count は v436、signup_count は v437 で既存)。
--
-- 依存: is_admin() (v426 で作成済) が存在すること。
--
-- 実行: Supabase Dashboard → SQL Editor → 全文ペースト → Run
-- 確認: 後段の SELECT で function 1 / grant (authenticated) が見えれば OK
-- 実行後: この migration ファイル末尾に `-- Applied: YYYY-MM-DD by <user>` を追記して commit

-- ── 1. 横断ビュー RPC (SECURITY DEFINER + is_admin ゲート)
CREATE OR REPLACE FUNCTION public.admin_list_share_metrics()
RETURNS TABLE (
  id           text,
  kind         text,
  title        text,
  created_at   timestamptz,
  user_id      uuid,
  email        text,
  revoked      boolean,
  view_count   integer,
  click_count  integer,
  signup_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  RETURN QUERY
    SELECT s.id, s.kind, s.title, s.created_at, s.user_id,
           u.email::text AS email, s.revoked,
           s.view_count, s.click_count, s.signup_count
      FROM norireco_shares s
      LEFT JOIN auth.users u ON u.id = s.user_id
     ORDER BY s.signup_count DESC, s.click_count DESC, s.view_count DESC, s.created_at DESC
     LIMIT 500;
END;
$$;

-- ── 2. EXECUTE 権限: authenticated のみ (関数内 is_admin() が最終ゲート)
REVOKE ALL ON FUNCTION public.admin_list_share_metrics() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_list_share_metrics() TO authenticated;

-- ── 3. PostgREST にスキーマ変更を反映
NOTIFY pgrst, 'reload schema';

-- ── 4. 確認
-- 4-A. 関数 (期待: 1 行 = admin_list_share_metrics / prosecdef=true)
SELECT proname, prosecdef
FROM pg_proc
WHERE proname='admin_list_share_metrics' AND pronamespace='public'::regnamespace;

-- 4-B. EXECUTE が authenticated に付いているか (期待: 1 行 = authenticated / EXECUTE)
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema='public' AND routine_name='admin_list_share_metrics'
  AND grantee='authenticated';

-- 期待値:
--   function 1 行: admin_list_share_metrics (prosecdef = true)
--   grant    1 行: authenticated / EXECUTE
