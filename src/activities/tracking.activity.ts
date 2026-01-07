import { Bot } from '../types/bot.types';
import { ApiService } from '../services/api. service';
import { Database } from '../database/sqlite';
import { PERSONAS } from '../config/personas.config';
import { logger } from '../utils/logger';
import { shouldPerformAction, randomInt } from '../utils/random';

export async function performTrackingActivities(
  bot: Bot,
  api: ApiService,
  db: Database
): Promise<void> {
  const persona = PERSONAS[bot.persona];
  if (!persona) return;
  
  // Su takibi
  if (shouldPerformAction(persona.behaviors.waterTracking)) {
    await logWater(bot, api, db);
  }
  
  // Öğün loglama
  if (shouldPerformAction(persona.behaviors.mealLogging)) {
    await logMeal(bot, api, db);
  }
  
  // Adım senkronizasyonu
  if (shouldPerformAction(persona. behaviors.stepLogging)) {
    await logSteps(bot, api, db);
  }
  
  // Hesaplayıcı kullanma
  if (shouldPerformAction(persona.behaviors. calculatorUse)) {
    await useCalculator(bot, api, db);
  }
}

async function logWater(bot: Bot, api:  ApiService, db:  Database): Promise<void> {
  try {
    // Günde 5-12 bardak su (200ml)
    const glasses = randomInt(5, 12);
    
    for (let i = 0; i < glasses; i++) {
      await api.dispatchEvent(bot.token, 'water_added', null, null, { amount: 200 });
    }
    
    db.logActivity(bot.id, 'water_log', null, null, true, JSON.stringify({ glasses }));
    logger.debug(`[${bot.username}] Su kaydedildi: ${glasses} bardak`);
  } catch (error: any) {
    logger. debug(`[${bot.username}] Su loglama hatası:  ${error.message}`);
  }
}

async function logMeal(bot:  Bot, api: ApiService, db: Database): Promise<void> {
  try {
    // 1-3 öğün
    const meals = randomInt(1, 3);
    
    for (let i = 0; i < meals; i++) {
      await api.dispatchEvent(bot.token, 'meal_photo_uploaded', 'meal', null);
    }
    
    db.logActivity(bot.id, 'meal_log', null, null, true, JSON.stringify({ meals }));
    logger.debug(`[${bot.username}] Öğün kaydedildi:  ${meals} öğün`);
  } catch (error: any) {
    logger.debug(`[${bot.username}] Öğün loglama hatası: ${error. message}`);
  }
}

async function logSteps(bot: Bot, api: ApiService, db: Database): Promise<void> {
  try {
    // 3000-15000 adım
    const steps = randomInt(3000, 15000);
    
    await api.dispatchEvent(bot.token, 'steps_logged', null, null, { steps });
    
    db.logActivity(bot.id, 'steps_log', null, null, true, JSON.stringify({ steps }));
    logger.debug(`[${bot.username}] Adım kaydedildi:  ${steps}`);
  } catch (error: any) {
    logger. debug(`[${bot.username}] Adım loglama hatası: ${error.message}`);
  }
}

async function useCalculator(bot: Bot, api: ApiService, db: Database): Promise<void> {
  try {
    const calculatorTypes = ['bmi', 'calorie', 'water', 'ideal_weight'];
    const type = calculatorTypes[randomInt(0, calculatorTypes.length - 1)];
    
    await api. dispatchEvent(bot.token, 'calculator_saved', 'calculator', null, { type });
    
    db.logActivity(bot.id, 'calculator_use', 'calculator', null, true, JSON.stringify({ type }));
    logger.debug(`[${bot.username}] Hesaplayıcı kullanıldı:  ${type}`);
  } catch (error: any) {
    logger.debug(`[${bot.username}] Hesaplayıcı hatası: ${error. message}`);
  }
}