# 乗レコ MCP サーバ

AI チャット（Claude など）から 乗レコ に乗車記録をつけるための Cloudflare Worker。

```
Claude ──OAuth 2.1──▶ mcp.norireco.app ──Supabase REST──▶ norireco_trips
                            │
                            └─ Supabase の Google ログイン（PKCE）で本人確認
```

`worker/`（R2 の presigned URL 発行）とは別 Worker。責務が違い、こちらは OAuth の KV と
ルーティングを持つため分けてある。

## できること（MVP）

| ツール | 何をするか |
|---|---|
| `search_line` | 「中央線」「やまのてせん」から系統（`line_id`）を引く |
| `search_station` | 駅名から駅と、その駅が乗っている系統を引く。同名駅は別々に返る |
| `preview_trip` | 保存せずに解決結果だけ返す。**record_trip の前に必ず通す** |
| `record_trip` | 旅程を保存する。同じ日の同じ区間は既定で重複拒否 |
| `list_recent_trips` | 直近の旅程を新しい順に返す |

写真の添付・記録の削除・完乗率の取得は入れていない（MVP スコープ外）。

## セットアップ（初回だけ）

```sh
cd mcp
npm install
```

> ⚠️ コマンドは **1 行ずつ**実行すること。Windows PowerShell 5.1 は `&&` を解釈しない。

1. **KV を作る**

   ```sh
   npx wrangler kv namespace create OAUTH_KV
   ```

   出力された `id` を `wrangler.toml` の `PUT_KV_NAMESPACE_ID_HERE` と差し替える。
   OAuth のクライアント／グラント／トークンと、Supabase の refresh token がここに入る。

2. **Supabase にリダイレクト先を登録する**

   Supabase Dashboard → Authentication → URL Configuration → Redirect URLs に

   ```
   https://mcp.norireco.app/callback
   ```

   を追加する。**これをやらないと Google ログインから戻ってこられない。**
   Google Cloud 側の設定は変更不要（Google から見た戻り先は今まで通り Supabase）。

3. **接続できる人を自分だけに絞る（初回は推奨）**

   ```sh
   npx wrangler secret put ALLOWED_EMAILS
   ```

   プロンプトに 乗レコ にログインしている Google アカウントのメールを入れる
   （複数ならカンマ区切り）。公開リポジトリなので `wrangler.toml` には書かないこと。

   本番で動くことを確かめたら、次のコマンドで誰でも使えるように開放できる。

   ```sh
   npx wrangler secret delete ALLOWED_EMAILS
   ```

   未設定 or 空 = 全開放。開放すると **Google アカウントを持つ人なら誰でも**自分の
   乗レコ アカウントに記録できる（他人のデータは RLS で触れない）。ただし
   レート制限が無いので、開放する前に入れておくのが望ましい。

4. **デプロイ**

   ```sh
   npx wrangler deploy
   ```

   `mcp.norireco.app` は Cloudflare DNS 管理下なので Custom Domain が自動で張られる。
   確認: `curl https://mcp.norireco.app/health` → `ok`

5. **AI クライアントに登録する**

   Claude の「カスタムコネクタを追加」に `https://mcp.norireco.app/mcp` を入れる。
   接続すると同意画面 → Google ログインに飛ぶ。

## 使い方の例

> 「今日、中央線で新宿から八王子まで乗った。記録して」

AI は `search_line`（中央線 → `jr_chuo_rapid`）→ `preview_trip`（18 駅・確認）→
`record_trip`（保存）と辿る。曖昧なとき（「新宿から八王子」だけだと中央線快速／京王線／
中央本線の 3 つが該当する）は候補が返るので、AI が聞き返してくる。

## マスターデータを更新したとき

`service_lines_master.json` / `merged_stations.json` / `lines-p*.json` を触ったら、
必ずインデックスを作り直して deploy する。

```sh
npm run build-index   # → src/data/lines-index.json（git に commit する）
npx wrangler deploy
```

このインデックスは本体 `js/02b-service-lines-builder.js` と**同じ手順**で駅 id
(`s_NNNNN`) を解決している。ここがずれると、MCP から保存した旅程の `from_id`/`to_id` が
本体とかみ合わず「保存はできたのに地図が塗られない」という気付きにくい壊れ方をする。

## 同意画面で「やり直してください」と出たら

3 種類のメッセージがあり、どこで落ちたかで原因が分かる。

| 表示 | 意味 | 対処 |
|---|---|---|
| **時間切れです** | 同意画面を開いてから 15 分を過ぎた | もう一度接続を始める |
| 同意画面を開いたブラウザと…一致しませんでした | cookie が届いていない（別ブラウザ・シークレット窓・cookie ブロック） | 同じ通常ウィンドウでやり直す |
| 確認トークンが一致しませんでした | CSRF トークン不一致 | もう一度接続を始める |

## 設計メモ

- **ステートレス**（`agents` の `createMcpHandler`）。Durable Object を使わない。
  ツールはどれも 1 往復で完結し、セッション状態が要らない。
- **service_role キーを持たない**。ユスケ本人の access token で Supabase を叩くので、
  v421 の RLS と v424 の垢BAN（`full_banned` は新規記録不可）がそのまま効く。
- **記録は `source: 'mcp'` / `verified: false`** で保存される。GPS を伴わない自己申告
  なので、認証グラデーション上は手動記録と同じ扱い。
- refresh token は KV に置き、60 日使われなければ失効（再接続してもらう）。

## 既知の制限

- **環状線の駅数**：山手線の「東京→品川」のように配列の並び順で数えると逆回りの駅数に
  なる。本体 `saveMultiSegmentTrip` と同じ数え方に揃えたうえで、`preview_trip` の
  `warning` に「何駅になるか・逆回りなら何駅か」を出して確認を促している。
- **ログインは Google のみ**。本体はマジックリンクにも対応しているが、MCP 側は未対応。
- **列車名は手入力扱い**（`train_id` は常に NULL）。マスター照合は未実装。
- **レート制限が無い**。全開放するなら、1 ユーザーあたりの上限を入れてからにする。
- **許可リストは「MCP を使えるか」だけを止める**。許可外の人が Google ログインを試みると
  Supabase アカウント自体は作られる（本人確認はログイン後にしか成立しないため）。ただし
  norireco.app も Google で誰でもサインアップできるので、MCP が新しく開けた穴ではない。
