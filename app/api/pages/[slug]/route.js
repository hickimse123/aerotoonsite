import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request, { params }) {
    try {
        const { slug } = await params;
        const db = await getDb();
        const page = await db.prepare('SELECT * FROM custom_pages WHERE slug = ? AND is_active = 1').get(slug);
        if (!page) {
            return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, page });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}