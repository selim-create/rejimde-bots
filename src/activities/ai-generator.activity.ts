import { LocalBot, BotState, AIGeneratorState } from '../types';
import { RejimdeAPIClient } from '../utils/api-client';
import { botDb } from '../database/bot-db';
import { logger } from '../utils/logger';
import { generateRandomDietFormData, generateRandomExerciseFormData } from '../config/ai-generator.config';

// Günlük limitler
const DAILY_DIET_LIMIT = 2;
const DAILY_EXERCISE_LIMIT = 2;
const DAILY_TOTAL_LIMIT = 4;

/**
 * Bot için AI içerik oluşturma aktivitesi
 * - Günlük limitleri kontrol eder
 * - Rastgele diyet veya egzersiz oluşturur
 * - State'i günceller
 */
export async function performAIGeneratorActivity(
  bot: LocalBot,
  state: BotState,
  client: RejimdeAPIClient
): Promise<{ success: boolean; type?: 'diet' | 'exercise'; id?: number }> {
  try {
    // AI state'i al veya oluştur
    let aiState: AIGeneratorState = state.ai_generator || {
      created_diets_today: 0,
      created_exercises_today: 0,
      created_diet_ids: [],
      created_exercise_ids: [],
      last_generation_date: new Date().toISOString().split('T')[0],
    };

    // Tarih kontrolü - yeni gün başladıysa sıfırla
    const today = new Date().toISOString().split('T')[0];
    if (aiState.last_generation_date !== today) {
      aiState.created_diets_today = 0;
      aiState.created_exercises_today = 0;
      aiState.last_generation_date = today;
    }

    // Toplam günlük limit kontrolü
    const totalCreatedToday = aiState.created_diets_today + aiState.created_exercises_today;
    if (totalCreatedToday >= DAILY_TOTAL_LIMIT) {
      logger.debug(`[${bot.username}] Günlük AI oluşturma limiti doldu (${totalCreatedToday}/${DAILY_TOTAL_LIMIT})`);
      return { success: false };
    }

    // Rastgele karar: Diyet mi Egzersiz mi?
    // Limitleri göz önünde bulundurarak karar ver
    const canCreateDiet = aiState.created_diets_today < DAILY_DIET_LIMIT;
    const canCreateExercise = aiState.created_exercises_today < DAILY_EXERCISE_LIMIT;

    if (!canCreateDiet && !canCreateExercise) {
      logger.debug(`[${bot.username}] Her iki kategoride de günlük limit doldu`);
      return { success: false };
    }

    // Rastgele seç (her ikisi de uygunsa %50-%50)
    let createDiet = true;
    if (canCreateDiet && canCreateExercise) {
      createDiet = Math.random() < 0.5;
    } else if (!canCreateDiet) {
      createDiet = false;
    }

    // İlgili fonksiyonu çağır
    if (createDiet) {
      return await createDiet_internal(bot, aiState, client, state);
    } else {
      return await createExercise_internal(bot, aiState, client, state);
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] AI oluşturma aktivitesi hatası: ${error.message}`);
    return { success: false };
  }
}

/**
 * AI Diyet Oluştur
 * - generateRandomDietFormData() ile rastgele form oluşturur
 * - client.generateDiet() ile API'ye gönderir
 * - Başarılı ise state günceller ve loglar
 */
async function createDiet_internal(
  bot: LocalBot,
  aiState: AIGeneratorState,
  client: RejimdeAPIClient,
  state: BotState
): Promise<{ success: boolean; type: 'diet'; id?: number }> {
  try {
    logger.bot(bot.username, '🤖 AI diyet oluşturuluyor...');

    // Rastgele form verisi oluştur
    const formData = generateRandomDietFormData();

    // API'ye gönder
    const result = await client.generateDiet(formData);

    if (result.success && result.data?.id) {
      // State güncelle
      aiState.created_diets_today++;
      aiState.created_diet_ids.push(result.data.id);
      
      state.ai_generator = aiState;
      botDb.updateState(bot.id, { ai_generator: aiState });

      // Activity log
      botDb.logActivity(bot.id, 'ai_diet_created', 'diet', result.data.id, true);

      // Log mesajı
      const dietType = formData.diet_type || 'Diyet';
      const days = formData.days || '7';
      logger.bot(bot.username, `🥗 AI Diyet oluşturuldu: "${result.data.title}" (${dietType}, ${days} gün)`);

      return { success: true, type: 'diet', id: result.data.id };
    } else {
      logger.debug(`[${bot.username}] AI diyet oluşturulamadı: ${result.message || 'Bilinmeyen hata'}`);
      botDb.logActivity(bot.id, 'ai_diet_created', 'diet', null, false, result.message);
      return { success: false, type: 'diet' };
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] AI diyet oluşturma hatası: ${error.message}`);
    botDb.logActivity(bot.id, 'ai_diet_created', 'diet', null, false, error.message);
    return { success: false, type: 'diet' };
  }
}

/**
 * AI Egzersiz Oluştur
 * - generateRandomExerciseFormData() ile rastgele form oluşturur
 * - client.generateExercise() ile API'ye gönderir
 * - Başarılı ise state günceller ve loglar
 */
async function createExercise_internal(
  bot: LocalBot,
  aiState: AIGeneratorState,
  client: RejimdeAPIClient,
  state: BotState
): Promise<{ success: boolean; type: 'exercise'; id?: number }> {
  try {
    logger.bot(bot.username, '🤖 AI egzersiz oluşturuluyor...');

    // Rastgele form verisi oluştur
    const formData = generateRandomExerciseFormData();

    // API'ye gönder
    const result = await client.generateExercise(formData);

    if (result.success && result.data?.id) {
      // State güncelle
      aiState.created_exercises_today++;
      aiState.created_exercise_ids.push(result.data.id);
      
      state.ai_generator = aiState;
      botDb.updateState(bot.id, { ai_generator: aiState });

      // Activity log
      botDb.logActivity(bot.id, 'ai_exercise_created', 'exercise', result.data.id, true);

      // Log mesajı
      const fitnessLevel = formData.fitness_level || 'intermediate';
      const days = formData.days || '14';
      logger.bot(bot.username, `💪 AI Egzersiz oluşturuldu: "${result.data.title}" (${fitnessLevel}, ${days} gün)`);

      return { success: true, type: 'exercise', id: result.data.id };
    } else {
      logger.debug(`[${bot.username}] AI egzersiz oluşturulamadı: ${result.message || 'Bilinmeyen hata'}`);
      botDb.logActivity(bot.id, 'ai_exercise_created', 'exercise', null, false, result.message);
      return { success: false, type: 'exercise' };
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] AI egzersiz oluşturma hatası: ${error.message}`);
    botDb.logActivity(bot.id, 'ai_exercise_created', 'exercise', null, false, error.message);
    return { success: false, type: 'exercise' };
  }
}
