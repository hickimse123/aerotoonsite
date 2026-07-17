import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser, hasAdminPanelAccess } from '@/lib/auth';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import os from 'os';

// Get directory size recursively
async function getDirSize(dirPath) {
    let totalSize = 0;
    try {
        const entries = await readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            try {
                if (entry.isDirectory()) {
                    totalSize += await getDirSize(fullPath);
                } else {
                    const stats = await stat(fullPath);
                    totalSize += stats.size;
                }
            } catch {
                // Skip files we can't access
            }
        }
    } catch {
        // Directory doesn't exist or can't be read
    }
    return totalSize;
}

// Format bytes to human readable
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function GET(request) {
    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { user: tokenUser } = result;

        if (!await hasAdminPanelAccess(tokenUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
        }

        // Get storage info
        const publicDir = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public');
        const uploadsDir = path.join(/*turbopackIgnore: true*/ publicDir, 'uploads');
        const dbPath = process.env.DATABASE_PATH ? path.resolve(process.env.DATABASE_PATH) : path.join(process.cwd(), 'data', 'manga.db');

        let uploadsSize = 0;
        let dbSize = 0;

        try {
            uploadsSize = await getDirSize(uploadsDir);
        } catch {}

        try {
            const dbStats = await stat(dbPath);
            dbSize = dbStats.size;
        } catch {}

        const totalStorage = uploadsSize + dbSize;

        // Get database stats
        let dbStats = { totalSeries: 0, totalChapters: 0, totalPages: 0, totalUsers: 0, totalComments: 0 };
        try {
            dbStats = {
                totalSeries: await (db.prepare('SELECT COUNT(*) as count FROM series').get())?.count || 0,
                totalChapters: await (db.prepare('SELECT COUNT(*) as count FROM chapters').get())?.count || 0,
                totalPages: await (db.prepare('SELECT COUNT(*) as count FROM pages').get())?.count || 0,
                totalUsers: await (db.prepare('SELECT COUNT(*) as count FROM users').get())?.count || 0,
                totalComments: await (db.prepare('SELECT COUNT(*) as count FROM comments').get())?.count || 0,
            };
        } catch (e) {
            console.error('dbStats fetch error:', e);
        }

        // Get backup info
        const backupsDir = path.join(process.cwd(), 'backups');
        let backups = [];
        let backupsSize = 0;
        try {
            const backupFiles = await readdir(backupsDir);
            for (const file of backupFiles) {
                const stats = await stat(path.join(backupsDir, file));
                backups.push({
                    name: file,
                    size: stats.size,
                    sizeFormatted: formatBytes(stats.size),
                    createdAt: stats.birthtime,
                });
                backupsSize += stats.size;
            }
            // Sort by newest first
            backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch {}

        // CPU usage: sample over 100ms for accuracy
        async function getCpuUsage() {
            try {
                const cpus1 = os.cpus();
                if (!cpus1 || !cpus1.length) return 0;
                await new Promise(r => setTimeout(r, 100));
                const cpus2 = os.cpus();
                let totalIdle = 0, totalTick = 0;
                for (let i = 0; i < cpus1.length; i++) {
                    if (!cpus1[i]?.times || !cpus2[i]?.times) continue;
                    const t1 = Object.values(cpus1[i].times).reduce((a, b) => a + b, 0);
                    const t2 = Object.values(cpus2[i].times).reduce((a, b) => a + b, 0);
                    const idle1 = cpus1[i].times.idle;
                    const idle2 = cpus2[i].times.idle;
                    totalIdle += idle2 - idle1;
                    totalTick += t2 - t1;
                }
                return totalTick > 0 ? Math.round((1 - totalIdle / totalTick) * 100) : 0;
            } catch (e) {
                console.error('getCpuUsage error:', e);
                return 0;
            }
        }

        const cpuPercent = await getCpuUsage();

        // RAM usage
        let ramPercent = 0;
        let totalMem = 0;
        let freeMem = 0;
        let usedMem = 0;
        try {
            totalMem = os.totalmem() || 0;
            freeMem = os.freemem() || 0;
            usedMem = totalMem - freeMem;
            if (totalMem > 0) {
                ramPercent = Math.round((usedMem / totalMem) * 100);
            }
        } catch (e) {
            console.error('os mem error:', e);
        }

        return NextResponse.json({
            storage: {
                uploads: { bytes: uploadsSize, formatted: formatBytes(uploadsSize) },
                database: { bytes: dbSize, formatted: formatBytes(dbSize) },
                backups: { bytes: backupsSize, formatted: formatBytes(backupsSize), count: backups.length },
                total: { bytes: totalStorage, formatted: formatBytes(totalStorage) },
            },
            database: dbStats,
            backups,
            serverTime: new Date().toISOString(),
            cpuUsage: String(cpuPercent),
            ramUsage: String(ramPercent),
            ramDetails: {
                total: formatBytes(totalMem),
                used: formatBytes(usedMem),
                free: formatBytes(freeMem),
            },
        });
    } catch (error) {
        console.error('GET /api/admin/stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch server stats' }, { status: 500 });
    }
}
