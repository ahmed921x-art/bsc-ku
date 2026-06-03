// ════════════════════════════════════════════════════════════════
//  BSC KU — Cloudflare Worker لإخفاء مفتاح Gemini + حماية من الاستغلال
//
//  هذا الملف للنشر في Cloudflare (مو جزء من الموقع نفسه):
//  Cloudflare Dashboard → Workers → افتح gemini-proxy → Edit Code
//  والصق هذا المحتوى، ثم Deploy.
//
//  الإعداد المطلوب مرة واحدة:
//  - Settings → Variables → أضف Secret باسم GEMINI_KEY = مفتاح Gemini
//  - (اختياري للحد من الطلبات) أنشئ KV namespace واربطه باسم RL
//
//  التحسينات مقابل النسخة الحالية:
//  1) يقبل الطلبات فقط من biosci-ku.com (Origin allowlist) → يمنع
//     المواقع الأخرى من استهلاك حصتك المجانية.
//  2) يحد عدد الطلبات لكل IP (rate limit) إذا فعّلت KV.
//  3) يقبل POST فقط ويردّ CORS بشكل صحيح.
// ════════════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = [
  'https://biosci-ku.com',
  'https://www.biosci-ku.com',
  'http://localhost',
  'http://127.0.0.1',
];

const RATE_LIMIT = 30;          // أقصى عدد طلبات
const RATE_WINDOW = 60;         // خلال كم ثانية (60 = دقيقة)

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    // طلب CORS المبدئي
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // POST فقط
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: cors });
    }

    // تحقق من المصدر
    if (!ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
      return new Response(JSON.stringify({ error: 'Forbidden origin' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // حد الطلبات لكل IP (يعمل فقط لو ربطت KV باسم RL)
    if (env.RL) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const key = `rl:${ip}`;
      const count = parseInt((await env.RL.get(key)) || '0', 10);
      if (count >= RATE_LIMIT) {
        return new Response(JSON.stringify({ error: 'Too many requests' }), {
          status: 429, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      await env.RL.put(key, String(count + 1), { expirationTtl: RATE_WINDOW });
    }

    // اسم الموديل من الـ query (مع قيمة افتراضية آمنة)
    const url = new URL(request.url);
    const model = (url.searchParams.get('model') || 'gemini-1.5-flash')
      .replace(/[^a-zA-Z0-9.\-]/g, '');

    const body = await request.text();

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_KEY}`;

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
