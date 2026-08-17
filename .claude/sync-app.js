#!/usr/bin/env node
// يبني مجلد www/ (محتوى تطبيق Capacitor) من صفحات الموقع في جذر المشروع.
// www/ مجلد مولّد بالكامل — لا تعدّل فيه يدوياً، عدّل على صفحات الموقع أو على app-shell/.
//
// التشغيل:  npm run sync
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'www');
const SHELL = path.join(ROOT, 'app-shell');

// صفحات الموقع اللي تنزل داخل التطبيق. admin.html مستثناة عمداً:
// لوحة الإدارة تبقى على الويب، ما تنشحن مع التطبيق للمستخدمين.
const PAGES = [
  'index.html', 'about.html', 'advisors.html', 'ask.html', 'events.html',
  'explain.html', 'join.html', 'major.html', 'majors.html', 'notes.html',
  'privacy.html', 'services.html', 'team.html',
];

// ملفات لازمة ما تنذكر داخل وسوم src/href (تنجلب ديناميكياً أو من manifest).
// logo-light.png يبدّله theme.js عند الوضع الفاتح، فما يظهر في فحص الوسوم.
// faculty-seed.js تنستدعى بـ import من داخل سكربت advisors.html، فما يلقطها ASSET_RE
const EXTRA_ASSETS = ['manifest.json', 'sw.js', 'favicon-192.png', 'logo-light.png', 'faculty-seed.js'];

const ASSET_RE = /(?:src|href)="([A-Za-z0-9_\-./]+\.(?:js|css|png|jpg|jpeg|webp|svg|json))"/g;

function injectShell(html) {
  if (!html.includes('</head>') || !html.includes('</body>')) {
    throw new Error('الصفحة ما فيها </head> أو </body> — ما نقدر نحقن واجهة التطبيق');
  }
  /* viewport-fit=cover ضروري: من أندرويد ١٥ (targetSdk 35+) النظام
     يفرض العرض من حافة لحافة، فالصفحة تمتد تحت شريط الإيماءات. وبدون
     هذي القيمة يرجع env(safe-area-inset-*) صفر، فينقص الشريط السفلي
     وتختفي أسماء التبويبات تحت شريط النظام. */
  html = html.replace(
    /<meta\s+name="viewport"\s+content="([^"]*)"\s*\/?>/i,
    (m, content) => content.includes('viewport-fit')
      ? m
      : `<meta name="viewport" content="${content.replace(/\s*$/, '')}, viewport-fit=cover">`);

  return html
    .replace('</head>', '<link href="app.css" rel="stylesheet">\n</head>')
    .replace('</body>',
      '<script src="app-config.js"></script>\n' +
      '<script src="app-nav.js"></script>\n' +
      '<script src="native.js"></script>\n</body>');
}

/* إعدادات يعرفها وقت البناء فقط.
   أهمها الإشعارات: إضافة PushNotifications تنهار انهياراً كاملاً لو
   ناديت register() وملف google-services.json مو موجود
   ("Default FirebaseApp is not initialized")، وهذا انهيار في الطبقة
   الأصلية ما يمسكه try/catch في جافاسكربت. فنفحص الملف هنا، وnative.js
   ما ينادي register() إلا لو كان موجود. أضف الملف وأعد البناء
   → تشتغل الإشعارات تلقائياً. */
function writeAppConfig() {
  const hasFCM = fs.existsSync(path.join(ROOT, 'android', 'app', 'google-services.json'));
  fs.writeFileSync(path.join(OUT, 'app-config.js'),
    `/* مولّد تلقائياً من .claude/sync-app.js — لا تعدّله */\n` +
    `window.BSCKU_PUSH = ${hasFCM};\n`);
  return hasFCM;
}

function collectAssets(html) {
  const found = new Set();
  for (const m of html.matchAll(ASSET_RE)) {
    const ref = m[1].replace(/^\.\//, '');
    if (ref.startsWith('http') || ref.startsWith('//') || ref.includes('..')) continue;
    if (PAGES.includes(ref)) continue;
    found.add(ref);
  }
  return found;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const assets = new Set(EXTRA_ASSETS);
let pageCount = 0;

for (const page of PAGES) {
  const src = path.join(ROOT, page);
  if (!fs.existsSync(src)) {
    console.warn(`  تحذير: ${page} غير موجودة — تم تخطيها`);
    continue;
  }
  const html = fs.readFileSync(src, 'utf8');
  collectAssets(html).forEach(a => assets.add(a));
  fs.writeFileSync(path.join(OUT, page), injectShell(html));
  pageCount++;
}

let assetCount = 0;
for (const asset of assets) {
  const src = path.join(ROOT, asset);
  if (!fs.existsSync(src)) {
    console.warn(`  تحذير: الأصل ${asset} غير موجود — تم تخطيه`);
    continue;
  }
  const dest = path.join(OUT, asset);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  assetCount++;
}

for (const file of fs.readdirSync(SHELL)) {
  fs.copyFileSync(path.join(SHELL, file), path.join(OUT, file));
}

const push = writeAppConfig();

console.log(`تم بناء www/ ← ${pageCount} صفحة، ${assetCount} أصل، ${fs.readdirSync(SHELL).length} ملف واجهة`);
console.log(push
  ? '  الإشعارات: مفعّلة (google-services.json موجود)'
  : '  الإشعارات: متوقفة — ضِف android/app/google-services.json وأعد البناء لتفعيلها');
