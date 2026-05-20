-- v247: 系統色のユーザーカスタマイズをデバイス間で同期する専用テーブル
--
-- ユーザーごと・系統 (営業系統) ごとに 1 行。色は #RRGGBB の HEX 文字列。
-- PK = (user_id, line_id) で同一系統の重複防止 + upsert (POST + Prefer: resolution=merge-duplicates) を効率化。
-- RLS 必須: 他人の色設定を読み書きできないように。
--
-- 実行: Supabase Dashboard → SQL Editor → 全文ペースト → Run
-- 確認: 後段の SELECT で table と RLS policy 4 件が見えれば OK

-- ── 1. テーブル作成
CREATE TABLE IF NOT EXISTS norireco_line_color_overrides (
  user_id    uuid       NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  line_id    text       NOT NULL,
  color      text       NOT NULL,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, line_id)
);

CREATE INDEX IF NOT EXISTS idx_norireco_line_color_overrides_user_id
  ON norireco_line_color_overrides(user_id);

-- ── 2. RLS (本人のみ読み書き可)
ALTER TABLE norireco_line_color_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "色 override は本人のみ読込可" ON norireco_line_color_overrides;
CREATE POLICY "色 override は本人のみ読込可"
  ON norireco_line_color_overrides FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "色 override は本人のみ追加可" ON norireco_line_color_overrides;
CREATE POLICY "色 override は本人のみ追加可"
  ON norireco_line_color_overrides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "色 override は本人のみ更新可" ON norireco_line_color_overrides;
CREATE POLICY "色 override は本人のみ更新可"
  ON norireco_line_color_overrides FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "色 override は本人のみ削除可" ON norireco_line_color_overrides;
CREATE POLICY "色 override は本人のみ削除可"
  ON norireco_line_color_overrides FOR DELETE
  USING (auth.uid() = user_id);

-- ── 3. 確認
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name='norireco_line_color_overrides';

SELECT policyname, cmd FROM pg_policies
WHERE schemaname='public' AND tablename='norireco_line_color_overrides'
ORDER BY policyname;

-- 期待値:
--   table 1 行: norireco_line_color_overrides
--   policies 4 行: SELECT / INSERT / UPDATE / DELETE 各 1 件
