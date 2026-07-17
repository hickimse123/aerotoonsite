import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, hasAdminPanelAccess } from '@/lib/auth';
import { invalidateSettingsCache } from '@/lib/settings-cache';

export async function POST(request) {
    try {
        const user = await requireAuth(request);
        const body = await request.json();
        const db = await getDb();
        if (!await hasAdminPanelAccess(user, db)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const stmt = db.prepare('INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES (?, ?)');

        await db.transaction(async (settingsObj) => {
            for (const [key, value] of Object.entries(settingsObj)) {
                await stmt.run(key, String(value));
            }
        })(body);

        try {
            await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)').run(
                user.id, user.username, 'update_settings', JSON.stringify(body).substring(0, 200)
            );
        } catch (e) { /* log hatası ana işlemi etkilemesin */ }

        // Settings değiştiğinde cache'i anında temizle (favicon, logo vb. hemen yansısın)
        invalidateSettingsCache();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Settings save error:', error);
        return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
    }
}
