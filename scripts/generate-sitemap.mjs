import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());

// Load SITE_URL from .env
function loadEnv() {
  try {
    const env = readFileSync(resolve(root, '.env'), 'utf-8');
    let siteUrl = 'https://www.musecore.app';
    for (const line of env.split('\n')) {
      const match = line.match(/^SITE_URL=(.+)$/);
      if (match) {
        siteUrl = match[1].trim().replace(/^["']|["']$/g, '');
        break;
      }
    }
    return siteUrl;
  } catch {
    return 'https://www.musecore.app';
  }
}

let siteUrl = loadEnv();
if (!siteUrl.endsWith('/')) {
  siteUrl = siteUrl + '/';
}

const routes = [
  '',
  'about',
  'audio-analyzer',
  'contact',
  'mastering',
  'metronome',
  'official-audio',
  'privacy',
  'terms',
  'tuner',
];

const today = new Date().toISOString().split('T')[0];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (path) => `  <url>
    <loc>${siteUrl}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${path === '' ? '1.0' : '0.8'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

writeFileSync(resolve(root, 'public/sitemap.xml'), sitemap);
console.log('[sitemap] Generated:', siteUrl + 'sitemap.xml');

// robots.txt
const baseUrl = siteUrl.replace(/\/$/, '');
const robots = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;
writeFileSync(resolve(root, 'public/robots.txt'), robots);
console.log('[sitemap] Updated robots.txt');
