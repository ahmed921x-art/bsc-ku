// سيرفر ثابت بسيط للتجربة المحلية — بدون أي حزم خارجية.
// Firebase ما يشتغل من file://، ويحتاج localhost (مصرّح له تلقائياً في Firebase).
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 5173;

const TYPES = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',   '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.svg':'image/svg+xml', '.ico':'image/x-icon', '.webp':'image/webp',
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const file = path.join(ROOT, rel);

  // ما نطلع برّا مجلد المشروع
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, {'Content-Type':'text/html; charset=utf-8'}).end('<h1>404</h1>'); return; }
    res.writeHead(200, {'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream'});
    res.end(data);
  });
}).listen(PORT, () => console.log(`BSC KU dev server → http://localhost:${PORT}`));
