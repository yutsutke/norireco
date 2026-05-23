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

**`CACHE_VERSION = 'v273'`** · デプロイ回数 = バージョン番号の不変式

---

## カバレッジ

| カテゴリ | カバー状況 |
|---|---|
| 営業系統 | 637 + α 系統 |
| 駅（ユニーク） | 約 9,017 駅 |
| 駅（系統単位） | 10,450 駅 |
| キャラ | 7 体（八王子 3・立川 3・小宮 1） |
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
- **Phase 3.8** (v158〜): データ補修 + 期間フィルタ拡充 + 記録 UX 磨き込み (v158〜v194, CHANGELOG_PHASE3.8-early.md) → **ES Modules 全面化** (v195〜v225, CHANGELOG_PHASE3.8-modules.md) → 旅程編集拡張 (v226〜v227) → ログアウトセキュリティ + 静的デモ撤去 + LOD シンプル化 (v228〜v235) → OGP シェア MVP (v236〜v237) → 完乗率統合 + リージョン中央駅 (v238〜v242) → 系統色カスタマイズ (v243〜v247) → onclick bridge 修正 (v248) → Cloudflare Pages + norireco.app (v249) → R2/Workers + 写真添付 (v256〜v269) ← **今ここ**
- **ドキュメント整理** (2026-05-20): CHANGELOG.md 4 ファイル分割 / (2026-05-23): §0.1 を本ファイル `STATUS.md` に分離・git 管轄化（Stop フック対象に）
