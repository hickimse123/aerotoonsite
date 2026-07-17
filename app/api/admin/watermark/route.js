import { NextResponse } from 'next/server';
import { requireAuth, hasAdminPanelAccess } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { uploadFileToImgbb } from '@/lib/imgbb';

// Watermark görseli yükle
export async function POST(request) {
    try {
        const user = await requireAuth(request);
        const db = await getDb();
        if (!await hasAdminPanelAccess(user, db)) throw new Error('Forbidden');
    } catch {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('watermark');

        if (!file || typeof file.arrayBuffer !== 'function') {
            return NextResponse.json({ error: 'Watermark dosyası gerekli' }, { status: 400 });
        }

        const allowedTypes = ['image/png', 'image/webp', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Sadece PNG, WebP veya JPEG dosyaları kabul edilir (PNG/WebP şeffaflık için önerilir)' }, { status: 400 });
        }

        const { url } = await uploadFileToImgbb(file, 'watermark');

        // Watermark URL'ini veritabanına kaydet
        const db = await getDb();
        await db.prepare('INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES (?, ?)').run('watermark_path', url);
        await db.prepare('DELETE FROM app_settings WHERE setting_key = ?').run('watermark_abs_path');

        return NextResponse.json({ path: url, message: 'Watermark başarıyla yüklendi' });
    } catch (err) {
        console.error('Watermark yükleme hatası:', err);
        return NextResponse.json({ error: 'Watermark yüklenemedi: ' + err.message }, { status: 500 });
    }
}

// Watermark sil
export async function DELETE(request) {
    try {
        const user = await requireAuth(request);
        const db2 = await getDb();
        if (!await hasAdminPanelAccess(user, db2)) throw new Error('Forbidden');
    } catch {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    try {
        const db = await getDb();
        await db.prepare("DELETE FROM app_settings WHERE setting_key IN ('watermark_path', 'watermark_abs_path')").run();

        return NextResponse.json({ message: 'Watermark silindi' });
    } catch (err) {
        return NextResponse.json({ error: 'Watermark silinemedi: ' + err.message }, { status: 500 });
    }
}
