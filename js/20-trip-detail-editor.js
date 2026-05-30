// ══════════════════════════════════════════════════════════════
// trip 詳細エディタ共通コンポーネント (v392 〜)
//
// 用途: 確認モーダル (07-record-mode) / 旅程編集モーダル (13b-trips) /
//       一括記録の行展開 (将来) で「時刻・列車・遅延・メモ・写真」の
//       編集セクションを単一の mount 可能コンポーネントに集約する。
//
// 背景: Notion §1.3 末尾「一括記録（まとめて記録）」設計判断より。
//   - v371-v383 で「列車種別 + 車両形式 cascade」が 02/07/13b の 3 箇所に
//     重複した (v383 落とし穴で明示)。一括記録で 4 箇所目を作ると確実に壊れる。
//   - 本コンポーネントは PhotoArea (v258) と同じ factory 関数パターン。
//
// 公開 API:
//   const editor = createTripDetailEditor({
//     container,         // HTMLElement — 単一コンテナモード (全 section を 1 つの DOM に
//                        //   `.tde-section.tde-time/.tde-train/...` を縦並べで挿入)
//     containers,        // { time, train, delay, notes, photos } — 各 section を別々の
//                        //   コンテナに mount する場合に使う (v399 B-4-b で追加)。
//                        //   container と containers は排他 (containers 優先)。
//     initial,           // draft trip オブジェクト
//     features,          // セクション可視・モード設定
//     onChange,          // (optional) draft 変化通知
//   });
//
//   editor.getDraft()                      // 現在の draft trip を返す (DOM 値を反映済)
//   await editor.uploadAndGetPhotos(id)    // PhotoArea ラッパ (写真 upload + 全件返す)
//   editor.destroy()                       // 内部 PhotoArea destroy + DOM クリア
//
// features の型:
//   {
//     timeRow:     { precisions: ['minute','day','month','year','unknown'] } | { precisions: [...] } | false,
//     trainPicker: 'per-seg-chip' | 'per-seg-rows' | 'trip-level' | false,
//     delay:       boolean,
//     notes:       boolean,
//     photos:      { kind: 'trip', getOwnerId, initialPhotos, maxCount } | false,
//   }
//
// 呼出元 → features マッピング:
//   07 確認モーダル                 : trainPicker='per-seg-chip',  timeRow=全 5 精度
//   13b 編集モーダル (segments あり): trainPicker='per-seg-rows',  timeRow=['minute','day']
//   13b 編集モーダル (segments なし): trainPicker='trip-level',    timeRow=['minute','day']
//   将来 A 一括記録の行展開         : trainPicker='per-seg-rows',  timeRow=全 5 (unknown デフォ)
//
// state 管理方針 (v383 落とし穴対策):
//   - per-seg-chip mode: chip 切替で 1 seg だけ画面に出すため、コンポーネント内クロージャの
//     _segState: Map<lineId, {train_category, train_id, train_name, car_model}> で保持。
//     v371-v382 で使っていたグローバル NORIRECO.trains.selectedXxxBySl / activeChipSlId は撤廃済 (v399 B-4-b)。
//   - per-seg-rows mode: 全 seg 行が同時表示なので各行の DOM 自体が state。
//   - trip-level mode: draft.train_* 1 set のみ。
//
// 実装段階 (リファクタ完結):
//   B-1 (v392): factory 関数 + features 分岐 + section スケルトン + per-seg-chip mode 本実装 + 07 移行
//   B-2 (v393): 13b 編集モーダルを per-seg-rows / trip-level mode で本コンポーネントに移行
//   B-3a (v394): 13b の ⏱ 遅延 + 📝 自由メモ を 2nd instance に集約
//   B-3b (v396): 13b の 🕒 乗車時刻 (2 精度) を 3rd instance に集約
//   B-3c (v397): 07 確認モーダル側の time/delay/notes 移植 + delay maniaToggle 拡張
//   B-4-a (v398): 13b/07 の visible dead code 撤去 (~350 行)
//   B-4-b (v399): グローバル NORIRECO.trains.selectedXxxBySl / activeChipSlId 撤廃 +
//                 02 旧 cascade handler + 07 旧 SL chip ロジック撤去 (~360 行) +
//                 multi-container API (`containers`) で各 modal 3 instance を 1 instance に統合
// ══════════════════════════════════════════════════════════════

import { createPhotoArea } from './18-photo-area.js';

const DEFAULT_PRECISIONS = ['minute', 'day', 'month', 'year', 'unknown'];

// Module-level escape (innerHTML 経由でユーザー由来文字列を挿入する箇所で使う。
//   per-seg-rows の lineName / from / to は Supabase の trip データ由来)。
function _escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

export function createTripDetailEditor(opts) {
  const {
    container,
    containers,
    initial = {},
    features = {},
    onChange = null,
  } = opts || {};

  // v399 (B-4-b): containers (per-section) を提供すれば container 省略可。
  //   1 つも指定が無ければエラー。
  const ext = (containers && typeof containers === 'object') ? containers : null;
  if (!ext && (!container || !(container instanceof HTMLElement))) {
    throw new Error('createTripDetailEditor: container or containers must be provided');
  }

  // ── features 正規化 ───────────────────────────────────────────
  const featTime = features.timeRow
    ? { precisions: Array.isArray(features.timeRow.precisions) ? features.timeRow.precisions : DEFAULT_PRECISIONS }
    : null;
  const featTrain = (features.trainPicker === 'per-seg-chip'
                  || features.trainPicker === 'per-seg-rows'
                  || features.trainPicker === 'trip-level')
                    ? features.trainPicker : null;
  // v397 (B-3c): delay を boolean OR { maniaToggle, prefKey } object 両対応に。
  //   - true        → 常時表示 (13b)
  //   - false       → セクション自体 OFF
  //   - { maniaToggle:true, prefKey:'norireco.prefs.showDelayInput' } → checkbox + localStorage 永続化 (07)
  let featDelay = null;
  if (features.delay === true) {
    featDelay = { maniaToggle: false, prefKey: null };
  } else if (features.delay && typeof features.delay === 'object') {
    featDelay = {
      maniaToggle: !!features.delay.maniaToggle,
      prefKey:     features.delay.prefKey || null,
    };
  }
  const featNotes = !!features.notes;
  const featPhotos = (features.photos && typeof features.photos === 'object') ? features.photos : null;

  // ── internal state ────────────────────────────────────────────
  // draft は initial の浅いコピー。getDraft で各 collect* が DOM 値を反映してから返す。
  const draft = {
    date:           initial.date           || null,
    depart_time:    initial.depart_time    || null,
    arrive_time:    initial.arrive_time    || null,
    date_precision: initial.date_precision || 'minute',
    total_minutes:  (typeof initial.total_minutes === 'number') ? initial.total_minutes : null,
    segments:       Array.isArray(initial.segments) ? initial.segments.map(s => ({ ...s })) : [],
    train_category: initial.train_category || null,
    train_id:       initial.train_id       || null,
    train_name:     initial.train_name     || null,
    car_model:      initial.car_model      || null,
    delay_minutes:  (initial.delay_minutes != null) ? initial.delay_minutes : null,
    notes:          initial.notes          || null,
    photos:         Array.isArray(initial.photos) ? initial.photos.slice() : [],
  };
  // collectTimeRow が「日付のみ入力時に 'minute' → 'day' へ下げる」判定に使う初期精度の snapshot。
  // draft.date_precision は collect で書き換わるため、別 closure 変数で持つ必要がある。
  const _initialPrecision = initial.date_precision || null;

  // per-seg state (chip/rows 共通の data layer)
  // - per-seg-chip: chip 切替 + cascade restore で参照・更新
  // - per-seg-rows: 各 row の handler が直接 _segState[lineId].* に書き込む (将来 B-4 で完全 DOM 駆動でも可)
  // - trip-level : 使わない (draft.train_* のみ)
  const _segState = new Map();
  let _activeChipSlId = null;
  if (featTrain === 'per-seg-chip' || featTrain === 'per-seg-rows') {
    for (const s of draft.segments) {
      if (!s || !s.lineId) continue;
      _segState.set(s.lineId, {
        train_category: s.train_category || null,
        train_id:       s.train_id       || null,
        train_name:     s.train_name     || null,
        car_model:      s.car_model      || null,
      });
    }
    if (featTrain === 'per-seg-chip' && draft.segments.length > 0) {
      _activeChipSlId = draft.segments[0].lineId || null;
    }
  }

  let _photoArea = null;

  // ── DOM 構築 ──────────────────────────────────────────────────
  // v399 (B-4-b): containers を指定した場合は各 section の DOM を提供された要素に直接 mount。
  //   未指定 (container のみ) のときは従来通り 1 つのコンテナに 5 セクションの subdiv を描画。
  //   `dummy()` は feature ON だが containers.<name> 未指定のときの no-op 用 detached div。
  let _timeEl, _trainEl, _delayEl, _notesEl, _photosEl;
  if (ext) {
    const dummy = () => document.createElement('div');
    _timeEl   = (ext.time   instanceof HTMLElement) ? ext.time   : dummy();
    _trainEl  = (ext.train  instanceof HTMLElement) ? ext.train  : dummy();
    _delayEl  = (ext.delay  instanceof HTMLElement) ? ext.delay  : dummy();
    _notesEl  = (ext.notes  instanceof HTMLElement) ? ext.notes  : dummy();
    _photosEl = (ext.photos instanceof HTMLElement) ? ext.photos : dummy();
    // 提供されたコンテナは念のため空にしておく (前回の destroy 後の残骸対策)
    if (ext.time   instanceof HTMLElement) ext.time.innerHTML   = '';
    if (ext.train  instanceof HTMLElement) ext.train.innerHTML  = '';
    if (ext.delay  instanceof HTMLElement) ext.delay.innerHTML  = '';
    if (ext.notes  instanceof HTMLElement) ext.notes.innerHTML  = '';
    if (ext.photos instanceof HTMLElement) ext.photos.innerHTML = '';
  } else {
    // 単一コンテナモード (旧 API、互換維持) — 1 つのコンテナに 5 section の subdiv を描画。
    container.innerHTML = `
      <div class="tde-root">
        <div class="tde-section tde-time"   data-section="time"   style="display:${featTime   ? '' : 'none'}"></div>
        <div class="tde-section tde-train"  data-section="train"  style="display:${featTrain  ? '' : 'none'}"></div>
        <div class="tde-section tde-delay"  data-section="delay"  style="display:${featDelay  ? '' : 'none'}"></div>
        <div class="tde-section tde-notes"  data-section="notes"  style="display:${featNotes  ? '' : 'none'}"></div>
        <div class="tde-section tde-photos" data-section="photos" style="display:${featPhotos ? '' : 'none'}"></div>
      </div>
    `;
    _timeEl   = container.querySelector('.tde-time');
    _trainEl  = container.querySelector('.tde-train');
    _delayEl  = container.querySelector('.tde-delay');
    _notesEl  = container.querySelector('.tde-notes');
    _photosEl = container.querySelector('.tde-photos');
  }

  // 各 init は features が ON のときだけ呼ぶ。
  if (featTime)   initTimeRow();
  if (featTrain)  initTrainPicker();
  if (featDelay)  initDelay();
  if (featNotes)  initNotes();
  if (featPhotos) initPhotos();

  // ── time section (v396 B-3b: precisions=['minute','day'] 用に本実装) ─────
  // 13b 旅程編集モーダル用の 2 精度ロジック:
  //   - dateRaw 空     → draft.date=null (呼出側で「key 自体を patch に入れない」判定して元値温存)
  //   - dateRaw あり + dep/arr いずれか → date_precision='minute', 両方なら total_minutes 計算
  //   - dateRaw あり + dep/arr 共に空  → 初期精度が 'minute' なら 'day' に降格、それ以外は据置
  // 07 が要求する 5 精度 (month/year/unknown 切替 + GPS preset) は B-3c で本実装する。
  // それまで precisions に month/year/unknown が含まれていたら TODO comment を残す。
  function _supportsFull5Precisions() {
    const p = (featTime && featTime.precisions) || [];
    return p.includes('month') || p.includes('year') || p.includes('unknown');
  }
  function initTimeRow() {
    if (_supportsFull5Precisions()) {
      _initTimeRowFull5();
      return;
    }
    const headerStyle = 'font-size:11px;color:var(--gold);margin-bottom:6px';
    const labelStyle = 'font-size:10px;color:var(--silver);min-width:40px';
    const dateInpStyle = "flex:1;min-width:140px;background:rgba(20,32,46,.8);color:var(--white);border:1px solid var(--track);border-radius:6px;padding:6px 8px;font-family:'DM Mono',monospace;font-size:12px;color-scheme:dark";
    const timeInpStyle = "flex:1;min-width:110px;background:rgba(20,32,46,.8);color:var(--white);border:1px solid var(--track);border-radius:6px;padding:6px 8px;font-family:'DM Mono',monospace;font-size:12px;color-scheme:dark";
    const toHm = (v) => (typeof v === 'string' && v.length >= 5) ? v.slice(0, 5) : '';
    // 13b 旧実装と同じ: date_precision='unknown' のときは date を空に倒す (年/月だけ知ってる扱いではない)
    const dateVal = (draft.date && draft.date_precision !== 'unknown') ? draft.date : '';

    _timeEl.innerHTML = `
      <div class="tde-time-header" style="${headerStyle}">🕒 乗車時刻</div>
      <div class="tde-time-inputs">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
          <label style="${labelStyle}">📅 乗車日</label>
          <input type="date" class="tde-time-date" value="${_escHtml(dateVal)}" style="${dateInpStyle}">
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
          <label style="${labelStyle}">🕐 出発</label>
          <input type="time" class="tde-time-depart" value="${_escHtml(toHm(draft.depart_time))}" style="${timeInpStyle}">
          <label style="${labelStyle}">🕑 到着</label>
          <input type="time" class="tde-time-arrive" value="${_escHtml(toHm(draft.arrive_time))}" style="${timeInpStyle}">
        </div>
        <div style="font-size:9px;color:var(--silver);opacity:.7;line-height:1.5">
          ※ 日付のみ入力で「日付精度」、出発+到着両方で「正確な時刻」として保存されます。精度を月/年/不明に下げる場合は新規記録で作り直してください。
        </div>
      </div>
    `;
    if (onChange) {
      _timeEl.querySelector('.tde-time-date')?.addEventListener('input', () => { try { onChange(); } catch (e) {} });
      _timeEl.querySelector('.tde-time-depart')?.addEventListener('input', () => { try { onChange(); } catch (e) {} });
      _timeEl.querySelector('.tde-time-arrive')?.addEventListener('input', () => { try { onChange(); } catch (e) {} });
    }
  }
  // ── 5 精度 time row (v397 B-3c): 07 確認モーダル用 ─────
  // 精度 select (minute/day/month/year/unknown) + 行表示切替 + 年月 select populate + collect。
  // features.timeRow.precisions が subset (例 ['minute','day']) でも option を絞れる。
  // GPS preset (depart/arrive プリフィル) は呼出側で initial に渡す責務 — factory は draft.depart_time/arrive_time/date を見て埋めるだけ。
  function _initTimeRowFull5() {
    const PREC_LABELS = {
      minute:  '⏱ 正確な時刻まで',
      day:     '📅 日付のみ覚えてる',
      month:   '🗓 月までしか覚えてない',
      year:    '📆 年だけ覚えてる',
      unknown: '❓ 思い出せない',
    };
    const precs = featTime.precisions;
    const inputBg = "background:rgba(20,32,46,.8);color:var(--white);border:1px solid var(--track);border-radius:6px;padding:6px 8px;font-size:12px";
    const inputMono = "background:rgba(20,32,46,.8);color:var(--white);border:1px solid var(--track);border-radius:6px;padding:6px 8px;font-family:'DM Mono',monospace;font-size:12px;color-scheme:dark";
    const labelStyle = 'font-size:10px;color:var(--silver);min-width:40px';
    const labelStyleWide = 'font-size:10px;color:var(--silver);min-width:60px';
    const headerStyle = 'font-size:11px;color:var(--gold);margin-bottom:8px';

    const toHm = (v) => (typeof v === 'string' && v.length >= 5) ? v.slice(0, 5) : '';
    const dateVal = (draft.date && draft.date_precision !== 'unknown') ? draft.date : '';
    const depVal  = toHm(draft.depart_time);
    const arrVal  = toHm(draft.arrive_time);
    // month/year 用の初期 select 値: draft.date が 'YYYY-MM-DD' 形式なら分解、なければ今年/今月
    const now = new Date();
    const curY = now.getFullYear();
    const curM = String(now.getMonth() + 1).padStart(2, '0');
    let initY = String(curY), initM = curM;
    if (draft.date && /^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
      initY = draft.date.slice(0, 4);
      initM = draft.date.slice(5, 7);
    }

    // 精度 select option を precisions 配列で絞る (順序固定)
    const PREC_ORDER = ['minute', 'day', 'month', 'year', 'unknown'];
    const enabledPrecs = PREC_ORDER.filter(p => precs.includes(p));
    const initPrec = (enabledPrecs.includes(draft.date_precision || '') ? draft.date_precision : enabledPrecs[0]) || 'minute';

    let precOptions = '';
    for (const p of enabledPrecs) precOptions += `<option value="${p}">${_escHtml(PREC_LABELS[p])}</option>`;

    // 年/月 select option: 過去 20 年
    const startY = curY - 20;
    let yearOptions = '';
    for (let y = curY; y >= startY; y--) yearOptions += `<option value="${y}">${y}</option>`;
    let monthOptions = '';
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      monthOptions += `<option value="${mm}">${m}</option>`;
    }

    _timeEl.innerHTML = `
      <div class="tde-time-header" style="${headerStyle}">🕒 乗車日時</div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
        <label style="${labelStyleWide}">📐 記憶の精度</label>
        <select class="tde-time-prec" style="flex:1;min-width:160px;${inputBg}">
          ${precOptions}
        </select>
      </div>
      <div class="tde-time-date-row" style="display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
        <label style="${labelStyle}">📅 乗車日</label>
        <input type="date" class="tde-time-date" value="${_escHtml(dateVal)}" style="flex:1;min-width:140px;${inputMono}">
      </div>
      <div class="tde-time-time-row" style="display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
        <label style="${labelStyle}">🕐 出発</label>
        <input type="time" class="tde-time-depart" value="${_escHtml(depVal)}" style="flex:1;min-width:110px;${inputMono}">
        <label style="${labelStyle}">🕑 到着</label>
        <input type="time" class="tde-time-arrive" value="${_escHtml(arrVal)}" style="flex:1;min-width:110px;${inputMono}">
      </div>
      <div class="tde-time-month-row" style="display:none;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
        <label style="${labelStyle}">🗓 年月</label>
        <select class="tde-time-year-m" style="${inputBg}">${yearOptions}</select>年
        <select class="tde-time-month-m" style="${inputBg}">${monthOptions}</select>月
      </div>
      <div class="tde-time-year-row" style="display:none;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
        <label style="${labelStyle}">📆 年</label>
        <select class="tde-time-year-y" style="${inputBg}">${yearOptions}</select>年
      </div>
      <div class="tde-time-unknown-row" style="display:none;padding:8px 10px;background:rgba(95,181,255,.08);border-left:3px solid #5fb5ff;border-radius:0 6px 6px 0;font-size:11px;color:var(--silver);line-height:1.5">
        日時を入力せず保存します。乗車駅・系統は記録されますが、期間フィルタ (今年/〜月指定など) には現れません。
      </div>
      <div style="font-size:9px;color:var(--silver);opacity:.7;line-height:1.5;margin-top:6px">記録時刻 (recorded_at) は常に「保存ボタン押下時」が保存されます。</div>
    `;

    const precSel  = _timeEl.querySelector('.tde-time-prec');
    const dateRow  = _timeEl.querySelector('.tde-time-date-row');
    const timeRow  = _timeEl.querySelector('.tde-time-time-row');
    const monthRow = _timeEl.querySelector('.tde-time-month-row');
    const yearRow  = _timeEl.querySelector('.tde-time-year-row');
    const unkRow   = _timeEl.querySelector('.tde-time-unknown-row');
    const yearMSel = _timeEl.querySelector('.tde-time-year-m');
    const monthSel = _timeEl.querySelector('.tde-time-month-m');
    const yearYSel = _timeEl.querySelector('.tde-time-year-y');

    // 初期 select 値設定
    if (precSel) precSel.value = initPrec;
    if (yearMSel) yearMSel.value = initY;
    if (monthSel) monthSel.value = initM;
    if (yearYSel) yearYSel.value = initY;

    function applyPrecVisibility(prec) {
      if (dateRow)  dateRow.style.display  = (prec === 'minute' || prec === 'day') ? 'flex' : 'none';
      if (timeRow)  timeRow.style.display  = (prec === 'minute') ? 'flex' : 'none';
      if (monthRow) monthRow.style.display = (prec === 'month') ? 'flex' : 'none';
      if (yearRow)  yearRow.style.display  = (prec === 'year') ? 'flex' : 'none';
      if (unkRow)   unkRow.style.display   = (prec === 'unknown') ? 'block' : 'none';
    }
    applyPrecVisibility(initPrec);

    // 全 input の change/input で onChange 通知 (外側 updateRecConfirmTimeRow 用)
    const fire = () => { if (onChange) try { onChange(); } catch (e) {} };
    if (precSel) precSel.addEventListener('change', () => { applyPrecVisibility(precSel.value); fire(); });
    [
      _timeEl.querySelector('.tde-time-date'),
      _timeEl.querySelector('.tde-time-depart'),
      _timeEl.querySelector('.tde-time-arrive'),
      yearMSel, monthSel, yearYSel,
    ].forEach(el => { if (el) el.addEventListener('input', fire); });
    if (yearMSel) yearMSel.addEventListener('change', fire);
    if (monthSel) monthSel.addEventListener('change', fire);
    if (yearYSel) yearYSel.addEventListener('change', fire);
  }

  function _collectTimeRowFull5() {
    const prec = (_timeEl.querySelector('.tde-time-prec')?.value || 'minute');
    if (prec === 'minute') {
      const dateRaw = (_timeEl.querySelector('.tde-time-date')?.value || '').trim();
      const depRaw  = (_timeEl.querySelector('.tde-time-depart')?.value || '').trim();
      const arrRaw  = (_timeEl.querySelector('.tde-time-arrive')?.value || '').trim();
      draft.date_precision = 'minute';
      draft.date = dateRaw || null;
      draft.depart_time = depRaw ? `${depRaw}:00` : '';
      draft.arrive_time = arrRaw ? `${arrRaw}:00` : '';
      if (depRaw && arrRaw) {
        const [dhh, dmm] = depRaw.split(':').map(Number);
        const [ahh, amm] = arrRaw.split(':').map(Number);
        let diff = (ahh * 60 + amm) - (dhh * 60 + dmm);
        if (diff < 0) diff += 24 * 60;
        draft.total_minutes = diff;
      } else {
        draft.total_minutes = 0;
      }
      return;
    }
    if (prec === 'day') {
      const dateRaw = (_timeEl.querySelector('.tde-time-date')?.value || '').trim();
      draft.date_precision = 'day';
      draft.date = dateRaw || null;
      draft.depart_time = '';
      draft.arrive_time = '';
      draft.total_minutes = 0;
      return;
    }
    if (prec === 'month') {
      const y = (_timeEl.querySelector('.tde-time-year-m')?.value || '').trim();
      const m = (_timeEl.querySelector('.tde-time-month-m')?.value || '').trim();
      draft.date_precision = 'month';
      draft.date = (y && m) ? `${y}-${m}-01` : null;
      draft.depart_time = '';
      draft.arrive_time = '';
      draft.total_minutes = 0;
      return;
    }
    if (prec === 'year') {
      const y = (_timeEl.querySelector('.tde-time-year-y')?.value || '').trim();
      draft.date_precision = 'year';
      draft.date = y ? `${y}-01-01` : null;
      draft.depart_time = '';
      draft.arrive_time = '';
      draft.total_minutes = 0;
      return;
    }
    if (prec === 'unknown') {
      // 07 旧実装: tripDate には保存日 (recorded_at の日付) を入れる方針だが、
      //   factory は呼出側に判断を委ねる: draft.date は null にしておき、呼出側で
      //   「prec='unknown' なら localDateStr() を入れる」を実装する。
      draft.date_precision = 'unknown';
      draft.date = null;
      draft.depart_time = '';
      draft.arrive_time = '';
      draft.total_minutes = 0;
      return;
    }
  }

  function collectTimeRow() {
    if (_supportsFull5Precisions()) { _collectTimeRowFull5(); return; }
    const dateRaw = (_timeEl.querySelector('.tde-time-date')?.value || '').trim();
    const depRaw = (_timeEl.querySelector('.tde-time-depart')?.value || '').trim();
    const arrRaw = (_timeEl.querySelector('.tde-time-arrive')?.value || '').trim();

    if (!dateRaw) {
      // 13b 旧実装と同じ「date 空入力なら patch から除外して元値温存」を実現するため、
      // draft.date を null にする (呼出側で if (draft.date) でガード)。他フィールドも null。
      draft.date = null;
      draft.depart_time = null;
      draft.arrive_time = null;
      draft.total_minutes = null;
      // date_precision は据置 (initial 由来の値が draft に残る)
      return;
    }
    draft.date = dateRaw;
    if (depRaw || arrRaw) {
      draft.date_precision = 'minute';
      draft.depart_time = depRaw ? `${depRaw}:00` : '';
      draft.arrive_time = arrRaw ? `${arrRaw}:00` : '';
      if (depRaw && arrRaw) {
        const [dhh, dmm] = depRaw.split(':').map(Number);
        const [ahh, amm] = arrRaw.split(':').map(Number);
        let diff = (ahh * 60 + amm) - (dhh * 60 + dmm);
        if (diff < 0) diff += 24 * 60;
        draft.total_minutes = diff;
      } else {
        // 片方しか入力されていない場合は total_minutes 不定 → 既存値を上書きしない印として null
        draft.total_minutes = null;
      }
    } else {
      // dateだけ → 初期精度が 'minute' なら 'day' に下げる、それ以外 (day/month/year) は据置
      if (_initialPrecision === 'minute') {
        draft.date_precision = 'day';
        draft.depart_time = '';
        draft.arrive_time = '';
        draft.total_minutes = 0;
      }
    }
  }

  // ── train picker section ──────────────────────────────────────
  function initTrainPicker() {
    if (featTrain === 'per-seg-chip')  initTrainPickerChip();
    else if (featTrain === 'per-seg-rows') initTrainPickerRows();
    else if (featTrain === 'trip-level')   initTrainPickerTripLevel();
  }
  function initTrainPickerChip() {
    // v392: 07-record-mode.js の selectSlChip / applyRecTrainCategory / populateSlVehiclePicker /
    //   onSlVehicleChange / onSlVehicleCustomInput + 02-data-loaders.js の onTrainCategoryChange /
    //   onTrainChange / onTrainCustomInput / onCarModelChange / onCarModelCustomInput を本クロージャに移植。
    //   - DOM id は使わず class セレクタ (.tde-train-*) で container 内 query — 複数 mount 衝突なし
    //   - 各 handler は _segState.get(_activeChipSlId).* に書き込む (グローバル Map 不使用 = B-4)
    //   - 列車マスター / カテゴリ / 営業系統車両は読み取り時に NORIRECO から都度参照 (initial 時 snapshot しない)

    const inputStyle = 'width:100%;padding:8px;background:rgba(20,32,46,.8);color:var(--white);border:1px solid var(--track);border-radius:6px;font-size:12px;margin-bottom:6px;box-sizing:border-box';
    const customInputStyle = inputStyle.replace('border:1px solid var(--track)', 'border:1px solid var(--gold)');
    const labelStyle = 'font-size:11px;color:var(--silver);margin-bottom:6px';

    _trainEl.innerHTML = `
      <div class="tde-train-chip-section" style="display:none;margin-bottom:10px">
        <div style="${labelStyle}">🚉 区間を選ぶ (区間ごとに列車・車両を記録できます)</div>
        <div class="tde-train-chips" style="display:flex;flex-wrap:wrap;gap:6px"></div>
      </div>
      <select class="tde-train-category" style="${inputStyle};margin-bottom:10px">
        <option value="">指定しない</option>
      </select>
      <div class="tde-sl-block" style="display:none">
        <div style="${labelStyle}">🚆 この区間の車両形式</div>
        <select class="tde-sl-vehicle-select" style="${inputStyle};margin-bottom:0">
          <option value="">車両形式を選ぶ (任意)...</option>
        </select>
        <input class="tde-sl-vehicle-custom" type="text" placeholder="例: E235系1500番台、外部車両など" style="display:none;${customInputStyle};margin-top:6px;margin-bottom:0">
        <div class="tde-sl-vehicle-empty" style="display:none;font-size:10px;color:var(--silver);opacity:.7;margin-top:6px;line-height:1.5">
          この系統の車両データはまだ未登録です。dropdown 末尾の「✏️ 別形式を入力」から自由記述できます。
        </div>
      </div>
      <div class="tde-train-cascade" style="display:none">
        <select class="tde-train-id" style="display:none;${inputStyle}">
          <option value="">列車を選ぶ...</option>
        </select>
        <input class="tde-train-custom" type="text" placeholder="例: 湘南ライナー、北越急行スーパー特急 など" style="display:none;${customInputStyle}">
        <select class="tde-car-model" style="display:none;${inputStyle}">
          <option value="">車両形式を選ぶ (任意)...</option>
        </select>
        <input class="tde-car-model-custom" type="text" placeholder="例: 209系2000番台、ED75、キハ110系 など" style="display:none;${customInputStyle}">
      </div>
    `;

    const chipSection  = _trainEl.querySelector('.tde-train-chip-section');
    const chipsEl      = _trainEl.querySelector('.tde-train-chips');
    const catSel       = _trainEl.querySelector('.tde-train-category');
    const slBlock      = _trainEl.querySelector('.tde-sl-block');
    const slSel        = _trainEl.querySelector('.tde-sl-vehicle-select');
    const slCustom     = _trainEl.querySelector('.tde-sl-vehicle-custom');
    const slEmpty      = _trainEl.querySelector('.tde-sl-vehicle-empty');
    const cascade      = _trainEl.querySelector('.tde-train-cascade');
    const trainSel     = _trainEl.querySelector('.tde-train-id');
    const trainCustom  = _trainEl.querySelector('.tde-train-custom');
    const carSel       = _trainEl.querySelector('.tde-car-model');
    const carCustom    = _trainEl.querySelector('.tde-car-model-custom');

    // ─ カテゴリ select populate (TRAIN_CATEGORIES、local 先頭) ─
    function populateCategorySelect() {
      const cats = (window.NORIRECO?.trains?.TRAIN_CATEGORIES) || {};
      const entries = Object.entries(cats).sort((a, b) => {
        if (a[0] === 'local') return -1;
        if (b[0] === 'local') return 1;
        return 0;
      });
      let html = '<option value="">指定しない</option>';
      for (const [k, v] of entries) {
        html += `<option value="${k}">${v.icon || ''} ${v.label}</option>`;
      }
      catSel.innerHTML = html;
    }
    populateCategorySelect();

    // ─ cat → sl-block / cascade 表示切替 (07 applyRecTrainCategory 相当) ─
    function applyCategoryVisibility(cat) {
      if (cat === 'local') {
        slBlock.style.display = 'block';
        cascade.style.display = 'none';
      } else if (cat) {
        slBlock.style.display = 'none';
        cascade.style.display = 'block';
      } else {
        slBlock.style.display = 'none';
        cascade.style.display = 'none';
      }
    }

    // ─ chip 描画 (07 populateSlVehiclePicker 相当) ─
    function renderChips() {
      const slIds = [];
      const seen = new Set();
      for (const seg of draft.segments) {
        const id = seg?.lineId;
        if (id && !seen.has(id)) {
          seen.add(id);
          slIds.push({ id, name: seg.lineName || seg.lineId });
        }
      }
      chipsEl.innerHTML = '';
      if (slIds.length === 0) {
        chipSection.style.display = 'none';
        catSel.style.display = 'none';
        return;
      }
      // chip は 2 区間以上のときだけ表示。1 区間 or visit-only でも _activeChipSlId は設定する
      chipSection.style.display = (slIds.length >= 2) ? 'block' : 'none';
      catSel.style.display = 'block';

      const bySlId = (window.NORIRECO?.serviceLineVehicles?.bySlId) || {};
      for (const { id, name } of slIds) {
        const count = (bySlId[id] || []).length;
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'tde-train-chip';
        chip.dataset.slId = id;
        chip.textContent = `${name}${count > 0 ? ` (${count})` : ''}`;
        chip.style.cssText = 'padding:5px 10px;background:rgba(20,32,46,.8);color:var(--silver);border:1px solid var(--track);border-radius:14px;font-size:11px;cursor:pointer;transition:all .15s';
        chip.addEventListener('click', () => selectChip(id));
        chipsEl.appendChild(chip);
      }
      // 既存 active を維持、無ければ先頭
      const targetSlId = (_activeChipSlId && slIds.some(x => x.id === _activeChipSlId))
        ? _activeChipSlId
        : slIds[0].id;
      selectChip(targetSlId);
    }

    // ─ 列車 cascade dropdown populate (cat 別) ─
    function populateTrainCascade(cat) {
      const trains = ((window.NORIRECO?.trains?.TRAINS) || [])
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
      trainSel.innerHTML = html;
    }

    // ─ 車両形式 dropdown populate (master 列車選択時) ─
    function populateCarModelSelect(trainId, restoreValue) {
      const train = ((window.NORIRECO?.trains?.TRAINS) || []).find(t => t.id === trainId);
      if (train && Array.isArray(train.car_models) && train.car_models.length > 0) {
        let html = '<option value="">車両形式を選ぶ (任意)...</option>';
        for (const m of train.car_models) html += `<option value="${m}">${m}</option>`;
        html += '<option value="__custom__">📝 リストにない (手入力)</option>';
        carSel.innerHTML = html;
        carSel.style.display = 'block';
        if (restoreValue && train.car_models.includes(restoreValue)) {
          carSel.value = restoreValue;
          carCustom.style.display = 'none'; carCustom.value = '';
        } else if (restoreValue) {
          carSel.value = '__custom__';
          carCustom.style.display = 'block'; carCustom.value = restoreValue;
        } else {
          carSel.value = '';
          carCustom.style.display = 'none'; carCustom.value = '';
        }
      } else {
        // master に car_models 無し → input のみ
        carSel.style.display = 'none';
        carCustom.style.display = 'block';
        carCustom.value = restoreValue || '';
      }
    }

    // ─ sl-block dropdown populate (営業系統別車両形式) ─
    function populateSlVehicleSelect(slId, restoreValue) {
      const bySlId = (window.NORIRECO?.serviceLineVehicles?.bySlId) || {};
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
        html += `<option value="${(v.vehicle || '').replace(/"/g, '&quot;')}">${v.vehicle}${tag}</option>`;
      }
      if (vehicles.length > 0) html += '<option value="" disabled>──────</option>';
      html += '<option value="__custom__">✏️ 別形式を入力...</option>';
      slSel.innerHTML = html;
      slEmpty.style.display = (vehicles.length === 0) ? 'block' : 'none';

      const inDropdown = vehicles.some(v => v.vehicle === restoreValue);
      if (restoreValue && inDropdown) {
        slSel.value = restoreValue;
        slCustom.style.display = 'none'; slCustom.value = '';
      } else if (restoreValue) {
        slSel.value = '__custom__';
        slCustom.style.display = 'block'; slCustom.value = restoreValue;
      } else {
        slSel.value = '';
        slCustom.style.display = 'none'; slCustom.value = '';
      }
    }

    // ─ chip 切替 (07 selectSlChip 相当): _segState から DOM 復元 ─
    function selectChip(slId) {
      // 直前 active chip の __custom__ 値を safety net で吸収
      if (_activeChipSlId && _activeChipSlId !== slId) {
        if (slSel.style.display !== 'none' && slSel.value === '__custom__') {
          const st = _segState.get(_activeChipSlId);
          if (st) st.car_model = (slCustom.value || '').trim() || null;
        }
      }
      _activeChipSlId = slId;

      // chip の active 切替 (style)
      _trainEl.querySelectorAll('.tde-train-chip').forEach(el => {
        const isActive = el.dataset.slId === slId;
        el.style.background = isActive ? 'var(--gold)' : 'rgba(20,32,46,.8)';
        el.style.color = isActive ? '#000' : 'var(--silver)';
        el.style.borderColor = isActive ? 'var(--gold)' : 'var(--track)';
      });

      const st = _segState.get(slId) || { train_category: null, train_id: null, train_name: null, car_model: null };
      catSel.value = st.train_category || '';
      applyCategoryVisibility(st.train_category || '');

      if (st.train_category === 'local') {
        populateSlVehicleSelect(slId, st.car_model || null);
      } else if (st.train_category) {
        // cascade レーン: 列車 dropdown populate + restore
        populateTrainCascade(st.train_category);
        trainSel.style.display = 'block';
        if (st.train_id) {
          trainSel.value = st.train_id;
          trainCustom.style.display = 'none'; trainCustom.value = '';
          populateCarModelSelect(st.train_id, st.car_model || null);
        } else if (st.train_name) {
          trainSel.value = '__custom__';
          trainCustom.style.display = 'block'; trainCustom.value = st.train_name;
          carSel.style.display = 'none';
          carCustom.style.display = 'block'; carCustom.value = st.car_model || '';
        } else {
          trainSel.value = '';
          trainCustom.style.display = 'none'; trainCustom.value = '';
          carSel.style.display = 'none';
          carCustom.style.display = 'none'; carCustom.value = '';
        }
      }
    }

    // ─ event listeners ─
    catSel.addEventListener('change', () => {
      const cat = catSel.value || '';
      const st = _ensureSegState(_activeChipSlId);
      if (st) {
        st.train_category = cat || null;
        // category 変更で train / car は矛盾するためクリア
        st.train_id = null;
        st.train_name = null;
        st.car_model = null;
      }
      // DOM reset
      trainSel.style.display = 'none'; trainSel.value = '';
      trainCustom.style.display = 'none'; trainCustom.value = '';
      carSel.style.display = 'none'; carSel.value = '';
      carCustom.style.display = 'none'; carCustom.value = '';
      applyCategoryVisibility(cat);
      if (cat === 'local') {
        populateSlVehicleSelect(_activeChipSlId, null);
      } else if (cat) {
        populateTrainCascade(cat);
        trainSel.style.display = 'block';
      }
      if (onChange) try { onChange(); } catch (e) {}
    });

    trainSel.addEventListener('change', () => {
      const v = trainSel.value;
      const st = _ensureSegState(_activeChipSlId);
      // reset car
      carSel.style.display = 'none'; carSel.value = '';
      carCustom.style.display = 'none'; carCustom.value = '';
      if (v === '__custom__') {
        if (st) { st.train_id = null; st.train_name = null; st.car_model = null; }
        trainCustom.style.display = 'block'; trainCustom.value = '';
        trainCustom.focus();
        carCustom.style.display = 'block';
        if (onChange) try { onChange(); } catch (e) {}
        return;
      }
      trainCustom.style.display = 'none'; trainCustom.value = '';
      if (!v) {
        if (st) { st.train_id = null; st.train_name = null; st.car_model = null; }
        if (onChange) try { onChange(); } catch (e) {}
        return;
      }
      const train = ((window.NORIRECO?.trains?.TRAINS) || []).find(t => t.id === v);
      if (st) {
        st.train_id = v;
        st.train_name = train?.name || null;
        st.car_model = null;
      }
      if (train && Array.isArray(train.car_models) && train.car_models.length > 0) {
        populateCarModelSelect(v, null);
      } else {
        carSel.style.display = 'none';
        carCustom.style.display = 'block';
      }
      if (onChange) try { onChange(); } catch (e) {}
    });

    trainCustom.addEventListener('input', () => {
      const v = (trainCustom.value || '').trim();
      const st = _ensureSegState(_activeChipSlId);
      if (st) {
        st.train_id = null;
        st.train_name = v || null;
      }
      if (onChange) try { onChange(); } catch (e) {}
    });

    carSel.addEventListener('change', () => {
      const v = carSel.value;
      const st = _ensureSegState(_activeChipSlId);
      if (v === '__custom__') {
        if (st) st.car_model = null;
        carCustom.style.display = 'block';
        carCustom.value = '';
        carCustom.focus();
      } else {
        carCustom.style.display = 'none'; carCustom.value = '';
        if (st) st.car_model = v || null;
      }
      if (onChange) try { onChange(); } catch (e) {}
    });

    carCustom.addEventListener('input', () => {
      const v = (carCustom.value || '').trim();
      const st = _ensureSegState(_activeChipSlId);
      if (st) st.car_model = v || null;
      if (onChange) try { onChange(); } catch (e) {}
    });

    slSel.addEventListener('change', () => {
      const v = slSel.value;
      const st = _ensureSegState(_activeChipSlId);
      if (v === '__custom__') {
        if (st) st.car_model = null;
        slCustom.style.display = 'block';
        slCustom.value = '';
        slCustom.focus();
      } else {
        slCustom.style.display = 'none'; slCustom.value = '';
        if (st) st.car_model = v || null;
      }
      if (onChange) try { onChange(); } catch (e) {}
    });

    slCustom.addEventListener('input', () => {
      const v = (slCustom.value || '').trim();
      const st = _ensureSegState(_activeChipSlId);
      if (st) st.car_model = v || null;
      if (onChange) try { onChange(); } catch (e) {}
    });

    // 初回描画
    renderChips();
  }

  // _segState に存在しない slId だったら lazy で空エントリを作る。chip 描画前から触られないよう保険。
  function _ensureSegState(slId) {
    if (!slId) return null;
    let st = _segState.get(slId);
    if (!st) {
      st = { train_category: null, train_id: null, train_name: null, car_model: null };
      _segState.set(slId, st);
    }
    return st;
  }
  // ── per-seg-rows mode (v393 B-2): 13b 旅程編集モーダル用 ──────
  // 全 seg を同時に row 描画。chip 切替なしの代わりに各 row が独立の cat/train/car cascade。
  // 13b 旧実装 (applyTripEditSegCategoryVisibility / populateTripEditSegCarSelect /
  //   restoreTripEditSegCascade + 3 onTripEditSeg* handler) を本クロージャに集約。
  // DOM が同時に全部見えているため _segState mirror は使わず、collect 時に row から直接読む。
  function initTrainPickerRows() {
    const segs = draft.segments;
    if (!segs || segs.length === 0) {
      _trainEl.innerHTML = '';
      return;
    }
    const inpStyle = 'flex:1;min-width:120px;padding:4px 8px;background:rgba(20,32,46,.8);color:var(--silver);border:1px solid var(--track);border-radius:6px;font-size:11px';
    const customInpStyle = inpStyle.replace('border:1px solid var(--track)', 'border:1px solid var(--gold)');
    const selStyle = 'min-width:140px;padding:4px 8px;background:rgba(20,32,46,.8);color:var(--silver);border:1px solid var(--track);border-radius:6px;font-size:11px';
    const lblStyle = 'font-size:11px;color:var(--silver);min-width:64px';
    const rowStyle = 'margin-top:4px;padding-left:18px;display:flex;align-items:center;gap:6px;flex-wrap:wrap';
    const rowStyleHide = rowStyle + ';display:none';

    _trainEl.innerHTML = segs.map((s, i) => {
      const lineLabel = _escHtml(s.lineName || s.lineId || '?');
      const fromLabel = _escHtml(s.from || '?');
      const toLabel = _escHtml(s.to || '?');
      const isLast = i === segs.length - 1;
      return `
        <div class="tde-rows-seg" data-seg-idx="${i}" style="margin-bottom:${isLast ? '0' : '12px'}">
          <div><span style="color:var(--gold);font-size:10px">${i + 1}.</span> ${fromLabel} → ${toLabel} <span style="color:var(--silver);font-size:10px">[${lineLabel}]</span></div>
          <div style="${rowStyle}">
            <span style="${lblStyle}">📋 種別</span>
            <select class="tde-rows-cat" data-seg-idx="${i}" style="${selStyle}"></select>
          </div>
          <div class="tde-rows-train-row" data-seg-idx="${i}" style="${rowStyleHide}">
            <span style="${lblStyle}">🚆 列車</span>
            <select class="tde-rows-train-id" data-seg-idx="${i}" style="${selStyle}"></select>
          </div>
          <div class="tde-rows-train-name-row" data-seg-idx="${i}" style="${rowStyleHide}">
            <span style="${lblStyle}">📝 列車名</span>
            <input type="text" class="tde-rows-train-name" data-seg-idx="${i}" placeholder="例: あずさ (任意)" style="${customInpStyle}">
          </div>
          <div class="tde-rows-car-row" data-seg-idx="${i}" style="${rowStyleHide}">
            <span style="${lblStyle}">🚆 車両形式</span>
            <select class="tde-rows-car-select" data-seg-idx="${i}" style="${selStyle};display:none"></select>
            <input type="text" class="tde-rows-car" data-seg-idx="${i}" placeholder="例: E353系 (任意)" style="${inpStyle}">
          </div>
        </div>
      `;
    }).join('');

    // 各 row を初期化 (cat populate + 値復元 + handler bind)。
    segs.forEach((s, i) => {
      const row = _trainEl.querySelector(`.tde-rows-seg[data-seg-idx="${i}"]`);
      if (!row) return;
      const catEl = row.querySelector('.tde-rows-cat');
      _populateCategorySelect(catEl);
      catEl.value = s.train_category || '';
      _applyRowVisibility(row, s.train_category || '');
      _restoreRowCascade(row, s);
      _bindRowHandlers(row);
    });
  }

  function _applyRowVisibility(row, cat) {
    const trainRow = row.querySelector('.tde-rows-train-row');
    const trainNameRow = row.querySelector('.tde-rows-train-name-row');
    const carRow = row.querySelector('.tde-rows-car-row');
    const tidEl = row.querySelector('.tde-rows-train-id');
    const tnameEl = row.querySelector('.tde-rows-train-name');
    const carSelEl = row.querySelector('.tde-rows-car-select');
    const carInpEl = row.querySelector('.tde-rows-car');

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
      // 13b v384 と同形: cat 切替時に前 cat の値が残らないよう必ずクリア。
      // 初期 render の local 値は _restoreRowCascade が seg.car_model から書き戻す。
      if (carInpEl) { carInpEl.style.display = 'block'; carInpEl.value = ''; }
      return;
    }
    // 特急など — 列車 dropdown populate
    if (trainRow) trainRow.style.display = 'flex';
    if (carRow) carRow.style.display = 'flex';
    if (tidEl) _populateTrainCascadeOptions(tidEl, cat);
    // train_name_row は __custom__ 選択時のみ show (restore 側で制御)。デフォルトは hide。
    if (trainNameRow) trainNameRow.style.display = 'none';
    if (tnameEl) tnameEl.value = '';
    if (carSelEl) { carSelEl.style.display = 'none'; carSelEl.value = ''; }
    if (carInpEl) { carInpEl.style.display = 'block'; carInpEl.value = ''; }
  }

  function _populateRowCarSelect(row, trainId, restoreValue) {
    const carSelEl = row.querySelector('.tde-rows-car-select');
    const carInpEl = row.querySelector('.tde-rows-car');
    if (!carSelEl) return;
    const train = ((window.NORIRECO?.trains?.TRAINS) || []).find(t => t.id === trainId);
    if (train && Array.isArray(train.car_models) && train.car_models.length > 0) {
      let html = '<option value="">車両形式を選ぶ (任意)...</option>';
      for (const m of train.car_models) html += `<option value="${_escHtml(m)}">${_escHtml(m)}</option>`;
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
      carSelEl.style.display = 'none';
      if (carInpEl) {
        carInpEl.style.display = 'block';
        carInpEl.value = restoreValue || '';
      }
    }
  }

  function _restoreRowCascade(row, seg) {
    const cat = seg.train_category || '';
    if (!cat) return;
    const carInpEl = row.querySelector('.tde-rows-car');
    if (cat === 'local') {
      if (carInpEl) carInpEl.value = seg.car_model || '';
      return;
    }
    const tidEl = row.querySelector('.tde-rows-train-id');
    const trainNameRow = row.querySelector('.tde-rows-train-name-row');
    const tnameEl = row.querySelector('.tde-rows-train-name');
    if (!tidEl) return;
    if (seg.train_id) {
      tidEl.value = seg.train_id;
      if (trainNameRow) trainNameRow.style.display = 'none';
      if (tnameEl) tnameEl.value = '';
      _populateRowCarSelect(row, seg.train_id, seg.car_model || null);
    } else if (seg.train_name) {
      tidEl.value = '__custom__';
      if (trainNameRow) trainNameRow.style.display = 'flex';
      if (tnameEl) tnameEl.value = seg.train_name;
      if (carInpEl) { carInpEl.style.display = 'block'; carInpEl.value = seg.car_model || ''; }
    } else {
      tidEl.value = '';
      if (trainNameRow) trainNameRow.style.display = 'none';
      if (tnameEl) tnameEl.value = '';
      if (carInpEl) { carInpEl.style.display = 'block'; carInpEl.value = seg.car_model || ''; }
    }
  }

  function _bindRowHandlers(row) {
    const catEl = row.querySelector('.tde-rows-cat');
    const tidEl = row.querySelector('.tde-rows-train-id');
    const tnameEl = row.querySelector('.tde-rows-train-name');
    const trainNameRow = row.querySelector('.tde-rows-train-name-row');
    const carSelEl = row.querySelector('.tde-rows-car-select');
    const carInpEl = row.querySelector('.tde-rows-car');

    if (catEl) catEl.addEventListener('change', () => {
      _applyRowVisibility(row, catEl.value || '');
      if (onChange) try { onChange(); } catch (e) {}
    });
    if (tidEl) tidEl.addEventListener('change', () => {
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
        _populateRowCarSelect(row, v, null);
      }
      if (onChange) try { onChange(); } catch (e) {}
    });
    if (carSelEl) carSelEl.addEventListener('change', () => {
      const v = carSelEl.value;
      if (v === '__custom__') {
        if (carInpEl) { carInpEl.style.display = 'block'; carInpEl.value = ''; carInpEl.focus(); }
      } else {
        if (carInpEl) { carInpEl.style.display = 'none'; carInpEl.value = ''; }
      }
      if (onChange) try { onChange(); } catch (e) {}
    });
    if (tnameEl) tnameEl.addEventListener('input', () => {
      if (onChange) try { onChange(); } catch (e) {}
    });
    if (carInpEl) carInpEl.addEventListener('input', () => {
      if (onChange) try { onChange(); } catch (e) {}
    });
  }

  // ── trip-level mode (v393 B-2): segments なし旧 trip / visit-only 用 ─
  // 13b 旧 HTML の trip-edit-train-category / train-id / train-name / car-model 4 input を
  // class セレクタで本コンポーネント内に複製。`train_name` は master 選択時に shadow value を持つ
  // (13b v356 と同形 — saveTripEdit が input から読む前提で master の name をシャドウ書き込み)。
  function initTrainPickerTripLevel() {
    const inputStyle = 'width:100%;padding:8px;background:rgba(20,32,46,.8);color:var(--white);border:1px solid var(--track);border-radius:6px;font-size:12px;margin-bottom:6px;box-sizing:border-box';
    const customInputStyle = inputStyle.replace('border:1px solid var(--track)', 'border:1px solid var(--gold)');

    _trainEl.innerHTML = `
      <select class="tde-trip-category" style="${inputStyle}">
        <option value="">指定しない</option>
      </select>
      <select class="tde-trip-train-id" style="display:none;${inputStyle}">
        <option value="">列車を選ぶ...</option>
      </select>
      <input class="tde-trip-train-name" type="text" placeholder="列車名 (例: あずさ9号、富士回遊3号)" style="display:none;${customInputStyle}">
      <input class="tde-trip-car-model" type="text" placeholder="車両形式 (例: E353系、209系2000番台)" style="display:none;${inputStyle}">
      <div style="font-size:9px;color:var(--silver);opacity:.7;line-height:1.5;margin-top:4px">
        ※ 簡易入力です。マスター列車の cascading 選択は新規記録の確認モーダルでのみ可能。
      </div>
    `;

    const catSel = _trainEl.querySelector('.tde-trip-category');
    const trainSel = _trainEl.querySelector('.tde-trip-train-id');
    const trainNameInp = _trainEl.querySelector('.tde-trip-train-name');
    const carModelInp = _trainEl.querySelector('.tde-trip-car-model');

    _populateCategorySelect(catSel);
    catSel.value = draft.train_category || '';

    function applyVisibility(cat) {
      if (!cat) {
        trainSel.style.display = 'none'; trainSel.value = '';
        trainNameInp.style.display = 'none'; trainNameInp.value = '';
        carModelInp.style.display = 'none'; carModelInp.value = '';
        return;
      }
      if (cat === 'local') {
        trainSel.style.display = 'none'; trainSel.value = '';
        trainNameInp.style.display = 'none'; trainNameInp.value = '';
        carModelInp.style.display = 'block';
        return;
      }
      _populateTrainCascadeOptions(trainSel, cat);
      trainSel.style.display = 'block';
      carModelInp.style.display = 'block';
      // trainNameInp の visibility は train change / restore で制御
    }

    applyVisibility(draft.train_category || '');
    // train_id / train_name の値復元 (13b v356 と同形)
    if (draft.train_category && draft.train_category !== 'local') {
      if (draft.train_id) {
        trainSel.value = draft.train_id;
        trainNameInp.style.display = 'none';
        trainNameInp.value = draft.train_name || '';  // shadow value
      } else if (draft.train_name) {
        trainSel.value = '__custom__';
        trainNameInp.style.display = 'block';
        trainNameInp.value = draft.train_name;
      } else {
        trainSel.value = '';
        trainNameInp.style.display = 'none';
        trainNameInp.value = '';
      }
    }
    if (carModelInp.style.display !== 'none') carModelInp.value = draft.car_model || '';

    catSel.addEventListener('change', () => {
      applyVisibility(catSel.value || '');
      if (onChange) try { onChange(); } catch (e) {}
    });
    trainSel.addEventListener('change', () => {
      const v = trainSel.value;
      if (v === '__custom__') {
        trainNameInp.style.display = 'block';
        trainNameInp.value = '';
        trainNameInp.focus();
      } else if (v === '') {
        trainNameInp.style.display = 'none';
        trainNameInp.value = '';
      } else {
        const train = ((window.NORIRECO?.trains?.TRAINS) || []).find(t => t.id === v);
        trainNameInp.style.display = 'none';
        trainNameInp.value = train ? (train.name || '') : '';  // shadow
      }
      if (onChange) try { onChange(); } catch (e) {}
    });
    trainNameInp.addEventListener('input', () => {
      if (onChange) try { onChange(); } catch (e) {}
    });
    carModelInp.addEventListener('input', () => {
      if (onChange) try { onChange(); } catch (e) {}
    });
  }

  // 共有ヘルパ (rows / trip-level 両方が使う。chip mode は B-1 で自前実装済のため重複維持)
  function _populateCategorySelect(sel) {
    const cats = (window.NORIRECO?.trains?.TRAIN_CATEGORIES) || {};
    const entries = Object.entries(cats).sort((a, b) => {
      if (a[0] === 'local') return -1;
      if (b[0] === 'local') return 1;
      return 0;
    });
    let html = '<option value="">指定しない</option>';
    for (const [k, v] of entries) {
      html += `<option value="${_escHtml(k)}">${v.icon || ''} ${_escHtml(v.label || k)}</option>`;
    }
    sel.innerHTML = html;
  }
  function _populateTrainCascadeOptions(sel, cat) {
    const trains = ((window.NORIRECO?.trains?.TRAINS) || [])
      .filter(t => t.category === cat)
      .sort((a, b) => {
        if (!!a.discontinued !== !!b.discontinued) return a.discontinued ? 1 : -1;
        return (a.name || '').localeCompare(b.name || '', 'ja');
      });
    let html = '<option value="">列車を選ぶ...</option>';
    for (const t of trains) {
      const disc = t.discontinued ? ' (廃止)' : '';
      const rarity = t.rarity === 'legendary' ? ' ⭐' : (t.rarity === 'rare' ? ' ✨' : '');
      html += `<option value="${_escHtml(t.id)}">${_escHtml(t.name)}${rarity}${disc}</option>`;
    }
    html += '<option value="__custom__">📝 リストにない (手入力)</option>';
    sel.innerHTML = html;
  }
  function collectTrainPicker() {
    // v392: per-seg-chip mode は各 handler が同期書き込みしているので _segState は最新。
    //   ただし「保存ボタン押下時に DOM focus が __custom__ input にあり、input event 後の値を再吸収」
    //   する safety net (07 saveMultiSegmentTrip 1167-1192 と同形) は念のため残す。
    if (featTrain === 'per-seg-chip') {
      // _segState を draft.segments[lineId] に反映 (id ベース merge)
      for (const seg of draft.segments) {
        if (!seg || !seg.lineId) continue;
        const st = _segState.get(seg.lineId);
        if (st) {
          seg.train_category = st.train_category || null;
          seg.train_id       = st.train_id       || null;
          seg.train_name     = st.train_name     || null;
          seg.car_model      = st.car_model      || null;
        }
      }
    } else if (featTrain === 'per-seg-rows') {
      // v393 (B-2): 各 row の DOM 値を直接読んで draft.segments[*] に反映。
      //   DOM が同時に全部見えているため _segState mirror は不要 — DOM 自体が state。
      //   集約ルール (trip.train_* = all-seg-match ? value : null) は呼出側 (saveTripEdit) で行う。
      const TRAINS = (window.NORIRECO?.trains?.TRAINS) || [];
      for (let i = 0; i < draft.segments.length; i++) {
        const seg = draft.segments[i];
        if (!seg) continue;
        const row = _trainEl.querySelector(`.tde-rows-seg[data-seg-idx="${i}"]`);
        if (!row) continue;
        const cat = ((row.querySelector('.tde-rows-cat')?.value) || '').trim() || null;
        seg.train_category = cat;
        if (cat === 'local') {
          seg.train_id = null;
          seg.train_name = null;
          seg.car_model = ((row.querySelector('.tde-rows-car')?.value) || '').trim() || null;
        } else if (cat) {
          const tidVal = ((row.querySelector('.tde-rows-train-id')?.value) || '').trim();
          if (tidVal && tidVal !== '__custom__') {
            seg.train_id = tidVal;
            const train = TRAINS.find(t => t.id === tidVal);
            seg.train_name = train?.name || null;
          } else if (tidVal === '__custom__') {
            seg.train_id = null;
            seg.train_name = ((row.querySelector('.tde-rows-train-name')?.value) || '').trim() || null;
          } else {
            seg.train_id = null;
            seg.train_name = null;
          }
          const carSelVal = ((row.querySelector('.tde-rows-car-select')?.value) || '').trim();
          if (carSelVal && carSelVal !== '__custom__') {
            seg.car_model = carSelVal;
          } else {
            seg.car_model = ((row.querySelector('.tde-rows-car')?.value) || '').trim() || null;
          }
        } else {
          seg.train_id = null;
          seg.train_name = null;
          seg.car_model = null;
        }
      }
    } else if (featTrain === 'trip-level') {
      // v393 (B-2): 4 input の DOM 値を draft.train_* に反映。
      //   train_id は dropdown 値が master id なら採用、'__custom__' or '' なら null。
      //   train_name は input から取得 (master 選択時は shadow value、__custom__ 時は手入力)。
      const catSel = _trainEl.querySelector('.tde-trip-category');
      const trainSel = _trainEl.querySelector('.tde-trip-train-id');
      const trainNameInp = _trainEl.querySelector('.tde-trip-train-name');
      const carModelInp = _trainEl.querySelector('.tde-trip-car-model');
      const cat = ((catSel?.value) || '').trim() || null;
      const tidRaw = ((trainSel?.value) || '').trim();
      const tname = ((trainNameInp?.value) || '').trim() || null;
      const car = ((carModelInp?.value) || '').trim() || null;
      draft.train_category = cat;
      draft.train_id = (tidRaw && tidRaw !== '__custom__') ? tidRaw : null;
      draft.train_name = tname;
      draft.car_model = car;
    }
  }

  // ── delay section (v394 B-3a / v397 B-3c で maniaToggle 拡張) ─────
  // 13b v185 / 07 v185 の h/m number input ペアを factory に複製。
  //   - features.delay = true                                    → 常時表示 (13b)
  //   - features.delay = { maniaToggle:true, prefKey:'…' }       → checkbox + localStorage 永続化 (07)
  //   collect: h*60 + m を draft.delay_minutes (0 なら null、上限 5999 にクランプ)
  //   maniaToggle が ON で checkbox OFF のとき: h/m input は hide。collect は null を返す (入力 cleared)。
  function initDelay() {
    const inputStyle = 'width:64px;background:rgba(20,32,46,.8);color:var(--white);border:1px solid var(--track);border-radius:6px;padding:6px 8px;font-family:\'DM Mono\',monospace;font-size:12px;color-scheme:dark';
    const lblStyle = 'font-size:10px;color:var(--silver)';
    const headerStyle = 'font-size:11px;color:var(--gold);margin-bottom:6px';
    const total = (typeof draft.delay_minutes === 'number' && draft.delay_minutes > 0) ? draft.delay_minutes : 0;
    const hVal = total >= 60 ? String(Math.floor(total / 60)) : '';
    const mVal = (total % 60) > 0 ? String(total % 60) : (total > 0 && total < 60 ? String(total) : '');

    // maniaToggle 初期 ON/OFF を localStorage から復元 (失敗時は OFF デフォルト)。
    let maniaOn = false;
    if (featDelay.maniaToggle && featDelay.prefKey) {
      try { maniaOn = (localStorage.getItem(featDelay.prefKey) === '1'); } catch (e) {}
    }
    // 初期値が delay_minutes > 0 なら maniaToggle 関係なく row 表示 (古い値が hide で消えるのを防ぐ)
    const showRowInit = featDelay.maniaToggle ? (maniaOn || total > 0) : true;

    let toggleHtml = '';
    if (featDelay.maniaToggle) {
      toggleHtml = `
        <label class="tde-delay-toggle-lbl" style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--silver);cursor:pointer;user-select:none;margin-bottom:6px">
          <input type="checkbox" class="tde-delay-toggle" ${showRowInit ? 'checked' : ''} style="margin:0;cursor:pointer">
          <span>⏱ 遅延も記録する</span>
        </label>
      `;
    }
    _delayEl.innerHTML = `
      ${featDelay.maniaToggle ? '' : `<div class="tde-delay-header" style="${headerStyle}">⏱ 遅延</div>`}
      ${toggleHtml}
      <div class="tde-delay-row" style="display:${showRowInit ? 'flex' : 'none'};gap:8px;align-items:center;flex-wrap:wrap">
        <input type="number" class="tde-delay-h" min="0" max="99" step="1" placeholder="0" value="${_escHtml(hVal)}" style="${inputStyle}">
        <span style="${lblStyle}">時間</span>
        <input type="number" class="tde-delay-m" min="0" max="59" step="1" placeholder="0" value="${_escHtml(mVal)}" style="${inputStyle}">
        <span style="${lblStyle}">分遅れ</span>
      </div>
    `;
    if (featDelay.maniaToggle) {
      const tgl = _delayEl.querySelector('.tde-delay-toggle');
      const row = _delayEl.querySelector('.tde-delay-row');
      if (tgl && row) {
        tgl.addEventListener('change', () => {
          const on = tgl.checked;
          row.style.display = on ? 'flex' : 'none';
          if (featDelay.prefKey) {
            try { localStorage.setItem(featDelay.prefKey, on ? '1' : '0'); } catch (e) {}
          }
          if (!on) {
            // OFF にしたら入力値クリア (隠れた state を残さない、07 旧 onRecDelayToggle と同形)
            const h = _delayEl.querySelector('.tde-delay-h');
            const m = _delayEl.querySelector('.tde-delay-m');
            if (h) h.value = '';
            if (m) m.value = '';
          }
          if (onChange) try { onChange(); } catch (e) {}
        });
      }
    }
    if (onChange) {
      _delayEl.querySelector('.tde-delay-h')?.addEventListener('input', () => { try { onChange(); } catch (e) {} });
      _delayEl.querySelector('.tde-delay-m')?.addEventListener('input', () => { try { onChange(); } catch (e) {} });
    }
  }
  function collectDelay() {
    // maniaToggle が ON 状態で row hide のとき (= checkbox OFF) は入力値があっても無視 → null
    if (featDelay.maniaToggle) {
      const tgl = _delayEl.querySelector('.tde-delay-toggle');
      if (tgl && !tgl.checked) { draft.delay_minutes = null; return; }
    }
    const hRaw = _delayEl.querySelector('.tde-delay-h')?.value;
    const mRaw = _delayEl.querySelector('.tde-delay-m')?.value;
    const h = (hRaw != null && hRaw !== '') ? Math.max(0, Math.min(99, parseInt(hRaw, 10) || 0)) : 0;
    const m = (mRaw != null && mRaw !== '') ? Math.max(0, Math.min(59, parseInt(mRaw, 10) || 0)) : 0;
    const total = h * 60 + m;
    draft.delay_minutes = (total > 0) ? Math.min(5999, total) : null;
  }

  // ── notes section (v394 B-3a) ───────────────────────────────────
  // 13b の #trip-edit-notes / 07 の #rec-edit-notes と同形の textarea。
  //   - rows=2、resize:vertical、min-height:48px。space-only は null。
  function initNotes() {
    const headerStyle = 'font-size:11px;color:var(--gold);margin:10px 0 6px';
    _notesEl.innerHTML = `
      <div class="tde-notes-header" style="${headerStyle}">📝 自由メモ</div>
      <textarea class="tde-notes-textarea" rows="3" placeholder="自由メモ (車内エピソード・運休情報など)"
        style="width:100%;box-sizing:border-box;background:rgba(20,32,46,.8);color:var(--white);border:1px solid var(--track);border-radius:6px;padding:8px;font-size:12px;resize:vertical;min-height:64px;font-family:inherit"></textarea>
    `;
    const ta = _notesEl.querySelector('.tde-notes-textarea');
    if (ta) {
      ta.value = draft.notes || '';
      if (onChange) ta.addEventListener('input', () => { try { onChange(); } catch (e) {} });
    }
  }
  function collectNotes() {
    const raw = _notesEl.querySelector('.tde-notes-textarea')?.value;
    draft.notes = (raw || '').trim() || null;
  }

  // ── photos section (B-1 段階で唯一実体化済 — PhotoArea を wrap するだけ) ──
  function initPhotos() {
    _photosEl.innerHTML = '<div class="tde-photo-inner"></div>';
    const photoInner = _photosEl.querySelector('.tde-photo-inner');
    _photoArea = createPhotoArea({
      container: photoInner,
      kind: featPhotos.kind || 'trip',
      getOwnerId: (typeof featPhotos.getOwnerId === 'function') ? featPhotos.getOwnerId : (() => null),
      // v434: initialItems (再 mount スナップショット) があれば優先 — 一括記録のアコーディオン復元用。
      initialItems: Array.isArray(featPhotos.initialItems) ? featPhotos.initialItems : null,
      initialPhotos: featPhotos.initialPhotos || draft.photos || [],
      maxCount: featPhotos.maxCount || 5,
      onChange: onChange ? () => { try { onChange(); } catch (e) {} } : null,
    });
  }

  // ── 公開メソッド ─────────────────────────────────────────────
  return {
    // 各 section の DOM 値を draft に反映してから clone を返す。
    // 呼出側 (saveMultiSegmentTrip / saveTripEdit) はここから値を取って Supabase POST へ。
    getDraft() {
      if (featTime)  collectTimeRow();
      if (featTrain) collectTrainPicker();
      if (featDelay) collectDelay();
      if (featNotes) collectNotes();
      return {
        ...draft,
        segments: draft.segments.map(s => ({ ...s })),
      };
    },

    // PhotoArea ラッパ。trip_id 確定後 (saveMultiSegmentTrip 内) に呼ぶ。
    // 写真機能 OFF のときは空配列を返す。
    async uploadAndGetPhotos(ownerIdOverride) {
      if (!_photoArea) return [];
      return _photoArea.uploadAndGetPhotos(ownerIdOverride);
    },

    // v434: 写真 items の再 mount 用スナップショット。一括記録のアコーディオンが
    //   行切替で editor を destroy → 再 open する際、未アップロード写真を draft に
    //   退避してから destroy するために使う (destroy 後は PhotoArea が無いため空配列)。
    getPhotoItems() {
      return _photoArea ? _photoArea.getItemsSnapshot() : [];
    },

    // 内部 PhotoArea (blob URL revoke) + DOM クリア。
    // モーダル close 時に必ず呼ぶこと (PhotoArea v258 と同じ規約)。
    destroy() {
      if (_photoArea) {
        try { _photoArea.destroy(); } catch (e) {}
        _photoArea = null;
      }
      // v399 (B-4-b): containers モードでは各 section コンテナを個別クリア (container は無い)。
      if (ext) {
        for (const el of [_timeEl, _trainEl, _delayEl, _notesEl, _photosEl]) {
          if (el && el.parentNode) { try { el.innerHTML = ''; } catch (e) {} }
        }
      } else {
        try { container.innerHTML = ''; } catch (e) {}
      }
    },
  };
}
