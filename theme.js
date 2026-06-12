// ============================================================
//  BSC KU — theme.js  (unified: theme + lang + KU menu + mobile)
// ============================================================

// ── 1. THEME (Dark / Light) ──────────────────────────────────
(function () {
  const DARK = {
    // ── رمادي فحمي (chosen by user) ──
    '--bg':         '#1e1e1e',   // خلفية الصفحة — رمادي فحمي
    '--bg2':        '#242424',   // خلفية الأقسام
    '--bg3':        '#2a2a2a',   // خلفية البطاقات الداخلية
    '--surface':    'rgba(255,255,255,0.04)',
    '--border':     'rgba(255,255,255,0.07)',
    '--border2':    'rgba(255,255,255,0.13)',
    '--text':       '#f0f0f0',
    '--muted':      '#888888',
    '--card-bg':    'rgba(26,26,26,0.92)',   // #1a1a1a
    '--navbar-bg':  'rgba(16,16,16,0.95)',   // #101010
    '--input-bg':   'rgba(255,255,255,0.05)',
    '--footer-bg':  'rgba(18,18,18,0.97)',   // #121212
    '--shadow':     'rgba(0,0,0,0.6)',
  };
  const LIGHT = {
    '--bg': '#ffffff', '--bg2': '#f8fafc', '--bg3': '#f1f5f9',
    '--surface': 'rgba(99,102,241,0.05)',
    '--border': 'rgba(99,102,241,0.15)', '--border2': 'rgba(99,102,241,0.22)',
    '--text': '#0f172a', '--muted': '#64748b',
    '--card-bg': 'rgba(255,255,255,0.95)',
    '--navbar-bg': 'rgba(255,255,255,0.95)',
    '--input-bg': 'rgba(99,102,241,0.05)',
    '--footer-bg': 'rgba(248,250,252,0.95)',
    '--shadow': 'rgba(99,102,241,0.12)',
  };

  function applyTheme(mode) {
    const vars = mode === 'light' ? LIGHT : DARK;
    Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
    document.documentElement.setAttribute('data-theme', mode);
    updateThemeBtn(mode);
    updateThemeVisuals(mode);
  }

  function updateThemeBtn(mode) {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.innerHTML = mode === 'light'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    btn.title = mode === 'light' ? 'الوضع الليلي' : 'الوضع الصباحي';
  }

  function updateThemeVisuals(mode) {
    const isLight = mode === 'light';
    // Always use the clear black-text logo, shown normally in both themes
    document.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') || '';
      if (/(^|\/)logo(-light)?\.png(\?|$)/.test(src)) img.setAttribute('src', 'logo-light.png');
    });
    document.querySelectorAll('.brand img, .footer-brand img, .hero-logo-wrap > img').forEach(img => {
      img.style.mixBlendMode = 'normal';
      img.style.filter = isLight
        ? 'drop-shadow(0 1px 5px rgba(99,102,241,.2))'
        : 'drop-shadow(0 2px 10px rgba(0,0,0,.5))';
    });
    document.querySelectorAll('.particle').forEach(p => { p.style.display = isLight ? 'none' : ''; });
    const canvas = document.querySelector('.bg-canvas');
    if (canvas) canvas.style.opacity = mode === 'light' ? '0.3' : '1';
    const grid = document.querySelector('.bg-grid');
    if (grid) grid.style.opacity = mode === 'light' ? '0.4' : '1';
  }

  window.toggleTheme = function () {
    const cur = localStorage.getItem('bscku_theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    localStorage.setItem('bscku_theme', next);
    applyTheme(next);
  };

  const savedTheme = localStorage.getItem('bscku_theme') || 'dark';
  applyTheme(savedTheme);
  document.addEventListener('DOMContentLoaded', () => { applyTheme(savedTheme); updateThemeBtn(savedTheme); });
})();


// ── 2. LANGUAGE TOGGLE (Full-page translation) ───────────────
(function () {

  // ═══════════════════════════════════════════════════════════
  //  FULL TRANSLATION MAP  (Arabic → English for every page)
  // ═══════════════════════════════════════════════════════════
  const T = {

    // ── Navbar & Brand ──────────────────────────────────────
    'نادي العلوم البيولوجية': 'Biological Sciences Club',
    'جامعة الكويت': 'Kuwait University',
    'الرئيسية': 'Home',
    'التخصصات': 'Majors',
    'المراجعات': 'Study Resources',
    'الأنشطة': 'Activities',
    'المرشدون': 'Advisors',
    'الخدمات': 'Services',
    'عائلة النادي': 'Club Family',
    'عن النادي': 'About',
    'اسأل النادي': 'Ask Us',
    'الجامعة': 'KU',
    'نظام التعلم الإلكتروني': 'E-Learning System',
    'سستم الجامعة': 'KU Portal',
    'النظام الأكاديمي': 'Academic System',
    'تثبيت': 'Install',

    // ── Top Banner ──────────────────────────────────────────
    'نادي العلوم البيولوجية · جامعة الكويت · مجتمع علمي طلابي متميز':
      'Biological Sciences Club · Kuwait University · A Distinguished Academic Community',

    // ── Page Titles (title tags) ────────────────────────────
    'عن النادي | BSC KU': 'About | BSC KU',
    'المرشدون | BSC KU': 'Advisors | BSC KU',
    'الأنشطة | BSC KU': 'Activities | BSC KU',
    'المراجعات | BSC KU': 'Study Resources | BSC KU',
    'الخدمات | BSC KU': 'Services | BSC KU',
    'عائلة النادي | BSC KU': 'Club Family | BSC KU',
    'اسأل النادي | BSC KU': 'Ask Us | BSC KU',
    'التخصصات | BSC KU': 'Majors | BSC KU',
    'BSC KU | نادي العلوم البيولوجية': 'BSC KU | Biological Sciences Club',

    // ── Page Hero Badges ────────────────────────────────────
    'عن النادي': 'About the Club',
    'الإرشاد الأكاديمي': 'Academic Advising',
    'الأنشطة': 'Activities',
    'مكتبة المراجعات': 'Resources Library',
    'خدمات النادي': 'Club Services',
    'المساعد الذكي': 'AI Assistant',
    'الأقسام العلمية': 'Academic Programs',
    'التخصصات': 'Majors',

    // ── Hero Section (index) ────────────────────────────────
    'نادي مهني · جامعة الكويت': 'Professional Club · Kuwait University',
    'نادي العلوم': 'Biological',
    'البيولوجية': 'Sciences Club',
    'Where academic novelty and creativity meet': 'Where academic novelty and creativity meet',
    'اسأل النادي': 'Ask the Club',
    'اعرف أكثر': 'Learn More',

    // ── Stats ────────────────────────────────────────────────
    'مراجعة دراسية': 'Study Resources',
    'أنشطة النادي': 'Club Activities',
    'مرشد أكاديمي': 'Academic Advisor',
    'نشاط': 'Activities',
    'تخصصات': 'Majors',

    // ── Index Sections ──────────────────────────────────────
    'آخر الأنشطة': 'Latest Activities',
    'آخر النوتات المضافة': 'Latest Study Notes',
    'عرض الكل ←': 'View All →',
    'تفاصيل كل تخصص ←': 'View All Majors →',

    // ── Major Names ──────────────────────────────────────────
    'البيولوجيا الجزيئية': 'Molecular Biology',
    'الجينات والتعبير الجيني والبنية الجزيئية للخلية': 'Genes, gene expression, and molecular cell structure',
    'علم الميكروبيولوجي': 'Microbiology',
    'البكتيريا والفيروسات والكائنات الدقيقة': 'Bacteria, viruses, and microorganisms',
    'بيولوجيا النبات': 'Plant Biology',
    'بنية النبات ووظائفه في النظم البيئية': 'Plant structure and function in ecosystems',
    'بيولوجيا الحيوان': 'Zoology',
    'تنوع الحيوانات وتركيبها وسلوكها': 'Animal diversity, anatomy, and behavior',
    'الكيمياء الحيوية': 'Biochemistry',
    'البروتينات والإنزيمات والتفاعلات الحيوية': 'Proteins, enzymes, and biochemical reactions',

    // ── Footer ──────────────────────────────────────────────
    'BSC KU — نادي العلوم البيولوجية': 'BSC KU — Biological Sciences Club',
    '© 2025 جامعة الكويت · جميع الحقوق محفوظة': '© 2025 Kuwait University · All Rights Reserved',

    // ── About Page ──────────────────────────────────────────
    'نادي العلوم البيولوجية': 'Biological Sciences Club',
    'حيث يلتقي الشغف العلمي بالتميز الأكاديمي — where academic novelty and creativity meet':
      'Where passion for science meets academic excellence',
    'من نحن؟': 'Who Are We?',
    'نحن؟': 'We?',
    'نادي العلوم البيولوجية (BSC KU) هو نادي يمثل قسم العلوم البيولوجية من كلية العلوم في جامعة الكويت، يجمع طلبة القسم من جميع التخصصات والمستويات في بيئة داعمة تحفّز التميز.':
      'The Biological Sciences Club (BSC KU) represents the Biological Sciences Department at Kuwait University\'s College of Science, uniting students from all majors and levels in a supportive environment that fosters excellence.',
    'نوفّر مراجعات دراسية، فعاليات وورش تطوير، وإرشاداً أكاديمياً متخصصاً — لأن نجاحك الأكاديمي والمهني هو غايتنا.':
      'We provide study resources, development events and workshops, and specialized academic advising — because your academic and professional success is our goal.',
    'نادي مهني طلابي': 'Professional Student Club',
    'قيمنا': 'Our Values',
    'ما الذي يميّزنا؟': 'What Sets Us Apart?',
    'التميز الأكاديمي': 'Academic Excellence',
    'مراجعات دراسية منتقاة وإرشاد أكاديمي متخصص يرفع مستواك في كل مادة':
      'Curated study resources and specialized academic advising to elevate your performance in every subject',
    'روح المجتمع': 'Community Spirit',
    'مجتمع طلابي متماسك يؤمن بأن التعاون والدعم المتبادل أساس التفوق الحقيقي':
      'A cohesive student community that believes collaboration and mutual support are the foundation of true excellence',
    'الاستكشاف العلمي': 'Scientific Exploration',
    'فعاليات علمية ومحاضرات متخصصة تُشعل الفضول وتفتح آفاقاً جديدة في علوم الحياة':
      'Scientific events and specialized lectures that ignite curiosity and open new horizons in life sciences',
    'أبرز النوتات': 'Featured Notes',

    // ── Advisors Page ────────────────────────────────────────
    'المرشدون الأكاديميون': 'Academic Advisors',
    'تواصل مع مرشدك الأكاديمي المتخصص في تخصصك للحصول على التوجيه والدعم':
      'Connect with your specialized academic advisor for guidance and support',
    'مرشد أكاديمي': 'Academic Advisor',
    'يضاف من لوحة الأدمن': 'Added from admin panel',
    'لا يوجد مرشدون بعد.': 'No advisors yet.',

    // ── Events Page ──────────────────────────────────────────
    'أنشطة النادي': 'Club Activities',
    'تابع آخر أنشطتنا من محاضرات ورحلات علمية وورش عمل متخصصة':
      'Follow our latest events — lectures, field trips, and specialized workshops',
    'لا توجد أنشطة حالياً. تابعونا للمزيد!': 'No activities currently. Stay tuned for more!',
    'قريباً': 'Coming Soon',
    'التفاصيل ←': 'Details →',

    // ── Notes Page ───────────────────────────────────────────
    'المراجعات والمذكرات الدراسية': 'Study Notes & Resources',
    'اعثر على نوتات جميع التخصصات البيولوجية بسهولة':
      'Find study notes for all biological science majors easily',
    'المذكرات المتوفرة هي تجميع من طلاب القسم، ولا تُغني عن الكتاب المقرر أو حضور المحاضرات.':
      'The notes available are compiled by students and do not replace the textbook or attending lectures.',
    'ابحث عن نوتة...': 'Search for a note...',
    '🔍  ابحث عن نوتة...': '🔍  Search for a note...',
    'كل التخصصات': 'All Majors',
    'الأحياء الجزيئية': 'Molecular Biology',
    'مايكروبيولوجي': 'Microbiology',
    'أحياء النبات': 'Plant Biology',
    'أحياء الحيوان': 'Zoology',
    'لا توجد نوتات مطابقة.': 'No matching notes found.',
    'فتح': 'Open',
    '📥 فتح': '📥 Open',

    // ── Services Page ────────────────────────────────────────
    'الخدمات الأكاديمية': 'Academic Services',
    'أدوات وخدمات مفيدة لطلبة العلوم البيولوجية': 'Useful tools and services for biological sciences students',
    '🎓 حاسبة المعدل': '🎓 GPA Calculator',
    '📰 الأخبار': '📰 News',
    '📢 الإعلانات': '📢 Announcements',
    '⭐ الوضع المفضل': '⭐ Favorites',
    'حاسبة المعدل': 'GPA Calculator',
    'حساب المعدل التراكمي': 'Calculate Cumulative GPA',
    'الوحدات المسجّلة السابقة': 'Previous Registered Credits',
    'المعدل التراكمي السابق': 'Previous Cumulative GPA',
    'اسم المادة': 'Course Name',
    'الوحدات': 'Credits',
    'الدرجة': 'Grade',
    'درجة قبل الإعادة': 'Grade Before Retake',
    'مجموع الوحدات (الفصل الحالي)': 'Total Credits (Current Semester)',
    'مجموع نقاط المواد': 'Total Grade Points',
    'المعدل الفصلي المتوقع': 'Expected Semester GPA',
    'عدد الوحدات المتراكمة': 'Total Accumulated Credits',
    'المعدل التراكمي المتوقع': 'Expected Cumulative GPA',
    'أضف مواداً للبدء': 'Add courses to get started',
    '🔄 احسب': '🔄 Calculate',
    '🗑️ مسح الفصل': '🗑️ Clear Semester',
    '📋 نسخ النتيجة': '📋 Copy Result',
    '+ إضافة مادة': '+ Add Course',
    '+ فصل جديد': '+ New Semester',
    'سلم الدرجات — جامعة الكويت': 'Grade Scale — Kuwait University',
    'الأخبار': 'News',
    'الإعلانات': 'Announcements',
    'الوضع المفضل': 'Favorites',
    'لا توجد أخبار حالياً.': 'No news currently.',
    'لا توجد إعلانات حالياً.': 'No announcements currently.',

    // ── Team Page ────────────────────────────────────────────
    'فريق النادي': 'Club Team',
    'تعرّف على الفريق المتميز الذي يقود نادي العلوم البيولوجية بجامعة الكويت':
      'Meet the distinguished team leading the Biological Sciences Club at Kuwait University',
    'مشرف النادي': 'Club Supervisor',
    'المشرف الأكاديمي لنادي العلوم البيولوجية في جامعة الكويت':
      'Academic Supervisor of the Biological Sciences Club at Kuwait University',
    'الهيئة الإدارية': 'Board of Directors',
    'الفريق الأكاديمي': 'Academic Team',
    'فريق الإعلام': 'Media Team',
    'فريق الفعاليات': 'Events Team',
    'أخرى': 'Other',
    'لا يوجد أعضاء بعد.': 'No members yet.',

    // ── Ask Page ────────────────────────────────────────────
    'المساعد الذكي': 'AI Assistant',
    'اسألني عن النوتات، الأنشطة، المرشدين الأكاديميين، أو أي شي يخص النادي':
      'Ask me about notes, activities, academic advisors, or anything related to the club',
    '🤖 جاري تحميل قاعدة المعرفة...': '🤖 Loading knowledge base...',
    'مساعد BSC KU': 'BSC KU Assistant',
    'اسألني عن أي شي يخص النادي': 'Ask me anything about the club',
    '📚 النوتات': '📚 Notes',
    '🎤 الأنشطة': '🎤 Activities',
    '🎓 المرشدون': '🎓 Advisors',
    '🧬 التخصصات': '🧬 Majors',
    '🤝 الانضمام': '🤝 Joining',
    'اكتب سؤالك هنا...': 'Type your question here...',
    'إرسال ←': 'Send →',

    // ── Majors Page ──────────────────────────────────────────
    'اكتشف تخصصات قسم العلوم البيولوجية الرئيسية والمساندة في جامعة الكويت':
      'Discover the core and supporting majors of the Biological Sciences Department at Kuwait University',
    'يدرس آليات التعبير الجيني، تقنيات الحمض النووي، والهندسة الوراثية — من أكثر التخصصات تقدماً في العلوم البيولوجية.':
      'Studies gene expression mechanisms, DNA techniques, and genetic engineering — one of the most advanced majors in biological sciences.',
    'يدرس البكتيريا والفيروسات والفطريات والطحالب الدقيقة — يُعدّ أساس علوم الصحة والبيئة والصناعة الحيوية.':
      'Studies bacteria, viruses, fungi, and microalgae — considered the foundation of health sciences, environmental science, and biotechnology.',
    'يغطي تشريح النبات وفسيولوجيته وعلاقته بالبيئة — مع تركيز على علم الطحالب والنباتات الطبية.':
      'Covers plant anatomy, physiology, and its relationship with the environment — with focus on algology and medicinal plants.',
    'يدرس تنوع الكائنات الحيوانية من لافقاريات وفقاريات — وظائفها الحيوية وسلوكها وبيئتها وتطورها.':
      'Studies the diversity of animal organisms from invertebrates to vertebrates — their vital functions, behavior, environment, and evolution.',
    'يدرس التفاعلات الكيميائية في الكائنات الحية — البروتينات، الإنزيمات، التغذية، والكيمياء الإكلينيكية.':
      'Studies chemical reactions in living organisms — proteins, enzymes, nutrition, and clinical chemistry.',
    'التخصصات المساندة': 'Minors',
    'التخصصات المساندة المتاحة لطلبة قسم العلوم البيولوجية':
      'Minors available to Biological Sciences students',
    'علم الأدلة الجنائية': 'Forensic Science',
    'يجمع بين علوم الأحياء والكيمياء والقانون لتحليل علم الأدلة الجنائية واستخدامها في التحقيقات الجنائية.':
      'Combines biology, chemistry, and law to analyze forensic evidence and use it in criminal investigations.',
    'النبات الزراعي': 'Agricultural Botany',
    'يدرس العلوم الزراعية وتطوير المحاصيل والنظم البيئية الزراعية واستدامة الغذاء.':
      'Studies agricultural sciences, crop development, agricultural ecosystems, and food sustainability.',
    'التقنية الحيوية': 'Biotechnology',

    // ── Major Detail Page ────────────────────────────────────
    'العودة للتخصصات': 'Back to Majors',
    '→ العودة للتخصصات': '→ Back to Majors',
    '📚 النوتات': '📚 Notes',
    '🗺️ صحيفة التخرج': '🗺️ Graduation Sheet',
    '📅 منشئ الجدول': '📅 Schedule Builder',
    '🎓 صحيفة التخرج المساند': '🎓 Minor Sheet',
    'نوتات التخصص': 'Major Notes',
    'المذكرات المتوفرة هي تجميع من طلاب القسم، ولا تُغني عن الكتاب المقرر أو حضور المحاضرات.':
      'The notes available are compiled by students and do not replace the textbook or attending lectures.',
    'خريطة المسار': 'Course Map',
    'صحيفة التخرج التفاعلية': 'Interactive Graduation Sheet',
    'اضغط على أي مادة لتعليمها كمكتملة. المواد المقفلة تحتاج مسبقاتها أولاً.':
      'Click on any course to mark it as complete. Locked courses require their prerequisites first.',
    'متطلب إلزامي': 'University Requirement',
    'متطلب القسم': 'Department Requirement',
    'متطلب التخصص': 'Major Requirement',
    'متطلب مساند': 'Minor Requirement',
    'اختياري': 'Elective',
    'مكتمل ✓': 'Completed ✓',
    '⏳ جاري تحميل الميجرشيت...': '⏳ Loading graduation sheet...',
    'منشئ الجدول': 'Schedule Builder',
    'صمّم جدولك الدراسي': 'Design Your Study Schedule',
    'ابحث عن المادة أو اختر من صحيفة التخرج — يُحسب المجموع تلقائياً':
      'Search for a course or select from the graduation sheet — total is calculated automatically',
    'اكتب اسم أو رمز المادة...': 'Type course name or code...',
    '🔍  اكتب اسم أو رمز المادة...': '🔍  Type course name or code...',
    'لم تختر مواد بعد...': 'No courses selected yet...',
    '#': '#',
    'رمز المادة': 'Course Code',
    'اسم المادة': 'Course Name',
    'الساعات': 'Credits',
    'النوع': 'Type',
    'حذف': 'Delete',
    'ابحث عن مادة وأضفها للجدول': 'Search for a course and add it to the schedule',
    'إجمالي المواد: ': 'Total Courses: ',
    'إجمالي الساعات: ': 'Total Credits: ',
    'المعدل المقدّر: ': 'Estimated GPA: ',
    'صحيفة التخرج المساند': 'Minor Sheet',
    'صحيفة التخرج للتخصص المساند': 'Minor Graduation Sheet',
    'صحيفة التخرج للتخصص المساند — تُظهر المتطلبات اللازمة لإتمام التخصص المساند بنجاح.':
      'The minor graduation sheet — shows the requirements needed to complete the minor successfully.',

    // ── Rendered dynamic content (Firebase) ─────────────────
    'لا توجد أنشطة بعد.': 'No activities yet.',
    'لا توجد نوتات بعد.': 'No notes yet.',
    'Untitled': 'Untitled',

    // ── Common UI ────────────────────────────────────────────
    'عرض الكل': 'View All',
    '← التالي': '→ Next',
    'السابق →': '← Previous',
    'إغلاق': 'Close',
    'حفظ': 'Save',
    'إلغاء': 'Cancel',
    'تحميل...': 'Loading...',
  };

  // ── Reverse map (EN → AR) ──
  const T_EN_AR = {};
  for (const [ar, en] of Object.entries(T)) {
    T_EN_AR[en] = ar;
  }

  function stripEmoji(str) {
    return (str || '').replace(/^[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/u, '').trim();
  }

  // ── Core translation helpers ──────────────────────────────
  function tr(text, toEn) {
    const clean = (text || '').trim();
    if (toEn) {
      return T[clean] || T[stripEmoji(clean)] || text;
    } else {
      return T_EN_AR[clean] || T_EN_AR[stripEmoji(clean)] || text;
    }
  }

  // ── Apply language to entire page ─────────────────────────
  function applyLang(lang) {
    const toEn = lang === 'en';

    // 1. html dir + lang
    document.documentElement.lang = lang;
    document.documentElement.dir  = toEn ? 'ltr' : 'rtl';

    // 2. <title> tag
    const t = document.querySelector('title');
    if (t) {
      const raw = t.textContent.trim();
      const translated = tr(raw, toEn);
      if (translated !== raw) t.textContent = translated;
    }

    // 3. Elements with data-ar / data-en  (most reliable — highest priority)
    document.querySelectorAll('[data-ar]').forEach(el => {
      const val = toEn ? el.getAttribute('data-en') : el.getAttribute('data-ar');
      if (val == null) return;
      // Desktop nav: strip emoji
      if (el.closest('#navLinks')) {
        el.textContent = stripEmoji(val);
      } else {
        el.textContent = val;
      }
    });

    // 4. Page-hero elements (page-badge, h1, p, h2) without data-ar
    document.querySelectorAll('.page-badge, .page-hero h1, .page-hero p, .page-hero h2').forEach(el => {
      if (el.closest('[data-ar]')) return; // already handled
      const raw = el.textContent.trim();
      const translated = tr(raw, toEn);
      if (translated && translated !== raw) el.textContent = translated;
    });

    // 5. Section labels, headings, stat spans, value cards, about text
    const selectors = [
      '.section-label', 'h2', 'h3',
      '.stat span', '.stat-mini span',
      '.value-card h3', '.value-card p',
      '.about-text h2', '.about-text p',
      '.about-visual p',
      '.supervisor-role', '.supervisor-info p',
      '.section-title',
      '.page-tabs .ptab',
      '.service-tabs .stab',
      '.ai-status',
      '.chat-header h3', '.chat-header p',
      '.qp-btn',
      '.back-btn',
      '.tree-legend .legend-item',
      '.sched-info',
      '.col-headers2 span',
      '.res-label',
      '.gpa-grade2',
      '.btn-calc', '.btn-reset',
      '.section-h2',
    ];

    document.querySelectorAll(selectors.join(',')).forEach(el => {
      if (el.closest('[data-ar]')) return;
      // Don't touch elements with inner HTML (children)
      if (el.children.length > 0) return;
      const raw = el.textContent.trim();
      if (!raw) return;
      const translated = tr(raw, toEn);
      if (translated && translated !== raw) el.textContent = translated;
    });

    // 6. Placeholders
    document.querySelectorAll('[placeholder]').forEach(el => {
      const raw = el.getAttribute('placeholder');
      if (!raw) return;
      const translated = tr(raw, toEn);
      if (translated && translated !== raw) el.setAttribute('placeholder', translated);
    });

    // 7. Table headers
    document.querySelectorAll('thead th').forEach(el => {
      if (el.children.length > 0) return;
      const raw = el.textContent.trim();
      const translated = tr(raw, toEn);
      if (translated && translated !== raw) el.textContent = translated;
    });

    // 8. Warning/info paragraphs (yellow note)
    document.querySelectorAll('p').forEach(el => {
      if (el.closest('[data-ar]')) return;
      if (el.children.length > 0) return;
      const raw = el.textContent.trim();
      const translated = tr(raw, toEn);
      if (translated && translated !== raw) el.textContent = translated;
    });

    // 9. Select options in notes filter
    document.querySelectorAll('select option').forEach(opt => {
      const raw = opt.textContent.trim();
      const translated = tr(raw, toEn);
      if (translated && translated !== raw) opt.textContent = translated;
    });

    // 10. Footer copy
    document.querySelectorAll('.footer-copy strong, .footer-copy span').forEach(el => {
      if (el.closest('[data-ar]')) return;
      if (el.children.length > 0) return;
      const raw = el.textContent.trim();
      const translated = tr(raw, toEn);
      if (translated && translated !== raw) el.textContent = translated;
    });

    // 11. Install button text
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
      const txt = installBtn.childNodes[installBtn.childNodes.length - 1];
      if (txt && txt.nodeType === 3) {
        const raw = txt.textContent.trim();
        const translated = tr(raw, toEn);
        if (translated && translated !== raw) txt.textContent = ' ' + translated;
      }
    }

    // 12. Language button label
    const lbl = document.getElementById('langLabel');
    if (lbl) lbl.textContent = toEn ? 'AR' : 'EN';

    // 13. Theme toggle title
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      themeBtn.title = toEn
        ? (themeBtn.title === 'الوضع الليلي' ? 'Dark Mode' : 'Light Mode')
        : (themeBtn.title === 'Dark Mode' ? 'الوضع الليلي' : 'الوضع الصباحي');
    }

    // 14. h2 spans (like "من <span>نحن؟</span>")
    document.querySelectorAll('h2').forEach(el => {
      if (el.closest('[data-ar]')) return;
      const spans = el.querySelectorAll('span');
      spans.forEach(span => {
        const raw = span.textContent.trim();
        const translated = tr(raw, toEn);
        if (translated && translated !== raw) span.textContent = translated;
      });
    });

    localStorage.setItem('bscku_lang', lang);
  }

  // ── Public API ─────────────────────────────────────────────
  window.toggleLang = function () {
    const cur = localStorage.getItem('bscku_lang') || 'ar';
    applyLang(cur === 'ar' ? 'en' : 'ar');
  };

  // Re-run translation (called after dynamic Firebase content loads)
  window.reapplyLang = function () {
    const cur = localStorage.getItem('bscku_lang') || 'ar';
    if (cur === 'en') applyLang('en');
  };

  document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('bscku_lang') || 'ar';
    applyLang(saved);
  });

})();


// ── 3. KU DROPDOWN ───────────────────────────────────────────
window.toggleKuMenu = function () {
  const menu = document.getElementById('kuMenu');
  if (!menu) return;
  menu.classList.toggle('open');
};

document.addEventListener('click', function (e) {
  if (!e.target.closest('.ku-dropdown')) {
    const menu = document.getElementById('kuMenu');
    if (menu) menu.classList.remove('open');
  }
});


// ── 4. MOBILE MENU ───────────────────────────────────────────
window.toggleMobileMenu = function () {
  const menu = document.getElementById('mobileMenu');
  const btn  = document.getElementById('hamburger');
  if (!menu || !btn) return;
  const isOpen = menu.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.mobile-nav a').forEach(a => {
    a.addEventListener('click', () => {
      const menu = document.getElementById('mobileMenu');
      const btn  = document.getElementById('hamburger');
      if (menu) { menu.classList.remove('open'); document.body.style.overflow = ''; }
      if (btn)  btn.classList.remove('open');
    });
  });

  const nav = document.getElementById('navbar');
  if (nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 60) {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        nav.style.height = '56px';
        nav.style.background = isLight ? 'rgba(255,255,255,.97)' : 'rgba(16,16,16,.97)';
      } else {
        nav.style.height = '';
        nav.style.background = '';
      }
    }, { passive: true });
  }
});


// ── 5. PWA INSTALL PROMPT ────────────────────────────────────
(function(){
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('installBtn');
    if(btn) btn.style.display = 'flex';
  });

  window.installPWA = function() {
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      const btn = document.getElementById('installBtn');
      if(btn) btn.style.display = 'none';
    });
  };

  window.addEventListener('appinstalled', () => {
    const btn = document.getElementById('installBtn');
    if(btn) btn.style.display = 'none';
  });
})();
