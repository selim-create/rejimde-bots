# Windows Server Kurulum Dokümantasyonu

Bu dokümantasyon, Rejimde Bots sisteminin Windows sunucuda otomatik ve zamanlanmış olarak çalışması için gereken kurulum adımlarını içerir.

## Sistem Gereksinimleri

### Yazılım Gereksinimleri
- **Windows Server 2016** veya daha yeni (Windows 10/11 da desteklenir)
- **Node.js** v18 veya daha yeni
- **npm** v9 veya daha yeni
- **Git** (opsiyonel, proje güncellemeleri için)

### Donanım Önerileri
- **CPU**: 2+ çekirdek
- **RAM**: 4 GB minimum, 8 GB önerilen
- **Disk**: 10 GB boş alan (veritabanı ve loglar için)

## Kurulum Adımları

### 1. Node.js Kurulumu

1. [Node.js resmi sitesinden](https://nodejs.org/) LTS versiyonunu indirin
2. Kurulum sırasında "Add to PATH" seçeneğini işaretleyin
3. Kurulum tamamlandıktan sonra terminalde doğrulayın:
   ```cmd
   node --version
   npm --version
   ```

### 2. Proje Kurulumu

1. Projeyi `C:\Projects\rejimde-bots` dizinine yerleştirin:
   ```cmd
   mkdir C:\Projects
   cd C:\Projects
   git clone [repository-url] rejimde-bots
   ```

2. Proje dizinine gidin:
   ```cmd
   cd C:\Projects\rejimde-bots
   ```

3. Bağımlılıkları yükleyin:
   ```cmd
   npm install
   ```

4. `.env` dosyasını oluşturun (`.env.example` dosyasını kopyalayın):
   ```cmd
   copy .env.example .env
   ```

5. `.env` dosyasını düzenleyin ve gerekli API anahtarlarını ekleyin:
   ```
   OPENAI_API_KEY=your_openai_api_key
   REJIMDE_API_URL=https://api.rejimde.com
   ```

6. TypeScript'i derleyin (opsiyonel):
   ```cmd
   npm run build
   ```

### 3. Windows Task Scheduler Kurulumu

#### Otomatik Kurulum (Önerilen)

1. PowerShell veya Command Prompt'u **Yönetici olarak** açın

2. Proje dizinine gidin:
   ```cmd
   cd C:\Projects\rejimde-bots
   ```

3. Setup script'ini çalıştırın:
   ```cmd
   scripts\windows\setup-task.bat
   ```

4. Script otomatik olarak:
   - Eski görevi temizler (varsa)
   - Yeni görev oluşturur
   - Her gün saat 06:00'da çalışacak şekilde ayarlar
   - SYSTEM kullanıcısı ile en yüksek öncelikte çalışır

#### Manuel Kurulum

1. Task Scheduler'ı açın (`taskschd.msc`)

2. Sağ tarafta "Create Task" seçeneğine tıklayın

3. **General** sekmesi:
   - Name: `RejimdeBotsDaily`
   - Description: `Günlük bot aktivitelerini çalıştırır`
   - Security options:
     - "Run whether user is logged on or not" seçin
     - "Run with highest privileges" işaretleyin
     - Configure for: Windows 10

4. **Triggers** sekmesi:
   - "New" butonuna tıklayın
   - Begin the task: "On a schedule"
   - Settings: "Daily"
   - Start: Bugünün tarihi, saat 06:00
   - "Enabled" işaretli olsun

5. **Actions** sekmesi:
   - "New" butonuna tıklayın
   - Action: "Start a program"
   - Program/script: `C:\Projects\rejimde-bots\scripts\windows\run-daily.bat`
   - Start in: `C:\Projects\rejimde-bots`

6. **Conditions** sekmesi:
   - "Start the task only if the computer is on AC power" işaretini kaldırın
   - "Wake the computer to run this task" işaretleyin (sunucu için)

7. **Settings** sekmesi:
   - "Allow task to be run on demand" işaretleyin
   - "If the task fails, restart every": 10 minutes
   - "Attempt to restart up to": 3 times
   - "Stop the task if it runs longer than": 20 hours

8. "OK" butonuna tıklayın ve gerekirse yönetici şifresi girin

## Test

### 1. Manuel Test

Script'lerin düzgün çalıştığını test etmek için:

```cmd
cd C:\Projects\rejimde-bots
scripts\windows\run-now.bat
```

Bu komut:
- Botları manuel olarak çalıştırır
- Log dosyası oluşturur (`logs/manual-YYYY-MM-DD-HH-MM-SS.log`)
- Ekrana ve log dosyasına çıktı yazar

### 2. Task Scheduler Test

Görevi manuel olarak çalıştırarak test edin:

```cmd
schtasks /run /tn "RejimdeBotsDaily"
```

veya Task Scheduler GUI'den:
1. Task Scheduler'ı açın
2. "RejimdeBotsDaily" görevini bulun
3. Sağ tıklayın ve "Run" seçin

### 3. Durum Kontrolü

Sistem durumunu kontrol etmek için:

```cmd
cd C:\Projects\rejimde-bots
scripts\windows\check-status.bat
```

Bu script şunları kontrol eder:
- Node.js versiyonu
- npm versiyonu
- Task Scheduler görevi durumu
- Proje dizini varlığı
- Son log dosyaları
- Veritabanı boyutu
- Son çalışma zamanı

## Zamanlanmış Çalışma Detayları

### Çalışma Saatleri
- **Başlangıç**: Her gün saat 06:00
- **Çalışma Süresi**: 18 saat (06:00 - 00:00)
- **Toplam Bot**: 2500 bot
- **Bot Arası Gecikme**: 20-60 saniye (rastgele)

### Bot Sıralaması
- Her gün botlar rastgele sıralanır
- Aynı botlar farklı günlerde farklı sırada çalışır
- Bu, daha doğal bir aktivite paterni oluşturur

### Aktivite Türleri
Sistem aşağıdaki aktiviteleri gerçekleştirir:
- ✅ Login ve streak güncellemesi
- 📖 Blog okuma ve ödül kazanma
- 💬 Blog yorumlama (AI ile)
- 💭 Yorumlara cevap verme (AI ile)
- 👍 Yorum beğenme
- 🥗 Diyet başlatma ve tamamlama
- ⭐ Diyet değerlendirme (AI ile)
- 💪 Egzersiz başlatma ve tamamlama
- ⭐ Egzersiz değerlendirme (AI ile)
- 👥 Kullanıcı takip etme
- ✋ High-five gönderme
- 🎯 Circle'a katılma
- 👨‍⚕️ Uzman profili ziyareti
- 💧 Su takibi
- 🍽️ Öğün kaydı
- 👟 Adım kaydı
- 🧮 Hesaplayıcı kullanımı
- 🤖 AI içerik oluşturma

## Log Yönetimi

### Log Dosyaları

**Günlük Loglar**:
- Konum: `C:\Projects\rejimde-bots\logs\daily-YYYY-MM-DD.log`
- Format: Tarih bazlı (örn: `daily-2024-01-15.log`)
- İçerik: Tüm bot aktiviteleri, hatalar, istatistikler

**Manuel Loglar**:
- Konum: `C:\Projects\rejimde-bots\logs\manual-YYYY-MM-DD-HH-MM-SS.log`
- Format: Tarih ve saat bazlı
- İçerik: Manuel çalıştırma kayıtları

### Otomatik Temizleme

Script otomatik olarak 30 günden eski log dosyalarını siler. Bu davranışı değiştirmek için `run-daily.bat` dosyasındaki şu satırı düzenleyin:

```batch
forfiles /p logs /m *.log /d -30 /c "cmd /c del @path" 2>nul
```

`-30` değerini değiştirerek saklama süresini ayarlayabilirsiniz.

## Sorun Giderme

### Bot Çalışmıyor

**1. Task Scheduler görevini kontrol edin**:
```cmd
schtasks /query /tn "RejimdeBotsDaily" /fo LIST
```

**2. Log dosyalarını kontrol edin**:
```cmd
cd C:\Projects\rejimde-bots\logs
dir /o-d
type daily-[tarih].log
```

**3. Node.js ve npm versiyonlarını kontrol edin**:
```cmd
node --version
npm --version
```

**4. Bağımlılıkları yeniden yükleyin**:
```cmd
cd C:\Projects\rejimde-bots
npm install
```

### Yetersiz Bellek Hatası

Node.js bellek limitini artırın:

1. `run-daily.bat` dosyasını düzenleyin
2. npm komutunu şu şekilde değiştirin:
   ```batch
   call node --max-old-space-size=4096 node_modules\ts-node\dist\bin.js src/scripts/scheduled-runner.ts >> %logfile% 2>&1
   ```

### Veritabanı Bağlantı Hatası

1. Veritabanı dosyasının varlığını kontrol edin:
   ```cmd
   dir C:\Projects\rejimde-bots\data\bots.sqlite
   ```

2. Dosya izinlerini kontrol edin (SYSTEM kullanıcısının okuma/yazma yetkisi olmalı)

3. Veritabanını yedekleyin:
   ```cmd
   copy C:\Projects\rejimde-bots\data\bots.sqlite C:\Projects\rejimde-bots\data\bots.sqlite.backup
   ```

### API Bağlantı Hatası

1. `.env` dosyasını kontrol edin:
   ```cmd
   type C:\Projects\rejimde-bots\.env
   ```

2. API URL'nin doğru olduğunu doğrulayın

3. İnternet bağlantısını test edin:
   ```cmd
   ping api.rejimde.com
   ```

4. Firewall ayarlarını kontrol edin (Node.js'in dışarı bağlantı yapabilmesi gerekir)

### OpenAI API Hatası

1. API anahtarının doğru olduğunu kontrol edin
2. API kotanızı kontrol edin (https://platform.openai.com/usage)
3. Rate limit hatası alıyorsanız, `scheduled-runner.ts` içindeki `AI_GENERATION_PROBABILITY` değerini düşürün

## Bakım

### Düzenli Bakım Görevleri

**Haftalık**:
- Log dosyalarını kontrol edin
- Hata sayısını kontrol edin
- Disk alanını kontrol edin

**Aylık**:
- Veritabanını yedekleyin:
  ```cmd
  copy C:\Projects\rejimde-bots\data\bots.sqlite D:\Backups\bots-backup-%date:~-4,4%%date:~-7,2%%date:~-10,2%.sqlite
  ```
- Node.js ve npm güncellemelerini kontrol edin
- Bağımlılıkları güncelleyin:
  ```cmd
  npm update
  ```

**3 Ayda Bir**:
- Sistem performansını değerlendirin
- Bot istatistiklerini analiz edin:
  ```cmd
  npm run report
  ```

## Güvenlik

### Öneriler

1. **API Anahtarları**: `.env` dosyasını asla paylaşmayın veya commit etmeyin
2. **Sistem Kullanıcısı**: Task Scheduler'ı SYSTEM kullanıcısı ile çalıştırın
3. **Güvenlik Duvarı**: Sadece gerekli portları açın
4. **Güncellemeler**: Node.js ve bağımlılıkları düzenli olarak güncelleyin
5. **Yedekleme**: Veritabanını düzenli olarak yedekleyin

## Ek Komutlar

### Görevi Devre Dışı Bırakma
```cmd
schtasks /change /tn "RejimdeBotsDaily" /disable
```

### Görevi Yeniden Etkinleştirme
```cmd
schtasks /change /tn "RejimdeBotsDaily" /enable
```

### Görevi Silme
```cmd
schtasks /delete /tn "RejimdeBotsDaily" /f
```

### Görev Geçmişini Görüntüleme
Task Scheduler GUI'den:
1. Task Scheduler'ı açın
2. "RejimdeBotsDaily" görevini seçin
3. Alt panelde "History" sekmesine tıklayın

## Destek

Sorun yaşarsanız:
1. Log dosyalarını kontrol edin
2. `check-status.bat` çalıştırın
3. GitHub Issues sayfasında sorun bildirin
4. Gerekli log dosyalarını paylaşın (hassas bilgileri çıkardıktan sonra)

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
