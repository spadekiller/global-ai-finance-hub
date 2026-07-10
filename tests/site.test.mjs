import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [html, css, js, newsText, watchlistText] = await Promise.all([
  read('index.html'),
  read('assets/css/style.css'),
  read('assets/js/app.js'),
  read('data/news.json'),
  read('data/watchlist.json')
]);

const news = JSON.parse(newsText);
const watchlist = JSON.parse(watchlistText);

assert.ok(html.includes('./assets/css/style.css'));
assert.ok(html.includes('./assets/js/app.js'));
assert.ok(html.includes('全球 AI 新聞儀表板'));
assert.ok(html.includes('目前為測試資料'));
assert.ok(html.includes('最新新聞'));
assert.ok(html.indexOf('id="ticker-grid"') < html.indexOf('id="news-grid"'));
assert.match(html, /id="last-updated"/);
assert.match(html, /id="search-input"/);
assert.match(html, /id="category-filter"/);
assert.match(html, /id="source-filter"/);
assert.match(html, /id="watchlist-filter"/);
assert.match(html, /id="news-grid"/);
assert.match(html, /id="error-message"/);

assert.match(css, /@media\s*\(max-width:/);
assert.match(css, /\[data-theme="light"\]/);
assert.match(css, /\.news-tags/);
assert.match(css, /\.card a/);

assert.match(js, /fetch\(['"]\.\/data\/news\.json['"]\)/);
assert.match(js, /fetch\(['"]\.\/data\/watchlist\.json['"]\)/);
assert.match(js, /資料載入失敗/);
assert.match(js, /顯示 \$\{filtered\.length\} \/ \$\{state\.news\.length\} 筆新聞/);
assert.match(js, /閱讀原文/);
new vm.Script(js);

assert.ok(Array.isArray(news), 'news.json must be an array');
assert.ok(news.length >= 15, 'news.json must include at least 15 items');

const requiredNewsFields = ['id', 'title', 'summary', 'category', 'source', 'publishedAt', 'symbols', 'tags', 'url'];
for (const item of news) {
  for (const field of requiredNewsFields) {
    assert.ok(item[field] != null, `${item.id} missing ${field}`);
  }
  assert.ok(Array.isArray(item.symbols), `${item.id} symbols must be an array`);
  assert.ok(Array.isArray(item.tags), `${item.id} tags must be an array`);
  assert.ok(item.tags.length > 0, `${item.id} must include at least one tag`);
  assert.ok(/^https?:\/\//.test(item.url), `${item.id} url must be absolute`);
  assert.ok(!Number.isNaN(Date.parse(item.publishedAt)), `${item.id} publishedAt must be parseable`);
}

const categories = new Set(news.map((item) => item.category));
for (const expectedCategory of ['前沿模型', 'AI 晶片', '雲端基礎設施', 'AI 監管', '企業 AI', '開源 AI', 'AI 安全']) {
  assert.ok(categories.has(expectedCategory), `missing global AI category: ${expectedCategory}`);
}

const globalSources = new Set(['Global AI Brief', 'Model Watch', 'AI Policy Monitor', 'Enterprise AI Weekly', 'Frontier Compute']);
assert.ok(news.filter((item) => globalSources.has(item.source)).length >= 10, 'most news should use global AI sources');
assert.ok(news.filter((item) => item.symbols.length === 0).length >= 8, 'global AI news should not all be tied to Taiwan watchlist symbols');
assert.ok(news.some((item) => item.title.includes('OpenAI') || item.title.includes('Anthropic') || item.title.includes('Google')), 'news should include global AI labs or platforms');

assert.deepEqual(watchlist.map(({ symbol, name }) => ({ symbol, name })), [
  { symbol: '2330', name: '台積電' },
  { symbol: '2382', name: '廣達' },
  { symbol: '3017', name: '奇鋐' },
  { symbol: '3693', name: '營邦' },
  { symbol: '6683', name: '雍智科技' }
]);

console.log(`通過：${news.length} 筆全球 AI 測試新聞、${watchlist.length} 檔自選股，HTML/CSS/JS/JSON 檢查完成。`);
