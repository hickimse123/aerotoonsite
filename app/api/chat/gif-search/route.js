import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';

// Tenor API anahtarını asla istemciye göndermiyoruz — sadece burada,
// sunucu tarafında, DB'den okuyup Tenor'a proxy'liyoruz.
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
        const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'tenor_api_key'").get();
        const apiKey = row?.setting_value?.trim();
        if (!apiKey) {
            return NextResponse.json({ success: false, configured: false, error: 'GIF arama henüz yapılandırılmamış' });
        }

        const { searchParams } = new URL(request.url);
        const q = (searchParams.get('q') || '').trim().slice(0, 80);
        const endpoint = q
            ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${apiKey}&client_key=aerotoon_chat&limit=24&media_filter=gif&contentfilter=medium`
            : `https://tenor.googleapis.com/v2/featured?key=${apiKey}&client_key=aerotoon_chat&limit=24&media_filter=gif&contentfilter=medium`;

        const tenorRes = await fetch(endpoint);
        if (!tenorRes.ok) {
            return NextResponse.json({ success: false, error: 'GIF servisine ulaşılamadı' }, { status: 502 });
        }
        const data = await tenorRes.json();
        const results = (data.results || []).map(item => {
            const gifFmt = item.media_formats?.gif;
            const tinyFmt = item.media_formats?.tinygif || item.media_formats?.nanogif;
            if (!gifFmt?.url) return null;
            return {
                id: item.id,
                url: gifFmt.url,
                preview: tinyFmt?.url || gifFmt.url,
                width: gifFmt.dims?.[0] || 200,
                height: gifFmt.dims?.[1] || 200,
            };
        }).filter(Boolean);

        return NextResponse.json({ success: true, configured: true, results });
    } catch (err) {
        console.error('chat/gif-search GET error:', err);
        return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
    }
}
