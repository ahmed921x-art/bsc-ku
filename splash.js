// BSC KU — Splash loading screen (logo + spinner)
// Shows once per browser session, on whichever page the visitor lands on first.
// Loaded synchronously in <head> so the overlay paints before any content.
(function () {
  try {
    if (sessionStorage.getItem('bscku_splash')) return;
    sessionStorage.setItem('bscku_splash', '1');
  } catch (e) { return; }

  var root = document.documentElement;
  var light = false;
  try { light = localStorage.getItem('bscku_theme') === 'light'; } catch (e) {}

  var css =
    'html.bsc-splash::before{content:"";position:fixed;inset:0;z-index:99998;' +
    'background:#04050a url("logo.png") no-repeat center calc(50% - 48px)/124px auto;' +
    'animation:bscSplashPulse 1.6s ease-in-out infinite;transition:opacity .5s ease}' +
    'html.bsc-splash::after{content:"";position:fixed;z-index:99999;' +
    'top:calc(50% + 56px);left:50%;width:38px;height:38px;margin:-19px 0 0 -19px;' +
    'border-radius:50%;border:3px solid rgba(129,140,248,.22);border-top-color:#818cf8;' +
    'animation:bscSplashSpin .8s linear infinite;transition:opacity .5s ease}' +
    'html.bsc-splash-light::before{background-color:#f8fafc}' +
    'html.bsc-splash-light::after{border-color:rgba(99,102,241,.18);border-top-color:#6366f1}' +
    'html.bsc-splash-hide::before,html.bsc-splash-hide::after{opacity:0}' +
    'html.bsc-splash{overflow:hidden}' +
    '@keyframes bscSplashSpin{to{transform:rotate(360deg)}}' +
    '@keyframes bscSplashPulse{0%,100%{background-size:124px auto}50%{background-size:132px auto}}';

  var style = document.createElement('style');
  style.textContent = css;
  (document.head || root).appendChild(style);

  root.classList.add('bsc-splash');
  if (light) root.classList.add('bsc-splash-light');

  var MIN_SHOW = 900, started = Date.now(), hidden = false;
  function hide() {
    if (hidden) return;
    hidden = true;
    var wait = Math.max(0, MIN_SHOW - (Date.now() - started));
    setTimeout(function () {
      root.classList.add('bsc-splash-hide');
      setTimeout(function () {
        root.classList.remove('bsc-splash', 'bsc-splash-hide', 'bsc-splash-light');
        if (style.parentNode) style.parentNode.removeChild(style);
      }, 550);
    }, wait);
  }

  if (document.readyState === 'complete') hide();
  else window.addEventListener('load', hide);
  setTimeout(hide, 5000); // failsafe: never trap the visitor on the splash
})();
