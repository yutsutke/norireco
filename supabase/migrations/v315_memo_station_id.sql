-- v315: 駅 ID 体系 Phase 3-d — メモ (norireco_memos) に駅 id 列を追加
--
-- Phase 2 (v310〜v312) で trip データを id ベース化し、Phase 3-a/3-b (v313) で
-- キャラデータも id 化、Phase 3-c (v314) で GPS 後追い認証も id 対応にした。
-- 残るデータは「メモ」。本ファイルで norireco_memos に station_id 列を追加。
--
-- ユスケ判断: 既存メモは 3 件しかないので一括バックフィルは不要、新規メモから
-- station_id を埋めていく。読み込みは id 優先 + 駅名 (station 列) fallback で動く。
--
-- 実行: Supabase Dashboard → SQL Editor で本ファイルの内容を貼り付け Run
-- 既存 3 件の station_id は NULL でスタート。手動で埋めても良いし、
-- frontend の station 列 fallback でそのまま動く。

ALTER TABLE norireco_memos
  ADD COLUMN IF NOT EXISTS station_id TEXT;

-- 部分インデックス: NULL を除外して id 検索を高速化
CREATE INDEX IF NOT EXISTS idx_norireco_memos_user_station_id
  ON norireco_memos (user_id, station_id) WHERE station_id IS NOT NULL;

-- PostgREST のスキーマキャッシュを更新
NOTIFY pgrst, 'reload schema';
