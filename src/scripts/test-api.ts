import dotenv from 'dotenv';
dotenv.config();

import { RejimdeAPIClient } from '../utils/api-client';
import { logger } from '../utils/logger';

async function testAPI() {
  logger.info('🧪 API Bağlantı Testi Başlıyor...');
  console.log('');

  const client = new RejimdeAPIClient();
  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Public Diets
  try {
    logger.info('Test 1: Diyet listesi çekiliyor...');
    const diets = await client.getDiets(5);
    if (diets.status === 'success' || Array.isArray(diets.data)) {
      logger.success(`✅ Diyet listesi başarılı (${Array.isArray(diets.data) ? diets.data.length : 0} adet)`);
      passedTests++;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error:  any) {
    logger.error(`❌ Diyet listesi başarısız: ${error.message}`);
    failedTests++;
  }

  // Test 2: Public Exercises
  try {
    logger.info('Test 2: Egzersiz listesi çekiliyor...');
    const exercises = await client.getExercises(5);
    if (exercises.status === 'success' || Array.isArray(exercises. data)) {
      logger.success(`✅ Egzersiz listesi başarılı`);
      passedTests++;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error: any) {
    logger.error(`❌ Egzersiz listesi başarısız: ${error.message}`);
    failedTests++;
  }

  // Test 3: Public Circles
  try {
    logger. info('Test 3: Circle listesi çekiliyor...');
    const circles = await client.getCircles();
    if (circles.status === 'success' || Array.isArray(circles)) {
      logger.success(`✅ Circle listesi başarılı`);
      passedTests++;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error: any) {
    logger.error(`❌ Circle listesi başarısız: ${error. message}`);
    failedTests++;
  }

  // Test 4: Public Blogs
  try {
    logger. info('Test 4: Blog listesi çekiliyor...');
    const blogs = await client.getBlogs(5);
    if (blogs.status === 'success' && Array.isArray(blogs.data)) {
      logger.success(`✅ Blog listesi başarılı (${blogs.data.length} adet)`);
      passedTests++;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error: any) {
    logger.error(`❌ Blog listesi başarısız: ${error.message}`);
    failedTests++;
  }

  // Test 5: Public Experts
  try {
    logger.info('Test 5: Uzman listesi çekiliyor...');
    const experts = await client.getExperts();
    if (experts.status === 'success' || Array.isArray(experts.data)) {
      logger.success(`✅ Uzman listesi başarılı`);
      passedTests++;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error: any) {
    logger.error(`❌ Uzman listesi başarısız: ${error.message}`);
    failedTests++;
  }

  // Summary
  console.log('');
  console.log('========================================');
  logger.info(`📊 Test Sonuçları`);
  logger.success(`✅ Başarılı: ${passedTests}`);
  if (failedTests > 0) {
    logger.error(`❌ Başarısız: ${failedTests}`);
  }
  console.log('========================================');

  if (failedTests === 0) {
    logger.success('🎉 Tüm testler başarılı! API bağlantısı hazır.');
  } else {
    logger.warn('⚠️ Bazı testler başarısız.  API URL\'ini kontrol edin.');
  }
}

testAPI().catch(console.error);