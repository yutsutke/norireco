// MCP ツール定義。AI チャットから 乗レコ に乗車記録をつけるための最小セット。
//
// 設計方針:
//   - 「解決 (search_*)」「確認 (preview_trip)」「保存 (record_trip)」を分ける。
//     AI が勝手に解釈して誤った旅程を黙って保存するのが一番まずいので、曖昧なら
//     候補を返して人に選ばせる形にしている。
//   - 書き込みは record_trip だけ。削除・写真は入れない (MVP スコープ)。
//   - 権限は Supabase の RLS が最終防衛線。ここでのチェックは UX のため。
import { McpServer } from '@modelcontextprotocol/server';
import { getMcpAuthContext } from 'agents/mcp/server';
import { z } from 'zod';

import { searchLines, searchStations, stationNameById } from './lines.js';
import { buildTrip, resolveSegments, todayJst, tripSummary } from './trip.js';
import { ReauthRequired, fetchShareStatus, restFetch } from './supabase.js';
import { QuotaExceeded, consumeQuota } from './quota.js';

const json = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 1) }] });
const fail = (message, extra) => ({
  content: [{ type: 'text', text: JSON.stringify({ error: message, ...extra }, null, 1) }],
  isError: true,
});

function currentUserId(optional = false) {
  const props = getMcpAuthContext()?.props;
  if (!props || !props.userId) {
    if (optional) return null;
    throw new ReauthRequired('乗レコ アカウントに接続されていません。MCP コネクタを繋ぎ直してください');
  }
  return props.userId;
}

const segmentInput = z.object({
  line: z.string().optional().describe('系統。line_id (jr_chuo_rapid 等) が確実。「中央線」のような通称でも可'),
  from: z.string().describe('乗車駅名'),
  to: z.string().optional().describe('降車駅名。省略すると「その駅を訪問しただけ」の記録になる'),
  train_name: z.string().optional().describe('列車名 (あずさ 5 号 など)'),
  train_category: z.string().optional().describe('種別 (快速・特急 など)'),
  car_model: z.string().optional().describe('車両形式 (E353系 など)'),
});

const tripInput = {
  segments: z.array(segmentInput).min(1).max(12)
    .describe('乗った順に並べた区間。乗り換えるたびに 1 つ足す'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    .describe('乗車日 YYYY-MM-DD (日本時間)。省略すると今日'),
  date_precision: z.enum(['minute', 'day', 'month', 'year', 'unknown']).optional()
    .describe('日付の確かさ。「去年の夏くらい」なら year、覚えていないなら unknown'),
  depart_time: z.string().optional().describe('出発時刻 HH:MM'),
  arrive_time: z.string().optional().describe('到着時刻 HH:MM'),
  delay_minutes: z.number().optional().describe('遅延した分数'),
  notes: z.string().optional().describe('メモ'),
};

async function resolveOrFail(segments) {
  const r = resolveSegments(segments);
  if (!r.ok) {
    // 乗換候補が出せたなら、そちらを主役にする。「1 本では繋がらないので教えて」と
    // 人に聞き返すより、「この経路で合っていますか」と確かめる方が早い。
    if (r.routes && r.routes.length > 0) {
      return {
        error: fail(`${r.at} 番目の区間は 1 本の系統では繋がりません。乗り換え経路の候補は次の通りです。`, {
          routes: r.routes,
          hint: 'どれか 1 つを選び、その segments を展開して (区間ごとに 1 つずつ) 呼び直してください。'
            + ' direct_through が true の経路は直通電車があるので乗り換え不要のことがあります。'
            + ' walk_to がある経路は、その駅まで歩いての乗り換えです。'
            + ' どれも実際に乗った経路と違う場合は利用者に確認してください。',
        }),
      };
    }
    return {
      error: fail(`${r.at} 番目の区間を解決できません: ${r.error}`, {
        candidates: r.candidates,
        hint: '候補から選んで line に line_id を入れて呼び直してください',
      }),
    };
  }
  return { segments: r.segments };
}

export function createServer(env) {
  const server = new McpServer({ name: 'norireco', version: '1.0.0' });

  // tool ハンドラ共通の前後処理。env を閉じ込めたいので createServer の内側に置く
  // (module 直下に置いて「直近の env」を差す形にすると、同時リクエストで取り違える)。
  //   - 1 日の呼び出し上限を消費する (誰でも接続できるので、1 人の暴走で全体を止めない)
  //   - 想定外の例外をそのまま AI に返すと内部情報が漏れるので絞る
  const guard = (handler, { write = false } = {}) => async (...args) => {
    try {
      await consumeQuota(env, currentUserId(true), write);
      return await handler(...args);
    } catch (e) {
      if (e instanceof ReauthRequired) return fail(e.message, { reconnect: true });
      if (e instanceof QuotaExceeded) return fail(e.message, { rate_limited: true });
      console.error('[norireco-mcp] tool error', e);
      return fail(`処理に失敗しました: ${e.message}`);
    }
  };

  server.registerTool(
    'search_line',
    {
      description: '乗レコ の営業系統 (路線) を名前で検索する。「中央線」「やまのてせん」のような通称・かなでも引ける。'
        + ' 記録する前に line_id を確定させるために使う。',
      inputSchema: {
        query: z.string().describe('路線名・通称・かな・事業者名'),
        limit: z.number().int().min(1).max(20).optional(),
      },
    },
    guard(async ({ query, limit }) => json({ lines: searchLines(query, limit || 8) })),
  );

  server.registerTool(
    'search_station',
    {
      description: '駅名から駅と、その駅が乗っている系統を調べる。同名の駅 (高松・大手町 など) は別々に返るので、'
        + ' どの事業者・どの系統かで見分ける。',
      inputSchema: {
        query: z.string().describe('駅名'),
        limit: z.number().int().min(1).max(20).optional(),
      },
    },
    guard(async ({ query, limit }) => json({ stations: searchStations(query, limit || 8) })),
  );

  server.registerTool(
    'preview_trip',
    {
      description: '乗車記録を保存せずに解決結果だけ返す。record_trip の前に必ず 1 度呼び、'
        + ' 系統・駅・駅数が意図通りかを利用者に確認してもらうこと。',
      inputSchema: tripInput,
    },
    guard(async (input) => {
      const r = await resolveOrFail(input.segments);
      if (r.error) return r.error;
      const trip = buildTrip(r.segments, input, 'preview');
      return json({
        preview: tripSummary(trip, r.segments),
        note: 'この内容でよければ同じ引数で record_trip を呼ぶ',
      });
    }),
  );

  server.registerTool(
    'record_trip',
    {
      description: '乗車記録 (旅程) を 乗レコ に保存する。保存すると地図が塗られ完乗率に反映される。'
        + ' 利用者が内容を確認していない状態では呼ばないこと。GPS を伴わない自己申告の記録として保存される。',
      inputSchema: {
        ...tripInput,
        allow_duplicate: z.boolean().optional()
          .describe('同じ日に同じ区間の記録が既にあっても保存する。既定は false で、重複時は警告を返して保存しない'),
      },
    },
    guard(async (input) => {
      const userId = currentUserId();
      const r = await resolveOrFail(input.segments);
      if (r.error) return r.error;

      // v423/v424 の垢BAN。RLS でも弾かれるが、入力を捨てて 403 を返すより理由を伝える
      if ((await fetchShareStatus(env, userId)) === 'full_banned') {
        return fail('アカウントが停止中のため新規記録は作成できません。過去の記録の閲覧・編集は 乗レコ 本体から可能です。');
      }

      const trip = buildTrip(r.segments, input, userId);

      if (!input.allow_duplicate) {
        const dup = await findDuplicate(env, userId, trip);
        if (dup) {
          return fail(`${trip.date} に同じ区間の記録が既にあります (${dup.name})。`
            + ' 本当に 2 回乗ったのなら allow_duplicate: true を付けて呼び直してください。', { existing: dup });
        }
      }

      const res = await restFetch(env, userId, 'norireco_trips', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(trip),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return fail(`保存に失敗しました (HTTP ${res.status}): ${body.slice(0, 200)}`);
      }

      return json({
        saved: true,
        trip_id: trip.id,
        summary: tripSummary(trip, r.segments),
        url: 'https://norireco.app',
      });
    }, { write: true }),
  );

  server.registerTool(
    'list_recent_trips',
    {
      description: '最近保存した乗車記録を新しい順に返す。重複記録を避けたいときや、'
        + ' 「この前どこ乗ったっけ」に答えるときに使う。',
      inputSchema: {
        limit: z.number().int().min(1).max(50).optional().describe('件数 (既定 10)'),
        since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('この日付以降に絞る'),
      },
    },
    guard(async ({ limit, since }) => {
      const userId = currentUserId();
      const params = new URLSearchParams({
        user_id: `eq.${userId}`,
        select: 'id,date,name,line_list,total_stations,transfers,from_station_id,to_station_id,date_precision,source,notes',
        order: 'date.desc,recorded_at.desc',
        limit: String(limit || 10),
      });
      if (since) params.set('date', `gte.${since}`);
      const res = await restFetch(env, userId, `norireco_trips?${params.toString()}`);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return fail(`取得に失敗しました (HTTP ${res.status}): ${body.slice(0, 200)}`);
      }
      const rows = await res.json();
      return json({
        today: todayJst(),
        trips: rows.map((t) => ({
          trip_id: t.id,
          date: t.date,
          date_precision: t.date_precision,
          name: t.name,
          lines: t.line_list,
          from: stationNameById(t.from_station_id),
          to: stationNameById(t.to_station_id),
          total_stations: t.total_stations,
          transfers: t.transfers,
          source: t.source,
          notes: t.notes || undefined,
        })),
      });
    }),
  );

  return server;
}

// 同じ日・同じ最初の区間 (系統 + 両端の駅 id) の記録があれば返す
async function findDuplicate(env, userId, trip) {
  const first = trip.segments[0];
  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    date: `eq.${trip.date}`,
    select: 'id,name,segments',
    limit: '50',
  });
  const res = await restFetch(env, userId, `norireco_trips?${params.toString()}`);
  if (!res.ok) return null; // 重複チェックは補助なので、失敗しても保存自体は止めない
  const rows = await res.json().catch(() => []);
  for (const row of rows) {
    const s = Array.isArray(row.segments) ? row.segments[0] : null;
    if (!s) continue;
    if (s.lineId === first.lineId && s.from_id === first.from_id && s.to_id === first.to_id) {
      return { trip_id: row.id, name: row.name };
    }
  }
  return null;
}
