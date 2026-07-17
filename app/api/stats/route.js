import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
    try {
        const db = await getDb();
        const row = await db.prepare(`
            SELECT
                (SELECT COUNT(*) FROM series WHERE published = 1) as series,
                (SELECT COUNT(*) FROM chapters) as chapters,
                (SELECT COUNT(*) FROM users) as users
        `).get();

        return NextResponse.json({
            series: row.series || 0,
            chapters: row.chapters || 0,
            users: row.users || 0,
        }, {
            headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
        });
    } catch {
        return NextResponse.json({ series: 0, chapters: 0, users: 0 });
    }
}