import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json({ error: 'Translation feature is disabled' }, { status: 410 });
}
