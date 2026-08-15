#!/usr/bin/env node
// يبني مصادر أيقونة التطبيق وشاشة البداية من شعار النادي، ثم يولّد
// كل المقاسات لأندرويد و iOS.
//
// التشغيل:  npm run assets
//
// نقصّ مجموعة السداسيات الملوّنة فقط من الشعار — النصوص الصغيرة
// ("Biological Sciences Club") ما تنقرأ بحجم الأيقونة على الجهاز،
// فتركها يخلي الأيقونة تطلع مزحومة وغير واضحة.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const SRC = path.join(ROOT, 'logo-light.png');

// حدود مجموعة السداسيات وحدها داخل logo-light.png (1100x906).
// تستثني كلمة "BSC KU" عمداً: نصّها أسود في هذي النسخة فيختفي على
// الخلفية الداكنة، والسداسيات وحدها أوضح وأقوى بحجم الأيقونة.
const CROP = { left: 222, top: 58, width: 513, height: 590 };

const BG = '#0b0b14';        // نفس خلفية التطبيق الداكنة
const GLOW = '#6366f1';      // البنفسجي الأساسي للهوية

const bgSvg = (size, glowScale = 0.75) => Buffer.from(`
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g" cx="50%" cy="42%" r="58%">
      <stop offset="0%" stop-color="${GLOW}" stop-opacity="0.32"/>
      <stop offset="55%" stop-color="${GLOW}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${GLOW}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <circle cx="${size / 2}" cy="${size * 0.44}" r="${size * glowScale / 2}" fill="url(#g)"/>
</svg>`);

/* ── عزل السداسيات عن كلمة "BSC KU" ──────────────────────────────
   الكلمة مرسومة خلف السداسيات، فالقص المستطيل وحده ما يشيلها.
   الحل: نبني قناع شفافية من شكل السداسيات نفسها.

   السداسي = لون باستيلي مشبّع، والرسمة داخله خطوط سوداء رفيعة.
   نأخذ البكسلات المشبّعة كقناع مبدئي، ثم نطبّق «إغلاق مورفولوجي»
   (تمدّد ثم تآكل) بنصف قطر أكبر من سماكة الخطوط — فتنسدّ الخطوط
   السوداء داخل السداسي ويصير مصمت، بينما الفراغات الكبيرة بين
   السداسيات والنص اللي برّاها تبقى خارج القناع. */
const R = 9; // نصف قطر الإغلاق — أكبر من سماكة خطوط الرسم

function morph(mask, W, H, r, pick) {
  const tmp = new Uint8Array(W * H), out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = pick === Math.max ? 0 : 255;
      for (let d = -r; d <= r; d++) {
        const xx = x + d;
        if (xx < 0 || xx >= W) continue;
        v = pick(v, mask[y * W + xx]);
      }
      tmp[y * W + x] = v;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = pick === Math.max ? 0 : 255;
      for (let d = -r; d <= r; d++) {
        const yy = y + d;
        if (yy < 0 || yy >= H) continue;
        v = pick(v, tmp[yy * W + x]);
      }
      out[y * W + x] = v;
    }
  }
  return out;
}

let hexCache = null;
async function hexagonsOnly() {
  if (hexCache) return hexCache;
  const { data, info } = await sharp(SRC).extract(CROP).ensureAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;

  const mask = new Uint8Array(W * H);
  for (let i = 0, p = 0; p < W * H; p++, i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 60) continue;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx > 90 && (mx - mn) / mx > 0.25) mask[p] = 255;
  }

  const closed = morph(morph(mask, W, H, R, Math.max), W, H, R, Math.min);

  const out = Buffer.alloc(W * H * 4);
  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    out[i] = data[i]; out[i + 1] = data[i + 1]; out[i + 2] = data[i + 2];
    out[i + 3] = closed[p] ? data[i + 3] : 0;
  }
  hexCache = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  return hexCache;
}

async function logoAt(width) {
  return sharp(await hexagonsOnly()).resize({ width, fit: 'inside' }).png().toBuffer();
}

// يركّب الشعار في منتصف مربع، بنسبة عرض محددة
async function compose(size, logoRatio, background) {
  const logoW = Math.round(size * logoRatio);
  const logo = await logoAt(logoW);
  const meta = await sharp(logo).metadata();
  return sharp(background)
    .composite([{
      input: logo,
      left: Math.round((size - meta.width) / 2),
      top: Math.round((size - meta.height) / 2),
    }])
    .png()
    .toBuffer();
}

(async () => {
  fs.mkdirSync(ASSETS, { recursive: true });

  // أيقونة التطبيق — الشعار يملأ 72% من المربع
  fs.writeFileSync(path.join(ASSETS, 'icon.png'),
    await compose(1024, 0.72, bgSvg(1024)));

  // أيقونة أندرويد التكيّفية: النظام يقص الأطراف ويحرّك الطبقات،
  // فالمقدمة لازم تبقى داخل ~66% الآمنة بالمنتصف.
  fs.writeFileSync(path.join(ASSETS, 'icon-foreground.png'),
    await compose(1024, 0.58, Buffer.from(
      `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="1024" fill="none"/></svg>`)));

  fs.writeFileSync(path.join(ASSETS, 'icon-background.png'),
    await sharp(bgSvg(1024, 1.15)).png().toBuffer());

  // شاشة البداية — مربعة وكبيرة، النظام يقصّها حسب مقاس الجهاز،
  // فالشعار يبقى صغير نسبياً عشان ما ينقص على الشاشات الطويلة.
  for (const name of ['splash.png', 'splash-dark.png']) {
    fs.writeFileSync(path.join(ASSETS, name),
      await compose(2732, 0.30, bgSvg(2732, 0.62)));
  }

  /* علامة الهيدر داخل التطبيق: السداسيات وحدها بخلفية شفافة.
     الشعار الكامل فيه سطرين نص صغير، وبحجم ٣٠ بكسل في الهيدر يطلع
     لطخة غير مقروءة. الاسم مختلف عمداً عن logo*.png لأن theme.js
     يبدّل أي صورة بهذا النمط تلقائياً. */
  fs.writeFileSync(path.join(ROOT, 'app-shell', 'app-mark.png'),
    await sharp(await hexagonsOnly()).resize({ width: 192, fit: 'inside' }).png().toBuffer());

  const files = fs.readdirSync(ASSETS);
  console.log(`تم بناء مصادر الأيقونات في assets/ → ${files.join('، ')}`);
})();
