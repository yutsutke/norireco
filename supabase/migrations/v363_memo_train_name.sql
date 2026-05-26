-- v363: norireco_memos.train_name 列を追加
--
-- 経緯:
--   v360 で car_model だけ追加した直後、ユスケから「列車名がでてこない」との指摘。
--   旅程カードと同じく「🚆 あずさ [E353系]」の形でメモ一覧でも列車名を表示したい。
--   v361/v362 で記録モーダルと同じカスケード UI (カテゴリ → 列車 → 車両) は既に
--   入っているので、列車選択時に train.name を shadow セットして保存する形に拡張。
--
-- 変更点:
--   norireco_memos に train_name text を追加 (nullable)。
--   既存メモは NULL のまま、新規メモから値が入る。train_id 列は持たない (UI 補助のみ、
--   保存対象は train_name 文字列だけ。これは旅程と違う設計判断)。
--
-- 実行: Supabase Dashboard → SQL Editor → 全文ペースト → Run
-- 確認: 後段の SELECT で train_name が出れば OK

ALTER TABLE norireco_memos
  ADD COLUMN IF NOT EXISTS train_name text;

NOTIFY pgrst, 'reload schema';

-- 確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='norireco_memos'
  AND column_name IN ('train_name', 'car_model')
ORDER BY column_name;

-- 期待値:
--   car_model  | text | YES
--   train_name | text | YES

-- Applied: 2026-05-27 by yutsutke
