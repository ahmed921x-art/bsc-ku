#!/usr/bin/env node
// يصلّح مسارات Package.swift في مشروع iOS.
//
// المشكلة: أداة Capacitor تكتب مسارات الحزم بفاصل نظام التشغيل. على
// ويندوز تطلع بشرطات خلفية:
//
//   .package(name: "CapacitorApp", path: "..\..\..\node_modules\@capacitor\app")
//
// وSwift على macOS يبيها شرطات أمامية، فالمشروع ما يبني على أي جهاز
// آبل — لا على ماك ولا على أجهزة البناء السحابية. ولأن الملف يتولّد
// من جديد مع كل `cap sync`، نصلّحه بعد كل مزامنة بدل تعديله يدوياً.
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', 'ios', 'App', 'CapApp-SPM', 'Package.swift');

if (!fs.existsSync(FILE)) {
  console.log('ما فيه مشروع iOS — تم التخطي');
  process.exit(0);
}

const before = fs.readFileSync(FILE, 'utf8');

// نبدّل الشرطات داخل قيم path: فقط، وما نلمس باقي الملف
const after = before.replace(/path:\s*"([^"]*)"/g,
  (m, p) => `path: "${p.replace(/\\/g, '/')}"`);

if (before === after) {
  console.log('مسارات iOS سليمة');
} else {
  fs.writeFileSync(FILE, after);
  const n = (before.match(/path:\s*"[^"]*\\[^"]*"/g) || []).length;
  console.log(`تم إصلاح ${n} مسار في Package.swift ليبني على macOS`);
}
