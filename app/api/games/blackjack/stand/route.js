import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { dealerPlay, handValue, isBust, BJ_WIN_PAYOUT } from '@/lib/blackjack';

// POST: { roundId } — oyuncu durur, krupiye 17'ye kadar kart çeker, sonuç belirlenir
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
        let dealerHand = JSON.parse(round.dealer_hand);

        dealerHand = dealerPlay(deck, dealerHand);

        const playerVal = handValue(playerHand).value;
        const dealerVal = handValue(dealerHand).value;

        let status, payout;
        if (isBust(dealerHand)) { status = 'won'; payout = Math.floor(round.bet_amount * BJ_WIN_PAYOUT); }
        else if (playerVal > dealerVal) { status = 'won'; payout = Math.floor(round.bet_amount * BJ_WIN_PAYOUT); }
        else if (playerVal < dealerVal) { status = 'lost'; payout = 0; }
        else { status = 'push'; payout = round.bet_amount; }

        const queries = [
            { sql: "UPDATE blackjack_rounds SET deck = ?, dealer_hand = ?, status = ?, payout = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ?", args: [JSON.stringify(deck), JSON.stringify(dealerHand), status, payout, round.id] },
        ];
        if (payout > 0) queries.push({ sql: 'UPDATE users SET yomi_points = yomi_points + ? WHERE id = ?', args: [payout, payload.id] });
        await db.batch(queries);

        const user = await db.prepare('SELECT yomi_points FROM users WHERE id = ?').get(payload.id);

        return NextResponse.json({
            success: true,
            playerHand,
            dealerHand,
            dealerHiddenCount: 0,
            status,
            payout,
            remainingPoints: user?.yomi_points ?? 0,
        });
    } catch (err) {
        console.error('blackjack/stand POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
