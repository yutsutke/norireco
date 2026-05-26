-- v360: norireco_memos.car_model 列を追加
--
-- 経緯:
--   v354 で旅程カードに車両形式表示、v357 で旅程タブに車両形式検索、v358 で路線タブにも
--   車両形式集計が入った流れで、ユスケから「メモにも車両形式を選択 + 検索 + 一覧表示を
--   付けてほしい」との要望 (2026-05-27)。
--
-- 変更点:
--   norireco_memos に car_model text を追加 (nullable)。
--   既存メモは NULL のまま、新規メモから値が入る。
--
-- 実行: Supabase Dashboard → SQL Editor → 全文ペースト → Run
-- 確認: 後段の SELECT で car_model が出れば OK
--
-- 注意: ALTER TABLE は IF NOT EXISTS を付けて冪等に。複数回 Run しても安全。

ALTER TABLE norireco_memos
  ADD COLUMN IF NOT EXISTS car_model text;

-- PostgREST にスキーマ変更を反映
NOTIFY pgrst, 'reload schema';

-- 確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='norireco_memos'
  AND column_name='car_model';

-- 期待値: car_model | text | YES

-- Applied: 2026-05-27 by yutsutke
