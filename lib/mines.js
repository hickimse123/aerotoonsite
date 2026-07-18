// Mayın Tarlası (mines) — istemci ve sunucu tarafından ORTAK kullanılan saf
// matematik. Node'a özel hiçbir import YOK, istemci tarafında olası ödülü
// canlı göstermek için de kullanılabilsin diye (sunucu her zaman otoriter kaynak).

export const MINES_GRID_SIZE = 36; // 6x6
export const MINES_MINE_COUNT = 6;
export const MINES_MIN_BET = 10;
export const MINES_MAX_BET = 100000;
export const MINES_HOUSE_EDGE = 0.97; // %3 kasa avantajı

/**
 * k adet güvenli kare açıldığında, N karelik ve M mayınlı bir tahtada
 * "adil" (kasa avantajsız) çarpan: her adımda kalan güvenli/kalan toplam
 * oranının tersinin çarpımı. Kasa avantajı sabit bir faktörle uygulanır.
 */
export function minesMultiplier(revealedCount, totalTiles = MINES_GRID_SIZE, mineCount = MINES_MINE_COUNT) {
    if (revealedCount <= 0) return 1;
    let m = 1;
    for (let i = 0; i < revealedCount; i++) {
        m *= (totalTiles - i) / (totalTiles - mineCount - i);
    }
    return m * MINES_HOUSE_EDGE;
}

/** 2 ondalık basamağa yuvarlar (ör. çarpan gösterimi için). */
export function round2(n) {
    return Math.round(n * 100) / 100;
}
