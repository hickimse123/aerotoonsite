# Aerotoon — Vercel Dağıtım Rehberi

Bu proje artık **Vercel'in ücretsiz (Hobby) planında sıfır maliyetle** çalışacak şekilde uyarlandı:

| Eskiden | Şimdi |
|---|---|
| better-sqlite3 (yerel dosya) | **Turso** (ücretsiz, uzak, SQLite uyumlu) |
| Diske yazılan görseller (`public/uploads`) | **imgbb** (ücretsiz görsel barındırma) |
| — | **Firebase Analytics** (opsiyonel, ziyaretçi istatistiği) |

Aşağıdaki adımları sırayla takip et. Hiçbirini atlama.

---

## 1) Turso hesabı ve veritabanı oluştur (ücretsiz)

1. https://turso.tech adresine git, **Sign Up** ile ücretsiz hesap aç (GitHub ile giriş yapabilirsin).
2. Giriş yaptıktan sonra sağ üstten **Create Database** butonuna tıkla.
3. Bir isim ver (örn. `aerotoon-db`), bölge olarak sana en yakın olanı seç (örn. Frankfurt/`fra`), **Create**'e bas.
4. Veritabanı oluşunca açılan sayfada:
   - **URL** kısmını kopyala → `libsql://aerotoon-db-KULLANICIADIN.turso.io` gibi görünür. Bu senin `TURSO_DATABASE_URL` değerin.
   - **Create Token** butonuna tıklayıp bir token oluştur, kopyala. Bu senin `TURSO_AUTH_TOKEN` değerin.

   > Token'ı sadece bir kez görebilirsin — kopyalamadan sayfadan ayrılma. Kaybedersen "Create Token" ile yenisini oluşturabilirsin.

Bu ikisini bir kenara not al, birazdan Vercel'e gireceğiz.

**Not:** Veritabanı tabloları (users, series, chapters, vb.) projeyi ilk kez çalıştırdığında **otomatik olarak** oluşturulur — elle bir şey yapmana gerek yok. `lib/db.js` içindeki `initializeDatabase()` fonksiyonu bunu senin için yapıyor.

---

## 2) imgbb API anahtarı al (ücretsiz)

1. https://api.imgbb.com/ adresine git.
2. **Get API Key** butonuna tıkla, ücretsiz bir hesap oluştur / giriş yap.
3. Sana verilen API anahtarını kopyala. Bu senin `IMGBB_API_KEY` değerin.

Tüm kapak görselleri, bölüm sayfaları, avatarlar, watermark vb. artık bu anahtar üzerinden imgbb'ye yüklenip oradan servis edilecek.

---

## 3) JWT_SECRET oluştur

Terminalinde (bilgisayarında Node.js kuruluysa) şunu çalıştır:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Çıkan uzun rastgele metni kopyala — bu senin `JWT_SECRET` değerin (kullanıcı girişlerinin güvenliği buna bağlı, kimseyle paylaşma).

Node.js yoksa https://generate-secret.vercel.app/48 gibi bir üreteci de kullanabilirsin.

---

## 4) Projeyi GitHub'a yükle

1. https://github.com adresinde yeni, **boş** bir repo oluştur (örn. `aerotoon`).
2. Bu klasördeki tüm dosyaları o repoya push'la:

```bash
cd aerotoon-project   # bu projenin klasörü
git init
git add .
git commit -m "İlk commit"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/aerotoon.git
git push -u origin main
```

> `.gitignore` dosyası zaten `node_modules`, `.env*.local` ve `data/` klasörünü hariç tutuyor — hassas bilgi kazara yüklenmez.

---

## 5) Vercel'de projeyi import et

1. https://vercel.com adresine git, GitHub hesabınla giriş yap.
2. **Add New → Project** de, az önce push'ladığın `aerotoon` reposunu seç → **Import**.
3. Framework Preset otomatik "Next.js" olarak algılanacak, dokunma.
4. **Environment Variables** bölümünü aç ve aşağıdaki değerleri TEK TEK ekle (her biri için Key + Value gir, "Production", "Preview" ve "Development" hepsini işaretli bırak):

| Key | Value |
|---|---|
| `TURSO_DATABASE_URL` | (1. adımda kopyaladığın URL) |
| `TURSO_AUTH_TOKEN` | (1. adımda kopyaladığın token) |
| `IMGBB_API_KEY` | (2. adımda kopyaladığın anahtar) |
| `JWT_SECRET` | (3. adımda ürettiğin rastgele metin) |
| `NEXT_PUBLIC_BASE_URL` | `https://aerotoon.vercel.app` (aşağıda adım 6'da netleşecek) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyCbk_gmNH8WRoJM36Rls6G41GWKnoatEoo` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `aerotoon-site.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `aerotoon-site` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `aerotoon-site.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `828881953716` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:828881953716:web:ac8f8dff65c3fc4ba7c8e1` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | `G-XT0YPVFHJY` |

5. **Deploy** butonuna bas. İlk build birkaç dakika sürebilir (fontlar, sayfa üretimi vb).

---

## 6) Subdomain'i `aerotoon.vercel.app` yap

Vercel varsayılan olarak proje adına göre bir adres verir (örn. `aerotoon-xyz123.vercel.app`). İstediğin `aerotoon.vercel.app` adresini almak için:

1. Deploy bittikten sonra Vercel proje sayfasında **Settings → Domains** kısmına git.
2. Kutucuğa `aerotoon.vercel.app` yaz ve **Add** de.
   - Eğer bu isim başka biri tarafından alınmamışsa direkt eklenir.
   - Alınmışsa `aerotoon-web.vercel.app` gibi alternatif bir isim dene.
3. Adres netleşince **Settings → Environment Variables**'a dönüp `NEXT_PUBLIC_BASE_URL` değerini gerçek adresle güncelle (örn. `https://aerotoon.vercel.app`), sonra **Deployments** sekmesinden **Redeploy** yap (env değişikliklerinin geçmesi için redeploy şart).

---

## 7) İlk giriş — admin hesabı

Proje ilk çalıştığında veritabanı otomatik olarak "seed" edilir (bkz. `lib/seed.js`) ve şu demo hesaplar oluşturulur:

- **Admin:** kullanıcı adı `admin`, şifre `admin123`
- **Kullanıcı:** kullanıcı adı `demo`, şifre `user123`

**Siteye girer girmez ilk işin bu şifreleri değiştirmek olmalı** (Profil → Şifre Değiştir, admin panelinden de kullanıcı yönetimi var). Canlıya aldıktan sonra bu varsayılan şifrelerle kimse giriş yapamamalı.

Giriş yaptıktan sonra `/admin-panel` adresinden içerik eklemeye başlayabilirsin (seri, bölüm, sayfa yükleme — hepsi artık otomatik olarak imgbb'ye yükleniyor).

---

## Bilinmesi gereken sınırlamalar (dürüstçe)

- **imgbb ücretsiz plan:** Tek dosya boyutu sınırı var (genelde 32MB, pratikte manga sayfaları için sorun olmaz) ve resmi bir "silme API"si kısıtlı olduğu için, bir görseli admin panelinden silsen bile imgbb sunucusunda dosya fiziksel olarak kalmaya devam eder (sadece veritabanı referansı silinir, siteden görünmez olur). Uzun vadede gerçek bir sorun olursa (örn. yüksek trafik), Cloudflare R2 veya benzeri ücretsiz katmanlı bir depolamaya geçmek gerekebilir — o zaman tekrar yardımcı olabilirim.
- **Turso ücretsiz plan:** Aylık 500 veritabanı ve 9GB depolama/500M satır okuma gibi cömert limitleri var; küçük-orta ölçekli bir webtoon sitesi için fazlasıyla yeterli.
- **Watermark ve bölüm başı/sonu görselleri** artık imgbb URL'i olarak saklanıyor; admin panelinden yeniden yüklemen gerekiyor (eski yerel dosya yolları artık geçersiz).
- Admin panelindeki "disk kullanımı / medya klasörü" istatistik ekranı, artık görseller diskte değil imgbb'de tutulduğu için anlamını yitirdi — orada 0 veya boş görürsen bu normal, bir hata değil.

---

## Sorun mu çıktı?

En sık karşılaşılan build hatası "Failed to fetch font Inter" şeklindeyse — bu genelde geçicidir (Google Fonts'a erişim sorunu), sadece **Redeploy** yeterlidir. Kalıcıysa Vercel'in build ortamında ağ erişimi olduğundan emin ol (varsayılan olarak vardır).

Diğer sorunlarda Vercel proje sayfasındaki **Deployments → (son deploy) → Build Logs / Function Logs** kısmına bak; hata mesajı genelde nedeni açıkça söyler.
