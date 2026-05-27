// ══════════════════════════════════════════════════════════════
// マイページ 🚃 旅程サブタブ (v190 分割)
// - 旅程フィルタバー (期間 / 種類 / 種別 / 並び替え)
// - 旅程リスト描画 (tripCardHtml は 13-mypage-common.js)
// - Trip 編集モーダル (メモ・遅延の後追い編集) v184/v185
// - 旅程削除
// v346: GPS 後追い認証 (retroactivelyVerifyTrip) を撤去 (loose な実装 + 新方針整合性)
//
// 共通レイヤー (13-mypage-common.js) の以下を使用:
//   - NORIRECO.mypage.state._mypageCache / NORIRECO.mypage.state.mpTripFilter / _MP_SORT_COMPARATORS
//   - tripCardHtml / showMypageToast / applyMpSection / renderMypage
// 新規・移動分の関数は NORIRECO.mypage.xxx にも公開。
//
// v205 ES Modules パイロット (案 β) stage 2: `<script type="module">` 化。
// 内部関数は既に末尾で `window.X = X` + `NORIRECO.mypage.X = X` の両建て登録済みのため、
// stage 2 追加 bridge ゼロ。外部参照 (tripCardHtml / showMypageToast / filterTripsByDate /
// _MP_SORT_COMPARATORS) は classic function 宣言 + Global Lexical Env 経由で module から
// bare 識別子として読める。
//
// v223 ES Modules stage 3: 11-fraud-detection と 03-characters を import 化。
// v224: 12-auth.authBearerToken を import 化。
// v345: 不正検知撤回に伴い 11-fraud-detection の import を撤去。
// ══════════════════════════════════════════════════════════════
// v346: distMeters / runCharacterGrantCheck import 撤去 (retroactivelyVerifyTrip 削除に伴い未使用化)
import { authBearerToken } from './12-auth.js';
import {
  tripCardHtml,
  showMypageToast,
  applyMpSection,
  _MP_SORT_COMPARATORS,
  tripMatchesAnyStation,
  resolveStationQuery,
  getTripStationName,
} from './13-mypage-common.js';
import { filterTripsByDate, applyDateFilter } from './05-supabase-data.js';
// v258: 旅程の写真添付 (memo と共通の写真エリアコンポーネント)
// v267+: deletePhotoByUrl は trip 削除時の R2 cleanup でも使う
import { createPhotoArea, deletePhotoByUrl } from './18-photo-area.js';
// v263+: マイページ旅程カード上で写真をドラッグ&ドロップ並び替え
import { enableDragSort } from './19-drag-sort.js';
// v393 (B-2): 列車種別 / 車両形式 入力を 07/13b 共通 factory に集約。
//   per-seg-rows mode (segments あり) / trip-level mode (segments なし) を切替。
import { createTripDetailEditor } from './20-trip-detail-editor.js';

// 旅程編集モーダル内の写真エリアコントローラ (createPhotoArea 戻り値、null = 未生成)
let _tripEditPhotoArea = null;
// v393 (B-2): 旅程編集モーダル内の trip 詳細エディタ — 列車種別 / 車両形式 担当 (per-seg-rows / trip-level)
let _tripEditDetailEditor = null;
// v394 (B-3a): 旅程編集モーダル内の trip 詳細エディタ — 遅延 + メモ 担当 (2nd instance、draft は独立)
//   将来 B-4 で 1 instance に統合予定。
let _tripEditMetaEditor = null;

// v332 (Phase 3): getTripStationName は循環 import 回避のため 13-mypage-common.js に移動。
//   import 経由で参照する (v331 で 13b に置いて 13-common から循環 import → 初期化事故、v332 解消)。

// v285: filter 入力値などユーザー由来文字列を value="..." に埋める用の最小エスケープ
function escapeAttr(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]
  ));
}

// ── 🚃 旅程セクション ──────────────────────────────────────────
// v286.1: 構造を [フィルタバー固定領域] + [結果領域] に分離。
//   フィルタ変更時は renderMpTripsResultOnly() で結果領域だけ書き換え、
//   input 要素 (駅名検索) は DOM から消えない → IME composition が壊れない。
function renderMpTripsSection() {
  const sec = document.getElementById('mp-trip-section');
  if (!sec) return;
  sec.innerHTML = '';

  // フィルタバー (1 回だけ生成、以降は触らない)
  sec.appendChild(buildTripFilterBar());

  // 結果領域 (フィルタ変更で毎回書き換わる)
  const result = document.createElement('div');
  result.id = 'mp-trip-result';
  sec.appendChild(result);

  renderMpTripsResultOnly();
}
NORIRECO.mypage.renderMpTripsSection = renderMpTripsSection;

function renderMpTripsResultOnly() {
  const result = document.getElementById('mp-trip-result');
  if (!result) return;
  result.innerHTML = '';

  const filtered = applyTripFilters(NORIRECO.mypage.state._mypageCache || []);

  const head = document.createElement('div');
  head.className = 'sec-lbl';
  head.innerHTML = `自分の旅程 (${filtered.length} / ${(NORIRECO.mypage.state._mypageCache||[]).length} 件)`;
  result.appendChild(head);

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'mp-empty-s';
    empty.style.padding = '20px';
    empty.textContent = 'フィルタ条件に合致する旅程がありません';
    result.appendChild(empty);
    return;
  }

  result.appendChild(buildTripList(filtered));
  attachPhotoDragSortToTripCards(result);
}
NORIRECO.mypage.renderMpTripsResultOnly = renderMpTripsResultOnly;

function buildTripFilterBar() {
  const bar = document.createElement('div');
  bar.className = 'mp-filter-bar';
  bar.innerHTML = `
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">📅 期間</label>
      <select class="mp-filter-sel" id="mp-fil-period" onchange="updateMpFilter('period',this.value)">
        <option value="all" ${NORIRECO.mypage.state.mpTripFilter.period==='all'?'selected':''}>全期間</option>
        <option value="thisYear" ${NORIRECO.mypage.state.mpTripFilter.period==='thisYear'?'selected':''}>今年</option>
        <option value="lastYear" ${NORIRECO.mypage.state.mpTripFilter.period==='lastYear'?'selected':''}>去年</option>
        <option value="thisMonth" ${NORIRECO.mypage.state.mpTripFilter.period==='thisMonth'?'selected':''}>今月</option>
        <option value="last7" ${NORIRECO.mypage.state.mpTripFilter.period==='last7'?'selected':''}>直近7日</option>
      </select>
    </div>
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">📋 種類</label>
      <select class="mp-filter-sel" id="mp-fil-auth" onchange="updateMpFilter('auth',this.value)">
        <option value="all" ${NORIRECO.mypage.state.mpTripFilter.auth==='all'?'selected':''}>すべて</option>
        <option value="verified" ${NORIRECO.mypage.state.mpTripFilter.auth==='verified'?'selected':''}>📍 GPS</option>
        <option value="manual" ${NORIRECO.mypage.state.mpTripFilter.auth==='manual'?'selected':''}>📝 手動</option>
      </select>
    </div>
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">🚆 種別</label>
      <select class="mp-filter-sel" id="mp-fil-cat" onchange="updateMpFilter('category',this.value)">
        <option value="all" ${NORIRECO.mypage.state.mpTripFilter.category==='all'?'selected':''}>すべて</option>
        <option value="shinkansen" ${NORIRECO.mypage.state.mpTripFilter.category==='shinkansen'?'selected':''}>新幹線</option>
        <option value="limited_express" ${NORIRECO.mypage.state.mpTripFilter.category==='limited_express'?'selected':''}>特急</option>
        <option value="express" ${NORIRECO.mypage.state.mpTripFilter.category==='express'?'selected':''}>急行</option>
        <option value="rapid" ${NORIRECO.mypage.state.mpTripFilter.category==='rapid'?'selected':''}>快速</option>
        <option value="sleeper" ${NORIRECO.mypage.state.mpTripFilter.category==='sleeper'?'selected':''}>寝台</option>
        <option value="cruise_train" ${NORIRECO.mypage.state.mpTripFilter.category==='cruise_train'?'selected':''}>クルーズ</option>
        <option value="joyful_train" ${NORIRECO.mypage.state.mpTripFilter.category==='joyful_train'?'selected':''}>観光列車</option>
        <option value="steam" ${NORIRECO.mypage.state.mpTripFilter.category==='steam'?'selected':''}>SL</option>
        <option value="none" ${NORIRECO.mypage.state.mpTripFilter.category==='none'?'selected':''}>列車指定なし</option>
      </select>
    </div>
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">🚉 駅名</label>
      <input type="search" class="mp-filter-input" id="mp-fil-station" placeholder="例: 八王子 / 八王子 東京" title="駅名のみ / 駅名 都道府県 (空白区切り、AND 検索)" value="${escapeAttr(NORIRECO.mypage.state.mpTripFilter.station || '')}" oninput="updateMpFilter('station',this.value)">
    </div>
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">🚆 車両</label>
      <input type="search" class="mp-filter-input" id="mp-fil-car-model" placeholder="例: E235 / キハ110" title="車両形式の部分一致 (大文字小文字 / 番台略号も部分一致)" value="${escapeAttr(NORIRECO.mypage.state.mpTripFilter.car_model || '')}" oninput="updateMpFilter('car_model',this.value)">
    </div>
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">🛤 路線</label>
      <input type="search" class="mp-filter-input" id="mp-fil-line" placeholder="例: 東金線 / 山手線" title="路線名の部分一致 (segments.lineName / lineId にマッチ)" value="${escapeAttr(NORIRECO.mypage.state.mpTripFilter.line || '')}" oninput="updateMpFilter('line',this.value)">
    </div>
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">🎯 範囲</label>
      <div class="mp-scope-chips" id="mp-scope-chips">
        ${['from','end','transfer','pass'].map(k => {
          const labels = { from:'始点', end:'終点', transfer:'乗換', pass:'通過' };
          const on = NORIRECO.mypage.state.mpTripFilter.stationScope?.[k] !== false;
          return `<button class="mp-scope-chip ${on ? 'on' : ''}" onclick="toggleMpStationScope('${k}')" title="${labels[k]}を検索対象に含む">${labels[k]}</button>`;
        }).join('')}
      </div>
    </div>
    <div class="mp-filter-row">
      <label class="mp-filter-lbl">⇅ 並び替え</label>
      <select class="mp-filter-sel" id="mp-fil-sort" onchange="updateMpFilter('sort',this.value)">
        <option value="date_desc" ${NORIRECO.mypage.state.mpTripFilter.sort==='date_desc'?'selected':''}>📅 乗車日 (新しい順)</option>
        <option value="date_asc" ${NORIRECO.mypage.state.mpTripFilter.sort==='date_asc'?'selected':''}>📅 乗車日 (古い順)</option>
        <option value="stations_desc" ${NORIRECO.mypage.state.mpTripFilter.sort==='stations_desc'?'selected':''}>🚉 訪問駅数 (多い順)</option>
        <option value="minutes_desc" ${NORIRECO.mypage.state.mpTripFilter.sort==='minutes_desc'?'selected':''}>⏱ 乗車時間 (長い順)</option>
        <option value="recorded_desc" ${NORIRECO.mypage.state.mpTripFilter.sort==='recorded_desc'?'selected':''}>📌 記録日 (新しい順)</option>
        <option value="delay_desc" ${NORIRECO.mypage.state.mpTripFilter.sort==='delay_desc'?'selected':''}>🐢 遅延 (多い順)</option>
      </select>
    </div>
    <button class="mp-filter-reset" onclick="resetMpFilter()" title="フィルタをリセット">↺</button>
  `;
  return bar;
}
NORIRECO.mypage.buildTripFilterBar = buildTripFilterBar;

function updateMpFilter(key, value) {
  NORIRECO.mypage.state.mpTripFilter[key] = value;
  // v286.1: フィルタバー (input 含む) は触らず、結果領域だけ更新。
  //   これで駅名 input は DOM に残り続け、IME composition が壊れない。
  renderMpTripsResultOnly();
}
window.updateMpFilter = updateMpFilter;
NORIRECO.mypage.updateMpFilter = updateMpFilter;

// v289: 駅名検索のマッチ範囲 (始点/終点/乗換/通過) を 1 chip ずつトグル
function toggleMpStationScope(key) {
  const f = NORIRECO.mypage.state.mpTripFilter;
  f.stationScope = f.stationScope || { from:true, end:true, transfer:true, pass:true };
  f.stationScope[key] = !f.stationScope[key];
  // chip の見た目を即時更新 (input は触らないので IME 安全)
  const btn = document.querySelector(`#mp-scope-chips .mp-scope-chip[onclick*="'${key}'"]`);
  if (btn) btn.classList.toggle('on', f.stationScope[key]);
  renderMpTripsResultOnly();
}
window.toggleMpStationScope = toggleMpStationScope;
NORIRECO.mypage.toggleMpStationScope = toggleMpStationScope;

function resetMpFilter() {
  NORIRECO.mypage.state.mpTripFilter = {
    auth: 'all', period: 'all', category: 'all', sort: 'date_desc', station: '', car_model: '', line: '',
    stationScope: { from:true, end:true, transfer:true, pass:true },
  };
  // reset は select の選択状態と input の表示値を初期に戻すため全体再描画
  renderMpTripsSection();
}
window.resetMpFilter = resetMpFilter;
NORIRECO.mypage.resetMpFilter = resetMpFilter;

function applyTripFilters(trips) {
  // グローバル過去モード (_tripDateFilter) を先に適用
  {
    trips = filterTripsByDate(trips);
  }
  // v317 (Phase 3-e): 駅名検索の id Set を filter() の外で 1 回だけ解決。
  //   filter callback 内で resolveStationQuery を呼ぶと trip 毎に
  //   MERGED_STATIONS 9,017 駅をループしてしまい O(N*M) になる。
  // v318: 空白区切りで「駅名 都道府県」検索 (例: "八王子 東京")。
  // v318.1: pref モードでも name fallback を残す (pref フィルタ済 names Set で照合)。
  //   id 列が NULL のレガシー trip でも pref 検索が機能する。
  const _stq = (NORIRECO.mypage.state.mpTripFilter.station || '').trim();
  const _stResult = _stq ? resolveStationQuery(_stq) : null;
  const _stScope = NORIRECO.mypage.state.mpTripFilter.stationScope || { from:true, end:true, transfer:true, pass:true };
  // v369: 路線 substring 検索 — SERVICE_LINES の name にマッチする lineId の Set を 1 回だけ構築。
  //   segments[].lineName は記録時に null になりがちなので一次情報は lineId。
  //   候補 id は SERVICE_LINES.id だけでなく candidateN02Ids も含める (`s_*` ベース + 旧 N02 ID 両対応)。
  const _lnq = (NORIRECO.mypage.state.mpTripFilter.line || '').trim();
  let _lnMatchIds = null;
  if (_lnq) {
    const lnqLower = _lnq.toLowerCase();
    const SL = NORIRECO.data?.SERVICE_LINES || [];
    _lnMatchIds = new Set();
    for (const sl of SL) {
      const name = (sl.name || '').toLowerCase();
      const id = (sl.id || '').toLowerCase();
      if (name.includes(lnqLower) || id.includes(lnqLower)) {
        _lnMatchIds.add(sl.id);
        if (Array.isArray(sl.candidateN02Ids)) {
          for (const cid of sl.candidateN02Ids) _lnMatchIds.add(cid);
        }
      }
    }
    if (_lnMatchIds.size === 0) _lnMatchIds = new Set(['__nomatch__']);
  }
  const filtered = trips.filter(t => {
    // 記録種別
    if (NORIRECO.mypage.state.mpTripFilter.auth === 'verified' && !t.verified) return false;
    if (NORIRECO.mypage.state.mpTripFilter.auth === 'manual' && t.verified) return false;
    // 期間
    const d = t.date || '';
    if (NORIRECO.mypage.state.mpTripFilter.period !== 'all' && d) {
      const today = new Date();
      const ty = today.getFullYear();
      if (NORIRECO.mypage.state.mpTripFilter.period === 'thisYear' && !d.startsWith(String(ty))) return false;
      if (NORIRECO.mypage.state.mpTripFilter.period === 'lastYear' && !d.startsWith(String(ty-1))) return false;
      if (NORIRECO.mypage.state.mpTripFilter.period === 'thisMonth') {
        const ym = `${ty}-${String(today.getMonth()+1).padStart(2,'0')}`;
        if (!d.startsWith(ym)) return false;
      }
      if (NORIRECO.mypage.state.mpTripFilter.period === 'last7') {
        const cutoff = new Date(today.getTime() - 7*24*3600*1000);
        const tripDate = new Date(d);
        if (tripDate < cutoff) return false;
      }
    }
    // カテゴリ
    if (NORIRECO.mypage.state.mpTripFilter.category !== 'all') {
      if (NORIRECO.mypage.state.mpTripFilter.category === 'none') {
        if (t.train_category) return false;
      } else {
        if (t.train_category !== NORIRECO.mypage.state.mpTripFilter.category) return false;
      }
    }
    // v285/v288/v289: 駅名 substring 検索 — マッチ範囲は stationScope (始点/終点/乗換/通過) で切替
    // v317 (Phase 3-e): id 解決層経由化。_stResult.ids と trip 側 *_station_id を比較。
    // v318: 都道府県トークン対応。
    // v320: v319 で fallback を緩めたら同名異所駅 (石川の高松等) も混入したため
    //   v318 の挙動 (pref モード時は id 厳密、fallback off) に戻す。
    //   pref 指定時に 0 件落ちする trip は「from_station_id / to_station_id / seg.from_id / to_id
    //   が NULL のままバックフィル漏れ」が原因。Supabase で確認 → 手動補修 SQL で対応する。
    if (_stq && _stResult) {
      const { ids, names, nameToken, hasPrefFilter } = _stResult;
      const predicate = (name, id) => {
        if (id && ids.has(id)) return true;
        if (hasPrefFilter) return false;  // pref モード時は id 厳密
        return !!name && name.includes(nameToken);
      };
      if (!tripMatchesAnyStation(t, predicate, _stScope)) return false;
    }
    // v357: 車両形式 substring 検索 (大文字小文字を区別しない)。空文字はスキップ
    // v371: trip.car_model だけでなく segments[].car_model も走査 (乗換系統ごとに別車両のケース対応)
    const cmq = (NORIRECO.mypage.state.mpTripFilter.car_model || '').trim();
    if (cmq) {
      const cmqLower = cmq.toLowerCase();
      const tripHit = t.car_model && t.car_model.toLowerCase().includes(cmqLower);
      const segs = Array.isArray(t.segments) ? t.segments : [];
      const segHit = segs.some(s => s.car_model && s.car_model.toLowerCase().includes(cmqLower));
      if (!tripHit && !segHit) return false;
    }
    // v369: 路線 substring 検索。segments[].lineId を SERVICE_LINES で逆引きして name と照合
    // (lineName は記録時に null になりがちなので一次情報は lineId、name は SERVICE_LINES から引く)
    if (_lnMatchIds) {
      const segs = Array.isArray(t.segments) ? t.segments : [];
      const hit = segs.some(s => s.lineId && _lnMatchIds.has(s.lineId));
      if (!hit) return false;
    }
    return true;
  });
  // v182: ソート (デフォルト date_desc)
  const cmp = _MP_SORT_COMPARATORS[NORIRECO.mypage.state.mpTripFilter.sort] || _MP_SORT_COMPARATORS.date_desc;
  return [...filtered].sort(cmp);
}
NORIRECO.mypage.applyTripFilters = applyTripFilters;

// v184/v226: 旅程カードからメモ・遅延・時刻・列車種別を後追い編集 ────
// v184 はメモ・遅延のみ。v226 で 🕒 乗車時刻 (date/depart/arrive) ・🚆 列車種別 (category/name/car_model)
// を編集可。📍 区間 は read-only 表示。
// v345: 旧来 GPS 記録は時刻ロックしていたが「世間への証明」位置づけ撤回に伴い解除。GPS 記録も時刻編集可。
// Supabase 列は全て既存なので localStorage と Supabase の双方に書き戻す。
function openTripEditModal(tripId) {
  const trip = (NORIRECO.mypage.state._mypageCache || []).find(t => t.id === tripId);
  if (!trip) { alert('旅程が見つかりません'); return; }
  const idInp = document.getElementById('trip-edit-id');
  const subTitle = document.getElementById('trip-edit-subtitle');
  if (idInp) idInp.value = tripId;
  // v394 (B-3a): delay_minutes / notes プリセットは createTripDetailEditor (_tripEditMetaEditor) が initial で受ける。
  //   旧 #trip-edit-delay-h/m + #trip-edit-notes の直接代入は不要 (factory 内 textarea/number input が値復元)。
  if (subTitle) {
    const label = trip.name || tripId;
    subTitle.textContent = `${label} を編集します。`;
  }

  // v226: 📍 区間 表示。区間そのものは read-only。
  // v373/v380/v383: per-segment cascade を 13b 自前実装。
  // v393 (B-2): trip 詳細エディタ factory (createTripDetailEditor) に集約。
  //   - segs.length >= 1: per-seg-rows mode で #trip-edit-segments を factory が乗っ取る (seg header + cascade 全部 factory render)。
  //     🚆 列車種別 section 全体は hide (trip-level fallback は不要)。
  //   - segs.length === 0: trip-level mode で #trip-edit-train-picker-container に factory mount。
  //     #trip-edit-segments は従来通り "from → to" の read-only 1 行。
  //   旧 4 input (#trip-edit-train-category 等) と旧 per-seg-* グローバル関数は dead code 化 (B-4 で撤去)。
  if (_tripEditDetailEditor) {
    try { _tripEditDetailEditor.destroy(); } catch (e) {}
    _tripEditDetailEditor = null;
  }
  const segEl = document.getElementById('trip-edit-segments');
  const trainSectionEl = document.getElementById('trip-edit-train-section');
  const trainPickerEl = document.getElementById('trip-edit-train-picker-container');
  const segs = Array.isArray(trip.segments) ? trip.segments : [];
  const _hasSegmentsForEdit = segs.length >= 1;
  if (_hasSegmentsForEdit) {
    // per-seg-rows mode — factory が #trip-edit-segments を完全に乗っ取る (seg header 含む)。
    // 🚆 列車種別 section 全体は hide。
    if (trainSectionEl) trainSectionEl.style.display = 'none';
    if (segEl) {
      _tripEditDetailEditor = createTripDetailEditor({
        container: segEl,
        initial: { segments: segs.map(s => ({ ...s })) },
        features: {
          trainPicker: 'per-seg-rows',
          timeRow: false,
          delay: false,
          notes: false,
          photos: false,
        },
      });
    }
  } else {
    // trip-level mode — #trip-edit-segments は from → to 表示のまま、
    // #trip-edit-train-picker-container に factory mount。
    if (segEl) {
      // v326: name 列 DROP 後は id → MERGED_STATIONS で逆引き
      segEl.innerHTML = `<span style="color:var(--silver)">${getTripStationName(trip, 'from') || '?'} → ${getTripStationName(trip, 'to') || '?'}</span>`;
    }
    if (trainSectionEl) trainSectionEl.style.display = '';
    if (trainPickerEl) {
      _tripEditDetailEditor = createTripDetailEditor({
        container: trainPickerEl,
        initial: {
          train_category: trip.train_category || null,
          train_id: trip.train_id || null,
          train_name: trip.train_name || null,
          car_model: trip.car_model || null,
        },
        features: {
          trainPicker: 'trip-level',
          timeRow: false,
          delay: false,
          notes: false,
          photos: false,
        },
      });
    }
  }

  // v345: 「verified を守る」目的のロック撤回。GPS 記録も時刻編集可
  const timeLockEl = document.getElementById('trip-edit-time-lock');
  const timeInputsEl = document.getElementById('trip-edit-time-inputs');
  if (timeLockEl) timeLockEl.style.display = 'none';
  if (timeInputsEl) timeInputsEl.style.display = 'block';
  const dateInp = document.getElementById('trip-edit-date');
  const depInp = document.getElementById('trip-edit-depart');
  const arrInp = document.getElementById('trip-edit-arrive');
  if (dateInp) dateInp.value = (trip.date && trip.date_precision !== 'unknown') ? trip.date : '';
  // depart_time / arrive_time は HH:MM:SS 形式。input[type=time] は HH:MM を期待
  const toHm = (v) => (typeof v === 'string' && v.length >= 5) ? v.slice(0, 5) : '';
  if (depInp) depInp.value = toHm(trip.depart_time);
  if (arrInp) arrInp.value = toHm(trip.arrive_time);

  // v393 (B-2): 🚆 列車種別 / 車両形式の DOM 操作は createTripDetailEditor (per-seg-rows / trip-level mode)
  //   が完全に担当。13b 旧実装 (v226〜v384 の per-seg cascade 直書き + trip 単位 4 input の visibility 制御)
  //   はファクトリ移行で不要化。旧 4 input は HTML 側で display:none 固定、旧 onTripEdit* 関数は dead code。

  // v394 (B-3a): ⏱ 遅延 + 📝 自由メモ は 2nd factory instance (`_tripEditMetaEditor`) が担当。
  //   1 modal に editor を 2 つ持つのは中間状態 — 将来 B-4 で time / train picker / delay / notes を
  //   1 instance に統合予定。draft も分離されているため saveTripEdit で各 editor の getDraft() を merge する。
  if (_tripEditMetaEditor) {
    try { _tripEditMetaEditor.destroy(); } catch (e) {}
    _tripEditMetaEditor = null;
  }
  const metaContainer = document.getElementById('trip-edit-meta-container');
  if (metaContainer) {
    _tripEditMetaEditor = createTripDetailEditor({
      container: metaContainer,
      initial: {
        delay_minutes: trip.delay_minutes || null,
        notes: trip.notes || null,
      },
      features: {
        trainPicker: false,
        timeRow: false,
        delay: true,
        notes: true,
        photos: false,
      },
    });
  }

  // v258: 📷 写真エリアを再生成 (createPhotoArea を使って最大 5 枚)
  if (_tripEditPhotoArea) {
    try { _tripEditPhotoArea.destroy(); } catch (e) {}
    _tripEditPhotoArea = null;
  }
  const photoContainer = document.getElementById('trip-edit-photo-container');
  if (photoContainer) {
    _tripEditPhotoArea = createPhotoArea({
      container: photoContainer,
      kind: 'trip',
      getOwnerId: () => tripId,
      initialPhotos: Array.isArray(trip.photos) ? trip.photos : [],
      maxCount: 5,
    });
  }

  document.getElementById('trip-edit-modal')?.classList.add('open');
}
window.openTripEditModal = openTripEditModal;
NORIRECO.mypage.openTripEditModal = openTripEditModal;

// v355→v356: 編集モーダルのカテゴリ select onchange ハンドラ。
// 指定しない → 全 hide
// 普通       → 列車 dropdown hide + 列車手入力 hide + 車両形式 show
// 特急など   → 列車 dropdown show + populate + 車両形式 show
// hide 時は value も '' に clear して saveTripEdit で null になるように。
// 既存値復元 (trip.train_id / train_name) は openTripEditModal 側で applyTripEditCategoryVisibility 後に処理
function applyTripEditCategoryVisibility(cat) {
  const trainIdSel   = document.getElementById('trip-edit-train-id');
  const trainNameInp = document.getElementById('trip-edit-train-name');
  const carModelInp  = document.getElementById('trip-edit-car-model');

  if (!cat) {
    // 指定しない
    if (trainIdSel)   { trainIdSel.style.display   = 'none'; trainIdSel.value   = ''; }
    if (trainNameInp) { trainNameInp.style.display = 'none'; trainNameInp.value = ''; }
    if (carModelInp)  { carModelInp.style.display  = 'none'; carModelInp.value  = ''; }
    return;
  }
  if (cat === 'local') {
    // 普通: 列車 dropdown / 列車手入力 hide + 車両形式 show
    if (trainIdSel)   { trainIdSel.style.display   = 'none'; trainIdSel.value   = ''; }
    if (trainNameInp) { trainNameInp.style.display = 'none'; trainNameInp.value = ''; }
    if (carModelInp)  { carModelInp.style.display  = 'block'; }
    return;
  }
  // 特急など: 列車 dropdown を populate して show、車両形式は show
  if (trainIdSel) {
    populateTripEditTrainDropdown(cat);
    trainIdSel.style.display = 'block';
  }
  if (carModelInp) carModelInp.style.display = 'block';
  // trainNameInp の表示は onTripEditTrainChange / openTripEditModal の復元側で決定
}

// 指定カテゴリの列車を dropdown に populate (記録モーダル 02-data-loaders.js の挙動と揃える)
function populateTripEditTrainDropdown(cat) {
  const trainIdSel = document.getElementById('trip-edit-train-id');
  if (!trainIdSel) return;
  const trains = ((NORIRECO.trains && NORIRECO.trains.TRAINS) || [])
    .filter(t => t.category === cat)
    .sort((a, b) => {
      if (!!a.discontinued !== !!b.discontinued) return a.discontinued ? 1 : -1;
      return (a.name || '').localeCompare(b.name || '', 'ja');
    });
  let html = '<option value="">列車を選ぶ...</option>';
  for (const t of trains) {
    const disc = t.discontinued ? ' (廃止)' : '';
    const rarity = t.rarity === 'legendary' ? ' ⭐' : (t.rarity === 'rare' ? ' ✨' : '');
    html += `<option value="${t.id}">${t.name}${rarity}${disc}</option>`;
  }
  html += '<option value="__custom__">📝 リストにない (手入力)</option>';
  trainIdSel.innerHTML = html;
}

function onTripEditCategoryChange() {
  const cat = document.getElementById('trip-edit-train-category')?.value || '';
  applyTripEditCategoryVisibility(cat);
}
window.onTripEditCategoryChange = onTripEditCategoryChange;

// ──────────────────────────────────────────────────────────────
// v383: per-seg フル cascade (記録モード v375 と同形)
//   各 seg row の構造: [種別 select] / [列車 dropdown] / [列車名 input (__custom__)] / [車両形式 dropdown + 車両形式 input]
//   visibility rule:
//     cat=''      → train_row / train_name_row / car_row 全 hide
//     cat='local' → train_row / train_name_row hide、car_row show (dropdown hide + input show)
//     cat=other   → train_row show + dropdown populate、train_name_row は __custom__ 時のみ show、car_row show
//                   (car_dropdown は train 選択後に populate、master に car_models が無ければ hide → input fallback)
// ──────────────────────────────────────────────────────────────
function applyTripEditSegCategoryVisibility(idx, cat) {
  const trainRow = document.querySelector(`.te-seg-train-row[data-seg-idx="${idx}"]`);
  const trainNameRow = document.querySelector(`.te-seg-train-name-row[data-seg-idx="${idx}"]`);
  const carRow = document.querySelector(`.te-seg-car-row[data-seg-idx="${idx}"]`);
  const tidEl = document.querySelector(`.te-seg-train-id[data-seg-idx="${idx}"]`);
  const tnameEl = document.querySelector(`.te-seg-train-name[data-seg-idx="${idx}"]`);
  const carSelEl = document.querySelector(`.te-seg-car-select[data-seg-idx="${idx}"]`);
  const carInpEl = document.querySelector(`.te-seg-car[data-seg-idx="${idx}"]`);

  if (!cat) {
    if (trainRow) trainRow.style.display = 'none';
    if (trainNameRow) trainNameRow.style.display = 'none';
    if (carRow) carRow.style.display = 'none';
    if (tidEl) tidEl.value = '';
    if (tnameEl) tnameEl.value = '';
    if (carSelEl) { carSelEl.style.display = 'none'; carSelEl.value = ''; }
    if (carInpEl) carInpEl.value = '';
    return;
  }
  if (cat === 'local') {
    if (trainRow) trainRow.style.display = 'none';
    if (trainNameRow) trainNameRow.style.display = 'none';
    if (carRow) carRow.style.display = 'flex';
    if (tidEl) tidEl.value = '';
    if (tnameEl) tnameEl.value = '';
    if (carSelEl) { carSelEl.style.display = 'none'; carSelEl.value = ''; }
    // v384: cat 切替時 (例: express→local) に前 cat の値が残らないよう必ずクリア。
    // 初期 render の local 値は restoreTripEditSegCascade が seg.car_model から書き戻す。
    if (carInpEl) { carInpEl.style.display = 'block'; carInpEl.value = ''; }
    return;
  }
  // 特急など — 列車 dropdown populate
  if (trainRow) trainRow.style.display = 'flex';
  if (carRow) carRow.style.display = 'flex';
  if (tidEl) {
    const trains = ((NORIRECO.trains && NORIRECO.trains.TRAINS) || [])
      .filter(t => t.category === cat)
      .sort((a, b) => {
        if (!!a.discontinued !== !!b.discontinued) return a.discontinued ? 1 : -1;
        return (a.name || '').localeCompare(b.name || '', 'ja');
      });
    let html = '<option value="">列車を選ぶ...</option>';
    for (const t of trains) {
      const disc = t.discontinued ? ' (廃止)' : '';
      const rarity = t.rarity === 'legendary' ? ' ⭐' : (t.rarity === 'rare' ? ' ✨' : '');
      html += `<option value="${t.id}">${t.name}${rarity}${disc}</option>`;
    }
    html += '<option value="__custom__">📝 リストにない (手入力)</option>';
    tidEl.innerHTML = html;
  }
  // train_name_row は __custom__ 選択時のみ show (restore 側で制御)。デフォルトは hide。
  if (trainNameRow) trainNameRow.style.display = 'none';
  // v384: cat 切替時に前 cat の手入力値 (列車名 / 車両形式) が残らないようクリア。
  // 初期 render の値は restoreTripEditSegCascade / populateTripEditSegCarSelect が seg.* から書き戻す。
  if (tnameEl) tnameEl.value = '';
  // car_dropdown は train 未選択なら hide + input のみ。train 選択後に populateTripEditSegCarSelect で切替。
  if (carSelEl) { carSelEl.style.display = 'none'; carSelEl.value = ''; }
  if (carInpEl) { carInpEl.style.display = 'block'; carInpEl.value = ''; }
}

// master 列車を選択したときに、その car_models[] を dropdown に流し込む。
// 既存値 (restoreValue) があれば dropdown / input のどちらかに復元。
function populateTripEditSegCarSelect(idx, trainId, restoreValue) {
  const carSelEl = document.querySelector(`.te-seg-car-select[data-seg-idx="${idx}"]`);
  const carInpEl = document.querySelector(`.te-seg-car[data-seg-idx="${idx}"]`);
  if (!carSelEl) return;
  const train = ((NORIRECO.trains && NORIRECO.trains.TRAINS) || []).find(t => t.id === trainId);
  if (train && Array.isArray(train.car_models) && train.car_models.length > 0) {
    let html = '<option value="">車両形式を選ぶ (任意)...</option>';
    for (const m of train.car_models) html += `<option value="${m}">${m}</option>`;
    html += '<option value="__custom__">📝 リストにない (手入力)</option>';
    carSelEl.innerHTML = html;
    carSelEl.style.display = 'block';
    if (restoreValue && train.car_models.includes(restoreValue)) {
      carSelEl.value = restoreValue;
      if (carInpEl) { carInpEl.style.display = 'none'; carInpEl.value = ''; }
    } else if (restoreValue) {
      carSelEl.value = '__custom__';
      if (carInpEl) { carInpEl.style.display = 'block'; carInpEl.value = restoreValue; }
    } else {
      carSelEl.value = '';
      if (carInpEl) { carInpEl.style.display = 'none'; carInpEl.value = ''; }
    }
  } else {
    // master に car_models 無し → input のみ
    carSelEl.style.display = 'none';
    if (carInpEl) {
      carInpEl.style.display = 'block';
      carInpEl.value = restoreValue || '';
    }
  }
}

// seg の保存済み値 (train_id / train_name / car_model) を DOM に復元。
// applyTripEditSegCategoryVisibility 直後に呼ばれる前提 (dropdown は populate 済)。
function restoreTripEditSegCascade(idx, seg) {
  const cat = seg.train_category || '';
  if (!cat) return;  // 空は visibility helper で初期化済
  const carInpEl = document.querySelector(`.te-seg-car[data-seg-idx="${idx}"]`);
  if (cat === 'local') {
    // v384: visibility helper が carInpEl を unconditionally clear するようになったため、
    // local の car_model 復元は restore 側で seg.car_model から書き戻す。
    if (carInpEl) carInpEl.value = seg.car_model || '';
    return;
  }
  const tidEl = document.querySelector(`.te-seg-train-id[data-seg-idx="${idx}"]`);
  const trainNameRow = document.querySelector(`.te-seg-train-name-row[data-seg-idx="${idx}"]`);
  const tnameEl = document.querySelector(`.te-seg-train-name[data-seg-idx="${idx}"]`);
  if (!tidEl) return;
  if (seg.train_id) {
    tidEl.value = seg.train_id;
    if (trainNameRow) trainNameRow.style.display = 'none';
    if (tnameEl) tnameEl.value = '';
    populateTripEditSegCarSelect(idx, seg.train_id, seg.car_model || null);
  } else if (seg.train_name) {
    tidEl.value = '__custom__';
    if (trainNameRow) trainNameRow.style.display = 'flex';
    if (tnameEl) tnameEl.value = seg.train_name;
    // __custom__ は master 不在 → car は input のみ
    if (carInpEl) { carInpEl.style.display = 'block'; carInpEl.value = seg.car_model || ''; }
  } else {
    tidEl.value = '';
    if (trainNameRow) trainNameRow.style.display = 'none';
    if (tnameEl) tnameEl.value = '';
    if (carInpEl) { carInpEl.style.display = 'block'; carInpEl.value = seg.car_model || ''; }
  }
}

function onTripEditSegCategoryChange(idx) {
  const catEl = document.querySelector(`.te-seg-cat[data-seg-idx="${idx}"]`);
  if (!catEl) return;
  applyTripEditSegCategoryVisibility(idx, catEl.value || '');
}
window.onTripEditSegCategoryChange = onTripEditSegCategoryChange;

function onTripEditSegTrainChange(idx) {
  const tidEl = document.querySelector(`.te-seg-train-id[data-seg-idx="${idx}"]`);
  const trainNameRow = document.querySelector(`.te-seg-train-name-row[data-seg-idx="${idx}"]`);
  const tnameEl = document.querySelector(`.te-seg-train-name[data-seg-idx="${idx}"]`);
  const carSelEl = document.querySelector(`.te-seg-car-select[data-seg-idx="${idx}"]`);
  const carInpEl = document.querySelector(`.te-seg-car[data-seg-idx="${idx}"]`);
  if (!tidEl) return;
  const v = tidEl.value;
  if (v === '__custom__') {
    if (trainNameRow) trainNameRow.style.display = 'flex';
    if (tnameEl) { tnameEl.value = ''; tnameEl.focus(); }
    if (carSelEl) { carSelEl.style.display = 'none'; carSelEl.value = ''; }
    if (carInpEl) { carInpEl.style.display = 'block'; carInpEl.value = ''; }
  } else if (v === '') {
    if (trainNameRow) trainNameRow.style.display = 'none';
    if (tnameEl) tnameEl.value = '';
    if (carSelEl) { carSelEl.style.display = 'none'; carSelEl.value = ''; }
    if (carInpEl) { carInpEl.style.display = 'block'; carInpEl.value = ''; }
  } else {
    if (trainNameRow) trainNameRow.style.display = 'none';
    if (tnameEl) tnameEl.value = '';
    populateTripEditSegCarSelect(idx, v, null);
  }
}
window.onTripEditSegTrainChange = onTripEditSegTrainChange;

function onTripEditSegCarChange(idx) {
  const carSelEl = document.querySelector(`.te-seg-car-select[data-seg-idx="${idx}"]`);
  const carInpEl = document.querySelector(`.te-seg-car[data-seg-idx="${idx}"]`);
  if (!carSelEl) return;
  const v = carSelEl.value;
  if (v === '__custom__') {
    if (carInpEl) { carInpEl.style.display = 'block'; carInpEl.value = ''; carInpEl.focus(); }
  } else {
    if (carInpEl) { carInpEl.style.display = 'none'; carInpEl.value = ''; }
  }
}
window.onTripEditSegCarChange = onTripEditSegCarChange;

// v356: 列車 dropdown 選択時。マスター列車選択 → 列車手入力 hide + train_name input に shadow value セット
//       (saveTripEdit が train_name input から読むため)。"__custom__" 選択 → 列車手入力 show + clear + focus
function onTripEditTrainChange() {
  const trainIdSel   = document.getElementById('trip-edit-train-id');
  const trainNameInp = document.getElementById('trip-edit-train-name');
  if (!trainIdSel || !trainNameInp) return;
  const v = trainIdSel.value;
  if (v === '__custom__') {
    trainNameInp.style.display = 'block';
    trainNameInp.value = '';
    trainNameInp.focus();
  } else if (v === '') {
    trainNameInp.style.display = 'none';
    trainNameInp.value = '';
  } else {
    const train = ((NORIRECO.trains && NORIRECO.trains.TRAINS) || []).find(t => t.id === v);
    trainNameInp.style.display = 'none';
    trainNameInp.value = train ? (train.name || '') : '';
  }
}
window.onTripEditTrainChange = onTripEditTrainChange;

function closeTripEditModal() {
  document.getElementById('trip-edit-modal')?.classList.remove('open');
  // v258: 写真エリアを破棄 (blob URL を revoke)
  if (_tripEditPhotoArea) {
    try { _tripEditPhotoArea.destroy(); } catch (e) {}
    _tripEditPhotoArea = null;
  }
  // v393 (B-2): trip 詳細エディタ (列車種別 / 車両形式) も破棄
  if (_tripEditDetailEditor) {
    try { _tripEditDetailEditor.destroy(); } catch (e) {}
    _tripEditDetailEditor = null;
  }
  // v394 (B-3a): メタエディタ (遅延 + メモ) も破棄
  if (_tripEditMetaEditor) {
    try { _tripEditMetaEditor.destroy(); } catch (e) {}
    _tripEditMetaEditor = null;
  }
}
window.closeTripEditModal = closeTripEditModal;
NORIRECO.mypage.closeTripEditModal = closeTripEditModal;

async function saveTripEdit() {
  const tripId = document.getElementById('trip-edit-id')?.value;
  if (!tripId) { closeTripEditModal(); return; }
  const trip = (NORIRECO.mypage.state._mypageCache || []).find(t => t.id === tripId);
  if (!trip) { alert('旅程が見つかりません'); closeTripEditModal(); return; }

  // v394 (B-3a): delay_minutes / notes は _tripEditMetaEditor.getDraft() 経由で取得。
  //   factory 内の collectDelay (h/m → 分集約、5999 クランプ) / collectNotes (trim、空→null) と同形の正規化。
  let metaDraft = null;
  if (_tripEditMetaEditor) {
    try { metaDraft = _tripEditMetaEditor.getDraft(); }
    catch (e) { console.warn('[saveTripEdit] metaEditor.getDraft() failed:', e); }
  }
  const newDelay = (metaDraft && typeof metaDraft.delay_minutes === 'number') ? metaDraft.delay_minutes : null;
  const newNotes = metaDraft?.notes || null;

  // v345: 「verified を守る」目的のロック撤回。GPS 記録も時刻編集可
  const tripPatch = {};
  {
    const dateRaw = document.getElementById('trip-edit-date')?.value || '';
    const depRaw = document.getElementById('trip-edit-depart')?.value || '';
    const arrRaw = document.getElementById('trip-edit-arrive')?.value || '';
    if (dateRaw) {
      tripPatch.date = dateRaw;
      // 精度判定: depart/arrive どちらか入力されていれば 'minute'、なければ 'day'
      if (depRaw || arrRaw) {
        tripPatch.date_precision = 'minute';
        tripPatch.depart_time = depRaw ? `${depRaw}:00` : '';
        tripPatch.arrive_time = arrRaw ? `${arrRaw}:00` : '';
        // 両方入力で total_minutes 再計算 (日跨ぎ補正)
        if (depRaw && arrRaw) {
          const [dhh, dmm] = depRaw.split(':').map(Number);
          const [ahh, amm] = arrRaw.split(':').map(Number);
          let diff = (ahh * 60 + amm) - (dhh * 60 + dmm);
          if (diff < 0) diff += 24 * 60;
          tripPatch.total_minutes = diff;
        }
      } else {
        // 日付のみ → 既存の精度が minute なら day に下げる。それ以外 (day/month/year/unknown) は据置
        if (trip.date_precision === 'minute') {
          tripPatch.date_precision = 'day';
          tripPatch.depart_time = '';
          tripPatch.arrive_time = '';
          tripPatch.total_minutes = 0;
        }
      }
    }
  }

  // v226 → v356 → v380 → v383 → v393 (B-2): 🚆 列車種別 / 車両形式 —
  //   createTripDetailEditor が per-seg-rows / trip-level の DOM 値を draft に同期。
  //   - per-seg-rows (segments あり): draft.segments[*].train_category/id/name/car_model を引き継ぎ、
  //     trip 直下は集約ルール (全 seg 一致なら値 / 不一致なら null) で再集約。
  //   - trip-level (segments なし): draft.train_category/id/name/car_model をそのまま採用。
  const existingSegs = Array.isArray(trip.segments) ? trip.segments : [];
  const hasPerSegEditor = existingSegs.length > 0;
  let editorDraft = null;
  if (_tripEditDetailEditor) {
    try { editorDraft = _tripEditDetailEditor.getDraft(); }
    catch (e) { console.warn('[saveTripEdit] editor.getDraft() failed:', e); }
  }

  if (hasPerSegEditor) {
    const editorSegs = (editorDraft && Array.isArray(editorDraft.segments)) ? editorDraft.segments : [];
    const newSegments = existingSegs.map((s, i) => {
      const eseg = editorSegs[i] || {};
      return {
        ...s,
        train_category: eseg.train_category || null,
        train_id: eseg.train_id || null,
        train_name: eseg.train_name || null,
        car_model: eseg.car_model || null,
      };
    });
    tripPatch.segments = newSegments;
    const aggSet = (key) => {
      const set = new Set(newSegments.map(s => s[key] || ''));
      return (set.size === 1 && [...set][0]) ? [...set][0] : null;
    };
    tripPatch.train_category = aggSet('train_category');
    tripPatch.train_id = aggSet('train_id');
    tripPatch.train_name = aggSet('train_name');
    tripPatch.car_model = aggSet('car_model');
  } else {
    tripPatch.train_category = editorDraft?.train_category || null;
    tripPatch.train_id = editorDraft?.train_id || null;
    tripPatch.train_name = editorDraft?.train_name || null;
    tripPatch.car_model = editorDraft?.car_model || null;
  }

  // v258: 📷 写真 — 新規 blob を R2 にアップロード → photos[] を最新化
  if (_tripEditPhotoArea) {
    try {
      tripPatch.photos = await _tripEditPhotoArea.uploadAndGetPhotos(tripId);
    } catch (e) {
      alert('写真アップロード失敗: ' + e.message);
      return;
    }
  }

  // NORIRECO.mypage.state._mypageCache 内の trip を直接更新
  Object.assign(trip, tripPatch);
  trip.delay_minutes = newDelay;
  trip.notes = newNotes;

  // localStorage 側も同期更新 (新規エントリだったら追加)
  try {
    const local = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    const idx = local.findIndex(t => t.id === tripId);
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...tripPatch, delay_minutes: newDelay, notes: newNotes };
    } else {
      local.push({ ...trip });
    }
    localStorage.setItem('norireco_trips', JSON.stringify(local));
  } catch (e) {
    console.warn('[マイページ] localStorage 更新失敗:', e.message);
  }

  // v226 → v395: Supabase 側も同期 (date/depart_time/arrive_time/total_minutes/date_precision/train_* は既存列)。
  //   v395 で delay_minutes / notes を tripPatch に含めるよう修正 (Supabase 列は既に存在、REST 確認済)。
  //   v181 のコメント「schema 未拡張のため除外」は誤り (dashboard で列追加後の追従漏れ) — その間
  //   syncFromSupabase が localStorage を null で上書きして編集後リロード時に値消失していた既存バグ。
  tripPatch.delay_minutes = newDelay;
  tripPatch.notes = newNotes;
  let supabaseOk = true;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/norireco_trips?id=eq.${tripId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${authBearerToken()}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(tripPatch),
    });
    if (!res.ok) {
      supabaseOk = false;
      const err = await res.text();
      console.warn('[マイページ] Supabase 更新失敗:', err.slice(0, 200));
    }
  } catch (e) {
    supabaseOk = false;
    console.warn('[マイページ] Supabase 通信エラー:', e.message);
  }

  closeTripEditModal();
  if (typeof renderMpTripsSection === 'function') renderMpTripsSection();
  applyMpSection();
  showMypageToast(supabaseOk ? '✏️ 旅程を保存しました' : '⚠️ ローカルのみ保存 (Supabase 失敗)');
}
window.saveTripEdit = saveTripEdit;
NORIRECO.mypage.saveTripEdit = saveTripEdit;

// v263+: マイページ旅程カード上の写真をドラッグ&ドロップで並び替え (fromIdx → toIdx)
// 編集モーダル不要、Supabase PATCH を直接呼ぶ
async function reorderTripPhotos(tripId, fromIdx, toIdx) {
  const trip = (NORIRECO.mypage.state._mypageCache || []).find(t => t.id === tripId);
  if (!trip) return;
  const photos = Array.isArray(trip.photos) ? [...trip.photos] : [];
  if (fromIdx < 0 || fromIdx >= photos.length || toIdx < 0 || toIdx >= photos.length || fromIdx === toIdx) return;
  const [moved] = photos.splice(fromIdx, 1);
  photos.splice(toIdx, 0, moved);
  trip.photos = photos;

  // localStorage 同期
  try {
    const local = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    const idxL = local.findIndex(t => t.id === tripId);
    if (idxL >= 0) {
      local[idxL].photos = photos;
      localStorage.setItem('norireco_trips', JSON.stringify(local));
    }
  } catch (e) { console.warn('[マイページ] localStorage 写真並び替え失敗:', e.message); }

  // Supabase 同期 (失敗してもローカルは更新済なので再描画は続行)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/norireco_trips?id=eq.${tripId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${authBearerToken()}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ photos }),
    });
    if (!res.ok) {
      console.warn('[マイページ] Supabase 写真並び替え失敗:', await res.text());
    }
  } catch (e) {
    console.warn('[マイページ] Supabase 写真並び替え通信エラー:', e.message);
  }

  // 再描画 (旅程セクションだけ更新)
  if (typeof renderMpTripsSection === 'function') renderMpTripsSection();
}
NORIRECO.mypage.reorderTripPhotos = reorderTripPhotos;

// renderMpTripsSection 末尾から呼ばれる: 全 .mp-tcard-photos に D&D を attach
function attachPhotoDragSortToTripCards(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll('.mp-tcard-photos').forEach((photosEl) => {
    const tripId = photosEl.dataset.tripId;
    if (!tripId) return;
    enableDragSort(photosEl, {
      itemSelector: '.mp-photo-cell',
      onReorder: (oldIdx, newIdx) => reorderTripPhotos(tripId, oldIdx, newIdx),
    });
  });
}
NORIRECO.mypage.attachPhotoDragSortToTripCards = attachPhotoDragSortToTripCards;

function buildTripList(trips) {
  const list = document.createElement('div');
  list.className = 'mp-trip-list';
  list.innerHTML = trips.map(tripCardHtml).join('');
  return list;
}
NORIRECO.mypage.buildTripList = buildTripList;

// v346: GPS 後追い認証 (retroactivelyVerifyTrip) を撤去
// 旅程は片端 500m 以内で全区間 verified 化する loose な実装で、
// キャラ獲得が中間駅にも波及する副作用があった。新方針「GPS = 手間省略」
// で「GPS に変換」自体に意味がなくなり、撤去。
// GPS 記録は記録モードでのみ生成される。手動 trip は手動のまま。

// ── 削除 ───────────────────────────────────────────────────────
async function deleteTripFromMypage(tripId) {
  if (!confirm('この旅程を削除しますか? (元に戻せません)')) return;

  // v267+: 削除前に photos[] を取得して R2 から並列削除 (ベストエフォート、失敗してもログのみ)
  const trip = (NORIRECO.mypage.state._mypageCache || []).find(t => t.id === tripId);
  const photosToDelete = (trip && Array.isArray(trip.photos)) ? trip.photos.filter(p => p && p.url) : [];

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/norireco_trips?id=eq.${tripId}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authBearerToken()}` },
    });
    if (!res.ok) {
      const err = await res.text();
      alert('削除失敗: ' + err.slice(0, 200));
      return;
    }
  } catch (e) {
    alert('通信エラー: ' + e.message);
    return;
  }
  try {
    const existing = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    const next = existing.filter(t => t.id !== tripId);
    localStorage.setItem('norireco_trips', JSON.stringify(next));
  } catch(e) {}

  // v279: 楽観的更新 — _mypageCache から該当 trip を即座に除去。
  // v280: renderMypage() は本ファイルに import されていなかったため
  //       ReferenceError で動いていなかった。Supabase 再 fetch は不要
  //       なので、trip セクション + 完乗率カードを client side で即時再描画する。
  try {
    if (Array.isArray(NORIRECO.mypage.state._mypageCache)) {
      NORIRECO.mypage.state._mypageCache = NORIRECO.mypage.state._mypageCache.filter(t => t.id !== tripId);
    }
  } catch(e) {}

  // v267+: trip 削除成功後に R2 オブジェクトも削除 (非同期 fire-and-forget)
  if (photosToDelete.length > 0) {
    Promise.all(photosToDelete.map(p => deletePhotoByUrl(p.url)))
      .catch(e => console.warn('[マイページ] trip 写真の R2 削除失敗:', e));
  }

  showMypageToast('🗑 削除しました', 'success');

  // v280: 現在表示中のサブタブを即時再描画 (旅程セクションなら件数/一覧が更新される)
  try { applyMpSection(); } catch(e) {}
  // v280: 常時表示の完乗率カードも再計算 (Supabase 再 fetch 不要、client 側で計算)
  try {
    const pinned = document.getElementById('mp-completion-pinned');
    if (pinned && Array.isArray(NORIRECO.data?.SERVICE_LINES) && NORIRECO.data.SERVICE_LINES.length > 0) {
      const tripsForCards = filterTripsByDate(NORIRECO.mypage.state._mypageCache || []);
      pinned.innerHTML = '';
      pinned.appendChild(NORIRECO.mypage.buildCompletionCards(tripsForCards));
    }
  } catch(e) {}
  // v388: マップも即時再描画 — 削除した trip のセグメントが地図上に残らないように。
  //   従来は localStorage 更新だけで RIDDEN_SEGS / slRiddenSt / slStopType / slVisitCount が
  //   stale なまま放置され、リロードしないと駅ドットの大きさ・パイチャート・路線実線/点線が
  //   反映されなかった (ユスケ報告 / 2026-05-27)。
  //   applyDateFilter は localStorage を再読込 → RIDDEN_SEGS 再構築 → rideRecord.rebuild() →
  //   updateOverlays() + drawLines() まで一気に通すので 1 呼び出しで足りる。
  try { applyDateFilter(); } catch(e) {}
  // v388: 駅アクションシートが「この駅を含む旅程」一覧モードで開いていれば
  //   その場でリストを再描画して、削除されたカードを即座に消す。
  //   17-station-actions.js が NORIRECO.stationActions.refreshTripListIfOpen として公開。
  try { NORIRECO.stationActions?.refreshTripListIfOpen?.(); } catch(e) {}
}
window.deleteTripFromMypage = deleteTripFromMypage;
NORIRECO.mypage.deleteTripFromMypage = deleteTripFromMypage;

// v333 (Phase 3): norirecoBackfillTripStationIds は撤去。
//   v311 で 125 件 backfill 完遂、v326 SQL Applied 2026-05-25 で from_station/to_station 列 DROP 済。
//   過去のヘルパー全文は git log 13b-trips.js (v326..v332) を参照。
