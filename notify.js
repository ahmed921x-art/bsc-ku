// ════════════════════════════════════════════════════════════════
//  BSC KU — تنبيهات الأنشطة والإعلانات
//
//  الموقع مستضاف على GitHub Pages (ملفات ثابتة فقط) وما فيه سيرفر
//  يرسل Web Push، فالتنبيه هنا يشتغل على مستويين:
//
//  ١) تنبيه عند فتح الموقع: نقارن آخر زيارة بتواريخ إنشاء الإعلانات
//     والأنشطة والأخبار، وأي شي جديد ينطلع كإشعار متصفح + شريط بالصفحة.
//     يشتغل بالكامل بدون سيرفر.
//
//  ٢) تذكير بالمواعيد عبر التقويم: زر «أضف للتقويم» ينزّل ملف .ics
//     فيه تنبيه قبل الموعد بيوم. تقويم الجوال يذكّر الطالب حتى لو
//     الموقع مسكّر — وهذا أقرب شي لإشعار حقيقي بدون سيرفر.
//
//  لو انضاف سيرفر لاحقاً (Cloudflare Worker + FCM) نقدر نضيف Web Push
//  حقيقي فوق هذا بدون ما نغيّر الواجهة.
// ════════════════════════════════════════════════════════════════

const CFG = {
  apiKey: "AIzaSyDGSTBOgSu4skvrEWUr2LcFLL_DDhTTZBE",
  authDomain: "bsc-ku.firebaseapp.com",
  projectId: "bsc-ku",
  storageBucket: "bsc-ku.firebasestorage.app",
  messagingSenderId: "326699795389",
  appId: "1:326699795389:web:94dcd1cb40be153987c8d4"
};

const SEEN_KEY = "bscku_notify_seen";
const OPT_KEY  = "bscku_notify_opt";     // on | off | (فاضي = ما سألناه بعد)
const ASKED_KEY = "bscku_notify_asked";

const esc = s => String(s == null ? "" : s)
  .replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ───────── قراءة تواريخ Firestore ───────── */
const toDate = v => {
  if (!v) return null;
  if (typeof v === "object" && typeof v.toDate === "function") { try { return v.toDate(); } catch (e) { return null; } }
  if (typeof v === "object" && typeof v.seconds === "number") return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

/* ───────── تحليل تاريخ النشاط (نص حر يكتبه الأدمن) ─────────
   الأدمن يكتب التاريخ بيده، فممكن يجي بأي صيغة أو يجي كلام مثل
   «قريباً». نحاول نفهمه، وإذا ما قدرنا نرجّع null ونخفي زر التقويم
   بدل ما نخمّن تاريخ غلط.                                        */
const AR_MONTHS = {
  "يناير":1,"كانون الثاني":1,"فبراير":2,"شباط":2,"مارس":3,"آذار":3,"اذار":3,
  "أبريل":4,"ابريل":4,"نيسان":4,"مايو":5,"أيار":5,"ايار":5,"يونيو":6,"حزيران":6,
  "يوليو":7,"تموز":7,"أغسطس":8,"اغسطس":8,"آب":8,"سبتمبر":9,"أيلول":9,"ايلول":9,
  "أكتوبر":10,"اكتوبر":10,"تشرين الأول":10,"نوفمبر":11,"تشرين الثاني":11,
  "ديسمبر":12,"كانون الأول":12
};
const EN_MONTHS = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};

export function parseEventDate(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;

  // 2026-06-11
  let m = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return mk(+m[1], +m[2], +m[3]);

  // 11/6/2026 أو 11-6-2026
  m = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return mk(+m[3], +m[2], +m[1]);

  // 11 June 2026  /  June 11, 2026
  const low = s.toLowerCase();
  for (const key in EN_MONTHS) {
    if (!low.includes(key)) continue;
    const nums = s.match(/\d+/g) || [];
    const day = nums.find(n => +n >= 1 && +n <= 31);
    const year = nums.find(n => n.length === 4);
    if (day && year) return mk(+year, EN_MONTHS[key], +day);
  }

  // ١١ يونيو ٢٠٢٦ (مع الأرقام العربية)
  const west = s.replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
                .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0));
  for (const key in AR_MONTHS) {
    if (!west.includes(key)) continue;
    const nums = west.match(/\d+/g) || [];
    const day = nums.find(n => +n >= 1 && +n <= 31);
    const year = nums.find(n => n.length === 4);
    if (day && year) return mk(+year, AR_MONTHS[key], +day);
  }
  return null;

  function mk(y, mo, d) {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dt = new Date(y, mo - 1, d);
    // نتأكد إن التاريخ موجود فعلاً (٣١ فبراير مثلاً ينزلق لمارس)
    return (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) ? dt : null;
  }
}

/* ───────── ملف تقويم لنشاط واحد ───────── */
const icsEsc = s => String(s == null ? "" : s)
  .replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// حد السطر في ICS ٧٥ بايت (مو ٧٥ حرف). الحرف العربي بايتين والإيموجي أربعة،
// فلازم نعدّ بايتات ونقطع عند حدود النقاط البرمجية — القطع بالحروف يكسّر
// الإيموجي لأنه زوج بديل في جافاسكربت.
const fold = line => {
  const enc = new TextEncoder();
  let out = "", cur = "", bytes = 0;
  for (const ch of line) {              // for...of يمشي بنقاط برمجية كاملة
    const n = enc.encode(ch).length;
    if (bytes + n > 73) { out += cur + "\r\n "; cur = ""; bytes = 0; }
    cur += ch; bytes += n;
  }
  return out + cur;
};
const stampUTC = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dayStamp = d => d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");

export function eventToICS(ev) {
  const d = parseEventDate(ev.date);
  if (!d) return null;
  const end = new Date(d); end.setDate(end.getDate() + 1);
  const L = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BSC KU//Events//AR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${(ev.id || Math.random().toString(36).slice(2))}@biosci-ku.com`,
    `DTSTAMP:${stampUTC(new Date())}`,
    // نشاط بيوم كامل — ما عندنا وقت دقيق من لوحة التحكم
    `DTSTART;VALUE=DATE:${dayStamp(d)}`,
    `DTEND;VALUE=DATE:${dayStamp(end)}`,
    fold(`SUMMARY:${icsEsc(ev.title || "نشاط نادي العلوم البيولوجية")}`),
    fold(`DESCRIPTION:${icsEsc((ev.description || "") + (ev.url ? "\n" + ev.url : "") + "\nنادي العلوم البيولوجية — biosci-ku.com")}`),
  ];
  if (ev.location) L.push(fold(`LOCATION:${icsEsc(ev.location)}`));
  L.push("BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY",
    fold(`DESCRIPTION:${icsEsc("باچر: " + (ev.title || "نشاط النادي"))}`), "END:VALARM",
    "END:VEVENT", "END:VCALENDAR");
  return L.join("\r\n") + "\r\n";
}

export function downloadEventICS(ev) {
  const text = eventToICS(ev);
  if (!text) return false;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  a.download = ((ev.title || "نشاط").replace(/[\\/:*?"<>|]/g, "").trim() || "نشاط") + ".ics";
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  return true;
}
window.bsckuAddToCalendar = downloadEventICS;
window.bsckuParseEventDate = parseEventDate;
// events.html يخفي أزرار «أضف للتقويم» لين توصل هالدوال، وبعدها يظهر
// بس الأزرار اللي تاريخها انفهم فعلاً
window.dispatchEvent(new CustomEvent("bscku:notify-ready"));

/* ───────── شريط داخل الصفحة ───────── */
function banner(items) {
  if (!items.length) return;
  const box = document.createElement("div");
  box.id = "bsckuNotifyBar";
  box.style.cssText = "position:fixed;inset-block-end:1rem;inset-inline-start:1rem;z-index:9998;max-width:340px;" +
    "background:rgba(15,16,26,.97);border:1px solid rgba(99,102,241,.45);border-radius:16px;padding:.9rem 1.1rem;" +
    "box-shadow:0 12px 40px rgba(0,0,0,.5);font-family:'Tajawal',sans-serif;color:#e6ebf7;backdrop-filter:blur(8px)";
  box.innerHTML =
    `<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">
       <span style="font-size:1.05rem">🔔</span>
       <b style="font-size:.9rem;color:#c7d2fe">${items.length === 1 ? "جديد في الموقع" : `${items.length} أشياء جديدة`}</b>
       <button id="bsckuNotifyX" aria-label="إغلاق" style="margin-inline-start:auto;background:none;border:0;color:#8b96b8;cursor:pointer;font-size:1.1rem;line-height:1">×</button>
     </div>` +
    items.slice(0, 4).map(i =>
      `<div style="font-size:.82rem;line-height:1.6;padding:.2rem 0">
         <span style="opacity:.7">${i.icon}</span> ${esc(i.title)}
       </div>`).join("") +
    `<a href="${items[0].page}" style="display:inline-block;margin-top:.6rem;font-size:.78rem;font-weight:700;color:#a5b4fc;text-decoration:none">شوفها ←</a>`;
  document.body.appendChild(box);
  document.getElementById("bsckuNotifyX").onclick = () => box.remove();
  setTimeout(() => { if (document.body.contains(box)) box.style.opacity = ".0", setTimeout(() => box.remove(), 400); }, 12000);
}

/* ───────── طلب الإذن (مرة وحدة، وبعد تفاعل المستخدم) ───────── */
function askOptIn() {
  if (localStorage.getItem(ASKED_KEY)) return;
  if (!("Notification" in window) || Notification.permission !== "default") return;

  const card = document.createElement("div");
  card.style.cssText = "position:fixed;inset-block-end:1rem;inset-inline-end:1rem;z-index:9998;max-width:320px;" +
    "background:rgba(15,16,26,.97);border:1px solid rgba(99,102,241,.45);border-radius:16px;padding:1rem 1.15rem;" +
    "box-shadow:0 12px 40px rgba(0,0,0,.5);font-family:'Tajawal',sans-serif;color:#e6ebf7;backdrop-filter:blur(8px)";
  card.innerHTML =
    `<b style="font-size:.9rem;color:#c7d2fe">🔔 تبي نخبرك بالجديد؟</b>
     <p style="font-size:.8rem;color:#8b96b8;line-height:1.7;margin:.45rem 0 .8rem">
       نعلمك بالأنشطة والإعلانات الجديدة أول ما تفتح الموقع.</p>
     <div style="display:flex;gap:.5rem">
       <button id="bsckuOptYes" style="flex:1;padding:.5rem;border-radius:10px;border:0;cursor:pointer;
         background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;font-size:.8rem;
         font-family:'Tajawal',sans-serif">أكيد</button>
       <button id="bsckuOptNo" style="flex:1;padding:.5rem;border-radius:10px;cursor:pointer;
         background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#8b96b8;font-weight:700;
         font-size:.8rem;font-family:'Tajawal',sans-serif">لا شكراً</button>
     </div>`;
  document.body.appendChild(card);
  const done = v => { localStorage.setItem(ASKED_KEY, "1"); localStorage.setItem(OPT_KEY, v); card.remove(); };
  document.getElementById("bsckuOptNo").onclick = () => done("off");
  document.getElementById("bsckuOptYes").onclick = async () => {
    done("on");
    try { await Notification.requestPermission(); } catch (e) {}
  };
}

/* ───────── الفحص عند فتح الموقع ───────── */
const SOURCES = [
  { col: "announcements", icon: "📢", page: "index.html" },
  { col: "events",        icon: "🎤", page: "events.html" },
  { col: "news",          icon: "📰", page: "services.html" },
];

async function check() {
  const [{ initializeApp, getApps, getApp }, { getFirestore, collection, getDocs }] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
  ]);
  const db = getFirestore(getApps().length ? getApp() : initializeApp(CFG));

  const seenRaw = localStorage.getItem(SEEN_KEY);
  const seen = seenRaw ? new Date(seenRaw) : null;

  const found = [];
  let newest = seen ? seen.getTime() : 0;

  for (const src of SOURCES) {
    let docs = [];
    try { docs = (await getDocs(collection(db, src.col))).docs; } catch (e) { continue; }
    docs.forEach(d => {
      const data = d.data() || {};
      const when = toDate(data.createdAt);
      if (!when) return;
      if (when.getTime() > newest) newest = when.getTime();
      if (seen && when > seen) {
        found.push({ icon: src.icon, page: src.page, title: data.title || "تحديث جديد" });
      }
    });
  }

  // أول زيارة: نسجّل النقطة الحالية بس، بدون ما نغرق الطالب بكل الأرشيف
  localStorage.setItem(SEEN_KEY, new Date(newest || Date.now()).toISOString());
  if (!seen || !found.length) return;

  found.sort((a, b) => a.title.localeCompare(b.title));
  banner(found);

  if (("Notification" in window) && Notification.permission === "granted" && localStorage.getItem(OPT_KEY) !== "off") {
    const body = found.slice(0, 3).map(f => f.icon + " " + f.title).join("\n");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const opts = { body, icon: "/favicon-192.png", badge: "/favicon.png", tag: "bscku-new", dir: "rtl", lang: "ar" };
      const title = found.length === 1 ? "جديد في نادي العلوم البيولوجية" : `${found.length} تحديثات جديدة`;
      if (reg && reg.showNotification) await reg.showNotification(title, opts);
      else new Notification(title, opts);
    } catch (e) { /* الإشعار كماليات — الشريط بالصفحة يكفي */ }
  }
}

// ما نزعج الطالب بطلب الإذن أول ثانية — ننتظر لين يتفاعل مع الصفحة
if (!localStorage.getItem(ASKED_KEY)) {
  const once = () => { askOptIn(); window.removeEventListener("scroll", once); window.removeEventListener("click", once); };
  window.addEventListener("scroll", once, { once: true, passive: true });
  window.addEventListener("click", once, { once: true });
}

check().catch(() => { /* التنبيهات ما توقف الموقع */ });
