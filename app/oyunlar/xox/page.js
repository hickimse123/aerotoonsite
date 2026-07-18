'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { XOX_MIN_BET, XOX_MAX_BET, XOX_WIN_MULTIPLIER } from '@/lib/xox';

const EMPTY_BOARD = Array(9).fill(null);

export default function XoxPage() {
    const { user, authFetch, refreshUser } = useAuth();
    const [appSettings, setAppSettings] = useState({});
    const [bet, setBet] = useState(100);
    const [round, setRound] = useState(null); // { roundId, betAmount }
    const [board, setBoard] = useState(EMPTY_BOARD);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null); // { status, payout }
    const pointsName = appSettings.points_name || 'Yomi Puanı';

    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(d => { if (d.success) setAppSettings(d.settings || {}); }).catch(() => {});
    }, []);

    async function startGame() {
        setError('');
        const betNum = Math.round(Number(bet));
        if (!Number.isFinite(betNum) || betNum < XOX_MIN_BET || betNum > XOX_MAX_BET) {
            setError(`Bahis ${XOX_MIN_BET} ile ${XOX_MAX_BET} arasında olmalı`);
            return;
        }
        if ((user?.yomi_points || 0) < betNum) { setError('Yetersiz puan'); return; }
        setBusy(true);
        try {
            const res = await authFetch('/api/games/xox/start', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ betAmount: betNum }),
            });
            const data = await res.json();
            if (data.success) {
                setRound({ roundId: data.roundId, betAmount: betNum });
                setBoard(data.board);
                setResult(null);
                refreshUser();
            } else {
                setError(data.error || 'Başlatılamadı');
            }
        } catch { setError('Bir hata oluştu'); }
        setBusy(false);
    }

    async function playCell(idx) {
        if (!round || busy || board[idx] !== null) return;
        setBusy(true);
        setError('');
        try {
            const res = await authFetch('/api/games/xox/move', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roundId: round.roundId, cell: idx }),
            });
            const data = await res.json();
            if (!data.success) {
                setError(data.error || 'Hamle yapılamadı');
                setBusy(false);
                return;
            }
            setBoard(data.board);
            if (data.status !== 'active') {
                setResult({ status: data.status, payout: data.payout });
                setRound(null);
                refreshUser();
            }
        } catch { setError('Bir hata oluştu'); }
        setBusy(false);
    }

    const playing = !!round;

    return (
        <div className="page-container glass-page-container" style={{ maxWidth: 560, padding: '24px 16px' }}>
            <Link href="/oyunlar" className="games-back-link">← Oyunlar</Link>
            <div className="glass-panel" style={{ padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /></svg>
                        XOX
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.9rem' }}>Bota karşı oyna — kazanırsan {XOX_WIN_MULTIPLIER}x, berabere kalırsan bahsin geri döner.</p>
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
                    <div className="glass-panel" style={{ padding: 24 }}>
                        <div className="xox-grid">
                            {board.map((c, i) => (
                                <button key={i} className={`xox-cell ${c ? `xox-${c}` : ''}`} disabled={!playing || busy || c !== null} onClick={() => playCell(i)}>
                                    {c === 'x' && <span className="xox-mark">✕</span>}
                                    {c === 'o' && <span className="xox-mark">◯</span>}
                                </button>
                            ))}
                        </div>

                        {result && (
                            <div className="xox-result" style={{ color: result.status === 'won' ? 'var(--success)' : result.status === 'draw' ? 'var(--text-secondary)' : 'var(--danger)' }}>
                                {result.status === 'won' && `Kazandın! +${result.payout.toLocaleString()} ${pointsName}`}
                                {result.status === 'draw' && `Berabere — bahsin (${result.payout.toLocaleString()}) geri döndü`}
                                {result.status === 'lost' && 'Kaybettin — bahis yandı'}
                            </div>
                        )}
                    </div>

                    <div className="glass-panel" style={{ padding: 20, marginTop: 20 }}>
                        {error && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
                        {!playing && (
                            <>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <input type="number" min={XOX_MIN_BET} max={XOX_MAX_BET} className="form-input" value={bet}
                                        onChange={e => setBet(e.target.value)} style={{ flex: 1 }} placeholder="Bahis miktarı" disabled={busy} />
                                    <button className="btn btn-primary" style={{ minWidth: 140 }} disabled={busy} onClick={startGame}>
                                        {busy ? '...' : 'Oyna'}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                                    {[50, 100, 250, 500].map(v => (
                                        <button key={v} className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setBet(v)}>{v}</button>
                                    ))}
                                </div>
                            </>
                        )}
                        {playing && <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Sıra sende — bir hücre seç.</p>}
                    </div>
                </>
            )}

            <style jsx>{`
                .xox-grid {
                    display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
                    max-width: 320px; margin: 0 auto;
                }
                .xox-cell {
                    aspect-ratio: 1; border-radius: 12px;
                    background: var(--bg-tertiary); border: 1px solid var(--border-color);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: background 0.15s ease;
                }
                .xox-cell:disabled { cursor: default; }
                .xox-cell:not(:disabled):hover { background: var(--bg-card); border-color: var(--accent); }
                .xox-mark { font-size: 2rem; font-weight: 900; }
                .xox-x .xox-mark { color: var(--accent); }
                .xox-o .xox-mark { color: #f5365c; }
                .xox-result { text-align: center; margin-top: 18px; font-weight: 700; font-size: 1rem; }
            `}</style>
        </div>
    );
}
