-- v310: 駅 ID 体系 Phase 2-a — 旅程 (norireco_trips) に駅 id 列を追加
--
-- Phase 1 (v290〜v306) で merged_stations / SERVICE_LINES に `s_NNNNN` id を持たせ、
-- 集計・描画 (slRiddenSt 等) は id ベース化したが、trip データ本体はまだ名前文字列ベース。
-- Phase 2 で trip も id ベースに移行する。本ファイルはその第一段階 (2-a) として
-- 新規列の追加のみ行う。並行書き込み (name と id を同時に保存) は frontend v310 で開始。
--
-- 後続予定:
--   - 2-b: 既存 trip のバックフィル (別 SQL or 一度限りのスクリプト)
--   - 2-c: 読み込みコード (tripMatchesAnyStation 等) を id 優先 + name fallback に
--   - Phase 3 / 列廃止: name 列の最終的な撤去
--
-- 実行: Supabase Dashboard → SQL Editor で本ファイルの内容を貼り付け Run
-- 既存 trip の id 列は NULL でスタート (NOT NULL 制約なし、バックフィルまで猶予)
--
-- segments (JSONB) には schema の変更不要 — 各要素に from_id / to_id を JSON 側で追加。
-- 既存 segments は from_id / to_id を持たないので、読み込み側で IS NULL なら name 経由で
-- resolve する fallback を v310 以降のコードで持つ予定 (2-c 段階)。

ALTER TABLE norireco_trips
  ADD COLUMN IF NOT EXISTS from_station_id TEXT,
  ADD COLUMN IF NOT EXISTS to_station_id TEXT;

-- 部分インデックス: NULL を含む trip は除外して id 検索を高速化
-- (Phase 2-b バックフィル後にすべての trip が id を持つようになったら、部分述語は外して通常 index に)
CREATE INDEX IF NOT EXISTS norireco_trips_from_station_id_idx
  ON norireco_trips (from_station_id) WHERE from_station_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS norireco_trips_to_station_id_idx
  ON norireco_trips (to_station_id) WHERE to_station_id IS NOT NULL;

-- PostgREST のスキーマキャッシュを更新 (新しい列がすぐに API で見えるように)
NOTIFY pgrst, 'reload schema';
