// Aviator (uçak/crash) oyunu — istemci ve sunucu tarafından ORTAK kullanılan
// saf matematik fonksiyonları. Bu dosyada Node'a özel (crypto vb.) hiçbir
// import YOK — istemci tarafında animasyon için de import edilebilsin diye.
//
// Sunucu, tur başlarken gizli bir crash_point üretir (bkz. lib/aviator-fairness.js).
// Çarpan, geçen süreye göre üstel olarak artar: multiplier(t) = e^(GROWTH * t)
// GROWTH sabiti, çarpanın ~5 saniyede 2x'e ulaşacağı şekilde seçildi.

export const AVIATOR_GROWTH_PER_SEC = Math.log(2) / 5; // ≈ 0.1386
export const AVIATOR_MAX_MULTIPLIER = 1000; // güvenlik tavanı
export const AVIATOR_MIN_BET = 10;
export const AVIATOR_MAX_BET = 100000;

/** Geçen süreye (ms) göre o anki çarpanı hesaplar. */
export function multiplierAtElapsed(elapsedMs) {
    const t = Math.max(0, elapsedMs) / 1000;
    const m = Math.exp(AVIATOR_GROWTH_PER_SEC * t);
    return Math.min(m, AVIATOR_MAX_MULTIPLIER);
}

/** Belirli bir crash_point'e ulaşmak için geçmesi gereken süreyi (ms) hesaplar. */
export function elapsedMsForMultiplier(multiplier) {
    const m = Math.max(1, multiplier);
    return (Math.log(m) / AVIATOR_GROWTH_PER_SEC) * 1000;
}

/** 2 ondalık basamağa yuvarlar (ör. çarpan gösterimi için). */
export function round2(n) {
    return Math.round(n * 100) / 100;
}
