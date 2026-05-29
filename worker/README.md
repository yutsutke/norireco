# norireco-api Worker

乗レコの Cloudflare Workers API ゲートウェイ。R2 presigned upload と JWT verify を担当。

## 構成

- **Runtime**: Cloudflare Workers (ES Modules, `compatibility_date = 2026-05-01`)
- **依存**: `jose` (JWT verify), `aws4fetch` (R2 SigV4 署名)
- **公開ドメイン**: `https://api.norireco.app`
- **R2 配信**: `https://cdn.norireco.app` (別途 R2 バケットの custom domain bind)

## エンドポイント

| Method | Path                   | 認証 | 用途                                        |
|--------|------------------------|------|---------------------------------------------|
| GET    | `/health`              | 不要 | 疎通確認                                    |
| GET    | `/me`                  | 必要 | JWT verify テスト (uid/email 返却)          |
| POST   | `/upload/memo-photo`   | 必要 | 駅メモ写真の R2 presigned PUT URL 発行      |
| POST   | `/upload/trip-photo`   | 必要 | 旅程写真の R2 presigned PUT URL 発行        |
| POST   | `/upload/share-image`  | 必要 | シェア OGP 画像の R2 presigned PUT URL 発行 |
| POST   | `/delete/photo`        | 必要 | R2 オブジェクト削除 (差し替え時の掃除)      |

認証は `Authorization: Bearer <supabase_access_token>` ヘッダー。Supabase Auth が発行する ES256 JWT を JWKS 経由で verify。

### POST /upload/share-image

シェア用 OGP 画像 (個別 trip / 累計プロフィール) を `shares/<uid>/<id>.png` に保存する presigned PUT URL を発行 (S-2)。写真と違い所有 entity id は無く Worker 側で id を採番する。

Request:
```json
{ "content_type": "image/png", "size_bytes": 152096, "ext": "png" }
```

Response:
```json
{
  "upload_url": "https://<account>.r2.cloudflarestorage.com/...?X-Amz-Signature=...",
  "public_url": "https://cdn.norireco.app/shares/<uid>/<id>.png",
  "object_key": "shares/<uid>/<id>.png",
  "share_id": "<id>",
  "expires_at": 1734567890
}
```

### POST /upload/memo-photo

Request:
```json
{
  "memo_id": "memo_xxxxxxxxxx",
  "content_type": "image/webp",
  "size_bytes": 145320,
  "ext": "webp"
}
```

Response:
```json
{
  "upload_url": "https://<account>.r2.cloudflarestorage.com/...?X-Amz-Signature=...",
  "public_url": "https://cdn.norireco.app/memos/<uid>/<memo_id>/<photo_id>.webp",
  "object_key": "memos/<uid>/<memo_id>/<photo_id>.webp",
  "expires_at": 1734567890
}
```

クライアントは `upload_url` に 5 分以内に直接 PUT。成功後は `public_url` を memo の `photos` jsonb に格納。

## 初回デプロイ手順

```powershell
cd C:\Users\yutsu\Documents\GitHub\norireco\worker
npm install

# 初回のみ: Cloudflare アカウントにブラウザ認証
npx wrangler login

# Secrets 登録 (対話入力 → Cloudflare 側に直接暗号化保存。ローカルにも git にも残らない)
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY

# デプロイ
npx wrangler deploy
```

初回 deploy 時に `[[routes]]` の `api.norireco.app/*` が自動で Custom Domain として bind される (norireco.app が Cloudflare DNS 管理下なので)。

## 動作確認

```powershell
# 疎通
curl https://api.norireco.app/health

# JWT verify (ブラウザの DevTools で localStorage の sb-*-auth-token から access_token を取って)
curl -H "Authorization: Bearer <token>" https://api.norireco.app/me
```

## ログ確認

```powershell
npx wrangler tail
```

または Cloudflare Dashboard → Workers → norireco-api → Logs。

## 環境変数

`wrangler.toml` の `[vars]` に書いてある公開設定:
- `SUPABASE_URL`: Supabase プロジェクトの URL (JWKS endpoint 解決用)
- `R2_ACCOUNT_ID`: Cloudflare アカウント ID
- `R2_BUCKET_NAME`: `norireco-photos`
- `CDN_BASE_URL`: `https://cdn.norireco.app`
- `ALLOWED_ORIGINS`: CORS 許可 origin の CSV

Secrets (`wrangler secret put` で登録):
- `R2_ACCESS_KEY_ID`: R2 API Token の Access Key ID
- `R2_SECRET_ACCESS_KEY`: R2 API Token の Secret Access Key
