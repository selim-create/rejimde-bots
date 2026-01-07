import { LocalBot, BotState, DietPlan } from '../types';
import { RejimdeAPIClient } from '../utils/api-client';
import { botDb } from '../database/bot-db';
import { PersonaConfig } from '../config/personas.config';
import { logger } from '../utils/logger';
import { shouldPerform, pickRandom } from '../utils/random';

export async function performDietActivities(
  bot: LocalBot,
  state: BotState,
  client: RejimdeAPIClient,
  persona: PersonaConfig
): Promise<void> {
  if (!persona) return;
  
  // Aktif diyet varsa tamamlama kontrolü
  if (state.active_diet_id) {
    if (shouldPerform(persona.behaviors.dietComplete)) {
      await completeDiet(bot, state, client);
    }
  } else {
    // Yeni diyet başlatma
    if (shouldPerform(persona.behaviors.dietStart)) {
      await startNewDiet(bot, state, client);
    }
  }
}

async function startNewDiet(
  bot: LocalBot,
  state: BotState,
  client: RejimdeAPIClient
): Promise<void> {
  try {
    const diets = await client.getDiets({ limit: 30 });
    const available = diets.filter((d: DietPlan) => 
      !state. started_diets.includes(d.id) && 
      !state. completed_diets.includes(d.id)
    );
    
    if (available.length === 0) {
      logger.debug(`[${bot.username}] Başlanabilecek diyet kalmadı`);
      return;
    }
    
    const diet = pickRandom(available);
    
    // Progress endpoint kullan
    const result = await client.startDiet(diet.id);
    
    if (result.status === 'success') {
      state.started_diets.push(diet.id);
      state.active_diet_id = diet.id;
      botDb.updateState(bot.id, {
        started_diets: state.started_diets,
        active_diet_id: diet.id
      });
      botDb.logActivity(bot.id, 'diet_start', 'diet', diet.id, true);
      logger.bot(bot.username, `Diyet başlatıldı: "${diet.title}"`);
    } else if (result.message?.includes('already') || result.message?. includes('zaten')) {
      // Zaten başlatılmış - state güncelle
      state.started_diets.push(diet. id);
      state.active_diet_id = diet.id;
      botDb.updateState(bot.id, {
        started_diets: state.started_diets,
        active_diet_id: diet.id
      });
      logger.debug(`[${bot.username}] Diyet zaten başlatılmış: ${diet.id}`);
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] Diyet başlatma hatası: ${error.message}`);
  }
}

async function completeDiet(
  bot: LocalBot,
  state: BotState,
  client: RejimdeAPIClient
): Promise<void> {
  try {
    if (! state.active_diet_id) return;
    
    const dietId = state.active_diet_id;
    
    // Progress endpoint kullan
    const result = await client.completeDiet(dietId);
    
    if (result.status === 'success') {
      state. completed_diets. push(dietId);
      state.active_diet_id = null;
      botDb.updateState(bot.id, {
        completed_diets: state.completed_diets,
        active_diet_id: null
      });
      botDb.logActivity(bot.id, 'diet_complete', 'diet', dietId, true);
      
      const points = (result.data as any)?.reward_points || (result.data as any)?.points_earned || 0;
      logger.bot(bot.username, `Diyet tamamlandı!  🎉 +${points} puan`);
    } else if (result. message?.includes('already') || result.message?.includes('zaten')) {
      // Zaten tamamlanmış
      state.completed_diets.push(dietId);
      state.active_diet_id = null;
      botDb. updateState(bot. id, {
        completed_diets:  state.completed_diets,
        active_diet_id:  null
      });
      logger.debug(`[${bot.username}] Diyet zaten tamamlanmış: ${dietId}`);
    } else {
      logger.debug(`[${bot.username}] Diyet tamamlanamadı: ${result.message}`);
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] Diyet tamamlama hatası: ${error.message}`);
  }
}