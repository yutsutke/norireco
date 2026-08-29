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

3. **デプロイ**

   ```sh
   npx wrangler deploy
   ```

   `mcp.norireco.app` は Cloudflare DNS 管理下なので Custom Domain が自動で張られる。
   確認: `curl https://mcp.norireco.app/health` → `ok`

4. **AI クライアントに登録する**

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
