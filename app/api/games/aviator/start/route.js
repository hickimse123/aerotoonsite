import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser } from '@/lib/auth';
import { generateCrashPoint, getActiveRoundResolved } from '@/lib/aviator-fairness';
import { AVIATOR_MIN_BET, AVIATOR_MAX_BET } from '@/lib/aviator';

// POST: { betAmount } — bahsi düş, yeni tur başlat
export async function POST(request) {
    try {
        const db = await getDb();
        const auth = await getVerifiedUser(request, db);
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const { betAmount } = await request.json();
        const bet = Math.round(Number(betAmount));

        if (!Number.isFinite(bet) || bet < AVIATOR_MIN_BET || bet > AVIATOR_MAX_BET) {
            return NextResponse.json({ error: `Bahis ${AVIATOR_MIN_BET} ile ${AVIATOR_MAX_BET} arasında olmalı` }, { status: 400 });
        }

        // Zaten aktif bir tur varsa (ve gerçekten hâlâ aktifse) yeni tur başlatma
        const existingActive = await getActiveRoundResolved(db, auth.user.id);
        if (existingActive) {
            return NextResponse.json({ error: 'Zaten devam eden bir turunuz var' }, { status: 400 });
        }

        // getVerifiedUser zaten güncel yomi_points'i getirdi — ayrı bir SELECT'e gerek yok.
        if ((auth.user.yomi_points || 0) < bet) {
            return NextResponse.json({ error: 'Yetersiz puan' }, { status: 400 });
        }

        const crashPoint = generateCrashPoint();
        // Sunucunun kendi saatiyle damgalıyoruz; DB'deki CURRENT_TIMESTAMP'i geri okumak
        // için ekstra bir round-trip harcamıyoruz (cashout anında sunucu kendi kayıtlı
        // started_at değerini otoriter kaynak olarak kullanıyor, burası sadece animasyon içindir).
        const startedAt = new Date().toISOString();

        // İki yazma işlemini (puan düşme + tur açma) TEK ağ isteğinde birleştir.
        const [, insertResult] = await db.batch([
            { sql: 'UPDATE users SET yomi_points = yomi_points - ? WHERE id = ?', args: [bet, auth.user.id] },
            { sql: "INSERT INTO aviator_rounds (user_id, bet_amount, crash_point, status, started_at) VALUES (?, ?, ?, 'active', ?)", args: [auth.user.id, bet, crashPoint, startedAt.replace('T', ' ').replace('Z', '')] },
        ]);

        return NextResponse.json({
            success: true,
            roundId: insertResult.lastInsertRowid,
            startedAt,
            betAmount: bet,
            remainingPoints: (auth.user.yomi_points || 0) - bet,
        });
    } catch (err) {
        console.error('aviator/start POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
