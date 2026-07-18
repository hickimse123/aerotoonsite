'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { WHEEL_SEGMENTS, WHEEL_SEGMENT_ANGLE, segmentCenterAngle, WHEEL_MIN_BET, WHEEL_MAX_BET } from '@/lib/wheel';

export default function WheelPage() {
    const { user, authFetch, refreshUser } = useAuth();
    const [appSettings, setAppSettings] = useState({});
    const [bet, setBet] = useState(100);
    const [rotation, setRotation] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState(null); // { multiplier, payout }
    const [history, setHistory] = useState([]);
    const [error, setError] = useState('');
    const pointsName = appSettings.points_name || 'Yomi Puanı';

    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(d => { if (d.success) setAppSettings(d.settings || {}); }).catch(() => {});
    }, []);

    const gradient = useMemo(() => {
        let acc = 0;
        const stops = WHEEL_SEGMENTS.map(seg => {
            const from = acc;
            const to = acc + WHEEL_SEGMENT_ANGLE;
            acc = to;
            return `${seg.color} ${from}deg ${to}deg`;
        });
        return `conic-gradient(from 0deg, ${stops.join(', ')})`;
    }, []);

    async function spin() {
        setError('');
        const betNum = Math.round(Number(bet));
        if (!Number.isFinite(betNum) || betNum < WHEEL_MIN_BET || betNum > WHEEL_MAX_BET) {
            setError(`Bahis ${WHEEL_MIN_BET} ile ${WHEEL_MAX_BET} arasında olmalı`);
            return;
        }
        if ((user?.yomi_points || 0) < betNum) { setError('Yetersiz puan'); return; }
        setSpinning(true);
        setResult(null);
        try {
            const res = await authFetch('/api/games/wheel/spin', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ betAmount: betNum }),
            });
            const data = await res.json();
            if (!data.success) {
                setError(data.error || 'Çevrilemedi');
                setSpinning(false);
                return;
            }
            const extraSpins = 5 + Math.floor(Math.random() * 3);
            const baseline = rotation - (rotation % 360);
            const target = baseline + extraSpins * 360 + (360 - segmentCenterAngle(data.segmentIndex)) + (Math.random() * (WHEEL_SEGMENT_ANGLE * 0.6) - WHEEL_SEGMENT_ANGLE * 0.3);
            setRotation(target);
            setTimeout(() => {
                setSpinning(false);
                setResult({ multiplier: data.multiplier, payout: data.payout });
                setHistory(h => [{ id: Date.now(), bet: betNum, multiplier: data.multiplier, payout: data.payout }, ...h].slice(0, 12));
                refreshUser();
            }, 4200);
        } catch {
            setError('Bir hata oluştu');
            setSpinning(false);
        }
    }

    return (
        <div className="page-container glass-page-container" style={{ maxWidth: 720, padding: '24px 16px' }}>
            <Link href="/oyunlar" className="games-back-link">← Oyunlar</Link>
            <div className="glass-panel" style={{ padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /></svg>
                        Çark
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.9rem' }}>Bahis yap, çarkı çevir — dilim çarpanınca puanın katlanır.</p>
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
                    <div className="wheel-scene glass-panel">
                        <div className="wheel-pointer" />
                        <div className="wheel-disc" style={{ background: gradient, transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 4.2s cubic-bezier(0.12, 0.8, 0.1, 1)' : 'none' }}>
                            {WHEEL_SEGMENTS.map((seg, i) => (
                                <div key={i} className="wheel-label" style={{ transform: `rotate(${segmentCenterAngle(i)}deg)` }}>
                                    <span style={{ transform: `rotate(0deg)` }}>{seg.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="wheel-hub">{spinning ? '...' : (result ? `${result.multiplier}x` : '?')}</div>
                    </div>

                    <div className="glass-panel" style={{ padding: 20, marginTop: 20 }}>
                        {error && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
                        {result && (
                            <div style={{ textAlign: 'center', marginBottom: 14, fontWeight: 700, color: result.payout > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {result.payout > 0 ? `+${result.payout.toLocaleString()} ${pointsName} (${result.multiplier}x)` : 'Bu sefer olmadı'}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <input type="number" min={WHEEL_MIN_BET} max={WHEEL_MAX_BET} className="form-input" value={bet}
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

                    {history.length > 0 && (
                        <div className="glass-panel" style={{ padding: 20, marginTop: 20 }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Geçmiş</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {history.map(h => (
                                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-tertiary)', borderLeft: `3px solid ${h.payout > 0 ? 'var(--success)' : 'var(--danger)'}` }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{h.bet.toLocaleString()} {pointsName}</span>
                                        <strong style={{ color: h.payout > 0 ? 'var(--success)' : 'var(--danger)' }}>{h.multiplier}x → {h.payout.toLocaleString()}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            <style jsx>{`
                .wheel-scene {
                    position: relative;
                    display: flex; align-items: center; justify-content: center;
                    padding: 40px 20px;
                }
                .wheel-disc {
                    position: relative;
                    width: 280px; height: 280px;
                    border-radius: 50%;
                    box-shadow: 0 0 0 8px var(--bg-tertiary), 0 0 0 10px var(--border-color), 0 10px 40px rgba(0,0,0,0.5);
                }
                .wheel-label {
                    position: absolute; inset: 0;
                    display: flex; justify-content: center;
                    transform-origin: 50% 50%;
                }
                .wheel-label span {
                    margin-top: 14px;
                    font-weight: 800; font-size: 0.85rem; color: #fff;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.6);
                }
                .wheel-pointer {
                    position: absolute; top: 24px; left: 50%; transform: translateX(-50%);
                    width: 0; height: 0; z-index: 5;
                    border-left: 12px solid transparent;
                    border-right: 12px solid transparent;
                    border-top: 20px solid var(--accent);
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
                }
                .wheel-hub {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 64px; height: 64px; border-radius: 50%;
                    background: var(--bg-card);
                    border: 3px solid var(--accent);
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 900; font-size: 1rem;
                    box-shadow: 0 0 20px rgba(94,114,228,0.5);
                }
            `}</style>
        </div>
    );
}
