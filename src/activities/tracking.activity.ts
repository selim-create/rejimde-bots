import { LocalBot } from '../types';
import { RejimdeAPIClient } from '../utils/api-client';
import { botDb } from '../database/bot-db';
import { PersonaConfig } from '../config/personas.config';
import { logger } from '../utils/logger';
import { shouldPerform, pickRandom, randomInt } from '../utils/random';

export async function performTrackingActivities(
  bot: LocalBot,
  client: RejimdeAPIClient,
  persona: PersonaConfig
): Promise<void> {
  if (!persona) return;
  
  // Su takibi
  if (shouldPerform(persona. behaviors.waterTracking)) {
    await logWater(bot, client);
  }
  
  // Öğün loglama
  if (shouldPerform(persona.behaviors.mealLogging)) {
    await logMeal(bot, client);
  }
  
  // Adım senkronizasyonu
  if (shouldPerform(persona.behaviors.stepLogging)) {
    await logSteps(bot, client);
  }
  
  // Hesaplayıcı kullanma
  if (shouldPerform(persona.behaviors.calculatorUse)) {
    await useCalculator(bot, client);
  }
}

async function logWater(bot: LocalBot, client: RejimdeAPIClient): Promise<void> {
  try {
    const glasses = randomInt(5, 12); // 5-12 bardak (200ml)
    
    for (let i = 0; i < glasses; i++) {
      await client.dispatchEvent('water_added', null, null, { amount: 200 });
    }
    
    botDb.logActivity(bot.id, 'water_log', null, null, true, JSON.stringify({ glasses }));
    logger.bot(bot.username, `Su kaydedildi: ${glasses} bardak 💧`);
  } catch (error:  any) {
    logger.debug(`[${bot.username}] Su loglama hatası:  ${error.message}`);
  }
}

async function logMeal(bot:  LocalBot, client:  RejimdeAPIClient): Promise<void> {
  try {
    const meals = randomInt(1, 3); // 1-3 öğün
    
    for (let i = 0; i < meals; i++) {
      await client.dispatchEvent('meal_photo_uploaded', 'meal', null);
    }
    
    botDb. logActivity(bot. id, 'meal_log', null, null, true, JSON.stringify({ meals }));
    logger.bot(bot.username, `Öğün kaydedildi:  ${meals} öğün 🍽️`);
  } catch (error: any) {
    logger. debug(`[${bot.username}] Öğün loglama hatası: ${error.message}`);
  }
}

async function logSteps(bot: LocalBot, client: RejimdeAPIClient): Promise<void> {
  try {
    const steps = randomInt(3000, 15000); // 3000-15000 adım
    
    await client.dispatchEvent('steps_logged', null, null, { steps });
    
    botDb.logActivity(bot.id, 'steps_log', null, null, true, JSON. stringify({ steps }));
    logger.bot(bot.username, `Adım kaydedildi:  ${steps} adım 👟`);
  } catch (error: any) {
    logger.debug(`[${bot.username}] Adım loglama hatası: ${error.message}`);
  }
}

async function useCalculator(bot: LocalBot, client: RejimdeAPIClient): Promise<void> {
  try {
    const calculatorTypes = ['bmi', 'calorie', 'water', 'ideal_weight'];
    const type = pickRandom(calculatorTypes);
    
    await client.dispatchEvent('calculator_saved', 'calculator', null, { type });
    
    botDb.logActivity(bot.id, 'calculator_use', 'calculator', null, true, JSON. stringify({ type }));
    logger.bot(bot.username, `Hesaplayıcı kullanıldı: ${type} 🧮`);
  } catch (error: any) {
    logger.debug(`[${bot.username}] Hesaplayıcı hatası: ${error. message}`);
  }
}