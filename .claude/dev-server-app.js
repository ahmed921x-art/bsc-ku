// سيرفر تجربة محتوى التطبيق (www/) — نفس فكرة dev-server.js بس جذره www/.
// يخلينا نجرب شكل التطبيق بالمتصفح قبل ما نبنيه على الجهاز.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'www');
const PORT = 5174;

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

  if (!file.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, {'Content-Type':'text/html; charset=utf-8'}).end('<h1>404</h1>'); return; }
    res.writeHead(200, {'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream'});
    res.end(data);
  });
}).listen(PORT, () => console.log(`BSC KU app preview → http://localhost:${PORT}`));
