// ═══════════════════════════════════════════════════════════════════════
// build-pages.js — Cloudflare Pages に配信するファイルだけを dist/ に集める (v454)
//
// 【なぜ必要か】
// もともと乗レコはリポジトリのルートをそのまま Cloudflare Pages が配信していた。
// つまり「git に入っているものは全部インターネットに公開されている」状態で、
// 開発用のファイルまで誰でも読めた (実測で全て HTTP 200):
//   /CHANGELOG.md /CLAUDE.md /TODO.md /STATUS.md   … 開発履歴・設計判断・運用規約
//   /package.json /capacitor.config.json           … 依存関係・アプリ ID
//   /scripts/build-www.js                          … ビルド手順
//   /ios/App/App/Info.plist                        … ネイティブアプリ設定
//   /.github/workflows/ios-testflight.yml          … CI 設定
//   /worker/src/index.js                           … Worker のソース
//   /supabase/migrations/*.sql                     … DB スキーマ・RLS ポリシー
//
// このスクリプトは逆に「配信して良いものだけ」を明示的に列挙してコピーする
// (許可リスト方式)。ここに書き忘れたファイルは配信されない = 事故は「消える」側に倒れる。
// 新しく配信したいファイルを足したときは、必ずここにも追記すること。
//
// 【使い方】
//   ローカル: node scripts/build-pages.js  → dist/ ができる
//   本番:     Cloudflare Pages の設定
//               ビルドコマンド       = node scripts/build-pages.js
//               ビルド出力ディレクトリ = dist
//
// 【functions/ について】
// Cloudflare Pages の仕様で、Functions (/share/<id> 等) は「プロジェクトのルートの
// functions/」から読まれる。ビルド出力ディレクトリの中ではない。
// → functions/ はリポジトリのルートに置いたままでよく、dist/ にコピーしてはいけない。
//   https://developers.cloudflare.com/pages/functions/get-started/
//
// 【scripts/build-www.js との違い】
//   build-www.js  … ネイティブアプリ (Capacitor/iOS) に同梱する分を www/ へ。sw.js と
//                   splash/ は入れない (WKWebView では Service Worker 不要・不安定)
//   build-pages.js… Web に配信する分を dist/ へ。sw.js と splash/ が要る (PWA だから)
// ═══════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist');

// JSON は将来のマスターデータ追加を取りこぼさないよう「ルートの *.json 全部 − 除外リスト」方式。
// (build-www.js と同じ考え方。除外するのは配信不要な開発用ファイルのみ)
const JSON_EXCLUDE = new Set([
  'package.json',
  'package-lock.json',
  'capacitor.config.json',
]);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const copied = [];
function copy(rel, optional) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) {
    if (optional) return;
    throw new Error(`build-pages: 必須ファイルが見つかりません: ${rel}`);
  }
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  copied.push(rel);
}

// ── HTML: 本体の地図画面 ──
copy('noritetsu-map.html');

// 開発史の可視化ページ (2026-06-19〜21 の振り返り artifact、PWA 非資産だが公開 URL は維持)
copy('journey.html', true);
copy('journey3d.html', true);
copy('journey-walk.html', true);

// ── JS モジュール群・キャラ SVG ──
copy('js');
copy('characters');

// ── Service Worker (PWA の本体。ネイティブ版には入れないが Web には必須) ──
copy('sw.js');

// ── ルートの JSON マスター (除外リスト以外すべて。manifest.json もここで入る) ──
for (const f of fs.readdirSync(ROOT)) {
  if (f.endsWith('.json') && !JSON_EXCLUDE.has(f)) copy(f);
}

// ── アイコン・iOS 起動スプラッシュ ──
copy('icon-192.png');
copy('icon-512.png');
copy('icon.svg');
copy('apple-touch-icon.png');
copy('splash');

// ── Pages の設定ファイル (出力ディレクトリ側に置く必要がある) ──
copy('_headers');
copy('_redirects');

console.log(`build-pages: ${copied.length} 項目を dist/ にコピーしました`);
console.log(copied.map((r) => `  - ${r}`).join('\n'));
