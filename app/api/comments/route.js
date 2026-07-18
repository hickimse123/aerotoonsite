export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';

const commentsRateLimiter = createRateLimiter(10, 60 * 1000);

// Escape HTML special characters to prevent XSS
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const chapterId = searchParams.get('chapterId');
        const seriesId = searchParams.get('seriesId');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 20;
        const sort = searchParams.get('sort') || 'best';
        const paragraphIndex = searchParams.get('paragraphIndex');
        const offset = (page - 1) * limit;

        const db = await getDb();

        if (!chapterId && !seriesId) {
            // If no chapterId or seriesId, return all comments (for admin)
            const all = await db.prepare(`
                SELECT c.*, u.username, u.avatar_url, u.yomi_points, u.role,
                    (SELECT rank FROM (SELECT id, DENSE_RANK() OVER (ORDER BY yomi_points DESC) as rank FROM users) WHERE id = c.user_id) as leaderboard_rank,
                    ch.title as chapter_title, s.title as series_title
                FROM comments c
                JOIN users u ON c.user_id = u.id
                LEFT JOIN chapters ch ON c.chapter_id = ch.id
                LEFT JOIN series s ON (ch.series_id = s.id OR c.series_id = s.id)
                WHERE c.parent_id IS NULL
                ORDER BY c.created_at DESC
                LIMIT 50
            `).all();
            return NextResponse.json({ comments: all });
        }

        let whereClause, whereParam;
        if (chapterId) {
            whereClause = 'c.chapter_id = ?';
            whereParam = chapterId;
        } else {
            whereClause = 'c.series_id = ?';
            whereParam = seriesId;
        }
        
        if (paragraphIndex !== null && paragraphIndex !== undefined) {
            whereClause += ` AND c.paragraph_index = ${parseInt(paragraphIndex)}`;
        }

        let orderByClause = 'c.is_pinned DESC, c.created_at DESC';
        if (sort === 'oldest') {
            orderByClause = 'c.is_pinned DESC, c.created_at ASC';
        } else if (sort === 'best') {
            orderByClause = `c.is_pinned DESC, COALESCE((SELECT SUM(CASE WHEN r.emoji = '👍' THEN 1 WHEN r.emoji = '👎' THEN -1 ELSE 0 END) FROM reactions r WHERE r.comment_id = c.id), 0) DESC, c.created_at DESC`;
        }

        const totalQuery = await db.prepare(`SELECT COUNT(*) as count FROM comments c WHERE ${whereClause}`).get(whereParam);
        const totalComments = totalQuery.count;

        const comments = await db.prepare(`
            SELECT c.*, u.username, u.avatar_url, u.yomi_points, u.role,
                (SELECT rank FROM (SELECT id, DENSE_RANK() OVER (ORDER BY yomi_points DESC) as rank FROM users) WHERE id = c.user_id) as leaderboard_rank,
                (SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id) as reply_count
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE ${whereClause} AND c.parent_id IS NULL
            ORDER BY ${orderByClause}
            LIMIT ? OFFSET ?
        `).all(whereParam, limit, offset);

        // Collect all reply rows first so we can batch-fetch badges for all users at once
        const allRepliesMap = new Map(); // commentId -> reply[]
        for (const comment of comments) {
            const replies = await db.prepare(`
                SELECT c.*, u.username, u.avatar_url, u.yomi_points, u.role,
                (SELECT rank FROM (SELECT id, DENSE_RANK() OVER (ORDER BY yomi_points DESC) as rank FROM users) WHERE id = c.user_id) as leaderboard_rank
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.parent_id = ? ORDER BY c.created_at ASC
            `).all(comment.id);
            allRepliesMap.set(comment.id, replies);
        }

        // Batch-fetch badges for all comment + reply authors in a single query
        const allUserIds = new Set();
        for (const comment of comments) allUserIds.add(comment.user_id);
        for (const replies of allRepliesMap.values()) {
            for (const reply of replies) allUserIds.add(reply.user_id);
        }
        const badgesByUser = new Map();
        if (allUserIds.size > 0) {
            const placeholders = Array.from(allUserIds).map(() => '?').join(',');
            const badgeRows = await db.prepare(
                `SELECT user_id, badge_id FROM user_badges WHERE user_id IN (${placeholders}) ORDER BY earned_at ASC`
            ).all(...allUserIds);
            for (const row of badgeRows) {
                if (!badgesByUser.has(row.user_id)) badgesByUser.set(row.user_id, []);
                badgesByUser.get(row.user_id).push(row.badge_id);
            }
        }

        const commentsWithReactions = await Promise.all(comments.map(async comment => {
            const reactions = await db.prepare(`
                SELECT emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as user_ids
                FROM reactions WHERE comment_id = ? GROUP BY emoji
            `).all(comment.id);

            const badges = badgesByUser.get(comment.user_id) || [];
            const replies = allRepliesMap.get(comment.id) || [];

            const repliesWithReactions = await Promise.all(replies.map(async reply => {
                const rReactions = await db.prepare(`
                    SELECT emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as user_ids
                    FROM reactions WHERE comment_id = ? GROUP BY emoji
                `).all(reply.id);
                return { ...reply, reactions: rReactions, badges: badgesByUser.get(reply.user_id) || [] };
            }));

            return { ...comment, reactions, replies: repliesWithReactions, badges };
        }));

        return NextResponse.json({ 
            comments: commentsWithReactions, 
            hasMore: totalComments > offset + limit,
            total: totalComments
        });
    } catch (error) {
        console.error('GET /api/comments error:', error);
        return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const rateLimitResult = commentsRateLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
            );
        }

        const user = getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Kimlik doğrulaması gerekiyor' }, { status: 401 });
        }

        const db = await getDb();
        const dbUser = await db.prepare('SELECT banned_until FROM users WHERE id = ?').get(user.id);
        if (dbUser && dbUser.banned_until && new Date(dbUser.banned_until) > new Date()) {
            return NextResponse.json({
                error: `Yorum yapmanız engellendi. Engelin biteceği tarih: ${new Date(dbUser.banned_until).toLocaleString('tr-TR')}`
            }, { status: 403 });
        }

        const { chapterId, seriesId, content, parentId, isSpoiler, paragraphIndex } = await request.json();

        if (!content || (!chapterId && !seriesId)) {
            return NextResponse.json({ error: 'Content and either chapterId or seriesId are required' }, { status: 400 });
        }

        const trimmedContent = String(content).trim();

        if (trimmedContent.length === 0) {
            return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
        }

        if (trimmedContent.length > 2000) {
            return NextResponse.json({ error: 'Comment too long (max 2000 characters)' }, { status: 400 });
        }

        // before applying markdown transforms, preventing XSS without double-encoding.
        const result = await db.prepare(
            'INSERT INTO comments (user_id, chapter_id, series_id, content, parent_id, is_spoiler, paragraph_index) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(user.id, chapterId || null, seriesId || null, trimmedContent, parentId || null, isSpoiler ? 1 : 0, paragraphIndex !== undefined ? paragraphIndex : null);

        const comment = await db.prepare(`
            SELECT c.*, u.username, u.avatar_url, u.yomi_points,
            (SELECT rank FROM (SELECT id, DENSE_RANK() OVER (ORDER BY yomi_points DESC) as rank FROM users) WHERE id = c.user_id) as leaderboard_rank
            FROM comments c
            JOIN users u ON c.user_id = u.id WHERE c.id = ?
        `).get(result.lastInsertRowid);

        // Create notification for reply target
        if (parentId) {
            const parentComment = await db.prepare('SELECT user_id FROM comments WHERE id = ?').get(parentId);
            if (parentComment && parentComment.user_id !== user.id) {
                // Doğru link formatı - seri ve bölüm bilgisi ile
                let link = null;
                if (chapterId) {
                    // Bölüm yorumu ise bölüm sayfasına link ver
                    const chapterInfo = await db.prepare(`
                        SELECT c.chapter_number, s.slug as series_slug
                        FROM chapters c
                        JOIN series s ON c.series_id = s.id
                        WHERE c.id = ?
                    `).get(chapterId);
                    if (chapterInfo) {
                        link = `/seri/${chapterInfo.series_slug}/bolum/${chapterInfo.chapter_number}#comment-${result.lastInsertRowid}`;
                    } else {
                        link = `/read/${chapterId}#comment-${result.lastInsertRowid}`;
                    }
                } else if (seriesId) {
                    link = `/seri/${seriesId}#comment-${result.lastInsertRowid}`;
                }
                await db.prepare('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)').run(
                    parentComment.user_id,
                    'reply',
                    `${user.username} yorumunuza yanıt verdi`,
                    link
                );
            }
        }

        return NextResponse.json({ comment: { ...comment, reactions: [], replies: [] } }, { status: 201 });
    } catch (error) {
        console.error('POST /api/comments error:', error);
        return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
    }
}
