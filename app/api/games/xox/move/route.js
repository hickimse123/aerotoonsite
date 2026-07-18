import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { checkResult, botMove, XOX_WIN_MULTIPLIER } from '@/lib/xox';

// POST: { roundId, cell } — oyuncu hamlesi, ardından (bitmediyse) bot hamlesi
export async function POST(request) {
    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { roundId, cell } = await request.json();
        const cellIdx = Number(cell);
        if (!Number.isInteger(cellIdx) || cellIdx < 0 || cellIdx > 8) {
            return NextResponse.json({ error: 'Geçersiz hücre' }, { status: 400 });
        }

        const round = await db.prepare("SELECT * FROM xox_rounds WHERE id = ? AND user_id = ? AND status = 'active'").get(roundId, payload.id);
        if (!round) return NextResponse.json({ error: 'Aktif bir turunuz yok' }, { status: 400 });

        const board = JSON.parse(round.board);
        if (board[cellIdx] !== null) return NextResponse.json({ error: 'Bu hücre dolu' }, { status: 400 });

        board[cellIdx] = 'x';
        let outcome = checkResult(board);
        let botMoveIdx = null;

        if (!outcome) {
            botMoveIdx = botMove(board);
            if (botMoveIdx !== -1) board[botMoveIdx] = 'o';
            outcome = checkResult(board);
        }

        if (!outcome) {
            // Oyun devam ediyor — sadece tahtayı kaydet
            await db.prepare('UPDATE xox_rounds SET board = ? WHERE id = ?').run(JSON.stringify(board), round.id);
            return NextResponse.json({ success: true, board, botMove: botMoveIdx, status: 'active' });
        }

        // Oyun bitti: kazanç hesapla
        let payout = 0;
        let status = 'lost';
        if (outcome === 'x') { payout = Math.floor(round.bet_amount * XOX_WIN_MULTIPLIER); status = 'won'; }
        else if (outcome === 'draw') { payout = round.bet_amount; status = 'draw'; }
        else { payout = 0; status = 'lost'; }

        const queries = [
            { sql: "UPDATE xox_rounds SET board = ?, status = ?, payout = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ?", args: [JSON.stringify(board), status, payout, round.id] },
        ];
        if (payout > 0) queries.push({ sql: 'UPDATE users SET yomi_points = yomi_points + ? WHERE id = ?', args: [payout, payload.id] });
        await db.batch(queries);

        const user = await db.prepare('SELECT yomi_points FROM users WHERE id = ?').get(payload.id);

        return NextResponse.json({
            success: true,
            board,
            botMove: botMoveIdx,
            status,
            outcome,
            payout,
            remainingPoints: user?.yomi_points ?? 0,
        });
    } catch (err) {
        console.error('xox/move POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
