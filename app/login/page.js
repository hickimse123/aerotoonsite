'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import TurnstileWidget from '@/components/TurnstileWidget';
import { useSettings } from '@/components/SettingsProvider';

export default function LoginPage() {
    const { login } = useAuth();
    const { settings } = useSettings();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');

    const siteKey = process.env.NEXT_PUBLIC_DISABLE_TURNSTILE !== '1' ? (settings?.turnstile_site_key || '') : '';

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        // If Turnstile is configured and token not yet received, block
        if (siteKey && !turnstileToken) {
            setError('Lütfen insan doğrulamasını tamamlayın.');
            return;
        }
        setLoading(true);
        try {
            await login(email, password, turnstileToken);
            // Tam sayfa yenilemesi — sunucu admin cookie'sini görsün, bakım modu bypass çalışsın
            window.location.href = '/';
        } catch (err) {
            setError(err.message);
            // Reset turnstile on failure
            if (siteKey && window.turnstile) {
                try { window.turnstile.reset(); } catch {}
            }
            setTurnstileToken('');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card fade-in">
                <h1>Tekrar Hoş Geldiniz</h1>
                <p className="auth-subtitle">{settings.auth_subtitle_login || 'Okumaya devam etmek için giriş yapın'}</p>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>E-posta</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="eposta@adresiniz.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="off"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Şifre</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="off"
                            required
                        />
                    </div>

                    {siteKey && (
                        <TurnstileWidget
                            siteKey={siteKey}
                            onVerify={(token) => setTurnstileToken(token || '')}
                            onError={() => setError('Turnstile doğrulama hatası. Lütfen sayfayı yenileyin.')}
                        />
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 8 }}
                        disabled={loading || (siteKey && !turnstileToken)}
                    >
                        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                    </button>
                </form>

                <div className="auth-footer">
                    Hesabınız yok mu? <Link href="/register">Kayıt Ol</Link>
                </div>
            </div>
        </div>
    );
}
