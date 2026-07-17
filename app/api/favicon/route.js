import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const db = await getDb();
        const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'favicon_url'").get();
        const faviconUrl = row?.setting_value?.trim();

        if (!faviconUrl) {
            // Varsayılan favicon
            return NextResponse.redirect(new URL('/favicon.svg', request.url), { status: 302 });
        }

        // Tam URL oluştur
        let targetUrl;
        if (faviconUrl.startsWith('http://') || faviconUrl.startsWith('https://')) {
            targetUrl = faviconUrl;
        } else {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://yomitranslate.com';
            targetUrl = `${baseUrl}${faviconUrl}`;
        }

        // Harici URL ise proxy olarak servis et
        if (targetUrl.startsWith('http')) {
            try {
                const response = await fetch(targetUrl);
                if (!response.ok) {
                    return NextResponse.redirect(new URL('/favicon.svg', request.url), { status: 302 });
                }
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // MIME type belirle
                const urlLower = targetUrl.toLowerCase();
                let contentType = 'image/png';
                if (urlLower.includes('.svg')) contentType = 'image/svg+xml';
                else if (urlLower.includes('.webp')) contentType = 'image/webp';
                else if (urlLower.includes('.ico')) contentType = 'image/x-icon';
                else if (urlLower.includes('.gif')) contentType = 'image/gif';
                else if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) contentType = 'image/jpeg';

                return new NextResponse(buffer, {
                    status: 200,
                    headers: {
                        'Content-Type': contentType,
                        'Cache-Control': 'public, max-age=0, must-revalidate',
                    },
                });
            } catch {
                return NextResponse.redirect(new URL('/favicon.svg', request.url), { status: 302 });
            }
        }

        // Yerel dosya ise yönlendir
        return NextResponse.redirect(new URL(targetUrl, request.url), { status: 302 });
    } catch (error) {
        console.error('Favicon API error:', error);
        return NextResponse.redirect(new URL('/favicon.svg', request.url), { status: 302 });
    }
}
