import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createRateLimiter } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const settingsRateLimit = createRateLimiter(30, 60 * 1000); // 30 istek/dk

export async function GET(request) {
    try {
        // Rate limit kontrolü
        const rl = settingsRateLimit(request);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: `Çok fazla istek. ${rl.retryAfter} saniye sonra tekrar deneyin.` },
                { status: 429 }
            );
        }

        const db = await getDb();
        const rows = await db.prepare('SELECT setting_key, setting_value FROM app_settings').all();
        // Bazı ayarlar hassas (API anahtarı gibi) — istemciye asla gönderilmemeli.
        const SENSITIVE_KEYS = new Set(['tenor_api_key']);
        const settings = {};
        rows.forEach(r => { if (!SENSITIVE_KEYS.has(r.setting_key)) settings[r.setting_key] = r.setting_value });
        return NextResponse.json({ success: true, settings }, {
            headers: {
                // 30 saniyelik client cache — admin kaydettiğinde zaten sayfayı yeniler
                // no-store yerine kısa TTL: her mount'ta network isteği yapmak yerine
                // tarayıcı cache'i kullanılır, gereksiz DB sorgusu azalır
                'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
            }
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
    }
}
