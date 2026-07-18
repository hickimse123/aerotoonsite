import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { minesMultiplier, round2 } from '@/lib/mines';

// POST: { roundId, cell } — bir kareyi aç; mayınsa tur biter, güvenliyse çarpan güncellenir
export async function POST(request) {
    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { roundId, cell } = await request.json();
        const cellIdx = Number(cell);

        const round = await db.prepare("SELECT * FROM mines_rounds WHERE id = ? AND user_id = ? AND status = 'active'").get(roundId, payload.id);
        if (!round) return NextResponse.json({ error: 'Aktif bir turunuz yok' }, { status: 400 });
        if (!Number.isInteger(cellIdx) || cellIdx < 0 || cellIdx >= round.grid_size) {
            return NextResponse.json({ error: 'Geçersiz kare' }, { status: 400 });
        }

        const minePositions = JSON.parse(round.mine_positions);
        const revealed = JSON.parse(round.revealed);
        if (revealed.includes(cellIdx)) return NextResponse.json({ error: 'Bu kare zaten açık' }, { status: 400 });

        if (minePositions.includes(cellIdx)) {
            // Mayına bastı — tur biter, bahis yanar, tüm mayınlar açığa çıkar
            await db.prepare("UPDATE mines_rounds SET status = 'busted', payout = 0, ended_at = CURRENT_TIMESTAMP WHERE id = ?").run(round.id);
            return NextResponse.json({
                success: true,
                hitMine: true,
                minePositions,
                revealed,
                payout: 0,
            });
        }

        const newRevealed = [...revealed, cellIdx];
        const multiplier = round2(minesMultiplier(newRevealed.length, round.grid_size, round.mine_count));
        const potentialPayout = Math.floor(round.bet_amount * multiplier);
        const allSafeRevealed = newRevealed.length === round.grid_size - round.mine_count;

        if (allSafeRevealed) {
            // Tüm güvenli kareler açıldı — otomatik olarak en yüksek çarpandan öde
            await db.batch([
                { sql: "UPDATE mines_rounds SET revealed = ?, status = 'cashed', payout = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ?", args: [JSON.stringify(newRevealed), potentialPayout, round.id] },
                { sql: 'UPDATE users SET yomi_points = yomi_points + ? WHERE id = ?', args: [potentialPayout, payload.id] },
            ]);
            const user = await db.prepare('SELECT yomi_points FROM users WHERE id = ?').get(payload.id);
            return NextResponse.json({
                success: true,
                hitMine: false,
                revealed: newRevealed,
                multiplier,
                potentialPayout,
                cleared: true,
                minePositions,
                remainingPoints: user?.yomi_points ?? 0,
            });
        }

        await db.prepare('UPDATE mines_rounds SET revealed = ? WHERE id = ?').run(JSON.stringify(newRevealed), round.id);
        return NextResponse.json({
            success: true,
            hitMine: false,
            revealed: newRevealed,
            multiplier,
            potentialPayout,
            cleared: false,
        });
    } catch (err) {
        console.error('mines/reveal POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
