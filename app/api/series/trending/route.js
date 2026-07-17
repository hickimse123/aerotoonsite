import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Revalidate every 5 minutes — trending doesn't need to be real-time
export const revalidate = 300;

export async function GET(request) {
    try {
        const db = await getDb();

        // Chapter count included via subquery — eliminates N+1
        const query = `
            SELECT s.*,
                COUNT(DISTINCT l.id) as recent_views,
                COUNT(DISTINCT ch.id) as chapterCount
            FROM series s
            LEFT JOIN series_views_log l ON s.id = l.series_id AND l.created_at >= datetime('now', '-3 days')
            LEFT JOIN chapters ch ON s.id = ch.series_id
            WHERE s.published = 1
            GROUP BY s.id
            ORDER BY recent_views DESC, s.views DESC
            LIMIT 10
        `;
        const series = await db.prepare(query).all();

        const withParsedGenres = series.map(s => ({
            ...s,
            genres: JSON.parse(s.genres || '[]'),
        }));

        // Performans: Cache header eklendi
        return NextResponse.json(
            { series: withParsedGenres },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
                }
            }
        );
    } catch (error) {
        console.error('Error fetching trending series:', error);
        return NextResponse.json({ error: 'Failed to fetch trending series' }, { status: 500 });
    }
}
