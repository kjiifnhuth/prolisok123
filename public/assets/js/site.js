(() => {
  const ROUTE_PAGE_MAP = Object.freeze({
    '/about': 'about',
    '/groups': 'groups',
    '/team': 'team',
    '/menu': 'menu',
    '/gallery': 'gallery',
    '/documents': 'documents',
    '/news': 'news',
    '/faq': 'faq',
    '/contacts': 'contacts',
  });

  const DEFAULTS = Object.freeze({
    newsIcon: '📰',
    teamIcon: '👩‍🏫',
    galleryIcon: '🌿',
    documentIcon: '📄',
  });

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[char]);

  const getPage = () => document.body?.dataset.page || 'home';
  const getElement = (selector) => document.querySelector(selector);

  async function apiGet(url) {
    try {
      const response = await fetch(`/api${url}`, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  function normalizePath(pathname) {
    return pathname.replace(/\/+$/, '') || '/';
  }

  function expectedPageForPath(pathname) {
    const normalized = normalizePath(pathname);
    return ROUTE_PAGE_MAP[normalized] || (/^\/news\//.test(normalized) ? 'news-detail' : 'home');
  }

  async function ensureCorrectRouteDocument() {
    const expectedPage = expectedPageForPath(location.pathname);
    if (getPage() === expectedPage) return false;

    const file = expectedPage === 'home' ? 'index.html' : `pages/${expectedPage}.html`;

    try {
      const response = await fetch(`/${file}?route-repair=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return false;

      const html = await response.text();
      if (!/<body[\s>]/i.test(html) || !/data-page=/i.test(html)) return false;

      document.open();
      document.write(html);
      document.close();
      return true;
    } catch {
      return false;
    }
  }

  function sanitizeArticleHtml(value = '') {
    const raw = String(value || '');
    if (!/<[a-z][^>]*>/i.test(raw)) {
      const paragraphs = raw.replace(/\r\n?/g, '\n').split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean);
      return paragraphs.length ? paragraphs.map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('') : '<p>Текст новини ще не додано.</p>';
    }
    const template=document.createElement('template');
    template.innerHTML=raw;
    const allowedTags=new Set(['P','BR','STRONG','B','EM','I','U','S','DEL','MARK','H2','H3','UL','OL','LI','BLOCKQUOTE','A','SPAN']);
    const allowedStyle=new Set(['color','background-color','font-family','font-size','text-align']);
    const walk=node=>{ [...node.childNodes].forEach(child=>{
      if(child.nodeType===Node.COMMENT_NODE){child.remove();return;}
      if(child.nodeType!==Node.ELEMENT_NODE)return;
      if(!allowedTags.has(child.tagName)){while(child.firstChild)child.parentNode.insertBefore(child.firstChild,child);child.remove();return;}
      [...child.attributes].forEach(attr=>{
        if(child.tagName==='A'&&attr.name==='href'){
          if(!/^(https?:|mailto:|tel:)/i.test(attr.value.trim()))child.removeAttribute(attr.name);
        }else if(child.tagName==='SPAN'&&attr.name==='style'){
          const safe=attr.value.split(';').map(x=>x.trim()).filter(Boolean).map(x=>x.split(':')).filter(([prop,val])=>prop&&val&&allowedStyle.has(prop.trim().toLowerCase())).map(([prop,val])=>`${prop.trim().toLowerCase()}:${val.trim().replace(/[<>"']/g,'')}`).join(';');
          if(safe)child.setAttribute('style',safe);else child.removeAttribute('style');
        }else child.removeAttribute(attr.name);
      });
      if(child.tagName==='A')child.setAttribute('rel','noopener noreferrer');
      walk(child);
    });};
    walk(template.content);
    return template.innerHTML||'<p>Текст новини ще не додано.</p>';
  }

  function initHeader() {
    const header = getElement('.site-header');
    const menuButton = getElement('#menu-btn');
    const mobileMenu = getElement('#mobile-menu');
    const currentPage = getPage();
    const activePage = currentPage === 'news-detail' ? 'news' : currentPage;

    const syncScrolledState = () => {
      header?.classList.toggle('is-scrolled', window.scrollY > 12);
    };

    window.addEventListener('scroll', syncScrolledState, { passive: true });
    syncScrolledState();

    document.querySelectorAll('[data-nav]').forEach((link) => {
      link.classList.toggle('active', link.dataset.nav === activePage);
    });

    if (!menuButton || !mobileMenu) return;

    // Keep the mobile navigation accessible to screen readers and keyboard users.
    menuButton.setAttribute('aria-controls', 'mobile-menu');
    menuButton.setAttribute('aria-expanded', 'false');

    const setMenuState = (open) => {
      mobileMenu.classList.toggle('open', open);
      menuButton.setAttribute('aria-expanded', String(open));
    };

    menuButton.addEventListener('click', () => {
      setMenuState(!mobileMenu.classList.contains('open'));
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenuState(false));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setMenuState(false);
    });
  }

  function refreshReveal(root = document) {
    window.PROLIOSK?.observeRevealElements?.(root);

    // Fallback for pages that do not load animations.js.
    if (window.PROLIOSK?.observeRevealElements) return;

    const elements = [...root.querySelectorAll('.reveal:not(.visible)')];
    if (!elements.length) return;

    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((element) => element.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

    elements.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index % 6, 5) * 55}ms`;
      observer.observe(element);
    });
  }

  function renderSettings(settings) {
    const values = settings || {};

    document.querySelectorAll('[data-setting]').forEach((element) => {
      const key = element.dataset.setting;
      if (values[key] != null) element.textContent = values[key];
    });

    document.querySelectorAll('[data-setting-href]').forEach((element) => {
      const key = element.dataset.settingHref;
      const value = values[key];
      if (!value) return;

      element.href = key === 'phone'
        ? `tel:${String(value).replace(/[^+\d]/g, '')}`
        : key === 'email'
          ? `mailto:${value}`
          : value;
    });

    const heroTitle = getElement('[data-hero-title]');
    const heroSub = getElement('[data-hero-sub]');

    if (heroTitle && values.heroTitle) {
      const title = String(values.heroTitle).trim();
      const split = title.match(/^(.*?)(\s+для\s+)(.+)$/iu);

      // Keep the main Hero heading visually balanced in exactly two lines:
      // the first part stays on line 1, and the phrase after "для" on line 2.
      heroTitle.replaceChildren();

      if (split) {
        const firstLine = document.createElement('span');
        firstLine.textContent = split[1].trim();

        const secondLine = document.createElement('span');
        secondLine.className = 'hero-title-second-line';

        const leadWord = document.createElement('span');
        leadWord.textContent = 'для ';
        secondLine.append(leadWord);

        const accent = document.createElement('em');
        accent.textContent = split[3].trim();
        secondLine.append(accent);

        heroTitle.append(firstLine, secondLine);
      } else {
        heroTitle.textContent = title;
      }
    }
    if (heroSub && values.heroSub) heroSub.textContent = values.heroSub;

    const heroArt = getElement('.hero-art');
    if (!heroArt) return;

    const heroImage = values.heroImage || '/assets/images/hero-kids.png';
    heroArt.classList.add('hero-art-custom');
    heroArt.innerHTML = `<img class="hero-custom-image" src="${escapeHtml(heroImage)}" alt="Діти у садочку" loading="eager">`;
  }

  function getNewsMedia(data = {}) {
    const additionalMedia = String(data.mediaUrls || '')
      .split(/[\r\n]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    return [data.imageUrl, ...additionalMedia].filter(Boolean);
  }

  function renderNewsCard(item) {
    const data = item.data || {};
    const firstMedia = getNewsMedia(data)[0];
    const media = firstMedia
      ? `<img src="${escapeHtml(firstMedia)}" alt="${escapeHtml(item.title || 'Новина')}" loading="lazy">`
      : `<span aria-hidden="true">${escapeHtml(data.icon || DEFAULTS.newsIcon)}</span>`;

    // На головній показуємо новини як компактні візуальні картки: фото + заголовок.
    if (getPage() === 'home') {
      return `<article class="news-card reveal news-card-home">
        <a href="/news/${encodeURIComponent(item.slug || item.id)}" aria-label="Відкрити новину: ${escapeHtml(item.title || 'Новина')}">
          <div class="news-media">${media}</div>
          <div class="news-body">
            <h3>${escapeHtml(item.title || 'Новина')}</h3>
          </div>
        </a>
      </article>`;
    }

    return `<article class="news-card reveal">
      <a href="/news/${encodeURIComponent(item.slug || item.id)}">
        <div class="news-media">${media}</div>
        <div class="news-body">
          <div class="news-date">${escapeHtml(data.date || 'Новина')}</div>
          <h3>${escapeHtml(item.title || 'Новина')}</h3>
          <p>${escapeHtml(data.excerpt || data.text || '')}</p>
          <span class="read-more">Детальніше <span aria-hidden="true">→</span></span>
        </div>
      </a>
    </article>`;
  }

  async function renderNews() {
    const box = getElement('[data-news-list]');
    if (!box) return;

    const items = await apiGet('/content/news');
    if (!Array.isArray(items)) return;

    const visibleItems = getPage() === 'home'
      ? [...items]
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .slice(0, 3)
      : items;

    box.innerHTML = visibleItems.map(renderNewsCard).join('');
    refreshReveal(box);
  }

  function renderArticleNotFound(root) {
    root.innerHTML = `<div class="article-empty">
      <span class="eyebrow">404</span>
      <h1 class="article-title">Новину не знайдено</h1>
      <p>Можливо, її видалили або посилання застаріло.</p>
      <a class="btn-primary" href="/news">Повернутися до новин</a>
    </div>`;
  }

  async function renderNewsDetail() {
    const root = getElement('#article-root');
    if (!root) return;

    const slug = decodeURIComponent(normalizePath(location.pathname).replace(/^\/news\//, ''));
    if (!slug) return;

    const item = await apiGet(`/content/news/${encodeURIComponent(slug)}`);
    if (!item) {
      renderArticleNotFound(root);
      return;
    }

    const data = item.data || {};
    const media = getNewsMedia(data);
    const title = item.title || data.title || 'Новина';
    const imageMarkup = media.length
      ? `<img class="article-cover" src="${escapeHtml(media[0])}" alt="${escapeHtml(title)}" loading="eager">`
      : `<div class="article-cover article-placeholder" aria-hidden="true">${escapeHtml(data.icon || DEFAULTS.newsIcon)}</div>`;
    const galleryMarkup = media.length > 1
      ? `<div class="article-gallery">${media.slice(1).map((src, index) => `<img src="${escapeHtml(src)}" alt="${escapeHtml(title)} — фото ${index + 2}" loading="lazy">`).join('')}</div>`
      : '';

    root.innerHTML = `<article class="article-shell reveal visible">
      <div class="article-top">
        <a class="back-link" href="/news">← Назад до новин</a>
        <div class="article-meta"><span class="article-label">Новина</span>${data.date ? `<span class="article-dot">•</span><span class="article-date">${escapeHtml(data.date)}</span>` : ''}</div>
      </div>

      <div class="article-content">
        ${imageMarkup}
        <div class="article-heading">
          <h1 class="article-title">${escapeHtml(title)}</h1>
          <div class="article-copy">${sanitizeArticleHtml(data.text || '')}</div>
        </div>
        <div class="article-clear"></div>
      </div>

      ${galleryMarkup}
    </article>`;
  }

  function renderTeamItem(item) {
    const data = item.data || {};
    const photo = data.imageUrl
      ? `<img src="${escapeHtml(data.imageUrl)}" alt="${escapeHtml(item.title || 'Співробітник')}" loading="lazy">`
      : `<span class="person-fallback">${escapeHtml(data.icon || DEFAULTS.teamIcon)}</span>`;

    return `<article class="person reveal">
      <div class="person-photo">${photo}</div>
      <h3>${escapeHtml(item.title || '')}</h3>
      <div class="role">${escapeHtml(data.role || '')}</div>
      ${data.comment ? `<div class="person-comment">“${escapeHtml(data.comment)}”</div>` : ''}
      ${data.desc ? `<p>${escapeHtml(data.desc)}</p>` : ''}
    </article>`;
  }

  async function renderTeam() {
    const box = getElement('[data-team-list]');
    if (!box) return;

    const items = await apiGet('/content/team');
    if (!Array.isArray(items)) return;

    box.innerHTML = items.map(renderTeamItem).join('');
    refreshReveal(box);
  }

  async function renderGroups() {
    const box = getElement('[data-groups-list]');
    if (!box) return;

    const items = await apiGet('/content/groups');
    if (!Array.isArray(items)) return;

    box.innerHTML = items.map((item) => {
      const data = item.data || {};
      return `<article class="group-card reveal">
        <div class="group-top"><span class="age">${escapeHtml(data.age || '')}</span><h3>${escapeHtml(item.title || '')}</h3></div>
        <div class="group-body"><p>${escapeHtml(data.desc || '')}</p><a class="read-more" href="/contacts">Запитати про групу →</a></div>
      </article>`;
    }).join('');

    refreshReveal(box);
  }

  async function renderMenu() {
    const box = getElement('[data-menu-list]');
    if (!box) return;

    const items = await apiGet('/content/menu');
    if (!Array.isArray(items)) return;

    box.innerHTML = items.map((item) => {
      const data = item.data || {};
      return `<div class="contact-row">
        <div class="contact-icon">🍎</div>
        <div><strong>${escapeHtml(item.title || '')}</strong><span>${escapeHtml(data.weight || '')}</span></div>
      </div>`;
    }).join('');
  }

  async function renderDocs() {
    const box = getElement('[data-docs-list]');
    if (!box) return;

    const items = await apiGet('/content/documents');
    if (!Array.isArray(items)) return;

    box.innerHTML = items.map((item) => {
      const data = item.data || {};
      const hasUrl = Boolean(data.url && data.url !== '#');
      return `<a class="doc reveal" href="${escapeHtml(hasUrl ? data.url : '#')}"${hasUrl ? ' target="_blank" rel="noopener"' : ''}>
        <span class="doc-icon">${escapeHtml(data.icon || DEFAULTS.documentIcon)}</span>
        <span><strong>${escapeHtml(item.title || '')}</strong><small>${escapeHtml(data.meta || 'Документ')}</small></span>
        <span style="margin-left:auto;color:var(--moss);font-weight:900">→</span>
      </a>`;
    }).join('');

    refreshReveal(box);
  }

  function setupLightbox() {
    const box = getElement('#lightbox');
    if (!box || box.dataset.initialized === 'true') return;

    const image = box.querySelector('img');
    const close = () => {
      box.classList.remove('open');
      document.body.style.overflow = '';
    };

    box.dataset.initialized = 'true';
    box.querySelector('button')?.addEventListener('click', close);
    box.addEventListener('click', (event) => {
      if (event.target === box) close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });

    window.openLightbox = (src, alt = '') => {
      if (!image) return;
      image.src = src;
      image.alt = alt;
      box.classList.add('open');
      document.body.style.overflow = 'hidden';
    };
  }

  async function renderGallery() {
    const box = getElement('[data-gallery-list]');
    if (!box) return;

    const items = await apiGet('/content/gallery');
    if (!Array.isArray(items)) return;

    box.innerHTML = items.length
      ? items.map((item) => {
          const data = item.data || {};
          const imageUrl = data.imageUrl || '';
          return `<div class="gallery-item reveal" data-category="${escapeHtml(data.category || 'other')}"${imageUrl ? ` data-src="${escapeHtml(imageUrl)}"` : ''}>
            ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.title || '')}" loading="lazy">` : `<div class="gallery-placeholder">${escapeHtml(data.icon || DEFAULTS.galleryIcon)}</div>`}
            <div class="gallery-caption">${escapeHtml(item.title || '')}</div>
          </div>`;
        }).join('')
      : `<div class="card" style="grid-column:1/-1;text-align:center"><div class="icon-box" style="margin:0 auto 18px">📷</div><h3>Галерея скоро поповниться</h3><p>Фотографії можна додавати через адмін-панель.</p></div>`;

    setupLightbox();
    box.querySelectorAll('[data-src]').forEach((item) => {
      item.addEventListener('click', () => window.openLightbox(item.dataset.src, item.querySelector('img')?.alt || ''));
    });
    refreshReveal(box);
  }

  async function renderAbout() {
    const root = getElement('#about-page-content');
    if (!root || getPage() !== 'about') return;

    const items = await apiGet('/content/about');
    const item = Array.isArray(items) ? items[0] : null;
    if (!item) return;

    const data = item.data || {};

    root.querySelectorAll('[data-about]').forEach((element) => {
      const key = element.dataset.about;
      const value = String(data[key] ?? '');
      if (value) element.textContent = value;
    });

    root.querySelectorAll('[data-about-rich]').forEach((element) => {
      const key = element.dataset.aboutRich;
      const value = String(data[key] ?? '');
      if (value) element.innerHTML = sanitizeArticleHtml(value);
    });

    const bullets = String(data.bullets || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    const bulletsBox = getElement('#about-bullets');
    if (bulletsBox) {
      bulletsBox.innerHTML = bullets.map((text) => `<li>${escapeHtml(text)}</li>`).join('');
    }
  }

  async function renderFaq() {
    const box = getElement('[data-faq-list]');
    if (!box) return;

    const items = await apiGet('/content/faq');
    if (!Array.isArray(items)) return;

    box.innerHTML = items.map((item) => `<div class="faq-item reveal">
      <button class="faq-btn" type="button"><span>${escapeHtml(item.title || '')}</span><span class="faq-icon">+</span></button>
      <div class="faq-answer hidden">${escapeHtml(item.data?.answer || '')}</div>
    </div>`).join('');

    box.querySelectorAll('.faq-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const answer = button.nextElementSibling;
        const icon = button.querySelector('.faq-icon');
        const isHidden = answer?.classList.toggle('hidden');
        if (icon) icon.textContent = isHidden ? '+' : '−';
      });
    });

    refreshReveal(box);
  }

  function toast(message) {
    const element = document.createElement('div');
    element.className = 'prolisok-toast';
    element.textContent = message;
    document.body.appendChild(element);
    window.setTimeout(() => element.remove(), 3500);
  }

  function initRegistrationForm() {
    const form = getElement('#register-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const name = String(formData.get('name') || '').trim();
      const phone = String(formData.get('phone') || '').trim();
      const message = String(formData.get('message') || '').trim();
      const submitButton = form.querySelector('.form-submit');

      if (!name || !phone) {
        toast('Заповніть ім’я та телефон');
        return;
      }

      submitButton?.setAttribute('disabled', 'disabled');
      try {
        const response = await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ name, phone, message }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) throw new Error(data.error || 'Не вдалося надіслати заявку.');

        toast('Заявку успішно надіслано. Ми зв’яжемося з вами найближчим часом.');
        form.reset();
      } catch (error) {
        toast(error.message || 'Не вдалося надіслати заявку');
      } finally {
        submitButton?.removeAttribute('disabled');
      }
    });
  }

  async function renderDynamicContent() {
    await Promise.all([
      renderNews(),
      renderTeam(),
      renderGroups(),
      renderMenu(),
      renderDocs(),
      renderGallery(),
      renderFaq(),
      renderAbout(),
    ]);
  }

  async function init() {
    if (await ensureCorrectRouteDocument()) return;

    initHeader();
    setupLightbox();
    refreshReveal();

    const settings = await apiGet('/settings/general');
    if (settings) renderSettings(settings);

    if (/^\/news\//.test(normalizePath(location.pathname))) {
      await renderNewsDetail();
      return;
    }

    initRegistrationForm();
    await renderDynamicContent();
    refreshReveal();
  }

  window.toast = toast;
  window.addEventListener('DOMContentLoaded', () => {
    init().catch((error) => {
      console.error('[PROLISOK] Site initialization failed:', error);
    });
  }, { once: true });
})();
