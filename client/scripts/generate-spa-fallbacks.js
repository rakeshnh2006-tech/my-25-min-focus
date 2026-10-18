import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');
const indexPath = path.join(distDir, 'index.html');

if (fs.existsSync(indexPath)) {
  const routes = [
    'landing',
    'login',
    'dashboard',
    'timer',
    'tasks',
    'subjects',
    'analytics',
    'history',
    'settings',
  ];
  const indexContent = fs.readFileSync(indexPath, 'utf8');

  for (const route of routes) {
    const routeDir = path.join(distDir, route);
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }
    fs.writeFileSync(path.join(routeDir, 'index.html'), indexContent);
  }

  // Also write 200.html and 404.html for static CDN fallbacks
  fs.writeFileSync(path.join(distDir, '200.html'), indexContent);
  fs.writeFileSync(path.join(distDir, '404.html'), indexContent);
  console.log('[SPA] Generated physical route fallbacks for:', routes.join(', '));
}
