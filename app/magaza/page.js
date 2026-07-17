'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

const TYPE_TABS = [
    { id: 'badge', label: 'Rozetler' },
    { id: 'frame', label: 'Avatar Çerçeveleri' },
    { id: 'title', label: 'Unvanlar' },
];

export default function ShopPage() {
    const { user, authFetch, refreshUser } = useAuth();
    const [appSettings, setAppSettings] = useState({});
    const [items, setItems] = useState([]);
    const [ownedIds, setOwnedIds] = useState(new Set());
    const [equipped, setEquipped] = useState({ frame_id: null, title_id: null, badge_id: null });
    const [loading, setLoading] = useState(true);
    const [activeType, setActiveType] = useState('badge');
    const [busyId, setBusyId] = useState(null);
    const [msg, setMsg] = useState(null); // { text, type }

    const pointsName = appSettings.points_name || 'Yomi Puanı';

    // Herkese açık veriler (ürünler + ayarlar): sadece bir kere, auth durumunu
    // beklemeden yüklenir. Önceden bu, kullanıcı oturumu doğrulanır doğrulanmaz
    // (yani her ziyarette kısa bir süre sonra) TEKRAR tetikleniyordu — sayfa bir
    // an yüklenip sonra "Yükleniyor..." ekranına dönüp tekrar yükleniyordu.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const [itemsRes, settingsRes] = await Promise.all([
                    fetch('/api/shop/items'),
                    fetch('/api/settings'),
                ]);
                const itemsData = await itemsRes.json();
                const settingsData = await settingsRes.json();
                if (cancelled) return;
                setItems(itemsData.items || []);
                if (settingsData.success) setAppSettings(settingsData.settings || {});
            } catch (e) { console.error(e); }
            if (!cancelled) setLoading(false);
        })();
        return () => { cancelled = true; };
    }, []);

    // Kullanıcıya özel veriler (sahip olunanlar + kuşanılanlar): kullanıcı
    // belli olduğunda ayrıca yüklenir, ana "loading" durumunu etkilemez.
    const loadMine = useCallback(async () => {
        if (!user) { setOwnedIds(new Set()); setEquipped({ frame_id: null, title_id: null, badge_id: null }); return; }
        try {
            const mineRes = await authFetch('/api/shop/my-items');
            const mineData = await mineRes.json();
            if (mineData.success) {
                setOwnedIds(new Set(mineData.owned.map(i => i.id)));
                setEquipped(mineData.equipped);
            }
        } catch (e) { console.error(e); }
    }, [user, authFetch]);

    useEffect(() => { loadMine(); }, [loadMine]);

    function showMsg(text, type = 'success') {
        setMsg({ text, type });
        setTimeout(() => setMsg(null), 3500);
    }

    async function buy(item) {
        if (!user) return;
        if ((user.yomi_points || 0) < item.price) { showMsg('Yetersiz puan', 'error'); return; }
        setBusyId(item.id);
        try {
            const res = await authFetch('/api/shop/purchase', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: item.id }),
            });
            const data = await res.json();
            if (data.success) {
                showMsg(data.message, 'success');
                setOwnedIds(prev => new Set([...prev, item.id]));
                refreshUser();
            } else {
                showMsg(data.error || 'Satın alma başarısız', 'error');
            }
        } catch (e) { showMsg('Bir hata oluştu', 'error'); }
        setBusyId(null);
    }

    async function equip(item, alreadyEquipped) {
        setBusyId(item.id);
        try {
            const res = await authFetch('/api/shop/equip', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: item.type, itemId: alreadyEquipped ? null : item.id }),
            });
            const data = await res.json();
            if (data.success) {
                setEquipped(prev => ({ ...prev, [`${item.type}_id`]: alreadyEquipped ? null : item.id }));
                refreshUser();
            } else {
                showMsg(data.error || 'Bir hata oluştu', 'error');
            }
        } catch (e) { showMsg('Bir hata oluştu', 'error'); }
        setBusyId(null);
    }

    const filtered = items.filter(i => i.type === activeType);

    return (
        <div className="page-container glass-page-container" style={{ maxWidth: 1000, padding: '24px 16px' }}>
            <div className="glass-panel" style={{ padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                        Mağaza
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.9rem' }}>
                        {pointsName} ile rozet, çerçeve ve unvan satın al, profilinde kuşan.
                    </p>
                </div>
                {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(94,114,228,0.12)', border: '1px solid rgba(94,114,228,0.3)', borderRadius: 10, padding: '10px 16px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        <strong style={{ color: 'var(--accent)' }}>{(user.yomi_points || 0).toLocaleString()}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{pointsName}</span>
                    </div>
                ) : (
                    <Link href="/login" className="btn btn-primary">Giriş Yap</Link>
                )}
            </div>

            {msg && (
                <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 10, fontSize: '0.88rem', fontWeight: 600,
                    background: msg.type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                    border: `1px solid ${msg.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                    color: msg.type === 'error' ? '#ef4444' : '#22c55e' }}>
                    {msg.text}
                </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {TYPE_TABS.map(t => (
                    <button key={t.id} onClick={() => setActiveType(t.id)}
                        className={`btn btn-sm ${activeType === t.id ? 'btn-primary' : 'btn-ghost'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yükleniyor...</div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Bu kategoride henüz satışta öğe yok.</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                    {filtered.map(item => {
                        const owned = ownedIds.has(item.id);
                        const isEquipped = equipped[`${item.type}_id`] === item.id;
                        const canAfford = user && (user.yomi_points || 0) >= item.price;
                        return (
                            <div key={item.id} className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', border: isEquipped ? '1px solid var(--accent)' : undefined }}>
                                {item.type === 'title' ? (
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={item.title_color || 'currentColor'} strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                                    </div>
                                ) : (
                                    <div style={{ width: 64, height: 64, borderRadius: item.type === 'frame' ? '50%' : 10, background: 'var(--bg-tertiary)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {item.image_url && <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                                    </div>
                                )}
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: item.type === 'title' ? (item.title_color || undefined) : undefined }}>{item.name}</div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.price.toLocaleString()} {pointsName}</div>

                                {!user ? (
                                    <Link href="/login" className="btn btn-ghost btn-sm" style={{ width: '100%' }}>Giriş Yap</Link>
                                ) : owned ? (
                                    <button className={`btn btn-sm ${isEquipped ? 'btn-ghost' : 'btn-primary'}`} style={{ width: '100%' }}
                                        disabled={busyId === item.id} onClick={() => equip(item, isEquipped)}>
                                        {busyId === item.id ? '...' : isEquipped ? 'Kaldır' : 'Kuşan'}
                                    </button>
                                ) : (
                                    <button className="btn btn-primary btn-sm" style={{ width: '100%' }}
                                        disabled={!canAfford || busyId === item.id} onClick={() => buy(item)}>
                                        {busyId === item.id ? '...' : canAfford ? 'Satın Al' : 'Yetersiz Puan'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
