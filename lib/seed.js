import { hashPassword } from './auth.js';

export async function seedDatabase(db) {

    // Check if already seeded
    const existingSeries = await db.prepare('SELECT COUNT(*) as count FROM series').get();
    if (existingSeries.count > 0) return;

    // Create admin user
    const adminHash = hashPassword('admin123');
    await db.prepare(
        'INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run('admin', 'admin@yomitranslate.com', adminHash, 'admin');

    // Create demo user
    const userHash = hashPassword('user123');
    await db.prepare(
        'INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run('manga_lover', 'user@yomitranslate.com', userHash, 'user');

    // Insert demo series
    const seriesData = [
        {
            title: 'Shadow Ronin',
            description: 'In a war-torn feudal land, a disgraced samurai known only as "The Shadow" walks the path of redemption. After losing everything — his clan, his honor, and the woman he loved — he picks up his broken blade one last time. Each enemy he faces mirrors a piece of his fractured soul. This is not a story of glory, but of a man who must confront the darkness within to find a reason to keep fighting.',
            cover_url: '/demo/cover1.jpg',
            author: 'Takeshi Yamamoto',
            artist: 'Yuki Tanaka',
            status: 'ongoing',
            genres: '["Action", "Drama", "Historical"]',
            rating: 4.8,
            views: 128500
        },
        {
            title: 'Neon Abyss',
            description: 'In the sprawling cyberpunk megacity of Neo-Osaka, a teenage hacker named Rei discovers a hidden layer of the internet where forgotten AIs have built their own civilization. When a mega-corporation threatens to erase this digital world, Rei must jack in, form alliances with sentient programs, and fight to protect a consciousness born from code.',
            cover_url: '/demo/cover2.jpg',
            author: 'Hiroshi Sato',
            artist: 'Mika Aoyama',
            status: 'ongoing',
            genres: '["Sci-Fi", "Action", "Thriller"]',
            rating: 4.6,
            views: 95200
        },
        {
            title: 'Bloom of the Forgotten',
            description: 'Every spring, a mysterious cherry blossom tree blooms in the courtyard of an abandoned shrine. Those who see it in full bloom are shown the memories of spirits trapped between worlds. A quiet shrine maiden named Hana takes it upon herself to listen to these spirits and help them find peace — but each story she uncovers brings her closer to a tragic secret about her own family.',
            cover_url: '/demo/cover3.jpg',
            author: 'Sakura Mishima',
            artist: 'Ren Fujimoto',
            status: 'completed',
            genres: '["Fantasy", "Drama", "Supernatural"]',
            rating: 4.9,
            views: 204300
        },
        {
            title: 'Titan Academy',
            description: 'In a world where ancient beast bloodlines resurface in select teenagers, the government gathers these "Hybrids" into an elite academy. Kaito, a quiet loner, discovers he carries the bloodline of the mythical Raijū — the thunder beast. At the academy, alliances form, rivalries ignite, and a conspiracy threatens to weaponize the students for war.',
            cover_url: '/demo/cover4.jpg',
            author: 'Kenji Morita',
            artist: 'Akira Hayashi',
            status: 'ongoing',
            genres: '["Action", "School", "Supernatural"]',
            rating: 4.5,
            views: 76800
        },
        {
            title: 'Void Walker',
            description: 'After a failed experiment tears a hole between dimensions, physicist Dr. Sora Ito is pulled into the Void — a realm between realities. There, she discovers fragments of destroyed worlds and the remnants of their civilizations. To find her way home, she must piece together the truth about the catastrophe and face the entity that devours worlds.',
            cover_url: '/demo/cover5.jpg',
            author: 'Naomi Kuroda',
            artist: 'Daichi Suzuki',
            status: 'ongoing',
            genres: '["Sci-Fi", "Mystery", "Adventure"]',
            rating: 4.7,
            views: 112400
        },
        {
            title: 'The Last Alchemist',
            description: 'In a medieval kingdom where alchemy was once the foundation of civilization, the art has been outlawed after a catastrophic event known as "The Great Transmutation." The last living alchemist, a young woman named Elara, must hide her abilities while searching for the Philosopher\'s Stone — the only thing that can undo the damage and restore the balance of the world.',
            cover_url: '/demo/cover6.jpg',
            author: 'Yui Nakamura',
            artist: 'Kenta Ogawa',
            status: 'ongoing',
            genres: '["Fantasy", "Adventure", "Mystery"]',
            rating: 4.4,
            views: 67900
        }
    ];

    for (const s of seriesData) {
        const result = await db.prepare(
            'INSERT INTO series (title, description, cover_url, author, artist, status, genres, rating, views) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(s.title, s.description, s.cover_url, s.author, s.artist, s.status, s.genres, s.rating, s.views);

        // Add demo chapters for each series
        const chapterCount = Math.floor(Math.random() * 5) + 3;
        for (let i = 1; i <= chapterCount; i++) {
            await db.prepare(
                'INSERT INTO chapters (series_id, chapter_number, title) VALUES (?, ?, ?)'
            ).run(result.lastInsertRowid, i, `Chapter ${i}`);
        }
    }

    // Add some demo comments
    const chapters = await db.prepare('SELECT id FROM chapters LIMIT 3').all();
    if (chapters.length > 0) {
        const demoComments = [
            { userId: 2, content: 'This manga is absolutely incredible! The art style is breathtaking 🔥' },
            { userId: 1, content: 'The translation quality is so good, feels like reading the original!' },
            { userId: 2, content: 'Can\'t wait for the next chapter, this cliffhanger is killing me 😭' },
        ];

        for (const comment of demoComments) {
            const commentResult = await db.prepare(
                'INSERT INTO comments (user_id, chapter_id, content) VALUES (?, ?, ?)'
            ).run(comment.userId, chapters[0].id, comment.content);

            // Add some reactions
            await db.prepare(
                'INSERT OR IGNORE INTO reactions (user_id, comment_id, emoji) VALUES (?, ?, ?)'
            ).run(1, commentResult.lastInsertRowid, '❤️');
            await db.prepare(
                'INSERT OR IGNORE INTO reactions (user_id, comment_id, emoji) VALUES (?, ?, ?)'
            ).run(2, commentResult.lastInsertRowid, '👍');
        }
    }

    console.log('✅ Database seeded with demo data');
}
