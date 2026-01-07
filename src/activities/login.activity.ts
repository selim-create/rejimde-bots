import { LocalBot } from '../types';
import { RejimdeAPIClient } from '../utils/api-client';
import { botDb } from '../database/bot-db';
import { logger } from '../utils/logger';

export async function performLogin(
  bot:  LocalBot,
  client: RejimdeAPIClient
): Promise<boolean> {
  try {
    // Token geçerli mi kontrol et
    if (bot.jwt_token && bot.token_expiry) {
      const expiry = new Date(bot.token_expiry);
      if (expiry > new Date()) {
        client.setToken(bot.jwt_token);
        
        // Streak event dispatch
        const result = await client.dispatchEvent('login_success');
        
        if (result.status === 'success') {
          const streak = (result. data as any)?.current_streak || 0;
          botDb.updateLogin(bot.id, streak);
          logger.bot(bot. username, `Login (cached token) - Streak: ${streak}`);
          return true;
        }
      }
    }

    // Yeni token al
    const loginResult = await client. login(bot.username, bot.password);
    
    if (loginResult.status !== 'success' || !loginResult. data?. token) {
      logger.bot(bot.username, `Login başarısız: ${loginResult.message}`, 'fail');
      return false;
    }

    // Token'ı kaydet (7 gün geçerli)
    const expiry = new Date();
    expiry. setDate(expiry.getDate() + 7);
    botDb.updateToken(bot.id, loginResult.data.token, expiry);

    // Streak event'i dispatch et
    await client.dispatchEvent('login_success');

    botDb.updateLogin(bot.id, loginResult.data.current_streak || 0);
    botDb.logActivity(bot.id, 'login', null, null, true);

    logger.bot(bot.username, `Login başarılı - Streak: ${loginResult.data.current_streak || 1}`);
    return true;

  } catch (error: any) {
    logger.bot(bot.username, `Login hatası: ${error.message}`, 'fail');
    botDb.logActivity(bot.id, 'login', null, null, false, error.message);
    return false;
  }
}