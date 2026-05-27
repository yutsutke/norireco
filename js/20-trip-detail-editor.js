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
//     container,         // HTMLElement (中身は本 module が描画)
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
//     v371-v382 で使っていたグローバル NORIRECO.trains.selectedXxxBySl / activeChipSlId は撤廃 (B-4)。
//   - per-seg-rows mode: 全 seg 行が同時表示なので各行の DOM 自体が state。
//   - trip-level mode: draft.train_* 1 set のみ。
//
// 実装段階:
//   B-1 (v392, 本コミット): factory 関数 + features 分岐 + section スケルトンを配置。
//                            per-seg-chip 等の本格的なロジックは TODO で次セッションへ。
//   B-2: 13b 編集モーダルを per-seg-rows / trip-level mode で本コンポーネントに移行。
//   B-3: 時刻 / 遅延 / メモ も完全に本コンポーネントへ集約、HTML 側を圧縮。
//   B-4: グローバル NORIRECO.trains.selectedXxxBySl / activeChipSlId 撤廃。
// ══════════════════════════════════════════════════════════════

import { createPhotoArea } from './18-photo-area.js';

const DEFAULT_PRECISIONS = ['minute', 'day', 'month', 'year', 'unknown'];

export function createTripDetailEditor(opts) {
  const {
    container,
    initial = {},
    features = {},
    onChange = null,
  } = opts || {};

  if (!container || !(container instanceof HTMLElement)) {
    throw new Error('createTripDetailEditor: container must be an HTMLElement');
  }

  // ── features 正規化 ───────────────────────────────────────────
  const featTime = features.timeRow
    ? { precisions: Array.isArray(features.timeRow.precisions) ? features.timeRow.precisions : DEFAULT_PRECISIONS }
    : null;
  const featTrain = (features.trainPicker === 'per-seg-chip'
                  || features.trainPicker === 'per-seg-rows'
                  || features.trainPicker === 'trip-level')
                    ? features.trainPicker : null;
  const featDelay = !!features.delay;
  const featNotes = !!features.notes;
  const featPhotos = (features.photos && typeof features.photos === 'object') ? features.photos : null;

  // ── internal state ────────────────────────────────────────────
  // draft は initial の浅いコピー。getDraft で各 collect* が DOM 値を反映してから返す。
  const draft = {
    date:           initial.date           || null,
    depart_time:    initial.depart_time    || null,
    arrive_time:    initial.arrive_time    || null,
    date_precision: initial.date_precision || 'minute',
    segments:       Array.isArray(initial.segments) ? initial.segments.map(s => ({ ...s })) : [],
    train_category: initial.train_category || null,
    train_id:       initial.train_id       || null,
    train_name:     initial.train_name     || null,
    car_model:      initial.car_model      || null,
    delay_minutes:  (initial.delay_minutes != null) ? initial.delay_minutes : null,
    notes:          initial.notes          || null,
    photos:         Array.isArray(initial.photos) ? initial.photos.slice() : [],
  };

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
  // セクション毎の枠を 1 度だけ描画。各セクションは features に応じて hide/show。
  // section 内の中身 (input / select / chip) は init* 関数が後から流し込む。
  container.innerHTML = `
    <div class="tde-root">
      <div class="tde-section tde-time"   data-section="time"   style="display:${featTime   ? '' : 'none'}"></div>
      <div class="tde-section tde-train"  data-section="train"  style="display:${featTrain  ? '' : 'none'}"></div>
      <div class="tde-section tde-delay"  data-section="delay"  style="display:${featDelay  ? '' : 'none'}"></div>
      <div class="tde-section tde-notes"  data-section="notes"  style="display:${featNotes  ? '' : 'none'}"></div>
      <div class="tde-section tde-photos" data-section="photos" style="display:${featPhotos ? '' : 'none'}"></div>
    </div>
  `;

  const _timeEl   = container.querySelector('.tde-time');
  const _trainEl  = container.querySelector('.tde-train');
  const _delayEl  = container.querySelector('.tde-delay');
  const _notesEl  = container.querySelector('.tde-notes');
  const _photosEl = container.querySelector('.tde-photos');

  // 各 init は features が ON のときだけ呼ぶ。
  if (featTime)   initTimeRow();
  if (featTrain)  initTrainPicker();
  if (featDelay)  initDelay();
  if (featNotes)  initNotes();
  if (featPhotos) initPhotos();

  // ── time section ──────────────────────────────────────────────
  function initTimeRow() {
    // TODO (B-3): 5 精度 (minute/day/month/year/unknown) 切替 UI を 07 から移植
    //   - 現状: 07 の #rec-time-edit-section + onRecEditPrecisionChange + updateRecConfirmTimeRow
    //   - features.timeRow.precisions で表示可能な精度を絞る (13b は ['minute','day'] のみ)
    //   - DOM id 衝突を避けるため、内部要素は class 名 (.tde-time-*) で参照する
    _timeEl.innerHTML = '<!-- TODO B-3: time row (precisions=' + (featTime.precisions || []).join(',') + ') -->';
  }
  function collectTimeRow() {
    // TODO (B-3): DOM から date / depart_time / arrive_time / date_precision を読んで draft に反映
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
  function initTrainPickerRows() {
    // TODO (B-2): 13b の applyTripEditSegCategoryVisibility / populateTripEditSegCarSelect /
    //   restoreTripEditSegCascade / onTripEditSegCategoryChange / onTripEditSegTrainChange /
    //   onTripEditSegCarChange を本コンポーネントに移植 (全 seg 同時 row 描画)。
    _trainEl.innerHTML = '<!-- TODO B-2: per-seg-rows train picker -->';
  }
  function initTrainPickerTripLevel() {
    // TODO (B-2): segments なし旧 trip 用、trip 単位 1 set の cat/train_id/train_name/car_model。
    //   13b の trip-edit-train-category 等の 4 input を本コンポーネントに移植。
    _trainEl.innerHTML = '<!-- TODO B-2: trip-level train picker -->';
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
      // TODO (B-2): 全 row 走査で各 row の DOM 値を読んで draft.segments[*] に反映
    } else if (featTrain === 'trip-level') {
      // TODO (B-2): draft.train_category / train_id / train_name / car_model に DOM 値を反映
    }
  }

  // ── delay section ─────────────────────────────────────────────
  function initDelay() {
    // TODO (B-3): h/m input。07 は独立トグル (rec-delay-toggle) で hide/show、13b は常時表示。
    //   features.delay は boolean のみ (toggle 挙動はモーダル外側に残す方針) でいったん作る。
    _delayEl.innerHTML = '<!-- TODO B-3: delay (h/m inputs) -->';
  }
  function collectDelay() {
    // TODO (B-3): h*60 + m を delay_minutes に集約 (0 のときは null)
  }

  // ── notes section ─────────────────────────────────────────────
  function initNotes() {
    // TODO (B-3): 自由メモ textarea
    _notesEl.innerHTML = '<!-- TODO B-3: notes textarea -->';
  }
  function collectNotes() {
    // TODO (B-3): textarea から trim して draft.notes に反映
  }

  // ── photos section (B-1 段階で唯一実体化済 — PhotoArea を wrap するだけ) ──
  function initPhotos() {
    _photosEl.innerHTML = '<div class="tde-photo-inner"></div>';
    const photoInner = _photosEl.querySelector('.tde-photo-inner');
    _photoArea = createPhotoArea({
      container: photoInner,
      kind: featPhotos.kind || 'trip',
      getOwnerId: (typeof featPhotos.getOwnerId === 'function') ? featPhotos.getOwnerId : (() => null),
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

    // 内部 PhotoArea (blob URL revoke) + DOM クリア。
    // モーダル close 時に必ず呼ぶこと (PhotoArea v258 と同じ規約)。
    destroy() {
      if (_photoArea) {
        try { _photoArea.destroy(); } catch (e) {}
        _photoArea = null;
      }
      try { container.innerHTML = ''; } catch (e) {}
    },
  };
}
