import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser } from '@/lib/auth';
import { getActiveRoundResolved } from '@/lib/aviator-fairness';

// GET: kullanıcının aktif turu var mı? (sayfa yenilenmesine karşı dayanıklılık)
export async function GET(request) {
    try {
        const db = await getDb();
        const auth = await getVerifiedUser(request, db);
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const active = await getActiveRoundResolved(db, auth.user.id);

        const history = await db.prepare(
            "SELECT id, bet_amount, status, cashout_multiplier, payout, started_at, ended_at FROM aviator_rounds WHERE user_id = ? AND status != 'active' ORDER BY id DESC LIMIT 10"
        ).all(auth.user.id);

        return NextResponse.json({
            success: true,
            active: active ? {
                roundId: active.id,
                betAmount: active.bet_amount,
                startedAt: active.started_at,
            } : null,
            points: auth.user.yomi_points,
            history,
        });
    } catch (err) {
        console.error('aviator/state GET error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
