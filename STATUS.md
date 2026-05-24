# 乗レコ 現在のステータス

> 「現在のスナップショット」用ファイル。**ターンごとに最新に保つ**（変更を伴ったら必ず更新）。
> 履歴は `CHANGELOG.md`、やることは `TODO.md`、詳細仕様は Notion §1.x / §2.x。

---

## プロダクトブランド

| 項目 | 値 |
|---|---|
| プロダクト名 | **乗レコ** |
| サブタイトル | **電車旅** |
| コア機能 | 全国鉄道の乗車記録・完乗率の可視化 |
| 拡張機能 | 電車旅のハブ・プラットフォーム |
| ブランド確定日 | 2026-05-13 |

---

## URL ・ リポジトリ

- 公開 URL（本番）: <https://norireco.app> — Cloudflare Pages + Custom Domain (v249〜)
- フォールバック: <https://yutsutke.github.io/norireco/> — GitHub Pages（既存 PWA install 用に当面残置）
- GitHub: `yutsutke/norireco` (Public)
- デプロイ: main 直 push（30 秒〜2 分で反映）

---

## Service Worker

**`CACHE_VERSION = 'v317'`** · デプロイ回数 = バージョン番号の不変式

---

## カバレッジ

| カテゴリ | カバー状況 |
|---|---|
| 営業系統 | 637 + α 系統 |
| 駅（国土地理院 N02 ベース） | 9,017 駅 |
| キャラ | 6 体（八王子 3・立川 3） |
| 列車マスター | 約 260 種 |

列車マスターの内訳: 新幹線・在来特急・寝台・クルーズ・観光列車・SL・急行（戦前〜現代、廃止列車は `discontinued: true`）。

---

## コードベース

- `noritetsu-map.html`（910 行、地図画面）
- `noritetsu-log.html`（ログ画面）
- `js/01-..〜18-..`（機能別 ES Modules、v131〜v138 で 13 ファイル化、v190 で 13-mypage を 4 分割、v192 で 02b-service-lines-builder を分離、v194 で 04b-ride-record を分離、v258 で 18-photo-area を分離）
- `worker/`（Cloudflare Workers + R2 ゲートウェイ、v256〜）
- `sw.js` / `manifest.json`（PWA）
- `window.NORIRECO.mypage.xxx` 名前空間（v190〜、既存 `window.xxx` 公開は HTML onclick 互換で維持）

詳細 → Notion §2.4 コード構成

---

## 領域別ステータス

> ⚠️ 各行 1〜2 文の概要のみ。詳細は `CHANGELOG.md` のバージョン番号参照。

| 領域 | 状態 |
|---|---|
| **Phase 2〜3.7 コア機能一式** (v60〜v157) | ✅ 完成 — 営業系統ベース地図 / 駅 UI 個人化 / 駅キャラ / 認証グラデーション / GPS 記録 / 列車種別 / コード分割 / 不正検知 / Supabase 認証 / マイページ 3 サブタブ + 詳細統計 16 種。詳細は CHANGELOG §1-§37 |
| **シェア機能 OGP 画像 MVP** (v236〜v237) | ✅ MVP 完成 — マイページから 1200×630 PNG 生成。残: verified 限定ガード / 個別 trip シェア / 受け側 `/share/<id>` / R2 保存。CHANGELOG §85-86 |
| **完乗率数字統合 + 用語統一 + リージョン中央駅** (v238〜v242) | ✅ 完成 — ヘッダ/マイページの完乗率ズレ修正、globalStats 系統オーバーカウント修正、「公式」→「GPS 記録」、9 地域中央駅 10 駅を tier 7 として z>=4 で常時表示。CHANGELOG §87-91 |
| **系統色のユーザーカスタマイズ** (v243〜v247) | ✅ 完成 — 路線タブで色変更 + localStorage、駅マーカー追従、地図上路線クリックで色モーダル、Supabase `norireco_line_color_overrides` でデバイス間同期。CHANGELOG §92-96 |
| **HTML onclick window bridge 漏れ修正** (v248) | ✅ 完成 — ES Modules stage 3 で撤去した `window.toggleRecordMode` 等の漏れを grep 監査で発見・復活。CHANGELOG §97 |
| **GitHub Pages → Cloudflare Pages 移行 + norireco.app** (v249) | ✅ 完成 — Cloudflare Pages（帯域無制限）+ 独自ドメイン、`_headers` / `_redirects` / OGP メタ追加、Supabase Auth Redirect URLs 追加で Magic Link + Google OAuth 動作確認。CHANGELOG §98 |
| **R2/Workers ゲートウェイ + 写真添付フル機能** (v256〜v269) | ✅ 完成 — `worker/` 新規、`api.norireco.app` + `cdn.norireco.app` bind、presigned PUT URL 方式、Supabase JWT ES256 JWKS verify、memo/trip ともに最大 5 枚対応、Canvas 圧縮（長辺 1200px / WebP 0.82）。CHANGELOG §105 / §107 |
| **マイページ即時反映 + 駅/路線アクションシート + 駅名検索 + memoMode 撤廃** (v279〜v289) | ✅ 完成 — 削除/GPS 認証の即時 UI 反映、地図駅クリックで「この駅を含む旅程」一覧 (v282)、路線クリックで「📸 路線メモ + 🎨 色変更」(v283)、旧 📸 FAB 撤去 (v284)、マイページ旅程/メモに駅名検索 + 4 chip scope (始点/終点/乗換/通過) (v285〜v289)。CHANGELOG §127-§137 |
| **駅 id 体系 Phase 1 + 用語整理「完駅率」 + slRiddenSt ばらまき撤廃 + 駅クリック確実化 + 旅程 lazy fetch** (v290〜v309) | ✅ 完成 — `merged_stations.json` 全 9,017 駅に `s_NNNNN` id 付与、SERVICE_LINES に伝播、集計・描画判定すべて id ベース化 (v293〜v296)。「完乗率」→「完駅率」用語整理 (v297)。slRiddenSt の「candidateN02Ids 経由ばらまき」を撤廃して系統ごとに正確判定 (v298〜v300)。Canvas tolerance 不発環境向けに map.click delegate (40px) で駅クリック確実化 (v304〜v306)。polyline click が delegate を奪う件を polyline 側にも近傍駅検索を追加して解決 (v308)。駅シート「この駅を含む旅程」をマイページ未開封でも lazy fetch で取得 (v309)。CHANGELOG §138-§157 |
| **駅 id 体系 Phase 2-a: trip データに `*_station_id` 列追加 + 並行書き込み** (v310) | ✅ 完成 — SQL migration `v310_trip_station_ids.sql` 実行済 (確認: 新規 trip に `s_NNNNN` 入る)、書き込みパス並行書き込み稼働中。CHANGELOG §158 |
| **駅 id 体系 Phase 2-b: 既存 trip バックフィル** (v311) | ✅ 完成 — 125 件 PATCH 成功 (失敗 0)。全 trip が id 列を持つ状態。CHANGELOG §159 |
| **駅 id 体系 Phase 2-c: 完全一致経路の id 優先化** (v312) | ✅ 完成 — tripMatchesAnyStation の predicate を `(name, id)` 2 引数に拡張、tripVisitsStation/getTripsAtStation を ms オブジェクト引数に変更。地図駅クリックは id 比較で同名駅取り違えなく一意。通過駅展開も id 優先。マイページ駅名検索 (substring) は name のまま動く。CHANGELOG §160 |
| **駅 id 体系 Phase 3-a/3-b: キャラを id 化** (v313) | ✅ 完成 — `characters_master.json` schema_v2 で `station_ids` を `s_NNNNN` 配列に、旧駅名は `station_names` に。stationCharMap を id/name dual キー化、checkAndGrantCharacters の verifiedStations も dual、tryGrantByGPS / getObtainableCharactersAt も id 優先 + name fallback に。CHANGELOG §161 |
| **駅 id 体系 Phase 3-c: GPS 後追い認証 id 対応** (v314) | ✅ 完成 — `retroactivelyVerifyTrip` の `findStCoord(name)` を `(id, nameFallback)` に拡張、`trip.from_station_id` / `to_station_id` 優先で駅座標解決。CHANGELOG §162 |
| **駅 id 体系 Phase 3-d: norireco_memos に station_id 列追加 + 並行書き込み + 読み込み id 優先化** (v315) | 🟡 frontend 完成・SQL 実行待ち — SQL migration `v315_memo_station_id.sql` 作成、新規メモは station_id 並行書き込み、openStationMemoList / hasMemosForStation も id 優先 + name fallback。既存 3 件はバックフィルなし (ユスケ判断、fallback で動く)。⚠ Supabase Dashboard で SQL 実行が必要。CHANGELOG §163 |
| **駅 id 体系 Phase 3-e 部分: 13a-stats visitCount を id 化 + dev-backfill 撤去** (v316) | ✅ 完成 — マイページ統計の visitCount を駅 id キーに移行、表示時に id → name 解決。`js/20-dev-backfill.js` を削除 + sw.js / HTML から script 参照を外す。CHANGELOG §164 |
| **駅 id 体系 Phase 3-e 仕上げ: 駅名検索 id 解決層 + slVisitCount SERVICE_LINES + id 化** (v317) | ✅ 完成 — `resolveStationQueryIds(q)` を 13-mypage-common に新設 (MERGED_STATIONS から候補 id Set)、マイページ旅程/メモの駅名検索を「id 比較 + name fallback」predicate に。slVisitCount を SERVICE_LINES ベース集計 + 駅 id キーに移行、08-rendering / キャラモーダルの参照側も ms.id ベースに。CHANGELOG §165 |
| **駅 id 体系 Phase 3 残り (name 列廃止 + slStopType id 化 + LINES の id 付与)** | ❌ 未着手 — Supabase の `from_station` / `to_station` / `memos.station` 列廃止、`characters_master.json` の `station_names` 撤去、slStopType の id キー化。一括で着手予定 (Phase 4) |
| **旅程カード「✏️ 編集」拡張** (v226〜v227) | ✅ 完成 — 編集モーダル 5 セクション化、手動記録は時刻フル編集可、GPS 記録はロック。📍 区間フル編集は積み残し。CHANGELOG §75-76 |
| **ログアウトセキュリティ + 静的デモ撤去 + 完乗率ユニーク駅統一 + LOD シンプル化** (v228〜v235) | ✅ 完成 — SIGNED_OUT で localStorage/RIDDEN_SEGS/mypage キャッシュ purge、地図 LOD 圧縮、user_id フィルタ漏れ修正、静的デモ撤去、完乗率をユニーク駅単位に統一。CHANGELOG §77-84 |
| **DELETE_MARKER_4 (13-mypage 4 分割)** (v190) | ✅ 完成 — common/stats/trips/lines に分割、`NORIRECO.mypage.xxx` 名前空間登録 |
| Supabase RLS 強化 (user_id = auth.uid() 必須) | ❌ 未着手（🔥 v233 残課題）— SUPABASE_KEY は frontend 露出 anon key、REST 直叩きで他人生データを取れる。UI 防御は v233 で済 |
| **Phase 1.5: Map × Claude チャット統合 MVP** | ❌ 未着手（🔥 新規 / 2026-05-19）— 地図画面横にチャットパネル + Claude API + 乗レコ MCP server。最小 1 ヶ月。Notion §3.3 参照 |
| 駅 UI 情報ハブ化（4 領域パネル） | ❌ 未着手 |
| キャラ図鑑タブ | ❌ 未着手 |
| 普通電車の車両形式選択 | ❌ 未着手 |
| ノリレコログを地図画面のタブに統合 | ❌ 未着手（🟡 体験向上） |
| 垢 BAN 対応（共有のみ停止・個人記録は維持） | ❌ 未着手（🔥 不正検知連動） |
| マップ情報レイヤー構想 | ❌ 未着手（将来） |
| 廃線対応 | ❌ 未着手（🎮 将来） |

詳細は `TODO.md`（🔥最優先 / 🟡体験向上 / 🟢データ充実 / 🔧パフォーマンス / 🎮将来 / 🌱布石）を参照。

---

## 直近のフェーズ

- **Phase 2** (v60〜v73): 地図描画を営業系統ベースに全面切替
- **Phase 2.5** (v74〜v88): 駅キャラシステムと個人化
- **Phase 3** (v89〜v94): 認証グラデーション + GPS 獲得
- **Phase 3.5** (v95〜v108): 現在地表示 + 最寄駅 + GPS 認証 trip
- **Phase 3.6** (v109〜v131): 安定化・列車種別・コード分割
- **Phase 3.7** (v132〜v157): 不正検知・ログイン・マイページ
- **Phase 3.8** (v158〜): データ補修 + 期間フィルタ拡充 + 記録 UX 磨き込み (v158〜v194, CHANGELOG_PHASE3.8-early.md) → **ES Modules 全面化** (v195〜v225, CHANGELOG_PHASE3.8-modules.md) → 旅程編集拡張 (v226〜v227) → ログアウトセキュリティ + 静的デモ撤去 + LOD シンプル化 (v228〜v235) → OGP シェア MVP (v236〜v237) → 完乗率統合 + リージョン中央駅 (v238〜v242) → 系統色カスタマイズ (v243〜v247) → onclick bridge 修正 (v248) → Cloudflare Pages + norireco.app (v249) → R2/Workers + 写真添付 (v256〜v269) → マイページ即時反映 + 駅/路線アクションシート + 駅名検索 + memoMode 撤廃 (v279〜v289) → 駅 id 体系 Phase 1 + 完駅率用語整理 + slRiddenSt 修正 + 駅クリック確実化 (v290〜v306) → polyline click が delegate を奪う件の修正 (v308) → 駅シート「この駅を含む旅程」を lazy fetch 化 (v309) → 駅 id 体系 Phase 2-a (trip データに id 列追加 + 並行書き込み開始) (v310) → Phase 2-b 既存 trip バックフィル dev ヘルパー (v311) → Phase 2-c 完全一致経路の id 優先化 (v312) → Phase 3-a/3-b キャラを id 化 (v313) → Phase 3-c GPS 後追い認証 id 対応 (v314) → Phase 3-d メモに station_id 列追加 + 並行書き込み + 読み込み id 優先化 (v315) → Phase 3-e 部分 cleanup (visitCount id 化 + dev-backfill 撤去) (v316) → Phase 3-e 仕上げ (駅名検索 id 解決層 + slVisitCount を SERVICE_LINES + id 化) (v317) ← **今ここ**
- **ドキュメント整理** (2026-05-20): CHANGELOG.md 4 ファイル分割 / (2026-05-23): §0.1 を本ファイル `STATUS.md` に分離・git 管轄化（Stop フック対象に）
