import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { minesMultiplier, round2 } from '@/lib/mines';

// POST: { roundId } — o ana kadar açılan güvenli karelerin çarpanından çek
export async function POST(request) {
    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { roundId } = await request.json();
        const round = await db.prepare("SELECT * FROM mines_rounds WHERE id = ? AND user_id = ? AND status = 'active'").get(roundId, payload.id);
        if (!round) return NextResponse.json({ error: 'Aktif bir turunuz yok' }, { status: 400 });

        const revealed = JSON.parse(round.revealed);
        if (revealed.length === 0) return NextResponse.json({ error: 'Önce en az bir kare açmalısın' }, { status: 400 });

        const multiplier = round2(minesMultiplier(revealed.length, round.grid_size, round.mine_count));
        const payout = Math.floor(round.bet_amount * multiplier);
        const minePositions = JSON.parse(round.mine_positions);

        await db.batch([
            { sql: "UPDATE mines_rounds SET status = 'cashed', payout = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ?", args: [payout, round.id] },
            { sql: 'UPDATE users SET yomi_points = yomi_points + ? WHERE id = ?', args: [payout, payload.id] },
        ]);

        const user = await db.prepare('SELECT yomi_points FROM users WHERE id = ?').get(payload.id);
        return NextResponse.json({ success: true, multiplier, payout, minePositions, remainingPoints: user?.yomi_points ?? 0 });
    } catch (err) {
        console.error('mines/cashout POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
