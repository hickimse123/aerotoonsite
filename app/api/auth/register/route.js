import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';

// Username: 3-30 chars, alphanumeric + underscore + Turkish characters
const USERNAME_REGEX = /^[a-zA-Z0-9_çÇğĞıİşŞüÜöÖ]{3,30}$/;
// Basic email format check
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerRateLimiter = createRateLimiter(3, 60 * 60 * 1000);

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
        const rateLimitResult = registerRateLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
            );
        }

        const body = await request.json();
        const username = typeof body.username === 'string' ? body.username.trim() : '';
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const turnstileToken = body.turnstileToken || '';

        if (!username || !email || !password) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        if (!USERNAME_REGEX.test(username)) {
            return NextResponse.json(
                { error: 'Kullanıcı adı 3-30 karakter olmalı, sadece harf, rakam, alt çizgi ve Türkçe karakter içerebilir' },
                { status: 400 }
            );
        }

        if (!EMAIL_REGEX.test(email)) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        if (password.length > 128) {
            return NextResponse.json({ error: 'Password is too long (max 128 characters)' }, { status: 400 });
        }

        // Verify Turnstile if configured
        const turnstile = await verifyTurnstile(turnstileToken);
        if (!turnstile.ok) {
            return NextResponse.json({ error: turnstile.error }, { status: 400 });
        }

        const db = await getDb();

        const existing = await db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
        if (existing) {
            return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
        }

        const passwordHash = hashPassword(password);
        const result = await db.prepare(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
        ).run(username, email, passwordHash);

        const user = { id: result.lastInsertRowid, username, email, role: 'user' };
        const token = generateToken(user);

        const response = NextResponse.json({ user, token }, { status: 201 });
        response.cookies.set('yomi_token', token, {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30,
            secure: process.env.NODE_ENV === 'production',
        });
        return response;
    } catch (error) {
        console.error('POST /api/auth/register error:', error);
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
}
