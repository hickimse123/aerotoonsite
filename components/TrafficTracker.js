'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Arka planda sessizce trafik verisi kaydeder
// Sayfa değişimlerini otomatik olarak izler
export default function TrafficTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname) return;
        // Admin paneli ve API endpoint'lerini takip etme
        if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return;

        const referrer = typeof document !== 'undefined' ? document.referrer : '';

        fetch('/api/admin/traffic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: pathname, referrer }),
        }).catch(() => {}); // Hataları sessizce görmezden gel
    }, [pathname]);

    return null; // Görsel render yok
}