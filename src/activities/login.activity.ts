import { Bot } from '../types/bot.types';
import { ApiService } from '../services/api.service';
import { Database } from '../database/sqlite';
import { logger } from '../utils/logger';

export async function performLogin(bot: Bot, api: ApiService, db: Database): Promise<boolean> {
  try {
    // Token geçerli mi kontrol et
    if (bot.token && bot.tokenExpiry && new Date(bot.tokenExpiry) > new Date()) {
      // Token dispatch event ile streak'i güncellesin
      const result = await api.dispatchEvent(bot.token, 'login_success');
      
      if (result. success) {
        db.updateBotLogin(bot.id, result.data?. current_streak || 0);
        logger.debug(`[${bot.username}] Login success (existing token)`);
        return true;
      }
    }
    
    // Yeni token al
    const loginResult = await api. login(bot.username, bot.password);
    
    if (! loginResult.success) {
      logger.warn(`[${bot.username}] Login failed: ${loginResult. message}`);
      return false;
    }
    
    // Token'ı kaydet (7 gün geçerli)
    const expiry = new Date();
    expiry. setDate(expiry.getDate() + 7);
    db.updateBotToken(bot.id, loginResult.data. token, expiry);
    
    // Streak event'i dispatch et
    await api.dispatchEvent(loginResult.data.token, 'login_success');
    
    db.updateBotLogin(bot.id, loginResult.data. current_streak || 0);
    db.logActivity(bot.id, 'login', null, null, true);
    
    logger.success(`[${bot.username}] Logged in.  Streak: ${loginResult.data.current_streak || 1}`);
    return true;
    
  } catch (error: any) {
    logger.error(`[${bot.username}] Login error: ${error.message}`);
    db.logActivity(bot.id, 'login', null, null, false, error.message);
    return false;
  }
}