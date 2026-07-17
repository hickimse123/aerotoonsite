import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser, hasAdminPanelAccess } from '@/lib/auth';

export async function GET(request) {
    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user } = result;
        if (!await hasAdminPanelAccess(user, db)) {
            return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = 50;
        const offset = (page - 1) * limit;

        const logs = await db.prepare(`
            SELECT al.*, u.avatar_url
            FROM admin_logs al
            LEFT JOIN users u ON al.admin_id = u.id
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `).all(limit, offset);

        const total = await (db.prepare('SELECT COUNT(*) as cnt FROM admin_logs').get())?.cnt || 0;

        return NextResponse.json({ success: true, logs, total, page, limit });
    } catch (error) {
        console.error('Audit log GET error:', error);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}