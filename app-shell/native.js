/* ════════════════════════════════════════════════════════════════
   BSC KU — الجسر مع النظام (أندرويد / iOS)

   كل شي هنا يشتغل فقط داخل التطبيق. على المتصفح Capacitor مو موجود
   فالملف يخرج بهدوء، وصفحات الموقع تشتغل عادي بدون أي تأثير.

   نستخدم window.Capacitor.Plugins مباشرة بدل import — الموقع صفحات
   HTML ثابتة بدون أداة تجميع (bundler)، والجسر الأصلي يوفّر الإضافات
   على هذا الكائن بدون ما نحتاج نبني شي.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const Cap = window.Capacitor;
  if (!Cap || !Cap.isNativePlatform || !Cap.isNativePlatform()) return;

  const P = Cap.Plugins || {};
  const platform = Cap.getPlatform ? Cap.getPlatform() : 'unknown';
  document.documentElement.classList.add('is-native', 'is-' + platform);

  const safe = (fn) => { try { const r = fn(); if (r && r.catch) r.catch(() => {}); } catch (e) {} };

  /* ── شريط الحالة ──────────────────────────────────────────────── */
  /* الواجهة داكنة، فنبي أيقونات الشبكة والبطارية بيضاء.
     في Capacitor الأسلوب Dark يعني «محتوى داكن» = أيقونات سوداء،
     فالمطلوب هنا Light. */
  if (P.StatusBar) {
    safe(() => P.StatusBar.setStyle({ style: 'LIGHT' }));
    if (platform === 'android') {
      safe(() => P.StatusBar.setBackgroundColor({ color: '#0b0b14' }));
      safe(() => P.StatusBar.setOverlaysWebView({ overlay: false }));
    }
  }

  /* ── شاشة البداية ─────────────────────────────────────────────── */
  /* نخفيها بأيدينا بعد ما تجهز الصفحة فعلاً، بدل مدة ثابتة تخلي
     المستخدم يشوف صفحة نص جاهزة أو ينتظر بدون داعي. */
  if (P.SplashScreen) {
    const hide = () => safe(() => P.SplashScreen.hide());
    if (document.readyState === 'complete') setTimeout(hide, 180);
    else window.addEventListener('load', () => setTimeout(hide, 180));
    setTimeout(hide, 4000);   // أمان: ما نخلي الشاشة عالقة أبداً
  }

  /* ── لوحة المفاتيح ────────────────────────────────────────────── */
  /* نرفع الشريط السفلي وقت الكتابة عشان ما يغطي الحقل، ونضيف صنف
     نقدر نخفي فيه عناصر تزحم الشاشة الصغيرة. */
  if (P.Keyboard) {
    safe(() => P.Keyboard.setAccessoryBarVisible({ isVisible: true }));
    window.addEventListener('keyboardWillShow', (e) => {
      document.body.classList.add('keyboard-open');
      const h = (e && e.keyboardHeight) || 0;
      document.documentElement.style.setProperty('--kb', h + 'px');
    });
    window.addEventListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
      document.documentElement.style.setProperty('--kb', '0px');
    });
  }

  /* ── زر الرجوع في أندرويد ─────────────────────────────────────── */
  /* بدون هذا، زر الرجوع يطلّع المستخدم من التطبيق مباشرة من أي صفحة. */
  if (P.App) {
    P.App.addListener('backButton', ({ canGoBack }) => {
      const sheet = document.querySelector('.more-sheet.open');
      if (sheet) { window.closeMoreSheet && window.closeMoreSheet(); return; }

      const page = location.pathname.split('/').pop() || 'index.html';
      if (page === 'index.html') { safe(() => P.App.exitApp()); return; }
      if (canGoBack) history.back();
      else location.href = 'index.html';
    });

    /* رجوع للتطبيق بعد ما كان بالخلفية: نحدّث المحتوى الحي */
    P.App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) window.dispatchEvent(new CustomEvent('app:resumed'));
    });
  }

  /* ── الروابط الخارجية ─────────────────────────────────────────── */
  /* نفتحها بمتصفح داخل التطبيق: المستخدم يرجع بضغطة وحدة بدل ما
     يطلع لمتصفح ثاني ويضيع منه التطبيق. */
  if (P.Browser) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="http"]');
      if (!a) return;
      const url = a.getAttribute('href');
      if (!url || url.startsWith(location.origin)) return;
      e.preventDefault();
      safe(() => P.Browser.open({ url, presentationStyle: 'popover' }));
    }, true);
  }

  /* ── حالة الشبكة ──────────────────────────────────────────────── */
  /* الشريط نفسه ينبني في app-nav.js عشان يشتغل بالمتصفح كمان؛
     هنا نغذّيه من إضافة Network لأنها أدق من navigator.onLine
     داخل WebView (تفرّق بين «الواي فاي موصول» و«فيه إنترنت فعلاً»). */
  if (P.Network) {
    const render = (connected) => {
      window.appSetOnline && window.appSetOnline(connected);
      if (connected) window.dispatchEvent(new CustomEvent('app:online'));
    };
    safe(() => P.Network.getStatus().then(s => render(s.connected)));
    P.Network.addListener('networkStatusChange', s => render(s.connected));
  }

  /* ── المشاركة ─────────────────────────────────────────────────── */
  /* نستبدل مشاركة المتصفح بمشاركة النظام الأصلية لما تكون متاحة. */
  if (P.Share) {
    window.appShare = (opts) => safe(() => P.Share.share({
      title: opts.title || 'BSC KU',
      text: opts.text || '',
      url: opts.url || 'https://biosci-ku.com',
      dialogTitle: 'مشاركة',
    }));
  }

  /* ── الإشعارات ────────────────────────────────────────────────── */
  /* لا نلمس هذي الإضافة إلا إذا كان Firebase مهيّأ فعلاً.
     السبب: register() ينادي FirebaseMessaging.getInstance() في الطبقة
     الأصلية، وبدون google-services.json يرمي
     "Default FirebaseApp is not initialized" ويسقط التطبيق كامل عند
     كل تشغيل — انهيار أصلي ما يمسكه try/catch من جافاسكربت.

     window.BSCKU_PUSH يجي من app-config.js اللي يولّده سكربت البناء
     حسب وجود الملف. ضِف الملف وأعد البناء → تشتغل تلقائياً. */
  if (P.PushNotifications && window.BSCKU_PUSH === true) {
    const saveToken = async (token) => {
      try {
        const [{ initializeApp, getApps, getApp }, { getFirestore, doc, setDoc, serverTimestamp },
               { getAuth, signInAnonymously, onAuthStateChanged }] = await Promise.all([
          import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
          import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
          import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
        ]);
        const CFG = {
          apiKey: "AIzaSyDGSTBOgSu4skvrEWUr2LcFLL_DDhTTZBE",
          authDomain: "bsc-ku.firebaseapp.com",
          projectId: "bsc-ku",
          storageBucket: "bsc-ku.firebasestorage.app",
          messagingSenderId: "326699795389",
          appId: "1:326699795389:web:94dcd1cb40be153987c8d4"
        };
        const app = getApps().length ? getApp() : initializeApp(CFG);
        const auth = getAuth(app);
        const uid = await new Promise((res) => {
          onAuthStateChanged(auth, u => u ? res(u.uid) : signInAnonymously(auth).then(c => res(c.user.uid)).catch(() => res(null)));
        });
        if (!uid) return;
        await setDoc(doc(getFirestore(app), 'deviceTokens', uid), {
          token, platform, updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) { /* التسجيل يفشل بهدوء — الإشعارات مو شرط لعمل التطبيق */ }
    };

    P.PushNotifications.addListener('registration', ({ value }) => saveToken(value));
    P.PushNotifications.addListener('registrationError', () => {});

    /* إشعار وصل والتطبيق مفتوح: نعرضه كشريط داخل الصفحة بدل ما يضيع */
    P.PushNotifications.addListener('pushNotificationReceived', (n) => {
      const t = (n.title || '') + (n.body ? ' — ' + n.body : '');
      if (!t.trim()) return;
      const el = document.createElement('div');
      el.className = 'push-toast';
      el.textContent = t;
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 5200);
    });

    /* ضغط على الإشعار: نوديه للصفحة المقصودة لو الإشعار حدّدها */
    P.PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
      const target = a?.notification?.data?.page;
      if (target && /^[a-z0-9_-]+\.html$/i.test(target)) location.href = target;
    });

    safe(async () => {
      let perm = await P.PushNotifications.checkPermissions();
      if (perm.receive === 'prompt') perm = await P.PushNotifications.requestPermissions();
      if (perm.receive === 'granted') await P.PushNotifications.register();
    });
  }
})();
