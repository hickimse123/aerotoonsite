const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://yomitranslate.com';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/series', '/series/', '/series/*', '/seri', '/seri/', '/seri/*', '/ranking', '/requests'],
        disallow: ['/api/', '/admin-panel', '/login', '/register', '/profile', '/admin'],
      },
      {
        userAgent: 'AhrefsBot',
        crawlDelay: 10,
      },
      {
        userAgent: 'SemrushBot',
        crawlDelay: 10,
      },
      {
        userAgent: 'MJ12bot',
        disallow: ['/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}