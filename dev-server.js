const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 8124);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.cjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const normalized = url === '/' ? '/index.html' : url;
  const filePath = path.normalize(path.join(root, normalized));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Canvas Replay Components demo: http://127.0.0.1:${port}`);
});
