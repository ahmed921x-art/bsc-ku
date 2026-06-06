import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const _cfg = {apiKey:"AIzaSyDGSTBOgSu4skvrEWUr2LcFLL_DDhTTZBE",authDomain:"bsc-ku.firebaseapp.com",projectId:"bsc-ku",storageBucket:"bsc-ku.firebasestorage.app",messagingSenderId:"326699795389",appId:"1:326699795389:web:94dcd1cb40be153987c8d4"};
const _app = getApps().find(a=>a.name==="[DEFAULT]") || initializeApp(_cfg);
const _db = getFirestore(_app);

(async()=>{
  try {
    const snap = await getDocs(query(collection(_db,"announcements"), orderBy("createdAt","desc"), limit(5)));
    const urgentDoc = snap.docs.find(d => d.data().type === "urgent");
    if(!urgentDoc) return;
    const ann = urgentDoc.data();
    if(document.getElementById("_urgentAnnBar")) return;
    const bar = document.createElement("div");
    bar.id = "_urgentAnnBar";
    bar.style.cssText = "position:relative;z-index:10001;padding:.6rem 5%;background:linear-gradient(135deg,#dc2626,#b91c1c);display:flex;align-items:center;justify-content:center;gap:.75rem";
    const driveBtn = ann.driveUrl
      ? `<a href="${ann.driveUrl}" target="_blank" style="flex-shrink:0;padding:.25rem .75rem;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);border-radius:999px;font-size:.75rem;font-weight:700;color:#fff;text-decoration:none;white-space:nowrap">📁 فتح</a>`
      : "";
    bar.innerHTML = `
      <span style="font-size:.82rem;font-weight:700;color:#fff;text-align:center;line-height:1.5">🚨 ${ann.title||""}${ann.content ? " — " + ann.content : ""}</span>
      ${driveBtn}
      <button onclick="document.getElementById('_urgentAnnBar').remove()" style="position:absolute;left:1rem;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.2);border:none;color:#fff;cursor:pointer;font-size:1rem;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:1">×</button>`;
    const topBanner = document.getElementById("topBanner");
    if(topBanner) topBanner.parentNode.insertBefore(bar, topBanner);
    else document.body.prepend(bar);
  } catch(e){}
})();
