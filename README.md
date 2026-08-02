# Chatbot Backend — Kurulum Rehberi

Bu küçük sunucu, chatbot'un API anahtarını gizler ve gruba göre kısıtları uygular.
Tek bir ayarla **ücretsiz Google Gemini** ya da **Anthropic Claude Haiku** kullanabilirsin.

---

## 1. Ücretsiz API anahtarı al (Google Gemini)

1. https://aistudio.google.com/apikey adresine git (Google hesabınla gir).
2. **"Create API key"** de → anahtarı kopyala.
3. Ücretsiz katman deney için fazlasıyla yeterli.

> ⚠️ **GDPR notu:** Google'ın ücretsiz katmanı veriyi ürün geliştirmede kullanabilir.
> Katılımcı metinleri söz konusu olduğu için, tez etik kurulu bunu sorabilir.
> Alternatif: $100 Anthropic kredin — veriyi eğitimde kullanmaz. Anahtarı
> https://console.anthropic.com → Settings → API Keys üzerinden alıp `.env`'de
> `PROVIDER=anthropic` yaparsın. Kod her ikisini de destekliyor.

## 2. Anahtarı yerleştir

`.env.example` dosyasını `.env` olarak kopyala ve anahtarını yapıştır:

```
PROVIDER=gemini
GEMINI_API_KEY=senin-anahtarın
```

**Anahtarı asla index.html içine veya herkese açık bir yere koyma** — sadece bu backend'de, `.env`'de durur.

## 3. Yerel çalıştır (test)

Node.js 18+ gerekli.

```
cd backend
npm install
# .env dosyanı doldurduysan:
node -r dotenv/config server.js   # veya: npm start (ortam değişkenlerini kabuğa verirsen)
```

Test: tarayıcıda `http://localhost:3000/health` → `{ "ok": true }` görmelisin.

> Not: `npm start` düz `node server.js` çalıştırır. `.env` dosyasını otomatik
> okuması için `npm install dotenv` yapıp yukarıdaki `-r dotenv/config` ile başlat.

## 4. Ücretsiz sunucuya yükle (canlı)

En kolayı **Render** (ücretsiz):

1. https://render.com → GitHub ile giriş.
2. Bu `backend` klasörünü bir GitHub reposuna koy.
3. Render → **New → Web Service** → repoyu seç.
4. Build command: `npm install` · Start command: `npm start`
5. **Environment** sekmesine `PROVIDER` ve `GEMINI_API_KEY` (veya Anthropic) ekle.
6. Deploy → sana bir adres verir, ör. `https://senin-app.onrender.com`

(Alternatifler: Railway, Fly.io, Vercel — hepsinde ücretsiz katman var.)

## 5. Prototipe bağla

Canlı adresini `index.html` içinde en üstteki ayara yapıştır:

```js
const BACKEND_URL = "https://senin-app.onrender.com";
```

Boş bırakılırsa chatbot yine sahte (mock) yanıt verir — yani anahtar/sunucu
olmadan da prototip çalışmaya devam eder.

---

## Uç noktalar

| Method | Yol       | Açıklama |
|--------|-----------|----------|
| GET    | `/health` | Sağlık kontrolü |
| POST   | `/chat`   | `{ condition, language, messages:[{role,text}], essayDraft }` → `{ reply }` |

- `condition="control"` isteği reddedilir (kontrol grubunda AI yok).
- `condition="supportive"` → koç modu sistem talimatı + 80 kelime sınırı.
- `condition="substitutive"` → serbest.
