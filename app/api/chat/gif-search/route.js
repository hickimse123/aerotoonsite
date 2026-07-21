import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { fetchGifs } from '@/lib/giphy';

// GIF arama artık GIPHY üzerinden yapılıyor (Tenor'dan taşındı).
const gifRateLimit = createRateLimiter(30, 60 * 1000); // 30 istek/dk

// GET ?q=arama+terimi (boşsa "trending" / popüler GIF'ler döner)
export async function GET(request) {
    try {
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ success: false, error: 'Giriş yapmalısınız' }, { status: 401 });

        const rl = gifRateLimit(request);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: `Çok fazla istek. ${rl.retryAfter} saniye sonra tekrar deneyin.` }, { status: 429 });
        }

        const db = await getDb();
        const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'giphy_api_key'").get();
        const apiKey = row?.setting_value?.trim();

        const { searchParams } = new URL(request.url);
        const q = (searchParams.get('q') || '').trim().slice(0, 80);

        const results = await fetchGifs({ apiKey, query: q, limit: 24 });
        return NextResponse.json({ success: true, configured: true, results });
    } catch (err) {
        console.error('chat/gif-search GET error:', err);
        return NextResponse.json({ success: false, error: 'GIF servisine ulaşılamadı' }, { status: 502 });
    }
}
