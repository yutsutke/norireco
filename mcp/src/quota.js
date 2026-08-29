// 1 ユーザーあたりの 1 日の呼び出し上限。
//
// 【なぜ要るか】
// 誰でも接続できるようにすると、1 人が延々と呼び続けるだけで Cloudflare Workers と
// Supabase の無料枠を使い切れてしまう。悪意が無くても、AI 側のリトライが暴走すれば同じ。
// 「使えなくなる」より「その人だけ今日は打ち止め」の方が被害が小さいので、人単位で切る。
//
// 【これで防げないこと】
// Google アカウントを複数作れば、その数だけ枠が増える。総量の上限を守るものではなく、
// 「1 人の暴走で全体が止まる」のを防ぐためのもの。総量が心配なら Cloudflare 側の
// 使用量アラートを別途設定すること。
//
// 【数え方】
// KV のカウンタを読んで +1 するだけ。同時に来た呼び出しで数え漏らすことはあるが、
// 上限に少し届かない方向の誤差なので、この用途では許容する (厳密さより軽さを採る)。
import { todayJst } from './trip.js';

// 1 日の上限。記録 (書き込み) は検索より重いので別枠にする。
// wrangler.toml の [vars] で上書きできる (コードを触らずに絞れる/緩められるように)。
const DEFAULT_LIMIT = 500;
const DEFAULT_WRITE_LIMIT = 60;
const limitsOf = (env) => ({
  all: Number(env?.DAILY_LIMIT) || DEFAULT_LIMIT,
  write: Number(env?.DAILY_WRITE_LIMIT) || DEFAULT_WRITE_LIMIT,
});

const TTL_SEC = 60 * 60 * 48; // 2 日残しておけば日付の境目でも取りこぼさない

export class QuotaExceeded extends Error {
  constructor(message) {
    super(message);
    this.name = 'QuotaExceeded';
  }
}

async function bump(env, key, limit) {
  const current = Number(await env.OAUTH_KV.get(key)) || 0;
  if (current >= limit) return false;
  await env.OAUTH_KV.put(key, String(current + 1), { expirationTtl: TTL_SEC });
  return true;
}

/**
 * 呼び出しを 1 回ぶん消費する。上限を超えていたら QuotaExceeded を投げる。
 * @param {boolean} isWrite 記録の保存かどうか (別枠で数える)
 */
export async function consumeQuota(env, userId, isWrite) {
  if (!userId) return; // 未認証はそもそも MCP に到達しない
  const day = todayJst();
  const limit = limitsOf(env);
  if (!(await bump(env, `rl:${userId}:${day}`, limit.all))) {
    throw new QuotaExceeded(
      `今日の呼び出し上限 (${limit.all} 回) に達しました。日本時間の翌日 0 時にまた使えます。`,
    );
  }
  if (isWrite && !(await bump(env, `rl:w:${userId}:${day}`, limit.write))) {
    throw new QuotaExceeded(
      `今日の記録の保存上限 (${limit.write} 件) に達しました。`
      + ' まとめて記録したい場合は 乗レコ 本体の「まとめて記録」を使ってください。',
    );
  }
}
