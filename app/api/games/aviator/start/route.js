import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { generateCrashPoint, getActiveRoundResolved } from '@/lib/aviator-fairness';
import { AVIATOR_MIN_BET, AVIATOR_MAX_BET } from '@/lib/aviator';

// POST: { betAmount } — bahsi düş, yeni tur başlat
export async function POST(request) {
    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { betAmount } = await request.json();
        const bet = Math.round(Number(betAmount));

        if (!Number.isFinite(bet) || bet < AVIATOR_MIN_BET || bet > AVIATOR_MAX_BET) {
            return NextResponse.json({ error: `Bahis ${AVIATOR_MIN_BET} ile ${AVIATOR_MAX_BET} arasında olmalı` }, { status: 400 });
        }

        // Kullanıcı satırı ile "zaten aktif tur var mı" kontrolü birbirinden bağımsız
        // okumalar (ikisi de sadece JWT'den çözülen id'ye ihtiyaç duyuyor) — sırayla
        // değil PARALEL çalıştırıp bir ağ round-trip'i daha kazanıyoruz.
        const [user, existingActive] = await Promise.all([
            db.prepare('SELECT id, yomi_points, banned_until FROM users WHERE id = ?').get(payload.id),
            getActiveRoundResolved(db, payload.id),
        ]);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
        if (user.banned_until) {
            const until = new Date(user.banned_until + (user.banned_until.includes('T') ? '' : 'Z'));
            if (until > new Date()) return NextResponse.json({ error: 'Account suspended', status: 403 }, { status: 403 });
        }
        if (existingActive) {
            return NextResponse.json({ error: 'Zaten devam eden bir turunuz var' }, { status: 400 });
        }
        if ((user.yomi_points || 0) < bet) {
            return NextResponse.json({ error: 'Yetersiz puan' }, { status: 400 });
        }

        const crashPoint = generateCrashPoint();
        // Sunucunun kendi saatiyle damgalıyoruz; DB'deki CURRENT_TIMESTAMP'i geri okumak
        // için ekstra bir round-trip harcamıyoruz (cashout anında sunucu kendi kayıtlı
        // started_at değerini otoriter kaynak olarak kullanıyor, burası sadece animasyon içindir).
        const startedAt = new Date().toISOString();

        // İki yazma işlemini (puan düşme + tur açma) TEK ağ isteğinde birleştir.
        const [, insertResult] = await db.batch([
            { sql: 'UPDATE users SET yomi_points = yomi_points - ? WHERE id = ?', args: [bet, user.id] },
            { sql: "INSERT INTO aviator_rounds (user_id, bet_amount, crash_point, status, started_at) VALUES (?, ?, ?, 'active', ?)", args: [user.id, bet, crashPoint, startedAt.replace('T', ' ').replace('Z', '')] },
        ]);

        return NextResponse.json({
            success: true,
            roundId: insertResult.lastInsertRowid,
            startedAt,
            betAmount: bet,
            remainingPoints: (user.yomi_points || 0) - bet,
        });
    } catch (err) {
        console.error('aviator/start POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
