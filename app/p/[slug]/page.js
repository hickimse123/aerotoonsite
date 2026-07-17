'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function CustomPage() {
    const { slug } = useParams();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!slug) return;
        fetch(`/api/pages/${slug}`)
            .then(r => r.json())
            .then(d => {
                if (d.success) setPage(d.page);
                else setNotFound(true);
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) {
        return (
            <div style={{ maxWidth: 860, margin: '60px auto', padding: '0 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '1.1rem' }}>Loading...</div>
            </div>
        );
    }

    if (notFound || !page) {
        return (
            <div style={{ maxWidth: 860, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>404</div>
                <h1 style={{ fontSize: '1.4rem', marginBottom: 12 }}>Page not found</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>The page you are looking for does not exist or has been removed.</p>
                <a href="/" className="btn btn-primary">Go Home</a>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 80px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 32, borderBottom: '1px solid var(--border-color)', paddingBottom: 20 }}>
                {page.title}
            </h1>
            <div
                className="custom-page-content policy-content"
                dangerouslySetInnerHTML={{ __html: page.content }}
            />
        </div>
    );
}