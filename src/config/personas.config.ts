import { PersonaType } from '../types';

export interface PersonaBehaviors {
  dailyLogin: number;          // Her gün giriş yapma olasılığı (0-1)
  blogReading: number;         // Blog okuma olasılığı
  blogCommenting: number;      // Yorum yazma olasılığı
  dietStart: number;           // Diyet başlatma olasılığı
  dietComplete: number;        // Başladığı diyeti tamamlama olasılığı
  exerciseStart: number;       // Egzersiz başlatma olasılığı
  exerciseComplete: number;    // Egzersiz tamamlama olasılığı
  waterTracking: number;       // Su takibi yapma olasılığı
  mealLogging: number;         // Öğün loglama olasılığı
  stepLogging: number;         // Adım senkronizasyonu
  circleJoin: number;          // Circle'a katılma olasılığı
  followUsers: number;         // Kullanıcı takip etme olasılığı
  sendHighFive: number;        // Beşlik çakma olasılığı
  likeComments: number;        // Yorum beğenme olasılığı
  expertVisit: number;         // Uzman profili ziyareti
  calculatorUse: number;       // Hesaplayıcı kullanma
  replyToComments: number;     // Yorumlara cevap yazma
}

export interface PersonaConfig {
  name:  string;
  description: string;
  count: number;               // 1000 bot için kaç tane
  activityFrequency: number;   // Günlük aktif olma olasılığı (0-1)
  aiEnabled: boolean;          // AI ile yorum yazabilir mi?
  behaviors: PersonaBehaviors;
}

export const PERSONA_CONFIGS: Record<PersonaType, PersonaConfig> = {
  super_active: {
    name: 'Süper Aktif',
    description: 'Her gün aktif, her şeyi yapan kullanıcı.  AI destekli yorum yazabilir.',
    count: 30,  // %3
    activityFrequency: 0.95,
    aiEnabled: true,
    behaviors:  {
      dailyLogin: 0.98,
      blogReading: 0.80,
      blogCommenting: 0.30,
      dietStart: 0.40,
      dietComplete: 0.85,
      exerciseStart: 0.50,
      exerciseComplete: 0.80,
      waterTracking: 0.90,
      mealLogging: 0.70,
      stepLogging: 0.85,
      circleJoin: 0.60,
      followUsers: 0.50,
      sendHighFive: 0.40,
      likeComments: 0.60,
      expertVisit: 0.30,
      calculatorUse: 0.25,
      replyToComments: 0.20
    }
  },
  
  active:  {
    name:  'Aktif',
    description:  'Düzenli kullanıcı, çoğu özelliği kullanıyor',
    count: 150,  // %15
    activityFrequency: 0.75,
    aiEnabled: false,
    behaviors: {
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
    }
  },
  
  normal: {
    name: 'Normal',
    description: 'Ortalama kullanıcı davranışı',
    count: 350,  // %35
    activityFrequency: 0.50,
    aiEnabled: false,
    behaviors: {
      dailyLogin: 0.60,
      blogReading:  0.30,
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
    }
  },
  
  low_activity: {
    name: 'Düşük Aktivite',
    description:  'Ara sıra gelen kullanıcı',
    count: 250,  // %25
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
    }
  },
  
  dormant: {
    name: 'Uykuda',
    description:  'Nadiren aktif kullanıcı',
    count: 120,  // %12
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
    }
  },
  
  diet_focused: {
    name: 'Diyet Odaklı',
    description: 'Diyete odaklı kullanıcı, egzersiz az',
    count: 50,  // %5
    activityFrequency: 0.65,
    aiEnabled: false,
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
    }
  },
  
  exercise_focused: {
    name: 'Egzersiz Odaklı',
    description:  'Egzersize odaklı kullanıcı, diyet az',
    count:  50,  // %5
    activityFrequency: 0.65,
    aiEnabled: false,
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
    }
  }
};

// Toplam kontrol:  30+150+350+250+120+50+50 = 1000 ✓