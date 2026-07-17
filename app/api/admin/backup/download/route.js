import { NextResponse } from 'next/server';
import { getVerifiedUser, hasAdminPanelAccess } from '@/lib/auth';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';

const BACKUP_DIR = path.join(process.cwd(), 'backups');

export async function GET(request) {
    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { user: tokenUser } = result;

        if (!await hasAdminPanelAccess(tokenUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz erisim' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('file');

        if (!filename) {
            return NextResponse.json({ error: 'Dosya adi gerekli' }, { status: 400 });
        }

        const filePath = path.join(BACKUP_DIR, filename);

        if (!existsSync(filePath)) {
            return NextResponse.json({ error: 'Dosya bulunamadi' }, { status: 404 });
        }

        const content = await readFile(filePath);
        const fileStats = await stat(filePath);

        return new NextResponse(content, {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': String(fileStats.size),
            },
        });
    } catch (error) {
        console.error('GET /api/admin/backup/download error:', error);
        return NextResponse.json({ error: 'Indirme basarisiz' }, { status: 500 });
    }
}