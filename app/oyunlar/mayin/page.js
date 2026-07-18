'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { MINES_GRID_SIZE, MINES_MINE_COUNT, MINES_MIN_BET, MINES_MAX_BET, minesMultiplier, round2 } from '@/lib/mines';

export default function MinesPage() {
    const { user, authFetch, refreshUser } = useAuth();
    const [appSettings, setAppSettings] = useState({});
    const [bet, setBet] = useState(100);
    const [round, setRound] = useState(null); // { roundId, betAmount }
    const [revealed, setRevealed] = useState([]);
    const [mines, setMines] = useState([]); // sadece tur bitince dolar
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null); // { type: 'busted'|'cashed', payout, multiplier }
    const pointsName = appSettings.points_name || 'Yomi Puanı';

    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(d => { if (d.success) setAppSettings(d.settings || {}); }).catch(() => {});
    }, []);

    const currentMultiplier = round2(minesMultiplier(revealed.length, MINES_GRID_SIZE, MINES_MINE_COUNT));
    const potentialPayout = round ? Math.floor(round.betAmount * currentMultiplier) : 0;
    const playing = !!round;

    async function startGame() {
        setError('');
        const betNum = Math.round(Number(bet));
        if (!Number.isFinite(betNum) || betNum < MINES_MIN_BET || betNum > MINES_MAX_BET) {
            setError(`Bahis ${MINES_MIN_BET} ile ${MINES_MAX_BET} arasında olmalı`);
            return;
        }
        if ((user?.yomi_points || 0) < betNum) { setError('Yetersiz puan'); return; }
        setBusy(true);
        try {
            const res = await authFetch('/api/games/mines/start', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ betAmount: betNum }),
            });
            const data = await res.json();
            if (data.success) {
                setRound({ roundId: data.roundId, betAmount: betNum });
                setRevealed([]);
                setMines([]);
                setResult(null);
                refreshUser();
            } else {
                setError(data.error || 'Başlatılamadı');
            }
        } catch { setError('Bir hata oluştu'); }
        setBusy(false);
    }

    async function revealCell(idx) {
        if (!round || busy || revealed.includes(idx)) return;
        setBusy(true);
        setError('');
        try {
            const res = await authFetch('/api/games/mines/reveal', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roundId: round.roundId, cell: idx }),
            });
            const data = await res.json();
            if (!data.success) {
                setError(data.error || 'Açılamadı');
                setBusy(false);
                return;
            }
            if (data.hitMine) {
                setMines(data.minePositions);
                setRevealed(data.revealed);
                setResult({ type: 'busted', payout: 0 });
                setRound(null);
                refreshUser();
            } else {
                setRevealed(data.revealed);
                if (data.cleared) {
                    setMines(data.minePositions);
                    setResult({ type: 'cashed', payout: data.potentialPayout, multiplier: data.multiplier, cleared: true });
                    setRound(null);
                    refreshUser();
                }
            }
        } catch { setError('Bir hata oluştu'); }
        setBusy(false);
    }

    async function cashOut() {
        if (!round || revealed.length === 0) return;
        setBusy(true);
        setError('');
        try {
            const res = await authFetch('/api/games/mines/cashout', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roundId: round.roundId }),
            });
            const data = await res.json();
            if (data.success) {
                setMines(data.minePositions);
                setResult({ type: 'cashed', payout: data.payout, multiplier: data.multiplier });
                setRound(null);
                refreshUser();
            } else {
                setError(data.error || 'Çekilemedi');
            }
        } catch { setError('Bir hata oluştu'); }
        setBusy(false);
    }

    return (
        <div className="page-container glass-page-container" style={{ maxWidth: 600, padding: '24px 16px' }}>
            <Link href="/oyunlar" className="games-back-link">← Oyunlar</Link>
            <div className="glass-panel" style={{ padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" /></svg>
                        Mayın Tarlası
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.9rem' }}>36 kare, 6 mayın — her güvenli kare çarpanı artırır. İstediğin an çek!</p>
                </div>
                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(94,114,228,0.12)', border: '1px solid rgba(94,114,228,0.3)', borderRadius: 10, padding: '10px 16px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                        <strong style={{ color: 'var(--accent)' }}>{(user.yomi_points || 0).toLocaleString()}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{pointsName}</span>
                    </div>
                )}
            </div>

            {!user ? (
                <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 14 }}>Oynamak için giriş yapmalısın.</p>
                    <Link href="/login" className="btn btn-primary">Giriş Yap</Link>
                </div>
            ) : (
                <>
                    <div className="glass-panel" style={{ padding: 20 }}>
                        {(playing || revealed.length > 0) && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Çarpan: <strong style={{ color: 'var(--accent-light)' }}>{currentMultiplier.toFixed(2)}x</strong></span>
                                <span style={{ color: 'var(--text-muted)' }}>Olası ödül: <strong style={{ color: 'var(--success)' }}>{potentialPayout.toLocaleString()} {pointsName}</strong></span>
                            </div>
                        )}
                        <div className="mines-grid">
                            {Array.from({ length: MINES_GRID_SIZE }).map((_, i) => {
                                const isRevealed = revealed.includes(i);
                                const isMine = mines.includes(i);
                                const showMine = isMine && (result?.type === 'busted' || (result?.cleared));
                                return (
                                    <button
                                        key={i}
                                        className={`mines-cell ${isRevealed ? 'is-revealed' : ''} ${showMine ? 'is-mine' : ''}`}
                                        disabled={!playing || busy || isRevealed}
                                        onClick={() => revealCell(i)}
                                    >
                                        {showMine ? '💣' : (isRevealed ? '💎' : '')}
                                    </button>
                                );
                            })}
                        </div>

                        {result && (
                            <div className="mines-result" style={{ color: result.type === 'cashed' ? 'var(--success)' : 'var(--danger)' }}>
                                {result.type === 'cashed'
                                    ? `${result.cleared ? 'Tüm kareler açıldı!' : 'Çekildi!'} +${result.payout.toLocaleString()} ${pointsName} (${result.multiplier}x)`
                                    : 'Mayına bastın — bahis yandı'}
                            </div>
                        )}
                    </div>

                    <div className="glass-panel" style={{ padding: 20, marginTop: 20 }}>
                        {error && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}

                        {playing ? (
                            <button className="btn btn-primary" style={{ width: '100%', fontSize: '1.05rem', padding: 14 }} disabled={busy || revealed.length === 0} onClick={cashOut}>
                                {busy ? '...' : `ÇEK — ${potentialPayout.toLocaleString()} ${pointsName}`}
                            </button>
                        ) : (
                            <>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <input type="number" min={MINES_MIN_BET} max={MINES_MAX_BET} className="form-input" value={bet}
                                        onChange={e => setBet(e.target.value)} style={{ flex: 1 }} placeholder="Bahis miktarı" disabled={busy} />
                                    <button className="btn btn-primary" style={{ minWidth: 140 }} disabled={busy} onClick={startGame}>
                                        {busy ? '...' : 'Başla'}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                                    {[50, 100, 250, 500].map(v => (
                                        <button key={v} className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setBet(v)}>{v}</button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            <style jsx>{`
                .mines-grid {
                    display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;
                }
                .mines-cell {
                    aspect-ratio: 1; border-radius: 8px;
                    background: var(--bg-tertiary); border: 1px solid var(--border-color);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.1rem;
                    cursor: pointer; transition: background 0.15s ease, transform 0.15s ease;
                }
                .mines-cell:not(:disabled):hover { background: var(--bg-card); border-color: var(--accent); transform: scale(1.04); }
                .mines-cell:disabled { cursor: default; }
                .mines-cell.is-revealed { background: rgba(45,206,137,0.15); border-color: rgba(45,206,137,0.4); }
                .mines-cell.is-mine { background: rgba(245,54,92,0.18); border-color: rgba(245,54,92,0.5); }
                .mines-result { text-align: center; margin-top: 16px; font-weight: 700; font-size: 1rem; }
            `}</style>
        </div>
    );
}
