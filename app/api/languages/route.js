import { NextResponse } from 'next/server';

// Dil seçme özelliği kaldırıldı — endpoint boş liste döndürür
export async function GET() {
    return NextResponse.json({ languages: [] });
}
