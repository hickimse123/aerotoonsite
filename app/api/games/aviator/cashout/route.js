import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { getActiveRoundResolved } from '@/lib/aviator-fairness';
import { round2 } from '@/lib/aviator';

// POST: aktif turu, o anki çarpandan çek
export async function POST(request) {
    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        // Kullanıcı satırı ile aktif tur kontrolü birbirinden bağımsız — PARALEL çalıştır.
        const [user, active] = await Promise.all([
            db.prepare('SELECT id, yomi_points FROM users WHERE id = ?').get(payload.id),
            getActiveRoundResolved(db, payload.id),
        ]);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

        // getActiveRoundResolved zaten geç kalınmışsa turu 'crashed' yapıp null döner —
        // bu da tek başına adil bir "kaçırdın" sonucu üretir.
        if (!active) {
            return NextResponse.json({ error: 'Aktif bir turunuz yok (uçak düşmüş olabilir)', crashed: true }, { status: 400 });
        }

        const multiplier = round2(active.currentMultiplier);
        const payout = Math.floor(active.bet_amount * multiplier);

        await db.batch([
            { sql: "UPDATE aviator_rounds SET status = 'cashed', cashout_multiplier = ?, payout = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ?", args: [multiplier, payout, active.id] },
            { sql: 'UPDATE users SET yomi_points = yomi_points + ? WHERE id = ?', args: [payout, user.id] },
        ]);

        return NextResponse.json({
            success: true,
            multiplier,
            payout,
            remainingPoints: (user.yomi_points || 0) + payout,
        });
    } catch (err) {
        console.error('aviator/cashout POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
