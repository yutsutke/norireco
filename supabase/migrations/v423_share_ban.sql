-- v423: 垢BAN（シェア停止ペナルティ）本体 — norireco_profiles 新設 + norireco_shares 強化
--
-- 経緯:
--   - シェア機能 MVP は v410〜v418 で完結 (個別 trip OGP 画像 → R2 永続 → /share/<id> ページ)
--   - TODO 🔥「垢BAN」+ 布石 #6: 「シェア機能リリース後に垢BAN を後付けすると trip/share
--     テーブルの flag 設計がスパゲッティになる」と警告されていた本丸。シェアが本番稼働した
--     今こそ入れるのが正解 (後付けほどコスト爆発)
--   - v413 のコメントが既に予告:「将来の垢BAN: share_banned 状態なら Pages Function 側で
--     配信停止 or 本表に revoked 列追加で対応 (S-3 範囲外)」→ v423 でこれを回収
--
-- 思想 (TODO):
--   - 「自分の達成は壊さない、外への発信だけ制限する = やり直しの余地を残す」
--   - 共有・シェアのみ停止。個人記録 (norireco_trips / norireco_character_grants) は通常どおり
--     → **本 migration は trips / character_grants の RLS を一切触らない** (布石 #6 厳守)
--   - 段階: ok → warn (注意・enforcement なし) → share_banned (シェア不可) → full_banned (極端時のみ)
--
-- 設計判断 (yutsutke 確定 2026-05-29):
--   - **真実の源 = norireco_profiles.share_status 一本**。norireco_shares.revoked は
--     「share_status の片方向・非正規化キャッシュ」(配信高速化 + anon に profiles を晒さない両立)。
--     同期は set_account_status 関数 1 か所のみ (profiles → shares の片方向)。二重管理ではなく主従関係
--   - **既存リンクも無効化**: BAN で過去の /share/<id> も配信停止 (revoked=true → 配信側 not-found)。
--     unban で復活。「外への発信を全て止める」趣旨
--   - **profiles の書込は本人にも不可**: SELECT policy のみ作成し INSERT/UPDATE/DELETE policy は
--     作らない → RLS 有効下では authenticated/anon は書込全拒否、service_role (Dashboard) のみ書込。
--     本人が自分の BAN を自己解除できない (これが垢BAN の肝)
--   - **関数の EXECUTE を public から REVOKE**: PostgREST は public スキーマの関数を /rest/v1/rpc/<fn>
--     として自動公開する。剥がさないと authenticated が unban_user_share を叩いて自己解除できてしまう。
--     REVOKE で Dashboard (関数所有者 postgres) からのみ呼べる状態にする
--   - **shares UPDATE policy 強化**: 現状 auth.uid()=user_id だけなので banned ユーザーが
--     PATCH {revoked:false} で自分の全 share を自力復活できる穴があった。WITH CHECK に revoked=false
--     を足して塞ぐ (本人の UPDATE 後の行は revoked=false でなければ拒否 = revoked=true 行は触れない)
--   - SECURITY DEFINER は不要 (Dashboard は service_role 相当で RLS バイパス)
--
-- デプロイ順序 (v421 とは逆。今回は SQL 先):
--   - 配信側 functions/share/[id].js が `&revoked=is.false` を要求する。revoked 列が無い間に
--     このクエリが出ると PostgREST 400 → catch で全 share が not-found 化する事故。
--   - profiles 側はクライアントが catch で 'ok' フォールバックするのでどちらが先でも安全。
--   - → **本 SQL を先に Run → その後 JS + functions + sw.js を push** で確定。
--
-- 実行: Supabase Dashboard → SQL Editor → 全文ペースト → Run
-- 確認: 後段の確認 SELECT で table 1 / profiles policy 1 / shares policy 4 / revoked 列 /
--       関数 3 / anon profiles SELECT = false が見えれば OK
-- 実行後: この migration ファイル末尾に `-- Applied: YYYY-MM-DD by <user>` を追記して commit

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 1. norireco_profiles 新設 (アカウント状態。今は share_status のみ) ║
-- ╚══════════════════════════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS norireco_profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  share_status text NOT NULL DEFAULT 'ok'
               CHECK (share_status IN ('ok', 'warn', 'share_banned', 'full_banned')),
  ban_reason   text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
-- 行が無い user は 'ok' 扱い (アプリ側もそうフォールバックする)。BAN 時に初めて行が作られる。

ALTER TABLE norireco_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT は本人のみ (マイページで自分の状態バッジを出すため)。
DROP POLICY IF EXISTS "プロフィールは本人のみ読込可" ON norireco_profiles;
CREATE POLICY "プロフィールは本人のみ読込可"
  ON norireco_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- ★ INSERT/UPDATE/DELETE policy は意図的に作らない = 本人含め誰も書込不可。
--   service_role (Dashboard / 後述の関数) だけが RLS をバイパスして書ける。

-- 二重防御 (v421 §4 と同形): ロール権限でも anon は全拒否、authenticated は SELECT のみ。
REVOKE ALL ON norireco_profiles FROM anon;
GRANT SELECT ON norireco_profiles TO authenticated;  -- INSERT/UPDATE/DELETE は GRANT しない

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 2. norireco_shares に revoked 列 + INSERT/UPDATE policy 強化   ║
-- ╚══════════════════════════════════════════════════════════════╝
ALTER TABLE norireco_shares ADD COLUMN IF NOT EXISTS revoked boolean NOT NULL DEFAULT false;
-- 既存行は全て false (= 配信継続)。BAN 時に set_account_status が true に一括更新。

-- 部分インデックス: 配信側は revoked=false の行だけ引く (id PK ルックアップに revoked 条件が乗る)。
CREATE INDEX IF NOT EXISTS idx_norireco_shares_active
  ON norireco_shares(id) WHERE revoked = false;

-- INSERT: 本人 かつ BAN 中でない。
--   RLS policy 内のサブクエリはテーブルオーナー権限で評価される (profiles の RLS に阻まれない)
--   ので、authenticated に profiles SELECT 権限が無くてもこのガードは機能する。
--   NOT EXISTS なので「profiles 行が無い新規ユーザー (= ok)」は正しく通る (= 'ok' 等値比較にしない)。
DROP POLICY IF EXISTS "シェアは本人のみ追加可" ON norireco_shares;
DROP POLICY IF EXISTS "シェアは本人のみ追加可（BAN中不可）" ON norireco_shares;
CREATE POLICY "シェアは本人のみ追加可（BAN中不可）"
  ON norireco_shares FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM norireco_profiles p
      WHERE p.user_id = auth.uid()
        AND p.share_status IN ('share_banned', 'full_banned')
    )
  );

-- UPDATE: 本人 かつ 更新後の行で revoked=false (banned ユーザーが revoked を false に戻す穴を塞ぐ)。
--   現状クライアント (14-share-ogp.js) は shares を PATCH していない (INSERT と DELETE のみ) ので
--   この強化で既存挙動は壊れない。BAN による revoked=true 行は本人が UPDATE で復活できなくなる。
DROP POLICY IF EXISTS "シェアは本人のみ更新可" ON norireco_shares;
DROP POLICY IF EXISTS "シェアは本人のみ更新可（revoked不可）" ON norireco_shares;
CREATE POLICY "シェアは本人のみ更新可（revoked不可）"
  ON norireco_shares FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND revoked = false);

-- SELECT (公開) / DELETE (本人) policy は v413 のまま据え置き。

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 3. BAN 発動関数 (Dashboard から SELECT で呼ぶ)                ║
-- ║   真実の源 profiles を upsert + shares.revoked を片方向同期    ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 汎用 1 本。profiles を upsert し、shares.revoked を share_status に合わせて同期する。
--   注意: BAN による revoked (フラグ) と、ユーザーの「🗑 取り消し」(14-share-ogp.js revokeShare =
--   物理 DELETE) は別操作。現状 revokeShare は行を消すので unban で「取り消し済み share が復活する」
--   衝突は起きない。将来 revokeShare をソフト削除 (revoked フラグ) に変えるとここが衝突するので注意。
CREATE OR REPLACE FUNCTION set_account_status(target_uid uuid, new_status text, reason text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF new_status NOT IN ('ok', 'warn', 'share_banned', 'full_banned') THEN
    RAISE EXCEPTION 'invalid share_status: %', new_status;
  END IF;
  -- 真実の源 = profiles
  INSERT INTO norireco_profiles (user_id, share_status, ban_reason, updated_at)
  VALUES (target_uid, new_status, reason, now())
  ON CONFLICT (user_id) DO UPDATE
    SET share_status = EXCLUDED.share_status,
        ban_reason   = EXCLUDED.ban_reason,
        updated_at   = now();
  -- 派生キャッシュ = shares.revoked (片方向同期)
  IF new_status IN ('share_banned', 'full_banned') THEN
    UPDATE norireco_shares SET revoked = true  WHERE user_id = target_uid AND revoked = false;
  ELSE  -- 'ok' / 'warn' は配信可
    UPDATE norireco_shares SET revoked = false WHERE user_id = target_uid AND revoked = true;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 薄いラッパー (Dashboard からの呼びやすさ)。
CREATE OR REPLACE FUNCTION ban_user_share(target_uid uuid, reason text DEFAULT NULL)
RETURNS void AS $$ BEGIN PERFORM set_account_status(target_uid, 'share_banned', reason); END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION unban_user_share(target_uid uuid)
RETURNS void AS $$ BEGIN PERFORM set_account_status(target_uid, 'ok', NULL); END; $$ LANGUAGE plpgsql;

-- ★ EXECUTE を public から剥がす (PostgREST RPC 公開を塞ぐ = Dashboard 専用にする)。
--   public を REVOKE すると配下の anon / authenticated も剥がれる。所有者 (postgres) は影響なし。
REVOKE EXECUTE ON FUNCTION set_account_status(uuid, text, text) FROM public;
REVOKE EXECUTE ON FUNCTION ban_user_share(uuid, text)           FROM public;
REVOKE EXECUTE ON FUNCTION unban_user_share(uuid)               FROM public;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 4. PostgREST にスキーマ変更を反映                              ║
-- ╚══════════════════════════════════════════════════════════════╝
NOTIFY pgrst, 'reload schema';

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 5. 確認                                                        ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 5-A. テーブル作成
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'norireco_profiles';
-- 期待: 1 行 (norireco_profiles)

-- 5-B. profiles policy は SELECT 1 件のみ (書込 policy が無いこと)
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'norireco_profiles'
ORDER BY policyname;
-- 期待: 1 行 (SELECT のみ)

-- 5-C. shares policy 4 件 (SELECT 公開 / INSERT BAN中不可 / UPDATE revoked不可 / DELETE 本人)
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'norireco_shares'
ORDER BY cmd, policyname;
-- 期待: 4 行 (SELECT / INSERT / UPDATE / DELETE)

-- 5-D. revoked 列が追加されているか
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'norireco_shares' AND column_name = 'revoked';
-- 期待: 1 行 (boolean / NO / false)

-- 5-E. 関数 3 本
SELECT proname FROM pg_proc
WHERE proname IN ('set_account_status', 'ban_user_share', 'unban_user_share')
ORDER BY proname;
-- 期待: 3 行

-- 5-F. anon は profiles を読めない (二重防御の確認)
SELECT has_table_privilege('anon', 'norireco_profiles', 'SELECT') AS anon_can_select_profiles;
-- 期待: false

-- 5-G. authenticated は profiles を書けない (SELECT のみ)
SELECT
  has_table_privilege('authenticated', 'norireco_profiles', 'SELECT') AS auth_select,
  has_table_privilege('authenticated', 'norireco_profiles', 'INSERT') AS auth_insert,
  has_table_privilege('authenticated', 'norireco_profiles', 'UPDATE') AS auth_update;
-- 期待: true / false / false

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 6. 運用 (発動・確認の例。コメントとして残す)                  ║
-- ║   BAN     : SELECT ban_user_share('<uuid>', '理由テキスト');  ║
-- ║   解除    : SELECT unban_user_share('<uuid>');                ║
-- ║   警告    : SELECT set_account_status('<uuid>', 'warn', '理由'); ║
-- ║   状態確認: SELECT * FROM norireco_profiles WHERE user_id = '<uuid>'; ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Applied: 2026-05-29 by yutsutke (確認 1/1/4/1/3/false OK)
