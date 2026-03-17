import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());

// Load SITE_URL: process.env (Vercel 등 CI) 우선, 없으면 .env 파일
function loadSiteUrl() {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.trim().replace(/^["']|["']$/g, '');
  }
  try {
    const env = readFileSync(resolve(root, '.env'), 'utf-8');
    for (const line of env.split('\n')) {
      const match = line.match(/^SITE_URL=(.+)$/);
      if (match) {
        return match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch {}
  return 'https://musecore.app';
}

let siteUrl = loadSiteUrl();
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
