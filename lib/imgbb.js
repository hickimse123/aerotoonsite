import 'server-only';

/**
 * imgbb.com üzerinden görsel yükleme yardımcı fonksiyonu.
 *
 * Vercel'in serverless fonksiyonları diske kalıcı yazamadığı (her istek/deploy
 * sonrası dosya sistemi sıfırlanır) için, tüm kullanıcı yüklemesi görseller
 * (kapak resimleri, sayfa görselleri, avatarlar, watermark vb.) artık ücretsiz
 * bir görsel barındırma servisi olan imgbb'ye yükleniyor ve dönen kalıcı URL
 * veritabanına kaydediliyor.
 *
 * Ortam değişkeni: IMGBB_API_KEY (https://api.imgbb.com/ adresinden ücretsiz alınır)
 */

const IMGBB_ENDPOINT = 'https://api.imgbb.com/1/upload';

/**
 * @param {Buffer|ArrayBuffer} fileBuffer - Yüklenecek görselin ham verisi
 * @param {string} [name] - imgbb'de görünecek dosya adı (opsiyonel)
 * @returns {Promise<{url: string, deleteUrl: string, thumbUrl: string}>}
 */
export async function uploadToImgbb(fileBuffer, name) {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
        throw new Error(
            'IMGBB_API_KEY ortam değişkeni tanımlı değil. Vercel proje ayarlarından ' +
            'Environment Variables kısmına ekle (https://api.imgbb.com/ üzerinden ücretsiz alınır).'
        );
    }

    const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
    const base64 = buffer.toString('base64');

    const form = new FormData();
    form.append('key', apiKey);
    form.append('image', base64);
    if (name) form.append('name', name);

    const res = await fetch(IMGBB_ENDPOINT, {
        method: 'POST',
        body: form,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
        const msg = json?.error?.message || `imgbb yükleme hatası (HTTP ${res.status})`;
        throw new Error(msg);
    }

    return {
        url: json.data.url,                 // kalıcı, doğrudan erişilebilir görsel URL'i
        thumbUrl: json.data.thumb?.url || json.data.url,
        deleteUrl: json.data.delete_url,    // imgbb panelinden manuel silme için (opsiyonel, DB'de saklanmıyor)
    };
}

/**
 * Next.js'in `request.formData()` çağrısından gelen bir File/Blob nesnesini
 * doğrudan imgbb'ye yükler.
 * @param {File} file
 * @param {string} [name]
 */
export async function uploadFileToImgbb(file, name) {
    const arrayBuffer = await file.arrayBuffer();
    return uploadToImgbb(arrayBuffer, name);
}
