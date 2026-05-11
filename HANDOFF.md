# 乗レコ（NORITSUBU MAP）プロジェクト引き継ぎ

Cowork → Claude Code への引き継ぎドキュメント。最初の会話でこれを `@HANDOFF.md` で参照させるか、ファイル内容をそのまま渡してください。

---

## 1. プロジェクト概要

日本全国の鉄道路線・駅を扱う乗車記録 PWA（Progressive Web App）。
- 利用者が「乗車した区間」を入力 → 地図上に色付きで可視化
- 達成率（路線完乗率）を集計
- PWA としてインストール可能・オフライン動作

**デプロイ先**: https://yutsutke.github.io/norireco/  
**GitHub リポジトリ**: `yutsutke/norireco`（パブリック・GitHub Pages 配信）

## 2. 技術スタック

- フロントエンドのみの単一 HTML アプリ（バックエンドなし、ただし Supabase オプションで同期）
- Leaflet.js 1.9.4 + 国土地理院タイル
- Service Worker（`sw.js`）でキャッシュ＋オフライン
- データソース: N02-25（国土数値情報 鉄道時系列データ）
- ホスティング: GitHub Pages（main ブランチ直配信）
- 同期: Supabase（任意、`norireco_trips` / `norireco_memos` テーブル）

## 3. ファイル構成（リポジトリルート直下）

| ファイル | サイズ | 役割 |
|---|---|---|
| `noritetsu-map.html` | 約 90 KB / 約 1800 行 | **メインの地図画面**（CSS + HTML + JS 全部入り）|
| `noritetsu-log.html` | 約 76 KB | 乗車ログ入力画面 |
| `sw.js` | 約 5.7 KB | Service Worker（CACHE_VERSION 管理）|
| `lines-p1.json` 〜 `lines-p4.json` | 計約 2 MB | 物理路線データ（606 路線・10154 駅、N02-25 由来）|
| `running_services.json` | 約 300 KB | 運行系統定義（885 系統、京浜東北線・湘南新宿ラインなど）|
| `merged_stations.json` | 約 1.1 MB | 同名近接駅統合マスター（8924 駅、パイチャート用）|
| `manifest.json` | PWA manifest |
| `icon-192.png` / `icon-512.png` / `icon.svg` | アイコン |

## 4. データアーキテクチャ

```
N02-25（地理院データ）
  ↓ 加工
lines-p1〜p4.json（物理路線・駅 with branch/o）
running_services.json（運行系統 = 物理路線の組み合わせ）
merged_stations.json（同名近接駅の統合）
  ↓ 読み込み
noritetsu-map.html（全部メモリに展開して描画）
```

- **物理路線**: N02-25 の生データ。例: `「東海道本線_東海旅客鉄道」`
- **運行系統**: 利用者の感覚に近い単位。例: `「JR京浜東北線」`は複数の物理路線をまたぐ
- **branch + o**: 駅順を正確に表現するための支線番号（branch）と駅順番号（o）。polyline 順が壊れる問題を回避するために導入

## 5. デプロイ方法（現状）

リポジトリの `main` ブランチに push すると GitHub Pages が自動配信。
- 現状はユーザーが GitHub Web UI から「Add files via upload」で手動アップロード
- Claude Code 移行後は `git add` / `commit` / `push` で直接できる
- **重要**: `sw.js` の `CACHE_VERSION` を毎回上げないと、ブラウザが古いキャッシュを使う。現在 `v33`

## 6. 描画ロジックの重要ポイント

### 駅マーカー（ドット）と駅名（ラベル）の階層表示

`stationTier(nLines, name)` で各駅に重要度を割り当て（tier 1〜6）:
- tier 6: 東京・名古屋・新大阪・札幌・仙台・博多・広島（最重要）
- tier 5: 7 路線以上（新宿・渋谷・池袋等の超ターミナル）
- tier 4: 4-6 路線
- tier 3: 3 路線
- tier 2: 2 路線
- tier 1: 1 路線

ズームレベル × tier で表示判定。`getDotMinTier(z, isMetro)` / `getLabelMinTier(z, isMetro)`。

### 端末判定

- `IS_MOBILE`: iPhone / Android スマホのみ（iPad は除外、PC 扱い）
- `IS_TOUCH`: タッチデバイス全般（iPad 含む）→ ズームボタン非表示等に使う

### 現在の閾値（ユーザー確定済み）

| 端末 | エリア | ドット (全駅) | ラベル (全駅名) |
|---|---|---|---|
| PC/iPad | 首都圏 | z≥12 | z≥13（ドット+1ズーム後）|
| PC/iPad | 地方 | z≥10 | z≥11（ドット+1ズーム後）|
| スマホ | 首都圏 | z≥15（密集対策で遅め）| z≥16 |
| スマホ | 地方 | z≥9（疎なので早く）| z≥11（ドット+2ズーム後）|

ロジックは `getLabelMinTier(z, isMetro) = getDotMinTier(z + offset, isMetro)` で実装。

### isMetro 判定（三大都市圏のbbox）

```js
function isMetroArea(lat, lon) {
  // 首都圏（山手線+周辺）約20×22km
  if (lat >= 35.60 && lat <= 35.78 && lon >= 139.60 && lon <= 139.85) return true;
  // 大阪都心（大阪・京都・神戸の中心部）約20×20km
  if (lat >= 34.65 && lat <= 34.78 && lon >= 135.40 && lon <= 135.60) return true;
  // 名古屋都心（名古屋駅周辺）約15×15km
  if (lat >= 35.13 && lat <= 35.22 && lon >= 136.85 && lon <= 136.97) return true;
  return false;
}
```

### パフォーマンス最適化（重要）

ラベル DOM が大量にあるとズーム/パンが重くなる問題への対策:

1. **`window._allLabels` マスターリスト方式**: 全ラベルを `_allLabels` に保持。`labelLayer` には**実際に表示すべきラベルだけ** addLayer する。表示外は removeLayer で DOM から完全に外す。
2. **ビューポート限定描画**: `updateLOD` の中で `map.getBounds().pad(0.15)` を使い、画面内のラベルのみ DOM に追加。画面外は完全に除外。
3. **ズーム/パン中の DOM 一掃**: `movestart`/`zoomstart` で `labelLayer` を map から完全 remove、`moveend`/`zoomend` で `updateLOD()` 呼んで必要なものだけ復元。

これらは三段重ねで効いている。今これを壊すと一気に重くなる。

### 統合駅マーカー（パイチャート）

`merged_stations.json` で同名近接駅を統合。複数路線が乗り入れる駅は **SVG divIcon でパイチャート表示**（路線色が円グラフ状）。`makePieIcon(colors, sizePx, ridden)` で生成。

注意: 過去にスマホで circleMarker にして「軽くなったけどパイチャートじゃない」とユーザー却下。PC もスマホもパイチャートが必須。軽量化は他の手段で行う。

### UI 表示

| | PC | iPad | スマホ |
|---|---|---|---|
| 統計ボックス（右上 達成率） | 表示 | 表示 | **非表示**（CSS media query） |
| 凡例ボックス（左上、`top:90px`）| スクロール可 | スクロール可 | **非表示** |
| Leaflet ズームボタン | **左上**（topleft）| 非表示 | 非表示 |
| カメラ/メモボタン | 右下 | 右下 | 右下 |

凡例は `top:90px / z-index:500`、ズームボタンは `z-index:1100` で確実に最前面。

## 7. 過去に踏んだ落とし穴

### Edit ツールで noritetsu-map.html の末尾が切れる

このセッション中に**3〜4 回**発生。`</script>`, `</body>`, `</html>` が消えて `window.addEventListener('load', ...)` も消失するため、`initMap()` が呼ばれずに地図が真っ白になる。

**Cowork での回避策**: Python スクリプトで `str.replace` してファイル丸ごと書き直し。Edit ツールは使わない。

**Claude Code での予想**: Edit ツールの実装が改善されているので、より起きにくい可能性。ただし**毎回末尾 (`</script></body></html>`) が残っているか必ず grep で確認**してから push してください。

```bash
grep -c '</script>' noritetsu-map.html  # 2 であること
grep -c '</body>'   noritetsu-map.html  # 1 であること
grep -c '</html>'   noritetsu-map.html  # 1 であること
```

復元用のクリーンなバックアップは `noritetsu-map-base.html`（Cowork outputs 内）に保存していたが、Claude Code 環境にはない。**最初に main の最新版を保管しておくこと**を推奨。

### Service Worker のキャッシュ

- `sw.js` の `CACHE_VERSION` を上げないと古い HTML が出続ける
- 直近で `response.clone()` が非同期コールバック内にあるとボディ消費済みで失敗するバグを v33 で修正済み
- 修正後の clone は同期的に行うパターン（`networkFirst` / `cacheFirstSWR` の両方）

### isMetro 領域の bbox

ユーザーは「首都圏範囲は今の 1/3 ぐらいでいい」「都心の超密集エリアのみ」が好み。広げると逆効果。

## 8. ユーザーの好み・進め方

- **日本語**でやり取り。簡潔・直接的なフィードバックを好む。
- 「いまの状態 → こうしたい」を 1〜3 行で言うことが多い。スクリーンショットで状況を共有。
- **小刻みなイテレーション**を好む。1 回の変更を多く詰め込みすぎると後から「これは元に戻したい」となる。
- 過去の遺産（不要 UI、エイリアス）は遠慮なく削除する方針。
- **モバイル UX への配慮**を強く意識（iPhone 14 でのズーム/パン重さが直近の課題だった）

## 9. 直近の状況（このセッション終了時点）

### 直前のデプロイ
- `noritetsu-map.html` のサイズ: 約 90 KB / 1800 行強
- `sw.js` の CACHE_VERSION: `v33`
- 最新の閾値ロジックは「ドット先・ラベル後」で統一済み（このドキュメント §6 の表）

### 残課題（ユーザーから明示はないが想定される）
- `noritetsu-log.html`（乗車ログ画面）の UX 改善はまだ手付かず
- 復元モーダルは残っている（地図画面の「新端末？Notion」ボタンだけ削除）
- スマホでの拡大縮小（ピンチ）の挙動確認
- Supabase 同期周りのエラーハンドリング
- 路線一覧タブ・統計タブの UI が未確認

### 引き続き想定される作業
- ユーザー追加要望ベースの UI 微調整
- 駅名表示の閾値の最終調整（ユーザーが乗りこなしてみて重い/軽いを判断）
- 新規路線（私鉄）の追加キュレート
- ログ画面のフォーム改善

## 10. ローカル開発の始め方

```bash
# リポジトリを取得
git clone https://github.com/yutsutke/norireco.git
cd norireco

# ローカルプレビュー（Service Worker 動作も含めて）
python3 -m http.server 8000
# → http://localhost:8000/noritetsu-map.html
```

ハードリロード（Cmd/Ctrl+Shift+R）で SW キャッシュをバイパスして最新コードを確認できる。

## 11. Claude Code で最初に伝えると良いこと

```
このリポジトリ（yutsutke/norireco）は、日本全国の鉄道路線・駅を扱う乗車記録 PWA「乗レコ」です。
HANDOFF.md に全体の文脈・直近の実装・落とし穴をまとめてあります。まずこれを読んでください。

直近の作業履歴は git log で見られます（Cowork から手動アップロードしてきたので
コミットメッセージは "Add files via upload" ばかりですが、ファイルの中身は最新です）。

今後は git push で直接デプロイしたいです。
```

これを最初の会話の冒頭で渡せば、Claude Code 側で `HANDOFF.md` を `Read` で読んで完全に文脈復元できます。
