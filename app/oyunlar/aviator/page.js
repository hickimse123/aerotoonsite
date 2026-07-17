'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { multiplierAtElapsed, round2, AVIATOR_MIN_BET, AVIATOR_MAX_BET } from '@/lib/aviator';

// status: 'idle' | 'flying' | 'crashed' | 'cashed'

// Çarpan yükseldikçe risk hissini artıran renk kademeleri —
// sakin mavi -> mor -> altın (rütbe rozetleriyle aynı ton) -> kırmızı alarm.
function getTier(m) {
    if (m >= 10) return { color: '#f5365c', glow: 'rgba(245,54,92,0.55)' };
    if (m >= 5) return { color: '#fbbf24', glow: 'rgba(251,191,36,0.5)' };
    if (m >= 2) return { color: '#8b5cf6', glow: 'rgba(139,92,246,0.45)' };
    return { color: '#5e72e4', glow: 'rgba(94,114,228,0.45)' };
}

function PlaneIcon({ color }) {
    const gid = 'avi-plane-grad';
    return (
        <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
            <defs>
                <linearGradient id={gid} x1="4" y1="40" x2="44" y2="8" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor={color} stopOpacity="0.55" />
                    <stop offset="1" stopColor="#ffffff" />
                </linearGradient>
            </defs>
            <path
                d="M44 24 30 15.5V7a3 3 0 0 0-6 0v6.2L11 8v4l13 8.7v6.6L17 30v3.4l7-1.6.2 6L20 41l1 3 3.3-2 3.3 2 1-3-4.2-3.2.2-6 7 1.6V30l-7-3.7v-6.6l13-8.7z"
                fill={`url(#${gid})`}
                stroke={color}
                strokeWidth="1"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function Burst({ color, big }) {
    const particles = useMemo(() => Array.from({ length: big ? 20 : 14 }, (_, i) => {
        const angle = (i / (big ? 20 : 14)) * Math.PI * 2 + Math.random() * 0.4;
        const dist = (big ? 70 : 46) + Math.random() * (big ? 50 : 34);
        return {
            tx: Math.cos(angle) * dist,
            ty: Math.sin(angle) * dist,
            size: 3 + Math.random() * 4,
            delay: Math.random() * 0.08,
        };
    }), [big]);
    return (
        <div className="avi-burst" aria-hidden="true">
            {particles.map((p, i) => (
                <span
                    key={i}
                    className="avi-particle"
                    style={{ '--tx': `${p.tx}px`, '--ty': `${p.ty}px`, width: p.size, height: p.size, background: color, animationDelay: `${p.delay}s` }}
                />
            ))}
        </div>
    );
}

export default function AviatorPage() {
    const { user, authFetch, refreshUser } = useAuth();
    const [appSettings, setAppSettings] = useState({});
    const [bet, setBet] = useState(100);
    const [status, setStatus] = useState('idle');
    const [multiplier, setMultiplier] = useState(1.0);
    const [round, setRound] = useState(null); // { roundId, startedAt, betAmount }
    const [lastResult, setLastResult] = useState(null); // { type: 'win'|'lose', multiplier, payout }
    const [history, setHistory] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [resultId, setResultId] = useState(0); // patlama/kazanç efektini yeniden tetiklemek için

    const rafRef = useRef(null);
    const pollRef = useRef(null);
    const roundRef = useRef(null);
    const lastTickRef = useRef(0);
    const pointsName = appSettings.points_name || 'Yomi Puanı';

    useEffect(() => { roundRef.current = round; }, [round]);

    // Yıldız alanı — bir kere üretilip sabit kalır (her render'da yeniden üretilmez)
    const stars = useMemo(() => Array.from({ length: 46 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 62,
        size: 1 + Math.random() * 1.8,
        delay: Math.random() * 4,
        dur: 2.4 + Math.random() * 2.6,
    })), []);

    const loadState = useCallback(async () => {
        if (!user) return;
        try {
            const res = await authFetch('/api/games/aviator/state');
            const data = await res.json();
            if (!data.success) return;
            setHistory(data.history || []);
            if (data.active) {
                setRound(data.active);
                setStatus('flying');
            }
        } catch {}
    }, [user, authFetch]);

    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(d => { if (d.success) setAppSettings(d.settings || {}); }).catch(() => {});
        loadState();
    }, [loadState]);

    // rAF: canlı çarpanı güncelle — ~25fps'e throttle edilir (60fps'te state
    // güncellemek gereksiz yeniden render yükü yaratıyordu, sayı zaten pürüzsüz görünür).
    useEffect(() => {
        if (status !== 'flying' || !round) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            return;
        }
        const startedAtMs = new Date(round.startedAt.includes('T') ? round.startedAt : round.startedAt.replace(' ', 'T') + 'Z').getTime();
        function tick(ts) {
            if (ts - lastTickRef.current >= 40) {
                lastTickRef.current = ts;
                const elapsed = Date.now() - startedAtMs;
                setMultiplier(multiplierAtElapsed(elapsed));
            }
            rafRef.current = requestAnimationFrame(tick);
        }
        rafRef.current = requestAnimationFrame(tick);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [status, round]);

    // Poll: sunucu turu geç kalındığı için otomatik kapattı mı diye kontrol et
    useEffect(() => {
        if (status !== 'flying') {
            if (pollRef.current) clearInterval(pollRef.current);
            return;
        }
        pollRef.current = setInterval(async () => {
            try {
                const res = await authFetch('/api/games/aviator/state');
                const data = await res.json();
                if (data.success && !data.active && roundRef.current) {
                    // Sunucu turu patlamış olarak kapattı — zamanında çekilmedi
                    setStatus('crashed');
                    setRound(null);
                    setLastResult({ type: 'lose', multiplier: null, payout: 0 });
                    setResultId(id => id + 1);
                    setHistory(data.history || []);
                    refreshUser();
                }
            } catch {}
        }, 1200);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [status, authFetch, refreshUser]);

    // Sekme arka plandayken tarayıcılar requestAnimationFrame'i büyük ölçüde
    // yavaşlatır/durdurur — bu, ekranın gerçek süreden geri kalmasına yol açar.
    // Sekmeye dönünce çarpanı anında (bir sonraki throttled frame'i beklemeden) tazele.
    useEffect(() => {
        function onVisible() {
            if (document.visibilityState !== 'visible') return;
            if (status !== 'flying' || !round?.startedAt) return;
            const startedAtMs = new Date(round.startedAt.includes('T') ? round.startedAt : round.startedAt.replace(' ', 'T') + 'Z').getTime();
            lastTickRef.current = 0;
            setMultiplier(multiplierAtElapsed(Date.now() - startedAtMs));
        }
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [status, round]);

    async function startGame() {
        setError('');
        const betNum = Math.round(Number(bet));
        if (!Number.isFinite(betNum) || betNum < AVIATOR_MIN_BET || betNum > AVIATOR_MAX_BET) {
            setError(`Bahis ${AVIATOR_MIN_BET} ile ${AVIATOR_MAX_BET} arasında olmalı`);
            return;
        }
        if ((user?.yomi_points || 0) < betNum) { setError('Yetersiz puan'); return; }
        setBusy(true);
        try {
            const res = await authFetch('/api/games/aviator/start', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ betAmount: betNum }),
            });
            const data = await res.json();
            if (data.success) {
                lastTickRef.current = 0;
                setRound({ roundId: data.roundId, startedAt: data.startedAt, betAmount: betNum });
                setMultiplier(1.0);
                setStatus('flying');
                setLastResult(null);
                refreshUser();
            } else {
                setError(data.error || 'Başlatılamadı');
            }
        } catch { setError('Bir hata oluştu'); }
        setBusy(false);
    }

    async function cashOut() {
        setBusy(true);
        // İyimser anlık güncelleme: buton basılır basılmaz geçen süreye göre çarpanı
        // hemen tazele — rAF arka planda kısıtlanmışsa (sekme gizliyken tarayıcılar
        // requestAnimationFrame'i yavaşlatır/durdurur) ekranın bayat kalmasını önler.
        if (round?.startedAt) {
            const startedAtMs = new Date(round.startedAt.includes('T') ? round.startedAt : round.startedAt.replace(' ', 'T') + 'Z').getTime();
            setMultiplier(multiplierAtElapsed(Date.now() - startedAtMs));
        }
        try {
            const res = await authFetch('/api/games/aviator/cashout', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                // Ekranda gösterilen sayı HER ZAMAN sunucunun ödemeyi hesapladığı
                // gerçek çarpanla eşleşmeli — rAF'ın bayat bıraktığı değeri değil.
                setMultiplier(data.multiplier);
                setStatus('cashed');
                setRound(null);
                setLastResult({ type: 'win', multiplier: data.multiplier, payout: data.payout });
                setResultId(id => id + 1);
                refreshUser();
                loadState();
            } else {
                setStatus('crashed');
                setRound(null);
                setLastResult({ type: 'lose', multiplier: null, payout: 0 });
                setResultId(id => id + 1);
                refreshUser();
                loadState();
            }
        } catch { setError('Bir hata oluştu'); }
        setBusy(false);
    }

    // Uçağın konumu — çarpana göre yükselip sağa doğru ilerler
    const progress = Math.min((multiplier - 1) / 4, 1); // 5x civarında ekranın üstüne yaklaşır
    const planeX = 8 + progress * 78;
    const planeY = 88 - progress * 72;
    const angle = Math.atan2(planeY - 88, planeX - 8) * (180 / Math.PI);
    const tier = getTier(multiplier);
    const flying = status === 'flying';
    const crashed = status === 'crashed';
    const cashed = status === 'cashed';

    return (
        <div className="page-container glass-page-container" style={{ maxWidth: 720, padding: '24px 16px' }}>
            <div className="glass-panel" style={{ padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>
                        Aviator
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.9rem' }}>Puanını yatır, uçak yükselirken çarpan artar. İstediğin an çek — çekmezsen düşer!</p>
                </div>
                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(94,114,228,0.12)', border: '1px solid rgba(94,114,228,0.3)', borderRadius: 10, padding: '10px 16px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
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
                    <div className={`avi-scene ${crashed ? 'is-crashed' : ''} ${flying ? 'is-flying' : ''}`} style={{ '--tier-color': tier.color, '--tier-glow': tier.glow }}>
                        {/* Yıldız alanı */}
                        <div className="avi-stars">
                            {stars.map((s, i) => (
                                <span key={i} className="avi-star" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }} />
                            ))}
                        </div>

                        {/* Uçuş göstergesi halkaları — havacılık aletlerinden ilham */}
                        <svg className="avi-rings" viewBox="0 0 100 100" aria-hidden="true">
                            <g style={{ transformOrigin: '50% 42%' }}>
                                <circle cx="50" cy="42" r="34" className="avi-ring avi-ring-1" />
                                <circle cx="50" cy="42" r="24" className="avi-ring avi-ring-2" />
                                <circle cx="50" cy="42" r="14" className="avi-ring avi-ring-3" />
                            </g>
                        </svg>

                        {/* Uçuş rotası / kondensasyon izi */}
                        <svg className="avi-path" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="avi-trail-grad" x1="8" y1="88" x2={planeX} y2={planeY} gradientUnits="userSpaceOnUse">
                                    <stop offset="0" stopColor={tier.color} stopOpacity="0" />
                                    <stop offset="1" stopColor={tier.color} stopOpacity="0.9" />
                                </linearGradient>
                            </defs>
                            <polyline points={`8,88 ${planeX},${planeY}`} fill="none" stroke="url(#avi-trail-grad)" strokeWidth="2.4" strokeLinecap="round" className="avi-trail-blur" />
                            <polyline points={`8,88 ${planeX},${planeY}`} fill="none" stroke="url(#avi-trail-grad)" strokeWidth="0.6" strokeLinecap="round" />
                        </svg>

                        {/* Pist / ufuk şeridi */}
                        <div className="avi-runway"><div className="avi-runway-dashes" /></div>

                        {/* Uçak */}
                        <div className="avi-plane" style={{ left: `${planeX}%`, top: `${planeY}%`, transform: `translate(-50%, -50%) rotate(${crashed ? 55 : angle}deg)`, opacity: status === 'idle' ? 0.4 : crashed ? 0 : 1 }}>
                            <PlaneIcon color={tier.color} />
                        </div>

                        {crashed && (
                            <div className="avi-plane avi-plane-wreck" style={{ left: `${planeX}%`, top: `${planeY}%` }}>
                                <Burst color="#f5365c" key={`c${resultId}`} big />
                            </div>
                        )}
                        {cashed && (
                            <div className="avi-plane" style={{ left: `${planeX}%`, top: `${planeY}%` }}>
                                <Burst color="#fbbf24" key={`w${resultId}`} />
                            </div>
                        )}
                        {crashed && <div className="avi-flash" key={`f${resultId}`} />}

                        {/* Okunuş paneli */}
                        <div className="avi-readout">
                            {crashed ? (
                                <div className="avi-crash-text">DÜŞTÜ</div>
                            ) : (
                                <div className="avi-multiplier" style={{ color: tier.color, textShadow: `0 0 26px ${tier.glow}, 0 0 60px ${tier.glow}` }}>
                                    {round2(multiplier).toFixed(2)}<span>x</span>
                                </div>
                            )}
                            {lastResult?.type === 'win' && (
                                <div className="avi-result avi-result-win">+{lastResult.payout.toLocaleString()} {pointsName} · {round2(lastResult.multiplier).toFixed(2)}x</div>
                            )}
                            {lastResult?.type === 'lose' && (
                                <div className="avi-result avi-result-lose">Bahis yandı</div>
                            )}
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: 20, marginTop: 20 }}>
                        {error && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}

                        {flying ? (
                            <button className="btn btn-primary avi-cashout-btn" disabled={busy} onClick={cashOut}>
                                {busy ? '...' : (
                                    <>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v14M6 10l6 6 6-6"/><path d="M4 20h16"/></svg>
                                        ÇEK — {Math.floor((round?.betAmount || 0) * multiplier).toLocaleString()} {pointsName}
                                    </>
                                )}
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <input type="number" min={AVIATOR_MIN_BET} max={AVIATOR_MAX_BET} className="form-input" value={bet}
                                    onChange={e => setBet(e.target.value)} style={{ flex: 1 }} placeholder="Bahis miktarı" disabled={busy} />
                                <button className="btn btn-primary" style={{ minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={busy} onClick={startGame}>
                                    {busy ? '...' : (
                                        <>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>
                                            Uçur
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            {[50, 100, 250, 500].map(v => (
                                <button key={v} className="btn btn-ghost btn-sm" disabled={flying || busy} onClick={() => setBet(v)}>{v}</button>
                            ))}
                        </div>
                    </div>

                    {history.length > 0 && (
                        <div className="glass-panel" style={{ padding: 20, marginTop: 20 }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Geçmiş</h3>
                            <div className="avi-history">
                                {history.map(h => (
                                    <div key={h.id} className={`avi-history-row ${h.status === 'cashed' ? 'is-win' : 'is-lose'}`}>
                                        <span style={{ color: 'var(--text-muted)' }}>{h.bet_amount.toLocaleString()} {pointsName}</span>
                                        <span className="avi-history-result">
                                            {h.status === 'cashed' ? `+${(h.payout || 0).toLocaleString()} (${round2(h.cashout_multiplier).toFixed(2)}x)` : 'Düştü'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            <style jsx>{`
                .avi-scene {
                    position: relative;
                    height: 300px;
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    background:
                        radial-gradient(120% 70% at 50% 100%, color-mix(in srgb, var(--tier-color) 20%, transparent) 0%, transparent 60%),
                        linear-gradient(180deg, #05060b 0%, #0c1024 45%, #141a35 78%, #1c2246 100%);
                    box-shadow: inset 0 0 0 1px var(--border-color), var(--shadow);
                    transition: background 0.6s ease;
                }
                .avi-stars { position: absolute; inset: 0; }
                .avi-star {
                    position: absolute;
                    border-radius: 50%;
                    background: #ffffff;
                    animation: avi-twinkle ease-in-out infinite;
                }
                @keyframes avi-twinkle {
                    0%, 100% { opacity: 0.15; }
                    50% { opacity: 0.9; }
                }
                .avi-rings {
                    position: absolute; inset: 0; width: 100%; height: 100%;
                    opacity: 0.35;
                    animation: avi-spin 60s linear infinite;
                }
                .is-flying .avi-rings { opacity: 0.55; }
                @keyframes avi-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .avi-ring { fill: none; stroke: var(--tier-color); stroke-dasharray: 2 4; transition: stroke 0.4s ease; }
                .avi-ring-1 { stroke-width: 0.3; }
                .avi-ring-2 { stroke-width: 0.3; stroke-dasharray: 1 3; }
                .avi-ring-3 { stroke-width: 0.4; stroke-dasharray: 3 2; }
                .avi-path { position: absolute; inset: 0; width: 100%; height: 100%; }
                .avi-trail-blur { filter: blur(3px); opacity: 0.7; }
                .avi-runway {
                    position: absolute; left: 0; right: 0; bottom: 0; height: 10px;
                    background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.12));
                    border-top: 1px solid rgba(255,255,255,0.15);
                    overflow: hidden;
                }
                .avi-runway-dashes {
                    position: absolute; inset: 0; width: 200%;
                    background-image: repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0 16px, transparent 16px 34px);
                    animation: avi-runway-scroll 1.1s linear infinite;
                    animation-play-state: paused;
                }
                .is-flying .avi-runway-dashes { animation-play-state: running; }
                @keyframes avi-runway-scroll { from { transform: translateX(0); } to { transform: translateX(-34px); } }
                .avi-plane {
                    position: absolute;
                    filter: drop-shadow(0 0 10px var(--tier-glow));
                    transition: opacity 0.25s ease, left 0.04s linear, top 0.04s linear;
                    pointer-events: none;
                }
                .avi-plane-wreck { transform: translate(-50%, -50%); }
                .avi-flash {
                    position: absolute; inset: 0;
                    background: rgba(245, 54, 92, 0.35);
                    animation: avi-flash-fade 0.5s ease-out forwards;
                    pointer-events: none;
                }
                @keyframes avi-flash-fade { from { opacity: 1; } to { opacity: 0; } }
                .is-crashed { animation: avi-shake 0.4s ease-in-out; }
                @keyframes avi-shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-6px); }
                    40% { transform: translateX(5px); }
                    60% { transform: translateX(-3px); }
                    80% { transform: translateX(2px); }
                }
                .avi-burst { position: absolute; left: 0; top: 0; width: 0; height: 0; pointer-events: none; }
                .avi-particle {
                    position: absolute; left: 0; top: 0; border-radius: 50%;
                    animation: avi-particle-burst 0.7s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
                }
                @keyframes avi-particle-burst {
                    0% { transform: translate(0, 0) scale(1); opacity: 1; }
                    100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
                }
                .avi-readout {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    text-align: center; pointer-events: none;
                }
                .avi-multiplier {
                    font-size: 2.9rem; font-weight: 900; letter-spacing: -0.02em;
                    font-variant-numeric: tabular-nums;
                }
                .avi-multiplier span { font-size: 1.6rem; opacity: 0.8; }
                .avi-crash-text {
                    font-size: 2.1rem; font-weight: 900; color: #f5365c;
                    text-shadow: 0 0 24px rgba(245,54,92,0.7);
                    animation: avi-crash-pop 0.35s ease-out;
                }
                @keyframes avi-crash-pop {
                    0% { transform: scale(0.6); opacity: 0; }
                    60% { transform: scale(1.15); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .avi-result { margin-top: 8px; font-weight: 700; font-size: 0.95rem; }
                .avi-result-win { color: var(--success); }
                .avi-result-lose { color: var(--danger); }
                .avi-cashout-btn {
                    width: 100%; font-size: 1.1rem; padding: 14px;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                }
                .avi-history { display: flex; flex-direction: column; gap: 6px; }
                .avi-history-row {
                    display: flex; justify-content: space-between; align-items: center;
                    font-size: 0.85rem; padding: 8px 10px; border-radius: 8px;
                    background: var(--bg-tertiary);
                    border-left: 3px solid transparent;
                }
                .avi-history-row.is-win { border-left-color: var(--success); }
                .avi-history-row.is-lose { border-left-color: var(--danger); }
                .avi-history-result { font-weight: 700; }
                .is-win .avi-history-result { color: var(--success); }
                .is-lose .avi-history-result { color: var(--danger); }
                @media (prefers-reduced-motion: reduce) {
                    .avi-star, .avi-rings, .avi-runway-dashes, .is-crashed, .avi-crash-text { animation: none !important; }
                }
            `}</style>
        </div>
    );
}
