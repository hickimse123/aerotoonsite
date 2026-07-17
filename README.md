# Ruh Theme (YomiTranslate)

Ruh Theme, çeviri grupları (Manga, Webtoon, Novel) için geliştirilmiş, yüksek performanslı ve modern bir Next.js okuma platformudur. Hızlı sayfa yüklemeleri, gelişmiş SEO uyumluluğu ve zengin kullanıcı deneyimi sunar.

## Özellikler

Ruh Theme, gelişmiş bir okuma platformu için gereken yönetim panelinden oyunlaştırmaya (gamification), rol tabanlı erişimden (RBAC) yüksek performansa kadar birçok özelliğe sahiptir.

👉 **Tüm detaylı özellikler için lütfen [FEATURES.md](FEATURES.md) dosyasını inceleyin.**

## Kurulum ve Çalıştırma (Geliştirici Ortamı)

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin.

### Gereksinimler

- [Node.js](https://nodejs.org/) (v18 veya üzeri önerilir)
- npm, yarn, pnpm veya bun

### Kurulum Adımları

1. Repoyu bilgisayarınıza klonlayın:
   ```bash
   git clone https://github.com/turanbagtur/ruh-theme.git
   cd ruh-theme
   ```

2. Gerekli paketleri ve bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. Geliştirme (Development) sunucusunu başlatın:
   ```bash
   npm run dev
   ```

4. Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açarak siteyi görüntüleyin.

## Yayınlama ve Sunucu Kurulumu (Deployment)

Projeyi gerçek bir sunucuya (VPS) kurmak ve internete açmak için çok kapsamlı bir kurulum rehberi hazırladık. Lütfen projenin ana dizinindeki detaylı **[DEPLOYMENT.md](DEPLOYMENT.md)** dosyasını inceleyin.

Genel olarak Production (Canlı) ortam derlemesi için:
```bash
npm run build
npm run start
```
komutları kullanılır.

## Son Güncellemeler

Detaylı değişiklik geçmişi için **[CHANGELOG.md](CHANGELOG.md)** dosyasını inceleyiniz.

**v2.4.x (Haziran 2026) — Son Değişiklikler:**
- 🔐 **Rol Yönetimi İyileştirmesi:** Custom rol atama desteği eklendi.
- 🎨 **Pop-up Bildirim Redesign:** Glassmorphism cam efekti, gösterim aralığı ayarı (her zaman/günlük/saatlik) ve admin panelinde gizleme.
- 🔔 **Bildirim Sistemi:** Yeni bölüm, yorum yanıtı ve şikayet bildirimleri eklendi.
- 📸 **Kapak Kırpma Düzeltmesi:** Önizleme ile kaydedilen görsel arasındaki yön uyumsuzluğu giderildi.
- 🚀 **WebP Kalite Koruma:** Zaten WebP olan görseller tekrar kodlanmıyor.
- 👤 **Kullanıcı Profil Sayfası:** `/user/[username]` rotası ile herkes başka kullanıcıların profilini görüntüleyebilir.
- 📝 **Seri İstekleri Admin Onayı:** Bekleyen istekler artık admin onayına sunuluyor, herkese açık değil.
- 💬 **Yorum Şikayetleri:** Admin panelde doğru şekilde görüntüleniyor ve bildirim sistemi entegre edildi.

**v2.x (Haziran 2026) — Önceki Değişiklikler:**
- 🔒 **Yorum Silme Modalı Düzeltmesi:** Okuyucu sayfasında yorum silme onay modalının okuyucu HUD menüsünün arkasında kalma sorunu çözüldü.
- 📌 **Pinned Yorum Efektleri:** Sabitlenmiş yorumlar için belirgin kenarlık, gradient arka plan ve animasyonlu rozet eklendi.
- 🔄 **Trend Otomatik Kaydırma:** "Şu Anda Trend Olanlar" bölümüne açılıp kapanabilir sonsuz döngü kaydırma eklendi.
- 🔞 **Yetişkin İçerik Koruması:** Hero Slider ve Editörün Seçimi bölümlerindeki yetişkin seri kapakları artık giriş yapmayan kullanıcılara blurlu gösteriliyor.
- 📊 **Okunma Sayısı Düzeltmesi:** Seri ve bölüm okunma sayılarındaki veri tutarsızlığı giderildi.
- 📈 **İstatistik Tasarımı:** Ana sayfanın alt istatistik bölümü kartlı, renkli ve modern bir tasarıma kavuştu.
- 🎨 **Editörün Seçimi İyileştirmesi:** Gradient arka plan, ikon ve glow efekti ile yenilendi.
- 🗂️ **Arşiv Kategorileri:** Manga keşfet/arşiv sayfasına 15 eksik tür (Ecchi, Seinen, Shoujo vb.) eklendi.

## Katkıda Bulunma

Geri bildirimleriniz ve pull request (PR) gönderileriniz her zaman değerlidir! Sistemi daha iyi hale getirmek için Issues kısmından bizimle iletişime geçebilirsiniz.

## Destek Olun ☕

Eğer bu projeyi faydalı bulduysanız ve geliştirmelere destek olmak isterseniz, bize Kreosus üzerinden bağış yapabilirsiniz:

[![Kreosus'ta Bağış Yap](https://img.kreosus.com/badges/donate-white.png)](https://kreosus.com/mangaruhu)
