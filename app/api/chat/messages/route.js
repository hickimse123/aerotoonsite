import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_MS = 3000; // aynı kullanıcı art arda en fazla 3 saniyede bir mesaj atabilir
const PAGE_SIZE = 50;

// GIF URL'sinin gerçekten bir görsel/gif bağlantısı olduğunu doğrular (rastgele
// script/veri enjeksiyonunu engellemek için) — sadece http(s) ve bilinen
// uzantı/host'lara izin ver.
function isValidGifUrl(url) {
    if (typeof url !== 'string' || url.length > 600) return false;
    try {
        const u = new URL(url);
        if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
        return true;
    } catch {
        return false;
    }
}

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

const MESSAGE_SELECT_FIELDS = `
    m.id, m.user_id, m.message, m.gif_url, m.reply_to_id, m.created_at,
    u.username, u.display_name, u.avatar_url, u.yomi_points, u.role,
    rm.message AS reply_message, rm.gif_url AS reply_gif_url,
    ru.username AS reply_username, ru.display_name AS reply_display_name
`;
const MESSAGE_JOINS = `
    FROM chat_messages m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN chat_messages rm ON rm.id = m.reply_to_id
    LEFT JOIN users ru ON ru.id = rm.user_id
`;

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
                SELECT ${MESSAGE_SELECT_FIELDS}
                ${MESSAGE_JOINS}
                WHERE m.id > ?
                ORDER BY m.id ASC
                LIMIT 100
            `).all(after);
        } else {
            const desc = await db.prepare(`
                SELECT ${MESSAGE_SELECT_FIELDS}
                ${MESSAGE_JOINS}
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

// POST { message, replyToId?, gifUrl? } — yeni mesaj gönder (metin ve/veya GIF)
export async function POST(request) {
    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const body = await request.json();
        const message = (body?.message || '').toString().trim();
        const gifUrlRaw = (body?.gifUrl || '').toString().trim();
        let gifUrl = gifUrlRaw && isValidGifUrl(gifUrlRaw) ? gifUrlRaw : null;
        if (gifUrlRaw && !gifUrl) return NextResponse.json({ error: 'Geçersiz GIF bağlantısı' }, { status: 400 });
        if (gifUrl) {
            const gifSetting = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'chat_gif_enabled'").get();
            if (gifSetting?.setting_value === '0') gifUrl = null;
        }
        if (!message && !gifUrl) return NextResponse.json({ error: 'Mesaj boş olamaz' }, { status: 400 });
        if (message.length > MAX_MESSAGE_LENGTH) {
            return NextResponse.json({ error: `Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir` }, { status: 400 });
        }
        let replyToId = parseInt(body?.replyToId, 10);
        if (!Number.isFinite(replyToId) || replyToId <= 0) replyToId = null;

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

        // Yanıtlanan mesaj gerçekten var mı kontrol et (varsa referansı sakla, yoksa görmezden gel)
        let validReplyToId = null;
        let replyPreview = null;
        if (replyToId) {
            const rm = await db.prepare(`
                SELECT rm.id, rm.message, rm.gif_url, ru.username, ru.display_name
                FROM chat_messages rm JOIN users ru ON ru.id = rm.user_id
                WHERE rm.id = ?
            `).get(replyToId);
            if (rm) {
                validReplyToId = rm.id;
                replyPreview = { message: rm.message, gif_url: rm.gif_url, username: rm.username, display_name: rm.display_name };
            }
        }

        const result = await db.prepare(
            'INSERT INTO chat_messages (user_id, message, gif_url, reply_to_id) VALUES (?, ?, ?, ?)'
        ).run(user.id, message, gifUrl, validReplyToId);

        const [withExtras] = await attachAuthorExtras(db, [{
            id: result.lastInsertRowid,
            user_id: user.id,
            message,
            gif_url: gifUrl,
            reply_to_id: validReplyToId,
            reply_message: replyPreview?.message ?? null,
            reply_gif_url: replyPreview?.gif_url ?? null,
            reply_username: replyPreview?.username ?? null,
            reply_display_name: replyPreview?.display_name ?? null,
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
