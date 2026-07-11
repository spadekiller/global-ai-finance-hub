import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [html, css, js, newsText, fetcherText, workflowText] = await Promise.all([
  read('index.html'),
  read('assets/css/style.css'),
  read('assets/js/app.js'),
  read('data/news.json'),
  read('scripts/fetch-news.mjs'),
  read('.github/workflows/update-news.yml')
]);

const payload = JSON.parse(newsText);
const news = payload.items;

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
assert.match(js, /payload\.items/);
assert.doesNotMatch(js, /watchlist/i);
assert.doesNotMatch(js, /ticker/i);
assert.doesNotMatch(js, /symbols/);
assert.match(js, /資料載入失敗/);
assert.match(js, /Fact/);
assert.match(js, /Inference/);
assert.match(js, /Hypothesis/);
assert.match(js, /translatedTitle/);
assert.match(js, /originalTitle/);
assert.match(js, /translationNote/);
assert.match(js, /translate\.google\.com\/translate/);
assert.match(js, /翻譯原文/);
new vm.Script(js);

assert.equal(payload.source, 'Google News RSS');
assert.ok(payload.generatedAt, 'news payload must include generatedAt');
assert.ok(!Number.isNaN(Date.parse(payload.generatedAt)), 'generatedAt must be parseable');
assert.ok(Array.isArray(news), 'payload.items must be an array');
assert.ok(news.length >= 9, 'news payload must include at least 9 brief items');

const requiredFields = ['id', 'section', 'subject', 'title', 'originalTitle', 'translatedTitle', 'translationNote', 'category', 'source', 'publishedAt', 'fact', 'inference', 'hypothesis', 'tags', 'url'];
for (const item of news) {
  for (const field of requiredFields) {
    assert.ok(item[field] != null, `${item.id} missing ${field}`);
  }
  assert.ok(!('symbols' in item), `${item.id} must not include Taiwan stock symbols`);
  assert.ok(Array.isArray(item.tags), `${item.id} tags must be an array`);
  assert.ok(item.tags.length > 0, `${item.id} must include at least one tag`);
  assert.ok(/^https?:\/\//.test(item.url), `${item.id} url must be absolute`);
  assert.ok(!item.url.includes('example.com'), `${item.id} must not use placeholder example.com links`);
  assert.ok(!item.url.includes('news.google.com/rss/articles'), `${item.id} should use the publisher URL, not the Google News wrapper URL`);
  assert.ok(!Number.isNaN(Date.parse(item.publishedAt)), `${item.id} publishedAt must be parseable`);
  assert.equal(item.title, item.translatedTitle, `${item.id} should display translatedTitle as title`);
  assert.ok(item.translationNote.includes('原文'), `${item.id} translationNote should mention original text`);
  if (/^[\x00-\x7F\s\-–—:;,.!?'"()&%0-9]+$/.test(item.originalTitle)) {
    assert.match(item.translatedTitle, /[\u4e00-\u9fff]/, `${item.id} English original title should have Traditional Chinese translation`);
  }
}

assert.deepEqual([...new Set(news.map((item) => item.section))], [
  'AI 與科技前沿',
  '全球財經脈動',
  '美股與全球市場焦點'
]);

assert.match(fetcherText, /news\.google\.com\/rss\/search/);
assert.match(fetcherText, /fact:/);
assert.match(fetcherText, /inference:/);
assert.match(fetcherText, /hypothesis:/);
assert.match(fetcherText, /translateTitleToZhHant/);
assert.match(fetcherText, /resolveGoogleNewsUrl/);
assert.match(fetcherText, /data-n-a-sg/);
assert.match(fetcherText, /originalTitle/);
assert.match(fetcherText, /translatedTitle/);
assert.match(workflowText, /cron:/);
assert.match(workflowText, /node scripts\/fetch-news\.mjs/);

console.log(`通過：${news.length} 則 AI 財經早報條目，HTML/CSS/JS/JSON/RSS 抓取器檢查完成。`);
