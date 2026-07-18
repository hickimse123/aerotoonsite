import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { spinSlots } from '@/lib/slots-fairness';
import { calcSlotMultiplier, SLOT_MIN_BET, SLOT_MAX_BET } from '@/lib/slots';

// POST: { betAmount } — bahsi düş, makaraları çevir, sonucu anında öde
export async function POST(request) {
    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { betAmount } = await request.json();
        const bet = Math.round(Number(betAmount));
        if (!Number.isFinite(bet) || bet < SLOT_MIN_BET || bet > SLOT_MAX_BET) {
            return NextResponse.json({ error: `Bahis ${SLOT_MIN_BET} ile ${SLOT_MAX_BET} arasında olmalı` }, { status: 400 });
        }

        const user = await db.prepare('SELECT id, yomi_points, banned_until FROM users WHERE id = ?').get(payload.id);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
        if (user.banned_until) {
            const until = new Date(user.banned_until + (user.banned_until.includes('T') ? '' : 'Z'));
            if (until > new Date()) return NextResponse.json({ error: 'Hesabınız askıya alınmış' }, { status: 403 });
        }
        if ((user.yomi_points || 0) < bet) return NextResponse.json({ error: 'Yetersiz puan' }, { status: 400 });

        const symbols = spinSlots();
        const multiplier = calcSlotMultiplier(symbols);
        const payout = Math.floor(bet * multiplier);
        const net = payout - bet;

        await db.batch([
            { sql: 'UPDATE users SET yomi_points = yomi_points + ? WHERE id = ?', args: [net, user.id] },
            { sql: 'INSERT INTO slot_spins (user_id, bet_amount, symbols, payout) VALUES (?, ?, ?, ?)', args: [user.id, bet, JSON.stringify(symbols), payout] },
        ]);

        return NextResponse.json({
            success: true,
            symbols,
            multiplier,
            payout,
            remainingPoints: (user.yomi_points || 0) + net,
        });
    } catch (err) {
        console.error('slots/spin POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
