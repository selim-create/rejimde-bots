import { PersonaType, PersonaConfig } from '../types';

/**
 * Persona Dağılımı - 1000 Kullanıcı
 */

export const PERSONA_CONFIGS:  Record<PersonaType, PersonaConfig> = {
  // SÜPER AKTİF (%3 = 30 kullanıcı)
  super_active: {
    count: 30,
    description: 'Her gün giriş, yorum yapar, AI destekli içerik üretir',
    ai_enabled: true,
    activities: {
      daily_login: 1.0,
      blog_read: 0.9,
      blog_comment: 0.5,
      comment_reply: 0.3,
      diet_start: 0.7,
      diet_meal_complete: 0.8,
      diet_comment: 0.4,
      exercise_start: 0.6,
      exercise_complete: 0.7,
      water_log: 0.95,
      step_log: 0.8,
      meal_log: 0.7,
      circle_join: 0.9,
      follow_user: 0.6,
      high_five: 0.5,
      expert_follow: 0.4,
      calculator_use: 0.3,
      like_comment: 0.7,
    },
  },

  // AKTİF (%15 = 150 kullanıcı)
  active: {
    count: 150,
    description: 'Haftada 4-5 gün giriş, bazı aktiviteleri yapar',
    ai_enabled:  false,
    activities: {
      daily_login: 0.7,
      blog_read: 0.6,
      blog_comment: 0.1,
      diet_start: 0.5,
      diet_meal_complete:  0.6,
      exercise_start: 0.4,
      exercise_complete: 0.5,
      water_log: 0.6,
      step_log: 0.5,
      circle_join: 0.6,
      follow_user: 0.3,
      high_five: 0.3,
      like_comment: 0.4,
    },
  },

  // NORMAL (%30 = 300 kullanıcı)
  normal: {
    count: 300,
    description: 'Haftada 2-3 gün giriş, temel aktiviteler',
    ai_enabled: false,
    activities: {
      daily_login: 0.4,
      blog_read: 0.4,
      diet_start: 0.3,
      diet_meal_complete:  0.4,
      exercise_start: 0.2,
      water_log: 0.3,
      circle_join: 0.3,
      follow_user: 0.2,
      like_comment: 0.2,
    },
  },

  // DÜŞÜK AKTİF (%25 = 250 kullanıcı)
  low_activity: {
    count: 250,
    description: 'Haftada 1 gün, minimal aktivite',
    ai_enabled: false,
    activities: {
      daily_login: 0.15,
      blog_read: 0.2,
      diet_start: 0.1,
      water_log: 0.1,
      circle_join: 0.1,
    },
  },

  // UYKUDA (%20 = 200 kullanıcı)
  dormant: {
    count:  200,
    description: 'Kayıt olmuş ama çok nadir giriş yapar',
    ai_enabled:  false,
    activities: {
      daily_login: 0.05,
      blog_read: 0.05,
    },
  },

  // DİYET ODAKLI (%5 = 50 kullanıcı)
  diet_focused: {
    count: 50,
    description: 'Sadece diyet özelliklerini kullanır',
    ai_enabled: false,
    activities: {
      daily_login: 0.6,
      blog_read: 0.3,
      diet_start: 0.9,
      diet_meal_complete: 0.85,
      water_log: 0.8,
      meal_log: 0.7,
      calculator_use: 0.5,
    },
  },

  // EGZERSİZ ODAKLI (%2 = 20 kullanıcı)
  exercise_focused: {
    count: 20,
    description: 'Sadece egzersiz özelliklerini kullanır',
    ai_enabled: false,
    activities: {
      daily_login:  0.6,
      blog_read: 0.2,
      exercise_start: 0.9,
      exercise_complete: 0.85,
      step_log: 0.9,
      water_log: 0.7,
    },
  },
};

/**
 * Toplam bot sayısını hesapla
 */
export function getTotalBotCount(): number {
  return Object.values(PERSONA_CONFIGS).reduce((sum, config) => sum + config.count, 0);
}

/**
 * Persona listesini dağılıma göre oluştur
 */
export function getPersonaDistribution(): PersonaType[] {
  const distribution: PersonaType[] = [];

  for (const [persona, config] of Object.entries(PERSONA_CONFIGS)) {
    for (let i = 0; i < config.count; i++) {
      distribution.push(persona as PersonaType);
    }
  }

  // Shuffle
  for (let i = distribution. length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [distribution[i], distribution[j]] = [distribution[j], distribution[i]];
  }

  return distribution;
}

/**
 * Aktivite olasılığına göre yapılıp yapılmayacağını belirle
 */
export function shouldDoActivity(probability: number | undefined): boolean {
  if (!probability) return false;
  return Math.random() < probability;
}