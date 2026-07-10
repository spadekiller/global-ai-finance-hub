(() => {
  'use strict';

  const state = {
    news: []
  };

  const el = {};

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    Object.assign(el, {
      theme: document.querySelector('#theme-toggle'),
      themeLabel: document.querySelector('#theme-label'),
      search: document.querySelector('#search-input'),
      category: document.querySelector('#category-filter'),
      source: document.querySelector('#source-filter'),
      reset: document.querySelector('#reset-filters'),
      news: document.querySelector('#news-grid'),
      count: document.querySelector('#result-count'),
      updated: document.querySelector('#last-updated'),
      error: document.querySelector('#error-message'),
      empty: document.querySelector('#empty-state'),
      year: document.querySelector('#current-year')
    });

    el.year.textContent = new Date().getFullYear();
    bind();
    setTheme(localStorage.getItem('finance-hub-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));

    try {
      const response = await fetch('./data/news.json');

      if (!response.ok) {
        throw new Error(`news.json 載入失敗：HTTP ${response.status}`);
      }

      state.news = await response.json();

      validateData();
      populateFilters();
      renderNews();
      renderUpdatedTime();
    } catch (error) {
      console.error(error);
      showError(`資料載入失敗，請確認 data/news.json 可正常存取。錯誤訊息：${error.message}`);
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
    [el.category, el.source].forEach((item) => item.addEventListener('change', renderNews));
    el.reset.addEventListener('click', () => {
      el.search.value = '';
      el.category.value = '';
      el.source.value = '';
      renderNews();
      el.search.focus();
    });
  }

  function validateData() {
    if (!Array.isArray(state.news) || state.news.length < 15) {
      throw new Error('news.json 必須包含至少 15 筆新聞');
    }

    const requiredNewsFields = ['id', 'title', 'source', 'publishedAt', 'category', 'summary', 'tags', 'url'];
    const invalidNews = state.news.find((item) => requiredNewsFields.some((field) => item[field] == null));

    if (invalidNews) {
      throw new Error(`news.json 欄位不完整：${invalidNews.id || '未知新聞'}`);
    }
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    el.themeLabel.textContent = theme === 'light' ? '淺色模式' : '深色模式';
  }

  function populateFilters() {
    addOptions(el.category, uniqueSorted(state.news.map((item) => item.category)));
    addOptions(el.source, uniqueSorted(state.news.map((item) => item.source)));
  }

  function addOptions(select, options) {
    options.forEach((value) => select.add(new Option(value, value)));
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  }

  function renderNews() {
    const query = el.search.value.trim().toLocaleLowerCase('zh-Hant');
    const filtered = state.news.filter((item) => {
      const searchableText = [
        item.title,
        item.summary,
        item.source,
        item.category,
        ...(item.tags || [])
      ].join(' ').toLocaleLowerCase('zh-Hant');

      return (!query || searchableText.includes(query)) &&
        (!el.category.value || item.category === el.category.value) &&
        (!el.source.value || item.source === el.source.value);
    });

    el.count.textContent = `顯示 ${filtered.length} / ${state.news.length} 筆新聞`;
    el.empty.hidden = filtered.length !== 0;
    el.news.innerHTML = filtered.map(renderCard).join('');
  }

  function renderCard(item) {
    const date = new Intl.DateTimeFormat('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(item.publishedAt));

    const tags = (item.tags || []).map((tag) => `<span class="news-tag">${safe(tag)}</span>`).join('');

    return `
      <article class="card">
        <div class="meta">
          <span class="tag">${safe(item.category)}</span>
          <span>${safe(item.source)}</span>
          <time datetime="${safe(item.publishedAt)}">${date}</time>
        </div>
        <h3>${safe(item.title)}</h3>
        <p>${safe(item.summary)}</p>
        <div class="news-tags" aria-label="新聞標籤">${tags}</div>
        <footer>
          <span class="scope-label">全球 AI 財經</span>
          <a href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">閱讀原文</a>
        </footer>
      </article>
    `;
  }

  function renderUpdatedTime() {
    const time = Math.max(...state.news.map((item) => Date.parse(item.publishedAt)));
    const updatedAt = new Date(time);
    el.updated.dateTime = updatedAt.toISOString();
    el.updated.textContent = new Intl.DateTimeFormat('zh-TW', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(updatedAt);
  }

  function showError(message) {
    el.error.hidden = false;
    el.error.textContent = message;
    el.count.textContent = '資料載入失敗';
    el.updated.textContent = '載入失敗';
    el.empty.hidden = true;
    el.news.innerHTML = '';
  }

  function safe(value) {
    const div = document.createElement('div');
    div.textContent = String(value || '');
    return div.innerHTML;
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value), window.location.href);
      return safe(url.href);
    } catch {
      return '#';
    }
  }
})();
