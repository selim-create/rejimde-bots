import { Bot, BotState } from '../types/bot.types';
import { ApiService } from '../services/api.service';
import { Database } from '../database/sqlite';
import { PERSONAS } from '../config/personas.config';
import { logger } from '../utils/logger';
import { shouldPerformAction, pickRandom } from '../utils/random';

export async function performDietActivities(
  bot:  Bot,
  state: BotState,
  api: ApiService,
  db: Database
): Promise<void> {
  const persona = PERSONAS[bot.persona];
  if (!persona) return;
  
  // Aktif diyet varsa tamamlama kontrolü
  if (bot.activeDietId) {
    if (shouldPerformAction(persona.behaviors.dietComplete)) {
      await completeDiet(bot, state, api, db);
    }
  } else {
    // Yeni diyet başlatma
    if (shouldPerformAction(persona.behaviors. dietStart)) {
      await startNewDiet(bot, state, api, db);
    }
  }
}

async function startNewDiet(
  bot: Bot,
  state: BotState,
  api: ApiService,
  db: Database
): Promise<void> {
  try {
    // Henüz başlamadığımız diyetler
    const diets = await api.getDiets({ limit: 30 });
    const available = diets.filter(d => 
      ! state.startedDiets.includes(d.id) && 
      ! state.completedDiets.includes(d.id)
    );
    
    if (available. length === 0) {
      logger. debug(`[${bot.username}] Başlanabilecek diyet kalmadı`);
      return;
    }
    
    const diet = pickRandom(available);
    
    const result = await api. startPlan(bot.token, diet.id);
    
    if (result.success) {
      state.startedDiets.push(diet.id);
      db.updateBotState(bot.id, state);
      db.updateBotActiveDiet(bot. id, diet.id);
      db.logActivity(bot.id, 'diet_start', 'diet', diet. id, true);
      logger.success(`[${bot.username}] Diyet başlatıldı: "${diet. title}"`);
    }
  } catch (error: any) {
    logger. error(`[${bot.username}] Diyet başlatma hatası: ${error.message}`);
  }
}

async function completeDiet(
  bot:  Bot,
  state: BotState,
  api: ApiService,
  db: Database
): Promise<void> {
  try {
    if (! bot.activeDietId) return;
    
    const result = await api.completePlan(bot.token, bot.activeDietId);
    
    if (result.success) {
      state.completedDiets.push(bot.activeDietId);
      db.updateBotState(bot.id, state);
      db.updateBotActiveDiet(bot.id, null);
      db.logActivity(bot. id, 'diet_complete', 'diet', bot.activeDietId, true);
      logger.success(`[${bot.username}] Diyet tamamlandı!  +${result.data?. reward_points || 0} puan`);
    }
  } catch (error: any) {
    logger. error(`[${bot.username}] Diyet tamamlama hatası: ${error.message}`);
  }
}

// Exercise için benzer yapı... 