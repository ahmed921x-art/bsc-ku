/* ════════════════════════════════════════════════════════════════
   BSC KU — واجهة التطبيق (هيدر + شريط سفلي + قائمة المزيد)

   تنحقن على كل صفحة عبر .claude/sync-app.js. الأيقونات SVG مرسومة
   بالخط (stroke) مو إيموجي — الإيموجي يطلع بشكل مختلف على كل جهاز
   ويكسر الإحساس إن هذا تطبيق أصلي.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── الأيقونات ────────────────────────────────────────────────── */
  const I = {
    home: '<path d="M3 10.2 12 3l9 7.2V20a1.5 1.5 0 0 1-1.5 1.5h-4V14h-7v7.5h-4A1.5 1.5 0 0 1 3 20z"/>',
    notes: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H18a2 2 0 0 1 2 2v14.5a1.5 1.5 0 0 1-1.5 1.5H6a2 2 0 0 1-2-2z"/><path d="M8 7.5h8M8 11.5h8M8 15.5h5"/>',
    events: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="8.5" cy="14.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="14.5" r="1.2" fill="currentColor" stroke="none"/>',
    services: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3.6"/>',
    more: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    join: '<path d="M16 20v-1.6a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20"/><circle cx="9.5" cy="7" r="3.4"/><path d="M18 6.5v6M21 9.5h-6"/>',
    majors: '<path d="M12 3 3.5 7.5 12 12l8.5-4.5z"/><path d="M6.5 10v5.5c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8V10"/>',
    explain: '<rect x="2.5" y="4.5" width="19" height="15" rx="3"/><path d="m10 9.2 5 2.8-5 2.8z" fill="currentColor" stroke="none"/>',
    advisors: '<circle cx="12" cy="7.5" r="3.6"/><path d="M5 20.5v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/>',
    team: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20v-1a4.5 4.5 0 0 1 4.5-4.5h3A4.5 4.5 0 0 1 15 19v1"/><path d="M16.5 5.2a3.2 3.2 0 0 1 0 6M18 14.6A4.5 4.5 0 0 1 21 19v1"/>',
    about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none"/>',
    ask: '<path d="M20.5 12.2c0 4.2-3.8 7.6-8.5 7.6a9.6 9.6 0 0 1-2.9-.44L4 21l1.3-3.9a7.2 7.2 0 0 1-1.8-4.9C3.5 8 7.3 4.6 12 4.6s8.5 3.4 8.5 7.6z"/>',
    privacy: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/>',
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none"/>',
    x: '<path d="M4 4l16 16M20 4L4 20"/>',
  };

  const svg = (name, size) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor"
       stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name]}</svg>`;

  /* ── خريطة الصفحات ────────────────────────────────────────────── */
  const TABS = [
    { id: 'home',     icon: 'home',     label: 'الرئيسية',  href: 'index.html' },
    { id: 'notes',    icon: 'notes',    label: 'المراجعات', href: 'notes.html' },
    { id: 'events',   icon: 'events',   label: 'الأنشطة',   href: 'events.html' },
    { id: 'services', icon: 'services', label: 'الخدمات',   href: 'services.html' },
    { id: 'more',     icon: 'more',     label: 'المزيد',    href: null },
  ];

  const SHEET = [
    { icon: 'join',      label: 'الانضمام للنادي',      href: 'join.html', cta: true },
    { icon: 'majors',    label: 'التخصصات',             href: 'majors.html' },
    { icon: 'explain',   label: 'شرح المواد',           href: 'explain.html' },
    { icon: 'advisors',  label: 'المرشدون الأكاديميون', href: 'advisors.html' },
    { icon: 'team',      label: 'الفريق',               href: 'team.html' },
    { icon: 'about',     label: 'عن النادي',            href: 'about.html' },
    { icon: 'ask',       label: 'اسأل النادي',          href: 'ask.html' },
    { icon: 'instagram', label: 'Instagram',            href: 'https://instagram.com/biosci_club', ext: true },
    { icon: 'x',         label: 'Twitter / X',          href: 'https://x.com/biosci_club', ext: true },
    { icon: 'privacy',   label: 'سياسة الخصوصية',       href: 'privacy.html', quiet: true },
  ];

  const PAGE_TAB = {
    'index.html': 'home', '': 'home',
    'notes.html': 'notes',
    'events.html': 'events',
    'services.html': 'services',
  };

  const TITLES = {
    'index.html': 'الرئيسية', '': 'الرئيسية',
    'notes.html': 'المراجعات',
    'events.html': 'الأنشطة',
    'services.html': 'الخدمات',
    'majors.html': 'التخصصات',
    'major.html': 'التخصص',
    'advisors.html': 'المرشدون',
    'about.html': 'عن النادي',
    'ask.html': 'اسأل النادي',
    'team.html': 'الفريق',
    'join.html': 'الانضمام للنادي',
    'explain.html': 'شرح المواد',
    'privacy.html': 'سياسة الخصوصية',
  };

  const page = location.pathname.split('/').pop() || 'index.html';
  const activeTab = PAGE_TAB[page] || 'more';
  const title = TITLES[page] || 'BSC KU';
  const isSubPage = !PAGE_TAB[page];   // صفحة داخلية → نعرض زر رجوع

  /* ── الهيدر ───────────────────────────────────────────────────── */
  const header = document.createElement('header');
  header.className = 'app-header';
  header.innerHTML = `
    ${isSubPage ? `<button class="app-back" aria-label="رجوع">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 5l7 7-7 7"/></svg>
      </button>` : `<img class="app-header-logo" src="app-mark.png" alt="">`}
    <span class="app-header-title">${title}</span>
    <button class="app-header-btn" id="langBtn" aria-label="تبديل اللغة"><span id="langLabel">EN</span></button>`;
  document.body.insertBefore(header, document.body.firstChild);

  header.querySelector('#langBtn').addEventListener('click', () => {
    if (typeof window.toggleLang === 'function') window.toggleLang();
  });

  const backBtn = header.querySelector('.app-back');
  if (backBtn) backBtn.addEventListener('click', () => window.appBack());

  /* الرجوع: نرجع للخلف لو فيه تاريخ داخل التطبيق، وإلا للرئيسية —
     عشان ما يعلق المستخدم بصفحة داخلية فتحها من إشعار أو رابط. */
  window.appBack = function () {
    if (history.length > 1 && document.referrer) history.back();
    else location.href = 'index.html';
  };

  /* ── الشريط السفلي ────────────────────────────────────────────── */
  const nav = document.createElement('nav');
  nav.className = 'app-bottom-nav';
  nav.innerHTML = TABS.map(t => {
    const on = activeTab === t.id ? ' active' : '';
    const inner = `<span class="tab-icon">${svg(t.icon, 23)}</span><span class="tab-label">${t.label}</span>`;
    return t.href
      ? `<a href="${t.href}" class="tab-item${on}" data-nav>${inner}</a>`
      : `<button class="tab-item${on}" id="moreTab" type="button">${inner}</button>`;
  }).join('');
  document.body.appendChild(nav);

  /* ── قائمة المزيد ─────────────────────────────────────────────── */
  const overlay = document.createElement('div');
  overlay.className = 'more-sheet-overlay';

  const sheet = document.createElement('div');
  sheet.className = 'more-sheet';
  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-list">${SHEET.map(s => {
      const cls = 'sheet-item' + (s.cta ? ' sheet-item-cta' : '') + (s.quiet ? ' sheet-item-quiet' : '');
      const ext = s.ext ? ' data-ext target="_blank" rel="noopener"' : ' data-nav';
      return `<a href="${s.href}" class="${cls}"${ext}>
        <span class="sheet-item-icon">${svg(s.icon, s.quiet ? 15 : 18)}</span>
        <span class="sheet-item-label">${s.label}</span>
        ${s.cta ? '<span class="sheet-item-badge">انضم</span>' : ''}
      </a>`;
    }).join('')}</div>`;

  document.body.appendChild(overlay);
  document.body.appendChild(sheet);

  let sheetOpen = false;
  window.openMoreSheet = function () {
    sheetOpen = true;
    overlay.classList.add('open');
    sheet.classList.add('open');
    document.body.classList.add('sheet-locked');
    window.appHaptic('light');
  };
  window.closeMoreSheet = function () {
    sheetOpen = false;
    overlay.classList.remove('open');
    sheet.classList.remove('open');
    document.body.classList.remove('sheet-locked');
  };

  document.getElementById('moreTab').addEventListener('click', () =>
    sheetOpen ? closeMoreSheet() : openMoreSheet());
  overlay.addEventListener('click', closeMoreSheet);

  /* سحب القائمة للأسفل عشان تنسكر — بتتبّع الإصبع مو قفزة وحدة */
  let dragY = 0, dragging = false;
  sheet.addEventListener('touchstart', e => {
    if (sheet.scrollTop > 0) return;      // يمرر المحتوى، مو يسحب القائمة
    dragging = true; dragY = e.touches[0].clientY;
    sheet.style.transition = 'none';
  }, { passive: true });

  sheet.addEventListener('touchmove', e => {
    if (!dragging) return;
    const dy = e.touches[0].clientY - dragY;
    if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });

  sheet.addEventListener('touchend', e => {
    if (!dragging) return;
    dragging = false;
    sheet.style.transition = '';
    sheet.style.transform = '';
    if (e.changedTouches[0].clientY - dragY > 90) closeMoreSheet();
  });

  /* ── اهتزاز خفيف عند اللمس (يشتغل على الأجهزة فقط) ────────────── */
  window.appHaptic = function (style) {
    const H = window.Capacitor?.Plugins?.Haptics;
    if (!H) return;
    try {
      if (style === 'select') H.selectionStart().then(() => H.selectionEnd());
      else H.impact({ style: style === 'medium' ? 'MEDIUM' : 'LIGHT' });
    } catch (e) { /* الاهتزاز كماليات — ما نوقف الواجهة لو فشل */ }
  };

  document.addEventListener('click', e => {
    if (e.target.closest('.tab-item, .sheet-item, .app-back')) window.appHaptic('light');
  }, true);

  /* ── انتقال ناعم بين الصفحات ──────────────────────────────────── */
  /* التنقل بالتطبيق تحميل صفحة كامل، واللي يبيّن الوميض الأبيض بين
     الصفحتين. نغطّيه بتلاشي سريع للخارج + دخول ناعم بالصفحة الجديدة. */
  document.addEventListener('click', e => {
    const link = e.target.closest('a[data-nav]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || link.target === '_blank') return;
    if (href.split('?')[0].split('#')[0] === page) { e.preventDefault(); closeMoreSheet(); return; }

    e.preventDefault();
    document.body.classList.add('page-leaving');
    setTimeout(() => { location.href = href; }, 130);
    // لو ما تمّ الانتقال لأي سبب، نرجّع الصفحة ظاهرة بدل ما تعلق شفافة
    setTimeout(() => document.body.classList.remove('page-leaving'), 1400);
  });

  /* الرجوع من كاش المتصفح: نشيل أثر الخروج، وإلا ترجع الصفحة شفافة */
  window.addEventListener('pageshow', () => document.body.classList.remove('page-leaving'));

  /* ── السحب للتحديث ────────────────────────────────────────────── */
  /* المحتوى يجي من Firestore، فالتحديث = إعادة تحميل الصفحة.
     يشتغل فقط لما تكون الصفحة بأعلاها وما فيه قائمة مفتوحة. */
  const spinner = document.createElement('div');
  spinner.className = 'pull-refresh';
  spinner.innerHTML = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
      stroke-width="2.2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-3.2-6.9"/><path d="M21 4v5h-5"/></svg>`;
  document.body.appendChild(spinner);

  const THRESHOLD = 72;
  let pullStart = 0, pulling = false, pullDist = 0;

  window.addEventListener('touchstart', (e) => {
    if (sheetOpen || window.scrollY > 2 || e.touches.length !== 1) return;
    pullStart = e.touches[0].clientY;
    pulling = true;
    pullDist = 0;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!pulling) return;
    pullDist = e.touches[0].clientY - pullStart;
    if (pullDist <= 0 || window.scrollY > 2) { reset(); return; }
    // مقاومة تدريجية: كل ما سحب أكثر كل ما صعّب — نفس إحساس النظام
    const shift = Math.min(pullDist * 0.42, 86);
    spinner.style.transform = `translate(-50%, ${shift}px)`;
    spinner.style.opacity = Math.min(pullDist / THRESHOLD, 1);
    spinner.style.rotate = (pullDist * 2.4) + 'deg';
    spinner.classList.toggle('ready', pullDist > THRESHOLD);
  }, { passive: true });

  function reset() {
    pulling = false;
    spinner.style.transition = 'transform .26s, opacity .26s';
    spinner.style.transform = 'translate(-50%, 0)';
    spinner.style.opacity = '0';
    spinner.classList.remove('ready');
    setTimeout(() => { spinner.style.transition = ''; }, 280);
  }

  window.addEventListener('touchend', () => {
    if (!pulling) return;
    if (pullDist > THRESHOLD) {
      window.appHaptic('medium');
      spinner.classList.add('spinning');
      location.reload();
      return;
    }
    reset();
  });

  /* ── شريط انقطاع الاتصال ──────────────────────────────────────── */
  /* الواجهة هنا عشان تشتغل بالمتصفح كمان؛ داخل التطبيق native.js
     يحدّثها من إضافة Network لأنها أدق من navigator.onLine. */
  const netBanner = document.createElement('div');
  netBanner.className = 'net-banner';
  netBanner.textContent = 'ما فيه اتصال — تشوف آخر محتوى محفوظ';
  document.body.appendChild(netBanner);

  window.appSetOnline = function (online) {
    netBanner.classList.toggle('show', !online);
    document.body.classList.toggle('is-offline', !online);
  };
  window.appSetOnline(navigator.onLine !== false);
  window.addEventListener('online', () => window.appSetOnline(true));
  window.addEventListener('offline', () => window.appSetOnline(false));

  /* ── مزامنة زر اللغة مع theme.js ──────────────────────────────── */
  const syncLang = () => {
    const lbl = document.getElementById('langLabel');
    if (lbl) lbl.textContent = (localStorage.getItem('bscku_lang') || 'ar') === 'ar' ? 'EN' : 'AR';
  };
  syncLang();
  setTimeout(syncLang, 200);
})();
