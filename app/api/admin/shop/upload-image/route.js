import { NextResponse } from 'next/server';
import { requireAuth, hasAdminPanelAccess } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { uploadFileToImgbb } from '@/lib/imgbb';

// Mağaza öğesi görseli yükle (rozet/çerçeve — GIF/PNG desteklenir)
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
        const file = formData.get('image');

        if (!file || typeof file.arrayBuffer !== 'function') {
            return NextResponse.json({ error: 'Görsel dosyası gerekli' }, { status: 400 });
        }

        const allowedTypes = ['image/png', 'image/gif', 'image/webp', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Sadece PNG, GIF, WebP veya JPEG dosyaları kabul edilir' }, { status: 400 });
        }
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'Dosya en fazla 10MB olabilir' }, { status: 400 });
        }

        const { url } = await uploadFileToImgbb(file, 'shop-item');
        return NextResponse.json({ success: true, url });
    } catch (err) {
        console.error('shop upload-image hatası:', err);
        return NextResponse.json({ error: 'Görsel yüklenemedi: ' + err.message }, { status: 500 });
    }
}
