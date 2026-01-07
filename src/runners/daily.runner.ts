import { Database } from '../database/sqlite';
import { ApiService } from '../services/api.service';
import { OpenAIService } from '../services/openai.service';
import { PERSONAS } from '../config/personas.config';
import { logger } from '../utils/logger';
import { delay, shouldPerformAction } from '../utils/random';

// Activities
import { performLogin } from '../activities/login.activity';
import { performBlogActivities } from '../activities/blog. activity';
import { performDietActivities } from '../activities/diet.activity';
import { performExerciseActivities } from '../activities/exercise.activity';
import { performSocialActivities } from '../activities/social.activity';
import { performTrackingActivities } from '../activities/tracking.activity';

const DELAY_BETWEEN_BOTS = 2000; // 2 saniye
const DELAY_BETWEEN_ACTIVITIES = 500; // 500ms

export async function runDailyActivities(): Promise<void> {
  const db = new Database();
  const api = new ApiService();
  const openai = new OpenAIService();
  
  logger.info('🚀 Günlük bot aktiviteleri başlıyor...');
  
  // Aktif botları al
  const bots = db.getActiveBots();
  logger.info(`📊 Toplam ${bots.length} aktif bot`);
  
  let processed = 0;
  let errors = 0;
  
  for (const bot of bots) {
    try {
      const persona = PERSONAS[bot.persona];
      if (!persona) continue;
      
      // Bugün aktif olacak mı?
      if (! shouldPerformAction(persona.activityFrequency)) {
        logger. debug(`[${bot.username}] Bugün inaktif (persona: ${bot.persona})`);
        continue;
      }
      
      logger.info(`\n🤖 ${bot.username} (${bot.persona})`);
      
      // Bot state'ini al
      const state = db.getBotState(bot.id);
      
      // 1. Login
      const loggedIn = await performLogin(bot, api, db);
      if (!loggedIn) {
        errors++;
        continue;
      }
      await delay(DELAY_BETWEEN_ACTIVITIES);
      
      // 2. Blog aktiviteleri
      await performBlogActivities(bot, state, api, db, persona. aiEnabled ?  openai : undefined);
      await delay(DELAY_BETWEEN_ACTIVITIES);
      
      // 3. Diyet aktiviteleri
      await performDietActivities(bot, state, api, db);
      await delay(DELAY_BETWEEN_ACTIVITIES);
      
      // 4. Egzersiz aktiviteleri
      await performExerciseActivities(bot, state, api, db);
      await delay(DELAY_BETWEEN_ACTIVITIES);
      
      // 5. Sosyal aktiviteler
      await performSocialActivities(bot, state, api, db);
      await delay(DELAY_BETWEEN_ACTIVITIES);
      
      // 6. Tracking aktiviteleri
      await performTrackingActivities(bot, api, db);
      
      processed++;
      
      // Rate limiting
      await delay(DELAY_BETWEEN_BOTS);
      
    } catch (error:  any) {
      logger.error(`[${bot.username}] Kritik hata: ${error. message}`);
      errors++;
    }
  }
  
  logger. info('\n📊 GÜNLÜK RAPOR');
  logger.info(`   ✓ İşlenen: ${processed}`);
  logger.info(`   ✗ Hata:  ${errors}`);
  logger.info(`   ⏩ Atlanan: ${bots. length - processed - errors}`);
  
  db.close();
}