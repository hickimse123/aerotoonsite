import { getDb } from '@/lib/db';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://yomitranslate.com';

function escapeXml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export async function GET() {
    try {
        const db = await getDb();

        // All published series with their latest chapter date + title for image SEO
        const series = await db.prepare(`
            SELECT s.id, s.slug, s.title, s.cover_url, s.description,
                   MAX(ch.created_at) as latest_chapter_at,
                   s.created_at
            FROM series s
            LEFT JOIN chapters ch ON ch.series_id = s.id
            WHERE s.published = 1
            GROUP BY s.id
            ORDER BY s.id DESC
        `).all();

        // All published chapters for SEO-friendly URLs
        const chapters = await db.prepare(`
            SELECT ch.chapter_number, ch.created_at,
                   s.slug as series_slug, s.title as series_title
            FROM chapters ch
            JOIN series s ON s.id = ch.series_id
            WHERE s.published = 1
            ORDER BY ch.created_at DESC
        `).all();

        // Static pages
        const staticPages = [
            { url: '/', changefreq: 'daily', priority: '1.0' },
            { url: '/series', changefreq: 'daily', priority: '0.9' },
            { url: '/ranking', changefreq: 'daily', priority: '0.7' },
            { url: '/requests', changefreq: 'weekly', priority: '0.5' },
            { url: '/privacy', changefreq: 'monthly', priority: '0.3' },
            { url: '/terms', changefreq: 'monthly', priority: '0.3' },
        ];

        const now = new Date().toISOString().split('T')[0];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

        // Static pages
        for (const page of staticPages) {
            xml += `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
        }

        // Series pages (with image tag for Google Image Search)
        for (const s of series) {
            const slug = s.slug || s.id;
            const lastmod = s.latest_chapter_at
                ? new Date(s.latest_chapter_at).toISOString().split('T')[0]
                : (s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : now);

            const coverAbs = s.cover_url
                ? (s.cover_url.startsWith('http') ? s.cover_url : `${BASE_URL}${s.cover_url}`)
                : null;

            // Short caption for Google Images
            const caption = s.description
                ? s.description.slice(0, 100).replace(/\s+$/, '') + (s.description.length > 100 ? '…' : '')
                : `Read ${s.title} manga online with AI translation on YomiTranslate.`;

            xml += `  <url>
    <loc>${BASE_URL}/series/${escapeXml(slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>`;

            if (coverAbs) {
                xml += `
    <image:image>
      <image:loc>${escapeXml(coverAbs)}</image:loc>
      <image:title>${escapeXml(s.title)}</image:title>
      <image:caption>${escapeXml(caption)}</image:caption>
    </image:image>`;
            }

            xml += `
  </url>
`;
        }

        // Chapter pages
        for (const ch of chapters) {
            const slug = ch.series_slug;
            if (!slug) continue;
            const lastmod = ch.created_at ? new Date(ch.created_at).toISOString().split('T')[0] : now;
            xml += `  <url>
    <loc>${BASE_URL}/seri/${escapeXml(slug)}/bolum/${ch.chapter_number}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
        }

        xml += `</urlset>`;

        return new Response(xml, {
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error) {
        console.error('Sitemap generation error:', error);
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE_URL}/</loc><priority>1.0</priority></url>
  <url><loc>${BASE_URL}/series</loc><priority>0.9</priority></url>
</urlset>`;
        return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
    }
}
