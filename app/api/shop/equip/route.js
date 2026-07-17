import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser } from '@/lib/auth';
import { isValidShopType } from '@/lib/shop';

const COLUMN_BY_TYPE = {
    badge: 'equipped_badge_id',
    frame: 'equipped_frame_id',
    title: 'equipped_title_id',
};

// POST: { type: 'badge'|'frame'|'title', itemId: number|null }
// itemId=null → o türden kuşanılan öğeyi çıkar
export async function POST(request) {
    try {
        const db = await getDb();
        const auth = await getVerifiedUser(request, db);
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const { type, itemId } = await request.json();
        if (!isValidShopType(type)) return NextResponse.json({ error: 'Geçersiz tür' }, { status: 400 });

        const column = COLUMN_BY_TYPE[type];

        if (itemId === null || itemId === undefined) {
            await db.prepare(`UPDATE users SET ${column} = NULL WHERE id = ?`).run(auth.user.id);
            return NextResponse.json({ success: true, message: 'Kaldırıldı' });
        }

        const owned = await db.prepare(
            'SELECT si.* FROM user_purchases up JOIN shop_items si ON si.id = up.item_id WHERE up.user_id = ? AND up.item_id = ?'
        ).get(auth.user.id, itemId);
        if (!owned) return NextResponse.json({ error: 'Bu öğeye sahip değilsiniz' }, { status: 403 });
        if (owned.type !== type) return NextResponse.json({ error: 'Tür uyuşmuyor' }, { status: 400 });

        await db.prepare(`UPDATE users SET ${column} = ? WHERE id = ?`).run(itemId, auth.user.id);

        return NextResponse.json({ success: true, message: `"${owned.name}" kuşanıldı` });
    } catch (err) {
        console.error('shop/equip POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
