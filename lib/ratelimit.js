// lib/ratelimit.js
// In-memory Map tabanlı IP bazlı rate limiter (Node.js runtime)

const rateLimitMap = new Map();

/**
 * Rate limiter factory
 * @param {number} limit - İzin verilen maksimum istek sayısı
 * @param {number} windowMs - Zaman penceresi (milisaniye)
 * @returns {Function} - Next.js route handler'da kullanılacak checkRateLimit fonksiyonu
 */
export function createRateLimiter(limit, windowMs) {
  return function checkRateLimit(request) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    const key = `${ip}:${limit}:${windowMs}`;
    const now = Date.now();

    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return { success: true };
    }

    const entry = rateLimitMap.get(key);

    if (now > entry.resetAt) {
      // Pencere süresi dolmuş, sıfırla
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return { success: true };
    }

    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return { success: false, retryAfter };
    }

    entry.count += 1;
    return { success: true };
  };
}

// Belirli aralıklarla eski kayıtları temizle (memory leak önlemi)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 60 * 1000); // Her dakika temizle
}