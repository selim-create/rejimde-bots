import cron from 'node-cron';
import { runDailyActivities } from './daily. runner';
import { logger } from '../utils/logger';

// Her gün sabah 09:00'da çalış
cron.schedule('0 9 * * *', () => {
  logger.info('⏰ Zamanlanmış günlük aktivite başlatılıyor...');
  runDailyActivities();
}, {
  timezone: 'Europe/Istanbul'
});

// Her 4 saatte bir random aktivite
cron.schedule('0 */4 * * *', () => {
  logger.info('⏰ Ara aktiviteler başlatılıyor.. .');
  // Sadece süper aktif botlar için ek aktiviteler
  runIntermediateActivities();
}, {
  timezone: 'Europe/Istanbul'
});

logger.info('📅 Scheduler başlatıldı');
logger.info('   - Günlük aktiviteler: 09:00');
logger.info('   - Ara aktiviteler: Her 4 saatte');