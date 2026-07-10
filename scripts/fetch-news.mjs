import { writeFile } from 'node:fs/promises';

const FEEDS = [
  {
    section: 'AI 與科技前沿',
    query: 'OpenAI OR Anthropic OR Gemini OR Meta AI OR artificial intelligence model',
    category: 'AI 與科技前沿'
  },
  {
    section: '全球財經脈動',
    query: 'AI investment OR artificial intelligence economy OR data center energy OR semiconductor economy',
    category: '全球財經'
  },
  {
    section: '美股與全球市場焦點',
    query: 'AI stocks OR Nvidia OR Microsoft AI OR Google AI earnings OR semiconductor stocks',
    category: '市場焦點'
  }
];

const SECTION_LIMIT = 5;
const OUTPUT_PATH = new URL('../data/news.json', import.meta.url);

const payload = {
  generatedAt: new Date().toISOString(),
  source: 'Google News RSS',
  items: []
};

for (const feed of FEEDS) {
  const rss = await fetchRss(feed.query);
  const parsed = parseItems(rss)
    .filter((item) => item.title && item.url)
    .slice(0, SECTION_LIMIT)
    .map((item, index) => toBriefItem(feed, item, index));

  payload.items.push(...parsed);
}

payload.items = dedupeByUrl(payload.items).slice(0, 15);

if (payload.items.length < 9) {
  throw new Error(`Only fetched ${payload.items.length} news items; expected at least 9.`);
}

await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Generated ${payload.items.length} Google News RSS brief items at ${payload.generatedAt}`);

async function fetchRss(query) {
  const url = new URL('https://news.google.com/rss/search');
  url.searchParams.set('q', `${query} when:2d`);
  url.searchParams.set('hl', 'zh-TW');
  url.searchParams.set('gl', 'TW');
  url.searchParams.set('ceid', 'TW:zh-Hant');

  const response = await fetch(url, {
    headers: {
      'user-agent': 'global-ai-finance-hub/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Google News RSS failed: HTTP ${response.status}`);
  }

  return response.text();
}

function parseItems(xml) {
  const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

  return itemMatches.map((match) => {
    const itemXml = match[1];
    const title = decodeXml(readTag(itemXml, 'title'));
    const url = decodeXml(readTag(itemXml, 'link'));
    const publishedAt = new Date(readTag(itemXml, 'pubDate')).toISOString();
    const source = decodeXml(readSource(itemXml)) || hostName(url);
    const description = stripHtml(decodeXml(readTag(itemXml, 'description')));

    return {
      title: cleanGoogleTitle(title),
      url,
      publishedAt,
      source,
      description
    };
  });
}

function toBriefItem(feed, item, index) {
  const subject = inferSubject(item.title);
  const tags = inferTags(feed, item.title);

  return {
    id: `${slug(feed.section)}-${index + 1}`,
    section: feed.section,
    subject,
    title: item.title,
    category: inferCategory(feed, item.title),
    source: item.source,
    publishedAt: item.publishedAt,
    fact: `${item.source} 報導：${item.title}`,
    inference: buildInference(feed.section, item.title, item.description),
    hypothesis: buildHypothesis(feed.section, item.title),
    tags,
    url: item.url
  };
}

function readTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1]?.trim() || '';
}

function readSource(xml) {
  const match = xml.match(/<source[^>]*>([\s\S]*?)<\/source>/);
  return match?.[1]?.trim() || '';
}

function decodeXml(value) {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(value) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanGoogleTitle(title) {
  return title.replace(/\s+-\s+[^-]+$/u, '').trim();
}

function hostName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Google News';
  }
}

function inferSubject(title) {
  const candidates = ['OpenAI', 'Anthropic', 'Google', 'Apple', 'Meta', 'Microsoft', 'Nvidia', 'NVIDIA', 'Amazon', 'Tesla', 'TSMC', 'IMF', 'Fed'];
  return candidates.find((name) => title.toLowerCase().includes(name.toLowerCase())) || title.split(/[：:,-]/u)[0].slice(0, 28);
}

function inferCategory(feed, title) {
  const lower = title.toLowerCase();

  if (lower.includes('stock') || lower.includes('shares') || lower.includes('earnings')) return '市場焦點';
  if (lower.includes('chip') || lower.includes('nvidia') || lower.includes('semiconductor')) return 'AI 晶片';
  if (lower.includes('regulation') || lower.includes('law') || lower.includes('policy')) return 'AI 監管';
  if (lower.includes('data center') || lower.includes('cloud')) return '雲端基礎設施';
  if (lower.includes('model') || lower.includes('openai') || lower.includes('anthropic') || lower.includes('gemini')) return '前沿模型';

  return feed.category;
}

function inferTags(feed, title) {
  const tags = new Set([feed.category]);
  const dictionary = ['OpenAI', 'Anthropic', 'Google', 'Apple', 'Meta', 'Microsoft', 'Nvidia', 'AI', 'data center', 'semiconductor', 'earnings', 'stocks', 'cloud'];

  for (const tag of dictionary) {
    if (title.toLowerCase().includes(tag.toLowerCase())) {
      tags.add(tag);
    }
  }

  return [...tags].slice(0, 5);
}

function buildInference(section, title, description) {
  const context = description || title;

  if (section === 'AI 與科技前沿') {
    return `這則消息顯示 AI 技術競爭仍集中在模型能力、產品整合與企業導入速度；${trimSentence(context)}。`;
  }

  if (section === '全球財經脈動') {
    return `這則消息反映 AI 已成為總體經濟、能源、半導體與資本支出的共同變數；${trimSentence(context)}。`;
  }

  return `這則消息代表市場資金仍把 AI 收入、算力供給與科技股獲利視為評價核心；${trimSentence(context)}。`;
}

function buildHypothesis(section, title) {
  const lower = title.toLowerCase();

  if (section === 'AI 與科技前沿') {
    return lower.includes('open') || lower.includes('model')
      ? '若新模型或新平台能轉化為清楚的企業使用案例，AI 軟體與雲端服務的付費滲透率可能繼續提高。'
      : '若產品體驗能明顯降低使用門檻，AI 應用將更快從試點走向日常工作流程。';
  }

  if (section === '全球財經脈動') {
    return '若 AI 投資循環維持強度，半導體、資料中心與能源基礎設施可能持續支撐全球成長預期。';
  }

  return '若企業財報能證明 AI 支出正在轉化為收入與利潤，科技股估值仍有機會維持溢價。';
}

function trimSentence(value) {
  return value.replace(/\s+/g, ' ').slice(0, 120).trim();
}

function dedupeByUrl(items) {
  const seen = new Set();

  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '');
}
