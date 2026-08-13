// ════════════════════════════════════════════════════════════════
//  BSC KU — حساب الطالب ومزامنة بياناته
//
//  الفكرة: كل زائر يدخل «مجهول» تلقائياً من أول ثانية، فياخذ معرّف
//  ثابت (uid) بدون أي واجهة ولا إزعاج. هذا وحده يخلي قواعد الأمان
//  محكمة لكل الطلبة — كل واحد يوصل لمستنده هو بس (وعليه تعتمد كمان
//  طلبات العضوية وحاسبة المعدل).
//
//  ما فيه واجهة تسجيل دخول بجوجل بعد — انشالت بالكامل من الموقع.
//  بقايا منطق الحسابات المربوطة (state.linked) موجودة بس عشان أي
//  حساب اترابط قبل هالتغيير يستمر يتزامن بصمت، بدون أي زر جديد.
//
//  ⚠️ يحتاج تفعيل الدخول المجهول في Firebase Console:
//     Authentication → Sign-in method → فعّل Anonymous.
// ════════════════════════════════════════════════════════════════

const CFG = {
  apiKey: "AIzaSyDGSTBOgSu4skvrEWUr2LcFLL_DDhTTZBE",
  authDomain: "bsc-ku.firebaseapp.com",
  projectId: "bsc-ku",
  storageBucket: "bsc-ku.firebasestorage.app",
  messagingSenderId: "326699795389",
  appId: "1:326699795389:web:94dcd1cb40be153987c8d4"
};

/* ───────── الأقسام اللي نزامنها ─────────
   كل قسم يعرف كيف يقرأ نفسه من localStorage وكيف يرجع إليه.   */
const SECTIONS = {
  planner: {
    read:  () => safeParse(localStorage.getItem("bscku_planner_v1")),
    write: v => localStorage.setItem("bscku_planner_v1", JSON.stringify(v)),
  },
  gpa: {
    read:  () => safeParse(localStorage.getItem("bscku_gpa_v2")),
    write: v => localStorage.setItem("bscku_gpa_v2", JSON.stringify(v)),
  },
  major: {
    read:  () => localStorage.getItem("bscku_major") || null,
    write: v => { if (v) localStorage.setItem("bscku_major", v); },
  },
  // تقدّم التخرج منتشر على عدة مفاتيح (bscku_grad_x و bscku_done_x_y)
  // فنجمّعها كلها في كائن واحد.
  grad: {
    read: () => {
      const o = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("bscku_grad_") || k.startsWith("bscku_done_"))) {
          const v = safeParse(localStorage.getItem(k));
          if (Array.isArray(v)) o[k] = v;
        }
      }
      return Object.keys(o).length ? o : null;
    },
    write: v => { if (v) Object.entries(v).forEach(([k, arr]) => {
      if (k.startsWith("bscku_grad_") || k.startsWith("bscku_done_")) // ما نكتب مفاتيح غريبة
        localStorage.setItem(k, JSON.stringify(arr));
    }); },
  },
};

const TS_KEY = "bscku_sync_ts";           // آخر تعديل محلي لكل قسم
const SIG_KEY = "bscku_sync_sig";         // بصمة آخر حالة شفناها
const MIGRATED_KEY = "bscku_gpa_migrated";

const safeParse = s => { try { return JSON.parse(s); } catch (e) { return null; } };

const loadTs  = () => safeParse(localStorage.getItem(TS_KEY)) || {};
const saveTs  = t => localStorage.setItem(TS_KEY, JSON.stringify(t));
const loadSig = () => safeParse(localStorage.getItem(SIG_KEY)) || {};
const saveSig = s => localStorage.setItem(SIG_KEY, JSON.stringify(s));
const sigOf   = v => v == null ? "" : JSON.stringify(v);

let fb = null;     // { app, auth, db, mods… }
let state = { user: null, linked: false };

async function boot() {
  const [appMod, authMod, dbMod] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
  ]);
  const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(CFG);
  fb = {
    app,
    auth: authMod.getAuth(app),
    db: dbMod.getFirestore(app),
    ...authMod, ...dbMod,
  };

  fb.onAuthStateChanged(fb.auth, async user => {
    if (!user) {
      // كل زائر ياخذ هوية مجهولة — بدون هذا ما نقدر نقفل قواعد الأمان
      try { await fb.signInAnonymously(fb.auth); } catch (e) { console.warn("anon sign-in:", e); }
      return;
    }
    state.user = user;
    state.linked = user.providerData && user.providerData.length > 0;
    try { await syncNow("signin"); } catch (e) { console.warn("sync:", e); }
    watchLocal();
  });
}

/* ═══════════ المزامنة ═══════════ */
const docRef = () => fb.doc(fb.db, "students", state.user.uid);
let syncing = false, pending = false;

async function syncNow(reason) {
  if (!fb || !state.user) return;
  if (syncing) { pending = true; return; }
  syncing = true;
  try {
    const snap = await fb.getDoc(docRef());
    const remote = snap.exists() ? (snap.data() || {}) : null;
    const localTs = loadTs();
    const remoteTs = (remote && remote.sections) || {};
    const push = {}, pushTs = {};
    let changedLocally = false;

    for (const name in SECTIONS) {
      const local = SECTIONS[name].read();
      const lt = +localTs[name] || 0;
      const rt = +remoteTs[name] || 0;

      if (remote && rt > lt && remote[name] != null) {
        // النسخة السحابية أحدث → ننزّلها
        SECTIONS[name].write(remote[name]);
        localTs[name] = rt;
        changedLocally = true;
      } else if (local != null && (lt > rt || !remote)) {
        push[name] = local;
        pushTs[name] = lt || Date.now();
      }
    }

    // ترحيل بيانات الحاسبة القديمة المربوطة بالجهاز (قبل الحسابات)
    if (!localStorage.getItem(MIGRATED_KEY) && (!remote || remote.gpa == null) && push.gpa == null) {
      const old = await migrateOldGpa();
      if (old) { push.gpa = old; pushTs.gpa = Date.now(); SECTIONS.gpa.write(old); changedLocally = true; }
      localStorage.setItem(MIGRATED_KEY, "1");
    }

    // ما ننشئ مستند لكل زائر مجهول — بس أول ما يصير عنده بيانات فعلية.
    // بدون هالشرط كل زيارة تخلق مستند فاضي وتحرق حصة الكتابة.
    if (Object.keys(push).length) {
      const payload = { ...push, updatedAt: fb.serverTimestamp() };
      payload.sections = { ...remoteTs, ...pushTs };
      if (state.linked) payload.profile = profileOf(state.user);
      await fb.setDoc(docRef(), payload, { merge: true });
      Object.assign(localTs, pushTs);
    } else if (state.linked && remote && !remote.profile) {
      await fb.setDoc(docRef(), { profile: profileOf(state.user) }, { merge: true });
    }

    saveTs(localTs);
    snapshotSig();
    if (changedLocally && reason === "signin") {
      // الصفحة مرسومة أصلاً ببيانات قديمة — أسهل وأأمن إننا نعيد تحميلها
      note("نزّلنا بياناتك المحفوظة — نحدّث الصفحة…");
      setTimeout(() => location.reload(), 1200);
    }
  } finally {
    syncing = false;
    if (pending) { pending = false; syncNow("pending"); }
  }
}

const profileOf = u => ({
  name: u.displayName || "", email: u.email || "", photo: u.photoURL || "",
});

// الحاسبة كانت تحفظ تحت معرّف جهاز عشوائي قبل ما نضيف الحسابات
async function migrateOldGpa() {
  const id = localStorage.getItem("bscku_cloud_id");
  if (!id) return null;
  try {
    const s = await fb.getDoc(fb.doc(fb.db, "gpaData", id));
    if (s.exists() && s.data() && Array.isArray(s.data().semesters)) return { semesters: s.data().semesters };
  } catch (e) {}
  return null;
}

/* نراقب التغيّرات المحلية بالبصمة بدل ما نعدّل كل مكان يكتب في
   localStorage — أبسط وما يكسر أي كود قائم. */
function snapshotSig() {
  const sig = {};
  for (const n in SECTIONS) sig[n] = sigOf(SECTIONS[n].read());
  saveSig(sig);
}
function detectLocalChanges() {
  const old = loadSig(), ts = loadTs();
  let dirty = false;
  for (const n in SECTIONS) {
    const cur = sigOf(SECTIONS[n].read());
    if (cur !== (old[n] || "")) { ts[n] = Date.now(); dirty = true; }
  }
  if (dirty) { saveTs(ts); snapshotSig(); }
  return dirty;
}
let watchTimer = null;
function watchLocal() {
  if (watchTimer) return;
  watchTimer = setInterval(() => { if (detectLocalChanges()) syncNow("local"); }, 5000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && detectLocalChanges()) syncNow("hide");
  });
}

function note(text) {
  let n = document.getElementById("bsckuAcctNote");
  if (!n) {
    n = document.createElement("div");
    n.id = "bsckuAcctNote";
    n.style.cssText = "position:fixed;inset-block-end:1.25rem;inset-inline-end:1.25rem;z-index:9999;padding:.6rem 1.1rem;" +
      "border-radius:999px;font-size:.8rem;font-weight:700;font-family:'Tajawal',sans-serif;" +
      "background:rgba(16,185,129,.16);border:1px solid rgba(16,185,129,.4);color:#6ee7b7;" +
      "transition:opacity .4s;pointer-events:none";
    document.body.appendChild(n);
  }
  n.textContent = text; n.style.opacity = "1";
  setTimeout(() => { n.style.opacity = "0"; }, 3200);
}

boot().catch(e => console.warn("account:", e));
