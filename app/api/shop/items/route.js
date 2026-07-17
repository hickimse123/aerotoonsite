import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getActiveShopItems } from '@/lib/shop';

// GET: herkese açık — satışta olan tüm mağaza öğeleri
export async function GET() {
    try {
        const db = await getDb();
        const items = await getActiveShopItems(db);
        return NextResponse.json({ success: true, items });
    } catch (err) {
        console.error('shop/items GET error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
