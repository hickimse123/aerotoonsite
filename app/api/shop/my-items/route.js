import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser } from '@/lib/auth';

// GET: kullanıcının satın aldığı öğeler + o an kuşandıkları
export async function GET(request) {
    try {
        const db = await getDb();
        const auth = await getVerifiedUser(request, db);
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const owned = await db.prepare(`
            SELECT si.* FROM user_purchases up
            JOIN shop_items si ON si.id = up.item_id
            WHERE up.user_id = ?
            ORDER BY si.type, si.sort_order ASC, si.id ASC
        `).all(auth.user.id);

        const equippedRow = await db.prepare(
            'SELECT equipped_frame_id, equipped_title_id, equipped_badge_id FROM users WHERE id = ?'
        ).get(auth.user.id);

        return NextResponse.json({
            success: true,
            owned,
            equipped: {
                frame_id: equippedRow?.equipped_frame_id || null,
                title_id: equippedRow?.equipped_title_id || null,
                badge_id: equippedRow?.equipped_badge_id || null,
            },
        });
    } catch (err) {
        console.error('shop/my-items GET error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
