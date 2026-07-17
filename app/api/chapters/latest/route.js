import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request) {
    try {
        const db = await getDb();
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit')) || 12;

        const chapters = await db.prepare(`
            SELECT ch.id, ch.chapter_number, ch.title, ch.created_at, ch.series_id,
                   s.title as series_title, s.cover_url
            FROM chapters ch
            JOIN series s ON ch.series_id = s.id
            WHERE s.published = 1
              AND (ch.publish_at IS NULL OR ch.publish_at <= datetime('now'))
            ORDER BY ch.created_at DESC
            LIMIT ?
        `).all(limit);

        return NextResponse.json({ chapters });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
