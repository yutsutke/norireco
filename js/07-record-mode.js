// ════════════════════════════════════════════
// 記録モード (RECORD MODE)
// - 手動記録: 📝 ボタン経由 (verified=false、source='manual')
// - GPS 記録: 📍 → 「ここから記録開始」経由 (verified=true、source='gps_button')
// ════════════════════════════════════════════
let recordMode = false;
const recordSelection = [];      // [{name, lat, lon}]
const recordHighlights = [];     // [{station, marker}]
const pairLineChoices = new Map(); // pair index → ユーザー手動選択した運行系統 id
let currentSegments = [];        // refreshRecPanel で計算された区間リスト

function toggleRecordMode() {
  recordMode = !recordMode;
  const btn = document.getElementById('rec-btn');
  const panel = document.getElementById('rec-panel');
  btn.classList.toggle('on', recordMode);
  panel.classList.toggle('on', recordMode);
  if (recordMode) {
    // 記録モード突入時刻を必ずセット (GPS 経由でなくても depart_time 計算に使う)
    recordStartedAt = new Date().toISOString();
    // メモモードと排他
    if (memoMode) toggleMemoMode();
    refreshRecPanel();
    if(map) map.getContainer().style.cursor='crosshair';
    if (recordStartedViaGPS) {
      // GPS 記録: ミニマルな最寄駅パネル (記録中) を表示、rec-panel は隠す
      panel.style.display = 'none';
      if (lastUserGps && typeof updateNearestStationPanel === 'function') {
        updateNearestStationPanel(lastUserGps.lat, lastUserGps.lon);
      } else if (typeof renderRecordingSummary === 'function') {
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
    if(map) map.getContainer().style.cursor='';
    // 記録モード終了時に GPS 認証フラグと時刻もリセット
    recordStartedViaGPS = false;
    recordStartGPS = null;
    recordStartedAt = null;
    recordEndTime = null;
    // rec-panel の inline display をリセット (手動記録で '' にしていたぶん)
    panel.style.display = '';
    // 最寄駅パネルの mode DOM を必ず切替 (lastUserGps の有無に関わらず)
    const _np = document.getElementById('nearest-station-panel');
    const _selM = document.getElementById('ns-mode-select');
    const _recM = document.getElementById('ns-mode-recording');
    if (_selM) _selM.style.display = 'block';
    if (_recM) _recM.style.display = 'none';
    if (lastUserGps && locationMode > 0) {
      // GPS が生きていれば候補リストも更新 (show 状態維持)
      updateNearestStationPanel(lastUserGps.lat, lastUserGps.lon);
    } else if (_np) {
      // GPS なしならパネル自体を隠す
      _np.classList.remove('show');
    }
  }
}

function sameStation(a, b) {
  return a.name === b.name && Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lon - b.lon) < 1e-4;
}

function onRecordStationClick(station) {
  const idx = recordSelection.findIndex(s => sameStation(s, station));
  if (idx >= 0) {
    recordSelection.splice(idx, 1);
    removeRecordHighlight(station);
  } else {
    recordSelection.push(station);
    addRecordHighlight(station);
  }
  refreshRecPanel();
}

function addRecordHighlight(station) {
  const h = L.circleMarker([station.lat, station.lon], {
    radius: 13, color: '#F2A900', weight: 3,
    fill: false, opacity: 1,
    interactive: false,
  }).addTo(map);
  recordHighlights.push({station, marker: h});
}

function removeRecordHighlight(station) {
  const idx = recordHighlights.findIndex(h => sameStation(h.station, station));
  if (idx >= 0) {
    map.removeLayer(recordHighlights[idx].marker);
    recordHighlights.splice(idx, 1);
  }
}

function clearAllRecordHighlights() {
  recordHighlights.forEach(h => { try { map.removeLayer(h.marker); } catch(e){} });
  recordHighlights.length = 0;
}

function clearRecSelection() {
  recordSelection.length = 0;
  pairLineChoices.clear();
  currentSegments = [];
  clearAllRecordHighlights();
  refreshRecPanel();
}

// 選択駅すべてを含む運行系統を返す (営業系統)
function findCommonServiceLines(stations) {
  if (!SERVICE_LINES || SERVICE_LINES.length === 0 || stations.length < 2) return [];
  return SERVICE_LINES.filter(sl => {
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
// - ユーザー手動選択 (pairLineChoices) があれば最優先
function buildSegmentsFromSelection() {
  if (recordSelection.length < 2) return [];

  // Step 1: 各ペアの候補を計算
  const pairs = [];
  for (let i = 0; i < recordSelection.length - 1; i++) {
    const a = recordSelection[i], b = recordSelection[i + 1];
    pairs.push({a, b, cands: findCommonServiceLines([a, b])});
  }

  // Step 2: 各ペアの選択 (手動 > 継続性 > 先頭)
  let prevLineId = null;
  const chosen = pairs.map((p, i) => {
    if (p.cands.length === 0) { prevLineId = null; return null; }
    const userPick = pairLineChoices.get(i);
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
  const seg = currentSegments[segIdx];
  if (!seg || !seg.pairIndices) return;
  for (const i of seg.pairIndices) pairLineChoices.set(i, newLineId);
  refreshRecPanel();
}

function refreshRecPanel() {
  // 記録中の最寄駅パネル サマリも更新 (rec-panel は v105 で非表示化したが、内部状態は維持)
  if (recordMode && typeof renderRecordingSummary === 'function') {
    renderRecordingSummary();
  }
  const chipsDiv = document.getElementById('rec-chips');
  const pickDiv = document.getElementById('rec-line-pick');
  const actionsDiv = document.getElementById('rec-actions');
  if (!chipsDiv) return;

  // チップ表示
  if (recordSelection.length === 0) {
    chipsDiv.innerHTML = '<span style="color:var(--silver);font-size:11px">駅をタップして 2 駅以上選択してください</span>';
  } else {
    const parts = recordSelection.map((s, i) => {
      const cls = i === 0 ? 'from' : (i === recordSelection.length - 1 ? 'to' : '');
      const sn = s.name.replace(/'/g, "\\'");
      return `<span class="rec-chip ${cls}" onclick="onRecordStationClick({name:'${sn}',lat:${s.lat},lon:${s.lon}})">${s.name}<span style="color:rgba(255,255,255,.5);margin-left:4px">×</span></span>`;
    });
    chipsDiv.innerHTML = parts.join('<span class="rec-arrow">→</span>');
  }

  pickDiv.innerHTML = '';
  if (recordSelection.length >= 2) {
    currentSegments = buildSegmentsFromSelection();
    let hasError = false;
    let totalStations = 0;

    currentSegments.forEach((seg, idx) => {
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

    if (currentSegments.length > 0) {
      const summary = document.createElement('div');
      summary.style.cssText = 'margin-top:6px;font-size:11px;color:var(--gold);';
      const transferCount = currentSegments.filter(s => !s.error).length - 1;
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

  actionsDiv.innerHTML = recordSelection.length > 0
    ? '<button class="rec-btn clear" onclick="clearRecSelection()">クリア</button>'
    : '';
}

// 経路 (複数区間) を1 trip として保存
// 記録確認モーダル: 終了 → 経路レビュー → 保存 or 戻る or 破棄
function openRecConfirm() {
  if (!recordSelection || recordSelection.length === 0) {
    alert('記録する駅がありません');
    return;
  }
  // 終了時刻をキャプチャ (まだ設定されていなければ)
  if (!recordEndTime) recordEndTime = new Date().toISOString();
  const isVisitOnly = recordSelection.length === 1 && (!currentSegments || currentSegments.length === 0);
  if (!isVisitOnly && currentSegments && currentSegments.some(s => s.error)) {
    alert('未解決の区間があります');
    return;
  }
  const body = document.getElementById('rec-confirm-body');
  if (!body) return;
  const verifiedBadge = recordStartedViaGPS
    ? '<span class="rec-confirm-verified-badge">🟢 GPS 記録</span>'
    : '<span class="rec-confirm-verified-badge" style="background:rgba(140,160,179,.15);color:var(--silver);border-color:var(--track)">⚪ 手動記録</span>';

  // 時刻情報行 (depart_time / arrive_time / total_minutes プレビュー)
  // GPS 経由なら recordStartGPS.timestamp、それ以外は手動入力の精度に応じて更新される
  const startTs = (recordStartGPS && recordStartGPS.timestamp) || recordStartedAt;
  // プレースホルダのみ作成 (中身は updateRecConfirmTimeRow が埋める)
  // openRecConfirm の末尾で精度に応じて中身が動的に書き換わる
  const timeRowHtml = `<div class="rec-confirm-stat-row" id="rec-confirm-time-row" style="display:none">
      <span class="rec-confirm-stat-lbl" id="rec-confirm-time-lbl">🕒 時刻</span>
      <span class="rec-confirm-stat-val" id="rec-confirm-time-val"></span>
    </div>`;

  if (isVisitOnly) {
    // 1駅のみ「訪問」記録
    const st = recordSelection[0];
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
    for (const seg of currentSegments) {
      if (!seg.line) continue;
      const fromIdx = seg.line.stations.findIndex(s => s.name === seg.from.name);
      const toIdx = seg.line.stations.findIndex(s => s.name === seg.to.name);
      if (fromIdx < 0 || toIdx < 0) continue;
      totalStations += Math.abs(toIdx - fromIdx) + 1;
      if (lineNames[lineNames.length - 1] !== seg.line.name) lineNames.push(seg.line.name);
    }
    const fromSt = recordSelection[0]?.name || '?';
    const toSt = recordSelection[recordSelection.length - 1]?.name || '?';
    const routeHtml = currentSegments.map(seg => {
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
        <span class="rec-confirm-stat-val">${totalStations}駅 / ${currentSegments.length}区間</span>
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
    saveBtn.textContent = recordStartedViaGPS
      ? '💾 GPS 記録で保存する'
      : '💾 手動記録で保存する';
  }
  // 時刻編集セクション: 手動記録のときだけ表示、初期値は記録モード突入時刻
  const timeSec = document.getElementById('rec-time-edit-section');
  if (timeSec) {
    if (recordStartedViaGPS) {
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
        const endTs = recordEndTime || new Date().toISOString();
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
  // メモ・遅延もリセット (前回値を持ち越さない) — v185: 時間+分の 2 input
  const delayHInp = document.getElementById('rec-edit-delay-h');
  const delayMInp = document.getElementById('rec-edit-delay-m');
  const notesInp = document.getElementById('rec-edit-notes');
  if (delayHInp) delayHInp.value = '';
  if (delayMInp) delayMInp.value = '';
  if (notesInp) notesInp.value = '';
}

function closeRecConfirm() {
  // 「戻って編集」: モーダル閉じる、recordMode はそのまま、selection 保持
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
  recordStartedViaGPS = false;
  recordStartGPS = null;
  recordEndTime = null;
  if (recordMode) toggleRecordMode(); // off に
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
  if (recordStartedViaGPS) {
    const startTs = (recordStartGPS && recordStartGPS.timestamp) || recordStartedAt;
    if (!startTs) { row.style.display = 'none'; return; }
    const sd = new Date(startTs);
    const ed = recordEndTime ? new Date(recordEndTime) : new Date();
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
let endStationCandidates = [];
let endStationPickedIdx = 0;

function endRecordAtNearest() {
  if (!recordMode) { alert('記録モード中ではありません'); return; }
  if (!lastUserGps) {
    if (locationMode === 0) {
      // 位置情報 OFF だったらまず ON にする
      cycleLocationMode();
      alert('📍 位置情報を取得しています。GPS が取れたらもう一度「ここで終了」を押してください。');
      return;
    }
    alert('現在地を取得中です。少し待ってからもう一度お試しください。');
    return;
  }
  const nearby = findNearestStations(lastUserGps.lat, lastUserGps.lon, 1500, 6);
  if (nearby.length === 0) {
    alert('1.5km 以内に駅が見つかりません');
    return;
  }
  endStationCandidates = nearby;
  endStationPickedIdx = 0;
  // 既に選択済みの駅と同じだったら先頭以外をデフォルト選択
  const lastSelected = recordSelection[recordSelection.length - 1]?.name;
  if (lastSelected && nearby[0].station.name === lastSelected && nearby.length > 1) {
    endStationPickedIdx = 1;
  }

  const listEl = document.getElementById('end-station-list');
  if (!listEl) return;
  listEl.innerHTML = nearby.map((n, idx) => {
    const lineIds = n.station.lines || [];
    const lineNames = lineIds.slice(0, 3).map(lid => {
      const sl = (SERVICE_LINES || []).find(x => x.id === lid);
      return sl ? sl.name : lid;
    }).filter(Boolean).join('・');
    const more = lineIds.length > 3 ? ` ほか${lineIds.length - 3}` : '';
    const isSame = n.station.name === lastSelected;
    const checked = idx === endStationPickedIdx ? 'checked' : '';
    const selClass = idx === endStationPickedIdx ? ' selected' : '';
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
  endStationPickedIdx = idx;
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
  if (!endStationCandidates || endStationCandidates.length === 0) return;
  const picked = endStationCandidates[endStationPickedIdx] || endStationCandidates[0];
  // 「ここで終了」押下時刻をキャプチャ (実際の到着時刻)
  recordEndTime = new Date().toISOString();
  // 末尾区間がエラー (= 前回の終点が解決不能) なら末尾駅を外してから選び直す
  // これで「終点を選び直す」UX が成立する
  if (recordSelection.length >= 2 && currentSegments && currentSegments.length > 0
      && currentSegments[currentSegments.length - 1].error) {
    const stale = recordSelection[recordSelection.length - 1];
    onRecordStationClick(stale); // toggle off
  }
  const lastSelected = recordSelection[recordSelection.length - 1]?.name;
  // 出発駅と同じ駅を選んだら 1駅訪問記録扱い (currentSegments は空のまま)
  if (picked.station.name !== lastSelected) {
    onRecordStationClick({
      name: picked.station.name,
      lat: picked.station.lat,
      lon: picked.station.lon,
    });
  }
  closeEndStation();
  // refreshRecPanel が呼ばれ currentSegments 更新後に確認モーダル表示
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
  if (!recordSelection || recordSelection.length === 0) return;
  const isVisitOnly = recordSelection.length === 1 && (!currentSegments || currentSegments.length === 0);
  if (!isVisitOnly && currentSegments && currentSegments.some(s => s.error)) {
    alert('未解決の区間があります'); return;
  }
  const tripSegments = [];
  let totalStations = 0;
  const lineNames = [];
  if (!isVisitOnly) {
    for (const seg of currentSegments) {
      if (!seg.line) continue;
      const fromIdx = seg.line.stations.findIndex(s => s.name === seg.from.name);
      const toIdx = seg.line.stations.findIndex(s => s.name === seg.to.name);
      if (fromIdx < 0 || toIdx < 0) continue;
      totalStations += Math.abs(toIdx - fromIdx) + 1;
      if (lineNames[lineNames.length - 1] !== seg.line.name) lineNames.push(seg.line.name);
      tripSegments.push({lineId: seg.line.id, from: seg.from.name, to: seg.to.name});
    }
    if (tripSegments.length === 0) { alert('保存できる区間がありません'); return; }
  } else {
    totalStations = 1;
  }

  const fromStation = recordSelection[0].name;
  const toStation = recordSelection[recordSelection.length - 1].name;
  const lineList = lineNames.join(' ▸ ');
  const tripName = isVisitOnly
    ? `${fromStation} 訪問`
    : (tripSegments.length === 1
        ? `${lineNames[0]} ${fromStation}→${toStation}`
        : `${lineList} ${fromStation}→${toStation}`);

  // 時刻計算 (GPS 発進時に start, 「ここで終了」押下時に end をキャプチャ)
  // GPS 経由でなくても記録モード突入時刻 (recordStartedAt) を depart_time に使う
  const today = localDateStr();  // 端末ローカル日付 (JST) — UTC だと早朝記録が前日になるため
  const startTs = (recordStartGPS && recordStartGPS.timestamp) || recordStartedAt;
  const endTs = recordEndTime || new Date().toISOString();
  let departTime = '';
  let arriveTime = '';
  let totalMinutes = 0;
  let elapsedSec = 0;  // 不正検知用に秒精度の経過時間を保持
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
      elapsedSec = Math.max(0, Math.round((endDate - startDate) / 1000));
      totalMinutes = Math.max(0, Math.round((endDate - startDate) / 60000));
    }
  }
  // 手動記録: 精度セレクタで選んだ粒度に応じて trip フィールドを構築
  // (GPS 記録は実時刻が正確なので上書きしない)
  let datePrecision = 'day';
  if (!recordStartedViaGPS) {
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
        elapsedSec = diff * 60;
      }
    } else if (prec === 'day') {
      const editDate = document.getElementById('rec-edit-date')?.value;
      if (editDate) tripDate = editDate;
      departTime = ''; arriveTime = ''; totalMinutes = 0; elapsedSec = 0;
      datePrecision = 'day';
    } else if (prec === 'month') {
      const y = document.getElementById('rec-edit-year-m')?.value;
      const m = document.getElementById('rec-edit-month-m')?.value;
      if (y && m) {
        tripDate = `${y}-${m}-01`;
        departTime = ''; arriveTime = ''; totalMinutes = 0; elapsedSec = 0;
        datePrecision = 'month';
      }
    } else if (prec === 'year') {
      const y = document.getElementById('rec-edit-year-y')?.value;
      if (y) {
        tripDate = `${y}-01-01`;
        departTime = ''; arriveTime = ''; totalMinutes = 0; elapsedSec = 0;
        datePrecision = 'year';
      }
    } else if (prec === 'unknown') {
      // 日時不明: date を null にすると Supabase の NOT NULL 制約で失敗するため、
      // 保存日 (recorded_at の日付) を入れておく。フィルタは date_precision='unknown' で別途除外
      tripDate = today;
      departTime = ''; arriveTime = ''; totalMinutes = 0; elapsedSec = 0;
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
  const trip = {
    id: tripId, date: tripDate, name: tripName,
    from_station: fromStation, to_station: toStation,
    total_stations: totalStations,
    transfers: Math.max(0, tripSegments.length - 1),
    line_list: lineList,
    total_minutes: totalMinutes,
    depart_time: departTime,
    arrive_time: arriveTime,
    segments: tripSegments,
    // 認証グラデーション (Notion §記録モード設計)
    // GPS 発進 (「ここから記録開始」経由) なら verified=true、それ以外は manual
    source: recordStartedViaGPS ? 'gps_button' : 'manual',
    verified: !!recordStartedViaGPS,
    gps_lat: recordStartGPS ? recordStartGPS.lat : null,
    gps_lon: recordStartGPS ? recordStartGPS.lon : null,
    gps_accuracy: recordStartGPS ? recordStartGPS.accuracy : null,
    recorded_at: new Date().toISOString(),
    date_precision: datePrecision,
    // 列車種別 (任意、確認モーダルで選択 or 手入力)
    // train_id IS NULL かつ train_name IS NOT NULL = マニア手入力 (後でマスター調査・追加用)
    train_id: selectedTrainId,
    train_name: selectedTrainName,
    train_category: selectedTrainCategory,
    car_model: selectedCarModel,
    // 後追い記録モード拡張 (v181): メモ・遅延 — Supabase スキーマ追加待ちのため
    // tripForSupabase() で送信時に除外。localStorage には保存される
    notes: tripNotes,
    delay_minutes: delayMinutes,
    // 所有者 (ログイン中なら uid、未ログインなら null → 初回ログイン時 backfill 対象)
    user_id: (typeof currentUserId === 'function') ? currentUserId() : null,
  };

  // 不正検知: GPS 認証 trip の所要時間が想定の半分未満なら verified=false に降格
  // (Supabase 列追加なし: source='gps_button' && verified===false が降格マーカー)
  // 秒精度の経過時間を一時フィールドで渡す (Supabase には送らない)
  let fraud = { suspicious: false, reason: null };
  if (trip.source === 'gps_button' && typeof fraudAssessTrip === 'function') {
    try { fraud = fraudAssessTrip({ ...trip, _elapsed_sec: elapsedSec }); } catch (e) { console.warn('[乗レコ] 不正検知エラー:', e); }
    if (fraud.suspicious) {
      trip.verified = false;
      console.warn('[乗レコ] suspicious 降格:', fraud.reason);
    }
  }

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
  rebuildRiddenStations();
  redrawAllLinesAfterTripChange();
  updateOverlays();

  if (saved) {
    // 認証バッジ: GPS 認証=🟢 / 降格=🟡 / 手動=なし
    let verifiedTag = '';
    if (trip.verified) verifiedTag = ' 🟢';
    else if (fraud.suspicious) verifiedTag = ' 🟡';
    const summary = isVisitOnly
      ? `${fromStation} に立ち寄り`
      : `${tripSegments.length}区間 ${totalStations}駅`;
    showRecordToast(`✅ 記録${verifiedTag}: ${summary}`);
    if (fraud.suspicious) {
      showRecordToast(`🟡 GPS 認証を取り消しました (要確認)\n${fraud.reason}`, 'warn', 8000);
    }
  } else {
    showRecordToast(`⚠️ ローカル保存のみ (Supabase 失敗)\n${errInfo}`, 'warn', 9000);
  }
  // 保存後に GPS 認証フラグと時刻をリセット
  recordStartedViaGPS = false;
  recordStartGPS = null;
  recordEndTime = null;
  // verified=true の trip なら自動獲得チェックが発動する
  setTimeout(() => runCharacterGrantCheck(), 800);
  // 記録モードを終了 (recordMode=true → false に切替、最寄駅パネルが「開始駅選択」に戻る)
  // toggleRecordMode の else 分岐内で clearRecSelection が呼ばれる
  if (recordMode) {
    toggleRecordMode();
  } else {
    clearRecSelection();
  }
  // 保存後は 📍 を OFF にする (次回の記録に向けてリセット)
  if (locationMode > 0) {
    locationMode = 0;
    stopLocationTracking();
    updateLocationButton();
  }
}

// 地図全体のポリライン/駅ドット/ラベルを再描画 (riddenSt 更新後に呼ぶ)
// 既存の Supabase 同期後の再描画と同じパターンを使う
function redrawAllLinesAfterTripChange() {
  if (!map || !dotLayerRef) return;
  // 既存ポリラインを削除
  allLayers.forEach(l => { try { map.removeLayer(l); } catch(e){} });
  allLayers.length = 0;
  // 既存ドット/ラベルをクリア
  dotLayerRef.clearLayers();
  if (labelLayerRef) labelLayerRef.clearLayers();
  // drawLines() が内部で window._allLabels.length=0 と drawnMergedStations.clear()
  // を実行するため、パイチャート(統合駅)も正しく再生成される
  drawLines();
}

function showRecordToast(msg, mode, durationMs) {
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
function fitToRiddenLines(){
  const pts=[];
  LINES.forEach(line=>{
    if(!riddenSt[line.id]||riddenSt[line.id].size===0)return;
    line.stations.forEach(s=>{
      if(riddenSt[line.id].has(s.n)) pts.push([s.lat,s.lon]);
    });
  });
  if(pts.length===0){ map.setView([36.5,138.0],5); return; }
  const bounds=L.latLngBounds(pts);
  map.fitBounds(bounds,{padding:[40,40],maxZoom:9,animate:false});
}
