console.log('=== SCHEDULED RUNNER STARTED ===');
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
const TOTAL_BOTS = 2500;
const START_HOUR = 6; // 06:00
const END_HOUR = 24; // 00:00 (24:00 = 00:00)
const WORKING_HOURS = END_HOUR - START_HOUR; // 18 saat
const MIN_DELAY_SECONDS = 20;
const MAX_DELAY_SECONDS = 60;
const DELAY_BETWEEN_ACTIONS = 800;
const REVIEW_PROBABILITY = 0.6;
const MIN_REVIEW_RATING = 4;
const MAX_REVIEW_RATING = 5;
const AI_GENERATION_PROBABILITY = 0.08;

interface ScheduledStats {
  totalBots: number;
  processed: number;
  skipped: number;
  errors: number;
  activities: {
    login: number;
    blogRead: number;
    blogComment: number;
    commentLike: number;
    commentReply: number;
    dietReview: number;
    dietStart: number;
    dietComplete: number;
    exerciseReview: number;
    exerciseStart: number;
    exerciseComplete: number;
    userFollow: number;
    highFive: number;
    circleJoin: number;
    expertVisit: number;
    waterLog: number;
    mealLog: number;
    stepsLog: number;
    calculatorUse: number;
    aiGeneration: number;
  };
  startTime: Date;
  endTime?: Date;
}

async function runScheduledActivities() {
  const stats: ScheduledStats = {
    totalBots: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    activities: {
      login: 0,
      blogRead: 0,
      blogComment: 0,
      commentLike: 0,
      commentReply: 0,
      dietReview: 0,
      dietStart: 0,
      dietComplete: 0,
      exerciseReview: 0,
      exerciseStart: 0,
      exerciseComplete: 0,
      userFollow: 0,
      highFive: 0,
      circleJoin: 0,
      expertVisit: 0,
      waterLog: 0,
      mealLog: 0,
      stepsLog: 0,
      calculatorUse: 0,
      aiGeneration: 0,
    },
    startTime: new Date(),
  };

  logger.info('🚀 Zamanlanmış Bot Aktiviteleri Başlıyor...');
  logger.info(`⏰ Çalışma Saatleri: ${START_HOUR}:00 - ${END_HOUR}:00 (${WORKING_HOURS} saat)`);
  logger.info(`⏱️  Bot Arası Gecikme: ${MIN_DELAY_SECONDS}-${MAX_DELAY_SECONDS} saniye`);
  console.log('');

  const openai = new OpenAIService();
  const allBots = botDb.getActiveBots();
  logger.info(`📊 Toplam ${allBots.length} aktif bot bulundu`);

  // Botları rastgele sırala (her gün farklı sıra)
  const shuffledBots = shuffleArray([...allBots]);
  
  // İlk TOTAL_BOTS kadar bot al
  const botsToProcess = shuffledBots.slice(0, Math.min(TOTAL_BOTS, shuffledBots.length));
  stats.totalBots = botsToProcess.length;
  
  logger.info(`🎯 İşlenecek Bot Sayısı: ${stats.totalBots}`);
  logger.info(`🔀 Botlar rastgele sıralandı`);
  console.log('');

  // Toplam süreyi hesapla
  const totalWorkingTimeMs = WORKING_HOURS * 60 * 60 * 1000;
  const averageDelayMs = ((MIN_DELAY_SECONDS + MAX_DELAY_SECONDS) / 2) * 1000;
  const estimatedDurationMs = stats.totalBots * averageDelayMs;
  
  logger.info(`⏳ Tahmini Süre: ${Math.round(estimatedDurationMs / 1000 / 60)} dakika (~${Math.round(estimatedDurationMs / 1000 / 60 / 60)} saat)`);
  console.log('');

  for (let i = 0; i < botsToProcess.length; i++) {
    const bot = botsToProcess[i];
    const progress = ((i + 1) / botsToProcess.length * 100).toFixed(1);
    
    try {
      const persona = PERSONA_CONFIGS[bot.persona as PersonaType];
      if (!persona) {
        stats.skipped++;
        continue;
      }

      // Bugün aktif olacak mı?
      if (!shouldPerform(persona.activityFrequency)) {
        logger.debug(`[${bot.username}] Bugün inaktif (${bot.persona})`);
        stats.skipped++;
        continue;
      }

      logger.info(`\n🤖 [${i + 1}/${stats.totalBots}] ${bot.username} (${bot.persona}) - %${progress}`);

      const client = new RejimdeAPIClient();
      const state = botDb.getState(bot.id);

      // 1. Login
      const loggedIn = await performLogin(bot, client, stats);
      if (!loggedIn) {
        stats.errors++;
        continue;
      }
      await delay(DELAY_BETWEEN_ACTIONS);

      // 2. Blog aktiviteleri
      await performBlogActivities(bot, state, client, persona, openai, stats);
      await delay(DELAY_BETWEEN_ACTIONS);

      // 3. Diyet aktiviteleri
      await performDietActivities(bot, state, client, persona, openai, stats);
      await delay(DELAY_BETWEEN_ACTIONS);

      // 4. Egzersiz aktiviteleri
      await performExerciseActivities(bot, state, client, persona, openai, stats);
      await delay(DELAY_BETWEEN_ACTIONS);

      // 5. Sosyal aktiviteler
      await performSocialActivities(bot, state, client, persona, stats);
      await delay(DELAY_BETWEEN_ACTIONS);

      // 6. Tracking aktiviteleri
      await performTrackingActivities(bot, client, persona, stats);
      await delay(DELAY_BETWEEN_ACTIONS);

      // 7. AI İçerik Oluşturma
      if (persona.aiEnabled && shouldPerform(AI_GENERATION_PROBABILITY)) {
        try {
          const aiResult = await performAIGeneratorActivity(bot, state, client);
          if (aiResult.success) {
            stats.activities.aiGeneration++;
            logger.bot(bot.username, `🤖 AI ${aiResult.type === 'diet' ? 'diyet' : 'egzersiz'} oluşturuldu!`);
          }
        } catch (error: any) {
          logger.debug(`[${bot.username}] AI oluşturma hatası: ${error.message}`);
        }
      }

      stats.processed++;

      // Rastgele bot arası gecikme
      const randomDelay = randomInt(MIN_DELAY_SECONDS, MAX_DELAY_SECONDS) * 1000;
      logger.debug(`⏱️  Sonraki bot için ${randomDelay / 1000}s bekleniyor...`);
      await delay(randomDelay);

    } catch (error: any) {
      logger.error(`[${bot.username}] Kritik hata: ${error.message}`);
      stats.errors++;
    }
  }

  stats.endTime = new Date();

  // Final rapor
  printFinalReport(stats);
}

// Rastgele sıralama fonksiyonu (Fisher-Yates shuffle)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============ LOGIN ============

async function performLogin(bot: LocalBot, client: RejimdeAPIClient, stats: ScheduledStats): Promise<boolean> {
  try {
    // Token geçerli mi?
    if (bot.jwt_token && bot.token_expiry) {
      const expiry = new Date(bot.token_expiry);
      if (expiry > new Date()) {
        client.setToken(bot.jwt_token);
        
        // Streak event dispatch
        const result = await client.dispatchEvent('login_success');
        if (result.status === 'success') {
          const streak = (result.data as any)?.current_streak || 0;
          botDb.updateLogin(bot.id, streak);
          stats.activities.login++;
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
    expiry.setDate(expiry.getDate() + 7);
    botDb.updateToken(bot.id, result.data.token, expiry);
    botDb.updateLogin(bot.id, result.data.current_streak || 0);
    botDb.logActivity(bot.id, 'login', null, null, true);

    stats.activities.login++;
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
  state: BotState,
  client: RejimdeAPIClient,
  persona: typeof PERSONA_CONFIGS[PersonaType],
  openai: OpenAIService,
  stats: ScheduledStats
): Promise<void> {
  // Blog okuma
  if (shouldPerform(persona.behaviors.blogReading)) {
    try {
      const blogs = await client.getBlogs({ limit: 30 });
      const unread = blogs.filter(b => !state.read_blogs.includes(b.id));

      if (unread.length > 0) {
        const blog = pickRandom(unread);
        const result = await client.claimBlogReward(blog.id);

        if (result.status === 'success') {
          state.read_blogs.push(blog.id);
          botDb.updateState(bot.id, { read_blogs: state.read_blogs });
          botDb.logActivity(bot.id, 'blog_read', 'blog', blog.id, true);
          stats.activities.blogRead++;
          logger.bot(bot.username, `Blog okundu: "${blog.title.substring(0, 30)}..."`);
        } else {
          if (result.message?.includes('already') || result.message?.includes('zaten')) {
            state.read_blogs.push(blog.id);
            botDb.updateState(bot.id, { read_blogs: state.read_blogs });
            logger.debug(`[${bot.username}] Blog zaten okunmuş: ${blog.id}`);
          }
        }
      }
    } catch (error: any) {
      logger.debug(`[${bot.username}] Blog okuma hatası: ${error.message}`);
    }
    await delay(500);
  }

  // Yorum beğenme
  if (shouldPerform(persona.behaviors.likeComments)) {
    try {
      const blogs = await client.getBlogs({ limit: 10 });
      if (blogs.length > 0) {
        const blog = pickRandom(blogs);
        const comments = await client.getComments(blog.id);
        
        if (comments.length > 0) {
          const unliked = comments.filter(c => !state.liked_comments.includes(c.id));
          if (unliked.length > 0) {
            const comment = pickRandom(unliked);
            const result = await client.likeComment(comment.id);
            
            if (result.status === 'success') {
              state.liked_comments.push(comment.id);
              botDb.updateState(bot.id, { liked_comments: state.liked_comments });
              botDb.logActivity(bot.id, 'comment_like', 'comment', comment.id, true);
              stats.activities.commentLike++;
              logger.bot(bot.username, `Yorum beğenildi`);
            }
          }
        }
      }
    } catch (error: any) {
      logger.debug(`[${bot.username}] Beğeni hatası: ${error.message}`);
    }
  }

  // AI yorum
  if (persona.aiEnabled && shouldPerform(persona.behaviors.blogCommenting)) {
    try {
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
            stats.activities.blogComment++;
            logger.bot(bot.username, `Blog yorumu: "${comment.substring(0, 40)}..."`);
          } else if (result.message?.includes('zaten değerlendirdiniz') || result.message?.includes('already')) {
            if (!state.commented_posts.includes(blogId)) {
              state.commented_posts.push(blogId);
              botDb.updateState(bot.id, { commented_posts: state.commented_posts });
            }
            logger.debug(`[${bot.username}] Blog zaten yorumlanmış: ${blogId}`);
          }
        }
      }
    } catch (error: any) {
      logger.debug(`[${bot.username}] Yorum hatası: ${error.message}`);
    }
  }

  // Yorumlara cevap (AI)
  if (persona.aiEnabled && shouldPerform(persona.behaviors.replyToComments)) {
    try {
      const blogs = await client.getBlogs({ limit: 10 });
      if (blogs.length === 0) return;

      const blog = pickRandom(blogs);
      const comments = await client.getComments(blog.id);

      // Helper: Ana yorum kontrolü
      const isRootComment = (comment: any): boolean => {
        return !comment.parent || 
               comment.parent === 0 || 
               comment.parent === "0" ||
               comment.parent === null;
      };

      const replyableComments = comments.filter((c: any) => 
        !state.replied_comments.includes(c.id) && isRootComment(c)
      );

      if (replyableComments.length === 0) return;

      const parentComment = pickRandom(replyableComments);

      // Thread context: Önceki cevapları al
      const previousReplies = comments
        .filter((c: any) => c.parent === parentComment.id)
        .map((c: any) => c.content);

      const reply = await openai.generateCommentReply(
        parentComment.content,
        previousReplies,
        blog.title,
        persona
      );

      const result = await client.createComment({
        post: blog.id,
        content: reply,
        parent: parentComment.id,
        context: 'blog'
      });

      if (result.status === 'success') {
        state.replied_comments.push(parentComment.id);
        botDb.updateState(bot.id, { replied_comments: state.replied_comments });
        botDb.logActivity(bot.id, 'comment_reply', 'comment', parentComment.id, true);
        stats.activities.commentReply++;
        logger.bot(bot.username, `Yoruma cevap: "${reply.substring(0, 40)}..."`);
      }
    } catch (error: any) {
      logger.debug(`[${bot.username}] Reply aktivitesi hatası: ${error.message}`);
    }
  }
}

// ============ DIET ============

async function performDietActivities(
  bot: LocalBot,
  state: BotState,
  client: RejimdeAPIClient,
  persona: typeof PERSONA_CONFIGS[PersonaType],
  openai: OpenAIService,
  stats: ScheduledStats
): Promise<void> {
  // Tamamlanmış diyetleri değerlendir
  if (persona.aiEnabled) {
    try {
      const completedIds = state.completed_diets.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
      const reviewedIds = state.reviewed_diets.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
      
      const completedNotReviewed = completedIds.filter(id => !reviewedIds.includes(id));
      
      if (completedNotReviewed.length > 0 && shouldPerform(REVIEW_PROBABILITY)) {
        const dietId = pickRandom(completedNotReviewed);
        const diets = await client.getDiets({ limit: 100 });
        
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
            stats.activities.dietReview++;
            logger.bot(bot.username, `Diyet değerlendirmesi yapıldı: "${comment.substring(0, 40)}..." (${rating}⭐)`);
          } else if (result.message?.includes('zaten değerlendirdiniz') || result.message?.includes('already')) {
            if (!state.reviewed_diets.includes(dietId)) {
              state.reviewed_diets.push(dietId);
              botDb.updateState(bot.id, { reviewed_diets: state.reviewed_diets });
            }
          }
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
          state.completed_diets.push(dietId);
          state.active_diet_id = null;
          botDb.updateState(bot.id, {
            completed_diets: state.completed_diets,
            active_diet_id: null,
          });
          botDb.logActivity(bot.id, 'diet_complete', 'diet', dietId, true);
          stats.activities.dietComplete++;
          logger.bot(bot.username, `Diyet tamamlandı! 🎉`);
        }
      } catch (error: any) {
        logger.debug(`[${bot.username}] Diyet tamamlama hatası: ${error.message}`);
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
          const result = await client.startPlan(diet.id);

          if (result.status === 'success') {
            state.started_diets.push(diet.id);
            state.active_diet_id = diet.id;
            botDb.updateState(bot.id, {
              started_diets: state.started_diets,
              active_diet_id: diet.id,
            });
            botDb.logActivity(bot.id, 'diet_start', 'diet', diet.id, true);
            stats.activities.dietStart++;
            logger.bot(bot.username, `Diyet başlatıldı: "${diet.title}"`);
          }
        }
      } catch (error: any) {
        logger.debug(`[${bot.username}] Diyet başlatma hatası: ${error.message}`);
      }
    }
  }
}

// ============ EXERCISE ============

async function performExerciseActivities(
  bot: LocalBot,
  state: BotState,
  client: RejimdeAPIClient,
  persona: typeof PERSONA_CONFIGS[PersonaType],
  openai: OpenAIService,
  stats: ScheduledStats
): Promise<void> {
  // Tamamlanmış egzersizleri değerlendir
  if (persona.aiEnabled) {
    try {
      const completedIds = state.completed_exercises.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
      const reviewedIds = state.reviewed_exercises.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
      
      const completedNotReviewed = completedIds.filter(id => !reviewedIds.includes(id));
      
      if (completedNotReviewed.length > 0 && shouldPerform(REVIEW_PROBABILITY)) {
        const exerciseId = pickRandom(completedNotReviewed);
        const exercises = await client.getExercises({ limit: 100 });
        
        const exercise = exercises.find(e => {
          const apiId = typeof e.id === 'string' ? parseInt(e.id, 10) : e.id;
          return apiId === exerciseId;
        });
        
        if (exercise) {
          const comment = await openai.generateExerciseComment(exercise.title, exercise.slug, persona);
          const rating = randomInt(MIN_REVIEW_RATING, MAX_REVIEW_RATING);
          
          const result = await client.createComment({
            post: exerciseId,
            content: comment,
            rating: rating,
            context: 'exercise'
          });
          
          if (result.status === 'success') {
            state.reviewed_exercises.push(exerciseId);
            botDb.updateState(bot.id, { reviewed_exercises: state.reviewed_exercises });
            botDb.logActivity(bot.id, 'exercise_review', 'exercise', exerciseId, true);
            stats.activities.exerciseReview++;
            logger.bot(bot.username, `Egzersiz değerlendirmesi yapıldı: "${comment.substring(0, 40)}..." (${rating}⭐)`);
          } else if (result.message?.includes('zaten değerlendirdiniz') || result.message?.includes('already')) {
            if (!state.reviewed_exercises.includes(exerciseId)) {
              state.reviewed_exercises.push(exerciseId);
              botDb.updateState(bot.id, { reviewed_exercises: state.reviewed_exercises });
            }
          }
        }
      }
    } catch (error: any) {
      logger.debug(`[${bot.username}] Egzersiz değerlendirme hatası: ${error.message}`);
    }
    await delay(500);
  }
  
  if (state.active_exercise_id) {
    if (shouldPerform(persona.behaviors.exerciseComplete)) {
      try {
        const exerciseId = typeof state.active_exercise_id === 'string' 
          ? parseInt(state.active_exercise_id, 10) 
          : state.active_exercise_id;
          
        const result = await client.completeExerciseProgress(exerciseId);
        if (result.status === 'success') {
          state.completed_exercises.push(exerciseId);
          state.active_exercise_id = null;
          botDb.updateState(bot.id, {
            completed_exercises: state.completed_exercises,
            active_exercise_id: null,
          });
          botDb.logActivity(bot.id, 'exercise_complete', 'exercise', exerciseId, true);
          stats.activities.exerciseComplete++;
          logger.bot(bot.username, `Egzersiz tamamlandı! 💪`);
        }
      } catch (error: any) {
        logger.debug(`[${bot.username}] Egzersiz tamamlama hatası: ${error.message}`);
      }
    }
  } else {
    if (shouldPerform(persona.behaviors.exerciseStart)) {
      try {
        const exercises = await client.getExercises({ limit: 20 });
        const available = exercises.filter(
          e => !state.started_exercises.includes(e.id) && !state.completed_exercises.includes(e.id)
        );

        if (available.length > 0) {
          const exercise = pickRandom(available);
          const result = await client.startExerciseProgress(exercise.id);
          if (result.status === 'success') {
            state.started_exercises.push(exercise.id);
            state.active_exercise_id = exercise.id;
            botDb.updateState(bot.id, {
              started_exercises: state.started_exercises,
              active_exercise_id: exercise.id,
            });
            botDb.logActivity(bot.id, 'exercise_start', 'exercise', exercise.id, true);
            stats.activities.exerciseStart++;
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
  persona: typeof PERSONA_CONFIGS[PersonaType],
  stats: ScheduledStats
): Promise<void> {
  // Kullanıcı takip
  if (shouldPerform(persona.behaviors.followUsers)) {
    try {
      const leaderboard = await client.getLeaderboard({ limit: 50 });
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
          stats.activities.userFollow++;
          logger.bot(bot.username, `${user.name} takip edildi`);
        } else if (result.message?.includes('already') || result.message?.includes('zaten') || result.message?.includes('Takipten') || result.message?.includes('Kendinizi takip edemezsiniz')) {
          if (!state.followed_users.includes(user.id) && user.id !== bot.user_id) {
            state.followed_users.push(user.id);
            botDb.updateState(bot.id, { followed_users: state.followed_users });
          }
        }
      }
    } catch (error: any) {
      logger.debug(`[${bot.username}] Takip hatası: ${error.message}`);
    }
    await delay(300);
  }

  // High-five
  if (shouldPerform(persona.behaviors.sendHighFive) && state.followed_users.length > 0) {
    try {
      const userId = pickRandom(state.followed_users);
      const result = await client.sendHighFive(userId);

      if (result.status === 'success') {
        botDb.logActivity(bot.id, 'high_five', 'user', userId, true);
        stats.activities.highFive++;
        logger.bot(bot.username, `Beşlik çakıldı! ✋`);
      }
    } catch (error: any) {
      logger.debug(`[${bot.username}] High-five hatası: ${error.message}`);
    }
    await delay(300);
  }

  // Circle katılım
  if (!state.circle_id && shouldPerform(persona.behaviors.circleJoin)) {
    try {
      const circles = await client.getCircles({ limit: 15 });

      if (circles.length > 0) {
        const circle = pickRandom(circles);
        const result = await client.joinCircle(circle.id);

        if (result.status === 'success') {
          state.circle_id = circle.id;
          botDb.updateState(bot.id, { circle_id: circle.id });
          botDb.logActivity(bot.id, 'circle_join', 'circle', circle.id, true);
          stats.activities.circleJoin++;
          logger.bot(bot.username, `Circle'a katıldı: "${circle.name}" 🎯`);
        } else if (result.message?.includes('ayrılmalısınız') || result.message?.includes('already')) {
          const myCircle = await client.getMyCircle();
          if (myCircle) {
            state.circle_id = myCircle.id;
            botDb.updateState(bot.id, { circle_id: myCircle.id });
          }
        }
      }
    } catch (error: any) {
      logger.debug(`[${bot.username}] Circle hatası: ${error.message}`);
    }
  }

  // Uzman profili ziyareti
  if (shouldPerform(persona.behaviors.expertVisit)) {
    try {
      const experts = await client.getExperts({ limit: 20 });

      if (experts.length > 0) {
        const expert = pickRandom(experts);
        const sessionId = `bot_${bot.id}_${Date.now()}`;
        
        await client.trackProfileView(expert.slug, sessionId);
        botDb.logActivity(bot.id, 'expert_visit', 'expert', expert.id, true);
        stats.activities.expertVisit++;
        logger.bot(bot.username, `Uzman ziyaret edildi: ${expert.name}`);

        if (Math.random() < 0.3 && expert.user_id) {
          const followResult = await client.followUser(expert.user_id);
          if (followResult.status === 'success') {
            state.followed_users.push(expert.user_id);
            botDb.updateState(bot.id, { followed_users: state.followed_users });
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
  persona: typeof PERSONA_CONFIGS[PersonaType],
  stats: ScheduledStats
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
      stats.activities.waterLog++;
      logger.bot(bot.username, `Su kaydedildi: ${glasses} bardak 💧`);
    } catch (error: any) {
      logger.debug(`[${bot.username}] Su loglama hatası: ${error.message}`);
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
      stats.activities.mealLog++;
      logger.bot(bot.username, `Öğün kaydedildi: ${meals} öğün 🍽️`);
    } catch (error: any) {
      logger.debug(`[${bot.username}] Öğün loglama hatası: ${error.message}`);
    }
    await delay(300);
  }

  // Adım senkronizasyonu
  if (shouldPerform(persona.behaviors.stepLogging)) {
    try {
      const steps = randomInt(3000, 15000);
      
      await client.dispatchEvent('steps_logged', null, null, { steps });
      
      botDb.logActivity(bot.id, 'steps_log', null, null, true, JSON.stringify({ steps }));
      stats.activities.stepsLog++;
      logger.bot(bot.username, `Adım kaydedildi: ${steps} adım 👟`);
    } catch (error: any) {
      logger.debug(`[${bot.username}] Adım loglama hatası: ${error.message}`);
    }
    await delay(300);
  }

  // Hesaplayıcı kullanma
  if (shouldPerform(persona.behaviors.calculatorUse)) {
    try {
      const calculatorTypes = ['bmi', 'calorie', 'water', 'ideal_weight'];
      const type = pickRandom(calculatorTypes);
      
      await client.dispatchEvent('calculator_saved', 'calculator', null, { type });
      
      botDb.logActivity(bot.id, 'calculator_use', 'calculator', null, true, JSON.stringify({ type }));
      stats.activities.calculatorUse++;
      logger.bot(bot.username, `Hesaplayıcı kullanıldı: ${type} 🧮`);
    } catch (error: any) {
      logger.debug(`[${bot.username}] Hesaplayıcı hatası: ${error.message}`);
    }
  }
}

// ============ FINAL REPORT ============

function printFinalReport(stats: ScheduledStats) {
  const duration = stats.endTime 
    ? (stats.endTime.getTime() - stats.startTime.getTime()) / 1000 
    : 0;
  
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);

  console.log('');
  console.log('========================================');
  logger.info('📊 ZAMANLANMIŞ BOT AKTİVİTE RAPORU');
  console.log('========================================');
  console.log(`⏰ Başlangıç: ${stats.startTime.toLocaleString('tr-TR')}`);
  if (stats.endTime) {
    console.log(`⏰ Bitiş: ${stats.endTime.toLocaleString('tr-TR')}`);
  }
  console.log(`⏱️  Süre: ${hours}s ${minutes}d ${seconds}s`);
  console.log('========================================');
  console.log(`  🎯 Hedef Bot: ${stats.totalBots}`);
  console.log(`  ✅ İşlenen: ${stats.processed}`);
  console.log(`  ⏩ Atlanan: ${stats.skipped}`);
  console.log(`  ❌ Hata: ${stats.errors}`);
  console.log('========================================');
  console.log('📈 AKTİVİTE İSTATİSTİKLERİ:');
  console.log('----------------------------------------');
  console.log(`  🔐 Login: ${stats.activities.login}`);
  console.log(`  📖 Blog Okuma: ${stats.activities.blogRead}`);
  console.log(`  💬 Blog Yorum: ${stats.activities.blogComment}`);
  console.log(`  👍 Yorum Beğeni: ${stats.activities.commentLike}`);
  console.log(`  💭 Yorum Cevap: ${stats.activities.commentReply}`);
  console.log(`  ⭐ Diyet Değerlendirme: ${stats.activities.dietReview}`);
  console.log(`  🥗 Diyet Başlatma: ${stats.activities.dietStart}`);
  console.log(`  🎉 Diyet Tamamlama: ${stats.activities.dietComplete}`);
  console.log(`  ⭐ Egzersiz Değerlendirme: ${stats.activities.exerciseReview}`);
  console.log(`  💪 Egzersiz Başlatma: ${stats.activities.exerciseStart}`);
  console.log(`  🎯 Egzersiz Tamamlama: ${stats.activities.exerciseComplete}`);
  console.log(`  👥 Kullanıcı Takip: ${stats.activities.userFollow}`);
  console.log(`  ✋ High Five: ${stats.activities.highFive}`);
  console.log(`  🎯 Circle Katılım: ${stats.activities.circleJoin}`);
  console.log(`  👨‍⚕️ Uzman Ziyaret: ${stats.activities.expertVisit}`);
  console.log(`  💧 Su Kayıt: ${stats.activities.waterLog}`);
  console.log(`  🍽️  Öğün Kayıt: ${stats.activities.mealLog}`);
  console.log(`  👟 Adım Kayıt: ${stats.activities.stepsLog}`);
  console.log(`  🧮 Hesaplayıcı: ${stats.activities.calculatorUse}`);
  console.log(`  🤖 AI İçerik: ${stats.activities.aiGeneration}`);
  console.log('========================================');
  
  const totalActivities = Object.values(stats.activities).reduce((sum, count) => sum + count, 0);
  console.log(`  📊 TOPLAM AKTİVİTE: ${totalActivities}`);
  console.log('========================================');
}

// ============ MAIN ============
runScheduledActivities().catch(console.error);
