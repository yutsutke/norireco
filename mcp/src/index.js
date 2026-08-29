// 乗レコ MCP サーバ (mcp.norireco.app)
// ───────────────────────────────────────────────────────────────
// AI チャット (Claude 等) から乗車記録をつけられるようにするための Worker。
//
//   Claude ──OAuth 2.1──▶ この Worker ──Supabase REST──▶ norireco_trips
//
// エンドポイント:
//   POST /mcp             : MCP 本体 (Streamable HTTP・ステートレス)。要 Bearer
//   GET  /authorize       : 同意画面 → Supabase の Google ログイン
//   GET  /callback        : Google ログインの戻り先
//   POST /oauth/token     : トークン発行 (workers-oauth-provider が処理)
//   POST /oauth/register  : 動的クライアント登録 (同上)
//   GET  /health, /       : 疎通確認・案内
//
// 設計判断:
//   - **ステートレス** (`createMcpHandler`)。Durable Object を使わない。ツールは
//     5 つとも 1 往復で完結し、セッション状態を持つ必要が無いため。DO を足すと
//     課金プランと migration の面倒が増えるだけになる。
//   - **service_role キーを持たない**。ユスケ本人の access token で Supabase を
//     叩くので v421 の RLS と v424 の垢BAN がそのまま効く (詳細は supabase.js)。
//   - **本体 (norireco.app) とは別 Worker**。worker/ は R2 presigned URL 発行係で
//     責務が違い、こちらは OAuth の KV とルーティングを持つため分けた方が事故が減る。
import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import { createMcpHandler } from 'agents/mcp/server';

import { SCOPES, authHandler } from './auth-handler.js';
import { createServer } from './tools.js';

const ORIGIN = 'https://mcp.norireco.app';

// createMcpHandler はリクエストごとに server を作る factory を要求する
// (同時リクエストが 1 つの server インスタンスを共有しないため)。env を閉じ込めたいので
// ここでも handler ごと組み立てる。5 ツールの登録は軽いのでコストは無視できる。
const apiHandler = {
  fetch(request, env, ctx) {
    return createMcpHandler(() => createServer(env), {
      route: '/mcp',
      // カスタムドメインでは Host の既定許可リストが効かないので明示する
      allowedHostnames: ['mcp.norireco.app', 'localhost', '127.0.0.1'],
    })(request, env, ctx);
  },
};

export default new OAuthProvider({
  apiRoute: '/mcp',
  apiHandler,
  defaultHandler: authHandler,

  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/oauth/token',
  // MCP 2026 では非推奨だが、現行クライアント (Claude 等) がまだ動的登録を使うので残す
  clientRegistrationEndpoint: '/oauth/register',

  scopesSupported: SCOPES,
  resourceMetadata: {
    resource: `${ORIGIN}/mcp`,
    authorization_servers: [ORIGIN],
    scopes_supported: SCOPES,
    resource_name: '乗レコ',
  },
});
