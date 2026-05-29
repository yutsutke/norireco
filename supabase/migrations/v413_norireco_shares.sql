-- v413: シェア機能 S-3 — シェアレコード (norireco_shares) テーブル
--
-- 経緯:
--   - シェア機能 S-1 (v410/v411): 個別 trip / 累計プロフィールの OGP 画像を Canvas 生成
--   - S-2 (v412): その画像を R2 に保存して恒久 CDN URL を得る (Worker /upload/share-image)
--   - S-3 (v413): /share/<id> の受け側ページを作る。SNS クローラは JS 非実行なので
--     OGP メタの og:image に「実在の静的画像 URL」(= S-2 の R2 URL) を埋めた HTML を
--     Cloudflare Pages Function が SSR する。その HTML が必要とする
--     「id → タイトル/説明/画像URL」を引くための公開読み取りテーブルが本表。
--
-- 設計:
--   - id は frontend ではなく Worker (/upload/share-image) が採番した R2 share_id を流用
--     (画像 object と share レコードを 1 つの id で結ぶ。norireco_trips/memos と同じ text PK 慣習)
--   - **SELECT は公開** (using true): /share ページは未ログイン訪問者にも見せる必要があるため。
--     格納する値 (title/description/image_url) はいずれも公開前提のものだけ。user_id は晒さない運用。
--   - INSERT/UPDATE/DELETE は本人のみ (auth.uid() = user_id)。作成は access_token 必須。
--   - 将来の垢BAN: share_banned 状態なら Pages Function 側で配信停止 or 本表に revoked 列追加で対応 (S-3 範囲外)
--
-- 実行: Supabase Dashboard → SQL Editor → 全文ペースト → Run
-- 確認: 後段の SELECT で table 1 / policy 4 / index 2 が見えれば OK
-- 実行後: この migration ファイル末尾に `-- Applied: YYYY-MM-DD by <user>` を追記して commit

-- ── 1. テーブル作成
CREATE TABLE IF NOT EXISTS norireco_shares (
  id          text        PRIMARY KEY,                                   -- = R2 share_id
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  kind        text        NOT NULL DEFAULT 'trip',   -- 'trip' | 'profile'
  title       text        NOT NULL DEFAULT '',       -- OGP og:title 用
  description text        NOT NULL DEFAULT '',       -- OGP og:description 用
  image_url   text        NOT NULL DEFAULT '',       -- cdn.norireco.app の R2 画像 URL
  payload     jsonb       NOT NULL DEFAULT '{}'::jsonb -- 予備 (将来: trip スナップショット等)
);

CREATE INDEX IF NOT EXISTS idx_norireco_shares_user_created
  ON norireco_shares(user_id, created_at DESC);

-- ── 2. RLS
ALTER TABLE norireco_shares ENABLE ROW LEVEL SECURITY;

-- SELECT は公開 (anon/authenticated とも id で誰でも読める = シェアの性質)
DROP POLICY IF EXISTS "シェアは誰でも読込可" ON norireco_shares;
CREATE POLICY "シェアは誰でも読込可"
  ON norireco_shares FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "シェアは本人のみ追加可" ON norireco_shares;
CREATE POLICY "シェアは本人のみ追加可"
  ON norireco_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "シェアは本人のみ更新可" ON norireco_shares;
CREATE POLICY "シェアは本人のみ更新可"
  ON norireco_shares FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "シェアは本人のみ削除可" ON norireco_shares;
CREATE POLICY "シェアは本人のみ削除可"
  ON norireco_shares FOR DELETE
  USING (auth.uid() = user_id);

-- ── 3. ロールへの権限付与 (anon の公開 SELECT を確実に効かせる)
GRANT SELECT ON norireco_shares TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON norireco_shares TO authenticated;

-- ── 4. PostgREST にスキーマ変更を反映
NOTIFY pgrst, 'reload schema';

-- ── 5. 確認
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name='norireco_shares';

SELECT policyname, cmd FROM pg_policies
WHERE schemaname='public' AND tablename='norireco_shares'
ORDER BY policyname;

SELECT indexname FROM pg_indexes
WHERE schemaname='public' AND tablename='norireco_shares'
ORDER BY indexname;

-- 期待値:
--   table  1 行: norireco_shares
--   policy 4 行: SELECT (公開) / INSERT / UPDATE / DELETE
--   index  2 行: PK + user_created

-- Applied: 2026-05-29 by yutsutke
