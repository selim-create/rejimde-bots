import dotenv from 'dotenv';
dotenv.config();

import { botDb } from '../database/bot-db';
import { RejimdeAPIClient } from '../utils/api-client';
import { PERSONA_CONFIGS, shouldDoActivity } from '../config/personas.config';
import { logger } from '../utils/logger';
import { delay } from '../utils/delay';
import { randomInt } from '../utils/random';
import { logRandomMeal } from '../activities/meal-logger';
import { StoredBot, PersonaType } from '../types';

const DELAY_BETWEEN_BOTS = 3000; // 3 saniye

interface DailyStats {
  botsProcessed: number;
  botsSkipped: number;
  mealsLogged: number;
  waterLogged: number;
  errors: number;
}

async function runDailyActivities() {
  logger.info('🤖 Günlük Bot Aktiviteleri Başlıyor.. .');
  console.log('');

  const stats:  DailyStats = {
    botsProcessed: 0,
    botsSkipped: 0,
    mealsLogged: 0,
    waterLogged: 0,
    errors: 0,
  };

  const bots = botDb.getActiveBots();
  logger.info(`📊 Toplam ${bots.length} aktif bot bulundu`);
  console.log('');

  for (const bot of bots) {
    try {
      const processed = await processBotDailyActivity(bot, stats);
      if (processed) {
        stats. botsProcessed++;
      } else {
        stats.botsSkipped++;
      }
      
      // Rate limiting
      await delay(DELAY_BETWEEN_BOTS);
    } catch (error:  any) {
      stats.errors++;
      logger.error(`Bot hatası [${bot.username}]: ${error.message}`);
    }
  }

  // Özet
  console.log('');
  console.log('========================================');
  logger.info('📊 GÜNLÜK AKTİVİTE TAMAMLANDI');
  console.log('========================================');
  console.log(`  ✅ İşlenen Bot:  ${stats.botsProcessed}`);
  console.log(`  ⏭️ Atlanan Bot: ${stats. botsSkipped}`);
  console.log(`  🍽️ Yemek Kaydı: ${stats.mealsLogged}`);
  console.log(`  💧 Su Kaydı:  ${stats.waterLogged}`);
  console.log(`  ❌ Hata: ${stats.errors}`);
  console.log('========================================');
}

async function processBotDailyActivity(bot: StoredBot, stats: DailyStats): Promise<boolean> {
  const config = PERSONA_CONFIGS[bot.persona as PersonaType];
  if (!config) {
    logger.warn(`Bilinmeyen persona:  ${bot.persona}`);
    return false;
  }

  // Bu bot bugün giriş yapacak mı?
  if (! shouldDoActivity(config.activities.daily_login)) {
    logger. bot(bot. username, `Bugün aktif değil (${bot.persona})`, 'skip');
    return false;
  }

  logger.bot(bot.username, `Aktivite başlıyor (${bot.persona})`);

  // API client oluştur ve login ol
  const client = new RejimdeAPIClient();
  const loginResult = await client.login(bot.username, bot.password);

  if (loginResult.status !== 'success') {
    logger. bot(bot.username, `Giriş başarısız:  ${loginResult.message}`, 'fail');
    stats.errors++;
    return false;
  }

  // Son giriş güncelle
  botDb.updateLastLogin(bot.id);

  // Yemek kayıtları
  if (shouldDoActivity(config. activities.meal_log)) {
    const mealCount = randomInt(1, 4);
    const mealTypes:  ('breakfast' | 'lunch' | 'dinner' | 'snack')[] = ['breakfast', 'lunch', 'dinner', 'snack'];
    
    for (let i = 0; i < mealCount; i++) {
      const mealType = mealTypes[i % mealTypes. length];
      const result = await logRandomMeal(client, mealType);
      
      if (result.success) {
        stats.mealsLogged++;
        logger.bot(bot.username, `🍽️ ${result.mealName} (${result.calories} kcal)`);
      }
      
      await delay(1000);
    }
  }

  // Su kaydı
  if (shouldDoActivity(config.activities. water_log)) {
    const glasses = randomInt(4, 12);
    // TODO: client.logWater(glasses) eklenecek
    stats.waterLogged++;
    logger.bot(bot.username, `💧 ${glasses} bardak su`);
  }

  // Aktivite güncelle
  botDb.updateLastActivity(bot.id);

  return true;
}

// CLI
runDailyActivities().catch(console.error);