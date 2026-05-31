-- v436: シェア計測 (受け側 /share の view / CTA click カウント)
--
-- 経緯:
--   - シェア機能 MVP (S-1〜S-3, v410〜v413) + 磨き込み (v415〜v417) + 取り消し UI (v416)
--     + 垢BAN 連携 (v423) で「作って配信して止める」までは完結。
--   - 「シェアが分水嶺」(5大原則④) を data で確かめる土台が無かった (計測ゼロ)。
--     拡散バリューチェーンの ③受け側ページ強化 + ④計測 を回収する (ユスケ確定 2026-05-31)。
--
-- スコープ (今回):
--   - /share/<id> の「ページ表示数 (view)」と「CTA クリック数 (click)」の 2 指標。
--   - 登録転換 (シェア経由→新規登録の attribution) は Phase 2 (app の auth flow 改修が要る)。
--     今回は CTA リンクに ?ref=s_<id> を仕込むだけで土台を作る。
--
-- 設計の肝:
--   - 受け側は Cloudflare Pages Function (functions/share/[id].js, /go.js) で、Supabase へは
--     **anon key** でアクセスする。norireco_shares の UPDATE は本人限定 RLS (v413) なので
--     Function から view_count を直接 UPDATE できない。
--     → SECURITY DEFINER 関数 bump_share_metric() を 1 本だけ作り EXECUTE を anon に許可する。
--       関数は「指定 id の view_count か click_count を +1 する」だけ。auth バイパスは無い。
--   - revoked=true (垢BAN で失効) の share はカウントしない (配信側も not-found なので view は
--     そもそも飛ばないが、/go の click は revoked ガードで弾く)。
--   - anon が RPC を直接叩いて水増しする余地はあるが、早期βの内部指標なので許容
--     (将来 rate-limit や bot 除外を強化する余地あり。bot 除外は Function 側 UA フィルタで一次対応)。
--
-- 実行: Supabase Dashboard → SQL Editor → 全文ペースト → Run
-- 確認: 後段の SELECT で column 2 / function 1 / grant (anon に EXECUTE) が見えれば OK
-- 実行後: この migration ファイル末尾に `-- Applied: YYYY-MM-DD by <user>` を追記して commit

-- ── 1. カウンタ列 (冪等)
ALTER TABLE norireco_shares ADD COLUMN IF NOT EXISTS view_count  integer NOT NULL DEFAULT 0;
ALTER TABLE norireco_shares ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;

-- ── 2. 計測 RPC (SECURITY DEFINER)
--   p_kind = 'view' | 'click'。それ以外は何もしない (no-op)。
--   SECURITY DEFINER + 固定 search_path で RLS を跨いで該当 1 行だけ +1。
CREATE OR REPLACE FUNCTION public.bump_share_metric(p_id text, p_kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_kind = 'view' THEN
    UPDATE public.norireco_shares
       SET view_count = view_count + 1
     WHERE id = p_id AND revoked = false;
  ELSIF p_kind = 'click' THEN
    UPDATE public.norireco_shares
       SET click_count = click_count + 1
     WHERE id = p_id AND revoked = false;
  END IF;
END;
$$;

-- ── 3. EXECUTE 権限: anon / authenticated に許可 (Pages Function は anon key で叩く)
--   一旦 public から剥がしてから明示付与 (意図しない広域公開を避ける)。
REVOKE ALL ON FUNCTION public.bump_share_metric(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.bump_share_metric(text, text) TO anon, authenticated;

-- ── 4. PostgREST にスキーマ変更を反映
NOTIFY pgrst, 'reload schema';

-- ── 5. 確認
-- 5-A. カウンタ列が 2 本追加されているか (期待: 2 行 = view_count / click_count)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'norireco_shares'
  AND column_name IN ('view_count', 'click_count')
ORDER BY column_name;

-- 5-B. 関数が存在するか (期待: 1 行)
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'bump_share_metric' AND pronamespace = 'public'::regnamespace;

-- 5-C. anon に EXECUTE が付いているか (期待: 1 行 = anon に EXECUTE)
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = 'bump_share_metric'
  AND grantee = 'anon';

-- 期待値:
--   column   2 行: view_count (integer, 0) / click_count (integer, 0)
--   function 1 行: bump_share_metric (prosecdef = true)
--   grant    1 行: anon / EXECUTE
