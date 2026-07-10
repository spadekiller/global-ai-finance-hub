import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [html, css, js, newsText, watchlistText] = await Promise.all([
  read('index.html'), read('assets/css/style.css'), read('assets/js/app.js'),
  read('data/news.json'), read('data/watchlist.json')
]);

const news = JSON.parse(newsText);
const watchlist = JSON.parse(watchlistText);

assert.ok(html.includes('assets/css/style.css'));
assert.ok(html.includes('assets/js/app.js'));
assert.ok(html.includes('目前顯示測試資料'));
assert.match(html, /id="last-updated"/);
assert.match(html, /id="search-input"/);
assert.match(html, /id="category-filter"/);
assert.match(html, /id="source-filter"/);
assert.match(html, /id="watchlist-filter"/);
assert.match(css, /@media\s*\(max-width:/);
assert.match(css, /\[data-theme="light"\]/);
assert.match(js, /fetch\(['"]\.\/data\/news\.json['"]\)/);
assert.match(js, /fetch\(['"]\.\/data\/watchlist\.json['"]\)/);
assert.match(js, /載入資料失敗/);
new vm.Script(js);

assert.ok(Array.isArray(news) && news.length >= 15);
assert.ok(news.every((item) => item.id && item.title && item.category && item.source && item.publishedAt));
assert.deepEqual(watchlist.map(({ symbol, name }) => ({ symbol, name })), [
  { symbol: '2330', name: '台積電' },
  { symbol: '2382', name: '廣達' },
  { symbol: '3017', name: '奇鋐' },
  { symbol: '3693', name: '營邦' },
  { symbol: '6683', name: '雍智科技' }
]);

console.log(`通過：${news.length} 筆新聞、${watchlist.length} 檔自選股，HTML/CSS/JS/JSON 基本檢查完成。`);
