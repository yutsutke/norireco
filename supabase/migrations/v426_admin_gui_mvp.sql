-- v426: 垢BAN 管理 GUI MVP — norireco_admins テーブル + admin RPC 関数群
--
-- 経緯:
--   - v423/v424 で垢BAN 本体 (norireco_profiles + share_status + RLS + クライアントガード)
--     と full_banned enforcement、v425 で旧 ALL policy 残留の穴塞ぎが完了。発動は Dashboard
--     手動 SQL (`SELECT ban_user_share('<uuid>', '理由')`) で運用可能だが、ユーザーを探す→
--     状態確認→発動が毎回 SQL Editor 操作で手間。CHANGELOG §273 残課題「管理 GUI」を回収。
--   - MVP スコープ (yutsutke 確定 2026-05-29): BAN/warn 履歴のあるユーザー一覧 + uid/email
--     検索 + 4 ボタン (ok / warn / share_banned / full_banned)
--
-- スコープ:
--   1. `norireco_admins` テーブル (admin 認定リスト)
--   2. `is_admin()` 関数 (現在の auth.uid() が admin か boolean で返す)
--   3. `admin_list_profiles()` 関数 (BAN/warn 履歴のあるユーザー一覧 = profiles 全件 +
--      auth.users LEFT JOIN で email)
--   4. `admin_search_user(text)` 関数 (uid/email 部分一致検索)
--   5. `admin_set_account_status(uuid, text, text)` 関数 (admin だけが叩ける BAN/解除 RPC)
--   6. 全 admin_* 関数の EXECUTE 制御
--
-- 設計判断:
--   - **真実の源 = `norireco_admins` テーブル** — git repo に admin uid を hard-code しない
--     (public repo に uid 出ても JWT 不在で何もできないが、運用上 admin を追加・削除する
--     操作を Dashboard に集約する方が良い)。初期 admin (ユスケ) の追加は本 migration の運用
--     コメントに従って Dashboard で 1 行 SQL 手動 INSERT
--   - **`norireco_admins` の RLS は「本人の行のみ SELECT」**: 自分が admin かどうかは知れるが
--     他の admin が誰かは見えない。INSERT/UPDATE/DELETE policy は作らない = service_role
--     (Dashboard) のみ書込。norireco_profiles と同じ二重防御 (anon REVOKE / authenticated
--     は SELECT のみ GRANT)
--   - **全 admin_* 関数は SECURITY DEFINER**: 関数オーナー (postgres) 権限で実行されるので、
--     関数内で auth.users / norireco_admins / norireco_profiles を直接読める。関数冒頭で
--     `IF NOT is_admin() THEN RAISE EXCEPTION` で必ずゲート
--   - **EXECUTE は public REVOKE + authenticated GRANT** が必要: REVOKE しないと PostgREST
--     が `/rest/v1/rpc/<fn>` で anon にも公開する。authenticated に GRANT する理由はクライアント
--     が access_token Bearer で叩くため。non-admin が叩いても関数内の is_admin() で EXCEPTION
--   - **`admin_set_account_status` は v423 `set_account_status` を内部で呼ぶ** — DB 内ロジック
--     1 か所原則。admin_ 関数は authz layer (admin ゲート) として薄く存在
--   - **`auth.users` の email を返す**: Supabase は auth.users へのフロント直接 SELECT を許可
--     しない (REST API で `/auth/v1/user` のみ自分の情報を返す)。関数経由なら SECURITY
--     DEFINER で auth スキーマを読める。**機密情報を返すので必ず is_admin() ゲート**
--
-- 実行: Supabase Dashboard → SQL Editor → 全文ペースト → Run
-- 確認: 後段の確認 SELECT で table 1 / admin policy 1 / 関数 4 / 期待 ok
-- 実行後:
--   1. このファイル末尾に `-- Applied: YYYY-MM-DD by <user>` を追記して commit
--   2. **Dashboard で初期 admin (ユスケ) を追加**: 末尾の運用コメント参照
--      `INSERT INTO norireco_admins (user_id) VALUES ('<yutsutke の uuid>');`

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 1. norireco_admins テーブル                                    ║
-- ╚══════════════════════════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS norireco_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at   timestamptz NOT NULL DEFAULT now(),
  note       text
);

ALTER TABLE norireco_admins ENABLE ROW LEVEL SECURITY;

-- SELECT は本人の行のみ (自分が admin かどうかだけ知れる)
DROP POLICY IF EXISTS "admins は本人のみ読込可" ON norireco_admins;
CREATE POLICY "admins は本人のみ読込可"
  ON norireco_admins FOR SELECT
  USING (auth.uid() = user_id);

-- ★ INSERT/UPDATE/DELETE policy は意図的に作らない = service_role (Dashboard) のみ書込

-- 二重防御 (v421/v423 と同形)
REVOKE ALL ON norireco_admins FROM anon;
GRANT SELECT ON norireco_admins TO authenticated;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 2. is_admin() — 現在の auth.uid() が admin か                  ║
-- ╚══════════════════════════════════════════════════════════════╝
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM norireco_admins WHERE user_id = auth.uid()
  );
$$;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 3. admin_list_profiles() — BAN/warn 履歴のあるユーザー一覧     ║
-- ║   norireco_profiles に行があるユーザー = 何らかの状態変更を    ║
-- ║   受けた者 (= 管理対象)。auth.users LEFT JOIN で email も返す。 ║
-- ╚══════════════════════════════════════════════════════════════╝
CREATE OR REPLACE FUNCTION admin_list_profiles()
RETURNS TABLE (
  user_id       uuid,
  email         text,
  share_status  text,
  ban_reason    text,
  updated_at    timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  RETURN QUERY
  SELECT
    p.user_id,
    u.email::text,
    p.share_status,
    p.ban_reason,
    p.updated_at
  FROM norireco_profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  ORDER BY p.updated_at DESC;
END;
$$;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 4. admin_search_user(text) — uid / email 部分一致検索          ║
-- ║   profile が無いユーザーも探せるよう auth.users から            ║
-- ║   LEFT JOIN norireco_profiles で email + status を返す。        ║
-- ╚══════════════════════════════════════════════════════════════╝
CREATE OR REPLACE FUNCTION admin_search_user(q text)
RETURNS TABLE (
  user_id       uuid,
  email         text,
  share_status  text,
  ban_reason    text,
  updated_at    timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  IF q IS NULL OR length(trim(q)) = 0 THEN
    RETURN;  -- 空クエリは空結果
  END IF;
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text,
    COALESCE(p.share_status, 'ok') AS share_status,
    p.ban_reason,
    p.updated_at
  FROM auth.users u
  LEFT JOIN norireco_profiles p ON p.user_id = u.id
  WHERE
    u.email ILIKE '%' || q || '%'
    OR u.id::text = q
  ORDER BY (p.updated_at IS NULL), p.updated_at DESC, u.created_at DESC
  LIMIT 50;
END;
$$;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 5. admin_set_account_status() — admin が叩く BAN/解除 RPC     ║
-- ║   v423 set_account_status の薄いラッパー (is_admin ゲート)。   ║
-- ╚══════════════════════════════════════════════════════════════╝
CREATE OR REPLACE FUNCTION admin_set_account_status(
  target_uid uuid,
  new_status text,
  reason     text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  PERFORM set_account_status(target_uid, new_status, reason);
END;
$$;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 6. EXECUTE 制御                                                ║
-- ║   - public REVOKE で PostgREST RPC 公開を anon から塞ぐ        ║
-- ║   - authenticated にだけ GRANT (関数内 is_admin で更にゲート)  ║
-- ╚══════════════════════════════════════════════════════════════╝
REVOKE EXECUTE ON FUNCTION is_admin()                                          FROM public;
REVOKE EXECUTE ON FUNCTION admin_list_profiles()                               FROM public;
REVOKE EXECUTE ON FUNCTION admin_search_user(text)                             FROM public;
REVOKE EXECUTE ON FUNCTION admin_set_account_status(uuid, text, text)          FROM public;

GRANT  EXECUTE ON FUNCTION is_admin()                                          TO authenticated;
GRANT  EXECUTE ON FUNCTION admin_list_profiles()                               TO authenticated;
GRANT  EXECUTE ON FUNCTION admin_search_user(text)                             TO authenticated;
GRANT  EXECUTE ON FUNCTION admin_set_account_status(uuid, text, text)          TO authenticated;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 7. PostgREST にスキーマ変更を反映                              ║
-- ╚══════════════════════════════════════════════════════════════╝
NOTIFY pgrst, 'reload schema';

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 8. 確認                                                        ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 8-A. norireco_admins テーブル作成
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'norireco_admins';
-- 期待: 1 行 (norireco_admins)

-- 8-B. policy は SELECT 1 件のみ
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'norireco_admins'
ORDER BY policyname;
-- 期待: 1 行 (SELECT のみ)

-- 8-C. 関数 4 本
SELECT proname FROM pg_proc
WHERE proname IN ('is_admin', 'admin_list_profiles', 'admin_search_user', 'admin_set_account_status')
ORDER BY proname;
-- 期待: 4 行

-- 8-D. anon は admins を読めない / authenticated は SELECT のみ
SELECT
  has_table_privilege('anon',          'norireco_admins', 'SELECT') AS anon_select,
  has_table_privilege('authenticated', 'norireco_admins', 'SELECT') AS auth_select,
  has_table_privilege('authenticated', 'norireco_admins', 'INSERT') AS auth_insert;
-- 期待: false / true / false

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 9. 運用 — 初期 admin (ユスケ) の追加                          ║
-- ║                                                                ║
-- ║   下記 SQL を Dashboard で 1 度だけ Run してください:           ║
-- ║                                                                ║
-- ║   INSERT INTO norireco_admins (user_id, note)                  ║
-- ║   VALUES ('<yutsutke の uuid>', 'プロジェクトオーナー');        ║
-- ║                                                                ║
-- ║   uuid は Dashboard → Authentication → Users で確認可能。      ║
-- ║                                                                ║
-- ║   追加後の確認:                                                ║
-- ║   SELECT * FROM norireco_admins;  -- 自分の行が見えれば OK     ║
-- ║   SELECT is_admin();              -- t が返れば OK             ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Applied: 2026-05-29 by yutsutke (8-A: 1 行 / 8-D: false/true/false OK + 初期 admin INSERT 済 + v427 hotfix 後に admin タブで share_banned 行表示 + 4 ボタン動作確認済)
