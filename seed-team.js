// ═══════════════════════════════════════════════════════
//  BSC KU — seed-team.js
//  شغّل هذا السكريبت مرة واحدة في Console المتصفح
//  وأنت على أي صفحة من الموقع عشان ترفع الأعضاء لـ Firebase
// ═══════════════════════════════════════════════════════
//
//  طريقة الاستخدام:
//  1. افتح biosci-ku.com في Chrome
//  2. افتح DevTools → Console
//  3. انسخ هذا الكود كله والصقه في Console
//  4. اضغط Enter
// ═══════════════════════════════════════════════════════

(async function seedTeam() {
  const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const { getFirestore, collection, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

  const app = getApps().length ? getApps()[0] : initializeApp({
    apiKey:"AIzaSyDGSTBOgSu4skvrEWUr2LcFLL_DDhTTZBE",
    authDomain:"bsc-ku.firebaseapp.com", projectId:"bsc-ku",
    storageBucket:"bsc-ku.firebasestorage.app",
    messagingSenderId:"326699795389",
    appId:"1:326699795389:web:94dcd1cb40be153987c8d4"
  });
  const db = getFirestore(app);

  const members = [
    // ── الهيئة الإدارية ──────────────────────────────
    { id:"m01", order:1,  name:"عبدالرحمن السالمي",  role:"رئيس النادي",            category:"board",    major:"كيمياء حيوية",    minor:"بيولوجيا الحيوان"   },
    { id:"m02", order:2,  name:"كيراز الدبس",         role:"نائب رئيس النادي",       category:"board",    major:"كيمياء حيوية",    minor:"بيولوجيا جزيئية"    },
    { id:"m03", order:3,  name:"عبدالله الأحمد",      role:"رئيس اللجنة الثقافية",  category:"board",    major:"بيولوجيا جزيئية", minor:""                    },
    { id:"m04", order:4,  name:"عيسى الكندري",        role:"رئيس اللجنة الإعلامية", category:"board",    major:"كيمياء حيوية",    minor:"علوم بحار"            },
    { id:"m05", order:5,  name:"سارة سليم",           role:"أمين السر",              category:"board",    major:"كيمياء حيوية",    minor:""                    },
    { id:"m06", order:6,  name:"بتول عوض",            role:"أمين الصندوق",           category:"board",    major:"كيمياء حيوية",    minor:""                    },
    // ── اللجنة الثقافية ─────────────────────────────
    { id:"m07", order:7,  name:"سامية جنادلة",        role:"عضو اللجنة الثقافية",   category:"academic", major:"بيولوجيا جزيئية", minor:""                    },
    { id:"m08", order:8,  name:"علياء العجمي",        role:"عضو اللجنة الثقافية",   category:"academic", major:"بيولوجيا جزيئية", minor:"بيولوجيا الحيوان"   },
    { id:"m09", order:9,  name:"شوق المطيري",         role:"عضو اللجنة الثقافية",   category:"academic", major:"ميكروبيولوجي",    minor:"Mass Communication"  },
    { id:"m10", order:10, name:"حنين العنزي",         role:"عضو اللجنة الثقافية",   category:"academic", major:"كيمياء حيوية",    minor:"تغذية"               },
    { id:"m11", order:11, name:"عبدالرحمن النجدي",    role:"عضو اللجنة الثقافية",   category:"academic", major:"ميكروبيولوجي",    minor:"علم اجتماع"          },
    { id:"m12", order:12, name:"مطيعة كاتبي",         role:"عضو اللجنة الثقافية",   category:"academic", major:"كيمياء حيوية",    minor:"تغذية"               },
    { id:"m13", order:13, name:"عبدالرحمن الجمل",     role:"عضو اللجنة الثقافية",   category:"academic", major:"كيمياء حيوية",    minor:"تغذية"               },
    { id:"m14", order:14, name:"عبدالله الشويع",      role:"عضو اللجنة الثقافية",   category:"academic", major:"ميكروبيولوجي",    minor:""                    },
    { id:"m15", order:15, name:"شهد الخالدي",         role:"عضو اللجنة الثقافية",   category:"academic", major:"ميكروبيولوجي",    minor:"بيولوجيا جزيئية"    },
    { id:"m16", order:16, name:"مؤنس منتاج",          role:"عضو اللجنة الثقافية",   category:"academic", major:"بيولوجيا جزيئية", minor:"ميكروبيولوجي"       },
    { id:"m17", order:17, name:"رؤى الشمري",          role:"عضو اللجنة الثقافية",   category:"academic", major:"ميكروبيولوجي",    minor:"تغذية"               },
    { id:"m18", order:18, name:"جنان قديح",           role:"عضو اللجنة الثقافية",   category:"academic", major:"بيولوجيا جزيئية", minor:""                    },
    { id:"m19", order:19, name:"زمزم إبراهيم",        role:"عضو اللجنة الثقافية",   category:"academic", major:"بيولوجيا جزيئية", minor:"علم نفس"             },
    { id:"m20", order:20, name:"فايزة العنزي",        role:"عضو اللجنة الثقافية",   category:"academic", major:"بيولوجيا جزيئية", minor:"ميكروبيولوجي"       },
    { id:"m21", order:21, name:"أحمد حسين",           role:"عضو اللجنة الثقافية",   category:"academic", major:"بيولوجيا جزيئية", minor:"علوم بحار"           },
    { id:"m22", order:22, name:"هاجر عبدالحميد",      role:"عضو اللجنة الثقافية",   category:"academic", major:"ميكروبيولوجي",    minor:"كيمياء حيوية"        },
    { id:"m23", order:23, name:"فاطمة عيسى",          role:"عضو اللجنة الثقافية",   category:"academic", major:"كيمياء حيوية",    minor:"تغذية"               },
    { id:"m24", order:24, name:"أنفال العنزي",        role:"عضو اللجنة الثقافية",   category:"academic", major:"بيولوجيا النبات", minor:""                    },
    { id:"m25", order:25, name:"لجين العوضي",         role:"عضو اللجنة الثقافية",   category:"academic", major:"بيولوجيا جزيئية", minor:"الإعلام"             },
    // ── اللجنة الإعلامية ────────────────────────────
    { id:"m26", order:26, name:"شوق الدخيل",          role:"عضو اللجنة الإعلامية",  category:"media",    major:"بيولوجيا الحيوان",minor:"علم آثار"            },
  ];

  let success = 0, failed = 0;
  for (const m of members) {
    try {
      const { id, ...data } = m;
      await setDoc(doc(collection(db, "teamMembers"), id), data);
      console.log(`✓ ${m.name}`);
      success++;
    } catch(e) {
      console.error(`✗ ${m.name}:`, e.message);
      failed++;
    }
  }
  console.log(`\n✅ رُفع ${success} عضو بنجاح${failed ? ` | ✗ فشل ${failed}` : ""}`);
})();
