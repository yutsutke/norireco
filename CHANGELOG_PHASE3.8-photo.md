# 乗レコ - 電車旅 更新履歴 (Phase 3.8 駅メモ + R2/写真期 — v250〜v278 アーカイブ)

`CHANGELOG.md` から退避した Phase 3.8 駅メモ + R2/Workers + 写真添付期 (v250〜v278 相当, §99〜§126) のセッションログ。Notion ドキュメント整理 (v271〜v278) も含む。
他フェーズは:
- [CHANGELOG.md](CHANGELOG.md) — 現行 Phase 3.8 後半 (v334〜)
- [CHANGELOG_PHASE3.8-station-id.md](CHANGELOG_PHASE3.8-station-id.md) — Phase 3.8 駅 ID 体系期 (v290〜v333)
- [CHANGELOG_PHASE3.8-mypage.md](CHANGELOG_PHASE3.8-mypage.md) — Phase 3.8 マイページ強化期 (v279〜v289)
- [CHANGELOG_PHASE3.8-share.md](CHANGELOG_PHASE3.8-share.md) — Phase 3.8 シェア + Cloudflare 移行期 (v226〜v249)
- [CHANGELOG_PHASE3.8-modules.md](CHANGELOG_PHASE3.8-modules.md) — Phase 3.8 中盤 (v189〜v225)
- [CHANGELOG_PHASE3.8-early.md](CHANGELOG_PHASE3.8-early.md) — Phase 3.8 前半 (v173〜v188)
- [CHANGELOG_PHASE1-3.7.md](CHANGELOG_PHASE1-3.7.md) — Phase 1〜3.7 (v60〜v157)

カバー範囲 (ファイル内は DESC 配置・新しい順):
- §126 v278: SessionStart hook の手順 2 を v276 移行後の文面に追従
- §125 v277: Notion §0 役割分担表に「判断軸」セクションを追記
- §124 v276: ドキュメント役割分担表を Notion §0 に再集約 (v275 の方針転換)
- §123 v275: ドキュメント役割分担表を CLAUDE.md に一本化 (3 か所重複の解消)
- §122 v274: Notion §0 セッション運用ガイドの現状整合化
- §121 v273: permission allowlist 整理 (user global ↔ project shared)
- §120 v272: .claude/ hook を git 追跡化 + STATUS.md を SessionStart に inline
- §119 v271: §0.1 現在のステータスを STATUS.md に分離 (git 管轄化)
- §118 v269: hotfix (deletePhotoByUrl の関数定義漏れで全モジュール崩壊)
- §117 v268: memo/trip 全削除時の R2 cleanup
- §116 v267: マイページの D&D が動かない真の原因 fix (ignoreSelector から `a` 削除)
- §115 v266: D&D が動かない bug fix (dragstart 抑制 + `gs is not defined`)
- §114 v265: D&D 後の click 抑制 (リンク・ボタン誤発火を防止)
- §113 v264: 写真並び替えを D&D に全交換 + ‹ › 撤去
- §112 v263: マイページ旅程・メモカード上で写真を ← → 並び替え
- §111 v262: 写真差し替え時の旧 R2 オブジェクト delete API
- §110 v261: 写真の並び替え UI (← → ボタン方式)
- §109 v260: 写真アップロードの進捗バー
- §108 v259: `.btn-gen` の CSS 定義漏れを修正
- §107 v258: 旅程の写真添付 + memo の複数枚化 + 共通 PhotoArea モジュール
- §106 v257: マイページ memo カードに写真サムネイル表示
- §105 v256: R2/Workers 経由のメモ写真アップロード (布石 #2/#4 着手)
- §104 v255: キャラモーダル内のキャラ切り替えが「閉じるだけ」だったのを修正
- §103 v254: v253 駅アクションシートの 2 つのバグ修正
- §102 v253: 駅タップで「アクションシート」(手動記録 / メモ / 色変更 / キャラ)
- §101 v252: 駅 hover ツールチップに「📸 メモ N 件」を追加
- §100 v251: 駅タップで駅メモ一覧モーダルを表示
- §99 v250: 駅メモ機能の本格化 (Supabase CRUD + マイページ「📸 メモ」タブ)

---

## 126. v278 — SessionStart hook の手順 2 を v276 移行後の文面に追従 (2026-05-23)

### 背景

v276 でドキュメント役割分担を Notion §0 に集約したのに、SessionStart hook が出す「手順 2」と Notion §9 子ページ §2.3 の対応記述が古いままだった:

```
2. 構造把握  CLAUDE.md のドキュメント地図（STATUS / CHANGELOG / TODO / Notion の役割分担）を踏まえ、
            仕様詳細は Notion §1 画面 / §2 裏側 / §3 将来 の該当子ページを必要時 fetch
```

CLAUDE.md「ドキュメント地図」は v276 で Notion §0 へのリンク 1 行に簡略化されていて、表は無い。

### 修正

両方同じ文言に書き換え:

```
2. 構造把握  仕様詳細は Notion §1 画面 / §2 裏側 / §3 将来 の該当子ページを必要時 fetch。
            ドキュメント役割分担に迷ったら Notion §0「ドキュメント役割分担」を fetch（v276〜真実の源）
```

- `.claude/hooks/session-start.js` 手順 2
- Notion §9「⚙️ セッション運用 三層設計」§2.3 SessionStart の中身（最終更新を v272 → v278 に）

### 学び

判断軸を明文化（v277）した直後の振り返りで、ユスケが「hook 出力と Notion §9 が古い」と即気付いてくれた。明文化の効果が早速出た。

---

## 125. v277 — Notion §0 役割分担表に「判断軸」セクションを追記 (2026-05-23)

### 背景

v270〜v276 の整理シリーズで「どこに置くか」を毎回個別に判断していたが、ユスケさんが綺麗な 4 ルールに整理してくれた:

| 場所 | 何を置く |
|---|---|
| `.claude/hooks/*.js` | 強制したいこと + 自動補助 |
| git（STATUS / CHANGELOG / TODO） | 更新が頻繁 |
| CLAUDE.md | 毎回読み込んでコストに見合う = 指針・規約 |
| Notion | 上記以外（静的・更新少ない・必要時のみ参照） |

### 実装

Notion §0 役割分担表の直下に「### 判断軸（どこに置くか — v277 追記）」セクションを 4 行で追加。

### 効果

「これどこに書く？」と迷ったとき、判断軸を見れば 4 択で即決できる。v270〜v276 のような迷走を再発させない。

---

## 124. v276 — ドキュメント役割分担表を Notion §0 に再集約（v275 の方針転換） (2026-05-23)

### 背景

v275 で CLAUDE.md「ドキュメント地図」に集約したばかりだが、ユスケさんの指摘で再考:

- 役割分担表は **更新頻度が低い**（一度確定すれば数ヶ月変わらない）
- **毎回見るものでもない**（Claude も覚えている）
- CLAUDE.md は Claude Code が毎回自動ロード → **context cost が毎回かかる**

→ Notion に置いて必要なときだけ fetch する方が合理的。

### 実装

- **Notion §0「ドキュメント役割分担」** に表 7 行（STATUS / CHANGELOG / TODO / CLAUDE.md / hooks / Notion / アーカイブ）を再配置 → **真実の源**
- **CLAUDE.md「ドキュメント地図」**: 表を撤去し Notion §0 へのリンク 1 行のみに
- **CHANGELOG.md 冒頭**: 「CLAUDE.md 参照」を「Notion §0 参照」に変更

### v270〜v276 の整理シリーズ振り返り

7 連続のドキュメント運用整理:

| v   | 整理内容 |
|---|---|
| v270 | CHANGELOG/TODO ルール簡略化 + CLAUDE.md git 追跡開始 |
| v271 | §0.1 → STATUS.md 分離（Stop hook で機械検知可に） |
| v272 | .claude/ git 追跡 + STATUS.md を SessionStart hook に inline |
| v273 | permission allowlist 整理（user global ↔ project shared） |
| v274 | Notion §0 を現状整合化 + §0.1 旧表削除 |
| v275 | 役割分担表を CLAUDE.md に一本化（3 か所重複の解消） |
| **v276** | **v275 を方針転換: CLAUDE.md ではなく Notion §0 に集約**（context cost 観点） |

教訓: ドキュメント置き場の選択基準は「更新頻度 × Claude Code の毎回ロードコスト」で判断する。静的なものほど Notion 側、動的なものほど git 側。

---

## 123. v275 — ドキュメント役割分担表を CLAUDE.md に一本化（3 か所重複の解消） (2026-05-23)

### 背景

v274 で「同じ内容を 2 か所に書かない」と決めた直後に、その役割分担表自体が 3 か所に書かれているという皮肉な状況に気づいた:

1. `CLAUDE.md`「ドキュメント地図」
2. `CHANGELOG.md` 冒頭「役割と使い分け」表
3. Notion §0「ドキュメント役割分担」表

### 設計判断

`CLAUDE.md` を**真実の源**にする。理由:
- Claude Code が毎回自動ロード → context に常駐
- git 管轄 → 機械検知可
- 規約・指針の置き場として既に位置付けられている

### 実装

- **CLAUDE.md「ドキュメント地図」**: 表形式で完全版に強化（7 行: STATUS / CHANGELOG / TODO / CLAUDE.md / hooks / Notion / アーカイブ）
- **CHANGELOG.md 冒頭「役割と使い分け」表**: 撤去 → CLAUDE.md へのリンク + 過去アーカイブ参照のみに簡略化。「分割ポリシー」「過去ログ早見表」は CHANGELOG 独自情報なので保持
- **Notion §0「ドキュメント役割分担」表**: 撤去 → CLAUDE.md へのリンクのみに簡略化。「作業中（トリガー → 参照先）」「真実の源」は Notion 内ナビゲーションとして保持

### 役割分担の単一の源

これで「ドキュメント役割分担」は CLAUDE.md「ドキュメント地図」一箇所のみ。他は全部リンク。

---

## 122. v274 — Notion §0 セッション運用ガイドの現状整合化 (2026-05-23)

### 背景

Notion §0「🎯 セッション運用ガイド」は v248 時点のドラフトのまま残っており、現在の運用 (hook + CLAUDE.md + STATUS.md) と矛盾していた。例:

- 「開始時 1. §0.1 を流し見」← 既に SessionStart hook が STATUS.md inline 化済 (v272)
- 「終了時 (セッション中はちょこちょこ更新せず、ここでまとめて反映)」← 既に CLAUDE.md ルールで「ターンごとに STATUS / CHANGELOG / TODO 更新」に
- 「Notion §0.1 領域別ステータスに概要1行追記」← §0.1 は v271 で STATUS.md に分離済

### 整理 (案 C: 中間)

- **§9 編集メモ下「⚙️ セッション運用 三層設計」子ページ** を真実の源として書き直し
  - 🚧 ドラフト → ✅ 確定 + 運用中 に格上げ
  - §2.3 SessionStart の内容を v272 版 (STATUS.md inline) に更新
  - §2.4 Stop の内容を v272 版 (sw.js 変更時 STATUS.md チェック追加) に更新
  - §3 CLAUDE.md ドラフト → 撤去し repo の CLAUDE.md を真実の源と明記
  - §4 Notion に残すもの → STATUS.md 分離後の整理版に
  - §5 未確定論点: Windows + node 安定動作を ✅ 解決済に、PreToolUse(git push) は引き続き残課題
  - §6 決定ログに v270〜v273 の整理を追記

- **親ページ §0** を簡略化
  - 「開始時 / 作業中 / 終了時」の冗長な手順 → 削除
  - ドキュメント役割分担表を v273 整理版 (STATUS / CHANGELOG / TODO / CLAUDE.md / Notion の 5 軸) に書き換え
  - 詳細な運用フローは子ページ参照、規約は repo の CLAUDE.md 参照 (二重管理回避)

- **§0.1 旧表撤去**
  - v271 で「次回 Notion 編集時に削除予定」と書いていた領域別ステータス旧表 + コメント 3 つ + 「直近のフェーズ (旧)」見出しを物理削除
  - §0.1 は STATUS.md / CHANGELOG.md §119 へのリンクのみに完全簡略化

### 役割分担の最終形 (v273 整理 + v274 で Notion 反映)

| ドキュメント | 役割 | 真実の源 |
|---|---|---|
| STATUS.md | 現在 (状態軸) | git |
| CHANGELOG.md | 履歴 (時間軸) | git |
| TODO.md | 予定 | git |
| CLAUDE.md | 規約 (指針) | git |
| Notion | 仕様詳細・大方針・戦略 | Notion (人間が俯瞰) |
| .claude/hooks/*.js | 強制 (機械) | git |

5 ドキュメント + hook で責務を直交化。同じ内容を 2 か所に書かない。

---

## 121. v273 — permission allowlist 整理 (user global ↔ project shared) (2026-05-23)

### 背景

`~/.claude/settings.json`（user global）に norireco 特化の `notion-fetch` 許可が混ざっていた。さらに毎セッション permission prompt が出るコマンドがあり、煩雑だった。

### 整理方針

**user global** (`~/.claude/settings.json`): 全プロジェクト共通
- `Bash(git push origin claude/*:main)`
- `Bash(git push origin HEAD:main)`
- `autoUpdatesChannel: latest`

**project shared** (`<norireco>/.claude/settings.json`): norireco 特化
- `mcp__...notion-fetch` (user global から移動)
- `mcp__...notion-search` (新規)
- `mcp__...notion-update-page` (新規・write だが運用上必須)
- `Bash(node --check *)` (新規・JS syntax check、`--check` フラグは実行せず構文検証のみ)
- `Bash(node .claude/hooks/*)` (新規・project hook の手動テスト用)
- hooks (SessionStart + Stop)

### 抽出方法

`~/.claude/projects/*/*.jsonl` の最近 37 セッション・5,470 tool 呼び出しを Node script でスキャン、頻度順にソート。auto-allow 済 (cat/ls/grep/git status 等) と write 操作 / 任意コード実行 (`node -e`, `curl`) は除外。`fewer-permission-prompts` skill を使用。

### スキップした候補（参考）

- `Bash(node -e ...)` (~102 件): 任意コード実行のため
- `Bash(curl ...)` (31 件): 任意 URL アクセス
- `Bash(git add/push/commit ...)`: mutation 系で global / 既存 allow 済
- `mcp__...notion-create-pages` (11 件): write・低頻度

---

## 120. v272 — .claude/ hook を git 追跡化 + STATUS.md を SessionStart に inline (2026-05-23)

### 背景

v271 で STATUS.md を作ったが、SessionStart hook がまだ「Notion §0.1 を fetch しろ」と指示していて整合が取れていなかった。さらに hook script (`.claude/hooks/session-start.js` 等) は untracked のまま運用していたため、他デバイスや将来の協業者に届かないリスクがあった。

### 設計判断

- **SessionStart hook の出力に STATUS.md 全文を inline**: Read tool call も不要で、セッション開始直後から最新スナップショットが context に乗る。STATUS.md は現状 ~70 行なので context cost も許容範囲
- **`.claude/` を git 追跡開始** (CLAUDE.md を v270 で追跡開始したのと同じ精神): プロジェクト共通の hook 設定はリポジトリの一部として管理
- **個人設定とローカル状態は除外**: `.gitignore` 新規作成して `.claude/settings.local.json` / `.claude/worktrees/` を ignore

### 実装

- `.claude/hooks/session-start.js`:
  - STATUS.md を `readFileSafe()` で読み込み hook 出力に inline する `[STATUS.md — 現在のスナップショット]` セクション追加
  - 「着手前に必ず」の手順 1 を「Notion §0 fetch」から「上の STATUS.md を流し見」に書き換え
  - 手順 2 も Notion を「仕様詳細の参照先」に格下げ
- `.claude/hooks/stop-reminder.js`:
  - sw.js を変更したら STATUS.md の CACHE_VERSION 追従もチェック対象に追加 (v271 ルール)
  - メッセージから「Notion §0.1」を撤去 (STATUS.md / CHANGELOG.md / TODO.md の git 三本柱に集約)
- `.gitignore` 新規作成
- `.claude/settings.json` + `.claude/hooks/*.js` を git 追跡

### 残課題

- session-start.js が STATUS.md を inline するので、STATUS.md が肥大化すると毎セッション開始の context cost が増える。1500 行超えたら「冒頭 + 領域別ステータス見出しだけ」抽出に切り替える
- CACHE_VERSION 上げ忘れ防止のため `.gitignore` に sw.js は含めない (当然)。stop-reminder が新規 v271 ルールで catch する

---

## 119. v271 — §0.1 現在のステータスを STATUS.md に分離（git 管轄化） (2026-05-23)

### 背景

§0.1「現在のステータス」（CACHE_VERSION / 領域別ステータス / 直近フェーズ）は Notion 側に置かれていたため、**Stop フックの機械チェック対象外**だった。§0.1 自身に注意書きとして「ターンごとの『概要1行』更新は意識して手で行う」と書かれていた時点で運用が苦しく、実際に v265〜v269 など複数のセッションで更新漏れが起きていた疑いあり。

### 設計判断（3 案比較）

| 案 | メリット | デメリット |
|---|---|---|
| A. Notion §0.1 に残す（現状） | リンク先 1 つで済む | 機械チェック不可、更新漏れが起きやすい |
| B. CHANGELOG.md に同居 | ファイル増えない | CHANGELOG が「履歴（時間軸）」と「現在のスナップショット（状態軸）」を兼任して責務濁る、git diff も混在で読みづらい |
| **C. STATUS.md 独立（採用）** | 役割分担クリア、git 管轄でStop フック検知可、CHANGELOG はピュアな履歴に保てる | リンク先が 1 つ増える |

→ C を採用。CHANGELOG = 履歴、STATUS = 現在のスナップショット、TODO = やること、と責務を直交化。

### 実装

- `STATUS.md` 新規作成 — Notion §0.1 の 6 セクション（ブランド / URL / SW / カバレッジ / コードベース / 領域別ステータス / 直近フェーズ）をそのまま移植
- `CLAUDE.md` 更新 — 「ターンごとに更新」リストに STATUS.md 追加、ドキュメント地図の冒頭を STATUS.md に
- `sw.js` v269 → v271（v270 はドキュメント変更のみで sw.js 未更新だったため、今回まとめて +1 ではなく +2 で整合）
- Notion §0.1 は STATUS.md へのリンクだけに簡略化（セッション末手続きで実施）

### 残課題

- カバレッジ数字（637 系統 / 9,017 駅 / 260 列車）は `service_lines_master.json` などから自動生成できるはずで、手書きはずれやすい。将来 build script で STATUS.md の該当箇所を自動更新するか検討
- 領域別ステータス表は CHANGELOG §番号で詳細参照する構造だが、CHANGELOG が分割されたとき STATUS のリンクが古い番号を指したままになるリスクあり。バージョン番号 (vNNN) で参照する原則は維持

### 振り返り

「現在の状態」と「変更履歴」は性質が違う（状態軸 vs 時間軸）。混ぜると CHANGELOG の冒頭ステータスセクションが毎ターン書き換わってノイズが増える。独立ファイルにすると git diff も読みやすい。

---

## 118. v269 — hotfix: deletePhotoByUrl の関数定義漏れで全モジュール崩壊 (2026-05-23)

### 背景

v268 push 後、ユスケさんから「急に路線が表示されなくなったよ」+ Console スクショ:

```
Uncaught SyntaxError: The requested module './18-photo-area.js'
does not provide an export named 'deletePhotoByUrl' (at 16-memos.js:25:27)
```

= ESM の import 解決失敗 = **全モジュール初期化失敗** = 地図描画もマイページもすべて停止。

### 真の原因

実は v262「写真差し替え時の旧 R2 オブジェクト delete API」の commit 時に、`deletePhotoByUrl` 関数の **定義 Edit が失敗** していた (tool 操作のミス)。`uploadAndGetPhotos` 内で `deletePhotoByUrl(url)` を呼ぶ箇所だけが追加されて、関数本体・export 文が無い状態のまま commit + push されていた。

v262〜v267 の間ずっと **写真差し替えを保存した瞬間に ReferenceError が出る潜在 bug** だったが:
- ユーザーがその操作をしてない (ReferenceError は実行時のみ)
- ファイル内 reference なので import 解決には影響しない

→ 顕在化せず通過。

v268 で `16-memos.js` / `13b-trips.js` に `import { deletePhotoByUrl } from './18-photo-area.js'` を書いた瞬間、**モジュールロード時の静的解析**で export 不在が検出 → SyntaxError → 連鎖崩壊。

### 修正

`js/18-photo-area.js` に欠落していた関数を追加 (`uploadPhoto` の手前):

- `CDN_BASE` constant
- `urlToObjectKey(url)` (内部関数)
- `export async function deletePhotoByUrl(url)` (Worker `/delete/photo` を呼ぶベストエフォート関数)

これらは v262 commit time に追加されているべきだったが Edit が失敗していた。今回正規化。

### 振り返り

- 同じ「Edit が失敗して使用だけ残る」パターンは v265「gs is not defined」と同じ構造の bug。リファクタ / 移動 / 追加時の半分操作残りは要注意
- ESM の良いところ: import 解決時に欠落が即検出される (CommonJS や global だと runtime まで気付かない)
- 救いは syntax check が静的に通っていたこと (使用側だけでは syntax error ではない)。runtime test で初めて顕在化
- 次回からは: 関数を新規 export する commit で `npm run check` 後に **`grep -E "^export\b" target.js | head` で実際に export されてるか目視確認** をルーチン化

## 117. v268 — memo/trip 全削除時の R2 cleanup (2026-05-22)

### 背景

v258 で R2 写真機能を本格化、v262 で差し替え時の旧オブジェクト delete API を実装した。残った穴は **「memo / trip 自体を 🗑 削除」する時に R2 オブジェクトが置き去り** になる問題。R2 無料枠 10GB あるので即困らないが、累積で地味に肥える + 「自分のアカウントから消したい」のに R2 に残るのは UX 的にも違和感。

### 実装

`deletePhotoByUrl(url)` は v262 で `js/18-photo-area.js` から export 済の関数 (Worker `/delete/photo` を呼ぶ、ベストエフォート)。これを 2 箇所の削除関数で再利用:

**`js/13b-trips.js:deleteTripFromMypage`**:
- 削除前に `_mypageCache` から trip を引いて `photos[]` 取得
- Supabase DELETE 成功後、`Promise.all(photos.map(p => deletePhotoByUrl(p.url)))` を fire-and-forget
- await しない → 削除 toast はすぐ表示、R2 削除は背景で進行
- 失敗時は console.warn のみ (trip 自体は既に DB から消えてるので、R2 ゴミが残るだけ。許容)

**`js/16-memos.js:deleteMemoOnServer`**:
- 同じパターンで `M.cache` から memo の photos[] 取得
- Supabase DELETE 成功後に R2 並列削除 (fire-and-forget)
- `deleteMemoFromModal` (モーダル内 🗑) / `deleteMemoById` (マイページ memo カード 🗑) 両方が `deleteMemoOnServer` を経由するので、1 箇所の修正で両方に効く

### 漏れケース

- Supabase DELETE 失敗 (network error など) → throw されるので R2 削除も実行されない (正しい挙動: trip/memo は DB に残ってる)
- Worker `/delete/photo` 失敗 → console.warn のみで継続 (R2 ゴミが残るが、将来の cleanup ジョブで掃除可能。trip/memo 自体の削除は完了済)
- `_mypageCache` / `M.cache` に該当 trip/memo がない (削除直前にリロードされた等) → `photosToDelete = []` で削除なし。R2 ゴミ残る (レアケース)

### Worker 側

無修正。v262 で実装した `POST /delete/photo` (JWT verify + uid prefix チェック付き) をそのまま呼ぶ。

### これで完結する範囲

R2 写真機能の完成度:
- ✅ アップロード (memo / trip、1〜5 枚、複数選択、進捗バー)
- ✅ 表示 (サムネ + クリック原寸、lazy load + CDN cache)
- ✅ 並び替え (ドラッグ&ドロップ、5 箇所統一)
- ✅ 写真個別の差し替え/削除 (✕ で外す or 差し替え時の旧 R2 cleanup)
- ✅ memo/trip 全削除時の R2 cleanup ← v268
- ✅ セキュリティ (JWT verify + uid prefix チェックで他人のオブジェクト削除不可)

布石 #2「画像ストレージ: Cloudflare R2 + Workers API ゲートウェイ」のうち **写真添付ユースケースは完了**。残るのは OGP シェア画像の R2 永続化 (別 use case)。

## 116. v267 — マイページの D&D が動かない真の原因 fix (ignoreSelector から `a` 削除) (2026-05-22)

### 真の原因

v264 で D&D を実装し、v265 (click 抑制)、v266 (dragstart 抑制) と修正を重ねたが、ユスケさんから「うごきませんでした」報告 (v266 反映済の Console スクショ付き、コンソールに pointerdown のエラーなし)。

再調査で見つけた**本当の原因**: `js/19-drag-sort.js:onPointerDown` 内の早期 return:

```js
if (e.target.closest(ignoreSelector)) return;
```

`ignoreSelector` のデフォルト値が `'button, a, input, textarea, select'` で **`a` を含んでいた**。マイページのサムネ HTML は:

```html
<div class="mp-photo-cell">
  <a href="..." target="_blank" draggable="false">
    <img class="mp-tcard-thumb" ...>
  </a>
</div>
```

`<img>` を pointerdown → `e.target = img` → `closest('a')` で `<a>` がマッチ → **即 return → ドラッグ開始されない**。

PhotoArea モーダル内のサムネは `<a>` で wrap してないため (img 直接)、こちらは正常に動いていた。だから「PhotoArea では動くがマイページでは動かない」という分かりにくい症状になった。

### 修正

`19-drag-sort.js` のデフォルト `ignoreSelector` から `a` を削除:

```js
ignoreSelector = 'button, input, textarea, select',
```

`<a>` 内の click は v265 で実装した `suppressNextClick()` で抑制されるので、ドラッグ後にリンクが開く問題は起きない。

`18-photo-area.js` 側の override 文字列からも `a` を削除 (こちらは元々無関係だが整合性のため)。

### 振り返り

3 連の bug fix (v265/266/267) になった原因:
- v265 click 抑制: 必要な保険だが、根本原因ではなかった
- v266 dragstart 抑制 + gs 修正: dragstart 抑制も保険、gs はそもそも別 bug
- v267 ignoreSelector: これが真因

最初から「pointerdown が発火してるか」のログを 1 行入れていれば早く特定できた。次回は実機で動かない時はまず console.log を仕込む。

## 115. v266 — D&D が動かない bug fix (dragstart 抑制 + `gs is not defined` 修正) (2026-05-22)

### 背景

v265 push 後、ユスケさんから「クリックして動かそうとしても動かないし、コンソールも反応なし」のフィードバック + Console スクショ。Console には別の独立した bug `ReferenceError: gs is not defined at renderStats (09-tabs-stats.js:328:45)` も見えていた (これは renderStats を呼んだ時の uncaught promise rejection、D&D 失敗の原因ではないが、放置すると統計タブが描画できない)。

### bug 1: D&D が動かない (`js/19-drag-sort.js`)

サムネは `<a target="_blank">` + `<img>` でラップされている。`draggable="false"` 属性を `<a>` / `<img>` に付けてあったが、**ブラウザによっては効かない**。ユーザーがマウスでサムネを掴むと、ブラウザのネイティブ「URL ドラッグ」or「画像ドラッグ」が即座に発動し、pointer events を奪っていた可能性が高い。

修正: `dragstart` イベント自体を container レベルで明示的に抑制 (`e.preventDefault()`):

```js
function onNativeDragStart(e) {
  if (e.target.closest(itemSelector)) e.preventDefault();
}
container.addEventListener('dragstart', onNativeDragStart);
```

destroy() 時にも removeEventListener。

### bug 2: `gs is not defined` (`js/09-tabs-stats.js`)

`renderStats` の「実績」セクション (line 327〜) で `gs.rt` `gs.la` `gs.pct` を参照していたが、`const gs = ...` の定義が消えていた (過去のリファクタで漏れた)。プロパティ名から `NORIRECO.serviceLines.globalStats()` の戻り値を期待していると判明 (`{ts, rt, la, ld, pct}`)。

修正: `achs` 配列定義の直前で `const gs = NORIRECO.serviceLines.globalStats();` を追加。

### 影響範囲

- bug 1 修正で 5 箇所すべての D&D (PhotoArea 3 モーダル + マイページ 旅程/メモ カード) が実際に動くようになる
- bug 2 修正で マイページ 📊 統計タブの「実績」セクション (9 個のバッジ) が正しく描画される

## 114. v265 — D&D 後の click 抑制 (リンク・ボタン誤発火を防止) (2026-05-22)

### 背景

v264 で D&D を全画面に実装した直後、ユスケさんから「マイページ memo タブでも動く?」と確認の質問。スクリーンショット上で実装は反映されているが、**写真サムネは `<a target="_blank">` でラップされている** ので、D&D 完了時に **pointer up → click イベント発火 → 新タブで原寸表示** という連鎖が起きる可能性がある (mouse 系では確実に発生)。

つまり「ドラッグ&ドロップした瞬間に、写真が新タブで開いてしまう」誤動作。

### 修正

`js/19-drag-sort.js:onPointerUp` 内で、ドラッグ確定 (`started=true`) 後の処理として `suppressNextClick()` を呼ぶ:

```js
function suppressNextClick() {
  function handler(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    window.removeEventListener('click', handler, true);
  }
  window.addEventListener('click', handler, true);
  // 保険: 500ms で listener を撤去 (click が来なかった場合)
  setTimeout(() => window.removeEventListener('click', handler, true), 500);
}
```

window への capture phase listener で「次の click を 1 回だけ吸収」する典型パターン。pointer up 直後の click は確実に捕まる。500ms タイムアウトでリーク防止。

### 影響範囲

- 5 箇所すべての D&D (PhotoArea 3 モーダル + マイページ 旅程/メモ カード) で同時改善
- ドラッグじゃない単純なクリック (5px 未満) は started=false のままなので suppressNextClick は呼ばれない → リンク開封は通常通り動く

## 113. v264 — 写真並び替えを D&D に全交換 + ‹ › 撤去 (2026-05-22)

### 背景

v261 (PhotoArea 内 ‹ ›) → v263 (マイページカードでも ‹ ›) と並び替え UI を入れたが、ユスケさんから「矢印があると見栄えがわかくなるね。ドラッグ&ドロップで操作するようにはできない?」とフィードバック。

D&D 自体は実装可能だが、PWA (モバイル想定) で HTML5 native drag-and-drop はモバイル非対応 → Pointer Events で自前実装する。

### 新規モジュール: `js/19-drag-sort.js`

汎用 D&D 並び替えライブラリ (66 行、依存なし):

```js
enableDragSort(container, {
  itemSelector,        // ドラッグ対象を絞る selector
  onReorder,           // (oldIdx, newIdx) => void
  ignoreSelector,      // 掴まない子要素 (button, a, input)
  threshold,           // drag 確定までの px (default: 5)
})
```

実装ポイント:
- **Pointer Events** で PC (mouse) + モバイル (touch) を統一 (HTML5 native は touch 不可)
- **threshold** 超過まで「クリック扱い」、超えたら「ドラッグ」に確定 (誤動作防止 = 軽くタップでドラッグ開始しない)
- **event delegation**: container に 1 つ listener、子要素は innerHTML 書き換えで再生成されても自動追従 → 再 attach 不要 (マイページの 153 枚カードでも軽量)
- **setPointerCapture** で長距離スワイプも追従 + `e.preventDefault()` で iOS Safari のスクロール抑制
- ドロップ位置検出: pointer 座標を全 item の `getBoundingClientRect()` と比較

### 各画面の統合

| 画面 | ファイル | 統合方法 |
|---|---|---|
| PhotoArea (memo/trip 編集モーダル + 記録モード確認) | `js/18-photo-area.js` | `createPhotoArea` 内で `enableDragSort(gridEl, {...})` を 1 回 attach、戻り値の `destroy()` を `area.destroy()` 内で呼ぶ |
| マイページ旅程カード | `js/13b-trips.js` | `reorderTripPhotos(tripId, fromIdx, toIdx)` を追加 (任意位置への移動。旧 `moveTripPhoto` 隣接スワップを廃止)。`renderMpTripsSection` 末尾で `attachPhotoDragSortToTripCards(sec)` を呼ぶ |
| マイページ memo カード + 駅メモ一覧モーダル | `js/16-memos.js` | `reorderMemoPhotos(memoId, fromIdx, toIdx)` を追加 (旧 `moveMemoPhoto` 廃止)。`renderMpMemosSection` / `openStationMemoList` の末尾で `attachPhotoDragSortToMemoCards(rootEl)` を呼ぶ |

### CSS (`noritetsu-map.html`)

撤去:
- `.pa-move-row` / `.pa-move` (PhotoArea 内 ‹ ›)
- `.mp-photo-move` (マイページカード上 ‹ ›)

追加:
- `.pa-item, .mp-photo-cell { cursor: grab; touch-action: none; user-select: none; }` (D&D 対象セル)
- `.drag-dragging { opacity: 0.7; cursor: grabbing; box-shadow: 0 8px 20px rgba(0,0,0,.6); }` (ドラッグ中のゴースト)
- `.drag-over { outline: 2px dashed var(--gold); }` (ドロップ候補のハイライト)
- `.pa-item img, .mp-photo-cell img { -webkit-user-drag: none; }` (画像のネイティブ drag を抑制)

### 挙動

1. サムネを mouse down or touch start → 5px 以上動かしたらドラッグ確定
2. ドラッグ中: サムネが透過 + 浮いた感、他のサムネ上で gold dashed outline ハイライト
3. 離したら入れ替え (即座に Supabase PATCH + 再描画)
4. ハイライト無しで離す or 圏外でキャンセル → 元位置に戻る

### 影響範囲 (D&D 統一の効果)

5 つの並び替え場所が同じ UX:
- 記録モード確認モーダルの 📷 写真
- 旅程編集モーダルの 📷 写真
- メモモーダルの 📷 写真
- マイページ 🚃 旅程タブの各カード
- マイページ 📸 メモタブの各カード + 駅メモ一覧モーダル

### 残課題

- ドラッグ中のスムーズなアニメ (他要素が「隙間を作る」transition) — 現状は即座に入れ替わるシンプル実装
- マイページのフィルタ/ソート変更直後にもドラッグ可 (event delegation で自動追従、未確認)

## 112. v263 — マイページの旅程・メモカード上で写真を ← → 並び替え (2026-05-22)

### 背景

v261 で PhotoArea (memo モーダル / 旅程編集モーダル / 記録モード確認) に並び替え UI が入ったが、ユスケさんからの指摘:「マイページ画面でも、写真が左右に移動できるようにしたい」。

確かに「並び替えだけのために 編集モーダル を開く」のは手数が多い。マイページ画面で直接やれた方が UX 上いい。

### 設計判断

| 方式 | 採否 | 理由 |
|---|---|---|
| 各カードに PhotoArea を埋め込む (フル機能) | ❌ | 153 件のカードに 153 個の PhotoArea = メモリ食い・DOM 重い。並び替えしか必要ないのにオーバーキル |
| カード上に **← → だけ**の軽量 UI | ✅ | 並び替えに限定、Supabase PATCH を直接呼ぶ |
| ✏️ 編集モーダルだけで完結 (現状維持) | ❌ | ユスケさんの希望: カード上で完結したい |

### 実装

`js/13-mypage-common.js:tripCardHtml`:
- 写真サムネを `.mp-photo-cell` (relative wrap) でラップ
- 2 枚以上のとき `.mp-photo-move.left` / `.mp-photo-move.right` を絶対配置 (top:50% / 左右端 / 20×20 半透明黒)
- 最左/最右は `disabled` で半透明

`js/13b-trips.js`:
- `moveTripPhoto(tripId, idx, direction)` を追加
  1. `_mypageCache` の trip から photos[] を取得 → swap
  2. localStorage 同期
  3. Supabase PATCH `{ photos: newOrder }`
  4. `renderMpTripsSection()` で再描画
- 失敗時は console.warn のみ (alert 出さない、ローカル状態は更新済なので UX 続行)

`js/16-memos.js`:
- 同じパターンで `moveMemoPhoto(memoId, idx, direction)` を追加 (memo カード + 駅メモ一覧モーダルで動作、`memoCardHtml` 共通)
- 既存の `updateMemoOnServer` を流用 (PATCH `{ photos }`)

`noritetsu-map.html`:
- `.mp-photo-cell` / `.mp-photo-move` CSS 追加 (PhotoArea の `.pa-move` と似た見た目だが、サムネサイズが小さい (64-80px) ため少しコンパクトに 20×20)

### 影響範囲

- マイページ **🚃 旅程タブ** の各カード
- マイページ **📸 メモタブ** の各カード
- **駅メモ一覧モーダル** (v251、`memoCardHtml` 共通使用のため自動追従)

3 箇所同時に並び替え可能になる。

### 残課題

- 1 枚しかない時はボタン非表示 (実装済、`photos.length > 1` 条件)
- スマホ画面の小さいサムネだと押しにくい可能性 — 実機テストで判断

## 111. v262 — 写真差し替え時の旧 R2 オブジェクト delete API (2026-05-22)

### 背景

v258 で複数枚化したことで、ユーザーが写真を **✕ で外す → 保存** したり **差し替え → 保存** した時に、Supabase の `photos jsonb` 列からは外れるが R2 のオブジェクト自体は残り続けるゴミ問題が顕在化。R2 は 10GB 無料枠あるので今すぐ困らないが、ユーザー数が増えると地味に肥大化する。

### Worker 拡張 (`worker/src/index.js`)

`POST /delete/photo` エンドポイントを追加:

- Request: `{ object_key: "memos/<uid>/<memo_id>/<photo_id>.webp" }` + `Authorization: Bearer <jwt>`
- Worker 内で:
  1. JWT verify → uid 取得
  2. `object_key` を正規表現 `^(memos|trips)\/([^/]+)\/([^/]+)\/([^/]+)$` で validate
  3. uid 部分が JWT の uid と一致するか確認 (他人のオブジェクト削除を防止)
  4. R2 に SigV4 署名付き DELETE 送信
  5. 404 は冪等性のため成功扱い (既に消えてた = 望む状態)

再 deploy 済 (Version `d8a57421`、64.23 KiB / gzip 15.40 KiB)。

### フロント (`js/18-photo-area.js`)

- `urlToObjectKey(url)`: `https://cdn.norireco.app/<key>` から `<key>` を抽出
- `deletePhotoByUrl(url)`: Worker `/delete/photo` を呼ぶ (ベストエフォート、失敗は console.warn のみ。アップロード処理は止めない)
- **`initialUrls` Set** を `createPhotoArea` 内に追加: モーダル開いた時点の existing URL を記憶
- `uploadAndGetPhotos` 冒頭で diff を計算:
  - `initialUrls` にあったが、現在の `items` (existing) から消えてる URL = **削除対象**
  - 並列実行 (`Promise.all`、delete は冪等)
  - ステータスバーに「🗑 旧写真を削除中 (N 枚)」表示

### 挙動シナリオ

| シナリオ | 削除対象 | アップロード対象 |
|---|---|---|
| 既存を ✕ で外して保存 | その 1 枚 | 0 枚 |
| 既存を ✕ + 新規追加して保存 | 外した 1 枚 | 追加した 1 枚 |
| 並び替えだけ | 0 枚 | 0 枚 (順序だけ DB に保存) |
| 全部削除して保存 | 全 existing | 0 枚 |

### 失敗時の挙動

- Worker `/delete/photo` が 4xx/5xx を返しても、フロントは **保存処理を続行**
  (ユーザー視点で「写真は外したいけど、外せてない」という不便を避ける。R2 ゴミは将来 cleanup ジョブで掃除可)
- console.warn でログを残すので、開発者は気付ける

### 残課題

- memo/trip 全削除時の R2 オブジェクト掃除 (現状は memo/trip row 削除のみで R2 はそのまま)。別タスクで実装

## 110. v261 — 写真の並び替え UI (← → ボタン方式) (2026-05-22)

### 背景

v258 で複数枚 (最大 5 枚) 化したことで、追加順以外の並びにしたい場面が出る (例: メインの写真を 1 枚目に持ってきたい、トップ画として OGP に使いたい等)。

### 設計判断

**← → ボタン方式**を採用 (ドラッグ&ドロップ / 長押しソート は不採用)。

| 方式 | 採否 | 理由 |
|---|---|---|
| ← → ボタン | ✅ | 最大 5 枚なら十分。PC / モバイル 同じ挙動 = テスト 1 回。実装小 |
| HTML5 native drag-and-drop | ❌ | モバイルで動かない (pointer events 必要) |
| 長押しソート (Sortable.js 系) | ❌ | ライブラリ追加 (~30KB) or 自前実装で重い。ES Module 構成と相性悪 |

### 実装

`js/18-photo-area.js`:
- `render()` でサムネ HTML に `.pa-move-row` (下端) を追加。`‹` (左) / `›` (右) ボタン、最左/最右は `disabled` で半透明
- 1 枚しかないときは row 自体を出さない (`items.length > 1` 条件)
- `moveItem(idx, direction)` 関数 (direction: -1=前 / +1=後) で `items` 配列を swap → render
- gridEl click delegate に `.pa-move` の handler を追加 (data-action="left|right" + data-idx で分岐)

`noritetsu-map.html`:
- `.pa-badge` (NEW バッジ) を `bottom:3px` → `top:3px` に変更 (下端の move-row と干渉しないように。NEW は左上、✕ は右上、‹ › は下端の左右、で 4 隅クリーン)
- `.pa-move-row` / `.pa-move` (22×22px 円形、半透明黒、hover で gold) CSS 追加

### 挙動

- items 配列の順序がそのまま `photos[]` の順序になる (uploadAndGetPhotos が items を順番にループ → 既存実装で自動追従)
- existing (R2 既存) と new (アップロード待ち) が混在しててもそのまま並び替え可
- 並び替えは即時 (sync)、保存ボタン押下で確定 (uploadAndGetPhotos が新順序で photos[] 返す)

### 影響範囲

memo / 旅程編集 / 記録モード確認の **3 箇所**で同時改善 (共通 PhotoArea を使ってる成果)。

## 109. v260 — 写真アップロードの進捗バー (2026-05-22)

### 背景

v258 で複数枚 (最大 5 枚) 化したことで、特にモバイル回線で 3-5 枚アップロード時に「いま何枚目」「あと何枚」が体感で分かりづらかった。テキストだけ (`アップロード中 (2/5)…`) では視覚的に進んでる感が薄い。

### 変更

`js/18-photo-area.js` の PhotoArea コンポーネントに**進捗バー**を追加 (`.pa-progress` / `.pa-progress-fill`、ゴールド色のフィルが滑らかに右へ伸びる):

- **DOM**: `.pa-status` を `<div>` から `<div class="pa-status-text">` + `<div class="pa-progress">` の縦並びに変更
- **API 追加**: `setProgress(percent)` / `hideProgress(delayMs)` (module 内 private)
- **圧縮フェーズ** (file 選択時): `🗜 圧縮中 N/M` + バー (枚数ベース)、完了後 0.8 秒で消える
- **アップロードフェーズ** (uploadAndGetPhotos): `☁️ アップロード中 N/M` + バー、完了表示 `✅ アップロード完了 (N 枚)` を 1.2 秒残す
- **失敗時**: バーをそのまま残して `❌ アップロード失敗 (X/Y 完了)` を表示 (どこまで進んだか確認できるように)

### CSS (`noritetsu-map.html`)

```css
.pa-status{display:flex;flex-direction:column;gap:4px;...}
.pa-progress{height:5px;border-radius:3px;background:var(--track);overflow:hidden;}
.pa-progress-fill{height:100%;background:var(--gold);width:0%;transition:width 0.25s ease;}
```

5px の細いバー (圧迫感を避ける) + 既存の `--gold` 色 (UI 全体の差別化アクセント) + 0.25s easing で滑らかに動く。

### 影響範囲

memo モーダル / 旅程編集モーダル / 記録モード確認モーダル の **3 箇所すべて**で進捗バーが共通動作。共通 PhotoArea を使ってる成果。

### 残課題 (まだやってない)

- ファイル単位の % 進捗 (XHR.upload.onprogress): 大きい単一ファイル時にバーが「枚数粒度」でしか動かない問題。将来 fetch → XHR に書き換え or `ReadableStream` 経由で実装可能だが、現状の写真 (圧縮後 < 5MB) なら 1 枚 0.5〜2 秒で完了するので体感影響小

## 108. v259 — `.btn-gen` の CSS 定義漏れを修正 (2026-05-22)

### 背景

v258 リリース後、ユスケさんから「保存ボタンがちいさいね」とのフィードバック。原因は `.btn-gen` クラスを 4 箇所のボタン (記録モード確認 / 旅程編集 / 復元 / 終了駅選択) で使っているが CSS 定義が無く、ブラウザのデフォルトスタイル (内容幅のみ) になっていたため。

実は v258 以前から存在していた潜在 bug だが、旅程編集モーダルに `📷 写真` セクションを追加してモーダル全体が縦長になったことで、small な保存ボタンの違和感が顕在化した格好。

### 修正

`.btn-save` (memo モーダル用) と同じスタイルを `.btn-gen` にも適用:
- `width:100%` (フルワイド)
- `padding:13px` / `border-radius:12px`
- `background:#48d597` (緑) / `color:var(--navy)`
- `font-size:15px` / `font-weight:700`

`.btn-gen:disabled` / `.btn-gen:hover` も `.btn-save` と同等に。

### 影響範囲

`.btn-gen` を使う 4 箇所が同時に視認性向上:
- 記録モード確認モーダル `💾 手動記録で保存する` / `💾 GPS 記録で保存する`
- 旅程編集モーダル `💾 保存する`
- 復元モーダルの実行ボタン
- 終了駅選択モーダル `✅ この駅で終了して確認へ`

## 107. v258 — 旅程の写真添付 + memo の複数枚化 + 共通 PhotoArea モジュール (2026-05-22)

### 背景

v256 で memo 写真の R2 アップロードが動いた直後、ユスケさんからの「旅程でも同じように写真登録できるようにしたい」フィードバック。布石 #2 「画像ストレージ: Cloudflare R2 + Workers API ゲートウェイ」の本来の use case は「旅程の写真添付 + OGP 生成」なので、想定通りの展開。memo の写真 UI を素朴に複製するのではなく、共通モジュールに切り出して両方で使う方針を採用。副次的に memo も「1 枚のみ → 5 枚まで」に拡張される。

### 設計判断

| 軸 | 採用 | 理由 |
|---|---|---|
| 共通化 vs 重複コード | **共通モジュール `js/18-photo-area.js`** | 圧縮 / アップロード / 複数枚 UI を 1 箇所に集約。memo / trip 両方で `createPhotoArea({ kind: 'memo' | 'trip', ... })` 形式で再利用。将来 OGP シェアや station photos でも転用可能 |
| Worker エンドポイント | **`/upload/memo-photo` + `/upload/trip-photo` の 2 本** | 内部実装は `handlePhotoUpload(kind, ...)` で共通化、`PHOTO_KINDS` map で kind→keyPrefix/idRegex/bodyIdField を分岐。エンドポイントを分けることで CORS や rate limit の細かい制御を後付け可能 |
| 1 旅程あたりの枚数 | **最大 5 枚** | 車窓・駅・乗換と複数場面を保存できる。memo も同じく 5 枚 (副次的) |
| R2 オブジェクトキー | `trips/<uid>/<trip_id>/<photo_uuid>.<ext>` | memo と同じく uid 最上位 prefix で破壊範囲限定、trip_id で grouping |

### Worker 拡張 (`worker/src/index.js`)

- `PHOTO_KINDS` map を追加 (memo / trip それぞれの `keyPrefix` / `bodyIdField` / `idRegex`)
- `handleMemoPhotoUpload` を `handlePhotoUpload(kind, ...)` にリネーム + 一般化
- ルーターに `/upload/trip-photo` を追加 (handler 共通)
- trip_id の regex は `^trip_[0-9a-zA-Z_]{8,40}$` (既存コードでは `trip_${Date.now()}` で 13 桁の UNIX time ms、将来 suffix 拡張に備えて緩めに)
- 再 deploy: `Uploaded norireco-api (2.89 sec)` (62.67 KiB / gzip 15.17 KiB)

### Supabase migration (`supabase/migrations/v258_trip_photos.sql`)

```sql
ALTER TABLE norireco_trips
  ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;
NOTIFY pgrst, 'reload schema';
```

ユーザーが Supabase Dashboard → SQL Editor で実行する必要あり。既存 trip 約 150 件は `photos=[]` で migrate される。

### 共通 PhotoArea モジュール (`js/18-photo-area.js` 新規 244 行)

公開 API:
```js
const area = createPhotoArea({
  container,       // HTMLElement (本 module が中身を描画)
  kind,            // 'memo' | 'trip'
  getOwnerId,      // () => string | null
  initialPhotos,   // [{url, w, h, bytes, content_type}]
  maxCount,        // default: 5
});
await area.uploadAndGetPhotos(ownerIdOverride)  // 新規 blob を順次アップロード
area.destroy()                                  // blob URL revoke + DOM 撤去
```

内部 items 配列で `{ kind: 'existing', url, ... }` (既存 R2 URL) と `{ kind: 'new', blob, w, h, previewUrl }` (アップロード待ちの Blob) を統一管理。圧縮 (Canvas → WebP 0.82 / 長辺 1200px) / プレビュー (blob:URL) / ✕ 削除 / + 追加 / 圧縮ステータス表示まで自己完結。

### Frontend 統合

3 箇所で `createPhotoArea` を使用:

1. **memo モーダル** (`js/16-memos.js`): 既存の手作り file input + 1 枚プレビュー UI を全部削除、`createPhotoArea({ kind: 'memo' })` に置き換え。**副次的に memo も最大 5 枚化**。memoCardHtml も複数枚サムネ並列表示に。
2. **旅程編集モーダル** (`js/13b-trips.js`): `📝 自由メモ` の下に `📷 写真` セクションを追加。`openTripEditModal` で area 生成、`saveTripEdit` で `tripPatch.photos = await area.uploadAndGetPhotos(tripId)` を Supabase PATCH に含める。
3. **記録モード確認モーダル** (`js/07-record-mode.js`): `rec-confirm-modal` の `📝 メモ` 行の下に `📷 写真` セクションを追加。`openRecConfirm` で area 生成 (毎回リセット、notes/delay と同じ挙動)、`saveMultiSegmentTrip` で trip_id 確定後にアップロード → `trip.photos = uploaded`。失敗時は alert + 保存全体をキャンセル。

### 旅程カードのサムネ表示 (`js/13-mypage-common.js:tripCardHtml`)

`📝 notes` の下に `📷 photos` 横並びサムネ (64×64 / object-fit:cover / lazy load / 角丸 / hover gold ボーダー / クリックで原寸別タブ)。memo カードと同じ視覚スタイル (memo は 80px、trip は少し小さめ 64px)。

### 失敗時の挙動

- **Worker presign 失敗** (network / 401 / 400): area が例外を throw、呼び出し側で alert + 保存中断
- **R2 PUT 失敗**: 同上
- **memo 保存中に 1 枚目アップロード OK・2 枚目失敗**: 1 枚目は R2 に残るが、memo POST が走らないので DB から見ると到達不能。R2 はゴミとして残る (将来の cleanup ジョブ)
- **trip 保存中に同様**: 同上、trip POST が走らない

### 残課題 (次回以降)

- 写真差し替え時の旧 R2 オブジェクト delete API (現状はゴミが残る、将来の定期 cleanup or `/delete/photo` エンドポイント)
- 写真の並び替え UI (現状は追加順固定)
- OGP シェア画像の R2 永続化 + `/share/<id>` 受け側ページ (布石 #2 のもう一つの大きな use case)
- 既存 Supabase SDK 直叩きコードの段階的 Worker 経由化 (布石 #4 の残り)

### コミット範囲

- `worker/src/index.js` (PHOTO_KINDS 共通化 + /upload/trip-photo 追加)
- `js/18-photo-area.js` 新規
- `js/16-memos.js` (PhotoArea に切替、複数枚化)
- `js/13b-trips.js` (旅程編集モーダルに photo セクション追加)
- `js/07-record-mode.js` (記録モード保存時に photo 添付)
- `js/13-mypage-common.js` (tripCardHtml に photo サムネ追加)
- `scripts/syntax-check.js` (FILES に 18-photo-area を追加)
- `noritetsu-map.html` (m-photo-* CSS を削除、.pa-* / .mp-tcard-photos / 各モーダルの photo container 追加)
- `sw.js` (CACHE_VERSION v257 → v258、STATIC_ASSETS に 18-photo-area)
- `supabase/migrations/v258_trip_photos.sql` 新規

## 106. v257 — マイページ memo カードに写真サムネイル表示 (2026-05-22)

### 背景

v256 で memo 写真の R2 アップロードが動いた直後、マイページの memo カードは「📷 写真を見る」テキストリンクのままで、写真が表示されていなかった (元コードは Supabase POST すらしてなかった v90 時代の名残)。ユスケさんからの直接フィードバック「重くならない?」に「lazy loading + 80px 縮小表示なら大丈夫」と回答してそのまま実装。

### 変更

- **`js/16-memos.js:memoCardHtml`**: テキストリンクを `<img class="mp-memo-thumb" loading="lazy">` に置換 (`<a>` で wrap して写真クリックで原寸表示は維持)
- **`noritetsu-map.html`**: `.mp-memo-photo` の色付きテキスト style を削除、`.mp-memo-thumb` (80×80px / object-fit: cover / 角丸 8px / 黒背景) を追加、hover で gold ボーダーに

### パフォーマンス試算

- 圧縮済 WebP は数十〜数百 KB/枚 (v256 で長辺 1200px / quality 0.82)
- `loading="lazy"` で画面外は読み込まれない (スクロール時に順次)
- `cdn.norireco.app` は Cloudflare CDN edge cache 効くので 2 回目以降は即時
- 100 件のメモがあっても、初期表示は画面に見えてる数件 (5-10 枚) だけ ≒ 1-2MB

### 残課題

- 複数枚対応 (現状 `photos[0]` のみ、UI が 1 枚前提)
- 駅メモ一覧モーダル (v251) 内のカードも同 `memoCardHtml` を使ってるので自動的に同改善が効くはず

## 105. v256 — R2/Workers 経由のメモ写真アップロード (布石 #2/#4 着手) (2026-05-22)

### 背景

v250 で `norireco_memos.photos jsonb` 列を追加した時点で「写真URL を直接 input で受ける」仮 UI のままだった (CHANGELOG §83 末尾、`m-photo` の `fl-hint` に「※ R2 アップロード対応は v251 以降」と書いてあった箇所)。TODO 布石 #2 (R2 + Workers API ゲートウェイ) と #4 (API を Workers 経由に統一) の発動条件が「画像機能の実装着手時」なので、ここで両方を一気に立ち上げる。

### 設計判断

| 軸 | 採用 | 理由 |
|---|---|---|
| 配信方式 | **presigned URL 方式** | アップロードのみ Worker 経由、配信は `cdn.norireco.app` の public R2 から直接 `<img src>` で読む。Worker リクエスト数を最小化 (R2 egress は無料なので Worker proxy にしてもコストは同じだが、レイテンシが減る) |
| JWT verify | **JWKS 経由の ES256 verify** | Supabase が JWT 署名を Legacy HS256 → ECC P-256 (ES256) に移行済 (current key = ECC、previous = HS256 / 15 日前 rotate)。新トークンは ES256 で署名されるので HS256 + 共有シークレットでは verify できない。JWKS 経由なら Worker 側に **シークレット共有不要** + 鍵 rotation にも自動追従 + 布石 #5 (認証ベンダーロックイン回避) とも整合 |
| R2 オブジェクトキー | `memos/<uid>/<memo_id>/<photo_uuid>.<ext>` | uid を最上位 prefix で破壊範囲を限定、memo_id で grouping (将来 1 メモ複数写真対応)、photo_uuid で衝突回避 |
| 画像圧縮 | クライアント側 Canvas で WebP / 長辺 1200px / quality 0.82 | Worker 側で sharp 等の画像処理ライブラリを動かすと CPU 制限に当たる。クライアント側なら無料 |
| 上限 | 元 20MB / 圧縮後 5MB (Worker 側で reject) | 通常のスマホ写真 (5〜10MB) を圧縮で 100〜400KB 程度に落とせる想定 |

### Cloudflare 側の構築 (2026-05-22)

- **R2 サブスク有効化**: 無料枠 10GB 保存 / 100万 PUT / 1000万 GET / **egress 完全無料**
- **R2 バケット**: `norireco-photos` (Asia-Pacific, Standard)
- **Custom Domain**: `cdn.norireco.app` を bind (TLS 1.2、Cloudflare DNS 配下なので CNAME 自動追加)
- **CORS Policy**: `norireco.app` / `yutsutke.github.io` / `localhost:3000-8080` / `127.0.0.1:5500` を allow、GET/PUT/HEAD、`Content-Type`/`Content-Length` ヘッダー、`ETag` expose
- **R2 API Token**: `norireco-worker` (Account API Token、Object Read & Write、`norireco-photos` バケット限定、Forever TTL)
  - これは production-tied (Account 紐付け) なので User Token (organization 離脱で失効) より安全
- **R2 Account ID**: `3684c46b0cdbd984e1057e86a52e6287` (S3 endpoint に含まれる、公開情報)

### Worker 実装

`worker/` を repo に追加 (5 ファイル):

```
worker/
├── package.json       deps: jose ^5.9.6, aws4fetch ^1.0.20, wrangler ^4.93.1
├── wrangler.toml      [vars] 公開設定 + [[routes]] api.norireco.app custom_domain
├── .gitignore         node_modules / .dev.vars / .wrangler
├── README.md          デプロイ手順
└── src/
    └── index.js       3 エンドポイント (62 KiB / gzip 14.86 KiB)
```

エンドポイント:

| Method | Path                  | 認証 | 用途                                  |
|--------|-----------------------|------|---------------------------------------|
| GET    | `/health`             | 不要 | 疎通確認                              |
| GET    | `/me`                 | 必要 | JWT verify テスト (uid/email 返却)    |
| POST   | `/upload/memo-photo`  | 必要 | 駅メモ写真の presigned PUT URL 発行    |

`/upload/memo-photo` のフロー:
1. `Authorization: Bearer <token>` から JWT 取得
2. `jose.jwtVerify(token, JWKS, { issuer: SUPABASE_URL/auth/v1, audience: 'authenticated' })`
3. `payload.sub` を uid として取得
4. body validate (`memo_id` 形式 / `ext` whitelist / `size_bytes` 上限)
5. `aws4fetch.AwsClient.sign(s3Url, { method: 'PUT', aws: { signQuery: true } })` で SigV4 presigned URL を生成 (有効期限 5 分)
6. `{ upload_url, public_url, object_key, expires_at }` を返す

### Secrets 管理

`wrangler secret put` で Cloudflare 側に直接暗号化保存 (ローカルにも git にも残らない):
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

`wrangler.toml` の `[vars]` には公開情報のみ (SUPABASE_URL / R2_ACCOUNT_ID / R2_BUCKET_NAME / CDN_BASE_URL / ALLOWED_ORIGINS)。

### デプロイの躓きポイント

1. **PowerShell の Execution Policy で `npm install` が走らない**: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` で恒久対応
2. **wrangler 3.114 (古い) で OAuth ログインが libuv assertion failure**: `npm install --save-dev wrangler@4` (現行 4.93.1) で解決
3. **`[[routes]] pattern = "api.norireco.app/*"` でデプロイエラー (`Wildcard operators (*) are not allowed in Custom Domains`)**: Custom Domain はドメイン全体を Worker に bind する仕組みなので path/wildcard 不要、`pattern = "api.norireco.app"` のみで OK

### フロント実装 (`js/16-memos.js` + `noritetsu-map.html`)

`m-photo` URL input を file input + プレビュー + Worker 経由 upload に置換:

**16-memos.js**:
- `NORIRECO_API_BASE = 'https://api.norireco.app'` constant
- `compressImageToWebP(file)`: Canvas + `createImageBitmap` で長辺 1200px / WebP 0.82
- `uploadPhotoForMemo(memoId, blob, meta)`: Worker から presigned URL 取得 → R2 へ PUT → `{url, w, h, bytes, content_type}` を返す
- `M.photo` state: `{ state: 'none' | 'existing' | 'new', blob, meta, previewUrl, existingPhotos }`
- `onPhotoFileSelected(file)`: type/size validate → 圧縮 → `blob:` URL でプレビュー
- `clearPhotoInModal()`: `URL.revokeObjectURL` してから state リセット
- `ensurePhotoInputWired()`: 初回 open 時に file input の change ハンドラを 1 度だけ wire
- `fillModal()` / `readModal()` / `saveMemoFromModal()` / `closeMemo()` を上記 state に合わせて書き換え
- 既存 memo の photo は `state: 'existing'` で表示 (URL から直接 `<img src>`)、新規ファイル選択時は `state: 'new'` に遷移して保存時にアップロード

**noritetsu-map.html**:
- `<input type="url" id="m-photo">` を `<input type="file" id="m-photo-file">` + `📷 写真を選ぶ` ボタン + プレビュー img + `✕ 削除` ボタンに置換
- CSS 追加: `.m-photo-area / .m-photo-btn / .m-photo-preview / .m-photo-remove / .m-photo-status` (既存 modal の `--gold / --silver / --track / --track2` CSS 変数を踏襲、最大高 280px・object-fit:contain で写真の縦横比を保持)

### 動作確認

- `npx wrangler deploy` 成功: `Uploaded norireco-api (2.67 sec) / Deployed norireco-api triggers / api.norireco.app (custom domain)`
- `curl https://api.norireco.app/health` → 200 OK `{"ok":true,"service":"norireco-api","ts":...}` + CORS ヘッダー全部出力
- `Invoke-RestMethod /me with Bearer <Supabase JWT>` → uid (`ece72ecb-...`) + email + role: `authenticated` + exp が返る = JWKS 経由 ES256 verify が動作確認

### 残課題 (次セッション以降)

- 実機 (PC + iPhone PWA) でメモ写真の選択 → 圧縮 → アップロード → 保存 → マイページ・駅メモ一覧モーダルでの表示の通しテスト
- 複数枚対応 (現状は `photos[0]` のみ、配列なので 1 メモ 5 枚程度まで拡張可能)
- 写真の差し替え時に旧 R2 オブジェクトを delete する API (現状はゴミが残る)
- マイページの memo カードのサムネイル化 (現状はリンクのみ)
- OGP シェア機能の R2 永続化 + `/share/<id>` ページ (布石 #2 のもう一つの use case)

### コミット範囲

- `worker/` 新規 (5 ファイル)
- `js/16-memos.js` (写真アップロード 4 関数追加、既存 4 関数書き換え、`NORIRECO_API_BASE` constant 追加)
- `noritetsu-map.html` (memo-modal の photo input セクション全置換 + CSS 9 行追加)
- `sw.js` (CACHE_VERSION v255 → v256)

## 104. v255 — キャラモーダル内のキャラ切り替えが「閉じるだけ」だったのを修正 (2026-05-22)

### 背景

ユスケさん報告: 「キャラ詳細モーダルでキャラのサムネイルを押しても切り替えられない」

### 原因

`js/04-gps-location.js:pickStationCharacter` が以下の動作だった:

```js
function pickStationCharacter(stationName, charId) {
  setStationCharacterChoice(stationName, charId);
  closeCharModal();  // ← モーダルを閉じてしまう
  redrawAllLinesAfterTripChange();
}
```

サムネイルクリック → `setStationCharacterChoice` で localStorage に保存 → **`closeCharModal()` でモーダルが閉じる** → 地図再描画。

ユーザー視点だと「サムネイルを押すとモーダルが閉じるだけで、何が起きたのか分からない」 → 「切り替えられない」と感じる。

### 変更内容

`pickStationCharacter` を「モーダルを閉じず、新しいキャラで再 render する」に変更:

```js
function pickStationCharacter(stationName, charId) {
  setStationCharacterChoice(stationName, charId);
  redrawAllLinesAfterTripChange();
  const ms = (NORIRECO.data.MERGED_STATIONS || []).find(s => s.name === stationName);
  const character = (NORIRECO.data.stationCharMap?.get(stationName) || [])
    .find(c => c.meta?.id === charId);
  if (ms && character) {
    openCharModal(ms, character);
  }
}
```

これで:
1. localStorage に新しい choice 保存
2. 地図再描画 (背景の駅マーカーキャラアイコンも切り替わる)
3. モーダル内のヒーロー画像 / 名前 / アクティブ枠が新しいキャラで再描画 ← UX 改善

サムネイルを次々タップして比較できる体験になる。

### バージョン番号

v255 (Phase 3.8 後半 §104)

---

## 103. v254 — v253 駅アクションシートの 2 つのバグ修正 (2026-05-22)

### 背景

v253 push 後ユスケさん報告:
1. **「🎭 アール・プレーン 2.0 を見る」ボタンを押しても無反応**
2. **「駅のキャラ表示が OFF でもキャラの詳細を選べないと混乱する」** (= キャラモード OFF 時に「🎭 を見る」ボタンが出ない)

### 原因

#### バグ 1: `window.openCharModal` が存在しない

`js/08-rendering.js:856` の `openCharModal` は v225 stage 3 で `export function` に移行済で、window bridge が無い。`js/17-station-actions.js:onSaShowCharacter` で `typeof window.openCharModal === 'function'` の判定が常に false → silent fail (アラートも出ないので押しても何も起きないように見えた)。

#### バグ 2: キャラ判定が `charModeOn` を要求

`getStationCharacter()` / `getObtainableCharactersAt()` は `if (!NORIRECO.data.charModeOn) return null;` で早期 return する。v253 の判定はこの 2 関数だけに依存していたため、キャラモード OFF 時に駅にキャラがあっても `charForSheet = null` で「🎭」ボタンが出なかった。

### 変更内容

#### 1. 17 から `openCharModal` を直接 import

```js
import { openCharModal } from './08-rendering.js';
import { isCharacterOwned } from './03-characters.js';
```

`onSaShowCharacter` で `window.openCharModal` 経由ではなく `openCharModal(ms, ch)` を直接呼ぶ。08 → (window) → 17 → (import) → 08 は循環ではなく一方向 import なので OK。

#### 2. キャラ判定を `stationCharMap` ベースに変更

17 内に `pickCharacterForStation(stationName)` を新設。`NORIRECO.data.stationCharMap.get(stationName)` から駅に紐付くキャラ全件を取得 (charModeOn 関係なし) し、優先順位:
1. 獲得済み (`isCharacterOwned(c.meta.id)`)
2. 未獲得 (`locked = true` でモーダル表示、シーズン内/外問わず)

これでキャラモード OFF + シーズン外でも「🎭 ◯◯ を見る (未獲得)」ボタンが出るようになり、駅にキャラがあることをお客さんが発見できる。

#### 3. 08 側の判定を簡素化

`attachStationDotClickV2` 通常モード分岐から `getStationCharacter` / `getObtainableCharactersAt` の呼出を撤去 → `NORIRECO.stationActions.open(ms)` を ms だけ渡して呼ぶ (options 不要)。フォールバックの旧挙動 (17 未ロード時) はそのまま残置。

#### 4. CACHE_VERSION v253 → v254

### バージョン番号

v254 (Phase 3.8 後半 §103)

---

## 102. v253 — 駅タップで「アクションシート」(手動記録 / メモ / 色変更 / キャラ) (2026-05-22)

### 背景

v251 で駅タップ → 駅メモ一覧、v252 で駅 hover に「📸 メモ N 件」を実装した流れで、ユスケさん要望: 「マップ、駅をタップ、手動記録/メモ/色の変更と選択肢が出るようにしたい」

これは TODO「🟡 駅 UI の情報ハブ化 (4領域パネル)」の自分の記録・個人メモ・公的情報・周辺情報 の 4 領域パネル本格版への足がかり。まず「自分の記録」(=手動記録の起点) と「個人メモ」と既存の「🎨 色変更」を統一されたシート UI で駅から呼べるようにする。

### 設計

**通常モード**で駅マーカータップ → 「駅アクションシート」(`#station-action-modal`) を開く:
- 見出し: `🚉 駅名` + 乗り入れ系統名
- アクションボタン (動的に出し分け):
  - 🎭 **〇〇 を見る** — キャラ獲得済 or 未獲得 locked があれば (locked は「(未獲得)」サフィックス)
  - 📝 **ここから手動記録を始める** — 常時
  - 📸 **メモ (N件)** or **メモを残す** — N>0 なら青バッジ
  - 🎨 **系統色を変更** — 乗り入れ系統あり時のみ (複数なら「(N系統)」)
  - 閉じる

「🎨 系統色変更」で乗り入れ系統が複数なら、シート内が **系統選択リスト** に差し替わる (色スウォッチ付き)。「← 戻る」でアクション一覧に戻る。

**記録モード ON 中・メモモード ON 中** はアクションシートを開かない (= 経路選択 / メモ新規作成の操作を妨げない)。

### 変更内容

#### 1. `js/17-station-actions.js` (新規, ~190 行)

- `NORIRECO.stationActions` 名前空間: `state` (currentMs / currentChar / colorPickLines) + `open(ms, opts)`
- `openStationActionSheet(ms, {character, characterLocked})` — エントリポイント (08 から呼出)
- `renderActionList({ms, lines, memoCount})` — メイン画面のボタン群を組み立て
- `renderColorLineSelector(lines)` — 色変更の系統選択画面
- 各アクション handler: `onSaShowCharacter` / `onSaStartRecording` / `onSaOpenMemos` / `onSaChangeColor` / `onSaPickColorLine` / `onSaBackToMain`
- 既存 API を window 経由 (`NORIRECO.memos.openStationMemoList` / `NORIRECO.colorOverrides.openEditor` / `window.openCharModal`) で呼出。記録モード周り (`toggleRecordMode` / `onRecordStationClick`) のみ import (07-record-mode.js)
- 「📝 手動記録」: `toggleRecordMode()` で ON → 50ms 遅延 (記録モード DOM 更新待ち) → `onRecordStationClick(ms)` で 1 駅目に追加

#### 2. `js/08-rendering.js:attachStationDotClickV2` 通常モード分岐を全置換

- 旧: キャラあり → キャラモーダル直行 / 未獲得 → キャラモーダル / キャラなし & メモあり → 駅メモ一覧 (v251)
- 新: キャラ取得済 or 未獲得 locked obtainable[0] を判定して `openStationActionSheet(ms, {character, characterLocked})` 1 行に集約
- フォールバック: `NORIRECO.stationActions.open` が未ロードの極端ケースだけ旧キャラモーダル直行を残す (実質発生しない安全網)

#### 3. `noritetsu-map.html`

- `#station-action-modal` 新設 (`.memo-modal` / `.memo-sheet` を流用)
- CSS: `.sa-actions` / `.sa-section-label` / `.sa-btn` / `.sa-btn-ic` / `.sa-btn-tx` / `.sa-btn-arrow` / `.sa-btn-badge` / `.sa-btn-back` / `.sa-line-swatch`
- `<script type="module" src="js/17-station-actions.js">` を追加 (16 と 09 の間)

#### 4. SW + syntax-check

- `sw.js`: CACHE_VERSION v252 → v253 + STATIC_ASSETS に `./js/17-station-actions.js`
- `scripts/syntax-check.js`: FILES に `'17-station-actions'` 追加 (23/23 OK、escapeHtml 重複は module 化後の無害警告)

### 既存挙動への影響

- **キャラ駅**: タップ → 従来の「キャラモーダル直行」が、アクションシート経由「🎭 ◯◯ を見る」ボタンになる (= 1 hop 増えるが手動記録/メモ/色変更にも到達可能)
- **未獲得キャラ駅**: 同上 (locked プレビューも「(未獲得)」サフィックス付きでシート経由)
- **キャラなし & メモあり**: v251 では駅メモ一覧モーダル直行だったが、アクションシート経由「📸 メモ (N件)」になる
- **キャラなし & メモなし & 系統あり**: v251 まで何も起きなかったが、v253 ではアクションシートで「📝 手動記録」「🎨 色変更」が呼べる ← 新規体験

### バージョン番号

v253 (Phase 3.8 後半 §102)

---

## 101. v252 — 駅 hover ツールチップに「📸 メモ N 件」を追加 (2026-05-22)

### 背景

v251 で駅タップ → 駅メモ一覧モーダルを実装したが、「どの駅にメモがあるか」が地図上で見えない。ユスケさん要望: 「地図 hover で、メモ１件などできる？」

### 変更内容

`js/08-rendering.js:drawStationsLayer` 内の駅マーカー (ドット / パイチャート extraDot 両方) の `bindTooltip` 部分を改修。既存の tooltip (駅名 / 乗車 ✓ / 訪問回数 / キャラ / 乗り入れ系統) の末尾に、自分のメモがある駅では「📸 メモ N 件」(青) を追加。

```js
const buildMemoTag = () => {
  const cache = window.NORIRECO?.memos?.state?.cache || [];
  let count = 0;
  for (let i = 0; i < cache.length; i++) if (cache[i].station === ms.name) count++;
  return count > 0
    ? `<br><span style="color:#5fb5ff;font-size:10px;font-weight:700">📸 メモ ${count} 件</span>`
    : '';
};
const buildFullTooltip = () => `${tooltipBase}${buildMemoTag()}${linesText}`;
dot.bindTooltip(buildFullTooltip(), {...});
dot.on('tooltipopen', () => { dot.getTooltip()?.setContent(buildFullTooltip()); });
```

`tooltipopen` ハンドラで毎回 NORIRECO.memos キャッシュから件数を再計算 → 新規メモ作成/削除直後でも次の hover で件数が反映される (地図全体再描画なしで即時更新)。

PC ユーザーの hover 操作のみが対象 (モバイルでは hover が無いため見えないが、駅タップ → 駅メモ一覧モーダル v251 で代替済)。

### 注意点

- 同名駅は文字列完全一致なので両駅のメモがマージカウントされる (v251 と同じ既知制約)。
- パイチャート用の `extraDot` も同じ tooltip 更新ロジックを bind 済み。

### バージョン番号

v252 (Phase 3.8 後半 §101)

---

## 100. v251 — 駅タップで駅メモ一覧モーダルを表示 (2026-05-22)

### 背景

v250 で駅メモ機能本格化完了 (動作確認 OK)。ユスケさん要望: 「マップの駅をタップしたら、その駅のメモを見れるようにしてください」。

これは TODO「🟡 駅 UI の情報ハブ化（4領域パネル）」の **個人メモ部分の MVP**。完全な 4 領域パネル (自分の記録/公的情報/周辺情報/個人メモ) は将来として、まず「📸 個人メモ」だけ駅 UI から見られる導線を追加する。

### 設計

- **通常モード**で駅マーカータップ:
  - キャラ駅 → 従来通りキャラモーダル (既存挙動を保つ。優先度高)
  - キャラなし & 自分のメモあり → **「📸 〇〇駅のメモ (N 件)」モーダル**
  - キャラなし & メモなし → 何もしない (従来通り)
- **memoMode (📸 FAB on)** は従来通り直接新規作成モード
- 駅メモ一覧モーダルから:
  - 各メモを「✏️ 編集」「🗑 削除」(マイページタブと同じ memoCardHtml を再利用)
  - 「+ 新しいメモを残す」で memo-modal を新規作成モードで起動 (NORIRECO.map.clickInfo を組み立て直して `openMemo()`)

### 変更内容

#### 1. `js/16-memos.js` (追記)

- `M.stationContext` を state に追加 ({ station, lineId, lineName, lat, lon } | null)
- `openStationMemoList(args)`: `args.station === m.station` でフィルタした memo[] を一覧として `#station-memo-modal` に描画
- `closeStationMemoModal()`: モーダルを閉じて stationContext を null に
- `addNewMemoForStation()`: stationContext から NORIRECO.map.clickInfo を組み立てて閉じる → `openMemo()` で新規モーダル起動
- `rerenderStationMemoListIfVisible()`: 編集/削除後の再描画 (rerenderMemosIfVisible から呼ぶ)
- `NORIRECO.memos.openStationMemoList` / `hasMemosForStation(name)` を公開 (08-rendering から呼ぶため)
- window bridge: `closeStationMemoModal` / `addNewMemoForStation`

#### 2. `js/08-rendering.js` `attachStationDotClickV2` 通常モード分岐に追加

キャラ駅 (`getStationCharacter` / `getObtainableCharactersAt`) が優先で、両方とも該当しないときに `NORIRECO.memos.hasMemosForStation(ms.name)` が true なら `openStationMemoList(...)` を呼ぶ。代表系統は ms.lines[0] から SERVICE_LINES.find で取得。

#### 3. `noritetsu-map.html`

`station-memo-modal` を memo-modal の直前に新設 (CSS は memo-modal と同じ `.memo-modal` / `.memo-sheet` を流用、追加 CSS なし)。

#### 4. `sw.js`

CACHE_VERSION v250 → v251 (16-memos.js の中身が変わったので STATIC_ASSETS の登録ファイル名は不変)

### 注意点

- station 名一致は文字列完全一致 (memo.station vs ms.name)。merged_stations.json の駅名と memo 保存時の `ci.station.n` が一致しているはず (v250 のメモはこの規約で保存)
- 同名駅 (「大原」が外房線・上毛電鉄等で複数存在) は現状区別なし。将来 lineId も合わせた絞り込みが必要なら拡張

### バージョン番号

v251 (Phase 3.8 後半 §100)

---

## 99. v250 — 駅メモ機能の本格化 (Supabase CRUD + マイページ「📸 メモ」タブ) (2026-05-22)

### 背景

地図画面の右下「📸」FAB → memo-modal の正体が、v90 頃に作られた `js/08-rendering.js:genMemo()` で「📸駅メモデータ\n{JSON}\nこのデータをNotionの「駅メモ」DBに保存してください。」というテキストを生成して textarea に貼り付け、ユーザーが長押しコピー → Claude に貼り付けて Notion DB に転写するという超レガシー運用だった。Supabase には POST すらしておらず、写真URLも手入力テキスト。

(`noritetsu-log.html` 側にだけ `norireco_memos` への POST 実装があったが、log ページは削除予定なので無関係。)

ユスケさんとの設計合意 (2026-05-22):
- 既存メモは捨てて OK → スキーマ刷新可能
- log ページは触らない (削除予定のため別タスク)
- マイページに「📸 メモ」を 4 タブ目として追加 (統計 / 旅程 / 路線 / メモ)
- 一覧 / 詳細 / 編集 / 削除 すべて実装
- 種別 / 気分 / タグ のチップ設計は現状を踏襲

### スキーマ刷新 (`supabase/migrations/v250_norireco_memos.sql`)

旧 `norireco_memos` テーブルを `DROP` し、以下で再作成:

```sql
CREATE TABLE norireco_memos (
  id          text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  line_id text, line_name text, station text,
  lat double precision, lon double precision,
  memo_type text NOT NULL DEFAULT '駅',     -- 駅/車内/路線/その他
  mood      text NOT NULL DEFAULT '良い',   -- 最高/良い/普通/微妙/最悪
  tags      jsonb NOT NULL DEFAULT '[]',
  comment   text NOT NULL DEFAULT '',
  photos    jsonb NOT NULL DEFAULT '[]'    -- v251+ R2 連携で {key,w,h,mime,created_at} 配列を入れる箱
);
```

主な変更点:
- `user_id NOT NULL` + RLS (`auth.uid() = user_id`) を必須化 (旧テーブルは anon key Bearer で実質匿名書き込み、🔥 TODO「Supabase RLS 強化」の `norireco_memos` 分も同時完了)
- `tags` を text `'、'` join から `jsonb` 配列に
- `photos jsonb` を新設 (v251+ で R2 連携の箱として先取り)
- `updated_at` 自動更新トリガー `norireco_memos_touch_updated_at()`
- index 3 種: `(user_id, created_at DESC)` / `(user_id, line_id)` / `(user_id, station)`

### 変更内容

#### 1. `js/16-memos.js` (新規, ~400 行)

`NORIRECO.memos` 名前空間に集約:
- state: `cache[]` / `editingId` / `filter`
- CRUD: `syncMemosFromSupabase()` / `createMemoOnServer()` / `updateMemoOnServer()` / `deleteMemoOnServer()` (全て `authBearerToken()` で RLS 通過)
- Modal: `openMemo()` (新規) / `openMemoForEdit(id)` (編集) / `saveMemoFromModal()` / `deleteMemoFromModal()` / `closeMemo()` / `selChip()` / `togTag()`
- マイページ: `renderMpMemosSection()` + フィルタバー (路線 / 種別 / 気分) + memo カード生成
- `clearLocalMemos()` (ログアウト時の purge 用)
- `toggleMemoMode()` (右下「📸」FAB の cursor crosshair 切替)

#### 2. `js/08-rendering.js` から memo 関連を撤去

- `toggleMemoMode` / `openMemo` / `closeMemo` / `selChip` / `togTag` を削除 → 16 へ移動
- `genMemo` (Claude 貼り付け用テキスト生成) を完全廃止
- L803 の station マーカー click から `openMemo()` を呼ぶ箇所は `import { openMemo } from './16-memos.js'` に変更
- 関連 window bridge 5 件 (`window.toggleMemoMode` 等) を削除 → 16 で改めて公開

#### 3. `js/06-map-leaflet.js` / `js/07-record-mode.js` の import 切替

- 06: `import { openMemo } from './16-memos.js'` (旧 08 から)
- 07: `import { toggleMemoMode } from './16-memos.js'` (旧 08 から、記録モードとの排他に使用)

#### 4. memo-modal HTML 改修 (`noritetsu-map.html`)

- `<button class="btn-gen" onclick="genMemo()">📋 データを生成 → Claudeに貼り付け</button>` → `<button class="btn-save" id="m-save-btn" onclick="saveMemoFromModal()">☁️ 保存</button>` に置換
- `<button class="btn-del" id="m-delete-btn" onclick="deleteMemoFromModal()" style="display:none">🗑 このメモを削除</button>` を追加 (編集モード時のみ表示)
- `<div class="out-area">` (Claude 貼り付け用 textarea) を完全削除
- 写真URL input は残し、ラベルに「※ R2 アップロード対応は v251 以降」のヒントを追加
- 関連 CSS: `.btn-gen` / `.out-area` / `.out-hint` / `.out-ta` を撤去、`.btn-save` / `.btn-del` / `.fl-hint` を追加

#### 5. マイページ「📸 メモ」サブタブ追加

- `js/13-mypage-common.js` の `renderMypage()` 内サブタブ nav に `📸 メモ` ボタン追加
- `applyMpSection()` に `showMemos = MP.mpActiveSection === 'memos'` 分岐追加 + `NORIRECO.mypage.renderMpMemosSection()` 呼出
- `noritetsu-map.html` の `pane-mypage` に `<div class="mp-subpane" id="mp-sub-memos"><div class="pane-inner" id="mp-memo-section"></div></div>` を追加
- メモカード CSS (`.mp-memo-list` / `.mp-memo-card` / `.mp-memo-head` / `.mp-memo-comment` / `.mp-memo-tag` / `.mp-memo-photo` / `.mp-memo-actions`) を追加 (既存の `.mp-act-btn.edit-memo` / `.mp-act-btn.delete` を流用)

#### 6. SIGNED_IN sync + SIGNED_OUT clear (`js/12-auth.js`)

- v247 colorOverrides 同期と同じパターン: `window.NORIRECO?.memos?.sync?.()` / `window.NORIRECO?.memos?.clear?.()` を window 経由 (循環 import 回避)
- SIGNED_IN 時に Supabase から自分のメモを fetch、SIGNED_OUT 時に in-memory + localStorage を purge

#### 7. SW + syntax-check 更新

- `sw.js`: `CACHE_VERSION = 'v250'` + `STATIC_ASSETS` に `./js/16-memos.js` を追加
- `scripts/syntax-check.js`: FILES 配列に `'16-memos'` を追加 (22/22 OK)

### 残課題 (次フェーズ)

- **写真添付の R2 アップロード対応** (B(b) = 駅メモに写真添付): `photos jsonb` の箱は確保済み。布石 #2 (R2 + Workers) と統合実装予定
- **駅 UI からの直接編集導線**: 現状は「右下「📸」FAB → 地図クリック」が起点、駅マーカー長押し → 既存メモ一覧表示等は未実装
- **メモのソート切替**: 現状 created_at DESC 固定。気分・路線でソートできると振り返り UX 向上
- **🔥 TODO「Supabase RLS 強化」の `norireco_trips` / `norireco_character_grants` 分は引き続き残**

### バージョン番号

v250 (Phase 3.8 後半 §99)

---
