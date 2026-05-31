// 乗レコ シェア受け側ページ /share/<id> (Cloudflare Pages Function, S-3 / v413)
// ───────────────────────────────────────────────────────────────
// SNS クローラは JS を実行しないので、OGP メタ (og:image 等) を埋めた HTML を
// この Function が SSR して返す。og:image は S-2 で R2 に上げた恒久画像 URL を指す。
//
// データ: norireco_shares テーブル (公開 SELECT RLS) を Supabase REST で id 逆引き。
//   SUPABASE_URL / anon key は frontend (js/05-supabase-data.js) と同じ公開値。
//   anon key はそもそも frontend に露出している公開キーなのでここに置いても新たな漏洩はない。
// ───────────────────────────────────────────────────────────────

// 計測ヘルパー (v436) — SUPABASE 定数 / bot 判定 / RPC 計測 / id バリデーションを共有。
import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_URL, isLikelyBot, bumpShareMetric, isValidShareId } from './_metrics.js';

const DEFAULT_IMAGE = 'https://norireco.app/icon-512.png';

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// og:image は cdn.norireco.app の R2 画像だけ許可 (他所への誘導を防ぐ)
function safeImageUrl(url) {
  if (typeof url === 'string' && url.startsWith('https://cdn.norireco.app/')) return url;
  return DEFAULT_IMAGE;
}

function renderHtml({ id, kind, title, description, image, pageUrl, found }) {
  // OGP メタ用 (見つからない時はアプリ汎用文言)
  const metaTitle = found ? (title || '乗レコの記録') : '乗レコ - 電車旅';
  const metaDesc = found ? (description || '全国鉄道の乗車記録・完乗率を可視化する PWA') : '全国鉄道の乗車記録・完乗率を可視化する PWA。乗り鉄のための YAMAP。';
  const t = escapeHtml(metaTitle);
  const d = escapeHtml(metaDesc);
  const img = escapeHtml(image);
  const url = escapeHtml(pageUrl);
  const headTitle = escapeHtml(found ? `${metaTitle} | 乗レコ` : 'シェアが見つかりません | 乗レコ');
  // CTA は kind で文脈化。リンク先は計測用の /share/<id>/go 経由 (click を数えてから本体へ 302)。
  const ctaLabel = !found ? '🚃 乗レコをひらく'
    : (kind === 'profile' ? '🚃 自分の完乗マップをつくる' : '🚃 自分も乗車記録をはじめる');
  const ctaHref = found ? `/share/${id}/go` : APP_URL;
  // 可視ページ本文 (見つからない時の文言)
  const bodyTitle = found ? t : 'このシェアは見つかりませんでした';
  const bodyDesc = found ? d : '削除されたか、URL が間違っている可能性があります。';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(headTitle)}</title>
<meta name="description" content="${d}">
<meta name="theme-color" content="#E8352A">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${img}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="乗レコ">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${img}">
<style>
  :root{--navy:#0D1B2A;--track:#1E3448;--silver:#8CA0B3;--white:#F4F7FA;--red:#E8352A;--gold:#F2A900;}
  *{box-sizing:border-box;}
  body{margin:0;background:var(--navy);color:var(--white);font-family:'Hiragino Sans','Zen Kaku Gothic New',system-ui,sans-serif;line-height:1.6;}
  .wrap{max-width:680px;margin:0 auto;padding:24px 16px 48px;}
  .topbar{height:6px;background:var(--red);}
  .logo{font-size:26px;font-weight:800;margin:20px 0 8px;}
  .logo span{color:var(--silver);font-size:15px;font-weight:500;margin-left:8px;}
  .card{background:rgba(30,52,72,.4);border:1px solid var(--track);border-radius:14px;overflow:hidden;margin-top:16px;}
  .card img{width:100%;height:auto;display:block;background:#060f1a;}
  .card-body{padding:18px 18px 22px;}
  .title{font-size:22px;font-weight:800;margin:0 0 8px;}
  .desc{font-size:14px;color:var(--silver);margin:0;}
  .cta{display:block;text-align:center;margin-top:24px;background:var(--red);color:#fff;text-decoration:none;font-weight:800;font-size:16px;padding:15px;border-radius:12px;}
  .cta:hover{filter:brightness(1.08);}
  .sub{text-align:center;color:var(--silver);font-size:12px;margin-top:14px;}
  .sub a{color:var(--silver);}
  .feats-h{font-size:13px;color:var(--silver);font-weight:700;margin:26px 0 4px;letter-spacing:.04em;}
  .feats{display:flex;flex-direction:column;gap:12px;margin-top:6px;}
  .feat{display:flex;gap:12px;align-items:flex-start;}
  .feat .ic{font-size:22px;line-height:1.3;flex:none;width:30px;text-align:center;}
  .feat .tx{font-size:13px;color:var(--silver);line-height:1.5;}
  .feat .tt{color:var(--white);font-weight:700;font-size:14px;margin-bottom:1px;}
</style>
</head>
<body>
<div class="topbar"></div>
<div class="wrap">
  <div class="logo">🚃 乗レコ<span>- 電車旅</span></div>
  <div class="card">
    <img src="${img}" alt="${t}" width="1200" height="630">
    <div class="card-body">
      <h1 class="title">${bodyTitle}</h1>
      <p class="desc">${bodyDesc}</p>
    </div>
  </div>
  <a class="cta" href="${escapeHtml(ctaHref)}">${ctaLabel}</a>
  <div class="feats-h">乗レコでできること</div>
  <div class="feats">
    <div class="feat"><div class="ic">🗾</div><div class="tx"><div class="tt">全国マップで完乗率</div>乗った路線が地図に色づき、あなたの「完乗率」が一目でわかる。</div></div>
    <div class="feat"><div class="ic">🎭</div><div class="tx"><div class="tt">駅キャラを集める</div>駅を訪れるとご当地の駅キャラを獲得。旅の記録がコレクションに。</div></div>
    <div class="feat"><div class="ic">📍</div><div class="tx"><div class="tt">ワンタップ記録</div>乗った区間をタップで記録。手動でも GPS でも、まとめて一括でも。</div></div>
  </div>
  <p class="sub">全国鉄道の乗車記録・完乗率を可視化する PWA・<a href="${escapeHtml(APP_URL)}">norireco.app</a></p>
</div>
</body>
</html>`;
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const id = params && params.id;
  const pageUrl = new URL(request.url).toString();

  // id バリデーション (R2 share_id = 16 桁 hex 想定。緩めに英数 6〜64)
  if (!isValidShareId(id)) {
    return htmlResponse(renderHtml({ image: DEFAULT_IMAGE, pageUrl, found: false }), 404);
  }

  let row = null;
  try {
    const res = await fetch(
      // revoked=is.false: 垢BAN (v423) で失効させたシェアは配信しない (= not-found 扱い)。
      `${SUPABASE_URL}/rest/v1/norireco_shares?id=eq.${encodeURIComponent(id)}&revoked=is.false&select=title,description,image_url,kind&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length) row = rows[0];
    }
  } catch (e) {
    // フェッチ失敗時は not-found 扱いで graceful に
    row = null;
  }

  if (!row) {
    return htmlResponse(renderHtml({ image: DEFAULT_IMAGE, pageUrl, found: false }), 404);
  }

  // view 計測: SNS unfurl クローラ等は除外し、人間の閲覧に近いものだけ +1 (ベストエフォート)。
  // waitUntil でレスポンスをブロックせずに RPC を投げる (失敗は _metrics 側で握りつぶし)。
  const ua = request.headers.get('user-agent') || '';
  if (!isLikelyBot(ua)) {
    context.waitUntil(bumpShareMetric(id, 'view'));
  }

  const html = renderHtml({
    id,
    kind: row.kind || 'trip',
    title: row.title || '乗レコの記録',
    description: row.description || '',
    image: safeImageUrl(row.image_url),
    pageUrl,
    found: true,
  });
  return htmlResponse(html, 200);
}

function htmlResponse(html, status) {
  return new Response(html, {
    status: status || 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // シェア内容はほぼ不変なので軽くキャッシュ。クローラの再取得も考慮し短め。
      'Cache-Control': 'public, max-age=600',
    },
  });
}
