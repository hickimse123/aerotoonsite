import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { fetchGifs } from '@/lib/giphy';

// Herkese açık GIF arama proxy'si (yorumlar bölümü için) — GIPHY üzerinden.
// Eskiden Tenor v1 kullanıyordu; Tenor artık kolayca API anahtarı vermediği
// için GIPHY'ye taşındı. Admin panelinde bir anahtar tanımlıysa onu kullanır,
// yoksa GIPHY'nin herkese açık test anahtarına düşer.
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    try {
        const db = await getDb();
        const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'giphy_api_key'").get();
        const apiKey = row?.setting_value?.trim();

        const results = await fetchGifs({ apiKey, query: q, limit });

        // Yorumlar bileşeninin beklediği eski Tenor-benzeri şekle eşle,
        // böylece frontend tarafında değişiklik gerekmiyor.
        const mappedResults = results.map(g => ({
            id: g.id,
            content_description: 'gif',
            media_formats: {
                gif: { url: g.url, dims: [g.width, g.height] },
                tinygif: { url: g.preview },
                nanogif: { url: g.preview },
            },
        }));

        return NextResponse.json({ results: mappedResults });
    } catch (e) {
        return NextResponse.json({ results: [], error: e.message }, { status: 500 });
    }
}
