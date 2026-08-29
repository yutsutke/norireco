// ══════════════════════════════════════════════════════════════
// 📦 データエクスポート (v455)
//
// 【なぜ】「堀 (囲い込み) を作らず、お客さん視点で」— 記録はユーザーのもの。
//   旅程・駅メモ・キャラ獲得履歴・写真を、いつでも・何度でも・全部
//   (またはカテゴリを選んで) ZIP 1 個で持ち出せるようにする。
//
// 【設計】
//   - データはエクスポート実行時に Supabase から select=* で取り直す
//     (画面キャッシュの古さ・欠落列を避ける)。ゲストは localStorage の
//     user_id 無し trip のみ (v419 のゲスト判定と同じ)。
//   - JSON = 全列そのまま dump した完全データ (他アプリ取込・バックアップ用)。
//     CSV = 表計算ソフト用に人が読める列へ整形。UTF-8 BOM 付き
//     (BOM = ファイル先頭の目印。無いと Excel が日本語を文字化けさせる)。
//   - 写真は cdn.norireco.app から実ファイルを取得して ZIP に同梱。
//     取得に失敗した分は export-report.txt に URL を列挙 (JSON 側に URL は常に残る
//     のでデータとしては失われない)。fetch には cache:'reload' 必須 — 理由は
//     fetchPhoto() のコメント参照 (v456 で実機再現して確定した罠)。
//   - ZIP 生成は JSZip を cdnjs から lazy load (v439 html2canvas と同じパターン。
//     使うときだけ読み込み、初期ロードを太らせない)。
//
// 【循環 import 回避】import は 12-auth のみ (12-auth は本ファイルを import しない)。
//   SUPABASE_URL / SUPABASE_KEY は window 経由 (v427 教訓: 12-auth からは
//   named export されていないため。13e-admin.js と同じパターン)。
// ══════════════════════════════════════════════════════════════

import { authBearerToken, currentUserId } from './12-auth.js';

window.NORIRECO = window.NORIRECO || {};

// BOM 文字。ソースに不可視文字を直接埋めると grep/diff が壊れるので
// コードポイント指定で生成する (エスケープ表記もツールに化けやすいので避ける)
const BOM = String.fromCharCode(0xFEFF);

// ── JSZip lazy load ───────────────────────────────────────────
let _jszipPromise = null;
function loadJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (_jszipPromise) return _jszipPromise;
  _jszipPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.async = true;
    s.onload = () => window.JSZip ? resolve(window.JSZip) : reject(new Error('JSZip ロード失敗'));
    s.onerror = () => { _jszipPromise = null; reject(new Error('ZIP ライブラリの読み込みに失敗しました (オフライン?)')); };
    document.head.appendChild(s);
  });
  return _jszipPromise;
}

// ── モーダル開閉 ──────────────────────────────────────────────
function openExportModal() {
  const modal = document.getElementById('export-modal');
  if (!modal) return;
  const isGuest = !currentUserId();
  // ゲストは旅程 (この端末に保存された分) のみ。他カテゴリは選択不可にする
  ['memos', 'chars', 'photos'].forEach((k) => {
    const cb = document.getElementById(`exp-cat-${k}`);
    if (!cb) return;
    cb.disabled = isGuest;
    cb.checked = !isGuest;
    const row = cb.closest('.export-cat');
    if (row) row.classList.toggle('disabled', isGuest);
  });
  const tripsCb = document.getElementById('exp-cat-trips');
  if (tripsCb) tripsCb.checked = true;
  const gn = document.getElementById('export-guest-note');
  if (gn) gn.style.display = isGuest ? '' : 'none';
  setProgress('');
  const btn = document.getElementById('export-run-btn');
  if (btn) { btn.disabled = false; btn.textContent = '📦 エクスポート (ZIP)'; }
  modal.classList.add('open');
}

function closeExportModal() {
  const modal = document.getElementById('export-modal');
  if (modal) modal.classList.remove('open');
}

function setProgress(text) {
  const el = document.getElementById('export-progress');
  if (!el) return;
  el.style.display = text ? '' : 'none';
  el.textContent = text;
}

// ── データ取得 ────────────────────────────────────────────────
async function fetchTableAll(table, orderCol) {
  const uid = currentUserId();
  const order = orderCol ? `&order=${orderCol}.desc` : '';
  const res = await fetch(
    `${window.SUPABASE_URL}/rest/v1/${table}?user_id=eq.${encodeURIComponent(uid)}&select=*${order}`,
    { headers: { 'apikey': window.SUPABASE_KEY, 'Authorization': `Bearer ${authBearerToken()}` } }
  );
  if (!res.ok) throw new Error(`${table} の取得に失敗 (HTTP ${res.status})`);
  return res.json();
}

async function collectTrips() {
  const uid = currentUserId();
  if (!uid) {
    // ゲスト: localStorage の user_id 無し trip のみ (v419 と同じ判定)
    try {
      const raw = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
      return Array.isArray(raw) ? raw.filter(t => !t.user_id) : [];
    } catch (e) { return []; }
  }
  const rows = await fetchTableAll('norireco_trips', 'recorded_at');
  // v183 と同じ localStorage merge: notes / delay_minutes は Supabase スキーマ未拡張で
  // 端末にしか無いため、id で突き合わせて補完する (無ければそのまま)
  try {
    const localTrips = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    const localById = new Map((Array.isArray(localTrips) ? localTrips : []).map(t => [t.id, t]));
    return rows.map(t => {
      const lt = localById.get(t.id);
      if (!lt) return t;
      const merged = { ...t };
      if (merged.notes == null && lt.notes != null) merged.notes = lt.notes;
      if (merged.delay_minutes == null && lt.delay_minutes != null) merged.delay_minutes = lt.delay_minutes;
      return merged;
    });
  } catch (e) { return rows; }
}

// ── CSV 整形 ──────────────────────────────────────────────────
// セルに , " 改行 が入っても壊れないよう " で囲み、中の " は "" に重ねる (CSV の標準ルール)
function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(rows) {
  return BOM + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
}

function stationNameById(id) {
  if (!id) return '';
  const ms = (NORIRECO.data && Array.isArray(NORIRECO.data.MERGED_STATIONS))
    ? NORIRECO.data.MERGED_STATIONS.find(m => m.id === id) : null;
  return ms ? (ms.name || id) : id;
}

const PRECISION_LABEL = { minute: '分まで', day: '日まで', month: '月ごろ', year: '年ごろ', unknown: '不明' };
const SOURCE_LABEL = { gps_button: 'GPS', manual: '手動', mcp: 'AIチャット' };

// 区間ごとの列車・車両を「あずさ [E353系] / [205系]」形式に集約 (v379 の sources パターン)
function tripTrainSummary(t) {
  const segs = Array.isArray(t.segments) ? t.segments : [];
  const segSrc = segs
    .map(s => ({ n: s && s.train_name, c: s && s.car_model }))
    .filter(s => s.n || s.c);
  const list = segSrc.length > 0 ? segSrc : [{ n: t.train_name, c: t.car_model }];
  const parts = list
    .map(s => s.n && s.c ? `${s.n} [${s.c}]` : (s.n || (s.c ? `[${s.c}]` : '')))
    .filter(Boolean);
  return [...new Set(parts)].join(' / ');
}

function tripsToCsv(trips) {
  const rows = [[
    '日付', '記憶の精度', '旅程名', '出発駅', '到着駅', '経路', '駅数', '乗換回数',
    '所要分', '出発時刻', '到着時刻', '列車・車両', '記録方法', '遅延分', 'メモ',
    '写真枚数', '記録日時', 'ID',
  ]];
  for (const t of trips) {
    rows.push([
      t.date, PRECISION_LABEL[t.date_precision] || t.date_precision, t.name,
      stationNameById(t.from_station_id), stationNameById(t.to_station_id),
      t.line_list, t.total_stations, t.transfers, t.total_minutes,
      t.depart_time, t.arrive_time, tripTrainSummary(t),
      SOURCE_LABEL[t.source] || t.source, t.delay_minutes, t.notes,
      (Array.isArray(t.photos) ? t.photos.filter(p => p && p.url).length : 0),
      t.recorded_at, t.id,
    ]);
  }
  return toCsv(rows);
}

function memosToCsv(memos) {
  const rows = [[
    '作成日時', '駅', '種類', '気分', 'タグ', '本文', '路線', '列車', '車両形式',
    '写真枚数', 'ID',
  ]];
  for (const m of memos) {
    rows.push([
      m.created_at, stationNameById(m.station_id), m.memo_type, m.mood,
      (Array.isArray(m.tags) ? m.tags.join(' / ') : ''), m.comment,
      m.line_name, m.train_name, m.car_model,
      (Array.isArray(m.photos) ? m.photos.filter(p => p && p.url).length : 0),
      m.id,
    ]);
  }
  return toCsv(rows);
}

// ── 写真 ──────────────────────────────────────────────────────
function photoExt(url) {
  const m = String(url).match(/\.(jpe?g|png|webp|gif|avif)(?:\?|$)/i);
  return m ? m[1].toLowerCase() : 'jpg';
}
// フォルダ名に使えない文字 (\ / : * ? " < > |) と空白類を _ に置換
function sanitizeName(s) {
  return String(s == null ? '' : s).replace(/[\\/:*?"<>|\s]/g, '_').slice(0, 40);
}

// 写真 1 枚を取得する。cache:'reload' が必須。
//
// 【v456 で実機再現した罠】マイページの旅程・メモ一覧は写真サムネを <img> で表示する。
//   <img> は「他ドメインから読んでよい」許可ヘッダ (CORS) を必要としないため、
//   cdn.norireco.app はそのリクエストに許可ヘッダを付けずに返す。さらにこのレスポンスには
//   Vary: Origin (リクエスト内容で中身が変わるという目印) も付かないので、ブラウザは
//   「このコピーはどの用途にも使い回せる」と判断してキャッシュする。
//   → 後から JS の fetch (CORS 必須) が同じ URL を叩くとその許可ヘッダ無しのコピーが
//     返り、ブラウザが弾いて TypeError: Failed to fetch になる。
//
//   本番で実測した挙動 (同一 URL・順序だけ変えた対照実験):
//     img 表示 → 素の fetch          … Failed to fetch  ← ユスケの報告と一致
//     img 表示 → cache:'reload' fetch … 200 OK
//     img 表示なし → 素の fetch       … 200 OK  (初回テストが通ってしまった理由)
//
//   cache:'reload' はキャッシュを読まずに必ずネットワークへ行くので、Origin 付きの
//   リクエストが飛び正しい許可ヘッダ付きのレスポンスが返る。念のため失敗時は
//   クエリを足して (= 別のキャッシュ入口にして) もう一度だけ試す。
async function fetchPhoto(url) {
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'reload' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  } catch (e) {
    const sep = url.includes('?') ? '&' : '?';
    const res2 = await fetch(`${url}${sep}_x=${Date.now()}`, { mode: 'cors', cache: 'no-store' });
    if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
    return res2.blob();
  }
}

// trips / memos の photos[] から取得ジョブを列挙
function listPhotoJobs(trips, memos) {
  const jobs = [];
  for (const t of trips || []) {
    const photos = (Array.isArray(t.photos) ? t.photos : []).filter(p => p && p.url);
    photos.forEach((p, i) => jobs.push({
      url: p.url,
      // id は「trip_<タイムスタンプ>_<ランダム>」形式なので先頭でなく末尾 6 文字 (ランダム部)
      // を使う。先頭だと全旅程が「trip_1」になり同日 trip のフォルダが衝突する
      folder: `旅程_${sanitizeName(t.date || '日付不明')}_${String(t.id || '').slice(-6)}`,
      idx: i + 1,
    }));
  }
  for (const m of memos || []) {
    const photos = (Array.isArray(m.photos) ? m.photos : []).filter(p => p && p.url);
    photos.forEach((p, i) => jobs.push({
      url: p.url,
      folder: `メモ_${sanitizeName(stationNameById(m.station_id) || '駅不明')}_${String(m.id || '').slice(-6)}`,
      idx: i + 1,
    }));
  }
  return jobs;
}

// ── README ────────────────────────────────────────────────────
function buildReadme(counts, isGuest) {
  const email = (NORIRECO.auth && NORIRECO.auth.currentUser && NORIRECO.auth.currentUser.email) || '';
  const lines = [
    '乗レコ データエクスポート',
    `生成日時: ${new Date().toLocaleString('ja-JP')}`,
    `アカウント: ${isGuest ? 'ゲスト (この端末に保存された記録のみ)' : email}`,
    '',
    '── 同梱ファイル ──',
  ];
  if ('旅程' in counts) lines.push(`- trips.csv / trips.json … 旅程 (乗車記録) ${counts['旅程']} 件`);
  if ('駅メモ' in counts) lines.push(`- memos.csv / memos.json … 駅メモ ${counts['駅メモ']} 件`);
  if ('キャラ獲得履歴' in counts) lines.push(`- characters.json … キャラ獲得履歴 ${counts['キャラ獲得履歴']} 件`);
  if ('写真' in counts) {
    lines.push(`- photos/ … 写真 ${counts['写真']} 枚。フォルダ名は「種類_日付や駅名_ID の一部」で、CSV / JSON の ID 列と対応`);
  }
  if (counts['写真(取得失敗)']) {
    lines.push(`- export-report.txt … 取得できなかった写真 ${counts['写真(取得失敗)']} 枚の URL 一覧`);
  }
  lines.push(
    '',
    '── メモ ──',
    '- CSV は Excel などの表計算ソフトでそのまま開けます (UTF-8)',
    '- JSON はすべての項目が入った完全なデータです (他アプリへの取込・バックアップ用)',
    '- 写真の元 URL は trips.json / memos.json の photos[].url にも入っています',
    '- このエクスポートはマイページの 📦 ボタンから、いつでも・何度でも実行できます',
    '',
    '乗レコ - 電車旅  https://norireco.app',
  );
  return lines.join('\r\n');
}

// ── 本体 ──────────────────────────────────────────────────────
async function runExport() {
  const want = (k) => {
    const cb = document.getElementById(`exp-cat-${k}`);
    return !!(cb && cb.checked && !cb.disabled);
  };
  const wants = { trips: want('trips'), memos: want('memos'), chars: want('chars'), photos: want('photos') };
  if (!wants.trips && !wants.memos && !wants.chars && !wants.photos) {
    alert('エクスポートするデータを 1 つ以上選んでください');
    return;
  }
  const btn = document.getElementById('export-run-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ エクスポート中…'; }
  try {
    const JSZip = await loadJSZip();
    const zip = new JSZip();
    const uid = currentUserId();
    const counts = {};
    const report = [];

    // 写真は trips / memos の photos[] から辿るため、📷 だけ選んだ場合もデータ本体は取得する
    let trips = null;
    let memos = null;
    if (wants.trips || wants.photos) {
      setProgress('🚃 旅程を取得中…');
      trips = await collectTrips();
    }
    if ((wants.memos || wants.photos) && uid) {
      setProgress('📸 駅メモを取得中…');
      memos = await fetchTableAll('norireco_memos', 'created_at');
    }

    if (wants.trips) {
      zip.file('trips.json', JSON.stringify(trips, null, 2));
      zip.file('trips.csv', tripsToCsv(trips));
      counts['旅程'] = trips.length;
    }
    if (wants.memos && uid) {
      zip.file('memos.json', JSON.stringify(memos, null, 2));
      zip.file('memos.csv', memosToCsv(memos));
      counts['駅メモ'] = memos.length;
    }
    if (wants.chars && uid) {
      setProgress('🎭 キャラ獲得履歴を取得中…');
      const grants = await fetchTableAll('norireco_character_grants');
      zip.file('characters.json', JSON.stringify(grants, null, 2));
      counts['キャラ獲得履歴'] = grants.length;
    }

    if (wants.photos && uid) {
      const jobs = listPhotoJobs(trips, memos);
      let ok = 0;
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        setProgress(`📷 写真を取得中… (${i + 1}/${jobs.length})`);
        try {
          const blob = await fetchPhoto(job.url);
          zip.file(`photos/${job.folder}/${job.idx}.${photoExt(job.url)}`, blob);
          ok++;
        } catch (e) {
          report.push(`取得失敗: ${job.url} (${e.message})`);
        }
      }
      counts['写真'] = ok;
      if (report.length) counts['写真(取得失敗)'] = report.length;
    }

    zip.file('README.txt', buildReadme(counts, !uid));
    if (report.length) zip.file('export-report.txt', BOM + report.join('\r\n'));

    setProgress('🗜 ZIP を生成中…');
    const blob = await zip.generateAsync({ type: 'blob' });
    const d = new Date();
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const fname = `norireco-export-${ymd}.zip`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);

    const summary = Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' / ');
    setProgress(`✅ ${fname} をダウンロードしました (${summary})`);
  } catch (e) {
    console.warn('[エクスポート] 失敗:', e);
    setProgress(`❌ エクスポートに失敗しました: ${e.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📦 エクスポート (ZIP)'; }
  }
}

// ── 公開 (HTML onclick 互換の window ブリッジ + 名前空間) ──────
window.openExportModal = openExportModal;
window.closeExportModal = closeExportModal;
window.runExport = runExport;
NORIRECO.exporter = { openExportModal, closeExportModal, runExport };
