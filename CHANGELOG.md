# Changelog

Tüm önemli değişiklikler bu dosyada belgelenmiştir.

---

## [v2.19.0] — 2026-07-02 (Doksan Altıncı Yayın)

### 🐛 Hata Düzeltmeleri & Geliştirmeler

#### 1. OG/Link Paylaşım Görseli Düzeltmesi
- `app/series/[id]/opengraph-image.js`: Next.js 15'te `params` async olduğundan `await params` eklenerek seri linki paylaşılınca seri kapağının doğru yüklenmesi sağlandı.

#### 2. Profil Fotoğrafı/Kapak Kırpma
- `app/profile/page.js`: Görsel yüklendiğinde artık otomatik kırpma uygulanmıyor. Kırpma aracı açılmadan veya değişiklik yapılmadan kaydedilirse orijinal dosya sunucuya gönderiliyor.

#### 3. Günlük Giriş Ödülü Türkçe Hata Mesajı
- `app/api/users/daily-login/route.js`: "Already claimed today! Come back tomorrow" İngilizce mesajı Türkçeye çevrildi: "Bugünkü ödülü zaten aldınız! Yarın tekrar gelin (X saat kaldı)."

#### 4. Admin Paneli — Seri Listesi Toplu İşlemler
- `app/admin-panel/page.js`: Seri listesine checkbox eklenди — birden çok seri seçilip toplu silinebilir veya toplu kapak görseli ayarlanabilir.
- `app/api/admin/route.js`: `bulk-delete-series` action eklendi — seçili serileri tüm dosyalarıyla birlikte siler.

#### 5. Başkasının Profili — Tam Görünüm
- `app/user/[username]/page.js`: Profil sayfası yeniden yazıldı. Kütüphane (okuma listesi), Favoriler ve Yorumlar tab'ları eklendi. Kapak görseli ve biyografi de gösterilmektedir.
- `app/api/users/[username]/route.js`: API genişletildi — favoriler, okuma listesi, yorumlar ve profil kapak/biyografi döndürüyor.

#### 6. Manga Okuma Modunda Yorum Bölümü
- `app/reader.css`: `.manga-mode-container` üzerindeki `overflow: hidden` kaldırılarak `overflow-x: hidden` yapıldı; yorum bölümü artık küçülmüyor.

#### 7. Puanlama Sistemi: 5 Yıldız = 5 Puan
- `components/SeriesDetailClient.js`: Yıldız gösterimi ve kullanıcı etkileşimi 1-5 skalasına geçirildi (önceden 1-10 idi, `v*2` ile gösteriliyordu).
- `app/api/series/rate/route.js`: API 1-5 puan aralığını kabul edecek şekilde güncellendi.

#### 8. Bildirimler — Okundu Butonu
- `components/Navbar.js`: Bildirim zili açıldığında artık otomatik "hepsini okundu" işaretlenmiyor. Her bildirimde kalıcı "Okundu İşaretle" butonu eklendi.
- `app/globals.css`: Okunmuş bildirimler soluk (opacity 0.55) görünüyor, silinene kadar listede kalıyor.

#### 9. Seri Detay — Bölüm Görselleri Genişletildi
- `app/globals.css`: `.sd-chapter-row-thumb` boyutu `52×72px` → `80×60px` olarak büyütüldü.

#### 10. Seri Detay — Arka Plan Blur Ayarı
- `components/SeriesDetailClient.js`: Blur ve overlay değerleri portal'a inline style olarak geçirildi — CSS değişkeni `document.body`'de miras alınmadığından ayar değişikliği artık anında yansıyor.

---

## [v2.18.0] — 2026-06-21 (Doksan Beşinci Yayın)

### 🎨 Tasarım İyileştirmeleri — Profil Sayfası Günlük Görevler Yeniden Tasarımı

Günlük görevler kartlarının tasarımı elden geçirilerek daha ferah ve okunabilir hale getirildi.

#### Quest Card CSS İyileştirmeleri (`app/globals.css`):

- **Daha Ferah Padding**: Kart padding'i `16px` → `18px` artırıldı, içerikler birbirine daha az sıkışık
- **İkon Container Büyütüldü**: İkon boyutu `38px` → `48px` yükseltildi, daha belirgin ve tıklanabilir görünüm
- **Esnek Flex Layout**: Kart yapısı `flex-wrap: wrap` ile mobilde otomatik alt alta geçiyor
- **Progress Bar İyileştirmesi**: Yükseklik `5px` → `6px`, border-radius artırıldı, gradient arka plan eklendi
- **Reward Box**: Ödül bilgisi için ayrı bir `.quest-reward-wrap` container oluşturuldu, daha düzgün hizalama
- **Claim Butonu**: Özel `.quest-claim-btn` sınıfı eklendi, reward ile birlikte düzgün hizalanıyor
- **Hover Efektleri**: Kart hover'da `translateY(-1px)` ve gölge efekti eklendi
- **Tamamlanmış Kart Stili**: Yeşil tonlarında daha belirgin tamamlanma göstergesi

#### Profile Sayfası Güncellemeleri (`app/profile/page.js`):

- **İpucu Box Padding**: Padding artırıldı (`6px 10px` → `10px 14px`), daha okunabilir
- **Progress Text**: Inline span yerine `.quest-progress-text` sınıfı ile ayrı element
- **Claimed Text**: Özel `.quest-claimed-text` sınıfı ile "Alındı" metni
- **Glass-panel Kaldırıldı**: Quest card'lardan gereksiz `glass-panel` class'ı kaldırıldı (zaten kendi background'u var)

#### Admin Card İyileştirmeleri (`app/globals.css`):

- **Padding Artırıldı**: `20px` → `24px`, içerikler daha ferah
- **H3 Başlık Stili**: Font-size `0.95rem` → `1rem`, color ve margin iyileştirmeleri

#### Mobil Responsive Desteği:

- **640px ve altı**: İkon küçültüldü (`42px`), padding azaltıldı, reward section yatay düzende
- **400px ve altı**: Daha kompakt görünüm, reward section dikey düzene geçiyor
- **Touch-friendly**: Butonlar minimum `44px` touch hedefi

---

## [v2.17.0] — 2026-06-21 (Doksan Dördüncü Yayın)

### ⚡ Performans İyileştirmeleri — PageSpeed Core Web Vitals Final Optimization

Bu güncelleme, mobil PageSpeed skoru (38) hedef alarak daha ileri optimizasyonlar uygular.

#### Font Optimizasyonu (FCP İyileştirmesi)

- **next/font/google Entegrasyonu** (`app/layout.js`):
  - Google Fonts harici isteği tamamen kaldırıldı
  - `next/font/google` ile Inter fontu optimize yüklendi
  - Otomatik preload, subset optimization ve display=swap
  - CSS variable `--font-inter` ile globals.css'e uygulandı
  - Harici DNS lookup ve render-blocking tamamen giderildi

- **Eski Font Kodu Kaldırıldı** (`app/layout.js`):
  - `<link rel="preconnect">` etiketleri kaldırıldı
  - `<link rel="stylesheet">` harici font isteği kaldırıldı
  - `FONT_PRELOAD` sabiti kaldırıldı
  - Sadece `next/font` ile optimize yükleme

**Etki:** FCP ~1.8s → hedef <1.2s, DNS lookup sayısı -2

#### Critical CSS Optimizasyonu

- **Next.js optimizeCss Deneysel Özellik** (`next.config.mjs`):
  - `experimental.optimizeCss: true` eklendi
  - Critical CSS otomatik extraction etkinleştirildi
  - Render-blocking CSS önemli ölçüde azaltıldı

- **critters Paketi Eklendi** (`package.json`):
  - Critical CSS generation için gerekli bağımlılık
  - Build sürecinde otomatik kullanılıyor

**Etki:** Render-blocking CSS ~275KB → minimal critical CSS, CLS <0.05

#### Görsel & Image Optimization

- **Device/Image Sizes Genişletildi** (`next.config.mjs`):
  - deviceSizes: 640, 750, 828, 1080, 1200, 1920, **2048**
  - imageSizes: 24, 32, 48, 64, 96, 128, 256, **384**
  - Mobil cihazlar için daha optimize breakpoint'ler

- **Mevcut next/image Kullanımı Doğrulandı**:
  - SeriesCard: `priority` + `sizes` prop'ları aktif
  - HeroSliderWidget: `priority` + `sizes` prop'ları aktif
  - MostReadWidget: `loading="lazy"` + `sizes` prop'ları aktif
  - Reader pages: Lazy loading hazır

#### Bundle Optimization

- **CommentSection Lazy Loading** (`app/read/[chapterId]/page.js`):
  - Zaten `lazy()` ile dinamik import yapılıyor
  - Suspense fallback aktif

- **Service Worker Stratejisi** (`public/sw.js`):
  - Network-first strateji aktif
  - Static asset caching mevcut
  - API route'lar skip ediliyor (doğru)

#### Build Configuration

- **compress: true** - Gzip/Brotli aktif
- **poweredByHeader: false** - Güvenlik + küçük bandwidth
- **compiler.removeConsole** - Production'da console.log kaldırma aktif

### 📊 Performans Beklentileri

| Metrik | Önceki | Hedef | Beklenen İyileşme |
|--------|--------|-------|-------------------|
| LCP (Mobil) | ~4s | <2.5s | ~40% hızlanma |
| FCP (Mobil) | ~2s | <1.2s | ~40% hızlanma |
| CLS (Desktop) | <0.1 | <0.05 | ~50% düşüş |
| Performance (Mobil) | 38 | 60+ | +22 puan |
| Performance (Desktop) | 75 | 90+ | +15 puan |

---

## [v2.16.0] — 2026-06-21 (Doksan Üçüncü Yayın)

### ⚡ Performans İyileştirmeleri — PageSpeed & Core Web Vitals Optimizasyonu

Bu güncelleme, PageSpeed Insights'daki düşük mobil performans skorunu (67) hedef alarak LCP, FCP ve CLS metriklerini iyileştirir.

#### Font Yükleme Optimizasyonu (FCP İyileştirmesi)

- **Google Fonts Render-Blocking Giderildi** (`app/layout.js`, `app/globals.css`):
  - Google Fonts `@import` ifadesi globals.css'den kaldırıldı (render-blocking kaynak).
  - Bunun yerine `app/layout.js`'de `<link rel="preconnect">` eklendi — DNS çözümlemesi önceden yapılır.
  - `<link rel="stylesheet">` ile `display=fallback` parametresi eklendi — FOIT (Flash of Invisible Text) önlenir.
  - Sistem fontları (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`) Inter yüklenene kadar fallback olarak kullanılır.

**Etki:** FCP 3.3s → hedef <1.8s (yaklaşık %45-50 iyileşme bekleniyor)

#### CLS (Cumulative Layout Shift) İyileştirmeleri

- **Hero Slider CLS Önlemleri** (`app/hero-slider.css`):
  - `.hs-cascade-section`'a `min-height: 440px` eklendi — görsel yüklenmeden önce alan korunur.
  - `.hscas-cover-wrap`'a `aspect-ratio: 195 / 292` CSS özelliği eklendi — görsel boyutları yüklemeden önce rezerve edilir.
  - Mobil responsive'da `.hscas-cover-wrap` için `aspect-ratio: unset` ile desktop değerleri resetlendi.

- **Trending Widget CLS Önlemleri** (`app/trending.css`):
  - `.trend-glass3d-card`'a `contain: layout style` eklendi — kartlar arası layout bağımlılığı kaldırıldı.

- **Glassmorphism Card CLS İyileştirmesi** (`components/UpdateCards/GlassmorphismCard.js`):
  - `coverWrapStyle`'a `aspectRatio: 'auto'` açıkça belirtildi.

**Etki:** CLS 0.86 → hedef <0.1 (desktop'taki büyük layout shift giderildi)

#### LCP (Largest Contentful Paint) İyileştirmeleri

- **Hero Slider Görsel Önceliklendirme** (`components/HeroSliderWidget.js`):
  - Cascade hero'daki ana kapak görseli zaten `priority` prop'u ile eager loading yapıyordu.
  - Arka plan kartları için `sizes` prop'ları mevcuttu (mobil 100vw, desktop 100px/80px/60px).
  - Ek CSS optimizasyonları ile render önceliği iyileştirildi.

**Etki:** LCP 7.0s → hedef <2.5s (mobil'deki ağır görsel yüklemesi hızlandırıldı)

#### JavaScript Blocking Azaltma

- **CommentSection Lazy Loading** (`app/read/[chapterId]/page.js`):
  - Heavy bileşen `import` yerine `lazy(() => import(...))` ile dinamik import yapıldı.
  - Yorumlar sayfanın ilk yükünde yüklenmez, kullanıcı yorumlar bölümüne geldiğinde yüklenir.
  - 3 farklı okuma modunda (novel, manga, webtoon) tüm CommentSection kullanımları `Suspense` ile sarıldı.
  - Fallback olarak "Yorumlar yükleniyor..." placeholder gösteriliyor.

**Etki:** TBT (Total Blocking Time) iyileşmesi, ana iş parçacığı daha az meşgul

#### Next.js Build Optimizasyonları

- **Package Import Optimizasyonu** (`next.config.mjs`):
  - `experimental.optimizePackageImports` eklendi — `recharts`, `lucide-react`, `date-fns` için.
  - Bu paketlerin tree-shaking'i iyileştirilir, bundle boyutu küçülür.

- **ESLint Build Sırasında Atlandı** (`next.config.mjs`):
  - `eslint: { ignoreDuringBuilds: true }` eklendi — build süresi kısalır.
  - ESLint hâlâ development'ta çalışır, sadece build'te atlanır.

### 📊 Performans Beklentileri

| Metrik | Önceki | Hedef | Beklenen İyileşme |
|--------|--------|-------|-------------------|
| LCP (Mobil) | 7.0s | <2.5s | ~65% hızlanma |
| FCP (Mobil) | 3.3s | <1.8s | ~45% hızlanma |
| CLS (Desktop) | 0.86 | <0.1 | ~88% düşüş |
| Performance (Mobil) | 67 | 90+ | +23 puan |

---

## [v2.15.0] — 2026-06-21 (Doksan İkinci Yayın)

### ⚡ Performans İyileştirmeleri — Ana Sayfa & Görsel Optimizasyonu

- **Son Yüklenen Bölümler — Görsel Optimizasyonu** (`components/UpdateCards/GlassmorphismCard.js`):
  - Native `<img>` etiketleri `next/image` bileşeniyle değiştirildi.
  - Otomatik WebP/AVIF dönüşümü etkinleştirildi (Next.js Image Optimization).
  - `sizes="120px"` ile responsive image breakpoint'leri optimize edildi.
  - `quality={75}` ile görsel kalitesi dosya boyutu dengesinde ayarlandı.
  - `backdropFilter: blur(24px)` → `blur(12px)` azaltıldı — GPU compositing maliyeti yarıya düşürüldü.

- **Son Yüklenen Bölümler — Render Optimizasyonu** (`app/page.js`):
  - `ChapterRow` ve `UpdateCard` memoized bileşenleri eklendi.
  - Her kart ve bölüm satırı artık yalnızca prop değiştiğinde re-render ediliyor.
  - `fmtCh()` ve `timeAgo()` fonksiyonları bileşen dışına taşınarak gereksiz fonksiyon oluşturma önlendi.
  - `useCallback` ile `getChapterTimeAgo` helper fonksiyonu optimize edildi.

- **SeriesCard — next/image Entegrasyonu** (`components/SeriesCard.js`):
  - Tüm görseller `next/image` bileşenine geçirildi.
  - `fill` prop ile responsive container-based görsel boyutlandırma.
  - `priority` prop eklendi — above-the-fold görseller için eager loading.
  - `sizes` prop ile tarayıcıya optimal görsel boyutu bildirildi.
  - CSS uyumluluğu için `.series-card-image > span` stili eklendi.

- **TrendingWidget — Görsel Optimizasyonu** (`components/TrendingWidget.js`):
  - Marquee slider'daki tüm görseller `next/image` ile optimize edildi.
  - Lazy loading ve `sizes` prop eklendi.

- **HeroSliderWidget — Görsel Optimizasyonu** (`components/HeroSliderWidget.js`):
  - Cascade hero slider'daki görseller `next/image` bileşenine geçirildi.
  - Ana kapak görseli için `priority` prop eklendi (LCP iyileştirmesi).
  - Arka plan kartları için `sizes` prop eklendi.

- **Editor's Pick Widget — Görsel Optimizasyonu** (`app/page.js`):
  - Deck carousel'daki görseller `next/image` ile değiştirildi.

- **MostReadWidget — Görsel Optimizasyonu** (`components/MostReadWidget.js`):
  - En çok okunanlar listesindeki tüm görseller `next/image` bile optimize edildi.

- **Glass Card CSS Optimizasyonu** (`app/update-cards.css`):
  - `.glass-card` backdropFilter `blur(16px)` → `blur(8px)` azaltıldı.
  - GPU compositing maliyeti önemli ölçüde düşürüldü.

- **API Cache Header Optimizasyonu** (`app/api/series/latest-updates/route.js`, `app/api/series/trending/route.js`):
  - Son güncellemeler API'sine `Cache-Control: public, s-maxage=60, stale-while-revalidate=120` header'ı eklendi.
  - Trending API'sine `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` header'ı eklendi.
  - Sunucu yükü azaltıldı, tekrarlayan istekler cache'den karşılanıyor.

### 📊 Performans Beklentileri

| Optimizasyon | Önceki | Sonraki | İyileşme |
|-------------|---------|---------|-----------|
| Görsel Yükleme (LCP) | ~2-4s | ~0.8-1.5s | ~50-60% hızlanma |
| Scroll Performansı | Kasma/lag | Akıcı | ~70% iyileşme |
| API İstekleri (cache sonrası) | Her istek için DB | 60-300s cache | ~90% sunucu yükü azalması |
| GPU Compositing | 24px blur | 8-12px blur | ~50% compositing maliyeti düşüşü |

---

## [v2.14.0] — 2026-06-20 (Doksanbirinci Yayın)

### ⚡ Performans İyileştirmeleri — Kasma/Lag & Mobil Optimizasyonu

- **SeriesDetailClient — Render Optimizasyonu** (`components/SeriesDetailClient.js`):
  - `Intl.NumberFormat` instance'ı bileşen dışına taşındı (`trFormatter` sabiti). Önceden her `fmtNum()` çağrısında yeni bir formatter nesnesi oluşturuluyordu; artık tek bir instance tekrar kullanılıyor.
  - `fmtNum` fonksiyonu `useCallback` ile sarmalandı — gereksiz yeniden oluşturma önlendi.
  - `genres` parse işlemi `useMemo` ile memoize edildi — her render'da JSON.parse çağrısı kaldırıldı.
  - Chapter listesi için `processedChapters` memoize array'i eklendi: Tarih parse (`dateStr`), `isNew` bayrağı, `chNum` ve `hasTitle` hesaplamaları artık sadece `filteredChapters` değiştiğinde tek seferinde hesaplanıyor. Önceden her render döngüsünde her bölüm satırı için ayrı ayrı çalışıyordu.
  - `memo` ve `useCallback` importları eklendi.

- **Navbar — Logo Yeniden Yükleme Bug'ı Düzeltildi** (`components/Navbar.js`):
  - Logo `src`'sindeki `Date.now()` query parametresi `useMemo` ile stabilize edildi. Önceden her state değişikliğinde (`hidden`, `searchOpen`, dropdown açılması vb.) `Date.now()` yeni değer ürettiğinden tarayıcı logoyu her seferinde yeniden indiriyordu. Artık logo URL'si sadece `siteSettings.logo_url` değiştiğinde güncelleniyor.
  - `useMemo` import eklendi.

- **Seri Detay Sayfası — Related Series SQL Optimizasyonu** (`app/series/[id]/page.js`):
  - İlgili seri sorgusu yeniden yazıldı: Eskiden `LIMIT 50` ile tüm seriler JavaScript'e çekilip filtreleniyordu (`O(n)` JS loop). Artık SQL `LIKE` koşulları ile veritabanı seviyesinde filtreleme yapılıyor (`LIMIT 6`) — veri transferi ve işlem süresi önemli ölçüde azaldı.

- **CSS — Mobil Performans Optimizasyonları** (`app/globals.css`, `app/series-detail.css`):
  - Mobilede `scroll-behavior: smooth` devre dışı bırakıldı (`@media (max-width: 768px)`) — hızlı scroll sırasında oluşan jank önlendi.
  - Dokunmatik cihazlarda (`hover: none`) `.navbar`, `.search-overlay`, `.hero-slider-arrow`, `.reader-sticky-bottom`, `.neo-stats-card` üzerindeki `backdrop-filter` kaldırıldı. Mobil GPU'larda `backdrop-filter` her frame'de full repaint tetikler; bu düzeltme özellikle orta-alt segment telefonlarda kasma sorununu çözer.
  - `prefers-reduced-motion` desteği eklendi — hareket kısıtlama tercihi olan kullanıcılar için tüm animasyon ve geçişler devre dışı bırakıldı.
  - Mobilede parallax `background-attachment: scroll !important` ile zorlandı — bazı mobile tarayıcılarda `fixed` değer sürekli repaint tetikler.
  - `.sd-seo-tags-section` için `content-visibility: auto` eklendi — sayfa dışındaki içerik lazy render ediliyor.
  - `.sd-genre-tag-new` üzerindeki `transition: all 0.3s` → `transition: background 0.25s, border-color 0.25s, transform 0.25s, box-shadow 0.25s` olarak daraltıldı.
  - `.nav-icon-btn`, `.dropdown-item`, `.chapter-item` üzerindeki `transition: all` → sadece değişen özellikler olarak optimize edildi (compositing maliyetini azaltır).

---

## [v2.13.0] — 2026-06-20 (Doksanıncı Yayın)

### ⚡ Performans İyileştirmeleri — Kasma/Lag Optimizasyonu

- **Navbar Scroll Jank Giderildi** (`components/Navbar.js`, `app/globals.css`):
  - `handleScroll` fonksiyonu `requestAnimationFrame` throttle ile sarmalandı. Her scroll event'te state güncellemesi yerine artık sadece bir sonraki frame'de işlem yapılıyor; bu özellikle hızlı scroll sırasındaki jank'ı tamamen ortadan kaldırıyor.
  - `backdrop-filter: blur(20px) saturate(180%)` → `backdrop-filter: blur(12px)` olarak azaltıldı. Scroll sırasında her frame'de tetiklenen compositing maliyeti yarıya indi.
  - Navbar'a `will-change: transform` ve `transform: translateZ(0)` eklenerek GPU compositing katmanına alındı.
  - Dropdown menüsünden `backdrop-filter: blur(20px)` kaldırıldı — açılışta gereksiz compositing maliyeti yoktu.

- **Hero Slider Optimizasyonu** (`app/hero-slider.css`, `components/HeroSliderWidget.js`):
  - `classicBgFadeIn` ve `cinemaBgFadeIn` keyframe animasyonlarından `filter: blur()` kaldırıldı. Bu animasyonlar her frame'de filter repaint tetikliyordu; artık sadece `opacity` geçişi kullanılıyor.
  - Cascade (aktif) tasarımında `.hscas-rating-badge`, `.hscas-genre-tag`, `.hs-nav-btn` elemanlarından `backdrop-filter` kaldırıldı — her biri ayrı bir stacking context açıyordu.
  - Holografik tasarımdan `-webkit-box-reflect` kaldırıldı — layout tetikleyen pahalı bir özellikti.
  - `.hsh-title`'dan `backdrop-filter: blur(4px)` kaldırıldı.
  - Cyberpunk `@keyframes cyberPulse` animasyonundan `filter: hue-rotate()` kaldırıldı (sürekli filter repaint); yerine `box-shadow` pulse animasyonu eklendi.
  - `AdultOverlay` bileşenindeki inline `backdropFilter: blur(12px)` kaldırılarak koyu solid arka planla değiştirildi.
  - Klasik hero tasarımından `.hscl-rating-badge` backdrop-filter kaldırıldı.

- **Seri Detay Sayfası Optimizasyonu** (`app/series-detail.css`, `components/SeriesDetailClient.js`):
  - `NeoStatsCard`'daki `backdrop-filter: blur(18px)` → `blur(10px)` olarak azaltıldı; kart `transform: translateZ(0)` ve `contain: layout style` ile GPU katmanına alındı.
  - `.neo-metric` ve `.neo-interactive-rating` elemanlarından `backdrop-filter` kaldırıldı — her metric için stacking context açılıyordu.
  - `.sd-genre-tag-new` elemanlarından `backdrop-filter: blur(24px)` kaldırıldı — her genre tag için compositing maliyeti vardı.
  - `detail-style2` Glassmorphism header blur değeri `20px` → `10px` olarak azaltıldı; `transform: translateZ(0)` ve `contain: layout style` eklendi.
  - Scroll event handler `requestAnimationFrame` ile throttle edildi — scroll sırasındaki stickyCTA tetikleyicisinde jank önlendi.

- **Series Kart Listesi Optimizasyonu** (`app/globals.css`):
  - `.status-badge` elemanından `backdrop-filter: blur(10px)` kaldırıldı. Seri listelerinde yüzlerce kart gösterilirken her badge ayrı bir stacking context oluşturuyordu — toplam compositing maliyeti çok yüksekti.

### ✨ Yeni Özellikler

- **Admin Paneli — Kullanıcı Klasörleri** (`app/admin-panel/page.js`, `app/api/admin/route.js`):
  Admin paneli Medya Kütüphanesi sekmesine, mevcut "Seri Klasörleri" görünümünün yanına **"Kullanıcı Klasörleri"** görünümü eklendi.

  **Özellikler:**
  1. **Kullanıcı bazlı klasör görünümü**: Her kullanıcı için avatar, profil kapağı ve sahipsiz (orphan) dosyalar ayrı bir klasör kartı olarak listeleniyor.
  2. **Avatar thumbnail**: Kullanıcının mevcut avatarı klasör kartında gösteriliyor; avatar yoksa baş harfi ile renkli daire gösteriliyor.
  3. **Dosya etiketleri**: Avatar ve kapak dosyaları renkli badge'lerle işaretleniyor.
  4. **Sahipsiz dosya tespiti**: `public/uploads/avatars/` dizininde kullanıcı ID'siyle eşleşen ancak DB'de kayıtlı olmayan eski yüklemeler otomatik tespit edilerek sarı "sahipsiz" badge'i ile işaretleniyor.
  5. **Kullanıcı arama**: Anlık filtreleme ile kullanıcı adına göre arama yapılabiliyor.
  6. **Klasör detay görünümü**: Bir kullanıcıya tıklandığında avatar, profil kapağı ve sahipsiz dosyaların büyük önizlemesi ve dosya boyutu bilgisi açılıyor.
  7. **Silme işlemi**: Her dosya için onay modallı silme butonu mevcut.
  8. **Breadcrumb navigasyonu**: Klasörler arası kolayca gezinti yapılabiliyor.

  **API Endpoint'leri** (`app/api/admin/route.js`):
  - `GET /api/admin?action=list-user-folders` — Tüm kullanıcıları dosya sayısı, boyut ve orphan bilgisiyle listeler.
  - `GET /api/admin?action=list-user-folder-detail&mediaUserId={id}` — Belirli bir kullanıcının tüm medya dosyalarını (avatar, kapak, sahipsiz) döndürür.

---



### ✨ Yeni Özellikler

- **Profil Kırpma Sistemi — Kapsamlı Yeniden Yapılandırma** (`app/profile/page.js`, `app/api/auth/profile/avatar/route.js`, `app/api/auth/profile/cover/route.js`, `lib/imageOptimizer.js`): Profil resmi ve kapak resmi kırpma sistemi tamamen yeniden yapılandırıldı.

  **Yapılan İyileştirmeler:**
  1. **Tam Özgür Kırpma**: Görsel artık tamamen istenilen şekilde konumlandırılabilir, zoom yapılabilir ve kaydırılabilir.
  2. **Geliştirilmiş Sürükleme**: Fare tekerleği ile hızlı zoom, hassas zoom slider'ı ile ince ayar yapılabilir.
  3. **Genişletilmiş Zoom Aralığı**: Zoom artık %50 ile %500 arasında ayarlanabilir (önceki %100-%300'e kıyasla).
  4. **Duyarlı UI**: Kırpma alanları büyütüldü (avatar 200x200px, kapak 180px yükseklik).
  5. **Canvas Tabanlı Kesin Kırpma**: `getCroppedBlob()` fonksiyonu tamamen yeniden yazıldı. CSS transform değerleri artık doğrudan canvas çizim komutlarına dönüştürülüyor.
  6. **Önizleme-Doğrulama Eşliği**: Kaydetmeden önce önizleme alanında görülen görüntü, kaydedildikten sonra birebir aynı şekilde kaydediliyor.
  7. **Mobil Desteği**: Touch olayları (touchstart, touchmove, touchend) tam olarak destekleniyor.
  8. **Backend Entegrasyonu**: Canvas tabanlı kırpma yapıldığında `cropApplied: true` bayrağı gönderilerek sunucuda ek kırpma hesaplaması yapılmıyor.
  9. **Hata Düzeltmeleri**: Önceki sürümlerde görülen kırpma tutarsızlıkları tamamen giderildi.

---

## [v2.11.0] — 2026-06-20 (Seksen Sekizinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Link Önizleme — Seri Kapak Görseli Yerine Favicon Görünüyor** (`app/series/[id]/layout.js`, `app/series/[id]/chapter/[chapterNumber]/layout.js`): Seri linkleri paylaşıldığında Discord, Telegram, Twitter gibi platformlarda seri kapağı yerine sitenin faviconu önizleme görseli olarak çıkıyordu. Kök nedenler:
  1. `og:image` ve `twitter:image` URL'leri tam (absolute) URL formatında değildi; göreceli path'ler sosyal medya crawler'ları tarafından düzgün çözülemezdi.
  2. `openGraph.images` içinde genişlik/yükseklik değerleri standart OG görsel boyutlarına (1200x630) uygun değildi.

  **Yapılan Düzeltmeler:**
  1. Series layout'ta `absoluteCoverUrl` değişkeni eklendi — tüm görsel URL'leri `https://domain.com/...` formatında mutlak URL olarak oluşturuluyor.
  2. `openGraph.images` boyutları 460x650'den 1200x630'a güncellendi (sosyal medya standart boyutu).
  3. `og:title` ve `twitter:title` seri adı olarak ayarlandı (page title yerine).
  4. Aynı düzeltmeler chapter layout'a da uygulandı.

- **opengraph-image.js — Next.js 15 Uyumsuzluğu** (`app/series/[id]/opengraph-image.js`): Next.js 15'te `params` artık bir Promise değil, doğrudan obje. `await params` ifadesi kaldırıldı.

- **Favicon Sistemi — Kapsamlı Yeniden Yapılandırma** (`app/layout.js`, `app/api/favicon/route.js`, `next.config.mjs`, `proxy.js`, `public/manifest.json`, `public/favicon.svg` *yeni*): Admin panelinden favicon değiştirilmesine rağmen tarayıcılar sürekli varsayılan ikonu göstermeye devam ediyordu. Sorunun kök nedenleri ve yapılan düzeltmeler:

  **Kök Nedenler:**
  1. **Çift favicon inject**: `generateMetadata()` fonksiyonu ve body'deki `<CustomHeadScripts>` bileşeni aynı anda favicon enjekte ediyordu — bu tutarsızlığa neden oluyordu.
  2. **Next.js varsayılan favicon.ico**: `app/` klasöründe favicon olmasa da Next.js otomatik olarak varsayılan bir favicon oluşturuyordu.
  3. **Cache busting yetersizliği**: `SERVER_START_VER` sadece sunucu başlangıcında oluşuyordu; veritabanı değişikliklerinde cache kırılmıyordu.
  4. **Varsayılan ikon dosyaları eksik**: `public/icon-192.png` ve `public/icon-512.png` dosyaları yoktu.

  **Yapılan Düzeltmeler:**
  1. **Dinamik favicon API'si oluşturuldu** (`app/api/favicon/route.js`): Veritabanındaki `favicon_url` değerini okur ve doğru görseli döndürür. Varsayılan olarak `/favicon.svg`'ye yönlendirir.
  2. **Varsayılan SVG favicon eklendi** (`public/favicon.svg`): "読" karakteri içeren temel site ikonu.
  3. **Çift inject kaldırıldı**: Body'deki `<CustomHeadScripts>` ile yapılan favicon inject kaldırıldı; artık sadece `generateMetadata()` yönetiyor.
  4. **Next.js favicon devre dışı** (`next.config.mjs`): `icons: { icon: false, shortcut: false }` ile otomatik favicon oluşturma kapatıldı.
  5. **Cache busting iyileştirildi**: `getFaviconTimestamp()` fonksiyonu veritabanındaki değerin hash'ini kullanıyor — her değişiklikte buster değişir.
  6. **Manifest.json güncellendi**: PWA manifest artık dinamik `/api/favicon`'u kullanıyor.
  7. **Proxy.js güncellendi**: Matcher güncellendi, favicon yönetimi API'ye bırakıldı.

  **Sonuç:** Artık admin panelinden yüklenen favicon her zaman kullanılır; `/public` klasöründeki varsayılan favicon hiçbir durumda zorla yüklenmez. Uygulama yeniden başlatıldığında veya deploy edildiğinde favicon varsayılana dönmez.

---

### 🐛 Hata Düzeltmeleri

- **Link Önizleme — Seri Kapak Görseli Çıkmıyor** (`app/seri/[id]/opengraph-image.js` *yeni*, `app/series/[id]/layout.js`, `app/seri/[id]/layout.js`, `app/series/[id]/opengraph-image.js`): Herhangi bir seri linki paylaşıldığında kapak görseli yerine sitenin varsayılan faviconu görünüyordu. Kök nedenler:
  1. `/seri/[id]/` rotasında dinamik OG görsel üretici (`opengraph-image.js`) hiç yoktu; Discord, Telegram, Twitter gibi platformlar bu rotada özel önizleme görseli alamıyordu. Düzeltme: Bu rotaya `app/series/[id]/opengraph-image.js`'i yeniden dışa aktaran bir dosya eklendi.
  2. Tüm layout ve opengraph dosyalarındaki kapak URL oluşturma mantığı savunmasızdı: veritabanında yol `uploads/covers/...` biçiminde (başında `/` olmadan) saklandığında `BASE_URL + path` birleştirmesi geçersiz URL oluşturuyordu. Artık yol başında `/` yoksa otomatik ekleniyor.

---

## [v2.10.8] — 2026-06-19 (Seksen Altıncı Yayın)

### 🐛 Hata Düzeltmeleri

- **Manga Modu — Hızlı Tık Debounce** (`app/read/[chapterId]/page.js`): Manga okuma modunda çok hızlı ard arda tıklandığında sayfalar birden fazla kez geçiyor ve görsel yüklenmeden atlanıyordu. `goNextPage` ve `goPrevPage` fonksiyonlarına 280ms'lik `mangaNavCooldownRef` bazlı debounce eklendi. Artık her tıklama arasında minimum süre bekleniyor, çift/üçlü sayfa atlama önleniyor.

- **Seri Detay — Toplam Okunma Hesabı** (`components/SeriesDetailClient.js`): İstatistik kartındaki "Okunma" sayısı, gerçek bölüm okunmalarıyla uyuşmuyordu. Daha önce `series.views` (serinin genel görüntülenme sayısı) gösteriliyordu; artık tüm bölümlerin `read_count` değerleri toplanarak gerçek toplam okunma sayısı hesaplanıp gösteriliyor.

- **Favicon — Tarayıcı Cache Bypass** (`app/layout.js`): Admin panelinden favicon değiştirilmesine rağmen tarayıcılar eski favicon'u göstermeye devam ediyordu. Next.js metadata sistemi aşırı agresif önbellekleme yapıyordu. Düzeltme: Özel favicon URL'si varsa `CustomHeadScripts` aracılığıyla doğrudan `<link rel="icon">` ve `<link rel="shortcut icon">` etiketleri DOM'a enjekte ediliyor; URL'ye sunucu başlatma zamanına özgü `_fv` cache-buster parametresi ekleniyor. Bu yöntem Next.js metadata pipeline'ını tamamen bypass ederek favicon değişimini garanti altına alıyor.

### 🎨 Tasarım İyileştirmeleri

- **Seri Detay — Puanlama & İstatistik Kartı** (`app/series-detail.css`, `components/SeriesDetailClient.js`): Puanlama ve istatistik bölümü glassmorphism efektiyle yeniden tasarlandı. `backdrop-filter: blur(18px)`, hafif iç parlama ve renkli üst kenar çizgisi ile modern cam görünümü kazandı. Metrik kutular ayrı glassmorphism panel olarak ayrıştırıldı. Etkileşimli puanlama yıldızları 10'dan **5'e** düşürüldü (arka planda 1-10 skalasına eşleniyor, mevcut oylar bozulmadan korunuyor).

- **Manga Keşfet — Arama Butonu** (`app/series/page.js`): Arama kutusunun sağ tarafındaki "ara" butonu keskin köşeliydi, giriş alanıyla uyumsuz görünüyordu. `borderRadius: '0 24px 24px 0'` ile yuvarlak hale getirildi, `fontWeight` 700'e ve `boxShadow` ile buton vurgusu iyileştirildi.

### ⚡ Performans

- **HeroSlider — Cam Küp Lag Giderme** (`app/hero-slider.css`): Cascade hero slider bölümünde `backdrop-filter: blur(24px)` (ana section) ve `backdrop-filter: blur(20px)` (::before pseudo-element) iç içe iki pahalı blur filtresi aynı anda çalışıyordu. Bu kombinasyon özellikle orta segment cihazlarda sayfa lag'ına neden oluyordu. Düzeltme: Bölüm arka planı solid `rgba(12,12,18,0.92)` rengiyle değiştirildi (blur kaldırıldı); `::before` pseudo-elementinden de blur kaldırılıp gradyan güçlendirildi; kart geçişlerine `will-change: transform` ve optimize `transition` eklendi.

- **Seri Detay — Performans** (`app/series-detail.css`): Seri detay sayfasındaki arka plan katmanları için GPU compositing ipuçları iyileştirildi.

---

## [v2.10.7] — 2026-06-18 (Seksen Beşinci Yayın)

### 🎨 Tasarım İyileştirmeleri

- **Günlük Görevler Tasarımı**: Profil sayfasındaki görev kutularının (`quest-card`) boyutu ve içeriği rahatlatıldı. İçeriklerin üst üste binmesini engellemek için daha ferah padding ve gap değerleri kullanıldı.
- **Bildirimler Menüsü**: Navbar'daki bildirim dropdown'una (`.notif-dropdown`) gelişmiş *glassmorphism* (cam) efekti uygulandı. Hover efektleri ve genel görünüm modernleştirildi.
- **Arama Kutusu**: Arama input alanı ve sonuç listesi (`.search-bar-expanded`, `.live-search-dropdown`) modern, hap formunda (pill) bir tasarım ve *glassmorphism* efekti ile yenilendi. Odaklanma durumunda parlayan kenarlıklar eklendi.
- **Seri Detay — Tümünü Göster Butonu**: Bölümler kısmındaki "Tümünü Göster" butonu, tam alanı kaplayan şerit yerine küçük, ortalanmış ve *glassmorphism* efektine sahip şık bir butona (floating pill) dönüştürüldü.
- **Seri Detay — Etiketler (Tags)**: Sayfa altındaki tür etiketlerine belirgin bir *glassmorphism* efekti uygulandı ve hover durumunda parlayacak şekilde güncellendi.

---

## [v2.10.6] — 2026-06-18 (Seksen Dördüncü Yayın)

### 🐛 Hata Düzeltmeleri

- **Manga Modu — Mouse Tıklama Yönü** (`app/read/[chapterId]/page.js`): Manga okuma modunda sol ve sağ tıklama bölgelerinin yön mantığı tersine çevrilmişti. RTL (sağdan sola) modunda sol alana tıklamak hikayede geriye gidiyordu, oysa sol taraf bir sonraki sayfaya (hikaye sırası) tekabül eder. LTR (soldan sağa) modunda da aynı şekilde yanlış davranış vardı. Her iki mod için doğru: RTL'de sol = sonraki sayfa, sağ = önceki sayfa; LTR'de sol = önceki sayfa, sağ = sonraki sayfa.

- **Admin Panel — Bölüm Görseli Sıralama** (`app/admin-panel/page.js`): Bölümlerin sayfa görsellerini görüntülerken silme ve önizleme yapılabiliyordu ancak sayfa numarası/sıralaması değiştirilemiyordu. Sıralama modu eklendi: her sayfada yukarı/aşağı ok butonları ve elle sayfa numarası girilebilen bir input. "Kaydet" butonuna basıldığında yeni sıralama veritabanına yazılıyor.

### ✨ Yeni Özellikler

- **Manga Modu — Klavye Navigasyonu** (`app/read/[chapterId]/page.js`): Manga okuma modunda sol/sağ ok tuşları ile sayfa değiştirme artık çalışıyor. RTL modunda ← bir sonraki sayfaya, → bir önceki sayfaya gider; LTR modunda bunun tersi. Webtoon modundaki ← / → bölüm geçişi ve W/S/Space ile kaydırma özellikleri etkilenmedi.

- **Seri Detay — Bölüm Başına Yorum Sayısı** (`app/series/[id]/page.js`, `components/SeriesDetailClient.js`): Seri detay sayfasındaki bölüm listesinde okunma sayısının yanına yorum sayısı da eklendi. Mesaj balonu ikonu ile gösteriliyor; sıfır yorum olan bölümler için alan görüntülenmiyor.

- **API — Sayfa Sıralama Endpoint'i** (`app/api/admin/route.js`): `reorder-pages` action'ı eklendi. `[{id, page_number}]` dizisini alıp tek bir transaction ile veritabanını güncelliyor. `upload_chapters` yetkisi gerektirir.

---

## [v2.10.5] — 2026-06-18 (Seksen Üçüncü Yayın)

### 🐛 Hata Düzeltmeleri

- **Seri/Bölüm Silme — Artık Dosya Temizliği** (`app/api/admin/route.js`): Seri veya bölüm silindiğinde ilgili medya dosyaları artık diskten de kaldırılıyor. Daha önce veritabanı kayıtları silinirken fiziksel görseller `/uploads/` altında kalıyor ve boşuna depolama alanı kaplıyordu.
  - `delete-series`: Serinin kapak görseli (`/uploads/covers/`) ve tüm bölümlere ait sayfa klasörleri (`/uploads/pages/{chapterId}/`) ile thumbnail dosyaları (`/uploads/thumbnails/`) siliniyor. Demo/varsayılan görseller ve paylaşılan bölüm başı/sonu görselleri korunuyor.
  - `delete-chapter`: Bölüme ait sayfa klasörü (`/uploads/pages/{chapterId}/`) ve `/uploads/thumbnails/` altındaki thumbnail dosyası siliniyor.
  - `delete-all-chapters`: Her bölüm için sayfa klasörü ve thumbnail temizliği eklendi.
  - `delete-selected-chapters`: Her bölüm için sayfa klasörü ve thumbnail temizliği eklendi.

- **Favicon — Özel Favicon Önceliği** (`app/layout.js`): Admin panelinden özel favicon yüklendiğinde bazı tarayıcılar hâlâ varsayılan `icon-192.png` ikonunu gösteriyordu. Kök neden: icons dizisinde varsayılan PNG ikonları özel favicona göre daha önce listelenmesiydi. Düzeltme: Özel favicon ayarlandığında `icons.icon` dizisinin **ilk sırasına** yerleştiriliyor; `shortcut` da dizi olarak güncellendi. Tarayıcılar artık öncelikli olarak özel favicon'u seçiyor.

- **Seri Linki Önizlemesi — OG Görseli** (`app/seri/[id]/layout.js`): `https://siteadi.com/seri/...` formatındaki linkler sosyal medyada paylaşıldığında seri kapak görseli yerine site logosu gösteriliyordu. Kök neden: `/seri/[id]/layout.js` yalnızca canonical URL belirliyor, Open Graph meta etiketleri üretmiyordu; OG crawler kök layout'taki genel site logosuna düşüyordu. Düzeltme: `generateMetadata` fonksiyonu tam OG/Twitter metadata'sıyla (`og:image`, `og:title`, `og:description`, `twitter:card`) yeniden yazıldı. Artık seri kapak görseli, başlığı ve açıklaması doğru şekilde önizleniyor.

### ✨ Yeni Özellikler

- **Medya — Seri Klasör Tarayıcısı** (`app/admin-panel/page.js`, `app/api/admin/route.js`): Admin panelindeki Medya Kütüphanesi bölümüne seri bazlı hiyerarşik klasör görünümü eklendi. "Seri Klasörleri" moduna geçildiğinde her seri bir klasör kartı olarak görüntüleniyor (kapak görseli, bölüm sayısı, toplam boyut). Bir seri klasörüne girildiğinde kapak görseli ve bölüm klasörleri listeleniyor; bölüme girildiğinde o bölümün tüm sayfa görselleri grid halinde gösteriliyor. Breadcrumb navigasyonu ile üst seviyelere kolayca dönülüyor. Mevcut "Düz Liste" modu tamamen korunuyor.
  - Yeni API action'ları: `list-media-folders` (seri klasör listesi), `list-media-series-chapters` (seri içindeki bölümler), `list-media-chapter-pages` (bölüm sayfaları).

---

## [v2.10.4] — 2026-06-18 (Seksen İkinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Profil — Canvas Kırpma ObjectURL Sızıntısı** (`app/profile/page.js`): `saveAvatar` ve `saveCover` fonksiyonları başarılı kayıt sonrasında `URL.revokeObjectURL()` çağırmıyordu. Blob URL'ler artık hem iptal hem de başarılı kayıt durumunda temizleniyor.

- **Profil — Canvas crossOrigin Güvenliği** (`app/profile/page.js`): `getCroppedBlob` fonksiyonu artık blob/data URL olmayan kaynaklarda `img.crossOrigin = 'anonymous'` ayarlıyor. Bazı tarayıcılarda tainted canvas hatası alınmasını önler.

---

## [v2.10.3] — 2026-06-18 (Seksen Birinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Hero Slider — Siyah Dikey Çizgi** (`app/hero-slider.css`): `.hs-cascade-section::before` pseudo-elementinde `border-right: 1px solid rgba(255,255,255,0.05)` satırı kaldırıldı. `backdrop-filter: blur(20px)` alanının %65 noktasında ani bitişi ve bu ince kenarlığın üst üste gelmesi, görsel arka plana bağlı olarak belirgin siyah bir dikey çizgi oluşturuyordu.

### ✨ İyileştirmeler

- **Profil — Canvas Tabanlı Kırpma Sistemi** (`app/profile/page.js`, `app/api/auth/profile/avatar/route.js`, `app/api/auth/profile/cover/route.js`): Profil ve kapak resmi kırpma sistemi baştan yeniden yazıldı.

  **Eski sorunlar:**
  - Sunucu tarafı Sharp geometrisi ile CSS önizleme arasında kaymalar yaşanıyordu; kayıt edilen görsel önizlemeden farklı çıkabiliyordu.
  - Kapak önizlemesinde `×2` çarpan hack'i tutarsızlık yaratıyordu.
  - Sürükleme sırasında görsel viewport dışına çıkabiliyor ve boş (siyah) alan görünüyordu.
  - Zoom 1×'den küçüğe düşürülebildiğinden görsel küçülüp ortada kalıyordu.

  **Yeni sistem:**
  - `getCroppedBlob()` helper fonksiyonu: kullanıcının sürükleme ve zoom değerlerini `canvas.drawImage()` ile piksel düzeyinde doğru biçimde uygular ve sonucu WebP blob olarak üretir. Önizlemede görünen **tam olarak** kaydedilir.
  - Avatar (200×200) ve kapak (1200×400) için canvas, output boyutlarında doğrudan üretilir; sunucuya `precroppedCanvas=true` bayrağıyla gönderilir — Sharp yalnızca WebP dönüşümü yapar, ek crop hesaplaması yapılmaz.
  - Kapak önizlemesindeki `×2` çarpanı kaldırıldı; kırpma parametreleri artık tutarlı tek bir koordinat uzayında çalışıyor.
  - Drag clamping eklendi: image hiçbir zaman viewport dışına çıkamıyor, boş siyah köşe görünmüyor.
  - Zoom minimum değeri 0.5'ten 1.0'a yükseltildi; görsel her zaman alanı tam olarak kaplıyor.
  - Cover crop container yüksekliği 120px → 160px yapıldı; daha iyi görünüm için `coverCropRef` ile gerçek genişlik ölçümü yapılıyor.

---

## [v2.10.2] — 2026-06-18 (Sekseninci Yayın)

### 🐛 Hata Düzeltmeleri

- **Sayfa Arka Planı — Global Blur Çalışmıyor** (`components/PageBackground.js`): Admin panelinde "Tüm Sayfalar (Genel)" için görsel ayarlanıp blur değeri girildiğinde blur uygulanmıyordu. Kök neden: `saveCustomize` tüm `page_bg_*_blur` anahtarlarını — kullanıcı dokunmasa bile — `'0'` olarak veritabanına kaydediyordu. `resolveVal` bu `'0'`'ı "sayfa için bilinçli sıfır" zannedip global blur değerine hiç düşmüyordu. Düzeltme: `resolveVal` artık `suffix === 'blur'` için `'0'` değerini "ayarlanmamış" sayıyor ve global değere düşüyor.

---

## [v2.10.1] — 2026-06-18 (Yetmiş Dokuzuncu Yayın)

### 🎨 Tasarım İyileştirmeleri

- **Manga Keşfet — Arama Butonu** (`app/series/page.js`): Arama çubuğundaki butonun ve input alanının köşeleri `8px` yerine `20px` radius ile yuvarlatıldı. Input `20px 0 0 20px`, buton `0 20px 20px 0` — birlikte pill (hap) şeklinde bir görünüm oluşturuyor.

### ⚡ Performans İyileştirmeleri

- **Seri Detay — `sortedChapters` ve `filteredChapters`** (`components/SeriesDetailClient.js`): Her render'da yeniden hesaplanan bölüm sıralama ve arama filtresi `useMemo` ile sarıldı. Yüzlerce bölümlü seriler için her etkileşimde tetiklenen gereksiz dizi kopyalama ve filtreleme işlemleri ortadan kalktı.

- **Seri Detay — `generateAdaptivePalette`** (`components/SeriesDetailClient.js`): Kapak renginden üretilen adaptif renk paleti (`palette`) ve CSS değişken nesnesi (`adaptiveStyles`) `useMemo([dominantColor])` ile sarıldı. Renk yalnızca kapak görüntüsü yüklendiğinde hesaplanıyor; her render'da yeniden üretilmiyor.

- **Seri Detay — Scroll Listener Optimizasyonu** (`components/SeriesDetailClient.js`): `handleScroll` fonksiyonu artık değer değişmediğinde `setShowStickyCTA` çağrısı yapmıyor. Her scroll tick'inde boşuna state güncellemesi tetiklenmesinin önüne geçildi.

- **Seri Detay — Çift Settings Fetch Sorunu** (`components/SeriesDetailClient.js`): Dosya içinde tanımlı yerel `useAppSettings()` hook'u kaldırıldı. Artık global `SettingsProvider`'dan `useSettings()` kullanılıyor; sayfa açılışında gereksiz ikinci `/api/settings` isteği ortadan kalktı. `getAppSettings` import'u da kaldırıldı.

- **Ana Sayfa — Donation Countdown Interval Re-render** (`app/page.js`): Her 30 saniyede `setDonationNow(Date.now())` çağrısı tüm ana sayfayı yeniden render ediyordu. `donationNow` artık state değil `useRef` — interval yalnızca ref'i güncelliyor, gereksiz re-render tetiklenmiyor.

- **Ana Sayfa — Stats Interval Gereksiz Re-render** (`app/page.js`): `fetchStats` fonksiyonu artık `setStats(prev => ...)` fonksiyonel güncelleme formuyla yalnızca veri gerçekten değiştiğinde state güncelliyor. Sabitlenmiş istatistiklerde 60 saniyede bir yapılan boşuna render'lar engellendi.

- **Inline `<style>` Bloklarının CSS Dosyalarına Taşınması**: JSX içindeki büyük `<style>` ve `<style dangerouslySetInnerHTML>` blokları statik CSS dosyalarına taşındı. Her render'da yeni string oluşturulmasının önüne geçildi:
  - **Neo Stats Card + SD Genres** → `app/series-detail.css` (~130 satır CSS)
  - **Donation Card (dn-\*)** → `app/globals.css` (~40 satır CSS)
  - **Popular Slider + Banners + Stats Bar** → `app/globals.css` (~520 satır CSS)
  - **Updates Pagination (upg-\*)** → `app/globals.css` (~89 satır CSS)

---

## [v2.10.0] — 2026-06-17 (Yetmiş Sekizinci Yayın)

### ✨ Yeni Özellikler

- **Seri Detay — Tam Sayfa Sabit Arka Plan** (`components/SeriesDetailClient.js`, `app/series-detail.css`): Seri detay sayfasında kapak görseli artık tüm sayfanın arka planını kaplayabilir ve kullanıcı sayfayı kaydırırken görsel sabit kalır. Bu özellik admin panelinden açılıp kapatılabilir; blur miktarı (0–60px) ve karanlık örtü oranı (%0–%95) ayrı ayrı ayarlanabilir. Yeni ayarlar: `sd_fullpage_bg`, `sd_fullpage_bg_blur`, `sd_fullpage_bg_overlay`.

- **Sayfa Bazlı Arka Plan Yönetimi** (`components/PageBackground.js`, `app/layout.js`): Ana sayfa, arşiv/seri listesi, istekler, profil, sıralama ve tüm sayfalar için özel arka plan rengi, görsel URL'si ve blur miktarı admin panelinden ayarlanabilir. Sayfa özeli ayar yoksa "Tüm Sayfalar (Genel)" ayarı devreye girer. Görsel sayfayı kaydırırken sabit durur (`fixed` attachment).

- **Admin Paneli — Görünüm Geliştirmeleri** (`app/admin-panel/page.js`): Özelleştirme sekmesine iki yeni bölüm eklendi:
  - **Seri Detay Tam Sayfa Arka Plan**: Toggle + blur slider + karanlık örtü oranı slider'ı.
  - **Sayfa Arka Planları**: Ana sayfa, arşiv, istekler, profil, sıralama ve genel (fallback) için ayrı ayrı renk seçici, görsel URL girişi ve blur slider'ı.

### 🐛 Hata Düzeltmeleri

- **Profil Sayfası — Kapak Görseli Görünmüyor** (`app/profile/page.js`, `app/globals.css`): Kapak görseli ayarlanmasına rağmen banner'ın siyah görünmesi sorunu giderildi. `background-color: rgba(15,15,20,1)` değerinin `background-image` ile çakışması engellendi; görsel varken `prf-banner-has-cover` sınıfı eklenerek arka plan rengi şeffaflaştırılıyor. Banner overlay gradient'i hafifletildi (max opacity 0.88'e düşürüldü). Timestamp içeren cache-busting URL'sindeki olası boşluk karakteri sorunları `encodeURI()` ile giderildi.

- **Profil Sayfası — Manuel Kırpma Göz Ardı Ediliyordu** (`lib/imageOptimizer.js`, `app/api/auth/profile/avatar/route.js`, `app/api/auth/profile/cover/route.js`, `app/profile/page.js`): Kullanıcı kırpma diyaloğunda crop pozisyonunu `x:0, y:0, scale:1` olarak bırakıp kaydettiğinde sistemin "kırpma yok" olarak algılayıp otomatik ortalama kırpma yapması sorunu giderildi. `cropApplied: true` bayrağı eklendi: kullanıcı kaydet butonuna tıkladığında bu bayrak gönderilir ve `imageOptimizer` varsayılan değerlerde bile kullanıcının seçtiği kırpma uygulanır. Cover route'unda da crop parametreleri artık `parseFloat()` ile doğru şekilde parse ediliyor.

### 🔧 Teknik İyileştirmeler

- `components/SeriesDetailClient.js`: `getAppSettings` import'u dosyanın başına taşındı (ESLint `import/first` kuralı).
- `components/PageBackground.js`: `pageKey` ve `resolveVal` mantığı `useEffect` ile render kısmı arasındaki tutarsızlık giderildi; ortak `resolvePageKey` fonksiyonu çıkarıldı, `useMemo` ile performans iyileştirildi.

---

## [v2.9.4] — 2026-06-17 (Yetmiş Yedinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Build Hatası — middleware.js / proxy.js Çakışması** (`middleware.js` silindi, `proxy.js` güncellendi): Oluşturulan `middleware.js` dosyası mevcut `proxy.js` ile çakışarak build hatasına yol açıyordu. `middleware.js` kaldırıldı. Bakım modu ve `x-pathname` header mantığı, projenin asıl proxy dosyası olan `proxy.js` içinde güncellendi. `proxy.js` artık `admin` yanında tüm yerleşik yetkili rolleri (`manager`, `moderator`, `team_member`) ve bilinmeyen (custom) rolleri de bakım modu bypass kapsamına alıyor.

---

## [v2.9.3] — 2026-06-17 (Yetmiş Altıncı Yayın)

### 🐛 Hata Düzeltmeleri

- **Yorum Sabitleme Rozeti Tasarımı** (`components/CommentSection.js`): Sabitlenmiş yorum rozetinin kullanıcı adının altına düşmesi sorunu giderildi. Rozet artık her zaman kullanıcı adı ve yetkili rozetinin yanında, satır içinde gösteriliyor. CSS tasarımı iyileştirildi: daha kompakt görünüm, `flex-shrink: 0` ve `white-space: nowrap` ile kırılma engellendi. Ayrıca rozetin sıralaması da düzenlendi — "Sabitlendi" rozeti artık kullanıcı adından hemen sonra, saatten önce görünüyor.

- **Özel Yetkili Rol — Yetkili Rozeti** (`components/CommentSection.js`): Özel (custom) rolle atanmış kullanıcıların yorum yaparken "Yetkili" rozetinin görünmemesi sorunu giderildi. Bileşen artık `/api/admin/users?action=list-custom-roles` üzerinden özel rolleri çekiyor; custom role sahip kullanıcılar yorumlarında rol etiket adıyla yetkili rozeti alıyor. Sabitleme butonu ve yorum moderasyon menüsü de custom rolleri tanıyacak şekilde güncellendi.

- **Özel Rol — Yorum Şikayeti Görünmüyor** (`app/api/reports/comments/route.js`): `manage_comments` yetkisine sahip özel rollerin yorum şikayetlerini görememe ve yönetememesi sorunu giderildi. GET, PUT ve DELETE handler'larındaki sabit kodlanmış `['admin', 'manager', 'moderator']` kontrolleri, `hasPermission()` yetki fonksiyonuyla değiştirilerek özel roller de dahil edildi.

- **Özel Rol — Seri Silme Yetkisi** (`app/api/admin/route.js`): `manage_series` yetkisine sahip özel rollerin (sadece seri ekleme/düzenleme için verilen yetki) seri silebilmesi güvenlik açığı giderildi. `delete-series` işlemi artık yalnızca `delete_series` yetkisi olan kullanıcılara veya `admin`/`manager` rollerine izin veriyor; `manage_series` yetkisi seri silme yetkisi vermez.

- **Yorum Sabitleme API** (`app/api/comments/[id]/pin/route.js`): Sabitleme API'si `manage_comments` yetkisine sahip özel rolleri destekleyecek şekilde güncellendi. Artık `admin`/`manager` rolüne ek olarak, özel rollerde `manage_comments` yetkisi varsa sabitleme işlemi yapılabiliyor.

- **Bakım Modu Flash** (`app/layout.js`, `components/MaintenanceChecker.js`, `middleware.js`): Bakım modunda sayfa yenilendiğinde sitenin anlık görünüp kaybolması (flash) sorunu giderildi. Temel düzeltmeler:
  - `isAdminFromCookie` fonksiyonu `isStaffFromCookie` olarak yeniden adlandırıldı ve `admin` yerine tüm yetkili rolleri (`admin`, `manager`, `moderator`, `team_member`) ve özel rolleri tanıyor.
  - `MaintenanceChecker` bileşeni artık tüm staff rollerini ve özel rolleri kontrol ediyor; yalnızca `admin` rolü değil.
  - `middleware.js` oluşturuldu: her istekte `x-pathname` header'ı doğru şekilde set ediliyor. Bu sayede `layout.js`'in server-side bakım modu kontrolü tüm sayfalarda çalışıyor ve istemci taraflı flash oluşmuyor.

---

## [v2.9.2] — 2026-06-16 (Yetmiş Beşinci Yayın)

### 🐛 Hata Düzeltmeleri

- **İstekler Sayfası — Reddedildi Filtresi** (`app/requests/page.js`, `app/api/series-requests/route.js`): Reddedilen seri isteklerinin sayfada görünmemesi sorunu giderildi. API artık `rejected` statüsündeki istekleri halka açık listede gösteriyor; filtre sekmeleri arasına "Reddedildi" sekmesi eklendi. `pending` (bekleyen) istekler hâlâ yalnızca admin tarafından görülebilir.

- **Bölüm Zamanlama — Saat Dilimi Uyumsuzluğu** (`app/admin-panel/page.js`, `app/api/chapters/[id]/route.js`): `datetime-local` input'unun yerel saati alıp UTC karşılaştırmasına sokulmasından kaynaklanan timezone hatası düzeltildi.  
  - Admin panelinde bölüm eklerken seçilen yerel saat artık UTC'ye dönüştürülüp SQLite'a `YYYY-MM-DD HH:MM:SS` formatında yazılıyor.  
  - Bölüm okuma route'u ve admin paneli zamanlama göstergesi, saklanan tarihleri UTC olarak yorumlayıp kullanıcının yerel saatiyle doğru görüntülüyor.

---

## [v2.9.1] — 2026-06-16 (Yetmiş Dördüncü Yayın)

### 🐛 Hata Düzeltmeleri

- **Profil Kapak Görseli** (`app/profile/page.js`): Kapak fotoğrafı yüklendikten sonra sayfa yenilendiğinde görünmez olma sorunu giderildi. Banner'ın arka plan özellikleri (`backgroundSize`, `backgroundPosition`) artık inline stil olarak doğrudan uygulanıyor ve `last_cover_update` zaman damgasıyla cache-busting eklendi; tarayıcı önbelleğinden eski görüntünün gösterilmesi önlendi.

- **Mobil Navbar Kapatma** (`components/Navbar.js`, `app/globals.css`): Giriş yapmamış kullanıcıların mobil menüyü kapatamaması sorunu giderildi. Mobil menü paneline üst-sağ köşede belirgin bir ✕ kapatma butonu eklendi; menü artık hem overlay'e tıklayarak hem de bu butona tıklayarak kapatılabiliyor.

- **Son Güncellemeler Sayfalama** (`app/api/series/latest-updates/route.js`, `app/page.js`): Admin panelinde ayarlanan sayfa başına seri sayısının doğru çalışmaması sorunu giderildi. Yetişkin içerik filtresi artık istemci tarafında değil sunucu tarafında uygulanıyor; bu sayede API toplam sayıyı ve sayfa sayısını filtreye göre doğru hesaplıyor. `showAdult` durumu değiştiğinde veriler sayfa 1'den yeniden çekiliyor.

- **Hero Slider Durum Rozeti** (`components/HeroSliderWidget.js`): "Güncel" durumundaki serilerin rozetinde İngilizce "current" yazmasına neden olan eksik çeviri tamamlandı. `current` → "Güncel" ve `cancelled` → "İptal Edildi" çevirileri eklendi.

---

## [v2.9.0] — 2026-06-16 (Yetmiş Üçüncü Yayın)

### 🔒 Güvenlik & Risk Giderme (Kapsamlı Güvenlik Taraması)

#### 🔴 Aşama 1 — Rate Limit Eksiklikleri (Yüksek Öncelik)

8 korumasız endpoint'e rate limit eklendi:

- **`app/api/comments/[id]/reactions/route.js`**: POST için `createRateLimiter(30, 60000)` — dakikada 30 istek sınırı
- **`app/api/series-reactions/route.js`**: POST için `createRateLimiter(30, 60000)` — dakikada 30 istek sınırı
- **`app/api/favorites/route.js`**: POST için `createRateLimiter(20, 60000)` — dakikada 20 istek sınırı
- **`app/api/notifications/route.js`**: GET için `createRateLimiter(30, 60000)` — sürekli polling saldırısı engellendi
- **`app/api/users/[username]/route.js`**: GET için `createRateLimiter(20, 60000)` — brute-force username tarama engellendi
- **`app/api/users/badges/route.js`**: GET için `createRateLimiter(10, 60000)` — 8+ DB sorgusunu tetikleyen spam engellendi
- **`app/api/settings/route.js`**: GET için `createRateLimiter(30, 60000)` — cache bypass saldırısı engellendi
- **`app/series/[id]/page.js` — View Hash Düzeltmesi**: `getViewerHash` fonksiyonundan `User-Agent` çıkarıldı; artık yalnızca IP bazlı hash kullanılıyor. Farklı User-Agent header'larıyla view şişirme (trending manipülasyonu) saldırısı engellendi.

#### 🟠 Aşama 2 — Input Validasyon Eksiklikleri (Orta Öncelik)

- **Emoji uzunluk kontrolü** (`comments/[id]/reactions/route.js`, `series-reactions/route.js`): `emoji` alanı artık `typeof emoji !== 'string' || emoji.length > 10` kontrolünden geçiyor; 100KB'lık string ile DB şişirme saldırısı engellendi.
- **Seri istek alan uzunlukları** (`series-requests/route.js`): `series_title` (200), `description` (2000), `reason` (1000), `source_url` (500), `author` (200) karakter sınırları eklendi.
- **Admin note XSS koruması** (`series-requests/route.js`): `admin_note` artık `escapeHtml()` fonksiyonundan geçirilerek bildirim mesajına ekleniyor; HTML injection riski giderildi.

#### 🟡 Aşama 3 — Veri Temizliği / DB Sağlığı (Planlı)

`lib/db.js` — `migrateDatabase()` fonksiyonuna 5 tablo için otomatik retention sorguları eklendi; uygulama her başlatıldığında temizlik çalışır:

- `notifications`: 90 günden eski bildirimler siliniyor
- `quest_progress`: 30 günden eski görev kayıtları siliniyor
- `chapter_views_log`: 7 günden eski görüntüleme logları siliniyor (artık `series_views_log` ile uyumlu)
- `user_activity_log`: 30 günden eski aktivite logları siliniyor
- `site_traffic_log`: 7 günden eski trafik logları siliniyor
- SQLite WAL checkpoint: `PRAGMA wal_checkpoint(TRUNCATE)` — WAL dosyası şişmesi önleniyor

#### 🟢 Aşama 4 — İyileştirmeler (Uzun Vadeli)

- **Hata mesajı sanitize** (`comments/[id]/reactions/route.js`, `series-reactions/route.js`, `users/badges/route.js`): Production ortamında `error.message` yerine genel `'Internal server error'` döndürülüyor; stack trace / iç yapı sızıntısı önlendi.
- **DB Backup Script** (`backup.ps1`): Günlük SQLite backup için PowerShell scripti oluşturuldu. `sqlite3 .backup` komutu ile güvenli kopya alıyor, 30 günden eski backupları otomatik temizliyor. Windows Task Scheduler ile otomatik çalıştırılabilir.

### 📊 Güvenlik Durumu (Güncel)

| Kategori | Durum |
|----------|-------|
| SQL Injection | ✅ Korumalı |
| XSS | ✅ Korumalı |
| CSRF | ✅ Korumalı |
| Clickjacking | ✅ Korumalı |
| Auth/Authz | ✅ Korumalı |
| Rate Limiting | ✅ Tüm endpoint'ler korumalı |
| Input Validation | ✅ Emoji + alan uzunlukları eklendi |
| Data Retention | ✅ 5 tablo temizlik mekanizması eklendi |
| View Manipulation | ✅ IP bazlı hash ile engellendi |
| Backup | ✅ Script hazır |

---

## [v2.8.0] — 2026-06-16 (Yetmiş İkinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Admin Panel — Yorum Yönetimi Eksik Yorumlar Gösteriyordu**: Sitede 81 yorum görünürken admin panelindeki Yorum Yönetimi sekmesinde yalnızca 72 yorum listeleniyor, cevap yorumları görünmüyordu.
  - `app/api/admin/route.js`: `recentComments` sorgusundaki `WHERE (c.parent_id IS NULL OR ...)` filtresi kaldırıldı. Bu filtre, üst seviye olmayan (reply) yorumları yalnızca hata raporuyla ilişkiliyse gösteriyordu; dolayısıyla bağımsız cevap yorumları listede yer almıyordu. Artık tüm yorumlar (üst ve cevap dahil) doğru biçimde listeleniyor.
  - Sorgu limiti 200'den 500'e yükseltildi; büyük sitelerde daha fazla yorum yönetilebiliyor.
  - `parent_id` alanı sorgu sonucuna eklendi; yorum tipinin (üst/cevap) UI'da gösterilmesine olanak tanıyor.

- **Navbar — Mobil Menüde Giriş/Kayıt Butonları Çakışıyordu**: Giriş yapmamış kullanıcılar mobil menüyü açtığında "Giriş Yap" ve "Kayıt Ol" butonları üst üste binmiş, stil bozulmuş görünüyordu.
  - `components/Navbar.js`: Mobil menü butonlarına eklenen `style={{ padding: 0, color: 'inherit', background: 'none', border: 'none' }}` inline stil bildirimleri, `.mobile-nav-item` ve `.mobile-nav-signup` CSS sınıflarını geçersiz kılıyordu. Gereksiz inline stiller kaldırıldı; butonlar artık CSS sınıflarından doğru dolgu, renk ve boşluk değerlerini alıyor.

- **Profil Sayfası — Kapak Görseli Sayfa Yenilemede Kayboluyordu**: Kullanıcı profil kapak görseli yükliyor, anlık olarak görünüyor; ancak sayfa yenilendiğinde kapak görsel bölümü tasarımda kayboluyordu.
  - `app/api/auth/profile/cover/route.js`: Kapak URL'si veritabanına `?v=1234567890` zaman damgası sorgu parametresiyle kaydediliyordu. Dosya adı zaten `Date.now()` içerdiğinden bu parametre gereksizdi ve bazı tarayıcı önbellek davranışlarıyla çakışıyordu. Artık veritabanına yalnızca temiz URL (`/uploads/covers/filename.webp`) kaydediliyor; kapak görseli yenilemeden bağımsız olarak kalıcı biçimde görünüyor.

- **Google Search Console — Indexing API Eksik Arayüzü**: Google Indexing API (otomatik bölüm indeksleme) çalışmasına rağmen service account anahtarını yönetmek için admin panelde herhangi bir arayüz yoktu; anahtarın yüklenip yüklenmediği belli olmuyordu.
  - `app/api/admin/google-indexing/route.js`: Yeni endpoint oluşturuldu. GET ile anahtar varlığı ve servis hesabı e-postası sorgulanabiliyor; POST ile anahtar yükleme (`upload-key`), silme (`delete-key`) ve test indeksleme (`test-indexing`) işlemleri yapılabiliyor.
  - `app/admin-panel/page.js`: Özelleştir sekmesindeki Analitik bölümünün altına "Google Indexing API (Otomatik İndeksleme)" bölümü eklendi. Anahtar durumu (yüklü/yüklenmedi), servis hesabı e-postası, JSON anahtar dosyası yükleme butonu ve belirli bir URL için test indeksleme butonu bu bölümde yer alıyor.

### ✨ İyileştirmeler

- `app/api/admin/google-indexing/route.js`: `export const dynamic = 'force-dynamic'` eklendi; endpoint her istekte güncel dosya durumunu döndürüyor.

---

## [v2.7.0] — 2026-06-16 (Yetmiş Birinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Profil — Kapak/Avatar Kırpma Göz Ardı Ediliyordu**: Kullanıcının profil sayfasında manuel olarak yaptığı kırpma işlemi kaydedilmiyordu; sunucu her zaman otomatik ortalama kırpma uyguluyordu.
  - `lib/imageOptimizer.js — optimizeAvatar()`: Avatar optimizasyonu `cropX`, `cropY`, `cropScale` parametrelerini tamamen görmezden geliyordu. Fonksiyon, kullanıcının zoom ve konumlandırma verilerini dikkate alan tam kırpma desteğiyle yeniden yazıldı. Kırpma yoksa eski davranış korunuyor.
  - `lib/imageOptimizer.js — optimizeProfileCover()`: Kırpma yön işareti hatalıydı — kullanıcı sola sürüklediğinde görsel sağ tarafa kayıyordu. `extractLeft` ve `extractTop` formüllerindeki `+` işaretleri `-` olarak düzeltildi; artık önizlemede gördüğünüz ile kaydedilen görsel eşleşiyor.
  - `app/profile/page.js`: Kapak kırpma editörü önizlemesi statik önizlemeden farklı transform kullanıyordu (`translate(x, y)` yerine `translate(x*2, y*2)` olmalıydı). Crop editör transform backend ile uyumlu hale getirildi.

- **Özel Rol — İstek Yönetme Yetkisi Hesaptan Atıyordu**: `manage_requests` yetkisine sahip özel rol kullanıcıları "İstek Yönetme" sekmesine tıkladığında hesaptan çıkarılıyordu. Sorun: `app/api/series-requests/route.js` yalnızca `admin` ve `manager` rollerini kabul ediyor, 401 döndürüyordu; `authFetch` 401 alınca otomatik logout yapıyor. Düzeltme: `requireAuth` + `hasPermission(user, 'manage_requests', db)` kontrolü eklendi; yetkisiz erişimde 401 yerine 403 döndürülüyor (logout tetiklemiyor).

- **Özel Rol — Seri Ekleme Yetkisi Silinmesine de İzin Veriyordu**: `manage_series` (Seri Ekle/Güncelle) yetkisi verilen kullanıcılar seri silme işlemi de yapabiliyordu. Düzeltme:
  - `app/api/admin/route.js`: `delete-series` eylemi artık ayrı `delete_series` yetkisini kontrol ediyor. `manage_series` yalnızca ekleme ve güncelleme için geçerli; silme için ayrıca `delete_series` yetkisi gerekiyor.
  - Admin paneli zaten `delete_series` ve `manage_series` yetkilerini ayrı ayrı tanımlıyordu; backend artık buna uyum sağlıyor.

- **Özel Rol — `manage_chapters` / `upload_chapters` Uyumsuzluğu**: Admin paneli "Bölüm Yükle/Düzenle" yetkisini `manage_chapters` olarak kaydederken, backend `upload_chapters` kontrol ediyordu. Özel rol kullanıcıları bölüm yükleyemiyor ve scraper'ı kullanamıyordu.
  - `app/api/admin/route.js`: Bölüm eylemleri artık hem `upload_chapters` hem `manage_chapters` yetkisini kabul ediyor.
  - `app/api/admin/scrape/route.js`: POST ve GET handler'larına aynı çift kontrol eklendi.

- **Bakım Modu — Yönetici Girişi Butonu URL Değişiyor Ama Sayfa Değişmiyordu**: Bakım modundayken "Yönetici Girişi" linkine tıklandığında URL `/login` olarak değişiyor fakat sayfa bakım mesajında kalıyordu. Kök neden: `app/layout.js`, `x-pathname` request header'ını okuyarak bulunulan yolu tespit ediyordu; ancak bu header asla set edilmediğinden daima `/` değeri geliyordu ve layout her sayfayı bakım modu olarak işliyordu. Düzeltme: `middleware.js` oluşturuldu — her istek için `x-pathname` header'ı ilgili pathname değeriyle set ediliyor; artık `/login` rotası doğru şekilde tespit ediliyor ve login formu gösteriliyor.

### ✨ Yeni Özellikler & İyileştirmeler

- **Google Search Console Entegrasyonu**: Site Google'da daha hızlı indekslensin diye Google Search Console doğrulama desteği eklendi.
  - Admin Paneli > Özelleştir > Analitik bölümüne "Google Search Console Doğrulama Kodu" alanı eklendi.
  - `app/layout.js — generateMetadata()`: `google_site_verification` ayarı varsa `<meta name="google-site-verification" content="..." />` etiketi otomatik olarak `<head>`'e ekleniyor (Next.js `verification.google` metadata API kullanılarak).
  - Search Console'da "HTML etiketi" yöntemiyle alınan doğrulama değerini (sadece `content="..."` içindeki kısım) admin paneline girerek doğrulama tamamlanabiliyor.

---

## [v2.6.5] — 2026-06-15 (Yetmişinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Tekli Bölüm Yükleme — ERR_CONNECTION_CLOSED**: Admin panelinde tekli bölüm sayfası yüklerken (`upload-pages`) sunucu bağlantıyı kesiyordu ve `ERR_CONNECTION_CLOSED` hatası alınıyordu. Kök nedenler ve düzeltmeler:
  - `next.config.mjs`: `experimental.serverActions.bodySizeLimit` 50MB olarak eklendi — büyük manga sayfalarının istek boyutu limitini aşmasını önler.
  - `app/api/admin/route.js`: `maxDuration = 120` eklendi — yüksek çözünürlüklü görsel işleme (sharp WebP dönüşümü, watermark) sırasında sunucunun 30 saniyelik varsayılan zaman aşımına düşmesi engellendi.
  - `handleAddChapter`: Dosya yükleme döngüsü `try/catch` bloğuna alındı; her `fetch` çağrısı bağımsız hata yakalar, 3 ardışık hata sonrası kullanıcıya açıklayıcı mesaj gösterilir.
  - `handleUploadPages`: `fetch` çağrısı ağ hatalarına karşı korundu; sunucu JSON yerine hata sayfası döndürdüğünde `r.json()` çağrısından kaynaklanan ikincil kilitlenme giderildi.

---

## [v2.6.4] — 2026-06-15 (Altmış Dokuzuncu Yayın)

### 🎨 Tasarım Güncellemeleri

- **Bölüm Listesi — Hover Kenar Çizgisi Kaldırıldı**: Seri detay sayfasındaki bölüm kutularında hover sırasında sol kenarda çıkan accent bar (`::before` pseudo-element) kaldırıldı. Hover efekti artık sadece hafif arka plan parlaması + yukarı kayma animasyonuna indirgendi.
- **Profil Sayfası — Yeniden Tasarım**: Vortex Scans benzeri modern düzene geçildi. Tam genişlik kapak banner'ı eklendi; avatar banner'ın altına taşınarak yarı-çıkıntılı konumlandırıldı. Kullanıcı adı, rütbe rozeti, aktiflik günü ve özel rozetler banner altında yan yana gösteriliyor. XP barı profil bilgileri altına yerleştirildi. Hızlı istatistikler (Favori, Puan, Liste, Rozet) sağ köşede kart formatında; sekme navigasyonu yeni `prf-*` sınıflarıyla yeniden yazıldı. Mobil'de tek sütuna düşen akıllı responsive düzen uygulandı.
- **Manga Keşfet — Header Güncellemesi**: "Manga Keşfet" başlığı büyük glassmorphism kutusundan çıkarıldı; daha sade bir satır düzenine geçildi. Seri sayısı sağ üstte küçük bir etiket olarak gösteriliyor.
- **Seri Kart Tasarımı**: Kart arka planı daha şeffaf ve sade yapıldı (`::before` top shine ve `::after` gradient kaldırıldı). Hover efekti sadeleştirildi: 4px yukarı kayma + hafif shadow. Tür etiketleri daha sade border+background ile yenilendi.
- **Glass Series Grid**: Hover'da mor accent yerine nötr `rgba(255,255,255,0.15)` border rengi kullanılıyor; efekt daha ince ve tutarlı.

---

## [v2.6.3] — 2026-06-15 (Altmış Sekizinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Güncel Rozeti — Gri Renk**: `status-current` CSS sınıfı tanımsızdı; durum rozeti gri görünüyordu. `globals.css`'e `.status-current { background: rgba(6,182,212,0.18); color: #22d3ee; border: 1px solid rgba(6,182,212,0.35); }` kuralı eklendi — artık canlı cyan renkte görünüyor.

### ✨ Yeni Özellikler & İyileştirmeler

- **Bağış Barı — Geri Sayım**: Admin panelindeki Bağış Hedef Barı bölümüne "Geri Sayım Bitiş Tarihi" alanı eklendi (`datetime-local` input). Ayarlanan tarihe göre ana sayfadaki bağış afişinde kalan gün/saat/dakika kutu tasarımıyla gösteriliyor. Son 3 günde ikonlar, arka plan ve bar rengi otomatik olarak kırmızı/acil görünüme geçiyor. Süre dolunca "Kampanya süresi doldu" mesajı çıkıyor. Geri sayım her 30 saniyede bir güncelleniyor.
- **Seri Detay — Bölüm Listesi Yeniden Tasarımı**: Bölümler bölümündeki dış kapsayıcı kutu (glassmorphism arka plan, border, box-shadow) kaldırıldı; bölümler artık bağımsız kart görünümünde listelenip başlık kısmı çıplak görünüyor. Bölüm listesi 2 sütunlu grid'e geçirildi; her kart bağımsız border, border-radius ve hover animasyonu (yukarı kayma + shadow) içeriyor. Arama kutusu da dış kutu olmadan standalone kart stiline alındı. Mobilde tek sütuna düşüyor.

---

## [v2.6.2] — 2026-06-15 (Altmış Yedinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Admin Panel — Özel Rol Boş Sayfa**: Özel (custom) rol atanmış kullanıcılar profil sayfasındaki "Yönetim Paneli" bağlantısına tıkladığında boş sayfa görüyordu. Sorun, `app/admin-panel/page.js`'de yalnızca dört sabit yerleşik rolü (`admin`, `manager`, `moderator`, `team_member`) kabul eden erken `return null` kontrolünden kaynaklanıyordu. Kontrol artık `customRoles` state'ini de dikkate alıyor; özel rolle eşleşen kullanıcılar sayfaya erişebiliyor. Ayrıca `NAVS.filter` fonksiyonu güncellendi — özel rol kullananlar için her sidebar sekmesi, söz konusu rolün `permissions` dizisine göre (seri yönetimi, kullanıcı yönetimi, yorum moderasyonu, vb.) dinamik olarak gösteriliyor veya gizleniyor.
- **Seri Kartı — "current" Durumu İngilizce Görünüyordu**: `components/SeriesCard.js` içindeki `STATUS_TR` çeviri haritasında `'current'` anahtarı eksikti. Durumu "güncel" olarak ayarlanmış serilerin kapak kartlarında "current" yerine "Güncel" yazısı gösteriliyordu. Eksik `'current': 'Güncel'` girdisi eklendi.

---

## [v2.6.1] — 2026-06-15 (Altmış Altıncı Yayın)

### 🐛 Hata Düzeltmeleri

- **Login/Register Popup — Cloudflare Turnstile Hatası**: Navbar'daki glassmorphism popup modal'ında Turnstile (insan doğrulama) widget'ı gösterilmiyordu. `TurnstileWidget` bileşeni import edilip hem giriş hem kayıt formlarına eklendi. Artık popup'ta da doğrulama gösteriliyor ve `turnstileToken` doğru şekilde API'ye gönderiliyor.
- **Login Popup — Boş Token Hatası (400)**: Popup modal'dan giriş yapıldığında boş Turnstile token gönderiliyordu ve API 400 hatası veriyordu. `handleAuthLogin` ve `handleAuthRegister` fonksiyonları güncellendi — Turnstile yapılandırılmışsa token kontrolü yapılıyor.
- **Service Worker — Cache Hatası**: Chrome extension'lar gibi `chrome-extension://` URL'leri cache'lenmeye çalışılıyordu ve `TypeError: Failed to execute 'put' on 'Cache': Request scheme 'chrome-extension' is unsupported` hatası alınıyordu. `sw.js` dosyasına `url.protocol.startsWith('http')` kontrolü eklendi.
- **Mobil Menü — Z-Index Sorunu**: Mobil hamburger menü overlay ve panel'in z-index değerleri navbar ile çakışıyordu. Overlay `z-index: 999`, panel `z-index: 1000` olarak güncellendi.
- **Mobil Menü — Navbar Scroll Sonrası Sorunu**: Kullanıcı aşağı kaydırdığında navbar gizlense de mobil menü açık kalıyordu. Navbar `hidden` state'i değiştiğinde mobil menü otomatik olarak kapanıyor.
- **Mobil Menü — Konumlandırma**: Panel `top: 54px` yerine `top: 0` yapıldı ve padding ile navbar yüksekliği ayarlandı. Ayrıca `max-height: 80vh` ve `overflow-y: auto` eklendi.

---

## [v2.6.0] — 2026-06-15 (Altmış Beşinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Trend Olanlar — Takılma Sorunu**: Yana kaydırma animasyonu `scrollLeft` DOM limitlerine çarptığında takılan eski `requestAnimationFrame` tabanlı sistem kaldırıldı. Yerine CSS `@keyframes` ile `translateX(-50%)` döngüsü kullanılarak sonsuz, takılmasız marquee animasyonu eklendi. Kenarlarda fade (mask-image) efekti de mevcut.
- **Günlük Ödüller — Puan İsmi**: Ödül mesajı `+10 Yomi Puan!` yerine artık admin panelinden ayarlanan puan adını (`points_name` ayarı) dinamik olarak okuyor.
- **Rol Sistemi — Özel Roller**: `list-custom-roles` API endpoint'i artık sadece `admin/manager` yerine giriş yapmış tüm kullanıcılara açık. Özel role sahip kullanıcılar artık admin paneline erişebiliyor ve `/login`'e yönlendirilmiyor.
- **Rol Sistemi — Yetki Kontrolü**: `hasPermission` fonksiyonu artık özel (custom) rollerin DB'deki `permissions` dizisini okuyarak yetki kontrolü yapıyor. Özel rolle atanan yetkiler artık API seviyesinde de geçerli.
- **Zamanlı Bölüm — İptal Yok**: Admin panelinde zamanlanmış bölüm kartlarında artık tıklanabilir badge görüntüleniyor; onay sonrası `publish_at = NULL` yapılarak bölüm hemen yayınlanıyor. `update-chapter` API action'ı `publishAt` alanını ve `success: true` dönüşünü destekliyor.

### ✨ Yeni Özellikler & İyileştirmeler

- **Giriş/Kayıt — Glassmorphism Popup**: `/login` ve `/register` sayfaları ayrı sayfa yerine artık Navbar'dan açılan glassmorphism modal olarak görüntüleniyor. Backdrop blur, animasyonlu kart, tab geçişi (Giriş Yap ↔ Kayıt Ol) destekli. Sayfalar URL olarak hâlâ erişilebilir.
- **Seri Kartları — Durum Rozet Renkleri**: `hiatus` (Ara Verildi) için sarı, `cancelled` (İptal Edildi) için kırmızı durum badge renkleri ve ikonları eklendi. Tüm durumlar artık renkli ve ikonlu.
- **Profil — Genel Bakış**: "Kütüphanem" kartı kaldırıldı, yerine son okunan 5 bölümü gösteren interaktif "Okuma Geçmişi" kartı eklendi. "Tümünü gör →" bağlantısı ile `/gecmis` sayfasına yönlendiriyor.
- **Profil — Kırpma Sistemi**: Avatar ve kapak fotoğrafı kırpma arayüzü Discord benzeri sürükle-bırak sistemine geçirildi. Dairesel/dikdörtgen canlı önizleme üzerinde fare/dokunuş sürükleme ve scroll ile zoom destekleniyor. Scale için slider da mevcut.
- **Seri Detay — Bölümler Glassmorphism**: Bölüm listesi çerçevesiz glassmorphism tasarıma geçirildi. `backdrop-filter: blur(12px)` ile her satır; ilk/son satır için yuvarlatılmış köşeler, hover'da sol kenar çizgisi animasyonu ve yatay kaydırma. PC için geniş, mobil için ince görünüm.
- **Seri Detay — Etiketler Konumu**: "Etiketler" (SEO tag cloud) bölümü sayfanın en altına taşındı — bölüm listesi, yorumlar ve benzer seriler kısmından sonra görüntüleniyor.

---

## [v2.5.5] — 2026-06-14 (Altmış Dördüncü Yayın)

### 🐛 Hata Düzeltmeleri

- **Manga Keşfet — Filtreleme Bugları**: `clearFilters` fonksiyonunda `searchRef.current` sıfırlanmıyordu; temizleme sonrası debounce zamanlayıcısı eski aramayı tekrar tetikleyebiliyordu. Düzeltildi. Genre LIKE sorgusu artık JSON tırnak içi eşleşme (`%"GenreName"%`) kullanıyor — alt-string false-positive hataları giderildi. STATUS_TR map'ine 'current' (Güncel) eklendi.
- **Son Güncellemeler — Mobil Blur**: Yetişkin içerik bluru artık yalnızca `mounted` sonrası ve `s.is_adult === 1` (kesin tip kontrolü) olduğunda uygulanıyor. Auth yüklenme süreci tamamlanmadan blur gösterilmeyecek; giriş yapmış kullanıcılarda yanlış blur oluşmayacak.

### ✨ Yeni Özellikler

- **Seri Detay — Kapak Önizlemesi**: Seri detay sayfasındaki kapak görseline tıklanınca tam ekran lightbox açılıyor. Blur overlay, büyütülmüş görsel ve × kapatma butonu içeriyor. Dışarı tıklayarak da kapatılabiliyor.
- **Seri Detay — Bölümler Glassmorphism Grid**: Bölüm listesi yeniden tasarlandı; artık 3 sütunlu glassmorphism kart grid'i olarak gösteriliyor (tablet 2, mobil 1 sütun). Her kart: bölüm numarası, başlık, okunma sayısı ve tarih içeriyor. Opsiyonel thumbnail görseli de destekleniyor.
- **Bölüm Thumbnail — Küçük Görsel Desteği**: Admin panelinden bölüme thumbnail (küçük görsel) eklenebiliyor. İki mod: Manuel URL girişi veya Oto (seri kapağı kullanılır). `chapter_thumbnails_enabled` ayarı açıkken seri detay bölüm kartlarında görsel gösterilir.
- **Admin Paneli — Thumbnail Aç/Kapat**: Genel Ayarlar'a "Bölüm Küçük Görseli" bloğu eklendi; checkbox ile tüm seri detay sayfalarında thumbnail devre dışı bırakılabilir.
- **Veritabanı Migrasyonu**: `chapters` tablosuna `thumbnail_url TEXT` kolonu eklendi. `app_settings`'e `chapter_thumbnails_enabled` anahtarı eklendi (varsayılan: kapalı).

---

## [v2.5.4] — 2026-06-14 (Altmış Üçüncü Yayın)

### ✨ Yeni Özellikler & İyileştirmeler

- **Son Güncellemeler — 4 Bölüm**: Kartlarda en son 3 yerine 4 bölüm gösterilecek şekilde API güncellendi.
- **Son Güncellemeler — Rozet Tasarımı**: Tür etiketi (Manga/Manhwa vb.) kapak görselinin sol üstünde küçük yarı-şeffaf pill olarak konumlandırıldı. Durum etiketi ise kapak görselinin alt kenarına tam genişlikte renkli bir banner şeklinde eklendi — alt satıra geçme ve çakışma sorunları giderildi. Her durum için belirgin renk: Devam Ediyor yeşil, Tamamlandı mor, Ara Verildi sarı, İptal Edildi kırmızı, Güncel camgöbeği.
- **Son Güncellemeler — Sayfalama**: "Daha Fazla Güncelleme" butonu kaldırıldı, yerine sayfa numarası tabanlı sayfalama sistemi eklendi. Önceki / Sonraki butonları, sayfa numaraları ve "X / Y" göstergesi yer alıyor. Sayfa değiştiğinde ekran otomatik olarak bölümün başına kayıyor.
- **Admin Paneli — Sayfa Başına Seri Ayarı**: Genel Ayarlar bölümüne "Son Güncellemeler — Sayfa Başına Seri" ayarı eklendi. Admin buradan her sayfada kaç seri gösterileceğini belirleyebilir (4–64 arası, varsayılan 16). Değişiklik tüm kullanıcılar için anlık yansır.
- **Veritabanı Migrasyonu**: `app_settings` tablosuna `updates_per_page` anahtarı eklendi, varsayılan değeri `16`.

---

## [v2.5.3] — 2026-06-14 (Altmış İkinci Yayın)

### ✨ Yeni Özellikler & İyileştirmeler

- **PC Layout Genişletme**: Ana sayfa container genişliği 1320px'den 1560px'e çıkarıldı, kenar padding'i 24px'den 20px'e düşürüldü. Navbar ve footer da aynı genişlik değerlerini kullanacak şekilde güncellendi. Geniş ekranlarda "Son Güncellemeler" ve diğer içerikler için daha fazla alan açıldı.
- **Seri Durumu — Türkçe ve Yeni Seçenek**: Admin panelinde seri ekleme/düzenleme formundaki "Status" etiketi "Seri Durumu" olarak güncellendi. Durum seçenekleri Türkçeleştirildi: Ongoing → Devam Ediyor, Completed → Tamamlandı, Hiatus → Ara Verildi, Cancelled → İptal Edildi. Yeni "Güncel" (`current`) seçeneği eklendi.
- **Son Güncellemeler — Renk Kodlu Durum Etiketi**: Ana sayfadaki "Son Güncellemeler" kartlarında kapak görseli üzerindeki durum etiketi artık her duruma özel renk taşıyor. Devam Ediyor → yeşil, Tamamlandı → mor/mavi, Ara Verildi → turuncu, İptal Edildi → kırmızı, Güncel → camgöbeği. Durum etiketi tüm STATUS_TR mapleri (page.js, SeriesDetailClient.js) ile senkronize.
- **Seri Detay Sayfası — Durum Noktası Renkleri**: Seri detay sayfasındaki durum göstergesi yalnızca "ongoing/completed" yerine tüm durumları (`hiatus`, `cancelled`, `current`) ayrı renklerle destekliyor.

---

## [v2.5.2] — 2026-06-14 (Altmış Birinci Yayın)

### 🎨 Glassmorphism Tasarım Güncellemeleri

- **Okuyucu Destek Kartı (Bölüm Sonu)**: Tasarım tamamen elden geçirilerek, tüm temayla uyumlu `rgba(30, 30, 35, 0.6)` renk kodlu, blur ve modern gölgeler içeren Glassmorphism (Cam Efekti) yapısına kavuşturuldu.
- **Ana Sayfa "En Çok Okunanlar" Tasarımı**: Yenilikçi Glassmorphism tasarımı uygulandı. Listenin ilk elemanı büyük bir kapak fotoğrafı ve açıklama ile dikkat çekerken, diğer elemanlar daha minimal glassmorphism satırları halinde sıralanıyor.
- **Ana Sayfa Yeni Bölüm Kart Tasarımı**: Glassmorphism yapısına sadık kalarak kapak görseli sol tarafa, bölümler sağ tarafa hizalandı. Kapak üzerine transparan blur efektli etiketler (tür, durum) ve alt kısıma gradient üzerine başlık eklendi.
- **Yorum Bölümü Tasarımı**: Her yorum için ayrı ayrı glassmorphism kutusu tasarımı uygulandı. Yöneticilerin (Admin) yorumları için tasarıma uyumlu olacak şekilde, dikkat çekici ama göz yormayan kırmızımsı (`rgba(239, 68, 68, 0.15)`) bir cam efekti eklendi.

---

## [v2.5.1] — 2026-06-14 (Altmışıncı Yayın)

### 🧹 Tasarım Alternatifleri Kaldırıldı (Kod Temizliği)

- **Ana Sayfa Yeni Bölüm Kart Tasarımı**: 6 alternatif tasarımdan sadece **Glassmorphism (Cam Efekti)** bırakıldı. Kullanılmayan 5 component dosyası (`ClassicCard`, `CosmicTearCard`, `SkillTreeCard`, `HoloUpdateCard`, `CinematicCard`, `NeonPulseCard`) silindi. `app/page.js` import listesi ve `CardComponent` seçimi sadeleştirildi.
- **Ana Sayfa "En Çok Okunanlar" Tasarımı**: 5 alternatiften sadece **Kademeli Cam (Glass Steps)** bırakıldı. `MostReadWidget.js` içindeki ClassicMR, GoldenCrownMR, CyberpunkMR, AnimeMinimalistMR variant fonksiyonları ve kullanılmayan ikon bileşenleri kaldırıldı.
- **Ana Sayfa "Şu Anda Trend Olanlar" Tasarımı**: 5 alternatiften sadece **Cam Küp 3D (Glass 3D)** bırakıldı. `TrendingWidget.js` içindeki ClassicTrending, NeonTrending, BannerTrending, FlameTrending variant fonksiyonları ve `renderCard` switch ifadesi kaldırıldı.
- **Ana Sayfa "Ana Slider" (Popüler Seriler) Tasarımı**: 5 alternatiften sadece **Kademeli Yükseliş (Cascading Steps)** bırakıldı. `HeroSliderWidget.js` içindeki ClassicHero, CinemaHero, HoloHero, CyberpunkHero variant fonksiyonları ve switch ifadesi kaldırıldı.
- **Seri Detay Sayfası Tasarımı**: 5 alternatiften sadece **Klasik Parallax (Mevcut Görünüm)** bırakıldı.
- **Yorum Bölümü Tasarımı**: 5 alternatiften sadece **Klasik (Asura Style)** bırakıldı. `CommentSection.js` içindeki kullanılmayan style2–style5 CSS blokları (~200 satır) kaldırıldı.
- **Admin Paneli**: Tüm 6 tasarım seçim dropdown'u, sadece kalan tek seçeneği gösterecek şekilde güncellendi; gereksiz seçenekler silindi.

---

## [v2.5.0] — 2026-06-14 (Elli Dokuzuncu Yayın)

### ✨ Yeni Özellikler

- **Okuyucu Destek Kartı (Reader Support Card)**: Bölüm okuma sayfasının en altına, son görselden sonra glassmorphism tasarımlı bir destek kartı eklendi. Koyu tema ile uyumlu, mor/lacivert tonlarda, yuvarlatılmış köşeli ve blur efektli kart; okuyucuları projeye destek olmaya davet eden bir metin ve "Destek Ol" butonu içeriyor. Webtoon, Manga ve Novel olmak üzere tüm okuma modlarında çalışıyor.
- **Admin Paneli — Destek Kartı Özelleştirmesi**: Admin panelinin "Genel Ayarlar" bölümüne "Okuyucu Destek Kartı" alt bölümü eklendi. Kartın açılıp kapatılması, görünen metnin düzenlenmesi, buton metni ve buton URL'si admin panelden yönetilebiliyor. Değişiklikler anlık olarak yansıyor.
- **Veritabanı Migrasyonu**: `app_settings` tablosuna `reader_support_enabled`, `reader_support_text`, `reader_support_url` ve `reader_support_button_text` anahtarları eklendi. Varsayılan değerler ile gelir; mevcut kurulumlar otomatik olarak güncellenir.

---

## [v2.4.9] — 2026-06-14 (Elli Sekizinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Yorum Şikayetleri — Kutu Görünümü → Liste Formatı**: Admin paneldeki yorum şikayetleri kare kutu (grid) şeklinde gösteriliyordu; karmaşık ve taraması zordu. Liste formatına dönüştürüldü; her rapor tek satırda, durum, içerik ve işlemler yan yana gösteriliyor.
- **Yorum Şikayetleri — Rapor Silme Eksikliği**: Şikayet kartlarında yalnızca "Çöz", "Reddet" ve "Yorumu Sil" butonları vardı; raporun kendisini silme seçeneği yoktu. Hem aktif hem çözülmüş/reddedilmiş raporlar için "Raporu Sil" butonu eklendi. `/api/reports/comments` endpoint'ine DELETE handler'ı eklendi.
- **Yorum Moderasyon — Toplu/tekli Seçim Çalışmıyor**: Yorum tablosundaki checkbox'lar hiç çalışmıyordu; state yönetimi ve olay işleyicisi yoktu. `selectedComments` state'i eklendi, header checkbox'ı "tümünü seç/bırak" işlevi yapıyor, satır checkbox'ları tekil seçim sağlıyor. Seçili yorumlar vurgulanıyor. Toplu silme butonu ile birden fazla yorum aynı anda silinebiliyor.
- **Layout.js — Sunucu Hatası Düzeltildi**: `lib/serverSettingsCache.js` modülü ile yapılan deneme, layout.js'in modül import yapısını bozuyordu ve 500 sunucu hatasına neden oluyordu. Bu modül kaldırıldı ve layout.js orijinal in-memory cache yapısına geri döndürüldü. Settings API normal şekilde çalışıyor.

---

## [v2.4.8] — 2026-06-14 (Elli Yedinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Manga Modu — Yorumlar Görünmüyor**: Manga modunda okuma yaparken yorum bölümü hiç render edilmiyordu. Webtoon ve Novel modlarında yorumlar gösterilirken Manga modunda eksikti. Manga moduna da CommentSection eklendi.
- **Manga Modu — Navigasyon Ters**: Manga modunda RTL (sağdan sola) yönde sol tıklama "sonraki" sayfaya, sağ tıklama "önceki" sayfaya götürüyordu; kullanıcının beklediği davranışın tam tersi. RTL modunda sol=önceki, sağ=sonraki olarak düzeltildi. LTR modu da buna uygun güncellendi.
- **Özel Roller — Admin Paneli Erişimi**: Oluşturulan özel roller, Navbar'daki yönetim paneli linkinde ve admin paneli erişim kontrolünde tanınmıyordu. Navbar ve admin paneli artık custom_roles ayarından dinamik olarak rol isimlerini çekip erişim kontrolünü buna göre yapıyor. Özel role sahip kullanıcılar hem Navbar'da Yönetim Paneli bağlantısını görüyor hem de panele erişebiliyor.
- **Kapak Resmi — Kaydet Sonrası Geri Dönme**: Profil sayfasında kapak resmi kaydedildikten sonra sayfa yeniden render olduğunda cover_url eski haline dönüyordu. saveCover fonksiyonu API yanıtından gelen yeni cover_url'yi updateUser ile hemen state'e yazacak şekilde güncellendi. Ayrıca API'den dönen cover URL'sine cache-breaker eklendi.
- **Kapak Resmi — Mobil Uyumluluk**: Profil sayfasındaki RPG profil başlığının cover görseli mobilde ekrana sığmıyordu. CSS'de `.rpg-profile-header` için `background-size: cover`, `background-position: center` ve mobil responsive düzenlemeler eklendi.
- **Favicon — Tarayıcıda Görünmüyor**: Favicon URL'lerine query string eklenmeden önce base URL oluşturuluyordu; bazı tarayıcılar URL formatını düzgün çözümleyemiyordu. URL yapısı düzeltildi: base URL önce oluşturuluyor, sonra cache-breaker `?v=` eki ekleniyor. Ayrıca ICO, GIF, SVG gibi formatlar için doğru MIME type belirleme eklendi.
- **Kullanıcı Profili — Kendi Profilimize Yönlendirme**: Yorumlardan bir kullanıcı profiline tıkladığımızda basit bir kullanıcı kartı gösteriliyordu. Artık kendi profilimize tıkladığımızda `/profile` sayfasına yönlendirme yapılıyor (kendi profilimizi tam detaylı görüyoruz).
- **Kütüphane — Bırakıldı Sekmesi Eksik**: Profil sayfasındaki Kütüphane sekmesinde "Okuyor", "Tamamlandı", "Okuyacak" sekmeleri vardı ama "Bırakıldı" (dropped) sekmesi yoktu. Yeni sekme eklendi; bırakılan seriler artık profil listesinde görüntüleniyor.

---

## [v2.4.7] — 2026-06-13 (Elli Altıncı Yayın)

### ⚡ Performans Optimizasyonları

- **Browser Cache Kırılması Düzeltildi** (`app/layout.js`): Favicon, logo ve icon URL'lerinde `Date.now()` kullanılıyordu. Bu her SSR isteğinde yeni bir URL üretip tarayıcının bu varlıkları hiç cache'lememesine yol açıyordu. `SERVER_START_VER` (sunucu başlangıcında bir kez üretilen base36 timestamp) ile değiştirildi. Artık tarayıcı ikonları cache'ler; yeni deployment'ta sunucu yeniden başladığında URL değişip cache bozulur.
- **Site Ayarları In-Memory Cache** (`app/layout.js`): `getSiteSettings()` her SSR isteğinde `app_settings` tablosunun tamamını okuyordu. 60 saniyelik TTL'li in-memory cache eklendi. 60 saniyede bir DB sorgusu yapılır, arada tüm istekler cache'ten karşılanır.
- **Paylaşılan Client Settings Cache** (`lib/settingsCache.js`): `SeriesDetailClient` ve `CommentSection` bileşenleri her mount'ta `/api/settings`'e ayrı ayrı istek atıyordu. Yeni `lib/settingsCache.js` modülü ile aynı sekme oturumunda tek bir fetch yapılır; sonuç tüm bileşenler arasında paylaşılır.
- **`/api/settings` Cache-Control** (`app/api/settings/route.js`): `no-store` yerine `public, max-age=30, stale-while-revalidate=60` kullanıldı. Tarayıcı 30 saniye boyunca ağ isteği yapmadan cache'ten okur.
- **Next.js Config Optimizasyonları** (`next.config.mjs`): Üretimde `removeConsole` eklendi (hata/uyarı logları korunur, gereksiz debug log'lar bundle'dan çıkar). `deviceSizes` ve `imageSizes` dizileri kullanılan breakpoint'lere göre sadeleştirildi. Public statik dosyalar (icon, font, görsel) için 7 günlük Cache-Control header eklendi.

### 🐛 Hata Kontrolü

- Son değişikliklerin tamamı (`a711517..`) gözden geçirildi; ek sorun tespit edilmedi.

---

## [v2.4.6] — 2026-06-13 (Elli Beşinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Yorum Şikayetleri — Admin Panelde Görünmüyor**: `app/api/reports/comments/route.js` dosyasında GET ve PUT handler'larında `getVerifiedUser(request)` çağrısı yapılıyordu. Bu fonksiyon ikinci parametre olarak `db` instance'ı gerektiriyor (`getVerifiedUser(request, db)`); eksik parametre nedeniyle fonksiyon içinde `db.prepare()` çağrısı `TypeError: Cannot read properties of undefined` hatası fırlatıyordu. Hata try/catch tarafından yakalanarak 500 döndürülüyordu; sonuç olarak admin paneli yorum şikayetlerini hiç yükleyemiyor ve durum güncellemesi yapamıyordu. Her iki handler'da da `db` parametresi eklenerek düzeltildi.

---

## [v2.4.5] — 2026-06-13 (Elli Dördüncü Yayın)

### 🐛 Hata Düzeltmeleri

- **SeriesCard — 18+ Rozet Konumu**: Yetişkin içerik rozetleri `.series-card-overlay` div'inin içinde `position: absolute` ile yanlış konumlanıyordu; overlay sağ üst köşede konumlandığından rozet kartın dışına taşıyordu. Rozet `.series-card-image` container'ına taşındı ve `z-index: 3` ile doğru pozisyon sağlandı.
- **SeriesCard — Bölüm Sayısı 0 Gösterimi**: `||` operatörü kullanımı nedeniyle bölüm sayısı gerçekten `0` olduğunda da fallback'e düşüp `0 bölüm` gösteriliyordu. `??` (nullish coalescing) operatörüne geçildi. Artık veri yoksa span hiç gösterilmiyor, bölüm sayısı 0 ise "Bölüm yok" yazıyor, pozitif sayıda ise `N bölüm` gösteriliyor.
- **Related Series — `is_adult` Eksikliği**: `app/series/[id]/page.js` ve `app/api/series/similar/route.js` dosyalarındaki ilgili seri SQL sorgularında `is_adult` kolonu seçilmiyordu. Bu nedenle "Bunları da Beğenebilirsiniz" bölümündeki yetişkin seriler için 18+ rozeti ve blur efekti hiç gösterilmiyordu. Her iki sorguya da `is_adult` alanı eklendi.

### 🔍 Kritik SEO Hatası Düzeltmesi

- **Bölüm Sayfaları noindex Hatası**: `app/seri/[id]/bolum/[chapterNumber]/layout.js` dosyasında `chapters` tablosuna yapılan sorgularda `AND published = 1` filtresi kullanılıyordu. Ancak bu tablo `published` kolonuna sahip değil — SQLite "no such column" hatası fırlatıyor, try/catch bunu yakalayıp `{ robots: { index: false } }` döndürüyordu. Sonuç olarak **tüm bölüm sayfaları noindex** oluyor ve Google tarafından indexlenmiyordu. `AND published = 1` filtresi her iki sorgudan kaldırıldı.

### 🔍 SEO İyileştirmeleri

- **Sitemap URL Tutarlılığı**: `app/sitemap.xml/route.js` dosyasında seri sayfaları için `/seri/[slug]` URL'leri kullanılıyordu. Canonical tag'ler ise `/series/[slug]` işaret ettiğinden sitemap ile canonical arasında duplicate content riski oluşuyordu. Sitemap'teki seri URL'leri `/series/[slug]` olarak güncellendi.
- **Robots.txt Wildcard Kuralları**: `app/robots.js` dosyasında yalnızca `/series/` ve `/seri/` prefix'leri allow listesindeydi; alt sayfalar için açık wildcard yoktu. `'/series/*'` ve `'/seri/*'` kuralları eklendi.
- **ComicSeries Schema Zenginleştirme**: `app/series/[id]/layout.js` dosyasındaki JSON-LD şemasına eksik alanlar eklendi: `inLanguage: "tr"` (dil bilgisi), `numberOfEpisodes` (DB'den canlı bölüm sayısı), `datePublished` (seri oluşturma tarihi), `dateModified` (son bölüm ekleme tarihi), `alternateName` (alt adlar varsa dizi olarak). Google Structured Data zenginliği arttı.
- **OG Description'a Alt Adlar**: Seri detay sayfasının Open Graph `description` alanına, seri alternatif adları (alt_names) varsa `Diğer adlar: ...` şeklinde ekleniyor. Arama sonuçlarında önizleme metni daha bilgilendirici hale geldi. Alt adlar aynı zamanda keywords listesine de eklendi.

---

## [v2.4.4] — 2026-06-13 (Elli Üçüncü Yayın)

### 🐛 Hata Düzeltmeleri

- **Yorum Şikayetleri — Admin Panel Görünmüyor**: Yorum şikayetleri admin paneldeki Yorumlar sekmesinde görünmüyordu. `app/api/reports/comments/route.js` ve `app/admin-panel/page.js` dosyalarına debug logları eklendi ve hata yakalama bloğu iyileştirildi.
- **Kullanıcı Profil Linki — Tıklanamıyor**: Yorumlarda kullanıcı adına tıklandığında profil sayfasına gidilemiyordu. `components/CommentSection.js` dosyasına `Link` import'u eklendi ve kullanıcı adı tıklanabilir hale getirildi.
- **Router Tanımlanmamış Hatası**: `CommentSection.js` bileşeninde `router.push('/login')` çağrısı yapılıyordu ama `useRouter` import edilmemişti. Hook import edildi ve bileşen içinde kullanıma hazır hale getirildi.

### ✨ Yeni Özellikler

- **Kullanıcı Profil Sayfası**: `/user/[username]` rotası eklendi. Bu sayfa herhangi bir kullanıcının profil bilgilerini (avatar, rol, puan, favori sayısı, yorum sayısı, katılım tarihi) herkesin görebilmesini sağlıyor.
- **Seri İstekleri — Admin Onayı Zorunlu**: Seri istekleri artık admin tarafından onaylanana kadar herkese görünmüyor. Yalnızca `reviewing`, `approved` ve `added` durumlarındaki istekler herkese açık. Bekleyen (`pending`) istekler sadece isteği gönderen kullanıcı ve adminler tarafından görülebilir.
- **Kullanıcı Kendi Taleplerini Görebilir**: `/requests` sayfasında giriş yapmış kullanıcılar artık kendi tüm taleplerini (bekleyen, onaylanan, reddedilen vb.) "Taleplerim" başlığı altında görebilirler.

---

## [v2.4.3] — 2026-06-13 (Elli İkinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Rol Yönetimi — Custom Rol Atanamıyordu**: Admin panelinde custom rol oluşturulduktan sonra kullanıcıya atama yapılıp onaylandığında rol atanmıyordu. `app/api/admin/route.js` dosyasında `change-user-role` action'ı yalnızca built-in rolleri destekliyordu. Artık custom rolleri de veritabanından okuyarak atama yapılabiliyor.
- **Kapak (Cover) Kırpma Sorunu**: Profil kapak görseli kırpılırken önizleme ile kaydedilen görsel arasında yön uyumsuzluğu vardı. `lib/imageOptimizer.js` dosyasındaki `optimizeProfileCover` fonksiyonunda `extractLeft` ve `extractTop` hesaplamalarındaki işaretler düzeltildi.
- **Favicon — Çift Tanım Sorunu**: `app/layout.js` dosyasında favicon hem `generateMetadata()` içinde hem de `<head>` bölümünde tanımlanıyordu. Bu çakışma bazı tarayıcılarda favicon'un görünmemesine neden olabilirdi. `<head>` içindeki favicon `<link>` etiketleri kaldırıldı; artık yalnızca `generateMetadata()` üzerinden yönetiliyor.
- **WebP Kalite Kaybı**: Seri sayfa görselleri zaten WebP formatında yüklendiğinde tekrar WebP'ye dönüştürülüyor ve bu kalite kaybına neden oluyordu. `lib/imageOptimizer.js` dosyasındaki `isWebPAlreadyOptimized` fonksiyonu ve `optimizeChapterPage` fonksiyonları güncellendi. Artık zaten WebP olan ve boyutları uygun görseller doğrudan kopyalanıyor, yeniden kodlanmıyor.

### ✨ Yeni Özellikler

- **Pop-up Bildirim — Cam Efekti Tasarımı**: `components/PopupAlert.js` tamamen yeniden tasarlandı. Glassmorphism (cam efekti) tasarımı eklendi: blur efektleri, shimmer çizgileri, gradient parlamalar, modern shadow efektleri ve yumuşak animasyonlar.
- **Pop-up — Gösterim Aralığı Ayari**: Pop-up artık her seferinde çıkmak yerine belirli aralıklarla gösterilebilir. Admin panelinde yeni "Gösterim Aralığı" seçeneği eklendi: "Her Zaman", "Günde Bir", "3 Saatte Bir", "Saatte Bir", "Oturum Başına Bir". `alert_popup_interval` ayarı `localStorage` ile takip ediliyor.
- **Pop-up — Admin Panelinde Gizleme**: Pop-up artık admin panelinde görünmüyor. `window.location.pathname` kontrolü ile `/admin-panel` sayfalarında pop-up otomatik olarak gizleniyor.
- **Yeni Bölüm Bildirimi**: Bir seriye yeni bölüm eklendiğinde artık favorilerine ekleyen veya okuma listesine ekleyen tüm kullanıcılara bildirim gönderiliyor. `app/api/admin/route.js` dosyasındaki `add-chapter` action'ına bildirim mantığı eklendi.
- **Yorum Yanıtı — Doğru Link**: Yorum yanıtı bildirimlerinde artık doğru link oluşturuluyor. Bölüm yorumları için `/seri/{slug}/bolum/{chapter}#comment-{id}` formatında, seri yorumları için `/seri/{seriesId}#comment-{id}` formatında link veriliyor.
- **Yorum Şikayet Bildirimi**: Bir yorum şikayet edildiğinde yorum sahibine bildirim gönderiliyor. Şikayet yönetici tarafından çözüldüğünde veya reddedildiğinde de raporu gönderen kullanıcıya bildirim gidiyor.
- **Bildirim İkonları**: Navbar'daki bildirim dropdown'unda artık farklı bildirim türleri için farklı ikonlar gösteriliyor: yorum yanıtı (mesaj), yeni bölüm (kitap+artı), şikayet (uyarı), şikayet çözüldü/reddedildi (uyarı+onay/red), hata raporları (kalkan).

---

## [v2.4.2] — 2026-06-13 (Elli Birinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Yorum Bildirimi — Token Eksikliği**: `handleReportSubmit` fonksiyonu düz `fetch` kullanıyordu; JWT token başlığı (`Authorization`) gönderilmediğinden `/api/reports/comments` her zaman 401 döndürüyor ve bildirim kaydedilmiyordu. `authFetch` ile değiştirildi. Aynı zamanda kullanıcının yazdığı ek detay (`reportDetails`) da API'ye iletilmiyordu, bu da düzeltildi.

---

## [v2.4.1] — 2026-06-13 (Ellinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Favicon — MIME Tipi Hatası**: `<link rel="icon">` etiketi daima `type="image/x-icon"` kullanıyordu. PNG olarak yüklenen favicon dosyaları bu yüzden bazı tarayıcılarda uygulanmıyordu. Artık dosya uzantısına göre doğru MIME tipi (`image/png`, `image/webp`, `image/svg+xml`, `image/x-icon`) atanıyor.
- **Favicon — Otomatik Kaydetme**: Admin panelinde favicon yüklemesi yapıldığında URL yalnızca yerel state'e yazılıyordu; kullanıcının ayrıca "Özelleştirmeyi Kaydet" butonuna basması gerekiyordu. Artık yükleme tamamlandığında URL `/api/admin/settings`'e otomatik olarak kaydediliyor. Logo ve OG görseli için de aynı iyileştirme geçerli.
- **Profil Resmi Limiti — Sayaç Sıfırlanma Hatası**: `refreshUser()` çağrısı `/api/auth/me` endpoint'ini tetikliyordu ve bu endpoint `avatar_changes_today` / `cover_changes_today` sütunlarını döndürmüyordu. Sonraki render'da bu alanlar `undefined` olduğundan `|| 1` fallback devreye giriyor ve her zaman "1 değişiklik hakkı kaldı" gösteriyordu. `/api/auth/me` SELECT sorgusuna eksik sütunlar eklendi.
- **Profil Resmi Limiti — Fallback Mantığı**: `canUpdateAvatar()` ve `canUpdateCover()` fonksiyonlarında `user.avatar_changes_today || 1` ifadesi, değer `0` (henüz kullanılmamış) olduğunda yanlışlıkla `1` döndürüyordu. `?? 0` (nullish coalescing) ile düzeltildi; `0` değeri artık doğru şekilde "henüz kullanılmadı" anlamına geliyor.

---

## [v2.4.0] — 2026-06-13 (Kırk Dokuzuncu Yayın)

### ✨ Yeni Özellikler

- **Özelleştirilebilir Uyarı Popup'ı**: Admin paneli → Reklamlar sekmesine yeni "Uyarı Popup'u" bölümü eklendi. Adblock uyarısı, ekip alımı, duyuru vb. için iki farklı tasarım tipi (Adblock tarzı / Özel) mevcuttur. Başlık, mesaj, ikon/emoji, arka plan rengi, "Geç" butonunun gecikmesi (X saniye, ayarlanabilir), bağlantı butonu (URL, etiket, yeni sekme), oturum başına bir kez gösterme seçeneği tamamen özelleştirilebilir. `components/PopupAlert.js` yeni client bileşeni oluşturuldu, `app/layout.js`'e eklendi.
- **Bölüm Sayfaları — Tekil Görsel Silme**: Admin panelinde bir bölümün sayfaları açıldığında artık her görselin üzerine gelindiğinde kırmızı çöp kutusu butonu görünüyor. Tek tek sayfa silinebilir, bölümün tamamını silmek gerekmez. `deleteChapterPage()` fonksiyonu eklendi, mevcut `delete-page` API action'ı kullanılıyor.

### 🐛 Hata Düzeltmeleri

- **Yorum Şikayetleri — Hata Bildirimleri Karışıklığı**: Kullanıcılar bir yorumu şikayet ettiğinde rapor, admin panelinin "Hata Bildirimleri" sekmesinde görünüyordu. `/api/admin/reports` GET endpoint'i artık `type = 'comment_report'` kayıtlarını hariç tutuyor; yorum şikayetleri yalnızca "Yorumlar" sekmesindeki "Yorum Şikayetleri" bölümünde listeleniyor.
- **Yorum Şikayetleri — Yorumu Sil Aksiyonu**: Yorum şikayet kartlarına "Yorumu Sil" butonu eklendi. Şikayet edilen yorumu doğrudan şikayet kartından silebilir, ardından rapor otomatik olarak "Çözüldü" durumuna geçer.

---

## [v2.3.0] — 2026-06-12 (Kırk Sekizinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Slider Cam Küp (Glass3D) — Alt Siyah Boşluk**: `trend_style4` (Cam Küp 3D) kartında görsel container'ına uygulanan `position: relative` inline style CSS class'ını (`.tg-bg { position: absolute }`) eziyordu, bu da görüntünün konteyneri tam kaplayamamasına ve alt kısımda `background: #111` olan siyah boşluğun görünmesine neden oluyordu. İnline style kaldırıldı.
- **Son Güncellemeler Renk Ayarları**: Admin panelinden yapılan başlık rengi, kart arka plan ve kenarlık rengi değişiklikleri artık tüm kart tiplerini kapsıyor. Önceden yalnızca `holo-card` ve `asura-card` CSS sınıfları hedefleniyordu; şimdi `glass-card`, `cosmic-card`, `cinematic-card` ve `skill-tree-card` sınıfları da dahil edildi.
- **Bakım Modu — SPA Navigasyon Sorunu**: Next.js client-side navigasyonu sırasında (Link tıklama) bakım modu kontrolü yapılmıyordu, F5 basılmadıkça kullanıcı sitede gezinebiliyordu. Yeni `MaintenanceChecker` client bileşeni eklendi; her route değişiminde `/api/maintenance-status` endpoint'ini kontrol ediyor ve bakım modu aktifse kullanıcıyı `/maintenance` sayfasına yönlendiriyor.

### ✨ İyileştirmeler

- **Yorum Şikayetleri — Admin Paneli**: Yorum şikayetleri artık admin panelindeki "Yorumlar" sekmesinde görünüyor. Şikayetler durumlarına göre (Beklemede / Çözüldü / Reddedildi) renklendirilmiş; tek tıkla durumu güncellenebilir. Yenile butonu ile anlık senkronizasyon sağlandı.
- **Özel Roller — Kullanıcı İşlemlerinde Görüntüleme**: Admin paneli kullanıcı tablosunda rol badge'i artık özel roller için de doğru etiketi ve rengi gösteriyor. Sabit `'Kullanıcı'` fallback yerine `customRoles` dizisinden dinamik lookup yapılıyor.
- **Özel Roller — Aktivite Paneli Rol Etiketi**: Kullanıcı aktivite panelinde görünen rol adı da hardcoded map yerine `customRoles`'dan besleniyor; özel rol atamaları doğru şekilde yansıtılıyor.
- **Custom Body JS**: Admin panelinin "Gelişmiş Ayarlar" bölümüne yeni "Body JS" alanı eklendi. Analytics, chat widget veya özel JavaScript kodları `<body>` sonuna enjekte edilebiliyor. CSS alanından ayrı tutularak daha net bir yapı sağlandı.
- **Serileri Keşfet Kartları**: Seri kartları daha modern görünüm kazandı. Hover animasyonunda üst parlama çizgisi ve alt gradient efekti eklendi. Kart body'si derinleştirilmiş gradient arka plana sahip oldu, hover'da daha koyu ton geçişi uygulandı.
- **Günlük Görevler Scroll Bar**: Görev listesi maksimum yüksekliği 480px'den 360px'e indirildi, smooth scroll eklendi; görev sayısı fazla olduğunda liste daha kompakt görünüyor.
- **Yorum Raporlama**: Mevcut rate limit sistemi (60 saniye, 10 rapor) korundu; aynı yorumu 1 saat içinde tekrar raporlama engeli de aktif.

---

## [v2.2.9] — 2026-06-12 (Kırk Yedinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Favicon Geçersiz Kılma Sorunu**: Next.js, `app/favicon.ico` dosyasını metadata API'den bağımsız olarak otomatik servis ediyor ve özel favicon ayarını ezmesine neden oluyordu. `app/favicon.ico` dosyası kaldırıldı; artık yalnızca admin panelinden yüklenen favicon kullanılıyor.
- **Yorum Raporlama API**: Yorum raporları için ayrı bir API endpoint'i (`/api/reports/comments`) eklendi. Raporlar `bug_reports` tablosunda `type='comment'` olarak saklanıyor.
- **Admin Rapor Tablosu — Tür Kolonu**: Admin panelindeki rapor tablosuna "Tür" kolonu eklendi. Yorum raporları pembe badge ile, genel hata raporları mor badge ile gösteriliyor.
- **DB Migrasyonu**: `bug_reports` tablosuna `type` (TEXT, varsayılan `'bug'`) ve `comment_id` (INTEGER, varsayılan NULL) sütunları eklendi.

### ✨ İyileştirmeler

- **Son Güncellemeler — CSS Değişkenleri**: Kart stilleri (`asura-card`, `glass-card`) artık CSS değişkenleri (`--latest-updates-card-bg`, `--latest-updates-card-border`, `--latest-updates-hover-bg`, `--latest-updates-title-color`) kullanıyor. Tema renkleri admin panelinden dinamik olarak uygulanabiliyor.
- **Rozet Sistemi — Çevirmen Rolü**: Admin paneli rol değiştirme dropdown'una "Çevirmen" (`translator`) rolü eklendi.

---

## [v2.2.8] — 2026-06-12 (Kırk Altıncı Yayın)

### 🐛 Hata Düzeltmeleri

- **Holo Slider (Cam Küp) — Alt Siyah Boşluk**: `hero_style3` hologram slider'da görselin altında kalan ufak siyah boşluk giderildi. `.hs-holo-section` ve `.hs-holo-track` yükseklikleri düzeltildi.
- **WebP Görsel Kalitesi**: Zaten WebP formatında olan ve boyutları uygun görseller artık yeniden sıkıştırılmıyor. Bu özellikle seri kapakları ve profil görselleri yüklenirken kalite kaybını önlüyor. Tüm optimize fonksiyonlarına (`optimizeCoverImage`, `optimizeChapterPage`, `optimizeAvatar`, `optimizeProfileCover`) WebP kontrolü eklendi. Kalite ayarı 85'ten 90'a yükseltildi.
- **Yorum Raporlama Cooldown**: Yorum raporlama sistemine 60 saniye bekleme süresi eklendi. Aynı yorumu spam şekilde raporlamak artık engelleniyor.

### ✨ İyileştirmeler

- **SeriesCard Puanlama Modernizasyonu**: Puan göstergesi yeniden tasarlandı. Renk kodlu badge sistemi eklendi (4.0+ yeşil, 3.0-3.9 sarı, 2.0-2.9 turuncu, <2.0 kırmızı). Blur backdrop efektli modern badge görünümü eklendi.
- **Profil Sayfası — Tab Birleştirme**: Profil sayfasındaki tab yapısı sadeleştirildi. "Ayarlar" ve "Güvenlik" sekmeleri tek "Ayarlar" sekmesinde birleştirildi. "Kütüphane" ve "Okuma Listesi" sekmeleri tek "Kütüphane" sekmesinde alt-tab'lı olarak birleştirildi. Artık 5 sekme var: Genel Bakış, Kütüphane, İstatistikler, Rozetler, Ayarlar.
- **Günlük Görevler Scroll Bar**: Günlük görevler listesi artık scroll edilebilir. Maksimum yükseklik 480px olarak ayarlandı. Özel scrollbar stili eklendi.
- **Bakım Modu — Client-Side Kontrol**: Bakım modu artık sadece F5'te değil, client-side navigasyonlarda da kontrol ediliyor. SettingsProvider her 30 saniyede bir bakım modu durumunu kontrol ediyor ve aktifse kullanıcıyı bakım sayfasına yönlendiriyor.

---

## [v2.2.7] — 2026-06-12 (Kırk Beşinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Medya — Kullanıcı Görselleri tekrar tekrar gelmesi**: `list-media` API'sinde `/default-avatar.png`, `/avatar.png`, `/default-cover.png` gibi sistem varsayılan görselleri artık kullanıcı görselleri listesine dahil edilmiyor. Bu dosyalar DB'de yeni kayıtlı her kullanıcıya varsayılan olarak atandığı için silinse bile yeni kullanıcılarla geri geliyordu.
- **Medya — Sistem görsellerini silme engeli**: `delete-media` API'sine koruma eklendi. Sistem varsayılan yolları (`/default-avatar.png` vb.) artık fiziksel olarak silinemiyor, sessizce geçiliyor.

---

## [v2.2.6] — 2026-06-12 (Kırk Dördüncü Yayın)

### ✨ İyileştirmeler

- **Seri Detay — Bölümler Kutusu**: Tüm bölümler artık scroll edilebilir sabit yükseklikte kutu içinde gösteriliyor (ilk 20 sınırı kaldırıldı). "Tümünü Göster" butonu scroll yerine uzun liste görünümüne geçiyor; "Daralt" ile scroll moduna dönülüyor. Her iki mod da tüm bölümleri listeler.

---

## [v2.2.5] — 2026-06-12 (Kırk Üçüncü Yayın)

### 🐛 Hata Düzeltmeleri

- **Admin Seri Detay — Bölüm Sıralaması**: Admin panelinde seri bölümleri artık en son eklenen önce (DESC) sıralanıyor. Önceden ilkten sona (ASC) gidiyordu, şimdi 3-2-1 şeklinde listeleniyor.

---

## [v2.2.4] — 2026-06-12 (Kırk İkinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Medya — Kullanıcı Görseli Silme (400 hatası)**: `delete-media` API path validation genişletildi. `/uploads/` dışında `/avatars/` veya farklı formatlarda saklanan yollar da artık kabul ediliyor; path traversal koruması korundu.
- **Medya — Kullanıcı Görseli Boyutu/Tarihi**: Kullanıcı avatar ve kapak görselleri için gerçek dosya istatistikleri (`fs.statSync`) artık liste-media API'sinde hesaplanıyor. Yerel dosyalar için gerçek boyut ve tarih gösteriliyor; harici URL'ler için "Harici" etiketi.
- **Custom Rol API**: `create-custom-role`, `delete-custom-role`, `list-custom-roles` ve `change-user-role` action'ları `/api/admin/users` route'una eklendi. Custom rol isimleri `users.role` alanına atanabiliyor.
- **Özel Rol Yetki Genişletmesi**: `change-role` işleminde özel roller de geçerli rol listesine dahil ediliyor.
- `delete-media` API yanıtına `success: true` eklendi — bulk delete başarı sayacı doğru hesaplanıyor.

---

## [v2.2.3] — 2026-06-12 (Kırk Birinci Yayın)

### 🎨 Tasarım İyileştirmeleri

- **Glassmorphism Card (Son Güncellemeler)**: Cam efekti baştan düzenlendi — `backdrop-filter: blur(16px) saturate(1.4)`, üst kenar parlaması (`::after` highlight şeridi), kapak görseli `object-position: center top` ile düzeltildi ve `align-self: flex-start` eklendi. Hover'da kapak hafifçe yukarı kayıyor. Mobil: `backdrop-filter` kaldırıldı, kapak boyutu optimize edildi, başlık 2 satıra taşıyor.
- **Bağış Bar**: Üst kenar gradyan şeridi (`::before`), butonlarda parlama sweep animasyonu (`::after`), daha güçlü glow orbs, iyileştirilmiş button box-shadow, tüm renk ve geçiş değerleri yenilendi.

### ✨ Yeni Özellikler

- **Seri Detay — Bölümler Kutusu**: İlk 20 bölüm scroll edilebilir kutuda gösterilir. "Tümünü Göster" butonu tüm bölümleri genişletir, "Daralt" ile geri döner. Özel scrollbar stili.
- **Admin Rozetler — SVG İkonlar**: Emoji yerine `BadgeIcon` bileşeni ile çizilmiş 20 adet SVG ikon. İkon dropdown ile seçilir.
- **Admin Rozetler — Renk Düzeltmesi**: Kullanıcıya atanan rozet butonlarında seçili renk doğru yansıtılıyor.
- **Admin Rozetler — Yerleşik Silme**: Varsayılan (yerleşik) rozetler artık silinebilir; silinen ID'ler `deleted_builtin_badges` ayarında saklanır.
- **Admin — Manuel Rol Yönetimi**: "Özel Rol Yönetimi" kartı eklendi. Rol adı, görünen ad, renk seçici ve 15 adet granüler yetki toggle'ı ile özel rol oluşturulabilir; mevcut roller listelenir ve silinebilir.

### 🐛 Hata Düzeltmeleri

- `custom-badges` DELETE API: `builtin=1` parametresi ile yerleşik rozet silme desteği eklendi; silinen rozet tüm kullanıcılardan kaldırılıyor.
- `user-badges` GET/POST: `getAllActiveBadges` ile silinmiş yerleşik rozetler listeden çıkarılıyor.
- `lib/badges.js`: Icon field'ları emoji'den SVG ikon adı string'ine dönüştürüldü.
- Bölüm listesi scroll wrapper'ında `sd-chapter-list-wrap` CSS sınıfı eklendi; özel scrollbar, `scroll-behavior: smooth`.

---

## [v2.2.2] — 2026-06-11 (Kırkıncı Yayın)

### 🐛 Hata Düzeltmeleri

- **Admin medya — Avatarlar & Kullanıcı Görselleri birleştirildi**: "Avatarlar" sekme kaldırıldı. "Kullanıcı Görselleri" artık hem DB'deki avatar/kapak URL'leri hem de `/uploads/avatars/` dizinindeki dosyaları birleşik gösteriyor. Sahipsiz dosyalar altın badge ile işaretleniyor.
- **LazyMediaCard kullanıcı bilgisi**: Kullanıcı görseli kartlarında `@kullanıcıadı` ve görsel tipi (Avatar / Kapak / Sahipsiz) badge olarak gösteriliyor.
- **Keşfet sayfası filtre flash sorunu**: Genre toggle anında `setLoading(true)` çağrısı eklenerek "bulunamadı" flash'ı önlendi.
- **Keşfet hover animasyonları**: `cubic-bezier` spring/bounce kaldırıldı, `ease` geçişe döndürüldü. Kartlar sadece `translateY(-4px)` ile yukarı kalkıyor, sert scale kaldırıldı.
- **next.config.mjs cache uyarısı**: `/_next/static/(.*)` için özel Cache-Control header kaldırıldı (Next.js bunu otomatik yönetiyor).
- **Admin medya — toplu silme FormData sorunu**: `handleBulkDelete` JSON yerine FormData kullanacak şekilde düzeltildi, API ile tutarlı hale getirildi.
- **Medya silme — tek silme sonrası liste yenileme**: `confirmAction` içinde `delete-media` sonrası `loadMedia()` çağrısı eklendi.
- **Upload dropdown**: "Avatarlar" seçeneği kaldırıldı (kullanıcılar kendi profillerinden yönetiyor).

### 🎨 Tasarım İyileştirmeleri

- **Profil Kütüphanem**: Aşırı büyük 3D kart yerine kompakt liste tasarımı — küçük kapak görseli + seri adı, standart admin-card stilinde.
- **Keşfet arka plan**: Gradient hafifletildi, dekoratif orb animasyonsuz basit radial gradient.
- **Glass elementler performans**: `backdrop-filter: blur()` filter bar, genre tags ve load-more butondan kaldırıldı — kasma belirgin biçimde azaltıldı.

---

## [v2.2.1] — 2026-06-11 (Otuz Dokuzuncu Yayın)

### 🐛 Hata Düzeltmeleri

- **Admin medya silme 500 hatası**: `require('sharp')` → `dynamic import('sharp')` ile ES modül uyumlu hale getirildi. `delete-media` handler'ı yeniden yazıldı: harici URL desteği, path normalize/traversal koruması, DB referansı temizleme eklendi.
- **next.config.mjs `/_next/static` cache header uyarısı**: Özel header kaldırıldı.

### ⚡ Performans İyileştirmeleri

- **Keşfet sayfası**: Gereksiz `backdrop-filter`, sert animasyonlar ve ağır gradient kaldırıldı.

---

## [v2.2.0] — 2026-06-11 (Otuz Sekizinci Yayın)

### 🐛 Hata Düzeltmeleri

- **İstatistik barı F5 flash sorunu düzeltildi**: Ana sayfada F5/yenileme sonrası istatistik barı `mounted && !loading` koşuluyla korundu; artık sayfa yenilendikten sonra istatistik kısmı kısa süreliğine görünüp kaybolmuyor.
- **Bildirim sistemi düzeltildi**: Seri isteği durumu güncellendiğinde (`approved`, `rejected`, `reviewing`, `added`) kullanıcıya bildirim gönderilmiyordu. `series-requests` route'una `INSERT INTO notifications` eklendi.
- **Hata bildirimi bildirimleri düzeltildi**: Admin panelde hata bildirimi `rejected`, `resolved` veya `in_progress` yapıldığında kullanıcıya bildirim gönderilmiyordu. `admin/reports` route'una bildirim sistemi eklendi.
- **TrendingWidget Glass3D alt siyah boşluk düzeltildi**: Cam küp seçeneğinde görselin alt kısmında kalan ufak siyah boşluk `.tg-bg` öğesine `background: #111; line-height: 0; font-size: 0` ve img'e `vertical-align: top` eklenerek giderildi.

### ✨ Yeni Özellikler

- **Admin medya paneli — Kullanıcı Görselleri silme**: Daha önce yalnızca indirme yapılabilen "Kullanıcı Görselleri" bölümüne tekli ve toplu silme özelliği eklendi. Diğer kategorilerle tutarlı hale getirildi.
- **Hata bildirimi & seri istek spam koruması**: Her iki API'ye in-memory rate limiting eklendi. Hata bildirimleri: 5 dakikada 3 bildirim. Seri istekleri: 1 saatte 3 yeni istek, 30 saniyede 5 upvote.
- **Seri bölüm listesi kademeli yükleme**: Seri detay sayfasında "Daha Çok Göster" yerine "Daha Fazla Yükle (N kaldı)" butonu ile 20'şer bölüm kademeli yükleme ve "Tümü" butonu eklendi.
- **Profil aktivite grafiği yenilendi**: Son 30 günlük aktivite grafiği yeniden tasarlandı. Tüm 30 günün barı dolu gösteriliyor (boş günler 0 yüksekliğiyle). Aktif gün sayısı, hafta sınırları ve renk gradyanı eklendi.
- **Profil Kütüphanem glassmorphism kartı**: Kütüphanem kartı cam efektiyle yeniden tasarlandı. Seri kapakları büyük 3D görünümde, hover'da scale ve rotate animasyonlarıyla gösteriliyor. Seri eklenebilir sayıda otomatik genişliyor.

### 🎨 Tasarım İyileştirmeleri

- **Keşfet sayfası tam glassmorphism**: Filtreleme barları, genre etiketleri, kart listesi tam glassmorphism tasarımına kavuştu. `backdrop-filter`, cam kenarlıklar, yumuşak gradient arkaplan ve daha akıcı animasyonlar uygulandı.
- **Hover animasyonları yumuşatıldı**: SeriesCard ve glass-series-grid hover geçişleri `cubic-bezier` eğrisiyle yumuşatıldı; pikselleşme sorunu `will-change: transform; backface-visibility: hidden; transform: translateZ(0)` ile giderildi.
- **Favicon WebP desteği iyileştirildi**: Favicon yüklemede `assetType === 'favicon'` olduğunda PNG formatına dönüştürülüyor. Metadata'da WebP MIME türü açıkça belirtiliyor, PNG fallback eklendi.

### ⚡ Performans İyileştirmeleri

- **Next.js yapılandırması optimize edildi**: `compress: true`, `images.minimumCacheTTL: 2592000`, `stale-while-revalidate` cache başlığı ve `/_next/static/` immutable cache eklendi.
- **Aktivite grafiği API sorgu düzeltildi**: Günlük aktivite verisi API tarafında 30 günlük boşluksuz dizi olarak doldurularak frontend hesabı azaltıldı.

---

## [v2.1.0] — 2026-06-11 (Otuz Yedinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Admin panel CPU/RAM %0 sorunu düzeltildi**: `/api/admin/stats` endpoint'i CPU ve RAM kullanımı döndürmüyordu. `os` modülü ile 100ms örnekleme yapan CPU ölçümü ve toplam/boş bellek hesabı eklendi. Artık gerçek zamanlı işlemci ve bellek yüzdesi ile ilerleme çubukları gösteriliyor.
- **Kütüphane "Shadow Ronin" görseli sorunu düzeltildi**: SeriesCard, profile ve admin panelde kapak görseli olmayan seriler için `/demo/cover1.jpg` (Shadow Ronin kapağı) geri dönüş görseli kullanılıyordu. Tüm bu referanslar nötr SVG placeholder ile değiştirildi.
- **Profil kapak görseli kaymış hizalama düzeltildi**: Kapak görseli `backgroundPosition: 'center top'` nedeniyle merkeze oturmuyordu. `center center` yapıldı; imageOptimizer'da da `fit: cover, position: centre` zaten doğruydu.
- **Bölüm okuyucu "Ana Sayfa" butonu düzeltildi**: Bölüm sayfasının sonundaki "Ana Sayfa" butonu mevcut sayfanın en üstüne gidiyordu, ana sayfaya değil. `useRouter` hook'u EndChapterCard bileşenine eklendi ve `router.push('/')` ile doğru navigasyon sağlandı.
- **Favicon düzeltildi**: Özel favicon ayarlandıktan sonra varsayılan favicon görünmeye devam ediyordu. Metadata yapılandırması düzeltildi.

### ✨ Yeni Özellikler

- **Bölüm sayfasına hata bildirme özelliği**: Bölüm okuma sayfasında "Hata Bildir" butonu eklendi. Kullanıcılar bölümdeki sorunları bildirebilir. Admin panelde "Hata Bildirimleri" sekmesinde tüm bildirimler görüntülenebilir ve yönetilebilir.
- **Bakım modu Glassmorphism tasarımı**: Bakım modu için modern cam efekti veren Glassmorphism tasarımı eklendi. Admin panelden "Varsayılan" veya "Glassmorphism" arasında seçim yapılabilir.
- **Rol güncellemeleri ve rozet sistemi**: "Ekip Üyesi" rolü "Yükleyici" olarak yeniden adlandırıldı. Kullanıcılara özel rozetler (VIP, Çevirmen, Yükleyici, Destekçi, Öncü, Doğrulanmış) admin panelden verilebilir. Rozetler yorumlarda ve profil sayfasında görünür.
- **Giriş/Kayıt form metni ayarlanabilir**: Giriş ve kayıt sayfalarındaki alt başlıklar admin panelden özelleştirilebilir.
- **Medya indirme ve kullanıcı görselleri**: Medya yönetiminde tek ve toplu seçim ile indirme özelliği eklendi. "Kullanıcı Görselleri" kategorisi eklendi (profil ve kapak görselleri).
- **Admin panel reklam yönetimi**: Admin panele "Reklamlar" sekmesi eklendi. Popup, üst banner, yan panel, bölümler arası ve alt banner reklam kodları yönetilebilir.
- **Son güncellemeler renk ayarları**: Son güncellemeler bölümünün renkleri (başlık, kart arka planı, badge vb.) admin panelden özelleştirilebilir.
- **Manga keşfet sayfası Glassmorphism tasarımı**: Tüm serilerin olduğu sayfa modern cam efekti ile yeniden tasarlandı. Animated gradient background, glass filter bar, glass genre tags özellikleri eklendi.

### 🔧 İyileştirmeler

- **Sunucu kaynak kartlarına ilerleme çubukları eklendi**: CPU ve RAM kutucuklarına renkli progress bar eklendi. RAM detayı (kullanılan/toplam) gösteriliyor.
- **DB migrations eklendi**: `login_streak`, `last_streak_date` kolonları users tablosuna migrate ediliyor.
- **Site stay API**: `/api/users/site-stay` (POST) endpoint'i eklendi. Rate limit: 20 req/dk. Günlük maksimum 60 dakika takibi.
- **Glassmorphism kart tasarımı eklendi**: Ana sayfadaki "Neon Pulse - Gradient Glow" (style6) tasarımı kaldırıldı, yerine cam efektli modern `GlassmorphismCard` bileşeni eklendi. `backdrop-filter: blur`, şeffaf sınır, glow efekti ve hover animasyonları içeriyor.
- **Bölüm listesi sayfalaması**: Admin panelde bir serinin bölüm listesi çok uzadığında sayfalama özelliği eklendi.
- **Günlük görevler (quests) genişletildi**: 3 görevden 13 göreve çıkarıldı.

---

## [Unreleased] — 2026-06-10 (Otuz Altıncı Yayın)

### 🐛 Hata Düzeltmeleri

- **Yedekleme 500 hatası düzeltildi**: `/api/admin/backup?action=create` endpoint'i `reading_lists` gibi henüz mevcut olmayan tablolara erişince 500 hatası veriyordu. Tüm tablo sorguları artık güvenli `safeQuery` yardımcısıyla sarıldı; var olmayan tablolar sessizce boş dizi döndürüyor.
- **Cam küp slider (Glass 3D) görsel hatası düzeltildi**: `trend_style4` (Cam Küp 3D) tasarımında görsel küpü tam doldurmuyordu ve uzun seri adları görselin üstüne taşarak kapak resmini gizliyordu. `object-fit: cover; object-position: center top` ve 2 satır text-clamp eklendi; 3D `translateZ` overflow sorunu kaldırıldı.
- **Arama çubuğu kenar taşması düzeltildi**: Arama sonuçları hem masaüstünde hem mobilde ekran kenarlarına yapışıyordu. Search overlay ve container responsive padding ile düzeltildi.

### ✨ Yeni Özellikler

- **Zamanlayıcılı bölüm yükleme**: Bölüm eklerken "Zamanlanmış Yayın" tarih/saat alanı eklendi. `publish_at` DB sütunu migrate edildi. Ayarlanan zamana kadar bölüm okuyuculara gösterilmez.
- **Site trafiği izleme (Analytics)**: Admin panele "Site Trafiği" sekmesi eklendi. Günlük ziyaret, benzersiz ziyaretçi, en çok ziyaret edilen sayfalar ve yeni üye grafikleri gösteriliyor. `TrafficTracker` bileşeni otomatik olarak her sayfa değişimini kaydediyor.
- **Tür (genre) yönetimi ve silme**: Admin panele "Türler" sekmesi eklendi. Özel tür eklenebilir ve silinebilir. Silinen tür tüm serilerden otomatik kaldırılır.
- **Rol açıklamaları ve yetki tablosu**: Türler sekmesinde her rolün (Admin, Yönetici, Moderatör, Ekip Üyesi, Kullanıcı) sahip olduğu yetkiler görsel olarak listelenmiştir.
- **Kullanıcı şifre sıfırlama**: Admin paneli kullanıcılar tablosunda her kullanıcı için şifre sıfırlama butonu eklendi. Yeni şifre belirlendikten sonra `/api/admin/users` üzerinden bcrypt ile hashlenip kaydediliyor.
- **Kullanıcı aktivite ve log görüntüleme**: Kullanıcı satırında "Aktivite" butonuna tıklayınca kullanıcının son aktiviteleri, yorum/favori/okuma istatistikleri ve admin logları gösteriliyor.
- **Ana sayfa istatistikler barı toggle**: Ayarlar sekmesine "Ana Sayfa İstatistikler Barını Göster" checkbox'ı eklendi. `show_stats_bar` ayarı DB'ye seed edildi.
- **Denetim kaydı (Audit Log)**: Admin panele "Denetim Kaydı" sekmesi eklendi. Tüm admin işlemleri (seri ekleme/silme, rol değişikliği, şifre sıfırlama vb.) zaman damgasıyla listeleniyor.
- **Trafik kaydı API**: `POST /api/admin/traffic` bot kontrolü yaparak her sayfa görüntülenmesini hashlenmiş IP + tarih bazlı benzersiz ziyaretçi olarak kaydediyor.

### 🔧 İyileştirmeler

- **`user_activity_log` tablosu eklendi**: Kullanıcı aktivitelerini izlemek için veritabanı migrate edildi.
- **`site_traffic_log` tablosu eklendi**: Trafik takibi için veritabanı migrate edildi.
- **`custom_genres` tablosu eklendi**: Özel tür yönetimi için veritabanı migrate edildi.
- **Bölüm API `publish_at` desteği**: `INSERT INTO chapters` sorgusu artık `publish_at` sütununu da kaydediyor.

---

## [Unreleased] — 2026-06-10 (Otuz Beşinci Yayın)

### 🐛 Hata Düzeltmeleri

- **Trend otomatik kaydırma mobil hatası düzeltildi**: Mobilde otomatik kaydırma açıkken 5'ten başlayıp 9'a kayan sonra tık diye tekrar 5'e atlayan hata giderildi. Mobilde de triple list kullanılarak kesintisiz kaydırma sağlandı. Dokunma sonrası pozisyon senkronizasyonu iyileştirildi.
- **Kayıt formu site ismi düzeltildi**: Kayıt formundaki "YomiTranslate'e katılın" sabit metni, artık veritabanından dinamik olarak site ismini çekiyor.
- **Türkçe karakter desteği eklendi**: Kayıt formunda kullanıcı adı alanında Türkçe karakterler (ç, ğ, ı, ö, ş, ü vb.) artık kabul ediliyor. Önceden "halıadam" gibi isimler "sembol kullanmayın" hatası veriyordu.
- **Yorum sayısı düzeltildi**: Bir yoruma yanıt yazıldığında toplam yorum sayısında yanıtların da sayılması sağlandı. Önceden 1 yorum + 2 yanıt = toplam 1 gösteriliyordu, artık 3 gösteriliyor.
- **Seri ismi/kapak hatası düzeltildi**: Kütüphaneye veya okuma listesine seri eklerken, kapak görseli ve seri isminin yanlış gösterilmesi ("shadow ronin" gibi) sorunu giderildi. API'lerin artık `cover_image` ve `slug` alanlarını da döndürmesi sağlandı.

### ✨ Yeni Özellikler

- **Profil resmi önizleme ve kırpma**: Profil ve kapak resmi seçildikten sonra önizleme gösteriliyor. Kaydet butonuna basana kadar kayıt yapılmıyor. Manuel kırpma kontrolleri (yukarı/aşağı/sağ/sol kaydırma, yakınlaştır/uzaklaştır) eklendi.
- **Profil resmi değişiklik limiti**: 24 saatte en fazla 2 kez profil resmi veya kapak resmi değiştirilebilir. Önceden 1 kez limiti vardı. Kullanıcıya kalan değişiklik hakkı ve bekleme süresi gösteriliyor.
- **Admin panel yedekleme bölümü**: Yedek oluşturma, mevcut yedekleri görüntüleme, indirme, silme ve dışa/içe aktarma özellikleri eklendi. Son 7 yedek otomatik tutuluyor.
- **Admin panel sunucu kaynak kullanımı**: Dashboard'a CPU kullanımı, RAM kullanımı, depolama ve yedek boyutu kartları eklendi.
- **Seri arama iyileştirmesi**: Arama kutusu artık tam genişliğe yayılıyor, arama ikonu ve arama butonu eklendi. Tasarım iyileştirildi.

### 🔧 İyileştirmeler

- **Kayıt formu**: Site ismi artık dinamik olarak veritabanı ayarlarından çekiliyor.
- **Profil resmi/kapak**: Seçim sonrası otomatik kayıt kaldırıldı, artık "Kaydet" butonuna basmak gerekiyor.

---

## [Unreleased] — 2026-06-09 (Otuz Dördüncü Yayın)

### ✨ Yeni Özellik

#### Kullanıcı Puanlama Sistemi (1–10 Yıldız)

- **`user_ratings` tablosu** `lib/db.js` migration'ına eklendi: `series_id`, `user_id`, `rating` (1–10), `UNIQUE(series_id, user_id)` kısıtı.
- **`/api/series/rate` endpoint'i** (`GET` / `POST` / `DELETE`) oluşturuldu: kullanıcılar seriye 1–10 arası puan verebilir; puan güncellendiğinde `series.rating` ortalaması otomatik yeniden hesaplanır.
- **SeriesDetailClient.js**: Seri detay sayfasına yıldız satırı (10 yıldız) eklendi. Üzerine gelindiğinde hover vurgusu, tıklanınca kayıt; giriş yapılmamışsa uyarı mesajı gösterilir.
- **`app/series-detail.css`**: `.sd-user-rating-wrap`, `.sd-star-btn`, `.sd-r