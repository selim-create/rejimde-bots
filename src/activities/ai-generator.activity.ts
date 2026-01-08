import { LocalBot, BotState, AIGeneratorState } from '../types';
import { RejimdeAPIClient } from '../utils/api-client';
import { botDb } from '../database/bot-db';
import { logger } from '../utils/logger';
import { generateRandomDietFormData, generateRandomExerciseFormData, GLOBAL_LIMITS } from '../config/ai-generator.config';

/**
 * Bot için AI içerik oluşturma aktivitesi
 * - Global günlük limitleri kontrol eder
 * - Rastgele diyet veya egzersiz oluşturur
 * - State'i günceller
 */
export async function performAIGeneratorActivity(
  bot: LocalBot,
  state: BotState,
  client: RejimdeAPIClient
): Promise<{ success: boolean; type?: 'diet' | 'exercise'; id?: number }> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Global limit kontrolü (hızlı ön-kontrol, kesin değil)
    // Not: Bu kontrol ile rezervasyon arasında race condition olabilir,
    // ancak bu kasıtlı bir tasarım - gereksiz rezervasyon denemelerini azaltmak için
    const canDiet = botDb.canCreateDiet(today, GLOBAL_LIMITS.DAILY_DIET_LIMIT);
    const canExercise = botDb.canCreateExercise(today, GLOBAL_LIMITS.DAILY_EXERCISE_LIMIT);

    if (!canDiet && !canExercise) {
      logger.debug(`[${bot.username}] Günlük global limit doldu, içerik oluşturulmayacak`);
      return { success: false };
    }

    // 2. Rastgele seç (sadece uygun olanlardan)
    // %40 diyet, %60 egzersiz tercih ediliyor
    let createDiet = false;
    if (canDiet && canExercise) {
      createDiet = Math.random() < 0.4; // %40 diyet, %60 egzersiz
    } else if (canDiet) {
      createDiet = true;
    } else {
      createDiet = false;
    }

    // AI state'i al veya oluştur (tracking için)
    let aiState: AIGeneratorState = state.ai_generator || {
      created_diets_today: 0,
      created_exercises_today: 0,
      created_diet_ids: [],
      created_exercise_ids: [],
      last_generation_date: today,
    };

    // Tarih kontrolü - yeni gün başladıysa sıfırla
    if (aiState.last_generation_date !== today) {
      aiState.created_diets_today = 0;
      aiState.created_exercises_today = 0;
      aiState.last_generation_date = today;
    }

    // 3. İlgili fonksiyonu çağır
    if (createDiet) {
      return await createDiet_internal(bot, aiState, client, state, today);
    } else {
      return await createExercise_internal(bot, aiState, client, state, today);
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] AI oluşturma aktivitesi hatası: ${error.message}`);
    return { success: false };
  }
}

/**
 * AI Diyet Oluştur
 * - generateRandomDietFormData() ile rastgele form oluşturur
 * - Global sayacı atomik olarak artırır (rezervasyon)
 * - client.generateDiet() ile API'ye gönderir
 * - Başarısız ise rollback yapar
 * - Başarılı ise state günceller ve loglar
 */
async function createDiet_internal(
  bot: LocalBot,
  aiState: AIGeneratorState,
  client: RejimdeAPIClient,
  state: BotState,
  today: string
): Promise<{ success: boolean; type: 'diet'; id?: number }> {
  // 1. Oluşturmadan ÖNCE atomic olarak sayacı artır (rezervasyon)
  const reserved = botDb.incrementGlobalDietCount(today, GLOBAL_LIMITS.DAILY_DIET_LIMIT);
  if (!reserved) {
    // Başka bot aynı anda kapmış olabilir
    logger.debug(`[${bot.username}] Diyet limiti doldu (race condition)`);
    return { success: false, type: 'diet' };
  }

  try {
    logger.bot(bot.username, '🤖 AI diyet oluşturuluyor...');

    // 2. Rastgele form verisi oluştur
    const formData = generateRandomDietFormData();

    // 3. API'ye gönder
    const result = await client.generateDiet(formData);

    // Başarı kontrolünü genişlet
    const isSuccess = 
      result.success === true || 
      result.message?.toLowerCase().includes('oluşturuldu') ||
      result.message?.toLowerCase().includes('başarı') ||
      !!result.redirect_url;

    if (isSuccess) {
      // ID'yi farklı yerlerden almaya çalış
      const contentId = result.data?.id || 
        extractIdFromUrl(result.redirect_url) ||
        null;

      if (contentId) {
        // State güncelle (bot tracking için)
        aiState.created_diets_today++;
        aiState.created_diet_ids.push(contentId);
        
        state.ai_generator = aiState;
        botDb.updateState(bot.id, { ai_generator: aiState });

        // Activity log
        botDb.logActivity(bot.id, 'ai_diet_created', 'diet', contentId, true);

        // Log mesajı
        const dietType = formData.diet_type || 'Diyet';
        const days = formData.days || '7';
        logger.bot(bot.username, `🥗 AI Diyet oluşturuldu: ID=${contentId} (${dietType}, ${days} gün)`);

        return { success: true, type: 'diet', id: contentId };
      } else {
        // Başarılı görünüyor ama ID bulunamadı
        logger.debug(`[${bot.username}] AI diyet oluşturuldu ama ID bulunamadı: ${result.message}`);
        // Yine de başarılı sayıyoruz çünkü API başarılı dönmüş
        return { success: true, type: 'diet' };
      }
    } else {
      // API hatası - rollback yap
      logger.debug(`[${bot.username}] AI diyet oluşturulamadı: ${result.message || 'Bilinmeyen hata'}`);
      botDb.decrementGlobalDietCount(today);
      botDb.logActivity(bot.id, 'ai_diet_created', 'diet', null, false, result.message);
      return { success: false, type: 'diet' };
    }
  } catch (error: any) {
    // Exception - rollback yap
    logger.debug(`[${bot.username}] AI diyet oluşturma hatası: ${error.message}`);
    botDb.decrementGlobalDietCount(today);
    botDb.logActivity(bot.id, 'ai_diet_created', 'diet', null, false, error.message);
    return { success: false, type: 'diet' };
  }
}

/**
 * URL'den ID çıkartma helper fonksiyonu
 */
function extractIdFromUrl(url?: string): number | null {
  if (!url) return null;
  const match = url.match(/\/(\d+)\/?$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * AI Egzersiz Oluştur
 * - generateRandomExerciseFormData() ile rastgele form oluşturur
 * - Global sayacı atomik olarak artırır (rezervasyon)
 * - client.generateExercise() ile API'ye gönderir
 * - Başarısız ise rollback yapar
 * - Başarılı ise state günceller ve loglar
 */
async function createExercise_internal(
  bot: LocalBot,
  aiState: AIGeneratorState,
  client: RejimdeAPIClient,
  state: BotState,
  today: string
): Promise<{ success: boolean; type: 'exercise'; id?: number }> {
  // 1. Oluşturmadan ÖNCE atomic olarak sayacı artır (rezervasyon)
  const reserved = botDb.incrementGlobalExerciseCount(today, GLOBAL_LIMITS.DAILY_EXERCISE_LIMIT);
  if (!reserved) {
    // Başka bot aynı anda kapmış olabilir
    logger.debug(`[${bot.username}] Egzersiz limiti doldu (race condition)`);
    return { success: false, type: 'exercise' };
  }

  try {
    logger.bot(bot.username, '🤖 AI egzersiz oluşturuluyor...');

    // 2. Rastgele form verisi oluştur
    const formData = generateRandomExerciseFormData();

    // 3. API'ye gönder
    const result = await client.generateExercise(formData);

    // Başarı kontrolünü genişlet
    const isSuccess = 
      result.success === true || 
      result.message?.toLowerCase().includes('oluşturuldu') ||
      result.message?.toLowerCase().includes('başarı') ||
      !!result.redirect_url;

    if (isSuccess) {
      // ID'yi farklı yerlerden almaya çalış
      const contentId = result.data?.id || 
        extractIdFromUrl(result.redirect_url) ||
        null;

      if (contentId) {
        // State güncelle (bot tracking için)
        aiState.created_exercises_today++;
        aiState.created_exercise_ids.push(contentId);
        
        state.ai_generator = aiState;
        botDb.updateState(bot.id, { ai_generator: aiState });

        // Activity log
        botDb.logActivity(bot.id, 'ai_exercise_created', 'exercise', contentId, true);

        // Log mesajı
        const fitnessLevel = formData.fitness_level || 'intermediate';
        const days = formData.days || '14';
        logger.bot(bot.username, `💪 AI Egzersiz oluşturuldu: ID=${contentId} (${fitnessLevel}, ${days} gün)`);

        return { success: true, type: 'exercise', id: contentId };
      } else {
        // Başarılı görünüyor ama ID bulunamadı
        logger.debug(`[${bot.username}] AI egzersiz oluşturuldu ama ID bulunamadı: ${result.message}`);
        // Yine de başarılı sayıyoruz çünkü API başarılı dönmüş
        return { success: true, type: 'exercise' };
      }
    } else {
      // API hatası - rollback yap
      logger.debug(`[${bot.username}] AI egzersiz oluşturulamadı: ${result.message || 'Bilinmeyen hata'}`);
      botDb.decrementGlobalExerciseCount(today);
      botDb.logActivity(bot.id, 'ai_exercise_created', 'exercise', null, false, result.message);
      return { success: false, type: 'exercise' };
    }
  } catch (error: any) {
    // Exception - rollback yap
    logger.debug(`[${bot.username}] AI egzersiz oluşturma hatası: ${error.message}`);
    botDb.decrementGlobalExerciseCount(today);
    botDb.logActivity(bot.id, 'ai_exercise_created', 'exercise', null, false, error.message);
    return { success: false, type: 'exercise' };
  }
}
