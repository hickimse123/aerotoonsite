import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser, generateToken } from '@/lib/auth';

export async function GET(request) {
    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        // Fetch full profile (getVerifiedUser returns a lighter subset)
        const user = await db.prepare(
            'SELECT id, username, email, avatar_url, cover_url, role, yomi_points, last_daily_login, last_avatar_update, last_cover_update, avatar_changes_today, cover_changes_today, created_at FROM users WHERE id = ?'
        ).get(result.user.id);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Issue a fresh token so the client always has a non-stale one after restore
        const token = generateToken(user);
        const response = NextResponse.json({ user, token });
        response.cookies.set('yomi_token', token, {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30,
            secure: process.env.NODE_ENV === 'production',
        });
        return response;
    } catch (error) {
        console.error('GET /api/auth/me error:', error);
        return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }
}