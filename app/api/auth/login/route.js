import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';

// Maintenance mode cookie max-age: 30 days
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const loginRateLimiter = createRateLimiter(5, 15 * 60 * 1000);

async function verifyTurnstile(token) {
    if (process.env.DISABLE_TURNSTILE === '1') return { ok: true }; // disabled via env
    const db = await getDb();
    const secretRow = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'turnstile_secret_key'").get();
    const secret = secretRow?.setting_value;
    if (!secret || secret === '') return { ok: true }; // Turnstile not configured → skip
    if (!token) return { ok: false, error: 'Human verification required' };

    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
    });
    const data = await res.json();
    if (!data.success) return { ok: false, error: 'Human verification failed. Please try again.' };
    return { ok: true };
}

export async function POST(request) {
    try {
        const rateLimitResult = loginRateLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
            );
        }

        const { email, password, turnstileToken } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        // Verify Turnstile if configured
        const turnstile = await verifyTurnstile(turnstileToken);
        if (!turnstile.ok) {
            return NextResponse.json({ error: turnstile.error }, { status: 400 });
        }

        const db = await getDb();
        const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (!user || !verifyPassword(password, user.password_hash)) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        // Ban kontrolü
        if (user.banned_until) {
            const bannedUntil = new Date(user.banned_until);
            if (bannedUntil > new Date()) {
                return NextResponse.json(
                    { error: 'Account suspended', bannedUntil: user.banned_until },
                    { status: 403 }
                );
            }
        }

        const token = generateToken(user);
        const userData = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            avatar_url: user.avatar_url,
        };

        // Block non-admin users during maintenance mode
        try {
            const maintenanceRow = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'maintenance_mode'").get();
            if (maintenanceRow?.setting_value === '1' && user.role !== 'admin') {
                return NextResponse.json({ error: 'Site is under maintenance. Only administrators can log in.' }, { status: 403 });
            }
        } catch {}

        const response = NextResponse.json({ user: userData, token });
        // Set httpOnly cookie so server components (layout) can read role for maintenance mode
        response.cookies.set('yomi_token', token, {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: COOKIE_MAX_AGE,
            secure: process.env.NODE_ENV === 'production',
        });
        return response;
    } catch (error) {
        console.error('POST /api/auth/login error:', error);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
