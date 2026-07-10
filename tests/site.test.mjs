import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [html, css, js, newsText] = await Promise.all([
  read('index.html'),
  read('assets/css/style.css'),
  read('assets/js/app.js'),
  read('data/news.json')
]);

const news = JSON.parse(newsText);

assert.equal(existsSync(new URL('../data/watchlist.json', import.meta.url)), false, 'data/watchlist.json should be removed while focusing on global AI finance news only');

assert.ok(html.includes('./assets/css/style.css'));
assert.ok(html.includes('./assets/js/app.js'));
assert.ok(html.includes('全球 AI 財經新聞'));
assert.ok(html.includes('目前為測試資料'));
assert.ok(html.includes('最新新聞'));
assert.ok(!html.includes('watchlist'));
assert.ok(!html.includes('自選股'));
assert.ok(!html.includes('ticker-grid'));
assert.ok(!html.includes('watchlist-filter'));
assert.match(html, /id="last-updated"/);
assert.match(html, /id="search-input"/);
assert.match(html, /id="category-filter"/);
assert.match(html, /id="source-filter"/);
assert.match(html, /id="news-grid"/);
assert.match(html, /id="error-message"/);

assert.match(css, /@media\s*\(max-width:/);
assert.match(css, /\[data-theme="light"\]/);
assert.match(css, /\.news-tags/);
assert.match(css, /\.card a/);

assert.match(js, /fetch\(['"]\.\/data\/news\.json['"]\)/);
assert.doesNotMatch(js, /watchlist/i);
assert.doesNotMatch(js, /ticker/i);
assert.doesNotMatch(js, /symbols/);
assert.match(js, /資料載入失敗/);
assert.match(js, /顯示 \$\{filtered\.length\} \/ \$\{state\.news\.length\} 筆新聞/);
assert.match(js, /閱讀原文/);
new vm.Script(js);

assert.ok(Array.isArray(news), 'news.json must be an array');
assert.ok(news.length >= 15, 'news.json must include at least 15 items');

const requiredNewsFields = ['id', 'title', 'summary', 'category', 'source', 'publishedAt', 'tags', 'url'];
for (const item of news) {
  for (const field of requiredNewsFields) {
    assert.ok(item[field] != null, `${item.id} missing ${field}`);
  }
  assert.ok(!('symbols' in item), `${item.id} must not include Taiwan stock symbols`);
  assert.ok(Array.isArray(item.tags), `${item.id} tags must be an array`);
  assert.ok(item.tags.length > 0, `${item.id} must include at least one tag`);
  assert.ok(/^https?:\/\//.test(item.url), `${item.id} url must be absolute`);
  assert.ok(!item.url.includes('example.com'), `${item.id} must not use placeholder example.com links`);
  assert.ok(!Number.isNaN(Date.parse(item.publishedAt)), `${item.id} publishedAt must be parseable`);
}

const sourceDomains = new Set(news.map((item) => new URL(item.url).hostname.replace(/^www\./, '')));
for (const expectedDomain of ['openai.com', 'anthropic.com', 'blog.google', 'cloud.google.com', 'ai.meta.com']) {
  assert.ok(sourceDomains.has(expectedDomain), `missing readable source domain: ${expectedDomain}`);
}

const categories = new Set(news.map((item) => item.category));
for (const expectedCategory of ['前沿模型', 'AI 晶片', '雲端基礎設施', 'AI 監管', '企業 AI', '開源 AI', 'AI 安全']) {
  assert.ok(categories.has(expectedCategory), `missing global AI finance category: ${expectedCategory}`);
}

assert.ok(news.some((item) => item.title.includes('OpenAI') || item.title.includes('Anthropic') || item.title.includes('Google')), 'news should include global AI labs or platforms');

console.log(`通過：${news.length} 筆全球 AI 財經測試新聞，HTML/CSS/JS/JSON 檢查完成。`);
