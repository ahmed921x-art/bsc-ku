#!/usr/bin/env node
// يبني ملف APK للأندرويد.
//
// التشغيل:  npm run apk
//
// ليش السكربت موجود أصلاً: مسار المشروع فيه أحرف عربية
// ("الملفات المهمة")، و gradlew.bat يمرّر المسار عبر cmd بترميز
// النظام (مو UTF-8)، فتتحول الأحرف العربية لـ "?" وما يلقى Java
// ملفاته ويفشل البناء قبل ما يبدأ.
//
// الحل: نسوي junction (اختصار مجلد) بمسار إنجليزي كامل يشير لنفس
// المشروع، ونبني منه. الملفات وحدة والنتائج تنكتب بالمشروع الأصلي —
// المسار الإنجليزي مجرد باب دخول.
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LINK = 'C:\\bsc-ku-build';
const ANDROID = path.join(LINK, 'android');

const JDKS = [
  process.env.JAVA_HOME,
  'C:\\Program Files\\Android\\Android Studio\\jbr',
  'C:\\Program Files\\Android\\Android Studio\\jre',
].filter(Boolean);

const jdk = JDKS.find(p => fs.existsSync(path.join(p, 'bin', 'java.exe')));
if (!jdk) {
  console.error('ما لقيت Java. ثبّت Android Studio أو حدّد JAVA_HOME.');
  process.exit(1);
}

// المسار إنجليزي أصلاً؟ نبني منه مباشرة وما نحتاج junction.
const asciiSafe = /^[\x20-\x7E]*$/.test(ROOT);
let buildDir = path.join(ROOT, 'android');

if (!asciiSafe) {
  if (!fs.existsSync(LINK)) {
    console.log(`المسار فيه أحرف غير إنجليزية — أسوي اختصار: ${LINK}`);
    execSync(`mklink /J "${LINK}" "${ROOT}"`, { shell: 'cmd.exe', stdio: 'inherit' });
  }
  buildDir = ANDROID;
}

const task = process.argv[2] === 'release' ? 'assembleRelease' : 'assembleDebug';
console.log(`أبني ${task}…`);

// shell:true مطلوب — Node 20+ يرفض تشغيل ملفات .bat مباشرة
execFileSync(path.join(buildDir, 'gradlew.bat'), [task, '--console=plain'], {
  cwd: buildDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, JAVA_HOME: jdk },
});

const out = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk',
  task === 'assembleRelease' ? 'release' : 'debug');
const apk = fs.existsSync(out) && fs.readdirSync(out).find(f => f.endsWith('.apk'));

if (apk) {
  const full = path.join(out, apk);
  console.log(`\nتم: ${full}  (${(fs.statSync(full).size / 1048576).toFixed(1)} ميجا)`);
} else {
  console.log('\nانتهى البناء بس ما لقيت ملف APK — راجع مخرجات Gradle فوق.');
}
