import { headers } from 'next/headers';
import HomeClient from '@/components/HomeClient';

// Ana sayfa artık sunucu tarafında (SSR) ilk veriyi çekip HTML'e gömüyor.
// Önceden bu sayfa tamamen client-side'dı: tarayıcı boş bir sayfa alıp
// JS yüklendikten sonra 6 ayrı API isteği atıyordu (ilk yükleme için yavaş,
// SEO için de dezavantajlı). Artık ilk paint zaten dolu geliyor; client
// tarafındaki mevcut interaktiflik (sayfalama, 18+ filtre, top periyot vb.)
// olduğu gibi çalışmaya devam ediyor.
export const dynamic = 'force-dynamic';

async function getBaseUrl() {
    const h = await headers();
    const host = h.get('host');
    const isLocal = host?.startsWith('localhost') || host?.startsWith('127.0.0.1');
    const protocol = isLocal ? 'http' : 'https';
    return `${protocol}://${host}`;
}

export default async function Page() {
    let initialData = null;
    try {
        const baseUrl = await getBaseUrl();
        const [popRes, updRes, trendRes, edRes, annRes, settRes] = await Promise.all([
            fetch(`${baseUrl}/api/series?sort=popular&limit=5`, { cache: 'no-store' }),
            fetch(`${baseUrl}/api/series/latest-updates?page=1&adult=0`, { cache: 'no-store' }),
            fetch(`${baseUrl}/api/series/trending`, { cache: 'no-store' }),
            fetch(`${baseUrl}/api/series/editor-pick`, { cache: 'no-store' }),
            fetch(`${baseUrl}/api/announcements?active=true`, { cache: 'no-store' }),
            fetch(`${baseUrl}/api/settings`, { cache: 'no-store' }),
        ]);

        const [popData, updData, trendData, edData, annData, settData] = await Promise.all([
            popRes.json(), updRes.json(), trendRes.json(), edRes.json(), annRes.json(), settRes.json()
        ]);

        initialData = {
            popularSeries: popData.series || [],
            latestUpdates: updData.updates || [],
            updatesTotalPages: updData.totalPages || 1,
            updatesTotal: updData.total || 0,
            trending: trendData.series || [],
            editorPicks: Array.isArray(edData.series) ? edData.series : (edData.series ? [edData.series] : []),
            announcements: annData.announcements || [],
            appSettings: settData.success ? (settData.settings || {}) : {},
        };
    } catch (err) {
        // SSR fetch başarısız olursa sessizce client-side fallback'e düşer
        // (HomeClient initialData=null olduğunda kendi fetch'ini eskisi gibi yapar)
        console.error('Homepage SSR fetch failed, falling back to client-side fetch:', err);
        initialData = null;
    }

    return <HomeClient initialData={initialData} />;
}
