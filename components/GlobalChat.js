'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { getCultivationData } from '@/lib/gamification';
import { BADGE_OPTIONS } from '@/lib/badges';

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

// Rütbe (cultivation rank) ikonu — profile sayfasındaki RankIcon ile aynı ikon seti
function RankIcon({ icon, size = 12, color = 'currentColor' }) {
    const s = { width: size, height: size, flexShrink: 0 };
    if (icon === 'crown') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20h20" /><path d="m4 20 2-10 6 5 6-5 2 10" />
        </svg>
    );
    if (icon === 'sparkle') return (
        <svg {...s} viewBox="0 0 24 24" fill={color} stroke="none">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
        </svg>
    );
    if (icon === 'flame') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
    );
    if (icon === 'zap') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
    );
    if (icon === 'waves') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
            <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
            <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        </svg>
    );
    if (icon === 'bolt') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
    );
    if (icon === 'book') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
    );
    return null;
}

// Özel rozet ikonları (badges.js'teki icon anahtarlarına karşılık gelen SVG'ler)
function BadgeIcon({ icon, size = 11, color = 'currentColor' }) {
    const s = { width: size, height: size, flexShrink: 0 };
    if (icon === 'star') return (
        <svg {...s} viewBox="0 0 24 24" fill={color} stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" /></svg>
    );
    if (icon === 'globe') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
    );
    if (icon === 'upload') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
    );
    if (icon === 'heart') return (
        <svg {...s} viewBox="0 0 24 24" fill={color} stroke="none"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
    );
    if (icon === 'trophy') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M17 5h3a2 2 0 0 1-2 4h-1" /><path d="M7 5H4a2 2 0 0 0 2 4h1" /></svg>
    );
    if (icon === 'check') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    );
    return null;
}

function MiniBadges({ badges }) {
    if (!badges || badges.length === 0) return null;
    return badges.map(badgeId => {
        const opt = BADGE_OPTIONS.find(b => b.id === badgeId);
        if (!opt) return null;
        const color = opt.color || '#9ca3af';
        return (
            <span
                key={badgeId}
                title={opt.label}
                className="gchat-badge"
                style={{ color, borderColor: `${color}55`, background: `${color}18` }}
            >
                <BadgeIcon icon={opt.icon} size={11} color={color} /> {opt.label}
            </span>
        );
    });
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
        <div className="gchat-card">
            <div className="gchat-header">
                <span className="gchat-header-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    Sohbet
                </span>
                <span className="gchat-live-dot" title="Canlı" />
            </div>

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
                                    <MiniBadges badges={m.badges} />
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
                        value={input}
                        maxLength={MAX_LEN}
                        placeholder="Bir mesaj yaz…"
                        onChange={e => setInput(e.target.value)}
                        disabled={sending}
                    />
                    <span className="gchat-counter">{input.length}/{MAX_LEN}</span>
                    <button type="submit" className="gchat-send-btn" disabled={sending || !input.trim()} aria-label="Gönder">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </button>
                </form>
            ) : (
                <div className="gchat-login-cta">
                    <Link href="/login">Giriş yap</Link> ve sohbete katıl
                </div>
            )}
            {error && <div className="gchat-error">{error}</div>}

            <style jsx>{`
                .gchat-card {
                    border-radius: var(--radius-lg);
                    background: var(--bg-card);
                    box-shadow: inset 0 0 0 1px var(--border-color), var(--shadow);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .gchat-header {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 14px 18px;
                    border-bottom: 1px solid var(--border-color);
                }
                .gchat-header-title {
                    display: flex; align-items: center; gap: 8px;
                    font-weight: 800; font-size: 1rem;
                }
                .gchat-live-dot {
                    width: 9px; height: 9px; border-radius: 50%;
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
                .gchat-badge {
                    display: inline-flex; align-items: center; gap: 3px;
                    font-size: 0.68rem; padding: 1px 6px; border-radius: 20px;
                    border: 1px solid;
                    font-weight: 700;
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
                    border-top: 1px solid var(--border-color);
                }
                .gchat-input-row input {
                    flex: 1;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    padding: 10px 12px;
                    color: var(--text-primary);
                    font-size: 0.88rem;
                }
                .gchat-input-row input:focus { outline: none; border-color: var(--accent); }
                .gchat-counter { font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; }
                .gchat-send-btn {
                    display: flex; align-items: center; justify-content: center;
                    width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
                    background: var(--accent); color: white; border: none; cursor: pointer;
                }
                .gchat-send-btn:disabled { opacity: 0.5; cursor: default; }
                .gchat-login-cta {
                    padding: 14px 18px;
                    text-align: center;
                    font-size: 0.88rem;
                    color: var(--text-muted);
                    border-top: 1px solid var(--border-color);
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
        </div>
    );
}
