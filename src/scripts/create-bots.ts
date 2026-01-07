console.log('=== CREATE BOTS SCRIPT STARTED ===');
import dotenv from 'dotenv';
dotenv.config();

import { RejimdeAPIClient } from '../utils/api-client';
import { generateBotUser } from '../generators/user-generator';
import { PERSONA_CONFIGS } from '../config/personas.config';
import { botDb } from '../database/bot-db';
import { logger } from '../utils/logger';
import { delay } from '../utils/delay';
import { PersonaType } from '../types';

// Ayarlar
const BATCH_ID = `batch_${Date.now()}`;
const DELAY_BETWEEN_USERS = 2000; // 2 saniye

interface CreateBotsOptions {
  count?:  number; // Toplam oluşturulacak bot sayısı (default: 1000)
  startFrom?: number; // Kaçıncı bottan başlansın
  personaFilter?: PersonaType; // Sadece belirli persona
  dryRun?: boolean; // API çağrısı yapmadan test
}

async function createBots(options: CreateBotsOptions = {}) {
  console.log('=== FUNCTION STARTED ===');
  console.log('Options:', options);
  const {
    count = 1000,
    startFrom = 0,
    personaFilter,
    dryRun = false,
  } = options;

  logger.info(`🤖 Bot Oluşturma Başlıyor`);
  logger.info(`📦 Batch ID: ${BATCH_ID}`);
  logger.info(`🎯 Hedef:  ${count} bot`);
  if (dryRun) {
    logger.warn('⚠️ DRY RUN MODE - API çağrısı yapılmayacak');
  }
  console.log('');

  const client = new RejimdeAPIClient();
  
  let totalCreated = 0;
  let totalFailed = 0;
  let currentIndex = startFrom;

  // Her persona için bot oluştur
  for (const [personaName, config] of Object.entries(PERSONA_CONFIGS)) {
    const persona = personaName as PersonaType;
    
    // Filtre varsa kontrol et
    if (personaFilter && persona !== personaFilter) {
      continue;
    }

    // Bu persona için kaç bot oluşturulacak
    let personaCount = config.count;
    
    // Toplam limit kontrolü
    if (totalCreated + personaCount > count) {
      personaCount = count - totalCreated;
    }

    if (personaCount <= 0) break;

    logger.info(`📋 ${persona}:  ${personaCount} bot oluşturuluyor... `);

    for (let i = 0; i < personaCount; i++) {
      try {
        // Kullanıcı profili oluştur
        const userProfile = generateBotUser({
          persona,
          batchId: BATCH_ID,
          index: currentIndex,
        });

        if (dryRun) {
          // Dry run - sadece log
          logger.bot(userProfile. username, `[DRY RUN] Oluşturulacak:  ${userProfile.name}`);
          totalCreated++;
          currentIndex++;
          continue;
        }

        // API üzerinden kayıt ol
        const response = await client.register({
          username: userProfile.username,
          email: userProfile. email,
          password: userProfile.password,
          role: 'rejimde_user',
          meta: {
            // Ad Soyad
            first_name:  userProfile.name. split(' ')[0],
            last_name: userProfile. name.split(' ').slice(1).join(' '),
            name: userProfile.name,
            
            // Temel bilgiler
            gender: userProfile.gender,
            birth_date: userProfile. birth_date,
            height: String(userProfile.height),
            weight: String(userProfile.current_weight),
            current_weight: String(userProfile.current_weight),
            target_weight: String(userProfile.target_weight),
            goal:  userProfile.goal,
            activity_level: userProfile.activity_level,
            
            // Motto/Bio - description olarak gönder
            description: userProfile.description,
            
            // Lokasyon ve avatar
            location: userProfile.location,
            avatar_url: userProfile. avatar_url,
            
            // Simulation flags
            is_simulation: '1',
            simulation_persona: persona,
            simulation_batch:  BATCH_ID,
            simulation_active: '1',
          },
        });

        if (response.status === 'success' && response.data) {
        // Güncellenmiş: 
        botDb.saveBot({
          user_id: response.data. user_id,
          username: userProfile.username,
          email: userProfile. email,
          password: userProfile.password,
          persona,
          batch_id: BATCH_ID,
          gender:  userProfile.gender,
          height: userProfile.height,
          current_weight:  userProfile.current_weight,
          target_weight: userProfile.target_weight,
          goal: userProfile.goal,
          activity_level:  userProfile.activity_level,
          location: userProfile.location,
        });

          totalCreated++;
          logger.bot(userProfile.username, `Oluşturuldu (${totalCreated}/${count})`);
        } else {
          totalFailed++;
          logger.bot(userProfile. username, `Başarısız:  ${response.message}`, 'fail');
        }

        currentIndex++;

        // Rate limiting
        await delay(DELAY_BETWEEN_USERS);

      } catch (error:  any) {
        totalFailed++;
        logger.error(`Bot oluşturma hatası: ${error.message}`);
        
        // Hata durumunda biraz daha bekle
        await delay(5000);
      }

      // Her 50 botta özet
      if ((totalCreated + totalFailed) % 50 === 0) {
        logger.info(`📊 İlerleme: ${totalCreated} başarılı, ${totalFailed} başarısız`);
      }
    }
  }

  // Final özet
  console.log('');
  console.log('========================================');
  logger.info('📊 BOT OLUŞTURMA TAMAMLANDI');
  console.log('========================================');
  console.log(`  Batch ID: ${BATCH_ID}`);
  console.log(`  ✅ Başarılı: ${totalCreated}`);
  console.log(`  ❌ Başarısız: ${totalFailed}`);
  console.log(`  📈 Başarı Oranı: ${((totalCreated / (totalCreated + totalFailed)) * 100).toFixed(1)}%`);
  console.log('========================================');

  // Database stats
  const stats = botDb. getStats();
  console.log('');
  logger.info('📦 Veritabanı Durumu: ');
  console.log(`  Toplam Bot:  ${stats.total}`);
  console.log(`  Aktif Bot: ${stats.active}`);
}

// CLI argümanları
const args = process.argv. slice(2);
const options: CreateBotsOptions = {};

args.forEach(arg => {
  if (arg.startsWith('--count=')) {
    options.count = parseInt(arg.split('=')[1]);
  }
  if (arg.startsWith('--persona=')) {
    options.personaFilter = arg.split('=')[1] as PersonaType;
  }
  if (arg === '--dry-run') {
    options.dryRun = true;
  }
});

// Çalıştır
createBots(options).catch(console.error);