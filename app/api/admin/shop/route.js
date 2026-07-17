import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser, hasAdminPanelAccess } from '@/lib/auth';
import { getAllShopItems, isValidShopType, unequipItemFromAllUsers } from '@/lib/shop';

async function requireAdmin(request, db) {
    const result = await getVerifiedUser(request, db);
    if (result.error) return { error: result.error, status: result.status };
    if (!await hasAdminPanelAccess(result.user, db)) return { error: 'Yetkisiz', status: 403 };
    return { user: result.user };
}

async function logAction(db, user, action, details) {
    try {
        await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)')
            .run(user.id, user.username, action, details);
    } catch {}
}

// GET: tüm mağaza öğelerini listele (aktif + pasif) — admin panel
export async function GET(request) {
    try {
        const db = await getDb();
        const auth = await requireAdmin(request, db);
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const items = await getAllShopItems(db);
        return NextResponse.json({ success: true, items });
    } catch (err) {
        console.error('admin/shop GET error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}

// POST: yeni mağaza öğesi oluştur
// Body: { type: 'badge'|'frame'|'title', name, price, image_url?, title_color? }
export async function POST(request) {
    try {
        const db = await getDb();
        const auth = await requireAdmin(request, db);
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const body = await request.json();
        const { type, name, price, image_url, title_color } = body;

        if (!isValidShopType(type)) {
            return NextResponse.json({ error: 'Geçersiz öğe türü' }, { status: 400 });
        }
        if (!name?.trim()) {
            return NextResponse.json({ error: 'İsim gerekli' }, { status: 400 });
        }
        const priceNum = Number(price);
        if (!Number.isFinite(priceNum) || priceNum < 0) {
            return NextResponse.json({ error: 'Geçersiz fiyat' }, { status: 400 });
        }
        if ((type === 'badge' || type === 'frame') && !image_url?.trim()) {
            return NextResponse.json({ error: 'Bu tür için görsel gerekli' }, { status: 400 });
        }

        const result = await db.prepare(
            'INSERT INTO shop_items (type, name, image_url, title_color, price, is_active) VALUES (?, ?, ?, ?, ?, 1)'
        ).run(type, name.trim(), image_url?.trim() || null, title_color?.trim() || null, Math.round(priceNum));

        await logAction(db, auth.user, 'shop_item_create', `${type}: ${name.trim()} (${priceNum} puan)`);

        const item = await db.prepare('SELECT * FROM shop_items WHERE id = ?').get(result.lastInsertRowid);
        return NextResponse.json({ success: true, message: `"${name.trim()}" mağazaya eklendi`, item });
    } catch (err) {
        console.error('admin/shop POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}

// PUT: mevcut öğeyi güncelle
// Body: { id, name?, price?, image_url?, title_color?, is_active?, sort_order? }
export async function PUT(request) {
    try {
        const db = await getDb();
        const auth = await requireAdmin(request, db);
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const body = await request.json();
        const { id } = body;
        if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 });

        const existing = await db.prepare('SELECT * FROM shop_items WHERE id = ?').get(id);
        if (!existing) return NextResponse.json({ error: 'Öğe bulunamadı' }, { status: 404 });

        const name = body.name !== undefined ? String(body.name).trim() : existing.name;
        const price = body.price !== undefined ? Math.round(Number(body.price)) : existing.price;
        const image_url = body.image_url !== undefined ? (String(body.image_url).trim() || null) : existing.image_url;
        const title_color = body.title_color !== undefined ? (String(body.title_color).trim() || null) : existing.title_color;
        const is_active = body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active;
        const sort_order = body.sort_order !== undefined ? Math.round(Number(body.sort_order)) : existing.sort_order;

        if (!name) return NextResponse.json({ error: 'İsim boş olamaz' }, { status: 400 });
        if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: 'Geçersiz fiyat' }, { status: 400 });

        await db.prepare(
            'UPDATE shop_items SET name = ?, price = ?, image_url = ?, title_color = ?, is_active = ?, sort_order = ? WHERE id = ?'
        ).run(name, price, image_url, title_color, is_active, sort_order, id);

        await logAction(db, auth.user, 'shop_item_update', `#${id}: ${name}`);

        const item = await db.prepare('SELECT * FROM shop_items WHERE id = ?').get(id);
        return NextResponse.json({ success: true, message: 'Öğe güncellendi', item });
    } catch (err) {
        console.error('admin/shop PUT error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}

// DELETE: ?id=xxx
export async function DELETE(request) {
    try {
        const db = await getDb();
        const auth = await requireAdmin(request, db);
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 });

        const existing = await db.prepare('SELECT * FROM shop_items WHERE id = ?').get(id);
        if (!existing) return NextResponse.json({ error: 'Öğe bulunamadı' }, { status: 404 });

        await unequipItemFromAllUsers(db, id);
        await db.prepare('DELETE FROM shop_items WHERE id = ?').run(id);

        await logAction(db, auth.user, 'shop_item_delete', `#${id}: ${existing.name}`);

        return NextResponse.json({ success: true, message: `"${existing.name}" mağazadan silindi` });
    } catch (err) {
        console.error('admin/shop DELETE error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
