import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [html, css, js, newsText] = await Promise.all([
  read('index.html'),
  read('assets/css/style.css'),
  read('assets/js/app.js'),
  read('data/news.json')
]);

const news = JSON.parse(newsText);

assert.equal(existsSync(new URL('../data/watchlist.json', import.meta.url)), false, 'data/watchlist.json should not exist');

assert.ok(html.includes('./assets/css/style.css'));
assert.ok(html.includes('./assets/js/app.js'));
assert.ok(html.includes('我的 AI 財經早報'));
assert.ok(html.includes('目前為測試資料'));
assert.ok(html.includes('早報摘要'));
assert.ok(!html.includes('watchlist'));
assert.ok(!html.includes('自選股'));
assert.ok(!html.includes('ticker-grid'));
assert.ok(!html.includes('watchlist-filter'));
assert.match(html, /id="last-updated"/);
assert.match(html, /id="search-input"/);
assert.match(html, /id="category-filter"/);
assert.match(html, /id="source-filter"/);
assert.match(html, /id="brief-container"/);
assert.match(html, /id="error-message"/);

assert.match(css, /@media\s*\(max-width:/);
assert.match(css, /\[data-theme="light"\]/);
assert.match(css, /\.brief-section/);
assert.match(css, /\.analysis-line/);
assert.match(css, /\.claim-label/);

assert.match(js, /fetch\(['"]\.\/data\/news\.json['"]\)/);
assert.doesNotMatch(js, /watchlist/i);
assert.doesNotMatch(js, /ticker/i);
assert.doesNotMatch(js, /symbols/);
assert.match(js, /資料載入失敗/);
assert.match(js, /Fact/);
assert.match(js, /Inference/);
assert.match(js, /Hypothesis/);
new vm.Script(js);

assert.ok(Array.isArray(news), 'news.json must be an array');
assert.ok(news.length >= 9, 'news.json must include at least 9 brief items');

const requiredFields = ['id', 'section', 'subject', 'title', 'category', 'source', 'publishedAt', 'fact', 'inference', 'hypothesis', 'tags', 'url'];
for (const item of news) {
  for (const field of requiredFields) {
    assert.ok(item[field] != null, `${item.id} missing ${field}`);
  }
  assert.ok(!('symbols' in item), `${item.id} must not include Taiwan stock symbols`);
  assert.ok(Array.isArray(item.tags), `${item.id} tags must be an array`);
  assert.ok(item.tags.length > 0, `${item.id} must include at least one tag`);
  assert.ok(/^https?:\/\//.test(item.url), `${item.id} url must be absolute`);
  assert.ok(!item.url.includes('example.com'), `${item.id} must not use placeholder example.com links`);
  assert.ok(!Number.isNaN(Date.parse(item.publishedAt)), `${item.id} publishedAt must be parseable`);
}

assert.deepEqual([...new Set(news.map((item) => item.section))], [
  'AI 與科技前沿',
  '全球財經脈動',
  '美股與全球市場焦點'
]);

assert.ok(news.some((item) => item.subject.includes('OpenAI') || item.subject.includes('Anthropic') || item.subject.includes('Google')), 'brief should include global AI labs or platforms');
assert.ok(news.some((item) => item.section === '全球財經脈動'), 'brief should include macro finance items');
assert.ok(news.some((item) => item.section === '美股與全球市場焦點'), 'brief should include market focus items');

console.log(`通過：${news.length} 則 AI 財經早報條目，HTML/CSS/JS/JSON 檢查完成。`);
