import { NextResponse } from 'next/server';
import { requireAdmin, requireAuth, hasPermission, hasAdminPanelAccess } from '@/lib/auth';
import { getDb, generateSlug } from '@/lib/db';
import {
    scrapeSeriesInfo,
    fetchChapterPages,
    downloadAndSaveChapterPages,
    detectSiteType,
} from '@/lib/scraper';
import { v4 as uuidv4 } from 'uuid';
import { uploadToImgbb } from '@/lib/imgbb';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://yomitranslate.com';

async function makeUniqueSlug(db, title, excludeId = null) {
    let base = generateSlug(title);
    if (!base) base = `series-${Date.now()}`;
    let slug = base;
    let counter = 1;
    while (true) {
        const query = excludeId
            ? 'SELECT id FROM series WHERE slug = ? AND id != ?'
            : 'SELECT id FROM series WHERE slug = ?';
        const args = excludeId ? [slug, excludeId] : [slug];
        const existing = await db.prepare(query).get(...args);
        if (!existing) break;
        slug = `${base}-${counter++}`;
    }
    return slug;
}

// ── Download cover from URL (imgbb'ye WebP olarak yükler) ───────────────────
async function downloadCover(imageUrl, title) {
    try {
        const res = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': new URL(imageUrl).origin + '/',
            }
        });
        if (!res.ok) return null;
        const rawBuffer = Buffer.from(await res.arrayBuffer());
        const slug = generateSlug(title) || uuidv4();
        let webpBuffer;
        try {
            const sharp = (await import('sharp')).default;
            webpBuffer = await sharp(rawBuffer).webp({ quality: 90 }).toBuffer();
        } catch {
            webpBuffer = rawBuffer; // fallback: raw buffer if sharp fails
        }
        const { url } = await uploadToImgbb(webpBuffer, `cover_${slug}_${uuidv4().split('-')[0]}`);
        return url;
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/scrape
// actions: fetch-info | add-source | import-chapters | sync-source | delete-source | publish-pending
// ═══════════════════════════════════════════════════════════════════════════════
export async function POST(request) {
    let user;
    try { user = await requireAuth(request); } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const db = await getDb();
        if (!await hasPermission(user, 'upload_chapters', db) && !await hasPermission(user, 'manage_chapters', db) && !await hasAdminPanelAccess(user, db)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const body = await request.json();
        const { action } = body;

        // ── fetch-info: preview series info from URL without saving ──────────────
        if (action === 'fetch-info') {
            const { url, language } = body;
            if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

            const result = await scrapeSeriesInfo(url, { language: language || 'en' });
            return NextResponse.json({
                success: true,
                site: detectSiteType(url),
                meta: result.meta,
                chapters_count: result.chapters.length,
                chapters_preview: result.chapters.slice(0, 5),
                chapters_last: result.chapters.slice(-3),
            });
        }

        // ── add-source: attach a source URL to an existing series ─────────────────
        if (action === 'add-source') {
            const { series_id, url, auto_sync = 1, language = 'en' } = body;
            if (!series_id || !url) return NextResponse.json({ error: 'series_id and url required' }, { status: 400 });

            const existing = await db.prepare('SELECT id FROM scraper_sources WHERE series_id = ? AND source_url = ?').get(series_id, url);
            if (existing) return NextResponse.json({ error: 'Source already added for this series' }, { status: 409 });

            const result = await db.prepare(
                'INSERT INTO scraper_sources (series_id, source_url, source_site, auto_sync, language) VALUES (?, ?, ?, ?, ?)'
            ).run(series_id, url, detectSiteType(url), auto_sync ? 1 : 0, language || 'en');

            return NextResponse.json({ success: true, source_id: result.lastInsertRowid, message: 'Source added' });
        }

        // ── delete-source: remove a scraper source ────────────────────────────────
        if (action === 'delete-source') {
            const { source_id } = body;
            if (!source_id) return NextResponse.json({ error: 'source_id required' }, { status: 400 });
            await db.prepare('DELETE FROM scraper_sources WHERE id = ?').run(source_id);
            return NextResponse.json({ success: true, message: 'Source removed' });
        }

        // ── import-chapters: scrape and stage pending chapters for a series ───────
        if (action === 'import-chapters') {
            const { series_id, url, download_images = false, publish_immediately = false, language = 'en' } = body;
            if (!series_id || !url) return NextResponse.json({ error: 'series_id and url required' }, { status: 400 });

            // Create job record
            const jobResult = await db.prepare(
                'INSERT INTO scraper_jobs (series_id, source_url, status) VALUES (?, ?, ?)'
            ).run(series_id, url, 'running');
            const jobId = jobResult.lastInsertRowid;

            try {
                const { meta, chapters } = await scrapeSeriesInfo(url, { language: language || 'en' });

                // Find which chapters already exist in DB (published OR pending) for this series
                const existingChapters = await db.prepare('SELECT chapter_number FROM chapters WHERE series_id = ?').all(series_id);
                const existingPending = await db.prepare("SELECT chapter_number FROM scraper_pending_chapters WHERE series_id = ? AND status = 'pending'").all(series_id);
                const existingNums = new Set([
                    ...existingChapters.map(c => c.chapter_number),
                    ...existingPending.map(c => c.chapter_number),
                ]);

                const newChapters = chapters.filter(c => !existingNums.has(c.chapter_number));

                if (newChapters.length === 0) {
                    await db.prepare('UPDATE scraper_jobs SET status=?, chapters_found=0, chapters_imported=0, updated_at=CURRENT_TIMESTAMP WHERE id=?')
                        .run('completed', jobId);

                    // Update last_checked and last_chapter_found
                    const maxChap = chapters.reduce((m, c) => Math.max(m, c.chapter_number), 0);
                    await db.prepare('UPDATE scraper_sources SET last_checked=CURRENT_TIMESTAMP, last_chapter_found=? WHERE series_id=? AND source_url=?')
                        .run(maxChap, series_id, url);

                    return NextResponse.json({ success: true, job_id: jobId, message: 'All chapters already up to date', new_chapters: 0 });
                }

                let importedCount = 0;

                if (publish_immediately || download_images) {
                    // Directly download and publish each chapter
                    for (const ch of newChapters) {
                        try {
                            const chapResult = await db.prepare(
                                'INSERT INTO chapters (series_id, chapter_number, title) VALUES (?, ?, ?)'
                            ).run(series_id, ch.chapter_number, ch.title || (language === 'tr' ? `Bölüm ${ch.chapter_number}` : `Chapter ${ch.chapter_number}`));
                            const chapterId = chapResult.lastInsertRowid;

                            // Google Indexing Trigger
                            try {
                                const seriesObj = await db.prepare('SELECT slug, id FROM series WHERE id = ?').get(series_id);
                                if (seriesObj) {
                                    const slug = seriesObj.slug || seriesObj.id;
                                    const chUrl = `${BASE_URL}/seri/${slug}/bolum/${ch.chapter_number}`;
                                    import('@/lib/googleIndexing').then(({ notifyGoogleIndexing }) => {
                                        notifyGoogleIndexing(chUrl);
                                    }).catch(() => {});
                                }
                            } catch (indexingErr) {
                                console.error('Google Indexing API trigger error (scraper):', indexingErr);
                            }

                            const pageUrls = await fetchChapterPages(ch);
                            if (pageUrls.length > 0) {
                                  await downloadAndSaveChapterPages(db, chapterId, pageUrls);
                            }
                            importedCount++;
                        } catch (err) {
                            console.error(`Failed to import chapter ${ch.chapter_number}:`, err.message);
                        }
                    }
                } else {
                    // Stage as pending chapters (user reviews & publishes manually)
                    const insertPending = await db.prepare(
                        'INSERT OR IGNORE INTO scraper_pending_chapters (series_id, job_id, chapter_number, chapter_title, source_url, pages_json, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
                    );
                    for (const ch of newChapters) {
                        insertPending.run(
                            series_id,
                            jobId,
                            ch.chapter_number,
                            ch.title || (language === 'tr' ? `Bölüm ${ch.chapter_number}` : `Chapter ${ch.chapter_number}`),
                            ch.chapter_url || url,
                            JSON.stringify(ch),
                            'pending'
                        );
                        importedCount++;
                    }
                }

                // Update last_checked
                const maxChap = chapters.reduce((m, c) => Math.max(m, c.chapter_number), 0);
                await db.prepare('UPDATE scraper_sources SET last_checked=CURRENT_TIMESTAMP, last_chapter_found=? WHERE series_id=? AND source_url=?')
                    .run(maxChap, series_id, url);

                await db.prepare('UPDATE scraper_jobs SET status=?, chapters_found=?, chapters_imported=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
                    .run('completed', newChapters.length, importedCount, jobId);

                return NextResponse.json({
                    success: true,
                    job_id: jobId,
                    message: publish_immediately
                        ? `${importedCount} chapters downloaded and published`
                        : `${importedCount} chapters staged. Review and publish from the pending list.`,
                    new_chapters: importedCount,
                    meta,
                });
            } catch (err) {
                await db.prepare('UPDATE scraper_jobs SET status=?, error_message=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
                    .run('failed', err.message, jobId);
                throw err;
            }
        }

        // ── publish-pending: download images & publish pending chapter(s) ─────────
        if (action === 'publish-pending') {
            const { pending_ids, series_id } = body;
            if (!pending_ids?.length && !series_id) return NextResponse.json({ error: 'pending_ids or series_id required' }, { status: 400 });

            let pendingRows;
            if (pending_ids?.length) {
                const placeholders = pending_ids.map(() => '?').join(',');
                pendingRows = await db.prepare(`SELECT * FROM scraper_pending_chapters WHERE id IN (${placeholders}) AND status='pending'`).all(...pending_ids);
            } else {
                pendingRows = await db.prepare(`SELECT * FROM scraper_pending_chapters WHERE series_id=? AND status='pending'`).all(series_id);
            }

            if (pendingRows.length === 0) return NextResponse.json({ success: true, message: 'No pending chapters to publish', published: 0 });

            let published = 0;
            const errors = [];

            for (const row of pendingRows) {
                try {
                    // Mark as processing
                    await db.prepare('UPDATE scraper_pending_chapters SET status=? WHERE id=?').run('processing', row.id);

                    // Parse chapter meta from pages_json
                    let chapterMeta;
                    try { chapterMeta = JSON.parse(row.pages_json); } catch { chapterMeta = {}; }

                    // Get source language for this series
                    const sourceObj = await db.prepare('SELECT language FROM scraper_sources WHERE series_id = ? LIMIT 1').get(row.series_id);
                    const lang = sourceObj?.language || 'en';

                    // Create chapter record
                    const chapResult = await db.prepare(
                        'INSERT INTO chapters (series_id, chapter_number, title) VALUES (?, ?, ?)'
                    ).run(row.series_id, row.chapter_number, row.chapter_title || (lang === 'tr' ? `Bölüm ${row.chapter_number}` : `Chapter ${row.chapter_number}`));
                    const chapterId = chapResult.lastInsertRowid;

                    // Google Indexing Trigger
                    try {
                        const seriesObj = await db.prepare('SELECT slug, id FROM series WHERE id = ?').get(row.series_id);
                        if (seriesObj) {
                            const slug = seriesObj.slug || seriesObj.id;
                            const chUrl = `${BASE_URL}/seri/${slug}/bolum/${row.chapter_number}`;
                            import('@/lib/googleIndexing').then(({ notifyGoogleIndexing }) => {
                                notifyGoogleIndexing(chUrl);
                            }).catch(() => {});
                        }
                    } catch (indexingErr) {
                        console.error('Google Indexing API trigger error (publish pending):', indexingErr);
                    }

                    // Fetch & download pages
                    const pageUrls = await fetchChapterPages({ ...chapterMeta, chapter_url: row.source_url });
                    if (pageUrls.length > 0) {
                        await downloadAndSaveChapterPages(db, chapterId, pageUrls);
                    }

                    await db.prepare('UPDATE scraper_pending_chapters SET status=? WHERE id=?').run('published', row.id);
                    published++;
                } catch (err) {
                    errors.push({ id: row.id, chapter: row.chapter_number, error: err.message });
                    await db.prepare('UPDATE scraper_pending_chapters SET status=? WHERE id=?').run('failed', row.id);
                }
            }

            return NextResponse.json({
                success: true,
                published,
                failed: errors.length,
                errors: errors.slice(0, 5),
                message: `Published ${published} chapters${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
            });
        }

        // ── sync-all: check all auto_sync sources for new chapters ───────────────
        if (action === 'sync-all') {
            const sources = await db.prepare('SELECT * FROM scraper_sources WHERE auto_sync=1').all();
            const results = [];

            for (const src of sources) {
                try {
                    const { chapters } = await scrapeSeriesInfo(src.source_url, { language: src.language || 'en' });
                    const existingChapters = await db.prepare('SELECT chapter_number FROM chapters WHERE series_id = ?').all(src.series_id);
                    const existingNums = new Set(existingChapters.map(c => c.chapter_number));
                    const newChaps = chapters.filter(c => !existingNums.has(c.chapter_number));

                    const maxChap = chapters.reduce((m, c) => Math.max(m, c.chapter_number), 0);
                    await db.prepare('UPDATE scraper_sources SET last_checked=CURRENT_TIMESTAMP, last_chapter_found=? WHERE id=?').run(maxChap, src.id);

                    // Stage new chapters
                    for (const ch of newChaps) {
                        await db.prepare(
                            'INSERT OR IGNORE INTO scraper_pending_chapters (series_id, chapter_number, chapter_title, source_url, pages_json, status) VALUES (?, ?, ?, ?, ?, ?)'
                        ).run(src.series_id, ch.chapter_number, ch.title || (src.language === 'tr' ? `Bölüm ${ch.chapter_number}` : `Chapter ${ch.chapter_number}`), ch.chapter_url || src.source_url, JSON.stringify(ch), 'pending');
                    }

                    const series = await db.prepare('SELECT title FROM series WHERE id=?').get(src.series_id);
                    results.push({ series_id: src.series_id, title: series?.title, new_chapters: newChaps.length });
                } catch (err) {
                    results.push({ series_id: src.series_id, error: err.message });
                }
            }

            const totalNew = results.reduce((s, r) => s + (r.new_chapters || 0), 0);
            return NextResponse.json({ success: true, synced: sources.length, total_new: totalNew, results });
        }

        // ── create-series-from-scrape: scrape + create series + stage chapters ───
        if (action === 'create-series-from-scrape') {
            const { url, publish_series = false, language = 'en' } = body;
            if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

            const { meta, chapters } = await scrapeSeriesInfo(url, { language: language || 'en' });

            // Download cover
            let coverUrl = '/demo/cover1.jpg';
            if (meta.coverUrl) {
                const downloaded = await downloadCover(meta.coverUrl, meta.title);
                if (downloaded) coverUrl = downloaded;
            }

            const slug = await makeUniqueSlug(db, meta.title);
            const genresJson = JSON.stringify(meta.genres || []);
            const seriesResult = await db.prepare(
                'INSERT INTO series (title, slug, description, cover_url, author, artist, status, type, genres, rating, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ).run(meta.title, slug, meta.description, coverUrl, meta.author, meta.artist, meta.status || 'ongoing', 'manga', genresJson, 0, publish_series ? 1 : 0);
            const seriesId = seriesResult.lastInsertRowid;

            // Add source
            await db.prepare('INSERT INTO scraper_sources (series_id, source_url, source_site, auto_sync, language) VALUES (?, ?, ?, 1, ?)')
                .run(seriesId, url, detectSiteType(url), language || 'en');

            // Stage all chapters
            for (const ch of chapters) {
                await db.prepare(
                    'INSERT OR IGNORE INTO scraper_pending_chapters (series_id, chapter_number, chapter_title, source_url, pages_json, status) VALUES (?, ?, ?, ?, ?, ?)'
                ).run(seriesId, ch.chapter_number, ch.title || (language === 'tr' ? `Bölüm ${ch.chapter_number}` : `Chapter ${ch.chapter_number}`), ch.chapter_url || url, JSON.stringify(ch), 'pending');
            }

            return NextResponse.json({
                success: true,
                series_id: seriesId,
                slug,
                title: meta.title,
                chapters_staged: chapters.length,
                message: `Series "${meta.title}" created with ${chapters.length} pending chapters`,
            });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (err) {
        console.error('/api/admin/scrape POST error:', err);
        const isCloudflare = err.message?.startsWith('CLOUDFLARE_PROTECTED');
        const userMessage = isCloudflare
            ? err.message.replace('CLOUDFLARE_PROTECTED: ', '')
            : (err.message || 'Scraper error');
        return NextResponse.json({ error: userMessage, cloudflare: isCloudflare }, { status: isCloudflare ? 422 : 500 });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/scrape?seriesId=X  → sources + pending chapters for a series
// GET /api/admin/scrape?action=all  → all sources across all series
// ═══════════════════════════════════════════════════════════════════════════════
export async function GET(request) {
    let user;
    try { user = await requireAuth(request); } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const db = await getDb();
        if (!await hasPermission(user, 'upload_chapters', db) && !await hasPermission(user, 'manage_chapters', db) && !await hasAdminPanelAccess(user, db)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const { searchParams } = new URL(request.url);
        const seriesId = searchParams.get('seriesId');
        const action = searchParams.get('action');

        if (action === 'all') {
            const sources = await db.prepare(`
                SELECT ss.*, s.title as series_title, s.slug as series_slug,
                    (SELECT COUNT(*) FROM scraper_pending_chapters spc WHERE spc.series_id=ss.series_id AND spc.status='pending') as pending_count
                FROM scraper_sources ss
                JOIN series s ON ss.series_id = s.id
                ORDER BY ss.created_at DESC
            `).all();
            return NextResponse.json({ success: true, sources });
        }

        if (seriesId) {
            const sources = await db.prepare('SELECT * FROM scraper_sources WHERE series_id=? ORDER BY created_at DESC').all(seriesId);
            const pending = await db.prepare(
                'SELECT * FROM scraper_pending_chapters WHERE series_id=? ORDER BY chapter_number ASC'
            ).all(seriesId);
            const jobs = await db.prepare('SELECT * FROM scraper_jobs WHERE series_id=? ORDER BY created_at DESC LIMIT 5').all(seriesId);
            return NextResponse.json({ success: true, sources, pending, jobs });
        }

        return NextResponse.json({ error: 'seriesId or action required' }, { status: 400 });
    } catch (err) {
        console.error('/api/admin/scrape GET error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
