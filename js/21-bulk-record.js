// ══════════════════════════════════════════════════════════════
// 一括記録 (まとめて記録) — Notion §1.3 設計確定の A カテゴリ本体。
//
// 入口:
//   (a) マイページ 🚃 旅程サブタブ上部「📋 過去の乗車をまとめて記録」ボタン
//   (b) 空マップ時オンボーディングバナー (A-6 で実装)
//
// 形式: 営業系統チェックリスト (検索 + 「近く / 会社 / 都道府県」フィルタ)。
//   タップ = 全線完乗の draft trip (source=manual, verified=false,
//   date_precision='unknown')。アコーディオン同時 1 行で詳細フォーム展開。
//
// 段階:
//   A-1 (vXXX): skeleton — open/close 制御 + 空ボトムシート mount のみ。
//   A-2: 営業系統チェックリスト本体 + たたむモード (draft 配列に積む)
//   A-3: 一括保存 (draft 配列ループ → trip 構築 → Supabase upsert)
//   A-4: 検索 + フィルタ (近く / 会社 / 都道府県) + 既定「近く」並べ替え
//   A-5: アコーディオン展開 (createTripDetailEditor per-seg-rows mode を行内 mount)
//   A-6: 空マップ時オンボーディングバナー
//   A-7: unknown 完乗率/塗り集計まわりの検証
//
// 前提 (B カテゴリ完結で揃った):
//   - createTripDetailEditor (js/20-trip-detail-editor.js) が 3 mode 実装済み
//   - multi-container API (`containers`) で行展開ごとに別 container mount 可能
//   - グローバル可変 state なし → 複数行展開でも互いに干渉しない
// ══════════════════════════════════════════════════════════════

window.NORIRECO = window.NORIRECO || {};
window.NORIRECO.bulkRecord = window.NORIRECO.bulkRecord || {};

const SHEET_ID = 'bulk-record-sheet';
const BODY_ID  = 'bulk-record-body';

// A-1 skeleton: 空ボトムシートの open/close のみ。
// A-2 以降で body 内に営業系統チェックリスト等を mount する。

export function openBulkRecordSheet() {
  const sheet = document.getElementById(SHEET_ID);
  if (!sheet) {
    console.warn('[bulk-record] #bulk-record-sheet element not found in HTML');
    return;
  }
  // A-1 は中身プレースホルダのみ。
  const body = document.getElementById(BODY_ID);
  if (body) {
    body.innerHTML = `
      <div style="padding:24px 16px;color:var(--silver);font-size:12px;text-align:center;line-height:1.7">
        🚧 一括記録パネル (A-1 skeleton)<br>
        営業系統チェックリスト・たたむ/開くアコーディオンはこの位置に展開されます<br>
        <span style="font-size:10px;opacity:.7">(A-2 以降の段階で順次実装)</span>
      </div>
    `;
  }
  sheet.classList.add('open');
}

export function closeBulkRecordSheet() {
  const sheet = document.getElementById(SHEET_ID);
  if (!sheet) return;
  sheet.classList.remove('open');
  // body は次回 open 時に再構築する。A-5 以降は factory instance の destroy も呼ぶ。
  const body = document.getElementById(BODY_ID);
  if (body) body.innerHTML = '';
}

// HTML onclick / 他 module から呼べるよう公開。
window.openBulkRecordSheet  = openBulkRecordSheet;
window.closeBulkRecordSheet = closeBulkRecordSheet;
NORIRECO.bulkRecord.open  = openBulkRecordSheet;
NORIRECO.bulkRecord.close = closeBulkRecordSheet;
