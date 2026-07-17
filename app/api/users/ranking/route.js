import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const url = new URL(request.url);
        const limitParam = url.searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam) : 100;
        
        const db = await getDb();
        
        const users = await db.prepare(`
            SELECT id, username, avatar_url, role, coalesce(yomi_points, 0) as yomi_points, created_at
            FROM users 
            ORDER BY yomi_points DESC, created_at ASC
            LIMIT ?
        `).all(limit);

        return NextResponse.json({ 
            success: true, 
            ranking: users 
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
