// 🤖 AI チャットから記録 — 案内モーダル (v458)
//
// マイページヘッダの 🤖 から開く。乗レコ の MCP サーバ (mcp.norireco.app) を
// AI チャット (Claude 等) に繋ぐ手順を見せるだけの、読み物 + URL コピーの画面。
// 記録そのものは MCP サーバ側 (mcp/) が処理するので、ここに通信は一切無い。
//
// なぜ案内が要るか: サーバは公開しているが、URL を知らない人には辿り着けない。
// 「堀を作らない」方針 (v453〜v456) の延長で、使える手段は本体から見えるようにする。
//
// 公開 API は window 経由 (HTML の onclick から呼ぶため):
//   openMcpModal / closeMcpModal / copyMcpUrl

const MCP_URL = 'https://mcp.norireco.app/mcp';

export function openMcpModal() {
  const m = document.getElementById('mcp-modal');
  if (!m) return;
  m.classList.add('open');
  const status = document.getElementById('mcp-copy-status');
  if (status) status.textContent = '';
}

export function closeMcpModal() {
  const m = document.getElementById('mcp-modal');
  if (m) m.classList.remove('open');
}

/**
 * 接続先 URL をクリップボードへ。
 * navigator.clipboard は https か localhost でしか使えず、古い iOS でも欠けることが
 * あるので、失敗したら手で選べるように選択状態にして案内する (握り潰さない)。
 */
export async function copyMcpUrl() {
  const status = document.getElementById('mcp-copy-status');
  try {
    await navigator.clipboard.writeText(MCP_URL);
    if (status) status.textContent = '✅ コピーしました';
  } catch (e) {
    const el = document.getElementById('mcp-url');
    if (el) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    if (status) status.textContent = '⚠️ 自動コピーできませんでした。選択状態にしたので、そのままコピーしてください';
  }
}

window.openMcpModal = openMcpModal;
window.closeMcpModal = closeMcpModal;
window.copyMcpUrl = copyMcpUrl;
