import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { isBust } from '@/lib/blackjack';

// POST: { roundId } — oyuncuya bir kart daha çektir
export async function POST(request) {
    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { roundId } = await request.json();
        const round = await db.prepare("SELECT * FROM blackjack_rounds WHERE id = ? AND user_id = ? AND status = 'active'").get(roundId, payload.id);
        if (!round) return NextResponse.json({ error: 'Aktif bir turunuz yok' }, { status: 400 });

        const deck = JSON.parse(round.deck);
        const playerHand = JSON.parse(round.player_hand);
        const dealerHand = JSON.parse(round.dealer_hand);

        if (deck.length === 0) return NextResponse.json({ error: 'Deste tükendi' }, { status: 400 });
        playerHand.push(deck.pop());

        if (isBust(playerHand)) {
            await db.prepare("UPDATE blackjack_rounds SET deck = ?, player_hand = ?, status = 'lost', payout = 0, ended_at = CURRENT_TIMESTAMP WHERE id = ?")
                .run(JSON.stringify(deck), JSON.stringify(playerHand), round.id);
            return NextResponse.json({
                success: true,
                playerHand,
                dealerHand,
                dealerHiddenCount: 0,
                status: 'lost',
                payout: 0,
                bust: true,
            });
        }

        await db.prepare('UPDATE blackjack_rounds SET deck = ?, player_hand = ? WHERE id = ?')
            .run(JSON.stringify(deck), JSON.stringify(playerHand), round.id);

        return NextResponse.json({
            success: true,
            playerHand,
            dealerHand: [dealerHand[0]],
            dealerHiddenCount: 1,
            status: 'active',
        });
    } catch (err) {
        console.error('blackjack/hit POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
