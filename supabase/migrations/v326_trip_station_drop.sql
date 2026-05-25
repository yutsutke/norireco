-- v326: 駅 ID 体系 Phase 3 — norireco_trips.from_station / to_station 列を廃止
--
-- 前提条件:
--   1. v310 で from_station_id / to_station_id 列を追加 + 並行書き込み開始
--   2. v311 で既存 125 件を backfill 完遂 (失敗 0)
--   3. v326 デプロイ後、frontend が並行書き込みを停止 (id-only writes)
--   4. 全 trip が from_station_id / to_station_id NOT NULL になっていることを確認
--
-- 実行手順:
--   1. Supabase Dashboard → SQL Editor で本ファイルを Run する前に、
--      下記 SELECT で残り NULL が 0 件か確認すること:
--        SELECT COUNT(*) FROM norireco_trips
--         WHERE from_station_id IS NULL OR to_station_id IS NULL;
--   2. 0 件なら DROP COLUMN を実行
--   3. NOTIFY で PostgREST スキーマキャッシュを更新
--
-- 影響:
--   - 旧 frontend (v325 以前) は from_station / to_station 列を含む INSERT で 400 エラー
--     → CACHE_VERSION v326 deploy 直後に実行することで影響範囲を最小化
--   - 表示用駅名は MERGED_STATIONS から逆引き (v326 JS の getTripStationName)
--
-- backfill ヘルパー (frontend コンソール) — 万一 NULL が残っていれば実行:
--   await window.norirecoBackfillTripStationIds()

ALTER TABLE norireco_trips
  DROP COLUMN IF EXISTS from_station,
  DROP COLUMN IF EXISTS to_station;

NOTIFY pgrst, 'reload schema';
