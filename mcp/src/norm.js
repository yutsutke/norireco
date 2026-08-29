// 駅名・系統名の正規化。
//
// **ビルド時 (scripts/build-index.mjs) と実行時 (src/lines.js) の両方から import する。**
// 索引の駅名はビルド時に正規化して焼き込んであり、検索語は実行時に正規化する。
// 両者が同じ関数でないと「索引には入っているのに引けない」という形で静かに壊れるので、
// ここ 1 か所に集約している。書き換えたら必ず `npm run build-index` をやり直すこと。

/** 駅名。本体 04b-ride-record.js の normStName (ケ→ヶ・空白除去) が土台。 */
export function normStation(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFKC')
    .replace(/ケ/g, 'ヶ')
    .replace(/[\s・]/g, '')
    .replace(/駅$/, '')
    .toLowerCase();
}

/** 系統名。「JR 中央線（快速）」→「jr中央線快速」 */
export function normLine(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFKC')
    .replace(/[\s・()（）「」]/g, '')
    .toLowerCase();
}
