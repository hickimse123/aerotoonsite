import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const db = await getDb();
        
        // Get up to 5 published series (ordered by rating and views)
        const seriesList = await db.prepare(`
            SELECT s.*, COUNT(ch.id) as chapterCount
            FROM series s
            LEFT JOIN chapters ch ON s.id = ch.series_id
            WHERE s.published = 1
            GROUP BY s.id
            ORDER BY s.rating DESC, s.views DESC
            LIMIT 5
        `).all();
        
        if (seriesList.length === 0) {
             return NextResponse.json({ series: [] });
        }

        const finalSeriesList = seriesList.map(s => ({
            ...s,
            genres: JSON.parse(s.genres || '[]'),
        }));

        return NextResponse.json({ series: finalSeriesList });
    } catch (error) {
        console.error('Error fetching editor pick:', error);
        return NextResponse.json({ error: 'Failed to fetch editor pick' }, { status: 500 });
    }
}
