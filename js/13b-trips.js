// ══════════════════════════════════════════════════════════════
// マイページ 🚃 旅程サブタブ (v190 分割)
// - 旅程フィルタバー (期間 / 認証 / 種別 / 並び替え)
// - 旅程リスト描画 (tripCardHtml は 13-mypage-common.js)
// - Trip 編集モーダル (メモ・遅延の後追い編集) v184/v185
// - GPS 後追い認証 (半径 500m 以内で verified=true に昇格) v138
// - 旅程削除
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
// ══════════════════════════════════════════════════════════════
import { fraudIsDowngraded } from './11-fraud-detection.js';
import { distMeters, runCharacterGrantCheck } from './03-characters.js';
import { authBearerToken } from './12-auth.js';
import {
  tripCardHtml,
  showMypageToast,
  applyMpSection,
  _MP_SORT_COMPARATORS,
  tripMatchesAnyStation,
  resolveStationQuery,
} from './13-mypage-common.js';
import { filterTripsByDate } from './05-supabase-data.js';
// v258: 旅程の写真添付 (memo と共通の写真エリアコンポーネント)
// v267+: deletePhotoByUrl は trip 削除時の R2 cleanup でも使う
import { createPhotoArea, deletePhotoByUrl } from './18-photo-area.js';
// v263+: マイページ旅程カード上で写真をドラッグ&ドロップ並び替え
import { enableDragSort } from './19-drag-sort.js';

// 旅程編集モーダル内の写真エリアコントローラ (createPhotoArea 戻り値、null = 未生成)
let _tripEditPhotoArea = null;

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
      <label class="mp-filter-lbl">🛡 認証</label>
      <select class="mp-filter-sel" id="mp-fil-auth" onchange="updateMpFilter('auth',this.value)">
        <option value="all" ${NORIRECO.mypage.state.mpTripFilter.auth==='all'?'selected':''}>すべて</option>
        <option value="verified" ${NORIRECO.mypage.state.mpTripFilter.auth==='verified'?'selected':''}>🟢 GPS 記録</option>
        <option value="manual" ${NORIRECO.mypage.state.mpTripFilter.auth==='manual'?'selected':''}>⚪ 手動記録</option>
        <option value="suspicious" ${NORIRECO.mypage.state.mpTripFilter.auth==='suspicious'?'selected':''}>🟡 要確認 (降格)</option>
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
    auth: 'all', period: 'all', category: 'all', sort: 'date_desc', station: '',
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
  const filtered = trips.filter(t => {
    // 認証
    if (NORIRECO.mypage.state.mpTripFilter.auth === 'verified' && !t.verified) return false;
    if (NORIRECO.mypage.state.mpTripFilter.auth === 'manual' && (t.verified || (t.source === 'gps_button' && !t.verified))) return false;
    if (NORIRECO.mypage.state.mpTripFilter.auth === 'suspicious') {
      const downgraded = fraudIsDowngraded(t);
      if (!downgraded) return false;
    }
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
    // v318.1: pref モード時の fallback を「pref を満たす name 候補集合」で絞り込む形に。
    //   id 列 NULL のレガシー trip でも pref 検索が動く (同名異所駅の厳密区別は犠牲)。
    if (_stq && _stResult) {
      const { ids, names, nameToken, hasPrefFilter } = _stResult;
      const predicate = (name, id) => {
        if (id && ids.has(id)) return true;
        if (!name) return false;
        if (!name.includes(nameToken)) return false;
        if (hasPrefFilter) return names.has(name);
        return true;
      };
      if (!tripMatchesAnyStation(t, predicate, _stScope)) return false;
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
// を編集可。📍 区間 は read-only 表示。GPS 記録 (verified=true) は時刻を編集不可にロックして
// 認証性を守る。Supabase 列は全て既存なので localStorage と Supabase の双方に書き戻す。
function openTripEditModal(tripId) {
  const trip = (NORIRECO.mypage.state._mypageCache || []).find(t => t.id === tripId);
  if (!trip) { alert('旅程が見つかりません'); return; }
  const idInp = document.getElementById('trip-edit-id');
  const delayHInp = document.getElementById('trip-edit-delay-h');
  const delayMInp = document.getElementById('trip-edit-delay-m');
  const notesInp = document.getElementById('trip-edit-notes');
  const subTitle = document.getElementById('trip-edit-subtitle');
  if (idInp) idInp.value = tripId;
  // v185: 既存 delay_minutes を 時間+分 に分解してプリセット
  const total = (typeof trip.delay_minutes === 'number' && trip.delay_minutes > 0) ? trip.delay_minutes : 0;
  if (delayHInp) delayHInp.value = total >= 60 ? String(Math.floor(total / 60)) : '';
  if (delayMInp) delayMInp.value = (total % 60) > 0 ? String(total % 60) : (total > 0 && total < 60 ? String(total) : '');
  if (notesInp) notesInp.value = trip.notes || '';
  if (subTitle) {
    const label = trip.name || tripId;
    subTitle.textContent = `${label} を編集します。`;
  }

  // v226: 📍 区間 (read-only 表示)
  const segEl = document.getElementById('trip-edit-segments');
  if (segEl) {
    const segs = Array.isArray(trip.segments) ? trip.segments : [];
    if (segs.length === 0) {
      segEl.innerHTML = `<span style="color:var(--silver)">${trip.from_station || '?'} → ${trip.to_station || '?'}</span>`;
    } else {
      segEl.innerHTML = segs.map((s, i) => {
        const lineLabel = s.lineName || s.lineId || '?';
        return `<div style="margin-bottom:${i < segs.length - 1 ? '4px' : '0'}"><span style="color:var(--gold);font-size:10px">${i+1}.</span> ${s.from || '?'} → ${s.to || '?'} <span style="color:var(--silver);font-size:10px">[${lineLabel}]</span></div>`;
      }).join('');
    }
  }

  // v226: 🕒 乗車時刻 — GPS 記録 (verified=true && source==='gps_button') はロック
  const isVerifiedGps = !!trip.verified && trip.source === 'gps_button';
  const timeLockEl = document.getElementById('trip-edit-time-lock');
  const timeInputsEl = document.getElementById('trip-edit-time-inputs');
  if (timeLockEl) timeLockEl.style.display = isVerifiedGps ? 'block' : 'none';
  if (timeInputsEl) timeInputsEl.style.display = isVerifiedGps ? 'none' : 'block';
  const dateInp = document.getElementById('trip-edit-date');
  const depInp = document.getElementById('trip-edit-depart');
  const arrInp = document.getElementById('trip-edit-arrive');
  if (dateInp) dateInp.value = (trip.date && trip.date_precision !== 'unknown') ? trip.date : '';
  // depart_time / arrive_time は HH:MM:SS 形式。input[type=time] は HH:MM を期待
  const toHm = (v) => (typeof v === 'string' && v.length >= 5) ? v.slice(0, 5) : '';
  if (depInp) depInp.value = toHm(trip.depart_time);
  if (arrInp) arrInp.value = toHm(trip.arrive_time);

  // v226: 🚆 列車種別 — TRAIN_CATEGORIES から category dropdown 構築
  const catSel = document.getElementById('trip-edit-train-category');
  if (catSel) {
    let catHtml = '<option value="">指定しない</option>';
    const cats = (NORIRECO.trains && NORIRECO.trains.TRAIN_CATEGORIES) || {};
    for (const [k, v] of Object.entries(cats)) {
      catHtml += `<option value="${k}">${v.icon || ''} ${v.label || k}</option>`;
    }
    catSel.innerHTML = catHtml;
    catSel.value = trip.train_category || '';
  }
  const trainNameInp = document.getElementById('trip-edit-train-name');
  const carModelInp = document.getElementById('trip-edit-car-model');
  if (trainNameInp) trainNameInp.value = trip.train_name || '';
  if (carModelInp) carModelInp.value = trip.car_model || '';

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

function closeTripEditModal() {
  document.getElementById('trip-edit-modal')?.classList.remove('open');
  // v258: 写真エリアを破棄 (blob URL を revoke)
  if (_tripEditPhotoArea) {
    try { _tripEditPhotoArea.destroy(); } catch (e) {}
    _tripEditPhotoArea = null;
  }
}
window.closeTripEditModal = closeTripEditModal;
NORIRECO.mypage.closeTripEditModal = closeTripEditModal;

async function saveTripEdit() {
  const tripId = document.getElementById('trip-edit-id')?.value;
  if (!tripId) { closeTripEditModal(); return; }
  const trip = (NORIRECO.mypage.state._mypageCache || []).find(t => t.id === tripId);
  if (!trip) { alert('旅程が見つかりません'); closeTripEditModal(); return; }

  // v185: 時間+分 から delay_minutes (分) を算出
  const delayHRaw = document.getElementById('trip-edit-delay-h')?.value;
  const delayMRaw = document.getElementById('trip-edit-delay-m')?.value;
  const notesRaw = document.getElementById('trip-edit-notes')?.value;
  const dh = (delayHRaw !== undefined && delayHRaw !== null && delayHRaw !== '')
    ? Math.max(0, Math.min(99, parseInt(delayHRaw, 10) || 0))
    : 0;
  const dm = (delayMRaw !== undefined && delayMRaw !== null && delayMRaw !== '')
    ? Math.max(0, Math.min(59, parseInt(delayMRaw, 10) || 0))
    : 0;
  const dTotal = dh * 60 + dm;
  const newDelay = (dTotal > 0) ? Math.min(5999, dTotal) : null;
  const newNotes = (notesRaw || '').trim() || null;

  // v226: 🕒 乗車時刻 — GPS 記録は編集ロック、手動記録のみ反映
  const isVerifiedGps = !!trip.verified && trip.source === 'gps_button';
  const tripPatch = {};
  if (!isVerifiedGps) {
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

  // v226: 🚆 列車種別 — category / train_name / car_model (任意)
  const catRaw = document.getElementById('trip-edit-train-category')?.value || '';
  const tnameRaw = (document.getElementById('trip-edit-train-name')?.value || '').trim();
  const carRaw = (document.getElementById('trip-edit-car-model')?.value || '').trim();
  tripPatch.train_category = catRaw || null;
  tripPatch.train_name = tnameRaw || null;
  tripPatch.car_model = carRaw || null;
  // 手動編集では train_id を解決しないため null に倒す (mypage 表示の 📝 マーク = マニア手入力扱い)
  // 既存のマスター選択を維持したい場合は train_name を変えなければ trip.train_id 据置
  if (tnameRaw && tnameRaw !== (trip.train_name || '')) {
    tripPatch.train_id = null;
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

  // v226: Supabase 側も同期 (date/depart_time/arrive_time/total_minutes/date_precision/train_* は既存列)
  // notes / delay_minutes は schema 未拡張のため送信ペイロードから除外
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

// ── GPS 後追い認証 ─────────────────────────────────────────────
async function retroactivelyVerifyTrip(tripId) {
  const trip = (NORIRECO.mypage.state._mypageCache || []).find(t => t.id === tripId);
  if (!trip) { alert('旅程が見つかりません'); return; }
  if (!navigator.geolocation) { alert('このブラウザは GPS 非対応です'); return; }

  showMypageToast('📍 現在地を取得中…');
  let pos;
  try {
    pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    });
  } catch (e) {
    alert('GPS 取得失敗: ' + (e.message || 'permission denied'));
    return;
  }
  const myLat = pos.coords.latitude, myLon = pos.coords.longitude, acc = pos.coords.accuracy;

  // v314 (Phase 3-c): id 優先 + name fallback。Phase 2 で trip に *_station_id が入ったので
  //   同名駅取り違えを防ぐ意味で id を先に試す。バックフィル前の trip (id NULL) は name で救う。
  const findStCoord = (id, nameFallback) => {
    const MS = NORIRECO.data?.MERGED_STATIONS;
    if (Array.isArray(MS)) {
      if (id) {
        const m = MS.find(s => s.id === id);
        if (m && m.lat != null) return [m.lat, m.lon];
      }
      if (nameFallback) {
        const m = MS.find(s => s.name === nameFallback);
        if (m && m.lat != null) return [m.lat, m.lon];
      }
    }
    for (const sl of (NORIRECO.data.SERVICE_LINES || [])) {
      if (!sl.stations) continue;
      if (id) {
        const s = sl.stations.find(x => x.id === id);
        if (s && s.lat != null) return [s.lat, s.lon];
      }
      if (nameFallback) {
        const s = sl.stations.find(x => x.name === nameFallback);
        if (s && s.lat != null) return [s.lat, s.lon];
      }
    }
    return null;
  };
  const fromCoord = findStCoord(trip.from_station_id, trip.from_station);
  const toCoord = findStCoord(trip.to_station_id, trip.to_station);
  if (!fromCoord && !toCoord) {
    alert(`駅座標が見つかりません: ${trip.from_station} / ${trip.to_station}`);
    return;
  }

  const dFrom = fromCoord ? distMeters(myLat, myLon, fromCoord[0], fromCoord[1]) : Infinity;
  const dTo = toCoord ? distMeters(myLat, myLon, toCoord[0], toCoord[1]) : Infinity;
  const minDist = Math.min(dFrom, dTo);
  const VERIFY_RADIUS_M = 500;

  if (minDist > VERIFY_RADIUS_M) {
    const nearer = dFrom < dTo ? trip.from_station : trip.to_station;
    alert(`現在地が遠すぎます (最寄 "${nearer}" まで ${Math.round(minDist)}m)\nこの旅程の駅から半径 ${VERIFY_RADIUS_M}m 以内で再試行してください。`);
    return;
  }

  const nearStation = dFrom < dTo ? trip.from_station : trip.to_station;
  if (!confirm(`✅ "${nearStation}" の近く (${Math.round(minDist)}m) で認証します。よろしいですか?`)) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/norireco_trips?id=eq.${tripId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${authBearerToken()}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ verified: true, gps_lat: myLat, gps_lon: myLon, gps_accuracy: acc }),
    });
    if (!res.ok) {
      const err = await res.text();
      alert('Supabase 更新失敗: ' + err.slice(0, 200));
      return;
    }
  } catch (e) {
    alert('通信エラー: ' + e.message);
    return;
  }

  showMypageToast(`✅ "${nearStation}" で認証完了!`, 'success');
  setTimeout(() => runCharacterGrantCheck(), 600);

  // v281: deleteTripFromMypage と同じく renderMypage() は未 import で ReferenceError。
  //       _mypageCache 内の該当 trip を PATCH と同じ値で楽観更新し、
  //       旅程セクション + 完乗率カードを client 側で即時再描画する。
  try {
    if (Array.isArray(NORIRECO.mypage.state._mypageCache)) {
      const t = NORIRECO.mypage.state._mypageCache.find(t => t.id === tripId);
      if (t) {
        t.verified = true;
        t.gps_lat = myLat;
        t.gps_lon = myLon;
        t.gps_accuracy = acc;
      }
    }
  } catch(e) {}

  try { applyMpSection(); } catch(e) {}
  try {
    const pinned = document.getElementById('mp-completion-pinned');
    if (pinned && Array.isArray(NORIRECO.data?.SERVICE_LINES) && NORIRECO.data.SERVICE_LINES.length > 0) {
      const tripsForCards = filterTripsByDate(NORIRECO.mypage.state._mypageCache || []);
      pinned.innerHTML = '';
      pinned.appendChild(NORIRECO.mypage.buildCompletionCards(tripsForCards));
    }
  } catch(e) {}
}
window.retroactivelyVerifyTrip = retroactivelyVerifyTrip;
NORIRECO.mypage.retroactivelyVerifyTrip = retroactivelyVerifyTrip;

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
}
window.deleteTripFromMypage = deleteTripFromMypage;
NORIRECO.mypage.deleteTripFromMypage = deleteTripFromMypage;
