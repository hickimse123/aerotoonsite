// Canonical definition of admin-assigned custom badge options.
// Import this wherever badge IDs, labels, icons, or colors are needed.
// icon field: SVG icon name string (rendered by BadgeIcon component in admin panel)
export const BADGE_OPTIONS = [
    { id: 'vip',        label: 'VIP',          icon: 'star',       color: '#f59e0b' },
    { id: 'translator', label: 'Çevirmen',      icon: 'globe',      color: '#22c55e' },
    { id: 'uploader',   label: 'Yükleyici',     icon: 'upload',     color: '#38bdf8' },
    { id: 'supporter',  label: 'Destekçi',      icon: 'heart',      color: '#fbbf24' },
    { id: 'pioneer',    label: 'Öncü',          icon: 'trophy',     color: '#f97316' },
    { id: 'verified',   label: 'Doğrulanmış',   icon: 'check',      color: '#818cf8' },
];

/**
 * Load custom badges stored in app_settings (key: custom_badges).
 * Returns an array of { id, label, icon, color, custom: true }
 */
export async function getCustomBadges(db) {
    try {
        const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'custom_badges'").get();
        if (!row?.setting_value) return [];
        const parsed = JSON.parse(row.setting_value);
        return Array.isArray(parsed) ? parsed.map(b => ({ ...b, custom: true })) : [];
    } catch {
        return [];
    }
}

/**
 * Returns all badge options: built-in BADGE_OPTIONS + admin-created custom badges.
 * Pass a better-sqlite3 db instance.
 */
export async function getAllBadges(db) {
    return [...BADGE_OPTIONS, ...(await getCustomBadges(db))];
}