# 3D Car Park Simulation

Bu proje, Three.js ile geliştirilmiş bir 3D araç park simülasyonudur. Kullanıcı farklı araçları seçip, engellerle dolu bir sahnede park etme mücadelesine katılabilir. Mini harita, yağmur efekti ve skor sistemi gibi modern özellikler içerir.


## Özellikler
- **3D Araçlar:** Alfa Romeo, Büyük Kamyon ve Spor Motosiklet modelleri
- **Gerçekçi Park Alanı:** Dönüş toleransı ve pozisyon kontrolü
- **Engeller:** Kutu, silindir ve duvar şeklinde çarpışma engelleri
- **Mini Harita:** Araç, engeller ve park alanı görünümü
- **Yağmur Efekti:** Partikül tabanlı yağmur ve isteğe bağlı yağmur sesi
- **Fren ve Hızlanma:** Gerçekçi hareket ve frenleme
- **Skor ve Zaman:** Park başarısı ve süreye göre puanlama
- **Klavye Kontrolleri:** Araç seçimi, hareket, fren, park başlatma/bitirme
- **lil-gui ile Canlı Ayarlar:** Işık, pozlama, yağmur ve ses kontrolü

## Kurulum
1. **Bağımlılıklar:**
   - Proje saf JavaScript ve Three.js kullanır. Ekstra bir paket yöneticisi gerekmez.
2. **Dosya Yapısı:**
   - `public/js/main.js` — Ana uygulama kodu
   - `public/assets/models/` — 3D model dosyaları (GLTF)
   - `public/assets/skybox/` — Gökyüzü dokuları
   - `public/assets/sounds/` — Yağmur sesi dosyası
   - `public/css/style.css` — Stil dosyası
   - `public/index.html` — Başlangıç dosyası

## Kullanım
1. Proje klasörünü bir web sunucusunda çalıştırın (örn. VSCode Live Server, Python SimpleHTTPServer, http-server, vb.).
2. `public/index.html` dosyasını tarayıcıda açın.
3. Araç seçin, klavye ile hareket ettirin ve park etmeye çalışın.
4. Yağmur efektini ve sesi GUI panelinden açıp kapatabilirsiniz.

### Klavye Kısayolları
- **1, 2, 3:** Araç seçimi
- **W/A/S/D veya Yön Tuşları:** Hareket
- **Space:** Fren
- **P:** Park mücadelesini başlat/bitir
- **Enter:** Parkı kontrol et

## Gereksinimler
- Modern bir tarayıcı (WebGL desteği ile)
- Three.js, lil-gui, GLTFLoader ve OrbitControls (CDN veya local olarak dahil edilmeli)

## Geliştirici Notları
- `main.js` içinde araç materyalleri ve efektler kolayca özelleştirilebilir.
- Yağmur sesi için `public/assets/sounds/rain-weather-lightning-thunder-151314.mp3` dosyası gereklidir.
- Mini harita için HTML'de `<canvas id="miniMapCanvas"></canvas>` bulunmalıdır.

## Lisans
Bu proje eğitim ve kişisel kullanım içindir. 3D modellerin ve seslerin lisanslarına dikkat ediniz.

## Ses Dosyası İçin Referans
https://pixabay.com/tr/sound-effects/rain-weather-lightning-thunder-151314/
