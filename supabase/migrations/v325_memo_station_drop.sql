-- v325: 駅 ID 体系 Phase 3 — norireco_memos.station 列を廃止
--
-- 前提条件:
--   1. v315 で station_id 列を追加 + 並行書き込み開始
--   2. v325 デプロイ後、frontend が `window.norirecoBackfillMemoStationIds()` を実行
--      して既存の station_id IS NULL レコードに id を埋めた
--   3. 全 memo が station_id NOT NULL になっていることを確認
--
-- 実行手順:
--   1. Supabase Dashboard → SQL Editor で本ファイルを Run する前に、
--      下記 SELECT で残り NULL が 0 件か確認すること:
--        SELECT COUNT(*) FROM norireco_memos WHERE station_id IS NULL;
--   2. 0 件なら DROP COLUMN station を実行
--   3. NOTIFY で PostgREST スキーマキャッシュを更新
--
-- 影響:
--   - 旧 frontend (v324 以前) は station 列に書き込もうとして 400 エラーになる
--     → CACHE_VERSION v325 deploy 直後に実行することで影響範囲を最小化
--   - id 解決済みなので display 用駅名は MERGED_STATIONS から逆引き (v325 JS で対応済)

ALTER TABLE norireco_memos
  DROP COLUMN IF EXISTS station;

NOTIFY pgrst, 'reload schema';
