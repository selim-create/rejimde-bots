import { PersonaType } from '../types';
import { WritingStyle } from './writing-styles.config';
import { CommentType } from './comment-prompts.config';

export interface PersonaBehaviors {
  dailyLogin: number;
  blogReading: number;
  blogCommenting: number;
  dietStart: number;
  dietComplete: number;
  exerciseStart: number;
  exerciseComplete: number;
  waterTracking: number;
  mealLogging: number;
  stepLogging: number;
  circleJoin: number;
  followUsers: number;
  sendHighFive: number;
  likeComments: number;
  expertVisit: number;
  calculatorUse: number;
  replyToComments: number;
}

export interface PersonaConfig {
  name: string;
  description: string;
  count: number;
  activityFrequency: number;
  aiEnabled: boolean;
  behaviors: PersonaBehaviors;
  
  // YENİ ALANLAR
  writingStyles: WritingStyle[];        // Bu persona hangi stillerde yazabilir
  preferredCommentTypes: CommentType[]; // Hangi tip yorumlar yapabilir
  emojiFrequency: 'none' | 'low' | 'medium' | 'high';
  typoFrequency: number;                // 0-1 arası, yazım hatası olasılığı (gerçekçilik için)
}

export const PERSONA_CONFIGS: Record<PersonaType, PersonaConfig> = {
  super_active: {
    name: 'Süper Aktif',
    description: 'Her gün aktif, her şeyi yapan kullanıcı.  AI destekli yorum yazabilir.',
    count: 30,
    activityFrequency: 0.95,
    aiEnabled: true,
    behaviors: {
      dailyLogin: 0.98,
      blogReading: 0.80,
      blogCommenting: 0.30,
      dietStart: 0.40,
      dietComplete: 0.85,
      exerciseStart: 0.50,
      exerciseComplete: 0.80,
      waterTracking: 0.90,
      mealLogging: 0.70,
      stepLogging:  0.85,
      circleJoin: 0.60,
      followUsers: 0.50,
      sendHighFive: 0.40,
      likeComments: 0.60,
      expertVisit: 0.30,
      calculatorUse: 0.25,
      replyToComments: 0.20
    },
    // YENİ
    writingStyles: ['enthusiastic', 'storyteller', 'supportive', 'casual'],
    preferredCommentTypes: ['appreciation', 'personal_story', 'motivation', 'before_after', 'recommendation'],
    emojiFrequency: 'high',
    typoFrequency: 0.05
  },
  active:  {
    name:  'Aktif',
    description:  'Düzenli kullanıcı',
    count: 150,
    activityFrequency: 0.75,
    aiEnabled: false,
    behaviors:  {
      dailyLogin: 0.80,
      blogReading: 0.50,
      blogCommenting: 0.10,
      dietStart: 0.25,
      dietComplete: 0.70,
      exerciseStart: 0.30,
      exerciseComplete: 0.65,
      waterTracking: 0.60,
      mealLogging: 0.40,
      stepLogging: 0.50,
      circleJoin: 0.30,
      followUsers: 0.30,
      sendHighFive: 0.20,
      likeComments:  0.40,
      expertVisit: 0.15,
      calculatorUse: 0.15,
      replyToComments: 0.05
    },
    // YENİ
    writingStyles: ['casual', 'formal', 'analytical', 'minimalist'],
    preferredCommentTypes: ['appreciation', 'agreement', 'specific_point', 'tip_sharing'],
    emojiFrequency: 'medium',
    typoFrequency: 0.10
  },
  normal: {
    name: 'Normal',
    description: 'Ortalama kullanıcı',
    count: 350,
    activityFrequency: 0.50,
    aiEnabled: false,
    behaviors: {
      dailyLogin: 0.60,
      blogReading: 0.30,
      blogCommenting: 0.05,
      dietStart: 0.15,
      dietComplete: 0.50,
      exerciseStart: 0.15,
      exerciseComplete: 0.45,
      waterTracking: 0.30,
      mealLogging: 0.20,
      stepLogging: 0.25,
      circleJoin: 0.15,
      followUsers: 0.15,
      sendHighFive: 0.10,
      likeComments:  0.20,
      expertVisit: 0.08,
      calculatorUse: 0.10,
      replyToComments: 0.02
    },
    // YENİ
    writingStyles: ['casual', 'minimalist'],
    preferredCommentTypes: ['appreciation', 'agreement'],
    emojiFrequency: 'low',
    typoFrequency: 0.15
  },
  low_activity: {
    name: 'Düşük Aktivite',
    description: 'Ara sıra gelen kullanıcı',
    count:  250,
    activityFrequency: 0.25,
    aiEnabled: false,
    behaviors: {
      dailyLogin: 0.30,
      blogReading: 0.15,
      blogCommenting: 0.02,
      dietStart: 0.08,
      dietComplete: 0.30,
      exerciseStart: 0.05,
      exerciseComplete: 0.25,
      waterTracking: 0.10,
      mealLogging: 0.08,
      stepLogging: 0.10,
      circleJoin: 0.05,
      followUsers: 0.08,
      sendHighFive: 0.05,
      likeComments:  0.08,
      expertVisit: 0.03,
      calculatorUse: 0.05,
      replyToComments: 0.01
    },
    // YENİ
    writingStyles: ['minimalist', 'casual'],
    preferredCommentTypes: ['appreciation'],
    emojiFrequency: 'none',
    typoFrequency: 0.20
  },
  dormant: {
    name: 'Uykuda',
    description:  'Nadiren aktif kullanıcı',
    count: 120,
    activityFrequency: 0.08,
    aiEnabled: false,
    behaviors: {
      dailyLogin: 0.10,
      blogReading: 0.05,
      blogCommenting: 0.00,
      dietStart: 0.02,
      dietComplete: 0.10,
      exerciseStart: 0.02,
      exerciseComplete: 0.10,
      waterTracking: 0.03,
      mealLogging: 0.02,
      stepLogging: 0.03,
      circleJoin: 0.01,
      followUsers: 0.02,
      sendHighFive: 0.01,
      likeComments:  0.02,
      expertVisit: 0.01,
      calculatorUse: 0.01,
      replyToComments: 0.00
    },
    // YENİ
    writingStyles: ['minimalist'],
    preferredCommentTypes: ['appreciation'],
    emojiFrequency: 'none',
    typoFrequency: 0.25
  },
  diet_focused: {
    name: 'Diyet Odaklı',
    description: 'Diyete odaklı kullanıcı',
    count: 50,
    activityFrequency: 0.65,
    aiEnabled: true,
    behaviors: {
      dailyLogin: 0.75,
      blogReading: 0.60,
      blogCommenting: 0.15,
      dietStart: 0.50,
      dietComplete: 0.75,
      exerciseStart: 0.10,
      exerciseComplete: 0.30,
      waterTracking: 0.80,
      mealLogging: 0.70,
      stepLogging: 0.20,
      circleJoin: 0.25,
      followUsers: 0.20,
      sendHighFive: 0.15,
      likeComments:  0.30,
      expertVisit: 0.25,
      calculatorUse: 0.40,
      replyToComments: 0.08
    },
    // YENİ
    writingStyles: ['analytical', 'storyteller', 'formal'],
    preferredCommentTypes: ['specific_point', 'before_after', 'tip_sharing', 'personal_story'],
    emojiFrequency: 'low',
    typoFrequency: 0.08
  },
  exercise_focused: {
    name: 'Egzersiz Odaklı',
    description: 'Egzersize odaklı kullanıcı',
    count: 50,
    activityFrequency: 0.65,
    aiEnabled: true,
    behaviors: {
      dailyLogin: 0.75,
      blogReading: 0.40,
      blogCommenting: 0.10,
      dietStart: 0.15,
      dietComplete: 0.40,
      exerciseStart: 0.55,
      exerciseComplete: 0.80,
      waterTracking: 0.60,
      mealLogging: 0.25,
      stepLogging: 0.85,
      circleJoin: 0.30,
      followUsers: 0.25,
      sendHighFive: 0.30,
      likeComments: 0.25,
      expertVisit: 0.15,
      calculatorUse: 0.30,
      replyToComments: 0.05
    },
    // YENİ
    writingStyles: ['enthusiastic', 'supportive', 'gen_z', 'casual'],
    preferredCommentTypes: ['motivation', 'before_after', 'personal_story', 'recommendation'],
    emojiFrequency: 'high',
    typoFrequency: 0.12
  }
};

// Backward compatibility - PERSONAS alias
export const PERSONAS = PERSONA_CONFIGS;