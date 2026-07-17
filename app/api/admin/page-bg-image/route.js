import { NextResponse } from 'next/server';
import { requireAuth, hasAdminPanelAccess } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { uploadFileToImgbb } from '@/lib/imgbb';

// Sayfa arka plan görseli yükle
// POST /api/admin/page-bg-image?page=home   (page = home|archive|requests|profile|ranking|global)
export async function POST(request) {
    try {
        const user = await requireAuth(request);
        const db = await getDb();
        if (!await hasAdminPanelAccess(user, db)) throw new Error('Forbidden');
    } catch {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const page = searchParams.get('page') || 'global';

        const allowed = ['home', 'archive', 'requests', 'profile', 'ranking', 'global'];
        if (!allowed.includes(page)) {
            return NextResponse.json({ error: 'Geçersiz sayfa tipi' }, { status: 400 });
        }

        const formData = await request.formData();
        const file = formData.get('image');

        if (!file || typeof file.arrayBuffer !== 'function') {
            return NextResponse.json({ error: 'Görsel dosyası gerekli' }, { status: 400 });
        }

        const allowedTypes = ['image/png', 'image/webp', 'image/jpeg', 'image/jpg', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Sadece PNG, WebP, JPEG veya GIF kabul edilir' }, { status: 400 });
        }

        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'Dosya boyutu en fazla 10MB olabilir' }, { status: 400 });
        }

        const { url } = await uploadFileToImgbb(file, `page-bg-${page}`);

        // Ayarı veritabanına kaydet
        const db = await getDb();
        const settingKey    = `page_bg_${page}_image`;
        const absSettingKey = `page_bg_${page}_image_abs`;
        await db.prepare('INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES (?, ?)').run(settingKey, url);
        await db.prepare('DELETE FROM app_settings WHERE setting_key = ?').run(absSettingKey);

        return NextResponse.json({ path: url, message: 'Görsel başarıyla yüklendi' });
    } catch (err) {
        console.error('Sayfa arka plan görseli yükleme hatası:', err);
        return NextResponse.json({ error: 'Görsel yüklenemedi: ' + err.message }, { status: 500 });
    }
}

// Sayfa arka plan görselini sil
export async function DELETE(request) {
    try {
        const user = await requireAuth(request);
        const db = await getDb();
        if (!await hasAdminPanelAccess(user, db)) throw new Error('Forbidden');
    } catch {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const page = searchParams.get('page') || 'global';

        const db = await getDb();
        const settingKey    = `page_bg_${page}_image`;
        const absSettingKey = `page_bg_${page}_image_abs`;

        // imgbb'deki dosyayı otomatik silmiyoruz, sadece DB kaydını temizliyoruz
        await db.prepare('DELETE FROM app_settings WHERE setting_key IN (?, ?)').run(settingKey, absSettingKey);

        return NextResponse.json({ message: 'Görsel silindi' });
    } catch (err) {
        return NextResponse.json({ error: 'Görsel silinemedi: ' + err.message }, { status: 500 });
    }
}