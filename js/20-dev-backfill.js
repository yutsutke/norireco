// ══════════════════════════════════════════════════════════════
// 駅 ID 体系 Phase 2-b: 既存 trip バックフィル (v311、一度限り)
//
// Phase 2-a (v310) で from_station_id / to_station_id 列を追加し、新規 trip は
// 並行書き込みするようになったが、v309 以前に作られた既存 trip の id 列は
// NULL のまま。本ファイルはそれを一括 PATCH で埋めるための dev 用ヘルパー。
//
// 使い方 (ブラウザコンソール):
//   1. ログイン状態であることを確認
//   2. dry-run で対象件数と解決可否を確認:
//        await NORIRECO.dev.backfillStationIds({ dryRun: true })
//   3. 問題なければ本実行:
//        await NORIRECO.dev.backfillStationIds()
//   4. Supabase Dashboard で id 列が埋まったか確認
//   5. Phase 2 全完了時にこのファイルを撤去
//
// resolution 戦略:
//   1. trip.segments[].lineId が SERVICE_LINES.id に一致するなら SL.stations 内 name match で一意に id 解決
//   2. それ以外は MERGED_STATIONS の name match で fallback (同名駅は最初の hit)
//   3. trip 全体の from_station_id / to_station_id は segments の最初/最後の id を優先、無理なら name fallback
// ══════════════════════════════════════════════════════════════

import { currentUserId, authBearerToken } from './12-auth.js';

window.NORIRECO = window.NORIRECO || {};
NORIRECO.dev = NORIRECO.dev || {};

function resolveStationId(stationName, lineId) {
  if (!stationName) return null;
  // 1. lineId 経由で SERVICE_LINES から一意解決
  if (lineId && NORIRECO.data?.SERVICE_LINES) {
    const sl = NORIRECO.data.SERVICE_LINES.find(l => l.id === lineId);
    if (sl?.stations) {
      const st = sl.stations.find(s => s.name === stationName);
      if (st?.id) return st.id;
    }
  }
  // 2. MERGED_STATIONS から fallback (同名駅は最初の hit)
  const MS = NORIRECO.data?.MERGED_STATIONS;
  if (Array.isArray(MS)) {
    const ms = MS.find(m => m.name === stationName);
    if (ms?.id) return ms.id;
  }
  return null;
}

NORIRECO.dev.backfillStationIds = async function backfillStationIds(opts = {}) {
  const dryRun = !!opts.dryRun;
  const tag = dryRun ? '[backfill dry-run]' : '[backfill]';

  const uid = currentUserId();
  if (!uid) { console.error(`${tag} 未ログインです`); return null; }
  if (!Array.isArray(NORIRECO.data?.SERVICE_LINES) || NORIRECO.data.SERVICE_LINES.length === 0) {
    console.error(`${tag} SERVICE_LINES 未構築です (マイページか地図を一度開いてからやり直してください)`);
    return null;
  }
  if (!Array.isArray(NORIRECO.data?.MERGED_STATIONS) || NORIRECO.data.MERGED_STATIONS.length === 0) {
    console.error(`${tag} MERGED_STATIONS 未読込です`);
    return null;
  }

  console.log(`${tag} 自分の trip を fetch 中…`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/norireco_trips?user_id=eq.${uid}&select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authBearerToken()}` }
  });
  if (!res.ok) { console.error(`${tag} fetch 失敗 HTTP ${res.status}`); return null; }
  const trips = await res.json();
  console.log(`${tag} ${trips.length} 件取得`);

  let updated = 0, skipped = 0, partial = 0, failed = 0;
  const failures = [];

  for (const trip of trips) {
    // segments を id 補完版に再構築
    let newSegments = null;
    let segChanged = false;
    if (Array.isArray(trip.segments) && trip.segments.length > 0) {
      newSegments = trip.segments.map(s => {
        const out = { ...s };
        if (!out.from_id && out.from) {
          const id = resolveStationId(out.from, out.lineId);
          if (id) { out.from_id = id; segChanged = true; }
        }
        if (!out.to_id && out.to) {
          const id = resolveStationId(out.to, out.lineId);
          if (id) { out.to_id = id; segChanged = true; }
        }
        return out;
      });
    }

    // trip 全体 id (segments の最初/最後 優先、無ければ name fallback)
    const patch = {};
    if (segChanged) patch.segments = newSegments;

    if (!trip.from_station_id) {
      let id = null;
      if (newSegments && newSegments[0]?.from_id) id = newSegments[0].from_id;
      else if (trip.from_station) id = resolveStationId(trip.from_station, null);
      if (id) patch.from_station_id = id;
    }
    if (!trip.to_station_id) {
      let id = null;
      if (newSegments && newSegments[newSegments.length - 1]?.to_id) {
        id = newSegments[newSegments.length - 1].to_id;
      } else if (trip.to_station) {
        id = resolveStationId(trip.to_station, null);
      }
      if (id) patch.to_station_id = id;
    }

    // 既に埋まっている (PATCH 不要)
    if (Object.keys(patch).length === 0) {
      if (trip.from_station_id && trip.to_station_id) { skipped++; continue; }
      // どこも resolve できなかった
      failed++;
      failures.push({ id: trip.id, from: trip.from_station, to: trip.to_station, reason: 'no-resolution' });
      continue;
    }

    // 部分的にしか解決できなかった場合の追跡
    const wantsFromId = !trip.from_station_id;
    const wantsToId = !trip.to_station_id;
    const gotFromId = patch.from_station_id || trip.from_station_id;
    const gotToId = patch.to_station_id || trip.to_station_id;
    const isPartial = (wantsFromId && !gotFromId) || (wantsToId && !gotToId);
    if (isPartial) {
      partial++;
      failures.push({ id: trip.id, from: trip.from_station, to: trip.to_station, gotFromId, gotToId, reason: 'partial' });
    }

    if (dryRun) {
      console.log(`${tag} would PATCH ${trip.id}:`, patch);
      updated++;
      continue;
    }

    // PATCH
    try {
      const pr = await fetch(`${SUPABASE_URL}/rest/v1/norireco_trips?id=eq.${trip.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${authBearerToken()}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(patch),
      });
      if (pr.ok) { updated++; }
      else {
        failed++;
        const body = await pr.text().catch(() => '');
        failures.push({ id: trip.id, reason: `PATCH HTTP ${pr.status} ${body.slice(0, 200)}` });
      }
    } catch (e) {
      failed++;
      failures.push({ id: trip.id, reason: `PATCH error: ${e.message}` });
    }
  }

  console.log(`${tag} 完了: 更新 ${updated} / スキップ ${skipped} / 部分解決 ${partial} / 失敗 ${failed}`);
  if (failures.length > 0) console.log(`${tag} 失敗/部分解決リスト:`, failures);
  return { updated, skipped, partial, failed, failures };
};

console.log('[norireco] dev backfill loaded — NORIRECO.dev.backfillStationIds({ dryRun: true })');
