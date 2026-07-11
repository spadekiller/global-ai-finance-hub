(() => {
  'use strict';

  const state = {
    news: [],
    generatedAt: null,
    source: ''
  };

  const sectionOrder = ['AI 與科技前沿', '全球財經脈動', '美股與全球市場焦點'];
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
      brief: document.querySelector('#brief-container'),
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

      const payload = await response.json();
      state.news = Array.isArray(payload) ? payload : payload.items;
      state.generatedAt = Array.isArray(payload) ? null : payload.generatedAt;
      state.source = Array.isArray(payload) ? 'Static JSON' : payload.source;

      validateData();
      populateFilters();
      renderBrief();
      renderUpdatedTime();
    } catch (error) {
      console.error(error);
      showError(`資料載入失敗，請確認 data/news.json 可正常存取。錯誤訊息：${error.message}`);
    } finally {
      el.brief.setAttribute('aria-busy', 'false');
    }
  }

  function bind() {
    el.theme.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      setTheme(next);
      localStorage.setItem('finance-hub-theme', next);
    });

    el.search.addEventListener('input', renderBrief);
    [el.category, el.source].forEach((item) => item.addEventListener('change', renderBrief));
    el.reset.addEventListener('click', () => {
      el.search.value = '';
      el.category.value = '';
      el.source.value = '';
      renderBrief();
      el.search.focus();
    });
  }

  function validateData() {
    if (!Array.isArray(state.news) || state.news.length < 9) {
      throw new Error('news.json 必須包含至少 9 則早報條目');
    }

    const requiredFields = ['id', 'section', 'subject', 'title', 'originalTitle', 'translatedTitle', 'translationNote', 'source', 'publishedAt', 'category', 'fact', 'inference', 'hypothesis', 'tags', 'url'];
    const invalidItem = state.news.find((item) => requiredFields.some((field) => item[field] == null));

    if (invalidItem) {
      throw new Error(`news.json 欄位不完整：${invalidItem.id || '未知條目'}`);
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

  function renderBrief() {
    const query = el.search.value.trim().toLocaleLowerCase('zh-Hant');
    const filtered = state.news.filter((item) => {
      const searchableText = [
        item.section,
        item.subject,
        item.title,
        item.originalTitle,
        item.translatedTitle,
        item.translationNote,
        item.fact,
        item.inference,
        item.hypothesis,
        item.source,
        item.category,
        ...(item.tags || [])
      ].join(' ').toLocaleLowerCase('zh-Hant');

      return (!query || searchableText.includes(query)) &&
        (!el.category.value || item.category === el.category.value) &&
        (!el.source.value || item.source === el.source.value);
    });

    el.count.textContent = `顯示 ${filtered.length} / ${state.news.length} 則早報條目`;
    el.empty.hidden = filtered.length !== 0;
    el.brief.innerHTML = sectionOrder.map((section) => renderSection(section, filtered)).join('');
  }

  function renderSection(section, items) {
    const sectionItems = items.filter((item) => item.section === section);

    if (sectionItems.length === 0) {
      return '';
    }

    return `
      <section class="brief-section" aria-labelledby="${safeId(section)}">
        <h3 id="${safeId(section)}">${safe(section)}</h3>
        <div class="brief-list">
          ${sectionItems.map(renderItem).join('')}
        </div>
      </section>
    `;
  }

  function renderItem(item) {
    const date = new Intl.DateTimeFormat('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(item.publishedAt));

    const tags = (item.tags || []).map((tag) => `<span class="news-tag">${safe(tag)}</span>`).join('');
    const title = item.translatedTitle || item.title;
    const originalTitle = item.originalTitle && item.originalTitle !== title
      ? `<p class="original-title">原文標題：${safe(item.originalTitle)}</p>`
      : '';
    const translationNote = item.translationNote
      ? `<p class="translation-note">${safe(item.translationNote)}</p>`
      : '';
    const translatedSourceUrl = translatedUrl(item.url);

    return `
      <article class="brief-item">
        <div class="meta">
          <span class="tag">${safe(item.category)}</span>
          <span>${safe(item.source)}</span>
          <time datetime="${safe(item.publishedAt)}">${date}</time>
        </div>
        <h4><span>${safe(item.subject)}</span>${safe(title)}</h4>
        ${originalTitle}
        ${translationNote}
        <p class="analysis-line"><span class="claim-label">Fact</span>${safe(item.fact)}</p>
        <p class="analysis-line"><span class="claim-label">Inference</span>${safe(item.inference)}</p>
        <p class="analysis-line"><span class="claim-label">Hypothesis</span>${safe(item.hypothesis)}</p>
        <div class="news-tags" aria-label="新聞標籤">${tags}</div>
        <div class="source-actions">
          <a class="source-link" href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">閱讀來源</a>
          <a class="source-link translate-link" href="${safeUrl(translatedSourceUrl)}" target="_blank" rel="noopener noreferrer">翻譯原文</a>
        </div>
      </article>
    `;
  }

  function renderUpdatedTime() {
    const time = state.generatedAt
      ? Date.parse(state.generatedAt)
      : Math.max(...state.news.map((item) => Date.parse(item.publishedAt)));
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
    el.brief.innerHTML = '';
  }

  function safe(value) {
    const div = document.createElement('div');
    div.textContent = String(value || '');
    return div.innerHTML;
  }

  function safeId(value) {
    return `section-${String(value).replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '')}`;
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value), window.location.href);
      return safe(url.href);
    } catch {
      return '#';
    }
  }

  function translatedUrl(value) {
    try {
      const url = new URL('https://translate.google.com/translate');
      url.searchParams.set('sl', 'auto');
      url.searchParams.set('tl', 'zh-TW');
      url.searchParams.set('u', new URL(String(value), window.location.href).href);
      return url.href;
    } catch {
      return '#';
    }
  }
})();
