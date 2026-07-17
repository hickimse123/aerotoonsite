import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser } from '@/lib/auth';

// POST: { itemId } — Yomi Puanı karşılığında mağaza öğesi satın al
export async function POST(request) {
    try {
        const db = await getDb();
        const auth = await getVerifiedUser(request, db);
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const { itemId } = await request.json();
        if (!itemId) return NextResponse.json({ error: 'itemId gerekli' }, { status: 400 });

        const item = await db.prepare('SELECT * FROM shop_items WHERE id = ? AND is_active = 1').get(itemId);
        if (!item) return NextResponse.json({ error: 'Öğe bulunamadı veya artık satışta değil' }, { status: 404 });

        const already = await db.prepare('SELECT id FROM user_purchases WHERE user_id = ? AND item_id = ?').get(auth.user.id, itemId);
        if (already) return NextResponse.json({ error: 'Bu öğeye zaten sahipsiniz' }, { status: 400 });

        const freshUser = await db.prepare('SELECT yomi_points FROM users WHERE id = ?').get(auth.user.id);
        if ((freshUser?.yomi_points || 0) < item.price) {
            return NextResponse.json({ error: 'Yetersiz puan' }, { status: 400 });
        }

        await db.prepare('UPDATE users SET yomi_points = yomi_points - ? WHERE id = ?').run(item.price, auth.user.id);
        await db.prepare('INSERT INTO user_purchases (user_id, item_id) VALUES (?, ?)').run(auth.user.id, itemId);

        const updated = await db.prepare('SELECT yomi_points FROM users WHERE id = ?').get(auth.user.id);

        return NextResponse.json({
            success: true,
            message: `"${item.name}" satın alındı!`,
            item,
            remainingPoints: updated.yomi_points,
        });
    } catch (err) {
        console.error('shop/purchase POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
