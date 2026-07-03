// ══════════════════════════════════════════════
// build-www.js — Capacitor 用 web アセットを www/ に集める (v450 iOS Phase B)
//
// 乗レコはリポジトリルート直下が本番静的サイトそのもの (Cloudflare Pages が root 配信)。
// ネイティブアプリ (Capacitor) には「アプリに同梱すべきファイルだけ」を www/ にコピーする。
// www/ は .gitignore 済みのビルド成果物。実行: node scripts/build-www.js
//
// 同梱しないもの:
//   - sw.js         … WKWebView (capacitor:// スキーム) では Service Worker 不要・不安定。
//                     10-init.js 側で window.Capacitor 検出時は register しない
//   - splash/       … ネイティブは LaunchScreen.storyboard を使う (PWA 用スプラッシュは不要)
//   - worker/ docs 等 … アプリ実行に不要
// ══════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'www');

// JSON は将来のマスターデータ追加を取りこぼさないよう「root の *.json 全部 − 除外リスト」方式
const JSON_EXCLUDE = new Set([
  'package.json',
  'package-lock.json',
  'capacitor.config.json',
]);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let count = 0;
function copy(rel, destRel) {
  const src = path.join(ROOT, rel);
  const dest = path.join(OUT, destRel || rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  count++;
}

// HTML — Capacitor のエントリは index.html 固定なので同内容で 2 名義コピー
// (相対パス参照のみなのでリネームしても壊れない。noritetsu-map.html も残すのは保険)
copy('noritetsu-map.html', 'index.html');
copy('noritetsu-map.html');

// JS モジュール群・キャラ SVG
copy('js');
copy('characters');

// root の JSON マスター (除外リスト以外すべて)
for (const f of fs.readdirSync(ROOT)) {
  if (f.endsWith('.json') && !JSON_EXCLUDE.has(f)) copy(f);
}

// アイコン
copy('icon-192.png');
copy('icon-512.png');
copy('icon.svg');
copy('apple-touch-icon.png');

console.log(`build-www: ${count} 項目を www/ にコピーしました`);
