export const CULTIVATION_RANKS = [
    // En yüksek rütbeler (yüksekten düşüğe doğru)
    {
        title: 'Ölümsüz İmparator',
        minPoints: 10000,
        color: '#ffd700',
        progressColor: 'linear-gradient(90deg, #ffd700, #ffec6e)',
        icon: 'crown',
        description: 'Yomi dünyasının en yüce varlığı',
        badge: 'immortal_emperor',
    },
    {
        title: 'Gök Cenneti Azizi',
        minPoints: 5000,
        color: '#e879f9',
        progressColor: 'linear-gradient(90deg, #e879f9, #f0abfc)',
        icon: 'sparkle',
        description: 'Gök katmanlarını aşmış efsanevi ruh',
        badge: 'heaven_saint',
    },
    {
        title: 'Cennet Büyükustası',
        minPoints: 1500,
        color: '#f87171',
        progressColor: 'linear-gradient(90deg, #f87171, #fca5a5)',
        icon: 'flame',
        description: 'Cennetin sırlarını keşfeden güçlü usta',
        badge: null,
    },
    {
        title: 'Uyanış Ruhu',
        minPoints: 500,
        color: '#a855f7',
        progressColor: 'linear-gradient(90deg, #a855f7, #c084fc)',
        icon: 'zap',
        description: 'Ruhunu uyandırmış, gücü büyüyen yolcu',
        badge: null,
    },
    {
        title: 'Öz Oluşumu',
        minPoints: 200,
        color: '#3b82f6',
        progressColor: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
        icon: 'waves',
        description: 'Özünü şekillendiren kararlı ruh',
        badge: null,
    },
    {
        title: 'Enerji Yoğunlaşması',
        minPoints: 50,
        color: '#22c55e',
        progressColor: 'linear-gradient(90deg, #22c55e, #4ade80)',
        icon: 'bolt',
        description: 'Enerjisini yoğunlaştırmayı öğrenen genç yetenekli',
        badge: null,
    },
    {
        title: 'Çırak',
        minPoints: 0,
        color: '#6b7280',
        progressColor: 'linear-gradient(90deg, #6b7280, #9ca3af)',
        icon: 'book',
        description: 'Yolculuğuna yeni başlayan meraklı okuyucu',
        badge: null,
    },
];

export function getCultivationData(yomiPoints) {
    const points = yomiPoints || 0;
    
    // Find current rank (sorted from highest to lowest)
    const currentRankIndex = CULTIVATION_RANKS.findIndex(r => points >= r.minPoints);
    const currentRank = CULTIVATION_RANKS[currentRankIndex] || CULTIVATION_RANKS[CULTIVATION_RANKS.length - 1];
    
    // Find next rank (one step above current)
    const nextRank = currentRankIndex > 0 ? CULTIVATION_RANKS[currentRankIndex - 1] : null;
    
    // Calculate progress to next rank
    let progressPercent = 100;
    if (nextRank) {
        const range = nextRank.minPoints - currentRank.minPoints;
        const currentProgress = points - currentRank.minPoints;
        progressPercent = Math.min(100, Math.max(0, (currentProgress / range) * 100));
    }

    return {
        ...currentRank,
        nextRank,
        progressPercent,
        totalRanks: CULTIVATION_RANKS.length,
        rankIndex: CULTIVATION_RANKS.length - 1 - currentRankIndex, // 0=lowest
    };
}