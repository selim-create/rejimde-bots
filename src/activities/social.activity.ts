import { LocalBot, BotState, LeaderboardUser, Circle, Expert } from '../types';
import { RejimdeAPIClient } from '../utils/api-client';
import { botDb } from '../database/bot-db';
import { PersonaConfig } from '../config/personas.config';
import { logger } from '../utils/logger';
import { shouldPerform, pickRandom } from '../utils/random';

export async function performSocialActivities(
  bot: LocalBot,
  state: BotState,
  client: RejimdeAPIClient,
  persona:  PersonaConfig
): Promise<void> {
  if (!persona) return;
  
  // Kullanıcı takip etme
  if (shouldPerform(persona. behaviors.followUsers)) {
    await followRandomUser(bot, state, client);
  }
  
  // Beşlik çakma
  if (shouldPerform(persona. behaviors.sendHighFive)) {
    await sendHighFive(bot, state, client);
  }
  
  // Circle'a katılma
  if (! state.circle_id && shouldPerform(persona. behaviors.circleJoin)) {
    await joinCircle(bot, state, client);
  }
  
  // Uzman profili ziyaret
  if (shouldPerform(persona.behaviors.expertVisit)) {
    await visitExpertProfile(bot, state, client);
  }
}

async function followRandomUser(
  bot: LocalBot,
  state:  BotState,
  client: RejimdeAPIClient
): Promise<void> {
  try {
    const leaderboard = await client.getLeaderboard({ limit: 100 });
    
    // Kendimizi ve zaten takip ettiklerimizi filtrele
    const notFollowed = leaderboard. filter((u: LeaderboardUser) => 
      u.id !== bot.user_id && 
      !state. followed_users.includes(u.id)
    );
    
    if (notFollowed.length === 0) {
      logger.debug(`[${bot.username}] Takip edilebilecek kullanıcı kalmadı`);
      return;
    }
    
    const user = pickRandom(notFollowed);
    const result = await client.followUser(user.id);
    
    if (result.status === 'success') {
      state.followed_users.push(user.id);
      botDb.updateState(bot.id, { followed_users: state.followed_users });
      botDb. logActivity(bot. id, 'follow', 'user', user.id, true);
      logger.bot(bot.username, `${user.name} takip edildi`);
    } else if (result.message?. includes('already') || result.message?.includes('zaten') || result.message?. includes('Takipten')) {
      // Zaten takip ediliyor veya toggle ile takipten çıkıldı
      // State'e ekleme
      if (! state.followed_users.includes(user. id)) {
        state.followed_users.push(user. id);
        botDb.updateState(bot.id, { followed_users: state.followed_users });
      }
      logger. debug(`[${bot.username}] Kullanıcı zaten takip ediliyor: ${user.id}`);
    } else {
      logger.debug(`[${bot.username}] Takip hatası: ${result.message}`);
    }
  } catch (error:  any) {
    logger.debug(`[${bot.username}] Takip hatası: ${error. message}`);
  }
}

async function sendHighFive(
  bot: LocalBot,
  state: BotState,
  client: RejimdeAPIClient
): Promise<void> {
  try {
    if (state.followed_users.length === 0) return;
    
    const userId = pickRandom(state. followed_users);
    const result = await client.sendHighFive(userId);
    
    if (result.status === 'success') {
      botDb.logActivity(bot.id, 'high_five', 'user', userId, true);
      logger.bot(bot.username, `Beşlik çakıldı!  ✋`);
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] High-five hatası: ${error.message}`);
  }
}

async function joinCircle(
  bot: LocalBot,
  state: BotState,
  client: RejimdeAPIClient
): Promise<void> {
  try {
    const circles = await client. getCircles({ limit: 20 });
    
    if (circles. length === 0) return;
    
    const circle = pickRandom(circles);
    const result = await client.joinCircle(circle.id);
    
    if (result.status === 'success') {
      state. circle_id = circle.id;
      botDb.updateState(bot.id, { circle_id:  circle.id });
      botDb.logActivity(bot.id, 'circle_join', 'circle', circle.id, true);
      logger.bot(bot.username, `Circle'a katıldı: "${circle.name}" 🎯`);
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] Circle hatası: ${error. message}`);
  }
}

async function visitExpertProfile(
  bot:  LocalBot,
  state: BotState,
  client:  RejimdeAPIClient
): Promise<void> {
  try {
    const experts = await client. getExperts({ limit: 30 });
    
    if (experts. length === 0) return;
    
    const expert = pickRandom(experts);
    const sessionId = `bot_${bot.id}_${Date.now()}`;
    
    await client.trackProfileView(expert. slug, sessionId);
    botDb.logActivity(bot.id, 'expert_visit', 'expert', expert.id, true);
    logger.debug(`[${bot.username}] Uzman ziyaret edildi: ${expert.name}`);
    
    // %30 ihtimalle takip et
    if (Math.random() < 0.3 && expert.user_id) {
      const followResult = await client. followUser(expert. user_id);
      if (followResult.status === 'success') {
        state.followed_users.push(expert. user_id);
        botDb.updateState(bot.id, { followed_users: state.followed_users });
        botDb.logActivity(bot.id, 'expert_follow', 'expert', expert.user_id, true);
        logger.bot(bot.username, `Uzman takip edildi: ${expert. name}`);
      }
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] Uzman ziyareti hatası: ${error.message}`);
  }
}