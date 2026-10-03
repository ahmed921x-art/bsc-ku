/* admin-extras.js — إضافات لوحة التحكم (admin.html)
   1) قسم «👥 فريق الإدارة»: المشرف العام يضيف أعضاء ويحدد صلاحياتهم
   2) قسم «📸 مشاركات المبدعين»: صور وروابط انستغرام/تيك توك
   يشتغل بعد ما admin.html يحدد دور المستخدم (window.BSC_ROLE). */
import { getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDocs, updateDoc, deleteDoc, query, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = getApp(), auth = getAuth(app), db = getFirestore(app);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const role = () => window.BSC_ROLE || null;
const can = p => { const r = role(); return !!r && (r.type === "super" || !!r.perms[p]); };
const isSuper = () => role()?.type === "super";

/* ───── أدوات مشتركة ───── */
function showPanel(id) {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.querySelector(`.nav-item[data-panel="${id}"]`)?.classList.add("active");
  $("panel-" + id)?.classList.add("active");
}
function addNav(id, html, afterPanel) {
  if (document.querySelector(`.nav-item[data-panel="${id}"]`)) return;
  const btn = document.createElement("button");
  btn.className = "nav-item"; btn.dataset.panel = id; btn.innerHTML = html;
  btn.onclick = () => { showPanel(id); if (id === "staffaccess") loadStaff(); if (id === "creators") loadCreators(); };
  const anchor = document.querySelector(`.nav-item[data-panel="${afterPanel}"]`);
  anchor ? anchor.after(btn) : document.querySelector(".sidebar")?.appendChild(btn);
}
function addPanel(id, html) {
  if ($("panel-" + id)) return;
  const d = document.createElement("div");
  d.className = "panel"; d.id = "panel-" + id; d.innerHTML = html;
  document.querySelector("main.admin-main")?.appendChild(d);
}
function injectStyle() {
  if ($("adminExtrasStyle")) return;
  const s = document.createElement("style"); s.id = "adminExtrasStyle";
  s.textContent = `
  .ax-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:.6rem;margin-top:.8rem}
  .ax-tw{display:flex;flex-direction:column;gap:.35rem}
  .ax-thumb{position:relative;border-radius:12px;overflow:hidden;aspect-ratio:1;background:rgba(255,255,255,.04)}
  .ax-thumb img{width:100%;height:100%;object-fit:cover;display:block}
  .ax-thumb button{position:absolute;top:4px;left:4px;width:24px;height:24px;border-radius:50%;border:0;background:rgba(0,0,0,.7);color:#fff;cursor:pointer;font-size:15px;line-height:1}
  .ax-thumb button:hover{background:#ef4444}
  .ax-cap{width:100%;font:inherit;font-size:.78rem;color:var(--text);background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:9px;padding:.35rem .55rem}
  .ax-drop{border:2px dashed rgba(99,102,241,.4);border-radius:16px;padding:1.4rem;text-align:center;cursor:pointer;color:var(--muted)}
  .ax-drop:hover{background:rgba(99,102,241,.08)}
  .ax-drop strong{display:block;color:#a5b4fc}
  .ax-row{display:flex;align-items:center;justify-content:space-between;gap:.6rem;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:12px;padding:.5rem .8rem;font-size:.85rem;margin-top:.5rem}
  .ax-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ax-row a{color:#6ee7b7;font-weight:700;font-size:.8rem}
  .ax-msg{font-size:.85rem;margin-top:.7rem;min-height:1.3em}
  .ax-msg.err{color:#fca5a5}.ax-msg.ok{color:#6ee7b7}
  .ax-two{display:grid;grid-template-columns:2fr 1fr;gap:.6rem}
  .ax-checks{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:.4rem}
  .ax-checks label{display:inline-flex;align-items:center;gap:.45rem;padding:.5rem .9rem;border:1px solid var(--border);border-radius:12px;cursor:pointer;font-size:.85rem;font-weight:700;color:var(--text);text-transform:none;letter-spacing:0}
  .ax-checks input{width:auto;accent-color:#6366f1}
  details.ax-add{margin-top:.9rem;border:1px dashed var(--border);border-radius:14px;padding:.6rem .9rem}
  details.ax-add summary{cursor:pointer;font-weight:800;font-size:.85rem;color:#6ee7b7}
  @media(max-width:640px){.ax-two{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
}

/* ═════════════ 1) فريق الإدارة ═════════════ */
const PRESETS = {
  publisher: { label: "ناشر مستجدات", publish: true,  content: false, members: false },
  content:   { label: "مشرف محتوى",   publish: true,  content: true,  members: false },
  members:   { label: "مسؤول أعضاء",  publish: false, content: false, members: true  },
  custom:    { label: "مخصص",         publish: false, content: false, members: false }
};
let staffList = [], editingEmail = null;

function buildStaffPanel() {
  addPanel("staffaccess", `
    <div class="panel-header"><h2>👥 فريق الإدارة</h2><p>أضف أعضاء يديرون الموقع وحدد وش يقدرون يسوون — أنت (المشرف العام) الوحيد اللي يشوف هذا القسم</p></div>
    <div class="card">
      <h3>➕ إضافة / تعديل عضو</h3>
      <div class="form-grid">
        <div class="form-group"><label>إيميل العضو (Google)</label><input id="stEmail" type="email" dir="ltr" placeholder="name@gmail.com"></div>
        <div class="form-group"><label>الاسم</label><input id="stName" placeholder="اسم العضو"></div>
        <div class="form-group"><label>نوع الصلاحية</label>
          <select id="stPreset">
            <option value="publisher">ناشر مستجدات (أخبار، إعلانات، أنشطة، مبدعين)</option>
            <option value="content">مشرف محتوى (النشر + المحتوى الدراسي)</option>
            <option value="members">مسؤول أعضاء (عائلة النادي، التقييم، الحضور)</option>
            <option value="custom">مخصص — أحدد بنفسي</option>
          </select>
        </div>
        <div class="form-group form-full"><label>الصلاحيات</label>
          <div class="ax-checks">
            <label><input type="checkbox" id="stPublish"> 📢 نشر المستجدات</label>
            <label><input type="checkbox" id="stContent"> 📚 المحتوى الدراسي</label>
            <label><input type="checkbox" id="stMembers"> 👥 إدارة الأعضاء</label>
            <label><input type="checkbox" id="stActive" checked> ✅ الحساب فعّال</label>
          </div>
        </div>
      </div>
      <p style="font-size:.8rem;color:var(--muted);margin-top:.6rem;line-height:1.9">
        📢 <b>نشر المستجدات:</b> الأخبار، الإعلانات، الأنشطة، مشاركات المبدعين.<br>
        📚 <b>المحتوى الدراسي:</b> النوتات، الميجرشيت، الجداول، دليل الطالب، المرشدون، مراجعة نوتات وشروحات الزوار.<br>
        👥 <b>إدارة الأعضاء:</b> عائلة النادي، أعضاء النادي، تقييم الفعاليات، الحضور.<br>
        🔒 <b>ما يقدر عليه أي عضو فريق:</b> طلبات العضوية، معدلات الطلبة، الأدمنز، المساعد الذكي، وإدارة هذا الفريق.
      </p>
      <div class="btn-row">
        <button class="btn btn-primary" id="stSave">💾 حفظ العضو</button>
        <button class="btn btn-ghost" id="stReset" type="button">مسح النموذج</button>
      </div>
      <div class="ax-msg" id="stMsg"></div>
    </div>
    <div class="card"><h3>أعضاء الفريق</h3><div class="items-list" id="stList"><p style="color:var(--muted)">جاري التحميل…</p></div></div>
    <p style="font-size:.8rem;color:var(--muted);line-height:1.9">
      ℹ️ العضو لازم يدخل لوحة الإدارة بزر <b>«تسجيل الدخول بـ Google»</b> بنفس الإيميل المسجل هنا.
      المشرفون العامون ثابتين في الكود وقواعد Firebase.
    </p>`);
  $("stPreset").onchange = () => { const p = PRESETS[$("stPreset").value]; if ($("stPreset").value !== "custom") { $("stPublish").checked = p.publish; $("stContent").checked = p.content; $("stMembers").checked = p.members; } };
  $("stPreset").onchange();
  $("stReset").onclick = resetStaffForm;
  $("stSave").onclick = saveStaff;
  $("stList").addEventListener("click", onStaffClick);
}
function resetStaffForm() {
  editingEmail = null; $("stEmail").value = ""; $("stEmail").disabled = false; $("stName").value = "";
  $("stPreset").value = "publisher"; $("stPreset").onchange(); $("stActive").checked = true; $("stMsg").textContent = "";
}
async function saveStaff() {
  const msg = $("stMsg"); msg.className = "ax-msg";
  const email = $("stEmail").value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.className = "ax-msg err"; msg.textContent = "اكتب إيميل صحيح."; return; }
  const data = { name: $("stName").value.trim(), email, roleLabel: PRESETS[$("stPreset").value].label,
    publish: $("stPublish").checked, content: $("stContent").checked, members: $("stMembers").checked,
    active: $("stActive").checked, updatedAt: serverTimestamp() };
  if (!data.publish && !data.content && !data.members) { msg.className = "ax-msg err"; msg.textContent = "اختر صلاحية وحدة على الأقل."; return; }
  if (!editingEmail) { data.createdAt = serverTimestamp(); data.addedBy = auth.currentUser?.email || ""; }
  $("stSave").disabled = true;
  try {
    await setDoc(doc(db, "staff", email), data, { merge: true });
    msg.className = "ax-msg ok"; msg.textContent = "✅ تم الحفظ.";
    resetStaffForm(); await loadStaff();
  } catch (e) { msg.className = "ax-msg err"; msg.textContent = "تعذّر الحفظ: " + (e.code || e.message) + " — تأكد إن قواعد Firestore المحدّثة منشورة."; }
  $("stSave").disabled = false;
}
async function loadStaff() {
  const box = $("stList"); if (!box) return;
  try {
    const s = await getDocs(collection(db, "staff"));
    staffList = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id), "ar"));
  } catch (e) { box.innerHTML = `<p style="color:#fca5a5">تعذّر التحميل: ${esc(e.code || e.message)}</p>`; return; }
  if (!staffList.length) { box.innerHTML = '<p style="color:var(--muted)">ما فيه أعضاء فريق للحين.</p>'; return; }
  box.innerHTML = staffList.map(m => `
    <div class="list-item">
      <div class="list-item-body">
        <h4>${esc(m.name || m.id)} ${m.active ? '<span class="badge badge-green">فعّال</span>' : '<span class="badge badge-red">موقوف</span>'}</h4>
        <p dir="ltr" style="text-align:right">${esc(m.id)}</p>
        <p style="margin-top:.3rem">${m.publish ? '<span class="badge badge-blue">📢 نشر</span> ' : ""}${m.content ? '<span class="badge badge-gold">📚 محتوى</span> ' : ""}${m.members ? '<span class="badge badge-green">👥 أعضاء</span>' : ""}</p>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-sm btn-ghost" data-edit="${esc(m.id)}">تعديل</button>
        <button class="btn btn-sm btn-ghost" data-toggle="${esc(m.id)}">${m.active ? "إيقاف" : "تفعيل"}</button>
        <button class="btn btn-sm btn-danger" data-del="${esc(m.id)}">حذف</button>
      </div>
    </div>`).join("");
}
async function onStaffClick(ev) {
  const t = ev.target.closest("button"); if (!t) return;
  const m = staffList.find(x => x.id === (t.dataset.edit || t.dataset.toggle || t.dataset.del)); if (!m) return;
  if (t.dataset.edit) {
    editingEmail = m.id; $("stEmail").value = m.id; $("stEmail").disabled = true; $("stName").value = m.name || "";
    $("stPreset").value = "custom"; $("stPublish").checked = !!m.publish; $("stContent").checked = !!m.content; $("stMembers").checked = !!m.members; $("stActive").checked = !!m.active;
    $("stEmail").scrollIntoView({ behavior: "smooth", block: "center" });
  } else if (t.dataset.toggle) {
    try { await updateDoc(doc(db, "staff", m.id), { active: !m.active, updatedAt: serverTimestamp() }); await loadStaff(); } catch (e) { alert("تعذّر التعديل: " + (e.code || e.message)); }
  } else if (t.dataset.del) {
    if (!confirm(`حذف ${m.name || m.id} من الفريق؟ ما يقدر يدخل اللوحة بعدها.`)) return;
    try { await deleteDoc(doc(db, "staff", m.id)); await loadStaff(); } catch (e) { alert("تعذّر الحذف: " + (e.code || e.message)); }
  }
}

/* ═════════════ 2) مشاركات المبدعين ═════════════ */
const COL = "creatorEvents";
let crPicked = [], crLinks = [], crEvents = [], crAddTarget = null;

function parseSocial(raw) {
  let u; try { u = new URL(String(raw).trim()); } catch { return { error: "الرابط غير صحيح." }; }
  const host = u.hostname.replace(/^www\./, "");
  if (host.endsWith("instagram.com")) {
    const m = u.pathname.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (!m) return { error: "لازم يكون رابط بوست أو ريلز (فيه /p/ أو /reel/). روابط الحسابات والستوري ما تنفع." };
    const kind = m[1] === "reels" ? "reel" : m[1];
    return { platform: "instagram", kind, id: m[2], url: `https://www.instagram.com/${kind}/${m[2]}/` };
  }
  if (host.endsWith("tiktok.com")) {
    const m = u.pathname.match(/\/video\/(\d+)/);
    if (!m) return { error: "رابط تيك توك لازم يكون الكامل (فيه /video/ ورقم). الروابط المختصرة مثل vm.tiktok.com افتحها بالمتصفح أول وانسخ الرابط اللي يطلع." };
    return { platform: "tiktok", id: m[1], url: u.origin + u.pathname };
  }
  return { error: "الرابط لازم يكون من انستغرام أو تيك توك." };
}
const platName = p => p === "instagram" ? "Instagram" : "TikTok";

async function compress(file) {
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    let b = await new Promise(r => c.toBlob(r, "image/webp", .82));
    if (!b || b.type !== "image/webp") b = await new Promise(r => c.toBlob(r, "image/jpeg", .85));
    return new File([b], "photo." + (b.type === "image/webp" ? "webp" : "jpg"), { type: b.type });
  } catch { return file; }
}
/* الرفع عبر نفس دالة ImgBB اللي تستخدمها اللوحة للجداول والأخبار */
async function uploadPhotos(items, onStep) {
  if (typeof window.bscUploadImg !== "function") throw new Error("دالة رفع الصور غير جاهزة — حدّث الصفحة.");
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const url = await window.bscUploadImg(await compress(items[i].file));
    out.push({ url, caption: (items[i].caption || "").trim() });
    onStep && onStep(i + 1, items.length);
  }
  return out;
}

function buildCreatorsPanel() {
  addPanel("creators", `
    <div class="panel-header"><h2>📸 مشاركات المبدعين</h2><p>أضف الفعالية ثم صور الجمهور أو روابط انستغرام/تيك توك — تظهر بصفحة المبدعين وآخر الصور بالرئيسية</p></div>
    <div class="card">
      <h3>➕ إضافة فعالية جديدة</h3>
      <div class="form-grid">
        <div class="form-group"><label>اسم الفعالية *</label><input id="crTitle" placeholder="مثال: يوم المهنة 2026"></div>
        <div class="form-group"><label>المصور / المصورين (اختياري)</label><input id="crCredit" placeholder="مثال: تصوير: عبدالله"></div>
        <div class="form-group form-full"><label>الصور</label>
          <div class="ax-drop" id="crDrop"><strong>اضغط لاختيار الصور</strong>أو اسحبها وفلتها (أكثر من صورة)</div>
          <input type="file" id="crFiles" accept="image/*" multiple hidden>
          <div class="ax-thumbs" id="crThumbs"></div>
          <p style="font-size:.78rem;color:var(--muted);margin-top:.4rem">تحت كل صورة خانة اختيارية لحساب صاحبها (@username) أو أي وصف. الصور تتصغّر تلقائيًا قبل الرفع.</p>
        </div>
        <div class="form-group form-full"><label>🔗 روابط انستغرام / تيك توك (اختياري)</label>
          <div class="ax-two"><input id="crLinkUrl" dir="ltr" placeholder="https://www.instagram.com/reel/…  أو  https://www.tiktok.com/@user/video/…"><input id="crLinkCap" placeholder="حساب/وصف (اختياري)"></div>
          <div class="btn-row" style="margin-top:.5rem"><button class="btn btn-sm btn-ghost" id="crAddLink" type="button">＋ إضافة الرابط</button></div>
          <div class="ax-msg" id="crLinkMsg"></div><div id="crPending"></div>
        </div>
      </div>
      <div class="btn-row"><button class="btn btn-primary" id="crPublish">نشر الفعالية</button></div>
      <div class="ax-msg" id="crMsg"></div>
    </div>
    <h3 style="font-size:1.05rem;margin:.5rem 0 1rem">الفعاليات المنشورة</h3>
    <div class="items-list" id="crList"><p style="color:var(--muted)">جاري التحميل…</p></div>
    <input type="file" id="crAddFiles" accept="image/*" multiple hidden>`);

  const drop = $("crDrop"), fin = $("crFiles");
  drop.onclick = () => fin.click();
  fin.onchange = () => { addPicked(fin.files); fin.value = ""; };
  ["dragover", "dragenter"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); }));
  drop.addEventListener("drop", e => { e.preventDefault(); addPicked(e.dataTransfer.files); });
  $("crThumbs").addEventListener("click", e => { const b = e.target.closest("[data-rm]"); if (b) { crPicked.splice(+b.dataset.rm, 1); renderPicked(); } });
  $("crThumbs").addEventListener("input", e => { const c = e.target.closest("[data-pc]"); if (c) crPicked[+c.dataset.pc].caption = c.value; });
  $("crAddLink").onclick = () => {
    const m = $("crLinkMsg"); m.className = "ax-msg"; m.textContent = "";
    const r = parseSocial($("crLinkUrl").value);
    if (r.error) { m.className = "ax-msg err"; m.textContent = r.error; return; }
    crLinks.push({ ...r, caption: $("crLinkCap").value.trim() }); $("crLinkUrl").value = ""; $("crLinkCap").value = ""; renderPending();
  };
  $("crPending").addEventListener("click", e => { const b = e.target.closest("[data-rl]"); if (b) { crLinks.splice(+b.dataset.rl, 1); renderPending(); } });
  $("crPublish").onclick = publishCreator;
  $("crList").addEventListener("click", onCreatorClick);
  $("crList").addEventListener("change", onCaptionChange);
  $("crAddFiles").onchange = addMorePhotos;
}
function addPicked(list) { crPicked.push(...[...list].filter(f => f.type.startsWith("image/")).map(file => ({ file, caption: "" }))); renderPicked(); }
function renderPicked() {
  $("crThumbs").innerHTML = crPicked.map((p, i) => `<div class="ax-tw"><div class="ax-thumb"><img src="${URL.createObjectURL(p.file)}" alt=""><button type="button" data-rm="${i}" aria-label="حذف">×</button></div><input class="ax-cap" data-pc="${i}" value="${esc(p.caption)}" placeholder="@حساب أو وصف"></div>`).join("");
}
function renderPending() {
  $("crPending").innerHTML = crLinks.map((l, i) => `<div class="ax-row"><span>${l.platform === "instagram" ? "📷" : "🎵"} ${platName(l.platform)}${l.caption ? " · " + esc(l.caption) : ""} — <bdi dir="ltr">${esc(l.url)}</bdi></span><button class="btn btn-sm btn-danger" type="button" data-rl="${i}">حذف</button></div>`).join("");
}
async function publishCreator() {
  const msg = $("crMsg"); msg.className = "ax-msg"; msg.textContent = "";
  const title = $("crTitle").value.trim();
  if (!title) { msg.className = "ax-msg err"; msg.textContent = "اكتب اسم الفعالية أول."; return; }
  if (!crPicked.length && !crLinks.length) { msg.className = "ax-msg err"; msg.textContent = "أضف صورة أو رابط واحد على الأقل."; return; }
  const btn = $("crPublish"); btn.disabled = true;
  try {
    msg.textContent = "جاري رفع الصور…";
    const photos = await uploadPhotos(crPicked, (n, t) => msg.textContent = `جاري رفع الصور… ${n}/${t}`);
    await addDoc(collection(db, COL), { title, credit: $("crCredit").value.trim(), photos, links: crLinks, createdAt: serverTimestamp() });
    msg.className = "ax-msg ok"; msg.textContent = "✅ تم النشر! تطلع الحين بصفحة المبدعين (والصور بالرئيسية).";
    $("crTitle").value = ""; $("crCredit").value = ""; crPicked = []; crLinks = []; renderPicked(); renderPending(); loadCreators();
  } catch (e) {
    msg.className = "ax-msg err";
    msg.textContent = (e.code === "permission-denied") ? "ما عندك صلاحية النشر — تأكد من قواعد Firebase وصلاحياتك." : "صار خطأ: " + (e.code || e.message);
  }
  btn.disabled = false;
}
async function loadCreators() {
  const box = $("crList"); if (!box) return;
  try {
    const s = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
    crEvents = s.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { box.innerHTML = `<p style="color:#fca5a5">تعذّر التحميل: ${esc(e.code || e.message)}</p>`; return; }
  if (!crEvents.length) { box.innerHTML = '<p style="color:var(--muted)">ما فيه فعاليات للحين.</p>'; return; }
  box.innerHTML = crEvents.map(e => `
    <div class="card" data-id="${e.id}">
      <h3 style="margin-bottom:.4rem">${esc(e.title)} <span class="badge badge-blue">${(e.photos || []).length} صورة · ${(e.links || []).length} رابط</span></h3>
      ${e.credit ? `<p style="font-size:.82rem;color:var(--muted)">${esc(e.credit)}</p>` : ""}
      <div class="ax-thumbs">${(e.photos || []).map((p, i) => `<div class="ax-tw"><div class="ax-thumb"><img src="${esc(p.url)}" loading="lazy" alt=""><button type="button" data-dp="${i}" aria-label="حذف">×</button></div><input class="ax-cap" data-cap="${i}" value="${esc(p.caption || "")}" placeholder="@حساب أو وصف"></div>`).join("")}</div>
      ${(e.links || []).map((l, i) => `<div class="ax-row"><span>${l.platform === "instagram" ? "📷" : "🎵"} ${platName(l.platform)}${l.caption ? " · " + esc(l.caption) : ""}</span><a href="${esc(l.url)}" target="_blank" rel="noopener">فتح</a><button class="btn btn-sm btn-danger" type="button" data-dl="${i}">حذف</button></div>`).join("")}
      <details class="ax-add"><summary>＋ إضافة رابط انستغرام / تيك توك</summary>
        <div class="ax-two" style="margin-top:.6rem"><input class="l-url" dir="ltr" placeholder="رابط البوست أو الفيديو" style="padding:.6rem;background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:10px;color:var(--text)"><input class="l-cap" placeholder="حساب/وصف (اختياري)" style="padding:.6rem;background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:10px;color:var(--text)"></div>
        <div class="btn-row" style="margin-top:.5rem"><button class="btn btn-sm btn-ghost" type="button" data-al>إضافة</button></div>
      </details>
      <div class="btn-row"><button class="btn btn-sm btn-ghost" data-ap>＋ إضافة صور</button><button class="btn btn-sm btn-danger" data-de>حذف الفعالية</button></div>
      <div class="ax-msg"></div>
    </div>`).join("");
}
async function onCreatorClick(ev) {
  const card = ev.target.closest(".card[data-id]"); if (!card) return;
  const e = crEvents.find(x => x.id === card.dataset.id), msg = card.querySelector(".ax-msg");
  const fail = (er, t) => { msg.className = "ax-msg err"; msg.textContent = t + (er.code || er.message); };
  if (ev.target.closest("[data-ap]")) { crAddTarget = e; $("crAddFiles").click(); return; }
  if (ev.target.closest("[data-al]")) {
    const r = parseSocial(card.querySelector(".l-url").value);
    if (r.error) { msg.className = "ax-msg err"; msg.textContent = r.error; return; }
    try { await updateDoc(doc(db, COL, e.id), { links: [...(e.links || []), { ...r, caption: card.querySelector(".l-cap").value.trim() }] }); loadCreators(); } catch (er) { fail(er, "تعذّر الإضافة: "); }
    return;
  }
  const dl = ev.target.closest("[data-dl]");
  if (dl) { if (!confirm("حذف هذا الرابط؟")) return; try { await updateDoc(doc(db, COL, e.id), { links: (e.links || []).filter((_, k) => k !== +dl.dataset.dl) }); loadCreators(); } catch (er) { fail(er, "تعذّر الحذف: "); } return; }
  const dp = ev.target.closest("[data-dp]");
  if (dp) { if (!confirm("حذف هذي الصورة من الموقع؟")) return; try { await updateDoc(doc(db, COL, e.id), { photos: e.photos.filter((_, k) => k !== +dp.dataset.dp) }); loadCreators(); } catch (er) { fail(er, "تعذّر الحذف: "); } return; }
  if (ev.target.closest("[data-de]")) {
    if (!confirm(`حذف فعالية «${e.title}» مع كل صورها وروابطها؟`)) return;
    try { await deleteDoc(doc(db, COL, e.id)); loadCreators(); } catch (er) { fail(er, "تعذّر الحذف: "); }
  }
}
async function onCaptionChange(ev) {
  const c = ev.target.closest("input[data-cap]"); if (!c) return;
  const card = c.closest(".card[data-id]"), e = crEvents.find(x => x.id === card.dataset.id), msg = card.querySelector(".ax-msg");
  const photos = e.photos.map((p, k) => k === +c.dataset.cap ? { ...p, caption: c.value.trim() } : p);
  try { await updateDoc(doc(db, COL, e.id), { photos }); e.photos = photos; msg.className = "ax-msg ok"; msg.textContent = "✅ تم حفظ الوصف"; }
  catch (er) { msg.className = "ax-msg err"; msg.textContent = "تعذّر الحفظ: " + (er.code || er.message); }
}
async function addMorePhotos() {
  const files = [...$("crAddFiles").files].filter(f => f.type.startsWith("image/")).map(file => ({ file, caption: "" })); $("crAddFiles").value = "";
  if (!crAddTarget || !files.length) return;
  const e = crAddTarget, card = document.querySelector(`#crList .card[data-id="${e.id}"]`), msg = card.querySelector(".ax-msg");
  msg.className = "ax-msg"; msg.textContent = "جاري الرفع…";
  try {
    const added = await uploadPhotos(files, (n, t) => msg.textContent = `جاري الرفع… ${n}/${t}`);
    await updateDoc(doc(db, COL, e.id), { photos: [...(e.photos || []), ...added] }); loadCreators();
  } catch (er) { msg.className = "ax-msg err"; msg.textContent = "تعذّر الرفع: " + (er.code || er.message); }
}

/* ═════════════ التشغيل ═════════════ */
let started = false;
function start() {
  if (started || !role()) return;
  started = true; injectStyle();
  if (can("publish")) { buildCreatorsPanel(); addNav("creators", '<span class="ni">📸</span>مشاركات المبدعين', "events"); }
  if (isSuper()) { buildStaffPanel(); addNav("staffaccess", '<span class="ni">👥</span>فريق الإدارة', "admins"); }
}
window.addEventListener("bsc-role", start);
start();
