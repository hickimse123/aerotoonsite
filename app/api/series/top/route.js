import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'daily';

        let dateFilter = "'-1 day'"; // default daily
        if (period === 'weekly') dateFilter = "'-7 days'";
        else if (period === 'monthly') dateFilter = "'-30 days'";

        const db = await getDb();
        let series = [];

        if (period === 'all') {
            // Chapter count via JOIN — eliminates N+1
            series = await db.prepare(`
                SELECT s.*, COUNT(DISTINCT ch.id) as chapterCount
                FROM series s
                LEFT JOIN chapters ch ON s.id = ch.series_id
                WHERE s.published = 1
                GROUP BY s.id
                ORDER BY s.views DESC
                LIMIT 10
            `).all();
        } else {
            // Join with log table to count views in the given period + chapter count
            const query = `
                SELECT s.*,
                    COUNT(DISTINCT l.id) as period_views,
                    COUNT(DISTINCT ch.id) as chapterCount
                FROM series s
                LEFT JOIN series_views_log l ON s.id = l.series_id AND l.created_at >= datetime('now', ${dateFilter})
                LEFT JOIN chapters ch ON s.id = ch.series_id
                WHERE s.published = 1
                GROUP BY s.id
                ORDER BY period_views DESC, s.views DESC
                LIMIT 10
            `;
            series = await db.prepare(query).all();
        }

        const withParsedGenres = series.map(s => ({
            ...s,
            genres: JSON.parse(s.genres || '[]'),
        }));

        return NextResponse.json({ series: withParsedGenres });
    } catch (error) {
        console.error('Error fetching top series:', error);
        return NextResponse.json({ error: 'Failed to fetch top series' }, { status: 500 });
    }
}
