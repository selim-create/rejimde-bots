console.log('=== DAILY RUNNER STARTED ===');
import dotenv from 'dotenv';
dotenv.config();

import { RejimdeAPIClient } from '../utils/api-client';
import { botDb } from '../database/bot-db';
import { PERSONA_CONFIGS } from '../config/personas.config';
import { logger } from '../utils/logger';
import { delay } from '../utils/delay';
import { shouldPerform, pickRandom, randomInt } from '../utils/random';
import { LocalBot, BotState, PersonaType } from '../types';
import { OpenAIService } from '../services/openai.service';
import { performAIGeneratorActivity } from '../activities/ai-generator.activity';

// Ayarlar
const DELAY_BETWEEN_BOTS = 3000;
const DELAY_BETWEEN_ACTIONS = 800;
const REVIEW_PROBABILITY = 0.6;
const MIN_REVIEW_RATING = 4;
const MAX_REVIEW_RATING = 5;
const AI_GENERATION_PROBABILITY = 0.15; // %15 ihtimalle AI içerik oluştur

interface DailyStats {
  processed: number;
  skipped: number;
  errors: number;
  activities: Record<string, number>;
}

async function runDailyActivities() {
  logger.info('🚀 Günlük Bot Aktiviteleri Başlıyor...');
  console.log('');

  const stats:  DailyStats = {
    processed:  0,
    skipped: 0,
    errors:  0,
    activities: {},
  };

  const openai = new OpenAIService();
  const bots = botDb. getActiveBots();
  logger.info(`📊 Toplam ${bots.length} aktif bot bulundu`);

  // Limit kontrolü
  const args = process.argv. slice(2);
  const limitArg = args. find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg. split('=')[1]) : bots.length;
  const botsToProcess = bots.slice(0, limit);
  
  if (limit < bots.length) {
    logger.info(`⚙️ Limit:  ${limit} bot işlenecek`);
  }

  for (const bot of botsToProcess) {
    try {
      const persona = PERSONA_CONFIGS[bot.persona as PersonaType];
      if (!persona) {
        stats.skipped++;
        continue;
      }

      // Bugün aktif olacak mı?
      if (! shouldPerform(persona. activityFrequency)) {
        logger.debug(`[${bot.username}] Bugün inaktif (${bot.persona})`);
        stats.skipped++;
        continue;
      }

      logger.info(`\n🤖 ${bot. username} (${bot.persona})`);

      const client = new RejimdeAPIClient();
      const state = botDb.getState(bot.id);

      // 1. Login
      const loggedIn = await performLogin(bot, client);
      if (!loggedIn) {
        stats.errors++;
        continue;
      }
      await delay(DELAY_BETWEEN_ACTIONS);

      // 2. Blog aktiviteleri
      await performBlogActivities(bot, state, client, persona, openai);
      await delay(DELAY_BETWEEN_ACTIONS);

      // 3. Diyet aktiviteleri
      await performDietActivities(bot, state, client, persona, openai);
      await delay(DELAY_BETWEEN_ACTIONS);

      // 4. Egzersiz aktiviteleri
      await performExerciseActivities(bot, state, client, persona, openai);
      await delay(DELAY_BETWEEN_ACTIONS);

      // 5. Sosyal aktiviteler
      await performSocialActivities(bot, state, client, persona);
      await delay(DELAY_BETWEEN_ACTIONS);

      // 6. Tracking aktiviteleri
      await performTrackingActivities(bot, client, persona);
      await delay(DELAY_BETWEEN_ACTIONS);

      // 7. AI İçerik Oluşturma (sadece AI destekli personalar için)
      if (persona.aiEnabled && shouldPerform(AI_GENERATION_PROBABILITY)) {
        try {
          const aiResult = await performAIGeneratorActivity(bot, state, client);
          if (aiResult.success) {
            logger.bot(bot.username, `🤖 AI ${aiResult.type === 'diet' ? 'diyet' : 'egzersiz'} oluşturuldu!`);
          }
        } catch (error: any) {
          logger.debug(`[${bot.username}] AI oluşturma hatası: ${error.message}`);
        }
      }

      stats.processed++;
      await delay(DELAY_BETWEEN_BOTS);

    } catch (error: any) {
      logger.error(`[${bot.username}] Kritik hata: ${error.message}`);
      stats.errors++;
    }
  }

  // Final rapor
  console.log('');
  console.log('========================================');
  logger.info('📊 GÜNLÜK RAPOR');
  console.log('========================================');
  console.log(`  ✅ İşlenen:  ${stats.processed}`);
  console.log(`  ⏩ Atlanan: ${stats.skipped}`);
  console.log(`  ❌ Hata: ${stats.errors}`);
  console.log('========================================');
}

// ============ LOGIN ============

async function performLogin(bot: LocalBot, client: RejimdeAPIClient): Promise<boolean> {
  try {
    // Token geçerli mi?
    if (bot.jwt_token && bot. token_expiry) {
      const expiry = new Date(bot.token_expiry);
      if (expiry > new Date()) {
        client.setToken(bot.jwt_token);
        
        // Streak event dispatch
        const result = await client.dispatchEvent('login_success');
        if (result.status === 'success') {
          const streak = (result.data as any)?.current_streak || 0;
          botDb.updateLogin(bot.id, streak);
          logger.bot(bot.username, `Login (cached token) - Streak: ${streak}`);
          return true;
        }
      }
    }

    // Yeni login
    const result = await client.login(bot.username, bot.password);
    if (result.status !== 'success' || !result.data?.token) {
      logger.bot(bot.username, `Login başarısız: ${result.message}`, 'fail');
      return false;
    }

    // Token kaydet (7 gün)
    const expiry = new Date();
    expiry. setDate(expiry.getDate() + 7);
    botDb.updateToken(bot.id, result.data.token, expiry);
    botDb.updateLogin(bot.id, result.data.current_streak || 0);
    botDb.logActivity(bot.id, 'login', null, null, true);

    logger.bot(bot.username, `Login başarılı - Streak: ${result.data.current_streak || 1}`);
    return true;

  } catch (error: any) {
    logger.bot(bot.username, `Login hatası: ${error.message}`, 'fail');
    botDb.logActivity(bot.id, 'login', null, null, false, error.message);
    return false;
  }
}

// ============ BLOG ============

async function performBlogActivities(
  bot: LocalBot,
  state:  BotState,
  client: RejimdeAPIClient,
  persona: typeof PERSONA_CONFIGS[PersonaType],
  openai:  OpenAIService
): Promise<void> {
  // Blog okuma
  if (shouldPerform(persona. behaviors.blogReading)) {
    try {
      const blogs = await client.getBlogs({ limit: 30 });
      const unread = blogs.filter(b => ! state.read_blogs.includes(b.id));

      if (unread.length > 0) {
        const blog = pickRandom(unread);
        const result = await client.claimBlogReward(blog.id);

        if (result.status === 'success') {
          state.read_blogs. push(blog.id);
          botDb.updateState(bot.id, { read_blogs: state.read_blogs });
          botDb.logActivity(bot.id, 'blog_read', 'blog', blog. id, true);
          logger.bot(bot.username, `Blog okundu: "${blog.title. substring(0, 30)}..."`);
        } else {
          // Zaten okunmuş olabilir - yine de state'e ekle
          if (result.message?.includes('already') || result.message?.includes('zaten')) {
            state.read_blogs.push(blog.id);
            botDb.updateState(bot.id, { read_blogs: state.read_blogs });
            logger.debug(`[${bot.username}] Blog zaten okunmuş: ${blog.id}`);
          }
        }
      }
    } catch (error:  any) {
      logger.debug(`[${bot.username}] Blog okuma hatas��: ${error. message}`);
    }
    await delay(500);
  }

  // Yorum beğenme
  if (shouldPerform(persona.behaviors.likeComments)) {
    try {
      const blogs = await client.getBlogs({ limit:  10 });
      if (blogs.length > 0) {
        const blog = pickRandom(blogs);
        const comments = await client.getComments(blog. id);
        
        if (comments.length > 0) {
          const unliked = comments.filter(c => !state. liked_comments.includes(c. id));
          if (unliked.length > 0) {
            const comment = pickRandom(unliked);
            const result = await client.likeComment(comment.id);
            
            if (result.status === 'success') {
              state.liked_comments.push(comment.id);
              botDb.updateState(bot.id, { liked_comments: state.liked_comments });
              botDb.logActivity(bot.id, 'comment_like', 'comment', comment.id, true);
              logger.bot(bot. username, `Yorum beğenildi`);
            }
          }
        }
      }
    } catch (error:  any) {
      logger.debug(`[${bot.username}] Beğeni hatas��: ${error. message}`);
    }
  }

  // AI yorum
  if (persona.aiEnabled && shouldPerform(persona.behaviors.blogCommenting)) {
    try {
      // Zaten yorum yapılmış blogları filtrele
      const uncommented = state.read_blogs.filter(id => !state.commented_posts.includes(id));
      
      if (uncommented.length > 0) {
        const blogId = pickRandom(uncommented);
        const blog = await client.getBlog(blogId);
        
        if (blog) {
          const comment = await openai.generateBlogComment(blog.title, blog.excerpt, persona);
          const result = await client.createComment({
            post: blogId,
            content: comment,
            context: 'blog',
          });

          if (result.status === 'success') {
            state.commented_posts.push(blogId);
            botDb.updateState(bot.id, { commented_posts: state.commented_posts });
            botDb.logActivity(bot.id, 'blog_comment', 'blog', blogId, true);
            logger.bot(bot.username, `Blog yorumu: "${comment.substring(0, 40)}..."`);
          } else if (result.message?.includes('zaten değerlendirdiniz') || result.message?.includes('already')) {
            // 409 - Zaten yorum yapılmış, state'e ekle
            if (!state.commented_posts.includes(blogId)) {
              state.commented_posts.push(blogId);
              botDb.updateState(bot.id, { commented_posts: state.commented_posts });
            }
            logger.debug(`[${bot.username}] Blog zaten yorumlanmış: ${blogId}`);
          } else {
            logger.debug(`[${bot.username}] Yorum hatası: ${result.message}`);
          }
        }
      } else {
        logger.debug(`[${bot.username}] Yorum yapılacak blog kalmadı`);
      }
    } catch (error: any) {
      logger.debug(`[${bot.username}] Yorum hatası: ${error.message}`);
    }
  }
}

// ============ DIET ============

async function performDietActivities(
  bot:  LocalBot,
  state: BotState,
  client:  RejimdeAPIClient,
  persona: typeof PERSONA_CONFIGS[PersonaType],
  openai: OpenAIService
): Promise<void> {
  // Tamamlanmış diyetleri değerlendir (sadece 1 kez)
  if (persona.aiEnabled) {
    try {
      // DEBUG: State durumunu logla
      logger.debug(`[${bot.username}] Diet Review Check - completed: ${JSON.stringify(state.completed_diets)}, reviewed: ${JSON.stringify(state.reviewed_diets)}`);
      
      // ID'leri number'a normalize et
      const completedIds = state.completed_diets.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
      const reviewedIds = state.reviewed_diets.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
      
      const completedNotReviewed = completedIds.filter(id => !reviewedIds.includes(id));
      
      logger.debug(`[${bot.username}] Değerlendirilmemiş diyetler: ${JSON.stringify(completedNotReviewed)}`);
      
      if (completedNotReviewed.length > 0) {
        logger.debug(`[${bot.username}] ${completedNotReviewed.length} diyet değerlendirme bekliyor`);
        
        if (shouldPerform(REVIEW_PROBABILITY)) {
          const dietId = pickRandom(completedNotReviewed);
          logger.debug(`[${bot.username}] Diyet ${dietId} için değerlendirme yapılacak`);
          
          const diets = await client.getDiets({ limit: 100 });
          
          // ID karşılaştırmasını normalize et
          const diet = diets.find(d => {
            const apiId = typeof d.id === 'string' ? parseInt(d.id, 10) : d.id;
            return apiId === dietId;
          });
          
          if (diet) {
            const comment = await openai.generateDietComment(diet.title, diet.slug, persona);
            const rating = randomInt(MIN_REVIEW_RATING, MAX_REVIEW_RATING);
            
            const result = await client.createComment({
              post: dietId,
              content: comment,
              rating: rating,
              context: 'diet'
            });
            
            if (result.status === 'success') {
              state.reviewed_diets.push(dietId);
              botDb.updateState(bot.id, { reviewed_diets: state.reviewed_diets });
              botDb.logActivity(bot.id, 'diet_review', 'diet', dietId, true);
              logger.bot(bot.username, `Diyet değerlendirmesi yapıldı: "${comment.substring(0, 40)}..." (${rating}⭐)`);
            } else if (result.message?.includes('zaten değerlendirdiniz') || result.message?.includes('already')) {
              if (!state.reviewed_diets.includes(dietId)) {
                state.reviewed_diets.push(dietId);
                botDb.updateState(bot.id, { reviewed_diets: state.reviewed_diets });
              }
              logger.debug(`[${bot.username}] Diyet zaten değerlendirilmiş: ${dietId}`);
            } else {
              logger.debug(`[${bot.username}] Diyet değerlendirme hatası: ${result.message}`);
            }
          } else {
            logger.debug(`[${bot.username}] Diyet bulunamadı: ${dietId}`);
          }
        } else {
          logger.debug(`[${bot.username}] Diyet değerlendirme olasılık kontrolünde atlandı`);
        }
      }
    } catch (error: any) {
      logger.debug(`[${bot.username}] Diyet değerlendirme hatası: ${error.message}`);
    }
    await delay(500);
  }
  
  if (state.active_diet_id) {
    if (shouldPerform(persona.behaviors.dietComplete)) {
      try {
        const dietId = typeof state.active_diet_id === 'string' 
          ? parseInt(state.active_diet_id, 10) 
          : state.active_diet_id;
          
        const result = await client.completePlan(dietId);
        if (result.status === 'success') {
          state.completed_diets.push(dietId);  // Number olarak ekle
          state.active_diet_id = null;
          botDb.updateState(bot.id, {
            completed_diets: state.completed_diets,
            active_diet_id: null,
          });
          botDb.logActivity(bot.id, 'diet_complete', 'diet', dietId, true);
          logger.bot(bot.username, `Diyet tamamlandı!  🎉`);
          logger.debug(`[${bot.username}] completed_diets güncellendi: ${JSON.stringify(state.completed_diets)}`);
        }
      } catch (error: any) {
        logger. debug(`[${bot.username}] Diyet tamamlama hatası: ${error.message}`);
      }
    }
  } else {
    if (shouldPerform(persona.behaviors.dietStart)) {
      try {
        const diets = await client.getDiets({ limit: 20 });
        const available = diets.filter(
          d => !state.started_diets.includes(d.id) && !state.completed_diets.includes(d.id)
        );

        if (available.length > 0) {
          const diet = pickRandom(available);
          const result = await client.startPlan(diet. id);

          if (result. status === 'success') {
            state.started_diets.push(diet. id);
            state.active_diet_id = diet.id;
            botDb.updateState(bot.id, {
              started_diets: state.started_diets,
              active_diet_id: diet.id,
            });
            botDb.logActivity(bot.id, 'diet_start', 'diet', diet.id, true);
            logger. bot(bot.username, `Diyet başlatıldı:  "${diet.title}"`);
          }
        }
      } catch (error:  any) {
        logger.debug(`[${bot.username}] Diyet başlatma hatası:  ${error.message}`);
      }
    }
  }
}

// ============ EXERCISE ============

async function performExerciseActivities(
  bot:  LocalBot,
  state: BotState,
  client:  RejimdeAPIClient,
  persona: typeof PERSONA_CONFIGS[PersonaType],
  openai: OpenAIService
): Promise<void> {
  // Tamamlanmış egzersizleri değerlendir (sadece 1 kez)
  if (persona.aiEnabled) {
    try {
      // DEBUG: State durumunu logla
      logger.debug(`[${bot.username}] Exercise Review Check - completed: ${JSON.stringify(state.completed_exercises)}, reviewed: ${JSON.stringify(state.reviewed_exercises)}`);
      
      // ID'leri number'a normalize et (string/number uyumsuzluğunu önle)
      const completedIds = state.completed_exercises.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
      const reviewedIds = state.reviewed_exercises.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
      
      const completedNotReviewed = completedIds.filter(id => !reviewedIds.includes(id));
      
      logger.debug(`[${bot.username}] Değerlendirilmemiş egzersizler: ${JSON.stringify(completedNotReviewed)}`);
      
      // Önce data kontrolü, sonra olasılık kontrolü
      if (completedNotReviewed.length > 0) {
        logger.debug(`[${bot.username}] ${completedNotReviewed.length} egzersiz değerlendirme bekliyor`);
        
        if (shouldPerform(REVIEW_PROBABILITY)) {
          const exerciseId = pickRandom(completedNotReviewed);
          logger.debug(`[${bot.username}] Egzersiz ${exerciseId} için değerlendirme yapılacak`);
          
          const exercises = await client.getExercises({ limit: 100 });
          
          // DEBUG: API'den gelen exercise ID tipini logla
          if (exercises.length > 0) {
            logger.debug(`[${bot.username}] API Exercise ID örnek: ${exercises[0].id} (tip: ${typeof exercises[0].id})`);
          }
          
          // ID karşılaştırmasını normalize et
          const exercise = exercises.find(e => {
            const apiId = typeof e.id === 'string' ? parseInt(e.id, 10) : e.id;
            return apiId === exerciseId;
          });
          
          if (exercise) {
            const comment = await openai.generateExerciseComment(exercise.title, exercise.slug, persona);
            const rating = randomInt(MIN_REVIEW_RATING, MAX_REVIEW_RATING);
            
            logger.debug(`[${bot.username}] Egzersiz yorumu oluşturuldu: "${comment.substring(0, 50)}..."`);
            
            const result = await client.createComment({
              post: exerciseId,
              content: comment,
              rating: rating,
              context: 'exercise'
            });
            
            logger.debug(`[${bot.username}] Comment API response: ${JSON.stringify(result)}`);
            
            if (result.status === 'success') {
              state.reviewed_exercises.push(exerciseId);
              botDb.updateState(bot.id, { reviewed_exercises: state.reviewed_exercises });
              botDb.logActivity(bot.id, 'exercise_review', 'exercise', exerciseId, true);
              logger.bot(bot.username, `Egzersiz değerlendirmesi yapıldı: "${comment.substring(0, 40)}..." (${rating}⭐)`);
            } else if (result.message?.includes('zaten değerlendirdiniz') || result.message?.includes('already')) {
              // Zaten değerlendirilmiş - state'e ekle
              if (!state.reviewed_exercises.includes(exerciseId)) {
                state.reviewed_exercises.push(exerciseId);
                botDb.updateState(bot.id, { reviewed_exercises: state.reviewed_exercises });
              }
              logger.debug(`[${bot.username}] Egzersiz zaten değerlendirilmiş: ${exerciseId}`);
            } else {
              logger.debug(`[${bot.username}] Egzersiz değerlendirme hatası: ${result.message}`);
            }
          } else {
            logger.debug(`[${bot.username}] Egzersiz bulunamadı: ${exerciseId} (API'de ${exercises.length} egzersiz var)`);
          }
        } else {
          logger.debug(`[${bot.username}] Değerlendirme olasılık kontrolünde atlandı (REVIEW_PROBABILITY: ${REVIEW_PROBABILITY})`);
        }
      }
    } catch (error: any) {
      logger.debug(`[${bot.username}] Egzersiz değerlendirme hatası: ${error.message}`);
    }
    await delay(500);
  }
  
  if (state. active_exercise_id) {
    if (shouldPerform(persona.behaviors.exerciseComplete)) {
      try {
        const exerciseId = typeof state.active_exercise_id === 'string' 
          ? parseInt(state.active_exercise_id, 10) 
          : state.active_exercise_id;
          
        const result = await client.completeExerciseProgress(exerciseId);
        if (result. status === 'success') {
          state.completed_exercises. push(exerciseId);  // Number olarak ekle
          state.active_exercise_id = null;
          botDb.updateState(bot.id, {
            completed_exercises: state.completed_exercises,
            active_exercise_id: null,
          });
          botDb.logActivity(bot.id, 'exercise_complete', 'exercise', exerciseId, true);
          logger.bot(bot.username, `Egzersiz tamamlandı! 💪`);
          logger.debug(`[${bot.username}] completed_exercises güncellendi: ${JSON.stringify(state.completed_exercises)}`);
        }
      } catch (error: any) {
        logger. debug(`[${bot.username}] Egzersiz tamamlama hatası: ${error.message}`);
      }
    }
  } else {
    if (shouldPerform(persona.behaviors. exerciseStart)) {
      try {
        const exercises = await client.getExercises({ limit: 20 });
        const available = exercises. filter(
          e => !state.started_exercises.includes(e.id) && !state.completed_exercises.includes(e.id)
        );

        if (available.length > 0) {
          const exercise = pickRandom(available);
          const result = await client.startExerciseProgress(exercise.id);
          if (result.status === 'success') {
            state.started_exercises.push(exercise.id);
            state.active_exercise_id = exercise. id;
            botDb.updateState(bot.id, {
              started_exercises: state.started_exercises,
              active_exercise_id:  exercise.id,
            });
            botDb.logActivity(bot.id, 'exercise_start', 'exercise', exercise.id, true);
            logger.bot(bot.username, `Egzersiz başlatıldı: "${exercise.title}"`);
          }
        }
      } catch (error: any) {
        logger.debug(`[${bot.username}] Egzersiz başlatma hatası: ${error.message}`);
      }
    }
  }
}

// ============ SOCIAL ============

async function performSocialActivities(
  bot: LocalBot,
  state: BotState,
  client: RejimdeAPIClient,
  persona:  typeof PERSONA_CONFIGS[PersonaType]
): Promise<void> {
  // Kullanıcı takip
  if (shouldPerform(persona.behaviors.followUsers)) {
    try {
      const leaderboard = await client.getLeaderboard({ limit: 50 });
      // Kendimizi VE zaten takip ettiklerimizi filtrele
      const notFollowed = leaderboard.filter(u => 
        u.id !== bot.user_id &&
        !state.followed_users.includes(u.id)
      );

      if (notFollowed.length > 0) {
        const user = pickRandom(notFollowed);
        const result = await client.followUser(user.id);

        if (result.status === 'success') {
          state.followed_users.push(user.id);
          botDb.updateState(bot.id, { followed_users: state.followed_users });
          botDb.logActivity(bot.id, 'follow', 'user', user.id, true);
          logger.bot(bot.username, `${user.name} takip edildi`);
        } else if (result.message?.includes('already') || result.message?.includes('zaten') || result.message?.includes('Takipten') || result.message?.includes('Kendinizi takip edemezsiniz')) {
          // Zaten takip ediliyor, toggle ile takipten çıkıldı, veya kendi kendini takip etmeye çalıştı
          // State'e ekleme (kendi user_id'si değilse)
          if (!state.followed_users.includes(user.id) && user.id !== bot.user_id) {
            state.followed_users.push(user.id);
            botDb.updateState(bot.id, { followed_users: state.followed_users });
          }
          logger.debug(`[${bot.username}] Kullanıcı zaten takip ediliyor veya takip edilemez: ${user.id}`);
        } else {
          logger.debug(`[${bot.username}] Takip hatası: ${result.message}`);
        }
      } else {
        logger.debug(`[${bot.username}] Takip edilebilecek kullanıcı kalmadı`);
      }
    } catch (error: any) {
      logger.debug(`[${bot.username}] Takip hatası: ${error.message}`);
    }
    await delay(300);
  }

  // High-five
  if (shouldPerform(persona. behaviors.sendHighFive) && state.followed_users.length > 0) {
    try {
      const userId = pickRandom(state.followed_users);
      const result = await client.sendHighFive(userId);

      if (result.status === 'success') {
        botDb.logActivity(bot.id, 'high_five', 'user', userId, true);
        logger.bot(bot.username, `Beşlik çakıldı!  ✋`);
      }
    } catch (error: any) {
      logger.debug(`[${bot.username}] High-five hatası:  ${error.message}`);
    }
    await delay(300);
  }

  // Circle katılım
  if (! state.circle_id && shouldPerform(persona.behaviors.circleJoin)) {
    try {
      const circles = await client.getCircles({ limit:  15 });

      if (circles. length > 0) {
        const circle = pickRandom(circles);
        const result = await client. joinCircle(circle.id);

        if (result.status === 'success') {
          state. circle_id = circle.id;
          botDb.updateState(bot.id, { circle_id:  circle.id });
          botDb.logActivity(bot.id, 'circle_join', 'circle', circle.id, true);
          logger.bot(bot. username, `Circle'a katıldı:  "${circle.name}" 🎯`);
        } else if (result.message?.includes('ayrılmalısınız') || result.message?.includes('already')) {
          // Zaten bir circle'da - API'den mevcut circle bilgisini çek ve state'i güncelle
          logger.debug(`[${bot.username}] Zaten bir circle'da, state senkronize ediliyor...`);
          const myCircle = await client.getMyCircle();
          if (myCircle) {
            // Circle bulundu - state'i güncelle
            state.circle_id = myCircle.id;
            botDb.updateState(bot.id, { circle_id: myCircle.id });
            logger.debug(`[${bot.username}] Circle state senkronize edildi: ${myCircle.name} (${myCircle.id})`);
          } else {
            // Circle bulunamadı (404) - kullanıcının eski circle_id meta'sı var ama circle silinmiş
            // State'i temizle, bir sonraki run'da tekrar denesin
            logger.debug(`[${bot.username}] Circle bulunamadı, bir sonraki çalıştırmada tekrar denenecek`);
          }
        }
      }
    } catch (error:  any) {
      logger.debug(`[${bot.username}] Circle hatası: ${error. message}`);
    }
  }

  // Uzman profili ziyareti
  if (shouldPerform(persona.behaviors.expertVisit)) {
    try {
      const experts = await client.getExperts({ limit: 20 });

      if (experts. length > 0) {
        const expert = pickRandom(experts);
        const sessionId = `bot_${bot.id}_${Date.now()}`;
        
        await client.trackProfileView(expert.slug, sessionId);
        botDb.logActivity(bot.id, 'expert_visit', 'expert', expert.id, true);
        logger.bot(bot.username, `Uzman ziyaret edildi: ${expert.name}`);

        if (Math.random() < 0.3 && expert.user_id) {
          const followResult = await client.followUser(expert.user_id);
          if (followResult. status === 'success') {
            state.followed_users. push(expert.user_id);
            botDb.updateState(bot.id, { followed_users:  state.followed_users });
            botDb.logActivity(bot.id, 'expert_follow', 'expert', expert.user_id, true);
            logger.bot(bot.username, `Uzman takip edildi: ${expert.name}`);
          }
        }
      }
    } catch (error: any) {
      logger.debug(`[${bot.username}] Uzman ziyareti hatası: ${error.message}`);
    }
  }
}

// ============ TRACKING ============

async function performTrackingActivities(
  bot: LocalBot,
  client: RejimdeAPIClient,
  persona: typeof PERSONA_CONFIGS[PersonaType]
): Promise<void> {
  // Su takibi
  if (shouldPerform(persona.behaviors.waterTracking)) {
    try {
      const glasses = randomInt(5, 12);
      
      for (let i = 0; i < glasses; i++) {
        await client.dispatchEvent('water_added', null, null, { amount: 200 });
        await delay(100);
      }
      
      botDb.logActivity(bot.id, 'water_log', null, null, true, JSON.stringify({ glasses }));
      logger.bot(bot.username, `Su kaydedildi:  ${glasses} bardak 💧`);
    } catch (error: any) {
      logger.debug(`[${bot.username}] Su loglama hatası:  ${error.message}`);
    }
    await delay(300);
  }

  // Öğün loglama
  if (shouldPerform(persona.behaviors.mealLogging)) {
    try {
      const meals = randomInt(1, 3);
      
      for (let i = 0; i < meals; i++) {
        await client.dispatchEvent('meal_photo_uploaded', 'meal', null);
        await delay(100);
      }
      
      botDb.logActivity(bot.id, 'meal_log', null, null, true, JSON.stringify({ meals }));
      logger.bot(bot. username, `Öğün kaydedildi:  ${meals} öğün 🍽️`);
    } catch (error: any) {
      logger. debug(`[${bot.username}] Öğün loglama hatası: ${error.message}`);
    }
    await delay(300);
  }

  // Adım senkronizasyonu
  if (shouldPerform(persona.behaviors.stepLogging)) {
    try {
      const steps = randomInt(3000, 15000);
      
      await client.dispatchEvent('steps_logged', null, null, { steps });
      
      botDb.logActivity(bot.id, 'steps_log', null, null, true, JSON.stringify({ steps }));
      logger.bot(bot.username, `Adım kaydedildi:  ${steps} adım 👟`);
    } catch (error:  any) {
      logger.debug(`[${bot.username}] Adım loglama hatası:  ${error.message}`);
    }
    await delay(300);
  }

  // Hesaplayıcı kullanma
  if (shouldPerform(persona. behaviors.calculatorUse)) {
    try {
      const calculatorTypes = ['bmi', 'calorie', 'water', 'ideal_weight'];
      const type = pickRandom(calculatorTypes);
      
      await client.dispatchEvent('calculator_saved', 'calculator', null, { type });
      
      botDb.logActivity(bot.id, 'calculator_use', 'calculator', null, true, JSON.stringify({ type }));
      logger.bot(bot.username, `Hesaplayıcı kullanıldı:  ${type} 🧮`);
    } catch (error: any) {
      logger.debug(`[${bot.username}] Hesaplayıcı hatası: ${error. message}`);
    }
  }
}

// ============ MAIN ============
runDailyActivities().catch(console.error);