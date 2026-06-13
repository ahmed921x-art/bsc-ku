// عدّاد زيارات بسيط — يزيد +1 لكل جلسة تصفّح (مو لكل صفحة).
// يخزّن الإجمالي في siteStats/total وزيارات اليوم في dailyVisits/{YYYY-MM-DD}.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const cfg = {
  apiKey: "AIzaSyDGSTBOgSu4skvrEWUr2LcFLL_DDhTTZBE",
  authDomain: "bsc-ku.firebaseapp.com",
  projectId: "bsc-ku",
  storageBucket: "bsc-ku.firebasestorage.app",
  messagingSenderId: "326699795389",
  appId: "1:326699795389:web:94dcd1cb40be153987c8d4"
};
const app = getApps().length ? getApp() : initializeApp(cfg);
const db = getFirestore(app);

(async () => {
  try {
    // زيارة وحدة لكل جلسة تصفّح، عشان التنقّل بين الصفحات ما يضخّم العدّاد.
    if (sessionStorage.getItem("bscku_visit")) return;
    sessionStorage.setItem("bscku_visit", "1");
    const d = new Date();
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    await setDoc(doc(db, "siteStats", "total"), { count: increment(1) }, { merge: true });
    await setDoc(doc(db, "dailyVisits", day), { count: increment(1) }, { merge: true });
  } catch (e) { /* صامت — ما نوقف الموقع لو فشل العدّاد */ }
})();
