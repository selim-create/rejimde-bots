import dotenv from 'dotenv';
dotenv.config();

import { botDb } from '../database/bot-db';
import { logger } from '../utils/logger';

async function testDatabase() {
  logger.info('🧪 Database Testi Başlıyor...');
  console.log('');

  // Test 1: Bot kaydet
  logger.info('Test 1: Test bot kaydediliyor...');
  try {
    const botId = botDb.saveBot({
      user_id: 99999,
      username: 'test_bot_user',
      email: 'test@rejimde-bot. test',
      password: 'test123',
      persona: 'active',
      batch_id: 'test_batch',
    });
    logger.success(`✅ Bot kaydedildi.  ID: ${botId}`);
  } catch (error:  any) {
    if (error.message.includes('UNIQUE constraint')) {
      logger.warn('⚠️ Test bot zaten var (normal)');
    } else {
      throw error;
    }
  }

  // Test 2: Bot getir
  logger.info('Test 2: Bot getiriliyor.. .');
  const bot = botDb.getBotByUsername('test_bot_user');
  if (bot) {
    logger.success(`✅ Bot bulundu:  ${bot.username} (Persona: ${bot.persona})`);
  } else {
    logger.error('❌ Bot bulunamadı');
  }

  // Test 3: İstatistikler
  logger. info('Test 3: İstatistikler.. .');
  const stats = botDb.getStats();
  console.log('');
  console.log('📊 Veritabanı İstatistikleri: ');
  console.log(`  Toplam Bot: ${stats. total}`);
  console.log(`  Aktif Bot: ${stats.active}`);
  console.log(`  Persona Dağılımı: `, stats.byPersona);
  console.log(`  Batch Dağılımı:`, stats.byBatch);

  console.log('');
  logger.success('🎉 Database testi tamamlandı!');
}

testDatabase().catch(console.error);