import { Bot, BotState } from '../types/bot.types';
import { ApiService } from '../services/api.service';
import { Database } from '../database/sqlite';
import { PERSONAS } from '../config/personas.config';
import { logger } from '../utils/logger';
import { shouldPerformAction, pickRandom, randomInt } from '../utils/random';

export async function performSocialActivities(
  bot: Bot,
  state: BotState,
  api: ApiService,
  db: Database
): Promise<void> {
  const persona = PERSONAS[bot.persona];
  if (!persona) return;
  
  // Kullanıcı takip etme
  if (shouldPerformAction(persona.behaviors.followUsers)) {
    await followRandomUser(bot, state, api, db);
  }
  
  // Beşlik çakma
  if (shouldPerformAction(persona.behaviors.sendHighFive)) {
    await sendHighFive(bot, state, api, db);
  }
  
  // Circle'a katılma
  if (! bot.circleId && shouldPerformAction(persona.behaviors.circleJoin)) {
    await joinCircle(bot, api, db);
  }
  
  // Uzman profili ziyaret
  if (shouldPerformAction(persona.behaviors.expertVisit)) {
    await visitExpertProfile(bot, api, db);
  }
}

async function followRandomUser(
  bot: Bot,
  state:  BotState,
  api: ApiService,
  db:  Database
): Promise<void> {
  try {
    // Leaderboard'dan rastgele kullanıcı seç
    const leaderboard = await api.getLeaderboard({ limit: 100 });
    const notFollowed = leaderboard. filter(u => 
      u.id !== bot.wpUserId && 
      !state.followedUsers.includes(u.id)
    );
    
    if (notFollowed.length === 0) return;
    
    const user = pickRandom(notFollowed);
    const result = await api. followUser(bot. token, user.id);
    
    if (result.success) {
      state.followedUsers. push(user.id);
      db.updateBotState(bot.id, state);
      db.logActivity(bot. id, 'follow', 'user', user.id, true);
      logger.success(`[${bot.username}] ${user.name} takip edildi`);
    }
  } catch (error: any) {
    logger. debug(`[${bot.username}] Takip hatası: ${error.message}`);
  }
}

async function sendHighFive(
  bot: Bot,
  state: BotState,
  api: ApiService,
  db: Database
): Promise<void> {
  try {
    // Takip ettiğimiz birine beşlik çak
    if (state.followedUsers.length === 0) return;
    
    const userId = pickRandom(state.followedUsers);
    const result = await api.sendHighFive(bot.token, userId);
    
    if (result.success) {
      db.logActivity(bot.id, 'high_five', 'user', userId, true);
      logger.success(`[${bot.username}] Beşlik çakıldı! `);
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] High-five hatası: ${error.message}`);
  }
}

async function joinCircle(bot: Bot, api:  ApiService, db:  Database): Promise<void> {
  try {
    const circles = await api.getCircles({ limit:  20 });
    
    if (circles. length === 0) return;
    
    const circle = pickRandom(circles);
    const result = await api. joinCircle(bot.token, circle. id);
    
    if (result. success) {
      db.updateBotCircle(bot.id, circle.id);
      db.logActivity(bot.id, 'circle_join', 'circle', circle.id, true);
      logger.success(`[${bot.username}] Circle'a katıldı:  "${circle.name}"`);
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] Circle hatası: ${error. message}`);
  }
}

async function visitExpertProfile(bot: Bot, api:  ApiService, db:  Database): Promise<void> {
  try {
    const experts = await api.getExperts({ limit: 30 });
    
    if (experts. length === 0) return;
    
    const expert = pickRandom(experts);
    
    // Profile view track et
    await api.trackProfileView(expert.slug);
    
    // %30 ihtimalle takip et
    if (Math.random() < 0.3) {
      await api.followUser(bot.token, expert.user_id);
      db.logActivity(bot.id, 'expert_follow', 'expert', expert.user_id, true);
    }
    
    db.logActivity(bot.id, 'expert_visit', 'expert', expert.id, true);
    logger.debug(`[${bot.username}] Uzman profili ziyaret edildi: ${expert.name}`);
  } catch (error: any) {
    logger.debug(`[${bot.username}] Uzman ziyareti hatası: ${error.message}`);
  }
}