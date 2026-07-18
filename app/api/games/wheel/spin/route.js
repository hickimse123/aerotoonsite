import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { spinWheel } from '@/lib/wheel-fairness';
import { WHEEL_SEGMENTS, WHEEL_MIN_BET, WHEEL_MAX_BET } from '@/lib/wheel';

// POST: { betAmount } — bahsi düş, çarkı çevir, sonucu anında öde
export async function POST(request) {
    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { betAmount } = await request.json();
        const bet = Math.round(Number(betAmount));
        if (!Number.isFinite(bet) || bet < WHEEL_MIN_BET || bet > WHEEL_MAX_BET) {
            return NextResponse.json({ error: `Bahis ${WHEEL_MIN_BET} ile ${WHEEL_MAX_BET} arasında olmalı` }, { status: 400 });
        }

        const user = await db.prepare('SELECT id, yomi_points, banned_until FROM users WHERE id = ?').get(payload.id);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
        if (user.banned_until) {
            const until = new Date(user.banned_until + (user.banned_until.includes('T') ? '' : 'Z'));
            if (until > new Date()) return NextResponse.json({ error: 'Hesabınız askıya alınmış' }, { status: 403 });
        }
        if ((user.yomi_points || 0) < bet) {
            return NextResponse.json({ error: 'Yetersiz puan' }, { status: 400 });
        }

        const segmentIndex = spinWheel();
        const seg = WHEEL_SEGMENTS[segmentIndex];
        const payout = Math.floor(bet * seg.multiplier);
        const net = payout - bet;

        await db.batch([
            { sql: 'UPDATE users SET yomi_points = yomi_points + ? WHERE id = ?', args: [net, user.id] },
            { sql: 'INSERT INTO wheel_spins (user_id, bet_amount, segment_index, multiplier, payout) VALUES (?, ?, ?, ?, ?)', args: [user.id, bet, segmentIndex, seg.multiplier, payout] },
        ]);

        return NextResponse.json({
            success: true,
            segmentIndex,
            multiplier: seg.multiplier,
            payout,
            remainingPoints: (user.yomi_points || 0) + net,
        });
    } catch (err) {
        console.error('wheel/spin POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
