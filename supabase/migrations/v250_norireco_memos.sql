-- v250: 駅メモ機能の本格化に伴うスキーマ刷新
--
-- 経緯:
--   - v90 頃に「📋 データを生成 → Claudeに貼り付け」運用で導入された駅メモは
--     地図画面 memo-modal が Supabase 連携されておらず、Notion 手貼り想定だった。
--   - noritetsu-log.html 側にだけ POST 実装があったが、user_id なしで anon key を
--     Bearer に流用しており実質匿名書き込み (RLS なし)。読み出し UI も存在せず。
--   - v250 で地図画面 memo-modal を本格 Supabase CRUD + マイページ「📸 メモ」タブ
--     一覧に作り直す。既存メモは捨てる方針 (ユスケさん 2026-05-22 合意) のため
--     旧スキーマを DROP して新スキーマで作り直す。
--
-- 変更点:
--   - user_id NOT NULL + RLS (auth.uid() = user_id) を必須化
--   - tags を text の '、' join から jsonb 配列に変更
--   - photos jsonb NOT NULL DEFAULT '[]' を新設 (v251 以降の R2 連携で
--     {key, w, h, mime, created_at} の配列を格納する箱を先に確保)
--   - id は frontend 生成の text 'memo_<ts>_<rand>' (norireco_trips と同じ慣習)
--
-- 実行: Supabase Dashboard → SQL Editor → 全文ペースト → Run
-- 確認: 後段の SELECT で table と RLS policy 4 件、index 3 件が見えれば OK

-- ── 1. 旧テーブル DROP
DROP TABLE IF EXISTS norireco_memos;

-- ── 2. 新テーブル作成
CREATE TABLE norireco_memos (
  id          text        PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- 場所
  line_id     text,
  line_name   text,
  station     text,
  lat         double precision,
  lon         double precision,
  -- 区分
  memo_type   text        NOT NULL DEFAULT '駅',    -- 駅 / 車内 / 路線 / その他
  mood        text        NOT NULL DEFAULT '良い',  -- 最高 / 良い / 普通 / 微妙 / 最悪
  tags        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  -- 内容
  comment     text        NOT NULL DEFAULT '',
  photos      jsonb       NOT NULL DEFAULT '[]'::jsonb -- v251+: [{key, w, h, mime, created_at}]
);

CREATE INDEX idx_norireco_memos_user_created
  ON norireco_memos(user_id, created_at DESC);
CREATE INDEX idx_norireco_memos_user_line
  ON norireco_memos(user_id, line_id);
CREATE INDEX idx_norireco_memos_user_station
  ON norireco_memos(user_id, station);

-- ── 3. RLS (本人のみ読み書き可)
ALTER TABLE norireco_memos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "メモは本人のみ読込可" ON norireco_memos;
CREATE POLICY "メモは本人のみ読込可"
  ON norireco_memos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "メモは本人のみ追加可" ON norireco_memos;
CREATE POLICY "メモは本人のみ追加可"
  ON norireco_memos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "メモは本人のみ更新可" ON norireco_memos;
CREATE POLICY "メモは本人のみ更新可"
  ON norireco_memos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "メモは本人のみ削除可" ON norireco_memos;
CREATE POLICY "メモは本人のみ削除可"
  ON norireco_memos FOR DELETE
  USING (auth.uid() = user_id);

-- ── 4. updated_at の自動更新トリガー
CREATE OR REPLACE FUNCTION norireco_memos_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_norireco_memos_touch ON norireco_memos;
CREATE TRIGGER trg_norireco_memos_touch
  BEFORE UPDATE ON norireco_memos
  FOR EACH ROW EXECUTE FUNCTION norireco_memos_touch_updated_at();

-- ── 5. PostgREST にスキーマ変更を反映
NOTIFY pgrst, 'reload schema';

-- ── 6. 確認
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name='norireco_memos';

SELECT policyname, cmd FROM pg_policies
WHERE schemaname='public' AND tablename='norireco_memos'
ORDER BY policyname;

SELECT indexname FROM pg_indexes
WHERE schemaname='public' AND tablename='norireco_memos'
ORDER BY indexname;

-- 期待値:
--   table  1 行: norireco_memos
--   policy 4 行: SELECT / INSERT / UPDATE / DELETE 各 1 件
--   index  4 行: PK + user_created / user_line / user_station
