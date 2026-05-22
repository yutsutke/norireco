-- v258: 旅程 (norireco_trips) に photos jsonb 列を追加
-- 駅メモ (norireco_memos) の v250 と同じ形式: [{url, w, h, bytes, content_type}, ...]
-- R2/Workers 経由のアップロードで使う (布石 #2 旅程写真添付の use case)
--
-- 実行: Supabase Dashboard → SQL Editor で本ファイルの内容を貼り付け Run
-- 既存 trip 約 150 件は photos=[] で migrate される (NOT NULL 制約はかけない、空配列がデフォルト)

ALTER TABLE norireco_trips
  ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;

-- PostgREST のスキーマキャッシュを更新 (新しい列がすぐに API で見えるように)
NOTIFY pgrst, 'reload schema';
