'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRedirect() {
    const router = useRouter();
    useEffect(() => { router.replace('/admin-panel'); }, [router]);
    return <div className="page-loading"><div className="spinner" /></div>;
}
