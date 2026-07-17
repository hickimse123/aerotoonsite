import { NextResponse } from 'next/server';

const TENOR_API_KEY = process.env.TENOR_API_KEY || 'LIVDSRZULELA';
const TENOR_BASE = 'https://g.tenor.com/v1';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    try {
        const endpoint = q.trim()
            ? `${TENOR_BASE}/search?q=${encodeURIComponent(q.trim())}&key=${TENOR_API_KEY}&limit=${limit}&media_filter=minimal`
            : `${TENOR_BASE}/trending?key=${TENOR_API_KEY}&limit=${limit}&media_filter=minimal`;

        const res = await fetch(endpoint, {
            headers: { 'Accept': 'application/json' },
        });

        if (!res.ok) {
            const text = await res.text();
            return NextResponse.json({ results: [], error: text }, { status: res.status });
        }

        const data = await res.json();
        
        // Map v1 response to look like v2 for the frontend
        const mappedResults = (data.results || []).map(gif => {
            return {
                id: gif.id,
                content_description: gif.content_description || gif.title || 'gif',
                media_formats: {
                    gif: gif.media[0]?.gif,
                    tinygif: gif.media[0]?.tinygif,
                    nanogif: gif.media[0]?.nanogif
                }
            };
        });

        return NextResponse.json({ results: mappedResults });
    } catch (e) {
        return NextResponse.json({ results: [], error: e.message }, { status: 500 });
    }
}