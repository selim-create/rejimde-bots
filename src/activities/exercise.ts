import { LocalBot, BotState, ExercisePlan } from '../types';
import { RejimdeAPIClient } from '../utils/api-client';
import { botDb } from '../database/bot-db';
import { PersonaConfig } from '../config/personas.config';
import { logger } from '../utils/logger';
import { shouldPerform, pickRandom } from '../utils/random';

export async function performExerciseActivities(
  bot: LocalBot,
  state: BotState,
  client: RejimdeAPIClient,
  persona: PersonaConfig
): Promise<void> {
  if (!persona) return;
  
  // Aktif egzersiz varsa tamamlama kontrolü
  if (state.active_exercise_id) {
    if (shouldPerform(persona.behaviors.exerciseComplete)) {
      await completeExercise(bot, state, client);
    }
  } else {
    // Yeni egzersiz başlatma
    if (shouldPerform(persona.behaviors.exerciseStart)) {
      await startNewExercise(bot, state, client);
    }
  }
}

async function startNewExercise(
  bot:  LocalBot,
  state: BotState,
  client:  RejimdeAPIClient
): Promise<void> {
  try {
    const exercises = await client. getExercises({ limit: 30 });
    const available = exercises.filter((e: ExercisePlan) => 
      !state. started_exercises.includes(e.id) && 
      ! state.completed_exercises.includes(e. id)
    );
    
    if (available.length === 0) {
      logger.debug(`[${bot.username}] Başlanabilecek egzersiz kalmadı`);
      return;
    }
    
    const exercise = pickRandom(available);
    
    const result = await client.startExercise(exercise. id);
    
    if (result. status === 'success') {
      state.started_exercises. push(exercise.id);
      state.active_exercise_id = exercise.id;
      botDb. updateState(bot. id, {
        started_exercises: state.started_exercises,
        active_exercise_id: exercise. id
      });
      botDb.logActivity(bot.id, 'exercise_start', 'exercise', exercise.id, true);
      logger.bot(bot. username, `Egzersiz başlatıldı: "${exercise.title}"`);
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] Egzersiz başlatma hatası: ${error.message}`);
  }
}

async function completeExercise(
  bot: LocalBot,
  state: BotState,
  client: RejimdeAPIClient
): Promise<void> {
  try {
    if (!state. active_exercise_id) return;
    
    const exerciseId = state.active_exercise_id;
    const result = await client.completeExercise(exerciseId);
    
    if (result.status === 'success') {
      state.completed_exercises.push(exerciseId);
      state.active_exercise_id = null;
      botDb. updateState(bot. id, {
        completed_exercises: state.completed_exercises,
        active_exercise_id: null
      });
      botDb.logActivity(bot.id, 'exercise_complete', 'exercise', exerciseId, true);
      logger.bot(bot.username, `Egzersiz tamamlandı! 💪`);
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] Egzersiz tamamlama hatası: ${error.message}`);
  }
}