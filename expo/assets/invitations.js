/* Shared by the invitation and its link creator. Names stay in the shared URL. */
(function () {
  'use strict';
  const clean = (value, limit) => String(value || '').replace(/[\u0000-\u001f\u007f‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim().slice(0, limit);
  const recipient = clean(new URLSearchParams(location.search).get('to'), 80);
  const personalMessage = clean(new URLSearchParams(location.search).get('message'), 240);
  const defaultMessage = 'يسرّ نادي العلوم البيولوجية ومكتب التوجيه والإرشاد بكلية العلوم دعوتك إلى Science Expo — جناح الأحياء والعلوم البيئية. حضورك يكمّل الحكاية.';
  const title = recipient ? `دعوة إلى ${recipient} | Science Expo` : 'دعوتك إلى Science Expo | BSC KU';
  const toast = document.getElementById('toast');
  let toastTimeout;
  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3200);
  }
  async function copy(text, field) {
    try {
      await navigator.clipboard.writeText(text);
      notify('تم نسخ رابط الدعوة');
    } catch (_) {
      if (field) { field.focus(); field.select(); }
      notify('حدّد الرابط وانسخه من الخانة');
    }
  }
  const personalCard = document.getElementById('personalCard');
  if (personalCard && recipient) {
    document.getElementById('recipientName').textContent = recipient;
    document.getElementById('personalMessage').textContent = personalMessage || defaultMessage;
    personalCard.hidden = false;
    document.title = title;
    document.querySelector('.hero-desc').textContent = 'نلتقي يومي الثلاثاء والأربعاء ٣–٤ نوفمبر، من ١٠ الصبح لين ٢ الظهر، في كلية العلوم · الجنوبي. نتطلّع إلى حضورك.';
  }
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) shareBtn.addEventListener('click', async () => {
    const data = { title, text: `${recipient ? `${recipient}، هذه دعوتك إلى ` : 'دعوتك إلى '}Science Expo 🦴 ٣–٤ نوفمبر، ١٠ الصبح لين ٢ الظهر، كلية العلوم · الجنوبي — جامعة الكويت.`, url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else await copy(data.url);
    } catch (error) {
      if (error.name !== 'AbortError') await copy(data.url);
    }
  });
  const form = document.getElementById('inviteForm');
  if (!form) return;
  const nameInput = document.getElementById('name');
  const messageInput = document.getElementById('message');
  const result = document.getElementById('result');
  const linkField = document.getElementById('inviteLink');
  const generalURL = new URL('./', location.href).href;
  document.getElementById('generalLink').href = generalURL;
  function refresh() {
    nameInput.setCustomValidity('');
    const name = clean(nameInput.value, 80);
    if (!name) { result.hidden = true; return; }
    const message = clean(messageInput.value, 240);
    const url = new URL(generalURL);
    url.searchParams.set('to', name);
    if (message) url.searchParams.set('message', message);
    linkField.value = url.href;
    document.getElementById('previewName').textContent = name;
    document.getElementById('previewMessage').textContent = message || defaultMessage;
    document.getElementById('previewLink').href = url.href;
    document.getElementById('whatsappLink').href = 'https://wa.me/?text=' + encodeURIComponent(`${name}، يسرّنا دعوتك إلى Science Expo 🦴\n${url.href}`);
    result.hidden = false;
  }
  form.addEventListener('input', refresh);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!clean(nameInput.value, 80)) { nameInput.setCustomValidity('اكتب اسم الشخص أولًا'); nameInput.reportValidity(); return; }
    refresh();
    result.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  });
  document.getElementById('copyLink').addEventListener('click', () => copy(linkField.value, linkField));
  document.getElementById('copyGeneral').addEventListener('click', () => copy(generalURL));
  refresh();
})();
