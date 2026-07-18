import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { XOX_MIN_BET, XOX_MAX_BET } from '@/lib/xox';

// POST: { betAmount } — bahsi düş, yeni tur başlat (boş tahta, sıra oyuncuda)
export async function POST(request) {
    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { betAmount } = await request.json();
        const bet = Math.round(Number(betAmount));
        if (!Number.isFinite(bet) || bet < XOX_MIN_BET || bet > XOX_MAX_BET) {
            return NextResponse.json({ error: `Bahis ${XOX_MIN_BET} ile ${XOX_MAX_BET} arasında olmalı` }, { status: 400 });
        }

        const [user, existingActive] = await Promise.all([
            db.prepare('SELECT id, yomi_points, banned_until FROM users WHERE id = ?').get(payload.id),
            db.prepare("SELECT id FROM xox_rounds WHERE user_id = ? AND status = 'active' LIMIT 1").get(payload.id),
        ]);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
        if (user.banned_until) {
            const until = new Date(user.banned_until + (user.banned_until.includes('T') ? '' : 'Z'));
            if (until > new Date()) return NextResponse.json({ error: 'Hesabınız askıya alınmış' }, { status: 403 });
        }
        if (existingActive) return NextResponse.json({ error: 'Zaten devam eden bir turunuz var' }, { status: 400 });
        if ((user.yomi_points || 0) < bet) return NextResponse.json({ error: 'Yetersiz puan' }, { status: 400 });

        const emptyBoard = JSON.stringify(Array(9).fill(null));
        const [, insertResult] = await db.batch([
            { sql: 'UPDATE users SET yomi_points = yomi_points - ? WHERE id = ?', args: [bet, user.id] },
            { sql: "INSERT INTO xox_rounds (user_id, bet_amount, board, status) VALUES (?, ?, ?, 'active')", args: [user.id, bet, emptyBoard] },
        ]);

        return NextResponse.json({
            success: true,
            roundId: insertResult.lastInsertRowid,
            board: JSON.parse(emptyBoard),
            betAmount: bet,
            remainingPoints: (user.yomi_points || 0) - bet,
        });
    } catch (err) {
        console.error('xox/start POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
