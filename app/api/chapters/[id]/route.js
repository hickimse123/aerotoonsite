import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

function getViewerHash(request) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
    const ua = request.headers.get('user-agent') || '';
    return crypto.createHash('sha256').update(`${ip}:${ua}`).digest('hex').slice(0, 32);
}

export async function GET(request, { params }) {
    try {
        const { id } = await params;

        const db = await getDb();

        const chapter = await db.prepare('SELECT * FROM chapters WHERE id = ?').get(id);
        if (!chapter) {
            return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
        }

        // Zamanlı bölüm henüz yayınlanmadıysa okuyuculara gösterme
        // Tarihe 'Z' eklenerek UTC olarak yorumlanması sağlanıyor
        if (chapter.publish_at) {
            const publishStr = String(chapter.publish_at).trim();
            // ISO veya SQLite space-separated formatta UTC string'e çevir
            const publishDate = new Date(publishStr.includes('T') ? publishStr : publishStr.replace(' ', 'T') + 'Z');
            if (!isNaN(publishDate.getTime()) && publishDate > new Date()) {
                return NextResponse.json({ error: 'Bu bölüm henüz yayınlanmadı', scheduled: true }, { status: 403 });
            }
        }

        // Record chapter view
        const viewerHash = getViewerHash(request);
        const recentView = await db.prepare(`
            SELECT id FROM chapter_views_log
            WHERE chapter_id = ? AND viewer_hash = ? AND created_at >= datetime('now', '-1 hour')
            LIMIT 1
        `).get(id, viewerHash);

        if (!recentView) {
            await db.prepare('UPDATE chapters SET views = coalesce(views, 0) + 1 WHERE id = ?').run(id);
            await db.prepare('INSERT INTO chapter_views_log (chapter_id, viewer_hash) VALUES (?, ?)').run(id, viewerHash);
        }

        const series = await db.prepare('SELECT * FROM series WHERE id = ?').get(chapter.series_id);
        if (!series) {
            return NextResponse.json({ error: 'Series not found' }, { status: 404 });
        }

        const pages = await db.prepare(
            'SELECT * FROM pages WHERE chapter_id = ? ORDER BY page_number ASC'
        ).all(id);

        // Map pages with display_image field
        const pagesWithDisplay = pages.map(p => ({ ...p, display_image: p.image_path }));

        // Get prev/next chapters
        const prevChapter = await db.prepare(
            "SELECT id, chapter_number FROM chapters WHERE series_id = ? AND chapter_number < ? AND (publish_at IS NULL OR publish_at <= datetime('now')) ORDER BY chapter_number DESC LIMIT 1"
        ).get(chapter.series_id, chapter.chapter_number);

        const nextChapter = await db.prepare(
            "SELECT id, chapter_number FROM chapters WHERE series_id = ? AND chapter_number > ? AND (publish_at IS NULL OR publish_at <= datetime('now')) ORDER BY chapter_number ASC LIMIT 1"
        ).get(chapter.series_id, chapter.chapter_number);

        return NextResponse.json({
            chapter,
            series: { ...series, genres: JSON.parse(series.genres || '[]') },
            pages: pagesWithDisplay,
            prevChapter: prevChapter || null,
            nextChapter: nextChapter || null,
        });
    } catch (error) {
        console.error('GET /api/chapters/[id] error:', error);
        return NextResponse.json({ error: 'Failed to fetch chapter' }, { status: 500 });
    }
}
