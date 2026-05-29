-- v424: full_banned 時の個人記録新規作成停止 enforcement
--
-- 経緯:
--   - v423 で垢BAN 本体 (norireco_profiles + share_status) を入れた。share_banned は
--     既にシェア INSERT に NOT EXISTS(share_banned/full_banned) ガードが入っており enforcement 済。
--   - v423 残課題: full_banned は「極端時のみ」の段階で、share_banned との差別化として
--     「個人記録 (trip / character_grant / memo) の新規作成も停止」が想定されていた。
--     現状は full_banned == share_banned の挙動 (share だけ止まる) で、段階が空転している。
--   - v423 CHANGELOG §273 残課題:
--     「full_banned の個人記録新規作成停止 enforcement (v421 trip policy に
--      AND NOT EXISTS(full_banned) を足す形・ただし SELECT/閲覧は最後まで残す方針)」
--
-- スコープ (yutsutke 確定 2026-05-29):
--   - trip / character_grant / memo の **INSERT policy のみ** に full_banned ガード追加
--   - **UPDATE/DELETE/SELECT は触らない** = 過去の trip 閲覧・編集・削除は通常通り
--   - 「自分の達成は壊さない、外への発信だけ制限する = やり直しの余地を残す」の最も
--     忠実な実装。full_banned でも「過去の自分の記録を見る/直す」はできる
--   - share_banned 時の share INSERT 拒否と同じ二重防御パターン (RLS + クライアントガード)
--
-- 設計判断:
--   - v423 の shares INSERT policy と完全同形:
--       AND NOT EXISTS (SELECT 1 FROM norireco_profiles WHERE user_id=auth.uid()
--                       AND share_status IN ('full_banned'))
--     ※ v423 shares INSERT は ('share_banned','full_banned') 両方ブロックだったが、
--        本 migration の対象 (trip/grant/memo) は full_banned のみブロック。share_banned
--        段階では個人記録は通常通り作れる
--   - profiles 行が無い = ok 扱いなので、NOT EXISTS で新規ユーザーは通る (= IN 等値比較にしない)
--   - DROP POLICY → CREATE POLICY は v421 と同じ冪等パターン (再 Run 安全)
--   - SECURITY DEFINER 不要 (RLS policy のサブクエリはテーブルオーナー権限で評価される)
--
-- デプロイ順序:
--   - SQL Run が先でも JS push が先でも安全。RLS が最後の砦・クライアントは UX 改善のみで
--     full_banned 該当者が居なければそもそも誰も拒否されない (現状 0 人)。
--   - SQL → JS の順を推奨 (v423 と揃える)。
--
-- 実行: Supabase Dashboard → SQL Editor → 全文ペースト → Run
-- 確認: 後段の確認 SELECT で policy 3 件 (trip/grant/memo の INSERT) に full_banned 文字列が
--       含まれることを確認
-- 実行後: この migration ファイル末尾に `-- Applied: YYYY-MM-DD by <user>` を追記して commit

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 1. norireco_trips INSERT policy に full_banned ガード追加     ║
-- ╚══════════════════════════════════════════════════════════════╝
DROP POLICY IF EXISTS "旅程は本人のみ追加可" ON norireco_trips;
DROP POLICY IF EXISTS "旅程は本人のみ追加可（full_banned不可）" ON norireco_trips;
CREATE POLICY "旅程は本人のみ追加可（full_banned不可）"
  ON norireco_trips FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM norireco_profiles p
      WHERE p.user_id = auth.uid()
        AND p.share_status = 'full_banned'
    )
  );

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 2. norireco_character_grants INSERT policy に full_banned ガード追加 ║
-- ╚══════════════════════════════════════════════════════════════╝
DROP POLICY IF EXISTS "キャラ獲得は本人のみ追加可" ON norireco_character_grants;
DROP POLICY IF EXISTS "キャラ獲得は本人のみ追加可（full_banned不可）" ON norireco_character_grants;
CREATE POLICY "キャラ獲得は本人のみ追加可（full_banned不可）"
  ON norireco_character_grants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM norireco_profiles p
      WHERE p.user_id = auth.uid()
        AND p.share_status = 'full_banned'
    )
  );

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 3. norireco_memos INSERT policy に full_banned ガード追加     ║
-- ╚══════════════════════════════════════════════════════════════╝
DROP POLICY IF EXISTS "メモは本人のみ追加可" ON norireco_memos;
DROP POLICY IF EXISTS "メモは本人のみ追加可（full_banned不可）" ON norireco_memos;
CREATE POLICY "メモは本人のみ追加可（full_banned不可）"
  ON norireco_memos FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM norireco_profiles p
      WHERE p.user_id = auth.uid()
        AND p.share_status = 'full_banned'
    )
  );

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 4. PostgREST にスキーマ変更を反映                              ║
-- ╚══════════════════════════════════════════════════════════════╝
NOTIFY pgrst, 'reload schema';

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 5. 確認                                                        ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 5-A. 3 テーブルの INSERT policy 名と with_check 式に full_banned が含まれていること
SELECT tablename, policyname, cmd,
       (with_check LIKE '%full_banned%') AS has_full_banned_guard
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('norireco_trips', 'norireco_character_grants', 'norireco_memos')
  AND cmd = 'INSERT'
ORDER BY tablename;
-- 期待: 3 行 (3 テーブル × INSERT 1 件、has_full_banned_guard = t がすべて)

-- 5-B. UPDATE/DELETE/SELECT policy は据え置きで本人のみ (full_banned ガード無し) であること
SELECT tablename, cmd, count(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('norireco_trips', 'norireco_character_grants', 'norireco_memos')
GROUP BY tablename, cmd
ORDER BY tablename, cmd;
-- 期待: 3 テーブル × 4 policy = 12 行 (各 SELECT/INSERT/UPDATE/DELETE 1 件)

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ 6. 運用イメージ (コメントとして残す)                          ║
-- ║   full_banned 発動: SELECT set_account_status('<uuid>', 'full_banned', '理由'); ║
-- ║     → 以降この user は trip/grant/memo の INSERT 不可 + shares INSERT 不可     ║
-- ║       + 既存 shares.revoked=true (v423 set_account_status が自動同期)         ║
-- ║   解除: SELECT unban_user_share('<uuid>'); -- profiles → 'ok' に戻す            ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Applied: 2026-05-29 by yutsutke (確認 5-A: 3 行 has_full_banned_guard = t / 5-B: 13 行 = norireco_trips に旧 FOR ALL policy 残留と判明 → v425 で別途 DROP)
