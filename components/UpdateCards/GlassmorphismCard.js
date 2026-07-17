'use client';
import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const STATUS_CONFIG = {
  ongoing:   { label: 'Devam Ediyor', bg: 'rgba(16,185,129,0.92)',  dot: '#10b981', glow: 'rgba(16,185,129,0.35)' },
  completed: { label: 'Tamamlandı',  bg: 'rgba(99,102,241,0.92)',  dot: '#6366f1', glow: 'rgba(99,102,241,0.35)' },
  hiatus:    { label: 'Ara Verildi', bg: 'rgba(245,158,11,0.92)',  dot: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
  cancelled: { label: 'İptal Edildi',bg: 'rgba(239,68,68,0.92)',   dot: '#ef4444', glow: 'rgba(239,68,68,0.35)' },
  current:   { label: 'Güncel',      bg: 'rgba(6,182,212,0.92)',   dot: '#06b6d4', glow: 'rgba(6,182,212,0.35)' },
};
const DEFAULT_STATUS = STATUS_CONFIG.ongoing;

function GlassmorphismCard({ href, coverUrl, title, type, status, statusKey, children }) {
  const sc = STATUS_CONFIG[statusKey] || DEFAULT_STATUS;

  return (
    <div className="gc-card">
      {/* ── Sol: Kapak ── */}
      <Link href={href} className="gc-cover-link">
        {/* Kapak görseli */}
        <Image
          src={coverUrl}
          alt={title}
          fill
          loading="lazy"
          sizes="110px"
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
          quality={80}
        />

        {/* Tür rozeti — sol üst */}
        {type && (
          <span className="gc-type-badge">{type}</span>
        )}

        {/* Durum rozeti — sol alt, kapağın üzerinde ABSOLUTE */}
        {statusKey && (
          <div
            className={`gc-status-badge gc-status-${statusKey}`}
            style={{ background: sc.bg }}
          >
            <span
              className="gc-status-dot"
              style={{ background: sc.dot, boxShadow: `0 0 5px ${sc.glow}` }}
            />
            {sc.label}
          </div>
        )}

        {/* Alt koyu gradient — badge okunabilirliği için */}
        <div className="gc-cover-gradient" />
      </Link>

      {/* ── Sağ: İçerik ── */}
      <div className="gc-content">
        <Link href={href} className="gc-title-link">
          <h3 className="gc-title">{title}</h3>
        </Link>
        <div className="gc-chapters">
          {children}
        </div>
      </div>
    </div>
  );
}

export default memo(GlassmorphismCard);