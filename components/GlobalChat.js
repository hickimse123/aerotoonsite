'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { getCultivationData } from '@/lib/gamification';

const POLL_MS = 3000;
const MAX_LEN = 500;

// Sohbette hızlı erişim için küçük, elle seçilmiş emoji seti (harici kütüphane yok)
const EMOJI_LIST = [
    '😀','😁','😂','🤣','😊','😍','😘','😜','🤔','🙄','😴','😭','😢','😱','😡','🥵','🥶','🤯','😎','🥳',
    '🤩','😇','🙃','😏','😳','🤗','🫡','🙌','👏','👍','👎','🤝','🙏','💪','✌️','🤞','👌','🔥','✨','💯',
    '⭐','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','😻','😹','🐱','🐶','🐵','🦊','🐼','🐸','🎉',
    '🎊','🎈','🚀','✈️','🌙','☀️','⚡','🌈','☕','🍕','🍔','🍿','🎮','🏆','💀','👻','🤖','👀','😤','🫠',
];

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

// Alıntı/mesaj önizlemesi için kısa metin — GIF'se etiket göster
function previewText(message, gifUrl) {
    if (message && message.trim()) return message.length > 80 ? message.slice(0, 80) + '…' : message;
    if (gifUrl) return '🖼️ GIF';
    return '';
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

// Sohbet giriş satırındaki emoji seçici — küçük, kütüphanesiz emoji ızgarası
function EmojiPicker({ onPick, onClose }) {
    const ref = useRef(null);
    useEffect(() => {
        function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [onClose]);
    return (
        <div className="gchat-popover gchat-emoji-pop" ref={ref}>
            <div className="gchat-emoji-grid">
                {EMOJI_LIST.map(em => (
                    <button key={em} type="button" className="gchat-emoji-btn" onClick={() => onPick(em)}>{em}</button>
                ))}
            </div>
        </div>
    );
}

// GIF seçici — Tenor arama (yapılandırıldıysa) veya elle bağlantı yapıştırma
function GifPicker({ authFetch, onPick, onClose }) {
    const ref = useRef(null);
    const [tab, setTab] = useState('search'); // 'search' | 'paste'
    const [configured, setConfigured] = useState(true); // ilk sonuca kadar iyimser
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pasteUrl, setPasteUrl] = useState('');
    const debounceRef = useRef(null);

    useEffect(() => {
        function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [onClose]);

    const runSearch = useCallback(async (q) => {
        setLoading(true);
        try {
            const res = await authFetch(`/api/chat/gif-search?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            if (data.configured === false) { setConfigured(false); setResults([]); }
            else if (data.success) { setConfigured(true); setResults(data.results || []); }
        } catch {}
        setLoading(false);
    }, [authFetch]);

    useEffect(() => {
        runSearch(''); // popover açılınca popüler GIF'lerle başla
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleQueryChange(v) {
        setQuery(v);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => runSearch(v), 400);
    }

    return (
        <div className="gchat-popover gchat-gif-pop" ref={ref}>
            <div className="gchat-gif-tabs">
                <button type="button" className={`gchat-gif-tab ${tab === 'search' ? 'is-active' : ''}`} onClick={() => setTab('search')}>Ara</button>
                <button type="button" className={`gchat-gif-tab ${tab === 'paste' ? 'is-active' : ''}`} onClick={() => setTab('paste')}>Bağlantı Yapıştır</button>
            </div>

            {tab === 'search' ? (
                configured ? (
                    <>
                        <input
                            type="text"
                            className="form-input gchat-gif-search-input"
                            placeholder="GIF ara…"
                            value={query}
                            onChange={e => handleQueryChange(e.target.value)}
                            autoFocus
                        />
                        <div className="gchat-gif-grid">
                            {loading && <div className="gchat-gif-status">Yükleniyor…</div>}
                            {!loading && results.length === 0 && <div className="gchat-gif-status">Sonuç yok</div>}
                            {!loading && results.map(r => (
                                <button key={r.id} type="button" className="gchat-gif-thumb" onClick={() => onPick(r.url)}>
                                    <img src={r.preview} alt="" loading="lazy" />
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="gchat-gif-status" style={{ padding: '20px 10px' }}>
                        GIF araması henüz yapılandırılmamış. "Bağlantı Yapıştır" sekmesinden GIF ekleyebilirsin.
                    </div>
                )
            ) : (
                <div className="gchat-gif-paste">
                    <input
                        type="url"
                        className="form-input"
                        placeholder="https://.../ornek.gif"
                        value={pasteUrl}
                        onChange={e => setPasteUrl(e.target.value)}
                        autoFocus
                    />
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={!pasteUrl.trim()}
                        onClick={() => onPick(pasteUrl.trim())}
                    >
                        Ekle
                    </button>
                </div>
            )}
        </div>
    );
}

export default function GlobalChat() {
    const { user, authFetch } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null); // { id, username, display_name, message, gif_url }
    const [showEmoji, setShowEmoji] = useState(false);
    const [showGif, setShowGif] = useState(false);
    const [highlightId, setHighlightId] = useState(null);
    const [gifEnabled, setGifEnabled] = useState(true);
    const listRef = useRef(null);
    const inputRef = useRef(null);
    const lastIdRef = useRef(0);
    const pollRef = useRef(null);
    const rowRefs = useRef(new Map());

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
        fetch('/api/settings').then(r => r.json()).then(d => {
            if (d.success && d.settings.chat_gif_enabled === '0') setGifEnabled(false);
        }).catch(() => {});
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

    async function sendMessage(e, overrideGifUrl) {
        if (e && e.preventDefault) e.preventDefault();
        const trimmed = input.trim();
        const gifUrl = overrideGifUrl || null;
        if (!trimmed && !gifUrl) return;
        if (sending) return;
        setError('');
        setSending(true);
        try {
            const res = await authFetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: trimmed, gifUrl, replyToId: replyingTo?.id || null }),
            });
            const data = await res.json();
            if (data.success) {
                setMessages(prev => {
                    if (prev.some(m => m.id === data.message.id)) return prev;
                    return [...prev, data.message].slice(-100);
                });
                lastIdRef.current = data.message.id;
                setInput('');
                setReplyingTo(null);
                setShowGif(false);
                setShowEmoji(false);
                setTimeout(() => scrollToBottom(true), 30);
            } else {
                setError(data.error || 'Mesaj gönderilemedi');
            }
        } catch {
            setError('Bir hata oluştu');
        }
        setSending(false);
    }

    function insertEmoji(emoji) {
        const el = inputRef.current;
        if (!el) { setInput(v => v + emoji); return; }
        const start = el.selectionStart ?? input.length;
        const end = el.selectionEnd ?? input.length;
        const next = input.slice(0, start) + emoji + input.slice(end);
        setInput(next.slice(0, MAX_LEN));
        requestAnimationFrame(() => {
            el.focus();
            const pos = start + emoji.length;
            el.setSelectionRange(pos, pos);
        });
    }

    function handleGifPick(url) {
        setShowGif(false);
        sendMessage(null, url);
    }

    function scrollToMessage(id) {
        const node = rowRefs.current.get(id);
        if (!node) return;
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightId(id);
        setTimeout(() => setHighlightId(prev => (prev === id ? null : prev)), 1400);
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
                    const replyShownName = m.reply_to_id ? (m.reply_display_name || m.reply_username) : null;
                    return (
                        <div
                            className={`gchat-row ${highlightId === m.id ? 'is-highlighted' : ''}`}
                            key={m.id}
                            ref={node => { if (node) rowRefs.current.set(m.id, node); else rowRefs.current.delete(m.id); }}
                        >
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
                                    {user && (
                                        <button
                                            type="button"
                                            className="gchat-reply-btn"
                                            title="Yanıtla"
                                            onClick={() => { setReplyingTo({ id: m.id, username: m.username, display_name: m.display_name, message: m.message, gif_url: m.gif_url }); inputRef.current?.focus(); }}
                                        >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                                        </button>
                                    )}
                                </div>

                                {m.reply_to_id && (
                                    <button type="button" className="gchat-quote" onClick={() => scrollToMessage(m.reply_to_id)}>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                                        <span className="gchat-quote-name">{replyShownName || 'silinmiş mesaj'}</span>
                                        <span className="gchat-quote-text">{previewText(m.reply_message, m.reply_gif_url)}</span>
                                    </button>
                                )}

                                {m.message && <div className="gchat-text">{m.message}</div>}
                                {m.gif_url && (
                                    <div className="gchat-gif-wrap">
                                        <img src={m.gif_url} alt="GIF" className="gchat-gif-img" loading="lazy" />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {user ? (
                <>
                    {replyingTo && (
                        <div className="gchat-replying-bar">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                            <span className="gchat-replying-name">{replyingTo.display_name || replyingTo.username}</span>
                            <span className="gchat-replying-text">{previewText(replyingTo.message, replyingTo.gif_url)}</span>
                            <button type="button" className="gchat-replying-cancel" onClick={() => setReplyingTo(null)} aria-label="İptal">✕</button>
                        </div>
                    )}
                    <form className="gchat-input-row" onSubmit={sendMessage}>
                        <div className="gchat-input-tools">
                            <button
                                type="button"
                                className="gchat-tool-btn"
                                aria-label="Emoji ekle"
                                onClick={() => { setShowEmoji(v => !v); setShowGif(false); }}
                            >
                                🙂
                                {showEmoji && <EmojiPicker onPick={insertEmoji} onClose={() => setShowEmoji(false)} />}
                            </button>
                            {gifEnabled && (
                                <button
                                    type="button"
                                    className="gchat-tool-btn gchat-tool-gif"
                                    aria-label="GIF ekle"
                                    onClick={() => { setShowGif(v => !v); setShowEmoji(false); }}
                                >
                                    GIF
                                    {showGif && <GifPicker authFetch={authFetch} onPick={handleGifPick} onClose={() => setShowGif(false)} />}
                                </button>
                            )}
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            className="form-input"
                            value={input}
                            maxLength={MAX_LEN}
                            placeholder={replyingTo ? 'Yanıt yaz…' : 'Bir mesaj yaz…'}
                            onChange={e => setInput(e.target.value)}
                            disabled={sending}
                        />
                        <span className="gchat-counter">{input.length}/{MAX_LEN}</span>
                        <button type="submit" className="btn btn-primary gchat-send-btn" disabled={sending || !input.trim()} aria-label="Gönder">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                        </button>
                    </form>
                </>
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
                .gchat-row { display: flex; gap: 10px; align-items: flex-start; border-radius: 8px; transition: background 0.6s ease; }
                .gchat-row.is-highlighted { background: rgba(56,189,248,0.12); }
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
                .gchat-reply-btn {
                    background: none; border: none; cursor: pointer;
                    color: var(--text-muted); padding: 2px 4px; border-radius: 4px;
                    display: flex; align-items: center; opacity: 0.6;
                    transition: opacity 0.15s ease, color 0.15s ease;
                }
                .gchat-reply-btn:hover { opacity: 1; color: var(--accent); }
                .gchat-quote {
                    display: flex; align-items: center; gap: 5px;
                    max-width: 100%;
                    margin-bottom: 4px;
                    padding: 3px 8px;
                    background: var(--bg-tertiary);
                    border-left: 2px solid var(--accent);
                    border-radius: 4px;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    cursor: pointer;
                    text-align: left;
                }
                .gchat-quote:hover { background: var(--bg-card); }
                .gchat-quote-name { font-weight: 700; color: var(--accent); flex-shrink: 0; }
                .gchat-quote-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .gchat-text {
                    font-size: 0.88rem;
                    color: var(--text-secondary);
                    word-break: break-word;
                    white-space: pre-wrap;
                }
                .gchat-gif-wrap { margin-top: 6px; }
                .gchat-gif-img {
                    max-width: 220px; max-height: 220px;
                    border-radius: 10px;
                    display: block;
                }
                .gchat-replying-bar {
                    display: flex; align-items: center; gap: 6px;
                    padding: 8px 14px;
                    background: var(--bg-tertiary);
                    border-top: 1px solid rgba(255,255,255,0.05);
                    font-size: 0.78rem;
                    color: var(--text-muted);
                }
                .gchat-replying-name { font-weight: 700; color: var(--accent); flex-shrink: 0; }
                .gchat-replying-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .gchat-replying-cancel {
                    background: none; border: none; cursor: pointer; color: var(--text-muted);
                    font-size: 0.9rem; padding: 2px 6px; flex-shrink: 0;
                }
                .gchat-replying-cancel:hover { color: var(--danger); }
                .gchat-input-row {
                    display: flex; align-items: center; gap: 8px;
                    padding: 12px 14px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }
                .gchat-input-tools { display: flex; gap: 4px; flex-shrink: 0; position: relative; }
                .gchat-tool-btn {
                    position: relative;
                    width: 34px; height: 34px; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                    background: var(--bg-tertiary); border: 1px solid var(--border-color);
                    border-radius: 8px; cursor: pointer;
                    font-size: 1rem; line-height: 1;
                    color: var(--text-secondary);
                }
                .gchat-tool-btn:hover { background: var(--bg-card); }
                .gchat-tool-gif { font-size: 0.62rem; font-weight: 800; letter-spacing: 0.02em; }
                .gchat-popover {
                    position: absolute; bottom: 42px; left: 0;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
                    z-index: 20;
                    padding: 10px;
                }
                .gchat-emoji-pop { width: 260px; }
                .gchat-emoji-grid {
                    display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px;
                    max-height: 200px; overflow-y: auto;
                }
                .gchat-emoji-btn {
                    background: none; border: none; cursor: pointer;
                    font-size: 1.15rem; padding: 4px; border-radius: 6px;
                    line-height: 1;
                }
                .gchat-emoji-btn:hover { background: var(--bg-tertiary); }
                .gchat-gif-pop { width: 280px; }
                .gchat-gif-tabs { display: flex; gap: 4px; margin-bottom: 8px; }
                .gchat-gif-tab {
                    flex: 1; padding: 6px; font-size: 0.72rem; font-weight: 700;
                    background: var(--bg-tertiary); border: 1px solid var(--border-color);
                    border-radius: 6px; cursor: pointer; color: var(--text-muted);
                }
                .gchat-gif-tab.is-active { color: var(--accent); border-color: var(--accent); background: rgba(94,114,228,0.1); }
                .gchat-gif-search-input { font-size: 0.8rem; padding: 7px 10px; margin-bottom: 8px; }
                .gchat-gif-grid {
                    display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
                    max-height: 220px; overflow-y: auto;
                }
                .gchat-gif-thumb {
                    background: var(--bg-tertiary); border: none; border-radius: 6px;
                    overflow: hidden; cursor: pointer; padding: 0; aspect-ratio: 1;
                }
                .gchat-gif-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
                .gchat-gif-status { grid-column: 1 / -1; text-align: center; color: var(--text-muted); font-size: 0.78rem; padding: 14px 0; }
                .gchat-gif-paste { display: flex; gap: 6px; }
                .gchat-gif-paste input { flex: 1; font-size: 0.78rem; padding: 7px 10px; }
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
