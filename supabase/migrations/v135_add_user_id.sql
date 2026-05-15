-- v135: ログイン機能の準備
-- 3 テーブルに user_id (UUID, nullable) を追加。
-- 既存レコードは user_id=NULL。初回ログイン時にクライアント側で
-- 自分の uid に backfill する (PATCH where user_id IS NULL)。
--
-- 実行: Supabase Dashboard → SQL Editor → 全文ペースト → Run
-- 確認: 後段の SELECT で 3 テーブルすべて user_id 列が見えれば OK

-- ── 1. trip
ALTER TABLE norireco_trips
  ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE INDEX IF NOT EXISTS idx_norireco_trips_user_id
  ON norireco_trips(user_id);

-- ── 2. キャラ獲得履歴
ALTER TABLE norireco_character_grants
  ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE INDEX IF NOT EXISTS idx_norireco_character_grants_user_id
  ON norireco_character_grants(user_id);

-- ── 3. メモ
ALTER TABLE norireco_memos
  ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE INDEX IF NOT EXISTS idx_norireco_memos_user_id
  ON norireco_memos(user_id);

-- ── 確認
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('norireco_trips', 'norireco_character_grants', 'norireco_memos')
  AND column_name='user_id'
ORDER BY table_name;

-- 期待値: 3 行 (各テーブルに user_id uuid YES)
