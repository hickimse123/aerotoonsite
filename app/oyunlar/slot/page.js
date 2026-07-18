'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { SLOT_SYMBOLS, SLOT_MIN_BET, SLOT_MAX_BET, symbolById } from '@/lib/slots';

const REEL_STOP_DELAYS = [800, 1150, 1500];

function Reel({ spinning, finalId, stopDelay }) {
    const [shownId, setShownId] = useState(finalId || SLOT_SYMBOLS[0].id);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (spinning) {
            intervalRef.current = setInterval(() => {
                setShownId(SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)].id);
            }, 70);
            const stopTimer = setTimeout(() => {
                clearInterval(intervalRef.current);
                setShownId(finalId);
            }, stopDelay);
            return () => { clearInterval(intervalRef.current); clearTimeout(stopTimer); };
        }
    }, [spinning, finalId, stopDelay]);

    return (
        <div className={`slot-reel ${spinning ? 'is-spinning' : ''}`}>
            <span className="slot-symbol">{symbolById(shownId).emoji}</span>
        </div>
    );
}

export default function SlotPage() {
    const { user, authFetch, refreshUser } = useAuth();
    const [appSettings, setAppSettings] = useState({});
    const [bet, setBet] = useState(100);
    const [spinning, setSpinning] = useState(false);
    const [reels, setReels] = useState([SLOT_SYMBOLS[0].id, SLOT_SYMBOLS[0].id, SLOT_SYMBOLS[0].id]);
    const [result, setResult] = useState(null); // { multiplier, payout }
    const [error, setError] = useState('');
    const pointsName = appSettings.points_name || 'Yomi Puanı';

    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(d => { if (d.success) setAppSettings(d.settings || {}); }).catch(() => {});
    }, []);

    async function spin() {
        setError('');
        const betNum = Math.round(Number(bet));
        if (!Number.isFinite(betNum) || betNum < SLOT_MIN_BET || betNum > SLOT_MAX_BET) {
            setError(`Bahis ${SLOT_MIN_BET} ile ${SLOT_MAX_BET} arasında olmalı`);
            return;
        }
        if ((user?.yomi_points || 0) < betNum) { setError('Yetersiz puan'); return; }
        setSpinning(true);
        setResult(null);
        try {
            const res = await authFetch('/api/games/slots/spin', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ betAmount: betNum }),
            });
            const data = await res.json();
            if (!data.success) {
                setError(data.error || 'Çevrilemedi');
                setSpinning(false);
                return;
            }
            setReels(data.symbols);
            setTimeout(() => {
                setSpinning(false);
                setResult({ multiplier: data.multiplier, payout: data.payout });
                refreshUser();
            }, REEL_STOP_DELAYS[2] + 150);
        } catch {
            setError('Bir hata oluştu');
            setSpinning(false);
        }
    }

    return (
        <div className="page-container glass-page-container" style={{ maxWidth: 560, padding: '24px 16px' }}>
            <Link href="/oyunlar" className="games-back-link">← Oyunlar</Link>
            <div className="glass-panel" style={{ padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                        <span style={{ fontSize: '1.4rem' }}>🎰</span> Slot 777
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.9rem' }}>3 aynı sembol büyük ödül, 2 aynı sembol bahsini geri verir.</p>
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
                        <div className="slot-machine">
                            {reels.map((id, i) => (
                                <Reel key={i} spinning={spinning} finalId={id} stopDelay={REEL_STOP_DELAYS[i]} />
                            ))}
                        </div>
                        {result && (
                            <div className="slot-result" style={{ color: result.payout >= bet ? 'var(--success)' : 'var(--danger)' }}>
                                {result.payout > 0 ? `+${result.payout.toLocaleString()} ${pointsName} (${result.multiplier}x)` : 'Bu sefer olmadı'}
                            </div>
                        )}
                    </div>

                    <div className="glass-panel" style={{ padding: 20, marginTop: 20 }}>
                        {error && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <input type="number" min={SLOT_MIN_BET} max={SLOT_MAX_BET} className="form-input" value={bet}
                                onChange={e => setBet(e.target.value)} style={{ flex: 1 }} placeholder="Bahis miktarı" disabled={spinning} />
                            <button className="btn btn-primary" style={{ minWidth: 140 }} disabled={spinning} onClick={spin}>
                                {spinning ? 'Dönüyor…' : 'Çevir'}
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            {[50, 100, 250, 500].map(v => (
                                <button key={v} className="btn btn-ghost btn-sm" disabled={spinning} onClick={() => setBet(v)}>{v}</button>
                            ))}
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: 20, marginTop: 20 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Ödeme Tablosu (3 aynı)</h3>
                        <div className="slot-paytable">
                            {SLOT_SYMBOLS.map(s => (
                                <div key={s.id} className="slot-pay-row">
                                    <span>{s.emoji}{s.emoji}{s.emoji}</span>
                                    <strong>{s.threeMult}x</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <style jsx>{`
                .slot-machine {
                    display: flex; gap: 10px; justify-content: center;
                    padding: 16px; border-radius: var(--radius-lg);
                    background: linear-gradient(180deg, #0c1024 0%, #1c2246 100%);
                    box-shadow: inset 0 0 0 1px var(--border-color);
                }
                .slot-reel {
                    width: 84px; height: 100px; border-radius: 10px;
                    background: var(--bg-card);
                    display: flex; align-items: center; justify-content: center;
                    overflow: hidden;
                    box-shadow: inset 0 0 0 2px rgba(255,255,255,0.06);
                }
                .slot-symbol { font-size: 2.6rem; line-height: 1; }
                .slot-reel.is-spinning .slot-symbol { filter: blur(1px); }
                .slot-result { text-align: center; margin-top: 18px; font-weight: 700; font-size: 1.05rem; }
                .slot-paytable { display: flex; flex-direction: column; gap: 6px; }
                .slot-pay-row {
                    display: flex; justify-content: space-between; align-items: center;
                    font-size: 1rem; padding: 6px 10px; border-radius: 8px;
                    background: var(--bg-tertiary);
                }
            `}</style>
        </div>
    );
}
