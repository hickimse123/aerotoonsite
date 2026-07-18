import { seedDatabase } from './seed.js';
import { createClient } from '@libsql/client';

/**
 * ---------------------------------------------------------------------------
 * Turso (libSQL) uyum katmanı
 * ---------------------------------------------------------------------------
 * better-sqlite3, senkron ve yerel bir dosyaya yazıyordu — Vercel'in stateless
 * serverless fonksiyonlarında bu kalıcı değildi. Bunun yerine Turso (uzak,
 * SQLite uyumlu, ücretsiz katmanlı bir veritabanı) kullanıyoruz.
 *
 * Turso ağ üzerinden (HTTP) çalıştığı için her sorgu ASENKRON olmak zorunda.
 * Bu yüzden aşağıdaki wrapper, eski `db.prepare(sql).get()/.all()/.run()`
 * imzasını korur ama artık hepsi Promise döner — kodun geri kalanında
 * `await db.prepare(...)` şeklinde kullanılır.
 * ---------------------------------------------------------------------------
 */

function normalizeArgs(args) {
  // better-sqlite3 hem .get(a, b, c) hem de .get([a, b, c]) destekler.
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

function rowsToObjects(result) {
  const cols = result.columns;
  return result.rows.map((row) => {
    const obj = {};
    for (let i = 0; i < cols.length; i++) obj[cols[i]] = row[i];
    return obj;
  });
}

function wrapClient(client) {
  return {
    prepare(sql) {
      return {
        async get(...args) {
          const result = await client.execute({ sql, args: normalizeArgs(args) });
          const objs = rowsToObjects(result);
          return objs[0];
        },
        async all(...args) {
          const result = await client.execute({ sql, args: normalizeArgs(args) });
          return rowsToObjects(result);
        },
        async run(...args) {
          const result = await client.execute({ sql, args: normalizeArgs(args) });
          return {
            lastInsertRowid: result.lastInsertRowid != null ? Number(result.lastInsertRowid) : undefined,
            changes: result.rowsAffected,
          };
        },
      };
    },
    async exec(sql) {
      // Birden fazla ';' ile ayrılmış statement içerebilir (CREATE TABLE bloklarında olduğu gibi)
      await client.executeMultiple(sql);
    },
    // Birden fazla sorguyu TEK ağ round-trip'inde (tek HTTP isteğiyle), atomik bir
    // transaction içinde çalıştırır. Turso uzak bir veritabanı olduğu için her
    // ayrı .get()/.run() çağrısı kendi başına bir network gidiş-dönüşü demek —
    // art arda 5-7 tane ayrı çağrı yapmak (ör. aviator start/cashout) saniyeler
    // sürebiliyor. batch() bunları tek istekte birleştirir.
    // items: [{ sql, args }, ...] — sonuç, her item için { rows, lastInsertRowid, changes } dizisi.
    async batch(items) {
      const stmts = items.map((i) => ({ sql: i.sql, args: normalizeArgs(i.args || []) }));
      const results = await client.batch(stmts, 'write');
      return results.map((result) => ({
        rows: rowsToObjects(result),
        lastInsertRowid: result.lastInsertRowid != null ? Number(result.lastInsertRowid) : undefined,
        changes: result.rowsAffected,
      }));
    },
    // Eski better-sqlite3 çağrılarıyla uyumluluk için no-op / basit karşılık.
    // Turso'da WAL/cache/mmap gibi dosya bazlı pragmalar geçersizdir; sadece
    // gerçekten anlamlı olan foreign_keys pragmasını iletiyoruz.
    async pragma(stmt) {
      if (/foreign_keys/i.test(stmt)) {
        await client.execute('PRAGMA foreign_keys = ON');
      }
      // diğerleri (journal_mode, cache_size, mmap_size, synchronous, temp_store,
      // busy_timeout) Turso'nun kendi sunucu tarafında yönetilir, sessizce atlanır.
    },
    // better-sqlite3'teki db.transaction(fn) API'sinin basitleştirilmiş karşılığı.
    // Gerçek BEGIN/COMMIT/ROLLBACK atomikliği yerine, fonksiyonu olduğu gibi
    // (ardışık await'lerle) çalıştırır. Hobi ölçekli bir webtoon sitesi için
    // yeterlidir; finansal/kritik atomiklik gerektiren bir senaryo değildir.
    transaction(fn) {
      return async (...args) => fn(...args);
    },
  };
}

let dbPromise = null;

// Şema sürümü: initializeDatabase + migrateDatabase içindeki CREATE/ALTER
// TABLE kontrolleri (100'ün üzerinde ayrı sorgu!) idempotent ama yine de her
// biri ayrı bir ağ round-trip'i. Vercel'in serverless fonksiyonları sık sık
// "soğuk" başladığı için (module-level dbPromise önbelleği kaybolur), bu
// kontroller her soğuk başlangıçta BAŞTAN çalışıyordu — 6-7 saniyelik
// gecikmelerin asıl sebebi buydu. Artık şema sürümünü tek bir sorguyla kontrol
// edip zaten güncelse tüm bu 100+ sorguyu atlıyoruz.
const SCHEMA_VERSION = 3; // v3: Mağaza (shop) özelliği tamamen kaldırıldı

async function getSchemaVersion(db) {
  try {
    const row = await db.prepare('SELECT version FROM schema_meta LIMIT 1').get();
    return row?.version || 0;
  } catch {
    return 0; // tablo henüz yok — hiç migrate edilmemiş demek
  }
}

async function setSchemaVersion(db, version) {
  try {
    await db.exec('CREATE TABLE IF NOT EXISTS schema_meta (version INTEGER NOT NULL)');
    await db.prepare('DELETE FROM schema_meta').run();
    await db.prepare('INSERT INTO schema_meta (version) VALUES (?)').run(version);
  } catch (e) { console.error('schema_meta yazılamadı:', e.message); }
}

// v3 tek seferlik temizlik: Mağaza kaldırıldı — eski çerçeve/unvan/rozet
// tablolarını ve kullanıcılardaki kuşanım referanslarını sil.
async function removeShopFeature(db) {
  try { await db.exec('DROP TABLE IF EXISTS shop_items'); } catch (e) { console.error(e.message); }
  try { await db.exec('DROP TABLE IF EXISTS user_purchases'); } catch (e) { console.error(e.message); }
  try {
    await db.prepare('UPDATE users SET equipped_frame_id = NULL, equipped_title_id = NULL, equipped_badge_id = NULL').run();
  } catch (e) { console.error(e.message); }
}

async function initDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error(
      'TURSO_DATABASE_URL ortam değişkeni tanımlı değil. Vercel proje ayarlarından ' +
      'Environment Variables kısmına TURSO_DATABASE_URL ve TURSO_AUTH_TOKEN eklemelisin.'
    );
  }

  const client = createClient({ url, authToken, intMode: 'number' });
  const db = wrapClient(client);

  const currentVersion = await getSchemaVersion(db);
  if (currentVersion < SCHEMA_VERSION) {
    await initializeDatabase(db);
    await migrateDatabase(db);
    if (currentVersion < 3) await removeShopFeature(db);
    await setSchemaVersion(db, SCHEMA_VERSION);
  }
  // seedDatabase zaten kendi hızlı çıkış kontrolüne sahip (tek sorgu, seri
  // varsa hemen döner) — her istekte çalışması ucuz, versiyon şartına bağlamaya gerek yok.
  await seedDatabase(db);

  return db;
}

export async function getDb() {
  if (!dbPromise) {
    dbPromise = initDb().catch((err) => {
      // Başarısız init'i cache'leme — bir sonraki istekte tekrar denesin
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

// Generate URL-safe slug from a title
export function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // remove special chars
    .replace(/[\s_]+/g, '-')    // spaces/underscores → hyphens
    .replace(/-+/g, '-')        // collapse multiple hyphens
    .replace(/^-|-$/g, '');     // trim leading/trailing hyphens
}

async function migrateDatabase(db) {
  try {
    const cols = await db.prepare("PRAGMA table_info(comments)").all();
    const hasSeries = cols.find(c => c.name === 'series_id');
    const chapterCol = cols.find(c => c.name === 'chapter_id');

    // Need full table recreation if chapter_id is NOT NULL or series_id missing
    if (!hasSeries || (chapterCol && chapterCol.notnull)) {
      await db.exec(`
                CREATE TABLE IF NOT EXISTS comments_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    chapter_id INTEGER DEFAULT NULL,
                    series_id INTEGER DEFAULT NULL,
                    content TEXT NOT NULL,
                    parent_id INTEGER DEFAULT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
                    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
                    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
                );
                INSERT OR IGNORE INTO comments_new (id, user_id, chapter_id, content, parent_id, created_at)
                    SELECT id, user_id, chapter_id, content, parent_id, created_at FROM comments;
                DROP TABLE comments;
                ALTER TABLE comments_new RENAME TO comments;
            `);
    }

    // Migration: add published and slug columns to series
    const seriesCols = await db.prepare("PRAGMA table_info(series)").all();
    if (!seriesCols.find(c => c.name === 'published')) {
      await db.exec('ALTER TABLE series ADD COLUMN published INTEGER DEFAULT 1');
    }
    if (!seriesCols.find(c => c.name === 'type')) {
      await db.exec("ALTER TABLE series ADD COLUMN type TEXT DEFAULT 'manga'");
    }
    if (!seriesCols.find(c => c.name === 'slug')) {
      await db.exec('ALTER TABLE series ADD COLUMN slug TEXT DEFAULT NULL');
      await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_series_slug ON series(slug)');
      // Backfill slugs for existing series
      const allSeries = await db.prepare('SELECT id, title FROM series').all();
      for (const s of allSeries) {
        let base = generateSlug(s.title);
        if (!base) base = `series-${s.id}`;
        let slug = base;
        let counter = 1;
        while (await db.prepare('SELECT id FROM series WHERE slug = ? AND id != ?').get(slug, s.id)) {
          slug = `${base}-${counter++}`;
        }
        await db.prepare('UPDATE series SET slug = ? WHERE id = ?').run(slug, s.id);
      }
    }

    // Migration: create series_views_log table if it doesn't exist (without viewer_hash — added below)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS series_views_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_series_views_log_series ON series_views_log(series_id);
      CREATE INDEX IF NOT EXISTS idx_series_views_log_date ON series_views_log(created_at);
    `);

    // Migration: add viewer_hash column to series_views_log if missing (MUST be separate — table may already exist without it)
    const viewsLogCols = await db.prepare("PRAGMA table_info(series_views_log)").all();
    if (!viewsLogCols.find(c => c.name === 'viewer_hash')) {
      await db.exec('ALTER TABLE series_views_log ADD COLUMN viewer_hash TEXT DEFAULT NULL');
    }
    // Create viewer index only AFTER ensuring column exists
    await db.exec('CREATE INDEX IF NOT EXISTS idx_series_views_log_viewer ON series_views_log(series_id, viewer_hash, created_at)');

    // Migration: create announcements table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        link_url TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration: Gamification (Yomi Points) & Reactions
    const userCols = await db.prepare("PRAGMA table_info(users)").all();
    if (!userCols.find(c => c.name === 'yomi_points')) {
      await db.exec('ALTER TABLE users ADD COLUMN yomi_points INTEGER DEFAULT 0');
    }
    if (!userCols.find(c => c.name === 'last_daily_login')) {
      await db.exec('ALTER TABLE users ADD COLUMN last_daily_login DATETIME DEFAULT NULL');
    }
    if (!userCols.find(c => c.name === 'last_avatar_update')) {
      await db.exec('ALTER TABLE users ADD COLUMN last_avatar_update DATETIME DEFAULT NULL');
    }
    if (!userCols.find(c => c.name === 'cover_url')) {
      await db.exec('ALTER TABLE users ADD COLUMN cover_url TEXT DEFAULT NULL');
    }
    if (!userCols.find(c => c.name === 'last_cover_update')) {
      await db.exec('ALTER TABLE users ADD COLUMN last_cover_update DATETIME DEFAULT NULL');
    }
    if (!userCols.find(c => c.name === 'avatar_changes_today')) {
      await db.exec('ALTER TABLE users ADD COLUMN avatar_changes_today INTEGER DEFAULT 0');
    }
    if (!userCols.find(c => c.name === 'cover_changes_today')) {
      await db.exec('ALTER TABLE users ADD COLUMN cover_changes_today INTEGER DEFAULT 0');
    }
    if (!userCols.find(c => c.name === 'display_name')) {
      await db.exec('ALTER TABLE users ADD COLUMN display_name TEXT DEFAULT NULL');
    }

    // Read History (to prevent farming points from same chapter)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS read_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        chapter_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
        UNIQUE(user_id, chapter_id)
      );
    `);

    // Reading History (tracks last-read chapter per user for "Continue Reading")
    await db.exec(`
      CREATE TABLE IF NOT EXISTS reading_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        chapter_id INTEGER NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
        UNIQUE(user_id, chapter_id)
      );
    `);

    // Server-Side Series Reactions
    await db.exec(`
      CREATE TABLE IF NOT EXISTS series_reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        emoji TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(series_id, user_id, emoji)
      );
    `);

    // Notifications table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT 'reply',
        message TEXT NOT NULL,
        link TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    `);

    // Quest progress tracking
    await db.exec(`
      CREATE TABLE IF NOT EXISTS quest_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        quest_id TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        claimed INTEGER DEFAULT 0,
        quest_date TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, quest_id, quest_date)
      );
    `);

    // Global App Settings
    await db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT
      );
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('donation_enabled', '0');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('donation_text', 'Support us to keep the servers alive!');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('paypal_url', '');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('kofi_url', '');
    `);

    // Scraper system tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS scraper_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        source_url TEXT NOT NULL,
        source_site TEXT,
        last_checked DATETIME DEFAULT NULL,
        auto_sync INTEGER DEFAULT 1,
        last_chapter_found REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS scraper_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        source_url TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        chapters_found INTEGER DEFAULT 0,
        chapters_imported INTEGER DEFAULT 0,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS scraper_pending_chapters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        job_id INTEGER,
        chapter_number REAL NOT NULL,
        chapter_title TEXT,
        source_url TEXT,
        pages_json TEXT DEFAULT '[]',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_scraper_pending_series ON scraper_pending_chapters(series_id, status);
      CREATE INDEX IF NOT EXISTS idx_scraper_sources_series ON scraper_sources(series_id);
    `);

    // Migration: add language column to scraper_sources
    const scraperSourceCols = await db.prepare("PRAGMA table_info(scraper_sources)").all();
    if (!scraperSourceCols.find(c => c.name === 'language')) {
      await db.exec("ALTER TABLE scraper_sources ADD COLUMN language TEXT DEFAULT 'en'");
    }

    // Feature: Reading List (Okuma Listesi) — Okuyorum / Bitti / Plan
    await db.exec(`
      CREATE TABLE IF NOT EXISTS reading_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        series_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'plan',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
        UNIQUE(user_id, series_id)
      );
      CREATE INDEX IF NOT EXISTS idx_reading_lists_user ON reading_lists(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_reading_lists_series ON reading_lists(series_id);
    `);

    // Feature: User Badges / Achievements
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        badge_id TEXT NOT NULL,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, badge_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
    `);

    // Feature: add is_spoiler column to comments
    const commentCols2 = await db.prepare("PRAGMA table_info(comments)").all();
    if (!commentCols2.find(c => c.name === 'is_spoiler')) {
      await db.exec('ALTER TABLE comments ADD COLUMN is_spoiler INTEGER DEFAULT 0');
    }

    // Feature: soft-delete and edit tracking for comments
    const commentCols3 = await db.prepare("PRAGMA table_info(comments)").all();
    if (!commentCols3.find(c => c.name === 'is_deleted')) {
      await db.exec('ALTER TABLE comments ADD COLUMN is_deleted INTEGER DEFAULT 0');
    }
    if (!commentCols3.find(c => c.name === 'edited_at')) {
      await db.exec('ALTER TABLE comments ADD COLUMN edited_at TEXT');
    }

    // Performance: clean up old series_views_log entries (keep only last 7 days)
    // This prevents the table from growing indefinitely and slowing down the trending query
    try {
      await db.prepare("DELETE FROM series_views_log WHERE created_at < datetime('now', '-7 days')").run();
    } catch {}

    // Fix: remove duplicate scraper_pending_chapters (keep the one with lowest id per series+chapter_number)
    try {
      await db.exec(`
        DELETE FROM scraper_pending_chapters
        WHERE id NOT IN (
          SELECT MIN(id) FROM scraper_pending_chapters
          GROUP BY series_id, chapter_number
        )
      `);
    } catch {}

    // Custom Pages table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS custom_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        is_active INTEGER DEFAULT 1,
        show_in_footer INTEGER DEFAULT 1,
        show_in_navbar INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Default menu settings
    await db.exec(`
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('navbar_menu', '[{"label":"Home","url":"/"},{"label":"Browse","url":"/series"},{"label":"Ranking","url":"/ranking"},{"label":"Requests","url":"/requests"}]');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('footer_menu', '[{"label":"Privacy Policy","url":"/privacy"},{"label":"Terms & Conditions","url":"/terms"},{"label":"Browse","url":"/series"}]');
    `);

    // Seed built-in pages (Privacy Policy & Terms) into custom_pages so admin can edit them
    const privacyContent = '<h2>1. Information We Collect</h2><p>When you create an account, we collect your username, email address, and an encrypted version of your password. We do not store passwords in plain text.</p><h2>2. How We Use Your Information</h2><p>We use your information to provide and maintain your account, enable you to save favorites and reading progress, and improve our services.</p><h2>3. Data Storage &amp; Security</h2><p>Your data is stored securely. Passwords are hashed using bcrypt, authentication uses JWT tokens with 7-day expiry, and all connections are encrypted via HTTPS in production.</p><h2>4. Cookies &amp; Local Storage</h2><p>We use browser local storage to maintain your login session. We do not use tracking cookies or third-party analytics.</p><h2>5. Your Rights</h2><p>You may access, update, or request deletion of your personal data by contacting the administrator.</p><h2>6. Contact</h2><p>If you have questions about this privacy policy, please contact the site administrator.</p>';
    const termsContent = '<h2>1. Acceptance of Terms</h2><p>By accessing and using this site, you agree to be bound by these Terms and Conditions.</p><h2>2. User Accounts</h2><ul><li>You must provide accurate information when creating an account</li><li>You are responsible for maintaining the security of your account credentials</li><li>You must be at least 13 years old to create an account</li></ul><h2>3. Acceptable Use</h2><p>You agree not to upload infringing content, use the service for illegal purposes, or abuse other users.</p><h2>4. Comments &amp; Community</h2><p>We reserve the right to remove any comments that violate our acceptable use policy.</p><h2>5. Limitation of Liability</h2><p>The service is provided as-is without warranties. We are not liable for any damages arising from use of the service.</p><h2>6. Contact</h2><p>For questions about these terms, please contact the site administrator.</p>';

    try {
      await db.prepare("INSERT OR IGNORE INTO custom_pages (slug, title, content, is_active, show_in_footer, show_in_navbar) VALUES ('privacy', 'Privacy Policy', ?, 1, 1, 0)").run(privacyContent);
      await db.prepare("INSERT OR IGNORE INTO custom_pages (slug, title, content, is_active, show_in_footer, show_in_navbar) VALUES ('terms', 'Terms & Conditions', ?, 1, 1, 0)").run(termsContent);
    } catch {}

    // Migration: banned_until kolonu — SQLite ALTER TABLE IF NOT EXISTS desteklemez, try/catch kullan
    try {
      await db.exec(`ALTER TABLE users ADD COLUMN banned_until TEXT DEFAULT NULL`);
    } catch (e) {
      // Kolon zaten varsa hata görmezden gel
    }

    // Migration: is_adult kolonu — yetişkin içerik işaretlemesi
    try {
      await db.exec(`ALTER TABLE series ADD COLUMN is_adult INTEGER DEFAULT 0`);
    } catch (e) {
      // Kolon zaten varsa hata görmezden gel
    }

    // Migration: bug_reports table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bug_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Migration: add content column to chapters (for novels)
    const chapterCols = await db.prepare("PRAGMA table_info(chapters)").all();
    if (!chapterCols.find(c => c.name === 'content')) {
      await db.exec('ALTER TABLE chapters ADD COLUMN content TEXT DEFAULT NULL');
    }

    // Migration: add views column to chapters
    if (!chapterCols.find(c => c.name === 'views')) {
      await db.exec('ALTER TABLE chapters ADD COLUMN views INTEGER DEFAULT 0');
    }

    // Migration: create chapter_views_log table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS chapter_views_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chapter_id INTEGER NOT NULL,
        viewer_hash TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_chapter_views_log_chapter ON chapter_views_log(chapter_id, viewer_hash, created_at);
    `);

    // Migration: add paragraph_index column to comments (for novel inline comments)
    const commentCols = await db.prepare("PRAGMA table_info(comments)").all();
    if (!commentCols.find(c => c.name === 'paragraph_index')) {
      await db.exec('ALTER TABLE comments ADD COLUMN paragraph_index INTEGER DEFAULT NULL');
    }

    // Feature: add is_pinned column to comments (for admin pinning)
    if (!commentCols.find(c => c.name === 'is_pinned')) {
      await db.exec('ALTER TABLE comments ADD COLUMN is_pinned INTEGER DEFAULT 0');
    }

    // Seed default settings for Discord and Bug Report
    await db.exec(`
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('discord_enabled', '0');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('discord_url', '');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('bug_report_enabled', '0');
    `);

    // Migration: series_reactions tablosuna chapter_id eklendi — bölüm bazlı bağımsız tepkiler
    // Eski UNIQUE(series_id, user_id, emoji) kısıtı chapter bazlı kayıtları engelliyor;
    // tabloyu yeniden oluşturarak doğru kısıtı uyguluyoruz.
    try {
      const srCols = await db.prepare("PRAGMA table_info(series_reactions)").all();
      if (!srCols.find(c => c.name === 'chapter_id')) {
        await db.exec(`
          CREATE TABLE IF NOT EXISTS series_reactions_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            series_id INTEGER NOT NULL,
            chapter_id INTEGER DEFAULT NULL,
            user_id INTEGER NOT NULL,
            emoji TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(series_id, chapter_id, user_id)
          );
          INSERT OR IGNORE INTO series_reactions_new (id, series_id, chapter_id, user_id, emoji, created_at)
            SELECT id, series_id, NULL, user_id, emoji, created_at FROM series_reactions;
          DROP TABLE series_reactions;
          ALTER TABLE series_reactions_new RENAME TO series_reactions;
        `);
      }
    } catch (e) { console.error('series_reactions migration error:', e.message); }

    // Feature: User Ratings — kullanıcılar seriye 1-10 puan verebilir
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 10),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(series_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_ratings_series ON user_ratings(series_id);
      CREATE INDEX IF NOT EXISTS idx_user_ratings_user ON user_ratings(user_id);
    `);

    // Migration: publish_at — zamanlayıcılı bölüm yayınlama
    const chapterColsCheck = await db.prepare("PRAGMA table_info(chapters)").all();
    if (!chapterColsCheck.find(c => c.name === 'publish_at')) {
      await db.exec('ALTER TABLE chapters ADD COLUMN publish_at DATETIME DEFAULT NULL');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_chapters_publish_at ON chapters(publish_at)');
    }
    // Bu index publish_at sütununa bağımlı olduğu için sütun kesin var olduktan sonra oluşturuluyor
    await db.exec('CREATE INDEX IF NOT EXISTS idx_chapters_series_publish ON chapters(series_id, publish_at, chapter_number DESC)');

    // Migration: user_activity_log — kullanıcı etkinlik takibi
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity_log(user_id, created_at);
    `);

    // Migration: site_traffic_log — site trafik izleme
    await db.exec(`
      CREATE TABLE IF NOT EXISTS site_traffic_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL,
        visitor_hash TEXT,
        referrer TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_traffic_created ON site_traffic_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_traffic_path ON site_traffic_log(path, created_at);
    `);

    // Migration: custom_genres — özel tür yönetimi
    await db.exec(`
      CREATE TABLE IF NOT EXISTS custom_genres (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed: show_stats_bar default setting
    await db.exec(`INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('show_stats_bar', '1')`);

    // Migration: add chapter_id and series_id to bug_reports for chapter-level reporting
    try {
      await db.exec(`ALTER TABLE bug_reports ADD COLUMN chapter_id INTEGER DEFAULT NULL`);
    } catch { /* column already exists */ }
    try {
      await db.exec(`ALTER TABLE bug_reports ADD COLUMN series_id INTEGER DEFAULT NULL`);
    } catch { /* column already exists */ }

    // Migration: add type and comment_id columns to bug_reports for comment reports
    try {
      await db.exec(`ALTER TABLE bug_reports ADD COLUMN type TEXT DEFAULT 'bug'`);
    } catch { /* column already exists */ }
    try {
      await db.exec(`ALTER TABLE bug_reports ADD COLUMN comment_id INTEGER DEFAULT NULL`);
    } catch { /* column already exists */ }

    // Migration: Okuyucu Destek Kartı ayarları
    await db.exec(`
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('reader_support_enabled', '0');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('reader_support_text', 'Her bölüm yaklaşık 5 TL AI maliyetiyle hazırlanıyor. Keyif aldıysan, küçük bir desteğin yeni bölümlerin gelmesine katkı sağlar.');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('reader_support_url', '#');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('reader_support_button_text', 'Destek Ol');
    `);

    // Migration: Son Güncellemeler sayfalama ayarı
    await db.exec(`INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('updates_per_page', '16')`);

    // Migration: Bölüm thumbnail desteği
    try { await db.exec(`ALTER TABLE chapters ADD COLUMN thumbnail_url TEXT DEFAULT NULL`); } catch {}
    await db.exec(`INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('chapter_thumbnails_enabled', '0')`);

    // ── Aşama 3: Veri Temizliği / Data Retention ──────────────────────────
    // notifications: 90 günden eski bildirimleri sil
    try {
      await db.prepare("DELETE FROM notifications WHERE created_at < datetime('now', '-90 days')").run();
    } catch {}

    // quest_progress: 30 günden eski görev kayıtlarını sil
    try {
      await db.prepare("DELETE FROM quest_progress WHERE quest_date < date('now', '-30 days')").run();
    } catch {}

    // chapter_views_log: 7 günden eski görüntüleme loglarını sil (series_views_log gibi)
    try {
      await db.prepare("DELETE FROM chapter_views_log WHERE created_at < datetime('now', '-7 days')").run();
    } catch {}

    // user_activity_log: 30 günden eski aktivite loglarını sil
    try {
      await db.prepare("DELETE FROM user_activity_log WHERE created_at < datetime('now', '-30 days')").run();
    } catch {}

    // site_traffic_log: 7 günden eski trafik loglarını sil
    try {
      await db.prepare("DELETE FROM site_traffic_log WHERE created_at < datetime('now', '-7 days')").run();
    } catch {}

    // ── Aşama 4: SQLite WAL checkpoint — Turso'da anlamsız, no-op ───────────
    try {
      await db.pragma('wal_checkpoint(TRUNCATE)');
    } catch {}

  } catch (e) { console.error('Migration error:', e.message); }
}

async function initializeDatabase(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT DEFAULT '/default-avatar.png',
      role TEXT DEFAULT 'user',
      yomi_points INTEGER DEFAULT 0,
      last_daily_login DATETIME DEFAULT NULL,
      last_avatar_update DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE,
      description TEXT,
      cover_url TEXT,
      author TEXT,
      artist TEXT,
      status TEXT DEFAULT 'ongoing',
      genres TEXT DEFAULT '[]',
      rating REAL DEFAULT 0,
      views INTEGER DEFAULT 0,
      published INTEGER DEFAULT 1,
      type TEXT DEFAULT 'manga',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id INTEGER NOT NULL,
      chapter_number REAL NOT NULL,
      title TEXT,
      content TEXT DEFAULT NULL,
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER NOT NULL,
      page_number INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      width INTEGER DEFAULT 0,
      height INTEGER DEFAULT 0,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS upload_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      chunk_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_upload_chunks_file ON upload_chunks(file_id);

    CREATE TABLE IF NOT EXISTS translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL,
      language_code TEXT NOT NULL,
      translated_image_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
      UNIQUE(page_id, language_code)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      chapter_id INTEGER DEFAULT NULL,
      series_id INTEGER DEFAULT NULL,
      content TEXT NOT NULL,
      parent_id INTEGER DEFAULT NULL,
      paragraph_index INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
      FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      comment_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
      UNIQUE(user_id, comment_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      series_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
      UNIQUE(user_id, series_id)
    );

    CREATE TABLE IF NOT EXISTS reading_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      chapter_id INTEGER NOT NULL,
      page_number INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
      UNIQUE(user_id, chapter_id)
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_name TEXT NOT NULL,
      encrypted_key TEXT NOT NULL,
      service TEXT NOT NULL DEFAULT 'torii',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS series_views_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id INTEGER NOT NULL,
      viewer_hash TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      link_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bug_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT
    );
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('donation_enabled', '0');
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('donation_text', 'Support us to keep the servers alive!');
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('paypal_url', '');
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('kofi_url', '');
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('discord_enabled', '0');
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('discord_url', '');
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('bug_report_enabled', '0');

    -- Performance indices
    CREATE INDEX IF NOT EXISTS idx_chapters_series ON chapters(series_id);
    CREATE INDEX IF NOT EXISTS idx_pages_chapter ON pages(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_translations_page ON translations(page_id);
    CREATE INDEX IF NOT EXISTS idx_translations_lang ON translations(page_id, language_code);
    CREATE INDEX IF NOT EXISTS idx_comments_chapter ON comments(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_comments_series ON comments(series_id);
    CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_series ON favorites(series_id);
    CREATE INDEX IF NOT EXISTS idx_reactions_comment ON reactions(comment_id);
    CREATE INDEX IF NOT EXISTS idx_series_published ON series(published);
    CREATE INDEX IF NOT EXISTS idx_series_views_log_series ON series_views_log(series_id);
    CREATE INDEX IF NOT EXISTS idx_series_views_log_date ON series_views_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_series_created_at ON series(created_at);
    CREATE INDEX IF NOT EXISTS idx_series_slug ON series(slug);
    CREATE INDEX IF NOT EXISTS idx_chapters_series_id ON chapters(series_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_created_at ON chapters(created_at);
    CREATE INDEX IF NOT EXISTS idx_chapters_chapter_number ON chapters(chapter_number);
    CREATE INDEX IF NOT EXISTS idx_comments_series_id ON comments(series_id);
    CREATE INDEX IF NOT EXISTS idx_comments_chapter_id ON comments(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

    -- Ek performans index'leri
    CREATE INDEX IF NOT EXISTS idx_series_published_views ON series(published, views DESC);
    CREATE INDEX IF NOT EXISTS idx_series_type_status ON series(type, status, published);
    CREATE INDEX IF NOT EXISTS idx_comments_chapter_parent ON comments(chapter_id, parent_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_comments_series_parent ON comments(series_id, parent_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reading_history_user ON reading_history(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_favorites_user_created ON favorites(user_id, created_at DESC);
    -- Bileşik index: ana seri listesi WHERE published=1 ORDER BY created_at DESC için
    CREATE INDEX IF NOT EXISTS idx_series_published_created ON series(published, created_at DESC);
    -- Bileşik index: latest-updates MAX(ch.created_at) GROUP BY series_id için
    CREATE INDEX IF NOT EXISTS idx_chapters_series_created ON chapters(series_id, created_at DESC);
    -- Bileşik index: seri detail yorum sayısı JOIN sorgusu için
    CREATE INDEX IF NOT EXISTS idx_comments_chapter_notNull ON comments(chapter_id) WHERE chapter_id IS NOT NULL;
  `);

  // Migration: deleted_default_genres table (tracks which built-in genres were removed)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS deleted_default_genres (
        name TEXT PRIMARY KEY,
        deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // Migration: add login_streak to users
    const userColsStreak = await db.prepare("PRAGMA table_info(users)").all();
    if (!userColsStreak.find(c => c.name === 'login_streak')) {
        await db.exec("ALTER TABLE users ADD COLUMN login_streak INTEGER DEFAULT 0");
    }
    if (!userColsStreak.find(c => c.name === 'last_streak_date')) {
        await db.exec("ALTER TABLE users ADD COLUMN last_streak_date TEXT");
    }

  // admin_logs tablosu
  await db.exec(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      admin_username TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
  `);

  // Feature: Aviator (uçak/crash) oyunu — sunucu taraflı adil (provably-fair
  // tarzı) rastgele patlama noktası. Tek seferde kullanıcı başına 1 aktif tur.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS aviator_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bet_amount INTEGER NOT NULL,
      crash_point REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      cashout_multiplier REAL DEFAULT NULL,
      payout INTEGER DEFAULT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_aviator_rounds_user ON aviator_rounds(user_id, status);
  `);

  // Feature: Çark (wheel of fortune) — tek seferlik anlık çevirme, geçmiş kaydı.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wheel_spins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bet_amount INTEGER NOT NULL,
      segment_index INTEGER NOT NULL,
      multiplier REAL NOT NULL,
      payout INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_wheel_spins_user ON wheel_spins(user_id);
  `);

  // Feature: XOX (tic-tac-toe vs bot) — kullanıcı başına 1 aktif tur.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS xox_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bet_amount INTEGER NOT NULL,
      board TEXT NOT NULL DEFAULT '[null,null,null,null,null,null,null,null,null]',
      status TEXT NOT NULL DEFAULT 'active',
      payout INTEGER DEFAULT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_xox_rounds_user ON xox_rounds(user_id, status);
  `);

  // Feature: Mayın Tarlası (mines) — 6x6 (36 kare), varsayılan 6 mayın.
  // mine_positions sunucuda gizli tutulur, sadece round bitince client'a açıklanır.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS mines_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bet_amount INTEGER NOT NULL,
      grid_size INTEGER NOT NULL DEFAULT 36,
      mine_count INTEGER NOT NULL DEFAULT 6,
      mine_positions TEXT NOT NULL,
      revealed TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      payout INTEGER DEFAULT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_mines_rounds_user ON mines_rounds(user_id, status);
  `);

  // Feature: Slot 777 — tek seferlik anlık çevirme, geçmiş kaydı.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS slot_spins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bet_amount INTEGER NOT NULL,
      symbols TEXT NOT NULL,
      payout INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_slot_spins_user ON slot_spins(user_id);
  `);

  // Feature: Blackjack (21) — kullanıcı başına 1 aktif tur, sunucu destesi gizli tutar.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS blackjack_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bet_amount INTEGER NOT NULL,
      deck TEXT NOT NULL,
      player_hand TEXT NOT NULL,
      dealer_hand TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      payout INTEGER DEFAULT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_blackjack_rounds_user ON blackjack_rounds(user_id, status);
  `);

  // Feature: Ana sayfadaki genel sohbet — kullanıcıların birbirleriyle canlı
  // (kısa aralıklı polling ile) yazışabildiği tek genel oda.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(id);
  `);
}

export default getDb;
