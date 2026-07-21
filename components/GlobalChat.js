'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { getCultivationData } from '@/lib/gamification';

const POLL_MS = 3000;
const MAX_LEN = 500;

function timeAgo(d) {
    if (!d) return '';
    const utcStr = typeof d === 'string' && !d.endsWith('Z') ? d.replace(' ', 'T') + 'Z' : d;
    const m = Math.floor((Date.now() - new Date(utcStr).getTime()) / 60000);
    if (m < 1) return 'az önce';
    if (m < 60) return `${m} dakika`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} saat`;
    return `${Math.floor(h / 24)} gün`;
}

// Rütbe ikonu — havacılık/gökyüzü rütbe seti — profile sayfasındaki RankIcon ile aynı ikon seti
function RankIcon({ icon, size = 12, color = 'currentColor' }) {
    const s = { width: size, height: size, flexShrink: 0 };
    if (icon === 'rocket') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        </svg>
    );
    if (icon === 'comet') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 3l1.4 3.3L24 8l-3.6 1.7L19 13l-1.4-3.3L14 8l3.6-1.7L19 3z" fill={color} stroke="none" />
            <path d="M2 20c4-6.5 9.5-9.5 15-11" />
        </svg>
    );
    if (icon === 'radar') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill={color} />
            <path d="M12 3v2" /><path d="M12 19v2" /><path d="M3 12h2" /><path d="M19 12h2" />
        </svg>
    );
    if (icon === 'wings') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3c-1.4 4-4.8 6-10 6 2.3 3.6 6 5 10 3.6" />
            <path d="M12 3c1.4 4 4.8 6 10 6-2.3 3.6-6 5-10 3.6" />
            <path d="M12 12.6V21" />
        </svg>
    );
    if (icon === 'compass') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
    );
    if (icon === 'headset') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1v-6a9 9 0 1 1 18 0v6a1 1 0 0 1-1 1h-2a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
        </svg>
    );
    if (icon === 'ticket') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
            <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
        </svg>
    );
    return null;
}

export default function GlobalChat() {
    const { user, authFetch } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [loaded, setLoaded] = useState(false);
    const listRef = useRef(null);
    const lastIdRef = useRef(0);
    const pollRef = useRef(null);

    const scrollToBottom = useCallback((smooth) => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    // İlk yükleme
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/chat/messages');
                const data = await res.json();
                if (cancelled) return;
                if (data.success) {
                    setMessages(data.messages);
                    if (data.messages.length > 0) lastIdRef.current = data.messages[data.messages.length - 1].id;
                }
            } catch {}
            if (!cancelled) { setLoaded(true); setTimeout(() => scrollToBottom(false), 50); }
        })();
        return () => { cancelled = true; };
    }, [scrollToBottom]);

    // Polling — yeni mesajları belli aralıkla kontrol et
    useEffect(() => {
        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/chat/messages?after=${lastIdRef.current}`);
                const data = await res.json();
                if (data.success && data.messages.length > 0) {
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const fresh = data.messages.filter(m => !existingIds.has(m.id));
                        if (fresh.length === 0) return prev;
                        return [...prev, ...fresh].slice(-100);
                    });
                    lastIdRef.current = data.messages[data.messages.length - 1].id;
                    const el = listRef.current;
                    const nearBottom = el && (el.scrollHeight - el.scrollTop - el.clientHeight < 120);
                    if (nearBottom) setTimeout(() => scrollToBottom(true), 30);
                }
            } catch {}
        }, POLL_MS);
        return () => clearInterval(pollRef.current);
    }, [scrollToBottom]);

    async function sendMessage(e) {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || sending) return;
        setError('');
        setSending(true);
        try {
            const res = await authFetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: trimmed }),
            });
            const data = await res.json();
            if (data.success) {
                setMessages(prev => {
                    if (prev.some(m => m.id === data.message.id)) return prev;
                    return [...prev, data.message].slice(-100);
                });
                lastIdRef.current = data.message.id;
                setInput('');
                setTimeout(() => scrollToBottom(true), 30);
            } else {
                setError(data.error || 'Mesaj gönderilemedi');
            }
        } catch {
            setError('Bir hata oluştu');
        }
        setSending(false);
    }

    return (
        <>
            <div className="section-header">
                <h2 className="section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    Sohbet
                </h2>
                <span className="gchat-live-badge">
                    <span className="gchat-live-dot" />
                    Canlı
                </span>
            </div>

            <div className="glass-panel gchat-card">
            <div className="gchat-list" ref={listRef}>
                {!loaded && <div className="gchat-empty">Yükleniyor…</div>}
                {loaded && messages.length === 0 && <div className="gchat-empty">Henüz mesaj yok — ilk mesajı sen at!</div>}
                {messages.map(m => {
                    const cult = getCultivationData(m.yomi_points);
                    const shownName = m.display_name || m.username;
                    return (
                        <div className="gchat-row" key={m.id}>
                            <div className="gchat-avatar-wrap">
                                {m.avatar_url && m.avatar_url !== '/default-avatar.png' ? (
                                    <img src={m.avatar_url} alt={shownName} className="gchat-avatar-img" />
                                ) : (
                                    <div className="gchat-avatar-fallback">{shownName?.[0]?.toUpperCase() || '?'}</div>
                                )}
                            </div>
                            <div className="gchat-body">
                                <div className="gchat-meta">
                                    <span className="gchat-username" title={m.display_name ? `@${m.username}` : undefined}>{shownName}</span>
                                    <span className="gchat-rank-pill" style={{ color: cult.color, borderColor: `${cult.color}55`, background: `${cult.color}18` }}>
                                        {cult.icon && <RankIcon icon={cult.icon} size={11} color={cult.color} />}
                                        {cult.title}
                                    </span>
                                    <span className="gchat-time">{timeAgo(m.created_at)}</span>
                                </div>
                                <div className="gchat-text">{m.message}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {user ? (
                <form className="gchat-input-row" onSubmit={sendMessage}>
                    <input
                        type="text"
                        className="form-input"
                        value={input}
                        maxLength={MAX_LEN}
                        placeholder="Bir mesaj yaz…"
                        onChange={e => setInput(e.target.value)}
                        disabled={sending}
                    />
                    <span className="gchat-counter">{input.length}/{MAX_LEN}</span>
                    <button type="submit" className="btn btn-primary gchat-send-btn" disabled={sending || !input.trim()} aria-label="Gönder">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </button>
                </form>
            ) : (
                <div className="gchat-login-cta">
                    <Link href="/login">Giriş yap</Link> ve sohbete katıl
                </div>
            )}
            {error && <div className="gchat-error">{error}</div>}
            </div>

            <style jsx>{`
                .gchat-card {
                    display: flex;
                    flex-direction: column;
                }
                .gchat-live-badge {
                    display: inline-flex; align-items: center; gap: 6px;
                    font-size: 0.78rem; font-weight: 700; color: var(--success);
                    background: rgba(45,206,137,0.12);
                    border: 1px solid rgba(45,206,137,0.3);
                    border-radius: 20px;
                    padding: 4px 12px;
                }
                .gchat-live-dot {
                    width: 8px; height: 8px; border-radius: 50%;
                    background: var(--success);
                    box-shadow: 0 0 0 0 rgba(45,206,137,0.5);
                    animation: gchat-pulse 2s infinite;
                }
                @keyframes gchat-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(45,206,137,0.5); }
                    70% { box-shadow: 0 0 0 7px rgba(45,206,137,0); }
                    100% { box-shadow: 0 0 0 0 rgba(45,206,137,0); }
                }
                .gchat-list {
                    height: 380px;
                    overflow-y: auto;
                    padding: 14px 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .gchat-empty {
                    margin: auto;
                    color: var(--text-muted);
                    font-size: 0.9rem;
                }
                .gchat-row { display: flex; gap: 10px; align-items: flex-start; }
                .gchat-avatar-wrap {
                    position: relative;
                    width: 36px; height: 36px;
                    flex-shrink: 0;
                }
                .gchat-avatar-img, .gchat-avatar-fallback {
                    width: 100%; height: 100%; border-radius: 50%;
                    object-fit: cover;
                }
                .gchat-avatar-fallback {
                    display: flex; align-items: center; justify-content: center;
                    background: var(--bg-tertiary);
                    font-weight: 800; color: var(--text-primary);
                }
                .gchat-body { flex: 1; min-width: 0; }
                .gchat-meta {
                    display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
                    margin-bottom: 3px;
                }
                .gchat-username { font-weight: 700; font-size: 0.9rem; }
                .gchat-rank-pill {
                    display: inline-flex; align-items: center; gap: 4px;
                    font-size: 0.68rem; font-weight: 700;
                    padding: 1px 8px; border-radius: 20px;
                    border: 1px solid;
                }
                .gchat-time { font-size: 0.72rem; color: var(--text-muted); margin-left: auto; }
                .gchat-text {
                    font-size: 0.88rem;
                    color: var(--text-secondary);
                    word-break: break-word;
                    white-space: pre-wrap;
                }
                .gchat-input-row {
                    display: flex; align-items: center; gap: 8px;
                    padding: 12px 14px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }
                .gchat-input-row :global(.form-input) {
                    flex: 1;
                    padding: 10px 12px;
                    font-size: 0.88rem;
                }
                .gchat-counter { font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; }
                .gchat-send-btn {
                    width: 38px; height: 38px; padding: 0; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                }
                .gchat-login-cta {
                    padding: 14px 18px;
                    text-align: center;
                    font-size: 0.88rem;
                    color: var(--text-muted);
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }
                .gchat-login-cta a { color: var(--accent); font-weight: 700; }
                .gchat-error {
                    padding: 8px 18px;
                    font-size: 0.8rem;
                    color: var(--danger);
                }
                @media (max-width: 640px) {
                    .gchat-list { height: 300px; }
                }
            `}</style>
        </>
    );
}
