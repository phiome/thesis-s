# Ücretsiz API + Deploy Rehberi (Groq + Render)

Sadece 3 kişi kullanacağı için tamamen ücretsiz bir kurulum yeterli:
**Groq** (ücretsiz AI API) + **Render** (ücretsiz sunucu). Kredi kartı gerekmez.

---

## A. Ücretsiz Groq API anahtarı al (2 dk)

1. https://console.groq.com adresine git → Google/GitHub ile giriş yap.
2. Sol menü → **API Keys** → **Create API Key** → adını yaz → oluştur.
3. Anahtarı kopyala (`gsk_...` diye başlar). Sadece bir kez gösterilir, bir yere kaydet.

> Not (GDPR): Groq ücretsiz katman, gerçek katılımcı verisi için ideal değildir.
> Pilot/test (3 kişi) için uygundur. Asıl çalışmada AB uyumlu bir sağlayıcıya
> (ör. Anthropic/Azure) geçmek gerekir — kod bunu tek ayarla destekliyor.

---

## B. Önce lokalde test et (opsiyonel ama önerilir)

PowerShell'de, `backend` klasöründe:

```
cd "C:\Users\musta\OneDrive\Masaüstü\claude\prototype\backend"
npm install
$env:PROVIDER="groq"
$env:GROQ_API_KEY="gsk_...senin-anahtarın"
npm start
```

Sonra tarayıcıda **http://localhost:3000/** aç (dosyaya çift tıklama DEĞİL, bu adresi yaz).
Chatbot artık gerçek cevap verir.

---

## C. Herkesin erişebilmesi için Deploy (Render)

### 1. Kodu GitHub'a koy
1. https://github.com → hesap aç / giriş yap → **New repository** → adı ör. `ai-study` → Create.
2. En kolay yükleme: repo sayfasında **"uploading an existing file"** bağlantısına tıkla.
3. `backend` klasörünün **içindeki** her şeyi (server.js, package.json, public/ klasörü) sürükleyip bırak → **Commit**.
   > `.env` dosyasını YÜKLEME — anahtar orada kalmasın.

### 2. Render'da yayınla
1. https://render.com → GitHub ile giriş.
2. **New → Web Service** → az önceki repoyu seç.
3. Ayarlar:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. **Environment** (Ortam değişkenleri) bölümüne ekle:
   - `PROVIDER` = `groq`
   - `GROQ_API_KEY` = `gsk_...senin-anahtarın`
5. **Create Web Service** → 1-2 dk sonra sana bir adres verir:
   `https://ai-study-xxxx.onrender.com`

### 3. Kullan
O adresi 3 kişiye gönder. Adres hem uygulamayı açar hem chatbot'u çalıştırır —
`index.html` içinde hiçbir şey değiştirmene gerek yok (aynı adrese otomatik bağlanır).

> Render ücretsiz katman: kimse kullanmayınca uyur, ilk açılışta ~30-50 sn
> gecikebilir. 3 kişilik kullanım için sorun değil.

---

## Sağlayıcı değiştirme (özet)
`PROVIDER` değişkenini değiştirip ilgili anahtarı ver:
| PROVIDER   | Anahtar değişkeni   | Ücret |
|------------|---------------------|-------|
| `groq`     | `GROQ_API_KEY`      | Ücretsiz |
| `gemini`   | `GEMINI_API_KEY`    | Ücretsiz katman (bölgeye göre) |
| `anthropic`| `ANTHROPIC_API_KEY` | Kredi/ödemeli (GDPR için en iyi) |
