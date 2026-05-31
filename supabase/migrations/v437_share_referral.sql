-- v437: シェア経由の登録転換 attribution (Phase 2)
--
-- 経緯:
--   - v436 で /share の view / CTA click を計測 (③受け側強化 + ④計測の漏斗前半)。
--   - その CTA は `/share/<id>/go` 経由で `norireco.app/?ref=s_<id>` に飛ばし、?ref を仕込んでいた。
--   - 本 migration はその「本命指標」= **シェア経由で新規登録したユーザー数** を記録する
--     (5大原則④「シェアが分水嶺」を data で確かめる)。
--
-- 設計 (v436 の view/click と同じ主従構造を踏襲):
--   - **真実の源 = norireco_share_referrals** (user_id PK = 1 ユーザー 1 回だけ attribution)。
--   - **派生キャッシュ = norireco_shares.signup_count** (マイページ表示・集計の高速化)。
--   - クライアント (js/12-auth.js) は ?ref を localStorage に退避し、初回ログイン確定時かつ
--     「新規アカウント (created_at 直近)」のときだけ RPC record_share_referral を叩く。
--     既存ユーザーがシェアを踏んだだけのケースは attribution しない (クライアントの created_at ゲート)。
--   - once-per-user の最終保証は本表 PK。RPC は ON CONFLICT DO NOTHING で冪等、
--     実際に INSERT できたときだけ signup_count を +1 する。
--
-- セキュリティ:
--   - RPC は SECURITY DEFINER。norireco_profiles と同様、本表は RLS 有効 + policy 無しで
--     authenticated/anon からは直接読み書き不可。RPC だけが触れる。
--   - 自己シェア (share の所有者 = 登録者本人) と revoked share は RPC 内で除外。
--   - EXECUTE は authenticated のみ (attribution は本人の uid が要る = ログイン必須)。anon には出さない。
--
-- 実行: Supabase Dashboard → SQL Editor → 全文ペースト → Run
-- 確認: 後段の SELECT で table 1 / column 1 / function 1 / grant (authenticated) が見えれば OK
-- 実行後: この migration ファイル末尾に `-- Applied: YYYY-MM-DD by <user>` を追記して commit

-- ── 1. attribution テーブル (真実の源・1 ユーザー 1 行)
CREATE TABLE IF NOT EXISTS norireco_share_referrals (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  share_id   text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_norireco_share_referrals_share
  ON norireco_share_referrals(share_id);

-- RLS: policy 無し = authenticated/anon は直接不可。SECURITY DEFINER RPC だけが触れる。
ALTER TABLE norireco_share_referrals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON norireco_share_referrals FROM anon, authenticated;

-- ── 2. signup_count 派生キャッシュ列 (view_count/click_count と同列)
ALTER TABLE norireco_shares ADD COLUMN IF NOT EXISTS signup_count integer NOT NULL DEFAULT 0;

-- ── 3. attribution RPC (SECURITY DEFINER)
--   呼び元 = ログイン済みクライアント (Authorization: Bearer <access_token> → auth.uid() が本人)。
--   once-per-user は PK で保証。実 INSERT できたときだけ signup_count を +1。
CREATE OR REPLACE FUNCTION public.record_share_referral(p_share_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_owner uuid;
  v_count integer;
BEGIN
  IF v_uid IS NULL OR p_share_id IS NULL THEN RETURN; END IF;
  -- 対象 share が存在し revoked でないこと + 自己シェアでないこと (self-referral 除外)
  SELECT user_id INTO v_owner
    FROM norireco_shares
   WHERE id = p_share_id AND revoked = false;
  IF v_owner IS NULL OR v_owner = v_uid THEN RETURN; END IF;
  -- once-per-user: 既に記録済みなら何もしない
  INSERT INTO norireco_share_referrals (user_id, share_id)
    VALUES (v_uid, p_share_id)
    ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    UPDATE norireco_shares SET signup_count = signup_count + 1 WHERE id = p_share_id;
  END IF;
END;
$$;

-- ── 4. EXECUTE 権限: authenticated のみ (anon には出さない)
REVOKE ALL ON FUNCTION public.record_share_referral(text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_share_referral(text) TO authenticated;

-- ── 5. PostgREST にスキーマ変更を反映
NOTIFY pgrst, 'reload schema';

-- ── 6. 確認
-- 6-A. テーブル (期待: 1 行)
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name='norireco_share_referrals';

-- 6-B. signup_count 列 (期待: 1 行 = signup_count / integer / 0)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='norireco_shares' AND column_name='signup_count';

-- 6-C. 関数 (期待: 1 行 = record_share_referral / prosecdef=true)
SELECT proname, prosecdef
FROM pg_proc
WHERE proname='record_share_referral' AND pronamespace='public'::regnamespace;

-- 6-D. EXECUTE が authenticated に付いているか (期待: 1 行 = authenticated / EXECUTE)
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema='public' AND routine_name='record_share_referral'
  AND grantee='authenticated';

-- 期待値:
--   table    1 行: norireco_share_referrals
--   column   1 行: signup_count (integer, 0)
--   function 1 行: record_share_referral (prosecdef = true)
--   grant    1 行: authenticated / EXECUTE
