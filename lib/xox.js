// XOX (tic-tac-toe) — kullanıcı 'x', bot 'o' oynar. Saf mantık, crypto YOK
// (sunucu tarafında rastgelelik için Math.random yeterli, adil hile riski
// aviator/mines gibi kritik değil — çünkü kazanç oranı sabit oyun kurallarıyla
// belirleniyor, gizli bir "sonuç" üretilmiyor).

export const XOX_MIN_BET = 10;
export const XOX_MAX_BET = 100000;
export const XOX_WIN_MULTIPLIER = 1.8; // kazanınca 1.8x öde (kasa avantajı)

const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
];

/** 'x' | 'o' | 'draw' | null (oyun devam ediyor) */
export function checkResult(board) {
    for (const [a, b, c] of LINES) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    if (board.every(c => c !== null)) return 'draw';
    return null;
}

/** Basit sezgisel bot: kazanacaksa oyna, engellemesi gerekiyorsa engelle, yoksa merkez/köşe/rastgele. */
export function botMove(board) {
    const empty = board.map((c, i) => (c === null ? i : null)).filter(i => i !== null);
    if (empty.length === 0) return -1;

    // 1) Kazanma hamlesi var mı?
    for (const i of empty) {
        const copy = [...board]; copy[i] = 'o';
        if (checkResult(copy) === 'o') return i;
    }
    // 2) Rakibin kazanma hamlesini engelle
    for (const i of empty) {
        const copy = [...board]; copy[i] = 'x';
        if (checkResult(copy) === 'x') return i;
    }
    // 3) Merkez boşsa al
    if (board[4] === null) return 4;
    // 4) Köşe tercih et
    const corners = [0, 2, 6, 8].filter(i => board[i] === null);
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
    // 5) Kalan rastgele
    return empty[Math.floor(Math.random() * empty.length)];
}
