// ════════════════════════════════════════════
// 記録モード (RECORD MODE)
// - 手動記録: 📝 ボタン経由 (verified=false、source='manual')
// - GPS 記録: 📍 → 「ここから記録開始」経由 (verified=true、source='gps_button')
//
// v217 ES Modules パイロット (案 β) stage 2: `<script type="module">` 化。
// 既存 window 公開 (openRecConfirm 等 11 個) に加え、stage 2 で 6 個追加 (toggleRecordMode /
// onRecordStationClick / saveMultiSegmentTrip / redrawAllLinesAfterTripChange /
// showRecordToast / fitToRiddenLines)。
// ════════════════════════════════════════════

// v223 ES Modules stage 3: 11-fraud-detection と 03-characters を import 化。
// v224: 12-auth.currentUserId を import 化。
// v225: 04-gps-location の 6 関数を import 化。
// v345: 不正検知を撤回 (GPS 記録 = 手間省略の位置づけに変更、世間への証明不要)
import { runCharacterGrantCheck } from './03-characters.js';
import { currentUserId } from './12-auth.js';
// v258: 記録モード保存時の写真添付 (memo / trip 共通の PhotoArea)
import { createPhotoArea } from './18-photo-area.js';

// 記録モード確認モーダル内の写真エリアコントローラ (createPhotoArea 戻り値、null = 未生成)
let _recPhotoArea = null;
import {
  cycleLocationMode,
  stopLocationTracking,
  findNearestStations,
  formatDist,
  updateNearestStationPanel,
  renderRecordingSummary,
  updateLocationButton,
} from './04-gps-location.js';
import { drawLines, updateOverlays } from './08-rendering.js';
import { resetTrainSelector } from './02-data-loaders.js';

// v197 ES Modules パイロット (案 β) — 状態を window.NORIRECO.record に集約。
// 外部 (04 / 06 / 08) からは NORIRECO.record.mode 等のフルパス、内部は R.X の短縮形。
window.NORIRECO = window.NORIRECO || {};
NORIRECO.record = NORIRECO.record || {
  mode: false,                  // 記録モード ON/OFF
  selection: [],                // [{name, lat, lon}] 選択駅列
  highlights: [],               // [{station, marker}] 強調マーカー
  pairLineChoices: new Map(),   // pair index → ユーザー選択 lineId
  segments: [],                 // refreshRecPanel 計算済み区間リスト
  endStationCandidates: [],     // 終了確認モーダルの候補駅
  endStationPickedIdx: 0,
};
const R = NORIRECO.record;

export function toggleRecordMode() {
  R.mode = !R.mode;
  const btn = document.getElementById('rec-btn');
  const panel = document.getElementById('rec-panel');
  btn.classList.toggle('on', R.mode);
  panel.classList.toggle('on', R.mode);
  if (R.mode) {
    // 記録モード突入時刻を必ずセット (GPS 経由でなくても depart_time 計算に使う)
    NORIRECO.gps.recordStartedAt = new Date().toISOString();
    refreshRecPanel();
    if(NORIRECO.map.instance) NORIRECO.map.instance.getContainer().style.cursor='crosshair';
    if (NORIRECO.gps.recordStartedViaGPS) {
      // GPS 記録: ミニマルな最寄駅パネル (記録中) を表示、rec-panel は隠す
      panel.style.display = 'none';
      if (NORIRECO.gps.lastUserGps) {
        updateNearestStationPanel(NORIRECO.gps.lastUserGps.lat, NORIRECO.gps.lastUserGps.lon);
      } else {
        const np = document.getElementById('nearest-station-panel');
        const selectModeEl = document.getElementById('ns-mode-select');
        const recModeEl = document.getElementById('ns-mode-recording');
        if (np && selectModeEl && recModeEl) {
          selectModeEl.style.display = 'none';
          recModeEl.style.display = 'block';
          renderRecordingSummary();
          np.classList.add('show');
        }
      }
    } else {
      // 手動記録 (📝 ボタン経由): 従来の rec-panel UI を表示、最寄駅パネルは隠す
      panel.style.display = '';
      const np = document.getElementById('nearest-station-panel');
      if (np) np.classList.remove('show');
    }
  } else {
    clearRecSelection();
    if(NORIRECO.map.instance) NORIRECO.map.instance.getContainer().style.cursor='';
    // 記録モード終了時に GPS 認証フラグと時刻もリセット
    NORIRECO.gps.recordStartedViaGPS = false;
    NORIRECO.gps.recordStartGPS = null;
    NORIRECO.gps.recordStartedAt = null;
    NORIRECO.gps.recordEndTime = null;
    // rec-panel の inline display をリセット (手動記録で '' にしていたぶん)
    panel.style.display = '';
    // 最寄駅パネルの mode DOM を必ず切替 (NORIRECO.gps.lastUserGps の有無に関わらず)
    const _np = document.getElementById('nearest-station-panel');
    const _selM = document.getElementById('ns-mode-select');
    const _recM = document.getElementById('ns-mode-recording');
    if (_selM) _selM.style.display = 'block';
    if (_recM) _recM.style.display = 'none';
    if (NORIRECO.gps.lastUserGps && NORIRECO.gps.locationMode > 0) {
      // GPS が生きていれば候補リストも更新 (show 状態維持)
      updateNearestStationPanel(NORIRECO.gps.lastUserGps.lat, NORIRECO.gps.lastUserGps.lon);
    } else if (_np) {
      // GPS なしならパネル自体を隠す
      _np.classList.remove('show');
    }
  }
}

function sameStation(a, b) {
  return a.name === b.name && Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lon - b.lon) < 1e-4;
}

export function onRecordStationClick(station) {
  const idx = R.selection.findIndex(s => sameStation(s, station));
  if (idx >= 0) {
    R.selection.splice(idx, 1);
    removeRecordHighlight(station);
  } else {
    R.selection.push(station);
    addRecordHighlight(station);
  }
  refreshRecPanel();
}

function addRecordHighlight(station) {
  const h = L.circleMarker([station.lat, station.lon], {
    radius: 13, color: '#F2A900', weight: 3,
    fill: false, opacity: 1,
    interactive: false,
  }).addTo(NORIRECO.map.instance);
  R.highlights.push({station, marker: h});
}

function removeRecordHighlight(station) {
  const idx = R.highlights.findIndex(h => sameStation(h.station, station));
  if (idx >= 0) {
    NORIRECO.map.instance.removeLayer(R.highlights[idx].marker);
    R.highlights.splice(idx, 1);
  }
}

function clearAllRecordHighlights() {
  R.highlights.forEach(h => { try { NORIRECO.map.instance.removeLayer(h.marker); } catch(e){} });
  R.highlights.length = 0;
}

function clearRecSelection() {
  R.selection.length = 0;
  R.pairLineChoices.clear();
  R.segments = [];
  clearAllRecordHighlights();
  refreshRecPanel();
}

// 選択駅すべてを含む運行系統を返す (営業系統)
function findCommonServiceLines(stations) {
  if (!NORIRECO.data.SERVICE_LINES || NORIRECO.data.SERVICE_LINES.length === 0 || stations.length < 2) return [];
  return NORIRECO.data.SERVICE_LINES.filter(sl => {
    const slNames = new Set(sl.stations.map(s => s.name));
    return stations.every(st => slNames.has(st.name));
  });
}

// 候補リスト群の積集合 (id ベース)
function intersectLineLists(lists) {
  if (!lists || lists.length === 0) return [];
  let inter = lists[0].slice();
  for (let i = 1; i < lists.length; i++) {
    const ids = new Set(lists[i].map(l => l.id));
    inter = inter.filter(l => ids.has(l.id));
  }
  return inter;
}

// 選択駅列から区間リストを構築
// - 連続2駅ペアごとに共通営業系統を見つける
// - 同一路線が連続するペアをマージして1区間にする
// - 路線継続性を優先 (前ペアと同じ路線が候補にあればそれを使う)
// - ユーザー手動選択 (R.pairLineChoices) があれば最優先
function buildSegmentsFromSelection() {
  if (R.selection.length < 2) return [];

  // Step 1: 各ペアの候補を計算
  const pairs = [];
  for (let i = 0; i < R.selection.length - 1; i++) {
    const a = R.selection[i], b = R.selection[i + 1];
    pairs.push({a, b, cands: findCommonServiceLines([a, b])});
  }

  // Step 2: 各ペアの選択 (手動 > 継続性 > 先頭)
  let prevLineId = null;
  const chosen = pairs.map((p, i) => {
    if (p.cands.length === 0) { prevLineId = null; return null; }
    const userPick = R.pairLineChoices.get(i);
    let ln = null;
    if (userPick) ln = p.cands.find(l => l.id === userPick);
    if (!ln && prevLineId) ln = p.cands.find(l => l.id === prevLineId);
    if (!ln) ln = p.cands[0];
    prevLineId = ln.id;
    return ln;
  });

  // Step 3: 同一路線の連続ペアをマージ
  const segs = [];
  let i = 0;
  while (i < pairs.length) {
    if (chosen[i] === null) {
      segs.push({
        error: true,
        from: pairs[i].a, to: pairs[i].b,
        pairIndices: [i],
      });
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < pairs.length && chosen[j + 1] && chosen[j + 1].id === chosen[i].id) {
      j++;
    }
    const cands = intersectLineLists(pairs.slice(i, j + 1).map(p => p.cands));
    segs.push({
      line: chosen[i],
      from: pairs[i].a,
      to: pairs[j].b,
      candidates: cands,
      pairIndices: Array.from({length: j - i + 1}, (_, k) => i + k),
    });
    i = j + 1;
  }
  return segs;
}

// ユーザーが区間の路線を切り替え
function changeSegmentLine(segIdx, newLineId) {
  const seg = R.segments[segIdx];
  if (!seg || !seg.pairIndices) return;
  for (const i of seg.pairIndices) R.pairLineChoices.set(i, newLineId);
  refreshRecPanel();
}

function refreshRecPanel() {
  // 記録中の最寄駅パネル サマリも更新 (rec-panel は v105 で非表示化したが、内部状態は維持)
  if (R.mode) {
    renderRecordingSummary();
  }
  const chipsDiv = document.getElementById('rec-chips');
  const pickDiv = document.getElementById('rec-line-pick');
  const actionsDiv = document.getElementById('rec-actions');
  if (!chipsDiv) return;

  // チップ表示
  if (R.selection.length === 0) {
    chipsDiv.innerHTML = '<span style="color:var(--silver);font-size:11px">駅をタップして 2 駅以上選択してください</span>';
  } else {
    const parts = R.selection.map((s, i) => {
      const cls = i === 0 ? 'from' : (i === R.selection.length - 1 ? 'to' : '');
      const sn = s.name.replace(/'/g, "\\'");
      return `<span class="rec-chip ${cls}" onclick="onRecordStationClick({name:'${sn}',lat:${s.lat},lon:${s.lon}})">${s.name}<span style="color:rgba(255,255,255,.5);margin-left:4px">×</span></span>`;
    });
    chipsDiv.innerHTML = parts.join('<span class="rec-arrow">→</span>');
  }

  pickDiv.innerHTML = '';
  if (R.selection.length >= 2) {
    R.segments = buildSegmentsFromSelection();
    let hasError = false;
    let totalStations = 0;

    R.segments.forEach((seg, idx) => {
      const div = document.createElement('div');
      if (seg.error) {
        hasError = true;
        div.className = 'rec-seg err';
        div.innerHTML = `<span style="color:#ff7070;font-size:11px">⚠️ ${seg.from.name} → ${seg.to.name}: 共通する運行系統がありません(乗換可能な駅を間に追加してください)</span>`;
      } else {
        const ln = seg.line;
        const fromIdx = ln.stations.findIndex(s => s.name === seg.from.name);
        const toIdx = ln.stations.findIndex(s => s.name === seg.to.name);
        const count = Math.abs(toIdx - fromIdx) + 1;
        totalStations += count;
        div.className = 'rec-seg';
        let inner = `<span style="color:${ln.color};font-size:14px">●</span>`;
        if (seg.candidates && seg.candidates.length > 1) {
          const opts = seg.candidates.map(c =>
            `<option value="${c.id}" ${c.id === ln.id ? 'selected' : ''}>${c.name}</option>`
          ).join('');
          inner += `<select class="rec-seg-select" onchange="changeSegmentLine(${idx}, this.value)">${opts}</select>`;
        } else {
          inner += `<span style="font-weight:600;font-size:12px">${ln.name}</span>`;
        }
        inner += `<span style="font-size:10px;color:var(--silver)">${seg.from.name}→${seg.to.name} (${count}駅)</span>`;
        div.innerHTML = inner;
      }
      pickDiv.appendChild(div);
    });

    if (R.segments.length > 0) {
      const summary = document.createElement('div');
      summary.style.cssText = 'margin-top:6px;font-size:11px;color:var(--gold);';
      const transferCount = R.segments.filter(s => !s.error).length - 1;
      summary.textContent = hasError
        ? '⚠️ 未解決区間があります'
        : `合計 ${totalStations}駅 / 乗換 ${Math.max(0, transferCount)}回`;
      pickDiv.appendChild(summary);

      // 手動「終了して確認」 (現在の selection で終了)
      // rec-panel は手動記録専用なので「ここで終了 (GPS)」ボタンは出さない (v116〜)
      const saveBtn = document.createElement('button');
      saveBtn.className = 'rec-save';
      saveBtn.style.cssText = 'background:rgba(140,160,179,.2);color:var(--white);border:1px solid var(--track)';
      saveBtn.disabled = hasError;
      saveBtn.textContent = hasError ? '⚠️ 未解決区間あり' : '✅ 選択中の経路で終了';
      saveBtn.onclick = () => openRecConfirm();
      pickDiv.appendChild(saveBtn);
    }
  }

  actionsDiv.innerHTML = R.selection.length > 0
    ? '<button class="rec-btn clear" onclick="clearRecSelection()">クリア</button>'
    : '';
}

// 経路 (複数区間) を1 trip として保存
// 記録確認モーダル: 終了 → 経路レビュー → 保存 or 戻る or 破棄
function openRecConfirm() {
  if (!R.selection || R.selection.length === 0) {
    alert('記録する駅がありません');
    return;
  }
  // 終了時刻をキャプチャ (まだ設定されていなければ)
  if (!NORIRECO.gps.recordEndTime) NORIRECO.gps.recordEndTime = new Date().toISOString();
  const isVisitOnly = R.selection.length === 1 && (!R.segments || R.segments.length === 0);
  if (!isVisitOnly && R.segments && R.segments.some(s => s.error)) {
    alert('未解決の区間があります');
    return;
  }
  const body = document.getElementById('rec-confirm-body');
  if (!body) return;
  const verifiedBadge = NORIRECO.gps.recordStartedViaGPS
    ? '<span class="rec-confirm-verified-badge">📍 GPS</span>'
    : '<span class="rec-confirm-verified-badge" style="background:rgba(140,160,179,.15);color:var(--silver);border-color:var(--track)">📝 手動</span>';

  // 時刻情報行 (depart_time / arrive_time / total_minutes プレビュー)
  // GPS 経由なら NORIRECO.gps.recordStartGPS.timestamp、それ以外は手動入力の精度に応じて更新される
  const startTs = (NORIRECO.gps.recordStartGPS && NORIRECO.gps.recordStartGPS.timestamp) || NORIRECO.gps.recordStartedAt;
  // プレースホルダのみ作成 (中身は updateRecConfirmTimeRow が埋める)
  // openRecConfirm の末尾で精度に応じて中身が動的に書き換わる
  const timeRowHtml = `<div class="rec-confirm-stat-row" id="rec-confirm-time-row" style="display:none">
      <span class="rec-confirm-stat-lbl" id="rec-confirm-time-lbl">🕒 時刻</span>
      <span class="rec-confirm-stat-val" id="rec-confirm-time-val"></span>
    </div>`;

  if (isVisitOnly) {
    // 1駅のみ「訪問」記録
    const st = R.selection[0];
    body.innerHTML = `
      <div class="rec-confirm-route" style="border-left-color:#1A6FE5">
        <div class="rec-confirm-seg">
          <span class="rec-confirm-seg-dot" style="background:#1A6FE5"></span>
          <span><b>${st.name}駅</b> に立ち寄り</span>
        </div>
      </div>
      <div class="rec-confirm-stat-row">
        <span class="rec-confirm-stat-lbl">📍 訪問駅</span>
        <span class="rec-confirm-stat-val">${st.name}</span>
      </div>
      ${timeRowHtml}
      <div class="rec-confirm-stat-row">
        <span class="rec-confirm-stat-lbl">🛡 認証</span>
        <span class="rec-confirm-stat-val">${verifiedBadge}</span>
      </div>
    `;
  } else {
    // 通常: 複数区間の経路
    let totalStations = 0;
    const lineNames = [];
    for (const seg of R.segments) {
      if (!seg.line) continue;
      const fromIdx = seg.line.stations.findIndex(s => s.name === seg.from.name);
      const toIdx = seg.line.stations.findIndex(s => s.name === seg.to.name);
      if (fromIdx < 0 || toIdx < 0) continue;
      totalStations += Math.abs(toIdx - fromIdx) + 1;
      if (lineNames[lineNames.length - 1] !== seg.line.name) lineNames.push(seg.line.name);
    }
    const fromSt = R.selection[0]?.name || '?';
    const toSt = R.selection[R.selection.length - 1]?.name || '?';
    const routeHtml = R.segments.map(seg => {
      if (!seg.line) return '';
      return `<div class="rec-confirm-seg">
        <span class="rec-confirm-seg-dot" style="background:${seg.line.color}"></span>
        <span><b>${seg.line.name}</b> &nbsp; ${seg.from.name} → ${seg.to.name}</span>
      </div>`;
    }).join('');
    body.innerHTML = `
      <div class="rec-confirm-route">${routeHtml}</div>
      <div class="rec-confirm-stat-row">
        <span class="rec-confirm-stat-lbl">📍 区間</span>
        <span class="rec-confirm-stat-val">${fromSt} → ${toSt}</span>
      </div>
      <div class="rec-confirm-stat-row">
        <span class="rec-confirm-stat-lbl">🚉 駅数 / 区間</span>
        <span class="rec-confirm-stat-val">${totalStations}駅 / ${R.segments.length}区間</span>
      </div>
      ${timeRowHtml}
      <div class="rec-confirm-stat-row">
        <span class="rec-confirm-stat-lbl">🛡 認証</span>
        <span class="rec-confirm-stat-val">${verifiedBadge}</span>
      </div>
    `;
  }
  // 保存ボタンのラベルを記録種別に応じて切替
  const saveBtn = document.getElementById('rec-confirm-save-btn');
  if (saveBtn) {
    saveBtn.textContent = NORIRECO.gps.recordStartedViaGPS
      ? '💾 GPS で保存する'
      : '💾 手動で保存する';
  }
  // 時刻編集セクション: 手動記録のときだけ表示、初期値は記録モード突入時刻
  const timeSec = document.getElementById('rec-time-edit-section');
  if (timeSec) {
    if (NORIRECO.gps.recordStartedViaGPS) {
      timeSec.style.display = 'none';
    } else {
      timeSec.style.display = '';
      // 精度セレクタは minute (正確な時刻) で初期化
      const precSel = document.getElementById('rec-edit-precision');
      if (precSel) precSel.value = 'minute';
      // 年/月セレクタを populate
      _populateRecEditYearMonth();
      // minute 用の入力初期値
      const dateInp = document.getElementById('rec-edit-date');
      const depInp = document.getElementById('rec-edit-depart');
      const arrInp = document.getElementById('rec-edit-arrive');
      if (startTs) {
        const sd = new Date(startTs);
        const ymd = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
        if (dateInp) dateInp.value = ymd;
        if (depInp) depInp.value = sd.toTimeString().slice(0,5);
      } else {
        if (dateInp) dateInp.value = (typeof localDateStr === 'function') ? localDateStr() : new Date().toISOString().slice(0,10);
        if (depInp) depInp.value = '';
      }
      if (arrInp) {
        const endTs = NORIRECO.gps.recordEndTime || new Date().toISOString();
        const ed = new Date(endTs);
        arrInp.value = ed.toTimeString().slice(0,5);
      }
      // 行の表示状態をデフォルト (minute) に
      onRecEditPrecisionChange();
    }
  }
  // 確認モーダル上部の 🕒 時刻行を確実に更新 (GPS 記録は実時刻、手動はプレースホルダ非表示)
  updateRecConfirmTimeRow();
  document.getElementById('rec-confirm-modal')?.classList.add('open');
  // 列車セレクタをリセット (前回の選択を持ち越さない)
  resetTrainSelector();
  // v347: 「列車・車両形式」トグルを localStorage から復元 + 区間→候補車両ピッカー初期化
  initRecTrainToggle();
  // メモ・遅延もリセット (前回値を持ち越さない) — v185: 時間+分の 2 input
  const delayHInp = document.getElementById('rec-edit-delay-h');
  const delayMInp = document.getElementById('rec-edit-delay-m');
  const notesInp = document.getElementById('rec-edit-notes');
  if (delayHInp) delayHInp.value = '';
  if (delayMInp) delayMInp.value = '';
  if (notesInp) notesInp.value = '';

  // v258: 📷 写真エリアもリセット (空のエリアを再生成、blob URL 既存ぶんは destroy で revoke)
  if (_recPhotoArea) {
    try { _recPhotoArea.destroy(); } catch (e) {}
    _recPhotoArea = null;
  }
  const photoContainer = document.getElementById('rec-photo-container');
  if (photoContainer) {
    _recPhotoArea = createPhotoArea({
      container: photoContainer,
      kind: 'trip',
      getOwnerId: () => null, // trip_id は保存時に確定するので uploadAndGetPhotos に直接渡す
      initialPhotos: [],
      maxCount: 5,
    });
  }
}

function closeRecConfirm() {
  // 「戻って編集」: モーダル閉じる、R.mode はそのまま、selection 保持
  document.getElementById('rec-confirm-modal')?.classList.remove('open');
}

async function confirmAndSaveRecord() {
  // 「保存」: モーダル閉じてから既存の保存ロジックを呼ぶ
  document.getElementById('rec-confirm-modal')?.classList.remove('open');
  await saveMultiSegmentTrip();
}

function discardRecord() {
  // 「破棄」: 確認 + 全部リセット
  if (!confirm('記録中の経路を破棄します。よろしいですか？')) return;
  document.getElementById('rec-confirm-modal')?.classList.remove('open');
  NORIRECO.gps.recordStartedViaGPS = false;
  NORIRECO.gps.recordStartGPS = null;
  NORIRECO.gps.recordEndTime = null;
  // v258: 写真エリアも破棄 (blob URL を revoke)
  if (_recPhotoArea) {
    try { _recPhotoArea.destroy(); } catch (e) {}
    _recPhotoArea = null;
  }
  if (R.mode) toggleRecordMode(); // off に
  showRecordToast('🗑 記録を破棄しました', 'warn', 2500);
}

window.openRecConfirm = openRecConfirm;
window.closeRecConfirm = closeRecConfirm;
window.confirmAndSaveRecord = confirmAndSaveRecord;
window.discardRecord = discardRecord;

// 乗車日時編集セクション — 精度セレクタによる表示切替 / 年月セレクタ populate
function onRecEditPrecisionChange() {
  const sel = document.getElementById('rec-edit-precision');
  if (!sel) return;
  const v = sel.value;
  const set = (id, show) => {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
  };
  set('rec-edit-date-row',    v === 'minute' || v === 'day');
  set('rec-edit-time-row',    v === 'minute');
  set('rec-edit-month-row',   v === 'month');
  set('rec-edit-year-row',    v === 'year');
  set('rec-edit-unknown-row', v === 'unknown');
  // 確認モーダル上部の 🕒 時刻行も精度に合わせて更新
  updateRecConfirmTimeRow();
}
window.onRecEditPrecisionChange = onRecEditPrecisionChange;

// 確認モーダル上部の 🕒 時刻行を、記録種別 + 精度 + 入力値に応じて書き換え
function updateRecConfirmTimeRow() {
  const row = document.getElementById('rec-confirm-time-row');
  const lbl = document.getElementById('rec-confirm-time-lbl');
  const val = document.getElementById('rec-confirm-time-val');
  if (!row || !lbl || !val) return;

  // GPS 記録: 実 GPS 時刻を表示
  if (NORIRECO.gps.recordStartedViaGPS) {
    const startTs = (NORIRECO.gps.recordStartGPS && NORIRECO.gps.recordStartGPS.timestamp) || NORIRECO.gps.recordStartedAt;
    if (!startTs) { row.style.display = 'none'; return; }
    const sd = new Date(startTs);
    const ed = NORIRECO.gps.recordEndTime ? new Date(NORIRECO.gps.recordEndTime) : new Date();
    const mins = Math.max(0, Math.round((ed - sd) / 60000));
    lbl.textContent = '🕒 乗車時刻';
    val.textContent = `${sd.toTimeString().slice(0,5)} → ${ed.toTimeString().slice(0,5)} (${mins}分)`;
    row.style.display = '';
    return;
  }

  // 手動記録: 精度セレクタの値に応じて表現を変える
  const prec = document.getElementById('rec-edit-precision')?.value || 'minute';
  if (prec === 'minute') {
    const dep = document.getElementById('rec-edit-depart')?.value;
    const arr = document.getElementById('rec-edit-arrive')?.value;
    const date = document.getElementById('rec-edit-date')?.value;
    if (dep && arr) {
      const [dh,dm] = dep.split(':').map(Number);
      const [ah,am] = arr.split(':').map(Number);
      let diff = (ah*60+am) - (dh*60+dm);
      if (diff < 0) diff += 24*60;
      lbl.textContent = '🕒 乗車時刻';
      val.textContent = `${date || ''} ${dep} → ${arr} (${diff}分)`;
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  } else if (prec === 'day') {
    const date = document.getElementById('rec-edit-date')?.value;
    if (date) {
      lbl.textContent = '📅 乗車日';
      val.textContent = date;
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  } else if (prec === 'month') {
    const y = document.getElementById('rec-edit-year-m')?.value;
    const m = document.getElementById('rec-edit-month-m')?.value;
    if (y && m) {
      lbl.textContent = '🗓 乗車月';
      val.textContent = `${y}年${parseInt(m,10)}月ごろ`;
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  } else if (prec === 'year') {
    const y = document.getElementById('rec-edit-year-y')?.value;
    if (y) {
      lbl.textContent = '📆 乗車年';
      val.textContent = `${y}年ごろ`;
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  } else if (prec === 'unknown') {
    lbl.textContent = '❓ 日時';
    val.textContent = '不明（記録時刻のみ保存）';
    row.style.display = '';
  }
}
window.updateRecConfirmTimeRow = updateRecConfirmTimeRow;

// 年/月 セレクタを過去 20 年で populate (一度だけ)
function _populateRecEditYearMonth() {
  const now = new Date();
  const curY = now.getFullYear();
  const startY = curY - 20;
  const populateYear = (id) => {
    const sel = document.getElementById(id);
    if (!sel || sel.options.length > 0) return;
    for (let y = curY; y >= startY; y--) {
      const o = document.createElement('option');
      o.value = String(y); o.textContent = String(y);
      sel.appendChild(o);
    }
  };
  populateYear('rec-edit-year-m');
  populateYear('rec-edit-year-y');
  const mSel = document.getElementById('rec-edit-month-m');
  if (mSel && mSel.options.length === 0) {
    for (let m = 1; m <= 12; m++) {
      const o = document.createElement('option');
      o.value = String(m).padStart(2,'0'); o.textContent = String(m);
      mSel.appendChild(o);
    }
  }
  // デフォルト: 今年・今月
  const yM = document.getElementById('rec-edit-year-m');
  const mM = document.getElementById('rec-edit-month-m');
  const yY = document.getElementById('rec-edit-year-y');
  if (yM && !yM.value) yM.value = String(curY);
  if (mM && !mM.value) mM.value = String(now.getMonth()+1).padStart(2,'0');
  if (yY && !yY.value) yY.value = String(curY);
}

// ─ 「📍 ここで終了 (GPS)」: 現在地から終点駅を選んで確認モーダルへ ─
// R.endStationCandidates / R.endStationPickedIdx は NORIRECO.record に集約済み (v197)

function endRecordAtNearest() {
  if (!R.mode) { alert('記録モード中ではありません'); return; }
  if (!NORIRECO.gps.lastUserGps) {
    if (NORIRECO.gps.locationMode === 0) {
      // 位置情報 OFF だったらまず ON にする
      cycleLocationMode();
      alert('📍 位置情報を取得しています。GPS が取れたらもう一度「ここで終了」を押してください。');
      return;
    }
    alert('現在地を取得中です。少し待ってからもう一度お試しください。');
    return;
  }
  const nearby = findNearestStations(NORIRECO.gps.lastUserGps.lat, NORIRECO.gps.lastUserGps.lon, 1500, 6);
  if (nearby.length === 0) {
    alert('1.5km 以内に駅が見つかりません');
    return;
  }
  R.endStationCandidates = nearby;
  R.endStationPickedIdx = 0;
  // 既に選択済みの駅と同じだったら先頭以外をデフォルト選択
  const lastSelected = R.selection[R.selection.length - 1]?.name;
  if (lastSelected && nearby[0].station.name === lastSelected && nearby.length > 1) {
    R.endStationPickedIdx = 1;
  }

  const listEl = document.getElementById('end-station-list');
  if (!listEl) return;
  listEl.innerHTML = nearby.map((n, idx) => {
    const lineIds = n.station.lines || [];
    const lineNames = lineIds.slice(0, 3).map(lid => {
      const sl = (NORIRECO.data.SERVICE_LINES || []).find(x => x.id === lid);
      return sl ? sl.name : lid;
    }).filter(Boolean).join('・');
    const more = lineIds.length > 3 ? ` ほか${lineIds.length - 3}` : '';
    const isSame = n.station.name === lastSelected;
    const checked = idx === R.endStationPickedIdx ? 'checked' : '';
    const selClass = idx === R.endStationPickedIdx ? ' selected' : '';
    const sameHint = isSame ? '<span style="color:rgba(140,160,179,.6);font-size:9px;margin-left:6px">(出発駅と同じ)</span>' : '';
    return `
      <label class="ns-cand${selClass}" onclick="selectEndStationCand(${idx})">
        <input type="radio" name="es-pick" ${checked}>
        <div class="ns-cand-info">
          <div class="ns-cand-name">${n.station.name}${sameHint}</div>
          <div class="ns-cand-meta">
            <span class="ns-cand-dist">${formatDist(n.distance)}</span>
            <span class="ns-cand-lines">${lineNames}${more}</span>
          </div>
        </div>
      </label>
    `;
  }).join('');
  document.getElementById('end-station-modal')?.classList.add('open');
}

function selectEndStationCand(idx) {
  R.endStationPickedIdx = idx;
  document.querySelectorAll('#end-station-list .ns-cand').forEach((el, i) => {
    el.classList.toggle('selected', i === idx);
    const radio = el.querySelector('input[type=radio]');
    if (radio) radio.checked = (i === idx);
  });
}

function closeEndStation() {
  document.getElementById('end-station-modal')?.classList.remove('open');
}

function confirmEndStation() {
  if (!R.endStationCandidates || R.endStationCandidates.length === 0) return;
  const picked = R.endStationCandidates[R.endStationPickedIdx] || R.endStationCandidates[0];
  // 「ここで終了」押下時刻をキャプチャ (実際の到着時刻)
  NORIRECO.gps.recordEndTime = new Date().toISOString();
  // 末尾区間がエラー (= 前回の終点が解決不能) なら末尾駅を外してから選び直す
  // これで「終点を選び直す」UX が成立する
  if (R.selection.length >= 2 && R.segments && R.segments.length > 0
      && R.segments[R.segments.length - 1].error) {
    const stale = R.selection[R.selection.length - 1];
    onRecordStationClick(stale); // toggle off
  }
  const lastSelected = R.selection[R.selection.length - 1]?.name;
  // 出発駅と同じ駅を選んだら 1駅訪問記録扱い (R.segments は空のまま)
  if (picked.station.name !== lastSelected) {
    onRecordStationClick({
      name: picked.station.name,
      lat: picked.station.lat,
      lon: picked.station.lon,
    });
  }
  closeEndStation();
  // refreshRecPanel が呼ばれ R.segments 更新後に確認モーダル表示
  setTimeout(() => openRecConfirm(), 100);
}

window.endRecordAtNearest = endRecordAtNearest;
window.selectEndStationCand = selectEndStationCand;
window.closeEndStation = closeEndStation;
window.confirmEndStation = confirmEndStation;

// Supabase スキーマ未拡張のフィールドを送信時に除外 (列追加されたら撤去)
// v122→v123 で認証フィールド向けに同じパターンを使い、列追加後に撤去した前例あり
// 現状: notes / delay_minutes (v181)
function tripForSupabase(trip) {
  const { notes, delay_minutes, ...rest } = trip;
  return rest;
}
window.tripForSupabase = tripForSupabase;

async function saveMultiSegmentTrip() {
  if (!R.selection || R.selection.length === 0) return;
  const isVisitOnly = R.selection.length === 1 && (!R.segments || R.segments.length === 0);
  if (!isVisitOnly && R.segments && R.segments.some(s => s.error)) {
    alert('未解決の区間があります'); return;
  }
  const tripSegments = [];
  let totalStations = 0;
  const lineNames = [];
  if (!isVisitOnly) {
    for (const seg of R.segments) {
      if (!seg.line) continue;
      const fromIdx = seg.line.stations.findIndex(s => s.name === seg.from.name);
      const toIdx = seg.line.stations.findIndex(s => s.name === seg.to.name);
      if (fromIdx < 0 || toIdx < 0) continue;
      totalStations += Math.abs(toIdx - fromIdx) + 1;
      if (lineNames[lineNames.length - 1] !== seg.line.name) lineNames.push(seg.line.name);
      // v310 (Phase 2-a): seg.line.stations[].id は v293 で付与済み。
      // seg.line が特定済みなので同名駅問題に当たらず一意に id 化できる。
      const fromStId = seg.line.stations[fromIdx].id || null;
      const toStId = seg.line.stations[toIdx].id || null;
      tripSegments.push({
        lineId: seg.line.id,
        from: seg.from.name, to: seg.to.name,
        from_id: fromStId, to_id: toStId,
      });
    }
    if (tripSegments.length === 0) { alert('保存できる区間がありません'); return; }
  } else {
    totalStations = 1;
  }

  const fromStation = R.selection[0].name;
  const toStation = R.selection[R.selection.length - 1].name;
  // v310 (Phase 2-a): trip 全体の始終駅 id
  //   - 通常 (segments あり): 最初/最後の segment の id を使う (同名駅問題回避)
  //   - isVisitOnly: R.selection[0] の lat/lon + name で MERGED_STATIONS を絞り込む
  let fromStationId = null;
  let toStationId = null;
  if (!isVisitOnly && tripSegments.length > 0) {
    fromStationId = tripSegments[0].from_id || null;
    toStationId = tripSegments[tripSegments.length - 1].to_id || null;
  } else if (isVisitOnly) {
    const s0 = R.selection[0];
    const MS = NORIRECO.data?.MERGED_STATIONS;
    if (Array.isArray(MS) && s0) {
      const ms = MS.find(m => m.name === s0.name
        && Math.abs(m.lat - s0.lat) < 1e-5 && Math.abs(m.lon - s0.lon) < 1e-5);
      fromStationId = ms?.id || null;
      toStationId = fromStationId;
    }
  }
  const lineList = lineNames.join(' ▸ ');
  const tripName = isVisitOnly
    ? `${fromStation} 訪問`
    : (tripSegments.length === 1
        ? `${lineNames[0]} ${fromStation}→${toStation}`
        : `${lineList} ${fromStation}→${toStation}`);

  // 時刻計算 (GPS 発進時に start, 「ここで終了」押下時に end をキャプチャ)
  // GPS 経由でなくても記録モード突入時刻 (NORIRECO.gps.recordStartedAt) を depart_time に使う
  const today = localDateStr();  // 端末ローカル日付 (JST) — UTC だと早朝記録が前日になるため
  const startTs = (NORIRECO.gps.recordStartGPS && NORIRECO.gps.recordStartGPS.timestamp) || NORIRECO.gps.recordStartedAt;
  const endTs = NORIRECO.gps.recordEndTime || new Date().toISOString();
  let departTime = '';
  let arriveTime = '';
  let totalMinutes = 0;
  let tripDate = today; // 既定: 今日 (ローカル)
  if (startTs) {
    const startDate = new Date(startTs);
    departTime = startDate.toTimeString().slice(0, 8); // HH:MM:SS
    // 日付も開始時刻基準に上書き (午前0時跨ぎ対応) — ローカル日付で保存
    tripDate = localDateStr(startDate);
  }
  if (endTs) {
    const endDate = new Date(endTs);
    arriveTime = endDate.toTimeString().slice(0, 8);
    if (startTs) {
      const startDate = new Date(startTs);
      totalMinutes = Math.max(0, Math.round((endDate - startDate) / 60000));
    }
  }
  // 手動記録: 精度セレクタで選んだ粒度に応じて trip フィールドを構築
  // (GPS 記録は実時刻が正確なので上書きしない)
  let datePrecision = 'day';
  if (!NORIRECO.gps.recordStartedViaGPS) {
    const prec = document.getElementById('rec-edit-precision')?.value || 'minute';
    if (prec === 'minute') {
      const editDate = document.getElementById('rec-edit-date')?.value;
      const editDep = document.getElementById('rec-edit-depart')?.value;
      const editArr = document.getElementById('rec-edit-arrive')?.value;
      if (editDate) tripDate = editDate;
      if (editDep) departTime = `${editDep}:00`;
      if (editArr) arriveTime = `${editArr}:00`;
      datePrecision = (editDep || editArr) ? 'minute' : 'day';
      // 出発・到着両方入力されたら所要分を再計算 (日跨ぎ補正)
      if (editDep && editArr) {
        const [dh,dm] = editDep.split(':').map(Number);
        const [ah,am] = editArr.split(':').map(Number);
        let diff = (ah*60+am) - (dh*60+dm);
        if (diff < 0) diff += 24*60;
        totalMinutes = diff;
      }
    } else if (prec === 'day') {
      const editDate = document.getElementById('rec-edit-date')?.value;
      if (editDate) tripDate = editDate;
      departTime = ''; arriveTime = ''; totalMinutes = 0;
      datePrecision = 'day';
    } else if (prec === 'month') {
      const y = document.getElementById('rec-edit-year-m')?.value;
      const m = document.getElementById('rec-edit-month-m')?.value;
      if (y && m) {
        tripDate = `${y}-${m}-01`;
        departTime = ''; arriveTime = ''; totalMinutes = 0;
        datePrecision = 'month';
      }
    } else if (prec === 'year') {
      const y = document.getElementById('rec-edit-year-y')?.value;
      if (y) {
        tripDate = `${y}-01-01`;
        departTime = ''; arriveTime = ''; totalMinutes = 0;
        datePrecision = 'year';
      }
    } else if (prec === 'unknown') {
      // 日時不明: date を null にすると Supabase の NOT NULL 制約で失敗するため、
      // 保存日 (recorded_at の日付) を入れておく。フィルタは date_precision='unknown' で別途除外
      tripDate = today;
      departTime = ''; arriveTime = ''; totalMinutes = 0;
      datePrecision = 'unknown';
    }
  }
  // 後追い記録モード拡張: メモ・遅延 (v181, v185 で時間+分対応)
  // 空 input は null として保存 (Supabase 側のフィルタ/表示で扱いやすい)
  const delayHRaw = document.getElementById('rec-edit-delay-h')?.value;
  const delayMRaw = document.getElementById('rec-edit-delay-m')?.value;
  const notesRaw = document.getElementById('rec-edit-notes')?.value;
  const delayH = (delayHRaw !== undefined && delayHRaw !== null && delayHRaw !== '')
    ? Math.max(0, Math.min(99, parseInt(delayHRaw, 10) || 0))
    : 0;
  const delayM = (delayMRaw !== undefined && delayMRaw !== null && delayMRaw !== '')
    ? Math.max(0, Math.min(59, parseInt(delayMRaw, 10) || 0))
    : 0;
  const delayTotal = delayH * 60 + delayM;
  const delayMinutes = (delayTotal > 0) ? Math.min(5999, delayTotal) : null;
  const tripNotes = (notesRaw || '').trim() || null;

  const tripId = `trip_${Date.now()}`;

  // v258: 📷 写真添付があれば R2 にアップロードして public URL を確定
  // 失敗したら保存全体をキャンセル (一部アップロード済の R2 オブジェクトはゴミとして残るが、
  // trip 自体は保存されないのでフロントから到達不能になる。将来の cleanup ジョブで掃除)
  let tripPhotos = [];
  if (_recPhotoArea && _recPhotoArea.getItemCount() > 0) {
    try {
      tripPhotos = await _recPhotoArea.uploadAndGetPhotos(tripId);
    } catch (e) {
      alert('写真アップロード失敗: ' + e.message + '\n保存をキャンセルしました。');
      return;
    }
  }

  const trip = {
    id: tripId, date: tripDate, name: tripName,
    photos: tripPhotos,
    // v326 (Phase 3): from_station / to_station (name) への並行書き込みを撤去、id のみ。
    //   既存 trip の name 列は v326 SQL DROP で除去予定。表示は MERGED_STATIONS から逆引き。
    from_station_id: fromStationId, to_station_id: toStationId,
    total_stations: totalStations,
    transfers: Math.max(0, tripSegments.length - 1),
    line_list: lineList,
    total_minutes: totalMinutes,
    depart_time: departTime,
    arrive_time: arriveTime,
    segments: tripSegments,
    // 認証グラデーション (Notion §記録モード設計)
    // GPS 発進 (「ここから記録開始」経由) なら verified=true、それ以外は manual
    source: NORIRECO.gps.recordStartedViaGPS ? 'gps_button' : 'manual',
    verified: !!NORIRECO.gps.recordStartedViaGPS,
    gps_lat: NORIRECO.gps.recordStartGPS ? NORIRECO.gps.recordStartGPS.lat : null,
    gps_lon: NORIRECO.gps.recordStartGPS ? NORIRECO.gps.recordStartGPS.lon : null,
    gps_accuracy: NORIRECO.gps.recordStartGPS ? NORIRECO.gps.recordStartGPS.accuracy : null,
    recorded_at: new Date().toISOString(),
    date_precision: datePrecision,
    // 列車種別 (任意、確認モーダルで選択 or 手入力)
    // train_id IS NULL かつ train_name IS NOT NULL = マニア手入力 (後でマスター調査・追加用)
    train_id: NORIRECO.trains.selectedTrainId,
    train_name: NORIRECO.trains.selectedTrainName,
    train_category: NORIRECO.trains.selectedTrainCategory,
    car_model: NORIRECO.trains.selectedCarModel,
    // 後追い記録モード拡張 (v181): メモ・遅延 — Supabase スキーマ追加待ちのため
    // tripForSupabase() で送信時に除外。localStorage には保存される
    notes: tripNotes,
    delay_minutes: delayMinutes,
    // 所有者 (ログイン中なら uid、未ログインなら null → 初回ログイン時 backfill 対象)
    user_id: currentUserId(),
  };

  let saved = false;
  let errInfo = '';
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/norireco_trips`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(tripForSupabase(trip)),
    });
    if (res.ok) {
      saved = true;
    } else {
      let errBody = '';
      try { errBody = await res.text(); } catch(e) {}
      errInfo = `HTTP ${res.status} ${res.statusText}: ${errBody.slice(0, 200)}`;
      console.warn('[乗レコ] Supabase 保存失敗', errInfo);
    }
  } catch (e) {
    errInfo = `接続エラー: ${e.name}: ${e.message}`;
    console.warn('[乗レコ] Supabase 接続エラー:', e);
  }

  try {
    const existing = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    existing.push(trip);
    localStorage.setItem('norireco_trips', JSON.stringify(existing));
  } catch (e) { console.warn('[乗レコ] localStorage 保存失敗:', e); }

  for (const seg of tripSegments) RIDDEN_SEGS.push(seg);
  NORIRECO.rideRecord.rebuild();
  redrawAllLinesAfterTripChange();
  updateOverlays();

  if (saved) {
    // 記録バッジ: GPS=📍 / 手動=📝
    const recTag = trip.verified ? ' 📍' : ' 📝';
    const summary = isVisitOnly
      ? `${fromStation} に立ち寄り`
      : `${tripSegments.length}区間 ${totalStations}駅`;
    showRecordToast(`✅ 記録${recTag}: ${summary}`);
  } else {
    showRecordToast(`⚠️ ローカル保存のみ (Supabase 失敗)\n${errInfo}`, 'warn', 9000);
  }
  // 保存後に GPS 認証フラグと時刻をリセット
  NORIRECO.gps.recordStartedViaGPS = false;
  NORIRECO.gps.recordStartGPS = null;
  NORIRECO.gps.recordEndTime = null;
  // v258: 写真エリアも破棄 (blob URL を revoke。アップロード済の public URL はクラッシュ後も R2 に残る)
  if (_recPhotoArea) {
    try { _recPhotoArea.destroy(); } catch (e) {}
    _recPhotoArea = null;
  }
  // verified=true の trip なら自動獲得チェックが発動する
  setTimeout(() => runCharacterGrantCheck(), 800);
  // 記録モードを終了 (R.mode=true → false に切替、最寄駅パネルが「開始駅選択」に戻る)
  // toggleRecordMode の else 分岐内で clearRecSelection が呼ばれる
  if (R.mode) {
    toggleRecordMode();
  } else {
    clearRecSelection();
  }
  // 保存後は 📍 を OFF にする (次回の記録に向けてリセット)
  if (NORIRECO.gps.locationMode > 0) {
    NORIRECO.gps.locationMode = 0;
    stopLocationTracking();
    updateLocationButton();
  }
}

// 地図全体のポリライン/駅ドット/ラベルを再描画 (riddenSt 更新後に呼ぶ)
// 既存の Supabase 同期後の再描画と同じパターンを使う
export function redrawAllLinesAfterTripChange() {
  if (!NORIRECO.map.instance || !dotLayerRef) return;
  // 既存ポリラインを削除
  allLayers.forEach(l => { try { NORIRECO.map.instance.removeLayer(l); } catch(e){} });
  allLayers.length = 0;
  // 既存ドット/ラベルをクリア
  dotLayerRef.clearLayers();
  if (labelLayerRef) labelLayerRef.clearLayers();
  // drawLines() が内部で window._allLabels.length=0 と drawnMergedStations.clear()
  // を実行するため、パイチャート(統合駅)も正しく再生成される
  drawLines();
}

export function showRecordToast(msg, mode, durationMs) {
  const toast = document.createElement('div');
  const bg = mode === 'warn' ? 'rgba(232,53,42,.96)' : 'rgba(0,178,229,.96)';
  const maxW = mode === 'warn' ? '88vw' : '420px';
  toast.style.cssText =
    'position:fixed;top:80px;left:50%;transform:translateX(-50%);' +
    `background:${bg};color:#fff;padding:12px 16px;border-radius:10px;` +
    `z-index:9999;font-size:12px;line-height:1.5;box-shadow:0 4px 12px rgba(0,0,0,.5);` +
    `font-family:inherit;white-space:pre-wrap;max-width:${maxW};` +
    (mode === 'warn' ? 'cursor:pointer;' : '');
  toast.textContent = msg;
  // クリックで即閉じる (エラー長文の確認後に消したい時用)
  toast.onclick = () => { try { toast.remove(); } catch(e){} };
  document.body.appendChild(toast);
  const dur = durationMs || (mode === 'warn' ? 7000 : 3000);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .4s'; }, dur - 500);
  setTimeout(() => { try { toast.remove(); } catch(e){} }, dur);
}

// ローディングインジケーターは廃止（P1がHTMLに埋め込まれているため不要）

// 乗車済み路線のバウンディングボックスにフィット
export function fitToRiddenLines(){
  const pts=[];
  NORIRECO.data.LINES.forEach(line=>{
    if(!riddenSt[line.id]||riddenSt[line.id].size===0)return;
    line.stations.forEach(s=>{
      if(riddenSt[line.id].has(s.n)) pts.push([s.lat,s.lon]);
    });
  });
  if(pts.length===0){ NORIRECO.map.instance.setView([36.5,138.0],5); return; }
  const bounds=L.latLngBounds(pts);
  NORIRECO.map.instance.fitBounds(bounds,{padding:[40,40],maxZoom:9,animate:false});
}

// v217 stage 2: 04/06/08 (module) / 02 (classic) などから bare 呼出される関数の window 公開
// v225 stage 3: toggleRecordMode / redrawAllLinesAfterTripChange / showRecordToast /
// fitToRiddenLines は `export` 経由に移行 (window bridge 撤去)。
// v248: toggleRecordMode は noritetsu-map.html の rec-btn FAB の onclick="toggleRecordMode()"
//   から呼ばれており、HTML onclick はグローバルスコープを参照するため window 公開が必須。
//   v225 で撤去したのは module 内 import の方を意図しており、HTML onclick 側を見落とし。
//   結果として v225 〜 v247 の間、📝 手動記録 FAB が無反応 (ReferenceError) になっていた。
// onRecordStationClick は 07 内の HTML 文字列 onclick (line 252) で呼ばれるため window 維持。
window.toggleRecordMode = toggleRecordMode;
window.onRecordStationClick = onRecordStationClick;

// ════════════════════════════════════════════════════════════════
// v347: 「列車・車両形式」トグル + 区間→候補車両ピッカー (C' 案)
//   5大原則 ② 同心円ターゲティング: Lv0/1 はデフォ非表示、Lv2/3 のみ展開
//   localStorage key: 'norireco.prefs.showTrainSelector' ('1' or '0')
// ════════════════════════════════════════════════════════════════
const PREF_SHOW_TRAIN_SELECTOR = 'norireco.prefs.showTrainSelector';
const PREF_SHOW_DELAY_INPUT    = 'norireco.prefs.showDelayInput';   // v350

function initRecTrainToggle() {
  // 列車・車両形式 (マニアトグル)
  const toggle = document.getElementById('rec-train-toggle');
  const picker = document.getElementById('rec-train-picker');
  if (toggle && picker) {
    const saved = localStorage.getItem(PREF_SHOW_TRAIN_SELECTOR) === '1';
    toggle.checked = saved;
    picker.style.display = saved ? 'block' : 'none';
    // v352: モードラジオ撤廃。カテゴリ dropdown が picker の主役、cat='local' で sl レーン、それ以外で cascade
    // 開く度にカテゴリを「指定しない」にリセット (前回値の復元はせず、毎回素の状態から始める)
    const catSel = document.getElementById('rec-train-category');
    if (catSel) catSel.value = '';
    applyRecTrainCategory('');
  }
  // 遅延入力トグル (v350)
  initRecDelayToggle();
}

function onRecTrainToggle() {
  const toggle = document.getElementById('rec-train-toggle');
  const picker = document.getElementById('rec-train-picker');
  if (!toggle || !picker) return;
  const on = toggle.checked;
  localStorage.setItem(PREF_SHOW_TRAIN_SELECTOR, on ? '1' : '0');
  picker.style.display = on ? 'block' : 'none';
  if (on) {
    // 開く度にカテゴリ「指定しない」から始める (v352)
    const catSel = document.getElementById('rec-train-category');
    if (catSel) catSel.value = '';
    applyRecTrainCategory('');
  } else {
    // OFF にしたら車両形式選択をクリア (隠れた state を残さない)
    clearAllTrainSelections();
  }
}
window.onRecTrainToggle = onRecTrainToggle;

// v352: cat に応じて sl-block / cascade の表示を排他切替。
// 02-data-loaders.js の onTrainCategoryChange から window.applyRecTrainCategory(cat) で呼ばれる。
// export せず window 公開のみ (02 → 07 の import で循環参照を作らない)
function applyRecTrainCategory(cat) {
  const slBlock = document.getElementById('rec-sl-vehicle-block');
  const cascade = document.getElementById('rec-train-cascade');
  if (cat === 'local') {
    if (slBlock) slBlock.style.display = 'block';
    if (cascade) cascade.style.display = 'none';
    populateSlVehiclePicker();
  } else if (cat) {
    if (slBlock) slBlock.style.display = 'none';
    if (cascade) cascade.style.display = 'block';
    // cascade 内部 (列車 dropdown) は 02 側の onTrainCategoryChange が populate する
  } else {
    // 「指定しない」
    if (slBlock) slBlock.style.display = 'none';
    if (cascade) cascade.style.display = 'none';
  }
}
window.applyRecTrainCategory = applyRecTrainCategory;

function clearAllTrainSelections() {
  const T = NORIRECO.trains;
  T.selectedCarModel       = null;
  T.selectedTrainId        = null;
  T.selectedTrainName      = null;
  T.selectedTrainCategory  = null;
  const sel = document.getElementById('rec-sl-vehicle-select');
  if (sel) sel.value = '';
  const customEl = document.getElementById('rec-sl-vehicle-custom');
  if (customEl) { customEl.style.display = 'none'; customEl.value = ''; }
}

// v350: 遅延入力トグル
function initRecDelayToggle() {
  const toggle = document.getElementById('rec-delay-toggle');
  const row    = document.getElementById('rec-delay-row');
  if (!toggle || !row) return;
  const saved = localStorage.getItem(PREF_SHOW_DELAY_INPUT) === '1';
  toggle.checked = saved;
  row.style.display = saved ? 'flex' : 'none';
}

function onRecDelayToggle() {
  const toggle = document.getElementById('rec-delay-toggle');
  const row    = document.getElementById('rec-delay-row');
  if (!toggle || !row) return;
  const on = toggle.checked;
  localStorage.setItem(PREF_SHOW_DELAY_INPUT, on ? '1' : '0');
  row.style.display = on ? 'flex' : 'none';
  if (!on) {
    // OFF にしたら入力値をクリア (隠れた state を残さない)
    const h = document.getElementById('rec-edit-delay-h');
    const m = document.getElementById('rec-edit-delay-m');
    if (h) h.value = '';
    if (m) m.value = '';
  }
}
window.onRecDelayToggle = onRecDelayToggle;

// 区間 chip + 候補車両 dropdown を生成
function populateSlVehiclePicker() {
  const chipsEl = document.getElementById('rec-sl-chips');
  const selectEl = document.getElementById('rec-sl-vehicle-select');
  const emptyEl = document.getElementById('rec-sl-vehicle-empty');
  if (!chipsEl || !selectEl) return;

  // R.segments から unique sl_id を収集 (重複系統は 1 度だけ)
  const slIds = [];
  const seen = new Set();
  for (const seg of (R.segments || [])) {
    const id = seg.line?.id;
    if (id && !seen.has(id)) { seen.add(id); slIds.push({ id, name: seg.line.name }); }
  }

  // chip 描画
  chipsEl.innerHTML = '';
  if (slIds.length === 0) {
    // 区間情報なし (visit only 等)
    chipsEl.innerHTML = '<div style="font-size:10px;color:var(--silver);opacity:.7">区間情報がないため候補車両を表示できません</div>';
    selectEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';
    return;
  }
  selectEl.style.display = 'block';

  const bySlId = NORIRECO.serviceLineVehicles?.bySlId || {};
  for (const { id, name } of slIds) {
    const count = (bySlId[id] || []).length;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.id = `rec-sl-chip-${id}`;
    chip.textContent = `${name}${count > 0 ? ` (${count})` : ''}`;
    chip.style.cssText = 'padding:5px 10px;background:rgba(20,32,46,.8);color:var(--silver);border:1px solid var(--track);border-radius:14px;font-size:11px;cursor:pointer;transition:all .15s';
    chip.onclick = () => selectSlChip(id);
    chipsEl.appendChild(chip);
  }
  // 1 つ目を選択
  selectSlChip(slIds[0].id);
}

function selectSlChip(slId) {
  const bySlId = NORIRECO.serviceLineVehicles?.bySlId || {};
  // chip の active 切替
  document.querySelectorAll('[id^="rec-sl-chip-"]').forEach(el => {
    const isActive = el.id === `rec-sl-chip-${slId}`;
    el.style.background = isActive ? 'var(--gold)' : 'rgba(20,32,46,.8)';
    el.style.color = isActive ? '#000' : 'var(--silver)';
    el.style.borderColor = isActive ? 'var(--gold)' : 'var(--track)';
  });
  // dropdown 再生成: 現役主力 / 導入 / 導入予定 を先頭、引退などは末尾
  const selectEl = document.getElementById('rec-sl-vehicle-select');
  const emptyEl = document.getElementById('rec-sl-vehicle-empty');
  if (!selectEl) return;
  const vehicles = (bySlId[slId] || []).slice().sort((a, b) => {
    const order = { '導入予定': 0, '導入': 1, '現役主力': 2, '譲受': 3, '組織再編': 4, '譲渡': 5, '引退': 6 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });
  let html = '<option value="">車両形式を選ぶ (任意)...</option>';
  for (const v of vehicles) {
    const tag = v.status === '導入予定' ? ' ★新' :
                v.status === '導入'     ? ' 🆕' :
                v.status === '引退'     ? ' (引退)' :
                v.status === '譲受'     ? ' (譲受)' :
                v.status === '譲渡'     ? ' (譲渡)' : '';
    html += `<option value="${v.vehicle.replace(/"/g, '&quot;')}">${v.vehicle}${tag}</option>`;
  }
  // v351: 末尾に「自由入力」option (vehicles 有無に関わらず常時表示)
  if (vehicles.length > 0) {
    html += '<option value="" disabled>──────</option>';
  }
  html += '<option value="__custom__">✏️ 別形式を入力...</option>';
  selectEl.innerHTML = html;
  // 候補ゼロのときは説明文を出す
  if (emptyEl) emptyEl.style.display = (vehicles.length === 0) ? 'block' : 'none';
  // 既存の T.selectedCarModel が新しい候補にあれば維持、無ければ custom input の値か null
  const T = NORIRECO.trains;
  const customEl = document.getElementById('rec-sl-vehicle-custom');
  const inDropdown = vehicles.some(v => v.vehicle === T.selectedCarModel);
  if (T.selectedCarModel && inDropdown) {
    selectEl.value = T.selectedCarModel;
    if (customEl) { customEl.style.display = 'none'; customEl.value = ''; }
  } else if (T.selectedCarModel) {
    // 自由入力済の値が残っていれば custom モードに復元
    selectEl.value = '__custom__';
    if (customEl) { customEl.style.display = 'block'; customEl.value = T.selectedCarModel; }
  } else {
    selectEl.value = '';
    if (customEl) { customEl.style.display = 'none'; customEl.value = ''; }
  }
}

function onSlVehicleChange() {
  const selectEl = document.getElementById('rec-sl-vehicle-select');
  const customEl = document.getElementById('rec-sl-vehicle-custom');
  if (!selectEl) return;
  const T = NORIRECO.trains;
  const v = selectEl.value;
  if (v === '__custom__') {
    // 自由入力モードに切替: input を表示 + focus、T.selectedCarModel は input の値で上書き (まずは現在値を保つ)
    if (customEl) {
      customEl.style.display = 'block';
      customEl.value = T.selectedCarModel && !isInDropdown(T.selectedCarModel, selectEl) ? T.selectedCarModel : '';
      T.selectedCarModel = customEl.value || null;
      customEl.focus();
    }
  } else {
    if (customEl) { customEl.style.display = 'none'; customEl.value = ''; }
    T.selectedCarModel = v || null;
  }
  // 新 UI で選んだら列車種別はクリア (普通電車パターン)
  if (T.selectedCarModel) {
    T.selectedTrainId = null;
    T.selectedTrainName = null;
    T.selectedTrainCategory = null;
  }
}
window.onSlVehicleChange = onSlVehicleChange;

function isInDropdown(value, selectEl) {
  return Array.from(selectEl.options).some(o => o.value === value && o.value !== '__custom__' && o.value !== '');
}

// v351: 自由入力 input の oninput
function onSlVehicleCustomInput() {
  const customEl = document.getElementById('rec-sl-vehicle-custom');
  if (!customEl) return;
  const T = NORIRECO.trains;
  T.selectedCarModel = customEl.value.trim() || null;
  if (T.selectedCarModel) {
    T.selectedTrainId = null;
    T.selectedTrainName = null;
    T.selectedTrainCategory = null;
  }
}
window.onSlVehicleCustomInput = onSlVehicleCustomInput;
