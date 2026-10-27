// Petit serveur statique pour jouer en local : node tools/serve.js [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]) || 8080;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

http
  .createServer((req, res) => {
    const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const fichier = path.join(racine, chemin === '/' ? 'index.html' : chemin);
    if (!fichier.startsWith(racine)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(fichier, (err, data) => {
      if (err) {
        res.writeHead(404).end('Introuvable');
        return;
      }
      res.writeHead(200, { 'Content-Type': `${types[path.extname(fichier)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
      res.end(data);
    });
  })
  .listen(port, () => console.log(`Sous le Voile : http://localhost:${port}`));
