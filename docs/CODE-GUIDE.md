# 📚 Rejimde Bots - Kod Rehberi

Bu rehber, projedeki tüm dosyaların ne işe yaradığını açıklar. 

---

## 📁 Proje Yapısı

```
rejimde-bots/
├── src/                          # Ana kaynak kodları
│   ├── scripts/                  # Çalıştırılabilir scriptler
│   │   ├── run-daily.ts          # Hızlı günlük çalıştırma
│   │   ├── scheduled-runner.ts   # 24 saate dağıtılmış çalıştırma
│   │   ├── create-bots.ts        # Yeni bot oluşturma
│   │   └── report. ts             # Raporlama
│   │
│   ├── services/                 # Servisler
│   │   └── openai.service.ts     # AI yorum üretimi
│   │
│   ├── activities/               # Bot aktiviteleri
│   │   └── ai-generator.activity.ts  # AI içerik oluşturma
│   │
│   ├── config/                   # Konfigürasyon dosyaları
│   │   ├── personas.config.ts    # Bot kişilikleri
│   │   ├── writing-styles.config.ts  # Yazım stilleri
│   │   └── comment-prompts.config.ts # Yorum tipleri
│   │
│   ├── database/                 # Veritabanı
│   │   └── bot-db.ts             # SQLite işlemleri
│   │
│   ├── utils/                    # Yardımcı fonksiyonlar
│   │   ├── api-client.ts         # Rejimde API client
│   │   ├── logger.ts             # Log sistemi
│   │   ├── delay.ts              # Bekleme fonksiyonu
│   │   └── random. ts             # Rastgele seçim
│   │
│   └── types/                    # TypeScript tipleri
│       └── index.ts
│
├── scripts/windows/              # Windows scriptleri
│   ├── run-daily. bat             # Günlük çalıştırma
│   ├── setup-task.bat            # Task Scheduler kurulumu
│   ├── check-status.bat          # Durum kontrolü
│   └── run-now. bat               # Manuel çalıştırma
│
├── data/                         # Veritabanı
│   └── bots.sqlite               # Bot verileri
│
├── logs/                         # Log dosyaları
│   └── daily-YYYY-MM-DD. log
│
├── docs/                         # Dokümantasyon
│   ├── WINDOWS-SETUP.md          # Windows kurulum rehberi
│   └── CODE-GUIDE.md             # Bu dosya
│
├── package.json                  # Proje bağımlılıkları
├── tsconfig.json                 # TypeScript ayarları
└── . env                          # Ortam değişkenleri (gizli)
```

---

## 🚀 Ana Scriptler

### 1. `run-daily.ts` - Hızlı Çalıştırma

**Ne yapar:** Tüm botları sırayla hızlıca çalıştırır.

**Ne zaman kullanılır:** Test ve debug için.

```bash
# Tüm botları çalıştır
npm run run-daily

# Sadece 10 bot çalıştır (test)
npm run run-daily -- --limit=10
```

**Akış:**
```
Bot 1 → Login → Blog → Diyet → Egzersiz → Sosyal → Tracking → 3sn bekle
Bot 2 → Login → Blog → Diyet → Egzersiz → Sosyal → Tracking → 3sn bekle
... 
```

---

### 2. `scheduled-runner.ts` - 24 Saat Dağıtılmış Çalıştırma ⭐

**Ne yapar:** 2500 botu 18 saate (06:00-00:00) eşit dağıtarak çalıştırır.

**Ne zaman kullanılır:** Günlük otomatik çalıştırma için (Task Scheduler).

```bash
npm run scheduled-run
```

**Akış:**
```
06:00    - Bot 1 çalışır
06:00: 35 - Bot 2 çalışır (rastgele 20-60sn sonra)
06:01:15 - Bot 3 çalışır
...
23:30    - Son bot çalışır
23:30    - Günlük rapor oluşur
```

**Önemli Ayarlar:**
```typescript
const ACTIVE_HOURS = 18;        // Çalışma saati (06:00-00:00)
const MIN_DELAY_SECONDS = 20;   // Minimum bot arası bekleme
const MAX_DELAY_SECONDS = 60;   // Maximum bot arası bekleme
```

---

### 3. `create-bots.ts` - Bot Oluşturma

**Ne yapar:** Yeni bot hesapları oluşturur.

```bash
npm run create-bots
```

---

## 🤖 Bot Aktiviteleri

Her bot şu aktiviteleri yapabilir:

### Blog Aktiviteleri

| Aktivite | Açıklama | AI Gerekli?  |
|----------|----------|-------------|
| Blog okuma | Rastgele blog okur, XP kazanır | ❌ |
| Yorum beğenme | Başka yorumları beğenir | ❌ |
| Blog yorumu | AI ile yorum yazar | ✅ |
| Reply | Başka yorumlara cevap yazar | ✅ |

### Diyet Aktiviteleri

| Aktivite | Açıklama | AI Gerekli? |
|----------|----------|-------------|
| Diyet başlatma | Yeni diyet programı başlatır | ❌ |
| Diyet tamamlama | Aktif diyeti tamamlar | ❌ |
| Diyet değerlendirme | Tamamlanan diyete yorum + puan | ✅ |

### Egzersiz Aktiviteleri

| Aktivite | Açıklama | AI Gerekli? |
|----------|----------|-------------|
| Egzersiz başlatma | Yeni egzersiz programı başlatır | ❌ |
| Egzersiz tamamlama | Aktif egzersizi tamamlar | ❌ |
| Egzersiz değerlendirme | Tamamlanan egzersize yorum + puan | ✅ |

### Sosyal Aktiviteler

| Aktivite | Açıklama |
|----------|----------|
| Kullanıcı takip | Leaderboard'dan kullanıcı takip eder |
| High-five | Takip edilen kullanıcıya beşlik çakar |
| Circle katılım | Bir circle'a katılır |
| Uzman ziyareti | Uzman profilini ziyaret eder |

### Tracking Aktiviteleri

| Aktivite | Açıklama |
|----------|----------|
| Su loglama | 5-12 bardak su kaydeder |
| Öğün loglama | 1-3 öğün kaydeder |
| Adım loglama | 3000-15000 adım kaydeder |
| Hesaplayıcı | BMI, kalori, su, ideal kilo hesaplar |

---

## 👤 Persona Sistemi

### `personas.config.ts`

7 farklı bot kişiliği: 

| Persona | Aktivite | AI?  | Özellik |
|---------|----------|-----|---------|
| `super_active` | %95 | ✅ | Her gün çok aktif, her şeyi yapar |
| `active` | %75 | ❌ | Düzenli kullanıcı |
| `normal` | %50 | ❌ | Ortalama kullanıcı |
| `low_activity` | %25 | ❌ | Ara sıra giren |
| `dormant` | %8 | ❌ | Nadiren aktif |
| `diet_focused` | %65 | ✅ | Diyet odaklı |
| `exercise_focused` | %65 | ✅ | Egzersiz odaklı |

**Örnek Persona Tanımı:**
```typescript
super_active: {
  activityFrequency: 0.95,  // %95 her gün aktif
  aiEnabled: true,          // AI yorum yapabilir
  emojiFrequency: 'high',   // Çok emoji kullanır
  writingStyles: ['enthusiastic', 'casual', 'supportive'],
  behaviors: {
    blogReading: 0.85,      // %85 blog okur
    blogCommenting: 0.30,   // %30 yorum yapar
    replyToComments: 0.25,  // %25 reply yapar
    dietStart: 0.70,        // %70 diyet başlatır
    // ... 
  }
}
```

---

## 🧠 AI Servisi

### `openai.service.ts`

OpenAI GPT-4o-mini kullanarak yorum üretir. 

**Fonksiyonlar:**

| Fonksiyon | Açıklama |
|-----------|----------|
| `generateBlogComment()` | Blog için yorum üretir |
| `generateCommentReply()` | Yoruma cevap üretir |
| `generateDietComment()` | Diyet değerlendirmesi üretir |
| `generateExerciseComment()` | Egzersiz değerlendirmesi üretir |

**Yorum Uzunluğu Dağılımı:**
```
%25 - Micro (2-5 kelime): "Net anlatım."
%35 - Kısa (1 cümle): "Pratik öneriler içeriyor."
%30 - Orta (1-2 cümle): "Dengeli görünüyor.  Denemeye değer."
%10 - Uzun (2-3 cümle): Detaylı yorum
```

---

## 🌐 API Client

### `api-client.ts`

Rejimde API ile iletişim kurar.

**Önemli Metodlar:**

```typescript
// Auth
client.login(username, password)
client.register(data)

// Blog
client.getBlogs({ limit:  30 })
client.getBlog(id)
client.claimBlogReward(blogId)
client.getComments(postId)
client.createComment({ post, content, parent?, rating?, context })
client.likeComment(commentId)

// Diyet
client.getDiets({ limit: 20 })
client.startPlan(dietId)
client.completePlan(dietId)

// Egzersiz
client.getExercises({ limit: 20 })
client.startExerciseProgress(exerciseId)
client.completeExerciseProgress(exerciseId)

// Sosyal
client.followUser(userId)
client.sendHighFive(userId)
client.getLeaderboard({ limit: 50 })
client.joinCircle(circleId)
client.getExperts({ limit: 20 })

// Events
client.dispatchEvent(eventType, entityType, entityId, context)

// AI Generator
client.generateDiet(formData)
client.generateExercise(formData)
```

---

## 💾 Veritabanı

### `bot-db.ts`

SQLite veritabanı işlemleri. 

**Tablolar:**
```
bots              - Bot hesap bilgileri
bot_states        - Bot durumları (okunan bloglar, takip edilenler, vs.)
activity_logs     - Aktivite logları
```

**Önemli Metodlar:**
```typescript
botDb.getActiveBots()           // Tüm aktif botları getir
botDb. getState(botId)           // Bot durumunu getir
botDb.updateState(botId, data)  // Bot durumunu güncelle
botDb.updateLogin(botId, streak)// Login bilgisini güncelle
botDb.logActivity(...)          // Aktivite logla
```

**BotState Yapısı:**
```typescript
interface BotState {
  read_blogs: number[];         // Okunan blog ID'leri
  commented_posts: number[];    // Yorum yapılan postlar
  replied_comments: number[];   // Cevap verilen yorumlar
  liked_comments: number[];     // Beğenilen yorumlar
  started_diets: number[];      // Başlatılan diyetler
  completed_diets: number[];    // Tamamlanan diyetler
  reviewed_diets: number[];     // Değerlendirilen diyetler
  active_diet_id: number | null;
  started_exercises: number[];
  completed_exercises:  number[];
  reviewed_exercises: number[];
  active_exercise_id: number | null;
  followed_users: number[];     // Takip edilen kullanıcılar
  circle_id: number | null;     // Üye olunan circle
}
```

---

## 🪟 Windows Scriptleri

### `scripts/windows/`

| Script | Açıklama | Kullanım |
|--------|----------|----------|
| `run-daily.bat` | Task Scheduler çalıştırır | Otomatik |
| `setup-task.bat` | Task Scheduler görevi oluşturur | 1 kez çalıştır |
| `check-status.bat` | Sistem durumunu gösterir | İstediğin zaman |
| `run-now.bat` | Manuel çalıştırma | Test için |

---

## ⚙️ Ortam Değişkenleri

### `.env`

```env
REJIMDE_API_URL=https://api.rejimde.com/wp-json
OPENAI_API_KEY=sk-...
```

---

## 📊 Günlük Rapor Örneği

```
════════════════════════════════════════════════════════════════
                    📊 GÜNLÜK RAPOR
════════════════════════════════════════════════════════════════
  ⏱️  Toplam süre:  1080 dakika (18.0 saat)
  ✅ İşlenen:  1132
  ⏩ Atlanan: 1368
  ❌ Hata: 0
────────────────────────────────────────────────────────────────
  📝 AKTİVİTELER: 
     🔐 Login: 1132
     📖 Blog okuma:  890
     💬 Blog yorumu: 41
     ↩️  Reply: 38
     🥗 Diyet başlatma: 156
     🎉 Diyet tamamlama: 89
     ⭐ Diyet değerlendirme: 24
     💪 Egzersiz başlatma: 203
     🏆 Egzersiz tamamlama: 112
     ⭐ Egzersiz değerlendirme: 30
     👥 Takip:  245
     ❤️  Beğeni:  312
     🤖 AI içerik:  5
     💧 Su log: 678
     🍽️  Öğün log: 534
     👟 Adım log:  789
════════════════════════════════════════════════════════════════
```

---

## 🔧 Sık Kullanılan Komutlar

```bash
# Test (5 bot)
npm run run-daily -- --limit=5

# Test (10 bot)
npm run run-daily -- --limit=10

# 24 saate dağıtılmış çalıştırma
npm run scheduled-run

# Rapor görüntüleme
npm run report
```

---

## 📈 Günlük Aktivite Tahmini (2500 Bot)

| Aktivite | Tahmini Sayı | Not |
|----------|--------------|-----|
| Aktif Bot | ~1132 | Persona'ya göre değişir |
| Blog Okuma | ~890 | |
| Blog Yorumu | ~41 | Sadece AI-enabled |
| Reply | ~42 | Sadece AI-enabled |
| Diyet Değerlendirme | ~24 | Tamamlanmış diyet gerekli |
| Egzersiz Değerlendirme | ~30 | Tamamlanmış egzersiz gerekli |
| AI İçerik | 5 | Global limit |
| Takip | ~200+ | |
| Beğeni | ~300+ | |

---

## ❓ SSS

**S:  Neden bazı botlar atlanıyor?**

C: `activityFrequency` ayarına göre. Örneğin `dormant` botların %92'si atlanır. 

**S: AI yorumları neden çalışmıyor?**

C:  Sadece `aiEnabled:  true` olan personalar AI kullanabilir (super_active, diet_focused, exercise_focused).

**S: Reply neden çalışmıyordu?**

C:  `parent === 0` kontrolü düzeltildi.  Artık `parent === 0 || null || "0" || undefined` kontrol ediliyor.

**S: Günde kaç yorum oluşuyor?**

C: Yaklaşık 40-50 blog yorumu, 40-50 reply, 25-30 diyet değerlendirmesi, 30-35 egzersiz değerlendirmesi. 

**S: Task Scheduler çalışmıyor, ne yapmalıyım?**

C:  `scripts/windows/check-status.bat` çalıştırarak durumu kontrol et.  Task Scheduler'da "History" sekmesinden hataları incele.

**S: Veritabanı nerede?**

C:  `data/bots.sqlite` dosyasında.  SQLite formatında. 

**S:  Loglar nerede?**

C: `logs/daily-YYYY-MM-DD.log` dosyalarında.

---

## 🔗 Dosya Bağlantıları

| Dosya | Açıklama |
|-------|----------|
| [WINDOWS-SETUP.md](./WINDOWS-SETUP.md) | Windows kurulum rehberi |
| [package.json](../package.json) | Proje bağımlılıkları |
| [. env.example](../.env.example) | Örnek ortam değişkenleri |

---

*Son güncelleme:  Ocak 2026*