import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser, hasAdminPanelAccess } from '@/lib/auth';
import { readdir, readFile, writeFile, mkdir, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Backup directory
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const MAX_BACKUPS = 7; // Keep last 7 backups
const BACKUP_COOLDOWN_MS = 60_000; // 60 saniye — burst koruma

// Format bytes to human readable
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Güvenlik: backupId'yi doğrula ve çözümlenen path'in BACKUP_DIR içinde kaldığını kontrol et.
 * Path traversal saldırısını önler (örn. id=../../.env.local).
 */
function resolveBackupPath(backupId) {
    // Yalnızca backup_<timestamp> formatına izin ver
    if (!backupId || !/^backup_\d+$/.test(backupId)) return null;
    const resolved = path.join(BACKUP_DIR, `${backupId}.json`);
    // Çözümlenen path BACKUP_DIR içinde kalmalı
    if (!resolved.startsWith(BACKUP_DIR + path.sep) && resolved !== BACKUP_DIR) return null;
    return resolved;
}

// Get all backups — sidecar meta dosyasından okur (büyük JSON parse etmez)
export async function GET(request) {
    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { user: tokenUser } = result;

        if (!tokenUser || !await hasAdminPanelAccess(tokenUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
        }

        // Ensure backup directory exists
        if (!existsSync(BACKUP_DIR)) {
            await mkdir(BACKUP_DIR, { recursive: true });
        }

        const entries = await readdir(BACKUP_DIR);
        const backups = [];

        for (const entry of entries) {
            if (!entry.endsWith('.json') || entry.endsWith('.meta.json')) continue;
            const backupId = entry.replace('.json', '');
            // Güvenlik: yalnızca geçerli backup_<timestamp> isimli dosyaları işle
            if (!/^backup_\d+$/.test(backupId)) continue;

            const metaPath = path.join(BACKUP_DIR, `${backupId}.meta.json`);
            try {
                // Sidecar meta dosyası varsa küçük meta'yı oku (büyük JSON parse etme)
                if (existsSync(metaPath)) {
                    const meta = JSON.parse(await readFile(metaPath, 'utf-8'));
                    const fileStats = await stat(path.join(BACKUP_DIR, entry));
                    backups.push({
                        id: backupId,
                        name: entry,
                        createdAt: meta.createdAt,
                        size: meta.size ?? fileStats.size,
                        sizeFormatted: formatBytes(meta.size ?? fileStats.size),
                        seriesCount: meta.seriesCount ?? 0,
                        chaptersCount: meta.chaptersCount ?? 0,
                        usersCount: meta.usersCount ?? 0,
                        commentsCount: meta.commentsCount ?? 0,
                    });
                } else {
                    // Eski backuplarda meta dosyası yok — tam dosyayı parse et (bir kerelik)
                    const content = await readFile(path.join(BACKUP_DIR, entry), 'utf-8');
                    const data = JSON.parse(content);
                    const size = Buffer.byteLength(content, 'utf-8');
                    const meta = {
                        createdAt: data.createdAt,
                        size,
                        seriesCount: data.data?.series?.length ?? 0,
                        chaptersCount: data.data?.chapters?.length ?? 0,
                        usersCount: data.data?.users?.length ?? 0,
                        commentsCount: data.data?.comments?.length ?? 0,
                    };
                    // Sidecar meta oluştur — bir dahaki seferde hızlı okuma için
                    await writeFile(metaPath, JSON.stringify(meta)).catch(() => {});
                    backups.push({ id: backupId, name: entry, sizeFormatted: formatBytes(size), ...meta });
                }
            } catch {}
        }

        // Sort by newest first
        backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // path field'ı dönme — sunucu dosya sistemi yapısını sızdırma
        return NextResponse.json({ backups });
    } catch (error) {
        console.error('GET /api/admin/backup error:', error);
        return NextResponse.json({ error: 'Yedekler getirilemedi' }, { status: 500 });
    }
}

// Create new backup
export async function POST(request) {
    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { user: tokenUser } = result;

        if (!tokenUser || !await hasAdminPanelAccess(tokenUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        // Ensure backup directory exists
        if (!existsSync(BACKUP_DIR)) {
            await mkdir(BACKUP_DIR, { recursive: true });
        }

        if (action === 'create') {
            // Rate limiting: son backup'tan bu yana BACKUP_COOLDOWN_MS geçmiş mi?
            try {
                const existing = await readdir(BACKUP_DIR);
                const jsonFiles = existing.filter(e => /^backup_\d+\.json$/.test(e));
                if (jsonFiles.length > 0) {
                    const timestamps = jsonFiles.map(e => parseInt(e.replace('backup_', '').replace('.json', ''), 10));
                    const latest = Math.max(...timestamps);
                    if (Date.now() - latest < BACKUP_COOLDOWN_MS) {
                        return NextResponse.json(
                            { error: `Lütfen ${Math.ceil(BACKUP_COOLDOWN_MS / 1000)} saniye bekleyip tekrar deneyin.` },
                            { status: 429 }
                        );
                    }
                }
            } catch {}

            // Export all data
            const backupId = `backup_${Date.now()}`;
            const timestamp = new Date().toISOString();

            // Helper to safely query a table (returns [] if table doesn't exist)
            async function safeQuery(sql) {
                try { return await db.prepare(sql).all(); } catch { return []; }
            }

            // Get all data from database — şifre/token alanları hariç
            const series = await safeQuery('SELECT * FROM series');
            const chapters = await safeQuery('SELECT * FROM chapters');
            const users = await safeQuery('SELECT id, username, email, role, yomi_points, created_at FROM users');
            const comments = await safeQuery('SELECT * FROM comments');
            const favorites = await safeQuery('SELECT * FROM favorites');
            const readingLists = await safeQuery('SELECT * FROM reading_lists');
            const announcements = await safeQuery('SELECT * FROM announcements');
            const appSettings = await safeQuery('SELECT * FROM app_settings');
            const userRatings = await safeQuery('SELECT * FROM user_ratings');

            const backupData = {
                version: '1.0',
                createdAt: timestamp,
                data: {
                    series,
                    chapters,
                    users,
                    comments,
                    favorites,
                    readingLists,
                    announcements,
                    appSettings,
                    userRatings,
                }
            };

            const backupPath = path.join(BACKUP_DIR, `${backupId}.json`);
            // Pretty-print olmadan yaz — %20-30 daha küçük dosya
            const jsonContent = JSON.stringify(backupData);
            await writeFile(backupPath, jsonContent);

            // Dosya boyutunu hesapla
            const fileStats = await stat(backupPath);

            // Sidecar meta dosyası oluştur — GET handler'da hızlı okuma için
            const metaData = {
                createdAt: timestamp,
                size: fileStats.size,
                seriesCount: series.length,
                chaptersCount: chapters.length,
                usersCount: users.length,
                commentsCount: comments.length,
            };
            await writeFile(
                path.join(BACKUP_DIR, `${backupId}.meta.json`),
                JSON.stringify(metaData)
            ).catch(() => {});

            // Clean up old backups (keep only MAX_BACKUPS)
            const entries = await readdir(BACKUP_DIR);
            const backupFiles = entries
                .filter(e => /^backup_\d+\.json$/.test(e))
                .map(e => ({ name: e, ts: parseInt(e.replace('backup_', '').replace('.json', ''), 10) }))
                .sort((a, b) => b.ts - a.ts);

            if (backupFiles.length > MAX_BACKUPS) {
                const toDelete = backupFiles.slice(MAX_BACKUPS);
                for (const file of toDelete) {
                    await unlink(path.join(BACKUP_DIR, file.name)).catch(() => {});
                    await unlink(path.join(BACKUP_DIR, file.name.replace('.json', '.meta.json'))).catch(() => {});
                }
            }

            return NextResponse.json({
                success: true,
                message: 'Yedek başarıyla oluşturuldu',
                backup: {
                    id: backupId,
                    name: `${backupId}.json`,
                    createdAt: timestamp,
                    size: fileStats.size,
                    sizeFormatted: formatBytes(fileStats.size),
                    seriesCount: series.length,
                    chaptersCount: chapters.length,
                    usersCount: users.length,
                    commentsCount: comments.length,
                }
            });
        }

        return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    } catch (error) {
        console.error('POST /api/admin/backup error:', error);
        return NextResponse.json({ error: 'Yedekleme başarısız' }, { status: 500 });
    }
}

// Delete backup
export async function DELETE(request) {
    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { user: tokenUser } = result;

        if (!tokenUser || !await hasAdminPanelAccess(tokenUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const backupId = searchParams.get('id');

        if (action === 'delete' && backupId) {
            // Güvenlik: path traversal koruması
            const backupPath = resolveBackupPath(backupId);
            if (!backupPath) {
                return NextResponse.json({ error: 'Geçersiz yedek ID' }, { status: 400 });
            }
            if (existsSync(backupPath)) {
                await unlink(backupPath);
                // Sidecar meta dosyasını da sil
                await unlink(backupPath.replace('.json', '.meta.json')).catch(() => {});
                return NextResponse.json({ success: true, message: 'Yedek silindi' });
            }
            return NextResponse.json({ error: 'Yedek bulunamadı' }, { status: 404 });
        }

        return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    } catch (error) {
        console.error('DELETE /api/admin/backup error:', error);
        return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
    }
}