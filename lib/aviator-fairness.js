import 'server-only';
import crypto from 'crypto';
import { AVIATOR_MAX_MULTIPLIER, multiplierAtElapsed } from './aviator.js';

/**
 * Bustabit tarzı "provably fair" crash noktası üretimi.
 * HOUSE_EDGE oranında tur, 1.00x'te anında patlar (kasa avantajı);
 * geri kalanında kriptografik olarak güvenli rastgele bir sayıdan
 * ters orantılı bir crash_point türetilir. Böylece yüksek çarpanlar
 * matematiksel olarak giderek nadirleşir (gerçekçi crash-oyunu dağılımı).
 */
const HOUSE_EDGE = 0.04; // %4 kasa avantajı

export function generateCrashPoint() {
    // [0, 1) aralığında kriptografik olarak güvenli float
    const r = crypto.randomInt(0, 1_000_000_000) / 1_000_000_000;

    if (r < HOUSE_EDGE) return 1.00;

    const raw = (1 - HOUSE_EDGE) / (1 - r);
    const capped = Math.min(raw, AVIATOR_MAX_MULTIPLIER);
    return Math.floor(capped * 100) / 100;
}

/**
 * Kullanıcının aktif turunu getirir. Eğer üzerinden geçen süre, gizli
 * crash_point'i çoktan aşmışsa (kullanıcı zamanında çekmediyse), turu
 * 'crashed' olarak kapatır ve null döndürür — sunucu her zaman otoriter kaynak.
 */
export async function getActiveRoundResolved(db, userId) {
    const round = await db.prepare(
        "SELECT * FROM aviator_rounds WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1"
    ).get(userId);
    if (!round) return null;

    const startedAtIso = round.started_at.includes('T') ? round.started_at : round.started_at.replace(' ', 'T') + 'Z';
    const elapsedMs = Date.now() - new Date(startedAtIso).getTime();
    const currentMultiplier = multiplierAtElapsed(elapsedMs);

    if (currentMultiplier >= round.crash_point) {
        // Süre geçmiş, kullanıcı zamanında çekmemiş → tur patladı, puan yanar.
        await db.prepare(
            "UPDATE aviator_rounds SET status = 'crashed', payout = 0, ended_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(round.id);
        return null;
    }

    return { ...round, elapsedMs, currentMultiplier };
}
