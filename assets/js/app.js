(() => {
  'use strict';
  const state = { news: [], watchlist: [] };
  const el = {};
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    Object.assign(el, {
      theme: document.querySelector('#theme-toggle'), themeLabel: document.querySelector('#theme-label'),
      search: document.querySelector('#search-input'), category: document.querySelector('#category-filter'),
      source: document.querySelector('#source-filter'), watchlist: document.querySelector('#watchlist-filter'),
      reset: document.querySelector('#reset-filters'), tickers: document.querySelector('#ticker-grid'),
      news: document.querySelector('#news-grid'), count: document.querySelector('#result-count'),
      updated: document.querySelector('#last-updated'), error: document.querySelector('#error-message'),
      empty: document.querySelector('#empty-state'), year: document.querySelector('#current-year')
    });
    el.year.textContent = new Date().getFullYear();
    bind();
    setTheme(localStorage.getItem('finance-hub-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
    try {
      const responses = await Promise.all([fetch('./data/news.json'), fetch('./data/watchlist.json')]);
      if (!responses.every((response) => response.ok)) throw new Error('資料檔案回應異常');
      state.news = await responses[0].json();
      state.watchlist = await responses[1].json();
      populate();
      renderTickers();
      renderNews();
      const time = Math.max(...state.news.map((item) => Date.parse(item.publishedAt)));
      el.updated.dateTime = new Date(time).toISOString();
      el.updated.textContent = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(time);
    } catch (error) {
      console.error(error);
      el.error.hidden = false;
      el.error.textContent = '載入資料失敗，請確認已透過本地伺服器開啟，或稍後再試。';
      el.count.textContent = '資料無法載入';
      el.updated.textContent = '載入失敗';
    } finally {
      el.news.setAttribute('aria-busy', 'false');
    }
  }

  function bind() {
    el.theme.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      setTheme(next);
      localStorage.setItem('finance-hub-theme', next);
    });
    el.search.addEventListener('input', renderNews);
    [el.category, el.source, el.watchlist].forEach((item) => item.addEventListener('change', renderNews));
    el.reset.addEventListener('click', () => {
      el.search.value = ''; el.category.value = ''; el.source.value = ''; el.watchlist.value = '';
      renderNews(); el.search.focus();
    });
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    el.themeLabel.textContent = theme === 'light' ? '深色模式' : '淺色模式';
  }

  function populate() {
    addOptions(el.category, [...new Set(state.news.map((item) => item.category))].sort());
    addOptions(el.source, [...new Set(state.news.map((item) => item.source))].sort());
    state.watchlist.forEach((item) => el.watchlist.add(new Option(item.symbol + ' ' + item.name, item.symbol)));
  }

  function addOptions(select, options) {
    options.forEach((value) => select.add(new Option(value, value)));
  }

  function renderTickers() {
    el.tickers.innerHTML = state.watchlist.map((item) =>
      '<article class="ticker"><code>' + safe(item.symbol) + '</code><strong>' + safe(item.name) +
      '</strong><small>' + safe(item.sector) + '</small></article>').join('');
  }

  function renderNews() {
    const query = el.search.value.trim().toLocaleLowerCase('zh-Hant');
    const filtered = state.news.filter((item) => {
      const text = [item.title, item.summary, item.source].concat(item.symbols || []).join(' ').toLocaleLowerCase('zh-Hant');
      return (!query || text.includes(query)) &&
        (!el.category.value || item.category === el.category.value) &&
        (!el.source.value || item.source === el.source.value) &&
        (!el.watchlist.value || (item.symbols || []).includes(el.watchlist.value));
    });
    el.count.textContent = '顯示 ' + filtered.length + ' / ' + state.news.length + ' 則';
    el.empty.hidden = filtered.length !== 0;
    el.news.innerHTML = filtered.map(card).join('');
  }

  function card(item) {
    const date = new Intl.DateTimeFormat('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(item.publishedAt));
    return '<article class="card"><div class="meta"><span class="tag">' + safe(item.category) + '</span><span>' + safe(item.source) +
      '</span></div><h3>' + safe(item.title) + '</h3><p>' + safe(item.summary) + '</p><footer><time datetime="' +
      safe(item.publishedAt) + '">' + date + '</time><span class="symbols">' + (item.symbols || []).map(safe).join(' · ') + '</span></footer></article>';
  }

  function safe(value) {
    const div = document.createElement('div');
    div.textContent = String(value || '');
    return div.innerHTML;
  }
})();
