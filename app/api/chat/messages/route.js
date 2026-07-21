import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_MS = 3000; // aynı kullanıcı art arda en fazla 3 saniyede bir mesaj atabilir
const PAGE_SIZE = 50;

// Bir grup mesajın yazarlarına ait özel rozetleri (user_badges) tek seferde
// (batch) çekip her mesaja iliştirir — comments API'deki aynı desen.
async function attachAuthorExtras(db, messages) {
    if (messages.length === 0) return messages;

    const userIds = new Set(messages.map(m => m.user_id));
    const badgesByUser = new Map();
    if (userIds.size > 0) {
        const placeholders = Array.from(userIds).map(() => '?').join(',');
        const rows = await db.prepare(
            `SELECT user_id, badge_id FROM user_badges WHERE user_id IN (${placeholders}) ORDER BY earned_at ASC`
        ).all(...userIds);
        for (const row of rows) {
            if (!badgesByUser.has(row.user_id)) badgesByUser.set(row.user_id, []);
            badgesByUser.get(row.user_id).push(row.badge_id);
        }
    }

    return messages.map(m => ({
        ...m,
        badges: badgesByUser.get(m.user_id) || [],
    }));
}

// GET ?after=<id> — after verilirse sadece o id'den sonraki (yeni) mesajlar döner (polling için).
// verilmezse en son PAGE_SIZE mesaj döner.
export async function GET(request) {
    try {
        const db = await getDb();
        const { searchParams } = new URL(request.url);
        const after = parseInt(searchParams.get('after') || '', 10);

        let rows;
        if (Number.isFinite(after)) {
            rows = await db.prepare(`
                SELECT m.id, m.user_id, m.message, m.created_at,
                       u.username, u.display_name, u.avatar_url, u.yomi_points, u.role
                FROM chat_messages m
                JOIN users u ON u.id = m.user_id
                WHERE m.id > ?
                ORDER BY m.id ASC
                LIMIT 100
            `).all(after);
        } else {
            const desc = await db.prepare(`
                SELECT m.id, m.user_id, m.message, m.created_at,
                       u.username, u.display_name, u.avatar_url, u.yomi_points, u.role
                FROM chat_messages m
                JOIN users u ON u.id = m.user_id
                ORDER BY m.id DESC
                LIMIT ?
            `).all(PAGE_SIZE);
            rows = desc.reverse();
        }

        const messages = await attachAuthorExtras(db, rows);
        return NextResponse.json({ success: true, messages });
    } catch (err) {
        console.error('chat/messages GET error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}

// POST { message } — yeni mesaj gönder
export async function POST(request) {
    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const body = await request.json();
        const message = (body?.message || '').toString().trim();
        if (!message) return NextResponse.json({ error: 'Mesaj boş olamaz' }, { status: 400 });
        if (message.length > MAX_MESSAGE_LENGTH) {
            return NextResponse.json({ error: `Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir` }, { status: 400 });
        }

        // Kullanıcı satırı + son mesaj zamanı (spam kontrolü) birbirinden
        // bağımsız okumalar — paralel çalıştırıp bir round-trip kazanıyoruz.
        const [user, lastMsg] = await Promise.all([
            db.prepare(`
                SELECT id, username, display_name, avatar_url, yomi_points, role, banned_until
                FROM users WHERE id = ?
            `).get(payload.id),
            db.prepare('SELECT created_at FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(payload.id),
        ]);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
        if (user.banned_until) {
            const until = new Date(user.banned_until + (user.banned_until.includes('T') ? '' : 'Z'));
            if (until > new Date()) return NextResponse.json({ error: 'Hesabınız askıya alınmış' }, { status: 403 });
        }
        if (lastMsg?.created_at) {
            const lastMs = new Date(lastMsg.created_at.includes('T') ? lastMsg.created_at : lastMsg.created_at.replace(' ', 'T') + 'Z').getTime();
            const elapsed = Date.now() - lastMs;
            if (elapsed < RATE_LIMIT_MS) {
                return NextResponse.json({ error: 'Çok hızlı mesaj gönderiyorsunuz, biraz yavaşlayın' }, { status: 429 });
            }
        }

        const result = await db.prepare(
            'INSERT INTO chat_messages (user_id, message) VALUES (?, ?)'
        ).run(user.id, message);

        const [withExtras] = await attachAuthorExtras(db, [{
            id: result.lastInsertRowid,
            user_id: user.id,
            message,
            created_at: new Date().toISOString(),
            username: user.username,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            yomi_points: user.yomi_points,
            role: user.role,
        }]);

        return NextResponse.json({ success: true, message: withExtras });
    } catch (err) {
        console.error('chat/messages POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
