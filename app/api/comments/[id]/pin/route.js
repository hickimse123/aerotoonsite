import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest, hasPermission } from '@/lib/auth';

export async function PUT(request, { params }) {
    try {
        const user = getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
        }
        const db = await getDb();
        const builtinCanPin = user.role === 'admin' || user.role === 'manager';
        const customCanPin = await hasPermission(user, 'manage_comments', db);
        if (!builtinCanPin && !customCanPin) {
            return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
        }

        const { id } = await params;

        const comment = await db.prepare('SELECT is_pinned FROM comments WHERE id = ?').get(id);
        if (!comment) {
            return NextResponse.json({ error: 'Yorum bulunamadı.' }, { status: 404 });
        }

        const newPinState = comment.is_pinned ? 0 : 1;
        await db.prepare('UPDATE comments SET is_pinned = ? WHERE id = ?').run(newPinState, id);

        return NextResponse.json({ success: true, is_pinned: newPinState });
    } catch (error) {
        console.error('PUT /api/comments/[id]/pin error:', error);
        return NextResponse.json({ error: 'İşlem başarısız oldu.' }, { status: 500 });
    }
}
